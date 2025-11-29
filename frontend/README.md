# Fliktox Frontend

Next.js frontend using TailwindCSS and Axios. Connects to the backend at `NEXT_PUBLIC_API_URL` (default `http://localhost:5000/api`).

Run locally:

```bash
cd frontend
npm install
cp .env.local.example .env.local || true
# edit .env.local to set NEXT_PUBLIC_API_URL and NEXT_PUBLIC_WS_URL if needed
npm run dev
```

Notes:
- Pages: `/login`, `/signup`, `/home`, `/movie/[id]`, `/profile/[username]`
- Components: `MovieCard`, `ReviewCard`, `ChatWindow`
