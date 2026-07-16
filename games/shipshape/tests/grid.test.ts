/**
 * T1 acceptance tests. Change `describe.skip` to `describe` when starting T1.
 * ⛔ Do not edit any assertion - they ARE the spec. Add your own extra cases below.
 */

import { describe, expect, it } from 'vitest'
import { computeExposure, key, parseKey, shipBounds, shipMass } from '../src/core/grid'
import type { Cell } from '../src/core/types'

function ship(coords: [number, number][]): Map<string, Cell> {
  const m = new Map<string, Cell>()
  for (const [x, y] of coords) {
    m.set(key(x, y), { x, y, type: 'hull', hp: 30, maxHp: 30, weldCount: 0, xp: 0, pieceId: 0 })
  }
  return m
}

describe('key/parseKey', () => {
  it('round-trips negative coordinates', () => {
    expect(parseKey(key(-3, 7))).toEqual({ x: -3, y: 7 })
    expect(parseKey(key(0, -12))).toEqual({ x: 0, y: -12 })
  })
})

describe.skip('T1 computeExposure', () => {
  it('single cell: 4 exposed edges, no interior', () => {
    const info = computeExposure(ship([[0, 0]]))
    expect(info.exposedEdges.get(key(0, 0))).toBe(4)
    expect(info.interiorEmpty.size).toBe(0)
  })

  it('2x2 block: every cell has exactly 2 exposed edges', () => {
    const info = computeExposure(ship([[0, 0], [1, 0], [0, 1], [1, 1]]))
    for (const k of [key(0, 0), key(1, 0), key(0, 1), key(1, 1)]) {
      expect(info.exposedEdges.get(k)).toBe(2)
    }
    expect(info.interiorEmpty.size).toBe(0)
  })

  it('3x3 ring: centre is interior; edge-centres have 1 exposed edge (interior does NOT count)', () => {
    // ring = 3x3 minus centre (1,1)
    const ring: [number, number][] = [
      [0, 0], [1, 0], [2, 0],
      [0, 1], [2, 1],
      [0, 2], [1, 2], [2, 2],
    ]
    const info = computeExposure(ship(ring))
    expect(info.interiorEmpty).toEqual(new Set([key(1, 1)]))
    // corners: 2 outside edges
    for (const k of [key(0, 0), key(2, 0), key(0, 2), key(2, 2)]) {
      expect(info.exposedEdges.get(k), k).toBe(2)
    }
    // edge-centres: 1 outside edge (their inner edge faces the sealed pocket)
    for (const k of [key(1, 0), key(0, 1), key(2, 1), key(1, 2)]) {
      expect(info.exposedEdges.get(k), k).toBe(1)
    }
  })

  it('broken ring (gap at (1,0)): nothing is interior any more', () => {
    const cShape: [number, number][] = [
      [0, 0], [2, 0],
      [0, 1], [2, 1],
      [0, 2], [1, 2], [2, 2],
    ]
    const info = computeExposure(ship(cShape))
    expect(info.interiorEmpty.size).toBe(0)
    // (0,1) now sees the outside through the ex-pocket: left edge + right edge
    expect(info.exposedEdges.get(key(0, 1))).toBe(2)
  })

  it('diagonal gaps do not leak: flood fill is orthogonal only', () => {
    // 2x2 pocket enclosed by a ring with tight diagonal corners
    const ring: [number, number][] = [
      [1, 0], [2, 0],
      [0, 1], [3, 1],
      [0, 2], [3, 2],
      [1, 3], [2, 3],
    ]
    // pocket cells (1,1)(2,1)(1,2)(2,2) touch outside only diagonally at corners
    const info = computeExposure(ship(ring))
    expect(info.interiorEmpty).toEqual(new Set([key(1, 1), key(2, 1), key(1, 2), key(2, 2)]))
  })

  it('does not mutate its input', () => {
    const cells = ship([[0, 0], [1, 0]])
    const before = JSON.stringify([...cells.entries()])
    computeExposure(cells)
    expect(JSON.stringify([...cells.entries()])).toBe(before)
  })
})

describe.skip('T1 shipMass / shipBounds', () => {
  it('mass counts cells', () => {
    expect(shipMass(ship([[0, 0], [1, 0], [5, 5]]))).toBe(3)
  })

  it('bounds of a single cell at origin: centre (0.5, 0.5), radius 0', () => {
    const b = shipBounds(ship([[0, 0]]))
    expect(b.centre).toEqual({ x: 0.5, y: 0.5 })
    expect(b.radius).toBeCloseTo(0, 5)
  })

  it('bounds of a 1x3 row: centre in the middle cell, radius 1', () => {
    const b = shipBounds(ship([[0, 0], [1, 0], [2, 0]]))
    expect(b.centre).toEqual({ x: 1.5, y: 0.5 })
    expect(b.radius).toBeCloseTo(1, 5)
  })
})
