import { useState, useEffect } from "react";
import {
  QUICK_FILTER_LABELS,
  QUICK_FILTER_KEYS,
  SESSION_STATUS_FILTER_OPTIONS,
  TICKET_TYPE_FILTER_OPTIONS,
  ABNORMAL_FILTER_OPTIONS,
  PARKING_HISTORY_DEFAULTS,
} from "../../constants/parkingHistoryConstants";

export default function ParkingHistoryFilters({
  searchTerm = "",
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  ticketTypeFilter = "all",
  setTicketTypeFilter,
  abnormalFilter = "all",
  setAbnormalFilter,
  feeMin,
  setFeeMin,
  feeMax,
  setFeeMax,
  activeQuickFilter,
  handleQuickFilter,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  minDateISO,
  todayISO,
  filterByTime,
  setFilterByTime,
  entryTimeFrom,
  setEntryTimeFrom,
  entryTimeTo,
  setEntryTimeTo,
  exitTimeFrom,
  setExitTimeFrom,
  exitTimeTo,
  setExitTimeTo,
  hasActiveFilters,
  onResetFilters,
}) {
  const [localSearch, setLocalSearch] = useState(searchTerm);
  const [prevSearchTerm, setPrevSearchTerm] = useState(searchTerm);

  // Synchronize local input with prop if changed from outside
  if (searchTerm !== prevSearchTerm) {
    setPrevSearchTerm(searchTerm);
    setLocalSearch(searchTerm);
  }

  // Debounced search trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== searchTerm && setSearchTerm) {
        setSearchTerm(localSearch);
      }
    }, PARKING_HISTORY_DEFAULTS.SEARCH_DEBOUNCE_MS || 350);

    return () => clearTimeout(timer);
  }, [localSearch, searchTerm, setSearchTerm]);

  const handleClearSearch = () => {
    setLocalSearch("");
    if (setSearchTerm) setSearchTerm("");
  };

  return (
    <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <h2 className="text-sm font-semibold text-slate-800">Bộ lọc nhanh</h2>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-rose-600 transition-colors cursor-pointer self-start sm:self-auto"
          >
            <span aria-hidden="true" className="text-base leading-none">×</span>
            <span>Đặt lại bộ lọc</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
        {/* Unified Search Input: Biển số & Mã phiên */}
        <div className="flex flex-col gap-1.5 md:col-span-4 lg:col-span-4">
          <label className="text-xs font-semibold text-slate-700">
            Tìm kiếm xe & phiên đỗ
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-3.5 text-slate-400 pointer-events-none flex items-center">
              <svg
                className="w-4 h-4"
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
            </span>
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Nhập biển số xe (vd: 29A-123.45) hoặc mã phiên..."
              className="w-full text-xs rounded-xl border border-slate-200 pl-9.5 pr-8 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white transition-all shadow-2xs"
            />
            {localSearch && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-2.5 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                title="Xóa tìm kiếm"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Dropdown Trạng thái */}
        <div className="flex flex-col gap-1.5 md:col-span-2 lg:col-span-2">
          <label className="text-xs font-semibold text-slate-700">Tình trạng</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer shadow-2xs"
          >
            {SESSION_STATUS_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Dropdown Loại vé */}
        <div className="flex flex-col gap-1.5 md:col-span-2 lg:col-span-2">
          <label className="text-xs font-semibold text-slate-700">Loại vé</label>
          <select
            value={ticketTypeFilter}
            onChange={(e) => setTicketTypeFilter?.(e.target.value)}
            className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer shadow-2xs"
          >
            {TICKET_TYPE_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Dropdown Xử lý bất thường & Kiểm toán đối soát */}
        <div className="flex flex-col gap-1.5 md:col-span-2 lg:col-span-2">
          <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
            <span>Đối soát / Xử lý</span>
          </label>
          <select
            value={abnormalFilter}
            onChange={(e) => setAbnormalFilter?.(e.target.value)}
            className={`w-full text-xs rounded-xl border px-3 py-2.5 font-medium transition-all cursor-pointer shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
              abnormalFilter !== "all"
                ? "border-amber-400 bg-amber-50/50 text-amber-900 focus:border-amber-500"
                : "border-slate-200 bg-white text-slate-800 focus:border-blue-500"
            }`}
          >
            {ABNORMAL_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Khoảng Cước phí (từ - đến) */}
        <div className="flex flex-col gap-1.5 md:col-span-4 lg:col-span-4">
          <label className="text-xs font-semibold text-slate-700">
            Cước phí (từ - đến)
          </label>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min="0"
              value={feeMin}
              onChange={(e) => setFeeMin(e.target.value)}
              placeholder="0 đ"
              className="w-full text-xs rounded-xl border border-slate-200 px-2.5 py-2.5 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs"
            />
            <span className="text-slate-400 font-medium">–</span>
            <input
              type="number"
              min="0"
              value={feeMax}
              onChange={(e) => setFeeMax(e.target.value)}
              placeholder="200.000 đ"
              className="w-full text-xs rounded-xl border border-slate-200 px-2.5 py-2.5 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs"
            />
          </div>
        </div>
      </div>

      {/* Hàng bộ lọc thời gian & Preset ngày */}
      <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-slate-400 mr-1 hidden sm:inline">
          Thời gian:
        </span>
        {QUICK_FILTER_LABELS.map(({ key, label }) => {
          const isActive = activeQuickFilter === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => handleQuickFilter(key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border cursor-pointer transition-colors ${
                isActive
                  ? "border-blue-600 bg-blue-600 text-white shadow-2xs"
                  : "border-slate-200 text-slate-600 bg-slate-50/60 hover:bg-slate-100"
              }`}
            >
              {label}
            </button>
          );
        })}

        <label className="ml-2 flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={filterByTime}
            onChange={(e) => setFilterByTime(e.target.checked)}
            className="rounded text-blue-600 focus:ring-blue-500"
          />
          Lọc theo giờ
        </label>
      </div>

      {/* Tùy chỉnh ngày */}
      {activeQuickFilter === QUICK_FILTER_KEYS.CUSTOM && (
        <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50/40 p-3.5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="text-xs font-semibold text-slate-700 sm:min-w-fit">
              Khoảng ngày <span className="font-normal text-slate-400">(DD/MM/YYYY)</span>
            </label>
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <input
                aria-label="Từ ngày"
                type="date"
                min={minDateISO}
                max={todayISO}
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
              />
              <span className="text-slate-400 font-medium">→</span>
              <input
                aria-label="Đến ngày"
                type="date"
                min={minDateISO}
                max={todayISO}
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
              />
            </div>
          </div>
        </div>
      )}

      {/* Lọc theo giờ */}
      {filterByTime && (
        <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-3 rounded-xl bg-slate-50/80 p-3.5 border border-slate-100">
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <span>Giờ vào từ:</span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="HH:mm"
              value={entryTimeFrom}
              onChange={(e) => setEntryTimeFrom(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800"
            />
            <span className="text-slate-400">đến</span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="HH:mm"
              value={entryTimeTo}
              onChange={(e) => setEntryTimeTo(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800"
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <span>Giờ ra từ:</span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="HH:mm"
              value={exitTimeFrom}
              onChange={(e) => setExitTimeFrom(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800"
            />
            <span className="text-slate-400">đến</span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="HH:mm"
              value={exitTimeTo}
              onChange={(e) => setExitTimeTo(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800"
            />
          </label>
        </div>
      )}
    </section>
  );
}
