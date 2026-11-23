import { clamp } from '../utils/MathUtils.js';

/**
 * GTA VI Next-Gen Procedural Audio Engine
 * Pure Web Audio API synthesis for zero latency, zero asset downloads, and realistic response
 */
export class SoundSystem {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.masterGain = null;
    this.sfxGain = null;
    this.engineGain = null;

    // Active engine synthesizers
    this.engines = new Map();
    this.tireSkidNode = null;
    this.tireSkidGain = null;

    // Siren synthesizers
    this.sirens = new Map();

    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.setValueAtTime(0.75, this.ctx.currentTime);
      this.engineGain.connect(this.masterGain);

      this.setupTireSkidSynth();
      this.initialized = true;

      // Handle resume on user gesture
      if (this.ctx.state === 'suspended') {
        const resume = () => {
          this.ctx.resume();
          window.removeEventListener('click', resume);
          window.removeEventListener('keydown', resume);
          window.removeEventListener('touchstart', resume);
        };
        window.addEventListener('click', resume);
        window.addEventListener('keydown', resume);
        window.addEventListener('touchstart', resume);
      }
    } catch (e) {
      console.warn('Web Audio API not supported or blocked:', e);
    }
  }

  setupTireSkidSynth() {
    if (!this.ctx) return;
    // White noise generator buffer for tire squeal
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    // Bandpass filter centered around 1100Hz with high Q for screeched rubber tone
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1150, this.ctx.currentTime);
    filter.Q.setValueAtTime(4.5, this.ctx.currentTime);

    this.tireSkidGain = this.ctx.createGain();
    this.tireSkidGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);

    whiteNoise.connect(filter);
    filter.connect(this.tireSkidGain);
    this.tireSkidGain.connect(this.sfxGain);

    whiteNoise.start();
    this.tireSkidNode = whiteNoise;
  }

  updateTireSkid(intensity) {
    if (!this.tireSkidGain || !this.ctx) return;
    const target = Math.min(1.0, Math.max(0, intensity));
    const volume = target > 0.05 ? target * 0.45 : 0.0001;
    this.tireSkidGain.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.04);
  }

  createEngineSynth(vehicleId, isSportsCar = true) {
    if (!this.ctx) return null;
    const t = this.ctx.currentTime;

    // 3 Oscillators for rich multi-cylinder combustion harmonics
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const subOsc = this.ctx.createOscillator();

    osc1.type = isSportsCar ? 'sawtooth' : 'triangle';
    osc2.type = 'sawtooth';
    subOsc.type = 'sine';

    const baseFreq = isSportsCar ? 55 : 42;
    osc1.frequency.setValueAtTime(baseFreq, t);
    osc2.frequency.setValueAtTime(baseFreq * 1.5, t);
    subOsc.frequency.setValueAtTime(baseFreq * 0.5, t);

    // Distortion wave-shaper for throaty roar
    const distortion = this.ctx.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i * 2) / 256 - 1;
      curve[i] = Math.tanh(x * 1.8);
    }
    distortion.curve = curve;

    // Low pass filter dynamically modulated by throttle/RPM
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(350, t);
    filter.Q.setValueAtTime(2.0, t);

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0.001, t);

    osc1.connect(distortion);
    osc2.connect(distortion);
    subOsc.connect(distortion);
    distortion.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.engineGain);

    osc1.start();
    osc2.start();
    subOsc.start();

    const synth = {
      osc1,
      osc2,
      subOsc,
      filter,
      gainNode,
      baseFreq,
      isSportsCar,
      active: true
    };
    this.engines.set(vehicleId, synth);
    return synth;
  }

  updateEngine(vehicleId, rpm, throttle, speedRatio) {
    if (!this.ctx) return;
    let synth = this.engines.get(vehicleId);
    if (!synth) {
      synth = this.createEngineSynth(vehicleId);
      if (!synth) return;
    }

    const t = this.ctx.currentTime;
    // Map RPM (0 to 1) to frequency
    const currentBase = synth.baseFreq * (1 + rpm * 3.4);
    synth.osc1.frequency.setTargetAtTime(currentBase, t, 0.05);
    synth.osc2.frequency.setTargetAtTime(currentBase * (synth.isSportsCar ? 1.5 : 1.33), t, 0.05);
    synth.subOsc.frequency.setTargetAtTime(currentBase * 0.5, t, 0.05);

    // Filter frequency opens up with throttle and RPM
    const filterFreq = 300 + rpm * 2800 + throttle * 1600;
    synth.filter.frequency.setTargetAtTime(filterFreq, t, 0.06);

    // Volume curves
    const targetVol = 0.15 + throttle * 0.22 + speedRatio * 0.15;
    synth.gainNode.gain.setTargetAtTime(targetVol, t, 0.05);
  }

  stopEngine(vehicleId) {
    const synth = this.engines.get(vehicleId);
    if (synth && this.ctx) {
      synth.gainNode.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.1);
      setTimeout(() => {
        try {
          synth.osc1.stop();
          synth.osc2.stop();
          synth.subOsc.stop();
          synth.gainNode.disconnect();
        } catch (_) {}
        this.engines.delete(vehicleId);
      }, 200);
    }
  }

  // Police Siren Synth
  startSiren(sirenId) {
    if (!this.ctx || this.sirens.has(sirenId)) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';

    // LFO for pitch sweep
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.5, t); // Wail speed

    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(300, t); // Frequency range sweep

    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    osc.frequency.setValueAtTime(750, t);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2200, t);

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0.25, t);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.sfxGain);

    osc.start();
    lfo.start();

    this.sirens.set(sirenId, { osc, lfo, gainNode });
  }

  updateSirenDistance(sirenId, distance) {
    const siren = this.sirens.get(sirenId);
    if (siren && this.ctx) {
      // Smooth distance attenuation: silent beyond 65 meters
      const vol = clamp(1.0 - (distance / 65.0), 0.0001, 1.0) * 0.22;
      siren.gainNode.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.1);
    }
  }

  stopSiren(sirenId) {
    const siren = this.sirens.get(sirenId);
    if (siren && this.ctx) {
      siren.gainNode.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.1);
      setTimeout(() => {
        try {
          siren.osc.stop();
          siren.lfo.stop();
          siren.gainNode.disconnect();
        } catch (_) {}
        this.sirens.delete(sirenId);
      }, 150);
    }
  }

  playGunshot(weaponType = 'pistol') {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    // 1. Sharp initial mechanical crack
    const osc = this.ctx.createOscillator();
    osc.type = weaponType === 'shotgun' ? 'triangle' : 'sawtooth';
    const initFreq = weaponType === 'sniper' ? 400 : weaponType === 'shotgun' ? 220 : 550;
    osc.frequency.setValueAtTime(initFreq, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.12);

    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(0.65, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);

    // 2. Gunpowder explosion burst (filtered noise)
    const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.4, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.08));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(weaponType === 'shotgun' ? 1800 : 3200, t);
    noiseFilter.frequency.exponentialRampToValueAtTime(400, t + 0.35);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.8, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);

    osc.start(t);
    noise.start(t);
    osc.stop(t + 0.2);
    noise.stop(t + 0.4);
  }

  playExplosion() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    // Sub-bass impact shockwave
    const sub = this.ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(130, t);
    sub.frequency.exponentialRampToValueAtTime(20, t + 0.8);

    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(1.0, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);

    sub.connect(subGain);
    subGain.connect(this.sfxGain);

    // Heavy rubble and fire blast noise
    const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 1.5, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.35));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, t);
    filter.frequency.linearRampToValueAtTime(150, t + 1.2);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.9, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 1.4);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);

    sub.start(t);
    noise.start(t);
    sub.stop(t + 1.3);
    noise.stop(t + 1.5);
  }

  playCrash(intensity = 0.5) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const clamped = Math.min(1.0, Math.max(0.1, intensity));

    // Metallic hit clang
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160 + clamped * 120, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.25);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(clamped * 0.7, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    // Noise crumple crunch
    const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.25, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.08));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(clamped * 0.6, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    noise.connect(noiseGain);
    noiseGain.connect(this.sfxGain);

    osc.start(t);
    noise.start(t);
    osc.stop(t + 0.3);
    noise.stop(t + 0.3);
  }

  playHorn() {
    if (!this.ctx) return null;
    const t = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    osc1.type = 'triangle';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(392, t); // G4
    osc2.frequency.setValueAtTime(493.88, t); // B4 (Major 3rd interval car horn)

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.28, t);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxGain);

    osc1.start(t);
    osc2.start(t);

    return {
      stop: () => {
        gain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.05);
        setTimeout(() => {
          try {
            osc1.stop();
            osc2.stop();
            gain.disconnect();
          } catch (_) {}
        }, 100);
      }
    };
  }

  playCashPickup() {
    if (!this.ctx || this.isMuted) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(987.77, t); // B5
      osc.frequency.setValueAtTime(1318.51, t + 0.08); // E6

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.35);
    } catch (_) {}
  }

  playCarDoor() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(90, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.12);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.15);
  }
}
