/**
 * Harness contracts (node-only; never imported by src/ui).
 * ⛔ FROZEN SIGNATURES. Implemented in TASKS.md T11-T12.
 */

import type { Params } from '../src/core/params'
import type { Prng } from '../src/core/prng'
import type { Command, SimState, TechUnlocks } from '../src/core/types'

export interface PolicyCtx {
  params: Params
  unlocks: TechUnlocks
  /** Seeded per run - policies MUST use this for any randomness. */
  prng: Prng
}

export interface Policy {
  name: string
  /**
   * Called once per tick BEFORE sim.step; returned commands are passed to it.
   * Must be fast (called up to 20k times per run) and must not mutate state.
   */
  decide(state: Readonly<SimState>, ctx: PolicyCtx): Command[]
}

export interface RunMetrics {
  policy: string
  seed: number
  deathTick: number | null // null = survived the tick cap
  wavesSurvived: number
  peakMass: number
  techPoints: number
  scrapEarned: number
  /** Mean weldCount over all pieces placed (0 if none). */
  avgWeld: number
  /** Turret cells currently meeting their exposure requirement / total turret cells, at death (or cap). */
  mountUtilisation: number
  rocksDestroyed: number
  chunksExpired: number
  deathCause: 'core-destroyed' | 'tick-cap'
  wallClockMs: number
  ticksRun: number
}

export interface RunConfig {
  params: Params
  unlocks: TechUnlocks
  seed: number
  /** Hard stop so no run can hang the sweep. Default 18000 (30 game-minutes). */
  maxTicks: number
}
