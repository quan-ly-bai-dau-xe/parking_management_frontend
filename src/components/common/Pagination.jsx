import { Fragment } from "react";

/**
 * Pagination component
 * Shared page navigation control reused across list/table pages.
 *
 * Renders a row of page buttons (skipped pages collapse into "…") plus an
 * optional record range summary, e.g. "Hiển thị 1–10 / 78 bản ghi".
 *
 * @param {Object} props
 * @param {number} props.currentPage - Current page (1-based)
 * @param {number} props.totalPages - Total number of pages
 * @param {(page: number) => void} props.onPageChange - Called with the target page
 * @param {number} [props.totalItems] - Total record count, enables the summary line
 * @param {number} [props.itemsPerPage] - Records per page, used to compute the displayed range
 * @param {(itemsPerPage: number) => void} [props.onItemsPerPageChange] - Called when page size changes
 * @param {number[]} [props.itemsPerPageOptions=[5, 10, 20]] - Page size options
 * @param {number} [props.maxVisiblePages=5] - Max numeric page buttons rendered
 * @param {'sm'|'md'} [props.size='md'] - Control size
 * @param {string} [props.className=''] - Extra classes for the wrapper
 */
export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
  onItemsPerPageChange,
  itemsPerPageOptions = [5, 10, 20],
  maxVisiblePages = 5,
  size = "md",
  className = "",
}) {
  const total = Math.max(0, Math.floor(totalPages) || 0);
  const safePage = Math.min(Math.max(currentPage || 1, 1), Math.max(total, 1));

  // First and last page are always visible; the rest is a window around the current page
  const getVisiblePages = () => {
    const innerSize = Math.max(1, maxVisiblePages - 2);
    const half = Math.floor((innerSize - 1) / 2);
    let start = Math.max(1, safePage - half);
    let end = Math.min(total, start + innerSize - 1);
    start = Math.max(1, end - innerSize + 1);

    const pages = new Set([1, total]);
    for (let page = start; page <= end; page++) pages.add(page);
    return [...pages].sort((a, b) => a - b);
  };

  const visiblePages = total > 1 ? getVisiblePages() : [];

  const goTo = (page) => {
    const target = Math.min(Math.max(page, 1), total);
    if (target !== safePage) onPageChange(target);
  };

  const buttonSize = size === "sm" ? "w-7 h-7" : "w-8 h-8";
  const baseButton = `flex items-center justify-center border rounded-lg transition-colors text-xs font-medium ${buttonSize}`;

  const hasPrevious = safePage > 1;
  const hasNext = safePage < total;

  const prevButton = (
    <button
      type="button"
      onClick={() => goTo(safePage - 1)}
      disabled={!hasPrevious}
      aria-label="Trang trước"
      className={`${baseButton} ${
        hasPrevious
          ? "border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
          : "border-slate-100 text-slate-300 bg-slate-50/50 cursor-not-allowed"
      }`}
    >
      <svg
        className="w-3.5 h-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 19l-7-7 7-7"
        />
      </svg>
    </button>
  );

  const nextButton = (
    <button
      type="button"
      onClick={() => goTo(safePage + 1)}
      disabled={!hasNext}
      aria-label="Trang sau"
      className={`${baseButton} ${
        hasNext
          ? "border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
          : "border-slate-100 text-slate-300 bg-slate-50/50 cursor-not-allowed"
      }`}
    >
      <svg
        className="w-3.5 h-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 5l7 7-7 7"
        />
      </svg>
    </button>
  );

  // Record range summary, e.g. "Hiển thị 1–10 / 78 bản ghi"
  const hasSummary = Number.isFinite(totalItems) && totalItems > 0;
  const perPage = itemsPerPage > 0 ? itemsPerPage : total;
  const rangeStart = (safePage - 1) * perPage + 1;
  const rangeEnd = Math.min(safePage * perPage, totalItems);

  if (total <= 1 && !hasSummary) return null;

  return (
    <nav
      className={`flex w-auto max-w-full min-w-0 flex-col items-center justify-between gap-3 sm:flex-row ${className}`}
      aria-label="Phân trang"
    >
      {onItemsPerPageChange && (
        <label className="flex items-center gap-2 text-xs text-slate-500" htmlFor="items-per-page">
          Số bản ghi/trang
          <select
            id="items-per-page"
            value={itemsPerPage}
            onChange={(event) => onItemsPerPageChange(Number(event.target.value))}
            className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none"
          >
            {itemsPerPageOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="flex flex-col items-center gap-2">
        {total > 1 && (
          <div className="flex items-center gap-1">
          {prevButton}

          {visiblePages.map((page, index) => {
            // Collapse skipped pages into an ellipsis
            const previousPage = index > 0 ? visiblePages[index - 1] : 0;
            const hasGap = index > 0 && page - previousPage > 1;

            return (
              <Fragment key={page}>
                {hasGap && (
                  <span className="px-1 text-xs text-slate-400">…</span>
                )}
                <button
                  type="button"
                  onClick={() => goTo(page)}
                  aria-current={page === safePage ? "page" : undefined}
                  className={`${baseButton} ${
                    page === safePage
                      ? "bg-blue-600 text-white border-blue-600 cursor-default"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                  }`}
                >
                  {page}
                </button>
              </Fragment>
            );
          })}

          {nextButton}
          </div>
        )}

        {hasSummary && (
          <p className="text-xs text-slate-500">
            Hiển thị {rangeStart}–{rangeEnd} / {totalItems} bản ghi
          </p>
        )}
      </div>
    </nav>
  );
}
