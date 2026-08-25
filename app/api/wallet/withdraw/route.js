import { NextResponse } from "next/server";
import { getAuthUser } from "../../../lib/auth";
import connectDB from "../../../lib/db";
import User from "../../../models/User";
import Transaction from "../../../models/Transaction";
import GameSettings from "../../../models/GameSettings";

export async function POST(request) {
  try {
    // 1. LOGIN CHECK
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

    // 3. REQUEST BODY
    const body = await request.json();

    const amount = Number(body.amount);
    const upiId = String(body.upiId || "").trim();
    const note = String(body.note || "").trim();

    // 4. BASIC AMOUNT VALIDATION
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Please enter a valid withdrawal amount",
        },
        { status: 400 }
      );
    }

    if (Math.round(amount * 100) !== amount * 100) {
      return NextResponse.json(
        {
          success: false,
          message: "Amount can have maximum 2 decimal places",
        },
        { status: 400 }
      );
    }

    if (!upiId) {
      return NextResponse.json(
        {
          success: false,
          message: "UPI ID is required",
        },
        { status: 400 }
      );
    }

    if (upiId.length < 3 || upiId.length > 100) {
      return NextResponse.json(
        {
          success: false,
          message: "Please enter a valid UPI ID",
        },
        { status: 400 }
      );
    }

    await connectDB();

    // Fetch full user record to inspect linked UPI
    const dbUser = await User.findById(user._id);
    if (!dbUser) {
      return NextResponse.json(
        { success: false, message: "User account not found" },
        { status: 404 }
      );
    }

    // ========================================================
    // SAME-ACCOUNT UPI SECURITY ENFORCEMENT
    // User can only withdraw to the same UPI account used for deposit
    // ========================================================
    if (dbUser.linkedUpiId && dbUser.isUpiLocked) {
      if (upiId.toLowerCase().trim() !== dbUser.linkedUpiId.toLowerCase().trim()) {
        return NextResponse.json(
          {
            success: false,
            message: `Suraksha Niyam (Security Rule): Withdrawal sirf aapke registered/verified deposit UPI ID (${dbUser.linkedUpiId}) par hi bheja ja sakta hai. Kisi dusre account me withdrawal allowed nahi hai.`,
          },
          { status: 403 }
        );
      }
    } else if (!dbUser.linkedUpiId) {
      // First withdrawal locks this UPI ID if user hasn't deposited yet
      dbUser.linkedUpiId = upiId.trim();
      dbUser.isUpiLocked = true;
      await dbUser.save();
    }

    // 5. LOAD SETTINGS
    let settings = await GameSettings.findOne().lean();

    if (!settings) {
      settings = await GameSettings.create({
        CoinFlipEnabled: true,
        maintenanceMode: false,
        minBet: 10,
        maxBet: 10000,
        payoutMultiplier: 2,

        minDeposit: 10,
        maxDeposit: 50000,

        depositEnabled: true,

        minWithdrawal: 100,
        maxWithdrawal: 50000,

        withdrawalEnabled: true,
        manualWithdrawalApproval: true,
      });

      settings = settings.toObject();
    }

    // 6. WITHDRAWAL ENABLED
    if (settings.withdrawalEnabled === false) {
      return NextResponse.json(
        {
          success: false,
          message: "Withdrawals are currently disabled.",
        },
        { status: 403 }
      );
    }

    // 7. MIN / MAX WITHDRAWAL
    const minWithdrawal = Number(
      settings.minWithdrawal ?? 100
    );

    const maxWithdrawal = Number(
      settings.maxWithdrawal ?? 50000
    );

    if (amount < minWithdrawal) {
      return NextResponse.json(
        {
          success: false,
          message: `Minimum withdrawal amount is â‚¹${minWithdrawal}`,
        },
        { status: 400 }
      );
    }

    if (amount > maxWithdrawal) {
      return NextResponse.json(
        {
          success: false,
          message: `Maximum withdrawal amount is â‚¹${maxWithdrawal}`,
        },
        { status: 400 }
      );
    }

    // 9. CHECK PENDING WITHDRAWAL
    const existingWithdrawal = await Transaction.findOne({
      user: user._id,
      type: "withdraw",
      status: "pending",
    });

    if (existingWithdrawal) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You already have a pending withdrawal request.",
        },
        { status: 409 }
      );
    }

    // 10. ATOMIC BALANCE DEDUCTION
    const updatedUser = await User.findOneAndUpdate(
      {
        _id: user._id,
        walletBalance: {
          $gte: amount,
        },
      },
      {
        $inc: {
          walletBalance: -amount,
        },
      },
      {
        new: true,
      }
    );

    if (!updatedUser) {
      return NextResponse.json(
        {
          success: false,
          message: "Insufficient wallet balance",
        },
        { status: 400 }
      );
    }

    // 11. CREATE TRANSACTION
    let transaction;

    try {
      transaction = await Transaction.create({
        user: updatedUser._id,
        type: "withdraw",
        amount,
        status: "pending",
        paymentMethod: "upi",
        upiId,
        note,
      });
    } catch (transactionError) {
      // IMPORTANT:
      // If transaction creation fails, refund the reserved amount.
      await User.findByIdAndUpdate(
        updatedUser._id,
        {
          $inc: {
            walletBalance: amount,
          },
        }
      );

      throw transactionError;
    }

    // 12. SUCCESS
    return NextResponse.json(
      {
        success: true,
        message:
          "Withdrawal request submitted successfully. Please wait for admin approval.",

        transaction: {
          id: transaction._id,
          amount: transaction.amount,
          status: transaction.status,
          upiId: transaction.upiId,
          createdAt: transaction.createdAt,
        },
        withdrawal: {
          id: transaction._id,
          amount: transaction.amount,
          status: transaction.status,
          upiId: transaction.upiId,
          createdAt: transaction.createdAt,
        },

        walletBalance: updatedUser.walletBalance,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Withdrawal Request Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to submit withdrawal request",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
