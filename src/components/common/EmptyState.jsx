/**
 * EmptyState component
 * Displays a clean placeholder when a list, table, or dataset is empty.
 *
 * @param {Object} props
 * @param {string} [props.title='Chưa có dữ liệu'] - Primary title message
 * @param {string} [props.description] - Optional secondary guidance text
 * @param {import('react').ReactNode} [props.icon] - Optional custom icon element
 * @param {import('react').ReactNode} [props.action] - Optional call-to-action button or node
 * @param {string} [props.className=''] - Additional container classes
 */
export default function EmptyState({
  title = "Chưa có dữ liệu",
  description = "",
  icon = null,
  action = null,
  className = "",
}) {
  return (
    <div
      className={`py-16 sm:py-24 flex flex-col items-center justify-center text-center ${className}`}
    >
      {/* Icon */}
      <div className="w-14 h-14 mb-3 rounded-2xl flex items-center justify-center text-slate-300">
        {icon || (
          <svg
            className="w-10 h-10 stroke-[1.5]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
          </svg>
        )}
      </div>

      {/* Title */}
      <p className="text-xs font-normal text-slate-400">{title}</p>

      {/* Optional Description */}
      {description && (
        <p className="text-xs text-slate-400 mt-1 max-w-sm">{description}</p>
      )}

      {/* Optional Action Button */}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
