import { apiClient } from "./apiClient";
import { getParkingSessions } from "./plateScanService";
import { getParkingStructure } from "./parkingLotService";

function normalizeDashboardOverview(payload = {}) {
  return {
    kpis: payload?.kpis || null,
    floors: Array.isArray(payload?.floors) ? payload.floors : [],
    trafficChart: Array.isArray(payload?.traffic_chart) ? payload.traffic_chart : [],
    alerts: Array.isArray(payload?.alerts) ? payload.alerts : [],
    recentActivities: Array.isArray(payload?.recent_activities)
      ? payload.recent_activities
      : [],
  };
}

export const dashboardService = {
  async getDashboardOverview(options = {}) {
    const response = await apiClient("/api/v1/dashboard/", {
      method: "GET",
      signal: options.signal,
    });
    return normalizeDashboardOverview(response);
  },

  async getRecentSessions({ page = 1, pageSize = 5 } = {}) {
    const response = await getParkingSessions({ page, page_size: pageSize });
    return {
      items: Array.isArray(response?.items) ? response.items : [],
      total: typeof response?.total === "number" ? response.total : 0,
    };
  },

  async getFloorStructure() {
    const response = await getParkingStructure();
    return Array.isArray(response) ? response : [];
  },

  async loadInitialDashboard() {
    const [overviewResult, sessionsResult, structureResult] =
      await Promise.allSettled([
        dashboardService.getDashboardOverview(),
        dashboardService.getRecentSessions({ page: 1, pageSize: 5 }),
        dashboardService.getFloorStructure(),
      ]);

    if (overviewResult.status === "rejected") {
      throw overviewResult.reason;
    }

    return {
      overview: overviewResult.value,
      sessions:
        sessionsResult.status === "fulfilled" ? sessionsResult.value.items : [],
      structure:
        structureResult.status === "fulfilled" ? structureResult.value : [],
      errors: {
        sessions:
          sessionsResult.status === "rejected"
            ? sessionsResult.reason?.message ||
              "Không thể tải danh sách lượt xe ra vào gần đây."
            : null,
        structure:
          structureResult.status === "rejected"
            ? structureResult.reason?.message ||
              "Không thể tải chi tiết khu vực theo tầng."
            : null,
      },
    };
  },
};
