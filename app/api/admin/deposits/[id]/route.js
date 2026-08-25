import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import connectDB from "../../../../lib/db";
import Transaction from "../../../../models/Transaction";
import User from "../../../../models/User";

async function verifyAdmin(request) {
  const token = request.cookies.get("token")?.value;

  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    if (decoded.role !== "admin") {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}

export async function PATCH(request, { params }) {
  try {
    const admin = await verifyAdmin(request);

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message: "Admin authentication required",
        },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    const action = body.action;

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid action",
        },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid deposit ID",
        },
        { status: 400 }
      );
    }

    await connectDB();

    const transaction = await Transaction.findById(id);

    if (!transaction) {
      return NextResponse.json(
        {
          success: false,
          message: "Deposit request not found",
        },
        { status: 404 }
      );
    }

    // Prevent double processing
    if (transaction.status !== "pending") {
      return NextResponse.json(
        {
          success: false,
          message: `Deposit is already ${transaction.status}`,
        },
        { status: 400 }
      );
    }

    // REJECT
    if (action === "reject") {
      transaction.status = "rejected";

      await transaction.save();

      return NextResponse.json(
        {
          success: true,
          message: "Deposit rejected successfully",
          transaction,
        },
        { status: 200 }
      );
    }

    // APPROVE
    const user = await User.findById(transaction.user);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found",
        },
        { status: 404 }
      );
    }

    const amount = Number(transaction.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid deposit amount",
        },
        { status: 400 }
      );
    }

    // Add money to wallet
    user.walletBalance =
      Number(user.walletBalance || 0) + amount;

    await user.save();

    // Mark transaction approved
    transaction.status = "approved";

    await transaction.save();

    return NextResponse.json(
      {
        success: true,
        message: "Deposit approved and wallet credited",
        transaction,
        walletBalance: user.walletBalance,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Deposit action error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to process deposit",
        error: error.message,
      },
      { status: 500 }
    );
  }
}