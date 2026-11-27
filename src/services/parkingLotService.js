import { apiClient } from "./apiClient.js";
import { fullParkingLotData } from "../mocks/parkingLotData.js";
import { getMockParkingSlots } from "../mocks/parkingSlotFallback.js";
import { isMockEnabled } from "../config/appConfig.js";
import { formatReservedTimeDisplay } from "../utils/formatDateTime.js";

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

  const isOccupied = status === "OCCUPIED";
  const durationStr = String(rawSlot.duration || "");
  const isOverstay = Boolean(
    rawSlot.isOverstay ||
      (isOccupied &&
        (durationStr.includes(">48h") ||
          durationStr.includes(">24h") ||
          durationStr.includes("48h") ||
          durationStr.includes("36h") ||
          durationStr.includes("2 ngày") ||
          durationStr.includes("3 ngày")))
  );
  const overstaySeverity =
    rawSlot.overstaySeverity ||
    (durationStr.includes("48h") || durationStr.includes("2 ngày")
      ? "CRITICAL"
      : isOverstay
        ? "WARNING"
        : null);

  const activeRes = rawSlot.active_reservation ?? rawSlot.activeReservation ?? null;
  const reservedByName =
    rawSlot.reservedBy ||
    rawSlot.reserved_by ||
    rawSlot.reserved_name ||
    activeRes?.reserved_name ||
    activeRes?.customer_name ||
    activeRes?.user_name ||
    activeRes?.full_name ||
    null;
  const reservedPhone =
    rawSlot.reserved_phone ||
    activeRes?.reserved_phone ||
    activeRes?.phone ||
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
    plate: plate || activeRes?.license_plate || activeRes?.plate_number || null,
    licensePlate: plate || activeRes?.license_plate || activeRes?.plate_number || null,
    duration: rawSlot.duration || null,
    isOverstay,
    overstaySeverity,
    reservedTime: formatReservedTimeDisplay(rawSlot.reservedTime || rawSlot.reserved_time, null),
    reservedBy: reservedByName,
    reservedPhone,
    parkingLot:
      rawSlot.parkingLot ||
      rawSlot.parking_lot_name ||
      "Bãi xe Smart Mobility",
    floor: rawSlot.floor || rawSlot.floor_code || "B1",
    zone: rawSlot.zone || rawSlot.zone_code || "A",
    note: rawSlot.note || rawSlot.notes || "",
    notes: rawSlot.notes || rawSlot.note || "",
    row_version: rawSlot.row_version ?? rawSlot.rowVersion ?? 1,
    zone_id: rawSlot.zone_id ?? rawSlot.zoneId ?? null,
    floor_id: rawSlot.floor_id ?? rawSlot.floorId ?? null,
    lot_id: rawSlot.lot_id ?? rawSlot.lotId ?? null,
    allowed_vehicle_types: rawSlot.allowed_vehicle_types ?? rawSlot.allowedVehicleTypes ?? [],
    vehicle_types: rawSlot.vehicle_types ?? rawSlot.vehicleTypes ?? [],
    open_session: rawSlot.open_session ?? rawSlot.openSession ?? null,
    active_reservation: rawSlot.active_reservation ?? rawSlot.activeReservation ?? null,
    active_ticket: rawSlot.active_ticket ?? rawSlot.activeTicket ?? null,
    width: rawSlot.width ?? null,
    length: rawSlot.length ?? null,
    height: rawSlot.height ?? null,
    map_row: rawSlot.map_row ?? rawSlot.mapRow ?? null,
    map_col: rawSlot.map_col ?? rawSlot.mapCol ?? null,
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

  // Nếu mock mode được kích hoạt rõ ràng cho module parkingLot
  if (isMockEnabled("parkingLot")) {
    return getMockParkingSlots({
      floor: queryParams.floor || "B1",
      zone: queryParams.zone || "A",
    });
  }

  // Khi mock tắt: gọi API backend thật, nếu lỗi thì throw error thật, KHÔNG fallback ngầm
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
 * Lấy danh sách ô đỗ ẩn PII khách khác dành cho CUSTOMER (/api/v1/me/parking-slots/)
 */
export async function getCustomerParkingSlots(params = {}) {
  const queryParams = {
    page_size: params.page_size ?? params.pageSize ?? 100,
  };
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

  const response = await apiClient("/api/v1/me/parking-slots/", {
    method: "GET",
    params: queryParams,
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

  // Nếu mock mode được kích hoạt cho parkingLot, trả về slot mô phỏng
  if (isMockEnabled("parkingLot")) {
    return normalizeSlot({
      id: slotId,
      code: slotId,
      ...payload,
    });
  }

  // Khi mock tắt: gọi API PATCH thật, nếu lỗi thì throw error thật, KHÔNG fallback ngầm
  const response = await apiClient(`/api/v1/parking/slots/${slotId}/`, {
    method: "PATCH",
    data: payload,
  });

  return normalizeSlot(response);
}

/**
 * Lấy sơ đồ cấu trúc bãi đỗ xe phân cấp (Tầng -> Khu vực -> Ô đỗ)
 * Endpoint: GET /api/v1/parking/structure/
 *
 * @returns {Promise<Array<Object>>} Cấu trúc phân cấp các tầng, khu và ô đỗ
 */
export async function getParkingStructure() {
  // Nếu mock mode được kích hoạt cho parkingLot, trả về cấu trúc mock đầy đủ
  if (isMockEnabled("parkingLot")) {
    return fullParkingLotData.map((floor) => ({
      id: floor.floorId,
      code: floor.floorId,
      name: floor.floorName,
      total_slots: floor.zones?.reduce((acc, z) => acc + (z.totalSlots || 0), 0) || 0,
      zones: (floor.zones || []).map((zone) => ({
        id: zone.zoneId,
        code: zone.zoneId.includes("-") ? zone.zoneId.split("-")[1] : zone.zoneId,
        name: zone.zoneName,
        total_slots: zone.totalSlots || 0,
        slots: (zone.slots || []).map((slot) => ({
          id: slot.slotId,
          code: slot.slotId,
          slot_number: parseInt(slot.slotId.replace(/\D/g, ""), 10) || 1,
          status: slot.status,
          status_display: getStatusText(slot.status),
          is_occupied: slot.status === "OCCUPIED",
          row: slot.row || (slot.slotId.includes("-") ? slot.slotId.split("-")[0] : "A"),
          label: slot.label || slot.slotId,
        })),
      })),
    }));
  }

  // Khi mock tắt: gọi API backend thật, nếu lỗi thì throw error thật, KHÔNG fallback ngầm
  const response = await apiClient("/api/v1/parking/structure/", {
    method: "GET",
  });

  if (Array.isArray(response) && response.length > 0) {
    return response;
  }
  if (Array.isArray(response?.results) && response.results.length > 0) {
    return response.results;
  }
  return [];
}

/**
 * Alias cho getParkingStructure theo contract
 */
export const fetchParkingStructure = getParkingStructure;

/**
 * Alias cho getParkingStructure theo yêu cầu cấu hình bãi đỗ (getParkingLotConfig)
 */
export const getParkingLotConfig = getParkingStructure;
export const fetchParkingLotConfig = getParkingStructure;

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

/**
 * Lấy thông tin chi tiết một ô đỗ xe (SRS 4.8.4)
 * Endpoint: GET /api/v1/parking/slots/${slotId}/
 *
 * @param {string|number} slotId - ID ô đỗ
 * @returns {Promise<Object>} Ô đỗ chi tiết đã chuẩn hóa
 */
export async function getSlotDetail(slotId) {
  if (!slotId) {
    throw new Error("slotId là bắt buộc để lấy thông tin chi tiết ô đỗ.");
  }
  const response = await apiClient(`/api/v1/parking/slots/${slotId}/`, {
    method: "GET",
  });
  return normalizeSlot(response);
}

/**
 * Thêm mới ô đỗ xe (SRS 4.8.2 - Chỉ Manager)
 * Endpoint: POST /api/v1/parking/slots/
 *
 * @param {Object} payload - Dữ liệu ô đỗ mới (zone_id, code, slot_kind, status, ...)
 * @returns {Promise<Object>} Ô đỗ vừa tạo đã chuẩn hóa
 */
export async function createSlot(payload) {
  if (!payload) {
    throw new Error("Dữ liệu tạo ô đỗ là bắt buộc.");
  }
  const response = await apiClient("/api/v1/parking/slots/", {
    method: "POST",
    data: payload,
  });
  return normalizeSlot(response);
}

/**
 * Cập nhật thông tin ô đỗ xe có kiểm soát đồng thời OCC row_version (SRS 4.8.3 - Chỉ Manager)
 * Endpoint: PATCH /api/v1/parking/slots/${slotId}/
 *
 * @param {string|number} slotId - ID ô đỗ
 * @param {Object} payload - Dữ liệu cập nhật (bắt buộc kèm row_version)
 * @returns {Promise<Object>} Ô đỗ sau khi cập nhật đã chuẩn hóa
 */
export async function updateSlot(slotId, payload) {
  if (!slotId) {
    throw new Error("slotId là bắt buộc để cập nhật thông tin ô đỗ.");
  }
  const response = await apiClient(`/api/v1/parking/slots/${slotId}/`, {
    method: "PATCH",
    data: payload,
  });
  return normalizeSlot(response);
}

/**
 * Xóa mềm ô đỗ xe (SRS 4.8.5 - Chỉ Manager)
 * Endpoint: DELETE /api/v1/parking/slots/${slotId}/
 *
 * @param {string|number} slotId - ID ô đỗ
 * @returns {Promise<Object>} Phản hồi xóa thành công
 */
export async function deleteSlot(slotId) {
  if (!slotId) {
    throw new Error("slotId là bắt buộc để xóa ô đỗ.");
  }
  return await apiClient(`/api/v1/parking/slots/${slotId}/`, {
    method: "DELETE",
  });
}


export async function getCustomerParkingStructure() {
  return await apiClient("/api/v1/me/parking-structure/", {
    method: "GET",
  });
}

export async function reserveSlot(slotId, payload) {
  if (!slotId) {
    throw new Error("slotId là bắt buộc để đăng ký đặt chỗ.");
  }
  return await apiClient(`/api/v1/parking/slots/${slotId}/reserve/`, {
    method: "POST",
    data: payload,
  });
}

export async function getReservations(params = {}) {
  const response = await apiClient("/api/v1/parking/reservations/", {
    method: "GET",
    params: Object.keys(params).length > 0 ? params : undefined,
  });
  return Array.isArray(response)
    ? response
    : Array.isArray(response?.results)
      ? response.results
      : [];
}

export async function cancelReservation(reservationId) {
  if (!reservationId) {
    throw new Error("reservationId là bắt buộc để hủy đặt chỗ.");
  }
  return await apiClient(`/api/v1/parking/reservations/${reservationId}/cancel/`, {
    method: "POST",
    data: {},
  });
}

export const parkingLotService = {
  getSlots,
  getCustomerParkingSlots,
  fetchParkingSlots,
  getSlotDetail,
  createSlot,
  updateSlot,
  deleteSlot,
  getParkingStructure,
  getCustomerParkingStructure,
  reserveSlot,
  getReservations,
  cancelReservation,
  updateSlotStatus,
  fetchParkingStructure,
  getParkingLotConfig,
  fetchParkingLotConfig,
  getActiveSessions,
  fetchActiveSessions,
  normalizeSlot,
  getStatusText,
};

export default parkingLotService;
