import { NextResponse } from "next/server";
import { getAuthUser } from "../../../../lib/auth";
import connectDB from "../../../../lib/db";
import Transaction from "../../../../models/Transaction";

export async function POST(request) {
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

    const { id, payoutRef, note } = await request.json();

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Withdrawal ID is required",
        },
        { status: 400 }
      );
    }

    await connectDB();

    const withdrawal = await Transaction.findOne({
      _id: id,
      type: "withdraw",
    });

    if (!withdrawal) {
      return NextResponse.json(
        {
          success: false,
          message: "Withdrawal not found",
        },
        { status: 404 }
      );
    }

    if (withdrawal.status !== "pending") {
      return NextResponse.json(
        {
          success: false,
          message: "This withdrawal has already been processed",
        },
        { status: 400 }
      );
    }

    withdrawal.status = "completed";
    withdrawal.processedBy = user._id || user.userId;
    withdrawal.adminNote = note || "Withdrawal approved and transferred by admin";
    if (payoutRef) {
      withdrawal.utr = payoutRef;
      withdrawal.note = `Transfer Ref: ${payoutRef}`;
    }

    await withdrawal.save();

    return NextResponse.json({
      success: true,
      message: "Withdrawal approved successfully",
      withdrawal,
    });
  } catch (error) {
    console.error("Approve Withdrawal Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to approve withdrawal",
        error: error.message,
      },
      { status: 500 }
    );
  }
}