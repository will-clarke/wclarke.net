// Ant War simulation core. Pure rules: no rendering, no wall-clock, no
// Math.random - a seeded RNG and a fixed timestep make every match
// deterministic and replayable. Runs in the browser as a plain script
// (window.AntWarSim) and in Node via require() for the tuning harness.
//
// v1.0 "the clash": massive simplification (Will's 2026-08-05 brief).
// One roster for everyone, 7 buildings, 4 units. Two rules replaced the
// v0.5-v0.9.5 special-case zoo (guards, predators, mortars, converters,
// sap auras - all cut):
//   1. Ants FIGHT what they meet. Opposing ants in contact stop and bite;
//      marchers seek nearby enemies; mustering ants defend their nest.
//   2. Assassins are the exception: they ignore ants, ants ignore them,
//      and only towers can hit them. They walk through the war and chew
//      the hill. Sappers crack the towers open; assassins slip through.
// Every player decision is still a build, an upgrade, or a sell.
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

  // battlefield variants: same rules, different roads. Each lane is a list
  // of PLAYER-side waypoints (own base toward the enemy); the enemy walks
  // the y-mirror. Waypoint y-pairs sum to 640 so both armies march the same
  // drawn corridor. Slots keep the classic role order (0-1 nest guards,
  // 2-3 mid flank, 4-5 rear eco, 6-7 forward outposts) so policies transfer
  // unchanged; the enemy side is auto-mirrored. clash keeps lanes:[[]] and
  // slots:null = the exact legacy geometry/code path above (no re-tuning).
  MAP: 'clash',
  MAPS: {
    clash: { label: 'Clash', sub: 'one lane', laneHalf: 34, lanes: [[]], slots: null },
    pincer: {
      label: 'Pincer', sub: 'two lanes', laneHalf: 24,
      lanes: [
        [{ x: 120, y: 465 }, { x: 120, y: 175 }],
        [{ x: 300, y: 465 }, { x: 300, y: 175 }],
      ],
      slots: [
        { x: 95,  y: 505 }, { x: 325, y: 505 },
        { x: 75,  y: 400 }, { x: 345, y: 400 },
        { x: 40,  y: 585 }, { x: 380, y: 585 },
        { x: 160, y: 350 }, { x: 260, y: 350 },
      ],
    },
    trident: {
      label: 'Trident', sub: 'three lanes', laneHalf: 22,
      lanes: [
        [{ x: 70, y: 520 }, { x: 70, y: 120 }],
        [],
        [{ x: 350, y: 520 }, { x: 350, y: 120 }],
      ],
      slots: [
        { x: 140, y: 485 }, { x: 280, y: 485 },
        { x: 140, y: 405 }, { x: 280, y: 405 },
        { x: 40,  y: 585 }, { x: 380, y: 585 },
        { x: 110, y: 350 }, { x: 310, y: 350 },
      ],
    },
    hourglass: {
      label: 'Hourglass', sub: 'crossing lanes', laneHalf: 26,
      lanes: [
        [{ x: 130, y: 465 }, { x: 210, y: 320 }, { x: 130, y: 175 }],
        [{ x: 290, y: 465 }, { x: 210, y: 320 }, { x: 290, y: 175 }],
      ],
      slots: [
        { x: 110, y: 510 }, { x: 310, y: 510 },
        { x: 105, y: 420 }, { x: 315, y: 420 },
        { x: 45,  y: 555 }, { x: 375, y: 555 },
        { x: 140, y: 355 }, { x: 280, y: 355 },
      ],
    },
  },

  // balance
  BASE_HP: 240,
  START_MONEY: 220,
  SELL_REFUND: 0.7,              // fraction of a slot's total spend returned on sell
  BASE_INCOME: 4,
  GOLD_CAP: 400,                 // income above this is wasted (anti-idle nudge)
  WAR_DRUM: 18,                  // both musters march every N seconds

  // buildings: empty slot -> farm | tower | hatch
  COSTS: {
    farm: 80,
    tower: 100, sharp: 120, spit: 120, amber: 110,
    hatch: 90, soldierb: 80, assassinb: 120, sapperb: 100,
  },
  UPGRADE_TREE: {
    tower: ['sharp', 'spit', 'amber'],
    hatch: ['soldierb', 'assassinb', 'sapperb'],
  },
  MAX_LVL: 3,
  LVL_COST_MULT: { 2: 1.5, 3: 2.5 },   // of the building's base cost
  LVL_POWER: 1.5,                       // per level: tower dmg / production rate
  // farms level in place (the old farm->grove->plantation chain, one slot)
  FARM_INCOME: { 1: 2.5, 2: 5, 3: 8 },
  // soldier broods level differently: same rate, BIGGER soldiers - the
  // concentration axis (a lvl-3 soldier is the old major). The hp curve is
  // pinched between two failure modes: at 1.75 it outran the tower level
  // curve (LVL_POWER 1.5) so far that nothing countered a levelled soldier
  // line, at 1.5 the greed persona's giant identity collapsed. 1.6 is the
  // measured knee.
  SOLDIER_LVL: { hp: 1.6, dps: 1.35, spd: 0.88, r: 1.22 },
  PRODUCTION: {
    hatch:     { unit: 'worker',   interval: 6 },
    soldierb:  { unit: 'soldier',  interval: 9 },
    assassinb: { unit: 'assassin', interval: 9 },
    sapperb:   { unit: 'sapper',   interval: 10 },
  },
  // broods whose LEVELS speed production (hatch = the swarm play);
  // soldierb instead upgrades the unit itself via SOLDIER_LVL
  RATE_LVL: ['hatch', 'assassinb', 'sapperb'],
  TOWERS: {
    tower: { range: 130, dmg: 6,  cooldown: 0.4 },
    sharp: { range: 175, dmg: 34, cooldown: 1.5 },
    spit:  { range: 105, dmg: 5,  cooldown: 0.45, splash: 28 },
    // amber never shoots (dmg absent = skipped by the fire pass): every
    // enemy in range crawls at the slow factor. A pure force-multiplier -
    // worthless alone, and the only tower that helps against assassins
    // without itself dealing the damage. Levels deepen the slow; the
    // strongest single slow applies, slows NEVER stack.
    amber: { range: 150, slow: { 1: 0.45, 2: 0.35, 3: 0.25 } },
  },
  TOWER_HP: 130,
  // the clash: fighters seek enemies within `seek` while marching/sieging;
  // mustering ants defend against enemies within `defend` of themselves.
  // Contact (actual biting) is r+r+4. Seek is deliberately small: armies
  // clash where they meet, they don't magnet across the field. Defend
  // covers the nest approach but NOT the whole tower line - a defence
  // stacked three layers deep (clash + towers + fresh muster) made every
  // siege stall to the decay wire.
  MELEE: { seek: 46, defend: 110 },
  UNITS: {
    worker:  { hp: 10,  spd: 66, dps: 2.5, r: 4.2 },
    soldier: { hp: 62,  spd: 52, dps: 6.5, r: 6.0 },
    // assassins never fight ants and ants never fight them; only towers
    // hit them. Pure hill pressure - the reason armies alone can't win.
    // 40hp = survives a lvl-1 sharp shot and ~2.7s of one plain tower's
    // fire. Both edges of this knob are cliffs: at 26 any single tower
    // deleted them mid-crossing (the stalemate valve never fired), at 56
    // a levelled brood out-shipped a whole tower's dps and sapper+assassin
    // attrition beat the entire field.
    assassin: { hp: 40, spd: 60, dps: 4.5, r: 4.4, ghost: true },
    // sappers divert to enemy defence buildings in sight and demolish them;
    // they never seek melee but bite back on contact (soldiers eat them).
    // sight must stay near sharp range (175) or they wade through sharp
    // fire blind before they can even pick a target
    sapper:  { hp: 62,  spd: 50, dps: 3,   r: 5.0, vsTower: 22, sight: 160 },
  },
  // the match clock, compressed for the clash world: armies annihilating
  // mid-lane means far less incidental hill chip than pass-through had,
  // so the walls-vs-walls grind needs the decay race to arrive sooner
  FRENZY_AT: 180,
  DECAY_AT: 240,
  HARD_END: 330,
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
  const mapDef = cfg.MAPS[cfg.MAP] || cfg.MAPS.clash;
  const mirrorPt = pt => ({ x: pt.x, y: cfg.PLAYER_BASE.y + cfg.ENEMY_BASE.y - pt.y });
  // spent tracks all gold sunk into the slot (build + upgrades) for refunds
  const slotRow = pos => ({ x: pos.x, y: pos.y, type: null, lvl: 1, cd: 0, prodCd: 0, hp: 0, spent: 0 });
  const S = {
    cfg,
    seed: seed >>> 0,
    rng: mulberry32(seed >>> 0),
    t: 0,
    frenzy: false,
    decay: false,
    nextBeat: cfg.WAR_DRUM,
    money: { p: cfg.START_MONEY, e: cfg.START_MONEY },
    baseHP: { p: cfg.BASE_HP, e: cfg.BASE_HP },
    slots: {
      p: (mapDef.slots || cfg.PLAYER_SLOTS).map(slotRow),
      e: (mapDef.slots ? mapDef.slots.map(mirrorPt) : cfg.ENEMY_SLOTS).map(slotRow),
    },
    map: {
      key: cfg.MAPS[cfg.MAP] ? cfg.MAP : 'clash',
      laneHalf: mapDef.laneHalf,
      lanes: mapDef.lanes,
      paths: { p: mapDef.lanes, e: mapDef.lanes.map(path => path.map(mirrorPt)) },
    },
    laneNext: { p: 0, e: 0 },    // round-robin lane assignment per side
    units: [],
    shots: [],                   // presentational, consumed by the renderer
    events: [],                  // presentational, consumed by the renderer
    hatched: {                   // lifetime production tally (reaction reads)
      p: { worker: 0, soldier: 0, assassin: 0, sapper: 0 },
      e: { worker: 0, soldier: 0, assassin: 0, sapper: 0 },
    },
    over: false,
    result: null,                // 'p' | 'e' | 'draw'
    endT: 0,
  };
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
  if (S.cfg.PRODUCTION[type]) slot.prodCd = prodInterval(S, slot);
}

// ------------------------------------------------------------- queries ----
function count(S, side, type) {
  let n = 0;
  for (const s of S.slots[side]) if (s.type === type) n++;
  return n;
}
const FAMILIES = {
  eco: ['farm'],
  def: ['tower', 'sharp', 'spit', 'amber'],
  off: ['hatch', 'soldierb', 'assassinb', 'sapperb'],
};
function familyCount(S, side, family) {
  const fams = FAMILIES[family];
  let n = 0;
  for (const s of S.slots[side]) if (s.type && fams.includes(s.type)) n++;
  return n;
}
function income(S, side) {
  let inc = S.cfg.BASE_INCOME;
  for (const s of S.slots[side]) if (s.type === 'farm') inc += S.cfg.FARM_INCOME[s.lvl];
  return inc * (S.frenzy ? 2 : 1);
}
function musterCount(S, side) {
  let n = 0;
  for (const u of S.units) if (u.side === side && u.state === 'muster') n++;
  return n;
}
const LEVELABLE = ['farm', 'hatch', 'sharp', 'spit', 'amber', 'soldierb', 'assassinb', 'sapperb'];
function lvlPower(S, slot) {
  return Math.pow(S.cfg.LVL_POWER, (slot.lvl || 1) - 1);
}
function prodInterval(S, slot) {
  const base = S.cfg.PRODUCTION[slot.type].interval;
  return S.cfg.RATE_LVL.includes(slot.type) ? base / lvlPower(S, slot) : base;
}
function lvlCost(S, slot) {
  return Math.round(S.cfg.COSTS[slot.type] * S.cfg.LVL_COST_MULT[(slot.lvl || 1) + 1]);
}
// legal build/upgrade types for this slot: empty -> the three roots;
// tower/hatch -> their specialisations; anything levelable also offers 'lvl'
function buildOptions(S, side, slotIdx) {
  const slot = S.slots[side][slotIdx];
  if (!slot) return [];
  if (slot.type === null) return ['farm', 'tower', 'hatch'];
  const out = (S.cfg.UPGRADE_TREE[slot.type] || []).slice();
  if (LEVELABLE.includes(slot.type) && slot.lvl < S.cfg.MAX_LVL) out.push('lvl');
  return out;
}

// ------------------------------------------------------------- actions ----
// action kinds: {kind:'build', slot:i, type:<building>|'lvl'} | {kind:'sell', slot:i}
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
    slot.type = null; slot.lvl = 1; slot.cd = 0; slot.prodCd = 0; slot.hp = 0; slot.spent = 0;
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
  return true;
}

function musterSpot(S, side) {
  // behind own nest, inside the centre column (armies fan out to their
  // lanes on the march)
  const x = S.cfg.LANE_CX + (S.rng() * 2 - 1) * (S.map.laneHalf - 6);
  const y = side === 'p' ? 600 + S.rng() * 30 : 40 - S.rng() * 30;
  return { x, y };
}

function siegeSpot(u, nest) {
  const from = u.side === 'p' ? 1 : -1;
  const a = (Math.PI / 2) * from + (u.seed / 10 - 0.5) * 2.4;
  const rr = nest.r + u.r + 4 + (u.seed % 1) * 10;
  return { x: nest.x + Math.cos(a) * rr, y: nest.y + Math.sin(a) * rr * 0.8 };
}

function spawnUnit(S, side, slot) {
  const unitKey = S.cfg.PRODUCTION[slot.type].unit;
  const t = S.cfg.UNITS[unitKey];
  const sp = musterSpot(S, side);
  // soldier broods breed BIGGER soldiers per level (the concentration axis)
  const k = unitKey === 'soldier' ? slot.lvl - 1 : 0;
  const L = S.cfg.SOLDIER_LVL;
  const u = {
    side, typeKey: unitKey,
    x: sp.x, y: sp.y,
    hp: t.hp * Math.pow(L.hp, k),
    spd: t.spd * Math.pow(L.spd, k),
    dps: t.dps * Math.pow(L.dps, k),
    r: t.r * Math.pow(L.r, k),
    seed: S.rng() * 10,
    state: 'muster',             // muster -> march -> siege
    sx: 0, sy: 0,
    mx: 0, my: 0, pd: 0,         // buffered move + incoming damage
    fx: 0,                       // renderer hint: fighting this tick
  };
  u.maxHp = u.hp;
  // multi-lane maps: round-robin lane assignment (even, fair, no rng), a
  // fixed lateral offset so a lane's army keeps its width at waypoints
  u.lane = S.laneNext[side] % S.map.paths.p.length;
  S.laneNext[side]++;
  u.wp = 0;
  u.off = ((u.seed % 1) * 2 - 1) * (S.map.laneHalf - 6);
  S.units.push(u);
  S.hatched[side][unitKey]++;
}

function destroySlot(S, side, slot) {
  S.events.push({ type: 'towerfall', x: slot.x, y: slot.y, side });
  slot.type = null; slot.lvl = 1; slot.cd = 0; slot.prodCd = 0; slot.hp = 0; slot.spent = 0;
}

// ants fight ants; assassins are outside the war entirely
function meleeable(u) { return u.hp > 0 && u.typeKey !== 'assassin'; }
function contactR(u, v) { return u.r + v.r + 4; }

// only as many attackers as fit around a target's body get to bite it -
// without this cap the whole flood stacks on one point (no collision)
// and volume has zero diminishing returns in melee. The excess streams
// past toward the nest instead, so chaff still races, it just can't
// also win every clash per-gold.
function biteCap(tgt, attacker) {
  return Math.max(2, Math.floor(Math.PI * (tgt.r + attacker.r) / (2 * attacker.r)));
}
function hasBiteRoom(tgt, attacker) { return tgt.nb < biteCap(tgt, attacker); }

// nearest living enemy the unit could bite, within maxD; stateFilter
// optionally restricts which enemy states count as seekable. Targets
// whose bite ring is already full don't count.
function nearestFoe(S, u, maxD, states) {
  const foe = other(u.side);
  let best = null, bestD = maxD;
  for (const v of S.units) {
    if (v.side !== foe || !meleeable(v) || !hasBiteRoom(v, u)) continue;
    if (states && !states.includes(v.state)) continue;
    const d = Math.hypot(v.x - u.x, v.y - u.y);
    if (d < bestD) { bestD = d; best = v; }
  }
  return best && { v: best, d: bestD };
}

// chase-and-bite: queue a move toward tgt, or a bite on contact. Movement
// (u.mx/u.my) and damage (tgt.pd) are buffered and applied only after the
// whole unit loop - p-units iterate first, and letting them move early
// hands e-units fresher chase positions, a real mirror bias.
function fight(u, tgt, dt) {
  const dx = tgt.x - u.x, dy = tgt.y - u.y, d = Math.hypot(dx, dy);
  if (d > contactR(u, tgt)) {
    u.mx = (dx / d) * u.spd * u.sf * dt;
    u.my = (dy / d) * u.spd * u.sf * dt;
  } else {
    tgt.pd += u.dps * dt;
    tgt.nb++;
    u.fx = 1;
  }
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

  // hatcheries and broods produce into the muster
  for (const side of ['p', 'e']) {
    for (const slot of S.slots[side]) {
      if (!cfg.PRODUCTION[slot.type]) continue;
      slot.prodCd -= dt;
      if (slot.prodCd <= 0) {
        spawnUnit(S, side, slot);
        slot.prodCd += prodInterval(S, slot);
      }
    }
  }

  // the war drum: both musters march together
  if (S.t >= S.nextBeat) {
    S.nextBeat += cfg.WAR_DRUM;
    for (const u of S.units) if (u.state === 'muster') u.state = 'march';
    S.events.push({ type: 'march' });
  }

  // movement and the clash. Ants fight what they meet: anyone biting you
  // gets bitten back; workers and soldiers also seek nearby enemies;
  // mustering ants defend their nest; assassins walk through it all.
  // Two phases: every unit DECIDES against the same tick-start snapshot
  // (buffered into mx/my/pd), then everything applies at once.
  const hillDmg = { p: 0, e: 0 };
  for (const u of S.units) { u.fx = 0; u.mx = 0; u.my = 0; u.pd = 0; u.nb = 0; u.sf = 1; }
  // amber towers coat enemies in resin before anyone moves: the strongest
  // slow in range wins, slows never stack. Muster clouds stay sanctuary,
  // matching tower fire.
  for (const side of ['p', 'e']) {
    const foe = other(side);
    for (const slot of S.slots[side]) {
      if (slot.type !== 'amber') continue;
      const spec = cfg.TOWERS.amber;
      const f = spec.slow[slot.lvl];
      for (const u of S.units) {
        if (u.side !== foe || u.state === 'muster' || f >= u.sf) continue;
        if (Math.hypot(u.x - slot.x, u.y - slot.y) <= spec.range) u.sf = f;
      }
    }
  }
  for (const u of S.units) {
    const foe = other(u.side);

    if (u.state === 'muster') {
      // nest defence: newborns waiting on the drum still have jaws
      if (u.typeKey !== 'assassin') {
        const hit = nearestFoe(S, u, cfg.MELEE.defend, null);
        if (hit) fight(u, hit.v, dt);
      }
      continue;
    }

    if (u.typeKey !== 'assassin') {
      // contact first: fight whoever is touching you, regardless of state
      let tgt = null, tgtD = Infinity;
      for (const v of S.units) {
        if (v.side !== foe || !meleeable(v) || !hasBiteRoom(v, u)) continue;
        const d = Math.hypot(v.x - u.x, v.y - u.y);
        if (d <= contactR(u, v) && d < tgtD) { tgtD = d; tgt = v; }
      }
      if (!tgt && u.typeKey !== 'sapper') {
        // then seek: marchers/siegers pull toward a nearby enemy ARMY -
        // never toward the muster cloud (that would grind reinforcements
        // forever at full hill hp; defenders must come out to be fought)
        const hit = nearestFoe(S, u, cfg.MELEE.seek, ['march', 'siege']);
        if (hit) tgt = hit.v;
      }
      if (tgt) { fight(u, tgt, dt); continue; }
    }

    // sappers divert to the nearest enemy defence building in sight;
    // felled towers are swept AFTER the loop so both sides' sappers see
    // the same standing walls this tick
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
          u.mx = ((ts.x - u.x) / td) * u.spd * u.sf * dt;
          u.my = ((ts.y - u.y) / td) * u.spd * u.sf * dt;
        } else {
          ts.hp -= spec.vsTower * dt;
          u.fx = 1;
        }
        continue;
      }
    }

    const nest = u.side === 'p' ? cfg.ENEMY_BASE : cfg.PLAYER_BASE;
    if (u.state === 'march') {
      // march the assigned lane: waypoint after waypoint, then the nest.
      // The empty path (clash / trident centre) is the legacy straight
      // march. Fights shove units around, so waypoints already passed in
      // the march direction are skipped, not walked back to.
      const path = S.map.paths[u.side][u.lane];
      while (u.wp < path.length) {
        const wx = path[u.wp].x + u.off, wy = path[u.wp].y;
        const passed = u.side === 'p' ? u.y <= wy : u.y >= wy;
        if (passed || Math.hypot(wx - u.x, wy - u.y) < 12) { u.wp++; continue; }
        break;
      }
      if (u.wp < path.length) {
        const wx = path[u.wp].x + u.off, wy = path[u.wp].y;
        const d = Math.hypot(wx - u.x, wy - u.y);
        u.mx = ((wx - u.x) / d) * u.spd * u.sf * dt;
        u.my = ((wy - u.y) / d) * u.spd * u.sf * dt;
      } else if (path.length) {
        const d = Math.hypot(nest.x - u.x, nest.y - u.y) || 1;
        u.mx = ((nest.x - u.x) / d) * u.spd * u.sf * dt;
        u.my = ((nest.y - u.y) / d) * u.spd * u.sf * dt;
      } else {
        u.my = (u.side === 'p' ? -1 : 1) * u.spd * u.sf * dt;
      }
      if (Math.hypot(u.x + u.mx - nest.x, u.y + u.my - nest.y) < cfg.SIEGE_DIST) {
        u.state = 'siege';
        const sp = siegeSpot(u, nest);
        u.sx = sp.x; u.sy = sp.y;
      }
    } else {
      const dx = u.sx - u.x, dy = u.sy - u.y;
      const d = Math.hypot(dx, dy);
      if (d > 3) {
        u.mx = (dx / d) * u.spd * u.sf * dt;
        u.my = (dy / d) * u.spd * u.sf * dt;
      } else {
        hillDmg[other(u.side)] += u.dps * dt;
      }
    }
  }
  for (const u of S.units) {
    u.x += u.mx; u.y += u.my;
    u.hp -= u.pd;
  }
  S.baseHP.p -= hillDmg.p;
  S.baseHP.e -= hillDmg.e;
  for (const side of ['p', 'e']) {
    for (const slot of S.slots[side]) {
      if (slot.type && FAMILIES.def.includes(slot.type) && slot.hp <= 0) destroySlot(S, side, slot);
    }
  }

  // towers fire at the nearest foe in range; muster clouds are sanctuary
  // (and out of range anyway). Towers are the ONLY thing that hits assassins.
  for (const side of ['p', 'e']) {
    const foe = other(side);
    for (const slot of S.slots[side]) {
      const spec = cfg.TOWERS[slot.type];
      if (!spec || !spec.dmg) continue;   // amber snares, it never shoots
      slot.cd -= dt;
      if (slot.cd > 0) continue;
      let best = null, bestD = spec.range;
      for (const u of S.units) {
        if (u.side !== foe || u.hp <= 0 || u.state === 'muster') continue;
        const d = Math.hypot(u.x - slot.x, u.y - slot.y);
        if (d < bestD) { bestD = d; best = u; }
      }
      if (best) {
        const dmg = spec.dmg * lvlPower(S, slot);
        if (spec.splash) {
          for (const u of S.units) {
            if (u.side !== foe || u.hp <= 0 || u.state === 'muster') continue;
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

  for (const u of S.units) {
    if (u.hp <= 0) S.events.push({ type: 'death', x: u.x, y: u.y, side: u.side, big: u.r > 7.5 });
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
  };
}

return {
  CONFIG, createState, applyAction, step, playMatch, buildOptions,
  count, familyCount, income, musterCount, other, mulberry32,
  lvlCost, lvlPower, sellRefund, LEVELABLE, FAMILIES,
};
});
