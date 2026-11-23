/**
 * GTA VI Mobile & Tablet Virtual Touch Controller
 */
export class TouchControls {
  constructor(inputManager) {
    this.input = inputManager;
    this.isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    this.container = document.getElementById('touch-controls');

    if (this.isTouchDevice) {
      this.init();
    }
  }

  init() {
    this.container.classList.add('enabled');

    // Virtual Joystick for movement/steering
    const joyZone = document.getElementById('touch-joystick-zone');
    const joyKnob = document.getElementById('touch-joystick-knob');
    let joyTouchId = null;
    let startX = 0;
    let startY = 0;

    joyZone.addEventListener('touchstart', e => {
      e.preventDefault();
      const touch = e.changedTouches[0];
      joyTouchId = touch.identifier;
      const rect = joyZone.getBoundingClientRect();
      startX = rect.left + rect.width / 2;
      startY = rect.top + rect.height / 2;
    });

    joyZone.addEventListener('touchmove', e => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === joyTouchId) {
          const dx = touch.clientX - startX;
          const dy = touch.clientY - startY;
          const dist = Math.hypot(dx, dy);
          const maxR = 45;
          const angle = Math.atan2(dy, dx);
          const clampedDist = Math.min(dist, maxR);

          joyKnob.style.transform = `translate(${Math.cos(angle) * clampedDist}px, ${Math.sin(angle) * clampedDist}px)`;

          // Normalize -1 to 1
          this.input.moveX = (Math.cos(angle) * clampedDist) / maxR;
          this.input.moveZ = (Math.sin(angle) * clampedDist) / maxR;

          // Also map to vehicle gas/steer
          this.input.gas = this.input.moveZ < -0.3;
          this.input.reverse = this.input.moveZ > 0.3;
          this.input.steerLeft = this.input.moveX < -0.2;
          this.input.steerRight = this.input.moveX > 0.2;
        }
      }
    });

    const resetJoy = e => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === joyTouchId) {
          joyTouchId = null;
          joyKnob.style.transform = 'translate(0px, 0px)';
          this.input.moveX = 0;
          this.input.moveZ = 0;
          this.input.gas = false;
          this.input.reverse = false;
          this.input.steerLeft = false;
          this.input.steerRight = false;
        }
      }
    };
    joyZone.addEventListener('touchend', resetJoy);
    joyZone.addEventListener('touchcancel', resetJoy);

    // Look / Aim Touch Pad (Right screen area)
    const lookZone = document.getElementById('touch-look-zone');
    let lookTouchId = null;
    let lastLookX = 0;
    let lastLookY = 0;

    lookZone.addEventListener('touchstart', e => {
      const touch = e.changedTouches[0];
      lookTouchId = touch.identifier;
      lastLookX = touch.clientX;
      lastLookY = touch.clientY;
    });

    lookZone.addEventListener('touchmove', e => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === lookTouchId) {
          this.input.lookDeltaX = (touch.clientX - lastLookX) * 1.5;
          this.input.lookDeltaY = (touch.clientY - lastLookY) * 1.5;
          lastLookX = touch.clientX;
          lastLookY = touch.clientY;
        }
      }
    });

    const endLook = e => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === lookTouchId) {
          lookTouchId = null;
          this.input.lookDeltaX = 0;
          this.input.lookDeltaY = 0;
        }
      }
    };
    lookZone.addEventListener('touchend', endLook);
    lookZone.addEventListener('touchcancel', endLook);

    // Action buttons bind helper
    this.bindTouchButton('btn-touch-enter', 'enterVehicle');
    this.bindTouchButton('btn-touch-shoot', 'shoot');
    this.bindTouchButton('btn-touch-aim', 'aim');
    this.bindTouchButton('btn-touch-drift', 'handbrake');
    this.bindTouchButton('btn-touch-horn', 'horn');
  }

  bindTouchButton(elemId, inputProp) {
    const btn = document.getElementById(elemId);
    if (!btn) return;
    btn.addEventListener('touchstart', e => {
      e.preventDefault();
      this.input[inputProp] = true;
    });
    btn.addEventListener('touchend', e => {
      e.preventDefault();
      this.input[inputProp] = false;
    });
    btn.addEventListener('touchcancel', e => {
      e.preventDefault();
      this.input[inputProp] = false;
    });
  }
}
