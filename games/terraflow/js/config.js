// Terraflow - all tunables and content live here. Balance by editing this file only.
// V2 (SPEC decisions 27-32): the mural is gone; the upgrade tree IS the game.
// The player pins any upgrade as their goal, the Vat tints with the paint it
// needs, and everything structural (springs, slots, recipes, pipes) is an
// upgrade in one catalogue. Mixing is deliberately expensive.

const PAINTS = {
  R:  { name: 'Red',         color: '#ff5a5a' },
  Y:  { name: 'Yellow',      color: '#ffd23f' },
  B:  { name: 'Blue',        color: '#5b8dff' },
  OR: { name: 'Orange',      color: '#ff9838' },
  G:  { name: 'Green',       color: '#43d17c' },
  P:  { name: 'Purple',      color: '#b06cff' },
  LG: { name: 'Light green', color: '#b8e356' },
  T:  { name: 'Teal',        color: '#3fd4d4' },
};

// ratios[k] = inputs at ratio-upgrade level k (track 'ratio-<id>').
// unlock = the track that puts the recipe in the slot menu.
const RECIPES = {
  orange: { id: 'orange', out: 'OR', baseRate: 0.5, unlock: 'mixer1',
            ratios: [{ R: 6, Y: 6 }, { R: 5, Y: 5 }, { R: 4, Y: 4 }, { R: 3, Y: 3 }] },
  green:  { id: 'green',  out: 'G',  baseRate: 0.5, unlock: 'green',
            ratios: [{ Y: 6, B: 6 }, { Y: 5, B: 5 }, { Y: 4, B: 4 }, { Y: 3, B: 3 }] },
  purple: { id: 'purple', out: 'P',  baseRate: 0.5, unlock: 'purple',
            ratios: [{ R: 6, B: 6 }, { R: 5, B: 5 }, { R: 4, B: 4 }, { R: 3, B: 3 }] },
  lgreen: { id: 'lgreen', out: 'LG', baseRate: 0.5, unlock: 'lgreen',
            ratios: [{ Y: 9, B: 3 }, { Y: 6, B: 2 }, { Y: 3, B: 1 }] },
  teal:   { id: 'teal',   out: 'T',  baseRate: 0.5, unlock: 'teal',
            ratios: [{ G: 4, B: 4 }, { G: 3, B: 3 }, { G: 2, B: 2 }] },
};

// THE CATALOGUE. Every track: {id, cat, name, desc, max, tiers, requires?,
// grantPipes?}. Cost at level L uses the last tier with at <= L, scaled by
// growth^(L - at). requires = track ids that must be owned (level >= 1) before
// this row appears. grantPipes is granted on EVERY level bought.
// ~93 purchasable steps across 22 tracks.
const TRACKS = [
  // --- unlocks: everything structural is an upgrade ---------------------------
  { id: 'y-spring', cat: 'unlock', name: 'Yellow spring', desc: 'A second pigment surfaces (+1 pipe)',
    max: 1, grantPipes: 1, tiers: [{ at: 0, cost: { R: 10 } }] },
  { id: 'mixer1', cat: 'unlock', name: 'Mixer + orange', desc: 'A mixer slot; orange = red + yellow (+3 pipes)',
    max: 1, grantPipes: 3, requires: ['y-spring'], tiers: [{ at: 0, cost: { R: 25, Y: 25 } }] },
  { id: 'b-spring', cat: 'unlock', name: 'Blue spring', desc: 'The third primary (+1 pipe)',
    max: 1, grantPipes: 1, requires: ['mixer1'], tiers: [{ at: 0, cost: { OR: 8 } }] },
  { id: 'green', cat: 'unlock', name: 'Green mix', desc: 'Green = yellow + blue (+1 pipe)',
    max: 1, grantPipes: 1, requires: ['b-spring'], tiers: [{ at: 0, cost: { Y: 30, B: 30 } }] },
  { id: 'purple', cat: 'unlock', name: 'Purple mix', desc: 'Purple = red + blue (+1 pipe)',
    max: 1, grantPipes: 1, requires: ['b-spring'], tiers: [{ at: 0, cost: { R: 30, B: 30 } }] },
  { id: 'mixer2', cat: 'unlock', name: 'Second mixer', desc: 'Run two mixes at once (+2 pipes)',
    max: 1, grantPipes: 2, requires: ['green'], tiers: [{ at: 0, cost: { OR: 12, G: 12 } }] },
  { id: 'lgreen', cat: 'unlock', name: 'Light green mix', desc: '3 yellow + 1 blue - it drinks yellow (+1 pipe)',
    max: 1, grantPipes: 1, requires: ['mixer2'], tiers: [{ at: 0, cost: { G: 25 } }] },
  { id: 'mixer3', cat: 'unlock', name: 'Third mixer', desc: 'The full workshop (+2 pipes)',
    max: 1, grantPipes: 2, requires: ['purple', 'lgreen'], tiers: [{ at: 0, cost: { G: 16, P: 16 } }] },
  { id: 'teal', cat: 'unlock', name: 'Teal mix', desc: 'Green + blue - a mix of a mix (+1 pipe)',
    max: 1, grantPipes: 1, requires: ['mixer3'], tiers: [{ at: 0, cost: { LG: 15, P: 15 } }] },
  { id: 'opus', cat: 'unlock', name: 'Magnum opus', desc: 'Pour everything in - the machine’s final form',
    max: 1, requires: ['teal'], tiers: [{ at: 0, cost: { OR: 40, G: 40, P: 40, LG: 30, T: 25 } }] },

  // --- production: per-colour seep rates (pick which colour to back) ----------
  { id: 'rate-R', cat: 'production', name: 'Red seep', desc: 'Red spring produces faster',
    max: 12, tiers: [{ at: 0, cost: { R: 12 }, growth: 1.5 }, { at: 4, cost: { OR: 8 }, growth: 1.5 }, { at: 8, cost: { P: 10 }, growth: 1.6 }] },
  { id: 'rate-Y', cat: 'production', name: 'Yellow seep', desc: 'Yellow spring produces faster',
    max: 12, requires: ['y-spring'], tiers: [{ at: 0, cost: { Y: 12 }, growth: 1.5 }, { at: 4, cost: { OR: 8 }, growth: 1.5 }, { at: 8, cost: { LG: 10 }, growth: 1.6 }] },
  { id: 'rate-B', cat: 'production', name: 'Blue seep', desc: 'Blue spring produces faster',
    max: 12, requires: ['b-spring'], tiers: [{ at: 0, cost: { B: 12 }, growth: 1.5 }, { at: 4, cost: { G: 8 }, growth: 1.5 }, { at: 8, cost: { T: 10 }, growth: 1.6 }] },

  // --- network: pipes stay precious --------------------------------------------
  { id: 'pipe', cat: 'network', name: '+1 pipe', desc: 'One more pipe to draw',
    max: 12, grantPipes: 1, requires: ['y-spring'],
    tiers: [{ at: 0, cost: { R: 20, Y: 20 }, growth: 1.6 }, { at: 6, cost: { OR: 20, G: 20 }, growth: 1.6 }] },
  { id: 'flow', cat: 'network', name: 'Flow speed', desc: 'All pipes move faster',
    max: 10, tiers: [{ at: 0, cost: { R: 15 }, growth: 1.55 }, { at: 4, cost: { G: 8 }, growth: 1.55 }, { at: 8, cost: { T: 10 }, growth: 1.6 }] },
  { id: 'lanecap', cat: 'network', name: 'Lane cap', desc: 'Pipes can hold more parallel lanes',
    max: 2, requires: ['mixer2'], tiers: [{ at: 0, cost: { G: 25 } }, { at: 1, cost: { T: 25 } }] },

  // --- mixing: speed + per-recipe ratio upgrades --------------------------------
  { id: 'mixspeed', cat: 'mixing', name: 'Mixer speed', desc: 'All mixers blend faster',
    max: 10, requires: ['mixer1'], tiers: [{ at: 0, cost: { OR: 6 }, growth: 1.6 }, { at: 5, cost: { P: 8 }, growth: 1.6 }] },
  { id: 'ratio-orange', cat: 'mixing', name: 'Orange ratio', desc: 'Orange needs less red + yellow',
    max: 3, requires: ['mixer1'], tiers: [{ at: 0, cost: { OR: 10 }, growth: 1.8 }] },
  { id: 'ratio-green', cat: 'mixing', name: 'Green ratio', desc: 'Green needs less yellow + blue',
    max: 3, requires: ['green'], tiers: [{ at: 0, cost: { G: 10 }, growth: 1.8 }] },
  { id: 'ratio-purple', cat: 'mixing', name: 'Purple ratio', desc: 'Purple needs less red + blue',
    max: 3, requires: ['purple'], tiers: [{ at: 0, cost: { P: 10 }, growth: 1.8 }] },
  { id: 'ratio-lgreen', cat: 'mixing', name: 'Light green ratio', desc: 'Same 3:1 blend, smaller batches',
    max: 2, requires: ['lgreen'], tiers: [{ at: 0, cost: { LG: 8 }, growth: 2 }] },
  { id: 'ratio-teal', cat: 'mixing', name: 'Teal ratio', desc: 'Teal needs less green + blue',
    max: 2, requires: ['teal'], tiers: [{ at: 0, cost: { T: 8 }, growth: 2 }] },
];

const TRACK_CATS = [
  { id: 'unlock', label: 'Unlocks' },
  { id: 'production', label: 'Production' },
  { id: 'network', label: 'Network' },
  { id: 'mixing', label: 'Mixing' },
];

const CONFIG = {
  colors: {
    bg: '#0f1218', ink: '#e8ecf2', dim: '#8a93a6',
    slot: '#5a6577', bad: '#ff5d5d', good: '#5fd68a', pin: '#9aa7ff',
  },

  // geometry
  spacing: 15,        // min px between particles = queue slot size
  particleR: 4.5,
  nodeR: 17,
  hubR: 24,
  hitR: 36,           // touch hit radius for nodes
  pipeHitR: 22,
  laneOffset: 7,      // px between parallel lanes
  portSpread: 11,     // px between pipe endpoints sharing a node
  baseMaxLanes: 3,    // + lanecap track level
  topPad: 120,        // status strip + goal chip
  bottomPad: 92,      // sheet handle

  // rates - deliberately slow start (playtest: early dots should be watchable)
  baseFlowSpeed: 55,      // px/s
  baseSourceRate: 0.6,    // units/s per spring
  streakSpeed: 140,       // px/s above which dots render as streaks
  stubCapMult: 3,         // mixer input buffer = ratio * this
  outBufCap: 3,

  // upgrade effect multipliers, per level
  flowMult: 1.22,
  rateMult: 1.3,
  mixMult: 1.28,

  // pipes are precious (decisions 17, 30): start with ONE
  pipeStockStart: 1,

  // per-pipe lane upgrade (the only local upgrade - it's a spatial decision)
  laneCost: { OR: 15 }, laneCostGrowth: 2,

  autosaveSec: 10,
  saveKey: 'terraflow_v4',
};

// Map nodes: fx/fy are fractions of the playfield. gate = track id that must be
// owned before the node spawns. kind 'hub' = the Vat (internal name from v1.1).
const NODE_DEFS = [
  { id: 'hub',   kind: 'hub',                   fx: 0.78, fy: 0.70 },
  { id: 'srcR',  kind: 'source', element: 'R',  fx: 0.22, fy: 0.16 },
  { id: 'srcY',  kind: 'source', element: 'Y',  fx: 0.14, fy: 0.46, gate: 'y-spring' },
  { id: 'srcB',  kind: 'source', element: 'B',  fx: 0.28, fy: 0.86, gate: 'b-spring' },
  { id: 'slot1', kind: 'slot',                  fx: 0.54, fy: 0.58, gate: 'mixer1' },
  { id: 'slot2', kind: 'slot',                  fx: 0.40, fy: 0.34, gate: 'mixer2' },
  { id: 'slot3', kind: 'slot',                  fx: 0.66, fy: 0.30, gate: 'mixer3' },
];

// Contextual one-line hints; when() gates, shown once each, in order.
const HINTS = [
  { id: 'draw',  when: () => true,                        text: 'Drag from the spring ● to the Vat' },
  { id: 'goal',  when: () => Sim.lifetime.R >= 4,         text: 'The Vat ring is your goal - swipe up for more upgrades' },
  { id: 'slot',  when: () => trackLevel('mixer1') >= 1,   text: 'Tap the dashed slot to build the mixer' },
  { id: 'swap',  when: () => trackLevel('green') >= 1,    text: 'Tap a mixer to swap its recipe' },
  { id: 'lanes', when: () => trackLevel('mixer2') >= 1,   text: 'Tap a pipe to add a parallel lane' },
];
