# 🎰 FATTY CASINO

A parody web casino game for friends. Play with virtual FATTY BUCKs (FB) and compete on the global leaderboard.

## Features

- **3 Mini-Games**: Spin the Lucky Wheel, Flip a Coin, or Play High-Low
- **Anonymous Auth**: Sign in anonymously, no accounts needed
- **Real-Time Leaderboard**: Compete with other players and track your best balance
- **Game History**: View your past games and results
- **Apple-like Design**: Clean, minimal UI with smooth animations
- **Server-Side Game Logic**: All game outcomes calculated securely in Firebase Cloud Functions
- **Responsive**: Works on desktop, tablet, and mobile

## Tech Stack

- **Frontend**: Vanilla HTML, CSS, JavaScript
- **Build Tool**: Vite
- **Backend**: Firebase (Auth, Firestore, Cloud Functions)
- **Design**: Apple-inspired with CSS animations

## Getting Started

### Prerequisites

- Node.js 18+ ([download here](https://nodejs.org/))
- Firebase CLI (`npm install -g firebase-tools`)
- A Firebase project ([create one here](https://console.firebase.google.com/))

### Installation

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd fatty-casino
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd functions && npm install && cd ..
   ```

3. **Set up Firebase**
   ```bash
   firebase login
   firebase init
   ```
   - Select your project
   - Choose: Firestore, Functions, Hosting
   - Use existing files when prompted

4. **Configure environment variables**
   ```bash
   cp .env.local.example .env.local
   ```
   Edit `.env.local` with your Firebase credentials from [Firebase Console](https://console.firebase.google.com/):
   - Go to Project Settings
   - Copy your config values

5. **Deploy Firestore Rules** (one-time setup)
   ```bash
   firebase deploy --only firestore:rules
   ```

6. **Deploy Cloud Functions** (one-time setup)
   ```bash
   firebase deploy --only functions
   ```

### Development

**Local Development with Emulators**:
```bash
# Terminal 1: Start Firebase emulators
firebase emulators:start

# Terminal 2: Start Vite dev server
npm run dev
```

Open `http://localhost:5173` in your browser.

**Production Build**:
```bash
npm run build
firebase deploy  # Deploy frontend + functions
```

## Game Rules

### Starting Balance
- All players start with **1,000 FB**

### Bet Rules
- Minimum bet: **1 FB**
- Maximum bet: **20% of your current balance**

### Games

**Lucky Wheel**
- Three outcomes: Blue (2x), Green (2x), Gold (3x)
- Win: Payout = Wager × Multiplier
- Loss: Lose wager

**Coin Flip**
- 50/50 chance (Heads or Tails)
- Win: Payout = Wager (2x total)
- Loss: Lose wager

**High-Low**
- Guess if card is High (7-K) or Low (A-6)
- Win: Payout = Wager (2x total)
- Loss: Lose wager

### Leaderboard
- Shows top 50 players by highest balance ever reached
- Updates after every game

## Project Structure

```
fatty-casino/
├── public/              # Static assets
├── src/
│   ├── styles/          # CSS (tokens, base, animations, components)
│   ├── lib/             # Firebase & auth helpers
│   ├── games/           # Game UI modules
│   └── main.js          # App entry point
├── functions/
│   ├── services/        # RNG & economy logic
│   ├── games/           # Game Cloud Functions
│   └── index.js         # Cloud Functions entry
├── firebase.json        # Firebase configuration
├── firestore.rules      # Firestore security rules
├── firestore.indexes.json  # Database indexes
└── index.html           # HTML template
```

## Security

### Firestore Rules
- Users can only read their own data
- Direct balance writes are denied
- All mutations go through Cloud Functions

### Game Logic
- All game outcomes calculated server-side using secure RNG
- Daily rotating seed ensures fairness
- Wagers validated server-side
- Atomic balance updates with transaction logging

### RNG Details
- Uses SHA-256 hashing
- Combines daily seed + user UID + timestamp
- Cryptographically secure and verifiable
- Cannot be manipulated by client

## API Endpoints (Cloud Functions)

### Economy
- `economy-initUser()` - Initialize new user with 1000 FB
- `economy-getBalance()` - Get current balance

### Games
- `games-playWheel(wager)` - Spin the wheel
- `games-playCoinFlip(wager, choice)` - Flip coin (heads/tails)
- `games-playHighLow(wager, choice)` - High-low card (high/low)

### Leaderboard
- `leaderboard-getLeaderboard(limit)` - Get top players (default 50)

### History
- `history-getUserHistory(limit)` - Get user's game history (default 20)

## Troubleshooting

**"User not found" error after sign in?**
- Cloud Functions may not be deployed. Run: `firebase deploy --only functions`

**Games not working?**
- Check Cloud Functions are deployed: `firebase functions:list`
- Check browser console for errors
- Verify Firestore rules are deployed

**Emulator not connecting?**
- Ensure `firebase emulators:start` is running
- Check port 5001 (functions), 8080 (firestore), 9099 (auth)

## Development Notes

- No framework dependencies (vanilla JS only)
- All styling with CSS custom properties for easy theming
- Animations use CSS keyframes (180-260ms duration)
- Responsive design with mobile-first approach
- All async operations use async/await

## Future Enhancements

- Persistence (save games to Cloud Storage)
- Daily bonuses and rewards
- Multiplayer tournaments
- Custom player names and avatars
- Game statistics and analytics
- Export game history as CSV

## Support

For issues or questions:
1. Check the Firebase console for errors
2. Review Cloud Functions logs: `firebase functions:log`
3. Check browser console (DevTools > Console)

## License

MIT

---

Made with 🎰 for fun (not actual gambling!)
