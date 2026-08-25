import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import connectDB from "../../lib/db";
import User from "../../models/User";

export async function POST(request) {
  try {
    const body = await request.json();

    const { name, email, password, phone } = body;

    // Validate fields
    if (!name || !email || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Name, email and password are required",
        },
        { status: 400 }
      );
    }

    // Password length
    if (password.length < 6) {
      return NextResponse.json(
        {
          success: false,
          message: "Password must be at least 6 characters",
        },
        { status: 400 }
      );
    }

    // Connect MongoDB
    await connectDB();

    // Check existing user
    const existingUser = await User.findOne({
      email: email.toLowerCase(),
    });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          message: "User already exists",
        },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate unique referral code (e.g. CF + 6 uppercase chars)
    const referralCode = "CF" + Math.random().toString(36).substring(2, 8).toUpperCase();

    // Check if valid referredBy was passed
    let validReferredBy = "";
    if (body.referralCode || body.referredBy) {
      const codeToMatch = String(body.referralCode || body.referredBy).trim().toUpperCase();
      const referrerUser = await User.findOne({ referralCode: codeToMatch });
      if (referrerUser) {
        validReferredBy = codeToMatch;
      }
    }

    // Create user
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone ? String(phone).trim() : "",
      password: hashedPassword,
      walletBalance: 0,
      role: "user",
      referralCode: referralCode,
      referredBy: validReferredBy,
      referralEarnings: 0,
      dailyBonusStreak: 0,
      totalDailyBonusClaimed: 0,
      hasClaimedWelcomeBonus: false,
      firstDepositDone: false,
    });

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET || "coinflip_jwt_super_secret_key_2026",
      { expiresIn: "7d" }
    );

    const response = NextResponse.json(
      {
        success: true,
        message: "Registration successful",
        token: token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone || "",
          walletBalance: user.walletBalance,
          role: user.role,
        },
      },
      { status: 201 }
    );

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Register Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Registration failed",
        error: error.message,
      },
      { status: 500 }
    );
  }
}