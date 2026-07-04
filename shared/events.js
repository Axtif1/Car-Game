/**
 * Shared WebSocket Event Constants
 * Guarantees event name consistency across server authoritative sockets and client connection.
 */

export const SOCKET_EVENTS = {
  // Authentication & Session
  AUTH_LOGIN: 'auth:login',
  AUTH_SUCCESS: 'auth:success',
  AUTH_ERROR: 'auth:error',

  // Lobby & Room Management
  GET_ROOMS: 'room:list_request',
  ROOM_LIST: 'room:list_response',
  CREATE_ROOM: 'room:create',
  JOIN_ROOM: 'room:join',
  LEAVE_ROOM: 'room:leave',
  ROOM_JOINED: 'room:joined',
  ROOM_UPDATED: 'room:updated',
  PLAYER_READY: 'room:player_ready',
  HOST_START_RACE: 'room:host_start_race',
  KICK_PLAYER: 'room:kick_player',
  PLAYER_KICKED: 'room:player_kicked',
  ADD_AI_BOTS: 'room:add_ai_bots',
  REMOVE_AI_BOTS: 'room:remove_ai_bots',
  CHANGE_CAR_CATEGORY: 'room:change_car_category',

  // Real-time Authoritative Physics Simulation & Inputs
  PLAYER_INPUT: 'game:player_input',
  WORLD_STATE_UPDATE: 'game:world_state_update',
  PLAYER_RESPAWN: 'game:player_respawn',
  PING_CHECK: 'net:ping_check',
  PONG_REPLY: 'net:pong_reply',

  // Race Lifecycle Events
  COUNTDOWN_START: 'race:countdown_start',
  COUNTDOWN_TICK: 'race:countdown_tick',
  RACE_START: 'race:start',
  CHECKPOINT_PASSED: 'race:checkpoint_passed',
  LAP_COMPLETED: 'race:lap_completed',
  WRONG_WAY_WARNING: 'race:wrong_way',
  PLAYER_FINISHED: 'race:player_finished',
  RACE_ENDED: 'race:ended',

  // Garage & Player Profile
  GET_PROFILE: 'profile:get',
  PROFILE_DATA: 'profile:data',
  SAVE_GARAGE: 'garage:save',
  GARAGE_UPDATED: 'garage:updated',
  GET_LEADERBOARD: 'leaderboard:get',
  LEADERBOARD_DATA: 'leaderboard:data'
};
