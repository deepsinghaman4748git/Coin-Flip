import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#070B14] text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-3xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center text-3xl font-black text-yellow-400 mb-4">
        🪙
      </div>
      <h1 className="text-2xl sm:text-3xl font-black mb-2">Page Not Found</h1>
      <p className="text-gray-400 text-sm max-w-sm mb-6">
        The requested page does not exist or has been moved.
      </p>
      <Link
        href="/"
        className="px-6 py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-black font-black text-xs uppercase tracking-wider transition shadow-lg shadow-yellow-400/20"
      >
        Return to CoinFlip ➔
      </Link>
    </div>
  );
}
