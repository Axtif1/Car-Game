/**
 * Security & Input Validation
 * Protects authoritative server from malformed input, packet spam, and speed/teleport hacks.
 */

export class InputValidator {
  constructor() {
    this.playerLastInputTime = new Map();
  }

  /**
   * Validate raw player input packet
   * Clients only send: { throttle, steer, brake, handbrake, nitro }
   */
  validateInput(socketId, rawInput) {
    if (!rawInput || typeof rawInput !== 'object') return null;

    const now = Date.now();
    const lastTime = this.playerLastInputTime.get(socketId) || 0;

    // Rate limiting: prevent input packet spaming (> 120 packets / second)
    if (now - lastTime < 6) {
      return null;
    }
    this.playerLastInputTime.set(socketId, now);

    // Clamp input values between expected bounds
    const throttle = Math.max(-1, Math.min(1, Number(rawInput.throttle) || 0));
    const steer = Math.max(-1, Math.min(1, Number(rawInput.steer) || 0));
    const brake = Boolean(rawInput.brake);
    const handbrake = Boolean(rawInput.handbrake);
    const nitro = Boolean(rawInput.nitro);
    const sequenceNumber = Number(rawInput.sequenceNumber) || 0;

    return { throttle, steer, brake, handbrake, nitro, sequenceNumber };
  }

  /**
   * Verify vehicle kinematics to prevent speed or teleport hacks
   */
  verifyKinematics(currentPos, newPos, maxAllowedSpeed, dt) {
    const dx = newPos.x - currentPos.x;
    const dy = newPos.y - currentPos.y;
    const dz = newPos.z - currentPos.z;
    const distSq = dx * dx + dy * dy + dz * dz;

    // Max theoretical displacement in dt + 25% tolerance for lag/boost
    const maxDist = (maxAllowedSpeed * 1.35) * dt;
    if (distSq > maxDist * maxDist) {
      // Possible teleport or speed hack detected
      return false;
    }
    return true;
  }

  removePlayer(socketId) {
    this.playerLastInputTime.delete(socketId);
  }
}

export const validator = new InputValidator();
