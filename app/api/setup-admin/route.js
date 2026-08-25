import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "../../lib/db";
import User from "../../models/User";

export async function POST(request) {
  try {
    const setupKey = request.headers.get("x-setup-key");

    if (!setupKey || setupKey !== process.env.ADMIN_SETUP_KEY) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    await connectDB();

    const email = "admin@CoinFlip.com";
    const password = "admin123";

    let user = await User.findOne({ email });

    const hashedPassword = await bcrypt.hash(password, 12);

    if (user) {
      user.password = hashedPassword;
      user.role = "admin";
      await user.save();

      return NextResponse.json({
        success: true,
        message: "Existing user promoted to admin successfully",
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    }

    user = await User.create({
      name: "CoinFlip Admin",
      email,
      password: hashedPassword,
      walletBalance: 0,
      role: "admin",
    });

    return NextResponse.json(
      {
        success: true,
        message: "Admin account created successfully",
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Setup Admin Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to setup admin",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
