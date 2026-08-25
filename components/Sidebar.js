"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();

  const menus = [
    { name: "Dashboard", href: "/dashboard", icon: "ðŸ " },
    { name: "Coin Toss", href: "/game", icon: "ðŸª™" },
    { name: "Wallet", href: "/wallet", icon: "ðŸ’°" },
    { name: "History", href: "/history", icon: "ðŸ“œ" },
    { name: "Profile", href: "/profile", icon: "ðŸ‘¤" },
    { name: "Support", href: "/support", icon: "ðŸŽ§" },
  ];

  return (
    <aside className="w-72 min-h-screen bg-[#0f172a] border-r border-gray-800 p-6">

      <h1 className="text-3xl font-bold text-yellow-400 mb-10">
        CoinFlip
      </h1>

      <div className="bg-[#111827] rounded-xl p-5 mb-8">
        <p className="text-gray-400 text-sm">Wallet Balance</p>
        <h2 className="text-3xl font-bold text-green-400 mt-2">
          â‚¹0.00
        </h2>
      </div>

      <nav className="space-y-3">

        {menus.map((menu) => (
          <Link
            key={menu.href}
            href={menu.href}
            className={`flex items-center gap-4 px-5 py-4 rounded-xl transition ${
              pathname === menu.href
                ? "bg-yellow-500 text-black font-bold"
                : "bg-[#111827] text-white hover:bg-yellow-500 hover:text-black"
            }`}
          >
            <span className="text-2xl">{menu.icon}</span>
            <span>{menu.name}</span>
          </Link>
        ))}

      </nav>

    </aside>
  );
}
