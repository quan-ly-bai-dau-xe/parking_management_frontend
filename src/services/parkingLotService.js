import { apiClient } from "./apiClient.js";

/**
 * Trả về văn bản mô tả trạng thái ô đỗ bằng tiếng Việt
 * @param {string} status - Mã trạng thái ô đỗ
 * @returns {string} Văn bản hiển thị
 */
export function getStatusText(status) {
  switch (status) {
    case "AVAILABLE":
      return "Trống";
    case "OCCUPIED":
      return "Đang đỗ";
    case "RESERVED":
      return "Đã đặt";
    case "MAINTENANCE":
      return "Bảo trì";
    case "CHARGING":
      return "Đang sạc";
    default:
      return status || "Không xác định";
  }
}

/**
 * Chuẩn hóa đối tượng ô đỗ từ API backend sang cấu trúc đồng nhất cho UI
 * @param {Object} rawSlot - Dữ liệu thô từ backend
 * @returns {Object} Đối tượng ô đỗ đã chuẩn hóa
 */
export function normalizeSlot(rawSlot = {}) {
  if (!rawSlot || typeof rawSlot !== "object") return {};

  const rawCode =
    rawSlot.code ?? rawSlot.slotId ?? rawSlot.label ?? (rawSlot.id !== undefined ? rawSlot.id : "");
  const code = String(rawCode ?? "");
  const status = rawSlot.status || "AVAILABLE";
  const slotKind = rawSlot.slot_kind || rawSlot.type || "STANDARD";
  const plate =
    rawSlot.plate ||
    rawSlot.licensePlate ||
    rawSlot.license_plate ||
    null;

  return {
    ...rawSlot,
    id: rawSlot.id !== undefined && rawSlot.id !== null ? rawSlot.id : code,
    slotId: rawSlot.slotId || code,
    code,
    label: rawSlot.label || code,
    row: rawSlot.row || (code.includes("-") ? code.split("-")[0] : "A"),
    status,
    statusText: rawSlot.statusText || getStatusText(status),
    type: slotKind,
    slot_kind: slotKind,
    plate,
    licensePlate: plate,
    duration: rawSlot.duration || null,
    reservedTime: rawSlot.reservedTime || rawSlot.reserved_time || null,
    reservedBy: rawSlot.reservedBy || rawSlot.reserved_by || null,
    parkingLot:
      rawSlot.parkingLot ||
      rawSlot.parking_lot_name ||
      "Bãi xe Smart Mobility",
    floor: rawSlot.floor || rawSlot.floor_code || "B1",
    zone: rawSlot.zone || rawSlot.zone_code || "A",
    note: rawSlot.note || rawSlot.notes || "",
    notes: rawSlot.notes || rawSlot.note || "",
  };
}

/**
 * Lấy danh sách ô đỗ từ backend REST API
 * Endpoint: GET /api/v1/parking/slots/
 * 
 * @param {Object} params - Tham số lọc (floor, zone, status, vehicle_type, search, ...)
 * @returns {Promise<Array<Object>>} Danh sách ô đỗ đã chuẩn hóa
 */
export async function getSlots(params = {}) {
  const queryParams = {};

  if (params.floor) queryParams.floor = params.floor;
  if (params.zone) queryParams.zone = params.zone;
  if (params.status) queryParams.status = params.status;
  if (params.vehicle_type || params.vehicleType) {
    queryParams.vehicle_type = params.vehicle_type || params.vehicleType;
  }
  if (params.slot_kind || params.slotKind) {
    queryParams.slot_kind = params.slot_kind || params.slotKind;
  }
  if (params.search) queryParams.search = params.search;

  for (const [key, value] of Object.entries(params)) {
    if (
      value !== undefined &&
      value !== null &&
      !(key in queryParams) &&
      key !== "vehicleType" &&
      key !== "slotKind"
    ) {
      queryParams[key] = value;
    }
  }

  const response = await apiClient("/api/v1/parking/slots/", {
    method: "GET",
    params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
  });

  const rawList = Array.isArray(response)
    ? response
    : Array.isArray(response?.results)
      ? response.results
      : [];

  return rawList.map(normalizeSlot);
}

/**
 * Alias cho getSlots theo Interface Contract trong PROJECT.md
 */
export const fetchParkingSlots = getSlots;

/**
 * Cập nhật trạng thái ô đỗ
 * Endpoint: PATCH /api/v1/parking/slots/${slotId}/
 * 
 * @param {string|number} slotId - ID hoặc mã định danh ô đỗ
 * @param {string|Object} data - Dữ liệu cập nhật hoặc tên trạng thái mới
 * @returns {Promise<Object>} Ô đỗ sau khi cập nhật
 */
export async function updateSlotStatus(slotId, data) {
  if (!slotId) {
    throw new Error("slotId là bắt buộc để cập nhật trạng thái ô đỗ.");
  }

  const payload = typeof data === "string" ? { status: data } : (data || {});
  const response = await apiClient(`/api/v1/parking/slots/${slotId}/`, {
    method: "PATCH",
    data: payload,
  });

  return normalizeSlot(response);
}

/**
 * Lấy danh sách các phiên đỗ xe đang mở (operational sessions)
 * Endpoint: GET /api/v1/parking/sessions/?status=open
 * 
 * @param {Object} params - Tham số truy vấn bổ sung
 * @returns {Promise<Array<Object>>} Danh sách phiên gửi xe
 */
export async function getActiveSessions(params = {}) {
  const response = await apiClient("/api/v1/parking/sessions/", {
    method: "GET",
    params: {
      status: "open",
      ...params,
    },
  });

  return Array.isArray(response)
    ? response
    : Array.isArray(response?.results)
      ? response.results
      : [];
}

/**
 * Alias cho getActiveSessions theo Interface Contract trong PROJECT.md
 */
export const fetchActiveSessions = getActiveSessions;

export const parkingLotService = {
  getSlots,
  fetchParkingSlots,
  updateSlotStatus,
  getActiveSessions,
  fetchActiveSessions,
  normalizeSlot,
  getStatusText,
};

export default parkingLotService;
