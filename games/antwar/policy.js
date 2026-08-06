// Ant War strategy layer (v1.0, build-only action space). A strategy is a
// flat numeric parameter vector; a controller closes over one vector and
// emits build/upgrade actions - there are no manual sends.
// Personas are hand-named vectors; the tuner (tune.js) evolves vectors with
// the same shape. Deterministic: no Math.random anywhere.
(function (root, factory) {
  const sim = (typeof module !== 'undefined' && module.exports)
    ? require('./sim.js') : root.AntWarSim;
  const api = factory(sim);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.AntWarPolicy = api;
})(typeof self !== 'undefined' ? self : globalThis, function (sim) {
'use strict';

// name: [min, max, isInt] - the tuner mutates within these ranges
const PARAM_SPEC = {
  wEco:          [0.2, 3, false],  // family desire weights
  wDef:          [0.2, 3, false],
  wOff:          [0.2, 3, false],
  farmTarget:    [0, 6, true],     // eco buildings wanted
  hatchTarget:   [0, 6, true],     // offence buildings wanted
  towersBase:    [0, 4, true],     // towers wanted at t=0
  towersPer100s: [0, 2, false],    // ...growing over time
  reactDef:      [0, 2, true],     // extra towers while foe hatcheries > own towers
  reactGhost:    [0, 2, true],     // extra towers while the foe breeds assassins
                                   // (towers are the ONLY answer to them)
  farmLvl:       [1, 3, true],     // upgrade farms to this level
  mixWorker:     [0, 1, false],    // hatchery mix: share left as plain worker hatch
  mixSoldier:    [0, 1, false],
  mixAssassin:   [0, 1, false],    // ...assassins ignore ants, chew the hill
  mixSapper:     [0, 1, false],    // ...sappers demolish enemy towers
  sharpTrig:     [1, 9, true],     // sharp once foe soldier-broods >= N (9=never)
  spitTrig:      [1, 9, true],     // spitter once foe worker-hatcheries >= N (9=never)
  upgW:          [0.2, 2, false],  // upgrades vs new builds
  lvlW:          [0, 2, false],    // appetite for levelling buildings
};
const PARAM_NAMES = Object.keys(PARAM_SPEC);

function clampParams(p) {
  const out = {};
  for (const k of PARAM_NAMES) {
    const [lo, hi, isInt] = PARAM_SPEC[k];
    let v = Math.max(lo, Math.min(hi, p[k] === undefined ? lo : p[k]));
    if (isInt) v = Math.round(v);
    out[k] = v;
  }
  return out;
}

// slot placement preferences: towers guard the nest first, eco hides in the
// rear, hatcheries take whatever is left near the back
const TOWER_SLOT_ORDER = [0, 1, 2, 3, 6, 7, 4, 5];
const REAR_SLOT_ORDER = [4, 5, 2, 3, 0, 1, 6, 7];

function firstEmptyIn(S, side, order) {
  for (const i of order) if (S.slots[side][i].type === null) return i;
  return -1;
}

// ----------------------------------------------------------------- kit -----
// The meta-progression layer (v0.7): the campaign starts with a lean kit
// and each level's first win unlocks the tech the NEXT level demands.
// The sim knows nothing about locks - controllers (opts.allowed) and the
// renderer filter build options; the rules stay identical for everyone.
const BASE_KIT = ['farm', 'tower', 'hatch', 'soldierb'];

// what a player with this stars map may build: { types, maxLvl }
function unlocksFrom(starsMap) {
  const types = BASE_KIT.slice();
  let maxLvl = 1;
  for (const L of LEVELS) {
    if (!L.reward || (starsMap[L.key] || 0) < 1) continue;
    if (L.reward.key === 'lvl2') maxLvl = Math.max(maxLvl, 2);
    else if (L.reward.key === 'lvl3') maxLvl = Math.max(maxLvl, 3);
    else types.push(L.reward.key);
  }
  return { types, maxLvl };
}

// ------------------------------------------------------------ controller ---
// opts.thinkEvery: seconds between decisions (default 0.8). Slower thinking
// is the honest campaign difficulty knob - a sluggish opponent, not a
// stat-cheating one.
// opts.allowed: an unlocksFrom() kit; candidates outside it are dropped
// (used to grade the campaign with the player's actual tech of the moment).
function makeController(rawParams, opts) {
  const P = clampParams(rawParams);
  const thinkEvery = (opts && opts.thinkEvery) || 0.8;
  const allowed = (opts && opts.allowed) || null;
  const mem = { nextThink: 0 };

  // normalised hatch mix shares; 'hatch' is the worker share (stay plain)
  const mixTotal = P.mixWorker + P.mixSoldier + P.mixAssassin + P.mixSapper + 0.001;
  const mix = {
    hatch: P.mixWorker / mixTotal,
    soldierb: P.mixSoldier / mixTotal,
    assassinb: P.mixAssassin / mixTotal,
    sapperb: P.mixSapper / mixTotal,
  };

  return function control(S, side) {
    if (S.t < mem.nextThink) return null;
    mem.nextThink = S.t + thinkEvery;
    const cfg = S.cfg;
    const foe = sim.other(side);
    const eco = sim.familyCount(S, side, 'eco');
    const def = sim.familyCount(S, side, 'def');
    const off = sim.familyCount(S, side, 'off');
    const foeOff = sim.familyCount(S, foe, 'off');

    // candidate builds, scored; the best positive one is the intent - if we
    // can't afford it yet we SAVE for it rather than buying something lesser
    const cands = [];

    // new buildings
    if (eco < P.farmTarget) {
      const slot = firstEmptyIn(S, side, REAR_SLOT_ORDER);
      if (slot !== -1) cands.push({ score: P.wEco * (P.farmTarget - eco), a: { kind: 'build', slot, type: 'farm' } });
    }
    const desiredTowers = P.towersBase + P.towersPer100s * S.t / 100
      + (foeOff > def ? P.reactDef : 0)
      + (sim.count(S, foe, 'assassinb') > 0 ? P.reactGhost : 0);
    if (def < desiredTowers) {
      const slot = firstEmptyIn(S, side, TOWER_SLOT_ORDER);
      if (slot !== -1) cands.push({ score: P.wDef * (desiredTowers - def), a: { kind: 'build', slot, type: 'tower' } });
    }
    if (off < P.hatchTarget) {
      const slot = firstEmptyIn(S, side, REAR_SLOT_ORDER);
      if (slot !== -1) cands.push({ score: P.wOff * (P.hatchTarget - off), a: { kind: 'build', slot, type: 'hatch' } });
    }

    // farm level upgrades (farms level in place since v1.0)
    if (P.farmLvl >= 2) {
      const i = S.slots[side].findIndex(s => s.type === 'farm' && s.lvl < P.farmLvl && s.lvl < cfg.MAX_LVL);
      if (i !== -1) cands.push({ score: P.wEco * P.upgW * 0.9, a: { kind: 'build', slot: i, type: 'lvl' }, cost: sim.lvlCost(S, S.slots[side][i]) });
    }

    // tower specialisations, reading the foe's visible production buildings
    const baseTower = S.slots[side].findIndex(s => s.type === 'tower');
    if (baseTower !== -1) {
      const foeSoldierB = sim.count(S, foe, 'soldierb');
      const foeWorkerB = sim.count(S, foe, 'hatch');
      if (foeSoldierB >= P.sharpTrig && sim.count(S, side, 'sharp') < 2) {
        cands.push({ score: P.wDef * P.upgW * 1.5, a: { kind: 'build', slot: baseTower, type: 'sharp' } });
      }
      if (foeWorkerB >= P.spitTrig && sim.count(S, side, 'spit') < 2) {
        cands.push({ score: P.wDef * P.upgW * 1.2, a: { kind: 'build', slot: baseTower, type: 'spit' } });
      }
    }

    // hatchery specialisation toward the mix (largest share deficit first).
    // 'hatch' competes as the worker share: if staying plain has the biggest
    // deficit, we simply don't specialise this think. Skip kit-locked types
    // HERE, not just in the legal filter below: this loop picks a single
    // winner, and if that winner were locked the bot would never specialise
    // anything and idle at the gold cap (the v0.9 kit-filter lesson).
    const baseHatch = S.slots[side].findIndex(s => s.type === 'hatch');
    if (baseHatch !== -1 && off > 0) {
      let bestType = null, bestDeficit = 0.05;
      for (const type of ['hatch', 'soldierb', 'assassinb', 'sapperb']) {
        if (type !== 'hatch' && allowed && !allowed.types.includes(type)) continue;
        const share = sim.count(S, side, type) / off;
        const deficit = mix[type] - share;
        if (deficit > bestDeficit) { bestDeficit = deficit; bestType = type; }
      }
      if (bestType && bestType !== 'hatch') {
        cands.push({ score: P.wOff * P.upgW * (0.8 + bestDeficit), a: { kind: 'build', slot: baseHatch, type: bestType } });
      }
    }

    // level up buildings: the late-game gold sink (out-tech). Farms are
    // governed by farmLvl above; everything else levelable competes here.
    if (P.lvlW > 0) {
      for (let i = 0; i < S.slots[side].length; i++) {
        const slot = S.slots[side][i];
        if (slot.type === 'farm') continue;
        if (!sim.LEVELABLE.includes(slot.type) || slot.lvl >= cfg.MAX_LVL) continue;
        const famW = sim.FAMILIES.def.includes(slot.type) ? P.wDef : P.wOff;
        cands.push({ score: famW * P.lvlW * (0.75 - 0.1 * (slot.lvl - 1)), a: { kind: 'build', slot: i, type: 'lvl' }, cost: sim.lvlCost(S, slot) });
        break;                   // one level candidate per think is enough
      }
    }

    // drop locked candidates BEFORE picking an intent, or the controller
    // would save forever for something it cannot build
    const legal = !allowed ? cands : cands.filter(c =>
      c.a.type === 'lvl'
        ? S.slots[side][c.a.slot].lvl + 1 <= allowed.maxLvl
        : allowed.types.includes(c.a.type));

    if (!legal.length) return null;
    legal.sort((a, b) => b.score - a.score);
    const intent = legal[0];
    const cost = intent.cost !== undefined ? intent.cost : cfg.COSTS[intent.a.type];
    if (S.money[side] < cost) return null;   // save for it
    return [intent.a];
  };
}

// -------------------------------------------------------------- personas ---
const PERSONAS = {
  rustle: {
    label: 'QUEEN RUSTLE (Rusher)',
    intro: 'Hatcheries everywhere, workers on every drum. Out-grow her - if you live.',
    params: {
      wEco: 0.8, wDef: 1, wOff: 2.6,
      farmTarget: 2, hatchTarget: 5, towersBase: 1, towersPer100s: 0.5, reactDef: 1, reactGhost: 1,
      farmLvl: 2, mixWorker: 1, mixSoldier: 0.35, mixAssassin: 0, mixSapper: 0.15,
      sharpTrig: 2, spitTrig: 3, upgW: 0.9, lvlW: 0.6,
    },
  },
  tussock: {
    label: 'WARDEN TUSSOCK (Turtle)',
    intro: 'Walls and veteran soldiers on a slow drum. Sappers crack shells - or grind the clock.',
    params: {
      // the clash world's turtle is walls PLUS a soldier line: towers alone
      // have nobody to eat enemy sappers and nothing mustered to defend.
      // Spit-first (spitTrig 1) and growing walls is what the tuner's
      // anti-rush exploit converged on - it holds the flood at the door
      // and wins the decay wire on hill hp
      wEco: 1.7, wDef: 2.4, wOff: 1.2,
      farmTarget: 4, hatchTarget: 4, towersBase: 3, towersPer100s: 1.8, reactDef: 1, reactGhost: 2,
      farmLvl: 2, mixWorker: 0.1, mixSoldier: 1, mixAssassin: 0, mixSapper: 0.05,
      sharpTrig: 2, spitTrig: 1, upgW: 1.4, lvlW: 1.2,
    },
  },
  bloom: {
    label: 'BARON BLOOM (Boomer)',
    intro: 'Farms first, then giant veteran soldiers, sappers and paid shadows. Kill him before they hatch.',
    params: {
      // greed into giants + assassins: the tuner's anti-turtle exploit
      // runs assassin-heavy - shadows slip the soldier line and towers
      // built late can't cover everything. Thin walls keep rush > bloom.
      wEco: 2.6, wDef: 0.9, wOff: 1.5,
      farmTarget: 4, hatchTarget: 5, towersBase: 1, towersPer100s: 0.5, reactDef: 1, reactGhost: 1,
      farmLvl: 3, mixWorker: 0.2, mixSoldier: 1, mixAssassin: 0.6, mixSapper: 0.4,
      sharpTrig: 3, spitTrig: 5, upgW: 1.2, lvlW: 1.6,
    },
  },
};

// pure-strategy sanity archetypes for the tuner: each SHOULD lose to something
const ARCHETYPES = {
  boomEco: {
    wEco: 3, wDef: 0.3, wOff: 0.6,
    farmTarget: 6, hatchTarget: 2, towersBase: 0, towersPer100s: 0, reactDef: 0, reactGhost: 0,
    farmLvl: 3, mixWorker: 0.2, mixSoldier: 1, mixAssassin: 0, mixSapper: 0.2,
    sharpTrig: 9, spitTrig: 9, upgW: 1, lvlW: 2,
  },
  wallDef: {
    wEco: 0.4, wDef: 3, wOff: 0.4,
    farmTarget: 1, hatchTarget: 1, towersBase: 4, towersPer100s: 2, reactDef: 2, reactGhost: 2,
    farmLvl: 1, mixWorker: 0.2, mixSoldier: 1, mixAssassin: 0, mixSapper: 0,
    sharpTrig: 1, spitTrig: 2, upgW: 1.5, lvlW: 1.2,
  },
  allInHatch: {
    wEco: 0.3, wDef: 0.3, wOff: 3,
    farmTarget: 0, hatchTarget: 6, towersBase: 0, towersPer100s: 0, reactDef: 0, reactGhost: 0,
    farmLvl: 1, mixWorker: 1, mixSoldier: 0.3, mixAssassin: 0, mixSapper: 0,
    sharpTrig: 9, spitTrig: 9, upgW: 0.6, lvlW: 0.3,
  },
  // sanity probe: sappers as the whole plan. Should crack turtles but lose
  // to soldiers (they eat sappers in the clash) - if it dominates the
  // field, sappers are broken.
  sapperAllIn: {
    wEco: 0.6, wDef: 0.5, wOff: 3,
    farmTarget: 1, hatchTarget: 5, towersBase: 1, towersPer100s: 0, reactDef: 0, reactGhost: 0,
    farmLvl: 1, mixWorker: 0.2, mixSoldier: 0.2, mixAssassin: 0, mixSapper: 1,
    sharpTrig: 9, spitTrig: 9, upgW: 1, lvlW: 0.8,
  },
  // v1.0 sanity probe: assassins as the whole plan, sappers opening the
  // wall for them. Should beat army-heavy tower-light builds and lose to
  // anyone who answers with towers (reactGhost) or kills the nest first.
  shadow: {
    wEco: 1.5, wDef: 0.6, wOff: 2.4,
    farmTarget: 2, hatchTarget: 5, towersBase: 1, towersPer100s: 0.3, reactDef: 0, reactGhost: 0,
    farmLvl: 2, mixWorker: 0.1, mixSoldier: 0.2, mixAssassin: 1, mixSapper: 0.4,
    sharpTrig: 9, spitTrig: 9, upgW: 1, lvlW: 0.8,
  },
  // the evolved + hardened champion: round 1 evolved vs the field, an
  // exploit run found a 0.50 near-counter, round 2 folded that counter
  // into the pool - v2 beats the whole field, the round-1 champion AND
  // the counter at 1.00. Balanced reactive macro: lvl-2 farms into a
  // pure soldier line, two opening towers plus hard reactions, instant
  // specialists, max upgrade appetite. Doubles as the campaign endboss
  // and as the "strong player" reference when grading the ladder.
  // Re-evolve + re-harden after any rules change.
  optimum: {
    wEco: 1.75, wDef: 0.52, wOff: 1.3,
    farmTarget: 4, hatchTarget: 4, towersBase: 2, towersPer100s: 0.75, reactDef: 2, reactGhost: 2,
    farmLvl: 2, mixWorker: 0, mixSoldier: 1, mixAssassin: 0.04, mixSapper: 0,
    sharpTrig: 1, spitTrig: 1, upgW: 2, lvlW: 0.26,
  },
};

// the champion doubles as a skirmish opponent: the wall to run at
PERSONAS.optimum = {
  label: 'THE OPTIMUM (Impossible)',
  intro: 'Nothing evolved has ever beaten it. Can you?',
  params: ARCHETYPES.optimum,
};

// -------------------------------------------------------------- campaign ---
// The persona ladder (9 levels since v1.0). Difficulty comes from honest
// knobs only: weakened/slowed AI vectors early, head starts (money,
// pre-built buildings) late. RULES stay symmetric; setups may not (level
// design). NOTE: setup money values are ABSOLUTE and sized against
// START_MONEY (220) - re-author them if the start gold ever moves.
// Stars: win = 1, win with hill >= 100hp = 2, >= 200hp = 3.
const LEVELS = [
  // --- act 1: teach the three verbs ---
  {
    key: 'sprout', name: 'SEEDLING SNUG', act: 1,
    blurb: 'A sleepy boomer with no walls at all.',
    twist: 'He starts nearly broke. Breed ants and bury him.',
    hue: '#d88a50',
    reward: { key: 'spit', label: 'SPITTER TOWER', desc: 'Splash shots. Worker floods hate it.' },
    ai: {
      thinkEvery: 3,
      params: {
        wEco: 2.6, wDef: 0.5, wOff: 1,
        farmTarget: 4, hatchTarget: 2, towersBase: 0, towersPer100s: 0.2, reactDef: 0, reactGhost: 0,
        farmLvl: 2, mixWorker: 0.4, mixSoldier: 0.5, mixAssassin: 0, mixSapper: 0,
        sharpTrig: 9, spitTrig: 9, upgW: 1, lvlW: 0,
      },
    },
    setup: { moneyE: 110 },
  },
  {
    key: 'skitter', name: 'PRINCESS SKITTER', act: 1,
    blurb: 'A hatchling rusher: all workers, no plan.',
    twist: 'Your soldiers hold the clash; her chaff melts to splash. Build a spitter.',
    hue: '#b8b0a0',
    reward: { key: 'sapperb', label: 'SAPPER BROOD', desc: 'Breeds ants that DEMOLISH towers.' },
    ai: {
      thinkEvery: 2.5,
      params: {
        wEco: 0.8, wDef: 0.6, wOff: 2.2,
        farmTarget: 1, hatchTarget: 4, towersBase: 0, towersPer100s: 0.3, reactDef: 0, reactGhost: 0,
        farmLvl: 1, mixWorker: 1, mixSoldier: 0.15, mixAssassin: 0, mixSapper: 0,
        sharpTrig: 9, spitTrig: 9, upgW: 0.8, lvlW: 0,
      },
    },
    setup: { moneyE: 165 },
  },
  {
    key: 'pebble', name: 'OLD PEBBLE', act: 1,
    blurb: 'A stubborn little turtle behind stone.',
    twist: 'Stone laughs at soldiers. Your new sapper broods EAT stone.',
    hue: '#9cc088',
    reward: { key: 'sharp', label: 'SHARPSHOOTER', desc: 'Long range, heavy shot. Giants fear it.' },
    ai: {
      thinkEvery: 2.5,
      params: {
        wEco: 1, wDef: 2.2, wOff: 0.8,
        farmTarget: 2, hatchTarget: 1, towersBase: 2, towersPer100s: 0.6, reactDef: 1, reactGhost: 0,
        farmLvl: 1, mixWorker: 0.2, mixSoldier: 1, mixAssassin: 0, mixSapper: 0,
        sharpTrig: 9, spitTrig: 3, upgW: 1, lvlW: 0.3,
      },
    },
    setup: { moneyE: 165 },
  },
  // --- act 2: the real personas, telegraphed head starts ---
  {
    key: 'rustle', name: 'QUEEN RUSTLE', act: 2, persona: 'rustle',
    blurb: 'Hatcheries everywhere, workers on every drum.',
    twist: 'Her first brood is already laid. Hold the early beats.',
    hue: '#c84632',
    // no prebuild and a drowsy think rate: her loot is lvl2, which SHE
    // previews - a flood with lvl-2 hatcheries against a lvl-1 player is
    // already the hardest matchup on the ladder (graded 0.01 with the
    // v0.6-style head start on top)
    reward: { key: 'lvl2', label: 'TECH LEVEL 2', desc: 'Buildings can now level up.' },
    ai: { thinkEvery: 2.2, params: null },
    setup: null,
  },
  {
    key: 'shade', name: 'SHADE THE HOLLOW', act: 2,
    blurb: 'Her assassins walk THROUGH your army, unseen by any ant.',
    twist: 'Only towers can hit an assassin. Win, and her brood is yours.',
    hue: '#8a6ab0',
    reward: { key: 'assassinb', label: 'ASSASSIN BROOD', desc: 'Ignores ants; ants ignore it. Chews the hill.' },
    ai: { thinkEvery: 1.2, params: ARCHETYPES.shadow },
    setup: { moneyE: 240 },
  },
  {
    key: 'tussock', name: 'WARDEN TUSSOCK', act: 2, persona: 'tussock',
    blurb: 'Walls and veteran soldiers on a slow drum.',
    twist: 'Sappers alone will melt to his soldiers. Bring an escort.',
    hue: '#9cc088',
    reward: { key: 'lvl3', label: 'TECH LEVEL 3', desc: 'The final tech tier.' },
    ai: { thinkEvery: 2.4, params: null },
    setup: null,
  },
  // --- act 3: the bosses (full-speed wits, honest head starts) ---
  {
    key: 'bloom', name: 'BARON BLOOM', act: 3, persona: 'bloom',
    blurb: 'Farms first, then giant veteran soldiers with sapper escorts.',
    twist: 'A farm already stands, 240g banked. Crack the greed early.',
    hue: '#d88a50',
    ai: { thinkEvery: 1.1, params: null },
    setup: { moneyE: 240, prebuildE: [{ slot: 4, type: 'farm' }] },
  },
  {
    key: 'unbroken', name: 'TUSSOCK THE UNBROKEN', act: 3, persona: 'tussock',
    blurb: 'The turtle, walled before you draw breath.',
    twist: 'A veteran sharpshooter already watches. 230g stocked.',
    hue: '#9cc088',
    ai: { thinkEvery: 0.8, params: null },
    setup: { moneyE: 230, prebuildE: [{ slot: 1, type: 'sharp', lvl: 2 }] },
  },
  {
    key: 'optimum', name: 'THE OPTIMUM', act: 3,
    blurb: 'The tuner\'s champion: ten thousand simulated wars distilled.',
    twist: 'No head start. No handicap. Just better macro than you.',
    hue: '#ffd870',
    // 0.5s think: the one honest knob left after "no head start, no
    // handicap" - the champion simply reacts faster than the reference
    // players it was graded against
    ai: { thinkEvery: 0.5, params: null },   // filled from ARCHETYPES.optimum
    setup: null,
  },
];
for (const L of LEVELS) {
  if (!L.ai.params) L.ai.params = L.persona ? PERSONAS[L.persona].params : ARCHETYPES[L.key];
}

// campaign kit helpers (ladder beaten in order): what the player holds
// ENTERING level i, and what that level's enemy may use - the player's kit
// plus any BUILDING this level's victory hands over. You loot it from
// them, and enemies escalate in step with the player instead of fielding
// tech the player has never seen - and never out-tier the player's levels.
function kitAtLevel(i) {
  const starsSoFar = {};
  for (let j = 0; j < i; j++) starsSoFar[LEVELS[j].key] = 1;
  return unlocksFrom(starsSoFar);
}
function enemyKitAt(i) {
  const kit = kitAtLevel(i);              // starts from the player's own tech
  // the level showcases its own loot - but only if it is a BUILDING. A tier
  // unlock is a flat stat edge on every building, not a toy to learn, so the
  // enemy never out-levels the player (v1.1 playtest: lvl-2 player, lvl-3 AI)
  const r = LEVELS[i].reward;
  if (r && r.key !== 'lvl2' && r.key !== 'lvl3') kit.types.push(r.key);
  // a level may showcase tech beyond the loot rule (ai.extraKit)
  for (const key of (LEVELS[i].ai.extraKit || [])) {
    if (key === 'lvl2') kit.maxLvl = Math.max(kit.maxLvl, 2);
    else if (key === 'lvl3') kit.maxLvl = Math.max(kit.maxLvl, 3);
    else kit.types.push(key);
  }
  return kit;
}

// every tech in the game - what skirmish plays with on BOTH sides
function fullKit() {
  const all = {};
  for (const L of LEVELS) all[L.key] = 1;
  return unlocksFrom(all);
}

return { PARAM_SPEC, PARAM_NAMES, clampParams, makeController, PERSONAS, ARCHETYPES,
  LEVELS, BASE_KIT, unlocksFrom, kitAtLevel, enemyKitAt, fullKit };
});
