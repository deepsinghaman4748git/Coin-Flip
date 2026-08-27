"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { authFetch, safeJson } from "../../lib/clientAuth";
import BharatCoinLogo from "../../components/BharatCoinLogo";

const RUPEE = "₹";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    users: 0,
    games: 0,
    wonGames: 0,
    lostGames: 0,
    deposits: 0,
    totalDeposits: 0,
    pendingDeposits: 0,
    pendingDepositAmount: 0,
    approvedDeposits: 0,
    rejectedDeposits: 0,
    withdraws: 0,
    totalWithdraws: 0,
    pendingWithdraws: 0,
    pendingWithdrawAmount: 0,
    approvedWithdraws: 0,
    rejectedWithdraws: 0,
    totalGameEntry: 0,
    totalGameWin: 0,
    gameDifference: 0,
  });

  const [recentDeposits, setRecentDeposits] = useState([]);
  const [recentWithdraws, setRecentWithdraws] = useState([]);
  const [recentGames, setRecentGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("deposits");
  const [lastRefreshed, setLastRefreshed] = useState("");
  const [actionProcessing, setActionProcessing] = useState(null);
  const [livePulseTick, setLivePulseTick] = useState(0);

  const isMountedRef = useRef(true);

  async function loadDashboard(isSilent = false) {
    if (!isSilent) {
      setLoading(true);
    } else {
      setIsSyncing(true);
    }
    setError("");

    try {
      const response = await authFetch("/api/admin/dashboard", {
        cache: "no-store",
      });

      const data = await safeJson(response);

      if (!response.ok || !data?.success) {
        if (response.status === 401 || response.status === 403 || data?.unauthorized) {
          setError("Admin session expired or access denied. Redirecting to login...");
          if (typeof window !== "undefined") {
            setTimeout(() => {
              window.location.href = "/admin/login";
            }, 1200);
          }
          return;
        }
        if (!isSilent) {
          setError(data?.message || "Unable to load dashboard data.");
        }
        return;
      }

      setStats(data.stats || {});
      setRecentDeposits(data.recentDeposits || []);
      setRecentWithdraws(data.recentWithdraws || []);
      setRecentGames(data.recentGames || []);
      setLastRefreshed(
        new Date().toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
      setLivePulseTick((prev) => prev + 1);
    } catch (err) {
      if (!isSilent) {
        console.error("Dashboard error:", err);
        setError("Unable to connect to admin dashboard.");
      }
    } finally {
      if (!isSilent) setLoading(false);
      setIsSyncing(false);
    }
  }

  // Initial Load
  useEffect(() => {
    isMountedRef.current = true;
    loadDashboard(false);
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Continuous Real-Time Auto-Polling (Live updates every 3.5 seconds)
  useEffect(() => {
    if (!autoSyncEnabled) return;

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        loadDashboard(true);
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [autoSyncEnabled]);

  async function quickApproveDeposit(id) {
    if (!window.confirm("Approve this deposit request?")) return;
    try {
      setActionProcessing(id);
      const res = await authFetch("/api/admin/deposits/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId: id }),
      });
      const data = await safeJson(res);
      if (data?.success) {
        await loadDashboard(true);
      } else {
        alert(data?.message || "Failed to approve deposit");
      }
    } catch (e) {
      alert("Error approving deposit");
    } finally {
      setActionProcessing(null);
    }
  }

  async function quickRejectDeposit(id) {
    const reason = window.prompt(
      "Enter rejection reason (optional):",
      "Invalid UTR / Payment not received"
    );
    if (reason === null) return;
    try {
      setActionProcessing(id);
      const res = await authFetch("/api/admin/deposits/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId: id, reason }),
      });
      const data = await safeJson(res);
      if (data?.success) {
        await loadDashboard(true);
      } else {
        alert(data?.message || "Failed to reject deposit");
      }
    } catch (e) {
      alert("Error rejecting deposit");
    } finally {
      setActionProcessing(null);
    }
  }

  function money(amount) {
    return `${RUPEE}${Number(amount || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  function formatDate(val) {
    if (!val) return "-";
    return new Date(val).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  const pendingTotalCount =
    Number(stats.pendingDeposits || 0) + Number(stats.pendingWithdraws || 0);

  // Calculate platform house margin percentage
  const totalWagered = Number(stats.totalGameEntry || 0);
  const houseProfit = Number(stats.gameDifference || 0);
  const houseMarginPct = totalWagered > 0 ? ((houseProfit / totalWagered) * 100).toFixed(1) : "0.0";
  const playerWinRatePct =
    Number(stats.games || 0) > 0
      ? ((Number(stats.wonGames || 0) / Number(stats.games || 0)) * 100).toFixed(1)
      : "0.0";

  return (
    <div className="p-3 sm:p-6 lg:p-8 space-y-5 max-w-7xl mx-auto w-full">
      {/* Top Header Card with Bharat Emblem & Live Real-Time Polling Status */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-900/80 p-4 sm:p-6 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="flex items-start gap-3.5">
          <BharatCoinLogo size="lg" className="hidden sm:inline-flex mt-1" animate={false} />
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              {/* Real-time Live Badge */}
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black tracking-wide border shadow-sm ${
                  autoSyncEnabled
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                    : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                }`}
              >
                <span className="relative flex h-2 w-2">
                  {autoSyncEnabled && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  )}
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${
                      autoSyncEnabled ? "bg-emerald-500" : "bg-amber-500"
                    }`}
                  ></span>
                </span>
                <span>{autoSyncEnabled ? "LIVE AUTO-SYNC (3s)" : "SYNC PAUSED"}</span>
              </div>

              {lastRefreshed && (
                <span className="text-[11px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                  Updated: {lastRefreshed}
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight flex items-center gap-2">
              <span>Financial &amp; Platform Dashboard</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Live monitoring of deposits, payouts, turnover, house profit, and player activity.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 shrink-0 self-start md:self-auto">
          {/* Toggle Live Sync */}
          <button
            type="button"
            onClick={() => setAutoSyncEnabled(!autoSyncEnabled)}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
              autoSyncEnabled
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
            }`}
            title="Toggle Live Real-Time Auto Refresh"
          >
            <span>{autoSyncEnabled ? "🟢 Live ON" : "⏸️ Paused"}</span>
          </button>

          {/* Instant Manual Refresh */}
          <button
            type="button"
            onClick={() => loadDashboard(false)}
            disabled={loading || isSyncing}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition disabled:opacity-50 active:scale-95"
          >
            <span className={loading || isSyncing ? "animate-spin" : ""}>↻</span>
            <span>{loading || isSyncing ? "Syncing..." : "Refresh"}</span>
          </button>

          <Link
            href="/admin/settings"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black text-xs transition shadow-md shadow-yellow-500/10"
          >
            <span>⚙️</span>
            <span>Settings</span>
          </Link>
        </div>
      </div>

      {/* ERROR ALERT */}
      {error && (
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm font-semibold flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button onClick={() => loadDashboard(false)} className="underline text-xs">
            Retry
          </button>
        </div>
      )}

      {/* PENDING NOTIFICATION ACTION BANNER */}
      {pendingTotalCount > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-transparent border border-yellow-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center text-xl shrink-0">
              ⚡
            </div>
            <div>
              <h3 className="font-bold text-yellow-300 text-sm">
                Attention Required: {pendingTotalCount} Pending Settlement Requests
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                {stats.pendingDeposits} deposit verification(s) &amp; {stats.pendingWithdraws} withdrawal transfer(s) awaiting approval.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            {stats.pendingDeposits > 0 && (
              <Link
                href="/admin/deposits"
                className="flex-1 sm:flex-none text-center px-3.5 py-2 rounded-xl bg-yellow-500 text-black font-extrabold text-xs hover:bg-yellow-400 transition"
              >
                Deposits ({stats.pendingDeposits})
              </Link>
            )}
            {stats.pendingWithdraws > 0 && (
              <Link
                href="/admin/withdraws"
                className="flex-1 sm:flex-none text-center px-3.5 py-2 rounded-xl bg-slate-800 text-white border border-slate-700 font-bold text-xs hover:bg-slate-700 transition"
              >
                Withdraws ({stats.pendingWithdraws})
              </Link>
            )}
          </div>
        </div>
      )}

      {/* 5 MAIN LIVE DASHBOARD METRICS:
          1. Total Deposits
          2. Total Withdrawals
          3. Gaming Turnover
          4. House Net Margin
          5. Total Users
      */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* 1. TOTAL DEPOSITS */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between relative overflow-hidden shadow-md group hover:border-emerald-500/30 transition">
          <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-full blur-xl pointer-events-none"></div>
          <div>
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
              <span className="flex items-center gap-1">
                <span>Total Deposits</span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" title="Live Metric"></span>
              </span>
              <span className="text-emerald-400 text-base">💳</span>
            </div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-black text-white tabular-nums tracking-tight">
              {money(stats.deposits || stats.totalDeposits)}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">Approved:</span>
            <span className="font-bold text-emerald-400">{stats.approvedDeposits || 0} Txns</span>
          </div>
        </div>

        {/* 2. TOTAL WITHDRAWALS */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between relative overflow-hidden shadow-md group hover:border-blue-500/30 transition">
          <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full blur-xl pointer-events-none"></div>
          <div>
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
              <span className="flex items-center gap-1">
                <span>Total Withdrawals</span>
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" title="Live Metric"></span>
              </span>
              <span className="text-blue-400 text-base">🏦</span>
            </div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-black text-white tabular-nums tracking-tight">
              {money(stats.withdraws || stats.totalWithdraws)}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">Settled:</span>
            <span className="font-bold text-blue-400">{stats.approvedWithdraws || 0} Paid</span>
          </div>
        </div>

        {/* 3. GAMING TURNOVER */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between relative overflow-hidden shadow-md group hover:border-purple-500/30 transition">
          <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/10 rounded-full blur-xl pointer-events-none"></div>
          <div>
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
              <span className="flex items-center gap-1">
                <span>Gaming Turnover</span>
                <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-pulse" title="Live Metric"></span>
              </span>
              <span className="text-purple-400 text-base">🎲</span>
            </div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-black text-white tabular-nums tracking-tight">
              {money(stats.totalGameEntry)}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">Rounds:</span>
            <span className="font-bold text-purple-400">{stats.games || 0} Flips</span>
          </div>
        </div>

        {/* 4. HOUSE NET MARGIN (Net House Profit) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between relative overflow-hidden shadow-md group hover:border-yellow-500/30 transition">
          <div className="absolute top-0 right-0 w-20 h-20 bg-yellow-500/10 rounded-full blur-xl pointer-events-none"></div>
          <div>
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
              <span className="flex items-center gap-1">
                <span>House Net Margin</span>
                <span className="h-1.5 w-1.5 rounded-full bg-yellow-400 animate-pulse" title="Live Metric"></span>
              </span>
              <span className="text-yellow-400 text-base">📈</span>
            </div>
            <div
              className={`text-xl sm:text-2xl lg:text-3xl font-black tabular-nums tracking-tight ${
                stats.gameDifference >= 0 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {money(stats.gameDifference)}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">Player Win %:</span>
            <span className="font-bold text-yellow-400">{playerWinRatePct}%</span>
          </div>
        </div>

        {/* 5. TOTAL USERS */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between relative overflow-hidden shadow-md group hover:border-amber-500/30 transition">
          <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/10 rounded-full blur-xl pointer-events-none"></div>
          <div>
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
              <span className="flex items-center gap-1">
                <span>Total Users</span>
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" title="Live Metric"></span>
              </span>
              <span className="text-amber-400 text-base">👥</span>
            </div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-black text-white tabular-nums tracking-tight">
              {stats.users || 0}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">Status:</span>
            <span className="font-bold text-emerald-400">Active</span>
          </div>
        </div>
      </div>

      {/* SECONDARY REAL-TIME FINANCIAL SUMMARY TILES */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800">
          <div className="text-[11px] text-slate-400 font-medium">Pending Deposits</div>
          <div className="text-base sm:text-lg font-black text-yellow-400 mt-0.5">
            {stats.pendingDeposits || 0} ({money(stats.pendingDepositAmount)})
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800">
          <div className="text-[11px] text-slate-400 font-medium">Pending Withdrawals</div>
          <div className="text-base sm:text-lg font-black text-amber-400 mt-0.5">
            {stats.pendingWithdraws || 0} ({money(stats.pendingWithdrawAmount)})
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800">
          <div className="text-[11px] text-slate-400 font-medium">Total Payouts Won</div>
          <div className="text-base sm:text-lg font-black text-emerald-400 mt-0.5">
            {money(stats.totalGameWin)}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800">
          <div className="text-[11px] text-slate-400 font-medium">House Margin %</div>
          <div className="text-base sm:text-lg font-black text-indigo-400 mt-0.5">
            {houseMarginPct}%
          </div>
        </div>
      </div>

      {/* TABBED LIVE ACTIVITY MANAGEMENT */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚡</span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white leading-none">
                Live Transaction &amp; Game Feed
              </h2>
              <p className="text-[11px] text-slate-400 mt-1">
                Real-time stream updated automatically without page refresh
              </p>
            </div>
          </div>

          <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 w-full sm:w-auto justify-between">
            <button
              onClick={() => setActiveTab("deposits")}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === "deposits"
                  ? "bg-yellow-500 text-black shadow"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              Deposits ({recentDeposits.length})
            </button>
            <button
              onClick={() => setActiveTab("withdraws")}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === "withdraws"
                  ? "bg-yellow-500 text-black shadow"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              Withdrawals ({recentWithdraws.length})
            </button>
            <button
              onClick={() => setActiveTab("games")}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === "games"
                  ? "bg-yellow-500 text-black shadow"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              Games ({recentGames.length})
            </button>
          </div>
        </div>

        {/* TAB: DEPOSITS */}
        {activeTab === "deposits" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[600px]">
              <thead className="bg-slate-950/60 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">UTR / Ref</th>
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recentDeposits.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-500">
                      No deposit records found.
                    </td>
                  </tr>
                ) : (
                  recentDeposits.map((item, idx) => (
                    <tr
                      key={item._id || item.id || `deposit-row-${idx}-${item.createdAt || ""}`}
                      className="hover:bg-slate-800/30 transition"
                    >
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">{item.user?.name || "Player"}</div>
                        <div className="text-[11px] text-slate-400">{item.user?.email || "-"}</div>
                      </td>
                      <td className="py-3 px-4 font-black text-emerald-400 text-sm">
                        {money(item.amount)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-slate-300 bg-slate-800/80 px-2 py-1 rounded border border-slate-700">
                          {item.utr || "N/A"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {formatDate(item.createdAt)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold capitalize ${
                            item.status === "approved" || item.status === "completed"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : item.status === "pending"
                              ? "bg-yellow-500/15 text-yellow-300 border border-yellow-500/30 animate-pulse"
                              : "bg-red-500/10 text-red-400 border border-red-500/20"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {item.status === "pending" ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => quickApproveDeposit(item._id)}
                              disabled={actionProcessing === item._id}
                              className="px-2.5 py-1 rounded-lg bg-emerald-500 text-black font-bold text-[11px] hover:bg-emerald-400 transition shadow-sm"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => quickRejectDeposit(item._id)}
                              disabled={actionProcessing === item._id}
                              className="px-2.5 py-1 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 font-bold text-[11px] hover:bg-red-500 hover:text-white transition"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <Link
                            href="/admin/deposits"
                            className="text-slate-400 hover:text-yellow-400 text-xs underline"
                          >
                            View
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB: WITHDRAWALS */}
        {activeTab === "withdraws" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[600px]">
              <thead className="bg-slate-950/60 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Destination (UPI/Bank)</th>
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recentWithdraws.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-500">
                      No withdrawal records found.
                    </td>
                  </tr>
                ) : (
                  recentWithdraws.map((item, idx) => (
                    <tr
                      key={item._id || item.id || `withdraw-row-${idx}-${item.createdAt || ""}`}
                      className="hover:bg-slate-800/30 transition"
                    >
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">{item.user?.name || "Player"}</div>
                        <div className="text-[11px] text-slate-400">{item.user?.email || "-"}</div>
                      </td>
                      <td className="py-3 px-4 font-black text-amber-400 text-sm">
                        {money(item.amount)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-slate-300 bg-slate-800/80 px-2 py-1 rounded border border-slate-700">
                          {item.upiId || item.bankAccount || "UPI Direct"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {formatDate(item.createdAt)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold capitalize ${
                            item.status === "completed" || item.status === "approved"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : item.status === "pending"
                              ? "bg-amber-500/15 text-amber-300 border border-amber-500/30 animate-pulse"
                              : "bg-red-500/10 text-red-400 border border-red-500/20"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href="/admin/withdraws"
                          className="px-3 py-1.5 rounded-lg bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 font-bold hover:bg-yellow-500 hover:text-black transition"
                        >
                          Manage ↗
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB: GAMES */}
        {activeTab === "games" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[600px]">
              <thead className="bg-slate-950/60 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Bet Wagered</th>
                  <th className="py-3 px-4">Prediction</th>
                  <th className="py-3 px-4">Result</th>
                  <th className="py-3 px-4">Payout</th>
                  <th className="py-3 px-4 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recentGames.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-500">
                      No game rounds played yet.
                    </td>
                  </tr>
                ) : (
                  recentGames.map((g, idx) => (
                    <tr
                      key={g._id || g.id || `game-row-${idx}-${g.createdAt || ""}`}
                      className="hover:bg-slate-800/30 transition"
                    >
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">{g.user?.name || "Player"}</div>
                        <div className="text-[11px] text-slate-400">{g.user?.email || "-"}</div>
                      </td>
                      <td className="py-3 px-4 font-bold text-white">
                        {money(g.entryFee)}
                      </td>
                      <td className="py-3 px-4 capitalize font-semibold text-slate-300">
                        {g.prediction === "heads" ? "🟡 Heads" : "🔵 Tails"}
                      </td>
                      <td className="py-3 px-4 capitalize font-semibold">
                        {g.result === "heads" ? "🟡 Heads" : "🔵 Tails"}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-black ${
                            g.status === "won" ? "text-emerald-400" : "text-slate-500 line-through"
                          }`}
                        >
                          {g.status === "won" ? `+${money(g.winAmount)}` : `-${money(g.entryFee)}`}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-400">
                        {formatDate(g.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-3.5 bg-slate-950/50 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Live telemetry active • No refresh needed</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin/deposits" className="hover:text-yellow-400 font-semibold">
              All Deposits →
            </Link>
            <Link href="/admin/withdraws" className="hover:text-yellow-400 font-semibold">
              All Withdrawals →
            </Link>
            <Link href="/admin/games" className="hover:text-yellow-400 font-semibold">
              All Games →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
