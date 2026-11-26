import { useState } from "react";
import { formatCurrencyVND } from "../../constants/paymentConstants.js";
import {
  computeBarLayout,
  formatCompactVnd,
} from "../../utils/statisticsChartHelpers.js";

export default function StatisticsBarChart({
  title,
  items = [],
  isCurrency = true,
  unitLabel = "lượt",
}) {
  const [activeKey, setActiveKey] = useState(null);

  const layout = computeBarLayout(items, {
    width: 560,
    height: 260,
    padding: { top: 26, right: 20, bottom: 44, left: 68 },
    tickCount: 4,
    integerOnly: !isCurrency,
  });

  const formatValue = (val) => {
    if (isCurrency) {
      return formatCurrencyVND(val);
    }
    return `${Math.round(val).toLocaleString("vi-VN")} ${unitLabel}`;
  };

  const formatTick = (val) => {
    if (isCurrency) {
      return formatCompactVnd(val);
    }
    return Math.round(val).toLocaleString("vi-VN");
  };

  const activeBar = layout.bars.find((b) => b.key === activeKey) || null;
  const baselineY = layout.padding.top + layout.plotHeight;

  return (
    <div className="space-y-2">
      {/* Thanh trạng thái giá trị đang chọn/hover */}
      <div className="min-h-6 flex items-center justify-between text-xs text-slate-500">
        <span>
          {activeBar ? (
            <span className="font-semibold text-slate-800">
              {activeBar.label}: {formatValue(activeBar.value)}
            </span>
          ) : (
            "Di chuột hoặc chọn cột để xem chi tiết"
          )}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        className="w-full h-auto overflow-visible"
        role="img"
        aria-label={title}
      >
        {/* Đường lưới và nhãn trục Y */}
        {layout.ticks.map((tick) => (
          <g key={tick.value}>
            <line
              x1={layout.padding.left}
              y1={tick.y}
              x2={layout.width - layout.padding.right}
              y2={tick.y}
              stroke="#E2E8F0"
              strokeDasharray={tick.value === 0 ? undefined : "4 4"}
              strokeWidth={1}
            />
            <text
              x={layout.padding.left - 8}
              y={tick.y + 4}
              textAnchor="end"
              fill="#64748B"
              className="text-[11px] font-medium"
            >
              {formatTick(tick.value)}
            </text>
          </g>
        ))}

        {/* Các cột dữ liệu */}
        {layout.bars.map((bar) => {
          const isActive = activeKey === bar.key;
          const isDimmed = activeKey !== null && activeKey !== bar.key;
          const labelAbove = isCurrency
            ? formatCompactVnd(bar.value)
            : Math.round(bar.value).toLocaleString("vi-VN");

          return (
            <g
              key={bar.key}
              tabIndex={0}
              role="button"
              aria-label={`${bar.label}: ${formatValue(bar.value)}`}
              className="cursor-pointer focus:outline-none"
              onMouseEnter={() => setActiveKey(bar.key)}
              onMouseLeave={() => setActiveKey(null)}
              onFocus={() => setActiveKey(bar.key)}
              onBlur={() => setActiveKey(null)}
            >
              <title>{`${bar.label}: ${formatValue(bar.value)}`}</title>

              {/* Transparent hit-target ensures >= 44x44px pointer target at 375px without widening visible bar */}
              <rect
                x={Math.max(0, bar.centerX - Math.max(bar.width, 88) / 2)}
                y={layout.padding.top}
                width={Math.max(bar.width, 88)}
                height={layout.plotHeight + 24}
                fill="transparent"
              />

              {bar.height > 0 && (
                <rect
                  x={bar.x}
                  y={bar.y}
                  width={bar.width}
                  height={bar.height}
                  rx={6}
                  fill={bar.color}
                  opacity={isDimmed ? 0.45 : isActive ? 1 : 0.9}
                  className="transition-opacity duration-150"
                />
              )}

              {/* Nhãn giá trị phía trên cột */}
              <text
                x={bar.centerX}
                y={Math.max(14, (bar.height > 0 ? bar.y : baselineY) - 7)}
                textAnchor="middle"
                fill="#334155"
                className="text-[11px] font-semibold"
              >
                {labelAbove}
              </text>

              {/* Nhãn trục X */}
              <text
                x={bar.centerX}
                y={baselineY + 20}
                textAnchor="middle"
                fill="#475569"
                className="text-[11px] font-medium"
              >
                {bar.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
