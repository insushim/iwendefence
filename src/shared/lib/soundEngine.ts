// ============================================================
// WordGuard - Procedural Sound Engine (Web Audio API)
// ============================================================

import type { WorldId } from '../types/game';

// ── Types ───────────────────────────────────────────────────

export type SFXType =
  | 'towerAttack_archer'
  | 'towerAttack_magic'
  | 'towerAttack_cannon'
  | 'towerAttack_ice'
  | 'towerAttack_lightning'
  | 'towerAttack_poison'
  | 'towerAttack_sniper'
  | 'towerAttack_flame'
  | 'towerAttack_word'
  | 'enemyDeath'
  | 'bossAppear'
  | 'quizCorrect'
  | 'quizWrong'
  | 'waveStart'
  | 'waveClear'
  | 'merge'
  | 'goldPickup'
  | 'baseDamage'
  | 'levelUp'
  | 'heroSkill';

// Musical note frequencies (A4 = 440Hz base)
const NOTE_FREQ: Record<string, number> = {
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00, B5: 987.77,
  C6: 1046.50,
  // Flats / sharps
  Eb3: 155.56, Bb3: 233.08, Eb4: 311.13, Ab4: 415.30, Bb4: 466.16,
  Eb5: 622.25, Ab5: 830.61, Bb5: 932.33,
  Fs4: 369.99, Cs4: 277.18, Fs5: 739.99,
  Db4: 277.18, Gb4: 369.99,
  Ab3: 207.65, Db5: 554.37, Gb5: 739.99,
};

// ── World BGM Configs ───────────────────────────────────────

interface BGMConfig {
  key: string;
  bpm: number;
  scale: string[];
  bassPattern: number[];
  melodyPattern: number[];
  waveform: OscillatorType;
  bassWaveform: OscillatorType;
}

const WORLD_BGM: Record<number, BGMConfig> = {
  1: {
    key: 'C major - Bright Forest',
    bpm: 120,
    scale: ['C4', 'E4', 'G4', 'C5', 'E5', 'G4', 'E4', 'D4'],
    bassPattern: [0, 0, 4, 4, 5, 5, 4, 3],
    melodyPattern: [0, 2, 4, 2, 3, 1, 2, 0],
    waveform: 'triangle',
    bassWaveform: 'sine',
  },
  2: {
    key: 'Eb major - Relaxed Beach',
    bpm: 95,
    scale: ['Eb4', 'G4', 'Bb4', 'Eb5', 'G4', 'Bb4', 'G4', 'Eb4'],
    bassPattern: [0, 0, 3, 3, 4, 4, 3, 1],
    melodyPattern: [0, 1, 3, 4, 3, 2, 1, 0],
    waveform: 'sine',
    bassWaveform: 'sine',
  },
  3: {
    key: 'A minor - Dark Cave',
    bpm: 100,
    scale: ['A3', 'C4', 'E4', 'A4', 'C5', 'E4', 'C4', 'B3'],
    bassPattern: [0, 0, 2, 2, 3, 3, 2, 0],
    melodyPattern: [4, 3, 2, 0, 1, 3, 2, 0],
    waveform: 'sawtooth',
    bassWaveform: 'triangle',
  },
  4: {
    key: 'D minor - Volcanic Fury',
    bpm: 135,
    scale: ['D4', 'F4', 'A4', 'D5', 'F4', 'A4', 'G4', 'E4'],
    bassPattern: [0, 0, 3, 3, 5, 5, 4, 2],
    melodyPattern: [0, 3, 5, 3, 4, 2, 1, 0],
    waveform: 'sawtooth',
    bassWaveform: 'square',
  },
  5: {
    key: 'G major - Ocean Voyage',
    bpm: 105,
    scale: ['G4', 'B4', 'D5', 'G5', 'B4', 'D5', 'A4', 'G4'],
    bassPattern: [0, 0, 4, 4, 5, 5, 3, 2],
    melodyPattern: [0, 2, 4, 3, 2, 1, 3, 0],
    waveform: 'triangle',
    bassWaveform: 'sine',
  },
  6: {
    key: 'F major - Sky Kingdom',
    bpm: 110,
    scale: ['F4', 'A4', 'C5', 'F5', 'A4', 'C5', 'Bb4', 'G4'],
    bassPattern: [0, 0, 3, 3, 5, 5, 4, 2],
    melodyPattern: [0, 3, 5, 4, 3, 1, 2, 0],
    waveform: 'sine',
    bassWaveform: 'triangle',
  },
  7: {
    key: 'B minor - Dark Dungeon',
    bpm: 90,
    scale: ['B3', 'D4', 'Fs4', 'B4', 'D4', 'Fs4', 'E4', 'Cs4'],
    bassPattern: [0, 0, 2, 2, 4, 4, 3, 1],
    melodyPattern: [4, 3, 1, 0, 2, 4, 3, 0],
    waveform: 'sawtooth',
    bassWaveform: 'triangle',
  },
  8: {
    key: 'Db major - Misty Swamp',
    bpm: 85,
    scale: ['Db4', 'F4', 'Ab4', 'Db5', 'F4', 'Ab4', 'Gb4', 'Eb4'],
    bassPattern: [0, 0, 3, 3, 5, 5, 4, 1],
    melodyPattern: [0, 1, 3, 5, 4, 2, 1, 0],
    waveform: 'triangle',
    bassWaveform: 'sine',
  },
  9: {
    key: 'E minor - Ancient Ruins',
    bpm: 100,
    scale: ['E4', 'G4', 'B4', 'E5', 'G4', 'B4', 'A4', 'Fs4'],
    bassPattern: [0, 0, 2, 2, 4, 4, 3, 1],
    melodyPattern: [0, 4, 3, 1, 2, 4, 3, 0],
    waveform: 'triangle',
    bassWaveform: 'sawtooth',
  },
  10: {
    key: 'C minor - The Void',
    bpm: 80,
    scale: ['C4', 'Eb4', 'G4', 'C5', 'Eb4', 'G4', 'F4', 'D4'],
    bassPattern: [0, 0, 3, 3, 5, 5, 4, 2],
    melodyPattern: [4, 3, 0, 1, 5, 4, 2, 0],
    waveform: 'sawtooth',
    bassWaveform: 'triangle',
  },
};

// ============================================================
// SoundEngine Class (Singleton)
// ============================================================

export class SoundEngine {
  private static instance: SoundEngine | null = null;

  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;

  private volume: number = 0.7;
  private sfxVolume: number = 0.8;
  private bgmPlaying: boolean = false;
  private bgmLoopTimer: number | null = null;
  private currentWorldId: number = 0;

  // Track active oscillators for cleanup
  private activeBGMNodes: (OscillatorNode | GainNode)[] = [];

  private constructor() {}

  static getInstance(): SoundEngine {
    if (!SoundEngine.instance) {
      SoundEngine.instance = new SoundEngine();
    }
    return SoundEngine.instance;
  }

  // ── Initialization ────────────────────────────────────────

  initAudio(): void {
    if (this.audioCtx) return;

    try {
      this.audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.audioCtx.destination);

      this.sfxGain = this.audioCtx.createGain();
      this.sfxGain.gain.value = this.sfxVolume;
      this.sfxGain.connect(this.masterGain);

      this.bgmGain = this.audioCtx.createGain();
      this.bgmGain.gain.value = 0.3; // BGM quieter than SFX
      this.bgmGain.connect(this.masterGain);
    } catch {
      // Web Audio API not available
    }
  }

  private ensureAudioReady(): boolean {
    this.initAudio();
    return Boolean(this.audioCtx && this.masterGain && this.sfxGain && this.bgmGain);
  }

  /**
   * Resume audio context (needed after user interaction on some browsers).
   */
  async resumeContext(): Promise<void> {
    this.initAudio();
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }
  }

  // ── Volume Control ────────────────────────────────────────

  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.masterGain) {
      this.masterGain.gain.value = this.volume;
    }
  }

  setSFXVolume(v: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, v));
    if (this.sfxGain) {
      this.sfxGain.gain.value = this.sfxVolume;
    }
  }

  getVolume(): number {
    return this.volume;
  }

  getSFXVolume(): number {
    return this.sfxVolume;
  }

  // ── BGM ───────────────────────────────────────────────────

  generateBGM(worldId: WorldId): void {
    this.stopBGM();
    if (!this.ensureAudioReady() || !this.audioCtx || !this.bgmGain) return;

    this.currentWorldId = worldId;
    this.bgmPlaying = true;
    this.playBGMLoop();
  }

  private playBGMLoop(): void {
    if (!this.bgmPlaying || !this.audioCtx || !this.bgmGain) return;

    const config = WORLD_BGM[this.currentWorldId] ?? WORLD_BGM[1];
    const beatDuration = 60 / config.bpm;
    const loopDuration = config.scale.length * beatDuration;

    const now = this.audioCtx.currentTime;

    // ── Melody ──────────────────────────────────────
    for (let i = 0; i < config.scale.length; i++) {
      const noteIndex = config.melodyPattern[i % config.melodyPattern.length];
      const noteName = config.scale[noteIndex % config.scale.length];
      const freq = NOTE_FREQ[noteName] ?? 440;

      const osc = this.audioCtx.createOscillator();
      const env = this.audioCtx.createGain();

      osc.type = config.waveform;
      osc.frequency.value = freq;

      // ADSR-like envelope
      const noteStart = now + i * beatDuration;
      const noteEnd = noteStart + beatDuration * 0.8;
      env.gain.setValueAtTime(0, noteStart);
      env.gain.linearRampToValueAtTime(0.15, noteStart + 0.03);
      env.gain.setValueAtTime(0.15, noteStart + beatDuration * 0.3);
      env.gain.linearRampToValueAtTime(0, noteEnd);

      osc.connect(env);
      env.connect(this.bgmGain);

      osc.start(noteStart);
      osc.stop(noteEnd + 0.05);

      this.activeBGMNodes.push(osc, env);
    }

    // ── Bass line ───────────────────────────────────
    const bassNotes = config.scale.map((n) => {
      const freq = NOTE_FREQ[n] ?? 261;
      return freq / 2; // one octave lower
    });

    for (let i = 0; i < config.bassPattern.length; i++) {
      const bassIndex = config.bassPattern[i] % bassNotes.length;
      const freq = bassNotes[bassIndex];

      const osc = this.audioCtx.createOscillator();
      const env = this.audioCtx.createGain();

      osc.type = config.bassWaveform;
      osc.frequency.value = freq;

      const noteStart = now + i * beatDuration;
      const noteEnd = noteStart + beatDuration * 0.9;
      env.gain.setValueAtTime(0, noteStart);
      env.gain.linearRampToValueAtTime(0.1, noteStart + 0.02);
      env.gain.setValueAtTime(0.1, noteStart + beatDuration * 0.5);
      env.gain.linearRampToValueAtTime(0, noteEnd);

      osc.connect(env);
      env.connect(this.bgmGain);

      osc.start(noteStart);
      osc.stop(noteEnd + 0.05);

      this.activeBGMNodes.push(osc, env);
    }

    // ── Light percussion (filtered noise-like) ──────
    for (let i = 0; i < config.scale.length; i++) {
      if (i % 2 === 0) {
        const osc = this.audioCtx.createOscillator();
        const env = this.audioCtx.createGain();
        const filter = this.audioCtx.createBiquadFilter();

        osc.type = 'square';
        osc.frequency.value = 80 + Math.random() * 40;
        filter.type = 'highpass';
        filter.frequency.value = 1000;

        const noteStart = now + i * beatDuration;
        env.gain.setValueAtTime(0, noteStart);
        env.gain.linearRampToValueAtTime(0.04, noteStart + 0.005);
        env.gain.linearRampToValueAtTime(0, noteStart + 0.08);

        osc.connect(filter);
        filter.connect(env);
        env.connect(this.bgmGain);

        osc.start(noteStart);
        osc.stop(noteStart + 0.1);

        this.activeBGMNodes.push(osc, env);
      }
    }

    // Schedule next loop
    this.bgmLoopTimer = window.setTimeout(() => {
      // Clean up old nodes
      this.activeBGMNodes = [];
      this.playBGMLoop();
    }, loopDuration * 1000);
  }

  stopBGM(): void {
    this.bgmPlaying = false;
    if (this.bgmLoopTimer !== null) {
      clearTimeout(this.bgmLoopTimer);
      this.bgmLoopTimer = null;
    }

    // Stop all active BGM oscillators
    for (const node of this.activeBGMNodes) {
      try {
        if (node instanceof OscillatorNode) {
          node.stop();
        }
        node.disconnect();
      } catch {
        // Already stopped
      }
    }
    this.activeBGMNodes = [];
  }

  // ── SFX ───────────────────────────────────────────────────

  playSFX(type: SFXType): void {
    if (!this.ensureAudioReady() || !this.audioCtx || !this.sfxGain) return;

    switch (type) {
      case 'towerAttack_archer':
        this.playWhoosh(800, 1200, 0.1);
        break;
      case 'towerAttack_magic':
        this.playSparkle([600, 900, 1200], 0.15);
        break;
      case 'towerAttack_cannon':
        this.playBoom(60, 0.2, 0.3);
        break;
      case 'towerAttack_ice':
        this.playCrack(2000, 3000, 0.12);
        break;
      case 'towerAttack_lightning':
        this.playZap(100, 2000, 0.15);
        break;
      case 'towerAttack_poison':
        this.playBubble([300, 400, 500], 0.1);
        break;
      case 'towerAttack_sniper':
        this.playSnap(3000, 0.15);
        break;
      case 'towerAttack_flame':
        this.playFlameSound(200, 600, 0.15);
        break;
      case 'towerAttack_word':
        this.playChime([523, 659, 784], 0.1);
        break;
      case 'enemyDeath':
        this.playDeathSound();
        break;
      case 'bossAppear':
        this.playBossAppear();
        break;
      case 'quizCorrect':
        this.playFanfare();
        break;
      case 'quizWrong':
        this.playBuzz();
        break;
      case 'waveStart':
        this.playWaveStart();
        break;
      case 'waveClear':
        this.playWaveClear();
        break;
      case 'merge':
        this.playMerge();
        break;
      case 'goldPickup':
        this.playCoinClink();
        break;
      case 'baseDamage':
        this.playBaseDamage();
        break;
      case 'levelUp':
        this.playLevelUp();
        break;
      case 'heroSkill':
        this.playHeroSkill();
        break;
    }
  }

  // ── SFX Primitives ────────────────────────────────────────

  private playTone(
    freq: number,
    duration: number,
    volume: number,
    waveform: OscillatorType = 'sine',
    startTime?: number
  ): OscillatorNode | null {
    if (!this.audioCtx || !this.sfxGain) return null;

    const osc = this.audioCtx.createOscillator();
    const env = this.audioCtx.createGain();

    osc.type = waveform;
    osc.frequency.value = freq;

    const now = startTime ?? this.audioCtx.currentTime;
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(volume, now + 0.01);
    env.gain.linearRampToValueAtTime(volume * 0.3, now + duration * 0.6);
    env.gain.linearRampToValueAtTime(0, now + duration);

    osc.connect(env);
    env.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + duration + 0.05);

    return osc;
  }

  private playNoise(duration: number, volume: number, filterFreq: number, filterType: BiquadFilterType = 'lowpass'): void {
    if (!this.audioCtx || !this.sfxGain) return;

    // Generate noise using an oscillator with rapid frequency modulation
    const osc = this.audioCtx.createOscillator();
    const env = this.audioCtx.createGain();
    const filter = this.audioCtx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.value = 100;

    // Rapid frequency changes to simulate noise
    const now = this.audioCtx.currentTime;
    for (let i = 0; i < 20; i++) {
      const t = now + (i * duration) / 20;
      osc.frequency.setValueAtTime(50 + Math.random() * 200, t);
    }

    filter.type = filterType;
    filter.frequency.value = filterFreq;

    env.gain.setValueAtTime(volume, now);
    env.gain.linearRampToValueAtTime(0, now + duration);

    osc.connect(filter);
    filter.connect(env);
    env.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + duration + 0.05);
  }

  // ── Specific SFX Generators ───────────────────────────────

  private playWhoosh(startFreq: number, endFreq: number, duration: number): void {
    if (!this.audioCtx || !this.sfxGain) return;

    const osc = this.audioCtx.createOscillator();
    const env = this.audioCtx.createGain();
    const filter = this.audioCtx.createBiquadFilter();

    osc.type = 'sawtooth';
    const now = this.audioCtx.currentTime;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

    filter.type = 'bandpass';
    filter.frequency.value = 1000;
    filter.Q.value = 0.5;

    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(0.06, now + 0.01);
    env.gain.linearRampToValueAtTime(0, now + duration);

    osc.connect(filter);
    filter.connect(env);
    env.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + duration + 0.05);
  }

  private playSparkle(freqs: number[], duration: number): void {
    for (let i = 0; i < freqs.length; i++) {
      const startTime = this.audioCtx ? this.audioCtx.currentTime + i * 0.04 : undefined;
      this.playTone(freqs[i], duration - i * 0.03, 0.06, 'sine', startTime);
    }
  }

  private playBoom(freq: number, duration: number, volume: number): void {
    if (!this.audioCtx || !this.sfxGain) return;

    const osc = this.audioCtx.createOscillator();
    const env = this.audioCtx.createGain();

    osc.type = 'sine';
    const now = this.audioCtx.currentTime;
    osc.frequency.setValueAtTime(freq * 2, now);
    osc.frequency.exponentialRampToValueAtTime(freq, now + duration * 0.3);

    env.gain.setValueAtTime(volume, now);
    env.gain.linearRampToValueAtTime(volume * 0.6, now + 0.05);
    env.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(env);
    env.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + duration + 0.05);

    // Add noise component
    this.playNoise(duration * 0.5, volume * 0.3, 500, 'lowpass');
  }

  private playCrack(startFreq: number, endFreq: number, duration: number): void {
    if (!this.audioCtx || !this.sfxGain) return;

    const osc = this.audioCtx.createOscillator();
    const env = this.audioCtx.createGain();
    const filter = this.audioCtx.createBiquadFilter();

    osc.type = 'square';
    const now = this.audioCtx.currentTime;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.linearRampToValueAtTime(endFreq, now + duration * 0.3);
    osc.frequency.linearRampToValueAtTime(startFreq * 0.5, now + duration);

    filter.type = 'highpass';
    filter.frequency.value = 1500;

    env.gain.setValueAtTime(0.08, now);
    env.gain.linearRampToValueAtTime(0, now + duration);

    osc.connect(filter);
    filter.connect(env);
    env.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + duration + 0.05);
  }

  private playZap(startFreq: number, endFreq: number, duration: number): void {
    if (!this.audioCtx || !this.sfxGain) return;

    const now = this.audioCtx.currentTime;

    // Multiple rapid oscillators for electrical feel
    for (let i = 0; i < 3; i++) {
      const osc = this.audioCtx.createOscillator();
      const env = this.audioCtx.createGain();

      osc.type = 'sawtooth';
      const offset = i * 0.015;
      osc.frequency.setValueAtTime(startFreq * (1 + i * 0.5), now + offset);
      osc.frequency.exponentialRampToValueAtTime(endFreq * (1 + i * 0.3), now + offset + duration * 0.2);
      osc.frequency.exponentialRampToValueAtTime(startFreq, now + offset + duration);

      env.gain.setValueAtTime(0, now + offset);
      env.gain.linearRampToValueAtTime(0.06, now + offset + 0.005);
      env.gain.linearRampToValueAtTime(0, now + offset + duration);

      osc.connect(env);
      env.connect(this.sfxGain);

      osc.start(now + offset);
      osc.stop(now + offset + duration + 0.05);
    }
  }

  private playBubble(freqs: number[], volume: number): void {
    if (!this.audioCtx) return;
    const now = this.audioCtx.currentTime;

    for (let i = 0; i < freqs.length; i++) {
      const osc = this.audioCtx.createOscillator();
      const env = this.audioCtx.createGain();

      osc.type = 'sine';
      const t = now + i * 0.06;
      osc.frequency.setValueAtTime(freqs[i], t);
      osc.frequency.linearRampToValueAtTime(freqs[i] * 1.5, t + 0.06);

      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(volume, t + 0.01);
      env.gain.linearRampToValueAtTime(0, t + 0.08);

      osc.connect(env);
      env.connect(this.sfxGain!);

      osc.start(t);
      osc.stop(t + 0.1);
    }
  }

  private playSnap(freq: number, duration: number): void {
    if (!this.audioCtx || !this.sfxGain) return;

    const osc = this.audioCtx.createOscillator();
    const env = this.audioCtx.createGain();
    const filter = this.audioCtx.createBiquadFilter();

    osc.type = 'square';
    const now = this.audioCtx.currentTime;
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.3, now + duration);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(5000, now);
    filter.frequency.exponentialRampToValueAtTime(500, now + duration);

    env.gain.setValueAtTime(0.1, now);
    env.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(filter);
    filter.connect(env);
    env.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + duration + 0.05);
  }

  private playFlameSound(startFreq: number, endFreq: number, duration: number): void {
    if (!this.audioCtx || !this.sfxGain) return;

    const now = this.audioCtx.currentTime;

    // Whoosh base
    const osc = this.audioCtx.createOscillator();
    const env = this.audioCtx.createGain();
    const filter = this.audioCtx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.linearRampToValueAtTime(endFreq, now + duration * 0.3);
    osc.frequency.linearRampToValueAtTime(startFreq * 1.5, now + duration);

    filter.type = 'bandpass';
    filter.frequency.value = 400;
    filter.Q.value = 1;

    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(0.08, now + 0.02);
    env.gain.linearRampToValueAtTime(0, now + duration);

    osc.connect(filter);
    filter.connect(env);
    env.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + duration + 0.05);

    // Crackle layer
    this.playNoise(duration * 0.6, 0.03, 3000, 'highpass');
  }

  private playChime(freqs: number[], volume: number): void {
    if (!this.audioCtx) return;
    const now = this.audioCtx.currentTime;

    for (let i = 0; i < freqs.length; i++) {
      const t = now + i * 0.05;
      this.playTone(freqs[i], 0.2, volume, 'sine', t);
    }
  }

  private playDeathSound(): void {
    if (!this.audioCtx || !this.sfxGain) return;
    const now = this.audioCtx.currentTime;

    // Descending tone
    const osc = this.audioCtx.createOscillator();
    const env = this.audioCtx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.3);

    env.gain.setValueAtTime(0.1, now);
    env.gain.linearRampToValueAtTime(0, now + 0.3);

    osc.connect(env);
    env.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.35);

    // Pop
    this.playTone(200, 0.05, 0.08, 'square', now);
  }

  private playBossAppear(): void {
    if (!this.audioCtx) return;
    const now = this.audioCtx.currentTime;

    // Dramatic low rumble
    this.playTone(60, 1.0, 0.12, 'sawtooth', now);
    this.playTone(80, 0.8, 0.08, 'square', now + 0.1);

    // Ominous chord
    this.playTone(110, 0.6, 0.06, 'triangle', now + 0.3);
    this.playTone(131, 0.6, 0.06, 'triangle', now + 0.35);
    this.playTone(165, 0.6, 0.06, 'triangle', now + 0.4);

    // Impact
    this.playBoom(40, 0.5, 0.15);
  }

  private playFanfare(): void {
    if (!this.audioCtx) return;
    const now = this.audioCtx.currentTime;

    // Bright ascending notes (C-E-G-C)
    const notes = [523, 659, 784, 1047];
    for (let i = 0; i < notes.length; i++) {
      this.playTone(notes[i], 0.2, 0.1, 'triangle', now + i * 0.1);
    }

    // Final chord
    this.playTone(523, 0.4, 0.06, 'sine', now + 0.4);
    this.playTone(659, 0.4, 0.06, 'sine', now + 0.4);
    this.playTone(784, 0.4, 0.06, 'sine', now + 0.4);
    this.playTone(1047, 0.4, 0.08, 'sine', now + 0.4);
  }

  private playBuzz(): void {
    if (!this.audioCtx || !this.sfxGain) return;
    const now = this.audioCtx.currentTime;

    // Gentle low buzz
    const osc = this.audioCtx.createOscillator();
    const env = this.audioCtx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.linearRampToValueAtTime(100, now + 0.3);

    env.gain.setValueAtTime(0.08, now);
    env.gain.linearRampToValueAtTime(0.04, now + 0.15);
    env.gain.linearRampToValueAtTime(0, now + 0.3);

    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;

    osc.connect(filter);
    filter.connect(env);
    env.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.35);

    // Second lower tone
    this.playTone(90, 0.3, 0.06, 'square', now + 0.05);
  }

  private playWaveStart(): void {
    if (!this.audioCtx) return;
    const now = this.audioCtx.currentTime;

    // War horn
    this.playTone(196, 0.5, 0.08, 'sawtooth', now);
    this.playTone(262, 0.4, 0.06, 'triangle', now + 0.15);
    this.playTone(330, 0.3, 0.06, 'triangle', now + 0.3);

    // Drum hit
    this.playBoom(80, 0.2, 0.1);
  }

  private playWaveClear(): void {
    if (!this.audioCtx) return;
    const now = this.audioCtx.currentTime;

    // Victory flourish
    const notes = [392, 494, 587, 784]; // G-B-D-G
    for (let i = 0; i < notes.length; i++) {
      this.playTone(notes[i], 0.3, 0.08, 'triangle', now + i * 0.12);
    }

    // Shimmer
    this.playTone(1047, 0.5, 0.04, 'sine', now + 0.5);
    this.playTone(1175, 0.5, 0.04, 'sine', now + 0.55);
  }

  private playMerge(): void {
    if (!this.audioCtx) return;
    const now = this.audioCtx.currentTime;

    // Magical synthesis — ascending arpeggio
    const notes = [330, 440, 554, 659, 880];
    for (let i = 0; i < notes.length; i++) {
      this.playTone(notes[i], 0.15, 0.07, 'sine', now + i * 0.06);
    }

    // Sparkle
    this.playTone(1200, 0.3, 0.05, 'sine', now + 0.35);
    this.playTone(1400, 0.25, 0.04, 'sine', now + 0.4);
    this.playTone(1600, 0.2, 0.03, 'sine', now + 0.45);
  }

  private playCoinClink(): void {
    if (!this.audioCtx) return;
    const now = this.audioCtx.currentTime;

    // Metallic clink
    this.playTone(2000, 0.06, 0.08, 'square', now);
    this.playTone(2500, 0.05, 0.06, 'square', now + 0.03);
    this.playTone(3000, 0.08, 0.04, 'sine', now + 0.05);
  }

  private playBaseDamage(): void {
    if (!this.audioCtx || !this.sfxGain) return;
    const now = this.audioCtx.currentTime;

    // Warning alarm
    const osc = this.audioCtx.createOscillator();
    const env = this.audioCtx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.setValueAtTime(330, now + 0.1);
    osc.frequency.setValueAtTime(440, now + 0.2);

    env.gain.setValueAtTime(0.1, now);
    env.gain.setValueAtTime(0.06, now + 0.1);
    env.gain.setValueAtTime(0.1, now + 0.2);
    env.gain.linearRampToValueAtTime(0, now + 0.35);

    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;

    osc.connect(filter);
    filter.connect(env);
    env.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.4);
  }

  private playLevelUp(): void {
    if (!this.audioCtx) return;
    const now = this.audioCtx.currentTime;

    // Ascending sparkly arpeggio
    const notes = [262, 330, 392, 523, 659, 784, 1047];
    for (let i = 0; i < notes.length; i++) {
      this.playTone(notes[i], 0.15, 0.06, 'sine', now + i * 0.07);
    }

    // Chord sustain
    this.playTone(523, 0.5, 0.05, 'triangle', now + 0.5);
    this.playTone(659, 0.5, 0.05, 'triangle', now + 0.5);
    this.playTone(784, 0.5, 0.05, 'triangle', now + 0.5);
  }

  private playHeroSkill(): void {
    if (!this.audioCtx) return;
    const now = this.audioCtx.currentTime;

    // Power-up whoosh
    this.playWhoosh(200, 2000, 0.3);

    // Impact chord
    this.playTone(220, 0.4, 0.08, 'sawtooth', now + 0.15);
    this.playTone(330, 0.4, 0.08, 'sawtooth', now + 0.15);
    this.playTone(440, 0.4, 0.08, 'triangle', now + 0.15);

    // Shimmer tail
    this.playTone(880, 0.3, 0.04, 'sine', now + 0.4);
    this.playTone(1100, 0.25, 0.03, 'sine', now + 0.45);
  }

  // ── Cleanup ───────────────────────────────────────────────

  dispose(): void {
    this.stopBGM();
    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
    }
    this.masterGain = null;
    this.sfxGain = null;
    this.bgmGain = null;
    SoundEngine.instance = null;
  }
}
