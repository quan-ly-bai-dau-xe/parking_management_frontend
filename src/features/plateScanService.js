import { apiClient, axiosInstance } from "../services/apiClient.js";

/**
 * Plate Scan & Vehicle Lookup Services
 * Connects to backend API endpoints:
 * - POST /api/v1/parking/plate-scans/ - Upload image for OCR plate recognition
 * - GET /api/v1/parking/vehicle-lookup/ - Lookup vehicle by license plate
 * - GET /api/v1/parking/sessions/ - Get parking sessions history
 */

/**
 * Upload license plate image for OCR recognition and vehicle lookup
 * @param {File} imageFile - Image file from camera or upload
 * @param {number} gateId - Optional gate ID (default: 1)
 * @returns {Promise<Object>} Plate scan result with vehicle info
 */
export async function scanPlateImage(imageFile, gateId = 1) {
  const formData = new FormData();
  formData.append('image', imageFile);
  if (gateId) {
    formData.append('gate_id', gateId.toString());
  }

  // Ensure Accept: application/json so backend DRF never tries to render HTML template
  const response = await axiosInstance.post('/api/v1/parking/plate-scans/', formData, {
    headers: {
      Accept: 'application/json',
    },
  });
  return response.data;
}

/**
 * Lookup vehicle by license plate
 * @param {string} licensePlate - License plate to search (e.g., "51K-992.14" or "51K99214")
 * @returns {Promise<Object>} Vehicle lookup result
 */
export async function lookupVehicleByPlate(licensePlate) {
  const params = new URLSearchParams({ license_plate: licensePlate });
  return apiClient(`/api/v1/parking/vehicle-lookup/?${params}`);
}

/**
 * Get parking sessions/history with filters
 * @param {Object} filters - Filter options
 * @param {string} filters.license_plate - Filter by license plate
 * @param {string} filters.session_code - Filter by session code
 * @param {string} filters.entry_time_from - ISO date string
 * @param {string} filters.entry_time_to - ISO date string
 * @param {string} filters.exit_time_from - ISO date string
 * @param {string} filters.exit_time_to - ISO date string
 * @param {string} filters.status - "open" | "closed"
 * @param {string} filters.review_status - "AUTO" | "NEEDS_REVIEW" | "REJECTED"
 * @param {number} filters.min_fee - Minimum fee
 * @param {number} filters.max_fee - Maximum fee
 * @param {number} filters.page - Page number (default: 1)
 * @param {number} filters.page_size - Page size (default: 20)
 * @returns {Promise<Object>} Paginated sessions list
 */
export async function getParkingSessions(filters = {}) {
  const params = new URLSearchParams();
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, value);
    }
  });

  return apiClient(`/api/v1/parking/sessions/?${params}`);
}

/**
 * Get single parking session detail
 * @param {number|string} sessionId - Session ID
 * @returns {Promise<Object>} Session detail
 */
export async function getParkingSessionDetail(sessionId) {
  return apiClient(`/api/v1/parking/sessions/${sessionId}/`);
}

/**
 * Map backend plate scan response to frontend vehicle format
 * @param {Object} scanResult - Response from plate-scans endpoint
 * @returns {Object|null} Mapped vehicle object or null if not found
 */
export function mapPlateScanToVehicle(scanResult) {
  if (!scanResult || !scanResult.vehicle_lookup) {
    return null;
  }

  const lookup = scanResult.vehicle_lookup;
  if (!lookup.vehicle) {
    return null; // Vehicle not registered in system
  }

  const vehicle = lookup.vehicle;
  const customer = lookup.customer || {};
  const ticket = lookup.active_ticket;
  const position = lookup.parking_position;
  const openSession = lookup.open_session;

  return {
    id: vehicle.code,
    backendId: vehicle.id,
    licensePlate: vehicle.license_plate,
    vehicleType: vehicle.vehicle_type,
    brand: vehicle.brand || "—",
    model: vehicle.model_name,
    avatarIcon: vehicle.vehicle_type_code === "EV" ? "car-cyan" : "car-blue",
    customer: {
      id: customer.code || String(customer.id || "—"),
      name: customer.full_name || "—",
      phone: customer.phone || "—",
      email: "—",
      totalVehicles: 1,
    },
    ticket: {
      type: ticket?.ticket_type_name || "—",
      expiresAt: ticket?.effective_to ? formatDate(ticket.effective_to) : "—",
      registeredAt: ticket?.effective_from ? formatDate(ticket.effective_from) : "—",
      remainingDays: ticket?.effective_to
        ? Math.max(0, Math.ceil((new Date(ticket.effective_to) - Date.now()) / 86400000))
        : 0,
      status: ticket?.status === "ACTIVE" ? "active" : "expired",
      note: ticket ? `Mã vé: ${ticket.code}` : "Chưa có vé đang hoạt động.",
    },
    parkingSlot: {
      display: position?.display_text || "Chưa có vị trí",
      zone: position?.zone_code || "",
      floor: position?.floor_name || "",
      slot: position?.slot_code || "",
      type: vehicle.vehicle_type_code === "CAR" ? "car" : "ev",
    },
    status: openSession ? "parked" : "active",
    note: lookup.is_blacklisted ? "Biển số nằm trong danh sách cảnh báo." : vehicle.color || "",
    // Additional scan metadata
    scanMetadata: {
      reviewStatus: scanResult.review_status,
      reviewReasons: scanResult.review_reasons,
      plateNormalized: scanResult.plate_normalized,
      imageUrl: scanResult.image_url,
      detectedAt: scanResult.created_at,
    },
  };
}

/**
 * Map backend vehicle lookup response to frontend vehicle format
 * @param {Object} lookupResult - Response from vehicle-lookup endpoint
 * @returns {Object|null} Mapped vehicle object or null if not found
 */
export function mapVehicleLookupToVehicle(lookupResult) {
  if (!lookupResult || !lookupResult.vehicle) {
    return null;
  }

  const vehicle = lookupResult.vehicle;
  const customer = lookupResult.customer || {};
  const ticket = lookupResult.active_ticket;
  const position = lookupResult.parking_position;
  const openSession = lookupResult.open_session;

  return {
    id: vehicle.code,
    backendId: vehicle.id,
    licensePlate: vehicle.license_plate,
    vehicleType: vehicle.vehicle_type,
    brand: vehicle.brand || "—",
    model: vehicle.model_name,
    avatarIcon: vehicle.vehicle_type_code === "EV" ? "car-cyan" : "car-blue",
    customer: {
      id: customer.code || String(customer.id || "—"),
      name: customer.full_name || "—",
      phone: customer.phone || "—",
      email: "—",
      totalVehicles: 1,
    },
    ticket: {
      type: ticket?.ticket_type_name || "—",
      expiresAt: ticket?.effective_to ? formatDate(ticket.effective_to) : "—",
      registeredAt: ticket?.effective_from ? formatDate(ticket.effective_from) : "—",
      remainingDays: ticket?.effective_to
        ? Math.max(0, Math.ceil((new Date(ticket.effective_to) - Date.now()) / 86400000))
        : 0,
      status: ticket?.status === "ACTIVE" ? "active" : "expired",
      note: ticket ? `Mã vé: ${ticket.code}` : "Chưa có vé đang hoạt động.",
    },
    parkingSlot: {
      display: position?.display_text || "Chưa có vị trí",
      zone: position?.zone_code || "",
      floor: position?.floor_name || "",
      slot: position?.slot_code || "",
      type: vehicle.vehicle_type_code === "CAR" ? "car" : "ev",
    },
    status: openSession ? "parked" : "active",
    note: lookupResult.is_blacklisted ? "Biển số nằm trong danh sách cảnh báo." : vehicle.color || "",
  };
}

/**
 * Map backend session to frontend format
 * @param {Object} session - Session from backend
 * @returns {Object} Mapped session
 */
export function mapSessionToFrontend(session) {
  const feeValue = session.fee ?? session.fee_amount;
  const feeNumber = Number(feeValue || 0);
  return {
    id: session.id,
    sessionCode: session.session_code,
    licensePlate: session.license_plate,
    vehicleType: session.vehicle_type,
    entryTime: formatDateTime(session.entry_time),
    exitTime: formatDateTime(session.exit_time),
    entryGate: session.entry_gate_name,
    exitGate: session.exit_gate_name,
    durationSeconds: session.duration_seconds,
    duration: session.duration_text || "—",
    durationText: session.duration_text || "—",
    feeNumber,
    fee: feeValue != null ? `${feeNumber.toLocaleString("vi-VN")}đ` : "—",
    plateImageUrl: session.plate_image_url || session.entry_plate_image_url || session.entry_image_url || null,
    status: session.status,
    reviewStatus: session.review_status,
    reviewReasons: session.review_reasons,
    vehicle: session.vehicle_lookup ? mapVehicleLookupToVehicle(session.vehicle_lookup) : null,
  };
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(date).replace(",", "");
}

/**
 * Format date for display
 * @param {string} value - ISO date string
 * @returns {string} Formatted date
 */
function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("vi-VN").format(new Date(value));
}

/**
 * Service object for easy importing
 */
export const plateScanService = {
  scanPlateImage,
  lookupVehicleByPlate,
  getParkingSessions,
  getParkingSessionDetail,
  mapPlateScanToVehicle,
  mapVehicleLookupToVehicle,
  mapSessionToFrontend,
};
