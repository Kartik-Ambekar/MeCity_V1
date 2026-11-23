import * as THREE from 'three';
import { SoundSystem } from './audio/SoundSystem.js';
import { RadioPlayer } from './audio/RadioPlayer.js';
import { PhysicsWorld } from './physics/PhysicsWorld.js';
import { RoadNetwork } from './world/RoadNetwork.js';
import { CityBuilder } from './world/CityBuilder.js';
import { WeatherSystem } from './world/WeatherSystem.js';
import { WeaponManager } from './entities/Weapon.js';
import { Player } from './entities/Player.js';
import { TrafficManager } from './world/TrafficManager.js';
import { PoliceManager } from './entities/Police.js';
import { Vehicle } from './entities/Vehicle.js';
import { Minimap } from './ui/Minimap.js';
import { HUD } from './ui/HUD.js';
import { TouchControls } from './ui/TouchControls.js';

class Game {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.startScreen = document.getElementById('start-screen');
    this.btnStart = document.getElementById('btn-start');
    this.pauseIndicator = document.getElementById('pause-indicator');

    // 1. Core Systems
    this.sounds = new SoundSystem();
    this.radio = new RadioPlayer(this.sounds);
    this.physics = new PhysicsWorld();

    // 2. Three.js Scene & Renderer (Optimized for silky 60+ FPS)
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.2, 800);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25)); // High performance on Retina/4K
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap; // Fast clean shadow sampling
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.container.appendChild(this.renderer.domElement);

    // 3. World Systems
    this.weather = new WeatherSystem(this.scene, this.renderer);
    this.roads = new RoadNetwork(this.scene);
    this.city = new CityBuilder(this.scene, this.physics, this.roads);
    this.city.build();

    // 4. Weapons & Player
    this.weapons = new WeaponManager(this.scene, this.sounds);
    this.player = new Player(this.scene, this.camera, this.sounds, this.physics, this.weapons);
    this.weapons.owner = this.player;

    // Spawn player's personal supercar parked on Ocean Drive
    this.playerSupercar = new Vehicle(this.scene, this.sounds, 'supercar');
    this.playerSupercar.physics.reset(122, 0.5, -30, 0);

    // 5. Traffic & Police
    this.traffic = new TrafficManager(this.scene, this.sounds, this.roads, this.physics);
    this.traffic.init();
    this.traffic.vehicles.push(this.playerSupercar);

    this.police = new PoliceManager(this.scene, this.sounds, this.physics);

    // 6. UI & HUD
    this.minimap = new Minimap(document.getElementById('minimap-canvas'), this.roads);
    this.hud = new HUD(this.radio);
    this.police.setHUD(this.hud);

    // 7. Input State
    this.input = {
      moveX: 0,
      moveZ: 0,
      lookDeltaX: 0,
      lookDeltaY: 0,
      sprint: false,
      jump: false,
      aim: false,
      shoot: false,
      gas: false,
      reverse: false,
      steerLeft: false,
      steerRight: false,
      handbrake: false,
      enterVehicle: false,
      horn: false,
      sirenToggle: false
    };

    this.touchControls = new TouchControls(this.input);

    this.clock = new THREE.Clock();
    this.isStarted = false;

    this.setupEventListeners();
  }

  setupEventListeners() {
    window.addEventListener('resize', () => this.onWindowResize());

    // Helper to request pointer lock safely
    this.requestLock = () => {
      if (!this.isStarted) return;
      try {
        if (document.body.requestPointerLock) {
          const promise = document.body.requestPointerLock();
          if (promise && promise.catch) {
            promise.catch(() => {});
          }
        }
      } catch (_) {}
    };

    // Pointer lock state changes (handles ESC key recovery)
    document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement === document.body) {
        if (this.pauseIndicator) this.pauseIndicator.style.display = 'none';
      } else if (this.isStarted) {
        if (this.pauseIndicator) this.pauseIndicator.style.display = 'block';
      }
    });

    // Re-lock view whenever user clicks the canvas or pause indicator
    this.renderer.domElement.addEventListener('click', () => this.requestLock());
    if (this.pauseIndicator) {
      this.pauseIndicator.addEventListener('click', () => this.requestLock());
    }

    this.btnStart.addEventListener('click', () => {
      this.sounds.init();
      this.radio.init();
      this.startScreen.classList.add('hidden');
      this.isStarted = true;
      this.requestLock();

      this.hud.showBanner('WELCOME TO LEONIDA', 'Vice City awaits. Steal cars, cause mayhem, or drive into the sunset!', 5000);
      this.radio.start();
      this.hud.showRadioChange(this.radio.currentStation);
    });

    // Keyboard controls
    const keysDown = new Set();
    window.addEventListener('keydown', e => {
      if (!this.isStarted) return;
      keysDown.add(e.code);

      if (e.code === 'KeyW' || e.code === 'ArrowUp') { this.input.moveZ = -1; this.input.gas = true; }
      if (e.code === 'KeyS' || e.code === 'ArrowDown') { this.input.moveZ = 1; this.input.reverse = true; }
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') { this.input.moveX = -1; this.input.steerLeft = true; }
      if (e.code === 'KeyD' || e.code === 'ArrowRight') { this.input.moveX = 1; this.input.steerRight = true; }

      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.input.sprint = true;
      if (e.code === 'Space') { this.input.jump = true; this.input.handbrake = true; }
      if (e.code === 'KeyF' || e.code === 'Enter') this.input.enterVehicle = true;
      if (e.code === 'KeyH') this.input.horn = true;
      if (e.code === 'KeyE') this.input.sirenToggle = true;

      // Radio Station Switch ('R')
      if (e.code === 'KeyR' && this.player.inVehicle) {
        const nextStation = this.radio.nextStation();
        this.hud.showRadioChange(nextStation);
      }

      // Weapon Switching
      if (e.code === 'Digit1') this.weapons.selectWeapon(0);
      if (e.code === 'Digit2') this.weapons.selectWeapon(1);
      if (e.code === 'Digit3') this.weapons.selectWeapon(2);
      if (e.code === 'Digit4') this.weapons.selectWeapon(3);
      if (e.code === 'KeyQ') this.weapons.prevWeapon();
    });

    window.addEventListener('keyup', e => {
      keysDown.delete(e.code);

      if (e.code === 'KeyW' || e.code === 'ArrowUp') { this.input.moveZ = keysDown.has('KeyS') ? 1 : 0; this.input.gas = false; }
      if (e.code === 'KeyS' || e.code === 'ArrowDown') { this.input.moveZ = keysDown.has('KeyW') ? -1 : 0; this.input.reverse = false; }
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') { this.input.moveX = keysDown.has('KeyD') ? 1 : 0; this.input.steerLeft = false; }
      if (e.code === 'KeyD' || e.code === 'ArrowRight') { this.input.moveX = keysDown.has('KeyA') ? -1 : 0; this.input.steerRight = false; }

      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.input.sprint = false;
      if (e.code === 'Space') { this.input.jump = false; this.input.handbrake = false; }
      if (e.code === 'KeyF' || e.code === 'Enter') this.input.enterVehicle = false;
      if (e.code === 'KeyH') this.input.horn = false;
      if (e.code === 'KeyE') this.input.sirenToggle = false;
    });

    // Mouse Tracking with Pointer Lock & Drag Fallback
    let isMouseDown = false;
    let lastMouseX = 0;
    let lastMouseY = 0;

    window.addEventListener('mousedown', e => {
      if (!this.isStarted) return;
      isMouseDown = true;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      if (e.button === 0) this.input.shoot = true; // Left click
      if (e.button === 2) this.input.aim = true;   // Right click
    });

    window.addEventListener('mouseup', e => {
      isMouseDown = false;
      if (e.button === 0) this.input.shoot = false;
      if (e.button === 2) this.input.aim = false;
    });

    window.addEventListener('mousemove', e => {
      if (document.pointerLockElement === document.body) {
        this.input.lookDeltaX = e.movementX;
        this.input.lookDeltaY = e.movementY;
      } else if (isMouseDown && this.isStarted) {
        // Fallback: Allows rotating camera view even after Escape / when unlocked!
        this.input.lookDeltaX = (e.clientX - lastMouseX) * 1.5;
        this.input.lookDeltaY = (e.clientY - lastMouseY) * 1.5;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
      }
    });

    // Smooth camera distance zoom on scroll wheel (safely clamped)
    window.addEventListener('wheel', e => {
      if (!this.isStarted) return;
      this.player.cameraDistance = Math.max(2.2, Math.min(7.5, this.player.cameraDistance + e.deltaY * 0.003));
    }, { passive: true });

    // Prevent context menu on right click aim
    window.addEventListener('contextmenu', e => e.preventDefault());
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  start() {
    this.renderer.setAnimationLoop(() => this.tick());
  }

  tick() {
    try {
      const dt = Math.min(0.1, this.clock.getDelta());

      // 1. Update Sky, Lighting & Weather
      this.weather.update(dt, this.player.position);

      // 2. Check Gas Pump Explosions
      this.city.explosivePumps.forEach(pump => {
        if (pump.exploded) return;
        // If car hits pump at speed, explode
        this.traffic.vehicles.forEach(v => {
          if (v.physics.speed > 8 && v.mesh.position.distanceTo(pump.position) < 3.2) {
            pump.exploded = true;
            this.sounds.playExplosion();
            v.takeDamage(100);
            this.player.wantedStars = Math.max(3, this.player.wantedStars + 2);
            this.hud.showBanner('GAS PUMP EXPLOSION', 'Wanted Level increased to ★★★', 3500);
          }
        });
      });

      // 3. Update Living City Entities
      const shootTargets = [...this.traffic.vehicles, ...this.traffic.pedestrians, ...this.city.hydrants, ...this.city.explosivePumps];
      this.police.policeUnits.forEach(u => shootTargets.push(u.vehicle));

      this.player.update(dt, this.input, shootTargets);
      this.traffic.update(dt, this.player, this.police.policeUnits);
      this.police.update(dt, this.player);
      this.weapons.update(dt);

      // Collect all active vehicles after physics movement step
      const allVehicles = [...this.traffic.vehicles];
      this.police.policeUnits.forEach(u => {
        if (!allVehicles.includes(u.vehicle)) allVehicles.push(u.vehicle);
      });
      if (this.player.currentVehicle && !allVehicles.includes(this.player.currentVehicle)) {
        allVehicles.push(this.player.currentVehicle);
      }

      // 4. Vehicle-to-Vehicle Physical Collision Resolution (Guaranteed No Overlapping / Phase-Through)
      for (let i = 0; i < allVehicles.length; i++) {
        const v1 = allVehicles[i];
        if (v1.isDestroyed) continue;
        for (let j = i + 1; j < allVehicles.length; j++) {
          const v2 = allVehicles[j];
          if (v2.isDestroyed) continue;

          const dx = v1.physics.position.x - v2.physics.position.x;
          const dz = v1.physics.position.z - v2.physics.position.z;
          const distSq = dx * dx + dz * dz;
          const minSafeDist = 4.4; // Vehicle body bounding distance
          if (distSq < minSafeDist * minSafeDist && distSq > 0.0001) {
            const dist = Math.sqrt(distSq);
            const nx = dx / dist;
            const nz = dz / dist;
            const overlap = (minSafeDist - dist) * 0.55;

            // Push bodies apart so cars can NEVER phase through each other
            v1.physics.position.x += nx * overlap;
            v1.physics.position.z += nz * overlap;
            v2.physics.position.x -= nx * overlap;
            v2.physics.position.z -= nz * overlap;

            // Immediate sync to 3D visual mesh
            v1.mesh.position.copy(v1.physics.position);
            v2.mesh.position.copy(v2.physics.position);

            // Elastic bounce impulse
            const dvx = v1.physics.linearVelocity.x - v2.physics.linearVelocity.x;
            const dvz = v1.physics.linearVelocity.z - v2.physics.linearVelocity.z;
            const impact = dvx * nx + dvz * nz;
            if (impact < 0) {
              const impulse = -impact * 0.75;
              v1.physics.linearVelocity.x += nx * impulse;
              v1.physics.linearVelocity.z += nz * impulse;
              v2.physics.linearVelocity.x -= nx * impulse;
              v2.physics.linearVelocity.z -= nz * impulse;

              if (Math.abs(impact) > 3.0) {
                this.sounds.playCrash(Math.min(1.0, Math.abs(impact) / 16));
              }
            }
          }
        }
      }

      // 5. Vehicle-to-Building Collision Resolution (No Driving Through Buildings)
      allVehicles.forEach(v => {
        this.physics.checkVehicleCollision(v.physics, (speed) => {
          if (speed > 3.0) this.sounds.playCrash(Math.min(1.0, speed / 16));
        });
        v.mesh.position.copy(v.physics.position);
        v.mesh.quaternion.copy(v.physics.quaternion);
      });

      // 6. Update City Props & Destruction
      this.city.update(dt, allVehicles, this.sounds);

      // Reset mouse look delta after consumption
      this.input.lookDeltaX = 0;
      this.input.lookDeltaY = 0;

      // 5. Update HUD and Radar Minimap
      this.hud.update(this.player);
      this.minimap.render(this.player, this.traffic.vehicles, this.police.policeUnits);

      // 5. Render Scene
      this.renderer.render(this.scene, this.camera);

      // 6. Check Player Death / Respawn
      if (this.player.isDead) {
        this.hud.showBanner('WASTED', 'Respawning on Ocean Drive...', 3000);
        setTimeout(() => {
          this.player.respawn();
        }, 3000);
      }
    } catch (err) {
      console.error('Game tick error:', err);
    }
  }
}

// Start Game on page load
window.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  game.start();
});
