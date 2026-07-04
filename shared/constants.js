/**
 * Shared Game Constants
 * Used by both client and server to guarantee authoritative consistency.
 */

export const PHYSICS = {
  TIMESTEP: 1 / 60, // 60 Hz simulation
  GRAVITY: { x: 0, y: -9.81, z: 0 },
  MAX_STEER_ANGLE: Math.PI / 8.0, // ~22.5 degrees for smooth high-speed steering
  STEER_SPEED: 2.8,
  AIR_DRAG_COEFF: 0.003,
  ROLLING_RESISTANCE: 0.012,
  DOWNFORCE_COEFF: 0.012,
  WRONG_WAY_THRESHOLD: Math.PI * 0.65, // Angle deviation from track forward
  RESPAWN_DELAY_MS: 2000
};

export const GAME_STATES = {
  LOBBY: 'LOBBY',
  COUNTDOWN: 'COUNTDOWN',
  RACING: 'RACING',
  FINISHED: 'FINISHED'
};

export const RACE_CONFIG = {
  DEFAULT_LAPS: 3,
  COUNTDOWN_SECONDS: 3,
  MAX_PLAYERS: 8
};

/**
 * Car Specifications
 * Sports Cars, Super Cars, Muscle Cars
 */
export const CAR_SPECS = {
  sports: {
    name: 'Apex Velocity GT',
    category: 'Sports',
    topSpeed: 27,         // m/s (~97 km/h, max 120 with nitro)
    acceleration: 22,     // Smooth controllable acceleration
    braking: 45,          // Braking deceleration force
    weight: 1350,         // kg
    handling: 1.45,       // Razor sharp responsive steering
    grip: 2.3,            // Strong lateral tire friction for tight corners
    driftGrip: 0.95,      // Smooth controlled drift
    suspension: {
      stiffness: 85,
      damping: 12,
      restLength: 0.35
    },
    dimensions: { width: 1.9, height: 1.25, length: 4.4 },
    nitroBoost: 1.22,
    nitroDuration: 4.0,   // seconds of full boost
    nitroRefillRate: 0.25 // recharge per second
  },
  super: {
    name: 'Valkyrie Hyperion',
    category: 'Super',
    topSpeed: 31,         // m/s (~112 km/h, max 120 with nitro)
    acceleration: 26,     // High performance launch
    braking: 60,          // High performance ceramic brakes
    weight: 1200,         // Lightweight carbon fiber (kg)
    handling: 1.65,       // Ultra precision steering
    grip: 2.7,            // Extreme downforce grip
    driftGrip: 1.05,      // High stability slide
    suspension: {
      stiffness: 110,
      damping: 15,
      restLength: 0.28
    },
    dimensions: { width: 2.0, height: 1.15, length: 4.6 },
    nitroBoost: 1.18,
    nitroDuration: 3.5,
    nitroRefillRate: 0.3
  },
  muscle: {
    name: 'Viper Dominator 426',
    category: 'Muscle',
    topSpeed: 29,         // m/s (~104 km/h, max 120 with nitro)
    acceleration: 24,     // V8 torque launch
    braking: 38,          // Heavy weight braking
    weight: 1650,         // Heavy steel chassis (kg)
    handling: 1.35,       // Responsive steering upgrade
    grip: 2.0,            // Improved road grip
    driftGrip: 0.85,      // High drift sliding ability
    suspension: {
      stiffness: 70,
      damping: 10,
      restLength: 0.42
    },
    dimensions: { width: 1.95, height: 1.35, length: 4.8 },
    nitroBoost: 1.20,
    nitroDuration: 4.5,
    nitroRefillRate: 0.2
  }
};

/**
 * Track Checkpoints for the City Map
 * Each checkpoint has a position and direction vector pointing along the road forward axis.
 */
/**
 * Track Definitions & Checkpoints for 4 Distinct Maps
 */
export const TRACK_DEFINITIONS = {
  city: {
    id: 'city',
    name: 'Cyber City Sprint',
    theme: 'city',
    surfaceGrip: 1.0,
    checkpoints: [
      { id: 0, pos: { x: 0, y: 0, z: 0 }, dir: { x: 0, y: 0, z: -1 }, width: 24 },
      { id: 1, pos: { x: 0, y: 0, z: -180 }, dir: { x: 0, y: 0, z: -1 }, width: 24 },
      { id: 2, pos: { x: -60, y: 0, z: -280 }, dir: { x: -1, y: 0, z: 0 }, width: 24 },
      { id: 3, pos: { x: -220, y: 5, z: -280 }, dir: { x: -1, y: 0, z: 0 }, width: 24 },
      { id: 4, pos: { x: -320, y: 10, z: -180 }, dir: { x: 0, y: 0, z: 1 }, width: 24 },
      { id: 5, pos: { x: -320, y: 5, z: 20 }, dir: { x: 0, y: 0, z: 1 }, width: 24 },
      { id: 6, pos: { x: -160, y: 0, z: 120 }, dir: { x: 1, y: 0, z: 0 }, width: 24 },
      { id: 7, pos: { x: 0, y: 0, z: 120 }, dir: { x: 0, y: 0, z: -1 }, width: 24 }
    ],
    startingGrid: [
      { x: -3.6, y: 0.5, z: 15 }, { x: 3.6, y: 0.5, z: 24 },
      { x: -3.6, y: 0.5, z: 33 }, { x: 3.6, y: 0.5, z: 42 },
      { x: -3.6, y: 0.5, z: 51 }, { x: 3.6, y: 0.5, z: 60 },
      { x: -3.6, y: 0.5, z: 69 }, { x: 3.6, y: 0.5, z: 78 }
    ]
  },
  canyon: {
    id: 'canyon',
    name: 'Neon Canyon Drift',
    theme: 'canyon',
    surfaceGrip: 0.94,
    checkpoints: [
      { id: 0, pos: { x: 0, y: 0, z: 0 }, dir: { x: 0, y: 0, z: -1 }, width: 26 },
      { id: 1, pos: { x: 0, y: 0, z: -200 }, dir: { x: 0, y: 0, z: -1 }, width: 26 },
      { id: 2, pos: { x: 120, y: 12, z: -340 }, dir: { x: 1, y: 0, z: 0 }, width: 26 },
      { id: 3, pos: { x: 280, y: 20, z: -340 }, dir: { x: 1, y: 0, z: 0 }, width: 26 },
      { id: 4, pos: { x: 400, y: 15, z: -200 }, dir: { x: 0, y: 0, z: 1 }, width: 26 },
      { id: 5, pos: { x: 400, y: 5, z: 40 }, dir: { x: 0, y: 0, z: 1 }, width: 26 },
      { id: 6, pos: { x: 200, y: 0, z: 140 }, dir: { x: -1, y: 0, z: 0 }, width: 26 },
      { id: 7, pos: { x: 0, y: 0, z: 140 }, dir: { x: 0, y: 0, z: -1 }, width: 26 }
    ],
    startingGrid: [
      { x: -3.6, y: 0.5, z: 15 }, { x: 3.6, y: 0.5, z: 24 },
      { x: -3.6, y: 0.5, z: 33 }, { x: 3.6, y: 0.5, z: 42 },
      { x: -3.6, y: 0.5, z: 51 }, { x: 3.6, y: 0.5, z: 60 },
      { x: -3.6, y: 0.5, z: 69 }, { x: 3.6, y: 0.5, z: 78 }
    ]
  },
  arctic: {
    id: 'arctic',
    name: 'Arctic Frost Apex',
    theme: 'arctic',
    surfaceGrip: 0.72,
    checkpoints: [
      { id: 0, pos: { x: 0, y: 0, z: 0 }, dir: { x: 0, y: 0, z: -1 }, width: 28 },
      { id: 1, pos: { x: 0, y: 0, z: -220 }, dir: { x: 0, y: 0, z: -1 }, width: 28 },
      { id: 2, pos: { x: -150, y: 4, z: -360 }, dir: { x: -1, y: 0, z: 0 }, width: 28 },
      { id: 3, pos: { x: -340, y: 8, z: -360 }, dir: { x: -1, y: 0, z: 0 }, width: 28 },
      { id: 4, pos: { x: -460, y: 4, z: -220 }, dir: { x: 0, y: 0, z: 1 }, width: 28 },
      { id: 5, pos: { x: -460, y: 0, z: 40 }, dir: { x: 0, y: 0, z: 1 }, width: 28 },
      { id: 6, pos: { x: -230, y: 0, z: 160 }, dir: { x: 1, y: 0, z: 0 }, width: 28 },
      { id: 7, pos: { x: 0, y: 0, z: 160 }, dir: { x: 0, y: 0, z: -1 }, width: 28 }
    ],
    startingGrid: [
      { x: -3.6, y: 0.5, z: 15 }, { x: 3.6, y: 0.5, z: 24 },
      { x: -3.6, y: 0.5, z: 33 }, { x: 3.6, y: 0.5, z: 42 },
      { x: -3.6, y: 0.5, z: 51 }, { x: 3.6, y: 0.5, z: 60 },
      { x: -3.6, y: 0.5, z: 69 }, { x: 3.6, y: 0.5, z: 78 }
    ]
  },
  volcano: {
    id: 'volcano',
    name: 'Volcano Industrial Core',
    theme: 'volcano',
    surfaceGrip: 1.05,
    checkpoints: [
      { id: 0, pos: { x: 0, y: 0, z: 0 }, dir: { x: 0, y: 0, z: -1 }, width: 24 },
      { id: 1, pos: { x: 0, y: 0, z: -160 }, dir: { x: 0, y: 0, z: -1 }, width: 24 },
      { id: 2, pos: { x: 140, y: 6, z: -260 }, dir: { x: 1, y: 0, z: 0 }, width: 24 },
      { id: 3, pos: { x: 260, y: 12, z: -160 }, dir: { x: 0, y: 0, z: 1 }, width: 24 },
      { id: 4, pos: { x: 260, y: 6, z: 60 }, dir: { x: 0, y: 0, z: 1 }, width: 24 },
      { id: 5, pos: { x: 140, y: 0, z: 150 }, dir: { x: -1, y: 0, z: 0 }, width: 24 },
      { id: 6, pos: { x: -80, y: 4, z: 150 }, dir: { x: -1, y: 0, z: 0 }, width: 24 },
      { id: 7, pos: { x: 0, y: 0, z: 100 }, dir: { x: 0, y: 0, z: -1 }, width: 24 }
    ],
    startingGrid: [
      { x: -3.6, y: 0.5, z: 15 }, { x: 3.6, y: 0.5, z: 24 },
      { x: -3.6, y: 0.5, z: 33 }, { x: 3.6, y: 0.5, z: 42 },
      { x: -3.6, y: 0.5, z: 51 }, { x: 3.6, y: 0.5, z: 60 },
      { x: -3.6, y: 0.5, z: 69 }, { x: 3.6, y: 0.5, z: 78 }
    ]
  }
};

let currentActiveTrackId = 'city';

export function setActiveTrack(trackId) {
  if (TRACK_DEFINITIONS[trackId]) {
    currentActiveTrackId = trackId;
    TRACK_CHECKPOINTS.length = 0;
    TRACK_CHECKPOINTS.push(...TRACK_DEFINITIONS[trackId].checkpoints);
    STARTING_GRID_POSITIONS.length = 0;
    STARTING_GRID_POSITIONS.push(...TRACK_DEFINITIONS[trackId].startingGrid);
    TRACK_SAMPLES.length = 0;
  }
}

export function getActiveTrack() {
  return TRACK_DEFINITIONS[currentActiveTrackId] || TRACK_DEFINITIONS.city;
}

export const TRACK_CHECKPOINTS = [...TRACK_DEFINITIONS.city.checkpoints];
export const STARTING_GRID_POSITIONS = [...TRACK_DEFINITIONS.city.startingGrid];

const TRACK_SAMPLES = [];

function generateTrackSamples() {
  if (TRACK_SAMPLES.length > 0) return;
  const N = TRACK_CHECKPOINTS.length;
  const steps = 100;

  for (let i = 0; i < N; i++) {
    const p0 = TRACK_CHECKPOINTS[(i - 1 + N) % N].pos;
    const p1 = TRACK_CHECKPOINTS[i].pos;
    const p2 = TRACK_CHECKPOINTS[(i + 1) % N].pos;
    const p3 = TRACK_CHECKPOINTS[(i + 2) % N].pos;

    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const t2 = t * t;
      const t3 = t2 * t;
      const x = 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
      const y = 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);
      const z = 0.5 * ((2 * p1.z) + (-p0.z + p2.z) * t + (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 + (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3);
      TRACK_SAMPLES.push({ x, y, z });
    }
  }

  const total = TRACK_SAMPLES.length;
  for (let i = 0; i < total; i++) {
    const curr = TRACK_SAMPLES[i];
    const next = TRACK_SAMPLES[(i + 1) % total];
    const dx = next.x - curr.x;
    const dz = next.z - curr.z;
    const len = Math.sqrt(dx * dx + dz * dz) || 1;
    curr.fwdX = dx / len;
    curr.fwdZ = dz / len;
    curr.rightX = -curr.fwdZ;
    curr.rightZ = curr.fwdX;
  }
}

export function registerTrackCurvePoints(points) {
  TRACK_SAMPLES.length = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const nextP = points[(i + 1) % points.length];
    const dx = nextP.x - p.x;
    const dz = nextP.z - p.z;
    const len = Math.sqrt(dx * dx + dz * dz) || 1;
    const fwdX = dx / len;
    const fwdZ = dz / len;
    TRACK_SAMPLES.push({
      x: p.x, y: p.y, z: p.z,
      fwdX, fwdZ,
      rightX: -fwdZ, rightZ: fwdX
    });
  }
}

export function getTrackSurfaceData(x, z) {
  generateTrackSamples();
  let minSq = Infinity;
  let closestIdx = 0;
  const total = TRACK_SAMPLES.length;

  for (let i = 0; i < total; i++) {
    const pt = TRACK_SAMPLES[i];
    const dx = x - pt.x;
    const dz = z - pt.z;
    const sq = dx * dx + dz * dz;
    if (sq < minSq) {
      minSq = sq;
      closestIdx = i;
    }
  }

  const p = TRACK_SAMPLES[closestIdx];
  const nextP = TRACK_SAMPLES[(closestIdx + 1) % total];

  const dx = nextP.x - p.x;
  const dz = nextP.z - p.z;
  const lenSq = dx * dx + dz * dz || 1;
  const u = Math.max(0, Math.min(1, ((x - p.x) * dx + (z - p.z) * dz) / lenSq));

  const centerX = p.x + u * dx;
  const centerY = p.y + u * (nextP.y - p.y);
  const centerZ = p.z + u * dz;

  const latDx = x - centerX;
  const latDz = z - centerZ;
  const lateralDist = latDx * p.rightX + latDz * p.rightZ;

  return {
    roadY: centerY,
    lateralDist,
    rightX: p.rightX,
    rightZ: p.rightZ,
    fwdX: p.fwdX,
    fwdZ: p.fwdZ,
    centerX,
    centerZ
  };
}
