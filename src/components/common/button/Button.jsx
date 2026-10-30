import React from "react";
import LoadingSpinner from "../LoadingSpinner";
import Icon from "../icon";
import {
  getButtonClasses,
  BUTTON_SPINNER_SIZES,
  BUTTON_SPINNER_COLORS,
} from "./buttonVariants";

/**
 * Common reusable Button component supporting variants, sizes, icons, and loading states.
 *
 * @param {Object} props
 * @param {React.ReactNode} [props.children] - Button content / label
 * @param {'button'|'submit'|'reset'} [props.type='button'] - HTML button type
 * @param {'primary'|'secondary'|'outline'|'ghost'|'danger'|'dangerOutline'} [props.variant='primary'] - Visual style variant
 * @param {'xs'|'sm'|'md'|'lg'|'icon'|'icon-sm'|'icon-xs'} [props.size='md'] - Button size
 * @param {boolean} [props.disabled=false] - Whether the button is disabled
 * @param {boolean} [props.loading=false] - Loading state with spinner
 * @param {boolean} [props.fullWidth=false] - Expand button width to 100%
 * @param {string|React.ReactNode} [props.icon=null] - Icon name (for Icon component) or custom SVG/React node
 * @param {'left'|'right'} [props.iconPosition='left'] - Position of the icon
 * @param {string} [props.className=''] - Additional Tailwind CSS classes
 * @param {Function} [props.onClick] - Click handler
 */
export default function Button({
  children,
  type = "button",
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  fullWidth = false,
  icon = null,
  iconPosition = "left",
  className = "",
  onClick,
  ...props
}) {
  const isDisabled = disabled || loading;

  const buttonClasses = getButtonClasses({
    variant,
    size,
    fullWidth,
    loading,
    className,
  });

  const spinnerSize = BUTTON_SPINNER_SIZES[size] || "sm";
  const spinnerColor = BUTTON_SPINNER_COLORS[variant] || "currentColor";

  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) return icon;
    if (typeof icon === "string") {
      const iconSize = size === "xs" || size === "icon-xs" ? "xs" : "sm";
      return <Icon name={icon} size={iconSize} />;
    }
    return null;
  };

  const renderedIcon = renderIcon();

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      onClick={isDisabled ? undefined : onClick}
      className={buttonClasses}
      {...props}
    >
      {loading && (
        <LoadingSpinner
          size={spinnerSize}
          color={spinnerColor}
          className="shrink-0"
        />
      )}

      {!loading && iconPosition === "left" && renderedIcon}

      {children && <span className="truncate">{children}</span>}

      {!loading && iconPosition === "right" && renderedIcon}
    </button>
  );
}
