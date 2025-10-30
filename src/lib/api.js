import { functions } from './firebase.js';
import { httpsCallable } from 'firebase/functions';

// Game Functions
export async function playWheel(bet) {
  const playWheel = httpsCallable(functions, 'gamesPlayWheel');
  return await playWheel({ wager: bet });
}

export async function playCoinFlip(bet, choice) {
  const playCoinFlip = httpsCallable(functions, 'gamesPlayCoinFlip');
  return await playCoinFlip({ wager: bet, choice });
}

export async function playHighLow(bet, choice) {
  const playHighLow = httpsCallable(functions, 'gamesPlayHighLow');
  return await playHighLow({ wager: bet, choice });
}

// Data retrieval
export async function getLeaderboard(limit = 50) {
  const getLeaderboardFn = httpsCallable(functions, 'leaderboardGetLeaderboard');
  return await getLeaderboardFn({ limit });
}

export async function getUserHistory(limit = 20) {
  const getHistoryFn = httpsCallable(functions, 'historyGetUserHistory');
  return await getHistoryFn({ limit });
}

export async function getUserBalance() {
  const getBalanceFn = httpsCallable(functions, 'economyGetBalance');
  return await getBalanceFn();
}
