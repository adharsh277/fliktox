CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  profile_photo TEXT,
  favorite_genres TEXT[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS movies (
  id SERIAL PRIMARY KEY,
  tmdb_id INTEGER UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  poster TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ratings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  tmdb_id INTEGER NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  watched BOOLEAN DEFAULT FALSE,
  watchlist BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, tmdb_id)
);

CREATE TABLE IF NOT EXISTS friends (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  friend_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, friend_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '';

CREATE TABLE IF NOT EXISTS lists (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT DEFAULT '',
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS list_movies (
  id SERIAL PRIMARY KEY,
  list_id INTEGER REFERENCES lists(id) ON DELETE CASCADE,
  tmdb_id INTEGER NOT NULL,
  position INTEGER DEFAULT 0,
  added_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (list_id, tmdb_id)
);

-- Activity feed table for richer activity tracking
CREATE TABLE IF NOT EXISTS activity_feed (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  tmdb_id INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ratings_user_id ON ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_user_id ON friends(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_pair ON messages(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_lists_user_id ON lists(user_id);
CREATE INDEX IF NOT EXISTS idx_list_movies_list_id ON list_movies(list_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_user_id ON activity_feed(user_id);
CREATE INDEX IF NOT EXISTS idx_ratings_watchlist ON ratings(user_id) WHERE watchlist = TRUE;
