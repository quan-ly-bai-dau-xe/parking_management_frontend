import React from "react";

/**
 * FormTextarea component
 * Standardized textarea component for forms with label, error, helper text, and character counter.
 *
 * @param {Object} props
 * @param {string} [props.label] - Field label
 * @param {string} [props.value] - Controlled value
 * @param {Function} [props.onChange] - Change handler
 * @param {string} [props.placeholder] - Placeholder text
 * @param {string} [props.name] - Field name
 * @param {string} [props.id] - Field ID
 * @param {number} [props.rows=3] - Number of visible text lines
 * @param {boolean} [props.required=false] - Whether field is required
 * @param {boolean} [props.disabled=false] - Whether field is disabled
 * @param {string} [props.error] - Error message
 * @param {string} [props.helperText] - Supplementary hint text
 * @param {string} [props.className=''] - Additional textarea classes
 * @param {string} [props.containerClassName=''] - Additional container classes
 */
export default function FormTextarea({
  label = "",
  value,
  onChange,
  placeholder = "",
  name = "",
  id = "",
  rows = 3,
  required = false,
  disabled = false,
  error = "",
  helperText = "",
  className = "",
  containerClassName = "",
  ...rest
}) {
  const textareaId = id || (name ? `textarea-${name}` : undefined);

  const stateClasses = error
    ? "border-rose-400 bg-rose-50/20 text-rose-900 placeholder-rose-300 focus:border-rose-500 focus:ring-rose-500/20"
    : "border-slate-200 bg-white text-slate-800 placeholder-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-blue-500/20";

  return (
    <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
      {label && (
        <label
          htmlFor={textareaId}
          className="flex items-center gap-1 text-xs font-semibold text-slate-700 select-none"
        >
          <span>{label}</span>
          {required && <span className="text-rose-500 font-bold">*</span>}
        </label>
      )}

      <textarea
        id={textareaId}
        name={name}
        rows={rows}
        value={value ?? ""}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={`w-full text-xs px-3 py-2 rounded-xl border outline-none transition-all duration-150 focus:ring-2 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed resize-none ${stateClasses} ${className}`}
        {...rest}
      />

      {error ? (
        <p className="text-[11px] text-rose-500 font-medium leading-none">{error}</p>
      ) : helperText ? (
        <p className="text-[11px] text-slate-500 leading-none">{helperText}</p>
      ) : null}
    </div>
  );
}
