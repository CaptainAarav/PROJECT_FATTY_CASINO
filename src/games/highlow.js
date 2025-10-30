import * as api from '../lib/api.js';

let currentBet = 10;
let isPlaying = false;

export function initHighLow() {
  const chipButtons = document.querySelectorAll('#highlow-chips .chip-btn');
  const customInput = document.getElementById('highlow-custom-bet');
  const betDisplay = document.getElementById('highlow-bet-amount');
  const highBtn = document.getElementById('highlow-high');
  const lowBtn = document.getElementById('highlow-low');

  // Chip selection
  chipButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      chipButtons.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      currentBet = parseInt(btn.dataset.amount);
      customInput.value = '';
      betDisplay.textContent = `Bet: ${currentBet} FATTY BUCKS`;
    });
  });

  // Custom input
  customInput.addEventListener('change', () => {
    const value = parseInt(customInput.value);
    if (value > 0) {
      chipButtons.forEach(b => b.classList.remove('selected'));
      currentBet = value;
      betDisplay.textContent = `Bet: ${currentBet} FATTY BUCKS`;
    }
  });

  // Choice selection
  highBtn.addEventListener('click', () => playGame('high', highBtn, lowBtn));
  lowBtn.addEventListener('click', () => playGame('low', highBtn, lowBtn));
}

async function playGame(choice, highBtn, lowBtn) {
  if (isPlaying) return;

  const resultDiv = document.getElementById('highlow-result');
  const cardDisplay = document.getElementById('highlow-card-display');

  try {
    isPlaying = true;
    highBtn.disabled = true;
    lowBtn.disabled = true;

    // Clear previous result
    resultDiv.classList.remove('show');
    cardDisplay.textContent = '?';

    // Call Cloud Function
    const result = await api.playHighLow(currentBet, choice);

    // Animate card reveal
    await revealCard(result.data.serverRoll, cardDisplay);

    // Show result
    displayResult(result.data);

    // Update balance display
    updateBalance(result.data.balanceAfter);
  } catch (error) {
    console.error('Game error:', error);
    showError(error.message, resultDiv);
  } finally {
    isPlaying = false;
    highBtn.disabled = false;
    lowBtn.disabled = false;
  }
}

async function revealCard(value, cardDisplay) {
  // Animate card flip
  cardDisplay.style.transition = 'transform 0.3s ease-in-out';

  // Quick flip
  cardDisplay.style.transform = 'scaleX(0)';
  await new Promise(resolve => setTimeout(resolve, 150));

  // Update content
  cardDisplay.textContent = formatCard(value);

  // Flip back
  cardDisplay.style.transform = 'scaleX(1)';
  await new Promise(resolve => setTimeout(resolve, 300));

  cardDisplay.style.transform = 'scaleX(1)';
  return new Promise(resolve => setTimeout(resolve, 600));
}

function formatCard(value) {
  const suits = ['♠', '♥', '♦', '♣'];
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const cardValue = value % 52;
  const rank = ranks[cardValue % 13];
  const suit = suits[Math.floor(cardValue / 13)];
  return `${rank}${suit}`;
}

function displayResult(data) {
  const isWin = data.payout > 0;
  const title = isWin ? '🎉 WIN!' : '❌ LOSE';
  const amount = isWin ? `+${data.payout} FATTY BUCKS` : `-${data.wager} FATTY BUCKS`;
  const textColor = isWin ? 'var(--win)' : 'var(--lose)';

  const modal = document.getElementById('result-modal');
  const modalInner = document.getElementById('result-modal-inner');

  modalInner.innerHTML = `
    <div class="result-modal-content">
      <div class="result-modal-title" style="color: ${textColor};">${title}</div>
      <div class="result-modal-details">You chose: ${data.choice === 'high' ? 'HIGH' : 'LOW'}</div>
      <div class="result-modal-details">Card was: ${data.isHigh ? 'HIGH' : 'LOW'}</div>
      <div class="result-modal-amount" style="color: ${textColor};">${amount}</div>
      <div class="result-modal-details">You now have ${data.balanceAfter.toLocaleString()} FATTY BUCKS</div>
      <button class="btn btn-primary result-modal-button" onclick="document.getElementById('result-modal').classList.remove('show')">Continue</button>
    </div>
  `;

  modal.classList.add('show');
  if (isWin) {
    playConfetti();
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
