import * as THREE from 'three';
import { Engine } from './core/Engine.js';
import { PostProcessor } from './renderer/PostProcessor.js';
import { ThirdPersonCamera } from './cameras/ThirdPersonCamera.js';
import { MapGenerator } from './loaders/MapGenerator.js';
import { CarBuilder } from './cars/CarBuilder.js';
import { ParticleSystem } from './particles/ParticleSystem.js';
import { InputHandler } from './controls/InputHandler.js';
import { NetworkManager, networkManager } from './networking/NetworkManager.js';
import { SoundManager, soundManager } from './sounds/SoundManager.js';
import { UIManager } from './ui/UIManager.js';
import { SOCKET_EVENTS } from '../../shared/events.js';
import { PHYSICS, getTrackSurfaceData, setActiveTrack } from '../../shared/constants.js';

class RacingApp {
  constructor() {
    this.engine = new Engine('canvas-container');
    this.ui = new UIManager(this);
    this.input = new InputHandler();
    this.currentTrackId = 'city';

    this.postProcessor = null;
    this.camera = null;
    this.mapGenerator = null;
    this.carBuilder = null;
    this.particleSystem = null;

    this.playerCar = null;
    this.remoteCars = new Map();

    this.localVehicleState = null;
    this.currentRaceState = null;
    this.fpsCounter = 60;
    this.canPlayerMove = false;

    this.init();
  }

  async init() {
    this.ui.updateLoadingProgress(15, 'Booting NitroRush 3D Graphics Engine...');
    await new Promise(r => setTimeout(r, 350));

    this.postProcessor = new PostProcessor(this.engine);
    this.camera = new ThirdPersonCamera(this.engine);

    this.ui.updateLoadingProgress(45, 'Compiling Cyberpunk City Streets & Shaders...');
    await new Promise(r => setTimeout(r, 400));
    this.mapGenerator = new MapGenerator(this.engine.scene);
    this.mapGenerator.generate();

    this.ui.updateLoadingProgress(75, 'Assembling High-Performance GT Vehicles...');
    await new Promise(r => setTimeout(r, 350));
    this.carBuilder = new CarBuilder(this.engine.scene);
    this.particleSystem = new ParticleSystem(this.engine.scene);

    // Initial menu show car in background
    this.rebuildLocalCar('sports', { bodyColor: '#ff2a2a', rimColor: '#dcdcdc', neonColor: '#00ffff' });
    this.camera.setTarget(this.playerCar.root);

    this.ui.updateLoadingProgress(90, 'Connecting to Authoritative Multiplayer Server...');
    await new Promise(r => setTimeout(r, 350));
    const savedToken = localStorage.getItem('racing_jwt_token');
    const savedName = localStorage.getItem('racing_user_name') || 'Racer';
    if (savedToken) {
      networkManager.connect(savedName);
    }
    this.setupNetworkCallbacks();

    this.ui.updateLoadingProgress(100, '⚡ READY TO DOMINATE!');
    setTimeout(() => {
      if (savedToken) {
        this.ui.showScreen('menu');
      } else {
        this.ui.showScreen('auth');
      }
      soundManager.init();
    }, 700);

    // Subscribe app loop to engine
    this.engine.addUpdateCallback((dt) => this.update(dt));
    this.engine.start();
  }

  rebuildLocalCar(category = 'sports', customData = {}) {
    if (this.playerCar) {
      this.engine.scene.remove(this.playerCar.root);
    }
    this.playerCar = this.carBuilder.createCar(category, customData);
    if (this.ui?.currentScreen === 'garage') {
      this.playerCar.root.position.set(-800, 20.45, -800);
    } else if (!this.localVehicleState) {
      this.playerCar.root.position.set(-4, 0.5, 15);
    }
    if (this.camera) this.camera.setTarget(this.playerCar.root);
  }

  enterGarageShowroom() {
    if (this.playerCar) {
      this.playerCar.root.position.set(-800, 20.45, -800);
      this.playerCar.root.rotation.y = 0;
    }
    if (this.camera && this.playerCar) {
      this.camera.setTarget(this.playerCar.root);
      this.camera.resetGarageOrbit?.();
    }
  }

  exitGarageShowroom() {
    if (this.playerCar && !this.localVehicleState) {
      this.playerCar.root.position.set(-4, 0.5, 15);
    }
  }

  switchTrack(trackId = 'city') {
    if (this.currentTrackId === trackId) return;
    console.log(`🗺️ Switching track to: ${trackId}`);
    this.currentTrackId = trackId;
    setActiveTrack(trackId);
    if (this.mapGenerator) {
      this.mapGenerator.generate(trackId);
    }
    if (this.postProcessor) {
      this.postProcessor.setAtmosphereTheme(trackId);
    }
  }

  resetCarToMenu() {
    this.localVehicleState = null;
    this.currentRaceState = null;
    this.canPlayerMove = false;
    soundManager.muteEngine();

    if (this.currentTrackId !== 'city') {
      this.switchTrack('city');
    }

    // Clean up all remote vehicles from the scene immediately
    for (const [id, rCar] of this.remoteCars) {
      this.engine.scene.remove(rCar.root);
    }
    this.remoteCars.clear();

    // Reset local car to exact race starting grid line pole position (#1)
    if (this.playerCar) {
      this.playerCar.root.position.set(-3.6, 0.5, 15);
      this.playerCar.root.rotation.set(0, 0, 0);
    }

    // Instantly snap camera behind car looking straight down the race track starting line
    if (this.camera && this.playerCar) {
      this.camera.mode = 'race';
      this.camera.setTarget(this.playerCar.root);
      this.camera.currentPosition.set(-3.6, 3.8, 7.5);
      this.camera.currentLookAt.set(-3.6, 1.2, 15);
      this.camera.camera.position.copy(this.camera.currentPosition);
      this.camera.camera.lookAt(this.camera.currentLookAt);
    }
  }

  setupNetworkCallbacks() {
    networkManager.on(SOCKET_EVENTS.AUTH_ERROR, ({ message }) => {
      alert(message || 'Error occurred!');
    });

    networkManager.on(SOCKET_EVENTS.AUTH_SUCCESS, (user) => {
      this.ui.updateProfile(user);
      if (user && user.garage) {
        this.rebuildLocalCar(user.garage.carType, user.garage);
      }
    });

    networkManager.on(SOCKET_EVENTS.ROOM_LIST, (rooms) => {
      this.ui.renderRoomList(rooms);
    });

    networkManager.on(SOCKET_EVENTS.ROOM_JOINED, ({ room }) => {
      if (room && room.trackId) {
        this.switchTrack(room.trackId);
      }
    });

    networkManager.on(SOCKET_EVENTS.ROOM_UPDATED, (roomInfo) => {
      if (roomInfo && roomInfo.trackId && roomInfo.trackId !== this.currentTrackId) {
        this.switchTrack(roomInfo.trackId);
      }
      this.ui.renderRoomPlayers(roomInfo, networkManager.socket.id);
    });

    networkManager.on(SOCKET_EVENTS.COUNTDOWN_START, ({ seconds }) => {
      this.canPlayerMove = false;
      this.ui.showScreen('hud');
      soundManager.playCountdownBeep(false);
      const cdEl = document.getElementById('hud-countdown');
      if (cdEl) {
        cdEl.classList.remove('hidden');
        cdEl.textContent = seconds;
      }
    });

    networkManager.on(SOCKET_EVENTS.COUNTDOWN_TICK, ({ seconds }) => {
      soundManager.playCountdownBeep(false);
      const cdEl = document.getElementById('hud-countdown');
      if (cdEl) cdEl.textContent = seconds;
    });

    networkManager.on(SOCKET_EVENTS.RACE_START, () => {
      this.canPlayerMove = true;
      soundManager.playCountdownBeep(true);
      const cdEl = document.getElementById('hud-countdown');
      if (cdEl) {
        cdEl.textContent = 'GO!';
        setTimeout(() => cdEl.classList.add('hidden'), 800);
      }
    });

    networkManager.on(SOCKET_EVENTS.CHECKPOINT_PASSED, ({ playerId, checkpoint }) => {
      if (playerId === networkManager.socket?.id) {
        soundManager.playLapComplete();
      }
    });

    networkManager.on(SOCKET_EVENTS.WRONG_WAY_WARNING, ({ active }) => {
      const warnEl = document.getElementById('hud-wrong-way');
      if (warnEl) {
        if (active) warnEl.classList.remove('hidden');
        else warnEl.classList.add('hidden');
      }
    });

    networkManager.on(SOCKET_EVENTS.WORLD_STATE_UPDATE, (snapshot) => {
      this.syncWorldState(snapshot);
    });

    networkManager.on(SOCKET_EVENTS.RACE_ENDED, ({ results }) => {
      this.canPlayerMove = false;
      soundManager.muteEngine();
      this.ui.renderResults(results);
    });

    networkManager.on(SOCKET_EVENTS.PLAYER_FINISHED, ({ playerId }) => {
      if (playerId === networkManager.socket?.id) {
        this.canPlayerMove = false;
        soundManager.playLapComplete();
      }
    });
  }

  syncWorldState(snapshot) {
    if (!snapshot || !snapshot.vehicles) return;

    // Find local player vehicle state
    const myId = networkManager.socket?.id;
    const myServerState = snapshot.vehicles.find(v => v.id === myId);

    if (myServerState && this.playerCar) {
      this.localVehicleState = myServerState;

      // Update race state summary
      if (snapshot.raceSummary) {
        this.currentRaceState = snapshot.raceSummary.find(r => r.id === myId);
      }

      // If not actively racing on HUD screen, do not snap position to track and remove remote vehicles
      if (this.ui?.currentScreen !== 'hud') {
        soundManager.muteEngine();
        if (this.ui?.currentScreen !== 'garage' && this.playerCar) {
          this.playerCar.root.position.set(-3.6, 0.5, 15);
          this.playerCar.root.rotation.set(0, 0, 0);
        }
        for (const [id, rCar] of this.remoteCars) {
          this.engine.scene.remove(rCar.root);
        }
        this.remoteCars.clear();
        return;
      }

      // Server reconciliation: reconcile pending unacknowledged inputs
      networkManager.reconcileLocalVehicle(myServerState);

      // Snap or interpolate towards authoritative position
      const targetPos = new THREE.Vector3(myServerState.position.x, myServerState.position.y, myServerState.position.z);
      this.playerCar.root.position.lerp(targetPos, 0.45);
      this.playerCar.root.rotation.y = myServerState.rotation.y;

      soundManager.updateVehicleAudio(myServerState.rpm, myServerState.isDrifting, myServerState.speed);
      const isBraking = myServerState.speed > 5 && this.input.keys.get('KeyS');
      this.playerCar.brakeLights.forEach(l => l.material.emissiveIntensity = isBraking ? 1.5 : 0.2);
    }

    // If we are not on HUD, clear remote cars
    if (this.ui?.currentScreen !== 'hud') {
      for (const [id, rCar] of this.remoteCars) {
        this.engine.scene.remove(rCar.root);
      }
      this.remoteCars.clear();
      return;
    }

    // Update Remote Vehicles
    const activeRemoteIds = new Set();
    snapshot.vehicles.forEach(v => {
      if (v.id === myId) return;
      activeRemoteIds.add(v.id);

      let remoteCar = this.remoteCars.get(v.id);
      if (!remoteCar) {
        remoteCar = this.carBuilder.createCar(v.carCategory || 'sports', v.customization || {});
        this.remoteCars.set(v.id, remoteCar);
      }
      remoteCar.root.position.set(v.position.x, v.position.y, v.position.z);
      remoteCar.root.rotation.y = v.rotation.y;
    });

    // Remove disconnected vehicles
    for (const [id, rCar] of this.remoteCars) {
      if (!activeRemoteIds.has(id)) {
        this.engine.scene.remove(rCar.root);
        this.remoteCars.delete(id);
      }
    }
  }

  update(dt) {
    this.fpsCounter = 1 / Math.max(0.001, dt);

    // Lock car at race starting grid line when in menu or results screens
    if (this.ui.currentScreen !== 'hud' && this.ui.currentScreen !== 'garage') {
      if (this.playerCar) {
        this.playerCar.root.position.set(-3.6, 0.5, 15);
        this.playerCar.root.rotation.set(0, 0, 0);
      }
    }

    // 1. Capture user input and transmit to authoritative server
    if (this.ui.currentScreen === 'hud' && networkManager.socket?.connected) {
      let inputSnapshot = this.input.getSnapshot();
      if (!this.canPlayerMove) {
        inputSnapshot = { throttle: 0, steer: 0, brake: true, handbrake: true, nitro: false, respawn: false };
      }
      networkManager.sendInput(inputSnapshot);

      // Client-side prediction kinematic step only when race is active
      if (this.playerCar && this.localVehicleState) {
        const fwd = new THREE.Vector3(Math.sin(this.playerCar.root.rotation.y), 0, Math.cos(this.playerCar.root.rotation.y));
        const speedMs = this.canPlayerMove ? (this.localVehicleState.speed / 3.6) : 0;
        this.playerCar.root.position.addScaledVector(fwd, speedMs * dt);

        const surface = getTrackSurfaceData(this.playerCar.root.position.x, this.playerCar.root.position.z);
        this.playerCar.root.position.y = surface.roadY + 0.48;

        if (Math.abs(surface.lateralDist) > 9.6) {
          const sign = Math.sign(surface.lateralDist);
          this.playerCar.root.position.x = surface.centerX + sign * surface.rightX * 9.6;
          this.playerCar.root.position.z = surface.centerZ + sign * surface.rightZ * 9.6;
        }

        if (Math.abs(inputSnapshot.steer) > 0.05 && Math.abs(speedMs) > 1) {
          this.playerCar.root.rotation.y += inputSnapshot.steer * PHYSICS.MAX_STEER_ANGLE * 2.5 * dt;
        }

        // Emit tire smoke particles if drifting
        if (this.localVehicleState.isDrifting || inputSnapshot.handbrake) {
          this.particleSystem.emitTireSmoke(this.playerCar.root.position, fwd.clone().multiplyScalar(speedMs));
        }

        // Animate wheels spin and steering angle
        this.playerCar.wheels.forEach(w => {
          w.group.children[0].rotation.x += speedMs * dt * 3; // Spin tire
          if (w.isFront) {
            w.group.rotation.y = inputSnapshot.steer * 0.45; // Turn steering wheels
          }
        });
      }
    }

    // 2. Update particle systems
    if (this.particleSystem) this.particleSystem.update(dt);

    // 3. Update dynamic third person camera
    if (this.camera) {
      this.camera.isLookingBehind = this.input.lookBehindPressed;
      this.camera.update(dt, this.localVehicleState);
    }

    // 4. Update HUD
    if (this.ui.currentScreen === 'hud') {
      this.ui.updateHUD(this.localVehicleState, this.currentRaceState, this.fpsCounter, networkManager.ping);
      // Update race timer
      if (document.getElementById('hud-time-val') && this.currentRaceState) {
        const now = Date.now();
        // display current lap time if available
      }
    }

    // 5. Render post processed scene
    if (this.postProcessor && this.camera) {
      this.postProcessor.render(this.camera.camera);
    }
  }
}

// Launch Application
window.addEventListener('DOMContentLoaded', () => {
  new RacingApp();
});
