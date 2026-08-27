import { NextResponse } from "next/server";
import { getAuthUser } from "../../../../lib/auth";
import connectDB from "../../../../lib/db";
import Transaction from "../../../../models/Transaction";

export async function POST(request) {
  try {
    const authUser = await getAuthUser(request);

    if (!authUser) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    if (authUser.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const transactionId =
      body.transactionId || body.depositId || body.id || body._id;
    const reason = body.reason;

    if (!transactionId) {
      return NextResponse.json(
        { success: false, message: "Transaction ID is required" },
        { status: 400 }
      );
    }

    await connectDB();

    const transaction = await Transaction.findOne({
      _id: transactionId,
      type: "deposit",
    });

    if (!transaction) {
      return NextResponse.json(
        { success: false, message: "Deposit request not found" },
        { status: 404 }
      );
    }

    if (transaction.status !== "pending") {
      return NextResponse.json(
        {
          success: false,
          message: "This deposit has already been processed",
        },
        { status: 400 }
      );
    }

    transaction.status = "rejected";
    if (reason) {
      transaction.note = `Rejected by admin: ${reason}`;
    }

    await transaction.save();

    return NextResponse.json({
      success: true,
      message: "Deposit request rejected",
    });
  } catch (error) {
    console.error("Reject Deposit Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to reject deposit",
        error: error.message,
      },
      { status: 500 }
    );
  }
}