import { PhysicsWorld } from '../physics/World.js';
import { RaceManager } from '../race/RaceManager.js';
import { AIBot } from '../race/AIBot.js';
import { GAME_STATES, RACE_CONFIG, PHYSICS, setActiveTrack } from '../../shared/constants.js';
import { SOCKET_EVENTS } from '../../shared/events.js';

/**
 * Authoritative Game Room
 */
export class Room {
  constructor(roomId, name, hostId, isPrivate = false, totalLaps = 3, maxPlayers = RACE_CONFIG.MAX_PLAYERS, trackId = 'city') {
    this.id = roomId;
    this.name = name;
    this.hostId = hostId;
    this.isPrivate = isPrivate;
    this.totalLaps = Math.min(5, Math.max(1, Number(totalLaps) || 3));
    this.maxPlayers = maxPlayers;
    this.trackId = trackId || 'city';
    this.code = Math.random().toString(36).substring(2, 7).toUpperCase();

    this.players = new Map(); // id -> { socket, username, isReady, carCategory, isAI }
    this.aiBots = new Map();  // id -> AIBot instance

    this.physicsWorld = new PhysicsWorld();
    this.raceManager = new RaceManager(this);

    this.loopInterval = null;
    this.broadcastCounter = 0;
    this.botCounter = 0;
  }

  addPlayer(socket, user, carCategory = 'sports') {
    if (this.players.size >= this.maxPlayers) return false;

    // If host is SERVER_BOT or host is not in room, assign this joining player as host
    if (this.hostId === 'SERVER_BOT' || !this.players.has(this.hostId)) {
      this.hostId = socket.id;
    }

    this.players.set(socket.id, {
      socket,
      id: socket.id,
      username: user.username,
      avatar: user.avatar || '/avatars/avatar1.png',
      isReady: true, // All players are ready by default when joining
      carCategory: user.garage?.carType || carCategory,
      isAI: false
    });

    this.physicsWorld.addVehicle(socket.id, user.garage?.carType || carCategory);
    this.broadcastRoomState();
    return true;
  }

  removePlayer(socketId) {
    this.players.delete(socketId);
    this.physicsWorld.removeVehicle(socketId);

    // If host left or host is SERVER_BOT, reassign host or close room
    if ((socketId === this.hostId || this.hostId === 'SERVER_BOT') && this.players.size > 0) {
      const nextHost = Array.from(this.players.keys())[0];
      this.hostId = nextHost;
      const nextPlayer = this.players.get(nextHost);
      if (nextPlayer) nextPlayer.isReady = true;
    }

    if (this.players.size === 0) {
      this.stopSimulation();
    } else {
      this.broadcastRoomState();
    }
  }

  setPlayerReady(socketId, isReady) {
    const player = this.players.get(socketId);
    if (player) {
      player.isReady = isReady;
      this.broadcastRoomState();
    }
  }

  fillWithAIBots(difficulty = 'medium', targetBots = 7) {
    const aiCategories = ['sports', 'super', 'muscle'];
    const avatars = ['/avatars/avatar2.png', '/avatars/avatar3.png', '/avatars/avatar4.png', '/avatars/avatar5.png', '/avatars/avatar6.png'];
    const maxBotsAllowed = Math.min(targetBots, this.maxPlayers - this.players.size);
    while (this.aiBots.size < maxBotsAllowed) {
      this.botCounter++;
      const aiIndex = this.botCounter;
      const botId = `AI_Bot_${aiIndex}_${Math.random().toString(36).substring(2, 5)}`;
      const carCat = aiCategories[aiIndex % aiCategories.length];
      const botName = `RoboRacer_${aiIndex} (${difficulty[0].toUpperCase()})`;
      const botAvatar = avatars[aiIndex % avatars.length];

      const bot = new AIBot(botId, botName, difficulty, carCat);
      this.aiBots.set(botId, bot);

      this.players.set(botId, {
        socket: null,
        id: botId,
        username: botName,
        avatar: botAvatar,
        isReady: true,
        carCategory: carCat,
        isAI: true
      });

      this.physicsWorld.addVehicle(botId, carCat);
    }
    this.broadcastRoomState();
  }

  addAIBots(count = 7, difficulty = 'medium') {
    this.fillWithAIBots(difficulty, count);
  }

  addSingleAIBot(difficulty = 'medium') {
    if (this.players.size >= this.maxPlayers) return false;
    const aiCategories = ['sports', 'super', 'muscle'];
    const avatars = ['/avatars/avatar2.png', '/avatars/avatar3.png', '/avatars/avatar4.png', '/avatars/avatar5.png', '/avatars/avatar6.png'];
    this.botCounter++;
    const aiIndex = this.botCounter;
    const botId = `AI_Bot_${aiIndex}_${Math.random().toString(36).substring(2, 5)}`;
    const carCat = aiCategories[aiIndex % aiCategories.length];
    const botName = `RoboRacer_${aiIndex} (${difficulty[0].toUpperCase()})`;
    const botAvatar = avatars[aiIndex % avatars.length];

    const bot = new AIBot(botId, botName, difficulty, carCat);
    this.aiBots.set(botId, bot);

    this.players.set(botId, {
      socket: null,
      id: botId,
      username: botName,
      avatar: botAvatar,
      isReady: true,
      carCategory: carCat,
      isAI: true
    });

    this.physicsWorld.addVehicle(botId, carCat);
    this.broadcastRoomState();
    return true;
  }

  removeSingleAIBot() {
    if (this.aiBots.size === 0) return false;
    const lastBotId = Array.from(this.aiBots.keys()).pop();
    this.aiBots.delete(lastBotId);
    this.players.delete(lastBotId);
    this.physicsWorld.removeVehicle(lastBotId);
    this.broadcastRoomState();
    return true;
  }

  changePlayerCar(socketId, carCategory = 'sports') {
    const player = this.players.get(socketId);
    if (!player || player.isAI) return false;
    player.carCategory = carCategory;
    this.physicsWorld.removeVehicle(socketId);
    this.physicsWorld.addVehicle(socketId, carCategory);
    this.broadcastRoomState();
    return true;
  }

  checkReadyToStart() {
    // Automatically ready up all players when host starts the race so it launches smoothly without blocking
    for (const player of this.players.values()) {
      player.isReady = true;
    }
    this.broadcastRoomState();
    return { success: true };
  }

  startSimulation() {
    if (this.loopInterval) clearInterval(this.loopInterval);

    setActiveTrack(this.trackId);

    this.raceManager.initRace(this.players);
    this.raceManager.startCountdown();

    const dt = PHYSICS.TIMESTEP;
    this.loopInterval = setInterval(() => {
      const canMove = (this.raceManager.state === GAME_STATES.RACING);

      // Gather finished vehicle IDs
      const finishedIds = new Set();
      for (const [pId, pState] of this.raceManager.playerStates) {
        if (pState.finished) finishedIds.add(pId);
      }

      // 1. Calculate inputs for AI bots only when racing and not finished
      if (canMove) {
        for (const [botId, bot] of this.aiBots) {
          if (finishedIds.has(botId)) continue;
          const vehicle = this.physicsWorld.getVehicle(botId);
          const allVehicles = Array.from(this.physicsWorld.vehicles.values());
          const aiInput = bot.computeInput(vehicle, allVehicles, dt);
          vehicle.applyInput(aiInput);
        }
      }

      // 2. Step physics simulation
      this.physicsWorld.step(dt, canMove, finishedIds);

      // 3. Update race manager rules
      this.raceManager.update(dt);

      // 4. Broadcast state update at 20Hz (every 3 ticks)
      this.broadcastCounter++;
      if (this.broadcastCounter % 3 === 0) {
        this.broadcastWorldState();
      }
    }, dt * 1000);
  }

  stopSimulation() {
    if (this.loopInterval) {
      clearInterval(this.loopInterval);
      this.loopInterval = null;
    }
  }

  broadcastWorldState() {
    const snapshot = {
      timestamp: Date.now(),
      state: this.raceManager.state,
      vehicles: Array.from(this.physicsWorld.vehicles.values()).map(v => v.getState()),
      raceSummary: this.raceManager.getRaceSummary()
    };

    this.broadcast(SOCKET_EVENTS.WORLD_STATE_UPDATE, snapshot);
  }

  broadcastRoomState() {
    const roomInfo = {
      id: this.id,
      code: this.code,
      name: this.name,
      hostId: this.hostId,
      isPrivate: this.isPrivate,
      trackId: this.trackId,
      totalLaps: this.totalLaps,
      players: Array.from(this.players.values()).map(p => ({
        id: p.id,
        username: p.username,
        avatar: p.avatar || (p.isAI ? '/avatars/avatar2.png' : '/avatars/avatar1.png'),
        isReady: p.isReady,
        carCategory: p.carCategory,
        isAI: p.isAI
      }))
    };

    this.broadcast(SOCKET_EVENTS.ROOM_UPDATED, roomInfo);
  }

  broadcast(event, data) {
    for (const player of this.players.values()) {
      if (player.socket) {
        player.socket.emit(event, data);
      }
    }
  }
}
