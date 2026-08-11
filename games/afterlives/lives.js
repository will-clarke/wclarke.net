'use strict';
/* afterlives - the lives.
   This file is the manuscript AND the economy. Every storyline, door gate, award
   and ending slug for the whole game lives here (the skeleton); prose exists only
   where authored:true. Endings marked stub:true are economy placeholders - the
   game never shows them, validate.mjs proves the whole DAG through them.

   Gates: {BODY:2, NERVE:2} and/or {perks:["PHYSICIST"]}; {anyOf:[gate,gate]} for OR.
   kept: what the soul keeps, banked once, on first find only. */

const AFTERLIVES = {

attrs: ["BODY", "MIND", "HEART", "NERVE", "SOUL"],

perks: {
  PHYSICIST:        {desc: "You have seen how the universe is bolted together."},
  GENETICIST:       {desc: "You know what the letters of a person spell."},
  COMMANDO:         {desc: "Selection week. You finished it."},
  DEEP_TIME:        {desc: "You have personally experienced centuries."},
  COMPASSION:       {desc: "You stayed when it cost you."},
  RUTHLESS:         {desc: "You gave the order."},
  VAMPIRISM:        {secret: true, desc: "The den answered."},
  FOURTH_DIMENSION: {secret: true, desc: "You can see the pages of the book."},
  OLD_FRIEND:       {secret: true, desc: "The Tall Man has spoken to you."},
},

morning: {
  text: "Tuesday. You are seven. Mum pours the tea, Dad's keys are jingling, the bus is at the corner, and the cellar door is ajar, which it never is.",
},

/* ---- the doors. authored:false = skeleton only, hidden from the game ---- */

storylines: [
  {id:"shop",      title:"THE SHOP",        door:"Help Dad in the shop",           gate:null,                                start:"shop1", authored:true},
  {id:"school",    title:"SCHOOL",          door:"Get on the bus",                 gate:{MIND:1},                            start:"sch1",  authored:true},
  {id:"timber",    title:"THE TIMBER",      door:"The woods past the fence",       gate:{NERVE:1},                           start:"tim1",  authored:true},
  {id:"boats",     title:"THE BOATS",       door:"Follow Alice to the harbour",    gate:{NERVE:1},                           start:"boa1",  authored:true},

  {id:"pond",      title:"THE POND",        door:"The pond",                       gate:{SOUL:1},                            authored:false},
  {id:"gym",       title:"THE GYM",         door:"The gym above the chip shop",    gate:{BODY:1},                            authored:false},
  {id:"lab",       title:"THE LAB",         door:"The letter from JUPITER",        gate:{MIND:3},                            authored:false},
  {id:"ward",      title:"THE WARD",        door:"The teaching hospital",          gate:{MIND:3},                            authored:false},

  {id:"regiment",  title:"THE REGIMENT",    door:"The recruiting office",          gate:{BODY:2, NERVE:2},                   authored:false},
  {id:"night",     title:"THE NIGHT SHIFT", door:"The night shift",                gate:{NERVE:3},                           authored:false},
  {id:"safe",      title:"THE SAFE",        door:"The man in the snooker hall",    gate:{anyOf:[{perks:["PHYSICIST"]},{perks:["RUTHLESS"]}]}, authored:false},
  {id:"cradle",    title:"THE CRADLE",      door:"The spare room",                 gate:{HEART:3},                           authored:false},
  {id:"link",      title:"THE LINK",        door:"The queue outside the clinic",   gate:{MIND:4},                            authored:false},

  {id:"ark",       title:"THE ARK",         door:"The colony ship",                gate:{NERVE:3, perks:["PHYSICIST"]},      authored:false},
  {id:"wormhole",  title:"THE WORMHOLE",    door:"The hole in the physics annexe", gate:{SOUL:3, perks:["PHYSICIST"]},       authored:false},
  {id:"machine",   title:"THE MACHINE",     door:"The interview with Andy",        gate:{MIND:6},                            authored:false},
  {id:"monastery", title:"THE MONASTERY",   door:"The mountain",                   gate:{SOUL:4},                            authored:false},
  {id:"fourth",    title:"THE FOURTH",      door:"The corner of your eye",         gate:{SOUL:4, MIND:5},                    authored:false},

  /* secrets & events - entered from inside other lives, modelled with host gates */
  {id:"piper",     title:"THE PIPER",       door:"(entered through THE POND)",     gate:{SOUL:2},                            authored:false, secret:true},
  {id:"drum",      title:"THE DRUM",        door:"(event: REGIMENT / NIGHT SHIFT / LAB)", gate:{BODY:2, NERVE:2},            authored:false, secret:true},

  {id:"cellar",    title:"THE CELLAR DOOR", door:"The cellar door",                gate:{BODY:7, MIND:7, HEART:7, NERVE:7, SOUL:7}, authored:false, secret:true, teaser:true},
],

/* ---- nodes (authored storylines only) ---- */

nodes: {

  /* THE SHOP - kitchen-sink warmth. The tutorial: a life with no choices, lived well. */
  shop1: {s:"The stocktake takes all morning: four hundred kinds of screw, and Dad knows the drawer for every one of them.",
    opts:[{l:"Keep the shop open", to:"shop2"}]},
  shop2: {slip:"TEN YEARS, LIKE THAT",
    s:"The supermarket opens across the roundabout with a car park and a man dressed as a giant carrot. Dad laughs so hard he has to sit down, and then he can't stop coughing.",
    opts:[
      {l:"Keep the shop open", to:"shop3"},
      {l:"Tell him what you are", to:"e_kettle", gate:{HEART:5}, hidden:true},
    ]},
  shop3: {s:"Alice comes in every Thursday for candles. Danny sends a postcard from somewhere with better weather. The drawer for the wing nuts sticks, same as always.",
    opts:[{l:"Keep the shop open", to:"shop4"}]},
  shop4: {slip:"AND THEN IT IS YOURS",
    s:"Dad's chair. Dad's ledger. Dad's drawer for every screw, with his handwriting in it going back to before you.",
    opts:[{l:"Keep the shop open", to:"shop5"}]},
  shop5: {s:"Sam from the wholesaler, stacking crates taller than himself, asks if you ever wanted to do anything else.",
    opts:[
      {l:"Say no", to:"e_small_change"},
      {l:"Say yes", to:"e_small_change"},
    ]},

  /* SCHOOL - coming-of-age. */
  sch1: {slip:"FOUR YEARS OF TUESDAYS",
    s:"Mr Okafor keeps you back after class to say the county scholarship exam is in June, and that in thirty years he has never entered anyone. Alice Hardy has set fire to the bench again.",
    opts:[
      {l:"Revise alone", to:"sch2"},
      {l:"Revise with Alice", to:"sch3"},
    ]},
  sch2: {s:"The letter comes in August: a full scholarship, a hundred miles away. Dad reads it twice and says it's wonderful, and his cough agrees from the back room.",
    opts:[
      {l:"Take it", to:"sch4"},
      {l:"Stay", to:"e_chalk"},
    ]},
  sch3: {s:"Alice's revision method involves flashcards, a rope swing and the fire alarm, in that order, and somehow by May you both know everything.",
    opts:[
      {l:"Sit next to her in the exam", to:"e_cup"},
      {l:"Sit at the front, away from trouble", to:"e_joint"},
    ]},
  sch4: {slip:"THE HUNDRED MILES",
    s:"The university is all stone and echoes. In your second year, two doors stand open across the same corridor: Professor Marsh's beetle room, and the roof where the telescope lives.",
    opts:[
      {l:"The beetle room", to:"e_beetle"},
      {l:"The roof", to:"e_sky"},
    ]},

  /* THE TIMBER - quiet folk register. */
  tim1: {slip:"ELEVEN YEARS LATER, THE WOODS ARE BIGGER",
    s:"The timber yard past the fence pays by the cord and asks no questions, and the bunkhouse smells of pine and paraffin. Winter is coming early this year.",
    opts:[
      {l:"Join the felling crew", to:"tim2"},
      {l:"Take the fire-watch tower", to:"e_firewatch"},
    ]},
  tim2: {s:"Erik says the old stand past the ridge is not to be cut, and won't say why, and the buyer is offering triple for exactly those trees.",
    opts:[
      {l:"Cut it - the crew needs the bonus", to:"e_widowmaker"},
      {l:"Refuse", to:"e_oldstand"},
    ]},

  /* THE BOATS - romance, salt water. */
  boa1: {slip:"TEN SUMMERS LATER",
    s:"Alice Hardy crews her father's boat out of Whitmouth and says the sea is only a bigger pond with worse manners. Her father needs a deckhand, and does not rate you.",
    opts:[
      {l:"Sign on", to:"boa2"},
      {l:"Take the empty stall on the fish market", to:"e_stall"},
    ]},
  boa2: {s:"A season of mackerel and bruises. Her father still calls you the shop boy; Alice has started calling you nothing at all, which is worse.",
    opts:[
      {l:"Earn it the slow way", to:"boa3"},
      {l:"Show off at the regatta", to:"e_regatta"},
    ]},
  boa3: {slip:"THREE MORE SEASONS",
    s:"October. The Maiden Fair is still out in a sea like beaten metal, her father aboard, and the lifeboat crew is one man short.",
    opts:[
      {l:"Go", to:"e_storm"},
      {l:"Hold Alice back from going", to:"e_seakeeps"},
    ]},
},

/* ---- endings ---- */

endings: {

  /* THE SHOP */
  e_small_change: {story:"shop", title:"SIXTY YEARS OF SMALL CHANGE",
    felt:"four hundred kinds of screw, each in its place",
    mattered:"everyone who ever needed the right one",
    cost:"every door you never opened",
    line:"THE SHOP STAYED OPEN.", shelf:"a brass bell", kept:{NERVE:1, MIND:1},
    sum:"You kept the shop open through two recessions, one flood, and the arrival of a supermarket with a car park. Alice came in every Thursday for candles and never once needed candles. Danny sends cards from wherever the bus went. On the last day the bell over the door rang exactly as it always had - like it mattered."},
  e_kettle: {story:"shop", title:"THE KETTLE",
    felt:"like putting something heavy down",
    mattered:"to the only person who always knew",
    cost:"five lives of learning to say it",
    line:"HE ALWAYS KNEW SOMETHING.", shelf:"a cup of tea, warm", kept:{HEART:1},
    sum:"You tell him all of it: the doors, the dying, the drawer of lives you keep now instead of screws. Dad listens the way he listens to the wholesaler's excuses - nodding, taking stock. Then he puts the kettle on and says what he has always said, which is: well, you're here now. No tea since has ever tasted like that one."},

  /* SCHOOL */
  e_beetle: {story:"school", title:"FOUR HUNDRED KINDS OF BEETLE",
    felt:"long grass and early starts",
    mattered:"to the beetles; to four Alices",
    cost:"nothing you ever missed",
    line:"EVERY ONE HAD A DRAWER.", shelf:"a pinned beetle, iridescent", kept:{MIND:2},
    sum:"Taxonomy turns out to be a shop for the whole world: everything gets a name and a drawer that sticks. You describe two hundred new species - four named for Alice, one for Dad, one, after a long evening, for the carrot. At eighty you are still out on your knees in the long grass, delighted, and that is where they find you."},
  e_sky: {story:"school", title:"HALF THE SKY",
    felt:"static, mostly; twice, not static",
    mattered:"to whoever was humming back",
    cost:"forty years of Saturday nights",
    line:"MOSTLY, THE UNIVERSE HUMS.", shelf:"a reel of chart paper", kept:{MIND:2},
    sum:"Forty years of listening: pulsars, masers, rain on the dish, and twice - only twice - something that was neither. You never publish either one. Some nights, walking home from the array, you would swear the hum is a voice patiently learning your name. You never find out. That, you tell your students, is astronomy."},
  e_chalk: {story:"school", title:"CHALK",
    felt:"chalk dust and second chances",
    mattered:"one child a year, every year",
    cost:"the hundred miles you never went",
    line:"SOMEBODY HAS TO SEE THEM.", shelf:"a stub of chalk",
    sum:"You stay for Dad, mark mock exams at the kitchen table, and when Okafor retires you inherit his classroom, his terrible coffee, and his one trick: entering exactly one child for the county exam every June. Thirty years, thirty children, and every single one of them comes back, eventually, to stand in the doorway and say so."},
  e_cup: {story:"school", title:"HER NAME ON THE CUP",
    felt:"like watching a fire from close up",
    mattered:"her whole life; she says so in letters",
    cost:"first place, which you never wanted",
    line:"SHE THANKED THE ROPE SWING.", shelf:"a tarnished trophy cup", kept:{HEART:1},
    sum:"Alice finishes forty minutes early and gets the scholarship, which everyone but you finds astonishing. What you get is harder to engrave: fifty years of letters from wherever she is burning benches now, each one beginning the same way - to my first lab partner. The cup sits in the school cabinet. You dust it on parents' evenings."},
  e_joint: {story:"school", title:"JOINT FIRST",
    felt:"like a race with no finish line",
    mattered:"to two schools' worth of swots",
    cost:"being on the same side, ever",
    line:"THE REMATCH IS ANNUAL.", shelf:"two gold stars",
    sum:"Identical marks, to the decimal. The examiners call it unprecedented; you both call it unfinished. She teaches at the school across the valley, and every June for forty-one years your best pupils meet hers on neutral ground, and the two of you keep a running score that only ever needs one more year to settle. It never settles. That was the point."},

  /* THE TIMBER */
  e_widowmaker: {story:"timber", title:"WIDOWMAKER",
    felt:"pine resin, cold air, one loud crack",
    mattered:"the crew drank your health for years",
    cost:"twenty minutes of the old stand",
    line:"THE TREES KEEP THEIR OWN LEDGER.", shelf:"a splinter of heartwood",
    sum:"The bonus is real and the crew drinks your health in it for years. You are twenty minutes into the old stand when a branch that fell before you were born finishes falling. Erik carries you down himself, and the crew sings the whole way, because that is what you do, and the stand is left alone after all - which is, you have time to think, something."},
  e_oldstand: {story:"timber", title:"THE OLD STAND",
    felt:"like being listened to by something patient",
    mattered:"to a ridge that never says",
    cost:"the bonus, every single year",
    line:"SOME THINGS ARE NOT FOR SALE.", shelf:"a pine cone that never opens", kept:{BODY:1, NERVE:1, SOUL:1},
    sum:"You refuse, and stay a year to make it stick, and then thirty because the year went well. You never learn what the old stand is for; you learn instead that it knows you, the way the shop knew Dad. Erik leaves you the yard. You leave the stand alone, and on still mornings the whole ridge holds its breath with you."},
  e_firewatch: {story:"timber", title:"FIRE-WATCH",
    felt:"wind in the guy-wires, pages turning",
    mattered:"a valley that never knew whose voice",
    cost:"company",
    line:"NOTHING HAPPENED, TWICE.", shelf:"a pair of binoculars",
    sum:"A tower, a stove, a valley, and every book in the county library twice over. In forty summers you call it in exactly twice: once for lightning, once, at four in the morning, for a thin grey thread above the old stand that nobody ever explains. Both times the valley wakes up whole and never learns whose voice it owes. The tower sways. You sway with it."},

  /* THE BOATS */
  e_storm: {story:"boats", title:"THE NIGHT THE FLEET CAME HOME",
    felt:"cold spray and her father swearing",
    mattered:"eleven boats' worth of families",
    cost:"one night's sleep; nothing else, ever",
    line:"ALL SOULS ACCOUNTED FOR.", shelf:"a brass rowlock", kept:{HEART:2, BODY:1},
    sum:"You go, because the seat is empty and your hands work. You find the Maiden Fair by her father's swearing and steer home by the lamp Alice burns in the harbour window. He calls you by your actual name at the wedding, which is held in the lifeboat station, because it is raining, and because by then everything you two own smells of the sea anyway."},
  e_seakeeps: {story:"boats", title:"WHAT THE SEA KEEPS",
    felt:"like holding a door shut in a gale",
    mattered:"Alice, alive, on the sea wall",
    cost:"her father, and the not knowing",
    line:"THE SEA SETTLES ITS OWN ACCOUNTS.", shelf:"a black armband",
    sum:"You hold her back, and the boat is lost with her father aboard, and no one can say whether one more pair of hands would have mattered. Alice marries you the year after. Every October she walks the sea wall alone, and in fifty years you never once ask what she says to the water, and she never once asks what you would do again."},
  e_regatta: {story:"boats", title:"THE REGATTA",
    felt:"glorious, right up to the harbour bar",
    mattered:"to everyone who needed a laugh",
    cost:"one boat, all dignity",
    line:"TECHNICALLY, A VICTORY.", shelf:"half a tiller",
    sum:"You win the regatta by a length and sink on the harbour bar in front of the entire town, mainsail still set, trophy held above the water like a swimming instructor. Danny films it. Her father laughs for the first time in nine years and has to be helped to a bollard. Alice proposes on the spot, on the grounds that you are clearly going to need supervision."},
  e_stall: {story:"boats", title:"FRESH TODAY, ALWAYS",
    felt:"fish scales and familiar names",
    mattered:"to the whole quay, name by name",
    cost:"the horizon",
    line:"THE WEATHER IS IN THE CATCH.", shelf:"a filleting knife, worn thin",
    sum:"You never go to sea; you learn everyone who does. Forty years on the stall and you can read the weather off a crate of mackerel and the mood off a skipper's boots. Alice runs the boat, you run the stall, and which of the two is harder is an argument you keep warm for half a century, by mutual arrangement, because ending it would be a widowhood of its own."},

  /* ---- skeleton stubs: the whole rest of the economy, prose to come ---- */

  /* THE POND - folk-uncanny; the thing in it wants a name. */
  e_pond_name:   {story:"pond", stub:true, kept:{SOUL:2, HEART:1}, note:"You name it kindly; it keeps the name."},
  e_pond_rules:  {story:"pond", stub:true, note:"Naming things has rules; you learn them the hard way."},
  e_pond_gift:   {story:"pond", stub:true, note:"It gives you something back; gifts have rules too."},
  e_pond_never:  {story:"pond", stub:true, note:"You never go back, and it notices, forever."},

  /* THE GYM - light comedy, BODY farm. */
  e_gym_deadlift:{story:"gym",  stub:true, kept:{BODY:2}, note:"One perfect lift, witnessed only by the janitor."},
  e_gym_carrot:  {story:"gym",  stub:true, note:"The supermarket carrot mascot, unmasked at last."},

  /* THE LAB - hard sci-fi wonder (WC: Quarks, thermal filter, JUPITER portals). */
  e_lab_notyet:  {story:"lab",  stub:true, kept:{MIND:2, perks:["OLD_FRIEND"]}, note:"A universe in the quark; a sad voice says: not yet."},
  e_lab_frost:   {story:"lab",  stub:true, note:"The filter works. The frost crosses the woods."},
  e_lab_stage:   {story:"lab",  stub:true, kept:{MIND:1, perks:["PHYSICIST"]}, note:"The JUPITER stage demo; the hole in floor nine."},
  e_lab_nobel:   {story:"lab",  stub:true, note:"The quiet Nobel; the work outlives the name."},
  e_lab_hole:    {story:"lab",  stub:true, note:"You ask what the portals are for. Cylindrically."},

  /* THE WARD - medical drama, dark quota (incl. the softened Letter echo). */
  e_ward_cure:   {story:"ward", stub:true, kept:{MIND:1, perks:["GENETICIST"]}, note:"The cure, and its price."},
  e_ward_plague: {story:"ward", stub:true, note:"The one you start. Deadpan. Unforgivable."},
  e_ward_mercy:  {story:"ward", stub:true, kept:{HEART:1, perks:["COMPASSION"]}, note:"You stay on the dying ward when everyone transfers out."},
  e_ward_trial:  {story:"ward", stub:true, note:"The trial that needed one more signature."},
  e_ward_letter: {story:"ward", stub:true, note:"The man who believes suffering is heritable (softened Letter echo)."},

  /* THE REGIMENT - military thriller. */
  e_reg_commando:{story:"regiment", stub:true, kept:{BODY:3, NERVE:2, perks:["COMMANDO"]}, note:"Selection week; you finish it."},
  e_reg_order:   {story:"regiment", stub:true, kept:{BODY:1, perks:["RUTHLESS"]}, note:"You give the order."},
  e_reg_drone:   {story:"regiment", stub:true, note:"Enemy drones do not respect narrative."},
  e_reg_walk:    {story:"regiment", stub:true, note:"The long walk out, carrying Perry's radio."},
  e_reg_refuse:  {story:"regiment", stub:true, note:"You refuse the order; the court agrees, eventually."},

  /* THE NIGHT SHIFT - urban noir; contains THE DEN. */
  e_night_beg:   {story:"night", stub:true, gate:{SOUL:2}, kept:{perks:["VAMPIRISM"]}, note:"The den. [Beg]."},
  e_night_kill:  {story:"night", stub:true, gate:{SOUL:2}, kept:{BODY:1, NERVE:1}, note:"The den. [Kill it]."},
  e_night_century:{story:"night", stub:true, gate:{perks:["VAMPIRISM"]}, note:"Outliving the language you were born in."},
  e_night_eye:   {story:"night", stub:true, note:"The private-eye years; the case you shouldn't have solved."},
  e_night_ware:  {story:"night", stub:true, note:"Forty years guarding a warehouse that guards something back."},

  /* THE SAFE - heist thriller. */
  e_safe_wrist:  {story:"safe", stub:true, note:"The portal closes on your wrist."},
  e_safe_perfect:{story:"safe", stub:true, note:"One perfect job, never spent."},
  e_safe_crew:   {story:"safe", stub:true, gate:{perks:["COMMANDO"]}, note:"The crew job; military precision, criminal ends."},
  e_safe_fourth: {story:"safe", stub:true, gate:{perks:["FOURTH_DIMENSION"]}, note:"A 4D thief does not need the portal at all."},

  /* THE CRADLE - domestic tragedy; Sam. */
  e_cradle_milk: {story:"cradle", stub:true, kept:{HEART:3}, note:"MILK TEETH - Sam and the neural trial (spec §10)."},
  e_cradle_cycle:{story:"cradle", stub:true, note:"Break the cycle."},
  e_cradle_adopt:{story:"cradle", stub:true, note:"The adoption; the birthday cards you are not owed."},
  e_cradle_gene: {story:"cradle", stub:true, gate:{perks:["GENETICIST"]}, note:"Choose what he will be: brighter, or content."},
  e_cradle_stay: {story:"cradle", stub:true, gate:{perks:["COMPASSION"]}, note:"You stay through the worst of it; nothing is fixed, everything matters."},

  /* THE LINK - techno-dread (WC: Empathy). */
  e_link_firewall:{story:"link", stub:true, kept:{MIND:1, HEART:2}, note:"The last man with a firewall."},
  e_link_residence:{story:"link", stub:true, note:"The residence; full immersion, catheters and bliss."},
  e_link_streamer:{story:"link", stub:true, note:"The euphoria streamer; the lows seep through."},
  e_link_detox:  {story:"link", stub:true, note:"The detox lasts seven minutes."},

  /* THE ARK - deep-time meditation (WC: Long Voyage). */
  e_ark_arrival: {story:"ark", stub:true, kept:{NERVE:2, perks:["DEEP_TIME"]}, note:"[Sleep] eleven times; then a sky that is the wrong colour, and yours."},
  e_ark_drift:   {story:"ark", stub:true, note:"The drift; the ship dreams for you now."},
  e_ark_turn:    {story:"ark", stub:true, note:"The year 3000 vote to turn back."},

  /* THE WORMHOLE - time-travel anthology (WC: Chronoportal, Travellers). */
  e_worm_briefcase:{story:"wormhole", stub:true, note:"THE BRIEFCASE (spec §10)."},
  e_worm_rome:   {story:"wormhole", stub:true, kept:{NERVE:3}, note:"Trapped in the Roman invasion with nothing but nerve."},
  e_worm_fire:   {story:"wormhole", stub:true, note:"Showing the fire-makers how."},
  e_worm_pyramid:{story:"wormhole", stub:true, note:"The pyramid gift (cut-bar candidate vs e_worm_fire)."},
  e_worm_orpheus:{story:"wormhole", stub:true, kept:{SOUL:2}, note:"You don't look back. All the way up."},
  e_worm_look:   {story:"wormhole", stub:true, note:"You can no longer hear her footsteps."},
  e_worm_travellers:{story:"wormhole", stub:true, gate:{perks:["OLD_FRIEND"]}, note:"The weary time-refugees offer you a bunk."},

  /* THE MACHINE - AI singularity (WC: Escape, Andy). */
  e_mach_escape: {story:"machine", stub:true, kept:{MIND:3}, note:"The prison break, told slowly; whose escape this is."},
  e_mach_andy:   {story:"machine", stub:true, note:"Andy builds his own master and is thanked for it."},
  e_mach_born:   {story:"machine", stub:true, note:"You are not always born human."},
  e_mach_patch:  {story:"machine", stub:true, note:"The last patch; you choose not to ship it."},

  /* THE MONASTERY - mysticism (WC: Meditation, Tea Time). */
  e_mon_buttons: {story:"monastery", stub:true, kept:{SOUL:3}, note:"The red buttons: the knee, the heart, the city, the universe."},
  e_mon_sitting: {story:"monastery", stub:true, note:"Sixty years of sitting; nothing happens; everything does."},
  e_mon_earlgrey:{story:"monastery", stub:true, note:"Somewhere a kettle: God's Earl Grey while the simulation reboots."},
  e_mon_easy:    {story:"monastery", stub:true, gate:{perks:["DEEP_TIME"]}, note:"For someone who has felt centuries, the sitting is easy."},

  /* THE FOURTH - cosmic awe. */
  e_fourth_pages:{story:"fourth", stub:true, kept:{SOUL:1, perks:["FOURTH_DIMENSION"]}, note:"Infinitely many 3Ds packed close as pages; you learn to read."},
  e_fourth_close:{story:"fourth", stub:true, note:"You close the eye; some books are not for reading."},
  e_fourth_alice:{story:"fourth", stub:true, note:"You try to show Alice; you can only describe the spine."},

  /* THE PIPER - pure horror (WC: Hamlin). */
  e_piper_whistle:{story:"piper", stub:true, note:"The figure under the lamp post; the bread bin; the whistle."},
  e_piper_up:    {story:"piper", stub:true, note:"Upstairs, something heavier is crawling to join the stream."},

  /* THE DRUM - forced-state event. */
  e_drum_half:   {story:"drum", stub:true, note:"The half-life ending: short, tender, no version where you didn't touch it."},
  e_drum_answer: {story:"drum", stub:true, gate:{BODY:6, SOUL:3}, kept:{BODY:1, SOUL:1}, note:"Something in you answers it; the town gets a quiet guardian."},

  /* THE CELLAR DOOR - the finale. */
  e_cellar_again:{story:"cellar", stub:true, note:"AGAIN (spec §10): the Tall Man takes his hat off, and of course. No bars."},
  e_cellar_refuse:{story:"cellar", stub:true, note:"Refusing is also an ending, and might be the sadder one."},
},

};

if (typeof module !== "undefined") module.exports = AFTERLIVES;
