import { apiClient } from "./apiClient.js";
import { mockParkingHistory } from "../mocks/parkingHistoryData.js";
import {
  mapParkingSession,
  validateAndMapSessions,
  mapPlateScanToVehicle,
  mapVehicleLookupToVehicle,
  mapSessionToFrontend,
} from "../utils/parking/plateScanMapper.js";

const USE_MOCK =
  import.meta.env?.VITE_USE_MOCK?.trim().toLowerCase() === "true";

export {
  mapParkingSession,
  validateAndMapSessions,
  mapPlateScanToVehicle,
  mapVehicleLookupToVehicle,
  mapSessionToFrontend,
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
    if (filters.session_code) {
      const q = String(filters.session_code).toLowerCase().trim();
      list = list.filter((s) => s.sessionCode?.toLowerCase().includes(q));
    }
    if (filters.license_plate) {
      const q = String(filters.license_plate).toLowerCase().trim();
      list = list.filter((s) => s.licensePlate?.toLowerCase().includes(q));
    }
    if (filters.min_fee !== undefined && filters.min_fee !== "") {
      list = list.filter((s) => (s.feeNumber ?? 0) >= Number(filters.min_fee));
    }
    if (filters.max_fee !== undefined && filters.max_fee !== "") {
      list = list.filter((s) => (s.feeNumber ?? 0) <= Number(filters.max_fee));
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

  const cleanFilters = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      cleanFilters[key] = String(value).trim();
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

export default {
  scanPlate,
  scanPlateImage,
  lookupVehicleByPlate,
  getParkingSessions,
  getParkingSessionDetail,
};
