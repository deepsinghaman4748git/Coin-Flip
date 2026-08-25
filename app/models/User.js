import mongoose from "mongoose";
import { getModel } from "../lib/modelWrapper.js";

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      default: "",
      trim: true,
    },

    resetOtp: {
      type: String,
      default: "",
    },

    resetOtpExpires: {
      type: Date,
      default: null,
    },

    password: {
      type: String,
      required: true,
    },

    walletBalance: {
      type: Number,
      default: 0,
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    // Referral System
    referralCode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },

    referredBy: {
      type: String,
      default: "",
      trim: true,
    },

    referralEarnings: {
      type: Number,
      default: 0,
    },

    // Daily Bonus & Check-in
    lastDailyBonusClaim: {
      type: Date,
      default: null,
    },

    lastDailyBonusDate: {
      type: String,
      default: "",
    },

    dailyBonusStreak: {
      type: Number,
      default: 0,
    },

    totalDailyBonusClaimed: {
      type: Number,
      default: 0,
    },

    // Welcome Bonus
    hasClaimedWelcomeBonus: {
      type: Boolean,
      default: false,
    },

    firstDepositDone: {
      type: Boolean,
      default: false,
    },

    // Security & Account Status
    isBanned: {
      type: Boolean,
      default: false,
    },

    banReason: {
      type: String,
      default: "",
    },

    // Same-Account UPI Security Lock (User can only withdraw to the verified deposit UPI)
    linkedUpiId: {
      type: String,
      default: "",
      trim: true,
    },

    isUpiLocked: {
      type: Boolean,
      default: false,
    },

    depositUpiHistory: {
      type: [String],
      default: [],
    },

    // 2FA / Security PIN for Admin
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },

    adminSecurityPin: {
      type: String,
      default: "",
    },

    passwordChangedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const MongooseUser = mongoose.models.User || mongoose.model("User", UserSchema);
export default getModel("User", MongooseUser);
