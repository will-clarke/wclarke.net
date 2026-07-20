#!/usr/bin/env node
/* mirror authoring harness - node, no deps.
   Verifies every level's stored par is BFS-minimal and renders targets as
   ASCII for eyeballing. Also samples the random generator.

   The kernel below is pasted verbatim into mirror/index.html (SPEC §7): keep
   the two copies identical. It is deliberately tiny so the copy stays honest. */

/* ===== KERNEL (shared with index.html) ============================== */
function reflect(m, x, y){
  switch(m.o){
    case 'V': return [m.p-1-x, y];
    case 'H': return [x, m.p-1-y];
    case 'D': return [y-m.p, x+m.p];
    case 'A': return [m.p-y, m.p-x];
  }
}
function allMirrors(n){
  const out=[];
  for(let dp=1; dp<=2*n-1; dp++){ out.push({o:'V',p:dp}); out.push({o:'H',p:dp}); }
  for(let c=-(n-2); c<=n-2; c++) out.push({o:'D',p:c});
  for(let s=1; s<=2*n-3; s++) out.push({o:'A',p:s});
  return out;
}
function applyMirror(n, lit, m){                 // lit: Set of y*n+x -> new Set
  const out=new Set(lit);
  for(const idx of lit){
    const x=idx%n, y=(idx/n)|0, [rx,ry]=reflect(m, x, y);
    if(rx>=0 && rx<n && ry>=0 && ry<n) out.add(ry*n+rx);
  }
  return out;
}
/* ===== end kernel =================================================== */

const bit=i=>1n<<BigInt(i);
function mask(n, cells){ let m=0n; for(const c of cells) m|=bit(typeof c==='number'?c:c[1]*n+c[0]); return m; }
function applyMask(n, s, m){                      // BigInt lit-set -> BigInt
  let out=s;
  for(let y=0;y<n;y++) for(let x=0;x<n;x++){
    if((s>>BigInt(y*n+x))&1n){
      const [rx,ry]=reflect(m, x, y);
      if(rx>=0 && rx<n && ry>=0 && ry<n) out|=bit(ry*n+rx);
    }
  }
  return out;
}
function solve(n, seedMask, targetMask, cap=300000){   // -> min mirrors, -1 none, -2 cap
  const T=targetMask, S=seedMask;
  if(S===T) return 0;
  if((S & ~T)!==0n) return -1;
  const moves=allMirrors(n);
  let states=[S], seen=new Set([S.toString()]);
  for(let depth=1; depth<=8; depth++){
    const next=[];
    for(const s of states) for(const m of moves){
      const t=applyMask(n, s, m);
      if(t===s || (t & ~T)!==0n) continue;         // no-op or overspill: dead
      if(t===T) return depth;
      const k=t.toString();
      if(!seen.has(k)){ seen.add(k); next.push(t); if(seen.size>cap) return -2; }
    }
    if(!next.length) return -1;
    states=next;
  }
  return -1;
}

/* mirror tokens: [letter, param] -> {o,p} */
const M=([o,p])=>({o,p});
function applySol(n, seed, sol){
  let lit=new Set(seed.map(([x,y])=>y*n+x));
  for(const step of sol) lit=applyMirror(n, lit, M(step));
  return lit;
}

/* ===== levels (SPEC §5) ============================================= */
const LEVELS=[
  { name:"Mirror",   n:5, seed:[[1,1],[1,2],[1,3],[2,2]],            sol:[["V",5]] },
  { name:"Quarters", n:5, seed:[[0,0],[1,0],[0,1]],                  sol:[["V",5],["H",5]] },
  { name:"Bloom",    n:7, seed:[[2,0],[2,1]],                        sol:[["V",7],["H",7],["D",0]] },
  { name:"Fallen",   n:5, seed:[[1,1],[2,1],[1,2],[1,3]],            sol:[["V",7]] },
  { name:"Spine",    n:5, seed:[[2,0],[2,1],[1,2],[1,3],[2,4]],      sol:[["V",5]] },
  { name:"Gaze",     n:5, seed:[[1,0],[2,0],[2,1]],                  sol:[["D",0]] },
  { name:"Turn",     n:5, seed:[[1,0],[2,0],[1,1]],                  sol:[["V",5],["D",0]] },
  { name:"Pinwheel", n:7, seed:[[3,0],[3,1],[4,1]],                  sol:[["D",0],["A",6]] },
  { name:"Ladder",   n:7, seed:[[0,2],[0,3],[0,4]],                  sol:[["V",4],["V",8]] },
  { name:"Weave",    n:7, seed:[[2,2],[3,2],[2,3]],                  sol:[["V",9],["H",9]] },
  { name:"Lattice",  n:7, seed:[[1,1],[2,2],[0,0]],                  sol:[["V",6],["H",6],["V",12],["H",12]] },
  { name:"Trap",     n:5, seed:[[0,2],[1,2],[2,1],[2,0]],            sol:[["V",7],["H",7]] },
  { name:"Window",   n:9, seed:[[1,0],[2,0],[4,1]],                  sol:[["V",9],["H",9],["D",0]] },
  { name:"Halls",    n:9, seed:[[1,1],[2,1],[1,2]],                  sol:[["D",-2],["V",9],["H",9],["D",0]] },
  { name:"Thorn",    n:7, seed:[[2,2],[3,2],[2,3],[2,4]],            sol:[["H",11],["D",-2]] },
  { name:"Rose",     n:9, seed:[[1,1],[2,2]],                        sol:[["D",-2],["H",8],["V",9],["H",9],["D",0]] },
];

function ascii(n, litSet, seedSet){
  let out='';
  for(let y=0;y<n;y++){
    let row='';
    for(let x=0;x<n;x++){
      const i=y*n+x;
      row += litSet.has(i) ? (seedSet && seedSet.has(i)?'▒▒':'▓▓') : '··';
    }
    out+=row+'\n';
  }
  return out;
}

function cmdLevels(){
  let fail=0;
  console.log('#  name         n  par  bfs  cells');
  for(const L of LEVELS){
    const seedSet=new Set(L.seed.map(([x,y])=>y*L.n+x));
    const litSet=applySol(L.n, L.seed, L.sol);
    const T=mask(L.n, [...litSet]), S=mask(L.n, L.seed);
    const par=L.sol.length, bfs=solve(L.n, S, T);
    const bad = bfs!==par;
    if(bad) fail++;
    const idx=String(LEVELS.indexOf(L)+1).padStart(2,' ');
    console.log(`${idx} ${L.name.padEnd(11)} ${L.n}  ${String(par).padStart(3)} ${String(bfs).padStart(4)}  ${String(litSet.size).padStart(4)}  ${bad?'  <-- PAR MISMATCH':''}`);
    console.log(ascii(L.n, litSet, seedSet).replace(/^/gm,'    '));
  }
  if(fail){ console.error(`\n${fail} level(s) with non-minimal par or unsolvable.`); process.exit(1); }
  console.log('\nall pars minimal.');
}

/* ===== random generator (SPEC §6) =================================== */
function randInt(a,b){ return a + Math.floor(Math.random()*(b-a+1)); }
function genRandom(){
  for(let tries=0; tries<400; tries++){
    const n = Math.random()<0.5 ? 5 : 7;
    const nSeed = randInt(3,5);
    // scatter seed cells in one quadrant-ish region
    const qx = Math.random()<0.5?0:Math.ceil(n/2), qy = Math.random()<0.5?0:Math.ceil(n/2);
    const seed=new Set();
    let guard=0;
    while(seed.size<nSeed && guard++<50){
      const x=qx+randInt(0, Math.floor(n/2)), y=qy+randInt(0, Math.floor(n/2));
      if(x<n && y<n) seed.add(y*n+x);
    }
    if(seed.size<3) continue;
    const moves=allMirrors(n);
    const k=randInt(2,4);
    let lit=new Set(seed); const used=[];
    for(let i=0;i<k;i++){
      const m=moves[randInt(0,moves.length-1)];
      const nl=applyMirror(n, lit, m);
      if(nl.size!==lit.size){ lit=nl; used.push(m); }
    }
    if(lit.size===seed.size) continue;
    if(lit.size<8 || lit.size>0.8*n*n) continue;
    const T=mask(n,[...lit]), S=mask(n,[...seed]);
    const par=solve(n, S, T, 150000);
    if(par<2) continue;
    return {n, seed:[...seed], lit, par};
  }
  return null;
}
function cmdRandom(count){
  for(let i=0;i<count;i++){
    const r=genRandom();
    if(!r){ console.log('(gen failed)'); continue; }
    const seedSet=new Set(r.seed);
    console.log(`n=${r.n}  par=${r.par}  cells=${r.lit.size}`);
    console.log(ascii(r.n, r.lit, seedSet).replace(/^/gm,'  '));
  }
}

const [cmd, arg]=process.argv.slice(2);
if(cmd==='levels') cmdLevels();
else if(cmd==='random') cmdRandom(+arg||20);
else{ console.log('usage: node mirror/harness.mjs levels | random [count]'); process.exit(2); }
