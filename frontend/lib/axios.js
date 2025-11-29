const axios = require('axios').default;

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

const instance = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' }
});

// attach token if present
instance.interceptors.request.use((config) => {
  try {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (err) {}
  return config;
});

// Mock adapter for development (when NEXT_PUBLIC_USE_MOCK=true)
if (typeof window !== 'undefined' && USE_MOCK) {
  const defaultAdapter = axios.defaults.adapter;

  // small in-memory mock data
  const mockMovies = [
    { _id: '1', title: 'The Great Adventure', description: 'An epic movie.', type: 'movie', genres: ['Action'], averageRating: 8.2, ratingsCount: 12 },
    { _id: '2', title: 'Moonlight Saga', description: 'A touching anime story.', type: 'anime', genres: ['Drama'], averageRating: 9.0, ratingsCount: 34 },
    { _id: '3', title: 'Comedy Nights', description: 'Laughs and more laughs.', type: 'movie', genres: ['Comedy'], averageRating: 7.1, ratingsCount: 5 }
  ];

  const mockReviews = {
    '1': [
      { _id: 'r1', user: { name: 'Alice'}, rating: 9, text: 'Loved it!', createdAt: new Date().toISOString() },
      { _id: 'r2', user: { name: 'Bob'}, rating: 7, text: 'Good watch.', createdAt: new Date().toISOString() }
    ],
    '2': [
      { _id: 'r3', user: { name: 'Carol'}, rating: 10, text: 'Masterpiece', createdAt: new Date().toISOString() }
    ]
  };

  const mockUser = { _id: 'u1', name: 'Demo User', email: 'demo@example.com' };

  instance.defaults.adapter = async (config) => {
    const url = (config.url || '').replace(/^\//, '');
    const method = (config.method || 'get').toLowerCase();

    // Simulate a small network delay
    await new Promise(r => setTimeout(r, 150));

    try {
      // GET /movies
      if (method === 'get' && (url === 'movies' || url === '/movies')) {
        return { data: mockMovies, status: 200, statusText: 'OK', headers: {}, config, request: {} };
      }

      // GET /movies/:id
      const movieMatch = url.match(/^movies\/(.+)$/);
      if (method === 'get' && movieMatch) {
        const id = movieMatch[1];
        const movie = mockMovies.find(m => m._id === id);
        if (movie) return { data: movie, status: 200, statusText: 'OK', headers: {}, config, request: {} };
        return { data: null, status: 404, statusText: 'Not Found', headers: {}, config, request: {} };
      }

      // GET /reviews/:movieId
      const revMatch = url.match(/^reviews\/(.+)$/);
      if (method === 'get' && revMatch) {
        const id = revMatch[1];
        return { data: mockReviews[id] || [], status: 200, statusText: 'OK', headers: {}, config, request: {} };
      }

      // GET /auth/me
      if (method === 'get' && (url === 'auth/me' || url === '/auth/me')) {
        return { data: mockUser, status: 200, statusText: 'OK', headers: {}, config, request: {} };
      }

      // POST /auth/login and /auth/register -> return token + user
      if (method === 'post' && (url === 'auth/login' || url === 'auth/register')) {
        return { data: { token: 'mock-token', user: mockUser }, status: 200, statusText: 'OK', headers: {}, config, request: {} };
      }

      // Other requests: fall back to default adapter
      return defaultAdapter(config);
    } catch (err) {
      return Promise.reject(err);
    }
  };
}

module.exports = instance;
