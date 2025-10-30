import { signIn, onAuthChange, getCurrentUser } from './lib/firebase.js';
import { initializeUser, getUserBalance, getCurrentUserData } from './lib/auth.js';
import { db } from './lib/firebase.js';
import { initWheel } from './games/wheel.js';
import { initCoinFlip } from './games/coinflip.js';
import { initHighLow } from './games/highlow.js';
import * as api from './lib/api.js';

// Global state
let currentUser = null;

// Initialize app on page load
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  setupAuthListener();
});

function setupAuthListener() {
  onAuthChange(async (user) => {
    if (user) {
      currentUser = user;
      try {
        await initializeUser();
        await updateUIAfterAuth();
      } catch (error) {
        console.error('Initialization error:', error);
      }
    } else {
      currentUser = null;
      updateUIBeforeAuth();
    }
  });
}

async function updateUIAfterAuth() {
  // Update navbar
  document.getElementById('signin-btn').textContent = 'Signed In ✓';
  document.getElementById('signin-btn').disabled = true;

  // Update balance
  const balance = await getUserBalance();
  updateBalanceDisplay(balance);

  // Initialize games
  initWheel();
  initCoinFlip();
  initHighLow();

  // Load initial leaderboard
  await loadLeaderboard();
  await loadHistory();

  // Load profile
  await loadProfile();
  setupProfileListeners();
}

function updateUIBeforeAuth() {
  document.getElementById('signin-btn').textContent = 'Sign In';
  document.getElementById('signin-btn').disabled = false;
  document.getElementById('navbar-balance').textContent = '0';
}

function updateBalanceDisplay(balance) {
  document.getElementById('navbar-balance').textContent = balance.toLocaleString();
}

function setupEventListeners() {
  // Sign in button
  document.getElementById('signin-btn').addEventListener('click', async () => {
    try {
      document.getElementById('signin-btn').disabled = true;
      document.getElementById('signin-btn').textContent = 'Signing in...';
      await signIn();
      // Auth listener will handle the rest
    } catch (error) {
      console.error('Sign in error:', error);
      document.getElementById('signin-btn').disabled = false;
      document.getElementById('signin-btn').textContent = 'Sign In';
      alert('Failed to sign in: ' + error.message);
    }
  });

  // Tab navigation
  const tabButtons = document.querySelectorAll('.tab-button');
  const pages = document.querySelectorAll('.page');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;

      // Update active tab
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Update visible page
      pages.forEach(page => page.classList.remove('active'));
      document.getElementById(`${tab}-page`).classList.add('active');

      // Load leaderboard when switching to it
      if (tab === 'leaderboard') {
        loadLeaderboard();
      }

      // Load history when switching to it
      if (tab === 'history') {
        loadHistory();
      }

      // Load profile when switching to it
      if (tab === 'profile') {
        loadProfile();
      }
    });
  });
}

async function loadLeaderboard() {
  const leaderboardList = document.getElementById('leaderboard-list');

  try {
    const result = await api.getLeaderboard(50);
    const entries = result.data.entries || [];

    if (entries.length === 0) {
      leaderboardList.innerHTML = '<div class="card" style="text-align: center;">No leaderboard data yet.</div>';
      return;
    }

    leaderboardList.innerHTML = entries
      .map((entry, index) => {
        const rank = index + 1;
        let medalClass = '';
        let medal = '';

        if (rank === 1) {
          medalClass = 'gold';
          medal = '🥇';
        } else if (rank === 2) {
          medalClass = 'silver';
          medal = '🥈';
        } else if (rank === 3) {
          medalClass = 'bronze';
          medal = '🥉';
        }

        // Get initials for avatar
        const displayName = entry.displayName || 'Anonymous';
        const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        const avatarColor = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'][index % 5];

        return `
          <div class="leaderboard-entry ${medalClass}">
            <div class="leaderboard-rank">${medal} #${rank}</div>
            <div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, ${avatarColor}, #FFD700); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.9rem; color: white; flex-shrink: 0;">
              ${initials}
            </div>
            <div class="leaderboard-name">${displayName}</div>
            <div class="leaderboard-balance">${entry.bestBalance.toLocaleString()} FATTY BUCKS</div>
          </div>
        `;
      })
      .join('');
  } catch (error) {
    console.error('Leaderboard error:', error);
    leaderboardList.innerHTML = `<div class="card" style="text-align: center; color: var(--lose);">Failed to load leaderboard</div>`;
  }
}

async function loadHistory() {
  const historyList = document.getElementById('history-list');

  if (!currentUser) {
    historyList.innerHTML = '<div class="card" style="text-align: center;">Sign in to view history.</div>';
    return;
  }

  try {
    const result = await api.getUserHistory(20);
    const history = result.data.history || [];

    if (history.length === 0) {
      historyList.innerHTML = '<div class="card" style="text-align: center;">No game history yet.</div>';
      return;
    }

    historyList.innerHTML = history
      .map(entry => {
        const isWin = entry.payout > 0;
        const resultClass = isWin ? 'result-win' : 'result-lose';
        const resultText = isWin ? '✓ WIN' : '✗ LOSE';
        const amount = isWin ? `+${entry.payout}` : `-${entry.wager}`;

        const timestamp = new Date(entry.timestamp).toLocaleString();

        return `
          <div class="leaderboard-entry" style="border-left: 4px solid ${isWin ? 'var(--win)' : 'var(--lose)'};">
            <div style="flex: 1;">
              <div style="font-weight: 600; text-transform: capitalize;">${entry.game}</div>
              <div style="font-size: var(--font-size-sm); color: var(--text-secondary);">${timestamp}</div>
            </div>
            <div style="text-align: right;">
              <div style="color: ${isWin ? 'var(--win)' : 'var(--lose)'}; font-weight: 600;">${resultText}</div>
              <div style="color: var(--gold); font-size: var(--font-size-sm);">${amount} FATTY BUCKS</div>
            </div>
          </div>
        `;
      })
      .join('');
  } catch (error) {
    console.error('History error:', error);
    historyList.innerHTML = `<div class="card" style="text-align: center; color: var(--lose);">Failed to load history</div>`;
  }
}

// Profile Management
async function loadProfile() {
  const user = getCurrentUser();
  if (!user) return;

  try {
    const userData = await getCurrentUserData();
    if (userData) {
      const nameInput = document.getElementById('profile-name-input');
      const uidDisplay = document.getElementById('profile-uid');
      const balanceDisplay = document.getElementById('profile-balance');
      const bestDisplay = document.getElementById('profile-best');
      const avatarDiv = document.getElementById('profile-avatar');

      nameInput.value = userData.displayName || `Player${user.uid.substring(0, 6)}`;
      uidDisplay.textContent = `ID: ${user.uid.substring(0, 12)}...`;
      balanceDisplay.textContent = (userData.balance || 0).toLocaleString();

      // Get leaderboard data for best balance
      const leaderboardRef = db.collection('leaderboard').doc(user.uid);
      const leaderboardDoc = await leaderboardRef.get();
      if (leaderboardDoc.exists) {
        bestDisplay.textContent = (leaderboardDoc.data().bestBalance || 0).toLocaleString();
      }

      // Update avatar with initials
      const initials = (userData.displayName || 'P').split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
      avatarDiv.textContent = initials;
    }
  } catch (error) {
    console.error('Error loading profile:', error);
  }
}

function setupProfileListeners() {
  const saveBtn = document.getElementById('profile-save-btn');
  const nameInput = document.getElementById('profile-name-input');

  saveBtn.addEventListener('click', async () => {
    const user = getCurrentUser();
    if (!user) return;

    const newName = nameInput.value.trim();
    if (!newName) {
      alert('Please enter a name');
      return;
    }

    try {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';

      // Update user document
      const userRef = db.collection('users').doc(user.uid);
      await userRef.update({ displayName: newName });

      // Update leaderboard document
      const leaderboardRef = db.collection('leaderboard').doc(user.uid);
      await leaderboardRef.update({ displayName: newName });

      // Update avatar
      const avatarDiv = document.getElementById('profile-avatar');
      const initials = newName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
      avatarDiv.textContent = initials;

      saveBtn.textContent = 'Saved!';
      setTimeout(() => {
        saveBtn.textContent = 'Save';
        saveBtn.disabled = false;
      }, 1500);

      // Refresh leaderboard to show new name
      loadLeaderboard();
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile: ' + error.message);
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save';
    }
  });
}

// Try to sign in silently if user exists
setTimeout(() => {
  const user = getCurrentUser();
  if (!user && !document.getElementById('signin-btn').disabled) {
    // User needs to sign in
  }
}, 1000);
