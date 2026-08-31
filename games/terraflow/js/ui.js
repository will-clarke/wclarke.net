// DOM UI: status strip, hints, bottom sheet, popup menus, end card.

const UI = {
  els: {}, shownHints: new Set(), endShown: false, resetArmed: false,
};

function uiInit() {
  const $ = id => document.getElementById(id);
  UI.els = {
    game: $('game'), currency: $('strip-currency'), rate: $('strip-rate'),
    hint: $('hint'), sheet: $('sheet'), handle: $('sheet-handle'),
    upgrades: $('upgrades'), popup: $('popup'), endcard: $('endcard'),
    endStats: $('end-stats'), reset: $('btn-reset'),
  };

  UI.els.handle.addEventListener('click', () => UI.els.sheet.classList.toggle('open'));
  // swipe on handle
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

// --- status strip + periodic refresh ------------------------------------------

let _lastStrip = '';
function uiUpdate() {
  const s = fmt(Math.floor(Sim.currency)) + '|' + fmt(Sim.incomeEMA);
  if (s !== _lastStrip) {
    _lastStrip = s;
    UI.els.currency.textContent = '⬢ ' + fmt(Math.floor(Sim.currency));
    UI.els.rate.textContent = '▲ ' + fmt(Sim.incomeEMA) + '/s';
  }
  refreshUpgradeRows();
  if (!UI.endShown && !Sim.ended && Sim.totalEarned >= CONFIG.endTarget) uiShowEndCard();
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
      const cost = upgradeCost(key);
      if (spend(cost)) {
        Sim.upgrades[key]++;
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
    const cost = upgradeCost(key);
    const btn = row.querySelector('.upg-buy');
    const txt = '⬢ ' + fmt(cost);
    if (btn.textContent !== txt) btn.textContent = txt;
    btn.disabled = Sim.currency < cost;
    const lvl = row.querySelector('.upg-lvl');
    const ltxt = Sim.upgrades[key] > 0 ? 'lv' + Sim.upgrades[key] : '';
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
  const cost = laneCost(pipe);
  if (pipe.lanes < CONFIG.maxLanes) {
    const b = document.createElement('button');
    b.className = 'pop-btn';
    b.textContent = `+ Lane (⬢ ${fmt(cost)})`;
    b.disabled = Sim.currency < cost;
    b.addEventListener('click', () => {
      if (spend(laneCost(pipe))) { addLane(pipe); uiHintDone('lanes'); }
      uiCloseMenus();
    });
    p.appendChild(b);
  }
  const del = document.createElement('button');
  del.className = 'pop-btn danger';
  del.textContent = '✕ Remove pipe';
  del.addEventListener('click', () => { removePipe(pipe); uiCloseMenus(); });
  p.appendChild(del);
}

// --- hints -----------------------------------------------------------------------

let _hintTimer = null;
function uiCheckHints() {
  for (const h of HINTS) {
    if (UI.shownHints.has(h.id)) continue;
    if (Sim.totalEarned >= h.gate.earned) { uiShowHint(h); break; }
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
  Sim.ended = true;
  const mm = Math.floor(Sim.time / 60), ss = Math.floor(Sim.time % 60);
  UI.els.endStats.innerHTML = `
    <div><span>Time</span><b>${mm}:${String(ss).padStart(2, '0')}</b></div>
    <div><span>Total earned</span><b>⬢ ${fmt(Sim.totalEarned)}</b></div>
    <div><span>Peak income</span><b>${fmt(Sim.peakIncome)}/s</b></div>`;
  UI.els.endcard.classList.add('show');
}
