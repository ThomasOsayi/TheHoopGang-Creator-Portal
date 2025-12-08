'use client';

import { Button } from './Button';

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
      <div className="text-white/50 text-sm">
        Page {currentPage}
      </div>
      <div className="flex items-center gap-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={onPrevious}
          disabled={currentPage === 1 || loading}
        >
          ← Previous
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={onNext}
          disabled={!hasMore || loading}
        >
          Next →
        </Button>
      </div>
    </div>
  );
}

