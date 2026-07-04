import { PHYSICS, CAR_SPECS, getTrackSurfaceData, getActiveTrack } from '../../shared/constants.js';

/**
 * Authoritative Vehicle Physics Entity
 */
export class VehicleEntity {
  constructor(id, carCategory = 'sports', initialPosition = { x: 0, y: 0.5, z: 0 }) {
    this.id = id;
    this.carCategory = CAR_SPECS[carCategory] ? carCategory : 'sports';
    this.specs = CAR_SPECS[this.carCategory];

    // State
    this.position = { x: initialPosition.x, y: initialPosition.y, z: initialPosition.z };
    this.rotation = { x: 0, y: 0, z: 0 }; // Euler angles in radians (y is yaw)
    this.velocity = { x: 0, y: 0, z: 0 };
    this.angularVelocity = 0; // yaw rate

    // Attributes
    this.speed = 0; // forward scalar speed (m/s)
    this.lateralSpeed = 0;
    this.nitroFuel = 100;
    this.isNitroActive = false;
    this.isDrifting = false;
    this.gear = 1;
    this.rpm = 1000;
    this.health = 100;

    // Last input
    this.currentInput = { throttle: 0, steer: 0, brake: false, handbrake: false, nitro: false, sequenceNumber: 0 };
    this.lastProcessedSequence = 0;
    this.currentSteer = 0;
    this.lastCheckpointId = 0;
  }

  applyInput(input) {
    if (!input) return;
    this.currentInput = input;
    if (input.sequenceNumber > this.lastProcessedSequence) {
      this.lastProcessedSequence = input.sequenceNumber;
    }
  }

  update(dt) {
    const input = this.currentInput;
    const specs = this.specs;

    // 1. Nitro fuel management
    let boostMultiplier = 1.0;
    if (input.nitro && input.throttle > 0 && this.nitroFuel > 0) {
      this.isNitroActive = true;
      boostMultiplier = specs.nitroBoost;
      this.nitroFuel = Math.max(0, this.nitroFuel - (100 / specs.nitroDuration) * dt);
    } else {
      this.isNitroActive = false;
      if (this.nitroFuel < 100) {
        this.nitroFuel = Math.min(100, this.nitroFuel + (100 * specs.nitroRefillRate) * dt);
      }
    }

    // 2. Engine Acceleration & Reverse
    let engineForce = 0;
    if (input.throttle > 0) {
      engineForce = input.throttle * specs.acceleration * boostMultiplier;
    } else if (input.throttle < 0) {
      engineForce = input.throttle * (specs.acceleration * 0.6); // Reverse torque
    }

    // 3. Braking & Rolling Resistance
    let brakeForce = 0;
    if (input.brake) {
      brakeForce = specs.braking * Math.sign(this.speed);
    }

    // Drag and friction forces
    const airDrag = PHYSICS.AIR_DRAG_COEFF * this.speed * Math.abs(this.speed);
    const rollingResist = PHYSICS.ROLLING_RESISTANCE * specs.weight * 9.81 * Math.sign(this.speed);

    // Net acceleration along forward axis
    const netForce = (engineForce * specs.weight) - (brakeForce * specs.weight) - airDrag * specs.weight - rollingResist;
    const forwardAccel = netForce / specs.weight;

    this.speed += forwardAccel * dt;

    // Max top speed cap
    const maxSpeed = specs.topSpeed * (this.isNitroActive ? specs.nitroBoost : 1.0);
    if (this.speed > maxSpeed) this.speed = maxSpeed;
    if (this.speed > 33.33) this.speed = 33.33; // Absolute cap at 120 km/h (33.33 m/s)
    if (this.speed < -maxSpeed * 0.35) this.speed = -maxSpeed * 0.35; // reverse limit

    // Prevent micro sliding at rest
    if (Math.abs(this.speed) < 0.05 && input.throttle === 0 && (input.brake || input.handbrake)) {
      this.speed = 0;
    }

    // 4. Steering and Drifting (with silky smooth Need for Speed arcade damping & track grip)
    const trackGrip = getActiveTrack().surfaceGrip || 1.0;
    this.isDrifting = input.handbrake || (Math.abs(input.steer) > 0.65 && Math.abs(this.speed) > 25 * trackGrip);
    this.currentSteer += (input.steer - this.currentSteer) * Math.min(1.0, dt * PHYSICS.STEER_SPEED * 3.8 * Math.sqrt(trackGrip));

    const turnEffectiveness = Math.min(1.0, Math.abs(this.speed) / 14);
    const steerAngle = this.currentSteer * PHYSICS.MAX_STEER_ANGLE * turnEffectiveness * specs.handling * trackGrip;

    // Yaw update
    if (Math.abs(this.speed) > 0.5) {
      const turnRate = (this.speed / specs.dimensions.length) * Math.sin(steerAngle);
      this.rotation.y += turnRate * dt;
    }

    // 5. Position integration (ice / low grip track increases drift slide angle)
    const slideMultiplier = trackGrip < 0.8 ? 0.65 : 0.35;
    const slideAngle = this.isDrifting ? slideMultiplier * -this.currentSteer : 0;
    const moveDirX = Math.sin(this.rotation.y + slideAngle);
    const moveDirZ = Math.cos(this.rotation.y + slideAngle);

    this.velocity.x = moveDirX * this.speed;
    this.velocity.z = moveDirZ * this.speed;

    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;

    const surface = getTrackSurfaceData(this.position.x, this.position.z);
    this.position.y = surface.roadY + 0.48;

    // Invisible Wall Barrier (keep car strictly within road width ±9.6 meters)
    const maxLateral = 9.6;
    if (Math.abs(surface.lateralDist) > maxLateral) {
      const sign = Math.sign(surface.lateralDist);
      this.position.x = surface.centerX + sign * surface.rightX * maxLateral;
      this.position.z = surface.centerZ + sign * surface.rightZ * maxLateral;

      // Glide velocity along forward road vector
      const fwdSpeed = this.velocity.x * surface.fwdX + this.velocity.z * surface.fwdZ;
      this.velocity.x = fwdSpeed * surface.fwdX * 0.96;
      this.velocity.z = fwdSpeed * surface.fwdZ * 0.96;
    }

    // Track Boundary Barrier & Respawn Protection
    this.checkTrackBoundaries();

    // 6. Calculate RPM and Gear
    const absSpeed = Math.abs(this.speed);
    if (absSpeed < 10) { this.gear = 1; }
    else if (absSpeed < 25) { this.gear = 2; }
    else if (absSpeed < 40) { this.gear = 3; }
    else if (absSpeed < 55) { this.gear = 4; }
    else if (absSpeed < 70) { this.gear = 5; }
    else { this.gear = 6; }

    const speedRatio = (absSpeed % 15) / 15;
    this.rpm = 1000 + speedRatio * 7000;
  }

  checkTrackBoundaries() {
    // Check out of map or manual respawn requested
    if (this.currentInput?.respawn || Math.hypot(this.position.x, this.position.z) > 480 || this.position.y < -3) {
      this.respawn();
      return;
    }
  }

  respawn() {
    this.speed = 0;
    this.velocity = { x: 0, y: 0, z: 0 };
    const surface = getTrackSurfaceData(this.position.x || 0, this.position.z || 0);
    this.position = { x: surface.centerX, y: surface.roadY + 0.5, z: surface.centerZ };
    this.rotation.y = Math.atan2(surface.fwdX, surface.fwdZ);
  }

  getState() {
    return {
      id: this.id,
      position: { x: Number(this.position.x.toFixed(2)), y: Number(this.position.y.toFixed(2)), z: Number(this.position.z.toFixed(2)) },
      rotation: { x: 0, y: Number(this.rotation.y.toFixed(3)), z: 0 },
      velocity: { x: Number(this.velocity.x.toFixed(2)), y: Number(this.velocity.y.toFixed(2)), z: Number(this.velocity.z.toFixed(2)) },
      speed: Math.min(120, Math.round(this.speed * 3.6)), // convert m/s to km/h and cap at max 120
      nitroFuel: Math.round(this.nitroFuel),
      isNitroActive: this.isNitroActive,
      isDrifting: this.isDrifting,
      gear: this.gear,
      rpm: Math.round(this.rpm),
      lastProcessedSequence: this.lastProcessedSequence
    };
  }
}

/**
 * Physics World Simulation Loop
 */
export class PhysicsWorld {
  constructor() {
    this.vehicles = new Map();
  }

  addVehicle(id, carCategory, initialPosition) {
    const vehicle = new VehicleEntity(id, carCategory, initialPosition);
    this.vehicles.set(id, vehicle);
    return vehicle;
  }

  removeVehicle(id) {
    this.vehicles.delete(id);
  }

  getVehicle(id) {
    return this.vehicles.get(id);
  }

  step(dt, canMove = true, finishedIds = new Set()) {
    const vehiclesArray = Array.from(this.vehicles.values());

    if (!canMove) {
      for (const vehicle of vehiclesArray) {
        vehicle.speed = 0;
        vehicle.velocity = { x: 0, y: 0, z: 0 };
        const surface = getTrackSurfaceData(vehicle.position.x, vehicle.position.z);
        vehicle.position.y = surface.roadY + 0.48;
      }
      return;
    }

    // Step individual vehicle physics
    for (const vehicle of vehiclesArray) {
      if (finishedIds.has(vehicle.id)) {
        vehicle.speed *= 0.88; // brake smoothly right at finish line
        if (Math.abs(vehicle.speed) < 0.5) {
          vehicle.speed = 0;
          vehicle.velocity = { x: 0, y: 0, z: 0 };
        } else {
          vehicle.velocity.x = vehicle.speed * Math.sin(vehicle.rotation.y);
          vehicle.velocity.z = vehicle.speed * Math.cos(vehicle.rotation.y);
          vehicle.position.x += vehicle.velocity.x * dt;
          vehicle.position.z += vehicle.velocity.z * dt;
        }
        const surface = getTrackSurfaceData(vehicle.position.x, vehicle.position.z);
        vehicle.position.y = surface.roadY + 0.48;
        continue;
      }
      vehicle.update(dt);
    }

    // Vehicle-to-Vehicle simple elastic sphere collision detection
    for (let i = 0; i < vehiclesArray.length; i++) {
      for (let j = i + 1; j < vehiclesArray.length; j++) {
        const v1 = vehiclesArray[i];
        const v2 = vehiclesArray[j];

        const dx = v2.position.x - v1.position.x;
        const dz = v2.position.z - v1.position.z;
        const distSq = dx * dx + dz * dz;
        const minRadius = 2.4; // 1.2 + 1.2

        if (distSq < minRadius * minRadius && distSq > 0.001) {
          const dist = Math.sqrt(distSq);
          const overlap = (minRadius - dist) * 0.5;
          const nx = dx / dist;
          const nz = dz / dist;

          // Separate positions
          v1.position.x -= nx * overlap;
          v1.position.z -= nz * overlap;
          v2.position.x += nx * overlap;
          v2.position.z += nz * overlap;

          // Momentum transfer
          const v1Dot = v1.velocity.x * nx + v1.velocity.z * nz;
          const v2Dot = v2.velocity.x * nx + v2.velocity.z * nz;
          const impulse = (v1Dot - v2Dot) * 0.6;

          v1.speed -= impulse * 0.5;
          v2.speed += impulse * 0.5;
        }
      }
    }
  }
}
