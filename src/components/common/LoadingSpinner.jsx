/**
 * LoadingSpinner component
 * Reusable animated spinner for asynchronous actions, buttons, and page loads.
 *
 * @param {Object} props
 * @param {'xs'|'sm'|'md'|'lg'|'xl'} [props.size='md'] - Spinner dimensions
 * @param {string} [props.color='text-blue-600'] - Tailwind text color class for the spinner
 * @param {string} [props.label] - Optional descriptive text (e.g. "Đang tải...")
 * @param {boolean} [props.fullScreen=false] - Whether to render centered in full screen
 * @param {string} [props.className=''] - Additional container classes
 */
export default function LoadingSpinner({
  size = "md",
  color = "text-blue-600",
  label = "",
  fullScreen = false,
  className = "",
}) {
  const sizeMap = {
    xs: "h-3.5 w-3.5",
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-8 w-8",
    xl: "h-10 w-10",
  };

  const spinnerSizeClass = sizeMap[size] || sizeMap.md;

  const spinnerSvg = (
    <svg
      className={`animate-spin ${spinnerSizeClass} ${color}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );

  if (fullScreen) {
    return (
      <div className={`min-h-screen bg-slate-50 flex items-center justify-center p-4 ${className}`}>
        <div className="flex items-center gap-3 text-slate-600 font-medium text-sm">
          {spinnerSvg}
          {label && <span>{label}</span>}
        </div>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {spinnerSvg}
      {label && <span className="text-xs font-medium text-slate-600">{label}</span>}
    </div>
  );
}
