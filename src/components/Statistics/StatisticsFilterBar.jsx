import { Calendar, Filter, AlertCircle } from "lucide-react";
import Button from "../common/button/Button.jsx";

const PRESETS = [
  { key: "today", label: "Hôm nay" },
  { key: "last7days", label: "7 ngày qua" },
  { key: "thisMonth", label: "Tháng này" },
];

export default function StatisticsFilterBar({
  startDate,
  endDate,
  activePreset,
  validationError,
  isBusy = false,
  onStartDateChange,
  onEndDateChange,
  onSelectPreset,
  onApply,
}) {
  const handleSubmit = (event) => {
    event.preventDefault();
    if (onApply) {
      onApply();
    }
  };

  return (
    <section
      aria-label="Bộ lọc thời gian thống kê"
      className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 sm:p-5"
    >
      <form
        onSubmit={handleSubmit}
        className="flex flex-col lg:flex-row lg:items-end justify-between gap-4"
      >
        {/* Nhóm preset chọn nhanh */}
        <div className="space-y-1.5">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <Calendar className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
            Khoảng thời gian nhanh
          </span>
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Chọn nhanh khoảng ngày">
            {PRESETS.map((preset) => {
              const isActive = activePreset === preset.key;
              return (
                <button
                  key={preset.key}
                  type="button"
                  disabled={isBusy}
                  onClick={() => onSelectPreset?.(preset.key)}
                  aria-pressed={isActive}
                  className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer disabled:opacity-60 ${
                    isActive
                      ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
            {activePreset === "custom" && (
              <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                Tùy chỉnh
              </span>
            )}
          </div>
        </div>

        {/* Nhóm chọn ngày tùy chỉnh */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="stats-start-date"
              className="text-xs font-medium text-slate-600"
            >
              Từ ngày
            </label>
            <input
              id="stats-start-date"
              name="start_date"
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange?.(e.target.value)}
              className="min-h-[44px] px-3 py-1.5 rounded-lg border border-slate-300 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="stats-end-date"
              className="text-xs font-medium text-slate-600"
            >
              Đến ngày
            </label>
            <input
              id="stats-end-date"
              name="end_date"
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange?.(e.target.value)}
              className="min-h-[44px] px-3 py-1.5 rounded-lg border border-slate-300 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={isBusy}
            className="min-h-[44px]"
            icon={<Filter className="w-3.5 h-3.5" aria-hidden="true" />}
          >
            Áp dụng
          </Button>
        </div>
      </form>

      {validationError && (
        <div
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" aria-hidden="true" />
          <div>
            <p className="font-semibold">{validationError.error}</p>
            {validationError.detail && (
              <p className="text-rose-600 mt-0.5">{validationError.detail}</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
