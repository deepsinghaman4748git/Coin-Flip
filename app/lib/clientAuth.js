"use client";

export function getAuthToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("coinflip_token");
}

export function setAuthSession(token, user) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem("coinflip_token", token);
  if (user) localStorage.setItem("coinflip_user", JSON.stringify(user));
}

export function clearAuthSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("coinflip_token");
  localStorage.removeItem("coinflip_user");
}

export async function authFetch(url, options = {}) {
  const token = getAuthToken();
  const headers = {
    ...(options.headers || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
    headers["x-auth-token"] = token;
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });
}

export async function safeJson(response) {
  if (!response) return null;
  try {
    const text = await response.text();
    if (text && (text.startsWith("{") || text.startsWith("["))) {
      return JSON.parse(text);
    }
    return null;
  } catch {
    return null;
  }
}
