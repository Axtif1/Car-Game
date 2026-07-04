import * as THREE from 'three';
import { TRACK_CHECKPOINTS, STARTING_GRID_POSITIONS, registerTrackCurvePoints } from '../../../shared/constants.js';

/**
 * AAA Procedural City Map Generator
 * Constructs curved asphalt roads, elevation changes, tunnels, bridges, glowing skyscrapers, street lights, and checkpoint arches.
 */
export class MapGenerator {
  constructor(scene) {
    this.scene = scene;
    this.checkpointsGroup = new THREE.Group();
    this.mapGroup = new THREE.Group();
    this.scene.add(this.mapGroup);
    this.scene.add(this.checkpointsGroup);

    this.checkpointMeshes = [];
  }

  generate(trackId = 'city') {
    console.log(`🏗️ [MapGenerator] Generating Procedural AAA Map for Track: ${trackId}`);
    this.trackId = trackId;

    // Clear existing map children when switching tracks
    while (this.mapGroup.children.length > 0) {
      this.mapGroup.remove(this.mapGroup.children[0]);
    }
    while (this.checkpointsGroup.children.length > 0) {
      this.checkpointsGroup.remove(this.checkpointsGroup.children[0]);
    }
    this.checkpointMeshes = [];

    this.buildTrackRoads(trackId);
    this.buildGroundPlane(trackId);

    if (trackId === 'canyon') {
      this.buildCanyonEnvironment();
    } else if (trackId === 'arctic') {
      this.buildArcticEnvironment();
    } else if (trackId === 'volcano') {
      this.buildVolcanoEnvironment();
    } else {
      this.buildSkyscrapersAndBuildings();
      this.buildStreetLightsAndTrees();
      this.buildTunnelsAndBridges();
    }

    this.buildCheckpointsAndGrid();
    this.buildGarageShowroom();
  }

  buildGroundPlane(trackId = 'city') {
    const center = this.getTrackCenter();
    const colors = { city: 0x0c0e18, canyon: 0x1a0f0d, arctic: 0xd6eaf8, volcano: 0x0c0a0a };
    const gridColors = { city: 0x00ffff, canyon: 0xff6600, arctic: 0x00ffff, volcano: 0xff2a2a };

    const groundGeo = new THREE.PlaneGeometry(3500, 3500, 32, 32);
    const groundMat = new THREE.MeshStandardMaterial({
      color: colors[trackId] || colors.city,
      roughness: trackId === 'arctic' ? 0.3 : 0.95,
      metalness: trackId === 'arctic' ? 0.6 : 0.05
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(center.x, -0.1, center.z);
    ground.receiveShadow = true;
    this.mapGroup.add(ground);

    const gridHelper = new THREE.GridHelper(2400, 120, gridColors[trackId] || 0x00ffff, 0x1a233a);
    gridHelper.position.set(center.x, 0.02, center.z);
    this.mapGroup.add(gridHelper);
  }

  buildTrackRoads(trackId = 'city') {
    const points = TRACK_CHECKPOINTS.map(cp => new THREE.Vector3(cp.pos.x, cp.pos.y, cp.pos.z));
    this.trackCurve = new THREE.CatmullRomCurve3(points, true, 'catmullrom', 0.25);
    this.trackSamplePoints = this.trackCurve.getPoints(200);

    const roadColors = { city: 0x181a24, canyon: 0x2c1814, arctic: 0xc8e0f0, volcano: 0x141111 };
    const roadRoughness = { city: 0.55, canyon: 0.85, arctic: 0.18, volcano: 0.6 };

    const roadMat = new THREE.MeshStandardMaterial({
      color: roadColors[trackId] || roadColors.city,
      roughness: roadRoughness[trackId] || 0.55,
      metalness: trackId === 'arctic' ? 0.75 : 0.15,
      side: THREE.DoubleSide
    });

    const guardRailColors = { city: 0x99aabb, canyon: 0xcc6633, arctic: 0x88ccff, volcano: 0xff3300 };
    const guardRailMat = new THREE.MeshStandardMaterial({
      color: guardRailColors[trackId] || guardRailColors.city,
      roughness: 0.3,
      metalness: 0.85
    });

    // Generate tubular ribbon geometry along curve
    const pointsCount = 400;
    const curvePoints = this.trackCurve.getPoints(pointsCount);
    registerTrackCurvePoints(curvePoints);

    const roadGroup = new THREE.Group();
    const roadWidth = 22; // 22 meters wide

    for (let i = 0; i < curvePoints.length; i++) {
      const p1 = curvePoints[i];
      const p2 = curvePoints[(i + 1) % curvePoints.length];
      
      const forward = new THREE.Vector3().subVectors(p2, p1).normalize();
      const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

      const leftEdge1 = p1.clone().add(right.clone().multiplyScalar(-roadWidth * 0.5));
      const rightEdge1 = p1.clone().add(right.clone().multiplyScalar(roadWidth * 0.5));
      const leftEdge2 = p2.clone().add(right.clone().multiplyScalar(-roadWidth * 0.5));
      const rightEdge2 = p2.clone().add(right.clone().multiplyScalar(roadWidth * 0.5));

      // Road Segment geometry
      const vertices = new Float32Array([
        leftEdge1.x, leftEdge1.y, leftEdge1.z,
        rightEdge1.x, rightEdge1.y, rightEdge1.z,
        leftEdge2.x, leftEdge2.y, leftEdge2.z,

        rightEdge1.x, rightEdge1.y, rightEdge1.z,
        rightEdge2.x, rightEdge2.y, rightEdge2.z,
        leftEdge2.x, leftEdge2.y, leftEdge2.z,
      ]);

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      geo.computeVertexNormals();

      const mesh = new THREE.Mesh(geo, roadMat);
      mesh.receiveShadow = true;
      roadGroup.add(mesh);

      // Continuous Guard Rails along track boundary
      if (i % 2 === 0) {
        const railGeo = new THREE.BoxGeometry(0.5, 1.4, 6.5);
        const leftRail = new THREE.Mesh(railGeo, guardRailMat);
        leftRail.position.copy(leftEdge1).add(new THREE.Vector3(0, 0.7, 0));
        leftRail.lookAt(leftEdge2.clone().add(new THREE.Vector3(0, 0.7, 0)));
        leftRail.castShadow = true;
        roadGroup.add(leftRail);

        const rightRail = new THREE.Mesh(railGeo, guardRailMat);
        rightRail.position.copy(rightEdge1).add(new THREE.Vector3(0, 0.7, 0));
        rightRail.lookAt(rightEdge2.clone().add(new THREE.Vector3(0, 0.7, 0)));
        rightRail.castShadow = true;
        roadGroup.add(rightRail);
      }

      // Add glowing curb barriers every few segments
      if (i % 4 === 0) {
        const curbGeo = new THREE.BoxGeometry(0.9, 0.4, 5);
        const curbMat = new THREE.MeshBasicMaterial({ color: (i % 8 === 0) ? 0x00ffff : 0xff2a2a });
        
        const leftCurb = new THREE.Mesh(curbGeo, curbMat);
        leftCurb.position.copy(leftEdge1).add(right.clone().multiplyScalar(0.6)).add(new THREE.Vector3(0, 0.2, 0));
        leftCurb.lookAt(leftEdge2);
        roadGroup.add(leftCurb);

        const rightCurb = new THREE.Mesh(curbGeo, curbMat);
        rightCurb.position.copy(rightEdge1).add(right.clone().multiplyScalar(-0.6)).add(new THREE.Vector3(0, 0.2, 0));
        rightCurb.lookAt(rightEdge2);
        roadGroup.add(rightCurb);
      }
    }
    this.mapGroup.add(roadGroup);
  }

  isNearTrack(x, z, minClearance = 28) {
    if (!this.trackSamplePoints) return false;
    for (const pt of this.trackSamplePoints) {
      const dx = x - pt.x;
      const dz = z - pt.z;
      if (dx * dx + dz * dz < minClearance * minClearance) {
        return true;
      }
    }
    return false;
  }

  getTrackCenter() {
    if (!this.trackSamplePoints || this.trackSamplePoints.length === 0) {
      return { x: 0, z: -120 };
    }
    let sumX = 0, sumZ = 0;
    for (const pt of this.trackSamplePoints) {
      sumX += pt.x;
      sumZ += pt.z;
    }
    return {
      x: sumX / this.trackSamplePoints.length,
      z: sumZ / this.trackSamplePoints.length
    };
  }

  buildSkyscrapersAndBuildings() {
    const buildingCount = 110;
    const buildingGroup = new THREE.Group();

    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    let spawned = 0;
    let attempts = 0;

    const center = this.getTrackCenter();
    while (spawned < buildingCount && attempts < 800) {
      attempts++;
      const width = 18 + Math.random() * 25;
      const length = 18 + Math.random() * 25;
      const height = 40 + Math.random() * 160;

      const angle = Math.random() * Math.PI * 2;
      const radius = 60 + Math.random() * 320;
      const x = center.x + Math.cos(angle) * radius;
      const z = center.z + Math.sin(angle) * radius;

      // Ensure building is strictly outside the racing corridor with large safety buffer
      if (this.isNearTrack(x, z, 45 + Math.max(width, length) * 0.65)) {
        continue;
      }

      spawned++;
      const mat = new THREE.MeshStandardMaterial({
        color: 0x111524,
        roughness: 0.3,
        metalness: 0.8,
        emissive: Math.random() < 0.4 ? 0x005577 : 0x000000,
        emissiveIntensity: 0.4
      });

      const mesh = new THREE.Mesh(boxGeo, mat);
      mesh.position.set(x, height * 0.5, z);
      mesh.scale.set(width, height, length);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      buildingGroup.add(mesh);

      // Neon rooftop or window accent
      if (Math.random() < 0.5) {
        const stripGeo = new THREE.BoxGeometry(width * 1.02, 1.5, length * 1.02);
        const stripMat = new THREE.MeshBasicMaterial({
          color: Math.random() < 0.5 ? 0x00ffff : 0xff0055
        });
        const strip = new THREE.Mesh(stripGeo, stripMat);
        strip.position.set(x, height + 0.75, z);
        buildingGroup.add(strip);
      }
    }
    this.mapGroup.add(buildingGroup);
  }

  buildStreetLightsAndTrees() {
    const propsGroup = new THREE.Group();
    const curvePoints = this.trackCurve.getPoints(80);

    const poleGeo = new THREE.CylinderGeometry(0.2, 0.25, 8);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
    const lampGeo = new THREE.SphereGeometry(0.6, 12, 12);
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xffeaad });

    for (let i = 0; i < curvePoints.length; i += 3) {
      const p = curvePoints[i];
      const nextP = curvePoints[(i + 1) % curvePoints.length];
      const forward = new THREE.Vector3().subVectors(nextP, p).normalize();
      const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

      // Place light post safely outside left guard rail (14.5 meters out)
      const lampPos = p.clone().add(right.clone().multiplyScalar(-14.5));
      lampPos.y += 4;

      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.copy(lampPos);
      propsGroup.add(pole);

      const lamp = new THREE.Mesh(lampGeo, lampMat);
      lamp.position.copy(lampPos).add(new THREE.Vector3(0, 4, 0));
      propsGroup.add(lamp);

      // Trees safely outside right guard rail (16 meters out)
      if (i % 6 === 0) {
        const treePos = p.clone().add(right.clone().multiplyScalar(16));
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 3), new THREE.MeshStandardMaterial({ color: 0x3e2723 }));
        trunk.position.copy(treePos).add(new THREE.Vector3(0, 1.5, 0));
        propsGroup.add(trunk);

        const foliage = new THREE.Mesh(new THREE.ConeGeometry(3.5, 7, 8), new THREE.MeshStandardMaterial({ color: 0x1b5e20, roughness: 0.8 }));
        foliage.position.copy(treePos).add(new THREE.Vector3(0, 5, 0));
        foliage.castShadow = true;
        propsGroup.add(foliage);
      }
    }
    this.mapGroup.add(propsGroup);
  }

  buildTunnelsAndBridges() {
    // Tunnel at Checkpoint 4 elevated section
    const cp4 = TRACK_CHECKPOINTS[4];
    const tunnelGeo = new THREE.CylinderGeometry(15, 15, 80, 16, 1, true, 0, Math.PI);
    const tunnelMat = new THREE.MeshStandardMaterial({ color: 0x161925, side: THREE.DoubleSide });
    const tunnel = new THREE.Mesh(tunnelGeo, tunnelMat);
    tunnel.position.set(cp4.pos.x, cp4.pos.y, cp4.pos.z);
    tunnel.rotation.y = Math.PI / 2;
    tunnel.rotation.z = Math.PI;
    this.mapGroup.add(tunnel);

    // Neon rings inside tunnel
    for (let offset = -30; offset <= 30; offset += 15) {
      const ringGeo = new THREE.TorusGeometry(14.5, 0.3, 8, 32, Math.PI);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(cp4.pos.x, cp4.pos.y, cp4.pos.z + offset);
      this.mapGroup.add(ring);
    }
  }

  buildCheckpointsAndGrid() {
    // Starting Grid Banner Arch
    const cp0 = TRACK_CHECKPOINTS[0];
    if (cp0) {
      const gridArchGeo = new THREE.BoxGeometry(cp0.width || 26, 2, 2);
      const gridArchMat = new THREE.MeshBasicMaterial({ color: 0xffbd00 });
      const gridArch = new THREE.Mesh(gridArchGeo, gridArchMat);
      gridArch.position.set(cp0.pos.x, cp0.pos.y + 8, cp0.pos.z);
      if (cp0.dir.x !== 0 || cp0.dir.z !== 0) {
        const target = new THREE.Vector3(cp0.pos.x + cp0.dir.x * 10, cp0.pos.y + 8, cp0.pos.z + cp0.dir.z * 10);
        gridArch.lookAt(target);
      }
      this.checkpointsGroup.add(gridArch);
    }

    // Checkpoint arches
    TRACK_CHECKPOINTS.forEach((cp, idx) => {
      const group = new THREE.Group();
      group.position.set(cp.pos.x, cp.pos.y, cp.pos.z);

      // Arch top
      const archMat = new THREE.MeshBasicMaterial({
        color: idx === 0 ? 0xffbd00 : 0x00ffff,
        transparent: true,
        opacity: 0.75
      });
      const topBeam = new THREE.Mesh(new THREE.BoxGeometry(cp.width, 1.2, 1.2), archMat);
      topBeam.position.y = 7.5;
      group.add(topBeam);

      const leftPillar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 7.5, 1.2), archMat);
      leftPillar.position.set(-cp.width * 0.5, 3.75, 0);
      group.add(leftPillar);

      const rightPillar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 7.5, 1.2), archMat);
      rightPillar.position.set(cp.width * 0.5, 3.75, 0);
      group.add(rightPillar);

      // Look direction
      if (cp.dir.x !== 0 || cp.dir.z !== 0) {
        const target = new THREE.Vector3(cp.pos.x + cp.dir.x * 10, cp.pos.y, cp.pos.z + cp.dir.z * 10);
        group.lookAt(target);
      }

      this.checkpointsGroup.add(group);
      this.checkpointMeshes.push({ idx, group, mat: archMat });
    });
  }

  highlightCheckpoint(index) {
    this.checkpointMeshes.forEach(cp => {
      if (cp.idx === index) {
        cp.mat.color.setHex(0x00ff88);
        cp.mat.opacity = 1.0;
      } else if (cp.idx === 0) {
        cp.mat.color.setHex(0xffbd00);
        cp.mat.opacity = 0.6;
      } else {
        cp.mat.color.setHex(0x00ffff);
        cp.mat.opacity = 0.4;
      }
    });
  }

  buildGarageShowroom() {
    const showroomGroup = new THREE.Group();
    showroomGroup.position.set(-800, 20, -800);

    // Bright Studio Ambient Light specifically for Showroom
    const showroomAmbient = new THREE.AmbientLight(0xffffff, 2.2);
    showroomGroup.add(showroomAmbient);

    // Main Metallic Showroom Turntable Pedestal (Brighter Titanium Alloy finish)
    const pedestalGeo = new THREE.CylinderGeometry(8.8, 9.6, 0.5, 64);
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0x242f48,
      roughness: 0.15,
      metalness: 0.85
    });
    const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestal.position.y = 0.25;
    pedestal.receiveShadow = true;
    showroomGroup.add(pedestal);

    // Inner Glowing Cyan Ring
    const innerRingGeo = new THREE.TorusGeometry(6.5, 0.12, 16, 64);
    const innerRingMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
    innerRing.rotation.x = Math.PI / 2;
    innerRing.position.y = 0.51;
    showroomGroup.add(innerRing);

    // Outer Glowing Gold / Bright Neon Ring
    const outerRingGeo = new THREE.TorusGeometry(8.8, 0.2, 16, 64);
    const outerRingMat = new THREE.MeshBasicMaterial({ color: 0xffbd00 });
    const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
    outerRing.rotation.x = Math.PI / 2;
    outerRing.position.y = 0.51;
    showroomGroup.add(outerRing);

    // Studio High-Tech Floor (Brighter Slate Grey Metallic)
    const floorGeo = new THREE.PlaneGeometry(90, 90);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x141d30,
      roughness: 0.45,
      metalness: 0.5
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    showroomGroup.add(floor);

    // Primary Overhead Showroom Spotlight pointing down at car
    const spotLight = new THREE.SpotLight(0xffffff, 6.0);
    spotLight.position.set(0, 30, 0);
    spotLight.target.position.set(0, 0, 0);
    spotLight.angle = Math.PI / 3;
    spotLight.penumbra = 0.4;
    showroomGroup.add(spotLight);
    showroomGroup.add(spotLight.target);

    // Front Key Light (Bright daylight studio bulb)
    const frontKeyLight = new THREE.DirectionalLight(0xffffff, 3.0);
    frontKeyLight.position.set(25, 20, 25);
    showroomGroup.add(frontKeyLight);

    // Rear Key Light (Bright cool studio bulb)
    const rearKeyLight = new THREE.DirectionalLight(0xeef5ff, 2.5);
    rearKeyLight.position.set(-25, 20, -25);
    showroomGroup.add(rearKeyLight);

    // 4 Perimeter Point Lights for Full 360 Brightness
    const frontPoint = new THREE.PointLight(0xffffff, 4, 60);
    frontPoint.position.set(0, 8, 16);
    showroomGroup.add(frontPoint);

    const cyanPoint = new THREE.PointLight(0x00ffff, 3.5, 50);
    cyanPoint.position.set(-16, 7, 0);
    showroomGroup.add(cyanPoint);

    const goldPoint = new THREE.PointLight(0xffbd00, 3.5, 50);
    goldPoint.position.set(16, 7, 0);
    showroomGroup.add(goldPoint);

    const backPoint = new THREE.PointLight(0xffffff, 3.5, 60);
    backPoint.position.set(0, 8, -16);
    showroomGroup.add(backPoint);

    this.scene.add(showroomGroup);
  }

  buildCanyonEnvironment() {
    const center = this.getTrackCenter();
    const mesaMat = new THREE.MeshStandardMaterial({ color: 0x8c3a22, roughness: 0.9 });
    const obeliskMat = new THREE.MeshBasicMaterial({ color: 0xffbd00 });

    let spawned = 0;
    let attempts = 0;
    while (spawned < 55 && attempts < 600) {
      attempts++;
      const h = Math.random() * 80 + 40;
      const r = Math.random() * 25 + 15;
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 450 + 65;
      const x = center.x + Math.cos(angle) * dist;
      const z = center.z + Math.sin(angle) * dist;

      // Strictly ensure clearance from track corridor so road is 100% clean
      if (this.isNearTrack(x, z, 40 + r)) {
        continue;
      }

      spawned++;
      const mesa = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.7, r, h, 8), mesaMat);
      mesa.position.set(x, h * 0.5, z);
      mesa.castShadow = true;
      this.mapGroup.add(mesa);

      if (spawned % 3 === 0) {
        const ox = x + 18;
        const oz = z + 18;
        if (!this.isNearTrack(ox, oz, 35)) {
          const obelisk = new THREE.Mesh(new THREE.BoxGeometry(4, 35, 4), obeliskMat);
          obelisk.position.set(ox, 17.5, oz);
          this.mapGroup.add(obelisk);
        }
      }
    }
  }

  buildArcticEnvironment() {
    const center = this.getTrackCenter();
    const iceMat = new THREE.MeshStandardMaterial({ color: 0x80d0ff, roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.85 });
    const crystalMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });

    let spawned = 0;
    let attempts = 0;
    while (spawned < 60 && attempts < 600) {
      attempts++;
      const h = Math.random() * 60 + 25;
      const r = Math.random() * 20 + 12;
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 480 + 55;
      const x = center.x + Math.cos(angle) * dist;
      const z = center.z + Math.sin(angle) * dist;

      // Strictly ensure clearance from track corridor
      if (this.isNearTrack(x, z, 38 + r)) {
        continue;
      }

      spawned++;
      const glacier = new THREE.Mesh(new THREE.ConeGeometry(r, h, 5), iceMat);
      glacier.position.set(x, h * 0.5, z);
      this.mapGroup.add(glacier);

      if (spawned % 2 === 0) {
        const cx = x + 15;
        const cz = z + 15;
        if (!this.isNearTrack(cx, cz, 34)) {
          const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(6, 0), crystalMat);
          crystal.position.set(cx, 12, cz);
          this.mapGroup.add(crystal);
        }
      }
    }
  }

  buildVolcanoEnvironment() {
    const center = this.getTrackCenter();
    const basaltMat = new THREE.MeshStandardMaterial({ color: 0x1a1515, roughness: 0.95 });
    const lavaMat = new THREE.MeshBasicMaterial({ color: 0xff2a00 });
    const hazardMat = new THREE.MeshBasicMaterial({ color: 0xffbd00 });

    // Rivers of magma centered under the track loop
    const lavaPlane = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600), lavaMat);
    lavaPlane.rotation.x = -Math.PI / 2;
    lavaPlane.position.set(center.x, -2, center.z);
    this.mapGroup.add(lavaPlane);

    let spawned = 0;
    let attempts = 0;
    while (spawned < 50 && attempts < 600) {
      attempts++;
      const h = Math.random() * 90 + 35;
      const r = 16;
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 450 + 65;
      const x = center.x + Math.cos(angle) * dist;
      const z = center.z + Math.sin(angle) * dist;

      // Strictly ensure clearance from track corridor
      if (this.isNearTrack(x, z, 40 + r)) {
        continue;
      }

      spawned++;
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(12, r, h, 12), basaltMat);
      tower.position.set(x, h * 0.5, z);
      this.mapGroup.add(tower);

      if (spawned % 3 === 0) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(14, 0.8, 8, 24), hazardMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.set(x, h * 0.6, z);
        this.mapGroup.add(ring);
      }
    }
  }
}
