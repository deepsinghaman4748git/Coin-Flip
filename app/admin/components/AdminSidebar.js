"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authFetch } from "../../lib/clientAuth";

const menuItems = [
  {
    name: "Dashboard",
    href: "/admin/dashboard",
    icon: "📊",
    badgeKey: null,
  },
  {
    name: "Deposit Requests",
    href: "/admin/deposits",
    icon: "💳",
    badgeKey: "pendingDeposits",
  },
  {
    name: "Withdraw Requests",
    href: "/admin/withdraws",
    icon: "🏦",
    badgeKey: "pendingWithdraws",
  },
  {
    name: "User Management",
    href: "/admin/users",
    icon: "👥",
    badgeKey: null,
  },
  {
    name: "Game History",
    href: "/admin/games",
    icon: "🎲",
    badgeKey: null,
  },
  {
    name: "System Settings",
    href: "/admin/settings",
    icon: "⚙️",
    badgeKey: null,
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [soundAlerts, setSoundAlerts] = useState(true);
  const [lastPendingTotal, setLastPendingTotal] = useState(0);
  const [pendingCounts, setPendingCounts] = useState({
    pendingDeposits: 0,
    pendingWithdraws: 0,
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("coinflip_admin_sound");
      if (saved !== null) {
        setSoundAlerts(saved === "true");
      }
    }
  }, []);

  function toggleSoundAlerts() {
    const next = !soundAlerts;
    setSoundAlerts(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("coinflip_admin_sound", String(next));
    }
    if (next) {
      playAdminChime();
    }
  }

  function playAdminChime() {
    try {
      if (typeof window === "undefined") return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      // Dual-tone high-pitch luxury alert chime
      const now = ctx.currentTime;

      // Note 1: 880Hz (A5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(880, now);
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.25, now + 0.05);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.36);

      // Note 2: 1320Hz (E6 - high chime)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(1320, now + 0.12);
      gain2.gain.setValueAtTime(0, now + 0.12);
      gain2.gain.linearRampToValueAtTime(0.3, now + 0.16);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.62);
    } catch (e) {
      console.warn("Audio chime error:", e);
    }
  }

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    async function fetchPending() {
      try {
        const res = await authFetch("/api/admin/dashboard", { cache: "no-store" });
        const data = await res.json();
        if (data.success && data.stats) {
          const dep = Number(data.stats.pendingDeposits || 0);
          const wth = Number(data.stats.pendingWithdraws || 0);
          const currentTotal = dep + wth;

          setPendingCounts((prev) => {
            const prevTotal = prev.pendingDeposits + prev.pendingWithdraws;
            // If new requests arrived and sound alerts are on, play chime!
            if (currentTotal > prevTotal && currentTotal > 0 && soundAlerts) {
              playAdminChime();
            }
            return {
              pendingDeposits: dep,
              pendingWithdraws: wth,
            };
          });
        }
      } catch (err) {
        // silent
      }
    }

    fetchPending();
    const interval = setInterval(fetchPending, 12000);
    return () => clearInterval(interval);
  }, [soundAlerts]);

  if (pathname === "/admin/login") {
    return null;
  }

  async function handleLogout() {
    if (loggingOut) return;

    try {
      setLoggingOut(true);

      const response = await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });

      if (typeof window !== "undefined") {
        localStorage.removeItem("coinflip_token");
        localStorage.removeItem("coinflip_user");
      }

      setMobileOpen(false);
      router.replace("/admin/login");
      router.refresh();
    } catch (error) {
      console.error("Admin logout error:", error);
    } finally {
      setLoggingOut(false);
    }
  }

  const NavContent = () => (
    <div className="flex flex-col h-full bg-[#0D1322] border-r border-slate-800/80">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800/80 bg-gradient-to-b from-slate-900/80 to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-yellow-500 to-amber-300 flex items-center justify-center text-black font-black text-xl shadow-lg shadow-yellow-500/20">
            🪙
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-white text-base tracking-tight">CoinFlip Admin</span>
              <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                PRO
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Control &amp; Security Portal</p>
          </div>
        </div>
      </div>

      {/* Live System Status Bar */}
      <div className="px-5 py-3 bg-slate-900/40 border-b border-slate-800/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-semibold text-emerald-400">Server Protected</span>
        </div>
        <span className="text-[11px] font-mono text-slate-400 bg-slate-800/70 px-2 py-0.5 rounded border border-slate-700/50">
          v2.4
        </span>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 pt-2 pb-1">
          Management
        </p>

        {menuItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const badgeCount = item.badgeKey ? pendingCounts[item.badgeKey] : 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3.5 py-3 rounded-xl font-semibold text-sm transition-all duration-150 ${
                active
                  ? "bg-yellow-500 text-slate-950 shadow-md shadow-yellow-500/20 font-bold"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{item.icon}</span>
                <span>{item.name}</span>
              </div>

              {badgeCount > 0 && (
                <span
                  className={`text-xs font-black px-2 py-0.5 rounded-full ${
                    active
                      ? "bg-black text-yellow-400"
                      : "bg-red-500 text-white animate-pulse"
                  }`}
                >
                  {badgeCount}
                </span>
              )}
            </Link>
          );
        })}

        <div className="pt-4 mt-4 border-t border-slate-800/70 space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 pb-1">
            Audio Alert Controls
          </p>

          <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-sm">{soundAlerts ? "🔔" : "🔕"}</span>
              <div>
                <p className="text-xs font-bold text-white">Audio Alert</p>
                <p className="text-[10px] text-slate-400">{soundAlerts ? "Sound is ON" : "Muted"}</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={playAdminChime}
                title="Test Chime Sound"
                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold border border-slate-700 transition"
              >
                Test ♫
              </button>
              <button
                type="button"
                onClick={toggleSoundAlerts}
                className={`relative h-6 w-10 shrink-0 rounded-full transition duration-200 focus:outline-none ${
                  soundAlerts ? "bg-yellow-500" : "bg-slate-800 border border-slate-700"
                }`}
                aria-label="Toggle sound alerts"
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-slate-950 shadow transition-all duration-200 ${
                    soundAlerts ? "left-4 bg-slate-950" : "left-0.5 bg-slate-400"
                  }`}
                />
              </button>
            </div>
          </div>

          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-xs text-slate-400 hover:text-yellow-400 hover:bg-slate-800/50 transition"
          >
            <span>🎮</span>
            <span>Launch Player App ↗</span>
          </a>
        </div>
      </div>

      {/* Admin Profile & Logout */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-900/60">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sm font-bold text-yellow-400">
              🛡️
            </div>
            <div>
              <p className="text-xs font-bold text-white leading-none">Super Admin</p>
              <p className="text-[10px] text-slate-400 leading-none mt-1">256-Bit SSL Auth</p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 text-xs font-bold transition disabled:opacity-50"
        >
          <span>🚪</span>
          <span>{loggingOut ? "Logging out..." : "Sign Out Admin"}</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Permanent Desktop Sidebar */}
      <aside className="hidden md:block w-64 lg:w-72 shrink-0 h-screen sticky top-0 z-40">
        <NavContent />
      </aside>

      {/* Mobile Top Navigation Header */}
      <header className="md:hidden sticky top-0 z-50 bg-[#0D1322]/95 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-yellow-500 to-amber-300 flex items-center justify-center text-black font-black text-sm">
            🪙
          </div>
          <div>
            <span className="font-bold text-white text-sm">CoinFlip Admin</span>
            <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.2 rounded bg-yellow-500/20 text-yellow-400">PRO</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {(pendingCounts.pendingDeposits > 0 || pendingCounts.pendingWithdraws > 0) && (
            <span className="bg-red-500 text-white text-[11px] font-black px-2 py-0.5 rounded-full animate-pulse">
              {pendingCounts.pendingDeposits + pendingCounts.pendingWithdraws} Pending
            </span>
          )}

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-white hover:bg-slate-700 transition"
            aria-label="Toggle Navigation Menu"
          >
            {mobileOpen ? "✕" : "☰"}
          </button>
        </div>
      </header>

      {/* Mobile Slide-over Drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-4/5 max-w-xs h-full bg-[#0D1322] shadow-2xl z-10 flex flex-col">
            <NavContent />
          </div>
        </div>
      )}
    </>
  );
}