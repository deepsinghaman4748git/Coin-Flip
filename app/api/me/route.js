import { NextResponse } from "next/server";
import { getAuthUser } from "../../lib/auth";

export async function GET(request) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Not authenticated",
        },
        { status: 401 }
      );
    }

    // Ensure user has a referralCode
    if (!user.referralCode) {
      user.referralCode = "CF" + Math.random().toString(36).substring(2, 8).toUpperCase();
      await user.save();
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        walletBalance: user.walletBalance,
        role: user.role,
        referralCode: user.referralCode,
        referredBy: user.referredBy || "",
        referralEarnings: Number(user.referralEarnings || 0),
        lastDailyBonusClaim: user.lastDailyBonusClaim,
        lastDailyBonusDate: user.lastDailyBonusDate || "",
        dailyBonusStreak: Number(user.dailyBonusStreak || 0),
        totalDailyBonusClaimed: Number(user.totalDailyBonusClaimed || 0),
        hasClaimedWelcomeBonus: Boolean(user.hasClaimedWelcomeBonus),
        firstDepositDone: Boolean(user.firstDepositDone),
        linkedUpiId: user.linkedUpiId || "",
        isUpiLocked: Boolean(user.isUpiLocked),
        depositUpiHistory: user.depositUpiHistory || [],
      },
    });
  } catch (error) {
    console.error("Me API Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Invalid or expired session",
      },
      { status: 401 }
    );
  }
}