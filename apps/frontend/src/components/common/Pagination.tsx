import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount?: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  label?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalCount,
  limit,
  onPageChange,
  onLimitChange,
  label = 'records',
}) => {
  if (totalPages <= 1 && (!totalCount || totalCount <= limit)) {
    return null;
  }

  const startIdx = totalCount ? Math.min((currentPage - 1) * limit + 1, totalCount) : (currentPage - 1) * limit + 1;
  const endIdx = totalCount ? Math.min(currentPage * limit, totalCount) : currentPage * limit;

  // Generate page numbers window (up to 5 pages around current)
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxWindow = 5;

    if (totalPages <= maxWindow) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      let start = Math.max(1, currentPage - 2);
      let end = Math.min(totalPages, currentPage + 2);

      if (currentPage <= 3) {
        start = 1;
        end = 5;
      } else if (currentPage >= totalPages - 2) {
        start = totalPages - 4;
        end = totalPages;
      }

      if (start > 1) {
        pages.push(1);
        if (start > 2) pages.push('...');
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages) {
        if (end < totalPages - 1) pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-3 px-4 border-t border-gray-800 bg-gray-900/60 rounded-b-xl text-xs text-gray-400">
      {/* Count display */}
      <div className="flex items-center gap-2">
        <span>
          Showing <span className="font-semibold text-gray-200">{startIdx}</span> to{' '}
          <span className="font-semibold text-gray-200">{endIdx}</span>
          {totalCount != null && (
            <>
              {' '}of <span className="font-semibold text-gray-200">{totalCount}</span>
            </>
          )}{' '}
          {label}
        </span>

        {onLimitChange && (
          <div className="flex items-center gap-1.5 ml-4 pl-4 border-l border-gray-800">
            <span>Per page:</span>
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="bg-gray-800/80 border border-gray-700 text-gray-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        )}
      </div>

      {/* Page controls */}
      <div className="flex items-center gap-1">
        {/* First Page */}
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          aria-label="First page"
          className="p-1.5 rounded-lg border border-gray-800 bg-gray-800/40 text-gray-400 hover:text-gray-200 hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>

        {/* Prev Page */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Previous page"
          className="p-1.5 rounded-lg border border-gray-800 bg-gray-800/40 text-gray-400 hover:text-gray-200 hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* Number Buttons */}
        <div className="flex items-center gap-1 mx-1">
          {getPageNumbers().map((p, idx) =>
            typeof p === 'number' ? (
              <button
                key={idx}
                onClick={() => onPageChange(p)}
                className={`min-w-7 h-7 px-2 rounded-lg text-xs font-medium transition-colors ${
                  currentPage === p
                    ? 'bg-indigo-600 text-white font-semibold shadow-sm shadow-indigo-600/30'
                    : 'border border-gray-800 bg-gray-800/40 text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                }`}
              >
                {p}
              </button>
            ) : (
              <span key={idx} className="px-1 text-gray-600 select-none">
                {p}
              </span>
            )
          )}
        </div>

        {/* Next Page */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Next page"
          className="p-1.5 rounded-lg border border-gray-800 bg-gray-800/40 text-gray-400 hover:text-gray-200 hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        {/* Last Page */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages}
          aria-label="Last page"
          className="p-1.5 rounded-lg border border-gray-800 bg-gray-800/40 text-gray-400 hover:text-gray-200 hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
