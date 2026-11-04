import { apiClient, axiosInstance } from "./apiClient.js";
import {
  mapParkingSession,
  validateAndMapSessions,
  mapPlateScanToVehicle,
  mapVehicleLookupToVehicle,
  mapSessionToFrontend,
} from "../utils/parking/plateScanMapper.js";

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
  const query = new URLSearchParams(filters).toString();
  const url = `/api/v1/parking/sessions/${query ? `?${query}` : ""}`;
  const response = await apiClient(url);
  return validateAndMapSessions(response);
}

/**
 * Lấy chi tiết 1 phiên đỗ xe
 */
export async function getParkingSessionDetail(sessionId) {
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
