import crypto from "crypto";
import { NextResponse } from "next/server";
import { getAuthUser } from "../../../lib/auth";
import connectDB from "../../../lib/db";
import User from "../../../models/User";
import Transaction from "../../../models/Transaction";
import Game from "../../../models/Game";
import GameSettings from "../../../models/GameSettings";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const authUser = await getAuthUser(request, body);

    if (!authUser) {
      return NextResponse.json(
        {
          success: false,
          message: "Please login first",
        },
        { status: 401 }
      );
    }

    if (authUser.isBanned) {
      return NextResponse.json(
        {
          success: false,
          message: `Account is suspended: ${authUser.banReason || "Security policy violation"}.`,
        },
        { status: 403 }
      );
    }

    const prediction = String(body.prediction || "").toLowerCase();
    const entryFee = Number(body.entryFee);

    if (!["heads", "tails", "tie"].includes(prediction)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid prediction. Must be heads, tails, or tie.",
        },
        { status: 400 }
      );
    }

    if (!Number.isFinite(entryFee) || entryFee <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid entry fee",
        },
        { status: 400 }
      );
    }

    await connectDB();

    // Get current admin settings
    let settings = await GameSettings.findOne();

    if (!settings) {
      settings = await GameSettings.create({
        CoinFlipEnabled: true,
        maintenanceMode: false,
        minBet: 10,
        maxBet: 10000,
        payoutMultiplier: 2,
      });
    }

    const minBet = Number(settings.minBet ?? 10);
    const maxBet = Number(settings.maxBet ?? 10000);
    const payoutMultiplier = Number(
      settings.payoutMultiplier ?? 2
    );

    // Game enabled check
    if (settings.CoinFlipEnabled === false || settings.coinflipEnabled === false) {
      return NextResponse.json(
        {
          success: false,
          message: "CoinFlip game is currently disabled.",
        },
        { status: 403 }
      );
    }

    // Maintenance check
    if (settings.maintenanceMode) {
      return NextResponse.json(
        {
          success: false,
          message:
            "CoinFlip is currently under maintenance. Please try again later.",
        },
        { status: 503 }
      );
    }

    // Minimum bet check
    if (entryFee < minBet) {
      return NextResponse.json(
        {
          success: false,
          message: `Minimum entry fee is \u20B9${minBet}`,
        },
        { status: 400 }
      );
    }

    // Maximum bet check
    if (entryFee > maxBet) {
      return NextResponse.json(
        {
          success: false,
          message: `Maximum entry fee is \u20B9${maxBet}`,
        },
        { status: 400 }
      );
    }

    // Payout validation
    if (
      !Number.isFinite(payoutMultiplier) ||
      payoutMultiplier < 1
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid payout configuration.",
        },
        { status: 500 }
      );
    }

    // Atomically deduct entry fee
    const user = await User.findOneAndUpdate(
      {
        _id: authUser._id,
        walletBalance: { $gte: entryFee },
      },
      {
        $inc: {
          walletBalance: -entryFee,
        },
      },
      {
        returnDocument: "after",
      }
    );

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Insufficient wallet balance",
        },
        { status: 400 }
      );
    }

    // Generate result on server
    const tieEnabled = settings.tieEnabled !== false;
    const tieProbability = Math.max(0, Math.min(30, Number(settings.tieProbabilityPercent ?? 8)));
    const tieMultiplier = Math.max(2, Number(settings.tieMultiplier ?? 10));
    const difficulty = settings.gameDifficulty || "hard";
    const houseEdge = Math.max(0, Math.min(25, Number(settings.houseEdgePercent ?? 3)));

    // Extra house edge based on difficulty preset
    const difficultyExtraEdge =
      difficulty === "extreme" ? 8 : difficulty === "hard" ? 4 : 0;
    const totalEdge = Math.min(35, houseEdge + difficultyExtraEdge);

    let result = "heads";
    const roll = crypto.randomInt(0, 100);

    if (tieEnabled && roll < tieProbability) {
      result = "tie";
    } else {
      // Check if house edge triggers
      const edgeRoll = crypto.randomInt(0, 100);
      if (edgeRoll < totalEdge) {
        // House advantage: Pick opposite of user prediction (or tie)
        if (prediction === "heads") {
          result = "tails";
        } else if (prediction === "tails") {
          result = "heads";
        } else {
          result = crypto.randomInt(0, 2) === 0 ? "heads" : "tails";
        }
      } else {
        // Natural 50/50 fair roll
        result = crypto.randomInt(0, 2) === 0 ? "heads" : "tails";
      }
    }

    // Weather & Wind dynamic physics simulation
    const windConditions = [
      { weather: "Calm Air", speedKmh: 6, direction: "East", icon: "🍃", spinDurationMs: 1400, tilt: 5, intensity: "low" },
      { weather: "Crosswind Gust", speedKmh: 24, direction: "West-North", icon: "💨", spinDurationMs: 1800, tilt: 18, intensity: "medium" },
      { weather: "Stormy Gale", speedKmh: 48, direction: "North-West", icon: "🌪️", spinDurationMs: 2200, tilt: -24, intensity: "high" },
      { weather: "Thunder Cyclone", speedKmh: 75, direction: "Vortex Spiral", icon: "⚡", spinDurationMs: 2600, tilt: 32, intensity: "extreme" },
    ];
    const chosenWind = windConditions[crypto.randomInt(0, windConditions.length)];

    const won = prediction === result;

    // Dynamic payout from admin settings
    let effectiveMultiplier = payoutMultiplier;
    if (prediction === "tie") {
      effectiveMultiplier = tieMultiplier;
    }

    const winAmount = won
      ? Number((entryFee * effectiveMultiplier).toFixed(2))
      : 0;

    // Add winnings
    if (won) {
      user.walletBalance += winAmount;
      await user.save();
    }

    // Save game
    const game = await Game.create({
      user: user._id,
      gameType: "CoinFlip",
      prediction,
      result,
      entryFee,
      winAmount,
      status: won ? "won" : "lost",
    });

    // Entry transaction
    await Transaction.create({
      user: user._id,
      type: "game_entry",
      amount: entryFee,
      status: "completed",
      paymentMethod: "wallet",
      note: "CoinFlip game entry",
    });

    // Winning transaction
    if (won) {
      await Transaction.create({
        user: user._id,
        type: "game_win",
        amount: winAmount,
        status: "completed",
        paymentMethod: "wallet",
        note: "CoinFlip winning payout",
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: won
          ? "Congratulations! You won."
          : "You lost this round.",
        game: {
          id: game._id,
          prediction,
          result,
          entryFee,
          winAmount,
          status: game.status,
          wind: chosenWind,
          difficulty,
        },
        walletBalance: user.walletBalance,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "CoinFlip Game Error:",
      error
    );

    return NextResponse.json(
  {
    success: false,
    message: "Unable to play CoinFlip",
  },
  { status: 500 }
);
  }
}

