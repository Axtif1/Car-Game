import * as THREE from 'three';

/**
 * Core WebGL Rendering Engine & Game Loop
 */
export class Engine {
  constructor(containerId = 'canvas-container') {
    this.container = document.getElementById(containerId);
    this.clock = new THREE.Clock();

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0c14);
    this.scene.fog = new THREE.FogExp2(0x111628, 0.0035);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    // this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    this.container.appendChild(this.renderer.domElement);

    // Subscribed update handlers
    this.updateCallbacks = new Set();

    // Window resize listener
    window.addEventListener('resize', () => this.onWindowResize());
  }

  addUpdateCallback(fn) {
    if (typeof fn === 'function') {
      this.updateCallbacks.add(fn);
    }
  }

  removeUpdateCallback(fn) {
    this.updateCallbacks.delete(fn);
  }

  onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.renderer.setSize(width, height);
    for (const callback of this.updateCallbacks) {
      if (callback && callback.onResize) {
        callback.onResize(width, height);
      }
    }
  }

  start() {
    this.clock.start();
    this.loop();
  }

  loop() {
    requestAnimationFrame(() => this.loop());
    const dt = Math.min(this.clock.getDelta(), 0.1);

    for (const callback of this.updateCallbacks) {
      if (typeof callback === 'function') {
        callback(dt);
      } else if (callback && typeof callback.update === 'function') {
        callback.update(dt);
      }
    }
  }
}
