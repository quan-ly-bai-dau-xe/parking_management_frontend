/**
 * PageToolbar component
 * Shared filter toolbar container card with integrated search & reset action buttons.
 *
 * @param {Object} props
 * @param {import('react').ReactNode} props.children - Filter inputs and dropdowns
 * @param {Function} [props.onSearch] - Search submit handler
 * @param {Function} [props.onReset] - Filter reset handler
 * @param {string} [props.searchLabel='Tìm kiếm'] - Label for search button
 * @param {string} [props.resetLabel='Làm mới'] - Label for reset button
 * @param {import('react').ReactNode} [props.actions] - Optional custom actions element overriding default buttons
 * @param {string} [props.gridCols='grid-cols-1 sm:grid-cols-2 md:grid-cols-4'] - Grid columns layout class
 * @param {string} [props.className=''] - Additional container classes
 */
export default function PageToolbar({
  children,
  onSearch = null,
  onReset = null,
  searchLabel = "Tìm kiếm",
  resetLabel = "Làm mới",
  actions = null,
  gridCols = "grid-cols-1 sm:grid-cols-2 md:grid-cols-4",
  className = "",
}) {
  const showDefaultActions = Boolean(onSearch || onReset);

  return (
    <div
      className={`bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 ${className}`}
    >
      <div className={`grid ${gridCols} gap-3.5`}>
        {children}

        {/* Custom Actions if provided */}
        {actions}

        {/* Default Search & Reset Actions */}
        {!actions && showDefaultActions && (
          <div className="flex items-end gap-2">
            {onSearch && (
              <button
                type="button"
                onClick={onSearch}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <span>{searchLabel}</span>
              </button>
            )}

            {onReset && (
              <button
                type="button"
                onClick={onReset}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-medium transition-colors cursor-pointer"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <span>{resetLabel}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
