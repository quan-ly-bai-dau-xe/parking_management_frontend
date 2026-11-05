import React from "react";
import { Icon } from "../common";
import { TICKET_PACKAGE_OPTIONS } from "../../constants/customerConstants";
import CustomerAdvancedFilterPopover from "./CustomerAdvancedFilterPopover";

const STATUS_OPTIONS = [
  "Đang hoạt động",
  "Tạm ngưng",
  "Tạm khóa",
  "Danh sách đen",
  "Sắp hết hạn",
  "Hết hạn",
];

export default function CustomerFilters({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusChange,
  packageFilter,
  onPackageChange,
  draftFilters,
  onDraftFilterChange,
  isPopoverOpen,
  onTogglePopover,
  onApplyPopover,
  onCancelPopover,
  onClearPopover,
  onResetAll,
  activeAdvancedCount,
  searchInputRef,
  popoverRef,
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
      {/* Tầng 1: Search theo mã, tên, SĐT, email + Phím tắt Ctrl+K */}
      <div className="relative flex items-center">
        <span className="absolute left-3 text-slate-400 pointer-events-none flex items-center justify-center">
          <Icon name="search" size="sm" />
        </span>
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Tìm theo mã, tên, SĐT, email..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full h-9 pl-9 pr-16 text-xs text-slate-800 placeholder-slate-400 bg-slate-50 border border-slate-200 rounded-lg outline-none transition-all focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
        <div className="absolute right-3 hidden sm:flex items-center gap-0.5 text-2xs text-slate-400 font-mono pointer-events-none select-none">
          <kbd className="px-1.5 py-0.5 rounded border border-slate-200 bg-white text-slate-500">Ctrl</kbd>
          <span>+</span>
          <kbd className="px-1.5 py-0.5 rounded border border-slate-200 bg-white text-slate-500">K</kbd>
        </div>
      </div>

      {/* Tầng 2 & Tầng 3 */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1 border-t border-slate-100">
        <div className="flex flex-wrap items-center gap-2">
          {/* Dropdown: Trạng thái */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => onStatusChange(e.target.value)}
              className="h-9 pl-3 pr-8 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg appearance-none hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 cursor-pointer shadow-2xs"
            >
              <option value="">Tất cả trạng thái</option>
              {STATUS_OPTIONS.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
              <Icon name="chevronDown" size="xs" />
            </div>
          </div>

          {/* Dropdown: Gói vé đăng ký */}
          <div className="relative">
            <select
              value={packageFilter}
              onChange={(e) => onPackageChange(e.target.value)}
              className="h-9 pl-3 pr-8 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg appearance-none hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 cursor-pointer shadow-2xs"
            >
              <option value="">Tất cả gói vé</option>
              {TICKET_PACKAGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
              <Icon name="chevronDown" size="xs" />
            </div>
          </div>

          {/* [+ Bộ lọc] with Popover (Tầng 3) */}
          <CustomerAdvancedFilterPopover
            popoverRef={popoverRef}
            isPopoverOpen={isPopoverOpen}
            onTogglePopover={onTogglePopover}
            activeAdvancedCount={activeAdvancedCount}
            draftFilters={draftFilters}
            onDraftFilterChange={onDraftFilterChange}
            onClearPopover={onClearPopover}
            onCancelPopover={onCancelPopover}
            onApplyPopover={onApplyPopover}
          />
        </div>

        {/* Nút đặt lại */}
        {(searchTerm || statusFilter || packageFilter || activeAdvancedCount > 0) && (
          <button
            type="button"
            onClick={onResetAll}
            className="h-9 inline-flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 font-semibold px-2.5 py-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
          >
            <Icon name="refresh" size="xs" />
            <span>Đặt lại bộ lọc</span>
          </button>
        )}
      </div>
    </div>
  );
}
