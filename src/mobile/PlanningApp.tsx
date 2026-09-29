import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type {
  GameManagement,
  PlanningEdit,
  PlanningSave,
  Rejection,
} from '../game-management';

function Action({
  label,
  onPress,
  selected = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  selected?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.action,
        selected && styles.selected,
        disabled && styles.disabled,
      ]}
    >
      <Text style={[styles.actionText, selected && styles.selectedText]}>
        {label}
      </Text>
    </Pressable>
  );
}

function Field({
  label,
  value,
  error,
  onChange,
  numeric = false,
  disabled = false,
}: {
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  numeric?: boolean;
  disabled?: boolean;
}) {
  // Keep unsaved text visible if a disk write fails; Retry saves that exact edit.
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={error}
        value={text}
        editable={!disabled}
        onChangeText={(next) => {
          setText(next);
          onChange(next);
        }}
        keyboardType={numeric ? 'numeric' : 'default'}
        autoCorrect={!numeric}
        style={[styles.input, Boolean(error) && styles.invalidInput]}
      />
      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

/** Screens only submit host operations and render the module's saved state. */
export function PlanningApp({ games }: { games: GameManagement }) {
  const [plans, setPlans] = useState(() => games.listPlans());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [problem, setProblem] = useState<{
    message: string;
    retry?: () => void;
  } | null>(null);
  const game = plans.find((plan) => plan.id === selectedId);
  const blocked = Boolean(problem?.retry);

  function run(operation: () => PlanningSave | Rejection) {
    let result: PlanningSave | Rejection;
    try {
      result = operation();
    } catch {
      setProblem({
        message:
          'Could not save on this phone. Your latest edit is still on screen. Retry before leaving; do not close the app.',
        retry: () => run(operation),
      });
      return;
    }
    if (result.status === 'rejected') {
      setProblem({ message: result.reason });
      return;
    }
    // The returned snapshot is already durable. A follow-up read must never
    // turn a committed operation into a retry that creates duplicate records.
    const savedGame = result.game;
    setPlans((current) =>
      current.some((plan) => plan.id === savedGame.id)
        ? current.map((plan) => (plan.id === savedGame.id ? savedGame : plan))
        : [savedGame, ...current],
    );
    setSelectedId(savedGame.id);
    setProblem(null);
  }

  function edit(change: PlanningEdit) {
    if (game) run(() => games.editPlan(game.id, change));
  }

  const fieldErrors = game?.fieldErrors ?? {};
  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {problem ? (
        <View accessibilityRole="alert" style={styles.card}>
          <Text style={styles.error}>{problem.message}</Text>
          <Action
            label={problem.retry ? 'Retry save' : 'Dismiss'}
            onPress={problem.retry ?? (() => setProblem(null))}
          />
        </View>
      ) : null}
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        <Text style={styles.eyebrow}>POKER PLANNER · OFFLINE</Text>
        <Text accessibilityRole="header" style={styles.title}>
          {game ? 'Plan your game' : 'Your games'}
        </Text>
        {!game ? (
          <>
            <Text style={styles.body}>
              One phone. No account. Your plans stay on this device.
            </Text>
            <View style={styles.choices}>
              <Action
                label="New cash game"
                disabled={blocked}
                onPress={() => run(() => games.createPlan('cash'))}
              />
              <Action
                label="New tournament"
                disabled={blocked}
                onPress={() => run(() => games.createPlan('tournament'))}
              />
            </View>
            {plans.length === 0 ? (
              <Text style={styles.body}>
                No games yet. Begin a plan — every edit is saved automatically.
              </Text>
            ) : null}
            {plans.map((plan) => {
              const title =
                plan.title.trim() ||
                `Untitled ${plan.mode === 'cash' ? 'cash game' : 'tournament'}`;
              return (
                <Pressable
                  key={plan.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${title}`}
                  disabled={blocked}
                  onPress={() => {
                    setSelectedId(plan.id);
                    setProblem(null);
                  }}
                  style={styles.card}
                >
                  <Text style={styles.sectionTitle}>{title}</Text>
                  <Text style={styles.body}>
                    {plan.mode === 'cash' ? 'Cash game' : 'Tournament'} ·
                    Planning
                  </Text>
                  <Text style={styles.caption}>
                    Created {new Date(plan.createdAt).toLocaleString()}
                  </Text>
                  <Text style={styles.caption}>
                    {plan.participants.length} participants ·{' '}
                    {Object.keys(plan.fieldErrors).length
                      ? 'Setup needs attention'
                      : 'Setup saved'}
                  </Text>
                </Pressable>
              );
            })}
          </>
        ) : (
          <View key={game.id} style={styles.form}>
            <Action
              label="All games"
              disabled={blocked}
              onPress={() => {
                setSelectedId(null);
                setProblem(null);
              }}
            />
            <Text accessibilityLiveRegion="polite" style={styles.caption}>
              {blocked
                ? 'Not saved — retry needed'
                : `Saved on this phone · ${Object.keys(fieldErrors).length} fields need attention`}
            </Text>
            <Text style={styles.caption}>
              Created {new Date(game.createdAt).toLocaleString()}
            </Text>
            <View style={styles.card}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>
                Game · Planning
              </Text>
              <Field
                label="Game name"
                value={game.title}
                error={fieldErrors.title}
                disabled={blocked}
                onChange={(title) =>
                  edit({ type: 'set-details', changes: { title } })
                }
              />
              <View style={styles.choices}>
                <Action
                  label="Cash game"
                  selected={game.mode === 'cash'}
                  disabled={blocked}
                  onPress={() =>
                    edit({ type: 'set-details', changes: { mode: 'cash' } })
                  }
                />
                <Action
                  label="Tournament"
                  selected={game.mode === 'tournament'}
                  disabled={blocked}
                  onPress={() =>
                    edit({
                      type: 'set-details',
                      changes: { mode: 'tournament' },
                    })
                  }
                />
              </View>
              <Text style={styles.body}>
                {game.mode === 'tournament'
                  ? 'Tournament chips have no monetary value. Buy-ins fund the prize pool.'
                  : 'Cash-game chip value will be derived from the accepted starting stack and buy-in.'}
              </Text>
            </View>
            <View style={styles.card}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>
                Participants
              </Text>
              <Text style={styles.body}>
                Names belong to this game. Joining order stays fixed when names
                change.
              </Text>
              {fieldErrors.participants ? (
                <Text style={styles.error}>{fieldErrors.participants}</Text>
              ) : null}
              {game.participants.map((participant, index) => (
                <View key={participant.id} style={styles.row}>
                  <Field
                    label={`Participant ${index + 1} name`}
                    value={participant.name}
                    error={fieldErrors[`participants.${participant.id}.name`]}
                    disabled={blocked}
                    onChange={(name) =>
                      edit({
                        type: 'rename-participant',
                        participantId: participant.id,
                        name,
                      })
                    }
                  />
                  <Action
                    label={`Remove participant ${index + 1}`}
                    disabled={blocked}
                    onPress={() =>
                      edit({
                        type: 'remove-participant',
                        participantId: participant.id,
                      })
                    }
                  />
                </View>
              ))}
              <Action
                label="Add participant"
                disabled={blocked}
                onPress={() => edit({ type: 'add-participant', name: '' })}
              />
            </View>
            <View style={styles.card}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>
                Chip set
              </Text>
              <Text style={styles.body}>
                Whole chip units and physical quantities, not EUR.
              </Text>
              {fieldErrors.chips ? (
                <Text style={styles.error}>{fieldErrors.chips}</Text>
              ) : null}
              {game.chips.map((chip, index) => (
                <View key={chip.id} style={styles.row}>
                  <Field
                    label={`Denomination ${index + 1} (chip units)`}
                    value={chip.value}
                    numeric
                    disabled={blocked}
                    error={fieldErrors[`chips.${chip.id}.value`]}
                    onChange={(value) =>
                      edit({
                        type: 'edit-chip',
                        chipId: chip.id,
                        changes: { value },
                      })
                    }
                  />
                  <Field
                    label={`Denomination ${index + 1} quantity`}
                    value={chip.quantity}
                    numeric
                    disabled={blocked}
                    error={fieldErrors[`chips.${chip.id}.quantity`]}
                    onChange={(quantity) =>
                      edit({
                        type: 'edit-chip',
                        chipId: chip.id,
                        changes: { quantity },
                      })
                    }
                  />
                  <Action
                    label={`Remove denomination ${index + 1}`}
                    disabled={blocked}
                    onPress={() =>
                      edit({ type: 'remove-chip', chipId: chip.id })
                    }
                  />
                </View>
              ))}
              <Action
                label="Add denomination"
                disabled={blocked}
                onPress={() => edit({ type: 'add-chip' })}
              />
            </View>
            <View style={styles.card}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>
                Starting terms
              </Text>
              <Field
                label="Shared buy-in (EUR cents)"
                value={game.buyInCents}
                numeric
                disabled={blocked}
                error={fieldErrors.buyInCents}
                onChange={(buyInCents) =>
                  edit({ type: 'set-details', changes: { buyInCents } })
                }
              />
              <Text style={styles.caption}>
                €20.00 = 2000 cents. One shared buy-in; no fractional cents.
              </Text>
              <Field
                label="Requested stack depth (BB)"
                value={game.requestedStackDepth}
                numeric
                disabled={blocked}
                error={fieldErrors.requestedStackDepth}
                onChange={(requestedStackDepth) =>
                  edit({
                    type: 'set-details',
                    changes: { requestedStackDepth },
                  })
                }
              />
              <Text style={styles.body}>
                100 BB is a recommendation, not a requirement.
              </Text>
              {game.mode === 'tournament' ? (
                <Text style={styles.caption}>
                  Measured against the initial big blind, not a promise of
                  tournament duration.
                </Text>
              ) : null}
              <Text style={styles.label}>Distribution preference</Text>
              <View style={styles.choices}>
                <Action
                  label="Minimize chips"
                  selected={game.distributionPreference === 'minimize'}
                  disabled={blocked}
                  onPress={() =>
                    edit({
                      type: 'set-details',
                      changes: { distributionPreference: 'minimize' },
                    })
                  }
                />
                <Action
                  label="Maximize chips"
                  selected={game.distributionPreference === 'maximize'}
                  disabled={blocked}
                  onPress={() =>
                    edit({
                      type: 'set-details',
                      changes: { distributionPreference: 'maximize' },
                    })
                  }
                />
              </View>
            </View>
            <View style={styles.card}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>
                Advanced · coverage & reserve
              </Text>
              <Field
                label="Blind-payment coverage"
                value={game.blindPaymentCoverage}
                numeric
                disabled={blocked}
                error={fieldErrors.blindPaymentCoverage}
                onChange={(blindPaymentCoverage) =>
                  edit({
                    type: 'set-details',
                    changes: { blindPaymentCoverage },
                  })
                }
              />
              <Text style={styles.body}>
                Default 4, minimum 1. Separate chip groups for each small-blind
                and big-blind payment.
              </Text>
              <View style={styles.choices}>
                <Action
                  label="Automatic reserve"
                  selected={game.reserve.mode === 'automatic'}
                  disabled={blocked}
                  onPress={() =>
                    edit({
                      type: 'set-details',
                      changes: { reserve: { mode: 'automatic' } },
                    })
                  }
                />
                <Action
                  label="Explicit reserve"
                  selected={game.reserve.mode === 'explicit'}
                  disabled={blocked}
                  onPress={() =>
                    edit({
                      type: 'set-details',
                      changes: {
                        reserve: {
                          mode: 'explicit',
                          stacks: String(game.reserveTarget ?? ''),
                        },
                      },
                    })
                  }
                />
              </View>
              {game.reserve.mode === 'explicit' ? (
                <Field
                  label="Reserved stacks"
                  value={game.reserve.stacks}
                  numeric
                  disabled={blocked}
                  error={fieldErrors.reserve}
                  onChange={(stacks) =>
                    edit({
                      type: 'set-details',
                      changes: { reserve: { mode: 'explicit', stacks } },
                    })
                  }
                />
              ) : (
                <Text style={styles.body}>
                  Automatic reserve: {game.reserveTarget} stacks (half the
                  roster, rounded up).
                </Text>
              )}
              <Text style={styles.caption}>
                Shared planned capacity for rebuys and late arrivals. An
                explicit zero is allowed; feasibility is not checked yet.
              </Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>
                Planning only — no chips have been issued.
              </Text>
              <Text style={styles.body}>
                Distribution, Start game, and final settlement are not available
                in this version. Saving setup does not validate a playable
                distribution.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f4f3eb' },
  content: {
    padding: 20,
    paddingBottom: 48,
    gap: 16,
    width: '100%',
    maxWidth: 620,
    alignSelf: 'center',
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    color: '#28624c',
  },
  title: { fontSize: 32, fontWeight: '700', color: '#153c30' },
  form: { gap: 16 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: '#d9e1d9',
  },
  sectionTitle: { color: '#153c30', fontSize: 19, fontWeight: '600' },
  body: { color: '#344b43', fontSize: 16, lineHeight: 23 },
  caption: { color: '#52615b', fontSize: 14, lineHeight: 20 },
  label: { color: '#233f33', fontSize: 15, fontWeight: '600' },
  field: { gap: 6, marginTop: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#8b9c92',
    borderRadius: 8,
    padding: 12,
    color: '#153c30',
    backgroundColor: '#fff',
    fontSize: 18,
    minHeight: 48,
  },
  invalidInput: { borderColor: '#a9492d' },
  error: { color: '#a03421', fontSize: 14, lineHeight: 20 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  row: {
    gap: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e3e7e1',
  },
  action: {
    borderWidth: 1,
    borderColor: '#28624c',
    borderRadius: 10,
    paddingVertical: 13,
    paddingHorizontal: 15,
    minHeight: 48,
    justifyContent: 'center',
  },
  actionText: { color: '#20543e', fontWeight: '600', fontSize: 15 },
  selected: { backgroundColor: '#20543e' },
  selectedText: { color: '#fff' },
  disabled: { opacity: 0.45 },
});
