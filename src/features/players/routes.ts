import type { Href } from 'expo-router';

/**
 * The Saved players management screen. Opened from a game's Players step it is a detour: it does
 * not become the working location and Back returns to the step.
 */
export function savedPlayersHref(from?: 'planning'): Href {
  return (from ? `/players?from=${from}` : '/players') as Href;
}
