// DOM UI: bank strip, goal chip, hints, bottom sheet, popup menus, end card.

const UI = {
  els: {}, shownHints: new Set(), endShown: false, resetArmed: false,
};

function uiInit() {
  const $ = id => document.getElementById(id);
  UI.els = {
    game: $('game'), bank: $('strip-bank'), pipes: $('strip-pipes'),
    goal: $('goal'), goalLabel: $('goal-label'), goalBar: $('goal-bar-fill'),
    hint: $('hint'), sheet: $('sheet'), handle: $('sheet-handle'),
    upgrades: $('upgrades'), popup: $('popup'), endcard: $('endcard'),
    endStats: $('end-stats'), reset: $('btn-reset'),
  };

  UI.els.handle.addEventListener('click', () => UI.els.sheet.classList.toggle('open'));
  let sy = null;
  UI.els.handle.addEventListener('touchstart', e => { sy = e.touches[0].clientY; }, { passive: true });
  UI.els.handle.addEventListener('touchmove', e => {
    if (sy === null) return;
    const dy = e.touches[0].clientY - sy;
    if (dy < -25) { UI.els.sheet.classList.add('open'); sy = null; uiHintDone('sheet'); }
    if (dy > 25) { UI.els.sheet.classList.remove('open'); sy = null; }
  }, { passive: true });

  buildUpgradeRows();

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
    .map(([el, n]) => `<i style="color:${ELEMENTS[el].color}">●</i>${fmt(n)}`)
    .join(' ');
}

// --- bank strip + goal chip (refreshed every frame, cheap) ---------------------

let _lastStrip = '';
function uiUpdate() {
  const g = currentGoal();
  const key = Sim.bank.O + '|' + Sim.bank.C + '|' + Sim.bank.CO2 + '|' + Sim.pipeStock + '|'
    + Sim.goalIndex + '|' + Sim.ended + '|' + (g ? Sim.lifetime[g.element] : '');
  if (key !== _lastStrip) {
    _lastStrip = key;
    // bank: show an element once it exists in the world
    UI.els.bank.innerHTML = Object.keys(ELEMENTS)
      .filter(el => Sim.lifetime[el] > 0 || el === 'O' || (chemistryOn() && el !== 'C'))
      .map(el => `<span><i style="color:${ELEMENTS[el].color}">●</i>${fmt(Sim.bank[el])}</span>`)
      .join('');
    UI.els.pipes.textContent = '▭ ×' + Sim.pipeStock;
    uiRefreshGoalChip();
  }
  uiUpdateGoalBar();
  refreshUpgradeRows();
}

function uiRefreshGoalChip() {
  const g = currentGoal();
  if (!g) {
    UI.els.goalLabel.innerHTML = Sim.ended ? 'OUTPOST STABILIZED ✓' : '';
    UI.els.goal.classList.toggle('done', Sim.ended);
    return;
  }
  UI.els.goal.classList.remove('done');
  const el = ELEMENTS[g.element];
  UI.els.goalLabel.innerHTML =
    `goal&nbsp; <i style="color:${el.color}">●</i> ${fmt(Math.min(Sim.lifetime[g.element], g.need))} / ${fmt(g.need)}`;
}

function uiUpdateGoalBar() {
  const g = currentGoal();
  const frac = g ? Math.min(1, Sim.lifetime[g.element] / g.need) : 1;
  UI.els.goalBar.style.width = (frac * 100).toFixed(1) + '%';
  const col = g ? ELEMENTS[g.element].color : CONFIG.colors.good;
  if (UI.els.goalBar.dataset.col !== col) {
    UI.els.goalBar.dataset.col = col;
    UI.els.goalBar.style.background = col;
  }
}

// called from main when a goal completes
function uiGoalComplete(goal) {
  if (goal.toast) uiShowHint({ id: 'goal' + Sim.goalIndex, text: goal.toast });
  if (Sim.ended && !UI.endShown) uiShowEndCard();
}

// --- upgrades sheet ------------------------------------------------------------

function buildUpgradeRows() {
  UI.els.upgrades.innerHTML = '';
  for (const key of Object.keys(CONFIG.upgrades)) {
    const u = CONFIG.upgrades[key];
    const row = document.createElement('div');
    row.className = 'upg';
    row.innerHTML = `
      <div class="upg-info">
        <div class="upg-name">${u.name} <span class="upg-lvl"></span></div>
        <div class="upg-desc">${u.desc}</div>
      </div>
      <button class="upg-buy"></button>`;
    const btn = row.querySelector('.upg-buy');
    btn.addEventListener('click', () => {
      if (payCost(upgradeCost(key))) {
        Sim.upgrades[key]++;
        if (key === 'pipe') Sim.pipeStock++;
        btn.classList.remove('bought'); void btn.offsetWidth; // restart anim
        btn.classList.add('bought');
      }
    });
    row.dataset.key = key;
    UI.els.upgrades.appendChild(row);
  }
}

function refreshUpgradeRows() {
  for (const row of UI.els.upgrades.children) {
    const key = row.dataset.key;
    const u = CONFIG.upgrades[key];
    row.hidden = Sim.goalIndex < u.showGoal;
    if (row.hidden) continue;
    const cost = upgradeCost(key);
    const btn = row.querySelector('.upg-buy');
    const html = costHTML(cost);
    if (btn.innerHTML !== html) btn.innerHTML = html;
    btn.disabled = !canAfford(cost);
    const lvl = row.querySelector('.upg-lvl');
    const ltxt = key !== 'pipe' && Sim.upgrades[key] > 0 ? 'lv' + Sim.upgrades[key] : '';
    if (lvl.textContent !== ltxt) lvl.textContent = ltxt;
  }
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

function uiOpenRadial(slotNode) {
  uiCloseMenus();
  const p = popupAt(slotNode.x, slotNode.y);
  for (const r of Object.values(RECIPES)) {
    const b = document.createElement('button');
    b.className = 'pop-btn';
    b.innerHTML = `<span style="color:${ELEMENTS[r.out].color}">${r.label}</span>`;
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
  const b = document.createElement('button');
  b.className = 'pop-btn danger';
  b.textContent = '✕ Remove reactor';
  b.addEventListener('click', () => { removeConverter(node); uiCloseMenus(); });
  p.appendChild(b);
}

function uiOpenPipeChip(pipe, x, y) {
  uiCloseMenus();
  const p = popupAt(x, y);
  if (pipe.lanes < CONFIG.maxLanes) {
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
    if (Sim.goalIndex >= h.gate.goal) { uiShowHint(h); break; }
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
  UI.els.endStats.innerHTML = `
    <div><span>Time</span><b>${mm}:${String(ss).padStart(2, '0')}</b></div>
    <div><span>O banked</span><b style="color:${ELEMENTS.O.color}">${fmt(Sim.lifetime.O)}</b></div>
    <div><span>CO₂ banked</span><b style="color:${ELEMENTS.CO2.color}">${fmt(Sim.lifetime.CO2)}</b></div>
    <div><span>Peak intake</span><b>${fmt(Sim.peakIntake)}/s</b></div>`;
  UI.els.endcard.classList.add('show');
}
