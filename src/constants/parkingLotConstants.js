export const PARKING_LOT_OPTIONS = [
  { value: "Bãi xe Smart Mobility", label: "Bãi xe Smart Mobility" },
];

export const PARKING_FLOOR_OPTIONS = [
  { value: "B1", label: "Tầng B1" },
  { value: "B2", label: "Tầng B2" },
  { value: "F1", label: "Tầng F1" },
];

export const PARKING_ZONE_OPTIONS = [
  { value: "A", label: "Khu A" },
  { value: "B", label: "Khu B" },
  { value: "C", label: "Khu C" },
];

export const SLOT_STATUS_OPTIONS = [
  { value: "AVAILABLE", label: "Trống" },
  { value: "OCCUPIED", label: "Đang đỗ" },
  { value: "OVERSTAY", label: "Cảnh báo quá giờ" },
  { value: "RESERVED", label: "Đã đặt trước" },
  { value: "MAINTENANCE", label: "Bảo trì" },
];

export const OVERSTAY_THRESHOLDS = {
  WARNING_HOURS: 24,
  CRITICAL_HOURS: 48,
  WARNING_LABEL: "Đỗ quá 24h",
  CRITICAL_LABEL: "Đỗ quá 48h",
};

export const VEHICLE_TYPE_OPTIONS = [
  { value: "STANDARD", label: "Ô tô tiêu chuẩn" },
  { value: "PRIORITY", label: "Xe ưu tiên" },
];

export const INITIAL_STRUCTURE_LIST = [
  { id: "floor-B1", type: "Tầng", code: "B1", name: "Tầng B1" },
  { id: "floor-B2", type: "Tầng", code: "B2", name: "Tầng B2" },
  { id: "floor-F1", type: "Tầng", code: "F1", name: "Tầng F1" },
  { id: "zone-A", type: "Khu", code: "A", name: "Khu A" },
  { id: "zone-B", type: "Khu", code: "B", name: "Khu B" },
  { id: "zone-C", type: "Khu", code: "C", name: "Khu C" },
];
