import * as THREE from 'three';
import { clamp, lerp } from '../utils/MathUtils.js';

/**
 * GTA VI Protagonist: Lucia / Jason Controller
 * Third-person on-foot movement, procedural limb kinematics, aiming, vehicle mounting
 */
export class Player {
  constructor(scene, camera, soundSystem, physicsWorld, weaponManager) {
    this.scene = scene;
    this.camera = camera;
    this.sounds = soundSystem;
    this.physics = physicsWorld;
    this.weapons = weaponManager;

    // Stats
    this.health = 100;
    this.maxHealth = 100;
    this.armor = 100;
    this.maxArmor = 100;
    this.stamina = 100;
    this.cash = 25000;
    this.wantedStars = 0;
    this.wantedTimer = 0;

    // State
    this.isDead = false;
    this.inVehicle = false;
    this.currentVehicle = null;
    this.isAiming = false;
    this.isSprinting = false;
    this.isGrounded = true;
    this.invulnerableTimer = 0;

    // Transform
    this.position = new THREE.Vector3(125, 0.5, -40); // Spawn on Ocean Drive sidewalk
    this.velocity = new THREE.Vector3();
    this.yaw = 0; // Horizontal look angle
    this.pitch = 0; // Vertical look angle
    this.radius = 0.45;
    this.height = 1.85;

    // Camera follow parameters
    this.cameraDistance = 4.2;
    this.cameraOffset = new THREE.Vector3(0.65, 1.45, 0); // Over the right shoulder
    this.lookSensitivity = 0.0022;

    // Animated Procedural Character Rig
    this.mesh = new THREE.Group();
    this.buildCharacterModel();
    this.scene.add(this.mesh);

    // Limb animation phase
    this.walkAnimPhase = 0;
  }

  buildCharacterModel() {
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xdeb887, roughness: 0.7 });
    const topMat = new THREE.MeshStandardMaterial({ color: 0xec407a, roughness: 0.6 }); // Miami Pink Tank Top
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x283593, roughness: 0.8 }); // Denim Jeans
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }); // White sneakers
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x211c1d, roughness: 0.9 });

    // Hips / Pelvis
    const hips = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.22, 0.24), pantsMat);
    hips.position.y = 0.95;
    this.mesh.add(hips);
    this.hips = hips;

    // Torso / Chest
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.45, 0.26), topMat);
    torso.position.y = 0.32;
    torso.castShadow = true;
    hips.add(torso);
    this.torso = torso;

    // Head & Hair
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 12), skinMat);
    head.position.y = 0.34;
    torso.add(head);

    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 10), hairMat);
    hair.position.set(0, 0.04, -0.03);
    head.add(hair);

    // Sunglasses
    const glasses = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 0.08), new THREE.MeshBasicMaterial({ color: 0x111111 }));
    glasses.position.set(0, 0.01, 0.12);
    head.add(glasses);

    // Left & Right Legs
    this.leftLeg = this.createLeg(pantsMat, shoeMat);
    this.leftLeg.position.set(-0.12, -0.1, 0);
    hips.add(this.leftLeg);

    this.rightLeg = this.createLeg(pantsMat, shoeMat);
    this.rightLeg.position.set(0.12, -0.1, 0);
    hips.add(this.rightLeg);

    // Left & Right Arms
    this.leftArm = this.createArm(skinMat);
    this.leftArm.position.set(-0.26, 0.18, 0);
    torso.add(this.leftArm);

    this.rightArm = this.createArm(skinMat);
    this.rightArm.position.set(0.26, 0.18, 0);
    torso.add(this.rightArm);

    // Attach 3D weapons directly to character's right hand
    this.weaponHolder = this.createWeaponMeshes();
    this.rightArm.children[0].children[0].add(this.weaponHolder); // Attach to forearm/hand
  }

  createWeaponMeshes() {
    const group = new THREE.Group();
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x1c2128, metalness: 0.85, roughness: 0.25 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.7 });
    const oliveMat = new THREE.MeshStandardMaterial({ color: 0x2e4224, metalness: 0.6, roughness: 0.4 });

    // 1. Pistol
    const pistol = new THREE.Group();
    const pSlide = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.26), metalMat);
    pSlide.position.set(0, 0.05, 0.06);
    const pGrip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.08), metalMat);
    pGrip.position.set(0, -0.05, -0.02);
    pGrip.rotation.x = -0.25;
    pistol.add(pSlide, pGrip);
    pistol.position.set(0, -0.18, 0.12);
    group.add(pistol);

    // 2. Carbine Rifle
    const rifle = new THREE.Group();
    const rBody = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.12, 0.58), metalMat);
    rBody.position.set(0, 0.04, 0.14);
    const rBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.28, 8), metalMat);
    rBarrel.rotation.x = Math.PI / 2;
    rBarrel.position.set(0, 0.05, 0.52);
    const rMag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.2, 0.09), metalMat);
    rMag.position.set(0, -0.1, 0.12);
    rMag.rotation.x = 0.2;
    const rStock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.22), metalMat);
    rStock.position.set(0, 0.02, -0.2);
    rifle.add(rBody, rBarrel, rMag, rStock);
    rifle.position.set(0, -0.18, 0.15);
    group.add(rifle);

    // 3. Pump Shotgun
    const shotgun = new THREE.Group();
    const sBody = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.1, 0.62), metalMat);
    sBody.position.set(0, 0.04, 0.15);
    const sPump = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.18, 8), woodMat);
    sPump.rotation.x = Math.PI / 2;
    sPump.position.set(0, 0.0, 0.25);
    const sStock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.11, 0.24), woodMat);
    sStock.position.set(0, 0.01, -0.22);
    shotgun.add(sBody, sPump, sStock);
    shotgun.position.set(0, -0.18, 0.15);
    group.add(shotgun);

    // 4. RPG-7 Launcher
    const rpg = new THREE.Group();
    const rTube = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.95, 10), oliveMat);
    rTube.rotation.x = Math.PI / 2;
    rTube.position.set(0, 0.06, 0.1);
    const rWarhead = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.32, 10), oliveMat);
    rWarhead.rotation.x = -Math.PI / 2;
    rWarhead.position.set(0, 0.06, 0.68);
    const rGrip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.18, 0.08), woodMat);
    rGrip.position.set(0, -0.08, -0.05);
    rpg.add(rTube, rWarhead, rGrip);
    rpg.position.set(0, -0.15, 0.18);
    group.add(rpg);

    this.weapon3DModels = {
      pistol,
      rifle,
      shotgun,
      rpg
    };

    return group;
  }

  createLeg(pantsMat, shoeMat) {
    const legGroup = new THREE.Group();
    // Thigh
    const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.42, 0.16), pantsMat);
    thigh.position.y = -0.21;
    legGroup.add(thigh);

    // Calf & Foot
    const calf = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.42, 0.14), pantsMat);
    calf.position.y = -0.42;
    thigh.add(calf);

    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 0.26), shoeMat);
    foot.position.set(0, -0.21, 0.05);
    calf.add(foot);

    return legGroup;
  }

  createArm(skinMat) {
    const armGroup = new THREE.Group();
    const upper = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.36, 0.12), skinMat);
    upper.position.y = -0.18;
    armGroup.add(upper);

    const lower = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.34, 0.1), skinMat);
    lower.position.y = -0.32;
    upper.add(lower);

    return armGroup;
  }

  update(dt, input, nearbyVehicles = []) {
    if (this.isDead) return;

    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= dt;
    }

    if (this.inVehicle && this.currentVehicle) {
      this.updateInVehicle(dt, input);
    } else {
      this.updateOnFoot(dt, input, nearbyVehicles);
    }

    // Update wanted stars timer decay
    if (this.wantedStars > 0) {
      this.wantedTimer += dt;
      if (this.wantedTimer > 25.0) { // Cops lose track after 25s out of combat
        this.wantedStars = Math.max(0, this.wantedStars - 1);
        this.wantedTimer = 0;
      }
    }
  }

  updateOnFoot(dt, input, nearbyVehicles) {
    // 1. Process mouse look
    this.yaw -= input.lookDeltaX * this.lookSensitivity;
    this.pitch = clamp(this.pitch - input.lookDeltaY * this.lookSensitivity, -1.2, 1.2);

    // 2. Sprinting & Stamina
    this.isSprinting = input.sprint && (input.moveX !== 0 || input.moveZ !== 0) && this.stamina > 5;
    if (this.isSprinting) {
      this.stamina = Math.max(0, this.stamina - dt * 15);
    } else {
      this.stamina = Math.min(100, this.stamina + dt * 20);
    }

    const moveSpeed = this.isSprinting ? 9.2 : (this.isAiming ? 3.0 : 4.8);

    // 3. Movement Direction relative to camera yaw
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    const moveDir = new THREE.Vector3();
    if (input.moveZ !== 0) moveDir.addScaledVector(forward, -input.moveZ);
    if (input.moveX !== 0) moveDir.addScaledVector(right, input.moveX);

    if (moveDir.lengthSq() > 0.001) {
      moveDir.normalize();
      this.velocity.x = moveDir.x * moveSpeed;
      this.velocity.z = moveDir.z * moveSpeed;

      // Rotate character model to face movement direction (or camera yaw if aiming)
      const targetRotation = this.isAiming ? (this.yaw + Math.PI) : Math.atan2(moveDir.x, moveDir.z);
      this.mesh.rotation.y = lerp(this.mesh.rotation.y, targetRotation, dt * 14);

      // Animate walking/running stride
      this.walkAnimPhase += dt * (this.isSprinting ? 16 : 9);
      this.leftLeg.rotation.x = Math.sin(this.walkAnimPhase) * 0.7;
      this.rightLeg.rotation.x = -Math.sin(this.walkAnimPhase) * 0.7;
      if (!this.isAiming) {
        this.leftArm.rotation.x = -Math.sin(this.walkAnimPhase) * 0.6;
        this.rightArm.rotation.x = Math.sin(this.walkAnimPhase) * 0.6;
      }
    } else {
      this.velocity.x = lerp(this.velocity.x, 0, dt * 12);
      this.velocity.z = lerp(this.velocity.z, 0, dt * 12);

      // Idle pose
      this.leftLeg.rotation.x = lerp(this.leftLeg.rotation.x, 0, dt * 8);
      this.rightLeg.rotation.x = lerp(this.rightLeg.rotation.x, 0, dt * 8);
      if (!this.isAiming) {
        this.leftArm.rotation.x = lerp(this.leftArm.rotation.x, 0, dt * 8);
        this.rightArm.rotation.x = lerp(this.rightArm.rotation.x, 0, dt * 8);
      }
    }

    // 4. Gravity & Jumping
    const groundY = this.physics.getHeightAt(this.position.x, this.position.z);
    if (this.position.y <= groundY + 0.01) {
      this.position.y = groundY;
      this.velocity.y = 0;
      this.isGrounded = true;

      if (input.jump) {
        this.velocity.y = 6.8; // Jump velocity
        this.isGrounded = false;
      }
    } else {
      this.velocity.y -= 19.6 * dt; // Gravity
      this.isGrounded = false;
    }

    // Apply velocity
    this.position.addScaledVector(this.velocity, dt);
    this.mesh.position.copy(this.position);

    // Collision check against world obstacles
    const hit = this.physics.checkSphereCollision(this.position.clone().add(new THREE.Vector3(0, 0.9, 0)), this.radius);
    if (hit.collided) {
      this.position.addScaledVector(hit.normal, hit.penetration);
      this.mesh.position.copy(this.position);
    }

    // 5. Aiming, Weapon Visibility & Hip-Fire Shooting
    const curW = this.weapons.currentWeapon.id;
    if (this.weapon3DModels) {
      for (const [id, m] of Object.entries(this.weapon3DModels)) {
        m.visible = (id === curW);
      }
    }

    // Aim when holding Right Click OR when pressing Shoot (Hip-fire)
    const wantsToShoot = input.shoot;
    this.isAiming = input.aim || wantsToShoot;

    if (this.isAiming) {
      this.mesh.rotation.y = this.yaw + Math.PI;
      // Raise right arm forward with gun aimed down crosshairs
      this.rightArm.rotation.x = -Math.PI / 2 + this.pitch;
      this.leftArm.rotation.x = -Math.PI / 2.3;
    }

    if (wantsToShoot) {
      const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
      const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
      const shootOrigin = this.position.clone()
        .add(new THREE.Vector3(0, 1.45, 0))
        .addScaledVector(right, 0.28)
        .addScaledVector(forward, 0.35);

      const shootDir = new THREE.Vector3(
        -Math.sin(this.yaw) * Math.cos(this.pitch),
        Math.sin(this.pitch),
        -Math.cos(this.yaw) * Math.cos(this.pitch)
      ).normalize();

      const targets = [...nearbyVehicles];
      const fired = this.weapons.fire(shootOrigin, shootDir, this.physics, targets);
      if (fired && this.wantedStars === 0) {
        this.wantedStars = 1; // Shooting triggers police interest
      }
    }

    // 6. Enter Vehicle Check ('F' key)
    if (input.enterVehicle) {
      this.tryEnterVehicle(nearbyVehicles);
    }

    // 7. Update Third-Person Camera
    this.updateCamera(dt, false);
  }

  tryEnterVehicle(vehicles) {
    let closest = null;
    let minDist = 3.5;

    for (let i = 0; i < vehicles.length; i++) {
      const v = vehicles[i];
      if (v.isDestroyed) continue;
      const d = this.position.distanceTo(v.mesh.position);
      if (d < minDist) {
        minDist = d;
        closest = v;
      }
    }

    if (closest) {
      this.enterVehicle(closest);
    }
  }

  enterVehicle(vehicle) {
    this.inVehicle = true;
    this.currentVehicle = vehicle;
    this.currentVehicle.setDriver(this);
    this.sounds.playCarDoor();

    // Hide character mesh inside car
    this.mesh.visible = false;
  }

  exitVehicle() {
    if (!this.inVehicle || !this.currentVehicle) return;

    const v = this.currentVehicle;
    // Bail out position to the left of the car
    const exitPos = v.physics.position.clone().add(v.physics.right.clone().multiplyScalar(-2.2));
    exitPos.y = this.physics.getHeightAt(exitPos.x, exitPos.z);
    this.position.copy(exitPos);
    this.mesh.position.copy(this.position);
    this.mesh.visible = true;

    // Inherit some exit inertia if bailing at speed
    if (v.physics.speed > 8) {
      this.velocity.copy(v.physics.linearVelocity).multiplyScalar(0.5);
      this.takeDamage(15); // Stumble damage
    } else {
      this.velocity.set(0, 0, 0);
    }

    v.setDriver(null);
    this.sounds.playCarDoor();
    this.currentVehicle = null;
    this.inVehicle = false;
  }

  updateInVehicle(dt, input) {
    const v = this.currentVehicle;
    if (!v) return;

    // Immediately eject if vehicle is destroyed
    if (v.isDestroyed) {
      this.exitVehicle();
      return;
    }

    // Automatic Transmission Logic (Forward Drive / Active Brake / Reverse Gear):
    const forwardVel = v.physics.linearVelocity.dot(v.physics.forward);

    if (input.gas) {
      if (forwardVel < -0.6) {
        // Moving backward: W acts as active brake to stop reverse motion
        v.physics.throttleInput = 0;
        v.physics.brakeInput = 1.0;
      } else {
        // Accelerate forward into 1st-6th gear
        v.physics.throttleInput = 1.0;
        v.physics.brakeInput = 0;
      }
    } else if (input.reverse) {
      if (forwardVel > 0.8) {
        // Moving forward: S acts as active brake to slow down rapidly
        v.physics.throttleInput = 0;
        v.physics.brakeInput = 1.0;
      } else {
        // Stopped or rolling back: Engage REVERSE gear and accelerate backward!
        v.physics.throttleInput = -1.0;
        v.physics.brakeInput = 0;
      }
    } else {
      v.physics.throttleInput = 0;
      v.physics.brakeInput = 0;
    }

    if (input.handbrake) {
      v.physics.handbrake = true;
      v.physics.brakeInput = Math.max(v.physics.brakeInput, 0.85);
    } else {
      v.physics.handbrake = false;
    }

    // Steering: A turns Left, D turns Right
    v.physics.steeringInput = (input.steerLeft ? 1.0 : 0) - (input.steerRight ? 1.0 : 0);

    // Horn
    if (input.horn) {
      if (!this.hornSynth) {
        this.hornSynth = this.sounds.playHorn();
      }
    } else if (this.hornSynth) {
      this.hornSynth.stop();
      this.hornSynth = null;
    }

    // Police Siren toggle
    if (input.sirenToggle && v.isPolice) {
      v.toggleSiren();
    }

    // Exit vehicle
    if (input.enterVehicle) {
      this.exitVehicle();
      return;
    }

    // Sync player position with vehicle for minimap & sound listener
    this.position.copy(v.mesh.position);

    // Update Driving Chase Camera
    this.updateCamera(dt, true);
  }

  updateCamera(dt, inCar) {
    // Clamp pitch angle so camera can never peer from beneath the ground/road
    this.pitch = clamp(this.pitch, -0.65, 0.85);

    if (inCar && this.currentVehicle) {
      const v = this.currentVehicle;
      const speed = v.physics.speed;

      // Dynamic chase camera behind vehicle with exponential smoothing (zero jitter)
      const dist = lerp(6.5, 9.5, speed / 55);
      const height = lerp(2.4, 3.6, speed / 55);

      const targetCamPos = v.physics.position.clone()
        .sub(v.physics.forward.clone().multiplyScalar(dist))
        .add(new THREE.Vector3(0, height, 0));

      // Ground clamp in car: never drop beneath road plane!
      const roadElevation = this.physics.getHeightAt(targetCamPos.x, targetCamPos.z);
      targetCamPos.y = Math.max(roadElevation + 0.85, targetCamPos.y);

      // Exponential damping avoids stutter/jitter across variable delta time
      const camLerp = 1 - Math.exp(-9 * dt);
      this.camera.position.lerp(targetCamPos, camLerp);
      const actualCamGround = this.physics.getHeightAt(this.camera.position.x, this.camera.position.z);
      if (this.camera.position.y < actualCamGround + 0.85) {
        this.camera.position.y = actualCamGround + 0.85;
      }

      // Smooth look target
      const lookTarget = v.physics.position.clone().add(v.physics.forward.clone().multiplyScalar(3.5)).add(new THREE.Vector3(0, 1.2, 0));
      if (!this.camLookAtSmoothed) {
        this.camLookAtSmoothed = lookTarget.clone();
      } else {
        this.camLookAtSmoothed.lerp(lookTarget, 1 - Math.exp(-14 * dt));
      }
      this.camera.lookAt(this.camLookAtSmoothed);
    } else {
      // Over the shoulder on foot
      const camTargetDist = this.isAiming ? 2.0 : this.cameraDistance;

      // Calculate shoulder position correctly relative to player's facing yaw
      const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
      const shoulderXOffset = this.isAiming ? 0.45 : 0.6;
      const shoulderPos = this.position.clone().add(new THREE.Vector3(0, 1.45, 0)).addScaledVector(right, shoulderXOffset);

      const camDir = new THREE.Vector3(
        Math.sin(this.yaw) * Math.cos(this.pitch),
        Math.sin(this.pitch),
        Math.cos(this.yaw) * Math.cos(this.pitch)
      ).normalize();

      const desiredCamPos = shoulderPos.clone().addScaledVector(camDir, camTargetDist);

      // Ground clamp on foot: never sink beneath ground or road!
      const groundAtCam = this.physics.getHeightAt(desiredCamPos.x, desiredCamPos.z);
      desiredCamPos.y = Math.max(groundAtCam + 0.65, desiredCamPos.y);

      // Prevent camera from clipping through buildings
      const hit = this.physics.raycast(shoulderPos, camDir, camTargetDist);
      if (hit && hit.distance > 0.8) {
        desiredCamPos.copy(hit.point).sub(camDir.clone().multiplyScalar(0.35));
        desiredCamPos.y = Math.max(groundAtCam + 0.65, desiredCamPos.y);
      }

      // Smooth position and look target
      const camLerp = 1 - Math.exp(-12 * dt);
      this.camera.position.lerp(desiredCamPos, camLerp);
      const actualGroundOnFoot = this.physics.getHeightAt(this.camera.position.x, this.camera.position.z);
      if (this.camera.position.y < actualGroundOnFoot + 0.65) {
        this.camera.position.y = actualGroundOnFoot + 0.65;
      }

      if (!this.camLookAtSmoothed) {
        this.camLookAtSmoothed = shoulderPos.clone();
      } else {
        this.camLookAtSmoothed.lerp(shoulderPos, 1 - Math.exp(-16 * dt));
      }
      this.camera.lookAt(this.camLookAtSmoothed);
    }
  }

  takeDamage(amount, bypassInvulnerable = false) {
    if (this.isDead) return;

    // When inside a vehicle, the vehicle chassis absorbs collision impacts
    if (this.inVehicle && this.currentVehicle) {
      this.currentVehicle.takeDamage(amount);
      return;
    }

    // Invulnerability window prevents dying in 0.1s from rapid multi-frame hits
    if (!bypassInvulnerable && this.invulnerableTimer > 0) return;
    if (amount > 8) {
      this.invulnerableTimer = 1.4; // 1.4s grace window
    }

    if (this.armor > 0) {
      const armorAbsorb = Math.min(this.armor, amount * 0.7);
      this.armor -= armorAbsorb;
      amount -= armorAbsorb;
    }

    this.health = Math.max(0, this.health - amount);
    if (this.health <= 0 && !this.isDead) {
      this.die();
    }
  }

  die() {
    this.isDead = true;
    if (this.inVehicle) {
      this.exitVehicle();
    }
    // Fall over
    this.mesh.rotation.x = Math.PI / 2;
    this.mesh.position.y = 0.2;
  }

  respawn() {
    this.isDead = false;
    this.health = 100;
    this.armor = 50;
    this.position.set(125, 0.5, -40);
    this.mesh.position.copy(this.position);
    this.mesh.rotation.set(0, 0, 0);
    this.mesh.visible = true;
    this.velocity.set(0, 0, 0);
    this.wantedStars = 0;
  }
}
