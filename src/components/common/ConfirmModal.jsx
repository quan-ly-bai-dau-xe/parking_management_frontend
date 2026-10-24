import LoadingSpinner from "./LoadingSpinner";

/**
 * ConfirmModal component
 * Unified accessible modal overlay with support for confirmation actions,
 * status variants (info, success, warning, error), and custom form/body content.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is visible
 * @param {Function} props.onClose - Callback triggered on closing modal
 * @param {string|import('react').ReactNode} props.title - Modal header title
 * @param {string|import('react').ReactNode} [props.description] - Optional subtext/description
 * @param {'info'|'success'|'warning'|'error'} [props.variant='info'] - Semantic color scheme
 * @param {import('react').ReactNode} [props.icon] - Optional custom icon
 * @param {import('react').ReactNode} [props.children] - Modal body content
 * @param {string} [props.confirmText='Xác nhận'] - Confirm button label
 * @param {string} [props.cancelText='Hủy'] - Cancel button label
 * @param {Function} [props.onConfirm] - Callback triggered when confirm button is clicked
 * @param {boolean} [props.loading=false] - Whether confirmation action is pending
 * @param {boolean} [props.showFooter=true] - Whether to render default action buttons
 * @param {boolean} [props.showCloseButton=true] - Whether to show the top-right close button
 * @param {'sm'|'md'|'lg'|'xl'|'2xl'} [props.size='md'] - Max width of modal container
 * @param {string} [props.className=''] - Additional modal container classes
 */
export default function ConfirmModal({
  isOpen,
  onClose,
  title,
  description = "",
  variant = "info",
  icon = null,
  children = null,
  confirmText = "Xác nhận",
  cancelText = "Hủy",
  onConfirm = null,
  loading = false,
  showFooter = true,
  showCloseButton = true,
  size = "md",
  className = "",
}) {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
  };

  const modalWidth = sizeClasses[size] || sizeClasses.md;

  const variantStyles = {
    info: {
      iconBg: "bg-blue-50 text-blue-600",
      confirmBtn: "bg-blue-600 hover:bg-blue-700 text-white",
      iconSvg: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    success: {
      iconBg: "bg-emerald-50 text-emerald-600",
      confirmBtn: "bg-emerald-600 hover:bg-emerald-700 text-white",
      iconSvg: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
        </svg>
      ),
    },
    warning: {
      iconBg: "bg-amber-50 text-amber-600",
      confirmBtn: "bg-amber-600 hover:bg-amber-700 text-white",
      iconSvg: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
    error: {
      iconBg: "bg-red-50 text-red-600",
      confirmBtn: "bg-red-600 hover:bg-red-700 text-white",
      iconSvg: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  };

  const currentVariant = variantStyles[variant] || variantStyles.info;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop click closer */}
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div
        className={`relative z-10 w-full ${modalWidth} bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 sm:p-7 flex flex-col overflow-hidden max-h-[90vh] ${className}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${currentVariant.iconBg}`}
            >
              {icon || currentVariant.iconSvg}
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                {title}
              </h3>
              {description && (
                <p className="text-xs text-slate-500 mt-0.5">{description}</p>
              )}
            </div>
          </div>

          {showCloseButton && (
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
              aria-label="Đóng"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Modal Body / Children */}
        {children && (
          <div className="overflow-y-auto flex-1 my-2 text-xs sm:text-sm text-slate-700">
            {children}
          </div>
        )}

        {/* Footer actions */}
        {showFooter && (
          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="py-2 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              {cancelText}
            </button>
            {onConfirm && (
              <button
                type="button"
                onClick={onConfirm}
                disabled={loading}
                className={`py-2 px-4 rounded-xl text-xs font-semibold shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 ${currentVariant.confirmBtn}`}
              >
                {loading && <LoadingSpinner size="xs" color="text-white" />}
                <span>{confirmText}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
