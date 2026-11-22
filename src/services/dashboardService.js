import { apiClient } from "./apiClient.js";
import { mockAnomalyAlerts } from "../mocks/anomoliesData.js";
import { mockParkingFloors } from "../mocks/parkingLotData.js";
import { mockParkingHistory } from "../mocks/parkingHistoryData.js";
import { isMockEnabled } from "../config/appConfig.js";

/**
 * Format currency VND (e.g. 35400000 -> "35.4M" or formatted VND)
 */
export function formatRevenueDisplay(amount) {
  if (amount === null || amount === undefined) {
    return "—";
  }
  const num = typeof amount === "string" ? parseFloat(amount) : Number(amount);
  if (Number.isNaN(num)) return "0đ";
  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}B`;
  }
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(0)}K`;
  }
  return `${num.toLocaleString("vi-VN")}đ`;
}

/**
 * Format ISO datetime string to HH:mm (or dd/MM HH:mm)
 */
export function formatTimeDisplay(isoString) {
  if (!isoString) return "";
  try {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return String(isoString);
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  } catch {
    return String(isoString);
  }
}

/**
 * Format ISO datetime string to "dd/MM/yyyy HH:mm"
 */
export function formatDateTimeDisplay(isoString) {
  if (!isoString) return "";
  try {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return String(isoString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return String(isoString);
  }
}

/**
 * Normalize alert data from backend system_alert / dashboard alerts to UI shape
 */
export function normalizeDashboardAlert(alert, index = 0) {
  if (!alert) return null;
  const time = alert.time || (alert.occurred_at ? formatTimeDisplay(alert.occurred_at) : "Vừa xong");
  const content = alert.content || alert.message || "Cảnh báo hệ thống";
  const severity = (alert.severity || "INFO").toUpperCase();
  const level = alert.level || (severity === "CRITICAL" ? "danger" : severity === "WARNING" ? "warning" : "info");
  return {
    id: alert.id ?? `ALT-${index + 1}`,
    time,
    content,
    level,
    targetPlate: alert.targetPlate || (alert.entity_type === "vehicle" ? alert.license_plate : undefined),
    targetSlot: alert.targetSlot || (alert.entity_type === "parking_slot" ? alert.slot_code : undefined),
    targetGate: alert.targetGate,
  };
}

/**
 * Helper to get status badge text for occupancy rate
 */
export function getOccupancyStatusText(occupancyRatePct = 0) {
  if (occupancyRatePct >= 90) return "Sắp đầy";
  if (occupancyRatePct >= 75) return "Gần đầy";
  return "Còn chỗ";
}

/**
 * Map backend KPI response to homepage stats model
 */
export function mapBackendKPIsToStats(kpis = {}, trafficChart = []) {
  const slots = kpis.slots || {};
  const traffic = kpis.traffic || {};
  const revenue = kpis.revenue || null;
  const ai = kpis.ai_recognition || {};

  const totalLocationsCount = slots.total_slots ?? 0;
  const totalLocationsStatusText = slots.status_text || getOccupancyStatusText(slots.occupancy_rate_pct);

  const occupancyPercent = typeof slots.occupancy_rate_pct === "number" ? slots.occupancy_rate_pct : 0;
  const occupiedCount = slots.occupied_slots ?? slots.used_slots ?? 0;
  const emptyCount = slots.available_slots ?? Math.max(0, (slots.operational_slots || slots.total_slots || 0) - occupiedCount);

  // Revenue display
  const hasRevenue = Boolean(revenue && revenue.total_revenue !== undefined && revenue.total_revenue !== null);
  const revenueAmount = hasRevenue ? formatRevenueDisplay(revenue.total_revenue) : "—";
  const growthText = hasRevenue
    ? (revenue.vietqr_pct !== undefined ? `VietQR ${Number(revenue.vietqr_pct).toFixed(0)}%` : "Hôm nay")
    : "Chưa có dữ liệu";

  // Calculate chart heights from traffic_chart (last 6 points) or default
  let chartHeights = [35, 50, 30, 75, 90, 100];
  if (Array.isArray(trafficChart) && trafficChart.length > 0) {
    const recentPoints = trafficChart.slice(-6);
    const maxVal = Math.max(...recentPoints.map((p) => p.total_movements || (p.entry_count + p.exit_count) || 1), 1);
    chartHeights = recentPoints.map((p) => {
      const val = p.total_movements || (p.entry_count + p.exit_count) || 0;
      return Math.max(15, Math.round((val / maxVal) * 100));
    });
    while (chartHeights.length < 6) {
      chartHeights.unshift(30);
    }
  }

  const inbound = traffic.today_entries ?? 0;
  const outbound = traffic.today_exits ?? 0;
  const activeGates = ai.active_auto_scan_gates ?? 0;

  return {
    totalLocations: {
      count: totalLocationsCount,
      statusText: totalLocationsStatusText,
      growthText: `Đang hoạt động ${slots.operational_slots ?? totalLocationsCount}`,
      period: "Hôm nay",
    },
    occupancyRate: {
      percent: occupancyPercent,
      statusText: slots.status_text || getOccupancyStatusText(occupancyPercent),
      occupied: occupiedCount,
      empty: emptyCount,
    },
    revenueToday: {
      amount: revenueAmount,
      growthText,
      chartHeights,
    },
    traffic: {
      inbound,
      outbound,
      gateCount: activeGates,
      modeText: "Tự do",
    },
  };
}

/**
 * Normalize activity item into history table row
 */
export function mapActivityToHistoryRow(activity, index = 0) {
  if (!activity) return null;
  const isOut = activity.direction === "OUT";
  const timestampDisplay = activity.timestamp ? formatDateTimeDisplay(activity.timestamp) : "";
  const feeNumber = activity.fee_amount ? Number(activity.fee_amount) : 0;
  const feeDisplay = feeNumber > 0 ? `${feeNumber.toLocaleString("vi-VN")}đ` : "0đ";

  return {
    id: activity.id ?? `ACT-${index + 1}`,
    sessionCode: activity.session_code || `SS-${activity.id || index + 1}`,
    licensePlate: activity.license_plate || "—",
    entryTime: !isOut ? timestampDisplay : "—",
    exitTime: isOut ? timestampDisplay : "",
    duration: isOut ? "Hoàn thành" : "Đang đỗ",
    fee: feeDisplay,
    feeNumber,
    plateImageUrl: activity.plate_image_url || activity.plateImageUrl || null,
    vehicleType: activity.vehicle_type || activity.vehicleType || "Ô tô",
    status: isOut ? "completed" : "in_progress",
    ticketType: activity.ticket_type || "Vé lượt",
  };
}

/**
 * Robust fetch helper that attempts primary endpoint first, then secondary fallback endpoint
 */
async function fetchWithFallback(primaryUrl, fallbackUrl) {
  try {
    return await apiClient(primaryUrl, { method: "GET" });
  } catch (err) {
    if (fallbackUrl && fallbackUrl !== primaryUrl) {
      return await apiClient(fallbackUrl, { method: "GET" });
    }
    throw err;
  }
}

export const dashboardService = {
  /**
   * Fetch overview metrics (4 KPI cards)
   * Connects to GET /api/v1/dashboard/kpis/ (or /api/v1/reports/dashboard/kpis/)
   */
  getOverviewMetrics: async () => {
    if (isMockEnabled("dashboard")) {
      return {
        success: true,
        data: {
          totalLocations: { count: 24, statusText: "Khu bãi đang mở", growthText: "↗ +2 bãi mới", period: "Tháng này" },
          occupancyRate: { percent: 78.4, statusText: "Gần đầy", occupied: 392, empty: 108 },
          revenueToday: { amount: "35.4M", growthText: "▲ +14.2%", chartHeights: [35, 50, 30, 75, 90, 100] },
          traffic: { inbound: 1420, outbound: 1180, gateCount: 4, modeText: "Tự do" },
        },
      };
    }

    const [kpisRes, trafficRes] = await Promise.allSettled([
      fetchWithFallback("/api/v1/dashboard/kpis/", "/api/v1/reports/dashboard/kpis/"),
      fetchWithFallback("/api/v1/dashboard/traffic/", "/api/v1/reports/dashboard/traffic/"),
    ]);

    if (kpisRes.status === "rejected" || !kpisRes.value) {
      const err = kpisRes.reason || new Error("Không thể tải chỉ số KPI từ API Backend");
      throw err;
    }

    const kpis = kpisRes.value;
    const trafficChart =
      trafficRes.status === "fulfilled"
        ? (Array.isArray(trafficRes.value) ? trafficRes.value : (trafficRes.value?.results || []))
        : [];

    return {
      success: true,
      data: mapBackendKPIsToStats(kpis, trafficChart),
    };
  },

  /**
   * Fetch anomaly alerts
   * Connects to GET /api/v1/dashboard/alerts/ (or /api/v1/reports/dashboard/alerts/)
   */
  getAnomalyAlerts: async () => {
    if (isMockEnabled("dashboard")) {
      return { success: true, data: mockAnomalyAlerts };
    }

    const rawAlerts = await fetchWithFallback("/api/v1/dashboard/alerts/", "/api/v1/reports/dashboard/alerts/");
    const alertList = Array.isArray(rawAlerts) ? rawAlerts : (rawAlerts?.results || []);
    const mapped = alertList.map((a, i) => normalizeDashboardAlert(a, i));
    return { success: true, data: mapped };
  },

  /**
   * Fetch recent parking history / activity feed
   * Connects to GET /api/v1/dashboard/activities/ (or /api/v1/reports/dashboard/activities/)
   */
  getAllHistory: async () => {
    if (isMockEnabled("dashboard")) {
      return {
        success: true,
        data: [...mockParkingHistory],
        total: mockParkingHistory.length,
      };
    }

    const activities = await fetchWithFallback("/api/v1/dashboard/activities/", "/api/v1/reports/dashboard/activities/");
    const activityList = Array.isArray(activities) ? activities : (activities?.results || []);
    const mapped = activityList.map((act, i) => mapActivityToHistoryRow(act, i));
    return {
      success: true,
      data: mapped,
      total: mapped.length,
    };
  },

  /**
   * Filter history locally or from query
   */
  filterHistory: async ({ keyword = "", vehicleType = "ALL", status = "ALL" } = {}) => {
    const all = await dashboardService.getAllHistory();
    const query = (keyword || "").trim().toLowerCase();

    const filtered = (all.data || []).filter((item) => {
      const matchKeyword =
        !query ||
        item.licensePlate?.toLowerCase().includes(query) ||
        item.sessionCode?.toLowerCase().includes(query);

      const matchVehicle =
        vehicleType === "ALL" || item.vehicleType === vehicleType;

      const matchStatus = status === "ALL" || item.status === status;

      return matchKeyword && matchVehicle && matchStatus;
    });

    return {
      success: true,
      data: filtered,
      total: filtered.length,
    };
  },

  /**
   * Get single history item by id
   */
  getHistoryById: async (id) => {
    const all = await dashboardService.getAllHistory();
    const record = (all.data || []).find((item) => String(item.id) === String(id));
    if (record) {
      return { success: true, data: record };
    }
    if (isMockEnabled("dashboard")) {
      const mockRecord = mockParkingHistory.find((item) => String(item.id) === String(id));
      if (mockRecord) {
        return { success: true, data: mockRecord };
      }
    }
    throw new Error(`Không tìm thấy phiên đỗ xe mã ${id}`);
  },

  /**
   * Get floor details for a specific floor (B1, B2, B3)
   * Connects to GET /api/v1/dashboard/floors/
   */
  getFloorDetails: async (floorId = "B1") => {
    const normalizedFloorId = String(floorId).toUpperCase();

    if (isMockEnabled("dashboard")) {
      const fallbackFloor = mockParkingFloors.find(
        (f) => f.floorId?.toUpperCase() === normalizedFloorId
      ) || mockParkingFloors[0];
      return { success: true, data: fallbackFloor };
    }

    const floors = await fetchWithFallback("/api/v1/dashboard/floors/", "/api/v1/reports/dashboard/floors/");
    const floorList = Array.isArray(floors) ? floors : (floors?.results || []);
    if (floorList.length > 0) {
      const matched = floorList.find(
        (f) =>
          f.floor_code?.toUpperCase() === normalizedFloorId ||
          f.floor_name?.toUpperCase().includes(normalizedFloorId) ||
          String(f.floor_id) === normalizedFloorId
      );

      if (matched) {
        const floorData = {
          floorId: matched.floor_code || normalizedFloorId,
          floorName: matched.floor_name || `Tầng ${normalizedFloorId}`,
          totalSlots: matched.total_slots ?? 0,
          operationalSlots: matched.operational_slots ?? 0,
          usedSlots: matched.used_slots ?? 0,
          availableSlots: matched.available_slots ?? 0,
          occupancyPercentage: matched.occupancy_percentage ?? 0,
          statusBadge: matched.status_badge || "",
          zones: Array.isArray(matched.zones) ? matched.zones : [],
        };
        return { success: true, data: floorData };
      }
    }
    throw new Error(`Không tìm thấy dữ liệu tầng ${normalizedFloorId}`);
  },

  /**
   * Get slots by zone
   */
  getSlotsByZone: async (floorId, zoneId) => {
    const floorRes = await dashboardService.getFloorDetails(floorId);
    const floor = floorRes.data;
    const zone = floor?.zones?.find((z) => z.zoneId === zoneId);
    if (zone) {
      return { success: true, slots: zone.slots || [] };
    }
    throw new Error("Không tìm thấy khu vực chỉ định");
  },

  /**
   * Load entire initial dashboard state:
   * First attempts single aggregated endpoint GET /api/v1/dashboard/ (or /api/v1/reports/dashboard/)
   * In case of 404 or missing aggregated endpoint, falls back to sub-endpoints.
   * If mock is disabled and backend fails, errors propagate without silent mock fallback.
   */
  loadInitialDashboard: async (defaultFloor = "B1") => {
    if (isMockEnabled("dashboard")) {
      const [metrics, alerts, history, floorData] = await Promise.all([
        dashboardService.getOverviewMetrics(),
        dashboardService.getAnomalyAlerts(),
        dashboardService.getAllHistory(),
        dashboardService.getFloorDetails(defaultFloor),
      ]);
      return {
        stats: metrics.data,
        alerts: alerts.data,
        history: history.data,
        currentFloor: floorData.data,
      };
    }

    try {
      const overview = await fetchWithFallback("/api/v1/dashboard/", "/api/v1/reports/dashboard/");
      if (overview && overview.kpis) {
        const stats = mapBackendKPIsToStats(overview.kpis, overview.traffic_chart || []);
        
        const rawAlerts = Array.isArray(overview.alerts) ? overview.alerts : [];
        const alerts = rawAlerts.map((a, i) => normalizeDashboardAlert(a, i));

        const rawActivities = Array.isArray(overview.recent_activities) ? overview.recent_activities : [];
        const history = rawActivities.map((act, i) => mapActivityToHistoryRow(act, i));

        const normalizedFloorId = String(defaultFloor).toUpperCase();
        let currentFloor = null;
        if (Array.isArray(overview.floors) && overview.floors.length > 0) {
          const matched = overview.floors.find(
            (f) =>
              f.floor_code?.toUpperCase() === normalizedFloorId ||
              f.floor_name?.toUpperCase().includes(normalizedFloorId) ||
              String(f.floor_id) === normalizedFloorId
          );
          const targetFloor = matched || overview.floors[0];
          if (targetFloor) {
            currentFloor = {
              floorId: targetFloor.floor_code || normalizedFloorId,
              floorName: targetFloor.floor_name || `Tầng ${normalizedFloorId}`,
              totalSlots: targetFloor.total_slots ?? 0,
              operationalSlots: targetFloor.operational_slots ?? 0,
              usedSlots: targetFloor.used_slots ?? 0,
              availableSlots: targetFloor.available_slots ?? 0,
              occupancyPercentage: targetFloor.occupancy_percentage ?? 0,
              statusBadge: targetFloor.status_badge || "",
              zones: Array.isArray(targetFloor.zones) ? targetFloor.zones : [],
            };
          }
        }

        return {
          stats,
          alerts,
          history,
          currentFloor,
        };
      }
    } catch (err) {
      console.warn("dashboardService.loadInitialDashboard aggregated endpoint unavailable, falling back to parallel sub-requests:", err.message);
    }

    // Parallel sub-requests: if backend is down or fails, sub-requests will throw error.
    const [metrics, alerts, history, floorData] = await Promise.all([
      dashboardService.getOverviewMetrics(),
      dashboardService.getAnomalyAlerts(),
      dashboardService.getAllHistory(),
      dashboardService.getFloorDetails(defaultFloor),
    ]);

    return {
      stats: metrics.data,
      alerts: alerts.data,
      history: history.data,
      currentFloor: floorData.data,
    };
  },

  /**
   * Alias for loadInitialDashboard to support composite dashboard queries
   */
  getDashboardComposite: async (defaultFloor = "B1") => {
    return dashboardService.loadInitialDashboard(defaultFloor);
  },
};
