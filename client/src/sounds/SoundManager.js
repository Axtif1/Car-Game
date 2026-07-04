/**
 * Procedural Web Audio Synthesizer & Sound Manager
 * Synthesizes dynamic RPM engine rumbles, gear shifts, tire drift screeches, nitro hums, and UI clicks.
 */
export class SoundManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.isInitialized = false;
    this.volume = 0.75;
    this.isMuted = false;

    // Active engine sound loops
    this.engineOsc = null;
    this.engineGain = null;
    this.engineFilter = null;

    // Active screech loop
    this.screechSource = null;
    this.screechGain = null;
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      const targetVol = this.isMuted ? 0 : this.volume;
      this.masterGain.gain.setTargetAtTime(targetVol, this.ctx.currentTime, 0.05);
    }
    if (this.isMuted) {
      this.muteEngine();
    }
    return this.isMuted;
  }

  init() {
    if (this.isInitialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.ctx.destination);

      this.setupEngineSound();
      this.setupScreechSound();
      this.isInitialized = true;
      console.log('🔊 [SoundManager] Procedural Audio Engine Synthesizer initialized.');
    } catch (e) {
      console.warn('⚠️ [SoundManager] Audio initialization blocked or unsupported:', e);
    }
  }

  setVolume(vol = 75) {
    this.volume = Math.max(0, Math.min(1, vol / 100));
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx?.currentTime || 0, 0.05);
    }
  }

  setupEngineSound() {
    if (!this.ctx) return;
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 180;

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0.0; // muted until racing

    this.engineOsc.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);
    this.engineOsc.start();
  }

  setupScreechSound() {
    if (!this.ctx) return;
    // Generate white noise buffer
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    this.screechSource = this.ctx.createBufferSource();
    this.screechSource.buffer = noiseBuffer;
    this.screechSource.loop = true;

    const bandpass = this.ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 2400;
    bandpass.Q.value = 4.0;

    this.screechGain = this.ctx.createGain();
    this.screechGain.gain.value = 0.0;

    this.screechSource.connect(bandpass);
    bandpass.connect(this.screechGain);
    this.screechGain.connect(this.masterGain);
    this.screechSource.start();
  }

  updateVehicleAudio(rpm, isDrifting, speedKmH) {
    if (!this.isInitialized || !this.ctx || this.isMuted) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    // Map RPM (1000 - 8000) to oscillator pitch (40Hz - 240Hz)
    const targetFreq = 40 + ((rpm - 1000) / 7000) * 200;
    this.engineOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.05);

    // Filter opens up at higher RPM
    const targetFilter = 150 + ((rpm - 1000) / 7000) * 850;
    this.engineFilter.frequency.setTargetAtTime(targetFilter, this.ctx.currentTime, 0.05);

    // Engine volume scales slightly with throttle/speed
    const engineVol = 0.15 + Math.min(0.2, (speedKmH / 200) * 0.2);
    this.engineGain.gain.setTargetAtTime(engineVol, this.ctx.currentTime, 0.05);

    // Screech during drift
    const screechVol = (isDrifting && speedKmH > 25) ? 0.25 : 0.0;
    this.screechGain.gain.setTargetAtTime(screechVol, this.ctx.currentTime, 0.08);
  }

  muteEngine() {
    if (!this.isInitialized || !this.ctx) return;
    if (this.engineGain) {
      this.engineGain.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.05);
    }
    if (this.screechGain) {
      this.screechGain.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.05);
    }
  }

  playGearShift() {
    if (!this.isInitialized || !this.ctx || this.isMuted) return;
    // Turbo blow-off chirp sound
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.0, this.ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  playCrash() {
    if (!this.isInitialized || !this.ctx || this.isMuted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(110, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(35, this.ctx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.0, this.ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  playCountdownBeep(isGo = false) {
    if (!this.isInitialized || !this.ctx || this.isMuted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    const freq = isGo ? 880 : 440;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.0, this.ctx.currentTime + (isGo ? 0.6 : 0.3));

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + (isGo ? 0.6 : 0.3));
  }

  playUIClick() {
    if (!this.isInitialized || !this.ctx || this.isMuted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(900, this.ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.0, this.ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }
}

export const soundManager = new SoundManager();
