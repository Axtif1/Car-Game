import * as THREE from 'three';
import { CAR_SPECS } from '../../../shared/constants.js';
import { SHADERS } from '../shaders/Shaders.js';

/**
 * Procedural AAA Vehicle Factory
 * Constructs Sports, Super, and Muscle car meshes complete with steerable wheels, working lights, neon underglow, and exhaust flames.
 */
export class CarBuilder {
  constructor(scene) {
    this.scene = scene;
  }

  createCar(category = 'sports', customization = {}) {
    const specs = CAR_SPECS[category] || CAR_SPECS.sports;
    const bodyColor = customization.bodyColor || '#ff2a2a';
    const rimColor = customization.rimColor || '#dcdcdc';
    const neonColor = customization.neonColor || '#00ffff';

    const rootGroup = new THREE.Group();
    rootGroup.name = `Car_${category}_${Math.random().toString(36).substring(2, 6)}`;

    // Chassis Container (raised slightly off ground)
    const chassis = new THREE.Group();
    chassis.position.y = 0.45;
    rootGroup.add(chassis);

    // Body material
    const paintMat = new THREE.MeshStandardMaterial({
      color: bodyColor,
      roughness: 0.2,
      metalness: 0.85
    });

    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x05070e,
      roughness: 0.1,
      metalness: 0.95
    });

    // Construct silhouette based on car category
    if (category === 'super') {
      // Sleek low hypercar wedge
      const lowerGeo = new THREE.BoxGeometry(specs.dimensions.width, 0.45, specs.dimensions.length);
      const lowerMesh = new THREE.Mesh(lowerGeo, paintMat);
      lowerMesh.position.y = 0.25;
      lowerMesh.castShadow = true;
      chassis.add(lowerMesh);

      const cabinGeo = new THREE.BoxGeometry(specs.dimensions.width * 0.75, 0.45, specs.dimensions.length * 0.48);
      const cabinMesh = new THREE.Mesh(cabinGeo, glassMat);
      cabinMesh.position.set(0, 0.65, -0.15);
      chassis.add(cabinMesh);

      // Aggressive spoiler wing
      const wingGeo = new THREE.BoxGeometry(specs.dimensions.width * 0.95, 0.08, 0.4);
      const wingMesh = new THREE.Mesh(wingGeo, paintMat);
      wingMesh.position.set(0, 0.8, -2.1);
      chassis.add(wingMesh);
    } else if (category === 'muscle') {
      // Wide muscular boxy hood
      const bodyGeo = new THREE.BoxGeometry(specs.dimensions.width, 0.65, specs.dimensions.length);
      const bodyMesh = new THREE.Mesh(bodyGeo, paintMat);
      bodyMesh.position.y = 0.35;
      bodyMesh.castShadow = true;
      chassis.add(bodyMesh);

      const cabinGeo = new THREE.BoxGeometry(specs.dimensions.width * 0.85, 0.5, specs.dimensions.length * 0.5);
      const cabinMesh = new THREE.Mesh(cabinGeo, glassMat);
      cabinMesh.position.set(0, 0.8, -0.2);
      chassis.add(cabinMesh);

      // Supercharger blower scoop
      const blowerGeo = new THREE.BoxGeometry(0.5, 0.25, 0.8);
      const blowerMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.95, roughness: 0.1 });
      const blowerMesh = new THREE.Mesh(blowerGeo, blowerMat);
      blowerMesh.position.set(0, 0.76, 1.2);
      chassis.add(blowerMesh);
    } else {
      // Classic Sports GT profile
      const bodyGeo = new THREE.BoxGeometry(specs.dimensions.width, 0.55, specs.dimensions.length);
      const bodyMesh = new THREE.Mesh(bodyGeo, paintMat);
      bodyMesh.position.y = 0.3;
      bodyMesh.castShadow = true;
      chassis.add(bodyMesh);

      const cabinGeo = new THREE.BoxGeometry(specs.dimensions.width * 0.8, 0.45, specs.dimensions.length * 0.5);
      const cabinMesh = new THREE.Mesh(cabinGeo, glassMat);
      cabinMesh.position.set(0, 0.72, -0.1);
      chassis.add(cabinMesh);
    }

    // Functional Vehicle Lights Setup
    const headlights = new THREE.Group();
    const hlMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const hlGeo = new THREE.BoxGeometry(0.35, 0.15, 0.1);
    const hlLeft = new THREE.Mesh(hlGeo, hlMat);
    hlLeft.position.set(-0.65, 0.35, specs.dimensions.length * 0.5);
    const hlRight = new THREE.Mesh(hlGeo, hlMat);
    hlRight.position.set(0.65, 0.35, specs.dimensions.length * 0.5);
    headlights.add(hlLeft, hlRight);
    chassis.add(headlights);

    // Brake Lights (Red)
    const brakeMat = new THREE.MeshStandardMaterial({ color: 0x440000, emissive: 0x550000, emissiveIntensity: 0.2 });
    const blGeo = new THREE.BoxGeometry(0.4, 0.15, 0.1);
    const blLeft = new THREE.Mesh(blGeo, brakeMat);
    blLeft.position.set(-0.65, 0.4, -specs.dimensions.length * 0.5);
    const blRight = new THREE.Mesh(blGeo, brakeMat);
    blRight.position.set(0.65, 0.4, -specs.dimensions.length * 0.5);
    chassis.add(blLeft, blRight);

    // Reverse Lights (White)
    const revMat = new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0x000000 });
    const rlLeft = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.1), revMat);
    rlLeft.position.set(-0.35, 0.35, -specs.dimensions.length * 0.5);
    const rlRight = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.1), revMat);
    rlRight.position.set(0.35, 0.35, -specs.dimensions.length * 0.5);
    chassis.add(rlLeft, rlRight);

    // Neon Underglow Plane
    const neonGeo = new THREE.PlaneGeometry(specs.dimensions.width * 1.3, specs.dimensions.length * 1.2);
    const neonMat = new THREE.ShaderMaterial({
      vertexShader: SHADERS.NeonUnderglow.vertexShader,
      fragmentShader: SHADERS.NeonUnderglow.fragmentShader,
      uniforms: {
        uColor: { value: new THREE.Color(neonColor) },
        uIntensity: { value: 1.5 }
      },
      transparent: true,
      side: THREE.DoubleSide
    });
    const neonPlane = new THREE.Mesh(neonGeo, neonMat);
    neonPlane.rotation.x = Math.PI / 2;
    neonPlane.position.y = 0.05;
    rootGroup.add(neonPlane);

    // Exhaust Pipe & Flame Mesh
    const flameMat = new THREE.ShaderMaterial({
      vertexShader: SHADERS.ExhaustFlame.vertexShader,
      fragmentShader: SHADERS.ExhaustFlame.fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0x00ffff) }
      },
      transparent: true,
      side: THREE.DoubleSide
    });
    const flameGeo = new THREE.ConeGeometry(0.18, 0.8, 8);
    const exhaustFlame = new THREE.Mesh(flameGeo, flameMat);
    exhaustFlame.rotation.x = -Math.PI / 2;
    exhaustFlame.position.set(0, 0.25, -specs.dimensions.length * 0.5 - 0.4);
    exhaustFlame.visible = false;
    chassis.add(exhaustFlame);

    // Wheels Construction (Front Steerable, Rear Drive)
    const wheels = [];
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
    const rimMaterial = new THREE.MeshStandardMaterial({ color: rimColor, metalness: 0.8, roughness: 0.3 });
    const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.35, 16);
    wheelGeo.rotateZ(Math.PI / 2);

    const wPos = [
      { x: -specs.dimensions.width * 0.5, y: 0.4, z: specs.dimensions.length * 0.35, front: true },
      { x: specs.dimensions.width * 0.5, y: 0.4, z: specs.dimensions.length * 0.35, front: true },
      { x: -specs.dimensions.width * 0.5, y: 0.4, z: -specs.dimensions.length * 0.35, front: false },
      { x: specs.dimensions.width * 0.5, y: 0.4, z: -specs.dimensions.length * 0.35, front: false }
    ];

    wPos.forEach(pos => {
      const wGroup = new THREE.Group();
      wGroup.position.set(pos.x, pos.y, pos.z);

      const tire = new THREE.Mesh(wheelGeo, wheelMat);
      tire.castShadow = true;
      wGroup.add(tire);

      // Rim cylinder
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.37, 8), rimMaterial);
      rim.rotation.z = Math.PI / 2;
      wGroup.add(rim);

      rootGroup.add(wGroup);
      wheels.push({ group: wGroup, isFront: pos.front });
    });

    this.scene.add(rootGroup);

    return {
      root: rootGroup,
      chassis,
      wheels,
      brakeLights: [blLeft, blRight],
      brakeMat,
      reverseLights: [rlLeft, rlRight],
      revMat,
      exhaustFlame,
      flameMat,
      category,
      customization
    };
  }
}
