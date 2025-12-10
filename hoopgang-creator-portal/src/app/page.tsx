// src/app/page.tsx

import Link from 'next/link';
import Image from 'next/image';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Gradient orbs */}
          <div className="absolute top-1/4 -left-32 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
          
          {/* Grid pattern overlay */}
          <div 
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left Column - Content */}
            <div className="text-center lg:text-left order-2 lg:order-1">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/20 rounded-full text-orange-400 text-sm font-medium mb-6">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                </span>
                Now accepting creator applications
              </div>

              {/* Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight mb-6">
                Join the{' '}
                <span className="bg-gradient-to-r from-orange-500 via-orange-400 to-yellow-500 bg-clip-text text-transparent">
                  HoopGang
                </span>{' '}
                Creator Squad
              </h1>

              {/* Subheadline */}
              <p className="text-lg sm:text-xl text-white/60 mb-8 max-w-xl mx-auto lg:mx-0">
                Get free gear. Create fire content. Build your brand. Join 50+ basketball creators repping the freshest hoops gear on TikTok.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link
                  href="/apply"
                  className="group relative px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold text-lg rounded-xl hover:shadow-xl hover:shadow-orange-500/25 transition-all duration-300 hover:scale-105 overflow-hidden"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    Apply Now
                    <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-orange-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
                
                <Link
                  href="/login"
                  className="px-8 py-4 bg-white/5 text-white font-semibold text-lg rounded-xl hover:bg-white/10 transition-all duration-300 border border-white/10 hover:border-white/20"
                >
                  Creator Login
                </Link>
              </div>

              {/* Social Proof */}
              <div className="flex items-center gap-6 mt-10 justify-center lg:justify-start">
                <div className="flex -space-x-2">
                  {/* Overlapping creator images */}
                  <div className="w-8 h-8 rounded-full border-2 border-zinc-900 overflow-hidden">
                    <Image src="/images/creators/creator_stretch.jpg" alt="" width={32} height={32} className="w-full h-full object-cover" />
                  </div>
                  <div className="w-8 h-8 rounded-full border-2 border-zinc-900 overflow-hidden">
                    <Image src="/images/creators/striped_duo.jpg" alt="" width={32} height={32} className="w-full h-full object-cover" />
                  </div>
                  <div className="w-8 h-8 rounded-full border-2 border-zinc-900 overflow-hidden">
                    <Image src="/images/creators/outdoor_crew.jpg" alt="" width={32} height={32} className="w-full h-full object-cover" />
                  </div>
                  <div className="w-8 h-8 rounded-full bg-orange-500 border-2 border-zinc-900 flex items-center justify-center">
                    <span className="text-xs font-bold text-white">+</span>
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-white font-semibold">30K+ Hoopers</p>
                  <p className="text-white/50 text-sm">Worldwide community</p>
                </div>
              </div>
            </div>

            {/* Right Column - Hero Image Card */}
            <div className="order-1 lg:order-2 relative">
              <div className="relative">
                {/* Main Product Image */}
                <div className="relative bg-zinc-900/80 backdrop-blur-sm rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
                  <Image
                    src="/images/products/hero_product.jpg"
                    alt="HoopGang Creator"
                    width={450}
                    height={563}
                    className="w-full h-auto"
                    priority
                  />
                  {/* Gradient overlay at bottom */}
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-zinc-900/90 to-transparent" />
                </div>
                
                {/* Floating Stats Card - Top Right */}
                <div className="absolute -top-4 -right-4 bg-orange-500 rounded-xl p-3 shadow-lg shadow-orange-500/30">
                  <Image
                    src="/images/THG_logo_white.png"
                    alt="THG"
                    width={40}
                    height={40}
                  />
                </div>
                
                {/* Floating Stats Card - Right Side */}
                <div className="absolute top-1/4 -right-8 bg-zinc-800/90 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/10">
                  <p className="text-orange-400 font-bold text-xl">30K+</p>
                  <p className="text-white/60 text-xs">Global Hoopers</p>
                </div>
                
                {/* Floating Card - Bottom */}
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-zinc-800/90 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/10">
                  <p className="text-white font-semibold text-sm">FREE GEAR</p>
                  <p className="text-white/60 text-xs">No strings attached</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <svg className="w-6 h-6 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 px-4 sm:px-6 relative">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              How It Works
            </h2>
            <p className="text-white/60 text-lg max-w-2xl mx-auto">
              From application to getting paid — here's your journey with HoopGang
            </p>
          </div>

          {/* Steps Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: '01',
                icon: '📝',
                title: 'Apply',
                description: 'Fill out a quick application with your socials and content samples.',
              },
              {
                step: '02',
                icon: '📦',
                title: 'Get Gear',
                description: 'Once approved, we ship you free HoopGang gear — no strings attached.',
              },
              {
                step: '03',
                icon: '🎥',
                title: 'Create Content',
                description: 'Post 3 TikToks featuring your gear within 14 days of delivery.',
              },
              {
                step: '04',
                icon: '💰',
                title: 'Get Rewarded',
                description: 'Unlock paid collabs, exclusive drops, and creator perks.',
              },
            ].map((item, index) => (
              <div
                key={index}
                className="group relative bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-orange-500/30 transition-all duration-300"
              >
                {/* Step number */}
                <div className="absolute -top-3 -right-3 w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {item.step}
                </div>
                
                {/* Icon */}
                <div className="text-4xl mb-4 transition-transform group-hover:scale-110">
                  {item.icon}
                </div>
                
                {/* Content */}
                <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{item.description}</p>

                {/* Connector line (hidden on last item) */}
                {index < 3 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 w-6 border-t border-dashed border-white/20" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 border-y border-white/10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-bold text-orange-400">30K+</p>
              <p className="text-white/60 text-sm mt-1">Global Hoopers</p>
            </div>
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-bold text-white">25+</p>
              <p className="text-white/60 text-sm mt-1">Countries Served</p>
            </div>
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-bold text-purple-400">4.9★</p>
              <p className="text-white/60 text-sm mt-1">Customer Rating</p>
            </div>
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-bold text-white">100%</p>
              <p className="text-white/60 text-sm mt-1">Free Gear</p>
            </div>
          </div>
        </div>
      </section>

      {/* What You Get Section */}
      <section className="py-24 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              What You Get
            </h2>
            <p className="text-white/60 text-lg max-w-2xl mx-auto">
              More than just free gear — join a community of creators leveling up together
            </p>
          </div>

          {/* Perks Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: '👕',
                title: 'Free Premium Gear',
                description: 'Reversible shorts, hoodies, tees — the freshest basketball apparel delivered to your door.',
              },
              {
                icon: '⭐',
                title: 'Get Featured',
                description: 'Top creators get featured on @thehoopgang with 100K+ followers watching.',
              },
              {
                icon: '🎁',
                title: 'Early Access Drops',
                description: 'Be the first to rock new collections before anyone else.',
              },
              {
                icon: '💰',
                title: 'Paid Opportunities',
                description: 'Unlock paid collaborations and ambassador programs.',
              },
              {
                icon: '🤝',
                title: 'Creator Community',
                description: 'Connect with other basketball content creators and grow together.',
              },
              {
                icon: '📈',
                title: 'Grow Your Brand',
                description: 'Level up your content with quality gear and brand partnerships.',
              },
            ].map((perk, index) => (
              <div
                key={index}
                className="group bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-orange-500/30 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500/20 to-purple-500/20 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
                  {perk.icon}
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{perk.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{perk.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Creator Gallery */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              The <span className="text-orange-400">Squad</span>
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto">
              Real creators. Real hoopers. Real community.
            </p>
          </div>
          
          {/* Masonry-style Gallery */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {/* Large feature image */}
            <div className="col-span-2 md:col-span-1 md:row-span-2 relative group overflow-hidden rounded-2xl">
              <Image
                src="/images/creators/team_photo.jpg"
                alt="HoopGang Team"
                width={408}
                height={512}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            
            {/* Grid images */}
            <div className="relative group overflow-hidden rounded-2xl aspect-square">
              <Image
                src="/images/creators/purple_crew.jpg"
                alt="HoopGang Crew"
                width={406}
                height={406}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            
            <div className="relative group overflow-hidden rounded-2xl aspect-square">
              <Image
                src="/images/creators/outdoor_crew.jpg"
                alt="HoopGang Outdoor"
                width={405}
                height={405}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            
            <div className="relative group overflow-hidden rounded-2xl aspect-[3/4]">
              <Image
                src="/images/creators/striped_duo.jpg"
                alt="HoopGang Duo"
                width={642}
                height={800}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            
            <div className="relative group overflow-hidden rounded-2xl aspect-square">
              <Image
                src="/images/creators/creator_stretch.jpg"
                alt="HoopGang Creator"
                width={225}
                height={239}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-br from-orange-500/20 via-purple-500/10 to-orange-500/20 border border-orange-500/20 rounded-3xl p-8 sm:p-12 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />
            
            <div className="relative">
              <div className="mb-6">
                <Image
                  src="/images/THG_logo_orange.png"
                  alt="HoopGang"
                  width={56}
                  height={56}
                  className="mx-auto"
                />
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Ready to Join the Squad?
              </h2>
              <p className="text-white/60 text-lg mb-8 max-w-xl mx-auto">
                Applications are open. Get your free gear and start creating content that matters.
              </p>
              <Link
                href="/apply"
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold text-lg rounded-xl hover:shadow-xl hover:shadow-orange-500/25 transition-all duration-300 hover:scale-105"
              >
                Apply Now
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <Image
                src="/images/THG_logo_orange.png"
                alt="HoopGang"
                width={28}
                height={28}
              />
              <span className="text-lg font-bold bg-gradient-to-r from-orange-500 to-orange-400 bg-clip-text text-transparent">
                HoopGang
              </span>
            </div>

            {/* Links */}
            <div className="flex items-center gap-6 text-sm text-white/60">
              <Link href="/apply" className="hover:text-white transition-colors">Apply</Link>
              <Link href="/login" className="hover:text-white transition-colors">Login</Link>
              <a 
                href="https://tiktok.com/@thehoopgang" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                TikTok
              </a>
              <a 
                href="https://instagram.com/thehoopgang" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                Instagram
              </a>
            </div>

            {/* Copyright */}
            <div className="text-sm text-white/40">
              © {new Date().getFullYear()} HoopGang. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}