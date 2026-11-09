import React from "react";
import PageToolbar from "../common/PageToolbar";
import FilterSelect from "../common/FilterSelect";
import { FormInput } from "../common/form";
import { TICKET_TYPES, TICKET_STATUSES, PARKING_FLOORS } from "../../constants/ticketConstants";

export default function TicketFilters({
  filters,
  onFilterChange,
  onReset,
}) {
  return (
    <PageToolbar
      onReset={onReset}
      resetLabel="Làm mới bộ lọc"
      gridCols="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
    >
      <FormInput
        label="Mã vé"
        placeholder="Nhập mã vé..."
        value={filters.ticketCode}
        onChange={(e) => onFilterChange("ticketCode", e.target.value)}
      />

      <FormInput
        label="Mã khách hàng"
        placeholder="Nhập mã KH..."
        value={filters.customerCode}
        onChange={(e) => onFilterChange("customerCode", e.target.value)}
      />

      <FormInput
        label="Biển số xe"
        placeholder="Nhập biển số..."
        value={filters.licensePlate}
        onChange={(e) => onFilterChange("licensePlate", e.target.value)}
      />

      <FilterSelect
        label="Loại vé"
        value={filters.ticketType}
        onChange={(e) => onFilterChange("ticketType", e?.target ? e.target.value : e)}
        placeholder="Tất cả loại vé"
        options={TICKET_TYPES.map((t) => ({ value: t.label, label: t.label }))}
      />

      <FilterSelect
        label="Trạng thái"
        value={filters.status}
        onChange={(e) => onFilterChange("status", e?.target ? e.target.value : e)}
        placeholder="Tất cả trạng thái"
        options={TICKET_STATUSES}
      />

      <FilterSelect
        label="Khu vực đỗ xe"
        value={filters.floor}
        onChange={(e) => onFilterChange("floor", e?.target ? e.target.value : e)}
        placeholder="Tất cả khu vực"
        options={PARKING_FLOORS}
      />
    </PageToolbar>
  );
}
