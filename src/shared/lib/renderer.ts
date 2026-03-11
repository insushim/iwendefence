// ============================================================
// WordGuard - Canvas Renderer (3D Premium Style)
// Gradients, shadows, lighting, depth for 3D-feeling 2D
// ============================================================

import type {
  Tower,
  TowerType,
  TowerGrade,
  Enemy,
  EnemyType,
  MapData,
  GridPosition,
  WorldPosition,
  SynergyBonus,
} from '../types/game';

// ── Placement Preview Info ───────────────────────────────────

export interface PlacementInfo {
  towerType: TowerType;
  row: number;
  col: number;
  range: number;
  canPlace: boolean;
}

import type {
  Projectile,
  VisualEffect,
  DamageText,
  GameEngine,
} from './gameEngine';

import { getCellCenter, getDistanceBetweenPoints } from './pathfinding';
import { particleSystem, screenEffects } from './particleSystem';

// ── 3D Constants ────────────────────────────────────────────

const DEPTH = 0.12;
let _time = 0;
function getTime(): number { return _time; }
function updateTime(): void { _time = Date.now() / 1000; }

// ── Color Palettes ──────────────────────────────────────────

interface TileStyle {
  top: string;
  topLight: string;
  left: string;
  right: string;
}

const TERRAIN_STYLES: Record<number, TileStyle> = {
  0: { top: '#5a9c4f', topLight: '#6fb85f', left: '#3d6b35', right: '#4a7c3f' },
  1: { top: '#9b8365', topLight: '#b09575', left: '#6b5540', right: '#7d6550' },
  2: { top: '#5fa84a', topLight: '#72c05a', left: '#3a7030', right: '#48843a' },
  3: { top: '#8b8b8b', topLight: '#9b9b9b', left: '#555555', right: '#6b6b6b' },
  4: { top: '#3d7a2e', topLight: '#4d8a3e', left: '#1d4a0e', right: '#2d5a1e' },
  5: { top: '#d4b36a', topLight: '#e4c37a', left: '#a4834a', right: '#b49350' },
  6: { top: '#9b5523', topLight: '#ab6533', left: '#6b3503', right: '#7b4513' },
  7: { top: '#ffffff', topLight: '#ffffff', left: '#ccccdd', right: '#ddddee' },
  8: { top: '#2a2a4e', topLight: '#3a3a5e', left: '#0a0a1e', right: '#1a1a2e' },
  9: { top: '#ec4400', topLight: '#ff5510', left: '#aa2200', right: '#cc3300' },
};

const TOWER_PALETTE: Record<string, { base: string; body: string; top: string; glow: string; accent: string }> = {
  ARCHER: { base: '#3a6a2a', body: '#4a9a3a', top: '#6abb5a', glow: 'rgba(74,154,58,0.4)', accent: '#2d5a1e' },
  MAGIC: { base: '#5a2a8a', body: '#8944cc', top: '#bb66ff', glow: 'rgba(137,68,204,0.5)', accent: '#6622aa' },
  CANNON: { base: '#555555', body: '#777777', top: '#999999', glow: 'rgba(120,120,120,0.3)', accent: '#333333' },
  ICE: { base: '#1a7a8a', body: '#44bbcc', top: '#88eeff', glow: 'rgba(68,187,204,0.5)', accent: '#0a5a6a' },
  LIGHTNING: { base: '#8a7a00', body: '#ccbb22', top: '#ffee44', glow: 'rgba(255,238,68,0.5)', accent: '#aa9900' },
  POISON: { base: '#1a6a1a', body: '#33aa33', top: '#55dd55', glow: 'rgba(51,170,51,0.4)', accent: '#0a4a0a' },
  HEALER: { base: '#6aaa8a', body: '#aaddcc', top: '#ffffff', glow: 'rgba(170,221,204,0.5)', accent: '#448866' },
  BARRICADE: { base: '#5a3a10', body: '#8b6914', top: '#bb9944', glow: 'rgba(139,105,20,0.3)', accent: '#3a2a00' },
  GOLDMINE: { base: '#8a6a00', body: '#ccaa22', top: '#ffd700', glow: 'rgba(255,215,0,0.5)', accent: '#996600' },
  SNIPER: { base: '#1a3a10', body: '#2d5a1e', top: '#4a8a3e', glow: 'rgba(45,90,30,0.3)', accent: '#0a2a00' },
  FLAME: { base: '#8a2200', body: '#cc4411', top: '#ff6633', glow: 'rgba(255,102,51,0.5)', accent: '#661100' },
  WORD: { base: '#6a22aa', body: '#9944dd', top: '#cc66ff', glow: 'rgba(153,68,221,0.6)', accent: '#4400aa' },
  METEOR: { base: '#8b2500', body: '#ff4500', top: '#ff6a33', glow: 'rgba(255,69,0,0.6)', accent: '#cc3300' },
  VOID: { base: '#1a0033', body: '#4b0082', top: '#7b33b0', glow: 'rgba(75,0,130,0.6)', accent: '#2d004d' },
  PHOENIX: { base: '#8b2000', body: '#ff6347', top: '#ff8c69', glow: 'rgba(255,99,71,0.6)', accent: '#cc4030' },
  CHRONO: { base: '#005f69', body: '#00ced1', top: '#40e0d0', glow: 'rgba(0,206,209,0.6)', accent: '#008b8b' },
  DIVINE: { base: '#8b7500', body: '#ffd700', top: '#ffec8b', glow: 'rgba(255,215,0,0.7)', accent: '#b8960f' },
};

const ENEMY_PALETTE: Record<string, { body: string; light: string; dark: string; eye: string }> = {
  SLIME: { body: '#66cc66', light: '#88ee88', dark: '#44aa44', eye: '#ffffff' },
  GOBLIN: { body: '#88aa44', light: '#aacc66', dark: '#668822', eye: '#ff4444' },
  SKELETON: { body: '#ddddcc', light: '#eeeedd', dark: '#aaaaaa', eye: '#ff0000' },
  BAT: { body: '#664488', light: '#886aaa', dark: '#442266', eye: '#ffff00' },
  WOLF: { body: '#887766', light: '#aa9988', dark: '#665544', eye: '#ffcc00' },
  KNIGHT: { body: '#8899aa', light: '#aabbcc', dark: '#667788', eye: '#ffffff' },
  GOLEM: { body: '#998866', light: '#bbaa88', dark: '#776644', eye: '#ffaa00' },
  SHIELD_BEARER: { body: '#7788aa', light: '#99aacc', dark: '#556688', eye: '#ffffff' },
  IRON_TURTLE: { body: '#667766', light: '#889988', dark: '#445544', eye: '#ffff00' },
  ARMORED_ORC: { body: '#669955', light: '#88bb77', dark: '#447733', eye: '#ff3300' },
  THIEF: { body: '#555555', light: '#777777', dark: '#333333', eye: '#ffff00' },
  SHADOW: { body: '#333344', light: '#555566', dark: '#111122', eye: '#ff00ff' },
  NINJA: { body: '#222233', light: '#444455', dark: '#000011', eye: '#ff0000' },
  WIND_SPRITE: { body: '#aaeeff', light: '#ccffff', dark: '#88ccdd', eye: '#ffffff' },
  HASTE_IMP: { body: '#ff8866', light: '#ffaa88', dark: '#dd6644', eye: '#ffff00' },
  WIZARD: { body: '#6644cc', light: '#8866ee', dark: '#4422aa', eye: '#00ffff' },
  DARK_MAGE: { body: '#442266', light: '#664488', dark: '#220044', eye: '#ff00ff' },
  SPIRIT: { body: '#aaaaee', light: '#ccccff', dark: '#8888cc', eye: '#ffffff' },
  ENCHANTRESS: { body: '#cc66aa', light: '#ee88cc', dark: '#aa4488', eye: '#ff66ff' },
  PHANTOM: { body: '#8888cc', light: '#aaaaee', dark: '#6666aa', eye: '#00ff00' },
  HARPY: { body: '#cc88aa', light: '#eeaacc', dark: '#aa6688', eye: '#ffff00' },
  DRAGON_WHELP: { body: '#ff6644', light: '#ff8866', dark: '#dd4422', eye: '#ffff00' },
  GARGOYLE: { body: '#777777', light: '#999999', dark: '#555555', eye: '#ff0000' },
  PHOENIX_CHICK: { body: '#ffaa33', light: '#ffcc55', dark: '#dd8811', eye: '#ffffff' },
  WYVERN: { body: '#448866', light: '#66aa88', dark: '#226644', eye: '#ffcc00' },
  DRAGON: { body: '#ff3300', light: '#ff5522', dark: '#cc1100', eye: '#ffff00' },
  LICH_KING: { body: '#6633cc', light: '#8855ee', dark: '#4411aa', eye: '#00ff00' },
  DEMON_LORD: { body: '#cc0000', light: '#ee2222', dark: '#990000', eye: '#ffff00' },
  HYDRA: { body: '#338855', light: '#55aa77', dark: '#116633', eye: '#ff0000' },
  WORD_DESTROYER: { body: '#ff00ff', light: '#ff44ff', dark: '#cc00cc', eye: '#ffffff' },
};

const BOSS_TYPES: Set<string> = new Set([
  'DRAGON', 'LICH_KING', 'DEMON_LORD', 'HYDRA', 'WORD_DESTROYER',
]);

const GRADE_COLORS: Record<number, string> = {
  1: '#aaaaaa', 2: '#4488ff', 3: '#aa44ff', 4: '#ffaa00', 5: '#ff4466',
};

const GRADE_GLOW: Record<number, string> = {
  1: 'rgba(170,170,170,0)',
  2: 'rgba(68,136,255,0.4)',
  3: 'rgba(170,68,255,0.5)',
  4: 'rgba(255,170,0,0.6)',
  5: 'rgba(255,68,102,0.8)',
};

// ── Color Blending Helper ────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function blendColor(base: string, tint: string, amount: number): string {
  const [r1, g1, b1] = hexToRgb(base);
  const [r2, g2, b2] = hexToRgb(tint);
  const r = Math.round(r1 + (r2 - r1) * amount);
  const g = Math.round(g1 + (g2 - g1) * amount);
  const b = Math.round(b1 + (b2 - b1) * amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// ── Seeded Random for Decorations ────────────────────────────

function seededRandom(seed: number): number {
  let s = seed | 0;
  s = ((s >>> 16) ^ s) * 0x45d9f3b | 0;
  s = ((s >>> 16) ^ s) * 0x45d9f3b | 0;
  s = (s >>> 16) ^ s;
  return (s & 0x7fffffff) / 0x7fffffff;
}

// ── Boss Name Lookup ─────────────────────────────────────────

const BOSS_NAMES: Record<string, string> = {
  DRAGON: 'Dragon',
  LICH_KING: 'Lich King',
  DEMON_LORD: 'Demon Lord',
  HYDRA: 'Hydra',
  WORD_DESTROYER: 'Word Destroyer',
};

// ── Status Effect Icon Characters ────────────────────────────

const EFFECT_ICON_CHARS: Record<string, string> = {
  slow: '\u2744',
  poison: '\u2620',
  burn: '\u2666',
  freeze: '\u25C6',
  stun: '\u26A1',
  weaken: '\u25BC',
};

// ── Wave Announcement State ──────────────────────────────────

let _waveAnnounce: { wave: number; startTime: number; isBoss: boolean } | null = null;
let _lastRenderedWave = -1;

export function triggerWaveAnnounce(wave: number, isBoss: boolean): void {
  _waveAnnounce = { wave, startTime: _time, isBoss };
}

// ── Helpers ─────────────────────────────────────────────────

function drawShadow(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, alpha = 0.3): void {
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  ctx.beginPath();
  ctx.ellipse(x, y + ry * 0.4, rx, ry * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
}

function draw3DCircle(
  ctx: CanvasRenderingContext2D, x: number, y: number, r: number,
  light: string, body: string, dark: string
): void {
  // Main body gradient
  const grad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
  grad.addColorStop(0, light);
  grad.addColorStop(0.7, body);
  grad.addColorStop(1, dark);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

  // Specular highlight
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath();
  ctx.ellipse(x - r * 0.25, y - r * 0.3, r * 0.35, r * 0.2, -0.3, 0, Math.PI * 2);
  ctx.fill();
}

function draw3DRect(
  ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
  light: string, body: string, dark: string
): void {
  const d = Math.min(w, h) * 0.12;

  // Bottom face
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x + d, y + h + d);
  ctx.lineTo(x + w + d, y + h + d);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
  ctx.fill();

  // Right face
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(x + w, y);
  ctx.lineTo(x + w + d, y + d);
  ctx.lineTo(x + w + d, y + h + d);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
  ctx.fill();

  // Top face
  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, light);
  grad.addColorStop(1, body);
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);

  // Highlight
  const hl = ctx.createLinearGradient(x, y, x + w * 0.5, y + h * 0.5);
  hl.addColorStop(0, 'rgba(255,255,255,0.15)');
  hl.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = hl;
  ctx.fillRect(x, y, w, h);
}

// Enemy category helpers
function isFlying(type: EnemyType): boolean {
  return ['BAT', 'HARPY', 'DRAGON_WHELP', 'GARGOYLE', 'PHOENIX_CHICK', 'WYVERN', 'DRAGON'].includes(type);
}
function isArmored(type: EnemyType): boolean {
  return ['KNIGHT', 'GOLEM', 'SHIELD_BEARER', 'IRON_TURTLE', 'ARMORED_ORC'].includes(type);
}
function isFast(type: EnemyType): boolean {
  return ['THIEF', 'SHADOW', 'NINJA', 'WIND_SPRITE', 'HASTE_IMP'].includes(type);
}
function isMagic(type: EnemyType): boolean {
  return ['WIZARD', 'DARK_MAGE', 'SPIRIT', 'ENCHANTRESS', 'PHANTOM', 'LICH_KING'].includes(type);
}

// ── Main Render Function ────────────────────────────────────

export function renderGame(
  ctx: CanvasRenderingContext2D,
  engine: GameEngine,
  selectedTowerId: string | null,
  placementInfo?: PlacementInfo | null
): void {
  updateTime();

  const mapData = engine.getMapData();
  const cellSize = engine.getCellSize();

  // ── Screen Shake ──────────────────────────────────────
  const shake = engine.getScreenShake();
  if (shake) {
    const progress = shake.elapsed / shake.duration;
    const decay = 1 - progress;
    const shakeX = (Math.random() - 0.5) * shake.intensity * decay * 2;
    const shakeY = (Math.random() - 0.5) * shake.intensity * decay * 2;
    ctx.save();
    ctx.translate(shakeX, shakeY);
  }

  if (mapData) {
    drawMap(ctx, mapData, cellSize);
    drawPath(ctx, mapData.path, cellSize);
  }

  // ── Treasure Chests ───────────────────────────────────
  for (const chest of engine.getTreasureChests()) {
    if (!chest.collected) {
      drawTreasureChest(ctx, chest, cellSize);
    }
  }

  // Tower ground glow + shadows layer
  for (const tower of engine.getTowers()) {
    const c = getCellCenter(tower.position.row, tower.position.col, cellSize);
    // Ground glow aura (colored by tower type)
    const tp = TOWER_PALETTE[tower.type] ?? TOWER_PALETTE.ARCHER;
    const glowR = cellSize * 0.55;
    const glowGrad = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, glowR);
    glowGrad.addColorStop(0, tp.glow.replace(/[\d.]+\)$/, '0.12)'));
    glowGrad.addColorStop(0.6, tp.glow.replace(/[\d.]+\)$/, '0.05)'));
    glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(c.x, c.y, glowR, 0, Math.PI * 2);
    ctx.fill();
    // Shadow
    drawShadow(ctx, c.x + 2, c.y + 2, cellSize * 0.32, cellSize * 0.22, 0.25);
  }

  for (const tower of engine.getTowers()) {
    drawTower(ctx, tower, cellSize, tower.id === selectedTowerId, engine.getTowerRecoil(tower.id));
  }

  // ── Placement Preview (ghost tower + range circle) ──
  if (placementInfo) {
    drawPlacementPreview(ctx, placementInfo, cellSize);
  }

  for (const enemy of engine.getEnemies()) {
    const sz = BOSS_TYPES.has(enemy.type) ? cellSize * 0.5 : cellSize * 0.28;
    drawShadow(ctx, enemy.position.x + 2, enemy.position.y + 2, sz, sz * 0.5, 0.22);
  }

  for (const enemy of engine.getEnemies()) {
    drawEnemy(ctx, enemy, cellSize);
  }

  for (const proj of engine.getProjectiles()) {
    drawProjectile(ctx, proj);
  }

  drawEffects(ctx, engine.getEffects());
  drawDamageTexts(ctx, engine.getDamageTexts());

  // ── Particle System ───────────────────────────────────
  const rawDt = 1 / 60; // approximate frame dt
  particleSystem.update(rawDt);
  particleSystem.render(ctx);

  // ── Kill Combo Display ────────────────────────────────
  const killCombo = engine.getKillCombo();
  if (killCombo >= 3) {
    drawKillCombo(ctx, killCombo, ctx.canvas.width, ctx.canvas.height);
  }

  drawUIOverlay(ctx, engine);

  // Restore from screen shake
  if (shake) {
    ctx.restore();
  }

  // ── Flash Overlay ─────────────────────────────────────
  const flash = engine.getFlashOverlay();
  if (flash) {
    const progress = flash.elapsed / flash.duration;
    const alpha = flash.alpha * (1 - progress);
    ctx.fillStyle = flash.color;
    ctx.globalAlpha = alpha;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.globalAlpha = 1;
  }

  // ── Vignette (when HP is low) ─────────────────────────
  const hp = engine.getHp();
  const maxHp = engine.getMaxHp();
  if (hp > 0 && hp <= maxHp * 0.3) {
    drawDangerVignette(ctx, hp / maxHp);
  }

  // ── Synergy Indicators ────────────────────────────────
  const synergies = engine.getActiveSynergies();
  if (synergies.size > 0) {
    drawSynergyIndicators(ctx, synergies, ctx.canvas.width);
  }
}

// ── Treasure Chest Drawing ──────────────────────────────

function drawTreasureChest(
  ctx: CanvasRenderingContext2D,
  chest: { position: WorldPosition; collected: boolean },
  cellSize: number
): void {
  const { x, y } = chest.position;
  const t = getTime();
  const bobY = Math.sin(t * 3) * 3;
  const size = cellSize * 0.3;

  ctx.save();

  // Glow
  const glowAlpha = Math.sin(t * 4) * 0.15 + 0.3;
  const glowGrad = ctx.createRadialGradient(x, y + bobY, 0, x, y + bobY, size * 2);
  glowGrad.addColorStop(0, `rgba(255,215,0,${glowAlpha})`);
  glowGrad.addColorStop(1, 'rgba(255,215,0,0)');
  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.arc(x, y + bobY, size * 2, 0, Math.PI * 2);
  ctx.fill();

  // Shadow
  drawShadow(ctx, x, y + size * 0.7, size * 0.8, size * 0.3, 0.3);

  // Chest body
  const bodyGrad = ctx.createLinearGradient(x - size, y + bobY, x + size, y + bobY);
  bodyGrad.addColorStop(0, '#8B4513');
  bodyGrad.addColorStop(0.3, '#A0522D');
  bodyGrad.addColorStop(0.7, '#8B4513');
  bodyGrad.addColorStop(1, '#654321');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.roundRect(x - size, y + bobY - size * 0.3, size * 2, size * 1.1, 3);
  ctx.fill();

  // Lid
  const lidGrad = ctx.createLinearGradient(x - size, y + bobY - size * 0.8, x + size, y + bobY - size * 0.3);
  lidGrad.addColorStop(0, '#A0522D');
  lidGrad.addColorStop(0.5, '#CD853F');
  lidGrad.addColorStop(1, '#8B4513');
  ctx.fillStyle = lidGrad;
  ctx.beginPath();
  ctx.moveTo(x - size * 1.05, y + bobY - size * 0.3);
  ctx.lineTo(x - size * 0.8, y + bobY - size * 0.9);
  ctx.lineTo(x + size * 0.8, y + bobY - size * 0.9);
  ctx.lineTo(x + size * 1.05, y + bobY - size * 0.3);
  ctx.closePath();
  ctx.fill();

  // Metal clasp
  ctx.fillStyle = '#FFD700';
  ctx.fillRect(x - size * 0.15, y + bobY - size * 0.5, size * 0.3, size * 0.4);
  ctx.strokeStyle = '#B8860B';
  ctx.lineWidth = 1;
  ctx.strokeRect(x - size * 0.15, y + bobY - size * 0.5, size * 0.3, size * 0.4);

  // Keyhole
  ctx.fillStyle = '#3a2a1a';
  ctx.beginPath();
  ctx.arc(x, y + bobY - size * 0.3, size * 0.06, 0, Math.PI * 2);
  ctx.fill();

  // Sparkles
  for (let i = 0; i < 3; i++) {
    const angle = t * 2 + i * 2.1;
    const dist = size * 1.2 + Math.sin(t * 3 + i) * size * 0.3;
    const sx = x + Math.cos(angle) * dist;
    const sy = y + bobY + Math.sin(angle) * dist * 0.5;
    const sparkAlpha = Math.sin(t * 5 + i * 1.5) * 0.4 + 0.4;
    ctx.fillStyle = `rgba(255,215,0,${sparkAlpha})`;
    ctx.beginPath();
    ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// ── Kill Combo Display ──────────────────────────────────

function drawKillCombo(
  ctx: CanvasRenderingContext2D,
  combo: number,
  cw: number,
  ch: number
): void {
  const t = getTime();
  const scale = 1 + Math.sin(t * 6) * 0.05;

  ctx.save();
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';

  const x = cw - 15;
  const y = 40;

  // Background pill
  const text = `${combo} KILL`;
  const fontSize = combo >= 10 ? 16 : 14;
  ctx.font = `bold ${fontSize}px sans-serif`;
  const tw = ctx.measureText(text).width + 20;

  ctx.fillStyle = 'rgba(255,50,50,0.3)';
  ctx.beginPath();
  ctx.roundRect(x - tw, y - 2, tw, 22, 11);
  ctx.fill();

  // Text with glow
  ctx.shadowColor = '#ff4444';
  ctx.shadowBlur = combo >= 10 ? 12 : 6;
  ctx.fillStyle = combo >= 10 ? '#ffcc00' : '#ff6644';
  ctx.fillText(text, x - 8, y + 1);
  ctx.shadowBlur = 0;

  ctx.restore();
}

// ── Danger Vignette ─────────────────────────────────────

function drawDangerVignette(ctx: CanvasRenderingContext2D, hpRatio: number): void {
  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;
  const t = getTime();

  const pulseAlpha = (Math.sin(t * 4) * 0.1 + 0.15) * (1 - hpRatio * 3);
  const vigGrad = ctx.createRadialGradient(cw / 2, ch / 2, ch * 0.3, cw / 2, ch / 2, ch * 0.7);
  vigGrad.addColorStop(0, 'rgba(255,0,0,0)');
  vigGrad.addColorStop(1, `rgba(255,0,0,${Math.max(0, pulseAlpha)})`);
  ctx.fillStyle = vigGrad;
  ctx.fillRect(0, 0, cw, ch);
}

// ── Synergy Indicators ──────────────────────────────────

function drawSynergyIndicators(
  ctx: CanvasRenderingContext2D,
  synergies: Map<string, SynergyBonus>,
  canvasWidth: number
): void {
  ctx.save();
  ctx.textAlign = 'left';
  ctx.font = 'bold 9px sans-serif';

  let y = 50;
  const x = 8;

  for (const [id, bonus] of synergies) {
    // Small indicator pill
    ctx.fillStyle = 'rgba(100,200,255,0.2)';
    ctx.beginPath();
    ctx.roundRect(x, y, 60, 14, 7);
    ctx.fill();

    ctx.fillStyle = '#88ccff';
    ctx.textBaseline = 'middle';

    let label = id.replace(/_/g, ' ').split(' ').map(w => w[0]?.toUpperCase()).join('');
    if (bonus.damageMultiplier) label += ` +${Math.round((bonus.damageMultiplier - 1) * 100)}%`;

    ctx.fillText(label, x + 5, y + 7);
    y += 18;
  }

  ctx.restore();
}

// ── Map Drawing (3D Tiles) ──────────────────────────────────

export function drawMap(
  ctx: CanvasRenderingContext2D,
  mapData: MapData,
  cellSize: number
): void {
  const grid = mapData.grid;
  const depth = cellSize * DEPTH;
  const t = getTime();

  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      const terrain = grid[row][col];
      const style = TERRAIN_STYLES[terrain] ?? TERRAIN_STYLES[0];
      const x = col * cellSize;
      const y = row * cellSize;

      // Right depth face
      ctx.fillStyle = style.right;
      ctx.beginPath();
      ctx.moveTo(x + cellSize, y);
      ctx.lineTo(x + cellSize + depth * 0.5, y + depth * 0.5);
      ctx.lineTo(x + cellSize + depth * 0.5, y + cellSize + depth * 0.5);
      ctx.lineTo(x + cellSize, y + cellSize);
      ctx.closePath();
      ctx.fill();

      // Bottom depth face
      ctx.fillStyle = style.left;
      ctx.beginPath();
      ctx.moveTo(x, y + cellSize);
      ctx.lineTo(x + depth * 0.5, y + cellSize + depth * 0.5);
      ctx.lineTo(x + cellSize + depth * 0.5, y + cellSize + depth * 0.5);
      ctx.lineTo(x + cellSize, y + cellSize);
      ctx.closePath();
      ctx.fill();

      // Top face with gradient
      const topGrad = ctx.createLinearGradient(x, y, x + cellSize, y + cellSize);
      topGrad.addColorStop(0, style.topLight);
      topGrad.addColorStop(1, style.top);
      ctx.fillStyle = topGrad;
      ctx.fillRect(x, y, cellSize, cellSize);

      // Terrain-specific details
      const baseSeed = row * 1000 + col;
      if (terrain === 0) {
        // Grass tile: blade tufts + occasional flowers
        for (let i = 0; i < 5; i++) {
          const s1 = seededRandom(baseSeed * 37 + i * 17);
          const s2 = seededRandom(baseSeed * 53 + i * 23);
          const s3 = seededRandom(baseSeed * 71 + i * 31);
          const gx = x + s1 * (cellSize - 6) + 3;
          const gy = y + s2 * (cellSize - 6) + 3;
          const bladeH = 3 + s3 * 4;
          const sway = Math.sin(t * 1.5 + s1 * 10 + col * 0.3) * 1.5;
          const green = Math.floor(140 + s3 * 60);
          ctx.fillStyle = `rgba(60,${green},30,${0.25 + s3 * 0.2})`;
          ctx.beginPath();
          ctx.moveTo(gx - 1, gy);
          ctx.lineTo(gx + sway, gy - bladeH);
          ctx.lineTo(gx + 1, gy);
          ctx.closePath();
          ctx.fill();
        }
        // Occasional flower (~20%)
        if (seededRandom(baseSeed * 97) < 0.2) {
          const fx = x + seededRandom(baseSeed * 113) * (cellSize - 8) + 4;
          const fy = y + seededRandom(baseSeed * 127) * (cellSize - 8) + 4;
          const hue = seededRandom(baseSeed * 139) * 60 + 320;
          ctx.fillStyle = `hsla(${hue}, 70%, 65%, 0.5)`;
          ctx.beginPath();
          ctx.arc(fx, fy, 1.8, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,200,0.6)';
          ctx.beginPath();
          ctx.arc(fx, fy, 0.7, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (terrain === 2) {
        // Buildable tile: grass with subtle grid pattern
        // Small grass blades (fewer than terrain 0)
        for (let i = 0; i < 3; i++) {
          const s1 = seededRandom(baseSeed * 41 + i * 13);
          const s2 = seededRandom(baseSeed * 59 + i * 19);
          const s3 = seededRandom(baseSeed * 73 + i * 29);
          const gx = x + s1 * (cellSize - 4) + 2;
          const gy = y + s2 * (cellSize - 4) + 2;
          const bladeH = 2 + s3 * 3;
          const sway = Math.sin(t * 1.2 + s1 * 8 + col * 0.4) * 1;
          ctx.fillStyle = `rgba(80,160,50,${0.15 + s3 * 0.1})`;
          ctx.beginPath();
          ctx.moveTo(gx - 0.8, gy);
          ctx.lineTo(gx + sway, gy - bladeH);
          ctx.lineTo(gx + 0.8, gy);
          ctx.closePath();
          ctx.fill();
        }
        // Subtle grid marker for buildable indication
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
      } else if (terrain === 9) {
        // Lava glow + cracks
        const glow = Math.sin(t * 3 + col + row) * 0.2 + 0.3;
        ctx.fillStyle = `rgba(255,200,50,${glow})`;
        ctx.fillRect(x, y, cellSize, cellSize);
        ctx.strokeStyle = `rgba(255,100,0,${glow * 0.5})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + seededRandom(baseSeed * 41) * cellSize, y);
        ctx.lineTo(x + seededRandom(baseSeed * 59) * cellSize, y + cellSize);
        ctx.stroke();
      } else if (terrain === 7) {
        // Snow: star-shaped sparkles
        for (let i = 0; i < 4; i++) {
          const sx = x + seededRandom(baseSeed * 11 + i * 37) * (cellSize - 4) + 2;
          const sy = y + seededRandom(baseSeed * 7 + i * 43) * (cellSize - 4) + 2;
          const sparkle = Math.sin(t * 4 + i * 1.7 + baseSeed * 0.01) * 0.5 + 0.5;
          ctx.fillStyle = `rgba(220,240,255,${sparkle * 0.5})`;
          const sr = 1.2 + sparkle * 0.8;
          ctx.beginPath();
          ctx.moveTo(sx, sy - sr);
          ctx.lineTo(sx + sr * 0.3, sy - sr * 0.3);
          ctx.lineTo(sx + sr, sy);
          ctx.lineTo(sx + sr * 0.3, sy + sr * 0.3);
          ctx.lineTo(sx, sy + sr);
          ctx.lineTo(sx - sr * 0.3, sy + sr * 0.3);
          ctx.lineTo(sx - sr, sy);
          ctx.lineTo(sx - sr * 0.3, sy - sr * 0.3);
          ctx.closePath();
          ctx.fill();
        }
      } else if (terrain === 4) {
        // Dense forest: tree-like dots
        for (let i = 0; i < 3; i++) {
          const tx = x + seededRandom(baseSeed * 67 + i * 19) * (cellSize - 6) + 3;
          const ty = y + seededRandom(baseSeed * 83 + i * 29) * (cellSize - 6) + 3;
          ctx.fillStyle = `rgba(30,100,20,${0.15 + seededRandom(baseSeed + i) * 0.15})`;
          ctx.beginPath();
          ctx.arc(tx, ty, 2 + seededRandom(baseSeed * 3 + i) * 2, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (terrain === 5) {
        // Sand: grain dots
        for (let i = 0; i < 4; i++) {
          const sx = x + seededRandom(baseSeed * 47 + i * 13) * (cellSize - 4) + 2;
          const sy = y + seededRandom(baseSeed * 61 + i * 17) * (cellSize - 4) + 2;
          ctx.fillStyle = 'rgba(180,150,100,0.15)';
          ctx.beginPath();
          ctx.arc(sx, sy, 0.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Top-left highlight
      const hl = ctx.createLinearGradient(x, y, x + cellSize * 0.5, y + cellSize * 0.5);
      hl.addColorStop(0, 'rgba(255,255,255,0.07)');
      hl.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = hl;
      ctx.fillRect(x, y, cellSize, cellSize);

      // Grid edge
      ctx.strokeStyle = 'rgba(0,0,0,0.08)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x, y, cellSize, cellSize);
    }
  }

  // Background gradient overlay (top bright, bottom dark)
  const totalW = (grid[0]?.length ?? 0) * cellSize;
  const totalH = grid.length * cellSize;
  const bgGrad = ctx.createLinearGradient(0, 0, 0, totalH);
  bgGrad.addColorStop(0, 'rgba(255,255,240,0.06)');
  bgGrad.addColorStop(0.5, 'rgba(0,0,0,0)');
  bgGrad.addColorStop(1, 'rgba(0,0,30,0.1)');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, totalW, totalH);

  // ── Ambient floating particles (pollen/dust) ──────────
  const particleCount = 15;
  for (let i = 0; i < particleCount; i++) {
    const seed = i * 137.5;
    const px = ((seed * 17.3 + t * (8 + i * 0.5)) % totalW + totalW) % totalW;
    const py = ((seed * 23.7 + t * (3 + i * 0.3)) % totalH + totalH) % totalH;
    const pAlpha = 0.15 + Math.sin(t * 1.5 + i * 0.7) * 0.1;
    const pSize = 1.2 + Math.sin(t * 2 + i) * 0.4;
    ctx.fillStyle = `rgba(255,255,200,${pAlpha})`;
    ctx.beginPath();
    ctx.arc(px, py, pSize, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Path Drawing (3D Road) ──────────────────────────────────

export function drawPath(
  ctx: CanvasRenderingContext2D,
  path: [number, number][],
  cellSize: number
): void {
  if (path.length < 2) return;

  ctx.save();

  const start = getCellCenter(path[0][0], path[0][1], cellSize);
  const t = getTime();

  // Outer dark border (thicker for depth)
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  for (let i = 1; i < path.length; i++) {
    const p = getCellCenter(path[i][0], path[i][1], cellSize);
    ctx.lineTo(p.x, p.y);
  }
  ctx.strokeStyle = 'rgba(30,20,5,0.7)';
  ctx.lineWidth = cellSize * 0.78;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Mid border
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  for (let i = 1; i < path.length; i++) {
    const p = getCellCenter(path[i][0], path[i][1], cellSize);
    ctx.lineTo(p.x, p.y);
  }
  ctx.strokeStyle = 'rgba(50,35,15,0.6)';
  ctx.lineWidth = cellSize * 0.7;
  ctx.stroke();

  // Road surface
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  for (let i = 1; i < path.length; i++) {
    const p = getCellCenter(path[i][0], path[i][1], cellSize);
    ctx.lineTo(p.x, p.y);
  }
  ctx.strokeStyle = '#a08860';
  ctx.lineWidth = cellSize * 0.55;
  ctx.stroke();

  // Road highlight (upper half)
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  for (let i = 1; i < path.length; i++) {
    const p = getCellCenter(path[i][0], path[i][1], cellSize);
    ctx.lineTo(p.x, p.y);
  }
  ctx.strokeStyle = 'rgba(200,180,140,0.3)';
  ctx.lineWidth = cellSize * 0.3;
  ctx.stroke();

  // Cobblestone tile pattern (two rows of dashes offset)
  ctx.lineCap = 'butt';
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  for (let i = 1; i < path.length; i++) {
    const p = getCellCenter(path[i][0], path[i][1], cellSize);
    ctx.lineTo(p.x, p.y);
  }
  ctx.setLineDash([cellSize * 0.18, cellSize * 0.08]);
  ctx.strokeStyle = 'rgba(180,160,120,0.3)';
  ctx.lineWidth = cellSize * 0.12;
  ctx.stroke();

  // Second row offset
  ctx.setLineDash([cellSize * 0.08, cellSize * 0.18]);
  ctx.lineDashOffset = cellSize * 0.13;
  ctx.strokeStyle = 'rgba(160,140,100,0.2)';
  ctx.lineWidth = cellSize * 0.06;
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineDashOffset = 0;
  ctx.lineCap = 'round';

  // Direction arrows along the path (subtle animated flow)
  const arrowSpacing = cellSize * 3;
  const arrowOffset = (t * 20) % arrowSpacing;
  ctx.fillStyle = 'rgba(255,255,200,0.08)';
  for (let i = 0; i < path.length - 1; i++) {
    const p0 = getCellCenter(path[i][0], path[i][1], cellSize);
    const p1 = getCellCenter(path[i + 1][0], path[i + 1][1], cellSize);
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const segLen = Math.sqrt(dx * dx + dy * dy);
    if (segLen < 1) continue;
    const nx = dx / segLen;
    const ny = dy / segLen;
    let d = -arrowOffset;
    while (d < segLen) {
      if (d > 0) {
        const ax = p0.x + nx * d;
        const ay = p0.y + ny * d;
        const as = cellSize * 0.12;
        ctx.beginPath();
        ctx.moveTo(ax + nx * as, ay + ny * as);
        ctx.lineTo(ax - nx * as * 0.5 + ny * as * 0.5, ay - ny * as * 0.5 - nx * as * 0.5);
        ctx.lineTo(ax - nx * as * 0.5 - ny * as * 0.5, ay - ny * as * 0.5 + nx * as * 0.5);
        ctx.closePath();
        ctx.fill();
      }
      d += arrowSpacing;
    }
  }

  // Start portal (green arrow)
  const sr = cellSize * 0.28;
  const sg = ctx.createRadialGradient(start.x, start.y, 0, start.x, start.y, sr * 2.2);
  sg.addColorStop(0, 'rgba(68,255,68,0.4)');
  sg.addColorStop(0.6, 'rgba(68,255,68,0.1)');
  sg.addColorStop(1, 'rgba(68,255,68,0)');
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.arc(start.x, start.y, sr * 2.2, 0, Math.PI * 2);
  ctx.fill();

  const sg2 = ctx.createRadialGradient(start.x - sr * 0.3, start.y - sr * 0.3, 0, start.x, start.y, sr);
  sg2.addColorStop(0, '#88ff88');
  sg2.addColorStop(0.7, '#44cc44');
  sg2.addColorStop(1, '#228822');
  ctx.fillStyle = sg2;
  ctx.beginPath();
  ctx.arc(start.x, start.y, sr, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#116611';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Pulsing ring
  const pulseR = sr * (1.2 + Math.sin(t * 3) * 0.2);
  ctx.strokeStyle = `rgba(68,255,68,${0.2 + Math.sin(t * 3) * 0.1})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(start.x, start.y, pulseR, 0, Math.PI * 2);
  ctx.stroke();

  // Arrow icon
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.round(sr * 0.85)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('\u25B6', start.x + 1, start.y);

  // "START" label (subtle)
  ctx.fillStyle = 'rgba(68,255,68,0.4)';
  ctx.font = `bold ${Math.round(sr * 0.35)}px sans-serif`;
  ctx.fillText('START', start.x, start.y + sr + 6);

  // End portal (red X marker)
  const end = getCellCenter(path[path.length - 1][0], path[path.length - 1][1], cellSize);
  const er = cellSize * 0.28;
  const eg = ctx.createRadialGradient(end.x, end.y, 0, end.x, end.y, er * 2.2);
  eg.addColorStop(0, 'rgba(255,68,68,0.4)');
  eg.addColorStop(0.6, 'rgba(255,68,68,0.1)');
  eg.addColorStop(1, 'rgba(255,68,68,0)');
  ctx.fillStyle = eg;
  ctx.beginPath();
  ctx.arc(end.x, end.y, er * 2.2, 0, Math.PI * 2);
  ctx.fill();

  const eg2 = ctx.createRadialGradient(end.x - er * 0.3, end.y - er * 0.3, 0, end.x, end.y, er);
  eg2.addColorStop(0, '#ff8888');
  eg2.addColorStop(0.7, '#cc4444');
  eg2.addColorStop(1, '#882222');
  ctx.fillStyle = eg2;
  ctx.beginPath();
  ctx.arc(end.x, end.y, er, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#661111';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Pulsing ring
  const ePulseR = er * (1.2 + Math.sin(t * 3 + 1) * 0.2);
  ctx.strokeStyle = `rgba(255,68,68,${0.2 + Math.sin(t * 3 + 1) * 0.1})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(end.x, end.y, ePulseR, 0, Math.PI * 2);
  ctx.stroke();

  // X marker
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  const xS = er * 0.4;
  ctx.beginPath();
  ctx.moveTo(end.x - xS, end.y - xS);
  ctx.lineTo(end.x + xS, end.y + xS);
  ctx.moveTo(end.x + xS, end.y - xS);
  ctx.lineTo(end.x - xS, end.y + xS);
  ctx.stroke();

  // "END" label
  ctx.fillStyle = 'rgba(255,68,68,0.7)';
  ctx.font = `bold ${Math.round(er * 0.4)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('END', end.x, end.y + er + 8);

  ctx.restore();
}

// ── Tower Drawing (3D Structures) ───────────────────────────

export function drawTower(
  ctx: CanvasRenderingContext2D,
  tower: Tower,
  cellSize: number,
  isSelected: boolean,
  recoil: number = 0
): void {
  const rawCenter = getCellCenter(tower.position.row, tower.position.col, cellSize);
  // Apply recoil: bounce up on attack, scale pulse
  const recoilOffset = recoil * recoil * 4; // ease-out bounce
  const recoilScale = 1 + recoil * 0.08; // slight scale-up on fire
  const center = { x: rawCenter.x, y: rawCenter.y - recoilOffset };
  const pal = TOWER_PALETTE[tower.type] ?? TOWER_PALETTE.ARCHER;
  const size = cellSize * 0.42 * recoilScale;

  ctx.save();

  // Grade glow
  if (tower.grade >= 2) {
    ctx.shadowColor = GRADE_GLOW[tower.grade];
    ctx.shadowBlur = 8 + tower.grade * 5;
  }

  // Range circle when selected
  if (isSelected) {
    ctx.beginPath();
    ctx.arc(center.x, center.y, tower.stats.range * cellSize, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Reset shadow for drawing
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  // Draw tower by type
  switch (tower.type) {
    case 'ARCHER': drawArcherTower(ctx, center.x, center.y, size, pal); break;
    case 'MAGIC': drawMagicTower(ctx, center.x, center.y, size, pal); break;
    case 'CANNON': drawCannonTower(ctx, center.x, center.y, size, pal); break;
    case 'ICE': drawIceTower(ctx, center.x, center.y, size, pal); break;
    case 'LIGHTNING': drawLightningTower(ctx, center.x, center.y, size, pal); break;
    case 'POISON': drawPoisonTower(ctx, center.x, center.y, size, pal); break;
    case 'HEALER': drawHealerTower(ctx, center.x, center.y, size, pal); break;
    case 'BARRICADE': drawBarricadeTower(ctx, center.x, center.y, size, pal); break;
    case 'GOLDMINE': drawGoldmineTower(ctx, center.x, center.y, size, pal); break;
    case 'SNIPER': drawSniperTower(ctx, center.x, center.y, size, pal); break;
    case 'FLAME': drawFlameTower(ctx, center.x, center.y, size, pal); break;
    case 'WORD': drawWordTower(ctx, center.x, center.y, size, pal); break;
    case 'METEOR': drawMeteorTower(ctx, center.x, center.y, size, pal); break;
    case 'VOID': drawVoidTower(ctx, center.x, center.y, size, pal); break;
    case 'PHOENIX': drawPhoenixTower(ctx, center.x, center.y, size, pal); break;
    case 'CHRONO': drawChronoTower(ctx, center.x, center.y, size, pal); break;
    case 'DIVINE': drawDivineTower(ctx, center.x, center.y, size, pal); break;
  }

  // Grade stars
  if (tower.grade >= 1) {
    drawGradeStars(ctx, center.x, center.y - size - 10, tower.grade);
  }

  // Level label
  if (tower.level > 1) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    const tw = ctx.measureText(`Lv${tower.level}`).width + 6;
    ctx.fillRect(center.x - tw / 2, center.y + size + 4, tw, 12);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Lv${tower.level}`, center.x, center.y + size + 10);
  }

  ctx.restore();
}

// ── Individual Tower Renderers ──────────────────────────────

type Pal = { base: string; body: string; top: string; glow: string; accent: string };

function drawTowerBase(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string): void {
  // Ground shadow (ambient occlusion)
  const shadowGrad = ctx.createRadialGradient(x, y + r * 0.3, r * 0.3, x, y + r * 0.3, r * 1.3);
  shadowGrad.addColorStop(0, 'rgba(0,0,0,0.25)');
  shadowGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = shadowGrad;
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.3, r * 1.2, r * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();

  // 3D platform depth (side face)
  const d = r * 0.25;
  const sideGrad = ctx.createLinearGradient(x - r, y, x + r, y + d);
  sideGrad.addColorStop(0, 'rgba(0,0,0,0.25)');
  sideGrad.addColorStop(0.5, color);
  sideGrad.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = sideGrad;
  ctx.beginPath();
  ctx.ellipse(x, y + d, r, r * 0.35, 0, 0, Math.PI);
  ctx.fill();

  // Top ellipse - stone/metal platform
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();

  // Top highlight (specular)
  const topGrad = ctx.createRadialGradient(x - r * 0.25, y - r * 0.08, 0, x, y, r);
  topGrad.addColorStop(0, 'rgba(255,255,255,0.25)');
  topGrad.addColorStop(0.4, 'rgba(255,255,255,0.08)');
  topGrad.addColorStop(1, 'rgba(0,0,0,0.15)');
  ctx.fillStyle = topGrad;
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();

  // Rim highlight
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(x, y, r * 0.98, r * 0.34, 0, Math.PI * 1.1, Math.PI * 1.9);
  ctx.stroke();
}

function drawArcherTower(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, p: Pal): void {
  drawTowerBase(ctx, x, y + s * 0.4, s * 0.9, p.base);

  // Stone tower body (trapezoid with brick texture feel)
  const bodyGrad = ctx.createLinearGradient(x - s * 0.5, y, x + s * 0.5, y);
  bodyGrad.addColorStop(0, p.accent);
  bodyGrad.addColorStop(0.3, p.body);
  bodyGrad.addColorStop(0.5, p.top);
  bodyGrad.addColorStop(0.7, p.body);
  bodyGrad.addColorStop(1, p.accent);
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.45, y + s * 0.3);
  ctx.lineTo(x - s * 0.3, y - s * 0.6);
  ctx.lineTo(x + s * 0.3, y - s * 0.6);
  ctx.lineTo(x + s * 0.45, y + s * 0.3);
  ctx.closePath();
  ctx.fill();

  // Stone mortar lines (subtle horizontal)
  ctx.strokeStyle = 'rgba(0,0,0,0.1)';
  ctx.lineWidth = 0.5;
  for (let i = 0; i < 4; i++) {
    const ly = y + s * 0.2 - i * s * 0.2;
    const lw = s * (0.4 - i * 0.03);
    ctx.beginPath();
    ctx.moveTo(x - lw, ly);
    ctx.lineTo(x + lw, ly);
    ctx.stroke();
  }

  // Light side highlight
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.moveTo(x - s * 0.45, y + s * 0.3);
  ctx.lineTo(x - s * 0.3, y - s * 0.6);
  ctx.lineTo(x - s * 0.05, y - s * 0.6);
  ctx.lineTo(x - s * 0.15, y + s * 0.3);
  ctx.closePath();
  ctx.fill();

  // Battlements at top
  const bw = s * 0.12;
  const bh = s * 0.1;
  for (let i = -1; i <= 1; i += 2) {
    ctx.fillStyle = p.body;
    ctx.fillRect(x + i * s * 0.22 - bw / 2, y - s * 0.7, bw, bh);
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.fillRect(x + i * s * 0.22 - bw / 2, y - s * 0.7 + bh * 0.7, bw, bh * 0.3);
  }

  // Roof (pointed, with wood texture gradient)
  const roofGrad = ctx.createLinearGradient(x - s * 0.2, y - s * 1.2, x + s * 0.2, y - s * 0.5);
  roofGrad.addColorStop(0, '#a05a20');
  roofGrad.addColorStop(0.3, '#8b4513');
  roofGrad.addColorStop(0.5, '#7a3a10');
  roofGrad.addColorStop(1, '#5a2a0a');
  ctx.fillStyle = roofGrad;
  ctx.beginPath();
  ctx.moveTo(x, y - s * 1.25);
  ctx.lineTo(x - s * 0.48, y - s * 0.55);
  ctx.lineTo(x + s * 0.48, y - s * 0.55);
  ctx.closePath();
  ctx.fill();

  // Left side highlight on roof
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath();
  ctx.moveTo(x - s * 0.03, y - s * 1.2);
  ctx.lineTo(x - s * 0.42, y - s * 0.55);
  ctx.lineTo(x - s * 0.05, y - s * 0.55);
  ctx.closePath();
  ctx.fill();

  // Roof edge outline
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(x, y - s * 1.25);
  ctx.lineTo(x + s * 0.48, y - s * 0.55);
  ctx.stroke();

  // Arrow slit (cross-shaped)
  ctx.fillStyle = '#1a1a10';
  ctx.fillRect(x - s * 0.02, y - s * 0.35, s * 0.04, s * 0.25);
  ctx.fillRect(x - s * 0.08, y - s * 0.25, s * 0.16, s * 0.04);

  // Window glow from arrow slit
  ctx.fillStyle = 'rgba(255,230,170,0.3)';
  ctx.fillRect(x - s * 0.05, y - s * 0.32, s * 0.1, s * 0.19);

  // Flag on top
  const t = getTime();
  const flagWave = Math.sin(t * 3) * s * 0.03;
  ctx.fillStyle = '#cc2222';
  ctx.beginPath();
  ctx.moveTo(x, y - s * 1.25);
  ctx.lineTo(x + s * 0.2 + flagWave, y - s * 1.35);
  ctx.lineTo(x + s * 0.18, y - s * 1.25);
  ctx.closePath();
  ctx.fill();
  // Flag pole
  ctx.strokeStyle = '#8a8a8a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y - s * 1.25);
  ctx.lineTo(x, y - s * 1.4);
  ctx.stroke();
}

function drawMagicTower(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, p: Pal): void {
  drawTowerBase(ctx, x, y + s * 0.4, s * 0.8, p.base);
  const t = getTime();

  // Magical aura glow (ground)
  const auraGrad = ctx.createRadialGradient(x, y + s * 0.1, 0, x, y + s * 0.1, s * 0.9);
  const auraPulse = 0.5 + Math.sin(t * 2) * 0.2;
  auraGrad.addColorStop(0, `rgba(150,80,255,${0.08 * auraPulse})`);
  auraGrad.addColorStop(1, 'rgba(100,0,200,0)');
  ctx.fillStyle = auraGrad;
  ctx.beginPath();
  ctx.arc(x, y + s * 0.1, s * 0.9, 0, Math.PI * 2);
  ctx.fill();

  // Crystal spire body (faceted, multi-face)
  // Left face (darker)
  const leftGrad = ctx.createLinearGradient(x - s * 0.35, y, x, y);
  leftGrad.addColorStop(0, p.accent);
  leftGrad.addColorStop(1, p.body);
  ctx.fillStyle = leftGrad;
  ctx.beginPath();
  ctx.moveTo(x, y - s * 1.35);
  ctx.lineTo(x - s * 0.35, y + s * 0.3);
  ctx.lineTo(x, y + s * 0.15);
  ctx.closePath();
  ctx.fill();
  // Right face (lighter)
  const rightGrad = ctx.createLinearGradient(x, y, x + s * 0.35, y);
  rightGrad.addColorStop(0, p.body);
  rightGrad.addColorStop(1, p.top);
  ctx.fillStyle = rightGrad;
  ctx.beginPath();
  ctx.moveTo(x, y - s * 1.35);
  ctx.lineTo(x + s * 0.35, y + s * 0.3);
  ctx.lineTo(x, y + s * 0.15);
  ctx.closePath();
  ctx.fill();

  // Edge highlight line
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(x, y - s * 1.35);
  ctx.lineTo(x, y + s * 0.15);
  ctx.stroke();

  // Specular facet highlight
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.beginPath();
  ctx.moveTo(x - s * 0.03, y - s * 1.2);
  ctx.lineTo(x - s * 0.2, y + s * 0.1);
  ctx.lineTo(x + s * 0.05, y + s * 0.05);
  ctx.closePath();
  ctx.fill();

  // Rune ring (rotating magical circle at mid-height)
  const runeY = y - s * 0.15;
  ctx.strokeStyle = `rgba(180,120,255,${0.4 + Math.sin(t * 2.5) * 0.15})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(x, runeY, s * 0.35, s * 0.1, t * 0.5, 0, Math.PI * 2);
  ctx.stroke();
  // Rune dots on ring
  for (let i = 0; i < 4; i++) {
    const ra = t * 0.5 + (Math.PI * 2 * i) / 4;
    const rx = x + Math.cos(ra) * s * 0.35;
    const ry = runeY + Math.sin(ra) * s * 0.1;
    ctx.fillStyle = `rgba(220,180,255,${0.5 + Math.sin(t * 3 + i) * 0.3})`;
    ctx.beginPath();
    ctx.arc(rx, ry, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Floating energy orb (bigger, more detail)
  const orbY = y - s * 0.55 + Math.sin(t * 3) * s * 0.08;
  const orbR = s * 0.22;
  // Outer glow
  const orbGlow = ctx.createRadialGradient(x, orbY, orbR * 0.5, x, orbY, orbR * 2);
  orbGlow.addColorStop(0, `rgba(180,100,255,${0.2 + Math.sin(t * 4) * 0.1})`);
  orbGlow.addColorStop(1, 'rgba(120,50,200,0)');
  ctx.fillStyle = orbGlow;
  ctx.beginPath();
  ctx.arc(x, orbY, orbR * 2, 0, Math.PI * 2);
  ctx.fill();
  // Orb body
  const orbGrad = ctx.createRadialGradient(x - orbR * 0.3, orbY - orbR * 0.3, 0, x, orbY, orbR);
  orbGrad.addColorStop(0, '#ffffff');
  orbGrad.addColorStop(0.3, '#ddaaff');
  orbGrad.addColorStop(0.6, p.top);
  orbGrad.addColorStop(1, p.glow);
  ctx.fillStyle = orbGrad;
  ctx.beginPath();
  ctx.arc(x, orbY, orbR, 0, Math.PI * 2);
  ctx.fill();
  // Orb specular
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath();
  ctx.ellipse(x - orbR * 0.25, orbY - orbR * 0.3, orbR * 0.35, orbR * 0.2, -0.4, 0, Math.PI * 2);
  ctx.fill();

  // Orbiting sparkles
  for (let i = 0; i < 5; i++) {
    const angle = t * 2 + i * 1.26;
    const dist = s * 0.5 + Math.sin(t * 3 + i) * s * 0.1;
    const px = x + Math.cos(angle) * dist * 0.5;
    const py = y - s * 0.3 + Math.sin(angle) * dist * 0.3;
    const sparkAlpha = Math.sin(t * 5 + i * 1.5) * 0.3 + 0.4;
    ctx.fillStyle = `rgba(220,170,255,${sparkAlpha})`;
    ctx.beginPath();
    ctx.arc(px, py, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCannonTower(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, p: Pal): void {
  drawTowerBase(ctx, x, y + s * 0.4, s * 1, p.base);

  // Heavy turret body (metallic sphere)
  const bGrad = ctx.createRadialGradient(x - s * 0.15, y - s * 0.2, 0, x, y - s * 0.1, s * 0.55);
  bGrad.addColorStop(0, '#bbbbbb');
  bGrad.addColorStop(0.3, p.top);
  bGrad.addColorStop(0.6, p.body);
  bGrad.addColorStop(1, p.accent);
  ctx.fillStyle = bGrad;
  ctx.beginPath();
  ctx.arc(x, y - s * 0.1, s * 0.5, 0, Math.PI * 2);
  ctx.fill();

  // Metal rim with highlight
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(x, y - s * 0.1, s * 0.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x, y - s * 0.1, s * 0.48, Math.PI * 1.1, Math.PI * 1.8);
  ctx.stroke();

  // Specular on turret
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath();
  ctx.ellipse(x - s * 0.12, y - s * 0.25, s * 0.18, s * 0.1, -0.4, 0, Math.PI * 2);
  ctx.fill();

  // Barrel (thicker, 3D cylinder feel)
  const barGrad = ctx.createLinearGradient(x - s * 0.14, y, x + s * 0.14, y);
  barGrad.addColorStop(0, '#555555');
  barGrad.addColorStop(0.2, '#888888');
  barGrad.addColorStop(0.5, '#aaaaaa');
  barGrad.addColorStop(0.8, '#777777');
  barGrad.addColorStop(1, '#444444');
  ctx.fillStyle = barGrad;
  ctx.fillRect(x - s * 0.14, y - s * 1.05, s * 0.28, s * 0.75);

  // Barrel bands (metal rings)
  ctx.strokeStyle = '#666666';
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    const by = y - s * 0.4 - i * s * 0.25;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.15, by);
    ctx.lineTo(x + s * 0.15, by);
    ctx.stroke();
  }

  // Barrel mouth (dark bore with orange glow hint)
  ctx.fillStyle = '#111111';
  ctx.beginPath();
  ctx.arc(x, y - s * 1.05, s * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,100,30,0.15)';
  ctx.beginPath();
  ctx.arc(x, y - s * 1.05, s * 0.09, 0, Math.PI * 2);
  ctx.fill();

  // Muzzle rim
  ctx.strokeStyle = '#777777';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y - s * 1.05, s * 0.13, 0, Math.PI * 2);
  ctx.stroke();

  // Rivet details (bigger, 3D)
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI * 2 * i) / 6 + 0.3;
    const rx = x + Math.cos(angle) * s * 0.38;
    const ry = y - s * 0.1 + Math.sin(angle) * s * 0.38;
    const rGrad = ctx.createRadialGradient(rx - 0.5, ry - 0.5, 0, rx, ry, 2);
    rGrad.addColorStop(0, '#cccccc');
    rGrad.addColorStop(1, '#666666');
    ctx.fillStyle = rGrad;
    ctx.beginPath();
    ctx.arc(rx, ry, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawIceTower(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, p: Pal): void {
  drawTowerBase(ctx, x, y + s * 0.4, s * 0.85, p.base);
  const t = getTime();

  // Crystal structure (hexagonal)
  const grad = ctx.createLinearGradient(x, y + s * 0.3, x, y - s);
  grad.addColorStop(0, p.accent);
  grad.addColorStop(0.5, p.body);
  grad.addColorStop(1, p.top);
  ctx.fillStyle = grad;

  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const r = i % 2 === 0 ? s * 0.6 : s * 0.45;
    const px = x + r * Math.cos(angle);
    const py = (y - s * 0.2) + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  // Translucent highlight
  ctx.fillStyle = 'rgba(200,240,255,0.25)';
  ctx.beginPath();
  ctx.moveTo(x - s * 0.1, y - s * 0.7);
  ctx.lineTo(x - s * 0.35, y);
  ctx.lineTo(x + s * 0.1, y + s * 0.1);
  ctx.closePath();
  ctx.fill();

  // Crystal cross lines
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const angle = (Math.PI / 3) * i;
    ctx.beginPath();
    ctx.moveTo(x + s * 0.35 * Math.cos(angle), (y - s * 0.2) + s * 0.35 * Math.sin(angle));
    ctx.lineTo(x - s * 0.35 * Math.cos(angle), (y - s * 0.2) - s * 0.35 * Math.sin(angle));
    ctx.stroke();
  }

  // Frost particles
  const frostAlpha = Math.sin(t * 2) * 0.15 + 0.2;
  ctx.fillStyle = `rgba(150,230,255,${frostAlpha})`;
  ctx.beginPath();
  ctx.arc(x, y - s * 0.2, s * 0.7, 0, Math.PI * 2);
  ctx.fill();
}

function drawLightningTower(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, p: Pal): void {
  drawTowerBase(ctx, x, y + s * 0.4, s * 0.8, p.base);
  const t = getTime();

  // Tesla coil body
  const grad = ctx.createLinearGradient(x, y + s * 0.3, x, y - s * 0.8);
  grad.addColorStop(0, p.accent);
  grad.addColorStop(0.5, p.body);
  grad.addColorStop(1, p.top);
  ctx.fillStyle = grad;
  ctx.fillRect(x - s * 0.15, y - s * 0.8, s * 0.3, s * 1.1);

  // Coil rings
  ctx.strokeStyle = p.top;
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    const ry = y - s * 0.2 - i * s * 0.25;
    ctx.beginPath();
    ctx.ellipse(x, ry, s * 0.25 + i * s * 0.05, s * 0.08, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Spark ball on top
  const sparkR = s * 0.2;
  const sparkGrad = ctx.createRadialGradient(x, y - s * 0.9, 0, x, y - s * 0.9, sparkR);
  sparkGrad.addColorStop(0, '#ffffff');
  sparkGrad.addColorStop(0.3, p.top);
  sparkGrad.addColorStop(1, p.glow);
  ctx.fillStyle = sparkGrad;
  ctx.beginPath();
  ctx.arc(x, y - s * 0.9, sparkR, 0, Math.PI * 2);
  ctx.fill();

  // Lightning arcs
  const arcAlpha = Math.sin(t * 10) * 0.3 + 0.5;
  ctx.strokeStyle = `rgba(255,255,100,${arcAlpha})`;
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 2; i++) {
    const angle = t * 5 + i * 3;
    ctx.beginPath();
    ctx.moveTo(x, y - s * 0.9);
    const cx = x + Math.cos(angle) * s * 0.3;
    const cy = y - s * 0.5 + Math.sin(angle) * s * 0.2;
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle + 1) * s * 0.15, cy + s * 0.15);
    ctx.stroke();
  }
}

function drawPoisonTower(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, p: Pal): void {
  drawTowerBase(ctx, x, y + s * 0.4, s * 0.9, p.base);
  const t = getTime();

  // Cauldron body
  const grad = ctx.createRadialGradient(x - s * 0.15, y - s * 0.1, 0, x, y, s * 0.5);
  grad.addColorStop(0, p.top);
  grad.addColorStop(0.7, p.body);
  grad.addColorStop(1, p.accent);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, s * 0.5, 0, Math.PI, false);
  ctx.bezierCurveTo(x - s * 0.5, y + s * 0.3, x + s * 0.5, y + s * 0.3, x + s * 0.5, y);
  ctx.fill();

  // Cauldron rim
  ctx.fillStyle = p.accent;
  ctx.beginPath();
  ctx.ellipse(x, y, s * 0.52, s * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Poison liquid surface
  const liquidGrad = ctx.createRadialGradient(x, y, 0, x, y, s * 0.4);
  liquidGrad.addColorStop(0, '#aaff88');
  liquidGrad.addColorStop(1, '#44aa22');
  ctx.fillStyle = liquidGrad;
  ctx.beginPath();
  ctx.ellipse(x, y - s * 0.05, s * 0.4, s * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();

  // Bubbles
  for (let i = 0; i < 3; i++) {
    const bx = x + Math.sin(t * 2 + i * 2) * s * 0.2;
    const by = y - s * 0.1 - ((t * 0.5 + i * 0.3) % 0.5) * s * 0.6;
    const br = s * 0.06 + Math.sin(t + i) * s * 0.02;
    const ba = 0.6 - ((t * 0.5 + i * 0.3) % 0.5);
    if (ba > 0) {
      ctx.fillStyle = `rgba(100,255,100,${ba})`;
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawHealerTower(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, p: Pal): void {
  drawTowerBase(ctx, x, y + s * 0.4, s * 0.85, p.base);
  const t = getTime();

  // Shrine body
  const grad = ctx.createLinearGradient(x - s * 0.3, y, x + s * 0.3, y);
  grad.addColorStop(0, p.top);
  grad.addColorStop(0.5, p.body);
  grad.addColorStop(1, p.accent);
  ctx.fillStyle = grad;
  ctx.fillRect(x - s * 0.3, y - s * 0.5, s * 0.6, s * 0.8);

  // Cross
  ctx.fillStyle = '#ffffff';
  const arm = s * 0.08;
  ctx.fillRect(x - arm, y - s * 0.4, arm * 2, s * 0.5);
  ctx.fillRect(x - s * 0.15, y - s * 0.25, s * 0.3, arm * 2);

  // Healing aura
  const auraAlpha = Math.sin(t * 2) * 0.1 + 0.15;
  const auraGrad = ctx.createRadialGradient(x, y, 0, x, y, s * 0.8);
  auraGrad.addColorStop(0, `rgba(100,255,150,${auraAlpha})`);
  auraGrad.addColorStop(1, 'rgba(100,255,150,0)');
  ctx.fillStyle = auraGrad;
  ctx.beginPath();
  ctx.arc(x, y, s * 0.8, 0, Math.PI * 2);
  ctx.fill();
}

function drawBarricadeTower(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, p: Pal): void {
  // Wooden wall - 3D box
  draw3DRect(ctx, x - s * 0.7, y - s * 0.4, s * 1.4, s * 0.8, p.top, p.body, p.accent);

  // Planks
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.7, y);
  ctx.lineTo(x + s * 0.7, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y - s * 0.4);
  ctx.lineTo(x, y + s * 0.4);
  ctx.stroke();

  // Nails
  ctx.fillStyle = '#888888';
  const nails = [[-0.35, -0.2], [0.35, -0.2], [-0.35, 0.2], [0.35, 0.2]];
  for (const [nx, ny] of nails) {
    ctx.beginPath();
    ctx.arc(x + nx * s, y + ny * s, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGoldmineTower(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, p: Pal): void {
  drawTowerBase(ctx, x, y + s * 0.3, s * 0.9, p.base);
  const t = getTime();

  // Mine entrance
  ctx.fillStyle = '#3a2a1a';
  ctx.beginPath();
  ctx.arc(x, y - s * 0.1, s * 0.4, Math.PI, 0);
  ctx.lineTo(x + s * 0.4, y + s * 0.2);
  ctx.lineTo(x - s * 0.4, y + s * 0.2);
  ctx.closePath();
  ctx.fill();

  // Gold pile
  const goldGrad = ctx.createRadialGradient(x, y + s * 0.05, 0, x, y, s * 0.35);
  goldGrad.addColorStop(0, '#ffee88');
  goldGrad.addColorStop(0.5, '#ffd700');
  goldGrad.addColorStop(1, '#cc9900');
  ctx.fillStyle = goldGrad;
  ctx.beginPath();
  ctx.ellipse(x, y + s * 0.1, s * 0.3, s * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Gold sparkle
  const sparkle = Math.sin(t * 4) * 0.3 + 0.5;
  ctx.fillStyle = `rgba(255,255,200,${sparkle})`;
  ctx.beginPath();
  ctx.arc(x - s * 0.1, y, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + s * 0.15, y + s * 0.05, 1.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawSniperTower(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, p: Pal): void {
  drawTowerBase(ctx, x, y + s * 0.4, s * 0.7, p.base);

  // Tall tower body
  const grad = ctx.createLinearGradient(x - s * 0.2, y, x + s * 0.2, y);
  grad.addColorStop(0, p.top);
  grad.addColorStop(0.5, p.body);
  grad.addColorStop(1, p.accent);
  ctx.fillStyle = grad;
  ctx.fillRect(x - s * 0.18, y - s * 1.1, s * 0.36, s * 1.4);

  // Scope platform
  ctx.fillStyle = p.body;
  ctx.fillRect(x - s * 0.35, y - s * 1.15, s * 0.7, s * 0.12);

  // Scope
  ctx.strokeStyle = '#ff3333';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y - s * 0.7, s * 0.15, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - s * 0.2, y - s * 0.7);
  ctx.lineTo(x + s * 0.2, y - s * 0.7);
  ctx.moveTo(x, y - s * 0.9);
  ctx.lineTo(x, y - s * 0.5);
  ctx.stroke();

  // Window slit
  ctx.fillStyle = '#1a2a1a';
  ctx.fillRect(x - s * 0.08, y - s * 0.5, s * 0.16, s * 0.06);
}

function drawFlameTower(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, p: Pal): void {
  drawTowerBase(ctx, x, y + s * 0.4, s * 0.9, p.base);
  const t = getTime();

  // Brazier bowl
  const bowlGrad = ctx.createLinearGradient(x - s * 0.4, y, x + s * 0.4, y);
  bowlGrad.addColorStop(0, '#666666');
  bowlGrad.addColorStop(0.5, '#888888');
  bowlGrad.addColorStop(1, '#444444');
  ctx.fillStyle = bowlGrad;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.45, y - s * 0.1);
  ctx.lineTo(x - s * 0.3, y + s * 0.3);
  ctx.lineTo(x + s * 0.3, y + s * 0.3);
  ctx.lineTo(x + s * 0.45, y - s * 0.1);
  ctx.closePath();
  ctx.fill();

  // Fire (animated)
  const fireH = s * 0.8 + Math.sin(t * 8) * s * 0.1;
  const fireGrad = ctx.createRadialGradient(x, y - s * 0.1, s * 0.05, x, y - fireH * 0.4, s * 0.4);
  fireGrad.addColorStop(0, '#ffffff');
  fireGrad.addColorStop(0.2, '#ffff66');
  fireGrad.addColorStop(0.5, '#ff6633');
  fireGrad.addColorStop(1, 'rgba(200,30,0,0)');
  ctx.fillStyle = fireGrad;

  ctx.beginPath();
  ctx.moveTo(x, y - fireH);
  ctx.bezierCurveTo(x + s * 0.25, y - fireH * 0.7, x + s * 0.45, y - s * 0.2, x + s * 0.3, y);
  ctx.bezierCurveTo(x + s * 0.15, y + s * 0.1, x - s * 0.15, y + s * 0.1, x - s * 0.3, y);
  ctx.bezierCurveTo(x - s * 0.45, y - s * 0.2, x - s * 0.25, y - fireH * 0.7, x, y - fireH);
  ctx.fill();

  // Fire glow
  const glowR = s * 0.6;
  const glow = ctx.createRadialGradient(x, y - s * 0.2, 0, x, y - s * 0.2, glowR);
  glow.addColorStop(0, 'rgba(255,150,50,0.2)');
  glow.addColorStop(1, 'rgba(255,100,0,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y - s * 0.2, glowR, 0, Math.PI * 2);
  ctx.fill();
}

function drawWordTower(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, p: Pal): void {
  drawTowerBase(ctx, x, y + s * 0.4, s * 0.85, p.base);
  const t = getTime();

  // Rainbow ring
  const segments = 12;
  for (let i = 0; i < segments; i++) {
    const startAngle = (Math.PI * 2 * i) / segments;
    const endAngle = (Math.PI * 2 * (i + 1)) / segments;
    const hue = ((360 * i) / segments + t * 30) % 360;
    ctx.fillStyle = `hsl(${hue}, 75%, 55%)`;
    ctx.beginPath();
    ctx.moveTo(x, y - s * 0.1);
    ctx.arc(x, y - s * 0.1, s * 0.55, startAngle, endAngle);
    ctx.closePath();
    ctx.fill();
  }

  // White inner with gradient
  const innerGrad = ctx.createRadialGradient(x - s * 0.1, y - s * 0.2, 0, x, y - s * 0.1, s * 0.35);
  innerGrad.addColorStop(0, '#ffffff');
  innerGrad.addColorStop(1, '#eeddff');
  ctx.fillStyle = innerGrad;
  ctx.beginPath();
  ctx.arc(x, y - s * 0.1, s * 0.35, 0, Math.PI * 2);
  ctx.fill();

  // "W" letter
  ctx.fillStyle = '#7722bb';
  ctx.font = `bold ${Math.round(s * 0.5)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('W', x, y - s * 0.08);

  // Orbiting particles
  for (let i = 0; i < 4; i++) {
    const angle = t * 2 + (Math.PI * 2 * i) / 4;
    const px = x + Math.cos(angle) * s * 0.65;
    const py = y - s * 0.1 + Math.sin(angle) * s * 0.35;
    const hue = ((90 * i) + t * 60) % 360;
    ctx.fillStyle = `hsla(${hue}, 80%, 65%, 0.7)`;
    ctx.beginPath();
    ctx.arc(px, py, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Legendary Tower Renderers ───────────────────────────────

function drawMeteorTower(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, p: Pal): void {
  drawTowerBase(ctx, x, y + s * 0.4, s * 0.9, p.base);
  const t = getTime();

  // Rocky volcanic body (irregular polygon)
  const bodyGrad = ctx.createLinearGradient(x - s * 0.3, y, x + s * 0.3, y - s * 0.6);
  bodyGrad.addColorStop(0, p.accent);
  bodyGrad.addColorStop(0.5, p.body);
  bodyGrad.addColorStop(1, p.top);
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.35, y + s * 0.3);
  ctx.lineTo(x - s * 0.25, y - s * 0.1);
  ctx.lineTo(x - s * 0.1, y - s * 0.35);
  ctx.lineTo(x + s * 0.05, y - s * 0.5);
  ctx.lineTo(x + s * 0.2, y - s * 0.3);
  ctx.lineTo(x + s * 0.3, y - s * 0.05);
  ctx.lineTo(x + s * 0.35, y + s * 0.3);
  ctx.closePath();
  ctx.fill();

  // Glowing crater on top
  const craterGrad = ctx.createRadialGradient(x, y - s * 0.35, 0, x, y - s * 0.35, s * 0.25);
  craterGrad.addColorStop(0, '#ffff44');
  craterGrad.addColorStop(0.4, '#ff6600');
  craterGrad.addColorStop(0.8, '#cc3300');
  craterGrad.addColorStop(1, 'rgba(139,37,0,0)');
  ctx.fillStyle = craterGrad;
  ctx.beginPath();
  ctx.arc(x, y - s * 0.35, s * 0.25, 0, Math.PI * 2);
  ctx.fill();

  // Floating fire particles above
  for (let i = 0; i < 5; i++) {
    const angle = t * 1.5 + (Math.PI * 2 * i) / 5;
    const rise = ((t * 40 + i * 17) % 30);
    const px = x + Math.sin(angle) * s * 0.2;
    const py = y - s * 0.5 - rise * 0.5;
    const alpha = Math.max(0, 0.8 - rise / 30);
    ctx.fillStyle = `rgba(255,${100 + i * 20},0,${alpha})`;
    ctx.beginPath();
    ctx.arc(px, py, 1.5 + Math.sin(t * 3 + i) * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Red-orange glow aura
  const pulse = 0.7 + Math.sin(t * 3) * 0.3;
  const auraGrad = ctx.createRadialGradient(x, y - s * 0.1, s * 0.2, x, y - s * 0.1, s * 0.9);
  auraGrad.addColorStop(0, `rgba(255,69,0,${0.15 * pulse})`);
  auraGrad.addColorStop(1, 'rgba(255,69,0,0)');
  ctx.fillStyle = auraGrad;
  ctx.beginPath();
  ctx.arc(x, y - s * 0.1, s * 0.9, 0, Math.PI * 2);
  ctx.fill();
}

function drawVoidTower(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, p: Pal): void {
  drawTowerBase(ctx, x, y + s * 0.4, s * 0.85, p.base);
  const t = getTime();

  // Tall obsidian spire body
  const bodyGrad = ctx.createLinearGradient(x, y + s * 0.3, x, y - s * 0.6);
  bodyGrad.addColorStop(0, p.base);
  bodyGrad.addColorStop(0.5, p.body);
  bodyGrad.addColorStop(1, p.top);
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.3, y + s * 0.3);
  ctx.lineTo(x - s * 0.08, y - s * 0.6);
  ctx.lineTo(x + s * 0.08, y - s * 0.6);
  ctx.lineTo(x + s * 0.3, y + s * 0.3);
  ctx.closePath();
  ctx.fill();

  // Swirling void portal at top (animated rotating gradient ring)
  const portalY = y - s * 0.55;
  for (let i = 0; i < 8; i++) {
    const angle = t * 2 + (Math.PI * 2 * i) / 8;
    const rx = s * 0.22;
    const ry = s * 0.12;
    const px = x + Math.cos(angle) * rx;
    const py = portalY + Math.sin(angle) * ry;
    const hue = 270 + Math.sin(t + i) * 30;
    ctx.fillStyle = `hsla(${hue}, 80%, 50%, 0.7)`;
    ctx.beginPath();
    ctx.arc(px, py, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  // Dark center
  const voidGrad = ctx.createRadialGradient(x, portalY, 0, x, portalY, s * 0.15);
  voidGrad.addColorStop(0, '#000000');
  voidGrad.addColorStop(0.6, '#1a0033');
  voidGrad.addColorStop(1, 'rgba(75,0,130,0)');
  ctx.fillStyle = voidGrad;
  ctx.beginPath();
  ctx.arc(x, portalY, s * 0.15, 0, Math.PI * 2);
  ctx.fill();

  // Purple energy tendrils reaching outward
  ctx.strokeStyle = `rgba(150,50,255,${0.4 + Math.sin(t * 2) * 0.2})`;
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 4; i++) {
    const baseAngle = (Math.PI * 2 * i) / 4 + t * 0.5;
    const ex = x + Math.cos(baseAngle) * s * 0.6;
    const ey = portalY + Math.sin(baseAngle) * s * 0.3;
    const cpx = x + Math.cos(baseAngle + 0.5) * s * 0.35;
    const cpy = portalY + Math.sin(t * 3 + i) * s * 0.15;
    ctx.beginPath();
    ctx.moveTo(x, portalY);
    ctx.quadraticCurveTo(cpx, cpy, ex, ey);
    ctx.stroke();
  }

  // Dark particle absorption effect (particles moving inward)
  for (let i = 0; i < 6; i++) {
    const phase = (t * 0.8 + i * 1.1) % 2;
    const dist = (1 - phase / 2) * s * 0.7;
    const angle = (Math.PI * 2 * i) / 6 + t * 0.3;
    const px = x + Math.cos(angle) * dist;
    const py = portalY + Math.sin(angle) * dist * 0.5;
    ctx.fillStyle = `rgba(120,40,200,${phase / 2})`;
    ctx.beginPath();
    ctx.arc(px, py, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Purple glow pulsing
  const pulse = 0.6 + Math.sin(t * 2.5) * 0.4;
  const glowGrad = ctx.createRadialGradient(x, portalY, s * 0.1, x, portalY, s * 0.8);
  glowGrad.addColorStop(0, `rgba(75,0,130,${0.2 * pulse})`);
  glowGrad.addColorStop(1, 'rgba(75,0,130,0)');
  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.arc(x, portalY, s * 0.8, 0, Math.PI * 2);
  ctx.fill();
}

function drawPhoenixTower(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, p: Pal): void {
  drawTowerBase(ctx, x, y + s * 0.4, s * 0.85, p.base);
  const t = getTime();

  // Nest-like body (brown/red woven texture)
  const nestGrad = ctx.createRadialGradient(x, y + s * 0.1, 0, x, y + s * 0.1, s * 0.4);
  nestGrad.addColorStop(0, '#8b4513');
  nestGrad.addColorStop(0.6, '#6b3000');
  nestGrad.addColorStop(1, p.accent);
  ctx.fillStyle = nestGrad;
  ctx.beginPath();
  ctx.ellipse(x, y + s * 0.1, s * 0.4, s * 0.25, 0, 0, Math.PI * 2);
  ctx.fill();
  // Nest woven lines
  ctx.strokeStyle = 'rgba(100,50,10,0.5)';
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 5; i++) {
    const ny = y + s * 0.1 - s * 0.1 + i * s * 0.05;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.35, ny);
    ctx.quadraticCurveTo(x, ny + (i % 2 ? 4 : -4), x + s * 0.35, ny);
    ctx.stroke();
  }

  // Phoenix bird silhouette on top
  const wingFlap = Math.sin(t * 4) * 0.15;
  const birdY = y - s * 0.2;
  // Body
  const birdGrad = ctx.createRadialGradient(x, birdY, 0, x, birdY, s * 0.15);
  birdGrad.addColorStop(0, '#ffcc00');
  birdGrad.addColorStop(0.5, '#ff6347');
  birdGrad.addColorStop(1, '#cc2200');
  ctx.fillStyle = birdGrad;
  ctx.beginPath();
  ctx.ellipse(x, birdY, s * 0.12, s * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  // Wings
  ctx.fillStyle = `rgba(255,100,50,0.8)`;
  // Left wing
  ctx.beginPath();
  ctx.moveTo(x - s * 0.1, birdY);
  ctx.quadraticCurveTo(x - s * 0.35, birdY - s * (0.25 + wingFlap), x - s * 0.45, birdY - s * 0.1);
  ctx.quadraticCurveTo(x - s * 0.25, birdY + s * 0.05, x - s * 0.1, birdY);
  ctx.fill();
  // Right wing
  ctx.beginPath();
  ctx.moveTo(x + s * 0.1, birdY);
  ctx.quadraticCurveTo(x + s * 0.35, birdY - s * (0.25 + wingFlap), x + s * 0.45, birdY - s * 0.1);
  ctx.quadraticCurveTo(x + s * 0.25, birdY + s * 0.05, x + s * 0.1, birdY);
  ctx.fill();

  // Flame particles rising from the bird
  for (let i = 0; i < 5; i++) {
    const rise = ((t * 50 + i * 13) % 25);
    const px = x + Math.sin(t * 2 + i * 1.5) * s * 0.15;
    const py = birdY - s * 0.15 - rise * 0.4;
    const alpha = Math.max(0, 0.9 - rise / 25);
    const r = 2 - rise / 20;
    ctx.fillStyle = `rgba(255,${180 - rise * 3},0,${alpha})`;
    ctx.beginPath();
    ctx.arc(px, py, Math.max(0.5, r), 0, Math.PI * 2);
    ctx.fill();
  }

  // Golden fire aura
  const pulse = 0.6 + Math.sin(t * 3) * 0.4;
  const auraGrad = ctx.createRadialGradient(x, birdY, s * 0.1, x, birdY, s * 0.8);
  auraGrad.addColorStop(0, `rgba(255,200,0,${0.15 * pulse})`);
  auraGrad.addColorStop(0.5, `rgba(255,99,71,${0.08 * pulse})`);
  auraGrad.addColorStop(1, 'rgba(255,69,0,0)');
  ctx.fillStyle = auraGrad;
  ctx.beginPath();
  ctx.arc(x, birdY, s * 0.8, 0, Math.PI * 2);
  ctx.fill();

  // Periodic bright flash
  const flash = Math.max(0, Math.sin(t * 1.5) * 2 - 1);
  if (flash > 0) {
    ctx.fillStyle = `rgba(255,255,200,${flash * 0.3})`;
    ctx.beginPath();
    ctx.arc(x, birdY, s * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawChronoTower(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, p: Pal): void {
  drawTowerBase(ctx, x, y + s * 0.4, s * 0.85, p.base);
  const t = getTime();

  // Hourglass body shape (two triangles meeting at center)
  const bodyGrad = ctx.createLinearGradient(x, y + s * 0.3, x, y - s * 0.5);
  bodyGrad.addColorStop(0, p.accent);
  bodyGrad.addColorStop(0.5, p.body);
  bodyGrad.addColorStop(1, p.top);
  ctx.fillStyle = bodyGrad;
  // Upper triangle (inverted)
  ctx.beginPath();
  ctx.moveTo(x - s * 0.3, y - s * 0.5);
  ctx.lineTo(x + s * 0.3, y - s * 0.5);
  ctx.lineTo(x, y - s * 0.05);
  ctx.closePath();
  ctx.fill();
  // Lower triangle
  ctx.beginPath();
  ctx.moveTo(x - s * 0.3, y + s * 0.3);
  ctx.lineTo(x + s * 0.3, y + s * 0.3);
  ctx.lineTo(x, y - s * 0.05);
  ctx.closePath();
  ctx.fill();
  // Glass outline
  ctx.strokeStyle = 'rgba(0,206,209,0.6)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.3, y - s * 0.5);
  ctx.lineTo(x, y - s * 0.05);
  ctx.lineTo(x - s * 0.3, y + s * 0.3);
  ctx.moveTo(x + s * 0.3, y - s * 0.5);
  ctx.lineTo(x, y - s * 0.05);
  ctx.lineTo(x + s * 0.3, y + s * 0.3);
  ctx.stroke();

  // Sand particles flowing inside
  for (let i = 0; i < 6; i++) {
    const phase = (t * 1.2 + i * 0.4) % 2;
    const sandY = y - s * 0.4 + phase * s * 0.6;
    const width = phase < 1 ? (1 - phase) * s * 0.15 : (phase - 1) * s * 0.15;
    const px = x + Math.sin(i * 2.3) * width;
    ctx.fillStyle = `rgba(0,220,220,${0.6 - Math.abs(phase - 1) * 0.4})`;
    ctx.beginPath();
    ctx.arc(px, sandY, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Clock hands on the upper part
  const clockY = y - s * 0.3;
  const hourAngle = t * 0.5;
  const minAngle = t * 3;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, clockY);
  ctx.lineTo(x + Math.cos(hourAngle) * s * 0.12, clockY + Math.sin(hourAngle) * s * 0.12);
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, clockY);
  ctx.lineTo(x + Math.cos(minAngle) * s * 0.17, clockY + Math.sin(minAngle) * s * 0.17);
  ctx.stroke();

  // Time distortion rings (concentric animated circles)
  for (let i = 0; i < 3; i++) {
    const ringPhase = (t * 0.8 + i * 0.7) % 2;
    const ringR = ringPhase * s * 0.5;
    const alpha = Math.max(0, 0.4 - ringPhase * 0.2);
    ctx.strokeStyle = `rgba(0,206,209,${alpha})`;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(x, y - s * 0.1, ringR, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Cyan glow
  const pulse = 0.6 + Math.sin(t * 2) * 0.4;
  const glowGrad = ctx.createRadialGradient(x, y - s * 0.1, s * 0.1, x, y - s * 0.1, s * 0.7);
  glowGrad.addColorStop(0, `rgba(0,206,209,${0.15 * pulse})`);
  glowGrad.addColorStop(1, 'rgba(0,206,209,0)');
  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.arc(x, y - s * 0.1, s * 0.7, 0, Math.PI * 2);
  ctx.fill();
}

function drawDivineTower(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, p: Pal): void {
  drawTowerBase(ctx, x, y + s * 0.4, s * 0.9, p.base);
  const t = getTime();

  // Pillar body with ornate design
  const pillarGrad = ctx.createLinearGradient(x - s * 0.15, y, x + s * 0.15, y);
  pillarGrad.addColorStop(0, p.accent);
  pillarGrad.addColorStop(0.3, p.body);
  pillarGrad.addColorStop(0.5, p.top);
  pillarGrad.addColorStop(0.7, p.body);
  pillarGrad.addColorStop(1, p.accent);
  ctx.fillStyle = pillarGrad;
  ctx.beginPath();
  ctx.roundRect(x - s * 0.18, y - s * 0.5, s * 0.36, s * 0.75, 3);
  ctx.fill();
  // Ornate horizontal bands
  ctx.strokeStyle = 'rgba(255,255,200,0.5)';
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 3; i++) {
    const bandY = y - s * 0.35 + i * s * 0.25;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.18, bandY);
    ctx.lineTo(x + s * 0.18, bandY);
    ctx.stroke();
  }

  // Floating halo above (ellipse with golden gradient, rotating)
  const haloY = y - s * 0.65;
  const haloAngle = t * 1.5;
  ctx.strokeStyle = `rgba(255,215,0,${0.7 + Math.sin(t * 2) * 0.3})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x, haloY, s * 0.25, s * 0.08, haloAngle * 0.1, 0, Math.PI * 2);
  ctx.stroke();
  // Halo glow
  ctx.strokeStyle = `rgba(255,236,139,${0.3 + Math.sin(t * 2) * 0.15})`;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(x, haloY, s * 0.25, s * 0.08, haloAngle * 0.1, 0, Math.PI * 2);
  ctx.stroke();

  // Light rays emanating outward
  const rayCount = 8;
  for (let i = 0; i < rayCount; i++) {
    const angle = (Math.PI * 2 * i) / rayCount + t * 0.3;
    const innerR = s * 0.25;
    const outerR = s * 0.65 + Math.sin(t * 2 + i) * s * 0.1;
    const alpha = 0.15 + Math.sin(t * 3 + i * 0.8) * 0.1;
    ctx.strokeStyle = `rgba(255,215,0,${alpha})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(angle) * innerR, haloY + Math.sin(angle) * innerR * 0.3);
    ctx.lineTo(x + Math.cos(angle) * outerR, haloY + Math.sin(angle) * outerR * 0.3);
    ctx.stroke();
  }

  // Angel wing shapes on sides
  ctx.fillStyle = 'rgba(255,236,139,0.3)';
  // Left wing
  ctx.beginPath();
  ctx.moveTo(x - s * 0.18, y - s * 0.2);
  ctx.quadraticCurveTo(x - s * 0.5, y - s * 0.45, x - s * 0.4, y - s * 0.15);
  ctx.quadraticCurveTo(x - s * 0.35, y, x - s * 0.18, y + s * 0.05);
  ctx.fill();
  // Right wing
  ctx.beginPath();
  ctx.moveTo(x + s * 0.18, y - s * 0.2);
  ctx.quadraticCurveTo(x + s * 0.5, y - s * 0.45, x + s * 0.4, y - s * 0.15);
  ctx.quadraticCurveTo(x + s * 0.35, y, x + s * 0.18, y + s * 0.05);
  ctx.fill();

  // Bright golden glow (more intense)
  const pulse = 0.7 + Math.sin(t * 2.5) * 0.3;
  const glowGrad = ctx.createRadialGradient(x, y - s * 0.2, s * 0.1, x, y - s * 0.2, s * 1.0);
  glowGrad.addColorStop(0, `rgba(255,215,0,${0.2 * pulse})`);
  glowGrad.addColorStop(0.4, `rgba(255,236,139,${0.1 * pulse})`);
  glowGrad.addColorStop(1, 'rgba(255,215,0,0)');
  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.arc(x, y - s * 0.2, s * 1.0, 0, Math.PI * 2);
  ctx.fill();
}

// ── Grade Stars ─────────────────────────────────────────────

function drawGradeStars(ctx: CanvasRenderingContext2D, cx: number, cy: number, grade: TowerGrade): void {
  const starSize = 4;
  const spacing = 10;
  const totalWidth = (grade - 1) * spacing;
  const startX = cx - totalWidth / 2;
  const color = GRADE_COLORS[grade] ?? '#aaaaaa';

  for (let i = 0; i < grade; i++) {
    drawStar(ctx, startX + i * spacing, cy, starSize, color);
  }
}

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string): void {
  ctx.fillStyle = color;
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const outerAngle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
    const innerAngle = outerAngle + Math.PI / 5;
    ctx.lineTo(x + r * Math.cos(outerAngle), y + r * Math.sin(outerAngle));
    ctx.lineTo(x + r * 0.4 * Math.cos(innerAngle), y + r * 0.4 * Math.sin(innerAngle));
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

// ── Enemy Drawing (3D Characters) ───────────────────────────

export function drawEnemy(
  ctx: CanvasRenderingContext2D,
  enemy: Enemy,
  cellSize: number
): void {
  const { x: rawX, y: rawY } = enemy.position;
  const isBoss = BOSS_TYPES.has(enemy.type);
  const baseSize = cellSize * 0.35;
  const size = isBoss ? baseSize * 1.8 : baseSize;
  let pal = ENEMY_PALETTE[enemy.type] ?? { body: '#cc4444', light: '#ee6666', dark: '#aa2222', eye: '#ffffff' };
  const t = getTime();

  // ── Walking bounce ─────────────────────────────────────
  const speedFactor = enemy.speed > 70 ? 0.5 : enemy.speed > 40 ? 1.5 : 2.5;
  const bounceY = Math.sin(t * 8 + enemy.pathProgress * 50) * speedFactor;
  const squashX = 1 + Math.sin(t * 8 + enemy.pathProgress * 50 + Math.PI / 2) * 0.03;
  const squashY = 1 - Math.sin(t * 8 + enemy.pathProgress * 50 + Math.PI / 2) * 0.03;
  const x = rawX;
  const y = rawY + bounceY;

  // ── Status effect body tint ────────────────────────────
  const hasFreeze = enemy.effects.some(e => e.type === 'freeze' || e.type === 'slow');
  const hasPoison = enemy.effects.some(e => e.type === 'poison');
  const hasBurn = enemy.effects.some(e => e.type === 'burn');
  if (hasFreeze || hasPoison || hasBurn) {
    pal = { ...pal };
    if (hasFreeze) {
      pal.body = blendColor(pal.body, '#66ccff', 0.4);
      pal.light = blendColor(pal.light, '#aaeeff', 0.3);
      pal.dark = blendColor(pal.dark, '#3388bb', 0.3);
    }
    if (hasPoison) {
      pal.body = blendColor(pal.body, '#44cc44', 0.35);
      pal.light = blendColor(pal.light, '#88ee88', 0.25);
      pal.dark = blendColor(pal.dark, '#228822', 0.25);
    }
    if (hasBurn) {
      pal.body = blendColor(pal.body, '#ff6633', 0.3);
      pal.light = blendColor(pal.light, '#ffaa66', 0.25);
      pal.dark = blendColor(pal.dark, '#cc3300', 0.25);
    }
  }

  // ── Rage Mode visual (red pulsing tint) ──────────────
  if (enemy.isRaging) {
    pal = { ...pal };
    const ragePulse = 0.3 + Math.sin(t * 12) * 0.15;
    pal.body = blendColor(pal.body, '#ff2200', ragePulse);
    pal.light = blendColor(pal.light, '#ff6644', ragePulse * 0.8);
    pal.dark = blendColor(pal.dark, '#cc0000', ragePulse * 0.8);
  }

  ctx.save();
  // Apply squash & stretch
  ctx.translate(x, y);
  ctx.scale(squashX, squashY);
  ctx.translate(-x, -y);

  // Rage aura glow
  if (enemy.isRaging) {
    const rageAlpha = 0.2 + Math.sin(t * 10) * 0.1;
    const rageGlow = ctx.createRadialGradient(x, y, size * 0.3, x, y, size * 1.5);
    rageGlow.addColorStop(0, `rgba(255, 50, 0, ${rageAlpha})`);
    rageGlow.addColorStop(1, 'rgba(255, 50, 0, 0)');
    ctx.fillStyle = rageGlow;
    ctx.beginPath();
    ctx.arc(x, y, size * 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Boss outer glow
  if (isBoss) {
    const bossGlow = ctx.createRadialGradient(x, y, size * 0.5, x, y, size * 1.8);
    bossGlow.addColorStop(0, `${pal.body}44`);
    bossGlow.addColorStop(1, `${pal.body}00`);
    ctx.fillStyle = bossGlow;
    ctx.beginPath();
    ctx.arc(x, y, size * 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw enemy shape by category
  if (isFlying(enemy.type)) {
    // Flying: 3D diamond body with wings
    const wingFlap = Math.sin(t * 12) * size * 0.15;

    // Body
    draw3DCircle(ctx, x, y, size * 0.7, pal.light, pal.body, pal.dark);

    // Wings
    ctx.fillStyle = pal.body;
    ctx.globalAlpha = 0.7;
    // Left wing
    ctx.beginPath();
    ctx.moveTo(x - size * 0.5, y);
    ctx.lineTo(x - size * 1.3, y - size * 0.5 - wingFlap);
    ctx.lineTo(x - size * 0.8, y + size * 0.2);
    ctx.closePath();
    ctx.fill();
    // Right wing
    ctx.beginPath();
    ctx.moveTo(x + size * 0.5, y);
    ctx.lineTo(x + size * 1.3, y - size * 0.5 - wingFlap);
    ctx.lineTo(x + size * 0.8, y + size * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    // Beak
    ctx.fillStyle = '#ffaa33';
    ctx.beginPath();
    ctx.moveTo(x + size * 0.35, y + size * 0.05);
    ctx.lineTo(x + size * 0.65, y + size * 0.15);
    ctx.lineTo(x + size * 0.35, y + size * 0.25);
    ctx.closePath();
    ctx.fill();

    // Eyes
    ctx.fillStyle = pal.eye;
    ctx.beginPath();
    ctx.arc(x - size * 0.2, y - size * 0.15, size * 0.1, 0, Math.PI * 2);
    ctx.arc(x + size * 0.2, y - size * 0.15, size * 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Pupils
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(x - size * 0.18, y - size * 0.15, size * 0.04, 0, Math.PI * 2);
    ctx.arc(x + size * 0.22, y - size * 0.15, size * 0.04, 0, Math.PI * 2);
    ctx.fill();

  } else if (isArmored(enemy.type)) {
    // Armored: 3D square body with metallic sheen
    const halfS = size * 0.8;
    draw3DRect(ctx, x - halfS, y - halfS, halfS * 2, halfS * 2, pal.light, pal.body, pal.dark);

    // Shield overlay
    ctx.fillStyle = 'rgba(180,200,220,0.3)';
    ctx.fillRect(x - halfS * 0.7, y - halfS * 0.7, halfS * 1.4, halfS * 1.4);

    // Shield highlight
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.moveTo(x - halfS * 0.6, y - halfS * 0.6);
    ctx.lineTo(x + halfS * 0.2, y - halfS * 0.6);
    ctx.lineTo(x - halfS * 0.6, y + halfS * 0.2);
    ctx.closePath();
    ctx.fill();

    // Visor slit
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x - halfS * 0.55, y - size * 0.12, halfS * 1.1, size * 0.15);
    // Visor glow (eyes behind visor)
    ctx.fillStyle = pal.eye;
    ctx.fillRect(x - size * 0.3, y - size * 0.1, size * 0.12, size * 0.08);
    ctx.fillRect(x + size * 0.18, y - size * 0.1, size * 0.12, size * 0.08);

  } else if (isFast(enemy.type)) {
    // Fast: Sleek teardrop with motion blur afterimages
    // Afterimages (2 semi-transparent copies behind)
    for (let ai = 2; ai >= 1; ai--) {
      const ox = x - ai * size * 0.35;
      ctx.globalAlpha = 0.12 / ai;
      ctx.fillStyle = pal.body;
      ctx.beginPath();
      ctx.moveTo(ox + size, y);
      ctx.bezierCurveTo(ox + size * 0.5, y - size * 0.7, ox - size * 0.5, y - size * 0.5, ox - size * 0.7, y);
      ctx.bezierCurveTo(ox - size * 0.5, y + size * 0.5, ox + size * 0.5, y + size * 0.7, ox + size, y);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    const grad = ctx.createLinearGradient(x - size, y, x + size, y);
    grad.addColorStop(0, pal.dark);
    grad.addColorStop(0.4, pal.body);
    grad.addColorStop(0.8, pal.light);
    grad.addColorStop(1, pal.body);
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.moveTo(x + size, y);
    ctx.bezierCurveTo(x + size * 0.5, y - size * 0.7, x - size * 0.5, y - size * 0.5, x - size * 0.7, y);
    ctx.bezierCurveTo(x - size * 0.5, y + size * 0.5, x + size * 0.5, y + size * 0.7, x + size, y);
    ctx.fill();

    // Speed lines
    ctx.strokeStyle = `rgba(255,255,255,0.3)`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const ly = y - size * 0.3 + i * size * 0.3;
      ctx.beginPath();
      ctx.moveTo(x - size * 1.2 - i * 3, ly);
      ctx.lineTo(x - size * 0.6, ly);
      ctx.stroke();
    }

    // Eye
    ctx.fillStyle = pal.eye;
    ctx.beginPath();
    ctx.arc(x + size * 0.3, y - size * 0.1, size * 0.12, 0, Math.PI * 2);
    ctx.fill();

  } else if (isMagic(enemy.type)) {
    // Magic: Glowing orb with aura
    // Aura ring
    const auraAlpha = Math.sin(t * 3) * 0.15 + 0.2;
    ctx.strokeStyle = `${pal.body}${Math.round(auraAlpha * 255).toString(16).padStart(2, '0')}`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, size * 1.2, 0, Math.PI * 2);
    ctx.stroke();

    // Body orb
    draw3DCircle(ctx, x, y, size * 0.8, pal.light, pal.body, pal.dark);

    // Inner glow
    const igGrad = ctx.createRadialGradient(x, y, 0, x, y, size * 0.5);
    igGrad.addColorStop(0, 'rgba(255,255,255,0.3)');
    igGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = igGrad;
    ctx.beginPath();
    ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Orbiting rune particles
    for (let i = 0; i < 3; i++) {
      const angle = t * 2 + (Math.PI * 2 * i) / 3;
      const px = x + Math.cos(angle) * size;
      const py = y + Math.sin(angle) * size * 0.6;
      ctx.fillStyle = `${pal.light}88`;
      ctx.beginPath();
      ctx.arc(px, py, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Eyes
    ctx.fillStyle = pal.eye;
    ctx.beginPath();
    ctx.arc(x - size * 0.25, y - size * 0.1, size * 0.1, 0, Math.PI * 2);
    ctx.arc(x + size * 0.25, y - size * 0.1, size * 0.1, 0, Math.PI * 2);
    ctx.fill();

  } else if (enemy.type === 'SLIME') {
    // ── SLIME: Wobbly blob creature ──
    const wobble1 = Math.sin(t * 4) * size * 0.06;
    const wobble2 = Math.sin(t * 5 + 1) * size * 0.05;
    const wobble3 = Math.sin(t * 3.5 + 2) * size * 0.07;

    // Dripping tentacles at bottom
    ctx.fillStyle = pal.dark;
    for (let i = 0; i < 3; i++) {
      const tx = x + (i - 1) * size * 0.4;
      const dripLen = size * 0.3 + Math.sin(t * 3 + i * 2) * size * 0.1;
      ctx.beginPath();
      ctx.moveTo(tx - size * 0.08, y + size * 0.5);
      ctx.quadraticCurveTo(tx, y + size * 0.5 + dripLen, tx + size * 0.08, y + size * 0.5);
      ctx.fill();
    }

    // Blob body with bezier curves (wobbly)
    const blobGrad = ctx.createRadialGradient(x - size * 0.2, y - size * 0.3, size * 0.1, x, y, size);
    blobGrad.addColorStop(0, pal.light);
    blobGrad.addColorStop(0.6, pal.body);
    blobGrad.addColorStop(1, pal.dark);
    ctx.fillStyle = blobGrad;
    ctx.beginPath();
    ctx.moveTo(x - size * 0.8, y + size * 0.2);
    ctx.bezierCurveTo(x - size * 0.9 - wobble1, y - size * 0.5, x - size * 0.3, y - size * 0.85, x, y - size * 0.8 - wobble2);
    ctx.bezierCurveTo(x + size * 0.3, y - size * 0.85, x + size * 0.9 + wobble3, y - size * 0.5, x + size * 0.8, y + size * 0.2);
    ctx.bezierCurveTo(x + size * 0.6, y + size * 0.55 + wobble1, x + size * 0.2, y + size * 0.65, x, y + size * 0.6 + wobble2);
    ctx.bezierCurveTo(x - size * 0.2, y + size * 0.65, x - size * 0.6, y + size * 0.55 + wobble3, x - size * 0.8, y + size * 0.2);
    ctx.fill();

    // Semi-translucent sheen overlay
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(x - size * 0.15, y - size * 0.3, size * 0.35, size * 0.2, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Internal bubbles
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    for (let i = 0; i < 4; i++) {
      const bx = x + Math.sin(t * 1.5 + i * 1.8) * size * 0.3;
      const by = y + Math.cos(t * 1.2 + i * 2.2) * size * 0.2;
      const br = size * 0.06 + Math.sin(t * 2 + i) * size * 0.02;
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fill();
    }

    // Big cute round eyes
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x - size * 0.25, y - size * 0.25, size * 0.2, 0, Math.PI * 2);
    ctx.arc(x + size * 0.25, y - size * 0.25, size * 0.2, 0, Math.PI * 2);
    ctx.fill();
    // Pupils
    ctx.fillStyle = pal.eye === '#ffffff' ? '#222' : pal.eye;
    ctx.beginPath();
    ctx.arc(x - size * 0.2, y - size * 0.25, size * 0.1, 0, Math.PI * 2);
    ctx.arc(x + size * 0.3, y - size * 0.25, size * 0.1, 0, Math.PI * 2);
    ctx.fill();
    // Highlights
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x - size * 0.28, y - size * 0.3, size * 0.05, 0, Math.PI * 2);
    ctx.arc(x + size * 0.22, y - size * 0.3, size * 0.05, 0, Math.PI * 2);
    ctx.fill();

    // Small curved smile
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y + size * 0.05, size * 0.15, 0.2, Math.PI - 0.2);
    ctx.stroke();

  } else if (enemy.type === 'GOBLIN') {
    // ── GOBLIN: Small angry humanoid ──
    const faceColor = pal.light;

    // Small arms
    ctx.strokeStyle = pal.dark;
    ctx.lineWidth = size * 0.12;
    ctx.lineCap = 'round';
    // Left arm
    ctx.beginPath();
    ctx.moveTo(x - size * 0.55, y + size * 0.1);
    ctx.lineTo(x - size * 0.8, y - size * 0.1);
    ctx.stroke();
    // Right arm holding club
    ctx.beginPath();
    ctx.moveTo(x + size * 0.55, y + size * 0.1);
    ctx.lineTo(x + size * 0.85, y - size * 0.2);
    ctx.stroke();
    // Club
    ctx.fillStyle = '#8B6914';
    ctx.save();
    ctx.translate(x + size * 0.85, y - size * 0.2);
    ctx.rotate(-0.5);
    ctx.fillRect(-size * 0.04, -size * 0.35, size * 0.08, size * 0.35);
    ctx.fillStyle = '#6B4C12';
    ctx.beginPath();
    ctx.arc(0, -size * 0.35, size * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Pear-shaped body
    const bodyGrad = ctx.createRadialGradient(x, y + size * 0.1, size * 0.1, x, y + size * 0.2, size * 0.7);
    bodyGrad.addColorStop(0, pal.light);
    bodyGrad.addColorStop(0.7, pal.body);
    bodyGrad.addColorStop(1, pal.dark);
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(x, y + size * 0.25, size * 0.5, size * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    const headGrad = ctx.createRadialGradient(x - size * 0.1, y - size * 0.35, size * 0.05, x, y - size * 0.25, size * 0.4);
    headGrad.addColorStop(0, faceColor);
    headGrad.addColorStop(1, pal.body);
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.arc(x, y - size * 0.3, size * 0.35, 0, Math.PI * 2);
    ctx.fill();

    // Pointy ears
    ctx.fillStyle = pal.body;
    // Left ear
    ctx.beginPath();
    ctx.moveTo(x - size * 0.32, y - size * 0.35);
    ctx.lineTo(x - size * 0.75, y - size * 0.6);
    ctx.lineTo(x - size * 0.25, y - size * 0.15);
    ctx.closePath();
    ctx.fill();
    // Right ear
    ctx.beginPath();
    ctx.moveTo(x + size * 0.32, y - size * 0.35);
    ctx.lineTo(x + size * 0.75, y - size * 0.6);
    ctx.lineTo(x + size * 0.25, y - size * 0.15);
    ctx.closePath();
    ctx.fill();

    // Angry eyebrows
    ctx.strokeStyle = pal.dark;
    ctx.lineWidth = size * 0.06;
    ctx.beginPath();
    ctx.moveTo(x - size * 0.35, y - size * 0.52);
    ctx.lineTo(x - size * 0.12, y - size * 0.42);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + size * 0.35, y - size * 0.52);
    ctx.lineTo(x + size * 0.12, y - size * 0.42);
    ctx.stroke();

    // Angry slanted eyes
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(x - size * 0.18, y - size * 0.32, size * 0.12, size * 0.08, -0.2, 0, Math.PI * 2);
    ctx.ellipse(x + size * 0.18, y - size * 0.32, size * 0.12, size * 0.08, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#cc2200';
    ctx.beginPath();
    ctx.arc(x - size * 0.15, y - size * 0.32, size * 0.05, 0, Math.PI * 2);
    ctx.arc(x + size * 0.2, y - size * 0.32, size * 0.05, 0, Math.PI * 2);
    ctx.fill();

    // Wide mouth with fangs
    ctx.fillStyle = '#440000';
    ctx.beginPath();
    ctx.arc(x, y - size * 0.12, size * 0.15, 0, Math.PI);
    ctx.fill();
    // Fangs
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(x - size * 0.1, y - size * 0.12);
    ctx.lineTo(x - size * 0.06, y - size * 0.02);
    ctx.lineTo(x - size * 0.02, y - size * 0.12);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + size * 0.02, y - size * 0.12);
    ctx.lineTo(x + size * 0.06, y - size * 0.02);
    ctx.lineTo(x + size * 0.1, y - size * 0.12);
    ctx.fill();

  } else if (enemy.type === 'SKELETON') {
    // ── SKELETON: Undead skull and bones ──
    const boneWhite = pal.light;
    const boneShadow = pal.body;

    // Narrower body with ribs
    const bodyGrad = ctx.createLinearGradient(x - size * 0.3, y, x + size * 0.3, y);
    bodyGrad.addColorStop(0, pal.dark);
    bodyGrad.addColorStop(0.5, boneShadow);
    bodyGrad.addColorStop(1, pal.dark);
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(x, y + size * 0.2, size * 0.35, size * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Spine line
    ctx.strokeStyle = pal.dark;
    ctx.lineWidth = size * 0.05;
    ctx.beginPath();
    ctx.moveTo(x, y - size * 0.1);
    ctx.lineTo(x, y + size * 0.65);
    ctx.stroke();

    // Rib curves
    ctx.strokeStyle = boneWhite;
    ctx.lineWidth = size * 0.04;
    for (let i = 0; i < 3; i++) {
      const ry = y + size * 0.05 + i * size * 0.18;
      ctx.beginPath();
      ctx.moveTo(x, ry);
      ctx.quadraticCurveTo(x - size * 0.25, ry - size * 0.06, x - size * 0.3, ry + size * 0.02);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, ry);
      ctx.quadraticCurveTo(x + size * 0.25, ry - size * 0.06, x + size * 0.3, ry + size * 0.02);
      ctx.stroke();
    }

    // Skull
    const skullGrad = ctx.createRadialGradient(x - size * 0.1, y - size * 0.45, size * 0.05, x, y - size * 0.35, size * 0.4);
    skullGrad.addColorStop(0, boneWhite);
    skullGrad.addColorStop(1, boneShadow);
    ctx.fillStyle = skullGrad;
    ctx.beginPath();
    ctx.arc(x, y - size * 0.35, size * 0.38, 0, Math.PI * 2);
    ctx.fill();
    // Jaw (slightly narrower at bottom)
    ctx.beginPath();
    ctx.moveTo(x - size * 0.25, y - size * 0.1);
    ctx.quadraticCurveTo(x, y + size * 0.05, x + size * 0.25, y - size * 0.1);
    ctx.fill();

    // Dark eye sockets
    ctx.fillStyle = '#1a0a0a';
    ctx.beginPath();
    ctx.ellipse(x - size * 0.15, y - size * 0.4, size * 0.12, size * 0.13, 0, 0, Math.PI * 2);
    ctx.ellipse(x + size * 0.15, y - size * 0.4, size * 0.12, size * 0.13, 0, 0, Math.PI * 2);
    ctx.fill();

    // Glowing red pupils
    const glowPulse = Math.sin(t * 4) * 0.3 + 0.7;
    ctx.fillStyle = `rgba(255,50,30,${glowPulse})`;
    ctx.beginPath();
    ctx.arc(x - size * 0.15, y - size * 0.4, size * 0.04, 0, Math.PI * 2);
    ctx.arc(x + size * 0.15, y - size * 0.4, size * 0.04, 0, Math.PI * 2);
    ctx.fill();

    // Triangle nose hole
    ctx.fillStyle = '#1a0a0a';
    ctx.beginPath();
    ctx.moveTo(x, y - size * 0.27);
    ctx.lineTo(x - size * 0.05, y - size * 0.2);
    ctx.lineTo(x + size * 0.05, y - size * 0.2);
    ctx.closePath();
    ctx.fill();

    // Teeth row
    ctx.fillStyle = boneWhite;
    ctx.strokeStyle = pal.dark;
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 5; i++) {
      const tx = x - size * 0.16 + i * size * 0.08;
      ctx.fillRect(tx, y - size * 0.16, size * 0.06, size * 0.08);
      ctx.strokeRect(tx, y - size * 0.16, size * 0.06, size * 0.08);
    }

  } else if (enemy.type === 'WOLF') {
    // ── WOLF: Four-legged beast ──
    // Tail
    ctx.strokeStyle = pal.dark;
    ctx.lineWidth = size * 0.1;
    ctx.lineCap = 'round';
    const tailWag = Math.sin(t * 6) * 0.3;
    ctx.beginPath();
    ctx.moveTo(x - size * 0.7, y - size * 0.05);
    ctx.quadraticCurveTo(x - size * 1.0, y - size * 0.4 + tailWag * size * 0.2, x - size * 0.85, y - size * 0.55 + tailWag * size * 0.15);
    ctx.stroke();

    // 4 legs with paws
    ctx.fillStyle = pal.dark;
    const legPhase = t * 8 + enemy.pathProgress * 50;
    const legOffsets = [
      { lx: -size * 0.45, swing: Math.sin(legPhase) * size * 0.08 },
      { lx: -size * 0.15, swing: Math.sin(legPhase + Math.PI) * size * 0.08 },
      { lx: size * 0.15, swing: Math.sin(legPhase + Math.PI * 0.5) * size * 0.08 },
      { lx: size * 0.45, swing: Math.sin(legPhase + Math.PI * 1.5) * size * 0.08 },
    ];
    for (const leg of legOffsets) {
      ctx.fillRect(x + leg.lx - size * 0.06, y + size * 0.15, size * 0.12, size * 0.35 + leg.swing);
      // Paw
      ctx.beginPath();
      ctx.arc(x + leg.lx, y + size * 0.5 + leg.swing, size * 0.08, 0, Math.PI * 2);
      ctx.fill();
    }

    // Horizontal body
    const bodyGrad = ctx.createRadialGradient(x, y - size * 0.1, size * 0.1, x, y, size * 0.5);
    bodyGrad.addColorStop(0, pal.light);
    bodyGrad.addColorStop(0.7, pal.body);
    bodyGrad.addColorStop(1, pal.dark);
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(x, y, size * 0.7, size * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head overlapping front
    const headGrad = ctx.createRadialGradient(x + size * 0.55, y - size * 0.2, size * 0.05, x + size * 0.5, y - size * 0.1, size * 0.3);
    headGrad.addColorStop(0, pal.light);
    headGrad.addColorStop(1, pal.body);
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.arc(x + size * 0.55, y - size * 0.15, size * 0.28, 0, Math.PI * 2);
    ctx.fill();

    // Snout extension
    ctx.fillStyle = pal.body;
    ctx.beginPath();
    ctx.ellipse(x + size * 0.8, y - size * 0.08, size * 0.18, size * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
    // Nose dot
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(x + size * 0.95, y - size * 0.08, size * 0.05, 0, Math.PI * 2);
    ctx.fill();

    // Pointy ears
    ctx.fillStyle = pal.dark;
    ctx.beginPath();
    ctx.moveTo(x + size * 0.4, y - size * 0.3);
    ctx.lineTo(x + size * 0.35, y - size * 0.6);
    ctx.lineTo(x + size * 0.55, y - size * 0.28);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + size * 0.55, y - size * 0.32);
    ctx.lineTo(x + size * 0.6, y - size * 0.62);
    ctx.lineTo(x + size * 0.72, y - size * 0.3);
    ctx.closePath();
    ctx.fill();

    // Eye
    ctx.fillStyle = pal.eye;
    ctx.beginPath();
    ctx.ellipse(x + size * 0.6, y - size * 0.22, size * 0.07, size * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(x + size * 0.62, y - size * 0.22, size * 0.03, 0, Math.PI * 2);
    ctx.fill();

  } else if (enemy.type === 'DEMON_LORD') {
    // ── DEMON_LORD (boss): Demonic overlord ──
    // Semi-transparent dark wings behind
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#220011';
    // Left wing
    ctx.beginPath();
    ctx.moveTo(x - size * 0.4, y - size * 0.2);
    ctx.bezierCurveTo(x - size * 1.2, y - size * 1.0, x - size * 1.5, y - size * 0.3, x - size * 1.1, y + size * 0.3);
    ctx.lineTo(x - size * 0.4, y + size * 0.1);
    ctx.closePath();
    ctx.fill();
    // Right wing
    ctx.beginPath();
    ctx.moveTo(x + size * 0.4, y - size * 0.2);
    ctx.bezierCurveTo(x + size * 1.2, y - size * 1.0, x + size * 1.5, y - size * 0.3, x + size * 1.1, y + size * 0.3);
    ctx.lineTo(x + size * 0.4, y + size * 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    // Fire aura gradient
    const auraGrad = ctx.createRadialGradient(x, y, size * 0.3, x, y, size * 1.3);
    auraGrad.addColorStop(0, 'rgba(255,60,0,0)');
    auraGrad.addColorStop(0.6, 'rgba(255,60,0,0.08)');
    auraGrad.addColorStop(1, `rgba(255,30,0,${0.1 + Math.sin(t * 4) * 0.05})`);
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(x, y, size * 1.3, 0, Math.PI * 2);
    ctx.fill();

    // Muscular trapezoid torso
    const torsoGrad = ctx.createLinearGradient(x - size * 0.5, y - size * 0.2, x + size * 0.5, y + size * 0.6);
    torsoGrad.addColorStop(0, pal.light);
    torsoGrad.addColorStop(0.5, pal.body);
    torsoGrad.addColorStop(1, pal.dark);
    ctx.fillStyle = torsoGrad;
    ctx.beginPath();
    ctx.moveTo(x - size * 0.55, y - size * 0.2);
    ctx.lineTo(x + size * 0.55, y - size * 0.2);
    ctx.lineTo(x + size * 0.4, y + size * 0.6);
    ctx.lineTo(x - size * 0.4, y + size * 0.6);
    ctx.closePath();
    ctx.fill();

    // Head
    draw3DCircle(ctx, x, y - size * 0.5, size * 0.35, pal.light, pal.body, pal.dark);

    // Curved horns (bezier curves)
    ctx.strokeStyle = '#443322';
    ctx.lineWidth = size * 0.09;
    ctx.lineCap = 'round';
    // Left horn
    ctx.beginPath();
    ctx.moveTo(x - size * 0.2, y - size * 0.75);
    ctx.bezierCurveTo(x - size * 0.5, y - size * 1.1, x - size * 0.65, y - size * 0.8, x - size * 0.55, y - size * 0.55);
    ctx.stroke();
    // Right horn
    ctx.beginPath();
    ctx.moveTo(x + size * 0.2, y - size * 0.75);
    ctx.bezierCurveTo(x + size * 0.5, y - size * 1.1, x + size * 0.65, y - size * 0.8, x + size * 0.55, y - size * 0.55);
    ctx.stroke();

    // Glowing eyes with shadowBlur
    ctx.save();
    ctx.shadowColor = '#ff3300';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#ff4400';
    ctx.beginPath();
    ctx.ellipse(x - size * 0.15, y - size * 0.52, size * 0.08, size * 0.05, 0, 0, Math.PI * 2);
    ctx.ellipse(x + size * 0.15, y - size * 0.52, size * 0.08, size * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

  } else if (enemy.type === 'HYDRA') {
    // ── HYDRA (boss): Three-headed serpent ──
    // Wide base body with scale pattern
    const baseGrad = ctx.createRadialGradient(x, y + size * 0.1, size * 0.1, x, y + size * 0.1, size * 0.7);
    baseGrad.addColorStop(0, pal.light);
    baseGrad.addColorStop(0.7, pal.body);
    baseGrad.addColorStop(1, pal.dark);
    ctx.fillStyle = baseGrad;
    ctx.beginPath();
    ctx.ellipse(x, y + size * 0.2, size * 0.75, size * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Scale pattern arcs on body
    ctx.strokeStyle = pal.dark;
    ctx.lineWidth = 0.8;
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 4; col++) {
        const sx = x - size * 0.4 + col * size * 0.25 + (row % 2) * size * 0.12;
        const sy = y + size * 0.0 + row * size * 0.18;
        ctx.beginPath();
        ctx.arc(sx, sy, size * 0.1, 0, Math.PI);
        ctx.stroke();
      }
    }

    // Three necks (bezier curves)
    ctx.strokeStyle = pal.body;
    ctx.lineWidth = size * 0.15;
    ctx.lineCap = 'round';
    const neckSway = Math.sin(t * 2) * size * 0.05;
    // Left neck
    ctx.beginPath();
    ctx.moveTo(x - size * 0.3, y - size * 0.1);
    ctx.bezierCurveTo(x - size * 0.5, y - size * 0.5, x - size * 0.6 + neckSway, y - size * 0.8, x - size * 0.45, y - size * 0.95);
    ctx.stroke();
    // Center neck
    ctx.beginPath();
    ctx.moveTo(x, y - size * 0.15);
    ctx.bezierCurveTo(x + neckSway * 0.5, y - size * 0.5, x - neckSway * 0.5, y - size * 0.8, x, y - size * 1.05);
    ctx.stroke();
    // Right neck
    ctx.beginPath();
    ctx.moveTo(x + size * 0.3, y - size * 0.1);
    ctx.bezierCurveTo(x + size * 0.5, y - size * 0.5, x + size * 0.6 - neckSway, y - size * 0.8, x + size * 0.45, y - size * 0.95);
    ctx.stroke();

    // Three heads
    const headPositions = [
      { hx: x - size * 0.45, hy: y - size * 0.95 },
      { hx: x, hy: y - size * 1.05 },
      { hx: x + size * 0.45, hy: y - size * 0.95 },
    ];
    for (const hp of headPositions) {
      draw3DCircle(ctx, hp.hx, hp.hy, size * 0.22, pal.light, pal.body, pal.dark);
      // Eyes
      ctx.fillStyle = pal.eye;
      ctx.beginPath();
      ctx.arc(hp.hx - size * 0.08, hp.hy - size * 0.04, size * 0.04, 0, Math.PI * 2);
      ctx.arc(hp.hx + size * 0.08, hp.hy - size * 0.04, size * 0.04, 0, Math.PI * 2);
      ctx.fill();
    }

  } else if (enemy.type === 'WORD_DESTROYER') {
    // ── WORD_DESTROYER (boss): Chaotic energy entity ──
    const pulse = Math.sin(t * 3) * 0.15 + 1;

    // Pulsing irregular shape (morphing polygon)
    ctx.beginPath();
    const vertices = 9;
    for (let i = 0; i < vertices; i++) {
      const angle = (Math.PI * 2 * i) / vertices + t * 0.5;
      const wobbleR = size * 0.7 * pulse + Math.sin(t * 4 + i * 1.7) * size * 0.12;
      const vx = x + Math.cos(angle) * wobbleR;
      const vy = y + Math.sin(angle) * wobbleR;
      if (i === 0) ctx.moveTo(vx, vy);
      else ctx.lineTo(vx, vy);
    }
    ctx.closePath();
    // Radial gradient fill
    const coreGrad = ctx.createRadialGradient(x, y, 0, x, y, size * 0.85 * pulse);
    coreGrad.addColorStop(0, '#ffffff');
    coreGrad.addColorStop(0.3, '#cc66ff');
    coreGrad.addColorStop(0.7, '#6622aa');
    coreGrad.addColorStop(1, '#220044');
    ctx.fillStyle = coreGrad;
    ctx.fill();

    // Energy crackle lines (lightning)
    ctx.strokeStyle = 'rgba(200,150,255,0.6)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) {
      const startAngle = t * 2 + i * 1.3;
      const sx = x + Math.cos(startAngle) * size * 0.3;
      const sy = y + Math.sin(startAngle) * size * 0.3;
      const ex = x + Math.cos(startAngle + 0.5) * size * 0.8;
      const ey = y + Math.sin(startAngle + 0.5) * size * 0.8;
      const mx = (sx + ex) / 2 + Math.sin(t * 10 + i) * size * 0.15;
      const my = (sy + ey) / 2 + Math.cos(t * 10 + i) * size * 0.15;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(mx, my);
      ctx.lineTo(ex, ey);
      ctx.stroke();
    }

    // 7 floating alphabet letters orbiting
    ctx.font = `bold ${Math.round(size * 0.25)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const letters = 'ABCDEFG';
    const rainbowColors = ['#ff3333', '#ff8833', '#ffdd33', '#33cc33', '#3388ff', '#6633ff', '#cc33ff'];
    for (let i = 0; i < 7; i++) {
      const orbitAngle = t * 1.5 + (Math.PI * 2 * i) / 7;
      const orbitR = size * 0.95 + Math.sin(t * 2 + i) * size * 0.1;
      const lx = x + Math.cos(orbitAngle) * orbitR;
      const ly = y + Math.sin(orbitAngle) * orbitR * 0.65;
      ctx.fillStyle = rainbowColors[i];
      ctx.fillText(letters[i], lx, ly);
    }

    // Two bright glowing eye dots
    ctx.save();
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x - size * 0.18, y - size * 0.08, size * 0.07, 0, Math.PI * 2);
    ctx.arc(x + size * 0.18, y - size * 0.08, size * 0.07, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

  } else {
    // ── Fallback: generic 3D sphere ──
    draw3DCircle(ctx, x, y, size, pal.light, pal.body, pal.dark);

    // Eyes
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x - size * 0.3, y - size * 0.15, size * 0.18, 0, Math.PI * 2);
    ctx.arc(x + size * 0.3, y - size * 0.15, size * 0.18, 0, Math.PI * 2);
    ctx.fill();

    // Pupils
    ctx.fillStyle = pal.eye === '#ffffff' ? '#333333' : pal.eye;
    ctx.beginPath();
    ctx.arc(x - size * 0.25, y - size * 0.15, size * 0.08, 0, Math.PI * 2);
    ctx.arc(x + size * 0.25, y - size * 0.15, size * 0.08, 0, Math.PI * 2);
    ctx.fill();

    // Mouth
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y + size * 0.15, size * 0.2, 0.1, Math.PI - 0.1);
    ctx.stroke();
  }

  // ── Dark outline around all enemy shapes for readability ──
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1.5;
  if (isFlying(enemy.type)) {
    ctx.beginPath();
    ctx.arc(x, y, size * 0.7, 0, Math.PI * 2);
    ctx.stroke();
  } else if (isArmored(enemy.type)) {
    const halfS = size * 0.8;
    ctx.strokeRect(x - halfS, y - halfS, halfS * 2, halfS * 2);
  } else if (isFast(enemy.type)) {
    ctx.beginPath();
    ctx.moveTo(x + size, y);
    ctx.bezierCurveTo(x + size * 0.5, y - size * 0.7, x - size * 0.5, y - size * 0.5, x - size * 0.7, y);
    ctx.bezierCurveTo(x - size * 0.5, y + size * 0.5, x + size * 0.5, y + size * 0.7, x + size, y);
    ctx.stroke();
  } else if (isMagic(enemy.type)) {
    ctx.beginPath();
    ctx.arc(x, y, size * 0.8, 0, Math.PI * 2);
    ctx.stroke();
  } else if (enemy.type === 'SLIME') {
    // Blob outline matching body shape
    const wobble1 = Math.sin(t * 4) * size * 0.06;
    const wobble2 = Math.sin(t * 5 + 1) * size * 0.05;
    const wobble3 = Math.sin(t * 3.5 + 2) * size * 0.07;
    ctx.beginPath();
    ctx.moveTo(x - size * 0.8, y + size * 0.2);
    ctx.bezierCurveTo(x - size * 0.9 - wobble1, y - size * 0.5, x - size * 0.3, y - size * 0.85, x, y - size * 0.8 - wobble2);
    ctx.bezierCurveTo(x + size * 0.3, y - size * 0.85, x + size * 0.9 + wobble3, y - size * 0.5, x + size * 0.8, y + size * 0.2);
    ctx.bezierCurveTo(x + size * 0.6, y + size * 0.55 + wobble1, x + size * 0.2, y + size * 0.65, x, y + size * 0.6 + wobble2);
    ctx.bezierCurveTo(x - size * 0.2, y + size * 0.65, x - size * 0.6, y + size * 0.55 + wobble3, x - size * 0.8, y + size * 0.2);
    ctx.stroke();
  } else if (enemy.type === 'WOLF') {
    // Body ellipse outline
    ctx.beginPath();
    ctx.ellipse(x, y, size * 0.7, size * 0.35, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (enemy.type === 'GOBLIN') {
    // Body + head outline
    ctx.beginPath();
    ctx.arc(x, y - size * 0.3, size * 0.35, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(x, y + size * 0.25, size * 0.5, size * 0.45, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (enemy.type === 'SKELETON') {
    // Skull + body outline
    ctx.beginPath();
    ctx.arc(x, y - size * 0.35, size * 0.38, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(x, y + size * 0.2, size * 0.35, size * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (enemy.type === 'DEMON_LORD') {
    // Torso outline
    ctx.beginPath();
    ctx.moveTo(x - size * 0.55, y - size * 0.2);
    ctx.lineTo(x + size * 0.55, y - size * 0.2);
    ctx.lineTo(x + size * 0.4, y + size * 0.6);
    ctx.lineTo(x - size * 0.4, y + size * 0.6);
    ctx.closePath();
    ctx.stroke();
  } else if (enemy.type === 'HYDRA') {
    // Base body outline
    ctx.beginPath();
    ctx.ellipse(x, y + size * 0.2, size * 0.75, size * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (enemy.type === 'WORD_DESTROYER') {
    // Morphing polygon outline (reuse same shape)
    const pulse = Math.sin(t * 3) * 0.15 + 1;
    ctx.beginPath();
    const vertices = 9;
    for (let i = 0; i < vertices; i++) {
      const angle = (Math.PI * 2 * i) / vertices + t * 0.5;
      const wobbleR = size * 0.7 * pulse + Math.sin(t * 4 + i * 1.7) * size * 0.12;
      const vx = x + Math.cos(angle) * wobbleR;
      const vy = y + Math.sin(angle) * wobbleR;
      if (i === 0) ctx.moveTo(vx, vy);
      else ctx.lineTo(vx, vy);
    }
    ctx.closePath();
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.stroke();
  }

  // ── Boss Name ───────────────────────────────────────────
  if (isBoss) {
    const bossName = BOSS_NAMES[enemy.type] ?? enemy.type;
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.lineWidth = 2;
    ctx.strokeText(bossName, x, y - size - 18);
    ctx.fillStyle = '#ff8844';
    ctx.fillText(bossName, x, y - size - 18);
  }

  // ── Health bar (enhanced 3D style) ─────────────────────
  const barWidth = isBoss ? size * 3 : size * 2.5;
  const barHeight = isBoss ? 7 : 5;
  const barY = y - size - (isBoss ? 16 : 10);
  const hpRatio = enemy.hp / enemy.maxHp;

  // Bar background with depth + border
  ctx.fillStyle = '#111111';
  ctx.beginPath();
  ctx.roundRect(x - barWidth / 2 - 1, barY - 1, barWidth + 2, barHeight + 2, 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(x - barWidth / 2, barY, barWidth, barHeight);
  // Bottom depth
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(x - barWidth / 2, barY + barHeight, barWidth, 1.5);

  // HP delay bar (white ghost bar showing previous HP)
  const displayHpRatio = (enemy.displayHp ?? enemy.hp) / enemy.maxHp;
  if (displayHpRatio > hpRatio) {
    ctx.fillStyle = 'rgba(255,255,200,0.45)';
    ctx.fillRect(x - barWidth / 2, barY, barWidth * displayHpRatio, barHeight);
  }

  // HP fill with smooth gradient (green -> yellow -> red)
  if (hpRatio > 0) {
    const hpGrad = ctx.createLinearGradient(x - barWidth / 2, barY, x - barWidth / 2 + barWidth * hpRatio, barY);
    // Color interpolation based on HP ratio
    if (hpRatio > 0.6) {
      const t2 = (hpRatio - 0.6) / 0.4;
      const g = Math.floor(200 + t2 * 55);
      hpGrad.addColorStop(0, `rgb(50,${g},50)`);
      hpGrad.addColorStop(1, `rgb(80,${g},60)`);
    } else if (hpRatio > 0.3) {
      const t2 = (hpRatio - 0.3) / 0.3;
      const r = Math.floor(255 - t2 * 55);
      const g = Math.floor(200 + t2 * 55);
      hpGrad.addColorStop(0, `rgb(${r},${g},30)`);
      hpGrad.addColorStop(1, `rgb(${r + 20},${g - 30},20)`);
    } else {
      const t2 = hpRatio / 0.3;
      const g = Math.floor(50 + t2 * 100);
      hpGrad.addColorStop(0, `rgb(220,${g},30)`);
      hpGrad.addColorStop(1, `rgb(180,${Math.floor(g * 0.7)},20)`);
    }
    // Vertical brightness gradient overlay
    ctx.fillStyle = hpGrad;
    ctx.fillRect(x - barWidth / 2, barY, barWidth * hpRatio, barHeight);

    // Top highlight shine
    const shineGrad = ctx.createLinearGradient(0, barY, 0, barY + barHeight);
    shineGrad.addColorStop(0, 'rgba(255,255,255,0.3)');
    shineGrad.addColorStop(0.5, 'rgba(255,255,255,0.05)');
    shineGrad.addColorStop(1, 'rgba(0,0,0,0.1)');
    ctx.fillStyle = shineGrad;
    ctx.fillRect(x - barWidth / 2, barY, barWidth * hpRatio, barHeight);
  }

  // Bar border (rounded look)
  ctx.strokeStyle = 'rgba(0,0,0,0.8)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.roundRect(x - barWidth / 2, barY, barWidth, barHeight, 1.5);
  ctx.stroke();

  // HP percentage ticks (boss only)
  if (isBoss) {
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 0.5;
    for (let q = 0.25; q < 1; q += 0.25) {
      const tx = x - barWidth / 2 + barWidth * q;
      ctx.beginPath();
      ctx.moveTo(tx, barY);
      ctx.lineTo(tx, barY + barHeight);
      ctx.stroke();
    }
  }

  // ── Direction arrow (movement direction) ───────────────
  if (enemy.pathIndex < 100) { // has path data
    const dirLen = size * 0.6;
    // Use pathProgress direction hint: just draw a subtle arrow below
    const bobAngle = Math.sin(t * 4 + enemy.pathIndex) * 0.1;
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - dirLen * 0.3, y + size * 0.6);
    ctx.lineTo(x + dirLen * 0.3, y + size * 0.6);
    ctx.lineTo(x + dirLen * 0.15, y + size * 0.6 - 2);
    ctx.stroke();
  }

  // Status effects
  drawStatusEffects(ctx, enemy, x, y + size + 10, size);

  ctx.restore();
}

function drawStatusEffects(
  ctx: CanvasRenderingContext2D,
  enemy: { effects: { type: string }[] },
  x: number,
  y: number,
  enemySize: number
): void {
  if (enemy.effects.length === 0) return;

  const iconSize = 6;
  const spacing = 14;
  const startX = x - ((enemy.effects.length - 1) * spacing) / 2;

  const effectColors: Record<string, string[]> = {
    slow: ['#44ddee', '#2299aa'],
    poison: ['#44cc44', '#228822'],
    burn: ['#ff6633', '#cc3300'],
    freeze: ['#88eeff', '#44bbcc'],
    stun: ['#ffff44', '#cccc00'],
    weaken: ['#cc66cc', '#993399'],
  };

  for (let i = 0; i < enemy.effects.length; i++) {
    const eff = enemy.effects[i];
    const ex = startX + i * spacing;
    const [light, dark] = effectColors[eff.type] ?? ['#ffffff', '#aaaaaa'];

    // Background circle
    const grad = ctx.createRadialGradient(ex - 1, y - 1, 0, ex, y, iconSize);
    grad.addColorStop(0, light);
    grad.addColorStop(1, dark);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(ex, y, iconSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Icon character
    const icon = EFFECT_ICON_CHARS[eff.type];
    if (icon) {
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${iconSize + 2}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(icon, ex, y + 0.5);
    }
  }
}

// ── Projectile Drawing ──────────────────────────────────────

export function drawProjectile(ctx: CanvasRenderingContext2D, proj: Projectile): void {
  const { x, y } = proj.position;
  ctx.save();

  const pt = getTime();
  switch (proj.towerType) {
    case 'ARCHER': {
      // Speed lines (motion blur)
      for (let i = 1; i <= 3; i++) {
        ctx.strokeStyle = `rgba(200,170,100,${0.08 / i})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(x - 25 - i * 4, y + (i - 2) * 1.5);
        ctx.lineTo(x - 8, y);
        ctx.stroke();
      }
      // Golden energy trail
      const trailGrad = ctx.createLinearGradient(x - 22, y, x, y);
      trailGrad.addColorStop(0, 'rgba(255,215,0,0)');
      trailGrad.addColorStop(0.3, 'rgba(255,200,80,0.15)');
      trailGrad.addColorStop(0.7, 'rgba(255,180,60,0.3)');
      trailGrad.addColorStop(1, 'rgba(255,160,40,0.5)');
      ctx.strokeStyle = trailGrad;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x - 22, y);
      ctx.lineTo(x - 2, y);
      ctx.stroke();
      // Inner bright trail
      ctx.strokeStyle = 'rgba(255,240,200,0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - 18, y);
      ctx.lineTo(x - 2, y);
      ctx.stroke();
      // Arrow shaft (wooden, 3D)
      const shaftGrad = ctx.createLinearGradient(x - 8, y - 1.2, x - 8, y + 1.2);
      shaftGrad.addColorStop(0, '#e0b860');
      shaftGrad.addColorStop(0.3, '#c8a050');
      shaftGrad.addColorStop(1, '#9a7030');
      ctx.fillStyle = shaftGrad;
      ctx.fillRect(x - 8, y - 1.2, 10, 2.4);
      // Fletching (feathers at back)
      ctx.fillStyle = 'rgba(180,60,60,0.7)';
      ctx.beginPath();
      ctx.moveTo(x - 8, y);
      ctx.lineTo(x - 12, y - 3.5);
      ctx.lineTo(x - 6, y);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x - 8, y);
      ctx.lineTo(x - 12, y + 3.5);
      ctx.lineTo(x - 6, y);
      ctx.fill();
      // Arrowhead (metallic, larger)
      const headGrad = ctx.createLinearGradient(x + 2, y - 4, x + 2, y + 4);
      headGrad.addColorStop(0, '#d0d0d0');
      headGrad.addColorStop(0.3, '#f0f0f0');
      headGrad.addColorStop(0.5, '#ffffff');
      headGrad.addColorStop(0.7, '#c0c0c0');
      headGrad.addColorStop(1, '#808080');
      ctx.fillStyle = headGrad;
      ctx.beginPath();
      ctx.moveTo(x + 9, y);
      ctx.lineTo(x + 1, y - 3.5);
      ctx.lineTo(x + 2, y);
      ctx.lineTo(x + 1, y + 3.5);
      ctx.closePath();
      ctx.fill();
      // Edge highlight on arrowhead
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(x + 8.5, y - 0.5);
      ctx.lineTo(x + 1.5, y - 3);
      ctx.stroke();
      break;
    }
    case 'MAGIC': {
      // Outer energy field
      ctx.shadowColor = '#cc66ff';
      ctx.shadowBlur = 18;
      const outerGrad = ctx.createRadialGradient(x, y, 4, x, y, 14);
      outerGrad.addColorStop(0, 'rgba(200,100,255,0.3)');
      outerGrad.addColorStop(0.5, 'rgba(153,68,221,0.12)');
      outerGrad.addColorStop(1, 'rgba(100,0,200,0)');
      ctx.fillStyle = outerGrad;
      ctx.beginPath();
      ctx.arc(x, y, 14, 0, Math.PI * 2);
      ctx.fill();
      // Swirling energy ring
      ctx.strokeStyle = 'rgba(200,150,255,0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(x, y, 9, 5, pt * 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,200,255,0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(x, y, 7, 4, -pt * 2, 0, Math.PI * 2);
      ctx.stroke();
      // Core orb (bigger, more layers)
      const grad = ctx.createRadialGradient(x - 1, y - 1, 0, x, y, 8);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.2, '#eeccff');
      grad.addColorStop(0.4, '#dd88ff');
      grad.addColorStop(0.7, '#cc66ff');
      grad.addColorStop(1, 'rgba(153,68,221,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fill();
      // Specular highlight on orb
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      ctx.ellipse(x - 2, y - 2.5, 2.5, 1.5, -0.4, 0, Math.PI * 2);
      ctx.fill();
      // Energy particle trail (more particles, helical)
      for (let i = 1; i <= 6; i++) {
        const trailX = x - i * 4.5;
        const trailY = y + Math.sin(pt * 8 + i * 1.5) * 3.5;
        const alpha = 0.5 / i;
        const r = 3 / i;
        const hue = 270 + Math.sin(pt * 5 + i) * 30;
        ctx.fillStyle = `hsla(${hue}, 80%, 70%, ${alpha})`;
        ctx.beginPath();
        ctx.arc(trailX, trailY, r, 0, Math.PI * 2);
        ctx.fill();
      }
      // Orbiting sparkles (more, larger)
      for (let i = 0; i < 5; i++) {
        const angle = pt * 6 + i * 1.26;
        const dist = 6 + Math.sin(pt * 3 + i) * 2;
        const sparkAlpha = 0.4 + Math.sin(pt * 10 + i) * 0.3;
        ctx.fillStyle = `rgba(255,220,255,${sparkAlpha})`;
        ctx.beginPath();
        ctx.arc(x + Math.cos(angle) * dist, y + Math.sin(angle) * dist, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      break;
    }
    case 'CANNON': {
      // Fire trail behind cannonball
      const fireTrailGrad = ctx.createRadialGradient(x - 6, y, 0, x - 6, y, 10);
      fireTrailGrad.addColorStop(0, 'rgba(255,200,50,0.4)');
      fireTrailGrad.addColorStop(0.5, 'rgba(255,100,20,0.15)');
      fireTrailGrad.addColorStop(1, 'rgba(200,50,0,0)');
      ctx.fillStyle = fireTrailGrad;
      ctx.beginPath();
      ctx.arc(x - 6, y, 10, 0, Math.PI * 2);
      ctx.fill();
      // Smoke trail puffs (volumetric)
      for (let i = 1; i <= 5; i++) {
        const sx = x - i * 5.5;
        const sy = y - i * 2 + Math.sin(pt * 4 + i * 2) * 1.5;
        const sa = 0.2 / i;
        const sr = 3 + i * 2;
        const smokeGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr);
        smokeGrad.addColorStop(0, `rgba(180,170,160,${sa})`);
        smokeGrad.addColorStop(1, `rgba(120,115,110,0)`);
        ctx.fillStyle = smokeGrad;
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fill();
      }
      // Metal cannonball (bigger, more metallic)
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetY = 2;
      const grad = ctx.createRadialGradient(x - 2.5, y - 2.5, 0, x, y, 7);
      grad.addColorStop(0, '#cccccc');
      grad.addColorStop(0.3, '#999999');
      grad.addColorStop(0.6, '#666666');
      grad.addColorStop(1, '#222222');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      // Metal rim reflection
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(x, y, 6.5, Math.PI * 1.1, Math.PI * 1.7);
      ctx.stroke();
      // Specular highlight (bright, sharp)
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath();
      ctx.ellipse(x - 2, y - 2.5, 2.5, 1.5, -0.3, 0, Math.PI * 2);
      ctx.fill();
      // Secondary specular
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.beginPath();
      ctx.ellipse(x + 1.5, y + 2, 1.2, 0.8, 0.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'ICE': {
      // Frost aura field
      ctx.shadowColor = '#44ddee';
      ctx.shadowBlur = 16;
      const auraGrad = ctx.createRadialGradient(x, y, 3, x, y, 16);
      auraGrad.addColorStop(0, 'rgba(150,230,255,0.2)');
      auraGrad.addColorStop(0.5, 'rgba(100,200,240,0.08)');
      auraGrad.addColorStop(1, 'rgba(68,221,238,0)');
      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(x, y, 16, 0, Math.PI * 2);
      ctx.fill();
      // Crystalline shard body (spinning 8-pointed star, bigger)
      const crystalGrad = ctx.createRadialGradient(x - 1, y - 1, 0, x, y, 9);
      crystalGrad.addColorStop(0, '#ffffff');
      crystalGrad.addColorStop(0.3, '#ddf4ff');
      crystalGrad.addColorStop(0.6, '#88ddff');
      crystalGrad.addColorStop(1, 'rgba(68,221,238,0.1)');
      ctx.fillStyle = crystalGrad;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 * i) / 8 + pt * 2;
        const r = i % 2 === 0 ? 9 : 4;
        const px = x + Math.cos(angle) * r;
        const py = y + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      // Inner crystal facet highlight
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath();
      const a0 = pt * 2;
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a0) * 8, y + Math.sin(a0) * 8);
      ctx.lineTo(x + Math.cos(a0 + Math.PI / 4) * 3.5, y + Math.sin(a0 + Math.PI / 4) * 3.5);
      ctx.closePath();
      ctx.fill();
      // Snowflake microparticles in trail
      for (let i = 1; i <= 4; i++) {
        const tx = x - i * 5;
        const ty = y + Math.sin(pt * 6 + i * 1.8) * 2.5;
        const tAlpha = 0.35 / i;
        const tSize = 3.5 / i;
        ctx.fillStyle = `rgba(200,240,255,${tAlpha})`;
        ctx.beginPath();
        ctx.arc(tx, ty, tSize, 0, Math.PI * 2);
        ctx.fill();
        // Tiny cross for snowflake
        if (i <= 2) {
          ctx.strokeStyle = `rgba(255,255,255,${tAlpha * 0.6})`;
          ctx.lineWidth = 0.4;
          ctx.beginPath();
          ctx.moveTo(tx - tSize, ty); ctx.lineTo(tx + tSize, ty);
          ctx.moveTo(tx, ty - tSize); ctx.lineTo(tx, ty + tSize);
          ctx.stroke();
        }
      }
      ctx.shadowBlur = 0;
      break;
    }
    case 'POISON': {
      // Toxic mist aura
      ctx.shadowColor = '#44cc44';
      ctx.shadowBlur = 14;
      const mistGrad = ctx.createRadialGradient(x, y, 2, x, y, 12);
      mistGrad.addColorStop(0, 'rgba(100,255,100,0.15)');
      mistGrad.addColorStop(0.6, 'rgba(68,200,68,0.06)');
      mistGrad.addColorStop(1, 'rgba(40,160,40,0)');
      ctx.fillStyle = mistGrad;
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, Math.PI * 2);
      ctx.fill();
      // Core glob (bigger, bubbling)
      const wobble = Math.sin(pt * 12) * 0.8;
      const grad = ctx.createRadialGradient(x - 1, y - 1, 0, x, y, 7);
      grad.addColorStop(0, '#ccffcc');
      grad.addColorStop(0.3, '#88ff88');
      grad.addColorStop(0.6, '#44dd44');
      grad.addColorStop(1, 'rgba(40,180,40,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, 7 + wobble, 0, Math.PI * 2);
      ctx.fill();
      // Bubble highlights
      ctx.fillStyle = 'rgba(200,255,200,0.4)';
      ctx.beginPath();
      ctx.ellipse(x - 1.5, y - 2, 2, 1.2, -0.3, 0, Math.PI * 2);
      ctx.fill();
      // Dripping acid trail
      for (let i = 1; i <= 5; i++) {
        const dx = x - i * 4;
        const dy = y + i * 2.5 + Math.sin(pt * 5 + i * 1.3) * 2;
        const da = 0.4 / i;
        const dr = 3 / i;
        ctx.fillStyle = `rgba(68,220,68,${da})`;
        ctx.beginPath();
        // Teardrop shape for drips
        ctx.arc(dx, dy, dr, 0, Math.PI * 2);
        ctx.fill();
        if (i <= 2) {
          ctx.fillStyle = `rgba(68,220,68,${da * 0.5})`;
          ctx.beginPath();
          ctx.moveTo(dx, dy - dr * 1.5);
          ctx.quadraticCurveTo(dx + dr, dy, dx, dy + dr);
          ctx.quadraticCurveTo(dx - dr, dy, dx, dy - dr * 1.5);
          ctx.fill();
        }
      }
      ctx.shadowBlur = 0;
      break;
    }
    case 'LIGHTNING': {
      // Electric field aura
      ctx.shadowColor = '#ffee44';
      ctx.shadowBlur = 22;
      const fieldGrad = ctx.createRadialGradient(x, y, 2, x, y, 18);
      fieldGrad.addColorStop(0, 'rgba(255,255,200,0.25)');
      fieldGrad.addColorStop(0.4, 'rgba(255,255,100,0.08)');
      fieldGrad.addColorStop(1, 'rgba(255,238,68,0)');
      ctx.fillStyle = fieldGrad;
      ctx.beginPath();
      ctx.arc(x, y, 18, 0, Math.PI * 2);
      ctx.fill();
      // Bright energy core
      const coreGrad = ctx.createRadialGradient(x, y, 0, x, y, 6);
      coreGrad.addColorStop(0, '#ffffff');
      coreGrad.addColorStop(0.3, '#ffffcc');
      coreGrad.addColorStop(0.7, '#ffee44');
      coreGrad.addColorStop(1, 'rgba(255,238,68,0)');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
      // Primary lightning bolt (thick, jagged, bright)
      ctx.strokeStyle = 'rgba(255,255,150,0.95)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x - 10, y - 7);
      ctx.lineTo(x - 3, y - 2);
      ctx.lineTo(x - 7, y + 1);
      ctx.lineTo(x + 1, y + 2);
      ctx.lineTo(x - 2, y + 5);
      ctx.lineTo(x + 8, y + 8);
      ctx.stroke();
      // Secondary bolt (branching)
      ctx.strokeStyle = 'rgba(255,255,200,0.6)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x - 3, y - 2);
      ctx.lineTo(x + 4, y - 5);
      ctx.lineTo(x + 7, y - 2);
      ctx.stroke();
      // Third bolt (thin, electric)
      ctx.strokeStyle = 'rgba(200,200,255,0.4)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(x + 1, y + 2);
      ctx.lineTo(x + 6, y);
      ctx.lineTo(x + 10, y + 3);
      ctx.stroke();
      // Electric sparks at tips
      const sparkCount = 4;
      for (let i = 0; i < sparkCount; i++) {
        const sa = pt * 15 + i * 3;
        const sr = 8 + Math.sin(pt * 8 + i) * 4;
        const sx = x + Math.cos(sa) * sr;
        const sy = y + Math.sin(sa) * sr;
        ctx.fillStyle = `rgba(255,255,200,${0.3 + Math.sin(pt * 12 + i * 2) * 0.2})`;
        ctx.beginPath();
        ctx.arc(sx, sy, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      break;
    }
    case 'SNIPER': {
      // Long laser-like tracer trail
      const trailGrad = ctx.createLinearGradient(x - 35, y, x, y);
      trailGrad.addColorStop(0, 'rgba(255,100,100,0)');
      trailGrad.addColorStop(0.3, 'rgba(255,150,150,0.05)');
      trailGrad.addColorStop(0.7, 'rgba(255,200,200,0.2)');
      trailGrad.addColorStop(1, 'rgba(255,255,255,0.5)');
      ctx.strokeStyle = trailGrad;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 35, y);
      ctx.lineTo(x, y);
      ctx.stroke();
      // Inner bright trail
      const innerTrail = ctx.createLinearGradient(x - 25, y, x, y);
      innerTrail.addColorStop(0, 'rgba(255,255,255,0)');
      innerTrail.addColorStop(0.5, 'rgba(255,255,255,0.15)');
      innerTrail.addColorStop(1, 'rgba(255,255,255,0.6)');
      ctx.strokeStyle = innerTrail;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(x - 25, y);
      ctx.lineTo(x, y);
      ctx.stroke();
      // Bullet core (elongated, bright)
      ctx.shadowColor = '#ff4444';
      ctx.shadowBlur = 8;
      const bGrad = ctx.createLinearGradient(x - 5, y - 2, x + 5, y + 2);
      bGrad.addColorStop(0, 'rgba(255,200,150,0)');
      bGrad.addColorStop(0.3, '#ffeecc');
      bGrad.addColorStop(0.5, '#ffffff');
      bGrad.addColorStop(0.7, '#ffeecc');
      bGrad.addColorStop(1, 'rgba(255,200,150,0)');
      ctx.fillStyle = bGrad;
      ctx.beginPath();
      ctx.ellipse(x, y, 8, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      // Red tip glow
      const tipGrad = ctx.createRadialGradient(x + 3, y, 0, x + 3, y, 3);
      tipGrad.addColorStop(0, 'rgba(255,100,100,0.5)');
      tipGrad.addColorStop(1, 'rgba(255,50,50,0)');
      ctx.fillStyle = tipGrad;
      ctx.beginPath();
      ctx.arc(x + 3, y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      break;
    }
    case 'FLAME': {
      // Heat distortion aura
      ctx.shadowColor = '#ff6600';
      ctx.shadowBlur = 16;
      const heatGrad = ctx.createRadialGradient(x, y, 4, x, y, 18);
      heatGrad.addColorStop(0, 'rgba(255,150,50,0.15)');
      heatGrad.addColorStop(0.5, 'rgba(255,80,20,0.05)');
      heatGrad.addColorStop(1, 'rgba(200,30,0,0)');
      ctx.fillStyle = heatGrad;
      ctx.beginPath();
      ctx.arc(x, y, 18, 0, Math.PI * 2);
      ctx.fill();
      // Fireball core (bigger, multi-layer)
      const grad = ctx.createRadialGradient(x - 1, y - 1, 0, x, y, 11);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.1, '#ffffcc');
      grad.addColorStop(0.25, '#ffff66');
      grad.addColorStop(0.45, '#ff8833');
      grad.addColorStop(0.7, '#cc3300');
      grad.addColorStop(1, 'rgba(200,30,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, 11, 0, Math.PI * 2);
      ctx.fill();
      // Flickering flame tongues
      for (let i = 0; i < 4; i++) {
        const flameAngle = pt * 8 + i * 1.57;
        const flameLen = 5 + Math.sin(pt * 12 + i * 3) * 3;
        const fx = x + Math.cos(flameAngle) * flameLen;
        const fy = y + Math.sin(flameAngle) * flameLen;
        const fGrad = ctx.createRadialGradient(fx, fy, 0, fx, fy, 4);
        fGrad.addColorStop(0, 'rgba(255,200,50,0.4)');
        fGrad.addColorStop(1, 'rgba(255,100,0,0)');
        ctx.fillStyle = fGrad;
        ctx.beginPath();
        ctx.arc(fx, fy, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      // Ember shower trail
      for (let i = 1; i <= 6; i++) {
        const ex = x - i * 4;
        const ey = y - i * 2 + Math.sin(pt * 10 + i * 2) * 2.5;
        const ea = 0.5 / i;
        const er = 2.5 / (i * 0.5);
        ctx.fillStyle = `rgba(255,${80 + i * 25},${20 + i * 8},${ea})`;
        ctx.beginPath();
        ctx.arc(ex, ey, er, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      break;
    }
    case 'WORD': {
      const time = pt;
      const hue = (time * 60) % 360;
      // Rainbow aura
      ctx.shadowColor = `hsl(${hue}, 80%, 60%)`;
      ctx.shadowBlur = 18;
      const aura = ctx.createRadialGradient(x, y, 3, x, y, 14);
      aura.addColorStop(0, `hsla(${hue}, 90%, 70%, 0.25)`);
      aura.addColorStop(0.5, `hsla(${(hue + 60) % 360}, 80%, 60%, 0.08)`);
      aura.addColorStop(1, `hsla(${(hue + 120) % 360}, 70%, 50%, 0)`);
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(x, y, 14, 0, Math.PI * 2);
      ctx.fill();
      // Rainbow ring
      ctx.strokeStyle = `hsla(${(hue + 90) % 360}, 80%, 65%, 0.3)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(x, y, 8, 4, time * 2, 0, Math.PI * 2);
      ctx.stroke();
      // Core orb (bigger)
      const grad = ctx.createRadialGradient(x - 1, y - 1, 0, x, y, 8);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, `hsl(${hue}, 90%, 80%)`);
      grad.addColorStop(0.6, `hsl(${hue}, 80%, 60%)`);
      grad.addColorStop(1, `hsla(${hue}, 80%, 40%, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fill();
      // Specular
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.beginPath();
      ctx.ellipse(x - 2, y - 2.5, 2.5, 1.5, -0.3, 0, Math.PI * 2);
      ctx.fill();
      // Rainbow trail (more particles)
      for (let i = 1; i <= 5; i++) {
        const tHue = (hue - i * 35 + 360) % 360;
        const ty = y + Math.sin(time * 6 + i * 1.5) * 2;
        ctx.fillStyle = `hsla(${tHue}, 85%, 65%, ${0.4 / i})`;
        ctx.beginPath();
        ctx.arc(x - i * 4.5, ty, 3.5 / i, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      break;
    }
    default: {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }

  ctx.restore();
}

// ── Effects Drawing ─────────────────────────────────────────

export function drawEffects(ctx: CanvasRenderingContext2D, effects: VisualEffect[]): void {
  ctx.save();

  for (const effect of effects) {
    const progress = effect.elapsed / effect.duration;
    const alpha = 1 - progress;
    const { x, y } = effect.position;

    switch (effect.type) {
      case 'explosion': {
        const r = effect.radius * (0.4 + progress * 0.6);

        // Ground scorching (persistent dark mark)
        if (progress < 0.8) {
          ctx.fillStyle = `rgba(40,20,0,${alpha * 0.15})`;
          ctx.beginPath();
          ctx.ellipse(x, y + r * 0.2, r * 0.8, r * 0.3, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        // Outer shockwave ring (expanding fast)
        const shockR = r * (1 + progress * 1.2);
        ctx.strokeStyle = `rgba(255,200,100,${alpha * 0.35})`;
        ctx.lineWidth = 3 * (1 - progress);
        ctx.beginPath();
        ctx.arc(x, y, shockR, 0, Math.PI * 2);
        ctx.stroke();
        // Second inner shockwave
        ctx.strokeStyle = `rgba(255,150,50,${alpha * 0.25})`;
        ctx.lineWidth = 2 * (1 - progress);
        ctx.beginPath();
        ctx.arc(x, y, shockR * 0.7, 0, Math.PI * 2);
        ctx.stroke();

        // Core explosion (multi-layer)
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, `rgba(255,255,240,${alpha})`);
        grad.addColorStop(0.15, `rgba(255,255,150,${alpha * 0.9})`);
        grad.addColorStop(0.35, `rgba(255,200,50,${alpha * 0.7})`);
        grad.addColorStop(0.6, `rgba(255,100,20,${alpha * 0.4})`);
        grad.addColorStop(0.85, `rgba(200,50,0,${alpha * 0.15})`);
        grad.addColorStop(1, 'rgba(100,20,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();

        // Bright flash at center (early phase)
        if (progress < 0.3) {
          const flashAlpha = (0.3 - progress) / 0.3;
          ctx.fillStyle = `rgba(255,255,255,${flashAlpha * 0.6})`;
          ctx.beginPath();
          ctx.arc(x, y, r * 0.4, 0, Math.PI * 2);
          ctx.fill();
        }

        // Debris/spark particles (more, varied sizes)
        for (let i = 0; i < 10; i++) {
          const angle = (Math.PI * 2 * i) / 10 + progress * 0.5 + i * 0.3;
          const dist = r * progress * (1.2 + Math.sin(i * 1.7) * 0.3);
          const px = x + Math.cos(angle) * dist;
          const py = y + Math.sin(angle) * dist - progress * 3;
          const sparkSize = (2.5 - i * 0.15) * (1 - progress);
          const sparkAlpha = alpha * (0.7 - i * 0.05);
          if (sparkAlpha > 0 && sparkSize > 0.2) {
            const sparkGrad = ctx.createRadialGradient(px, py, 0, px, py, sparkSize * 1.5);
            sparkGrad.addColorStop(0, `rgba(255,200,80,${sparkAlpha})`);
            sparkGrad.addColorStop(1, `rgba(255,100,30,0)`);
            ctx.fillStyle = sparkGrad;
            ctx.beginPath();
            ctx.arc(px, py, sparkSize * 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Rising smoke wisps (late phase)
        if (progress > 0.3) {
          for (let i = 0; i < 3; i++) {
            const sx = x + (i - 1) * r * 0.3;
            const sy = y - progress * r * 0.8 - i * 3;
            const smokeAlpha = alpha * 0.12;
            const smokeR = r * 0.25 + progress * r * 0.2;
            ctx.fillStyle = `rgba(80,70,60,${smokeAlpha})`;
            ctx.beginPath();
            ctx.arc(sx, sy, smokeR, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        break;
      }

      case 'lightning': {
        ctx.shadowColor = '#ffff44';
        ctx.shadowBlur = 18;

        // Bright flash at impact point (early)
        if (progress < 0.4) {
          const flashA = (0.4 - progress) / 0.4;
          ctx.fillStyle = `rgba(255,255,220,${flashA * 0.4})`;
          ctx.beginPath();
          ctx.arc(x, y, effect.radius * 0.6, 0, Math.PI * 2);
          ctx.fill();
        }

        // Ground scorch circle
        ctx.fillStyle = `rgba(255,255,100,${alpha * 0.08})`;
        ctx.beginPath();
        ctx.ellipse(x, y + effect.radius * 0.15, effect.radius * 0.5, effect.radius * 0.15, 0, 0, Math.PI * 2);
        ctx.fill();

        // Multiple lightning bolts (deterministic, no random)
        for (let i = 0; i < 4; i++) {
          const boltAlpha = alpha * (0.9 - i * 0.15);
          ctx.strokeStyle = `rgba(255,255,${150 + i * 25},${boltAlpha})`;
          ctx.lineWidth = 2.5 - i * 0.4;
          ctx.beginPath();
          ctx.moveTo(x, y - effect.radius);
          let cy = y - effect.radius;
          const seed = progress * 100 + i * 17;
          let step = 0;
          while (cy < y + effect.radius) {
            step++;
            const nx = x + Math.sin(seed + step * 4.7 + i * 2.3) * effect.radius * (0.4 + i * 0.1);
            cy += effect.radius * 0.25 + Math.abs(Math.sin(seed + step * 3.1)) * effect.radius * 0.2;
            ctx.lineTo(nx, Math.min(cy, y + effect.radius));
          }
          ctx.stroke();
        }

        // Electric sparks radiating outward
        for (let i = 0; i < 6; i++) {
          const sa = (Math.PI * 2 * i) / 6 + progress * 2;
          const sd = effect.radius * progress * 0.8;
          const sx = x + Math.cos(sa) * sd;
          const sy = y + Math.sin(sa) * sd;
          ctx.fillStyle = `rgba(255,255,200,${alpha * 0.5})`;
          ctx.beginPath();
          ctx.arc(sx, sy, 1.5 * (1 - progress), 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.shadowBlur = 0;
        break;
      }

      case 'ice': {
        const r = effect.radius * (0.3 + progress * 0.7);

        // Ground frost circle (persistent feel)
        ctx.fillStyle = `rgba(180,230,255,${alpha * 0.1})`;
        ctx.beginPath();
        ctx.ellipse(x, y + r * 0.15, r * 1.1, r * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();

        // Frost burst field (multi-layer)
        const iceGrad = ctx.createRadialGradient(x, y, 0, x, y, r);
        iceGrad.addColorStop(0, `rgba(200,240,255,${alpha * 0.5})`);
        iceGrad.addColorStop(0.3, `rgba(150,220,255,${alpha * 0.3})`);
        iceGrad.addColorStop(0.7, `rgba(100,200,255,${alpha * 0.1})`);
        iceGrad.addColorStop(1, 'rgba(80,180,255,0)');
        ctx.fillStyle = iceGrad;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();

        // Ice crystal spikes radiating outward
        for (let i = 0; i < 8; i++) {
          const angle = (Math.PI * 2 * i) / 8 + progress * 1.5;
          const cr = r * (0.5 + progress * 0.3);
          const tipX = x + cr * Math.cos(angle);
          const tipY = y + cr * Math.sin(angle);
          // Crystal spike (diamond shape)
          ctx.fillStyle = `rgba(200,240,255,${alpha * 0.6})`;
          ctx.beginPath();
          ctx.moveTo(x + cr * 0.2 * Math.cos(angle), y + cr * 0.2 * Math.sin(angle));
          ctx.lineTo(tipX + 2 * Math.cos(angle + Math.PI / 2), tipY + 2 * Math.sin(angle + Math.PI / 2));
          ctx.lineTo(tipX + 3 * Math.cos(angle), tipY + 3 * Math.sin(angle));
          ctx.lineTo(tipX + 2 * Math.cos(angle - Math.PI / 2), tipY + 2 * Math.sin(angle - Math.PI / 2));
          ctx.closePath();
          ctx.fill();
          // Crystal highlight
          ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.4})`;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(x + cr * 0.3 * Math.cos(angle), y + cr * 0.3 * Math.sin(angle));
          ctx.lineTo(tipX + 2 * Math.cos(angle), tipY + 2 * Math.sin(angle));
          ctx.stroke();
        }

        // Snowflake particles drifting
        for (let i = 0; i < 6; i++) {
          const pAngle = (Math.PI * 2 * i) / 6 + progress * 3;
          const pDist = r * progress * 0.9;
          const px = x + Math.cos(pAngle) * pDist;
          const py = y + Math.sin(pAngle) * pDist - progress * 4;
          const pSize = 2 * (1 - progress);
          if (pSize > 0.3) {
            ctx.fillStyle = `rgba(220,245,255,${alpha * 0.5})`;
            ctx.beginPath();
            ctx.arc(px, py, pSize, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Central bright flash (early)
        if (progress < 0.25) {
          const flashA = (0.25 - progress) / 0.25;
          ctx.fillStyle = `rgba(220,245,255,${flashA * 0.4})`;
          ctx.beginPath();
          ctx.arc(x, y, r * 0.3, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }

      case 'poison_cloud': {
        const r = effect.radius * (0.5 + progress * 0.5);
        for (let i = 0; i < 5; i++) {
          const ox = Math.sin(i * 1.3 + progress * 3) * r * 0.3;
          const oy = Math.cos(i * 1.7 + progress * 2) * r * 0.3;
          const cr = r * (0.3 + Math.sin(i + progress * 4) * 0.15);

          const cloudGrad = ctx.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, cr);
          cloudGrad.addColorStop(0, `rgba(80,200,80,${alpha * 0.3})`);
          cloudGrad.addColorStop(1, 'rgba(80,200,80,0)');
          ctx.fillStyle = cloudGrad;
          ctx.beginPath();
          ctx.arc(x + ox, y + oy, cr, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }

      case 'heal': {
        const r = effect.radius * progress;

        // Healing ring
        const healGrad = ctx.createRadialGradient(x, y, r * 0.8, x, y, r);
        healGrad.addColorStop(0, 'rgba(100,255,100,0)');
        healGrad.addColorStop(0.5, `rgba(100,255,100,${alpha * 0.4})`);
        healGrad.addColorStop(1, 'rgba(100,255,100,0)');
        ctx.fillStyle = healGrad;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();

        // Plus signs floating up
        ctx.fillStyle = `rgba(100,255,100,${alpha})`;
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('+', x, y - r * 0.5 - progress * 15);
        ctx.fillText('+', x - r * 0.3, y - progress * 20);
        break;
      }

      case 'flame': {
        const r = effect.radius * (0.4 + progress * 0.6);

        // Ground scorch
        ctx.fillStyle = `rgba(40,15,0,${alpha * 0.12})`;
        ctx.beginPath();
        ctx.ellipse(x, y + r * 0.2, r * 0.9, r * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();

        // Heat wave ring
        ctx.strokeStyle = `rgba(255,150,50,${alpha * 0.2})`;
        ctx.lineWidth = 2 * (1 - progress);
        ctx.beginPath();
        ctx.arc(x, y, r * 1.3, 0, Math.PI * 2);
        ctx.stroke();

        // Core fire burst (multi-layer)
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, `rgba(255,255,220,${alpha * 0.9})`);
        grad.addColorStop(0.15, `rgba(255,255,100,${alpha * 0.7})`);
        grad.addColorStop(0.35, `rgba(255,180,30,${alpha * 0.5})`);
        grad.addColorStop(0.6, `rgba(255,80,0,${alpha * 0.3})`);
        grad.addColorStop(0.85, `rgba(180,30,0,${alpha * 0.1})`);
        grad.addColorStop(1, 'rgba(100,10,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();

        // Flash at center (early)
        if (progress < 0.2) {
          const flashA = (0.2 - progress) / 0.2;
          ctx.fillStyle = `rgba(255,255,255,${flashA * 0.5})`;
          ctx.beginPath();
          ctx.arc(x, y, r * 0.3, 0, Math.PI * 2);
          ctx.fill();
        }

        // Rising fire tongues
        for (let i = 0; i < 5; i++) {
          const angle = (Math.PI * 2 * i) / 5 + progress * 2;
          const dist = r * 0.5 * progress;
          const fx = x + Math.cos(angle) * dist;
          const fy = y + Math.sin(angle) * dist - progress * r * 0.6;
          const fSize = r * 0.25 * (1 - progress);
          if (fSize > 0.5) {
            const fGrad = ctx.createRadialGradient(fx, fy, 0, fx, fy, fSize);
            fGrad.addColorStop(0, `rgba(255,220,80,${alpha * 0.5})`);
            fGrad.addColorStop(1, `rgba(255,80,0,0)`);
            ctx.fillStyle = fGrad;
            ctx.beginPath();
            ctx.arc(fx, fy, fSize, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Ember shower (more particles, rising)
        for (let i = 0; i < 8; i++) {
          const eAngle = (Math.PI * 2 * i) / 8 + progress * 3 + i * 0.5;
          const eDist = r * progress * (0.8 + Math.sin(i * 2.1) * 0.3);
          const ex = x + Math.cos(eAngle) * eDist;
          const ey = y + Math.sin(eAngle) * eDist - progress * 12;
          const eSize = 1.8 * (1 - progress);
          if (eSize > 0.3) {
            ctx.fillStyle = `rgba(255,${150 + i * 12},50,${alpha * 0.5})`;
            ctx.beginPath();
            ctx.arc(ex, ey, eSize, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        break;
      }

      case 'merge': {
        // Bright merge flash (early)
        if (progress < 0.2) {
          const fA = (0.2 - progress) / 0.2;
          ctx.fillStyle = `rgba(220,200,255,${fA * 0.5})`;
          ctx.beginPath();
          ctx.arc(x, y, effect.radius * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Expanding magic circle
        const circR = effect.radius * progress * 1.3;
        ctx.strokeStyle = `rgba(200,150,255,${alpha * 0.4})`;
        ctx.lineWidth = 2 * (1 - progress);
        ctx.beginPath();
        ctx.arc(x, y, circR, 0, Math.PI * 2);
        ctx.stroke();

        // Spiral sparkle burst
        const grad = ctx.createRadialGradient(x, y, 0, x, y, effect.radius * progress);
        grad.addColorStop(0, `rgba(220,180,255,${alpha * 0.3})`);
        grad.addColorStop(0.5, `rgba(180,120,255,${alpha * 0.15})`);
        grad.addColorStop(1, 'rgba(150,80,255,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, effect.radius * progress, 0, Math.PI * 2);
        ctx.fill();

        // Star particles (12, spiraling)
        for (let i = 0; i < 12; i++) {
          const angle = (Math.PI * 2 * i) / 12 + progress * 4;
          const dist = effect.radius * progress * (0.8 + Math.sin(i * 1.3) * 0.3);
          const px = x + dist * Math.cos(angle);
          const py = y + dist * Math.sin(angle);
          const pSize = 3 * (1 - progress);
          if (pSize > 0.3) {
            const pGrad = ctx.createRadialGradient(px, py, 0, px, py, pSize * 1.5);
            pGrad.addColorStop(0, `rgba(255,220,255,${alpha})`);
            pGrad.addColorStop(1, `rgba(180,100,255,0)`);
            ctx.fillStyle = pGrad;
            ctx.beginPath();
            ctx.arc(px, py, pSize * 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        break;
      }

      case 'death': {
        // Dark soul-departure burst
        const soulGrad = ctx.createRadialGradient(x, y, 0, x, y, effect.radius * progress);
        soulGrad.addColorStop(0, `rgba(80,0,0,${alpha * 0.2})`);
        soulGrad.addColorStop(0.5, `rgba(150,50,50,${alpha * 0.1})`);
        soulGrad.addColorStop(1, 'rgba(100,0,0,0)');
        ctx.fillStyle = soulGrad;
        ctx.beginPath();
        ctx.arc(x, y, effect.radius * progress * 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Red energy particles (more, varied)
        for (let i = 0; i < 12; i++) {
          const angle = (Math.PI * 2 * i) / 12 + progress * 2.5;
          const dist = effect.radius * progress * (1.5 + Math.sin(i * 1.3) * 0.5);
          const px = x + dist * Math.cos(angle);
          const py = y + dist * Math.sin(angle) - progress * 8;
          const pAlpha = alpha * (0.7 - i * 0.04);
          const pSize = (3.5 - i * 0.15) * (1 - progress);

          if (pAlpha > 0 && pSize > 0.3) {
            const pGrad = ctx.createRadialGradient(px, py, 0, px, py, pSize * 1.5);
            pGrad.addColorStop(0, `rgba(255,120,120,${pAlpha})`);
            pGrad.addColorStop(0.5, `rgba(255,60,60,${pAlpha * 0.5})`);
            pGrad.addColorStop(1, 'rgba(200,30,30,0)');
            ctx.fillStyle = pGrad;
            ctx.beginPath();
            ctx.arc(px, py, pSize * 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Skull-like flash at center (very early)
        if (progress < 0.15) {
          const flashA = (0.15 - progress) / 0.15;
          ctx.fillStyle = `rgba(255,200,200,${flashA * 0.5})`;
          ctx.beginPath();
          ctx.arc(x, y, effect.radius * 0.4, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
    }
  }

  ctx.restore();
}

// ── Damage Text Drawing ─────────────────────────────────────

export function drawDamageTexts(ctx: CanvasRenderingContext2D, texts: DamageText[]): void {
  ctx.save();

  for (const text of texts) {
    const progress = text.elapsed / text.duration;
    const alpha = Math.min(1, 1.2 - progress * 1.2); // Fade starts slightly later
    const scale = text.isCrit
      ? 1.4 + Math.max(0, (0.3 - progress) * 1.5) // Pop-in effect for crits
      : 1 + Math.max(0, (0.15 - progress) * 2); // Subtle pop for normal

    if (alpha <= 0) continue;
    ctx.globalAlpha = alpha;

    const fontSize = text.isCrit ? 18 : 13;
    ctx.font = `bold ${Math.round(fontSize * scale)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const tx = text.position.x;
    const ty = text.position.y;

    // Drop shadow (deeper)
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillText(text.text, tx + 1.5, ty + 1.5);

    // Thick outline
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.lineWidth = 3.5;
    ctx.lineJoin = 'round';
    ctx.strokeText(text.text, tx, ty);

    // Main fill
    ctx.fillStyle = text.color;
    ctx.fillText(text.text, tx, ty);

    // Inner highlight (top half lighter)
    ctx.save();
    ctx.beginPath();
    ctx.rect(tx - 50, ty - 20, 100, 10);
    ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillText(text.text, tx, ty);
    ctx.restore();

    // Crit glow + starburst
    if (text.isCrit) {
      ctx.shadowColor = text.color;
      ctx.shadowBlur = 12;
      ctx.fillStyle = text.color;
      ctx.fillText(text.text, tx, ty);
      ctx.shadowBlur = 0;

      // Starburst rays on early crit
      if (progress < 0.3) {
        const rayAlpha = (0.3 - progress) / 0.3 * alpha * 0.3;
        ctx.strokeStyle = `rgba(255,255,200,${rayAlpha})`;
        ctx.lineWidth = 1;
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI * 2 * i) / 6;
          const len = fontSize * scale * 0.8;
          ctx.beginPath();
          ctx.moveTo(tx + Math.cos(angle) * len * 0.3, ty + Math.sin(angle) * len * 0.3);
          ctx.lineTo(tx + Math.cos(angle) * len, ty + Math.sin(angle) * len);
          ctx.stroke();
        }
      }
    }
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}

// ── UI Overlay ──────────────────────────────────────────────

export function drawUIOverlay(ctx: CanvasRenderingContext2D, engine: GameEngine): void {
  ctx.save();

  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;
  const t = getTime();

  // Auto-trigger wave announce when wave changes
  const currentWave = engine.getCurrentWave();
  if (currentWave !== _lastRenderedWave && currentWave >= 0) {
    _lastRenderedWave = currentWave;
    // Check if this is a boss wave (simple heuristic: every 5th or 10th)
    const isBossWave = (currentWave + 1) % 10 === 0 || (currentWave + 1) % 5 === 0;
    triggerWaveAnnounce(currentWave + 1, isBossWave);
  }

  // Wave indicator (top center) - 3D pill shape
  const waveText = `Wave ${currentWave + 1} / ${engine.getWaveCount()}`;
  const pillW = 130;
  const pillH = 24;
  const pillX = cw / 2 - pillW / 2;
  const pillY = 5;
  const pillR = pillH / 2;

  // Pill background
  const pillGrad = ctx.createLinearGradient(0, pillY, 0, pillY + pillH);
  pillGrad.addColorStop(0, 'rgba(40,40,60,0.8)');
  pillGrad.addColorStop(1, 'rgba(20,20,40,0.9)');
  ctx.fillStyle = pillGrad;
  ctx.beginPath();
  ctx.moveTo(pillX + pillR, pillY);
  ctx.lineTo(pillX + pillW - pillR, pillY);
  ctx.arc(pillX + pillW - pillR, pillY + pillR, pillR, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(pillX + pillR, pillY + pillH);
  ctx.arc(pillX + pillR, pillY + pillR, pillR, Math.PI / 2, -Math.PI / 2);
  ctx.closePath();
  ctx.fill();

  // Pill border
  ctx.strokeStyle = 'rgba(100,120,160,0.5)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Wave text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(waveText, cw / 2, pillY + pillH / 2);

  // Speed indicator
  const speed = engine.getSpeed();
  if (speed > 1) {
    ctx.fillStyle = 'rgba(255,200,0,0.9)';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`x${speed}`, cw - 10, 18);
  }

  // ── Wave Start Announcement Animation ──────────────────
  if (_waveAnnounce) {
    const elapsed = t - _waveAnnounce.startTime;
    const duration = _waveAnnounce.isBoss ? 2.5 : 1.8;

    if (elapsed < duration) {
      const progress = elapsed / duration;
      const isBossAnnounce = _waveAnnounce.isBoss;
      const waveNum = _waveAnnounce.wave;

      // Phase 1: Slide in + scale up (0-0.3)
      // Phase 2: Hold (0.3-0.7)
      // Phase 3: Fade out (0.7-1.0)
      let alpha = 1;
      let scale = 1;
      let offsetY = 0;

      if (progress < 0.2) {
        // Zoom in
        const p = progress / 0.2;
        scale = 0.5 + p * 0.5;
        alpha = p;
        offsetY = (1 - p) * 20;
      } else if (progress > 0.7) {
        // Fade out + slide up
        const p = (progress - 0.7) / 0.3;
        alpha = 1 - p;
        offsetY = -p * 15;
        scale = 1 + p * 0.1;
      }

      ctx.globalAlpha = alpha;

      if (isBossAnnounce) {
        // Boss warning: dramatic red overlay
        const warningAlpha = alpha * 0.15 * (1 + Math.sin(t * 8) * 0.5);
        ctx.fillStyle = `rgba(255,0,0,${warningAlpha})`;
        ctx.fillRect(0, 0, cw, ch);

        // Warning stripes at top and bottom
        const stripeH = 6;
        const stripeAlpha = alpha * 0.6;
        ctx.fillStyle = `rgba(255,200,0,${stripeAlpha})`;
        ctx.fillRect(0, ch * 0.35 + offsetY, cw, stripeH);
        ctx.fillRect(0, ch * 0.65 + offsetY - stripeH, cw, stripeH);

        // Dark band
        ctx.fillStyle = `rgba(0,0,0,${alpha * 0.5})`;
        ctx.fillRect(0, ch * 0.35 + offsetY + stripeH, cw, ch * 0.3 - stripeH * 2);

        // "WARNING" text
        ctx.font = `bold ${Math.round(16 * scale)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(255,0,0,0.8)';
        ctx.shadowBlur = 20;
        ctx.fillStyle = '#ff4444';
        ctx.fillText('!! WARNING !!', cw / 2, ch * 0.42 + offsetY);

        // "BOSS WAVE X" text
        ctx.font = `bold ${Math.round(28 * scale)}px sans-serif`;
        ctx.shadowColor = 'rgba(255,100,0,0.8)';
        ctx.shadowBlur = 25;
        ctx.fillStyle = '#ffcc00';
        ctx.fillText(`BOSS WAVE ${waveNum}`, cw / 2, ch * 0.5 + offsetY);
        ctx.shadowBlur = 0;
      } else {
        // Normal wave: sleek announcement
        // Dark band
        const bandH = 40 * scale;
        ctx.fillStyle = `rgba(0,0,0,${alpha * 0.4})`;
        ctx.fillRect(0, ch * 0.5 - bandH / 2 + offsetY, cw, bandH);

        // "WAVE X" text
        ctx.font = `bold ${Math.round(24 * scale)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(100,200,255,0.6)';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`WAVE ${waveNum}`, cw / 2, ch * 0.5 + offsetY);
        ctx.shadowBlur = 0;

        // Decorative lines
        const lineW = 60 * scale;
        ctx.strokeStyle = `rgba(100,200,255,${alpha * 0.4})`;
        ctx.lineWidth = 1.5;
        const textW = ctx.measureText(`WAVE ${waveNum}`).width / 2 + 15;
        ctx.beginPath();
        ctx.moveTo(cw / 2 - textW - lineW, ch * 0.5 + offsetY);
        ctx.lineTo(cw / 2 - textW, ch * 0.5 + offsetY);
        ctx.moveTo(cw / 2 + textW, ch * 0.5 + offsetY);
        ctx.lineTo(cw / 2 + textW + lineW, ch * 0.5 + offsetY);
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
    } else {
      _waveAnnounce = null;
    }
  }

  // Pause overlay
  if (engine.isPaused()) {
    ctx.fillStyle = 'rgba(0,0,20,0.5)';
    ctx.fillRect(0, 0, cw, ch);

    // Frosted glass effect center
    ctx.fillStyle = 'rgba(0,0,30,0.3)';
    ctx.fillRect(cw / 2 - 100, ch / 2 - 30, 200, 60);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(100,150,255,0.5)';
    ctx.shadowBlur = 15;
    ctx.fillText('PAUSED', cw / 2, ch / 2);
    ctx.shadowBlur = 0;
  }

  // Game over overlay
  if (engine.getIsGameOver()) {
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, cw, ch);

    // Vignette
    const vigGrad = ctx.createRadialGradient(cw / 2, ch / 2, ch * 0.2, cw / 2, ch / 2, ch * 0.7);
    vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
    vigGrad.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, cw, ch);

    // Game over text with glow
    ctx.shadowColor = 'rgba(255,50,50,0.6)';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#ff4444';
    ctx.font = 'bold 34px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GAME OVER', cw / 2, ch / 2 - 20);

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#dddddd';
    ctx.font = '16px sans-serif';
    ctx.fillText(`Score: ${engine.getScore()}`, cw / 2, ch / 2 + 20);
  }

  ctx.restore();
}

// ── Placement Preview (BTD6/Kingdom Rush style) ─────────────

function drawPlacementPreview(
  ctx: CanvasRenderingContext2D,
  info: PlacementInfo,
  cellSize: number
): void {
  const center = getCellCenter(info.row, info.col, cellSize);
  const rangeRadius = info.range * cellSize;

  ctx.save();

  // ── Range Circle ──
  // Gradient fill
  const gradient = ctx.createRadialGradient(
    center.x, center.y, 0,
    center.x, center.y, rangeRadius
  );

  if (info.canPlace) {
    gradient.addColorStop(0, 'rgba(100, 255, 100, 0.10)');
    gradient.addColorStop(0.7, 'rgba(100, 255, 100, 0.06)');
    gradient.addColorStop(1, 'rgba(100, 255, 100, 0.02)');
  } else {
    gradient.addColorStop(0, 'rgba(255, 80, 80, 0.12)');
    gradient.addColorStop(0.7, 'rgba(255, 80, 80, 0.08)');
    gradient.addColorStop(1, 'rgba(255, 80, 80, 0.02)');
  }

  ctx.beginPath();
  ctx.arc(center.x, center.y, rangeRadius, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();

  // Dashed edge stroke
  ctx.setLineDash([6, 4]);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = info.canPlace
    ? 'rgba(100, 255, 100, 0.35)'
    : 'rgba(255, 80, 80, 0.45)';
  ctx.stroke();
  ctx.setLineDash([]);

  // ── Cell highlight ──
  const cellX = info.col * cellSize;
  const cellY = info.row * cellSize;

  ctx.fillStyle = info.canPlace
    ? 'rgba(100, 255, 100, 0.15)'
    : 'rgba(255, 80, 80, 0.20)';
  ctx.fillRect(cellX + 1, cellY + 1, cellSize - 2, cellSize - 2);

  ctx.strokeStyle = info.canPlace
    ? 'rgba(100, 255, 100, 0.5)'
    : 'rgba(255, 80, 80, 0.6)';
  ctx.lineWidth = 2;
  ctx.strokeRect(cellX + 1, cellY + 1, cellSize - 2, cellSize - 2);

  // ── Ghost Tower (30% opacity) ──
  const pal = TOWER_PALETTE[info.towerType] ?? TOWER_PALETTE.ARCHER;
  const size = cellSize * 0.35;

  ctx.globalAlpha = 0.3;
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  switch (info.towerType) {
    case 'ARCHER': drawArcherTower(ctx, center.x, center.y, size, pal); break;
    case 'MAGIC': drawMagicTower(ctx, center.x, center.y, size, pal); break;
    case 'CANNON': drawCannonTower(ctx, center.x, center.y, size, pal); break;
    case 'ICE': drawIceTower(ctx, center.x, center.y, size, pal); break;
    case 'LIGHTNING': drawLightningTower(ctx, center.x, center.y, size, pal); break;
    case 'POISON': drawPoisonTower(ctx, center.x, center.y, size, pal); break;
    case 'HEALER': drawHealerTower(ctx, center.x, center.y, size, pal); break;
    case 'BARRICADE': drawBarricadeTower(ctx, center.x, center.y, size, pal); break;
    case 'GOLDMINE': drawGoldmineTower(ctx, center.x, center.y, size, pal); break;
    case 'SNIPER': drawSniperTower(ctx, center.x, center.y, size, pal); break;
    case 'FLAME': drawFlameTower(ctx, center.x, center.y, size, pal); break;
    case 'WORD': drawWordTower(ctx, center.x, center.y, size, pal); break;
    case 'METEOR': drawMeteorTower(ctx, center.x, center.y, size, pal); break;
    case 'VOID': drawVoidTower(ctx, center.x, center.y, size, pal); break;
    case 'PHOENIX': drawPhoenixTower(ctx, center.x, center.y, size, pal); break;
    case 'CHRONO': drawChronoTower(ctx, center.x, center.y, size, pal); break;
    case 'DIVINE': drawDivineTower(ctx, center.x, center.y, size, pal); break;
  }

  ctx.globalAlpha = 1;

  // ── X mark if cannot place ──
  if (!info.canPlace) {
    const xSize = cellSize * 0.25;
    ctx.strokeStyle = 'rgba(255, 60, 60, 0.8)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(center.x - xSize, center.y - xSize);
    ctx.lineTo(center.x + xSize, center.y + xSize);
    ctx.moveTo(center.x + xSize, center.y - xSize);
    ctx.lineTo(center.x - xSize, center.y + xSize);
    ctx.stroke();
    ctx.lineCap = 'butt';
  }

  ctx.restore();
}
