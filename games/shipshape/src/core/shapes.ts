/**
 * Polyomino catalog + orientation math. ⛔ FROZEN - fully implemented, do not edit.
 *
 * Every shape is authored in orientation 0 with cells normalised so
 * min x = 0 and min y = 0. orientedCells() rotates 90° CLOCKWISE (screen
 * space, +y down) per rotation step and re-normalises, so the result is
 * always in bounding-box coordinates with top-left at (0,0). A `place`
 * command's (x, y) is added to these cells to get board cells.
 */

import type { Rotation, ShapeId, Vec2 } from './types'

export const SHAPES: Record<ShapeId, Vec2[]> = {
  D2: [{ x: 0, y: 0 }, { x: 1, y: 0 }],
  I3: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }],
  L3: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }],
  O4: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
  L4: [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 1, y: 2 }],
  J4: [{ x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 }, { x: 0, y: 2 }],
  S4: [{ x: 1, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
  Z4: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
  T4: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 1 }],
  I4: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }],
  U5: [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
  P5: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 0, y: 2 }],
  W5: [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 2 }],
}

export function cellCount(shape: ShapeId): number {
  return SHAPES[shape].length
}

/** Rotate 90° clockwise `rotation` times, then normalise top-left to (0,0). */
export function orientedCells(shape: ShapeId, rotation: Rotation): Vec2[] {
  let cells = SHAPES[shape].map((c) => ({ ...c }))
  for (let r = 0; r < rotation; r++) {
    cells = cells.map((c) => ({ x: -c.y, y: c.x }))
  }
  const minX = Math.min(...cells.map((c) => c.x))
  const minY = Math.min(...cells.map((c) => c.y))
  return cells
    .map((c) => ({ x: c.x - minX, y: c.y - minY }))
    .sort((a, b) => a.y - b.y || a.x - b.x)
}
