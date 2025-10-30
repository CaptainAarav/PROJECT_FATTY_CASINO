import { functions } from './firebase.js';
import { httpsCallable } from 'firebase/functions';

// Game Functions
export async function playWheel(bet) {
  const playWheel = httpsCallable(functions, 'games-playWheel');
  return await playWheel({ wager: bet });
}

export async function playCoinFlip(bet, choice) {
  const playCoinFlip = httpsCallable(functions, 'games-playCoinFlip');
  return await playCoinFlip({ wager: bet, choice });
}

export async function playHighLow(bet, choice) {
  const playHighLow = httpsCallable(functions, 'games-playHighLow');
  return await playHighLow({ wager: bet, choice });
}

// Data retrieval
export async function getLeaderboard(limit = 50) {
  const getLeaderboardFn = httpsCallable(functions, 'leaderboard-getLeaderboard');
  return await getLeaderboardFn({ limit });
}

export async function getUserHistory(limit = 20) {
  const getHistoryFn = httpsCallable(functions, 'history-getUserHistory');
  return await getHistoryFn({ limit });
}

export async function getUserBalance() {
  const getBalanceFn = httpsCallable(functions, 'economy-getBalance');
  return await getBalanceFn();
}
