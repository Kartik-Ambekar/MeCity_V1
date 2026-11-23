import * as THREE from 'three';
import { Vehicle } from './Vehicle.js';
import { clamp } from '../utils/MathUtils.js';

export class PoliceManager {
  constructor(scene, soundSystem, physicsWorld, hud = null) {
    this.scene = scene;
    this.sounds = soundSystem;
    this.physics = physicsWorld;
    this.hud = hud;

    this.policeUnits = [];
    this.spawnCooldown = 0;
    this.evadeTimer = 0;
    this.tracers = [];
  }

  setHUD(hud) {
    this.hud = hud;
  }

  update(dt, player) {
    const wanted = player.wantedStars;

    // Despawn police and kill all sirens if wanted level is 0
    if (wanted === 0) {
      if (this.policeUnits.length > 0) {
        this.policeUnits.forEach(u => {
          u.vehicle.stopSiren();
          this.scene.remove(u.vehicle.mesh);
        });
        this.policeUnits = [];
      }
      this.evadeTimer = 0;
      return;
    }

    // Distance attenuation and evasion check
    let nearestDist = Infinity;
    for (let u of this.policeUnits) {
      const dist = u.vehicle.physics.position.distanceTo(player.position);
      if (dist < nearestDist) nearestDist = dist;
      // Attenuate siren volume dynamically based on distance
      this.sounds.updateSirenDistance(u.vehicle.id, dist);
    }

    // If player has broken away (> 55m), start evasion countdown
    if (nearestDist > 55 && this.policeUnits.length > 0) {
      this.evadeTimer += dt;
      if (this.evadeTimer > 8.0) { // 8 seconds away = heat cleared!
        player.wantedStars = 0;
        this.evadeTimer = 0;
        if (this.hud) {
          this.hud.showBanner('COPS EVADED', 'Wanted Level Cleared! You lost the heat.', 4000);
        }
        // Silence all sirens immediately
        this.policeUnits.forEach(u => {
          u.vehicle.stopSiren();
          this.scene.remove(u.vehicle.mesh);
        });
        this.policeUnits = [];
        return;
      }
    } else {
      this.evadeTimer = 0;
    }

    // Spawn police cruisers based on star count (1 cruiser at 1 star, 2 at 2 stars, max 3)
    const targetUnitCount = Math.min(3, Math.max(1, wanted));
    this.spawnCooldown -= dt;

    if (this.policeUnits.length < targetUnitCount && this.spawnCooldown <= 0) {
      this.spawnPoliceCruiser(player);
      this.spawnCooldown = 6.0;
    }

    // Update each active police cruiser AI & shooting
    for (let i = this.policeUnits.length - 1; i >= 0; i--) {
      const unit = this.policeUnits[i];
      const v = unit.vehicle;

      if (v.isDestroyed) {
        v.stopSiren();
        continue;
      }

      // Distance to player
      const distToPlayer = v.physics.position.distanceTo(player.position);

      // Despawn if lost very far away (> 200m)
      if (distToPlayer > 200) {
        v.stopSiren();
        this.scene.remove(v.mesh);
        this.policeUnits.splice(i, 1);
        continue;
      }

      // Vector to player
      const toPlayer = player.position.clone().sub(v.physics.position);
      toPlayer.y = 0;

      // Transform into cruiser local coordinates
      const localToPlayer = toPlayer.clone().applyQuaternion(v.physics.quaternion.clone().invert());
      // localToPlayer.x > 0 means player is to the right
      // localToPlayer.z > 0 means player is in front
      const steerAngle = Math.atan2(localToPlayer.x, Math.max(0.1, localToPlayer.z));
      v.physics.steeringInput = clamp(steerAngle * 2.0, -1.0, 1.0);

      // Regulated pursuit throttle (police cruisers top out around ~32 m/s, giving player chance to outrun them)
      if (v.physics.speed < 32) {
        v.physics.throttleInput = distToPlayer > 6.0 ? 0.85 : 0.4;
        v.physics.brakeInput = 0;
      } else {
        v.physics.throttleInput = 0.1;
      }

      // Physical Ram Impact with 1.5s Cooldown (prevents 60-hits-per-second instant death)
      unit.ramCooldown = (unit.ramCooldown || 0) - dt;
      if (distToPlayer < 4.0 && unit.ramCooldown <= 0 && v.physics.speed > 4.0) {
        unit.ramCooldown = 1.5;
        this.sounds.playCrash(0.85);

        if (player.inVehicle && player.currentVehicle) {
          // Ram damages the player's car modestly, NOT the player inside!
          player.currentVehicle.takeDamage(8);
        } else {
          // On foot: non-fatal hit with pushback
          player.takeDamage(20);
          const pushback = v.physics.forward.clone().multiplyScalar(9);
          player.velocity.add(pushback);
          player.position.addScaledVector(v.physics.right, (Math.random() - 0.5) * 3);
        }
      }

      // POLICE SHOOTING: Only shoot at 2+ stars when in close range (< 35m)
      unit.shootCooldown = (unit.shootCooldown || (1.2 + Math.random() * 0.5)) - dt;
      if (wanted >= 2 && distToPlayer < 35 && localToPlayer.z > 0 && unit.shootCooldown <= 0) {
        unit.shootCooldown = 1.4 + Math.random() * 0.6;
        this.policeFireAtPlayer(v, player);
      }

      v.update(dt, (x, z) => this.physics.getHeightAt(x, z));
      v.updateSmokeParticles(dt);
    }
  }

  policeFireAtPlayer(cruiser, player) {
    // Gunshot sound
    this.sounds.playGunshot('pistol');

    // Bullet origin from cruiser window / roof
    const shootOrigin = cruiser.physics.position.clone().add(new THREE.Vector3(0, 1.3, 0));
    // Player target location (chest / car body)
    const targetPos = player.position.clone().add(new THREE.Vector3(0, player.inVehicle ? 0.8 : 1.2, 0));

    // Slight accuracy spread
    targetPos.x += (Math.random() - 0.5) * 0.8;
    targetPos.y += (Math.random() - 0.5) * 0.5;
    targetPos.z += (Math.random() - 0.5) * 0.8;

    // Bullet tracer visual with shared material
    if (!PoliceManager.tracerMat) {
      PoliceManager.tracerMat = new THREE.LineBasicMaterial({ color: 0xff3b30, linewidth: 2, transparent: true, opacity: 0.9 });
    }
    const geo = new THREE.BufferGeometry().setFromPoints([shootOrigin, targetPos]);
    const tracer = new THREE.Line(geo, PoliceManager.tracerMat);
    this.scene.add(tracer);

    setTimeout(() => {
      this.scene.remove(tracer);
      geo.dispose();
    }, 60);

    // Apply bullet damage to player or vehicle
    player.takeDamage(5 + Math.floor(Math.random() * 4));
    if (player.currentVehicle) {
      player.currentVehicle.takeDamage(4);
    }
  }

  spawnPoliceCruiser(player) {
    const cruiser = new Vehicle(this.scene, this.sounds, 'police');

    // Find closest road X coordinate to spawn realistically on the street
    const roadXCoordinates = [120, 40, -40, -120];
    let closestRoadX = 120;
    let minDiff = Infinity;
    roadXCoordinates.forEach(rx => {
      const diff = Math.abs(player.position.x - rx);
      if (diff < minDiff) {
        minDiff = diff;
        closestRoadX = rx;
      }
    });

    // Spawn 45 to 65 meters ahead or behind player along the road
    const spawnZOffset = (Math.random() > 0.5 ? 1 : -1) * (45 + Math.random() * 20);
    const spawnX = closestRoadX;
    const spawnZ = player.position.z + spawnZOffset;
    const facingRot = spawnZOffset > 0 ? Math.PI : 0; // Face towards player

    cruiser.physics.reset(spawnX, 0.5, spawnZ, facingRot);
    cruiser.toggleSiren(); // Activate siren & flashing emergency lights

    this.policeUnits.push({
      vehicle: cruiser,
      shootCooldown: 1.0 + Math.random() * 0.5
    });
  }
}
