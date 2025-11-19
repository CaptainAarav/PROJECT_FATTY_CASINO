import './style.css'
import {
  isConfigured,
  signInWithGoogle,
  signUpWithEmail,
  signInWithEmail,
  signOutUser,
  onAuthChange,
  getUserData,
  createUserProfile,
  updateUserData,
  getLeaderboard,
  sendChatMessage,
  subscribeToChatMessages,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  getFriendRequests,
  getFriends,
  sendGift,
  searchUsers
} from './firebase.js'

// Achievement definitions
const ACHIEVEMENTS = [
  { id: 'first_win', name: 'First Winner', description: 'Win your first game', icon: '🏆', reward: 500, condition: (stats) => stats.totalWon > 0 },
  { id: 'high_roller', name: 'High Roller', description: 'Wager 50,000 FATTY BUCKS', icon: '💎', reward: 2000, condition: (stats) => stats.totalWagered >= 50000 },
  { id: 'millionaire', name: 'Millionaire', description: 'Reach 1,000,000 FATTY BUCKS', icon: '💰', reward: 10000, condition: (stats, balance) => balance >= 1000000 },
  { id: 'lucky_streak', name: 'Lucky Streak', description: 'Win 5 games in a row', icon: '🍀', reward: 1000, condition: (stats) => stats.winStreak >= 5 },
  { id: 'big_winner', name: 'Big Winner', description: 'Win 100,000 in a single game', icon: '🎰', reward: 5000, condition: (stats) => stats.biggestWin >= 100000 },
  { id: 'grinder', name: 'The Grinder', description: 'Play 100 games', icon: '⚡', reward: 3000, condition: (stats) => stats.gamesPlayed >= 100 },
  { id: 'social_butterfly', name: 'Social Butterfly', description: 'Add 5 friends', icon: '👥', reward: 1500, condition: (stats, balance, friends) => friends.length >= 5 },
  { id: 'generous', name: 'Generous Soul', description: 'Gift 10,000 FATTY BUCKS to friends', icon: '🎁', reward: 2000, condition: (stats) => stats.totalGifted >= 10000 }
]

// Daily quest definitions
const DAILY_QUESTS = [
  { id: 'daily_games', name: 'Play 10 games', description: 'Play any 10 games', reward: 1000, target: 10, type: 'games' },
  { id: 'daily_wager', name: 'Wager 5,000', description: 'Wager 5,000 FATTY BUCKS', reward: 800, target: 5000, type: 'wager' },
  { id: 'daily_wins', name: 'Win 5 games', description: 'Win any 5 games', reward: 1500, target: 5, type: 'wins' }
]

// VIP tier thresholds
const VIP_TIERS = [
  { name: 'Bronze', minXP: 0, color: '#CD7F32', perks: ['Basic rewards', 'Daily bonus'] },
  { name: 'Silver', minXP: 5000, color: '#C0C0C0', perks: ['5% bonus XP', '10% better odds', 'Silver badge'] },
  { name: 'Gold', minXP: 15000, color: '#FFD700', perks: ['10% bonus XP', '15% better odds', 'Gold badge', 'Exclusive games'] },
  { name: 'Platinum', minXP: 35000, color: '#E5E4E2', perks: ['15% bonus XP', '20% better odds', 'Platinum badge', 'Priority support'] },
  { name: 'Diamond', minXP: 75000, color: '#B9F2FF', perks: ['25% bonus XP', '25% better odds', 'Diamond badge', 'VIP lounge access'] }
]

// Shop items
const SHOP_ITEMS = [
  { id: 'lucky_charm', name: 'Lucky Charm', description: '+5% win chance for 24h', price: 5000, icon: '🍀', type: 'boost', duration: 86400000 },
  { id: 'double_xp', name: 'Double XP', description: '2x XP for 1 hour', price: 3000, icon: '⚡', type: 'boost', duration: 3600000 },
  { id: 'coin_doubler', name: 'Coin Doubler', description: '2x winnings for 30min', price: 10000, icon: '💰', type: 'boost', duration: 1800000 },
  { id: 'vip_pass', name: 'VIP Day Pass', description: 'Access VIP features for 24h', price: 8000, icon: '👑', type: 'pass', duration: 86400000 },
  { id: 'gold_frame', name: 'Gold Profile Frame', description: 'Permanent gold profile frame', price: 15000, icon: '🖼️', type: 'cosmetic', duration: null },
  { id: 'rainbow_frame', name: 'Rainbow Profile Frame', description: 'Permanent rainbow profile frame', price: 25000, icon: '🌈', type: 'cosmetic', duration: null }
]

// Helper functions
function calculateLevel(xp) {
  return Math.floor(Math.sqrt(xp / 100)) + 1
}

function getXPForLevel(level) {
  return Math.pow(level - 1, 2) * 100
}

function getXPForNextLevel(level) {
  return Math.pow(level, 2) * 100
}

function calculateVIPTier(xp) {
  for (let i = VIP_TIERS.length - 1; i >= 0; i--) {
    if (xp >= VIP_TIERS[i].minXP) {
      return VIP_TIERS[i].name
    }
  }
  return 'Bronze'
}

// Game State Management
class FattyCasino {
  constructor() {
    this.currentView = 'home'
    this.user = null
    this.balance = 10000
    this.profile = {
      username: 'Player',
      avatar: '🎰',
      profileImage: null,
      theme: 'gold'
    }
    this.stats = {
      totalWagered: 0,
      totalWon: 0,
      totalLost: 0,
      gamesPlayed: 0,
      biggestWin: 0,
      winStreak: 0,
      currentStreak: 0
    }
    this.lastDailyBonus = null
    this.leaderboard = []
    this.leaderboardInterval = null
    this.leaderboardTimerInterval = null
    this.leaderboardSecondsUntilRefresh = 60
    this.gamesDropdownOpen = false
    this.cropImageData = null
    this.cropZoom = 1
    this.cropPosition = { x: 0, y: 0 }
    // Social features
    this.chatMessages = []
    this.chatUnsubscribe = null
    this.friends = []
    this.friendRequests = []
    // Progression system
    this.xp = 0
    this.level = 1
    this.achievements = []
    this.dailyQuests = []
    this.vipTier = 'Bronze'
    this.inventory = []
    this.init()
  }

  async init() {
    // Show loading state
    this.showLoading()

    // Listen for auth changes
    onAuthChange(async (user) => {
      this.user = user
      if (user) {
        await this.loadUserData(user.uid)
        this.startLeaderboardPolling()
        this.startChatSubscription()
        await this.loadFriends()
        await this.loadFriendRequests()
      } else {
        this.leaderboard = []
        this.stopLeaderboardPolling()
        this.stopChatSubscription()
        this.friends = []
        this.friendRequests = []
      }
      this.render()
      this.updateWallet()
    })
  }

  startChatSubscription() {
    if (this.chatUnsubscribe) {
      this.chatUnsubscribe()
    }
    this.chatUnsubscribe = subscribeToChatMessages((messages) => {
      this.chatMessages = messages
      if (this.currentView === 'chat') {
        this.render()
      }
    })
  }

  stopChatSubscription() {
    if (this.chatUnsubscribe) {
      this.chatUnsubscribe()
      this.chatUnsubscribe = null
    }
  }

  async loadFriends() {
    if (!this.user) return
    try {
      this.friends = await getFriends(this.user.uid)
    } catch (error) {
      console.error('Error loading friends:', error)
    }
  }

  async loadFriendRequests() {
    if (!this.user) return
    try {
      this.friendRequests = await getFriendRequests(this.user.uid)
    } catch (error) {
      console.error('Error loading friend requests:', error)
    }
  }

  showLoading() {
    document.querySelector('#app').innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; background: var(--bg-primary);">
        <div style="text-align: center;">
          <h1 style="font-size: 3rem; background: linear-gradient(135deg, var(--accent-gold), #ffed4e); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">🎰 FATTY CASINO</h1>
          <p style="color: var(--text-secondary); margin-top: 1rem;">Loading...</p>
        </div>
      </div>
    `
  }

  async loadUserData(userId) {
    try {
      const userData = await getUserData(userId)

      if (userData) {
        // Load existing user data
        this.balance = userData.balance !== undefined ? userData.balance : 10000
        this.profile = {
          username: userData.username || this.user.displayName || 'Player',
          avatar: userData.avatar || '🎰',
          profileImage: userData.profileImage || null,
          theme: userData.theme || 'gold'
        }
        this.stats = userData.stats || this.stats
        this.lastDailyBonus = userData.lastDailyBonus || null
        // Load progression data
        this.xp = userData.xp || 0
        this.level = calculateLevel(this.xp)
        this.achievements = userData.achievements || []
        this.dailyQuests = userData.dailyQuests || this.generateDailyQuests()
        this.vipTier = calculateVIPTier(this.xp)
        this.inventory = userData.inventory || []
      } else {
        // Create new user profile
        await this.createNewUserProfile(userId)
      }
    } catch (error) {
      console.error('Error loading user data:', error)
      this.showMessage('Error loading user data', 'error')
    }
  }

  async createNewUserProfile(userId) {
    const newUserData = {
      username: this.user.displayName || 'Player',
      email: this.user.email,
      avatar: '🎰',
      profileImage: null,
      theme: 'gold',
      balance: 10000,
      stats: this.stats,
      friends: [],
      xp: 0,
      achievements: [],
      dailyQuests: this.generateDailyQuests(),
      inventory: []
    }

    await createUserProfile(userId, newUserData)
    this.balance = 10000
    this.profile = {
      username: newUserData.username,
      avatar: newUserData.avatar,
      profileImage: null,
      theme: newUserData.theme
    }
  }

  async fetchLeaderboard() {
    try {
      this.leaderboard = await getLeaderboard(10)
      // Reset the countdown timer
      this.leaderboardSecondsUntilRefresh = 60
      if (this.currentView === 'leaderboard') {
        // Only re-render if we're on the leaderboard page
        this.render()
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
    }
  }

  updateLeaderboardTimer() {
    this.leaderboardSecondsUntilRefresh--
    if (this.leaderboardSecondsUntilRefresh < 0) {
      this.leaderboardSecondsUntilRefresh = 60
    }

    // Update the timer display if we're on the leaderboard page
    if (this.currentView === 'leaderboard') {
      const timerEl = document.getElementById('leaderboard-timer')
      if (timerEl) {
        timerEl.textContent = `${this.leaderboardSecondsUntilRefresh}s`
      }
    }
  }

  startLeaderboardPolling() {
    // Stop any existing interval
    this.stopLeaderboardPolling()

    // Fetch immediately
    this.fetchLeaderboard()

    // Start the countdown timer (updates every second)
    this.leaderboardTimerInterval = setInterval(() => {
      this.updateLeaderboardTimer()
    }, 1000) // 1000ms = 1 second

    // Then fetch every 60 seconds (1 minute)
    this.leaderboardInterval = setInterval(() => {
      this.fetchLeaderboard()
    }, 60000) // 60000ms = 1 minute
  }

  stopLeaderboardPolling() {
    if (this.leaderboardInterval) {
      clearInterval(this.leaderboardInterval)
      this.leaderboardInterval = null
    }
    if (this.leaderboardTimerInterval) {
      clearInterval(this.leaderboardTimerInterval)
      this.leaderboardTimerInterval = null
    }
  }

  async saveUserData() {
    if (!this.user) return

    try {
      await updateUserData(this.user.uid, {
        username: this.profile.username,
        avatar: this.profile.avatar,
        profileImage: this.profile.profileImage,
        theme: this.profile.theme,
        balance: this.balance,
        stats: this.stats,
        lastDailyBonus: this.lastDailyBonus,
        xp: this.xp,
        achievements: this.achievements,
        dailyQuests: this.dailyQuests,
        inventory: this.inventory
      })
    } catch (error) {
      console.error('Error saving user data:', error)
      this.showMessage('Error saving data', 'error')
    }
  }

  // Progression system methods
  addXP(amount) {
    const oldLevel = this.level
    this.xp += amount
    this.level = calculateLevel(this.xp)
    this.vipTier = calculateVIPTier(this.xp)

    if (this.level > oldLevel) {
      this.showMessage(`🎉 Level Up! You reached Level ${this.level}!`, 'success')
      this.balance += this.level * 100 // Level up reward
    }
  }

  generateDailyQuests() {
    const now = new Date().toDateString()
    return DAILY_QUESTS.map(quest => ({
      ...quest,
      progress: 0,
      completed: false,
      date: now
    }))
  }

  checkDailyQuests() {
    if (!this.dailyQuests || this.dailyQuests.length === 0) {
      this.dailyQuests = this.generateDailyQuests()
      return
    }

    // Reset quests if it's a new day
    const today = new Date().toDateString()
    if (this.dailyQuests[0].date !== today) {
      this.dailyQuests = this.generateDailyQuests()
    }
  }

  updateQuestProgress(type, amount) {
    this.checkDailyQuests()

    this.dailyQuests.forEach(quest => {
      if (quest.type === type && !quest.completed) {
        quest.progress = Math.min(quest.progress + amount, quest.target)
        if (quest.progress >= quest.target) {
          quest.completed = true
          this.balance += quest.reward
          this.showMessage(`✅ Quest completed: ${quest.name}! +${quest.reward} FATTY BUCKS`, 'success')
        }
      }
    })
  }

  checkAchievements() {
    ACHIEVEMENTS.forEach(achievement => {
      if (!this.achievements.includes(achievement.id)) {
        if (achievement.condition(this.stats, this.balance, this.friends)) {
          this.achievements.push(achievement.id)
          this.balance += achievement.reward
          this.addXP(achievement.reward / 2)
          this.showMessage(`🏆 Achievement Unlocked: ${achievement.name}! +${achievement.reward} FATTY BUCKS`, 'success')
        }
      }
    })
  }

  buyShopItem(itemId) {
    const item = SHOP_ITEMS.find(i => i.id === itemId)
    if (!item) return

    if (this.balance < item.price) {
      this.showMessage('Insufficient FATTY BUCKS!', 'error')
      return
    }

    this.balance -= item.price

    const inventoryItem = {
      ...item,
      purchasedAt: new Date().toISOString(),
      expiresAt: item.duration ? new Date(Date.now() + item.duration).toISOString() : null
    }

    this.inventory.push(inventoryItem)
    this.saveUserData()
    this.showMessage(`Purchased ${item.name}!`, 'success')
  }

  getActiveBoosts() {
    const now = Date.now()
    return this.inventory.filter(item => {
      if (!item.expiresAt) return item.type === 'cosmetic'
      return new Date(item.expiresAt).getTime() > now
    })
  }

  canClaimDailyBonus() {
    if (!this.lastDailyBonus) return true
    const now = new Date()
    const lastClaim = new Date(this.lastDailyBonus)
    const hoursSince = (now - lastClaim) / (1000 * 60 * 60)
    return hoursSince >= 24
  }

  async claimDailyBonus() {
    if (!this.canClaimDailyBonus()) {
      const now = new Date()
      const lastClaim = new Date(this.lastDailyBonus)
      const hoursRemaining = 24 - ((now - lastClaim) / (1000 * 60 * 60))
      this.showMessage(`Daily bonus available in ${Math.ceil(hoursRemaining)} hours!`, 'error')
      return
    }

    this.balance += 1000
    this.lastDailyBonus = new Date().toISOString()
    await this.saveUserData()
    this.updateWallet()
    this.showMessage('🎁 Claimed 1,000 FATTY BUCKS! Come back in 24 hours for more!', 'success')
    this.render()
  }

  async handleGoogleSignIn() {
    try {
      await signInWithGoogle()
      this.showMessage('Successfully signed in!', 'success')
    } catch (error) {
      console.error('Sign in error:', error)
      this.showMessage('Failed to sign in. Please try again.', 'error')
    }
  }

  async handleEmailSignIn() {
    const email = document.getElementById('login-email')?.value
    const password = document.getElementById('login-password')?.value

    if (!email || !password) {
      this.showMessage('Please enter both email and password', 'error')
      return
    }

    try {
      await signInWithEmail(email, password)
      this.showMessage('Successfully signed in!', 'success')
    } catch (error) {
      console.error('Sign in error:', error)
      let errorMessage = 'Failed to sign in. Please try again.'

      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email.'
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password.'
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address.'
      } else if (error.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid email or password.'
      }

      this.showMessage(errorMessage, 'error')
    }
  }

  async handleEmailSignUp() {
    const email = document.getElementById('login-email')?.value
    const password = document.getElementById('login-password')?.value

    if (!email || !password) {
      this.showMessage('Please enter both email and password', 'error')
      return
    }

    if (password.length < 6) {
      this.showMessage('Password must be at least 6 characters', 'error')
      return
    }

    try {
      await signUpWithEmail(email, password)
      this.showMessage('Account created successfully! Welcome!', 'success')
    } catch (error) {
      console.error('Sign up error:', error)
      let errorMessage = 'Failed to create account. Please try again.'

      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'An account with this email already exists.'
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address.'
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Use at least 6 characters.'
      }

      this.showMessage(errorMessage, 'error')
    }
  }

  async handleSignOut() {
    try {
      await signOutUser()
      this.showMessage('Successfully signed out!', 'success')
    } catch (error) {
      console.error('Sign out error:', error)
      this.showMessage('Failed to sign out', 'error')
    }
  }

  updateStats(wagered, won, isWin) {
    this.stats.totalWagered += wagered
    this.stats.gamesPlayed += 1

    if (isWin) {
      this.stats.totalWon += won
      this.stats.currentStreak += 1
      if (this.stats.currentStreak > this.stats.winStreak) {
        this.stats.winStreak = this.stats.currentStreak
      }
      if (won > this.stats.biggestWin) {
        this.stats.biggestWin = won
      }
      // Award XP for winning
      this.addXP(Math.floor(won / 10))
      // Update quest progress
      this.updateQuestProgress('wins', 1)
    } else {
      this.stats.totalLost += wagered
      this.stats.currentStreak = 0
    }

    // Update quest progress for games and wager
    this.updateQuestProgress('games', 1)
    this.updateQuestProgress('wager', wagered)

    // Check for achievements
    this.checkAchievements()

    this.saveUserData()
  }

  updateWallet() {
    const walletEl = document.querySelector('.wallet-amount')
    if (walletEl) {
      walletEl.textContent = `${this.balance.toLocaleString()} FATTY BUCKS`
    }
  }

  placeBet(amount, onWin, onLose) {
    if (amount > this.balance) {
      this.showMessage('Insufficient FATTY BUCKS!', 'error')
      return false
    }

    this.balance -= amount
    this.saveUserData()
    this.updateWallet()

    return { win: onWin, lose: onLose }
  }

  showMessage(text, type = 'success') {
    const existing = document.querySelector('.message')
    if (existing) existing.remove()

    const message = document.createElement('div')
    message.className = `message message-${type}`
    message.textContent = text

    const content = document.querySelector('.main-content')
    if (content) {
      content.insertBefore(message, content.firstChild)
      setTimeout(() => message.remove(), 3000)
    }
  }

  showImageCropModal(imageDataUrl) {
    this.cropImageData = imageDataUrl
    this.cropZoom = 1
    this.cropPosition = { x: 0, y: 0 }

    // Create modal
    const modal = document.createElement('div')
    modal.id = 'crop-modal'
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.9);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    `

    // Determine canvas size based on screen width
    const isMobile = window.innerWidth <= 480
    const canvasSize = isMobile ? Math.min(window.innerWidth - 80, 300) : 400
    const cropCircleSize = isMobile ? canvasSize * 0.75 : 300

    modal.innerHTML = `
      <div style="background: var(--bg-secondary); border: 2px solid var(--border); border-radius: 12px; padding: ${isMobile ? '1rem' : '2rem'}; max-width: ${isMobile ? '100%' : '600px'}; width: ${isMobile ? 'calc(100% - 2rem)' : '100%'}; max-height: ${isMobile ? '90vh' : 'auto'}; overflow-y: auto;">
        <h2 style="color: var(--accent-gold); margin-bottom: 1rem; text-align: center; font-size: ${isMobile ? '1.2rem' : '1.5rem'};">Crop & Zoom Profile Image</h2>

        <div style="position: relative; width: ${canvasSize}px; height: ${canvasSize}px; margin: 0 auto 1rem; background: var(--bg-tertiary); border-radius: 12px; overflow: hidden; border: 2px solid var(--border);">
          <canvas id="crop-canvas" width="${canvasSize}" height="${canvasSize}" style="cursor: move; display: block; touch-action: none;"></canvas>
          <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: ${cropCircleSize}px; height: ${cropCircleSize}px; border: 3px solid var(--accent-gold); border-radius: 50%; pointer-events: none; box-shadow: 0 0 0 1000px rgba(0, 0, 0, 0.5);"></div>
        </div>

        <div style="margin-bottom: 1rem;">
          <label style="display: block; color: var(--text-secondary); margin-bottom: 0.5rem; font-weight: 600; font-size: ${isMobile ? '0.9rem' : '1rem'};">Zoom</label>
          <input type="range" id="zoom-slider" min="1" max="3" step="0.1" value="1" style="width: 100%; height: 6px; background: var(--bg-tertiary); border-radius: 3px; outline: none;">
        </div>

        <div style="display: flex; gap: ${isMobile ? '0.5rem' : '1rem'}; justify-content: center; flex-wrap: wrap;">
          <button id="crop-cancel-btn" class="btn btn-secondary" style="${isMobile ? 'flex: 1; min-width: 120px;' : ''}">Cancel</button>
          <button id="crop-save-btn" class="btn btn-primary" style="${isMobile ? 'flex: 1; min-width: 120px;' : ''}">Save</button>
        </div>
      </div>
    `

    document.body.appendChild(modal)

    // Initialize canvas
    const canvas = document.getElementById('crop-canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      this.drawCropPreview(ctx, img, canvas.width, canvas.height)
    }
    img.src = imageDataUrl

    // Zoom slider
    document.getElementById('zoom-slider').addEventListener('input', (e) => {
      this.cropZoom = parseFloat(e.target.value)
      this.drawCropPreview(ctx, img, canvas.width, canvas.height)
    })

    // Canvas dragging (mouse and touch support)
    let isDragging = false
    let lastPos = { x: 0, y: 0 }

    const getPosition = (e) => {
      const rect = canvas.getBoundingClientRect()
      if (e.touches) {
        return {
          x: e.touches[0].clientX - rect.left,
          y: e.touches[0].clientY - rect.top
        }
      }
      return { x: e.offsetX, y: e.offsetY }
    }

    // Mouse events
    canvas.addEventListener('mousedown', (e) => {
      isDragging = true
      lastPos = getPosition(e)
    })

    canvas.addEventListener('mousemove', (e) => {
      if (!isDragging) return
      const currentPos = getPosition(e)
      const dx = currentPos.x - lastPos.x
      const dy = currentPos.y - lastPos.y
      this.cropPosition.x += dx
      this.cropPosition.y += dy
      lastPos = currentPos
      this.drawCropPreview(ctx, img, canvas.width, canvas.height)
    })

    canvas.addEventListener('mouseup', () => {
      isDragging = false
    })

    canvas.addEventListener('mouseleave', () => {
      isDragging = false
    })

    // Touch events for mobile
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault()
      isDragging = true
      lastPos = getPosition(e)
    })

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault()
      if (!isDragging) return
      const currentPos = getPosition(e)
      const dx = currentPos.x - lastPos.x
      const dy = currentPos.y - lastPos.y
      this.cropPosition.x += dx
      this.cropPosition.y += dy
      lastPos = currentPos
      this.drawCropPreview(ctx, img, canvas.width, canvas.height)
    })

    canvas.addEventListener('touchend', () => {
      isDragging = false
    })

    canvas.addEventListener('touchcancel', () => {
      isDragging = false
    })

    // Cancel button
    document.getElementById('crop-cancel-btn').addEventListener('click', () => {
      modal.remove()
    })

    // Save button
    document.getElementById('crop-save-btn').addEventListener('click', () => {
      const croppedImage = this.getCroppedImage(img, canvas.width, canvas.height, cropCircleSize)
      this.profile.profileImage = croppedImage
      this.saveUserData()
      this.showMessage('Profile image uploaded!', 'success')
      modal.remove()
      this.render()
    })
  }

  drawCropPreview(ctx, img, canvasWidth, canvasHeight) {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight)

    const scale = this.cropZoom
    const imgWidth = img.width * scale
    const imgHeight = img.height * scale

    // Center the image initially
    const centerX = (canvasWidth - imgWidth) / 2
    const centerY = (canvasHeight - imgHeight) / 2

    ctx.drawImage(
      img,
      centerX + this.cropPosition.x,
      centerY + this.cropPosition.y,
      imgWidth,
      imgHeight
    )
  }

  getCroppedImage(img, canvasWidth, canvasHeight, cropSize = 300) {
    const cropCanvas = document.createElement('canvas')
    cropCanvas.width = cropSize
    cropCanvas.height = cropSize
    const cropCtx = cropCanvas.getContext('2d')

    const scale = this.cropZoom
    const imgWidth = img.width * scale
    const imgHeight = img.height * scale

    // Center the image in the preview canvas
    const previewCenterX = (canvasWidth - imgWidth) / 2 + this.cropPosition.x
    const previewCenterY = (canvasHeight - imgHeight) / 2 + this.cropPosition.y

    // The crop circle is centered in the preview canvas
    const circleCenterX = canvasWidth / 2
    const circleCenterY = canvasHeight / 2
    const circleRadius = cropSize / 2

    // Calculate what part of the preview image falls within the crop circle
    const sourceX = circleCenterX - circleRadius - previewCenterX
    const sourceY = circleCenterY - circleRadius - previewCenterY

    // Draw the cropped portion
    cropCtx.drawImage(
      img,
      sourceX / scale,
      sourceY / scale,
      cropSize / scale,
      cropSize / scale,
      0,
      0,
      cropSize,
      cropSize
    )

    return cropCanvas.toDataURL('image/jpeg', 0.8)
  }

  switchView(view) {
    this.currentView = view

    // Fetch leaderboard immediately when switching to it
    if (view === 'leaderboard') {
      this.fetchLeaderboard()
    }

    this.render()
  }

  render() {
    if (!this.user) {
      this.renderLoginScreen()
      return
    }

    document.querySelector('#app').innerHTML = `
      <div class="header" style="display: flex; justify-content: space-between; align-items: center;">
        <h1>🎰 FATTY CASINO</h1>
        <div style="flex: 1; display: flex; flex-direction: column; align-items: center; max-width: 400px; margin: 0 auto; gap: 0.5rem;">
          <div class="wallet" style="display: flex; align-items: center;">
            <span>💵</span>
            <span class="wallet-amount">${this.balance.toLocaleString()} FATTY BUCKS</span>
          </div>
          ${this.balance <= 100 ? `
            <button id="daily-bonus-btn" class="btn ${this.canClaimDailyBonus() ? 'btn-primary' : 'btn-secondary'}" style="padding: 0.5rem 1rem; font-size: 0.85rem; animation: pulse 2s infinite;">
              ${this.canClaimDailyBonus() ? '🎁 Claim 1,000 Free FATTY BUCKS!' : '⏳ Daily Bonus (Come back later)'}
            </button>
          ` : ''}
        </div>
        <div id="profile-header-btn" style="display: flex; align-items: center; gap: 0.8rem; cursor: pointer; padding: 0.5rem 1rem; border-radius: 8px; transition: all 0.3s ease;" onmouseover="this.style.background='var(--bg-tertiary)'" onmouseout="this.style.background='transparent'">
          ${this.profile.profileImage ?
            `<img src="${this.profile.profileImage}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid var(--accent-gold);">` :
            `<div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, var(--accent-gold), #ffed4e); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; border: 2px solid var(--accent-gold);">${this.profile.avatar}</div>`
          }
          <span style="color: var(--text-primary); font-weight: 600;">${this.profile.username}</span>
        </div>
      </div>

      <nav class="nav">
        <button class="nav-btn ${this.currentView === 'home' ? 'active' : ''}" data-view="home">🏠 Home</button>
        <div style="position: relative; display: inline-block;">
          <button class="nav-btn ${['coinflip', 'roulette', 'slots', 'dice'].includes(this.currentView) ? 'active' : ''}" id="games-dropdown-btn">🎮 Games ▼</button>
          <div id="games-dropdown" style="display: ${this.gamesDropdownOpen ? 'block' : 'none'}; position: absolute; top: 100%; left: 0; background: var(--bg-secondary); border: 2px solid var(--border); border-radius: 8px; margin-top: 0.5rem; min-width: 200px; z-index: 10000; box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);">
            <button class="nav-btn ${this.currentView === 'coinflip' ? 'active' : ''}" data-view="coinflip" style="width: 100%; text-align: left; border: none; border-radius: 4px; margin: 0;">🪙 Coin Flip</button>
            <button class="nav-btn ${this.currentView === 'roulette' ? 'active' : ''}" data-view="roulette" style="width: 100%; text-align: left; border: none; border-radius: 4px; margin: 0;">🎡 Roulette</button>
            <button class="nav-btn ${this.currentView === 'slots' ? 'active' : ''}" data-view="slots" style="width: 100%; text-align: left; border: none; border-radius: 4px; margin: 0;">🎰 Slots</button>
            <button class="nav-btn ${this.currentView === 'dice' ? 'active' : ''}" data-view="dice" style="width: 100%; text-align: left; border: none; border-radius: 4px; margin: 0;">🎲 Dice</button>
          </div>
        </div>
        <button class="nav-btn ${this.currentView === 'leaderboard' ? 'active' : ''}" data-view="leaderboard">🏆 Leaderboard</button>
        <button class="nav-btn ${this.currentView === 'stats' ? 'active' : ''}" data-view="stats">📊 Stats</button>
        <button class="nav-btn ${this.currentView === 'achievements' ? 'active' : ''}" data-view="achievements">🏅 Achievements</button>
        <button class="nav-btn ${this.currentView === 'quests' ? 'active' : ''}" data-view="quests">📋 Quests</button>
        <button class="nav-btn ${this.currentView === 'shop' ? 'active' : ''}" data-view="shop">🛒 Shop</button>
        <button class="nav-btn ${this.currentView === 'chat' ? 'active' : ''}" data-view="chat">💬 Chat</button>
        <button class="nav-btn ${this.currentView === 'friends' ? 'active' : ''}" data-view="friends">👥 Friends ${this.friendRequests.length > 0 ? `<span style="background: var(--accent-red); color: white; border-radius: 50%; padding: 0.1rem 0.5rem; margin-left: 0.3rem; font-size: 0.8rem;">${this.friendRequests.length}</span>` : ''}</button>
      </nav>

      <div class="main-content">
        ${this.renderView()}
      </div>
    `

    this.attachEventListeners()
  }

  renderLoginScreen() {
    document.querySelector('#app').innerHTML = `
      <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);">
        <div class="game-container" style="max-width: 500px; text-align: center;">
          <h1 style="font-size: 3rem; background: linear-gradient(135deg, var(--accent-gold), #ffed4e); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 1rem;">🎰 FATTY CASINO</h1>
          <p style="color: var(--text-secondary); margin-bottom: 2rem; font-size: 1.1rem;">
            Welcome to Fatty Casino! Sign in or create an account to start playing with FATTY BUCKS.
          </p>

          ${!isConfigured ? `
            <div class="message message-error" style="margin-bottom: 2rem;">
              <strong>⚠️ Firebase Not Configured</strong><br>
              Please set up your Firebase project and add the configuration to the .env file.
              <br><br>
              <a href="https://console.firebase.google.com/" target="_blank" style="color: var(--accent-gold); text-decoration: underline;">Go to Firebase Console</a>
            </div>
          ` : ''}

          <div style="text-align: left; margin-bottom: 1.5rem;">
            <div class="form-group">
              <label for="login-email" style="display: block; margin-bottom: 0.5rem; color: var(--text-secondary); font-weight: 600;">Email</label>
              <input type="email" id="login-email" placeholder="Enter your email" style="width: 100%; background: var(--bg-tertiary); border: 2px solid var(--border); border-radius: 8px; padding: 1rem; font-size: 1rem; color: var(--text-primary);" ${!isConfigured ? 'disabled' : ''}>
            </div>
            <div class="form-group" style="margin-top: 1rem;">
              <label for="login-password" style="display: block; margin-bottom: 0.5rem; color: var(--text-secondary); font-weight: 600;">Password</label>
              <input type="password" id="login-password" placeholder="Enter your password" style="width: 100%; background: var(--bg-tertiary); border: 2px solid var(--border); border-radius: 8px; padding: 1rem; font-size: 1rem; color: var(--text-primary);" ${!isConfigured ? 'disabled' : ''}>
            </div>
          </div>

          <div style="display: flex; gap: 1rem; margin-bottom: 1.5rem;">
            <button
              class="btn btn-primary"
              id="email-sign-in-btn"
              ${!isConfigured ? 'disabled' : ''}
              style="flex: 1; font-size: 1rem; padding: 1rem;">
              Sign In
            </button>
            <button
              class="btn btn-secondary"
              id="email-sign-up-btn"
              ${!isConfigured ? 'disabled' : ''}
              style="flex: 1; font-size: 1rem; padding: 1rem;">
              Sign Up
            </button>
          </div>

          <div style="display: flex; align-items: center; margin: 2rem 0;">
            <div style="flex: 1; height: 1px; background: var(--border);"></div>
            <span style="padding: 0 1rem; color: var(--text-secondary); font-weight: 600;">OR</span>
            <div style="flex: 1; height: 1px; background: var(--border);"></div>
          </div>

          <button
            class="btn btn-primary"
            id="google-sign-in-btn"
            ${!isConfigured ? 'disabled' : ''}
            style="font-size: 1.1rem; padding: 1rem 2rem; display: inline-flex; align-items: center; gap: 0.5rem; width: 100%;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign in with Google
          </button>

          ${!isConfigured ? `
            <div style="margin-top: 2rem; text-align: left; background: var(--bg-tertiary); padding: 1.5rem; border-radius: 8px; border: 1px solid var(--border);">
              <h3 style="color: var(--accent-gold); margin-bottom: 1rem;">Setup Instructions:</h3>
              <ol style="color: var(--text-secondary); line-height: 1.8;">
                <li>Go to <a href="https://console.firebase.google.com/" target="_blank" style="color: var(--accent-gold);">Firebase Console</a></li>
                <li>Create a new project or select existing one</li>
                <li>Enable Google Authentication in Authentication > Sign-in method</li>
                <li>Create a Firestore database in Firestore Database</li>
                <li>Go to Project Settings > General > Your apps</li>
                <li>Add a web app and copy the config values</li>
                <li>Add the config values to your .env file</li>
                <li>Restart the development server</li>
              </ol>
            </div>
          ` : ''}
        </div>
      </div>
    `

    if (isConfigured) {
      document.getElementById('email-sign-in-btn')?.addEventListener('click', () => this.handleEmailSignIn())
      document.getElementById('email-sign-up-btn')?.addEventListener('click', () => this.handleEmailSignUp())
      document.getElementById('google-sign-in-btn')?.addEventListener('click', () => this.handleGoogleSignIn())
    }
  }

  renderView() {
    switch (this.currentView) {
      case 'home': return this.renderHome()
      case 'coinflip': return this.renderCoinFlip()
      case 'roulette': return this.renderRoulette()
      case 'slots': return this.renderSlots()
      case 'dice': return this.renderDice()
      case 'leaderboard': return this.renderLeaderboard()
      case 'stats': return this.renderStats()
      case 'profile': return this.renderProfile()
      case 'chat': return this.renderChat()
      case 'friends': return this.renderFriends()
      case 'achievements': return this.renderAchievements()
      case 'quests': return this.renderQuests()
      case 'shop': return this.renderShop()
      default: return this.renderHome()
    }
  }

  renderHome() {
    return `
      <div class="game-container">
        <h2 class="text-center mb-2">Welcome back, ${this.profile.username}!</h2>
        <p class="text-center mb-2" style="color: var(--text-secondary);">
          Choose a game from the menu above to start gambling with FATTY BUCKS!
        </p>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">Your Balance</div>
            <div class="stat-value">${this.balance.toLocaleString()} FATTY BUCKS</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Games Played</div>
            <div class="stat-value">${this.stats.gamesPlayed}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Biggest Win</div>
            <div class="stat-value">${this.stats.biggestWin.toLocaleString()} FATTY BUCKS</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Win Streak</div>
            <div class="stat-value">${this.stats.winStreak}</div>
          </div>
        </div>

        <h3 class="text-center mt-2 mb-1">Available Games</h3>
        <div class="flex flex-center gap-2" style="flex-wrap: wrap;">
          <button class="btn btn-primary" data-view="coinflip">🪙 Coin Flip</button>
          <button class="btn btn-primary" data-view="roulette">🎡 Roulette</button>
          <button class="btn btn-primary" data-view="slots">🎰 Slots</button>
          <button class="btn btn-primary" data-view="dice">🎲 Dice</button>
        </div>
      </div>
    `
  }

  renderCoinFlip() {
    return `
      <div class="game-container">
        <h2 class="text-center mb-2">🪙 Coin Flip</h2>
        <p class="text-center mb-2" style="color: var(--text-secondary);">
          Choose Heads or Tails and double your bet!
        </p>

        <div class="coin" id="coin">
          <div class="coin-face">?</div>
        </div>

        <div class="flex flex-center gap-1 mb-2" style="flex-direction: column;">
          <input type="number" id="bet-amount" placeholder="Enter bet amount" min="1" max="${this.balance}" value="100">
          <div class="flex gap-1">
            <button class="btn btn-green" id="bet-heads">Heads</button>
            <button class="btn btn-red" id="bet-tails">Tails</button>
          </div>
        </div>
      </div>
    `
  }

  renderRoulette() {
    return `
      <div class="game-container">
        <h2 class="text-center mb-2">🎡 Roulette</h2>
        <p class="text-center mb-2" style="color: var(--text-secondary);">
          Bet on Red or Black for 2x payout!
        </p>

        <div style="position: relative;">
          <div class="roulette-wheel" id="roulette-wheel"></div>
          <div class="roulette-pointer"></div>
        </div>

        <div class="flex flex-center gap-1 mb-2" style="flex-direction: column;">
          <input type="number" id="bet-amount" placeholder="Enter bet amount" min="1" max="${this.balance}" value="100">
          <div class="flex gap-1">
            <button class="btn btn-red" id="bet-red">Red</button>
            <button class="btn" id="bet-black" style="background: #000; color: #fff;">Black</button>
          </div>
        </div>
      </div>
    `
  }

  renderSlots() {
    return `
      <div class="game-container">
        <h2 class="text-center mb-2">🎰 Slot Machine</h2>
        <p class="text-center mb-2" style="color: var(--text-secondary);">
          Match 3 symbols to win big!
        </p>

        <div class="slots-container">
          <div class="slot-reel" id="slot1">🍒</div>
          <div class="slot-reel" id="slot2">🍋</div>
          <div class="slot-reel" id="slot3">🍊</div>
        </div>

        <div class="text-center mb-2" style="color: var(--text-secondary);">
          <p>3 matching symbols = 10x bet</p>
          <p>2 matching symbols = 2x bet</p>
        </div>

        <div class="flex flex-center gap-1" style="flex-direction: column;">
          <input type="number" id="bet-amount" placeholder="Enter bet amount" min="1" max="${this.balance}" value="100">
          <button class="btn btn-primary" id="spin-slots">Spin!</button>
        </div>
      </div>
    `
  }

  renderDice() {
    return `
      <div class="game-container">
        <h2 class="text-center mb-2">🎲 Dice Roll</h2>
        <p class="text-center mb-2" style="color: var(--text-secondary);">
          Roll higher than 50 to win!
        </p>

        <div style="text-align: center; margin: 3rem 0;">
          <div style="font-size: 6rem; font-weight: 700; color: var(--accent-gold);" id="dice-result">--</div>
          <p style="color: var(--text-secondary); margin-top: 1rem;">Roll 51-100 to win 2x your bet!</p>
        </div>

        <div class="flex flex-center gap-1" style="flex-direction: column;">
          <input type="number" id="bet-amount" placeholder="Enter bet amount" min="1" max="${this.balance}" value="100">
          <button class="btn btn-primary" id="roll-dice">Roll Dice!</button>
        </div>
      </div>
    `
  }

  renderLeaderboard() {
    const topPlayers = this.leaderboard.slice(0, 10)

    return `
      <div class="game-container">
        <h2 class="text-center mb-2">🏆 Leaderboard</h2>
        <div class="text-center mb-2" style="display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
          <p style="color: var(--text-secondary); margin: 0;">Next refresh in</p>
          <div style="background: var(--bg-tertiary); border: 2px solid var(--accent-gold); border-radius: 8px; padding: 0.5rem 1rem; min-width: 60px; text-align: center;">
            <span id="leaderboard-timer" style="color: var(--accent-gold); font-weight: 700; font-size: 1.2rem;">${this.leaderboardSecondsUntilRefresh}s</span>
          </div>
        </div>

        <table class="leaderboard-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th style="text-align: left;">Player</th>
              <th>Balance</th>
              <th>Total Won</th>
            </tr>
          </thead>
          <tbody>
            ${topPlayers.length === 0 ? '<tr><td colspan="4" class="text-center">No players yet!</td></tr>' : ''}
            ${topPlayers.map((player, index) => `
              <tr ${player.id === this.user?.uid ? 'style="background: var(--bg-tertiary); border-left: 3px solid var(--accent-gold);"' : ''}>
                <td class="rank-${index + 1}">#${index + 1}</td>
                <td style="text-align: left;">
                  <div style="display: flex; align-items: center; gap: 0.8rem;">
                    ${player.profileImage ?
                      `<img src="${player.profileImage}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 2px solid var(--accent-gold);">` :
                      `<div style="width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, var(--accent-gold), #ffed4e); display: flex; align-items: center; justify-content: center; font-size: 1.2rem; border: 2px solid var(--accent-gold);">${player.avatar || '🎰'}</div>`
                    }
                    <span>${player.username}${player.id === this.user?.uid ? ' (You)' : ''}</span>
                  </div>
                </td>
                <td>${(player.balance || 0).toLocaleString()} FATTY BUCKS</td>
                <td>${(player.stats?.totalWon || 0).toLocaleString()} FATTY BUCKS</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `
  }

  renderStats() {
    const winRate = this.stats.gamesPlayed > 0
      ? ((this.stats.totalWon / (this.stats.totalWon + this.stats.totalLost)) * 100).toFixed(1)
      : 0

    return `
      <div class="game-container">
        <h2 class="text-center mb-2">📊 Your Statistics</h2>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">Games Played</div>
            <div class="stat-value">${this.stats.gamesPlayed}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Total Wagered</div>
            <div class="stat-value">${this.stats.totalWagered.toLocaleString()} FATTY BUCKS</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Total Won</div>
            <div class="stat-value" style="color: var(--accent-green);">${this.stats.totalWon.toLocaleString()} FATTY BUCKS</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Total Lost</div>
            <div class="stat-value" style="color: var(--accent-red);">${this.stats.totalLost.toLocaleString()} FATTY BUCKS</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Biggest Win</div>
            <div class="stat-value">${this.stats.biggestWin.toLocaleString()} FATTY BUCKS</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Best Win Streak</div>
            <div class="stat-value">${this.stats.winStreak}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Current Streak</div>
            <div class="stat-value">${this.stats.currentStreak}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Win Rate</div>
            <div class="stat-value">${winRate}%</div>
          </div>
        </div>

        <div class="text-center mt-2">
          <button class="btn btn-secondary" id="reset-stats">Reset Stats</button>
        </div>
      </div>
    `
  }

  renderProfile() {
    return `
      <div class="game-container">
        <div class="profile-section">
          <h2 class="text-center mb-2">👤 Profile</h2>

          <div class="profile-avatar" id="profile-avatar-display" style="border-radius: 50%; overflow: hidden;">
            ${this.profile.profileImage ?
              `<img src="${this.profile.profileImage}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">` :
              this.profile.avatar
            }
          </div>

          <div class="form-group">
            <label for="username">Username</label>
            <input type="text" id="username" value="${this.profile.username}" maxlength="20">
          </div>

          <div class="form-group">
            <label for="profile-image-upload">Profile Image (Max 1MB)</label>
            <input type="file" id="profile-image-upload" accept="image/*" style="width: 100%; background: var(--bg-tertiary); border: 2px solid var(--border); border-radius: 8px; padding: 1rem; color: var(--text-primary);">
            <p style="color: var(--text-secondary); font-size: 0.85rem; margin-top: 0.5rem;">Upload a custom profile picture or use an emoji avatar below</p>
            ${this.profile.profileImage ? `<button class="btn btn-secondary" id="remove-profile-image" style="margin-top: 0.5rem; font-size: 0.9rem; padding: 0.5rem 1rem;">Remove Image</button>` : ''}
          </div>

          <div class="form-group">
            <label>Choose Avatar Emoji</label>
            <div class="flex gap-1" style="flex-wrap: wrap; justify-content: center;">
              ${['🎰', '💰', '🎲', '🃏', '🎯', '🔥', '⚡', '👑', '💎', '🦈'].map(emoji => `
                <button class="btn btn-secondary" style="font-size: 2rem; padding: 0.5rem 1rem;" data-avatar="${emoji}">${emoji}</button>
              `).join('')}
            </div>
          </div>

          <div class="form-group">
            <label>Account</label>
            <div style="background: var(--bg-tertiary); padding: 1rem; border-radius: 8px; border: 2px solid var(--border);">
              <p style="color: var(--text-secondary);">${this.user?.email || 'Not signed in'}</p>
            </div>
          </div>

          <div class="text-center mt-2" style="display: flex; flex-direction: column; gap: 1rem;">
            <button class="btn btn-primary" id="save-profile">Save Profile</button>
            <button class="btn btn-secondary" id="sign-out-btn-profile">Sign Out</button>
            <button class="btn" id="delete-account-btn" style="background: var(--accent-red); color: white;">Delete Account</button>
          </div>
        </div>
      </div>
    `
  }

  renderChat() {
    return `
      <div class="game-container">
        <h2 class="text-center mb-2">💬 Live Chat</h2>
        <p class="text-center mb-2" style="color: var(--text-secondary);">
          Chat with other players in real-time!
        </p>

        <div style="background: var(--bg-tertiary); border: 2px solid var(--border); border-radius: 12px; padding: 1rem; height: 400px; overflow-y: auto; margin-bottom: 1rem;" id="chat-messages">
          ${this.chatMessages.length === 0 ? `
            <p style="text-align: center; color: var(--text-secondary); margin-top: 2rem;">No messages yet. Be the first to say hello!</p>
          ` : ''}
          ${this.chatMessages.map(msg => `
            <div style="display: flex; gap: 0.8rem; margin-bottom: 1rem; padding: 0.8rem; background: ${msg.userId === this.user?.uid ? 'var(--bg-secondary)' : 'transparent'}; border-radius: 8px;">
              ${msg.profileImage ?
                `<img src="${msg.profileImage}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid var(--accent-gold); flex-shrink: 0;">` :
                `<div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, var(--accent-gold), #ffed4e); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; border: 2px solid var(--accent-gold); flex-shrink: 0;">${msg.avatar || '🎰'}</div>`
              }
              <div style="flex: 1;">
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.3rem;">
                  <strong style="color: var(--accent-gold);">${msg.username}</strong>
                  <span style="color: var(--text-secondary); font-size: 0.75rem;">${new Date(msg.createdAt).toLocaleTimeString()}</span>
                </div>
                <p style="color: var(--text-primary); margin: 0; word-wrap: break-word;">${msg.message}</p>
              </div>
            </div>
          `).join('')}
        </div>

        <div style="display: flex; gap: 0.5rem;">
          <input type="text" id="chat-input" placeholder="Type your message..." style="flex: 1; background: var(--bg-tertiary); border: 2px solid var(--border); border-radius: 8px; padding: 1rem; color: var(--text-primary); font-size: 1rem;" maxlength="200">
          <button class="btn btn-primary" id="send-chat-btn" style="padding: 1rem 2rem;">Send</button>
        </div>
      </div>
    `
  }

  renderFriends() {
    return `
      <div class="game-container">
        <h2 class="text-center mb-2">👥 Friends</h2>

        ${this.friendRequests.length > 0 ? `
          <div style="background: var(--bg-tertiary); border: 2px solid var(--accent-gold); border-radius: 12px; padding: 1rem; margin-bottom: 1.5rem;">
            <h3 style="color: var(--accent-gold); margin-bottom: 1rem;">Friend Requests (${this.friendRequests.length})</h3>
            ${this.friendRequests.map(req => `
              <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.8rem; background: var(--bg-secondary); border-radius: 8px; margin-bottom: 0.5rem;">
                <div style="display: flex; align-items: center; gap: 0.8rem;">
                  ${req.fromUser.profileImage ?
                    `<img src="${req.fromUser.profileImage}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid var(--accent-gold);">` :
                    `<div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, var(--accent-gold), #ffed4e); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; border: 2px solid var(--accent-gold);">${req.fromUser.avatar || '🎰'}</div>`
                  }
                  <span style="color: var(--text-primary); font-weight: 600;">${req.fromUser.username}</span>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                  <button class="btn btn-primary" data-accept-request="${req.id}" data-friend-id="${req.from}" style="padding: 0.5rem 1rem; font-size: 0.9rem;">Accept</button>
                  <button class="btn btn-secondary" data-decline-request="${req.id}" style="padding: 0.5rem 1rem; font-size: 0.9rem;">Decline</button>
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <div style="background: var(--bg-tertiary); border: 2px solid var(--border); border-radius: 12px; padding: 1rem; margin-bottom: 1.5rem;">
          <h3 style="color: var(--accent-gold); margin-bottom: 1rem;">Add Friends</h3>
          <div style="display: flex; gap: 0.5rem;">
            <input type="text" id="friend-search" placeholder="Search by username..." style="flex: 1; background: var(--bg-secondary); border: 2px solid var(--border); border-radius: 8px; padding: 0.8rem; color: var(--text-primary);">
            <button class="btn btn-primary" id="search-friends-btn" style="padding: 0.8rem 1.5rem;">Search</button>
          </div>
          <div id="search-results" style="margin-top: 1rem;"></div>
        </div>

        <div style="background: var(--bg-tertiary); border: 2px solid var(--border); border-radius: 12px; padding: 1rem;">
          <h3 style="color: var(--accent-gold); margin-bottom: 1rem;">Your Friends (${this.friends.length})</h3>
          ${this.friends.length === 0 ? `
            <p style="text-align: center; color: var(--text-secondary); padding: 2rem;">No friends yet. Add some friends to get started!</p>
          ` : ''}
          ${this.friends.map(friend => `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.8rem; background: var(--bg-secondary); border-radius: 8px; margin-bottom: 0.5rem;">
              <div style="display: flex; align-items: center; gap: 0.8rem;">
                ${friend.profileImage ?
                  `<img src="${friend.profileImage}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid var(--accent-gold);">` :
                  `<div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, var(--accent-gold), #ffed4e); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; border: 2px solid var(--accent-gold);">${friend.avatar || '🎰'}</div>`
                }
                <div>
                  <div style="color: var(--text-primary); font-weight: 600;">${friend.username}</div>
                  <div style="color: var(--text-secondary); font-size: 0.85rem;">${(friend.balance || 0).toLocaleString()} FATTY BUCKS</div>
                </div>
              </div>
              <button class="btn btn-primary" data-gift-friend="${friend.id}" style="padding: 0.5rem 1rem; font-size: 0.9rem;">Gift FATTY BUCKS</button>
            </div>
          `).join('')}
        </div>
      </div>
    `
  }

  renderAchievements() {
    const currentXP = this.xp
    const currentLevel = this.level
    const xpForNextLevel = getXPForNextLevel(currentLevel)
    const xpProgress = currentXP - getXPForLevel(currentLevel)
    const xpNeeded = xpForNextLevel - getXPForLevel(currentLevel)
    const progressPercent = (xpProgress / xpNeeded) * 100

    const tierInfo = VIP_TIERS.find(t => t.name === this.vipTier)

    return `
      <div class="game-container">
        <h2 class="text-center mb-2">🏅 Achievements & Progress</h2>

        <!-- Level & XP Progress -->
        <div style="background: var(--bg-tertiary); border: 2px solid var(--accent-gold); border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <div>
              <h3 style="color: var(--accent-gold); margin: 0;">Level ${currentLevel}</h3>
              <p style="color: var(--text-secondary); margin: 0.3rem 0 0 0; font-size: 0.9rem;">${xpProgress.toLocaleString()} / ${xpNeeded.toLocaleString()} XP</p>
            </div>
            <div style="text-align: right;">
              <div style="background: ${tierInfo.color}; color: #000; padding: 0.5rem 1rem; border-radius: 8px; font-weight: 700; font-size: 1.1rem;">
                ${this.vipTier}
              </div>
              <p style="color: var(--text-secondary); margin: 0.3rem 0 0 0; font-size: 0.85rem;">${currentXP.toLocaleString()} Total XP</p>
            </div>
          </div>
          <div style="background: var(--bg-secondary); height: 30px; border-radius: 15px; overflow: hidden; position: relative;">
            <div style="background: linear-gradient(90deg, var(--accent-gold), #ffed4e); height: 100%; width: ${progressPercent}%; transition: width 0.3s ease;"></div>
            <span style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: var(--text-primary); font-weight: 700; text-shadow: 0 0 4px rgba(0,0,0,0.8);">${Math.floor(progressPercent)}%</span>
          </div>
        </div>

        <!-- Achievements Grid -->
        <h3 style="color: var(--accent-gold); margin-bottom: 1rem;">Achievements (${this.achievements.length}/${ACHIEVEMENTS.length})</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem;">
          ${ACHIEVEMENTS.map(achievement => {
            const unlocked = this.achievements.includes(achievement.id)
            return `
              <div style="background: ${unlocked ? 'var(--bg-tertiary)' : 'var(--bg-secondary)'}; border: 2px solid ${unlocked ? 'var(--accent-gold)' : 'var(--border)'}; border-radius: 12px; padding: 1rem; opacity: ${unlocked ? '1' : '0.6'}; transition: all 0.3s ease;">
                <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 0.8rem;">
                  <div style="font-size: 3rem; ${unlocked ? '' : 'filter: grayscale(100%);'}">${achievement.icon}</div>
                  <div style="flex: 1;">
                    <h4 style="color: ${unlocked ? 'var(--accent-gold)' : 'var(--text-secondary)'}; margin: 0 0 0.3rem 0;">${achievement.name}</h4>
                    <p style="color: var(--text-secondary); margin: 0; font-size: 0.85rem;">${achievement.description}</p>
                  </div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="color: var(--accent-gold); font-weight: 600;">+${achievement.reward.toLocaleString()} FATTY BUCKS</span>
                  ${unlocked ? '<span style="color: var(--accent-green); font-weight: 700;">✓ UNLOCKED</span>' : '<span style="color: var(--text-secondary); font-size: 0.85rem;">🔒 Locked</span>'}
                </div>
              </div>
            `
          }).join('')}
        </div>
      </div>
    `
  }

  renderQuests() {
    this.checkDailyQuests()

    return `
      <div class="game-container">
        <h2 class="text-center mb-2">📋 Daily Quests</h2>
        <p class="text-center mb-2" style="color: var(--text-secondary);">
          Complete quests to earn FATTY BUCKS! Resets daily at midnight.
        </p>

        <div style="display: grid; gap: 1rem;">
          ${this.dailyQuests.map((quest, index) => {
            const progressPercent = (quest.progress / quest.target) * 100
            return `
              <div style="background: ${quest.completed ? 'var(--bg-tertiary)' : 'var(--bg-secondary)'}; border: 2px solid ${quest.completed ? 'var(--accent-green)' : 'var(--border)'}; border-radius: 12px; padding: 1.5rem;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                  <div>
                    <h3 style="color: ${quest.completed ? 'var(--accent-green)' : 'var(--accent-gold)'}; margin: 0 0 0.5rem 0;">${quest.name}</h3>
                    <p style="color: var(--text-secondary); margin: 0; font-size: 0.9rem;">${quest.description}</p>
                  </div>
                  <div style="text-align: right;">
                    <div style="color: var(--accent-gold); font-weight: 700; font-size: 1.2rem;">+${quest.reward.toLocaleString()}</div>
                    ${quest.completed ? '<div style="color: var(--accent-green); font-size: 0.85rem; margin-top: 0.3rem;">✓ COMPLETED</div>' : ''}
                  </div>
                </div>

                <div style="background: var(--bg-primary); height: 25px; border-radius: 12px; overflow: hidden; position: relative;">
                  <div style="background: ${quest.completed ? 'var(--accent-green)' : 'linear-gradient(90deg, var(--accent-gold), #ffed4e)'}; height: 100%; width: ${progressPercent}%; transition: width 0.3s ease;"></div>
                  <span style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: var(--text-primary); font-weight: 700; font-size: 0.85rem; text-shadow: 0 0 4px rgba(0,0,0,0.8);">
                    ${quest.progress} / ${quest.target}
                  </span>
                </div>
              </div>
            `
          }).join('')}
        </div>

        <div style="background: var(--bg-tertiary); border: 2px solid var(--border); border-radius: 12px; padding: 1.5rem; margin-top: 1.5rem; text-align: center;">
          <p style="color: var(--text-secondary); margin: 0;">
            Quests reset in <strong style="color: var(--accent-gold);">${this.getTimeUntilMidnight()}</strong>
          </p>
        </div>
      </div>
    `
  }

  renderShop() {
    const activeBoosts = this.getActiveBoosts()

    return `
      <div class="game-container">
        <h2 class="text-center mb-2">🛒 Shop</h2>
        <p class="text-center mb-2" style="color: var(--text-secondary);">
          Purchase power-ups and cosmetics with FATTY BUCKS!
        </p>

        ${activeBoosts.length > 0 ? `
          <div style="background: var(--bg-tertiary); border: 2px solid var(--accent-gold); border-radius: 12px; padding: 1rem; margin-bottom: 1.5rem;">
            <h3 style="color: var(--accent-gold); margin: 0 0 1rem 0;">🔥 Active Items</h3>
            ${activeBoosts.map(item => `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; background: var(--bg-secondary); border-radius: 8px; margin-bottom: 0.5rem;">
                <div style="display: flex; align-items: center; gap: 0.8rem;">
                  <span style="font-size: 1.5rem;">${item.icon}</span>
                  <span style="color: var(--text-primary); font-weight: 600;">${item.name}</span>
                </div>
                ${item.expiresAt ? `<span style="color: var(--text-secondary); font-size: 0.85rem;">Expires: ${new Date(item.expiresAt).toLocaleTimeString()}</span>` : '<span style="color: var(--accent-green); font-size: 0.85rem;">✓ Owned</span>'}
              </div>
            `).join('')}
          </div>
        ` : ''}

        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem;">
          ${SHOP_ITEMS.map(item => {
            const owned = this.inventory.some(i => i.id === item.id && (!i.expiresAt || new Date(i.expiresAt).getTime() > Date.now()))
            return `
              <div style="background: var(--bg-tertiary); border: 2px solid var(--border); border-radius: 12px; padding: 1.5rem; display: flex; flex-direction: column;">
                <div style="text-align: center; margin-bottom: 1rem;">
                  <div style="font-size: 4rem; margin-bottom: 0.5rem;">${item.icon}</div>
                  <h3 style="color: var(--accent-gold); margin: 0 0 0.5rem 0;">${item.name}</h3>
                  <p style="color: var(--text-secondary); margin: 0; font-size: 0.9rem; min-height: 2.5rem;">${item.description}</p>
                </div>

                <div style="margin-top: auto;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <span style="color: var(--accent-gold); font-weight: 700; font-size: 1.3rem;">${item.price.toLocaleString()}</span>
                    <span style="color: var(--text-secondary); font-size: 0.85rem;">${item.type === 'boost' ? '⏱️ Timed' : item.type === 'cosmetic' ? '♾️ Permanent' : '🎫 Pass'}</span>
                  </div>
                  <button class="btn ${owned && item.type === 'cosmetic' ? 'btn-secondary' : 'btn-primary'}" data-buy-item="${item.id}" style="width: 100%;" ${owned && item.type === 'cosmetic' ? 'disabled' : ''}>
                    ${owned && item.type === 'cosmetic' ? '✓ Owned' : 'Purchase'}
                  </button>
                </div>
              </div>
            `
          }).join('')}
        </div>
      </div>
    `
  }

  getTimeUntilMidnight() {
    const now = new Date()
    const midnight = new Date(now)
    midnight.setHours(24, 0, 0, 0)
    const diff = midnight - now

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    return `${hours}h ${minutes}m`
  }

  attachEventListeners() {
    // Daily bonus button
    document.getElementById('daily-bonus-btn')?.addEventListener('click', () => {
      this.claimDailyBonus()
    })

    // Games dropdown toggle
    const gamesDropdownBtn = document.getElementById('games-dropdown-btn')
    const gamesDropdown = document.getElementById('games-dropdown')

    if (gamesDropdownBtn && gamesDropdown) {
      gamesDropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        this.gamesDropdownOpen = !this.gamesDropdownOpen
        gamesDropdown.style.display = this.gamesDropdownOpen ? 'block' : 'none'
      })

      // Close dropdown when clicking outside
      const closeDropdown = (e) => {
        if (this.gamesDropdownOpen && !gamesDropdown.contains(e.target) && !gamesDropdownBtn.contains(e.target)) {
          this.gamesDropdownOpen = false
          gamesDropdown.style.display = 'none'
        }
      }
      document.addEventListener('click', closeDropdown)

      // Close dropdown when selecting a game
      gamesDropdown.querySelectorAll('[data-view]').forEach(btn => {
        btn.addEventListener('click', () => {
          this.gamesDropdownOpen = false
          gamesDropdown.style.display = 'none'
        })
      })
    }

    // Profile header button - click to open profile
    document.getElementById('profile-header-btn')?.addEventListener('click', () => {
      this.switchView('profile')
    })

    // Navigation
    document.querySelectorAll('[data-view]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.switchView(e.target.dataset.view)
      })
    })

    // Coin Flip
    if (this.currentView === 'coinflip') {
      document.getElementById('bet-heads')?.addEventListener('click', () => this.playCoinFlip('heads'))
      document.getElementById('bet-tails')?.addEventListener('click', () => this.playCoinFlip('tails'))
    }

    // Roulette
    if (this.currentView === 'roulette') {
      document.getElementById('bet-red')?.addEventListener('click', () => this.playRoulette('red'))
      document.getElementById('bet-black')?.addEventListener('click', () => this.playRoulette('black'))
    }

    // Slots
    if (this.currentView === 'slots') {
      document.getElementById('spin-slots')?.addEventListener('click', () => this.playSlots())
    }

    // Dice
    if (this.currentView === 'dice') {
      document.getElementById('roll-dice')?.addEventListener('click', () => this.playDice())
    }

    // Profile
    if (this.currentView === 'profile') {
      // Profile image upload
      document.getElementById('profile-image-upload')?.addEventListener('change', async (e) => {
        const file = e.target.files[0]
        if (!file) return

        // Check file size (max 1MB = 1048576 bytes)
        if (file.size > 1048576) {
          this.showMessage('Image must be under 1MB!', 'error')
          e.target.value = '' // Clear the input
          return
        }

        // Check if it's an image
        if (!file.type.startsWith('image/')) {
          this.showMessage('Please upload an image file!', 'error')
          e.target.value = ''
          return
        }

        // Convert to base64 and show crop modal
        const reader = new FileReader()
        reader.onload = (event) => {
          this.showImageCropModal(event.target.result)
          e.target.value = '' // Clear the input
        }
        reader.onerror = () => {
          this.showMessage('Error loading image!', 'error')
          e.target.value = ''
        }
        reader.readAsDataURL(file)
      })

      // Remove profile image
      document.getElementById('remove-profile-image')?.addEventListener('click', async () => {
        if (confirm('Remove your profile image and use emoji avatar instead?')) {
          this.profile.profileImage = null
          await this.saveUserData()
          this.showMessage('Profile image removed!', 'success')
          this.render()
        }
      })

      // Avatar emoji selection
      document.querySelectorAll('[data-avatar]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          this.profile.avatar = e.target.dataset.avatar
          if (!this.profile.profileImage) {
            // Update display only if not using custom image
            const avatarDisplay = document.getElementById('profile-avatar-display')
            if (avatarDisplay) {
              avatarDisplay.textContent = this.profile.avatar
            }
          }
        })
      })

      document.getElementById('save-profile')?.addEventListener('click', () => {
        this.profile.username = document.getElementById('username').value
        this.saveUserData()
        this.showMessage('Profile saved!')
        this.render()
      })

      // Sign out button in profile
      document.getElementById('sign-out-btn-profile')?.addEventListener('click', () => {
        this.handleSignOut()
      })

      // Delete account button
      document.getElementById('delete-account-btn')?.addEventListener('click', async () => {
        if (confirm('⚠️ WARNING: This will permanently delete your account and all data. Are you absolutely sure?')) {
          if (confirm('This action cannot be undone. Type your username to confirm deletion.')) {
            try {
              // Import deleteUser from Firebase auth
              const { deleteUser } = await import('firebase/auth')
              const { deleteDoc, doc } = await import('firebase/firestore')

              // Import auth and db from firebase.js
              const { auth, db } = await import('./firebase.js')

              // Delete user data from Firestore
              if (this.user) {
                await deleteDoc(doc(db, 'users', this.user.uid))
              }

              // Delete Firebase Auth account
              if (auth.currentUser) {
                await deleteUser(auth.currentUser)
              }

              this.showMessage('Account deleted successfully', 'success')
            } catch (error) {
              console.error('Error deleting account:', error)
              let errorMessage = 'Failed to delete account. '

              if (error.code === 'auth/requires-recent-login') {
                errorMessage += 'Please sign out and sign in again, then try deleting your account.'
              } else {
                errorMessage += 'Please try again or contact support.'
              }

              this.showMessage(errorMessage, 'error')
            }
          }
        }
      })
    }

    // Stats
    if (this.currentView === 'stats') {
      document.getElementById('reset-stats')?.addEventListener('click', async () => {
        if (confirm('Are you sure you want to reset all stats?')) {
          this.stats = {
            totalWagered: 0,
            totalWon: 0,
            totalLost: 0,
            gamesPlayed: 0,
            biggestWin: 0,
            winStreak: 0,
            currentStreak: 0
          }
          await this.saveUserData()
          this.showMessage('Stats reset!')
          this.render()
        }
      })
    }

    // Chat
    if (this.currentView === 'chat') {
      const sendMessage = async () => {
        const input = document.getElementById('chat-input')
        const message = input?.value.trim()
        if (!message) return

        try {
          await sendChatMessage(
            this.user.uid,
            this.profile.username,
            this.profile.avatar,
            this.profile.profileImage,
            message
          )
          input.value = ''
          // Scroll to bottom
          setTimeout(() => {
            const chatContainer = document.getElementById('chat-messages')
            if (chatContainer) {
              chatContainer.scrollTop = chatContainer.scrollHeight
            }
          }, 100)
        } catch (error) {
          console.error('Error sending message:', error)
          this.showMessage('Failed to send message', 'error')
        }
      }

      document.getElementById('send-chat-btn')?.addEventListener('click', sendMessage)
      document.getElementById('chat-input')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          sendMessage()
        }
      })

      // Auto-scroll to bottom on load
      setTimeout(() => {
        const chatContainer = document.getElementById('chat-messages')
        if (chatContainer) {
          chatContainer.scrollTop = chatContainer.scrollHeight
        }
      }, 100)
    }

    // Friends
    if (this.currentView === 'friends') {
      // Search friends
      document.getElementById('search-friends-btn')?.addEventListener('click', async () => {
        const searchTerm = document.getElementById('friend-search')?.value.trim()
        if (!searchTerm) {
          this.showMessage('Please enter a username to search', 'error')
          return
        }

        try {
          const results = await searchUsers(searchTerm)
          const searchResults = document.getElementById('search-results')
          if (!searchResults) return

          if (results.length === 0) {
            searchResults.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 1rem;">No users found</p>'
            return
          }

          searchResults.innerHTML = results
            .filter(user => user.id !== this.user.uid) // Don't show yourself
            .map(user => `
              <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.8rem; background: var(--bg-secondary); border-radius: 8px; margin-bottom: 0.5rem;">
                <div style="display: flex; align-items: center; gap: 0.8rem;">
                  ${user.profileImage ?
                    `<img src="${user.profileImage}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid var(--accent-gold);">` :
                    `<div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, var(--accent-gold), #ffed4e); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; border: 2px solid var(--accent-gold);">${user.avatar || '🎰'}</div>`
                  }
                  <span style="color: var(--text-primary); font-weight: 600;">${user.username}</span>
                </div>
                <button class="btn btn-primary" data-add-friend="${user.id}" style="padding: 0.5rem 1rem; font-size: 0.9rem;">Add Friend</button>
              </div>
            `).join('')

          // Add friend buttons
          document.querySelectorAll('[data-add-friend]').forEach(btn => {
            btn.addEventListener('click', async (e) => {
              const friendId = e.target.dataset.addFriend
              try {
                await sendFriendRequest(this.user.uid, friendId)
                this.showMessage('Friend request sent!', 'success')
                e.target.disabled = true
                e.target.textContent = 'Request Sent'
              } catch (error) {
                console.error('Error sending friend request:', error)
                this.showMessage('Failed to send friend request', 'error')
              }
            })
          })
        } catch (error) {
          console.error('Error searching users:', error)
          this.showMessage('Failed to search users', 'error')
        }
      })

      // Accept friend request
      document.querySelectorAll('[data-accept-request]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const requestId = e.target.dataset.acceptRequest
          const friendId = e.target.dataset.friendId
          try {
            await acceptFriendRequest(requestId, this.user.uid, friendId)
            await this.loadFriends()
            await this.loadFriendRequests()
            this.showMessage('Friend request accepted!', 'success')
            this.render()
          } catch (error) {
            console.error('Error accepting friend request:', error)
            this.showMessage('Failed to accept friend request', 'error')
          }
        })
      })

      // Decline friend request
      document.querySelectorAll('[data-decline-request]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const requestId = e.target.dataset.declineRequest
          try {
            await declineFriendRequest(requestId)
            await this.loadFriendRequests()
            this.showMessage('Friend request declined', 'success')
            this.render()
          } catch (error) {
            console.error('Error declining friend request:', error)
            this.showMessage('Failed to decline friend request', 'error')
          }
        })
      })

      // Gift FATTY BUCKS
      document.querySelectorAll('[data-gift-friend]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const friendId = e.target.dataset.giftFriend
          const friend = this.friends.find(f => f.id === friendId)
          if (!friend) return

          const amount = prompt(`How many FATTY BUCKS do you want to gift to ${friend.username}?\n\nYour balance: ${this.balance.toLocaleString()} FATTY BUCKS`)
          if (!amount) return

          const giftAmount = parseInt(amount)
          if (isNaN(giftAmount) || giftAmount <= 0) {
            this.showMessage('Invalid amount', 'error')
            return
          }

          if (giftAmount > this.balance) {
            this.showMessage('Insufficient balance!', 'error')
            return
          }

          try {
            await sendGift(this.user.uid, friendId, giftAmount)
            this.balance -= giftAmount
            this.updateWallet()
            this.showMessage(`Sent ${giftAmount.toLocaleString()} FATTY BUCKS to ${friend.username}!`, 'success')
          } catch (error) {
            console.error('Error sending gift:', error)
            this.showMessage(error.message || 'Failed to send gift', 'error')
          }
        })
      })
    }

    // Shop
    if (this.currentView === 'shop') {
      document.querySelectorAll('[data-buy-item]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const itemId = e.target.dataset.buyItem
          this.buyShopItem(itemId)
          this.render()
        })
      })
    }
  }

  playCoinFlip(choice) {
    const betAmount = parseInt(document.getElementById('bet-amount').value)

    if (!betAmount || betAmount < 1) {
      this.showMessage('Invalid bet amount!', 'error')
      return
    }

    const result = this.placeBet(betAmount,
      () => {
        this.balance += betAmount * 2
        this.updateStats(betAmount, betAmount * 2, true)
        this.saveUserData()
        this.updateWallet()
        this.showMessage(`You won ${(betAmount * 2).toLocaleString()} FATTY BUCKS!`, 'success')
      },
      () => {
        this.updateStats(betAmount, 0, false)
        this.showMessage(`You lost ${betAmount.toLocaleString()} FATTY BUCKS!`, 'error')
      }
    )

    if (!result) return

    const coin = document.getElementById('coin')
    coin.classList.add('flipping')

    setTimeout(() => {
      const outcome = Math.random() < 0.5 ? 'heads' : 'tails'
      const coinFace = coin.querySelector('.coin-face')
      coinFace.textContent = outcome === 'heads' ? '👑' : '💰'

      coin.classList.remove('flipping')

      if (outcome === choice) {
        result.win()
      } else {
        result.lose()
      }
    }, 1000)
  }

  playRoulette(choice) {
    const betAmount = parseInt(document.getElementById('bet-amount').value)

    if (!betAmount || betAmount < 1) {
      this.showMessage('Invalid bet amount!', 'error')
      return
    }

    const result = this.placeBet(betAmount,
      () => {
        this.balance += betAmount * 2
        this.updateStats(betAmount, betAmount * 2, true)
        this.saveUserData()
        this.updateWallet()
        this.showMessage(`You won ${(betAmount * 2).toLocaleString()} FATTY BUCKS!`, 'success')
      },
      () => {
        this.updateStats(betAmount, 0, false)
        this.showMessage(`You lost ${betAmount.toLocaleString()} FATTY BUCKS!`, 'error')
      }
    )

    if (!result) return

    const wheel = document.getElementById('roulette-wheel')
    wheel.classList.add('spinning')

    setTimeout(() => {
      const outcome = Math.random() < 0.5 ? 'red' : 'black'
      wheel.classList.remove('spinning')

      if (outcome === choice) {
        result.win()
      } else {
        result.lose()
      }
    }, 4000)
  }

  playSlots() {
    const betAmount = parseInt(document.getElementById('bet-amount').value)

    if (!betAmount || betAmount < 1) {
      this.showMessage('Invalid bet amount!', 'error')
      return
    }

    const result = this.placeBet(betAmount,
      (multiplier) => {
        const winAmount = betAmount * multiplier
        this.balance += winAmount
        this.updateStats(betAmount, winAmount, true)
        this.saveUserData()
        this.updateWallet()
        this.showMessage(`You won ${winAmount.toLocaleString()} FATTY BUCKS! (${multiplier}x)`, 'success')
      },
      () => {
        this.updateStats(betAmount, 0, false)
        this.showMessage(`You lost ${betAmount.toLocaleString()} FATTY BUCKS!`, 'error')
      }
    )

    if (!result) return

    const symbols = ['🍒', '🍋', '🍊', '🍇', '💎', '⭐', '7️⃣']
    const reels = [
      document.getElementById('slot1'),
      document.getElementById('slot2'),
      document.getElementById('slot3')
    ]

    reels.forEach(reel => reel.classList.add('spinning'))

    let spinCount = 0
    const spinInterval = setInterval(() => {
      reels.forEach(reel => {
        reel.textContent = symbols[Math.floor(Math.random() * symbols.length)]
      })
      spinCount++
      if (spinCount > 20) {
        clearInterval(spinInterval)
        reels.forEach(reel => reel.classList.remove('spinning'))

        const results = reels.map(() => symbols[Math.floor(Math.random() * symbols.length)])
        reels.forEach((reel, i) => reel.textContent = results[i])

        const uniqueSymbols = new Set(results)

        if (uniqueSymbols.size === 1) {
          // All 3 match
          result.win(10)
        } else if (uniqueSymbols.size === 2) {
          // 2 match
          result.win(2)
        } else {
          // No match
          result.lose()
        }
      }
    }, 100)
  }

  playDice() {
    const betAmount = parseInt(document.getElementById('bet-amount').value)

    if (!betAmount || betAmount < 1) {
      this.showMessage('Invalid bet amount!', 'error')
      return
    }

    const result = this.placeBet(betAmount,
      () => {
        this.balance += betAmount * 2
        this.updateStats(betAmount, betAmount * 2, true)
        this.saveUserData()
        this.updateWallet()
        this.showMessage(`You won ${(betAmount * 2).toLocaleString()} FATTY BUCKS!`, 'success')
      },
      () => {
        this.updateStats(betAmount, 0, false)
        this.showMessage(`You lost ${betAmount.toLocaleString()} FATTY BUCKS!`, 'error')
      }
    )

    if (!result) return

    const diceResult = document.getElementById('dice-result')
    let rollCount = 0

    const rollInterval = setInterval(() => {
      diceResult.textContent = Math.floor(Math.random() * 100) + 1
      rollCount++

      if (rollCount > 10) {
        clearInterval(rollInterval)
        const finalRoll = Math.floor(Math.random() * 100) + 1
        diceResult.textContent = finalRoll

        if (finalRoll > 50) {
          result.win()
        } else {
          result.lose()
        }
      }
    }, 100)
  }
}

// Initialize the casino with error handling
try {
  new FattyCasino()
} catch (error) {
  console.error('Failed to initialize FATTY CASINO:', error)
  document.querySelector('#app').innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #0a0a0a; color: #fff; text-align: center; padding: 2rem;">
      <div>
        <h1 style="color: #ffd700; font-size: 2rem; margin-bottom: 1rem;">🎰 FATTY CASINO</h1>
        <p style="color: #ff4444; margin-bottom: 1rem;">Failed to initialize application</p>
        <p style="color: #a0a0a0; font-size: 0.9rem;">Check console for details</p>
        <pre style="background: #1a1a1a; padding: 1rem; border-radius: 8px; text-align: left; overflow-x: auto; margin-top: 1rem;">${error.message}</pre>
      </div>
    </div>
  `
}
