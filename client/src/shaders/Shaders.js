import * as THREE from 'three';

/**
 * Custom Shaders for AAA Vehicle Visuals
 */
export const SHADERS = {
  // Animated Exhaust Flame Shader
  ExhaustFlame: {
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor;
      varying vec2 vUv;

      void main() {
        float flame = pow(1.0 - vUv.y, 2.0);
        float flicker = sin(uTime * 35.0 + vUv.y * 12.0) * 0.2 + 0.8;
        vec3 core = mix(vec3(1.0, 0.9, 0.2), uColor, vUv.y);
        float alpha = flame * flicker * (vUv.y < 0.95 ? 1.0 : 0.0);
        gl_FragColor = vec4(core, alpha);
      }
    `
  },

  // Neon Underglow Hologram Shader
  NeonUnderglow: {
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uIntensity;
      varying vec2 vUv;

      void main() {
        // Center fade rectangle for realistic ground neon reflection
        float distFromCenter = distance(vUv, vec2(0.5, 0.5)) * 2.0;
        float glow = pow(max(0.0, 1.0 - distFromCenter), 1.8) * uIntensity;
        gl_FragColor = vec4(uColor, glow * 0.85);
      }
    `
  }
};
