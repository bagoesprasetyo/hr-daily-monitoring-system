import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

/**
 * Reusable Modern Pagination Component
 * Always visible on every table so users can see data counts and pagination controls.
 * 
 * @param {number} currentPage - 1-based current page index
 * @param {number} totalPages - total number of pages
 * @param {number} totalItems - total count of items
 * @param {number} pageSize - items displayed per page
 * @param {function} onPageChange - callback when page changes (newPage: number)
 * @param {function} [onPageSizeChange] - optional callback when page size changes
 * @param {string} [itemName='data'] - descriptive noun for items (e.g. 'visitor', 'tiket')
 */
export default function Pagination({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  itemName = 'data'
}) {
  const safeTotalPages = Math.max(1, totalPages || 1);
  const safeCurrentPage = Math.min(Math.max(1, currentPage || 1), safeTotalPages);
  const startItem = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endItem = Math.min(safeCurrentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-200 bg-gray-50/80 text-xs select-none">
      {/* Left side: Information & Page Size Selector */}
      <div className="flex items-center gap-3">
        <span className="text-gray-600 font-medium">
          {totalItems === 0 ? (
            <span>Tidak ada {itemName}</span>
          ) : (
            <>
              Menampilkan <span className="font-bold text-text-primary">{startItem}</span>–<span className="font-bold text-text-primary">{endItem}</span> dari <span className="font-bold text-text-primary">{totalItems}</span> {itemName}
            </>
          )}
        </span>

        {/* Optional Page Size Selector */}
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 text-gray-500 ml-2">
            <span>Per hal:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                onPageChange(1);
              }}
              className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs font-semibold text-text-primary focus:outline-none focus:border-surface-strong cursor-pointer shadow-2xs"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        )}
      </div>

      {/* Right side: Navigation buttons */}
      <div className="flex items-center gap-1.5">
        {/* First page button */}
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={safeCurrentPage <= 1}
          title="Halaman Pertama"
          className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:text-surface-strong hover:border-surface-strong/40 hover:bg-blue-50/50 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-gray-600 disabled:hover:border-gray-200 transition-all shadow-2xs cursor-pointer"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>

        {/* Previous page button */}
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, safeCurrentPage - 1))}
          disabled={safeCurrentPage <= 1}
          title="Sebelumnya"
          className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:text-surface-strong hover:border-surface-strong/40 hover:bg-blue-50/50 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-gray-600 disabled:hover:border-gray-200 transition-all shadow-2xs cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* Page indicator */}
        <div className="flex items-center gap-1.5 px-2 py-1 bg-white border border-gray-200 rounded-lg shadow-2xs">
          <span className="text-[11px] font-bold text-surface-strong px-1.5 py-0.5 bg-blue-50 rounded">
            {safeCurrentPage}
          </span>
          <span className="text-gray-400 font-medium text-[11px]">/</span>
          <span className="text-gray-600 font-bold text-[11px] px-1">
            {safeTotalPages}
          </span>
        </div>

        {/* Next page button */}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(safeTotalPages, safeCurrentPage + 1))}
          disabled={safeCurrentPage >= safeTotalPages}
          title="Berikutnya"
          className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:text-surface-strong hover:border-surface-strong/40 hover:bg-blue-50/50 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-gray-600 disabled:hover:border-gray-200 transition-all shadow-2xs cursor-pointer"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        {/* Last page button */}
        <button
          type="button"
          onClick={() => onPageChange(safeTotalPages)}
          disabled={safeCurrentPage >= safeTotalPages}
          title="Halaman Terakhir"
          className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:text-surface-strong hover:border-surface-strong/40 hover:bg-blue-50/50 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-gray-600 disabled:hover:border-gray-200 transition-all shadow-2xs cursor-pointer"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
