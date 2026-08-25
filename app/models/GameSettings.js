import mongoose from "mongoose";
import { getModel } from "../lib/modelWrapper.js";

const gameSettingsSchema = new mongoose.Schema(
  {
    // Game
    CoinFlipEnabled: {
      type: Boolean,
      default: true,
    },

    maintenanceMode: {
      type: Boolean,
      default: false,
    },

    maintenanceMessage: {
      type: String,
      default: "Game is temporarily under maintenance. Please try again later.",
    },

    // Betting
    minBet: {
      type: Number,
      default: 10,
    },

    maxBet: {
      type: Number,
      default: 10000,
    },

    payoutMultiplier: {
      type: Number,
      default: 2,
    },

    // Tie / Edge Match Feature
    tieEnabled: {
      type: Boolean,
      default: true,
    },

    tieProbabilityPercent: {
      type: Number,
      default: 8, // 8% chance of coin landing on TIE/Edge
    },

    tieMultiplier: {
      type: Number,
      default: 10, // 10x payout when user bets on TIE
    },

    // Speed Round / Decision Countdown Timer
    speedRoundEnabled: {
      type: Boolean,
      default: true,
    },

    speedRoundSeconds: {
      type: Number,
      default: 10, // 10s or 5s decision countdown
    },

    // Weather & Wind Factor Physics
    windPhysicsEnabled: {
      type: Boolean,
      default: true,
    },

    // Game Difficulty Preset ("normal", "hard", "extreme")
    gameDifficulty: {
      type: String,
      enum: ["normal", "hard", "extreme"],
      default: "hard",
    },

    // Wallet
    minDeposit: {
      type: Number,
      default: 10,
    },

    maxDeposit: {
      type: Number,
      default: 50000,
    },

    minWithdrawal: {
      type: Number,
      default: 100,
    },

    maxWithdrawal: {
      type: Number,
      default: 50000,
    },

    // Deposit
    depositEnabled: {
      type: Boolean,
      default: true,
    },

    upiId: {
      type: String,
      default: "",
    },

    qrCode: {
      type: String,
      default: "",
    },

    qrCodeType: {
      type: String,
      enum: ["auto_upi", "custom_upload", "both"],
      default: "both",
    },

    barcodeNumber: {
      type: String,
      default: "",
    },

    showQrBarcode: {
      type: Boolean,
      default: true,
    },

    depositInstructions: {
      type: String,
      default: "Pay using the provided UPI QR and submit your UTR number.",
    },

    // Withdrawal
    withdrawalEnabled: {
      type: Boolean,
      default: true,
    },

    manualWithdrawalApproval: {
      type: Boolean,
      default: true,
    },

    withdrawalMessage: {
      type: String,
      default: "Withdrawal requests are processed manually.",
    },

    // Website
    announcementEnabled: {
      type: Boolean,
      default: false,
    },

    announcement: {
      type: String,
      default: "",
    },

    supportContact: {
      type: String,
      default: "",
    },

    supportLink: {
      type: String,
      default: "",
    },

    // Security & Anti-Fraud
    antiFraudDuplicateUtrCheck: {
      type: Boolean,
      default: true,
    },

    autoFlagHighBets: {
      type: Boolean,
      default: true,
    },

    highBetThreshold: {
      type: Number,
      default: 2000,
    },

    maxDailyWithdrawalPerUser: {
      type: Number,
      default: 50000,
    },

    maxWinPerRound: {
      type: Number,
      default: 50000,
    },

    houseEdgePercent: {
      type: Number,
      default: 3,
    },

    merchantName: {
      type: String,
      default: "CoinFlip Pay",
    },

    backupUpiId: {
      type: String,
      default: "",
    },

    sessionTimeoutMinutes: {
      type: Number,
      default: 60,
    },

    // Welcome Bonus Settings
    welcomeBonusEnabled: {
      type: Boolean,
      default: true,
    },
    welcomeBonusPercentage: {
      type: Number,
      default: 100,
    },
    welcomeBonusMax: {
      type: Number,
      default: 5000,
    },

    // Daily Bonus & Spin Wheel Settings
    dailyBonusEnabled: {
      type: Boolean,
      default: true,
    },
    dailyBonusMin: {
      type: Number,
      default: 10,
    },
    dailyBonusMax: {
      type: Number,
      default: 50,
    },

    // Referral System Settings
    referralBonusEnabled: {
      type: Boolean,
      default: true,
    },
    referralBonusAmount: {
      type: Number,
      default: 25,
    },
    referralCommissionPercent: {
      type: Number,
      default: 5,
    },
  },
  {
    timestamps: true,
  }
);

const MongooseGameSettings =
  mongoose.models.GameSettings ||
  mongoose.model("GameSettings", gameSettingsSchema);

export default getModel("GameSettings", MongooseGameSettings);
