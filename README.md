# فلتة

Multiplayer party trivia game with bluffing mechanics. Players join a room, submit real or fake answers, vote anonymously, and score points for picking the truth or fooling others.

## Stack

- Backend: Node.js, Express, Socket.IO
- Data: file-backed JSON questions at `server/data/questions.json`
- Frontend: React, Vite, responsive player UI
- Admin: standalone `/admin-panel` question CRUD protected by `ADMIN_TOKEN`

## Run Locally

```bash
npm install
npm run dev
```

The web app runs on `http://localhost:5173` and proxies API/socket traffic to `http://localhost:4000`.

## Quick Solo Test

1. Open `http://localhost:5173`.
2. Create a room.
3. Pick a game mode.
4. For Kalak, pick any number of question type cards. Leaving `All types` checked includes every active category.
5. In the lobby, click `Add bot` twice.
6. Start the game.
7. Submit your answer or vote when the mode asks you to.

Bots count toward the player minimum and automatically answer/vote for local testing.

To run the production build through the API server:

```bash
npm run build
npm start
```

Then open `http://localhost:4000`.

## Environment

Copy `.env.example` to `.env` and adjust values as needed.

```bash
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
ADMIN_TOKEN=change-this-secret
MIN_PLAYERS=3
MAX_PLAYERS=6
ANSWER_SECONDS=30
VOTE_SECONDS=30
```

Admin is not linked from the player UI. Open it directly at `/admin-panel`.

All admin question/stat APIs require:

```http
Authorization: Bearer your-token
```

## REST API

- `GET /api/health`
- `GET /api/config`
- `GET /api/categories`
- `GET /api/game-modes`
- `GET /api/stats` admin token required
- `GET /api/questions` admin token required
- `GET /api/questions/:id` admin token required
- `POST /api/questions` admin token required
- `PUT /api/questions/:id` admin token required
- `DELETE /api/questions/:id` admin token required
- `GET /api/rooms/:code`

## Socket Events

Client emits:

- `room:create`
- `room:join`
- `room:updateSettings`
- `room:addBot`
- `room:removeBot`
- `game:start`
- `game:end`
- `answer:submit`
- `vote:submit`
- `round:next`
- `chat:send`

Server emits:

- `room:state`
- `game:error`

## Scoring

- Vote for the correct answer: `+100`
- Another player votes for your fake answer: `+50`
- Submit the exact correct answer during answering: `+150`

The current playable modes are `Kalak`, `Imposter`, `Fake Fact`, `Last Survivor`, and `Spot The AI`. The extra modes are MVP implementations using local seed data in `server/src/gameModes.js`, so you can expand the content and scoring rules as the game grows.
