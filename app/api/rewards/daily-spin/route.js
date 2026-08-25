import { NextResponse } from "next/server";
import { getAuthUser } from "../../../lib/auth";
import connectDB from "../../../lib/db";
import User from "../../../models/User";
import Transaction from "../../../models/Transaction";
import GameSettings from "../../../models/GameSettings";

// Exact Day-wise rewards for the 7-day cycle
const DAY_REWARDS = [
  { day: 1, amount: 10, label: "Day 1" },
  { day: 2, amount: 15, label: "Day 2" },
  { day: 3, amount: 20, label: "Day 3" },
  { day: 4, amount: 25, label: "Day 4" },
  { day: 5, amount: 30, label: "Day 5" },
  { day: 6, amount: 40, label: "Day 6" },
  { day: 7, amount: 50, label: "Day 7 👑", isJackpot: true },
];

function safeParseDate(input) {
  if (!input) return null;
  if (input instanceof Date) {
    return isNaN(input.getTime()) ? null : input;
  }
  if (typeof input === "object") {
    if (typeof input.toDate === "function") {
      try {
        const d = input.toDate();
        if (d instanceof Date && !isNaN(d.getTime())) return d;
      } catch {}
    }
    if (typeof input.seconds === "number") {
      const d = new Date(input.seconds * 1000);
      if (!isNaN(d.getTime())) return d;
    }
    if (typeof input._seconds === "number") {
      const d = new Date(input._seconds * 1000);
      if (!isNaN(d.getTime())) return d;
    }
  }
  try {
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

function getISTDateString(date = new Date()) {
  try {
    const d = safeParseDate(date) || new Date();
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(d.getTime() + istOffsetMs);
    if (isNaN(istDate.getTime())) {
      const fallback = new Date(Date.now() + istOffsetMs);
      return fallback.toISOString().split("T")[0];
    }
    return istDate.toISOString().split("T")[0];
  } catch {
    return new Date().toISOString().split("T")[0];
  }
}

function getYesterdayISTDateString(date = new Date()) {
  try {
    const d = safeParseDate(date) || new Date();
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const istYesterday = new Date(d.getTime() + istOffsetMs - 24 * 60 * 60 * 1000);
    if (isNaN(istYesterday.getTime())) {
      const fallback = new Date(Date.now() + istOffsetMs - 24 * 60 * 60 * 1000);
      return fallback.toISOString().split("T")[0];
    }
    return istYesterday.toISOString().split("T")[0];
  } catch {
    return "";
  }
}

function getSecondsUntilNextISTMidnight(date = new Date()) {
  try {
    const d = safeParseDate(date) || new Date();
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const currentIST = new Date(d.getTime() + istOffsetMs);
    const nextISTMidnight = new Date(
      Date.UTC(
        currentIST.getUTCFullYear(),
        currentIST.getUTCMonth(),
        currentIST.getUTCDate() + 1,
        0,
        0,
        0
      )
    );
    const nextUnlockTimestamp = nextISTMidnight.getTime() - istOffsetMs;
    const diff = Math.floor((nextUnlockTimestamp - d.getTime()) / 1000);
    return Math.max(0, isNaN(diff) ? 86400 : diff);
  } catch {
    return 86400;
  }
}

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

    let settings = await GameSettings.findOne().lean();
    if (!settings) {
      settings = await GameSettings.create({});
      settings = settings.toObject();
    }

    const now = new Date();
    const todayDateStr = getISTDateString(now);
    const yesterdayDateStr = getYesterdayISTDateString(now);
    const lastClaimDateStr =
      user.lastDailyBonusDate ||
      (user.lastDailyBonusClaim ? getISTDateString(user.lastDailyBonusClaim) : "");

    let canSpin = true;
    let nextSpinTime = null;
    let remainingSeconds = 0;
    let streak = Number(user.dailyBonusStreak || 0);

    if (lastClaimDateStr) {
      if (lastClaimDateStr === todayDateStr) {
        // Strict lock: already claimed on this calendar date
        canSpin = false;
        const secondsToMidnight = getSecondsUntilNextISTMidnight(now);
        let secondsTo24h = 0;
        if (user.lastDailyBonusClaim) {
          const parsedClaim = safeParseDate(user.lastDailyBonusClaim);
          if (parsedClaim) {
            const diffMs = now.getTime() - parsedClaim.getTime();
            secondsTo24h = Math.max(0, Math.floor((24 * 60 * 60 * 1000 - diffMs) / 1000));
          }
        }
        remainingSeconds = Math.max(secondsToMidnight, secondsTo24h, 1);
        nextSpinTime = new Date(now.getTime() + remainingSeconds * 1000);
      } else if (lastClaimDateStr === yesterdayDateStr) {
        // Claimed yesterday -> consecutive streak remains active
        canSpin = true;
        remainingSeconds = 0;
      } else {
        // Missed one or more days -> streak resets
        canSpin = true;
        remainingSeconds = 0;
        streak = 0;
      }
    }

    // Active day in the 7-day cycle:
    const activeDay = canSpin
      ? (streak % 7) + 1
      : streak > 0
      ? ((streak - 1) % 7) + 1
      : 1;

    const nextUpcomingDay = canSpin ? activeDay : (streak % 7) + 1;
    const targetReward = DAY_REWARDS[activeDay - 1] || DAY_REWARDS[0];

    return NextResponse.json({
      success: true,
      canSpin: canSpin && settings.dailyBonusEnabled !== false,
      dailyBonusEnabled: settings.dailyBonusEnabled !== false,
      streak,
      activeDay,
      nextUpcomingDay,
      targetReward: targetReward.amount,
      dayRewards: DAY_REWARDS,
      totalClaimed: Number(user.totalDailyBonusClaimed || 0),
      lastClaimedAt: user.lastDailyBonusClaim,
      lastClaimedDate: lastClaimDateStr,
      todayDate: todayDateStr,
      nextSpinTime,
      remainingSeconds,
    });
  } catch (error) {
    console.error("Daily Spin GET error:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch spin status" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const authUser = await getAuthUser(request, body);
    if (!authUser) {
      return NextResponse.json({ success: false, message: "Please login first" }, { status: 401 });
    }

    await connectDB();
    const user = await User.findById(authUser._id);
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    let settings = await GameSettings.findOne();
    if (!settings) {
      settings = await GameSettings.create({});
    }

    if (settings.dailyBonusEnabled === false) {
      return NextResponse.json({ success: false, message: "Daily bonus is currently disabled" }, { status: 403 });
    }

    const now = new Date();
    const todayDateStr = getISTDateString(now);
    const yesterdayDateStr = getYesterdayISTDateString(now);
    const lastClaimDateStr =
      user.lastDailyBonusDate ||
      (user.lastDailyBonusClaim ? getISTDateString(user.lastDailyBonusClaim) : "");

    let currentStreak = Number(user.dailyBonusStreak || 0);

    if (lastClaimDateStr) {
      if (lastClaimDateStr === todayDateStr) {
        const secondsToMidnight = getSecondsUntilNextISTMidnight(now);
        let secondsTo24h = 0;
        if (user.lastDailyBonusClaim) {
          const parsedClaim = safeParseDate(user.lastDailyBonusClaim);
          if (parsedClaim) {
            const diffMs = now.getTime() - parsedClaim.getTime();
            secondsTo24h = Math.max(0, Math.floor((24 * 60 * 60 * 1000 - diffMs) / 1000));
          }
        }
        const remainingSeconds = Math.max(secondsToMidnight, secondsTo24h, 1);
        const hours = Math.ceil(remainingSeconds / 3600);

        return NextResponse.json(
          {
            success: false,
            message: `Aapka aaj (${todayDateStr}) ka Daily Spin already claim ho chuka hai! Agla spin ${hours} ghante baad unlock hoga.`,
            remainingSeconds,
            canSpin: false,
          },
          { status: 400 }
        );
      } else if (lastClaimDateStr === yesterdayDateStr) {
        // Consecutive claim, streak preserved
      } else {
        // Missed days, streak resets to 0
        currentStreak = 0;
      }
    }

    // Advance streak
    const newStreak = currentStreak + 1;
    // Calculate 1-indexed Day in the 7-day cycle (Day 1 through Day 7)
    const dayInCycle = ((newStreak - 1) % 7) + 1;

    // Exact Day-wise reward amount
    const dayRewardObj = DAY_REWARDS[dayInCycle - 1] || DAY_REWARDS[0];
    const wonAmount = Number(dayRewardObj.amount || 10);
    const prizeIndex = dayInCycle - 1; // 0 to 6

    const secondsToMidnight = getSecondsUntilNextISTMidnight(now);
    const remainingSeconds = Math.max(secondsToMidnight, 86400);

    // Credit user's wallet
    user.walletBalance = Number(user.walletBalance || 0) + wonAmount;
    user.lastDailyBonusClaim = now;
    user.lastDailyBonusDate = todayDateStr;
    user.dailyBonusStreak = newStreak;
    user.totalDailyBonusClaimed = Number(user.totalDailyBonusClaimed || 0) + wonAmount;
    await user.save();

    // Create transaction record
    await Transaction.create({
      user: user._id,
      type: "daily_bonus",
      amount: wonAmount,
      status: "approved",
      paymentMethod: "system",
      note: `Daily Login Bonus (Day ${dayInCycle} of 7-Day Cycle - Date: ${todayDateStr})`,
    });

    return NextResponse.json({
      success: true,
      message: `🎉 Mubarak ho! Day ${dayInCycle} ka ₹${wonAmount} bonus wallet me add ho gaya!`,
      wonAmount,
      dayInCycle,
      prizeIndex,
      walletBalance: user.walletBalance,
      streak: newStreak,
      totalClaimed: user.totalDailyBonusClaimed,
      lastClaimedDate: todayDateStr,
      nextSpinTime: new Date(now.getTime() + remainingSeconds * 1000),
      remainingSeconds,
    });
  } catch (error) {
    console.error("Daily Spin POST error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
