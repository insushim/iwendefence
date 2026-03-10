// ============================================================
// WordGuard - Canvas Renderer
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
} from '../types/game';

import type {
  Projectile,
  VisualEffect,
  DamageText,
  GameEngine,
} from './gameEngine';

import { getCellCenter, getDistanceBetweenPoints } from './pathfinding';

// ── Constants ───────────────────────────────────────────────

const TERRAIN_COLORS: Record<number, string> = {
  0: '#4a7c3f', // Grass
  1: '#8b7355', // Path/dirt
  2: '#3a5a8c', // Water
  3: '#6b6b6b', // Stone
  4: '#2d5a1e', // Dense forest
  5: '#c4a35a', // Sand
  6: '#8b4513', // Mud
  7: '#ffffff', // Snow
  8: '#1a1a2e', // Void
  9: '#cc3300', // Lava
};

const TOWER_COLORS: Record<TowerType, { primary: string; secondary: string }> = {
  ARCHER: { primary: '#44aa44', secondary: '#226622' },
  MAGIC: { primary: '#9944cc', secondary: '#662299' },
  CANNON: { primary: '#888888', secondary: '#555555' },
  ICE: { primary: '#44ddee', secondary: '#2299aa' },
  LIGHTNING: { primary: '#ffdd33', secondary: '#ccaa00' },
  POISON: { primary: '#44cc44', secondary: '#228822' },
  HEALER: { primary: '#ffffff', secondary: '#aaddaa' },
  BARRICADE: { primary: '#8b6914', secondary: '#5a4510' },
  GOLDMINE: { primary: '#ffd700', secondary: '#cc9900' },
  SNIPER: { primary: '#2d5a1e', secondary: '#1a3a10' },
  FLAME: { primary: '#ff6633', secondary: '#cc3300' },
  WORD: { primary: '#ff44ff', secondary: '#cc22cc' },
};

const ENEMY_COLORS: Record<string, string> = {
  // Basic
  SLIME: '#66cc66',
  GOBLIN: '#88aa44',
  SKELETON: '#ccccaa',
  BAT: '#664488',
  WOLF: '#887766',
  // Armored
  KNIGHT: '#8899aa',
  GOLEM: '#998866',
  SHIELD_BEARER: '#7788aa',
  IRON_TURTLE: '#667766',
  ARMORED_ORC: '#669955',
  // Fast
  THIEF: '#555555',
  SHADOW: '#333344',
  NINJA: '#222233',
  WIND_SPRITE: '#aaeeff',
  HASTE_IMP: '#ff8866',
  // Magic
  WIZARD: '#6644cc',
  DARK_MAGE: '#442266',
  SPIRIT: '#aaaaee',
  ENCHANTRESS: '#cc66aa',
  PHANTOM: '#8888cc',
  // Flying
  HARPY: '#cc88aa',
  DRAGON_WHELP: '#ff6644',
  GARGOYLE: '#777777',
  PHOENIX_CHICK: '#ffaa33',
  WYVERN: '#448866',
  // Boss
  DRAGON: '#ff3300',
  LICH_KING: '#6633cc',
  DEMON_LORD: '#cc0000',
  HYDRA: '#338855',
  WORD_DESTROYER: '#ff00ff',
};

const BOSS_TYPES: Set<string> = new Set([
  'DRAGON', 'LICH_KING', 'DEMON_LORD', 'HYDRA', 'WORD_DESTROYER',
]);

const GRADE_COLORS: Record<number, string> = {
  1: '#aaaaaa', // Normal
  2: '#4488ff', // Rare
  3: '#aa44ff', // Epic
  4: '#ffaa00', // Legendary
  5: '#ff4466', // Mythic
};

const GRADE_GLOW: Record<number, string> = {
  1: 'rgba(170,170,170,0)',
  2: 'rgba(68,136,255,0.3)',
  3: 'rgba(170,68,255,0.4)',
  4: 'rgba(255,170,0,0.5)',
  5: 'rgba(255,68,102,0.6)',
};

// ── Main Render Function ────────────────────────────────────

export function renderGame(
  ctx: CanvasRenderingContext2D,
  engine: GameEngine,
  selectedTowerId: string | null
): void {
  const mapData = engine.getMapData();
  const cellSize = engine.getCellSize();

  if (mapData) {
    drawMap(ctx, mapData, cellSize);
    drawPath(ctx, mapData.path, cellSize);
  }

  // Draw towers
  for (const tower of engine.getTowers()) {
    const isSelected = tower.id === selectedTowerId;
    drawTower(ctx, tower, cellSize, isSelected);
  }

  // Draw enemies
  for (const enemy of engine.getEnemies()) {
    drawEnemy(ctx, enemy, cellSize);
  }

  // Draw projectiles
  for (const proj of engine.getProjectiles()) {
    drawProjectile(ctx, proj);
  }

  // Draw effects
  drawEffects(ctx, engine.getEffects());

  // Draw damage texts
  drawDamageTexts(ctx, engine.getDamageTexts());

  // Draw UI overlays
  drawUIOverlay(ctx, engine);
}

// ── Map Drawing ─────────────────────────────────────────────

export function drawMap(
  ctx: CanvasRenderingContext2D,
  mapData: MapData,
  cellSize: number
): void {
  const grid = mapData.grid;

  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      const terrain = grid[row][col];
      const color = TERRAIN_COLORS[terrain] ?? TERRAIN_COLORS[0];

      ctx.fillStyle = color;
      ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);

      // Subtle grid lines
      ctx.strokeStyle = 'rgba(0,0,0,0.1)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(col * cellSize, row * cellSize, cellSize, cellSize);
    }
  }
}

// ── Path Drawing ────────────────────────────────────────────

export function drawPath(
  ctx: CanvasRenderingContext2D,
  path: [number, number][],
  cellSize: number
): void {
  if (path.length < 2) return;

  ctx.save();

  // Solid path underlay
  ctx.beginPath();
  const start = getCellCenter(path[0][0], path[0][1], cellSize);
  ctx.moveTo(start.x, start.y);

  for (let i = 1; i < path.length; i++) {
    const point = getCellCenter(path[i][0], path[i][1], cellSize);
    ctx.lineTo(point.x, point.y);
  }

  ctx.strokeStyle = 'rgba(180,140,80,0.4)';
  ctx.lineWidth = cellSize * 0.6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Dashed center line
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  for (let i = 1; i < path.length; i++) {
    const point = getCellCenter(path[i][0], path[i][1], cellSize);
    ctx.lineTo(point.x, point.y);
  }

  ctx.setLineDash([8, 6]);
  ctx.strokeStyle = 'rgba(255,255,200,0.5)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.setLineDash([]);

  // Start marker
  ctx.fillStyle = '#44ff44';
  ctx.beginPath();
  ctx.arc(start.x, start.y, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#228822';
  ctx.lineWidth = 2;
  ctx.stroke();

  // End marker
  const end = getCellCenter(path[path.length - 1][0], path[path.length - 1][1], cellSize);
  ctx.fillStyle = '#ff4444';
  ctx.beginPath();
  ctx.arc(end.x, end.y, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#882222';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();
}

// ── Tower Drawing ───────────────────────────────────────────

export function drawTower(
  ctx: CanvasRenderingContext2D,
  tower: Tower,
  cellSize: number,
  isSelected: boolean
): void {
  const center = getCellCenter(tower.position.row, tower.position.col, cellSize);
  const colors = TOWER_COLORS[tower.type];
  const size = cellSize * 0.35;

  ctx.save();

  // Grade glow for higher grades
  if (tower.grade >= 2) {
    const glowColor = GRADE_GLOW[tower.grade];
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 8 + tower.grade * 4;
  }

  // Draw range circle when selected
  if (isSelected) {
    ctx.beginPath();
    ctx.arc(center.x, center.y, tower.stats.range * cellSize, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Draw tower shape based on type
  ctx.fillStyle = colors.primary;
  ctx.strokeStyle = colors.secondary;
  ctx.lineWidth = 2;

  switch (tower.type) {
    case 'ARCHER':
      drawTriangle(ctx, center.x, center.y, size);
      break;
    case 'MAGIC':
      drawDiamond(ctx, center.x, center.y, size);
      break;
    case 'CANNON':
      drawCannonShape(ctx, center.x, center.y, size, colors);
      break;
    case 'ICE':
      drawHexagon(ctx, center.x, center.y, size);
      break;
    case 'LIGHTNING':
      drawLightningBolt(ctx, center.x, center.y, size, colors);
      break;
    case 'POISON':
      drawPoisonShape(ctx, center.x, center.y, size, colors);
      break;
    case 'HEALER':
      drawCross(ctx, center.x, center.y, size, colors);
      break;
    case 'BARRICADE':
      drawBarricade(ctx, center.x, center.y, size, colors);
      break;
    case 'GOLDMINE':
      drawPentagon(ctx, center.x, center.y, size, colors);
      break;
    case 'SNIPER':
      drawLongTriangle(ctx, center.x, center.y, size, colors);
      break;
    case 'FLAME':
      drawFlameShape(ctx, center.x, center.y, size, colors);
      break;
    case 'WORD':
      drawWordTower(ctx, center.x, center.y, size);
      break;
  }

  // Reset shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  // Draw grade stars above tower
  drawGradeStars(ctx, center.x, center.y - size - 8, tower.grade);

  // Draw level indicator
  if (tower.level > 1) {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Lv${tower.level}`, center.x, center.y + size + 10);
  }

  ctx.restore();
}

// ── Tower Shape Helpers ─────────────────────────────────────

function drawTriangle(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.lineTo(x - size * 0.866, y + size * 0.5);
  ctx.lineTo(x + size * 0.866, y + size * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawDiamond(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.lineTo(x + size * 0.7, y);
  ctx.lineTo(x, y + size);
  ctx.lineTo(x - size * 0.7, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Inner sparkle
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath();
  ctx.moveTo(x, y - size * 0.4);
  ctx.lineTo(x + size * 0.28, y);
  ctx.lineTo(x, y + size * 0.4);
  ctx.lineTo(x - size * 0.28, y);
  ctx.closePath();
  ctx.fill();
}

function drawCannonShape(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  colors: { primary: string; secondary: string }
): void {
  // Outer circle
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fillStyle = colors.primary;
  ctx.fill();
  ctx.strokeStyle = colors.secondary;
  ctx.lineWidth = 3;
  ctx.stroke();

  // Inner dark circle
  ctx.beginPath();
  ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
  ctx.fillStyle = colors.secondary;
  ctx.fill();

  // Barrel
  ctx.fillStyle = colors.secondary;
  ctx.fillRect(x - size * 0.15, y - size * 1.2, size * 0.3, size * 0.7);
}

function drawHexagon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const px = x + size * Math.cos(angle);
    const py = y + size * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Ice crystal inner
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const angle = (Math.PI / 3) * i;
    ctx.beginPath();
    ctx.moveTo(x + size * 0.6 * Math.cos(angle), y + size * 0.6 * Math.sin(angle));
    ctx.lineTo(x - size * 0.6 * Math.cos(angle), y - size * 0.6 * Math.sin(angle));
    ctx.stroke();
  }
}

function drawLightningBolt(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  colors: { primary: string; secondary: string }
): void {
  ctx.fillStyle = colors.primary;
  ctx.strokeStyle = colors.secondary;
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(x - size * 0.2, y - size);
  ctx.lineTo(x + size * 0.5, y - size);
  ctx.lineTo(x + size * 0.1, y - size * 0.1);
  ctx.lineTo(x + size * 0.5, y - size * 0.1);
  ctx.lineTo(x - size * 0.15, y + size);
  ctx.lineTo(x + size * 0.05, y + size * 0.1);
  ctx.lineTo(x - size * 0.4, y + size * 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawPoisonShape(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  colors: { primary: string; secondary: string }
): void {
  // Main circle
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fillStyle = colors.primary;
  ctx.fill();
  ctx.strokeStyle = colors.secondary;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Bubbles
  ctx.fillStyle = 'rgba(100,255,100,0.6)';
  ctx.beginPath();
  ctx.arc(x - size * 0.3, y - size * 0.2, size * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + size * 0.25, y + size * 0.15, size * 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + size * 0.05, y - size * 0.4, size * 0.12, 0, Math.PI * 2);
  ctx.fill();
}

function drawCross(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  colors: { primary: string; secondary: string }
): void {
  const arm = size * 0.3;
  ctx.fillStyle = colors.primary;
  ctx.strokeStyle = colors.secondary;
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(x - arm, y - size);
  ctx.lineTo(x + arm, y - size);
  ctx.lineTo(x + arm, y - arm);
  ctx.lineTo(x + size, y - arm);
  ctx.lineTo(x + size, y + arm);
  ctx.lineTo(x + arm, y + arm);
  ctx.lineTo(x + arm, y + size);
  ctx.lineTo(x - arm, y + size);
  ctx.lineTo(x - arm, y + arm);
  ctx.lineTo(x - size, y + arm);
  ctx.lineTo(x - size, y - arm);
  ctx.lineTo(x - arm, y - arm);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawBarricade(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  colors: { primary: string; secondary: string }
): void {
  ctx.fillStyle = colors.primary;
  ctx.strokeStyle = colors.secondary;
  ctx.lineWidth = 2;
  ctx.fillRect(x - size, y - size * 0.6, size * 2, size * 1.2);
  ctx.strokeRect(x - size, y - size * 0.6, size * 2, size * 1.2);

  // Wooden planks
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - size, y);
  ctx.lineTo(x + size, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y - size * 0.6);
  ctx.lineTo(x, y + size * 0.6);
  ctx.stroke();
}

function drawPentagon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  colors: { primary: string; secondary: string }
): void {
  ctx.fillStyle = colors.primary;
  ctx.strokeStyle = colors.secondary;
  ctx.lineWidth = 2;

  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
    const px = x + size * Math.cos(angle);
    const py = y + size * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Gold shimmer
  const gradient = ctx.createRadialGradient(x - size * 0.2, y - size * 0.2, 0, x, y, size);
  gradient.addColorStop(0, 'rgba(255,255,200,0.4)');
  gradient.addColorStop(1, 'rgba(255,200,0,0)');
  ctx.fillStyle = gradient;
  ctx.fill();
}

function drawLongTriangle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  colors: { primary: string; secondary: string }
): void {
  ctx.fillStyle = colors.primary;
  ctx.strokeStyle = colors.secondary;
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(x, y - size * 1.4);
  ctx.lineTo(x - size * 0.5, y + size * 0.6);
  ctx.lineTo(x + size * 0.5, y + size * 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Scope crosshair
  ctx.strokeStyle = 'rgba(255,0,0,0.6)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x, y - size * 0.3, size * 0.25, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - size * 0.35, y - size * 0.3);
  ctx.lineTo(x + size * 0.35, y - size * 0.3);
  ctx.moveTo(x, y - size * 0.65);
  ctx.lineTo(x, y + size * 0.05);
  ctx.stroke();
}

function drawFlameShape(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  colors: { primary: string; secondary: string }
): void {
  // Outer flame
  const gradient = ctx.createRadialGradient(x, y + size * 0.2, size * 0.1, x, y - size * 0.3, size * 1.2);
  gradient.addColorStop(0, '#ffff66');
  gradient.addColorStop(0.4, colors.primary);
  gradient.addColorStop(1, colors.secondary);

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(x, y - size * 1.2);
  ctx.bezierCurveTo(x + size * 0.3, y - size * 0.8, x + size * 0.8, y - size * 0.2, x + size * 0.5, y + size * 0.3);
  ctx.bezierCurveTo(x + size * 0.6, y + size * 0.6, x + size * 0.2, y + size * 0.8, x, y + size * 0.6);
  ctx.bezierCurveTo(x - size * 0.2, y + size * 0.8, x - size * 0.6, y + size * 0.6, x - size * 0.5, y + size * 0.3);
  ctx.bezierCurveTo(x - size * 0.8, y - size * 0.2, x - size * 0.3, y - size * 0.8, x, y - size * 1.2);
  ctx.closePath();
  ctx.fill();

  // Inner bright core
  ctx.fillStyle = 'rgba(255,255,200,0.6)';
  ctx.beginPath();
  ctx.ellipse(x, y + size * 0.1, size * 0.2, size * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawWordTower(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
): void {
  // Rainbow circle
  const segments = 12;
  for (let i = 0; i < segments; i++) {
    const startAngle = (Math.PI * 2 * i) / segments;
    const endAngle = (Math.PI * 2 * (i + 1)) / segments;
    const hue = (360 * i) / segments;

    ctx.fillStyle = `hsl(${hue}, 80%, 60%)`;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, size, startAngle, endAngle);
    ctx.closePath();
    ctx.fill();
  }

  // White inner circle
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x, y, size * 0.55, 0, Math.PI * 2);
  ctx.fill();

  // "W" letter
  ctx.fillStyle = '#8833cc';
  ctx.font = `bold ${Math.round(size * 0.8)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('W', x, y + 1);

  // Outline
  ctx.strokeStyle = 'rgba(100,50,200,0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.stroke();
}

// ── Grade Stars ─────────────────────────────────────────────

function drawGradeStars(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  grade: TowerGrade
): void {
  const starSize = 4;
  const spacing = 10;
  const totalWidth = (grade - 1) * spacing;
  const startX = cx - totalWidth / 2;

  for (let i = 0; i < grade; i++) {
    const sx = startX + i * spacing;
    drawStar(ctx, sx, cy, starSize, GRADE_COLORS[grade] ?? '#aaaaaa');
  }
}

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const outerAngle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
    const innerAngle = outerAngle + Math.PI / 5;
    ctx.lineTo(x + r * Math.cos(outerAngle), y + r * Math.sin(outerAngle));
    ctx.lineTo(x + r * 0.4 * Math.cos(innerAngle), y + r * 0.4 * Math.sin(innerAngle));
  }
  ctx.closePath();
  ctx.fill();
}

// ── Enemy Drawing ───────────────────────────────────────────

export function drawEnemy(
  ctx: CanvasRenderingContext2D,
  enemy: Enemy,
  cellSize: number
): void {
  const { x, y } = enemy.position;
  const isBoss = BOSS_TYPES.has(enemy.type);
  const baseSize = cellSize * 0.25;
  const size = isBoss ? baseSize * 2 : baseSize;
  const color = ENEMY_COLORS[enemy.type] ?? '#cc4444';

  ctx.save();

  // Boss glow
  if (isBoss) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 15;
  }

  // Draw enemy shape (varies by category)
  ctx.fillStyle = color;
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 1.5;

  if (isFlying(enemy.type)) {
    // Flying: diamond shape
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x + size * 0.8, y);
    ctx.lineTo(x, y + size * 0.6);
    ctx.lineTo(x - size * 0.8, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Wings
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - size * 0.5, y - size * 0.2);
    ctx.lineTo(x - size * 1.3, y - size * 0.6);
    ctx.moveTo(x + size * 0.5, y - size * 0.2);
    ctx.lineTo(x + size * 1.3, y - size * 0.6);
    ctx.stroke();
  } else if (isArmored(enemy.type)) {
    // Armored: square
    ctx.fillRect(x - size, y - size, size * 2, size * 2);
    ctx.strokeRect(x - size, y - size, size * 2, size * 2);
    // Shield
    ctx.fillStyle = 'rgba(150,170,190,0.5)';
    ctx.fillRect(x - size * 0.6, y - size * 0.6, size * 1.2, size * 1.2);
  } else if (isFast(enemy.type)) {
    // Fast: thin triangle pointing right
    ctx.beginPath();
    ctx.moveTo(x + size, y);
    ctx.lineTo(x - size * 0.6, y - size * 0.7);
    ctx.lineTo(x - size * 0.6, y + size * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (isMagic(enemy.type)) {
    // Magic: circle with aura
    ctx.beginPath();
    ctx.arc(x, y, size * 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Aura ring
    ctx.strokeStyle = `${color}88`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, size * 1.2, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    // Basic: circle
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Reset shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  // Health bar
  const barWidth = size * 2.5;
  const barHeight = 4;
  const barY = y - size - 8;
  const hpRatio = enemy.hp / enemy.maxHp;

  // Background
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(x - barWidth / 2, barY, barWidth, barHeight);

  // HP fill
  const hpColor = hpRatio > 0.6 ? '#44cc44' : hpRatio > 0.3 ? '#cccc44' : '#cc4444';
  ctx.fillStyle = hpColor;
  ctx.fillRect(x - barWidth / 2, barY, barWidth * hpRatio, barHeight);

  // Border
  ctx.strokeStyle = 'rgba(0,0,0,0.7)';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(x - barWidth / 2, barY, barWidth, barHeight);

  // Status effect indicators
  drawStatusEffects(ctx, enemy, x, y + size + 6);

  ctx.restore();
}

function drawStatusEffects(
  ctx: CanvasRenderingContext2D,
  enemy: { effects: { type: string }[] },
  x: number,
  y: number
): void {
  if (enemy.effects.length === 0) return;

  const iconSize = 5;
  const spacing = 12;
  const startX = x - ((enemy.effects.length - 1) * spacing) / 2;

  const effectColors: Record<string, string> = {
    slow: '#44ddee',
    poison: '#44cc44',
    burn: '#ff6633',
    freeze: '#88eeff',
    stun: '#ffff44',
    weaken: '#cc66cc',
  };

  for (let i = 0; i < enemy.effects.length; i++) {
    const eff = enemy.effects[i];
    const ex = startX + i * spacing;
    ctx.fillStyle = effectColors[eff.type] ?? '#ffffff';
    ctx.beginPath();
    ctx.arc(ex, y, iconSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }
}

// Enemy category helpers
function isFlying(type: EnemyType): boolean {
  return ['HARPY', 'DRAGON_WHELP', 'GARGOYLE', 'PHOENIX_CHICK', 'WYVERN', 'DRAGON'].includes(type);
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

// ── Projectile Drawing ──────────────────────────────────────

export function drawProjectile(ctx: CanvasRenderingContext2D, proj: Projectile): void {
  const { x, y } = proj.position;

  ctx.save();

  switch (proj.towerType) {
    case 'ARCHER': {
      // Arrow
      ctx.fillStyle = '#8b6914';
      ctx.strokeStyle = '#5a4510';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
      // Trail
      ctx.strokeStyle = 'rgba(139,105,20,0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 8, y);
      ctx.stroke();
      break;
    }

    case 'MAGIC': {
      // Magic bolt
      ctx.fillStyle = '#cc66ff';
      ctx.shadowColor = '#cc66ff';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
      // Sparkle trail
      ctx.fillStyle = 'rgba(200,100,255,0.3)';
      ctx.beginPath();
      ctx.arc(x - 5, y, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x - 9, y, 1.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'CANNON': {
      // Cannonball
      ctx.fillStyle = '#333333';
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 1;
      ctx.stroke();
      // Highlight
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.beginPath();
      ctx.arc(x - 1.5, y - 1.5, 2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'ICE': {
      // Ice shard
      ctx.fillStyle = '#aaeeff';
      ctx.shadowColor = '#44ddee';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(x, y - 5);
      ctx.lineTo(x + 3, y);
      ctx.lineTo(x, y + 5);
      ctx.lineTo(x - 3, y);
      ctx.closePath();
      ctx.fill();
      break;
    }

    case 'POISON': {
      // Poison glob
      ctx.fillStyle = '#55dd55';
      ctx.shadowColor = '#44cc44';
      ctx.shadowBlur = 5;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
      // Drip
      ctx.fillStyle = 'rgba(68,204,68,0.4)';
      ctx.beginPath();
      ctx.arc(x + 2, y + 3, 2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'SNIPER': {
      // Fast bullet
      ctx.fillStyle = '#dddddd';
      ctx.strokeStyle = '#999999';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(x, y, 5, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Trail
      ctx.strokeStyle = 'rgba(200,200,200,0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 12, y);
      ctx.stroke();
      break;
    }

    case 'FLAME': {
      // Fireball
      const grad = ctx.createRadialGradient(x, y, 0, x, y, 6);
      grad.addColorStop(0, '#ffff88');
      grad.addColorStop(0.5, '#ff6633');
      grad.addColorStop(1, 'rgba(255,51,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'WORD': {
      // Rainbow projectile
      const time = Date.now() / 200;
      const hue = (time * 60) % 360;
      ctx.fillStyle = `hsl(${hue}, 80%, 60%)`;
      ctx.shadowColor = `hsl(${hue}, 80%, 60%)`;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    default: {
      // Generic
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
        const r = effect.radius * (0.5 + progress * 0.5);
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, `rgba(255,200,50,${alpha})`);
        grad.addColorStop(0.5, `rgba(255,100,20,${alpha * 0.7})`);
        grad.addColorStop(1, `rgba(200,50,0,0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();

        // Shockwave ring
        ctx.strokeStyle = `rgba(255,180,50,${alpha * 0.5})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, r * 1.3, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }

      case 'lightning': {
        // Draw random lightning bolts
        ctx.strokeStyle = `rgba(255,255,100,${alpha})`;
        ctx.lineWidth = 2;
        ctx.shadowColor = '#ffff44';
        ctx.shadowBlur = 10;

        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(x, y - effect.radius);
          let cy = y - effect.radius;
          while (cy < y + effect.radius) {
            const nx = x + (Math.random() - 0.5) * effect.radius;
            cy += effect.radius * 0.3 + Math.random() * effect.radius * 0.2;
            ctx.lineTo(nx, Math.min(cy, y + effect.radius));
          }
          ctx.stroke();
        }
        ctx.shadowBlur = 0;
        break;
      }

      case 'ice': {
        const r = effect.radius * (0.3 + progress * 0.7);
        ctx.fillStyle = `rgba(100,220,255,${alpha * 0.4})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();

        // Ice crystals
        ctx.strokeStyle = `rgba(200,240,255,${alpha * 0.8})`;
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI * 2 * i) / 6 + progress * 2;
          const cr = r * 0.6;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + cr * Math.cos(angle), y + cr * Math.sin(angle));
          ctx.stroke();
        }
        break;
      }

      case 'poison_cloud': {
        const r = effect.radius * (0.5 + progress * 0.5);
        // Multiple cloudy circles
        for (let i = 0; i < 5; i++) {
          const ox = (Math.sin(i * 1.3 + progress * 3) * r) * 0.3;
          const oy = (Math.cos(i * 1.7 + progress * 2) * r) * 0.3;
          const cr = r * (0.3 + Math.sin(i + progress * 4) * 0.15);
          ctx.fillStyle = `rgba(80,200,80,${alpha * 0.25})`;
          ctx.beginPath();
          ctx.arc(x + ox, y + oy, cr, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }

      case 'heal': {
        const r = effect.radius * progress;
        ctx.strokeStyle = `rgba(100,255,100,${alpha * 0.6})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.stroke();

        // Plus signs floating up
        ctx.fillStyle = `rgba(100,255,100,${alpha})`;
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('+', x, y - r * 0.5 - progress * 15);
        break;
      }

      case 'flame': {
        const r = effect.radius * (0.5 + progress * 0.5);
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, `rgba(255,255,100,${alpha * 0.8})`);
        grad.addColorStop(0.4, `rgba(255,100,30,${alpha * 0.6})`);
        grad.addColorStop(1, `rgba(200,30,0,0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'merge': {
        // Sparkle burst
        ctx.fillStyle = `rgba(200,150,255,${alpha})`;
        for (let i = 0; i < 8; i++) {
          const angle = (Math.PI * 2 * i) / 8;
          const dist = effect.radius * progress;
          const px = x + dist * Math.cos(angle);
          const py = y + dist * Math.sin(angle);
          ctx.beginPath();
          ctx.arc(px, py, 3 * (1 - progress), 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }

      case 'death': {
        // Particles scattering
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI * 2 * i) / 6 + progress;
          const dist = effect.radius * progress * 2;
          const px = x + dist * Math.cos(angle);
          const py = y + dist * Math.sin(angle);
          const pAlpha = alpha * 0.8;
          ctx.fillStyle = `rgba(255,80,80,${pAlpha})`;
          ctx.beginPath();
          ctx.arc(px, py, 3 * (1 - progress), 0, Math.PI * 2);
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
    const alpha = 1 - progress;
    const scale = text.isCrit ? 1.3 + (1 - progress) * 0.3 : 1;

    ctx.globalAlpha = alpha;
    ctx.fillStyle = text.color;
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.lineWidth = 2;

    const fontSize = text.isCrit ? 16 : 12;
    ctx.font = `bold ${Math.round(fontSize * scale)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Outline
    ctx.strokeText(text.text, text.position.x, text.position.y);
    ctx.fillText(text.text, text.position.x, text.position.y);
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}

// ── UI Overlay ──────────────────────────────────────────────

export function drawUIOverlay(ctx: CanvasRenderingContext2D, engine: GameEngine): void {
  ctx.save();

  const canvasWidth = ctx.canvas.width;

  // Wave indicator (top center)
  const waveText = `Wave ${engine.getCurrentWave() + 1} / ${engine.getWaveCount()}`;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(canvasWidth / 2 - 60, 4, 120, 22);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(waveText, canvasWidth / 2, 15);

  // Speed indicator (top right)
  const speed = engine.getSpeed();
  if (speed > 1) {
    const speedText = `x${speed}`;
    ctx.fillStyle = 'rgba(255,200,0,0.8)';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(speedText, canvasWidth - 10, 16);
  }

  // Pause indicator
  if (engine.isPaused()) {
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, 0, canvasWidth, ctx.canvas.height);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PAUSED', canvasWidth / 2, ctx.canvas.height / 2);
  }

  // Game over overlay
  if (engine.getIsGameOver()) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, canvasWidth, ctx.canvas.height);

    ctx.fillStyle = '#ff4444';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GAME OVER', canvasWidth / 2, ctx.canvas.height / 2 - 20);

    ctx.fillStyle = '#ffffff';
    ctx.font = '18px sans-serif';
    ctx.fillText(`Score: ${engine.getScore()}`, canvasWidth / 2, ctx.canvas.height / 2 + 20);
  }

  ctx.restore();
}
