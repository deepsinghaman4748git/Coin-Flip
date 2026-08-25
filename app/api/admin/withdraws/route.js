import { NextResponse } from "next/server";
import { getAuthUser } from "../../../lib/auth";
import connectDB from "../../../lib/db";
import Transaction from "../../../models/Transaction";

export async function GET(request) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    if (user.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Admin access required" },
        { status: 403 }
      );
    }

    await connectDB();

    const withdrawals = await Transaction.find({
      type: "withdraw",
    })
      .populate("user", "name email walletBalance")
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      withdrawals,
    });
  } catch (error) {
    console.error("Admin Withdraw List Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load withdrawals",
        error: error.message,
      },
      { status: 500 }
    );
  }
}