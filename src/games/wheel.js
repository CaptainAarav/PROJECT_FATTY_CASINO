import * as api from '../lib/api.js';

let currentBet = 10;
let isPlaying = false;

export function initWheel() {
  const chipButtons = document.querySelectorAll('#wheel-chips .chip-btn');
  const customInput = document.getElementById('wheel-custom-bet');
  const playBtn = document.getElementById('wheel-play');
  const betDisplay = document.getElementById('wheel-bet-amount');

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

  // Play button
  playBtn.addEventListener('click', () => playGame());
}

async function playGame() {
  if (isPlaying) return;

  const wheel = document.getElementById('wheel');
  const resultDiv = document.getElementById('wheel-result');
  const playBtn = document.getElementById('wheel-play');

  try {
    isPlaying = true;
    playBtn.disabled = true;

    // Clear previous result
    resultDiv.classList.remove('show');

    // Spin animation with random rotation
    const randomRotation = Math.random() * 360;
    const totalRotation = 1800 + randomRotation; // 5 full rotations + random final position

    wheel.style.transform = `rotate(${totalRotation}deg)`;
    wheel.style.transition = 'transform 4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';

    // Call Cloud Function
    const result = await api.playWheel(currentBet);

    // Wait for animation to complete
    await new Promise(resolve => setTimeout(resolve, 4000));

    // Show result
    displayResult(result.data);

    // Update balance display
    updateBalance(result.data.balanceAfter);
  } catch (error) {
    console.error('Game error:', error);
    showError(error.message, resultDiv);
  } finally {
    isPlaying = false;
    playBtn.disabled = false;
  }
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

export function setCurrentBet(amount) {
  currentBet = amount;
}

export function getCurrentBet() {
  return currentBet;
}
