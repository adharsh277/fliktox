# Fliktox Backend

This is the Node.js + Express backend for Fliktox.

Quick start

1. Copy `.env.example` to `.env` and set `MONGO_URI` and `JWT_SECRET`.
2. Install dependencies:

```bash
cd backend
npm install
```

3. Run in development:

```bash
npm run dev
```

API endpoints (basic)

- `POST /api/auth/register` – register
- `POST /api/auth/login` – login
- `GET /api/auth/me` – get current user (requires `Authorization: Bearer <token>`)
- `GET /api/movies` – list movies (query `?type=anime` for anime)
- `POST /api/movies` – create movie (auth)
- `POST /api/reviews/:movieId` – add review (auth)
- `POST /api/comments/:reviewId` – add comment (auth)
- `POST /api/lists` – create list (auth)
- `GET /api/messages/between/:userId` – get messages with user (auth)

Socket.io

Connect to the server and emit `private_message` with payload `{ from, to, text }`. The server saves messages and emits `message:<userId>` events.
