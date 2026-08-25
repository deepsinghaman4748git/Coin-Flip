'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error('Application runtime error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#070B14] text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-3xl mb-4">
        ⚠️
      </div>
      <h1 className="text-2xl md:text-3xl font-black text-white mb-2">Something went wrong!</h1>
      <p className="text-slate-400 text-sm max-w-md mb-6">
        An unexpected error occurred. You can retry the operation or return to the CoinFlip arena.
      </p>
      <div className="flex gap-4">
        <button
          onClick={() => reset()}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black font-bold text-sm transition shadow-lg shadow-yellow-500/20"
        >
          Try Again
        </button>
        <Link
          href="/"
          className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm transition border border-slate-700"
        >
          Go to Home
        </Link>
      </div>
    </div>
  );
}
