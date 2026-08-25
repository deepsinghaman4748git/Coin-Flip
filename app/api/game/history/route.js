import { NextResponse } from "next/server";
import { getAuthUser } from "../../../lib/auth";
import connectDB from "../../../lib/db";
import Game from "../../../models/Game";

export async function GET(request) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Please login first",
        },
        { status: 401 }
      );
    }

    await connectDB();

    const games = await Game.find({
      user: user._id,
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({
      success: true,
      games,
    });
  } catch (error) {
    console.error("Game History Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load game history",
        error: error.message,
      },
      { status: 500 }
    );
  }
}