import { useState } from "react";
import { formatCurrencyVND } from "../../constants/paymentConstants.js";
import { computeDonutSegments } from "../../utils/statisticsChartHelpers.js";

export default function StatisticsDonutChart({
  title,
  subtitle = "",
  items = [],
  centerLabel = "Tổng doanh thu",
}) {
  const [activeKey, setActiveKey] = useState(null);

  const radius = 76;
  const center = 110;
  const { total, segments } = computeDonutSegments(items, radius);

  const activeSegment =
    segments.find((seg) => seg.key === activeKey && seg.value > 0) || null;

  const displayTitle = activeSegment ? activeSegment.label : centerLabel;
  const displayAmount = activeSegment
    ? formatCurrencyVND(activeSegment.value)
    : formatCurrencyVND(total);
  const displaySub = activeSegment
    ? `${activeSegment.percentage.toFixed(1)}%`
    : total > 0
      ? "100%"
      : "Chưa có dữ liệu";

  return (
    <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-center gap-6">
      {/* Vùng vẽ SVG thuần */}
      <div className="relative w-52 h-52 shrink-0 flex items-center justify-center">
        <svg
          viewBox="0 0 220 220"
          className="w-full h-full"
          role="img"
          aria-label={`${title}: ${subtitle || centerLabel} ${displayAmount}`}
        >
          {/* Vòng nền */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#E2E8F0"
            strokeWidth={28}
          />

          {/* Các lát cắt doanh thu */}
          {total > 0 && (
            <g transform={`rotate(-90 ${center} ${center})`}>
              {segments.map((seg) => {
                if (seg.value <= 0) return null;
                const isActive = activeKey === seg.key;
                const isDimmed = activeKey !== null && activeKey !== seg.key;
                return (
                  <circle
                    key={seg.key}
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={isActive ? 32 : 28}
                    strokeDasharray={seg.dashArray}
                    strokeDashoffset={seg.dashOffset}
                    opacity={isDimmed ? 0.45 : 1}
                    tabIndex={0}
                    role="button"
                    aria-label={`${seg.label}: ${formatCurrencyVND(seg.value)} (${seg.percentage.toFixed(1)}%)`}
                    className="cursor-pointer transition-all duration-200 focus:outline-none"
                    onMouseEnter={() => setActiveKey(seg.key)}
                    onMouseLeave={() => setActiveKey(null)}
                    onFocus={() => setActiveKey(seg.key)}
                    onBlur={() => setActiveKey(null)}
                  >
                    <title>
                      {`${seg.label}: ${formatCurrencyVND(seg.value)} (${seg.percentage.toFixed(1)}%)`}
                    </title>
                  </circle>
                );
              })}
            </g>
          )}
        </svg>

        {/* Nhãn ở tâm Donut */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-6">
          <span className="text-[11px] font-medium text-slate-500 truncate max-w-[116px]">
            {displayTitle}
          </span>
          <span className="text-sm sm:text-base font-bold text-slate-900 tabular-nums mt-0.5">
            {displayAmount}
          </span>
          <span className="text-[11px] font-semibold text-blue-600 mt-0.5">
            {displaySub}
          </span>
        </div>
      </div>

      {/* Legend chi tiết */}
      <ul className="w-full min-w-0 flex-1 space-y-2" aria-label={`Chú giải ${title}`}>
        {segments.map((seg) => {
          const isActive = activeKey === seg.key;
          return (
            <li key={seg.key}>
              <button
                type="button"
                onMouseEnter={() => setActiveKey(seg.key)}
                onMouseLeave={() => setActiveKey(null)}
                onFocus={() => setActiveKey(seg.key)}
                onBlur={() => setActiveKey(null)}
                className={`w-full min-h-[44px] flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-left transition-colors cursor-pointer ${
                  isActive
                    ? "bg-slate-50 border-slate-300"
                    : "bg-white border-slate-100 hover:bg-slate-50"
                }`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: seg.color }}
                    aria-hidden="true"
                  />
                  <span className="text-xs font-medium text-slate-700 truncate">
                    {seg.label}
                  </span>
                </span>
                <span className="flex items-center gap-2 shrink-0 tabular-nums">
                  <span className="text-xs font-bold text-slate-900">
                    {formatCurrencyVND(seg.value)}
                  </span>
                  <span className="text-[11px] font-medium text-slate-500 w-12 text-right">
                    {seg.percentage.toFixed(1)}%
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
