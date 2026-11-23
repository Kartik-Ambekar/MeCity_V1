import * as THREE from 'three';

/**
 * GTA VI Weapons Arsenal: Combat Pistol, Assault Rifle, Shotgun, and Rocket Launcher
 */
export class WeaponManager {
  constructor(scene, soundSystem) {
    this.scene = scene;
    this.sounds = soundSystem;

    this.weapons = [
      {
        id: 'pistol',
        name: 'COMBAT PISTOL',
        damage: 34,
        fireRate: 0.28,
        magSize: 12,
        currentAmmo: 12,
        reserveAmmo: 72,
        range: 120,
        recoil: 0.04,
        automatic: false,
        spread: 0.015
      },
      {
        id: 'rifle',
        name: 'CARBINE RIFLE',
        damage: 28,
        fireRate: 0.11,
        magSize: 30,
        currentAmmo: 30,
        reserveAmmo: 180,
        range: 180,
        recoil: 0.06,
        automatic: true,
        spread: 0.025
      },
      {
        id: 'shotgun',
        name: 'PUMP SHOTGUN',
        damage: 85,
        fireRate: 0.85,
        magSize: 8,
        currentAmmo: 8,
        reserveAmmo: 32,
        range: 45,
        recoil: 0.14,
        automatic: false,
        spread: 0.08,
        pellets: 6
      },
      {
        id: 'rpg',
        name: 'RPG-7 LAUNCHER',
        damage: 250,
        fireRate: 1.8,
        magSize: 1,
        currentAmmo: 1,
        reserveAmmo: 5,
        range: 220,
        recoil: 0.2,
        automatic: false,
        spread: 0.005,
        isExplosive: true
      }
    ];

    this.currentIndex = 0;
    this.lastFireTime = 0;
    this.isReloading = false;

    // Active projectiles (rockets, tracers)
    this.projectiles = [];
    this.bulletImpacts = [];
  }

  get currentWeapon() {
    return this.weapons[this.currentIndex];
  }

  selectWeapon(index) {
    if (index >= 0 && index < this.weapons.length) {
      this.currentIndex = index;
      this.isReloading = false;
    }
  }

  nextWeapon() {
    this.currentIndex = (this.currentIndex + 1) % this.weapons.length;
    this.isReloading = false;
    return this.currentWeapon;
  }

  prevWeapon() {
    this.currentIndex = (this.currentIndex - 1 + this.weapons.length) % this.weapons.length;
    this.isReloading = false;
    return this.currentWeapon;
  }

  fire(origin, direction, physicsWorld, targets = []) {
    const w = this.currentWeapon;
    const now = performance.now() / 1000;

    if (this.isReloading || now - this.lastFireTime < w.fireRate) return false;
    if (w.currentAmmo <= 0) {
      this.reload();
      return false;
    }

    w.currentAmmo--;
    this.lastFireTime = now;

    // Play procedural gunshot audio
    this.sounds.playGunshot(w.id);

    // Rocket Launcher projectile vs Instant Raycast
    if (w.isExplosive) {
      this.fireRocket(origin, direction, physicsWorld, targets);
    } else {
      const pelletCount = w.pellets || 1;
      for (let p = 0; p < pelletCount; p++) {
        // Apply weapon spread
        const spreadDir = direction.clone();
        spreadDir.x += (Math.random() - 0.5) * w.spread;
        spreadDir.y += (Math.random() - 0.5) * w.spread;
        spreadDir.z += (Math.random() - 0.5) * w.spread;
        spreadDir.normalize();

        this.fireBullet(origin, spreadDir, w.damage, w.range, physicsWorld, targets);
      }
    }

    return true;
  }

  fireBullet(origin, direction, damage, maxRange, physicsWorld, targets) {
    // Check hit against physical world
    const worldHit = physicsWorld.raycast(origin, direction, maxRange);
    let hitPoint = worldHit ? worldHit.point : origin.clone().addScaledVector(direction, maxRange);
    let hitDist = worldHit ? worldHit.distance : maxRange;

    // Check hit against vehicles and pedestrians
    let targetHit = null;
    targets.forEach(t => {
      if (!t || !t.mesh || t.isDead) return;
      // Target center of mass (mid-torso for pedestrians, chassis center for vehicles)
      const targetCenter = t.mesh.position.clone();
      if (t.isPedestrian || t.height) {
        targetCenter.y += 0.9;
      } else if (t.physics && t.physics.position) {
        targetCenter.copy(t.physics.position).add(new THREE.Vector3(0, 0.65, 0));
      } else {
        targetCenter.y += 0.6;
      }

      const toTarget = targetCenter.clone().sub(origin);
      const proj = toTarget.dot(direction);
      if (proj > 0 && proj < hitDist) {
        const perpDist = toTarget.clone().sub(direction.clone().multiplyScalar(proj)).length();
        const hitRadius = t.isPedestrian ? 0.85 : (t.radius || 2.1);
        if (perpDist < hitRadius) {
          hitDist = proj;
          hitPoint = origin.clone().addScaledVector(direction, proj);
          targetHit = t;
        }
      }
    });

    if (targetHit && targetHit.takeDamage) {
      targetHit.takeDamage(damage, this.owner);
    }

    // Spawn tracer visual line
    this.createTracer(origin, hitPoint);

    // Spawn impact spark particles at hit point
    this.createImpactSparks(hitPoint);
  }

  fireRocket(origin, direction, physicsWorld, targets) {
    // Rocket projectile
    const geo = new THREE.CylinderGeometry(0.08, 0.08, 0.7, 8);
    geo.rotateX(Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({ color: 0x334422, metalness: 0.8 });
    const rocket = new THREE.Mesh(geo, mat);
    rocket.position.copy(origin);
    rocket.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);
    this.scene.add(rocket);

    this.projectiles.push({
      mesh: rocket,
      direction: direction.clone(),
      speed: 65,
      lifetime: 3.5,
      physicsWorld,
      targets
    });
  }

  createTracer(start, end) {
    const geo = new THREE.BufferGeometry().setFromPoints([start, end]);
    const mat = new THREE.LineBasicMaterial({ color: 0xffe066, linewidth: 2, transparent: true, opacity: 0.85 });
    const line = new THREE.Line(geo, mat);
    this.scene.add(line);

    setTimeout(() => {
      this.scene.remove(line);
      geo.dispose();
      mat.dispose();
    }, 60);
  }

  createImpactSparks(point) {
    const sparkCount = 8;
    const sparks = [];
    const mat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });

    for (let i = 0; i < sparkCount; i++) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.06), mat);
      mesh.position.copy(point);
      this.scene.add(mesh);
      sparks.push({
        mesh,
        vel: new THREE.Vector3((Math.random() - 0.5) * 5, Math.random() * 4, (Math.random() - 0.5) * 5),
        life: 0.25
      });
    }

    this.bulletImpacts.push(...sparks);
  }

  reload() {
    const w = this.currentWeapon;
    if (this.isReloading || w.currentAmmo >= w.magSize || w.reserveAmmo <= 0) return;

    this.isReloading = true;
    setTimeout(() => {
      const needed = w.magSize - w.currentAmmo;
      const transfer = Math.min(needed, w.reserveAmmo);
      w.currentAmmo += transfer;
      w.reserveAmmo -= transfer;
      this.isReloading = false;
    }, 1200);
  }

  update(dt) {
    // Update rockets
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.lifetime -= dt;
      p.mesh.position.addScaledVector(p.direction, p.speed * dt);

      // Check collision
      const hit = p.physicsWorld.raycast(p.mesh.position, p.direction, 2.5);
      if (hit || p.lifetime <= 0) {
        this.detonateRocket(p.mesh.position, p.targets);
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this.projectiles.splice(i, 1);
      }
    }

    // Update impact spark particles
    for (let i = this.bulletImpacts.length - 1; i >= 0; i--) {
      const sp = this.bulletImpacts[i];
      sp.life -= dt;
      sp.mesh.position.addScaledVector(sp.vel, dt);
      sp.vel.y -= 9.8 * dt; // gravity

      if (sp.life <= 0) {
        this.scene.remove(sp.mesh);
        sp.mesh.geometry.dispose();
        this.bulletImpacts.splice(i, 1);
      }
    }
  }

  detonateRocket(center, targets) {
    this.sounds.playExplosion();

    // Shockwave explosion effect on nearby targets
    const explosionRadius = 16.0;
    targets.forEach(t => {
      if (!t || !t.mesh) return;
      const dist = center.distanceTo(t.mesh.position);
      if (dist < explosionRadius) {
        const falloff = 1.0 - (dist / explosionRadius);
        if (t.takeDamage) {
          t.takeDamage(220 * falloff);
        }
        if (t.physics && t.physics.applyImpulse) {
          const impulse = t.mesh.position.clone().sub(center).normalize().multiplyScalar(15000 * falloff);
          impulse.y = Math.max(impulse.y, 8000 * falloff);
          t.physics.applyImpulse(impulse, center);
        }
      }
    });
  }
}
