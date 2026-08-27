import { NextResponse } from "next/server";
import { getAuthUser } from "../../../../lib/auth";
import connectDB from "../../../../lib/db";
import User from "../../../../models/User";
import Transaction from "../../../../models/Transaction";
import GameSettings from "../../../../models/GameSettings";

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

    const grantBonus = Boolean(body.grantBonus);
    const customBonusAmount = body.bonusAmount;
    const bonusNote = body.bonusNote || "";

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

    const targetUserId = transaction.user?._id || transaction.user;
    const user = await User.findById(targetUserId);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    let settings = await GameSettings.findOne();
    if (!settings) {
      settings = await GameSettings.create({});
    }

    const depositAmount = Number(transaction.amount);
    let totalAdded = depositAmount;
    let welcomeBonusAmount = 0;

    // Manual Admin Decision for First Deposit / Welcome Bonus
    if (grantBonus) {
      if (customBonusAmount !== undefined && customBonusAmount !== null && Number(customBonusAmount) >= 0) {
        welcomeBonusAmount = Number(customBonusAmount);
      } else {
        // Default to configured percentage (e.g. 100% of deposit)
        const bonusPercent = Number(settings.welcomeBonusPercentage || settings.welcomeBonusPercent || 100);
        const maxBonus = Number(settings.welcomeBonusMax || settings.maxWelcomeBonus || 5000);
        welcomeBonusAmount = Math.min(maxBonus, (depositAmount * bonusPercent) / 100);
      }

      if (welcomeBonusAmount > 0) {
        totalAdded += welcomeBonusAmount;
        user.hasClaimedWelcomeBonus = true;

        // Create bonus transaction record
        await Transaction.create({
          user: user._id,
          type: "welcome_bonus",
          amount: welcomeBonusAmount,
          status: "approved",
          paymentMethod: "admin_manual",
          note: bonusNote || `Deposit Welcome Bonus approved by Admin on ₹${depositAmount} deposit`,
        });
      }
    }

    const isFirstDeposit = !user.firstDepositDone;
    user.firstDepositDone = true;

    // Process Referrer Reward if first deposit
    if (isFirstDeposit && user.referredBy && settings.referralBonusEnabled !== false) {
      const referrer = await User.findOne({ referralCode: user.referredBy });
      if (referrer) {
        const refBonus = Number(settings.referralBonusAmount || 25);
        referrer.walletBalance = Number(referrer.walletBalance || 0) + refBonus;
        referrer.referralEarnings = Number(referrer.referralEarnings || 0) + refBonus;
        await referrer.save();

        await Transaction.create({
          user: referrer._id,
          type: "referral_bonus",
          amount: refBonus,
          status: "approved",
          paymentMethod: "system",
          note: `Referral Bonus for inviting ${user.name || "friend"}`,
        });
      }
    }

    // Lock / Link deposit UPI ID to User account for mandatory same-account withdrawals
    if (transaction.upiId) {
      const cleanUpi = String(transaction.upiId).trim();
      if (cleanUpi) {
        if (!user.linkedUpiId) {
          user.linkedUpiId = cleanUpi;
          user.isUpiLocked = true;
        }
        if (!Array.isArray(user.depositUpiHistory)) {
          user.depositUpiHistory = [];
        }
        if (!user.depositUpiHistory.includes(cleanUpi)) {
          user.depositUpiHistory.push(cleanUpi);
        }
      }
    }

    user.walletBalance = Number(user.walletBalance || 0) + totalAdded;
    transaction.status = "approved";
    transaction.processedBy = authUser.userId ? authUser.userId : null;
    if (welcomeBonusAmount > 0) {
      transaction.adminNote = `Approved with ₹${welcomeBonusAmount} manual bonus`;
    }

    await user.save();
    await transaction.save();

    return NextResponse.json({
      success: true,
      message: welcomeBonusAmount > 0
        ? `Deposit approved with ₹${welcomeBonusAmount} bonus! (Total Credited: ₹${totalAdded})`
        : `Deposit approved with ₹${depositAmount} credited to wallet!`,
      walletBalance: user.walletBalance,
      welcomeBonusGiven: welcomeBonusAmount,
      totalCredited: totalAdded,
    });
  } catch (error) {
    console.error("Approve Deposit Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to approve deposit",
        error: error.message,
      },
      { status: 500 }
    );
  }
}