import * as api from '../lib/api.js';

let currentBet = 10;
let isPlaying = false;
let selectedChoice = null;

export function initCoinFlip() {
  const chipButtons = document.querySelectorAll('#coinflip-chips .chip-btn');
  const customInput = document.getElementById('coinflip-custom-bet');
  const betDisplay = document.getElementById('coinflip-bet-amount');
  const headsBtn = document.getElementById('coinflip-heads');
  const tailsBtn = document.getElementById('coinflip-tails');
  const coin = document.getElementById('coin');

  // Chip selection
  chipButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      chipButtons.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      currentBet = parseInt(btn.dataset.amount);
      customInput.value = '';
      betDisplay.textContent = `Bet: ${currentBet} FB`;
    });
  });

  // Custom input
  customInput.addEventListener('change', () => {
    const value = parseInt(customInput.value);
    if (value > 0) {
      chipButtons.forEach(b => b.classList.remove('selected'));
      currentBet = value;
      betDisplay.textContent = `Bet: ${currentBet} FB`;
    }
  });

  // Choice selection
  headsBtn.addEventListener('click', () => {
    selectedChoice = 'heads';
    headsBtn.classList.add('btn-primary');
    headsBtn.classList.remove('btn-secondary');
    tailsBtn.classList.add('btn-secondary');
    tailsBtn.classList.remove('btn-primary');
    playGame('heads', coin, headsBtn, tailsBtn);
  });

  tailsBtn.addEventListener('click', () => {
    selectedChoice = 'tails';
    tailsBtn.classList.add('btn-primary');
    tailsBtn.classList.remove('btn-secondary');
    headsBtn.classList.add('btn-secondary');
    headsBtn.classList.remove('btn-primary');
    playGame('tails', coin, headsBtn, tailsBtn);
  });
}

async function playGame(choice, coin, headsBtn, tailsBtn) {
  if (isPlaying) return;

  const resultDiv = document.getElementById('coinflip-result');

  try {
    isPlaying = true;
    headsBtn.disabled = true;
    tailsBtn.disabled = true;

    // Clear previous result
    resultDiv.classList.remove('show');

    // Flip animation
    coin.classList.add('coin-flipping');
    coin.style.transform = 'rotateY(0deg)';

    // Call Cloud Function
    const result = await api.playCoinFlip(currentBet, choice);

    // Wait for animation to complete
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Show result coin
    const coinResult = result.data.result;
    coin.textContent = coinResult === 'heads' ? 'H' : 'T';
    coin.classList.remove('coin-flipping');

    // Show result
    displayResult(result.data, resultDiv);

    // Update balance display
    updateBalance(result.data.balanceAfter);
  } catch (error) {
    console.error('Game error:', error);
    showError(error.message, resultDiv);
  } finally {
    isPlaying = false;
    headsBtn.disabled = false;
    tailsBtn.disabled = false;
  }
}

function displayResult(data, resultDiv) {
  const isWin = data.payout > 0;
  const resultClass = isWin ? 'result-win' : 'result-lose';
  const title = isWin ? '🎉 WIN!' : '❌ LOSE';
  const amount = isWin ? `+${data.payout} FB` : `-${data.wager} FB`;

  resultDiv.innerHTML = `
    <div class="${resultClass}">
      <div class="result-title">${title}</div>
      <div style="margin-top: var(--spacing-sm);">Result: ${data.result === 'heads' ? 'Heads' : 'Tails'}</div>
      <div class="result-amount">${amount}</div>
    </div>
  `;

  resultDiv.classList.add('show');
  if (isWin) {
    resultDiv.classList.add('flash-win');
    playConfetti();
  } else {
    resultDiv.classList.add('flash-lose');
  }
}

function showError(message, resultDiv) {
  resultDiv.innerHTML = `
    <div class="result-lose">
      <div class="result-title">Error</div>
      <div style="color: var(--lose);">${message}</div>
    </div>
  `;
  resultDiv.classList.add('show');
}

function updateBalance(newBalance) {
  document.getElementById('navbar-balance').textContent = newBalance.toLocaleString();
  document.getElementById('navbar-balance').parentElement.parentElement.classList.add('balance-update');
  setTimeout(() => {
    document.getElementById('navbar-balance').parentElement.parentElement.classList.remove('balance-update');
  }, 200);
}

function playConfetti() {
  for (let i = 0; i < 30; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    confetti.style.left = Math.random() * 100 + '%';
    confetti.style.backgroundColor = ['#0A84FF', '#34C759', '#FFD60A'][Math.floor(Math.random() * 3)];
    confetti.style.animationDelay = Math.random() * 0.5 + 's';
    document.body.appendChild(confetti);
    setTimeout(() => confetti.remove(), 2500);
  }
}
