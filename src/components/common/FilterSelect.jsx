/**
 * FilterSelect component
 * Reusable select dropdown styled for filter toolbars and search panels.
 *
 * @param {Object} props
 * @param {string} [props.label] - Field label displayed above select
 * @param {string|number} props.value - Controlled select value
 * @param {Function} props.onChange - Change handler (receives native event or value)
 * @param {Array<{value: string|number, label: string}|string>} [props.options=[]] - List of dropdown options
 * @param {string} [props.placeholder='Tất cả'] - Default unselected label
 * @param {string} [props.id] - Element ID
 * @param {string} [props.name] - Element name
 * @param {boolean} [props.disabled=false] - Whether dropdown is disabled
 * @param {string} [props.className=''] - Additional select input classes
 * @param {string} [props.containerClassName=''] - Additional wrapper div classes
 */
export default function FilterSelect({
  label = "",
  value,
  onChange,
  options = [],
  placeholder = "Tất cả",
  id = "",
  name = "",
  disabled = false,
  className = "",
  containerClassName = "",
}) {
  const selectId = id || (name ? `filter-select-${name}` : undefined);

  return (
    <div className={containerClassName}>
      {label && (
        <label
          htmlFor={selectId}
          className="block text-xs font-semibold text-slate-700"
        >
          {label}
        </label>
      )}
      <select
        id={selectId}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-slate-800 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed ${className}`}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => {
          const optValue =
            typeof option === "object" && option !== null ? option.value : option;
          const optLabel =
            typeof option === "object" && option !== null ? option.label : option;

          return (
            <option key={String(optValue)} value={optValue}>
              {optLabel}
            </option>
          );
        })}
      </select>
    </div>
  );
}
