import React from "react";
import PageToolbar from "../common/PageToolbar";
import FilterSelect from "../common/FilterSelect";
import { FormInput } from "../common/form";
import { TICKET_FILTER_OPTIONS, STATUS_FILTER_OPTIONS } from "../../constants/vehicleConstants";

/**
 * VehicleFilters
 * Thanh công cụ tìm kiếm và bộ lọc trạng thái, loại vé của trang Quản lý xe.
 * Tái sử dụng PageToolbar, FormInput và FilterSelect dùng chung từ components/common.
 */
export default function VehicleFilters({
  filters,
  onFilterChange,
  onSearch,
  onReset,
}) {
  return (
    <PageToolbar
      onSearch={onSearch}
      onReset={onReset}
      searchLabel="Tìm kiếm"
      resetLabel="Làm mới"
      gridCols="grid-cols-1 sm:grid-cols-2 md:grid-cols-4"
    >
      {/* Ô tìm kiếm thông tin xe / khách hàng */}
      <div className="md:col-span-2">
        <FormInput
          label="Tìm kiếm phương tiện"
          placeholder="Tìm biển số, tên hoặc SĐT khách hàng..."
          value={filters.search}
          onChange={(e) => onFilterChange("search", e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && onSearch) {
              onSearch();
            }
          }}
          leftIcon={
            <svg
              className="w-3.5 h-3.5 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          }
        />
      </div>

      {/* Lọc theo Loại vé */}
      <FilterSelect
        label="Loại vé"
        value={filters.ticketType}
        onChange={(e) => onFilterChange("ticketType", e?.target ? e.target.value : e)}
        options={TICKET_FILTER_OPTIONS}
        placeholder="Tất cả loại vé"
      />

      {/* Lọc theo Trạng thái xe */}
      <FilterSelect
        label="Trạng thái"
        value={filters.status}
        onChange={(e) => onFilterChange("status", e?.target ? e.target.value : e)}
        options={STATUS_FILTER_OPTIONS}
        placeholder="Tất cả trạng thái"
      />
    </PageToolbar>
  );
}
