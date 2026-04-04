const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";

function normalizeUsername(username) {
  return encodeURIComponent(String(username || "").trim());
}

function getToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return localStorage.getItem("fliktox_token") || "";
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };

  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  if (!isFormData && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    cache: "no-store",
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
  friendsFeed: (page = 1, limit = 20) => request(`/feed/friends?page=${page}&limit=${limit}`),
  friendList: () => request("/friends"),
  friendRequests: () => request("/friends/requests"),
  friendSuggestions: (limit = 20) => request(`/friends/suggestions?limit=${limit}`),
  mutualFriends: (userId) => request(`/friends/mutual/${userId}`),
  searchUsers: (q) => request(`/users/search?q=${encodeURIComponent(q)}`),
  sendRequest: (receiverId) =>
    request("/friends/request", {
      method: "POST",
      body: JSON.stringify({ receiverId })
    }),
  acceptRequest: (requestId) => request(`/friends/accept/${requestId}`, { method: "POST" }),
  rejectRequest: (requestId) => request(`/friends/reject/${requestId}`, { method: "POST" }),
  removeFriend: (friendId) => request(`/friends/${friendId}`, { method: "DELETE" }),
  friendshipStatus: (userId) => request(`/friends/status/${userId}`),
  messages: (friendId, cursor = null, limit = 30) => {
    const query = new URLSearchParams();
    query.set("limit", String(limit));
    if (cursor) {
      query.set("cursor", cursor);
    }
    return request(`/messages/${friendId}?${query.toString()}`);
  },
  unreadMessages: () => request("/messages/unread"),
  seenMessages: (friendId) =>
    request("/messages/seen", {
      method: "POST",
      body: JSON.stringify({ friendId })
    }),
  reactMessage: (messageId, reaction) =>
    request(`/messages/${messageId}/reactions`, {
      method: "POST",
      body: JSON.stringify({ reaction })
    }),
  removeReaction: (messageId) => request(`/messages/${messageId}/reactions`, { method: "DELETE" }),
  sendMessage: (friendId, message, extra = {}) =>
    request(`/messages/${friendId}`, {
      method: "POST",
      body: JSON.stringify({ message, ...extra })
    }),

  // Lists
  myLists: () => request("/lists/mine"),
  publicLists: (page = 1, limit = 12, q = "") =>
    request(`/lists/public?page=${page}&limit=${limit}&q=${encodeURIComponent(String(q || ""))}`),
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
  publicProfile: (username) => request(`/profile/${normalizeUsername(username)}`),
  updateProfile: (payload) =>
    request("/profile/me/update", { method: "PUT", body: JSON.stringify(payload) }),

  // Users profile endpoints
  userProfile: (username) => request(`/users/${normalizeUsername(username)}`),
  userWatched: (username) => request(`/users/${normalizeUsername(username)}/watched`),
  userReviews: (username) => request(`/users/${normalizeUsername(username)}/reviews`),
  userRatings: (username) => request(`/users/${normalizeUsername(username)}/ratings`),
  userWatchlist: (username) => request(`/users/${normalizeUsername(username)}/watchlist`),
  updateFavorites: (genres) =>
    request("/users/favorites", { method: "PUT", body: JSON.stringify({ genres }) }),
  uploadAvatar: (file) => {
    const body = new FormData();
    body.append("avatar", file);
    return request("/users/avatar", { method: "POST", body });
  },

  // Settings
  changeUsername: (payload) =>
    request("/auth/change-username", { method: "PUT", body: JSON.stringify(payload) }),
  changePassword: (payload) =>
    request("/auth/change-password", { method: "PUT", body: JSON.stringify(payload) }),

  // Admin
  adminOverview: () => request("/admin/overview"),
  adminUsers: (q = "", limit = 30) =>
    request(`/admin/users?q=${encodeURIComponent(String(q || ""))}&limit=${limit}`),
  adminBanUser: (userId, ban = true) =>
    request(`/admin/users/${userId}/ban`, {
      method: "PATCH",
      body: JSON.stringify({ ban })
    }),
  adminReviews: (q = "", limit = 40) =>
    request(`/admin/reviews?q=${encodeURIComponent(String(q || ""))}&limit=${limit}`),
  adminDeleteReview: (reviewId) => request(`/admin/reviews/${reviewId}`, { method: "DELETE" }),

  // Clubs
  createClub: (payload) => request("/clubs", { method: "POST", body: JSON.stringify(payload) }),
  joinClub: (clubId) => request(`/clubs/${clubId}/join`, { method: "POST" }),
  myClubs: () => request("/clubs/mine"),
  club: (clubId) => request(`/clubs/${clubId}`)
};
