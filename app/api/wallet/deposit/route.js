import { NextResponse } from "next/server";
import { getAuthUser } from "../../../lib/auth";
import connectDB from "../../../lib/db";
import User from "../../../models/User";
import Transaction from "../../../models/Transaction";
import GameSettings from "../../../models/GameSettings";

export async function POST(request) {
  try {
    // =========================
    // 1. CHECK LOGIN
    // =========================
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

    // =========================
    // 3. READ BODY
    // =========================
    const body = await request.json();

    const amount = Number(body.amount);
    const utr = String(body.utr || "").trim();
    const upiId = String(body.upiId || "").trim();
    const note = String(body.note || "").trim();
    const screenshot = String(body.screenshot || "").trim();

    // =========================
    // 4. VALIDATE AMOUNT
    // =========================
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Please enter a valid deposit amount",
        },
        { status: 400 }
      );
    }

    // Only allow up to 2 decimal places
    if (Math.round(amount * 100) !== amount * 100) {
      return NextResponse.json(
        {
          success: false,
          message: "Deposit amount can have maximum 2 decimal places",
        },
        { status: 400 }
      );
    }

    // =========================
    // 5. DATABASE
    // =========================
    await connectDB();

    // =========================
    // 6. LOAD SETTINGS
    // =========================
    let settings = await GameSettings.findOne().lean();

    // Create default settings if missing
    if (!settings) {
      settings = await GameSettings.create({
        CoinFlipEnabled: true,
        maintenanceMode: false,
        maintenanceMessage:
          "Game is temporarily under maintenance. Please try again later.",

        minBet: 10,
        maxBet: 10000,
        payoutMultiplier: 2,

        minDeposit: 10,
        maxDeposit: 50000,

        depositEnabled: true,

        minWithdrawal: 100,
        maxWithdrawal: 50000,

        withdrawalEnabled: true,
        manualWithdrawalApproval: true,
      });

      settings = settings.toObject();
    }

    // =========================
    // 7. CHECK DEPOSITS ENABLED
    // =========================
    if (settings.depositEnabled === false) {
      return NextResponse.json(
        {
          success: false,
          message: "Deposits are currently disabled.",
        },
        { status: 403 }
      );
    }

    // =========================
    // 8. MIN / MAX DEPOSIT
    // =========================
    const minDeposit = Number(settings.minDeposit ?? 10);
    const maxDeposit = Number(settings.maxDeposit ?? 50000);

    if (amount < minDeposit) {
      return NextResponse.json(
        {
          success: false,
          message: `Minimum deposit amount is â‚¹${minDeposit}`,
        },
        { status: 400 }
      );
    }

    if (amount > maxDeposit) {
      return NextResponse.json(
        {
          success: false,
          message: `Maximum deposit amount is â‚¹${maxDeposit}`,
        },
        { status: 400 }
      );
    }

    // =========================
    // 10. UTR VALIDATION
    // =========================
    if (!utr) {
      return NextResponse.json(
        {
          success: false,
          message: "UTR number is required",
        },
        { status: 400 }
      );
    }

    if (utr.length < 6 || utr.length > 50) {
      return NextResponse.json(
        {
          success: false,
          message: "Please enter a valid UTR number",
        },
        { status: 400 }
      );
    }

    // =========================
    // 11. DUPLICATE UTR CHECK
    // =========================
    const existingTransaction = await Transaction.findOne({
      type: "deposit",
      utr: utr,
      status: {
        $in: ["pending", "approved"],
      },
    });

    if (existingTransaction) {
      return NextResponse.json(
        {
          success: false,
          message: "This UTR has already been submitted.",
        },
        { status: 409 }
      );
    }

    // =========================
    // 12. CREATE PENDING DEPOSIT
    // =========================
    const transaction = await Transaction.create({
      user: user._id,
      type: "deposit",
      amount: amount,
      status: "pending",
      paymentMethod: "manual",
      utr: utr,
      upiId: upiId,
      screenshot: screenshot,
      note: note,
    });

    // =========================
    // 13. RESPONSE
    // =========================
    return NextResponse.json(
      {
        success: true,
        message:
          "Deposit request submitted successfully. Please wait for admin approval.",
        transaction: {
          id: transaction._id,
          amount: transaction.amount,
          status: transaction.status,
          utr: transaction.utr,
          upiId: transaction.upiId,
          createdAt: transaction.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Deposit Request Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to submit deposit request",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
