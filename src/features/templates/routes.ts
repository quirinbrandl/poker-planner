import type { Href } from 'expo-router';

/** Chip set templates management (a working location). */
export const templatesHref = '/templates' as Href;

/** The template editor: an existing template, or `new`. With `gameId` it saves and uses the new template in that game. */
export function templateEditorHref(templateId: string | 'new', gameId?: string): Href {
  const path = `/templates/${encodeURIComponent(templateId)}`;
  return (gameId ? `${path}?gameId=${encodeURIComponent(gameId)}` : path) as Href;
}

/** The template picker opened from a game's Chip set step. */
export function templatePickerHref(gameId: string): Href {
  return `/templates/choose?gameId=${encodeURIComponent(gameId)}` as Href;
}
