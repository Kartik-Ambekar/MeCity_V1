import * as THREE from 'three';

/**
 * GTA VI Dynamic Sky & Weather System
 * Natural Florida Sun, Orbiting 3D Moon & Starfield, Clear Caribbean Ocean, and Crisp Atmospheric Lighting
 */
export class WeatherSystem {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;

    // Time of day (0.0 to 24.0 hours, starts at 13.0 = 1:00 PM Bright Sunny Florida Afternoon)
    this.timeOfDay = 13.0;
    this.timeSpeed = 0.12; // In-game hours per real minute
    this.isPaused = false;

    // Sunlight / Moonlight Directional Light
    this.dirLight = new THREE.DirectionalLight(0xfff8ee, 2.8);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;
    this.dirLight.shadow.camera.near = 5;
    this.dirLight.shadow.camera.far = 380;
    this.dirLight.shadow.camera.left = -110;
    this.dirLight.shadow.camera.right = 110;
    this.dirLight.shadow.camera.top = 110;
    this.dirLight.shadow.camera.bottom = -110;
    this.dirLight.shadow.bias = -0.0006;
    this.scene.add(this.dirLight);
    this.scene.add(this.dirLight.target);

    // Natural Ambient Sky and Ground Bounce Light
    this.hemiLight = new THREE.HemisphereLight(0x90caf9, 0xd7ccc8, 1.4);
    this.scene.add(this.hemiLight);

    // Crisp Atmospheric Fog (low density so city and buildings are crystal clear)
    this.fog = new THREE.FogExp2(0xdfeaf5, 0.0011);
    this.scene.fog = this.fog;

    // Sky Dome
    this.skyMesh = this.createSkyDome();
    this.scene.add(this.skyMesh);

    // Visible 3D Celestial Bodies: Sun and Moon
    this.sunMesh = this.createSunMesh();
    this.scene.add(this.sunMesh);

    this.moonMesh = this.createMoonMesh();
    this.scene.add(this.moonMesh);

    // Starfield for natural night sky
    this.stars = this.createStarfield();
    this.scene.add(this.stars);

    // Dynamic Cumulus Clouds
    this.clouds = this.createClouds();
    this.scene.add(this.clouds);

    // Animated Ocean (Vibrant Caribbean Blue)
    this.ocean = this.createOcean();
    this.scene.add(this.ocean);
  }

  createSkyDome() {
    const geo = new THREE.SphereGeometry(650, 32, 24);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x3b82f6,
      side: THREE.BackSide,
      depthWrite: false
    });
    return new THREE.Mesh(geo, mat);
  }

  createSunMesh() {
    const sunGroup = new THREE.Group();
    // Glowing core
    const sunGeo = new THREE.SphereGeometry(18, 16, 16);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfffae0 });
    const core = new THREE.Mesh(sunGeo, sunMat);

    // Corona flare disk
    const flareGeo = new THREE.PlaneGeometry(65, 65);
    const flareMat = new THREE.MeshBasicMaterial({
      color: 0xffe599,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const flare = new THREE.Mesh(flareGeo, flareMat);
    sunGroup.add(core, flare);
    return sunGroup;
  }

  createMoonMesh() {
    const moonGroup = new THREE.Group();
    const moonGeo = new THREE.SphereGeometry(12, 16, 16);
    const moonMat = new THREE.MeshStandardMaterial({
      color: 0xf1f2f6,
      roughness: 0.9,
      emissive: 0xdfe4ea,
      emissiveIntensity: 0.5
    });
    const core = new THREE.Mesh(moonGeo, moonMat);

    const glowGeo = new THREE.PlaneGeometry(38, 38);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xa4b0be,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    moonGroup.add(core, glow);
    return moonGroup;
  }

  createStarfield() {
    const starCount = 1000;
    const starGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      // Random points on upper hemisphere
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0) * 0.5; // upper hemisphere
      const r = 620;

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.6,
      transparent: true,
      opacity: 0.0
    });
    return new THREE.Points(starGeo, starMat);
  }

  createClouds() {
    const cloudGroup = new THREE.Group();

    // Procedural cloud puff canvas
    const cc = document.createElement('canvas');
    cc.width = 128; cc.height = 128;
    const cctx = cc.getContext('2d');
    const grad = cctx.createRadialGradient(64, 64, 10, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    grad.addColorStop(0.4, 'rgba(255, 255, 255, 0.6)');
    grad.addColorStop(0.8, 'rgba(240, 245, 255, 0.2)');
    grad.addColorStop(1, 'rgba(240, 245, 255, 0.0)');
    cctx.fillStyle = grad;
    cctx.fillRect(0, 0, 128, 128);

    const cloudTex = new THREE.CanvasTexture(cc);
    this.cloudMat = new THREE.MeshBasicMaterial({
      map: cloudTex,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    const cloudGeo = new THREE.PlaneGeometry(90, 45);
    cloudGeo.rotateX(Math.PI / 2); // Flat horizontal clouds

    // Scatter 20 cloud clusters across the sky
    this.cloudList = [];
    for (let i = 0; i < 20; i++) {
      const cloud = new THREE.Mesh(cloudGeo, this.cloudMat);
      const cx = (Math.random() - 0.5) * 900;
      const cy = 210 + Math.random() * 50;
      const cz = (Math.random() - 0.5) * 900;
      cloud.position.set(cx, cy, cz);
      const scale = 0.8 + Math.random() * 0.9;
      cloud.scale.set(scale, 1, scale * 0.7);
      cloud.rotation.y = Math.random() * Math.PI;
      cloudGroup.add(cloud);
      this.cloudList.push(cloud);
    }

    return cloudGroup;
  }

  createOcean() {
    const geo = new THREE.PlaneGeometry(1400, 1400, 40, 40);
    geo.rotateX(-Math.PI / 2);

    const mat = new THREE.MeshStandardMaterial({
      color: 0x0084b4,
      roughness: 0.15,
      metalness: 0.7,
      transparent: true,
      opacity: 0.92
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(450, -0.6, 0); // East of Vice Beach
    mesh.receiveShadow = true;
    return mesh;
  }

  update(dt, targetPosition) {
    if (!this.isPaused) {
      this.timeOfDay = (this.timeOfDay + (this.timeSpeed / 60) * dt) % 24;
    }

    const tPos = targetPosition || { x: 0, y: 0, z: 0 };
    this.dirLight.target.position.set(tPos.x, 0, tPos.z);

    const hour = this.timeOfDay;
    // Sun and Moon orbit angles
    const sunAngle = ((hour - 6) / 24) * Math.PI * 2;
    const sunDist = 480;

    // Sun 3D Position
    const sunX = tPos.x + Math.cos(sunAngle) * sunDist;
    const sunY = tPos.y + Math.sin(sunAngle) * sunDist;
    const sunZ = tPos.z + Math.sin(sunAngle * 0.5) * 140;
    this.sunMesh.position.set(sunX, sunY, sunZ);
    this.sunMesh.lookAt(tPos.x, tPos.y, tPos.z);

    // Moon 3D Position (opposite side of the sky)
    const moonAngle = sunAngle + Math.PI;
    const moonX = tPos.x + Math.cos(moonAngle) * sunDist;
    const moonY = tPos.y + Math.sin(moonAngle) * sunDist;
    const moonZ = tPos.z + Math.sin(moonAngle * 0.5) * 140;
    this.moonMesh.position.set(moonX, moonY, moonZ);
    this.moonMesh.lookAt(tPos.x, tPos.y, tPos.z);

    // Keep sky dome and stars centered on player
    this.skyMesh.position.set(tPos.x, 0, tPos.z);
    this.stars.position.set(tPos.x, 0, tPos.z);

    // Natural lighting & atmospheric transitions
    if (hour >= 6.5 && hour < 17.5) {
      // 1. Natural Bright Florida Daytime
      this.dirLight.position.set(sunX, Math.max(20, sunY), sunZ);
      this.dirLight.color.setHex(0xfffaed);
      this.dirLight.intensity = 2.8;

      this.hemiLight.color.setHex(0xb3e5fc); // Crisp sky blue
      this.hemiLight.groundColor.setHex(0xd7ccc8); // Warm concrete/sand bounce
      this.hemiLight.intensity = 1.4;

      this.skyMesh.material.color.setHex(0x3898ec); // Pure tropical azure blue
      this.fog.color.setHex(0xcae8f8);
      this.ocean.material.color.setHex(0x0088cc);

      this.sunMesh.visible = true;
      this.moonMesh.visible = false;
      this.stars.material.opacity = 0.0;
      if (this.cloudMat) {
        this.cloudMat.color.setHex(0xffffff);
        this.cloudMat.opacity = 0.75;
      }

    } else if (hour >= 17.5 && hour < 19.8) {
      // 2. Natural Golden Hour Sunset (Warm amber, gold & honey - NO PURPLE)
      const t = (hour - 17.5) / 2.3;
      this.dirLight.position.set(sunX, Math.max(12, sunY), sunZ);
      this.dirLight.color.setHex(0xffaa44);
      this.dirLight.intensity = 2.4 * (1 - t * 0.35);

      this.hemiLight.color.setHex(0xffd180); // Warm golden sky
      this.hemiLight.groundColor.setHex(0x8d6e63); // Warm ground bounce
      this.hemiLight.intensity = 1.3;

      this.skyMesh.material.color.setHex(0xf39c12); // Golden amber
      this.fog.color.setHex(0xf5cd79);
      this.ocean.material.color.setHex(0x1e5799);

      this.sunMesh.visible = true;
      this.moonMesh.visible = t > 0.4;
      this.stars.material.opacity = t * 0.4;
      if (this.cloudMat) {
        this.cloudMat.color.setHex(0xffaa66); // Golden sunset clouds
        this.cloudMat.opacity = 0.85;
      }

    } else {
      // 3. Natural Midnight Night with Moonlight and Visible City Ambiance
      this.dirLight.position.set(moonX, Math.max(20, moonY), moonZ);
      this.dirLight.color.setHex(0xdfe6e9); // Pale pearl moonlight
      this.dirLight.intensity = 0.85;

      // Generous ambient ground bounce so building surroundings are clean & clear, not dusky/dark!
      this.hemiLight.color.setHex(0x34495e);
      this.hemiLight.groundColor.setHex(0x2c3e50);
      this.hemiLight.intensity = 0.85;

      this.skyMesh.material.color.setHex(0x0a1128); // Deep midnight navy blue
      this.fog.color.setHex(0x0e1834);
      this.ocean.material.color.setHex(0x061833);

      this.sunMesh.visible = false;
      this.moonMesh.visible = true;
      this.stars.material.opacity = 0.95;
      if (this.cloudMat) {
        this.cloudMat.color.setHex(0x1a243b); // Dark moonlit clouds
        this.cloudMat.opacity = 0.35;
      }
    }

    // Slow wind drift for clouds
    if (this.cloudList) {
      const windSpeed = 3.5;
      this.cloudList.forEach(c => {
        c.position.x += windSpeed * dt;
        if (c.position.x > 500) {
          c.position.x = -500;
        }
      });
    }

    // Gentle ocean wave motion
    if (this.ocean) {
      const time = Date.now() * 0.0016;
      this.ocean.position.y = -0.6 + Math.sin(time) * 0.18;
    }
  }

  isNight() {
    return this.timeOfDay < 6.0 || this.timeOfDay > 19.5;
  }
}
