// Scripted fixture checks for the throwaway prototype. Open index.html?checks=1 (or run headless with --dump-dom).
// They exercise the prototype's in-memory model and UI wiring only; they are not production tests.
(() => {
  const results = [];
  const ok = (name, cond) => results.push(`${cond ? 'PASS' : 'FAIL'} ${name}`);
  const q = sel => app.querySelector(sel) || modal.querySelector(sel);
  const click = sel => { const el = q(sel); if (!el) throw new Error(`missing ${sel}`); el.click(); };
  const dlg = () => modal.open ? modal.textContent : '';
  const overflow = () => app.scrollWidth > app.clientWidth + 1 || document.documentElement.scrollWidth > innerWidth + 1;
  try {
    // Late entry: open before eliminations, closed while any remain, open again after all are undone.
    load('open');
    ok('entry open with no eliminations', !q('[data-action="add-player"][aria-disabled]') && !!q('[data-action="add-player"]'));
    click('[data-action="out"][data-name="Clara"]');
    ok('first Out popup says late entry closes', /Late entry\s*Closes/.test(dlg()) && /finishes 6th/.test(dlg()));
    click('[data-action="close"]');
    ok('cancelled Out changes nothing', s.order.length === 0);
    click('[data-action="out"][data-name="Clara"]'); click('[data-action="confirm-out"]');
    ok('Clara out 6th', placeOf('Clara') === 6 && !modal.open);
    ok('elimination returns no bank chips (reserve unchanged)', s.reserveUsed === 1);
    ok('entry closed after an elimination', !!q('[data-action="entry-closed"][aria-disabled="true"]'));
    click('[data-action="entry-closed"]');
    ok('blocked entry explains and adds nobody', /Can’t add a player now/.test(dlg()) && N() === 6);
    click('[data-action="close"]');
    click('[data-action="out"][data-name="Felix"]'); click('[data-action="confirm-out"]');
    click('[data-action="tab"][data-page="results"]'); click('[data-action="edit-order"]');
    click('[data-action="draft-undo"][data-name="Felix"]');
    ok('undoing some eliminations keeps entry closed (draft not saved yet)', !entryOpen());
    click('[data-action="save-order"]'); click('[data-action="confirm-save"]');
    ok('one elimination left still blocks entry', !entryOpen() && s.order.join() === 'Clara');
    click('[data-action="edit-order"]'); click('[data-action="draft-undo"][data-name="Clara"]'); click('[data-action="save-order"]');
    ok('save popup says late entry opens again', /Late entry\s*Opens again/.test(dlg()));
    click('[data-action="confirm-save"]');
    ok('all undone reopens entry', entryOpen());
    click('[data-action="tab"][data-page="play"]');
    click('[data-action="add-player"]'); app.querySelector('input[value="Greta"]').click();
    click('[data-action="review-entry"]'); click('[data-action="confirm-add"]');
    ok('late entry adds player and buy-in', N() === 7 && pool() === 16000 && SHARES.length === 2);

    // Simultaneous knockouts with an explicit order.
    load('midway');
    click('[data-action="out"][data-name="Bob"]'); click('[data-action="same-hand"]');
    modal.querySelector('input[value="Clara"]').click();
    ok('same-hand lists two places', /3rd\s*Bob/.test(dlg()) && /4th\s*Clara/.test(dlg()));
    click('[data-action="same-down"][data-i="0"]');
    click('[data-action="confirm-same"]');
    ok('host-chosen order: Clara 3rd, Bob 4th', placeOf('Clara') === 3 && placeOf('Bob') === 4);

    // Missed elimination and reordering, saved only on confirmation.
    load('midway');
    click('[data-action="tab"][data-page="results"]'); click('[data-action="edit-order"]');
    click('[data-action="missed"]');
    modal.querySelector('input[name="miss-who"][value="Emma"]').click();
    modal.querySelector('input[name="miss-at"][value="1"]').click();
    click('[data-action="confirm-missed"]');
    ok('draft inserts Emma between Felix and David', view.draft.join() === 'Felix,Emma,David' && s.order.join() === 'Felix,David');
    click('[data-action="mv-down"][data-name="David"]');
    ok('move down swaps in draft', view.draft.join() === 'Felix,David,Emma');
    click('[data-action="cancel-edit"]');
    ok('cancel with changes asks to discard', /Discard order changes/.test(dlg()));
    click('[data-action="confirm-discard"]');
    ok('discard leaves saved order', s.order.join() === 'Felix,David');

    // Derived winner, no auto-complete, withdrawal after undo.
    load('heads');
    click('[data-action="out"][data-name="Clara"]');
    ok('Out popup previews the winner', /Alice is the last player left and wins/.test(dlg()));
    click('[data-action="confirm-out"]');
    ok('winner derived, game still In progress', winnerOf() === 'Alice' && s.phase === 'In progress');
    click('[data-action="tab"][data-page="results"]');
    ok('Calculate Payments primary when complete', !!q('[data-action="calc"]'));
    click('[data-action="player"][data-name="Clara"]'); click('[data-action="back-in"]');
    ok('Back in popup withdraws the winner', /Winner\s*Alice · none yet/.test(dlg()));
    click('[data-action="confirm-back-in"]');
    ok('winner withdrawn; Clara active', !winnerOf() && placeOf('Clara') === null);
    click('[data-action="tab"][data-page="results"]');
    ok('Calculate blocked with reason', !!q('[data-action="calc-blocked"][aria-disabled="true"]') && /one player is left/.test(app.textContent));
    click('[data-action="calc-blocked"]');
    ok('blocked Calculate explains and changes nothing', /Can’t calculate Payments yet/.test(dlg()) && s.phase === 'In progress');
    click('[data-action="close-status"]');

    // Return to play versus forgotten historical rebuy.
    load('midway');
    click('[data-action="player"][data-name="David"]');
    ok('eliminated player has no fresh Rebuy', !q('[data-action="rebuy"]') && !!q('[data-action="back-in"]'));
    click('[data-action="forgotten"]'); click('[data-action="review-forgotten"]');
    ok('forgotten rebuy popup keeps elimination', /Stays out · 5th/.test(dlg()) && /EUR 140.00 → EUR 160.00/.test(dlg()));
    click('[data-action="confirm-forgotten"]');
    ok('forgotten rebuy: place kept, pool up, tag', placeOf('David') === 5 && pool() === 16000 && P('David').recs[1].tag === 'added later');
    ok('payouts follow the pool (70/30 of 160)', prizes(pool()).join() === '11200,4800');
    click('[data-action="back-in"]'); click('[data-action="confirm-back-in"]');
    ok('back in: active with Out and + Rebuy', placeOf('David') === null && !!q('[data-action="rebuy"][data-name="David"]'));

    // Cent rule: first place downward.
    ok('cent leftovers go to 1st first', prizes(2001).join() === '1401,600');

    // Completion, Payments, reopen.
    load('winner');
    click('[data-action="tab"][data-page="results"]'); click('[data-action="calc"]'); click('[data-action="close"]');
    ok('Cancel Calculate changes nothing', s.phase === 'In progress');
    click('[data-action="calc"]'); click('[data-action="confirm-calc"]');
    const bals = balances(), pays = settle(bals);
    ok('Completed opens Payments', s.phase === 'Completed' && view.page === 'payments');
    ok('balances sum to zero', sum(bals.map(x => x.bal)) === 0);
    ok('payments settle every balance', sum(pays.map(x => x.v)) === sum(bals.filter(x => x.bal > 0).map(x => x.bal)));
    click('[data-action="tab"][data-page="results"]');
    ok('Completed Results read-only', !q('[data-action="edit-order"]') && !q('[data-action="calc"]'));
    click('[data-action="menu"]');
    ok('Completed menu: Reopen + Delete only', !!q('[data-action="reopen"]') && !q('[data-action="reset"]'));
    click('[data-action="reopen"]'); click('[data-action="confirm-reopen"]');
    ok('reopen returns to In progress Results', s.phase === 'In progress' && view.page === 'results' && /Reopened/.test(app.textContent));

    // Layout: no horizontal overflow in every scenario and layout at the current width/text size.
    const bad = [];
    for (const v of ['A','B','C']) { variant = v; for (const k of Object.keys(SCENARIOS)) { load(k); if (overflow()) bad.push(`${v}/${k}`); } }
    ok(`no horizontal overflow at ${innerWidth}px, text ${scale}× (${bad.join(', ') || 'all clear'})`, !bad.length);
  } catch (e) { results.push(`FAIL exception: ${e.message}`); }
  const pre = document.createElement('pre'); pre.id = 'checks'; pre.textContent = results.join('\n'); document.body.append(pre);
  document.title = results.some(r => r.startsWith('FAIL')) ? 'CHECKS FAILED' : `CHECKS PASSED (${results.length})`;
})();
