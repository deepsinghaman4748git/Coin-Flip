"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { authFetch } from "../../lib/clientAuth";

const RUPEE = "₹";

export default function AdminWithdrawsPage() {
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [copiedText, setCopiedText] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  // Modals
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);
  const [payoutReference, setPayoutReference] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  function showToast(msg) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4000);
  }

  async function loadWithdrawals() {
    try {
      setLoading(true);
      const response = await authFetch("/api/admin/withdraws", { cache: "no-store" });
      const data = await response.json();
      if (data.success) {
        setWithdrawals(data.withdrawals || []);
      } else {
        showToast(data.message || "Failed to load withdrawals");
      }
    } catch (error) {
      console.error("Withdrawal loading error:", error);
      showToast("Error connecting to withdrawals API");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWithdrawals();
  }, []);

  // OPEN APPROVE MODAL
  function openApproveModal(tx) {
    setSelectedTx(tx);
    setPayoutReference("");
    setApproveModalOpen(true);
  }

  // SUBMIT APPROVAL
  async function handleApproveSubmit() {
    if (!selectedTx) return;

    try {
      setProcessingId(selectedTx._id);
      const response = await authFetch("/api/admin/withdraws/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedTx._id,
          reference: payoutReference || undefined,
        }),
      });

      const data = await response.json();
      if (data.success) {
        showToast("✅ Withdrawal marked as Completed / Dispatched!");
        setApproveModalOpen(false);
        setSelectedTx(null);
        await loadWithdrawals();
      } else {
        alert(data.message || "Failed to approve withdrawal");
      }
    } catch (error) {
      console.error("Approve error:", error);
      alert("Error approving withdrawal");
    } finally {
      setProcessingId(null);
    }
  }

  // OPEN REJECT MODAL
  function openRejectModal(tx) {
    setSelectedTx(tx);
    setRejectionReason("Incorrect UPI ID / Bank Details - Amount Refunded to Wallet");
    setRejectModalOpen(true);
  }

  // SUBMIT REJECTION
  async function handleRejectSubmit() {
    if (!selectedTx) return;

    try {
      setProcessingId(selectedTx._id);
      const response = await authFetch("/api/admin/withdraws/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedTx._id,
          reason: rejectionReason || "Rejected by admin",
        }),
      });

      const data = await response.json();
      if (data.success) {
        showToast("🔄 Withdrawal rejected & amount refunded back to player wallet.");
        setRejectModalOpen(false);
        setSelectedTx(null);
        await loadWithdrawals();
      } else {
        alert(data.message || "Failed to reject withdrawal");
      }
    } catch (error) {
      console.error("Reject error:", error);
      alert("Error rejecting withdrawal");
    } finally {
      setProcessingId(null);
    }
  }

  function handleCopy(text) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(""), 2000);
  }

  // Statistics
  const stats = useMemo(() => {
    let pendingCount = 0;
    let pendingSum = 0;
    let approvedCount = 0;
    let approvedSum = 0;
    let rejectedCount = 0;

    withdrawals.forEach((w) => {
      const amt = Number(w.amount || 0);
      if (w.status === "pending") {
        pendingCount++;
        pendingSum += amt;
      } else if (w.status === "approved" || w.status === "completed") {
        approvedCount++;
        approvedSum += amt;
      } else if (w.status === "rejected") {
        rejectedCount++;
      }
    });

    return {
      pendingCount,
      pendingSum,
      approvedCount,
      approvedSum,
      rejectedCount,
      totalCount: withdrawals.length,
    };
  }, [withdrawals]);

  // Filtered list
  const filteredWithdrawals = useMemo(() => {
    return withdrawals.filter((w) => {
      if (statusFilter !== "all") {
        if (statusFilter === "approved" && w.status !== "approved" && w.status !== "completed") return false;
        if (statusFilter === "pending" && w.status !== "pending") return false;
        if (statusFilter === "rejected" && w.status !== "rejected") return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const userName = (w.user?.name || "").toLowerCase();
        const userEmail = (w.user?.email || "").toLowerCase();
        const upi = (w.upiId || "").toLowerCase();
        const bank = (w.bankAccount || "").toLowerCase();
        const ifsc = (w.ifscCode || "").toLowerCase();
        const amt = String(w.amount || "");

        if (
          !userName.includes(q) &&
          !userEmail.includes(q) &&
          !upi.includes(q) &&
          !bank.includes(q) &&
          !ifsc.includes(q) &&
          !amt.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [withdrawals, statusFilter, searchQuery]);

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
            <span className="px-2 py-0.5 rounded text-[11px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30">
              Payouts Outward
            </span>
            <span className="text-xs text-slate-400">Player Wallet Disbursements</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Withdrawal Settlements Portal
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Dispatch bank transfers &amp; UPI payouts to verified players securely with complete audit trail.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadWithdrawals}
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
          <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Awaiting Payout</span>
          <div className="text-2xl font-black text-amber-300 mt-1">
            {stats.pendingCount} requests
          </div>
          <p className="text-xs text-slate-400 mt-1">Total pending: {money(stats.pendingSum)}</p>
        </div>

        <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20">
          <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Total Dispatched Out</span>
          <div className="text-2xl font-black text-blue-300 mt-1">
            {money(stats.approvedSum)}
          </div>
          <p className="text-xs text-slate-400 mt-1">{stats.approvedCount} payouts fulfilled</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Rejected / Refunded</span>
          <div className="text-2xl font-black text-red-400 mt-1">
            {stats.rejectedCount}
          </div>
          <p className="text-xs text-slate-400 mt-1">Funds safely returned to player wallets</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">All-Time Requests</span>
          <div className="text-2xl font-black text-white mt-1">
            {stats.totalCount}
          </div>
          <p className="text-xs text-slate-400 mt-1">Total withdrawal requests recorded</p>
        </div>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Bar */}
        <div className="relative w-full md:w-96">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Search by User, UPI ID, Bank Acc, IFSC..."
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
            { id: "all", label: "All Payouts", count: withdrawals.length },
            { id: "pending", label: "Pending", count: stats.pendingCount },
            { id: "approved", label: "Completed", count: stats.approvedCount },
            { id: "rejected", label: "Rejected / Refunded", count: stats.rejectedCount },
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

      {/* WITHDRAWALS TABLE */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Player Details</th>
                <th className="py-3.5 px-4">Payout Amount</th>
                <th className="py-3.5 px-4">Destination Credentials</th>
                <th className="py-3.5 px-4">Requested At</th>
                <th className="py-3.5 px-4">Status &amp; Ref</th>
                <th className="py-3.5 px-4 text-right">Settlement Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    <div className="inline-block animate-spin text-xl mb-2">↻</div>
                    <div>Loading withdrawal requests...</div>
                  </td>
                </tr>
              ) : filteredWithdrawals.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-500">
                    No withdrawal requests match your search filter.
                  </td>
                </tr>
              ) : (
                filteredWithdrawals.map((item) => {
                  const isHighValue = Number(item.amount || 0) >= 5000;
                  const paymentTarget = item.upiId || item.bankAccount || item.accountNumber || "N/A";

                  return (
                    <tr key={item._id} className="hover:bg-slate-800/40 transition">
                      {/* User Details */}
                      <td className="py-4 px-4">
                        <div className="font-bold text-white text-sm">{item.user?.name || "Player"}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{item.user?.email || "No email"}</div>
                        <div className="text-[10px] font-mono text-slate-500 mt-0.5">ID: {item.user?._id || item.user}</div>
                      </td>

                      {/* Amount */}
                      <td className="py-4 px-4">
                        <div className="font-black text-amber-400 text-base">{money(item.amount)}</div>
                        {isHighValue && (
                          <span className="inline-block px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-black uppercase mt-1">
                            🚨 High Value
                          </span>
                        )}
                      </td>

                      {/* Destination Details */}
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          {item.upiId ? (
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-slate-400 uppercase">UPI:</span>
                              <span className="font-mono text-slate-200 bg-slate-950 px-2 py-0.5 rounded border border-slate-700">
                                {item.upiId}
                              </span>
                              <button
                                onClick={() => handleCopy(item.upiId)}
                                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                                title="Copy UPI"
                              >
                                {copiedText === item.upiId ? "✓" : "📋"}
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">A/C:</span>
                                <span className="font-mono text-slate-200 bg-slate-950 px-2 py-0.5 rounded border border-slate-700">
                                  {item.bankAccount || item.accountNumber || "N/A"}
                                </span>
                                <button
                                  onClick={() => handleCopy(item.bankAccount || item.accountNumber)}
                                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                                  title="Copy Account"
                                >
                                  {copiedText === (item.bankAccount || item.accountNumber) ? "✓" : "📋"}
                                </button>
                              </div>
                              {item.ifscCode && (
                                <div className="text-[11px] font-mono text-slate-400">
                                  IFSC: <span className="text-slate-300 font-bold">{item.ifscCode}</span>
                                </div>
                              )}
                              {item.bankName && (
                                <div className="text-[10px] text-slate-500">Bank: {item.bankName}</div>
                              )}
                            </div>
                          )}
                        </div>
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

                      {/* Actions */}
                      <td className="py-4 px-4 text-right">
                        {item.status === "pending" ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openApproveModal(item)}
                              disabled={processingId === item._id}
                              className="px-3 py-1.5 rounded-xl bg-blue-500 text-white font-extrabold text-xs hover:bg-blue-400 transition shadow-sm disabled:opacity-50"
                            >
                              Send Payout ✓
                            </button>
                            <button
                              onClick={() => openRejectModal(item)}
                              disabled={processingId === item._id}
                              className="px-3 py-1.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/30 font-bold text-xs hover:bg-red-500 hover:text-white transition disabled:opacity-50"
                            >
                              Reject &amp; Refund
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-xs font-semibold">Settled</span>
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
          <span>Showing {filteredWithdrawals.length} of {withdrawals.length} total withdrawal records</span>
          <button onClick={loadWithdrawals} className="text-yellow-400 hover:underline font-bold">
            Sync Latest Data
          </button>
        </div>
      </div>

      {/* APPROVE / DISPATCH PAYOUT MODAL */}
      {approveModalOpen && selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>🏦</span> Confirm Payout Settlement
              </h3>
              <button
                onClick={() => setApproveModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Player:</span>
                <span className="text-white font-bold">{selectedTx.user?.name || "Player"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Amount to Transfer:</span>
                <span className="text-amber-400 font-black text-sm">{money(selectedTx.amount)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Destination:</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-yellow-400 font-mono font-bold">
                    {selectedTx.upiId || selectedTx.bankAccount || "N/A"}
                  </span>
                  <button
                    onClick={() => handleCopy(selectedTx.upiId || selectedTx.bankAccount)}
                    className="text-xs bg-slate-800 px-1.5 py-0.5 rounded text-slate-300"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">
                Banking UTR / Reference ID (Optional, shown in player passbook):
              </label>
              <input
                type="text"
                value={payoutReference}
                onChange={(e) => setPayoutReference(e.target.value)}
                placeholder="e.g. 423985123901 or IMPS12903"
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setApproveModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApproveSubmit}
                disabled={processingId === selectedTx._id}
                className="px-4 py-2 rounded-xl bg-blue-500 text-white font-bold text-xs hover:bg-blue-400 transition shadow-lg shadow-blue-500/20 disabled:opacity-50"
              >
                {processingId === selectedTx._id ? "Processing..." : "Confirm & Mark Dispatched"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT & REFUND MODAL */}
      {rejectModalOpen && selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>🔄</span> Reject &amp; Refund Withdrawal
              </h3>
              <button
                onClick={() => setRejectModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300">
              💡 <strong>Automatic Wallet Refund:</strong> Rejecting this request will immediately credit{" "}
              <strong>{money(selectedTx.amount)}</strong> back into {selectedTx.user?.name || "the player"}&apos;s wallet balance.
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300">
                Reason for Rejection:
              </label>

              <div className="space-y-1.5">
                {[
                  "Incorrect UPI ID / Bank Details - Please re-enter correct details",
                  "Bank server temporarily unavailable - please try again later",
                  "Suspicious betting pattern / Account under review",
                  "Exceeded daily withdrawal limit threshold",
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
                {processingId === selectedTx._id ? "Processing..." : "Confirm & Refund"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
