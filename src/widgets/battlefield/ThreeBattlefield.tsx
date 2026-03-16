'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

import type { GameEngine } from '@/shared/lib/gameEngine';
import type { Enemy, Tower, TowerType } from '@/shared/types/game';
import type { PlacementInfo } from '@/shared/lib/renderer';

interface ThreeBattlefieldProps {
  width: number;
  height: number;
  cellSize: number;
  getEngine: () => GameEngine | null;
  selectedTowerId: string | null;
  placementInfo: PlacementInfo | null;
  onTileHover?: (row: number, col: number) => void;
  onTileLeave?: () => void;
  onTileSelect?: (row: number, col: number) => void;
}

interface BurstEffect {
  mesh: THREE.Group;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  spin: number;
}

interface BuildPulseEffect {
  ring: THREE.Mesh;
  glow: THREE.Mesh;
  sigils: THREE.Mesh[];
  life: number;
  maxLife: number;
}

interface MuzzleFlashEffect {
  burst: THREE.Mesh;
  ring: THREE.Mesh;
  sparks: THREE.Mesh[];
  life: number;
  maxLife: number;
}

interface DeathWaveEffect {
  ring: THREE.Mesh;
  glow: THREE.Mesh;
  shards: THREE.Mesh[];
  life: number;
  maxLife: number;
}

interface BossIntroEffect {
  ring: THREE.Mesh;
  glow: THREE.Mesh;
  spikes: THREE.Mesh[];
  life: number;
  maxLife: number;
}

const TOWER_COLORS: Record<string, number> = {
  ARCHER: 0x50c878,
  MAGIC: 0xa855f7,
  CANNON: 0xff7a18,
  ICE: 0x67e8f9,
  LIGHTNING: 0xfacc15,
  POISON: 0x84cc16,
  HEALER: 0xfb7185,
  BARRICADE: 0xb45309,
  GOLDMINE: 0xfbbf24,
  SNIPER: 0x94a3b8,
  FLAME: 0xf97316,
  WORD: 0x22d3ee,
  METEOR: 0xff5b36,
  VOID: 0x5b21b6,
  PHOENIX: 0xff7849,
  CHRONO: 0x2dd4bf,
  DIVINE: 0xfef08a,
};

const ENEMY_COLORS: Record<string, number> = {
  SLIME: 0x7ee081,
  GOBLIN: 0xa3e635,
  SKELETON: 0xe5e7eb,
  BAT: 0x7c83fd,
  WOLF: 0x967259,
  KNIGHT: 0x94a3b8,
  GOLEM: 0x9f8b77,
  SHIELD_BEARER: 0x64748b,
  IRON_TURTLE: 0x4b5563,
  ARMORED_ORC: 0x65a30d,
  THIEF: 0x52525b,
  SHADOW: 0x312e81,
  NINJA: 0x18181b,
  WIND_SPRITE: 0x93c5fd,
  HASTE_IMP: 0xfb7185,
  WIZARD: 0x8b5cf6,
  DARK_MAGE: 0x6d28d9,
  SPIRIT: 0xc4b5fd,
  ENCHANTRESS: 0xf0abfc,
  PHANTOM: 0xa78bfa,
  HARPY: 0xf9a8d4,
  DRAGON_WHELP: 0xfb923c,
  GARGOYLE: 0x71717a,
  PHOENIX_CHICK: 0xf59e0b,
  WYVERN: 0x10b981,
  DRAGON: 0xdc2626,
  LICH_KING: 0x7c3aed,
  DEMON_LORD: 0x991b1b,
  HYDRA: 0x15803d,
  WORD_DESTROYER: 0xe879f9,
};

const BOSS_TYPES = new Set(['DRAGON', 'LICH_KING', 'DEMON_LORD', 'HYDRA', 'WORD_DESTROYER']);
const FLYING_TYPES = new Set(['BAT', 'HARPY', 'DRAGON_WHELP', 'GARGOYLE', 'PHOENIX_CHICK', 'WYVERN']);
const ARMORED_TYPES = new Set(['KNIGHT', 'GOLEM', 'SHIELD_BEARER', 'IRON_TURTLE', 'ARMORED_ORC']);
const CASTER_TYPES = new Set(['WIZARD', 'DARK_MAGE', 'SPIRIT', 'ENCHANTRESS', 'PHANTOM']);

function worldPositionFromCanvas(x: number, y: number, cellSize: number, rows: number): THREE.Vector3 {
  return new THREE.Vector3(x / cellSize, 0, rows - y / cellSize);
}

function standardMaterial(color: number, emissive = 0x000000, emissiveIntensity = 0): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.35,
    metalness: 0.42,
    emissive,
    emissiveIntensity,
  });
}

function enemyMaterial(color: number, emissive = 0x000000, emissiveIntensity = 0): THREE.MeshStandardMaterial {
  const material = standardMaterial(color, emissive, emissiveIntensity);
  material.userData.baseColor = color;
  material.userData.baseEmissive = emissive;
  material.userData.baseEmissiveIntensity = emissiveIntensity;
  return material;
}

function basicGlow(color: number, opacity: number): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
  });
}

function applyGhostMaterial(group: THREE.Group, color: number, canPlace: boolean): void {
  group.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!('material' in mesh)) return;
    const material = mesh.material;
    if (Array.isArray(material)) return;
    if (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshBasicMaterial) {
      const cloned = material.clone();
      cloned.transparent = true;
      cloned.opacity = canPlace ? 0.62 : 0.42;
      cloned.depthWrite = false;
      if (cloned instanceof THREE.MeshStandardMaterial) {
        cloned.emissive.setHex(color);
        cloned.emissiveIntensity = canPlace ? 0.42 : 0.2;
        if (!canPlace) {
          cloned.color.lerp(new THREE.Color(0x2b0b0b), 0.35);
        }
      }
      mesh.material = cloned;
    }
  });
}

function spawnBuildPulse(
  x: number,
  z: number,
  parent: THREE.Group,
  pulses: BuildPulseEffect[],
  color: number,
  type: TowerType
): void {
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.36, 40), basicGlow(color, 0.8));
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(x, 0.13, z);

  const glow = new THREE.Mesh(new THREE.CircleGeometry(0.24, 32), basicGlow(color, 0.22));
  glow.rotation.x = -Math.PI / 2;
  glow.position.set(x, 0.125, z);

  const sigils: THREE.Mesh[] = [];
  const sigilMaterial = basicGlow(color, 0.72);
  if (type === 'ARCHER' || type === 'SNIPER') {
    for (let i = 0; i < 4; i++) {
      const sigil = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.04), sigilMaterial.clone());
      sigil.rotation.x = -Math.PI / 2;
      sigil.rotation.z = (Math.PI / 2) * i + Math.PI / 4;
      sigil.position.set(x, 0.131, z);
      parent.add(sigil);
      sigils.push(sigil);
    }
  } else if (type === 'HEALER' || type === 'DIVINE') {
    const vertical = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.3), sigilMaterial.clone());
    vertical.rotation.x = -Math.PI / 2;
    vertical.position.set(x, 0.131, z);
    parent.add(vertical);
    sigils.push(vertical);

    const horizontal = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.08), sigilMaterial.clone());
    horizontal.rotation.x = -Math.PI / 2;
    horizontal.position.set(x, 0.131, z);
    parent.add(horizontal);
    sigils.push(horizontal);
  } else if (type === 'BARRICADE') {
    for (let i = -1; i <= 1; i++) {
      const sigil = new THREE.Mesh(new THREE.CircleGeometry(0.06, 3), sigilMaterial.clone());
      sigil.rotation.x = -Math.PI / 2;
      sigil.rotation.z = Math.PI;
      sigil.position.set(x + i * 0.14, 0.131, z);
      parent.add(sigil);
      sigils.push(sigil);
    }
  } else if (type === 'WORD' || type === 'MAGIC' || type === 'CHRONO' || type === 'VOID') {
    for (let i = 0; i < 2; i++) {
      const sigil = new THREE.Mesh(new THREE.RingGeometry(0.1 + i * 0.08, 0.12 + i * 0.08, 24), sigilMaterial.clone());
      sigil.rotation.x = -Math.PI / 2;
      sigil.position.set(x, 0.131 + i * 0.002, z);
      parent.add(sigil);
      sigils.push(sigil);
    }
  } else {
    for (let i = 0; i < 4; i++) {
      const sigil = new THREE.Mesh(new THREE.CircleGeometry(0.05, 18), sigilMaterial.clone());
      sigil.rotation.x = -Math.PI / 2;
      const angle = (Math.PI / 2) * i;
      sigil.position.set(x + Math.cos(angle) * 0.18, 0.131, z + Math.sin(angle) * 0.18);
      parent.add(sigil);
      sigils.push(sigil);
    }
  }

  parent.add(ring);
  parent.add(glow);
  pulses.push({ ring, glow, sigils, life: 0.42, maxLife: 0.42 });
}

function createPlacementGlyph(type: TowerType, color: number): THREE.Group {
  const group = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.84 });

  switch (type) {
    case 'ARCHER':
    case 'SNIPER': {
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.34, 10), material);
      shaft.rotation.z = Math.PI / 2;
      shaft.position.y = 0.02;
      group.add(shaft);

      const head = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.14, 3), material);
      head.rotation.z = -Math.PI / 2;
      head.position.set(0.22, 0.02, 0);
      group.add(head);
      break;
    }
    case 'CANNON':
    case 'METEOR':
    case 'FLAME':
    case 'PHOENIX': {
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.26, 12), material);
      barrel.rotation.z = Math.PI / 2;
      barrel.position.y = 0.04;
      group.add(barrel);

      const muzzle = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.018, 8, 18), material);
      muzzle.rotation.y = Math.PI / 2;
      muzzle.position.set(0.16, 0.04, 0);
      group.add(muzzle);
      break;
    }
    case 'HEALER':
    case 'DIVINE': {
      const vertical = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.28, 0.04), material);
      vertical.position.y = 0.03;
      group.add(vertical);

      const horizontal = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.06, 0.04), material);
      horizontal.position.y = 0.03;
      group.add(horizontal);
      break;
    }
    case 'WORD': {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 0.04), material);
      slab.position.y = 0.04;
      group.add(slab);

      const line = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.28, 0.04), material);
      line.position.set(0.12, 0.04, 0);
      group.add(line);
      break;
    }
    case 'BARRICADE': {
      for (let i = -1; i <= 1; i++) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.18, 5), material);
        spike.position.set(i * 0.11, 0.04, 0);
        group.add(spike);
      }
      break;
    }
    case 'GOLDMINE': {
      const nugget = new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0), material);
      nugget.position.y = 0.05;
      group.add(nugget);

      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.018, 8, 20), material);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = -0.01;
      group.add(ring);
      break;
    }
    default: {
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), material);
      core.position.y = 0.05;
      group.add(core);

      const halo = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.018, 8, 20), material);
      halo.rotation.x = Math.PI / 2;
      halo.position.y = 0.02;
      group.add(halo);
      break;
    }
  }

  return group;
}

function spawnMuzzleFlash(
  x: number,
  z: number,
  parent: THREE.Group,
  flashes: MuzzleFlashEffect[],
  color: number,
  type: TowerType
): void {
  const burst = new THREE.Mesh(
    new THREE.CircleGeometry(0.12, 6),
    basicGlow(0xffffff, 0.82)
  );
  burst.rotation.x = -Math.PI / 2;
  burst.position.set(x, 0.22, z);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.08, 0.14, 20),
    basicGlow(color, 0.58)
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(x, 0.18, z);

  const sparks: THREE.Mesh[] = [];
  if (type === 'ARCHER' || type === 'SNIPER') {
    for (let i = 0; i < 2; i++) {
      const spark = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.03), basicGlow(color, 0.72));
      spark.rotation.x = -Math.PI / 2;
      spark.rotation.z = i === 0 ? Math.PI / 8 : -Math.PI / 8;
      spark.position.set(x, 0.185, z);
      parent.add(spark);
      sparks.push(spark);
    }
  } else if (type === 'HEALER' || type === 'DIVINE') {
    const vertical = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.2), basicGlow(color, 0.68));
    vertical.rotation.x = -Math.PI / 2;
    vertical.position.set(x, 0.185, z);
    parent.add(vertical);
    sparks.push(vertical);

    const horizontal = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.05), basicGlow(0xffffff, 0.78));
    horizontal.rotation.x = -Math.PI / 2;
    horizontal.position.set(x, 0.186, z);
    parent.add(horizontal);
    sparks.push(horizontal);
  } else if (type === 'WORD' || type === 'MAGIC' || type === 'CHRONO' || type === 'VOID') {
    for (let i = 0; i < 2; i++) {
      const spark = new THREE.Mesh(new THREE.RingGeometry(0.05 + i * 0.05, 0.07 + i * 0.05, 18), basicGlow(color, 0.52));
      spark.rotation.x = -Math.PI / 2;
      spark.position.set(x, 0.186 + i * 0.002, z);
      parent.add(spark);
      sparks.push(spark);
    }
  } else {
    for (let i = 0; i < 4; i++) {
      const spark = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.16), basicGlow(color, 0.74));
      spark.rotation.x = -Math.PI / 2;
      spark.rotation.z = (Math.PI / 2) * i;
      spark.position.set(x, 0.185, z);
      parent.add(spark);
      sparks.push(spark);
    }
  }

  parent.add(burst);
  parent.add(ring);
  flashes.push({ burst, ring, sparks, life: 0.18, maxLife: 0.18 });
}

function spawnDeathWave(
  x: number,
  z: number,
  parent: THREE.Group,
  waves: DeathWaveEffect[],
  color: number,
  type: Enemy['type'],
  boss = false
): void {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(boss ? 0.24 : 0.18, boss ? 0.36 : 0.28, 32),
    basicGlow(color, boss ? 0.72 : 0.58)
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(x, 0.14, z);

  const glow = new THREE.Mesh(
    new THREE.CircleGeometry(boss ? 0.24 : 0.18, 28),
    basicGlow(color, boss ? 0.22 : 0.16)
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.set(x, 0.13, z);

  const shards: THREE.Mesh[] = [];
  const shardMaterialOpacity = boss ? 0.5 : 0.36;
  if (type === 'SLIME') {
    for (let i = 0; i < 5; i++) {
      const shard = new THREE.Mesh(
        new THREE.CircleGeometry(0.05 + i * 0.01, 14),
        basicGlow(0xffffff, shardMaterialOpacity)
      );
      shard.rotation.x = -Math.PI / 2;
      shard.position.set(x, 0.141, z);
      parent.add(shard);
      shards.push(shard);
    }
  } else if (FLYING_TYPES.has(type)) {
    for (let i = 0; i < 4; i++) {
      const shard = new THREE.Mesh(
        new THREE.PlaneGeometry(0.08, 0.26),
        basicGlow(0xffffff, shardMaterialOpacity)
      );
      shard.rotation.x = -Math.PI / 2;
      shard.rotation.z = (Math.PI / 2) * i + Math.PI / 4;
      shard.position.set(x, 0.141, z);
      parent.add(shard);
      shards.push(shard);
    }
  } else if (ARMORED_TYPES.has(type)) {
    for (let i = 0; i < 4; i++) {
      const shard = new THREE.Mesh(
        new THREE.PlaneGeometry(0.1, 0.32),
        basicGlow(0xffffff, shardMaterialOpacity)
      );
      shard.rotation.x = -Math.PI / 2;
      shard.rotation.z = (Math.PI / 2) * i;
      shard.position.set(x, 0.141, z);
      parent.add(shard);
      shards.push(shard);
    }
  } else if (CASTER_TYPES.has(type)) {
    for (let i = 0; i < 2; i++) {
      const shard = new THREE.Mesh(
        new THREE.RingGeometry(0.08 + i * 0.08, 0.11 + i * 0.08, 20),
        basicGlow(0xffffff, shardMaterialOpacity)
      );
      shard.rotation.x = -Math.PI / 2;
      shard.position.set(x, 0.141 + i * 0.002, z);
      parent.add(shard);
      shards.push(shard);
    }
  } else {
    const shardCount = boss ? 6 : 4;
    for (let i = 0; i < shardCount; i++) {
      const shard = new THREE.Mesh(
        new THREE.PlaneGeometry(boss ? 0.14 : 0.1, boss ? 0.34 : 0.24),
        basicGlow(0xffffff, shardMaterialOpacity)
      );
      shard.rotation.x = -Math.PI / 2;
      shard.rotation.z = (Math.PI * 2 * i) / shardCount;
      shard.position.set(x, 0.141, z);
      parent.add(shard);
      shards.push(shard);
    }
  }

  parent.add(ring);
  parent.add(glow);
  waves.push({ ring, glow, shards, life: boss ? 0.46 : 0.34, maxLife: boss ? 0.46 : 0.34 });
}

function buildBossTelegraph(type: Enemy['type']): THREE.Group {
  const telegraph = new THREE.Group();
  telegraph.userData.bossTelegraph = true;

  const outerRing = new THREE.Mesh(new THREE.RingGeometry(0.88, 1.08, 48), basicGlow(0xef4444, 0.18));
  outerRing.rotation.x = -Math.PI / 2;
  outerRing.position.y = 0.03;
  outerRing.userData.outerRing = true;
  telegraph.add(outerRing);

  if (type === 'HYDRA') {
    for (let i = 0; i < 3; i++) {
      const arc = new THREE.Mesh(new THREE.RingGeometry(0.3 + i * 0.16, 0.36 + i * 0.16, 24, 1, 0, Math.PI * 0.7), basicGlow(0xfca5a5, 0.24));
      arc.rotation.x = -Math.PI / 2;
      arc.rotation.z = -Math.PI / 3 + i * (Math.PI / 3);
      arc.position.y = 0.031;
      telegraph.add(arc);
    }
  } else if (type === 'DRAGON' || type === 'PHOENIX_CHICK') {
    for (let i = 0; i < 4; i++) {
      const flame = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.52), basicGlow(0xfb7185, 0.22));
      flame.rotation.x = -Math.PI / 2;
      flame.rotation.z = (Math.PI / 2) * i;
      flame.position.y = 0.031;
      telegraph.add(flame);
    }
  } else if (type === 'LICH_KING' || type === 'WORD_DESTROYER') {
    for (let i = 0; i < 2; i++) {
      const sigil = new THREE.Mesh(new THREE.RingGeometry(0.24 + i * 0.18, 0.28 + i * 0.18, 24), basicGlow(0xf0abfc, 0.24));
      sigil.rotation.x = -Math.PI / 2;
      sigil.position.y = 0.031 + i * 0.002;
      telegraph.add(sigil);
    }
  } else {
    for (let i = 0; i < 4; i++) {
      const spike = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.46), basicGlow(0xfca5a5, 0.2));
      spike.rotation.x = -Math.PI / 2;
      spike.rotation.z = (Math.PI / 2) * i;
      spike.position.y = 0.031;
      telegraph.add(spike);
    }
  }

  return telegraph;
}

function spawnBossIntro(
  x: number,
  z: number,
  parent: THREE.Group,
  intros: BossIntroEffect[],
  color: number
): void {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.34, 0.48, 40),
    basicGlow(color, 0.82)
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(x, 0.16, z);

  const glow = new THREE.Mesh(
    new THREE.CircleGeometry(0.28, 28),
    basicGlow(0xffffff, 0.22)
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.set(x, 0.15, z);

  const spikes: THREE.Mesh[] = [];
  for (let i = 0; i < 6; i++) {
    const spike = new THREE.Mesh(
      new THREE.PlaneGeometry(0.08, 0.44),
      basicGlow(color, 0.5)
    );
    spike.rotation.x = -Math.PI / 2;
    spike.rotation.z = (Math.PI * 2 * i) / 6;
    spike.position.set(x, 0.161, z);
    parent.add(spike);
    spikes.push(spike);
  }

  parent.add(ring);
  parent.add(glow);
  intros.push({ ring, glow, spikes, life: 0.7, maxLife: 0.7 });
}

function addSelectionRing(group: THREE.Group, color: number): void {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.46, 0.03, 8, 40),
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: color, emissiveIntensity: 1.2 })
  );
  ring.userData.selectionRing = true;
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.06;
  group.add(ring);
}

function addTowerShadow(group: THREE.Group): void {
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.42, 24),
    new THREE.MeshBasicMaterial({ color: 0x020617, transparent: true, opacity: 0.3 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.01;
  shadow.userData.softShadow = true;
  group.add(shadow);
}

function createPedestal(color: number): THREE.Group {
  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.44, 0.16, 12), standardMaterial(0x111827));
  base.position.y = 0.08;
  group.add(base);

  const trim = new THREE.Mesh(
    new THREE.TorusGeometry(0.28, 0.03, 8, 32),
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: color, emissiveIntensity: 0.6 })
  );
  trim.rotation.x = Math.PI / 2;
  trim.position.y = 0.17;
  group.add(trim);
  return group;
}

function createArcherTower(color: number): THREE.Group {
  const group = createPedestal(color);
  const wood = standardMaterial(0x6b4423);
  const roof = standardMaterial(color, color, 0.22);

  const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.95, 8), standardMaterial(0x9ca3af));
  tower.position.y = 0.62;
  group.add(tower);

  const roofCone = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.45, 8), roof);
  roofCone.position.y = 1.32;
  group.add(roofCone);

  const bow = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.025, 6, 18, Math.PI), standardMaterial(0xf59e0b));
  bow.rotation.z = Math.PI / 2;
  bow.position.set(0.26, 0.8, 0);
  group.add(bow);

  const balcony = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.03, 8, 28), wood);
  balcony.rotation.x = Math.PI / 2;
  balcony.position.y = 0.92;
  group.add(balcony);

  for (const x of [-0.17, 0.17]) {
    const support = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.42, 0.05), wood);
    support.position.set(x, 0.88, 0.18);
    group.add(support);
  }

  const banner = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.22), basicGlow(color, 0.42));
  banner.position.set(-0.18, 1.06, 0.2);
  group.add(banner);

  addTowerShadow(group);
  return group;
}

function createMagicTower(color: number): THREE.Group {
  const group = new THREE.Group();
  const crystalMat = standardMaterial(color, color, 0.45);

  const dais = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 0.18, 12), standardMaterial(0x334155));
  dais.position.y = 0.09;
  group.add(dais);

  const spire = new THREE.Mesh(new THREE.OctahedronGeometry(0.38, 0), crystalMat);
  spire.position.y = 0.76;
  spire.scale.set(0.55, 1.6, 0.55);
  group.add(spire);

  const orbit = new THREE.Mesh(
    new THREE.TorusGeometry(0.34, 0.02, 10, 40),
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: color, emissiveIntensity: 0.8 })
  );
  orbit.rotation.x = Math.PI / 2;
  orbit.position.y = 1.05;
  group.add(orbit);
  return group;
}

function createElementalPylon(color: number, topper: 'crystal' | 'coil' | 'orb'): THREE.Group {
  const group = createPedestal(color);

  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.62, 10), standardMaterial(0x475569));
  column.position.y = 0.45;
  group.add(column);

  if (topper === 'crystal') {
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), standardMaterial(color, color, 0.6));
    crystal.position.y = 0.95;
    crystal.scale.set(0.8, 1.2, 0.8);
    group.add(crystal);
  } else if (topper === 'coil') {
    const coil = new THREE.Mesh(new THREE.TorusKnotGeometry(0.15, 0.035, 50, 8), standardMaterial(color, color, 0.7));
    coil.position.y = 0.93;
    coil.rotation.x = Math.PI / 2;
    group.add(coil);
  } else {
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), standardMaterial(0xffffff, color, 0.8));
    orb.position.y = 0.96;
    group.add(orb);
  }
  addTowerShadow(group);
  return group;
}

function createHealerTower(color: number): THREE.Group {
  const group = createPedestal(color);
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.72, 12), standardMaterial(0xffffff, color, 0.3));
  pillar.position.y = 0.5;
  group.add(pillar);

  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.03, 8, 28), standardMaterial(0xfef2f2, color, 0.82));
  halo.rotation.x = Math.PI / 2;
  halo.position.y = 1.06;
  group.add(halo);

  const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.34, 0.08), standardMaterial(0xffffff, color, 0.5));
  crossV.position.y = 0.98;
  group.add(crossV);

  const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.08, 0.08), standardMaterial(0xffffff, color, 0.5));
  crossH.position.y = 0.98;
  group.add(crossH);

  const petals = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.02, 8, 20), standardMaterial(0xffffff, color, 0.55));
  petals.rotation.y = Math.PI / 2;
  petals.position.y = 0.7;
  group.add(petals);

  addTowerShadow(group);
  return group;
}

function createFlameTower(color: number): THREE.Group {
  const group = createPedestal(color);
  const brazier = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, 0.28, 10), standardMaterial(0x7c2d12));
  brazier.position.y = 0.3;
  group.add(brazier);

  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.5, 8), standardMaterial(0xffedd5, color, 1));
  flame.position.y = 0.82;
  group.add(flame);

  const flameCore = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), standardMaterial(0xffffff, 0xffedd5, 1));
  flameCore.position.y = 0.66;
  group.add(flameCore);

  addTowerShadow(group);
  return group;
}

function createWordTower(color: number): THREE.Group {
  const group = createPedestal(color);
  const tablet = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.56, 0.12), standardMaterial(0x164e63));
  tablet.position.y = 0.56;
  group.add(tablet);

  const runeLine1 = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.05, 0.02), standardMaterial(0xffffff, color, 0.9));
  runeLine1.position.set(0, 0.68, 0.08);
  group.add(runeLine1);

  const runeLine2 = runeLine1.clone();
  runeLine2.scale.x = 0.7;
  runeLine2.position.y = 0.52;
  group.add(runeLine2);

  const glyph = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.024, 8, 24), standardMaterial(0xffffff, color, 0.95));
  glyph.rotation.y = Math.PI / 2;
  glyph.position.set(0.26, 0.72, 0);
  group.add(glyph);

  addTowerShadow(group);
  return group;
}

function createMineTower(color: number): THREE.Group {
  const group = createPedestal(color);

  const crate = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.34, 0.42), standardMaterial(0x7c4a19));
  crate.position.y = 0.33;
  group.add(crate);

  const nugget = new THREE.Mesh(new THREE.IcosahedronGeometry(0.14, 0), standardMaterial(color, color, 0.7));
  nugget.position.y = 0.63;
  group.add(nugget);

  const rails = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.04, 0.56), standardMaterial(0x334155));
  rails.position.y = 0.19;
  group.add(rails);
  addTowerShadow(group);
  return group;
}

function createCannonTower(color: number): THREE.Group {
  const group = createPedestal(color);
  const darkMetal = standardMaterial(0x475569);
  const accent = standardMaterial(color, color, 0.15);

  const base = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.18, 0.54), accent);
  base.position.y = 0.24;
  group.add(base);

  const wheelLeft = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.05, 10, 20), darkMetal);
  wheelLeft.rotation.y = Math.PI / 2;
  wheelLeft.position.set(-0.2, 0.16, 0.19);
  group.add(wheelLeft);
  const wheelRight = wheelLeft.clone();
  wheelRight.position.z = -0.19;
  group.add(wheelRight);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.88, 16), darkMetal);
  barrel.rotation.z = Math.PI / 2;
  barrel.position.set(0.2, 0.5, 0);
  group.add(barrel);

  const muzzle = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.02, 8, 18), accent);
  muzzle.rotation.y = Math.PI / 2;
  muzzle.position.set(0.62, 0.5, 0);
  group.add(muzzle);

  const rearBrace = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.22), standardMaterial(0x7c4a19));
  rearBrace.position.set(-0.05, 0.34, 0);
  group.add(rearBrace);

  const sidePlate = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.48), accent);
  sidePlate.position.set(0.05, 0.34, 0);
  group.add(sidePlate);
  addTowerShadow(group);
  return group;
}

function createSniperTower(color: number): THREE.Group {
  const group = new THREE.Group();
  const metal = standardMaterial(0x64748b);
  const accent = standardMaterial(color, color, 0.12);

  const tripod = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.12, 0.8, 6), metal);
  tripod.position.y = 0.42;
  group.add(tripod);

  const rifle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.2, 12), accent);
  rifle.rotation.z = Math.PI / 2;
  rifle.position.set(0.34, 0.88, 0);
  group.add(rifle);

  const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.28, 12), metal);
  scope.rotation.z = Math.PI / 2;
  scope.position.set(0.26, 0.98, 0);
  group.add(scope);

  const standLeft = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.46, 0.04), metal);
  standLeft.position.set(-0.08, 0.23, 0.12);
  standLeft.rotation.z = 0.18;
  group.add(standLeft);

  const standRight = standLeft.clone();
  standRight.position.z = -0.12;
  standRight.rotation.z = -0.18;
  group.add(standRight);

  const cheekPad = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.08), standardMaterial(0x1f2937));
  cheekPad.position.set(0.02, 0.9, 0);
  group.add(cheekPad);
  addTowerShadow(group);
  return group;
}

function createSupportTower(color: number): THREE.Group {
  const group = createPedestal(color);

  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.72, 10), standardMaterial(color, color, 0.25));
  pillar.position.y = 0.5;
  group.add(pillar);

  const top = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 0), standardMaterial(0xffffff, color, 0.65));
  top.position.y = 1.02;
  group.add(top);
  addTowerShadow(group);
  return group;
}

function createWallTower(color: number): THREE.Group {
  const group = createPedestal(color);
  const stone = standardMaterial(0x7c5a3a);
  const accent = standardMaterial(color, color, 0.08);

  const wall = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.5, 0.38), stone);
  wall.position.y = 0.25;
  group.add(wall);

  const brace = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.12, 0.14), accent);
  brace.position.set(0, 0.52, 0);
  group.add(brace);

  const spikes = new THREE.Group();
  for (let i = -1; i <= 1; i++) {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 6), standardMaterial(0xf8fafc));
    spike.position.set(i * 0.18, 0.67, 0);
    spikes.add(spike);
  }
  group.add(spikes);
  addTowerShadow(group);
  return group;
}

function createTowerMesh(type: TowerType, selected: boolean): THREE.Group {
  const color = TOWER_COLORS[type] ?? 0x60a5fa;
  let group: THREE.Group;

  switch (type) {
    case 'ARCHER':
      group = createArcherTower(color);
      break;
    case 'MAGIC':
    case 'CHRONO':
    case 'DIVINE':
      group = createMagicTower(color);
      break;
    case 'CANNON':
    case 'METEOR':
      group = createCannonTower(color);
      break;
    case 'ICE':
      group = createElementalPylon(color, 'crystal');
      break;
    case 'LIGHTNING':
      group = createElementalPylon(color, 'coil');
      break;
    case 'POISON':
    case 'VOID':
      group = createElementalPylon(color, 'orb');
      break;
    case 'HEALER':
      group = createHealerTower(color);
      break;
    case 'PHOENIX':
    case 'FLAME':
      group = createFlameTower(color);
      break;
    case 'WORD':
      group = createWordTower(color);
      break;
    case 'SNIPER':
      group = createSniperTower(color);
      break;
    case 'BARRICADE':
      group = createWallTower(color);
      break;
    case 'GOLDMINE':
      group = createMineTower(color);
      break;
    default:
      group = createSupportTower(color);
      break;
  }

  if (selected) addSelectionRing(group, color);
  return group;
}

function createHumanoidEnemy(color: number, elite: boolean): THREE.Group {
  const group = new THREE.Group();
  const mat = enemyMaterial(color, elite ? 0xfacc15 : color, elite ? 0.28 : 0.08);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.46, 0.22), mat);
  body.position.y = 0.38;
  group.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 14), mat);
  head.position.y = 0.74;
  group.add(head);

  const shoulders = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.08, 0.2), enemyMaterial(0x1f2937));
  shoulders.position.y = 0.55;
  group.add(shoulders);

  for (const x of [-0.18, 0.18]) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.24, 4, 8), enemyMaterial(color, elite ? 0xfacc15 : color, elite ? 0.22 : 0.05));
    arm.position.set(x, 0.42, 0);
    arm.rotation.z = x < 0 ? 0.28 : -0.28;
    group.add(arm);
  }

  const eyeLeft = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), enemyMaterial(0xf8fafc, elite ? 0xfacc15 : 0xffffff, 0.6));
  eyeLeft.position.set(-0.05, 0.76, 0.12);
  group.add(eyeLeft);
  const eyeRight = eyeLeft.clone();
  eyeRight.position.x = 0.05;
  group.add(eyeRight);

  for (const x of [-0.08, 0.08]) {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.2, 4, 8), enemyMaterial(0x0f172a));
    leg.position.set(x, 0.1, 0);
    group.add(leg);
  }

  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.05, 0.24), enemyMaterial(0x111827));
  belt.position.y = 0.25;
  group.add(belt);
  return group;
}

function createArmoredEnemy(color: number, elite: boolean): THREE.Group {
  const group = createHumanoidEnemy(color, elite);
  const armor = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.32, 0.28), enemyMaterial(0xe2e8f0));
  armor.position.y = 0.42;
  group.add(armor);

  const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.08, 16), enemyMaterial(0x64748b));
  shield.rotation.z = Math.PI / 2;
  shield.position.set(0.24, 0.46, 0);
  group.add(shield);

  const helm = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.12, 0.22), enemyMaterial(0xcbd5e1));
  helm.position.set(0, 0.84, 0);
  group.add(helm);

  const plume = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 6), enemyMaterial(color, elite ? 0xfacc15 : color, 0.3));
  plume.position.set(0, 0.98, 0);
  group.add(plume);

  for (const x of [-0.16, 0.16]) {
    const pauldron = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10), enemyMaterial(0x94a3b8));
    pauldron.position.set(x, 0.55, 0);
    pauldron.scale.set(1.15, 0.7, 1);
    group.add(pauldron);
  }
  return group;
}

function createBeastEnemy(color: number, elite: boolean): THREE.Group {
  const group = new THREE.Group();
  const mat = enemyMaterial(color, elite ? 0xfacc15 : color, elite ? 0.22 : 0.06);

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.42, 6, 10), mat);
  torso.rotation.z = Math.PI / 2;
  torso.position.set(0, 0.34, 0);
  group.add(torso);

  const head = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.28, 5), mat);
  head.rotation.z = -Math.PI / 2;
  head.position.set(0.34, 0.38, 0);
  group.add(head);

  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.26, 5), enemyMaterial(0x78350f));
  tail.rotation.z = Math.PI / 2;
  tail.position.set(-0.34, 0.34, 0);
  group.add(tail);

  const mane = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 0.24, 8), enemyMaterial(0xfde68a, color, 0.25));
  mane.rotation.z = Math.PI / 2;
  mane.position.set(0.14, 0.5, 0);
  group.add(mane);

  for (const x of [-0.18, 0.12]) {
    for (const z of [-0.08, 0.08]) {
      const paw = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.18, 6), enemyMaterial(0x422006));
      paw.position.set(x, 0.08, z);
      group.add(paw);
    }
  }

  for (const x of [0.28, 0.4]) {
    const fang = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.08, 5), enemyMaterial(0xf8fafc));
    fang.position.set(x, 0.3, x === 0.28 ? 0.06 : -0.06);
    fang.rotation.z = Math.PI;
    group.add(fang);
  }
  return group;
}

function createSlimeEnemy(color: number, elite: boolean): THREE.Group {
  const group = new THREE.Group();
  const mat = enemyMaterial(color, elite ? 0xfacc15 : color, elite ? 0.22 : 0.05);
  const blob = new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 18), mat);
  blob.position.y = 0.22;
  blob.scale.set(1.2, 0.85, 1.15);
  group.add(blob);

  const topBlob = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 14), mat);
  topBlob.position.set(0.02, 0.48, 0);
  group.add(topBlob);

  const core = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 14), enemyMaterial(0xc7f9cc, color, 0.18));
  core.position.set(0, 0.22, 0);
  core.scale.set(0.9, 0.75, 0.9);
  group.add(core);

  const eyes = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), enemyMaterial(0xffffff));
  eyes.position.set(-0.07, 0.26, 0.18);
  group.add(eyes);
  const eyes2 = eyes.clone();
  eyes2.position.x = 0.07;
  group.add(eyes2);

  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 6, 16, Math.PI), enemyMaterial(0x111827));
  mouth.position.set(0, 0.2, 0.17);
  mouth.rotation.z = Math.PI;
  group.add(mouth);

  const gleam = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 10), enemyMaterial(0xffffff, color, 0.8));
  gleam.position.set(-0.09, 0.38, 0.12);
  group.add(gleam);
  return group;
}

function createFlyingEnemy(color: number, elite: boolean): THREE.Group {
  const group = new THREE.Group();
  const mat = enemyMaterial(color, elite ? 0xfacc15 : color, elite ? 0.3 : 0.08);
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 14), mat);
  body.position.y = 0.46;
  body.scale.set(1.1, 0.9, 1.3);
  group.add(body);

  const wingGeo = new THREE.CapsuleGeometry(0.05, 0.3, 4, 8);
  const leftWing = new THREE.Mesh(wingGeo, enemyMaterial(0x1f2937));
  leftWing.position.set(-0.24, 0.48, 0);
  leftWing.rotation.z = 0.55;
  leftWing.rotation.x = 0.4;
  leftWing.userData.wing = 'left';
  group.add(leftWing);
  const rightWing = leftWing.clone();
  rightWing.position.x = 0.24;
  rightWing.rotation.z = -0.55;
  rightWing.rotation.x = -0.4;
  rightWing.userData.wing = 'right';
  group.add(rightWing);

  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.18, 4), enemyMaterial(0xfef08a));
  beak.rotation.z = -Math.PI / 2;
  beak.position.set(0.18, 0.44, 0);
  group.add(beak);

  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.2, 4), enemyMaterial(color, elite ? 0xfacc15 : color, 0.2));
  tail.rotation.z = Math.PI / 2;
  tail.position.set(-0.18, 0.45, 0);
  group.add(tail);

  for (const x of [-0.06, 0.06]) {
    const claw = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.14, 5), enemyMaterial(0xf8fafc));
    claw.position.set(x, 0.24, 0.02);
    group.add(claw);
  }
  return group;
}

function createCasterEnemy(color: number, elite: boolean): THREE.Group {
  const group = createHumanoidEnemy(color, elite);
  const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.56, 8), enemyMaterial(0xf8fafc));
  staff.position.set(0.18, 0.54, 0);
  staff.rotation.z = 0.2;
  group.add(staff);

  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 12), enemyMaterial(0xffffff, color, 0.9));
  orb.position.set(0.24, 0.84, 0);
  group.add(orb);

  const robe = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.42, 6), enemyMaterial(0x312e81, color, 0.22));
  robe.position.set(0, 0.18, 0);
  group.add(robe);

  const hood = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), enemyMaterial(0x1e1b4b));
  hood.position.set(0, 0.8, -0.02);
  hood.scale.set(1, 1.05, 0.9);
  group.add(hood);
  return group;
}

function createBossEnemy(color: number, elite: boolean, type: Enemy['type']): THREE.Group {
  const group = new THREE.Group();
  const mat = enemyMaterial(color, 0xffaa00, elite ? 0.4 : 0.18);

  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.34, 0), mat);
  core.position.y = 0.66;
  core.scale.set(1.2, 1.5, 1.1);
  group.add(core);

  if (type === 'HYDRA') {
    for (const x of [-0.22, 0, 0.22]) {
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.52, 8), enemyMaterial(0x14532d, color, 0.45));
      neck.position.set(x, 0.86, 0);
      neck.rotation.z = x * 0.8;
      group.add(neck);

      const head = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.25, 6), enemyMaterial(0x22c55e, color, 0.55));
      head.position.set(x * 1.1, 1.18, 0);
      head.rotation.z = Math.PI / 2;
      group.add(head);
    }
  } else {
    const hornLeft = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.32, 6), enemyMaterial(0xfef3c7));
    hornLeft.position.set(-0.18, 1.08, 0);
    hornLeft.rotation.z = 0.45;
    group.add(hornLeft);
    const hornRight = hornLeft.clone();
    hornRight.position.x = 0.18;
    hornRight.rotation.z = -0.45;
    group.add(hornRight);
  }

  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.24, 0.28), enemyMaterial(0x111827));
  chest.position.set(0, 0.38, 0);
  group.add(chest);
  return group;
}

function createEnemyMesh(enemy: Enemy): THREE.Group {
  const color = ENEMY_COLORS[enemy.type] ?? 0xef4444;
  let group: THREE.Group;

  if (BOSS_TYPES.has(enemy.type)) {
    group = createBossEnemy(color, !!enemy.isElite, enemy.type);
  } else if (enemy.type === 'SLIME') {
    group = createSlimeEnemy(color, !!enemy.isElite);
  } else if (FLYING_TYPES.has(enemy.type)) {
    group = createFlyingEnemy(color, !!enemy.isElite);
  } else if (ARMORED_TYPES.has(enemy.type)) {
    group = createArmoredEnemy(color, !!enemy.isElite);
  } else if (CASTER_TYPES.has(enemy.type)) {
    group = createCasterEnemy(color, !!enemy.isElite);
  } else if (['WOLF', 'IRON_TURTLE'].includes(enemy.type)) {
    group = createBeastEnemy(color, !!enemy.isElite);
  } else {
    group = createHumanoidEnemy(color, !!enemy.isElite);
  }

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(BOSS_TYPES.has(enemy.type) ? 0.48 : 0.32, 24),
    new THREE.MeshBasicMaterial({ color: 0x020617, transparent: true, opacity: 0.25 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  const hpBarWidth = BOSS_TYPES.has(enemy.type) ? 0.92 : 0.58;
  const hpBarY = BOSS_TYPES.has(enemy.type) ? 1.62 : 1.1;
  const hpBarWrap = new THREE.Group();
  hpBarWrap.userData.hpBarWrap = true;
  hpBarWrap.position.set(0, hpBarY, 0);
  group.add(hpBarWrap);

  const hpBarBack = new THREE.Mesh(
    new THREE.PlaneGeometry(hpBarWidth, BOSS_TYPES.has(enemy.type) ? 0.11 : 0.08),
    new THREE.MeshBasicMaterial({ color: 0x0f172a, transparent: true, opacity: 0.82, side: THREE.DoubleSide })
  );
  hpBarBack.userData.hpBarBack = true;
  hpBarWrap.add(hpBarBack);

  const hpBarFill = new THREE.Mesh(
    new THREE.PlaneGeometry(hpBarWidth * 0.94, BOSS_TYPES.has(enemy.type) ? 0.065 : 0.05),
    new THREE.MeshBasicMaterial({ color: 0x4ade80, transparent: true, opacity: 0.95, side: THREE.DoubleSide })
  );
  hpBarFill.userData.hpBarFill = true;
  hpBarFill.position.z = 0.001;
  hpBarWrap.add(hpBarFill);

  if (enemy.isElite) addSelectionRing(group, 0xfacc15);

  if (enemy.shield) {
    const shield = new THREE.Mesh(
      new THREE.TorusGeometry(0.42, 0.03, 8, 32),
      enemyMaterial(0x7dd3fc, 0x38bdf8, 0.9)
    );
    shield.rotation.x = Math.PI / 2;
    shield.position.y = 0.42;
    group.add(shield);
  }

  return group;
}

function updateEnemyMesh(group: THREE.Group, enemy: Enemy, time: number): void {
  resetEnemyMaterialState(group);
  const bob = enemy.isRaging ? 0.08 : FLYING_TYPES.has(enemy.type) ? 0.18 : 0.05;
  group.position.y = Math.sin(time * (enemy.isRaging ? 8 : 4)) * bob;
  group.rotation.y += enemy.isRaging ? 0.07 : 0.03;

  const hpBarWrap = group.children.find((child) => child.userData.hpBarWrap) as THREE.Group | undefined;
  const hpBarFill = hpBarWrap?.children.find((child) => child.userData.hpBarFill) as THREE.Mesh | undefined;
  if (hpBarWrap && hpBarFill) {
    const hpRatio = enemy.maxHp > 0 ? Math.max(0, Math.min(1, enemy.displayHp / enemy.maxHp)) : 0;
    hpBarWrap.rotation.y = -group.rotation.y;
    hpBarWrap.visible = hpRatio < 0.999;
    hpBarFill.scale.x = Math.max(0.001, hpRatio);
    hpBarFill.position.x = -(1 - hpRatio) * 0.5 * (hpBarFill.geometry as THREE.PlaneGeometry).parameters.width;
    const fillMaterial = hpBarFill.material as THREE.MeshBasicMaterial;
    fillMaterial.color.setHex(hpRatio > 0.6 ? 0x4ade80 : hpRatio > 0.3 ? 0xfacc15 : 0xf87171);
  }

  if (FLYING_TYPES.has(enemy.type) || enemy.type === 'DRAGON') {
    const leftWing = group.children.find((child) => child.userData.wing === 'left') as THREE.Mesh | undefined;
    const rightWing = group.children.find((child) => child.userData.wing === 'right') as THREE.Mesh | undefined;
    if (leftWing && rightWing) {
      leftWing.rotation.z = 0.2 + Math.sin(time * 16) * 0.35;
      rightWing.rotation.z = -0.2 - Math.sin(time * 16) * 0.35;
    }
  }
}

function createMapTile(cell: number): THREE.Mesh {
  const isPath = cell === 1;
  const isBuild = cell !== 1;
  const material = new THREE.MeshStandardMaterial({
    color: isPath ? 0x7c8ea3 : isBuild ? 0x25463e : 0x17332d,
    roughness: isPath ? 0.78 : 0.94,
    metalness: isPath ? 0.08 : 0.02,
  });
  const tile = new THREE.Mesh(
    new THREE.BoxGeometry(0.94, isPath ? 0.12 : 0.08, 0.94),
    material
  );
  tile.receiveShadow = true;
  return tile;
}

function createProjectileMesh(color: number): THREE.Group {
  const group = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 10, 10),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.9 })
  );
  group.add(core);

  const tail = new THREE.Mesh(
    new THREE.ConeGeometry(0.06, 0.24, 10),
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: color, emissiveIntensity: 0.8 })
  );
  tail.position.x = -0.1;
  tail.rotation.z = Math.PI / 2;
  group.add(tail);

  const halo = new THREE.Mesh(new THREE.RingGeometry(0.09, 0.14, 18), basicGlow(color, 0.34));
  halo.rotation.y = Math.PI / 2;
  group.add(halo);
  return group;
}

function applyTowerIdleMotion(mesh: THREE.Group, tower: Tower, frame: number): void {
  const t = frame * 0.04 + tower.position.col * 0.7 + tower.position.row * 0.35;
  switch (tower.type) {
    case 'MAGIC':
    case 'DIVINE':
    case 'CHRONO':
    case 'WORD':
      mesh.position.y += Math.sin(t) * 0.04;
      break;
    case 'LIGHTNING': {
      const coil = mesh.children.find((child) => child instanceof THREE.Mesh && child.geometry instanceof THREE.TorusKnotGeometry);
      if (coil) coil.rotation.y += 0.05;
      break;
    }
    case 'HEALER': {
      const halo = mesh.children.find((child) => child instanceof THREE.Mesh && child.geometry instanceof THREE.TorusGeometry);
      if (halo) {
        halo.rotation.z += 0.03;
        halo.position.y = 1.02 + Math.sin(t * 1.4) * 0.05;
      }
      break;
    }
    case 'FLAME':
    case 'PHOENIX': {
      const flame = mesh.children.find((child) => child instanceof THREE.Mesh && child.geometry instanceof THREE.ConeGeometry);
      if (flame) {
        flame.scale.y = 0.92 + (Math.sin(t * 2.2) + 1) * 0.12;
        flame.rotation.y += 0.03;
      }
      break;
    }
    case 'GOLDMINE': {
      const nugget = mesh.children.find((child) => child instanceof THREE.Mesh && child.geometry instanceof THREE.IcosahedronGeometry);
      if (nugget) nugget.rotation.y += 0.035;
      break;
    }
    case 'SNIPER': {
      const rifle = mesh.children.find((child) => child instanceof THREE.Mesh && child.geometry instanceof THREE.CylinderGeometry);
      if (rifle) rifle.rotation.y = Math.sin(t * 0.8) * 0.08;
      break;
    }
    default:
      break;
  }
}

function resetEnemyMaterialState(group: THREE.Group): void {
  group.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!('material' in mesh)) return;
    const material = mesh.material;
    if (Array.isArray(material) || !(material instanceof THREE.MeshStandardMaterial)) return;

    const baseColor = material.userData.baseColor;
    const baseEmissive = material.userData.baseEmissive;
    const baseEmissiveIntensity = material.userData.baseEmissiveIntensity;

    if (typeof baseColor === 'number') material.color.setHex(baseColor);
    if (typeof baseEmissive === 'number') material.emissive.setHex(baseEmissive);
    material.emissiveIntensity = typeof baseEmissiveIntensity === 'number' ? baseEmissiveIntensity : 0;
  });
}

function applyEnemyHitFlash(group: THREE.Group, amount: number): void {
  group.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!('material' in mesh)) return;
    const material = mesh.material;
    if (Array.isArray(material)) return;
    if (material instanceof THREE.MeshStandardMaterial) {
      material.color.lerp(new THREE.Color(0xffc4b5), amount * 0.18);
      material.emissive.lerp(new THREE.Color(0xef4444), amount * 0.52);
      material.emissiveIntensity = Math.max(material.emissiveIntensity, 0.15 + amount * 0.9);
    }
  });
}

function spawnBurst(target: THREE.Object3D, parent: THREE.Group, effects: BurstEffect[], color: number, count: number, upward = 1.2): void {
  const burst = new THREE.Group();
  for (let i = 0; i < count; i++) {
    const shard = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.04 + Math.random() * 0.04, 0),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.7 })
    );
    shard.position.set((Math.random() - 0.5) * 0.28, Math.random() * 0.18, (Math.random() - 0.5) * 0.28);
    burst.add(shard);
  }

  burst.position.copy(target.position);
  parent.add(burst);
  effects.push({
    mesh: burst,
    velocity: new THREE.Vector3((Math.random() - 0.5) * 0.02, upward * 0.01, (Math.random() - 0.5) * 0.02),
    life: 0.55,
    maxLife: 0.55,
    spin: (Math.random() - 0.5) * 0.2,
  });
}

export default function ThreeBattlefield({
  width,
  height,
  cellSize,
  getEngine,
  selectedTowerId,
  placementInfo,
  onTileHover,
  onTileLeave,
  onTileSelect,
}: ThreeBattlefieldProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const selectedTowerIdRef = useRef<string | null>(selectedTowerId);
  const placementInfoRef = useRef<PlacementInfo | null>(placementInfo);
  const onTileHoverRef = useRef<ThreeBattlefieldProps['onTileHover']>(onTileHover);
  const onTileLeaveRef = useRef<ThreeBattlefieldProps['onTileLeave']>(onTileLeave);
  const onTileSelectRef = useRef<ThreeBattlefieldProps['onTileSelect']>(onTileSelect);

  useEffect(() => {
    selectedTowerIdRef.current = selectedTowerId;
  }, [selectedTowerId]);

  useEffect(() => {
    placementInfoRef.current = placementInfo;
  }, [placementInfo]);

  useEffect(() => {
    onTileHoverRef.current = onTileHover;
  }, [onTileHover]);

  useEffect(() => {
    onTileLeaveRef.current = onTileLeave;
  }, [onTileLeave]);

  useEffect(() => {
    onTileSelectRef.current = onTileSelect;
  }, [onTileSelect]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || width <= 0 || height <= 0 || cellSize <= 0) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = false;
    host.innerHTML = '';
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x071525, 8, 30);

    const camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 100);
    camera.position.set(8, 10.6, 16.4);
    camera.lookAt(8, 0, 5.1);

    const ambientLight = new THREE.AmbientLight(0xa5f3fc, 1.32);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.65);
    keyLight.position.set(4, 10, 7);
    scene.add(keyLight);

    const fillLight = new THREE.PointLight(0x2dd4bf, 15, 26, 2);
    fillLight.position.set(12, 5, 2);
    scene.add(fillLight);

    const rimLight = new THREE.PointLight(0x7c3aed, 17, 32, 2);
    rimLight.position.set(-4, 8, 8);
    scene.add(rimLight);

    const warningLight = new THREE.PointLight(0xef4444, 0, 28, 2);
    warningLight.position.set(7.5, 4.5, 4.5);
    scene.add(warningLight);

    const mapGroup = new THREE.Group();
    const towerGroup = new THREE.Group();
    const enemyGroup = new THREE.Group();
    const projectileGroup = new THREE.Group();
    const overlayGroup = new THREE.Group();
    const burstGroup = new THREE.Group();
    scene.add(mapGroup, towerGroup, enemyGroup, projectileGroup, overlayGroup, burstGroup);
    const rows = getEngine()?.getMapData()?.grid.length ?? 10;
    const cols = getEngine()?.getMapData()?.grid[0]?.length ?? 16;

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(22, 15),
      new THREE.MeshStandardMaterial({
        color: 0x0b2b28,
        roughness: 1,
        metalness: 0,
      })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(7.5, -0.06, 4.5);
    ground.receiveShadow = true;
    scene.add(ground);

    const board = new THREE.Mesh(
      new THREE.BoxGeometry(17.8, 0.32, 11.8),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.82, metalness: 0.08 })
    );
    board.position.set(7.5, -0.18, 4.5);
    scene.add(board);

    const backWall = new THREE.Mesh(
      new THREE.PlaneGeometry(22, 8),
      new THREE.MeshBasicMaterial({ color: 0x0b223d, transparent: true, opacity: 0.75 })
    );
    backWall.position.set(7.5, 4.2, -2.6);
    scene.add(backWall);

    const sideGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(4, 14),
      new THREE.MeshBasicMaterial({ color: 0x0f766e, transparent: true, opacity: 0.2, side: THREE.DoubleSide })
    );
    sideGlow.position.set(-1.5, 2.2, 4.5);
    sideGlow.rotation.y = Math.PI / 2.8;
    scene.add(sideGlow);
    const rightGlow = sideGlow.clone();
    rightGlow.position.x = 16.5;
    rightGlow.rotation.y = -Math.PI / 2.8;
    scene.add(rightGlow);

    for (const z of [-1.2, 10.2]) {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(18.2, 0.55, 0.5),
        new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.86 })
      );
      rail.position.set(7.5, 0.08, z);
      scene.add(rail);
    }

    for (const x of [-1.2, 16.2]) {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.55, 11.4),
        new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.86 })
      );
      rail.position.set(x, 0.08, 4.5);
      scene.add(rail);
    }

    for (let i = 0; i < cols; i++) {
      for (const z of [-1.75, 10.75]) {
        const cliff = new THREE.Mesh(
          new THREE.BoxGeometry(0.94, 1.1 + (i % 3) * 0.22, 0.62),
          new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.96, metalness: 0.02 })
        );
        cliff.position.set(i + 0.5, -0.42, z);
        scene.add(cliff);
      }
    }

    for (let i = 0; i < rows; i++) {
      for (const x of [-1.75, 16.75]) {
        const cliff = new THREE.Mesh(
          new THREE.BoxGeometry(0.62, 0.98 + (i % 2) * 0.28, 0.94),
          new THREE.MeshStandardMaterial({ color: 0x273449, roughness: 0.95, metalness: 0.02 })
        );
        cliff.position.set(x, -0.4, rows - i - 0.5);
        scene.add(cliff);
      }
    }

    const frontLip = new THREE.Mesh(
      new THREE.BoxGeometry(18.8, 0.42, 0.9),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.94, metalness: 0.02 })
    );
    frontLip.position.set(7.5, -0.12, 10.95);
    scene.add(frontLip);

    const towerMeshes = new Map<string, THREE.Group>();
    const enemyMeshes = new Map<string, THREE.Group>();
    const projectileMeshes = new Map<string, THREE.Group>();
    const projectilePrev = new Map<string, THREE.Vector3>();
    const projectileTargets = new Map<string, string>();
    const tilePickMeshes: THREE.Mesh[] = [];
    const buildPads: THREE.Mesh[] = [];
    const towerSpawnFrames = new Map<string, number>();
    const towerFireFrames = new Map<string, number>();
    const towerAimAngles = new Map<string, number>();
    const enemySpawnFrames = new Map<string, number>();
    const enemyHitFrames = new Map<string, number>();
    const enemyBossIntroEffects = new Map<string, BossIntroEffect>();
    const effects: BurstEffect[] = [];
    const buildPulses: BuildPulseEffect[] = [];
    const muzzleFlashes: MuzzleFlashEffect[] = [];
    const deathWaves: DeathWaveEffect[] = [];
    const bossIntros: BossIntroEffect[] = [];
    let bossDangerLevel = 0;
    let placementGhost: THREE.Group | null = null;
    let placementGhostType: TowerType | null = null;
    let placementGhostCanPlace = true;
    let placementGlyph: THREE.Group | null = null;
    let placementGlyphType: TowerType | null = null;
    const placementRing = new THREE.Mesh(
      new THREE.RingGeometry(0.36, 0.47, 32),
      basicGlow(0x22c55e, 0.65)
    );
    placementRing.rotation.x = -Math.PI / 2;
    placementRing.visible = false;
    overlayGroup.add(placementRing);

    const placementPlate = new THREE.Mesh(
      new THREE.PlaneGeometry(0.9, 0.9),
      basicGlow(0x22c55e, 0.22)
    );
    placementPlate.rotation.x = -Math.PI / 2;
    placementPlate.position.y = 0.126;
    placementPlate.visible = false;
    overlayGroup.add(placementPlate);

    const rangeRing = new THREE.Mesh(
      new THREE.RingGeometry(0.8, 0.86, 64),
      basicGlow(0x22d3ee, 0.22)
    );
    rangeRing.rotation.x = -Math.PI / 2;
    rangeRing.position.y = 0.122;
    rangeRing.visible = false;
    overlayGroup.add(rangeRing);

    const selectedRangeRing = new THREE.Mesh(
      new THREE.RingGeometry(0.86, 0.92, 96),
      basicGlow(0xffffff, 0.18)
    );
    selectedRangeRing.rotation.x = -Math.PI / 2;
    selectedRangeRing.position.y = 0.12;
    selectedRangeRing.visible = false;
    overlayGroup.add(selectedRangeRing);

    const placementBeacon = new THREE.Group();
    placementBeacon.visible = false;
    overlayGroup.add(placementBeacon);

    const beaconDisc = new THREE.Mesh(
      new THREE.CircleGeometry(0.18, 24),
      basicGlow(0x22c55e, 0.3)
    );
    beaconDisc.rotation.x = -Math.PI / 2;
    placementBeacon.add(beaconDisc);

    const beaconChevron = new THREE.Mesh(
      new THREE.ConeGeometry(0.12, 0.26, 3),
      new THREE.MeshBasicMaterial({ color: 0x86efac, transparent: true, opacity: 0.82 })
    );
    beaconChevron.rotation.x = Math.PI;
    beaconChevron.position.y = 0.26;
    placementBeacon.add(beaconChevron);

    const invalidMarkV = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.32, 0.06),
      new THREE.MeshBasicMaterial({ color: 0xfca5a5, transparent: true, opacity: 0.9 })
    );
    invalidMarkV.rotation.z = Math.PI / 4;
    invalidMarkV.visible = false;
    placementBeacon.add(invalidMarkV);

    const invalidMarkH = invalidMarkV.clone();
    invalidMarkH.rotation.z = -Math.PI / 4;
    invalidMarkH.visible = false;
    placementBeacon.add(invalidMarkH);

    const placementArrows: THREE.Mesh[] = [];
    for (let i = 0; i < 4; i++) {
      const arrow = new THREE.Mesh(
        new THREE.ConeGeometry(0.06, 0.18, 3),
        new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.6 })
      );
      arrow.rotation.x = Math.PI / 2;
      arrow.rotation.z = (Math.PI / 2) * i;
      overlayGroup.add(arrow);
      placementArrows.push(arrow);
    }

    let frame = 0;
    let raf = 0;
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let hoveredKey: string | null = null;

    const pickTile = (clientX: number, clientY: number): { row: number; col: number } | null => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return null;

      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);

      const hit = raycaster.intersectObjects(tilePickMeshes, false)[0];
      if (!hit) return null;
      const row = hit.object.userData.row as number | undefined;
      const col = hit.object.userData.col as number | undefined;
      if (row === undefined || col === undefined) return null;
      return { row, col };
    };

    const handlePointerMove = (event: PointerEvent) => {
      const tile = pickTile(event.clientX, event.clientY);
      if (!tile) {
        if (hoveredKey !== null) {
          hoveredKey = null;
          onTileLeaveRef.current?.();
        }
        return;
      }

      const nextKey = `${tile.row}:${tile.col}`;
      if (nextKey === hoveredKey) return;
      hoveredKey = nextKey;
      onTileHoverRef.current?.(tile.row, tile.col);
    };

    const handlePointerLeave = () => {
      hoveredKey = null;
      onTileLeaveRef.current?.();
    };

    const handlePointerDown = (event: PointerEvent) => {
      const tile = pickTile(event.clientX, event.clientY);
      if (!tile) return;
      onTileSelectRef.current?.(tile.row, tile.col);
    };

    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('pointerleave', handlePointerLeave);
    renderer.domElement.addEventListener('pointerdown', handlePointerDown);

    const syncSelectedTowerRing = (towers: Tower[]) => {
      const selectedTower = towers.find((tower) => tower.id === selectedTowerIdRef.current);
      if (!selectedTower) {
        selectedRangeRing.visible = false;
        return;
      }

      const rows = getEngine()?.getMapData()?.grid.length ?? 10;
      const scale = Math.max(1.1, selectedTower.stats.range / 2.9);
      selectedRangeRing.position.set(selectedTower.position.col + 0.5, 0.12, rows - selectedTower.position.row - 0.5);
      selectedRangeRing.scale.set(scale, scale, scale);
      selectedRangeRing.visible = true;
    };

    const syncMap = (engine: GameEngine) => {
      const map = engine.getMapData();
      if (!map || mapGroup.children.length > 0) return;

      const rows = map.grid.length;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < map.grid[row].length; col++) {
          const cell = map.grid[row][col];
          const terrainHeight =
            0.08 +
            Math.max(0, Math.sin(col * 0.55) * 0.03 + Math.cos(row * 0.7) * 0.025) +
            (cell === 1 ? 0.01 : 0.03);
          const terrainBase = new THREE.Mesh(
            new THREE.BoxGeometry(0.98, terrainHeight, 0.98),
            new THREE.MeshStandardMaterial({
              color: cell === 1 ? 0x223548 : 0x12352f,
              roughness: 0.96,
              metalness: 0.02,
            })
          );
          terrainBase.position.set(col + 0.5, -terrainHeight * 0.5 + (cell === 1 ? 0.01 : 0), rows - row - 0.5);
          mapGroup.add(terrainBase);

          const tile = createMapTile(cell);
          tile.position.set(col + 0.5, terrainHeight + (cell === 1 ? 0.01 : 0), rows - row - 0.5);
          tile.userData.row = row;
          tile.userData.col = col;
          tilePickMeshes.push(tile);
          mapGroup.add(tile);

          if (cell === 1) {
            const paverInset = new THREE.Mesh(
              new THREE.BoxGeometry(0.74, 0.03, 0.74),
              new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.84, metalness: 0.06 })
            );
            paverInset.position.set(col + 0.5, terrainHeight + 0.08, rows - row - 0.5);
            mapGroup.add(paverInset);

            if ((row + col) % 3 === 0) {
              const seam = new THREE.Mesh(
                new THREE.BoxGeometry(0.58, 0.012, 0.06),
                new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.8, metalness: 0.04 })
              );
              seam.position.set(col + 0.5, terrainHeight + 0.102, rows - row - 0.5);
              seam.rotation.y = (row + col) % 2 === 0 ? 0 : Math.PI / 2;
              mapGroup.add(seam);
            }
          }

          if (cell !== 1) {
            const buildPlate = new THREE.Mesh(
              new THREE.BoxGeometry(0.72, 0.028, 0.72),
              new THREE.MeshStandardMaterial({ color: 0x355f53, roughness: 0.9, metalness: 0.03 })
            );
            buildPlate.position.set(col + 0.5, terrainHeight + 0.045, rows - row - 0.5);
            buildPlate.rotation.y = ((row + col) % 2) * (Math.PI / 4);
            mapGroup.add(buildPlate);

            const buildAccent = new THREE.Mesh(
              new THREE.PlaneGeometry(0.52, 0.52),
              basicGlow(0x7dd3c7, 0.12)
            );
            buildAccent.rotation.x = -Math.PI / 2;
            buildAccent.rotation.z = Math.PI / 4;
            buildAccent.position.set(col + 0.5, terrainHeight + 0.068, rows - row - 0.5);
            mapGroup.add(buildAccent);
            buildPads.push(buildAccent);

            if ((row + col) % 2 === 0) {
              const tuft = new THREE.Mesh(
                new THREE.ConeGeometry(0.06, 0.18, 5),
                new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.96, metalness: 0.01 })
              );
              tuft.position.set(col + 0.2, terrainHeight + 0.12, rows - row - 0.18);
              mapGroup.add(tuft);
              const tuft2 = tuft.clone();
              tuft2.position.set(col + 0.78, terrainHeight + 0.1, rows - row - 0.72);
              tuft2.scale.set(0.8, 0.85, 0.8);
              mapGroup.add(tuft2);
            } else {
              const stone = new THREE.Mesh(
                new THREE.DodecahedronGeometry(0.05, 0),
                new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.92, metalness: 0.02 })
              );
              stone.position.set(col + 0.25, terrainHeight + 0.08, rows - row - 0.24);
              mapGroup.add(stone);
              const stone2 = stone.clone();
              stone2.position.set(col + 0.75, terrainHeight + 0.075, rows - row - 0.66);
              stone2.scale.setScalar(0.72);
              mapGroup.add(stone2);
            }
          }
        }
      }
    };

    const syncPlacement = () => {
      const activePlacement = placementInfoRef.current;
      if (!activePlacement) {
        placementRing.visible = false;
        placementPlate.visible = false;
        rangeRing.visible = false;
        placementBeacon.visible = false;
        for (const arrow of placementArrows) arrow.visible = false;
        if (placementGlyph) {
          placementBeacon.remove(placementGlyph);
          placementGlyph = null;
          placementGlyphType = null;
        }
        if (placementGhost) {
          overlayGroup.remove(placementGhost);
          placementGhost = null;
          placementGhostType = null;
          placementGhostCanPlace = true;
        }
        return;
      }

      const rows = getEngine()?.getMapData()?.grid.length ?? 10;
      const x = activePlacement.col + 0.5;
      const z = rows - activePlacement.row - 0.5;
      const color = activePlacement.canPlace ? 0x22c55e : 0xef4444;
      const rangeScale = Math.max(1.1, activePlacement.range / 2.9);

      (placementRing.material as THREE.MeshBasicMaterial).color.setHex(color);
      (placementPlate.material as THREE.MeshBasicMaterial).color.setHex(color);
      (rangeRing.material as THREE.MeshBasicMaterial).color.setHex(activePlacement.canPlace ? 0x22d3ee : 0xfca5a5);
      placementRing.scale.setScalar(1);
      placementRing.position.set(x, 0.128, z);
      placementPlate.position.set(x, 0.126, z);
      rangeRing.scale.set(rangeScale, rangeScale, rangeScale);
      rangeRing.position.set(x, 0.122, z);
      placementRing.visible = true;
      placementPlate.visible = true;
      rangeRing.visible = true;
      placementBeacon.visible = true;

      placementBeacon.position.set(x, 0.18, z);
      (beaconDisc.material as THREE.MeshBasicMaterial).color.setHex(color);
      (beaconDisc.material as THREE.MeshBasicMaterial).opacity = activePlacement.canPlace ? 0.26 : 0.2;
      (beaconChevron.material as THREE.MeshBasicMaterial).color.setHex(activePlacement.canPlace ? 0x86efac : 0xfca5a5);
      beaconChevron.visible = activePlacement.canPlace;
      invalidMarkV.visible = !activePlacement.canPlace;
      invalidMarkH.visible = !activePlacement.canPlace;

      if (!placementGlyph || placementGlyphType !== activePlacement.towerType) {
        if (placementGlyph) {
          placementBeacon.remove(placementGlyph);
        }
        placementGlyph = createPlacementGlyph(activePlacement.towerType, TOWER_COLORS[activePlacement.towerType] ?? 0xffffff);
        placementGlyphType = activePlacement.towerType;
        placementGlyph.position.set(0, 0.14, 0);
        placementBeacon.add(placementGlyph);
      }

      if (placementGlyph) {
        placementGlyph.rotation.y += activePlacement.canPlace ? 0.02 : 0.01;
        placementGlyph.position.y = 0.14 + Math.sin(frame * 0.11) * 0.025;
        placementGlyph.scale.setScalar(activePlacement.canPlace ? 1 : 0.92);
        placementGlyph.traverse((child) => {
          const mesh = child as THREE.Mesh;
          if (!('material' in mesh)) return;
          const material = mesh.material;
          if (Array.isArray(material)) return;
          if (material instanceof THREE.MeshBasicMaterial) {
            material.color.setHex(activePlacement.canPlace ? TOWER_COLORS[activePlacement.towerType] ?? 0xffffff : 0xfca5a5);
            material.opacity = activePlacement.canPlace ? 0.86 : 0.58;
          }
        });
      }

      const arrowDistance = Math.max(0.74, Math.min(activePlacement.range * 0.52, 1.45));
      const arrowColor = TOWER_COLORS[activePlacement.towerType] ?? 0x22d3ee;
      for (let i = 0; i < placementArrows.length; i++) {
        const arrow = placementArrows[i];
        const angle = (Math.PI / 2) * i;
        arrow.visible = true;
        arrow.position.set(
          x + Math.cos(angle) * arrowDistance,
          0.135,
          z + Math.sin(angle) * arrowDistance
        );
        arrow.rotation.z = -angle + Math.PI / 2;
        (arrow.material as THREE.MeshBasicMaterial).color.setHex(activePlacement.canPlace ? arrowColor : 0xf87171);
        (arrow.material as THREE.MeshBasicMaterial).opacity = activePlacement.canPlace ? 0.58 : 0.42;
      }

      if (
        !placementGhost ||
        placementGhostType !== activePlacement.towerType ||
        placementGhostCanPlace !== activePlacement.canPlace
      ) {
        if (placementGhost) {
          overlayGroup.remove(placementGhost);
        }
        placementGhost = createTowerMesh(activePlacement.towerType, false);
        placementGhostType = activePlacement.towerType;
        placementGhostCanPlace = activePlacement.canPlace;
        applyGhostMaterial(placementGhost, color, activePlacement.canPlace);
        overlayGroup.add(placementGhost);
      }

      if (placementGhost) {
        const hoverBob = Math.sin(frame * 0.08) * 0.03;
        placementGhost.position.set(x, 0.04 + hoverBob, z);
        placementGhost.scale.setScalar(activePlacement.canPlace ? 0.84 : 0.78);
        placementGhost.rotation.y += activePlacement.canPlace ? 0.014 : 0.008;
      }
    };

    const syncTowers = (towers: Tower[]) => {
      const seen = new Set<string>();
      const rows = getEngine()?.getMapData()?.grid.length ?? 10;

      for (const tower of towers) {
        seen.add(tower.id);
        const selected = tower.id === selectedTowerIdRef.current;
        let mesh = towerMeshes.get(tower.id);
        if (!mesh) {
          mesh = createTowerMesh(tower.type, selected);
          towerMeshes.set(tower.id, mesh);
          towerSpawnFrames.set(tower.id, frame);
          towerGroup.add(mesh);
          spawnBuildPulse(
            tower.position.col + 0.5,
            rows - tower.position.row - 0.5,
            overlayGroup,
            buildPulses,
            TOWER_COLORS[tower.type] ?? 0xffffff,
            tower.type
          );
        }

        const bornAt = towerSpawnFrames.get(tower.id) ?? frame;
        const appear = Math.min(1, (frame - bornAt) / 18);
        const entrancePop = 1 + Math.max(0, 1 - appear) * 0.38;
        const fireAt = towerFireFrames.get(tower.id) ?? -999;
        const fireProgress = Math.max(0, 1 - (frame - fireAt) / 10);
        const recoilLift = fireProgress * 0.08;
        const recoilScale = 1 + fireProgress * 0.14;
        const aimAngle = towerAimAngles.get(tower.id);
        const recoilX = aimAngle !== undefined ? Math.sin(aimAngle) * fireProgress * 0.08 : 0;
        const recoilZ = aimAngle !== undefined ? Math.cos(aimAngle) * fireProgress * 0.08 : 0;
        mesh.position.set(tower.position.col + 0.5, (1 - appear) * 0.5, rows - tower.position.row - 0.5);
        mesh.rotation.x = 0;
        mesh.rotation.z = 0;
        if (aimAngle !== undefined && fireProgress > 0) {
          mesh.rotation.y = mesh.rotation.y * 0.72 + aimAngle * 0.28;
        } else {
          mesh.rotation.y += 0.01 + tower.grade * 0.002;
        }
        if (['ARCHER', 'SNIPER'].includes(tower.type)) {
          mesh.position.x -= recoilX * 1.15;
          mesh.position.z -= recoilZ * 1.15;
          mesh.rotation.z = -fireProgress * 0.08;
        } else if (['CANNON', 'METEOR', 'FLAME', 'PHOENIX'].includes(tower.type)) {
          mesh.position.x -= recoilX * 0.7;
          mesh.position.z -= recoilZ * 0.7;
          mesh.rotation.x = fireProgress * 0.09;
        } else if (['MAGIC', 'WORD', 'CHRONO', 'VOID', 'HEALER', 'DIVINE'].includes(tower.type)) {
          mesh.rotation.z = Math.sin(frame * 0.2) * fireProgress * 0.1;
          mesh.position.y += fireProgress * 0.05;
        }
        mesh.position.y += recoilLift;
        mesh.scale.setScalar((0.72 + appear * 0.28) * (1 + tower.grade * 0.06) * entrancePop * recoilScale);
        applyTowerIdleMotion(mesh, tower, frame);

        const hasRing = mesh.children.some((child) => child.userData.selectionRing);
        if (selected && !hasRing) addSelectionRing(mesh, TOWER_COLORS[tower.type] ?? 0xffffff);
        if (!selected && hasRing) {
          const rings = mesh.children.filter((child) => child.userData.selectionRing);
          for (const ring of rings) mesh.remove(ring);
        }
      }

      for (const [id, mesh] of towerMeshes) {
        if (seen.has(id)) continue;
        towerGroup.remove(mesh);
        towerMeshes.delete(id);
        towerSpawnFrames.delete(id);
      }
    };

    const syncEnemies = (enemies: Enemy[]) => {
      const seen = new Set<string>();
      const rows = getEngine()?.getMapData()?.grid.length ?? 10;
      bossDangerLevel = 0;

      for (const enemy of enemies) {
        seen.add(enemy.id);
        let mesh = enemyMeshes.get(enemy.id);
        if (!mesh) {
          mesh = createEnemyMesh(enemy);
          enemyMeshes.set(enemy.id, mesh);
          enemySpawnFrames.set(enemy.id, frame);
          enemyGroup.add(mesh);
          if (BOSS_TYPES.has(enemy.type)) {
            spawnBossIntro(0, 0, overlayGroup, bossIntros, ENEMY_COLORS[enemy.type] ?? 0xef4444);
            const intro = bossIntros[bossIntros.length - 1];
            if (intro) enemyBossIntroEffects.set(enemy.id, intro);
          }
        }

        const bornAt = enemySpawnFrames.get(enemy.id) ?? frame;
        const appear = Math.min(1, (frame - bornAt) / 12);
        const pos = worldPositionFromCanvas(enemy.position.x, enemy.position.y, cellSize, rows);
        mesh.position.x = pos.x;
        mesh.position.z = pos.z;
        if (BOSS_TYPES.has(enemy.type)) {
          const intro = enemyBossIntroEffects.get(enemy.id);
          if (intro && intro.life > 0) {
            intro.ring.position.set(pos.x, 0.16, pos.z);
            intro.glow.position.set(pos.x, 0.15, pos.z);
            for (const spike of intro.spikes) spike.position.set(pos.x, 0.161, pos.z);
          }
        }
        updateEnemyMesh(mesh, enemy, frame * 0.016);
        mesh.scale.setScalar((BOSS_TYPES.has(enemy.type) ? 1.55 : 1) * (0.78 + appear * 0.22));
        mesh.userData.type = enemy.type;
        const hitAt = enemyHitFrames.get(enemy.id) ?? -999;
        const hitProgress = Math.max(0, 1 - (frame - hitAt) / 9);
        if (hitProgress > 0) {
          applyEnemyHitFlash(mesh, hitProgress);
          mesh.scale.multiplyScalar(1 + hitProgress * 0.08);
        }

        if (BOSS_TYPES.has(enemy.type)) {
          const enemyColor = ENEMY_COLORS[enemy.type] ?? 0xef4444;
          let aura = mesh.children.find((child) => child.userData.bossAura) as THREE.Mesh | undefined;
          if (!aura) {
            aura = new THREE.Mesh(new THREE.RingGeometry(0.56, 0.76, 48), basicGlow(enemyColor, 0.2));
            aura.userData.bossAura = true;
            aura.rotation.x = -Math.PI / 2;
            aura.position.y = 0.04;
            mesh.add(aura);
          }

          const pulse = 1 + Math.sin(frame * 0.09) * 0.12;
          aura.scale.setScalar(pulse);
          aura.rotation.z -= 0.025;
          (aura.material as THREE.MeshBasicMaterial).opacity = enemy.bossAbilityCooldown && enemy.bossAbilityCooldown < 3 ? 0.42 : 0.22;
          (aura.material as THREE.MeshBasicMaterial).color.setHex(enemy.bossAbilityCooldown && enemy.bossAbilityCooldown < 3 ? 0xef4444 : enemyColor);

          let telegraph = mesh.children.find((child) => child.userData.bossTelegraph) as THREE.Group | undefined;
          if (!telegraph) {
            telegraph = buildBossTelegraph(enemy.type);
            mesh.add(telegraph);
          }

          const danger = enemy.bossAbilityCooldown && enemy.bossAbilityCooldown < 3 ? 1 : 0;
          bossDangerLevel = Math.max(
            bossDangerLevel,
            enemy.bossAbilityCooldown ? Math.max(0, (3 - enemy.bossAbilityCooldown) / 3) : 0
          );
          telegraph.visible = danger > 0;
          if (danger) {
            const telegraphPulse = 1 + Math.sin(frame * 0.18) * 0.18;
            telegraph.scale.setScalar(telegraphPulse);
            telegraph.rotation.y -= 0.04;
            for (const child of telegraph.children) {
              const mat = (child as THREE.Mesh).material;
              if (Array.isArray(mat) || !(mat instanceof THREE.MeshBasicMaterial)) continue;
              mat.opacity = child.userData.outerRing ? 0.42 : 0.26;
            }
          }
        }
      }

      for (const [id, mesh] of enemyMeshes) {
        if (seen.has(id)) continue;
        const mat = (mesh.children[0] as THREE.Mesh | undefined)?.material;
        const color = mat instanceof THREE.MeshStandardMaterial ? mat.color.getHex() : 0xef4444;
        const enemyType = mesh.userData.type as Enemy['type'];
        const isBoss = BOSS_TYPES.has(enemyType);
        spawnBurst(mesh, burstGroup, effects, color, isBoss ? 16 : 8, 1.8);
        spawnDeathWave(mesh.position.x, mesh.position.z, overlayGroup, deathWaves, color, enemyType, isBoss);
        enemyGroup.remove(mesh);
        enemyMeshes.delete(id);
        enemySpawnFrames.delete(id);
        enemyHitFrames.delete(id);
        enemyBossIntroEffects.delete(id);
      }
    };

    const syncProjectiles = (engine: GameEngine) => {
      const seen = new Set<string>();
      const rows = engine.getMapData()?.grid.length ?? 10;
      for (const projectile of engine.getProjectiles()) {
        seen.add(projectile.id);
        let mesh = projectileMeshes.get(projectile.id);
        if (!mesh) {
          mesh = createProjectileMesh(TOWER_COLORS[projectile.towerType] ?? 0xffffff);
          projectileMeshes.set(projectile.id, mesh);
          projectileGroup.add(mesh);
          towerFireFrames.set(projectile.sourceId, frame);
          const sourceTower = towerMeshes.get(projectile.sourceId);
          if (sourceTower) {
            const targetEnemy = enemyMeshes.get(projectile.targetId);
            if (targetEnemy) {
              const aim = Math.atan2(targetEnemy.position.x - sourceTower.position.x, targetEnemy.position.z - sourceTower.position.z);
              towerAimAngles.set(projectile.sourceId, aim);
            }
            spawnMuzzleFlash(
              sourceTower.position.x,
              sourceTower.position.z,
              overlayGroup,
              muzzleFlashes,
              TOWER_COLORS[projectile.towerType] ?? 0xffffff,
              projectile.towerType
            );
          }
        }
        projectileTargets.set(projectile.id, projectile.targetId);

        const pos = worldPositionFromCanvas(projectile.position.x, projectile.position.y, cellSize, rows);
        const prev = projectilePrev.get(projectile.id) ?? pos.clone();
        const dir = pos.clone().sub(prev);
        if (dir.lengthSq() > 0.0001) {
          mesh.rotation.y = Math.atan2(dir.x, dir.z);
        }
        mesh.position.set(pos.x, 0.34, pos.z);
        mesh.scale.setScalar(projectile.isCrit ? 1.28 : 1);
        projectilePrev.set(projectile.id, pos.clone());
      }

      for (const [id, mesh] of projectileMeshes) {
        if (seen.has(id)) continue;
        const mat = (mesh.children[0] as THREE.Mesh | undefined)?.material;
        const color = mat instanceof THREE.MeshStandardMaterial ? mat.color.getHex() : 0xffffff;
        const targetId = projectileTargets.get(id);
        if (targetId) enemyHitFrames.set(targetId, frame);
        spawnBurst(mesh, burstGroup, effects, color, 4, 0.8);
        projectileGroup.remove(mesh);
        projectileMeshes.delete(id);
        projectilePrev.delete(id);
        projectileTargets.delete(id);
      }
    };

    const updateEffects = () => {
      for (let i = effects.length - 1; i >= 0; i--) {
        const effect = effects[i];
        effect.life -= 0.016;
        effect.mesh.position.add(effect.velocity);
        effect.mesh.rotation.y += effect.spin;
        effect.mesh.scale.setScalar(0.9 + (1 - effect.life / effect.maxLife) * 0.6);

        for (const child of effect.mesh.children) {
          const mesh = child as THREE.Mesh;
          if (mesh.material instanceof THREE.MeshStandardMaterial) {
            mesh.material.opacity = Math.max(0, effect.life / effect.maxLife);
            mesh.material.transparent = true;
          }
        }

        if (effect.life <= 0) {
          burstGroup.remove(effect.mesh);
          effects.splice(i, 1);
        }
      }

      for (let i = buildPulses.length - 1; i >= 0; i--) {
        const pulse = buildPulses[i];
        pulse.life -= 0.016;
        const progress = 1 - pulse.life / pulse.maxLife;
        const scale = 1 + progress * 2.4;
        pulse.ring.scale.setScalar(scale);
        pulse.glow.scale.setScalar(0.8 + progress * 1.4);
        (pulse.ring.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.7 - progress * 0.7);
        (pulse.glow.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.18 - progress * 0.18);
        for (let j = 0; j < pulse.sigils.length; j++) {
          const sigil = pulse.sigils[j];
          const material = sigil.material as THREE.MeshBasicMaterial;
          const spread = 0.22 + progress * 0.34;
          const angle = (Math.PI * 2 * j) / Math.max(1, pulse.sigils.length) + progress * 0.6;
          const isCentered = pulse.sigils.length <= 3;

          if (!isCentered) {
            sigil.position.x = pulse.ring.position.x + Math.cos(angle) * spread;
            sigil.position.z = pulse.ring.position.z + Math.sin(angle) * spread;
          }

          sigil.scale.setScalar(0.9 + progress * 0.9);
          sigil.rotation.z += 0.03;
          material.opacity = Math.max(0, 0.7 - progress * 0.7);
        }

        if (pulse.life <= 0) {
          overlayGroup.remove(pulse.ring);
          overlayGroup.remove(pulse.glow);
          for (const sigil of pulse.sigils) overlayGroup.remove(sigil);
          buildPulses.splice(i, 1);
        }
      }

      for (let i = muzzleFlashes.length - 1; i >= 0; i--) {
        const flash = muzzleFlashes[i];
        flash.life -= 0.016;
        const progress = 1 - flash.life / flash.maxLife;
        flash.burst.scale.setScalar(0.9 + progress * 1.6);
        flash.ring.scale.setScalar(1 + progress * 1.8);
        flash.burst.rotation.z += 0.08;
        (flash.burst.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.82 - progress * 0.82);
        (flash.ring.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.58 - progress * 0.58);
        for (const spark of flash.sparks) {
          const material = spark.material as THREE.MeshBasicMaterial;
          spark.scale.setScalar(1 + progress * 1.1);
          spark.rotation.z += 0.06;
          material.opacity = Math.max(0, material.opacity - 0.08);
        }

        if (flash.life <= 0) {
          overlayGroup.remove(flash.burst);
          overlayGroup.remove(flash.ring);
          for (const spark of flash.sparks) overlayGroup.remove(spark);
          muzzleFlashes.splice(i, 1);
        }
      }

      for (let i = deathWaves.length - 1; i >= 0; i--) {
        const wave = deathWaves[i];
        wave.life -= 0.016;
        const progress = 1 - wave.life / wave.maxLife;
        wave.ring.scale.setScalar(1 + progress * 2.2);
        wave.glow.scale.setScalar(0.8 + progress * 1.7);
        (wave.ring.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.72 - progress * 0.72);
        (wave.glow.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.2 - progress * 0.2);

        for (let j = 0; j < wave.shards.length; j++) {
          const shard = wave.shards[j];
          const material = shard.material as THREE.MeshBasicMaterial;
          const angle = (Math.PI * 2 * j) / wave.shards.length;
          const spread = 0.18 + progress * 0.42;
          shard.position.x = wave.ring.position.x + Math.cos(angle) * spread;
          shard.position.z = wave.ring.position.z + Math.sin(angle) * spread;
          shard.scale.setScalar(1 + progress * 0.9);
          shard.rotation.z += 0.04;
          material.opacity = Math.max(0, 0.5 - progress * 0.5);
        }

        if (wave.life <= 0) {
          overlayGroup.remove(wave.ring);
          overlayGroup.remove(wave.glow);
          for (const shard of wave.shards) overlayGroup.remove(shard);
          deathWaves.splice(i, 1);
        }
      }

      for (let i = bossIntros.length - 1; i >= 0; i--) {
        const intro = bossIntros[i];
        intro.life -= 0.016;
        const progress = 1 - intro.life / intro.maxLife;
        intro.ring.scale.setScalar(1 + progress * 2.8);
        intro.glow.scale.setScalar(0.8 + progress * 2.1);
        intro.ring.rotation.z -= 0.06;
        (intro.ring.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.82 - progress * 0.82);
        (intro.glow.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.22 - progress * 0.22);

        for (let j = 0; j < intro.spikes.length; j++) {
          const spike = intro.spikes[j];
          const material = spike.material as THREE.MeshBasicMaterial;
          const angle = (Math.PI * 2 * j) / intro.spikes.length;
          const spread = 0.14 + progress * 0.48;
          spike.position.x = intro.ring.position.x + Math.cos(angle) * spread;
          spike.position.z = intro.ring.position.z + Math.sin(angle) * spread;
          spike.scale.setScalar(1 + progress * 1.1);
          spike.rotation.z += 0.08;
          material.opacity = Math.max(0, 0.5 - progress * 0.5);
        }

        if (intro.life <= 0) {
          overlayGroup.remove(intro.ring);
          overlayGroup.remove(intro.glow);
          for (const spike of intro.spikes) overlayGroup.remove(spike);
          bossIntros.splice(i, 1);
        }
      }
    };

    const animate = () => {
      frame += 1;
      const engine = getEngine();
      if (engine) {
        syncMap(engine);
        const towers = engine.getTowers();
        syncTowers(towers);
        syncSelectedTowerRing(towers);
        syncEnemies(engine.getEnemies());
        syncProjectiles(engine);
        syncPlacement();
        updateEffects();
        ambientLight.intensity = 1.32 - bossDangerLevel * 0.24;
        keyLight.intensity = 1.65 + bossDangerLevel * 0.55;
        fillLight.intensity = 15 - bossDangerLevel * 4.5;
        rimLight.intensity = 17 + bossDangerLevel * 5.5;
        warningLight.intensity = bossDangerLevel * 22;
        if (scene.fog) scene.fog.color.setHex(bossDangerLevel > 0.1 ? 0x1b0a12 : 0x071525);
        (sideGlow.material as THREE.MeshBasicMaterial).color.setHex(bossDangerLevel > 0.1 ? 0xef4444 : 0x0f766e);
        (rightGlow.material as THREE.MeshBasicMaterial).color.setHex(bossDangerLevel > 0.1 ? 0xef4444 : 0x0f766e);
        (sideGlow.material as THREE.MeshBasicMaterial).opacity = 0.2 + bossDangerLevel * 0.12;
        (rightGlow.material as THREE.MeshBasicMaterial).opacity = 0.2 + bossDangerLevel * 0.12;
        for (const pad of buildPads) {
          const pulse = 0.16 + (Math.sin(frame * 0.05 + pad.position.x * 0.9) + 1) * 0.05;
          (pad.material as THREE.MeshBasicMaterial).opacity = pulse;
        }
        placementRing.rotation.z += 0.01;
        rangeRing.rotation.z -= 0.004;
        selectedRangeRing.rotation.z += 0.003;
        if (placementBeacon.visible) {
          placementBeacon.position.y = 0.18 + Math.sin(frame * 0.08) * 0.03;
          beaconChevron.rotation.y += 0.04;
          invalidMarkV.rotation.y += 0.02;
          invalidMarkH.rotation.y -= 0.02;
          for (let i = 0; i < placementArrows.length; i++) {
            const arrow = placementArrows[i];
            if (!arrow.visible) continue;
            arrow.position.y = 0.135 + Math.sin(frame * 0.1 + i * 0.8) * 0.02;
          }
        }
      }

      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };

    raf = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(raf);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerleave', handlePointerLeave);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.setAnimationLoop(null);
      renderer.dispose();
      renderer.forceContextLoss();
      host.innerHTML = '';
    };
  }, [cellSize, getEngine, height, width]);

  return <div ref={hostRef} className="absolute inset-0 rounded overflow-hidden" />;
}
