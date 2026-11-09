import React from "react";

/**
 * FormInput component
 * Standardized input component for forms and toolbars with optional label, error, helper text, and icons.
 *
 * @param {Object} props
 * @param {string} [props.label] - Field label
 * @param {string|number} [props.value] - Controlled input value
 * @param {Function} [props.onChange] - Change event handler
 * @param {string} [props.type='text'] - HTML input type (text, number, date, email, password, etc.)
 * @param {string} [props.placeholder] - Placeholder text
 * @param {string} [props.name] - Field name
 * @param {string} [props.id] - Field ID
 * @param {boolean} [props.required=false] - Whether field is required
 * @param {boolean} [props.disabled=false] - Whether field is disabled
 * @param {boolean} [props.readOnly=false] - Whether field is read-only
 * @param {string} [props.error] - Error message
 * @param {string} [props.helperText] - Supplementary hint text
 * @param {React.ReactNode} [props.leftIcon] - Icon or element rendered inside input on the left
 * @param {React.ReactNode} [props.rightIcon] - Icon or element rendered inside input on the right
 * @param {string} [props.size='md'] - 'sm' (h-8/text-2xs), 'md' (h-9.5/text-xs), 'lg' (h-11/text-sm)
 * @param {string} [props.className=''] - Additional class names for the input element
 * @param {string} [props.containerClassName=''] - Additional class names for the container wrapper
 */
export default function FormInput({
  label = "",
  value,
  onChange,
  type = "text",
  placeholder = "",
  name = "",
  id = "",
  required = false,
  disabled = false,
  readOnly = false,
  error = "",
  helperText = "",
  leftIcon = null,
  rightIcon = null,
  size = "md",
  className = "",
  containerClassName = "",
  ...rest
}) {
  const inputId = id || (name ? `input-${name}` : undefined);

  const sizeClasses = {
    sm: "h-8 text-2xs px-2.5 rounded-lg",
    md: "h-9.5 text-xs px-3 rounded-xl",
    lg: "h-11 text-sm px-3.5 rounded-xl",
  }[size] || "h-9.5 text-xs px-3 rounded-xl";

  const paddingLeftClass = leftIcon ? (size === "sm" ? "pl-8" : "pl-9") : "";
  const paddingRightClass = rightIcon ? (size === "sm" ? "pr-8" : "pr-9") : "";

  const stateClasses = error
    ? "border-rose-400 bg-rose-50/20 text-rose-900 placeholder-rose-300 focus:border-rose-500 focus:ring-rose-500/20"
    : "border-slate-200 bg-white text-slate-800 placeholder-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-blue-500/20";

  return (
    <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="flex items-center gap-1 text-xs font-semibold text-slate-700 select-none"
        >
          <span>{label}</span>
          {required && <span className="text-rose-500 font-bold">*</span>}
        </label>
      )}

      <div className="relative flex items-center w-full">
        {leftIcon && (
          <div className="absolute left-3 flex items-center pointer-events-none text-slate-400">
            {leftIcon}
          </div>
        )}

        <input
          id={inputId}
          name={name}
          type={type}
          value={value ?? ""}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          readOnly={readOnly}
          className={`w-full border outline-none transition-all duration-150 focus:ring-2 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed ${sizeClasses} ${paddingLeftClass} ${paddingRightClass} ${stateClasses} ${className}`}
          {...rest}
        />

        {rightIcon && (
          <div className="absolute right-3 flex items-center text-slate-400">
            {rightIcon}
          </div>
        )}
      </div>

      {error ? (
        <p className="text-[11px] text-rose-500 font-medium leading-none">{error}</p>
      ) : helperText ? (
        <p className="text-[11px] text-slate-500 leading-none">{helperText}</p>
      ) : null}
    </div>
  );
}
