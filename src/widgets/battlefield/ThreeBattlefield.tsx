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

function createArcherTower(color: number): THREE.Group {
  const group = new THREE.Group();
  const wood = standardMaterial(0x6b4423);
  const roof = standardMaterial(color, color, 0.22);

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, 0.22, 8), wood);
  base.position.y = 0.11;
  group.add(base);

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
  const group = new THREE.Group();
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.38, 0.18, 10), standardMaterial(0x1f2937));
  pedestal.position.y = 0.09;
  group.add(pedestal);

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
  return group;
}

function createMineTower(color: number): THREE.Group {
  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.4, 0.16, 10), standardMaterial(0x3f2c16));
  base.position.y = 0.08;
  group.add(base);

  const crate = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.34, 0.42), standardMaterial(0x7c4a19));
  crate.position.y = 0.33;
  group.add(crate);

  const nugget = new THREE.Mesh(new THREE.IcosahedronGeometry(0.14, 0), standardMaterial(color, color, 0.7));
  nugget.position.y = 0.63;
  group.add(nugget);
  return group;
}

function createCannonTower(color: number): THREE.Group {
  const group = new THREE.Group();
  const darkMetal = standardMaterial(0x475569);
  const accent = standardMaterial(color, color, 0.15);

  const base = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.18, 0.54), accent);
  base.position.y = 0.09;
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
  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 0.18, 10), standardMaterial(0x1e293b));
  base.position.y = 0.09;
  group.add(base);

  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.72, 10), standardMaterial(color, color, 0.25));
  pillar.position.y = 0.5;
  group.add(pillar);

  const top = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 0), standardMaterial(0xffffff, color, 0.65));
  top.position.y = 1.02;
  group.add(top);
  return group;
}

function createWallTower(color: number): THREE.Group {
  const group = new THREE.Group();
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
    case 'WORD':
    case 'DIVINE':
    case 'CHRONO':
      group = createMagicTower(color);
      break;
    case 'CANNON':
    case 'METEOR':
    case 'FLAME':
      group = createCannonTower(color);
      break;
    case 'ICE':
      group = createElementalPylon(color, 'crystal');
      break;
    case 'LIGHTNING':
      group = createElementalPylon(color, 'coil');
      break;
    case 'POISON':
    case 'HEALER':
    case 'PHOENIX':
    case 'VOID':
      group = createElementalPylon(color, 'orb');
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

function createBossEnemy(color: number, elite: boolean): THREE.Group {
  const group = new THREE.Group();
  const mat = standardMaterial(color, 0xffaa00, elite ? 0.4 : 0.18);

  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.34, 0), mat);
  core.position.y = 0.66;
  core.scale.set(1.2, 1.5, 1.1);
  group.add(core);

  const hornLeft = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.32, 6), standardMaterial(0xfef3c7));
  hornLeft.position.set(-0.18, 1.08, 0);
  hornLeft.rotation.z = 0.45;
  group.add(hornLeft);
  const hornRight = hornLeft.clone();
  hornRight.position.x = 0.18;
  hornRight.rotation.z = -0.45;
  group.add(hornRight);

  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.24, 0.28), standardMaterial(0x111827));
  chest.position.set(0, 0.38, 0);
  group.add(chest);
  return group;
}

function createEnemyMesh(enemy: Enemy): THREE.Group {
  const color = ENEMY_COLORS[enemy.type] ?? 0xef4444;
  let group: THREE.Group;

  if (['DRAGON', 'LICH_KING', 'DEMON_LORD', 'HYDRA', 'WORD_DESTROYER'].includes(enemy.type)) {
    group = createBossEnemy(color, !!enemy.isElite);
  } else if (enemy.type === 'SLIME') {
    group = createSlimeEnemy(color, !!enemy.isElite);
  } else if (['BAT', 'HARPY', 'DRAGON_WHELP', 'GARGOYLE', 'PHOENIX_CHICK', 'WYVERN'].includes(enemy.type)) {
    group = createFlyingEnemy(color, !!enemy.isElite);
  } else if (['WOLF', 'SLIME', 'IRON_TURTLE'].includes(enemy.type)) {
    group = createBeastEnemy(color, !!enemy.isElite);
  } else {
    group = createHumanoidEnemy(color, !!enemy.isElite);
  }

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
  const bob = enemy.isRaging ? 0.08 : 0.04;
  group.position.y = Math.sin(time * (enemy.isRaging ? 8 : 4)) * bob;
  group.rotation.y += enemy.isRaging ? 0.07 : 0.03;
  if (enemy.type === 'BAT' || enemy.type === 'HARPY' || enemy.type === 'WYVERN' || enemy.type === 'DRAGON') {
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
    color: isPath ? 0x64748b : isBuild ? 0x163c35 : 0x0f2d23,
    roughness: isPath ? 0.62 : 0.94,
    metalness: isPath ? 0.12 : 0.02,
  });
  const tile = new THREE.Mesh(
    new THREE.BoxGeometry(0.94, isPath ? 0.08 : 0.06, 0.94),
    material
  );
  tile.receiveShadow = true;
  return tile;
}

export default function ThreeBattlefield({
  width,
  height,
  cellSize,
  getEngine,
  selectedTowerId,
  placementInfo,
}: ThreeBattlefieldProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || width <= 0 || height <= 0 || cellSize <= 0) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.innerHTML = '';
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x071525, 8, 28);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(7.8, 8.7, 12.5);
    camera.lookAt(7.8, 0, 4.8);

    scene.add(new THREE.AmbientLight(0xa5f3fc, 1.3));

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.55);
    keyLight.position.set(4, 10, 7);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    scene.add(keyLight);

    const fillLight = new THREE.PointLight(0x2dd4bf, 14, 26, 2);
    fillLight.position.set(12, 5, 2);
    scene.add(fillLight);

    const rimLight = new THREE.PointLight(0x7c3aed, 16, 32, 2);
    rimLight.position.set(-4, 8, 8);
    scene.add(rimLight);

    const mapGroup = new THREE.Group();
    const towerGroup = new THREE.Group();
    const enemyGroup = new THREE.Group();
    const projectileGroup = new THREE.Group();
    const overlayGroup = new THREE.Group();
    scene.add(mapGroup, towerGroup, enemyGroup, projectileGroup, overlayGroup);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(22, 15),
      new THREE.MeshStandardMaterial({
        color: 0x0b2b28,
        roughness: 1,
        metalness: 0,
      })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(7.5, -0.05, 4.5);
    ground.receiveShadow = true;
    scene.add(ground);

    const backWall = new THREE.Mesh(
      new THREE.PlaneGeometry(22, 8),
      new THREE.MeshBasicMaterial({ color: 0x0b223d, transparent: true, opacity: 0.75 })
    );
    backWall.position.set(7.5, 4.2, -2.6);
    scene.add(backWall);

    const sideGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(4, 14),
      new THREE.MeshBasicMaterial({ color: 0x0f766e, transparent: true, opacity: 0.18, side: THREE.DoubleSide })
    );
    sideGlow.position.set(-1.5, 2.2, 4.5);
    sideGlow.rotation.y = Math.PI / 2.8;
    scene.add(sideGlow);
    const rightGlow = sideGlow.clone();
    rightGlow.position.x = 16.5;
    rightGlow.rotation.y = -Math.PI / 2.8;
    scene.add(rightGlow);

    const towerMeshes = new Map<string, THREE.Group>();
    const enemyMeshes = new Map<string, THREE.Group>();
    const projectileMeshes = new Map<string, THREE.Mesh>();
    const buildPads: THREE.Mesh[] = [];
    const placementRing = new THREE.Mesh(
      new THREE.RingGeometry(0.36, 0.47, 32),
      new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.55, side: THREE.DoubleSide })
    );
    placementRing.rotation.x = -Math.PI / 2;
    placementRing.visible = false;
    overlayGroup.add(placementRing);

    const placementPlate = new THREE.Mesh(
      new THREE.PlaneGeometry(0.9, 0.9),
      new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.18, side: THREE.DoubleSide })
    );
    placementPlate.rotation.x = -Math.PI / 2;
    placementPlate.position.y = 0.081;
    placementPlate.visible = false;
    overlayGroup.add(placementPlate);

    let frame = 0;
    let raf = 0;

    const syncMap = (engine: GameEngine) => {
      const map = engine.getMapData();
      if (!map || mapGroup.children.length > 0) return;

      const rows = map.grid.length;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < map.grid[row].length; col++) {
          const cell = map.grid[row][col];
          const tile = createMapTile(cell);
          tile.position.set(col + 0.5, cell === 1 ? 0.04 : 0.03, rows - row - 0.5);
          mapGroup.add(tile);

          if (cell === 1) {
            const stripe = new THREE.Mesh(
              new THREE.PlaneGeometry(0.78, 0.78),
              new THREE.MeshBasicMaterial({ color: 0xe2e8f0, transparent: true, opacity: 0.11 })
            );
            stripe.rotation.x = -Math.PI / 2;
            stripe.position.set(col + 0.5, 0.085, rows - row - 0.5);
            mapGroup.add(stripe);
          }

          if (cell !== 1) {
            const pad = new THREE.Mesh(
              new THREE.PlaneGeometry(0.7, 0.7),
              new THREE.MeshBasicMaterial({
                color: 0x34d399,
                transparent: true,
                opacity: 0.14,
              })
            );
            pad.rotation.x = -Math.PI / 2;
            pad.position.set(col + 0.5, 0.071, rows - row - 0.5);
            mapGroup.add(pad);
            buildPads.push(pad);
          }
        }
      }
    };

    const syncPlacement = () => {
      if (!placementInfo) {
        placementRing.visible = false;
        placementPlate.visible = false;
        return;
      }

      const rows = getEngine()?.getMapData()?.grid.length ?? 10;
      const x = placementInfo.col + 0.5;
      const z = rows - placementInfo.row - 0.5;
      const color = placementInfo.canPlace ? 0x22c55e : 0xef4444;

      (placementRing.material as THREE.MeshBasicMaterial).color.setHex(color);
      (placementPlate.material as THREE.MeshBasicMaterial).color.setHex(color);
      placementRing.scale.setScalar(Math.max(1, placementInfo.range / 3));
      placementRing.position.set(x, 0.08, z);
      placementPlate.position.set(x, 0.081, z);
      placementRing.visible = true;
      placementPlate.visible = true;
    };

    const syncTowers = (towers: Tower[]) => {
      const seen = new Set<string>();
      const rows = getEngine()?.getMapData()?.grid.length ?? 10;

      for (const tower of towers) {
        seen.add(tower.id);
        const selected = tower.id === selectedTowerId;
        let mesh = towerMeshes.get(tower.id);
        if (!mesh) {
          mesh = createTowerMesh(tower.type, selected);
          towerMeshes.set(tower.id, mesh);
          towerGroup.add(mesh);
        }

        mesh.position.set(tower.position.col + 0.5, 0, rows - tower.position.row - 0.5);
        mesh.rotation.y += 0.01;
        mesh.scale.setScalar(1 + tower.grade * 0.06);

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
          enemyGroup.add(mesh);
        }

        const pos = worldPositionFromCanvas(enemy.position.x, enemy.position.y, cellSize, rows);
        mesh.position.x = pos.x;
        mesh.position.z = pos.z;
        updateEnemyMesh(mesh, enemy, frame * 0.016);
        mesh.scale.setScalar(['DRAGON', 'LICH_KING', 'DEMON_LORD', 'HYDRA', 'WORD_DESTROYER'].includes(enemy.type) ? 1.55 : 1);
      }

      for (const [id, mesh] of enemyMeshes) {
        if (seen.has(id)) continue;
        enemyGroup.remove(mesh);
        enemyMeshes.delete(id);
      }
    };

    const syncProjectiles = (engine: GameEngine) => {
      const seen = new Set<string>();
      const rows = engine.getMapData()?.grid.length ?? 10;
      for (const projectile of engine.getProjectiles()) {
        seen.add(projectile.id);
        let mesh = projectileMeshes.get(projectile.id);
        if (!mesh) {
          mesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.07, 10, 10),
            new THREE.MeshStandardMaterial({
              color: TOWER_COLORS[projectile.towerType] ?? 0xffffff,
              emissive: TOWER_COLORS[projectile.towerType] ?? 0xffffff,
              emissiveIntensity: 0.8,
            })
          );
          projectileMeshes.set(projectile.id, mesh);
          projectileGroup.add(mesh);
        }

        const pos = worldPositionFromCanvas(projectile.position.x, projectile.position.y, cellSize, rows);
        mesh.position.set(pos.x, 0.34, pos.z);
      }

      for (const [id, mesh] of projectileMeshes) {
        if (seen.has(id)) continue;
        projectileGroup.remove(mesh);
        projectileMeshes.delete(id);
      }
    };

    const animate = () => {
      frame += 1;
      const engine = getEngine();
      if (engine) {
        syncMap(engine);
        syncTowers(engine.getTowers());
        syncEnemies(engine.getEnemies());
        syncProjectiles(engine);
        syncPlacement();
        for (const pad of buildPads) {
          const pulse = 0.11 + (Math.sin(frame * 0.05 + pad.position.x) + 1) * 0.025;
          (pad.material as THREE.MeshBasicMaterial).opacity = pulse;
        }
      }

      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };

    raf = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(raf);
      renderer.dispose();
      host.innerHTML = '';
    };
  }, [cellSize, getEngine, height, placementInfo, selectedTowerId, width]);

  return <div ref={hostRef} className="absolute inset-0 pointer-events-none rounded overflow-hidden" />;
}
