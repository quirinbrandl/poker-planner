import { AccessibilityInfo } from 'react-native';
import { type ViewRef } from '../refs';

/** Move screen-reader focus to a rendered view (used when a modal opens). */
export function focusView(view: ViewRef | null) {
  if (!view) return;
  try {
    AccessibilityInfo.sendAccessibilityEvent(view, 'focus');
  } catch {
    // Not supported on this platform (e.g. tests); focus simply stays where the platform puts it.
  }
}
