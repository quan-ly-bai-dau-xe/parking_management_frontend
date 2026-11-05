import React, { useRef, useState, useEffect, useMemo } from "react";

/**
 * SearchableCombobox
 * Component lựa chọn dạng Combobox có tìm kiếm nhanh (Searchable Dropdown).
 * Dùng chung cho Khách hàng, Phương tiện, Vị trí đỗ xe và các trường chọn lọc khác.
 *
 * @param {string} label - Tiêu đề trường
 * @param {boolean} required - Bắt buộc chọn hay không
 * @param {Array} options - Danh sách các options [{ value, label, subLabel, badge, raw }]
 * @param {any} value - Giá trị đang được chọn (khớp với option.value)
 * @param {function} onChange - Callback khi chọn hoặc bỏ chọn (trả về value hoặc raw object)
 * @param {string} placeholder - Placeholder cho input tìm kiếm
 * @param {string} emptyText - Thông báo khi không tìm thấy kết quả
 * @param {boolean} disabled - Vô hiệu hóa component
 * @param {string} error - Thông báo lỗi nếu có
 */
export default function SearchableCombobox({
  label,
  required = false,
  options = [],
  value,
  onChange,
  placeholder = "Tìm kiếm...",
  emptyText = "Không tìm thấy kết quả",
  disabled = false,
  error = "",
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Tự động đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Tìm option đang được chọn
  const selectedOption = useMemo(() => {
    if (!value && value !== 0) return null;
    return options.find((opt) => opt.value === value) || null;
  }, [options, value]);

  // Lọc options theo từ khóa tìm kiếm
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const term = searchTerm.toLowerCase().trim();
    return options.filter((opt) => {
      const matchLabel = opt.label?.toLowerCase().includes(term);
      const matchSub = opt.subLabel?.toLowerCase().includes(term);
      const matchBadge = opt.badge?.toLowerCase().includes(term);
      const matchValue = String(opt.value || "").toLowerCase().includes(term);
      return matchLabel || matchSub || matchBadge || matchValue;
    });
  }, [options, searchTerm]);

  const handleSelect = (opt) => {
    if (onChange) onChange(opt.value, opt);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleClear = () => {
    if (onChange) onChange("", null);
    setSearchTerm("");
    setIsOpen(true);
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {label && (
        <div className="flex items-center justify-between mb-1">
          <label className="block text-2xs font-semibold text-slate-500">
            {label} {required && <span className="text-rose-500">*</span>}
          </label>
          {options.length > 0 && (
            <span className="text-3xs text-slate-400">
              {options.length} lựa chọn
            </span>
          )}
        </div>
      )}

      {selectedOption ? (
        <div
          className={`flex items-center justify-between p-2.5 bg-blue-50/70 border ${
            error ? "border-rose-400" : "border-blue-200"
          } rounded-lg transition-all`}
        >
          <div className="min-w-0 pr-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-blue-900 truncate">
                {selectedOption.label}
              </span>
              {selectedOption.badge && (
                <span className="px-1.5 py-0.5 rounded text-3xs font-mono font-bold bg-blue-100 text-blue-700">
                  {selectedOption.badge}
                </span>
              )}
            </div>
            {selectedOption.subLabel && (
              <div className="text-2xs text-blue-600 mt-0.5 truncate">
                {selectedOption.subLabel}
              </div>
            )}
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="px-2 py-1 text-2xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded shadow-2xs transition-colors shrink-0 cursor-pointer"
              title="Đổi lựa chọn khác"
            >
              Thay đổi
            </button>
          )}
        </div>
      ) : (
        <div className="relative">
          <div className="relative flex items-center">
            <input
              type="text"
              disabled={disabled}
              placeholder={disabled ? "Không khả dụng" : placeholder}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => !disabled && setIsOpen(true)}
              className={`w-full text-xs pl-8 pr-8 py-2 border rounded-lg focus:outline-none focus:ring-1 transition-all ${
                disabled
                  ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                  : error
                  ? "border-rose-300 focus:ring-rose-500 focus:border-rose-500"
                  : "border-slate-300 focus:ring-blue-500 focus:border-blue-500"
              }`}
            />
            <svg
              className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            {searchTerm && !disabled && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold p-0.5"
              >
                ✕
              </button>
            )}
          </div>

          {isOpen && !disabled && (
            <div className="absolute z-40 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-y-auto divide-y divide-slate-100">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt) => (
                  <div
                    key={opt.value}
                    onClick={() => handleSelect(opt)}
                    className="p-2.5 hover:bg-blue-50/70 cursor-pointer transition-colors flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 truncate">
                        {opt.label}
                      </div>
                      <div className="text-2xs text-slate-500 flex items-center gap-2 mt-0.5">
                        {opt.badge && (
                          <span className="font-mono text-blue-600 font-semibold">
                            {opt.badge}
                          </span>
                        )}
                        {opt.subLabel && <span>{opt.subLabel}</span>}
                      </div>
                    </div>
                    <span className="text-2xs text-blue-600 font-medium shrink-0">
                      Chọn
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-3 text-center text-xs text-slate-400">
                  {emptyText} {searchTerm && `với "${searchTerm}"`}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {error && <p className="mt-1 text-2xs text-rose-500">{error}</p>}
    </div>
  );
}
