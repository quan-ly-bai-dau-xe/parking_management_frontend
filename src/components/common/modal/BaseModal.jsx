import { useEffect } from "react";

/**
 * BaseModal component
 * Khung Modal chuẩn dùng chung cho toàn bộ hệ thống:
 * - Tự động hỗ trợ phím ESC và bấm ra ngoài backdrop để đóng modal.
 * - Khóa cuộn trang (scroll lock) khi modal đang mở.
 * - Hỗ trợ các kích thước chuẩn (sm, md, lg, xl, 2xl, 3xl, 4xl, full).
 * - Tùy biến Header, Footer hoặc ẩn hiện nút đóng.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Trạng thái hiển thị modal
 * @param {Function} props.onClose - Hàm gọi khi đóng modal
 * @param {string|import('react').ReactNode} [props.title] - Tiêu đề modal
 * @param {string|import('react').ReactNode} [props.description] - Mô tả phụ dưới tiêu đề
 * @param {'sm'|'md'|'lg'|'xl'|'2xl'|'3xl'|'4xl'|'full'} [props.size='md'] - Độ rộng tối đa của modal
 * @param {boolean} [props.showCloseButton=true] - Hiển thị nút '✕' ở góc trên bên phải
 * @param {boolean} [props.closeOnBackdrop=true] - Đóng khi click vào backdrop
 * @param {boolean} [props.closeOnEsc=true] - Đóng khi nhấn phím ESC
 * @param {import('react').ReactNode} [props.header] - Tùy biến toàn bộ phần header
 * @param {import('react').ReactNode} [props.footer] - Phần footer (nút hành động)
 * @param {string} [props.className=''] - Class CSS bổ sung cho khung modal card
 * @param {string} [props.bodyClassName=''] - Class CSS bổ sung cho phần body
 * @param {import('react').ReactNode} props.children - Nội dung bên trong modal
 */
export default function BaseModal({
  isOpen,
  onClose,
  title = null,
  description = null,
  size = "md",
  showCloseButton = true,
  closeOnBackdrop = true,
  closeOnEsc = true,
  header = null,
  footer = null,
  className = "",
  bodyClassName = "",
  children,
}) {
  // Lắng nghe phím ESC & scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (closeOnEsc && e.key === "Escape") {
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, closeOnEsc, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "3xl": "max-w-3xl",
    "4xl": "max-w-4xl",
    full: "max-w-full m-4",
  };

  const modalWidth = sizeClasses[size] || sizeClasses.md;

  const handleBackdropClick = () => {
    if (closeOnBackdrop) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div
        className={`relative z-10 w-full ${modalWidth} bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden max-h-[90vh] ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Custom Header hoặc Default Header */}
        {header !== null ? (
          header
        ) : title ? (
          <div className="flex items-start justify-between gap-3 p-5 sm:p-6 border-b border-slate-100 shrink-0">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                {title}
              </h3>
              {description && (
                <p className="text-xs text-slate-500 mt-0.5">{description}</p>
              )}
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
        ) : showCloseButton ? (
          <div className="absolute top-4 right-4 z-10">
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Đóng"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : null}

        {/* Modal Body */}
        <div className={`overflow-y-auto flex-1 p-5 sm:p-6 ${bodyClassName}`}>
          {children}
        </div>

        {/* Modal Footer */}
        {footer && (
          <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/50 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
