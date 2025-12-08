import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center px-4">
      <div className="text-center">
        <div className="text-7xl mb-6 animate-bounce">🏀</div>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          HoopGang Creator Portal
        </h1>
        <p className="text-white/60 text-lg mb-8 max-w-md mx-auto">
          Get free gear. Create fire content. Get paid to hoop.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/apply"
            className="px-8 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-orange-500/25 transition-all"
          >
            Apply Now
          </Link>
          <Link
            href="/creator/dashboard"
            className="px-8 py-3 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition-all border border-white/10"
          >
            Creator Login
          </Link>
        </div>
      </div>
    </div>
  );
}

