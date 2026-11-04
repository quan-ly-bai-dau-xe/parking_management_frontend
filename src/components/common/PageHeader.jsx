import React from "react";

/**
 * PageHeader component
 * Standardized page-level header with title, description, optional breadcrumb, and action slots.
 *
 * @param {Object} props
 * @param {string} props.title - Primary page title
 * @param {string} [props.description] - Subtitle or page description
 * @param {import('react').ReactNode} [props.breadcrumb] - Breadcrumb component or breadcrumb text
 * @param {import('react').ReactNode} [props.actions] - Action buttons / controls on the right
 * @param {string} [props.className] - Additional wrapper class names
 */
export default function PageHeader({
  title,
  description,
  breadcrumb,
  actions,
  className = "",
}) {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${className}`}
    >
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {description}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {breadcrumb && (
          <div className="text-xs text-slate-400 select-none">
            {breadcrumb}
          </div>
        )}
        {actions}
      </div>
    </div>
  );
}
