import { io } from 'socket.io-client';
import { SOCKET_EVENTS } from '../../../shared/events.js';

/**
 * Client Networking Controller
 * Handles Socket.IO connection, client prediction, server reconciliation, interpolation buffer, and ping monitors.
 */
export class NetworkManager {
  constructor() {
    this.socket = null;
    this.token = localStorage.getItem('racing_jwt_token') || null;
    this.user = null;

    // Reconciliation & Interpolation buffer
    this.pendingInputs = [];
    this.worldStateUpdates = [];
    this.ping = 20;

    this.eventHandlers = new Map();
  }

  connect(username = 'Guest_Racer') {
    const serverUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : window.location.origin;
    
    this.socket = io(serverUrl, {
      auth: { token: this.token, username },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    this.setupListeners();
    this.startPingMonitor();
  }

  setupListeners() {
    this.socket.on('connect', () => {
      console.log('🌐 [Network] Connected to Authoritative Racing Server.');
    });

    this.socket.on(SOCKET_EVENTS.AUTH_SUCCESS, ({ token, user }) => {
      this.token = token;
      this.user = user;
      localStorage.setItem('racing_jwt_token', token);
      this.emitEvent(SOCKET_EVENTS.AUTH_SUCCESS, user);
    });

    this.socket.on(SOCKET_EVENTS.WORLD_STATE_UPDATE, (snapshot) => {
      this.worldStateUpdates.push(snapshot);
      // Keep only last 10 snapshots for smooth lag compensation & interpolation
      if (this.worldStateUpdates.length > 10) {
        this.worldStateUpdates.shift();
      }
      this.emitEvent(SOCKET_EVENTS.WORLD_STATE_UPDATE, snapshot);
    });

    this.socket.on(SOCKET_EVENTS.PONG_REPLY, ({ clientTimestamp }) => {
      this.ping = Math.max(1, Date.now() - clientTimestamp);
    });

    // Pass through all standard socket events
    const passthroughEvents = [
      SOCKET_EVENTS.ROOM_LIST,
      SOCKET_EVENTS.ROOM_JOINED,
      SOCKET_EVENTS.ROOM_UPDATED,
      SOCKET_EVENTS.COUNTDOWN_START,
      SOCKET_EVENTS.COUNTDOWN_TICK,
      SOCKET_EVENTS.RACE_START,
      SOCKET_EVENTS.CHECKPOINT_PASSED,
      SOCKET_EVENTS.LAP_COMPLETED,
      SOCKET_EVENTS.WRONG_WAY_WARNING,
      SOCKET_EVENTS.PLAYER_FINISHED,
      SOCKET_EVENTS.RACE_ENDED,
      SOCKET_EVENTS.LEADERBOARD_DATA,
      SOCKET_EVENTS.GARAGE_UPDATED
    ];

    passthroughEvents.forEach(evt => {
      this.socket.on(evt, (data) => this.emitEvent(evt, data));
    });
  }

  startPingMonitor() {
    setInterval(() => {
      if (this.socket && this.socket.connected) {
        this.socket.emit(SOCKET_EVENTS.PING_CHECK, { clientTimestamp: Date.now() });
      }
    }, 2000);
  }

  sendInput(inputSnapshot) {
    if (!this.socket || !this.socket.connected) return;
    this.pendingInputs.push(inputSnapshot);
    // Keep max 60 pending frames
    if (this.pendingInputs.length > 60) this.pendingInputs.shift();

    this.socket.emit(SOCKET_EVENTS.PLAYER_INPUT, inputSnapshot);
  }

  /**
   * Server Reconciliation:
   * Remove acknowledged inputs up to lastProcessedSequence from server
   */
  reconcileLocalVehicle(localVehicleState) {
    if (!localVehicleState) return;
    this.pendingInputs = this.pendingInputs.filter(inp => inp.sequenceNumber > localVehicleState.lastProcessedSequence);
  }

  /**
   * Get Interpolated Remote Vehicles at target render timestamp (e.g., 100ms lag behind current time)
   */
  getInterpolatedVehicles(renderDelayMs = 100) {
    const renderTimestamp = Date.now() - renderDelayMs;

    if (this.worldStateUpdates.length < 2) {
      return this.worldStateUpdates.length === 1 ? this.worldStateUpdates[0].vehicles : [];
    }

    // Find two snapshots surrounding renderTimestamp
    for (let i = this.worldStateUpdates.length - 1; i > 0; i--) {
      const s1 = this.worldStateUpdates[i - 1];
      const s2 = this.worldStateUpdates[i];

      if (renderTimestamp >= s1.timestamp && renderTimestamp <= s2.timestamp) {
        const factor = (renderTimestamp - s1.timestamp) / Math.max(1, s2.timestamp - s1.timestamp);
        
        // Interpolate vehicle positions and rotations
        return s2.vehicles.map(v2 => {
          const v1 = s1.vehicles.find(v => v.id === v2.id) || v2;
          return {
            ...v2,
            position: {
              x: v1.position.x + (v2.position.x - v1.position.x) * factor,
              y: v1.position.y + (v2.position.y - v1.position.y) * factor,
              z: v1.position.z + (v2.position.z - v1.position.z) * factor
            },
            rotation: {
              x: 0,
              y: v1.rotation.y + (v2.rotation.y - v1.rotation.y) * factor,
              z: 0
            }
          };
        });
      }
    }

    return this.worldStateUpdates[this.worldStateUpdates.length - 1].vehicles;
  }

  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  emitEvent(event, data) {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.forEach(fn => fn(data));
  }
}

export const networkManager = new NetworkManager();
