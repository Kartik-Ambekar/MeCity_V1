import * as THREE from 'three';
import { lerp } from '../utils/MathUtils.js';

export class Pedestrian {
  constructor(scene, soundSystem, x, z) {
    this.scene = scene;
    this.sounds = soundSystem;
    this.id = 'ped_' + Math.random().toString(36).substring(2, 7);

    this.position = new THREE.Vector3(x, 0, z);
    this.sidewalkX = x;
    this.velocity = new THREE.Vector3();
    this.target = new THREE.Vector3(x, 0, z + (Math.random() > 0.5 ? 1 : -1) * 35);
    this.speed = 1.4 + Math.random() * 0.8;
    this.radius = 0.8;
    this.height = 1.8;
    this.isPedestrian = true;
    this.health = 35;
    this.isDead = false;
    this.state = 'walk'; // walk, panic, knocked
    this.walkAnimPhase = Math.random() * Math.PI * 2;

    this.mesh = new THREE.Group();
    this.buildModel();
    this.scene.add(this.mesh);
  }

  buildModel() {
    const skinColors = [0xdeb887, 0x8d5524, 0xc68642, 0xe0ac69, 0xf1c27d];
    const shirtColors = [0x00bcd4, 0xffeb3b, 0x4caf50, 0xff5722, 0x9c27b0, 0xff4081, 0x2196f3, 0xffffff, 0x333333];
    const pantsColors = [0x37474f, 0x1a237e, 0x4e342e, 0x263238, 0x424242];
    const hairColors = [0x1a1a1a, 0x4a2c11, 0x8b5a2b, 0xc69a58];

    const skinMat = new THREE.MeshStandardMaterial({ color: skinColors[Math.floor(Math.random() * skinColors.length)], roughness: 0.7 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: shirtColors[Math.floor(Math.random() * shirtColors.length)], roughness: 0.8 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: pantsColors[Math.floor(Math.random() * pantsColors.length)], roughness: 0.85 });
    const hairMat = new THREE.MeshStandardMaterial({ color: hairColors[Math.floor(Math.random() * hairColors.length)], roughness: 0.9 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6 });

    // Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.48, 0.22), shirtMat);
    torso.position.y = 1.16;
    torso.castShadow = true;
    this.mesh.add(torso);
    this.torso = torso;

    // Neck
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.1, 8), skinMat);
    neck.position.y = 0.28;
    torso.add(neck);

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 10), skinMat);
    head.position.y = 0.38;
    torso.add(head);

    // Hair or Hat
    if (Math.random() > 0.4) {
      // Hair cap
      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.145, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2), hairMat);
      hair.position.y = 0.42;
      torso.add(hair);
    } else {
      // Baseball cap
      const capMat = new THREE.MeshStandardMaterial({ color: shirtMat.color, roughness: 0.7 });
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.16, 0.08, 10), capMat);
      cap.position.y = 0.48;
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.02, 0.14), capMat);
      visor.position.set(0, 0.45, 0.15);
      torso.add(cap, visor);
    }

    // Sunglasses
    if (Math.random() > 0.5) {
      const glassesMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9, roughness: 0.1 });
      const glasses = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, 0.06), glassesMat);
      glasses.position.set(0, 0.38, 0.13);
      torso.add(glasses);
    }

    // Arms
    const armGeo = new THREE.BoxGeometry(0.1, 0.44, 0.1);
    this.leftArm = new THREE.Mesh(armGeo, shirtMat);
    this.leftArm.position.set(-0.25, 1.1, 0);
    this.rightArm = new THREE.Mesh(armGeo, shirtMat);
    this.rightArm.position.set(0.25, 1.1, 0);
    this.mesh.add(this.leftArm, this.rightArm);

    // Hands
    const handGeo = new THREE.SphereGeometry(0.05, 6, 6);
    const lHand = new THREE.Mesh(handGeo, skinMat);
    lHand.position.y = -0.24;
    this.leftArm.add(lHand);
    const rHand = new THREE.Mesh(handGeo, skinMat);
    rHand.position.y = -0.24;
    this.rightArm.add(rHand);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.14, 0.75, 0.14);
    this.leftLeg = new THREE.Mesh(legGeo, pantsMat);
    this.leftLeg.position.set(-0.11, 0.45, 0);
    this.rightLeg = new THREE.Mesh(legGeo, pantsMat);
    this.rightLeg.position.set(0.11, 0.45, 0);

    // Shoes
    const shoeGeo = new THREE.BoxGeometry(0.14, 0.08, 0.22);
    const lShoe = new THREE.Mesh(shoeGeo, shoeMat);
    lShoe.position.set(0, -0.38, 0.03);
    this.leftLeg.add(lShoe);
    const rShoe = new THREE.Mesh(shoeGeo, shoeMat);
    rShoe.position.set(0, -0.38, 0.03);
    this.rightLeg.add(rShoe);

    this.mesh.add(this.leftLeg, this.rightLeg);
  }

  update(dt, playerPosition, gunshotAlert = false) {
    if (this.isDead) return;

    const distToPlayer = this.position.distanceTo(playerPosition);

    // Panic if gunshot fired or player gets dangerously close
    if (gunshotAlert && distToPlayer < 45) {
      this.state = 'panic';
      // Flee along sidewalk away from player
      const fleeZ = this.position.z >= playerPosition.z ? 60 : -60;
      this.target.set(this.sidewalkX + (Math.random() - 0.5) * 2.0, 0, this.position.z + fleeZ);
    }

    if (this.state === 'knocked') {
      this.mesh.position.y = 0.15;
      return;
    }

    // Move towards current target
    const toTarget = this.target.clone().sub(this.position);
    toTarget.y = 0;
    const dist = toTarget.length();

    if (dist < 2.0) {
      // Pick new wander target strictly along the sidewalk corridor
      const dirZ = Math.random() > 0.5 ? 1 : -1;
      this.target.set(
        this.sidewalkX + (Math.random() - 0.5) * 2.5,
        0,
        this.position.z + dirZ * (25 + Math.random() * 45)
      );
      this.state = 'walk';
    } else {
      toTarget.normalize();
      const currentSpeed = this.state === 'panic' ? this.speed * 2.8 : this.speed;
      this.velocity.copy(toTarget).multiplyScalar(currentSpeed);
      this.position.addScaledVector(this.velocity, dt);

      // Facing rotation
      const angle = Math.atan2(toTarget.x, toTarget.z);
      this.mesh.rotation.y = lerp(this.mesh.rotation.y, angle, dt * 8);

      // Leg stride & arm swing animation
      this.walkAnimPhase += dt * (this.state === 'panic' ? 18 : 8);
      const swing = Math.sin(this.walkAnimPhase);
      this.leftLeg.rotation.x = swing * 0.6;
      this.rightLeg.rotation.x = -swing * 0.6;
      if (this.leftArm && this.rightArm) {
        this.leftArm.rotation.x = -swing * 0.55;
        this.rightArm.rotation.x = swing * 0.55;
      }
    }

    this.mesh.position.x = this.position.x;
    this.mesh.position.z = this.position.z;
  }

  takeDamage(amount, killer = null) {
    if (this.isDead) return;
    this.health -= amount;
    this.state = 'panic'; // Immediately panic if wounded

    if (this.health <= 0) {
      this.die();
      if (killer && killer.wantedStars !== undefined) {
        killer.wantedStars = Math.max(2, killer.wantedStars + 1);
      }
    }
  }

  die() {
    if (this.isDead) return;
    this.isDead = true;
    this.state = 'knocked';
    this.mesh.rotation.x = Math.PI / 2;
    this.mesh.rotation.z = (Math.random() - 0.5) * 0.6;
    this.mesh.position.y = 0.12;

    // Drop cash stack on ground
    this.dropCash();
  }

  dropCash() {
    const cashGeo = new THREE.BoxGeometry(0.3, 0.1, 0.18);
    const cashMat = new THREE.MeshStandardMaterial({
      color: 0x2e7d32,
      emissive: 0x1b5e20,
      emissiveIntensity: 0.4,
      metalness: 0.2,
      roughness: 0.5
    });
    const cashMesh = new THREE.Mesh(cashGeo, cashMat);
    cashMesh.position.set(this.position.x, 0.1, this.position.z);
    this.scene.add(cashMesh);
    this.cashDrop = {
      mesh: cashMesh,
      amount: 80 + Math.floor(Math.random() * 220),
      collected: false
    };
  }
}
