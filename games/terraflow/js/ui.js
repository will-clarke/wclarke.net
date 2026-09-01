// DOM UI: bank strip, goal chip, hints, the upgrade catalogue sheet, popup
// menus, end card. V2: one gesture on a catalogue row - tap = buy if you can
// afford it, otherwise pin it as your goal (the Vat then shows what it needs).

const UI = {
  els: {}, shownHints: new Set(), endShown: false, resetArmed: false,
};

function uiInit() {
  const $ = id => document.getElementById(id);
  UI.els = {
    game: $('game'), bank: $('strip-bank'), pipes: $('strip-pipes'),
    goal: $('goal'), goalLabel: $('goal-label'), goalBar: $('goal-bar-fill'),
    hint: $('hint'), sheet: $('sheet'), handle: $('sheet-handle'),
    sheetLabel: $('sheet-label'),
    upgrades: $('upgrades'), popup: $('popup'), endcard: $('endcard'),
    endStats: $('end-stats'), reset: $('btn-reset'),
  };

  UI.els.handle.addEventListener('click', () => UI.els.sheet.classList.toggle('open'));
  let sy = null;
  UI.els.handle.addEventListener('touchstart', e => { sy = e.touches[0].clientY; }, { passive: true });
  UI.els.handle.addEventListener('touchmove', e => {
    if (sy === null) return;
    const dy = e.touches[0].clientY - sy;
    if (dy < -25) { UI.els.sheet.classList.add('open'); sy = null; uiHintDone('goal'); }
    if (dy > 25) { UI.els.sheet.classList.remove('open'); sy = null; }
  }, { passive: true });

  buildCatalogue();

  UI.els.reset.addEventListener('click', () => {
    if (!UI.resetArmed) {
      UI.resetArmed = true;
      UI.els.reset.textContent = 'Sure? Tap again';
      setTimeout(() => { UI.resetArmed = false; UI.els.reset.textContent = 'Reset save'; }, 3000);
      return;
    }
    clearSave();
    location.reload();
  });

  document.getElementById('btn-continue').addEventListener('click', () => {
    UI.els.endcard.classList.remove('show');
  });
  document.getElementById('btn-restart').addEventListener('click', () => {
    clearSave();
    location.reload();
  });
}

// coloured dot + amount, e.g. "●12 ●3" - the one way costs are ever rendered
function costHTML(cost) {
  return Object.entries(cost)
    .map(([el, n]) => `<i style="color:${PAINTS[el].color}">●</i>${fmt(n)}`)
    .join(' ');
}

// --- bank strip + goal chip (refreshed every frame, cheap) ---------------------

let _lastStrip = '';
function uiUpdate() {
  const cost = pinnedCost();
  const key = Object.values(Sim.bank).join('|') + '|' + Sim.pipeStock + '|'
    + Sim.pinned + '|' + ownedLevels() + '|' + Sim.ended + '|' + Sim.intakeEMA.toFixed(1);
  if (key !== _lastStrip) {
    _lastStrip = key;
    // bank: show a paint once some of it has ever been banked
    UI.els.bank.innerHTML = Object.keys(PAINTS)
      .filter(el => Sim.lifetime[el] > 0 || el === 'R')
      .map(el => `<span><i style="color:${PAINTS[el].color}">●</i>${fmt(Sim.bank[el])}</span>`)
      .join('');
    UI.els.pipes.textContent = '▭ ×' + Sim.pipeStock
      + (Sim.intakeEMA >= 0.3 ? '  ⚡' + fmt(Sim.intakeEMA) + '/s' : '');
    uiRefreshGoalChip(cost);
    refreshCatalogue();
  }
  uiUpdateGoalBar(cost);
}

function uiRefreshGoalChip(cost) {
  const t = pinnedTrack();
  if (!t || !cost) {
    UI.els.goal.classList.add('idle');
    UI.els.goalLabel.innerHTML = Sim.ended
      ? 'machine complete ✓ &nbsp;keep flowing'
      : 'no goal - swipe up ▲ and tap an upgrade';
    return;
  }
  UI.els.goal.classList.remove('idle');
  const parts = Object.entries(cost)
    .map(([el, n]) => `<i style="color:${PAINTS[el].color}">●</i>${fmt(Math.min(Sim.bank[el], n))}/${fmt(n)}`)
    .join(' &nbsp;');
  const lvl = t.max > 1 ? ` <span class="goal-lvl">lv${trackLevel(t.id) + 1}</span>` : '';
  UI.els.goalLabel.innerHTML = `<b>GOAL</b> ${t.name}${lvl}<br>${parts}`;
}

function uiUpdateGoalBar(cost) {
  let frac = 0, col = CONFIG.colors.pin;
  if (cost) {
    let paid = 0, total = 0, worst = 0;
    for (const el in cost) {
      paid += Math.min(Sim.bank[el], cost[el]); total += cost[el];
      const deficit = 1 - Math.min(1, Sim.bank[el] / cost[el]);
      if (deficit >= worst) { worst = deficit; col = PAINTS[el].color; }
    }
    frac = total ? paid / total : 0;
  }
  UI.els.goalBar.style.width = (frac * 100).toFixed(1) + '%';
  if (UI.els.goalBar.dataset.col !== col) {
    UI.els.goalBar.dataset.col = col;
    UI.els.goalBar.style.background = col;
  }
}

// called from main when the pinned upgrade auto-buys itself
function uiGoalComplete(track) {
  uiShowHint({ id: 'buy-' + track.id + '-' + trackLevel(track.id), text: '★ ' + track.name + ' - yours' });
  if (Sim.ended && !UI.endShown) uiShowEndCard();
}

// --- the upgrade catalogue -------------------------------------------------------

function buildCatalogue() {
  UI.els.upgrades.innerHTML = '';
  for (const cat of TRACK_CATS) {
    const h = document.createElement('div');
    h.className = 'upg-cat';
    h.textContent = cat.label;
    h.dataset.cat = cat.id;
    UI.els.upgrades.appendChild(h);
    for (const t of TRACKS) {
      if (t.cat !== cat.id) continue;
      const row = document.createElement('div');
      row.className = 'upg';
      row.dataset.id = t.id;
      row.innerHTML = `
        <div class="upg-info">
          <div class="upg-name">${t.name} <span class="upg-lvl"></span></div>
          <div class="upg-desc">${t.desc}</div>
        </div>
        <button class="upg-buy"></button>`;
      row.querySelector('.upg-buy').addEventListener('click', () => uiTapTrack(t, row));
      UI.els.upgrades.appendChild(row);
    }
  }
  // completed fold: maxed rows move here so the live list stays short (prompt 7)
  const dh = document.createElement('div');
  dh.className = 'upg-cat done-header';
  dh.addEventListener('click', () => { UI.doneOpen = !UI.doneOpen; _lastStrip = ''; });
  UI.els.doneHeader = dh;
  UI.els.upgrades.appendChild(dh);
  const dl = document.createElement('div');
  dl.id = 'done-list';
  UI.els.doneList = dl;
  UI.els.upgrades.appendChild(dl);
}

// the one catalogue gesture: afford it -> buy now; can't -> pin it as the goal
function uiTapTrack(t, row) {
  if (trackMaxed(t)) return;
  if (canAfford(trackCost(t))) {
    if (buyTrack(t)) {
      checkSpawns();
      if (Sim.ended && !UI.endShown) uiShowEndCard();
      const btn = row.querySelector('.upg-buy');
      btn.classList.remove('bought'); void btn.offsetWidth; // restart anim
      btn.classList.add('bought');
    }
  } else {
    Sim.pinned = Sim.pinned === t.id ? null : t.id;
  }
  _lastStrip = ''; // force refresh
}

function refreshCatalogue() {
  const owned = ownedLevels();
  UI.els.sheetLabel.textContent = `Upgrades ${owned} / ${TOTAL_LEVELS}`;
  const catShown = {};
  let doneCount = 0;
  for (const row of UI.els.upgrades.querySelectorAll('.upg')) {
    const t = TRACK_BY_ID[row.dataset.id];
    const maxed = trackMaxed(t);
    if (maxed && row.parentElement !== UI.els.doneList) UI.els.doneList.appendChild(row);
    if (maxed) {
      doneCount++;
      row.classList.add('maxed');
      row.classList.remove('pinned');
      row.hidden = !UI.doneOpen;
      const btn = row.querySelector('.upg-buy');
      if (btn.innerHTML !== 'MAX') btn.innerHTML = 'MAX';
      const lvl = row.querySelector('.upg-lvl');
      const ltxt = t.max > 1 ? `lv${t.max}/${t.max}` : '';
      if (lvl.textContent !== ltxt) lvl.textContent = ltxt;
      continue;
    }
    const visible = trackVisible(t);
    row.hidden = !visible;
    if (!visible) continue;
    catShown[t.cat] = true;
    const btn = row.querySelector('.upg-buy');
    row.classList.toggle('pinned', Sim.pinned === t.id);
    const html = Sim.pinned === t.id ? '★ goal' : costHTML(trackCost(t));
    if (btn.innerHTML !== html) btn.innerHTML = html;
    btn.classList.toggle('afford', canAfford(trackCost(t)));
    const lvl = row.querySelector('.upg-lvl');
    const ltxt = t.max > 1 ? `lv${trackLevel(t.id)}/${t.max}` : '';
    if (lvl.textContent !== ltxt) lvl.textContent = ltxt;
  }
  for (const h of UI.els.upgrades.querySelectorAll('.upg-cat:not(.done-header)')) {
    h.hidden = !catShown[h.dataset.cat];
  }
  UI.els.doneHeader.hidden = doneCount === 0;
  UI.els.doneHeader.textContent = `✓ completed ${doneCount} ${UI.doneOpen ? '▾' : '▸'}`;
  UI.els.doneList.hidden = !UI.doneOpen || doneCount === 0;
}

// --- popup menus (radial-ish, DOM) ----------------------------------------------

function uiCloseMenus() { UI.els.popup.innerHTML = ''; UI.els.popup.classList.remove('show'); }

function popupAt(x, y) {
  const p = UI.els.popup;
  p.classList.add('show');
  const g = UI.els.game.getBoundingClientRect();
  p.style.left = Math.max(8, Math.min(g.width - 168, x - 80)) + 'px';
  p.style.top = Math.max(CONFIG.topPad + 4, Math.min(g.height - 150, y + 26)) + 'px';
  return p;
}

// a recipe rendered as paint dots / counts: ●×1 + ●×1 → ●×4 Orange
function recipeHTML(r) {
  const parts = Object.entries(recipeInputs(r))
    .map(([el, q]) => `<i style="color:${PAINTS[el].color}">●</i>×${q}`)
    .join(' + ');
  const outN = recipeOut(r);
  return `${parts} → <i style="color:${PAINTS[r.out].color}">●</i>${outN > 1 ? '×' + outN : ''} ${PAINTS[r.out].name}`;
}

function uiOpenRadial(slotNode) {
  uiCloseMenus();
  const p = popupAt(slotNode.x, slotNode.y);
  for (const r of unlockedRecipes()) {
    const b = document.createElement('button');
    b.className = 'pop-btn';
    b.innerHTML = recipeHTML(r);
    b.addEventListener('click', () => {
      placeConverter(slotNode, r.id);
      uiHintDone('slot');
      uiCloseMenus();
    });
    p.appendChild(b);
  }
}

function uiOpenConverterMenu(node) {
  uiCloseMenus();
  const p = popupAt(node.x, node.y);
  for (const r of unlockedRecipes()) {
    if (r.id === node.recipe) continue;
    const b = document.createElement('button');
    b.className = 'pop-btn';
    b.innerHTML = '⇄ ' + recipeHTML(r);
    b.addEventListener('click', () => { swapConverter(node, r.id); uiHintDone('swap'); uiCloseMenus(); });
    p.appendChild(b);
  }
  const b = document.createElement('button');
  b.className = 'pop-btn danger';
  b.textContent = '✕ Remove mixer';
  b.addEventListener('click', () => { removeConverter(node); uiCloseMenus(); });
  p.appendChild(b);
}

function uiOpenPipeChip(pipe, x, y) {
  uiCloseMenus();
  const p = popupAt(x, y);
  if (pipe.lanes < maxLanes()) {
    const cost = laneCost(pipe);
    const b = document.createElement('button');
    b.className = 'pop-btn';
    b.innerHTML = `+ Lane &nbsp;${costHTML(cost)}`;
    b.disabled = !canAfford(cost);
    b.addEventListener('click', () => {
      if (payCost(laneCost(pipe))) { addLane(pipe); uiHintDone('lanes'); }
      uiCloseMenus();
    });
    p.appendChild(b);
  }
  const del = document.createElement('button');
  del.className = 'pop-btn danger';
  del.textContent = '✕ Remove pipe (+1 ▭)';
  del.addEventListener('click', () => { removePipe(pipe); uiCloseMenus(); });
  p.appendChild(del);
}

// --- hints -----------------------------------------------------------------------

let _hintTimer = null;
function uiCheckHints() {
  for (const h of HINTS) {
    if (UI.shownHints.has(h.id)) continue;
    if (h.when()) { uiShowHint(h); break; }
  }
}

function uiShowHint(h) {
  UI.shownHints.add(h.id);
  UI.els.hint.textContent = h.text;
  UI.els.hint.classList.add('show');
  clearTimeout(_hintTimer);
  _hintTimer = setTimeout(() => UI.els.hint.classList.remove('show'), 7000);
}

// mark a hint as no longer needed (player already did the thing)
function uiHintDone(id) { UI.shownHints.add(id); }

// --- end card ----------------------------------------------------------------------

function uiShowEndCard() {
  UI.endShown = true;
  const mm = Math.floor(Sim.time / 60), ss = Math.floor(Sim.time % 60);
  const total = Object.values(Sim.lifetime).reduce((a, b) => a + b, 0);
  UI.els.endStats.innerHTML = `
    <div><span>Time</span><b>${mm}:${String(ss).padStart(2, '0')}</b></div>
    <div><span>Paint banked</span><b>${fmt(total)}</b></div>
    <div><span>Peak flow</span><b>${fmt(Sim.peakIntake)}/s</b></div>
    <div><span>Upgrades</span><b>${ownedLevels()} / ${TOTAL_LEVELS}</b></div>`;
  UI.els.endcard.classList.add('show');
}
