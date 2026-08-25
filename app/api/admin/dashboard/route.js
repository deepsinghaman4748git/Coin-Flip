import { NextResponse } from "next/server";
import { getAuthUser } from "../../../lib/auth";
import connectDB from "../../../lib/db";
import User from "../../../models/User";
import Transaction from "../../../models/Transaction";
import Game from "../../../models/Game";

export async function GET(request) {
  try {
    // ================================
    // AUTHENTICATION
    // ================================
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

    // ================================
    // DATABASE
    // ================================
    await connectDB();

    // ================================
    // BASIC COUNTS
    // ================================
    const [
      totalUsers,
      totalGames,

      totalDeposits,
      pendingDeposits,
      approvedDeposits,
      rejectedDeposits,

      totalWithdraws,
      pendingWithdraws,
      approvedWithdraws,
      rejectedWithdraws,

      wonGames,
      lostGames,
    ] = await Promise.all([
      User.countDocuments(),

      Game.countDocuments(),

      // Deposits
      Transaction.countDocuments({
        type: "deposit",
      }),

      Transaction.countDocuments({
        type: "deposit",
        status: "pending",
      }),

      Transaction.countDocuments({
        type: "deposit",
        status: {
          $in: ["approved", "completed"],
        },
      }),

      Transaction.countDocuments({
        type: "deposit",
        status: "rejected",
      }),

      // Withdrawals
      Transaction.countDocuments({
        type: "withdraw",
      }),

      Transaction.countDocuments({
        type: "withdraw",
        status: "pending",
      }),

      Transaction.countDocuments({
        type: "withdraw",
        status: "approved",
      }),

      Transaction.countDocuments({
        type: "withdraw",
        status: "rejected",
      }),

      // Games
      Game.countDocuments({
        status: "won",
      }),

      Game.countDocuments({
        status: "lost",
      }),
    ]);

    // ================================
    // DEPOSIT AMOUNTS
    // ================================
    const depositAmounts = await Transaction.aggregate([
      {
        $match: {
          type: "deposit",
          status: {
            $in: ["approved", "completed"],
          },
        },
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: "$amount",
          },
        },
      },
    ]);

    const pendingDepositAmounts = await Transaction.aggregate([
      {
        $match: {
          type: "deposit",
          status: "pending",
        },
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: "$amount",
          },
        },
      },
    ]);

    // ================================
    // WITHDRAW AMOUNTS
    // ================================
    const withdrawAmounts = await Transaction.aggregate([
      {
        $match: {
          type: "withdraw",
          status: "approved",
        },
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: "$amount",
          },
        },
      },
    ]);

    const pendingWithdrawAmounts = await Transaction.aggregate([
      {
        $match: {
          type: "withdraw",
          status: "pending",
        },
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: "$amount",
          },
        },
      },
    ]);

    // ================================
    // GAME AMOUNTS
    // ================================
    const gameAmounts = await Game.aggregate([
      {
        $group: {
          _id: null,

          totalEntry: {
            $sum: "$entryFee",
          },

          totalWin: {
            $sum: "$winAmount",
          },
        },
      },
    ]);

    // ================================
    // RECENT DEPOSITS
    // ================================
    const recentDeposits = await Transaction.find({
      type: "deposit",
    })
      .populate("user", "name email")
      .sort({
        createdAt: -1,
      })
      .limit(10)
      .lean();

    // ================================
    // RECENT WITHDRAWALS
    // ================================
    const recentWithdraws = await Transaction.find({
      type: "withdraw",
    })
      .populate("user", "name email")
      .sort({
        createdAt: -1,
      })
      .limit(10)
      .lean();

    // ================================
    // RECENT GAMES
    // ================================
    const recentGames = await Game.find({})
      .populate("user", "name email")
      .sort({
        createdAt: -1,
      })
      .limit(10)
      .lean();

    // ================================
    // CALCULATIONS
    // ================================
    const totalDepositAmount = Number(
      depositAmounts[0]?.total || 0
    );

    const totalPendingDepositAmount = Number(
      pendingDepositAmounts[0]?.total || 0
    );

    const totalWithdrawAmount = Number(
      withdrawAmounts[0]?.total || 0
    );

    const totalPendingWithdrawAmount = Number(
      pendingWithdrawAmounts[0]?.total || 0
    );

    const totalGameEntry = Number(
      gameAmounts[0]?.totalEntry || 0
    );

    const totalGameWin = Number(
      gameAmounts[0]?.totalWin || 0
    );

    const gameDifference =
      totalGameEntry - totalGameWin;

    // ================================
    // RESPONSE
    // ================================
    return NextResponse.json({
      success: true,

      stats: {
        // Users
        users: totalUsers,

        // Games
        games: totalGames,
        wonGames,
        lostGames,

        // Deposits
        deposits: totalDepositAmount,
        totalDeposits,

        pendingDeposits,
        pendingDepositAmount:
          totalPendingDepositAmount,

        approvedDeposits,
        rejectedDeposits,

        // Withdrawals
        withdraws: totalWithdrawAmount,
        totalWithdraws,

        pendingWithdraws,
        pendingWithdrawAmount:
          totalPendingWithdrawAmount,

        approvedWithdraws,
        rejectedWithdraws,

        // Games money
        totalGameEntry,
        totalGameWin,
        gameDifference,
      },

      recentDeposits,

      recentWithdraws,

      recentGames,
    });
  } catch (error) {
    console.error(
      "Admin Dashboard Error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load dashboard",
        error: error.message,
      },
      {
        status: 500,
      }
    );
  }
}