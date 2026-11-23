import * as THREE from 'three';
import { Props } from './Props.js';

export class CityBuilder {
  constructor(scene, physicsWorld, roadNetwork) {
    this.scene = scene;
    this.physics = physicsWorld;
    this.roads = roadNetwork;
    this.neonMaterials = [];
    this.streetLights = [];
    this.trafficLights = [];
    this.explosivePumps = [];
    this.hydrants = [];
    this.windowMaterials = [];

    // Procedural window textures for skyscrapers and hotels
    const skyTex = this.generateSkyscraperTextures();
    this.skyscraperMap = skyTex.map;
    this.skyscraperEmissive = skyTex.emissiveMap;

    const hotelTex = this.generateHotelTextures();
    this.hotelMap = hotelTex.map;
    this.hotelEmissive = hotelTex.emissiveMap;
  }

  generateSkyscraperTextures() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    const eCanvas = document.createElement('canvas');
    eCanvas.width = 512;
    eCanvas.height = 512;
    const eCtx = eCanvas.getContext('2d');

    ctx.fillStyle = '#2d3748';
    ctx.fillRect(0, 0, 512, 512);

    eCtx.fillStyle = '#000000';
    eCtx.fillRect(0, 0, 512, 512);

    // Architectural grid of office windows
    const cols = 16;
    const rows = 32;
    const winW = 20;
    const winH = 10;
    const padX = 12;
    const padY = 6;
    const litColors = ['#ffeaa7', '#fff9e6', '#dfe6e9', '#81ecec', '#fab1a0'];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * (winW + padX) + 6;
        const y = r * (winH + padY) + 6;

        const isLit = Math.random() > 0.45;
        if (isLit) {
          const col = litColors[Math.floor(Math.random() * litColors.length)];
          ctx.fillStyle = col;
          ctx.fillRect(x, y, winW, winH);

          eCtx.fillStyle = col;
          eCtx.fillRect(x, y, winW, winH);
        } else {
          ctx.fillStyle = '#4a5568';
          ctx.fillRect(x, y, winW, winH);
        }
      }
    }

    const map = new THREE.CanvasTexture(canvas);
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;

    const emissiveMap = new THREE.CanvasTexture(eCanvas);
    emissiveMap.wrapS = THREE.RepeatWrapping;
    emissiveMap.wrapT = THREE.RepeatWrapping;

    return { map, emissiveMap };
  }

  generateHotelTextures() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    const eCanvas = document.createElement('canvas');
    eCanvas.width = 512;
    eCanvas.height = 512;
    const eCtx = eCanvas.getContext('2d');

    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(0, 0, 512, 512);
    eCtx.fillStyle = '#000000';
    eCtx.fillRect(0, 0, 512, 512);

    // Hotel guest room balconies and glowing warm windows
    for (let r = 0; r < 16; r++) {
      for (let c = 0; c < 12; c++) {
        const x = c * 42 + 8;
        const y = r * 32 + 8;

        const isLit = Math.random() > 0.35;
        if (isLit) {
          ctx.fillStyle = '#ffeaa7';
          ctx.fillRect(x, y, 28, 18);
          eCtx.fillStyle = '#ffeaa7';
          eCtx.fillRect(x, y, 28, 18);
        } else {
          ctx.fillStyle = '#94a3b8';
          ctx.fillRect(x, y, 28, 18);
        }
        // Balcony railing
        ctx.strokeStyle = '#38bdf8';
        ctx.strokeRect(x - 2, y + 16, 32, 6);
      }
    }

    const map = new THREE.CanvasTexture(canvas);
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;

    const emissiveMap = new THREE.CanvasTexture(eCanvas);
    emissiveMap.wrapS = THREE.RepeatWrapping;
    emissiveMap.wrapT = THREE.RepeatWrapping;

    return { map, emissiveMap };
  }

  build() {
    this.createGround();
    this.createRoadGrid();
    this.createRoadMarkings();
    this.createBeachDistrict();
    this.createArtDecoStrip();
    this.createDowntownSkyscrapers();
    this.createElevatedHighway();
    this.createGasStation();
    this.createIndustrialDocks();
    this.createStreetFurniture();
    this.createSmallBuildings();
  }

  createGround() {
    // Asphalt ground texture
    const asphaltCanvas = document.createElement('canvas');
    asphaltCanvas.width = 256;
    asphaltCanvas.height = 256;
    const actx = asphaltCanvas.getContext('2d');
    actx.fillStyle = '#3a3a3a';
    actx.fillRect(0, 0, 256, 256);
    // Add subtle noise for asphalt grain
    for (let i = 0; i < 4000; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const v = Math.floor(Math.random() * 20);
      actx.fillStyle = `rgb(${48 + v},${48 + v},${48 + v})`;
      actx.fillRect(x, y, 1.5, 1.5);
    }
    const asphaltTex = new THREE.CanvasTexture(asphaltCanvas);
    asphaltTex.wrapS = THREE.RepeatWrapping;
    asphaltTex.wrapT = THREE.RepeatWrapping;
    asphaltTex.repeat.set(80, 80);

    // Concrete sidewalk texture
    const concCanvas = document.createElement('canvas');
    concCanvas.width = 256;
    concCanvas.height = 256;
    const cctx = concCanvas.getContext('2d');
    cctx.fillStyle = '#a0a090';
    cctx.fillRect(0, 0, 256, 256);
    // concrete tile grid
    cctx.strokeStyle = '#909080';
    cctx.lineWidth = 2;
    for (let g = 0; g < 256; g += 32) {
      cctx.beginPath(); cctx.moveTo(g, 0); cctx.lineTo(g, 256); cctx.stroke();
      cctx.beginPath(); cctx.moveTo(0, g); cctx.lineTo(256, g); cctx.stroke();
    }
    const concTex = new THREE.CanvasTexture(concCanvas);
    concTex.wrapS = THREE.RepeatWrapping;
    concTex.wrapT = THREE.RepeatWrapping;
    concTex.repeat.set(40, 40);

    // City asphalt ground
    const cityGeo = new THREE.PlaneGeometry(800, 800);
    cityGeo.rotateX(-Math.PI / 2);
    const cityMat = new THREE.MeshStandardMaterial({
      map: asphaltTex,
      color: 0x484848,
      roughness: 0.92,
      metalness: 0.04
    });
    const cityGround = new THREE.Mesh(cityGeo, cityMat);
    cityGround.receiveShadow = true;
    this.scene.add(cityGround);

    // Sidewalk layer (concrete, slightly elevated)
    const sidewalkMat = new THREE.MeshStandardMaterial({
      map: concTex,
      color: 0x9e9e9e,
      roughness: 0.88,
      metalness: 0.0
    });
    // Sidewalk strips along main roads
    const swalkDefs = [
      // Along each N-S avenue
      { x: 120 + 11, z: 0, w: 6, l: 700 },
      { x: 120 - 11, z: 0, w: 6, l: 700 },
      { x: 40 + 11, z: 0, w: 6, l: 700 },
      { x: 40 - 11, z: 0, w: 6, l: 700 },
      { x: -40 + 11, z: 0, w: 6, l: 700 },
      { x: -40 - 11, z: 0, w: 6, l: 700 },
      { x: -140 + 12, z: 0, w: 6, l: 700 },
      { x: -140 - 12, z: 0, w: 6, l: 700 },
    ];
    swalkDefs.forEach(d => {
      const sg = new THREE.PlaneGeometry(d.w, d.l);
      sg.rotateX(-Math.PI / 2);
      const sm = new THREE.Mesh(sg, sidewalkMat);
      sm.position.set(d.x, 0.03, d.z);
      sm.receiveShadow = true;
      this.scene.add(sm);
    });

    // Sandy Beach
    const sandCanvas = document.createElement('canvas');
    sandCanvas.width = 128;
    sandCanvas.height = 128;
    const sctx = sandCanvas.getContext('2d');
    sctx.fillStyle = '#e8c97a';
    sctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 2000; i++) {
      const v = Math.floor(Math.random() * 25) - 12;
      sctx.fillStyle = `rgb(${232 + v},${200 + v},${120 + v})`;
      sctx.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
    }
    const sandTex = new THREE.CanvasTexture(sandCanvas);
    sandTex.wrapS = THREE.RepeatWrapping;
    sandTex.wrapT = THREE.RepeatWrapping;
    sandTex.repeat.set(30, 60);

    const sandGeo = new THREE.PlaneGeometry(350, 800);
    sandGeo.rotateX(-Math.PI / 2);
    const sandMat = new THREE.MeshStandardMaterial({
      map: sandTex,
      color: 0xdec87a,
      roughness: 0.98,
      metalness: 0.0
    });
    const sandMesh = new THREE.Mesh(sandGeo, sandMat);
    sandMesh.position.set(280, 0.01, 0);
    sandMesh.receiveShadow = true;
    this.scene.add(sandMesh);
  }

  createRoadMarkings() {
    // White dashed center lines on N-S avenues
    const dashMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const yelMat = new THREE.MeshBasicMaterial({ color: 0xffee00 });

    const nsRoads = [120, 40, -40, -140];
    nsRoads.forEach(x => {
      // Center yellow double-line
      for (let z = -350; z < 350; z += 1) {
        const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.95), yelMat);
        stripe.rotation.x = -Math.PI / 2;
        stripe.position.set(x - 0.1, 0.02, z);
        this.scene.add(stripe);
        const stripe2 = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.95), yelMat);
        stripe2.rotation.x = -Math.PI / 2;
        stripe2.position.set(x + 0.1, 0.02, z);
        this.scene.add(stripe2);
        z += 2.5; // gap between dashes
      }

      // White edge lines
      const edgeL = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 700), dashMat);
      edgeL.rotation.x = -Math.PI / 2;
      edgeL.position.set(x - 9, 0.02, 0);
      this.scene.add(edgeL);
      const edgeR = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 700), dashMat);
      edgeR.rotation.x = -Math.PI / 2;
      edgeR.position.set(x + 9, 0.02, 0);
      this.scene.add(edgeR);
    });

    // E-W boulevard center dashes
    const ewRoads = [-260, -130, 0, 130, 260];
    ewRoads.forEach(z => {
      for (let x = -180; x < 140; x += 1) {
        const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.15), yelMat);
        stripe.rotation.x = -Math.PI / 2;
        stripe.position.set(x, 0.02, z);
        this.scene.add(stripe);
        x += 2.5;
      }
      // White edge lines
      const edgeTop = new THREE.Mesh(new THREE.PlaneGeometry(320, 0.2), dashMat);
      edgeTop.rotation.x = -Math.PI / 2;
      edgeTop.position.set(-20, 0.02, z - 9);
      this.scene.add(edgeTop);
      const edgeBot = new THREE.Mesh(new THREE.PlaneGeometry(320, 0.2), dashMat);
      edgeBot.rotation.x = -Math.PI / 2;
      edgeBot.position.set(-20, 0.02, z + 9);
      this.scene.add(edgeBot);
    });

    // Crosswalks at intersections
    const crossMat = new THREE.MeshBasicMaterial({ color: 0xeeeeee });
    nsRoads.forEach(x => {
      ewRoads.forEach(z => {
        // Crosswalk stripes across road (E-W direction)
        for (let s = -8; s <= 8; s += 2.2) {
          const c = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.9), crossMat);
          c.rotation.x = -Math.PI / 2;
          c.position.set(x + s, 0.025, z + 10.5);
          this.scene.add(c);
          const c2 = c.clone();
          c2.position.z = z - 10.5;
          this.scene.add(c2);
        }
        // Crosswalk stripes N-S direction
        for (let s = -8; s <= 8; s += 2.2) {
          const c = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.5), crossMat);
          c.rotation.x = -Math.PI / 2;
          c.position.set(x + 10.5, 0.025, z + s);
          this.scene.add(c);
          const c2 = c.clone();
          c2.position.x = x - 10.5;
          this.scene.add(c2);
        }
      });
    });
  }

  createRoadGrid() {
    // North-South Avenues
    // Ocean Drive (East coastal road)
    this.roads.createRoadSegment(120, -350, 120, 350, 18);
    // Collins Avenue
    this.roads.createRoadSegment(40, -350, 40, 350, 20);
    // Downtown Washington Ave
    this.roads.createRoadSegment(-40, -350, -40, 350, 20);
    // Industrial West Way
    this.roads.createRoadSegment(-140, -350, -140, 350, 22);

    // East-West Boulevards
    const zCrossings = [-260, -130, 0, 130, 260];
    zCrossings.forEach(z => {
      this.roads.createRoadSegment(-180, z, 140, z, 18);

      // Create intersections at cross points
      [-140, -40, 40, 120].forEach(x => {
        this.roads.createIntersection(x, z, 20);
      });
    });
  }

  createBeachDistrict() {
    // South Beach promenade sidewalk (elevated boardwalk)
    const promMat = new THREE.MeshStandardMaterial({ color: 0xd4b896, roughness: 0.82 });
    const prom = new THREE.Mesh(new THREE.BoxGeometry(10, 0.35, 700), promMat);
    prom.position.set(136, 0.18, 0);
    prom.receiveShadow = true;
    this.scene.add(prom);

    // Boardwalk plank texture
    const boardCanvas = document.createElement('canvas');
    boardCanvas.width = 64; boardCanvas.height = 256;
    const bctx = boardCanvas.getContext('2d');
    bctx.fillStyle = '#c4a07a';
    bctx.fillRect(0, 0, 64, 256);
    for (let y = 0; y < 256; y += 12) {
      bctx.strokeStyle = '#a08060';
      bctx.lineWidth = 1.5;
      bctx.beginPath(); bctx.moveTo(0, y); bctx.lineTo(64, y); bctx.stroke();
    }

    // Staggered double-row of lush Royal Palms along the South Beach promenade
    for (let z = -340; z <= 340; z += 16) {
      // Roadside promenade palm
      const palm1 = Props.createPalmTree({ height: 11.5 + (Math.random() - 0.5) * 2.5 });
      palm1.position.set(131.5, 0, z + (Math.random() - 0.5) * 2);
      palm1.rotation.y = Math.random() * Math.PI * 2;
      this.scene.add(palm1);
      this.physics.createBuildingCollider(palm1.position.x, palm1.position.z, 0.9, 0.9, 12);

      // Beachside boardwalk palm
      const palm2 = Props.createPalmTree({ height: 13.0 + (Math.random() - 0.5) * 3 });
      palm2.position.set(143.5, 0, z + 8 + (Math.random() - 0.5) * 2);
      palm2.rotation.y = Math.random() * Math.PI * 2;
      this.scene.add(palm2);
      this.physics.createBuildingCollider(palm2.position.x, palm2.position.z, 0.9, 0.9, 13);
    }

    // Beach volleyball net
    const netMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
    const netPost1 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 6), new THREE.MeshStandardMaterial({ color: 0xd4a040 }));
    netPost1.position.set(190, 1.2, 100);
    const netPost2 = netPost1.clone();
    netPost2.position.set(196, 1.2, 100);
    const netMesh = new THREE.Mesh(new THREE.BoxGeometry(6, 0.6, 0.04), netMat);
    netMesh.position.set(193, 2.0, 100);
    this.scene.add(netPost1, netPost2, netMesh);

    // Iconic Miami Beach Lifeguard Towers
    const towerColors = [0x00bcd4, 0xff4081, 0xffeb3b, 0x4caf50];
    [-220, -80, 60, 200].forEach((z, idx) => {
      const tower = this.createLifeguardTower(towerColors[idx % towerColors.length]);
      tower.position.set(220, 0, z);
      this.scene.add(tower);
      this.physics.createBuildingCollider(220, z, 6, 6, 8);
    });

    // Beach umbrellas and chairs
    for (let z = -300; z <= 300; z += 50) {
      for (let i = 0; i < 3; i++) {
        const ux = 165 + i * 12 + (Math.random() - 0.5) * 5;
        const uz = z + (Math.random() - 0.5) * 20;
        this._placeBeachUmbrella(ux, uz);
      }
    }
  }

  _placeBeachUmbrella(x, z) {
    const colors = [0xff5722, 0x2196f3, 0xffeb3b, 0xe91e63];
    const col = colors[Math.floor(Math.random() * colors.length)];
    const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.7, side: THREE.DoubleSide });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.0, 6), new THREE.MeshStandardMaterial({ color: 0xd0a060 }));
    pole.position.set(x, 1.0, z);
    const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.4, 0.4, 12, 1, true), mat);
    canopy.position.set(x, 2.1, z);
    this.scene.add(pole, canopy);
  }

  createLifeguardTower(colorHex) {
    const group = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.8 });
    const brightMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.5 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });

    // 4 Stilts
    for (let dx of [-1.8, 1.8]) {
      for (let dz of [-1.8, 1.8]) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 3.2), woodMat);
        pole.position.set(dx, 1.6, dz);
        group.add(pole);
      }
    }

    // Platform
    const platform = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.3, 4.8), brightMat);
    platform.position.y = 3.2;
    group.add(platform);

    // Cabin
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.8, 3.6), whiteMat);
    cabin.position.y = 4.7;
    group.add(cabin);

    // Overhanging angled roof
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.2, 1.4, 4), brightMat);
    roof.position.y = 6.6;
    roof.rotation.y = Math.PI / 4;
    group.add(roof);

    return group;
  }

  createArtDecoStrip() {
    // Ocean Drive Art Deco Boutique Hotels (pastel pink, mint green, sky blue, peach with neon accents)
    const hotelConfigs = [
      { name: 'THE PINK FLAMINGO', color: 0xf8bbd0, neon: 0xff4081, height: 26, z: -300 },
      { name: 'OCEAN ROYALE', color: 0xbbdefb, neon: 0x00e5ff, height: 32, z: -200 },
      { name: 'HOTEL TROPICANA', color: 0xc8e6c9, neon: 0x00e676, height: 28, z: -70 },
      { name: 'VICE PALACE', color: 0xffe0b2, neon: 0xffab40, height: 36, z: 60 },
      { name: 'SUNSET HORIZON', color: 0xe1bee7, neon: 0xd500f9, height: 30, z: 190 },
      { name: 'LEONIDA DREAMS', color: 0xffcdd2, neon: 0xff1744, height: 34, z: 310 }
    ];

    hotelConfigs.forEach(h => {
      const group = new THREE.Group();
      const x = 95; // Just west of Ocean Drive
      const w = 26;
      const l = 34;

      const hotelTex = this.hotelMap.clone();
      hotelTex.repeat.set(2, Math.max(1, Math.round(h.height / 10)));
      const hotelEmissive = this.hotelEmissive.clone();
      hotelEmissive.repeat.set(2, Math.max(1, Math.round(h.height / 10)));

      const bodyMat = new THREE.MeshStandardMaterial({
        color: h.color,
        map: hotelTex,
        emissiveMap: hotelEmissive,
        emissive: 0xffffff,
        emissiveIntensity: 0.85,
        roughness: 0.65,
        metalness: 0.1
      });
      this.windowMaterials.push(bodyMat);

      const body = new THREE.Mesh(new THREE.BoxGeometry(w, h.height, l), bodyMat);
      body.position.set(0, h.height / 2, 0);
      body.castShadow = true;
      body.receiveShadow = true;
      group.add(body);

      // Art Deco decorative tiered crown
      const tier1 = new THREE.Mesh(new THREE.BoxGeometry(w * 0.75, 4, l * 0.75), bodyMat);
      tier1.position.set(0, h.height + 2, 0);
      const tier2 = new THREE.Mesh(new THREE.BoxGeometry(w * 0.45, 3, l * 0.45), bodyMat);
      tier2.position.set(0, h.height + 5.5, 0);
      group.add(tier1, tier2);

      // Glowing Neon Facade Trim
      const neonMat = new THREE.MeshBasicMaterial({ color: h.neon });
      this.neonMaterials.push(neonMat);

      const neonStrip1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, l * 0.95), neonMat);
      neonStrip1.position.set(w / 2 + 0.2, h.height * 0.65, 0);
      const neonStrip2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, l * 0.95), neonMat);
      neonStrip2.position.set(w / 2 + 0.2, h.height * 0.95, 0);
      group.add(neonStrip1, neonStrip2);

      // Illuminated Hotel Marquee Signboard
      const signMesh = this.createNeonSign(h.name, h.neon);
      signMesh.position.set(w / 2 + 0.6, 6, 0);
      signMesh.rotation.y = Math.PI / 2;
      group.add(signMesh);

      group.position.set(x, 0, h.z);
      this.scene.add(group);

      this.physics.createBuildingCollider(x, h.z, w, l, h.height + 7);
    });

    // Iconic Royal Palms & Tropical Planters along Ocean Drive sidewalk (between hotels and road)
    for (let z = -340; z <= 340; z += 18) {
      const palm = Props.createPalmTree({ height: 12 + (Math.random() - 0.5) * 2.5 });
      palm.position.set(109.5, 0, z);
      palm.rotation.y = Math.random() * Math.PI * 2;
      this.scene.add(palm);
      this.physics.createBuildingCollider(109.5, z, 0.9, 0.9, 12);

      // Tropical sidewalk planter bed with flowering bougainvillea
      const planter = Props.createTropicalPlanter();
      planter.position.set(109.5, 0, z);
      this.scene.add(planter);
    }
  }

  createNeonSign(text, neonColor) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(0, 0, 512, 128);

    ctx.strokeStyle = `#${neonColor.toString(16).padStart(6, '0')}`;
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, 500, 116);

    ctx.font = 'bold 36px "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = `#${neonColor.toString(16).padStart(6, '0')}`;
    ctx.fillText(text, 256, 64);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const geo = new THREE.PlaneGeometry(12, 3);
    return new THREE.Mesh(geo, mat);
  }

  createDowntownSkyscrapers() {
    // Dense Downtown Highrises between x: -100 and x: 60
    const towers = [
      { x: 0, z: -200, w: 32, l: 32, h: 120, col: 0x4a7b9d, bill: 'SPRUNK' },
      { x: -80, z: -200, w: 36, l: 30, h: 95, col: 0x3d6b8c, bill: 'AMMU-NATION' },
      { x: 0, z: -70, w: 34, l: 38, h: 145, col: 0x5a8fa8, bill: 'VICE CITY NEWS' },
      { x: -80, z: -70, w: 32, l: 32, h: 110, col: 0x3b6982, bill: 'E-COLA' },
      { x: 0, z: 60, w: 38, l: 34, h: 130, col: 0x487a94, bill: 'FLYUS' },
      { x: -80, z: 60, w: 30, l: 36, h: 100, col: 0x386078, bill: 'WHIZ MOBILE' },
      { x: 0, z: 190, w: 34, l: 32, h: 115, col: 0x51819c, bill: 'LEONIDA LOTTERY' },
      { x: -80, z: 190, w: 38, l: 34, h: 85, col: 0x42728d, bill: 'MAZE BANK' }
    ];

    towers.forEach(t => {
      const group = new THREE.Group();

      const skyTex = this.skyscraperMap.clone();
      skyTex.repeat.set(Math.max(1, Math.round(t.w / 12)), Math.max(1, Math.round(t.h / 12)));
      const skyEmissive = this.skyscraperEmissive.clone();
      skyEmissive.repeat.set(Math.max(1, Math.round(t.w / 12)), Math.max(1, Math.round(t.h / 12)));

      const bodyGeo = new THREE.BoxGeometry(t.w, t.h, t.l);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: t.col,
        map: skyTex,
        emissiveMap: skyEmissive,
        emissive: 0xffffff,
        emissiveIntensity: 0.95,
        roughness: 0.25,
        metalness: 0.7
      });
      this.windowMaterials.push(bodyMat);

      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = t.h / 2;
      body.castShadow = true;
      body.receiveShadow = true;
      group.add(body);

      // Horizontal floor bands (structural rings)
      const bandMat = new THREE.MeshStandardMaterial({ color: 0x222232, metalness: 0.9, roughness: 0.2 });
      for (let bh = 0; bh <= t.h; bh += 10) {
        const band = new THREE.Mesh(new THREE.BoxGeometry(t.w + 0.4, 0.5, t.l + 0.4), bandMat);
        band.position.y = bh;
        group.add(band);
      }

      // Corner pilasters (vertical edge columns)
      const pilasterMat = new THREE.MeshStandardMaterial({ color: 0x38506e, metalness: 0.75, roughness: 0.3 });
      for (const cx of [-t.w / 2 + 1.5, t.w / 2 - 1.5]) {
        for (const cz of [-t.l / 2 + 1.5, t.l / 2 - 1.5]) {
          const pilaster = new THREE.Mesh(new THREE.BoxGeometry(1.8, t.h, 1.8), pilasterMat);
          pilaster.position.set(cx, t.h / 2, cz);
          group.add(pilaster);
        }
      }

      // Ground-floor lobby base (stone-like, darker base)
      const lobbyMat = new THREE.MeshStandardMaterial({ color: 0x2a3040, roughness: 0.6, metalness: 0.3 });
      const lobby = new THREE.Mesh(new THREE.BoxGeometry(t.w + 2, 5, t.l + 2), lobbyMat);
      lobby.position.y = 2.5;
      group.add(lobby);

      // Lobby glass entrance
      const entranceMat = new THREE.MeshStandardMaterial({ color: 0x667799, metalness: 0.9, roughness: 0.1, transparent: true, opacity: 0.7 });
      const entrance = new THREE.Mesh(new THREE.BoxGeometry(8, 4.5, 0.2), entranceMat);
      entrance.position.set(0, 2.5, t.l / 2 + 1.1);
      group.add(entrance);

      // Rooftop Helipad & Antenna
      const roofHeli = new THREE.Mesh(
        new THREE.CylinderGeometry(8, 8, 0.4, 24),
        new THREE.MeshStandardMaterial({ color: 0x303030 })
      );
      roofHeli.position.set(0, t.h + 0.2, 0);
      // "H" symbol suggestion via two boxes
      const hBar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 5), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      hBar.position.set(-2, t.h + 0.42, 0);
      const hBar2 = hBar.clone();
      hBar2.position.x = 2;
      const hCross = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.1, 0.5), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      hCross.position.set(0, t.h + 0.42, 0);
      group.add(roofHeli, hBar, hBar2, hCross);

      const ant = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.38, 20, 8),
        new THREE.MeshStandardMaterial({ color: 0xd0d0d0, metalness: 0.9 })
      );
      ant.position.set(0, t.h + 10, 0);
      group.add(ant);

      // Beacon
      const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 8), beaconMat);
      beacon.position.set(0, t.h + 20, 0);
      group.add(beacon);

      // Neon Billboard on facade
      if (t.bill) {
        const billboard = this.createNeonSign(t.bill, 0x00ffff);
        billboard.scale.set(1.8, 1.8, 1.8);
        billboard.position.set(0, t.h * 0.72, t.l / 2 + 0.5);
        group.add(billboard);
      }

      group.position.set(t.x, 0, t.z);
      this.scene.add(group);

      this.physics.createBuildingCollider(t.x, t.z, t.w, t.l, t.h);
    });
  }

  createElevatedHighway() {
    // Elevated 4-lane highway connecting South and North city across z: 120 to 420
    const bridgeGroup = new THREE.Group();
    const length = 240;
    const width = 22;
    const height = 8.0;

    // Deck
    const deckGeo = new THREE.BoxGeometry(width, 1.5, length);
    const deckMat = new THREE.MeshStandardMaterial({ color: 0x282b30, roughness: 0.85 });
    const deck = new THREE.Mesh(deckGeo, deckMat);
    deck.position.set(0, height, 270);
    deck.receiveShadow = true;
    bridgeGroup.add(deck);

    // Concrete Support Pillars
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x757575, roughness: 0.9 });
    for (let z = 160; z <= 380; z += 40) {
      const p1 = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.6, height, 12), pillarMat);
      p1.position.set(-6, height / 2, z);
      const p2 = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.6, height, 12), pillarMat);
      p2.position.set(6, height / 2, z);
      bridgeGroup.add(p1, p2);
      this.physics.createBuildingCollider(-6, z, 3, 3, height);
      this.physics.createBuildingCollider(6, z, 3, 3, height);
    }

    // Safety guardrails
    const railMat = new THREE.MeshStandardMaterial({ color: 0x90a4ae, metalness: 0.7 });
    const railL = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.4, length), railMat);
    railL.position.set(-width / 2 + 0.3, height + 1.2, 270);
    const railR = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.4, length), railMat);
    railR.position.set(width / 2 - 0.3, height + 1.2, 270);
    bridgeGroup.add(railL, railR);

    // Highway Stunt Jump Ramp at end of overpass
    const ramp = Props.createStuntRamp();
    ramp.position.set(0, height, 395);
    ramp.rotation.y = 0;
    bridgeGroup.add(ramp);

    this.scene.add(bridgeGroup);
  }

  createGasStation() {
    const group = new THREE.Group();
    const x = -140;
    const z = 0;

    // Station Canopy
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0xd32f2f, roughness: 0.4 });
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(32, 1.6, 24), canopyMat);
    canopy.position.set(0, 7.5, 0);
    group.add(canopy);

    // Illuminated RON OIL sign
    const ronSign = this.createNeonSign('RON GASOLINE 24/7', 0xffeb3b);
    ronSign.position.set(0, 7.5, 12.2);
    group.add(ronSign);

    // Support pillars
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    for (let px of [-12, 12]) {
      for (let pz of [-8, 8]) {
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 7.5, 12), pillarMat);
        pillar.position.set(px, 3.75, pz);
        group.add(pillar);
        this.physics.createBuildingCollider(x + px, z + pz, 1.5, 1.5, 8);
      }
    }

    // Gas Pumps (Explosive hazard!)
    const pumpGeo = new THREE.BoxGeometry(1.6, 2.8, 1.2);
    const pumpMat = new THREE.MeshStandardMaterial({ color: 0xef5350, roughness: 0.3 });
    for (let pz of [-4, 4]) {
      const pump = new THREE.Mesh(pumpGeo, pumpMat);
      pump.position.set(0, 1.4, pz);
      group.add(pump);

      this.explosivePumps.push({
        position: new THREE.Vector3(x, 1.4, z + pz),
        health: 50,
        exploded: false,
        mesh: pump
      });
      this.physics.createBuildingCollider(x, z + pz, 2, 2, 3);
    }

    // Convenience Store Building behind pumps
    const storeMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.7 });
    const store = new THREE.Mesh(new THREE.BoxGeometry(26, 6, 16), storeMat);
    store.position.set(0, 3, -22);
    group.add(store);
    this.physics.createBuildingCollider(x, z - 22, 26, 16, 7);

    group.position.set(x, 0, z);
    this.scene.add(group);
  }

  createIndustrialDocks() {
    // Shipping containers along west docks (x: -240)
    const containerColors = [0x1565c0, 0xc62828, 0x2e7d32, 0xf57f17];
    const conGeo = new THREE.BoxGeometry(6, 4.5, 14);

    for (let z = -280; z <= 280; z += 35) {
      const col = containerColors[Math.floor(Math.random() * containerColors.length)];
      const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.7, metalness: 0.3 });

      // Stack of 2
      const c1 = new THREE.Mesh(conGeo, mat);
      c1.position.set(-220, 2.25, z);
      this.scene.add(c1);
      this.physics.createBuildingCollider(-220, z, 6, 14, 5);

      const c2 = new THREE.Mesh(conGeo, mat);
      c2.position.set(-220, 6.75, z);
      this.scene.add(c2);
    }
  }

  createStreetFurniture() {
    // Street lights and traffic lights along main boulevards
    const zList = [-320, -200, -80, 40, 160, 280];
    const xList = [-140, -40, 40, 120];

    xList.forEach(x => {
      zList.forEach(z => {
        const light = Props.createStreetLight();
        light.group.position.set(x + 10, 0, z);
        this.scene.add(light.group);
        this.streetLights.push(light);

        // Bench on sidewalk
        if (Math.random() > 0.5) {
          const bench = Props.createBench();
          bench.position.set(x + 10.5, 0, z + 6);
          bench.rotation.y = Math.PI / 2;
          this.scene.add(bench);
        }

        // Trash bin
        if (Math.random() > 0.4) {
          const bin = Props.createTrashBin();
          bin.position.set(x + 9.8, 0, z + 3);
          this.scene.add(bin);
        }

        // Fire hydrant
        if (Math.random() > 0.3) {
          const hydrantMesh = Props.createFireHydrant();
          hydrantMesh.position.set(x + 9.5, 0, z + 12);
          this.scene.add(hydrantMesh);

          const hydObj = {
            mesh: hydrantMesh,
            position: hydrantMesh.position.clone(),
            broken: false,
            vel: new THREE.Vector3(),
            geyserMesh: null,
            radius: 1.0,
            takeDamage: (amt) => {
              if (!hydObj.broken) {
                hydObj.broken = true;
                hydObj.vel.set((Math.random() - 0.5) * 4, 9, (Math.random() - 0.5) * 4);
              }
            }
          };
          this.hydrants.push(hydObj);
        }

        // Downtown banyan trees (mix with palms)
        if (x < -30 && Math.random() > 0.4) {
          const tree = Props.createBanyanTree();
          tree.position.set(x + 12, 0, z + 15);
          tree.rotation.y = Math.random() * Math.PI * 2;
          this.scene.add(tree);
          this.physics.createBuildingCollider(x + 12, z + 15, 1.5, 1.5, 12);
        } else if (x === 40 && Math.random() > 0.35) {
          // Collins Avenue palms
          const palm = Props.createPalmTree({ height: 11.0 + Math.random() * 2 });
          palm.position.set(x + 11.5, 0, z + 10);
          palm.rotation.y = Math.random() * Math.PI * 2;
          this.scene.add(palm);
          this.physics.createBuildingCollider(x + 11.5, z + 10, 0.9, 0.9, 11);
        }
      });
    });

    // Traffic lights at intersections
    [-140, -40, 40, 120].forEach(x => {
      [-130, 0, 130].forEach(z => {
        const tl = Props.createTrafficLight();
        tl.group.position.set(x + 10, 0, z + 10);
        this.scene.add(tl.group);
        this.trafficLights.push(tl);
      });
    });
  }

  createSmallBuildings() {
    // Fill in between major landmarks with smaller 2-5 story commercial/residential blocks
    const configs = [
      // Midtown commercial strip
      { x: -120, z: -300, w: 18, l: 24, h: 12, col: 0x8b7355 },
      { x: -120, z: -260, w: 20, l: 20, h: 18, col: 0x9e8c78 },
      { x: -120, z: -180, w: 22, l: 18, h: 10, col: 0xa0916e },
      { x: -120, z: -100, w: 16, l: 22, h: 15, col: 0x7a6a56 },
      { x: -120, z: 20, w: 18, l: 20, h: 12, col: 0x8e7f65 },
      { x: -120, z: 100, w: 20, l: 16, h: 20, col: 0x9a8b74 },
      { x: -120, z: 220, w: 22, l: 24, h: 14, col: 0x857462 },
      // Around Ocean Drive  
      { x: 65, z: -270, w: 14, l: 20, h: 10, col: 0xf0e0d0 },
      { x: 65, z: -150, w: 16, l: 18, h: 14, col: 0xe8d4c0 },
      { x: 65, z: 0, w: 15, l: 22, h: 12, col: 0xf0dcd0 },
      { x: 65, z: 130, w: 18, l: 16, h: 16, col: 0xe8d8c8 },
      { x: 65, z: 260, w: 14, l: 20, h: 10, col: 0xf4e0d4 },
      // West of downtown
      { x: -170, z: -250, w: 18, l: 22, h: 8, col: 0x6a7a68 },
      { x: -170, z: -150, w: 20, l: 18, h: 12, col: 0x607060 },
      { x: -170, z: -50, w: 16, l: 20, h: 10, col: 0x6e7e6c },
      { x: -170, z: 80, w: 22, l: 18, h: 15, col: 0x5a6a58 },
      { x: -170, z: 200, w: 18, l: 24, h: 10, col: 0x647464 },
    ];

    configs.forEach(c => {
      const group = new THREE.Group();

      // Main body with window texture
      const hotelTex = this.hotelMap.clone();
      hotelTex.repeat.set(Math.max(1, Math.round(c.w / 10)), Math.max(1, Math.round(c.h / 8)));
      const hotelEmissive = this.hotelEmissive.clone();
      hotelEmissive.repeat.set(Math.max(1, Math.round(c.w / 10)), Math.max(1, Math.round(c.h / 8)));

      const bodyMat = new THREE.MeshStandardMaterial({
        color: c.col,
        map: hotelTex,
        emissiveMap: hotelEmissive,
        emissive: 0xffffff,
        emissiveIntensity: 0.6,
        roughness: 0.78,
        metalness: 0.1
      });

      const body = new THREE.Mesh(new THREE.BoxGeometry(c.w, c.h, c.l), bodyMat);
      body.position.y = c.h / 2;
      body.castShadow = true;
      body.receiveShadow = true;
      group.add(body);

      // Flat roof with rooftop mechanicals
      const roofMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.9 });
      const roof = new THREE.Mesh(new THREE.BoxGeometry(c.w, 0.5, c.l), roofMat);
      roof.position.y = c.h + 0.25;
      group.add(roof);

      // AC unit on roof
      const ac = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.5, 2.0), new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.7 }));
      ac.position.set(c.w / 2 - 2, c.h + 1.0, c.l / 2 - 2);
      group.add(ac);

      // Ground-level shop fronts (awnings)
      const awningColors = [0xff5722, 0x1976d2, 0x388e3c, 0xf57c00, 0x7b1fa2];
      const awningMat = new THREE.MeshStandardMaterial({
        color: awningColors[Math.floor(Math.random() * awningColors.length)],
        roughness: 0.8,
        side: THREE.DoubleSide
      });
      const awning = new THREE.Mesh(new THREE.BoxGeometry(c.w * 0.6, 0.15, 1.5), awningMat);
      awning.position.set(0, 2.8, c.l / 2 + 0.5);
      awning.rotation.x = -0.3;
      group.add(awning);

      // Shop window
      const shopWinMat = new THREE.MeshStandardMaterial({ color: 0xaaccee, metalness: 0.9, roughness: 0.1, transparent: true, opacity: 0.6 });
      const shopWin = new THREE.Mesh(new THREE.BoxGeometry(c.w * 0.55, 2.0, 0.08), shopWinMat);
      shopWin.position.set(0, 1.5, c.l / 2 + 0.04);
      group.add(shopWin);

      group.position.set(c.x, 0, c.z);
      this.scene.add(group);
      this.physics.createBuildingCollider(c.x, c.z, c.w, c.l, c.h + 0.5);
    });
  }

  update(dt, vehicles, sounds) {
    // Interactive destructible fire hydrants
    for (let i = 0; i < this.hydrants.length; i++) {
      const h = this.hydrants[i];

      // Check vehicle collision
      if (!h.broken) {
        for (let v of vehicles) {
          if (v && v.physics && v.physics.speed > 4.0) {
            if (v.mesh.position.distanceTo(h.position) < 2.0) {
              h.broken = true;
              h.vel.set((Math.random() - 0.5) * 5, 8.5, (Math.random() - 0.5) * 5);
              if (sounds) sounds.playCrash(0.8);
              break;
            }
          }
        }
      }

      // If broken, animate sheared hydrant tumbling and roaring water geyser!
      if (h.broken) {
        if (h.mesh.position.y > 0.3) {
          h.vel.y -= 19.6 * dt;
          h.mesh.position.addScaledVector(h.vel, dt);
          h.mesh.rotation.x += dt * 6;
          h.mesh.rotation.z += dt * 5;
        }

        // Create water fountain geyser if not created
        if (!h.geyserMesh) {
          const geyserGeo = new THREE.CylinderGeometry(0.15, 0.45, 6.5, 8);
          geyserGeo.translate(0, 3.25, 0);
          const geyserMat = new THREE.MeshBasicMaterial({
            color: 0x90caf9,
            transparent: true,
            opacity: 0.75
          });
          const geyser = new THREE.Mesh(geyserGeo, geyserMat);
          geyser.position.copy(h.position);
          this.scene.add(geyser);
          h.geyserMesh = geyser;
        } else {
          // Animate geyser foaming height
          const spray = 1.0 + Math.sin(Date.now() * 0.015) * 0.15;
          h.geyserMesh.scale.set(spray, spray, spray);
        }
      }
    }
  }
}
