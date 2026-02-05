# Poker High Hand Simulator - Frontend

## Project Overview

React 18 frontend (Create React App) for a poker high hand promotion simulator. Compares fairness between NLH (2 hole cards) and PLO (4 hole cards) games. Backend is a Spring Boot API on AWS.

## Tech Stack

- **Framework:** React 18.3.1 (CRA, react-scripts 5.0.1)
- **UI Library:** Ant Design 5.21.4
- **HTTP Client:** Axios 1.7.7
- **Styling:** Plain CSS (App.css, PokerTable.css, index.css)
- **Card Images:** External API at `https://deckofcardsapi.com/static/img/`
- **No routing** (single-page, modal-driven flow)
- **No state management library** (useState/useEffect in App.js)

## Project Structure

```
src/
├── App.js           # Main component (~391 lines) - ALL logic lives here
├── App.css          # Main styles
├── PokerTable.js    # Table visualization component
├── PokerTable.css   # Table styles
├── Input.js         # Unused boilerplate
├── HighHandBoard.js # Unused/abandoned component
├── index.js         # Entry point
├── index.css        # Global styles
└── cards.png        # Card sprite (unused - using external API instead)
```

## API Configuration

```javascript
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://ec2-35-85-34-37.us-west-2.compute.amazonaws.com:8080'
```

- For local dev: `REACT_APP_API_BASE_URL=http://localhost:8080`
- For production: Set to API Gateway URL from Terraform output

## Backend API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/simulations/start` | Start simulation, returns UUID |
| GET | `/simulations/{id}/status` | Check if DONE or IN_PROGRESS |
| GET | `/simulations/{id}/progress` | Get handsCompleted count |
| GET | `/simulations/{id}/hands/{n}` | Get hand data (0-indexed, available during sim) |

## Key Constants (App.js)

```javascript
DEFAULT_NUM_PLO = 8
DEFAULT_NUM_NLH = 8
DEFAULT_NUM_PLAYERS = 8
DEFAULT_SIM_DUR = 100
DEFAULT_NUM_HANDS_PER_HOUR = 30
```

## Simulation Flow

1. User fills config form → POST /simulations/start → get simulationId
2. Poll /status every 2s until DONE (shows YouTube video + spinner during wait)
3. User clicks "Play Hand" to step through hands via /hands/{n}
4. Stats (PLO vs NLH win %) update with each hand

## Hour Boundaries

High hand resets every `numHandsPerHour` hands. statsSnapshot updates at boundaries with who won.

## Commands

- `npm start` - Dev server (port 3000)
- `npm run build` - Production build
- `npm test` - Run tests

## Recent Changes

- Fixed card image URLs for 10s (deckofcardsapi uses "0" not "T")
- Added null safety for winningHand in PokerTable
- Fixed all form handlers to work with Ant Design (onChange on components, not Form.Item)
- Added progress bar using /progress endpoint
- Enabled live hand viewing during simulation (don't wait for DONE)
- Fixed handNum only incrementing on successful fetch
- API default changed to localhost:8080
- Added "Hands per Hour" form field
- Replaced YouTube waiting video with progress bar
- Fixed CSS tables-container selector (#id → .class)
- Cleaned up all commented-out/dead code

## Remaining Items

- Input.js and HighHandBoard.js are unused (can be deleted)
- Backend CORS is set to `http://genevieveepstein.com:3000` - may need updating for local dev
- No responsive design (fixed 600px tables)
