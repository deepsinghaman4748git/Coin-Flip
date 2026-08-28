import { NextResponse } from "next/server";
import connectDB from "../../../lib/db";
import GameSettings from "../../../models/GameSettings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDB();

    let settings = await GameSettings.findOne().lean();

    if (!settings) {
      settings = await GameSettings.create({});
      settings = settings.toObject();
    }

    return NextResponse.json(
      {
        success: true,
        settings: {
          CoinFlipEnabled:
            settings.CoinFlipEnabled !== false &&
            settings.coinflipEnabled !== false,
          coinflipEnabled:
            settings.CoinFlipEnabled !== false &&
            settings.coinflipEnabled !== false,

          maintenanceMode:
            settings.maintenanceMode === true,

          maintenanceMessage:
            settings.maintenanceMessage ||
            "Game is temporarily under maintenance. Please try again later.",

          minBet: Number(settings.minBet ?? 10),

          maxBet: Number(settings.maxBet ?? 10000),

          payoutMultiplier:
            Number(settings.payoutMultiplier ?? 1.8),

          tieEnabled: settings.tieEnabled !== false,
          tieProbabilityPercent: Number(settings.tieProbabilityPercent ?? 8),
          tieMultiplier: Number(settings.tieMultiplier ?? 10),

          speedRoundEnabled: settings.speedRoundEnabled !== false,
          speedRoundSeconds: Number(settings.speedRoundSeconds ?? 10),
          windPhysicsEnabled: settings.windPhysicsEnabled !== false,
          gameDifficulty: settings.gameDifficulty || "hard",

          upiId: settings.upiId || "",
          backupUpiId: settings.backupUpiId || "",
          merchantName: settings.merchantName || "CoinFlip Official",
          depositEnabled: settings.depositEnabled !== false,
          qrCode: settings.qrCode || "",
          qrCodeType: settings.qrCodeType || "both",
          barcodeNumber: settings.barcodeNumber || "",
          showQrBarcode: settings.showQrBarcode !== false,
          depositInstructions: settings.depositInstructions || "",
          minDeposit: Number(settings.minDeposit ?? 10),
          maxDeposit: Number(settings.maxDeposit ?? 50000),
          minWithdrawal: Number(settings.minWithdrawal ?? 100),
          maxWithdrawal: Number(settings.maxWithdrawal ?? 50000),

          announcementEnabled: settings.announcementEnabled === true,
          announcement: settings.announcement || "",
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error(
      "Game Settings GET Error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load game settings",
      },
      { status: 500 }
    );
  }
}