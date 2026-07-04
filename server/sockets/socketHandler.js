import { SOCKET_EVENTS } from '../../shared/events.js';
import { roomManager } from '../rooms/RoomManager.js';
import { dbManager } from '../database/db.js';
import { validator } from '../utilities/validator.js';

/**
 * Configure Socket.IO event listeners for a client session
 */
export function setupSocketHandlers(io, socket) {
  console.log(`🔌 [Socket] Client connected: ${socket.id} (${socket.user?.username})`);

  // Send authentication success message with user profile
  socket.emit(SOCKET_EVENTS.AUTH_SUCCESS, {
    token: socket.token,
    user: socket.user
  });

  // Automatically send room list and leaderboard
  socket.emit(SOCKET_EVENTS.ROOM_LIST, roomManager.getPublicRoomList());
  dbManager.getLeaderboard().then(data => socket.emit(SOCKET_EVENTS.LEADERBOARD_DATA, data));

  // --- Lobby & Room Events ---
  socket.on(SOCKET_EVENTS.GET_ROOMS, () => {
    socket.emit(SOCKET_EVENTS.ROOM_LIST, roomManager.getPublicRoomList());
  });

  socket.on(SOCKET_EVENTS.CREATE_ROOM, ({ name, isPrivate, addBots, totalLaps, trackId }) => {
    const room = roomManager.createRoom(name, socket.id, Boolean(isPrivate), totalLaps, trackId);
    const result = roomManager.joinRoom(room.id, socket, socket.user);
    if (result.success) {
      if (addBots && addBots > 0) {
        room.addAIBots(addBots);
      }
      socket.emit(SOCKET_EVENTS.ROOM_JOINED, { room: { id: room.id, code: room.code, name: room.name, hostId: room.hostId, totalLaps: room.totalLaps, trackId: room.trackId } });
    }
  });

  socket.on(SOCKET_EVENTS.JOIN_ROOM, ({ roomId }) => {
    const result = roomManager.joinRoom(roomId, socket, socket.user);
    if (result.success) {
      socket.emit(SOCKET_EVENTS.ROOM_JOINED, { room: { id: result.room.id, code: result.room.code, name: result.room.name, hostId: result.room.hostId, totalLaps: result.room.totalLaps, trackId: result.room.trackId } });
    } else {
      socket.emit(SOCKET_EVENTS.AUTH_ERROR, { message: result.message });
    }
  });

  socket.on(SOCKET_EVENTS.LEAVE_ROOM, () => {
    roomManager.leaveCurrentRoom(socket.id);
    socket.emit(SOCKET_EVENTS.ROOM_LIST, roomManager.getPublicRoomList());
  });

  socket.on(SOCKET_EVENTS.PLAYER_READY, ({ isReady }) => {
    const roomId = roomManager.playerToRoom.get(socket.id);
    if (roomId) {
      const room = roomManager.getRoom(roomId);
      if (room) room.setPlayerReady(socket.id, Boolean(isReady));
    }
  });

  socket.on(SOCKET_EVENTS.HOST_START_RACE, () => {
    const roomId = roomManager.playerToRoom.get(socket.id);
    if (roomId) {
      const room = roomManager.getRoom(roomId);
      if (room) {
        if (room.hostId === 'SERVER_BOT' || !room.players.has(room.hostId)) {
          room.hostId = socket.id;
        }
        if (room.hostId === socket.id) {
          const check = room.checkReadyToStart();
          if (check.success) {
            room.startSimulation();
          } else {
            socket.emit(SOCKET_EVENTS.AUTH_ERROR, { message: check.message });
          }
        }
      }
    }
  });

  socket.on(SOCKET_EVENTS.KICK_PLAYER, ({ playerId }) => {
    roomManager.kickPlayer(socket.id, playerId);
  });

  socket.on(SOCKET_EVENTS.ADD_AI_BOTS, () => {
    const roomId = roomManager.playerToRoom.get(socket.id);
    if (roomId) {
      const room = roomManager.getRoom(roomId);
      if (room) {
        if (room.hostId === 'SERVER_BOT' || !room.players.has(room.hostId)) {
          room.hostId = socket.id;
        }
        if (room.hostId === socket.id || room.hostId === 'SERVER_BOT') {
          const added = room.addSingleAIBot();
          if (!added) {
            socket.emit(SOCKET_EVENTS.AUTH_ERROR, { message: '⚠️ Cannot add more bots! Room is full (Max 8 players).' });
          }
        }
      }
    }
  });

  socket.on(SOCKET_EVENTS.REMOVE_AI_BOTS, () => {
    const roomId = roomManager.playerToRoom.get(socket.id);
    if (roomId) {
      const room = roomManager.getRoom(roomId);
      if (room) {
        if (room.hostId === 'SERVER_BOT' || !room.players.has(room.hostId)) {
          room.hostId = socket.id;
        }
        if (room.hostId === socket.id || room.hostId === 'SERVER_BOT') {
          const removed = room.removeSingleAIBot();
          if (!removed) {
            socket.emit(SOCKET_EVENTS.AUTH_ERROR, { message: '⚠️ No AI bots to remove!' });
          }
        }
      }
    }
  });

  socket.on(SOCKET_EVENTS.CHANGE_CAR_CATEGORY, ({ carCategory }) => {
    const roomId = roomManager.playerToRoom.get(socket.id);
    if (roomId) {
      const room = roomManager.getRoom(roomId);
      if (room) {
        room.changePlayerCar(socket.id, carCategory);
      }
    }
  });

  // --- Real-time Game Loop & Input Validation ---
  socket.on(SOCKET_EVENTS.PLAYER_INPUT, (rawInput) => {
    const validData = validator.validateInput(socket.id, rawInput);
    if (!validData) return;

    const roomId = roomManager.playerToRoom.get(socket.id);
    if (roomId) {
      const room = roomManager.getRoom(roomId);
      if (room && room.physicsWorld) {
        const vehicle = room.physicsWorld.getVehicle(socket.id);
        if (vehicle) {
          vehicle.applyInput(validData);
        }
      }
    }
  });

  // --- Ping Check ---
  socket.on(SOCKET_EVENTS.PING_CHECK, ({ clientTimestamp }) => {
    socket.emit(SOCKET_EVENTS.PONG_REPLY, { clientTimestamp, serverTimestamp: Date.now() });
  });

  // --- Garage & Profile Events ---
  socket.on(SOCKET_EVENTS.SAVE_GARAGE, async (garageData) => {
    if (socket.user && socket.user.username) {
      await dbManager.saveGarage(socket.user.username, garageData);
      socket.user.garage = { ...socket.user.garage, ...garageData };
      socket.emit(SOCKET_EVENTS.GARAGE_UPDATED, socket.user.garage);
    }
  });

  socket.on(SOCKET_EVENTS.GET_LEADERBOARD, async () => {
    const data = await dbManager.getLeaderboard();
    socket.emit(SOCKET_EVENTS.LEADERBOARD_DATA, data);
  });

  // Disconnect handler
  socket.on('disconnect', () => {
    console.log(`❌ [Socket] Client disconnected: ${socket.id}`);
    roomManager.leaveCurrentRoom(socket.id);
    validator.removePlayer(socket.id);
  });
}
