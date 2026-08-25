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
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    if (user.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          message: "Admin access required",
        },
        { status: 403 }
      );
    }

    await connectDB();

    const games = await Game.find({})
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    const totalGames = games.length;

    const wonGames = games.filter(
      (game) => game.status === "won"
    ).length;

    const lostGames = games.filter(
      (game) => game.status === "lost"
    ).length;

    const totalEntry = games.reduce(
      (total, game) =>
        total + Number(game.entryFee || 0),
      0
    );

    const totalPayout = games.reduce(
      (total, game) =>
        total + Number(game.winAmount || 0),
      0
    );

    return NextResponse.json({
      success: true,
      games,
      stats: {
        totalGames,
        wonGames,
        lostGames,
        totalEntry,
        totalPayout,
      },
    });
  } catch (error) {
    console.error("Admin Games Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load games",
        error: error.message,
      },
      { status: 500 }
    );
  }
}