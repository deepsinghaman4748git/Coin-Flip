import { NextResponse } from "next/server";
import { getAuthUser } from "../../../lib/auth";
import connectDB from "../../../lib/db";
import GameSettings from "../../../models/GameSettings";

async function checkAdmin(request) {
  const user = await getAuthUser(request);
  if (!user || user.role !== "admin") return null;
  return user;
}

export async function GET(request) {
  try {
    const decoded = await checkAdmin(request);

    if (!decoded || decoded.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    await connectDB();

    let settings = await GameSettings.findOne();

    if (!settings) {
      settings = await GameSettings.create({});
    }

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error("Admin Settings GET Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load settings",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const decoded = await checkAdmin(request);

    if (!decoded || decoded.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    await connectDB();

    const body = await request.json();

    const minBet = Number(body.minBet);
    const maxBet = Number(body.maxBet);
    const payoutMultiplier = Number(body.payoutMultiplier);

    const minDeposit = Number(body.minDeposit);
    const maxDeposit = Number(body.maxDeposit);
    const minWithdrawal = Number(body.minWithdrawal);
    const maxWithdrawal = Number(body.maxWithdrawal);

    if (!Number.isFinite(minBet) || minBet < 1) {
      return NextResponse.json(
        { success: false, message: "Minimum bet must be at least ₹1" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(maxBet) || maxBet < minBet) {
      return NextResponse.json(
        {
          success: false,
          message: "Maximum bet must be greater than minimum bet",
        },
        { status: 400 }
      );
    }

    if (!Number.isFinite(payoutMultiplier) || payoutMultiplier < 1) {
      return NextResponse.json(
        {
          success: false,
          message: "Payout multiplier must be at least 1",
        },
        { status: 400 }
      );
    }

    if (!Number.isFinite(minDeposit) || minDeposit < 1) {
      return NextResponse.json(
        {
          success: false,
          message: "Minimum deposit must be at least ₹1",
        },
        { status: 400 }
      );
    }

    if (!Number.isFinite(maxDeposit) || maxDeposit < minDeposit) {
      return NextResponse.json(
        {
          success: false,
          message: "Maximum deposit must be greater than minimum deposit",
        },
        { status: 400 }
      );
    }

    if (!Number.isFinite(minWithdrawal) || minWithdrawal < 1) {
      return NextResponse.json(
        {
          success: false,
          message: "Minimum withdrawal must be at least ₹1",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isFinite(maxWithdrawal) ||
      maxWithdrawal < minWithdrawal
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Maximum withdrawal must be greater than minimum withdrawal",
        },
        { status: 400 }
      );
    }

    const settings = await GameSettings.findOneAndUpdate(
      {},
      {
        CoinFlipEnabled: body.CoinFlipEnabled !== false,
        maintenanceMode: body.maintenanceMode === true,

        maintenanceMessage:
          body.maintenanceMessage ||
          "Game is temporarily under maintenance. Please try again later.",

        minBet,
        maxBet,
        payoutMultiplier,
        tieEnabled: body.tieEnabled !== false,
        tieProbabilityPercent: Number(body.tieProbabilityPercent) || 8,
        tieMultiplier: Number(body.tieMultiplier) || 10,
        speedRoundEnabled: body.speedRoundEnabled !== false,
        speedRoundSeconds: Number(body.speedRoundSeconds) || 10,
        windPhysicsEnabled: body.windPhysicsEnabled !== false,
        gameDifficulty: ["normal", "hard", "extreme"].includes(body.gameDifficulty) ? body.gameDifficulty : "hard",
        maxWinPerRound: Number(body.maxWinPerRound) || 50000,
        houseEdgePercent: Number(body.houseEdgePercent) || 3,

        minDeposit,
        maxDeposit,
        minWithdrawal,
        maxWithdrawal,
        maxDailyWithdrawalPerUser: Number(body.maxDailyWithdrawalPerUser) || 50000,

        depositEnabled: body.depositEnabled !== false,
        upiId: String(body.upiId || ""),
        backupUpiId: String(body.backupUpiId || ""),
        merchantName: String(body.merchantName || "CoinFlip Pay"),
        qrCode: String(body.qrCode || ""),
        qrCodeType: ["auto_upi", "custom_upload", "both"].includes(body.qrCodeType) ? body.qrCodeType : "both",
        barcodeNumber: String(body.barcodeNumber || ""),
        showQrBarcode: body.showQrBarcode !== false,
        depositInstructions: String(
          body.depositInstructions ||
            "Pay using the provided UPI QR and submit your UTR number."
        ),

        withdrawalEnabled: body.withdrawalEnabled !== false,
        manualWithdrawalApproval:
          body.manualWithdrawalApproval !== false,
        withdrawalMessage: String(
          body.withdrawalMessage ||
            "Withdrawal requests are processed manually."
        ),

        // Security & Anti-Fraud
        antiFraudDuplicateUtrCheck: body.antiFraudDuplicateUtrCheck !== false,
        autoFlagHighBets: body.autoFlagHighBets !== false,
        highBetThreshold: Number(body.highBetThreshold) || 2000,
        sessionTimeoutMinutes: Number(body.sessionTimeoutMinutes) || 60,

        // Rewards & Bonuses
        dailyBonusEnabled: body.dailyBonusEnabled !== false,
        dailyBonusMin: Number(body.dailyBonusMin) || 10,
        dailyBonusMax: Number(body.dailyBonusMax) || 50,

        welcomeBonusEnabled: body.welcomeBonusEnabled !== false,
        welcomeBonusPercentage: Number(body.welcomeBonusPercentage) || 100,
        welcomeBonusMax: Number(body.welcomeBonusMax) || 5000,

        referralBonusEnabled: body.referralBonusEnabled !== false,
        referralCommissionPercent: Number(body.referralCommissionPercent) || 5,
        referralBonusAmount: Number(body.referralBonusAmount) || 25,

        announcementEnabled:
          body.announcementEnabled === true,
        announcement: String(body.announcement || ""),

        supportContact: String(body.supportContact || ""),
        supportLink: String(body.supportLink || ""),
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    return NextResponse.json({
      success: true,
      message: "Settings saved successfully",
      settings,
    });
  } catch (error) {
    console.error("Admin Settings PUT Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to save settings",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

