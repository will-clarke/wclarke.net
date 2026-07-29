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
  mixSwarm:      [0, 1, false],    // hatchery specialisation mix
  mixSoldier:    [0, 1, false],
  mixMajor:      [0, 1, false],
  mixSapper:     [0, 1, false],    // ...sappers demolish enemy towers
  sharpTrig:     [1, 9, true],     // sharp once foe major-broods >= N (9=never)
  spitTrig:      [1, 9, true],     // spitter once foe worker-broods >= N (9=never)
  sapTrig:       [2, 9, true],     // sap once own towers >= N (9=never)
  guardTrig:     [1, 9, true],     // guard post once foe swarm/sapper broods >= N (9=never)
  upgW:          [0.2, 2, false],  // upgrades vs new builds
  lvlW:          [0, 2, false],    // appetite for levelling specialised buildings
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

// ------------------------------------------------------------ controller ---
function makeController(rawParams) {
  const P = clampParams(rawParams);
  const mem = { nextThink: 0 };

  // normalised hatch mix shares
  const mixTotal = P.mixSwarm + P.mixSoldier + P.mixMajor + P.mixSapper + 0.001;
  const mix = {
    swarmb: P.mixSwarm / mixTotal,
    soldierb: P.mixSoldier / mixTotal,
    majorb: P.mixMajor / mixTotal,
    sapperb: P.mixSapper / mixTotal,
  };

  return function control(S, side) {
    if (S.t < mem.nextThink) return null;
    mem.nextThink = S.t + 0.8;
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
    const desiredTowers = P.towersBase + P.towersPer100s * S.t / 100 + (foeOff > def ? P.reactDef : 0);
    if (def < desiredTowers) {
      const slot = firstEmptyIn(S, side, TOWER_SLOT_ORDER);
      if (slot !== -1) cands.push({ score: P.wDef * (desiredTowers - def), a: { kind: 'build', slot, type: 'tower' } });
    }
    if (off < P.hatchTarget) {
      const slot = firstEmptyIn(S, side, REAR_SLOT_ORDER);
      if (slot !== -1) cands.push({ score: P.wOff * (P.hatchTarget - off), a: { kind: 'build', slot, type: 'hatch' } });
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
      const foeMajorB = sim.count(S, foe, 'majorb');
      const foeWorkerB = sim.count(S, foe, 'hatch') + sim.count(S, foe, 'swarmb');
      if (foeMajorB >= P.sharpTrig && sim.count(S, side, 'sharp') < 2) {
        cands.push({ score: P.wDef * P.upgW * 1.5, a: { kind: 'build', slot: baseTower, type: 'sharp' } });
      }
      if (foeWorkerB >= P.spitTrig && sim.count(S, side, 'spit') < 2) {
        cands.push({ score: P.wDef * P.upgW * 1.2, a: { kind: 'build', slot: baseTower, type: 'spit' } });
      }
      if (def >= P.sapTrig && sim.count(S, side, 'sap') < 1) {
        cands.push({ score: P.wDef * P.upgW * 0.8, a: { kind: 'build', slot: baseTower, type: 'sap' } });
      }
      // guards counter contact comps (swarms, sappers); never convert the
      // last shooting tower into one
      const foeMeleeB = foeWorkerB + sim.count(S, foe, 'sapperb');
      if (foeMeleeB >= P.guardTrig && sim.count(S, side, 'guard') < 2 && def >= 2) {
        cands.push({ score: P.wDef * P.upgW * 0.9, a: { kind: 'build', slot: baseTower, type: 'guard' } });
      }
    }

    // hatchery specialisation toward the mix (largest share deficit first)
    const baseHatch = S.slots[side].findIndex(s => s.type === 'hatch');
    if (baseHatch !== -1 && off > 0) {
      let bestType = null, bestDeficit = 0.05;
      for (const type of ['swarmb', 'soldierb', 'majorb', 'sapperb']) {
        const share = sim.count(S, side, type) / off;
        const deficit = mix[type] - share;
        if (deficit > bestDeficit) { bestDeficit = deficit; bestType = type; }
      }
      if (bestType) {
        cands.push({ score: P.wOff * P.upgW * (0.8 + bestDeficit), a: { kind: 'build', slot: baseHatch, type: bestType } });
      }
    }

    // level up specialised buildings: the late-game gold sink (out-tech)
    if (P.lvlW > 0) {
      for (let i = 0; i < S.slots[side].length; i++) {
        const slot = S.slots[side][i];
        if (!sim.LEVELABLE.includes(slot.type) || slot.lvl >= cfg.MAX_LVL) continue;
        const famW = ['sharp', 'spit', 'sap'].includes(slot.type) ? P.wDef : P.wOff;
        cands.push({ score: famW * P.lvlW * (0.75 - 0.1 * (slot.lvl - 1)), a: { kind: 'build', slot: i, type: 'lvl' }, cost: sim.lvlCost(S, slot) });
        break;                   // one level candidate per think is enough
      }
    }

    if (!cands.length) return null;
    cands.sort((a, b) => b.score - a.score);
    const intent = cands[0];
    const cost = intent.cost !== undefined ? intent.cost : cfg.COSTS[intent.a.type];
    if (S.money[side] < cost) return null;   // save for it
    return [intent.a];
  };
}

// -------------------------------------------------------------- personas ---
const PERSONAS = {
  rustle: {
    label: 'QUEEN RUSTLE (Rusher)',
    intro: 'Hatcheries everywhere, swarms on every drum. Out-grow her - if you live.',
    params: {
      wEco: 0.8, wDef: 1, wOff: 2.6,
      farmTarget: 2, hatchTarget: 5, towersBase: 1, towersPer100s: 0.5, reactDef: 1,
      farmLvl: 2, mixSwarm: 1, mixSoldier: 0.3, mixMajor: 0.15, mixSapper: 0.15,
      sharpTrig: 2, spitTrig: 3, sapTrig: 9, guardTrig: 5, upgW: 0.9, lvlW: 0.6,
    },
  },
  tussock: {
    label: 'WARDEN TUSSOCK (Turtle)',
    intro: 'Walls, sap, and lane guards on a slow drum. Sappers crack shells - or grind the clock.',
    params: {
      wEco: 1.2, wDef: 2.6, wOff: 0.9,
      farmTarget: 2, hatchTarget: 2, towersBase: 3, towersPer100s: 1.2, reactDef: 1,
      farmLvl: 2, mixSwarm: 0.2, mixSoldier: 1, mixMajor: 0.4, mixSapper: 0.05,
      sharpTrig: 1, spitTrig: 2, sapTrig: 3, guardTrig: 9, upgW: 1.4, lvlW: 1.0,
    },
  },
  bloom: {
    label: 'BARON BLOOM (Boomer)',
    intro: 'Plantations first, then majors with sapper escorts. Kill him before the giants hatch.',
    params: {
      wEco: 2.6, wDef: 0.9, wOff: 1.4,
      farmTarget: 5, hatchTarget: 4, towersBase: 1, towersPer100s: 0.5, reactDef: 1,
      farmLvl: 3, mixSwarm: 0.2, mixSoldier: 0.4, mixMajor: 1, mixSapper: 0.6,
      sharpTrig: 3, spitTrig: 5, sapTrig: 9, guardTrig: 7, upgW: 1.2, lvlW: 1.6,
    },
  },
};

// pure-strategy sanity archetypes for the tuner: each SHOULD lose to something
const ARCHETYPES = {
  boomEco: {
    wEco: 3, wDef: 0.3, wOff: 0.6,
    farmTarget: 6, hatchTarget: 2, towersBase: 0, towersPer100s: 0, reactDef: 0,
    farmLvl: 3, mixSwarm: 0.3, mixSoldier: 0.3, mixMajor: 1, mixSapper: 0.2,
    sharpTrig: 9, spitTrig: 9, sapTrig: 9, guardTrig: 9, upgW: 1, lvlW: 2,
  },
  wallDef: {
    wEco: 0.4, wDef: 3, wOff: 0.4,
    farmTarget: 1, hatchTarget: 1, towersBase: 4, towersPer100s: 2, reactDef: 2,
    farmLvl: 1, mixSwarm: 0.2, mixSoldier: 1, mixMajor: 0.2, mixSapper: 0,
    sharpTrig: 1, spitTrig: 2, sapTrig: 2, guardTrig: 1, upgW: 1.5, lvlW: 1.2,
  },
  allInHatch: {
    wEco: 0.3, wDef: 0.3, wOff: 3,
    farmTarget: 0, hatchTarget: 6, towersBase: 0, towersPer100s: 0, reactDef: 0,
    farmLvl: 1, mixSwarm: 1, mixSoldier: 0.3, mixMajor: 0.1, mixSapper: 0,
    sharpTrig: 9, spitTrig: 9, sapTrig: 9, guardTrig: 9, upgW: 0.6, lvlW: 0.3,
  },
  // v0.5 sanity probe: sappers as the whole plan. Should crack turtles but
  // lose to guards/spitters - if it dominates the field, sappers are broken.
  sapperAllIn: {
    wEco: 0.6, wDef: 0.5, wOff: 3,
    farmTarget: 1, hatchTarget: 5, towersBase: 1, towersPer100s: 0, reactDef: 0,
    farmLvl: 1, mixSwarm: 0.15, mixSoldier: 0.15, mixMajor: 0.2, mixSapper: 1,
    sharpTrig: 9, spitTrig: 9, sapTrig: 9, guardTrig: 9, upgW: 1, lvlW: 0.8,
  },
};

return { PARAM_SPEC, PARAM_NAMES, clampParams, makeController, PERSONAS, ARCHETYPES };
});
