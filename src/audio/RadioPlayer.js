/**
 * GTA VI In-Game Procedural Radio Stations
 * Synthwave, Miami Pop/Funk, and Modern Vice City Trap
 */
export class RadioPlayer {
  constructor(soundSystem) {
    this.soundSystem = soundSystem;
    this.stations = [
      { id: 'off', name: 'RADIO OFF', genre: 'Muted' },
      { id: 'vice_wave', name: 'VICE WAVE 103', genre: '80s Synthwave / Outrun' },
      { id: 'flash_fm', name: 'FLASH FM 105.8', genre: 'Miami Dance Pop' },
      { id: 'leonida_trap', name: 'LEONIDA 99.1 FM', genre: 'South Coast Trap & Hip-Hop' }
    ];
    this.currentStationIndex = 1; // Default to Vice Wave
    this.isPlaying = false;
    this.stepIndex = 0;
    this.intervalId = null;
    this.radioGain = null;
  }

  init() {
    if (!this.soundSystem.ctx || this.radioGain) return;
    this.radioGain = this.soundSystem.ctx.createGain();
    this.radioGain.gain.setValueAtTime(0.35, this.soundSystem.ctx.currentTime);
    this.radioGain.connect(this.soundSystem.masterGain);
  }

  get currentStation() {
    return this.stations[this.currentStationIndex];
  }

  nextStation() {
    this.currentStationIndex = (this.currentStationIndex + 1) % this.stations.length;
    this.onStationChanged();
    return this.currentStation;
  }

  setStation(index) {
    if (index >= 0 && index < this.stations.length) {
      this.currentStationIndex = index;
      this.onStationChanged();
    }
  }

  onStationChanged() {
    this.stopPlayback();
    if (this.currentStation.id !== 'off' && this.isPlaying) {
      this.startPlayback();
    }
  }

  start() {
    this.init();
    this.isPlaying = true;
    if (this.currentStation.id !== 'off') {
      this.startPlayback();
    }
  }

  stop() {
    this.isPlaying = false;
    this.stopPlayback();
  }

  stopPlayback() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.stepIndex = 0;
  }

  startPlayback() {
    this.stopPlayback();
    if (!this.soundSystem.ctx) return;

    const bpm = this.currentStation.id === 'leonida_trap' ? 140 : 120;
    const stepTime = (60 / bpm) / 4; // 16th notes

    this.intervalId = setInterval(() => {
      this.tickStep();
      this.stepIndex = (this.stepIndex + 1) % 16;
    }, stepTime * 1000);
  }

  tickStep() {
    const ctx = this.soundSystem.ctx;
    if (!ctx || ctx.state !== 'running' || !this.radioGain) return;
    const t = ctx.currentTime;
    const s = this.stepIndex;

    const stationId = this.currentStation.id;

    if (stationId === 'vice_wave') {
      // 1. Kick on 0, 4, 8, 12
      if (s % 4 === 0) {
        this.synthKick(t, 0.45);
      }
      // 2. Snare on 4, 12
      if (s === 4 || s === 12) {
        this.synthSnare(t, 0.35);
      }
      // 3. Hihat on every odd 16th note
      if (s % 2 === 1) {
        this.synthHihat(t, 0.15);
      }
      // 4. Synthwave rolling bassline (A minor / F / G progression)
      const bar = Math.floor(this.stepIndex / 16);
      const bassNotes = [110, 110, 164.81, 110, 87.31, 87.31, 130.81, 87.31, 98, 98, 146.83, 98, 82.41, 82.41, 123.47, 82.41];
      const note = bassNotes[s % bassNotes.length];
      this.synthBass(t, note, 0.22, 0.12, 'sawtooth');

      // Chords on bar start
      if (s === 0) {
        this.synthPad(t, [220, 261.63, 329.63], 0.18, 1.8);
      } else if (s === 8) {
        this.synthPad(t, [174.61, 220, 261.63], 0.18, 1.8);
      }
    } else if (stationId === 'flash_fm') {
      // Upbeat Miami Pop / Disco Funk
      if (s % 4 === 0) {
        this.synthKick(t, 0.42);
      }
      if (s === 4 || s === 12) {
        this.synthSnare(t, 0.3);
        this.synthClap(t, 0.25);
      }
      // Offbeat open hihats
      if (s % 4 === 2) {
        this.synthHihat(t, 0.22, true);
      } else if (s % 2 === 1) {
        this.synthHihat(t, 0.12, false);
      }
      // Funk bassline
      const funkNotes = [130.81, 0, 130.81, 155.56, 0, 174.61, 0, 196, 174.61, 0, 155.56, 130.81, 0, 116.54, 130.81, 0];
      const fn = funkNotes[s];
      if (fn > 0) {
        this.synthBass(t, fn, 0.28, 0.1, 'triangle');
      }
    } else if (stationId === 'leonida_trap') {
      // Trap 808 & high tempo hihat rolls
      if (s === 0 || s === 10) {
        this.synth808(t, 45, 0.55);
      }
      if (s === 8) {
        this.synthClap(t, 0.4);
      }
      // Fast rolling hats
      if (s % 2 === 0 || s > 12) {
        this.synthHihat(t, s > 12 ? 0.2 : 0.12, false);
      }
      if (s === 0) {
        this.synthPad(t, [146.83, 174.61, 220], 0.15, 2.4);
      }
    }
  }

  synthKick(t, vol = 0.5) {
    const ctx = this.soundSystem.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.12);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    osc.connect(gain);
    gain.connect(this.radioGain);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  synthSnare(t, vol = 0.3) {
    const ctx = this.soundSystem.ctx;
    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.12, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.025));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(900, t);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.radioGain);
    noise.start(t);
    noise.stop(t + 0.13);
  }

  synthClap(t, vol = 0.25) {
    this.synthSnare(t, vol);
  }

  synthHihat(t, vol = 0.15, open = false) {
    const ctx = this.soundSystem.ctx;
    const duration = open ? 0.15 : 0.04;
    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(7500, t);
    filter.Q.setValueAtTime(3.0, t);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.radioGain);
    noise.start(t);
    noise.stop(t + duration + 0.01);
  }

  synthBass(t, freq, vol = 0.25, dur = 0.15, type = 'sawtooth') {
    const ctx = this.soundSystem.ctx;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 3.5, t);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.radioGain);
    osc.start(t);
    osc.stop(t + dur + 0.01);
  }

  synth808(t, freq = 45, vol = 0.5) {
    const ctx = this.soundSystem.ctx;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 1.8, t);
    osc.frequency.exponentialRampToValueAtTime(freq, t + 0.08);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.65);

    osc.connect(gain);
    gain.connect(this.radioGain);
    osc.start(t);
    osc.stop(t + 0.7);
  }

  synthPad(t, freqs, vol = 0.15, dur = 2.0) {
    const ctx = this.soundSystem.ctx;
    freqs.forEach(f => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, t);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(650, t);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(vol / freqs.length, t + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.radioGain);
      osc.start(t);
      osc.stop(t + dur);
    });
  }
}
