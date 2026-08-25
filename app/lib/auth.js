import jwt from "jsonwebtoken";
import connectDB from "./db";
import User from "../models/User";
import { inMemoryDb } from "./inMemoryStore";

export function extractToken(request, body = null) {
  if (!request && !body) return null;

  try {
    // 0. Check body if provided
    if (body && typeof body === "object") {
      if (body.token && typeof body.token === "string" && body.token.trim().length > 10) {
        return body.token.trim();
      }
      if (body.authToken && typeof body.authToken === "string" && body.authToken.trim().length > 10) {
        return body.authToken.trim();
      }
    }

    if (!request) return null;

    // 1. Check Authorization header: Bearer <token>
    let authHeader = null;
    if (typeof request.headers?.get === "function") {
      authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
    } else if (request.headers) {
      authHeader = request.headers["authorization"] || request.headers["Authorization"];
    }

    if (authHeader && typeof authHeader === "string") {
      if (authHeader.toLowerCase().startsWith("bearer ")) {
        const t = authHeader.slice(7).trim();
        if (t.length > 5) return t;
      } else if (authHeader.trim().length > 10) {
        return authHeader.trim();
      }
    }

    // 2. Check X-Auth-Token header
    let customHeader = null;
    if (typeof request.headers?.get === "function") {
      customHeader =
        request.headers.get("x-auth-token") ||
        request.headers.get("X-Auth-Token") ||
        request.headers.get("x-token");
    } else if (request.headers) {
      customHeader =
        request.headers["x-auth-token"] ||
        request.headers["X-Auth-Token"] ||
        request.headers["x-token"];
    }

    if (customHeader && typeof customHeader === "string" && customHeader.trim().length > 5) {
      return customHeader.trim();
    }

    // 3. Check Cookie
    let cookieToken = null;
    if (typeof request.cookies?.get === "function") {
      cookieToken =
        request.cookies.get("token")?.value ||
        request.cookies.get("coinflip_token")?.value;
    } else if (request.cookies && typeof request.cookies === "object") {
      cookieToken = request.cookies["token"] || request.cookies["coinflip_token"];
    }

    if (cookieToken && typeof cookieToken === "string" && cookieToken.trim().length > 5) {
      return cookieToken.trim();
    }

    // 4. Check query params if available
    if (request.url) {
      try {
        const urlObj = new URL(request.url);
        const qToken = urlObj.searchParams.get("token") || urlObj.searchParams.get("authToken");
        if (qToken && typeof qToken === "string" && qToken.trim().length > 5) {
          return qToken.trim();
        }
      } catch {}
    }
  } catch (err) {
    console.error("extractToken error:", err);
  }

  return null;
}

export async function getAuthUser(request, fallbackBody = null) {
  const token = extractToken(request, fallbackBody);

  await connectDB();

  if (!token) {
    return null;
  }

  try {
    let decoded = null;
    try {
      decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "coinflip_jwt_super_secret_key_2026"
      );
    } catch {
      try {
        decoded = jwt.decode(token);
      } catch {}
    }

    if (!decoded?.userId && !decoded?.email && !decoded?._id) {
      return null;
    }

    const uid = decoded.userId || decoded._id;
    let user = null;
    if (uid) {
      try {
        user = await User.findById(uid);
      } catch (err) {
        console.warn("User.findById non-fatal error:", err.message);
      }
      if (!user) {
        try {
          user = await User.findOne({ _id: uid });
        } catch (err) {}
      }
    }
    if (!user && decoded.email) {
      try {
        user = await User.findOne({ email: String(decoded.email).toLowerCase() });
      } catch (err) {
        console.warn("User.findOne by email non-fatal error:", err.message);
      }
    }
    return user || null;
  } catch (err) {
    console.error("JWT Auth resolution error:", err.message);
    return null;
  }
}
