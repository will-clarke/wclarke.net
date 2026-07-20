#!/usr/bin/env node
/* tile authoring harness - node, no deps.
   Proves every level is tileable (exact-cover backtracking, most-constrained
   cell first), renders regions as ASCII, and grows GEN regions deterministically.

   The kernel below (orientations) is pasted verbatim into tile/index.html
   (SPEC §1): keep the two copies identical. */

/* ===== KERNEL (shared with index.html) ============================== */
const rot  = o => o.map(([x,y]) => [-y,  x]);   // 90 deg cw, y-down grid
const flip = o => o.map(([x,y]) => [-x,  y]);
function orientations(tile, flips){
  const out = [], seen = new Set();
  let cur = tile;
  for(let f = 0; f < (flips ? 2 : 1); f++, cur = flip(tile))
    for(let r = 0; r < 4; r++, cur = rot(cur)){
      const key = cur.map(([x,y]) => x+','+y).sort().join(';');
      if(!seen.has(key)){ seen.add(key); out.push({offs: cur, flipped: !!f}); }
    }
  return out;
}
/* ===== end kernel =================================================== */

/* tiles (offsets, eye first) */
const DOM=[[0,0],[1,0]];
const L3 =[[0,0],[0,1],[1,1]];
const T4 =[[0,0],[1,0],[2,0],[1,1]];
const S4 =[[0,0],[1,0],[1,1],[2,1]];
const L4 =[[0,0],[0,1],[0,2],[1,2]];
const P5 =[[0,0],[1,0],[0,1],[1,1],[0,2]];
const W5 =[[0,0],[0,1],[1,1],[1,2],[2,2]];
const TILES={DOM,L3,T4,S4,L4,P5,W5};

/* region = explicit cell list. rect(w,h,holes) is the rectangular helper. */
function rect(w,h,holes=[]){
  const hs=new Set(holes.map(([x,y])=>x+','+y)), out=[];
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){ const k=x+','+y; if(!hs.has(k)) out.push([x,y]); }
  return out;
}
const cells=list=>new Set(list.map(([x,y])=>x+','+y));

/* ===== solver (SPEC §7): exact cover, most-constrained cell first ==== */
function solvable(regionSet, orients, cap = 2e6){
  let nodes = 0;
  const occ = new Set();
  const fitsAt = c => {                              // placements covering cell c
    const [cx,cy] = c.split(',').map(Number), out = [], seen=new Set();
    for(const o of orients) for(const d of o.offs){  // c could be any cell of the piece
      const ax = cx - d[0], ay = cy - d[1];
      const cs = o.offs.map(([x,y]) => (ax+x)+','+(ay+y));
      if(cs.every(k => regionSet.has(k) && !occ.has(k))){
        const key = ax+','+ay+':'+o.offs.map(([x,y])=>x+','+y).sort().join(';');
        if(!seen.has(key)){ seen.add(key); out.push(cs); }
      }
    }
    return out;
  };
  const rec = () => {
    if(++nodes > cap) throw 'cap';
    let best = null, bestFits = null;
    for(const c of regionSet){
      if(occ.has(c)) continue;
      const f = fitsAt(c);
      if(!f.length) return false;
      if(!bestFits || f.length < bestFits.length){ best = c; bestFits = f; }
      if(f.length === 1) break;
    }
    if(!best) return true;                           // everything covered
    for(const cs of bestFits){
      cs.forEach(k => occ.add(k));
      if(rec()) return true;
      cs.forEach(k => occ.delete(k));
    }
    return false;
  };
  try{ return rec(); }catch(e){ if(e==='cap') return null; throw e; }
}

/* GEN placeholders: replaced by T5-authored cell lists (see GENS below).
   Until authored, GEN() returns null (signals "not yet authored"). */
const GENS={
  // authored T5 - grown by `gen`, chosen by eye. seed noted per entry.
  'S4-6' : [[2,2],[3,2],[3,3],[4,3],[2,5],[3,5],[3,4],[4,4],[0,3],[0,4],[1,4],[1,5],[1,2],[1,3],[2,3],[2,4],[4,0],[3,0],[3,1],[2,1],[5,0],[5,1],[4,1],[4,2]],                 // S4 6 seed 4  (6x6 diamond stair)
  'W5-5' : [[2,4],[2,5],[3,5],[3,6],[4,6],[5,6],[5,5],[4,5],[4,4],[3,4],[5,4],[5,3],[4,3],[4,2],[3,2],[5,2],[5,1],[4,1],[4,0],[3,0],[2,3],[1,3],[1,4],[0,4],[0,5]],             // W5 5 seed 2  (6x7 wave)
  'T4-8' : [[3,4],[4,4],[5,4],[4,5],[2,6],[3,6],[4,6],[3,5],[6,2],[5,2],[4,2],[5,3],[6,3],[7,3],[8,3],[7,2],[5,1],[4,1],[3,1],[4,0],[0,5],[1,5],[2,5],[1,6],[2,3],[3,3],[4,3],[3,2],[0,4],[1,4],[2,4],[1,3]], // T4 8 seed 3  (9x7 thicket)
  'S4o-6': [[1,3],[2,3],[2,4],[3,4],[5,4],[4,4],[4,3],[3,3],[1,1],[2,1],[2,2],[3,2],[4,2],[5,2],[5,3],[6,3],[2,0],[3,0],[3,1],[4,1],[0,4],[1,4],[1,5],[2,5]],                 // S4 6 one-sided seed 3  (7x6 crooked band)
  'P5-7' : [[3,3],[4,3],[3,4],[4,4],[3,5],[2,1],[3,1],[2,2],[3,2],[2,3],[1,0],[0,0],[1,1],[0,1],[1,2],[4,7],[3,7],[4,6],[3,6],[4,5],[1,5],[2,5],[1,4],[2,4],[1,3],[5,3],[5,4],[6,3],[6,4],[7,3],[6,2],[6,1],[5,2],[5,1],[4,2]], // P5 7 seed 7  (8x8 meadow)
};
function GEN(key){ return GENS[key] || null; }

/* ===== levels (SPEC §5) ============================================= */
const LEVELS=[
  { name:"Bricks",  tile:DOM, flips:true,  region:rect(4,3) },
  { name:"Turn",    tile:DOM, flips:true,  region:rect(3,3,[[1,1]]) },
  { name:"Corner",  tile:L3,  flips:true,  region:rect(3,2) },
  { name:"Deficient",tile:L3, flips:true,  region:rect(4,4,[[1,1]]) },
  { name:"Tee",     tile:T4,  flips:true,  region:rect(4,4) },
  { name:"Steps",   tile:S4,  flips:true,  region:GEN('S4-6') },
  { name:"Pinwheel",tile:L4,  flips:false, region:rect(4,4) },
  { name:"Quilt",   tile:P5,  flips:true,  region:rect(4,5) },
  { name:"Waves",   tile:W5,  flips:true,  region:GEN('W5-5') },
  { name:"Longhand",tile:L4,  flips:true,  region:rect(4,6) },
  { name:"Thicket", tile:T4,  flips:true,  region:GEN('T4-8') },
  { name:"Crooked", tile:S4,  flips:false, region:GEN('S4o-6') },
  { name:"Meadow",  tile:P5,  flips:true,  region:GEN('P5-7') },
  { name:"Theorem", tile:L3,  flips:true,  region:rect(8,8,[[2,5]]) },
];

/* ===== ascii ======================================================== */
function bbox(list){
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  for(const [x,y] of list){ x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y); }
  return {x0,y0,x1,y1,w:x1-x0+1,h:y1-y0+1};
}
function ascii(list){
  const s=cells(list), {x0,y0,x1,y1}=bbox(list); let out='';
  for(let y=y0;y<=y1;y++){ let row='';
    for(let x=x0;x<=x1;x++) row += s.has(x+','+y)?'##':'  ';
    out+=row+'\n'; }
  return out;
}
const pasteList=list=>{
  const {x0,y0}=bbox(list);
  return '['+list.map(([x,y])=>`[${x-x0},${y-y0}]`).join(',')+']';
};

/* ===== deterministic RNG (mulberry32) =============================== */
function rng(seed){
  let a=seed>>>0;
  return ()=>{ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; };
}

/* ===== growth generator (SPEC §6) =================================== */
function grow(tile, flips, k, seed){
  const r=rng(seed), orients=orientations(tile, flips);
  let region=new Set(orients[0].offs.map(([x,y])=>x+','+y));
  for(let i=1;i<k;i++){
    const cands=[];
    // window around region bbox, expanded by tile reach
    const rc=[...region].map(s=>s.split(',').map(Number));
    const {x0,y0,x1,y1}=bbox(rc);
    for(let ay=y0-4; ay<=y1+4; ay++) for(let ax=x0-4; ax<=x1+4; ax++){
      for(const o of orients){
        const cs=o.offs.map(([x,y])=>(ax+x)+','+(ay+y));
        if(cs.some(c=>region.has(c))) continue;                 // overlap
        // must edge-touch the existing region
        let touch=false;
        for(const c of cs){ const [x,y]=c.split(',').map(Number);
          if(region.has((x+1)+','+y)||region.has((x-1)+','+y)||region.has(x+','+(y+1))||region.has(x+','+(y-1))){ touch=true; break; } }
        if(touch) cands.push(cs);
      }
    }
    if(!cands.length) return null;
    // weight by shared-edge count so the region grows blobby, not stringy
    const shared=cs=>{ let n=0; for(const c of cs){ const [x,y]=c.split(',').map(Number);
      if(region.has((x+1)+','+y))n++; if(region.has((x-1)+','+y))n++; if(region.has(x+','+(y+1)))n++; if(region.has(x+','+(y-1)))n++; } return n; };
    const w=cands.map(cs=>Math.pow(shared(cs),3));
    let tot=w.reduce((a,b)=>a+b,0), t=r()*tot, pick=cands[0];
    for(let j=0;j<cands.length;j++){ t-=w[j]; if(t<=0){ pick=cands[j]; break; } }
    pick.forEach(c=>region.add(c));
  }
  // recenter to origin
  const list=[...region].map(s=>s.split(',').map(Number));
  const {x0,y0,w,h}=bbox(list);
  if(w>9||h>9||region.size>45) return null;
  return list.map(([x,y])=>[x-x0,y-y0]);
}

/* ===== commands ===================================================== */
function cmdLevels(){
  let fail=0;
  console.log('#  name        tile flip  cells pieces  ok');
  LEVELS.forEach((L,i)=>{
    const idx=String(i+1).padStart(2,' ');
    if(!L.region){
      console.log(`${idx} ${L.name.padEnd(11)} ${tileName(L.tile).padEnd(4)} ${L.flips?'y':'n'}     GEN not authored yet`);
      return;
    }
    const region=cells(L.region);
    const psize=L.tile.length, np=region.size/psize;
    const divOk = region.size % psize === 0;
    const orients=orientations(L.tile, L.flips);
    const sol = divOk ? solvable(region, orients) : false;
    const {w,h}=bbox(L.region);
    const bad = !divOk || sol!==true;
    if(bad) fail++;
    console.log(`${idx} ${L.name.padEnd(11)} ${tileName(L.tile).padEnd(4)} ${L.flips?'y':'n'}   ${String(region.size).padStart(4)} ${String(np).padStart(5)}   ${sol===true?'yes':sol===null?'CAP':'NO'}  ${w}x${h}  orients=${orients.length}${bad?'  <-- UNSOLVABLE':''}`);
    console.log(ascii(L.region).replace(/^/gm,'    '));
  });
  if(fail){ console.error(`\n${fail} level(s) unsolvable or not authored.`); process.exit(1); }
  console.log('\nall levels tileable.');
}
function tileName(t){ for(const k in TILES) if(TILES[k]===t) return k; return '?'; }

function cmdGen(args){
  const tname=args[0], k=+args[1];
  const oneSided=args.includes('--one-sided');
  const seedArg=args.find((a,i)=>i>=2 && !a.startsWith('--'));
  const tile=TILES[tname];
  if(!tile){ console.error('unknown tile '+tname+' (DOM L3 T4 S4 L4 P5 W5)'); process.exit(2); }
  if(!k){ console.error('need piece count k'); process.exit(2); }
  const orients=orientations(tile, !oneSided);
  if(seedArg!=null){
    const region=grow(tile, !oneSided, k, +seedArg);
    if(!region){ console.log(`seed ${seedArg}: rejected (bbox/size)`); return; }
    const ok=solvable(cells(region), orients);
    const {w,h}=bbox(region);
    console.log(`${tname} k=${k} seed=${seedArg}  ${w}x${h}  cells=${region.length}  solvable=${ok}`);
    console.log(ascii(region));
    console.log('  '+pasteList(region));
    return;
  }
  // no seed: sample a range so you can eyeball several
  for(let s=1; s<=24; s++){
    const region=grow(tile, !oneSided, k, s);
    if(!region) continue;
    const ok=solvable(cells(region), orients);
    if(ok!==true) continue;
    const {w,h}=bbox(region);
    console.log(`--- seed ${s}  ${w}x${h}  cells=${region.length}  solvable=${ok}`);
    console.log(ascii(region));
    console.log('  '+pasteList(region));
  }
}

const [cmd, ...rest]=process.argv.slice(2);
if(cmd==='levels') cmdLevels();
else if(cmd==='gen') cmdGen(rest);
else if(cmd==='orient'){
  for(const k in TILES) console.log(k.padEnd(4), 'rot-only', orientations(TILES[k],false).length, ' with-flips', orientations(TILES[k],true).length);
}
else{ console.log('usage: node tile/harness.mjs levels | gen <TILE> <k> [--one-sided] [seed] | orient'); process.exit(2); }
