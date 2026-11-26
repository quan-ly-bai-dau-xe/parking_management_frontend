import { computeGaugeArc } from "../../utils/statisticsChartHelpers.js";

export default function OccupancyGaugeCard({ occupancy }) {
  const {
    totalSlots = 0,
    operationalSlots = 0,
    occupiedSlots = 0,
    availableSlots = 0,
    reservedSlots = 0,
    chargingSlots = 0,
    maintenanceSlots = 0,
    occupancyRate = 0,
  } = occupancy || {};

  const radius = 60;
  const center = 80;
  const gauge = computeGaugeArc(occupancyRate, radius);

  const badgeToneClass = {
    rose: "bg-rose-50 text-rose-700 border-rose-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  }[gauge.tone];

  const barToneClass = {
    rose: "bg-rose-600",
    amber: "bg-amber-500",
    emerald: "bg-emerald-600",
  }[gauge.tone];

  const freeSlots = Math.max(0, operationalSlots - occupiedSlots);

  return (
    <article className="min-w-0 bg-white rounded-xl border border-slate-200 shadow-2xs p-5 flex flex-col justify-between">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Công suất & Tỷ lệ lấp đầy hiện tại
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Đang có xe (OCCUPIED + CHARGING) trên tổng số ô vận hành
          </p>
        </div>
        <span
          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border shrink-0 ${badgeToneClass}`}
        >
          {gauge.statusText}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-center gap-6">
        {/* SVG Circular Gauge */}
        <div className="relative w-40 h-40 shrink-0 flex items-center justify-center">
          <svg
            viewBox="0 0 160 160"
            className="w-full h-full"
            role="img"
            aria-label={`Tỷ lệ lấp đầy bãi xe ${gauge.rate.toFixed(1)}% (${occupiedSlots} trên ${operationalSlots} ô vận hành)`}
          >
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="#E2E8F0"
              strokeWidth={14}
            />
            <g transform={`rotate(-90 ${center} ${center})`}>
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={gauge.strokeColor}
                strokeWidth={14}
                strokeLinecap="round"
                strokeDasharray={gauge.circumference}
                strokeDashoffset={gauge.dashOffset}
                className="transition-all duration-300"
              />
            </g>
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-bold text-slate-900 tabular-nums">
              {gauge.rate.toFixed(1)}%
            </span>
            <span className="text-xs font-medium text-slate-500 tabular-nums mt-0.5">
              {occupiedSlots}/{operationalSlots} ô
            </span>
          </div>
        </div>

        {/* Thanh progress bar CSS & thông số chi tiết */}
        <div className="w-full min-w-0 flex-1 space-y-3">
          <div>
            <div className="flex items-center justify-between text-xs font-medium text-slate-600 mb-1.5">
              <span>Đang có xe đỗ / sạc</span>
              <span className="font-bold text-slate-900 tabular-nums">
                {occupiedSlots} / {operationalSlots} ô vận hành
              </span>
            </div>
            <div
              className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden"
              role="progressbar"
              aria-valuenow={Math.round(gauge.rate)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Thanh tiến trình tỷ lệ lấp đầy ô đỗ"
            >
              <div
                className={`h-full rounded-full transition-all duration-300 ${barToneClass}`}
                style={{ width: `${gauge.rate}%` }}
              />
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
              <dt className="text-slate-500">Tổng ô bãi xe</dt>
              <dd className="font-bold text-slate-900 tabular-nums mt-0.5">
                {totalSlots}
              </dd>
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
              <dt className="text-slate-500">Chưa có xe (trống + giữ)</dt>
              <dd className="font-bold text-emerald-700 tabular-nums mt-0.5">
                {availableSlots > 0 || reservedSlots > 0 ? availableSlots + reservedSlots : freeSlots}
              </dd>
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
              <dt className="text-slate-500">Đang sạc xe điện</dt>
              <dd className="font-bold text-blue-700 tabular-nums mt-0.5">
                {chargingSlots}
              </dd>
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
              <dt className="text-slate-500">Đang bảo trì</dt>
              <dd className="font-bold text-slate-700 tabular-nums mt-0.5">
                {maintenanceSlots}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </article>
  );
}
