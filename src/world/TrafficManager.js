import * as THREE from 'three';
import { Vehicle } from '../entities/Vehicle.js';
import { Pedestrian } from '../entities/Pedestrian.js';
import { clamp } from '../utils/MathUtils.js';

export class TrafficManager {
  constructor(scene, soundSystem, roadNetwork, physicsWorld) {
    this.scene = scene;
    this.sounds = soundSystem;
    this.roads = roadNetwork;
    this.physics = physicsWorld;

    this.vehicles = [];
    this.pedestrians = [];
    this.maxVehicles = 16;
    this.maxPedestrians = 32;

    // Defined 2-way traffic lanes across both North-South Avenues and East-West Streets
    this.laneRoutes = [
      // North-South Avenues
      { x: 124, zMin: -350, zMax: 350, rot: 0, isEW: false },          // Ocean Drive Northbound
      { x: 116, zMin: -350, zMax: 350, rot: Math.PI, isEW: false },    // Ocean Drive Southbound
      { x: 44, zMin: -350, zMax: 350, rot: 0, isEW: false },           // Collins Ave Northbound
      { x: 36, zMin: -350, zMax: 350, rot: Math.PI, isEW: false },     // Collins Ave Southbound
      { x: -36, zMin: -350, zMax: 350, rot: 0, isEW: false },          // Downtown Ave Northbound
      { x: -44, zMin: -350, zMax: 350, rot: Math.PI, isEW: false },    // Downtown Ave Southbound
      { x: -136, zMin: -350, zMax: 350, rot: 0, isEW: false },         // West Way Northbound
      { x: -144, zMin: -350, zMax: 350, rot: Math.PI, isEW: false },   // West Way Southbound

      // East-West Cross Streets (Distributes traffic throughout the entire city grid)
      { z: -130, xMin: -140, xMax: 120, rot: Math.PI / 2, isEW: true },  // 10th Street Eastbound
      { z: -122, xMin: -140, xMax: 120, rot: -Math.PI / 2, isEW: true }, // 10th Street Westbound
      { z: 0, xMin: -140, xMax: 120, rot: Math.PI / 2, isEW: true },     // 5th Street Eastbound
      { z: 8, xMin: -140, xMax: 120, rot: -Math.PI / 2, isEW: true },    // 5th Street Westbound
      { z: 130, xMin: -140, xMax: 120, rot: Math.PI / 2, isEW: true },   // South Beach Way Eastbound
      { z: 138, xMin: -140, xMax: 120, rot: -Math.PI / 2, isEW: true }   // South Beach Way Westbound
    ];

    // Sidewalk pedestrian corridors (safe sidewalks along hotels, promenade and beach)
    this.sidewalkZones = [
      140, // Ocean Drive Beach Promenade
      145, // Beach Boardwalk
      106, // Hotel Front Sidewalk
      54,  // Collins East Sidewalk
      26,  // Collins West Sidewalk
      -26  // Downtown Plaza Sidewalk
    ];
  }

  init() {
    this.spawnInitialVehicles();
    this.spawnInitialPedestrians();
  }

  spawnInitialVehicles() {
    const types = ['supercar', 'muscle', 'suv'];

    for (let i = 0; i < this.maxVehicles; i++) {
      const type = types[i % types.length];
      const veh = new Vehicle(this.scene, this.sounds, type);
      const lane = this.laneRoutes[i % this.laneRoutes.length];

      let spawnX, spawnZ;
      if (lane.isEW) {
        spawnX = lane.xMin + ((i % 4) * ((lane.xMax - lane.xMin) / 4)) + (Math.random() - 0.5) * 15;
        spawnZ = lane.z;
      } else {
        spawnX = lane.x;
        spawnZ = -300 + (i * (600 / this.maxVehicles)) + (Math.random() - 0.5) * 20;
      }

      veh.physics.reset(spawnX, 0.5, spawnZ, lane.rot);
      this.vehicles.push(veh);
    }
  }

  spawnInitialPedestrians() {
    for (let i = 0; i < this.maxPedestrians; i++) {
      const sidewalkX = this.sidewalkZones[i % this.sidewalkZones.length];
      const z = -320 + (i * (640 / this.maxPedestrians)) + (Math.random() - 0.5) * 15;
      const ped = new Pedestrian(this.scene, this.sounds, sidewalkX, z);
      this.pedestrians.push(ped);
    }
  }

  update(dt, player, policeUnits = []) {
    // 1. Update Civilian AI Vehicles (Traffic Following Rules & Anti-Bumping)
    for (let i = 0; i < this.vehicles.length; i++) {
      const v = this.vehicles[i];
      if (v === player.currentVehicle) {
        v.update(dt, (x, z) => this.physics.getHeightAt(x, z));
        continue;
      }

      const distToPlayer = v.physics.position.distanceTo(player.position);

      // Distributed traffic recycling: respawn across diverse streets without clumping
      if (distToPlayer > 180 && !v.isDestroyed) {
        let spawned = false;
        // Try up to 5 random lanes to find a clean, non-crowded spawn location
        for (let attempt = 0; attempt < 5; attempt++) {
          const lane = this.laneRoutes[Math.floor(Math.random() * this.laneRoutes.length)];
          let candX, candZ;

          if (lane.isEW) {
            const xOffset = (Math.random() - 0.5) * 200;
            candX = clamp(player.position.x + xOffset, lane.xMin + 10, lane.xMax - 10);
            candZ = lane.z;
          } else {
            const zOffset = (lane.rot === 0 ? -1 : 1) * (65 + Math.random() * 85);
            candX = lane.x;
            candZ = clamp(player.position.z + zOffset, lane.zMin + 10, lane.zMax - 10);
          }

          // Check that no other car is within 22m of this spawn point
          let isClear = true;
          for (let c = 0; c < this.vehicles.length; c++) {
            if (this.vehicles[c].physics.position.distanceTo(new THREE.Vector3(candX, 0.5, candZ)) < 22) {
              isClear = false;
              break;
            }
          }

          if (isClear) {
            v.physics.reset(candX, 0.5, candZ, lane.rot);
            spawned = true;
            break;
          }
        }
      }

      if (!v.isDestroyed) {
        const fwd = v.physics.forward;
        let obstacleAheadDist = Infinity;

        // Long-range sensor (up to 28m) to detect vehicles ahead in lane
        for (let j = 0; j < this.vehicles.length; j++) {
          if (i === j) continue;
          const other = this.vehicles[j];
          const toOther = other.physics.position.clone().sub(v.physics.position);
          const fwdDist = toOther.dot(fwd);
          const lateralDist = Math.abs(toOther.x * fwd.z - toOther.z * fwd.x);

          if (fwdDist > 0 && fwdDist < 28.0 && lateralDist < 3.2) {
            if (fwdDist < obstacleAheadDist) obstacleAheadDist = fwdDist;
          }
        }

        // Detect player vehicle or player on foot ahead
        const toPlayer = player.position.clone().sub(v.physics.position);
        const playerFwdDist = toPlayer.dot(fwd);
        const playerLatDist = Math.abs(toPlayer.x * fwd.z - toPlayer.z * fwd.x);
        if (playerFwdDist > 0 && playerFwdDist < 28.0 && playerLatDist < 3.5) {
          if (playerFwdDist < obstacleAheadDist) obstacleAheadDist = playerFwdDist;
        }

        // Detect pedestrian crossing ahead (stop to let pedestrians live!)
        for (let k = 0; k < this.pedestrians.length; k++) {
          const ped = this.pedestrians[k];
          if (ped.isDead) continue;
          const toPed = ped.position.clone().sub(v.physics.position);
          const pedFwdDist = toPed.dot(fwd);
          const pedLatDist = Math.abs(toPed.x * fwd.z - toPed.z * fwd.x);
          if (pedFwdDist > 0 && pedFwdDist < 18.0 && pedLatDist < 3.0) {
            if (pedFwdDist < obstacleAheadDist) obstacleAheadDist = pedFwdDist;
          }
        }

        // Smooth progressive braking: NEVER bump into the car in front!
        const targetCruiseSpeed = 15.0; // ~34 mph
        if (obstacleAheadDist < 8.0) {
          // Full stop with 6-7m buffer
          v.physics.throttleInput = 0;
          v.physics.brakeInput = 1.0;
          v.physics.linearVelocity.multiplyScalar(0.85); // Prevent sliding into obstacle
        } else if (obstacleAheadDist < 26.0) {
          // Smooth progressive decel
          v.physics.throttleInput = 0;
          v.physics.brakeInput = clamp(1.4 * (1.0 - (obstacleAheadDist / 26.0)), 0.3, 1.0);
        } else if (v.physics.speed < targetCruiseSpeed) {
          v.physics.throttleInput = 0.5;
          v.physics.brakeInput = 0;
        } else {
          v.physics.throttleInput = 0.08;
          v.physics.brakeInput = 0;
        }

        // Keep wheels aligned in lane
        v.physics.steeringInput = clamp(v.physics.steeringInput * 0.85, -0.05, 0.05);
      }

      v.update(dt, (x, z) => this.physics.getHeightAt(x, z));
      v.updateSmokeParticles(dt);
    }

    // 2. Update Pedestrians & Physical Collision with ALL Vehicles
    const gunshotAlert = player.isAiming && player.weapons.currentWeapon.currentAmmo < player.weapons.currentWeapon.magSize;
    for (let i = this.pedestrians.length - 1; i >= 0; i--) {
      const p = this.pedestrians[i];

      // Respawn distant pedestrians
      const distToPlayer = p.position.distanceTo(player.position);
      if (distToPlayer > 140) {
        const sidewalkX = this.sidewalkZones[Math.floor(Math.random() * this.sidewalkZones.length)];
        p.sidewalkX = sidewalkX;
        p.position.set(sidewalkX, 0, player.position.z + (Math.random() - 0.5) * 90);
        p.health = 35;
        p.isDead = false;
        p.state = 'walk';
        p.mesh.rotation.x = 0;
        p.mesh.rotation.z = 0;
        p.mesh.position.y = 0;
      }

      p.update(dt, player.position, gunshotAlert);

      // Cash Collection from fallen enemies/pedestrians
      if (p.cashDrop && !p.cashDrop.collected) {
        const distToCash = player.position.distanceTo(p.cashDrop.mesh.position);
        if (distToCash < 2.5) {
          p.cashDrop.collected = true;
          player.cash += p.cashDrop.amount;
          this.sounds.playCashPickup();
          this.scene.remove(p.cashDrop.mesh);
          p.cashDrop.mesh.geometry.dispose();
          p.cashDrop.mesh.material.dispose();
        }
      }

      // PHYSICAL IMPACT: ANY vehicle (civilian, player, or police) moving fast will strike and drive over pedestrian
      if (!p.isDead) {
        const strikingVehicles = [...this.vehicles];
        policeUnits.forEach(u => strikingVehicles.push(u.vehicle));

        for (let vIdx = 0; vIdx < strikingVehicles.length; vIdx++) {
          const veh = strikingVehicles[vIdx];
          if (veh.physics.speed > 4.2) {
            const dist = p.position.distanceTo(veh.mesh.position);
            if (dist < 2.5) {
              const killer = veh === player.currentVehicle ? player : null;
              p.takeDamage(100, killer);
              this.sounds.playCrash(0.7);
              // Push pedestrian body along vehicle velocity
              p.position.addScaledVector(veh.physics.forward, 3.2);
              p.mesh.position.copy(p.position);
              break;
            }
          }
        }
      }
    }
  }
}
