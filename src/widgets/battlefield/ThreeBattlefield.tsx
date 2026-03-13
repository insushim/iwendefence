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
  color: number
): void {
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.36, 40), basicGlow(color, 0.8));
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(x, 0.13, z);

  const glow = new THREE.Mesh(new THREE.CircleGeometry(0.24, 32), basicGlow(color, 0.22));
  glow.rotation.x = -Math.PI / 2;
  glow.position.set(x, 0.125, z);

  parent.add(ring);
  parent.add(glow);
  pulses.push({ ring, glow, life: 0.42, maxLife: 0.42 });
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
  const mat = standardMaterial(color, elite ? 0xfacc15 : color, elite ? 0.28 : 0.08);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.44, 0.24), mat);
  body.position.y = 0.38;
  group.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 14), mat);
  head.position.y = 0.74;
  group.add(head);

  const shoulders = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.08, 0.22), standardMaterial(0x1f2937));
  shoulders.position.y = 0.55;
  group.add(shoulders);
  return group;
}

function createArmoredEnemy(color: number, elite: boolean): THREE.Group {
  const group = createHumanoidEnemy(color, elite);
  const armor = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.3, 0.3), standardMaterial(0xe2e8f0));
  armor.position.y = 0.42;
  group.add(armor);

  const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.08, 16), standardMaterial(0x64748b));
  shield.rotation.z = Math.PI / 2;
  shield.position.set(0.24, 0.46, 0);
  group.add(shield);
  return group;
}

function createBeastEnemy(color: number, elite: boolean): THREE.Group {
  const group = new THREE.Group();
  const mat = standardMaterial(color, elite ? 0xfacc15 : color, elite ? 0.22 : 0.06);

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.42, 6, 10), mat);
  torso.rotation.z = Math.PI / 2;
  torso.position.set(0, 0.34, 0);
  group.add(torso);

  const head = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.28, 5), mat);
  head.rotation.z = -Math.PI / 2;
  head.position.set(0.34, 0.38, 0);
  group.add(head);

  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.26, 5), standardMaterial(0x78350f));
  tail.rotation.z = Math.PI / 2;
  tail.position.set(-0.34, 0.34, 0);
  group.add(tail);
  return group;
}

function createSlimeEnemy(color: number, elite: boolean): THREE.Group {
  const group = new THREE.Group();
  const mat = standardMaterial(color, elite ? 0xfacc15 : color, elite ? 0.22 : 0.05);
  const blob = new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 18), mat);
  blob.position.y = 0.22;
  blob.scale.set(1.2, 0.85, 1.15);
  group.add(blob);

  const topBlob = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 14), mat);
  topBlob.position.set(0.02, 0.48, 0);
  group.add(topBlob);

  const eyes = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), standardMaterial(0xffffff));
  eyes.position.set(-0.07, 0.26, 0.18);
  group.add(eyes);
  const eyes2 = eyes.clone();
  eyes2.position.x = 0.07;
  group.add(eyes2);
  return group;
}

function createFlyingEnemy(color: number, elite: boolean): THREE.Group {
  const group = new THREE.Group();
  const mat = standardMaterial(color, elite ? 0xfacc15 : color, elite ? 0.3 : 0.08);
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 14), mat);
  body.position.y = 0.46;
  group.add(body);

  const wingGeo = new THREE.BoxGeometry(0.32, 0.04, 0.16);
  const leftWing = new THREE.Mesh(wingGeo, standardMaterial(0x1f2937));
  leftWing.position.set(-0.24, 0.48, 0);
  leftWing.rotation.z = 0.35;
  group.add(leftWing);
  const rightWing = leftWing.clone();
  rightWing.position.x = 0.24;
  rightWing.rotation.z = -0.35;
  group.add(rightWing);
  return group;
}

function createCasterEnemy(color: number, elite: boolean): THREE.Group {
  const group = createHumanoidEnemy(color, elite);
  const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.56, 8), standardMaterial(0xf8fafc));
  staff.position.set(0.18, 0.54, 0);
  staff.rotation.z = 0.2;
  group.add(staff);

  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 12), standardMaterial(0xffffff, color, 0.9));
  orb.position.set(0.24, 0.84, 0);
  group.add(orb);
  return group;
}

function createBossEnemy(color: number, elite: boolean, type: Enemy['type']): THREE.Group {
  const group = new THREE.Group();
  const mat = standardMaterial(color, 0xffaa00, elite ? 0.4 : 0.18);

  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.34, 0), mat);
  core.position.y = 0.66;
  core.scale.set(1.2, 1.5, 1.1);
  group.add(core);

  if (type === 'HYDRA') {
    for (const x of [-0.22, 0, 0.22]) {
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.52, 8), standardMaterial(0x14532d, color, 0.45));
      neck.position.set(x, 0.86, 0);
      neck.rotation.z = x * 0.8;
      group.add(neck);

      const head = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.25, 6), standardMaterial(0x22c55e, color, 0.55));
      head.position.set(x * 1.1, 1.18, 0);
      head.rotation.z = Math.PI / 2;
      group.add(head);
    }
  } else {
    const hornLeft = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.32, 6), standardMaterial(0xfef3c7));
    hornLeft.position.set(-0.18, 1.08, 0);
    hornLeft.rotation.z = 0.45;
    group.add(hornLeft);
    const hornRight = hornLeft.clone();
    hornRight.position.x = 0.18;
    hornRight.rotation.z = -0.45;
    group.add(hornRight);
  }

  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.24, 0.28), standardMaterial(0x111827));
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

  if (enemy.isElite) addSelectionRing(group, 0xfacc15);

  if (enemy.shield) {
    const shield = new THREE.Mesh(
      new THREE.TorusGeometry(0.42, 0.03, 8, 32),
      new THREE.MeshStandardMaterial({ color: 0x7dd3fc, emissive: 0x38bdf8, emissiveIntensity: 0.9 })
    );
    shield.rotation.x = Math.PI / 2;
    shield.position.y = 0.42;
    group.add(shield);
  }

  return group;
}

function updateEnemyMesh(group: THREE.Group, enemy: Enemy, time: number): void {
  const bob = enemy.isRaging ? 0.08 : FLYING_TYPES.has(enemy.type) ? 0.18 : 0.05;
  group.position.y = Math.sin(time * (enemy.isRaging ? 8 : 4)) * bob;
  group.rotation.y += enemy.isRaging ? 0.07 : 0.03;
  if (FLYING_TYPES.has(enemy.type) || enemy.type === 'DRAGON') {
    const leftWing = group.children[1] as THREE.Mesh | undefined;
    const rightWing = group.children[2] as THREE.Mesh | undefined;
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
    color: isPath ? 0x64748b : isBuild ? 0x163f37 : 0x0f2d23,
    roughness: isPath ? 0.62 : 0.92,
    metalness: isPath ? 0.12 : 0.02,
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

    scene.add(new THREE.AmbientLight(0xa5f3fc, 1.32));

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.65);
    keyLight.position.set(4, 10, 7);
    scene.add(keyLight);

    const fillLight = new THREE.PointLight(0x2dd4bf, 15, 26, 2);
    fillLight.position.set(12, 5, 2);
    scene.add(fillLight);

    const rimLight = new THREE.PointLight(0x7c3aed, 17, 32, 2);
    rimLight.position.set(-4, 8, 8);
    scene.add(rimLight);

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

    const towerMeshes = new Map<string, THREE.Group>();
    const enemyMeshes = new Map<string, THREE.Group>();
    const projectileMeshes = new Map<string, THREE.Group>();
    const projectilePrev = new Map<string, THREE.Vector3>();
    const tilePickMeshes: THREE.Mesh[] = [];
    const buildPads: THREE.Mesh[] = [];
    const towerSpawnFrames = new Map<string, number>();
    const enemySpawnFrames = new Map<string, number>();
    const effects: BurstEffect[] = [];
    const buildPulses: BuildPulseEffect[] = [];
    let placementGhost: THREE.Group | null = null;
    let placementGhostType: TowerType | null = null;
    let placementGhostCanPlace = true;
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
          const tile = createMapTile(cell);
          tile.position.set(col + 0.5, cell === 1 ? 0.06 : 0.04, rows - row - 0.5);
          tile.userData.row = row;
          tile.userData.col = col;
          tilePickMeshes.push(tile);
          mapGroup.add(tile);

          if (cell === 1) {
            const stripe = new THREE.Mesh(
              new THREE.PlaneGeometry(0.78, 0.78),
              basicGlow(0xe2e8f0, 0.14)
            );
            stripe.rotation.x = -Math.PI / 2;
            stripe.position.set(col + 0.5, 0.125, rows - row - 0.5);
            mapGroup.add(stripe);
          }

          if (cell !== 1) {
            const padBase = new THREE.Mesh(
              new THREE.CylinderGeometry(0.33, 0.36, 0.04, 20),
              new THREE.MeshStandardMaterial({ color: 0x065f46, roughness: 0.78, metalness: 0.06 })
            );
            padBase.position.set(col + 0.5, 0.1, rows - row - 0.5);
            mapGroup.add(padBase);

            const padRing = new THREE.Mesh(new THREE.RingGeometry(0.24, 0.33, 30), basicGlow(0x34d399, 0.22));
            padRing.rotation.x = -Math.PI / 2;
            padRing.position.set(col + 0.5, 0.125, rows - row - 0.5);
            mapGroup.add(padRing);
            buildPads.push(padRing);
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
            TOWER_COLORS[tower.type] ?? 0xffffff
          );
        }

        const bornAt = towerSpawnFrames.get(tower.id) ?? frame;
        const appear = Math.min(1, (frame - bornAt) / 18);
        mesh.position.set(tower.position.col + 0.5, (1 - appear) * 0.5, rows - tower.position.row - 0.5);
        mesh.rotation.y += 0.01 + tower.grade * 0.002;
        mesh.scale.setScalar((0.72 + appear * 0.28) * (1 + tower.grade * 0.06));
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

      for (const enemy of enemies) {
        seen.add(enemy.id);
        let mesh = enemyMeshes.get(enemy.id);
        if (!mesh) {
          mesh = createEnemyMesh(enemy);
          enemyMeshes.set(enemy.id, mesh);
          enemySpawnFrames.set(enemy.id, frame);
          enemyGroup.add(mesh);
        }

        const bornAt = enemySpawnFrames.get(enemy.id) ?? frame;
        const appear = Math.min(1, (frame - bornAt) / 12);
        const pos = worldPositionFromCanvas(enemy.position.x, enemy.position.y, cellSize, rows);
        mesh.position.x = pos.x;
        mesh.position.z = pos.z;
        updateEnemyMesh(mesh, enemy, frame * 0.016);
        mesh.scale.setScalar((BOSS_TYPES.has(enemy.type) ? 1.55 : 1) * (0.78 + appear * 0.22));
        mesh.userData.type = enemy.type;

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
        }
      }

      for (const [id, mesh] of enemyMeshes) {
        if (seen.has(id)) continue;
        const mat = (mesh.children[0] as THREE.Mesh | undefined)?.material;
        const color = mat instanceof THREE.MeshStandardMaterial ? mat.color.getHex() : 0xef4444;
        spawnBurst(mesh, burstGroup, effects, color, BOSS_TYPES.has((mesh.userData.type as string) ?? '') ? 16 : 8, 1.8);
        enemyGroup.remove(mesh);
        enemyMeshes.delete(id);
        enemySpawnFrames.delete(id);
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
        }

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
        spawnBurst(mesh, burstGroup, effects, color, 4, 0.8);
        projectileGroup.remove(mesh);
        projectileMeshes.delete(id);
        projectilePrev.delete(id);
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

        if (pulse.life <= 0) {
          overlayGroup.remove(pulse.ring);
          overlayGroup.remove(pulse.glow);
          buildPulses.splice(i, 1);
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
        for (const pad of buildPads) {
          const pulse = 0.16 + (Math.sin(frame * 0.05 + pad.position.x * 0.9) + 1) * 0.05;
          (pad.material as THREE.MeshBasicMaterial).opacity = pulse;
        }
        placementRing.rotation.z += 0.01;
        rangeRing.rotation.z -= 0.004;
        selectedRangeRing.rotation.z += 0.003;
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
