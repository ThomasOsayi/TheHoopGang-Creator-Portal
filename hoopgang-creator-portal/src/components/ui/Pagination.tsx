// src/components/ui/Pagination.tsx

'use client';

interface PaginationProps {
  currentPage: number;
  hasMore: boolean;
  onPrevious: () => void;
  onNext: () => void;
  loading?: boolean;
}

export function Pagination({
  currentPage,
  hasMore,
  onPrevious,
  onNext,
  loading = false,
}: PaginationProps) {
  return (
    <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/10">
      <div className="text-white/40 text-sm">
        Page <span className="text-white font-medium">{currentPage}</span>
      </div>
      
      <div className="flex items-center gap-2">
        <button
          onClick={onPrevious}
          disabled={currentPage === 1 || loading}
          className="px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white hover:border-white/20"
        >
          ← Previous
        </button>
        
        <button
          onClick={onNext}
          disabled={!hasMore || loading}
          className="px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white hover:border-white/20"
        >
          Next →
        </button>
      </div>
    </div>
  );
}