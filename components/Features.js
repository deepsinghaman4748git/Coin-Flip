export default function Features() {
  const features = [
    {
      icon: "ðŸª™",
      title: "Fair Coin Toss",
      desc: "Secure server-side random coin toss with instant results.",
    },
    {
      icon: "ðŸ’°",
      title: "Instant Wallet",
      desc: "Deposit, play and withdraw using a fast wallet system.",
    },
    {
      icon: "âš¡",
      title: "Fast Gameplay",
      desc: "Place your bet and get the result within seconds.",
    },
    {
      icon: "ðŸ”’",
      title: "100% Secure",
      desc: "Encrypted authentication and protected transactions.",
    },
  ];

  return (
    <section className="bg-[#0d1224] py-24 px-6">

      <div className="max-w-7xl mx-auto">

        <h2 className="text-center text-4xl md:text-5xl font-bold text-white">
          Why Choose
          <span className="text-yellow-400"> CoinFlip?</span>
        </h2>

        <p className="text-center text-gray-400 mt-5 max-w-2xl mx-auto">
          A premium gaming platform with modern design, secure wallet,
          fast performance and smooth gameplay.
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mt-16">

          {features.map((item, index) => (
            <div
              key={index}
              className="bg-[#161d33] rounded-2xl p-8 border border-yellow-500/20 hover:border-yellow-400 transition duration-300 hover:-translate-y-2"
            >
              <div className="text-5xl mb-6">
                {item.icon}
              </div>

              <h3 className="text-2xl font-bold text-white">
                {item.title}
              </h3>

              <p className="text-gray-400 mt-4 leading-7">
                {item.desc}
              </p>
            </div>
          ))}

        </div>

      </div>

    </section>
  );
}
