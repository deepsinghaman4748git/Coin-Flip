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
    const user = await User.findOne({
      $or: [
        { email: loginIdentifier },
        { phone: loginIdentifier },
      ],
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid email or password",
        },
        { status: 401 }
      );
    }

    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

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

      const pinValid = await bcrypt.compare(String(pin).trim(), user.adminSecurityPin || "");
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

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
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
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone || "",
          walletBalance: user.walletBalance,
          role: user.role,
        },
      },
      { status: 200 }
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