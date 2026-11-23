import type { ChipRowInput, GameManagement } from '@/game-management';

import { addChipRows, createTestHarness, expectStatus, gameWithPlayers, type TestHarness } from '../support/game-management';

let harness: TestHarness;
let app: GameManagement;

beforeEach(async () => {
  harness = await createTestHarness();
  app = await harness.open();
});
afterEach(() => harness.cleanup());

const rows = (...entries: [string, string, ChipRowInput['color']?][]): ChipRowInput[] =>
  entries.map(([valueText, quantityText, color = null], i) => ({ id: `r${i}`, valueText, quantityText, color }));

const gameRows = (gameId: string) =>
  app.planning.getView(gameId)!.chipSet.rows.map((r) => [r.value.text, r.quantity.text, r.color]);

async function createTemplate(name: string, input: ChipRowInput[]) {
  return expectStatus(await app.templates.create({ name, rows: input }), 'accepted').templateId;
}

/** A game on the Chip set step. */
async function gameOnChipSet() {
  const gameId = await gameWithPlayers(app, 'cash', ['Alice', 'Bob']);
  expectStatus(await app.planning.continueFromStep(gameId, 'players'), 'accepted');
  return gameId;
}

describe('template management', () => {
  it('lists templates alphabetically with picker summaries, across restart', async () => {
    await createTemplate('  Home case ', rows(['1', '100', 'white'], ['5', '50', 'red']));
    await createTemplate('Big', rows(['25', '20']));
    app = await harness.restart(app);

    const list = app.templates.list();
    expect(list.map((t) => t.name)).toEqual(['Big', 'Home case']);
    expect(list[1].summary).toEqual({
      kind: 'valid',
      denominations: 2,
      chips: 150,
      chipUnits: 350,
      label: '2 denominations · 150 chips · 350 chip units',
    });
    expect(list[1].denominations).toEqual([
      { value: 1, quantity: 100, color: 'white' },
      { value: 5, quantity: 50, color: 'red' },
    ]);
  });

  it('rejects blank and duplicate names and invalid rows without changing anything', async () => {
    const id = await createTemplate('Home', rows(['1', '10']));
    const cases: [string, ChipRowInput[], string][] = [
      ['', rows(['1', '10']), 'nameRequired'],
      [' home ', rows(['1', '10']), 'duplicateName'],
      ['Other', [], 'noDenominations'],
      ['Other', rows(['1', '']), 'quantityMissing'],
      ['Other', rows(['1', '1'], ['1', '2']), 'duplicateValue'],
      ['Other', rows(['0', '1']), 'valueNotPositive'],
      ['Other', rows(['2.5', '1']), 'valueNotWholeNumber'],
    ];
    for (const [name, input, code] of cases) {
      const result = expectStatus(await app.templates.create({ name, rows: input }), 'rejected');
      expect(result.reason.code).toBe('invalidTemplate');
      expect(result.reason.problems?.map((p) => p.code)).toContain(code);
    }
    expect(expectStatus(await app.templates.update(id, { name: 'Home', rows: [] }), 'rejected').reason.problems?.[0].code).toBe(
      'noDenominations',
    );
    app = await harness.restart(app);
    expect(app.templates.list().map((t) => [t.name, t.summary.label])).toEqual([['Home', '1 denomination · 10 chips · 10 chip units']]);
  });

  it('edits, renames and deletes', async () => {
    const id = await createTemplate('Home', rows(['1', '10']));
    await createTemplate('Club', rows(['5', '10']));
    expect(app.templates.getEditorDraft(id)).toEqual({ name: 'Home', rows: rows(['1', '10']).map((r, i) => ({ ...r, id: `row-${i + 1}` })) });
    expectStatus(await app.templates.update(id, { name: 'Home v2', rows: rows(['1', '20', 'blue']) }), 'accepted');
    expect(expectStatus(await app.templates.rename(id, 'CLUB'), 'rejected').reason.code).toBe('invalidTemplate');
    expectStatus(await app.templates.rename(id, 'Home'), 'accepted');
    app = await harness.restart(app);
    expect(app.templates.get(id)).toMatchObject({ name: 'Home', denominations: [{ value: 1, quantity: 20, color: 'blue' }] });
    expectStatus(await app.templates.delete(id), 'accepted');
    app = await harness.restart(app);
    expect(app.templates.list().map((t) => t.name)).toEqual(['Club']);
  });

  it('describes unsaved editor rows live without storing them', () => {
    const live = app.templates.describeRows(rows(['1', '10'], ['1', '']));
    expect(live.summary.label).toBe('Incomplete chip set');
    expect(live.rows.r1.value?.message).toBe('Combine quantities in the existing row');
    expect(live.rows.r1.quantity?.code).toBe('quantityMissing');
    expect([live.rows.r0.chipCount, live.rows.r1.chipCount]).toEqual([10, null]);
    expect(app.templates.list()).toEqual([]);
  });
});

describe('using a template in a game', () => {
  it('copies rows and colours into the game and links the source', async () => {
    const templateId = await createTemplate('Home', rows(['1', '100', 'white'], ['5', '50']));
    const gameId = await gameOnChipSet();
    expectStatus(await app.planning.applyTemplate(gameId, templateId), 'accepted');
    app = await harness.restart(app);
    expect(gameRows(gameId)).toEqual([
      ['1', '100', 'white'],
      ['5', '50', null],
    ]);
    expect(app.planning.getView(gameId)!.chipSet.source).toEqual({ kind: 'template', templateId, templateName: 'Home' });
  });

  it('asks before replacing entered rows; declining changes nothing', async () => {
    const templateId = await createTemplate('Home', rows(['1', '100']));
    const gameId = await gameOnChipSet();
    await addChipRows(app, gameId, [['25', '']]);
    const ask = expectStatus(await app.planning.applyTemplate(gameId, templateId), 'needsConfirmation');
    expect(ask.confirmation).toEqual({ kind: 'replaceChipSet', templateName: 'Home' });
    app = await harness.restart(app);
    expect(gameRows(gameId)).toEqual([['25', '', null]]);

    expectStatus(await app.planning.applyTemplate(gameId, templateId, { confirmed: true }), 'accepted');
    expect(gameRows(gameId)).toEqual([['1', '100', null]]);
  });

  it('Save and use creates the template and applies it atomically, after the replace confirmation', async () => {
    const gameId = await gameOnChipSet();
    await addChipRows(app, gameId, [['25', '4']]);
    const input = { name: 'Fresh', rows: rows(['2', '40', 'green']) };
    expectStatus(await app.planning.createTemplateAndApply(gameId, input), 'needsConfirmation');
    expect(app.templates.list()).toEqual([]);
    const invalid = expectStatus(await app.planning.createTemplateAndApply(gameId, { ...input, name: '' }, { confirmed: true }), 'rejected');
    expect(invalid.reason.code).toBe('invalidTemplate');

    const { templateId } = expectStatus(await app.planning.createTemplateAndApply(gameId, input, { confirmed: true }), 'accepted');
    app = await harness.restart(app);
    expect(gameRows(gameId)).toEqual([['2', '40', 'green']]);
    expect(app.templates.get(templateId)?.name).toBe('Fresh');
  });

  it('game copy and template stay independent in both directions', async () => {
    const templateId = await createTemplate('Home', rows(['1', '100']));
    const a = await gameOnChipSet();
    const b = await gameOnChipSet();
    await app.planning.applyTemplate(a, templateId);
    await app.planning.applyTemplate(b, templateId);

    // Game edit (autosave) does not reach the template.
    await app.planning.setChipQuantityText(a, app.planning.getView(a)!.chipSet.rows[0].id, '80');
    expect(app.templates.get(templateId)!.denominations[0].quantity).toBe(100);

    // Template edit does not reach any game.
    await app.templates.update(templateId, { name: 'Home', rows: rows(['1', '300']) });
    app = await harness.restart(app);
    expect(gameRows(a)).toEqual([['1', '80', null]]);
    expect(gameRows(b)).toEqual([['1', '100', null]]);

    // Template deletion keeps the games' copies and shows the source as deleted.
    await app.templates.delete(templateId);
    app = await harness.restart(app);
    expect(gameRows(b)).toEqual([['1', '100', null]]);
    expect(app.planning.getView(b)!.chipSet.source).toEqual({ kind: 'deletedTemplate', templateId });
  });
});

describe('finishing the Chip set step', () => {
  async function gameFromTemplate() {
    const templateId = await createTemplate('Home', rows(['1', '100']));
    const gameId = await gameOnChipSet();
    await app.planning.applyTemplate(gameId, templateId);
    const [row] = app.planning.getView(gameId)!.chipSet.rows;
    await app.planning.setChipQuantityText(gameId, row.id, '60');
    await app.planning.setChipColor(gameId, row.id, 'black');
    return { templateId, gameId };
  }

  it('Only this game leaves every template unchanged', async () => {
    const { templateId, gameId } = await gameFromTemplate();
    const ask = expectStatus(await app.planning.continueFromStep(gameId, 'chipSet'), 'needsConfirmation');
    expect(ask.confirmation).toMatchObject({
      options: ['onlyThisGame', 'updateSourceTemplate'],
      sourceTemplate: { id: templateId, name: 'Home' },
    });
    expectStatus(await app.planning.completeChipSetStep(gameId, { kind: 'onlyThisGame' }), 'accepted');
    app = await harness.restart(app);
    expect(app.templates.get(templateId)!.denominations).toEqual([{ value: 1, quantity: 100, color: null }]);
    expect(app.planning.getView(gameId)!.currentStep).toBe('settings');
  });

  it('Also update template changes the template for future games only', async () => {
    const { templateId, gameId } = await gameFromTemplate();
    const other = await gameOnChipSet();
    await app.planning.applyTemplate(other, templateId);

    const done = expectStatus(await app.planning.completeChipSetStep(gameId, { kind: 'updateSourceTemplate' }), 'accepted');
    expect(done).toMatchObject({ nextStep: 'settings', templateId });
    app = await harness.restart(app);
    expect(app.templates.get(templateId)).toMatchObject({ name: 'Home', denominations: [{ value: 1, quantity: 60, color: 'black' }] });
    expect(gameRows(other)).toEqual([['1', '100', null]]);
  });

  it('with a deleted source offers Save as new template and never recreates the source', async () => {
    const { templateId, gameId } = await gameFromTemplate();
    await app.templates.delete(templateId);

    const ask = expectStatus(await app.planning.continueFromStep(gameId, 'chipSet'), 'needsConfirmation');
    expect(ask.confirmation).toMatchObject({
      options: ['onlyThisGame', 'saveAsNewTemplate'],
      sourceTemplate: null,
      sourceTemplateDeleted: true,
    });
    expect(expectStatus(await app.planning.completeChipSetStep(gameId, { kind: 'updateSourceTemplate' }), 'rejected').reason.code).toBe(
      'sourceTemplateMissing',
    );
    await createTemplate('Taken', rows(['1', '1']));
    const dup = expectStatus(await app.planning.completeChipSetStep(gameId, { kind: 'saveAsNewTemplate', name: 'taken' }), 'rejected');
    expect(dup.reason.problems?.[0].code).toBe('duplicateName');
    expect(app.planning.getView(gameId)!.currentStep).toBe('chipSet');

    const saved = expectStatus(
      await app.planning.completeChipSetStep(gameId, { kind: 'saveAsNewTemplate', name: ' Home 2 ' }),
      'accepted',
    );
    app = await harness.restart(app);
    expect(app.templates.list().map((t) => t.name)).toEqual(['Home 2', 'Taken']);
    expect(app.templates.get(templateId)).toBeNull();
    expect(app.templates.get(saved.templateId!)!.denominations).toEqual([{ value: 1, quantity: 60, color: 'black' }]);
    expect(app.planning.getView(gameId)!.chipSet.source).toEqual({
      kind: 'template',
      templateId: saved.templateId,
      templateName: 'Home 2',
    });
  });

  it('with invalid rows reports problems and touches no template', async () => {
    const { templateId, gameId } = await gameFromTemplate();
    await app.planning.setChipValueText(gameId, app.planning.getView(gameId)!.chipSet.rows[0].id, '');
    expectStatus(await app.planning.completeChipSetStep(gameId, { kind: 'updateSourceTemplate' }), 'stepInvalid');
    expect(app.templates.get(templateId)!.denominations[0].quantity).toBe(100);
  });

  it('can save the game’s chip set as a template from the step', async () => {
    const gameId = await gameOnChipSet();
    await addChipRows(app, gameId, [['10', '30']]);
    const { templateId } = expectStatus(await app.planning.saveChipSetAsTemplate(gameId, 'From game'), 'accepted');
    expect(app.templates.get(templateId)!.summary.label).toBe('1 denomination · 30 chips · 300 chip units');
    expect(app.planning.getView(gameId)!.chipSet.source).toMatchObject({ kind: 'template', templateId });
  });
});
