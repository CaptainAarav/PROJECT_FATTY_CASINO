const functions = require('firebase-functions');
const admin = require('firebase-admin');
const crypto = require('crypto');

// Initialize Firebase Admin
admin.initializeApp();

const db = admin.firestore();

// ============================================================
// RNG SERVICE
// ============================================================

function getDailySeed() {
  const today = new Date().toISOString().split('T')[0];
  const hash = crypto.createHash('sha256');
  hash.update(`fatty-casino-seed-${today}`);
  return hash.digest('hex');
}

function generateSecureRandom(uid, max = 100, timestamp = Date.now()) {
  const dailySeed = getDailySeed();
  const combined = `${dailySeed}:${uid}:${timestamp}`;
  const hash = crypto.createHash('sha256');
  hash.update(combined);
  const digest = hash.digest();
  const num = digest.readUInt32BE(0);
  return num % max;
}

// ============================================================
// ECONOMY SERVICE
// ============================================================

const INITIAL_BALANCE = 1000;
const MIN_BET = 1;
const MAX_BET_PERCENTAGE = 0.2;

async function initUser(uid) {
  const userRef = db.collection('users').doc(uid);
  const userData = {
    uid,
    balance: INITIAL_BALANCE,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    displayName: `Player${uid.substring(0, 6)}`
  };
  await userRef.set(userData);

  const leaderboardRef = db.collection('leaderboard').doc(uid);
  await leaderboardRef.set({
    uid,
    bestBalance: INITIAL_BALANCE,
    displayName: userData.displayName,
    lastUpdated: admin.firestore.FieldValue.serverTimestamp()
  });

  return userData;
}

async function getBalance(uid) {
  const userRef = db.collection('users').doc(uid);
  const doc = await userRef.get();
  if (!doc.exists) {
    throw new Error('User not found');
  }
  return doc.data().balance;
}

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

async function updateBalance(uid, delta, game, transactionData) {
  const userRef = db.collection('users').doc(uid);

  const result = await db.runTransaction(async (transaction) => {
    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists) {
      throw new Error('User not found');
    }

    const oldBalance = userDoc.data().balance;
    const newBalance = Math.max(0, oldBalance + delta);

    transaction.update(userRef, {
      balance: newBalance,
      lastGameAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const txRef = db.collection('transactions').doc();
    transaction.set(txRef, {
      uid,
      delta,
      game,
      balanceAfter: newBalance,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      ...transactionData
    });

    const historyRef = db.collection('gameHistory').doc(uid).collection('games').doc();
    transaction.set(historyRef, {
      game,
      wager: Math.abs(delta < 0 ? delta : -delta),
      payout: delta > 0 ? delta : 0,
      result: delta > 0 ? 'win' : 'lose',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      ...transactionData
    });

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

    return newBalance;
  });

  return result;
}

// ============================================================
// ECONOMY FUNCTIONS
// ============================================================

exports.economyInitUser = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be signed in');
  }
  try {
    const result = await initUser(context.auth.uid);
    return result;
  } catch (error) {
    console.error('Error initializing user:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

exports.economyGetBalance = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be signed in');
  }
  try {
    const balance = await getBalance(context.auth.uid);
    return { balance };
  } catch (error) {
    console.error('Error getting balance:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// ============================================================
// GAME FUNCTIONS
// ============================================================

exports.gamesPlayWheel = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be signed in');
  }
  try {
    const { wager } = data;
    if (!wager || typeof wager !== 'number') {
      throw new Error('Invalid wager');
    }

    await validateWager(context.auth.uid, wager);

    const timestamp = Date.now();
    const roll = generateSecureRandom(context.auth.uid, 3, timestamp);
    const outcomes = ['blue', 'green', 'gold'];
    const multipliers = [2, 2, 3];

    const outcome = outcomes[roll];
    const multiplier = multipliers[roll];
    const payout = wager * (multiplier - 1);
    const balanceDelta = multiplier > 1 ? payout : -wager;

    const newBalance = await updateBalance(context.auth.uid, balanceDelta, 'wheel', {
      wager,
      payout,
      outcome,
      multiplier,
      seed: timestamp
    });

    return {
      wager,
      payout,
      result: outcome,
      multiplier,
      balanceAfter: newBalance,
      seed: timestamp
    };
  } catch (error) {
    console.error('Wheel game error:', error);
    throw new functions.https.HttpsError('invalid-argument', error.message);
  }
});

exports.gamesPlayCoinFlip = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be signed in');
  }
  try {
    const { wager, choice } = data;
    if (!wager || typeof wager !== 'number') {
      throw new Error('Invalid wager');
    }
    if (!choice || !['heads', 'tails'].includes(choice)) {
      throw new Error('Invalid choice');
    }

    await validateWager(context.auth.uid, wager);

    const timestamp = Date.now();
    const roll = generateSecureRandom(context.auth.uid, 2, timestamp);
    const result = roll === 0 ? 'heads' : 'tails';
    const isWin = result === choice;
    const payout = isWin ? wager : 0;
    const balanceDelta = payout === 0 ? -wager : payout;

    const newBalance = await updateBalance(context.auth.uid, balanceDelta, 'coinflip', {
      wager,
      payout,
      result,
      choice,
      isWin,
      seed: timestamp
    });

    return {
      wager,
      payout,
      result,
      choice,
      isWin,
      balanceAfter: newBalance,
      seed: timestamp
    };
  } catch (error) {
    console.error('Coin flip game error:', error);
    throw new functions.https.HttpsError('invalid-argument', error.message);
  }
});

exports.gamesPlayHighLow = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be signed in');
  }
  try {
    const { wager, choice } = data;
    if (!wager || typeof wager !== 'number') {
      throw new Error('Invalid wager');
    }
    if (!choice || !['high', 'low'].includes(choice)) {
      throw new Error('Invalid choice');
    }

    await validateWager(context.auth.uid, wager);

    const timestamp = Date.now();
    const roll = generateSecureRandom(context.auth.uid, 52, timestamp);
    const cardValue = Math.floor(roll / 4) + 1;
    const isHigh = cardValue > 6;
    const isWin = (choice === 'high' && isHigh) || (choice === 'low' && !isHigh);
    const payout = isWin ? wager : 0;
    const balanceDelta = payout === 0 ? -wager : payout;

    const newBalance = await updateBalance(context.auth.uid, balanceDelta, 'highlow', {
      wager,
      payout,
      serverRoll: roll,
      cardValue,
      isHigh,
      choice,
      isWin,
      seed: timestamp
    });

    return {
      wager,
      payout,
      serverRoll: roll,
      cardValue,
      isHigh,
      choice,
      isWin,
      balanceAfter: newBalance,
      seed: timestamp
    };
  } catch (error) {
    console.error('High-low game error:', error);
    throw new functions.https.HttpsError('invalid-argument', error.message);
  }
});

// ============================================================
// LEADERBOARD FUNCTIONS
// ============================================================

exports.leaderboardGetLeaderboard = functions.https.onCall(async (data, context) => {
  try {
    const limit = data.limit || 50;
    const snapshot = await db.collection('leaderboard')
      .orderBy('bestBalance', 'desc')
      .limit(limit)
      .get();

    const entries = snapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data()
    }));

    return { entries };
  } catch (error) {
    console.error('Leaderboard error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// ============================================================
// HISTORY FUNCTIONS
// ============================================================

exports.historyGetUserHistory = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be signed in');
  }
  try {
    const limit = data.limit || 20;
    const uid = context.auth.uid;

    const snapshot = await db.collection('gameHistory')
      .doc(uid)
      .collection('games')
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

    const history = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toMillis?.() || Date.now()
    }));

    return { history };
  } catch (error) {
    console.error('History error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// ============================================================
// ADMIN FUNCTIONS
// ============================================================

exports.adminCleanupOldTransactions = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const batch = db.batch();
    const snapshot = await db.collection('transactions')
      .where('timestamp', '<', thirtyDaysAgo)
      .limit(500)
      .get();

    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`Deleted ${snapshot.size} old transactions`);
  });
