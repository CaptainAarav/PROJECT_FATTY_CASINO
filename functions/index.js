const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp();

const db = admin.firestore();

// Import game and economy modules
const wheelGame = require('./games/wheel');
const coinflipGame = require('./games/coinflip');
const highlowGame = require('./games/highlow');
const economy = require('./services/economy');

// ============================================================
// ECONOMY FUNCTIONS
// ============================================================

/**
 * Initialize a new user with starting balance
 */
exports['economy-initUser'] = functions.https.onCall(async (data, context) => {
  // Require authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be signed in');
  }

  try {
    const uid = context.auth.uid;
    const result = await economy.initUser(uid);
    return result;
  } catch (error) {
    console.error('Error initializing user:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Get current user balance
 */
exports['economy-getBalance'] = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be signed in');
  }

  try {
    const balance = await economy.getBalance(context.auth.uid);
    return { balance };
  } catch (error) {
    console.error('Error getting balance:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// ============================================================
// GAME FUNCTIONS
// ============================================================

/**
 * Play the wheel game
 */
exports['games-playWheel'] = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be signed in');
  }

  try {
    const { wager } = data;

    if (!wager || typeof wager !== 'number') {
      throw new Error('Invalid wager');
    }

    const result = await wheelGame.playWheel(context.auth.uid, wager);
    return result;
  } catch (error) {
    console.error('Wheel game error:', error);
    throw new functions.https.HttpsError('invalid-argument', error.message);
  }
});

/**
 * Play the coin flip game
 */
exports['games-playCoinFlip'] = functions.https.onCall(async (data, context) => {
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

    const result = await coinflipGame.playCoinFlip(context.auth.uid, wager, choice);
    return result;
  } catch (error) {
    console.error('Coin flip game error:', error);
    throw new functions.https.HttpsError('invalid-argument', error.message);
  }
});

/**
 * Play the high-low game
 */
exports['games-playHighLow'] = functions.https.onCall(async (data, context) => {
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

    const result = await highlowGame.playHighLow(context.auth.uid, wager, choice);
    return result;
  } catch (error) {
    console.error('High-low game error:', error);
    throw new functions.https.HttpsError('invalid-argument', error.message);
  }
});

// ============================================================
// LEADERBOARD FUNCTIONS
// ============================================================

/**
 * Get top players leaderboard
 */
exports['leaderboard-getLeaderboard'] = functions.https.onCall(async (data, context) => {
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

/**
 * Get user's game history
 */
exports['history-getUserHistory'] = functions.https.onCall(async (data, context) => {
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
// CLEANUP / ADMIN FUNCTIONS
// ============================================================

/**
 * Clean up old transactions (optional - for data management)
 */
exports['admin-cleanupOldTransactions'] = functions.pubsub
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
