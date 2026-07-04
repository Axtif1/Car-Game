import jwt from 'jsonwebtoken';
import { dbManager } from '../database/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_racing_game_jwt_key_2026';

/**
 * Generate JWT token for user session
 */
export function generateToken(user) {
  return jwt.sign({
    userId: user._id,
    username: user.username
  }, JWT_SECRET, { expiresIn: '7d' });
}

/**
 * Verify JWT Token
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Socket.IO Authentication Middleware
 */
export async function socketAuthMiddleware(socket, next) {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  const usernameParam = socket.handshake.auth?.username || socket.handshake.query?.username || 'Racer';

  if (token) {
    const decoded = verifyToken(token);
    if (decoded && decoded.username) {
      const user = await dbManager.getOrCreateUser(decoded.username);
      socket.user = user;
      socket.token = token;
      return next();
    }
  }

  // If no token or invalid token, create or load guest profile and generate token
  const cleanUsername = usernameParam.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 15) || `Guest_${Math.floor(Math.random() * 9000 + 1000)}`;
  const user = await dbManager.getOrCreateUser(cleanUsername);
  socket.user = user;
  socket.token = generateToken(user);
  next();
}
