"use client";

export default function Hero() {
  return (
    <section className="min-h-screen bg-gradient-to-b from-[#0b1020] via-[#12172b] to-black flex items-center justify-center px-6 pt-24">

      <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">

        {/* Left Side */}
        <div>

          <span className="inline-block bg-yellow-500/20 text-yellow-400 px-4 py-2 rounded-full mb-6">
            🎯 India's Premium Coin Toss Game
          </span>

          <h1 className="text-5xl md:text-7xl font-extrabold text-white leading-tight">
            Flip The Coin
            <br />
            <span className="text-yellow-400">
              Win Real Rewards
            </span>
          </h1>

          <p className="text-gray-300 text-lg mt-8 leading-8">
            Choose Head or Tail, place your bet,
            flip the coin and test your luck with a
            smooth, secure and lightning-fast gaming experience.
          </p>

          <div className="flex gap-5 mt-10">

            <button className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-8 py-4 rounded-xl transition">
              ▶ Play Now
            </button>

            <button className="border border-yellow-500 text-yellow-400 px-8 py-4 rounded-xl hover:bg-yellow-500 hover:text-black transition">
              Learn More
            </button>

          </div>

        </div>

        {/* Right Side */}
        <div className="flex justify-center">

          <div className="relative">

            <div className="w-72 h-72 rounded-full bg-yellow-400 shadow-[0_0_70px_gold] animate-pulse flex items-center justify-center">

              <div className="w-60 h-60 rounded-full bg-yellow-300 flex items-center justify-center">

                <div className="text-black text-6xl font-black">
                  HEAD
                </div>

              </div>

            </div>

            <div className="absolute -top-6 -left-6 bg-black border border-yellow-500 rounded-xl px-4 py-2 text-yellow-400">
              🪙 Secure
            </div>

            <div className="absolute bottom-0 -right-8 bg-black border border-yellow-500 rounded-xl px-4 py-2 text-yellow-400">
              ⚡ Instant Result
            </div>

          </div>

        </div>

      </div>

    </section>
  );
}