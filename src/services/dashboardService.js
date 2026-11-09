import { mockAnomalyAlerts } from "../mocks/anomoliesData";
import { mockParkingFloors } from "../mocks/parkingLotData";
import { mockParkingHistory } from "../mocks/parkingHistoryData";

const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

export const dashboardService = {
  getFloorDetails: (floorId = "B1") => {
    return new Promise((resolve, reject) => {
      delay(200).then(() => {
        const floor = mockParkingFloors.find((f) => f.floorId === floorId);
        if (floor) {
          resolve({ success: true, data: floor });
        } else {
          reject(new Error(`Không tìm thấy dữ liệu cho tầng ${floorId}`));
        }
      });
    });
  },

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

  filterHistory: ({ keyword = "", vehicleType = "ALL", status = "ALL" }) => {
    return new Promise((resolve) => {
      delay(250).then(() => {
        const query = keyword.trim().toLowerCase();

        const filtered = mockParkingHistory.filter((item) => {
          const matchKeyword =
            !query ||
            item.licensePlate.toLowerCase().includes(query) ||
            item.sessionCode.toLowerCase().includes(query);

          const matchVehicle =
            vehicleType === "ALL" || item.vehicleType === vehicleType;

          const matchStatus = status === "ALL" || item.status === status;

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


  getOverviewMetrics: () => {
    return new Promise((resolve) => {
      delay(350).then(() => {
        resolve({
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
        });
      });
    });
  },

  loadInitialDashboard: (defaultFloor = "B1") => {
    return Promise.all([
      dashboardService.getOverviewMetrics(),
      dashboardService.getAnomalyAlerts(),
      dashboardService.getAllHistory(),
      dashboardService.getFloorDetails(defaultFloor),
    ]).then(([metrics, alerts, history, floorData]) => ({
      stats: metrics.data,
      alerts: alerts.data,
      history: history.data,
      currentFloor: floorData.data,
    }));
  },
};
