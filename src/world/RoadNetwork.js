import * as THREE from 'three';

/**
 * GTA VI Road & Traffic Navigation Network
 * Manages city avenues, highway overpasses, beach boulevards, and AI waypoints
 */
export class RoadNetwork {
  constructor(scene) {
    this.scene = scene;
    this.roads = [];
    this.intersections = [];
    this.waypoints = [];
    this.pedestrianPaths = [];

    // Canvas textures for high-detail asphalt markings
    this.roadTexture = this.generateAsphaltTexture();
  }

  generateAsphaltTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Dark asphalt base with noise
    ctx.fillStyle = '#232529';
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 20000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const gray = Math.floor(25 + Math.random() * 20);
      ctx.fillStyle = `rgb(${gray},${gray},${gray})`;
      ctx.fillRect(x, y, 1, 1);
    }

    // Outer solid white road edge lines
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(32, 0);
    ctx.lineTo(32, 512);
    ctx.moveTo(480, 0);
    ctx.lineTo(480, 512);
    ctx.stroke();

    // Center double solid yellow lines
    ctx.strokeStyle = '#f5b041';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(250, 0);
    ctx.lineTo(250, 512);
    ctx.moveTo(262, 0);
    ctx.lineTo(262, 512);
    ctx.stroke();

    // White dashed lane dividers
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 5;
    ctx.setLineDash([28, 28]);
    ctx.beginPath();
    ctx.moveTo(140, 0);
    ctx.lineTo(140, 512);
    ctx.moveTo(372, 0);
    ctx.lineTo(372, 512);
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  createRoadSegment(startX, startZ, endX, endZ, width = 16) {
    const length = Math.hypot(endX - startX, endZ - startZ);
    const angle = Math.atan2(endX - startX, endZ - startZ);

    const geo = new THREE.PlaneGeometry(width, length);
    geo.rotateX(-Math.PI / 2);

    const tex = this.roadTexture.clone();
    tex.repeat.set(1, Math.max(1, length / 16));

    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.85,
      metalness: 0.1
    });

    const mesh = new THREE.Mesh(geo, mat);
    const midX = (startX + endX) / 2;
    const midZ = (startZ + endZ) / 2;
    mesh.position.set(midX, 0.02, midZ);
    mesh.rotation.y = angle;
    mesh.receiveShadow = true;

    this.scene.add(mesh);

    const road = {
      startX, startZ, endX, endZ, width, length, angle,
      leftLaneStart: new THREE.Vector3(startX - 4 * Math.cos(angle), 0, startZ + 4 * Math.sin(angle)),
      rightLaneStart: new THREE.Vector3(startX + 4 * Math.cos(angle), 0, startZ - 4 * Math.sin(angle))
    };
    this.roads.push(road);

    // Add traffic waypoints for AI navigation
    const steps = Math.floor(length / 25);
    for (let i = 0; i <= steps; i++) {
      const t = i / Math.max(1, steps);
      const currX = THREE.MathUtils.lerp(startX, endX, t);
      const currZ = THREE.MathUtils.lerp(startZ, endZ, t);

      // Lane 1 (Forward, right side)
      const l1X = currX + Math.cos(angle) * 4;
      const l1Z = currZ - Math.sin(angle) * 4;
      this.waypoints.push({ x: l1X, z: l1Z, angle: angle, lane: 1 });

      // Lane 2 (Backward, left side)
      const l2X = currX - Math.cos(angle) * 4;
      const l2Z = currZ + Math.sin(angle) * 4;
      this.waypoints.push({ x: l2X, z: l2Z, angle: angle + Math.PI, lane: 2 });
    }

    return mesh;
  }

  createIntersection(x, z, size = 18) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#232529';
    ctx.fillRect(0, 0, 256, 256);

    // Crosswalk zebra stripes on all 4 edges
    ctx.fillStyle = '#f0f0f0';
    for (let i = 24; i < 232; i += 28) {
      ctx.fillRect(i, 4, 18, 20); // Top
      ctx.fillRect(i, 232, 18, 20); // Bottom
      ctx.fillRect(4, i, 20, 18); // Left
      ctx.fillRect(232, i, 20, 18); // Right
    }

    const tex = new THREE.CanvasTexture(canvas);
    const geo = new THREE.PlaneGeometry(size, size);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 0.025, z);
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    this.intersections.push({ x, z, size });
    return mesh;
  }

  getClosestWaypoint(x, z, targetAngle = null) {
    let bestWp = null;
    let minDist = Infinity;

    for (let i = 0; i < this.waypoints.length; i++) {
      const wp = this.waypoints[i];
      const dist = Math.hypot(wp.x - x, wp.z - z);
      if (dist < minDist) {
        if (targetAngle !== null) {
          // Check if direction is reasonably aligned
          const angleDiff = Math.abs(THREE.MathUtils.clamp((wp.angle - targetAngle + Math.PI) % (Math.PI * 2) - Math.PI, -Math.PI, Math.PI));
          if (angleDiff > Math.PI * 0.6) continue;
        }
        minDist = dist;
        bestWp = wp;
      }
    }
    return bestWp;
  }
}
