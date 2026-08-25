"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { authFetch } from "../../lib/clientAuth";

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
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("deposits");
  const [lastRefreshed, setLastRefreshed] = useState("");
  const [actionProcessing, setActionProcessing] = useState(null);

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");

      const response = await authFetch("/api/admin/dashboard", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || "Unable to load dashboard data.");
        return;
      }

      setStats(data.stats || {});
      setRecentDeposits(data.recentDeposits || []);
      setRecentWithdraws(data.recentWithdraws || []);
      setRecentGames(data.recentGames || []);
      setLastRefreshed(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    } catch (err) {
      console.error("Dashboard error:", err);
      setError("Unable to connect to admin dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  async function quickApproveDeposit(id) {
    if (!window.confirm("Approve this deposit request?")) return;
    try {
      setActionProcessing(id);
      const res = await authFetch("/api/admin/deposits/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId: id }),
      });
      const data = await res.json();
      if (data.success) {
        await loadDashboard();
      } else {
        alert(data.message || "Failed to approve deposit");
      }
    } catch (e) {
      alert("Error approving deposit");
    } finally {
      setActionProcessing(null);
    }
  }

  async function quickRejectDeposit(id) {
    const reason = window.prompt("Enter rejection reason (optional):", "Invalid UTR / Payment not received");
    if (reason === null) return;
    try {
      setActionProcessing(id);
      const res = await authFetch("/api/admin/deposits/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId: id, reason }),
      });
      const data = await res.json();
      if (data.success) {
        await loadDashboard();
      } else {
        alert(data.message || "Failed to reject deposit");
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
    });
  }

  const netHouseProfit = (Number(stats.totalGameEntry || 0) - Number(stats.totalGameWin || 0)) + (Number(stats.deposits || 0) - Number(stats.withdraws || 0));
  const pendingTotalCount = Number(stats.pendingDeposits || 0) + Number(stats.pendingWithdraws || 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[11px] font-black uppercase tracking-wider bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
              Admin Overview
            </span>
            <span className="text-xs text-slate-400">
              {lastRefreshed ? `Last updated: ${lastRefreshed}` : "Live Real-Time Sync"}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Financial &amp; Platform Dashboard
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time telemetry on revenue, user wagers, deposits, and withdrawal settlements.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadDashboard}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition disabled:opacity-50"
          >
            <span className={loading ? "animate-spin" : ""}>↻</span>
            <span>{loading ? "Syncing..." : "Refresh Data"}</span>
          </button>

          <Link
            href="/admin/settings"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black text-xs transition shadow-md shadow-yellow-500/10"
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
          <button onClick={loadDashboard} className="underline text-xs">Retry</button>
        </div>
      )}

      {/* PENDING NOTIFICATION ACTION BANNER */}
      {pendingTotalCount > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-transparent border border-yellow-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center text-xl shrink-0">
              ⚡
            </div>
            <div>
              <h3 className="font-bold text-yellow-300 text-sm">
                Attention Required: {pendingTotalCount} Pending Settlement Requests
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                {stats.pendingDeposits} deposit verification(s) and {stats.pendingWithdraws} withdrawal transfer request(s) need review.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {stats.pendingDeposits > 0 && (
              <Link
                href="/admin/deposits"
                className="px-3.5 py-2 rounded-xl bg-yellow-500 text-black font-extrabold text-xs hover:bg-yellow-400 transition"
              >
                Review Deposits ({stats.pendingDeposits})
              </Link>
            )}
            {stats.pendingWithdraws > 0 && (
              <Link
                href="/admin/withdraws"
                className="px-3.5 py-2 rounded-xl bg-slate-800 text-white border border-slate-700 font-bold text-xs hover:bg-slate-700 transition"
              >
                Process Withdrawals ({stats.pendingWithdraws})
              </Link>
            )}
          </div>
        </div>
      )}

      {/* PRIMARY METRICS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Deposits */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/10 transition"></div>
          <div>
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
              <span>Total Deposits</span>
              <span className="text-emerald-400 text-base">💳</span>
            </div>
            <div className="text-2xl lg:text-3xl font-black text-white tabular-nums">
              {money(stats.deposits)}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">Approved count:</span>
            <span className="font-bold text-emerald-400">{stats.approvedDeposits || 0} approved</span>
          </div>
        </div>

        {/* Total Withdrawals */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl group-hover:bg-blue-500/10 transition"></div>
          <div>
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
              <span>Total Withdrawals</span>
              <span className="text-blue-400 text-base">🏦</span>
            </div>
            <div className="text-2xl lg:text-3xl font-black text-white tabular-nums">
              {money(stats.withdraws)}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">Paid settlements:</span>
            <span className="font-bold text-blue-400">{stats.approvedWithdraws || 0} completed</span>
          </div>
        </div>

        {/* Gaming Turnover / Volume */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-xl group-hover:bg-purple-500/10 transition"></div>
          <div>
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
              <span>Gaming Turnover</span>
              <span className="text-purple-400 text-base">🎲</span>
            </div>
            <div className="text-2xl lg:text-3xl font-black text-white tabular-nums">
              {money(stats.totalGameEntry)}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">Total rounds:</span>
            <span className="font-bold text-purple-400">{stats.games || 0} flips</span>
          </div>
        </div>

        {/* Net Platform House Edge Profit */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/5 rounded-full blur-xl group-hover:bg-yellow-500/10 transition"></div>
          <div>
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
              <span>House Net Margin</span>
              <span className="text-yellow-400 text-base">📈</span>
            </div>
            <div className={`text-2xl lg:text-3xl font-black tabular-nums ${stats.gameDifference >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {money(stats.gameDifference)}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">Player Win Rate:</span>
            <span className="font-bold text-yellow-400">
              {stats.games > 0 ? ((stats.wonGames / stats.games) * 100).toFixed(1) : "0"}%
            </span>
          </div>
        </div>
      </div>

      {/* SECONDARY STATS ROW */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
          <span className="text-xs text-slate-400 font-medium">Registered Users</span>
          <div className="text-xl font-bold text-white mt-1">{stats.users || 0}</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
          <span className="text-xs text-slate-400 font-medium">Pending Deposits</span>
          <div className="text-xl font-bold text-yellow-400 mt-1">
            {stats.pendingDeposits || 0} ({money(stats.pendingDepositAmount)})
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
          <span className="text-xs text-slate-400 font-medium">Pending Withdrawals</span>
          <div className="text-xl font-bold text-amber-400 mt-1">
            {stats.pendingWithdraws || 0} ({money(stats.pendingWithdrawAmount)})
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
          <span className="text-xs text-slate-400 font-medium">Total Payouts Won</span>
          <div className="text-xl font-bold text-emerald-400 mt-1">
            {money(stats.totalGameWin)}
          </div>
        </div>
      </div>

      {/* TABBED LIVE ACTIVITY MANAGEMENT */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚡</span>
            <h2 className="text-lg font-bold text-white">Live Transactions &amp; Feed</h2>
          </div>

          <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
            <button
              onClick={() => setActiveTab("deposits")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === "deposits"
                  ? "bg-yellow-500 text-black shadow"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              Deposits ({recentDeposits.length})
            </button>
            <button
              onClick={() => setActiveTab("withdraws")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === "withdraws"
                  ? "bg-yellow-500 text-black shadow"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              Withdrawals ({recentWithdraws.length})
            </button>
            <button
              onClick={() => setActiveTab("games")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
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
            <table className="w-full text-left text-xs">
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
                  recentDeposits.map((item) => (
                    <tr key={item._id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white">{item.user?.name || "Player"}</div>
                        <div className="text-[11px] text-slate-400">{item.user?.email || "-"}</div>
                      </td>
                      <td className="py-3.5 px-4 font-black text-emerald-400 text-sm">
                        {money(item.amount)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-slate-300 bg-slate-800/80 px-2 py-1 rounded border border-slate-700">
                          {item.utr || "N/A"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {formatDate(item.createdAt)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold capitalize ${
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
                      <td className="py-3.5 px-4 text-right">
                        {item.status === "pending" ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => quickApproveDeposit(item._id)}
                              disabled={actionProcessing === item._id}
                              className="px-2.5 py-1 rounded-lg bg-emerald-500 text-black font-bold text-[11px] hover:bg-emerald-400 transition"
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
            <table className="w-full text-left text-xs">
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
                  recentWithdraws.map((item) => (
                    <tr key={item._id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white">{item.user?.name || "Player"}</div>
                        <div className="text-[11px] text-slate-400">{item.user?.email || "-"}</div>
                      </td>
                      <td className="py-3.5 px-4 font-black text-amber-400 text-sm">
                        {money(item.amount)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-slate-300 bg-slate-800/80 px-2 py-1 rounded border border-slate-700">
                          {item.upiId || item.bankAccount || "UPI Direct"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {formatDate(item.createdAt)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold capitalize ${
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
                      <td className="py-3.5 px-4 text-right">
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
            <table className="w-full text-left text-xs">
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
                  recentGames.map((g) => (
                    <tr key={g._id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white">{g.user?.name || "Player"}</div>
                        <div className="text-[11px] text-slate-400">{g.user?.email || "-"}</div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-white">
                        {money(g.entryFee)}
                      </td>
                      <td className="py-3.5 px-4 capitalize font-semibold text-slate-300">
                        {g.prediction === "heads" ? "🟡 Heads" : "🔵 Tails"}
                      </td>
                      <td className="py-3.5 px-4 capitalize font-semibold">
                        {g.result === "heads" ? "🟡 Heads" : "🔵 Tails"}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`font-black ${
                            g.status === "won" ? "text-emerald-400" : "text-slate-500 line-through"
                          }`}
                        >
                          {g.status === "won" ? `+${money(g.winAmount)}` : `-${money(g.entryFee)}`}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-400">
                        {formatDate(g.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-4 bg-slate-950/40 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Showing latest real-time records</span>
          <div className="flex items-center gap-3">
            <Link href="/admin/deposits" className="hover:text-yellow-400 font-semibold">All Deposits →</Link>
            <Link href="/admin/withdraws" className="hover:text-yellow-400 font-semibold">All Withdrawals →</Link>
            <Link href="/admin/games" className="hover:text-yellow-400 font-semibold">All Games →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
