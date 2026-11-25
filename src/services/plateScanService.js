import { apiClient } from "./apiClient.js";
import { mockParkingHistory } from "../mocks/parkingHistoryData.js";
import { mockVehicles } from "../mocks/vehicleData.js";
import {
  mapParkingSession,
  validateAndMapSessions,
  mapPlateScanToVehicle,
  mapVehicleLookupToVehicle,
  mapSessionToFrontend,
  createWalkInVehicle,
  parseEntryTimeToDate,
  normalizePlate,
} from "../utils/parking/plateScanMapper.js";
import { isMockEnabled } from "../config/appConfig.js";

const USE_MOCK = isMockEnabled("plateScans");

export {
  mapParkingSession,
  validateAndMapSessions,
  mapPlateScanToVehicle,
  mapVehicleLookupToVehicle,
  mapSessionToFrontend,
  createWalkInVehicle,
  parseEntryTimeToDate,
  normalizePlate,
};

/**
 * Service to execute license plate scan against the backend plate-scans endpoint.
 */
export async function scanPlate({ imageBlob, preview = false, gateId = 1, signal = null }) {
  if (!imageBlob) {
    throw new Error("imageBlob is required for plate scanning.");
  }

  const formData = new FormData();
  formData.append("image", imageBlob, "plate_frame.jpg");
  formData.append("preview", preview ? "true" : "false");

  if (gateId !== null && gateId !== undefined && gateId !== "") {
    formData.append("gate_id", String(gateId));
  }

  return apiClient("/api/v1/parking/plate-scans/", {
    method: "POST",
    body: formData,
    signal,
  });
}

/**
 * Upload ảnh biển số và quét nhận diện
 */
export async function scanPlateImage(imageFile, gateId = 1) {
  const formData = new FormData();
  formData.append("image", imageFile);
  formData.append("gate_id", gateId);

  return apiClient("/api/v1/parking/plate-scans/", {
    method: "POST",
    body: formData,
  });
}

/**
 * Tra cứu thông tin xe & vé theo biển số
 */
export async function lookupVehicleByPlate(licensePlate) {
  if (!licensePlate) return null;
  const cleanPlate = encodeURIComponent(licensePlate.trim().toUpperCase());
  return apiClient(`/api/v1/parking/vehicle-lookup/?license_plate=${cleanPlate}`);
}

/**
 * Lấy danh sách các phiên đỗ xe (Parking Sessions)
 */
export async function getParkingSessions(filters = {}) {
  if (USE_MOCK) {
    let list = [...mockParkingHistory];
    if (filters.search) {
      const q = String(filters.search).toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.sessionCode?.toLowerCase().includes(q) ||
          s.licensePlate?.toLowerCase().includes(q)
      );
    }
    if (filters.session_code) {
      const q = String(filters.session_code).toLowerCase().trim();
      list = list.filter((s) => s.sessionCode?.toLowerCase().includes(q));
    }
    if (filters.license_plate) {
      const q = String(filters.license_plate).toLowerCase().trim();
      list = list.filter((s) => s.licensePlate?.toLowerCase().includes(q));
    }
    if (filters.status) {
      const st = String(filters.status).toLowerCase().trim();
      if (st === "open" || st === "in_progress") {
        list = list.filter((s) => s.status === "in_progress" || !s.exitTime || s.exitTime === "—");
      } else if (st === "closed" || st === "completed") {
        list = list.filter((s) => s.status === "completed" || (s.exitTime && s.exitTime !== "—"));
      }
    }
    if (filters.ticket_type && filters.ticket_type !== "all") {
      const targetType = String(filters.ticket_type).toUpperCase();
      list = list.filter((s) => {
        const itemType = String(s.ticketType || (s.hasActiveTicket ? "MONTHLY" : "DAILY")).toUpperCase();
        if (targetType === "DAILY") {
          return itemType.includes("DAILY") || itemType.includes("LƯỢT") || itemType.includes("NGÀY");
        }
        if (targetType === "MONTHLY") {
          return itemType.includes("MONTHLY") || itemType.includes("THÁNG");
        }
        if (targetType === "QUARTERLY") {
          return itemType.includes("QUARTERLY") || itemType.includes("QUÝ");
        }
        if (targetType === "YEARLY") {
          return itemType.includes("YEARLY") || itemType.includes("NĂM");
        }
        return itemType.includes(targetType);
      });
    }
    if (filters.min_fee !== undefined && filters.min_fee !== "") {
      list = list.filter((s) => (s.feeNumber ?? 0) >= Number(filters.min_fee));
    }
    if (filters.max_fee !== undefined && filters.max_fee !== "") {
      list = list.filter((s) => (s.feeNumber ?? 0) <= Number(filters.max_fee));
    }
    // Lọc theo xử lý bất thường & kiểm toán
    if (filters.abnormal_type && filters.abnormal_type !== "all") {
      const abType = String(filters.abnormal_type).toLowerCase().trim();
      list = list.filter((s) => {
        const noteStr = String(s.notes || s.feeBreakdown || "").toLowerCase();
        const isWaived = Boolean(s.isWaived || s.waiveFee || s.isFeeExempt || noteStr.includes("miễn cước") || noteStr.includes("waived"));
        const isGlitch = noteStr.includes("cancel_glitch") || noteStr.includes("hủy phiên") || noteStr.includes("nhận diện sai");
        const isSlotRelease = noteStr.includes("release_slot") || noteStr.includes("giải phóng ô");
        const isManual = noteStr.includes("manual_checkout") || noteStr.includes("mất điện") || noteStr.includes("thu tiền mặt");
        const isAnyAbnormal = isWaived || isGlitch || isSlotRelease || isManual || noteStr.includes("[group:");

        if (abType === "normal") return !isAnyAbnormal;
        if (abType === "abnormal_all") return isAnyAbnormal;
        if (abType === "ghost_exit") return isWaived;
        if (abType === "cancel_glitch") return isGlitch;
        if (abType === "release_slot") return isSlotRelease;
        if (abType === "manual_checkout") return isManual;
        return true;
      });
    }
    const page = Number(filters.page) || 1;
    const pageSize = Number(filters.page_size) || 10;
    const total = list.length;
    const start = (page - 1) * pageSize;
    const paged = list.slice(start, start + pageSize);
    const mapped = paged.map(mapParkingSession);
    return {
      items: mapped,
      total,
      page,
      pageSize,
      results: mapped,
    };
  }

  // Khi Backend DRF không hỗ trợ param 'search', ta phân giải sang session_code hoặc license_plate
  let sessionCodeFilter = filters.session_code;
  let licensePlateFilter = filters.license_plate;
  if (!sessionCodeFilter && !licensePlateFilter && filters.search) {
    const rawSearch = String(filters.search).trim();
    if (rawSearch.startsWith("#") || rawSearch.toUpperCase().startsWith("PK-") || rawSearch.toUpperCase().startsWith("SS-")) {
      sessionCodeFilter = rawSearch;
    } else {
      licensePlateFilter = rawSearch;
    }
  }

  const cleanFilters = {};
  if (sessionCodeFilter && String(sessionCodeFilter).trim() !== "") {
    cleanFilters.session_code = String(sessionCodeFilter).trim();
  }
  if (licensePlateFilter && String(licensePlateFilter).trim() !== "") {
    cleanFilters.license_plate = String(licensePlateFilter).trim();
  }

  for (const [key, value] of Object.entries(filters)) {
    if (key !== "search" && key !== "session_code" && key !== "license_plate") {
      if (value !== undefined && value !== null && String(value).trim() !== "") {
        cleanFilters[key] = String(value).trim();
      }
    }
  }
  const query = new URLSearchParams(cleanFilters).toString();
  const url = `/api/v1/parking/sessions/${query ? `?${query}` : ""}`;
  const response = await apiClient(url);
  const items = validateAndMapSessions(response);
  const total = typeof response?.count === "number" ? response.count : items.length;
  const page = Number(cleanFilters.page) || 1;
  const pageSize = Number(cleanFilters.page_size) || items.length;

  return {
    items,
    total,
    page,
    pageSize,
    results: items,
  };
}

/**
 * Lấy chi tiết 1 phiên đỗ xe
 */
export async function getParkingSessionDetail(sessionId) {
  if (USE_MOCK) {
    const found = mockParkingHistory.find(
      (item) => String(item.id) === String(sessionId) || item.sessionCode === sessionId
    );
    return found ? mapParkingSession(found) : null;
  }
  const response = await apiClient(`/api/v1/parking/sessions/${sessionId}/`);
  return mapParkingSession(response);
}

/**
 * Tra cứu và đối soát phiên đỗ đang mở (open session) của biển số xe
 */
export async function resolveActiveParkingSession(plate) {
  if (!plate) return null;
  try {
    const sessionRes = await getParkingSessions({ license_plate: plate, status: "open" });
    const active = sessionRes?.items?.[0] || sessionRes?.results?.[0];
    if (!active) return null;

    const rawIso =
      active.entryTimeRaw ||
      active.rawEntryTime ||
      active.entry_time ||
      parseEntryTimeToDate(active.entryTime)?.toISOString() ||
      active.entryTime;

    return {
      id: active.id,
      session_code: active.sessionCode || active.session_code,
      entry_time: rawIso,
      entry_image_url: active.plateImageUrl || active.entryImageUrl || active.entry_image_url,
      slot_code: active.slotCode || active.slot_code,
    };
  } catch {
    return null;
  }
}

/**
 * matchPlateLookup
 * Hàm tra cứu biển số chuẩn hóa (Single Source of Truth) phục vụ toàn bộ hệ thống kiểm soát xe.
 * Phân biệt rõ ràng:
 * - 200 OK: Xe có trong CSDL (hoặc kiểm tra danh sách xe cục bộ)
 * - 404 Not Found: Xe chưa đăng ký -> trả về đối tượng xe vãng lai chuẩn hóa, kiểm tra details.is_blacklisted
 * - Lỗi khác (500, network error, timeout, 401/403): báo lỗi rõ ràng, KHÔNG nuốt lỗi im lặng.
 */
export async function matchPlateLookup(
  plateInput,
  { vehicles = [], mockVehiclesFallback = true } = {}
) {
  const rawInput = (plateInput || "").trim();
  const norm = normalizePlate(rawInput);
  if (!norm) {
    return {
      success: false,
      vehicle: null,
      rawLookup: null,
      openSession: null,
      isWalkIn: false,
      isBlacklisted: false,
      error: new Error("Biển số xe không được để trống."),
      errorMessage: "Vui lòng nhập biển số xe hợp lệ.",
    };
  }

  const findInLocalList = () => {
    let list = Array.isArray(vehicles) && vehicles.length > 0 ? vehicles : [];
    if (list.length === 0 && mockVehiclesFallback) {
      list = mockVehicles;
    }
    return list.find((v) => normalizePlate(v.licensePlate) === norm) || null;
  };

  try {
    const lookupResult = await lookupVehicleByPlate(rawInput);
    let openSession = lookupResult?.open_session || null;
    if (!openSession) {
      openSession = await resolveActiveParkingSession(rawInput);
    }
    const consolidatedLookup = lookupResult
      ? { ...lookupResult, open_session: openSession }
      : openSession
        ? { open_session: openSession }
        : null;

    const vehicle = mapVehicleLookupToVehicle(consolidatedLookup);

    if (vehicle) {
      return {
        success: true,
        vehicle,
        rawLookup: consolidatedLookup,
        openSession,
        isWalkIn: false,
        isBlacklisted: Boolean(vehicle.isBlacklisted || consolidatedLookup?.is_blacklisted),
        error: null,
        errorMessage: "",
      };
    }

    const localFound = findInLocalList();
    if (localFound) {
      return {
        success: true,
        vehicle: localFound,
        rawLookup: consolidatedLookup,
        openSession,
        isWalkIn: false,
        isBlacklisted: Boolean(localFound.isBlacklisted || localFound.status === "BLACKLISTED"),
        error: null,
        errorMessage: "",
      };
    }

    const isBlacklisted = Boolean(consolidatedLookup?.is_blacklisted);
    const walkIn = createWalkInVehicle(rawInput, { isBlacklisted, openSession });
    return {
      success: true,
      vehicle: walkIn,
      rawLookup: consolidatedLookup,
      openSession,
      isWalkIn: true,
      isBlacklisted,
      error: null,
      errorMessage: "",
    };
  } catch (err) {
    const status = err?.status || err?.response?.status;
    const is404 = status === 404 || err?.data?.code === "MSG-4.5.1-M01";

    if (is404) {
      const isBlacklisted = Boolean(
        err?.data?.details?.is_blacklisted ||
        err?.data?.is_blacklisted ||
        err?.details?.is_blacklisted ||
        err?.is_blacklisted
      );

      const openSession = await resolveActiveParkingSession(rawInput);
      const rawLookup = {
        ...(openSession ? { open_session: openSession } : {}),
        is_blacklisted: isBlacklisted,
        status: isBlacklisted ? "BLACKLISTED" : undefined,
      };

      const localFound = findInLocalList();
      if (localFound) {
        return {
          success: true,
          vehicle: {
            ...localFound,
            isBlacklisted: isBlacklisted || localFound.isBlacklisted || localFound.status === "BLACKLISTED",
          },
          rawLookup,
          openSession,
          isWalkIn: false,
          isBlacklisted: Boolean(isBlacklisted || localFound.isBlacklisted),
          error: null,
          errorMessage: "",
        };
      }

      const walkInVehicle = createWalkInVehicle(rawInput, { isBlacklisted, openSession });
      return {
        success: true,
        vehicle: walkInVehicle,
        rawLookup,
        openSession,
        isWalkIn: true,
        isBlacklisted,
        error: null,
        errorMessage: "",
      };
    }

    // Server error (500) / Network error / Auth error: TUYỆT ĐỐI KHÔNG nuốt lỗi
    let errorMessage = "Không thể tra cứu thông tin biển số xe do sự cố máy chủ.";
    if (err?.code === "API_UNAVAILABLE" || !status) {
      errorMessage = "Không thể kết nối tới máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.";
    } else if (status === 401 || err?.isUnauthorized) {
      errorMessage = "Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.";
    } else if (status === 403) {
      errorMessage = "Bạn không có quyền thực hiện tra cứu thông tin phương tiện.";
    } else if (status >= 500) {
      errorMessage = `Lỗi hệ thống máy chủ (${status}): Không thể tra cứu thông tin xe. Vui lòng thử lại.`;
    } else if (err?.data?.message || err?.message) {
      errorMessage = err?.data?.message || err?.message;
    }

    return {
      success: false,
      vehicle: null,
      rawLookup: null,
      openSession: null,
      isWalkIn: false,
      isBlacklisted: false,
      error: err,
      errorMessage,
    };
  }
}

export default {
  scanPlate,
  scanPlateImage,
  lookupVehicleByPlate,
  getParkingSessions,
  getParkingSessionDetail,
  resolveActiveParkingSession,
  matchPlateLookup,
};
