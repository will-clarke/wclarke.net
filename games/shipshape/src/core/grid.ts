/**
 * Grid geometry: keys, neighbours, exposure & enclosure.
 * SIGNATURES ARE FROZEN. Bodies implemented in TASKS.md **T1**.
 */

import type { Cell, Vec2 } from './types'

export function key(x: number, y: number): string {
  return `${x},${y}`
}

export function parseKey(k: string): Vec2 {
  const i = k.indexOf(',')
  return { x: Number(k.slice(0, i)), y: Number(k.slice(i + 1)) }
}

export const ORTHO: readonly Vec2[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
]

export const ALL_8: readonly Vec2[] = [
  ...ORTHO,
  { x: -1, y: -1 },
  { x: 1, y: -1 },
  { x: -1, y: 1 },
  { x: 1, y: 1 },
]

export interface ExposureInfo {
  /**
   * For every ship cell: how many of its 4 orthogonal neighbours are
   * OUTSIDE-CONNECTED empty cells. 0 = the cell is sealed/mothballed.
   * Enclosed empty pockets do NOT count as exposure.
   */
  exposedEdges: Map<string, number>
  /** Empty cells fully enclosed by ship cells (flood fill cannot reach them from outside). */
  interiorEmpty: Set<string>
}

/**
 * T1. Flood fill from outside the ship's bounding box (inflated by 1 cell) over
 * empty cells using orthogonal moves only. Empty cells never reached are
 * interiorEmpty. See tests/grid.test.ts for exact expected values.
 * Must be pure: no mutation of `cells`.
 */
export function computeExposure(cells: ReadonlyMap<string, Cell>): ExposureInfo {
  void cells
  throw new Error('Not implemented - TASKS.md T1')
}

/** T1. Ship mass = number of ship cells. */
export function shipMass(cells: ReadonlyMap<string, Cell>): number {
  void cells
  throw new Error('Not implemented - TASKS.md T1')
}

/**
 * T1. Centre of the ship's bounding box (floats), and the radius of the
 * smallest circle around that centre containing every cell centre. Used by
 * the rock spawner (T4) and the director camera (T14).
 */
export function shipBounds(cells: ReadonlyMap<string, Cell>): { centre: Vec2; radius: number } {
  void cells
  throw new Error('Not implemented - TASKS.md T1')
}
