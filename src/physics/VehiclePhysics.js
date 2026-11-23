import * as THREE from 'three';
import { clamp, lerp } from '../utils/MathUtils.js';

/**
 * High-fidelity Raycast Vehicle Physics System
 * Pacejka tire model, weight transfer, aerodynamic downforce, realistic engine torque curve
 */
export class VehiclePhysics {
  constructor(options = {}) {
    this.mass = options.mass || 1400; // kg
    this.enginePower = options.enginePower || 2600;
    this.brakeForce = options.brakeForce || 3200;
    this.reverseForce = options.reverseForce || 5800;
    this.maxSteerAngle = options.maxSteerAngle || 0.62; // radians (~35 deg)
    this.topSpeed = options.topSpeed || 65; // m/s (~145 mph)
    this.suspensionRestLength = options.suspensionRestLength || 0.45;
    this.suspensionStiffness = options.suspensionStiffness || 22000;
    this.suspensionDamping = options.suspensionDamping || 4800;
    this.dragCoeff = options.dragCoeff || 0.35;
    this.rollingResistance = options.rollingResistance || 18;

    // Aerodynamic downforce coefficient (increases grip at speed)
    this.downforceCoeff = options.downforceCoeff || 0.012;

    // Anti-roll bar stiffness
    this.antiRollStiffness = options.antiRollStiffness || 1800;

    // Dimensions
    this.width = options.width || 2.0;
    this.length = options.length || 4.4;
    this.height = options.height || 1.3;
    this.wheelRadius = options.wheelRadius || 0.35;
    this.cgHeight = options.cgHeight || 0.55; // Centre of gravity height for weight transfer

    // State
    this.position = new THREE.Vector3(0, 0.5, 0);
    this.quaternion = new THREE.Quaternion();
    this.linearVelocity = new THREE.Vector3();
    this.angularVelocity = new THREE.Vector3();

    // Body orientation vectors
    this.forward = new THREE.Vector3(0, 0, 1);
    this.up = new THREE.Vector3(0, 1, 0);
    this.right = new THREE.Vector3(1, 0, 0);

    // Dynamic lean (visual pitch & roll for chassis squat and body roll)
    this.pitchLean = 0;
    this.rollLean = 0;

    // Inputs (-1 to 1)
    this.steeringInput = 0;
    this.throttleInput = 0;
    this.brakeInput = 0;
    this.handbrake = false;

    // Simulation metrics
    this.currentSteerAngle = 0;
    this.speed = 0; // m/s
    this.speedMPH = 0;
    this.rpm = 0.15;
    this.gear = 1;
    this.isDrifting = false;
    this.driftIntensity = 0;
    this.isGrounded = true;

    // Weight distribution (affects per-wheel normal force)
    this.weightTransferFwd = 0;  // positive = nose dives (braking)
    this.weightTransferSide = 0; // positive = right leans (left turn)

    // 4 Wheels definition (FL, FR, RL, RR)
    const halfW = this.width * 0.44;
    const halfL = this.length * 0.36;
    this.wheels = [
      { id: 'FL', localPos: new THREE.Vector3(-halfW, -0.1, halfL), isFront: true, suspensionLength: this.suspensionRestLength, grounded: true, slip: 0, rotation: 0, normalForce: 0 },
      { id: 'FR', localPos: new THREE.Vector3(halfW, -0.1, halfL), isFront: true, suspensionLength: this.suspensionRestLength, grounded: true, slip: 0, rotation: 0, normalForce: 0 },
      { id: 'RL', localPos: new THREE.Vector3(-halfW, -0.1, -halfL), isFront: false, suspensionLength: this.suspensionRestLength, grounded: true, slip: 0, rotation: 0, normalForce: 0 },
      { id: 'RR', localPos: new THREE.Vector3(halfW, -0.1, -halfL), isFront: false, suspensionLength: this.suspensionRestLength, grounded: true, slip: 0, rotation: 0, normalForce: 0 },
    ];

    this.colliders = [];
  }

  setColliders(colliders) {
    this.colliders = colliders;
  }

  // ── Pacejka-inspired Magic Formula lateral force ──────────────────────────────
  // Returns normalised lateral force [0..1] given normalised slip ratio
  _pacejkaLateral(slip) {
    // Approximate: peak at slip ≈ 0.3, then drops off
    const B = 10.5, C = 1.9, D = 1.0, E = 0.5;
    return D * Math.sin(C * Math.atan(B * slip - E * (B * slip - Math.atan(B * slip))));
  }

  // ── Engine torque curve (bell-shaped, peak at mid-RPM) ───────────────────────
  _engineTorqueFactor(rpm) {
    // rpm is normalised 0..1
    // Peak around 0.65 RPM, falls at idle and near redline
    const peak = 0.65;
    const t = (rpm - peak) / 0.35;
    return Math.max(0.15, 1.0 - t * t * 0.6);
  }

  update(dt, worldHeightMap = null) {
    if (dt > 0.1) dt = 0.1; // clamp delta time for stability

    // 1. Update orientation vectors
    this.forward.set(0, 0, 1).applyQuaternion(this.quaternion);
    this.up.set(0, 1, 0).applyQuaternion(this.quaternion);
    this.right.set(1, 0, 0).applyQuaternion(this.quaternion);

    // 2. Compute local velocities
    const forwardVel = this.linearVelocity.dot(this.forward);
    const lateralVel = this.linearVelocity.dot(this.right);
    this.speed = this.linearVelocity.length();
    this.speedMPH = this.speed * 2.23694;

    // Speed-sensitive steering (tighter at high speed for realistic control)
    const steerSpeedFactor = clamp(1.0 - (this.speed / this.topSpeed) * 0.65, 0.3, 1.0);
    const targetSteerAngle = this.steeringInput * this.maxSteerAngle * steerSpeedFactor;
    this.currentSteerAngle = lerp(this.currentSteerAngle, targetSteerAngle, dt * 9);

    // 3. Gravity and Aerodynamic Drag
    const gravity = new THREE.Vector3(0, -9.81 * this.mass, 0);
    const totalForces = gravity.clone();

    // Drag force (Air resistance)
    const dragMag = 0.5 * 1.225 * this.dragCoeff * (this.width * this.height) * (this.speed * this.speed);
    const dragForce = this.linearVelocity.clone().normalize().multiplyScalar(-dragMag);
    if (this.speed > 0.1) totalForces.add(dragForce);

    // Downforce (increases with speed squared, pushes car onto road)
    const downforceMag = this.downforceCoeff * this.mass * this.speed * this.speed;
    totalForces.add(new THREE.Vector3(0, -downforceMag, 0));

    // Rolling resistance
    if (this.isGrounded && this.speed > 0.1) {
      const rollForce = this.linearVelocity.clone().normalize().multiplyScalar(-this.rollingResistance * this.mass * 0.05);
      totalForces.add(rollForce);
    }

    // 4. Weight transfer calculation
    // Longitudinal: braking shifts weight forward, acceleration shifts rearward
    const longAccel = this.linearVelocity.dot(this.forward); // approximation
    const latAccel = this.linearVelocity.dot(this.right);
    const halfWheelbase = this.length * 0.36;
    const halfTrack = this.width * 0.44;

    // Weight transfer torque / wheelbase → weight on each axle
    const wtFwd = (this.mass * 9.81 * this.cgHeight * (this.brakeInput > 0 ? 1 : -this.throttleInput * 0.6)) / (halfWheelbase * 2);
    const wtSide = (this.mass * 9.81 * this.cgHeight * this.currentSteerAngle * 0.4) / (halfTrack * 2);

    this.weightTransferFwd = lerp(this.weightTransferFwd, clamp(wtFwd, -800, 800), dt * 5);
    this.weightTransferSide = lerp(this.weightTransferSide, clamp(wtSide, -600, 600), dt * 5);

    // 5. Wheel suspension & Ground interaction
    let groundedWheelCount = 0;
    let totalDriftSlip = 0;

    for (let i = 0; i < this.wheels.length; i++) {
      const w = this.wheels[i];
      const isFrontWheel = w.isFront;
      const isLeftWheel = (i % 2 === 0);

      // World position of suspension mount
      const wheelWorldPos = w.localPos.clone().applyQuaternion(this.quaternion).add(this.position);

      // Raycast down to find ground elevation
      let groundY = 0;
      if (worldHeightMap) {
        groundY = worldHeightMap(wheelWorldPos.x, wheelWorldPos.z);
      }

      const rayLength = this.suspensionRestLength + this.wheelRadius;
      const distToGround = wheelWorldPos.y - groundY;

      if (distToGround < rayLength) {
        w.grounded = true;
        groundedWheelCount++;

        // Spring compression with smooth damping
        const compression = clamp(rayLength - distToGround, 0, rayLength);
        const springForce = compression * this.suspensionStiffness;

        // Damper force against wheel velocity
        const wheelVel = this.linearVelocity.y;
        const damperForce = -wheelVel * this.suspensionDamping;

        let normalForce = Math.max(0, springForce + damperForce);

        // Apply weight transfer to this wheel's normal force
        // Front axle: +wtFwd, Rear axle: -wtFwd
        // Left side: +wtSide, Right side: -wtSide
        if (isFrontWheel) normalForce += this.weightTransferFwd;
        else normalForce -= this.weightTransferFwd;
        if (isLeftWheel) normalForce -= this.weightTransferSide;
        else normalForce += this.weightTransferSide;

        // Anti-roll bar: resist roll by adding force on compressed side
        const rollFactor = isLeftWheel ? this.weightTransferSide : -this.weightTransferSide;
        normalForce += rollFactor * 0.4;

        normalForce = Math.max(100, normalForce);
        w.normalForce = normalForce;

        totalForces.add(new THREE.Vector3(0, normalForce, 0));
        w.suspensionLength = clamp(distToGround - this.wheelRadius, 0.05, this.suspensionRestLength);

        // Tire rotation
        w.rotation += (forwardVel / this.wheelRadius) * dt;

        // Grip & Traction
        let frictionCoeff = 1.18;
        if (this.handbrake && !isFrontWheel) {
          frictionCoeff = 0.28; // Locked rear wheels for handbrake drift
        }

        // ── Longitudinal Drive/Brake ──
        let drive = 0;
        if (this.throttleInput > 0) {
          // Engine torque curve: more torque at mid RPM
          const torqueCurve = this._engineTorqueFactor(this.rpm);
          const gearMultiplier = this.gear === 1 ? 2.5 : (this.gear === 2 ? 1.75 : (this.gear === 3 ? 1.35 : (this.gear === 4 ? 1.1 : 1.0)));
          const speedFalloff = Math.max(0.18, 1.0 - (this.speed / this.topSpeed));
          drive = (this.throttleInput * (this.enginePower / 4)) * gearMultiplier * speedFalloff * torqueCurve;

          // Rear-wheel drive: only rear wheels get drive torque
          if (isFrontWheel) drive *= 0.0; // pure RWD
        } else if (this.throttleInput < 0) {
          const revSpeedFalloff = Math.max(0.22, 1.0 - (Math.abs(forwardVel) / 18.0));
          drive = (this.throttleInput * (this.reverseForce / 4)) * revSpeedFalloff;
        }

        if (this.brakeInput > 0) {
          const brakeSign = forwardVel > 0 ? -1 : 1;
          drive += brakeSign * (this.brakeInput * this.brakeForce / 4);
        }

        const wheelForward = isFrontWheel ? this.forward.clone().applyAxisAngle(this.up, this.currentSteerAngle) : this.forward.clone();
        const wheelRight = isFrontWheel ? this.right.clone().applyAxisAngle(this.up, this.currentSteerAngle) : this.right.clone();

        totalForces.add(wheelForward.clone().multiplyScalar(drive));

        // ── Lateral Cornering Force — Pacejka Magic Formula ──
        const wheelLateralSpeed = this.linearVelocity.dot(wheelRight);
        const slipAngle = Math.abs(wheelLateralSpeed) / (Math.abs(forwardVel) + 1.0);
        w.slip = slipAngle;

        // Pacejka gives a normalised force coefficient based on slip
        const pacejkaFactor = this._pacejkaLateral(slipAngle);
        const maxLatForce = (normalForce + 800) * frictionCoeff;
        const lateralGripDir = -Math.sign(wheelLateralSpeed);
        let lateralGrip = lateralGripDir * pacejkaFactor * maxLatForce;

        totalForces.add(wheelRight.clone().multiplyScalar(lateralGrip));

        if (!isFrontWheel && (slipAngle > 0.22 || this.handbrake)) {
          totalDriftSlip += slipAngle;
        }
      } else {
        w.grounded = false;
        w.suspensionLength = this.suspensionRestLength;
        w.slip = 0;
        w.normalForce = 0;
      }
    }

    this.isGrounded = groundedWheelCount >= 2;
    this.driftIntensity = clamp(totalDriftSlip / 2, 0, 1.0);
    this.isDrifting = this.driftIntensity > 0.25 && this.speed > 4.0;

    // 6. Angular Dynamics (Steering yaw torque)
    if (this.isGrounded) {
      // Yaw rate proportional to steer angle and forward speed, limited by grip
      const gripLimit = clamp(1.0 - this.driftIntensity * 0.4, 0.4, 1.0);
      const turnSpeed = this.currentSteerAngle * forwardVel * 0.44 * gripLimit;
      this.angularVelocity.y = lerp(this.angularVelocity.y, turnSpeed, dt * 8);

      // Natural pitch and roll damping
      this.angularVelocity.x *= Math.pow(0.08, dt);
      this.angularVelocity.z *= Math.pow(0.08, dt);
    } else {
      // In-air stability — slow spin
      this.angularVelocity.multiplyScalar(Math.pow(0.5, dt));
    }

    // 7. Integrate Linear and Angular Velocity
    const acceleration = totalForces.divideScalar(this.mass);
    this.linearVelocity.addScaledVector(acceleration, dt);

    // Apply linear velocity
    this.position.addScaledVector(this.linearVelocity, dt);

    // Apply angular velocity to quaternion
    const rotDelta = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(
        this.angularVelocity.x * dt,
        this.angularVelocity.y * dt,
        this.angularVelocity.z * dt,
        'YXZ'
      )
    );
    this.quaternion.multiply(rotDelta);

    // Keep car upright if on ground
    if (this.isGrounded) {
      const euler = new THREE.Euler().setFromQuaternion(this.quaternion, 'YXZ');
      euler.x = clamp(euler.x, -0.38, 0.38); // Max ~22 deg pitch
      euler.z = clamp(euler.z, -0.38, 0.38); // Max ~22 deg roll
      this.quaternion.setFromEuler(euler);

      // Floor clamp so it doesn't sink below terrain
      let centerGroundY = 0;
      if (worldHeightMap) {
        centerGroundY = worldHeightMap(this.position.x, this.position.z);
      }
      if (this.position.y < centerGroundY + 0.35) {
        this.position.y = centerGroundY + 0.35;
        if (this.linearVelocity.y < 0) this.linearVelocity.y = 0;
      }
    }

    // 8. Visual Body Lean (Squat, Dive, Roll) — more pronounced for realism
    const forwardAccel = clamp(acceleration.dot(this.forward), -50, 50);
    const lateralAccelV = clamp(acceleration.dot(this.right), -50, 50);
    // Increased multipliers for visible weight transfer effect
    const targetPitch = clamp(-forwardAccel * 0.004, -0.08, 0.08); // Dive on brake, squat on gas
    const targetRoll = clamp(lateralAccelV * 0.0045, -0.1, 0.1);   // Roll on cornering
    this.pitchLean = lerp(this.pitchLean, targetPitch, dt * 5);
    this.rollLean = lerp(this.rollLean, targetRoll, dt * 5);

    // 9. Transmission & RPM Simulation (6 Gears)
    this.updateTransmission();
  }

  updateTransmission() {
    // Realistic speed thresholds for each gear (in m/s)
    const gearSpeedLimits = [0, 7.5, 15.5, 25.0, 36.0, 49.0, 75.0];
    const maxGear = 6;

    const forwardVel = this.linearVelocity.dot(this.forward);
    if (this.throttleInput < 0 || forwardVel < -0.3) {
      this.gear = -1; // Reverse gear
      const revProgress = clamp(Math.abs(forwardVel) / 16.0, 0, 1.0);
      this.rpm = clamp(0.22 + revProgress * 0.72, 0.22, 0.95);
      return;
    }

    // Determine current gear from speed brackets
    let currentGear = 1;
    for (let g = 1; g <= maxGear; g++) {
      if (this.speed >= gearSpeedLimits[g - 1]) {
        currentGear = g;
      }
    }
    this.gear = currentGear;

    // RPM climbs naturally within the current gear and drops on each upshift
    const gearMinSpeed = gearSpeedLimits[this.gear - 1];
    const gearMaxSpeed = gearSpeedLimits[this.gear];
    const gearProgress = clamp((this.speed - gearMinSpeed) / (gearMaxSpeed - gearMinSpeed), 0, 1.0);

    const idleRpm = 0.18;
    let targetRpm = idleRpm + gearProgress * 0.74;
    if (this.throttleInput > 0) {
      targetRpm += 0.1 * this.throttleInput;
    }
    this.rpm = lerp(this.rpm, clamp(targetRpm, idleRpm, 0.98), 0.08);
  }

  applyImpulse(impulseVector, hitPoint = null) {
    const deltaV = impulseVector.clone().divideScalar(this.mass);
    this.linearVelocity.add(deltaV);

    if (hitPoint) {
      const r = hitPoint.clone().sub(this.position);
      const torque = r.cross(impulseVector).divideScalar(this.mass * 2.5);
      this.angularVelocity.add(torque);
    }
  }

  reset(x = 0, y = 0.5, z = 0, rotY = 0) {
    this.position.set(x, y, z);
    this.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
    this.linearVelocity.set(0, 0, 0);
    this.angularVelocity.set(0, 0, 0);
    this.pitchLean = 0;
    this.rollLean = 0;
    this.currentSteerAngle = 0;
    this.weightTransferFwd = 0;
    this.weightTransferSide = 0;
  }
}

