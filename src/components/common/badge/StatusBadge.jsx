/**
 * StatusBadge component
 * Centralizes vehicle and parking status badge rendering across the application.
 *
 * @param {Object} props
 * @param {'parked'|'active'|'in_transit'|'left'|'maintenance'|string} props.status - Status identifier
 * @param {string} [props.label] - Optional custom label to override default status text
 * @param {boolean} [props.showDot=true] - Whether to show the status indicator dot
 * @param {'sm'|'md'} [props.size='sm'] - Badge size
 * @param {string} [props.className=''] - Additional custom classes
 */
export default function StatusBadge({
  status,
  label = "",
  showDot = true,
  size = "sm",
  className = "",
}) {
  const statusConfig = {
    parked: {
      label: "Đang đỗ",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
      dotClass: "bg-emerald-500",
    },
    active: {
      label: "Đang hoạt động",
      badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
      dotClass: "bg-blue-500",
    },
    in_transit: {
      label: "Đang di chuyển",
      badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
      dotClass: "bg-slate-400",
    },
    left: {
      label: "Đã rời bãi",
      badgeClass: "bg-slate-100 text-slate-600 border-slate-200",
      dotClass: "bg-slate-400",
    },
    maintenance: {
      label: "Bảo trì",
      badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
      dotClass: "bg-amber-500",
    },
  };

  const current = statusConfig[status] || {
    label: label || status || "Không xác định",
    badgeClass: "bg-slate-100 text-slate-600 border-slate-200",
    dotClass: "bg-slate-400",
  };

  const displayLabel = label || current.label;

  const sizeClasses =
    size === "md"
      ? "px-3 py-1 text-xs"
      : "px-2.5 py-0.5 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium border ${current.badgeClass} ${sizeClasses} ${className}`}
    >
      {showDot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${current.dotClass}`}
          aria-hidden="true"
        />
      )}
      <span>{displayLabel}</span>
    </span>
  );
}
