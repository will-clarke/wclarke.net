// Terraflow - all tunables and content live here. Balance by editing this file only.
// v1.2 paint pivot (SPEC decisions 22-26): pigments, mixers, the Vat, mural goals.
// A paint exists in the game only because the mural asks for it (demand-defined).

const PAINTS = {
  R:  { name: 'Red',         color: '#ff5a5a' },
  Y:  { name: 'Yellow',      color: '#ffd23f' },
  B:  { name: 'Blue',        color: '#5b8dff' },
  OR: { name: 'Orange',      color: '#ff9838' },
  G:  { name: 'Green',       color: '#43d17c' },
  LG: { name: 'Light green', color: '#b8e356' },
  T:  { name: 'Teal',        color: '#3fd4d4' },
};

// gate = goalIndex at which the mix appears in the slot menu
const RECIPES = {
  orange: { id: 'orange', out: 'OR', inputs: { R: 1, Y: 1 }, baseRate: 0.5, gate: 2 },
  green:  { id: 'green',  out: 'G',  inputs: { Y: 1, B: 1 }, baseRate: 0.5, gate: 4 },
  lgreen: { id: 'lgreen', out: 'LG', inputs: { Y: 3, B: 1 }, baseRate: 0.5, gate: 5 },
  teal:   { id: 'teal',   out: 'T',  inputs: { G: 1, B: 1 }, baseRate: 0.5, gate: 6 },
};

const CONFIG = {
  colors: {
    bg: '#0f1218', ink: '#e8ecf2', dim: '#8a93a6',
    slot: '#5a6577', bad: '#ff5d5d', good: '#5fd68a',
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
  maxLanes: 3,
  topPad: 148,        // status strip + mural board
  bottomPad: 92,      // sheet handle

  // mural board (top-left, px; goal chip DOM sits to its right)
  mural: { x: 18, y: 46, w: 150, h: 84 },

  // rates - deliberately slow start (playtest: early dots should be watchable)
  baseFlowSpeed: 55,      // px/s
  baseSourceRate: 0.5,    // units/s per spring
  streakSpeed: 140,       // px/s above which dots render as streaks
  stubCapMult: 3,         // mixer input buffer = ratio * this
  outBufCap: 3,

  // pipes are precious (decision 17)
  pipeStockStart: 3,

  // upgrades: cost = paint, scaled by growth^level. showGoal hides a row
  // until the goal ladder reaches that index (no orange prices before orange).
  upgrades: {
    flow:      { name: 'Flow speed',    desc: 'All pipes move faster',   cost: { R: 15 },        growth: 1.6, mult: 1.25, showGoal: 0 },
    source:    { name: 'Spring output', desc: 'Springs seep faster',     cost: { Y: 12 },        growth: 1.6, mult: 1.25, showGoal: 1 },
    converter: { name: 'Mixer speed',   desc: 'Mixers blend faster',     cost: { OR: 6 },        growth: 1.7, mult: 1.3,  showGoal: 2 },
    pipe:      { name: '+1 Pipe',       desc: 'One more pipe to draw',   cost: { R: 25, Y: 25 }, growth: 2.0, showGoal: 1 },
  },
  laneCost: { OR: 15 }, laneCostGrowth: 2,

  autosaveSec: 10,
  saveKey: 'terraflow_v3',
};

// Goal ladder: the mural needs N of a paint (LIFETIME banked - spending never
// regresses). Each goal = one mural region. Completing goal k sets goalIndex =
// k+1, spawns NODE_DEFS gated at k+1, grants pipes, shows the toast.
const GOALS = [
  { paint: 'R',  need: 10,  grantPipes: 1, toast: 'A yellow spring surfaces  (+1 pipe)' },
  { paint: 'Y',  need: 20,  grantPipes: 3, toast: 'Mixer slot found - orange awaits  (+3 pipes)' },
  { paint: 'OR', need: 12,  grantPipes: 1, toast: 'A blue spring surfaces  (+1 pipe)' },
  { paint: 'B',  need: 30,  grantPipes: 3, toast: 'New mix: green. Second slot opened  (+3 pipes)' },
  { paint: 'G',  need: 40,  grantPipes: 1, toast: 'New mix: light green - it drinks yellow  (+1 pipe)' },
  { paint: 'LG', need: 40,  grantPipes: 2, toast: 'Final mix: teal. Third slot opened  (+2 pipes)' },
  { paint: 'T',  need: 120, grantPipes: 0, toast: null }, // final -> end card
];

// The mural: regions in z-order (drawn first to last); goal = index into GOALS.
// Shapes in unit coords over CONFIG.mural. A sunset landscape.
const MURAL_REGIONS = [
  { goal: 3, kind: 'rect', x: 0, y: 0,    w: 1, h: 0.18 },                     // night sky (blue)
  { goal: 0, kind: 'rect', x: 0, y: 0.18, w: 1, h: 0.28 },                     // sunset band (red)
  { goal: 2, kind: 'rect', x: 0, y: 0.46, w: 1, h: 0.11 },                     // horizon glow (orange)
  { goal: 1, kind: 'circle', cx: 0.72, cy: 0.33, r: 0.105 },                   // sun (yellow)
  { goal: 4, kind: 'rect', x: 0, y: 0.57, w: 1, h: 0.21 },                     // fields (green)
  { goal: 5, kind: 'rect', x: 0, y: 0.78, w: 1, h: 0.22 },                     // meadow (light green)
  { goal: 6, kind: 'poly', pts: [[0.20, 0.57], [0.31, 0.57], [0.44, 1], [0.06, 1]] }, // river (teal)
];

// Map nodes: fx/fy are fractions of the playfield. gate.goal = goalIndex needed.
// kind 'hub' = the Vat (internal name kept from v1.1).
const NODE_DEFS = [
  { id: 'hub',   kind: 'hub',                   fx: 0.78, fy: 0.70, gate: { goal: 0 } },
  { id: 'srcR',  kind: 'source', element: 'R',  fx: 0.22, fy: 0.16, gate: { goal: 0 } },
  { id: 'srcY',  kind: 'source', element: 'Y',  fx: 0.14, fy: 0.46, gate: { goal: 1 } },
  { id: 'srcB',  kind: 'source', element: 'B',  fx: 0.28, fy: 0.86, gate: { goal: 3 } },
  { id: 'slot1', kind: 'slot',                  fx: 0.54, fy: 0.58, gate: { goal: 2 } },
  { id: 'slot2', kind: 'slot',                  fx: 0.40, fy: 0.34, gate: { goal: 4 } },
  { id: 'slot3', kind: 'slot',                  fx: 0.66, fy: 0.30, gate: { goal: 6 } },
];

const HINTS = [
  { id: 'draw',  gate: { goal: 0 }, text: 'Drag from the spring ● to the vat' },
  { id: 'sheet', gate: { goal: 1 }, text: 'Swipe up to spend paint on upgrades' },
  { id: 'slot',  gate: { goal: 2 }, text: 'Tap the dashed slot to build a mixer' },
  { id: 'lanes', gate: { goal: 4 }, text: 'Tap a pipe to add a parallel lane' },
];
