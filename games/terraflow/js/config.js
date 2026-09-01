// Terraflow - all tunables and content live here. Balance by editing this file only.
// V3 (SPEC decisions 33-38, from Will's prompt 7): light green is cut (7 paints),
// ratio tracks extend into OUTPUT MULTIPLIERS (6+6->1 all the way to 1+1->4),
// twin springs double each primary late (the map keeps changing), pipes are the
// chronic bottleneck (seep rates outgrow lane throughput), and the cost curve is
// retuned for a steady purchase cadence with no late plateau.

const PAINTS = {
  R:  { name: 'Red',    color: '#ff5a5a' },
  Y:  { name: 'Yellow', color: '#ffd23f' },
  B:  { name: 'Blue',   color: '#5b8dff' },
  OR: { name: 'Orange', color: '#ff9838' },
  G:  { name: 'Green',  color: '#43d17c' },
  P:  { name: 'Purple', color: '#b06cff' },
  T:  { name: 'Teal',   color: '#3fd4d4' },
};

// ratios[k] = recipe at yield-upgrade level k: {in, out}. The ladder first
// shrinks the batch, then MULTIPLIES the output - the endgame mixers are paint
// amplifiers (1 red + 1 yellow -> 4 orange). unlock = the track that puts the
// recipe in the slot menu.
const RECIPES = {
  orange: { id: 'orange', out: 'OR', baseRate: 0.5, unlock: 'mixer1', ratios: [
    { in: { R: 6, Y: 6 }, out: 1 }, { in: { R: 4, Y: 4 }, out: 1 },
    { in: { R: 3, Y: 3 }, out: 1 }, { in: { R: 2, Y: 2 }, out: 1 },
    { in: { R: 2, Y: 2 }, out: 2 }, { in: { R: 1, Y: 1 }, out: 2 },
    { in: { R: 1, Y: 1 }, out: 4 } ] },
  green:  { id: 'green',  out: 'G',  baseRate: 0.5, unlock: 'green', ratios: [
    { in: { Y: 6, B: 6 }, out: 1 }, { in: { Y: 4, B: 4 }, out: 1 },
    { in: { Y: 3, B: 3 }, out: 1 }, { in: { Y: 2, B: 2 }, out: 1 },
    { in: { Y: 2, B: 2 }, out: 2 }, { in: { Y: 1, B: 1 }, out: 2 },
    { in: { Y: 1, B: 1 }, out: 4 } ] },
  purple: { id: 'purple', out: 'P',  baseRate: 0.5, unlock: 'purple', ratios: [
    { in: { R: 6, B: 6 }, out: 1 }, { in: { R: 4, B: 4 }, out: 1 },
    { in: { R: 3, B: 3 }, out: 1 }, { in: { R: 2, B: 2 }, out: 1 },
    { in: { R: 2, B: 2 }, out: 2 }, { in: { R: 1, B: 1 }, out: 2 },
    { in: { R: 1, B: 1 }, out: 4 } ] },
  teal:   { id: 'teal',   out: 'T',  baseRate: 0.5, unlock: 'teal', ratios: [
    { in: { G: 4, B: 4 }, out: 1 }, { in: { G: 3, B: 3 }, out: 1 },
    { in: { G: 2, B: 2 }, out: 1 }, { in: { G: 2, B: 2 }, out: 2 },
    { in: { G: 1, B: 1 }, out: 2 }, { in: { G: 1, B: 1 }, out: 4 } ] },
};

// THE CATALOGUE. Every track: {id, cat, name, desc, max, tiers, requires?,
// grantPipes?}. Cost at level L uses the last tier with at <= L, scaled by
// growth^(L - at). requires = track ids that must be owned (level >= 1) before
// this row appears. grantPipes is granted on EVERY level bought.
// ~110 purchasable steps across 24 tracks.
const TRACKS = [
  // --- unlocks: everything structural is an upgrade ---------------------------
  { id: 'y-spring', cat: 'unlock', name: 'Yellow spring', desc: 'A second pigment surfaces (+1 pipe)',
    max: 1, grantPipes: 1, tiers: [{ at: 0, cost: { R: 10 } }] },
  { id: 'mixer1', cat: 'unlock', name: 'Mixer + orange', desc: 'A mixer slot; orange = red + yellow (+3 pipes)',
    max: 1, grantPipes: 3, requires: ['y-spring'], tiers: [{ at: 0, cost: { R: 25, Y: 25 } }] },
  { id: 'b-spring', cat: 'unlock', name: 'Blue spring', desc: 'The third primary (+1 pipe)',
    max: 1, grantPipes: 1, requires: ['mixer1'], tiers: [{ at: 0, cost: { OR: 6 } }] },
  { id: 'green', cat: 'unlock', name: 'Green mix', desc: 'Green = yellow + blue (+1 pipe)',
    max: 1, grantPipes: 1, requires: ['b-spring'], tiers: [{ at: 0, cost: { Y: 30, B: 30 } }] },
  { id: 'purple', cat: 'unlock', name: 'Purple mix', desc: 'Purple = red + blue (+1 pipe)',
    max: 1, grantPipes: 1, requires: ['b-spring'], tiers: [{ at: 0, cost: { R: 35, B: 35 } }] },
  { id: 'mixer2', cat: 'unlock', name: 'Second mixer', desc: 'Run two mixes at once (+2 pipes)',
    max: 1, grantPipes: 2, requires: ['green'], tiers: [{ at: 0, cost: { OR: 8, G: 6 } }] },
  { id: 'r-spring2', cat: 'unlock', name: 'Twin red spring', desc: 'A second red spring erupts (+1 pipe)',
    max: 1, grantPipes: 1, requires: ['mixer2'], tiers: [{ at: 0, cost: { OR: 14, G: 8 } }] },
  { id: 'mixer3', cat: 'unlock', name: 'Third mixer', desc: 'The full workshop (+2 pipes)',
    max: 1, grantPipes: 2, requires: ['purple', 'mixer2'], tiers: [{ at: 0, cost: { G: 10, P: 10 } }] },
  { id: 'y-spring2', cat: 'unlock', name: 'Twin yellow spring', desc: 'A second yellow spring erupts (+1 pipe)',
    max: 1, grantPipes: 1, requires: ['mixer3'], tiers: [{ at: 0, cost: { OR: 30, P: 15 } }] },
  { id: 'teal', cat: 'unlock', name: 'Teal mix', desc: 'Green + blue - a mix of a mix (+1 pipe)',
    max: 1, grantPipes: 1, requires: ['mixer3'], tiers: [{ at: 0, cost: { G: 18, P: 18 } }] },
  { id: 'b-spring2', cat: 'unlock', name: 'Twin blue spring', desc: 'A second blue spring erupts (+1 pipe)',
    max: 1, grantPipes: 1, requires: ['teal'], tiers: [{ at: 0, cost: { T: 8, G: 14 } }] },
  { id: 'opus', cat: 'unlock', name: 'Magnum opus', desc: 'Pour everything in - the machine’s final form',
    max: 1, requires: ['teal'], tiers: [{ at: 0, cost: { OR: 2500, G: 2500, P: 1800, T: 1200 } }] },

  // --- production: per-colour seep rates (both twin springs share the track) ---
  { id: 'rate-R', cat: 'production', name: 'Red seep', desc: 'Red springs produce faster',
    max: 12, tiers: [{ at: 0, cost: { R: 12 }, growth: 1.42 }, { at: 4, cost: { OR: 10 }, growth: 1.42 }, { at: 8, cost: { P: 12, OR: 24 }, growth: 1.5 }] },
  { id: 'rate-Y', cat: 'production', name: 'Yellow seep', desc: 'Yellow springs produce faster',
    max: 12, requires: ['y-spring'], tiers: [{ at: 0, cost: { Y: 12 }, growth: 1.42 }, { at: 4, cost: { G: 10 }, growth: 1.42 }, { at: 8, cost: { OR: 16, G: 16 }, growth: 1.5 }] },
  { id: 'rate-B', cat: 'production', name: 'Blue seep', desc: 'Blue springs produce faster',
    max: 12, requires: ['b-spring'], tiers: [{ at: 0, cost: { B: 12 }, growth: 1.42 }, { at: 4, cost: { G: 10 }, growth: 1.42 }, { at: 8, cost: { T: 12, P: 16 }, growth: 1.5 }] },

  // --- network: pipes stay precious and CHRONICALLY tight ----------------------
  { id: 'pipe', cat: 'network', name: '+1 pipe', desc: 'One more pipe to draw',
    max: 12, grantPipes: 1, requires: ['y-spring'],
    tiers: [{ at: 0, cost: { R: 20, Y: 20 }, growth: 1.45 }, { at: 6, cost: { OR: 20, P: 12 }, growth: 1.45 }] },
  { id: 'flow', cat: 'network', name: 'Flow speed', desc: 'All pipes move faster',
    max: 12, tiers: [{ at: 0, cost: { R: 15 }, growth: 1.4 }, { at: 4, cost: { G: 12 }, growth: 1.4 }, { at: 8, cost: { T: 10, OR: 20 }, growth: 1.5 }] },
  { id: 'lanecap', cat: 'network', name: 'Lane cap', desc: 'Pipes can hold more parallel lanes',
    max: 3, requires: ['mixer2'], tiers: [{ at: 0, cost: { G: 25 } }, { at: 1, cost: { P: 45 } }, { at: 2, cost: { T: 45 } }] },

  // --- mixing: speed + per-recipe yield ladders (the bonkers lever) -------------
  { id: 'mixspeed', cat: 'mixing', name: 'Mixer speed', desc: 'All mixers blend faster',
    max: 12, requires: ['mixer1'], tiers: [{ at: 0, cost: { OR: 6 }, growth: 1.4 }, { at: 6, cost: { P: 10 }, growth: 1.4 }, { at: 10, cost: { T: 14 }, growth: 1.5 }] },
  { id: 'ratio-orange', cat: 'mixing', name: 'Orange yield', desc: 'Smaller batches, then ×2 / ×4 output',
    max: 6, requires: ['mixer1'], tiers: [{ at: 0, cost: { OR: 10 }, growth: 1.7 }, { at: 3, cost: { OR: 90 }, growth: 2.2 }] },
  { id: 'ratio-green', cat: 'mixing', name: 'Green yield', desc: 'Smaller batches, then ×2 / ×4 output',
    max: 6, requires: ['green'], tiers: [{ at: 0, cost: { G: 10 }, growth: 1.7 }, { at: 3, cost: { G: 90 }, growth: 2.2 }] },
  { id: 'ratio-purple', cat: 'mixing', name: 'Purple yield', desc: 'Smaller batches, then ×2 / ×4 output',
    max: 6, requires: ['purple'], tiers: [{ at: 0, cost: { P: 10 }, growth: 1.7 }, { at: 3, cost: { P: 90 }, growth: 2.2 }] },
  { id: 'ratio-teal', cat: 'mixing', name: 'Teal yield', desc: 'Smaller batches, then ×2 / ×4 output',
    max: 5, requires: ['teal'], tiers: [{ at: 0, cost: { T: 8 }, growth: 1.8 }, { at: 3, cost: { T: 70 }, growth: 2.2 }] },
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

  // rates - slow start, then seep rates OUTGROW pipe throughput so pipes jam
  // and lanes/flow/routing stay under pressure all game (prompt 7)
  baseFlowSpeed: 55,      // px/s; throughput per lane = speed / spacing
  baseSourceRate: 0.6,    // units/s per spring
  streakSpeed: 140,       // px/s above which dots render as streaks
  stubCapMult: 3,         // mixer input buffer = ratio * this
  outBufCap: 3,           // min output buffer; scales with recipe out count

  // upgrade effect multipliers, per level
  flowMult: 1.17,
  rateMult: 1.42,
  mixMult: 1.3,

  // pipes are precious (decisions 17, 30): start with ONE
  pipeStockStart: 1,

  // per-pipe lane upgrade (the only local upgrade - it's a spatial decision);
  // cheap-ish and frequent: lanes are the constant pressure valve
  laneCost: { OR: 8 }, laneCostGrowth: 1.7,

  autosaveSec: 10,
  saveKey: 'terraflow_v5',
};

// Map nodes: fx/fy are fractions of the playfield. gate = track id that must be
// owned before the node spawns. kind 'hub' = the Vat (internal name from v1.1).
const NODE_DEFS = [
  { id: 'hub',   kind: 'hub',                   fx: 0.78, fy: 0.70 },
  { id: 'srcR',  kind: 'source', element: 'R',  fx: 0.22, fy: 0.16 },
  { id: 'srcY',  kind: 'source', element: 'Y',  fx: 0.14, fy: 0.46, gate: 'y-spring' },
  { id: 'srcB',  kind: 'source', element: 'B',  fx: 0.28, fy: 0.86, gate: 'b-spring' },
  { id: 'srcR2', kind: 'source', element: 'R',  fx: 0.84, fy: 0.12, gate: 'r-spring2' },
  { id: 'srcY2', kind: 'source', element: 'Y',  fx: 0.50, fy: 0.90, gate: 'y-spring2' },
  { id: 'srcB2', kind: 'source', element: 'B',  fx: 0.90, fy: 0.44, gate: 'b-spring2' },
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
