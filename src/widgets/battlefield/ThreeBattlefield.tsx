'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

import type { GameEngine } from '@/shared/lib/gameEngine';
import type { Enemy, Tower, TowerType } from '@/shared/types/game';

interface ThreeBattlefieldProps {
  width: number;
  height: number;
  cellSize: number;
  getEngine: () => GameEngine | null;
  selectedTowerId: string | null;
}

const TOWER_COLORS: Record<string, number> = {
  ARCHER: 0x4ade80,
  MAGIC: 0xa855f7,
  CANNON: 0xf97316,
  ICE: 0x67e8f9,
  LIGHTNING: 0xfacc15,
  POISON: 0x84cc16,
  HEALER: 0xf9a8d4,
  BARRICADE: 0xc084fc,
  GOLDMINE: 0xfbbf24,
  SNIPER: 0x94a3b8,
  FLAME: 0xfb7185,
  WORD: 0x22d3ee,
  METEOR: 0xff6b35,
  VOID: 0x4c1d95,
  PHOENIX: 0xff7a59,
  CHRONO: 0x2dd4bf,
  DIVINE: 0xfef08a,
};

const ENEMY_COLORS: Record<string, number> = {
  SLIME: 0x6ee7b7,
  GOBLIN: 0xa3e635,
  SKELETON: 0xe5e7eb,
  BAT: 0x818cf8,
  WOLF: 0xa16207,
  KNIGHT: 0x94a3b8,
  GOLEM: 0xa8a29e,
  SHIELD_BEARER: 0x64748b,
  IRON_TURTLE: 0x4b5563,
  ARMORED_ORC: 0x65a30d,
  THIEF: 0x52525b,
  SHADOW: 0x312e81,
  NINJA: 0x111827,
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

function worldFromCanvas(x: number, y: number, cellSize: number, rows: number): THREE.Vector3 {
  return new THREE.Vector3(x / cellSize, 0, rows - y / cellSize);
}

function createTowerMesh(type: TowerType, selected: boolean): THREE.Group {
  const group = new THREE.Group();
  const color = TOWER_COLORS[type] ?? 0x60a5fa;
  const bodyMat = new THREE.MeshStandardMaterial({
    color,
    metalness: 0.35,
    roughness: 0.35,
    emissive: selected ? color : 0x000000,
    emissiveIntensity: selected ? 0.35 : 0.05,
  });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.44, 0.22, 16), bodyMat);
  base.position.y = 0.14;
  group.add(base);

  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.8, 12), bodyMat);
  core.position.y = 0.58;
  group.add(core);

  const topper = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 14), bodyMat);
  topper.position.y = 1.08;
  group.add(topper);

  if (type === 'CANNON' || type === 'SNIPER') {
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.09, 0.85, 12),
      new THREE.MeshStandardMaterial({ color: 0xe5e7eb, metalness: 0.8, roughness: 0.2 })
    );
    barrel.rotation.z = Math.PI / 2;
    barrel.position.set(0.34, 0.86, 0);
    group.add(barrel);
  }

  if (type === 'WORD' || type === 'MAGIC' || type === 'DIVINE') {
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(0.34, 0.03, 10, 28),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: color, emissiveIntensity: 0.7 })
    );
    halo.rotation.x = Math.PI / 2;
    halo.position.y = 1.18;
    group.add(halo);
  }

  return group;
}

function createEnemyMesh(enemy: Enemy): THREE.Group {
  const group = new THREE.Group();
  const color = ENEMY_COLORS[enemy.type] ?? 0xef4444;
  const mat = new THREE.MeshStandardMaterial({
    color,
    emissive: enemy.isElite ? 0xfacc15 : 0x000000,
    emissiveIntensity: enemy.isElite ? 0.45 : 0.08,
    metalness: enemy.shield ? 0.45 : 0.18,
    roughness: 0.45,
  });

  const body = new THREE.Mesh(
    enemy.shield ? new THREE.BoxGeometry(0.52, 0.52, 0.52) : new THREE.SphereGeometry(0.28, 16, 16),
    mat
  );
  body.position.y = 0.32;
  group.add(body);

  if (enemy.isElite) {
    const crown = new THREE.Mesh(
      new THREE.ConeGeometry(0.16, 0.24, 6),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xfacc15, emissiveIntensity: 0.5 })
    );
    crown.position.y = 0.78;
    group.add(crown);
  }

  if (enemy.shield) {
    const shield = new THREE.Mesh(
      new THREE.TorusGeometry(0.42, 0.035, 10, 32),
      new THREE.MeshStandardMaterial({ color: 0x7dd3fc, emissive: 0x38bdf8, emissiveIntensity: 0.7 })
    );
    shield.rotation.x = Math.PI / 2;
    shield.position.y = 0.42;
    group.add(shield);
  }

  return group;
}

export default function ThreeBattlefield({
  width,
  height,
  cellSize,
  getEngine,
  selectedTowerId,
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
    host.innerHTML = '';
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x08111f, 10, 28);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(7.8, 10.5, 14.2);
    camera.lookAt(7.8, 0, 4.6);

    const ambient = new THREE.AmbientLight(0xa5f3fc, 1.2);
    scene.add(ambient);

    const key = new THREE.DirectionalLight(0xffffff, 1.65);
    key.position.set(8, 14, 10);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    scene.add(key);

    const rim = new THREE.PointLight(0x7c3aed, 18, 30, 2);
    rim.position.set(-3, 8, 3);
    scene.add(rim);

    const projectileGroup = new THREE.Group();
    const towerGroup = new THREE.Group();
    const enemyGroup = new THREE.Group();
    const mapGroup = new THREE.Group();
    scene.add(mapGroup, towerGroup, enemyGroup, projectileGroup);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 14),
      new THREE.MeshStandardMaterial({ color: 0x0f2d23, roughness: 1 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(7.5, -0.02, 4.5);
    ground.receiveShadow = true;
    scene.add(ground);

    const towerMeshes = new Map<string, THREE.Group>();
    const enemyMeshes = new Map<string, THREE.Group>();
    const projectileMeshes = new Map<string, THREE.Mesh>();

    let raf = 0;

    const syncMap = (engine: GameEngine) => {
      const map = engine.getMapData();
      if (!map || mapGroup.children.length > 0) return;

      const rows = map.grid.length;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < map.grid[row].length; col++) {
          const cell = map.grid[row][col];
          const material = new THREE.MeshStandardMaterial({
            color: cell === 1 ? 0x475569 : cell === 2 ? 0x1e293b : 0x163329,
            roughness: cell === 1 ? 0.65 : 0.95,
            metalness: cell === 1 ? 0.15 : 0.02,
          });
          const tile = new THREE.Mesh(new THREE.BoxGeometry(0.95, cell === 1 ? 0.1 : 0.05, 0.95), material);
          tile.position.set(col + 0.5, cell === 1 ? 0.05 : 0.025, rows - row - 0.5);
          tile.receiveShadow = true;
          mapGroup.add(tile);
        }
      }
    };

    const syncTowers = (towers: Tower[]) => {
      const seen = new Set<string>();
      for (const tower of towers) {
        seen.add(tower.id);
        let mesh = towerMeshes.get(tower.id);
        if (!mesh) {
          mesh = createTowerMesh(tower.type, tower.id === selectedTowerId);
          towerMeshes.set(tower.id, mesh);
          towerGroup.add(mesh);
        }

        const rows = getEngine()?.getMapData()?.grid.length ?? 10;
        mesh.position.set(tower.position.col + 0.5, 0, rows - tower.position.row - 0.5);
        mesh.rotation.y += 0.01 + tower.level * 0.0008;

        const aura = mesh.children[0] as THREE.Mesh | undefined;
        if (aura?.material instanceof THREE.MeshStandardMaterial) {
          aura.material.emissive.setHex(tower.id === selectedTowerId ? TOWER_COLORS[tower.type] ?? 0xffffff : 0x000000);
          aura.material.emissiveIntensity = tower.id === selectedTowerId ? 0.35 : 0.05;
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

        const pos = worldFromCanvas(enemy.position.x, enemy.position.y, cellSize, rows);
        mesh.position.set(pos.x, 0, pos.z);
        mesh.rotation.y += enemy.isRaging ? 0.06 : 0.025;
        mesh.scale.setScalar(enemy.type.includes('DRAGON') || enemy.type.includes('LORD') ? 1.35 : 1);
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
            new THREE.SphereGeometry(0.08, 10, 10),
            new THREE.MeshStandardMaterial({
              color: TOWER_COLORS[projectile.towerType] ?? 0xffffff,
              emissive: TOWER_COLORS[projectile.towerType] ?? 0xffffff,
              emissiveIntensity: 0.65,
            })
          );
          projectileMeshes.set(projectile.id, mesh);
          projectileGroup.add(mesh);
        }

        const pos = worldFromCanvas(projectile.position.x, projectile.position.y, cellSize, rows);
        mesh.position.set(pos.x, 0.35, pos.z);
      }

      for (const [id, mesh] of projectileMeshes) {
        if (seen.has(id)) continue;
        projectileGroup.remove(mesh);
        projectileMeshes.delete(id);
      }
    };

    const animate = () => {
      const engine = getEngine();
      if (engine) {
        syncMap(engine);
        syncTowers(engine.getTowers());
        syncEnemies(engine.getEnemies());
        syncProjectiles(engine);
      }

      renderer.render(scene, camera);
      raf = window.requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.cancelAnimationFrame(raf);
      renderer.dispose();
      host.innerHTML = '';
    };
  }, [cellSize, getEngine, height, selectedTowerId, width]);

  return <div ref={hostRef} className="absolute inset-0 pointer-events-none rounded overflow-hidden" />;
}
