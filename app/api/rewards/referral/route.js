import { NextResponse } from "next/server";
import { getAuthUser } from "../../../lib/auth";
import connectDB from "../../../lib/db";
import User from "../../../models/User";
import Transaction from "../../../models/Transaction";
import GameSettings from "../../../models/GameSettings";

export async function GET(request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ success: false, message: "Please login first" }, { status: 401 });
    }

    await connectDB();
    const user = await User.findById(authUser._id);
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    // Ensure user has a referral code
    if (!user.referralCode) {
      user.referralCode = "CF" + Math.random().toString(36).substring(2, 8).toUpperCase();
      await user.save();
    }

    let settings = await GameSettings.findOne().lean();
    if (!settings) {
      settings = await GameSettings.create({});
      settings = settings.toObject();
    }

    // Find users invited by this user
    const invitedFriends = await User.find({ referredBy: user.referralCode })
      .select("name email createdAt walletBalance firstDepositDone")
      .sort({ createdAt: -1 })
      .lean();

    // Mask name/email for privacy
    const maskedFriends = invitedFriends.map((f) => {
      const name = f.name || "Player";
      const maskedName = name.length > 2 ? name.substring(0, 2) + "***" : name + "*";
      return {
        id: f._id,
        name: maskedName,
        joinedAt: f.createdAt,
        active: Boolean(f.firstDepositDone || f.walletBalance > 0),
      };
    });

    const host = request.headers.get("host") || "localhost:3000";
    const protocol = request.headers.get("x-forwarded-proto") || "https";
    const inviteLink = `${protocol}://${host}/?ref=${user.referralCode}`;

    return NextResponse.json({
      success: true,
      referralCode: user.referralCode,
      inviteLink,
      referredBy: user.referredBy || "",
      totalReferrals: invitedFriends.length,
      activeReferrals: invitedFriends.filter((f) => f.firstDepositDone).length,
      referralEarnings: Number(user.referralEarnings || 0),
      commissionPercent: Number(settings.referralCommissionPercent || 5),
      referralBonusAmount: Number(settings.referralBonusAmount || 25),
      friends: maskedFriends,
    });
  } catch (error) {
    console.error("Referral GET error:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch referral details" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ success: false, message: "Please login first" }, { status: 401 });
    }

    const body = await request.json();
    const code = String(body.referralCode || "").trim().toUpperCase();

    if (!code) {
      return NextResponse.json({ success: false, message: "Referral code is required" }, { status: 400 });
    }

    await connectDB();
    const user = await User.findById(authUser._id);
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    if (user.referredBy) {
      return NextResponse.json({ success: false, message: `Referral code already applied (${user.referredBy})` }, { status: 400 });
    }

    if (user.referralCode === code) {
      return NextResponse.json({ success: false, message: "You cannot use your own referral code" }, { status: 400 });
    }

    const referrer = await User.findOne({ referralCode: code });
    if (!referrer) {
      return NextResponse.json({ success: false, message: "Invalid referral code. Please check and try again." }, { status: 404 });
    }

    // Apply code
    user.referredBy = code;
    await user.save();

    return NextResponse.json({
      success: true,
      message: `Referral code ${code} successfully applied!`,
      referredBy: code,
    });
  } catch (error) {
    console.error("Referral POST error:", error);
    return NextResponse.json({ success: false, message: "Failed to apply referral code" }, { status: 500 });
  }
}
