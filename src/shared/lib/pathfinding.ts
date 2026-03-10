// ============================================================
// WordGuard - Path Utilities
// ============================================================

import type { WorldPosition, GridPosition } from '../types/game';

/**
 * Get the pixel center of a grid cell.
 */
export function getCellCenter(row: number, col: number, cellSize: number): WorldPosition {
  return {
    x: col * cellSize + cellSize / 2,
    y: row * cellSize + cellSize / 2,
  };
}

/**
 * Euclidean distance between two world positions.
 */
export function getDistanceBetweenPoints(a: WorldPosition, b: WorldPosition): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Linear interpolation between two positions.
 */
export function lerpPosition(a: WorldPosition, b: WorldPosition, t: number): WorldPosition {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}

/**
 * Given a path (array of [row, col] waypoints) and a progress value (0..1 across the
 * entire path), return the interpolated world position and the current segment index.
 *
 * Progress 0 = at path[0], progress 1 = at path[path.length-1].
 */
export function getPositionOnPath(
  path: [number, number][],
  progress: number,
  cellSize: number
): { position: WorldPosition; segmentIndex: number } {
  if (path.length === 0) {
    return { position: { x: 0, y: 0 }, segmentIndex: 0 };
  }

  if (path.length === 1) {
    const center = getCellCenter(path[0][0], path[0][1], cellSize);
    return { position: center, segmentIndex: 0 };
  }

  // Compute segment lengths
  const segmentLengths: number[] = [];
  let totalLength = 0;

  for (let i = 0; i < path.length - 1; i++) {
    const a = getCellCenter(path[i][0], path[i][1], cellSize);
    const b = getCellCenter(path[i + 1][0], path[i + 1][1], cellSize);
    const len = getDistanceBetweenPoints(a, b);
    segmentLengths.push(len);
    totalLength += len;
  }

  if (totalLength === 0) {
    const center = getCellCenter(path[0][0], path[0][1], cellSize);
    return { position: center, segmentIndex: 0 };
  }

  const clampedProgress = Math.max(0, Math.min(1, progress));
  const targetDist = clampedProgress * totalLength;

  let accumulated = 0;
  for (let i = 0; i < segmentLengths.length; i++) {
    const segLen = segmentLengths[i];

    if (accumulated + segLen >= targetDist) {
      const segProgress = segLen > 0 ? (targetDist - accumulated) / segLen : 0;
      const a = getCellCenter(path[i][0], path[i][1], cellSize);
      const b = getCellCenter(path[i + 1][0], path[i + 1][1], cellSize);
      return {
        position: lerpPosition(a, b, segProgress),
        segmentIndex: i,
      };
    }
    accumulated += segLen;
  }

  // At end of path
  const lastWp = path[path.length - 1];
  return {
    position: getCellCenter(lastWp[0], lastWp[1], cellSize),
    segmentIndex: path.length - 2,
  };
}

/**
 * Compute the total pixel length of a path.
 */
export function getPathTotalLength(path: [number, number][], cellSize: number): number {
  let totalLength = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const a = getCellCenter(path[i][0], path[i][1], cellSize);
    const b = getCellCenter(path[i + 1][0], path[i + 1][1], cellSize);
    totalLength += getDistanceBetweenPoints(a, b);
  }
  return totalLength;
}

/**
 * Check whether a tower's range circle covers an enemy position.
 *
 * Tower position is a grid position; its center is derived from cellSize.
 * Range is expressed in **cells** (e.g. 3 means 3 cells radius).
 */
export function isInRange(
  towerPos: GridPosition,
  enemyPos: WorldPosition,
  rangeCells: number,
  cellSize: number
): boolean {
  const towerCenter = getCellCenter(towerPos.row, towerPos.col, cellSize);
  const rangePixels = rangeCells * cellSize;
  const dist = getDistanceBetweenPoints(towerCenter, enemyPos);
  return dist <= rangePixels;
}

/**
 * Get angle (radians) from point a to point b.
 */
export function getAngle(a: WorldPosition, b: WorldPosition): number {
  return Math.atan2(b.y - a.y, b.x - a.x);
}

/**
 * Normalise a direction vector.
 */
export function normalise(dx: number, dy: number): { dx: number; dy: number } {
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return { dx: 0, dy: 0 };
  return { dx: dx / len, dy: dy / len };
}
