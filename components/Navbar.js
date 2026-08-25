"use client";

import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="w-full bg-black/70 backdrop-blur-md border-b border-yellow-500/20 fixed top-0 left-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">

        <h1 className="text-3xl font-extrabold text-yellow-400">
          CoinFlip
        </h1>

        <div className="hidden md:flex items-center gap-8 text-white">

          <Link href="/" className="hover:text-yellow-400 transition">
            Home
          </Link>

          <Link href="/game" className="hover:text-yellow-400 transition">
            Play
          </Link>

          <Link href="/wallet" className="hover:text-yellow-400 transition">
            Wallet
          </Link>

          <Link href="/history" className="hover:text-yellow-400 transition">
            History
          </Link>

        </div>

        <div className="flex gap-3">

          <button className="px-5 py-2 rounded-lg bg-yellow-500 text-black font-bold hover:bg-yellow-400">
            Login
          </button>

          <button className="px-5 py-2 rounded-lg border border-yellow-500 text-yellow-400 hover:bg-yellow-500 hover:text-black transition">
            Register
          </button>

        </div>

      </div>
    </nav>
  );
}
