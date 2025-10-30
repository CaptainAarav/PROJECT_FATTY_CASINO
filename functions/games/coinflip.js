const functions = require('firebase-functions');
const admin = require('firebase-admin');
const rng = require('../services/rng');
const economy = require('../services/economy');

const db = admin.firestore();

/**
 * Flip a coin
 * 50/50 chance of heads or tails
 * Win: 2x payout (wager * 1)
 */
async function playCoinFlip(uid, wager, choice, timestamp = Date.now()) {
  // Validate choice
  if (!['heads', 'tails'].includes(choice)) {
    throw new Error('Invalid choice. Must be heads or tails.');
  }

  // Validate wager
  await economy.validateWager(uid, wager);

  // Generate result
  const coinResult = rng.generateCoinFlipResult(uid, timestamp);

  // Determine win/loss
  const isWin = coinResult.result === choice;
  const payout = isWin ? wager : 0;

  // Update balance
  const balanceDelta = payout === 0 ? -wager : payout;
  const newBalance = await economy.updateBalance(uid, balanceDelta, 'coinflip', {
    wager,
    payout,
    result: coinResult.result,
    choice,
    isWin,
    seed: coinResult.seed
  });

  return {
    wager,
    payout,
    result: coinResult.result,
    choice,
    isWin,
    balanceAfter: newBalance,
    seed: coinResult.seed
  };
}

module.exports = {
  playCoinFlip
};
