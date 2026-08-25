import { NextResponse } from "next/server";
import { getAuthUser } from "../../../lib/auth";
import connectDB from "../../../lib/db";
import Transaction from "../../../models/Transaction";

export async function GET(request) {
  try {
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

    await connectDB();

    // Get user's transactions
    const transactions = await Transaction.find({
      user: user._id,
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json(
      {
        success: true,
        transactions,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Transaction API Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load transactions",
        error: error.message,
      },
      { status: 500 }
    );
  }
}