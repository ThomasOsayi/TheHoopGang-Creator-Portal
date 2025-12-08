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
  const inputClasses = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500/50 transition-colors appearance-none cursor-pointer";

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Status Filter */}
        <div>
          <label className="block text-white/60 text-sm mb-2">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
            className={inputClasses}
          >
            <option value="" className="bg-zinc-900">All Status</option>
            {CREATOR_STATUSES.map((status) => (
              <option key={status.value} value={status.value} className="bg-zinc-900">
                {status.label}
              </option>
            ))}
          </select>
        </div>

        {/* Search Filter */}
        <div>
          <label className="block text-white/60 text-sm mb-2">Search</label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by name or handle..."
            className={inputClasses}
          />
        </div>

        {/* Min Followers Filter */}
        <div>
          <label className="block text-white/60 text-sm mb-2">Min Followers</label>
          <input
            type="number"
            value={minFollowers}
            onChange={(e) => onMinFollowersChange(e.target.value)}
            placeholder="e.g. 5000"
            className={inputClasses}
          />
        </div>
      </div>
    </div>
  );
}

