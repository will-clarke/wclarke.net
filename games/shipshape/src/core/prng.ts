/**
 * Deterministic PRNG (mulberry32). ⛔ FROZEN - fully implemented, do not edit.
 * The ONLY source of randomness allowed in src/core and harness policies.
 */

export interface Prng {
  /** Uniform float in [0, 1). */
  next(): number
  /** Uniform integer in [0, n). n must be a positive integer. */
  int(n: number): number
  /** Uniform pick from a non-empty array. */
  pick<T>(items: readonly T[]): T
  /** Uniform float in [min, max). */
  range(min: number, max: number): number
}

export function createPrng(seed: number): Prng {
  let a = seed >>> 0
  const next = (): number => {
    a = (a + 0x6d2b79f5) | 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    int(n: number): number {
      if (!Number.isInteger(n) || n <= 0) throw new Error(`prng.int: bad n=${n}`)
      return Math.floor(next() * n)
    },
    pick<T>(items: readonly T[]): T {
      if (items.length === 0) throw new Error('prng.pick: empty array')
      return items[Math.floor(next() * items.length)] as T
    },
    range(min: number, max: number): number {
      return min + next() * (max - min)
    },
  }
}
