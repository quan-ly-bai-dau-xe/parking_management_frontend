import { apiClient } from "./apiClient";
import { fullParkingLotData, mockParkingFloors } from "../mocks/parkingLotData";

export const parkingLotService = {
  /**
   * Lấy cấu trúc bãi đỗ xe (Tầng -> Khu -> Ô đỗ)
   */
  async getParkingStructure() {
    try {
      const res = await apiClient("/api/v1/parking/structure/");
      if (Array.isArray(res) && res.length > 0) {
        return res;
      }
    } catch (err) {
      console.warn("[parkingLotService] getParkingStructure fallback mock:", err.message);
    }
    return fullParkingLotData;
  },

  /**
   * Lấy thống kê tỷ lệ lấp đầy các tầng từ dashboard/floors/
   */
  async getFloorOccupancy() {
    try {
      const res = await apiClient("/api/v1/dashboard/floors/");
      if (Array.isArray(res) && res.length > 0) {
        return res;
      }
    } catch (err) {
      console.warn("[parkingLotService] getFloorOccupancy fallback mock:", err.message);
    }
    return [
      { floor_code: "B1", floor_name: "Tầng B1", occupancy_percentage: 92, total_slots: 200, used_slots: 184, available_slots: 16, status_badge: "Gần đầy" },
      { floor_code: "B2", floor_name: "Tầng B2", occupancy_percentage: 65, total_slots: 150, used_slots: 98, available_slots: 52, status_badge: "Còn chỗ" },
      { floor_code: "B3", floor_name: "Tầng B3", occupancy_percentage: 40, total_slots: 150, used_slots: 60, available_slots: 90, status_badge: "Còn chỗ" },
    ];
  },

  /**
   * Lấy chi tiết ô đỗ theo Tầng & Khu
   */
  async getSlotsByZone(floorCode = "B1", zoneCode = "A") {
    try {
      const structure = await this.getParkingStructure();
      const floor = structure.find((f) => f.code === floorCode || f.floorId === floorCode);
      const zone = floor?.zones?.find((z) => z.code === zoneCode || z.zoneId === zoneCode);
      return zone?.slots || [];
    } catch {
      return fullParkingLotData[0]?.zones[0]?.slots || [];
    }
  },
};

