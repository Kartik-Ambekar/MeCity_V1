import * as THREE from 'three';
import { VehiclePhysics } from '../physics/VehiclePhysics.js';
import { clamp } from '../utils/MathUtils.js';

export class Vehicle {
  constructor(scene, soundSystem, type = 'supercar', options = {}) {
    this.scene = scene;
    this.sounds = soundSystem;
    this.type = type;
    this.id = 'veh_' + Math.random().toString(36).substring(2, 9);

    this.isPolice = type === 'police';
    this.driver = null;
    this.maxHealth = (type === 'suv' || type === 'police') ? 650 : 500;
    this.health = this.maxHealth;
    this.isDestroyed = false;
    this.headlightsOn = false;

    // Siren state for police
    this.sirenActive = false;
    this.sirenTimer = 0;

    // High-performance physics parameters (punchy GTA-style acceleration & responsive reverse)
    let physicsConfig = {
      mass: 1350,
      enginePower: 10500, // Supercar launch torque
      reverseForce: 6800, // Punchy reverse gear torque
      brakeForce: 7800,
      topSpeed: 75, // ~168 mph
      maxSteerAngle: 0.62,
      suspensionStiffness: 24000,
      suspensionDamping: 4800
    };

    if (type === 'muscle') {
      physicsConfig = { mass: 1550, enginePower: 9600, reverseForce: 6200, brakeForce: 7200, topSpeed: 68, maxSteerAngle: 0.58, suspensionStiffness: 22000, suspensionDamping: 4500 };
    } else if (type === 'police') {
      physicsConfig = { mass: 1650, enginePower: 9000, reverseForce: 6000, brakeForce: 7400, topSpeed: 66, maxSteerAngle: 0.60, suspensionStiffness: 25000, suspensionDamping: 4600 };
    } else if (type === 'suv') {
      physicsConfig = { mass: 2000, enginePower: 8200, reverseForce: 5500, brakeForce: 7500, topSpeed: 58, maxSteerAngle: 0.52, suspensionStiffness: 28000, suspensionDamping: 5200 };
    }

    this.physics = new VehiclePhysics(physicsConfig);

    // Three.js visual meshes
    this.mesh = new THREE.Group();
    this.bodyMesh = null;
    this.wheelMeshes = [];
    this.headlights = [];
    this.brakeLights = [];
    this.sirenLights = [];

    // Skidmarks trail array
    this.skidmarks = [];

    // Smoke particles
    this.smokeParticles = [];

    this.createCarModel();
    this.scene.add(this.mesh);
  }

  createCarModel() {
    // 1. Car body chassis
    const bodyGroup = new THREE.Group();

    // Randomize car color per instance for traffic variety
    const carColors = [0xd50000, 0x1565c0, 0x2e7d32, 0xf9a825, 0x6a1b9a, 0x00838f, 0xe65100, 0x37474f, 0xffffff, 0x212121];
    let mainColor = carColors[Math.floor(Math.random() * carColors.length)];
    if (this.type === 'muscle') mainColor = [0xff6d00, 0xd50000, 0x1a237e, 0x33691e][Math.floor(Math.random() * 4)];
    if (this.type === 'police') mainColor = 0x111111;
    if (this.type === 'suv') mainColor = [0x263238, 0x37474f, 0x1b2838, 0x212121][Math.floor(Math.random() * 4)];

    // High-gloss car paint with clearcoat effect
    const paintMat = new THREE.MeshStandardMaterial({
      color: mainColor,
      metalness: 0.88,
      roughness: 0.15,
      envMapIntensity: 1.0,
    });

    // Tinted glass
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x1a2635,
      metalness: 0.95,
      roughness: 0.08,
      transparent: true,
      opacity: 0.75
    });

    const trimMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.55,
      metalness: 0.3
    });

    const carbonMat = new THREE.MeshStandardMaterial({
      color: 0x14161c,
      roughness: 0.3,
      metalness: 0.85
    });

    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xe8e8e8,
      metalness: 1.0,
      roughness: 0.05
    });

    if (this.type === 'supercar') {
      // ── Grotti Furia VI — Low-slung exotic supercar ──

      // Main lower body tub
      const lower = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.44, 4.6), paintMat);
      lower.position.y = 0.36;
      lower.castShadow = true;
      bodyGroup.add(lower);

      // Front hood — angled downward nose
      const hoodGeo = new THREE.BoxGeometry(1.85, 0.18, 1.5);
      const hood = new THREE.Mesh(hoodGeo, paintMat);
      hood.position.set(0, 0.46, 1.5);
      hood.rotation.x = -0.14;
      bodyGroup.add(hood);

      // Front fascia / lower bumper
      const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.28, 0.2), paintMat);
      frontBumper.position.set(0, 0.3, 2.3);
      bodyGroup.add(frontBumper);

      // Carbon splitter (wider than bumper)
      const splitter = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.07, 0.72), carbonMat);
      splitter.position.set(0, 0.14, 2.2);
      bodyGroup.add(splitter);

      // Front dive planes (winglets on sides)
      const diveL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.5), carbonMat);
      diveL.position.set(-1.0, 0.18, 2.0);
      diveL.rotation.z = 0.2;
      const diveR = diveL.clone();
      diveR.position.x = 1.0;
      diveR.rotation.z = -0.2;
      bodyGroup.add(diveL, diveR);

      // A-pillar / roofline (fastback silhouette)
      const aPillarL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.6), paintMat);
      aPillarL.position.set(-0.72, 0.72, 0.6);
      aPillarL.rotation.x = 0.4;
      const aPillarR = aPillarL.clone();
      aPillarR.position.x = 0.72;
      bodyGroup.add(aPillarL, aPillarR);

      // Windshield (tilted forward)
      const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.52, 0.06), glassMat);
      windshield.position.set(0, 0.72, 0.65);
      windshield.rotation.x = 0.42;
      bodyGroup.add(windshield);

      // Cabin greenhouse top
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.38, 1.6), glassMat);
      cabin.position.set(0, 0.84, -0.1);
      cabin.castShadow = true;
      bodyGroup.add(cabin);

      // Side windows (door glass)
      const swinL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 1.5), glassMat);
      swinL.position.set(-0.72, 0.84, -0.1);
      const swinR = swinL.clone();
      swinR.position.x = 0.72;
      bodyGroup.add(swinL, swinR);

      // Rear fastback slope (Kamm tail)
      const rearSlope = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.42, 0.8), paintMat);
      rearSlope.position.set(0, 0.72, -1.1);
      rearSlope.rotation.x = 0.3;
      bodyGroup.add(rearSlope);

      // Rear deck / engine cover
      const rearDeck = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.1, 0.9), carbonMat);
      rearDeck.position.set(0, 0.5, -1.8);
      bodyGroup.add(rearDeck);

      // Rear fender flares (wide body)
      const flareL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.52, 1.6), paintMat);
      flareL.position.set(-1.1, 0.46, -1.3);
      const flareR = flareL.clone();
      flareR.position.x = 1.1;
      bodyGroup.add(flareL, flareR);

      // Rocker panels (side skirts under doors)
      const skirtL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 3.6), carbonMat);
      skirtL.position.set(-1.0, 0.18, -0.1);
      const skirtR = skirtL.clone();
      skirtR.position.x = 1.0;
      bodyGroup.add(skirtL, skirtR);

      // Carbon fiber rear diffuser
      const diffuser = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.22, 0.6), carbonMat);
      diffuser.position.set(0, 0.18, -2.2);
      bodyGroup.add(diffuser);

      // Diffuser fins
      for (let fx = -0.75; fx <= 0.75; fx += 0.3) {
        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.18, 0.55), carbonMat);
        fin.position.set(fx, 0.2, -2.2);
        bodyGroup.add(fin);
      }

      // Quad chrome exhaust tips
      const exMat = chromeMat.clone();
      for (const exX of [-0.5, -0.32, 0.32, 0.5]) {
        const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.28, 10), exMat);
        pipe.rotation.x = Math.PI / 2;
        pipe.position.set(exX, 0.22, -2.3);
        bodyGroup.add(pipe);
        // Inner hollow
        const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.1, 8), new THREE.MeshBasicMaterial({ color: 0x000000 }));
        inner.rotation.x = Math.PI / 2;
        inner.position.set(exX, 0.22, -2.36);
        bodyGroup.add(inner);
      }

      // GT Wing (adjustable-looking carbon)
      const wing = new THREE.Mesh(new THREE.BoxGeometry(1.98, 0.065, 0.46), carbonMat);
      wing.position.set(0, 1.02, -2.0);
      const postL = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.44, 7), carbonMat);
      postL.position.set(-0.68, 0.8, -1.98);
      const postR = postL.clone();
      postR.position.x = 0.68;
      const endL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.26, 0.5), carbonMat);
      endL.position.set(-1.0, 1.02, -2.0);
      const endR = endL.clone();
      endR.position.x = 1.0;
      bodyGroup.add(wing, postL, postR, endL, endR);

    } else if (this.type === 'police') {
      // ── Vapid Interceptor — Police Crown Victoria style ──

      // Main body (American full-size sedan)
      const lower = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.68, 4.8), paintMat);
      lower.position.y = 0.55;
      lower.castShadow = true;
      bodyGroup.add(lower);

      // White door panels (classic VCPD two-tone)
      const whiteMat = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.35, metalness: 0.1 });
      const doorPanelL = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.52, 2.2), whiteMat);
      doorPanelL.position.set(1.025, 0.6, 0.1);
      const doorPanelR = doorPanelL.clone();
      doorPanelR.position.x = -1.025;
      bodyGroup.add(doorPanelL, doorPanelR);

      // Hood (slightly elevated center)
      const hoodMain = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.1, 1.6), paintMat);
      hoodMain.position.set(0, 0.94, 1.4);
      bodyGroup.add(hoodMain);

      // Front grille
      const grille = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.3, 0.08), trimMat);
      grille.position.set(0, 0.5, 2.44);
      bodyGroup.add(grille);
      // Grille slats
      for (let g = -0.6; g <= 0.6; g += 0.15) {
        const slat = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.26, 0.1), new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.9 }));
        slat.position.set(g, 0.5, 2.44);
        bodyGroup.add(slat);
      }

      // Windshield (upright sedan angle)
      const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 0.06), glassMat);
      windshield.position.set(0, 1.08, 0.75);
      windshield.rotation.x = 0.28;
      bodyGroup.add(windshield);

      // Roof
      const roof = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.1, 2.2), whiteMat);
      roof.position.set(0, 1.4, -0.15);
      bodyGroup.add(roof);

      // Cabin glass all round
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.52, 2.0), glassMat);
      cabin.position.set(0, 1.08, -0.2);
      bodyGroup.add(cabin);

      // B-pillar (thick for safety)
      const bpillarL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.18), paintMat);
      bpillarL.position.set(-0.82, 1.08, -0.2);
      const bpillarR = bpillarL.clone();
      bpillarR.position.x = 0.82;
      bodyGroup.add(bpillarL, bpillarR);

      // Push bumper / bull bar
      const pushBarH = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.1, 0.18), trimMat);
      pushBarH.position.set(0, 0.72, 2.46);
      const pushBarV = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.38, 0.18), trimMat);
      pushBarV.position.set(0, 0.5, 2.46);
      bodyGroup.add(pushBarH, pushBarV);

      // Side guard rails along door
      const guardL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 2.5), trimMat);
      guardL.position.set(-1.03, 0.52, 0);
      const guardR = guardL.clone();
      guardR.position.x = 1.03;
      bodyGroup.add(guardL, guardR);

      // Trunk lid
      const trunk = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.08, 1.4), paintMat);
      trunk.position.set(0, 0.94, -1.65);
      bodyGroup.add(trunk);

      // Rear bumper
      const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.32, 0.18), paintMat);
      rearBumper.position.set(0, 0.42, -2.46);
      bodyGroup.add(rearBumper);

      // Emergency lightbar (more detailed)
      const barBase = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.14, 0.32), trimMat);
      barBase.position.set(0, 1.49, -0.2);
      bodyGroup.add(barBase);

      // Individual light pods on bar
      for (let lx = -0.5; lx <= 0.5; lx += 0.25) {
        const pod = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.28), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.8, roughness: 0.3 }));
        pod.position.set(lx, 1.5, -0.2);
        bodyGroup.add(pod);
      }

      const redStrobe = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.1, 0.26), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
      redStrobe.position.set(-0.38, 1.52, -0.2);
      const blueStrobe = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.1, 0.26), new THREE.MeshBasicMaterial({ color: 0x0055ff }));
      blueStrobe.position.set(0.38, 1.52, -0.2);
      bodyGroup.add(redStrobe, blueStrobe);

      const redLight = new THREE.PointLight(0xff0000, 0, 18);
      redLight.position.set(-0.38, 1.7, -0.2);
      const blueLight = new THREE.PointLight(0x0055ff, 0, 18);
      blueLight.position.set(0.38, 1.7, -0.2);
      bodyGroup.add(redLight, blueLight);
      this.sirenLights = [
        { mesh: redStrobe, light: redLight, color: 0xff0000 },
        { mesh: blueStrobe, light: blueLight, color: 0x0055ff }
      ];

    } else {
      // ── Muscle Car / Sedan / SUV ──
      const bodyLength = this.type === 'suv' ? 4.9 : 4.6;
      const bodyWidth = this.type === 'suv' ? 2.1 : 2.0;
      const bodyHeight = this.type === 'suv' ? 0.72 : 0.68;
      const bodyY = this.type === 'suv' ? 0.65 : 0.55;

      const lower = new THREE.Mesh(new THREE.BoxGeometry(bodyWidth, bodyHeight, bodyLength), paintMat);
      lower.position.y = bodyY;
      lower.castShadow = true;
      bodyGroup.add(lower);

      // Front end
      const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(bodyWidth - 0.1, 0.3, 0.2), paintMat);
      frontBumper.position.set(0, bodyY - 0.15, bodyLength / 2 + 0.1);
      bodyGroup.add(frontBumper);

      const grille = new THREE.Mesh(new THREE.BoxGeometry(bodyWidth - 0.4, 0.22, 0.1), trimMat);
      grille.position.set(0, bodyY - 0.05, bodyLength / 2 + 0.12);
      bodyGroup.add(grille);

      // Hood panel
      const hoodPanel = new THREE.Mesh(new THREE.BoxGeometry(bodyWidth - 0.1, 0.08, 1.5), paintMat);
      hoodPanel.position.set(0, bodyY + bodyHeight / 2 + 0.02, bodyLength / 4);
      bodyGroup.add(hoodPanel);

      // Hood scoop for muscle car
      if (this.type === 'muscle') {
        const scoop = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.2, 1.0), carbonMat);
        scoop.position.set(0, bodyY + bodyHeight / 2 + 0.12, bodyLength / 4);
        const scoopMouth = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.12, 0.12), new THREE.MeshBasicMaterial({ color: 0x050505 }));
        scoopMouth.position.set(0, bodyY + bodyHeight / 2 + 0.12, bodyLength / 4 + 0.5);
        bodyGroup.add(scoop, scoopMouth);

        // Rear spoiler for muscle
        const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.3), paintMat);
        spoiler.position.set(0, bodyY + bodyHeight / 2 + 0.1, -bodyLength / 2 + 0.5);
        bodyGroup.add(spoiler);
      }

      // Windshield
      const windshield = new THREE.Mesh(new THREE.BoxGeometry(bodyWidth - 0.4, 0.55, 0.06), glassMat);
      const windY = this.type === 'suv' ? 1.3 : 1.1;
      windshield.position.set(0, windY, bodyLength / 4 - 0.3);
      windshield.rotation.x = this.type === 'suv' ? 0.22 : 0.3;
      bodyGroup.add(windshield);

      // Rear window
      const rearWin = new THREE.Mesh(new THREE.BoxGeometry(bodyWidth - 0.4, 0.45, 0.06), glassMat);
      rearWin.position.set(0, windY - 0.05, -bodyLength / 4 + 0.1);
      rearWin.rotation.x = this.type === 'suv' ? -0.18 : -0.28;
      bodyGroup.add(rearWin);

      // Cabin/roof
      const cabinW = bodyWidth - 0.3;
      const cabinH = this.type === 'suv' ? 0.72 : 0.58;
      const cabinZ = this.type === 'suv' ? 1.1 : 0.85;
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(cabinW, cabinH, cabinZ * 2), glassMat);
      cabin.position.set(0, windY + 0.02, -0.15);
      bodyGroup.add(cabin);

      // Roof panel
      const roofPanel = new THREE.Mesh(new THREE.BoxGeometry(cabinW, 0.08, cabinZ * 2), paintMat);
      roofPanel.position.set(0, windY + cabinH / 2 + 0.02, -0.15);
      bodyGroup.add(roofPanel);

      // Side door trim strips
      const stripL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, bodyLength - 0.8), trimMat);
      stripL.position.set(-bodyWidth / 2 - 0.02, bodyY + 0.05, 0);
      const stripR = stripL.clone();
      stripR.position.x = bodyWidth / 2 + 0.02;
      bodyGroup.add(stripL, stripR);

      // Side skirts (rocker panels)
      const skirtL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, bodyLength - 1.0), carbonMat);
      skirtL.position.set(-bodyWidth / 2 - 0.03, bodyY - 0.25, 0);
      const skirtR = skirtL.clone();
      skirtR.position.x = bodyWidth / 2 + 0.03;
      bodyGroup.add(skirtL, skirtR);

      // Rear bumper
      const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(bodyWidth, 0.28, 0.2), paintMat);
      rearBumper.position.set(0, bodyY - 0.2, -bodyLength / 2 - 0.1);
      bodyGroup.add(rearBumper);

      // Exhaust (twin pipes for muscle, single for sedan/suv)
      const exGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.22, 8);
      if (this.type === 'muscle') {
        for (const ex of [-0.4, 0.4]) {
          const pipe = new THREE.Mesh(exGeo, chromeMat);
          pipe.rotation.x = Math.PI / 2;
          pipe.position.set(ex, bodyY - 0.25, -bodyLength / 2 - 0.08);
          bodyGroup.add(pipe);
        }
      } else {
        const pipe = new THREE.Mesh(exGeo, chromeMat);
        pipe.rotation.x = Math.PI / 2;
        pipe.position.set(0.5, bodyY - 0.25, -bodyLength / 2 - 0.08);
        bodyGroup.add(pipe);
      }
    }

    // ── Shared: Headlights, Taillights, Spotlights ──
    const hlGeo = new THREE.BoxGeometry(0.38, 0.14, 0.06);
    const hlMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const hlL = new THREE.Mesh(hlGeo, hlMat);
    hlL.position.set(-0.68, 0.5, 2.25);
    const hlR = new THREE.Mesh(hlGeo, hlMat);
    hlR.position.set(0.68, 0.5, 2.25);
    bodyGroup.add(hlL, hlR);

    // DRL strips
    const drlMat = new THREE.MeshBasicMaterial({ color: 0xeeeeff });
    const drlL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.04), drlMat);
    drlL.position.set(-0.5, 0.42, 2.26);
    const drlR = drlL.clone();
    drlR.position.x = 0.5;
    bodyGroup.add(drlL, drlR);

    const spotL = new THREE.SpotLight(0xffffff, 2.5, 50, Math.PI / 3.5, 0.35, 1.0);
    spotL.position.set(-0.68, 0.5, 2.25);
    spotL.target.position.set(-0.7, 0.0, 28);
    spotL.visible = false;
    const spotR = new THREE.SpotLight(0xffffff, 2.5, 50, Math.PI / 3.5, 0.35, 1.0);
    spotR.position.set(0.68, 0.5, 2.25);
    spotR.target.position.set(0.7, 0.0, 28);
    spotR.visible = false;
    bodyGroup.add(spotL, spotL.target, spotR, spotR.target);
    this.headlights = [spotL, spotR];

    // Taillights (L-shaped LED style)
    const tlMat = new THREE.MeshBasicMaterial({ color: 0x550000 });
    const tlL = new THREE.Mesh(hlGeo, tlMat);
    tlL.position.set(-0.68, 0.55, -2.25);
    const tlR = new THREE.Mesh(hlGeo, tlMat);
    tlR.position.set(0.68, 0.55, -2.25);
    bodyGroup.add(tlL, tlR);
    this.brakeLights = [tlL, tlR];

    // Tail LED strips
    const ledMat = new THREE.MeshBasicMaterial({ color: 0x880000 });
    const ledL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 0.04), ledMat);
    ledL.position.set(-0.52, 0.55, -2.26);
    const ledR = ledL.clone();
    ledR.position.x = 0.52;
    bodyGroup.add(ledL, ledR);

    this.bodyMesh = bodyGroup;
    this.mesh.add(bodyGroup);

    // ── 3. Realistic Spoked Wheels ──
    // Shared geometry for all vehicles (performance)
    const tireGeo = new THREE.CylinderGeometry(0.37, 0.37, 0.26, 20);
    tireGeo.rotateZ(Math.PI / 2);
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.9, metalness: 0.0 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xd0d0d8, metalness: 0.95, roughness: 0.1 });
    const caliperMat = new THREE.MeshStandardMaterial({ color: this.isPolice ? 0x222222 : 0xd63031, roughness: 0.3, metalness: 0.5 });
    const discMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.92, roughness: 0.18 });
    const hubMat = new THREE.MeshStandardMaterial({ color: 0x202020, metalness: 0.8, roughness: 0.3 });

    for (let i = 0; i < 4; i++) {
      const wGroup = new THREE.Group();

      // Tire (outer rubber ring)
      const tire = new THREE.Mesh(tireGeo, tireMat);
      tire.castShadow = true;
      wGroup.add(tire);

      // Rim dish
      const rimDish = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.22, 16), rimMat);
      rimDish.rotateZ(Math.PI / 2);
      wGroup.add(rimDish);

      // 5-spoke design
      const spokeGeo = new THREE.BoxGeometry(0.52, 0.065, 0.055);
      for (let s = 0; s < 5; s++) {
        const spoke = new THREE.Mesh(spokeGeo, rimMat);
        spoke.rotation.x = (s / 5) * Math.PI * 2;
        spoke.position.y = 0;
        spoke.position.x = (i % 2 === 0) ? -0.07 : 0.07;
        wGroup.add(spoke);
      }

      // Center hub cap
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.24, 8), hubMat);
      hub.rotateZ(Math.PI / 2);
      wGroup.add(hub);

      // Brake disc
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.045, 14), discMat);
      disc.rotateZ(Math.PI / 2);
      disc.position.x = (i % 2 === 0 ? -0.08 : 0.08);
      wGroup.add(disc);

      // Ventilation slots on disc (visual detail)
      for (let v = 0; v < 8; v++) {
        const slot = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.1, 0.048), new THREE.MeshBasicMaterial({ color: 0x111111 }));
        slot.rotation.x = (v / 8) * Math.PI * 2;
        slot.position.x = (i % 2 === 0 ? -0.08 : 0.08);
        slot.position.y = Math.sin((v / 8) * Math.PI * 2) * 0.14;
        slot.position.z = Math.cos((v / 8) * Math.PI * 2) * 0.14;
        wGroup.add(slot);
      }

      // Brembo-style caliper
      const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.12), caliperMat);
      caliper.position.set((i % 2 === 0 ? -0.09 : 0.09), -0.14, 0);
      wGroup.add(caliper);

      this.mesh.add(wGroup);
      this.wheelMeshes.push(wGroup);
    }
  }

  update(dt, worldHeightMap = null) {
    if (this.isDestroyed) return;

    // Update vehicle physics simulation
    this.physics.update(dt, worldHeightMap);

    // Sync Three.js root transform with physics
    this.mesh.position.copy(this.physics.position);
    this.mesh.quaternion.copy(this.physics.quaternion);

    // Apply visual chassis pitch (squat/dive) and roll (cornering)
    if (this.bodyMesh) {
      this.bodyMesh.rotation.x = this.physics.pitchLean;
      this.bodyMesh.rotation.z = this.physics.rollLean;
    }

    // Update 4 wheel positions and rotations
    for (let i = 0; i < this.physics.wheels.length; i++) {
      const pw = this.physics.wheels[i];
      const mw = this.wheelMeshes[i];
      if (mw) {
        // Local position adjusted by suspension compression
        mw.position.copy(pw.localPos);
        mw.position.y = pw.localPos.y - (this.physics.suspensionRestLength - pw.suspensionLength);

        // Steer front wheels
        if (pw.isFront) {
          mw.rotation.y = this.physics.currentSteerAngle;
        } else {
          mw.rotation.y = 0;
        }

        // Spin wheel
        mw.children[0].rotation.x = pw.rotation;
        mw.children[1].rotation.x = pw.rotation;
      }
    }

    // Update brake and reverse lights glow
    const isBraking = this.physics.brakeInput > 0.1;
    const isReversing = this.physics.gear === -1;
    const tlColor = isBraking ? 0xff0000 : (isReversing ? 0xffffff : 0x440000);
    this.brakeLights.forEach(tl => tl.material.color.setHex(tlColor));

    // Update police siren strobes
    if (this.isPolice && this.sirenActive) {
      this.sirenTimer += dt * 8;
      const flashRed = Math.sin(this.sirenTimer) > 0;
      this.sirenLights[0].light.intensity = flashRed ? 3.0 : 0.0;
      this.sirenLights[0].mesh.material.color.setHex(flashRed ? 0xff0000 : 0x330000);

      this.sirenLights[1].light.intensity = !flashRed ? 3.0 : 0.0;
      this.sirenLights[1].mesh.material.color.setHex(!flashRed ? 0x0088ff : 0x001133);
    }

    // Audio & Sound updates if player is driving
    if (this.driver) {
      const speedRatio = this.physics.speed / this.physics.topSpeed;
      this.sounds.updateEngine(this.id, this.physics.rpm, Math.abs(this.physics.throttleInput), speedRatio);
      this.sounds.updateTireSkid(this.physics.driftIntensity);
    }

    // Handle tire skidmarks and smoke when drifting or doing burnouts
    if (this.physics.isDrifting && this.physics.isGrounded) {
      this.emitTireSmoke(dt);
    }

    // Always update and clean up smoke particles regardless of driver state
    this.updateSmokeParticles(dt);
  }

  emitTireSmoke(dt) {
    this.smokeTimer = (this.smokeTimer || 0) - dt;
    if (this.smokeTimer > 0 || this.smokeParticles.length >= 16) return;
    this.smokeTimer = 0.12;

    if (!Vehicle.sharedSmokeGeo) {
      Vehicle.sharedSmokeGeo = new THREE.SphereGeometry(0.35, 6, 6);
      Vehicle.sharedSmokeMat = new THREE.MeshBasicMaterial({
        color: 0xcccccc,
        transparent: true,
        opacity: 0.5
      });
    }

    // Generate tire smoke puff
    for (let i = 2; i < 4; i++) { // Rear wheels
      const pw = this.physics.wheels[i];
      const worldPos = pw.localPos.clone().applyQuaternion(this.mesh.quaternion).add(this.mesh.position);
      worldPos.y = 0.12;

      const puff = new THREE.Mesh(Vehicle.sharedSmokeGeo, Vehicle.sharedSmokeMat.clone());
      puff.position.copy(worldPos);
      this.scene.add(puff);

      this.smokeParticles.push({
        mesh: puff,
        life: 0.5,
        maxLife: 0.5,
        vel: new THREE.Vector3((Math.random() - 0.5) * 1.2, 0.7 + Math.random() * 0.4, (Math.random() - 0.5) * 1.2)
      });
    }
  }

  updateSmokeParticles(dt) {
    for (let i = this.smokeParticles.length - 1; i >= 0; i--) {
      const p = this.smokeParticles[i];
      p.life -= dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      const scale = 1.0 + (1.0 - p.life / p.maxLife) * 2.2;
      p.mesh.scale.set(scale, scale, scale);
      p.mesh.material.opacity = (p.life / p.maxLife) * 0.45;

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.material.dispose();
        this.smokeParticles.splice(i, 1);
      }
    }
  }

  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount);
    if (this.health <= 0 && !this.isDestroyed) {
      this.explode();
    }
  }

  explode() {
    this.isDestroyed = true;
    this.sounds.playExplosion();
    this.sounds.stopEngine(this.id);
    if (this.sirenActive) this.sounds.stopSiren(this.id);

    // Eject driver so player is NEVER trapped or frozen in a destroyed vehicle
    if (this.driver) {
      const p = this.driver;
      if (p.exitVehicle) {
        p.exitVehicle();
        p.takeDamage(25, true); // Blast damage
        // Blast player away from the fireball onto their feet
        const blastOut = this.physics.right.clone().multiplyScalar(-6).add(new THREE.Vector3(0, 4, 0));
        p.velocity.copy(blastOut);
      }
      this.driver = null;
    }

    // Black scorched paint
    if (this.bodyMesh) {
      this.bodyMesh.traverse(child => {
        if (child.isMesh && child.material) {
          child.material = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.95 });
        }
      });
    }

    // Launch car into air with explosion impulse
    this.physics.applyImpulse(new THREE.Vector3(0, 10000, 0));
    this.physics.angularVelocity.set((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 5);
  }

  setDriver(player) {
    this.driver = player;
    this.headlights.forEach(hl => { hl.visible = !!player; });
    if (player) {
      this.sounds.createEngineSynth(this.id, this.type === 'supercar');
      if (this.isPolice && this.sirenActive) {
        this.sounds.startSiren(this.id);
      }
    } else {
      this.sounds.stopEngine(this.id);
      this.sounds.stopSiren(this.id);
      this.sounds.updateTireSkid(0);
      this.physics.throttleInput = 0;
      this.physics.brakeInput = 1.0; // Park brake
    }
  }

  stopSiren() {
    if (!this.isPolice) return;
    this.sirenActive = false;
    this.sounds.stopSiren(this.id);
    this.sirenLights.forEach(sl => {
      sl.light.intensity = 0;
      sl.mesh.material.color.setHex(0x222222);
    });
  }

  toggleSiren() {
    if (!this.isPolice) return;
    if (this.sirenActive) {
      this.stopSiren();
    } else {
      this.sirenActive = true;
      this.sounds.startSiren(this.id);
    }
  }
}
