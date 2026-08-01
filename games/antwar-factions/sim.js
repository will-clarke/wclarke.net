// Ant War simulation core. Pure rules: no rendering, no wall-clock, no
// Math.random - a seeded RNG and a fixed timestep make every match
// deterministic and replayable. Runs in the browser as a plain script
// (window.AntWarSim) and in Node via require() for the tuning harness.
// The game is a pure nest-builder: no manual sends, hatcheries breed into
// a muster, and the war drum marches both armies on a shared beat.
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.AntWarSim = api;
})(typeof self !== 'undefined' ? self : globalThis, function () {
'use strict';

const CONFIG = {
  TICK: 0.05,

  // layout (the sim owns geometry: ranges, muster and siege spots depend on it)
  W: 420, H: 780,
  LANE_CX: 210, LANE_HALF: 34,
  ENEMY_BASE: { x: 210, y: 82, r: 44 },
  PLAYER_BASE: { x: 210, y: 558, r: 44 },
  SIEGE_DIST: 72,
  // 8 slots per side: A lane-hugging by the nest, B mid flank, C rear,
  // D forward outposts (reach the lane early, can't defend the nest).
  PLAYER_SLOTS: [
    { x: 148, y: 505 }, { x: 272, y: 505 },   // A
    { x: 105, y: 425 }, { x: 315, y: 425 },   // B
    { x: 50,  y: 500 }, { x: 370, y: 500 },   // C
    { x: 140, y: 350 }, { x: 280, y: 350 },   // D
  ],
  // exact mirror of PLAYER_SLOTS around the midline between the bases
  // (y' = 640 - y); anything else quietly biases mirror matches.
  ENEMY_SLOTS: [
    { x: 148, y: 135 }, { x: 272, y: 135 },
    { x: 105, y: 215 }, { x: 315, y: 215 },
    { x: 50,  y: 140 }, { x: 370, y: 140 },
    { x: 140, y: 290 }, { x: 280, y: 290 },
  ],

  // balance
  BASE_HP: 300,
  START_MONEY: 220,
  START_TOWERS: 0,               // free towers per side at t=0 (slot A first); 0 since v0.8
  SELL_REFUND: 0.7,              // fraction of a slot's total spend returned on sell
  BASE_INCOME: 4,
  GOLD_CAP: 400,                 // income above this is wasted (anti-idle nudge)
  WAR_DRUM: 18,                  // base drum period; each side now beats alone
  // fx0.2: drum-shifting buildings (the PISTON beat-delta prototype). Each
  // one shifts ITS OWNER'S drum period; deltas stack per building and the
  // net period is clamped. A pending beat keeps its scheduled time - deltas
  // apply from the next beat onward (no sell-rebuild beat scrubbing).
  DRUM_DELTA: { hornb: 6, fifeb: -3 },
  DRUM_MIN: 10, DRUM_MAX: 36,
  // fx0.4: the ROT paint FIELD - a per-side intensity grid (0..1 per cell)
  // over the lane, replacing fx0.3's single frontier line. Cell (col,row)
  // centre is (cx0 + col*cellW, cy0 + row*cellH).
  // INVARIANT: 2*cy0 + (rows-1)*cellH === 640 and rows is ODD, so the mirror
  // y' = 640-y maps row -> rows-1-row exactly (fieldRow's tie rule needs the
  // odd count). Any other geometry quietly biases mirror matches.
  FIELD: { cellW: 20, cellH: 20, cx0: 10, cy0: 40, cols: 21, rows: 29 },
  // Paint pours out of Mats, spreads to thinner neighbours, seeps toward the
  // enemy, dissolves everywhere and burns back under foe towers. Every effect
  // scales with LOCAL intensity, so the map is a gradient, not a border.
  CREEP: {
    emit: 0.8,          // intensity/s under each Mat (half to the 4 neighbours).
                        // Self-throttling: a cell caps at 1 and the excess is
                        // DISCARDED, so a Mat can only push out what its
                        // neighbourhood drains - measured identical at 0.8,
                        // 1.6 and 3.0. That cap, not this number, is what
                        // stops a Mat stack from tiling the map.
    flow: 0.6,          // /s spread toward lower-intensity neighbours
    seep: 0.15,         // /s of a cell's paint advected one row toward the foe
    decay: 0.02,        // /s dissolve everywhere - paint is a flow you
                        // maintain, not a bank (the anti-ratchet guard that
                        // replaces fx0.3's recede-without-mats rule)
    burn: 0.25,         // /s scrubbed per SHOOTING foe tower at contact,
                        // falling linearly to 0 at its range edge (x level
                        // power). The stall line, inherited from fx0.3
                        // suppression: without it creep-turtle beat the
                        // field 1.00.
    splat: 0.5,         // intensity a shambler corpse dumps where it falls
    trail: 0.8,         // /s a MARCHING shambler smears into the cell it
                        // stands in - the only source that reaches the lane
                        // (Mats sit in rear slots, so their paint never does).
                        // A pass through a cell takes 20/44 s, so this is
                        // 0.36 laid per shambler per cell: below ~0.3/s the
                        // trail is thinner than decay eats and never forms.
    rub: 0.15,          // /s each foe body scrubs off the cell it stands in.
                        // Per unit, so eight parked bodies clean a cell in
                        // under a second and one passer-by takes 0.07 off it.
    goldPerCell: 0.09,  // income per unit of total intensity (income = area).
                        // Cut from T6a's 0.15 when trails doubled the paint
                        // on the board: held ROT's total paint income where
                        // T6a tuned it, which measured strictly better than
                        // banking the windfall (creeper 0.341 vs 0.307, and
                        // a creep-turtle 0.81 vs 0.96). 0.25 pushed that
                        // turtle to 0.86 of the field and 0.4 to a clean
                        // 1.00 - the fx0.3 failure mode, still one knob away.
    slow: 0.65,         // speed factor for foes standing in FULL paint
    dot: 1.5,           // dps to foes standing in full paint
    corrode: 3,         // dps to foe buildings standing in full paint
    hillDps: 7,         // strangle dps at a fully painted hill rim
  },
  // T6c paint SPICE: three independent experiments in what paint is FOR,
  // each a rate that is 0 by default, so the shipped rules are untouched
  // until Will picks one (FACTIONS open question 9). Grade one at a time:
  // SPICE=heal:4 node tune.js matrix 15
  SPICE: {
    heal: 0,            // hp/s an OWN unit regains standing in FULL own paint
    corpseGold: 0,      // gold to the paint owner per unit dying in FULL paint
    spawnAt: 0.5,       // intensity a cell must hold to count as a womb
    spawnRate: 0,       // free shamblers/s per qualifying cell, born on the spot
  },

  // buildings: empty slot -> farm | tower | hatch; then one upgrade tree each
  COSTS: {
    farm: 80, grove: 90, plant: 120, mat: 100,
    tower: 100, sharp: 120, spit: 120, sap: 100, guard: 110, mortar: 220, conv: 160,
    hatch: 90, swarmb: 70, soldierb: 80, majorb: 130, sapperb: 110, predatorb: 100,
    hornb: 100, fifeb: 80, oozeb: 90,
  },
  UPGRADE_TREE: {
    farm:  ['grove', 'mat'],
    grove: ['plant'],
    tower: ['sharp', 'spit', 'sap', 'guard', 'mortar', 'conv'],
    hatch: ['swarmb', 'soldierb', 'majorb', 'sapperb', 'predatorb', 'hornb', 'fifeb', 'oozeb'],
  },
  // specialised broods and towers can then level to 2 and 3: the late-game
  // gold sink. Costs scale superlinearly with power on purpose - concentrated
  // stats beat distributed ones against throughput-limited towers.
  MAX_LVL: 3,
  LVL_COST_MULT: { 2: 1.5, 3: 2.5 },   // of the building's base cost
  LVL_POWER: 1.5,                       // per level: production rate / tower dmg
  INCOME_BY_TYPE: { farm: 2.5, grove: 5, plant: 8, mat: 1.5 },
  // production: what each offence building drops into the muster, and how often
  PRODUCTION: {
    hatch:    { unit: 'worker',  interval: 6 },
    swarmb:   { unit: 'worker',  interval: 3 },
    soldierb: { unit: 'soldier', interval: 9 },
    majorb:   { unit: 'major',   interval: 18 },
    sapperb:  { unit: 'sapper',  interval: 10 },
    predatorb: { unit: 'predator', interval: 8 },
    // drum-shifters still breed (Will: offensive upgrades are "x unit AND
    // +/- time on the metronome") - slightly worse than the pure broods
    hornb:  { unit: 'soldier', interval: 10 },
    fifeb:  { unit: 'worker',  interval: 3.5 },
    oozeb:  { unit: 'shambler', interval: 4 },
  },
  TOWERS: {
    tower: { range: 130, dmg: 6,  cooldown: 0.4 },
    sharp: { range: 175, dmg: 34, cooldown: 1.5 },
    spit:  { range: 105, dmg: 3,  cooldown: 0.45, splash: 28 },
    sap:   { range: 120, slow: 0.5 },
    // mortars bombard enemy DEFENCE BUILDINGS only (bomb, not dmg, so the
    // anti-unit firing loop skips them); range covers the whole field -
    // placement is about protecting the mortar, not reaching the target
    mortar: { range: 900, bomb: 24, cooldown: 5 },
    // converters channel one attacker at a time (no dmg, so the firing loop
    // skips them) and flip it after `channel` seconds; levels channel faster.
    // The charm is TIMED and scaled by the host: duration = charmHpSec / base
    // hp (a worker serves ~forever, a major shakes it off in seconds), times
    // level power. Convert-once immunity survives the revert (no ping-pong).
    conv: { range: 120, channel: 3.5, charmHpSec: 1200, charmMin: 4 },
  },
  // v0.5 contact update: every defence building has HP (sappers chew it);
  // guard posts field a squad of defender ants that intercept on the lane.
  TOWER_HP: 130,
  GUARD: { count: 2, respawn: 12, leash: 75, engage: 26 },
  // v0.9: predators march to a hold point just past the midline on their own
  // side, then hunt enemy marchers (and enemy predators) within the leash.
  // The leash is deliberately small: a wave saturates the bubble and most
  // of it streams past - hunters eat stragglers, sappers and elites, not
  // whole armies (dps 10 / leash 110 was army denial; see README v0.9).
  PREDATOR: { leash: 80, holdNear: 12, holdFar: 44 },
  UNITS: {
    worker:  { hp: 10,  spd: 66, dps: 2.5, r: 4.2 },
    soldier: { hp: 62,  spd: 52, dps: 6.5, r: 6.0 },
    major:   { hp: 190, spd: 40, dps: 6,   r: 9.0 },
    // sappers divert to enemy defence buildings in sight and demolish them;
    // weak vs anti-swarm and barely dents the hill itself
    sapper:  { hp: 62,  spd: 50, dps: 3,   r: 5.0, vsTower: 22, sight: 90 },
    guard:   { hp: 90,  spd: 60, dps: 6,   r: 5.2 },
    // predators never touch hill or towers: pure anti-marcher midfield.
    // Beats a soldier 1v1 (barely), melts a sapper, loses to a major;
    // slower than workers so chaff it hasn't grabbed simply outruns it
    predator: { hp: 80, spd: 62, dps: 6,   r: 5.5 },
    // shamblers trickle: they skip the muster and march the moment they
    // hatch (ROT has no drum), and their corpses feed the creep frontier
    shambler: { hp: 26,  spd: 44, dps: 3.5, r: 4.6, trickle: true },
  },
  FRENZY_AT: 240,
  DECAY_AT: 330,
  HARD_END: 420,
  DECAY_RATE: 4,

  // which faction each side plays (see FACTIONS). 'sandbox' is the tuning
  // line's everything-kit, so the default leaves every old matchup untouched.
  FACTION: { p: 'sandbox', e: 'sandbox' },
  // T7b: PISTON's flywheel. A per-side income MULTIPLIER that charges while
  // the machine runs and is knocked back every time a building is destroyed.
  // The state is kept for both sides (like the paint field); only a faction
  // whose registry entry has an `income` hook actually reads it.
  FLYWHEEL: {
    cold: 0.8,    // multiplier at t=0 - and the floor: a stalled machine is
                  // poor, but never worth less than nothing. THE dial: it
                  // sets PISTON's whole field score (0.7 reads 0.38 vs the
                  // sandbox, 0.8 reads 0.52, 1.0 reads 0.71) because the
                  // opening is the only window where gold decides matches.
    rate: 0.005,  // /s of multiplier while at least one building stands:
                  // 1.0x at 40s, the cap at 220s
    max: 1.9,     // outcome-neutral at 1.6/1.9/2.4 - a turtle is already
                  // parked at GOLD_CAP for 223 of its 375 seconds, so the
                  // top of the curve buys nothing. The sink, not the ceiling,
                  // is what the flywheel is missing (T7b findings).
    loss: 0.3,    // knocked off per building DESTROYED (60s of spin-up).
                  // Washes out of a field average but decides the matchup
                  // that exercises it: vs mortarWall, 0.89 at loss 0 and
                  // 0.44 at 0.3. Selling is free - spin is per-side, so
                  // there is nothing to scrub by rebuilding, and dodging a
                  // mortar by selling at 70% is counterplay, not an exploit.
  },

  // campaign level setups: per-side start money and pre-built buildings.
  // The RULES stay symmetric (that keeps self-play tuning and future PvP
  // honest) - only the STARTING POSITION may differ, as level design.
  // Shape: { moneyP, moneyE, prebuildP: [{slot,type,lvl}], prebuildE: [...] }
  SETUP: null,
};

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function other(side) { return side === 'p' ? 'e' : 'p'; }

function createState(seed, overrides) {
  const cfg = Object.assign({}, CONFIG, overrides || {});
  // spent tracks all gold sunk into the slot (build + upgrades) for refunds
  const slotRow = pos => ({ x: pos.x, y: pos.y, type: null, lvl: 1, cd: 0, prodCd: 0, hp: 0, spent: 0 });
  const S = {
    cfg,
    seed: seed >>> 0,
    rng: mulberry32(seed >>> 0),
    t: 0,
    frenzy: false,
    decay: false,
    nextBeat: { p: cfg.WAR_DRUM, e: cfg.WAR_DRUM },
    // ROT paint: one intensity grid per side, 0..1 per cell (CONFIG.FIELD).
    // fieldSum is the running total, kept by stepField so income and the
    // per-tick effect passes never have to walk the grid.
    field: {
      p: new Array(cfg.FIELD.cols * cfg.FIELD.rows).fill(0),
      e: new Array(cfg.FIELD.cols * cfg.FIELD.rows).fill(0),
    },
    fieldSum: { p: 0, e: 0 },
    spawnAcc: { p: 0, e: 0 },    // T6c: fractional paint-births carried over
    spin: { p: cfg.FLYWHEEL.cold, e: cfg.FLYWHEEL.cold },   // T7b flywheel
    money: { p: cfg.START_MONEY, e: cfg.START_MONEY },
    baseHP: { p: cfg.BASE_HP, e: cfg.BASE_HP },
    slots: {
      p: cfg.PLAYER_SLOTS.map(slotRow),
      e: cfg.ENEMY_SLOTS.map(slotRow),
    },
    units: [],
    shots: [],                   // presentational, consumed by the renderer
    events: [],                  // presentational, consumed by the renderer
    hatched: {                   // lifetime production tally (reaction reads)
      p: { worker: 0, soldier: 0, major: 0, sapper: 0, predator: 0, shambler: 0 },
      e: { worker: 0, soldier: 0, major: 0, sapper: 0, predator: 0, shambler: 0 },
    },
    converted: { p: 0, e: 0 },   // lifetime conversion tally (tuner sanity)
    over: false,
    result: null,                // 'p' | 'e' | 'draw'
    endT: 0,
  };
  for (let i = 0; i < cfg.START_TOWERS; i++) {
    for (const side of ['p', 'e']) {
      S.slots[side][i].type = 'tower';
      S.slots[side][i].hp = cfg.TOWER_HP;
      S.slots[side][i].spent = cfg.COSTS.tower;
    }
  }
  if (cfg.SETUP) {
    const su = cfg.SETUP;
    if (su.moneyP != null) S.money.p = su.moneyP;
    if (su.moneyE != null) S.money.e = su.moneyE;
    for (const b of su.prebuildP || []) placeBuilding(S, 'p', b.slot, b.type, b.lvl);
    for (const b of su.prebuildE || []) placeBuilding(S, 'e', b.slot, b.type, b.lvl);
  }
  return S;
}

// pre-place a building without paying for it (campaign level setups only)
function placeBuilding(S, side, slotIdx, type, lvl) {
  const slot = S.slots[side][slotIdx];
  slot.type = type;
  slot.lvl = lvl || 1;
  slot.cd = 0;
  slot.spent = costOf(S, side, type);
  for (let l = 2; l <= slot.lvl; l++) slot.spent += Math.round(S.cfg.COSTS[type] * S.cfg.LVL_COST_MULT[l]);
  slot.hp = demolishable(type) ? S.cfg.TOWER_HP * lvlPower(S, slot) : 0;
  if (S.cfg.PRODUCTION[type]) slot.prodCd = S.cfg.PRODUCTION[type].interval / lvlPower(S, slot);
  if (type === 'guard') {
    for (let i = 0; i < S.cfg.GUARD.count; i++) spawnGuard(S, side, slotIdx);
    slot.prodCd = S.cfg.GUARD.respawn;
  }
}

// ------------------------------------------------------------- queries ----
function count(S, side, type) {
  let n = 0;
  for (const s of S.slots[side]) if (s.type === type) n++;
  return n;
}
const FAMILIES = {
  eco: ['farm', 'grove', 'plant', 'mat'],
  def: ['tower', 'sharp', 'spit', 'sap', 'guard', 'mortar', 'conv'],
  off: ['hatch', 'swarmb', 'soldierb', 'majorb', 'sapperb', 'predatorb', 'hornb', 'fifeb', 'oozeb'],
};
// every built thing can be shot down - farms and hatcheries included.
// Nothing is safe just for being behind the line: an economy has to be
// defended, and killing the paint producers is how you remove creep.
function demolishable(type) {
  return !!type;
}
// A faction is DATA, not a branch in step(): which building types it may
// build (`kit`), what an empty slot offers (`roots`), whether it owns a war
// drum at all, and (T7b) an optional `income(S, side, gross)` hook. The shared
// rules read those hooks, so a new faction is a table entry rather than a
// scatter of `if (side is ROT)`.
const FACTIONS = {
  // the tuning sandbox: every building, the stacked drum. The default, so
  // every recorded matchup and evolved vector replays bit-identically.
  sandbox: { label: 'SANDBOX', roots: null, kit: null, drum: true },
  // ROT: everything grows straight out of bare ground - no farms, no worker
  // hatchery, no beat - and its defence only slows and blocks. Shamblers are
  // the whole army and the paint is the damage.
  rot: {
    label: 'ROT',
    roots: ['mat', 'tower', 'oozeb'],
    kit: ['mat', 'tower', 'sap', 'guard', 'oozeb'],
    drum: false,
    // a spec grown straight from bare ground still pays for the trunk it
    // skipped (farm 80 + mat 100, hatch 90 + oozeb 90) - otherwise a faction
    // gets the sandbox's tier-2 buildings at half price. BUILD price only:
    // level costs stay keyed to COSTS, since a level buys tech, not ground.
    cost: { mat: 180, oozeb: 180 },
  },
  // PISTON: the machine. Its trunks are the standard three, so nothing is
  // grown from bare ground and no cost table is needed - the faction lives in
  // its income CURVE (a cold start that compounds, and stalls when anything
  // breaks) and in a kit with no chaff, no ant-shaped defence and no theft.
  // Mortars are the interim answer to buildings until the juggernaut lands.
  piston: {
    label: 'PISTON',
    roots: ['farm', 'tower', 'hatch'],
    kit: ['farm', 'grove', 'plant', 'tower', 'sharp', 'spit', 'mortar',
          'hatch', 'soldierb', 'hornb', 'fifeb'],
    drum: true,
    income: (S, side, gross) => gross * S.spin[side],
  },
};
function faction(S, side) { return FACTIONS[S.cfg.FACTION[side]]; }
function costOf(S, side, type) {
  const c = faction(S, side).cost;
  return (c && c[type]) || S.cfg.COSTS[type];
}
function familyCount(S, side, family) {
  const fams = FAMILIES[family];
  let n = 0;
  for (const s of S.slots[side]) if (s.type && fams.includes(s.type)) n++;
  return n;
}
function income(S, side) {
  let inc = S.cfg.BASE_INCOME;
  for (const s of S.slots[side]) inc += S.cfg.INCOME_BY_TYPE[s.type] || 0;
  inc += S.cfg.CREEP.goldPerCell * S.fieldSum[side];
  const hook = faction(S, side).income;
  if (hook) inc = hook(S, side, inc);
  return inc * (S.frenzy ? 2 : 1);
}

// ---------------------------------------------------------- paint field ----
// Round half to EVEN: the tie-break has to survive mirroring, and round-half-
// up does not - slot y=500 and its mirror y=140 both land exactly on a cell
// boundary, and rounding both "up" puts them in cells that are not mirrors.
function rhe(q) {
  const f = Math.floor(q), d = q - f;
  if (d > 0.5) return f + 1;
  if (d < 0.5) return f;
  return f % 2 === 0 ? f : f + 1;
}
function fieldCol(S, x) {
  const F = S.cfg.FIELD;
  return Math.max(0, Math.min(F.cols - 1, rhe((x - F.cx0) / F.cellW)));
}
function fieldRow(S, y) {
  const F = S.cfg.FIELD;
  return Math.max(0, Math.min(F.rows - 1, rhe((y - F.cy0) / F.cellH)));
}
// intensity of `side`'s paint under a world point
function fieldAt(S, side, x, y) {
  return S.field[side][fieldRow(S, y) * S.cfg.FIELD.cols + fieldCol(S, x)];
}
// dump paint at a point: full dose in the cell, half in the 4 neighbours
function paintAt(S, g, x, y, amt) {
  const F = S.cfg.FIELD, c = fieldCol(S, x), r = fieldRow(S, y);
  const put = (cc, rr, a) => {
    if (cc < 0 || cc >= F.cols || rr < 0 || rr >= F.rows) return;
    const i = rr * F.cols + cc;
    g[i] = Math.min(1, g[i] + a);
  };
  put(c, r, amt);
  put(c - 1, r, amt / 2); put(c + 1, r, amt / 2);
  put(c, r - 1, amt / 2); put(c, r + 1, amt / 2);
}
// creep home edge (the owner's hill rim) and how far the paint has carried:
// the farthest row toward the enemy whose total intensity clears ADV_ROW, in
// px from home. Kept as the tuner readout. The threshold is 2 saturated
// cells' worth, not 1, because a lone corpse-splat totals exactly 1.0 - one
// shambler dying deep in enemy ground must not read as a 394px advance.
function creepHome(S, side) {
  return side === 'p' ? S.cfg.PLAYER_BASE.y - S.cfg.PLAYER_BASE.r
                      : S.cfg.ENEMY_BASE.y + S.cfg.ENEMY_BASE.r;
}
const ADV_ROW = 2;
function creepAdvance(S, side) {
  const F = S.cfg.FIELD, g = S.field[side], home = creepHome(S, side);
  let best = 0;
  for (let r = 0; r < F.rows; r++) {
    let tot = 0;
    for (let c = 0; c < F.cols; c++) tot += g[r * F.cols + c];
    if (tot < ADV_ROW) continue;
    const y = F.cy0 + r * F.cellH;
    const adv = side === 'p' ? home - y : y - home;
    if (adv > best) best = adv;
  }
  return best;
}
// mean paint intensity of `side` across the foe hill's rim row
function hillLap(S, side) {
  const cfg = S.cfg, F = cfg.FIELD, g = S.field[side];
  const base = side === 'p' ? cfg.ENEMY_BASE : cfg.PLAYER_BASE;
  const r = fieldRow(S, side === 'p' ? base.y + base.r : base.y - base.r);
  const c0 = fieldCol(S, base.x - base.r), c1 = fieldCol(S, base.x + base.r);
  let sum = 0;
  for (let c = c0; c <= c1; c++) sum += g[r * F.cols + c];
  return sum / (c1 - c0 + 1);
}

// one field tick: emit -> flow+seep -> decay -> tower burn, per side, then
// the two grids contest. Each side reads only its OWN previous grid (double
// buffered), so the pass is order-independent and mirrors exactly.
function stepField(S, dt) {
  const cfg = S.cfg, F = cfg.FIELD, CR = cfg.CREEP, N = F.cols * F.rows;
  for (const side of ['p', 'e']) {
    const g = S.field[side];
    let src = 0;
    for (const s of S.slots[side]) if (s.type === 'mat') src++;
    if (!src) {
      for (const u of S.units) {
        if (u.side === side && u.typeKey === 'shambler' && u.state !== 'muster') { src++; break; }
      }
    }
    if (!src && S.fieldSum[side] <= 0) continue;   // nothing to simulate

    for (const s of S.slots[side]) {
      if (s.type === 'mat') paintAt(S, g, s.x, s.y, CR.emit * dt);
    }
    // slime trails: a marching shambler smears its own cell only - a line,
    // not a blot, and it is laid exactly where the fight happens
    for (const u of S.units) {
      if (u.side !== side || u.typeKey !== 'shambler' || u.state === 'muster') continue;
      const i = fieldRow(S, u.y) * F.cols + fieldCol(S, u.x);
      g[i] = Math.min(1, g[i] + CR.trail * dt);
    }
    // flow crosses each adjacent PAIR once, antisymmetrically, so no cell's
    // result depends on visit order; seep drags a slice of every cell one
    // row toward the enemy (paint at the far edge just piles up there).
    const next = g.slice();
    const k = CR.flow * dt / 4, bias = CR.seep * dt;
    const dir = side === 'p' ? -F.cols : F.cols;
    for (let i = 0; i < N; i++) {
      const v = g[i];
      if ((i + 1) % F.cols !== 0) { const t = k * (v - g[i + 1]); next[i] -= t; next[i + 1] += t; }
      if (i + F.cols < N) { const t = k * (v - g[i + F.cols]); next[i] -= t; next[i + F.cols] += t; }
      const j = i + dir;
      if (j >= 0 && j < N) { const m = bias * v; next[i] -= m; next[j] += m; }
    }
    for (let i = 0; i < N; i++) {
      const v = next[i] - CR.decay * dt;
      g[i] = v <= 0 ? 0 : (v > 1 ? 1 : v);
    }
    // foe shooting towers burn the paint back, hardest at the muzzle: the
    // stall line forms where burn balances what flows in behind it
    for (const ts of S.slots[other(side)]) {
      const spec = cfg.TOWERS[ts.type];
      if (!spec || !spec.dmg) continue;
      const rate = CR.burn * lvlPower(S, ts) * dt;
      const c0 = fieldCol(S, ts.x - spec.range), c1 = fieldCol(S, ts.x + spec.range);
      const r0 = fieldRow(S, ts.y - spec.range), r1 = fieldRow(S, ts.y + spec.range);
      for (let r = r0; r <= r1; r++) {
        for (let c = c0; c <= c1; c++) {
          const i = r * F.cols + c;
          if (g[i] <= 0) continue;
          const d = Math.hypot(F.cx0 + c * F.cellW - ts.x, F.cy0 + r * F.cellH - ts.y);
          if (d >= spec.range) continue;
          const v = g[i] - rate * (1 - d / spec.range);
          g[i] = v <= 0 ? 0 : v;
        }
      }
    }
    // rub-off: foe bodies scrub the cell they stand in. Marching through
    // paint now cleans a path, so a swarm has an answer that costs it time
    // in the paint rather than gold.
    for (const u of S.units) {
      if (u.side === side || u.state === 'muster') continue;
      const i = fieldRow(S, u.y) * F.cols + fieldCol(S, u.x);
      if (g[i] <= 0) continue;
      const v = g[i] - CR.rub * dt;
      g[i] = v <= 0 ? 0 : v;
    }
  }
  // rival paint corrodes on contact: the thinner side is wiped out and takes
  // that much off the thicker one (a push-of-war, cell by cell)
  const gp = S.field.p, ge = S.field.e;
  let sp = 0, se = 0;
  for (let i = 0; i < N; i++) {
    const m = gp[i] < ge[i] ? gp[i] : ge[i];
    if (m > 0) { gp[i] -= m; ge[i] -= m; }
    sp += gp[i]; se += ge[i];
  }
  S.fieldSum.p = sp; S.fieldSum.e = se;

  // T6c PAINT_SPAWNS: deep paint births free shamblers. The accumulator is
  // per SIDE, not per cell, so the cost is one scan and the two sides carry
  // identical fractions in a mirror; the birth lands on the qualifying cell
  // nearest the foe (ties to the lowest col, which mirrors to itself), so
  // the slime spits at its own frontier rather than behind the nest.
  const SP = cfg.SPICE;
  if (SP.spawnRate > 0) {
    for (const side of ['p', 'e']) {
      const g = S.field[side];
      let n = 0, br = -1, bc = -1;
      for (let r = 0; r < F.rows; r++) {
        for (let c = 0; c < F.cols; c++) {
          if (g[r * F.cols + c] < SP.spawnAt) continue;
          n++;
          if (br < 0 || (side === 'p' ? r < br : r > br)) { br = r; bc = c; }
        }
      }
      if (!n) continue;
      S.spawnAcc[side] += SP.spawnRate * n * dt;
      while (S.spawnAcc[side] >= 1) {
        S.spawnAcc[side] -= 1;
        spawnUnit(S, side, 'shambler', { x: F.cx0 + bc * F.cellW, y: F.cy0 + br * F.cellH });
        S.events.push({ type: 'birth', x: F.cx0 + bc * F.cellW, y: F.cy0 + br * F.cellH, side });
      }
    }
  }
}
function musterCount(S, side) {
  let n = 0;
  for (const u of S.units) if (u.side === side && u.state === 'muster') n++;
  return n;
}
// mat is NOT levelable: creep growth stays one step per building (the
// horn/fife precedent - read the mat's speed by counting fountains), and
// level-multiplied growth out-raced every possible tower suppression
const LEVELABLE = ['sharp', 'spit', 'sap', 'guard', 'mortar', 'conv', 'swarmb', 'soldierb', 'majorb', 'sapperb', 'predatorb', 'hornb', 'fifeb', 'oozeb'];
// levels speed a drum-shifter's PRODUCTION like any brood; the beat delta
// stays one step per building, so the metronome is read by counting them.
// null means the faction has no drum at all (ROT): nothing musters, so
// nothing is waiting for a beat.
function drumPeriod(S, side) {
  if (!faction(S, side).drum) return null;
  let period = S.cfg.WAR_DRUM;
  for (const s of S.slots[side]) period += S.cfg.DRUM_DELTA[s.type] || 0;
  return Math.max(S.cfg.DRUM_MIN, Math.min(S.cfg.DRUM_MAX, period));
}
function lvlPower(S, slot) {
  return Math.pow(S.cfg.LVL_POWER, (slot.lvl || 1) - 1);
}
function lvlCost(S, slot) {
  return Math.round(S.cfg.COSTS[slot.type] * S.cfg.LVL_COST_MULT[(slot.lvl || 1) + 1]);
}
// legal build/upgrade types for this slot (empty slot -> the three roots;
// specialised buildings offer 'lvl' until MAX_LVL)
function buildOptions(S, side, slotIdx) {
  const slot = S.slots[side][slotIdx];
  if (!slot) return [];
  const f = faction(S, side);
  let opts;
  if (slot.type === null) opts = f.roots || ['farm', 'tower', 'hatch'];
  else if (S.cfg.UPGRADE_TREE[slot.type]) opts = S.cfg.UPGRADE_TREE[slot.type];
  else if (LEVELABLE.includes(slot.type) && slot.lvl < S.cfg.MAX_LVL) return ['lvl'];
  else return [];
  return f.kit ? opts.filter(t => f.kit.includes(t)) : opts;
}

// ------------------------------------------------------------- actions ----
// action kinds: {kind:'build', slot:i, type:<building>} | {kind:'sell', slot:i}
function sellRefund(S, slot) {
  return Math.round(slot.spent * S.cfg.SELL_REFUND);
}
function applyAction(S, side, action) {
  if (S.over || !action) return false;
  const slot = S.slots[side][action.slot];
  if (!slot) return false;
  if (action.kind === 'sell') {
    if (!slot.type) return false;
    S.money[side] = Math.min(S.cfg.GOLD_CAP, S.money[side] + sellRefund(S, slot));
    S.events.push({ type: 'sell', x: slot.x, y: slot.y, side });
    // guards from a sold post disband via the orphan check in step()
    slot.type = null; slot.lvl = 1; slot.cd = 0; slot.prodCd = 0; slot.hp = 0; slot.spent = 0;
    slot.chTgt = null; slot.chT = 0;
    return true;
  }
  if (action.kind !== 'build') return false;
  if (!buildOptions(S, side, action.slot).includes(action.type)) return false;
  if (action.type === 'lvl') {
    const cost = lvlCost(S, slot);
    if (S.money[side] < cost) return false;
    S.money[side] -= cost;
    slot.spent += cost;
    slot.lvl++;
    if (demolishable(slot.type)) slot.hp = S.cfg.TOWER_HP * lvlPower(S, slot);
    return true;
  }
  const cost = costOf(S, side, action.type);
  if (S.money[side] < cost) return false;
  S.money[side] -= cost;
  slot.spent += cost;
  slot.type = action.type;
  slot.lvl = 1;
  slot.cd = 0;
  slot.hp = demolishable(action.type) ? S.cfg.TOWER_HP : 0;
  if (S.cfg.PRODUCTION[action.type]) {
    slot.prodCd = S.cfg.PRODUCTION[action.type].interval;
  }
  if (action.type === 'guard') {
    // the squad musters immediately; the respawn timer covers replacements
    for (let i = 0; i < S.cfg.GUARD.count; i++) spawnGuard(S, side, action.slot);
    slot.prodCd = S.cfg.GUARD.respawn;
  }
  return true;
}

function musterSpot(S, side) {
  // behind own nest, inside the lane
  const x = S.cfg.LANE_CX + (S.rng() * 2 - 1) * (S.cfg.LANE_HALF - 6);
  const y = side === 'p' ? 600 + S.rng() * 30 : 40 - S.rng() * 30;
  return { x, y };
}

function siegeSpot(u, nest) {
  const from = u.side === 'p' ? 1 : -1;
  const a = (Math.PI / 2) * from + (u.seed / 10 - 0.5) * 2.4;
  const rr = nest.r + u.r + 4 + (u.seed % 1) * 10;
  return { x: nest.x + Math.cos(a) * rr, y: nest.y + Math.sin(a) * rr * 0.8 };
}

function spawnUnit(S, side, unitKey, at) {
  const t = S.cfg.UNITS[unitKey];
  const sp = at || musterSpot(S, side);
  const u = {
    side, typeKey: unitKey,
    x: sp.x, y: sp.y,
    hp: t.hp, spd: t.spd, dps: t.dps, r: t.r,
    seed: S.rng() * 10,
    // trickle units skip the muster: they march the moment they hatch, and a
    // drumless faction breeds nothing else - a muster with no beat never moves
    state: (t.trickle || !faction(S, side).drum) ? 'march' : 'muster', // muster -> march -> siege (predators: -> hunt)
    sx: 0, sy: 0,
    slowed: false,
  };
  if (unitKey === 'predator') {
    // hold point just past the midline on the owner's side, mirrored so
    // mirror matches stay symmetric (midline maps to itself under y'=640-y)
    const mid = (S.cfg.ENEMY_BASE.y + S.cfg.PLAYER_BASE.y) / 2;
    const off = S.cfg.PREDATOR.holdNear + S.rng() * (S.cfg.PREDATOR.holdFar - S.cfg.PREDATOR.holdNear);
    u.hy = side === 'p' ? mid + off : mid - off;
  }
  S.units.push(u);
  S.hatched[side][unitKey]++;
}

// guard-post defenders: they hold a rally point on the lane beside their
// post and intercept attackers instead of marching (state 'guard')
function spawnGuard(S, side, slotIdx) {
  const cfg = S.cfg, slot = S.slots[side][slotIdx];
  const t = cfg.UNITS.guard, k = lvlPower(S, slot);
  const ax = Math.max(cfg.LANE_CX - cfg.LANE_HALF + 8,
    Math.min(cfg.LANE_CX + cfg.LANE_HALF - 8, slot.x));
  S.units.push({
    side, typeKey: 'guard',
    x: slot.x, y: slot.y,
    hp: t.hp * k, maxHp: t.hp * k, spd: t.spd, dps: t.dps * k, r: t.r,
    seed: S.rng() * 10,
    state: 'guard',
    ax, ay: slot.y, srcSlot: slotIdx,
    sx: 0, sy: 0,
    slowed: false,
  });
}

function destroySlot(S, side, slot) {
  S.events.push({ type: 'towerfall', x: slot.x, y: slot.y, side, what: slot.type });
  const FL = S.cfg.FLYWHEEL;
  S.spin[side] = Math.max(FL.cold, S.spin[side] - FL.loss);
  slot.type = null; slot.lvl = 1; slot.cd = 0; slot.prodCd = 0; slot.hp = 0; slot.spent = 0;
  slot.chTgt = null; slot.chT = 0;
}

// ---------------------------------------------------------------- step ----
function step(S) {
  if (S.over) return;
  const cfg = S.cfg, dt = cfg.TICK;
  S.t += dt;

  if (!S.frenzy && S.t >= cfg.FRENZY_AT) { S.frenzy = true; S.events.push({ type: 'frenzy' }); }
  if (!S.decay && S.t >= cfg.DECAY_AT) { S.decay = true; S.events.push({ type: 'decay' }); }

  // the flywheel charges before income is taken: uptime, so a side with
  // nothing standing spins nothing up (a wiped machine has to be rebuilt
  // before it starts compounding again).
  for (const side of ['p', 'e']) {
    if (S.spin[side] >= cfg.FLYWHEEL.max) continue;
    if (S.slots[side].some(s => s.type)) {
      S.spin[side] = Math.min(cfg.FLYWHEEL.max, S.spin[side] + cfg.FLYWHEEL.rate * dt);
    }
  }
  for (const side of ['p', 'e']) {
    S.money[side] = Math.min(cfg.GOLD_CAP, S.money[side] + income(S, side) * dt);
  }

  const CR = cfg.CREEP;
  stepField(S, dt);

  // hatcheries produce into the muster; guard posts keep their squad manned
  for (const side of ['p', 'e']) {
    for (let i = 0; i < S.slots[side].length; i++) {
      const slot = S.slots[side][i];
      if (slot.type === 'guard') {
        let living = 0;
        for (const u of S.units) {
          if (u.side === side && u.state === 'guard' && u.srcSlot === i && u.hp > 0) living++;
        }
        if (living >= cfg.GUARD.count) {
          slot.prodCd = cfg.GUARD.respawn;   // timer starts at the first death
        } else {
          slot.prodCd -= dt;
          if (slot.prodCd <= 0) {
            spawnGuard(S, side, i);
            slot.prodCd = cfg.GUARD.respawn;
          }
        }
        continue;
      }
      const prod = cfg.PRODUCTION[slot.type];
      if (!prod) continue;
      slot.prodCd -= dt;
      if (slot.prodCd <= 0) {
        spawnUnit(S, side, prod.unit);
        slot.prodCd += prod.interval / lvlPower(S, slot);
      }
    }
  }

  // guards whose post is gone (sapped or respecced) disband
  for (const u of S.units) {
    if (u.state === 'guard' && S.slots[u.side][u.srcSlot].type !== 'guard') u.hp = 0;
  }

  // the war drums: each side beats on its own period (fx0.2). A pending
  // beat keeps its scheduled time; the CURRENT period applies from the
  // next scheduling on, so drum-shifters never retro-shift a beat.
  for (const side of ['p', 'e']) {
    const period = drumPeriod(S, side);
    if (period === null) continue;             // drumless faction: no beat
    if (S.t >= S.nextBeat[side]) {
      S.nextBeat[side] += period;
      for (const u of S.units) if (u.side === side && u.state === 'muster') u.state = 'march';
      S.events.push({ type: 'march', side });
    }
  }

  // sap auras: defender's sap towers slow attackers (speed and bite rate)
  for (const u of S.units) u.slowed = false;
  for (const side of ['p', 'e']) {
    const foe = other(side);
    for (const slot of S.slots[side]) {
      if (slot.type !== 'sap') continue;
      // higher-level saps slow harder (lower factor)
      const factor = cfg.TOWERS.sap.slow * Math.pow(0.78, slot.lvl - 1);
      for (const u of S.units) {
        if (u.side !== foe || u.state === 'muster' || u.state === 'guard') continue;
        if (Math.hypot(u.x - slot.x, u.y - slot.y) < cfg.TOWERS.sap.range) {
          u.slowed = Math.min(u.slowed || 1, factor);
        }
      }
    }
  }

  // paint underfoot: foes wade (slow) and blister (DoT) in proportion to the
  // intensity where they stand. Guards are included - paint lapping the nest
  // is defence-in-depth turned inside out; only the muster is exempt.
  for (const side of ['p', 'e']) {
    if (S.fieldSum[side] <= 0) continue;
    const foe = other(side);
    for (const u of S.units) {
      if (u.side !== foe || u.state === 'muster') continue;
      const k = fieldAt(S, side, u.x, u.y);
      if (k <= 0) continue;
      u.slowed = Math.min(u.slowed || 1, 1 + (CR.slow - 1) * k);
      u.hp -= CR.dot * k * dt;
    }
    // T6c PAINT_HEALS: the same ground knits your own bodies back together,
    // so ROT's paint is a field hospital as well as a minefield
    if (cfg.SPICE.heal > 0) {
      for (const u of S.units) {
        if (u.side !== side || u.state === 'muster') continue;
        const max = u.maxHp || cfg.UNITS[u.typeKey].hp;
        if (u.hp >= max) continue;
        const k = fieldAt(S, side, u.x, u.y);
        if (k > 0) u.hp = Math.min(max, u.hp + cfg.SPICE.heal * k * dt);
      }
    }
  }

  // march down the lane, then dig in and chew the enemy nest until killed.
  // v0.5 contact rules first: guards hunt attackers near their rally point;
  // an attacker with a guard in engage range halts and fights it instead of
  // advancing; sappers divert to enemy defence buildings and demolish them.
  for (const u of S.units) {
    if (u.state === 'muster') continue;

    const factor = u.slowed || 1;   // slowed holds the strongest sap factor
    const foe = other(u.side);

    if (u.state === 'guard') {
      let tgt = null, bestD = cfg.GUARD.leash;
      for (const v of S.units) {
        if (v.side !== foe || v.hp <= 0) continue;
        if (v.state !== 'march' && v.state !== 'siege') continue;
        const d = Math.hypot(v.x - u.ax, v.y - u.ay);
        if (d < bestD) { bestD = d; tgt = v; }
      }
      if (tgt) {
        const dx = tgt.x - u.x, dy = tgt.y - u.y, d = Math.hypot(dx, dy);
        if (d > u.r + tgt.r + 3) {
          u.x += (dx / d) * u.spd * dt;
          u.y += (dy / d) * u.spd * dt;
        } else {
          tgt.hp -= u.dps * dt;
        }
      } else {
        const dx = u.ax - u.x, dy = u.ay - u.y, d = Math.hypot(dx, dy);
        if (d > 2) {
          u.x += (dx / d) * u.spd * dt;
          u.y += (dy / d) * u.spd * dt;
        }
      }
      continue;
    }

    // predators deploy: march to the hold point, then hunt from it
    if (u.typeKey === 'predator' && u.state === 'march') {
      if (u.side === 'p' ? u.y <= u.hy : u.y >= u.hy) {
        u.state = 'hunt';
        u.ax = u.x; u.ay = u.hy;
      }
    }
    if (u.state === 'hunt') {
      // guard logic with a midfield anchor: hunt enemy marchers (and enemy
      // hunters) inside the leash, else drift home. Never hill, never towers.
      let tgt = null, bestD = cfg.PREDATOR.leash;
      for (const v of S.units) {
        if (v.side !== foe || v.hp <= 0) continue;
        if (v.state !== 'march' && v.state !== 'hunt') continue;
        const d = Math.hypot(v.x - u.ax, v.y - u.ay);
        if (d < bestD) { bestD = d; tgt = v; }
      }
      if (tgt) {
        const dx = tgt.x - u.x, dy = tgt.y - u.y, d = Math.hypot(dx, dy);
        if (d > u.r + tgt.r + 3) {
          u.x += (dx / d) * u.spd * factor * dt;
          u.y += (dy / d) * u.spd * factor * dt;
        } else {
          tgt.hp -= u.dps * factor * dt;
        }
      } else {
        const dx = u.ax - u.x, dy = u.ay - u.y, d = Math.hypot(dx, dy);
        if (d > 2) {
          u.x += (dx / d) * u.spd * factor * dt;
          u.y += (dy / d) * u.spd * factor * dt;
        }
      }
      continue;
    }

    // a guard in engage range stops this attacker cold (towers keep firing
    // at the held attacker - that's the guard's job); only attackers in
    // actual contact bite back, the rest just queue at the taunt ring.
    // Hunting predators hold ONLY the unit they are in contact with (a
    // wolf grabs one ant; the wave streams past) - no taunt ring, or one
    // predator would stall a whole march with nobody shooting at it.
    let g = null, gd = cfg.GUARD.engage;
    for (const v of S.units) {
      if (v.side !== foe || v.hp <= 0 || (v.state !== 'guard' && v.state !== 'hunt')) continue;
      const d = Math.hypot(v.x - u.x, v.y - u.y);
      const reach = v.state === 'guard' ? cfg.GUARD.engage : u.r + v.r + 4;
      if (d < reach && d < gd) { gd = d; g = v; }
    }
    if (g) {
      if (gd < u.r + g.r + 4) g.hp -= u.dps * factor * dt;
      continue;
    }

    // sappers divert to the nearest enemy building in sight - any of them
    if (u.typeKey === 'sapper' && u.state === 'march') {
      const spec = cfg.UNITS.sapper;
      let ts = null, td = spec.sight;
      for (const slot of S.slots[foe]) {
        if (!slot.type) continue;
        const d = Math.hypot(slot.x - u.x, slot.y - u.y);
        if (d < td) { td = d; ts = slot; }
      }
      if (ts) {
        if (td > 18) {
          u.x += ((ts.x - u.x) / td) * u.spd * factor * dt;
          u.y += ((ts.y - u.y) / td) * u.spd * factor * dt;
        } else {
          ts.hp -= spec.vsTower * factor * dt;
          if (ts.hp <= 0) destroySlot(S, foe, ts);
        }
        continue;
      }
    }

    const nest = u.side === 'p' ? cfg.ENEMY_BASE : cfg.PLAYER_BASE;
    if (u.state === 'march') {
      u.y += (u.side === 'p' ? -1 : 1) * u.spd * factor * dt;
      if (Math.hypot(u.x - nest.x, u.y - nest.y) < cfg.SIEGE_DIST) {
        u.state = 'siege';
        const sp = siegeSpot(u, nest);
        u.sx = sp.x; u.sy = sp.y;
      }
    } else {
      const dx = u.sx - u.x, dy = u.sy - u.y;
      const d = Math.hypot(dx, dy);
      if (d > 3) {
        u.x += (dx / d) * u.spd * factor * dt;
        u.y += (dy / d) * u.spd * factor * dt;
      } else {
        S.baseHP[other(u.side)] -= u.dps * factor * dt;
      }
    }
  }

  // towers fire at the nearest marching/besieging foe in range
  for (const side of ['p', 'e']) {
    const foe = other(side);
    for (const slot of S.slots[side]) {
      const spec = cfg.TOWERS[slot.type];
      if (!spec || !spec.dmg) continue;
      slot.cd -= dt;
      if (slot.cd > 0) continue;
      let best = null, bestD = spec.range;
      for (const u of S.units) {
        if (u.side !== foe || u.hp <= 0 || u.state === 'muster' || u.state === 'guard') continue;
        const d = Math.hypot(u.x - slot.x, u.y - slot.y);
        if (d < bestD) { bestD = d; best = u; }
      }
      if (best) {
        const dmg = spec.dmg * lvlPower(S, slot);
        if (spec.splash) {
          for (const u of S.units) {
            if (u.side !== foe || u.hp <= 0 || u.state === 'muster' || u.state === 'guard') continue;
            if (Math.hypot(u.x - best.x, u.y - best.y) <= spec.splash) u.hp -= dmg;
          }
        } else {
          best.hp -= dmg;
        }
        slot.cd = spec.cooldown;
        S.shots.push({ x1: slot.x, y1: slot.y - 14, x2: best.x, y2: best.y, ttl: 0.09, splash: spec.splash || 0 });
      }
    }
  }

  // mortars lob at the nearest enemy defence building; they never touch
  // units or the hill (the reverse-sapper: siege from your own side)
  for (const side of ['p', 'e']) {
    const foe = other(side);
    for (const slot of S.slots[side]) {
      if (slot.type !== 'mortar') continue;
      const spec = cfg.TOWERS.mortar;
      slot.cd -= dt;
      if (slot.cd > 0) continue;
      let best = null, bestD = spec.range;
      for (const ts of S.slots[foe]) {
        if (!ts.type || !demolishable(ts.type)) continue;
        const d = Math.hypot(ts.x - slot.x, ts.y - slot.y);
        if (d < bestD) { bestD = d; best = ts; }
      }
      if (!best) continue;       // nothing to bombard: hold fire
      best.hp -= spec.bomb * lvlPower(S, slot);
      slot.cd = spec.cooldown;
      S.shots.push({ x1: slot.x, y1: slot.y - 10, x2: best.x, y2: best.y, ttl: 0.5, mortar: true });
      S.events.push({ type: 'mortar', x: best.x, y: best.y, side: foe });
      if (best.hp <= 0) destroySlot(S, foe, best);
    }
  }

  // the mat eats walls: a foe building corrodes at the intensity it stands
  // in, and paint lapping the foe HILL's rim strangles it.
  for (const side of ['p', 'e']) {
    if (S.fieldSum[side] <= 0) continue;
    const foe = other(side);
    for (const slot of S.slots[foe]) {
      if (!slot.type || !demolishable(slot.type)) continue;
      const k = fieldAt(S, side, slot.x, slot.y);
      if (k <= 0) continue;
      slot.hp -= CR.corrode * k * dt;
      if (slot.hp <= 0) destroySlot(S, foe, slot);
    }
    S.baseHP[foe] -= CR.hillDps * hillLap(S, side) * dt;
  }

  // converters channel the nearest enemy attacker in range and flip it:
  // the ant walks home and marches with its NEW side's next drum. The three
  // load-bearing guards (see README v1.0 design): one target at a time
  // (throughput-limited - chaff saturates it), the channel is interruptible
  // (death, leaving range, or losing the tower resets progress), and a
  // converted ant can never be converted again (no ping-pong).
  for (const side of ['p', 'e']) {
    const foe = other(side);
    const spec = cfg.TOWERS.conv;
    for (const slot of S.slots[side]) {
      if (slot.type !== 'conv') continue;
      const convertible = v =>
        v.side === foe && v.hp > 0 && !v.conv &&
        (v.state === 'march' || v.state === 'siege') &&
        Math.hypot(v.x - slot.x, v.y - slot.y) < spec.range;
      // sticky target: re-aiming mid-channel would reset progress forever
      if (!slot.chTgt || !convertible(slot.chTgt)) {
        slot.chTgt = null;
        slot.chT = 0;
        let best = null, bestD = spec.range;
        for (const v of S.units) {
          if (v.side !== foe || v.hp <= 0 || v.conv) continue;
          if (v.state !== 'march' && v.state !== 'siege') continue;
          const d = Math.hypot(v.x - slot.x, v.y - slot.y);
          if (d < bestD) { bestD = d; best = v; }
        }
        slot.chTgt = best;
      }
      if (!slot.chTgt) continue;
      slot.chT += dt;
      if (slot.chT < spec.channel / lvlPower(S, slot)) continue;
      const u = slot.chTgt;
      u.side = side;
      u.conv = true;
      // the charm wears off: big hosts resist it (v-fork gripe fix). Higher
      // charmer levels hold the charm longer as well as channelling faster.
      u.charmT = Math.max(spec.charmMin, spec.charmHpSec / cfg.UNITS[u.typeKey].hp) * lvlPower(S, slot);
      // it about-faces on the spot and fights at once: no walk home to the
      // muster, and no protection on the way - a convert is shootable now
      u.state = 'march';
      u.hp = cfg.UNITS[u.typeKey].hp;   // restored in full: conversion value
                                        // scales with unit SIZE, not with
                                        // whatever hp the wall left it
      // predators keep a side-relative hold point: mirror it with the flip
      if (u.typeKey === 'predator') u.hy = (cfg.ENEMY_BASE.y + cfg.PLAYER_BASE.y) - u.hy;
      S.converted[side]++;
      S.events.push({ type: 'convert', x: u.x, y: u.y, side });
      slot.chTgt = null;
      slot.chT = 0;
    }
  }

  // charms wear off: the ant comes to its senses wherever it stands and
  // marches on for its ORIGINAL army from there - the same U-turn as the
  // flip. It keeps its current hp and its convert-once immunity.
  for (const u of S.units) {
    if (!(u.charmT > 0)) continue;
    u.charmT -= dt;
    if (u.charmT > 0) continue;
    u.charmT = 0;
    const home = other(u.side);
    u.side = home;
    u.state = 'march';
    if (u.typeKey === 'predator') u.hy = (cfg.ENEMY_BASE.y + cfg.PLAYER_BASE.y) - u.hy;
    S.events.push({ type: 'revert', x: u.x, y: u.y, side: home });
  }

  for (const u of S.units) {
    if (u.hp <= 0) S.events.push({ type: 'death', x: u.x, y: u.y, side: u.side, big: u.typeKey === 'major' });
  }
  // corpse-splats: a dead shambler bursts paint where it falls, wherever that
  // is - deep splats simply fade if nothing keeps feeding them
  for (const u of S.units) {
    if (u.hp > 0 || u.typeKey !== 'shambler') continue;
    S.events.push({ type: 'splat', x: u.x, y: u.y, side: u.side });
    paintAt(S, S.field[u.side], u.x, u.y, CR.splat);
  }
  // T6c PAINT_EATS_CORPSES: anything that dies on paint is digested by the
  // owner of that ground - friend or foe, which is what makes the paint want
  // a battle fought on top of it
  if (cfg.SPICE.corpseGold > 0) {
    for (const u of S.units) {
      if (u.hp > 0) continue;
      for (const side of ['p', 'e']) {
        const k = fieldAt(S, side, u.x, u.y);
        if (k > 0) S.money[side] = Math.min(cfg.GOLD_CAP, S.money[side] + cfg.SPICE.corpseGold * k);
      }
    }
  }
  S.units = S.units.filter(u => u.hp > 0);
  for (const sh of S.shots) sh.ttl -= dt;
  S.shots = S.shots.filter(sh => sh.ttl > 0);

  if (S.decay) {
    S.baseHP.p -= cfg.DECAY_RATE * dt;
    S.baseHP.e -= cfg.DECAY_RATE * dt;
  }

  const pDead = S.baseHP.p <= 0, eDead = S.baseHP.e <= 0;
  if (pDead || eDead || S.t >= cfg.HARD_END) {
    if (pDead && eDead) S.result = 'draw';
    else if (eDead) S.result = 'p';
    else if (pDead) S.result = 'e';
    else S.result = S.baseHP.p > S.baseHP.e ? 'p' : (S.baseHP.p < S.baseHP.e ? 'e' : 'draw');
    S.endT = S.t;
    S.over = true;
  }
}

// --------------------------------------------------------- headless run ----
// ctrlP/ctrlE: (state, side) => array of actions (or null/undefined)
function playMatch(ctrlP, ctrlE, seed, overrides) {
  const S = createState(seed, overrides);
  while (!S.over) {
    // both controllers read the same pre-action state (no first-mover info)
    const ap = ctrlP(S, 'p');
    const ae = ctrlE(S, 'e');
    if (ap) for (const a of ap) applyAction(S, 'p', a);
    if (ae) for (const a of ae) applyAction(S, 'e', a);
    step(S);
    S.shots.length = 0;          // headless: nobody renders these
    S.events.length = 0;
  }
  return {
    result: S.result, t: S.endT,
    hpP: S.baseHP.p, hpE: S.baseHP.e,
    hatchedP: S.hatched.p, hatchedE: S.hatched.e,
    convertedP: S.converted.p, convertedE: S.converted.e,
    creepAdvP: creepAdvance(S, 'p'), creepAdvE: creepAdvance(S, 'e'),
    spinP: S.spin.p, spinE: S.spin.e,
  };
}

return {
  CONFIG, createState, applyAction, step, playMatch, buildOptions,
  count, familyCount, income, musterCount, other, mulberry32,
  lvlCost, lvlPower, sellRefund, drumPeriod, creepHome, creepAdvance,
  fieldCol, fieldRow, faction, costOf,
  demolishable, LEVELABLE, FAMILIES, FACTIONS,
};
});
