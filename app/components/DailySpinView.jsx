"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { RUPEE } from "../lib/constants";
import { authFetch as defaultAuthFetch } from "../lib/clientAuth";
import { playCoinSpinSound, playWinSound, playClickSound } from "../lib/soundEffects";

// 7 Segments representing Day 1 to Day 7
const WHEEL_SEGMENTS = [
  { day: 1, amount: 10, label: "Day 1 (₹10)", color: "#10B981", textColor: "#FFFFFF" },
  { day: 2, amount: 15, label: "Day 2 (₹15)", color: "#3B82F6", textColor: "#FFFFFF" },
  { day: 3, amount: 20, label: "Day 3 (₹20)", color: "#F59E0B", textColor: "#FFFFFF" },
  { day: 4, amount: 25, label: "Day 4 (₹25)", color: "#8B5CF6", textColor: "#FFFFFF" },
  { day: 5, amount: 30, label: "Day 5 (₹30)", color: "#EC4899", textColor: "#FFFFFF" },
  { day: 6, amount: 40, label: "Day 6 (₹40)", color: "#06B6D4", textColor: "#FFFFFF" },
  { day: 7, amount: 50, label: "Day 7 (₹50 👑)", color: "#EAB308", textColor: "#000000", isJackpot: true },
];

const STREAK_DAYS = [
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

function getISTDateStr(date = new Date()) {
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

function getYesterdayISTDateStr(date = new Date()) {
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

function getSecondsUntilISTMidnight(date = new Date()) {
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

export default function DailySpinView({ user, refreshUser, authFetch, onDemoBalanceUpdate }) {
  const [canSpin, setCanSpin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [streak, setStreak] = useState(0);
  const [activeDay, setActiveDay] = useState(1);
  const [totalClaimed, setTotalClaimed] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [winResult, setWinResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const canvasRef = useRef(null);

  const isDemo = Boolean(user?.isDemo);
  const userId = user?._id || user?.id || "guest";

  // Initial check from user props safely
  const checkPropStatus = useCallback(() => {
    if (!user || user.isDemo) return;

    try {
      const todayStr = getISTDateStr(new Date());
      const yesterdayStr = getYesterdayISTDateStr(new Date());
      const lastDate =
        typeof user.lastDailyBonusDate === "string" && user.lastDailyBonusDate
          ? user.lastDailyBonusDate
          : user.lastDailyBonusClaim
          ? getISTDateStr(user.lastDailyBonusClaim)
          : "";

      const userStreak = Number(user.dailyBonusStreak || 0);
      setStreak(userStreak);
      setTotalClaimed(Number(user.totalDailyBonusClaimed || 0));

      if (lastDate && lastDate === todayStr) {
        // Already claimed today
        setCanSpin(false);
        const secs = getSecondsUntilISTMidnight(new Date());
        setRemainingSeconds(Math.max(secs, 1));
        const day = userStreak > 0 ? ((userStreak - 1) % 7) + 1 : 1;
        setActiveDay(day);
      } else if (lastDate && lastDate === yesterdayStr) {
        setCanSpin(true);
        setRemainingSeconds(0);
        setActiveDay((userStreak % 7) + 1);
      } else if (!lastDate) {
        setCanSpin(true);
        setRemainingSeconds(0);
        setActiveDay(1);
      }
    } catch (e) {
      console.warn("checkPropStatus error:", e);
    }
  }, [user]);

  // Fetch spin status from backend API or demo state
  const fetchStatus = useCallback(async () => {
    if (isDemo) {
      setLoading(false);
      try {
        const todayStr = getISTDateStr(new Date());
        const yesterdayStr = getYesterdayISTDateStr(new Date());

        const demoStreak = parseInt(localStorage.getItem("coinflip_demo_spin_streak") || "0", 10);
        const demoLastDate = localStorage.getItem("coinflip_demo_spin_date") || "";
        const demoLastTimestamp = localStorage.getItem("coinflip_demo_spin_last");
        const demoTotal = parseFloat(localStorage.getItem("coinflip_demo_spin_total") || "0");

        let demoCanSpin = true;
        let diffSecs = 0;

        if (demoLastDate === todayStr) {
          // Locked for today
          demoCanSpin = false;
          diffSecs = getSecondsUntilISTMidnight(new Date());
        } else if (demoLastTimestamp) {
          const lastTs = parseInt(demoLastTimestamp, 10);
          if (!isNaN(lastTs)) {
            const diffMs = Date.now() - lastTs;
            const COOLDOWN = 24 * 3600 * 1000;
            if (diffMs < COOLDOWN) {
              demoCanSpin = false;
              diffSecs = Math.max(0, Math.floor((COOLDOWN - diffMs) / 1000));
            }
          }
        }

        let effectiveStreak = isNaN(demoStreak) ? 0 : demoStreak;
        if (demoLastDate && demoLastDate !== todayStr && demoLastDate !== yesterdayStr) {
          effectiveStreak = 0; // Streak reset
        }

        const day = demoCanSpin
          ? (effectiveStreak % 7) + 1
          : effectiveStreak > 0
          ? ((effectiveStreak - 1) % 7) + 1
          : 1;

        setStreak(effectiveStreak);
        setActiveDay(day);
        setCanSpin(demoCanSpin);
        setRemainingSeconds(diffSecs);
        setTotalClaimed(isNaN(demoTotal) ? 0 : demoTotal);
      } catch {
        setCanSpin(true);
        setActiveDay(1);
      }
      return;
    }

    try {
      setLoading(true);
      setErrorMsg("");
      const fetcher = typeof authFetch === "function" ? authFetch : defaultAuthFetch;
      const res = await fetcher("/api/rewards/daily-spin", { cache: "no-store" });

      let data = null;
      try {
        const text = await res.text();
        if (text && (text.startsWith("{") || text.startsWith("["))) {
          data = JSON.parse(text);
        }
      } catch (parseErr) {
        console.warn("Daily spin parse error:", parseErr);
      }

      if (data && data.success) {
        const userCanSpin = Boolean(data.canSpin);
        const userStreak = Number(data.streak || 0);
        setCanSpin(userCanSpin);
        setStreak(userStreak);
        setActiveDay(
          Number(
            data.activeDay ||
              (userCanSpin
                ? (userStreak % 7) + 1
                : userStreak > 0
                ? ((userStreak - 1) % 7) + 1
                : 1)
          )
        );
        setTotalClaimed(Number(data.totalClaimed || 0));
        setRemainingSeconds(Number(data.remainingSeconds || 0));
      } else if (data && data.remainingSeconds) {
        setRemainingSeconds(Number(data.remainingSeconds));
        setCanSpin(false);
        if (data.streak !== undefined) setStreak(Number(data.streak));
        if (data.activeDay !== undefined) setActiveDay(Number(data.activeDay));
      }
    } catch (err) {
      console.warn("Failed to load daily spin info:", err?.message || err);
      checkPropStatus();
    } finally {
      setLoading(false);
    }
  }, [isDemo, authFetch, checkPropStatus]);

  useEffect(() => {
    checkPropStatus();
    fetchStatus();
  }, [isDemo, userId, fetchStatus, checkPropStatus]);

  // Live countdown timer for next day unlock
  useEffect(() => {
    if (remainingSeconds <= 0) return;
    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCanSpin(true);
          setActiveDay((prevDay) => (prevDay % 7) + 1);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [remainingSeconds]);

  function formatCountdown(secs) {
    const totalSecs = Math.max(0, Math.floor(Number(secs) || 0));
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    return `${String(h).padStart(2, "0")}h : ${String(m).padStart(2, "0")}m : ${String(s).padStart(2, "0")}s`;
  }

  // Draw Lucky Wheel Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const numSegments = WHEEL_SEGMENTS.length;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = centerX - 14;
    const angleStep = (2 * Math.PI) / numSegments;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Outer golden glowing ring
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 8, 0, 2 * Math.PI);
    ctx.strokeStyle = "#F59E0B";
    ctx.lineWidth = 10;
    ctx.stroke();

    // Outer decorative casino dots
    const numDots = 28;
    for (let i = 0; i < numDots; i++) {
      const dotAngle = (i * 2 * Math.PI) / numDots;
      const dotX = centerX + (radius + 8) * Math.cos(dotAngle);
      const dotY = centerY + (radius + 8) * Math.sin(dotAngle);
      ctx.beginPath();
      ctx.arc(dotX, dotY, 3.5, 0, 2 * Math.PI);
      ctx.fillStyle = i % 2 === 0 ? "#FEF08A" : "#FFFFFF";
      ctx.fill();
    }

    // Draw Segments
    WHEEL_SEGMENTS.forEach((seg, i) => {
      const startAngle = i * angleStep;
      const endAngle = startAngle + angleStep;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = seg.color;
      ctx.fill();

      // Divider lines
      ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Segment text
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + angleStep / 2);
      ctx.textAlign = "right";
      ctx.fillStyle = seg.textColor || "#FFFFFF";
      ctx.font = seg.isJackpot ? "900 15px sans-serif" : "bold 14px sans-serif";
      ctx.shadowColor = "rgba(0,0,0,0.85)";
      ctx.shadowBlur = 4;
      ctx.fillText(seg.label, radius - 20, 5);
      ctx.restore();
    });

    // Center Cap
    ctx.beginPath();
    ctx.arc(centerX, centerY, 36, 0, 2 * Math.PI);
    ctx.fillStyle = "#0B0F19";
    ctx.fill();
    ctx.strokeStyle = "#EAB308";
    ctx.lineWidth = 5;
    ctx.stroke();

    ctx.fillStyle = "#EAB308";
    ctx.font = "900 13px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("SPIN", centerX, centerY);
  }, []);

  // Handle Spin Action (Locked for 24h / Date-Wise)
  async function handleSpin() {
    if (spinning || !canSpin || remainingSeconds > 0) return;

    playClickSound();
    playCoinSpinSound();
    setSpinning(true);
    setErrorMsg("");
    setWinResult(null);

    // DEMO MODE SPIN
    if (isDemo) {
      const nextStreak = streak + 1;
      const dayInCycle = ((nextStreak - 1) % 7) + 1;
      const dayPrize = STREAK_DAYS[dayInCycle - 1];
      const wonAmount = dayPrize.amount;
      const prizeIdx = dayInCycle - 1;

      // Calculate target angle to land on target segment (at top pointer 270 deg)
      const numSegments = WHEEL_SEGMENTS.length;
      const anglePerSegment = 360 / numSegments;
      const segmentCenterAngle = prizeIdx * anglePerSegment + anglePerSegment / 2;
      const targetBaseAngle = 270 - segmentCenterAngle;
      const fullRotations = 6 * 360;
      const finalAngle = fullRotations + (((targetBaseAngle % 360) + 360) % 360);

      setRotation(finalAngle);

      setTimeout(() => {
        setSpinning(false);
        setCanSpin(false);

        const secsToMidnight = getSecondsUntilISTMidnight(new Date());
        const lockDuration = Math.max(secsToMidnight, 86400);
        setRemainingSeconds(lockDuration);
        setStreak(nextStreak);
        setActiveDay(dayInCycle);

        const newTotal = totalClaimed + wonAmount;
        setTotalClaimed(newTotal);

        try {
          const todayStr = getISTDateStr(new Date());
          localStorage.setItem("coinflip_demo_spin_streak", String(nextStreak));
          localStorage.setItem("coinflip_demo_spin_date", todayStr);
          localStorage.setItem("coinflip_demo_spin_last", String(Date.now()));
          localStorage.setItem("coinflip_demo_spin_total", String(newTotal));
        } catch {}

        if (typeof onDemoBalanceUpdate === "function") {
          onDemoBalanceUpdate(wonAmount);
        }

        playWinSound();
        setWinResult({
          amount: wonAmount,
          streak: nextStreak,
          dayInCycle,
        });
      }, 4600);
      return;
    }

    // REAL USER MODE SPIN
    try {
      const fetcher = typeof authFetch === "function" ? authFetch : defaultAuthFetch;
      const res = await fetcher("/api/rewards/daily-spin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      let data = null;
      try {
        const text = await res.text();
        if (text && (text.startsWith("{") || text.startsWith("["))) {
          data = JSON.parse(text);
        }
      } catch (parseErr) {
        console.warn("Daily spin parse error:", parseErr);
      }

      if (!res.ok || !data || !data.success) {
        setErrorMsg(data?.message || "Spin nahi ho paya. Please try again.");
        setSpinning(false);
        if (data?.remainingSeconds) {
          setCanSpin(false);
          setRemainingSeconds(Number(data.remainingSeconds));
        }
        return;
      }

      // Calculate target angle to land on target segment (top pointer 270 deg)
      const numSegments = WHEEL_SEGMENTS.length;
      const anglePerSegment = 360 / numSegments;
      const prizeIdx =
        data.prizeIndex !== undefined
          ? data.prizeIndex
          : data.dayInCycle
          ? data.dayInCycle - 1
          : 0;

      const segmentCenterAngle = prizeIdx * anglePerSegment + anglePerSegment / 2;
      const targetBaseAngle = 270 - segmentCenterAngle;
      const fullRotations = 6 * 360;
      const finalAngle = fullRotations + (((targetBaseAngle % 360) + 360) % 360);

      setRotation(finalAngle);

      // Wait for spin animation (4.6s)
      setTimeout(async () => {
        setSpinning(false);
        setCanSpin(false);

        const secsLock = Number(data.remainingSeconds || getSecondsUntilISTMidnight(new Date()));
        setRemainingSeconds(Math.max(secsLock, 1));
        setStreak(Number(data.streak || 1));
        setActiveDay(Number(data.dayInCycle || 1));
        setTotalClaimed(Number(data.totalClaimed || 0));

        playWinSound();
        setWinResult({
          amount: data.wonAmount,
          streak: data.streak,
          dayInCycle: data.dayInCycle || 1,
        });

        if (refreshUser) await refreshUser();
      }, 4600);
    } catch (err) {
      console.error(err);
      setErrorMsg("Network error. Please try again.");
      setSpinning(false);
    }
  }

  // Current day status for UI
  const currentClaimedDay = !canSpin && streak > 0 ? ((streak - 1) % 7) + 1 : 0;
  const currentTargetDay = canSpin
    ? (streak % 7) + 1
    : streak > 0
    ? ((streak - 1) % 7) + 1
    : 1;
  const upcomingNextDay = canSpin ? currentTargetDay : (streak % 7) + 1;
  const currentTargetReward = STREAK_DAYS[upcomingNextDay - 1]?.amount || 10;
  const todayDateDisplay = getISTDateStr(new Date());

  return (
    <div id="daily-spin-container" className="space-y-7 max-w-5xl mx-auto">
      {/* Header Banner */}
      <section
        id="daily-spin-header"
        className="rounded-3xl border border-yellow-500/20 bg-gradient-to-r from-yellow-500/10 via-[#111827] to-amber-500/10 p-6 md:p-8 relative overflow-hidden"
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 text-xs font-bold uppercase tracking-wider mb-3">
              <span>🔒 24H Lock &amp; Date-Wise System</span>
              <span className="text-gray-400">· Date: {todayDateDisplay}</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white">
              Daily Lucky Spin &amp; Streak
            </h1>
            <p className="text-gray-400 text-sm md:text-base mt-2 max-w-xl">
              Rozana 1 free spin! Har date ko login karke spin karein. Day 1 se Day 7 tak badhta hua guaranteed bonus (₹10 se ₹50) aur spin 24 ghante ke liye lock ho jata hai.
            </p>
          </div>

          <div className="flex gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 min-w-[130px] text-center">
              <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">
                Current Streak
              </span>
              <p className="text-2xl font-black text-yellow-400 mt-1">
                🔥 Day {streak > 0 ? ((streak - 1) % 7) + 1 : 0}/7
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 min-w-[130px] text-center">
              <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">
                Total Claimed
              </span>
              <p className="text-2xl font-black text-green-400 mt-1">
                {RUPEE}
                {totalClaimed.toFixed(0)}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Wheel & Streak Section */}
      <div className="grid lg:grid-cols-12 gap-7 items-start">
        {/* Lucky Wheel Card */}
        <section
          id="lucky-wheel-card"
          className="lg:col-span-7 rounded-3xl border border-white/10 bg-[#111827] p-6 sm:p-8 flex flex-col items-center justify-center relative shadow-2xl"
        >
          <div className="text-center mb-6">
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center justify-center gap-2">
              <span>🎡</span>
              <span>Day-Wise Wheel of Fortune</span>
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              {canSpin
                ? `Aaj ka spin ready hai: Day ${currentTargetDay} (Guaranteed ₹${currentTargetReward})`
                : `Aaj (${todayDateDisplay}) ka Day ${currentClaimedDay} claim ho chuka hai. 24h Lock active.`}
            </p>
          </div>

          {/* Wheel Container */}
          <div className="relative w-[310px] h-[310px] sm:w-[360px] sm:h-[360px] flex items-center justify-center">
            {/* Top Indicator Pointer */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]">
              <div className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[26px] border-t-yellow-400 filter drop-shadow-md animate-bounce" />
            </div>

            {/* Rotating Canvas */}
            <div
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: spinning
                  ? "transform 4.5s cubic-bezier(0.15, 0.9, 0.25, 1)"
                  : "none",
              }}
              className="w-full h-full rounded-full shadow-[0_0_40px_rgba(234,179,8,0.2)]"
            >
              <canvas
                ref={canvasRef}
                width={360}
                height={360}
                className="w-full h-full rounded-full"
              />
            </div>
          </div>

          {/* Spin CTA Button & Countdown */}
          <div className="w-full max-w-sm mt-8 space-y-3 text-center">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold">
                {errorMsg}
              </div>
            )}

            {canSpin && remainingSeconds === 0 ? (
              <button
                id="spin-cta-btn"
                onClick={handleSpin}
                disabled={spinning || loading}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:from-yellow-300 hover:to-amber-400 text-black font-black text-lg tracking-wide shadow-lg shadow-yellow-500/25 transition transform active:scale-95 disabled:opacity-50"
              >
                {spinning
                  ? "SPINNING WHEEL..."
                  : `CLAIM DAY ${currentTargetDay} BONUS (₹${currentTargetReward}) 🎁`}
              </button>
            ) : (
              <div
                id="countdown-box"
                className="p-5 rounded-2xl bg-white/[0.04] border border-white/10 text-center"
              >
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-bold mb-2">
                  <span>🔒</span>
                  <span>TODAY&apos;S SPIN CLAIMED (LOCKED)</span>
                </div>
                <span className="text-xs text-gray-400 uppercase font-bold tracking-wider block mt-1">
                  Next Free Spin (Day {upcomingNextDay} · ₹{currentTargetReward}) Unlocks In
                </span>
                <p className="text-2xl font-black text-yellow-400 font-mono mt-1 tracking-wider">
                  {formatCountdown(remainingSeconds)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  1 spin per day limit. Agla claim agle din 00:00 midnight / 24 ghante baad unlock hoga.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* 7-Day Streak Calendar */}
        <section id="streak-calendar-section" className="lg:col-span-5 space-y-6">
          <div className="rounded-3xl border border-white/10 bg-[#111827] p-6 sm:p-7 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-black text-lg text-white">7-Day Check-in Plan</h3>
                <p className="text-xs text-gray-400 mt-0.5">Date-wise guaranteed wallet bonus</p>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">
                {canSpin ? `Ready: Day ${currentTargetDay}` : `Claimed: Day ${currentClaimedDay} (Locked)`}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {STREAK_DAYS.map((s) => {
                let isClaimed = false;
                let isToday = false;

                if (canSpin) {
                  if (s.day < currentTargetDay) {
                    isClaimed = true;
                  } else if (s.day === currentTargetDay) {
                    isToday = true;
                  }
                } else {
                  if (s.day <= currentClaimedDay) {
                    isClaimed = true;
                  }
                }

                return (
                  <div
                    key={s.day}
                    id={`streak-day-${s.day}`}
                    className={`rounded-2xl p-3 text-center border transition relative ${
                      s.isJackpot
                        ? isClaimed
                          ? "col-span-2 sm:col-span-2 bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                          : isToday
                          ? "col-span-2 sm:col-span-2 bg-gradient-to-r from-amber-500/25 via-yellow-500/20 to-amber-500/25 border-yellow-400 ring-2 ring-yellow-400/40 shadow-lg shadow-yellow-500/20"
                          : "col-span-2 sm:col-span-2 bg-gradient-to-r from-amber-500/10 to-yellow-500/5 border-yellow-400/30 text-yellow-400/70"
                        : isClaimed
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                        : isToday
                        ? "bg-yellow-400/15 border-yellow-400 ring-2 ring-yellow-400/30 shadow-md shadow-yellow-500/15 text-white"
                        : "bg-white/[0.02] border-white/5 text-gray-400"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className={isToday ? "text-yellow-300 font-black" : ""}>
                        {s.label}
                      </span>
                      {isClaimed ? (
                        <span className="text-emerald-400 font-black">✓</span>
                      ) : isToday ? (
                        <span className="animate-ping h-1.5 w-1.5 rounded-full bg-yellow-400 inline-block" />
                      ) : (
                        <span className="text-gray-600 text-[10px]">🔒</span>
                      )}
                    </div>
                    <p
                      className={`text-base font-black mt-2 ${
                        isClaimed
                          ? "text-emerald-400"
                          : isToday
                          ? "text-yellow-400 text-lg"
                          : s.isJackpot
                          ? "text-yellow-400/80"
                          : "text-white"
                      }`}
                    >
                      {RUPEE}
                      {s.amount}
                    </p>
                    <span
                      className={`text-[10px] block mt-0.5 font-medium ${
                        isClaimed
                          ? "text-emerald-400"
                          : isToday
                          ? "text-yellow-300 font-bold"
                          : "text-gray-500"
                      }`}
                    >
                      {isClaimed ? "Claimed ✓" : isToday ? "TODAY 🎁" : "Locked 🔒"}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2 text-xs text-gray-400">
              <p className="flex items-center gap-2">
                <span className="text-green-400 font-bold">✓</span>
                <span>
                  <strong>Strict 24H Lock:</strong> Ek din me sirf 1 spin claim kiya ja sakta hai.
                </span>
              </p>
              <p className="flex items-center gap-2">
                <span className="text-green-400 font-bold">✓</span>
                <span>
                  <strong>Date-Wise Progression:</strong> Har agle din ₹10 se shuru hoke ₹50 Jackpot tak badhta hai.
                </span>
              </p>
              <p className="flex items-center gap-2">
                <span className="text-green-400 font-bold">✓</span>
                <span>
                  <strong>Real Wallet Credit:</strong> Bonus instant wallet balance me add hota hai bina kisi condition ke.
                </span>
              </p>
            </div>
          </div>

          {/* Quick Tip Card */}
          <div className="rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-[#111827] to-[#111827] p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-lg shrink-0">
                ₹
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">Instant Real Cash Credit</h4>
                <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                  Daily spin ka reward direct aapke real wallet balance me add hota hai bina kisi extra deposit requirement ke.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Win Celebration Modal */}
      {winResult && (
        <div
          id="win-celebration-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300"
        >
          <div className="rounded-3xl border border-yellow-400/40 bg-gradient-to-b from-[#1E293B] to-[#0F172A] p-8 max-w-md w-full text-center shadow-2xl relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-yellow-400/10 rounded-full blur-3xl" />
            <div className="text-5xl mb-3 animate-bounce">🎉</div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-400/20 text-yellow-300 font-bold text-xs uppercase tracking-wider mb-2">
              Day {winResult.dayInCycle} Streak Claimed!
            </div>
            <h3 className="text-3xl font-black text-white mt-1">Congratulations!</h3>
            <p className="text-gray-300 text-sm mt-2">
              Aapne jeeta hai Day {winResult.dayInCycle} ka guaranteed daily reward:
            </p>

            <div className="my-6 p-6 rounded-2xl bg-yellow-400/10 border border-yellow-400/30">
              <span className="text-4xl sm:text-5xl font-black text-yellow-400 tracking-tight">
                {RUPEE}
                {winResult.amount}
              </span>
              <p className="text-xs text-yellow-200/80 font-bold uppercase mt-1">
                Credited to Your Wallet Balance
              </p>
            </div>

            <p className="text-xs text-gray-400 mb-6">
              Streak: Day {winResult.dayInCycle}/7 🔥 · Agla spin 24 ghante / agle din unlock hoga.
            </p>

            <button
              id="claim-and-play-btn"
              onClick={() => {
                playClickSound();
                setWinResult(null);
              }}
              className="w-full py-3.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black font-black transition shadow-lg shadow-yellow-500/20"
            >
              CLAIM &amp; PLAY COINFLIP 🚀
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
