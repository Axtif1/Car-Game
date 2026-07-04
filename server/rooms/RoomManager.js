import { Room } from './Room.js';

export class RoomManager {
  constructor() {
    this.rooms = new Map();
    this.playerToRoom = new Map();

    // Create a default public room on boot so players can jump right in
    this.createRoom('Public City Circuit #1', 'SERVER_BOT', false, 3, 'city', 'public_1');
  }

  createRoom(name, hostId, isPrivate = false, totalLaps = 3, trackId = 'city', customRoomId = null) {
    const roomId = customRoomId || `room_${Math.random().toString(36).substring(2, 8)}`;
    const room = new Room(roomId, name || `Race Lobby ${Math.floor(Math.random() * 900 + 100)}`, hostId, isPrivate, totalLaps, undefined, trackId);
    this.rooms.set(roomId, room);
    return room;
  }

  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  joinRoom(roomIdOrCode, socket, user) {
    let room = this.rooms.get(roomIdOrCode);
    if (!room) {
      for (const r of this.rooms.values()) {
        if (r.code && r.code.toUpperCase() === String(roomIdOrCode).trim().toUpperCase()) {
          room = r;
          break;
        }
      }
    }
    if (!room) return { success: false, message: 'Room not found. Please check your Room Code or ID.' };

    // If player is already in this exact room, don't leave and re-join
    if (this.playerToRoom.get(socket.id) === room.id) {
      return { success: true, room };
    }

    // Leave previous room if any
    this.leaveCurrentRoom(socket.id);

    const joined = room.addPlayer(socket, user);
    if (!joined) return { success: false, message: 'Room is full.' };

    this.playerToRoom.set(socket.id, room.id);
    return { success: true, room };
  }

  leaveCurrentRoom(socketId) {
    const roomId = this.playerToRoom.get(socketId);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (room) {
      room.removePlayer(socketId);
      if (room.players.size === 0 && roomId !== 'public_1' && room.name !== 'Public City Circuit #1') {
        this.rooms.delete(roomId);
      }
    }
    this.playerToRoom.delete(socketId);
  }

  kickPlayer(hostSocketId, targetPlayerId) {
    const roomId = this.playerToRoom.get(hostSocketId);
    if (!roomId) return { success: false };

    const room = this.rooms.get(roomId);
    if (!room || room.hostId !== hostSocketId) return { success: false };

    const target = room.players.get(targetPlayerId);
    if (target && target.socket) {
      target.socket.emit('room:player_kicked', { reason: 'Kicked by host' });
      this.leaveCurrentRoom(targetPlayerId);
      return { success: true };
    }
    return { success: false };
  }

  getPublicRoomList() {
    return Array.from(this.rooms.values())
      .filter(r => !r.isPrivate)
      .map(r => ({
        id: r.id,
        code: r.code,
        name: r.name,
        trackId: r.trackId,
        totalLaps: r.totalLaps,
        playersCount: r.players.size,
        maxPlayers: r.maxPlayers,
        state: r.raceManager.state
      }));
  }
}

export const roomManager = new RoomManager();
