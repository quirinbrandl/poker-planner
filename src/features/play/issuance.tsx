/**
 * Pieces shared by the rebuy and late-entry popups: the stack to hand out, the fact rows, the
 * coverage warning and the guard that lets an issuing confirmation run only once.
 */
import { useCallback, useEffect, useRef } from 'react';
import { View } from 'react-native';

import { ChipTowers, FactRow, InlineNotice, StackShowcase, Text } from '@/ui';

import type { ExtraFact, HandoutStack, ReducedCoverage, ReserveAfter } from './types';

/** "Stack to hand out … 200 chip units" over compact towers with exact counts. */
export function HandoutStackShowcase({ stack }: { stack: HandoutStack }) {
  return (
    <StackShowcase label="Stack to hand out" value={stack.unitsText} unit="chip units" size="compact">
      <ChipTowers columns={stack.chips} size="compact" accessibilityLabel="Stack to hand out" />
    </StackShowcase>
  );
}

/** The always-visible label / value rows under the stack. */
export function IssueFacts({
  reserveLabel,
  reserveAfter,
  rows,
  extraFacts = [],
}: {
  /** "Reserve after rebuy" / "Reserve after entry". */
  reserveLabel: string;
  reserveAfter: ReserveAfter;
  /** Contribution rows. */
  rows: readonly ExtraFact[];
  extraFacts?: readonly ExtraFact[];
}) {
  const all = [...rows, ...extraFacts];
  return (
    <View>
      <FactRow
        label={reserveLabel}
        value={reserveAfter.value}
        unit={reserveAfter.unit}
        emphasis="large"
        divider={all.length > 0}
      />
      {all.map((row, index) => (
        <FactRow key={row.label} label={row.label} value={row.value} emphasis="large" divider={index < all.length - 1} />
      ))}
    </View>
  );
}

/** The non-collapsible warning of a reduced- or zero-coverage rebuy proposal. */
export function CoverageWarning({ coverage }: { coverage: ReducedCoverage }) {
  const { achieved, required } = coverage;
  if (achieved === 0) {
    return (
      <InlineNotice tone="warning" title={`0 of ${required} · No complete blind payment with separate chips`}>
        {`Not one of the required ${required} small-blind plus big-blind payments can be made with separate chips. Change from other players may be needed.`}
      </InlineNotice>
    );
  }
  return (
    <InlineNotice tone="warning" title={`${achieved} of ${required} · Reduced blind-payment coverage`}>
      {`Only ${achieved} of the required ${required} payments of each blind can be made with separate chips. Change from other players may be needed.`}
    </InlineNotice>
  );
}

/** The blocked body: the reason, then what did not happen. */
export function BlockedBody({ title, reason, unchanged }: { title: string; reason: string; unchanged: string }) {
  return (
    <>
      <InlineNotice tone="error" title={title}>
        {reason}
      </InlineNotice>
      <Text tone="supporting">{unchanged}</Text>
    </>
  );
}

/**
 * Lets a confirmation fire once. The host shows progress with `busy`; the guard re-arms when the
 * host finishes (busy goes back to false) or presents a different proposal.
 */
export function useSingleConfirm(busy: boolean, proposal: unknown, action: () => void): () => void {
  const fired = useRef(false);
  const wasBusy = useRef(busy);

  useEffect(() => {
    if (wasBusy.current && !busy) fired.current = false;
    wasBusy.current = busy;
  }, [busy]);

  useEffect(() => {
    fired.current = false;
  }, [proposal]);

  return useCallback(() => {
    if (busy || fired.current) return;
    fired.current = true;
    action();
  }, [busy, action]);
}
