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

### Core
- Landing page with hero section and top 10 trending movie grid
- User signup/login with JWT auth
- Dashboard with activity feed (own + friends) and movie search
- Discovery page with trending, popular, top-rated, and browse

### Movie Interaction
- ✅ Rate movies (1-5 stars, upsert — update existing rating)
- ✅ Write, edit, and delete reviews
- ✅ Add / remove movies from watchlist (duplicate-safe via DB constraint)
- ✅ Mark movies as watched
- ✅ Average rating + rating distribution chart on movie page
- ✅ Paginated reviews with page navigation
- ✅ Pre-populated form with user's existing rating/review

### Social
- Friend request and accept workflow
- ✅ Dedicated friend requests page (`/friends/requests`)
- ✅ Dedicated friends list page (`/friends`)
- ✅ Profile-level friend actions (Add Friend, Request Sent, Remove Friend)
- Private friend chat (REST + Socket.io live events)
- User profile page with ratings, diary, reviews, lists, watchlist, and stats tabs
- Activity feed tracks: rated, reviewed, watchlist_add, watched

### Personalization
- ✅ Personalized recommendations (multi-seed similar movies + genre-based + friend picks)
- ✅ Movie metadata (title, poster, year) in stats, feed, and recommendations
- ✅ Rating analytics with full 5-star distribution
- Movie lists (create, edit, delete, add/remove movies)
- Dedicated watchlist page with poster grid

### UX
- ✅ Loading spinners on dashboard, discover, movie, stats pages
- ✅ Quick action buttons (watchlist, watched) on movie page
- Responsive design with Tailwind CSS

## What We Modified Recently

- Updated profile experience in `frontend/src/app/profile/[username]/page.js`
- Added upload storage path in `backend/uploads/avatars/`
- Added shared frontend API client in `frontend/src/lib/api.js`
- Added movie details screen in `frontend/src/app/movie/[id]/page.js`
- Added backend users route in `backend/src/routes/users.js`
- Added backend app bootstrap in `backend/src/app.js`

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
