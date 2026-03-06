const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000/api";

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
  profileRatings: (userId) => request(`/ratings/users/${userId}`),
  feed: () => request("/feed/activity"),
  friendList: () => request("/friends/list"),
  friendRequests: () => request("/friends/requests"),
  sendRequest: (friendId) => request(`/friends/request/${friendId}`, { method: "POST" }),
  acceptRequest: (friendId) => request(`/friends/accept/${friendId}`, { method: "POST" }),
  messages: (friendId) => request(`/messages/${friendId}`),
  sendMessage: (friendId, message) =>
    request(`/messages/${friendId}`, {
      method: "POST",
      body: JSON.stringify({ message })
    })
};
