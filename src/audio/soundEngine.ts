import type {GroundSurface} from '../systems/gameSim';

export type MusicMood = 'menu' | 'explore' | 'combat' | 'boss' | 'silent';

export class SlavicSoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  private droneOsc1: OscillatorNode | null = null;
  private droneOsc2: OscillatorNode | null = null;
  private choirOsc1: OscillatorNode | null = null;
  private choirOsc2: OscillatorNode | null = null;
  private choirGain: GainNode | null = null;
  private droneFilter: BiquadFilterNode | null = null;

  // Ambient wind bed + Zero-GC pre-allocated noise buffer pool
  private windSrc: AudioBufferSourceNode | null = null;
  private windGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private shortNoiseBuf: AudioBuffer | null = null;
  private longNoiseBuf: AudioBuffer | null = null;
  private loopNoiseBuf: AudioBuffer | null = null;

  private schedulerTimer: number | null = null;
  private stepIdx = 0;

  private mood: MusicMood = 'menu';
  private navBlend = 0;
  private resonance = 0;
  private campfireProximity = 1; // 0 = far, 1 = next to hearth
  private masterVol = 0.72;
  private musicVol = 0.62;
  private sfxVol = 0.8;
  private muted = false;

  unlock(): void {
    if (typeof window === 'undefined') return;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as {webkitAudioContext?: typeof AudioContext}).webkitAudioContext;
    if (!AudioCtx) return;

    if (!this.ctx) {
      try {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.musicGain = this.ctx.createGain();
        this.sfxGain = this.ctx.createGain();
        this.musicGain.connect(this.masterGain);
        this.sfxGain.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);
        this.initNoisePool();
        this.applyVolumes();
        this.startAmbientLayers();
      } catch {
        this.ctx = null;
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
  }

  private initNoisePool(): void {
    if (!this.ctx) return;
    const sr = this.ctx.sampleRate;

    const makeDecaying = (sec: number): AudioBuffer => {
      const len = Math.max(1, Math.floor(sr * sec));
      const buf = this.ctx!.createBuffer(1, len, sr);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      }
      return buf;
    };

    this.shortNoiseBuf = makeDecaying(0.18);
    this.longNoiseBuf = makeDecaying(0.45);

    // 2.0s seamless pink-ish loop buffer for nocturnal birch wind & crackles
    const loopLen = Math.max(1, Math.floor(sr * 2.0));
    const loopBuf = this.ctx.createBuffer(1, loopLen, sr);
    const ld = loopBuf.getChannelData(0);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < loopLen; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + w * 0.029;
      b1 = 0.985 * b1 + w * 0.032;
      b2 = 0.95 * b2 + w * 0.048;
      ld[i] = (b0 + b1 + b2 + w * 0.06) * 0.45;
    }
    this.loopNoiseBuf = loopBuf;
  }

  setVolumes(master: number, music: number, sfx: number, muted: boolean): void {
    this.masterVol = master;
    this.musicVol = music;
    this.sfxVol = sfx;
    this.muted = muted;
    this.applyVolumes();
  }

  setAdaptiveState(mood: MusicMood, navBlend: number, resonance: number, campfireProximity = 0): void {
    this.mood = mood;
    this.navBlend = navBlend;
    this.resonance = resonance;
    this.campfireProximity = campfireProximity;
    if (!this.ctx || !this.choirGain || !this.droneFilter) return;

    const now = this.ctx.currentTime;
    const choirLevel =
      mood === 'silent'
        ? 0.0001
        : mood === 'menu'
          ? 0.055 + navBlend * 0.06
          : 0.03 + navBlend * 0.1 + Math.min(1, resonance / 5) * 0.12;
    this.choirGain.gain.setTargetAtTime(choirLevel, now, 0.35);

    const cutoff = mood === 'combat' || mood === 'boss' ? 420 + navBlend * 220 : 260 + navBlend * 140;
    this.droneFilter.frequency.setTargetAtTime(cutoff, now, 0.4);

    if (this.windGain && this.windFilter) {
      const windLevel = mood === 'silent' ? 0.0001 : 0.045 + navBlend * 0.055;
      this.windGain.gain.setTargetAtTime(windLevel, now, 0.4);
      this.windFilter.frequency.setTargetAtTime(340 + navBlend * 260, now, 0.5);
    }
  }

  private applyVolumes(): void {
    if (!this.ctx || !this.masterGain || !this.musicGain || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const m = this.muted ? 0 : this.masterVol;
    this.masterGain.gain.setTargetAtTime(m, now, 0.06);
    this.musicGain.gain.setTargetAtTime(this.musicVol * 0.55, now, 0.08);
    this.sfxGain.gain.setTargetAtTime(this.sfxVol * 0.78, now, 0.05);
  }

  private startAmbientLayers(): void {
    if (!this.ctx || !this.musicGain) return;

    // Deep bowed D-minor drone
    this.droneFilter = this.ctx.createBiquadFilter();
    this.droneFilter.type = 'lowpass';
    this.droneFilter.frequency.value = 280;
    const droneGain = this.ctx.createGain();
    droneGain.gain.value = 0.14;
    this.droneFilter.connect(droneGain).connect(this.musicGain);

    this.droneOsc1 = this.ctx.createOscillator();
    this.droneOsc1.type = 'sawtooth';
    this.droneOsc1.frequency.value = 73.42; // D2
    this.droneOsc1.connect(this.droneFilter);
    this.droneOsc1.start();

    this.droneOsc2 = this.ctx.createOscillator();
    this.droneOsc2.type = 'triangle';
    this.droneOsc2.frequency.value = 110.0; // A2
    this.droneOsc2.connect(this.droneFilter);
    this.droneOsc2.start();

    // Formant synthetic choir pad
    const formant = this.ctx.createBiquadFilter();
    formant.type = 'bandpass';
    formant.frequency.value = 540;
    formant.Q.value = 2.4;
    this.choirGain = this.ctx.createGain();
    this.choirGain.gain.value = 0.05;
    formant.connect(this.choirGain).connect(this.musicGain);

    this.choirOsc1 = this.ctx.createOscillator();
    this.choirOsc1.type = 'sawtooth';
    this.choirOsc1.frequency.value = 146.83;
    this.choirOsc1.connect(formant);
    this.choirOsc1.start();

    this.choirOsc2 = this.ctx.createOscillator();
    this.choirOsc2.type = 'sawtooth';
    this.choirOsc2.frequency.value = 174.61;
    this.choirOsc2.connect(formant);
    this.choirOsc2.start();

    // Nocturnal forest wind bed (zero-GC looped noise)
    if (this.loopNoiseBuf && this.sfxGain) {
      this.windFilter = this.ctx.createBiquadFilter();
      this.windFilter.type = 'bandpass';
      this.windFilter.frequency.value = 360;
      this.windFilter.Q.value = 1.6;
      this.windGain = this.ctx.createGain();
      this.windGain.gain.value = 0.05;
      this.windSrc = this.ctx.createBufferSource();
      this.windSrc.buffer = this.loopNoiseBuf;
      this.windSrc.loop = true;
      this.windSrc.connect(this.windFilter).connect(this.windGain).connect(this.sfxGain);
      this.windSrc.start();
    }

    if (this.schedulerTimer === null) {
      this.schedulerTimer = window.setInterval(() => this.tickBar(), 420);
    }
  }

  private tickBar(): void {
    if (!this.ctx || !this.musicGain || this.ctx.state !== 'running' || this.mood === 'silent') return;

    const now = this.ctx.currentTime;
    const step = this.stepIdx++;

    // Subtle hearth log crackles when standing near Ostrog campfires or on title screen
    if (this.campfireProximity > 0.08 && step % 2 === 1) {
      this.playCampfireCrackle(0.065 * this.campfireProximity);
    }

    // Haunting Slavic gusli / bowed motif notes
    const scale = [146.83, 174.61, 164.81, 220.0, 233.08, 220.0, 174.61, 138.59];
    if (this.mood === 'menu' && step % 3 === 0) {
      this.playPluck(scale[(step / 3) % scale.length] * 2, 0.075, 1.4, now);
    } else if (this.mood === 'explore' && step % 4 === 0) {
      this.playPluck(scale[(step / 4) % scale.length], 0.06, 1.1, now);
      if (step % 8 === 0) this.playDrum(52, 0.14, 0.35, now);
    } else if (this.mood === 'combat' || this.mood === 'boss') {
      const accent = step % 4 === 0 ? 0.28 : step % 2 === 0 ? 0.16 : 0.08;
      this.playDrum(step % 4 === 0 ? 48 : 66, accent, 0.24, now);
      const resBoost = Math.min(1, this.resonance / 5);
      if (step % 2 === 0 || resBoost > 0.5) {
        const note = scale[step % scale.length] * (this.mood === 'boss' ? 1 : 2) * (1 + resBoost * 0.02);
        this.playPluck(note, 0.065 + resBoost * 0.035, 0.55, now);
      }
      if (this.choirOsc2 && step % 8 === 0) {
        const harmony = this.navBlend > 0.5 ? 185.0 : resBoost >= 0.6 ? 220.0 : 174.61;
        this.choirOsc2.frequency.setTargetAtTime(harmony, now, 0.25);
      }
    }
  }

  private playCampfireCrackle(vol: number): void {
    if (!this.ctx || !this.sfxGain || !this.shortNoiseBuf) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.shortNoiseBuf;
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'highpass';
    filt.frequency.value = 1800 + Math.random() * 1400;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol * (0.6 + Math.random() * 0.7), now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);
    src.connect(filt).connect(g).connect(this.sfxGain);
    src.start(now, Math.random() * 0.06, 0.05);
  }

  private playPluck(freq: number, vol: number, dur: number, when: number): void {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, when);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(vol, when + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(g).connect(this.musicGain);
    osc.start(when);
    osc.stop(when + dur + 0.05);
  }

  private playDrum(freq: number, vol: number, dur: number, when: number): void {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 1.9, when);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.6, when + dur);
    g.gain.setValueAtTime(vol, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(g).connect(this.musicGain);
    osc.start(when);
    osc.stop(when + dur + 0.03);
  }

  // Zero-GC pooled noise burst (reuses pre-allocated AudioBuffer!)
  private playPooledNoise(dur: number, cutoff: number, vol: number, filterType: BiquadFilterType = 'bandpass'): void {
    if (!this.ctx || !this.sfxGain || this.ctx.state !== 'running') return;
    const buf = dur <= 0.18 ? this.shortNoiseBuf : this.longNoiseBuf;
    if (!buf) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = 0.92 + Math.random() * 0.18;
    const filt = this.ctx.createBiquadFilter();
    filt.type = filterType;
    filt.frequency.value = cutoff;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    src.connect(filt).connect(g).connect(this.sfxGain);
    src.start(now, 0, Math.min(dur, buf.duration));
  }

  playFootstep(surface: GroundSurface): void {
    if (!this.ctx || !this.sfxGain || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    // Heavy grounded boot thud (frequency depends on stone / wood / damp mire earth)
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = surface === 'wood' ? 'triangle' : 'sine';
    const baseFreq = surface === 'stone' ? 115 : surface === 'wood' ? 142 : 78;
    osc.frequency.setValueAtTime(baseFreq * (0.94 + Math.random() * 0.12), now);
    osc.frequency.exponentialRampToValueAtTime(34, now + 0.085);
    g.gain.setValueAtTime(surface === 'earth' ? 0.11 : 0.14, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
    osc.connect(g).connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.1);

    // Grit / leather creak texture
    const noiseFreq = surface === 'stone' ? 1250 : surface === 'wood' ? 780 : 480;
    this.playPooledNoise(0.075, noiseFreq, 0.09, 'bandpass');

    // Chainmail hauberk subtle metallic clink on every stride
    const mailOsc = this.ctx.createOscillator();
    const mailG = this.ctx.createGain();
    mailOsc.type = 'triangle';
    mailOsc.frequency.setValueAtTime(2200 + Math.random() * 600, now);
    mailG.gain.setValueAtTime(0.025, now);
    mailG.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
    mailOsc.connect(mailG).connect(this.sfxGain);
    mailOsc.start(now);
    mailOsc.stop(now + 0.05);
  }

  playTiredBreath(): void {
    if (!this.ctx || !this.sfxGain || this.ctx.state !== 'running') return;
    this.playPooledNoise(0.32, 420, 0.055, 'bandpass');
  }

  uiHover(): void {
    if (!this.ctx || !this.sfxGain || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(340, now + 0.045);
    g.gain.setValueAtTime(0.06, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
    osc.connect(g).connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  uiClick(): void {
    this.unlock();
    if (!this.ctx || !this.sfxGain || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(760, now);
    osc.frequency.exponentialRampToValueAtTime(210, now + 0.11);
    g.gain.setValueAtTime(0.18, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    osc.connect(g).connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  heroSalute(): void {
    this.unlock();
    if (!this.ctx || !this.sfxGain || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    for (const freq of [640, 1020, 1580]) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      g.gain.setValueAtTime(0.14, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
      osc.connect(g).connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.45);
    }
    this.playPooledNoise(0.14, 1800, 0.22);
  }

  swing(heavy = false): void {
    if (!this.ctx || !this.sfxGain || this.ctx.state !== 'running') return;
    const pitch = (heavy ? 520 : 920) * (0.92 + Math.random() * 0.16);
    this.playPooledNoise(heavy ? 0.22 : 0.14, pitch, heavy ? 0.3 : 0.22);
  }

  daggerThrow(): void {
    if (!this.ctx || !this.sfxGain || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1650, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.085);
    g.gain.setValueAtTime(0.14, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
    osc.connect(g).connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.1);
    this.playPooledNoise(0.11, 2100, 0.19, 'highpass');
  }

  hit(heavy = false): void {
    if (!this.ctx || !this.sfxGain || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    // Deep bassy "BAM" chest punch
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(heavy ? 132 : 170, now);
    osc.frequency.exponentialRampToValueAtTime(34, now + (heavy ? 0.24 : 0.14));
    g.gain.setValueAtTime(heavy ? 0.36 : 0.24, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + (heavy ? 0.25 : 0.15));
    osc.connect(g).connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.26);

    // Metallic armor sparks ring + crunch
    const ring = this.ctx.createOscillator();
    const rg = this.ctx.createGain();
    ring.type = 'triangle';
    ring.frequency.setValueAtTime(heavy ? 1240 : 1560, now);
    rg.gain.setValueAtTime(0.09, now);
    rg.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);
    ring.connect(rg).connect(this.sfxGain);
    ring.start(now);
    ring.stop(now + 0.12);

    this.playPooledNoise(0.1, 1180, heavy ? 0.28 : 0.18);
  }

  jumpAnticipate(): void {
    if (!this.ctx || !this.sfxGain || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    // Leather armor flex creak
    this.playPooledNoise(0.11, 380, 0.14, 'bandpass');
    // Chainmail hauberk rattle on knee crouch
    for (const [idx, freq] of [2350, 3120].entries()) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq + Math.random() * 240, now + idx * 0.025);
      g.gain.setValueAtTime(0.055, now + idx * 0.025);
      g.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.025 + 0.055);
      osc.connect(g).connect(this.sfxGain);
      osc.start(now + idx * 0.025);
      osc.stop(now + idx * 0.025 + 0.06);
    }
  }

  dash(): void {
    if (!this.ctx || !this.sfxGain || this.ctx.state !== 'running') return;
    // Crisp wind-cut rush (no cartoonish spring tone)
    this.playPooledNoise(0.28, 860, 0.28, 'bandpass');
    this.playPooledNoise(0.18, 1750, 0.12, 'highpass');
  }

  jumpLand(surface: GroundSurface): void {
    if (!this.ctx || !this.sfxGain || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;

    // 1. Heavy deep sub-bass "BOOM" impact
    const boomOsc = this.ctx.createOscillator();
    const boomG = this.ctx.createGain();
    boomOsc.type = 'sine';
    boomOsc.frequency.setValueAtTime(76, now);
    boomOsc.frequency.exponentialRampToValueAtTime(24, now + 0.22);
    boomG.gain.setValueAtTime(0.38, now);
    boomG.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
    boomOsc.connect(boomG).connect(this.sfxGain);
    boomOsc.start(now);
    boomOsc.stop(now + 0.25);

    // 2. Iron plate & chainmail armor clank
    for (const [idx, f] of [310, 1780, 2540].entries()) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f * (0.94 + Math.random() * 0.12), now + idx * 0.015);
      if (idx === 0) osc.frequency.exponentialRampToValueAtTime(120, now + 0.12);
      g.gain.setValueAtTime(idx === 0 ? 0.16 : 0.07, now + idx * 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.015 + 0.12);
      osc.connect(g).connect(this.sfxGain);
      osc.start(now + idx * 0.015);
      osc.stop(now + idx * 0.015 + 0.13);
    }

    // 3. Crumbling stone / scattering dust & soil grit
    const gritFreq = surface === 'stone' ? 1380 : surface === 'wood' ? 760 : 540;
    this.playPooledNoise(0.22, gritFreq, 0.25, 'bandpass');
  }

  navShift(toNav: boolean): void {
    if (!this.ctx || !this.sfxGain || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const base = toNav ? 110 : 146.8;
    for (const mult of [1, 1.498, 2.12]) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(base * mult, now);
      g.gain.setValueAtTime(0.22 / mult, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
      osc.connect(g).connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 1.25);
    }
  }

  sigilBlast(): void {
    this.hit(true);
    this.playPooledNoise(0.35, 920, 0.32);
  }

  potion(): void {
    if (!this.ctx || !this.sfxGain || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    for (const [idx, f] of [523.25, 659.25, 783.99].entries()) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + idx * 0.055);
      g.gain.setValueAtTime(0.14, now + idx * 0.055);
      g.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.055 + 0.25);
      osc.connect(g).connect(this.sfxGain);
      osc.start(now + idx * 0.055);
      osc.stop(now + idx * 0.055 + 0.28);
    }
  }

  outcome(victory: boolean): void {
    if (!this.ctx || !this.sfxGain || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const notes = victory ? [146.83, 220, 293.66, 369.99] : [146.83, 138.59, 110, 73.42];
    notes.forEach((f, i) => {
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now + i * 0.14);
      g.gain.setValueAtTime(0.18, now + i * 0.14);
      g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.14 + 0.9);
      osc.connect(g).connect(this.sfxGain!);
      osc.start(now + i * 0.14);
      osc.stop(now + i * 0.14 + 0.95);
    });
  }

  dispose(): void {
    if (this.schedulerTimer !== null) {
      window.clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
    try {
      this.windSrc?.stop();
      this.droneOsc1?.stop();
      this.droneOsc2?.stop();
      this.choirOsc1?.stop();
      this.choirOsc2?.stop();
      void this.ctx?.close();
    } catch {
      // Ignore close errors
    }
    this.ctx = null;
  }
}
