/**
 * The sim shell: owns state, executes commands, runs subsystems in a FROZEN
 * order every tick. SIGNATURES ARE FROZEN. Body implemented in TASKS.md **T3**
 * (with subsystem calls filled in by T4-T10).
 */

import type { Params } from './params'
import type { Sim, SimState, TechUnlocks } from './types'

/**
 * T3. Build the starting state from params.starting plus unlocks.startingCells
 * (starting cells all get pieceId 0, weldCount 0, full hp incl. unlocks.bonusHp)
 * and return a Sim whose step() follows the frozen subsystem order documented
 * in TASKS.md T3. All randomness from createPrng(seed) captured in the closure.
 */
export function createSim(params: Params, seed: number, unlocks: TechUnlocks): Sim {
  void params; void seed; void unlocks
  throw new Error('Not implemented - TASKS.md T3')
}

/**
 * T3. Stable, deterministic serialisation of the full sim state (Maps as
 * sorted-key arrays; number formatting untouched). Two states are equal iff
 * their snapshots are string-equal. Used by the determinism test and saves.
 */
export function snapshot(state: SimState): string {
  void state
  throw new Error('Not implemented - TASKS.md T3')
}
