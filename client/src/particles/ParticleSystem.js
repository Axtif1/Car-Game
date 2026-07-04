import * as THREE from 'three';

/**
 * AAA Particle System Manager
 * Manages pooled particles for tire drift smoke, collision sparks, and nitro exhaust bursts.
 */
export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    this.poolSize = 300;

    this.initSmokePool();
  }

  initSmokePool() {
    const smokeGeo = new THREE.SphereGeometry(0.35, 6, 6);
    const smokeMat = new THREE.MeshStandardMaterial({
      color: 0xdcdcdc,
      roughness: 0.9,
      transparent: true,
      opacity: 0.6
    });

    this.smokeInstanced = new THREE.InstancedMesh(smokeGeo, smokeMat, this.poolSize);
    this.smokeInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.scene.add(this.smokeInstanced);

    const dummy = new THREE.Object3D();
    dummy.position.set(0, -999, 0);
    dummy.updateMatrix();

    for (let i = 0; i < this.poolSize; i++) {
      this.smokeInstanced.setMatrixAt(i, dummy.matrix);
      this.particles.push({
        active: false,
        pos: new THREE.Vector3(0, -999, 0),
        vel: new THREE.Vector3(),
        scale: 1,
        life: 0,
        maxLife: 1,
        type: 'smoke'
      });
    }
    this.smokeInstanced.instanceMatrix.needsUpdate = true;
  }

  emitTireSmoke(position, velocity) {
    // Find inactive particle
    const p = this.particles.find(item => !item.active);
    if (!p) return;

    p.active = true;
    p.pos.copy(position).add(new THREE.Vector3((Math.random() - 0.5) * 0.4, 0.2, (Math.random() - 0.5) * 0.4));
    p.vel.copy(velocity).multiplyScalar(0.2).add(new THREE.Vector3((Math.random() - 0.5) * 1.5, 1.8 + Math.random(), (Math.random() - 0.5) * 1.5));
    p.scale = 0.5 + Math.random() * 0.5;
    p.life = 0;
    p.maxLife = 0.6 + Math.random() * 0.4;
  }

  update(dt) {
    const dummy = new THREE.Object3D();
    let updated = false;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) continue;

      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        dummy.position.set(0, -999, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        this.smokeInstanced.setMatrixAt(i, dummy.matrix);
        updated = true;
      } else {
        p.pos.addScaledVector(p.vel, dt);
        p.scale += dt * 3.5; // Expand as smoke dissipates

        dummy.position.copy(p.pos);
        dummy.scale.setScalar(p.scale);
        dummy.updateMatrix();
        this.smokeInstanced.setMatrixAt(i, dummy.matrix);
        updated = true;
      }
    }

    if (updated) {
      this.smokeInstanced.instanceMatrix.needsUpdate = true;
    }
  }
}
