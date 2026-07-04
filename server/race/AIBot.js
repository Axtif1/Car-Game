import { TRACK_CHECKPOINTS } from '../../shared/constants.js';

/**
 * AI Opponent Bot Controller
 * Simulates intelligent steering, waypoint navigation, overtaking, braking before turns, and recovery.
 */
export class AIBot {
  constructor(id, name, difficulty = 'medium', carCategory = 'sports') {
    this.id = id;
    this.name = name;
    this.isAI = true;
    this.difficulty = difficulty; // 'easy', 'medium', 'hard'
    this.carCategory = carCategory;

    // AI navigation state
    this.targetCheckpointIndex = 1;
    this.laneOffset = (Math.random() - 0.5) * 8; // Lateral offset to prevent all AI driving in single file
    this.stuckTimer = 0;
    this.isRecovering = false;

    // Tuning per difficulty
    this.tuning = {
      easy: { speedFactor: 0.78, steerPrecision: 0.75, lookAhead: 15, nitroChance: 0.05 },
      medium: { speedFactor: 0.90, steerPrecision: 0.90, lookAhead: 25, nitroChance: 0.15 },
      hard: { speedFactor: 1.0, steerPrecision: 0.98, lookAhead: 35, nitroChance: 0.35 }
    }[difficulty] || { speedFactor: 0.90, steerPrecision: 0.90, lookAhead: 25, nitroChance: 0.15 };
  }

  /**
   * Generate input packet for this tick given current vehicle state and surrounding cars
   */
  computeInput(vehicle, allVehicles, dt) {
    if (!vehicle) return { throttle: 0, steer: 0, brake: false, handbrake: false, nitro: false };

    const currentPos = vehicle.position;
    const currentRotY = vehicle.rotation.y;
    const speed = vehicle.speed;

    // 1. Recovery check if stuck against a wall or obstacle
    if (Math.abs(speed) < 1.5 && !this.isRecovering) {
      this.stuckTimer += dt;
      if (this.stuckTimer > 1.8) {
        this.isRecovering = true;
        this.stuckTimer = 0;
      }
    } else if (Math.abs(speed) > 5) {
      this.stuckTimer = 0;
      this.isRecovering = false;
    }

    if (this.isRecovering) {
      this.stuckTimer += dt;
      if (this.stuckTimer > 1.5) this.isRecovering = false;
      return {
        throttle: -1, // reverse out of obstacle
        steer: -Math.sign(this.laneOffset) || 0.8,
        brake: false,
        handbrake: false,
        nitro: false,
        sequenceNumber: Date.now()
      };
    }

    // 2. Target Checkpoint calculation
    const targetCP = TRACK_CHECKPOINTS[this.targetCheckpointIndex % TRACK_CHECKPOINTS.length];
    const nextCP = TRACK_CHECKPOINTS[(this.targetCheckpointIndex + 1) % TRACK_CHECKPOINTS.length];

    // Check distance to target checkpoint
    const dx = targetCP.pos.x - currentPos.x;
    const dz = targetCP.pos.z - currentPos.z;
    const distToCP = Math.sqrt(dx * dx + dz * dz);

    if (distToCP < targetCP.width * 0.9) {
      this.targetCheckpointIndex = (this.targetCheckpointIndex + 1) % TRACK_CHECKPOINTS.length;
      // Change lane offset slightly when passing checkpoints for overtaking dynamics
      this.laneOffset = (Math.random() - 0.5) * 10;
    }

    // Target point with lateral offset for overtaking & racing line
    const targetX = targetCP.pos.x + targetCP.dir.z * this.laneOffset;
    const targetZ = targetCP.pos.z - targetCP.dir.x * this.laneOffset;

    // 3. Calculate desired yaw angle towards target
    const desiredDirX = targetX - currentPos.x;
    const desiredDirZ = targetZ - currentPos.z;
    const desiredYaw = Math.atan2(desiredDirX, desiredDirZ);

    // Angular error
    let angleDiff = desiredYaw - currentRotY;
    // Normalize to [-pi, pi]
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    const steer = Math.max(-1, Math.min(1, angleDiff * 2.2 * this.tuning.steerPrecision));

    // 4. Collision Avoidance & Overtaking
    let brake = false;
    let throttle = 1.0 * this.tuning.speedFactor;

    for (const other of allVehicles) {
      if (other.id === vehicle.id) continue;
      const relX = other.position.x - currentPos.x;
      const relZ = other.position.z - currentPos.z;
      const distSq = relX * relX + relZ * relZ;

      // If car ahead is within 20 meters and in front of us
      if (distSq < 400 && distSq > 1) {
        const forwardX = Math.sin(currentRotY);
        const forwardZ = Math.cos(currentRotY);
        const dot = relX * forwardX + relZ * forwardZ;

        if (dot > 0) { // Object is directly in front
          // Overtake by modifying lateral offset away from opponent
          this.laneOffset += Math.sign(relX * forwardZ - relZ * forwardX) * -3;
          if (distSq < 100 && speed > other.speed) {
            brake = true;
            throttle = 0.2;
          }
        }
      }
    }

    // 5. Corner Braking Logic
    // If angle to checkpoint is sharp (> 35 deg) and speed is high (> 20 m/s), brake before turning
    if (Math.abs(angleDiff) > 0.6 && speed > 20) {
      brake = true;
      throttle = 0.3;
    }

    // 6. Nitro activation on long straights
    const nitro = Math.abs(angleDiff) < 0.15 && speed > 22 && Math.random() < this.tuning.nitroChance;

    return {
      throttle,
      steer,
      brake,
      handbrake: Math.abs(angleDiff) > 1.2 && speed > 24,
      nitro,
      sequenceNumber: Date.now()
    };
  }
}
