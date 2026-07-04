import { GAME_STATES, RACE_CONFIG, TRACK_CHECKPOINTS, STARTING_GRID_POSITIONS } from '../../shared/constants.js';
import { SOCKET_EVENTS } from '../../shared/events.js';
import { dbManager } from '../database/db.js';

/**
 * Authoritative Race State Manager
 */
export class RaceManager {
  constructor(room) {
    this.room = room;
    this.state = GAME_STATES.LOBBY;
    this.countdownTimer = null;
    this.countdownSeconds = RACE_CONFIG.COUNTDOWN_SECONDS;
    this.startTime = 0;

    // Player race tracking state: { lap, currentCheckpoint, lapStartTimes, bestLap, finished, finishTime }
    this.playerStates = new Map();
  }

  initRace(players) {
    this.state = GAME_STATES.COUNTDOWN;
    this.countdownSeconds = RACE_CONFIG.COUNTDOWN_SECONDS;
    this.playerStates.clear();

    let gridIndex = 0;
    for (const [id, player] of players) {
      const gridPos = STARTING_GRID_POSITIONS[gridIndex % STARTING_GRID_POSITIONS.length];
      gridIndex++;

      this.playerStates.set(id, {
        id,
        username: player.username,
        isAI: Boolean(player.isAI),
        lap: 1,
        currentCheckpoint: 0,
        lapStartTime: 0,
        bestLap: null,
        finished: false,
        finishTime: null,
        position: gridIndex,
        wrongWayTimer: 0,
        isWrongWayWarned: false
      });

      // Position vehicle on starting grid
      const vehicle = this.room.physicsWorld.getVehicle(id);
      if (vehicle) {
        vehicle.position = { x: gridPos.x, y: gridPos.y, z: gridPos.z };
        vehicle.rotation.y = Math.PI; // Face forward down negative Z road
        vehicle.speed = 0;
      }
    }
  }

  startCountdown() {
    this.room.broadcast(SOCKET_EVENTS.COUNTDOWN_START, { seconds: this.countdownSeconds });

    const interval = setInterval(() => {
      this.countdownSeconds--;
      if (this.countdownSeconds > 0) {
        this.room.broadcast(SOCKET_EVENTS.COUNTDOWN_TICK, { seconds: this.countdownSeconds });
      } else {
        clearInterval(interval);
        this.startRace();
      }
    }, 1000);
  }

  startRace() {
    this.state = GAME_STATES.RACING;
    this.startTime = Date.now();

    for (const pState of this.playerStates.values()) {
      pState.lapStartTime = this.startTime;
    }

    this.room.broadcast(SOCKET_EVENTS.RACE_START, { startTime: this.startTime });
  }

  update(dt) {
    if (this.state !== GAME_STATES.RACING) return;

    const allVehicles = Array.from(this.room.physicsWorld.vehicles.values());
    
    // Check checkpoints & finish line for each vehicle
    for (const [id, pState] of this.playerStates) {
      if (pState.finished) continue;

      const vehicle = this.room.physicsWorld.getVehicle(id);
      if (!vehicle) continue;

      const nextCPIndex = (pState.currentCheckpoint + 1) % TRACK_CHECKPOINTS.length;
      const targetCP = TRACK_CHECKPOINTS[nextCPIndex];

      const dx = targetCP.pos.x - vehicle.position.x;
      const dz = targetCP.pos.z - vehicle.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      // Checkpoint hit test
      if (dist < targetCP.width) {
        pState.currentCheckpoint = nextCPIndex;
        this.room.broadcast(SOCKET_EVENTS.CHECKPOINT_PASSED, {
          playerId: id,
          checkpoint: nextCPIndex
        });

        // If crossed finish/start line checkpoint 0
        if (nextCPIndex === 0) {
          const now = Date.now();
          const lapTime = (now - pState.lapStartTime) / 1000;
          pState.lapStartTime = now;

          if (!pState.bestLap || lapTime < pState.bestLap) {
            pState.bestLap = Number(lapTime.toFixed(2));
          }

          const maxLaps = this.room.totalLaps || RACE_CONFIG.DEFAULT_LAPS;
          if (pState.lap < maxLaps) {
            pState.lap++;
            this.room.broadcast(SOCKET_EVENTS.LAP_COMPLETED, {
              playerId: id,
              lap: pState.lap,
              lapTime: Number(lapTime.toFixed(2)),
              bestLap: pState.bestLap
            });
          } else {
            // Race finished for this player!
            pState.finished = true;
            pState.finishTime = Number(((now - this.startTime) / 1000).toFixed(2));
            
            // Calculate final rank
            const finishedCount = Array.from(this.playerStates.values()).filter(p => p.finished).length;
            pState.position = finishedCount;

            // Record database stats for human players
            if (!pState.isAI) {
              dbManager.recordRaceResult(pState.username, pState.bestLap, finishedCount === 1);
            }

            this.room.broadcast(SOCKET_EVENTS.PLAYER_FINISHED, {
              playerId: id,
              username: pState.username,
              position: pState.position,
              totalTime: pState.finishTime,
              bestLap: pState.bestLap
            });

            // Check if all human players have finished
            const humanPlayers = Array.from(this.playerStates.values()).filter(p => !p.isAI);
            const humanFinished = humanPlayers.length > 0 && humanPlayers.every(p => p.finished);
            if (humanFinished) {
              setTimeout(() => this.endRace(), 2500);
            }
          }
        }
      }

      // Wrong Way Detection (with 3-second continuous threshold delay)
      const forwardX = Math.sin(vehicle.rotation.y);
      const forwardZ = Math.cos(vehicle.rotation.y);
      const roadDir = TRACK_CHECKPOINTS[pState.currentCheckpoint].dir;
      const dot = forwardX * roadDir.x + forwardZ * roadDir.z;

      if (dot < -0.45 && vehicle.speed > 8) {
        pState.wrongWayTimer = (pState.wrongWayTimer || 0) + dt;
        if (pState.wrongWayTimer >= 3.0 && !pState.isWrongWayWarned) {
          pState.isWrongWayWarned = true;
          const socket = this.room.players.get(id)?.socket;
          if (socket) socket.emit(SOCKET_EVENTS.WRONG_WAY_WARNING, { warning: true });
        }
      } else {
        pState.wrongWayTimer = 0;
        if (pState.isWrongWayWarned) {
          pState.isWrongWayWarned = false;
          const socket = this.room.players.get(id)?.socket;
          if (socket) socket.emit(SOCKET_EVENTS.WRONG_WAY_WARNING, { warning: false });
        }
      }
    }

    // Update real-time leaderboard positions based on laps, checkpoints, and distance to next checkpoint
    this.updateLivePositions();
  }

  updateLivePositions() {
    const list = Array.from(this.playerStates.values()).map(p => {
      const vehicle = this.room.physicsWorld.getVehicle(p.id);
      let score = p.lap * 10000 + p.currentCheckpoint * 1000;
      if (vehicle) {
        const nextCP = TRACK_CHECKPOINTS[(p.currentCheckpoint + 1) % TRACK_CHECKPOINTS.length];
        const dx = nextCP.pos.x - vehicle.position.x;
        const dz = nextCP.pos.z - vehicle.position.z;
        score -= Math.sqrt(dx * dx + dz * dz); // closer to next checkpoint = higher score
      }
      return { id: p.id, score, state: p };
    });

    list.sort((a, b) => b.score - a.score);
    list.forEach((item, index) => {
      if (!item.state.finished) item.state.position = index + 1;
    });
  }

  endRace() {
    this.state = GAME_STATES.FINISHED;
    const results = Array.from(this.playerStates.values()).sort((a, b) => (a.position || 99) - (b.position || 99));
    this.room.broadcast(SOCKET_EVENTS.RACE_ENDED, { results });
  }

  getRaceSummary() {
    return Array.from(this.playerStates.values()).map(p => ({
      id: p.id,
      username: p.username,
      lap: p.lap,
      totalLaps: this.room.totalLaps || RACE_CONFIG.DEFAULT_LAPS,
      position: p.position,
      finished: p.finished,
      bestLap: p.bestLap
    }));
  }
}
