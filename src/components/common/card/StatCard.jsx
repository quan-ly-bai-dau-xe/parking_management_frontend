import React from "react";

const colorStyles = {
  blue: {
    bg: "bg-blue-50 text-blue-600",
  },
  emerald: {
    bg: "bg-emerald-50 text-emerald-600",
  },
  amber: {
    bg: "bg-amber-50 text-amber-600",
  },
  rose: {
    bg: "bg-rose-50 text-rose-600",
  },
  slate: {
    bg: "bg-slate-100 text-slate-600",
  },
  violet: {
    bg: "bg-purple-50 text-purple-600",
  },
};

/**
 * StatCard component
 * Standard metric display card for dashboards and management pages.
 *
 * @param {Object} props
 * @param {string} props.title - Metric title / label
 * @param {string|number} props.value - Metric value
 * @param {import('react').ReactNode} [props.icon] - Icon element
 * @param {'blue'|'emerald'|'amber'|'rose'|'slate'|'violet'} [props.color='blue'] - Card theme color
 * @param {string} [props.subtext] - Secondary description or period label
 * @param {string} [props.className] - Additional classes
 */
export default function StatCard({
  title,
  value,
  icon,
  color = "blue",
  subtext,
  className = "",
}) {
  const colorConfig = colorStyles[color] || colorStyles.blue;

  return (
    <div
      className={`bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex items-center gap-3.5 ${className}`}
    >
      {icon && (
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 font-bold text-lg ${colorConfig.bg}`}
        >
          {icon}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-2xs font-medium text-slate-500 uppercase tracking-wider truncate">
          {title}
        </p>
        <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5 tracking-tight truncate">
          {value}
        </p>
        {subtext && (
          <p className="text-2xs text-slate-400 mt-0.5 truncate">{subtext}</p>
        )}
      </div>
    </div>
  );
}
