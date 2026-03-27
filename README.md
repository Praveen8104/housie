# Housie - Tambola / Bingo

A real-time multiplayer Housie (Tambola/Bingo) game built with React Native, Expo, and Firebase.

## Features

### Game
- Real-time multiplayer with Firebase Realtime Database
- Host draws numbers, players mark tickets on their own phones
- Auto-claim detection for prizes
- 5 prize types: Full House, Jaldi 5, Top Line, Middle Line, Bottom Line
- Customizable prize amounts
- Play Again in the same room
- Pass & Play mode for single device

### Tickets
- Authentic paper-style ticket design
- Circular dauber stamp marks
- Blinking highlight for current called number (Premium)
- Auto-mark called numbers (Premium)
- Multiple tickets per player (up to 6)
- Unique ticket colors per player

### Payments
- UPI deep link integration (GPay, PhonePe, Paytm)
- Host enters UPI ID, players pay directly
- Host confirms payments in lobby
- Wallet tracks net earnings across games
- Automatic ticket fee debit and prize credit
- Refund on game cancellation

### Social
- Emoji reactions during gameplay
- Voice announcements for called numbers with fun nicknames
- Confetti animation on winning
- Game history with detailed stats
- Leaderboard across games

### UI/UX
- Dark and Light theme with toggle
- Smooth screen transitions
- Custom styled alert modals
- Haptic feedback
- Floating called number indicator when scrolling
- Game over summary screen

## Tech Stack

- **Framework**: React Native with Expo (SDK 54)
- **Navigation**: Expo Router (file-based)
- **Backend**: Firebase Realtime Database
- **Auth**: Phone + PIN (Firebase RTDB)
- **State**: React Context
- **Icons**: @expo/vector-icons (Ionicons, MaterialCommunityIcons)
- **Language**: TypeScript

## Project Structure

```
app/                    # Screens (Expo Router)
  _layout.tsx           # Root layout with providers
  index.tsx             # Home screen
  login.tsx             # Phone + PIN auth
  profile.tsx           # User profile & settings
  wallet.tsx            # Wallet & transactions
  multiplayer.tsx       # Create/Join room
  lobby.tsx             # Pre-game lobby
  mp-host.tsx           # Multiplayer host game screen
  mp-player.tsx         # Multiplayer player game screen
  local-setup.tsx       # Local game player setup
  host.tsx              # Local game host screen
  player.tsx            # Local game player screen
  scoreboard.tsx        # Local game scoreboard
  history.tsx           # Game history list
  history-detail.tsx    # Game detail view
  leaderboard.tsx       # Leaderboard

src/
  components/           # Reusable components
    TicketView.tsx       # Housie ticket with dauber marks
    NumberBoard.tsx      # 1-90 number grid
    ClaimButtons.tsx     # Prize claim buttons
    Confetti.tsx         # Celebration animation
    GameAlert.tsx        # Custom styled alert modal
    GameOverSummary.tsx  # Game over full screen summary
    ReactionBar.tsx      # Emoji reactions with floating overlay

  firebase/             # Firebase services
    config.ts            # Firebase initialization
    authService.ts       # Phone + PIN authentication
    roomService.ts       # Room CRUD, game logic, claims
    walletService.ts     # Wallet balance & transactions

  store/                # State management
    AuthContext.tsx       # Auth provider & useAuth hook
    ThemeContext.tsx      # Theme provider with dark/light
    GameContext.tsx       # Local game state
    gameStore.ts         # Local game pure functions

  hooks/                # Custom hooks
    useGameAlert.ts      # Alert queue management
    useStyles.ts         # Themed StyleSheet factory

  utils/                # Utilities
    gameLogic.ts         # Claim validation & number drawing
    ticketGenerator.ts   # Housie ticket generation
    storage.ts           # AsyncStorage helpers
    haptics.ts           # Haptic feedback
    numberNicknames.ts   # Fun number call names

  constants/
    theme.ts             # Colors, fonts, prize distribution
```

## Getting Started

### Prerequisites
- Node.js 18+
- Expo CLI
- Firebase project with Realtime Database

### Setup

```bash
# Install dependencies
npm install

# Start development server
npx expo start
```

### Firebase Setup
1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Realtime Database
3. Update `src/firebase/config.ts` with your Firebase config
4. Set database rules:
```json
{
  "rules": {
    ".read": true,
    ".write": true,
    "rooms": {
      "$roomCode": {
        "reactions": {
          ".indexOn": ["timestamp"]
        }
      }
    },
    "transactions": {
      "$userId": {
        ".indexOn": ["timestamp"]
      }
    }
  }
}
```

## Game Flow

```
Register (Phone + PIN)
  |
Home Screen
  |
Create/Join Room --> Lobby
  |                    |
  |              Pick Tickets
  |              Pay via UPI
  |              Host Confirms
  |                    |
  |              Start Game
  |                    |
  |         Host Draws Numbers
  |         Players Mark Tickets
  |         Auto-claim Detection
  |                    |
  |              Game Over
  |              Summary Screen
  |                    |
  |         Play Again / Home
  |
History & Leaderboard
```

## Premium Features

- **Auto-mark**: Automatically marks called numbers on your tickets
- **Blinking highlight**: Current called number blinks on your ticket

Unlock via Profile > Premium > Enter Code

---

Made with ❤️ by Praveen
