import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

import {
  NON_REVENUE_DEFAULT_DESCRIPTION,
  getStatisticsSummary,
  normalizeStatisticsSummary,
} from "../src/services/reportService.js";
import { axiosInstance } from "../src/services/apiClient.js";
import {
  computeBarLayout,
  computeDonutSegments,
  computeGaugeArc,
  computeNiceAxisMax,
  describeArc,
  formatCompactVnd,
  getDatePresetRange,
  polarToCartesian,
  validateDateRange,
} from "../src/utils/statisticsChartHelpers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_ROOT = path.resolve(__dirname, "..");

const SAMPLE_BACKEND_PAYLOAD = {
  period: {
    start_date: "2026-11-01",
    end_date: "2026-11-18",
  },
  total_revenue: "15450000.00",
  revenue_by_ticket_type: {
    HOURLY: "3250000.00",
    DAILY: "1200000.00",
    MONTHLY: "7500000.00",
    QUARTERLY: "2000000.00",
    YEARLY: "1500000.00",
  },
  revenue_by_payment_method: {
    CASH: "4200000.00",
    VIETQR: "6800000.00",
    WALLET: "4450000.00",
  },
  non_revenue: {
    wallet_topup_total: "6500000.00",
    topup_cash_total: "3000000.00",
    topup_vietqr_total: "2000000.00",
    topup_vnpay_total: "1500000.00",
    description: NON_REVENUE_DEFAULT_DESCRIPTION,
  },
  traffic: {
    total_entries: 1420,
    total_exits: 1385,
    currently_parked: 35,
  },
  occupancy: {
    total_slots: 150,
    operational_slots: 148,
    occupied_slots: 35,
    available_slots: 110,
    reserved_slots: 3,
    charging_slots: 2,
    maintenance_slots: 2,
    occupancy_rate: 23.65,
  },
};

test("normalizeStatisticsSummary supports both flat DRF JSON and { status, data } envelope", () => {
  const flat = normalizeStatisticsSummary(SAMPLE_BACKEND_PAYLOAD);
  const wrapped = normalizeStatisticsSummary({
    status: "success",
    data: SAMPLE_BACKEND_PAYLOAD,
  });

  for (const parsed of [flat, wrapped]) {
    assert.deepEqual(parsed.period, {
      startDate: "2026-11-01",
      endDate: "2026-11-18",
    });
    assert.equal(parsed.totalRevenue, 15450000);
    assert.deepEqual(parsed.revenueByTicketType, {
      HOURLY: 3250000,
      DAILY: 1200000,
      MONTHLY: 7500000,
      QUARTERLY: 2000000,
      YEARLY: 1500000,
    });
    assert.deepEqual(parsed.revenueByPaymentMethod, {
      CASH: 4200000,
      VIETQR: 6800000,
      WALLET: 4450000,
    });
    assert.equal(parsed.nonRevenue.walletTopupTotal, 6500000);
    assert.equal(parsed.nonRevenue.topupCashTotal, 3000000);
    assert.equal(parsed.nonRevenue.topupVietqrTotal, 2000000);
    assert.equal(parsed.nonRevenue.topupVnpayTotal, 1500000);
    assert.deepEqual(parsed.traffic, {
      totalEntries: 1420,
      totalExits: 1385,
      currentlyParked: 35,
    });
    assert.equal(parsed.occupancy.totalSlots, 150);
    assert.equal(parsed.occupancy.operationalSlots, 148);
    assert.equal(parsed.occupancy.occupiedSlots, 35);
    assert.equal(parsed.occupancy.occupancyRate, 23.65);
  }
});

test("normalizeStatisticsSummary safely handles empty/null/invalid inputs", () => {
  const empty = normalizeStatisticsSummary(null);
  assert.equal(empty.totalRevenue, 0);
  assert.equal(empty.revenueByTicketType.HOURLY, 0);
  assert.equal(empty.revenueByPaymentMethod.WALLET, 0);
  assert.equal(empty.nonRevenue.walletTopupTotal, 0);
  assert.equal(empty.nonRevenue.topupVnpayTotal, 0);
  assert.equal(empty.traffic.totalEntries, 0);
  assert.equal(empty.occupancy.occupancyRate, 0);
});

test("getStatisticsSummary sends GET request to /api/v1/reports/statistics/summary/ with date params", async () => {
  const originalRequest = axiosInstance.request;
  let capturedConfig = null;

  axiosInstance.request = async (config) => {
    capturedConfig = config;
    return { data: SAMPLE_BACKEND_PAYLOAD };
  };

  try {
    const result = await getStatisticsSummary({
      startDate: "2026-11-01",
      endDate: "2026-11-18",
    });
    assert.equal(capturedConfig.url, "/api/v1/reports/statistics/summary/");
    assert.equal(capturedConfig.method, "GET");
    assert.deepEqual(capturedConfig.params, {
      start_date: "2026-11-01",
      end_date: "2026-11-18",
    });
    assert.equal(result.totalRevenue, 15450000);
  } finally {
    axiosInstance.request = originalRequest;
  }
});

test("SVG math helpers: polarToCartesian, describeArc, computeDonutSegments", () => {
  const topPoint = polarToCartesian(110, 110, 76, 0);
  assert.ok(Math.abs(topPoint.x - 110) < 1e-6);
  assert.ok(Math.abs(topPoint.y - 34) < 1e-6);

  const arcPath = describeArc(110, 110, 76, 0, 180);
  assert.ok(arcPath.startsWith("M "));
  assert.ok(arcPath.includes(" A 76 76 "));

  // Zero total
  const zeroDonut = computeDonutSegments([
    { key: "A", label: "A", value: 0, color: "#000" },
    { key: "B", label: "B", value: -10, color: "#111" },
  ]);
  assert.equal(zeroDonut.total, 0);
  assert.equal(zeroDonut.segments[0].percentage, 0);
  assert.equal(zeroDonut.segments[1].value, 0);

  // Single 100% slice
  const fullDonut = computeDonutSegments([
    { key: "WALLET", label: "Ví", value: 500000, color: "#6366F1" },
  ]);
  assert.equal(fullDonut.total, 500000);
  assert.equal(fullDonut.segments[0].percentage, 100);
  assert.ok(Math.abs(fullDonut.segments[0].arcLength - fullDonut.circumference) < 1e-6);

  // Multiple slices sum up to circumference
  const multiDonut = computeDonutSegments([
    { key: "CASH", label: "Tiền mặt", value: 250000, color: "#10B981" },
    { key: "VIETQR", label: "VietQR", value: 750000, color: "#3B82F6" },
  ]);
  assert.equal(multiDonut.total, 1000000);
  const sumArcs = multiDonut.segments.reduce((s, x) => s + x.arcLength, 0);
  assert.ok(Math.abs(sumArcs - multiDonut.circumference) < 1e-6);
  assert.equal(multiDonut.segments[0].dashOffset, 0);
  assert.ok(multiDonut.segments[1].dashOffset < 0);
});

test("SVG math helpers: computeNiceAxisMax, computeBarLayout, computeGaugeArc, formatCompactVnd", () => {
  assert.equal(computeNiceAxisMax(0, 4), 100);
  assert.equal(computeNiceAxisMax(15450000, 4), 20000000);

  const layout = computeBarLayout([
    { key: "A", label: "Lượt", value: 1, color: "#3B82F6" },
    { key: "B", label: "Tháng", value: 7500000, color: "#10B981" },
    { key: "C", label: "Quý", value: 0, color: "#8B5CF6" },
  ]);
  assert.equal(layout.ticks.length, 5);
  assert.equal(layout.bars.length, 3);
  assert.ok(layout.bars[0].height >= 4, "Small positive bar keeps minimum 4px height");
  assert.equal(layout.bars[2].height, 0);

  assert.equal(computeGaugeArc(-5).rate, 0);
  assert.equal(computeGaugeArc(-5).tone, "emerald");
  assert.equal(computeGaugeArc(75).tone, "amber");
  assert.equal(computeGaugeArc(90).tone, "rose");
  assert.equal(computeGaugeArc(130).rate, 100);

  assert.equal(formatCompactVnd(0), "0");
  assert.equal(formatCompactVnd(500000), "500K");
  assert.equal(formatCompactVnd(15500000), "15.5M");
});

test("computeNiceAxisMax and computeBarLayout produce distinct integer ticks for small counts", () => {
  assert.equal(computeNiceAxisMax(0, 4, { integerOnly: true }), 4);
  assert.equal(computeNiceAxisMax(1, 4, { integerOnly: true }), 4);
  assert.equal(computeNiceAxisMax(2, 4, { integerOnly: true }), 4);
  assert.equal(computeNiceAxisMax(3, 4, { integerOnly: true }), 4);
  assert.equal(computeNiceAxisMax(4, 4, { integerOnly: true }), 4);
  assert.equal(computeNiceAxisMax(10, 4, { integerOnly: true }), 20);

  for (const smallMax of [1, 2, 3]) {
    const intLayout = computeBarLayout(
      [
        { key: "entries", label: "Lượt vào", value: smallMax, color: "#2563EB" },
        { key: "exits", label: "Lượt ra", value: 0, color: "#10B981" },
      ],
      { tickCount: 4, integerOnly: true },
    );
    const tickValues = intLayout.ticks.map((t) => t.value);
    assert.deepEqual(tickValues, [0, 1, 2, 3, 4]);
    assert.equal(new Set(tickValues).size, tickValues.length);
  }
});

test("Date preset & validation helpers (PROP-4.7.1-P01)", () => {
  const fixedNow = new Date(2026, 10, 18, 9, 30, 0);
  assert.deepEqual(getDatePresetRange("today", fixedNow), {
    startDate: "2026-11-18",
    endDate: "2026-11-18",
  });
  assert.deepEqual(getDatePresetRange("last7days", fixedNow), {
    startDate: "2026-11-12",
    endDate: "2026-11-18",
  });
  assert.deepEqual(getDatePresetRange("thisMonth", fixedNow), {
    startDate: "2026-11-01",
    endDate: "2026-11-18",
  });

  assert.equal(validateDateRange("2026-11-01", "2026-11-18").valid, true);
  assert.equal(validateDateRange("2026-11-18", "2026-11-18").valid, true);

  const reversed = validateDateRange("2026-11-20", "2026-11-01");
  assert.equal(reversed.valid, false);
  assert.equal(reversed.code, "PROP-4.7.1-P01");
  assert.equal(reversed.error, "Dữ liệu điều kiện thống kê không hợp lệ.");

  assert.equal(validateDateRange("", "2026-11-01").valid, false);
  assert.equal(validateDateRange("2026-02-30", "2026-03-01").valid, false);
});

test("SSR rendering of Statistics SVG components and accessible tables", async () => {
  const vite = await createServer({
    root: FRONTEND_ROOT,
    server: { middlewareMode: true },
    appType: "custom",
    logLevel: "silent",
  });

  try {
    const statsModule = await vite.ssrLoadModule("/src/components/Statistics/index.js");
    const {
      StatisticsFilterBar,
      StatisticsKpiGrid,
      StatisticsDonutChart,
      StatisticsBarChart,
      OccupancyGaugeCard,
      StatisticsBreakdownTables,
    } = statsModule;

    const normalized = normalizeStatisticsSummary(SAMPLE_BACKEND_PAYLOAD);

    const filterHtml = renderToStaticMarkup(
      React.createElement(StatisticsFilterBar, {
        startDate: "2026-11-01",
        endDate: "2026-11-18",
        activePreset: "thisMonth",
        validationError: {
          code: "PROP-4.7.1-P01",
          error: "Dữ liệu điều kiện thống kê không hợp lệ.",
          detail: "Ngày bắt đầu không được lớn hơn ngày kết thúc.",
        },
      }),
    );
    assert.ok(filterHtml.includes("Hôm nay"));
    assert.ok(filterHtml.includes("7 ngày qua"));
    assert.ok(filterHtml.includes("Tháng này"));
    assert.ok(filterHtml.includes("Dữ liệu điều kiện thống kê không hợp lệ."));

    const kpiHtml = renderToStaticMarkup(
      React.createElement(StatisticsKpiGrid, { summary: normalized }),
    );
    assert.ok(kpiHtml.includes("Tổng doanh thu"));
    assert.ok(kpiHtml.includes("Non-Revenue"));
    assert.ok(kpiHtml.includes("WALLET"));

    const donutHtml = renderToStaticMarkup(
      React.createElement(StatisticsDonutChart, {
        title: "Cơ cấu thanh toán",
        items: [
          { key: "CASH", label: "Tiền mặt (CASH)", value: 4200000, color: "#10B981" },
          { key: "VIETQR", label: "VietQR", value: 6800000, color: "#3B82F6" },
          { key: "WALLET", label: "Ví điện tử (WALLET)", value: 4450000, color: "#6366F1" },
        ],
      }),
    );
    assert.ok(donutHtml.includes("<svg"));
    assert.ok(donutHtml.includes("<circle"));
    assert.ok(donutHtml.includes("Ví điện tử (WALLET)"));

    const barHtml = renderToStaticMarkup(
      React.createElement(StatisticsBarChart, {
        title: "Doanh thu loại vé",
        items: [
          { key: "HOURLY", label: "Vé lượt", value: 3250000, color: "#3B82F6" },
          { key: "MONTHLY", label: "Vé tháng", value: 7500000, color: "#10B981" },
        ],
      }),
    );
    assert.ok(barHtml.includes("<svg"));
    assert.ok(barHtml.includes("<rect"));

    const smallTrafficBarHtml = renderToStaticMarkup(
      React.createElement(StatisticsBarChart, {
        title: "Lưu lượng xe nhỏ",
        isCurrency: false,
        unitLabel: "lượt",
        items: [
          { key: "entries", label: "Lượt vào", value: 1, color: "#2563EB" },
          { key: "exits", label: "Lượt ra", value: 1, color: "#10B981" },
          { key: "parked", label: "Đang đỗ", value: 0, color: "#6366F1" },
        ],
      }),
    );
    const yTickMatches = Array.from(
      smallTrafficBarHtml.matchAll(/text-anchor="end"[^>]*>([^<]+)<\/text>/g),
    ).map((m) => m[1]);
    assert.deepEqual(yTickMatches, ["0", "1", "2", "3", "4"]);

    const gaugeHtml = renderToStaticMarkup(
      React.createElement(OccupancyGaugeCard, { occupancy: normalized.occupancy }),
    );
    assert.ok(gaugeHtml.includes("<svg"));
    assert.ok(gaugeHtml.includes('role="progressbar"'));
    assert.ok(gaugeHtml.includes("23.6%"));

    const tablesHtml = renderToStaticMarkup(
      React.createElement(StatisticsBreakdownTables, { summary: normalized }),
    );
    assert.ok(tablesHtml.includes("<table"));
    assert.ok(tablesHtml.includes("<caption"));
    assert.ok(tablesHtml.includes('scope="col"'));
    assert.ok(tablesHtml.includes('scope="row"'));
    assert.ok(tablesHtml.includes("<tfoot"));
    assert.ok(tablesHtml.includes("Không tính vào tổng doanh thu bãi xe"));
    assert.ok(tablesHtml.includes("Nạp qua VNPAY:"));
    assert.ok(tablesHtml.includes("1.500.000đ"));
    // Đảm bảo không đặt class `flex` trực tiếp lên <th scope="row">
    assert.equal(/<th[^>]*class="[^"]*\bflex\b[^"]*"/.test(tablesHtml), false);
    assert.ok(tablesHtml.includes('class="inline-flex items-center gap-2"'));

    // Kiểm tra bộ lọc preset luôn cho phép bấm lại preset đang active khi không busy
    const activePresetHtml = renderToStaticMarkup(
      React.createElement(StatisticsFilterBar, {
        startDate: "2026-11-01",
        endDate: "2026-11-18",
        activePreset: "thisMonth",
        isBusy: false,
      }),
    );
    assert.match(
      activePresetHtml,
      /<button[^>]*aria-pressed="true"[^>]*>Tháng này<\/button>/,
    );
    const activePresetButtonTag =
      activePresetHtml.match(/<button[^>]*aria-pressed="true"[^>]*>/)?.[0] ?? "";
    assert.ok(activePresetButtonTag.length > 0);
    assert.equal(/\sdisabled(?:=""|\s|>)/.test(activePresetButtonTag), false);
  } finally {
    await vite.close();
  }
});

test("Static guards: Manager-only RBAC and strict exclusion of 4.7.2 & new dependencies", () => {
  const sidebarSrc = fs.readFileSync(
    path.join(FRONTEND_ROOT, "src/components/layout/AppSidebar.jsx"),
    "utf-8",
  );
  assert.match(sidebarSrc, /key:\s*"statistics"[\s\S]*?managerOnly:\s*true/);

  const appSrc = fs.readFileSync(path.join(FRONTEND_ROOT, "src/App.jsx"), "utf-8");
  assert.ok(appSrc.includes("ROUTES.STATISTICS"));
  assert.ok(appSrc.includes("ManagerOnlyRoute"));
  assert.ok(appSrc.includes("<StatisticsPage />"));

  const statsPageSrc = fs.readFileSync(
    path.join(FRONTEND_ROOT, "src/pages/StatisticsPage.jsx"),
    "utf-8",
  );
  assert.ok(statsPageSrc.includes("if (!isManager)"));
  assert.ok(statsPageSrc.includes("Dữ liệu không tìm thấy"));
  // Đảm bảo bấm lại preset đang active vẫn tăng reloadNonce để kích hoạt tải lại dữ liệu
  assert.match(
    statsPageSrc,
    /const handleSelectPreset = [\s\S]*?setAppliedRange\(nextRange\);[\s\S]*?setReloadNonce\(\(n\) => n \+ 1\);/,
  );
  // Đảm bảo handleRefresh xóa lỗi validate và đồng bộ lại draft dates theo appliedRange
  assert.match(
    statsPageSrc,
    /const handleRefresh = [\s\S]*?setDraftStartDate\(appliedRange\.startDate\);[\s\S]*?setDraftEndDate\(appliedRange\.endDate\);[\s\S]*?setValidationError\(null\);/,
  );
  // Strict prohibition of 4.7.2
  assert.equal(statsPageSrc.includes("4.7.2"), false);
  assert.equal(appSrc.includes("4.7.2"), false);
  assert.equal(appSrc.includes("/statistics/daily"), false);
  assert.equal(appSrc.includes("/statistics/monthly"), false);
  assert.equal(appSrc.includes("/statistics/yearly"), false);

  const pkg = JSON.parse(
    fs.readFileSync(path.join(FRONTEND_ROOT, "package.json"), "utf-8"),
  );
  for (const forbidden of ["recharts", "chart.js", "react-chartjs-2", "apexcharts", "d3"]) {
    assert.equal(forbidden in (pkg.dependencies || {}), false);
    assert.equal(forbidden in (pkg.devDependencies || {}), false);
  }
});

test("Statistics 1024px narrow card layout prevents donut legend horizontal overflow while preserving 44px touch targets", async () => {
  const vite = await createServer({
    root: FRONTEND_ROOT,
    server: { middlewareMode: true },
    appType: "custom",
    logLevel: "silent",
  });

  try {
    const { StatisticsDonutChart, OccupancyGaugeCard } = await vite.ssrLoadModule(
      "/src/components/Statistics/index.js",
    );

    const methodItems = [
      { key: "CASH", label: "Tiền mặt (CASH)", value: 80000, color: "#10B981" },
      { key: "VIETQR", label: "Chuyển khoản VietQR", value: 0, color: "#3B82F6" },
      { key: "WALLET", label: "Ví điện tử (WALLET)", value: 0, color: "#6366F1" },
    ];

    const donutHtml = renderToStaticMarkup(
      React.createElement(StatisticsDonutChart, {
        title: "Biểu đồ cơ cấu doanh thu theo phương thức thanh toán",
        items: methodItems,
      }),
    );

    // At 1024px (lg:grid-cols-2 with 280px sidebar offset), each card is ~336px wide.
    // Stacking at lg:flex-col and setting min-w-0 on the legend prevents horizontal overflow past 1024px.
    assert.match(
      donutHtml,
      /<div class="[^"]*\bflex-col\b[^"]*\bsm:flex-row\b[^"]*\blg:flex-col\b[^"]*\bxl:flex-row\b[^"]*"/,
    );
    assert.match(
      donutHtml,
      /<ul class="[^"]*\bw-full\b[^"]*\bmin-w-0\b[^"]*\bflex-1\b[^"]*"/,
    );

    const legendButtons = donutHtml.match(/<button[^>]*>/g) || [];
    assert.equal(legendButtons.length, 3);
    for (const btnTag of legendButtons) {
      assert.match(btnTag, /(?:^|[\s"])min-h-\[44px\](?=[\s"]|$)/);
      assert.match(btnTag, /\bw-full\b/);
    }

    const gaugeHtml = renderToStaticMarkup(
      React.createElement(OccupancyGaugeCard, {
        occupancy: SAMPLE_BACKEND_PAYLOAD.occupancy,
      }),
    );
    assert.match(gaugeHtml, /<article class="[^"]*\bmin-w-0\b[^"]*"/);
    assert.match(
      gaugeHtml,
      /<div class="[^"]*\bflex-col\b[^"]*\bsm:flex-row\b[^"]*\blg:flex-col\b[^"]*\bxl:flex-row\b[^"]*"/,
    );
    assert.match(gaugeHtml, /<div class="[^"]*\bw-full\b[^"]*\bmin-w-0\b[^"]*\bflex-1\b[^"]*"/);
  } finally {
    await vite.close();
  }

  const statsPageSrc = fs.readFileSync(
    path.join(FRONTEND_ROOT, "src/pages/StatisticsPage.jsx"),
    "utf-8",
  );
  const gridArticles = statsPageSrc.match(/<article className="[^"]*">/g) || [];
  assert.equal(gridArticles.length, 3);
  for (const tag of gridArticles) {
    assert.match(tag, /\bmin-w-0\b/, `StatisticsPage grid article must include min-w-0: ${tag}`);
  }
});
