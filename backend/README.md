# Fliktox Backend

Express + PostgreSQL + Socket.io backend for Fliktox.

## Environment Variables

Set these in `backend/.env`:

- `PORT` (default `4000`)
- `CLIENT_ORIGIN` (default `http://localhost:3000`)
- `DATABASE_URL`
- `JWT_SECRET`
- `TMDB_API_KEY` (optional, fallback movie data is used when not set)
- `ADMIN_EMAILS` (comma-separated list of admin emails)

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy env file:
   ```bash
   cp .env.example .env
   ```
3. Create database and initialize schema:
   ```bash
   createdb fliktox
   npm run db:init
   ```
4. Run dev server:
   ```bash
   npm run dev
   ```

API runs on `http://localhost:4000` by default.

## New API Highlights

### Clubs

- `POST /api/clubs` create club
- `POST /api/clubs/:id/join` join club
- `GET /api/clubs/:id` view club + members
- `GET /api/clubs/mine` list clubs for logged-in user

### Admin

- `GET /api/admin/overview` dashboard stats
- `GET /api/admin/users` view/search users
- `PATCH /api/admin/users/:userId/ban` ban/unban user
- `GET /api/admin/reviews` view reviews
- `DELETE /api/admin/reviews/:ratingId` remove abusive review text
