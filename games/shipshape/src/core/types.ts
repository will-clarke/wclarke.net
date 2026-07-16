/**
 * SHIPSHAPE - core type contracts.
 *
 * ⛔ FROZEN CONTRACT FILE. Do not change any existing type, field, or signature.
 * You may ADD new event kinds or optional fields ONLY if a task in TASKS.md
 * explicitly says so. If a contract seems wrong, STOP: add a line to NOTES.md
 * under "Contract questions" and leave the code unimplemented.
 *
 * Conventions (also frozen):
 * - Grid: integer coordinates. +x is right, +y is DOWN (screen space).
 * - Cell keys: the string `${x},${y}` (see grid.ts key()).
 * - Time: the sim advances in fixed ticks of TICK_MS (100 ms). All Params are
 *   expressed in natural units (seconds, per-second, scrap); core code converts
 *   using TICK_MS. Never store per-tick values in params.ts.
 * - Randomness: ONLY via the Prng passed into createSim. Built-in random and
 *   wall-clock functions are forbidden in src/core (see tests/guardrails.test.ts).
 * - Positions of rocks/chunks are floats in grid units (cell (x,y) spans
 *   [x, x+1) × [y, y+1); its centre is (x+0.5, y+0.5)).
 */

export const TICK_MS = 100
export const TICKS_PER_SECOND = 10

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

export interface Vec2 {
  x: number
  y: number
}

/** 0 = as authored in shapes.ts, then 90° clockwise (screen space) per step. */
export type Rotation = 0 | 1 | 2 | 3

// ---------------------------------------------------------------------------
// Blocks & cells
// ---------------------------------------------------------------------------

export type BlockType =
  | 'core'
  | 'hull'
  | 'laser'
  | 'harvester'
  | 'cannon'
  | 'tractor'
  | 'refinery'
  | 'reactor'

export interface Cell {
  x: number
  y: number
  type: BlockType
  /** Current hit points. Cell is removed from the grid when hp <= 0. */
  hp: number
  /** blocks[type].hp + weldCount * weld.hpPerEdge. Never changes after placement. */
  maxHp: number
  /** Shared edges with pre-existing cells at placement time. Never changes. */
  weldCount: number
  /** Veterancy progress. See TASKS.md T9 for what earns XP per block type. */
  xp: number
  /** Placement id shared by all cells placed together (starting cells: piece 0). */
  pieceId: number
}

// ---------------------------------------------------------------------------
// World objects
// ---------------------------------------------------------------------------

export type RockSize = 'small' | 'medium' | 'large'

export interface Rock {
  id: number
  /** Centre position, floats, grid units. */
  x: number
  y: number
  /** Velocity in grid units per second. */
  vx: number
  vy: number
  size: RockSize
  hp: number
  /** Scrap value if fully carved. See params.rocks[size].value. */
  value: number
}

export interface Chunk {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  /** Scrap value when refined. */
  value: number
  /** Tick at which this chunk disappears if not collected. */
  expiresAtTick: number
  /**
   * True if the collecting tractor was orthogonally adjacent to a refinery
   * (Tractor ▸ Refinery synergy: value is multiplied on REFINE, not collect).
   */
  bonus: boolean
  /** Set when collected; chunk is then in the hopper awaiting refining. */
  collected: boolean
}

// ---------------------------------------------------------------------------
// Draft tray
// ---------------------------------------------------------------------------

export type ShapeId =
  | 'D2' // domino
  | 'I3' | 'L3' // trominoes
  | 'O4' | 'L4' | 'J4' | 'S4' | 'Z4' | 'T4' | 'I4' // tetrominoes
  | 'U5' | 'P5' | 'W5' // pentominoes

export interface TrayOffer {
  shape: ShapeId
  /** Fixed orientation this offer is presented in. */
  orientation: Rotation
  block: Exclude<BlockType, 'core'>
  /** Total scrap price: cellCount * params.blocks[block].costPerCell. */
  cost: number
}

// ---------------------------------------------------------------------------
// Player commands (the ONLY way anything outside core mutates the sim;
// the UI thumb and the harness bots both speak exactly this language)
// ---------------------------------------------------------------------------

export type Command =
  | {
      kind: 'place'
      trayIndex: number
      /**
       * Board position of the top-left of the oriented shape's bounding box.
       * Target cells = orientedCells(shape, rotation) each offset by (x, y).
       */
      x: number
      y: number
      /** Must equal the offer's orientation unless unlocks.rotation is true. */
      rotation: Rotation
    }
  | { kind: 'reroll' }
  | { kind: 'setLure'; value: number } // clamped to [params.lure.min, params.lure.max]
  | { kind: 'demolish'; x: number; y: number } // refund = floor(cellShare * demolishRefund)

// ---------------------------------------------------------------------------
// Events (emitted by sim.step; the UI renders juice from these, the harness
// derives metrics from these; neither ever inspects internals to detect them)
// ---------------------------------------------------------------------------

export type PlaceRejectReason =
  | 'bad-tray-slot' // trayIndex empty or out of range
  | 'occupied' // a target cell is already a ship cell
  | 'not-adjacent' // no target cell orthogonally touches the ship
  | 'unaffordable'
  | 'rotation-locked' // rotation !== offer.orientation without the Gyro unlock

export type SimEvent =
  | { kind: 'placed'; pieceId: number; block: BlockType; cells: Vec2[]; weldCount: number; cost: number }
  | { kind: 'placeRejected'; reason: PlaceRejectReason }
  | { kind: 'demolished'; cells: Vec2[]; refund: number }
  | { kind: 'trayRefreshed'; wasReroll: boolean }
  | { kind: 'waveStarted'; wave: number }
  | { kind: 'rockSpawned'; id: number; size: RockSize }
  | { kind: 'rockDestroyed'; id: number; by: 'laser' | 'harvester' | 'cannon' | 'impact'; scrapGained: number; chunksSpawned: number }
  | { kind: 'rockImpact'; id: number; cell: Vec2; damage: number }
  | { kind: 'cellDamaged'; cell: Vec2; amount: number }
  | { kind: 'cellDestroyed'; cell: Vec2; type: BlockType }
  | { kind: 'reactorExploded'; cell: Vec2 }
  | { kind: 'chunkCollected'; id: number; by: 'tractor' | 'core' }
  | { kind: 'chunkExpired'; id: number }
  | { kind: 'refined'; value: number }
  | { kind: 'sealed'; regionSize: number } // a new enclosed region appeared
  | { kind: 'breached'; cell: Vec2 } // a previously sealed region lost enclosure
  | { kind: 'nanitePlated'; cell: Vec2 }
  | { kind: 'levelUp'; cell: Vec2; level: 2 | 3 }
  | { kind: 'gameOver'; result: RunResult }

// ---------------------------------------------------------------------------
// Sim state & lifecycle
// ---------------------------------------------------------------------------

export interface TechUnlocks {
  /** Block types offerable in the tray ('core' never appears). */
  blocks: Exclude<BlockType, 'core'>[]
  shapes: ShapeId[]
  /** Gyro Servos: place commands may use any rotation. */
  rotation: boolean
  /** Number of tray slots (3 base, 4 with the tech node). */
  traySlots: number
  /** Multiplier on reroll prices (1 base; tech node lowers it). */
  rerollCostMult: number
  /** Flat HP added to every cell's base HP (Chassis tech). */
  bonusHp: number
  /** Extra cells added to the starting ship (Chassis tech; empty = none). */
  startingCells: { type: BlockType; x: number; y: number }[]
}

export interface RunStats {
  scrapEarned: number
  scrapSpent: number
  rocksDestroyed: number
  chunksCollected: number
  chunksExpired: number
  piecesPlaced: number
  weldEdgesTotal: number
  cellsLost: number
}

export interface RunResult {
  deathTick: number
  wavesSurvived: number
  peakMass: number
  techPoints: number // floor(peakMass / tp.massDivisor) + wavesSurvived
  stats: RunStats
}

export interface SimState {
  tick: number
  scrap: number
  lure: number
  /** 1-based; wave w spans ticks [(w-1)*waveLength, w*waveLength). */
  wave: number
  cells: Map<string, Cell>
  rocks: Rock[]
  chunks: Chunk[]
  tray: (TrayOffer | null)[]
  /** Tick at which the tray next auto-refreshes. */
  trayRefreshAtTick: number
  rerollsThisWave: number
  /** Uncredited refining progress in ticks, per TASKS.md T6. */
  hopper: Chunk[]
  peakMass: number
  gameOver: boolean
  result: RunResult | null
  stats: RunStats
  nextId: number // id source for rocks/chunks/pieces - NEVER generate ids any other way
}

export interface Sim {
  /** Mutable internally; everything outside src/core treats it as read-only. */
  readonly state: SimState
  /** Advance exactly one tick (TICK_MS of game time). Order is frozen in TASKS.md T3. */
  step(commands?: Command[]): SimEvent[]
}
