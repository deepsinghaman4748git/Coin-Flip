import mongoose from "mongoose";
import { getModel } from "../lib/modelWrapper.js";

const WithdrawSchema = new mongoose.Schema(
  {
    _id: {
      type: mongoose.Schema.Types.Mixed,
    },

    user: {
      type: mongoose.Schema.Types.Mixed,
      ref: "User",
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 1,
    },

    upiId: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    note: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const MongooseWithdraw =
  mongoose.models.Withdraw ||
  mongoose.model("Withdraw", WithdrawSchema);

export default getModel("Withdraw", MongooseWithdraw);
