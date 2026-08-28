"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { authFetch, safeJson } from "../../lib/clientAuth";

const RUPEE = "₹";

export default function AdminDepositsPage() {
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [copiedUtr, setCopiedUtr] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  // Rejection modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Approval with manual bonus modal
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [selectedApproveTx, setSelectedApproveTx] = useState(null);
  const [grantBonus, setGrantBonus] = useState(false);
  const [bonusAmount, setBonusAmount] = useState("");
  const [bonusNote, setBonusNote] = useState("");

  // Screenshot viewer modal
  const [screenshotModalOpen, setScreenshotModalOpen] = useState(false);
  const [selectedScreenshotTx, setSelectedScreenshotTx] = useState(null);

  function showToast(msg) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4000);
  }

  async function loadDeposits() {
    try {
      setLoading(true);
      const response = await authFetch("/api/admin/deposits", { cache: "no-store" });
      const data = await safeJson(response);
      if (data?.success) {
        setDeposits(data.deposits || []);
      } else {
        showToast(data?.message || "Failed to load deposits");
      }
    } catch (error) {
      console.error("Deposit loading error:", error);
      showToast("Error connecting to deposits API");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDeposits();
  }, []);

  // OPEN APPROVE MODAL
  function openApproveModal(tx) {
    setSelectedApproveTx(tx);
    const amt = Number(tx.amount || 0);
    // Default to grantBonus true with 100% match if first deposit, but let admin decide!
    const isEligible = !tx.user?.hasClaimedWelcomeBonus && !tx.user?.firstDepositDone;
    setGrantBonus(isEligible);
    setBonusAmount(isEligible ? String(amt) : "0");
    setBonusNote(isEligible ? `100% First Deposit Bonus on ₹${amt}` : "Admin Manual Bonus");
    setApproveModalOpen(true);
  }

  // SUBMIT APPROVE DEPOSIT WITH OPTIONAL MANUAL BONUS
  async function handleApproveSubmit() {
    if (!selectedApproveTx) return;

    try {
      setProcessingId(selectedApproveTx._id);
      const payload = {
        transactionId: selectedApproveTx._id,
        grantBonus: Boolean(grantBonus),
        bonusAmount: grantBonus ? Number(bonusAmount || 0) : 0,
        bonusNote: bonusNote || "Admin manual approval",
      };

      const response = await authFetch("/api/admin/deposits/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await safeJson(response);
      if (data?.success) {
        showToast(data.message || "✅ Deposit approved successfully!");
        setApproveModalOpen(false);
        setSelectedApproveTx(null);
        await loadDeposits();
      } else {
        alert(data?.message || "Failed to approve deposit");
      }
    } catch (error) {
      console.error("Approve error:", error);
      alert("Error approving deposit");
    } finally {
      setProcessingId(null);
    }
  }

  // OPEN REJECT MODAL
  function openRejectModal(tx) {
    setSelectedTx(tx);
    setRejectionReason("UTR / Transaction Reference does not match platform bank account");
    setRejectModalOpen(true);
  }

  // SUBMIT REJECTION
  async function handleRejectSubmit() {
    if (!selectedTx) return;

    try {
      setProcessingId(selectedTx._id);
      const response = await authFetch("/api/admin/deposits/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionId: selectedTx._id,
          reason: rejectionReason || "Rejected by admin",
        }),
      });

      const data = await safeJson(response);
      if (data?.success) {
        showToast("❌ Deposit rejected successfully.");
        setRejectModalOpen(false);
        setSelectedTx(null);
        await loadDeposits();
      } else {
        alert(data?.message || "Failed to reject deposit");
      }
    } catch (error) {
      console.error("Reject error:", error);
      alert("Error rejecting deposit");
    } finally {
      setProcessingId(null);
    }
  }

  function handleCopy(text) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedUtr(text);
    setTimeout(() => setCopiedUtr(""), 2000);
  }

  // Calculate statistics
  const stats = useMemo(() => {
    let pendingCount = 0;
    let pendingSum = 0;
    let approvedCount = 0;
    let approvedSum = 0;
    let rejectedCount = 0;

    // Detect duplicate UTRs
    const utrCounts = {};

    deposits.forEach((d) => {
      const amt = Number(d.amount || 0);
      if (d.status === "pending") {
        pendingCount++;
        pendingSum += amt;
      } else if (d.status === "approved" || d.status === "completed") {
        approvedCount++;
        approvedSum += amt;
      } else if (d.status === "rejected") {
        rejectedCount++;
      }

      if (d.utr) {
        utrCounts[d.utr] = (utrCounts[d.utr] || 0) + 1;
      }
    });

    return {
      pendingCount,
      pendingSum,
      approvedCount,
      approvedSum,
      rejectedCount,
      totalCount: deposits.length,
      utrCounts,
    };
  }, [deposits]);

  // Filtered deposits
  const filteredDeposits = useMemo(() => {
    return deposits.filter((d) => {
      // Status filter
      if (statusFilter !== "all") {
        if (statusFilter === "approved" && d.status !== "approved" && d.status !== "completed") return false;
        if (statusFilter === "pending" && d.status !== "pending") return false;
        if (statusFilter === "rejected" && d.status !== "rejected") return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const userName = (d.user?.name || "").toLowerCase();
        const userEmail = (d.user?.email || "").toLowerCase();
        const utr = (d.utr || "").toLowerCase();
        const amount = String(d.amount || "");

        if (!userName.includes(q) && !userEmail.includes(q) && !utr.includes(q) && !amount.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [deposits, statusFilter, searchQuery]);

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
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl bg-slate-900 text-white border border-yellow-500/50 shadow-2xl shadow-yellow-500/20 text-sm font-bold flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[11px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Payments Inward
            </span>
            <span className="text-xs text-slate-400">Automated &amp; Manual Verification</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Deposit Requests Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Verify UPI UTR 12-digit transaction numbers, approve credits, and prevent duplicate receipt fraud.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadDeposits}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition disabled:opacity-50"
          >
            <span className={loading ? "animate-spin" : ""}>↻</span>
            <span>{loading ? "Refreshing..." : "Refresh Records"}</span>
          </button>
        </div>
      </div>

      {/* KPI METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
          <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Awaiting Verification</span>
          <div className="text-2xl font-black text-amber-300 mt-1">
            {stats.pendingCount} requests
          </div>
          <p className="text-xs text-slate-400 mt-1">Total pending: {money(stats.pendingSum)}</p>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Total Approved Inward</span>
          <div className="text-2xl font-black text-emerald-300 mt-1">
            {money(stats.approvedSum)}
          </div>
          <p className="text-xs text-slate-400 mt-1">{stats.approvedCount} deposits approved</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Rejected</span>
          <div className="text-2xl font-black text-red-400 mt-1">
            {stats.rejectedCount}
          </div>
          <p className="text-xs text-slate-400 mt-1">Invalid or duplicate references</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">All-Time Requests</span>
          <div className="text-2xl font-black text-white mt-1">
            {stats.totalCount}
          </div>
          <p className="text-xs text-slate-400 mt-1">Total deposit logs recorded</p>
        </div>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Bar */}
        <div className="relative w-full md:w-96">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Search by UTR, User Name, Email..."
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
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 w-full md:w-auto overflow-x-auto">
          {[
            { id: "all", label: "All Records", count: deposits.length },
            { id: "pending", label: "Pending", count: stats.pendingCount },
            { id: "approved", label: "Approved", count: stats.approvedCount },
            { id: "rejected", label: "Rejected", count: stats.rejectedCount },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 ${
                statusFilter === tab.id
                  ? "bg-yellow-500 text-black shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      </div>

      {/* DEPOSITS TABLE */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Player Details</th>
                <th className="py-3.5 px-4">Deposit Amount</th>
                <th className="py-3.5 px-4">12-Digit UTR / Reference</th>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Status &amp; Notes</th>
                <th className="py-3.5 px-4 text-right">Verification Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    <div className="inline-block animate-spin text-xl mb-2">↻</div>
                    <div>Loading deposit transactions...</div>
                  </td>
                </tr>
              ) : filteredDeposits.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-500">
                    No deposit transactions match your search filter.
                  </td>
                </tr>
              ) : (
                filteredDeposits.map((item, idx) => {
                  const isDuplicateUTR = item.utr && stats.utrCounts[item.utr] > 1;

                  return (
                    <tr key={item._id || item.id || `deposit-${idx}-${item.createdAt || ""}`} className="hover:bg-slate-800/40 transition">
                      {/* User details */}
                      <td className="py-4 px-4">
                        <div className="font-bold text-white text-sm">{item.user?.name || "Anonymous Player"}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{item.user?.email || "No email"}</div>
                        <div className="text-[10px] font-mono text-slate-500 mt-0.5">ID: {item.user?._id || item.user}</div>
                      </td>

                      {/* Amount */}
                      <td className="py-4 px-4">
                        <div className="font-black text-emerald-400 text-base">{money(item.amount)}</div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">UPI Transfer</span>
                      </td>

                      {/* UTR */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-200 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-700 text-xs">
                            {item.utr || "N/A"}
                          </span>
                          {item.utr && (
                            <button
                              onClick={() => handleCopy(item.utr)}
                              title="Copy UTR"
                              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                            >
                              {copiedUtr === item.utr ? "✓" : "📋"}
                            </button>
                          )}
                        </div>

                        {/* Duplicate Alert */}
                        {isDuplicateUTR && (
                          <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-bold">
                            ⚠️ Duplicate UTR Detected ({stats.utrCounts[item.utr]}x)
                          </div>
                        )}

                        {/* Payment Screenshot Thumbnail / Button */}
                        {item.screenshot ? (
                          <div className="mt-2 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedScreenshotTx(item);
                                setScreenshotModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-yellow-500/15 hover:bg-yellow-500/25 border border-yellow-500/30 text-yellow-300 font-bold text-[11px] transition"
                            >
                              <span>🖼️</span>
                              <span>View Receipt</span>
                            </button>
                          </div>
                        ) : (
                          <div className="mt-1 text-[10px] text-slate-500">
                            No receipt attached
                          </div>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-4 px-4 text-slate-400">
                        <div>{formatDate(item.createdAt)}</div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        <div>
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-extrabold capitalize ${
                              item.status === "approved" || item.status === "completed"
                                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                : item.status === "pending"
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse"
                                : "bg-red-500/15 text-red-400 border border-red-500/30"
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>
                        {item.adminNote && (
                          <p className="text-[11px] text-slate-400 mt-1 max-w-xs truncate" title={item.adminNote}>
                            Note: {item.adminNote}
                          </p>
                        )}
                      </td>

                      {/* Action buttons */}
                      <td className="py-4 px-4 text-right">
                        {item.status === "pending" ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openApproveModal(item)}
                              disabled={processingId === item._id}
                              className="px-3 py-1.5 rounded-xl bg-emerald-500 text-black font-extrabold text-xs hover:bg-emerald-400 transition shadow-sm disabled:opacity-50"
                            >
                              {processingId === item._id ? "Processing..." : "Approve ✓"}
                            </button>
                            <button
                              onClick={() => openRejectModal(item)}
                              disabled={processingId === item._id}
                              className="px-3 py-1.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/30 font-bold text-xs hover:bg-red-500 hover:text-white transition disabled:opacity-50"
                            >
                              Reject ✕
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-xs font-semibold">Processed</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Showing {filteredDeposits.length} of {deposits.length} total deposit requests</span>
          <button onClick={loadDeposits} className="text-yellow-400 hover:underline font-bold">
            Sync Latest Data
          </button>
        </div>
      </div>

      {/* APPROVE DEPOSIT WITH MANUAL BONUS MODAL */}
      {approveModalOpen && selectedApproveTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>✅</span> Approve Deposit &amp; Grant Manual Bonus
              </h3>
              <button
                onClick={() => setApproveModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {/* User & Deposit Summary */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Player:</span>
                <span className="text-white font-bold text-sm">{selectedApproveTx.user?.name || "Player"} ({selectedApproveTx.user?.email || "No email"})</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Deposit Amount:</span>
                <span className="text-emerald-400 font-black text-sm">{money(selectedApproveTx.amount)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">12-Digit UTR:</span>
                <span className="text-yellow-400 font-mono font-bold select-all">{selectedApproveTx.utr || "N/A"}</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-slate-800/80">
                <span className="text-slate-400">Welcome Bonus Eligibility:</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  !selectedApproveTx.user?.hasClaimedWelcomeBonus && !selectedApproveTx.user?.firstDepositDone
                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                    : "bg-slate-800 text-slate-400"
                }`}>
                  {!selectedApproveTx.user?.hasClaimedWelcomeBonus && !selectedApproveTx.user?.firstDepositDone
                    ? "🎁 Eligible (1st Time New User)"
                    : "🔒 Ineligible (Repeat / Already Claimed)"}
                </span>
              </div>
            </div>

            {/* Manual Bonus Controls */}
            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/25 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-purple-200 flex items-center gap-1.5">
                    <span>🎁</span> 100% Welcome Bonus / Manual Bonus
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {!selectedApproveTx.user?.hasClaimedWelcomeBonus && !selectedApproveTx.user?.firstDepositDone
                      ? "New user ki pehli deposit par 100% welcome match bonus."
                      : "Repeat user: Welcome bonus sirf new users ke 1st deposit ke liye hota hai."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !grantBonus;
                    setGrantBonus(next);
                    if (next && (!bonusAmount || bonusAmount === "0")) {
                      setBonusAmount(String(selectedApproveTx.amount || 0));
                    }
                  }}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition focus:outline-none ${
                    grantBonus ? "bg-purple-500 shadow-md shadow-purple-500/30" : "bg-slate-800 border border-slate-700"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                      grantBonus ? "left-5" : "left-0.5"
                    }`}
                  />
                </button>
              </div>

              {grantBonus && (
                <div className="space-y-3 pt-2 border-t border-purple-500/20">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-300">
                        Bonus Amount (₹):
                      </label>
                      <span className="text-[10px] text-purple-300 font-semibold">
                        Wallet Credit = Deposit ({money(selectedApproveTx.amount)}) + Bonus ({money(bonusAmount)})
                      </span>
                    </div>

                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                        ₹
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={bonusAmount}
                        onChange={(e) => setBonusAmount(e.target.value)}
                        placeholder="e.g. 100"
                        className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-slate-950 border border-purple-500/40 text-white font-bold text-sm focus:outline-none focus:border-purple-400"
                      />
                    </div>
                  </div>

                  {/* Preset Percentages Buttons */}
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 block mb-1.5">Quick Presets:</span>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: "100% Match (2X)", calc: (amt) => amt },
                        { label: "50% Bonus", calc: (amt) => Math.round(amt * 0.5) },
                        { label: "200% Bonus (3X)", calc: (amt) => amt * 2 },
                        { label: "+₹50 Flat", calc: () => 50 },
                        { label: "+₹100 Flat", calc: () => 100 },
                      ].map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            const val = preset.calc(Number(selectedApproveTx.amount || 0));
                            setBonusAmount(String(val));
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-950 border border-purple-500/30 text-purple-200 hover:bg-purple-500/20 transition"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">
                      Bonus Reason / Audit Note:
                    </label>
                    <input
                      type="text"
                      value={bonusNote}
                      onChange={(e) => setBonusNote(e.target.value)}
                      placeholder="e.g. 100% Instant First Deposit Bonus"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-purple-400"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Total Calculation Display */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-300 font-bold">Total Amount to Credit Player Wallet:</span>
              <span className="text-emerald-400 font-black text-base">
                {money(Number(selectedApproveTx.amount || 0) + (grantBonus ? Number(bonusAmount || 0) : 0))}
              </span>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setApproveModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApproveSubmit}
                disabled={processingId === selectedApproveTx._id}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs transition shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                {processingId === selectedApproveTx._id
                  ? "Processing..."
                  : `Confirm & Credit ${money(Number(selectedApproveTx.amount || 0) + (grantBonus ? Number(bonusAmount || 0) : 0))} ✓`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECTION REASON MODAL */}
      {rejectModalOpen && selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>❌</span> Reject Deposit Request
              </h3>
              <button
                onClick={() => setRejectModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Player:</span>
                <span className="text-white font-bold">{selectedTx.user?.name || "Player"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Amount:</span>
                <span className="text-emerald-400 font-bold">{money(selectedTx.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">UTR:</span>
                <span className="text-yellow-400 font-mono font-bold">{selectedTx.utr || "N/A"}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300">
                Reason for Rejection (Visible in transaction history):
              </label>

              {/* Quick Select Buttons */}
              <div className="space-y-1.5">
                {[
                  "UTR / Transaction Reference does not match platform bank account",
                  "Payment amount received does not match deposit request",
                  "Duplicate UTR submitted (Already claimed)",
                  "Fake or altered payment screenshot / UTR",
                ].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setRejectionReason(reason)}
                    className={`w-full text-left p-2 rounded-lg text-[11px] font-medium border transition ${
                      rejectionReason === reason
                        ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-300"
                        : "bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    • {reason}
                  </button>
                ))}
              </div>

              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter custom rejection reason..."
                rows="2"
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-red-500 mt-2"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRejectModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectSubmit}
                disabled={processingId === selectedTx._id}
                className="px-4 py-2 rounded-xl bg-red-500 text-white font-bold text-xs hover:bg-red-400 transition shadow-lg shadow-red-500/20 disabled:opacity-50"
              >
                {processingId === selectedTx._id ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT SCREENSHOT VIEWER MODAL */}
      {screenshotModalOpen && selectedScreenshotTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <span>🧾</span> Payment Receipt Screenshot
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Player: <span className="text-white font-bold">{selectedScreenshotTx.user?.name || "Player"}</span> • Amount: <span className="text-emerald-400 font-bold">{money(selectedScreenshotTx.amount)}</span> • UTR: <span className="font-mono text-yellow-400 font-bold">{selectedScreenshotTx.utr}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setScreenshotModalOpen(false);
                  setSelectedScreenshotTx(null);
                }}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex items-center justify-center bg-black/50">
              {selectedScreenshotTx.screenshot ? (
                <img
                  src={selectedScreenshotTx.screenshot}
                  alt="Payment Screenshot Receipt"
                  className="max-h-[60vh] max-w-full rounded-xl object-contain border border-slate-800 shadow-2xl"
                />
              ) : (
                <div className="py-12 text-slate-500 text-sm font-semibold">
                  No image attached for this deposit.
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-400">
                <span>💡 Tip: Verify recipient UPI ID and 12-digit UTR against your bank app.</span>
              </div>
              <div className="flex items-center gap-2">
                {selectedScreenshotTx.status === "pending" && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setScreenshotModalOpen(false);
                        openApproveModal(selectedScreenshotTx);
                      }}
                      className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold transition"
                    >
                      Approve Deposit & Bonus ✓
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setScreenshotModalOpen(false);
                        openRejectModal(selectedScreenshotTx);
                      }}
                      className="px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white border border-red-500/40 font-bold transition"
                    >
                      Reject ✕
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setScreenshotModalOpen(false);
                    setSelectedScreenshotTx(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
