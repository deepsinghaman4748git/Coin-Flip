"use client";

import React, { useState, useEffect } from "react";
import { RUPEE } from "../lib/constants";
import { authFetch as defaultAuthFetch } from "../lib/clientAuth";

export default function ReferralView({ user, refreshUser, authFetch }) {
  const [data, setData] = useState({
    referralCode: user?.referralCode || "",
    inviteLink: "",
    referredBy: user?.referredBy || "",
    totalReferrals: 0,
    activeReferrals: 0,
    referralEarnings: user?.referralEarnings || 0,
    commissionPercent: 5,
    referralBonusAmount: 25,
    friends: [],
  });
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [friendCodeInput, setFriendCodeInput] = useState("");
  const [applyingCode, setApplyingCode] = useState(false);
  const [applyFeedback, setApplyFeedback] = useState(null); // { type, message }

  async function loadReferralData() {
    try {
      setLoading(true);
      const fetcher = typeof authFetch === "function" ? authFetch : defaultAuthFetch;
      const res = await fetcher("/api/rewards/referral", { cache: "no-store" });
      
      let json = null;
      try {
        const text = await res.text();
        if (text && (text.startsWith("{") || text.startsWith("["))) {
          json = JSON.parse(text);
        }
      } catch (parseErr) {
        console.warn("Referral JSON parse error:", parseErr);
      }

      if (json && json.success) {
        setData(json);
      }
    } catch (err) {
      console.warn("Failed to load referral details:", err.message || err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReferralData();
  }, []);

  function handleCopyCode() {
    if (!data.referralCode) return;
    navigator.clipboard?.writeText(data.referralCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }

  function handleCopyLink() {
    const link = data.inviteLink || (typeof window !== "undefined" ? `${window.location.origin}/?ref=${data.referralCode}` : "");
    if (!link) return;
    navigator.clipboard?.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  function handleWhatsAppShare() {
    const link = data.inviteLink || (typeof window !== "undefined" ? `${window.location.origin}/?ref=${data.referralCode}` : "");
    const message = `🪙 Join CoinFlip using my referral code *${data.referralCode}*!\n\n🎁 Get 100% Welcome Bonus on your first deposit!\n🔥 Win 2X instantly on CoinFlip games.\n\n👉 Join now: ${link}`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  }

  function handleTelegramShare() {
    const link = data.inviteLink || (typeof window !== "undefined" ? `${window.location.origin}/?ref=${data.referralCode}` : "");
    const message = `🪙 Join CoinFlip & get 100% Welcome Bonus on 1st deposit! Use code: ${data.referralCode}`;
    const url = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  }

  async function applyFriendCode(e) {
    e.preventDefault();
    if (!friendCodeInput.trim() || applyingCode) return;
    setApplyingCode(true);
    setApplyFeedback(null);

    try {
      const fetcher = typeof authFetch === "function" ? authFetch : defaultAuthFetch;
      const res = await fetcher("/api/rewards/referral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referralCode: friendCodeInput }),
      });
      
      let json = null;
      try {
        const text = await res.text();
        if (text && (text.startsWith("{") || text.startsWith("["))) {
          json = JSON.parse(text);
        }
      } catch (parseErr) {
        console.warn("Apply code parse error:", parseErr);
      }

      if (!res.ok || !json || !json.success) {
        setApplyFeedback({ type: "error", message: json?.message || "Failed to apply referral code." });
        return;
      }

      setApplyFeedback({ type: "success", message: json.message || "Referral code applied successfully!" });
      setFriendCodeInput("");
      await loadReferralData();
      if (refreshUser) await refreshUser();
    } catch (err) {
      console.error(err);
      setApplyFeedback({ type: "error", message: "Network error. Please try again." });
    } finally {
      setApplyingCode(false);
    }
  }

  return (
    <div className="space-y-7 max-w-5xl mx-auto">
      {/* Referral Hero Banner */}
      <section className="rounded-3xl border border-yellow-500/20 bg-gradient-to-r from-yellow-500/10 via-[#111827] to-amber-500/10 p-6 md:p-9 relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 text-xs font-bold uppercase tracking-wider mb-3">
              <span>👥</span>
              <span>Referral &amp; Lifetime Earning Program</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white">
              Refer Friends &amp; Earn <span className="text-yellow-400">5% Lifetime Commission</span>
            </h1>
            <p className="text-gray-400 text-sm md:text-base mt-2 leading-relaxed">
              Apne doston ko invite karein. Har baar jab aapka dost CoinFlip khelega ya deposit karega, aapko milegi direct wallet commission!
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap gap-3">
            <button
              onClick={handleWhatsAppShare}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm shadow-lg shadow-emerald-600/20 transition"
            >
              <span>📱</span>
              <span>Share on WhatsApp</span>
            </button>
            <button
              onClick={handleTelegramShare}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-black text-sm shadow-lg shadow-sky-600/20 transition"
            >
              <span>✈️</span>
              <span>Telegram</span>
            </button>
          </div>
        </div>
      </section>

      {/* Share Box & Referral Code */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Your Unique Code Card */}
        <div className="rounded-3xl border border-white/10 bg-[#111827] p-6 sm:p-7 space-y-4">
          <div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Your Referral Code</span>
            <div className="flex items-center justify-between mt-2 p-3.5 rounded-2xl bg-[#0B1120] border border-white/10">
              <span className="font-mono text-2xl font-black text-yellow-400 tracking-wider">
                {data.referralCode || "..."}
              </span>
              <button
                onClick={handleCopyCode}
                className="px-4 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black text-xs font-black transition"
              >
                {copiedCode ? "COPIED! ✓" : "COPY CODE"}
              </button>
            </div>
          </div>

          <div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Your Direct Invite Link</span>
            <div className="flex items-center justify-between mt-2 p-3 rounded-2xl bg-[#0B1120] border border-white/10 text-xs text-gray-300">
              <span className="truncate pr-2 font-mono">
                {data.inviteLink || (typeof window !== "undefined" ? `${window.location.origin}/?ref=${data.referralCode}` : "")}
              </span>
              <button
                onClick={handleCopyLink}
                className="shrink-0 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold transition"
              >
                {copiedLink ? "COPIED! ✓" : "COPY"}
              </button>
            </div>
          </div>
        </div>

        {/* 3 Step Process Card */}
        <div className="rounded-3xl border border-white/10 bg-[#111827] p-6 sm:p-7 flex flex-col justify-between space-y-4">
          <h3 className="font-black text-lg text-white">How It Works (पैसे कैसे कमाएं)</h3>

          <div className="space-y-3 text-xs">
            <div className="flex items-start gap-3 p-2.5 rounded-xl bg-white/[0.02]">
              <span className="h-6 w-6 rounded-lg bg-yellow-400/20 text-yellow-400 flex items-center justify-center font-bold shrink-0">
                1
              </span>
              <div>
                <p className="font-bold text-white">Share Referral Link</p>
                <p className="text-gray-400">Apna referral link WhatsApp ya Telegram par share karein.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-2.5 rounded-xl bg-white/[0.02]">
              <span className="h-6 w-6 rounded-lg bg-green-400/20 text-green-400 flex items-center justify-center font-bold shrink-0">
                2
              </span>
              <div>
                <p className="font-bold text-white">Friend Registers &amp; Deposits</p>
                <p className="text-gray-400">Dost ko milega 100% Welcome Bonus aur aapko instant ₹{data.referralBonusAmount} reward!</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-2.5 rounded-xl bg-white/[0.02]">
              <span className="h-6 w-6 rounded-lg bg-blue-400/20 text-blue-400 flex items-center justify-center font-bold shrink-0">
                3
              </span>
              <div>
                <p className="font-bold text-white">Lifetime {data.commissionPercent}% Commission</p>
                <p className="text-gray-400">Dost ke har game aur activity par commission seedhe aapke wallet me.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Referral Stats Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-3xl border border-white/10 bg-[#111827] p-5">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Invited</span>
          <p className="text-3xl font-black text-white mt-2">{data.totalReferrals}</p>
          <span className="text-xs text-gray-500 mt-0.5 block">Doston ne join kiya</span>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#111827] p-5">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active Depositors</span>
          <p className="text-3xl font-black text-emerald-400 mt-2">{data.activeReferrals}</p>
          <span className="text-xs text-gray-500 mt-0.5 block">Pehla deposit kiya</span>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#111827] p-5">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Earnings</span>
          <p className="text-3xl font-black text-yellow-400 mt-2">{RUPEE}{Number(data.referralEarnings || 0).toFixed(2)}</p>
          <span className="text-xs text-gray-500 mt-0.5 block">Wallet me credit</span>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#111827] p-5">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Commission Rate</span>
          <p className="text-3xl font-black text-sky-400 mt-2">{data.commissionPercent}%</p>
          <span className="text-xs text-gray-500 mt-0.5 block">Lifetime guarantee</span>
        </div>
      </div>

      {/* Enter Friend's Referral Code if not yet set */}
      {!data.referredBy && (
        <section className="rounded-3xl border border-yellow-400/20 bg-gradient-to-r from-yellow-500/5 via-[#111827] to-transparent p-6 sm:p-7">
          <div className="max-w-xl">
            <h3 className="font-black text-lg text-white">Have a Friend&#39;s Referral Code?</h3>
            <p className="text-xs text-gray-400 mt-1 mb-4">
              Agar aapne direct register kiya hai aur aapke paas kisi dost ka code hai, to yahan daal kar link karein.
            </p>

            <form onSubmit={applyFriendCode} className="flex gap-3">
              <input
                value={friendCodeInput}
                onChange={(e) => setFriendCodeInput(e.target.value.toUpperCase())}
                placeholder="Enter Referral Code (e.g. CF123456)"
                className="flex-1 rounded-xl bg-[#0B1120] border border-white/10 px-4 py-3 text-sm uppercase font-mono text-white outline-none focus:border-yellow-400"
              />
              <button
                type="submit"
                disabled={applyingCode || !friendCodeInput.trim()}
                className="px-6 py-3 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black font-black text-xs disabled:opacity-50 transition shrink-0"
              >
                {applyingCode ? "Applying..." : "APPLY CODE"}
              </button>
            </form>

            {applyFeedback && (
              <p className={`text-xs font-bold mt-3 ${applyFeedback.type === "success" ? "text-green-400" : "text-red-400"}`}>
                {applyFeedback.message}
              </p>
            )}
          </div>
        </section>
      )}

      {/* Invited Friends List */}
      <section className="rounded-3xl border border-white/10 bg-[#111827] overflow-hidden">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div>
            <h3 className="font-black text-lg text-white">Invited Friends List</h3>
            <p className="text-xs text-gray-400 mt-0.5">Aapke referral link se judne wale dost</p>
          </div>
          <span className="text-xs font-bold bg-white/10 px-3 py-1 rounded-full text-gray-300">
            {data.friends?.length || 0} Friends
          </span>
        </div>

        {!data.friends || data.friends.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            <span className="text-3xl block mb-2">👥</span>
            Abhi tak koi dost nahi juda. Apna invite link WhatsApp par share karein!
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {data.friends.map((friend) => (
              <div key={friend.id} className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-yellow-400/10 text-yellow-400 flex items-center justify-center font-bold text-sm">
                    {friend.name?.slice(0, 1) || "U"}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-white">{friend.name}</p>
                    <p className="text-[11px] text-gray-500">
                      Joined: {new Date(friend.joinedAt).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                    friend.active
                      ? "bg-green-500/10 text-green-400 border-green-500/20"
                      : "bg-white/5 text-gray-400 border-white/10"
                  }`}>
                    {friend.active ? "Active Player" : "Registered"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
