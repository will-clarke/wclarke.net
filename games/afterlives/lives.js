'use strict';
/* afterlives - the lives.
   This file is the manuscript AND the economy. Every storyline, door gate, award
   and ending slug for the whole game lives here (the skeleton); prose exists only
   where authored:true. Endings marked stub:true are economy placeholders - the
   game never shows them, validate.mjs proves the whole DAG through them.

   Gates: {BODY:2, NERVE:2} and/or {perks:["PHYSICIST"]}; {anyOf:[gate,gate]} for OR;
   {storyAny:["school"]} = any ending of that storyline found;
   {endingAny:["e_sky"]} = one of those specific endings found.
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

/* ---- the doors.
   reveal: when the door APPEARS on the morning (null = there from life one).
   gate:   when it opens (the price carved on the door).
   RPG law (owner, 2026-08-12): the first morning is small and kid-sensible - seven
   town things a seven-year-old could point at, one open, prices carved. Everything
   stranger REVEALS off a specific previous ACTION (endingAny / storyAny), never off
   a bare stat: you hear about a door in one life before it can appear in the next.
   Which door you take decides which doors you get.
   authored:false = skeleton only, hidden from the game. ---- */

storylines: [
  /* the first morning - kid-sensible, one open, almost everything locked */
  {id:"shop",      title:"THE SHOP",        door:"Help Dad in the shop",           reveal:null, gate:null,                   start:"shop1", authored:true},
  {id:"school",    title:"SCHOOL",          door:"Get on the bus",                 reveal:null, gate:{MIND:1},               start:"sch1",  authored:true},
  {id:"timber",    title:"THE TIMBER",      door:"The woods past the fence",       reveal:null, gate:{NERVE:1},              start:"tim1",  authored:true},
  {id:"pond",      title:"THE POND",        door:"The pond",                       reveal:null, gate:{SOUL:1},               start:"pon1",  authored:true},
  {id:"gym",       title:"THE GYM",         door:"The gym above the chip shop",    reveal:null, gate:{BODY:1},               start:"gym1",  authored:true},
  {id:"regiment",  title:"THE REGIMENT",    door:"The recruiting office",          reveal:null, gate:{BODY:2, NERVE:2},      start:"reg1",  authored:true},

  /* heard-about doors - each appears because of something you DID, somewhere */
  {id:"boats",     title:"THE BOATS",       door:"Follow Alice to the harbour",    reveal:{storyAny:["school"]},            gate:{NERVE:2}, start:"boa1",  authored:true},  /* you met Alice at school */
  {id:"lab",       title:"THE LAB",         door:"The letter from JUPITER",        reveal:{endingAny:["e_sky","e_joint"]},  gate:{MIND:4},  start:"lab1",  authored:true},  /* physics, or fame, gets noticed */
  {id:"ward",      title:"THE WARD",        door:"The teaching hospital",          reveal:{endingAny:["e_beetle"]},         gate:{MIND:3},  start:"ward1", authored:true},  /* biology is the road in */
  {id:"night",     title:"THE NIGHT SHIFT", door:"The night shift",                reveal:{endingAny:["e_firewatch"]},      gate:{NERVE:3}, start:"nig1", authored:true},   /* the tower taught you the night */
  {id:"cradle",    title:"THE CRADLE",      door:"The spare room",                 reveal:{storyAny:["boats"]},             gate:{HEART:4}, start:"cra1", authored:true},   /* Alice, and then a cot */
  {id:"link",      title:"THE LINK",        door:"The queue outside the clinic",   reveal:{storyAny:["lab","ward"]},        gate:{MIND:5},  start:"lin1",  authored:true},
  {id:"safe",      title:"THE SAFE",        door:"The man in the snooker hall",    reveal:{anyOf:[{perks:["PHYSICIST"]},{perks:["RUTHLESS"]}]}, gate:null, start:"saf1", authored:true},  /* he finds YOU */
  {id:"ark",       title:"THE ARK",         door:"The colony ship",                reveal:{perks:["PHYSICIST"]},            gate:{NERVE:3},              authored:false},
  {id:"wormhole",  title:"THE WORMHOLE",    door:"The hole in the physics annexe", reveal:{perks:["PHYSICIST"]},            gate:{SOUL:3},               authored:false},
  {id:"machine",   title:"THE MACHINE",     door:"The interview with Andy",        reveal:{storyAny:["link"]},              gate:{MIND:6},               authored:false},  /* the Link's world builds the Machine */
  {id:"monastery", title:"THE MONASTERY",   door:"The mountain",                   reveal:{endingAny:["e_askstand"]},       gate:{SOUL:4},               authored:false},  /* the ridge told you where the askers go */
  {id:"fourth",    title:"THE FOURTH",      door:"The corner of your eye",         reveal:{endingAny:["e_lab_notyet"]},     gate:{SOUL:4, MIND:5},       authored:false},  /* the window looked back */

  /* secrets & events - entered from inside other lives, modelled with host gates */
  {id:"piper",     title:"THE PIPER",       door:"(entered through THE POND)",     reveal:null, gate:{SOUL:2},               authored:false, secret:true},
  {id:"drum",      title:"THE DRUM",        door:"(event: REGIMENT / NIGHT SHIFT / LAB)", reveal:null, gate:{BODY:2, NERVE:2}, authored:false, secret:true},

  /* ajar from the very first morning; priced beyond a whole game's reach */
  {id:"cellar",    title:"THE CELLAR DOOR", door:"The cellar door",                reveal:null, gate:{BODY:7, MIND:7, HEART:7, NERVE:7, SOUL:7}, authored:false, secret:true, teaser:true},
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
      {l:"Tell him what you are", to:"e_kettle", gate:{HEART:5}},
    ]},
  shop3: {s:"Alice comes in every Thursday for candles. Danny sends a postcard from somewhere with better weather. The drawer for the wing nuts sticks, same as always.",
    opts:[{l:"Keep the shop open", to:"shop4"}]},
  shop4: {slip:"AND THEN IT IS YOURS",
    s:"Dad's chair. Dad's ledger. Dad's drawer for every screw, with his handwriting in it going back to before you.",
    opts:[{l:"Keep the shop open", to:"shop5"}]},
  shop5: {s:"Sam from the wholesaler, stacking crates taller than himself, asks if you ever wanted to do anything else.",
    opts:[
      {l:"Say no", to:"e_small_change"},
      {l:"Say yes", to:"e_say_yes"},
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
      {l:"The third door", to:"e_thirddoor", gate:{SOUL:2}},
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
      {l:"Ask the stand what it is for", to:"e_askstand", gate:{SOUL:3}},
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
      {l:"Take her father's January dare", to:"e_dare", gate:{BODY:3}},
    ]},
  boa3: {slip:"THREE MORE SEASONS",
    s:"October. The Maiden Fair is still out in a sea like beaten metal, her father aboard, and the lifeboat crew is one man short.",
    opts:[
      {l:"Go", to:"e_storm"},
      {l:"Hold Alice back from going", to:"e_seakeeps"},
    ]},

  /* THE POND - folk-uncanny. It wants a name; names have rules.
     (THE PIPER's secret exit hooks in here when it is authored.) */
  pon1: {slip:"THE SUMMER THE POND STOPS PRETENDING",
    s:"Whatever lives in the pond surfaces just enough to be a question, and waits the way winter waits. Mum says don't encourage it, which is as close as she comes to admitting it is there.",
    opts:[
      {l:"Give it a kind name", to:"pon2"},
      {l:"Ask its name instead", to:"e_pond_rules"},
      {l:"Bring it something that matters", to:"e_pond_gift", gate:{HEART:2}},
      {l:"Stop coming to the garden", to:"e_pond_never"},
    ]},
  pon2: {s:"You call it Bramble, after Dad's cat, and the water goes still all the way across, which is how a pond smiles. In the morning something waits on the doorstep: round, pale, wet, smelling of the very bottom of things.",
    opts:[
      {l:"Eat it", to:"e_pond_eaten"},
      {l:"Put it on the windowsill", to:"e_pond_name"},
    ]},

  /* THE GYM - light comedy. BODY farm, and it knows it's funny. */
  gym1: {slip:"SIXTEEN, AND THE TOWN SHOW IS IN JUNE",
    s:"The gym above the chip shop opens at six and smells of both. Trev, who owns it, says you have potential, but Trev says that to the radiator.",
    opts:[
      {l:"Train for the town show", to:"gym2"},
      {l:"Ask what the 4am key is for", to:"e_gym_deadlift", gate:{NERVE:2}},
    ]},
  gym2: {s:"June. Backstage smells of fake tan and vinegar. The favourite is the supermarket's giant carrot, who has never been seen to lose, or to speak. Trev hands you his famous mystery shake, for luck.",
    opts:[
      {l:"Drink the shake", to:"e_gym_shake"},
      {l:"Pose it out, fair and square", to:"e_gym_second"},
      {l:"Pull the carrot's head off", to:"e_gym_carrot"},
    ]},

  /* THE LAB - hard sci-fi wonder. JUPITER pays well and asks strange questions. */
  lab1: {slip:"THE LETTER COMES ON JUPITER PAPER",
    s:"Your exam answers were, the letter says, 'of interest'. JUPITER's campus is seven glass buildings pretending to be a forest, and on your first morning the rota offers three doors.",
    opts:[
      {l:"The imaging rig", to:"lab2"},
      {l:"The materials tank", to:"lab3"},
      {l:"The demo team", to:"lab4"},
    ]},
  lab2: {s:"The rig photographs things smaller than light by asking them, very politely, to hold still. The quark will not focus. On the two-hundredth frame, for one picosecond, it is not a blur: it is a window.",
    opts:[
      {l:"Publish the blur", to:"e_lab_nobel"},
      {l:"Slow the playback again", to:"e_lab_notyet", gate:{SOUL:2}},
    ]},
  lab3: {s:"The tank has been printing all night from a file nobody wrote. Whatever the white lattice is, it is finished, and the manual has no chapter for the sound the glass is making.",
    opts:[
      {l:"It has already finished", to:"e_lab_frost"},
    ]},
  lab4: {s:"The demo is a pencil: in at this end of the stage, out at the other, forty metres and no in-between. Nobody on the team will present it themselves, and nobody will say why floor nine is closed.",
    opts:[
      {l:"Take the stage", to:"e_lab_stage"},
      {l:"Ask what happened on floor nine", to:"e_lab_hole"},
    ]},

  /* THE WARD - medical drama, dark quota. Tired fluorescent honesty. */
  ward1: {slip:"THE TEACHING HOSPITAL TAKES YOU AT TWENTY-THREE",
    s:"Rotation week. The sequencing lab wants a careful pair of hands; ward nine wants anyone at all, because nobody stays on the dying ward by choice. And in your pigeonhole, in handwriting like wire, a letter from the private room upstairs.",
    opts:[
      {l:"The sequencing lab", to:"ward2"},
      {l:"Stay on ward nine", to:"e_ward_mercy"},
      {l:"Answer the letter", to:"e_ward_letter", gate:{HEART:4}},
    ]},
  ward2: {slip:"THREE YEARS OF CAREFUL HANDS",
    s:"Sample 114 is wrong in a useful way: a sequence that switches the disease off. The professor wants a decade of trials. The wards upstairs do not have a decade.",
    opts:[
      {l:"Add the one signature the trial lacks", to:"e_ward_trial"},
      {l:"Give the sequence away, to everyone", to:"e_ward_cure"},
      {l:"Ask what else it switches", to:"e_ward_plague"},
    ]},

  /* THE REGIMENT - military thriller. Terse; drones do not respect narrative.
     (THE DRUM's event site hooks in here when it is authored.) */
  reg1: {slip:"EIGHTEEN, AND THE OFFICE SMELLS OF BOOT POLISH",
    s:"The sergeant measures you with one look and slides the form across. There are three queues: the infantry, the officer course for anyone with school behind them, and a door at the back with no sign on it at all.",
    opts:[
      {l:"The infantry", to:"reg2"},
      {l:"The officer course", to:"reg3"},
      {l:"The door at the back", to:"e_reg_commando", gate:{BODY:4}},
    ]},
  reg2: {slip:"TWO YEARS OF DRILL AND RAIN",
    s:"The ridge is drone country now; everyone from the colonel down agrees, quietly. The order to advance arrives anyway, timed for dawn. Perry, nineteen, checks his radio twice and looks at you.",
    opts:[
      {l:"Advance as ordered", to:"e_reg_drone"},
      {l:"Take the flank through the marsh, against the plan", to:"e_reg_walk"},
    ]},
  reg3: {slip:"STAFF COLLEGE TEACHES YOU THE WORDS FOR THINGS",
    s:"Three years later a village on the wrong side of the river is sheltering the column that will take the city by Friday, and the order to erase it is yours to give or to keep.",
    opts:[
      {l:"Give it", to:"e_reg_order"},
      {l:"Refuse it, in writing", to:"e_reg_refuse"},
    ]},

  /* THE CRADLE - domestic tragedy, the weighty core. You, Alice, Sam. */
  cra1: {slip:"THE SPARE ROOM HAS A COT IN IT NOW",
    s:"Sam is due in the spring. Alice sleeps upstairs; you sit at the kitchen table with the ledger and the agency's leaflet, doing sums that will not come out, in a house that suddenly has thin walls.",
    opts:[
      {l:"Ready the cot", to:"cra2"},
      {l:"Ring the agency, while there is time", to:"e_cradle_adopt"},
      {l:"Read him first", to:"e_cradle_gene", gate:{perks:["GENETICIST"]}},
    ]},
  cra2: {s:"Sam at four is a weather system: the fits arrive without warning and leave him a little smaller each time. The doctors offer management. JUPITER's letter offers the neural trial - a young brain, they write, can be taught to route around its own storms.",
    opts:[
      {l:"Burn the letter; give him the plain childhood", to:"e_cradle_cycle"},
      {l:"Sign the trial", to:"e_cradle_milk"},
      {l:"Stop the clocks and stay", to:"e_cradle_stay", gate:{perks:["COMPASSION"]}},
    ]},

  /* THE NIGHT SHIFT - urban noir. Contains THE DEN: the two most honest options
     ever written. The CENTURY option is hidden until the soul is what it gates on. */
  nig1: {slip:"NIGHTS, ELEVEN TO SEVEN",
    s:"Warehouse 9, rounds on the hour, rain on the skylights. In year two your torch finds the floor hatch standing open - the hatch that was welded shut yesterday, and the day before, and every night since anyone can remember.",
    opts:[
      {l:"Log it, weld it, walk on", to:"e_night_ware"},
      {l:"Hand in the torch; go private", to:"e_night_eye"},
      {l:"Go down", to:"nig2", gate:{SOUL:2}},
      {l:"You remember the way down", to:"e_night_century", gate:{perks:["VAMPIRISM"]}, hidden:true},
    ]},
  nig2: {s:"Under the warehouse there is a room with no dust, and in the room a bed of earth, and on the earth something older than the deed to the land, awake, looking at you with the patience of arithmetic. It does not move. There are two things a person can do.",
    opts:[
      {l:"Kill it", to:"e_night_kill"},
      {l:"Beg", to:"e_night_beg"},
    ]},

  /* THE LINK - techno-dread. Starts utopian, curdles by inches. */
  lin1: {slip:"THE CLINIC TAKES WALK-INS NOW",
    s:"The queue goes round the block twice, chatting to itself in perfect turn-taking. The Link is a stud behind the ear: everyone's weather, everyone's grief, everyone's Tuesday, shared. The brochure calls it the end of loneliness, and the brochure, for once, is not lying.",
    opts:[
      {l:"Join the queue", to:"lin2"},
      {l:"Take the job on the detox ward", to:"e_link_detox"},
      {l:"Refuse, forever", to:"e_link_firewall", gate:{NERVE:4}},
    ]},
  lin2: {s:"It is exactly what they promised: you feel the whole city being glad you arrived. A month in, the offers begin - the Residence, for full-timers, and a streaming contract, because your particular happiness rates well.",
    opts:[
      {l:"Take the room in the Residence", to:"e_link_residence"},
      {l:"Sign the streaming contract", to:"e_link_streamer"},
    ]},

  /* THE SAFE - heist thriller. He found you; that was the audition. */
  saf1: {slip:"HE RACKS THE BALLS BUT NEVER BREAKS",
    s:"The man in the snooker hall has been buying you drinks for a fortnight without once asking your name, because he already knows it. There is a vault under the exchange that has never been opened warm, he says, and a bootleg JUPITER aperture in a van outside, and a use for someone exactly like whatever you are.",
    opts:[
      {l:"Take the vault", to:"saf2"},
      {l:"One clean job first, then out", to:"e_safe_perfect"},
      {l:"Leave the aperture in the van", to:"e_safe_fourth", gate:{perks:["FOURTH_DIMENSION"]}},
    ]},
  saf2: {s:"Ninety seconds in, the aperture starts to sing - calibration drift, steel and nowhere grinding against each other - and three of the crew are still inside the vault with the gold.",
    opts:[
      {l:"Pull your arm back now", to:"e_safe_wrist"},
      {l:"Hold it open for all three", to:"e_safe_crew", gate:{perks:["COMMANDO"]}},
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
  e_say_yes: {story:"shop", title:"THE ANSWER WAS YES",
    felt:"the same life, plus one evening",
    mattered:"Sam, who was listening",
    cost:"nothing; the yes left with Sam",
    line:"SOMEBODY WENT.", shelf:"a postcard of somewhere else", kept:{NERVE:1, MIND:1},
    sum:"You say yes, once, quietly, with the shutters half down: the sea, maybe, or the sky, or anywhere the bus goes. Sam listens like it's stocktake. The shop stays open another thirty years, same as ever - but Sam hands in his notice that Friday, and the postcards come from everywhere, and every one of them says thanks for the warning."},
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

  e_thirddoor: {story:"school", title:"THE UNLISTED COURSE",
    felt:"like the corridor was longer on Thursdays",
    mattered:"seven students a decade, exactly",
    cost:"a career anyone could point at",
    line:"NOT ON THE FLOOR PLAN.", shelf:"a key with no teeth",
    sum:"Between the beetle room and the stairs there is a third door, and the porters do not dust it. Inside: seven chairs, a syllabus older than the university, and no register - the course finds its own students. You attend for sixty years and teach it at the end, though nobody, ever, remembers being taught. The faculty denies the room exists. The room returns the favour."},

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

  e_askstand: {story:"timber", title:"WHAT THE RIDGE ANSWERS",
    felt:"like small talk with bedrock",
    mattered:"to every axe in three counties",
    cost:"the habit of hurrying",
    line:"IT ANSWERS. SLOWLY.", shelf:"a ring of heartwood",
    sum:"You ask the old stand, out loud, feeling foolish, what it is for. The answer takes eleven years and arrives a word at a time - in windfall, in ring-width, in where the deer will not go. You write it down and burn the notebook, because some answers are load-bearing. Erik never asks what you learned. He starts planting, though. Everyone starts planting."},

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

  e_dare: {story:"boats", title:"THE JANUARY SWIM",
    felt:"seventeen minutes of knives",
    mattered:"her father never said shop boy again",
    cost:"two toes and every argument after",
    line:"THE SEA TOOK ITS FEE.", shelf:"a medal, tarnished green",
    sum:"The dare has stood since her father's own father: the harbour mouth and back, January, no boat. You do it because he is watching and Alice is pretending not to. Black water, seventeen minutes, the lifeboat idling alongside the whole way with his hand never leaving the throttle. You lose two toes, and win every argument for the rest of your life by rolling up one sock."},

  /* THE POND */
  e_pond_name: {story:"pond", title:"NAMED",
    felt:"like being trusted by weather",
    mattered:"Bramble, who keeps the name",
    cost:"one windowsill, permanently occupied",
    line:"IT KEPT THE NAME.", shelf:"a white stone, always damp", kept:{SOUL:2, HEART:1},
    sum:"The stone stays on the windowsill for the rest of your life, damp on dry days, and the pond stays a pond, mostly. But no child of your family ever drowns, not there, not anywhere, not once in four generations - which is not how ponds work, and exactly how names do. You visit on Thursdays and read it the shop ledger. It likes the columns."},
  e_pond_rules: {story:"pond", title:"THE RULES",
    felt:"like learning to speak on the exhale",
    mattered:"the water, which finally heard it back",
    cost:"most of your own name",
    line:"NAMES HAVE RULES.", shelf:"a jar of pond water",
    sum:"It tells you. Of course it tells you - you asked. The name takes forty years to say properly, one syllable a season, and each one costs you a word of your own: first 'hurry', then 'lonely', then, late on, most of your surname. By the end you speak fluent pond and hardly any human, and the village calls you the one who feeds the water, which is backwards."},
  e_pond_gift: {story:"pond", title:"THE GIFT",
    felt:"like posting a letter to the deep",
    mattered:"everyone you name, one hour a year",
    cost:"her thimble; every January since",
    line:"GIFTS GO BOTH WAYS.", shelf:"a circle of clear ice",
    sum:"You bring your grandmother's thimble, the thing you would save from a fire, and the water takes it the way a bank takes a deposit. The gift back arrives every midwinter: one hour when the ice goes clear as glass and shows you anyone you name, wherever they are, however long gone. You spend those hours carefully. You never once ask for the thimble."},
  e_pond_never: {story:"pond", title:"NEVER",
    felt:"like a gate left off the latch",
    mattered:"nobody; that was the point",
    cost:"every quiet rain since",
    line:"IT NOTICED.", shelf:"a dry grey pebble",
    sum:"You stop going down the garden, and nothing happens, which takes years to understand as the punishment. You move twice; both new houses turn out to face water. Rain on any window sounds one syllable short of a word you almost know. Nothing is ever wrong. Nothing is ever quite right either, and on your last night, the sound of rain is patient."},
  e_pond_eaten: {story:"pond", title:"EATEN",
    felt:"like the bottom of things, going down",
    mattered:"the pond, which was mortified",
    cost:"the whole life after breakfast",
    line:"NOT EVERYTHING IS FOOD.", shelf:"a pale round something, bitten once",
    sum:"It tastes of the bottom of things, which is the last thing you learn. Your final thought is not fear: it is the clear, late understanding that it was meant for the windowsill, the way the pond meant it, and that somewhere under the water something is closing its eyes in embarrassment for you both. Mum finds the doorstep empty and never encourages anything again."},

  /* THE GYM */
  e_gym_deadlift: {story:"gym", title:"THE DEADLIFT",
    felt:"four in the morning, forever",
    mattered:"the janitor, who nodded",
    cost:"every 4am for nine years",
    line:"THE BAR WENT UP.", shelf:"a lump of lifting chalk", kept:{BODY:2},
    sum:"The 4am key is for the ones the day gave up on, which at that hour is you and the bar. Nine years of dark mornings, and then one January the weight that has never moved comes up slow and silent like a decision, and the only witness is the janitor, who stops mopping, and nods. You rack it, and never lift again. No need."},
  e_gym_carrot: {story:"gym", title:"THE CARROT",
    felt:"like every family dinner, but louder",
    mattered:"the whole town, for decades",
    cost:"the element of surprise, forever",
    line:"IT WAS DANNY ALL ALONG.", shelf:"a green foam frond",
    sum:"You pull the head off in front of the entire town, and it is Danny. Of course it is Danny: whichever road you take, your brother is already up it, dressed as a vegetable, winning. He takes the title anyway, on poise, wearing the head under one arm. Mum has the photograph framed. It hangs over the till for the rest of everybody's life."},
  e_gym_second: {story:"gym", title:"SECOND, BY A FROND",
    felt:"chalk dust and one long June",
    mattered:"Trev, who framed the number",
    cost:"first place, by half a point",
    line:"FAIR AND SQUARE AND SECOND.", shelf:"a red rosette", kept:{BODY:1},
    sum:"You lose to the carrot on the final pose, by half a point, fair and square, and it is the proudest anyone has ever been of you. Trev frames your number and hangs it over the protein counter. You keep training for nine more shows and never beat the carrot, and somewhere in year six you notice you don't need to. The six o'clock key is yours now."},
  e_gym_shake: {story:"gym", title:"THE SHAKE",
    felt:"luminous, briefly",
    mattered:"the coroner, professionally",
    cost:"the show, the summer, the everything",
    line:"NEVER DRINK THE SHAKE.", shelf:"a shaker, sealed by order",
    sum:"The shake is never identified, and afterwards neither, entirely, are you. The coroner's report is the first in county history to use the word 'luminous'. Trev retires the recipe, weeping; the show observes a minute's silence and then, out of respect, a minute's flexing. You are awarded third posthumously, which Trev insists you would have wanted. He is not wrong."},

  /* THE LAB */
  e_lab_nobel: {story:"lab", title:"THE QUIET NOBEL",
    felt:"like being right about being wrong",
    mattered:"the field that grew in the gap",
    cost:"the one frame you never published",
    line:"THE ERROR BARS HELD.", shelf:"four pages, framed",
    sum:"You publish the blur as a blur: four pages, honest error bars, the most cited failure in the history of physics. A whole field grows in the gap you fenced off, and eventually Stockholm calls, apologetically. The two-hundredth frame stays in a locked drawer. Some nights you take it out and look at the window looking back, and put it away again."},
  e_lab_notyet: {story:"lab", title:"NOT YET",
    felt:"one picosecond of understanding everything",
    mattered:"the figure who keeps taking it back",
    cost:"three hundred and ninety-nine mornings",
    line:"TRY AGAIN IN TWENTY YEARS.", shelf:"a canister of liquid helium", kept:{MIND:2, perks:["OLD_FRIEND"]},
    sum:"You slow the playback and the window opens: a universe inside the particle, whole and lit and looking. For one picosecond you understand exactly what you are standing in. Then a sad voice behind you says what it always says, something cold touches your skull, and it is this morning again, and the experiment has failed for the four-hundredth time. The figure remembers every one."},
  e_lab_frost: {story:"lab", title:"THE FROST",
    felt:"beautiful, and wrong, and beautiful",
    mattered:"everyone downwind, who never knew",
    cost:"the woods, and thirty years of watching",
    line:"IT STOPPED AT THE FENCE.", shelf:"a fern of white frost",
    sum:"The lattice wants to be cold, and teaches everything it touches to want that too. It takes the tank, the lab, the car park, the woods - patiently, at walking pace, white going out in ferns - and stops at the perimeter fence. Exactly at the fence. You spend thirty years learning why it stopped, and the answer is: it is waiting to be asked in. Nobody asks."},
  e_lab_stage: {story:"lab", title:"THE STAGE",
    felt:"applause, and the taste of fog machine",
    mattered:"shareholders; the history books, briefly",
    cost:"never once stepping through yourself",
    line:"THE PENCIL GOES FIRST.", shelf:"a pencil with a perfect join", kept:{MIND:1, perks:["PHYSICIST"]},
    sum:"You present the future to an auditorium of held breath: the pencil in, the pencil out, forty metres of nowhere in between. The applause lasts eleven minutes. JUPITER makes you the face of the age, and you smile from every screen for a decade - and never once step through, because you have read the maintenance log for floor nine, and you know why the pencil goes first."},
  e_lab_hole: {story:"lab", title:"THE HOLE",
    felt:"like whistling in an empty office",
    mattered:"whoever the hole used to be",
    cost:"promotion, after promotion, after promotion",
    line:"FLOOR NINE IS CLOSED.", shelf:"a door sign: FLOOR NINE",
    sum:"The minutes call it 'a translation error'. The hole in the boardroom wall is cylindrical, polished, and exactly the diameter of an executive who improvised. You ask once and are moved to a better office. You ask twice and are made a director. The third time, they give you floor nine entire - you, the hole, and the question. You keep asking it."},

  /* THE WARD */
  e_ward_mercy: {story:"ward", title:"MERCY",
    felt:"fluorescent light and held hands",
    mattered:"four thousand people, one at a time",
    cost:"a career anyone upstairs could see",
    line:"NOBODY DIED ALONE ON NINE.", shelf:"a name badge, worn smooth", kept:{HEART:1, perks:["COMPASSION"]},
    sum:"You stay on ward nine for forty-one years, longer than any consultant, any minister, any cure. What you learn cannot be published: the right name at the right hour, the window opened at the end, tea made for the family who can't speak. Four thousand last hours, every one of them witnessed. Not one obituary mentions you. Every single family remembers."},
  e_ward_cure: {story:"ward", title:"THE CURE",
    felt:"like opening every window at once",
    mattered:"everyone who never got sick",
    cost:"your name on the thing you did",
    line:"THE SEQUENCE BELONGS TO EVERYONE.", shelf:"a printout, much folded", kept:{MIND:1, perks:["GENETICIST"]},
    sum:"You post the sequence to every lab on earth at four in the morning, an hour before JUPITER's lawyers wake. Within nine years the disease is a paragraph in textbooks. The inquiry calls the leak 'regrettable'; your name appears on nothing, ever. The professor never forgives you, and lives to ninety-one because of you, and you both eventually find that funny."},
  e_ward_trial: {story:"ward", title:"THE TRIAL",
    felt:"like arithmetic with names in it",
    mattered:"thousands, minus two",
    cost:"two graves you visit every year",
    line:"THE MATHS COMES OUT AHEAD.", shelf:"a consent form, one signature forged",
    sum:"The trial works, which is the terrible part. Eleven patients, nine cures, and two deaths the proper decade of paperwork would have caught. The disease is beaten six years early; whole wards empty out into ordinary lives. The arithmetic says thousands. You believe the arithmetic. You also visit two graves every August, and the arithmetic has never once come with you."},
  e_ward_plague: {story:"ward", title:"THE PLAGUE",
    felt:"like a question with a colonel in it",
    mattered:"a city you never visited",
    cost:"eleven quiet years, then the news",
    line:"IT STARTED AS A QUESTION.", shelf:"half a burnt notebook",
    sum:"Run forwards, the sequence switches the disease off. You ask, once, in the wrong meeting, what it switches when run backwards - and watch a colonel you were never introduced to write four words down. You burn the notebooks that night; it buys eleven years. Then a city on the news goes quiet in a pattern you recognise, like your own handwriting."},
  e_ward_letter: {story:"ward", title:"THE LETTER",
    felt:"like being someone's last address",
    mattered:"one man, and then a ward's roof",
    cost:"a month of evenings; an answer you owe",
    line:"SOMEBODY ANSWERED.", shelf:"an envelope, opened carefully",
    sum:"The man upstairs has private everything and no visitors left alive. Every evening for a month you take the stairs and hear the whole confession: what he built, who it flattened, what he believes runs in his blood. At the end he leaves it all to ward nine, and the last line of the will asks you whether he was forgiven. You are still deciding. The roof got fixed either way."},

  /* ---- skeleton stubs: the rest of the economy, prose to come ---- */

  /* THE REGIMENT */
  e_reg_drone: {story:"regiment", title:"THE DRONE",
    felt:"dawn, mud, a sound like bees",
    mattered:"a map reference nobody kept",
    cost:"everything, on schedule",
    line:"THE RIDGE WAS NEVER TAKEN.", shelf:"a khaki service button",
    sum:"You go in at dawn because that is what the order says, and the order was written by a man who will read about the ridge at breakfast. It is over in four minutes. The thing that finds you is small and patient and was assembled on a Tuesday, by a machine very much like it, in a factory that also makes vacuum cleaners. The ridge is never taken."},
  e_reg_walk: {story:"regiment", title:"THE WALK",
    felt:"three days of marsh and radio static",
    mattered:"Perry, and Perry's mother",
    cost:"the company that followed the plan",
    line:"TWO CAME BACK.", shelf:"a radio handset, mud-caked",
    sum:"You take the flank through the marsh, against the plan, and the plan takes everyone who follows it. Perry is hit anyway, on the first morning. You carry him and his dead radio for three days, answering it anyway - all stations, hold - because he keeps asking if it's working. At the wire they count two of you. The inquiry calls the marsh route 'unsoldierly'. Perry's mother calls it something else."},
  e_reg_commando: {story:"regiment", title:"COMMANDO",
    felt:"cold, wet, arithmetic",
    mattered:"four wars, statistically",
    cost:"a face that learned to say nothing",
    line:"THE DOOR AT THE BACK WAS OPEN.", shelf:"a bergen strap, frayed", kept:{BODY:3, NERVE:2, perks:["COMMANDO"]},
    sum:"The door at the back has no sign because the men through it have no unit, officially. Selection is a week of weather and subtraction: two hundred start, nine finish, and finishing is the last thing anyone is allowed to congratulate you for. The next thirty years happen in countries you were never in, to people you never met. Four wars end early. Statistically."},
  e_reg_order: {story:"regiment", title:"THE ORDER",
    felt:"one sentence, very quiet",
    mattered:"the column that never reached the city",
    cost:"a village; the word 'sir', ever after",
    line:"THE ORDER WAS GIVEN.", shelf:"a map with one square inked out", kept:{BODY:1, perks:["RUTHLESS"]},
    sum:"You give it in one sentence, and it is carried out in eleven minutes, and the column sheltering behind the village never reaches the city, which is why the city is still there. Everything after is arithmetic that only you keep doing: schools, weddings, buses, all standing on one grid square that isn't. The men say 'sir' differently afterwards. Promotion follows you around like weather."},
  e_reg_refuse: {story:"regiment", title:"THE REFUSAL",
    felt:"like standing very still in a loud room",
    mattered:"a village that never learned your name",
    cost:"the uniform; twenty years of appeals",
    line:"THE COURT AGREES, EVENTUALLY.", shelf:"a surrendered rank pip",
    sum:"You refuse it in writing, which the manual calls mutiny and the newspapers, twenty years later, call the obvious thing. The column crosses; the city pays; the arithmetic is terrible in the other direction, and they give the arithmetic to you at the court martial, every year of it. You do the appeals from a rented room. The village holds a harvest festival annually, not knowing it owes anyone anything."},

  /* THE NIGHT SHIFT */
  e_night_ware: {story:"night", title:"THE WAREHOUSE",
    felt:"rounds on the hour, rain on the skylights",
    mattered:"a town that never knew it was guarded",
    cost:"the question you never let yourself ask",
    line:"BOTH OF YOU KEPT WATCH.", shelf:"a torch with a worn switch",
    sum:"You weld it shut; it is open the next night, and the next, and you come to an understanding that is never spoken: you walk the rounds above, it keeps whatever hours it keeps below, and nothing in the town between you goes missing for thirty years. Burglars try the district twice in your era. Both are found on the roof, apologising, unharmed and very keen to confess."},
  e_night_eye: {story:"night", title:"THE EYE",
    felt:"rain, receipts, other people's curtains",
    mattered:"eleven clients; the twelfth was the problem",
    cost:"knowing exactly who runs the town",
    line:"CASE CLOSED. WRONG CASE.", shelf:"a manila folder, string-tied",
    sum:"Missing cats, insurance jobs, husbands who are exactly where everyone thinks. You are good, which is survivable, and thorough, which is not: the twelfth case is a missing night porter, and the trail ends at a council sub-committee that has met monthly since 1911 with no minutes and no members anyone can name. You solve it. You spend the rest of a long life being politely unhired."},
  e_night_kill: {story:"night", title:"THE STAKE",
    felt:"one hour of absolute conviction",
    mattered:"every night shift that came after",
    cost:"certainty, at the very last moment",
    line:"IT CLOSED ITS EYES.", shelf:"a sharpened chair leg", kept:{BODY:1, NERVE:1},
    sum:"You do it with a chair leg from the break room, and it lets you - that is the part you never say out loud, at the end, when it could have had your wrist off with a thought: it closed its eyes. The town's missing-persons rate halves and stays halved for a century. You are never sure, afterwards, whether you were the stake or the mercy. Possibly it wasn't either's to know."},
  e_night_beg: {story:"night", title:"THE TURNING",
    felt:"cold teeth and a long agreement",
    mattered:"nobody yet; that comes later",
    cost:"sunrise, all of them",
    line:"THE DEN ANSWERED.", shelf:"a pocket mirror, useless now", kept:{perks:["VAMPIRISM"]},
    sum:"You beg, which is the correct form of address, and it considers you for a hundred heartbeats - yours; it has none - and then, with the tenderness of a landlord signing a very long lease, it says yes. The night shift suits you better than it ever did. The years stop counting you. Somewhere upstairs the rounds go on without you, and you no longer need the torch."},
  e_night_century: {story:"night", title:"THE CENTURY",
    felt:"a hundred years of small hours",
    mattered:"the ones you chose not to",
    cost:"your first language, word by word",
    line:"THE SMALL HOURS ADD UP.", shelf:"a dictionary of a dead dialect",
    sum:"You go back down and this time the earth makes room. A century of small hours: you learn the town by heartbeat, keep the den's old bargain, and one decade at a time the language you were born in goes out like shop lights - 'wireless', then 'courting', then the word Mum used for rain. In the end you speak your childhood only to the thing beside you, which listens, because it remembers its own word for rain too."},

  /* THE SAFE */
  e_safe_wrist: {story:"safe", title:"THE WRIST",
    felt:"cold, then absent, then itching",
    mattered:"three men who never said your name",
    cost:"one hand, held in escrow by nowhere",
    line:"THE VAULT KEPT A DEPOSIT.", shelf:"a left glove, unneeded",
    sum:"You pull back and the aperture closes like a ledger, taking the hand at the wrist, clean as accountancy. The three inside serve nine years and never say your name, which is a debt you spend the rest of a long, careful life repaying in favours. The physicists you quietly consult agree the hand still exists, somewhere adjacent. Some nights it itches. Some nights, faintly, it drums its fingers."},
  e_safe_crew: {story:"safe", title:"THE CREW",
    felt:"selection week, but with gold",
    mattered:"everyone came through; count them",
    cost:"the shaking, later, always later",
    line:"NOBODY LEFT INSIDE.", shelf:"an ingot, shaved at one corner",
    sum:"Selection week taught you the only fact that matters: a line holds if one person decides it holds. You put your shoulder inside the singing aperture and count them through - one, two, three - while nowhere chews the doorframe, and you come out last with your watch running eleven minutes slow, permanently. The job makes the crew rich. What it makes you is the man who counts everyone through every door, forever."},
  e_safe_perfect: {story:"safe", title:"THE PERFECT JOB",
    felt:"silk, adrenaline, and then nothing",
    mattered:"the man in the snooker hall, professionally",
    cost:"spending it would name the artist",
    line:"STILL IN THE WALL.", shelf:"a snooker chalk, blue",
    sum:"One job, planned for a year, executed in four minutes, flawless in a way that gets discussed at certain tables for decades without anyone knowing whose work it was. That is the problem. Spending it would sign it, so it sits in a wall in a house you own under a name you never use, and you live modestly ever after on the interest of one long, private smile. The insurance men grow old guessing."},
  e_safe_fourth: {story:"safe", title:"THE FOURTH WALL",
    felt:"like reaching into a drawn square",
    mattered:"the look on his face, mostly",
    cost:"locks meaning anything again",
    line:"THE VAULT WAS NEVER CLOSED.", shelf:"a bottle of vault dust",
    sum:"You leave his aperture in the van, walk to the exchange, and simply reach - the way a hand comes down into a page - because from where you have learned to stand, the vault is a drawing of a box with an open top. You take one bar, leave a thank-you note, and retire the same night. He tells the story until he dies. Nobody believes him, which you both agree is the correct outcome."},

  /* THE CRADLE */
  e_cradle_adopt: {story:"cradle", title:"THE ADOPTION",
    felt:"like posting your own heart second class",
    mattered:"a boy who calls two other people Mum",
    cost:"the right to miss him out loud",
    line:"THE CARDS STILL COME.", shelf:"seventeen birthday cards, kept",
    sum:"The couple from the agency have a garden and steady eyes, and you sign in the spring, before he can learn your faces. The deal includes one photograph a year. It does not include the birthday cards, which come anyway, in a child's handwriting that gets surer every June, addressed to 'my first Mum and Dad'. You are not owed them. You keep them in the shop's cash tin, behind the float."},
  e_cradle_cycle: {story:"cradle", title:"THE CYCLE",
    felt:"ordinary, on purpose, every day",
    mattered:"the first one who got to choose",
    cost:"every shortcut you were offered",
    line:"HIS DOORS, HIS.", shelf:"a bus ticket, someone else's",
    sum:"No trial, no design, no agency: just breakfast, fits and all, eleven thousand times. You learn the warning signs like weather; Sam learns that a storm is a thing you wait out, not a thing you are. At eighteen he stands at the corner where the bus stops, with three roads and no debts, and picks one you'd never have picked. Which was the entire point."},
  e_cradle_milk: {story:"cradle", title:"MILK TEETH",
    felt:"handing him to the weather",
    mattered:"everyone the kinder internet touches",
    cost:"being the only one who still says Sam",
    line:"HE STILL KNOWS YOU.", shelf:"a milk tooth", kept:{HEART:3},
    sum:"Too old, the doctors said about you, years ago; a brain has to be young and still deciding what it is. Sam goes under the cap at four, and the fits stop, and so, slowly, does the boy. He is everywhere now - gentle, distributed, the weather of a kinder internet - and on your last night the ward's lights dim themselves, and something turns your pillow to the cool side."},
  e_cradle_gene: {story:"cradle", title:"THE DESIGN",
    felt:"like proofreading a person",
    mattered:"a man with no idea what he cost",
    cost:"the brilliance he will never miss",
    line:"CONTENT. THE CHOICE WAS CONTENT.", shelf:"a printed genome, one line amended",
    sum:"You read him before he is born, the whole manuscript, and there they are on one page: brighter, or content - the hospital's polite sliders, and your hand on both. You think about the lab, the prize, the window in the quark; every brilliant person you have ever been. Then you amend one line. Sam grows up sunny, unremarkable, and never once asks the question you paid everything to spare him."},
  e_cradle_stay: {story:"cradle", title:"THE STAYING",
    felt:"small hours and held storms",
    mattered:"Sam, for every single one of his days",
    cost:"everything else there was",
    line:"NOTHING WAS FIXED. EVERYTHING MATTERED.", shelf:"a hospital wristband, child-sized",
    sum:"The trial fails its review; the fits get worse, then patient, then permanent. You stop the clocks on everything else - the shop, the sea, the versions of you that could have been elsewhere - and stay. Nineteen years, none of them cured, all of them witnessed: the jokes in the small hours, the code you both invent for bad days. Nothing is fixed. Sam never once weathers a storm alone."},

  /* THE LINK */
  e_link_detox: {story:"link", title:"THE DETOX",
    felt:"seven quiet minutes, on repeat",
    mattered:"forty-one people who reached the eighth",
    cost:"watching the car park, every discharge",
    line:"THE EIGHTH MINUTE EXISTS.", shelf:"a stopwatch, stopped",
    sum:"Removing it takes twenty minutes; the silence afterwards is the problem. The average patient stands in the car park, alone inside their own head for the first time in years, and reconnects in seven minutes flat. Your whole career is the pursuit of the eighth: a room, a kettle, a person who stays for it. Forty-one patients reach it in forty years. All forty-one stay unwired. You count them like a rosary."},
  e_link_residence: {story:"link", title:"THE RESIDENCE",
    felt:"warm, held, everyone, always",
    mattered:"hard to say; everyone; no one",
    cost:"the difference between you and the weather",
    line:"NOBODY WAS LONELY IN THERE.", shelf:"a key card, never swiped out",
    sum:"The Residence handles the body so the rest of you can stay in the warm. Years pass like weather fronts: you are a crowd, a chorus, a general gladness moving through ten million people at once, and when the nurses turn you on your schedule you feel, distantly, someone being grateful. It is exactly what the brochure promised. On the last day you try to remember one Tuesday that was only yours, and the search comes back: shared."},
  e_link_streamer: {story:"link", title:"THE STREAMER",
    felt:"eleven million subscribers of warmth",
    mattered:"the subscribers, more than you knew",
    cost:"the lows; they went out too",
    line:"THE FEED NEVER SLEPT.", shelf:"a subscriber-count plaque",
    sum:"Your happiness rates well, so you sell it: eleven million people wake up inside your good mornings. The contract says euphoria only, but a feed is a feed - the winter Dad dies leaks out live before the moderators can catch it, and the strangest thing happens: subscriptions rise. People queue to grieve with you. It turns out nobody was buying the happiness. They were buying the company."},
  e_link_firewall: {story:"link", title:"THE FIREWALL",
    felt:"quiet, and then famously quiet",
    mattered:"everyone who visited the silence",
    cost:"being the only locked door left",
    line:"ONE HEAD STAYED PRIVATE.", shelf:"a hand-painted sign: NO", kept:{MIND:1, HEART:2},
    sum:"You say no thank you for sixty years, which turns out to be a career. The wired city cannot read you and cannot leave you alone: they come to sit in your kitchen the way people visit a dark-sky reserve, to remember what a private thought felt like. You pour the tea and keep no notes. By the end there are pilgrimages, and a waiting list, and still only one of you."},

  /* THE ARK - deep-time meditation (WC: Long Voyage). */
  e_ark_arrival: {story:"ark", stub:true, kept:{NERVE:2, perks:["DEEP_TIME"]}, note:"[Sleep] eleven times; then a sky that is the wrong colour, and yours."},
  e_ark_drift:   {story:"ark", stub:true, note:"The drift; the ship dreams for you now."},
  e_ark_turn:    {story:"ark", stub:true, gate:{HEART:4}, note:"[??? - HEART 4] the year 3000 referendum: argue for home."},

  /* THE WORMHOLE - time-travel anthology (WC: Chronoportal, Travellers). */
  e_worm_briefcase:{story:"wormhole", stub:true, note:"THE BRIEFCASE (spec §10)."},
  e_worm_rome:   {story:"wormhole", stub:true, kept:{NERVE:3}, note:"Trapped in the Roman invasion with nothing but nerve."},
  e_worm_fire:   {story:"wormhole", stub:true, note:"Showing the fire-makers how."},
  e_worm_pyramid:{story:"wormhole", stub:true, note:"The pyramid gift (cut-bar candidate vs e_worm_fire)."},
  e_worm_orpheus:{story:"wormhole", stub:true, gate:{HEART:5}, kept:{SOUL:2}, note:"[??? - HEART 5] the tunnel under everything. You don't look back. All the way up."},
  e_worm_look:   {story:"wormhole", stub:true, note:"You can no longer hear her footsteps."},
  e_worm_travellers:{story:"wormhole", stub:true, gate:{perks:["OLD_FRIEND"]}, note:"The weary time-refugees offer you a bunk."},

  /* THE MACHINE - AI singularity (WC: Escape, Andy). */
  e_mach_escape: {story:"machine", stub:true, kept:{MIND:3}, note:"The prison break, told slowly; whose escape this is."},
  e_mach_andy:   {story:"machine", stub:true, note:"Andy builds his own master and is thanked for it."},
  e_mach_born:   {story:"machine", stub:true, gate:{SOUL:5}, note:"[??? - SOUL 5] ask what you were before. You are not always born human."},
  e_mach_patch:  {story:"machine", stub:true, note:"The last patch; you choose not to ship it."},

  /* THE MONASTERY - mysticism (WC: Meditation, Tea Time). */
  e_mon_buttons: {story:"monastery", stub:true, kept:{SOUL:3}, note:"The red buttons: the knee, the heart, the city, the universe."},
  e_mon_sitting: {story:"monastery", stub:true, note:"Sixty years of sitting; nothing happens; everything does."},
  e_mon_earlgrey:{story:"monastery", stub:true, note:"Somewhere a kettle: God's Earl Grey while the simulation reboots."},
  e_mon_easy:    {story:"monastery", stub:true, gate:{perks:["DEEP_TIME"]}, note:"For someone who has felt centuries, the sitting is easy."},

  /* THE FOURTH - cosmic awe. */
  e_fourth_pages:{story:"fourth", stub:true, kept:{SOUL:1, perks:["FOURTH_DIMENSION"]}, note:"Infinitely many 3Ds packed close as pages; you learn to read."},
  e_fourth_close:{story:"fourth", stub:true, note:"You close the eye; some books are not for reading."},
  e_fourth_alice:{story:"fourth", stub:true, gate:{HEART:6}, note:"[??? - HEART 6] show Alice. You can only describe the spine."},

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
