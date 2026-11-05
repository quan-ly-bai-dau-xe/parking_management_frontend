import React from "react";
import { Icon } from "../common";

export default function CustomerAdvancedFilterPopover({
  popoverRef,
  isPopoverOpen,
  onTogglePopover,
  activeAdvancedCount,
  draftFilters,
  onDraftFilterChange,
  onClearPopover,
  onCancelPopover,
  onApplyPopover,
}) {
  return (
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        onClick={onTogglePopover}
        className={`h-9 inline-flex items-center gap-1.5 px-3 rounded-lg border text-xs font-medium cursor-pointer transition-colors shadow-2xs ${
          isPopoverOpen || activeAdvancedCount > 0
            ? "bg-blue-50/70 border-blue-400 text-blue-700 font-semibold"
            : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400"
        }`}
      >
        <Icon name="filter" size="xs" />
        <span>Bộ lọc chi tiết</span>
        {activeAdvancedCount > 0 && (
          <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-2xs flex items-center justify-center font-bold">
            {activeAdvancedCount}
          </span>
        )}
      </button>

      {/* Popover content */}
      {isPopoverOpen && (
        <div className="absolute left-0 top-full mt-2 w-72 sm:w-80 bg-white rounded-xl shadow-xl border border-slate-200 p-4 z-50 space-y-3 animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h4 className="text-xs font-bold text-slate-800">Bộ lọc chi tiết</h4>
            <button
              type="button"
              onClick={onClearPopover}
              className="text-2xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
            >
              Xóa bộ lọc
            </button>
          </div>

          {/* Filter 1: CCCD */}
          <div className="space-y-1">
            <label className="text-2xs font-semibold text-slate-600">Số CCCD</label>
            <input
              type="text"
              placeholder="Tìm theo CCCD..."
              value={draftFilters.idNumber}
              onChange={(e) => onDraftFilterChange("idNumber", e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
            />
          </div>

          {/* Filter 2: Ngày sinh */}
          <div className="space-y-1">
            <label className="text-2xs font-semibold text-slate-600">Ngày sinh</label>
            <input
              type="text"
              placeholder="dd/mm/yyyy..."
              value={draftFilters.birthday}
              onChange={(e) => onDraftFilterChange("birthday", e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
            />
          </div>

          {/* Filter 3: Giới tính */}
          <div className="space-y-1">
            <label className="text-2xs font-semibold text-slate-600">Giới tính</label>
            <div className="relative">
              <select
                value={draftFilters.gender}
                onChange={(e) => onDraftFilterChange("gender", e.target.value)}
                className="w-full h-8.5 px-3 pr-8 text-xs bg-white border border-slate-300 rounded-lg appearance-none text-slate-700 outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
              >
                <option value="">Tất cả giới tính</option>
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
                <option value="Khác">Khác</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                <Icon name="chevronDown" size="xs" />
              </div>
            </div>
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onCancelPopover}
              className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 font-medium cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={onApplyPopover}
              className="px-3.5 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-2xs cursor-pointer"
            >
              Áp dụng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
