import mongoose from "mongoose";
import { getModel } from "../lib/modelWrapper.js";

const GameSchema = new mongoose.Schema(
  {
    _id: {
      type: mongoose.Schema.Types.Mixed,
    },

    user: {
      type: mongoose.Schema.Types.Mixed,
      ref: "User",
      required: true,
    },

    gameType: {
      type: String,
      enum: ["CoinFlip"],
      required: true,
    },

    prediction: {
      type: String,
      enum: ["heads", "tails", "tie"],
      required: true,
    },

    result: {
      type: String,
      enum: ["heads", "tails", "tie"],
      required: true,
    },

    entryFee: {
      type: Number,
      required: true,
      min: 0,
    },

    winAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    status: {
      type: String,
      enum: ["won", "lost"],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const MongooseGame = mongoose.models.Game || mongoose.model("Game", GameSchema);
export default getModel("Game", MongooseGame);
