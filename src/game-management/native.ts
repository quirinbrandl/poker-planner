import { randomUUID } from 'expo-crypto';
import { openDatabaseSync } from 'expo-sqlite';
import { createGameManagement } from './index';

export function openLocalGames() {
  const database = openDatabaseSync('poker-planner.db');
  try {
    const games = createGameManagement(database, randomUUID);
    // Check readable state before mounting the screen. Never replace an unreadable store.
    games.listPlans();
    return games;
  } catch (error) {
    database.closeSync();
    throw error;
  }
}
