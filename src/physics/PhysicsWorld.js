import * as THREE from 'three';

export class PhysicsWorld {
  constructor() {
    this.boxColliders = [];
    this.staticMeshes = [];
    this.dynamicBodies = [];
  }

  addBoxCollider(box) {
    // box is THREE.Box3
    this.boxColliders.push(box);
  }

  createBuildingCollider(x, z, width, length, height = 40) {
    const min = new THREE.Vector3(x - width / 2, 0, z - length / 2);
    const max = new THREE.Vector3(x + width / 2, height, z + length / 2);
    const box = new THREE.Box3(min, max);
    this.boxColliders.push(box);
    return box;
  }

  // Returns ground height at (x, z)
  getHeightAt(x, z) {
    // Elevated highway / bridge check
    if (Math.abs(x) < 14 && z > 120 && z < 420) {
      // Elevated highway ramp and overpass
      if (z > 120 && z < 180) {
        return ((z - 120) / 60) * 8.0; // Ramp up
      } else if (z >= 180 && z <= 360) {
        return 8.0; // Flat elevated bridge deck
      } else if (z > 360 && z < 420) {
        return 8.0 - ((z - 360) / 60) * 8.0; // Ramp down
      }
    }

    // Beach is solid dry sand at y: 0.0 all the way to shoreline (x: 450)
    if (x > 450) {
      // Shoreline gentle water entry
      const slope = (x - 450) * 0.08;
      return Math.max(-2.0, -slope);
    }

    return 0; // Flat city asphalt and beach sand surface
  }

  checkSphereCollision(center, radius) {
    const sphere = new THREE.Sphere(center, radius);
    for (let i = 0; i < this.boxColliders.length; i++) {
      const box = this.boxColliders[i];
      if (box.intersectsSphere(sphere)) {
        // Compute penetration vector and normal
        const closestPoint = new THREE.Vector3();
        box.clampPoint(center, closestPoint);
        const normal = center.clone().sub(closestPoint);
        const dist = normal.length();
        if (dist < 0.0001) {
          normal.set(0, 1, 0);
          return { collided: true, normal, penetration: radius, point: closestPoint };
        }
        const penetration = radius - dist;
        normal.normalize();
        return { collided: true, normal, penetration, point: closestPoint };
      }
    }
    return { collided: false };
  }

  checkVehicleCollision(vehicle, onCollisionCallback = null) {
    // Robust multi-point vehicle collision test against building and prop box colliders
    const halfW = (vehicle.width || 2.2) * 0.48;
    const halfL = (vehicle.length || 4.8) * 0.48;
    const pos = vehicle.position;
    const quat = vehicle.quaternion;

    const testOffsets = [
      new THREE.Vector3(0, 0.4, halfL),      // front center bumper
      new THREE.Vector3(0, 0.4, -halfL),     // rear center bumper
      new THREE.Vector3(halfW, 0.4, halfL),  // front right
      new THREE.Vector3(-halfW, 0.4, halfL), // front left
      new THREE.Vector3(halfW, 0.4, -halfL), // rear right
      new THREE.Vector3(-halfW, 0.4, -halfL),// rear left
      new THREE.Vector3(halfW, 0.4, 0),      // right flank
      new THREE.Vector3(-halfW, 0.4, 0),     // left flank
      new THREE.Vector3(0, 0.4, 0)           // chassis center
    ];

    for (let c = 0; c < testOffsets.length; c++) {
      const pt = testOffsets[c].applyQuaternion(quat).add(pos);
      for (let b = 0; b < this.boxColliders.length; b++) {
        const box = this.boxColliders[b];
        if (box.containsPoint(pt)) {
          const closest = new THREE.Vector3();
          box.clampPoint(pt, closest);
          const pushDir = pt.clone().sub(closest);
          pushDir.y = 0;

          if (pushDir.lengthSq() < 0.0001) {
            const boxCenter = new THREE.Vector3();
            box.getCenter(boxCenter);
            pushDir.copy(pos).sub(boxCenter);
            pushDir.y = 0;
            if (pushDir.lengthSq() < 0.0001) pushDir.set(0, 0, 1);
          }
          pushDir.normalize();

          const normalVel = vehicle.linearVelocity.dot(pushDir);
          const impactSpeed = Math.abs(normalVel);

          if (impactSpeed > 2.5 && onCollisionCallback) {
            onCollisionCallback(impactSpeed, pt);
          }

          // Push vehicle position outside the building boundary
          vehicle.position.addScaledVector(pushDir, 0.35);

          // Bounce velocity off the wall
          if (normalVel < 0) {
            vehicle.linearVelocity.sub(pushDir.clone().multiplyScalar(normalVel * 1.5));
          }
          vehicle.linearVelocity.multiplyScalar(0.75);
          return true;
        }
      }
    }
    return false;
  }

  raycast(origin, direction, maxDistance = 200) {
    const ray = new THREE.Ray(origin, direction.clone().normalize());
    let closestHit = null;
    let minD = maxDistance;

    for (let i = 0; i < this.boxColliders.length; i++) {
      const box = this.boxColliders[i];
      const target = new THREE.Vector3();
      const hit = ray.intersectBox(box, target);
      if (hit) {
        const d = origin.distanceTo(hit);
        if (d < minD) {
          minD = d;
          closestHit = {
            point: hit,
            distance: d,
            normal: hit.clone().sub(box.getCenter(new THREE.Vector3())).normalize(),
            box: box
          };
        }
      }
    }

    return closestHit;
  }
}
