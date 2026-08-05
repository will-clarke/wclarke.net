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
  // fx0.2: drum-shifting buildings (the FOUNDRY beat-delta prototype). Each
  // one shifts ITS OWNER'S drum period; deltas stack per building and the
  // net period is clamped. A pending beat keeps its scheduled time - deltas
  // apply from the next beat onward (no sell-rebuild beat scrubbing).
  DRUM_DELTA: { hornb: 6, fifeb: -3 },
  DRUM_MIN: 10, DRUM_MAX: 36,
  // fx0.4: the SEEP paint FIELD - a per-side intensity grid (0..1 per cell)
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
    laneEmit: 0.3,      // /s each Mat also pushes into the LANE column at its
                        // own row. Mats sit in rear/flank slots, so without
                        // this their paint only reaches the fight via shambler
                        // trails - this is the arm that connects fountain to
                        // lane, and what makes the field pulse toward it.
    flow: 0.6,          // /s spread toward lower-intensity neighbours
    seep: 0.15,         // /s of a cell's paint advected one row toward the foe
    backSeep: 0.05,     // /s advected one row toward HOME. Net transport stays
                        // foe-ward; the back-flow is what re-covers the owner's
                        // own ground, restoring the fx0.3 band's home blanket
                        // that the T6a field lost.
    decay: 0.02,        // /s dissolve everywhere - paint is a flow you
                        // maintain, not a bank (the anti-ratchet guard that
                        // replaces fx0.3's recede-without-mats rule)
    burn: 0.25,         // /s scrubbed per SHOOTING foe tower at contact,
                        // falling linearly to 0 at its range edge (x level
                        // power). The stall line, inherited from fx0.3
                        // suppression: without it creep-turtle beat the
                        // field 1.00.
    splat: 0.5,         // intensity a shambler corpse dumps where it falls
    foeSplat: 0.5,      // intensity a FOE corpse feeds the paint it died on,
                        // x the local intensity: deep paint digests well and
                        // a speck digests nothing, so the effect cannot
                        // bootstrap ground the owner was not already holding.
                        // Outcome-flat 0 -> 2 (T12), so it is priced by the
                        // income it adds: +3% paint here, +13% at 1.0.
    foeSplatMin: 0.05,  // local intensity below which a corpse is not digested
                        // at all. NOT the spec's 0.1 - foes die at the tower
                        // line where mean intensity is 0.077, so 0.1 switched
                        // the whole mechanic off. Also why the digest can never
                        // leave paint on a grid stepField has early-outed
                        // (fieldSum 0 means k is 0 everywhere, so nothing lands).
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
                        // on the board: held SEEP's total paint income where
                        // T6a tuned it, which measured strictly better than
                        // banking the windfall (creeper 0.341 vs 0.307, and
                        // a creep-turtle 0.81 vs 0.96). 0.25 pushed that
                        // turtle to 0.86 of the field and 0.4 to a clean
                        // 1.00 - the fx0.3 failure mode, still one knob away.
    slow: 0.45,         // speed factor for foes standing in FULL paint
    dot: 3,             // dps to foes standing in full paint. Both raised
                        // from 0.65/1.5 once T6b's trails put paint where
                        // foes actually walk - before that, geography made
                        // any value outcome-neutral.
    corrode: 3,         // dps to foe buildings standing in full paint
    hillDps: 7,         // strangle dps at a fully painted hill rim
    splatDmg: 40,       // hp a shambler CORPSE tears off the one foe building
                        // it falls nearest, AT CONTACT - SEEP's losses were only
                        // ever worth territory, and territory stops at the
                        // tower line (T7c: paint felled 0.00 buildings ever).
    splatDmgR: 100,     // px reach, falling linearly to 0 at the edge like
                        // `burn`. NOT the spec's 28: shamblers die a mean 70px
                        // from the nearest foe building (the tower that shot
                        // them), so 28 fired on 1% of corpses and the mechanic
                        // did not exist. The falloff is what keeps "kill them
                        // before they arrive" the counterplay - a corpse
                        // dropped at the range edge still does nothing.
  },
  // paint SPICE: independent experiments in what paint is FOR, each a rate
  // that is 0 by default, so the shipped rules are untouched until Will picks
  // one (FACTIONS open questions 9 and 18a). Grade one at a time:
  // SPICE=heal:4 node tune.js matrix 15
  SPICE: {
    heal: 1,            // hp/s an OWN unit regains standing in FULL own paint.
                        // ON at 1 (T17): measurably free, and free because it
                        // barely fires - a 26hp shambler meets a 34-damage shot,
                        // so only 16-19% of own ticks on paint are on a wounded
                        // body and a life earns 0.97 hp back. DO NOT nudge this
                        // for balance: it is a switch, flat to 2 and then worth
                        // 0.4 of SEEP-vs-a-full-kit at 2.5.
    corpseGold: 0,      // gold to the paint owner per unit dying in FULL paint
    spawnAt: 0.5,       // intensity a cell must hold to count as a womb
    spawnRate: 0,       // free shamblers/s per qualifying cell, born on the spot
    speed: 0,           // MOVEMENT factor an OWN unit gets in FULL own paint,
                        // scaled to 1 by local intensity (so 1.5 at k=0.2 is
                        // 1.1x). Movement only - lifting bite rate too would
                        // make this a damage spice in disguise. Values under 1
                        // would slow your own side; 0 is off.
    buildGate: 0,       // T28: SECONDS a build/respec/level takes on BARE
                        // ground. Own paint under the slot shortens it and foe
                        // paint lengthens it, clamped to [0, 2*buildGate]; the
                        // slot is present and killable the whole time but does
                        // NOTHING (no income, no paint, no production, no fire,
                        // no drum shift). 0 = builds are instant, as shipped.
                        // Symmetric: every faction pays it, and SEEP is simply
                        // the one with paint under its own slots.
    stifle: 0,          // extra cooldown a SHOOTING tower pays for a SLIMED
                        // TARGET: cd *= 1 + stifle * k under the ant it just
                        // shot. Not k under the tower - `burn` scrubs the
                        // muzzle cell to a measured 0.000, so the obvious
                        // geometry is a knob that can never fire. Off by
                        // default: it is a switch, not a dial (inert to 0.12,
                        // on target at 0.14), and suppression is VEIL's job.
  },

  // buildings: empty slot -> farm | tower | hatch; then one upgrade tree each
  COSTS: {
    farm: 80, grove: 90, plant: 120, mat: 100, governor: 110, redline: 110,
    deep: 130, relic: 140,
    tower: 100, sharp: 120, spit: 120, sap: 100, guard: 110, mortar: 220, conv: 160,
    dynamo: 130, coil: 140, rampart: 120, bell: 120, hall: 150, thicket: 100,
    hatch: 90, swarmb: 70, soldierb: 80, majorb: 130, sapperb: 110, predatorb: 100,
    hornb: 100, fifeb: 80, oozeb: 90, grubb: 50, slitherb: 80, carrierb: 80,
    kiss: 150,
  },
  UPGRADE_TREE: {
    // T26: a gear can be fitted anywhere on the farm CHAIN, not just to a
    // plain farm. A brain that levels its farms owns no plain farm by the
    // time a reactive gear trigger fires (measured: 0% governors built), and
    // a human who upgraded everything would have been locked out the same
    // way. Fitting one to a plant costs the 5.5 g/s difference - that price
    // is the choice, and it is why the bid takes the CHEAPEST farm it has.
    // T45: VEIL's two eco leaves ride the same chain for the same reason - a
    // brain that levels its farms owns no plain farm late, and VEIL's opening
    // IS the farm chain. They are the only thing on it that is not a gear.
    farm:  ['grove', 'mat', 'governor', 'redline', 'deep', 'relic'],
    grove: ['plant', 'governor', 'redline', 'deep', 'relic'],
    plant: ['governor', 'redline', 'deep', 'relic'],
    tower: ['sharp', 'spit', 'sap', 'guard', 'mortar', 'conv', 'bell', 'dynamo', 'coil', 'rampart', 'thicket'],
    hatch: ['swarmb', 'soldierb', 'majorb', 'sapperb', 'predatorb', 'hornb', 'fifeb', 'oozeb', 'grubb', 'carrierb'],
    // T27: SEEP's offence root is the Ooze Den, so its ONE specialisation has
    // to hang here - hung off `hatch` it would be born unreachable for the
    // only faction that owns it (T21's dead-mix-key diagnosis, T42's fix).
    // A den is now both a trunk and a leaf, which is new: see buildOptions.
    oozeb: ['slitherb'],
    // OQ25 ruling (2026-08-04 playtest: "impossible to defend against
    // rushing"): the def tree FLIPPED. The bell is VEIL's cheap def root now
    // and the charmer grows off it - survive first, steal second. The bell
    // also hangs off the tower tree so the sandbox keeps a path to it.
    conv: ['hall'],
    bell: ['conv'],
    // T34: the Echo is the corruption branch's own tier-2, so it hangs
    // off the Loom - which means BUILDING it eats a pip source. That trade is
    // the design: an Echo on a clean nest does nothing at all.
    carrierb: ['kiss'],
    // T44: SEEP's def trunk, and the only def root that is not a gun. The GUARD
    // hangs off it because the patch cannot put a body in the lane and nothing
    // else in seep.kit can either. The SAP does not: at `dense` 1 a Thicket is a
    // wider sap that also burns, for the same 100g, so offering one as an
    // upgrade of the other would be a trap. It stays on the tower tree, where
    // the sandbox still reaches it.
    thicket: ['guard'],
  },
  // specialised broods and towers can then level to 2 and 3: the late-game
  // gold sink. Costs scale superlinearly with power on purpose - concentrated
  // stats beat distributed ones against throughput-limited towers.
  MAX_LVL: 3,
  LVL_COST_MULT: { 2: 1.5, 3: 2.5 },   // of the building's base cost
  LVL_POWER: 1.5,                       // per level: production rate / tower dmg
  // T7c: a Mat pays a FARM's flat income, and the paint is what the extra
  // 100g buys. At 1.5 it was SEEP's ONLY eco building priced as a tier-2 one,
  // so a Mat-less SEEP was not just A strategy but THE strategy - a Mat build
  // scored 0.681 of the field where den-spam scored 0.752; at 2.5 both read
  // 0.752.
  // T26: a gear pays a FARM's income, deliberately. T24's rampart proved a
  // slot that gives up its own job never repays it, so the gears buy their
  // effect with the UPGRADE PATH (no grove, no plant off a geared farm) and
  // with each other, not with the 2.5 - a 0-income eco building would have
  // been the same dead-on-arrival shape in a different family.
  // T45: and so do VEIL's, for the gears' reason - what a Deep Tithe or a
  // Reliquary buys is paid for with the upgrade PATH it closes off, never with
  // the 2.5 that keeps the slot from being T24's dead gunless tower.
  INCOME_BY_TYPE: { farm: 2.5, grove: 5, plant: 8, mat: 2.5, governor: 2.5, redline: 2.5, deep: 2.5, relic: 2.5 },
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
    // T15: the den BLOOMS - it accrues its whole window and drops `bloom`
    // shamblers in one tick. Same shamblers/second as a trickle; what changes
    // is that a clump arrives faster than a tower line can shoot it, which is
    // the mechanism the den-interval cliff was made of (a metered arrival dies
    // alone, so shambler.dps never gets to exist).
    oozeb:  { unit: 'shambler', interval: 4, bloom: 3 },
    // T18: FOUNDRY's tier-1 rung. The press reduces a brood to (hp/s, dps/s),
    // so a stamping faction cannot have a SIDE-grade - only a cheaper/weaker
    // or dearer/stronger step on one ladder. This is the cheap step: +41% mass
    // per gold on soldierb, -13% dps per gold, and less of both per SLOT, so
    // it is a tempo buy and never a replacement. PRICE is the whole balance
    // lever here - grubb-only vs the SEEP champion reads 0.98 at 40g and 0.55 at
    // 100g - and 50 is the point where a pure grub pour sits level with a pure
    // soldier pour, so the mix is a choice rather than an answer.
    grubb:  { unit: 'grub',     interval: 6 },
    // T27: SEEP's only specialisation - the den's other half. No bloom and no
    // splat, so it buys its keep in raw throughput: 8.6 hp/s and 1.43 dps/s
    // against the ooze den's 6.5 and 0.88. That is MORE per slot and slightly
    // less per gold (260g all-in against 180g), which is the choice - and the
    // interval is the whole balance lever, sized to the T18 parity criterion
    // (at 5 a swapped den read 96 hill damage of the ooze den's 265; at 3.5 it
    // reads 252 and the duel sits at exactly 0.500, so the mix is a choice and
    // not an answer). A bloom is NOT the fix here: 2 read 120 and 3 read 46.
    // NOT in foundry.kit - the press sees a brood only as (hp/s, dps/s), so
    // `paintSpeed` would be a stat it discards.
    slitherb: { unit: 'slither', interval: 3.5 },
    // T30: the Carrier Loom - VEIL's offence, which is not an offence. It ships
    // no damage at all, so its throughput is measured in PIPS: one body carries
    // one, and interval is the only rate there is. 5s puts 3.6 pips on the drum
    // (VEIL's plain 18s), which is roughly one saturated foe building per two
    // beats IF every carrier lands - and none of them lands past a gun line, so
    // that is a ceiling and not a rate. NOT in foundry.kit: the press reduces a
    // brood to (hp/s, dps/s) and a carrier's whole product is neither.
    carrierb: { unit: 'carrier', interval: 5 },
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
    // The charm is TIMED and scaled by the body: duration = charmHpSec / base
    // hp (a worker serves ~forever, a major shakes it off in seconds), times
    // level power. Convert-once immunity survives the revert (no ping-pong).
    conv: { range: 120, channel: 3.5, charmHpSec: 1200, charmMin: 4 },
    // T23: FOUNDRY's defensive law - uptime is power. Cold it is worse than a
    // sharp (14 dps to 22.7); every shot adds `spinStep` to the slot's `spun`
    // multiplier up to `spinMax`, dividing the cooldown, so fully wound it out-
    // paces one (30.8 dps) after ~60 shots. Spin is CUMULATIVE, never decaying:
    // a slot has ANY target only 11-29% of match time (measured), so an
    // idle-reset spin would never wind at all - and cumulative is exactly the
    // anti-trickle rule the design wants (a constant stream never lets it
    // cool). Reset only by destroy/sell/respec.
    dynamo: { range: 150, dmg: 14, cooldown: 1.0, spinStep: 0.02, spinMax: 2.2 },
    // T25: the arc jumps to the nearest un-hit body, `falloff` weaker each hop.
    // hops/chainR are MEASURED at the instant a gun has a target (lesson 35):
    // vs a SEEP bloom, 1.19 extra bodies sit within 40px of the head and a
    // FOURTH is never there (0% at every radius to 80) - so 3 is the bloom, not
    // a guess. vs sandbox worker floods it is 3.2 extra, and vs a FOUNDRY
    // product line 0.00 at every radius, which is the niche: the coil answers
    // arrivals-at-once and is dead against one fat body.
    coil:  { range: 130, dmg: 16, cooldown: 1.4, hops: 3, chainR: 46, falloff: 0.65 },
    // T24: no gun at all - the Rampart PUNCHES on its owner's beat, so its
    // rate IS the drum and the def half of FOUNDRY's metronome tension is a
    // real bid (the ratchets want a long beat; the wall wants a short one).
    // What it costs the attacker is PROGRESS: a besieger drops back to
    // marching and has to walk the shove off at `punchSlow`. Damage stays 0 -
    // control is the whole product, and it is why a drumless faction may
    // never own one.
    // range/punch are MEASURED, not picked (lesson 35): at the instant a beat
    // fires, the fraction of beats with a foe in reach is 0.27 from a nest slot
    // and 0.60 from a forward outpost at 150 - and at 90 SIX of the eight slots
    // can never punch anything, ever. 40px + 0.9s of stagger is ~2s off a
    // shambler's walk, so one shove is worth having.
    rampart: { range: 150, punch: 40, punchStun: 0.9, punchSlow: 0.5 },
    // T32: VEIL's only screen. No gun, no slow - it PULSES, and everything
    // hostile in reach stops dead for `freezeDur`. Levels shorten the cooldown.
    // `range` IS the charmer's range: what a bell sells is bodies held where a
    // charm can reach them (measured, 93-98% of frozen bodies stand in one),
    // and at r85 it lost to both siblings in all four graded cells.
    // freezeDur/cooldown is the real axis - a freeze is 100% denial where a
    // sap's slow is 50% - and 3.0/6.0 is where the swept curve meets the sap
    // control against swarms while reading ~0 against a stamper.
    // `immune` caps the STACK - VEIL owns no gun to punish a locked pile.
    // Ablated, FOUR evenly phased bells hold a body 75.7% of the time; with it
    // every count and phase measures 50.5%, the same as one bell alone. Two
    // bells never break it either way: a ring blocked by an existing hold
    // re-arms the whole cooldown, which desynchronises the pair on its own.
    bell:  { range: 120, freezeDur: 3, cooldown: 6, immune: 1.5 },
    // T34: the Chorus Hall - VEIL's def tier-2, and a CHARMER in its own right.
    // A buff-only slot was the one shape T24 ruled out (a gunless tower never
    // repays a gun), and halving a throughput-limited kit's charm rate to double
    // its hold would have been the worst of both: so the hall keeps the job and
    // pays for the choir with `channel`. That is the trade in one number - 29%
    // slower to steal a body, twice as long to keep it - and it is the axis the
    // triangle wants, because SEEP beats VEIL on charm THROUGHPUT while FOUNDRY
    // hands it one fat body the base charm cannot hold at all (1200/2000hp
    // bottoms out at `charmMin`). `choir*` are read at the instant an ant turns,
    // once, from the presence of ANY standing hall (T26's flag, not a stack).
    hall:  { range: 120, channel: 4.5, charmHpSec: 1200, charmMin: 4,
             choirCharm: 2, choirDps: 1.25 },
    // T44: SEEP defends with GROUND. No gun and no new damage curve - inside the
    // patch a hostile body wades in creep of at least `dense`, so the slow and
    // the DoT are CREEP.slow / CREEP.dot, the numbers a mat's frontier already
    // teaches. It writes nothing into the grid, so SEEP's area income never sees
    // it (the T6b stealth-income tax).
    // A MULTIPLIER on the paint already there was the first draft, and lesson
    // 35's measurement killed it: a foe body within 120px of a SEEP def slot
    // stands in 0.23-0.29 own paint vs sandbox/FOUNDRY and 0.013 in the SEEP
    // mirror. So `dense` is a FLOOR, and 1 is the creep curve's own ceiling
    // rather than a fitted fraction - at 0.75 the patch was worth so much less
    // than the gun it replaces that seep-v-foundry fell 0.875 -> 0.000, and
    // `dense` is the axis that buys it back (0.650 at r120, 0.775 at r175).
    // `range` 175 is the knee: r200 reads the same in all three matchups,
    // because from a nest slot 175 already spans the whole lane approach.
    // No level scaling - the Thicket is a TRUNK, like the tower and the mat.
    thicket: { range: 175, dense: 1 },
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
    // hatch (SEEP has no drum), and their corpses feed the creep frontier
    shambler: { hp: 26,  spd: 44, dps: 3.5, r: 4.6, trickle: true, trail: 1 },
    // T27: the skirmisher. `paintSpeed` is a per-unit movement multiplier at
    // FULL own paint, scaled by the intensity underfoot - the exposure-time
    // lever T17 proved (5% off the walk denominator beat T14/T15/T16's damage
    // and rate put together), sold as a building instead of a free global rule.
    // Base spd is deliberately below a shambler's: off its own slime this is
    // the second-slowest thing on legs, and 30hp still dies to one sharp shot,
    // so the speed is home-turf tempo and never a rush.
    slither: { hp: 30,  spd: 42, dps: 5,   r: 4.4, paintSpeed: 1.9, trail: 1 },
    // T18: a fat, cheap, slow sack - FOUNDRY's tier-1 pour. hp:dps 15 is
    // bulk-LEAN, not bulk-only: the press ships one body whose power is mass x
    // dps, so a line far off a soldier's natural 9.5 ratio pours dead weight
    // (measured: a 58:1 version scored 0.24 where soldierb scored 0.88).
    // SPEED is what keeps it honest OUTSIDE the press - the slowest unit there
    // is, so it arrives after the wave it would otherwise screen, while a
    // stamping side never reads `spd` at all.
    grub:    { hp: 48,  spd: 34, dps: 3.2, r: 5.2 },
    // T30: the carrier. dps 0 is the design, not a placeholder - it exists to
    // TOUCH things, and `stake` is the only output it has. 14hp dies to one
    // shot from anything, and spd 40 (a major's walk) is what makes the walk
    // the counterplay: every gun on the lane gets its chance before the pip
    // lands. `sight` is the sapper's, and deliberately: the divert shape is
    // proven, and what changes is what arrival MEANS.
    // T38 measured the trickle OQ27 recommended and it is a LOSS: spreading the
    // arrivals costs 30 foe hill hp and 1.6 seizures a match against FOUNDRY and
    // buys nothing anywhere, because a 14hp body that only has to TOUCH survives
    // by arriving in company. So the carrier still waits for the beat.
    carrier: { hp: 14, spd: 40, dps: 0, r: 3.6, stake: 1, sight: 90 },
    // FOUNDRY's stamped product: these are the stats at weight 1 (a soldier),
    // scaled by the weight the press shipped. Nothing breeds it.
    product: { hp: 62,  spd: 52, dps: 6.5, r: 6.0 },
  },
  FRENZY_AT: 240,
  DECAY_AT: 330,
  HARD_END: 420,
  DECAY_RATE: 4,

  // which faction each side plays (see FACTIONS). 'sandbox' is the tuning
  // line's everything-kit, so the default leaves every old matchup untouched.
  FACTION: { p: 'sandbox', e: 'sandbox' },
  // T7b: FOUNDRY's flywheel. A per-side income MULTIPLIER that charges while
  // the machine runs and is knocked back every time a building is destroyed.
  // The state is kept for both sides (like the paint field); only a faction
  // whose registry entry has an `income` hook actually reads it.
  FLYWHEEL: {
    cold: 0.8,    // multiplier at t=0 - and the floor: a stalled machine is
                  // poor, but never worth less than nothing. THE dial: it
                  // sets FOUNDRY's whole field score (0.7 reads 0.38 vs the
                  // sandbox, 0.8 reads 0.52, 1.0 reads 0.71) because the
                  // opening is the only window where gold decides matches.
    rate: 0.005,  // /s of multiplier while at least one building stands:
                  // 1.0x at 40s, the cap at 220s
    max: 1.9,     // outcome-neutral at 1.6/1.9/2.4 - a turtle is already
                  // parked at GOLD_CAP for 223 of its 375 seconds, so the
                  // top of the curve buys nothing. The sink, not the ceiling,
                  // is what the flywheel is missing (T7b findings).
    loss: 0.3,    // knocked off per building DESTROYED (60s of spin-up).
                  // T26 RETIRED its old justification ("vs mortarWall, 0.89
                  // at loss 0 and 0.44 at 0.3" - that archetype now builds 0
                  // mortars against FOUNDRY): ablating this to 0 is worth
                  // ZERO hill damage in four matchups, because FOUNDRY loses
                  // ~1 building a match. It is a near-dead knob, and open
                  // question 22 asks whether it should vent GOLD instead.
                  // Selling is free - spin is per-side, so
                  // there is nothing to scrub by rebuilding, and dodging a
                  // mortar by selling at 70% is counterplay, not an exploit.
    // T26 - the GEARS. `loss` is the flywheel's whole risk and `rate` its
    // whole tempo, so the two farm specialisations each buy one of them at
    // the price of the other end of the curve. Same 110g on purpose: the
    // choice has to be about the gear, not about which one is affordable.
    govMax: 1.5,  // the governor's ceiling, replacing `max`. It is the whole
                  // cost of immunity, and it clamps DOWNWARD on fitting -
                  // otherwise spin to 1.9 and then buy loss-immunity for
                  // free, which is not a gear, it is a purchase.
    redMult: 2,   // the red-line's multiplier on `rate`: the cap at ~110s
                  // instead of ~220s, which is most of a match earlier.
    vent: 40,     // ...and gold LOST per building destroyed on top of the
                  // normal knock. Half a farm, so a red-line that is holding
                  // its line pays nothing and one that is bleeding pays
                  // twice for every loss.
  },
  // T7b-b: FOUNDRY stamps, it does not breed. A stamping faction's broods pour
  // MASS into a press instead of ants into the muster; the drum stamps the
  // press into ONE product whose weight is the mass it holds, and shipping
  // COSTS GOLD - the sink T7b-a proved missing. A longer beat therefore ships
  // a heavier product, not more of them, and the top of the flywheel curve
  // finally buys something.
  STAMP: {
    refMass: 62,      // mass in one weight unit = a soldier, so weight 1 IS a
                      // soldier. The press accrues at exactly the hp/s the
                      // broods would have bred, so the carve is throughput-
                      // neutral before gold is spent - the sink has to be a
                      // bonus on top, not a tariff on the baseline (a tariff
                      // measured as a double nerf: half the throughput, and
                      // charged for it).
    eff: 0.7,         // fraction of the broods' throughput the press captures
                      // for free. THE price of batching: one concentrated body
                      // survives fire that would have picked the same hp off
                      // six ants, so a lossless press ran away with the field
                      // (0.67 vs the sandbox at 1.0, 0.49 at 0.7). The curve
                      // is a CLIFF between 0.7 and 0.85, not a slope - batching
                      // pays nothing until the body outlives the defence, then
                      // it pays everything.
    boost: 1.5,       // gold may OVERCHARGE the press by up to this multiple
                      // of what the assembly lines pressed. Broods stay
                      // essential: gold with no press buys nothing.
    gold: 0.5,        // gold per overcharged mass point - 31g of surplus buys
                      // a soldier's worth of extra weight.
    spend: 0.5,       // fraction of the purse the press commits per beat. The
                      // other half is left alone so the builder can still save
                      // for a building between beats.
    maxWeight: 10,    // the fusion cap, in weight (620hp). Mass past it splits
                      // into equal products rather than being discarded - a
                      // silent discard would nerf exactly the long-beat build
                      // the ratchets are for.
    minWeight: 0.3,   // below this the press holds rather than ship a pebble
    spdExp: 0.18,     // speed falls as weight^-spdExp: heavy product is slow
                      // (weight 10 walks at 0.66x a soldier)
    smashAt: 2,       // weight from which the product crushes buildings
    shrug: 0.5,       // fraction of a CONTROL effect a product at smashAt or
                      // above takes (T24's rampart punch and stun; T32's
                      // stasis reuses it). A juggernaut shrugs - the same
                      // weight threshold that lets it crush is what makes it
                      // hard to shove, so one number reads both ways.
    smashR: 66,       // lateral reach of the crush - it covers the lane-side
                      // and forward slots a marcher walks past, not the rear
                      // flanks, so a juggernaut is a battering ram and not a
                      // map-wide demolisher
    crush: 3,         // x its own dps against the nearest foe building in
                      // reach, and it never stops walking to do it. Sized so a
                      // juggernaut fells about one building a match: past this
                      // the knob is outcome-neutral (0.49 field at 1.5, 3, 6
                      // and 10) because what limits the crush is the CONTACT
                      // WINDOW, not the rate - it only ever kills what it can
                      // kill while walking past.
  },

  // T29: VEIL's substrate - corruption PIPS. A pip is a unit of claiming
  // sitting on a foe building or hill; it pays VEIL a tithe, ticks the hill,
  // and at saturation (T33) flips the building. Nothing WRITES a pip yet
  // (carriers land at T30), so every number here is live but unreachable and
  // the shipped rules are bit-identical. All placeholders - T35 sweeps them.
  CORRUPT: {
    max: 6,           // pips a single building holds; T30's stake clamps here
                      // and T33 reads `>= max` as saturation
    hillMax: 10,      // ...and the same for a hill, which never flips
    hillDot: 1.2,     // hp/s a hill loses per pip standing on it
    skim: 0.12,       // gold/s per pip that a corrupted foe building pays the
                      // corruptor (T30 wires it into the income hook)
    cleanseCost: 30,  // gold to scrub one building clean - the counterplay,
                      // priced as a tax rather than an answer
    decay: 0,         // pips/s that bleed off on their own. 0 = a pip is
                      // permanent until cleansed or the building dies, which
                      // is what makes cleanseCost the real dial.
    // T34, the Echo: a claimed foe building seeds its NEAREST CLEAN
    // neighbour, every `spreadEvery` seconds per standing Echo. The
    // radius is measured, not picked (lesson 35): the eight slots sit 82.8px
    // apart at the closest and 174.9 at the median, so any radius under 83 is
    // a rule that cannot fire, and at 130 the (0,1) pair at 124 joins the nest
    // into one component. 100 leaves every slot 2-3 neighbours with the LEFT
    // and RIGHT halves separate, so an echo crawls up one flank and placement
    // is the answer the design wanted it to be.
    spreadR: 100,
    spreadEvery: 8,   // seconds between pulses; a level pulses oftener
    // T45, the eco tier-2s. Both scale on `tithePips` - the pips standing on
    // the FOE's board right now - because that is the quantity the corruptor
    // fantasy is about, and it is measured: a VEIL match holds 1.5-7.3 of them
    // on average and peaks at 17-26. So the Deep Tithe is worth well under a
    // farm early and more than a plant at saturation, which is the curve.
    deepGain: 0.08,   // ...per pip, added to the skim MULTIPLIER
    deepMax: 3,       // ...clamped here (reached at 25 pips)
    relicGain: 0.06,  // Reliquary: charm hold multiplier per pip...
    relicMax: 2,      // ...clamped here (reached at ~17 pips)
    relicSkim: 0.5,   // ...and the share of the skim it SPENDS to do it. The
                      // spend is the design: a Reliquary is the tithe turned
                      // into seconds of theft instead of gold.
    spreadAmt: 1,     // pips seeded per source per pulse. A spread ADDS - it
                      // does not move the source's pips, because a transfer
                      // conserves the total and de-concentrates it, and T33
                      // measured that concentration is the only thing standing
                      // between the pips and a flip.
    // T38: the chain's terminal. `hillDot` above was the only rule in the game
    // that turns corruption into damage, and until now only a carrier's own body
    // could reach it - so a won defence and a won flip both billed 0 hp and VEIL
    // read 0.00 in every cross-faction cell on three instruments. These two
    // rates give the flip and the hold their own way in. Both are gated on the
    // holder being a TITHE faction: a corruptor makes organs bleed, a sandbox
    // that happens to own a loom does not.
    flipDrip: 0.06,   // claims/s a seized building feeds the hill it stands on.
                      // Compounding by construction (claims persist, the dot is
                      // per-claim), which is the point: a seized nest becomes
                      // the siege instead of a stall.
    thrall: 0.05,     // claims/s per LIVING body the corruptor is riding - one
                      // held by its bell, or one fighting under a charm. Paid
                      // while the body lives and never once it has fallen:
                      // the living-only rule (SEEP takes the fallen, VEIL
                      // takes the standing), and it is what makes a screen a weapon.
    // ...and the surge clock: VEIL BREEDS faster as its claims take, so its
    // earned tempo arrives as bodies per wave (FOUNDRY's tempo is built, SEEP's
    // is none). It multiplies the brood rate, never the beat - measured.
    surgeGain: 0.06,   // x the brood rate per claim standing on the foe
    surgeMax: 2,       // ...clamped here (reached at ~17 claims, the Reliquary's
                      // curve - the same quantity, so the same measured range)
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
  const slotRow = pos => ({ x: pos.x, y: pos.y, type: null, lvl: 1, cd: 0, prodCd: 0, hp: 0, spent: 0, spun: 1, buildT: 0, pips: 0, flipped: false });
  const S = {
    cfg,
    seed: seed >>> 0,
    rng: mulberry32(seed >>> 0),
    t: 0,
    frenzy: false,
    decay: false,
    nextBeat: { p: cfg.WAR_DRUM, e: cfg.WAR_DRUM },
    // SEEP paint: one intensity grid per side, 0..1 per cell (CONFIG.FIELD).
    // fieldSum is the running total, kept by stepField so income and the
    // per-tick effect passes never have to walk the grid.
    field: {
      p: new Array(cfg.FIELD.cols * cfg.FIELD.rows).fill(0),
      e: new Array(cfg.FIELD.cols * cfg.FIELD.rows).fill(0),
    },
    fieldSum: { p: 0, e: 0 },
    spawnAcc: { p: 0, e: 0 },    // T6c: fractional paint-births carried over
    spin: { p: cfg.FLYWHEEL.cold, e: cfg.FLYWHEEL.cold },   // T7b flywheel
    // T7b-b: the press - mass (m, in hp) and damage (d, in dps) waiting for the
    // next beat. Carrying BOTH is what makes batching lossless: mass alone
    // silently re-shaped worker throughput into soldier throughput and threw
    // away three quarters of its damage.
    press: { p: { m: 0, d: 0 }, e: { m: 0, d: 0 } },
    stamped: { p: 0, e: 0 },     // ...and the lifetime weight shipped
    // T29: pips standing on each side's OWN hill (the foe put them there).
    // Building pips live on the slot; these have nowhere else to sit. Floats -
    // a carrier may stake a fraction, and saturation compares `>=`.
    hillPips: { p: 0, e: 0 },
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
      p: { worker: 0, grub: 0, soldier: 0, major: 0, sapper: 0, predator: 0, shambler: 0, slither: 0, carrier: 0, product: 0 },
      e: { worker: 0, grub: 0, soldier: 0, major: 0, sapper: 0, predator: 0, shambler: 0, slither: 0, carrier: 0, product: 0 },
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
  if (S.cfg.PRODUCTION[type]) slot.prodCd = prodPeriod(S.cfg.PRODUCTION[type]) / lvlPower(S, slot);
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
  eco: ['farm', 'grove', 'plant', 'mat', 'governor', 'redline', 'deep', 'relic'],
  def: ['tower', 'sharp', 'spit', 'sap', 'guard', 'mortar', 'conv', 'dynamo', 'coil', 'rampart', 'bell', 'hall', 'thicket'],
  off: ['hatch', 'swarmb', 'soldierb', 'majorb', 'sapperb', 'predatorb', 'hornb', 'fifeb', 'oozeb', 'grubb', 'slitherb', 'carrierb', 'kiss'],
};
// every built thing can be shot down - farms and hatcheries included.
// Nothing is safe just for being behind the line: an economy has to be
// defended, and killing the paint producers is how you remove creep.
function demolishable(type) {
  return !!type;
}
// A faction is DATA, not a branch in step(): which building types it may
// build (`kit`), what an empty slot offers (`roots`), whether it owns a war
// drum at all, (T7b-a) an optional `income(S, side, gross)` hook and (T7b-b)
// `stamp`, which swaps breeding for the press. The shared rules read those
// flags, so a new faction is a table entry rather than a scatter of
// `if (side is SEEP)`.
const FACTIONS = {
  // the tuning sandbox: every building, the stacked drum. The default, so
  // every recorded matchup and evolved vector replays bit-identically.
  // `blurb` is card text for the T39 select screen - sim-inert, renderer-read.
  sandbox: {
    label: 'SANDBOX',
    blurb: 'Every tool the colony ever shipped. No story - the tuning kit.',
    roots: null, kit: null, drum: true,
  },
  // SEEP: everything grows straight out of bare ground - no farms, no worker
  // hatchery, no beat - and its defence only slows and blocks. Shamblers are
  // the whole army and the paint is the damage.
  seep: {
    label: 'SEEP',
    blurb: 'The garden itself, warped hungry by the fall. It does not march - it grows.',
    // T44: the plain tower is GONE. SEEP's def root is the Thicket, and after
    // this no two factions share a defensive building. The Thicket needs no
    // `cost` line because it is not a spec grown from bare ground - it IS
    // SEEP's trunk, and the sap and guard behind it pay the same 100 they
    // always paid behind a tower.
    roots: ['mat', 'thicket', 'oozeb'],
    // T27: 'slitherb' is a KIT entry only, never a root - it grows off the den,
    // so it pays no trunk price and needs no `cost` line (the T7a half-price
    // trap only bites a spec grown straight from bare ground).
    kit: ['mat', 'thicket', 'guard', 'oozeb', 'slitherb'],
    drum: false,
    // a spec grown straight from bare ground still pays for the trunk it
    // skipped (farm 80 + mat 100, hatch 90 + oozeb 90) - otherwise a faction
    // gets the sandbox's tier-2 buildings at half price. BUILD price only:
    // level costs stay keyed to COSTS, since a level buys tech, not ground.
    cost: { mat: 180, oozeb: 180 },
  },
  // FOUNDRY: the machine. Its trunks are the standard three, so nothing is
  // grown from bare ground and no cost table is needed - the faction lives in
  // its income CURVE (a cold start that compounds, and stalls when anything
  // breaks) and in its PRESS: broods pour mass, the drum stamps one product.
  // The mortar stays until Will rules on it (FACTIONS open question 15) - the
  // juggernaut is now a second, slower answer to buildings, not a replacement.
  foundry: {
    label: 'FOUNDRY',
    blurb: 'The colony\'s construction engine, still working a blueprint whose authors are gone.',
    roots: ['farm', 'tower', 'hatch'],
    // T24: 'rampart' is deliberately NOT here - the wall is built and proven,
    // but it ships DARK. Its output is 0 or the whole wave depending on a drum
    // PHASE the player cannot see (equal periods never drift), and a gunless
    // slot never repays a gun. Awaiting a ruling, not a number.
    // T26: neither GEAR is here - both are built and proven to fire, and both
    // ship DARK. The flywheel pays too slowly to buy in the only window that
    // decides a FOUNDRY match: ablating FLYWHEEL.loss entirely is worth 0 hill
    // damage, peak spin ever measured is 1.27 against a 1.9 cap, and a FREE
    // governor reads exactly 0.00. A ruling, not a number.
    kit: ['farm', 'grove', 'plant',
          'tower', 'sharp', 'spit', 'mortar', 'dynamo', 'coil',
          'hatch', 'soldierb', 'hornb', 'fifeb', 'grubb'],
    drum: true,
    income: (S, side, gross) => gross * S.spin[side],
    flywheel: true,
    stamp: true,
  },
  // VEIL: the still centre. It keeps the plain 18s drum - the only faction that
  // does - and owns almost no violence: no tower, no sharp, no mortar, no
  // sapper, because T30 measured that a corrupter which also demolishes cancels
  // its own pips. Its army is zero-damage carriers; its defence is a charmer
  // that steals one attacker at a time; its economy is the TITHE, a cut of
  // whatever it has claimed. Every gun VEIL ever fires is a stolen one.
  veil: {
    label: 'VEIL',
    blurb: 'The thing that woke under the world. It cannot breed alone - it takes.',
    // the bell and the loom are ROOTS, so both pay the trunk they skip
    // (tower 100 + bell 120 = 220 - which START_MONEY buys at t=0, the whole
    // point of open question 25's ruling; hatch 90 + carrierb 80). The
    // charmer is a LEAF of the bell now, at its plain 160. VEIL owning no
    // plain tower still deletes its tower-spec branch from the controller.
    roots: ['farm', 'bell', 'carrierb'],
    // T31 measured purity FIRST, as the spec asked, and purity WON - but not
    // the way it was framed. The alternative carve (a 'hatch' off-root with
    // 'swarmb' beside the loom) does not SCREEN the carriers, it REPLACES them:
    // the trunk itself breeds workers, the mix loop only ever specialises one
    // of two off slots, and VEIL fielded 19-33 workers against 1.8-7.0 carriers
    // at every mix weight tried - including mixSwarm 0. Pips billed 0.0 hill hp
    // in all seven graded cells AND in the mirror. A generic brood is strictly
    // better than a corrupter at the only thing a match scores, so VEIL's
    // screen can never be an army; it has to be T32's bell and T33's flip.
    // T32 built the bell as the charmer's leaf; the 2026-08-04 playtest ruled
    // that backwards (a 260g trunk in front of the ONLY screen VEIL may have
    // meant dying at ~50s to any rush), so the pair swapped places.
    // T34: the Echo is a leaf of the Loom and the Hall a leaf of the Charmer,
    // so neither needs a root or a `cost` line - and neither competes for an
    // offence SLOT the way T31's rejected chaff line did: each one eats the
    // building it grows out of.
    // T45: the two eco leaves. VEIL's opening is literally FOUNDRY's farm chain,
    // and these are what make it BECOME extractive - neither is worth a slot on a
    // board with no corruption on it, so buying one is a bet that the carriers
    // are landing. Neither competes for an offence slot (T31's law).
    kit: ['farm', 'grove', 'plant', 'deep', 'relic',
          'conv', 'bell', 'hall',
          'carrierb', 'kiss'],
    drum: true,
    // T35: the bell root came down from 220 (tower 100 + bell 120, and exactly
    // START_MONEY, so the opening bell left VEIL with nothing). At 220 a
    // money-limited brain reached the charmer in 0 of 20 matches against FOUNDRY;
    // at 170 it reaches it at ~70s in 20 of 20 and the designed steal-the-fat-
    // product edge appears for the first time (2.60 charms, 232 foe hill hp
    // against 0, win 0.000 -> 0.750 on fixed brains). Below ~160 the saving goes
    // back into BELLS instead - the def-shortfall bid buys the root it is
    // measured against - so the usable band has a floor as well as a ceiling.
    cost: { bell: 170, carrierb: 170 },
    // the tithe: every pip VEIL has planted on a standing foe building pays it
    // CORRUPT.skim gold/s. The DEBIT is not here - it is in income() itself,
    // because a leak belongs to the pip, not to the faction drinking it.
    income: (S, side, gross) => gross + titheOf(S, side),
    // T45: `flywheel`'s counterpart, for the same reason T31 split those two
    // apart - the eco leaves need "does this side DRINK a tithe", and `income`
    // is true of FOUNDRY too.
    tithe: true,
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
// T26: the flywheel's GEARS are presence-flags, not stacks (the `stamp`
// pattern) - a second governor buys nothing. Both standing, the governor
// WINS: the safe gear is what a bleeding player reaches for, and a leftover
// red-line silently cancelling it would be the worst possible surprise.
function gearOf(S, side) {
  let red = false;
  for (const s of S.slots[side]) {
    if (underway(s)) continue;
    if (s.type === 'governor') return 'governor';
    if (s.type === 'redline') red = true;
  }
  return red ? 'redline' : null;
}
// T45: gearOf/choirOf's presence rule, generalised - one standing copy is the
// whole effect, a second buys nothing, and a scaffold is not standing yet. Like
// both of those it reads the GROUND, so a flipped leaf still serves the nest
// that paid for it; only T33's five sites follow the flip.
function standing(S, side, type) {
  for (const s of S.slots[side]) if (s.type === type && !underway(s)) return true;
  return false;
}
// T45: what a corruptor DRINKS. The DEBIT in income() stays a flat CORRUPT.skim
// per pip (T31: the leak belongs to the pip), so both leaves change extraction
// and never the bled side's own income - the flywheel's shape, minting on what it holds.
function titheOf(S, side) {
  const CR = S.cfg.CORRUPT, pips = tithePips(S, side);
  let rate = CR.skim;
  if (standing(S, side, 'deep')) rate *= Math.min(CR.deepMax, 1 + CR.deepGain * pips);
  if (standing(S, side, 'relic')) rate *= 1 - CR.relicSkim;
  return rate * pips;
}
// ...and what a Reliquary bought with the half it spent: a longer hold, scaled
// by the same corruption. Read ONCE at the instant an ant turns (the choir's
// rule), so a Reliquary lost mid-charm never shortens a charm it already paid.
function relicHold(S, side) {
  const CR = S.cfg.CORRUPT;
  if (!standing(S, side, 'relic')) return 1;
  return Math.min(CR.relicMax, 1 + CR.relicGain * tithePips(S, side));
}
// T34: every building that channels a charm. The Chorus Hall is a charmer with a
// slower channel, so the pass, the bell's "never the last one" guard and the
// controller all have to count both - a faction holding one conv and one hall has
// two charmers, not one of each.
const CHARMERS = ['conv', 'hall'];
// ...and the choir itself is a PRESENCE flag (T26's gearOf pattern): a second
// hall buys a second charmer, never a longer hold. Returns the spec, so the
// numbers stay in CONFIG.
function choirOf(S, side) {
  for (const s of S.slots[side]) if (s.type === 'hall' && !underway(s)) return S.cfg.TOWERS.hall;
  return null;
}
// T28: a slot mid-build is scaffolding - it stands there, it can be killed, and
// it contributes nothing. `buildT` is 0 whenever SPICE.buildGate is off, so
// every gate below costs one comparison and changes nothing.
function underway(slot) {
  return slot.buildT > 0;
}
// paint read ONCE, when the order is given: own paint under the slot is
// foundation, foe paint is contamination. The two are near-exclusive because
// stepField contests the grids, so in practice this is one term or the other.
function buildTime(S, side, slot) {
  const g = S.cfg.SPICE.buildGate;
  if (g <= 0) return 0;
  const kOwn = fieldAt(S, side, slot.x, slot.y);
  const kFoe = fieldAt(S, other(side), slot.x, slot.y);
  return Math.max(0, Math.min(2 * g, g * (1 - kOwn + kFoe)));
}
// T33: the side a slot's EFFECTS serve. A flipped building never moves - it
// stands in the nest that paid for it, and that owner can no longer sell,
// respec, level or cleanse it - but its gun, its gold and its brood answer to
// whoever saturated it. Only four sites read this seam (income, the press,
// production, the tithe) plus tower targeting; everything else, including who
// may shoot or demolish it, stays keyed to the ground it stands on.
function effSide(side, slot) {
  return slot.flipped ? other(side) : side;
}
function income(S, side) {
  let inc = S.cfg.BASE_INCOME;
  // both nests, because a flipped farm's gold crosses the map with its loyalty.
  // With nothing flipped the foe's slots all fail the test, so this is the same
  // sum in the same order as before.
  for (const sd of ['p', 'e']) {
    for (const s of S.slots[sd]) {
      if (underway(s) || effSide(sd, s) !== side) continue;
      inc += S.cfg.INCOME_BY_TYPE[s.type] || 0;
    }
  }
  inc += S.cfg.CREEP.goldPerCell * S.fieldSum[side];
  const hook = faction(S, side).income;
  if (hook) inc = hook(S, side, inc);
  // T31: the tithe is a TRANSFER, so the bleed lives here rather than in VEIL's
  // hook - a corrupted nest leaks to whoever planted the pips, and VEIL is only
  // the faction that knows how to drink what it spills. After the hook, so a
  // bled side's own multiplier never scales the leak. Clamped at 0: a negative rate
  // would eat gold already banked, which no other rule in the game can do.
  inc = Math.max(0, inc - S.cfg.CORRUPT.skim * tithePips(S, other(side)));
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

// T12: paint DIGESTS the foe bodies that fall on it - the slime is fed by the
// fight it slows, so holding ground is worth more than laying it. Every k is
// READ before any is deposited, so two corpses landing in one neighbourhood
// cannot feed each other in unit order (the stepField rule).
// DIGEST_K is a reused scratch buffer, not a nicety: collecting the corpses as
// {x,y,k} objects instead cost the tuner 1.7x per tick (29 -> 51 us) on 0.1
// extra iterations - a rule this rare must not allocate.
const DIGEST_K = [];
function digestCorpses(S, dead) {
  const CR = S.cfg.CREEP;
  for (const side of ['p', 'e']) {
    let n = 0;
    for (let i = 0; i < dead.length; i++) {
      const u = dead[i];
      const k = u.side === side ? 0 : fieldAt(S, side, u.x, u.y);
      DIGEST_K[i] = k >= CR.foeSplatMin ? k : 0;
      if (DIGEST_K[i]) n++;
    }
    if (!n) continue;
    for (let i = 0; i < dead.length; i++) {
      if (!DIGEST_K[i]) continue;
      const u = dead[i];
      paintAt(S, S.field[side], u.x, u.y, CR.foeSplat * DIGEST_K[i]);
      S.events.push({ type: 'digest', x: u.x, y: u.y, side });
    }
  }
}

// one field tick: emit -> flow+seep -> decay -> tower burn, per side, then
// the two grids contest. Each side reads only its OWN previous grid (double
// buffered), so the pass is order-independent and mirrors exactly.
function stepField(S, dt) {
  const cfg = S.cfg, F = cfg.FIELD, CR = cfg.CREEP, N = F.cols * F.rows;
  for (const side of ['p', 'e']) {
    const g = S.field[side];
    let src = 0;
    for (const s of S.slots[side]) if (s.type === 'mat' && !underway(s)) src++;
    if (!src) {
      for (const u of S.units) {
        if (u.side === side && u.typeKey === 'shambler' && u.state !== 'muster') { src++; break; }
      }
    }
    if (!src && S.fieldSum[side] <= 0) continue;   // nothing to simulate

    const laneC = fieldCol(S, cfg.LANE_CX);
    for (const s of S.slots[side]) {
      if (s.type !== 'mat' || underway(s)) continue;
      paintAt(S, g, s.x, s.y, CR.emit * dt);
      const i = fieldRow(S, s.y) * F.cols + laneC;
      g[i] = Math.min(1, g[i] + CR.laneEmit * dt);
    }
    // slime trails: a marching SEEP body smears its own cell only - a line, not
    // a blot, and it is laid exactly where the fight happens.
    // T27 made the SOURCE a per-unit factor rather than "is it a shambler":
    // measured, a den swapped for a slither den cost 215 of 262 hill damage,
    // because what a den really sells SEEP is the TRAIL (income, dot, corrode
    // and the hill strangle all read `fieldSum`) and the unit is the smaller
    // half of it. A skirmisher that skates on slime leaves slime. The rate is
    // per SECOND in a cell, so a hasted body self-limits: crossing at 1.5x
    // lays 0.67x the paint, and the faster the road the thinner it gets.
    for (const u of S.units) {
      if (u.side !== side || u.state === 'muster') continue;
      const tr = cfg.UNITS[u.typeKey].trail;
      if (!tr) continue;
      const i = fieldRow(S, u.y) * F.cols + fieldCol(S, u.x);
      g[i] = Math.min(1, g[i] + CR.trail * tr * dt);
    }
    // flow crosses each adjacent PAIR once, antisymmetrically, so no cell's
    // result depends on visit order; seep drags a slice of every cell one
    // row toward the enemy (paint at the far edge just piles up there).
    const next = g.slice();
    const k = CR.flow * dt / 4, bias = CR.seep * dt, back = CR.backSeep * dt;
    const dir = side === 'p' ? -F.cols : F.cols;
    for (let i = 0; i < N; i++) {
      const v = g[i];
      if ((i + 1) % F.cols !== 0) { const t = k * (v - g[i + 1]); next[i] -= t; next[i + 1] += t; }
      if (i + F.cols < N) { const t = k * (v - g[i + F.cols]); next[i] -= t; next[i + F.cols] += t; }
      const j = i + dir;
      if (j >= 0 && j < N) { const m = bias * v; next[i] -= m; next[j] += m; }
      const jb = i - dir;
      if (jb >= 0 && jb < N) { const m = back * v; next[i] -= m; next[jb] += m; }
    }
    for (let i = 0; i < N; i++) {
      const v = next[i] - CR.decay * dt;
      g[i] = v <= 0 ? 0 : (v > 1 ? 1 : v);
    }
    // foe shooting towers burn the paint back, hardest at the muzzle: the
    // stall line forms where burn balances what flows in behind it
    for (const ts of S.slots[other(side)]) {
      const spec = cfg.TOWERS[ts.type];
      if (!spec || !spec.dmg || underway(ts)) continue;
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
const LEVELABLE = ['sharp', 'spit', 'sap', 'guard', 'mortar', 'conv', 'dynamo', 'coil', 'rampart', 'bell', 'hall', 'swarmb', 'soldierb', 'majorb', 'sapperb', 'predatorb', 'hornb', 'fifeb', 'oozeb', 'grubb', 'slitherb', 'carrierb', 'kiss'];
// levels speed a drum-shifter's PRODUCTION like any brood; the beat delta
// stays one step per building, so the metronome is read by counting them.
// null means the faction has no drum at all (SEEP): nothing musters, so
// nothing is waiting for a beat.
function drumPeriod(S, side) {
  if (!faction(S, side).drum) return null;
  let period = S.cfg.WAR_DRUM;
  for (const s of S.slots[side]) if (!underway(s)) period += S.cfg.DRUM_DELTA[s.type] || 0;
  return Math.max(S.cfg.DRUM_MIN, Math.min(S.cfg.DRUM_MAX, period));
}
// T38, the surge clock: a corruptor BREEDS faster as its claims take. It
// multiplies the brood RATE and never the beat, which is the measured half of
// OQ27's ruling - VEIL's army is 14hp bodies whose only job is to touch, so it
// lives or dies on how many arrive TOGETHER, and every rule that re-phases the
// same throughput (drumless, a trickling carrier, a quicker beat) sells the
// concentration a flip needs. More per wave is tempo VEIL can use.
function surge(S, side) {
  const f = faction(S, side);
  if (!f.tithe) return 1;
  const CR = S.cfg.CORRUPT;
  return Math.min(CR.surgeMax, 1 + CR.surgeGain * tithePips(S, side));
}
function lvlPower(S, slot) {
  return Math.pow(S.cfg.LVL_POWER, (slot.lvl || 1) - 1);
}
// how long a brood accrues between releases: a bloom holds its clump for the
// whole window, so throughput is unchanged and only concentration moves.
function prodPeriod(prod) {
  return prod.interval * (prod.bloom || 1);
}
function lvlCost(S, slot) {
  return Math.round(S.cfg.COSTS[slot.type] * S.cfg.LVL_COST_MULT[(slot.lvl || 1) + 1]);
}
// legal build/upgrade types for this slot (empty slot -> the three roots;
// specialised buildings offer 'lvl' until MAX_LVL)
function buildOptions(S, side, slotIdx) {
  const slot = S.slots[side][slotIdx];
  if (!slot) return [];
  // T33: nothing to offer on a slot that has turned. It is not theirs to spend
  // on any more - and refusing it HERE rather than in applyAction is what stops
  // a bot bidding on it every tick and a popup offering a level for a building
  // that fights for the other side.
  if (slot.flipped) return [];
  const f = faction(S, side);
  let opts;
  if (slot.type === null) opts = f.roots || ['farm', 'tower', 'hatch'];
  else if (S.cfg.UPGRADE_TREE[slot.type]) opts = S.cfg.UPGRADE_TREE[slot.type];
  else if (LEVELABLE.includes(slot.type) && slot.lvl < S.cfg.MAX_LVL) return ['lvl'];
  else return [];
  const out = f.kit ? opts.filter(t => f.kit.includes(t)) : opts;
  // T27: a type may be BOTH a trunk and a leaf. Before the Ooze Den grew a
  // child no type was, so the tree branch could swallow 'lvl' - and a den that
  // gained one would have silently lost SEEP's main gold sink. Appended after
  // the kit filter, so a faction that owns the den but not the child keeps its
  // levels rather than getting a dead slot.
  if (slot.type !== null && LEVELABLE.includes(slot.type) && slot.lvl < S.cfg.MAX_LVL) out.push('lvl');
  return out;
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
    // T33: a turned building cannot be sold by either side - the owner's window
    // shut when it saturated, and the corruptor never owned the ground. It comes
    // off the board by demolition only.
    if (!slot.type || slot.flipped) return false;
    S.money[side] = Math.min(S.cfg.GOLD_CAP, S.money[side] + sellRefund(S, slot));
    S.events.push({ type: 'sell', x: slot.x, y: slot.y, side });
    // guards from a sold post disband via the orphan check in step()
    slot.type = null; slot.lvl = 1; slot.cd = 0; slot.prodCd = 0; slot.hp = 0; slot.spent = 0;
    slot.chTgt = null; slot.chT = 0; slot.spun = 1; slot.buildT = 0; slot.pips = 0; slot.flipped = false;
    return true;
  }
  // T29: scrub a building clean. Selling already denies the corruptor its
  // tithe, at the price of the building - this is the version you pay gold
  // for instead. Refused when there is nothing to scrub, so a mis-tap is free.
  if (action.kind === 'cleanse') {
    // ...and a cleanse cannot buy it back either (T33): scrubbing the pips off a
    // flipped slot would leave it flipped and clean, so refusing keeps the gold
    // rather than selling a cure that does nothing.
    if (!slot.type || slot.flipped || slot.pips <= 0) return false;
    if (S.money[side] < S.cfg.CORRUPT.cleanseCost) return false;
    S.money[side] -= S.cfg.CORRUPT.cleanseCost;
    slot.pips = 0;
    S.events.push({ type: 'cleanse', x: slot.x, y: slot.y, side });
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
    slot.buildT = buildTime(S, side, slot);
    return true;
  }
  const cost = costOf(S, side, action.type);
  if (S.money[side] < cost) return false;
  S.money[side] -= cost;
  slot.spent += cost;
  slot.type = action.type;
  slot.lvl = 1;
  slot.cd = 0;
  slot.spun = 1;                 // a respec is a new mechanism: spin starts cold
  slot.pips = 0;                 // ...and it is clean, for the same reason. A
                                 // LEVEL is the same building, so it keeps its
                                 // corruption; a respec always costs more than
                                 // a cleanse, so this is no cheaper scrub.
  slot.hp = demolishable(action.type) ? S.cfg.TOWER_HP : 0;
  slot.buildT = buildTime(S, side, slot);
  if (S.cfg.PRODUCTION[action.type]) {
    slot.prodCd = prodPeriod(S.cfg.PRODUCTION[action.type]);
  }
  if (action.type === 'guard') {
    // the squad musters immediately; the respawn timer covers replacements.
    // Gated (T28), it musters when the post finishes instead - stepBuilds does
    // it, so an unbuilt post is not a free squad.
    if (!underway(slot)) for (let i = 0; i < S.cfg.GUARD.count; i++) spawnGuard(S, side, action.slot);
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
    slowed: false, hasted: false, punchT: 0, frozen: 0, thawT: 0,
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

// ------------------------------------------------------------- the press ----
// A stamping faction's broods pour their whole throughput - hp AND dps - into
// the press instead of dropping ants in the muster, and the drum stamps it into
// one heavy product. Nothing is lost in the batching; what changes is that the
// wave is ONE body, slower the heavier it gets, and gold can overcharge it.
function pressRate(S, side) {
  const out = { m: 0, d: 0 };
  // T33: both nests - a flipped brood pours into the press of whoever owns it
  // now, and stops pouring into its builder's
  for (const sd of ['p', 'e']) {
    for (const slot of S.slots[sd]) {
      const prod = S.cfg.PRODUCTION[slot.type];
      if (!prod || underway(slot) || effSide(sd, slot) !== side) continue;
      const u = S.cfg.UNITS[prod.unit], per = prod.interval / lvlPower(S, slot);
      out.m += u.hp / per;
      out.d += u.dps / per;
    }
  }
  out.m *= S.cfg.STAMP.eff;
  out.d *= S.cfg.STAMP.eff;
  return out;
}
function spawnProduct(S, side, mass, dps) {
  const cfg = S.cfg, ST = cfg.STAMP, w = mass / ST.refMass, sp = musterSpot(S, side);
  S.units.push({
    side, typeKey: 'product', w,
    x: sp.x, y: sp.y,
    hp: mass, maxHp: mass,
    spd: cfg.UNITS.product.spd * Math.pow(w, -ST.spdExp),
    dps,
    r: cfg.UNITS.product.r * Math.sqrt(w),
    seed: S.rng() * 10,
    state: 'march',              // stamped ON the beat: it never musters
    sx: 0, sy: 0,
    slowed: false, hasted: false, punchT: 0, frozen: 0, thawT: 0,
  });
  S.hatched[side].product++;
  S.stamped[side] += w;
  S.events.push({ type: 'stamp', x: sp.x, y: sp.y, side, w });
}
// the beat empties the press. What the broods pressed ships free; gold on top
// overcharges it into something heavier - that is the SINK T7b-a proved
// missing, and it is why the top of the flywheel curve now buys something.
function stampPress(S, side) {
  const ST = S.cfg.STAMP, pr = S.press[side];
  if (pr.m < ST.minWeight * ST.refMass) return;    // too light: the press holds
  const paid = Math.min(Math.max(0, S.money[side]) * ST.spend / ST.gold, pr.m * ST.boost);
  S.money[side] -= paid * ST.gold;
  const k = (pr.m + paid) / pr.m;                  // overcharge lifts dps too
  const mass = pr.m * k, dmg = pr.d * k;
  pr.m = 0; pr.d = 0;
  const n = Math.max(1, Math.ceil(mass / (ST.maxWeight * ST.refMass)));
  for (let i = 0; i < n; i++) spawnProduct(S, side, mass / n, dmg / n);
}

// T30: a carrier's entire output. One body, one pip, and it dies where it
// touched - a foe building takes it on the slot (the tithe, and T33's flip), a
// hill takes it in the mound, where a pip is the only corruption that damages
// anything by itself. Saturation is a CAP, not a refusal: the carrier that
// walks into a full building still dies for nothing, which is what makes
// over-sending a real mistake rather than a rounding error.
function stakeClaim(S, u, slot) {
  const n = S.cfg.UNITS[u.typeKey].stake;
  S.events.push({ type: 'stake', x: u.x, y: u.y, side: u.side, hill: !slot });
  u.hp = 0;
  if (slot) addPips(S, other(u.side), slot, n);
  else addHillPips(S, other(u.side), n);
}

// T38 gave the hill three writers, so its cap lives in one place. A hill never
// flips (that is `addPips`' job on a slot), so this is the whole rule.
function addHillPips(S, side, n) {
  S.hillPips[side] = Math.min(S.cfg.CORRUPT.hillMax, S.hillPips[side] + n);
}

// T33: every pip that lands on a BUILDING lands here, and the last one TURNS
// it. One-way, and still the only place the flag is ever set - T34 gave pips a
// second source and the flip stayed put rather than being restated beside it, so
// `side` is whoever's ground the slot stands on, not whoever wrote the pip.
function addPips(S, side, slot, n) {
  const CR = S.cfg.CORRUPT;
  slot.pips = Math.min(CR.max, slot.pips + n);
  if (!slot.flipped && slot.pips >= CR.max) {
    slot.flipped = true;
    S.events.push({ type: 'flip', x: slot.x, y: slot.y, side, what: slot.type });
  }
}

function guardsAlive(S, side, slotIdx) {
  let n = 0;
  for (const u of S.units) {
    if (u.side === side && u.state === 'guard' && u.srcSlot === slotIdx && u.hp > 0) n++;
  }
  return n;
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
    slowed: false, hasted: false, punchT: 0, frozen: 0, thawT: 0,
  });
}

function destroySlot(S, side, slot) {
  S.events.push({ type: 'towerfall', x: slot.x, y: slot.y, side, what: slot.type });
  const FL = S.cfg.FLYWHEEL;
  // read the gear BEFORE the slot clears: the gear standing when the loss
  // lands is the one that answers for it, even when the thing lost IS the gear
  const gear = gearOf(S, side);
  if (gear !== 'governor') S.spin[side] = Math.max(FL.cold, S.spin[side] - FL.loss);
  if (gear === 'redline') S.money[side] = Math.max(0, S.money[side] - FL.vent);
  slot.type = null; slot.lvl = 1; slot.cd = 0; slot.prodCd = 0; slot.hp = 0; slot.spent = 0;
  slot.chTgt = null; slot.chT = 0; slot.spun = 1; slot.buildT = 0; slot.pips = 0; slot.flipped = false;
}

// ---------------------------------------------------------------- step ----
function step(S) {
  if (S.over) return;
  const cfg = S.cfg, dt = cfg.TICK;
  S.t += dt;

  if (!S.frenzy && S.t >= cfg.FRENZY_AT) { S.frenzy = true; S.events.push({ type: 'frenzy' }); }
  if (!S.decay && S.t >= cfg.DECAY_AT) { S.decay = true; S.events.push({ type: 'decay' }); }

  // an ordered pipeline - the order is load-bearing (flywheel charges before
  // income is taken, corrode runs after mortars, the death pass reads
  // everything above it). Never reorder without a byte-identical check.
  stepBuilds(S, dt);
  stepEconomy(S, dt);
  stepField(S, dt);
  stepProduction(S, dt);
  stepDrums(S);
  stepAuras(S, dt);
  stepUnits(S, dt);
  stepTowers(S, dt);
  stepBells(S, dt);
  stepMortars(S, dt);
  stepCorrode(S, dt);
  stepKiss(S, dt);
  stepPips(S, dt);
  stepConverters(S, dt);
  deathPass(S, dt);

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

// T28: scaffolding comes down. Runs FIRST, so a slot that finishes this tick
// works this tick. Off (SPICE.buildGate 0) nothing here ever runs, so the whole
// experiment is bit-identical to the shipped rules.
function stepBuilds(S, dt) {
  if (S.cfg.SPICE.buildGate <= 0) return;
  for (const side of ['p', 'e']) {
    for (let i = 0; i < S.slots[side].length; i++) {
      const slot = S.slots[side][i];
      if (slot.buildT <= 0) continue;
      slot.buildT -= dt;
      if (slot.buildT > 0) continue;
      slot.buildT = 0;
      // the deferred muster - up to the SHORTFALL, so levelling a manned post
      // does not quietly double its squad
      if (slot.type === 'guard') {
        for (let n = guardsAlive(S, side, i); n < S.cfg.GUARD.count; n++) spawnGuard(S, side, i);
        slot.prodCd = S.cfg.GUARD.respawn;
      }
    }
  }
}

// the flywheel charges before income is taken: uptime, so a side with
// nothing standing spins nothing up (a wiped machine has to be rebuilt
// before it starts compounding again).
function stepEconomy(S, dt) {
  const cfg = S.cfg, FL = cfg.FLYWHEEL;
  for (const side of ['p', 'e']) {
    const gear = gearOf(S, side);
    const max = gear === 'governor' ? FL.govMax : FL.max;
    if (S.spin[side] >= max) { S.spin[side] = max; continue; }
    if (S.slots[side].some(s => s.type && !underway(s))) {
      const rate = FL.rate * (gear === 'redline' ? FL.redMult : 1);
      S.spin[side] = Math.min(max, S.spin[side] + rate * dt);
    }
  }
  for (const side of ['p', 'e']) {
    S.money[side] = Math.min(cfg.GOLD_CAP, S.money[side] + income(S, side) * dt);
  }
}

// hatcheries produce into the muster; guard posts keep their squad manned.
// A stamping faction (FOUNDRY) breeds nothing: the same buildings pour mass
// into the press, capped, and the drum stamps it.
function stepProduction(S, dt) {
  const cfg = S.cfg;
  for (const side of ['p', 'e']) {
    if (faction(S, side).stamp) {
      const pr = pressRate(S, side);
      S.press[side].m += pr.m * dt;
      S.press[side].d += pr.d * dt;
    }
    for (let i = 0; i < S.slots[side].length; i++) {
      const slot = S.slots[side][i];
      if (underway(slot)) continue;
      if (slot.type === 'guard') {
        const living = guardsAlive(S, side, i);
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
      // T33: a flipped brood breeds for the corruptor; the timer stays on the
      // slot, so its rate is still the building's.
      const es = effSide(side, slot);
      if (!prod || faction(S, es).stamp) continue;
      slot.prodCd -= dt;
      if (slot.prodCd <= 0) {
        // 2026-08-04 playtest reversed T33's phase-across: the units hatch AT
        // the stolen building now, wait there, and release on the corruptor's
        // beat - hatching invisibly at the far nest is what made a flipped
        // hatchery read dead on screen. Siege range at birth is the designed
        // catastrophe (VEIL > FOUNDRY rides on it), not an accident.
        const at = slot.flipped ? { x: slot.x, y: slot.y } : null;
        for (let n = prod.bloom || 1; n > 0; n--) spawnUnit(S, es, prod.unit, at);
        slot.prodCd += prodPeriod(prod) / (lvlPower(S, slot) * surge(S, es));
      }
    }
  }

  // guards whose post is gone (sapped or respecced) disband
  for (const u of S.units) {
    if (u.state === 'guard' && S.slots[u.side][u.srcSlot].type !== 'guard') u.hp = 0;
  }
}

// the war drums: each side beats on its own period (fx0.2). A pending
// beat keeps its scheduled time; the CURRENT period applies from the
// next scheduling on, so drum-shifters never retro-shift a beat.
function stepDrums(S) {
  for (const side of ['p', 'e']) {
    const period = drumPeriod(S, side);
    if (period === null) continue;             // drumless faction: no beat
    if (S.t >= S.nextBeat[side]) {
      S.nextBeat[side] += period;
      if (faction(S, side).stamp) stampPress(S, side);
      punchRamparts(S, side);
      for (const u of S.units) if (u.side === side && u.state === 'muster') u.state = 'march';
      S.events.push({ type: 'march', side });
    }
  }
}

// T24: the beat's DEFENSIVE half. Knockback is toward the victim's own hill,
// which mirrors by construction (y' = 640-y flips the sign with it), and a
// besieger is dropped back to 'march' so it must re-close and re-pick a siege
// spot: the reset is the damage. Levels buy shove DISTANCE, not stun - the
// readable effect, and stacking both would compound a control tower.
function punchRamparts(S, side) {
  const cfg = S.cfg, spec = cfg.TOWERS.rampart, foe = other(side);
  const homeY = (foe === 'p' ? cfg.PLAYER_BASE : cfg.ENEMY_BASE).y;
  for (const slot of S.slots[side]) {
    if (slot.type !== 'rampart' || underway(slot)) continue;
    const reach = spec.punch * lvlPower(S, slot);
    for (const u of S.units) {
      if (u.side !== foe || u.hp <= 0 || u.state === 'muster' || u.state === 'guard') continue;
      if (Math.hypot(u.x - slot.x, u.y - slot.y) >= spec.range) continue;
      const shrug = u.w >= cfg.STAMP.smashAt ? cfg.STAMP.shrug : 1;
      u.y += Math.sign(homeY - u.y) * reach * shrug;
      u.punchT = Math.max(u.punchT, spec.punchStun * shrug);
      if (u.state === 'siege') u.state = 'march';
      S.events.push({ type: 'punch', x: u.x, y: u.y, side });
    }
  }
}

// speed and bite-rate modifiers, reset and reapplied each tick before
// anything moves: sap auras, then paint underfoot (slow/DoT/heal/haste).
function stepAuras(S, dt) {
  const cfg = S.cfg, CR = cfg.CREEP;
  // sap auras: defender's sap towers slow attackers (speed and bite rate).
  // A punched attacker (T24) staggers off the same `slowed` channel, so a sap
  // and a rampart take the stronger of the two rather than multiplying.
  for (const u of S.units) {
    u.slowed = false; u.hasted = false;
    if (u.punchT > 0) {
      u.punchT = Math.max(0, u.punchT - dt);
      u.slowed = cfg.TOWERS.rampart.punchSlow;
    }
    // T32: stasis is a TIMER, not a per-tick aura - it survives leaving the
    // bell's range, so it burns down here beside the stagger rather than being
    // recomputed. Thawing arms the immunity that caps a stack of bells.
    if (u.frozen > 0) {
      u.frozen = Math.max(0, u.frozen - dt);
      if (u.frozen <= 0) u.thawT = cfg.TOWERS.bell.immune;
    } else if (u.thawT > 0) {
      u.thawT = Math.max(0, u.thawT - dt);
    }
  }
  for (const side of ['p', 'e']) {
    const foe = other(side);
    for (const slot of S.slots[side]) {
      if (slot.type !== 'sap' || underway(slot)) continue;
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
    // T44: a Thicket is a patch of creep that is always thick, so it belongs
    // to this pass rather than owning one - it raises the intensity a wader
    // reads, and every consequence is the curve above. It writes nothing into
    // the grid, so `fieldSum` (and SEEP's area income) never sees it.
    const thick = [];
    for (const slot of S.slots[side]) {
      if (slot.type === 'thicket' && !underway(slot)) thick.push(slot);
    }
    if (S.fieldSum[side] <= 0 && !thick.length) continue;
    const TH = cfg.TOWERS.thicket;
    const foe = other(side);
    for (const u of S.units) {
      if (u.side !== foe || u.state === 'muster') continue;
      let k = fieldAt(S, side, u.x, u.y);
      for (const slot of thick) {
        if (Math.hypot(u.x - slot.x, u.y - slot.y) < TH.range) k = Math.max(k, TH.dense);
      }
      if (k <= 0) continue;
      u.slowed = Math.min(u.slowed || 1, 1 + (CR.slow - 1) * k);
      u.hp -= CR.dot * k * dt;
    }
    // T6c PAINT_HEALS: the same ground knits your own bodies back together,
    // so SEEP's paint is a field hospital as well as a minefield
    if (cfg.SPICE.heal > 0) {
      for (const u of S.units) {
        if (u.side !== side || u.state === 'muster') continue;
        const max = u.maxHp || cfg.UNITS[u.typeKey].hp;
        if (u.hp >= max) continue;
        const k = fieldAt(S, side, u.x, u.y);
        if (k > 0) u.hp = Math.min(max, u.hp + cfg.SPICE.heal * k * dt);
      }
    }
    // T17 PAINT_HASTES: own bodies skate on their own slime. Stacks with a sap
    // slow rather than cancelling it.
    // T27 generalised the GATE from the global flag to a per-unit factor, so a
    // slither carries its own haste while `SPICE.speed` stays 0: a unit's
    // `paintSpeed` wins, everything else falls back to the flag.
    for (const u of S.units) {
      if (u.side !== side || u.state === 'muster') continue;
      const ps = cfg.UNITS[u.typeKey].paintSpeed || cfg.SPICE.speed;
      if (ps <= 0) continue;      // 0 is off; under 1 still SLOWS, as before
      const k = fieldAt(S, side, u.x, u.y);
      if (k > 0) u.hasted = 1 + (ps - 1) * k;
    }
  }
}

// march down the lane, then dig in and chew the enemy nest until killed.
// v0.5 contact rules first: guards hunt attackers near their rally point;
// an attacker with a guard in engage range halts and fights it instead of
// advancing; sappers divert to enemy defence buildings and demolish them.
function stepUnits(S, dt) {
  const cfg = S.cfg;
  for (const u of S.units) {
    if (u.state === 'muster') continue;
    // T32: frozen is TOTAL - no step, no bite, no divert, no crush. It keeps
    // its state, so a besieger resumes chewing where it stood, and it stays a
    // target for every gun and every charmer: the freeze buys the defender the
    // seconds, it does not hide the body.
    if (u.frozen > 0) continue;

    const factor = u.slowed || 1;   // slowed holds the strongest sap factor
    const mv = factor * (u.hasted || 1);   // haste is movement-only
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
          u.x += (dx / d) * u.spd * mv * dt;
          u.y += (dy / d) * u.spd * mv * dt;
        } else {
          tgt.hp -= u.dps * factor * dt;
        }
      } else {
        const dx = u.ax - u.x, dy = u.ay - u.y, d = Math.hypot(dx, dy);
        if (d > 2) {
          u.x += (dx / d) * u.spd * mv * dt;
          u.y += (dy / d) * u.spd * mv * dt;
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
          u.x += ((ts.x - u.x) / td) * u.spd * mv * dt;
          u.y += ((ts.y - u.y) / td) * u.spd * mv * dt;
        } else {
          ts.hp -= spec.vsTower * factor * dt;
          if (ts.hp <= 0) destroySlot(S, foe, ts);
        }
        continue;
      }
    }

    // T30: a carrier walks to the nearest foe building it can still corrupt and
    // touches it. Same divert shape as the sapper - what differs is that it
    // SKIPS a saturated building (a full slot cannot take another pip, so
    // parking on it is a wasted body) and that arriving kills it. A scaffold is
    // a target like anything else: T29's contract is that corruption lands on
    // what is THERE, and only the contributor side of a build is gated.
    if (u.typeKey === 'carrier' && u.state === 'march') {
      const spec = cfg.UNITS.carrier;
      let ts = null, td = spec.sight;
      for (const slot of S.slots[foe]) {
        if (!slot.type || slot.pips >= cfg.CORRUPT.max) continue;
        const d = Math.hypot(slot.x - u.x, slot.y - u.y);
        if (d < td) { td = d; ts = slot; }
      }
      if (ts) {
        if (td > 18) {
          u.x += ((ts.x - u.x) / td) * u.spd * mv * dt;
          u.y += ((ts.y - u.y) / td) * u.spd * mv * dt;
        } else {
          stakeClaim(S, u, ts);
        }
        continue;
      }
    }

    // a heavy product walks THROUGH the wall: it crushes the nearest foe
    // building beside its path without ever stopping (a sapper diverts and
    // parks; the juggernaut just keeps coming). Its reach covers the lane-side
    // and forward slots, so rear flanks still need artillery.
    if (u.state === 'march' && u.w >= cfg.STAMP.smashAt) {
      let ts = null, td = cfg.STAMP.smashR;
      for (const slot of S.slots[foe]) {
        if (!slot.type) continue;
        const d = Math.hypot(slot.x - u.x, slot.y - u.y);
        if (d < td) { td = d; ts = slot; }
      }
      if (ts) {
        ts.hp -= u.dps * cfg.STAMP.crush * factor * dt;
        if (ts.hp <= 0) destroySlot(S, foe, ts);
      }
    }

    const nest = u.side === 'p' ? cfg.ENEMY_BASE : cfg.PLAYER_BASE;
    if (u.state === 'march') {
      u.y += (u.side === 'p' ? -1 : 1) * u.spd * mv * dt;
      if (Math.hypot(u.x - nest.x, u.y - nest.y) < cfg.SIEGE_DIST) {
        u.state = 'siege';
        const sp = siegeSpot(u, nest);
        u.sx = sp.x; u.sy = sp.y;
      }
    } else {
      const dx = u.sx - u.x, dy = u.sy - u.y;
      const d = Math.hypot(dx, dy);
      if (d > 3) {
        u.x += (dx / d) * u.spd * mv * dt;
        u.y += (dy / d) * u.spd * mv * dt;
      } else if (u.typeKey === 'carrier') {
        // the hill is where a carrier ends up with nothing left to corrupt, and
        // it plants in the mound itself: a nest with no buildings standing is
        // not a safe nest. Siege position, not SIEGE_DIST, so the gun line gets
        // the same walk to shoot at as it does against any other besieger.
        stakeClaim(S, u, null);
      } else {
        S.baseHP[other(u.side)] -= u.dps * factor * dt;
      }
    }
  }
}

// towers fire at the nearest marching/besieging foe in range
function stepTowers(S, dt) {
  const cfg = S.cfg;
  for (const side of ['p', 'e']) {
    for (const slot of S.slots[side]) {
      const spec = cfg.TOWERS[slot.type];
      if (!spec || !spec.dmg || underway(slot)) continue;
      // T33: a flipped gun shoots the army of the nest it stands in. This is the
      // one effect the flip steals that is visible from across the map, and the
      // only one routed here: who may SHOOT the building, sap it, bomb it or
      // charm past it all stay keyed to the ground, not to its loyalty.
      const foe = other(effSide(side, slot));
      slot.cd -= dt;
      if (slot.cd > 0) continue;
      // 2026-08-04 playtest: a turned gun stands INSIDE the garrison it was
      // stolen from, and every body near it is mustering or guarding - the
      // states all guns skip - so it read inert. A flipped gun may shoot them:
      // the stolen tower shreds the nest's own defenders, which is the flip's
      // whole fantasy made visible.
      const still = u => (u.state === 'muster' || u.state === 'guard') && !slot.flipped;
      let best = null, bestD = spec.range;
      for (const u of S.units) {
        if (u.side !== foe || u.hp <= 0 || still(u)) continue;
        const d = Math.hypot(u.x - slot.x, u.y - slot.y);
        if (d < bestD) { bestD = d; best = u; }
      }
      if (best) {
        const dmg = spec.dmg * lvlPower(S, slot);
        // the muzzle flash goes in FIRST so a chain's arcs trail their own head
        S.shots.push({ x1: slot.x, y1: slot.y - 14, x2: best.x, y2: best.y, ttl: 0.09, splash: spec.splash || 0 });
        if (spec.splash) {
          for (const u of S.units) {
            if (u.side !== foe || u.hp <= 0 || still(u)) continue;
            if (Math.hypot(u.x - best.x, u.y - best.y) <= spec.splash) u.hp -= dmg;
          }
        } else if (spec.hops) {
          // the arc hops from the LAST body hit, not from the tower: a strung-
          // out file conducts as far as a blob does. Ties go to the lower unit
          // index, like every other scan here - array order is the replay.
          let cur = best, arc = dmg;
          const hit = new Set([best]);
          best.hp -= arc;
          while (hit.size < spec.hops) {
            let nxt = null, nd = spec.chainR;
            for (const u of S.units) {
              if (u.side !== foe || u.hp <= 0 || hit.has(u) || still(u)) continue;
              const d = Math.hypot(u.x - cur.x, u.y - cur.y);
              if (d < nd) { nd = d; nxt = u; }
            }
            if (!nxt) break;
            arc *= spec.falloff;
            nxt.hp -= arc;
            hit.add(nxt);
            S.shots.push({ x1: cur.x, y1: cur.y, x2: nxt.x, y2: nxt.y, ttl: 0.09, arc: true });
            cur = nxt;
          }
        } else {
          best.hp -= dmg;
        }
        // a slimed target gums the mechanism: paint suppresses the guns that
        // burn it back, so the stall line becomes an arms race
        slot.cd = cfg.SPICE.stifle > 0
          ? spec.cooldown * (1 + cfg.SPICE.stifle * fieldAt(S, foe, best.x, best.y))
          : spec.cooldown;
        // a dynamo winds itself: the shot it just took is already faster
        if (spec.spinStep) {
          slot.spun = Math.min(spec.spinMax, slot.spun + spec.spinStep);
          slot.cd /= slot.spun;
        }
      }
    }
  }
}

// T32: the Stasis Bell rings. It is a PULSE, not a shot - no target choice, no
// nearest-body scan: everything hostile inside the ring freezes at once, which
// is what makes it a screen against numbers rather than a gun that happens to
// stun. A juggernaut shrugs at STAMP.shrug, the same weight threshold that lets
// it crush (T24's constant, shared on purpose).
function stepBells(S, dt) {
  const cfg = S.cfg, spec = cfg.TOWERS.bell;
  for (const side of ['p', 'e']) {
    const foe = other(side);
    for (const slot of S.slots[side]) {
      if (slot.type !== 'bell' || underway(slot)) continue;
      slot.cd -= dt;
      if (slot.cd > 0) continue;
      slot.cd = spec.cooldown / lvlPower(S, slot);   // levels ring OFTENER
      S.events.push({ type: 'bell', x: slot.x, y: slot.y, side, r: spec.range });
      for (const u of S.units) {
        if (u.side !== foe || u.hp <= 0 || u.state === 'muster' || u.state === 'guard') continue;
        // already held, or still thawing: a second bell buys coverage, never a
        // longer hold. This is the whole anti-lock rule
        if (u.frozen > 0 || u.thawT > 0) continue;
        if (Math.hypot(u.x - slot.x, u.y - slot.y) >= spec.range) continue;
        const shrug = u.w >= cfg.STAMP.smashAt ? cfg.STAMP.shrug : 1;
        u.frozen = spec.freezeDur * shrug;
      }
    }
  }
}

// mortars lob at the nearest enemy defence building; they never touch
// units or the hill (the reverse-sapper: siege from your own side)
function stepMortars(S, dt) {
  const cfg = S.cfg;
  for (const side of ['p', 'e']) {
    const foe = other(side);
    for (const slot of S.slots[side]) {
      if (slot.type !== 'mortar' || underway(slot)) continue;
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
}

// the mat eats walls: a foe building corrodes at the intensity it stands
// in, and paint lapping the foe HILL's rim strangles it.
function stepCorrode(S, dt) {
  const CR = S.cfg.CREEP;
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
}

// T29: corruption pips gnaw the hill they sit on. It rides beside the strangle
// because it is the same shape - a persistent state on a target, billed per
// second straight off baseHP, so playMatch's hill-damage readouts see it with
// no extra bookkeeping. Building pips do not tick: they pay the tithe and, at
// saturation, flip (T33). Inert until carriers land - nothing writes a pip.
// T34, the Echo: corruption stops needing a body. Every `spreadEvery`
// seconds each Echo looks over the nest it has claimed and lets every pipped
// building seed its nearest CLEANER neighbour inside `spreadR` - so a clustered
// nest rots outward from wherever the carriers first landed, and a spread-out
// one does not. Two rules earn their lines: the seeds are collected before any
// of them is written, so one pulse cannot cascade along a chain of slots in the
// order the array happens to hold them; and a FLIPPED slot is out at both ends,
// because it is the corruptor's building now - it has nothing left to catch and
// nothing to give. Nothing else in the pool builds one, so this pass is a
// no-op everywhere until VEIL reaches its own tier-2.
function stepKiss(S, dt) {
  const CR = S.cfg.CORRUPT;
  for (const side of ['p', 'e']) {
    const foes = S.slots[other(side)];
    for (const slot of S.slots[side]) {
      if (slot.type !== 'kiss' || underway(slot)) continue;
      slot.cd -= dt;
      if (slot.cd > 0) continue;
      slot.cd = CR.spreadEvery / lvlPower(S, slot);
      S.events.push({ type: 'kiss', x: slot.x, y: slot.y, side });
      const seeds = [];
      for (let i = 0; i < foes.length; i++) {
        const src = foes[i];
        if (!src.type || src.flipped || !(src.pips >= 1)) continue;
        let tgt = null, td = CR.spreadR;
        for (let j = 0; j < foes.length; j++) {
          const dst = foes[j];
          if (j === i || !dst.type || dst.flipped || dst.pips >= src.pips) continue;
          const d = Math.hypot(dst.x - src.x, dst.y - src.y);
          if (d < td) { td = d; tgt = dst; }
        }
        if (tgt) seeds.push(tgt);
      }
      for (const tgt of seeds) addPips(S, other(side), tgt, CR.spreadAmt);
    }
  }
}

// T38: the two rules that let something OTHER than a carrier's body reach the
// hill dot below. They accrue BEFORE the bill, so a claim laid this tick already
// gnaws this tick - T30's convention. Both read the holder's faction, so
// everything a sandbox does with a stolen loom or a charmer is unchanged.
//
// The FLIP drips (A): a seized building feeds the hill it stands on. `effSide`
// is not consulted on purpose - what bleeds is the body the organ is still part
// of, and the corruptor is whoever owns the other nest by construction.
//
// The HOLD claims (B): every living body the corruptor is riding pays its OWN
// hill. A hostile frozen in a bell's ring is being ridden where it stands; a
// charmed one is being ridden while it fights. Nothing is paid for a corpse -
// that is SEEP's grammar (corpse gold, the wall bite), and a VEIL that eats the
// dead is SEEP in a shroud.
function stepThrall(S, dt) {
  const CR = S.cfg.CORRUPT;
  for (const side of ['p', 'e']) {
    if (!faction(S, other(side)).tithe) continue;
    let seized = 0;
    for (const slot of S.slots[side]) if (slot.flipped && !underway(slot)) seized++;
    if (seized) addHillPips(S, side, CR.flipDrip * seized * dt);
  }
  for (const u of S.units) {
    if (u.hp <= 0) continue;
    // a charm rides the body it turned (home is the army it came from); a freeze
    // rides one that still belongs to its own side
    const home = u.charmT > 0 ? other(u.side) : u.frozen > 0 ? u.side : null;
    if (home === null || !faction(S, other(home)).tithe) continue;
    addHillPips(S, home, CR.thrall * dt);
  }
}

function stepPips(S, dt) {
  const CR = S.cfg.CORRUPT;
  stepThrall(S, dt);
  for (const side of ['p', 'e']) {
    if (S.hillPips[side] > 0) S.baseHP[side] -= CR.hillDot * S.hillPips[side] * dt;
  }
  if (CR.decay <= 0) return;
  for (const side of ['p', 'e']) {
    for (const slot of S.slots[side]) {
      if (slot.pips > 0) slot.pips = Math.max(0, slot.pips - CR.decay * dt);
    }
    S.hillPips[side] = Math.max(0, S.hillPips[side] - CR.decay * dt);
  }
}

// what `side` is skimming: every pip it has planted on a foe building. NOT
// gated on `underway` - a scaffold is a TARGET of the corruption, not a
// contributor to it, and T28's gate covers only the latter.
// T33: a FLIPPED building pays no tithe. Nothing leaks from it any more, in
// either direction - it is not a corrupted enemy asset, it is yours, and it
// pays its income instead (income() counts it through effSide).
function tithePips(S, side) {
  let n = 0;
  for (const slot of S.slots[other(side)]) if (slot.type && !slot.flipped) n += slot.pips;
  return n;
}

// converters channel the nearest enemy attacker in range and flip it:
// the ant walks home and marches with its NEW side's next drum. The three
// load-bearing guards (see README v1.0 design): one target at a time
// (throughput-limited - chaff saturates it), the channel is interruptible
// (death, leaving range, or losing the tower resets progress), and a
// converted ant can never be converted again (no ping-pong). The charm
// revert pass rides at the tail so a flip and its wear-off share a tick order.
function stepConverters(S, dt) {
  const cfg = S.cfg;
  for (const side of ['p', 'e']) {
    const foe = other(side);
    const choir = choirOf(S, side);
    for (const slot of S.slots[side]) {
      // T34: a Chorus Hall is a charmer too - slower to channel, and every ant
      // that turns anywhere on this side keeps the charm twice as long
      if (!CHARMERS.includes(slot.type) || underway(slot)) continue;
      const spec = cfg.TOWERS[slot.type];
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
      const bodyHp = u.maxHp || cfg.UNITS[u.typeKey].hp;   // a stamped giant's
                                                           // size is its weight
      u.side = side;
      u.conv = true;
      // the charm wears off: big bodies resist it (v-fork gripe fix). Higher
      // charmer levels hold the charm longer as well as channelling faster.
      // T34: a standing Chorus Hall stretches the hold and stiffens the convert.
      // Both are read HERE, once - a hall lost mid-charm does not un-sing what
      // it already sang, and `dps0` is what lets the revert put the ant back.
      // T45: ...and a Reliquary stretches it again, by however much corruption
      // is standing on the foe's board at this instant.
      u.charmT = Math.max(spec.charmMin, spec.charmHpSec / bodyHp) * lvlPower(S, slot)
        * (choir ? choir.choirCharm : 1) * relicHold(S, side);
      if (choir) { u.dps0 = u.dps; u.dps *= choir.choirDps; }
      // it about-faces on the spot and fights at once: no walk home to the
      // muster, and no protection on the way - a convert is shootable now
      u.state = 'march';
      u.hp = bodyHp;                    // restored in full: conversion value
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
    if (u.dps0 !== undefined) { u.dps = u.dps0; u.dps0 = undefined; }
    const home = other(u.side);
    u.side = home;
    u.state = 'march';
    if (u.typeKey === 'predator') u.hy = (cfg.ENEMY_BASE.y + cfg.PLAYER_BASE.y) - u.hy;
    S.events.push({ type: 'revert', x: u.x, y: u.y, side: home });
  }
}

// deaths and what corpses are worth: splats, the T14 wall-bite, the digest,
// corpse gold, then the corpse and stale-shot sweep.
function deathPass(S, dt) {
  const cfg = S.cfg, CR = cfg.CREEP;
  // the corpse list, gathered once - three paint rules read it, and the
  // digest must not re-walk every ant to find the handful that died
  const dead = [];
  for (const u of S.units) {
    if (u.hp > 0) continue;
    dead.push(u);
    S.events.push({ type: 'death', x: u.x, y: u.y, side: u.side, big: u.typeKey === 'major' });
  }
  // corpse-splats: a dead shambler bursts paint where it falls, wherever that
  // is - deep splats simply fade if nothing keeps feeding them.
  // T27 deliberately leaves the SLITHER out: measured, splat is worth +12 hill
  // damage on its own but it is the ooze den's whole identity (T14), and two
  // dens whose corpses both bite is one den twice. The slither pays its rent in
  // trail and buys its keep in throughput; the shambler's corpse does the work.
  for (const u of dead) {
    if (u.typeKey !== 'shambler') continue;
    S.events.push({ type: 'splat', x: u.x, y: u.y, side: u.side });
    paintAt(S, S.field[u.side], u.x, u.y, CR.splat);
    const foe = other(u.side);
    let best = null, bestD = CR.splatDmgR;
    for (const slot of S.slots[foe]) {
      if (!slot.type || !demolishable(slot.type)) continue;
      const d = Math.hypot(slot.x - u.x, slot.y - u.y);
      if (d < bestD) { bestD = d; best = slot; }
    }
    if (!best) continue;
    best.hp -= CR.splatDmg * (1 - bestD / CR.splatDmgR);
    S.events.push({ type: 'splat', x: best.x, y: best.y, side: u.side });
    if (best.hp <= 0) destroySlot(S, foe, best);
  }
  if (dead.length) digestCorpses(S, dead);
  // T6c PAINT_EATS_CORPSES: anything that dies on paint is digested by the
  // owner of that ground - friend or foe, which is what makes the paint want
  // a battle fought on top of it
  if (cfg.SPICE.corpseGold > 0) {
    for (const u of dead) {
      for (const side of ['p', 'e']) {
        const k = fieldAt(S, side, u.x, u.y);
        if (k > 0) S.money[side] = Math.min(cfg.GOLD_CAP, S.money[side] + cfg.SPICE.corpseGold * k);
      }
    }
  }
  S.units = S.units.filter(u => u.hp > 0);
  for (const sh of S.shots) sh.ttl -= dt;
  S.shots = S.shots.filter(sh => sh.ttl > 0);
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
    stampP: S.stamped.p, stampE: S.stamped.e,
    // corruption standing on each side's own board at the end - the readout
    // that pairs with hpP/hpE. Zero until carriers can write a pip (T30).
    pipsP: S.hillPips.p + S.slots.p.reduce((n, s) => n + s.pips, 0),
    pipsE: S.hillPips.e + S.slots.e.reduce((n, s) => n + s.pips, 0),
    // T33: buildings each side has LOST to the flip and still standing. Paired
    // with pipsP/E: those are the corruption on your board, these are the part
    // of it that has stopped being yours.
    flipP: S.slots.p.reduce((n, s) => n + (s.flipped ? 1 : 0), 0),
    flipE: S.slots.e.reduce((n, s) => n + (s.flipped ? 1 : 0), 0),
  };
}

return {
  CONFIG, createState, applyAction, step, playMatch, buildOptions,
  count, familyCount, income, musterCount, other, mulberry32,
  lvlCost, lvlPower, sellRefund, drumPeriod, creepHome, creepAdvance,
  fieldCol, fieldRow, faction, costOf, pressRate, gearOf, tithePips,
  titheOf, relicHold, surge,
  // exported for the selftest only: a building dies where damage lands, and
  // there is no hp<=0 sweep, so a guard for the flywheel knock has to call it -
  // and stakeClaim is the flip's only writer, so a guard for the last pip has to
  // call that
  destroySlot, stakeClaim,
  demolishable, LEVELABLE, FAMILIES, FACTIONS,
};
});
