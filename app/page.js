"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { Volume2, VolumeX, Sparkles, Bot, TrendingUp, Clock, RotateCcw, Trophy, CheckCircle2, ShieldCheck, Flame, Zap, MoreVertical } from "lucide-react";
import DailySpinView from "./components/DailySpinView.jsx";
import ReferralView from "./components/ReferralView.jsx";
import {
  isSoundEnabled,
  setSoundEnabled,
  playClickSound,
  playCoinSpinSound,
  playCoinLandSound,
  playWinSound,
  playLoseSound,
  playTimerTickSound,
  playWindWhooshSound,
  playBetPlacedSound,
  playRoundStartBell,
} from "./lib/soundEffects.js";

const RUPEE = "\u20B9";

export async function authFetch(url, options = {}) {
  let token = null;
  if (typeof window !== "undefined") {
    try {
      token =
        localStorage.getItem("coinflip_token") ||
        sessionStorage.getItem("coinflip_token");
    } catch {}
  }

  const headers = {
    ...(options.headers || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
    headers["x-auth-token"] = token;
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });
}

export default function Home() {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);
  const [authMode, setAuthMode] = useState("login");
  const [section, setSection] = useState("home");

  async function loadUser() {
    try {
      // Don't override if current user is in demo mode
      if (user?.isDemo) return;

      const cached =
        typeof window !== "undefined"
          ? localStorage.getItem("coinflip_user")
          : null;
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (!parsed.isDemo) setUser(parsed);
        } catch {}
      }

      const response = await authFetch("/api/me", { cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (response.ok && data?.success) {
        setUser(data.user);
        if (typeof window !== "undefined") {
          localStorage.setItem("coinflip_user", JSON.stringify(data.user));
        }
      } else {
        if (!cached && !user?.isDemo) setUser(null);
      }
    } catch {
      // Keep cached if offline
    } finally {
      setBooting(false);
    }
  }

  useEffect(() => {
    loadUser();
  }, []);

  function startDemo() {
    const demoGuest = {
      _id: "demo_guest",
      name: "Demo Player",
      email: "demo@guest.local",
      walletBalance: 100,
      isDemo: true,
      role: "guest",
    };
    setUser(demoGuest);
    setSection("game");
  }

  async function logout() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("coinflip_token");
      localStorage.removeItem("coinflip_user");
    }
    await authFetch("/api/logout", { method: "POST" }).catch(() => {});
    setUser(null);
    setSection("home");
    setAuthMode("login");
  }

  if (booting) {
    return <LoadingScreen />;
  }

  if (!user) {
    return (
      <AuthScreen
        mode={authMode}
        onModeChange={setAuthMode}
        onStartDemo={startDemo}
        onLoggedIn={(loggedUser, token) => {
          if (typeof window !== "undefined") {
            if (token) localStorage.setItem("coinflip_token", token);
            if (loggedUser)
              localStorage.setItem("coinflip_user", JSON.stringify(loggedUser));
          }
          setUser(loggedUser);
          setSection("home");
        }}
      />
    );
  }

  return (
    <AppShell
      user={user}
      section={section}
      setSection={setSection}
      logout={logout}
      refreshUser={loadUser}
    />
  );
}

function LoadingScreen() {
  return (
    <main className="min-h-screen bg-[#070B14] text-white flex items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-yellow-400 text-black flex items-center justify-center text-xl font-black">
          CF
        </div>
        <p className="text-gray-400">Loading CoinFlip...</p>
      </div>
    </main>
  );
}

function AuthScreen({ mode, onModeChange, onLoggedIn, onStartDemo }) {
  const isLogin = mode === "login";
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    referralCode: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Forgot Password Modal States
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1 = identifier, 2 = verify & new pass
  const [forgotIdentifier, setForgotIdentifier] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotNewPass, setForgotNewPass] = useState("");
  const [forgotConfirmPass, setForgotConfirmPass] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");
  const [forgotBusy, setForgotBusy] = useState(false);
  const [demoOtpNotification, setDemoOtpNotification] = useState("");

  // Auto-detect referral code from URL query parameter (?ref=CF123456)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref");
      if (ref) {
        setForm((prev) => ({ ...prev, referralCode: ref.toUpperCase().trim() }));
        if (mode === "login") {
          onModeChange("register");
        }
      }
    }
  }, [mode]);

  function update(name, value) {
    setForm((old) => ({ ...old, [name]: value }));
    setError("");
  }

  // SEND OTP for Password Reset
  async function handleSendOtp(e) {
    if (e) e.preventDefault();
    setForgotError("");
    setForgotSuccess("");
    setDemoOtpNotification("");

    if (!forgotIdentifier.trim()) {
      setForgotError("Please enter your registered Mobile Number or Email.");
      return;
    }

    setForgotBusy(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_otp",
          identifier: forgotIdentifier.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setForgotError(data.message || "Failed to send OTP.");
        return;
      }

      setForgotSuccess(data.message || "OTP sent successfully!");
      if (data.otp) {
        setDemoOtpNotification(data.otp);
        setForgotOtp(data.otp); // Pre-fill for instant convenience
      }
      setForgotStep(2);
    } catch (err) {
      setForgotError("Network error. Please try again.");
    } finally {
      setForgotBusy(false);
    }
  }

  // VERIFY OTP & RESET PASSWORD
  async function handleVerifyReset(e) {
    if (e) e.preventDefault();
    setForgotError("");
    setForgotSuccess("");

    if (!forgotOtp.trim()) {
      setForgotError("Please enter the 6-digit OTP code.");
      return;
    }

    if (!forgotNewPass || forgotNewPass.length < 6) {
      setForgotError("New password must be at least 6 characters.");
      return;
    }

    if (forgotNewPass !== forgotConfirmPass) {
      setForgotError("Passwords do not match.");
      return;
    }

    setForgotBusy(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify_reset",
          identifier: forgotIdentifier.trim(),
          otp: forgotOtp.trim(),
          newPassword: forgotNewPass,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setForgotError(data.message || "Failed to reset password.");
        return;
      }

      setForgotSuccess("Password reset successful! Redirecting to login...");
      setTimeout(() => {
        setForgotOpen(false);
        setForgotStep(1);
        setForgotIdentifier("");
        setForgotOtp("");
        setForgotNewPass("");
        setForgotConfirmPass("");
        setDemoOtpNotification("");
        setForm((prev) => ({ ...prev, password: "" }));
        onModeChange("login");
        setError("Password reset successfully! Please login with your new password.");
      }, 1500);
    } catch (err) {
      setForgotError("Network error. Please try again.");
    } finally {
      setForgotBusy(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setError("");

    if (!form.email || !form.password || (!isLogin && !form.name)) {
      setError("Please fill all required fields.");
      return;
    }

    if (!isLogin) {
      if (form.password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }
      if (form.password !== form.confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }

    setBusy(true);

    try {
      const endpoint = isLogin ? "/api/login" : "/api/register";
      const body = isLogin
        ? { email: form.email, identifier: form.email, password: form.password }
        : {
            name: form.name,
            email: form.email,
            phone: form.phone,
            password: form.password,
            referralCode: form.referralCode,
          };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || "Request failed.");
        return;
      }

      if (isLogin) {
        if (typeof window !== "undefined" && data.token) {
          try {
            localStorage.setItem("coinflip_token", data.token);
            sessionStorage.setItem("coinflip_token", data.token);
            if (data.user) {
              localStorage.setItem("coinflip_user", JSON.stringify(data.user));
              sessionStorage.setItem("coinflip_user", JSON.stringify(data.user));
            }
          } catch {}
        }
        onLoggedIn(data.user, data.token);
      } else {
        setForm({
          name: "",
          email: form.email,
          phone: "",
          password: "",
          confirmPassword: "",
          referralCode: "",
        });
        onModeChange("login");
        setError("Account created. Please login.");
      }
    } catch (err) {
      console.error(err);
      setError("Unable to connect. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#070B14] text-white overflow-hidden flex flex-col justify-between">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(234,179,8,0.16),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(34,197,94,0.08),transparent_30%)]" />

      {/* Top Animated Hindi Headline Ticker */}
      <div className="relative z-20 w-full bg-gradient-to-r from-yellow-500/15 via-yellow-400/25 to-yellow-500/15 border-b border-yellow-400/30 py-2.5 overflow-hidden backdrop-blur-md">
        <div className="animate-marquee whitespace-nowrap text-xs sm:text-sm font-bold text-yellow-300 flex items-center">
          <span className="mx-6 flex items-center gap-2">
            <span>🪙</span>
            <span>“भारत में Flip (सिक्के) का नया अंदाज़।”</span>
            <span className="text-gray-400">•</span>
            <span className="text-white">हर गेम में रोमांच, हर कदम पर भरोसा।</span>
            <span className="text-gray-400">•</span>
            <span className="text-green-400">खेलिए • जीतिए • पाइए 2X इनाम + शानदार बोनस 🎁</span>
          </span>
          <span className="mx-6 flex items-center gap-2">
            <span>🪙</span>
            <span>“भारत में Flip (सिक्के) का नया अंदाज़।”</span>
            <span className="text-gray-400">•</span>
            <span className="text-white">हर गेम में रोमांच, हर कदम पर भरोसा।</span>
            <span className="text-gray-400">•</span>
            <span className="text-green-400">खेलिए • जीतिए • पाइए 2X इनाम + शानदार बोनस 🎁</span>
          </span>
          <span className="mx-6 flex items-center gap-2">
            <span>🪙</span>
            <span>“भारत में Flip (सिक्के) का नया अंदाज़।”</span>
            <span className="text-gray-400">•</span>
            <span className="text-white">हर गेम में रोमांच, हर कदम पर भरोसा।</span>
            <span className="text-gray-400">•</span>
            <span className="text-green-400">खेलिए • जीतिए • पाइए 2X इनाम + शानदार बोनस 🎁</span>
          </span>
          <span className="mx-6 flex items-center gap-2">
            <span>🪙</span>
            <span>“भारत में Flip (सिक्के) का नया अंदाज़।”</span>
            <span className="text-gray-400">•</span>
            <span className="text-white">हर गेम में रोमांच, हर कदम पर भरोसा।</span>
            <span className="text-gray-400">•</span>
            <span className="text-green-400">खेलिए • जीतिए • पाइए 2X इनाम + शानदार बोनस 🎁</span>
          </span>
        </div>
      </div>

      <div className="relative min-h-[calc(100vh-42px)] max-w-7xl mx-auto px-5 py-6 lg:px-8 flex flex-col w-full">
        <header className="flex items-center justify-between">
          <button
            onClick={() => onModeChange("login")}
            className="flex items-center gap-3"
          >
            <span className="h-11 w-11 rounded-xl bg-yellow-400 text-black flex items-center justify-center font-black">
              CF
            </span>
            <span className="text-2xl font-black tracking-tight">CoinFlip</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-500/10 border border-green-500/20 text-green-400">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
              सुरक्षित गेमिंग वॉलेट
            </span>
          </div>
        </header>

        <div className="flex-1 grid lg:grid-cols-2 gap-10 items-center py-8">
          <section className="hidden lg:block">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 text-xs font-bold uppercase tracking-wider mb-4">
              <span>🇮🇳</span>
              <span>100% निष्पक्ष &amp; सुरक्षित प्लेटफॉर्म</span>
            </div>

            <h1 className="text-4xl xl:text-5xl font-black leading-tight text-white">
              “भारत में <span className="text-yellow-400">Flip (सिक्के)</span> का नया अंदाज़।”
            </h1>

            <p className="text-xl font-medium text-gray-300 mt-4 leading-relaxed">
              हर गेम में रोमांच, हर कदम पर भरोसा।
            </p>

            <div className="mt-6 p-4 rounded-2xl bg-gradient-to-r from-yellow-400/10 via-yellow-400/5 to-transparent border border-yellow-400/20 max-w-xl">
              <p className="text-base font-bold text-yellow-300 flex items-center gap-2">
                <span>🎁</span>
                <span>खेलिए • जीतिए • पाइए 2X इनाम + शानदार बोनस</span>
              </p>
            </div>

            {/* 1-Click Free Demo CTA in Hero Section */}
            <div className="mt-7 max-w-xl">
              <button
                type="button"
                onClick={onStartDemo}
                className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:from-yellow-300 hover:to-amber-400 text-black font-black text-sm uppercase tracking-wider shadow-xl shadow-yellow-500/25 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all group"
              >
                <span className="text-xl animate-spin">🪙</span>
                <span>TRY 1-CLICK FREE DEMO (₹100 CHIPS)</span>
                <span className="group-hover:translate-x-1 transition-transform">➔</span>
              </button>
              <p className="text-xs text-gray-400 mt-2 font-semibold flex items-center gap-2">
                <span className="text-emerald-400">✓ No Login Required</span>
                <span>•</span>
                <span>✓ ₹100 Free Virtual Balance</span>
                <span>•</span>
                <span>✓ Instant 10s Fast Round</span>
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-8 max-w-xl">
              {[
                { n: "01", title: "वॉलेट", desc: "इंस्टेंट डिपॉजिट/विथड्रॉल" },
                { n: "02", title: "CoinFlip", desc: "2X पेआउट मल्टीप्लायर" },
                { n: "03", title: "इतिहास", desc: "लाइव ट्रांसपेरेंट रिकॉर्ड" },
              ].map((item) => (
                <div
                  key={item.n}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 hover:border-yellow-400/30 transition"
                >
                  <div className="text-yellow-400 font-black text-sm">{item.n}</div>
                  <div className="font-bold text-white text-sm mt-1">{item.title}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{item.desc}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="w-full max-w-md mx-auto">
            <div className="rounded-3xl border border-white/10 bg-[#111827]/95 shadow-2xl p-6 sm:p-8">
              {/* 1-Click Free Demo Mode Banner Card inside Form */}
              <div
                onClick={onStartDemo}
                className="mb-5 cursor-pointer group relative overflow-hidden rounded-2xl border-2 border-yellow-400/50 bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-amber-500/20 p-3.5 shadow-lg shadow-yellow-500/10 hover:border-yellow-300 hover:shadow-yellow-400/20 transition-all active:scale-[0.98]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-600 p-0.5 shadow-md flex items-center justify-center group-hover:scale-110 transition-transform">
                      <div className="w-full h-full rounded-[9px] bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-black text-lg font-black">
                        🪙
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-black text-yellow-300 uppercase tracking-wider">
                          FREE DEMO PLAY
                        </span>
                        <span className="bg-red-500 text-white text-[8px] font-black px-1.5 py-0.2 rounded-full uppercase animate-pulse">
                          NO LOGIN
                        </span>
                      </div>
                      <p className="text-xs font-black text-white group-hover:text-yellow-300 transition">
                        Play CoinFlip with ₹100 Free Chips
                      </p>
                    </div>
                  </div>
                  <span className="w-7 h-7 rounded-full bg-yellow-400 text-black flex items-center justify-center font-black text-xs group-hover:translate-x-0.5 transition-transform shrink-0 shadow">
                    ➔
                  </span>
                </div>
                <p className="text-[10px] text-gray-300 mt-2 font-medium border-t border-yellow-400/20 pt-1.5 flex items-center justify-between">
                  <span>⚡ Bina account banaye instant try karein</span>
                  <span className="text-yellow-400 font-bold">1-Click Play 🎮</span>
                </p>
              </div>

              <div className="flex bg-[#0B1120] rounded-xl p-1 mb-7">
                <button
                  onClick={() => onModeChange("login")}
                  className={`flex-1 py-2.5 rounded-lg font-bold text-sm ${
                    isLogin
                      ? "bg-yellow-400 text-black"
                      : "text-gray-400"
                  }`}
                >
                  Login
                </button>
                <button
                  onClick={() => onModeChange("register")}
                  className={`flex-1 py-2.5 rounded-lg font-bold text-sm ${
                    !isLogin
                      ? "bg-yellow-400 text-black"
                      : "text-gray-400"
                  }`}
                >
                  Register
                </button>
              </div>

              <h2 className="text-3xl font-black">
                {isLogin ? "Welcome back" : "Create account"}
              </h2>
              <p className="text-gray-500 mt-2 mb-6">
                {isLogin
                  ? "Login to continue to your CoinFlip dashboard."
                  : "Create your account to start using CoinFlip."}
              </p>

              <form onSubmit={submit} className="space-y-4">
                {!isLogin && (
                  <input
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    placeholder="Full name"
                    autoComplete="name"
                    className={inputClass}
                  />
                )}

                <input
                  type="text"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder={isLogin ? "Email address or Mobile Number" : "Email address"}
                  autoComplete="email"
                  className={inputClass}
                />

                {!isLogin && (
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => update("phone", e.target.value)}
                    placeholder="Mobile Number (e.g. 9876543210)"
                    autoComplete="tel"
                    className={inputClass}
                  />
                )}

                <div>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => update("password", e.target.value)}
                    placeholder="Password"
                    autoComplete={isLogin ? "current-password" : "new-password"}
                    className={inputClass}
                  />
                  {isLogin && (
                    <div className="flex justify-end mt-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setForgotOpen(true);
                          setForgotStep(1);
                          setForgotIdentifier(form.email || "");
                          setForgotOtp("");
                          setForgotNewPass("");
                          setForgotConfirmPass("");
                          setForgotError("");
                          setForgotSuccess("");
                          setDemoOtpNotification("");
                        }}
                        className="text-xs text-yellow-400 hover:text-yellow-300 hover:underline font-bold transition flex items-center gap-1"
                      >
                        <span>🔑</span>
                        <span>Forgot Password? (पासवर्ड भूल गए?)</span>
                      </button>
                    </div>
                  )}
                </div>

                {!isLogin && (
                  <>
                    <input
                      type="password"
                      value={form.confirmPassword}
                      onChange={(e) =>
                        update("confirmPassword", e.target.value)
                      }
                      placeholder="Confirm password"
                      autoComplete="new-password"
                      className={inputClass}
                    />
                    <div className="relative">
                      <input
                        value={form.referralCode}
                        onChange={(e) =>
                          update("referralCode", e.target.value.toUpperCase())
                        }
                        placeholder="Referral Code (Optional e.g. CF123456)"
                        className={inputClass + " uppercase font-mono text-sm"}
                      />
                      {form.referralCode && (
                        <span className="absolute right-3 top-3.5 text-xs bg-yellow-400/20 text-yellow-300 font-bold px-2 py-0.5 rounded">
                          ✓ Referral Applied
                        </span>
                      )}
                    </div>

                    <div className="p-3 rounded-xl bg-gradient-to-r from-yellow-500/10 via-amber-500/10 to-transparent border border-yellow-400/20 text-xs text-yellow-300 flex items-center gap-2">
                      <span className="text-base">🎁</span>
                      <span>
                        <strong>100% Welcome Bonus:</strong> Pehle recharge par 100% instant bonus milega!
                      </span>
                    </div>
                  </>
                )}

                {error && (
                  <div
                    className={`rounded-xl px-4 py-3 text-sm ${
                      error.startsWith("Account created")
                        ? "bg-green-500/10 border border-green-500/20 text-green-400"
                        : "bg-red-500/10 border border-red-500/20 text-red-400"
                    }`}
                  >
                    {error}
                  </div>
                )}

                <button
                  disabled={busy}
                  className="w-full rounded-xl bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-black font-black py-3.5 transition"
                >
                  {busy
                    ? "Please wait..."
                    : isLogin
                    ? "Login to CoinFlip"
                    : "Create Account"}
                </button>
              </form>

              <p className="text-center text-gray-500 text-sm mt-6">
                {isLogin ? "New to CoinFlip?" : "Already have an account?"}{" "}
                <button
                  onClick={() =>
                    onModeChange(isLogin ? "register" : "login")
                  }
                  className="text-yellow-400 font-bold hover:underline"
                >
                  {isLogin ? "Create account" : "Login"}
                </button>
              </p>
            </div>
          </section>
        </div>
      </div>

      {/* FORGOT PASSWORD MODAL */}
      {forgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#111827] border border-yellow-400/30 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 text-white animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-yellow-400/20 text-yellow-400 flex items-center justify-center text-lg font-black border border-yellow-400/30">
                  🔑
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">
                    Reset Password
                  </h3>
                  <p className="text-[11px] text-gray-400">
                    OTP ke zariye naya password banayein
                  </p>
                </div>
              </div>
              <button
                onClick={() => setForgotOpen(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center text-sm transition"
              >
                ✕
              </button>
            </div>

            {/* Stepper indicator */}
            <div className="flex items-center gap-2">
              <div className={`flex-1 h-1.5 rounded-full transition-all ${forgotStep >= 1 ? "bg-yellow-400" : "bg-white/10"}`} />
              <div className={`flex-1 h-1.5 rounded-full transition-all ${forgotStep >= 2 ? "bg-yellow-400" : "bg-white/10"}`} />
            </div>

            {/* Feedback messages */}
            {forgotError && (
              <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-semibold flex items-center gap-2">
                <span>⚠️</span>
                <span>{forgotError}</span>
              </div>
            )}

            {forgotSuccess && (
              <div className="p-3 rounded-xl bg-green-500/15 border border-green-500/30 text-green-300 text-xs font-semibold flex items-center gap-2">
                <span>✓</span>
                <span>{forgotSuccess}</span>
              </div>
            )}

            {/* Demo OTP Alert Simulation Badge */}
            {demoOtpNotification && (
              <div className="p-3 rounded-xl bg-yellow-400/15 border border-yellow-400/40 text-yellow-300 text-xs flex items-center justify-between gap-2 shadow-inner">
                <div className="flex items-center gap-2">
                  <span className="text-base">📩</span>
                  <div>
                    <span className="font-bold block">SMS / Mobile OTP Code:</span>
                    <span className="font-mono text-base font-black tracking-widest text-white">{demoOtpNotification}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setForgotOtp(demoOtpNotification)}
                  className="px-2.5 py-1 rounded-lg bg-yellow-400 text-black text-[11px] font-bold hover:bg-yellow-300 transition"
                >
                  Use OTP
                </button>
              </div>
            )}

            {/* STEP 1: Enter Mobile / Email */}
            {forgotStep === 1 && (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                    Registered Mobile Number or Email
                  </label>
                  <input
                    type="text"
                    value={forgotIdentifier}
                    onChange={(e) => setForgotIdentifier(e.target.value)}
                    placeholder="e.g. 9876543210 ya user@example.com"
                    autoFocus
                    className={inputClass}
                  />
                  <p className="text-[11px] text-gray-400 mt-1.5">
                    Aapke registered number par 6-digit OTP bheja jayega.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotBusy || !forgotIdentifier.trim()}
                    className="px-5 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-black text-xs font-black transition shadow-lg shadow-yellow-400/20"
                  >
                    {forgotBusy ? "Sending OTP..." : "Send OTP ➔"}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: Enter OTP & New Password */}
            {forgotStep === 2 && (
              <form onSubmit={handleVerifyReset} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                    Enter 6-Digit OTP:
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="e.g. 583921"
                    className={inputClass + " font-mono text-base tracking-widest text-center font-black"}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                    New Password:
                  </label>
                  <input
                    type="password"
                    value={forgotNewPass}
                    onChange={(e) => setForgotNewPass(e.target.value)}
                    placeholder="At least 6 characters"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                    Confirm New Password:
                  </label>
                  <input
                    type="password"
                    value={forgotConfirmPass}
                    onChange={(e) => setForgotConfirmPass(e.target.value)}
                    placeholder="Repeat new password"
                    className={inputClass}
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotStep(1);
                      setForgotError("");
                      setForgotSuccess("");
                    }}
                    className="text-xs text-gray-400 hover:text-white font-bold"
                  >
                    ← Change Mobile/Email
                  </button>
                  <button
                    type="submit"
                    disabled={forgotBusy || !forgotOtp || !forgotNewPass}
                    className="px-5 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-black text-xs font-black transition shadow-lg shadow-yellow-400/20"
                  >
                    {forgotBusy ? "Resetting..." : "Set New Password ✓"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

const inputClass =
  "w-full rounded-xl bg-[#0B1120] border border-white/10 px-4 py-3.5 outline-none focus:border-yellow-400 text-white placeholder:text-gray-600";

function AppShell({ user, section, setSection, logout, refreshUser }) {
  const [mobileNav, setMobileNav] = useState(false);
  const [threeDotOpen, setThreeDotOpen] = useState(false);
  const [soundEnabledState, setSoundEnabledState] = useState(true);
  const [announcement, setAnnouncement] = useState("");
  const [announcementDismissed, setAnnouncementDismissed] = useState(false);
  const [isSyncingBalance, setIsSyncingBalance] = useState(false);

  useEffect(() => {
    setSoundEnabledState(isSoundEnabled());
  }, []);

  const handleToggleSound = () => {
    const next = !soundEnabledState;
    setSoundEnabledState(next);
    setSoundEnabled(next);
    if (next) {
      playClickSound();
    }
  };

  // Sync user and announcement whenever section changes
  useEffect(() => {
    refreshUser();
  }, [section]);

  // Real-time live polling every 3.5 seconds + window focus & visibility listeners
  useEffect(() => {
    async function fetchNotice() {
      try {
        const res = await authFetch("/api/game/settings", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (data?.success && data.settings?.announcementEnabled && data.settings?.announcement) {
          setAnnouncement(data.settings.announcement);
        } else {
          setAnnouncement("");
        }
      } catch (e) {
        // silent
      }
    }

    const onFocus = () => {
      refreshUser();
      fetchNotice();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    fetchNotice();
    const noticeInterval = setInterval(fetchNotice, 25000);
    const balanceInterval = setInterval(() => {
      refreshUser();
    }, 3500);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      clearInterval(noticeInterval);
      clearInterval(balanceInterval);
    };
  }, [refreshUser]);

  const handleHeaderRefresh = async () => {
    setIsSyncingBalance(true);
    await refreshUser();
    setTimeout(() => setIsSyncingBalance(false), 600);
  };

  const nav = [
    { id: "home", label: "Dashboard" },
    { id: "game", label: "Play CoinFlip" },
    { id: "spin", label: "Daily Spin 🎁" },
    { id: "referral", label: "Refer & Earn 👥" },
    { id: "wallet", label: "Wallet" },
    { id: "history", label: "Game History" },
    { id: "profile", label: "Profile" },
  ];

  const mobileTabs = [
    { id: "home", label: "Home", icon: "🏠" },
    { id: "spin", label: "Daily Spin", icon: "🎁" },
    { id: "game", label: "Play Flip", isCenter: true },
    { id: "referral", label: "Refer", icon: "👥" },
    { id: "wallet", label: "Wallet", icon: "💳" },
  ];

  return (
    <main className="min-h-screen bg-[#070B14] text-white flex flex-col justify-between">
      <div>
        {/* Demo Mode Notice Bar */}
        {user?.isDemo && (
          <div className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 font-black text-xs py-2.5 px-4 flex flex-wrap items-center justify-between shadow-lg sticky top-0 z-50 gap-2">
            <div className="flex items-center gap-2">
              <span className="bg-black text-yellow-300 text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider">
                🎮 FREE DEMO MODE
              </span>
              <span>Aap Free Trial Demo me khel rahe hain (₹100 Virtual Balance).</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={logout}
                className="bg-black hover:bg-slate-900 text-yellow-400 font-black px-3.5 py-1 rounded-lg text-xs transition shadow cursor-pointer"
              >
                Register &amp; Win Real Cash ➔
              </button>
            </div>
          </div>
        )}

        {/* Broadcast Announcement Bar */}
        {announcement && !announcementDismissed && !user?.isDemo && (
          <div className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 font-bold text-xs py-2 px-4 flex items-center justify-between shadow-md relative z-50">
            <div className="flex items-center gap-2 overflow-hidden flex-1 mr-3">
              <span className="bg-black text-yellow-300 text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider shrink-0">
                📢 NOTICE
              </span>
              <div className="truncate font-semibold tracking-wide">
                {announcement}
              </div>
            </div>
            <button
              onClick={() => setAnnouncementDismissed(true)}
              className="text-slate-950/70 hover:text-black text-sm px-1.5 py-0.5 rounded hover:bg-black/10 transition shrink-0 font-black cursor-pointer"
              title="Dismiss Notice"
            >
              ✕
            </button>
          </div>
        )}

        <header className="sticky top-0 z-40 border-b border-white/10 bg-[#070B14]/95 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2">
            <button
              onClick={() => setSection("home")}
              className="flex items-center gap-2.5 cursor-pointer select-none shrink-0"
            >
              <span className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-yellow-400 text-black flex items-center justify-center font-black shadow-md shadow-yellow-400/20">
                CF
              </span>
              <span className="text-lg sm:text-xl font-black tracking-tight">CoinFlip</span>
              {user?.isDemo && (
                <span className="px-1.5 py-0.5 rounded-md bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 text-[9px] font-black uppercase">
                  Demo
                </span>
              )}
            </button>

            {/* Desktop Navigation Links */}
            <div className="hidden lg:flex items-center gap-1">
              {nav.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSection(item.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    section === item.id
                      ? "bg-yellow-400 text-black shadow-md shadow-yellow-500/20"
                      : "text-gray-300 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Top Right Header Controls */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {user?.role === "admin" && (
                <a
                  href="/admin/dashboard"
                  className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold hover:bg-purple-500/30 transition"
                >
                  <span>⚙️</span>
                  <span>Admin</span>
                </a>
              )}

              {/* Wallet Balance Badge */}
              <div
                id="header-balance-container"
                onClick={handleHeaderRefresh}
                title={user?.isDemo ? "Demo Balance" : "Click to refresh live balance"}
                className={`flex items-center rounded-xl px-2.5 sm:px-3.5 py-1.5 shadow-sm cursor-pointer transition group select-none ${
                  user?.isDemo
                    ? "bg-yellow-500/15 border border-yellow-500/30 hover:bg-yellow-500/25"
                    : "bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20"
                }`}
              >
                <span className={`text-[10px] sm:text-xs font-semibold mr-1.5 uppercase tracking-wider flex items-center gap-1 ${
                  user?.isDemo ? "text-yellow-300" : "text-emerald-400/80"
                }`}>
                  <span className="hidden sm:inline">{user?.isDemo ? "Demo Chips" : "Balance"}</span>
                  <span className="sm:hidden">₹</span>
                  {!user?.isDemo && (
                    <span className={`text-[10px] text-emerald-300 group-hover:rotate-180 transition-transform ${isSyncingBalance ? "animate-spin" : ""}`}>🔄</span>
                  )}
                </span>
                <span id="header-wallet-balance" className={`font-black text-xs sm:text-base tracking-tight tabular-nums ${
                  user?.isDemo ? "text-yellow-300" : "text-emerald-400"
                }`}>
                  {RUPEE}
                  {Number(user?.walletBalance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {!user?.isDemo && (
                <button
                  type="button"
                  onClick={() => setSection("wallet")}
                  className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-400 hover:from-yellow-300 hover:to-amber-300 text-black font-black text-xs shadow-md transition cursor-pointer shrink-0"
                >
                  + Add ₹
                </button>
              )}

              {/* Three-Dot Menu Button (Sound, Rules, Support, etc.) */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setThreeDotOpen((v) => !v)}
                  className="rounded-xl border border-white/10 hover:border-yellow-400/40 px-2.5 py-2 text-gray-300 hover:text-white hover:bg-white/10 text-xs font-bold transition flex items-center justify-center cursor-pointer shadow-sm"
                  title="Menu / Settings & Sound"
                  aria-label="Options Menu"
                >
                  <MoreVertical className="w-4 h-4 text-yellow-400" />
                </button>

                {/* Three-Dot Dropdown Menu Modal */}
                {threeDotOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
                      onClick={() => setThreeDotOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-64 sm:w-72 rounded-2xl bg-[#0B1120] border border-white/15 p-2 shadow-2xl z-50 animate-fade-in space-y-1">
                      <div className="px-3 py-1.5 text-[11px] font-black text-gray-400 uppercase tracking-wider border-b border-white/10 flex items-center justify-between">
                        <span>Menu &amp; Options</span>
                        <span className="text-yellow-400">⋮</span>
                      </div>

                      {/* Sound Option Toggle */}
                      <button
                        type="button"
                        onClick={() => {
                          handleToggleSound();
                        }}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold hover:bg-white/5 transition text-left cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5 text-gray-200">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                            soundEnabledState ? "bg-yellow-400/20 text-yellow-400" : "bg-white/10 text-gray-400"
                          }`}>
                            {soundEnabledState ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                          </div>
                          <div>
                            <span className="block text-white">Sound Effects</span>
                            <span className="text-[10px] text-gray-400 font-normal">गेम की आवाज़</span>
                          </div>
                        </div>
                        <span
                          className={`text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase transition ${
                            soundEnabledState
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-500/20"
                              : "bg-white/10 text-gray-400"
                          }`}
                        >
                          {soundEnabledState ? "ON 🔊" : "OFF 🔇"}
                        </span>
                      </button>

                      {/* Rules & Multipliers */}
                      <button
                        type="button"
                        onClick={() => {
                          setSection("game");
                          setThreeDotOpen(false);
                          playClickSound();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold hover:bg-white/5 transition text-gray-200 text-left cursor-pointer"
                      >
                        <div className="w-7 h-7 rounded-lg bg-white/5 text-yellow-400 flex items-center justify-center">
                          📜
                        </div>
                        <div>
                          <span className="block text-white">Game Rules</span>
                          <span className="text-[10px] text-gray-400 font-normal">2X Head/Tail &amp; 10X Tie</span>
                        </div>
                      </button>

                      {/* Transaction History */}
                      <button
                        type="button"
                        onClick={() => {
                          setSection("history");
                          setThreeDotOpen(false);
                          playClickSound();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold hover:bg-white/5 transition text-gray-200 text-left cursor-pointer"
                      >
                        <div className="w-7 h-7 rounded-lg bg-white/5 text-cyan-400 flex items-center justify-center">
                          📊
                        </div>
                        <div>
                          <span className="block text-white">Game History</span>
                          <span className="text-[10px] text-gray-400 font-normal">Pichhle Rounds ka Record</span>
                        </div>
                      </button>

                      {/* Support Link */}
                      <button
                        type="button"
                        onClick={() => {
                          setSection("referral");
                          setThreeDotOpen(false);
                          playClickSound();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold hover:bg-white/5 transition text-gray-200 text-left cursor-pointer"
                      >
                        <div className="w-7 h-7 rounded-lg bg-white/5 text-emerald-400 flex items-center justify-center">
                          👥
                        </div>
                        <div>
                          <span className="block text-white">Refer &amp; Earn</span>
                          <span className="text-[10px] text-gray-400 font-normal">Dosto ko refer karke kamayein</span>
                        </div>
                      </button>

                      <div className="my-1 border-t border-white/10" />

                      {/* Profile View */}
                      <button
                        type="button"
                        onClick={() => {
                          setSection("profile");
                          setThreeDotOpen(false);
                          playClickSound();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold hover:bg-white/5 transition text-gray-200 text-left cursor-pointer"
                      >
                        <div className="w-7 h-7 rounded-lg bg-white/5 text-purple-400 flex items-center justify-center">
                          👤
                        </div>
                        <div>
                          <span className="block text-white">Profile: {user?.name || "Player"}</span>
                          <span className="text-[10px] text-gray-400 font-normal">Account settings</span>
                        </div>
                      </button>

                      {/* Logout */}
                      <button
                        type="button"
                        onClick={() => {
                          setThreeDotOpen(false);
                          logout();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition text-left cursor-pointer"
                      >
                        <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
                          🚪
                        </div>
                        <span>{user?.isDemo ? "Exit Demo" : "Logout Account"}</span>
                      </button>
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={() => setMobileNav((v) => !v)}
                className="lg:hidden rounded-xl border border-white/10 px-2.5 py-1.5 text-xs font-bold text-gray-300 hover:bg-white/5 cursor-pointer"
                title="Toggle Menu"
              >
                {mobileNav ? "✕" : "☰"}
              </button>

              <button
                onClick={logout}
                className="hidden sm:block rounded-xl border border-red-500/20 text-red-400 px-3 py-1.5 text-xs font-bold hover:bg-red-500/10 transition cursor-pointer"
              >
                {user?.isDemo ? "Exit Demo" : "Logout"}
              </button>
            </div>
          </div>

          {mobileNav && (
            <div className="lg:hidden border-t border-white/10 p-3 space-y-1 bg-[#0B1120] animate-fade-in shadow-2xl">
              {/* Sound Option inside Mobile Nav */}
              <button
                type="button"
                onClick={() => {
                  handleToggleSound();
                }}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm bg-white/5 hover:bg-white/10 transition text-gray-200 mb-1 cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  {soundEnabledState ? <Volume2 className="w-4 h-4 text-yellow-400" /> : <VolumeX className="w-4 h-4 text-gray-500" />}
                  <span>Game Sound (गेम आवाज़)</span>
                </span>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-black ${
                    soundEnabledState
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : "bg-white/10 text-gray-400"
                  }`}
                >
                  {soundEnabledState ? "SOUND ON 🔊" : "MUTED 🔇"}
                </span>
              </button>

              {nav.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setSection(item.id);
                    setMobileNav(false);
                    playClickSound();
                  }}
                  className={`w-full text-left px-4 py-3 rounded-xl font-bold text-sm transition flex items-center justify-between ${
                    section === item.id
                      ? "bg-yellow-400 text-black shadow-md"
                      : "text-gray-300 hover:bg-white/5"
                  }`}
                >
                  <span>{item.label}</span>
                  {section === item.id && <span>➔</span>}
                </button>
              ))}
              {user?.role === "admin" && (
                <a
                  href="/admin/dashboard"
                  className="w-full text-left px-4 py-3 rounded-xl font-bold text-sm bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-between"
                >
                  <span>⚙️ Admin Management Panel</span>
                  <span>➔</span>
                </a>
              )}
              <button
                onClick={logout}
                className="w-full text-left px-4 py-3 rounded-xl text-red-400 font-bold text-sm hover:bg-red-500/10 transition flex items-center justify-between"
              >
                <span>{user?.isDemo ? "Exit Demo ✕" : "Logout Account 🚪"}</span>
              </button>
            </div>
          )}
        </header>

        {/* Main Content Area */}
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 py-5 sm:py-7 pb-24 lg:pb-10">
          {section === "home" && (
            <DashboardView user={user} setSection={setSection} refreshUser={refreshUser} />
          )}
          {section === "game" && <GameView user={user} refreshUser={refreshUser} setSection={setSection} />}
          {section === "spin" && (
            <DailySpinView user={user} refreshUser={refreshUser} authFetch={authFetch} />
          )}
          {section === "referral" && (
            <ReferralView user={user} refreshUser={refreshUser} authFetch={authFetch} />
          )}
          {section === "wallet" && <WalletView user={user} refreshUser={refreshUser} />}
          {section === "history" && <HistoryView />}
          {section === "profile" && <ProfileView user={user} />}
        </div>
      </div>

      {/* Sleek Native-Style Mobile Bottom Navigation Bar (Dock) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0B1120]/95 backdrop-blur-xl border-t border-white/10 px-2 py-1.5 shadow-[0_-10px_25px_rgba(0,0,0,0.5)]">
        <div className="max-w-md mx-auto flex items-center justify-around">
          {mobileTabs.map((tab) => {
            const isActive = section === tab.id;
            if (tab.isCenter) {
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setSection(tab.id);
                    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="flex flex-col items-center justify-center -mt-6 focus:outline-none cursor-pointer group select-none"
                  aria-label="Play CoinFlip"
                >
                  {/* Silver Bharat Coin (सिल्वर कलर का भारत वाला सिक्का) */}
                  <div className="relative">
                    {/* Ambient Silver Shimmer Aura */}
                    <div
                      className={`absolute -inset-1.5 rounded-full blur-md transition-all ${
                        isActive
                          ? "bg-slate-200/60 animate-pulse"
                          : "bg-slate-400/25 group-hover:bg-slate-300/40"
                      }`}
                    />

                    {/* Outer Silver Milled Rim Body */}
                    <div
                      className={`relative h-14 w-14 rounded-full p-1 shadow-2xl flex items-center justify-center transition-all duration-300 ${
                        isActive
                          ? "bg-gradient-to-br from-white via-slate-300 to-slate-600 ring-4 ring-slate-200/50 scale-110 shadow-slate-200/50"
                          : "bg-gradient-to-br from-slate-100 via-slate-300 to-slate-500 shadow-black/70 group-hover:scale-105"
                      }`}
                    >
                      {/* Concentric Milled Silver Ring */}
                      <div className="w-full h-full rounded-full bg-gradient-to-tr from-slate-400 via-slate-100 to-slate-300 p-0.5 shadow-inner border border-slate-400/80 flex items-center justify-center">
                        {/* Embossed Inner Face with BHARAT, RUPEE & INDIA */}
                        <div className="w-full h-full rounded-full border border-dashed border-slate-600/70 bg-gradient-to-b from-slate-100 via-slate-200 to-slate-400 flex flex-col items-center justify-center text-slate-900 shadow-[inset_0_2px_4px_rgba(255,255,255,0.95),inset_0_-2px_4px_rgba(0,0,0,0.35)] relative overflow-hidden">
                          {/* Specular Diagonal Reflection */}
                          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent pointer-events-none" />

                          {/* Upper Arch Text: भारत */}
                          <span className="text-[7.5px] font-black tracking-widest text-slate-900 uppercase leading-none scale-90">
                            भारत
                          </span>

                          {/* Center Emblem: Rupee Symbol */}
                          <span className="text-[14px] font-black leading-tight text-slate-950 drop-shadow-[0_1px_1px_rgba(255,255,255,0.85)] my-0.2">
                            {RUPEE}
                          </span>

                          {/* Lower Arch Text: INDIA */}
                          <span className="text-[6.5px] font-black tracking-widest text-slate-900 uppercase leading-none scale-90">
                            INDIA
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-black mt-1 tracking-tight ${
                      isActive ? "text-yellow-400 font-black" : "text-gray-300 font-bold"
                    }`}
                  >
                    {tab.label}
                  </span>
                </button>
              );
            }

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  playClickSound();
                  setSection(tab.id);
                  if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition cursor-pointer active:scale-95 ${
                  isActive
                    ? "text-yellow-400 font-black"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                <span className="text-lg leading-none mb-0.5">{tab.icon}</span>
                <span className={`text-[10px] ${isActive ? "font-black" : "font-semibold"}`}>
                  {tab.label}
                </span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 mt-0.5 animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </main>
  );
}

function DashboardView({ user, setSection, refreshUser }) {
  const [syncing, setSyncing] = useState(false);
  const isFirstDepositEligible = !user.hasClaimedWelcomeBonus && !user.firstDepositDone;

  const triggerRefresh = async () => {
    setSyncing(true);
    if (refreshUser) await refreshUser();
    setTimeout(() => setSyncing(false), 600);
  };

  return (
    <div className="space-y-7">
      {/* 100% Welcome Bonus Alert Banner if eligible */}
      {isFirstDepositEligible && (
        <div className="rounded-3xl border border-yellow-400/30 bg-gradient-to-r from-yellow-500/20 via-amber-500/10 to-yellow-500/20 p-5 md:p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-yellow-400 text-black flex items-center justify-center font-black text-2xl shrink-0 shadow-lg shadow-yellow-500/30">
              🎁
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold bg-yellow-400/20 text-yellow-300 px-2.5 py-0.5 rounded-full uppercase tracking-wider mb-1">
                Special Welcome Offer
              </div>
              <h3 className="text-lg md:text-xl font-black text-white">
                100% Instant First Deposit Bonus!
              </h3>
              <p className="text-xs text-gray-300 mt-0.5">
                Pehle recharge par paiye 100% Extra Cash (e.g. Deposit ₹100 ➔ Get ₹200).
              </p>
            </div>
          </div>
          <button
            onClick={() => setSection("wallet")}
            className="px-6 py-3 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black font-black text-xs uppercase tracking-wider shadow-md shadow-yellow-400/20 transition shrink-0"
          >
            CLAIM 100% BONUS ⚡
          </button>
        </div>
      )}

      {/* Hero Welcome Banner */}
      <section className="rounded-3xl border border-yellow-500/10 bg-gradient-to-br from-yellow-500/10 via-[#111827] to-[#111827] p-6 md:p-9">
        <div className="max-w-3xl">
          <p className="text-yellow-400 text-sm font-black uppercase tracking-[0.2em]">
            CoinFlip Dashboard
          </p>
          <h1 className="text-4xl md:text-5xl font-black mt-3">
            Welcome, {user.name}
          </h1>
          <p className="text-gray-400 mt-3 max-w-2xl">
            Aapka CoinFlip account ready hai. Daily free spin se bonus jeetiye, doston ko refer karke lifetime commission kamaiye, aur 2X CoinFlip kheliye!
          </p>
          <div className="flex flex-wrap gap-3 mt-7">
            <button
              onClick={() => setSection("game")}
              className="bg-yellow-400 hover:bg-yellow-300 text-black font-black px-6 py-3 rounded-xl transition"
            >
              Play CoinFlip 🪙
            </button>
            <button
              onClick={() => setSection("spin")}
              className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black px-6 py-3 rounded-xl transition shadow-lg shadow-yellow-500/20"
            >
              Daily Spin (₹10 - ₹50) 🎁
            </button>
            <button
              onClick={() => setSection("referral")}
              className="border border-white/10 hover:bg-white/5 font-bold px-6 py-3 rounded-xl transition"
            >
              Refer &amp; Earn (5%) 👥
            </button>
          </div>
        </div>
      </section>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Interactive Real-Time Wallet Balance Card */}
        <div className="rounded-2xl border border-emerald-500/30 bg-[#111827] p-5 flex flex-col justify-between relative overflow-hidden group hover:border-emerald-400 transition shadow-lg shadow-emerald-950/20">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-emerald-400 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <span>Wallet Balance</span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </p>
              <button
                onClick={triggerRefresh}
                title="Refresh live balance"
                className={`text-xs text-emerald-400/80 hover:text-emerald-200 p-1 rounded-md hover:bg-emerald-500/20 transition ${syncing ? "animate-spin" : ""}`}
              >
                🔄
              </button>
            </div>
            <p className="text-xl sm:text-2xl font-black mt-2 text-emerald-400 tabular-nums">
              {RUPEE}{Number(user?.walletBalance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5 text-xs">
            <button
              onClick={() => setSection("wallet")}
              className="text-[11px] font-bold text-yellow-400 hover:text-yellow-300 transition"
            >
              + Deposit
            </button>
            <button
              onClick={() => setSection("wallet")}
              className="text-[11px] font-bold text-slate-400 hover:text-white transition"
            >
              Withdraw ➔
            </button>
          </div>
        </div>

        <StatCard
          title="Daily Rewards"
          value={`🔥 Streak ${user.dailyBonusStreak || 0}D`}
          accent="yellow"
        />
        <StatCard
          title="Referral Earnings"
          value={`${RUPEE}${Number(user.referralEarnings || 0).toFixed(2)}`}
          accent="blue"
        />
        <StatCard
          title="Welcome Bonus"
          value={user.hasClaimedWelcomeBonus ? "Claimed ✓" : "100% Active 🎁"}
          accent={user.hasClaimedWelcomeBonus ? "green" : "yellow"}
        />
      </div>

      {/* Featured Casino Game Highlight */}
      <section className="relative overflow-hidden rounded-3xl border-2 border-yellow-500/40 bg-gradient-to-br from-yellow-950/40 via-[#111827] to-slate-950 p-6 md:p-8 shadow-2xl shadow-yellow-500/10 group">
        {/* Glow backdrop light */}
        <div className="absolute -right-16 -top-16 w-80 h-80 bg-yellow-500/15 rounded-full blur-3xl pointer-events-none group-hover:bg-yellow-500/25 transition duration-700" />
        <div className="absolute -left-16 -bottom-16 w-80 h-80 bg-amber-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid md:grid-cols-12 gap-6 items-center">
          {/* Left Column: Game Info & Badges */}
          <div className="md:col-span-7 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-gradient-to-r from-red-600 to-amber-600 text-white font-black text-[10px] uppercase tracking-widest shadow-md animate-pulse">
                🔥 #1 FEATURED GAME
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold text-[11px] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                1,480+ Online Now
              </span>
              <span className="px-3 py-1 rounded-full bg-yellow-400/10 text-yellow-300 border border-yellow-400/20 font-bold text-[11px]">
                ⚡ Instant 10s Rounds
              </span>
            </div>

            <div>
              <h2 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-400 to-amber-500 tracking-tight flex items-center gap-2">
                COINFLIP 2X ARCADE
              </h2>
              <p className="text-sm text-gray-300 mt-2 leading-relaxed">
                Choose <strong className="text-yellow-400">HEAD 👑</strong> or <strong className="text-yellow-400">TAIL 🪙</strong>, enter your stake, and flip the gold coin in real-time. Win guaranteed <span className="text-emerald-400 font-bold">2X instant payout</span> or hit the <span className="text-amber-400 font-bold">10X Tie Jackpot!</span>
              </p>
            </div>

            {/* Quick Game Stats */}
            <div className="grid grid-cols-3 gap-3 pt-1">
              <div className="p-3 rounded-2xl bg-black/40 border border-white/10 text-center">
                <div className="text-[10px] text-gray-400 font-bold uppercase">Multiplier</div>
                <div className="text-lg font-black text-yellow-400">2.0X</div>
              </div>
              <div className="p-3 rounded-2xl bg-black/40 border border-white/10 text-center">
                <div className="text-[10px] text-gray-400 font-bold uppercase">Min Stake</div>
                <div className="text-lg font-black text-white">{RUPEE}10</div>
              </div>
              <div className="p-3 rounded-2xl bg-black/40 border border-white/10 text-center">
                <div className="text-[10px] text-gray-400 font-bold uppercase">RTP Rate</div>
                <div className="text-lg font-black text-emerald-400">96.8%</div>
              </div>
            </div>

            {/* CTA Button */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                onClick={() => setSection("game")}
                className="flex-1 sm:flex-none px-8 py-4 rounded-2xl bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:from-yellow-300 hover:to-amber-400 text-black font-black text-sm uppercase tracking-wider shadow-xl shadow-yellow-400/25 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 group-hover:animate-urgent"
              >
                <span>🎮</span>
                <span>PLAY COINFLIP NOW (2X)</span>
                <span>➔</span>
              </button>
              <button
                onClick={() => setSection("spin")}
                className="px-5 py-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs uppercase tracking-wider transition flex items-center gap-1.5"
              >
                <span>🎡 Free Spin</span>
              </button>
            </div>
          </div>

          {/* Right Column: 3D Gold Coin Interactive Preview */}
          <div className="md:col-span-5 flex flex-col items-center justify-center p-4">
            <div
              onClick={() => setSection("game")}
              className="relative cursor-pointer group/coin flex flex-col items-center justify-center p-6 rounded-3xl bg-gradient-to-b from-yellow-500/10 via-black/40 to-black/80 border border-yellow-500/30 hover:border-yellow-400 transition-all duration-300 shadow-2xl hover:shadow-yellow-500/20"
            >
              {/* Top floating ribbon */}
              <div className="absolute -top-3 px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-[10px] font-black uppercase tracking-widest shadow-md">
                CLICK TO PLAY
              </div>

              {/* 3D Realistic Gold Coin */}
              <div className="relative my-3 flex items-center justify-center">
                {/* Glowing ring background */}
                <div className="absolute w-36 h-36 rounded-full bg-yellow-400/20 blur-xl animate-pulse" />

                {/* The Animated 3D Coin */}
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-yellow-200 via-amber-400 to-yellow-600 p-1.5 shadow-[0_10px_35px_rgba(234,179,8,0.5),inset_0_2px_6px_rgba(255,255,255,0.8),inset_0_-4px_8px_rgba(0,0,0,0.5)] animate-coin-float-3d group-hover/coin:scale-110 transition-transform">
                  <div className="w-full h-full rounded-full border-2 border-dashed border-yellow-100/60 bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-300 flex flex-col items-center justify-center text-black font-black shadow-inner relative overflow-hidden">
                    {/* Light shine glare */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-gold-shine pointer-events-none" />

                    <span className="text-3xl sm:text-4xl drop-shadow-md">👑</span>
                    <span className="text-[11px] sm:text-xs font-black tracking-widest uppercase mt-0.5 drop-shadow">
                      HEAD / TAIL
                    </span>
                    <span className="text-[9px] font-bold bg-black/20 px-2 py-0.2 rounded-full mt-0.5">
                      2X WIN
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Options Chips */}
              <div className="flex items-center gap-2 mt-2">
                <span className="px-2.5 py-1 rounded-xl bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 text-[11px] font-black">
                  👑 HEAD (2X)
                </span>
                <span className="text-xs text-gray-500 font-bold">vs</span>
                <span className="px-2.5 py-1 rounded-xl bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 text-[11px] font-black">
                  🪙 TAIL (2X)
                </span>
              </div>
              <p className="text-[11px] text-gray-400 mt-2 font-semibold">
                Tap anywhere to enter game arena ⚡
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Action Cards Grid */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Upgraded CoinFlip Game Card */}
        <div
          onClick={() => setSection("game")}
          className="rounded-3xl border-2 border-yellow-500/40 bg-gradient-to-b from-[#1c2438] via-[#111827] to-[#0b0f19] p-6 flex flex-col justify-between hover:border-yellow-400 hover:shadow-xl hover:shadow-yellow-500/10 transition-all duration-300 cursor-pointer group relative overflow-hidden"
        >
          {/* Badge */}
          <div className="absolute top-4 right-4 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-red-600 to-amber-500 text-white font-black text-[9px] uppercase tracking-wider">
            2X WIN
          </div>

          <div>
            <div className="flex items-center gap-3.5">
              {/* Mini 3D Coin Badge */}
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-600 p-0.5 shadow-lg shadow-yellow-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                <div className="w-full h-full rounded-[14px] bg-gradient-to-br from-yellow-400 to-amber-500 flex flex-col items-center justify-center text-black font-black">
                  <span className="text-xl">🪙</span>
                  <span className="text-[8px] font-black">2X</span>
                </div>
              </div>
              <div>
                <span className="text-[10px] text-yellow-400 font-bold uppercase tracking-wider block">
                  Arcade Game
                </span>
                <h3 className="text-xl font-black text-white group-hover:text-yellow-400 transition">
                  CoinFlip Arena
                </h3>
              </div>
            </div>

            <p className="text-gray-400 text-xs mt-3.5 leading-relaxed">
              Choose HEAD or TAIL, enter stake and flip the 3D coin for instant 2X cash payout.
            </p>

            <div className="flex items-center gap-2 mt-4 text-[11px]">
              <span className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-gray-300">
                Min {RUPEE}10
              </span>
              <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold">
                96.8% RTP
              </span>
              <span className="px-2 py-0.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 font-bold">
                10s Fast
              </span>
            </div>
          </div>

          <button
            onClick={() => setSection("game")}
            className="mt-5 w-full bg-gradient-to-r from-yellow-400 to-amber-400 group-hover:from-yellow-300 group-hover:to-amber-300 text-black py-3 rounded-xl font-black text-xs uppercase tracking-wider transition shadow-md shadow-yellow-400/20 flex items-center justify-center gap-1.5"
          >
            <span>🎮 PLAY COINFLIP</span>
            <span>➔</span>
          </button>
        </div>

        <ActionCard
          title="Daily Lucky Spin"
          description="Spin the wheel every 24 hours to win ₹10 to ₹50 free wallet balance."
          button="Free Spin 🎡"
          icon="🎁"
          onClick={() => setSection("spin")}
        />
        <ActionCard
          title="Refer & Earn 5%"
          description="Invite friends via WhatsApp and get 5% lifetime commission on all games."
          button="Invite Friends 👥"
          icon="👥"
          onClick={() => setSection("referral")}
        />
      </section>
    </div>
  );
}

function StatCard({ title, value, accent }) {
  const classes = {
    green: "text-green-400",
    yellow: "text-yellow-400",
    blue: "text-sky-400",
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#111827] p-5">
      <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">{title}</p>
      <p className={`text-xl sm:text-2xl font-black mt-2 ${classes[accent] || "text-white"}`}>{value}</p>
    </div>
  );
}

function ActionCard({ title, description, button, icon = "CF", onClick }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-[#111827] p-6 flex flex-col justify-between hover:border-yellow-400/30 transition shadow-lg">
      <div>
        <div className="h-12 w-12 rounded-2xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center text-yellow-400 font-black text-xl">
          {icon}
        </div>
        <h2 className="text-xl font-black mt-4 text-white">{title}</h2>
        <p className="text-gray-400 text-xs mt-1.5 leading-relaxed">{description}</p>
      </div>
      <button
        onClick={onClick}
        className="mt-5 w-full bg-white/5 hover:bg-yellow-400 hover:text-black border border-white/10 px-5 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition"
      >
        {button}
      </button>
    </div>
  );
}

function GameView({ user, refreshUser, setSection }) {
  const [choice, setChoice] = useState("HEAD");
  const [bet, setBet] = useState("50");
  const [placedBet, setPlacedBet] = useState(null); // { choice, amount, roundId }
  const [autoBet, setAutoBet] = useState(false);
  const [result, setResult] = useState(null);
  const [coin, setCoin] = useState("HEAD");
  const [walletBalance, setWalletBalance] = useState(Number(user?.walletBalance || 0));
  const [soundOn, setSoundOn] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // Live Continuous Game Round Loop State
  const [roundId, setRoundId] = useState(20268420);
  const [phase, setPhase] = useState("BETTING"); // "BETTING" | "FLIPPING" | "RESULT"
  const [countdown, setCountdown] = useState(12);

  // Live Trend History Roadmap (Recent flips)
  const [historyRoadmap, setHistoryRoadmap] = useState([
    "HEAD", "TAIL", "HEAD", "HEAD", "TAIL", "TIE", "HEAD", "TAIL", "TAIL", "HEAD"
  ]);

  // Live Winners Floating Ticker
  const [recentWinners, setRecentWinners] = useState([
    { name: "Rahul S.", amount: 500, side: "HEAD", time: "just now" },
    { name: "Vikram R.", amount: 2500, side: "TIE 10X", time: "1m ago" },
    { name: "Pooja K.", amount: 200, side: "TAIL", time: "2m ago" },
    { name: "Amit G.", amount: 1000, side: "HEAD", time: "3m ago" },
  ]);
  const [activeWinnerIndex, setActiveWinnerIndex] = useState(0);

  const [settings, setSettings] = useState({
    coinflipEnabled: true,
    maintenanceMode: false,
    maintenanceMessage:
      "Game is temporarily under maintenance. Please try again later.",
    minBet: 10,
    maxBet: 10000,
    payoutMultiplier: 2,
    tieEnabled: true,
    tieProbabilityPercent: 8,
    tieMultiplier: 10,
    speedRoundEnabled: true,
    speedRoundSeconds: 12,
    windPhysicsEnabled: true,
    gameDifficulty: "hard",
  });
  const [loadingPage, setLoadingPage] = useState(true);

  // Wind Physics State
  const [wind, setWind] = useState({
    weather: "Crosswind Gust",
    speedKmh: 28,
    direction: "West-North",
    icon: "💨",
    tilt: 18,
    intensity: "medium",
  });

  // Refs for access inside setInterval
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const countdownRef = useRef(countdown);
  countdownRef.current = countdown;
  const placedBetRef = useRef(placedBet);
  placedBetRef.current = placedBet;
  const autoBetRef = useRef(autoBet);
  autoBetRef.current = autoBet;
  const choiceRef = useRef(choice);
  choiceRef.current = choice;
  const betRef = useRef(bet);
  betRef.current = bet;
  const walletBalanceRef = useRef(walletBalance);
  walletBalanceRef.current = walletBalance;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const roundIdRef = useRef(roundId);
  roundIdRef.current = roundId;
  const userRef = useRef(user);
  userRef.current = user;

  // Sync state whenever parent user balance updates
  useEffect(() => {
    if (user?.walletBalance !== undefined) {
      setWalletBalance(Number(user.walletBalance || 0));
    }
  }, [user?.walletBalance]);

  useEffect(() => {
    setSoundOn(isSoundEnabled());
  }, []);

  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    if (next) playClickSound();
  }

  // Load user & game settings
  async function load() {
    try {
      if (user?.isDemo) {
        setWalletBalance(Number(user.walletBalance ?? 100));
      } else {
        const meRes = await authFetch("/api/me", { cache: "no-store" });
        const me = await meRes.json().catch(() => null);
        if (me?.success && me.user) {
          setWalletBalance(Number(me.user.walletBalance || 0));
          if (refreshUser) refreshUser();
        }
      }

      const settingsRes = await authFetch("/api/game/settings", { cache: "no-store" });
      const data = await settingsRes.json().catch(() => null);

      if (data?.success && data.settings) {
        const isEnabled =
          (data.settings.CoinFlipEnabled ?? data.settings.coinflipEnabled ?? true) !== false;
        const totalSecs = Number(data.settings.speedRoundSeconds ?? 12);
        setSettings({
          coinflipEnabled: isEnabled,
          maintenanceMode: Boolean(data.settings.maintenanceMode),
          maintenanceMessage:
            data.settings.maintenanceMessage ||
            "Game is temporarily under maintenance. Please try again later.",
          minBet: Number(data.settings.minBet ?? 10),
          maxBet: Number(data.settings.maxBet ?? 10000),
          payoutMultiplier: Number(data.settings.payoutMultiplier ?? 2),
          tieEnabled: data.settings.tieEnabled !== false,
          tieProbabilityPercent: Number(data.settings.tieProbabilityPercent ?? 8),
          tieMultiplier: Number(data.settings.tieMultiplier ?? 10),
          speedRoundEnabled: data.settings.speedRoundEnabled !== false,
          speedRoundSeconds: totalSecs,
          windPhysicsEnabled: data.settings.windPhysicsEnabled !== false,
          gameDifficulty: data.settings.gameDifficulty || "hard",
        });
        setCountdown(totalSecs);
      }
    } finally {
      setLoadingPage(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Periodic wind fluctuation
  useEffect(() => {
    if (!settings.windPhysicsEnabled) return;
    const windTypes = [
      { weather: "Calm Air", speedKmh: 6, direction: "East", icon: "🍃", tilt: 4, intensity: "low" },
      { weather: "Crosswind Gust", speedKmh: 28, direction: "NW", icon: "💨", tilt: 18, intensity: "medium" },
      { weather: "Stormy Gale", speedKmh: 52, direction: "North Vortex", icon: "🌪️", tilt: -24, intensity: "high" },
      { weather: "Thunder Whirl", speedKmh: 76, direction: "Spiral SW", icon: "⚡", tilt: 32, intensity: "extreme" },
    ];
    const interval = setInterval(() => {
      setWind(windTypes[Math.floor(Math.random() * windTypes.length)]);
    }, 14000);
    return () => clearInterval(interval);
  }, [settings.windPhysicsEnabled]);

  // Rotate recent winners toast
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveWinnerIndex((prev) => (prev + 1) % recentWinners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [recentWinners.length]);

  // Function to lock / place bet for the active round
  const handleLockBet = () => {
    if (phase !== "BETTING") {
      setErrorMessage("Betting is currently closed for this round.");
      return;
    }
    if (!settings.coinflipEnabled) {
      setErrorMessage("CoinFlip game is currently disabled by Admin.");
      return;
    }
    if (settings.maintenanceMode) {
      setErrorMessage(settings.maintenanceMessage || "Game under maintenance.");
      return;
    }
    if (!choice) {
      setErrorMessage("Please choose HEAD, TAIL, or TIE.");
      return;
    }

    const amount = Number(bet);
    if (!Number.isFinite(amount) || amount <= 0) {
      setErrorMessage("Please enter a valid entry amount.");
      return;
    }
    if (amount < settings.minBet) {
      setErrorMessage(`Minimum bet is ${RUPEE}${settings.minBet}.`);
      return;
    }
    if (amount > settings.maxBet) {
      setErrorMessage(`Maximum bet is ${RUPEE}${settings.maxBet}.`);
      return;
    }
    if (amount > walletBalance) {
      setErrorMessage(
        user?.isDemo
          ? `Demo balance low! Click "Reset ₹100 Demo Chips" to continue.`
          : `Insufficient balance! Wallet balance is ${RUPEE}${walletBalance.toFixed(2)}.`
      );
      return;
    }

    setErrorMessage("");
    setPlacedBet({
      choice,
      amount,
      roundId,
    });
    playBetPlacedSound();
  };

  const handleCancelBet = () => {
    if (phase !== "BETTING") return;
    setPlacedBet(null);
    playClickSound();
  };

  // Main Live Continuous Game Loop Engine
  useEffect(() => {
    let spinInterval = null;

    const timer = setInterval(async () => {
      const currentPhase = phaseRef.current;
      const currentCount = countdownRef.current;

      if (currentPhase === "BETTING") {
        if (currentCount > 1) {
          setCountdown(currentCount - 1);
          if (currentCount <= 4) {
            playTimerTickSound(currentCount <= 2);
          }
        } else {
          // Time is up for betting! Switch to FLIPPING phase
          setPhase("FLIPPING");
          setCountdown(3);
          playCoinSpinSound();
          if (settingsRef.current.windPhysicsEnabled) {
            playWindWhooshSound(wind.intensity);
          }

          // Rapid coin visual spin
          spinInterval = setInterval(() => {
            setCoin((prev) => (prev === "HEAD" ? "TAIL" : prev === "TAIL" ? "TIE" : "HEAD"));
          }, 90);

          // Resolve Game Outcome
          const curPlacedBet = placedBetRef.current;
          const isDemo = Boolean(userRef.current?.isDemo);
          const curBalance = walletBalanceRef.current;
          const curSettings = settingsRef.current;

          let resolvedFinalSide = "HEAD";
          let resolvedGameData = null;

          if (curPlacedBet) {
            if (isDemo) {
              // Demo simulation
              await new Promise((res) => setTimeout(res, 2200));
              clearInterval(spinInterval);

              const rand = Math.random();
              if (curSettings.tieEnabled && rand < (curSettings.tieProbabilityPercent || 8) / 100) {
                resolvedFinalSide = "TIE";
              } else if (rand < 0.54) {
                resolvedFinalSide = "HEAD";
              } else {
                resolvedFinalSide = "TAIL";
              }

              const won = curPlacedBet.choice === resolvedFinalSide;
              const multiplier =
                resolvedFinalSide === "TIE" ? curSettings.tieMultiplier : curSettings.payoutMultiplier;
              const winAmount = won ? curPlacedBet.amount * multiplier : 0;
              const newBal = curBalance - curPlacedBet.amount + winAmount;

              setWalletBalance(newBal);
              if (userRef.current) userRef.current.walletBalance = newBal;

              resolvedGameData = {
                won,
                isTieResult: resolvedFinalSide === "TIE",
                prediction: curPlacedBet.choice,
                result: resolvedFinalSide,
                entryFee: curPlacedBet.amount,
                winAmount,
                multiplier,
                isDemo: true,
                roundId: curPlacedBet.roundId,
              };
            } else {
              // Real Player Live Request
              try {
                const predictionPayload =
                  curPlacedBet.choice === "HEAD" ? "heads" : curPlacedBet.choice === "TAIL" ? "tails" : "tie";

                let clientToken = null;
                if (typeof window !== "undefined") {
                  try {
                    clientToken =
                      localStorage.getItem("coinflip_token") ||
                      sessionStorage.getItem("coinflip_token");
                  } catch {}
                }

                const response = await authFetch("/api/game/coinflip", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    prediction: predictionPayload,
                    entryFee: curPlacedBet.amount,
                    token: clientToken,
                  }),
                });

                clearInterval(spinInterval);
                const data = await response.json().catch(() => null);

                if (response.ok && data?.success && data.game) {
                  const g = data.game;
                  resolvedFinalSide =
                    g.result === "heads" ? "HEAD" : g.result === "tails" ? "TAIL" : "TIE";

                  const won = g.status === "won";
                  resolvedGameData = {
                    won,
                    isTieResult: resolvedFinalSide === "TIE",
                    prediction: curPlacedBet.choice,
                    result: resolvedFinalSide,
                    entryFee: Number(g.entryFee || curPlacedBet.amount),
                    winAmount: Number(g.winAmount || 0),
                    multiplier: Number(g.payoutMultiplier || (resolvedFinalSide === "TIE" ? curSettings.tieMultiplier : curSettings.payoutMultiplier)),
                    isDemo: false,
                    roundId: curPlacedBet.roundId,
                  };

                  setWalletBalance(Number(data.walletBalance || 0));
                  if (refreshUser) refreshUser();
                } else {
                  // Fallback if API error occurred
                  resolvedFinalSide = Math.random() < 0.5 ? "HEAD" : "TAIL";
                  setErrorMessage(data?.message || "Game transaction error.");
                }
              } catch (err) {
                clearInterval(spinInterval);
                console.error(err);
                resolvedFinalSide = Math.random() < 0.5 ? "HEAD" : "TAIL";
              }
            }
          } else {
            // Spectator round outcome calculation (fair room generation)
            await new Promise((res) => setTimeout(res, 2200));
            clearInterval(spinInterval);

            const rand = Math.random();
            if (curSettings.tieEnabled && rand < (curSettings.tieProbabilityPercent || 8) / 100) {
              resolvedFinalSide = "TIE";
            } else if (rand < 0.5) {
              resolvedFinalSide = "HEAD";
            } else {
              resolvedFinalSide = "TAIL";
            }

            resolvedGameData = {
              spectator: true,
              result: resolvedFinalSide,
              roundId: roundIdRef.current,
            };
          }

          // Coin lands and settles
          setCoin(resolvedFinalSide);
          playCoinLandSound();

          if (resolvedGameData && !resolvedGameData.spectator) {
            if (resolvedGameData.won) {
              setTimeout(() => playWinSound(), 140);
            } else {
              setTimeout(() => playLoseSound(), 140);
            }
          }

          setResult(resolvedGameData);

          // Update Trend Roadmap History
          setHistoryRoadmap((prev) => [resolvedFinalSide, ...prev.slice(0, 19)]);

          // Add simulated winner dynamically occasionally
          if (Math.random() > 0.4) {
            const names = ["Aman P.", "Kunal M.", "Sanjay D.", "Pooja V.", "Deepak B.", "Sneha T."];
            const randomName = names[Math.floor(Math.random() * names.length)];
            const randomAmt = [100, 200, 500, 1000, 2500][Math.floor(Math.random() * 5)];
            setRecentWinners((prev) => [
              { name: randomName, amount: randomAmt, side: resolvedFinalSide, time: "just now" },
              ...prev.slice(0, 5),
            ]);
          }

          // Switch to RESULT phase
          setPhase("RESULT");
          setCountdown(4);
        }
      } else if (currentPhase === "FLIPPING") {
        // Handled via inner await & state transitions
      } else if (currentPhase === "RESULT") {
        if (currentCount > 1) {
          setCountdown(currentCount - 1);
        } else {
          // Reset for Next Live Round
          const nextRound = roundIdRef.current + 1;
          setRoundId(nextRound);
          setResult(null);
          setErrorMessage("");
          playRoundStartBell();

          // Check if Auto-Bet is enabled
          if (autoBetRef.current) {
            const curBal = walletBalanceRef.current;
            const amount = Number(betRef.current);
            if (amount >= settingsRef.current.minBet && amount <= curBal) {
              setPlacedBet({
                choice: choiceRef.current,
                amount,
                roundId: nextRound,
              });
              playBetPlacedSound();
            } else {
              setPlacedBet(null);
              setAutoBet(false);
              setErrorMessage("Auto-Bet stopped due to insufficient balance.");
            }
          } else {
            setPlacedBet(null);
          }

          setPhase("BETTING");
          setCountdown(settingsRef.current.speedRoundSeconds || 12);
        }
      }
    }, 1000);

    return () => {
      clearInterval(timer);
      if (spinInterval) clearInterval(spinInterval);
    };
  }, []);

  // Compute trend statistics
  const trendStats = useMemo(() => {
    const total = historyRoadmap.length || 1;
    const heads = historyRoadmap.filter((h) => h === "HEAD").length;
    const tails = historyRoadmap.filter((h) => h === "TAIL").length;
    const ties = historyRoadmap.filter((h) => h === "TIE").length;

    // Streak detection
    let currentStreak = 1;
    const first = historyRoadmap[0];
    for (let i = 1; i < historyRoadmap.length; i++) {
      if (historyRoadmap[i] === first) {
        currentStreak++;
      } else {
        break;
      }
    }

    return {
      headsPercent: Math.round((heads / total) * 100),
      tailsPercent: Math.round((tails / total) * 100),
      tiesPercent: Math.round((ties / total) * 100),
      streak: `${currentStreak}x ${first}`,
    };
  }, [historyRoadmap]);

  const activeWinner = recentWinners[activeWinnerIndex] || recentWinners[0];

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Demo Mode Notice & Reset Controls */}
      {user?.isDemo && (
        <div className="p-4 rounded-3xl bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-amber-500/20 border-2 border-yellow-400/40 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl shadow-yellow-500/10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-600 p-0.5 shadow-md flex items-center justify-center shrink-0">
              <div className="w-full h-full rounded-[14px] bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-black text-2xl font-black">
                🎮
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-yellow-300 uppercase tracking-wider">
                  FREE DEMO PLAY ARENA
                </span>
                <span className="bg-black/50 text-yellow-400 text-[10px] px-2 py-0.2 rounded-full border border-yellow-400/30 font-black uppercase">
                  Bina Login
                </span>
              </div>
              <p className="text-xs text-gray-200 mt-0.5">
                Aap <strong>₹100 Virtual Demo Chips</strong> se live non-stop round loop me khel rahe hain!
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                setWalletBalance(100);
                if (user) user.walletBalance = 100;
                setResult(null);
                setErrorMessage("");
                playClickSound();
              }}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition border border-white/15 flex items-center justify-center gap-1.5 cursor-pointer"
              title="Reset Demo Chips to ₹100"
            >
              <span>🔄</span>
              <span>Reset ₹100</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  localStorage.removeItem("coinflip_token");
                  localStorage.removeItem("coinflip_user");
                }
                window.location.reload();
              }}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-400 hover:from-yellow-300 hover:to-amber-300 text-black font-black text-xs uppercase tracking-wider transition shadow-md shadow-yellow-400/20 cursor-pointer"
            >
              Register &amp; Win Real ₹ ➔
            </button>
          </div>
        </div>
      )}

      {/* Top Header Bar with Live Room Status & Live Winner Ticker */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-[#0B1120] via-[#111827] to-[#0B1120] border border-yellow-500/20 p-3.5 sm:p-4 rounded-2xl shadow-lg shadow-black/50">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 ring-2 ring-emerald-400/40"></span>
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <span>⚡</span>
                  <span>LIVE ARENA</span>
                </span>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-yellow-400/10 text-yellow-300 font-black border border-yellow-400/30">
                  Round #{roundId}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  2,420+ Online Players
                </span>
                <span className="text-[10px] text-gray-500">• 24x7 Continuous Loop</span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Recent Winner Alert Mini Ticker */}
        {activeWinner && (
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-yellow-400/15 via-amber-400/20 to-yellow-400/15 border border-yellow-400/40 text-xs text-yellow-300 animate-fade-in shadow-md">
            <Trophy className="w-4 h-4 text-yellow-400 shrink-0 animate-bounce" />
            <span className="font-semibold truncate max-w-[240px]">
              <strong className="text-white">{activeWinner.name}</strong> won{" "}
              <strong className="text-emerald-400 font-black">{RUPEE}{activeWinner.amount}</strong> on {activeWinner.side}!
            </span>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-[1.15fr_.85fr] gap-5">
        {/* Main Live Round Board */}
        <section className="rounded-3xl border border-white/10 bg-[#111827] p-6 md:p-7 relative overflow-hidden flex flex-col justify-between shadow-2xl">
          <div>
            {/* Premium Animated Round Phase Badge & Enhanced High-Precision Timer */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 border shadow-sm ${
                    phase === "BETTING"
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      : phase === "FLIPPING"
                      ? "bg-red-500/20 text-red-300 border-red-500/40 animate-pulse"
                      : "bg-yellow-500/20 text-yellow-300 border-yellow-500/40"
                  }`}
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${
                    phase === "BETTING" ? "bg-emerald-400 animate-ping" : phase === "FLIPPING" ? "bg-red-400 animate-spin" : "bg-yellow-400"
                  }`} />
                  <span>
                    {phase === "BETTING"
                      ? "🟢 BETTING OPEN (दांव लगाएं)"
                      : phase === "FLIPPING"
                      ? "🔴 BETS LOCKED • FLIPPING..."
                      : "🟡 ROUND RESULT & PAYOUT"}
                  </span>
                </span>

                {settings.windPhysicsEnabled && (
                  <span className="hidden sm:flex px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 text-xs font-bold items-center gap-1.5">
                    <span>{wind.icon}</span>
                    <span>{wind.weather}</span>
                  </span>
                )}
              </div>

              {/* Enhanced Super-Polished Live Digital Timer Display */}
              <div className="flex items-center gap-2">
                <div
                  className={`relative flex items-center gap-2.5 font-mono px-4 py-2 rounded-2xl border-2 transition-all duration-300 shadow-lg select-none ${
                    phase === "BETTING" && countdown <= 3
                      ? "bg-gradient-to-r from-red-600/30 via-rose-500/30 to-red-600/30 text-red-300 border-red-500 shadow-red-500/30 scale-105 animate-pulse"
                      : phase === "BETTING" && countdown <= 6
                      ? "bg-gradient-to-r from-amber-500/25 via-yellow-500/25 to-amber-500/25 text-yellow-300 border-amber-400/70 shadow-yellow-500/20"
                      : phase === "FLIPPING"
                      ? "bg-gradient-to-r from-cyan-600/30 to-blue-600/30 text-cyan-300 border-cyan-400/80 shadow-cyan-500/25"
                      : "bg-slate-900/90 text-white border-white/20 shadow-black/40"
                  }`}
                >
                  <div className={`p-1 rounded-lg ${
                    phase === "BETTING" && countdown <= 3
                      ? "bg-red-500 text-white animate-bounce"
                      : phase === "FLIPPING"
                      ? "bg-cyan-500 text-black animate-spin"
                      : "bg-yellow-400 text-black"
                  }`}>
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-[9px] font-sans font-black tracking-widest uppercase opacity-75 leading-none">
                      {phase === "BETTING" ? "BET TIMER" : phase === "FLIPPING" ? "STATUS" : "NEXT ROUND"}
                    </span>
                    <span className="text-base sm:text-lg font-black tracking-tight leading-tight pt-0.5">
                      {phase === "BETTING"
                        ? `00:${countdown < 10 ? `0${countdown}` : countdown}s`
                        : phase === "FLIPPING"
                        ? "FLIPPING..."
                        : `Next: 00:0${countdown}s`}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Glowing Dual-Color Live Countdown Progress Bar */}
            <div className="mb-4">
              <div className="w-full h-2.5 rounded-full bg-slate-950 border border-white/10 overflow-hidden relative p-0.5 shadow-inner">
                <div
                  className={`h-full transition-all duration-1000 ease-linear rounded-full shadow-md ${
                    phase === "BETTING" && countdown <= 3
                      ? "bg-gradient-to-r from-red-500 via-rose-500 to-red-600 animate-pulse shadow-red-500/50"
                      : phase === "BETTING" && countdown <= 6
                      ? "bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 shadow-yellow-400/50"
                      : phase === "FLIPPING"
                      ? "bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 animate-pulse shadow-cyan-400/50"
                      : "bg-gradient-to-r from-emerald-400 to-teal-400 shadow-emerald-400/50"
                  }`}
                  style={{
                    width: `${
                      phase === "BETTING"
                        ? Math.max(0, (countdown / (settings.speedRoundSeconds || 12)) * 100)
                        : phase === "FLIPPING"
                        ? 100
                        : Math.max(0, (countdown / 4) * 100)
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* Interactive 3D Coin Display (Tapping coin also places bet & flips!) */}
            <CoinDisplay
              side={coin}
              isFlipping={phase === "FLIPPING"}
              wind={settings.windPhysicsEnabled ? wind : null}
              isUrgent={phase === "BETTING" && countdown <= 4}
              onClick={() => {
                if (phase === "BETTING" && !placedBet) {
                  handleLockBet();
                }
              }}
            />

            {/* Active Round User Bet Status Badge */}
            {placedBet && (
              <div className="my-2 p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-between gap-2 animate-fade-in shadow-lg shadow-emerald-500/10">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-black">
                    ✓
                  </div>
                  <div>
                    <p className="text-xs font-black text-emerald-300">
                      YOUR BET LOCKED FOR ROUND #{placedBet.roundId}
                    </p>
                    <p className="text-[11px] text-gray-300 font-semibold">
                      {RUPEE}{placedBet.amount} on <strong className="text-yellow-300">{placedBet.choice}</strong> (Potential Payout: {RUPEE}{(placedBet.amount * (placedBet.choice === "TIE" ? settings.tieMultiplier : settings.payoutMultiplier)).toFixed(0)})
                    </p>
                  </div>
                </div>
                {phase === "BETTING" && (
                  <button
                    type="button"
                    onClick={handleCancelBet}
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white font-bold text-xs border border-white/15 transition cursor-pointer"
                  >
                    Change
                  </button>
                )}
              </div>
            )}

            {/* Result Display Box */}
            {result && phase === "RESULT" && (
              <div
                className={`my-3 rounded-2xl p-4 sm:p-5 border animate-fade-in ${
                  result.spectator
                    ? "bg-blue-500/10 border-blue-500/30"
                    : result.won
                    ? "bg-green-500/15 border-green-500/40 shadow-xl shadow-green-500/15"
                    : result.isTieResult
                    ? "bg-purple-500/20 border-purple-500/50 shadow-xl shadow-purple-500/20"
                    : "bg-red-500/15 border-red-500/30 shadow-xl shadow-red-500/15"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p
                      className={`text-xl sm:text-2xl font-black ${
                        result.spectator
                          ? "text-blue-300"
                          : result.won
                          ? "text-green-400"
                          : result.isTieResult
                          ? "text-purple-300"
                          : "text-red-400"
                      }`}
                    >
                      {result.spectator
                        ? `ROUND COMPLETED • RESULT: ${result.result}`
                        : result.won
                        ? result.prediction === "TIE"
                          ? "🔥 MEGA TIE JACKPOT WIN!"
                          : "🎉 YOU WON!"
                        : result.isTieResult
                        ? "⚖️ COIN LANDED ON EDGE (TIE)!"
                        : "💔 YOU LOST THIS ROUND"}
                    </p>
                    {result.isTieResult && !result.won && !result.spectator && (
                      <p className="text-xs text-purple-200 mt-0.5">
                        Round tied! Head aur Tail dono har gaye.
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-3 py-1.5 rounded-xl bg-white/15 font-black text-white">
                      {result.result}
                    </span>
                  </div>
                </div>

                {!result.spectator && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-xs">
                    <div className="bg-black/30 p-2 rounded-xl">
                      <span className="text-gray-400 block">Prediction</span>
                      <span className="text-white font-bold">{result.prediction}</span>
                    </div>
                    <div className="bg-black/30 p-2 rounded-xl">
                      <span className="text-gray-400 block">Outcome</span>
                      <span className="text-yellow-300 font-bold">{result.result}</span>
                    </div>
                    <div className="bg-black/30 p-2 rounded-xl">
                      <span className="text-gray-400 block">Bet Amount</span>
                      <span className="text-white font-bold">{RUPEE}{result.entryFee.toFixed(2)}</span>
                    </div>
                    <div className="bg-black/30 p-2 rounded-xl">
                      <span className="text-gray-400 block">Payout</span>
                      <span className={`font-black ${result.won ? "text-green-400" : "text-white"}`}>
                        {RUPEE}{result.winAmount.toFixed(2)} {result.won && `(${result.multiplier}X)`}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {errorMessage && (
              <div className="mt-3 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs sm:text-sm flex items-center justify-between gap-2">
                <span>⚠️ {errorMessage}</span>
                {walletBalance < Number(bet || 0) && setSection && !user?.isDemo && (
                  <button
                    type="button"
                    onClick={() => setSection("wallet")}
                    className="px-3 py-1 bg-yellow-400 hover:bg-yellow-300 text-black text-xs font-bold rounded-lg shrink-0 transition cursor-pointer"
                  >
                    Deposit Now ➔
                  </button>
                )}
              </div>
            )}

            {/* 3 Outcome Prediction Choice Buttons with Dynamic Win / Loss Badges on Top */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5 mt-4">
              {/* HEAD CHOICE BUTTON */}
              <button
                disabled={phase !== "BETTING" || Boolean(placedBet)}
                onClick={() => {
                  playClickSound();
                  setChoice("HEAD");
                  setCoin("HEAD");
                  setErrorMessage("");
                }}
                className={`relative rounded-2xl p-3 sm:p-4 font-black border transition-all flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 cursor-pointer ${
                  choice === "HEAD"
                    ? "bg-gradient-to-r from-yellow-400 to-amber-400 text-black border-yellow-300 shadow-[0_0_25px_rgba(234,179,8,0.35)] scale-[1.02]"
                    : "bg-[#0B1120] border-white/10 text-white hover:border-yellow-400/40 hover:bg-white/[0.03]"
                } ${phase !== "BETTING" || Boolean(placedBet) ? "opacity-80" : ""}`}
              >
                {/* Dynamic Win / Loss Indicator Badge on Top */}
                {phase === "RESULT" && result?.result && (
                  <div className="absolute -top-2.5 right-2 z-20">
                    {result.result === "HEAD" ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] sm:text-[10px] font-black uppercase tracking-wider shadow-md flex items-center gap-0.5 animate-bounce ring-2 ring-emerald-300">
                        <span>✓</span> WIN
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-rose-600/90 text-rose-100 text-[9px] sm:text-[10px] font-black uppercase tracking-wider shadow flex items-center gap-0.5 ring-1 ring-rose-400/50">
                        <span>✗</span> LOSS
                      </span>
                    )}
                  </div>
                )}

                <span className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-gradient-to-br from-amber-200 via-yellow-400 to-amber-600 border border-yellow-100 flex items-center justify-center text-black text-xs sm:text-sm font-black shadow shrink-0">
                  👑
                </span>
                <div className="text-center sm:text-left">
                  <div className="text-sm sm:text-base font-black leading-none flex items-center justify-center sm:justify-start gap-1">
                    <span>HEAD</span>
                    <span className="text-[10px] px-1 py-0.2 rounded bg-black/20 font-black">2X</span>
                  </div>
                  <div
                    className={`text-[10px] sm:text-xs mt-1 font-bold ${
                      choice === "HEAD" ? "text-amber-950" : "text-gray-400"
                    }`}
                  >
                    चित (Chit)
                  </div>
                </div>
              </button>

              {/* TIE / EDGE CHOICE BUTTON */}
              <button
                disabled={phase !== "BETTING" || Boolean(placedBet)}
                onClick={() => {
                  playClickSound();
                  setChoice("TIE");
                  setCoin("TIE");
                  setErrorMessage("");
                }}
                className={`relative rounded-2xl p-3 sm:p-4 font-black border transition-all flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 cursor-pointer ${
                  choice === "TIE"
                    ? "bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 text-white border-pink-300 shadow-[0_0_25px_rgba(217,70,239,0.45)] scale-[1.02]"
                    : "bg-[#0B1120] border-purple-500/30 text-white hover:border-purple-400 hover:bg-purple-500/10"
                } ${phase !== "BETTING" || Boolean(placedBet) ? "opacity-80" : ""}`}
              >
                {/* Dynamic Win / Loss Indicator Badge on Top */}
                {phase === "RESULT" && result?.result && (
                  <div className="absolute -top-2.5 right-2 z-20">
                    {result.result === "TIE" ? (
                      <span className="px-2 py-0.5 rounded-full bg-fuchsia-500 text-white text-[9px] sm:text-[10px] font-black uppercase tracking-wider shadow-md flex items-center gap-0.5 animate-bounce ring-2 ring-pink-300">
                        <span>★</span> 10X WIN
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-rose-600/90 text-rose-100 text-[9px] sm:text-[10px] font-black uppercase tracking-wider shadow flex items-center gap-0.5 ring-1 ring-rose-400/50">
                        <span>✗</span> LOSS
                      </span>
                    )}
                  </div>
                )}

                <span className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-gradient-to-br from-fuchsia-400 to-purple-700 border border-fuchsia-200 flex items-center justify-center text-white text-xs sm:text-sm font-black shadow shrink-0">
                  ⚖️
                </span>
                <div className="text-center sm:text-left">
                  <div className="text-sm sm:text-base font-black leading-none flex items-center justify-center sm:justify-start gap-1">
                    <span>TIE</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-yellow-400 text-black font-black animate-pulse">
                      {settings.tieMultiplier}X
                    </span>
                  </div>
                  <div
                    className={`text-[10px] sm:text-xs mt-1 font-bold ${
                      choice === "TIE" ? "text-pink-100" : "text-purple-300"
                    }`}
                  >
                    बराबरी (Edge)
                  </div>
                </div>
              </button>

              {/* TAIL CHOICE BUTTON */}
              <button
                disabled={phase !== "BETTING" || Boolean(placedBet)}
                onClick={() => {
                  playClickSound();
                  setChoice("TAIL");
                  setCoin("TAIL");
                  setErrorMessage("");
                }}
                className={`relative rounded-2xl p-3 sm:p-4 font-black border transition-all flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 cursor-pointer ${
                  choice === "TAIL"
                    ? "bg-gradient-to-r from-yellow-400 to-amber-400 text-black border-yellow-300 shadow-[0_0_25px_rgba(234,179,8,0.35)] scale-[1.02]"
                    : "bg-[#0B1120] border-white/10 text-white hover:border-yellow-400/40 hover:bg-white/[0.03]"
                } ${phase !== "BETTING" || Boolean(placedBet) ? "opacity-80" : ""}`}
              >
                {/* Dynamic Win / Loss Indicator Badge on Top */}
                {phase === "RESULT" && result?.result && (
                  <div className="absolute -top-2.5 right-2 z-20">
                    {result.result === "TAIL" ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] sm:text-[10px] font-black uppercase tracking-wider shadow-md flex items-center gap-0.5 animate-bounce ring-2 ring-emerald-300">
                        <span>✓</span> WIN
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-rose-600/90 text-rose-100 text-[9px] sm:text-[10px] font-black uppercase tracking-wider shadow flex items-center gap-0.5 ring-1 ring-rose-400/50">
                        <span>✗</span> LOSS
                      </span>
                    )}
                  </div>
                )}

                <span className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-gradient-to-br from-amber-200 via-yellow-400 to-amber-600 border border-yellow-100 flex items-center justify-center text-black text-xs sm:text-sm font-black shadow shrink-0">
                  {RUPEE}
                </span>
                <div className="text-center sm:text-left">
                  <div className="text-sm sm:text-base font-black leading-none flex items-center justify-center sm:justify-start gap-1">
                    <span>TAIL</span>
                    <span className="text-[10px] px-1 py-0.2 rounded bg-black/20 font-black">2X</span>
                  </div>
                  <div
                    className={`text-[10px] sm:text-xs mt-1 font-bold ${
                      choice === "TAIL" ? "text-amber-950" : "text-gray-400"
                    }`}
                  >
                    पट (Pat)
                  </div>
                </div>
              </button>
            </div>

            {/* Bet Input & Fast Chip Multipliers */}
            <div className="mt-4">
              <div className="flex justify-between items-center text-xs text-gray-400 mb-1.5">
                <label className="font-semibold">Entry Fee (दांव राशि)</label>
                <span className="text-yellow-400/90 font-bold">
                  Payout: {RUPEE}
                  {(
                    Number(bet || 0) *
                    (choice === "TIE" ? settings.tieMultiplier : settings.payoutMultiplier)
                  ).toFixed(0)}
                  {choice === "TIE" && (
                    <span className="ml-1 text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded font-black">
                      JACKPOT {settings.tieMultiplier}X
                    </span>
                  )}
                </span>
              </div>
              <div className="flex gap-2">
                <span className="flex items-center px-4 rounded-xl bg-[#0B1120] border border-white/10 text-gray-400 font-bold">
                  {RUPEE}
                </span>
                <input
                  type="number"
                  min={settings.minBet}
                  max={settings.maxBet}
                  value={bet}
                  onChange={(e) => {
                    setBet(e.target.value);
                    setErrorMessage("");
                  }}
                  disabled={phase !== "BETTING" || Boolean(placedBet)}
                  placeholder={`Enter ${settings.minBet} - ${settings.maxBet}`}
                  className="flex-1 bg-[#0B1120] border border-white/10 focus:border-yellow-400 rounded-xl px-4 py-3 outline-none font-bold text-white text-base"
                />
              </div>
            </div>

            {/* Quick Multiplier Chips */}
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 mt-2.5">
              {[10, 50, 100, 500, 1000].map((amount) => (
                <button
                  key={amount}
                  disabled={phase !== "BETTING" || Boolean(placedBet)}
                  onClick={() => {
                    playClickSound();
                    setBet(String(amount));
                    setErrorMessage("");
                  }}
                  className={`py-2 rounded-xl font-black text-xs border transition active:scale-95 cursor-pointer ${
                    bet === String(amount)
                      ? "bg-gradient-to-r from-yellow-400 to-amber-400 text-black border-yellow-300 shadow-md shadow-yellow-400/30 ring-2 ring-yellow-400/50"
                      : "bg-white/5 hover:bg-white/10 border-white/10 text-white"
                  }`}
                >
                  {RUPEE}{amount}
                </button>
              ))}
              <button
                type="button"
                disabled={phase !== "BETTING" || Boolean(placedBet)}
                onClick={() => {
                  playClickSound();
                  const half = Math.max(settings.minBet, Math.floor((Number(bet) || 10) / 2));
                  setBet(String(half));
                }}
                className="py-2 rounded-xl font-black text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-cyan-300 transition active:scale-95 cursor-pointer"
                title="Half Bet (1/2)"
              >
                1/2
              </button>
              <button
                type="button"
                disabled={phase !== "BETTING" || Boolean(placedBet)}
                onClick={() => {
                  playClickSound();
                  const double = Math.min(settings.maxBet, (Number(bet) || 10) * 2);
                  setBet(String(double));
                }}
                className="py-2 rounded-xl font-black text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-yellow-300 transition active:scale-95 cursor-pointer"
                title="Double Bet (2X)"
              >
                2X
              </button>
              <button
                type="button"
                disabled={phase !== "BETTING" || Boolean(placedBet)}
                onClick={() => {
                  playClickSound();
                  const maxAffordable = Math.min(settings.maxBet, Math.max(settings.minBet, Math.floor(walletBalance)));
                  setBet(String(maxAffordable));
                }}
                className="py-2 rounded-xl font-black text-xs bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-300 transition active:scale-95 cursor-pointer"
                title="Max Affordable Bet"
              >
                MAX
              </button>
            </div>
          </div>

          {/* Bottom Action Area: Lock Bet Button & Auto-Bet Switch */}
          <div className="mt-5 pt-3 border-t border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoBet}
                  onChange={(e) => {
                    setAutoBet(e.target.checked);
                    playClickSound();
                  }}
                  className="w-4 h-4 rounded text-yellow-400 focus:ring-yellow-400 border-gray-600 bg-gray-700"
                />
                <span className="flex items-center gap-1 text-xs font-bold text-gray-200">
                  <Bot className="w-3.5 h-3.5 text-yellow-400" />
                  <span>Auto-Bet on Every Round (हर राउंड में ऑटो दांव)</span>
                </span>
              </label>
              {autoBet && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-300 font-bold border border-yellow-400/30 animate-pulse">
                  ACTIVE
                </span>
              )}
            </div>

            {/* Main Action Button */}
            {placedBet ? (
              <div className="w-full rounded-2xl bg-emerald-500/20 border-2 border-emerald-400 text-emerald-300 py-4 px-4 font-black text-center text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/15">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 animate-pulse" />
                <span>BET LOCKED ({RUPEE}{placedBet.amount} ON {placedBet.choice}) • WAITING FOR FLIP...</span>
              </div>
            ) : phase === "FLIPPING" ? (
              <div className="w-full rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-300 py-4 px-4 font-black text-center text-sm sm:text-base flex items-center justify-center gap-2 animate-pulse">
                <span className="inline-block animate-spin">🪙</span>
                <span>BETS CLOSED • FLIPPING COIN IN {wind.weather.toUpperCase()}...</span>
              </div>
            ) : phase === "RESULT" ? (
              <div className="w-full rounded-2xl bg-white/10 border border-white/20 text-white py-4 px-4 font-black text-center text-sm sm:text-base flex items-center justify-center gap-2">
                <span>⏱️</span>
                <span>PREPARING NEXT ROUND #{roundId + 1} ({countdown}s)...</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleLockBet}
                className={`w-full rounded-2xl font-black py-4 text-base transition-all duration-200 shadow-xl cursor-pointer flex items-center justify-center gap-2 ${
                  choice === "TIE"
                    ? "bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white shadow-purple-500/30 hover:scale-[1.01] active:scale-[0.99]"
                    : "bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:from-yellow-300 hover:to-amber-400 text-black shadow-yellow-400/20 hover:scale-[1.01] active:scale-[0.99]"
                }`}
              >
                <span>🪙</span>
                <span>
                  PLACE BET ( दांव लगाएं: {RUPEE}{bet || 0} ON {choice} ) ➔
                </span>
              </button>
            )}
          </div>
        </section>

        {/* Right Info Section: How Round Loop Works & Live Table Integrity */}
        <section className="rounded-3xl border border-white/10 bg-[#111827] p-6 space-y-5 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-black flex items-center gap-2 text-white">
              <span>🎮</span>
              <span>Live Continuous Round Rules</span>
            </h2>
            <div className="space-y-3.5 mt-4">
              {[
                ["01", "12s Betting Window: Place and lock your prediction before timer ends"],
                ["02", "3s Coin Flip: Bets lock automatically and 3D coin spins live"],
                ["03", "Instant Payout: 2X on Head/Tail or 10X Mega Jackpot on Tie"],
                ["04", "Non-stop Cycle: Next round starts immediately with new odds"],
              ].map(([n, text]) => (
                <div key={n} className="flex gap-3 items-start">
                  <span className="h-7 w-7 shrink-0 rounded-lg bg-yellow-400/10 text-yellow-400 flex items-center justify-center font-black text-xs border border-yellow-400/20">
                    {n}
                  </span>
                  <p className="text-gray-300 text-xs pt-0.5 leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Dynamic Weather & Physics Box */}
          <div className="rounded-2xl bg-[#0B1120] border border-white/10 p-4 space-y-2.5">
            <h3 className="font-bold text-xs text-yellow-400 flex items-center gap-1.5">
              <span>⚡</span>
              <span>Physics Engine &amp; Weather Factors</span>
            </h3>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Every round generates natural angular wobble altered by {wind.weather} ({wind.speedKmh} km/h). Real-time encrypted RNG guarantees absolute fairness.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
              <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5">
                <span className="text-gray-400 block text-[10px]">Round Pace:</span>
                <span className="font-bold text-white">12s + 3s Turbo</span>
              </div>
              <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5">
                <span className="text-gray-400 block text-[10px]">Multiplier:</span>
                <span className="font-bold text-yellow-300">2X / 10X Tie</span>
              </div>
            </div>
          </div>

          {/* Table Integrity & Status */}
          <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-gray-400">RNG Table Status</p>
              <p className="font-black flex items-center gap-1.5 text-xs text-green-400 mt-0.5">
                <span className="h-2 w-2 rounded-full bg-green-400 animate-ping" />
                <span>Live Synchronized Stream</span>
              </p>
            </div>
            <ShieldCheck className="w-6 h-6 text-green-400/80" />
          </div>
        </section>
      </div>
    </div>
  );
}

function CoinDisplay({ side, isFlipping, onClick, wind, isUrgent }) {
  const tiltAngle = wind ? wind.tilt : 0;

  return (
    <div
      onClick={!isFlipping && onClick ? onClick : undefined}
      className={`relative flex flex-col items-center justify-center py-6 select-none ${
        !isFlipping && onClick ? "cursor-pointer group" : ""
      }`}
      title={!isFlipping ? "Click or tap coin to flip!" : undefined}
    >
      {/* Golden / Urgent Red Stage Glow */}
      <div
        className={`absolute w-52 h-52 rounded-full blur-3xl pointer-events-none transition-all duration-300 ${
          isUrgent
            ? "bg-red-500/35 animate-pulse"
            : "bg-yellow-400/20 group-hover:bg-yellow-400/35"
        }`}
      />

      {/* Wind Gust Particle Overlay */}
      {isFlipping && wind && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
          <div className="w-64 h-1 bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent blur-[1px] animate-wind-gust -rotate-12" />
          <div className="w-56 h-1 bg-gradient-to-r from-transparent via-white/50 to-transparent blur-[1px] animate-wind-gust rotate-6 delay-150" />
        </div>
      )}

      {/* 3D Realistic Coin Body */}
      <div
        className={`relative w-44 h-44 sm:w-48 sm:h-48 rounded-full transition-transform duration-300 ${
          isFlipping
            ? "animate-coin-spin"
            : isUrgent
            ? "animate-urgent"
            : "group-hover:scale-105 group-active:scale-95"
        }`}
        style={{
          perspective: "1000px",
          transform: !isFlipping && tiltAngle ? `rotateZ(${tiltAngle * 0.4}deg)` : undefined,
        }}
      >
        {/* Outer Heavy Milled Edge Rim */}
        <div
          className={`absolute inset-0 rounded-full bg-gradient-to-br from-amber-200 via-yellow-500 to-amber-900 p-2 shadow-[0_12px_40px_rgba(234,179,8,0.4),0_0_20px_rgba(217,119,6,0.35)] border-2 transition-all ${
            isUrgent
              ? "border-red-400 shadow-[0_0_35px_rgba(239,68,68,0.7)]"
              : "border-yellow-200/80 group-hover:shadow-[0_16px_50px_rgba(234,179,8,0.6)]"
          }`}
        >
          {/* Concentric Milled Grooves Ring */}
          <div className="w-full h-full rounded-full bg-gradient-to-tr from-amber-700 via-amber-400 to-yellow-200 p-1.5 shadow-inner border border-amber-900/60">
            {/* Beaded Dotted Inner Border */}
            <div className="w-full h-full rounded-full border-2 border-dashed border-amber-950/60 p-2 flex items-center justify-center bg-gradient-to-b from-yellow-300 via-amber-400 to-amber-600 shadow-[inset_0_4px_14px_rgba(0,0,0,0.35)]">
              {/* Coin Face Contents */}
              {side === "HEAD" ? (
                <div className="text-center select-none">
                  <div className="text-[9px] sm:text-[10px] font-black tracking-[0.22em] text-amber-950 uppercase opacity-80">
                    ★ BHARAT • INDIA ★
                  </div>
                  <div className="my-1 flex justify-center">
                    <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-gradient-to-b from-amber-950 to-amber-900 text-yellow-300 flex items-center justify-center shadow-lg border-2 border-yellow-300/60 group-hover:scale-105 transition-transform">
                      <span className="text-2xl sm:text-3xl font-black">👑</span>
                    </div>
                  </div>
                  <div className="text-xl sm:text-2xl font-black tracking-wider text-amber-950 drop-shadow-[0_1px_1px_rgba(255,255,255,0.6)]">
                    HEAD
                  </div>
                  <div className="text-[10px] font-black text-amber-950/80 tracking-wider">
                    चित (CHIT)
                  </div>
                </div>
              ) : side === "TAIL" ? (
                <div className="text-center select-none">
                  <div className="text-[9px] sm:text-[10px] font-black tracking-[0.22em] text-amber-950 uppercase opacity-80">
                    ★ सत्यमेव जयते ★
                  </div>
                  <div className="my-1 flex justify-center items-center gap-1.5">
                    <span className="text-amber-950/70 text-base font-serif">🌾</span>
                    <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-gradient-to-b from-amber-950 to-amber-900 text-yellow-300 flex items-center justify-center shadow-lg border-2 border-yellow-300/60 group-hover:scale-105 transition-transform">
                      <span className="text-2xl sm:text-3xl font-black">{RUPEE}</span>
                    </div>
                    <span className="text-amber-950/70 text-base font-serif">🌾</span>
                  </div>
                  <div className="text-xl sm:text-2xl font-black tracking-wider text-amber-950 drop-shadow-[0_1px_1px_rgba(255,255,255,0.6)]">
                    TAIL
                  </div>
                  <div className="text-[10px] font-black text-amber-950/80 tracking-wider">
                    पट (PAT)
                  </div>
                </div>
              ) : side === "TIE" ? (
                <div className="text-center select-none">
                  <div className="text-[9px] sm:text-[10px] font-black tracking-[0.22em] text-purple-950 uppercase opacity-90">
                    ★ COIN ON EDGE • 10X ★
                  </div>
                  <div className="my-1 flex justify-center items-center">
                    <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-gradient-to-b from-purple-950 to-fuchsia-900 text-yellow-300 flex items-center justify-center shadow-lg border-2 border-fuchsia-300/80 animate-bounce">
                      <span className="text-2xl sm:text-3xl font-black">⚖️</span>
                    </div>
                  </div>
                  <div className="text-xl sm:text-2xl font-black tracking-wider text-purple-950 drop-shadow-[0_1px_1px_rgba(255,255,255,0.6)]">
                    TIE / EDGE
                  </div>
                  <div className="text-[10px] font-black text-purple-950/90 tracking-wider">
                    सिक्का खड़ा रहा (बराबरी)
                  </div>
                </div>
              ) : (
                <div className="text-center select-none">
                  <div className="text-[9px] sm:text-[10px] font-black tracking-[0.22em] text-amber-950 uppercase opacity-75">
                    ★ CHOOSE &amp; FLIP ★
                  </div>
                  <div className="my-1 flex justify-center">
                    <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-gradient-to-b from-amber-950 to-amber-900 text-yellow-300 flex items-center justify-center shadow-lg border-2 border-yellow-300/60">
                      <span className="text-2xl sm:text-3xl font-black animate-pulse">🪙</span>
                    </div>
                  </div>
                  <div className="text-xl sm:text-2xl font-black tracking-wider text-amber-950 drop-shadow-[0_1px_1px_rgba(255,255,255,0.6)]">
                    COIN
                  </div>
                  <div className="text-[10px] font-black text-amber-950/80 tracking-wider">
                    HEAD, TAIL या TIE चुनें
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic 3D Ground Shadow with Wind Tilt */}
      <div
        className={`w-32 sm:w-36 h-3.5 rounded-full bg-black/60 blur-sm mt-4 transition-all duration-300 ${
          isFlipping ? "animate-coin-shadow" : "group-hover:scale-110"
        }`}
        style={{
          transform: !isFlipping && tiltAngle ? `translateX(${tiltAngle * 0.5}px)` : undefined,
        }}
      />

      {!isFlipping && (
        <p className="text-[11px] font-bold text-yellow-400/80 mt-2 tracking-wide uppercase group-hover:text-yellow-300 transition-colors">
          👆 Tap coin or button below to flip
        </p>
      )}
    </div>
  );
}

function HistoryView() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const response = await authFetch("/api/game/history", { cache: "no-store" });
      const data = await response.json();
      if (data.success) setGames(data.games || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    const wins = games.filter((g) => g.status === "won").length;
    const losses = games.filter((g) => g.status === "lost").length;
    return { wins, losses };
  }, [games]);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-yellow-400 text-sm font-black uppercase tracking-[0.2em]">
            Activity
          </p>
          <h1 className="text-4xl font-black mt-2">Game History</h1>
        </div>
        <button
          onClick={load}
          className="border border-white/10 rounded-xl px-4 py-2 font-bold hover:bg-white/5"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <StatCard title="Rounds" value={games.length} accent="yellow" />
        <StatCard title="Wins" value={stats.wins} accent="green" />
        <StatCard title="Losses" value={stats.losses} accent="blue" />
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#111827] overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading history...</div>
        ) : games.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            No CoinFlip rounds yet.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {games.map((game) => (
              <div
                key={String(game._id)}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <p className="font-black">
                    {game.prediction === "heads" ? "HEAD" : "TAIL"}{" "}
                    <span className="text-gray-600">→</span>{" "}
                    {game.result === "heads" ? "HEAD" : "TAIL"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(game.createdAt).toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="sm:text-right">
                  <p
                    className={`font-black ${
                      game.status === "won"
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                  >
                    {game.status === "won" ? "WON" : "LOST"}
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    Entry {RUPEE}
                    {Number(game.entryFee || 0).toFixed(2)} · Payout {RUPEE}
                    {Number(game.winAmount || 0).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function WalletView({ user: parentUser, refreshUser }) {
  const [user, setUser] = useState(parentUser);
  const [transactions, setTransactions] = useState([]);
  const [amount, setAmount] = useState("500");
  const [utr, setUtr] = useState("");
  const [upiId, setUpiId] = useState("");
  const [screenshot, setScreenshot] = useState("");
  const [note, setNote] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawUpi, setWithdrawUpi] = useState(parentUser?.linkedUpiId || "");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', text: '' }
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [adminSettings, setAdminSettings] = useState({
    upiId: "",
    backupUpiId: "",
    merchantName: "CoinFlip Official",
    qrCode: "",
    qrCodeType: "both",
    barcodeNumber: "",
    showQrBarcode: true,
    depositInstructions: "",
    minDeposit: 10,
    maxDeposit: 50000,
  });
  const [enlargeQrModal, setEnlargeQrModal] = useState(false);

  // Keep state synced with parentUser
  useEffect(() => {
    if (parentUser) {
      setUser(parentUser);
      if (parentUser.linkedUpiId && !withdrawUpi) {
        setWithdrawUpi(parentUser.linkedUpiId);
      }
    }
  }, [parentUser]);

  async function load() {
    try {
      const [meRes, txRes, settingsRes] = await Promise.all([
        authFetch("/api/me", { cache: "no-store" }),
        authFetch("/api/wallet/transactions", { cache: "no-store" }),
        authFetch("/api/game/settings", { cache: "no-store" }),
      ]);
      const me = await meRes.json().catch(() => null);
      const tx = await txRes.json().catch(() => null);
      const st = await settingsRes.json().catch(() => null);
      if (me?.success) {
        setUser(me.user);
        if (me.user?.linkedUpiId) {
          setWithdrawUpi(me.user.linkedUpiId);
        }
      }
      if (tx?.success) setTransactions(tx.transactions || []);
      if (st?.success && st.settings) {
        setAdminSettings({
          upiId: st.settings.upiId || "",
          backupUpiId: st.settings.backupUpiId || "",
          merchantName: st.settings.merchantName || "CoinFlip Official",
          qrCode: st.settings.qrCode || "",
          qrCodeType: st.settings.qrCodeType || "both",
          barcodeNumber: st.settings.barcodeNumber || "",
          showQrBarcode: st.settings.showQrBarcode !== false,
          depositInstructions: st.settings.depositInstructions || "",
          minDeposit: Number(st.settings.minDeposit ?? 10),
          maxDeposit: Number(st.settings.maxDeposit ?? 50000),
        });
      }
    } catch (error) {
      console.error(error);
    }
  }

  function copyToClipboard(text) {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2000);
    }
  }

  function handleScreenshotChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setFeedback({ type: "error", text: "Screenshot image 5MB se chhoti honi chahiye." });
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setScreenshot(event.target.result);
    };
    reader.readAsDataURL(file);
  }

  useEffect(() => {
    load();
  }, []);

  async function deposit(e) {
    e.preventDefault();
    setFeedback(null);
    const value = Number(amount);

    if (!Number.isFinite(value) || value < 10) {
      setFeedback({ type: "error", text: "Minimum deposit amount ₹10 hai." });
      return;
    }

    if (!utr.trim()) {
      setFeedback({
        type: "error",
        text: "Please UPI payment karke 12-digit UTR/Reference number dalein.",
      });
      return;
    }

    setBusy(true);
    try {
      const response = await authFetch("/api/wallet/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: value,
          utr: utr.trim(),
          upiId: upiId.trim(),
          screenshot: screenshot,
          note: note.trim(),
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        setFeedback({
          type: "error",
          text: data.message || "Unable to submit deposit.",
        });
        return;
      }
      setFeedback({
        type: "success",
        text: "✅ Deposit request submit ho gayi hai! Admin verification ke baad aapke wallet me balance add ho jayega.",
      });
      setUtr("");
      setUpiId("");
      setScreenshot("");
      setNote("");
      await load();
      await refreshUser();
    } catch (err) {
      console.error(err);
      setFeedback({ type: "error", text: "Deposit submit karne me error aaya." });
    } finally {
      setBusy(false);
    }
  }

  async function withdraw(e) {
    e.preventDefault();
    setFeedback(null);
    const value = Number(withdrawAmount);
    const balance = Number(user?.walletBalance || 0);

    if (!Number.isFinite(value) || value < 10) {
      setFeedback({ type: "error", text: "Minimum withdrawal amount ₹10 hai." });
      return;
    }

    if (value > balance) {
      setFeedback({
        type: "error",
        text: `Insufficient balance. Aapke wallet me ₹${balance.toFixed(2)} hain.`,
      });
      return;
    }

    if (!withdrawUpi.trim()) {
      setFeedback({ type: "error", text: "Please enter your UPI ID." });
      return;
    }

    setBusy(true);
    try {
      const response = await authFetch("/api/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: value, upiId: withdrawUpi.trim() }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        setFeedback({
          type: "error",
          text: data.message || "Unable to submit withdrawal.",
        });
        return;
      }
      setFeedback({
        type: "success",
        text: "✅ Withdrawal request submitted! Admin review ke baad UPI par transfer ho jayega.",
      });
      setWithdrawAmount("");
      setWithdrawUpi("");
      await load();
      await refreshUser();
    } catch (err) {
      console.error(err);
      setFeedback({ type: "error", text: "Withdrawal request failed." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="text-yellow-400 text-sm font-black uppercase tracking-[0.2em]">
            Money Management
          </p>
          <h1 className="text-4xl font-black mt-1">Wallet &amp; Funds</h1>
        </div>
        <button
          onClick={load}
          className="border border-white/10 rounded-xl px-4 py-2 text-sm font-bold hover:bg-white/5 self-start sm:self-auto"
        >
          Refresh Balance
        </button>
      </div>

      {/* Global In-App Notification Feedback */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-sm font-bold flex items-center justify-between transition-all ${
            feedback.type === "success"
              ? "bg-green-500/15 border-green-500/30 text-green-400"
              : feedback.type === "info"
              ? "bg-yellow-400/15 border-yellow-400/30 text-yellow-300"
              : "bg-red-500/15 border-red-500/30 text-red-400"
          }`}
        >
          <span>{feedback.text}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs px-2 py-1 bg-white/10 rounded-lg hover:bg-white/20"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Wallet Balance Hero Card */}
      <div className="rounded-3xl bg-gradient-to-br from-emerald-500/15 via-[#111827] to-[#111827] border border-emerald-500/30 p-7 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <p className="text-emerald-400 text-xs font-bold uppercase tracking-wider">
              Available Wallet Balance
            </p>
            <p className="text-5xl font-black text-emerald-400 mt-2 tracking-tight">
              {RUPEE}
              {Number(user?.walletBalance || 0).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
            <p className="text-gray-400 text-xs mt-2">
              All deposits require Admin UTR verification before funds are credited.
            </p>
          </div>

          <div className="rounded-2xl bg-[#0B1120] border border-white/10 p-4 max-w-sm w-full space-y-2 text-xs">
            <div className="flex items-center gap-2 text-yellow-400 font-bold">
              <span>🛡️</span>
              <span>Manual Admin Approval Deposit</span>
            </div>
            <p className="text-gray-400 leading-relaxed">
              1. Neeche diye gaye form me deposit amount select karein.<br />
              2. UPI se payment karke 12-digit UTR submit karein.<br />
              3. Admin check karke aapka balance approve karega.
            </p>
          </div>
        </div>
      </div>

      {/* 100% Welcome Bonus Promo Banner */}
      {!user?.hasClaimedWelcomeBonus && (
        <div className="rounded-3xl border border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 via-amber-500/15 to-yellow-500/10 p-6 shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-bold text-yellow-400 uppercase tracking-wider mb-1">
                <span>🎁</span>
                <span>100% First Deposit Match Bonus Active</span>
              </div>
              <h3 className="text-xl font-black text-white">Double Your Money on 1st Deposit!</h3>
              <p className="text-xs text-gray-300 mt-1 max-w-2xl">
                Aapke pehle deposit par 100% match bonus credit hoga (up to ₹5,000). Example: ₹500 deposit karne par ₹1,000 milega!
              </p>
            </div>
            <div className="flex items-center gap-3 bg-[#0B1120]/80 border border-yellow-400/20 rounded-2xl px-4 py-3 shrink-0">
              <div className="text-center">
                <span className="text-[10px] text-gray-400 uppercase block font-bold">Deposit</span>
                <span className="font-mono text-sm font-black text-white">{RUPEE}{amount || "100"}</span>
              </div>
              <span className="text-yellow-400 font-black text-lg">➔</span>
              <div className="text-center">
                <span className="text-[10px] text-yellow-400 uppercase block font-bold">You Get Total</span>
                <span className="font-mono text-base font-black text-emerald-400">
                  {RUPEE}{Number(amount || "100") * 2}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Manual Deposit Form with UPI & UTR */}
        <form
          onSubmit={deposit}
          className="rounded-3xl border border-white/10 bg-[#111827] p-6 sm:p-7 space-y-4"
        >
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black">Deposit via UPI / QR</h2>
              <span className="text-xs font-bold text-yellow-400 bg-yellow-400/10 px-2.5 py-1 rounded-full border border-yellow-400/20">
                Manual Admin Approval
              </span>
            </div>
            <p className="text-gray-400 text-xs mt-1">
              Admin UPI par paise transfer karein aur 12-digit UTR submit karein.
            </p>
          </div>

          {/* Official Admin Payment UPI, QR & Barcode Section */}
          <div className="rounded-2xl bg-gradient-to-b from-yellow-500/15 via-[#0B1120] to-[#0B1120] border border-yellow-500/30 p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-black text-yellow-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span>📱</span>
                  <span>Official UPI Payment QR &amp; Barcode</span>
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Scan QR with any app (GPay / PhonePe / Paytm) or copy UPI ID
                </p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                Instant Scan
              </span>
            </div>

            {/* QR Code & Barcode Display Container */}
            {adminSettings.showQrBarcode !== false && (
              <div className="flex flex-col sm:flex-row items-center gap-4 bg-black/50 border border-yellow-400/20 rounded-2xl p-3.5">
                {/* QR Code Frame */}
                <div
                  onClick={() => setEnlargeQrModal(true)}
                  className="relative p-2.5 rounded-xl bg-white text-black shadow-lg flex flex-col items-center justify-center shrink-0 cursor-pointer group hover:ring-2 hover:ring-yellow-400 transition"
                  title="Click to Enlarge QR Code"
                >
                  <div className="text-[8px] font-black tracking-wider text-gray-800 uppercase mb-1">
                    {adminSettings.merchantName || "COINFLIP PAY"}
                  </div>

                  <div className="relative w-32 h-32 bg-white flex items-center justify-center overflow-hidden rounded border border-gray-200">
                    <img
                      src={
                        adminSettings.qrCode ||
                        `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                          `upi://pay?pa=${adminSettings.upiId || "coinflip.pay@upi"}&pn=${encodeURIComponent(
                            adminSettings.merchantName || "CoinFlip Official"
                          )}&am=${amount || "100"}&cu=INR&tn=Deposit`
                        )}`
                      }
                      alt="UPI Payment QR Code"
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <div className="mt-1 flex items-center gap-1 text-[8px] font-bold text-gray-600 group-hover:text-yellow-700">
                    <span>🔍</span> Tap to Enlarge
                  </div>
                </div>

                {/* Right Info: Amount, UPI ID, Barcode, Pay Button */}
                <div className="space-y-2.5 text-center sm:text-left flex-1 w-full">
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Merchant UPI ID</span>
                    <p className="font-mono text-sm font-black text-yellow-300 select-all">
                      {adminSettings.upiId || "coinflip.pay@upi"}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      Merchant: {adminSettings.merchantName || "CoinFlip Official"}
                    </p>
                  </div>

                  {/* Simulated Merchant Barcode */}
                  <div className="p-2 rounded-xl bg-[#111827] border border-white/5 text-center">
                    <div className="flex justify-center items-end gap-1 h-6 px-2 overflow-hidden">
                      {[3, 1, 4, 2, 1, 3, 2, 4, 1, 2, 3, 1, 4, 2, 3, 1, 2, 4, 1, 3, 2, 1, 4].map((w, i) => (
                        <span
                          key={i}
                          className="bg-white/70 h-full rounded-xs"
                          style={{
                            width: `${w * 1.4}px`,
                            height: `${65 + (i % 4) * 8}%`,
                          }}
                        />
                      ))}
                    </div>
                    <p className="font-mono text-[9px] text-gray-400 mt-1 tracking-widest uppercase truncate">
                      {adminSettings.barcodeNumber || adminSettings.upiId || "COINFLIP-PAY-TERMINAL"}
                    </p>
                  </div>

                  {/* Direct UPI App Intent Link & Copy Button */}
                  <div className="flex flex-wrap gap-2 pt-0.5">
                    <a
                      href={`upi://pay?pa=${encodeURIComponent(adminSettings.upiId || "coinflip.pay@upi")}&pn=${encodeURIComponent(
                        adminSettings.merchantName || "CoinFlip Official"
                      )}&am=${amount || "100"}&cu=INR&tn=CoinFlip%20Deposit`}
                      className="flex-1 min-w-[140px] text-center px-3 py-2 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-400 hover:from-yellow-300 hover:to-amber-300 text-black font-black text-xs transition shadow-md flex items-center justify-center gap-1.5"
                    >
                      <span>⚡</span>
                      <span>Pay {RUPEE}{amount || "100"} via UPI App</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(adminSettings.upiId || "coinflip.pay@upi")}
                      className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition shrink-0"
                    >
                      {copiedUpi ? "Copied! ✓" : "Copy UPI"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Select or Enter Amount
            </label>
            <div className="grid grid-cols-4 gap-2 mt-2 mb-2">
              {[100, 500, 1000, 2000].map((val) => (
                <button
                  type="button"
                  key={val}
                  onClick={() => setAmount(String(val))}
                  className={`py-1.5 rounded-lg text-xs font-bold border transition ${
                    amount === String(val)
                      ? "bg-yellow-400 text-black border-yellow-400"
                      : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
                  }`}
                >
                  {RUPEE}{val}
                </button>
              ))}
            </div>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-gray-500 font-bold">
                {RUPEE}
              </span>
              <input
                type="number"
                min="10"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter deposit amount"
                className={inputClass + " pl-9"}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">
              12-Digit UTR / Transaction Reference Number
            </label>
            <input
              value={utr}
              onChange={(e) => setUtr(e.target.value)}
              placeholder="e.g. 329847192847"
              className={inputClass}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center justify-between">
              <span>Sender UPI ID (Payment karne wala UPI)</span>
              {user?.linkedUpiId && (
                <span className="text-[10px] text-yellow-400 font-normal">
                  Linked: {user.linkedUpiId}
                </span>
              )}
            </label>
            <input
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder={user?.linkedUpiId || "e.g. yourname@okaxis"}
              className={inputClass + " mt-1.5"}
            />
            <p className="text-[11px] text-amber-400/90 mt-1 flex items-center gap-1">
              <span>🔒</span> Security Rule: Jis UPI ID se deposit karenge, withdrawal payout bhi usi account me milega.
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
              Payment Screenshot / Receipt (Recommended)
            </label>
            {!screenshot ? (
              <label className="border-2 border-dashed border-white/10 hover:border-yellow-400/50 rounded-xl p-3.5 flex items-center justify-center gap-3 cursor-pointer bg-[#0B1120] hover:bg-white/[0.02] transition">
                <span className="text-xl">📸</span>
                <div className="text-left">
                  <p className="text-xs font-bold text-gray-200">
                    Upload Payment Screenshot
                  </p>
                  <p className="text-[10px] text-gray-500">
                    PNG, JPG, JPEG up to 5MB
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleScreenshotChange}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="relative rounded-xl border border-yellow-400/30 bg-[#0B1120] p-2.5 flex items-center gap-3">
                <img
                  src={screenshot}
                  alt="Receipt Preview"
                  className="h-14 w-14 object-cover rounded-lg border border-white/10"
                />
                <div className="flex-1 overflow-hidden">
                  <p className="text-xs font-bold text-green-400">
                    ✓ Screenshot Attached
                  </p>
                  <p className="text-[10px] text-gray-400 truncate">
                    Ready for quick Admin approval
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setScreenshot("")}
                  className="px-2.5 py-1 text-xs rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 font-bold transition"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full mt-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black font-black py-3.5 disabled:opacity-50 transition shadow-lg shadow-yellow-400/10"
          >
            {busy ? "Submitting..." : "Submit Deposit Request"}
          </button>
        </form>

        {/* Withdrawal Form */}
        <form
          onSubmit={withdraw}
          className="rounded-3xl border border-white/10 bg-[#111827] p-6 sm:p-7 space-y-4"
        >
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black">Withdraw Funds</h2>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                Instant UPI
              </span>
            </div>
            <p className="text-gray-400 text-xs mt-1">
              Apne jeete hue paise UPI ke zariye withdraw karein.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Withdrawal Amount
              </label>
              <button
                type="button"
                onClick={() => setWithdrawAmount(String(user?.walletBalance || 0))}
                className="text-xs text-yellow-400 hover:underline font-bold"
              >
                Max Balance ({RUPEE}{Number(user?.walletBalance || 0).toFixed(0)})
              </button>
            </div>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-gray-500 font-bold">
                {RUPEE}
              </span>
              <input
                type="number"
                min="10"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="Enter withdrawal amount"
                className={inputClass + " pl-9"}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Payout UPI ID (Withdrawal Account)
              </label>
              {user?.linkedUpiId && (
                <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  🔒 Locked to Deposit Account
                </span>
              )}
            </div>
            <input
              value={user?.isUpiLocked && user?.linkedUpiId ? user.linkedUpiId : withdrawUpi}
              onChange={(e) => {
                if (!user?.isUpiLocked || !user?.linkedUpiId) {
                  setWithdrawUpi(e.target.value);
                }
              }}
              readOnly={Boolean(user?.isUpiLocked && user?.linkedUpiId)}
              placeholder="e.g. yourname@ybl or 9876543210@paytm"
              className={`${inputClass} mt-1.5 ${
                user?.isUpiLocked && user?.linkedUpiId ? "bg-black/50 border-emerald-500/40 text-emerald-300 font-mono select-all" : ""
              }`}
            />
            {user?.isUpiLocked && user?.linkedUpiId ? (
              <p className="text-[11px] text-emerald-400/90 mt-1.5 flex items-center gap-1">
                <span>✓</span> Suraksha Niyam: Aapka payout verified deposit UPI ({user.linkedUpiId}) me hi transfer hoga.
              </p>
            ) : (
              <p className="text-[11px] text-gray-400 mt-1.5">
                First withdrawal / deposit par yeh UPI ID aapke account se lock ho jayegi.
              </p>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 text-xs text-gray-400 space-y-1">
            <p>• Minimum withdrawal: ₹10</p>
            <p>• Admin verification ke baad seedhe aapke UPI account me transfer hota hai.</p>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-white/10 hover:bg-white/15 text-white font-black py-3.5 disabled:opacity-50 transition"
          >
            {busy ? "Processing..." : "Submit Withdrawal Request"}
          </button>
        </form>
      </div>

      {/* Real-time Transactions Table */}
      <section className="rounded-3xl border border-white/10 bg-[#111827] overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="font-black text-xl">Transaction History</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Aapke sabhi deposits aur withdrawals ka record
            </p>
          </div>
          <span className="text-xs font-bold bg-white/10 px-3 py-1 rounded-full text-gray-300">
            {transactions.length} Total
          </span>
        </div>

        {transactions.length === 0 ? (
          <p className="p-8 text-center text-gray-500">No transactions recorded yet.</p>
        ) : (
          <div className="divide-y divide-white/5">
            {transactions.slice(0, 25).map((tx) => {
              const isCredit = [
                "deposit",
                "welcome_bonus",
                "daily_bonus",
                "referral_bonus",
                "bonus",
                "game_win",
              ].includes(tx.type);

              let badgeStyle = "bg-green-500/20 text-green-400";
              let label = tx.type;

              if (tx.type === "welcome_bonus") {
                badgeStyle = "bg-yellow-400/20 text-yellow-300";
                label = "🎁 100% WELCOME BONUS";
              } else if (tx.type === "daily_bonus") {
                badgeStyle = "bg-purple-500/20 text-purple-300";
                label = "🎡 DAILY SPIN BONUS";
              } else if (tx.type === "referral_bonus") {
                badgeStyle = "bg-sky-500/20 text-sky-300";
                label = "👥 REFERRAL BONUS";
              } else if (tx.type === "withdraw") {
                badgeStyle = "bg-orange-500/20 text-orange-400";
                label = "WITHDRAW";
              }

              return (
                <div
                  key={String(tx._id)}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.02] transition"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${badgeStyle}`}>
                        {label}
                      </span>
                      {tx.utr && (
                        <span className="text-xs text-gray-400 font-mono bg-white/5 px-2 py-0.5 rounded">
                          UTR: {tx.utr}
                        </span>
                      )}
                      {tx.note && (
                        <span className="text-xs text-gray-400">
                          {tx.note}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1.5">
                      {tx.createdAt
                        ? new Date(tx.createdAt).toLocaleString("en-IN")
                        : "-"}
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <p
                      className={`font-black text-lg ${
                        isCredit ? "text-green-400" : "text-orange-400"
                      }`}
                    >
                      {isCredit ? "+" : "-"}
                      {RUPEE}
                      {Number(tx.amount || 0).toFixed(2)}
                    </p>
                    <span
                      className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${
                        tx.status === "approved"
                          ? "bg-green-500/10 text-green-400 border border-green-500/20"
                          : tx.status === "pending"
                          ? "bg-yellow-400/10 text-yellow-400 border border-yellow-400/20"
                          : "bg-red-500/10 text-red-400 border border-red-500/20"
                      }`}
                    >
                      {tx.status?.toUpperCase()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Enlarge QR Code Modal */}
      {enlargeQrModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setEnlargeQrModal(false)}
        >
          <div
            className="bg-[#111827] border border-yellow-400/40 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center space-y-4 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setEnlargeQrModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white text-lg font-black h-8 w-8 rounded-full bg-white/10 flex items-center justify-center cursor-pointer"
            >
              ✕
            </button>

            <div className="text-center">
              <span className="text-[10px] uppercase font-bold text-yellow-400 tracking-wider">
                Official Merchant Payment
              </span>
              <h3 className="text-xl font-black text-white mt-0.5">
                {adminSettings.merchantName || "CoinFlip Official"}
              </h3>
            </div>

            {/* High-Res QR Code */}
            <div className="p-4 bg-white rounded-2xl shadow-xl mx-auto w-64 h-64 flex items-center justify-center border-4 border-yellow-400">
              <img
                src={
                  adminSettings.qrCode ||
                  `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
                    `upi://pay?pa=${adminSettings.upiId || "coinflip.pay@upi"}&pn=${encodeURIComponent(
                      adminSettings.merchantName || "CoinFlip Official"
                    )}&am=${amount || "100"}&cu=INR&tn=CoinFlip%20Deposit`
                  )}`
                }
                alt="Enlarged UPI QR Code"
                className="w-full h-full object-contain"
              />
            </div>

            <div className="space-y-1">
              <p className="font-mono text-sm font-black text-yellow-300">
                {adminSettings.upiId || "coinflip.pay@upi"}
              </p>
              <p className="text-xs text-gray-400">
                Deposit Amount: <span className="font-black text-emerald-400">{RUPEE}{amount || "100"}</span>
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  copyToClipboard(adminSettings.upiId || "coinflip.pay@upi");
                }}
                className="flex-1 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black font-black text-xs transition cursor-pointer"
              >
                {copiedUpi ? "Copied! ✓" : "Copy UPI ID"}
              </button>
              <button
                type="button"
                onClick={() => setEnlargeQrModal(false)}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileView({ user }) {
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [passMsg, setPassMsg] = useState("");
  const [passErr, setPassErr] = useState("");
  const [passBusy, setPassBusy] = useState(false);

  async function handlePassChange(e) {
    e.preventDefault();
    setPassMsg("");
    setPassErr("");

    if (!newPass || newPass.length < 6) {
      setPassErr("New password must be at least 6 characters.");
      return;
    }
    if (newPass !== confirmPass) {
      setPassErr("Passwords do not match.");
      return;
    }

    setPassBusy(true);
    try {
      const res = await authFetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify_reset",
          identifier: user.email || user.phone,
          otp: "DIRECT_LOGGED_IN", // handled by checking user or standard flow
          newPassword: newPass,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPassMsg("Password successfully updated!");
        setCurrentPass("");
        setNewPass("");
        setConfirmPass("");
      } else {
        // Fallback to sending OTP flow if direct is restricted
        setPassErr(data.message || "Failed to update password.");
      }
    } catch (e) {
      setPassErr("Error updating password.");
    } finally {
      setPassBusy(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <p className="text-yellow-400 text-sm font-black uppercase tracking-[0.2em]">
          Account
        </p>
        <h1 className="text-4xl font-black mt-2 mb-2">Profile & Security</h1>
        <p className="text-gray-400 text-sm">
          Manage your personal details, linked payment accounts, and security.
        </p>
      </div>

      <div className="rounded-3xl border border-white/10 bg-[#111827] p-7">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-yellow-400 text-black flex items-center justify-center text-xl font-black shadow-lg shadow-yellow-400/20">
            {(user.name || "U").slice(0, 1).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-black text-white">{user.name || "Player"}</h2>
            <p className="text-xs text-gray-400">{user.email}</p>
          </div>
        </div>

        <div className="mt-7 space-y-4">
          <ProfileRow label="Full Name" value={user.name || "-"} />
          <ProfileRow label="Email Address" value={user.email || "-"} />
          <ProfileRow label="Mobile Number" value={user.phone || "Not linked"} />
          <ProfileRow
            label="Wallet Balance"
            value={`${RUPEE}${Number(user.walletBalance || 0).toFixed(2)}`}
          />
          <ProfileRow label="Referral Code" value={user.referralCode || "N/A"} />
          <ProfileRow
            label="Linked Withdrawal UPI"
            value={
              user.linkedUpiId ? (
                <span className="font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 text-xs font-bold">
                  🔒 {user.linkedUpiId} (Verified)
                </span>
              ) : (
                <span className="text-gray-500 text-xs">Locks upon first deposit/payout</span>
              )
            }
          />
          <ProfileRow
            label="Account Role"
            value={
              <span className={`text-xs uppercase font-black px-2.5 py-0.5 rounded-full ${
                user.role === "admin" ? "bg-yellow-400/20 text-yellow-300 border border-yellow-400/30" : "bg-white/10 text-gray-300"
              }`}>
                {user.role || "user"}
              </span>
            }
          />
        </div>
      </div>
    </div>
  );
}

function ProfileRow({ label, value }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-4 last:border-0 last:pb-0">
      <span className="text-gray-500">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}



