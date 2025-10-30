const admin = require('firebase-admin');

const db = admin.firestore();
const INITIAL_BALANCE = 1000;
const MIN_BET = 1;
const MAX_BET_PERCENTAGE = 0.2; // 20% of balance

/**
 * Initialize a new user with starting balance
 */
async function initUser(uid) {
  const userRef = db.collection('users').doc(uid);

  const userData = {
    uid,
    balance: INITIAL_BALANCE,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    displayName: `Player${uid.substring(0, 6)}`
  };

  await userRef.set(userData);

  // Also create leaderboard entry
  const leaderboardRef = db.collection('leaderboard').doc(uid);
  await leaderboardRef.set({
    uid,
    bestBalance: INITIAL_BALANCE,
    displayName: userData.displayName,
    lastUpdated: admin.firestore.FieldValue.serverTimestamp()
  });

  return userData;
}

/**
 * Get current user balance
 */
async function getBalance(uid) {
  const userRef = db.collection('users').doc(uid);
  const doc = await userRef.get();

  if (!doc.exists) {
    throw new Error('User not found');
  }

  return doc.data().balance;
}

/**
 * Validate a wager
 */
async function validateWager(uid, wager) {
  const balance = await getBalance(uid);

  if (wager < MIN_BET) {
    throw new Error(`Minimum bet is ${MIN_BET} FB`);
  }

  const maxBet = Math.floor(balance * MAX_BET_PERCENTAGE);
  if (wager > maxBet) {
    throw new Error(`Maximum bet is ${maxBet} FB (20% of balance)`);
  }

  if (wager > balance) {
    throw new Error('Insufficient balance');
  }

  return true;
}

/**
 * Update user balance and create transaction
 * Returns new balance
 */
async function updateBalance(uid, delta, game, transactionData) {
  const userRef = db.collection('users').doc(uid);

  // Use transaction for atomicity
  const result = await db.runTransaction(async (transaction) => {
    const userDoc = await transaction.get(userRef);

    if (!userDoc.exists) {
      throw new Error('User not found');
    }

    const oldBalance = userDoc.data().balance;
    const newBalance = Math.max(0, oldBalance + delta);

    // Update user balance
    transaction.update(userRef, {
      balance: newBalance,
      lastGameAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Create transaction record
    const txRef = db.collection('transactions').doc();
    transaction.set(txRef, {
      uid,
      delta,
      game,
      balanceAfter: newBalance,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      ...transactionData
    });

    // Update game history for user
    const historyRef = db.collection('gameHistory').doc(uid).collection('games').doc();
    transaction.set(historyRef, {
      game,
      wager: Math.abs(delta < 0 ? delta : -delta),
      payout: delta > 0 ? delta : 0,
      result: delta > 0 ? 'win' : 'lose',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      ...transactionData
    });

    // Update leaderboard if new best balance
    const leaderboardRef = db.collection('leaderboard').doc(uid);
    const leaderboardDoc = await transaction.get(leaderboardRef);

    if (leaderboardDoc.exists) {
      const bestBalance = leaderboardDoc.data().bestBalance || oldBalance;
      if (newBalance > bestBalance) {
        transaction.update(leaderboardRef, {
          bestBalance: newBalance,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }

    return {
      oldBalance,
      newBalance,
      delta,
      transactionId: txRef.id
    };
  });

  return result.newBalance;
}

module.exports = {
  initUser,
  getBalance,
  validateWager,
  updateBalance,
  INITIAL_BALANCE,
  MIN_BET,
  MAX_BET_PERCENTAGE
};
