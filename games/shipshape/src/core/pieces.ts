/**
 * Placement legality, weld counting, placement/demolish application.
 * SIGNATURES ARE FROZEN. Bodies implemented in TASKS.md **T2**.
 */

import type { Params } from './params'
import type { Cell, PlaceRejectReason, Rotation, SimEvent, SimState, TechUnlocks, TrayOffer, Vec2 } from './types'

export type PlaceCheck =
  | { ok: true; cells: Vec2[]; weldCount: number; cost: number }
  | { ok: false; reason: PlaceRejectReason }

/**
 * T2. Pure legality + weld check. Rules, in this exact precedence order
 * (first failure wins):
 *   1. 'bad-tray-slot'    - offer is null/undefined
 *   2. 'rotation-locked'  - rotation !== offer.orientation and !unlocks.rotation
 *   3. 'occupied'         - any target cell already in `cells`
 *   4. 'not-adjacent'     - no target cell has an orthogonal neighbour in `cells`
 *   5. 'unaffordable'     - scrap < offer.cost
 * weldCount = number of (targetCell, existingCell) orthogonally-adjacent PAIRS.
 * Diagonals never count. Two target cells of the same piece never count.
 */
export function checkPlacement(args: {
  cells: ReadonlyMap<string, Cell>
  scrap: number
  offer: TrayOffer | null | undefined
  unlocks: TechUnlocks
  x: number
  y: number
  rotation: Rotation
}): PlaceCheck {
  void args
  throw new Error('Not implemented - TASKS.md T2')
}

/**
 * T2. Apply a checked-ok placement: create cells (hp = maxHp =
 * blocks[type].hp + unlocks.bonusHp + weldCount * weld.hpPerEdge, xp = 0,
 * pieceId = state.nextId++), deduct scrap, clear the tray slot, update
 * stats.piecesPlaced / stats.weldEdgesTotal / stats.scrapSpent / peakMass.
 * Returns the 'placed' event. Enclosure changes ('sealed' events) are the
 * sim shell's job (T3), not this function's.
 */
export function applyPlacement(
  state: SimState,
  params: Params,
  unlocks: TechUnlocks,
  check: Extract<PlaceCheck, { ok: true }>,
  offer: TrayOffer,
  trayIndex: number,
): SimEvent {
  void state; void params; void unlocks; void check; void offer; void trayIndex
  throw new Error('Not implemented - TASKS.md T2')
}

/**
 * T2. Demolish the ENTIRE PIECE containing (x, y) (all surviving cells with
 * the same pieceId). Core cells can never be demolished. Refund =
 * floor(sum of costPerCell over removed cells * demolishRefundFraction).
 * Returns 'demolished', or null if there is no demolishable cell at (x, y).
 */
export function applyDemolish(state: SimState, params: Params, x: number, y: number): SimEvent | null {
  void state; void params; void x; void y
  throw new Error('Not implemented - TASKS.md T2')
}
