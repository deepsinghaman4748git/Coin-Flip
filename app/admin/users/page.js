"use client";

import { useEffect, useState, useMemo } from "react";
import { authFetch } from "../../lib/clientAuth";

const RUPEE = "₹";

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [toastMessage, setToastMessage] = useState("");
  const [actionProcessing, setActionProcessing] = useState(null);

  // Balance adjustment modal
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [adjustType, setAdjustType] = useState("credit");
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustNote, setAdjustNote] = useState("");

  // Ban modal
  const [banModalOpen, setBanModalOpen] = useState(false);
  const [banReason, setBanReason] = useState("");

  // Linked UPI Management Modal
  const [upiModalOpen, setUpiModalOpen] = useState(false);
  const [upiInput, setUpiInput] = useState("");
  const [upiLockState, setUpiLockState] = useState(true);

  // Password Reset Modal
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [newPasswordInput, setNewPasswordInput] = useState("");

  function showToast(msg) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4000);
  }

  async function loadUsers() {
    try {
      setLoading(true);
      setError("");
      const response = await authFetch("/api/admin/users", { cache: "no-store" });
      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || "Unable to load users");
        return;
      }

      setUsers(data.users || []);
    } catch (err) {
      console.error("Users loading error:", err);
      setError("Unable to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  // OPEN BALANCE ADJUST MODAL
  function openBalanceModal(user) {
    setSelectedUser(user);
    setAdjustType("credit");
    setAdjustAmount("");
    setAdjustNote("Admin Manual Balance Credit");
    setAdjustModalOpen(true);
  }

  // SUBMIT BALANCE ADJUST
  async function handleBalanceSubmit() {
    if (!selectedUser) return;
    const amt = Number(adjustAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    try {
      setActionProcessing(selectedUser._id);
      const endpointAction = adjustType === "bonus" ? "grant_bonus" : "adjust_balance";
      const payload = adjustType === "bonus"
        ? {
            action: "grant_bonus",
            userId: selectedUser._id,
            amount: amt,
            note: adjustNote || "Admin Manual Bonus Grant",
          }
        : {
            action: "adjust_balance",
            userId: selectedUser._id,
            amount: amt,
            type: adjustType,
            note: adjustNote || `Admin manual ${adjustType}`,
          };

      const res = await authFetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        showToast(data.message || `✅ Wallet updated successfully!`);
        setAdjustModalOpen(false);
        setSelectedUser(null);
        await loadUsers();
      } else {
        alert(data.message || "Failed to adjust balance");
      }
    } catch (e) {
      alert("Error adjusting user balance");
    } finally {
      setActionProcessing(null);
    }
  }

  // OPEN BAN MODAL
  function openBanModal(user) {
    setSelectedUser(user);
    setBanReason(user.isBanned ? "" : "Suspicious Activity / Terms Violation");
    setBanModalOpen(true);
  }

  // SUBMIT TOGGLE BAN
  async function handleBanSubmit() {
    if (!selectedUser) return;

    try {
      setActionProcessing(selectedUser._id);
      const res = await authFetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_ban",
          userId: selectedUser._id,
          reason: banReason,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(data.message || "User status updated");
        setBanModalOpen(false);
        setSelectedUser(null);
        await loadUsers();
      } else {
        alert(data.message || "Failed to update ban status");
      }
    } catch (e) {
      alert("Error updating user status");
    } finally {
      setActionProcessing(null);
    }
  }

  // TOGGLE ROLE
  async function toggleUserRole(user) {
    const newRole = user.role === "admin" ? "user" : "admin";
    if (!window.confirm(`Change ${user.name}'s role to ${newRole.toUpperCase()}?`)) return;

    try {
      setActionProcessing(user._id);
      const res = await authFetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "change_role",
          userId: user._id,
          role: newRole,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(`Role updated to ${newRole}`);
        await loadUsers();
      } else {
        alert(data.message || "Failed to change role");
      }
    } catch (e) {
      alert("Error changing user role");
    } finally {
      setActionProcessing(null);
    }
  }

  // OPEN LINKED UPI MODAL
  function openUpiModal(user) {
    setSelectedUser(user);
    setUpiInput(user.linkedUpiId || "");
    setUpiLockState(user.isUpiLocked !== false);
    setUpiModalOpen(true);
  }

  // SUBMIT LINKED UPI UPDATE
  async function handleUpiSubmit() {
    if (!selectedUser) return;

    try {
      setActionProcessing(selectedUser._id);
      const res = await authFetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_linked_upi",
          userId: selectedUser._id,
          upiId: upiInput.trim(),
          isLocked: upiLockState,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(data.message || "Linked UPI updated");
        setUpiModalOpen(false);
        setSelectedUser(null);
        await loadUsers();
      } else {
        alert(data.message || "Failed to update linked UPI");
      }
    } catch (e) {
      alert("Error updating linked UPI");
    } finally {
      setActionProcessing(null);
    }
  }

  // OPEN PASSWORD RESET MODAL
  function openPasswordModal(user) {
    setSelectedUser(user);
    const suggestedPass = "Pass@" + Math.floor(1000 + Math.random() * 9000);
    setNewPasswordInput(suggestedPass);
    setPasswordModalOpen(true);
  }

  // SUBMIT ADMIN PASSWORD RESET
  async function handlePasswordResetSubmit() {
    if (!selectedUser) return;

    const pass = newPasswordInput.trim();
    if (pass.length < 6) {
      alert("Password must be at least 6 characters long.");
      return;
    }

    try {
      setActionProcessing(selectedUser._id);
      const res = await authFetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reset_password",
          userId: selectedUser._id,
          newPassword: pass,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(`🔑 Password updated for ${selectedUser.name}! New Password: ${pass}`);
        setPasswordModalOpen(false);
        setSelectedUser(null);
        await loadUsers();
      } else {
        alert(data.message || "Failed to reset password");
      }
    } catch (e) {
      alert("Error resetting password");
    } finally {
      setActionProcessing(null);
    }
  }

  // Stats calculation
  const stats = useMemo(() => {
    let totalWallet = 0;
    let totalRefEarnings = 0;
    let bannedCount = 0;
    let adminCount = 0;

    users.forEach((u) => {
      totalWallet += Number(u.walletBalance || 0);
      totalRefEarnings += Number(u.referralEarnings || 0);
      if (u.isBanned) bannedCount++;
      if (u.role === "admin") adminCount++;
    });

    return {
      totalUsers: users.length,
      totalWallet,
      totalRefEarnings,
      bannedCount,
      adminCount,
    };
  }, [users]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (statusFilter === "banned" && !u.isBanned) return false;
      if (statusFilter === "active" && u.isBanned) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const name = (u.name || "").toLowerCase();
        const email = (u.email || "").toLowerCase();
        const refCode = (u.referralCode || "").toLowerCase();
        const id = (u._id || "").toLowerCase();

        if (!name.includes(q) && !email.includes(q) && !refCode.includes(q) && !id.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [users, roleFilter, statusFilter, searchQuery]);

  function money(amount) {
    return `${RUPEE}${Number(amount || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  function formatDate(date) {
    if (!date) return "-";
    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl bg-slate-900 text-white border border-yellow-500/50 shadow-2xl shadow-yellow-500/20 text-sm font-bold flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[11px] font-black uppercase tracking-wider bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
              Player Directory
            </span>
            <span className="text-xs text-slate-400">Account Governance &amp; Wallet Control</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            User Accounts &amp; Security
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage player balances, inspect referral networks, toggle administrator privileges, and enforce account lockouts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadUsers}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition disabled:opacity-50"
          >
            <span className={loading ? "animate-spin" : ""}>↻</span>
            <span>{loading ? "Refreshing..." : "Refresh Users"}</span>
          </button>
        </div>
      </div>

      {/* KPI METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Registered</span>
          <div className="text-2xl font-black text-white mt-1">
            {stats.totalUsers} Players
          </div>
          <p className="text-xs text-slate-400 mt-1">{stats.adminCount} administrators</p>
        </div>

        <div className="p-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/20">
          <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider">Total Wallet Liability</span>
          <div className="text-2xl font-black text-yellow-300 mt-1">
            {money(stats.totalWallet)}
          </div>
          <p className="text-xs text-slate-400 mt-1">Current player balances held</p>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Referral Commissions</span>
          <div className="text-2xl font-black text-emerald-300 mt-1">
            {money(stats.totalRefEarnings)}
          </div>
          <p className="text-xs text-slate-400 mt-1">Earned via affiliate program</p>
        </div>

        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
          <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Suspended / Banned</span>
          <div className="text-2xl font-black text-red-400 mt-1">
            {stats.bannedCount} Accounts
          </div>
          <p className="text-xs text-slate-400 mt-1">Blocked from playing or withdrawing</p>
        </div>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Bar */}
        <div className="relative w-full md:w-96">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Search by Name, Email, Ref Code, User ID..."
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
              onClick={() => setRoleFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                roleFilter === "all" ? "bg-yellow-500 text-black shadow" : "text-slate-400 hover:text-white"
              }`}
            >
              All Roles
            </button>
            <button
              onClick={() => setRoleFilter("user")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                roleFilter === "user" ? "bg-yellow-500 text-black shadow" : "text-slate-400 hover:text-white"
              }`}
            >
              Users
            </button>
            <button
              onClick={() => setRoleFilter("admin")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                roleFilter === "admin" ? "bg-yellow-500 text-black shadow" : "text-slate-400 hover:text-white"
              }`}
            >
              Admins
            </button>
          </div>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                statusFilter === "all" ? "bg-yellow-500 text-black shadow" : "text-slate-400 hover:text-white"
              }`}
            >
              All Status
            </button>
            <button
              onClick={() => setStatusFilter("active")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                statusFilter === "active" ? "bg-yellow-500 text-black shadow" : "text-slate-400 hover:text-white"
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter("banned")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                statusFilter === "banned" ? "bg-yellow-500 text-black shadow" : "text-slate-400 hover:text-white"
              }`}
            >
              Banned ({stats.bannedCount})
            </button>
          </div>
        </div>
      </div>

      {/* USERS TABLE */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Player Profile</th>
                <th className="py-3.5 px-4">Wallet Balance</th>
                <th className="py-3.5 px-4">Linked UPI (Same-Account)</th>
                <th className="py-3.5 px-4">Referral / Bonus</th>
                <th className="py-3.5 px-4">Role &amp; Status</th>
                <th className="py-3.5 px-4">Registered</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    <div className="inline-block animate-spin text-xl mb-2">↻</div>
                    <div>Loading user accounts...</div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-500">
                    No users found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user._id} className="hover:bg-slate-800/40 transition">
                    {/* User Profile */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-yellow-500/20 to-slate-800 border border-yellow-500/30 flex items-center justify-center font-black text-yellow-400 text-sm shrink-0">
                          {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm flex items-center gap-2">
                            <span>{user.name || "Unnamed"}</span>
                            {user.role === "admin" && (
                              <span className="px-1.5 py-0.2 rounded bg-yellow-500 text-black text-[9px] font-black uppercase">
                                Admin
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400">{user.email}</div>
                          <div className="text-[10px] font-mono text-slate-500">ID: {user._id}</div>
                        </div>
                      </div>
                    </td>

                    {/* Balance */}
                    <td className="py-4 px-4">
                      <div className="font-black text-emerald-400 text-base">
                        {money(user.walletBalance)}
                      </div>
                      <button
                        onClick={() => openBalanceModal(user)}
                        className="text-[10px] text-yellow-400 hover:underline font-bold mt-0.5"
                      >
                        Adjust Balance ✎
                      </button>
                    </td>

                    {/* Linked UPI (Same-Account) */}
                    <td className="py-4 px-4">
                      {user.linkedUpiId ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-yellow-400 text-xs">{user.isUpiLocked !== false ? "🔒" : "🔓"}</span>
                            <span className="font-mono text-xs font-bold text-white bg-slate-950 px-2 py-0.5 rounded border border-slate-700 select-all">
                              {user.linkedUpiId}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold ${user.isUpiLocked !== false ? "text-amber-400" : "text-slate-400"}`}>
                              {user.isUpiLocked !== false ? "Locked to Deposit" : "Unlocked"}
                            </span>
                            <button
                              onClick={() => openUpiModal(user)}
                              className="text-[10px] text-yellow-400 hover:underline font-bold"
                            >
                              Edit ✎
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <span className="text-slate-500 text-xs italic">Not linked yet</span>
                          <div>
                            <button
                              onClick={() => openUpiModal(user)}
                              className="text-[10px] text-yellow-400 hover:underline font-bold"
                            >
                              + Set UPI
                            </button>
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Referral & Rewards */}
                    <td className="py-4 px-4 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400">Ref Code:</span>
                        <span className="font-mono text-slate-200 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-700 text-[11px]">
                          {user.referralCode || "N/A"}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Commission: <span className="text-emerald-400 font-bold">{money(user.referralEarnings)}</span>
                      </div>
                      {user.hasClaimedWelcomeBonus && (
                        <span className="inline-block px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[9px] font-bold">
                          🎁 Welcome Bonus
                        </span>
                      )}
                    </td>

                    {/* Role & Status */}
                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        <div>
                          {user.isBanned ? (
                            <span className="px-2.5 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 font-extrabold text-[10px] uppercase inline-block">
                              🚫 Suspended
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-extrabold text-[10px] uppercase inline-block">
                              ✓ Active
                            </span>
                          )}
                        </div>
                        {user.isBanned && user.banReason && (
                          <div className="text-[10px] text-red-400 max-w-xs truncate" title={user.banReason}>
                            Reason: {user.banReason}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Date */}
                    <td className="py-4 px-4 text-slate-400 text-[11px]">
                      <div>{formatDate(user.createdAt)}</div>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Adjust Balance Button */}
                        <button
                          onClick={() => openBalanceModal(user)}
                          disabled={actionProcessing === user._id}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-yellow-400 border border-slate-700 font-bold text-[11px] transition"
                          title="Credit or Debit Balance"
                        >
                          💳 Balance
                        </button>

                        {/* Reset Password Button */}
                        <button
                          onClick={() => openPasswordModal(user)}
                          disabled={actionProcessing === user._id}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-bold text-[11px] transition"
                          title="Reset User Password"
                        >
                          🔑 Pass
                        </button>

                        {/* Ban / Unban Button */}
                        <button
                          onClick={() => openBanModal(user)}
                          disabled={actionProcessing === user._id}
                          className={`px-2.5 py-1.5 rounded-lg font-bold text-[11px] transition ${
                            user.isBanned
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500 hover:text-black"
                              : "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white"
                          }`}
                        >
                          {user.isBanned ? "Unban" : "Ban"}
                        </button>

                        {/* Toggle Role */}
                        <button
                          onClick={() => toggleUserRole(user)}
                          disabled={actionProcessing === user._id}
                          className="px-2 py-1.5 rounded-lg bg-slate-950 text-slate-400 hover:text-white border border-slate-800 text-[11px] transition"
                          title={user.role === "admin" ? "Demote to User" : "Promote to Admin"}
                        >
                          {user.role === "admin" ? "🛡️ Admin" : "👤 User"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Showing {filteredUsers.length} of {users.length} total registered users</span>
          <button onClick={loadUsers} className="text-yellow-400 hover:underline font-bold">
            Sync Latest Data
          </button>
        </div>
      </div>

      {/* ADJUST BALANCE MODAL */}
      {adjustModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>💳</span> Manual Wallet Balance Adjustment
              </h3>
              <button
                onClick={() => setAdjustModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Target Player:</span>
                <span className="text-white font-bold">{selectedUser.name} ({selectedUser.email})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Current Balance:</span>
                <span className="text-emerald-400 font-bold">{money(selectedUser.walletBalance)}</span>
              </div>
            </div>

            <div className="space-y-3">
              {/* Type Switcher */}
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setAdjustType("credit");
                    if (!adjustNote || adjustNote.includes("Bonus")) setAdjustNote("Admin Manual Balance Credit");
                  }}
                  className={`py-2 rounded-lg text-xs font-bold transition ${
                    adjustType === "credit"
                      ? "bg-emerald-500 text-black shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  + Credit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAdjustType("bonus");
                    setAdjustNote("Special / First Deposit Bonus");
                  }}
                  className={`py-2 rounded-lg text-xs font-bold transition ${
                    adjustType === "bonus"
                      ? "bg-purple-500 text-white shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  🎁 Bonus
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAdjustType("debit");
                    if (!adjustNote || adjustNote.includes("Bonus")) setAdjustNote("Admin Balance Deduction");
                  }}
                  className={`py-2 rounded-lg text-xs font-bold transition ${
                    adjustType === "debit"
                      ? "bg-red-500 text-white shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  - Debit
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Amount (₹):
                </label>
                <input
                  type="number"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  placeholder="e.g. 500"
                  min="1"
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-yellow-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Audit / Transaction Note:
                </label>
                <input
                  type="text"
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                  placeholder="e.g. Compensation for payment glitch / VIP Reward"
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-yellow-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAdjustModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBalanceSubmit}
                disabled={actionProcessing === selectedUser._id || !adjustAmount}
                className={`px-4 py-2 rounded-xl font-bold text-xs transition shadow-lg disabled:opacity-50 ${
                  adjustType === "credit"
                    ? "bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20"
                    : adjustType === "bonus"
                    ? "bg-purple-500 hover:bg-purple-400 text-white shadow-purple-500/20"
                    : "bg-red-500 hover:bg-red-400 text-white shadow-red-500/20"
                }`}
              >
                {actionProcessing === selectedUser._id
                  ? "Processing..."
                  : `Confirm ${adjustType === "credit" ? "Credit" : adjustType === "bonus" ? "Grant Bonus" : "Debit"}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BAN / UNBAN MODAL */}
      {banModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>{selectedUser.isBanned ? "🔓" : "🚫"}</span>{" "}
                {selectedUser.isBanned ? "Unban User Account" : "Suspend / Ban User Account"}
              </h3>
              <button
                onClick={() => setBanModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-1">
              <div><strong>Player:</strong> {selectedUser.name} ({selectedUser.email})</div>
              <div><strong>Wallet Balance:</strong> {money(selectedUser.walletBalance)}</div>
            </div>

            {!selectedUser.isBanned && (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300">
                  Suspension Reason (Shown to player on login):
                </label>
                <input
                  type="text"
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder="e.g. Fraudulent activity / Multi-accounting"
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-red-500"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setBanModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBanSubmit}
                disabled={actionProcessing === selectedUser._id}
                className={`px-4 py-2 rounded-xl font-bold text-xs transition shadow-lg disabled:opacity-50 ${
                  selectedUser.isBanned
                    ? "bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20"
                    : "bg-red-500 hover:bg-red-400 text-white shadow-red-500/20"
                }`}
              >
                {actionProcessing === selectedUser._id
                  ? "Updating..."
                  : selectedUser.isBanned
                  ? "Confirm Unban"
                  : "Confirm Ban"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LINKED UPI SECURITY MODAL */}
      {upiModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>🔒</span> Linked UPI Security (Same-Account)
              </h3>
              <button
                onClick={() => setUpiModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-1">
              <div><strong>Player:</strong> {selectedUser.name} ({selectedUser.email})</div>
              <div>
                <strong>Current Linked UPI:</strong>{" "}
                <span className="font-mono text-yellow-400 font-bold">{selectedUser.linkedUpiId || "None (Not Set)"}</span>
              </div>
              <div>
                <strong>Policy:</strong> Player can ONLY withdraw to this verified deposit UPI ID.
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Target UPI ID:
                </label>
                <input
                  type="text"
                  value={upiInput}
                  onChange={(e) => setUpiInput(e.target.value)}
                  placeholder="e.g. player@upi or 9876543210@paytm"
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 font-mono text-xs focus:outline-none focus:border-yellow-500"
                />
              </div>

              <div className="flex items-center gap-2 p-3 bg-slate-950 rounded-xl border border-slate-800">
                <input
                  type="checkbox"
                  id="lockUpiCheckbox"
                  checked={upiLockState}
                  onChange={(e) => setUpiLockState(e.target.checked)}
                  className="w-4 h-4 rounded text-yellow-500 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="lockUpiCheckbox" className="text-xs text-slate-300 cursor-pointer font-bold select-none">
                  Enforce strict lock (Prevents user from changing UPI on withdrawal)
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setUpiModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpiSubmit}
                disabled={actionProcessing === selectedUser._id}
                className="px-4 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-xs transition shadow-lg shadow-yellow-500/20 disabled:opacity-50"
              >
                {actionProcessing === selectedUser._id ? "Saving..." : "Save Linked UPI"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PASSWORD RESET MODAL */}
      {passwordModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>🔑</span> Admin Password Reset
              </h3>
              <button
                onClick={() => setPasswordModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-1">
              <div><strong>Player Name:</strong> {selectedUser.name}</div>
              <div><strong>Email:</strong> {selectedUser.email}</div>
              {selectedUser.phone && <div><strong>Mobile:</strong> {selectedUser.phone}</div>}
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  New Password:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    placeholder="Enter at least 6 characters"
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 font-mono text-sm focus:outline-none focus:border-yellow-500 font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => setNewPasswordInput("Pass@" + Math.floor(1000 + Math.random() * 9000))}
                    className="absolute right-2.5 top-2.5 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-yellow-400 text-[10px] font-bold"
                  >
                    Auto Generate ↻
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  This new password will take effect immediately. Share it with the player.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPasswordModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePasswordResetSubmit}
                disabled={actionProcessing === selectedUser._id || !newPasswordInput}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition shadow-lg shadow-amber-500/20 disabled:opacity-50"
              >
                {actionProcessing === selectedUser._id ? "Resetting..." : "Confirm & Set Password"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
