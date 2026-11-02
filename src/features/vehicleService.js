import { apiClient, axiosInstance } from "../services/apiClient.js";

export async function searchVehicles(query = "") {
  const response = await axiosInstance.get("/api/v1/parking/vehicle-search/", {
    params: { q: query },
  });
  return response.data;
}

/**
 * Fetch paginated vehicle list from backend API
 * GET /api/v1/vehicles/
 */
export async function fetchVehicles(params = {}) {
  const searchParams = new URLSearchParams();
  if (params.search) searchParams.append("plate", params.search);
  if (params.code) searchParams.append("code", params.code);
  if (params.plate) searchParams.append("plate", params.plate);
  if (params.customer) searchParams.append("customer", params.customer);
  if (params.vehicleType) searchParams.append("vehicle_type", params.vehicleType);
  if (params.ticketType) searchParams.append("ticket_type", params.ticketType);
  if (params.status) searchParams.append("status", params.status);
  if (params.ticketState) searchParams.append("ticket_state", params.ticketState);
  if (params.ordering) searchParams.append("ordering", params.ordering);
  if (params.page) searchParams.append("page", params.page.toString());
  if (params.page_size) searchParams.append("page_size", params.page_size.toString());

  return apiClient(`/api/v1/vehicles/?${searchParams.toString()}`);
}

/**
 * Fetch summary KPI metrics
 * GET /api/v1/vehicles/summary/
 */
export async function fetchVehicleSummary() {
  return apiClient("/api/v1/vehicles/summary/");
}

/**
 * Fetch vehicle detail by ID
 * GET /api/v1/vehicles/{id}/
 */
export async function fetchVehicleDetail(id) {
  return apiClient(`/api/v1/vehicles/${id}/`);
}

/**
 * Fetch vehicle types for dropdown filters
 * GET /api/v1/vehicle-types/
 */
export async function fetchVehicleTypes() {
  return apiClient("/api/v1/vehicle-types/");
}

/**
 * Export vehicles as CSV file
 * GET /api/v1/vehicles/export/
 */
export async function exportVehiclesCsv(params = {}) {
  const searchParams = new URLSearchParams();
  if (params.search) searchParams.append("plate", params.search);
  if (params.code) searchParams.append("code", params.code);
  if (params.plate) searchParams.append("plate", params.plate);
  if (params.customer) searchParams.append("customer", params.customer);
  if (params.vehicleType) searchParams.append("vehicle_type", params.vehicleType);
  if (params.ticketType) searchParams.append("ticket_type", params.ticketType);
  if (params.status) searchParams.append("status", params.status);
  if (params.ticketState) searchParams.append("ticket_state", params.ticketState);
  if (params.ordering) searchParams.append("ordering", params.ordering);

  const query = searchParams.toString();
  const url = `/api/v1/vehicles/export/${query ? `?${query}` : ""}`;

  const response = await axiosInstance.get(url, {
    responseType: "blob",
  });

  const downloadUrl = window.URL.createObjectURL(new Blob([response.data]));
  const a = document.createElement("a");
  a.href = downloadUrl;
  a.download = `danh_sach_phuong_tien_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(downloadUrl);
}

/**
 * Map backend vehicle list or search item to standard frontend vehicle model
 */
export function mapVehicleResults(payload) {
  const results = Array.isArray(payload) ? payload : payload?.results || [];
  return results.map(mapVehicleSearchItem);
}

export const vehicleService = {
  list: (params) => fetchVehicles(params),
  getSummary: () => fetchVehicleSummary(),
  getDetail: (id) => fetchVehicleDetail(id),
  getTypes: () => fetchVehicleTypes(),
  exportCsv: (params) => exportVehiclesCsv(params),
  create: (payload) =>
    apiClient("/api/v1/vehicles/", {
      method: "POST",
      body: JSON.stringify(toCreatePayload(payload)),
    }),
  update: (id, payload) =>
    apiClient(`/api/v1/vehicles/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(toUpdatePayload(payload)),
    }),
  remove: (id) =>
    apiClient(`/api/v1/vehicles/${id}/`, {
      method: "DELETE",
    }),
};

function toCreatePayload(vehicle) {
  return {
    code: vehicle.code ? vehicle.code.trim() : undefined,
    license_plate: (vehicle.licensePlate || vehicle.license_plate || "").trim(),
    model_name: (vehicle.model || vehicle.model_name || "").trim(),
    vehicle_type_id: Number(vehicle.vehicleTypeId || vehicle.vehicle_type_id || 1),
    customer_id: Number(vehicle.customerId || vehicle.customer_id || vehicle.customer?.id),
    brand: (vehicle.brand || "").trim() || undefined,
    color: (vehicle.color || "").trim() || undefined,
    image_url: vehicle.imageUrl || vehicle.image_url || undefined,
    notes: (vehicle.note || vehicle.notes || "").trim() || undefined,
  };
}

function toUpdatePayload(vehicle) {
  const payload = {
    row_version: Number(vehicle.rowVersion || vehicle.row_version || 1),
  };
  if (vehicle.model !== undefined || vehicle.model_name !== undefined) {
    payload.model_name = (vehicle.model || vehicle.model_name || "").trim();
  }
  if (vehicle.brand !== undefined) {
    payload.brand = (vehicle.brand || "").trim();
  }
  if (vehicle.color !== undefined) {
    payload.color = (vehicle.color || "").trim();
  }
  if (vehicle.imageUrl !== undefined || vehicle.image_url !== undefined) {
    payload.image_url = vehicle.imageUrl || vehicle.image_url;
  }
  if (vehicle.notes !== undefined || vehicle.note !== undefined) {
    payload.notes = (vehicle.note || vehicle.notes || "").trim();
  }
  if (vehicle.customerId !== undefined || vehicle.customer_id !== undefined) {
    payload.customer_id = Number(vehicle.customerId || vehicle.customer_id);
  }
  if (vehicle.vehicleTypeId !== undefined || vehicle.vehicle_type_id !== undefined) {
    payload.vehicle_type_id = Number(vehicle.vehicleTypeId || vehicle.vehicle_type_id);
  }
  return payload;
}

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("vi-VN").format(new Date(value));
  } catch {
    return "—";
  }
}

export function mapVehicleSearchItem(item) {
  if (!item) return null;
  const vehicle = item.vehicle || item;
  const owner = item.customer || item.owner || {};
  const ticket_info = item.active_ticket || item.ticket_info || item.ticket || {};
  const assigned_slot = item.parking_position || item.assigned_slot || {};

  const vehicleTypeCode =
    vehicle.vehicle_type?.code ||
    vehicle.vehicle_type_code ||
    (typeof vehicle.vehicle_type === "string" ? vehicle.vehicle_type : "") ||
    "";
  const vehicleTypeName =
    vehicle.vehicle_type?.name ||
    (vehicleTypeCode === "EV" ? "Xe điện" : "Ô tô");

  const ticketTypeObj = ticket_info.type || {};
  const ticketTypeName =
    ticket_info.ticket_type_name ||
    ticketTypeObj.name ||
    ticket_info.type_name ||
    ticket_info.type ||
    "—";

  const slotDisplay =
    item.current_slot ||
    assigned_slot.display_text ||
    assigned_slot.display ||
    "Chưa có vị trí";

  return {
    id: vehicle.id,
    backendId: vehicle.id,
    code: vehicle.code || `XE${String(vehicle.id).padStart(4, "0")}`,
    licensePlate: vehicle.license_plate,
    vehicleType: vehicleTypeName,
    vehicleTypeCode: vehicleTypeCode,
    brand: vehicle.brand || "—",
    model: vehicle.model_name || vehicle.model || "—",
    rowVersion: vehicle.row_version ?? 1,
    imageUrl: vehicle.image_url || null,
    avatarIcon: vehicleTypeCode === "EV" ? "car-cyan" : "car-blue",
    customer: {
      id: owner.id || String(owner.code || "—"),
      code: owner.code || "—",
      name: owner.full_name || owner.name || "—",
      phone: owner.phone || "—",
      email: owner.email || "—",
      totalVehicles: owner.total_vehicles || owner.registered_vehicles_count || 1,
    },
    ticket: {
      type: ticketTypeName,
      code: ticket_info.ticket_type_code || ticketTypeObj.code || "",
      expiresAt: formatDate(ticket_info.expires_at || ticket_info.effective_to),
      registeredAt: formatDate(ticket_info.registered_at || ticket_info.effective_from),
      remainingDays: ticket_info.days_remaining ?? ticket_info.remaining_days ?? 0,
      status: ticket_info.state || ticket_info.status || "expired",
      statusDisplay: ticket_info.state_display || "",
      note: ticket_info.note || "",
      progressPct: ticket_info.progress_pct ?? 0,
      isValid: ticket_info.is_valid ?? false,
    },
    parkingSlot: {
      display: slotDisplay,
      zone: assigned_slot.zone_code || "",
      floor: assigned_slot.floor_name || "",
      slot: assigned_slot.slot_code || "",
      type: vehicleTypeCode === "EV" ? "ev" : "car",
    },
    status: item.status_code || item.status || (item.currently_parked ? "parked" : "active"),
    statusDisplay: item.status_display || (item.status === "parked" ? "Đang đỗ" : "Đang hoạt động"),
    note: item.is_blacklisted
      ? "Biển số nằm trong danh sách cảnh báo."
      : vehicle.notes || vehicle.color || "",
  };
}

