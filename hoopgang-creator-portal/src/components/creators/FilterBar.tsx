// src/components/creators/FilterBar.tsx

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
  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 mb-6 hover:border-white/15 transition-all duration-300">
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
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all appearance-none cursor-pointer hover:bg-white/[0.08]"
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
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 pl-10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all hover:bg-white/[0.08]"
            />
            {/* Search icon */}
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/40">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            {/* Clear button */}
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
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
              value={minFollowers}
              onChange={(e) => onMinFollowersChange(e.target.value)}
              placeholder="e.g. 5000"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 pl-10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all hover:bg-white/[0.08]"
            />
            {/* Users icon */}
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/40">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}