import { NextResponse } from "next/server";
import { getAuthUser } from "../../lib/auth";
import connectDB from "../../lib/db";
import User from "../../models/User";
import Transaction from "../../models/Transaction";
import GameSettings from "../../models/GameSettings";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const authUser = await getAuthUser(request, body);

    if (!authUser) {
      return NextResponse.json(
        {
          success: false,
          message: "Please login first",
        },
        { status: 401 }
      );
    }

    const amount = Number(body.amount);
    const utr = (body.utr || body.utrNumber || "").trim();
    const paymentMethod = body.paymentMethod || "upi";

    if (!amount || amount <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Please enter a valid amount",
        },
        { status: 400 }
      );
    }

    if (amount < 10) {
      return NextResponse.json(
        {
          success: false,
          message: "Minimum deposit amount is ₹10",
        },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findById(authUser._id);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found",
        },
        { status: 404 }
      );
    }

    const transaction = await Transaction.create({
      user: user._id,
      type: "deposit",
      amount,
      status: "pending",
      paymentMethod,
      utr,
      note: body.note || "Deposit request submitted by user",
    });

    return NextResponse.json(
      {
        success: true,
        message:
          "Deposit request submitted successfully. Waiting for admin approval.",
        transaction: {
          _id: transaction._id,
          id: transaction._id,
          amount: transaction.amount,
          status: transaction.status,
          type: transaction.type,
          createdAt: transaction.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Deposit Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to create deposit request",
        error: error.message,
      },
      { status: 500 }
    );
  }
}