import { useState } from 'react';

import type { FieldView } from '@/game-management';

/**
 * Decides when a Planning field shows its problem: after the host leaves a field they edited,
 * straight away for restored fields and after a failed Continue on the step, and never while the
 * host is still typing into the field for the first time. Once shown, the message keeps updating
 * as the value is corrected.
 *
 *   const buyIn = useFieldError(plan.settings.buyIn, plan.settings.continueAttempted);
 *   <TextField value={field.text} error={buyIn.error} onBlur={buyIn.onBlur}
 *     onChangeText={(text) => { buyIn.onEdit(); void app.planning.setSettingText(gameId, 'buyIn', text); }} />
 */
export function useFieldError(field: FieldView, continueAttempted: boolean) {
  const [firstEdit, setFirstEdit] = useState(false);
  const show = field.revealed && (!firstEdit || continueAttempted);
  return {
    error: show ? field.problem?.message : undefined,
    /** Call before applying a change to the field. */
    onEdit: () => {
      if (!field.edited) setFirstEdit(true);
    },
    onBlur: () => setFirstEdit(false),
  };
}
