const functions = require('firebase-functions');
const admin = require('firebase-admin');
const rng = require('../services/rng');
const economy = require('../services/economy');

const db = admin.firestore();

/**
 * High-Low card game
 * Guess if card is high (7-K) or low (A-6)
 * 50/50 odds (approximately, depending on deck)
 * Win: 2x payout (wager * 1)
 */
async function playHighLow(uid, wager, choice, timestamp = Date.now()) {
  // Validate choice
  if (!['high', 'low'].includes(choice)) {
    throw new Error('Invalid choice. Must be high or low.');
  }

  // Validate wager
  await economy.validateWager(uid, wager);

  // Generate result
  const cardResult = rng.generateHighLowResult(uid, timestamp);

  // Determine win/loss
  const playerGuessedHigh = choice === 'high';
  const cardIsHigh = cardResult.isHigh;
  const isWin = (playerGuessedHigh && cardIsHigh) || (!playerGuessedHigh && !cardIsHigh);
  const payout = isWin ? wager : 0;

  // Update balance
  const balanceDelta = payout === 0 ? -wager : payout;
  const newBalance = await economy.updateBalance(uid, balanceDelta, 'highlow', {
    wager,
    payout,
    serverRoll: cardResult.serverRoll,
    cardValue: cardResult.cardValue,
    isHigh: cardResult.isHigh,
    choice,
    isWin,
    seed: cardResult.seed
  });

  return {
    wager,
    payout,
    serverRoll: cardResult.serverRoll,
    cardValue: cardResult.cardValue,
    isHigh: cardResult.isHigh,
    choice,
    isWin,
    balanceAfter: newBalance,
    seed: cardResult.seed
  };
}

module.exports = {
  playHighLow
};
