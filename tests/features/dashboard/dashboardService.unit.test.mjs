import test from "node:test";
import assert from "node:assert/strict";
import {
  dashboardService,
  formatRevenueDisplay,
  formatTimeDisplay,
  formatDateTimeDisplay,
  normalizeDashboardAlert,
  getOccupancyStatusText,
  mapBackendKPIsToStats,
  mapActivityToHistoryRow,
} from "#src/services/dashboardService.js";

test("DASHBOARD-01: formatRevenueDisplay formats amounts correctly", () => {
  assert.equal(formatRevenueDisplay(35400000), "35.4M");
  assert.equal(formatRevenueDisplay(1200000000), "1.2B");
  assert.equal(formatRevenueDisplay(50000), "50K");
  assert.equal(formatRevenueDisplay(500), "500đ");
  assert.equal(formatRevenueDisplay(null), "—");
  assert.equal(formatRevenueDisplay(undefined), "—");
});

test("DASHBOARD-02: getOccupancyStatusText returns correct thresholds", () => {
  assert.equal(getOccupancyStatusText(95), "Sắp đầy");
  assert.equal(getOccupancyStatusText(90), "Sắp đầy");
  assert.equal(getOccupancyStatusText(80), "Gần đầy");
  assert.equal(getOccupancyStatusText(75), "Gần đầy");
  assert.equal(getOccupancyStatusText(50), "Còn chỗ");
});

test("DASHBOARD-03: mapBackendKPIsToStats maps backend payload to homepage stats", () => {
  const backendKpis = {
    slots: {
      total_slots: 96,
      operational_slots: 90,
      available_slots: 18,
      occupied_slots: 72,
      used_slots: 72,
      occupancy_rate_pct: 80.0,
      status_text: "Gần đầy",
    },
    traffic: {
      today_entries: 250,
      today_exits: 210,
      active_parking: 40,
    },
    revenue: {
      revenue_date: "2026-11-22",
      total_revenue: "15500000.00",
      cash_revenue: "5000000.00",
      vietqr_revenue: "10500000.00",
      cash_pct: "32.26",
      vietqr_pct: "67.74",
    },
    ai_recognition: {
      total_sessions: 460,
      ai_sessions: 450,
      manual_sessions: 10,
      ai_recognition_rate_pct: "97.83",
      manual_rate_pct: "2.17",
      avg_ai_confidence: "98.50",
      active_auto_scan_gates: 4,
    },
  };

  const trafficChart = [
    { traffic_hour: "2026-11-22T08:00:00Z", entry_count: 10, exit_count: 5, total_movements: 15 },
    { traffic_hour: "2026-11-22T09:00:00Z", entry_count: 20, exit_count: 10, total_movements: 30 },
  ];

  const stats = mapBackendKPIsToStats(backendKpis, trafficChart);

  assert.equal(stats.totalLocations.count, 96);
  assert.equal(stats.totalLocations.statusText, "Gần đầy");
  assert.equal(stats.occupancyRate.percent, 80.0);
  assert.equal(stats.occupancyRate.occupied, 72);
  assert.equal(stats.occupancyRate.empty, 18);
  assert.equal(stats.revenueToday.amount, "15.5M");
  assert.equal(stats.traffic.inbound, 250);
  assert.equal(stats.traffic.outbound, 210);
  assert.equal(stats.traffic.gateCount, 4);
  assert.equal(stats.traffic.modeText, "Tự do");
});

test("DASHBOARD-04: normalizeDashboardAlert formats alert properly", () => {
  const backendAlert = {
    id: 101,
    alert_type: "BLACKLIST_PLATE",
    severity: "CRITICAL",
    message: "Biển số 51G-888.88 thuộc Blacklist",
    entity_type: "vehicle",
    license_plate: "51G-888.88",
    occurred_at: "2026-11-22T10:14:00Z",
  };

  const alert = normalizeDashboardAlert(backendAlert);
  assert.equal(alert.id, 101);
  assert.equal(alert.content, "Biển số 51G-888.88 thuộc Blacklist");
  assert.equal(alert.level, "danger");
  assert.ok(alert.time.includes(":"));
});

test("DASHBOARD-05: mapActivityToHistoryRow maps vehicle entry/exit log", () => {
  const backendActivity = {
    id: 55,
    session_code: "SS-20261122-0055",
    license_plate: "51K-992.14",
    direction: "OUT",
    timestamp: "2026-11-22T11:45:00Z",
    fee_amount: "35000.00",
    recognition_source: "AI",
  };

  const row = mapActivityToHistoryRow(backendActivity);
  assert.equal(row.id, 55);
  assert.equal(row.sessionCode, "SS-20261122-0055");
  assert.equal(row.licensePlate, "51K-992.14");
  assert.equal(row.fee, "35.000đ");
  assert.equal(row.status, "completed");
});

test("DASHBOARD-06: dashboardService throws error without silent fallback when mock is disabled and backend unreachable", async () => {
  // Khi mockConfig dashboard: undefined / false, không được nuốt lỗi mà phải ném lỗi ra ngoài
  await assert.rejects(
    async () => {
      await dashboardService.getOverviewMetrics();
    },
    (err) => {
      assert.ok(err);
      return true;
    },
    "getOverviewMetrics must reject when backend is unreachable without silent fallback"
  );

  await assert.rejects(
    async () => {
      await dashboardService.getAnomalyAlerts();
    },
    (err) => {
      assert.ok(err);
      return true;
    },
    "getAnomalyAlerts must reject when backend is unreachable without silent fallback"
  );

  await assert.rejects(
    async () => {
      await dashboardService.getAllHistory();
    },
    (err) => {
      assert.ok(err);
      return true;
    },
    "getAllHistory must reject when backend is unreachable without silent fallback"
  );

  await assert.rejects(
    async () => {
      await dashboardService.getFloorDetails("B1");
    },
    (err) => {
      assert.ok(err);
      return true;
    },
    "getFloorDetails must reject when backend is unreachable without silent fallback"
  );

  await assert.rejects(
    async () => {
      await dashboardService.loadInitialDashboard("B1");
    },
    (err) => {
      assert.ok(err);
      return true;
    },
    "loadInitialDashboard must reject when backend is unreachable without silent fallback"
  );
});

test("DASHBOARD-07: dashboardService returns mock data when mock is explicitly enabled", async () => {
  // Bật mock tường minh qua localStorage override (isMockEnabled("dashboard") === true)
  globalThis.window = {
    localStorage: {
      getItem: (key) => (key === "MOCK_DASHBOARD" ? "true" : null),
    },
  };

  try {
    const metrics = await dashboardService.getOverviewMetrics();
    assert.ok(metrics.success);
    assert.ok(metrics.data.totalLocations);
    assert.ok(metrics.data.occupancyRate);
    assert.ok(metrics.data.revenueToday);
    assert.ok(metrics.data.traffic);

    const alerts = await dashboardService.getAnomalyAlerts();
    assert.ok(alerts.success);
    assert.ok(Array.isArray(alerts.data));
    assert.ok(alerts.data.length > 0);

    const history = await dashboardService.getAllHistory();
    assert.ok(history.success);
    assert.ok(Array.isArray(history.data));
    assert.ok(history.total > 0);

    const floorB1 = await dashboardService.getFloorDetails("B1");
    assert.ok(floorB1.success);
    assert.equal(floorB1.data.floorId, "B1");
    assert.ok(Array.isArray(floorB1.data.zones));

    const initial = await dashboardService.loadInitialDashboard("B1");
    assert.ok(initial.stats);
    assert.ok(initial.alerts);
    assert.ok(initial.history);
    assert.ok(initial.currentFloor);

    const composite = await dashboardService.getDashboardComposite("B1");
    assert.ok(composite.stats);
    assert.ok(composite.alerts);
  } finally {
    delete globalThis.window;
  }
});
