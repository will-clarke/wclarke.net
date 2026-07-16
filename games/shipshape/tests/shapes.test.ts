import { describe, expect, it } from 'vitest'
import { SHAPES, cellCount, orientedCells } from '../src/core/shapes'
import type { ShapeId } from '../src/core/types'

const IDS = Object.keys(SHAPES) as ShapeId[]

describe('shapes catalog', () => {
  it('cell counts match the digit in the id', () => {
    for (const id of IDS) expect(cellCount(id), id).toBe(Number(id.slice(-1)))
  })

  it('all shapes are authored normalised (min x = min y = 0) with unique cells', () => {
    for (const id of IDS) {
      const cells = SHAPES[id]
      expect(Math.min(...cells.map((c) => c.x)), id).toBe(0)
      expect(Math.min(...cells.map((c) => c.y)), id).toBe(0)
      expect(new Set(cells.map((c) => `${c.x},${c.y}`)).size, id).toBe(cells.length)
    }
  })

  it('rotation preserves cell count and normalisation', () => {
    for (const id of IDS) {
      for (const r of [0, 1, 2, 3] as const) {
        const cells = orientedCells(id, r)
        expect(cells.length, `${id} r${r}`).toBe(cellCount(id))
        expect(Math.min(...cells.map((c) => c.x)), `${id} r${r}`).toBe(0)
        expect(Math.min(...cells.map((c) => c.y)), `${id} r${r}`).toBe(0)
      }
    }
  })

  it('I3 rotates from horizontal to vertical', () => {
    expect(orientedCells('I3', 1)).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: 2 },
    ])
  })

  it('rotation 0 is the authored orientation (sorted)', () => {
    expect(orientedCells('D2', 0)).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ])
  })

  it('four rotations of any shape include the identity again', () => {
    for (const id of IDS) {
      const r0 = JSON.stringify(orientedCells(id, 0))
      let cells = SHAPES[id].map((c) => ({ ...c }))
      for (let i = 0; i < 4; i++) cells = cells.map((c) => ({ x: -c.y, y: c.x }))
      const minX = Math.min(...cells.map((c) => c.x))
      const minY = Math.min(...cells.map((c) => c.y))
      const back = cells
        .map((c) => ({ x: c.x - minX, y: c.y - minY }))
        .sort((a, b) => a.y - b.y || a.x - b.x)
      expect(JSON.stringify(back), id).toBe(r0)
    }
  })
})
