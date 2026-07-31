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

  // buildings: empty slot -> farm | tower | hatch; then one upgrade tree each
  COSTS: {
    farm: 80, grove: 90, plant: 120,
    tower: 100, sharp: 120, spit: 120, sap: 100, guard: 110, mortar: 220, conv: 160,
    hatch: 90, swarmb: 70, soldierb: 80, majorb: 130, sapperb: 110, predatorb: 100,
    hornb: 100, fifeb: 80,
  },
  UPGRADE_TREE: {
    farm:  ['grove'],
    grove: ['plant'],
    tower: ['sharp', 'spit', 'sap', 'guard', 'mortar', 'conv'],
    hatch: ['swarmb', 'soldierb', 'majorb', 'sapperb', 'predatorb', 'hornb', 'fifeb'],
  },
  // specialised broods and towers can then level to 2 and 3: the late-game
  // gold sink. Costs scale superlinearly with power on purpose - concentrated
  // stats beat distributed ones against throughput-limited towers.
  MAX_LVL: 3,
  LVL_COST_MULT: { 2: 1.5, 3: 2.5 },   // of the building's base cost
  LVL_POWER: 1.5,                       // per level: production rate / tower dmg
  INCOME_BY_TYPE: { farm: 2.5, grove: 5, plant: 8 },
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
  },
  FRENZY_AT: 240,
  DECAY_AT: 330,
  HARD_END: 420,
  DECAY_RATE: 4,

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
      p: { worker: 0, soldier: 0, major: 0, sapper: 0, predator: 0 },
      e: { worker: 0, soldier: 0, major: 0, sapper: 0, predator: 0 },
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
  slot.spent = S.cfg.COSTS[type];
  for (let l = 2; l <= slot.lvl; l++) slot.spent += Math.round(S.cfg.COSTS[type] * S.cfg.LVL_COST_MULT[l]);
  slot.hp = FAMILIES.def.includes(type) ? S.cfg.TOWER_HP * lvlPower(S, slot) : 0;
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
  eco: ['farm', 'grove', 'plant'],
  def: ['tower', 'sharp', 'spit', 'sap', 'guard', 'mortar', 'conv'],
  off: ['hatch', 'swarmb', 'soldierb', 'majorb', 'sapperb', 'predatorb'],
};
function familyCount(S, side, family) {
  const fams = FAMILIES[family];
  let n = 0;
  for (const s of S.slots[side]) if (s.type && fams.includes(s.type)) n++;
  return n;
}
function income(S, side) {
  let inc = S.cfg.BASE_INCOME;
  for (const s of S.slots[side]) inc += S.cfg.INCOME_BY_TYPE[s.type] || 0;
  return inc * (S.frenzy ? 2 : 1);
}
function musterCount(S, side) {
  let n = 0;
  for (const u of S.units) if (u.side === side && u.state === 'muster') n++;
  return n;
}
const LEVELABLE = ['sharp', 'spit', 'sap', 'guard', 'mortar', 'conv', 'swarmb', 'soldierb', 'majorb', 'sapperb', 'predatorb', 'hornb', 'fifeb'];
// levels speed a drum-shifter's PRODUCTION like any brood; the beat delta
// stays one step per building, so the metronome is read by counting them
function drumPeriod(S, side) {
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
  if (slot.type === null) return ['farm', 'tower', 'hatch'];
  const tree = S.cfg.UPGRADE_TREE[slot.type];
  if (tree) return tree;
  if (LEVELABLE.includes(slot.type) && slot.lvl < S.cfg.MAX_LVL) return ['lvl'];
  return [];
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
    if (FAMILIES.def.includes(slot.type)) slot.hp = S.cfg.TOWER_HP * lvlPower(S, slot);
    return true;
  }
  const cost = S.cfg.COSTS[action.type];
  if (S.money[side] < cost) return false;
  S.money[side] -= cost;
  slot.spent += cost;
  slot.type = action.type;
  slot.lvl = 1;
  slot.cd = 0;
  slot.hp = FAMILIES.def.includes(action.type) ? S.cfg.TOWER_HP : 0;
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

function spawnUnit(S, side, unitKey) {
  const t = S.cfg.UNITS[unitKey];
  const sp = musterSpot(S, side);
  const u = {
    side, typeKey: unitKey,
    x: sp.x, y: sp.y,
    hp: t.hp, spd: t.spd, dps: t.dps, r: t.r,
    seed: S.rng() * 10,
    state: 'muster',             // muster -> march -> siege (predators: -> hunt)
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
  S.events.push({ type: 'towerfall', x: slot.x, y: slot.y, side });
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

  for (const side of ['p', 'e']) {
    S.money[side] = Math.min(cfg.GOLD_CAP, S.money[side] + income(S, side) * dt);
  }

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
    if (S.t >= S.nextBeat[side]) {
      S.nextBeat[side] += drumPeriod(S, side);
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
        if (u.side !== foe || u.state === 'muster' || u.state === 'guard' || u.state === 'return') continue;
        if (Math.hypot(u.x - slot.x, u.y - slot.y) < cfg.TOWERS.sap.range) {
          u.slowed = Math.min(u.slowed || 1, factor);
        }
      }
    }
  }

  // march down the lane, then dig in and chew the enemy nest until killed.
  // v0.5 contact rules first: guards hunt attackers near their rally point;
  // an attacker with a guard in engage range halts and fights it instead of
  // advancing; sappers divert to enemy defence buildings and demolish them.
  for (const u of S.units) {
    if (u.state === 'muster') continue;

    // freshly converted ants walk home and join the next drum; nothing
    // engages them on the way (they read as part of the muster)
    if (u.state === 'return') {
      const dx = u.sx - u.x, dy = u.sy - u.y, d = Math.hypot(dx, dy);
      if (d > 4) {
        u.x += (dx / d) * u.spd * dt;
        u.y += (dy / d) * u.spd * dt;
      } else {
        u.state = 'muster';
      }
      continue;
    }

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

    // sappers divert to the nearest enemy defence building in sight
    if (u.typeKey === 'sapper' && u.state === 'march') {
      const spec = cfg.UNITS.sapper;
      let ts = null, td = spec.sight;
      for (const slot of S.slots[foe]) {
        if (!slot.type || !FAMILIES.def.includes(slot.type)) continue;
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
        if (u.side !== foe || u.hp <= 0 || u.state === 'muster' || u.state === 'guard' || u.state === 'return') continue;
        const d = Math.hypot(u.x - slot.x, u.y - slot.y);
        if (d < bestD) { bestD = d; best = u; }
      }
      if (best) {
        const dmg = spec.dmg * lvlPower(S, slot);
        if (spec.splash) {
          for (const u of S.units) {
            if (u.side !== foe || u.hp <= 0 || u.state === 'muster' || u.state === 'guard' || u.state === 'return') continue;
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
        if (!ts.type || !FAMILIES.def.includes(ts.type)) continue;
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
      u.state = 'return';
      u.hp = cfg.UNITS[u.typeKey].hp;   // restored in full: conversion value
                                        // scales with unit SIZE, not with
                                        // whatever hp the wall left it
      const sp = musterSpot(S, side);
      u.sx = sp.x; u.sy = sp.y;
      // predators keep a side-relative hold point: mirror it with the flip
      if (u.typeKey === 'predator') u.hy = (cfg.ENEMY_BASE.y + cfg.PLAYER_BASE.y) - u.hy;
      S.converted[side]++;
      S.events.push({ type: 'convert', x: u.x, y: u.y, side });
      slot.chTgt = null;
      slot.chT = 0;
    }
  }

  // charms wear off: the ant comes to its senses wherever it stands, walks
  // home unengaged and rejoins its ORIGINAL army's next drum. It keeps its
  // current hp and its convert-once immunity - no heal, no ping-pong.
  for (const u of S.units) {
    if (!(u.charmT > 0)) continue;
    u.charmT -= dt;
    if (u.charmT > 0) continue;
    u.charmT = 0;
    const home = other(u.side);
    u.side = home;
    u.state = 'return';
    const sp = musterSpot(S, home);
    u.sx = sp.x; u.sy = sp.y;
    if (u.typeKey === 'predator') u.hy = (cfg.ENEMY_BASE.y + cfg.PLAYER_BASE.y) - u.hy;
    S.events.push({ type: 'revert', x: u.x, y: u.y, side: home });
  }

  for (const u of S.units) {
    if (u.hp <= 0) S.events.push({ type: 'death', x: u.x, y: u.y, side: u.side, big: u.typeKey === 'major' });
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
  };
}

return {
  CONFIG, createState, applyAction, step, playMatch, buildOptions,
  count, familyCount, income, musterCount, other, mulberry32,
  lvlCost, lvlPower, sellRefund, drumPeriod, LEVELABLE, FAMILIES,
};
});
