import { QUICK_FILTER_LABELS, QUICK_FILTER_KEYS } from "../../constants/parkingHistoryConstants";

export default function ParkingHistoryFilters({
  sessionCode,
  setSessionCode,
  licensePlate,
  setLicensePlate,
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
  return (
    <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 mb-6">
      <h2 className="text-sm font-semibold text-slate-800 mb-4">Bộ lọc nhanh</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-x-5 gap-y-4 items-start">
        {/* Mã phiên đỗ */}
        <div className="flex flex-col gap-1.5 lg:col-span-4">
          <label className="text-xs font-semibold text-slate-700">Mã phiên đỗ</label>
          <input
            type="text"
            value={sessionCode}
            onChange={(e) => setSessionCode(e.target.value)}
            placeholder="Nhập mã phiên đỗ..."
            className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white transition-all"
          />
        </div>

        {/* Biển số xe */}
        <div className="flex flex-col gap-1.5 lg:col-span-4">
          <label className="text-xs font-semibold text-slate-700">Biển số xe</label>
          <input
            type="text"
            value={licensePlate}
            onChange={(e) => setLicensePlate(e.target.value)}
            placeholder="Nhập biển số xe..."
            className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white transition-all"
          />
        </div>

        {/* Cước phí */}
        <div className="sm:col-span-2 lg:col-span-4 flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-700">Cước phí (từ - đến)</label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min="0"
              value={feeMin}
              onChange={(e) => setFeeMin(e.target.value)}
              placeholder="0đ"
              className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2"
            />
            <span className="text-slate-400">–</span>
            <input
              type="number"
              min="0"
              value={feeMax}
              onChange={(e) => setFeeMax(e.target.value)}
              placeholder="200.000đ"
              className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2"
            />
          </div>
        </div>
      </div>

      {/* Quick Filter Buttons Row */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {QUICK_FILTER_LABELS.map(({ key, label }) => {
          const isActive = activeQuickFilter === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => handleQuickFilter(key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border cursor-pointer transition-colors ${
                isActive
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-blue-200 text-blue-600 bg-blue-50/50 hover:bg-blue-100/70"
              }`}
            >
              {label}
            </button>
          );
        })}

        <label className="ml-1 flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
          <input
            type="checkbox"
            checked={filterByTime}
            onChange={(e) => setFilterByTime(e.target.checked)}
          />
          Lọc theo giờ
        </label>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-blue-600 cursor-pointer"
          >
            <span aria-hidden="true">×</span> Xóa bộ lọc
          </button>
        )}
      </div>

      {/* Tùy chỉnh ngày */}
      {activeQuickFilter === QUICK_FILTER_KEYS.CUSTOM && (
        <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50/50 p-3">
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
              <span className="text-slate-400">→</span>
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
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4 rounded-xl bg-slate-50 p-3">
          <label className="flex items-center gap-2 text-xs text-slate-600">
            Giờ vào từ
            <input
              type="text"
              inputMode="numeric"
              placeholder="HH:mm"
              value={entryTimeFrom}
              onChange={(e) => setEntryTimeFrom(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1"
            />
            <span>đến</span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="HH:mm"
              value={entryTimeTo}
              onChange={(e) => setEntryTimeTo(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1"
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-600">
            Giờ ra từ
            <input
              type="text"
              inputMode="numeric"
              placeholder="HH:mm"
              value={exitTimeFrom}
              onChange={(e) => setExitTimeFrom(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1"
            />
            <span>đến</span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="HH:mm"
              value={exitTimeTo}
              onChange={(e) => setExitTimeTo(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1"
            />
          </label>
        </div>
      )}
    </section>
  );
}
