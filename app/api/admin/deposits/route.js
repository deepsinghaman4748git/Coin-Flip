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
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    if (user.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          message: "Admin access required",
        },
        { status: 403 }
      );
    }

    const deposits = await Transaction.find({
      type: "deposit",
    })
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      deposits,
    });
  } catch (error) {
    console.error("Admin Deposits Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load deposit requests",
        error: error.message,
      },
      { status: 500 }
    );
  }
}