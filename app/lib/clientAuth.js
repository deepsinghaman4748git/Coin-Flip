"use client";

export function getAuthToken() {
  if (typeof window === "undefined") return null;
  try {
    const local = localStorage.getItem("coinflip_token");
    if (local && local !== "undefined" && local !== "null") return local;
    const session = sessionStorage.getItem("coinflip_token");
    if (session && session !== "undefined" && session !== "null") return session;
  } catch (e) {
    console.warn("Storage access warning:", e);
  }
  return null;
}

export function setAuthSession(token, user) {
  if (typeof window === "undefined") return;
  try {
    if (token) {
      localStorage.setItem("coinflip_token", token);
      sessionStorage.setItem("coinflip_token", token);
    }
    if (user) {
      localStorage.setItem("coinflip_user", JSON.stringify(user));
      sessionStorage.setItem("coinflip_user", JSON.stringify(user));
    }
  } catch (e) {
    console.warn("Set session storage warning:", e);
  }
}

export function clearAuthSession() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem("coinflip_token");
    localStorage.removeItem("coinflip_user");
    sessionStorage.removeItem("coinflip_token");
    sessionStorage.removeItem("coinflip_user");
  } catch (e) {
    console.warn("Clear session storage warning:", e);
  }
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
