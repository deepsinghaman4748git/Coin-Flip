"use client";

import { useEffect, useState, useMemo } from "react";
import { authFetch } from "../../lib/clientAuth";

const RUPEE = "₹";

export default function AdminGamesPage() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState("all");
  const [highRollerOnly, setHighRollerOnly] = useState(false);

  async function loadGames() {
    try {
      setLoading(true);
      setError("");
      const response = await authFetch("/api/admin/games", { cache: "no-store" });
      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || "Unable to load games");
        return;
      }

      setGames(data.games || []);
    } catch (err) {
      console.error("Admin games error:", err);
      setError("Unable to load game history");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGames();
  }, []);

  // Compute live statistics
  const stats = useMemo(() => {
    let totalEntry = 0;
    let totalPayout = 0;
    let wonCount = 0;
    let lostCount = 0;

    games.forEach((g) => {
      totalEntry += Number(g.entryFee || 0);
      totalPayout += Number(g.winAmount || 0);
      if (g.status === "won") wonCount++;
      if (g.status === "lost") lostCount++;
    });

    const netHouseMargin = totalEntry - totalPayout;
    const totalRounds = games.length;
    const winRate = totalRounds > 0 ? ((wonCount / totalRounds) * 100).toFixed(1) : "0";

    return {
      totalRounds,
      totalEntry,
      totalPayout,
      netHouseMargin,
      wonCount,
      lostCount,
      winRate,
    };
  }, [games]);

  // Filtered games list
  const filteredGames = useMemo(() => {
    return games.filter((g) => {
      if (outcomeFilter === "won" && g.status !== "won") return false;
      if (outcomeFilter === "lost" && g.status !== "lost") return false;
      if (highRollerOnly && Number(g.entryFee || 0) < 500) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const userName = (g.user?.name || "").toLowerCase();
        const userEmail = (g.user?.email || "").toLowerCase();
        const id = (g._id || "").toLowerCase();
        const fee = String(g.entryFee || "");

        if (!userName.includes(q) && !userEmail.includes(q) && !id.includes(q) && !fee.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [games, outcomeFilter, highRollerOnly, searchQuery]);

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

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[11px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-400 border border-purple-500/30">
              RNG &amp; Game Ledger
            </span>
            <span className="text-xs text-slate-400">Cryptographically Seeded Results</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            CoinFlip Game History
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Audit every toss, verify multiplier payouts, monitor player streaks, and verify system house edge margin.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadGames}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition disabled:opacity-50"
          >
            <span className={loading ? "animate-spin" : ""}>↻</span>
            <span>{loading ? "Refreshing..." : "Refresh Games"}</span>
          </button>
        </div>
      </div>

      {/* KPI METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20">
          <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Total Volume Wagered</span>
          <div className="text-2xl font-black text-purple-300 mt-1">
            {money(stats.totalEntry)}
          </div>
          <p className="text-xs text-slate-400 mt-1">{stats.totalRounds} total coin tosses</p>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Total Paid Winnings</span>
          <div className="text-2xl font-black text-emerald-300 mt-1">
            {money(stats.totalPayout)}
          </div>
          <p className="text-xs text-slate-400 mt-1">{stats.wonCount} won rounds</p>
        </div>

        <div className="p-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/20">
          <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider">Net House Margin</span>
          <div className={`text-2xl font-black mt-1 ${stats.netHouseMargin >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {money(stats.netHouseMargin)}
          </div>
          <p className="text-xs text-slate-400 mt-1">Platform gross gaming revenue</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Player Win Rate</span>
          <div className="text-2xl font-black text-white mt-1">
            {stats.winRate}%
          </div>
          <p className="text-xs text-slate-400 mt-1">{stats.wonCount} Won / {stats.lostCount} Lost</p>
        </div>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Bar */}
        <div className="relative w-full md:w-96">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Search by Player, Email, Round ID, Bet amount..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-yellow-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setOutcomeFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                outcomeFilter === "all" ? "bg-yellow-500 text-black shadow" : "text-slate-400 hover:text-white"
              }`}
            >
              All Rounds ({games.length})
            </button>
            <button
              onClick={() => setOutcomeFilter("won")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                outcomeFilter === "won" ? "bg-emerald-500 text-black shadow" : "text-slate-400 hover:text-white"
              }`}
            >
              Won ({stats.wonCount})
            </button>
            <button
              onClick={() => setOutcomeFilter("lost")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                outcomeFilter === "lost" ? "bg-red-500 text-white shadow" : "text-slate-400 hover:text-white"
              }`}
            >
              Lost ({stats.lostCount})
            </button>
          </div>

          <button
            onClick={() => setHighRollerOnly(!highRollerOnly)}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
              highRollerOnly
                ? "bg-purple-500 text-white border-purple-400 shadow-md shadow-purple-500/20"
                : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
            }`}
          >
            💎 High Rollers (&gt;= ₹500)
          </button>
        </div>
      </div>

      {/* GAMES TABLE */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Player Details</th>
                <th className="py-3.5 px-4">Bet Wagered</th>
                <th className="py-3.5 px-4">Choice vs Result</th>
                <th className="py-3.5 px-4">Multiplier &amp; Payout</th>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4 text-right">Round Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    <div className="inline-block animate-spin text-xl mb-2">↻</div>
                    <div>Loading game logs...</div>
                  </td>
                </tr>
              ) : filteredGames.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-500">
                    No game rounds match your filters.
                  </td>
                </tr>
              ) : (
                filteredGames.map((game) => {
                  const isWon = game.status === "won";
                  const isHighRoller = Number(game.entryFee || 0) >= 500;

                  return (
                    <tr key={game._id} className="hover:bg-slate-800/40 transition">
                      {/* Player */}
                      <td className="py-4 px-4">
                        <div className="font-bold text-white text-sm">{game.user?.name || "Anonymous Player"}</div>
                        <div className="text-[11px] text-slate-400">{game.user?.email || "No email"}</div>
                        <div className="text-[10px] font-mono text-slate-500 mt-0.5">Round: {game._id}</div>
                      </td>

                      {/* Bet */}
                      <td className="py-4 px-4">
                        <div className="font-black text-white text-base">{money(game.entryFee)}</div>
                        {isHighRoller && (
                          <span className="inline-block px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[9px] font-black uppercase mt-1">
                            💎 High Stake
                          </span>
                        )}
                      </td>

                      {/* Choice vs Result */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <div className="text-center">
                            <span className="text-[10px] text-slate-400 block uppercase">Pick</span>
                            <span className="font-bold text-slate-200">
                              {game.prediction === "heads" ? "🟡 Heads" : "🔵 Tails"}
                            </span>
                          </div>
                          <span className="text-slate-500 font-bold">➔</span>
                          <div className="text-center">
                            <span className="text-[10px] text-slate-400 block uppercase">Outcome</span>
                            <span className="font-bold text-yellow-400">
                              {game.result === "heads" ? "🟡 Heads" : "🔵 Tails"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Multiplier & Payout */}
                      <td className="py-4 px-4">
                        <div className="font-bold text-slate-300 text-xs">
                          {game.payoutMultiplier || 2}x Payout
                        </div>
                        <div className={`font-black text-sm mt-0.5 ${isWon ? "text-emerald-400" : "text-slate-500 line-through"}`}>
                          {isWon ? `+${money(game.winAmount)}` : `-${money(game.entryFee)}`}
                        </div>
                      </td>

                      {/* Timestamp */}
                      <td className="py-4 px-4 text-slate-400">
                        <div>{formatDate(game.createdAt)}</div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 text-right">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase ${
                            isWon
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : "bg-red-500/15 text-red-400 border border-red-500/30"
                          }`}
                        >
                          {isWon ? "WIN" : "LOSS"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Showing {filteredGames.length} of {games.length} total coin tosses</span>
          <button onClick={loadGames} className="text-yellow-400 hover:underline font-bold">
            Sync Latest Data
          </button>
        </div>
      </div>
    </div>
  );
}
