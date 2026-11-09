import React from "react";

/**
 * FormSelect component
 * Standardized select dropdown for modal forms and settings panels.
 *
 * @param {Object} props
 * @param {string} [props.label] - Field label
 * @param {string|number} [props.value] - Controlled select value
 * @param {Function} [props.onChange] - Change event handler
 * @param {Array<{value: string|number, label: string}|string>} [props.options=[]] - Select options
 * @param {string} [props.placeholder='Chọn...'] - Default prompt label
 * @param {string} [props.name] - Field name
 * @param {string} [props.id] - Field ID
 * @param {boolean} [props.required=false] - Whether field is required
 * @param {boolean} [props.disabled=false] - Whether field is disabled
 * @param {string} [props.error] - Error message
 * @param {string} [props.helperText] - Supplementary hint text
 * @param {string} [props.size='md'] - 'sm', 'md', 'lg'
 * @param {string} [props.className=''] - Additional select classes
 * @param {string} [props.containerClassName=''] - Additional container classes
 */
export default function FormSelect({
  label = "",
  value,
  onChange,
  options = [],
  placeholder = "Chọn...",
  name = "",
  id = "",
  required = false,
  disabled = false,
  error = "",
  helperText = "",
  size = "md",
  className = "",
  containerClassName = "",
  ...rest
}) {
  const selectId = id || (name ? `select-${name}` : undefined);

  const sizeClasses = {
    sm: "h-8 text-2xs px-2.5 rounded-lg",
    md: "h-9.5 text-xs px-3 rounded-xl",
    lg: "h-11 text-sm px-3.5 rounded-xl",
  }[size] || "h-9.5 text-xs px-3 rounded-xl";

  const stateClasses = error
    ? "border-rose-400 bg-rose-50/20 text-rose-900 focus:border-rose-500 focus:ring-rose-500/20"
    : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 focus:border-blue-500 focus:ring-blue-500/20";

  return (
    <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
      {label && (
        <label
          htmlFor={selectId}
          className="flex items-center gap-1 text-xs font-semibold text-slate-700 select-none"
        >
          <span>{label}</span>
          {required && <span className="text-rose-500 font-bold">*</span>}
        </label>
      )}

      <select
        id={selectId}
        name={name}
        value={value ?? ""}
        onChange={onChange}
        required={required}
        disabled={disabled}
        className={`w-full border outline-none transition-all duration-150 focus:ring-2 cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed ${sizeClasses} ${stateClasses} ${className}`}
        {...rest}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => {
          const optionValue = typeof option === "object" && option !== null ? option.value : option;
          const optionLabel = typeof option === "object" && option !== null ? option.label : option;
          return (
            <option key={String(optionValue)} value={optionValue}>
              {optionLabel}
            </option>
          );
        })}
      </select>

      {error ? (
        <p className="text-[11px] text-rose-500 font-medium leading-none">{error}</p>
      ) : helperText ? (
        <p className="text-[11px] text-slate-500 leading-none">{helperText}</p>
      ) : null}
    </div>
  );
}
