import { apiClient } from "../services/apiClient";
import { mockAnomalyAlerts } from "../mocks/anomoliesData";
import { mockParkingFloors } from "../mocks/parkingLotData";
import { mockParkingHistory } from "../mocks/parkingHistoryData";

const USE_MOCK =
  import.meta.env.VITE_USE_MOCK?.trim().toLowerCase() === "true";

function formatDateTime(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")} - ${d.getDate()}/${d.getMonth() + 1}`;
  } catch {
    return iso;
  }
}

export const dashboardService = {
  /**
   * 1. LẤY THÔNG TIN BÃI ĐỖ XE THEO TẦNG
   */
  async getFloorDetails(floorId = "B1") {
    if (!USE_MOCK) {
      try {
        const structure = await apiClient("/api/v1/parking/structure/");
        if (Array.isArray(structure) && structure.length > 0) {
          const match = structure.find((f) => f.code === floorId || f.floorId === floorId);
          if (match) {
            return { success: true, data: match };
          }
        }
      } catch (err) {
        // Fallback to mock
      }
    }
    const floor = mockParkingFloors.find((f) => f.floorId === floorId) || mockParkingFloors[0];
    return {
      success: true,
      data: floor,
    };
  },

  /**
   * Lấy danh sách ô đỗ cụ thể thuộc một Khu của Tầng
   */
  async getSlotsByZone(floorId, zoneId) {
    const floorRes = await this.getFloorDetails(floorId);
    const zone = floorRes.data?.zones?.find((z) => z.zoneId === zoneId || z.code === zoneId);
    if (zone) {
      return { success: true, slots: zone.slots || [] };
    }
    return { success: false, slots: [] };
  },

  /**
   * 2. LẤY DANH SÁCH LỊCH SỬ XE RA VÀO
   */
  async getAllHistory() {
    if (!USE_MOCK) {
      try {
        const res = await apiClient("/api/v1/parking/sessions/?page_size=20");
        const list = Array.isArray(res) ? res : res.results || [];
        if (list.length > 0) {
          return {
            success: true,
            data: list.map((s, idx) => ({
              id: s.id || `H${idx}`,
              sessionCode: s.session_code || `#PK-${s.id}`,
              licensePlate: s.license_plate,
              vehicleType: s.vehicle_type || "Ô tô",
              direction: s.exit_time ? "OUT" : "IN",
              entryTime: formatDateTime(s.entry_time),
              exitTime: s.exit_time ? formatDateTime(s.exit_time) : "—",
              status: s.status === "closed" ? "Hoàn thành" : "Đang đỗ",
              fee: s.fee != null ? `${Number(s.fee).toLocaleString("vi-VN")}đ` : "—",
              plateImageUrl: s.entry_plate_image_url || s.plate_image_url || null,
            })),
            total: res.count ?? list.length,
          };
        }
      } catch (err) {
        // Fallback to mock
      }
    }
    return {
      success: true,
      data: [...mockParkingHistory],
      total: mockParkingHistory.length,
    };
  },

  /**
   * Tìm kiếm và lọc lịch sử xe
   */
  async filterHistory({ keyword = "", vehicleType = "ALL", status = "ALL" }) {
    const all = await this.getAllHistory();
    const query = (keyword || "").trim().toLowerCase();

    const filtered = all.data.filter((item) => {
      const matchKeyword =
        !query ||
        item.licensePlate?.toLowerCase().includes(query) ||
        item.sessionCode?.toLowerCase().includes(query);

      const matchVehicle =
        vehicleType === "ALL" || item.vehicleType === vehicleType;

      const matchStatus =
        status === "ALL" || item.status === status;

      return matchKeyword && matchVehicle && matchStatus;
    });

    return {
      success: true,
      data: filtered,
      total: filtered.length,
    };
  },

  /**
   * Lấy chi tiết 1 phiên đỗ xe theo ID
   */
  async getHistoryById(id) {
    if (!USE_MOCK) {
      try {
        const s = await apiClient(`/api/v1/parking/sessions/${id}/`);
        return {
          success: true,
          data: {
            id: s.id,
            sessionCode: s.session_code,
            licensePlate: s.license_plate,
            vehicleType: s.vehicle_type,
            direction: s.exit_time ? "OUT" : "IN",
            entryTime: formatDateTime(s.entry_time),
            exitTime: s.exit_time ? formatDateTime(s.exit_time) : "—",
            status: s.status === "closed" ? "Hoàn thành" : "Đang đỗ",
            fee: s.fee != null ? `${Number(s.fee).toLocaleString("vi-VN")}đ` : "—",
          },
        };
      } catch (err) {
        // Fallback
      }
    }
    const record = mockParkingHistory.find((item) => String(item.id) === String(id));
    if (record) return { success: true, data: record };
    throw new Error(`Không tìm thấy phiên đỗ xe mã ${id}`);
  },

  /**
   * 3. LẤY DANH SÁCH CẢNH BÁO BẤT THƯỜNG
   */
  async getAnomalyAlerts() {
    if (!USE_MOCK) {
      try {
        const alerts = await apiClient("/api/v1/dashboard/alerts/");
        if (Array.isArray(alerts) && alerts.length > 0) {
          return {
            success: true,
            data: alerts.map((a) => ({
              id: a.id,
              type: a.alert_type,
              level: a.severity === "CRITICAL" ? "error" : (a.severity === "WARNING" ? "warning" : "info"),
              title: a.alert_type || "Cảnh báo hệ thống",
              message: a.message,
              time: formatDateTime(a.occurred_at),
              timestamp: a.occurred_at,
            })),
          };
        }
      } catch (err) {
        // Fallback
      }
    }
    return {
      success: true,
      data: mockAnomalyAlerts,
    };
  },

  /**
   * 4. TÍNH TOÁN 4 CHỈ SỐ THỐNG KÊ TỔNG QUAN (Mục 1)
   */
  async getOverviewMetrics() {
    if (!USE_MOCK) {
      try {
        const kpis = await apiClient("/api/v1/dashboard/kpis/");
        if (kpis && kpis.slots) {
          const slots = kpis.slots;
          const traffic = kpis.traffic || {};
          const revenue = kpis.revenue || {};
          const ai = kpis.ai_recognition || {};

          const totalRevNum = Number(revenue.total_revenue || 0);
          const revText = totalRevNum >= 1000000
            ? `${(totalRevNum / 1000000).toFixed(1)}M`
            : `${totalRevNum.toLocaleString("vi-VN")}đ`;

          return {
            success: true,
            data: {
              totalLocations: {
                count: slots.total_slots || 24,
                statusText: slots.status_text || "Khu bãi đang mở",
                growthText: "↗ Hoạt động",
                period: "Hôm nay",
              },
              occupancyRate: {
                percent: slots.occupancy_rate_pct != null ? Number(slots.occupancy_rate_pct.toFixed(1)) : 78.4,
                statusText: slots.status_text || "Gần đầy",
                occupied: slots.occupied_slots ?? 392,
                empty: slots.available_slots ?? 108,
              },
              revenueToday: {
                amount: revText,
                growthText: "▲ Hôm nay",
                chartHeights: [35, 50, 30, 75, 90, 100],
              },
              traffic: {
                inbound: traffic.today_entries ?? 1420,
                outbound: traffic.today_exits ?? 1180,
                gateCount: ai.active_auto_scan_gates ?? 4,
                modeText: "Tự do",
              },
            },
          };
        }
      } catch (err) {
        // Fallback
      }
    }

    return {
      success: true,
      data: {
        totalLocations: {
          count: 24,
          statusText: "Khu bãi đang mở",
          growthText: "↗ +2 bãi mới",
          period: "Tháng này",
        },
        occupancyRate: {
          percent: 78.4,
          statusText: "Gần đầy",
          occupied: 392,
          empty: 108,
        },
        revenueToday: {
          amount: "35.4M",
          growthText: "▲ +14.2%",
          chartHeights: [35, 50, 30, 75, 90, 100],
        },
        traffic: {
          inbound: 1420,
          outbound: 1180,
          gateCount: 4,
          modeText: "Tự do",
        },
      },
    };
  },

  /**
   * LẤY TOÀN BỘ DỮ LIỆU ĐỒNG THỜI KHI NẠP TRANG CHỦ
   */
  async loadInitialDashboard(defaultFloor = "B1") {
    const [metrics, alerts, history, floorData] = await Promise.all([
      this.getOverviewMetrics(),
      this.getAnomalyAlerts(),
      this.getAllHistory(),
      this.getFloorDetails(defaultFloor),
    ]);

    return {
      stats: metrics.data,
      alerts: alerts.data,
      history: history.data,
      currentFloor: floorData.data,
    };
  },
};
