import mongoose from "mongoose";
import { getModel } from "../lib/modelWrapper.js";

const TransactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    type: {
      type: String,
      enum: [
        "deposit",
        "withdraw",
        "game_entry",
        "game_win",
        "game_loss",
        "refund",
        "bonus",
        "daily_bonus",
        "welcome_bonus",
        "referral_bonus",
      ],
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      enum: [
        "pending",
        "approved",
        "rejected",
        "completed",
      ],
      default: "pending",
    },

    paymentMethod: {
      type: String,
      default: "manual",
      trim: true,
    },

    utr: {
      type: String,
      default: "",
      trim: true,
    },

    screenshot: {
      type: String,
      default: "",
    },

    upiId: {
      type: String,
      default: "",
      trim: true,
    },

    note: {
      type: String,
      default: "",
      trim: true,
    },

    // Admin processing information
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    adminNote: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const MongooseTransaction =
  mongoose.models.Transaction ||
  mongoose.model("Transaction", TransactionSchema);

export default getModel("Transaction", MongooseTransaction);
