import jwt from "jsonwebtoken";
import connectDB from "./db";
import User from "../models/User";
import { inMemoryDb } from "./inMemoryStore";

export function extractToken(request) {
  if (!request) return null;

  try {
    // 1. Check Authorization header: Bearer <token>
    let authHeader = null;
    if (typeof request.headers?.get === "function") {
      authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
    } else if (request.headers) {
      authHeader = request.headers["authorization"] || request.headers["Authorization"];
    }

    if (authHeader && typeof authHeader === "string" && authHeader.toLowerCase().startsWith("bearer ")) {
      return authHeader.slice(7).trim();
    }

    // 2. Check X-Auth-Token header
    let customHeader = null;
    if (typeof request.headers?.get === "function") {
      customHeader = request.headers.get("x-auth-token") || request.headers.get("X-Auth-Token");
    } else if (request.headers) {
      customHeader = request.headers["x-auth-token"] || request.headers["X-Auth-Token"];
    }

    if (customHeader && typeof customHeader === "string") {
      return customHeader.trim();
    }

    // 3. Check Cookie
    let cookieToken = null;
    if (typeof request.cookies?.get === "function") {
      cookieToken = request.cookies.get("token")?.value;
    } else if (request.cookies && typeof request.cookies === "object") {
      cookieToken = request.cookies["token"];
    }

    if (cookieToken && typeof cookieToken === "string") {
      return cookieToken.trim();
    }
  } catch (err) {
    console.error("extractToken error:", err);
  }

  return null;
}

export async function getAuthUser(request) {
  const token = extractToken(request);

  await connectDB();

  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "coinflip_jwt_super_secret_key_2026"
    );

    if (!decoded?.userId) {
      return null;
    }

    const user = await User.findById(decoded.userId);
    return user || null;
  } catch (err) {
    console.error("JWT Verify Error:", err.message);
    return null;
  }
}
