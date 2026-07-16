/**
 * SHIPSHAPE - every tunable number in the game, in ONE flat object.
 *
 * ⛔ FROZEN STRUCTURE. The SHAPE of this object (fields, nesting, units) never
 * changes without a TASKS.md instruction. The VALUES may only be changed in
 * task T13 (balance tuning) - and only with `npm run balance` green afterwards.
 *
 * Units: seconds, per-second rates, scrap, grid units. NEVER per-tick values -
 * core code converts with TICKS_PER_SECOND. Rationale: humans and tuning
 * sweeps think in seconds.
 */

import type { BlockType, RockSize, TechUnlocks } from './types'

export interface BlockParams {
  hp: number
  costPerCell: number
}

export interface TurretParams {
  /** Damage per second while firing (dealt as one shot per cooldown). */
  dps: number
  /** Range in grid units, measured centre-to-centre. */
  range: number
  /** Seconds between shots. Damage per shot = dps * cooldown. */
  cooldown: number
  /** Exposed orthogonal edges required to operate (else mothballed). */
  requiredExposedEdges: number
}

export interface RockParams {
  /** Scrap value if fully carved into chunks. */
  value: number
  hp: number
  /** Damage dealt to the ship cell it hits. */
  damage: number
  /** Speed toward the ship, grid units per second. */
  speed: number
  /** Relative spawn weight within the pressure budget. */
  weight: number
  /** Pressure cost to spawn one (spawner spends its budget on these). */
  pressureCost: number
}

export interface Params {
  starting: {
    scrap: number
    /** The run-1 ship. Core MUST be exactly the four cells (0,0)(1,0)(0,1)(1,1). */
    cells: { type: BlockType; x: number; y: number }[]
  }

  blocks: Record<BlockType, BlockParams>

  turrets: {
    laser: TurretParams & { instantScrapFraction: number } // vaporise: fraction of rock value as instant scrap
    harvester: TurretParams // carve: rock value spawns as chunks
    cannon: TurretParams // vaporises like laser (same instantScrapFraction)
  }

  weld: {
    /** Output multiplier gained per welded edge (applies to every cell of the piece). */
    outputPerEdge: number
    /** Max-HP added per welded edge (applies to every cell of the piece). */
    hpPerEdge: number
  }

  synergy: {
    /** Reactor ▸ orthogonal neighbour output bonus (non-stacking: max one reactor counts). */
    reactorOutput: number
    /** Tractor ▸ Refinery: chunk value bonus when collector tractor is orthogonally adjacent to any refinery. */
    tractorRefineryYield: number
    /** Laser ▸ Laser: fire-rate bonus per orthogonally adjacent laser. */
    laserAdjacency: number
    laserAdjacencyCap: number
    /** Cannon ▸ Hull: +range per orthogonally adjacent hull cell. */
    cannonHullRange: number
    cannonHullRangeCap: number
  }

  economy: {
    /** Seconds an uncollected chunk survives. */
    chunkExpiry: number
    /** Chunks fly at this many grid units/second when pulled. */
    chunkPullSpeed: number
    /** Each chunk carries this much value; a carved rock spawns ceil(value/chunkValue) chunks. */
    chunkValue: number
    tractorRange: number
    coreTractorRange: number
    /** Seconds for a Refinery block to refine one chunk. */
    refinerySecondsPerChunk: number
    /** Seconds for the Core's built-in refinery to refine one chunk. */
    coreSecondsPerChunk: number
  }

  rocks: Record<RockSize, RockParams> & {
    /** Large rocks split into this many mediums when destroyed by anything. */
    largeSplitsInto: number
    /** Rocks spawn this far beyond the ship's bounding radius. */
    spawnDistance: number
  }

  pressure: {
    /** Budget per second = base + perMass * shipMass, all times lure. */
    base: number
    perMass: number
  }

  lure: { min: number; max: number; start: number }

  wave: {
    /** Seconds per wave. */
    length: number
    /** Final fraction of each wave with reduced pressure (the lull). */
    lullFraction: number
    /** Pressure multiplier during the lull. */
    lullMultiplier: number
  }

  tray: {
    /** Seconds between automatic tray refreshes. */
    refreshEvery: number
    rerollBaseCost: number
    /** Added to reroll cost per reroll already used this wave. */
    rerollCostIncrement: number
  }

  repair: {
    /** HP per second regained by damaged SEALED cells. */
    sealedHpPerSecond: number
    /** Seconds for an enclosed empty cell to be plated into a fresh Hull cell. */
    nanitePlateSeconds: number
  }

  veterancy: {
    lv2Xp: number
    lv3Xp: number
    lv2Bonus: number // output multiplier bonus at level 2
    lv3Bonus: number // output multiplier bonus at level 3 (replaces, not adds to, lv2)
  }

  reactor: { explosionDamage: number } // dealt to all 8 neighbours on death

  demolishRefundFraction: number

  tp: { massDivisor: number }
}

export const DEFAULT_PARAMS: Params = {
  starting: {
    scrap: 30,
    cells: [
      { type: 'core', x: 0, y: 0 },
      { type: 'core', x: 1, y: 0 },
      { type: 'core', x: 0, y: 1 },
      { type: 'core', x: 1, y: 1 },
      { type: 'hull', x: -1, y: 0 },
      { type: 'hull', x: -1, y: 1 },
      { type: 'hull', x: 2, y: 0 },
      { type: 'hull', x: 2, y: 1 },
      { type: 'laser', x: 0, y: -1 },
      { type: 'laser', x: 1, y: -1 },
      { type: 'harvester', x: 0, y: 2 },
      { type: 'harvester', x: 1, y: 2 },
    ],
  },

  blocks: {
    core: { hp: 50, costPerCell: 0 },
    hull: { hp: 30, costPerCell: 2 },
    laser: { hp: 12, costPerCell: 4 },
    harvester: { hp: 12, costPerCell: 4 },
    cannon: { hp: 14, costPerCell: 7 },
    tractor: { hp: 10, costPerCell: 4 },
    refinery: { hp: 10, costPerCell: 5 },
    reactor: { hp: 8, costPerCell: 8 },
  },

  turrets: {
    laser: { dps: 1, range: 6, cooldown: 1, requiredExposedEdges: 1, instantScrapFraction: 0.25 },
    harvester: { dps: 0.5, range: 4, cooldown: 1, requiredExposedEdges: 1 },
    cannon: { dps: 3, range: 8, cooldown: 3, requiredExposedEdges: 2 },
  },

  weld: { outputPerEdge: 0.03, hpPerEdge: 3 },

  synergy: {
    reactorOutput: 0.5,
    tractorRefineryYield: 0.2,
    laserAdjacency: 0.1,
    laserAdjacencyCap: 0.3,
    cannonHullRange: 1,
    cannonHullRangeCap: 2,
  },

  economy: {
    chunkExpiry: 20,
    chunkPullSpeed: 6,
    chunkValue: 5,
    tractorRange: 5,
    coreTractorRange: 4,
    refinerySecondsPerChunk: 2,
    coreSecondsPerChunk: 4,
  },

  rocks: {
    small: { value: 5, hp: 3, damage: 5, speed: 1.5, weight: 6, pressureCost: 1 },
    medium: { value: 15, hp: 10, damage: 15, speed: 1.1, weight: 3, pressureCost: 3 },
    large: { value: 40, hp: 30, damage: 40, speed: 0.8, weight: 1, pressureCost: 8 },
    largeSplitsInto: 2,
    spawnDistance: 20,
  },

  pressure: { base: 0.8, perMass: 0.02 },

  lure: { min: 0.5, max: 2, start: 1 },

  wave: { length: 120, lullFraction: 0.15, lullMultiplier: 0.25 },

  tray: { refreshEvery: 25, rerollBaseCost: 5, rerollCostIncrement: 5 },

  repair: { sealedHpPerSecond: 1, nanitePlateSeconds: 30 },

  veterancy: { lv2Xp: 20, lv3Xp: 100, lv2Bonus: 0.3, lv3Bonus: 0.6 },

  reactor: { explosionDamage: 15 },

  demolishRefundFraction: 0.5,

  tp: { massDivisor: 10 },
}

/** Run-1 unlock state: what a brand-new player has. */
export const BASE_UNLOCKS: TechUnlocks = {
  blocks: ['hull', 'laser', 'harvester'],
  shapes: ['D2', 'I3', 'L3', 'O4', 'L4'],
  rotation: false,
  traySlots: 3,
  rerollCostMult: 1,
  bonusHp: 0,
  startingCells: [],
}

/** Everything unlocked - what the harness uses unless a policy says otherwise. */
export const ALL_UNLOCKS: TechUnlocks = {
  blocks: ['hull', 'laser', 'harvester', 'cannon', 'tractor', 'refinery', 'reactor'],
  shapes: ['D2', 'I3', 'L3', 'O4', 'L4', 'J4', 'S4', 'Z4', 'T4', 'I4', 'U5', 'P5', 'W5'],
  rotation: true,
  traySlots: 3,
  rerollCostMult: 1,
  bonusHp: 0,
  startingCells: [],
}
