// src/components/creators/FilterBar.tsx

'use client';

import { useState } from 'react';
import { CREATOR_STATUSES } from '@/lib/constants';

interface FilterBarProps {
  statusFilter: string;
  searchQuery: string;
  minFollowers: string;
  onStatusChange: (status: string) => void;
  onSearchChange: (query: string) => void;
  onMinFollowersChange: (min: string) => void;
}

export default function FilterBar({
  statusFilter,
  searchQuery,
  minFollowers,
  onStatusChange,
  onSearchChange,
  onMinFollowersChange,
}: FilterBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Count active filters
  const activeFilterCount = [statusFilter, searchQuery, minFollowers].filter(Boolean).length;

  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl mb-6 hover:border-white/15 transition-all duration-300 overflow-hidden">
      {/* Mobile Toggle Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full md:hidden flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span className="text-white font-medium">Filters</span>
          {activeFilterCount > 0 && (
            <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {activeFilterCount}
            </span>
          )}
        </div>
        <svg 
          className={`w-5 h-5 text-white/50 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Filter Content - Always visible on desktop, toggleable on mobile */}
      <div className={`p-4 pt-0 md:pt-4 md:block ${isExpanded ? 'block' : 'hidden'}`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Status Filter */}
          <div>
            <label className="block text-white/50 text-xs font-medium uppercase tracking-wider mb-2">
              Status
            </label>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => onStatusChange(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all appearance-none cursor-pointer hover:bg-white/[0.08] min-h-[44px]"
              >
                <option value="" className="bg-zinc-900">All Status</option>
                {CREATOR_STATUSES.map((status) => (
                  <option key={status.value} value={status.value} className="bg-zinc-900">
                    {status.label}
                  </option>
                ))}
              </select>
              {/* Custom dropdown arrow */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/40">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              {/* Active indicator */}
              {statusFilter && (
                <div className="absolute right-10 top-1/2 -translate-y-1/2 w-2 h-2 bg-orange-500 rounded-full" />
              )}
            </div>
          </div>

          {/* Search Filter */}
          <div>
            <label className="block text-white/50 text-xs font-medium uppercase tracking-wider mb-2">
              Search
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search by name or handle..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pl-10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all hover:bg-white/[0.08] min-h-[44px]"
              />
              {/* Search icon */}
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/40">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              {/* Clear button - Larger tap target */}
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors p-1.5 hover:bg-white/10 rounded-lg"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Min Followers Filter */}
          <div>
            <label className="block text-white/50 text-xs font-medium uppercase tracking-wider mb-2">
              Min Followers
            </label>
            <div className="relative">
              <input
                type="number"
                inputMode="numeric"
                value={minFollowers}
                onChange={(e) => onMinFollowersChange(e.target.value)}
                placeholder="e.g. 5000"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pl-10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all hover:bg-white/[0.08] min-h-[44px]"
              />
              {/* Users icon */}
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/40">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              {/* Clear button */}
              {minFollowers && (
                <button
                  onClick={() => onMinFollowersChange('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors p-1.5 hover:bg-white/10 rounded-lg"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Clear All Filters - Mobile only */}
        {activeFilterCount > 0 && (
          <button
            onClick={() => {
              onStatusChange('');
              onSearchChange('');
              onMinFollowersChange('');
            }}
            className="mt-4 md:hidden w-full py-2.5 text-sm text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Clear All Filters
          </button>
        )}
      </div>
    </div>
  );
}