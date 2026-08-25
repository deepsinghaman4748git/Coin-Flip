import mongoose from "mongoose";

// Ensure JWT secret has a safe default for development/preview
process.env.JWT_SECRET = process.env.JWT_SECRET || "coinflip_jwt_secret_ai_studio_2026";

const MONGODB_URI = process.env.MONGODB_URI;

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = {
    conn: null,
    promise: null,
  };
}

export default async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!MONGODB_URI) {
    // When MONGODB_URI is not provided, the app seamlessly runs using the in-memory fallback layer
    return null;
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        bufferCommands: false,
      })
      .then((m) => {
        console.log("Connected to MongoDB successfully");
        return m;
      })
      .catch((err) => {
        console.warn("MongoDB connection not available, operating with in-memory fallback:", err.message);
        return null;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    return null;
  }

  return cached.conn;
}
