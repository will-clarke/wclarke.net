import { describe, expect, it } from 'vitest'
import { createPrng } from '../src/core/prng'

describe('prng', () => {
  it('same seed → identical sequence', () => {
    const a = createPrng(1234)
    const b = createPrng(1234)
    for (let i = 0; i < 1000; i++) expect(a.next()).toBe(b.next())
  })

  it('different seeds → different sequences', () => {
    const a = createPrng(1)
    const b = createPrng(2)
    const same = Array.from({ length: 100 }, () => a.next() === b.next()).filter(Boolean).length
    expect(same).toBeLessThan(5)
  })

  it('next() stays in [0, 1)', () => {
    const p = createPrng(99)
    for (let i = 0; i < 10000; i++) {
      const v = p.next()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('int(n) stays in [0, n) and hits all values', () => {
    const p = createPrng(7)
    const seen = new Set<number>()
    for (let i = 0; i < 1000; i++) {
      const v = p.int(5)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(5)
      seen.add(v)
    }
    expect(seen.size).toBe(5)
  })
})
