import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { PlanningApp } from '../src/mobile/PlanningApp';
import { isolatedStore } from './support/local-store';

let store: ReturnType<typeof isolatedStore>;
beforeEach(() => {
  store = isolatedStore();
});
afterEach(() => {
  store.dispose();
});

test('a failed disk write keeps the text visible, reports it as unsaved, and blocks leaving', () => {
  const writable = store.open();
  const id = writable.createPlan('cash').game.id;
  writable.editPlan(id, { type: 'set-details', changes: { title: 'Friday' } });
  writable.close();
  const readOnly = store.open({ readOnly: true });
  const app = render(<PlanningApp games={readOnly} />);
  fireEvent.press(screen.getByRole('button', { name: 'Open Friday' }));
  fireEvent.changeText(screen.getByLabelText('Game name'), 'Friday unsaved');
  expect(screen.getByLabelText('Game name').props.value).toBe('Friday unsaved');
  expect(screen.getByText('Not saved — retry needed')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'All games' })).toBeDisabled();
  fireEvent.press(screen.getByRole('button', { name: 'Retry save' }));
  expect(screen.getByLabelText('Game name').props.value).toBe('Friday unsaved');
  expect(readOnly.getPlan(id)?.title).toBe('Friday');
  app.unmount();
});

test('the mobile Planning workflow saves every edit and resumes independent games after restart', () => {
  let games = store.open();
  let app = render(<PlanningApp games={games} />);
  fireEvent.press(screen.getByRole('button', { name: 'New cash game' }));
  fireEvent.changeText(screen.getByLabelText('Game name'), 'Friday cash');
  expect(
    screen.getByText('100 BB is a recommendation, not a requirement.'),
  ).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: 'Add participant' }));
  fireEvent.changeText(screen.getByLabelText('Participant 1 name'), 'Alice');
  fireEvent.changeText(
    screen.getByLabelText('Shared buy-in (EUR cents)'),
    '20.005',
  );
  fireEvent.press(screen.getByRole('button', { name: 'Add denomination' }));
  fireEvent.changeText(
    screen.getByLabelText('Denomination 1 (chip units)'),
    '1',
  );
  fireEvent.changeText(screen.getByLabelText('Denomination 1 quantity'), '8.5');
  fireEvent.press(screen.getByRole('button', { name: 'Explicit reserve' }));
  fireEvent.changeText(screen.getByLabelText('Reserved stacks'), '0');
  expect(
    screen.getByText('Enter a positive whole number of EUR cents.'),
  ).toBeTruthy();
  expect(
    screen.getByText('Enter a nonnegative whole number of chips.'),
  ).toBeTruthy();
  expect(
    screen.getByText('Planning only — no chips have been issued.'),
  ).toBeTruthy();
  expect(
    screen.queryByRole('button', { name: /start|settlement/i }),
  ).toBeNull();

  fireEvent.press(screen.getByRole('button', { name: 'All games' }));
  fireEvent.press(screen.getByRole('button', { name: 'New tournament' }));
  fireEvent.changeText(screen.getByLabelText('Game name'), 'Sunday tournament');
  expect(
    screen.getByText(
      'Tournament chips have no monetary value. Buy-ins fund the prize pool.',
    ),
  ).toBeTruthy();
  expect(screen.getByLabelText('Requested stack depth (BB)').props.value).toBe(
    '100',
  );
  expect(screen.getByLabelText('Blind-payment coverage').props.value).toBe('4');
  app.unmount();
  games.close();

  games = store.open();
  app = render(<PlanningApp games={games} />);
  fireEvent.press(screen.getByRole('button', { name: 'Open Friday cash' }));
  expect(screen.getByLabelText('Participant 1 name').props.value).toBe('Alice');
  expect(screen.getByLabelText('Shared buy-in (EUR cents)').props.value).toBe(
    '20.005',
  );
  expect(screen.getByLabelText('Denomination 1 quantity').props.value).toBe(
    '8.5',
  );
  expect(screen.getByLabelText('Reserved stacks').props.value).toBe('0');
  expect(
    screen.getByText('Enter a nonnegative whole number of chips.'),
  ).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: 'All games' }));
  fireEvent.press(
    screen.getByRole('button', { name: 'Open Sunday tournament' }),
  );
  expect(screen.getByLabelText('Shared buy-in (EUR cents)').props.value).toBe(
    '',
  );
  expect(screen.queryByLabelText('Participant 1 name')).toBeNull();
  app.unmount();
});
