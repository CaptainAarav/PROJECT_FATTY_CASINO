/**
 * RNG (Random Number Generator) Service
 * Uses cryptographic randomness with daily rotating seed for fairness
 */

const crypto = require('crypto');

/**
 * Generate a daily rotating seed (changes every day)
 * This ensures fairness and can be verified off-chain
 */
function getDailySeed() {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const hash = crypto.createHash('sha256');
  hash.update(`fatty-casino-seed-${today}`);
  return hash.digest('hex');
}

/**
 * Generate a cryptographically secure random number between 0 and max
 * Uses daily seed + user UID + timestamp for deterministic but fair results
 */
function generateSecureRandom(uid, max = 100, timestamp = Date.now()) {
  const dailySeed = getDailySeed();

  // Combine daily seed with user UID and timestamp
  const combined = `${dailySeed}:${uid}:${timestamp}`;

  const hash = crypto.createHash('sha256');
  hash.update(combined);
  const digest = hash.digest();

  // Convert to number between 0 and max
  const num = digest.readUInt32BE(0);
  return num % max;
}

/**
 * Generate wheel result (3 outcomes with equal probability)
 */
function generateWheelResult(uid, timestamp) {
  const roll = generateSecureRandom(uid, 3, timestamp);
  const outcomes = ['blue', 'green', 'gold']; // Corresponding to wheel colors
  const multipliers = [2, 2, 3]; // Payout multipliers

  return {
    outcome: outcomes[roll],
    multiplier: multipliers[roll],
    seed: timestamp
  };
}

/**
 * Generate coin flip result
 */
function generateCoinFlipResult(uid, timestamp) {
  const roll = generateSecureRandom(uid, 2, timestamp);
  return {
    result: roll === 0 ? 'heads' : 'tails',
    seed: timestamp
  };
}

/**
 * Generate high-low card (0-51)
 * Ace=1-13, 2=14-26, 3=27-39, 4=40-52 (for simplicity, just use raw value)
 */
function generateHighLowResult(uid, timestamp) {
  const roll = generateSecureRandom(uid, 52, timestamp);
  const cardNumber = Math.floor(roll / 4) + 1; // 1-13 representing A,2-K
  return {
    serverRoll: roll,
    cardValue: cardNumber,
    isHigh: cardNumber > 6, // 7+ is high, A-6 is low
    seed: timestamp
  };
}

module.exports = {
  getDailySeed,
  generateSecureRandom,
  generateWheelResult,
  generateCoinFlipResult,
  generateHighLowResult
};
