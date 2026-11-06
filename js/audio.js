/**
 * audio.js - Web Audio API Synthesizer for Terminal Telemetry
 * Provides zero-dependency, low-latency procedural sound design.
 */
class TelemetryAudio {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.initialized = false;
    
    // Check localStorage preference
    try {
      const saved = localStorage.getItem('dontlookup_sound_muted');
      if (saved !== null) {
        this.isMuted = saved === 'true';
      }
    } catch (e) {
      this.isMuted = false;
    }
  }

  init() {
    if (this.initialized && this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.initialized = true;
      }
    } catch (e) {
      console.warn('Web Audio not supported or blocked:', e);
    }
  }

  ensureContext() {
    if (!this.initialized) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    try {
      localStorage.setItem('dontlookup_sound_muted', this.isMuted);
    } catch (e) {}
    if (!this.isMuted) {
      this.playBlip(580, 0.04);
    }
    return this.isMuted;
  }

  playBlip(freq = 440, duration = 0.04, gainVal = 0.05) {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.7, this.ctx.currentTime + duration);

      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {}
  }

  playThresholdTick(direction = 1, currentThreshold = 35) {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    try {
      const baseFreq = 300 + (currentThreshold * 5);
      const freq = direction > 0 ? baseFreq + 80 : baseFreq - 40;
      const duration = 0.035;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {}
  }

  playDeploy() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;

      // 1. Sub-bass punch
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(110, now);
      subOsc.frequency.exponentialRampToValueAtTime(35, now + 0.35);

      subGain.gain.setValueAtTime(0.12, now);
      subGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

      subOsc.connect(subGain);
      subGain.connect(this.ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + 0.35);

      // 2. High-tech harmonic shimmer
      const chord = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      chord.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const noteStart = now + (idx * 0.04);
        const noteDuration = 0.28;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteStart);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.05, noteStart + noteDuration);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.setValueAtTime(0.045, noteStart);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + noteDuration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(noteStart);
        osc.stop(noteStart + noteDuration);
      });
    } catch (e) {}
  }

  playShockwaveHit() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.12);

      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } catch (e) {}
  }

  playModal(open = true) {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      if (open) {
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(520, now + 0.1);
      } else {
        osc.frequency.setValueAtTime(480, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.09);
      }

      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    } catch (e) {}
  }
}

window.soundEngine = new TelemetryAudio();

