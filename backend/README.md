# Fliktox Backend

Express + PostgreSQL + Socket.io backend for Fliktox.

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
