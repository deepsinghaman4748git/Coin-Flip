"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [step, setStep] = useState(1); // 1: Email + Password, 2: 2FA 6-Digit PIN
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const payload = {
        email: email.trim().toLowerCase(),
        password,
      };

      if (step === 2) {
        payload.pin = pin.trim();
      }

      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.requireTwoFactor) {
        setStep(2);
        setLoading(false);
        if (data.message && step === 2) {
          setError(data.message);
        }
        return;
      }

      if (!response.ok || !data.success) {
        setError(data.message || "Invalid credentials provided.");
        return;
      }

      if (data.user?.role !== "admin") {
        setError("Access Denied: This account does not possess administrator privileges.");
        return;
      }

      if (data.token) {
        localStorage.setItem("coinflip_token", data.token);
        localStorage.setItem("coinflip_user", JSON.stringify(data.user));
      }

      router.push("/admin/dashboard");
      router.refresh();
    } catch (err) {
      console.error("Admin Login Error:", err);
      setError("Unable to connect to authentication server. Please retry.");
    } finally {
      setLoading(false);
    }
  }

  function handleBackToStep1() {
    setStep(1);
    setPin("");
    setError("");
  }

  return (
    <div className="min-h-screen bg-[#070B14] flex flex-col justify-center items-center px-4 py-8 relative selection:bg-yellow-500 selection:text-black">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(234,179,8,0.12),transparent_40%),radial-gradient(circle_at_bottom,rgba(147,51,234,0.08),transparent_40%)] pointer-events-none" />

      <div className="relative w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
        {/* Security Badge */}
        <div className="flex items-center justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-950 border border-slate-800 text-xs font-bold text-slate-300 shadow-inner">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="tracking-wider uppercase text-[10px] text-yellow-400 font-extrabold">Restricted Area</span>
            <span className="text-slate-600">|</span>
            <span className="text-[10px] text-slate-400">{step === 2 ? "2FA Verification" : "Admin Gatekeeper"}</span>
          </div>
        </div>

        {/* Logo / Header */}
        <div className="text-center mb-7">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-yellow-500 to-amber-300 flex items-center justify-center text-black font-black text-2xl shadow-xl shadow-yellow-500/20">
            {step === 2 ? "🛡️" : "🪙"}
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            {step === 2 ? "Two-Factor Verification" : "CoinFlip Control Center"}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {step === 2
              ? "Enter your secret 6-digit Admin Security PIN"
              : "Authorized administrator credentials required for entry."}
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold flex items-start gap-2.5">
            <span className="text-base shrink-0">⚠️</span>
            <div className="mt-0.5">{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {step === 1 ? (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Admin Email / Account
                </label>
                <input
                  type="email"
                  placeholder="admin@coinflip.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 text-xs font-medium outline-none transition focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Secret Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 text-xs font-medium outline-none transition focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500/20"
                />
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                <div>
                  <span className="text-slate-500 block text-[10px]">Verifying account:</span>
                  <span className="font-bold text-white">{email}</span>
                </div>
                <button
                  type="button"
                  onClick={handleBackToStep1}
                  className="text-xs text-yellow-400 hover:underline font-bold"
                >
                  Change
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 text-center">
                  6-Digit Admin Security PIN Code
                </label>
                <input
                  type="password"
                  maxLength={6}
                  pattern="[0-9]*"
                  inputMode="numeric"
                  placeholder="• • • • • •"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  required
                  autoFocus
                  className="w-full px-4 py-3.5 rounded-xl bg-slate-950 border border-slate-800 text-yellow-400 text-center tracking-[0.5em] text-xl font-mono font-black outline-none transition focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500/20"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (step === 2 && pin.length !== 6)}
            className="w-full mt-2 py-3.5 px-4 rounded-xl bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-wider transition shadow-lg shadow-yellow-500/20 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="animate-spin text-sm">↻</span>
                <span>Authenticating...</span>
              </>
            ) : step === 1 ? (
              <>
                <span>🔐</span>
                <span>Authenticate &amp; Enter Portal</span>
              </>
            ) : (
              <>
                <span>🛡️</span>
                <span>Verify 2FA PIN &amp; Unlock</span>
              </>
            )}
          </button>

          {step === 2 && (
            <button
              type="button"
              onClick={handleBackToStep1}
              className="w-full py-2 text-xs text-slate-400 hover:text-white transition text-center font-semibold"
            >
              ← Back to credentials
            </button>
          )}
        </form>

        <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
          <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
            <span>🛡️</span>
            <span>All login attempts are logged &amp; IP-monitored.</span>
          </p>
        </div>
      </div>
    </div>
  );
}
