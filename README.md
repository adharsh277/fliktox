# Fliktox 🎬

Fliktox is a social movie tracking and discovery platform inspired by Letterboxd. Share ratings and reviews, connect with friends, join movie clubs, and get personalized recommendations.

## ✨ Features Overview

**Movie Tracking & Reviews**
- Rate movies (1-5 stars) with edit/delete capability
- Write detailed reviews with formatting
- Add movies to watchlist and mark watched
- View rating analytics and review distribution

**Social Network**
- Find and add friends
- Real-time friend chat with Socket.io
- View friend activity in personalized feed
- User profiles with tabs: ratings, reviews, lists, watchlist, stats

**Communities**
- Create and join movie clubs
- Browse club members and discussions
- Discover movies within club context

**Personalization**
- Get AI-powered movie recommendations
- Multi-seed algorithm (similar movies + genres + friend picks)
- Personalized discovery feed based on activity

**Admin Tools**
- Dashboard with site analytics
- User management (view, ban/unban)
- Moderation (delete abusive reviews)
- User statistics and platform overview

**Explore & Discover**
- Trending movies
- Popular & top-rated films
- Browse by genre
- Search functionality
- Stats dashboard with viewing analytics

## 🛠 Tech Stack

| Layer | Tech |
|-------|------|
| **Frontend** | Next.js 14, Tailwind CSS, Socket.io client |
| **Backend** | Node.js, Express, Socket.io, JWT auth |
| **Database** | PostgreSQL |
| **APIs** | TMDB (The Movie Database) |
| **Deployment** | Docker & Docker Compose |

## 📁 Project Structure

```
fliktox/
├── backend/               # Express API + WebSocket server
│   ├── src/
│   │   ├── routes/        # API endpoints
│   │   ├── services/      # Business logic (e.g., trending cache)
│   │   ├── middleware/    # Auth, admin checks
│   │   ├── socket/        # WebSocket chat handlers
│   │   ├── db/            # Database config & initialization
│   │   └── utils/         # Helpers (TMDB API calls)
│   └── sql/               # PostgreSQL schema
├── frontend/              # Next.js application
│   ├── src/
│   │   ├── app/           # Pages & layouts
│   │   ├── components/    # Reusable UI components
│   │   └── lib/           # API client, socket config
│   └── public/            # Static assets
└── docker-compose.yml     # Multi-container setup
```

## 🚀 Quick Start

### Using Docker (Recommended)

```bash
# Start all services (database, backend, frontend)
docker-compose up

# Access:
# - Frontend: http://localhost:3000
# - Backend: http://localhost:4000
# - Database: postgres://localhost:5432
```

### Local Development

**Backend Setup:**
```bash
cd backend
npm install
cp .env.example .env
npm run db:init    # Initialize PostgreSQL database
npm run dev        # Start on port 4000
```

**Frontend Setup:**
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev        # Start on port 3000
```

## ⚙️ Environment Variables

### Backend (`backend/.env`)
```
PORT=4000
DATABASE_URL=postgres://fliktox:fliktox@localhost:5432/fliktox
JWT_SECRET=your_jwt_secret_key
TMDB_API_KEY=your_tmdb_api_key
ADMIN_EMAILS=admin@example.com,mod@example.com
CLIENT_ORIGIN=http://localhost:3000
```

### Frontend (`frontend/.env.local`)
```
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
```

## 📚 API Documentation

### Authentication
- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Login with JWT
- `POST /api/auth/logout` - Logout

### Movies
- `GET /api/movies/:id` - Get movie details
- `GET /api/movies/search` - Search movies
- `GET /api/trending` - Trending movies (cached)

### Ratings & Reviews
- `POST /api/ratings` - Rate/review a movie
- `PATCH /api/ratings/:id` - Update rating/review
- `DELETE /api/ratings/:id` - Delete rating/review
- `GET /api/movies/:id/ratings` - Get movie reviews

### Watchlist
- `POST /api/watchlist` - Add to watchlist
- `DELETE /api/watchlist/:movieId` - Remove from watchlist
- `GET /api/user/watchlist` - Get user's watchlist

### Social
- `GET /api/friends` - List friends
- `POST /api/friends/request` - Send friend request
- `POST /api/friends/accept` - Accept request
- `DELETE /api/friends/:userId` - Remove friend

### Messages (WebSocket + REST)
- `GET /api/messages/:userId` - Get chat history
- `POST /api/messages` - Send message (updates via Socket.io)
- Real-time notifications via Socket.io

### Lists
- `POST /api/lists` - Create custom list
- `PATCH /api/lists/:id` - Update list
- `DELETE /api/lists/:id` - Delete list
- `POST /api/lists/:id/movies` - Add movie to list

### Clubs
- `POST /api/clubs` - Create club
- `GET /api/clubs` - List clubs
- `GET /api/clubs/:id` - Get club details
- `POST /api/clubs/:id/join` - Join club

### Admin
- `GET /api/admin/overview` - Dashboard stats
- `GET /api/admin/users` - User management
- `PATCH /api/admin/users/:userId/ban` - Ban/unban user
- `GET /api/admin/reviews` - Moderation queue
- `DELETE /api/admin/reviews/:ratingId` - Remove review

### Recommendations
- `GET /api/recommendations` - Get personalized recommendations
- Uses multi-seed algorithm, friend activity, and genre matching

### Statistics
- `GET /api/stats/user` - Personal viewing stats
- `GET /api/stats/trending` - Global trending stats

### Feed & Activity
- `GET /api/feed` - Personal activity feed
- Tracks: ratings, reviews, watchlist adds, watched movies

## 🔐 Security Features

- **JWT Authentication** - Secure token-based auth
- **Admin Allowlist** - Only approved admins can access admin features
- **Database Constraints** - Prevents duplicate watchlist entries
- **Input Validation** - Server-side validation on all inputs
- **CORS Protection** - Restricted to allowed origins

## 🎨 Frontend Routes

| Route | Purpose |
|-------|---------|
| `/` | Landing page with hero + trending grid |
| `/login` | Login page |
| `/signup` | Registration page |
| `/dashboard` | Personal feed + quick actions |
| `/discover` | Browse trending, popular, top-rated |
| `/movie/:id` | Movie details, ratings, reviews |
| `/watchlist` | Your watchlist with poster grid |
| `/lists` | Custom movie lists |
| `/lists/:id` | List details |
| `/clubs` | Browse & join clubs |
| `/clubs/:id` | Club community page |
| `/friends` | Friends list |
| `/friends/requests` | Pending friend requests |
| `/friends/suggestions` | Suggested friends |
| `/profile/:username` | User profile with stats |
| `/user/:username` | Alternate profile view |
| `/stats` | Personal viewing statistics |
| `/settings` | User preferences |
| `/admin` | Admin dashboard (admins only) |

## 💾 Database Schema

Key tables:
- **users** - Account info with JWT support
- **ratings** - Movie ratings & reviews
- **watchlist** - User watchlist entries
- **friends** - Friend connections & requests
- **messages** - Private chat messages
- **lists** - Custom movie lists
- **list_movies** - Movies in lists
- **clubs** - Movie communities
- **club_members** - Club memberships

## 📦 Key NPM Scripts

**Backend:**
```bash
npm run dev      # Start development server
npm run db:init  # Initialize database schema
```

**Frontend:**
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Run production build
```

## 🐳 Docker Deployment

```bash
# Build images
docker-compose build

# Start services with detached mode
docker-compose up -d

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Stop services
docker-compose down
```

## 🔄 Recent Updates

- ✅ Implemented Socket.io real-time chat
- ✅ Added Trending Cache service for performance
- ✅ Movie clubs with membership management
- ✅ Admin dashboard with moderation tools
- ✅ Friend recommendation algorithm
- ✅ Personalized movie recommendations
- ✅ User profile tabs (ratings, reviews, lists, stats)
- ✅ Activity feed with friend activity tracking

## 📝 Contributing

1. Create feature branch (`git checkout -b feature/feature-name`)
2. Commit changes (`git commit -m 'Add feature'`)
3. Push to branch (`git push origin feature/feature-name`)
4. Open Pull Request

## 📄 License

[Add your license here]
npm run dev
```

Backend default URL: `http://localhost:4000`

## Daily Start

When you come back to the project, use these commands:

```bash
# Terminal 1 - Start PostgreSQL
docker compose up -d db

# Terminal 2 - Start Backend
cd backend && npm run dev

# Terminal 3 - Start Frontend
cd frontend && npm run dev
```

If this is a fresh machine or a new clone, run the one-time setup first:

```bash
cd backend && npm install
cd frontend && npm install
cd backend && npm run db:init
```

Notes:

- Backend reads `backend/.env` for `DATABASE_URL`, `JWT_SECRET`, `TMDB_API_KEY`, and `ADMIN_EMAILS`.
- `TMDB_API_KEY` is required for live TMDB movie data.
- `ADMIN_EMAILS` controls who can see and use the admin panel.
- Admin login is currently `adharshu777@gmail.com`.

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
