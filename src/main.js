import { signIn, onAuthChange, getCurrentUser } from './lib/firebase.js';
import { initializeUser, getUserBalance } from './lib/auth.js';
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

        return `
          <div class="leaderboard-entry ${medalClass}">
            <div class="leaderboard-rank">${medal} #${rank}</div>
            <div class="leaderboard-name">${entry.displayName || 'Anonymous'}</div>
            <div class="leaderboard-balance">${entry.bestBalance.toLocaleString()} FB</div>
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
              <div style="color: var(--gold); font-size: var(--font-size-sm);">${amount} FB</div>
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

// Try to sign in silently if user exists
setTimeout(() => {
  const user = getCurrentUser();
  if (!user && !document.getElementById('signin-btn').disabled) {
    // User needs to sign in
  }
}, 1000);
