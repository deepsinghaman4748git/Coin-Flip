"use client";

import { useEffect, useState, useRef } from "react";
import { authFetch, safeJson } from "../../lib/clientAuth";

const defaultSettings = {
  CoinFlipEnabled: true,
  maintenanceMode: false,
  maintenanceMessage: "CoinFlip is temporarily undergoing routine maintenance. Please check back shortly.",
  minBet: 10,
  maxBet: 10000,
  payoutMultiplier: 2,

  // Tie / Edge Match Controls
  tieEnabled: true,
  tieProbabilityPercent: 8,
  tieMultiplier: 10,

  // Speed Round / Decision Countdown Timer
  speedRoundEnabled: true,
  speedRoundSeconds: 10,

  // Weather & Wind Factor Spin Physics
  windPhysicsEnabled: true,

  // Game Difficulty Preset ("normal", "hard", "extreme")
  gameDifficulty: "hard",

  // Deposit Settings
  minDeposit: 10,
  maxDeposit: 50000,
  depositEnabled: true,
  upiId: "",
  backupUpiId: "",
  merchantName: "CoinFlip Official",
  qrCode: "",
  qrCodeType: "both",
  barcodeNumber: "",
  showQrBarcode: true,
  depositInstructions: "1. Scan the official QR code / Barcode or copy UPI ID.\n2. Complete payment in GPay / PhonePe / Paytm / BHIM.\n3. Copy the 12-digit UTR transaction reference and submit below.",

  // Withdrawal Settings
  minWithdrawal: 100,
  maxWithdrawal: 50000,
  withdrawalEnabled: true,
  manualWithdrawalApproval: true,
  withdrawalMessage: "Withdrawal requests are processed manually within 15-30 minutes.",
  maxDailyWithdrawalsPerUser: 5,
  dailyWithdrawalAmountCap: 100000,

  // Rewards & Growth
  dailyBonusMin: 10,
  dailyBonusMax: 50,
  welcomeBonusEnabled: true,
  welcomeBonusPercentage: 100,
  welcomeBonusMax: 5000,
  referralCommissionPercent: 5,
  referralBonusAmount: 25,

  // Security & Fraud Control
  preventDuplicateUTR: true,
  highBetAlertThreshold: 2000,
  maxBetPerDayPerUser: 50000,
  sessionTimeoutMinutes: 60,

  // Announcement & Support
  announcementEnabled: false,
  announcement: "",
  supportContact: "",
  supportLink: "",
};

function DarkToggle({ checked, onChange, label, description }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950/70 p-4 transition hover:border-slate-700">
      <div>
        <p className="font-bold text-sm text-white">{label}</p>
        {description && (
          <p className="mt-0.5 text-xs text-slate-400">{description}</p>
        )}
      </div>

      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition duration-200 focus:outline-none ${
          checked ? "bg-yellow-500 shadow-md shadow-yellow-500/20" : "bg-slate-800 border border-slate-700"
        }`}
        aria-label={label}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-slate-950 shadow transition-all duration-200 ${
            checked ? "left-6 bg-slate-950" : "left-1 bg-slate-400"
          }`}
        />
      </button>
    </div>
  );
}

function DarkField({ label, value, onChange, type = "text", placeholder = "", min, step, description, prefix }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <label className="block text-xs font-bold text-slate-300">
          {label}
        </label>
        {description && <span className="text-[10px] text-slate-500">{description}</span>}
      </div>

      <div className="relative">
        {prefix && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
            {prefix}
          </span>
        )}
        <input
          type={type}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          min={min}
          step={step}
          className={`w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs font-semibold text-white placeholder-slate-600 outline-none transition focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500/20 ${
            prefix ? "pl-8" : ""
          }`}
        />
      </div>
    </div>
  );
}

function DarkTextArea({ label, value, onChange, placeholder = "", rows = 3, description }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <label className="block text-xs font-bold text-slate-300">
          {label}
        </label>
        {description && <span className="text-[10px] text-slate-500">{description}</span>}
      </div>

      <textarea
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full resize-y rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-white placeholder-slate-600 outline-none transition focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500/20"
      />
    </div>
  );
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("game");
  const [toastMessage, setToastMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Admin Security & 2FA State
  const [securityProfile, setSecurityProfile] = useState(null);
  const [secLoading, setSecLoading] = useState(false);

  // Password Change Form
  const [pwdCurrent, setPwdCurrent] = useState("");
  const [pwdNew, setPwdNew] = useState("");
  const [pwdConfirm, setPwdConfirm] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdMsg, setPwdMsg] = useState("");
  const [pwdErr, setPwdErr] = useState("");

  // 2FA PIN Form
  const [pinCurrentPwd, setPinCurrentPwd] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [pinLoading, setPinLoading] = useState(false);
  const [pinMsg, setPinMsg] = useState("");
  const [pinErr, setPinErr] = useState("");

  // 2FA Disable Form
  const [disablePwd, setDisablePwd] = useState("");
  const [disableLoading, setDisableLoading] = useState(false);
  const [disableErr, setDisableErr] = useState("");

  function showToast(msg) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4000);
  }

  async function loadSettings() {
    try {
      setLoading(true);
      setErrorMessage("");

      const response = await authFetch("/api/admin/settings", { cache: "no-store" });
      const data = await safeJson(response);

      if (data?.success && data?.settings) {
        setSettings({
          ...defaultSettings,
          ...data.settings,
        });
      } else {
        setErrorMessage(data?.message || "Failed to load current settings");
      }
    } catch (err) {
      console.error("Settings error:", err);
      setErrorMessage("Could not connect to settings API");
    } finally {
      setLoading(false);
    }
  }

  async function loadSecurityProfile() {
    try {
      setSecLoading(true);
      const res = await authFetch("/api/admin/security", { cache: "no-store" });
      const data = await safeJson(res);
      if (data?.success && data?.security) {
        setSecurityProfile(data.security);
      }
    } catch (err) {
      console.error("Error loading security profile:", err);
    } finally {
      setSecLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
    loadSecurityProfile();
  }, []);

  function updateField(key, value) {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function handleSave() {
    try {
      setSaving(true);
      setErrorMessage("");

      const payload = {
        ...settings,
        minBet: Number(settings.minBet),
        maxBet: Number(settings.maxBet),
        payoutMultiplier: Number(settings.payoutMultiplier),
        minDeposit: Number(settings.minDeposit),
        maxDeposit: Number(settings.maxDeposit),
        minWithdrawal: Number(settings.minWithdrawal),
        maxWithdrawal: Number(settings.maxWithdrawal),
        dailyBonusMin: Number(settings.dailyBonusMin),
        dailyBonusMax: Number(settings.dailyBonusMax),
        welcomeBonusPercentage: Number(settings.welcomeBonusPercentage),
        welcomeBonusMax: Number(settings.welcomeBonusMax),
        referralCommissionPercent: Number(settings.referralCommissionPercent),
        referralBonusAmount: Number(settings.referralBonusAmount),
        highBetAlertThreshold: Number(settings.highBetAlertThreshold),
        maxDailyWithdrawalsPerUser: Number(settings.maxDailyWithdrawalsPerUser),
        dailyWithdrawalAmountCap: Number(settings.dailyWithdrawalAmountCap),
      };

      const response = await authFetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await safeJson(response);

      if (data?.success) {
        showToast("💾 All platform settings saved & live in real-time!");
      } else {
        setErrorMessage(data?.message || "Failed to save settings");
      }
    } catch (err) {
      console.error("Save settings error:", err);
      setErrorMessage("Error saving settings to database");
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPwdErr("");
    setPwdMsg("");

    if (pwdNew !== pwdConfirm) {
      setPwdErr("New password confirmation does not match.");
      return;
    }

    if (pwdNew.length < 8) {
      setPwdErr("New password must be at least 8 characters long.");
      return;
    }

    try {
      setPwdLoading(true);
      const res = await authFetch("/api/admin/security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "change_password",
          currentPassword: pwdCurrent,
          newPassword: pwdNew,
          confirmPassword: pwdConfirm,
        }),
      });

      const data = await safeJson(res);
      if (!res.ok || !data?.success) {
        setPwdErr(data?.message || "Failed to update admin password");
        return;
      }

      setPwdMsg("✅ Admin password updated successfully! Please remember your new password.");
      setPwdCurrent("");
      setPwdNew("");
      setPwdConfirm("");
      loadSecurityProfile();
      showToast("🔐 Admin password changed successfully!");
    } catch (err) {
      setPwdErr("Network error while updating password");
    } finally {
      setPwdLoading(false);
    }
  }

  async function handleSetupPin(e) {
    e.preventDefault();
    setPinErr("");
    setPinMsg("");

    if (!/^\d{6}$/.test(pinCode)) {
      setPinErr("PIN must be exactly 6 numeric digits (e.g. 749201).");
      return;
    }

    if (pinCode !== pinConfirm) {
      setPinErr("6-Digit PIN confirmation does not match.");
      return;
    }

    try {
      setPinLoading(true);
      const res = await authFetch("/api/admin/security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "setup_2fa_pin",
          currentPassword: pinCurrentPwd,
          pin: pinCode,
          confirmPin: pinConfirm,
        }),
      });

      const data = await safeJson(res);
      if (!res.ok || !data?.success) {
        setPinErr(data?.message || "Failed to set 2FA PIN");
        return;
      }

      setPinMsg("🛡️ Two-Factor 6-Digit PIN activated! From now on, Admin login requires both Password + PIN.");
      setPinCurrentPwd("");
      setPinCode("");
      setPinConfirm("");
      loadSecurityProfile();
      showToast("🛡️ Two-Factor 2FA PIN Activated!");
    } catch (err) {
      setPinErr("Network error while setting 2FA PIN");
    } finally {
      setPinLoading(false);
    }
  }

  async function handleDisablePin(e) {
    e.preventDefault();
    setDisableErr("");

    try {
      setDisableLoading(true);
      const res = await authFetch("/api/admin/security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "disable_2fa",
          currentPassword: disablePwd,
        }),
      });

      const data = await safeJson(res);
      if (!res.ok || !data?.success) {
        setDisableErr(data?.message || "Failed to disable 2FA");
        return;
      }

      setDisablePwd("");
      loadSecurityProfile();
      showToast("Two-Factor Authentication Disabled");
    } catch (err) {
      setDisableErr("Network error while disabling 2FA");
    } finally {
      setDisableLoading(false);
    }
  }

  const tabs = [
    { id: "game", name: "Game & Odds", icon: "🎲" },
    { id: "payments", name: "UPI & Deposits", icon: "💳" },
    { id: "withdrawals", name: "Withdrawals", icon: "🏦" },
    { id: "rewards", name: "Bonuses & Referrals", icon: "🎁" },
    { id: "security", name: "Security & Fraud", icon: "🛡️" },
    { id: "adminAuth", name: "Admin Password & 2FA", icon: "🔐" },
    { id: "announcements", name: "Broadcast & Support", icon: "📢" },
  ];

  const tabsContainerRef = useRef(null);
  const activeTabIndex = tabs.findIndex((t) => t.id === activeTab);

  function scrollTabs(direction) {
    if (!tabsContainerRef.current) return;
    const distance = direction === "left" ? -240 : 240;
    tabsContainerRef.current.scrollBy({ left: distance, behavior: "smooth" });
  }

  function goToTab(index) {
    if (index >= 0 && index < tabs.length) {
      const nextTab = tabs[index];
      setActiveTab(nextTab.id);
      // Auto-scroll button into view
      if (tabsContainerRef.current) {
        const btn = tabsContainerRef.current.children[index];
        if (btn) {
          btn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
        }
      }
    }
  }

  return (
    <div className="p-3 sm:p-6 lg:p-8 space-y-5 max-w-7xl mx-auto w-full pb-28 md:pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 px-4 py-3 rounded-xl bg-slate-900 text-white border border-yellow-500/50 shadow-2xl shadow-yellow-500/20 text-xs sm:text-sm font-bold flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5 max-w-[90vw]">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/80 p-4 sm:p-6 rounded-2xl border border-slate-800 shadow-lg">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-black uppercase tracking-wider bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
              Platform Configuration
            </span>
            <span className="text-[11px] sm:text-xs text-slate-400">Instant Global Sync</span>
          </div>
          <h1 className="text-xl sm:text-3xl font-black text-white tracking-tight">
            System &amp; Security Settings
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Tune payout multipliers, deposit UPI gateways, fraud security checks, admin password &amp; 2FA PIN protection.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <button
            onClick={loadSettings}
            disabled={loading}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition disabled:opacity-50 min-h-[44px]"
          >
            <span className={loading ? "animate-spin" : ""}>↻</span>
            <span>Reset / Reload</span>
          </button>

          {activeTab !== "adminAuth" && (
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black text-xs transition shadow-lg shadow-yellow-500/20 disabled:opacity-50 min-h-[44px]"
            >
              <span>💾</span>
              <span>{saving ? "Saving..." : "Save All Settings"}</span>
            </button>
          )}
        </div>
      </div>

      {/* ERROR ALERT */}
      {errorMessage && (
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-xs sm:text-sm font-semibold flex items-center justify-between">
          <span>⚠️ {errorMessage}</span>
          <button onClick={() => setErrorMessage("")} className="text-xs underline">Dismiss</button>
        </div>
      )}

      {/* MOBILE QUICK DROPDOWN SELECTOR (Shown on mobile for 1-tap switching) */}
      <div className="sm:hidden bg-slate-900/90 p-3 rounded-2xl border border-slate-800 space-y-2 shadow-md">
        <div className="flex items-center justify-between text-xs font-bold text-slate-300">
          <span className="flex items-center gap-1.5 text-yellow-400">
            <span>⚙️</span> Choose Settings Category:
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            {activeTabIndex + 1} of {tabs.length}
          </span>
        </div>
        <select
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value)}
          className="w-full bg-slate-950 text-white font-bold text-xs p-3 rounded-xl border border-yellow-500/40 outline-none focus:ring-2 focus:ring-yellow-400"
        >
          {tabs.map((tab, idx) => (
            <option key={tab.id} value={tab.id}>
              {tab.icon} {idx + 1}. {tab.name}
            </option>
          ))}
        </select>
      </div>

      {/* HORIZONTAL SWIPE TAB SELECTOR WITH LEFT / RIGHT CONTROLS */}
      <div className="relative bg-slate-900/60 p-1.5 sm:p-2 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Left Arrow Button */}
          <button
            type="button"
            onClick={() => scrollTabs("left")}
            className="hidden sm:flex shrink-0 p-2 sm:p-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold items-center justify-center transition active:scale-95 cursor-pointer"
            title="Scroll Left"
            aria-label="Scroll Tabs Left"
          >
            ‹
          </button>

          {/* Swipeable Tabs Container */}
          <div
            ref={tabsContainerRef}
            className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-1 scrollbar-none scroll-smooth w-full touch-pan-x"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl font-bold text-xs transition shrink-0 cursor-pointer min-h-[42px] ${
                  activeTab === tab.id
                    ? "bg-yellow-500 text-slate-950 shadow-md shadow-yellow-500/20 scale-[1.02]"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/80 bg-slate-950/40 border border-slate-800/60"
                }`}
              >
                <span>{tab.icon}</span>
                <span className="whitespace-nowrap">{tab.name}</span>
              </button>
            ))}
          </div>

          {/* Right Arrow Button */}
          <button
            type="button"
            onClick={() => scrollTabs("right")}
            className="hidden sm:flex shrink-0 p-2 sm:p-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold items-center justify-center transition active:scale-95 cursor-pointer"
            title="Scroll Right"
            aria-label="Scroll Tabs Right"
          >
            ›
          </button>
        </div>

        {/* Mobile Swipe Left / Right Hint Pills */}
        <div className="flex sm:hidden items-center justify-between pt-1.5 px-1 text-[10px] text-slate-500 font-medium">
          <button
            type="button"
            onClick={() => scrollTabs("left")}
            className="flex items-center gap-1 text-slate-400 active:text-yellow-400 py-0.5 px-1.5 rounded bg-slate-800/50"
          >
            <span>‹ Swipe Left</span>
          </button>
          <span className="font-mono text-yellow-500/70">
            {activeTabIndex + 1} / {tabs.length}
          </span>
          <button
            type="button"
            onClick={() => scrollTabs("right")}
            className="flex items-center gap-1 text-slate-400 active:text-yellow-400 py-0.5 px-1.5 rounded bg-slate-800/50"
          >
            <span>Swipe Right ›</span>
          </button>
        </div>
      </div>

      {/* TAB CONTENT */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-6">
        {/* 1. GAME & ODDS */}
        {activeTab === "game" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>🎲</span> Game Multipliers &amp; Limits
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Control betting boundaries, return multipliers, and maintenance mode.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DarkToggle
                label="CoinFlip Game Enabled"
                description="Allow players to wager and play coin flips"
                checked={settings.CoinFlipEnabled}
                onChange={(val) => updateField("CoinFlipEnabled", val)}
              />

              <DarkToggle
                label="Maintenance Mode"
                description="Temporarily lock the game for all players"
                checked={settings.maintenanceMode}
                onChange={(val) => updateField("maintenanceMode", val)}
              />
            </div>

            {settings.maintenanceMode && (
              <DarkTextArea
                label="Maintenance Notice"
                value={settings.maintenanceMessage}
                onChange={(val) => updateField("maintenanceMessage", val)}
                placeholder="Message shown when players attempt to play..."
              />
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <DarkField
                label="Minimum Bet (₹)"
                type="number"
                prefix="₹"
                min="1"
                value={settings.minBet}
                onChange={(val) => updateField("minBet", val)}
                description="Smallest allowed wager"
              />

              <DarkField
                label="Maximum Bet (₹)"
                type="number"
                prefix="₹"
                min="10"
                value={settings.maxBet}
                onChange={(val) => updateField("maxBet", val)}
                description="Single round wager cap"
              />

              <DarkField
                label="Win Payout Multiplier (Head/Tail)"
                type="number"
                step="0.05"
                min="1"
                value={settings.payoutMultiplier}
                onChange={(val) => updateField("payoutMultiplier", val)}
                description="e.g. 2.0 = 2x win amount"
              />
            </div>

            {/* DIFFICULTY PRESET CONTROLS */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
              <div>
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <span>🎯</span> Game Difficulty & House Edge Algorithm
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Game ko hard aur thrilling banane ke liye difficulty level choose karein.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    id: "normal",
                    label: "Normal (Standard)",
                    desc: "Fair 50/50 balance with normal Tie rate",
                    badge: "Balanced",
                    color: "border-blue-500/40 bg-blue-500/10 text-blue-300",
                  },
                  {
                    id: "hard",
                    label: "Hard (Challenging)",
                    desc: "Active House Edge + Tie pressure (Recommended)",
                    badge: "Popular 🔥",
                    color: "border-amber-500/50 bg-amber-500/10 text-amber-300",
                  },
                  {
                    id: "extreme",
                    label: "Extreme (High Volatility)",
                    desc: "Maximum difficulty, fierce wind & anti-streak clamp",
                    badge: "Hardcore ⚡",
                    color: "border-red-500/50 bg-red-500/10 text-red-300",
                  },
                ].map((diff) => {
                  const isSelected = settings.gameDifficulty === diff.id;
                  return (
                    <button
                      key={diff.id}
                      type="button"
                      onClick={() => updateField("gameDifficulty", diff.id)}
                      className={`p-3.5 rounded-xl border text-left transition-all relative ${
                        isSelected
                          ? `${diff.color} ring-1 ring-yellow-400/50 shadow-lg`
                          : "bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-white">{diff.label}</span>
                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-black/40 border border-white/10">
                          {diff.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                        {diff.desc}
                      </p>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <DarkField
                  label="House Edge Percent (%)"
                  type="number"
                  min="0"
                  max="25"
                  value={settings.houseEdgePercent}
                  onChange={(val) => updateField("houseEdgePercent", val)}
                  description="Base casino advantage percentage"
                />

                <DarkField
                  label="Max Win Per Round Cap (₹)"
                  type="number"
                  prefix="₹"
                  value={settings.maxWinPerRound}
                  onChange={(val) => updateField("maxWinPerRound", val)}
                  description="Maximum allowed single round profit"
                />
              </div>
            </div>

            {/* SPEED ROUND / COUNTDOWN TIMER PRESSURE */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-red-500/10 via-amber-500/10 to-transparent border border-red-500/20 space-y-4">
              <div>
                <h3 className="font-bold text-red-400 text-sm flex items-center gap-2">
                  <span>⏱️</span> Speed Round / Decision Countdown Timer
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Players ke upar time pressure banayein. Timer khatam hone par decision lena jaruri hoga!
                </p>
              </div>

              <DarkToggle
                label="Speed Round Countdown Active"
                description="Shows an urgent countdown bar & clock on game table"
                checked={settings.speedRoundEnabled}
                onChange={(val) => updateField("speedRoundEnabled", val)}
              />

              {settings.speedRoundEnabled && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <DarkField
                    label="Decision Time (Seconds)"
                    type="number"
                    min="3"
                    max="60"
                    value={settings.speedRoundSeconds}
                    onChange={(val) => updateField("speedRoundSeconds", val)}
                    description="Recommended: 10s (Fast & Intense) or 5s (Hardcore)"
                  />
                  <div className="flex flex-col justify-center">
                    <span className="text-xs font-bold text-slate-300 mb-1.5">Quick Presets</span>
                    <div className="flex items-center gap-2">
                      {[5, 10, 15, 20].map((sec) => (
                        <button
                          key={sec}
                          type="button"
                          onClick={() => updateField("speedRoundSeconds", sec)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                            Number(settings.speedRoundSeconds) === sec
                              ? "bg-yellow-500 text-black border-yellow-400"
                              : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                          }`}
                        >
                          {sec}s
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* WEATHER & WIND FACTOR SPIN PHYSICS */}
            <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 space-y-4">
              <div>
                <h3 className="font-bold text-cyan-300 text-sm flex items-center gap-2">
                  <span>🌪️</span> Weather &amp; Wind Factor (Dynamic Spin Physics)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Coin flip ke dauran dynamic wind gusts (crosswinds, storm vortices, rotation wobble) activate karein jisse har flip unpredictable aur realistic lage!
                </p>
              </div>

              <DarkToggle
                label="Dynamic Wind & Weather Physics Enabled"
                description="Simulates wind resistance, coin tilt angles, wobble, and turbulent air spin duration"
                checked={settings.windPhysicsEnabled}
                onChange={(val) => updateField("windPhysicsEnabled", val)}
              />
            </div>

            {/* TIE / EDGE MATCH SECTION */}
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-4">
              <div>
                <h3 className="font-bold text-amber-300 text-sm flex items-center gap-2">
                  <span>⚖️</span> TIE / Edge Match Mode (Game Hard & High Multiplier)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Jab coin edge par rukta hai ya TIE hota hai, Head/Tail dono har jate hain (making game harder) aur jo player TIE par bet lagata hai use massive multiplier milta hai!
                </p>
              </div>

              <DarkToggle
                label="TIE / Edge Outcome Enabled"
                description="Allows random TIE outcomes during coinflip rounds"
                checked={settings.tieEnabled}
                onChange={(val) => updateField("tieEnabled", val)}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DarkField
                  label="TIE Probability Rate (%)"
                  type="number"
                  min="1"
                  max="25"
                  value={settings.tieProbabilityPercent}
                  onChange={(val) => updateField("tieProbabilityPercent", val)}
                  description="e.g. 8% chance of coin landing on TIE"
                />

                <DarkField
                  label="TIE Prediction Multiplier (X)"
                  type="number"
                  min="2"
                  max="50"
                  value={settings.tieMultiplier}
                  onChange={(val) => updateField("tieMultiplier", val)}
                  description="e.g. 10x payout when user bets on TIE!"
                />
              </div>
            </div>
          </div>
        )}

        {/* 2. PAYMENTS & DEPOSITS */}
        {activeTab === "payments" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-yellow-500/20 text-yellow-400 text-sm">💳</span>
                  <span>UPI Payment Gateway, QR Code &amp; Barcode Management</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Set receiving UPI ID, upload custom UPI Barcode/QR Code, configure auto-generated dynamic QR and merchant parameters.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                  settings.depositEnabled
                    ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                    : "bg-red-500/15 border-red-500/30 text-red-400"
                }`}>
                  {settings.depositEnabled ? "● Deposits Live" : "○ Deposits Paused"}
                </span>
              </div>
            </div>

            <DarkToggle
              label="Inward UPI Deposits Enabled"
              description="Enable or disable player wallet deposit submissions across the platform"
              checked={settings.depositEnabled}
              onChange={(val) => updateField("depositEnabled", val)}
            />

            {/* UPI & MERCHANT DETAILS */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <span>🏦</span> UPI Merchant Details
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DarkField
                  label="Primary Receiving UPI ID (Main VPA)"
                  value={settings.upiId}
                  onChange={(val) => updateField("upiId", val)}
                  placeholder="e.g. merchant@paytm / business@okaxis"
                  description="Players will send deposits to this UPI address"
                />

                <DarkField
                  label="Merchant / Business Display Name"
                  value={settings.merchantName}
                  onChange={(val) => updateField("merchantName", val)}
                  placeholder="e.g. CoinFlip Official"
                  description="Displayed on payment app screen"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DarkField
                  label="Backup UPI ID (Optional)"
                  value={settings.backupUpiId}
                  onChange={(val) => updateField("backupUpiId", val)}
                  placeholder="e.g. backup@ybl"
                  description="Secondary fallback UPI if primary has limits"
                />

                <DarkField
                  label="Merchant Terminal / Barcode Reference ID (Optional)"
                  value={settings.barcodeNumber}
                  onChange={(val) => updateField("barcodeNumber", val)}
                  placeholder="e.g. BARCODE-9823489102"
                  description="Displayed under barcode on player deposit screen"
                />
              </div>
            </div>

            {/* QR CODE & BARCODE DISPLAY MODE CONFIG */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-yellow-500/10 via-slate-900 to-slate-900 border border-yellow-500/20 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-bold text-yellow-400 text-sm flex items-center gap-2">
                    <span>📷</span> UPI Barcode &amp; QR Code Options
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Choose whether to display an Auto-Generated Dynamic UPI QR, a Custom Uploaded Barcode/QR Image, or both.
                  </p>
                </div>
                <DarkToggle
                  label="Show QR & Barcode Box"
                  checked={settings.showQrBarcode !== false}
                  onChange={(val) => updateField("showQrBarcode", val)}
                />
              </div>

              {/* Mode Selector Tabs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    id: "auto_upi",
                    title: "⚡ Dynamic Auto QR",
                    desc: "Auto-generates QR code from UPI ID & Merchant Name in real-time.",
                    badge: "Dynamic",
                  },
                  {
                    id: "custom_upload",
                    title: "🖼️ Custom Barcode / QR",
                    desc: "Display your official PhonePe, GPay, Paytm, or BharatPe QR/Barcode image.",
                    badge: "Custom Image",
                  },
                  {
                    id: "both",
                    title: "🌟 Dual QR + Barcode Mode",
                    desc: "Auto-generate dynamic UPI QR with custom merchant barcode styling.",
                    badge: "Recommended",
                  },
                ].map((mode) => {
                  const isSelected = (settings.qrCodeType || "both") === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => updateField("qrCodeType", mode.id)}
                      className={`p-3.5 rounded-xl border text-left transition-all relative cursor-pointer ${
                        isSelected
                          ? "border-yellow-400 bg-yellow-500/10 text-white ring-1 ring-yellow-400/40 shadow-lg"
                          : "border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700 hover:bg-slate-950"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-white">{mode.title}</span>
                        <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                          isSelected ? "bg-yellow-400 text-black" : "bg-slate-800 text-slate-400"
                        }`}>
                          {mode.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                        {mode.desc}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* CUSTOM QR / BARCODE IMAGE UPLOADER */}
              <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3">
                <label className="block text-xs font-bold text-slate-200">
                  Upload Custom UPI Barcode / QR Code Image (PhonePe, GPay, Paytm, BharatPe)
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  <div>
                    <label className="border-2 border-dashed border-slate-700 hover:border-yellow-500/60 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-900/50 hover:bg-slate-900 transition text-center">
                      <span className="text-2xl">📸</span>
                      <div>
                        <p className="text-xs font-bold text-white">Click or Drag to Upload Barcode / QR</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Supports PNG, JPG, JPEG, WebP (Max 5MB)</p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 5 * 1024 * 1024) {
                              alert("Image size must be under 5MB");
                              return;
                            }
                            const reader = new FileReader();
                            reader.onload = (evt) => {
                              updateField("qrCode", evt.target.result);
                              showToast("📸 Custom Barcode/QR image loaded! Click Save to apply.");
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div className="space-y-2">
                    <DarkField
                      label="Or Direct Image URL"
                      value={settings.qrCode && !settings.qrCode.startsWith("data:") ? settings.qrCode : ""}
                      onChange={(val) => updateField("qrCode", val)}
                      placeholder="https://your-domain.com/my-qr.png"
                      description="Paste public image link directly"
                    />
                    {settings.qrCode && (
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                          <span>✓</span> Image Attached
                        </span>
                        <button
                          type="button"
                          onClick={() => updateField("qrCode", "")}
                          className="px-2.5 py-1 text-xs rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 font-bold transition cursor-pointer"
                        >
                          Remove Image
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* LIVE INTERACTIVE PREVIEW CARD */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-yellow-400 flex items-center gap-1.5">
                    <span>👁️</span> Live Player Screen Preview (QR Code &amp; Barcode)
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">Real-time Simulation</span>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-6 p-4 rounded-xl bg-black/50 border border-slate-800/80">
                  {/* QR Code Frame */}
                  <div className="relative p-3 rounded-2xl bg-white text-black shadow-2xl flex flex-col items-center justify-center shrink-0">
                    <div className="text-[9px] font-black tracking-widest text-slate-800 uppercase mb-1">
                      {settings.merchantName || "COINFLIP PAY"}
                    </div>

                    <div className="relative w-40 h-40 bg-white flex items-center justify-center overflow-hidden rounded-lg border border-slate-200">
                      {settings.qrCode ? (
                        <img
                          src={settings.qrCode}
                          alt="UPI Barcode / QR Code"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                            `upi://pay?pa=${settings.upiId || "admin@upi"}&pn=${encodeURIComponent(
                              settings.merchantName || "CoinFlip Official"
                            )}&cu=INR`
                          )}`}
                          alt="Auto-Generated UPI QR Code"
                          className="w-full h-full object-contain"
                        />
                      )}
                      {/* Scanline decoration */}
                      <div className="absolute inset-x-0 h-0.5 bg-yellow-500/70 shadow-[0_0_8px_rgba(234,179,8,0.8)] animate-pulse top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    <div className="mt-1.5 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      <span className="text-[8px] font-black uppercase text-slate-700">
                        Scan with Any UPI App
                      </span>
                    </div>
                  </div>

                  {/* Merchant Barcode & Info Side */}
                  <div className="space-y-3 text-center sm:text-left flex-1 max-w-sm">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Receiving UPI ID</span>
                      <p className="font-mono text-sm font-black text-yellow-300 select-all">
                        {settings.upiId || "admin@upi (Enter above)"}
                      </p>
                    </div>

                    {/* Simulated Barcode Lines */}
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
                      <div className="flex justify-center items-end gap-1 h-8 px-2 overflow-hidden">
                        {[3, 1, 4, 2, 1, 3, 2, 4, 1, 2, 3, 1, 4, 2, 3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 3].map((w, i) => (
                          <span
                            key={i}
                            className="bg-white/80 h-full rounded-xs"
                            style={{
                              width: `${w * 1.5}px`,
                              height: `${70 + (i % 5) * 6}%`,
                            }}
                          />
                        ))}
                      </div>
                      <p className="font-mono text-[9px] text-slate-400 mt-1 tracking-widest uppercase">
                        {settings.barcodeNumber || settings.upiId || "COINFLIP-PAY-TERMINAL"}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      <a
                        href={`upi://pay?pa=${encodeURIComponent(settings.upiId || "admin@upi")}&pn=${encodeURIComponent(
                          settings.merchantName || "CoinFlip"
                        )}&cu=INR`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-black text-xs font-black transition"
                      >
                        ⚡ Test UPI Intent Link
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* LIMITS & INSTRUCTIONS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DarkField
                label="Minimum Deposit (₹)"
                type="number"
                prefix="₹"
                min="1"
                value={settings.minDeposit}
                onChange={(val) => updateField("minDeposit", val)}
              />

              <DarkField
                label="Maximum Deposit (₹)"
                type="number"
                prefix="₹"
                min="100"
                value={settings.maxDeposit}
                onChange={(val) => updateField("maxDeposit", val)}
              />
            </div>

            <DarkTextArea
              label="Deposit Instructions for Players"
              value={settings.depositInstructions}
              onChange={(val) => updateField("depositInstructions", val)}
              rows={4}
              description="Shown under deposit form"
            />
          </div>
        )}

        {/* 3. WITHDRAWALS */}
        {activeTab === "withdrawals" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>🏦</span> Withdrawal Rules &amp; Limits
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Control payout thresholds, daily withdrawal frequency, and security approvals.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DarkToggle
                label="Withdrawals Enabled"
                description="Allow players to request funds transfers"
                checked={settings.withdrawalEnabled}
                onChange={(val) => updateField("withdrawalEnabled", val)}
              />

              <DarkToggle
                label="Manual Admin Verification"
                description="Require admin approval before funds are dispatched"
                checked={settings.manualWithdrawalApproval}
                onChange={(val) => updateField("manualWithdrawalApproval", val)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DarkField
                label="Minimum Withdrawal (₹)"
                type="number"
                prefix="₹"
                min="10"
                value={settings.minWithdrawal}
                onChange={(val) => updateField("minWithdrawal", val)}
              />

              <DarkField
                label="Maximum Withdrawal per Request (₹)"
                type="number"
                prefix="₹"
                min="100"
                value={settings.maxWithdrawal}
                onChange={(val) => updateField("maxWithdrawal", val)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DarkField
                label="Max Withdrawals Per User Per Day"
                type="number"
                min="1"
                value={settings.maxDailyWithdrawalsPerUser}
                onChange={(val) => updateField("maxDailyWithdrawalsPerUser", val)}
                description="Limits daily payout request spam"
              />

              <DarkField
                label="Daily Withdrawal Cap Per User (₹)"
                type="number"
                prefix="₹"
                min="1000"
                value={settings.dailyWithdrawalAmountCap}
                onChange={(val) => updateField("dailyWithdrawalAmountCap", val)}
                description="Max total ₹ user can withdraw per 24h"
              />
            </div>

            <DarkTextArea
              label="Withdrawal Notice"
              value={settings.withdrawalMessage}
              onChange={(val) => updateField("withdrawalMessage", val)}
              rows={2}
            />
          </div>
        )}

        {/* 4. REWARDS & BONUSES */}
        {activeTab === "rewards" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>🎁</span> Player Bonuses &amp; Referral Growth
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Configure 100% First Deposit Match Bonus, Daily Lucky Spin, and Referral Commissions.</p>
            </div>

            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-4">
              <div>
                <h3 className="font-bold text-purple-300 text-sm">🎉 Welcome Bonus (First Deposit Match - Manual Approval)</h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  Ab har deposit approval ke dauran Admin khud choose kar sakta hai ki kis player ko kitna bonus dena hai.
                </p>
              </div>
              <DarkToggle
                label="Welcome Deposit Bonus Active"
                description="Show 100% First Deposit Bonus offer on user dashboard & deposit page"
                checked={settings.welcomeBonusEnabled}
                onChange={(val) => updateField("welcomeBonusEnabled", val)}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DarkField
                  label="Default Match Percentage (%)"
                  type="number"
                  min="10"
                  max="500"
                  value={settings.welcomeBonusPercentage}
                  onChange={(val) => updateField("welcomeBonusPercentage", val)}
                  description="Suggested default in approval popup (e.g. 100%)"
                />

                <DarkField
                  label="Maximum Bonus Cap (₹)"
                  type="number"
                  prefix="₹"
                  min="100"
                  value={settings.welcomeBonusMax}
                  onChange={(val) => updateField("welcomeBonusMax", val)}
                  description="Ceiling for the bonus amount"
                />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 space-y-4">
              <h3 className="font-bold text-yellow-300 text-sm">🎡 Daily Lucky Wheel Spin</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DarkField
                  label="Minimum Prize (₹)"
                  type="number"
                  prefix="₹"
                  min="1"
                  value={settings.dailyBonusMin}
                  onChange={(val) => updateField("dailyBonusMin", val)}
                />

                <DarkField
                  label="Maximum Prize (₹)"
                  type="number"
                  prefix="₹"
                  min="5"
                  value={settings.dailyBonusMax}
                  onChange={(val) => updateField("dailyBonusMax", val)}
                />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-4">
              <h3 className="font-bold text-emerald-300 text-sm">👥 5% Referral &amp; Affiliate Engine</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DarkField
                  label="Deposit Commission (%)"
                  type="number"
                  min="0"
                  max="50"
                  value={settings.referralCommissionPercent}
                  onChange={(val) => updateField("referralCommissionPercent", val)}
                  description="Lifetime commission on friend deposits"
                />

                <DarkField
                  label="Signup Instant Bonus (₹)"
                  type="number"
                  prefix="₹"
                  min="0"
                  value={settings.referralBonusAmount}
                  onChange={(val) => updateField("referralBonusAmount", val)}
                  description="Fixed reward for inviting a friend"
                />
              </div>
            </div>
          </div>
        )}

        {/* 5. SECURITY & FRAUD CONTROL */}
        {activeTab === "security" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>🛡️</span> Anti-Fraud &amp; Account Protection
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Automated detection algorithms to protect treasury funds from abuse.</p>
            </div>

            <DarkToggle
              label="Strict UTR Deduplication Check"
              description="Instantly reject or flag if a player submits a UTR number that has been claimed before"
              checked={settings.preventDuplicateUTR}
              onChange={(val) => updateField("preventDuplicateUTR", val)}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DarkField
                label="High-Bet Alert Threshold (₹)"
                type="number"
                prefix="₹"
                min="100"
                value={settings.highBetAlertThreshold}
                onChange={(val) => updateField("highBetAlertThreshold", val)}
                description="Highlights wagers equal or above this"
              />

              <DarkField
                label="Admin Session Timeout (Minutes)"
                type="number"
                min="15"
                max="1440"
                value={settings.sessionTimeoutMinutes}
                onChange={(val) => updateField("sessionTimeoutMinutes", val)}
                description="Auto-lock inactive admin session"
              />
            </div>
          </div>
        )}

        {/* 6. ADMIN AUTH & 2FA PROTECTION (PASSWORD + 2FA PIN) */}
        {activeTab === "adminAuth" && (
          <div className="space-y-8">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>🔐</span> Admin Security &amp; Two-Factor Authentication (2FA)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Change your secret administrator login password or enable a 6-digit Two-Factor Security PIN to block unauthorized logins.
              </p>
            </div>

            {/* Current Security Status Card */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-2xl">
                  {securityProfile?.twoFactorEnabled ? "🛡️" : "⚠️"}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Admin Account:</span>
                    <span className="text-xs font-bold text-white font-mono">{securityProfile?.email || "admin@coinflip.com"}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-400">Two-Factor PIN Status:</span>
                    {securityProfile?.twoFactorEnabled ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        ACTIVE &amp; ENFORCED (2FA ON)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        DISABLED (Password Only)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {securityProfile?.passwordChangedAt && (
                <div className="text-xs text-slate-500">
                  Last password update: {new Date(securityProfile.passwordChangedAt).toLocaleDateString()}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* SECTION A: CHANGE PASSWORD */}
              <div className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>🔑</span> Change Admin Password
                  </h3>
                  <span className="text-[10px] text-slate-500">Min 8 characters</span>
                </div>

                <p className="text-xs text-slate-400">
                  Apne admin account ka password update karein taaki panel secure rahe.
                </p>

                {pwdMsg && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                    {pwdMsg}
                  </div>
                )}

                {pwdErr && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold">
                    ⚠️ {pwdErr}
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="space-y-3.5 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Current Password
                    </label>
                    <input
                      type="password"
                      placeholder="Enter current password"
                      value={pwdCurrent}
                      onChange={(e) => setPwdCurrent(e.target.value)}
                      required
                      className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs text-white placeholder-slate-600 outline-none transition focus:border-yellow-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      New Strong Password
                    </label>
                    <input
                      type="password"
                      placeholder="At least 8+ characters (e.g. MySec@2026#Admin)"
                      value={pwdNew}
                      onChange={(e) => setPwdNew(e.target.value)}
                      required
                      className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs text-white placeholder-slate-600 outline-none transition focus:border-yellow-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      placeholder="Re-type new password"
                      value={pwdConfirm}
                      onChange={(e) => setPwdConfirm(e.target.value)}
                      required
                      className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs text-white placeholder-slate-600 outline-none transition focus:border-yellow-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={pwdLoading || !pwdCurrent || !pwdNew || !pwdConfirm}
                    className="w-full mt-2 py-3 px-4 rounded-xl bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-wider transition shadow-lg shadow-yellow-500/20 flex items-center justify-center gap-2"
                  >
                    {pwdLoading ? (
                      <>
                        <span className="animate-spin text-sm">↻</span>
                        <span>Updating Password...</span>
                      </>
                    ) : (
                      <>
                        <span>🔑</span>
                        <span>Update Admin Password</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* SECTION B: TWO-FACTOR PIN (2FA) */}
              <div className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>🛡️</span> Two-Factor Authentication (6-Digit PIN)
                  </h3>
                  <span className="text-[10px] text-yellow-400 font-bold">2-Layer Defense</span>
                </div>

                <p className="text-xs text-slate-400">
                  Jab 2FA active hoga, login karte waqt password ke sath-sath aapka secret 6-digit PIN bhi daalna padega. Kisi ke paas password ho tab bhi bina PIN ke koi login nahi kar sakta.
                </p>

                {pinMsg && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                    {pinMsg}
                  </div>
                )}

                {pinErr && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold">
                    ⚠️ {pinErr}
                  </div>
                )}

                <form onSubmit={handleSetupPin} className="space-y-3.5 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      {securityProfile?.twoFactorEnabled ? "New 6-Digit PIN" : "Choose 6-Digit Security PIN"}
                    </label>
                    <input
                      type="password"
                      maxLength={6}
                      pattern="[0-9]*"
                      inputMode="numeric"
                      placeholder="e.g. 849201"
                      value={pinCode}
                      onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ""))}
                      required
                      className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs text-yellow-400 font-mono tracking-widest text-center font-bold placeholder-slate-600 outline-none transition focus:border-yellow-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Confirm 6-Digit PIN
                    </label>
                    <input
                      type="password"
                      maxLength={6}
                      pattern="[0-9]*"
                      inputMode="numeric"
                      placeholder="Re-enter 6-digit PIN"
                      value={pinConfirm}
                      onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, ""))}
                      required
                      className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs text-yellow-400 font-mono tracking-widest text-center font-bold placeholder-slate-600 outline-none transition focus:border-yellow-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Verify Current Admin Password
                    </label>
                    <input
                      type="password"
                      placeholder="Enter admin password to confirm"
                      value={pinCurrentPwd}
                      onChange={(e) => setPinCurrentPwd(e.target.value)}
                      required
                      className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs text-white placeholder-slate-600 outline-none transition focus:border-yellow-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={pinLoading || pinCode.length !== 6 || !pinCurrentPwd}
                    className="w-full mt-2 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                  >
                    {pinLoading ? (
                      <>
                        <span className="animate-spin text-sm">↻</span>
                        <span>Saving PIN...</span>
                      </>
                    ) : (
                      <>
                        <span>🛡️</span>
                        <span>{securityProfile?.twoFactorEnabled ? "Update 6-Digit 2FA PIN" : "Activate 2FA 6-Digit PIN"}</span>
                      </>
                    )}
                  </button>
                </form>

                {/* Disable 2FA Option if currently enabled */}
                {securityProfile?.twoFactorEnabled && (
                  <div className="pt-4 mt-4 border-t border-slate-800">
                    <p className="text-[11px] text-slate-400 mb-2">
                      Need to turn off 2FA? Enter password to disable:
                    </p>

                    {disableErr && (
                      <div className="p-2 mb-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                        ⚠️ {disableErr}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <input
                        type="password"
                        placeholder="Current password"
                        value={disablePwd}
                        onChange={(e) => setDisablePwd(e.target.value)}
                        className="flex-1 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-600 outline-none focus:border-red-500"
                      />
                      <button
                        type="button"
                        onClick={handleDisablePin}
                        disabled={disableLoading || !disablePwd}
                        className="px-3.5 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 text-xs font-bold transition disabled:opacity-50 shrink-0"
                      >
                        {disableLoading ? "Disabling..." : "Disable 2FA"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 7. BROADCAST & SUPPORT */}
        {activeTab === "announcements" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>📢</span> Announcements &amp; Support Channels
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Display ticker marquee messages to players and provide quick contact links.</p>
            </div>

            <DarkToggle
              label="Global Banner Announcement Enabled"
              description="Shows a scrolling marquee banner at the top of the player app"
              checked={settings.announcementEnabled}
              onChange={(val) => updateField("announcementEnabled", val)}
            />

            <DarkTextArea
              label="Announcement Text"
              value={settings.announcement}
              onChange={(val) => updateField("announcement", val)}
              placeholder="e.g. ⚡ Deposit ₹500 today and get instant 100% bonus! Lucky spin reset daily at midnight."
              rows={2}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <DarkField
                label="Support WhatsApp / Phone Number"
                value={settings.supportContact}
                onChange={(val) => updateField("supportContact", val)}
                placeholder="+91 98765 43210"
              />

              <DarkField
                label="Telegram Support Channel / Group Link"
                value={settings.supportLink}
                onChange={(val) => updateField("supportLink", val)}
                placeholder="https://t.me/coinflip_official"
              />
            </div>
          </div>
        )}
        {/* TAB STEPPER FOOTER (PREV / NEXT CATEGORY) */}
        <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => goToTab(activeTabIndex - 1)}
            disabled={activeTabIndex <= 0}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-bold transition min-h-[44px]"
          >
            <span>‹ Previous:</span>
            <span>{activeTabIndex > 0 ? tabs[activeTabIndex - 1].name : "Start"}</span>
          </button>

          <span className="text-[11px] font-bold text-slate-400">
            Category {activeTabIndex + 1} of {tabs.length}
          </span>

          <button
            type="button"
            onClick={() => goToTab(activeTabIndex + 1)}
            disabled={activeTabIndex >= tabs.length - 1}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-bold transition min-h-[44px]"
          >
            <span>Next:</span>
            <span>{activeTabIndex < tabs.length - 1 ? tabs[activeTabIndex + 1].name : "End"}</span>
            <span>›</span>
          </button>
        </div>
      </div>

      {/* BOTTOM DESKTOP SAVE BAR (Shown on config tabs) */}
      {activeTab !== "adminAuth" && (
        <div className="hidden sm:flex p-4 rounded-2xl bg-slate-900/90 border border-slate-800 items-center justify-between shadow-lg">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="text-yellow-400">⚡</span>
            <span>Changes apply immediately across game engine, deposits, and cashier rules.</span>
          </div>

          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-6 py-3 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black text-xs transition shadow-lg shadow-yellow-500/20 disabled:opacity-50 min-h-[44px] cursor-pointer"
          >
            {saving ? "Saving Changes..." : "Save All Settings ✓"}
          </button>
        </div>
      )}

      {/* FLOATING QUICK SAVE BAR ON MOBILE */}
      {activeTab !== "adminAuth" && (
        <div className="sm:hidden fixed bottom-14 left-3 right-3 z-30 flex items-center justify-between p-3 rounded-2xl bg-slate-950/95 backdrop-blur-xl border border-yellow-500/50 shadow-2xl shadow-yellow-500/30 animate-in slide-in-from-bottom-4">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-black tracking-wider text-yellow-400">
              Live Config
            </span>
            <span className="text-xs font-bold text-white">
              {tabs[activeTabIndex]?.name}
            </span>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-yellow-500 hover:bg-yellow-400 active:scale-95 text-slate-950 font-black text-xs transition shadow-md shadow-yellow-500/30 disabled:opacity-50 min-h-[42px]"
          >
            <span>💾</span>
            <span>{saving ? "Saving..." : "Save Settings"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
