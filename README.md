# Fliktox

Fliktox is a social movie tracking platform inspired by Letterboxd, with social feed and friend chat features.

## Tech Stack

- Frontend: Next.js + Tailwind CSS
- Backend: Node.js + Express + Socket.io
- Database: PostgreSQL
- Movie data: TMDB API

## Project Structure

```text
fliktox/
	backend/   # Express API + WebSocket chat + PostgreSQL schema
	frontend/  # Next.js app with landing, dashboard, movie, profile pages
```

## Features Implemented

- Landing page with hero section and top 10 trending movie grid
- User signup/login with JWT auth
- Dashboard with friend activity feed and movie search
- Movie details page with rating/review/watchlist/watched actions
- Friend request and accept workflow endpoints
- Private friend chat (REST + Socket.io events)
- User profile page with ratings and pending friend requests
- Discovery page for trending and searched movies

## Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Set these values in `backend/.env`:

- `DATABASE_URL`
- `JWT_SECRET`
- `TMDB_API_KEY` (optional, fallback data is used when missing)

Initialize database and run backend:

```bash
npm run db:init
npm run dev
```

Backend default URL: `http://localhost:4000`

## Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Frontend default URL: `http://localhost:3000`

## Notes

- This is an MVP foundation. You can extend it with Cloudinary uploads, richer feed events, typing indicators, and production-grade validation.
