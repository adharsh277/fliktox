const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";

function getToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return localStorage.getItem("fliktox_token") || "";
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : null;

  if (!response.ok) {
    throw new Error(data?.error || "Request failed");
  }

  return data;
}

export function setSession(token, user) {
  localStorage.setItem("fliktox_token", token);
  localStorage.setItem("fliktox_user", JSON.stringify(user));
}

export function getCurrentUser() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = localStorage.getItem("fliktox_user");
  return raw ? JSON.parse(raw) : null;
}

export function clearSession() {
  localStorage.removeItem("fliktox_token");
  localStorage.removeItem("fliktox_user");
}

export const api = {
  request,
  signup: (payload) =>
    request("/auth/signup", { method: "POST", body: JSON.stringify(payload) }),
  login: (payload) =>
    request("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  me: () => request("/auth/me"),
  trending: () => request("/movies/trending"),
  popularMovies: (page = 1) => request(`/movies/popular?page=${page}`),
  topRatedMovies: (page = 1) => request(`/movies/top-rated?page=${page}`),
  discoverMovies: (page = 1) => request(`/movies/discover?page=${page}`),
  searchMovies: (query, page = 1) =>
    request(`/movies/search?q=${encodeURIComponent(query)}&page=${page}`),
  movie: (id) => request(`/movies/${id}`),
  rateMovie: (id, payload) =>
    request(`/ratings/movies/${id}`, {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  movieSummary: (id) => request(`/ratings/movies/${id}/summary`),
  movieReviews: (id, page = 1, limit = 10) =>
    request(`/ratings/movies/${id}/reviews?page=${page}&limit=${limit}`),
  editReview: (tmdbId, review) =>
    request(`/ratings/reviews/${tmdbId}`, {
      method: "PATCH",
      body: JSON.stringify({ review })
    }),
  deleteReview: (tmdbId) =>
    request(`/ratings/reviews/${tmdbId}`, { method: "DELETE" }),
  myMovieRating: (id) => request(`/ratings/movies/${id}/mine`),
  profileRatings: (userId) => request(`/ratings/users/${userId}`),
  addToWatchlist: (tmdbId) =>
    request(`/ratings/watchlist/${tmdbId}`, { method: "POST" }),
  removeFromWatchlist: (tmdbId) =>
    request(`/ratings/watchlist/${tmdbId}`, { method: "DELETE" }),
  getWatchlist: () => request("/ratings/watchlist"),
  markWatched: (tmdbId) =>
    request(`/ratings/watched/${tmdbId}`, { method: "POST" }),
  feed: () => request("/feed/activity"),
  friendList: () => request("/friends/list"),
  friendRequests: () => request("/friends/requests"),
  searchUsers: (q) => request(`/users/search?q=${encodeURIComponent(q)}`),
  sendRequest: (friendId) => request(`/friends/request/${friendId}`, { method: "POST" }),
  acceptRequest: (friendId) => request(`/friends/accept/${friendId}`, { method: "POST" }),
  rejectRequest: (friendId) => request(`/friends/reject/${friendId}`, { method: "POST" }),
  messages: (friendId) => request(`/messages/${friendId}`),
  sendMessage: (friendId, message) =>
    request(`/messages/${friendId}`, {
      method: "POST",
      body: JSON.stringify({ message })
    }),

  // Lists
  myLists: () => request("/lists/mine"),
  userLists: (userId) => request(`/lists/user/${userId}`),
  getList: (listId) => request(`/lists/${listId}`),
  createList: (payload) =>
    request("/lists", { method: "POST", body: JSON.stringify(payload) }),
  updateList: (listId, payload) =>
    request(`/lists/${listId}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteList: (listId) => request(`/lists/${listId}`, { method: "DELETE" }),
  addMovieToList: (listId, tmdbId) =>
    request(`/lists/${listId}/movies`, { method: "POST", body: JSON.stringify({ tmdb_id: tmdbId }) }),
  removeMovieFromList: (listId, tmdbId) =>
    request(`/lists/${listId}/movies/${tmdbId}`, { method: "DELETE" }),

  // Stats
  myStats: () => request("/stats/me"),
  userStats: (userId) => request(`/stats/user/${userId}`),

  // Recommendations
  recommendations: () => request("/recommendations"),

  // Profile
  publicProfile: (username) => request(`/profile/${username}`),
  updateProfile: (payload) =>
    request("/profile/me/update", { method: "PUT", body: JSON.stringify(payload) }),

  // Settings
  changePassword: (payload) =>
    request("/auth/change-password", { method: "PUT", body: JSON.stringify(payload) })
};
