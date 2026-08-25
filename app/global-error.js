'use client';

import { useEffect } from 'react';

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error('Global application error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-[#070B14] text-white min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-3xl mb-4">
          🪙
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white mb-2">System Temporary Error</h1>
        <p className="text-slate-400 text-sm max-w-md mb-6">
          The application encountered an issue while loading. Please click reload to resume.
        </p>
        <button
          onClick={() => reset()}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black font-bold text-sm transition shadow-lg shadow-yellow-500/20 cursor-pointer"
        >
          Reload App
        </button>
      </body>
    </html>
  );
}
