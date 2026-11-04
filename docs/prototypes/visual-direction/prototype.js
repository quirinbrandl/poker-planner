// THROWAWAY: independent screen compositions with shared fixtures and control semantics.
// No storage, network, distribution solver, or production application integration.
const directions = {
  A: { name: 'Margin', theme: 'light', note: 'A / Margin — Warm paper, editorial typography, open ledger rows. More breathing room; the content carries the character.' },
  B: { name: 'Current', theme: 'dark', note: 'B / Current — Deep slate, citron accents, a prominent active-game card and grouped controls. Strong surfaces, lower action placement.' },
  C: { name: 'Contour', theme: 'light', note: 'C / Contour — Lilac, compact agenda rows and label/value alignment. Clear next actions and a visible step marker.' },
};
const params = new URLSearchParams(location.search);
const state = {
  variant: directions[params.get('variant')] ? params.get('variant') : 'B',
  screen: params.get('screen') === 'settings' ? 'settings' : 'games',
  scenario: 'populated', appearance: 'designed', scale: 1, buyin: '20.00', depth: '100',
  preference: 'min', coverage: '4', reserve: '3', reserveMode: 'auto', advanced: false,
  error: false, planDeleted: false, modal: null,
};
const app = document.querySelector('#app');
const dialog = document.querySelector('#dialog');
const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const button = (label, action, kind = '', extra = '') => `<button type="button" class="${kind}" data-action="${action}" ${extra}>${label}</button>`;
const badge = (text, kind = '') => `<span class="badge ${kind}">${text}</span>`;
const announce = text => { document.querySelector('#announcement').textContent = text; };
function inspect() {
  document.querySelector('#state').textContent = JSON.stringify({ ...state, actualAppearance: appearance(), persistence: 'In-memory fixture only; never saved to device', initialChipsIssued: false }, null, 2);
}
function appearance() {
  return state.appearance === 'designed' ? directions[state.variant].theme : state.appearance === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : state.appearance;
}
function setAppearance(element) {
  element.className = `variant-${state.variant}${state.scale > 1 ? ' large-text' : ''}`;
  element.dataset.theme = appearance();
  element.style.setProperty('--scale', state.scale);
}
const names = 'Maya, Jonas, Sofia, Noah, Lena & Erik';
function topbar(settings = false) {
  return `<div class="topline">${settings ? button('← Games', 'games', 'quiet') : '<span class="brand">POKER PLANNER</span>'}${!settings && state.variant === 'B' ? button('＋ New game', 'new') : button(settings ? '•••' : 'Library', settings ? 'menu' : 'library', 'quiet', settings ? 'aria-label="Game actions"' : '')}</div>`;
}
function section(title, count) { return `<div class="section-label"><h3>${title}</h3><span>${count}</span></div>`; }
function secondaryNav() {
  return `<nav class="secondary-nav" aria-label="Other destinations">${button('History <span aria-hidden="true">↗</span>', 'history', 'quiet')}${button('Saved players <span aria-hidden="true">↗</span>', 'players', 'quiet')}${button('Chip set templates <span aria-hidden="true">↗</span>', 'templates', 'quiet')}</nav>`;
}
function planningRows(style) {
  const cash = state.planDeleted ? '' : button(`${badge('Planning')}<strong>Cash game</strong><small>3 Nov 2026 · 19:30</small><small>Maya, Jonas, Sofia +3</small><span class="${style === 'C' ? 'next-action' : 'field-hint'}">${state.error ? 'Needs attention · buy-in' : 'Resume Game settings'} <span aria-hidden="true">→</span></span>`, 'settings', 'game-link');
  return cash + button(`${badge('Planning')}<strong>Tournament</strong><small>2 Nov 2026 · 18:00</small><small>Emil, Alex, Freya +5</small><span class="${style === 'C' ? 'next-action' : 'field-hint'}">Resume Players <span aria-hidden="true">→</span></span>`, 'tournament', 'game-link');
}
function emptyGames() {
  return `<div class="page">${topbar()}<p class="eyebrow">Your table starts here</p><h2 class="${state.variant === 'A' ? 'editorial-title' : ''}">Games</h2><p class="muted">No games yet. Set up a cash game or tournament for your next get-together.</p>${button('New game', 'new', 'primary full')}${secondaryNav()}</div>`;
}
function VariantA() {
  if (state.screen === 'settings') return settingsA();
  return `<div class="page">${topbar()}<p class="eyebrow">Games / At your table</p><h2 class="editorial-title">Good company.<br>Great games.</h2><p class="lede">Your games, ready when you are.</p>${button('＋ New game', 'new', 'primary full')}${section('In progress', '1 game')}${button(`<div class="list-heading">${badge('In progress', 'active')}<span>1 Nov 2026 · 19:30</span></div><strong>Cash game <span aria-hidden="true">↗</span></strong><small>Maya, Jonas, Sofia +3</small><div class="facts"><div><strong>6</strong><small>players</small></div><div><strong class="numeric">€160.00</strong><small>contributions</small></div></div>`, 'play', 'game-link')}${section('Planning', `${state.planDeleted ? 1 : 2} games`)}${planningRows('A')}${secondaryNav()}</div>`;
}
function VariantB() {
  if (state.screen === 'settings') return settingsB();
  return `<div class="page">${topbar()}<p class="eyebrow">Make a night of it</p><h2>Your games.</h2>${section('In progress', '1 game')}<section class="active-card" aria-label="In progress cash game">${badge('In progress', 'active')}<h3>Cash game</h3><p class="small muted">1 Nov 2026 · 19:30</p><div class="avatars" aria-hidden="true"><span>M</span><span>J</span><span>S</span><span>+3</span></div><p class="small">Maya, Jonas, Sofia +3</p><div class="facts"><div><strong>6</strong><small>players</small></div><div><strong class="numeric">€160.00</strong><small>contributions</small></div></div>${button('Back to Play →', 'play', 'primary full')}</section>${section('Planning', `${state.planDeleted ? 1 : 2} games`)}${planningRows('B')}${secondaryNav()}</div>`;
}
function VariantC() {
  if (state.screen === 'settings') return settingsC();
  return `<div class="page">${topbar()}<div class="compact-masthead"><h2>Games</h2>${button('＋ New game', 'new', 'primary')}</div>${section('In progress', '1 game')}<div class="agenda">${button(`${badge('In progress', 'active')}<strong>Cash game</strong><small>1 Nov 2026 · 19:30</small><small>Maya, Jonas, Sofia +3</small><small>6 players · €160.00 contributions</small><span class="next-action">Return to Play <span aria-hidden="true">→</span></span>`, 'play', 'game-link')}</div>${section('Planning', `${state.planDeleted ? 1 : 2} games`)}<div class="agenda">${planningRows('C')}</div>${secondaryNav()}</div>`;
}
function context() { return `<div class="context"><strong>Cash game</strong> · 3 Nov 2026, 19:30<div class="status-line">${badge('Planning')}${badge('Draft', 'warning')}</div></div>`; }
function stepRoute() { return `<div class="step-route"><span>Step 4 of 5</span>${button('Earlier steps', 'steps', 'quiet')}</div>`; }
function field(key, title, unit, hint) {
  return `<label class="field" for="${key}"><span class="field-title" id="${key}-label">${title}</span><span class="input-wrap"><input id="${key}" data-field="${key}" value="${escapeHTML(state[key])}" inputmode="${key === 'buyin' ? 'decimal' : 'numeric'}" type="text" autocomplete="off" spellcheck="false" aria-labelledby="${key}-label" aria-describedby="${key}-hint ${key}-error" aria-invalid="false"><span aria-hidden="true">${unit}</span></span><span class="field-hint" id="${key}-hint">${hint}</span><span class="field-error" id="${key}-error"></span></label>`;
}
function buyin() { return field('buyin', 'Buy-in · EUR', 'EUR', 'The same amount for every player.'); }
function depth() { return field('depth', 'Starting stack depth · BB', 'BB', '100 BB recommended. Blinds and chip units follow in the preview.'); }
function preference() {
  return `<fieldset><legend>Physical chips per starting stack</legend><label class="choice"><input type="radio" name="preference" value="min" ${state.preference === 'min' ? 'checked' : ''}><span><strong>Fewer chips</strong><small>Keep each stack easier to handle.</small></span></label><label class="choice"><input type="radio" name="preference" value="max" ${state.preference === 'max' ? 'checked' : ''}><span><strong>More chips</strong><small>Use more of the available chips.</small></span></label><span class="field-hint">Both must meet stack value, blind-payment coverage and reserve requirements.</span></fieldset>`;
}
function advanced() {
  return `<details class="advanced" ${state.advanced ? 'open' : ''}><summary>Advanced · coverage & reserve</summary>${field('coverage', 'Blind-payment coverage', 'pairs', 'Separate chips for this many small blinds and big blinds. Default 4; minimum 1.')}<fieldset><legend>Chip reserve</legend><label class="choice"><input type="radio" name="reserveMode" value="auto" ${state.reserveMode === 'auto' ? 'checked' : ''}><span><strong>Automatic · 3 additional stacks</strong><small>Half of 6 players, rounded up.</small></span></label><label class="choice"><input type="radio" name="reserveMode" value="custom" ${state.reserveMode === 'custom' ? 'checked' : ''}><span><strong>Choose a stack count</strong><small>Shared by rebuys and late arrivals.</small></span></label></fieldset>${state.reserveMode === 'custom' ? field('reserve', 'Reserve · additional stacks', 'stacks', 'Zero is allowed. Your choice is retained when players change.') : ''}<p class="small muted">Reserve means capacity, not a separate pile of chips or a rebuy limit.</p></details>`;
}
function footer() {
  return `<div class="save-line" id="save-line">✓ Draft retained in this demo · no chips issued</div><div id="validation-summary"></div><div class="action-row">${button('← Back', 'back', 'quiet')}${button('Continue →', 'continue', 'primary')}</div>`;
}
function settingsA() {
  return `<div class="page">${topbar(true)}${context()}${stepRoute()}<h2 class="setting-heading">Set the stakes.</h2><p class="small muted">Game settings · 6 players</p><form novalidate>${buyin()}${depth()}${preference()}${advanced()}${footer()}</form></div>`;
}
function settingsB() {
  return `<div class="page">${topbar(true)}${context()}${stepRoute()}<h2 class="setting-heading">Game settings</h2><p class="small muted">One buy-in. Equal starting stacks.</p><p class="small">${names}</p><form novalidate><div class="field-group">${buyin()}${depth()}</div>${preference()}${advanced()}<div class="dock">${footer()}</div></form></div>`;
}
function settingsC() {
  return `<div class="page">${topbar(true)}${context()}<div class="step-heading"><span class="step-number" aria-hidden="true">04</span><div><p class="eyebrow">Step 4 of 5</p><h2>Game settings</h2></div></div><div class="summary-strip">6 players · ${names}</div>${button('Earlier steps', 'steps', 'quiet')}<form novalidate>${buyin()}${depth()}${preference()}${advanced()}${footer()}</form></div>`;
}
function errors() {
  const result = {};
  if (!/^\d+([.,]\d{1,2})?$/.test(state.buyin) || Number(state.buyin.replace(',', '.')) <= 0) result.buyin = 'Enter a positive EUR amount with at most 2 decimal places, e.g. 20.00.';
  for (const [key, label] of [['depth', 'a positive whole number of BB'], ['coverage', 'a positive whole-number coverage']]) {
    if (!/^\d+$/.test(state[key]) || Number(state[key]) < 1) result[key] = `Enter ${label}; the minimum is 1.`;
  }
  if (state.reserveMode === 'custom' && !/^\d+$/.test(state.reserve)) result.reserve = 'Enter a whole number of additional stacks, including zero.';
  return result;
}
function showValidation(focus = false) {
  if (!state.error || state.screen !== 'settings') return;
  const problems = errors();
  for (const key of ['buyin', 'depth', 'coverage', 'reserve']) {
    const input = document.getElementById(key);
    if (!input) continue;
    input.setAttribute('aria-invalid', String(!!problems[key]));
    document.getElementById(`${key}-error`).textContent = problems[key] ? `! ${problems[key]}` : '';
  }
  document.querySelector('#validation-summary').innerHTML = Object.keys(problems).length ? '<div class="notice error"><strong>Check the highlighted fields.</strong>Your entered values are retained. Back and Games are still available.</div>' : '';
  if (focus && Object.keys(problems).length) {
    const first = document.getElementById(Object.keys(problems)[0]);
    const details = first.closest('details');
    if (details) details.open = true;
    first.focus();
    announce('Continue blocked. Check the highlighted fields. Your draft is retained.');
  }
}
function render() {
  setAppearance(app);
  document.querySelector('#screen').value = state.screen;
  document.querySelector('#scenario').value = state.scenario;
  document.querySelector('#theme').value = state.appearance;
  document.querySelector('#text-size').value = state.scale;
  document.querySelector('#variant-label').textContent = `${state.variant} · ${directions[state.variant].name}`;
  document.querySelector('#direction-note').textContent = directions[state.variant].note;
  app.innerHTML = state.screen === 'games' && state.scenario === 'empty' ? emptyGames() : ({ A: VariantA, B: VariantB, C: VariantC }[state.variant])();
  document.querySelector('.advanced')?.addEventListener('toggle', event => { state.advanced = event.target.open; inspect(); });
  showValidation();
  const url = new URL(location.href);
  url.searchParams.set('variant', state.variant);
  url.searchParams.set('screen', state.screen);
  history.replaceState(null, '', url);
  inspect();
}
function switchVariant(delta) {
  const keys = Object.keys(directions);
  state.variant = keys[(keys.indexOf(state.variant) + delta + keys.length) % keys.length];
  render();
  if (dialog.open) openDialog(state.modal);
  announce(`${directions[state.variant].name} visual direction. ${appearance()} appearance. Draft values retained.`);
}
const dialogCopy = {
  play: ['Cash game · In progress', `<p>1 Nov 2026 · 19:30</p><p>${names}</p><div class="facts"><div><strong>€160.00</strong><small>Contributions · 6 buy-ins + 2 rebuys</small></div><div><strong>1 / 2</strong><small>Small / big blind · chip units</small></div></div><div class="notice info"><strong>Destination preview</strong>Play, Results and Game details belong here. Player workflows will be designed in the next prototype; this sample only compares visual direction.</div>`],
  tournament: ['Tournament · Planning', '<p>2 Nov 2026 · 18:00<br>Emil, Alex, Freya +5</p><p>This game resumes at Players. Tournament workflows are a later design ticket.</p>'],
  history: ['History', `<p>Completed games open Payments with read-only Results and Game details.</p>${badge('Completed', 'saved')}<p>Cash game · 25 Oct 2026, 19:00<br>Maya, Jonas & Sofia</p><p>Example Payments: Jonas pays Maya €10.00.</p><div class="notice info">Instructions say what is owed; they do not record money already transferred. Full history layouts are a later prototype.</div>`],
  players: ['Saved players', '<p>Maya · Jonas · Sofia · Noah · Lena · Erik</p><p>Reusable-player editing is a later prototype. Existing games retain their own copies.</p>'],
  templates: ['Chip set templates', '<p>Home set · denominations 1, 5, 25 chip units.</p><p>Template editing is a later prototype. A game uses its own independent copy.</p>'],
  back: ['Chip set · previous step', '<p>Back returns to the previous wizard step and retains the raw Game settings draft, including invalid values.</p><p>This visual study includes Game settings only; the other steps are designed later.</p>'],
  preview: ['Distribution preview · next step', '<p>The current Game settings fields are valid. The full plan and distribution still need validation.</p><div class="notice info"><strong>No chips issued.</strong>A production preview must check the roster, chip set, allocation and reserve. There is no distribution solver in this visual prototype.</div>'],
};
function patterns() {
  return `<p>Shared control proposals in ${directions[state.variant].name}. Examples are separate fixtures, not one game changing phase.</p><section class="pattern-section"><h3>Actions & confirmation</h3><div class="stack">${button('Primary action', 'sample-primary', 'primary')}${button('Secondary action', 'sample-secondary')}${button('Delete game…', 'delete', 'danger')}</div><p class="field-hint">Consequential actions use an explicit verb. Confirmations offer an equally reachable Cancel.</p></section><section class="pattern-section"><h3>Text & numeric inputs</h3><label class="field"><span class="field-title">Player name</span><span class="input-wrap"><input aria-label="Player name" value="Maya" autocomplete="off"></span><span class="field-hint">Persistent labels; never placeholder-only.</span></label><div class="chip-example"><span>20 × 1-unit chips</span><strong>20 units</strong><span>6 × 5-unit chips</span><strong>30 units</strong><span>6 × 25-unit chips</span><strong>150 units</strong><span>Starting stack</span><strong>200 chip units</strong></div><p class="field-hint">€20.00 buy-in · 100 BB · 1/2-unit blinds. Units and EUR are always explicit.</p></section><section class="pattern-section"><h3>Status is written, not just colored</h3><div class="sample-results"><div>${badge('Draft', 'warning')}<strong>Maya · count unfinished</strong><span class="field-hint">Not confirmed. No chips returned.</span></div><div>${badge('Confirmed result', 'saved')}<strong>Maya · 300 chip units</strong><span class="field-hint">€30.00 · provisional monetary result<br>Final Payments need whole-game validation.</span></div><div>${badge('Completed', 'saved')}<strong>Payments · final</strong><span class="field-hint">Jonas pays Maya €10.00.<br>Read-only instructions, not a payment receipt.</span></div></div></section><section class="pattern-section"><h3>Blocked, explained, recoverable</h3><div id="blocked-reason" class="notice"><strong>2 players still need final counts.</strong>Confirm Sofia and Noah’s results before calculating Payments. Existing results are retained.</div>${button('Calculate Payments · blocked', 'blocked', 'full', 'aria-disabled="true" aria-describedby="blocked-reason"')}<p class="field-hint">A blocked action stays discoverable, explains why, and never changes records.</p></section><section class="pattern-section"><h3>Restrained feedback</h3><p>Short color feedback on press. No animated numbers, bouncing controls, celebratory effects or automatic motion. Reduced motion removes press displacement.</p></section>`;
}
function openDialog(kind) {
  state.modal = kind;
  let title, content, actions = button('Close', 'close', 'primary full');
  if (kind === 'patterns') { title = 'Core interaction patterns'; content = patterns(); }
  else if (kind === 'menu') { title = 'Game actions'; content = '<p>Cash game · Planning<br>3 Nov 2026 · 19:30</p>'; actions = `<div class="stack">${button('Delete game…', 'delete', 'danger')}${button('Cancel', 'close')}</div>`; }
  else if (kind === 'delete') {
    title = 'Delete this game?';
    content = '<p>Cash game · Planning<br>3 Nov 2026 · 19:30<br>Maya, Jonas, Sofia +3</p><p>Permanently delete this game and its records. Saved players, chip set templates and other games are kept.</p><p class="field-hint">Prototype: only this fixture is removed. Reset fixtures restores it.</p>';
    actions = `<div class="stack">${button('Cancel', 'close', '', 'autofocus')}${button('Delete game', 'confirm-delete', 'danger')}</div>`;
  } else if (kind === 'library') {
    title = 'Your library'; content = '<p>Reusable records and completed games.</p>';
    actions = `<div class="stack">${button('History', 'history')}${button('Saved players', 'players')}${button('Chip set templates', 'templates')}${button('Close', 'close', 'quiet')}</div>`;
  } else if (kind === 'steps') {
    title = 'Earlier setup steps'; content = '<p>Choose mode → Players → Chip set → Game settings → Distribution preview</p><p>Earlier steps stay reachable; visiting one does not clear later entries. Other step layouts belong to upcoming prototypes.</p>';
  } else if (kind === 'new') {
    title = 'New game'; content = '<p>Choose a mode to begin an autosaved Planning game.</p><div class="notice info">This study jumps to a populated cash-game settings fixture. The full wizard is a later prototype.</div>';
    actions = `<div class="stack">${button('Preview cash-game settings', 'settings', 'primary')}${button('Cancel', 'close')}</div>`;
  } else { [title, content] = dialogCopy[kind]; }
  setAppearance(dialog);
  document.querySelector('#dialog-content').innerHTML = `<h2 id="dialog-title" tabindex="-1">${title}</h2>${content}<div class="action-row">${actions}</div>`;
  if (!dialog.open) dialog.showModal();
  if (kind !== 'delete') document.querySelector('#dialog-title').focus();
  else dialog.querySelector('[autofocus]').focus();
  inspect();
}
function navigate(screen) {
  if (dialog.open) dialog.close();
  state.screen = screen;
  render();
  app.focus();
  app.scrollIntoView({ behavior: 'instant', block: 'start' });
}
document.addEventListener('click', event => {
  const control = event.target.closest('[data-action]');
  if (!control) return;
  const action = control.dataset.action;
  if (action === 'games' || action === 'settings') { navigate(action); return; }
  if (action === 'close') { dialog.close(); return; }
  if (action === 'blocked') { announce('Calculate Payments is blocked. Sofia and Noah still need confirmed final counts.'); return; }
  if (action.startsWith('sample-')) { announce('Visual feedback example only; no game records changed.'); return; }
  if (action === 'confirm-delete') { state.planDeleted = true; dialog.close(); navigate('games'); announce('Example Planning game deleted. Reset fixtures restores it.'); return; }
  if (action === 'continue') {
    state.error = true;
    showValidation(true);
    if (!Object.keys(errors()).length) openDialog('preview');
    inspect();
    return;
  }
  openDialog(action);
});
document.addEventListener('input', event => {
  const field = event.target.dataset.field;
  if (field) { state[field] = event.target.value; showValidation(); inspect(); }
});
document.addEventListener('change', event => {
  if (event.target.name === 'preference') state.preference = event.target.value;
  if (event.target.name === 'reserveMode') {
    state.reserveMode = event.target.value;
    render();
    app.querySelector(`input[name="reserveMode"][value="${state.reserveMode}"]`).focus();
  }
  inspect();
});
document.addEventListener('submit', event => { event.preventDefault(); app.querySelector('[data-action="continue"]')?.click(); });
dialog.addEventListener('close', () => { state.modal = null; inspect(); });
document.querySelector('#previous').onclick = () => switchVariant(-1);
document.querySelector('#next').onclick = () => switchVariant(1);
document.querySelector('#patterns').onclick = () => openDialog('patterns');
document.querySelector('#screen').onchange = event => { state.screen = event.target.value; render(); };
document.querySelector('#theme').onchange = event => { state.appearance = event.target.value; render(); };
document.querySelector('#text-size').onchange = event => { state.scale = Number(event.target.value); render(); };
function resetFixtures() {
  Object.assign(state, { buyin: '20.00', depth: '100', coverage: '4', reserve: '3', reserveMode: 'auto', preference: 'min', planDeleted: false, error: false, advanced: false });
}
document.querySelector('#reset').onclick = () => { resetFixtures(); state.scenario = 'populated'; render(); announce('Example fixtures restored.'); };
document.querySelector('#scenario').onchange = event => {
  resetFixtures(); state.scenario = event.target.value;
  if (state.scenario === 'invalid') { state.buyin = '20.005'; state.error = true; state.advanced = true; state.screen = 'settings'; }
  if (state.scenario === 'empty') { state.buyin = ''; state.depth = ''; }
  render();
};
document.addEventListener('keydown', event => {
  if (dialog.open || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.target.closest('input, textarea, select, [contenteditable], [role="slider"]')) return;
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); switchVariant(event.key === 'ArrowLeft' ? -1 : 1); }
});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (state.appearance === 'system') { render(); if (dialog.open) openDialog(state.modal); } });
render();
