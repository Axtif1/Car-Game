import * as THREE from 'three';

/**
 * Advanced Third Person Chase Camera
 * Features smooth lag follow, dynamic FOV expansion during high speed/nitro, camera shake, and look-behind mode.
 */
export class ThirdPersonCamera {
  constructor(engine) {
    this.engine = engine;
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.5, 1000);

    this.targetObject = null;
    this.baseFov = 75;
    this.currentFov = 75;

    // Relative chase offsets
    this.offset = new THREE.Vector3(0, 3.2, -7.5); // Normal chase position behind car
    this.reverseOffset = new THREE.Vector3(0, 3.2, 8.5); // Look behind view

    // Camera current position & target lookAt smoothing
    this.currentPosition = new THREE.Vector3(0, 5, -10);
    this.currentLookAt = new THREE.Vector3(0, 1, 0);

    // Controls state
    this.isLookingBehind = false;
    this.shakeIntensity = 0;
    this.mode = 'race'; // 'race' | 'garage'

    // Garage Orbit Camera State
    this.orbitAngle = 0.6;
    this.orbitDistance = 6.0;
    this.orbitHeight = 1.6;
    this.isDragging = false;
    this.lastMouseX = 0;

    window.addEventListener('mousedown', (e) => {
      if (this.mode === 'garage') {
        this.isDragging = true;
        this.lastMouseX = e.clientX;
      }
    });

    window.addEventListener('mouseup', () => { this.isDragging = false; });
    window.addEventListener('mousemove', (e) => {
      if (this.mode === 'garage' && this.isDragging) {
        const deltaX = e.clientX - this.lastMouseX;
        this.orbitAngle -= deltaX * 0.008;
        this.lastMouseX = e.clientX;
      }
    });

    window.addEventListener('wheel', (e) => {
      if (this.mode === 'garage') {
        this.orbitDistance = Math.max(3.5, Math.min(11.0, this.orbitDistance + e.deltaY * 0.005));
      }
    });
  }

  setTarget(object3d) {
    this.targetObject = object3d;
    if (object3d && this.mode === 'race') {
      this.currentPosition.copy(object3d.position).add(new THREE.Vector3(0, 4, -8));
      this.currentLookAt.copy(object3d.position);
    }
  }

  resetGarageOrbit() {
    this.orbitAngle = 0.6;
    this.orbitDistance = 6.0;
    this.orbitHeight = 1.6;
  }

  triggerShake(intensity = 0.5) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
  }

  onResize(width, height) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  update(dt, vehicleState) {
    if (!this.targetObject) return;

    const targetPos = this.targetObject.position.clone();

    if (this.mode === 'garage') {
      // Rotate slowly if idle or let user drag orbit
      const ox = targetPos.x + Math.sin(this.orbitAngle) * this.orbitDistance;
      const oz = targetPos.z + Math.cos(this.orbitAngle) * this.orbitDistance;
      const oy = targetPos.y + this.orbitHeight;

      this.currentPosition.lerp(new THREE.Vector3(ox, oy, oz), 0.15);
      this.currentLookAt.lerp(targetPos.clone().add(new THREE.Vector3(0, 0.6, 0)), 0.15);

      this.camera.position.copy(this.currentPosition);
      this.camera.lookAt(this.currentLookAt);
      return;
    }

    const targetRotY = vehicleState ? vehicleState.rotation.y : this.targetObject.rotation.y;
    const speedKmH = vehicleState ? Math.abs(vehicleState.speed) : 0;
    const isNitro = vehicleState ? vehicleState.isNitroActive : false;

    // 1. Dynamic FOV & Nitro Zoom
    let targetFov = this.baseFov + (speedKmH / 230) * 18;
    if (isNitro) {
      targetFov += 8;
      // Micro nitro shake
      this.triggerShake(0.15);
    }
    this.currentFov += (targetFov - this.currentFov) * (dt * 6);
    this.camera.fov = this.currentFov;
    this.camera.updateProjectionMatrix();

    // 2. Calculate ideal world position based on vehicle orientation
    const chosenOffset = this.isLookingBehind ? this.reverseOffset : this.offset;
    const localOffset = chosenOffset.clone();
    localOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), targetRotY);

    const idealPos = targetPos.clone().add(localOffset);

    // 3. Smooth Camera Lag Follow (spring interpolation)
    const followSpeed = this.isLookingBehind ? 15 : 10;
    this.currentPosition.lerp(idealPos, 1 - Math.exp(-followSpeed * dt));

    // Ground collision protection (don't let camera clip under terrain)
    if (this.currentPosition.y < 0.8) {
      this.currentPosition.y = 0.8;
    }

    // 4. Smooth Target LookAt point
    const idealLookAt = targetPos.clone().add(new THREE.Vector3(0, 1.2, 0));
    // Look slightly ahead into turn when turning
    if (!this.isLookingBehind) {
      const forwardVec = new THREE.Vector3(Math.sin(targetRotY), 0, Math.cos(targetRotY)).multiplyScalar(10);
      idealLookAt.add(forwardVec);
    }
    this.currentLookAt.lerp(idealLookAt, 1 - Math.exp(-12 * dt));

    // 5. Apply camera shake
    const finalPos = this.currentPosition.clone();
    if (this.shakeIntensity > 0.01) {
      finalPos.x += (Math.random() - 0.5) * this.shakeIntensity;
      finalPos.y += (Math.random() - 0.5) * this.shakeIntensity;
      finalPos.z += (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeIntensity *= Math.pow(0.1, dt);
    } else {
      this.shakeIntensity = 0;
    }

    this.camera.position.copy(finalPos);
    this.camera.lookAt(this.currentLookAt);
  }
}
