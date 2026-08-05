// Ant War strategy layer (v0.4, build-only action space). A strategy is a
// flat numeric parameter vector; a controller closes over one vector and
// emits build/upgrade actions - there are no manual sends any more.
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
  farmLvl:       [1, 3, true],     // upgrade farms to this level
  matTarget:     [0, 4, true],     // farms converted to creep Mats (fx0.3 SEEP probe)
  mixSwarm:      [0, 1, false],    // hatchery specialisation mix
  mixSoldier:    [0, 1, false],
  mixMajor:      [0, 1, false],
  mixSapper:     [0, 1, false],    // ...sappers demolish enemy towers
  mixPredator:   [0, 1, false],    // ...predators hunt enemy marchers mid-lane
  mixHorn:       [0, 1, false],    // ...horn broods: +6s on OWN drum each (bigger waves)
  mixFife:       [0, 1, false],    // ...fife broods: -3s on OWN drum each (faster waves)
  mixOoze:       [0, 1, false],    // ...ooze dens: shamblers trickle drumless, corpses splat
  mixGrub:       [0, 1, false],    // ...grub pits: cheap mass, almost no dps (FOUNDRY press feed)
  mixSlither:    [0, 1, false],    // ...slither dens: fast on OWN paint, feeble off it (SEEP)
  mixCarrier:    [0, 1, false],    // ...carrier cysts: zero-damage bodies that plant pips (VEIL)
  sharpTrig:     [1, 9, true],     // sharp once foe major-broods >= N (9=never)
  spitTrig:      [1, 9, true],     // spitter once foe worker-broods >= N (9=never)
  sapTrig:       [2, 9, true],     // sap once own towers >= N (9=never)
  guardTrig:     [1, 9, true],     // guard post once foe swarm/sapper broods >= N (9=never)
  mortarTrig:    [1, 9, true],     // mortar once foe defence buildings >= N (9=never)
  convTrig:      [1, 9, true],     // converter once foe soldier/major broods >= N (9=never)
  dynamoTrig:    [1, 9, true],     // dynamo once foe TRICKLE broods >= N (9=never)
  rampartTrig:   [1, 9, true],     // rampart once foe ON-FOOT broods >= N (9=never)
  coilTrig:      [1, 9, true],     // arc coil once foe CLUMP broods >= N (9=never)
  bellTrig:      [1, 9, true],     // stasis bell once foe OFFENCE buildings >= N (9=never)
  kissTrig:      [1, 9, true],     // plague kiss once foe PIPPED buildings >= N (9=never)
  hallTrig:      [1, 9, true],     // chorus hall once foe HEAVY hosts >= N (9=never)
  govTrig:       [1, 9, true],     // governor once foe BUILDING-KILLERS >= N (9=never)
  redTrig:       [1, 9, true],     // red-line once OWN eco buildings >= N (9=never)
  deepTrig:      [1, 9, true],     // deep tithe once foe PIPPED buildings >= N (9=never)
  relicTrig:     [1, 9, true],     // reliquary once foe PIPPED buildings >= N (9=never)
  upgW:          [0.2, 2, false],  // upgrades vs new builds
  lvlW:          [0, 2, false],    // appetite for levelling specialised buildings
  // a new build scores its family's whole SHORTFALL, and the tower one grows
  // with match time without bound, while a specialisation caps near
  // w*upgW*1.5 - so SEEP rebuilt a plain tower ~30x a match and never once
  // specialised into the sap its kit owns (T42). This damps the shortfall
  // toward a flat 1. Both ends are degenerate, so it is the tuner's dial:
  // 0 is the pre-T42 scoring exactly (and the clamp default, so a partial
  // vector still replays); 1 ties every new build and spams the top family.
  flatBuild:     [0, 1, false],
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

// T36: what a bred vector was bred AGAINST, hashed from live objects rather
// than from file text - the browser cannot see its own source (fetch is dead
// on file://), so tune.js's engineHash is unavailable to the ladder. This
// catches the two drifts that change what a champion MEANS: any CONFIG number
// and the vector's own shape, plus the faction table (kits, costs, income
// hooks by source). It does NOT catch rules code elsewhere in sim.js, so a
// matching hash means "the numbers still agree", not "byte-identical engine".
function contentHash() {
  const ser = (v) => typeof v === 'function' ? String(v)
    : (v && typeof v === 'object' && !Array.isArray(v))
      ? '{' + Object.keys(v).sort().map(k => k + ':' + ser(v[k])).join(',') + '}'
      : Array.isArray(v) ? '[' + v.map(ser).join(',') + ']' : String(v);
  const s = ser(sim.CONFIG) + '|' + ser(sim.FACTIONS) + '|' + PARAM_NAMES.join(',');
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

// slot placement preferences: towers guard the nest first, eco hides in the
// rear, hatcheries take whatever is left near the back
const TOWER_SLOT_ORDER = [0, 1, 2, 3, 6, 7, 4, 5];
const REAR_SLOT_ORDER = [4, 5, 2, 3, 0, 1, 6, 7];

function firstEmptyIn(S, side, order) {
  for (const i of order) if (S.slots[side][i].type === null) return i;
  return -1;
}

// T35: what BODIES the foe's offence buildings put on the field, by mass.
// The def triggers used to count sandbox brood TYPES (majorb for the sharp,
// hatch+swarmb for the spit, soldierb+majorb for the charmer) and neither
// seep.kit nor veil.kit contains one of those, so four def buildings were
// unbuyable against those factions at ANY vector value - the charmer included,
// which is the mechanism VEIL's whole design rests on. Reading the bred unit's
// hp instead is faction-agnostic: heavy hosts are what a sharp shoots and a
// charm is worth stealing, light ones are what arrives in numbers. A stamping
// foe breeds nothing at all (the press fuses its broods into one fat host per
// beat), so every offence building it owns counts heavy - T25's architecture
// read, which the Chorus Hall bid already used.
function foeBodies(S, foe) {
  const cfg = S.cfg, stamp = sim.faction(S, foe).stamp;
  let chaff = 0, heavy = 0;
  for (const s of S.slots[foe]) {
    const prod = s.type && cfg.PRODUCTION[s.type];
    if (!prod) continue;
    if (stamp || cfg.UNITS[prod.unit].hp >= cfg.UNITS.soldier.hp) heavy++;
    else chaff++;
  }
  return { chaff, heavy };
}

// ----------------------------------------------------------------- kit -----
// The meta-progression layer (v0.7): the campaign starts with a lean kit
// and each level's first win unlocks the tech the NEXT level demands.
// The sim knows nothing about locks - controllers (opts.allowed) and the
// renderer filter build options; the rules stay identical for everyone.
// 'conv' sits in BASE_KIT as a PROTOTYPE-ONLY placement (v0.9.5): the
// converter is the CHORUS faction signature and will move to the faction
// kits when v1.0 lands; until then every playtest needs access to it.
// Campaign AI vectors all carry convTrig 9, so ladder grades are unmoved.
const BASE_KIT = ['farm', 'grove', 'tower', 'hatch', 'swarmb', 'soldierb', 'conv'];

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
  const brain = prepVec(rawParams);
  const thinkEvery = (opts && opts.thinkEvery) || 0.8;
  const allowed = (opts && opts.allowed) || null;
  const mem = { nextThink: 0 };

  return function control(S, side) {
    if (S.t < mem.nextThink) return null;
    mem.nextThink = S.t + thinkEvery;
    return decide(brain, S, side, allowed);
  };
}

// T37 split the per-think decision out of makeController so a bank of vectors
// can share it: one vector is now the bank-of-one case. Everything a vector
// implies but does not change during a match (the clamp, the normalised mix
// shares) is precomputed here, once per vector rather than once per think.
function prepVec(rawParams) {
  const P = clampParams(rawParams);
  const mixTotal = P.mixSwarm + P.mixSoldier + P.mixMajor + P.mixSapper + P.mixPredator + P.mixHorn + P.mixFife + P.mixOoze + P.mixGrub + P.mixSlither + P.mixCarrier + 0.001;
  return {
    P,
    mix: {
      swarmb: P.mixSwarm / mixTotal,
      soldierb: P.mixSoldier / mixTotal,
      majorb: P.mixMajor / mixTotal,
      sapperb: P.mixSapper / mixTotal,
      predatorb: P.mixPredator / mixTotal,
      hornb: P.mixHorn / mixTotal,
      fifeb: P.mixFife / mixTotal,
      oozeb: P.mixOoze / mixTotal,
      grubb: P.mixGrub / mixTotal,
      slitherb: P.mixSlither / mixTotal,
      carrierb: P.mixCarrier / mixTotal,
    },
  };
}

function decide(brain, S, side, allowed) {
  const P = brain.P, mix = brain.mix;
  const cfg = S.cfg;
  const foe = sim.other(side);
  const eco = sim.familyCount(S, side, 'eco');
  const def = sim.familyCount(S, side, 'def');
  const off = sim.familyCount(S, side, 'off');
  const foeOff = sim.familyCount(S, foe, 'off');

  // candidate builds, scored; the best positive one is the intent - if we
  // can't afford it yet we SAVE for it rather than buying something lesser
  const cands = [];

  // new buildings, named by the FACTION's root for that family rather than
  // hardcoded (sandbox grows farm/tower/hatch; SEEP grows a Mat straight
  // from bare ground, so farmTarget is its mat count)
  const roots = sim.faction(S, side).roots || ['farm', 'tower', 'hatch'];
  const rootOf = fam => roots.find(t => sim.FAMILIES[fam].includes(t));
  const ecoRoot = rootOf('eco'), defRoot = rootOf('def'), offRoot = rootOf('off');
  // wanting five more of something does not make the NEXT one five times as
  // valuable - flatBuild lerps the shortfall toward 1 (0 = the raw shortfall)
  const urge = short => short + P.flatBuild * (1 - short);
  if (ecoRoot && eco < P.farmTarget) {
    const slot = firstEmptyIn(S, side, REAR_SLOT_ORDER);
    if (slot !== -1) cands.push({ score: P.wEco * urge(P.farmTarget - eco), a: { kind: 'build', slot, type: ecoRoot } });
  }
  const desiredTowers = P.towersBase + P.towersPer100s * S.t / 100 + (foeOff > def ? P.reactDef : 0);
  if (defRoot && def < desiredTowers) {
    const slot = firstEmptyIn(S, side, TOWER_SLOT_ORDER);
    if (slot !== -1) cands.push({ score: P.wDef * urge(desiredTowers - def), a: { kind: 'build', slot, type: defRoot } });
  }
  if (offRoot && off < P.hatchTarget) {
    const slot = firstEmptyIn(S, side, REAR_SLOT_ORDER);
    if (slot !== -1) cands.push({ score: P.wOff * urge(P.hatchTarget - off), a: { kind: 'build', slot, type: offRoot } });
  }

  // creep Mats grow from farms (fx0.3): the sandbox's SEEP eco conversion.
  // Inert for the SEEP faction proper, whose eco root already IS the mat.
  if (P.matTarget > 0 && sim.count(S, side, 'mat') < P.matTarget) {
    const i = S.slots[side].findIndex(s => s.type === 'farm');
    if (i !== -1) cands.push({ score: P.wEco * P.upgW * 0.95, a: { kind: 'build', slot: i, type: 'mat' } });
  }

  // T26: the flywheel's gears. Gate on the MECHANISM, not on a count (T25):
  // a side whose income does not RIDE the flywheel is buying a farm that
  // cannot be upgraded, and in the red-line's case a pure penalty.
  // T31: `flywheel`, not `income` - VEIL owns an income hook (the tithe) and
  // no flywheel at all, so the old read would have had it bidding for gears.
  if (sim.faction(S, side).flywheel) {
    // sacrifice the CHEAPEST farm on the chain - a levelled brain owns no
    // plain farm by the time a reactive gear trigger fires
    let gearFarm = -1;
    for (const t of ['farm', 'grove', 'plant']) {
      if (gearFarm === -1) gearFarm = S.slots[side].findIndex(s => s.type === t);
    }
    if (gearFarm !== -1) {
      // the governor answers a foe that KILLS BUILDINGS - mortars and
      // sappers are the only things that do, so nothing else predicts a
      // knock. (Both gears are dark: T26 found the knock itself is worth
      // 0 hill damage, so these bids are unreachable until question 22.)
      const foeBreakers = sim.count(S, foe, 'mortar') + sim.count(S, foe, 'sapperb');
      if (foeBreakers >= P.govTrig && sim.count(S, side, 'governor') < 1) {
        cands.push({ score: P.wEco * P.upgW * 1.3, a: { kind: 'build', slot: gearFarm, type: 'governor' } });
      }
      // the red-line pays in proportion to the gross it multiplies, so it
      // bids off OWN eco (the sapTrig precedent) - and never over a
      // governor, which would switch the acceleration straight back off
      if (eco >= P.redTrig && sim.count(S, side, 'redline') < 1
          && sim.count(S, side, 'governor') === 0) {
        cands.push({ score: P.wEco * P.upgW * 1.15, a: { kind: 'build', slot: gearFarm, type: 'redline' } });
      }
    }
  }

  // T45: VEIL's eco leaves, on the same chain and the same "cheapest farm"
  // rule as the gears. They gate on `tithe` rather than on a body count for
  // T25's reason, and on CORRUPTION ALREADY STANDING rather than on the foe's
  // architecture for T34a's: what predicts the value of a skim multiplier is
  // skim already flowing. Both read the Kiss's quantity - pipped foe BUILDINGS,
  // never the raw pip total, because a count that can pass 9 has no "never"
  // and hard rule 6's neutral value would arm every shipped vector. A
  // Reliquary also needs somewhere for the hold to land, so it waits for a
  // charmer.
  if (sim.faction(S, side).tithe) {
    let titheFarm = -1;
    for (const t of ['farm', 'grove', 'plant']) {
      if (titheFarm === -1) titheFarm = S.slots[side].findIndex(s => s.type === t);
    }
    if (titheFarm !== -1) {
      let foePipped = 0;
      for (const s of S.slots[foe]) if (s.type && !s.flipped && s.pips > 0) foePipped++;
      if (foePipped >= P.deepTrig && sim.count(S, side, 'deep') < 1) {
        cands.push({ score: P.wEco * P.upgW * 1.3, a: { kind: 'build', slot: titheFarm, type: 'deep' } });
      }
      const charmers = sim.count(S, side, 'conv') + sim.count(S, side, 'hall');
      if (foePipped >= P.relicTrig && charmers > 0 && sim.count(S, side, 'relic') < 1) {
        cands.push({ score: P.wEco * P.upgW * 1.2, a: { kind: 'build', slot: titheFarm, type: 'relic' } });
      }
    }
  }

  // farm level upgrades
  if (P.farmLvl >= 2) {
    const i = S.slots[side].findIndex(s => s.type === 'farm');
    if (i !== -1) cands.push({ score: P.wEco * P.upgW * 0.9, a: { kind: 'build', slot: i, type: 'grove' } });
  }
  if (P.farmLvl >= 3) {
    const i = S.slots[side].findIndex(s => s.type === 'grove');
    if (i !== -1) cands.push({ score: P.wEco * P.upgW * 0.85, a: { kind: 'build', slot: i, type: 'plant' } });
  }

  // tower specialisations, reading the foe's visible production buildings
  const baseTower = S.slots[side].findIndex(s => s.type === 'tower');
  if (baseTower !== -1) {
    const bodies = foeBodies(S, foe);
    const foeWorkerB = sim.count(S, foe, 'hatch') + sim.count(S, foe, 'swarmb');
    if (bodies.heavy >= P.sharpTrig && sim.count(S, side, 'sharp') < 2) {
      cands.push({ score: P.wDef * P.upgW * 1.5, a: { kind: 'build', slot: baseTower, type: 'sharp' } });
    }
    if (bodies.chaff >= P.spitTrig && sim.count(S, side, 'spit') < 2) {
      cands.push({ score: P.wDef * P.upgW * 1.2, a: { kind: 'build', slot: baseTower, type: 'spit' } });
    }
    if (def >= P.sapTrig && sim.count(S, side, 'sap') < 1) {
      cands.push({ score: P.wDef * P.upgW * 0.8, a: { kind: 'build', slot: baseTower, type: 'sap' } });
    }
    // guards counter contact comps (swarms, sappers); never convert the
    // last shooting tower into one
    const foeMeleeB = bodies.chaff + sim.count(S, foe, 'sapperb');
    if (foeMeleeB >= P.guardTrig && sim.count(S, side, 'guard') < 2 && def >= 2) {
      cands.push({ score: P.wDef * P.upgW * 0.9, a: { kind: 'build', slot: baseTower, type: 'guard' } });
    }
    // mortars: siege artillery against a fortifying foe (worthless vs a
    // foe with nothing to bombard); never the last shooting tower.
    // Every building is bombardable now, so count them all - a trigger
    // that can't see a target never fires at it
    let foeBuildings = 0;
    for (const s of S.slots[foe]) if (s.type) foeBuildings++;
    if (foeBuildings >= P.mortarTrig && sim.count(S, side, 'mortar') < 2 && def >= 2) {
      cands.push({ score: P.wDef * P.upgW * 1.1, a: { kind: 'build', slot: baseTower, type: 'mortar' } });
    }
    // converters: a charm is worth having against ANY body line - the design
    // has a SEEP trickle FEEDING a charmer, and SEEP breeds nothing heavy - so
    // this reads body sources of either mass and leaves the value scaling to
    // the Chorus Hall, which is the arm priced for hosts a base charm cannot
    // hold. A converter shoots no ants: never the last shooting tower.
    if (bodies.chaff + bodies.heavy >= P.convTrig
        && sim.count(S, side, 'conv') < 2 && def >= 2) {
      cands.push({ score: P.wDef * P.upgW * 1.1, a: { kind: 'build', slot: baseTower, type: 'conv' } });
    }
    // OQ25 (2026-08-04): the bell hangs off the tower tree too now, so a
    // sandbox brain can buy the screen on the same trigger VEIL uses (the
    // foe's offence buildings - a bell answers arrivals of any shape).
    // Never the last shooting tower: a bell fires nothing.
    if (foeOff >= P.bellTrig && sim.count(S, side, 'bell') < 2 && def >= 2) {
      cands.push({ score: P.wDef * P.upgW * 1.2, a: { kind: 'build', slot: baseTower, type: 'bell' } });
    }
    // dynamos: cumulative spin pays off against a foe that never stops
    // feeding it targets, so the trigger reads the foe's TRICKLE lines
    // (worker floods and ooze dens) - the design's anti-trickle answer
    const foeTrickleB = foeWorkerB + sim.count(S, foe, 'oozeb');
    if (foeTrickleB >= P.dynamoTrig && sim.count(S, side, 'dynamo') < 2) {
      cands.push({ score: P.wDef * P.upgW * 1.25, a: { kind: 'build', slot: baseTower, type: 'dynamo' } });
    }
    // arc coils want SIMULTANEOUS arrivals, which is a different foe from the
    // dynamo's endless stream: blooms and worker floods clump, and a LONG foe
    // beat drops its whole muster at once, so the foe's own drum period is
    // the bid (a drumless trickle foe reads 1 - its clumps come from bloom).
    // ...and a STAMPING foe is not a clump foe however many broods it owns:
    // it pours them all into one fat body per beat, whose neighbourhood
    // measures 0.00 bodies at every radius. Counting its hatcheries is the
    // false positive that made a coil read like a downgraded plain tower.
    const foeClumpB = sim.faction(S, foe).stamp ? 0
      : foeWorkerB + sim.count(S, foe, 'oozeb');
    const foePeriod = sim.drumPeriod(S, foe);
    if (foeClumpB >= P.coilTrig && sim.count(S, side, 'coil') < 2) {
      const beatW = foePeriod === null ? 1 : foePeriod / cfg.WAR_DRUM;
      cands.push({ score: P.wDef * P.upgW * 1.15 * beatW, a: { kind: 'build', slot: baseTower, type: 'coil' } });
    }
    // ramparts shove whatever arrives ON FOOT in numbers (worker floods,
    // sappers, shambler trickles), and they shove it once per OWN beat - so
    // the same wall is worth 1.8x as much to a fife-stacked drum as to the
    // plain 18s one. That factor is the metronome bid the design wants the
    // brain to feel, and it is why a drumless side never bids: no beat, no
    // punch. Never the last shooting tower - a rampart fires nothing.
    // ...and it wants the most FORWARD plain tower, not the first one: a
    // punch only lands on a body already in reach, and at the beat that is
    // 0.60 of the time from an outpost against 0.27 from a nest slot
    // (measured). Taking the LAST plain tower also stops the wall
    // cannibalising the nest gun line, which is what made the first A/B
    // collapse (1.00 -> 0.40 vs SEEP for two swapped towers).
    const ownPeriod = sim.drumPeriod(S, side);
    const foeFootB = foeMeleeB + sim.count(S, foe, 'oozeb');
    let fwdTower = -1;
    for (let i = 0; i < S.slots[side].length; i++) if (S.slots[side][i].type === 'tower') fwdTower = i;
    if (ownPeriod !== null && foeFootB >= P.rampartTrig
        && sim.count(S, side, 'rampart') < 2 && def >= 2) {
      cands.push({ score: P.wDef * P.upgW * (cfg.WAR_DRUM / ownPeriod), a: { kind: 'build', slot: fwdTower, type: 'rampart' } });
    }
  }

  // T44: SEEP's def root is the Thicket now, and the guard post hangs off IT
  // rather than off a plain tower nobody in that kit can build. Same trigger
  // and same weight as the tower-tree guard - what moved is the trunk, not
  // the appetite - and never the last thicket: the patch is the only thing
  // SEEP owns that touches everything in the lane at once.
  const baseThicket = S.slots[side].findIndex(s => s.type === 'thicket');
  if (baseThicket !== -1 && sim.count(S, side, 'thicket') >= 2 && sim.count(S, side, 'guard') < 2) {
    const b = foeBodies(S, foe);
    if (b.chaff + sim.count(S, foe, 'sapperb') >= P.guardTrig) {
      cands.push({ score: P.wDef * P.upgW * 0.9, a: { kind: 'build', slot: baseThicket, type: 'guard' } });
    }
  }
  // OQ25 ruling (2026-08-04): the def tree flipped - the bell is VEIL's def
  // ROOT (the shortfall bid above grows it from bare ground, and 220 is
  // buyable at t=0) and the CHARMER grows off a bell now. Never the last
  // bell: the conv it becomes freezes nothing, so the screen must stand
  // twice before one is spent on theft. Same trigger as the tower-tree
  // charmer: the foe's BIG broods are what a charm is worth stealing.
  const baseConv = S.slots[side].findIndex(s => s.type === 'conv');
  const baseBell = S.slots[side].findIndex(s => s.type === 'bell');
  if (baseBell !== -1 && sim.count(S, side, 'bell') >= 2 && sim.count(S, side, 'conv') < 2) {
    const b = foeBodies(S, foe);
    if (b.chaff + b.heavy >= P.convTrig) {
      cands.push({ score: P.wDef * P.upgW * 1.1, a: { kind: 'build', slot: baseBell, type: 'conv' } });
    }
  }
  // T34: the Chorus Hall may take the LAST charmer, because it still charms -
  // what it trades is channel speed for hold length. So it answers the hosts
  // the base charm cannot hold: `charmHpSec / hp` bottoms out at `charmMin`,
  // and the only things heavy enough for that are majors and a stamper's fat
  // product, which is the MECHANISM read T25 demands rather than a brood count.
  // One is enough - the choir is a presence flag, and a second hall is just a
  // second charmer the `conv` bid already knows how to want.
  if (baseConv !== -1 && sim.count(S, side, 'hall') < 1) {
    const foeHeavy = sim.count(S, foe, 'majorb')
      + (sim.faction(S, foe).stamp ? sim.familyCount(S, foe, 'off') : 0);
    if (foeHeavy >= P.hallTrig) {
      cands.push({ score: P.wDef * P.upgW * 1.25, a: { kind: 'build', slot: baseConv, type: 'hall' } });
    }
  }

  // offence-trunk specialisation toward the mix (largest share deficit
  // first). Skip kit-locked types HERE, not just in the legal filter below:
  // this loop picks a single winner, and if that winner were locked the bot
  // would never specialise anything and idle at the gold cap.
  // The trunk is the FACTION's offence root, not the literal 'hatch' (T21:
  // SEEP grows an Ooze Den from bare ground, so a hardcoded lookup left its
  // whole nine-key mix vector unreachable).
  const baseHatch = offRoot ? S.slots[side].findIndex(s => s.type === offRoot) : -1;
  if (baseHatch !== -1 && off > 0) {
    const specs = sim.buildOptions(S, side, baseHatch);   // faction-filtered
    let bestType = null, bestDeficit = 0.05;
    for (const type of ['swarmb', 'soldierb', 'majorb', 'sapperb', 'predatorb', 'hornb', 'fifeb', 'oozeb', 'grubb', 'slitherb', 'carrierb']) {
      if (!specs.includes(type)) continue;
      if (allowed && !allowed.types.includes(type)) continue;
      const share = sim.count(S, side, type) / off;
      const deficit = mix[type] - share;
      if (deficit > bestDeficit) { bestDeficit = deficit; bestType = type; }
    }
    if (bestType) {
      cands.push({ score: P.wOff * P.upgW * (0.8 + bestDeficit), a: { kind: 'build', slot: baseHatch, type: bestType } });
    }
  }

  // T34: the Plague Kiss eats a CYST, so it trades a pip source for a pip
  // multiplier - worth nothing at all on a nest the carriers have not reached
  // yet, and never worth the last cyst. The trigger reads the state the
  // mechanic needs rather than the foe's architecture (which is the T25 rule,
  // not an exception to it): what predicts a spread is pips already standing,
  // and no brood count on either side predicts that.
  const baseCyst = S.slots[side].findIndex(s => s.type === 'carrierb');
  if (baseCyst !== -1 && sim.count(S, side, 'carrierb') >= 2 && sim.count(S, side, 'kiss') < 1) {
    let foePipped = 0;
    for (const s of S.slots[foe]) if (s.type && !s.flipped && s.pips > 0) foePipped++;
    if (foePipped >= P.kissTrig) {
      cands.push({ score: P.wOff * P.upgW * 1.3, a: { kind: 'build', slot: baseCyst, type: 'kiss' } });
    }
  }

  // level up specialised buildings: the late-game gold sink (out-tech)
  if (P.lvlW > 0) {
    for (let i = 0; i < S.slots[side].length; i++) {
      const slot = S.slots[side][i];
      if (!sim.LEVELABLE.includes(slot.type) || slot.lvl >= cfg.MAX_LVL) continue;
      const famW = ['sharp', 'spit', 'sap', 'mortar'].includes(slot.type) ? P.wDef : P.wOff;
      cands.push({ score: famW * P.lvlW * (0.75 - 0.1 * (slot.lvl - 1)), a: { kind: 'build', slot: i, type: 'lvl' }, cost: sim.lvlCost(S, slot) });
      break;                   // one level candidate per think is enough
    }
  }

  // drop candidates the faction kit or the campaign locks forbid BEFORE
  // picking an intent, or the controller would save forever for something
  // it cannot build
  const legal = cands.filter(c =>
    sim.buildOptions(S, side, c.a.slot).includes(c.a.type) &&
    (!allowed || (c.a.type === 'lvl'
      ? S.slots[side][c.a.slot].lvl + 1 <= allowed.maxLvl
      : allowed.types.includes(c.a.type))));

  if (!legal.length) return null;
  legal.sort((a, b) => b.score - a.score);
  const intent = legal[0];
  const cost = intent.cost !== undefined ? intent.cost : sim.costOf(S, side, intent.a.type);
  if (S.money[side] < cost) return null;   // save for it
  return [intent.a];
}

// ------------------------------------------------------- adaptive brain ---
// T37. A fixed vector is an opening book: a human meta-games it in three
// matches. This is the counter-picker - a small bank of bred vectors and a
// NAMED predicate per rule, re-read every think, so the brain that plays the
// second half of a match need not be the one that opened it.
//
// Deterministic and honest by construction: every read below is something the
// player's own HUD shows (the foe's faction chip, its buildings), there is no
// rng and no hidden state, and the vectors are the same shape the tuner breeds.
//
// The features are the board, not the matchup: `foeFaction` says which bred
// counter to reach for, and the two shape reads say what the foe has actually
// COMMITTED to - which is what can change mid-match, and what T25 says a
// reactive rule must read (a mechanism, not a name).
function boardFeatures(S, side) {
  const foe = sim.other(side);
  const bodies = foeBodies(S, foe);
  return {
    foeFaction: S.cfg.FACTION[foe],
    foeChaff: bodies.chaff,
    foeDef: sim.familyCount(S, foe, 'def'),
  };
}

// Rule predicates: pure functions of the feature bag, named so a bank is
// readable data rather than a pile of closures with thresholds hidden in them.
// The thresholds are here and nowhere else. A bank's rules are tried IN ORDER,
// so the faction reads (a whole bred kit, known from the first frame) come
// before the shape reads (which only fire for the leftover factions, and only
// once the foe has committed).
const PREDICATES = {
  foeIsSandbox: F => F.foeFaction === 'sandbox',
  foeIsSeep:    F => F.foeFaction === 'seep',
  foeIsFoundry: F => F.foeFaction === 'foundry',
  foeIsVeil:    F => F.foeFaction === 'veil',
  // three or more def buildings is a foe spending its gold on the nest, not on
  // the lane - the mortarWall/convWall shape
  foeTurtles:   F => F.foeDef >= 3,
  // three or more light body sources is a flood; heavy ones arrive in ones and
  // twos, so the same count means the opposite thing
  foeFloods:    F => F.foeChaff >= 3,
};

// bank: { default: vec, rules: [{ when: <PREDICATES key>, vec }] }. A bank with
// no matching rule plays `default`, which is exactly makeController - so a
// bank-of-one and a fixed champion are the same brain.
function makeAdaptiveController(bank, opts) {
  const thinkEvery = (opts && opts.thinkEvery) || 0.8;
  const allowed = (opts && opts.allowed) || null;
  const fallback = prepVec(bank.default);
  const rules = (bank.rules || []).map(r => {
    if (!PREDICATES[r.when]) throw new Error('unknown bank predicate: ' + r.when);
    return { when: PREDICATES[r.when], brain: prepVec(r.vec) };
  });
  const mem = { nextThink: 0 };

  return function control(S, side) {
    if (S.t < mem.nextThink) return null;
    mem.nextThink = S.t + thinkEvery;
    const F = boardFeatures(S, side);
    const hit = rules.find(r => r.when(F));
    return decide(hit ? hit.brain : fallback, S, side, allowed);
  };
}

// what the ladder and the tuner both call: a bank entry may be a bare vector
// (the grub and soldier rungs) or a bank (the queen rung since T37)
function makeBrain(brainOrBank, opts) {
  return brainOrBank && brainOrBank.default
    ? makeAdaptiveController(brainOrBank, opts) : makeController(brainOrBank, opts);
}

// -------------------------------------------------------------- personas ---
const PERSONAS = {
  rustle: {
    label: 'QUEEN RUSTLE (Rusher)',
    intro: 'Hatcheries everywhere, swarms on every drum. Out-grow her - if you live.',
    params: {
      wEco: 0.8, wDef: 1, wOff: 2.6,
      farmTarget: 2, hatchTarget: 5, towersBase: 1, towersPer100s: 0.5, reactDef: 1,
      farmLvl: 2, matTarget: 0, mixSwarm: 1, mixSoldier: 0.3, mixMajor: 0.15, mixSapper: 0.15, mixPredator: 0, mixHorn: 0, mixFife: 0, mixOoze: 0, mixGrub: 0, mixSlither: 0, mixCarrier: 0,
      sharpTrig: 2, spitTrig: 3, sapTrig: 9, guardTrig: 5, mortarTrig: 9, convTrig: 9, dynamoTrig: 9, rampartTrig: 9, coilTrig: 9, bellTrig: 9, kissTrig: 9, hallTrig: 9, govTrig: 9, redTrig: 9, deepTrig: 9, relicTrig: 9, upgW: 0.9, lvlW: 0.6, flatBuild: 0,
    },
  },
  tussock: {
    label: 'WARDEN TUSSOCK (Turtle)',
    intro: 'Walls, sap, and lane guards on a slow drum. Sappers crack shells - or grind the clock.',
    params: {
      // wEco 1.2 -> 1.5 in v0.8: with no free start tower the rustle matchup
      // became a decay-phase photo-finish; a touch more economy wins the grind
      wEco: 1.5, wDef: 2.6, wOff: 0.9,
      farmTarget: 2, hatchTarget: 2, towersBase: 3, towersPer100s: 1.2, reactDef: 1,
      farmLvl: 2, matTarget: 0, mixSwarm: 0.2, mixSoldier: 1, mixMajor: 0.4, mixSapper: 0.05, mixPredator: 0, mixHorn: 0, mixFife: 0, mixOoze: 0, mixGrub: 0, mixSlither: 0, mixCarrier: 0,
      sharpTrig: 1, spitTrig: 2, sapTrig: 3, guardTrig: 9, mortarTrig: 9, convTrig: 9, dynamoTrig: 9, rampartTrig: 9, coilTrig: 9, bellTrig: 9, kissTrig: 9, hallTrig: 9, govTrig: 9, redTrig: 9, deepTrig: 9, relicTrig: 9, upgW: 1.4, lvlW: 1.0, flatBuild: 0,
    },
  },
  bloom: {
    label: 'BARON BLOOM (Boomer)',
    intro: 'Plantations first, then majors with sapper escorts. Kill him before the giants hatch.',
    params: {
      wEco: 2.6, wDef: 0.9, wOff: 1.4,
      farmTarget: 5, hatchTarget: 4, towersBase: 1, towersPer100s: 0.5, reactDef: 1,
      farmLvl: 3, matTarget: 0, mixSwarm: 0.2, mixSoldier: 0.4, mixMajor: 1, mixSapper: 0.6, mixPredator: 0, mixHorn: 0, mixFife: 0, mixOoze: 0, mixGrub: 0, mixSlither: 0, mixCarrier: 0,
      sharpTrig: 3, spitTrig: 5, sapTrig: 9, guardTrig: 7, mortarTrig: 9, convTrig: 9, dynamoTrig: 9, rampartTrig: 9, coilTrig: 9, bellTrig: 9, kissTrig: 9, hallTrig: 9, govTrig: 9, redTrig: 9, deepTrig: 9, relicTrig: 9, upgW: 1.2, lvlW: 1.6, flatBuild: 0,
    },
  },
};

// pure-strategy sanity archetypes for the tuner: each SHOULD lose to something
const ARCHETYPES = {
  boomEco: {
    wEco: 3, wDef: 0.3, wOff: 0.6,
    farmTarget: 6, hatchTarget: 2, towersBase: 0, towersPer100s: 0, reactDef: 0,
    farmLvl: 3, matTarget: 0, mixSwarm: 0.3, mixSoldier: 0.3, mixMajor: 1, mixSapper: 0.2, mixPredator: 0, mixHorn: 0, mixFife: 0, mixOoze: 0, mixGrub: 0, mixSlither: 0, mixCarrier: 0,
    sharpTrig: 9, spitTrig: 9, sapTrig: 9, guardTrig: 9, mortarTrig: 9, convTrig: 9, dynamoTrig: 9, rampartTrig: 9, coilTrig: 9, bellTrig: 9, kissTrig: 9, hallTrig: 9, govTrig: 9, redTrig: 9, deepTrig: 9, relicTrig: 9, upgW: 1, lvlW: 2, flatBuild: 0,
  },
  wallDef: {
    wEco: 0.4, wDef: 3, wOff: 0.4,
    farmTarget: 1, hatchTarget: 1, towersBase: 4, towersPer100s: 2, reactDef: 2,
    farmLvl: 1, matTarget: 0, mixSwarm: 0.2, mixSoldier: 1, mixMajor: 0.2, mixSapper: 0, mixPredator: 0, mixHorn: 0, mixFife: 0, mixOoze: 0, mixGrub: 0, mixSlither: 0, mixCarrier: 0,
    sharpTrig: 1, spitTrig: 2, sapTrig: 2, guardTrig: 1, mortarTrig: 9, convTrig: 9, dynamoTrig: 9, rampartTrig: 9, coilTrig: 9, bellTrig: 9, kissTrig: 9, hallTrig: 9, govTrig: 9, redTrig: 9, deepTrig: 9, relicTrig: 9, upgW: 1.5, lvlW: 1.2, flatBuild: 0,
  },
  allInHatch: {
    wEco: 0.3, wDef: 0.3, wOff: 3,
    farmTarget: 0, hatchTarget: 6, towersBase: 0, towersPer100s: 0, reactDef: 0,
    farmLvl: 1, matTarget: 0, mixSwarm: 1, mixSoldier: 0.3, mixMajor: 0.1, mixSapper: 0, mixPredator: 0, mixHorn: 0, mixFife: 0, mixOoze: 0, mixGrub: 0, mixSlither: 0, mixCarrier: 0,
    sharpTrig: 9, spitTrig: 9, sapTrig: 9, guardTrig: 9, mortarTrig: 9, convTrig: 9, dynamoTrig: 9, rampartTrig: 9, coilTrig: 9, bellTrig: 9, kissTrig: 9, hallTrig: 9, govTrig: 9, redTrig: 9, deepTrig: 9, relicTrig: 9, upgW: 0.6, lvlW: 0.3, flatBuild: 0,
  },
  // v0.5 sanity probe: sappers as the whole plan. Should crack turtles but
  // lose to guards/spitters - if it dominates the field, sappers are broken.
  sapperAllIn: {
    wEco: 0.6, wDef: 0.5, wOff: 3,
    farmTarget: 1, hatchTarget: 5, towersBase: 1, towersPer100s: 0, reactDef: 0,
    farmLvl: 1, matTarget: 0, mixSwarm: 0.15, mixSoldier: 0.15, mixMajor: 0.2, mixSapper: 1, mixPredator: 0, mixHorn: 0, mixFife: 0, mixOoze: 0, mixGrub: 0, mixSlither: 0, mixCarrier: 0,
    sharpTrig: 9, spitTrig: 9, sapTrig: 9, guardTrig: 9, mortarTrig: 9, convTrig: 9, dynamoTrig: 9, rampartTrig: 9, coilTrig: 9, bellTrig: 9, kissTrig: 9, hallTrig: 9, govTrig: 9, redTrig: 9, deepTrig: 9, relicTrig: 9, upgW: 1, lvlW: 0.8, flatBuild: 0,
  },
  // v0.9 sanity probe: combined-arms siege - mortars blow holes in the
  // enemy wall, majors walk through them. Should crack fortified foes but
  // lose to aggression (mortars hold fire vs a foe with no defence
  // buildings, and 220g of artillery shoots no ants). First cut was pure
  // turtle+mortar: it felled 16 towers a game and still lost - demolition
  // without an army to exploit the holes is a very expensive light show.
  mortarWall: {
    wEco: 1.3, wDef: 2.2, wOff: 1.3,
    farmTarget: 2, hatchTarget: 3, towersBase: 3, towersPer100s: 1, reactDef: 1,
    farmLvl: 2, matTarget: 0, mixSwarm: 0.2, mixSoldier: 1, mixMajor: 0.5, mixSapper: 0, mixPredator: 0, mixHorn: 0, mixFife: 0, mixOoze: 0, mixGrub: 0, mixSlither: 0, mixCarrier: 0,
    sharpTrig: 2, spitTrig: 2, sapTrig: 6, guardTrig: 9, mortarTrig: 1, convTrig: 9, dynamoTrig: 9, rampartTrig: 9, coilTrig: 9, bellTrig: 9, kissTrig: 9, hallTrig: 9, govTrig: 9, redTrig: 9, deepTrig: 9, relicTrig: 9, upgW: 1.3, lvlW: 1.0, flatBuild: 0,
  },
  // v0.9 sanity probe: predator screens as midfield control. Should eat
  // concentrated marcher comps but drown under swarm volume (predators
  // deal zero hill damage, so over-investing loses the siege race).
  predScreen: {
    wEco: 1.5, wDef: 1, wOff: 2.4,
    farmTarget: 2, hatchTarget: 4, towersBase: 1, towersPer100s: 0.6, reactDef: 1,
    farmLvl: 2, matTarget: 0, mixSwarm: 0.3, mixSoldier: 0.7, mixMajor: 0.2, mixSapper: 0.2, mixPredator: 1, mixHorn: 0, mixFife: 0, mixOoze: 0, mixGrub: 0, mixSlither: 0, mixCarrier: 0,
    sharpTrig: 3, spitTrig: 3, sapTrig: 9, guardTrig: 9, mortarTrig: 9, convTrig: 9, dynamoTrig: 9, rampartTrig: 9, coilTrig: 9, bellTrig: 9, kissTrig: 9, hallTrig: 9, govTrig: 9, redTrig: 9, deepTrig: 9, relicTrig: 9, upgW: 1, lvlW: 0.8, flatBuild: 0,
  },
  // v0.9.5 sanity probe: the monastery - eco behind walls, guards
  // shielding converters that turn the foe's army into the offence. The
  // guards are LOAD-BEARING: without them sapper escorts demolish the
  // converters and buying them is a strict self-own (bloom 1.00 -> 0.27).
  // Loses to a foe that won't send (tussock - starve the monastery) and
  // to midfield hunters (predScreen kills marchers before conversion range).
  convWall: {
    wEco: 1.8, wDef: 2.2, wOff: 0.8,
    farmTarget: 3, hatchTarget: 2, towersBase: 2, towersPer100s: 0.8, reactDef: 1,
    farmLvl: 2, matTarget: 0, mixSwarm: 0.2, mixSoldier: 1, mixMajor: 0.3, mixSapper: 0, mixPredator: 0, mixHorn: 0, mixFife: 0, mixOoze: 0, mixGrub: 0, mixSlither: 0, mixCarrier: 0,
    sharpTrig: 3, spitTrig: 3, sapTrig: 4, guardTrig: 2, mortarTrig: 9, convTrig: 1, dynamoTrig: 9, rampartTrig: 9, coilTrig: 9, bellTrig: 9, kissTrig: 9, hallTrig: 9, govTrig: 9, redTrig: 9, deepTrig: 9, relicTrig: 9, upgW: 1.3, lvlW: 1.0, flatBuild: 0,
  },
  // fx0.2 sanity probe: the long beat. Horn broods slow the drum toward the
  // clamp and ship the whole accrual as one giant wave - THE alpha-banking
  // probe (v0.1's exploit re-priced as a build decision). If this dominates
  // the field, the clamp or the horn cost is wrong; if it never wins, drum
  // slowing is a trap option.
  bigBeat: {
    wEco: 1.5, wDef: 1.5, wOff: 2.2,
    farmTarget: 3, hatchTarget: 5, towersBase: 2, towersPer100s: 0.8, reactDef: 1,
    farmLvl: 2, matTarget: 0, mixSwarm: 0.15, mixSoldier: 1, mixMajor: 0.6, mixSapper: 0.25, mixPredator: 0, mixHorn: 0.9, mixFife: 0, mixOoze: 0, mixGrub: 0, mixSlither: 0, mixCarrier: 0,
    sharpTrig: 2, spitTrig: 3, sapTrig: 9, guardTrig: 9, mortarTrig: 9, convTrig: 9, dynamoTrig: 9, rampartTrig: 9, coilTrig: 9, bellTrig: 9, kissTrig: 9, hallTrig: 9, govTrig: 9, redTrig: 9, deepTrig: 9, relicTrig: 9, upgW: 1.2, lvlW: 1.0, flatBuild: 0,
  },
  // fx0.2 sanity probe: the quickstep - fifes race the drum to the floor
  // for relentless small waves. Should shine vs slow alpha builds (hit
  // between their beats) and starve vs dedicated anti-swarm.
  quickstep: {
    wEco: 1.2, wDef: 0.8, wOff: 2.6,
    farmTarget: 2, hatchTarget: 5, towersBase: 1, towersPer100s: 0.5, reactDef: 1,
    farmLvl: 2, matTarget: 0, mixSwarm: 1, mixSoldier: 0.5, mixMajor: 0, mixSapper: 0.2, mixPredator: 0, mixHorn: 0, mixFife: 0.9, mixOoze: 0, mixGrub: 0, mixSlither: 0, mixCarrier: 0,
    sharpTrig: 9, spitTrig: 4, sapTrig: 9, guardTrig: 9, mortarTrig: 9, convTrig: 9, dynamoTrig: 9, rampartTrig: 9, coilTrig: 9, bellTrig: 9, kissTrig: 9, hallTrig: 9, govTrig: 9, redTrig: 9, deepTrig: 9, relicTrig: 9, upgW: 1, lvlW: 0.6, flatBuild: 0,
  },
  // fx0.3 sanity probe: the mat - farms become creep fountains, ooze dens
  // trickle shamblers whose corpses drag the frontier forward. Should
  // strangle turtles slowly (corrode + area income) but fold to a rush
  // before the mat matures - SEEP's authored weakness. If it dominates,
  // creep growth or splat reach is too hot; if it never wins, the mat is
  // dead weight and the numbers are cold.
  creeper: {
    wEco: 2.2, wDef: 1.0, wOff: 2.0,
    farmTarget: 4, hatchTarget: 4, towersBase: 1, towersPer100s: 0.4, reactDef: 1,
    farmLvl: 1, matTarget: 3, mixSwarm: 0.15, mixSoldier: 0.3, mixMajor: 0, mixSapper: 0, mixPredator: 0, mixHorn: 0, mixFife: 0, mixOoze: 1, mixGrub: 0, mixSlither: 0, mixCarrier: 0,
    sharpTrig: 9, spitTrig: 3, sapTrig: 9, guardTrig: 9, mortarTrig: 9, convTrig: 9, dynamoTrig: 9, rampartTrig: 9, coilTrig: 9, bellTrig: 9, kissTrig: 9, hallTrig: 9, govTrig: 9, redTrig: 9, deepTrig: 9, relicTrig: 9, upgW: 1.1, lvlW: 0.8, flatBuild: 0,
  },
  // the v0.9.5 evolved field-best (tune.js evolve, fit 1.00): still balanced
  // macro - heavy eco with growing towers, five hatcheries on a broad comp,
  // early sharps, deep upgrades. Beats the whole field ~1.0 incl convWall
  // 0.93. Doubles as the campaign endboss and as the "strong player"
  // reference when grading the level ladder. (Refreshed from the v0.9
  // vector, which predated converters and dropped 0.40 to convWall.)
  // NOTE: the raw evolved vector carried convTrig 2 but NEVER builds a
  // converter (verified bit-identical with 9 across 165 matches - genetic
  // drift on an inert param); recorded as 9 so the honesty is explicit.
  optimum: {
    wEco: 3, wDef: 2.42, wOff: 1.16,
    farmTarget: 4, hatchTarget: 5, towersBase: 2, towersPer100s: 1.58, reactDef: 0,
    farmLvl: 2, matTarget: 0, mixSwarm: 0.9, mixSoldier: 0.92, mixMajor: 0.51, mixSapper: 0.18, mixPredator: 0.67, mixHorn: 0, mixFife: 0, mixOoze: 0, mixGrub: 0, mixSlither: 0, mixCarrier: 0,
    sharpTrig: 1, spitTrig: 7, sapTrig: 5, guardTrig: 6, mortarTrig: 5, convTrig: 9, dynamoTrig: 9, rampartTrig: 9, coilTrig: 9, bellTrig: 9, kissTrig: 9, hallTrig: 9, govTrig: 9, redTrig: 9, deepTrig: 9, relicTrig: 9, upgW: 1.95, lvlW: 1.2, flatBuild: 0,
  },
};

// -------------------------------------------------------------- campaign ---
// The persona ladder (v0.6). Difficulty comes from honest knobs only:
// weakened/slowed AI vectors early, head starts (money, pre-built
// buildings) late. RULES stay symmetric; setups may not (level design).
// NOTE: setup money values are ABSOLUTE and sized against START_MONEY
// (220 since v0.8) - re-author them if the start gold ever moves again.
// Stars: win = 1, win with hill >= 100hp = 2, >= 200hp = 3.
const LEVELS = [
  // --- act 1: teach the three verbs ---
  {
    key: 'sprout', name: 'SEEDLING SNUG', act: 1,
    blurb: 'A sleepy boomer with no walls at all.',
    twist: 'He starts nearly broke. Breed ants and bury him.',
    hue: '#d88a50',
    reward: { key: 'spit', label: 'SCATTERGUN', desc: 'Splash shots. Swarms hate it.' },
    ai: {
      thinkEvery: 3,
      params: {
        wEco: 2.6, wDef: 0.5, wOff: 1,
        farmTarget: 4, hatchTarget: 2, towersBase: 0, towersPer100s: 0.2, reactDef: 0,
        farmLvl: 2, matTarget: 0, mixSwarm: 0.3, mixSoldier: 0.5, mixMajor: 0.5, mixSapper: 0, mixPredator: 0, mixHorn: 0, mixFife: 0, mixOoze: 0, mixGrub: 0, mixSlither: 0, mixCarrier: 0,
        sharpTrig: 9, spitTrig: 9, sapTrig: 9, guardTrig: 9, mortarTrig: 9, convTrig: 9, dynamoTrig: 9, rampartTrig: 9, coilTrig: 9, bellTrig: 9, kissTrig: 9, hallTrig: 9, govTrig: 9, redTrig: 9, deepTrig: 9, relicTrig: 9, upgW: 1, lvlW: 0, flatBuild: 0,
      },
    },
    setup: { moneyE: 110 },
  },
  {
    key: 'skitter', name: 'PRINCESS SKITTER', act: 1,
    blurb: 'A hatchling rusher: all swarm, no plan.',
    twist: 'Towers eat swarms. Build some, then out-grow her.',
    hue: '#b8b0a0',
    reward: { key: 'sapperb', label: 'SAPPER BROOD', desc: 'Breeds ants that DEMOLISH towers.' },
    ai: {
      thinkEvery: 2.5,
      params: {
        wEco: 0.8, wDef: 0.6, wOff: 2.2,
        farmTarget: 1, hatchTarget: 4, towersBase: 0, towersPer100s: 0.3, reactDef: 0,
        farmLvl: 1, matTarget: 0, mixSwarm: 1, mixSoldier: 0.15, mixMajor: 0, mixSapper: 0, mixPredator: 0, mixHorn: 0, mixFife: 0, mixOoze: 0, mixGrub: 0, mixSlither: 0, mixCarrier: 0,
        sharpTrig: 9, spitTrig: 9, sapTrig: 9, guardTrig: 9, mortarTrig: 9, convTrig: 9, dynamoTrig: 9, rampartTrig: 9, coilTrig: 9, bellTrig: 9, kissTrig: 9, hallTrig: 9, govTrig: 9, redTrig: 9, deepTrig: 9, relicTrig: 9, upgW: 0.8, lvlW: 0, flatBuild: 0,
      },
    },
    setup: { moneyE: 165 },
  },
  {
    key: 'pebble', name: 'OLD PEBBLE', act: 1,
    blurb: 'A stubborn little turtle behind stone.',
    twist: 'Stone laughs at soldiers. Sapper broods EAT stone.',
    hue: '#9cc088',
    reward: { key: 'guard', label: 'POLYP', desc: 'Buds defenders that block the lane.' },
    ai: {
      thinkEvery: 2.5,
      params: {
        wEco: 1, wDef: 2.2, wOff: 0.8,
        farmTarget: 2, hatchTarget: 1, towersBase: 2, towersPer100s: 0.6, reactDef: 1,
        farmLvl: 1, matTarget: 0, mixSwarm: 0.2, mixSoldier: 1, mixMajor: 0.2, mixSapper: 0, mixPredator: 0, mixHorn: 0, mixFife: 0, mixOoze: 0, mixGrub: 0, mixSlither: 0, mixCarrier: 0,
        sharpTrig: 9, spitTrig: 3, sapTrig: 9, guardTrig: 9, mortarTrig: 9, convTrig: 9, dynamoTrig: 9, rampartTrig: 9, coilTrig: 9, bellTrig: 9, kissTrig: 9, hallTrig: 9, govTrig: 9, redTrig: 9, deepTrig: 9, relicTrig: 9, upgW: 1, lvlW: 0.3, flatBuild: 0,
      },
    },
    setup: { moneyE: 165 },
  },
  // --- act 2: the real personas, telegraphed head starts ---
  {
    key: 'rustle', name: 'QUEEN RUSTLE', act: 2, persona: 'rustle',
    blurb: 'Hatcheries everywhere, swarms on every drum.',
    twist: 'Her first brood is already laid. Hold the early beats.',
    hue: '#c84632',
    reward: { key: 'majorb', label: 'MAJOR BROOD', desc: 'Breeds giants that soak tower fire.' },
    ai: { thinkEvery: 1.3, params: null },
    setup: { prebuildE: [{ slot: 3, type: 'hatch' }] },
  },
  {
    key: 'tussock', name: 'WARDEN TUSSOCK', act: 2, persona: 'tussock',
    blurb: 'Walls, sap and lane guards on a slow drum.',
    twist: 'Sappers alone will melt to his spitters. Bring an escort.',
    hue: '#9cc088',
    reward: { key: 'sharp', label: 'LONGBORE', desc: 'Long range. Giants fear it.' },
    ai: { thinkEvery: 1.5, params: null },
    setup: null,
  },
  {
    key: 'bloom', name: 'BARON BLOOM', act: 2, persona: 'bloom',
    blurb: 'Plantations first, then majors with sapper escorts.',
    twist: 'A farm and a tower stand, 280g banked, and his tech runs a step ahead.',
    hue: '#d88a50',
    reward: { key: 'plant', label: 'PLANTATION', desc: 'The tier-3 farm. Loot his greed.' },
    ai: { thinkEvery: 0.9, params: null, extraKit: ['lvl2'] },   // params filled from PERSONAS below
    setup: { moneyE: 280, prebuildE: [{ slot: 4, type: 'farm' }, { slot: 0, type: 'tower' }] },
  },
  // --- act 3: the bosses (full-speed wits, honest head starts) ---
  {
    key: 'endless', name: 'RUSTLE THE ENDLESS', act: 3, persona: 'rustle',
    blurb: 'The rusher, and the drum never helps you first.',
    twist: 'A swarm brood is already seething. 300g head start.',
    hue: '#c84632',
    reward: { key: 'lvl2', label: 'TECH LEVEL 2', desc: 'Specialised buildings can now level up.' },
    ai: { thinkEvery: 0.8, params: null },
    setup: { moneyE: 300, prebuildE: [{ slot: 3, type: 'swarmb' }] },
  },
  // --- v0.9 bosses: each showcases the toy you loot from it ---
  {
    key: 'brack', name: 'BOMBARDIER BRACK', act: 3,
    blurb: 'An artillerist behind walls. His mortars crack towers from across the field.',
    twist: 'You cannot out-sit artillery. Sappers eat his walls - or race the barrage. Win, and the mortar is yours for the turtle ahead.',
    hue: '#c87838',
    reward: { key: 'mortar', label: 'MORTAR TOWER', desc: 'Bombards enemy defences from your side.' },
    ai: { thinkEvery: 0.8, params: ARCHETYPES.mortarWall },
    setup: { moneyE: 260, prebuildE: [{ slot: 4, type: 'mortar' }] },
  },
  {
    key: 'unbroken', name: 'TUSSOCK THE UNBROKEN', act: 3, persona: 'tussock',
    blurb: 'The turtle, walled before you draw breath.',
    twist: 'A veteran sharpshooter already watches. 230g stocked.',
    hue: '#9cc088',
    reward: { key: 'sap', label: 'SAP TOWER', desc: 'A sticky aura that slows attackers.' },
    ai: { thinkEvery: 0.8, params: null },
    setup: { moneyE: 230, prebuildE: [{ slot: 1, type: 'sharp', lvl: 2 }] },
  },
  {
    key: 'thorn', name: 'HUNTRESS THORN', act: 3,
    blurb: 'Her predators prowl the midfield and eat marching armies alive.',
    twist: 'A spitter guards her camp and her hunters grab what they catch. Overwhelm the ambush - big waves stream past it.',
    hue: '#b0687a',
    reward: { key: 'predatorb', label: 'PREDATOR BROOD', desc: 'Breeds hunters that ambush marchers mid-lane.' },
    // NO predator prebuild: a hunter head start compounds as viciously as
    // the eco head starts of v0.6 - free predators erase the tiny opening
    // waves and the tempo snowballs (graded 0.00 for the WHOLE panel).
    ai: { thinkEvery: 0.8, params: ARCHETYPES.predScreen },
    setup: { moneyE: 260, prebuildE: [{ slot: 0, type: 'spit' }] },
  },
  {
    key: 'magnate', name: 'BLOOM THE MAGNATE', act: 3, persona: 'bloom',
    blurb: 'The boomer, rich beyond reason and thinking at full speed.',
    twist: 'A bulging purse (300g) behind a veteran spitter. Crack the greed or drown in giants.',
    hue: '#d88a50',
    reward: { key: 'lvl3', label: 'TECH LEVEL 3', desc: 'The final tech tier.' },
    ai: { thinkEvery: 0.8, params: null },
    setup: { moneyE: 300, prebuildE: [{ slot: 0, type: 'spit', lvl: 2 }] },
  },
  {
    key: 'optimum', name: 'THE OPTIMUM', act: 3,
    blurb: 'The tuner\'s champion: ten thousand simulated wars distilled.',
    twist: 'No head start. No handicap. Just better macro than you.',
    hue: '#ffd870',
    ai: { thinkEvery: 0.8, params: null },   // filled from ARCHETYPES.optimum
    setup: null,
  },
];
for (const L of LEVELS) {
  if (!L.ai.params) L.ai.params = L.persona ? PERSONAS[L.persona].params : ARCHETYPES[L.key];
}

// campaign kit helpers (ladder beaten in order): what the player holds
// ENTERING level i, and what that level's enemy may use - the player's kit
// plus the very tech this level's victory hands over. You loot it from
// them, and enemies escalate in step with the player instead of fielding
// tech the player has never seen.
function kitAtLevel(i) {
  const starsSoFar = {};
  for (let j = 0; j < i; j++) starsSoFar[LEVELS[j].key] = 1;
  return unlocksFrom(starsSoFar);
}
function enemyKitAt(i) {
  const starsSoFar = {};
  for (let j = 0; j <= i; j++) starsSoFar[LEVELS[j].key] = 1;
  const kit = unlocksFrom(starsSoFar);
  // a level may showcase tech beyond the loot rule (ai.extraKit) - e.g. the
  // act-2 finale boss previews leveling before the player earns it
  for (const key of (LEVELS[i].ai.extraKit || [])) {
    if (key === 'lvl2') kit.maxLvl = Math.max(kit.maxLvl, 2);
    else if (key === 'lvl3') kit.maxLvl = Math.max(kit.maxLvl, 3);
    else kit.types.push(key);
  }
  return kit;
}

return { PARAM_SPEC, PARAM_NAMES, clampParams, contentHash, makeController,
  makeAdaptiveController, makeBrain, PREDICATES, boardFeatures, PERSONAS,
  ARCHETYPES, LEVELS, BASE_KIT, unlocksFrom, kitAtLevel, enemyKitAt };
});
