// Terraflow - all tunables and content live here. Balance by editing this file only.
// v1.1 hub model: resources ARE the currency (SPEC decisions 16-21).

const ELEMENTS = {
  O:   { label: 'O',   color: '#ff6f61' },
  C:   { label: 'C',   color: '#f5c542' },
  CO2: { label: 'CO₂', color: '#4fe3ae' },
};

const RECIPES = {
  co2: { id: 'co2', out: 'CO2', inputs: { C: 1, O: 2 }, baseRate: 0.5, label: 'C + 2O → CO₂' },
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
  topPad: 86,         // status strip + goal chip
  bottomPad: 92,      // sheet handle

  // rates - deliberately slow start (playtest: early dots should be watchable)
  baseFlowSpeed: 55,      // px/s
  baseSourceRate: 0.5,    // units/s per vent
  streakSpeed: 140,       // px/s above which dots render as streaks
  stubCapMult: 3,         // reactor input buffer = ratio * this
  outBufCap: 3,

  // pipes are precious (decision 17)
  pipeStockStart: 3,

  // upgrades: cost = resources, scaled by growth^level. showGoal hides a row
  // until the goal ladder reaches that index (no CO₂ prices before chemistry).
  upgrades: {
    flow:      { name: 'Flow speed',    desc: 'All pipes move faster',  cost: { O: 15 },  growth: 1.6, mult: 1.25, showGoal: 0 },
    source:    { name: 'Vent output',   desc: 'Vents seep faster',      cost: { O: 12 },  growth: 1.6, mult: 1.25, showGoal: 1 },
    converter: { name: 'Reactor speed', desc: 'Reactors react faster',  cost: { CO2: 6 }, growth: 1.7, mult: 1.3,  showGoal: 2 },
    pipe:      { name: '+1 Pipe',       desc: 'One more pipe to draw',  cost: { O: 60 },  growth: 2.2, showGoal: 1 },
  },
  laneCost: { O: 30 }, laneCostGrowth: 2,

  chemistryGoal: 2,   // goal index at which element symbols / recipe notation appear
  autosaveSec: 10,
  saveKey: 'terraflow_v2',
};

// Goal ladder: need N of element (LIFETIME banked - spending never regresses).
// Completing goal k sets goalIndex = k+1, spawns NODE_DEFS gated at k+1,
// grants pipes, shows the toast.
const GOALS = [
  { element: 'O',   need: 10,  grantPipes: 1, toast: 'Second vent uncovered  (+1 pipe)' },
  { element: 'O',   need: 40,  grantPipes: 2, toast: 'Carbon vent + reactor slot found  (+2 pipes)' },
  { element: 'CO2', need: 12,  grantPipes: 1, toast: 'Second reactor slot opened  (+1 pipe)' },
  { element: 'CO2', need: 80,  grantPipes: 1, toast: 'Stabilizer spinning up  (+1 pipe)' },
  { element: 'CO2', need: 300, grantPipes: 0, toast: null }, // final -> end card
];

// Map nodes: fx/fy are fractions of the playfield. gate.goal = goalIndex needed.
const NODE_DEFS = [
  { id: 'hub',    kind: 'hub',                    fx: 0.78, fy: 0.70, gate: { goal: 0 } },
  { id: 'srcO1',  kind: 'source', element: 'O',   fx: 0.22, fy: 0.16, gate: { goal: 0 } },
  { id: 'srcO2',  kind: 'source', element: 'O',   fx: 0.14, fy: 0.46, gate: { goal: 1 } },
  { id: 'srcC',   kind: 'source', element: 'C',   fx: 0.30, fy: 0.84, gate: { goal: 2 } },
  { id: 'slot1',  kind: 'slot',                   fx: 0.56, fy: 0.58, gate: { goal: 2 } },
  { id: 'slot2',  kind: 'slot',                   fx: 0.42, fy: 0.36, gate: { goal: 3 } },
];

const HINTS = [
  { id: 'draw',  gate: { goal: 0 }, text: 'Drag from the vent ● to the hub ⬢' },
  { id: 'sheet', gate: { goal: 1 }, text: 'Swipe up to spend your bank on upgrades' },
  { id: 'slot',  gate: { goal: 2 }, text: 'Tap the dashed slot to build a reactor' },
  { id: 'lanes', gate: { goal: 3 }, text: 'Tap a pipe to add a parallel lane' },
];
