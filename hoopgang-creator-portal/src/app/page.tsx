// src/app/page.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { AnimatedCounter } from '@/components/ui';

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
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-500/5 rounded-full blur-3xl" />
          
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

              {/* Headline with Shimmer Effect */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight mb-6">
                Join the{' '}
                <span 
                  className="bg-gradient-to-r from-orange-500 via-amber-400 to-orange-500 bg-clip-text text-transparent animate-shimmer-text"
                  style={{
                    backgroundSize: '200% auto',
                  }}
                >
                  TheHoopGang
                </span>{' '}
                Creator Squad
              </h1>

              {/* Subheadline */}
              <p className="text-lg sm:text-xl text-white/60 mb-8 max-w-xl mx-auto lg:mx-0">
                Get refundable gear. Create fire content. Build your brand. Join 50+ basketball creators repping the freshest hoops gear on TikTok.
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
                    src="/images/products/hero_product.png"
                    alt="TheHoopGang Creator"
                    width={450}
                    height={563}
                    className="w-full h-auto"
                    priority
                  />
                  {/* Gradient overlay at bottom */}
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-zinc-900/90 to-transparent" />
                </div>
                
                {/* Floating Stats Card - Top Right */}
                <div className="absolute -top-4 -right-4 bg-orange-500 rounded-xl p-3 shadow-lg shadow-orange-500/30 animate-float">
                  <Image
                    src="/images/THG_logo_white.png"
                    alt="THG"
                    width={40}
                    height={40}
                  />
                </div>
                
                {/* Floating Stats Card - Right Side */}
                <div className="absolute top-1/4 -right-8 bg-zinc-800/90 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/10 animate-float-delayed">
                  <p className="text-orange-400 font-bold text-xl">30K+</p>
                  <p className="text-white/60 text-xs">Global Hoopers</p>
                </div>
                
                {/* Floating Card - Bottom */}
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-zinc-800/90 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/10 animate-float-slow">
                  <p className="text-white font-semibold text-sm">REFUNDABLE GEAR</p>
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
              From application to getting paid — here's your journey with TheHoopGang
            </p>
            {/* Decorative underline */}
            <div className="mt-4 mx-auto w-24 h-1 rounded-full bg-gradient-to-r from-transparent via-orange-500/50 to-transparent" />
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
                description: 'Once approved, we ship you refundable TheHoopGang gear — no strings attached.',
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
                className="group relative bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 transition-all duration-300 hover:bg-white/10 hover:border-orange-500/40 hover:shadow-[0_0_30px_-5px_rgba(249,115,22,0.3)] hover:-translate-y-1"
              >
                {/* Step number */}
                <div className="absolute -top-3 -right-3 w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-orange-500/30">
                  {item.step}
                </div>
                
                {/* Icon with glow on hover */}
                <div className="relative mb-4">
                  <div className="absolute inset-0 bg-orange-500/30 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-300" />
                  <div className="relative text-4xl transition-transform duration-300 group-hover:scale-110">
                    {item.icon}
                  </div>
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
      <section className="py-16 border-y border-white/10 relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 via-transparent to-purple-500/5" />
        
        <div className="relative max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: 30, suffix: 'K+', label: 'Global Hoopers', color: 'text-orange-400', glowColor: 'hover:shadow-orange-500/20' },
              { value: 25, suffix: '+', label: 'Countries Served', color: 'text-purple-400', glowColor: 'hover:shadow-purple-500/20' },
              { value: 4.9, suffix: '★', label: 'Customer Rating', color: 'text-amber-400', glowColor: 'hover:shadow-amber-500/20', isDecimal: true },
              { value: 100, suffix: '%', label: 'Refundable Gear', color: 'text-green-400', glowColor: 'hover:shadow-green-500/20' },
            ].map((stat, index) => (
              <div 
                key={index} 
                className={`text-center p-6 rounded-2xl transition-all duration-300 hover:bg-white/5 hover:shadow-[0_0_40px_-10px] ${stat.glowColor} cursor-default`}
              >
                <p className={`text-3xl md:text-4xl font-bold ${stat.color}`}>
                  {stat.isDecimal ? (
                    <>{stat.value}{stat.suffix}</>
                  ) : (
                    <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                  )}
                </p>
                <p className="text-white/60 text-sm mt-1">{stat.label}</p>
              </div>
            ))}
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
              More than just refundable gear — join a community of creators leveling up together
            </p>
            {/* Decorative underline */}
            <div className="mt-4 mx-auto w-24 h-1 rounded-full bg-gradient-to-r from-transparent via-orange-500/50 to-transparent" />
          </div>

          {/* Perks Grid with Individual Colored Glows */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: '👕',
                title: 'Refundable Premium Gear',
                description: 'Reversible shorts, hoodies, tees — the freshest basketball apparel delivered to your door.',
                borderColor: 'border-orange-500/20',
                hoverBorder: 'hover:border-orange-500/40',
                glowColor: 'hover:shadow-[0_0_30px_-5px_rgba(249,115,22,0.25)]',
              },
              {
                icon: '⭐',
                title: 'Get Featured',
                description: 'Top creators get featured on @thehoopgang with 100K+ followers watching.',
                borderColor: 'border-amber-500/20',
                hoverBorder: 'hover:border-amber-500/40',
                glowColor: 'hover:shadow-[0_0_30px_-5px_rgba(245,158,11,0.25)]',
              },
              {
                icon: '🎁',
                title: 'Early Access Drops',
                description: 'Be the first to rock new collections before anyone else.',
                borderColor: 'border-purple-500/20',
                hoverBorder: 'hover:border-purple-500/40',
                glowColor: 'hover:shadow-[0_0_30px_-5px_rgba(168,85,247,0.25)]',
              },
              {
                icon: '💰',
                title: 'Paid Opportunities',
                description: 'Unlock paid collaborations and ambassador programs.',
                borderColor: 'border-green-500/20',
                hoverBorder: 'hover:border-green-500/40',
                glowColor: 'hover:shadow-[0_0_30px_-5px_rgba(34,197,94,0.25)]',
              },
              {
                icon: '🤝',
                title: 'Creator Community',
                description: 'Connect with other basketball content creators and grow together.',
                borderColor: 'border-pink-500/20',
                hoverBorder: 'hover:border-pink-500/40',
                glowColor: 'hover:shadow-[0_0_30px_-5px_rgba(236,72,153,0.25)]',
              },
              {
                icon: '📈',
                title: 'Grow Your Brand',
                description: 'Level up your content with quality gear and brand partnerships.',
                borderColor: 'border-blue-500/20',
                hoverBorder: 'hover:border-blue-500/40',
                glowColor: 'hover:shadow-[0_0_30px_-5px_rgba(59,130,246,0.25)]',
              },
            ].map((perk, index) => (
              <div
                key={index}
                className={`group bg-zinc-900/50 backdrop-blur border ${perk.borderColor} rounded-2xl p-6 transition-all duration-300 hover:bg-zinc-900/70 ${perk.hoverBorder} ${perk.glowColor} hover:-translate-y-1`}
              >
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500/20 to-purple-500/20 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform duration-300">
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
            {/* Decorative underline */}
            <div className="mt-4 mx-auto w-24 h-1 rounded-full bg-gradient-to-r from-transparent via-orange-500/50 to-transparent" />
          </div>
          
          {/* Masonry-style Gallery with Enhanced Hover Effects */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {/* Large feature image */}
            <div className="col-span-2 md:col-span-1 md:row-span-2 relative group overflow-hidden rounded-2xl cursor-pointer">
              <Image
                src="/images/creators/team_photo.jpg"
                alt="TheHoopGang Team"
                width={408}
                height={512}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              {/* Glow border */}
              <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-orange-500/60 transition-all duration-300 pointer-events-none group-hover:shadow-[inset_0_0_30px_rgba(249,115,22,0.2)]" />
            </div>
            
            {/* Grid images */}
            <div className="relative group overflow-hidden rounded-2xl aspect-square cursor-pointer">
              <Image
                src="/images/creators/purple_crew.jpg"
                alt="TheHoopGang Crew"
                width={406}
                height={406}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-orange-500/60 transition-all duration-300 pointer-events-none group-hover:shadow-[inset_0_0_30px_rgba(249,115,22,0.2)]" />
            </div>
            
            <div className="relative group overflow-hidden rounded-2xl aspect-square cursor-pointer">
              <Image
                src="/images/creators/outdoor_crew.jpg"
                alt="TheHoopGang Outdoor"
                width={405}
                height={405}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-orange-500/60 transition-all duration-300 pointer-events-none group-hover:shadow-[inset_0_0_30px_rgba(249,115,22,0.2)]" />
            </div>
            
            <div className="relative group overflow-hidden rounded-2xl aspect-[3/4] cursor-pointer">
              <Image
                src="/images/creators/striped_duo.jpg"
                alt="TheHoopGang Duo"
                width={642}
                height={800}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-orange-500/60 transition-all duration-300 pointer-events-none group-hover:shadow-[inset_0_0_30px_rgba(249,115,22,0.2)]" />
            </div>
            
            <div className="relative group overflow-hidden rounded-2xl aspect-square cursor-pointer">
              <Image
                src="/images/creators/creator_stretch.jpg"
                alt="TheHoopGang Creator"
                width={225}
                height={239}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-orange-500/60 transition-all duration-300 pointer-events-none group-hover:shadow-[inset_0_0_30px_rgba(249,115,22,0.2)]" />
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section with Enhanced Glow */}
      <section className="py-24 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div 
            className="relative border border-orange-500/30 rounded-3xl p-8 sm:p-12 overflow-hidden transition-all duration-500 hover:shadow-[0_0_80px_-20px_rgba(249,115,22,0.4)] hover:border-orange-500/50"
            style={{
              background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.15), rgba(168, 85, 247, 0.1), rgba(249, 115, 22, 0.1))',
              boxShadow: '0 0 60px -20px rgba(249, 115, 22, 0.3)',
            }}
          >
            {/* Animated background shimmer */}
            <div 
              className="absolute inset-0 opacity-30 pointer-events-none"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
                animation: 'shimmer-bg 3s ease-in-out infinite',
              }}
            />
            
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />
            
            <div className="relative">
              <div className="mb-6 animate-float">
                <Image
                  src="/images/THG_logo_orange.png"
                  alt="TheHoopGang"
                  width={56}
                  height={56}
                  className="mx-auto"
                />
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Ready to Join the Squad?
              </h2>
              <p className="text-white/60 text-lg mb-8 max-w-xl mx-auto">
                Applications are open. Get your refundable gear and start creating content that matters.
              </p>
              <Link
                href="/apply"
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold text-lg rounded-xl hover:shadow-xl hover:shadow-orange-500/30 transition-all duration-300 hover:scale-105"
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
                alt="TheHoopGang"
                width={28}
                height={28}
              />
              <span className="text-lg font-bold bg-gradient-to-r from-orange-500 to-orange-400 bg-clip-text text-transparent">
                TheHoopGang
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
              © {new Date().getFullYear()} TheHoopGang. All rights reserved.
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}