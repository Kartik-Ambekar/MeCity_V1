import * as THREE from 'three';

/**
 * Procedural GTA VI Street Props:
 * Ultra-Realistic Florida Royal Palms & Coconut Palms, Sculptural Banyan Trees,
 * Modern Cobra-Head Street Lamps, Visored Traffic Lights, Fire Hydrants, Stunt Ramps,
 * Benches, and Trash Bins.
 */
export class Props {

  // ─── PALM FROND ALPHA-MASKED TEXTURE GENERATION ────────────────────────────
  static getPalmFrondTextures() {
    if (Props._palmTextures) return Props._palmTextures;

    // 1. Lush Green Mature Frond Texture (256 x 512 Canvas with feather leaflets)
    const cGreen = document.createElement('canvas');
    cGreen.width = 256;
    cGreen.height = 512;
    const ctx = cGreen.getContext('2d');
    ctx.clearRect(0, 0, 256, 512);

    const centerX = 128;
    const frondHeight = 490;
    const startY = 500;
    const endY = startY - frondHeight;

    // Draw pinnate leaflets branching off both sides of the central rachis
    const numLeaflets = 75;
    for (let i = 0; i < numLeaflets; i++) {
      const t = i / numLeaflets; // 0 at base, 1 at tip
      const y = startY - t * frondHeight;

      // Realistic leaf silhouette: narrow at base, widest around 40-50% height, sharp pointed tip
      const profile = Math.sin(Math.pow(t, 0.75) * Math.PI);
      const leafLen = Math.max(8, profile * 115);

      // Droop and backwards sweep angle: leaflets angle backward towards the tip
      const sweepY = -28 - (1 - t) * 16;

      // Left leaflet
      const gradL = ctx.createLinearGradient(centerX, y, centerX - leafLen, y + sweepY);
      gradL.addColorStop(0, '#1c5a1e');    // Deep stem green
      gradL.addColorStop(0.3, '#2a822d');  // Lush tropical mid-green
      gradL.addColorStop(0.85, '#48b83e'); // Vibrant sunlit green
      gradL.addColorStop(1, '#82d968');    // Bright lime tip

      ctx.strokeStyle = gradL;
      ctx.lineWidth = 3.2 - t * 1.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(centerX - 1, y);
      ctx.quadraticCurveTo(
        centerX - leafLen * 0.5, y + sweepY * 0.35,
        centerX - leafLen, y + sweepY
      );
      ctx.stroke();

      // Right leaflet
      const gradR = ctx.createLinearGradient(centerX, y, centerX + leafLen, y + sweepY);
      gradR.addColorStop(0, '#1c5a1e');
      gradR.addColorStop(0.3, '#2a822d');
      gradR.addColorStop(0.85, '#48b83e');
      gradR.addColorStop(1, '#82d968');

      ctx.strokeStyle = gradR;
      ctx.beginPath();
      ctx.moveTo(centerX + 1, y);
      ctx.quadraticCurveTo(
        centerX + leafLen * 0.5, y + sweepY * 0.35,
        centerX + leafLen, y + sweepY
      );
      ctx.stroke();
    }

    // Central woody rachis (stem spine)
    const stemGrad = ctx.createLinearGradient(centerX, startY, centerX, endY);
    stemGrad.addColorStop(0, '#756038');    // Warm golden-brown woody base
    stemGrad.addColorStop(0.2, '#4a7530');  // Transition to green
    stemGrad.addColorStop(0.7, '#388e3c');  // Fresh green
    stemGrad.addColorStop(1, '#66bb6a');    // Lime tip

    ctx.strokeStyle = stemGrad;
    ctx.lineWidth = 5.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(centerX, startY + 4);
    ctx.lineTo(centerX, endY - 6);
    ctx.stroke();

    // 2. Dry / Dead Frond Texture (For hanging under-skirt)
    const cDry = document.createElement('canvas');
    cDry.width = 256;
    cDry.height = 512;
    const dctx = cDry.getContext('2d');
    dctx.clearRect(0, 0, 256, 512);

    for (let i = 0; i < numLeaflets; i++) {
      const t = i / numLeaflets;
      const y = startY - t * frondHeight;
      const profile = Math.sin(Math.pow(t, 0.75) * Math.PI);
      const leafLen = Math.max(6, profile * 95);
      const sweepY = -34;

      const dryGrad = dctx.createLinearGradient(centerX, y, centerX - leafLen, y + sweepY);
      dryGrad.addColorStop(0, '#5a4225');
      dryGrad.addColorStop(0.5, '#7d5c32');
      dryGrad.addColorStop(1, '#9b7440');

      dctx.strokeStyle = dryGrad;
      dctx.lineWidth = 2.6 - t * 1.2;
      dctx.lineCap = 'round';
      dctx.beginPath();
      dctx.moveTo(centerX - 1, y);
      dctx.quadraticCurveTo(centerX - leafLen * 0.5, y + sweepY * 0.4, centerX - leafLen, y + sweepY);
      dctx.stroke();

      dctx.beginPath();
      dctx.moveTo(centerX + 1, y);
      dctx.quadraticCurveTo(centerX + leafLen * 0.5, y + sweepY * 0.4, centerX + leafLen, y + sweepY);
      dctx.stroke();
    }

    dctx.strokeStyle = '#5a3d1e';
    dctx.lineWidth = 4.5;
    dctx.beginPath();
    dctx.moveTo(centerX, startY);
    dctx.lineTo(centerX, endY);
    dctx.stroke();

    const greenTex = new THREE.CanvasTexture(cGreen);
    const dryTex = new THREE.CanvasTexture(cDry);

    Props._palmTextures = { greenTex, dryTex };
    return Props._palmTextures;
  }

  // ─── PALM TRUNK BARK TEXTURE ───────────────────────────────────────────────
  static getPalmBarkTexture() {
    if (Props._palmBarkTex) return Props._palmBarkTex;

    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Weathered Florida palm gray-brown base
    ctx.fillStyle = '#7a6b5c';
    ctx.fillRect(0, 0, 128, 512);

    // Vertical fibrous grain
    for (let i = 0; i < 90; i++) {
      const x = Math.random() * 128;
      const v = Math.random() * 25 - 12;
      ctx.strokeStyle = `rgba(${110 + v}, ${95 + v}, ${80 + v}, 0.35)`;
      ctx.lineWidth = 1 + Math.random() * 2;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + (Math.random() - 0.5) * 8, 512);
      ctx.stroke();
    }

    // Characteristic horizontal leaf-scar rings
    for (let y = 0; y < 512; y += 18 + (Math.random() * 6)) {
      // Ring shadow
      ctx.strokeStyle = 'rgba(45, 35, 25, 0.45)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(128, y);
      ctx.stroke();

      // Ring highlight
      ctx.strokeStyle = 'rgba(165, 150, 135, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, y + 2.5);
      ctx.lineTo(128, y + 2.5);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 6);
    Props._palmBarkTex = tex;
    return tex;
  }

  // ─── BANYAN / BROADLEAF FOLIAGE CLUSTER TEXTURE ────────────────────────────
  static getBanyanLeafTexture() {
    if (Props._banyanLeafTex) return Props._banyanLeafTex;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 256, 256);

    // Draw clustered realistic ficus/oak leaves with transparent sky gaps
    const leafColors = ['#194d1b', '#206924', '#2d8230', '#3e9c42', '#5bb84f'];
    for (let i = 0; i < 240; i++) {
      const cx = 35 + Math.random() * 186;
      const cy = 35 + Math.random() * 186;
      const angle = Math.random() * Math.PI * 2;
      const w = 14 + Math.random() * 16;
      const h = 8 + Math.random() * 10;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);

      // Oval leaf with pointed tip
      ctx.fillStyle = leafColors[Math.floor(Math.random() * leafColors.length)];
      ctx.beginPath();
      ctx.ellipse(0, 0, w * 0.5, h * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Subtle center vein
      ctx.strokeStyle = 'rgba(255, 255, 200, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-w * 0.5, 0);
      ctx.lineTo(w * 0.5, 0);
      ctx.stroke();

      ctx.restore();
    }

    Props._banyanLeafTex = new THREE.CanvasTexture(canvas);
    return Props._banyanLeafTex;
  }

  // ─── CREATE 3D PALM FROND MESH ─────────────────────────────────────────────
  static createPalmFrondMesh(material, length = 6.2, width = 1.35, archFactor = 1.0, isDry = false) {
    // 4 x 16 grid for smooth 3D compound curvature (arching down + transverse V-fold)
    const geo = new THREE.PlaneGeometry(width, length, 4, 16);
    geo.translate(0, length * 0.5, 0);

    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const t = Math.max(0, Math.min(1, y / length)); // Clamp to [0, 1] to avoid NaN on negative float precision

      // 1. Natural longitudinal arch: rises slightly then swoops gracefully downward
      const droop = (Math.pow(t, 2.1) * 2.6 - Math.sin(t * Math.PI * 0.4) * 0.25) * archFactor;
      pos.setZ(i, -droop);

      // 2. Transverse V-channel fold: leaflets fold upwards from central rachis (x=0)
      const distFromCenter = Math.max(0, Math.min(1, Math.abs(x) / (width * 0.5)));
      const vFold = Math.pow(distFromCenter, 1.2) * (0.28 * (1.0 - t * 0.4));
      pos.setZ(i, pos.getZ(i) + vFold);

      // 3. Frond width tapering towards tip
      const taper = Math.sin(Math.pow(t, 0.7) * Math.PI);
      pos.setX(i, x * Math.max(0.15, taper * 1.1));
    }
    geo.computeVertexNormals();

    const mesh = new THREE.Mesh(geo, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  // ─── ULTRA-REALISTIC FLORIDA PALM TREE ─────────────────────────────────────
  static createPalmTree(options = {}) {
    const group = new THREE.Group();
    const textures = Props.getPalmFrondTextures();
    const barkTex = Props.getPalmBarkTexture();

    const height = options.height || (11 + Math.random() * 3.5);
    const bendX = (Math.random() - 0.5) * 1.6;
    const bendZ = (Math.random() - 0.5) * 1.6;

    // ── 1. Curved Tapered Trunk with Base Flare ──
    const curvePoints = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(bendX * 0.15, height * 0.2, bendZ * 0.15),
      new THREE.Vector3(bendX * 0.45, height * 0.45, bendZ * 0.45),
      new THREE.Vector3(bendX * 0.8, height * 0.7, bendZ * 0.8),
      new THREE.Vector3(bendX, height * 0.88, bendZ),
      new THREE.Vector3(bendX * 1.05, height, bendZ * 1.05)
    ];
    const curve = new THREE.CatmullRomCurve3(curvePoints);

    // Tube with 10 segments around perimeter for smooth cylindrical appearance
    const trunkGeo = new THREE.TubeGeometry(curve, 32, 0.36, 10, false);
    const pos = trunkGeo.attributes.position;
    const uv = trunkGeo.attributes.uv;

    for (let i = 0; i < pos.count; i++) {
      const v = uv.getY(i); // 0 at base, 1 at top
      const cp = curve.getPoint(v);

      // Organic trunk profile: flared wide base at ground, slender middle, slight bulge under crownshaft
      let radiusScale = 1.0;
      if (v < 0.15) {
        // Flared root base (bell shape)
        radiusScale = 1.0 + Math.pow((0.15 - v) / 0.15, 1.8) * 0.65;
      } else if (v > 0.85) {
        // Gentle taper into crownshaft
        radiusScale = 0.75;
      } else {
        // Middle trunk
        radiusScale = 0.78 - v * 0.08;
      }

      const ox = (pos.getX(i) - cp.x) * radiusScale;
      const oz = (pos.getZ(i) - cp.z) * radiusScale;
      pos.setXYZ(i, cp.x + ox, pos.getY(i), cp.z + oz);
    }
    trunkGeo.computeVertexNormals();

    const trunkMat = new THREE.MeshStandardMaterial({
      map: barkTex,
      color: 0x8a7b6a,
      roughness: 0.9,
      metalness: 0.04
    });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    group.add(trunk);

    // ── 2. Prominent Leaf Scar Ring Ridges ──
    const ringMat = new THREE.MeshStandardMaterial({ color: 0x6e5f50, roughness: 0.95 });
    const numRings = 14;
    for (let r = 2; r < numRings; r++) {
      const t = r / numRings;
      const pt = curve.getPoint(t * 0.85);
      const ringRadius = 0.28 * (1.0 - t * 0.15);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(ringRadius, 0.022, 6, 12), ringMat);
      ring.position.copy(pt);
      ring.rotation.x = Math.PI / 2;
      group.add(ring);
    }

    // ── 3. Smooth Emerald-Green Crownshaft (Signature of Royal Palm) ──
    const topPt = curvePoints[curvePoints.length - 1];
    const subTopPt = curvePoints[curvePoints.length - 2];
    const shaftDir = topPt.clone().sub(subTopPt).normalize();

    const shaftGeo = new THREE.CylinderGeometry(0.24, 0.26, 1.4, 12);
    const shaftMat = new THREE.MeshStandardMaterial({
      color: 0x226622,
      roughness: 0.35,
      metalness: 0.15
    });
    const crownshaft = new THREE.Mesh(shaftGeo, shaftMat);
    crownshaft.position.copy(topPt).addScaledVector(shaftDir, 0.65);
    crownshaft.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), shaftDir);
    crownshaft.castShadow = true;
    group.add(crownshaft);

    // Fibrous brown petiole collar under crown
    const collar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.27, 0.35, 10),
      new THREE.MeshStandardMaterial({ color: 0x5a3f24, roughness: 0.92 })
    );
    collar.position.copy(topPt).addScaledVector(shaftDir, 0.1);
    collar.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), shaftDir);
    group.add(collar);

    // ── 4. Multi-Layer Realistic Frond Crown ──
    const crownApex = crownshaft.position.clone().addScaledVector(shaftDir, 0.7);

    if (!Props._frondMatGreen) {
      Props._frondMatGreen = new THREE.MeshStandardMaterial({
        map: textures.greenTex,
        alphaTest: 0.2,
        side: THREE.DoubleSide,
        roughness: 0.55,
        metalness: 0.05
      });
      Props._frondMatDry = new THREE.MeshStandardMaterial({
        map: textures.dryTex,
        alphaTest: 0.2,
        side: THREE.DoubleSide,
        roughness: 0.9,
        metalness: 0.0
      });
    }

    const frondLayers = [
      // Layer 1: Upper young fronds (5 fronds, arching upward/outward)
      { count: 5, pitch: 0.35, len: 5.6, wid: 1.25, arch: 0.85, rotSpread: 0.2, isDry: false },
      // Layer 2: Middle mature fronds (8 fronds, spreading full canopy)
      { count: 8, pitch: 0.65, len: 6.5, wid: 1.45, arch: 1.1, rotSpread: 0.3, isDry: false },
      // Layer 3: Lower drooping fronds (7 fronds, heavy curved droop)
      { count: 7, pitch: 0.98, len: 6.0, wid: 1.35, arch: 1.35, rotSpread: 0.4, isDry: false },
      // Layer 4: Dry hanging under-skirt (4 fronds, dangling dry against trunk)
      { count: 4, pitch: 1.45, len: 4.8, wid: 1.15, arch: 1.5, rotSpread: 0.5, isDry: true }
    ];

    frondLayers.forEach(layer => {
      const mat = layer.isDry ? Props._frondMatDry : Props._frondMatGreen;
      for (let i = 0; i < layer.count; i++) {
        const azimuth = (i / layer.count) * Math.PI * 2 + Math.random() * layer.rotSpread;
        const frondMesh = Props.createPalmFrondMesh(mat, layer.len, layer.wid, layer.arch, layer.isDry);

        // Position frond mount at crown apex
        frondMesh.position.copy(crownApex);

        // Rotate frond radially outward and pitch downward
        frondMesh.rotation.y = azimuth;
        frondMesh.rotation.x = layer.pitch + (Math.random() - 0.5) * 0.12;
        frondMesh.rotation.z = (Math.random() - 0.5) * 0.08;

        group.add(frondMesh);
      }
    });

    // ── 5. Coconut Bunches with Stalks ──
    const nutGeo = new THREE.SphereGeometry(0.24, 8, 8);
    nutGeo.scale(1, 1.25, 1); // Oval coconut shape
    const nutMat = new THREE.MeshStandardMaterial({ color: 0x4a341b, roughness: 0.85, metalness: 0.0 });
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x6e522a, roughness: 0.9 });

    for (let c = 0; c < 2; c++) {
      const clusterAngle = c * Math.PI + Math.random() * 0.5;
      const clusterPos = crownApex.clone().add(new THREE.Vector3(
        Math.cos(clusterAngle) * 0.35,
        -0.45,
        Math.sin(clusterAngle) * 0.35
      ));

      // Hanging stalk
      const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 6), stemMat);
      stalk.position.copy(clusterPos).add(new THREE.Vector3(0, 0.18, 0));
      group.add(stalk);

      for (let n = 0; n < 3; n++) {
        const nut = new THREE.Mesh(nutGeo, nutMat);
        nut.position.copy(clusterPos).add(new THREE.Vector3(
          (Math.random() - 0.5) * 0.35,
          -n * 0.18,
          (Math.random() - 0.5) * 0.35
        ));
        nut.castShadow = true;
        group.add(nut);
      }
    }

    const scale = options.scale || (0.9 + Math.random() * 0.25);
    group.scale.set(scale, scale, scale);

    return group;
  }

  // ─── SCULPTURAL BANYAN / FLORIDA LIVE OAK TREE ─────────────────────────────
  static createBanyanTree() {
    const group = new THREE.Group();
    const leafTex = Props.getBanyanLeafTexture();

    if (!Props._banyanBarkMat) {
      const bc = document.createElement('canvas');
      bc.width = 128; bc.height = 256;
      const bctx = bc.getContext('2d');
      bctx.fillStyle = '#4e3b2b';
      bctx.fillRect(0, 0, 128, 256);
      // Gnarled wood grain with lichen patches
      for (let i = 0; i < 60; i++) {
        const x = Math.random() * 128;
        bctx.strokeStyle = `rgba(35, 25, 18, ${0.25 + Math.random() * 0.3})`;
        bctx.lineWidth = 1 + Math.random() * 3;
        bctx.beginPath();
        bctx.moveTo(x, 0);
        bctx.lineTo(x + (Math.random() - 0.5) * 20, 256);
        bctx.stroke();
      }
      for (let i = 0; i < 20; i++) {
        bctx.fillStyle = 'rgba(140, 160, 130, 0.2)';
        bctx.beginPath();
        bctx.arc(Math.random() * 128, Math.random() * 256, 4 + Math.random() * 8, 0, Math.PI * 2);
        bctx.fill();
      }
      const bTex = new THREE.CanvasTexture(bc);
      bTex.wrapS = THREE.RepeatWrapping;
      bTex.wrapT = THREE.RepeatWrapping;
      bTex.repeat.set(2, 4);

      Props._banyanBarkMat = new THREE.MeshStandardMaterial({
        map: bTex,
        color: 0x5a4634,
        roughness: 0.95,
        metalness: 0.02
      });

      Props._banyanFoliageMat = new THREE.MeshStandardMaterial({
        map: leafTex,
        alphaTest: 0.22,
        side: THREE.DoubleSide,
        roughness: 0.65,
        metalness: 0.05
      });

      Props._mossMat = new THREE.MeshStandardMaterial({
        color: 0xa8bca0,
        transparent: true,
        opacity: 0.72,
        roughness: 0.9,
        side: THREE.DoubleSide
      });
    }

    // ── 1. Thick Sculpted Trunk with Fluted Buttress Roots ──
    const mainTrunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.75, 1.25, 5.5, 12),
      Props._banyanBarkMat
    );
    mainTrunk.position.y = 2.75;
    mainTrunk.castShadow = true;
    group.add(mainTrunk);

    // 6 Sprawling buttress roots anchoring into the pavement
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const rootCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(Math.cos(angle) * 0.7, 3.2, Math.sin(angle) * 0.7),
        new THREE.Vector3(Math.cos(angle) * 1.4, 1.2, Math.sin(angle) * 1.4),
        new THREE.Vector3(Math.cos(angle) * 2.4, 0.05, Math.sin(angle) * 2.4)
      ]);
      const rootGeo = new THREE.TubeGeometry(rootCurve, 8, 0.22, 6, false);
      const root = new THREE.Mesh(rootGeo, Props._banyanBarkMat);
      root.castShadow = true;
      group.add(root);
    }

    // ── 2. Massive Sculptural Boughs ──
    const boughAngles = [0.2, 1.8, 3.4, 4.9];
    const foliageClusterPoints = [];

    boughAngles.forEach((angle, bi) => {
      const reach = 4.5 + Math.random() * 1.5;
      const lift = 3.5 + Math.random() * 1.0;

      const boughCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(Math.cos(angle) * 0.5, 4.8, Math.sin(angle) * 0.5),
        new THREE.Vector3(Math.cos(angle) * reach * 0.45, 6.2, Math.sin(angle) * reach * 0.45),
        new THREE.Vector3(Math.cos(angle) * reach, 5.5 + lift * 0.4, Math.sin(angle) * reach)
      ]);
      const boughGeo = new THREE.TubeGeometry(boughCurve, 12, 0.38, 8, false);
      const bough = new THREE.Mesh(boughGeo, Props._banyanBarkMat);
      bough.castShadow = true;
      group.add(bough);

      const boughEnd = new THREE.Vector3(Math.cos(angle) * reach, 5.5 + lift * 0.4, Math.sin(angle) * reach);
      foliageClusterPoints.push(boughEnd);

      // Sub-branches splitting off
      for (let s = -1; s <= 1; s += 2) {
        const subAngle = angle + s * 0.55;
        const subPt = new THREE.Vector3(
          Math.cos(subAngle) * (reach + 1.8),
          7.2 + Math.random() * 1.2,
          Math.sin(subAngle) * (reach + 1.8)
        );
        const subCurve = new THREE.CatmullRomCurve3([
          boughCurve.getPoint(0.65),
          subPt
        ]);
        const subGeo = new THREE.TubeGeometry(subCurve, 6, 0.18, 6, false);
        const subMesh = new THREE.Mesh(subGeo, Props._banyanBarkMat);
        subMesh.castShadow = true;
        group.add(subMesh);
        foliageClusterPoints.push(subPt);

        // Hanging Spanish moss tendril
        if (Math.random() > 0.3) {
          const mossGeo = new THREE.PlaneGeometry(0.4, 2.2 + Math.random() * 1.2);
          const moss = new THREE.Mesh(mossGeo, Props._mossMat);
          moss.position.copy(boughCurve.getPoint(0.65)).add(new THREE.Vector3(0, -1.2, 0));
          group.add(moss);
        }
      }

      // ── 3. Aerial Prop Roots (The hallmark of Banyan trees) ──
      // Drop vertical roots from the bough down to the ground
      const propOrigin = boughCurve.getPoint(0.55);
      const propCurve = new THREE.CatmullRomCurve3([
        propOrigin,
        new THREE.Vector3(propOrigin.x + (Math.random() - 0.5) * 0.25, propOrigin.y * 0.5, propOrigin.z + (Math.random() - 0.5) * 0.25),
        new THREE.Vector3(propOrigin.x, 0, propOrigin.z)
      ]);
      const propRootGeo = new THREE.TubeGeometry(propCurve, 8, 0.08, 6, false);
      const propRoot = new THREE.Mesh(propRootGeo, Props._banyanBarkMat);
      propRoot.castShadow = true;
      group.add(propRoot);
    });

    // Central crown top point
    foliageClusterPoints.push(new THREE.Vector3(0, 9.2, 0));
    foliageClusterPoints.push(new THREE.Vector3(1.2, 8.8, -1.0));
    foliageClusterPoints.push(new THREE.Vector3(-1.2, 8.8, 1.0));

    // ── 4. Realistic Foliage Clusters with Intersecting Leaf Planes ──
    // Replaces solid spheres with multi-angle crossed alpha-masked leaf clusters!
    foliageClusterPoints.forEach(pt => {
      const clusterGroup = new THREE.Group();
      const clusterRadius = 3.2 + Math.random() * 1.2;

      // 3 Crossed vertical foliage planes + 1 horizontal umbrella plane
      const planeGeo = new THREE.PlaneGeometry(clusterRadius * 1.8, clusterRadius * 1.4);
      const angles = [0, Math.PI / 3, (Math.PI * 2) / 3];

      angles.forEach(ang => {
        const leafPlane = new THREE.Mesh(planeGeo, Props._banyanFoliageMat);
        leafPlane.rotation.y = ang;
        leafPlane.castShadow = true;
        leafPlane.receiveShadow = true;
        clusterGroup.add(leafPlane);
      });

      // Horizontal canopy plane
      const horizPlane = new THREE.Mesh(new THREE.PlaneGeometry(clusterRadius * 1.8, clusterRadius * 1.8), Props._banyanFoliageMat);
      horizPlane.rotation.x = Math.PI / 2;
      horizPlane.position.y = clusterRadius * 0.35;
      clusterGroup.add(horizPlane);

      clusterGroup.position.copy(pt);
      group.add(clusterGroup);
    });

    const scale = 0.85 + Math.random() * 0.35;
    group.scale.set(scale, scale, scale);
    return group;
  }

  // ─── TROPICAL SIDEWALK PLANTER BED WITH FLOWERING SHRUBS ────────────────────
  static createTropicalPlanter() {
    const group = new THREE.Group();

    // Concrete curb border
    const curbMat = new THREE.MeshStandardMaterial({ color: 0xc8c4bc, roughness: 0.85 });
    const curb = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.22, 2.6), curbMat);
    curb.position.y = 0.11;
    group.add(curb);

    // Dark rich mulch soil
    const soilMat = new THREE.MeshStandardMaterial({ color: 0x3d2b1f, roughness: 0.95 });
    const soil = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.2, 2.3), soilMat);
    soil.position.y = 0.12;
    group.add(soil);

    // Vibrant Miami Magenta / Pink Bougainvillea & Ferns
    const flowerMat = new THREE.MeshStandardMaterial({
      color: Math.random() > 0.4 ? 0xe91e63 : 0xff5722, // Magenta / Coral
      roughness: 0.65,
      side: THREE.DoubleSide
    });
    const fernMat = new THREE.MeshStandardMaterial({
      color: 0x2e7d32,
      roughness: 0.7,
      side: THREE.DoubleSide
    });

    for (let i = 0; i < 5; i++) {
      const shrubGeo = new THREE.DodecahedronGeometry(0.45 + Math.random() * 0.25, 1);
      const shrub = new THREE.Mesh(shrubGeo, i % 2 === 0 ? flowerMat : fernMat);
      shrub.position.set(
        (Math.random() - 0.5) * 1.6,
        0.35 + Math.random() * 0.2,
        (Math.random() - 0.5) * 1.6
      );
      shrub.castShadow = true;
      group.add(shrub);
    }

    return group;
  }

  // ─── STREET LIGHT (Modern Cobra-Head LED) ───────────────────────────────────
  static createStreetLight() {
    const group = new THREE.Group();
    const metalMat = new THREE.MeshStandardMaterial({
      color: 0x1a1e24,
      metalness: 0.85,
      roughness: 0.25
    });
    const galvMat = new THREE.MeshStandardMaterial({
      color: 0x505860,
      metalness: 0.7,
      roughness: 0.4
    });

    // Base flange
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.4, 10), galvMat);
    base.position.y = 0.2;
    group.add(base);

    // Pole (tapered)
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.18, 9.0, 10), metalMat);
    pole.position.y = 4.9;
    pole.castShadow = true;
    group.add(pole);

    // Curved swan-neck arm
    const armCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 9.0, 0),
      new THREE.Vector3(0.5, 9.4, 0),
      new THREE.Vector3(1.4, 9.5, 0),
      new THREE.Vector3(2.2, 9.2, 0),
      new THREE.Vector3(2.6, 8.8, 0),
    ]);
    const armGeo = new THREE.TubeGeometry(armCurve, 12, 0.07, 7, false);
    const arm = new THREE.Mesh(armGeo, metalMat);
    arm.castShadow = true;
    group.add(arm);

    // Lamp housing (cobra-head style)
    const housingGeo = new THREE.CylinderGeometry(0.25, 0.32, 0.22, 10);
    const housing = new THREE.Mesh(housingGeo, galvMat);
    housing.position.set(2.6, 8.65, 0);
    housing.rotation.x = 0.1;
    group.add(housing);

    // LED lens (emissive warm white)
    const bulbGeo = new THREE.CircleGeometry(0.2, 10);
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfff3c0, side: THREE.DoubleSide });
    const bulb = new THREE.Mesh(bulbGeo, bulbMat);
    bulb.position.set(2.6, 8.53, 0);
    bulb.rotation.x = Math.PI / 2;
    group.add(bulb);

    // Reflector dish
    const dishGeo = new THREE.ConeGeometry(0.22, 0.15, 10, 1, true);
    const dishMat = new THREE.MeshStandardMaterial({ color: 0xd0d0a0, metalness: 0.9, roughness: 0.1, side: THREE.BackSide });
    const dish = new THREE.Mesh(dishGeo, dishMat);
    dish.position.set(2.6, 8.72, 0);
    dish.rotation.x = Math.PI;
    group.add(dish);

    return { group, bulbMat };
  }

  // ─── TRAFFIC LIGHT ─────────────────────────────────────────────────────────────
  static createTrafficLight() {
    const group = new THREE.Group();
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x151515, metalness: 0.65, roughness: 0.35 });
    const silverMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.3 });

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.5, 10), silverMat);
    base.position.y = 0.25;
    group.add(base);

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.16, 7.0, 9), darkMat);
    pole.position.y = 3.75;
    pole.castShadow = true;
    group.add(pole);

    const box = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.6, 0.5), darkMat);
    box.position.set(0, 5.9, 0);
    group.add(box);

    const visorGeo = new THREE.BoxGeometry(0.52, 0.12, 0.28);
    [6.6, 5.9, 5.2].forEach(y => {
      const visor = new THREE.Mesh(visorGeo, darkMat);
      visor.position.set(0, y, 0.3);
      group.add(visor);
    });

    const bulbGeo = new THREE.SphereGeometry(0.14, 12, 10);
    const redMat = new THREE.MeshBasicMaterial({ color: 0xff1111 });
    const yelMat = new THREE.MeshBasicMaterial({ color: 0x442200 });
    const grnMat = new THREE.MeshBasicMaterial({ color: 0x003311 });

    const red = new THREE.Mesh(bulbGeo, redMat);
    red.position.set(0, 6.55, 0.27);
    const yellow = new THREE.Mesh(bulbGeo, yelMat);
    yellow.position.set(0, 5.90, 0.27);
    const green = new THREE.Mesh(bulbGeo, grnMat);
    green.position.set(0, 5.25, 0.27);

    group.add(red, yellow, green);
    return { group, redMat, yelMat, grnMat };
  }

  // ─── FIRE HYDRANT ──────────────────────────────────────────────────────────────
  static createFireHydrant() {
    const group = new THREE.Group();
    const redMat = new THREE.MeshStandardMaterial({ color: 0xcc2020, roughness: 0.45, metalness: 0.35 });
    const silverMat = new THREE.MeshStandardMaterial({ color: 0xd0d0d0, metalness: 0.85, roughness: 0.2 });
    const capMat = new THREE.MeshStandardMaterial({ color: 0xffcc00, metalness: 0.6, roughness: 0.3 });

    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.28, 0.12, 12), silverMat);
    foot.position.y = 0.06;
    group.add(foot);

    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.23, 0.72, 12), redMat);
    body.position.y = 0.42;
    group.add(body);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.18, 10), redMat);
    neck.position.y = 0.87;
    group.add(neck);

    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.12, 5), capMat);
    cap.position.y = 1.0;
    group.add(cap);

    const nozGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.22, 8);
    const noz1 = new THREE.Mesh(nozGeo, silverMat);
    noz1.rotation.z = Math.PI / 2;
    noz1.position.set(0.24, 0.52, 0);
    const cap1 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.04, 8), silverMat);
    cap1.rotation.z = Math.PI / 2;
    cap1.position.set(0.36, 0.52, 0);

    const noz2 = new THREE.Mesh(nozGeo, silverMat);
    noz2.rotation.z = -Math.PI / 2;
    noz2.position.set(-0.24, 0.52, 0);
    const cap2 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.04, 8), silverMat);
    cap2.rotation.z = Math.PI / 2;
    cap2.position.set(-0.36, 0.52, 0);

    group.add(noz1, cap1, noz2, cap2);
    return group;
  }

  // ─── STUNT RAMP ────────────────────────────────────────────────────────────────
  static createStuntRamp() {
    const group = new THREE.Group();
    const rampGeo = new THREE.BoxGeometry(4.5, 0.3, 8.0);
    const rampMat = new THREE.MeshStandardMaterial({ color: 0xffbb00, roughness: 0.5, metalness: 0.25 });
    const ramp = new THREE.Mesh(rampGeo, rampMat);
    ramp.position.set(0, 1.2, 0);
    ramp.rotation.x = -0.32;
    ramp.castShadow = true;

    const baseGeo = new THREE.BoxGeometry(4.6, 0.8, 3.0);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.set(0, 0.4, -2.5);

    const stripeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    for (let i = -1.5; i <= 1.5; i += 0.75) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.32, 0.01), stripeMat);
      stripe.position.set(i, 0.42, 1.0);
      stripe.rotation.x = -0.32;
      group.add(stripe);
    }

    group.add(ramp, base);
    return group;
  }

  // ─── BENCH ─────────────────────────────────────────────────────────────────────
  static createBench() {
    const group = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.9, metalness: 0.0 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.5, metalness: 0.8 });

    for (let i = -0.4; i <= 0.4; i += 0.2) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 1.5), woodMat);
      slat.position.set(i, 0.52, 0);
      group.add(slat);
    }
    for (let i = -0.4; i <= 0.4; i += 0.2) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.4, 1.5), woodMat);
      slat.position.set(i, 0.82, -0.3);
      slat.rotation.x = -0.15;
      group.add(slat);
    }
    [[-0.5, -0.6], [-0.5, 0.6], [0.5, -0.6], [0.5, 0.6]].forEach(([x, z]) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.55, 6), metalMat);
      leg.position.set(x, 0.27, z);
      group.add(leg);
    });
    return group;
  }

  // ─── TRASH BIN ────────────────────────────────────────────────────────────────
  static createTrashBin() {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x2a4a1a, roughness: 0.75, metalness: 0.3 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.9, 10), mat);
    body.position.y = 0.45;
    group.add(body);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.07, 10), mat);
    lid.position.y = 0.93;
    group.add(lid);
    return group;
  }
}
