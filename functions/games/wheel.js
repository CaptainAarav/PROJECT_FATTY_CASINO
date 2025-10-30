const functions = require('firebase-functions');
const admin = require('firebase-admin');
const rng = require('../services/rng');
const economy = require('../services/economy');

const db = admin.firestore();

/**
 * Spin the lucky wheel
 * Outcomes: Blue (2x), Green (2x), Gold (3x)
 */
async function playWheel(uid, wager, timestamp = Date.now()) {
  // Validate wager
  await economy.validateWager(uid, wager);

  // Generate result
  const wheelResult = rng.generateWheelResult(uid, timestamp);

  // Calculate payout
  let payout = 0;
  if (wheelResult.multiplier > 1) {
    payout = wager * (wheelResult.multiplier - 1);
  }

  // Update balance
  const balanceDelta = payout === 0 ? -wager : payout;
  const newBalance = await economy.updateBalance(uid, balanceDelta, 'wheel', {
    wager,
    payout,
    outcome: wheelResult.outcome,
    multiplier: wheelResult.multiplier,
    seed: wheelResult.seed
  });

  return {
    wager,
    payout,
    result: wheelResult.outcome,
    multiplier: wheelResult.multiplier,
    balanceAfter: newBalance,
    seed: wheelResult.seed
  };
}

module.exports = {
  playWheel
};
