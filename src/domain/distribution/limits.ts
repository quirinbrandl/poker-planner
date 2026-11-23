/**
 * Work limit of one public call, in search steps (one step ≈ one search node; bulk table work is
 * charged proportionally). Typical home games need well under 100,000 steps. The limit bounds
 * every call: in desktop Node it is reached after roughly 0.2–0.6 s. Reaching it yields
 * `searchLimitReached`, never a guess.
 */
export const SEARCH_STEP_LIMIT = 3_000_000;
