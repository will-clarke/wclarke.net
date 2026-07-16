/**
 * T2 acceptance tests. Change `describe.skip` to `describe` when starting T2.
 * ⛔ Do not edit any assertion - they ARE the spec. Add your own extra cases below.
 */

import { describe, expect, it } from 'vitest'
import { key } from '../src/core/grid'
import { BASE_UNLOCKS } from '../src/core/params'
import { checkPlacement } from '../src/core/pieces'
import type { Cell, TechUnlocks, TrayOffer } from '../src/core/types'

function ship(coords: [number, number][]): Map<string, Cell> {
  const m = new Map<string, Cell>()
  for (const [x, y] of coords) {
    m.set(key(x, y), { x, y, type: 'hull', hp: 30, maxHp: 30, weldCount: 0, xp: 0, pieceId: 0 })
  }
  return m
}

const hullD2: TrayOffer = { shape: 'D2', orientation: 0, block: 'hull', cost: 4 }
const GYRO: TechUnlocks = { ...BASE_UNLOCKS, rotation: true }

describe.skip('T2 checkPlacement', () => {
  it('legal domino next to a single cell: 1 weld, cost from the offer', () => {
    const r = checkPlacement({
      cells: ship([[0, 0]]),
      scrap: 100,
      offer: hullD2,
      unlocks: BASE_UNLOCKS,
      x: 1, y: 0, rotation: 0,
    })
    expect(r).toEqual({
      ok: true,
      cells: [{ x: 1, y: 0 }, { x: 2, y: 0 }],
      weldCount: 1,
      cost: 4,
    })
  })

  it('rejects overlap as occupied', () => {
    const r = checkPlacement({
      cells: ship([[1, 0]]),
      scrap: 100,
      offer: hullD2,
      unlocks: BASE_UNLOCKS,
      x: 1, y: 0, rotation: 0,
    })
    expect(r).toEqual({ ok: false, reason: 'occupied' })
  })

  it('rejects detached placement as not-adjacent (diagonal contact does not count)', () => {
    const r = checkPlacement({
      cells: ship([[0, 0]]),
      scrap: 100,
      offer: hullD2,
      unlocks: BASE_UNLOCKS,
      x: 1, y: 1, rotation: 0, // (1,1)(2,1): touches (0,0) only diagonally
    })
    expect(r).toEqual({ ok: false, reason: 'not-adjacent' })
  })

  it('rejects when scrap is short by 1', () => {
    const r = checkPlacement({
      cells: ship([[0, 0]]),
      scrap: 3,
      offer: hullD2,
      unlocks: BASE_UNLOCKS,
      x: 1, y: 0, rotation: 0,
    })
    expect(r).toEqual({ ok: false, reason: 'unaffordable' })
  })

  it('rejects rotation without Gyro; allows it with Gyro', () => {
    const args = {
      cells: ship([[0, 0]]),
      scrap: 100,
      offer: hullD2,
      x: 0, y: 1, rotation: 1 as const, // vertical domino below the cell
    }
    expect(checkPlacement({ ...args, unlocks: BASE_UNLOCKS })).toEqual({ ok: false, reason: 'rotation-locked' })
    const r = checkPlacement({ ...args, unlocks: GYRO })
    expect(r.ok).toBe(true)
  })

  it('null offer → bad-tray-slot, and it outranks every other failure', () => {
    const r = checkPlacement({
      cells: ship([[1, 0]]),
      scrap: 0,
      offer: null,
      unlocks: BASE_UNLOCKS,
      x: 1, y: 0, rotation: 3,
    })
    expect(r).toEqual({ ok: false, reason: 'bad-tray-slot' })
  })

  it('socketing into a U-pocket welds 3 edges', () => {
    // U opening downward: notch at (1,1)
    const pocket = ship([[0, 0], [1, 0], [2, 0], [0, 1], [2, 1]])
    const r = checkPlacement({
      cells: pocket,
      scrap: 100,
      offer: hullD2,
      unlocks: GYRO,
      x: 1, y: 1, rotation: 1, // vertical domino (1,1)(1,2)
    })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.cells).toEqual([{ x: 1, y: 1 }, { x: 1, y: 2 }])
      expect(r.weldCount).toBe(3) // (1,1) touches (1,0), (0,1), (2,1); (1,2) touches nothing
    }
  })

  it('same-piece internal edges never count as welds', () => {
    // O4 next to a single cell: only the two left cells of the square touch it? No -
    // single cell at (0,0); square at (1,0): its cells (1,0)(2,0)(1,1)(2,1);
    // only (1,0) touches (0,0). Internal square edges (4 of them) must not count.
    const r = checkPlacement({
      cells: ship([[0, 0]]),
      scrap: 100,
      offer: { shape: 'O4', orientation: 0, block: 'hull', cost: 8 },
      unlocks: BASE_UNLOCKS,
      x: 1, y: 0, rotation: 0,
    })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.weldCount).toBe(1)
  })

  it('a piece hugging a wall welds one edge per touching cell', () => {
    // vertical wall x=0, y=0..2; I3 placed vertically hugging it at x=1
    const wall = ship([[0, 0], [0, 1], [0, 2]])
    const r = checkPlacement({
      cells: wall,
      scrap: 100,
      offer: { shape: 'I3', orientation: 0, block: 'hull', cost: 6 },
      unlocks: GYRO,
      x: 1, y: 0, rotation: 1,
    })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.weldCount).toBe(3)
  })
})

// applyPlacement/applyDemolish are exercised end-to-end from T3's sim tests;
// unit specs for them live in TASKS.md T2 (write your own tests there).
describe.skip('T2 applyPlacement essentials (write these yourself - minimum set)', () => {
  it.todo('creates cells with maxHp = base + bonusHp + weldCount * hpPerEdge')
  it.todo('assigns one fresh pieceId to all cells of the piece')
  it.todo('deducts scrap and clears exactly the used tray slot')
  it.todo('updates stats.piecesPlaced, stats.weldEdgesTotal, stats.scrapSpent, peakMass')
  it.todo('demolish removes the whole piece, refunds floor(cost * 0.5), never touches core')
})
