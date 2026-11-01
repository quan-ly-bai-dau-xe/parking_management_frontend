import { mockAnomalyAlerts } from "../mocks/anomoliesData";
import { mockParkingFloors } from "../mocks/parkingLotData";
import { mockParkingHistory } from "../mocks/parkingHistoryData";

const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

export const dashboardService = {
  /**
   * 1. LẤY THÔNG TIN BÃI ĐỖ XE THEO TẦNG
   * Trả về thông tin tầng, các khu và danh sách ô đỗ
   */
  getFloorDetails: (floorId = "B1") => {
    return new Promise((resolve, reject) => {
      delay(200).then(() => {
        const floor = mockParkingFloors.find((f) => f.floorId === floorId);
        if (floor) {
          resolve({
            success: true,
            data: floor,
          });
        } else {
          reject(new Error(`Không tìm thấy dữ liệu cho tầng ${floorId}`));
        }
      });
    });
  },

  /**
   * Lấy danh sách ô đỗ cụ thể thuộc một Khu của Tầng
   */
  getSlotsByZone: (floorId, zoneId) => {
    return new Promise((resolve, reject) => {
      delay(200).then(() => {
        const floor = mockParkingFloors.find((f) => f.floorId === floorId);
        const zone = floor?.zones.find((z) => z.zoneId === zoneId);
        if (zone) {
          resolve({ success: true, slots: zone.slots });
        } else {
          reject(new Error("Không tìm thấy khu vực chỉ định"));
        }
      });
    });
  },

  /**
   * 2. LẤY DANH SÁCH LỊCH SỬ XE RA VÀO
   */
  getAllHistory: () => {
    return new Promise((resolve) => {
      delay().then(() => {
        resolve({
          success: true,
          data: [...mockParkingHistory],
          total: mockParkingHistory.length,
        });
      });
    });
  },

  /**
   * Tìm kiếm và lọc lịch sử xe
   * @param {Object} filterParams - { keyword, vehicleType, status }
   * @returns {Promise<Array>}
   */
  filterHistory: ({ keyword = "", vehicleType = "ALL", status = "ALL" }) => {
    return new Promise((resolve) => {
      delay(250).then(() => {
        const query = keyword.trim().toLowerCase();

        const filtered = mockParkingHistory.filter((item) => {
          // Lọc theo từ khóa (Biển số hoặc Mã phiên)
          const matchKeyword =
            !query ||
            item.licensePlate.toLowerCase().includes(query) ||
            item.sessionCode.toLowerCase().includes(query);

          // Lọc theo loại phương tiện
          const matchVehicle =
            vehicleType === "ALL" || item.vehicleType === vehicleType;

          // Lọc theo trạng thái
          const matchStatus =
            status === "ALL" || item.status === status;

          return matchKeyword && matchVehicle && matchStatus;
        });

        resolve({
          success: true,
          data: filtered,
          total: filtered.length,
        });
      });
    });
  },

  /**
   * Lấy chi tiết 1 phiên đỗ xe theo ID
   */
  getHistoryById: (id) => {
    return new Promise((resolve, reject) => {
      delay(200).then(() => {
        const record = mockParkingHistory.find((item) => item.id === id);
        if (record) {
          resolve({ success: true, data: record });
        } else {
          reject(new Error(`Không tìm thấy phiên đỗ xe mã ${id}`));
        }
      });
    });
  },

  /**
   * 3. LẤY DANH SÁCH CẢNH BÁO BẤT THƯỜNG
   */
  getAnomalyAlerts: () => {
    return new Promise((resolve) => {
      delay(250).then(() => {
        resolve({
          success: true,
          data: mockAnomalyAlerts,
        });
      });
    });
  },

  /**
   * TÍNH TOÁN 4 CHỈ SỐ THỐNG KÊ TỔNG QUAN (Mục 1)
   * Tự động tổng hợp số liệu từ các tầng và lịch sử ra vào
   */
  getOverviewMetrics: () => {
    return new Promise((resolve) => {
      delay(350).then(() => {

        // Tổng số khu bãi trên toàn hệ thống
        // eslint-disable-next-line no-unused-vars
        const totalZones = mockParkingFloors.reduce(
          (acc, floor) => acc + floor.zones.length,
          0
        );
        // Tính tổng lượt xe vào và ra
        // eslint-disable-next-line no-unused-vars
        const inCount = mockParkingHistory.filter((l) => l.direction === "IN").length;
        // eslint-disable-next-line no-unused-vars
        const outCount = mockParkingHistory.filter((l) => l.direction === "OUT").length;

        // Trả về đúng format 4 thẻ StatCard của nửa trên
        resolve({
          success: true,
          data: {
            totalLocations: {
              count: 24, // Tổng số bãi / khu bãi đang kích hoạt
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
        });
      });
    });
  },

  /**
   * LẤY TOÀN BỘ DỮ LIỆU ĐỒNG THỜI KHI NẠP TRANG CHỦ
   */
  loadInitialDashboard: (defaultFloor = "B1") => {
    return Promise.all([
      dashboardService.getOverviewMetrics(),
      dashboardService.getAnomalyAlerts(),
      dashboardService.getAllHistory(), // <-- Sửa từ getTrafficLogs() thành getAllHistory()
      dashboardService.getFloorDetails(defaultFloor),
    ]).then(([metrics, alerts, history, floorData]) => ({
      stats: metrics.data,
      alerts: alerts.data,
      history: history.data,
      currentFloor: floorData.data,
    }));
  },
};