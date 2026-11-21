import { RadioStationId, VehicleKind } from '../types/game';

export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineSubOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private hornOscA: OscillatorNode | null = null;
  private hornOscB: OscillatorNode | null = null;
  private hornGain: GainNode | null = null;
  private sirenOsc: OscillatorNode | null = null;
  private sirenGain: GainNode | null = null;
  private rainGain: GainNode | null = null;
  private nitroGain: GainNode | null = null;

  private enabled = true;
  private volume = 0.55;
  private paused = false;
  private initialized = false;
  private stepCooldown = 0;
  private sirenPhase = 0;
  private radioStation: RadioStationId = 'off';
  private radioBeatTimer = 0;
  private radioStep = 0;

  public unlock(): void {
    if (this.initialized) {
      if (this.ctx && this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return;
    }

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      this.ctx = ctx;

      const master = ctx.createGain();
      master.gain.value = this.getTargetMasterGain();
      master.connect(ctx.destination);
      this.masterGain = master;

      // Dhaka street ambient bed
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + 0.03 * white) / 1.03;
        lastOut = output[i];
        output[i] *= 1.6;
      }
      const ambientSource = ctx.createBufferSource();
      ambientSource.buffer = noiseBuffer;
      ambientSource.loop = true;

      const ambientFilter = ctx.createBiquadFilter();
      ambientFilter.type = 'bandpass';
      ambientFilter.frequency.value = 340;
      ambientFilter.Q.value = 0.7;

      const ambientGain = ctx.createGain();
      ambientGain.gain.value = 0.12;
      ambientSource.connect(ambientFilter);
      ambientFilter.connect(ambientGain);
      ambientGain.connect(master);
      ambientSource.start();

      // Continuous vehicle engine synth
      const engGain = ctx.createGain();
      engGain.gain.value = 0;
      const engFilter = ctx.createBiquadFilter();
      engFilter.type = 'lowpass';
      engFilter.frequency.value = 280;

      const engOsc = ctx.createOscillator();
      engOsc.type = 'sawtooth';
      engOsc.frequency.value = 65;

      const engSub = ctx.createOscillator();
      engSub.type = 'triangle';
      engSub.frequency.value = 32;

      engOsc.connect(engFilter);
      engSub.connect(engFilter);
      engFilter.connect(engGain);
      engGain.connect(master);
      engOsc.start();
      engSub.start();

      this.engineOsc = engOsc;
      this.engineSubOsc = engSub;
      this.engineGain = engGain;

      // Dual-tone horn synth
      const hornGain = ctx.createGain();
      hornGain.gain.value = 0;
      const hornFilter = ctx.createBiquadFilter();
      hornFilter.type = 'bandpass';
      hornFilter.frequency.value = 620;

      const hA = ctx.createOscillator();
      hA.type = 'sawtooth';
      hA.frequency.value = 415;
      const hB = ctx.createOscillator();
      hB.type = 'sawtooth';
      hB.frequency.value = 523;

      hA.connect(hornFilter);
      hB.connect(hornFilter);
      hornFilter.connect(hornGain);
      hornGain.connect(master);
      hA.start();
      hB.start();

      this.hornOscA = hA;
      this.hornOscB = hB;
      this.hornGain = hornGain;

      // Police siren wail synth
      const sGain = ctx.createGain();
      sGain.gain.value = 0;
      const sOsc = ctx.createOscillator();
      sOsc.type = 'triangle';
      sOsc.frequency.value = 680;
      sOsc.connect(sGain);
      sGain.connect(master);
      sOsc.start();
      this.sirenOsc = sOsc;
      this.sirenGain = sGain;

      // Monsoon Rain white-noise hiss bed
      const rainSource = ctx.createBufferSource();
      rainSource.buffer = noiseBuffer;
      rainSource.loop = true;
      const rainFilter = ctx.createBiquadFilter();
      rainFilter.type = 'highpass';
      rainFilter.frequency.value = 1100;
      const rGain = ctx.createGain();
      rGain.gain.value = 0;
      rainSource.connect(rainFilter);
      rainFilter.connect(rGain);
      rGain.connect(master);
      rainSource.start();
      this.rainGain = rGain;

      // Turbo Nitro jet whoosh bed
      const nitroSource = ctx.createBufferSource();
      nitroSource.buffer = noiseBuffer;
      nitroSource.loop = true;
      const nitroFilter = ctx.createBiquadFilter();
      nitroFilter.type = 'bandpass';
      nitroFilter.frequency.value = 820;
      nitroFilter.Q.value = 1.4;
      const nGain = ctx.createGain();
      nGain.gain.value = 0;
      nitroSource.connect(nitroFilter);
      nitroFilter.connect(nGain);
      nGain.connect(master);
      nitroSource.start();
      this.nitroGain = nGain;

      this.initialized = true;
    } catch {
      // Audio unavailable
    }
  }

  private getTargetMasterGain(): number {
    if (!this.enabled || this.paused) return 0;
    return this.volume * 0.72;
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.syncMasterGain();
  }

  public setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    this.syncMasterGain();
  }

  public setPaused(paused: boolean): void {
    this.paused = paused;
    this.syncMasterGain();
  }

  private syncMasterGain(): void {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.getTargetMasterGain(), this.ctx.currentTime, 0.05);
    }
  }

  public updateFootsteps(dt: number, speedRatio: number, grounded: boolean): void {
    if (!this.initialized || !this.enabled || !this.ctx || !this.masterGain) return;
    if (!grounded || speedRatio < 0.15) {
      this.stepCooldown = Math.min(this.stepCooldown, 0.08);
      return;
    }
    this.stepCooldown -= dt;
    if (this.stepCooldown <= 0) {
      this.playFootstep(speedRatio > 0.72);
      this.stepCooldown = speedRatio > 0.72 ? 0.28 : 0.44;
    }
  }

  private playFootstep(sprint: boolean): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(sprint ? 125 : 100, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.065);
    gain.gain.setValueAtTime(sprint ? 0.18 : 0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  public updateVehicleEngine(
    inVehicle: boolean,
    speedKmh: number,
    throttle: number,
    kind: VehicleKind | null
  ): void {
    if (!this.initialized || !this.ctx || !this.engineGain || !this.engineOsc || !this.engineSubOsc) {
      return;
    }
    const now = this.ctx.currentTime;
    if (!inVehicle || !kind) {
      this.engineGain.gain.setTargetAtTime(0, now, 0.08);
      return;
    }

    const absSpeed = Math.abs(speedKmh);

    if (kind === 'helicopter') {
      // Rhythmic chopper blade thump + turbine whine
      const pulse = 0.5 + 0.5 * Math.sin(now * 28.0);
      const bladeFreq = 34 + absSpeed * 0.45 + throttle * 16;
      this.engineOsc.type = 'triangle';
      this.engineOsc.frequency.setTargetAtTime(bladeFreq * 2.2, now, 0.05);
      this.engineSubOsc.frequency.setTargetAtTime(bladeFreq, now, 0.05);
      const vol = (0.11 + throttle * 0.07) * (0.65 + pulse * 0.35);
      this.engineGain.gain.setTargetAtTime(vol, now, 0.05);
      return;
    }

    if (kind === 'speedboat') {
      // Deep outboard twin-motor water roar
      const freq = 64 + absSpeed * 2.1 + throttle * 38;
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.setTargetAtTime(freq, now, 0.06);
      this.engineSubOsc.frequency.setTargetAtTime(freq * 0.48, now, 0.06);
      const vol = Math.min(0.25, 0.08 + throttle * 0.1 + (absSpeed / 130) * 0.07);
      this.engineGain.gain.setTargetAtTime(vol, now, 0.07);
      return;
    }

    const baseFreq =
      kind === 'cng' || kind === 'motorcycle'
        ? 90
        : kind === 'sports' || kind === 'police'
          ? 74
          : kind === 'bus' || kind === 'truck'
            ? 44
            : 56;
    const pitchScale =
      kind === 'motorcycle' ? 2.6 : kind === 'sports' ? 2.3 : kind === 'cng' ? 1.9 : 1.45;
    const freq = baseFreq + absSpeed * pitchScale + throttle * 32;

    this.engineOsc.type = kind === 'cng' || kind === 'motorcycle' ? 'square' : 'sawtooth';
    this.engineOsc.frequency.setTargetAtTime(freq, now, 0.06);
    this.engineSubOsc.frequency.setTargetAtTime(freq * 0.5, now, 0.06);

    const vol = Math.min(0.24, 0.065 + throttle * 0.085 + (absSpeed / 150) * 0.08);
    this.engineGain.gain.setTargetAtTime(vol, now, 0.08);
  }

  public updatePoliceSiren(dt: number, active: boolean, nearestDist: number): void {
    if (!this.initialized || !this.ctx || !this.sirenGain || !this.sirenOsc) return;
    const now = this.ctx.currentTime;
    if (!active || !this.enabled || nearestDist > 95) {
      this.sirenGain.gain.setTargetAtTime(0, now, 0.08);
      return;
    }
    this.sirenPhase += dt * 4.5;
    const freq = 660 + Math.sin(this.sirenPhase) * 210;
    const atten = Math.max(0.03, 1 - nearestDist / 95) * 0.14;
    this.sirenOsc.frequency.setTargetAtTime(freq, now, 0.03);
    this.sirenGain.gain.setTargetAtTime(atten, now, 0.06);
  }

  public setRadioStation(station: RadioStationId): void {
    this.radioStation = station;
    this.radioStep = 0;
    this.radioBeatTimer = 0;
  }

  public updateAtmosphereAndRadio(
    dt: number,
    rainIntensity: number,
    insideBuilding: boolean,
    nitroActive: boolean
  ): void {
    if (!this.initialized || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    if (this.rainGain) {
      const targetRainVol =
        this.enabled && !this.paused ? rainIntensity * (insideBuilding ? 0.04 : 0.18) : 0;
      this.rainGain.gain.setTargetAtTime(targetRainVol, now, 0.12);
    }

    if (this.nitroGain) {
      const targetNitro = this.enabled && !this.paused && nitroActive ? 0.2 : 0;
      this.nitroGain.gain.setTargetAtTime(targetNitro, now, 0.05);
    }

    if (this.radioStation === 'off' || !this.enabled || this.paused) return;

    const stepDur =
      this.radioStation === 'lofi' ? 0.34 : this.radioStation === 'synth' ? 0.22 : 0.25;
    this.radioBeatTimer -= dt;
    if (this.radioBeatTimer <= 0) {
      this.radioBeatTimer = stepDur;
      this.triggerRadioStep(this.radioStation, this.radioStep++);
    }
  }

  private triggerRadioStep(station: RadioStationId, step: number): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const lofiNotes = [261.6, 329.6, 392.0, 493.9, 293.7, 349.2, 440.0, 392.0];
    const synthNotes = [146.8, 220.0, 293.7, 329.6, 174.6, 261.6, 349.2, 293.7];
    const streetNotes = [196.0, 196.0, 233.1, 261.6, 174.6, 220.0, 293.7, 233.1];

    const pool =
      station === 'lofi' ? lofiNotes : station === 'synth' ? synthNotes : streetNotes;
    const freq = pool[step % pool.length];

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = station === 'lofi' ? 'sine' : station === 'synth' ? 'sawtooth' : 'triangle';

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = station === 'lofi' ? 680 : station === 'synth' ? 1150 : 920;

    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(station === 'lofi' ? 0.055 : 0.048, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.24);

    // Subtle kick pulse on beat 0 & 4
    if (step % 4 === 0) {
      const kick = this.ctx.createOscillator();
      const kGain = this.ctx.createGain();
      kick.type = 'sine';
      kick.frequency.setValueAtTime(110, now);
      kick.frequency.exponentialRampToValueAtTime(38, now + 0.11);
      kGain.gain.setValueAtTime(0.11, now);
      kGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      kick.connect(kGain);
      kGain.connect(this.masterGain);
      kick.start(now);
      kick.stop(now + 0.13);
    }
  }

  public playThunder(): void {
    if (!this.initialized || !this.enabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(62, now);
    osc.frequency.exponentialRampToValueAtTime(24, now + 1.4);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 140;
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.55);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 1.6);
  }

  public setHorn(active: boolean, kind: VehicleKind | null): void {
    if (!this.initialized || !this.ctx || !this.hornGain || !this.hornOscA || !this.hornOscB) return;
    const now = this.ctx.currentTime;
    if (active && this.enabled) {
      if (kind === 'cng' || kind === 'motorcycle') {
        this.hornOscA.frequency.setValueAtTime(590, now);
        this.hornOscB.frequency.setValueAtTime(720, now);
      } else if (kind === 'bus' || kind === 'truck') {
        this.hornOscA.frequency.setValueAtTime(240, now);
        this.hornOscB.frequency.setValueAtTime(302, now);
      } else {
        this.hornOscA.frequency.setValueAtTime(410, now);
        this.hornOscB.frequency.setValueAtTime(515, now);
      }
      this.hornGain.gain.setTargetAtTime(0.22, now, 0.02);
    } else {
      this.hornGain.gain.setTargetAtTime(0, now, 0.03);
    }
  }

  public playDoorSound(): void {
    if (!this.initialized || !this.enabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(165, now);
    osc.frequency.exponentialRampToValueAtTime(48, now + 0.12);
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  public playAlarmBurst(): void {
    if (!this.initialized || !this.enabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const start = now + i * 0.22;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(920, start);
      gain.gain.setValueAtTime(0.14, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.13);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(start);
      osc.stop(start + 0.14);
    }
  }

  public playChime(
    type: 'buy' | 'mission_win' | 'mission_fail' | 'briefing' | 'squad_cmd' | 'clue' | 'alert'
  ): void {
    if (!this.initialized || !this.enabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const notes =
      type === 'buy'
        ? [523, 659, 784]
        : type === 'mission_win'
          ? [440, 554, 659, 880]
          : type === 'mission_fail'
            ? [330, 277, 220]
            : type === 'briefing'
              ? [392, 494, 587, 784]
              : type === 'squad_cmd'
                ? [620, 820]
                : type === 'clue'
                  ? [587, 880, 1046]
                  : [740, 587, 740];

    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const t = now + idx * 0.08;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type === 'squad_cmd' || type === 'alert' ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(type === 'squad_cmd' ? 0.13 : 0.16, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.22);
    });
  }

  public playStuntBonus(): void {
    if (!this.initialized || !this.enabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const t = now + idx * 0.065;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  }

  public playWeaponShot(weaponId: string): void {
    if (!this.initialized || !this.enabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    if (weaponId === 'fist') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(48, now + 0.09);
      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.11);
      return;
    }

    // Crisp noise crack + low body thump tuned per weapon class
    const dur =
      weaponId === 'shotgun' || weaponId === 'sniper'
        ? 0.24
        : weaponId === 'rifle'
          ? 0.15
          : weaponId === 'smg'
            ? 0.08
            : 0.12;
    const bufLen = Math.max(256, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp((-i / bufLen) * 5.2);
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value =
      weaponId === 'shotgun'
        ? 520
        : weaponId === 'sniper'
          ? 980
          : weaponId === 'rifle'
            ? 840
            : weaponId === 'smg'
              ? 1350
              : 1120;
    filter.Q.value = 0.8;

    const nGain = this.ctx.createGain();
    const peak =
      weaponId === 'shotgun' || weaponId === 'sniper'
        ? 0.55
        : weaponId === 'rifle'
          ? 0.42
          : 0.32;
    nGain.gain.setValueAtTime(peak, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(this.masterGain);
    noise.start(now);

    // Punchy low-end barrel thump
    const thump = this.ctx.createOscillator();
    const tGain = this.ctx.createGain();
    thump.type = 'sawtooth';
    thump.frequency.setValueAtTime(
      weaponId === 'shotgun' ? 140 : weaponId === 'sniper' ? 210 : 185,
      now
    );
    thump.frequency.exponentialRampToValueAtTime(34, now + dur * 0.85);
    tGain.gain.setValueAtTime(peak * 0.65, now);
    tGain.gain.exponentialRampToValueAtTime(0.001, now + dur * 0.9);
    thump.connect(tGain);
    tGain.connect(this.masterGain);
    thump.start(now);
    thump.stop(now + dur);
  }

  public playReload(): void {
    if (!this.initialized || !this.enabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    [0, 0.22].forEach((delay, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(idx === 0 ? 480 : 760, now + delay);
      gain.gain.setValueAtTime(0.11, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.055);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + delay);
      osc.stop(now + delay + 0.06);
    });
  }

  public playExplosion(): void {
    if (!this.initialized || !this.enabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const dur = 1.15;
    const bufLen = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp((-i / bufLen) * 3.1);
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(420, now);
    filter.frequency.exponentialRampToValueAtTime(65, now + dur);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.62, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(now);

    const sub = this.ctx.createOscillator();
    const sGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(88, now);
    sub.frequency.exponentialRampToValueAtTime(22, now + 0.85);
    sGain.gain.setValueAtTime(0.5, now);
    sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
    sub.connect(sGain);
    sGain.connect(this.masterGain);
    sub.start(now);
    sub.stop(now + 0.92);
  }

  public dispose(): void {
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
    this.initialized = false;
  }
}
