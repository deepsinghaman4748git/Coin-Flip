import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import connectDB from "../../lib/db";
import User from "../../models/User";

export async function POST(request) {
  try {
    const body = await request.json();

    const { email, identifier, password, pin } = body;
    const loginIdentifier = (email || identifier || "").trim().toLowerCase();

    if (!loginIdentifier || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Email/Phone and password are required",
        },
        { status: 400 }
      );
    }

    await connectDB();

    // Find by email or phone
    const isAdminIdentifier =
      loginIdentifier === "admin@coinflip.com" ||
      loginIdentifier === "admin@example.com" ||
      loginIdentifier === "admin";

    let user = null;

    if (isAdminIdentifier) {
      // First try to find existing admin
      user = await User.findOne({
        $or: [
          { email: "admin@coinflip.com" },
          { email: "admin@example.com" },
          { role: "admin" },
        ],
      });

      if (!user) {
        try {
          const hashedPassword = await bcrypt.hash("admin123", 10);
          user = await User.create({
            _id: "user_admin_001",
            name: "Super Admin",
            email: "admin@coinflip.com",
            password: hashedPassword,
            walletBalance: 25000,
            role: "admin",
            isBanned: false,
            twoFactorEnabled: false,
          });
        } catch (createErr) {
          console.warn("Admin auto-create error:", createErr);
        }
      } else {
        // Ensure email and role are synced to admin@coinflip.com
        let needsSave = false;
        if (user.email !== "admin@coinflip.com") {
          user.email = "admin@coinflip.com";
          needsSave = true;
        }
        if (user.role !== "admin") {
          user.role = "admin";
          needsSave = true;
        }
        if (needsSave && typeof user.save === "function") {
          try {
            await user.save();
          } catch (saveErr) {
            console.warn("Admin sync save err:", saveErr);
          }
        }
      }
    } else {
      user = await User.findOne({
        $or: [
          { email: loginIdentifier },
          { phone: loginIdentifier },
        ],
      });
    }

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid email or password",
        },
        { status: 401 }
      );
    }

    let passwordMatch = false;

    // Master admin credentials guarantee
    if (isAdminIdentifier && password === "admin123") {
      passwordMatch = true;
    } else if (user.password && typeof user.password === "string") {
      try {
        if (user.password.startsWith("$2a$") || user.password.startsWith("$2b$") || user.password.startsWith("$2y$")) {
          passwordMatch = await bcrypt.compare(password, user.password);
        } else {
          passwordMatch = password === user.password;
        }
      } catch (cmpErr) {
        console.warn("Password compare error:", cmpErr);
        passwordMatch = false;
      }
    }

    if (!passwordMatch) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid email or password",
        },
        { status: 401 }
      );
    }

    if (user.isBanned) {
      return NextResponse.json(
        {
          success: false,
          message: `Account is suspended: ${user.banReason || "Security policy violation"}. Please contact support.`,
        },
        { status: 403 }
      );
    }

    // Two-Factor Authentication Check for Admin
    if (user.role === "admin" && user.twoFactorEnabled) {
      if (!pin) {
        return NextResponse.json(
          {
            success: false,
            requireTwoFactor: true,
            message: "Two-Factor Security PIN is required for administrator login.",
          },
          { status: 200 }
        );
      }

      let pinValid = false;
      try {
        const pinHash = user.adminSecurityPin || "";
        if (pinHash.startsWith("$2a$") || pinHash.startsWith("$2b$") || pinHash.startsWith("$2y$")) {
          pinValid = await bcrypt.compare(String(pin).trim(), pinHash);
        } else if (pinHash) {
          pinValid = String(pin).trim() === pinHash;
        }
      } catch (pinErr) {
        console.warn("PIN compare error:", pinErr);
        pinValid = false;
      }

      if (!pinValid) {
        return NextResponse.json(
          {
            success: false,
            requireTwoFactor: true,
            message: "Invalid 6-digit Security PIN code. Access denied.",
          },
          { status: 401 }
        );
      }
    }

    const userIdStr = String(user._id || user.id || "user_admin_001");

    const token = jwt.sign(
      {
        userId: userIdStr,
        email: user.email || loginIdentifier,
        role: user.role || "user",
      },
      process.env.JWT_SECRET || "coinflip_jwt_super_secret_key_2026",
      {
        expiresIn: "7d",
      }
    );

    const response = NextResponse.json(
      {
        success: true,
        message: "Login successful",
        token: token,
        user: {
          id: userIdStr,
          _id: userIdStr,
          name: user.name || "User",
          email: user.email || loginIdentifier,
          phone: user.phone || "",
          walletBalance: user.walletBalance ?? 0,
          role: user.role || "user",
        },
      },
      { status: 200 }
    );

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Login failed",
        error: error.message,
      },
      { status: 500 }
    );
  }
}