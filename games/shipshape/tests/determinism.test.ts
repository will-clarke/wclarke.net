/**
 * T3 acceptance test. Change `describe.skip` to `describe` when starting T3.
 * ⛔ Do not edit - this is the load-bearing guarantee for the whole harness.
 * If this fails, find the nondeterminism; never loosen the comparison.
 */

import { describe, expect, it } from 'vitest'
import { DEFAULT_PARAMS, BASE_UNLOCKS } from '../src/core/params'
import { createSim, snapshot } from '../src/core/sim'
import type { Command } from '../src/core/types'

function scriptedCommands(tick: number): Command[] {
  if (tick === 5) return [{ kind: 'setLure', value: 1.7 }]
  if (tick === 100) return [{ kind: 'reroll' }]
  if (tick === 101) return [{ kind: 'place', trayIndex: 0, x: 3, y: 0, rotation: 0 }]
  if (tick === 400) return [{ kind: 'place', trayIndex: 1, x: -2, y: 0, rotation: 0 }]
  if (tick === 900) return [{ kind: 'setLure', value: 0.5 }]
  return []
}

describe.skip('T3 determinism', () => {
  it('same seed + same commands → identical snapshots after 1200 ticks', () => {
    const a = createSim(DEFAULT_PARAMS, 42, BASE_UNLOCKS)
    const b = createSim(DEFAULT_PARAMS, 42, BASE_UNLOCKS)
    for (let t = 0; t < 1200; t++) {
      a.step(scriptedCommands(t))
      b.step(scriptedCommands(t))
    }
    expect(snapshot(a.state)).toBe(snapshot(b.state))
  })

  it('different seeds diverge', () => {
    const a = createSim(DEFAULT_PARAMS, 1, BASE_UNLOCKS)
    const b = createSim(DEFAULT_PARAMS, 2, BASE_UNLOCKS)
    for (let t = 0; t < 1200; t++) {
      a.step([])
      b.step([])
    }
    expect(snapshot(a.state)).not.toBe(snapshot(b.state))
  })

  it('starting state matches params.starting exactly', () => {
    const sim = createSim(DEFAULT_PARAMS, 7, BASE_UNLOCKS)
    expect(sim.state.scrap).toBe(DEFAULT_PARAMS.starting.scrap)
    expect(sim.state.cells.size).toBe(DEFAULT_PARAMS.starting.cells.length)
    expect(sim.state.tick).toBe(0)
    expect(sim.state.wave).toBe(1)
    expect(sim.state.lure).toBe(DEFAULT_PARAMS.lure.start)
    expect(sim.state.gameOver).toBe(false)
  })
})
