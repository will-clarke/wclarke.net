// Terraflow - all tunables and content live here. Balance by editing this file only.

const ELEMENTS = {
  O:   { label: 'O',   color: '#ff6f61', value: 1 },
  C:   { label: 'C',   color: '#f5c542', value: 1 },
  CO2: { label: 'CO₂', color: '#4fe3ae', value: 6 },
};

const RECIPES = {
  co2: { id: 'co2', out: 'CO2', inputs: { C: 1, O: 2 }, baseRate: 0.5, label: 'C + 2O → CO₂' },
};

const CONFIG = {
  colors: {
    bg: '#0f1218', ink: '#e8ecf2', dim: '#8a93a6',
    slot: '#5a6577', currency: '#9aa7ff', bad: '#ff5d5d', good: '#5fd68a',
  },

  // geometry
  spacing: 15,        // min px between particles = queue slot size
  particleR: 4.5,
  nodeR: 17,
  hitR: 36,           // touch hit radius for nodes
  pipeHitR: 22,
  laneOffset: 7,      // px between parallel lanes
  maxLanes: 3,
  topPad: 58,         // status strip
  bottomPad: 92,      // sheet handle

  // rates
  baseFlowSpeed: 55,      // px/s
  baseSourceRate: 0.8,    // units/s per source
  streakSpeed: 140,       // px/s above which dots render as streaks
  stubCapMult: 3,         // converter input buffer = ratio * this
  outBufCap: 3,
  sinkBufCap: 3,

  sink: {
    baseDemand: 0.8,      // units/s
    demandGrowth: 1.45,   // per level
    valueGrowth: 1.15,    // per level
    levelBase: 25,        // units consumed for first level-up
    levelGrowth: 1.5,
  },

  upgrades: {
    flow:      { name: 'Flow speed',   desc: 'All pipes move faster',   base: 30, growth: 1.6, mult: 1.25 },
    source:    { name: 'Well output',  desc: 'Wells produce faster',    base: 25, growth: 1.6, mult: 1.25 },
    converter: { name: 'Reactor speed', desc: 'Reactors react faster',  base: 40, growth: 1.6, mult: 1.3 },
  },
  laneCostBase: 25,
  laneCostGrowth: 2,

  endTarget: 8000,        // total earned -> end card
  autosaveSec: 10,
  saveKey: 'terraflow_v1',
};

// Map content. fx/fy = fractions of playfield. gate.earned = total earned to appear.
const NODE_DEFS = [
  { id: 'srcO1',  kind: 'source', element: 'O',   fx: 0.22, fy: 0.16, gate: { earned: 0 } },
  { id: 'snkO',   kind: 'sink',   element: 'O',   fx: 0.76, fy: 0.28, gate: { earned: 0 } },
  { id: 'srcO2',  kind: 'source', element: 'O',   fx: 0.14, fy: 0.46, gate: { earned: 15 } },
  { id: 'srcC',   kind: 'source', element: 'C',   fx: 0.30, fy: 0.82, gate: { earned: 120 } },
  { id: 'slot1',  kind: 'slot',                   fx: 0.56, fy: 0.63, gate: { earned: 120 } },
  { id: 'snkCO2', kind: 'sink',   element: 'CO2', fx: 0.83, fy: 0.80, gate: { earned: 120 } },
  { id: 'slot2',  kind: 'slot',                   fx: 0.44, fy: 0.40, gate: { earned: 600 } },
];

const HINTS = [
  { id: 'draw',  gate: { earned: 0 },   text: 'Drag from the well ● to the pulsing module ⬡' },
  { id: 'sheet', gate: { earned: 40 },  text: 'Swipe up for upgrades' },
  { id: 'slot',  gate: { earned: 120 }, text: 'Tap the dashed slot to build a reactor' },
  { id: 'lanes', gate: { earned: 300 }, text: 'Tap a pipe to add a parallel lane' },
];
