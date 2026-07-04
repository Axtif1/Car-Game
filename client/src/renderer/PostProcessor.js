import * as THREE from 'three';

/**
 * Lighting, Sky Dome & Rendering Pipeline Manager
 */
export class PostProcessor {
  constructor(engine) {
    this.engine = engine;
    this.scene = engine.scene;
    this.renderer = engine.renderer;

    this.quality = 'high'; // high, medium, low
    this.setupLighting();
    this.setupSkyDome();
  }

  setupLighting() {
    // Hemisphere ambient light (Sky color, Ground color, intensity)
    this.hemiLight = new THREE.HemisphereLight(0x4466aa, 0x111622, 1.2);
    this.scene.add(this.hemiLight);

    // Dynamic Directional Sun Light with soft shadows
    this.sunLight = new THREE.DirectionalLight(0xfff5e6, 2.5);
    this.sunLight.position.set(-150, 220, 150);
    this.sunLight.castShadow = true;

    // High resolution shadow map bounds
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 600;
    const d = 140;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0004;

    this.scene.add(this.sunLight);

    // Warm horizon glow light
    const horizonLight = new THREE.PointLight(0xff7700, 3, 400);
    horizonLight.position.set(-250, 40, -300);
    this.scene.add(horizonLight);
  }

  setupSkyDome() {
    this.skyUniforms = {
      uTheme: { value: 0 }
    };

    // Stunning Synthwave Cyberpunk Atmospheric Skybox Dome
    const vertexShader = `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      uniform int uTheme;
      varying vec3 vWorldPosition;
      
      float hash(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      void main() {
        vec3 dir = normalize(vWorldPosition);
        float h = max(0.0, dir.y);

        vec3 zenithColor = vec3(0.015, 0.018, 0.05);
        vec3 midColor = vec3(0.08, 0.03, 0.18);
        vec3 horizonColor = vec3(0.0, 0.55, 0.85);
        vec3 glowColor = vec3(0.9, 0.1, 0.5);

        if (uTheme == 1) { // Canyon Sunset
          zenithColor = vec3(0.05, 0.04, 0.12);
          midColor = vec3(0.35, 0.12, 0.08);
          horizonColor = vec3(0.95, 0.45, 0.15);
          glowColor = vec3(1.0, 0.7, 0.2);
        } else if (uTheme == 2) { // Arctic Aurora
          zenithColor = vec3(0.01, 0.03, 0.08);
          midColor = vec3(0.03, 0.15, 0.25);
          horizonColor = vec3(0.4, 0.9, 1.0);
          glowColor = vec3(0.2, 1.0, 0.7);
        } else if (uTheme == 3) { // Volcano Ash
          zenithColor = vec3(0.03, 0.01, 0.01);
          midColor = vec3(0.18, 0.04, 0.04);
          horizonColor = vec3(0.7, 0.15, 0.05);
          glowColor = vec3(1.0, 0.3, 0.0);
        }

        vec3 skyColor = mix(horizonColor, midColor, pow(h, 0.3));
        skyColor = mix(skyColor, zenithColor, pow(h, 0.7));

        // Add horizon glow boost
        float horizonGlow = exp(-h * 5.0);
        skyColor += glowColor * horizonGlow * 0.45;

        // Twinkling stars in high altitude sky
        if (h > 0.15) {
          vec2 starCoord = floor(dir.xz * 450.0);
          float starVal = hash(starCoord);
          if (starVal > 0.993) {
            float brightness = (starVal - 0.993) * 140.0 * smoothstep(0.15, 0.4, h);
            skyColor += vec3(0.8, 0.9, 1.0) * brightness;
          }
        }

        // Sun disc on horizon in front of starting grid
        vec3 sunDir = normalize(vec3(0.0, 0.12, 1.0));
        float sunDot = max(0.0, dot(dir, sunDir));
        if (sunDot > 0.9985) {
          skyColor += vec3(1.0, 0.35, 0.6) * 2.2;
        } else if (sunDot > 0.992) {
          float corona = (sunDot - 0.992) / (0.9985 - 0.992);
          skyColor += vec3(1.0, 0.2, 0.5) * pow(corona, 2.0) * 0.8;
        }

        gl_FragColor = vec4(skyColor, 1.0);
      }
    `;

    const skyGeo = new THREE.SphereGeometry(900, 32, 15);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: this.skyUniforms,
      vertexShader,
      fragmentShader,
      side: THREE.BackSide,
      depthWrite: false
    });

    const skyMesh = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(skyMesh);
  }

  setQuality(level = 'high') {
    this.quality = level;
    if (level === 'high') {
      this.renderer.shadowMap.enabled = true;
      this.sunLight.shadow.mapSize.set(2048, 2048);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    } else if (level === 'medium') {
      this.renderer.shadowMap.enabled = true;
      this.sunLight.shadow.mapSize.set(1024, 1024);
      this.renderer.setPixelRatio(1);
    } else {
      this.renderer.shadowMap.enabled = false;
      this.renderer.setPixelRatio(0.85);
    }
  }

  setAtmosphereTheme(trackId = 'city') {
    const themeMap = { city: 0, canyon: 1, arctic: 2, volcano: 3 };
    if (this.skyUniforms) {
      this.skyUniforms.uTheme.value = themeMap[trackId] !== undefined ? themeMap[trackId] : 0;
    }
    if (trackId === 'canyon') {
      this.hemiLight.color.setHex(0xcc7755);
      this.sunLight.color.setHex(0xffaa66);
    } else if (trackId === 'arctic') {
      this.hemiLight.color.setHex(0x88ccff);
      this.sunLight.color.setHex(0xeef8ff);
    } else if (trackId === 'volcano') {
      this.hemiLight.color.setHex(0xaa3322);
      this.sunLight.color.setHex(0xff5533);
    } else {
      this.hemiLight.color.setHex(0x4466aa);
      this.sunLight.color.setHex(0xfff5e6);
    }
  }

  render(camera) {
    if (camera) {
      this.sunLight.position.x = camera.position.x - 150;
      this.sunLight.position.z = camera.position.z + 150;
      this.renderer.render(this.scene, camera);
    }
  }
}
