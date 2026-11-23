/**
 * GTA VI Authentic HUD: Speedometer, Wanted Stars, Weapon Display, Cash, and Mission Banners
 */
export class HUD {
  constructor(radioPlayer) {
    this.radio = radioPlayer;

    // DOM Elements
    this.speedometerContainer = document.getElementById('speedometer-hud');
    this.speedDigits = document.getElementById('speed-digits');
    this.gearIndicator = document.getElementById('gear-indicator');
    this.rpmBar = document.getElementById('rpm-fill');

    this.cashEl = document.getElementById('hud-cash');
    this.starsContainer = document.getElementById('wanted-stars');
    this.weaponNameEl = document.getElementById('weapon-name');
    this.weaponAmmoEl = document.getElementById('weapon-ammo');
    this.crosshair = document.getElementById('crosshair');

    this.banner = document.getElementById('notification-banner');
    this.bannerTitle = document.getElementById('banner-title');
    this.bannerSubtitle = document.getElementById('banner-subtitle');

    this.radioBanner = document.getElementById('radio-banner');
    this.radioStationName = document.getElementById('radio-station-name');
    this.radioGenre = document.getElementById('radio-genre');

    this.bannerTimeout = null;
    this.radioTimeout = null;
  }

  showBanner(title, subtitle, duration = 4000) {
    if (this.bannerTimeout) clearTimeout(this.bannerTimeout);
    this.bannerTitle.textContent = title;
    this.bannerSubtitle.textContent = subtitle;
    this.banner.classList.add('visible');
    this.bannerTimeout = setTimeout(() => {
      this.banner.classList.remove('visible');
    }, duration);
  }

  showRadioChange(station) {
    if (this.radioTimeout) clearTimeout(this.radioTimeout);
    this.radioStationName.textContent = station.name;
    this.radioGenre.textContent = station.genre;
    this.radioBanner.classList.add('visible');
    this.radioTimeout = setTimeout(() => {
      this.radioBanner.classList.remove('visible');
    }, 2800);
  }

  update(player) {
    // 1. Cash Display
    this.cashEl.textContent = `$${player.cash.toLocaleString()}`;

    // 2. Wanted Stars Display
    const stars = this.starsContainer.children;
    for (let i = 0; i < 5; i++) {
      if (i < player.wantedStars) {
        stars[i].classList.add('active');
      } else {
        stars[i].classList.remove('active');
      }
    }

    // 3. Weapon Display
    const w = player.weapons.currentWeapon;
    this.weaponNameEl.textContent = w.name;
    if (player.weapons.isReloading) {
      this.weaponAmmoEl.textContent = 'RELOADING...';
    } else {
      this.weaponAmmoEl.textContent = `${w.currentAmmo} / ${w.reserveAmmo}`;
    }

    // 4. Crosshair when aiming
    if (player.isAiming && !player.inVehicle) {
      this.crosshair.classList.add('active');
    } else {
      this.crosshair.classList.remove('active');
    }

    // 5. Vehicle Speedometer
    if (player.inVehicle && player.currentVehicle) {
      this.speedometerContainer.classList.add('visible');
      const v = player.currentVehicle;
      const mph = Math.round(v.physics.speedMPH);
      this.speedDigits.textContent = mph.toString().padStart(3, '0');

      const gearText = v.physics.gear === -1 ? 'R' : (v.physics.gear === 0 ? 'N' : v.physics.gear);
      this.gearIndicator.textContent = `GEAR ${gearText}`;

      // RPM gauge fill (0 to 100%)
      const rpmPercent = Math.min(100, Math.round(v.physics.rpm * 100));
      this.rpmBar.style.width = `${rpmPercent}%`;
      if (rpmPercent > 88) {
        this.rpmBar.classList.add('redline');
      } else {
        this.rpmBar.classList.remove('redline');
      }
    } else {
      this.speedometerContainer.classList.remove('visible');
    }
  }
}
