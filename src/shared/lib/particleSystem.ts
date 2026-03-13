// ============================================================
// WordGuard - Premium Particle System (Canvas 2D)
// Object-pooled, LOD-aware, fully typed particle engine
// ============================================================

// ── Types & Interfaces ─────────────────────────────────────

export type ParticleType =
  | 'fire' | 'ice' | 'lightning' | 'poison' | 'magic' | 'holy'
  | 'explosion' | 'sparkle' | 'smoke' | 'blood' | 'coins'
  | 'heal' | 'levelup' | 'combo' | 'death' | 'ambient';

export type EmitterShape = 'point' | 'circle' | 'cone' | 'line' | 'burst';

export type BlendMode = 'source-over' | 'lighter' | 'screen' | 'multiply';

export interface ColorStop {
  /** 0..1 lifetime ratio */
  time: number;
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface Vec2 {
  x: number;
  y: number;
}

export interface SizeOverLife {
  /** 0..1 lifetime ratio */
  time: number;
  size: number;
}

export interface PhysicsConfig {
  gravityX: number;
  gravityY: number;
  windX: number;
  windY: number;
  drag: number;
  turbulenceStrength: number;
  turbulenceFrequency: number;
}

export interface EmitterConfig {
  type: ParticleType;
  shape: EmitterShape;

  // Shape parameters
  position: Vec2;
  /** radius for circle, spread angle (radians) for cone, length for line */
  shapeParam1: number;
  /** direction angle (radians) for cone, angle for line */
  shapeParam2: number;

  // Spawn
  count: number;
  /** particles per second (0 = burst all at once) */
  rate: number;
  /** total emitter lifetime in seconds (0 = one-shot burst) */
  duration: number;

  // Per-particle ranges [min, max]
  lifetime: [number, number];
  speed: [number, number];
  direction: [number, number];
  size: [number, number];
  rotation: [number, number];
  rotationSpeed: [number, number];

  // Visual
  colorStops: ColorStop[];
  sizeOverLife: SizeOverLife[];
  opacityStart: number;
  opacityEnd: number;
  blendMode: BlendMode;
  glow: number;
  trailLength: number;

  // Physics
  physics: PhysicsConfig;

  // Text (for combo numbers, damage, etc.)
  text?: string;
  fontSize?: number;
  fontFamily?: string;
}

// ── Particle (Pooled Object) ───────────────────────────────

class Particle {
  active = false;

  // Core
  type: ParticleType = 'ambient';
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  life = 0;
  maxLife = 1;

  // Visual
  size = 4;
  baseSize = 4;
  rotation = 0;
  rotationSpeed = 0;
  opacity = 1;
  opacityStart = 1;
  opacityEnd = 0;
  r = 255;
  g = 255;
  b = 255;
  a = 1;
  glow = 0;
  blendMode: BlendMode = 'source-over';

  // Color gradient
  colorStops: ColorStop[] = [];
  sizeOverLife: SizeOverLife[] = [];

  // Trail
  trailLength = 0;
  trailPositions: Vec2[] = [];

  // Physics
  drag = 0;
  gravityX = 0;
  gravityY = 0;
  windX = 0;
  windY = 0;
  turbStr = 0;
  turbFreq = 0;

  // Text
  text: string | undefined = undefined;
  fontSize = 16;
  fontFamily = 'Arial';

  // Noise seed (per particle for turbulence variation)
  noiseSeed = 0;

  reset(): void {
    this.active = false;
    this.trailPositions.length = 0;
    this.text = undefined;
    this.colorStops = [];
    this.sizeOverLife = [];
  }

  init(config: EmitterConfig, px: number, py: number, vx: number, vy: number): void {
    this.active = true;
    this.type = config.type;
    this.x = px;
    this.y = py;
    this.vx = vx;
    this.vy = vy;

    const lt = randRange(config.lifetime[0], config.lifetime[1]);
    this.life = lt;
    this.maxLife = lt;

    this.baseSize = randRange(config.size[0], config.size[1]);
    this.size = this.baseSize;
    this.rotation = randRange(config.rotation[0], config.rotation[1]);
    this.rotationSpeed = randRange(config.rotationSpeed[0], config.rotationSpeed[1]);

    this.opacityStart = config.opacityStart;
    this.opacityEnd = config.opacityEnd;
    this.opacity = config.opacityStart;
    this.blendMode = config.blendMode;
    this.glow = config.glow;
    this.trailLength = config.trailLength;

    this.colorStops = config.colorStops;
    this.sizeOverLife = config.sizeOverLife;

    // Evaluate initial color
    if (config.colorStops.length > 0) {
      const c = config.colorStops[0];
      this.r = c.r;
      this.g = c.g;
      this.b = c.b;
      this.a = c.a;
    }

    // Physics
    this.drag = config.physics.drag;
    this.gravityX = config.physics.gravityX;
    this.gravityY = config.physics.gravityY;
    this.windX = config.physics.windX;
    this.windY = config.physics.windY;
    this.turbStr = config.physics.turbulenceStrength;
    this.turbFreq = config.physics.turbulenceFrequency;

    this.noiseSeed = Math.random() * 1000;

    // Text
    this.text = config.text;
    this.fontSize = config.fontSize ?? 16;
    this.fontFamily = config.fontFamily ?? 'Arial';

    this.trailPositions.length = 0;
  }

  update(dt: number, time: number): void {
    if (!this.active) return;

    this.life -= dt;
    if (this.life <= 0) {
      this.active = false;
      return;
    }

    // Trail
    if (this.trailLength > 0) {
      this.trailPositions.unshift({ x: this.x, y: this.y });
      if (this.trailPositions.length > this.trailLength) {
        this.trailPositions.length = this.trailLength;
      }
    }

    // Physics
    this.vx += (this.gravityX + this.windX) * dt;
    this.vy += (this.gravityY + this.windY) * dt;

    // Turbulence (simple sinusoidal noise)
    if (this.turbStr > 0) {
      const t = time * this.turbFreq + this.noiseSeed;
      this.vx += Math.sin(t * 2.7 + this.y * 0.01) * this.turbStr * dt;
      this.vy += Math.cos(t * 3.1 + this.x * 0.01) * this.turbStr * dt;
    }

    // Drag
    if (this.drag > 0) {
      const factor = 1 - this.drag * dt;
      this.vx *= Math.max(0, factor);
      this.vy *= Math.max(0, factor);
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rotation += this.rotationSpeed * dt;

    // Lifetime ratio (0 = just born, 1 = about to die)
    const t = 1 - this.life / this.maxLife;

    // Opacity interpolation
    this.opacity = lerp(this.opacityStart, this.opacityEnd, t);

    // Color over lifetime
    if (this.colorStops.length >= 2) {
      const { r, g, b, a } = evalColorStops(this.colorStops, t);
      this.r = r;
      this.g = g;
      this.b = b;
      this.a = a;
    }

    // Size over lifetime
    if (this.sizeOverLife.length >= 2) {
      this.size = this.baseSize * evalSizeOverLife(this.sizeOverLife, t);
    }
  }
}

// ── Particle Emitter ───────────────────────────────────────

class ParticleEmitter {
  config: EmitterConfig;
  elapsed = 0;
  spawnAccumulator = 0;
  totalSpawned = 0;
  active = true;

  constructor(config: EmitterConfig) {
    this.config = config;
  }

  update(dt: number, system: ParticleSystem): void {
    if (!this.active) return;

    this.elapsed += dt;

    if (this.config.rate <= 0) {
      // Burst mode: emit all at once
      const count = this.config.count - this.totalSpawned;
      for (let i = 0; i < count; i++) {
        this.spawnOne(system);
      }
      this.active = false;
      return;
    }

    // Continuous emission
    if (this.config.duration > 0 && this.elapsed >= this.config.duration) {
      this.active = false;
      return;
    }

    this.spawnAccumulator += dt * this.config.rate;
    while (this.spawnAccumulator >= 1 && this.totalSpawned < this.config.count) {
      this.spawnOne(system);
      this.spawnAccumulator -= 1;
    }

    if (this.config.count > 0 && this.totalSpawned >= this.config.count) {
      this.active = false;
    }
  }

  private spawnOne(system: ParticleSystem): void {
    const p = system.acquire();
    if (!p) return;

    const cfg = this.config;
    let px = cfg.position.x;
    let py = cfg.position.y;
    let dir = randRange(cfg.direction[0], cfg.direction[1]);
    const spd = randRange(cfg.speed[0], cfg.speed[1]);

    switch (cfg.shape) {
      case 'point':
        break;

      case 'circle': {
        const angle = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * cfg.shapeParam1;
        px += Math.cos(angle) * r;
        py += Math.sin(angle) * r;
        break;
      }

      case 'cone': {
        const halfSpread = cfg.shapeParam1 / 2;
        dir = cfg.shapeParam2 + randRange(-halfSpread, halfSpread);
        break;
      }

      case 'line': {
        const frac = Math.random();
        const lineAngle = cfg.shapeParam2;
        const halfLen = cfg.shapeParam1 / 2;
        px += Math.cos(lineAngle) * (frac - 0.5) * 2 * halfLen;
        py += Math.sin(lineAngle) * (frac - 0.5) * 2 * halfLen;
        break;
      }

      case 'burst': {
        dir = (this.totalSpawned / Math.max(1, cfg.count)) * Math.PI * 2;
        break;
      }
    }

    const vx = Math.cos(dir) * spd;
    const vy = Math.sin(dir) * spd;

    p.init(cfg, px, py, vx, vy);
    this.totalSpawned++;
  }
}

// ── LOD Level ──────────────────────────────────────────────

enum LODLevel {
  Full = 0,
  Reduced = 1,
  Minimal = 2,
}

// ── Particle System (Main Manager) ─────────────────────────

const MAX_PARTICLES = 2000;
const LOD_THRESHOLD_REDUCED = 1200;
const LOD_THRESHOLD_MINIMAL = 1600;

export class ParticleSystem {
  private pool: Particle[] = [];
  private activeParticles: Particle[] = [];
  private emitters: ParticleEmitter[] = [];
  private time = 0;
  private lod: LODLevel = LODLevel.Full;

  constructor() {
    // Pre-allocate pool
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.pool.push(new Particle());
    }
  }

  /** Get a particle from the pool. Returns null if pool exhausted. */
  acquire(): Particle | null {
    // LOD-based rejection
    const activeCount = this.activeParticles.length;
    if (activeCount >= MAX_PARTICLES) return null;

    if (this.lod === LODLevel.Reduced && Math.random() < 0.3) return null;
    if (this.lod === LODLevel.Minimal && Math.random() < 0.6) return null;

    const p = this.pool.pop();
    if (!p) return null;

    this.activeParticles.push(p);
    return p;
  }

  /** Return a particle to the pool. */
  private release(p: Particle): void {
    p.reset();
    this.pool.push(p);
  }

  /** Create a new emitter from configuration. Returns the emitter for chaining. */
  emit(config: EmitterConfig): ParticleEmitter {
    const emitter = new ParticleEmitter(config);
    this.emitters.push(emitter);
    return emitter;
  }

  /** Main update tick. Call once per frame. */
  update(dt: number): void {
    this.time += dt;

    // Update LOD
    const count = this.activeParticles.length;
    if (count > LOD_THRESHOLD_MINIMAL) {
      this.lod = LODLevel.Minimal;
    } else if (count > LOD_THRESHOLD_REDUCED) {
      this.lod = LODLevel.Reduced;
    } else {
      this.lod = LODLevel.Full;
    }

    // Update emitters
    for (let i = this.emitters.length - 1; i >= 0; i--) {
      this.emitters[i].update(dt, this);
      if (!this.emitters[i].active) {
        this.emitters.splice(i, 1);
      }
    }

    // Update particles
    for (let i = this.activeParticles.length - 1; i >= 0; i--) {
      const p = this.activeParticles[i];
      p.update(dt, this.time);
      if (!p.active) {
        this.activeParticles.splice(i, 1);
        this.release(p);
      }
    }
  }

  /** Render all active particles to the given Canvas 2D context. */
  render(ctx: CanvasRenderingContext2D): void {
    if (this.activeParticles.length === 0) return;

    ctx.save();

    // Sort by type for batch-friendly rendering (lighter blend particles last)
    // Skip sorting in minimal LOD for performance
    if (this.lod !== LODLevel.Minimal) {
      this.activeParticles.sort((a, b) => {
        if (a.blendMode !== b.blendMode) {
          return a.blendMode === 'source-over' ? -1 : 1;
        }
        return 0;
      });
    }

    let currentBlend: GlobalCompositeOperation = 'source-over';
    ctx.globalCompositeOperation = currentBlend;

    for (let i = 0; i < this.activeParticles.length; i++) {
      const p = this.activeParticles[i];

      // Switch blend mode if needed
      if (p.blendMode !== currentBlend) {
        currentBlend = p.blendMode;
        ctx.globalCompositeOperation = currentBlend;
      }

      const alpha = p.opacity * p.a;
      if (alpha <= 0.01) continue;

      // Skip very small particles
      if (p.size < 0.5) continue;

      ctx.globalAlpha = alpha;

      // -- Trails --
      if (p.trailLength > 0 && p.trailPositions.length > 1 && this.lod !== LODLevel.Minimal) {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        for (let t = 0; t < p.trailPositions.length; t++) {
          const tp = p.trailPositions[t];
          ctx.lineTo(tp.x, tp.y);
        }
        const trailAlpha = alpha * 0.5;
        ctx.strokeStyle = `rgba(${p.r},${p.g},${p.b},${trailAlpha})`;
        ctx.lineWidth = Math.max(1, p.size * 0.5);
        ctx.stroke();
      }

      // -- Text particles --
      if (p.text) {
        ctx.save();
        ctx.translate(p.x, p.y);
        if (p.rotation !== 0) ctx.rotate(p.rotation);

        ctx.font = `bold ${Math.round(p.fontSize * (p.size / p.baseSize))}px ${p.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Outline
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.lineWidth = 3;
        ctx.strokeText(p.text, 0, 0);

        ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${alpha})`;
        ctx.fillText(p.text, 0, 0);
        ctx.restore();
        continue;
      }

      // -- Glow effect --
      if (p.glow > 0 && this.lod === LODLevel.Full) {
        ctx.save();
        ctx.globalAlpha = alpha * 0.3;
        ctx.beginPath();
        const glowR = p.size * (1 + p.glow);
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowR);
        gradient.addColorStop(0, `rgba(${p.r},${p.g},${p.b},0.4)`);
        gradient.addColorStop(1, `rgba(${p.r},${p.g},${p.b},0)`);
        ctx.fillStyle = gradient;
        ctx.arc(p.x, p.y, glowR, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.globalAlpha = alpha;
      }

      // -- Standard circle particle --
      ctx.save();
      ctx.translate(p.x, p.y);
      if (p.rotation !== 0) ctx.rotate(p.rotation);

      switch (p.type) {
        case 'fire':
          this.renderFire(ctx, p);
          break;
        case 'ice':
          this.renderIce(ctx, p);
          break;
        case 'lightning':
          this.renderLightning(ctx, p);
          break;
        case 'sparkle':
          this.renderSparkle(ctx, p);
          break;
        case 'smoke':
          this.renderSmoke(ctx, p);
          break;
        case 'coins':
          this.renderCoin(ctx, p);
          break;
        default:
          this.renderDefault(ctx, p);
          break;
      }

      ctx.restore();
    }

    ctx.restore();
  }

  // ── Per-type renderers ──────────────────────────────────

  private renderFire(ctx: CanvasRenderingContext2D, p: Particle): void {
    const s = p.size;
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, s);
    grad.addColorStop(0, `rgba(${p.r},${p.g},${p.b},1)`);
    grad.addColorStop(0.6, `rgba(${p.r},${Math.max(0, p.g - 50)},0,0.6)`);
    grad.addColorStop(1, `rgba(${p.r},0,0,0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, s, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderIce(ctx: CanvasRenderingContext2D, p: Particle): void {
    const s = p.size;
    // Diamond shape
    ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${p.opacity * p.a})`;
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(s * 0.6, 0);
    ctx.moveTo(0, s);
    ctx.lineTo(-s * 0.6, 0);
    ctx.closePath();
    ctx.fill();
    // Inner glow
    ctx.fillStyle = `rgba(255,255,255,${p.opacity * 0.4})`;
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderLightning(ctx: CanvasRenderingContext2D, p: Particle): void {
    const s = p.size;
    ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${p.opacity * p.a})`;
    ctx.beginPath();
    ctx.arc(0, 0, s, 0, Math.PI * 2);
    ctx.fill();
    // Core bright spot
    ctx.fillStyle = `rgba(255,255,255,${p.opacity * 0.8})`;
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderSparkle(ctx: CanvasRenderingContext2D, p: Particle): void {
    const s = p.size;
    ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${p.opacity * p.a})`;
    // 4-point star
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const r = i % 2 === 0 ? s : s * 0.3;
      ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
    }
    ctx.closePath();
    ctx.fill();
  }

  private renderSmoke(ctx: CanvasRenderingContext2D, p: Particle): void {
    const s = p.size;
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, s);
    grad.addColorStop(0, `rgba(${p.r},${p.g},${p.b},${p.opacity * 0.4})`);
    grad.addColorStop(1, `rgba(${p.r},${p.g},${p.b},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, s, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderCoin(ctx: CanvasRenderingContext2D, p: Particle): void {
    const s = p.size;
    // Elliptical coin with wobble
    const wobble = Math.abs(Math.sin(p.rotation * 2));
    ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${p.opacity * p.a})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, s * Math.max(0.3, wobble), s, 0, 0, Math.PI * 2);
    ctx.fill();
    // Shine
    ctx.fillStyle = `rgba(255,255,240,${p.opacity * 0.5 * wobble})`;
    ctx.beginPath();
    ctx.ellipse(0, -s * 0.2, s * 0.2 * wobble, s * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderDefault(ctx: CanvasRenderingContext2D, p: Particle): void {
    const s = p.size;
    ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${p.opacity * p.a})`;
    ctx.beginPath();
    ctx.arc(0, 0, s, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Utility ──────────────────────────────────────────────

  get activeCount(): number {
    return this.activeParticles.length;
  }

  get poolSize(): number {
    return this.pool.length;
  }

  get currentLOD(): string {
    return LODLevel[this.lod];
  }

  /** Remove all particles and emitters. */
  clear(): void {
    for (let i = this.activeParticles.length - 1; i >= 0; i--) {
      const p = this.activeParticles[i];
      p.reset();
      this.pool.push(p);
    }
    this.activeParticles.length = 0;
    this.emitters.length = 0;
  }
}

// ── Screen Effects ─────────────────────────────────────────

export interface ShakeConfig {
  intensity: number;
  duration: number;
  decay: number;
}

export interface FlashConfig {
  color: string;
  opacity: number;
  duration: number;
}

export class ScreenEffects {
  // Shake
  private shakeIntensity = 0;
  private shakeDuration = 0;
  private shakeElapsed = 0;
  private shakeDecay = 1;
  shakeOffsetX = 0;
  shakeOffsetY = 0;

  // Slow motion
  private slowMoScale = 1;
  private slowMoDuration = 0;
  private slowMoElapsed = 0;
  timeScale = 1;

  // Flash overlay
  private flashColor = '';
  private flashOpacity = 0;
  private flashDuration = 0;
  private flashElapsed = 0;

  // Vignette pulse
  private vignetteIntensity = 0;
  private vignetteDuration = 0;
  private vignetteElapsed = 0;

  /** Trigger screen shake. */
  shake(config: ShakeConfig): void {
    this.shakeIntensity = config.intensity;
    this.shakeDuration = config.duration;
    this.shakeElapsed = 0;
    this.shakeDecay = config.decay;
  }

  /** Trigger slow motion. */
  slowMotion(scale: number, duration: number): void {
    this.slowMoScale = scale;
    this.slowMoDuration = duration;
    this.slowMoElapsed = 0;
  }

  /** Trigger color flash overlay. */
  flash(config: FlashConfig): void {
    this.flashColor = config.color;
    this.flashOpacity = config.opacity;
    this.flashDuration = config.duration;
    this.flashElapsed = 0;
  }

  /** Trigger vignette pulse. */
  vignettePulse(intensity: number, duration: number): void {
    this.vignetteIntensity = intensity;
    this.vignetteDuration = duration;
    this.vignetteElapsed = 0;
  }

  /** Update all screen effects. Call once per frame with real (unscaled) dt. */
  update(dt: number): void {
    // Shake
    if (this.shakeElapsed < this.shakeDuration) {
      this.shakeElapsed += dt;
      const progress = this.shakeElapsed / this.shakeDuration;
      const decayFactor = Math.pow(1 - progress, this.shakeDecay);
      const intensity = this.shakeIntensity * decayFactor;
      this.shakeOffsetX = (Math.random() * 2 - 1) * intensity;
      this.shakeOffsetY = (Math.random() * 2 - 1) * intensity;
    } else {
      this.shakeOffsetX = 0;
      this.shakeOffsetY = 0;
    }

    // Slow motion
    if (this.slowMoElapsed < this.slowMoDuration) {
      this.slowMoElapsed += dt;
      const progress = this.slowMoElapsed / this.slowMoDuration;
      // Ease back to normal speed
      this.timeScale = lerp(this.slowMoScale, 1, easeOutCubic(progress));
    } else {
      this.timeScale = 1;
    }

    // Flash
    if (this.flashElapsed < this.flashDuration) {
      this.flashElapsed += dt;
    }

    // Vignette
    if (this.vignetteElapsed < this.vignetteDuration) {
      this.vignetteElapsed += dt;
    }
  }

  /** Render screen effects overlay. Call after all game rendering. */
  render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    // Flash overlay
    if (this.flashElapsed < this.flashDuration) {
      const progress = this.flashElapsed / this.flashDuration;
      const alpha = this.flashOpacity * (1 - easeOutCubic(progress));
      if (alpha > 0.01) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.flashColor;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }
    }

    // Vignette pulse
    if (this.vignetteElapsed < this.vignetteDuration) {
      const progress = this.vignetteElapsed / this.vignetteDuration;
      const intensity = this.vignetteIntensity * (1 - easeOutCubic(progress));
      if (intensity > 0.01) {
        ctx.save();
        const cx = width / 2;
        const cy = height / 2;
        const maxR = Math.sqrt(cx * cx + cy * cy);
        const gradient = ctx.createRadialGradient(cx, cy, maxR * (1 - intensity * 0.5), cx, cy, maxR);
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, `rgba(0,0,0,${intensity * 0.7})`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }
    }
  }

  /** Returns true if any effect is active (useful for optimization). */
  get isActive(): boolean {
    return (
      this.shakeElapsed < this.shakeDuration ||
      this.slowMoElapsed < this.slowMoDuration ||
      this.flashElapsed < this.flashDuration ||
      this.vignetteElapsed < this.vignetteDuration
    );
  }
}

// ── Utility Functions ──────────────────────────────────────

function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function evalColorStops(stops: ColorStop[], t: number): { r: number; g: number; b: number; a: number } {
  const ct = clamp01(t);
  if (stops.length === 0) return { r: 255, g: 255, b: 255, a: 1 };
  if (stops.length === 1 || ct <= stops[0].time) return stops[0];
  if (ct >= stops[stops.length - 1].time) return stops[stops.length - 1];

  for (let i = 0; i < stops.length - 1; i++) {
    if (ct >= stops[i].time && ct <= stops[i + 1].time) {
      const localT = (ct - stops[i].time) / (stops[i + 1].time - stops[i].time);
      return {
        r: Math.round(lerp(stops[i].r, stops[i + 1].r, localT)),
        g: Math.round(lerp(stops[i].g, stops[i + 1].g, localT)),
        b: Math.round(lerp(stops[i].b, stops[i + 1].b, localT)),
        a: lerp(stops[i].a, stops[i + 1].a, localT),
      };
    }
  }
  return stops[stops.length - 1];
}

function evalSizeOverLife(keys: SizeOverLife[], t: number): number {
  const ct = clamp01(t);
  if (keys.length === 0) return 1;
  if (keys.length === 1 || ct <= keys[0].time) return keys[0].size;
  if (ct >= keys[keys.length - 1].time) return keys[keys.length - 1].size;

  for (let i = 0; i < keys.length - 1; i++) {
    if (ct >= keys[i].time && ct <= keys[i + 1].time) {
      const localT = (ct - keys[i].time) / (keys[i + 1].time - keys[i].time);
      return lerp(keys[i].size, keys[i + 1].size, localT);
    }
  }
  return keys[keys.length - 1].size;
}

// ── Default Physics ────────────────────────────────────────

const NO_PHYSICS: PhysicsConfig = {
  gravityX: 0, gravityY: 0,
  windX: 0, windY: 0,
  drag: 0,
  turbulenceStrength: 0, turbulenceFrequency: 0,
};

const LIGHT_GRAVITY: PhysicsConfig = {
  ...NO_PHYSICS, gravityY: 80,
};

const RISE_PHYSICS: PhysicsConfig = {
  ...NO_PHYSICS, gravityY: -40, drag: 0.5,
};

const FLOAT_PHYSICS: PhysicsConfig = {
  ...NO_PHYSICS, gravityY: -15, drag: 0.8, turbulenceStrength: 20, turbulenceFrequency: 2,
};

// ── Emitter Config Builder ─────────────────────────────────

function baseConfig(overrides: Partial<EmitterConfig>): EmitterConfig {
  return {
    type: 'ambient',
    shape: 'point',
    position: { x: 0, y: 0 },
    shapeParam1: 0,
    shapeParam2: 0,
    count: 10,
    rate: 0,
    duration: 0,
    lifetime: [0.5, 1],
    speed: [20, 60],
    direction: [0, Math.PI * 2],
    size: [2, 5],
    rotation: [0, 0],
    rotationSpeed: [0, 0],
    colorStops: [{ time: 0, r: 255, g: 255, b: 255, a: 1 }],
    sizeOverLife: [],
    opacityStart: 1,
    opacityEnd: 0,
    blendMode: 'source-over',
    glow: 0,
    trailLength: 0,
    physics: { ...NO_PHYSICS },
    ...overrides,
  };
}

// ── Preset Emitter Configurations ──────────────────────────

export const PRESETS = {

  // ---------- Tower Fire Shot ----------
  towerFire(x: number, y: number): EmitterConfig {
    return baseConfig({
      type: 'fire',
      shape: 'cone',
      position: { x, y },
      shapeParam1: 0.6,
      shapeParam2: -Math.PI / 2,
      count: 25,
      lifetime: [0.3, 0.7],
      speed: [60, 140],
      size: [3, 8],
      colorStops: [
        { time: 0, r: 255, g: 255, b: 100, a: 1 },
        { time: 0.3, r: 255, g: 160, b: 20, a: 1 },
        { time: 0.7, r: 255, g: 60, b: 0, a: 0.8 },
        { time: 1, r: 80, g: 20, b: 0, a: 0 },
      ],
      sizeOverLife: [
        { time: 0, size: 0.5 },
        { time: 0.2, size: 1.2 },
        { time: 1, size: 0.1 },
      ],
      blendMode: 'lighter',
      glow: 1.5,
      physics: { ...NO_PHYSICS, gravityY: -30, drag: 1 },
    });
  },

  // ---------- Ice Shatter ----------
  iceShatter(x: number, y: number): EmitterConfig {
    return baseConfig({
      type: 'ice',
      shape: 'burst',
      position: { x, y },
      count: 20,
      lifetime: [0.4, 0.9],
      speed: [80, 200],
      size: [2, 6],
      rotation: [0, Math.PI * 2],
      rotationSpeed: [-8, 8],
      colorStops: [
        { time: 0, r: 200, g: 240, b: 255, a: 1 },
        { time: 0.5, r: 130, g: 200, b: 255, a: 0.9 },
        { time: 1, r: 80, g: 160, b: 255, a: 0 },
      ],
      glow: 0.8,
      physics: { ...NO_PHYSICS, gravityY: 60, drag: 1.5 },
    });
  },

  // ---------- Lightning Strike ----------
  lightningStrike(x: number, y: number): EmitterConfig {
    return baseConfig({
      type: 'lightning',
      shape: 'point',
      position: { x, y },
      count: 30,
      lifetime: [0.1, 0.4],
      speed: [100, 350],
      size: [1, 4],
      colorStops: [
        { time: 0, r: 255, g: 255, b: 255, a: 1 },
        { time: 0.3, r: 255, g: 255, b: 100, a: 1 },
        { time: 1, r: 100, g: 100, b: 255, a: 0 },
      ],
      blendMode: 'lighter',
      glow: 2,
      trailLength: 4,
      physics: { ...NO_PHYSICS, drag: 3 },
    });
  },

  // ---------- Poison Cloud ----------
  poisonCloud(x: number, y: number): EmitterConfig {
    return baseConfig({
      type: 'smoke',
      shape: 'circle',
      position: { x, y },
      shapeParam1: 20,
      count: 40,
      rate: 20,
      duration: 2,
      lifetime: [0.8, 2],
      speed: [5, 25],
      size: [6, 14],
      colorStops: [
        { time: 0, r: 50, g: 200, b: 50, a: 0.6 },
        { time: 0.5, r: 30, g: 160, b: 30, a: 0.4 },
        { time: 1, r: 20, g: 80, b: 20, a: 0 },
      ],
      sizeOverLife: [
        { time: 0, size: 0.6 },
        { time: 0.5, size: 1.2 },
        { time: 1, size: 1.5 },
      ],
      blendMode: 'source-over',
      opacityEnd: 0,
      physics: { ...FLOAT_PHYSICS, gravityY: -10 },
    });
  },

  // ---------- Magic Orbs Trail ----------
  magicOrbs(x: number, y: number): EmitterConfig {
    return baseConfig({
      type: 'magic',
      shape: 'circle',
      position: { x, y },
      shapeParam1: 5,
      count: 15,
      lifetime: [0.3, 0.8],
      speed: [10, 40],
      size: [2, 5],
      colorStops: [
        { time: 0, r: 200, g: 100, b: 255, a: 1 },
        { time: 0.5, r: 150, g: 50, b: 220, a: 0.8 },
        { time: 1, r: 80, g: 20, b: 160, a: 0 },
      ],
      blendMode: 'lighter',
      glow: 1.2,
      trailLength: 3,
      physics: { ...NO_PHYSICS, drag: 2, turbulenceStrength: 40, turbulenceFrequency: 3 },
    });
  },

  // ---------- Explosion ----------
  explosion(x: number, y: number, radius: number = 40): EmitterConfig {
    const particleCount = Math.min(80, Math.round(radius * 1.5));
    return baseConfig({
      type: 'explosion',
      shape: 'burst',
      position: { x, y },
      count: particleCount,
      lifetime: [0.3, 0.8],
      speed: [radius * 2, radius * 5],
      size: [3, 8],
      colorStops: [
        { time: 0, r: 255, g: 255, b: 200, a: 1 },
        { time: 0.2, r: 255, g: 200, b: 50, a: 1 },
        { time: 0.5, r: 255, g: 100, b: 0, a: 0.8 },
        { time: 1, r: 60, g: 30, b: 0, a: 0 },
      ],
      sizeOverLife: [
        { time: 0, size: 0.3 },
        { time: 0.15, size: 1.5 },
        { time: 1, size: 0.2 },
      ],
      blendMode: 'lighter',
      glow: 1.8,
      physics: { ...NO_PHYSICS, gravityY: 50, drag: 2.5 },
    });
  },

  // ---------- Death Burst ----------
  deathBurst(x: number, y: number, color: string = '#ff4444'): EmitterConfig {
    const { r, g, b } = hexToRgb(color);
    return baseConfig({
      type: 'death',
      shape: 'burst',
      position: { x, y },
      count: 20,
      lifetime: [0.3, 0.7],
      speed: [60, 150],
      size: [2, 6],
      colorStops: [
        { time: 0, r, g, b, a: 1 },
        { time: 0.5, r: Math.round(r * 0.6), g: Math.round(g * 0.6), b: Math.round(b * 0.6), a: 0.7 },
        { time: 1, r: Math.round(r * 0.2), g: Math.round(g * 0.2), b: Math.round(b * 0.2), a: 0 },
      ],
      sizeOverLife: [
        { time: 0, size: 1 },
        { time: 0.3, size: 1.3 },
        { time: 1, size: 0 },
      ],
      physics: { ...LIGHT_GRAVITY, drag: 2 },
    });
  },

  // ---------- Boss Death (Big) ----------
  bossDeath(x: number, y: number): EmitterConfig {
    return baseConfig({
      type: 'explosion',
      shape: 'burst',
      position: { x, y },
      count: 100,
      lifetime: [0.5, 1.5],
      speed: [100, 400],
      size: [4, 12],
      colorStops: [
        { time: 0, r: 255, g: 255, b: 255, a: 1 },
        { time: 0.15, r: 255, g: 230, b: 100, a: 1 },
        { time: 0.4, r: 255, g: 120, b: 0, a: 0.9 },
        { time: 0.7, r: 200, g: 50, b: 0, a: 0.6 },
        { time: 1, r: 40, g: 10, b: 0, a: 0 },
      ],
      sizeOverLife: [
        { time: 0, size: 0.2 },
        { time: 0.1, size: 1.8 },
        { time: 0.6, size: 1 },
        { time: 1, size: 0 },
      ],
      blendMode: 'lighter',
      glow: 2.5,
      trailLength: 6,
      physics: { ...NO_PHYSICS, gravityY: 40, drag: 1.5 },
    });
  },

  // ---------- Gold Coins ----------
  goldCoins(x: number, y: number, amount: number = 1): EmitterConfig {
    const count = Math.min(30, Math.max(3, amount));
    return baseConfig({
      type: 'coins',
      shape: 'cone',
      position: { x, y },
      shapeParam1: 1.2,
      shapeParam2: -Math.PI / 2,
      count,
      lifetime: [0.6, 1.2],
      speed: [60, 150],
      size: [3, 6],
      rotation: [0, Math.PI * 2],
      rotationSpeed: [-10, 10],
      colorStops: [
        { time: 0, r: 255, g: 215, b: 0, a: 1 },
        { time: 0.7, r: 255, g: 200, b: 0, a: 1 },
        { time: 1, r: 200, g: 150, b: 0, a: 0 },
      ],
      glow: 0.6,
      physics: { ...LIGHT_GRAVITY, drag: 1 },
    });
  },

  // ---------- Heal Pulse ----------
  healPulse(x: number, y: number, radius: number = 50): EmitterConfig {
    return baseConfig({
      type: 'heal',
      shape: 'circle',
      position: { x, y },
      shapeParam1: radius * 0.8,
      count: 25,
      lifetime: [0.5, 1.2],
      speed: [10, 30],
      direction: [-Math.PI, 0],
      size: [2, 5],
      colorStops: [
        { time: 0, r: 100, g: 255, b: 150, a: 0.8 },
        { time: 0.5, r: 150, g: 255, b: 200, a: 0.6 },
        { time: 1, r: 200, g: 255, b: 220, a: 0 },
      ],
      sizeOverLife: [
        { time: 0, size: 0.5 },
        { time: 0.4, size: 1.3 },
        { time: 1, size: 0.3 },
      ],
      blendMode: 'lighter',
      glow: 1,
      physics: { ...RISE_PHYSICS },
    });
  },

  // ---------- Quiz Correct Sparkle ----------
  quizCorrect(x: number, y: number): EmitterConfig {
    return baseConfig({
      type: 'sparkle',
      shape: 'burst',
      position: { x, y },
      count: 30,
      lifetime: [0.4, 1],
      speed: [80, 200],
      size: [3, 7],
      rotation: [0, Math.PI * 2],
      rotationSpeed: [-5, 5],
      colorStops: [
        { time: 0, r: 255, g: 255, b: 100, a: 1 },
        { time: 0.4, r: 100, g: 255, b: 100, a: 1 },
        { time: 1, r: 50, g: 200, b: 255, a: 0 },
      ],
      blendMode: 'lighter',
      glow: 1.5,
      physics: { ...NO_PHYSICS, gravityY: 30, drag: 2 },
    });
  },

  // ---------- Quiz Wrong Shake ----------
  quizWrong(x: number, y: number): EmitterConfig {
    return baseConfig({
      type: 'death',
      shape: 'burst',
      position: { x, y },
      count: 15,
      lifetime: [0.2, 0.5],
      speed: [30, 80],
      size: [2, 5],
      colorStops: [
        { time: 0, r: 255, g: 50, b: 50, a: 1 },
        { time: 1, r: 150, g: 0, b: 0, a: 0 },
      ],
      physics: { ...NO_PHYSICS, drag: 3, turbulenceStrength: 80, turbulenceFrequency: 8 },
    });
  },

  // ---------- Combo Fire ----------
  comboFire(x: number, y: number, comboCount: number): EmitterConfig {
    const intensity = Math.min(5, comboCount);
    const count = 10 + intensity * 5;
    const text = `${comboCount}x COMBO!`;
    return baseConfig({
      type: 'combo',
      shape: 'point',
      position: { x, y },
      count,
      lifetime: [0.6, 1.5],
      speed: [40, 100 + intensity * 20],
      direction: [-Math.PI * 0.8, -Math.PI * 0.2],
      size: [3, 6 + intensity],
      colorStops: [
        { time: 0, r: 255, g: 255, b: 255, a: 1 },
        { time: 0.2, r: 255, g: 200, b: 50, a: 1 },
        { time: 0.6, r: 255, g: 100 - intensity * 15, b: 0, a: 0.8 },
        { time: 1, r: 180, g: 30, b: 0, a: 0 },
      ],
      blendMode: 'lighter',
      glow: 1 + intensity * 0.3,
      trailLength: intensity,
      text,
      fontSize: 18 + intensity * 2,
      physics: { ...RISE_PHYSICS, gravityY: -60 - intensity * 10 },
    });
  },

  // ---------- Level Up ----------
  levelUp(x: number, y: number): EmitterConfig {
    return baseConfig({
      type: 'levelup',
      shape: 'circle',
      position: { x, y },
      shapeParam1: 15,
      count: 40,
      lifetime: [0.5, 1.2],
      speed: [30, 100],
      direction: [-Math.PI, 0],
      size: [2, 6],
      colorStops: [
        { time: 0, r: 255, g: 255, b: 255, a: 1 },
        { time: 0.3, r: 100, g: 200, b: 255, a: 1 },
        { time: 0.7, r: 50, g: 150, b: 255, a: 0.7 },
        { time: 1, r: 30, g: 100, b: 200, a: 0 },
      ],
      sizeOverLife: [
        { time: 0, size: 0.3 },
        { time: 0.3, size: 1.5 },
        { time: 1, size: 0 },
      ],
      blendMode: 'lighter',
      glow: 1.2,
      physics: { ...RISE_PHYSICS, gravityY: -80 },
    });
  },

  // ---------- Grade Up (Merge) ----------
  gradeUp(x: number, y: number, grade: number): EmitterConfig {
    // Color depends on grade
    const gradeColors: Record<number, [number, number, number]> = {
      2: [50, 150, 255],   // Rare: blue
      3: [180, 50, 255],   // Epic: purple
      4: [255, 180, 30],   // Legendary: gold
      5: [255, 50, 80],    // Mythic: red-pink
    };
    const [cr, cg, cb] = gradeColors[grade] ?? [255, 255, 255];
    const count = 30 + grade * 15;

    return baseConfig({
      type: 'sparkle',
      shape: 'burst',
      position: { x, y },
      count,
      lifetime: [0.6, 1.5],
      speed: [80, 250],
      size: [3, 9],
      rotation: [0, Math.PI * 2],
      rotationSpeed: [-6, 6],
      colorStops: [
        { time: 0, r: 255, g: 255, b: 255, a: 1 },
        { time: 0.2, r: cr, g: cg, b: cb, a: 1 },
        { time: 0.8, r: cr, g: cg, b: cb, a: 0.6 },
        { time: 1, r: Math.round(cr * 0.3), g: Math.round(cg * 0.3), b: Math.round(cb * 0.3), a: 0 },
      ],
      sizeOverLife: [
        { time: 0, size: 0.2 },
        { time: 0.15, size: 1.6 },
        { time: 0.5, size: 1 },
        { time: 1, size: 0 },
      ],
      blendMode: 'lighter',
      glow: 1.5 + grade * 0.3,
      trailLength: grade,
      physics: { ...NO_PHYSICS, gravityY: 20, drag: 2 },
    });
  },

  // ---------- Ambient Dust ----------
  ambientDust(canvasWidth: number, canvasHeight: number): EmitterConfig {
    return baseConfig({
      type: 'ambient',
      shape: 'line',
      position: { x: canvasWidth / 2, y: canvasHeight / 2 },
      shapeParam1: canvasWidth,
      shapeParam2: 0,
      count: 200,
      rate: 8,
      duration: 999,
      lifetime: [3, 8],
      speed: [2, 8],
      direction: [-Math.PI * 0.7, -Math.PI * 0.3],
      size: [1, 2.5],
      colorStops: [
        { time: 0, r: 200, g: 200, b: 180, a: 0 },
        { time: 0.2, r: 200, g: 200, b: 180, a: 0.3 },
        { time: 0.8, r: 200, g: 200, b: 180, a: 0.3 },
        { time: 1, r: 200, g: 200, b: 180, a: 0 },
      ],
      opacityStart: 0.3,
      opacityEnd: 0,
      physics: {
        ...NO_PHYSICS,
        windX: 5,
        windY: -2,
        turbulenceStrength: 10,
        turbulenceFrequency: 0.5,
      },
    });
  },

  // ---------- Rain ----------
  rain(canvasWidth: number, canvasHeight: number): EmitterConfig {
    void canvasHeight;
    return baseConfig({
      type: 'ambient',
      shape: 'line',
      position: { x: canvasWidth / 2, y: -10 },
      shapeParam1: canvasWidth * 1.2,
      shapeParam2: 0,
      count: 5000,
      rate: 120,
      duration: 999,
      lifetime: [0.4, 0.8],
      speed: [400, 600],
      direction: [Math.PI / 2 - 0.15, Math.PI / 2 + 0.05],
      size: [1, 2],
      rotation: [0, 0],
      rotationSpeed: [0, 0],
      colorStops: [
        { time: 0, r: 150, g: 180, b: 220, a: 0.4 },
        { time: 1, r: 150, g: 180, b: 220, a: 0.1 },
      ],
      trailLength: 3,
      opacityStart: 0.5,
      opacityEnd: 0.1,
      physics: { ...NO_PHYSICS, windX: -20 },
    });
  },

  // ---------- Snow ----------
  snow(canvasWidth: number, canvasHeight: number): EmitterConfig {
    void canvasHeight;
    return baseConfig({
      type: 'ambient',
      shape: 'line',
      position: { x: canvasWidth / 2, y: -10 },
      shapeParam1: canvasWidth * 1.3,
      shapeParam2: 0,
      count: 3000,
      rate: 30,
      duration: 999,
      lifetime: [3, 7],
      speed: [15, 40],
      direction: [Math.PI / 2 - 0.3, Math.PI / 2 + 0.3],
      size: [2, 5],
      rotation: [0, Math.PI * 2],
      rotationSpeed: [-1, 1],
      colorStops: [
        { time: 0, r: 255, g: 255, b: 255, a: 0.8 },
        { time: 0.5, r: 240, g: 245, b: 255, a: 0.7 },
        { time: 1, r: 220, g: 230, b: 255, a: 0 },
      ],
      opacityStart: 0.8,
      opacityEnd: 0,
      physics: {
        ...NO_PHYSICS,
        gravityY: 10,
        windX: 8,
        turbulenceStrength: 25,
        turbulenceFrequency: 0.8,
        drag: 0.5,
      },
    });
  },

  // ---------- Embers ----------
  embers(canvasWidth: number, canvasHeight: number): EmitterConfig {
    return baseConfig({
      type: 'fire',
      shape: 'line',
      position: { x: canvasWidth / 2, y: canvasHeight + 10 },
      shapeParam1: canvasWidth,
      shapeParam2: 0,
      count: 2000,
      rate: 15,
      duration: 999,
      lifetime: [2, 5],
      speed: [20, 60],
      direction: [-Math.PI * 0.7, -Math.PI * 0.3],
      size: [1, 3],
      colorStops: [
        { time: 0, r: 255, g: 200, b: 50, a: 0.9 },
        { time: 0.3, r: 255, g: 130, b: 20, a: 0.8 },
        { time: 0.7, r: 200, g: 60, b: 0, a: 0.5 },
        { time: 1, r: 100, g: 20, b: 0, a: 0 },
      ],
      blendMode: 'lighter',
      glow: 0.8,
      physics: {
        ...NO_PHYSICS,
        gravityY: -30,
        windX: 10,
        turbulenceStrength: 30,
        turbulenceFrequency: 1.5,
        drag: 0.3,
      },
    });
  },
};

// ── Color Utility ──────────────────────────────────────────

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleaned = hex.replace('#', '');
  const num = parseInt(cleaned, 16);
  if (cleaned.length === 3) {
    const r = ((num >> 8) & 0xf) * 17;
    const g = ((num >> 4) & 0xf) * 17;
    const b = (num & 0xf) * 17;
    return { r, g, b };
  }
  return {
    r: (num >> 16) & 0xff,
    g: (num >> 8) & 0xff,
    b: num & 0xff,
  };
}

// ── Singleton Exports ──────────────────────────────────────

export const particleSystem = new ParticleSystem();
export const screenEffects = new ScreenEffects();
