# GRAND THEFT AUTO VI | Vice City / Leonida (Browser Edition)

A high-performance, open-world 3D browser game inspired by **Grand Theft Auto VI**, set in the neon-soaked metropolis of **Vice City, State of Leonida**. Built from scratch using modern WebGL (Three.js), procedural Web Audio API synthesis, and arcade-realistic vehicle and ragdoll physics.

---

## 🌟 Key Features

### 🌴 1. Iconic Open World (Leonida & Vice City)
- **South Beach & Ocean Drive:** Turquoise animated ocean waters, golden beaches, lifeguard towers, swaying palm trees, and vibrant Art Deco neon hotels (*"The Pink Flamingo"*, *"Ocean Royale"*, *"Hotel Tropicana"*, *"Vice Palace"*).
- **Downtown Skyscrapers & Financial District:** Towering modern high-rises with reflective glass facades, lit windows, rooftop helipads, antennas with flashing beacons, and glowing neon billboards (*Sprunk*, *eCola*, *Ammu-Nation*, *FlyUS*, *Whiz Mobile*).
- **Elevated Highway Overpasses & Bridges:** Multi-lane elevated highways with support pillars, overhead green highway signage, and stunt jump ramps!
- **Interactive Hazards & Industrial Docks:** RON Gasoline 24/7 service station with explosive gas pumps that detonate on impact, and shipping container docks.
- **Dynamic Atmosphere:** Golden hour Miami sunset transition, night neon lighting, atmospheric fog, and ocean waves.

### 🏎️ 2. Realistic Vehicle Physics Engine
- **Independent 4-Wheel Raycast Suspension:** Dynamic spring compression, damper damping, and ground collision resolution.
- **Pacejka Drift & Traction Curve:** Realistic longitudinal tire grip, lateral cornering resistance, and power slide drift physics.
- **Dynamic Weight Transfer:** Body pitch (squat on acceleration, dive on braking) and body roll during high-speed cornering.
- **Burnouts & Skidmarks:** Tire smoke particle emitters and dynamic rubber skid marks on the road surface.
- **Vehicle Classes:**
  - *Grotti Furia VI* (Exotic Supercar - 160+ MPH, low center of gravity, active spoiler)
  - *Vapid Dominator* (V8 Muscle Car - high torque, rear-wheel drift machine)
  - *Vapid Stanier Interceptor* (Police Cruiser - push-bar, flashing red/blue strobe lightbars, dual-tone siren)
  - *Albany Cavalcade* (Luxury SUV - heavy body, off-road ride height)
- **Destruction & Explosions:** Chassis deformation, engine smoke at low health, and fiery wreckage detonations.

### 🏃 3. Third-Person Character & Combat
- **Lucia / Jason Protagonist:** 3D procedural character rig with inverse kinematics (smooth walking, sprinting, jumping, aiming rotation).
- **Seamless Vehicle Mounting:** Walk up to any car and press `F` / `Enter` to slide into the driver's seat; bail out at speed with momentum physics.
- **Weapons Arsenal:**
  - *Combat Pistol* (Semi-automatic 9mm)
  - *Carbine Rifle* (Fully automatic assault rifle)
  - *Pump Shotgun* (High-damage multi-pellet spread)
  - *RPG-7 Launcher* (High-velocity rocket projectile with massive physics shockwave explosion)
- **Ballistics:** Real-time raycasting, dynamic muzzle flash, shell ejection, bullet tracer lines, and surface spark impacts.

### 🚓 4. Traffic AI, Pedestrians & Wanted System
- **Living Traffic:** Civilian AI vehicles navigating multi-lane road networks and stopping at crosswalks.
- **Pedestrian System:** Vice City locals strolling sidewalks; panic and flee when shots are fired or speeding cars mount curbs.
- **Grand Theft Auto Mechanics:** Carjack any civilian car on the road.
- **5-Star Wanted Level:** Police cruisers dispatch, sound sirens, coordinate PIT maneuvers, and ram fleeing vehicles. Evade line-of-sight to clear wanted stars.

### 📻 5. In-Game Radio & Sound Engine (Zero Asset Lag)
- **100% Procedural Web Audio API Synthesis:** Zero external sound downloads or missing asset latency.
- **Interactive In-Car Radio Stations (Press `R` to switch):**
  - *VICE WAVE 103* (80s Synthwave / Outrun synth leads & basslines)
  - *FLASH FM 105.8* (Miami Pop & Disco Funk grooves)
  - *LEONIDA 99.1 FM* (South Coast 808 Trap & Hip-Hop)
- **Vehicle Audio:** Multi-oscillator engine pitch modulated by RPM and gear changes, tire screech noise on drifts, horn harmonies, and police sirens.

### 🖥️ 6. Next-Gen GTA VI HUD
- **Circular GPS Minimap Radar:** Real-time road navigation, player direction arrow, vehicle blips, police blips, and mission markers.
- **Health & Armor Rings:** Semi-circular glowing green and blue status meters wrapped around the minimap.
- **Digital & Analog Speedometer:** Real-time MPH readout, gear indicator (`1` to `6`, `R`), and RPM tachometer with redline warning.
- **Mobile Touch Controls:** Virtual dual-axis joysticks and action buttons for phones and tablets.

---

## 🎮 Controls

| Action | Desktop Keyboard & Mouse | Mobile / Touch Screen |
| :--- | :--- | :--- |
| **Move / Steer** | `W`, `A`, `S`, `D` or Arrow Keys | Left Virtual Joystick |
| **Look / Aim Camera** | Mouse Movement | Right Screen Touch Pad |
| **Enter / Exit Vehicle** | `F` or `Enter` | `CAR` Button |
| **Handbrake / Drift** | `Spacebar` | `DRIFT` Button |
| **Accelerate / Shoot** | `W` (in car) / Left Click | `FIRE` Button |
| **Aim Down Sights** | Right Click (Hold) | `AIM` Button |
| **Switch Weapons** | `1`, `2`, `3`, `4` or `Q` / `E` | Weapon HUD Tap |
| **Switch Radio Station**| `R` (in car) | In-Car HUD |
| **Sound Horn / Siren** | `H` (Horn) / `E` (Police Siren) | `HORN` Button |
| **Sprint** | `Shift` (Hold) | Joystick Edge |

---

## 🚀 How to Run Locally

The game server is already built and running on port 3000:

```bash
# Start development server
npm run dev

# Or build optimized production bundle
npm run build
npm run preview
```

Open your browser at:
`http://localhost:3000/`
