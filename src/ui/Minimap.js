/**
 * GTA VI Circular Radar Minimap
 * Renders GPS roads, ocean coastline, player arrow, traffic, police blips, and health/armor arcs
 */
export class Minimap {
  constructor(canvasElement, roadNetwork) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.roads = roadNetwork;
    this.size = 200;
    this.canvas.width = this.size;
    this.canvas.height = this.size;
    this.mapScale = 0.65; // Pixels per world meter
  }

  render(player, trafficVehicles = [], policeUnits = []) {
    this.frameCounter = (this.frameCounter || 0) + 1;
    if (this.frameCounter % 2 !== 0) return;

    const ctx = this.ctx;
    const w = this.size;
    const h = this.size;
    const cx = w / 2;
    const cy = h / 2;
    const radius = w * 0.44;

    ctx.clearRect(0, 0, w, h);

    // 1. Clip circular radar area
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();

    // Dark military radar background
    ctx.fillStyle = '#10141b';
    ctx.fillRect(0, 0, w, h);

    // Coordinate offset centered on player
    const px = player.position.x;
    const pz = player.position.z;
    const heading = player.inVehicle && player.currentVehicle ? -player.currentVehicle.mesh.rotation.y : -player.yaw;

    ctx.save();
    ctx.translate(cx, cy);
    // Rotate map with player heading so forward is always UP
    ctx.rotate(-heading);

    // Draw Ocean Coastline (East of x: 180)
    ctx.fillStyle = '#0a233e';
    const oceanX = (180 - px) * this.mapScale;
    ctx.fillRect(oceanX, -400, 400, 800);

    // Draw Roads
    ctx.strokeStyle = '#2b313d';
    ctx.lineWidth = 14 * this.mapScale;
    ctx.lineCap = 'round';

    this.roads.roads.forEach(r => {
      const rx1 = (r.startX - px) * this.mapScale;
      const rz1 = (r.startZ - pz) * this.mapScale;
      const rx2 = (r.endX - px) * this.mapScale;
      const rz2 = (r.endZ - pz) * this.mapScale;

      ctx.beginPath();
      ctx.moveTo(rx1, rz1);
      ctx.lineTo(rx2, rz2);
      ctx.stroke();
    });

    // Draw Inner Road Centerlines
    ctx.strokeStyle = '#5a6272';
    ctx.lineWidth = 2 * this.mapScale;
    this.roads.roads.forEach(r => {
      const rx1 = (r.startX - px) * this.mapScale;
      const rz1 = (r.startZ - pz) * this.mapScale;
      const rx2 = (r.endX - px) * this.mapScale;
      const rz2 = (r.endZ - pz) * this.mapScale;

      ctx.beginPath();
      ctx.moveTo(rx1, rz1);
      ctx.lineTo(rx2, rz2);
      ctx.stroke();
    });

    // Draw Civilian Vehicle Blips (Gray dots)
    trafficVehicles.forEach(v => {
      if (v === player.currentVehicle) return;
      const vx = (v.physics.position.x - px) * this.mapScale;
      const vz = (v.physics.position.z - pz) * this.mapScale;
      ctx.fillStyle = '#b0bec5';
      ctx.beginPath();
      ctx.arc(vx, vz, 2.8, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw Police Blips (Flashing Red/Blue)
    const flashRed = Math.floor(Date.now() / 250) % 2 === 0;
    policeUnits.forEach(u => {
      const v = u.vehicle;
      const ux = (v.physics.position.x - px) * this.mapScale;
      const uz = (v.physics.position.z - pz) * this.mapScale;
      ctx.fillStyle = flashRed ? '#ff1744' : '#00e5ff';
      ctx.beginPath();
      ctx.arc(ux, uz, 4.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw Mission Objective Blip (Yellow Star at South Beach Promenade)
    const objX = (136 - px) * this.mapScale;
    const objZ = (0 - pz) * this.mapScale;
    ctx.fillStyle = '#ffea00';
    ctx.beginPath();
    ctx.arc(objX, objZ, 5.0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore(); // Restore map rotation

    // Draw Center Player Blip (Cyan Arrow pointing straight UP)
    ctx.fillStyle = '#00f0ff';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 8);
    ctx.lineTo(cx + 6, cy + 6);
    ctx.lineTo(cx, cy + 3);
    ctx.lineTo(cx - 6, cy + 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore(); // Restore circular clip

    // 2. Outer Radar Bezel
    ctx.strokeStyle = '#1e2633';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    // 3. Health & Armor Gauges (Wrapped around bottom half of minimap)
    this.renderGauges(cx, cy, radius, player);
  }

  renderGauges(cx, cy, radius, player) {
    const ctx = this.ctx;
    const gaugeRadius = radius + 6;

    // Health Arc (Left half: from Math.PI * 0.5 to Math.PI * 1.0)
    const healthRatio = player.health / player.maxHealth;
    ctx.strokeStyle = '#1b5e20';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, gaugeRadius, Math.PI * 0.5, Math.PI * 1.0);
    ctx.stroke();

    ctx.strokeStyle = '#00e676'; // Bright green health
    ctx.beginPath();
    ctx.arc(cx, cy, gaugeRadius, Math.PI * 1.0 - healthRatio * Math.PI * 0.5, Math.PI * 1.0);
    ctx.stroke();

    // Armor Arc (Right half: from 0 to Math.PI * 0.5)
    const armorRatio = player.armor / player.maxArmor;
    ctx.strokeStyle = '#0d47a1';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, gaugeRadius, 0, Math.PI * 0.5);
    ctx.stroke();

    ctx.strokeStyle = '#00b0ff'; // Bright blue armor
    ctx.beginPath();
    ctx.arc(cx, cy, gaugeRadius, 0, armorRatio * Math.PI * 0.5);
    ctx.stroke();
  }
}
