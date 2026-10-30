/**
 * Button variants configuration and style mappings
 * Defines the styling tokens and utility classes for the common Button component.
 */

export const BUTTON_VARIANTS = {
  primary:
    "bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-2xs border border-transparent focus-visible:ring-blue-500",
  secondary:
    "bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 border border-slate-300 shadow-2xs hover:border-slate-400 focus-visible:ring-slate-400",
  outline:
    "bg-transparent hover:bg-slate-100 active:bg-slate-200 text-slate-700 border border-slate-200 focus-visible:ring-slate-400",
  ghost:
    "bg-transparent hover:bg-slate-100 active:bg-slate-200 text-slate-700 border border-transparent focus-visible:ring-slate-400",
  danger:
    "bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-2xs border border-transparent focus-visible:ring-rose-500",
  dangerOutline:
    "bg-transparent hover:bg-rose-50 active:bg-rose-100 text-rose-600 border border-rose-200 hover:border-rose-300 focus-visible:ring-rose-400",
};

export const BUTTON_SIZES = {
  xs: "h-7 px-2.5 text-xs gap-1.5 rounded-lg",
  sm: "h-8 px-3 text-xs gap-1.5 rounded-lg",
  md: "h-9 px-4 py-2 text-xs sm:text-sm gap-2 rounded-lg",
  lg: "h-10 px-5 text-sm gap-2.5 rounded-lg",
  icon: "h-9 w-9 p-0 rounded-lg justify-center",
  "icon-sm": "h-8 w-8 p-0 rounded-lg justify-center",
  "icon-xs": "h-7 w-7 p-0 rounded-lg justify-center",
};

export const BUTTON_SPINNER_SIZES = {
  xs: "xs",
  sm: "xs",
  md: "sm",
  lg: "sm",
  icon: "xs",
  "icon-sm": "xs",
  "icon-xs": "xs",
};

export const BUTTON_SPINNER_COLORS = {
  primary: "text-white",
  secondary: "text-slate-600",
  outline: "text-slate-600",
  ghost: "text-slate-600",
  danger: "text-white",
  dangerOutline: "text-rose-600",
};

/**
 * Get composite class names for a button based on props
 *
 * @param {Object} options
 * @param {keyof typeof BUTTON_VARIANTS} [options.variant='primary']
 * @param {keyof typeof BUTTON_SIZES} [options.size='md']
 * @param {boolean} [options.fullWidth=false]
 * @param {boolean} [options.disabled=false]
 * @param {boolean} [options.loading=false]
 * @param {string} [options.className='']
 * @returns {string} Concatenated Tailwind CSS classes
 */
export function getButtonClasses({
  variant = "primary",
  size = "md",
  fullWidth = false,
  loading = false,
  className = "",
} = {}) {
  const baseClasses =
    "inline-flex items-center justify-center font-semibold transition-all select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50";

  const variantClass = BUTTON_VARIANTS[variant] || BUTTON_VARIANTS.primary;
  const sizeClass = BUTTON_SIZES[size] || BUTTON_SIZES.md;
  const widthClass = fullWidth ? "w-full" : "";
  const loadingClass = loading ? "pointer-events-none relative" : "";

  return [baseClasses, variantClass, sizeClass, widthClass, loadingClass, className]
    .filter(Boolean)
    .join(" ");
}
