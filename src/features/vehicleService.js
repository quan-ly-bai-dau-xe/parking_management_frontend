import { apiClient } from "../services/apiClient.js";

export async function searchVehicles(query = "") {
  const params = new URLSearchParams({ q: query });
  const response = await fetch(`/api/v1/parking/vehicle-search/?${params}`, {
    credentials: "include",
  });
  if (!response.ok) throw new Error(`Vehicle API failed: ${response.status}`);
  return response.json();
}

export async function fetchVehicles(params = {}) {
  const searchParams = new URLSearchParams();
  if (params.search) searchParams.append("q", params.search);
  if (params.vehicleType) searchParams.append("vehicle_type", params.vehicleType);
  if (params.ticketType) searchParams.append("ticket_type", params.ticketType);
  if (params.status) searchParams.append("status", params.status);
  if (params.ticketStatus) searchParams.append("ticket_status", params.ticketStatus);
  if (params.page) searchParams.append("page", params.page.toString());
  if (params.page_size) searchParams.append("page_size", params.page_size.toString());

  return apiClient(`/api/v1/vehicles/?${searchParams.toString()}`);
}

export async function fetchVehicleSummary() {
  return apiClient("/api/v1/vehicles/summary/");
}

export async function fetchVehicleDetail(id) {
  return apiClient(`/api/v1/vehicles/${id}/`);
}

export function mapVehicleResults(payload) {
  const results = Array.isArray(payload) ? payload : payload?.results || [];
  return results.map(mapVehicleSearchItem);
}

export const vehicleService = {
  list: (params) => fetchVehicles(params),
  getSummary: () => fetchVehicleSummary(),
  getDetail: (id) => fetchVehicleDetail(id),
  create: (vehicle) => apiClient("/api/v1/vehicles/", {
    method: "POST",
    body: JSON.stringify(toVehiclePayload(vehicle)),
  }),
  update: (vehicle) => apiClient(`/api/v1/vehicles/${vehicle.backendId || vehicle.id}/`, {
    method: "PATCH",
    body: JSON.stringify(toVehiclePayload(vehicle)),
  }),
  remove: (vehicle) => apiClient(`/api/v1/vehicles/${vehicle.backendId || vehicle.id}/`, {
    method: "DELETE",
  }),
};

function toVehiclePayload(vehicle) {
  return {
    license_plate: vehicle.licensePlate.trim(),
    vehicle_type: vehicle.vehicleType,
    customer_name: vehicle.customer.name.trim(),
    customer_phone: vehicle.customer.phone.trim(),
    parking_position: vehicle.parkingSlot.display.trim(),
    status: vehicle.status,
  };
}

function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("vi-VN").format(new Date(value));
}

export function mapVehicleSearchItem(item) {
  const vehicle = item.vehicle || item;
  const owner = item.customer || item.owner || {};
  const ticket_info = item.active_ticket || item.ticket_info || {};
  const assigned_slot = item.parking_position || item.assigned_slot || {};

  return {
    id: vehicle.id,
    backendId: vehicle.id,
    licensePlate: vehicle.license_plate,
    vehicleType: vehicle.vehicle_type,
    brand: vehicle.brand || "—",
    model: vehicle.model_name || "—",
    avatarIcon: vehicle.vehicle_type_code === "EV" ? "car-cyan" : "car-blue",
    customer: {
      id: owner.id || String(owner.code || "—"),
      name: owner.full_name || owner.name || "—",
      phone: owner.phone || "—",
      email: owner.email || "—",
      totalVehicles: owner.total_vehicles || 1,
    },
    ticket: {
      type: ticket_info.type_name || ticket_info.type || "—",
      expiresAt: formatDate(ticket_info.expires_at || ticket_info.effective_to),
      registeredAt: formatDate(ticket_info.registered_at || ticket_info.effective_from),
      remainingDays: ticket_info.remaining_days ?? 0,
      status: ticket_info.status || "expired",
      note: ticket_info.note || "",
    },
    parkingSlot: {
      display: assigned_slot.display_text || assigned_slot.display || "Chưa có vị trí",
      zone: assigned_slot.zone_code || "",
      floor: assigned_slot.floor_name || "",
      slot: assigned_slot.slot_code || "",
      type: item.vehicle_type_code === "CAR" ? "car" : "ev",
    },
    status: item.status_display || (item.currently_parked ? "parked" : "active"),
    note: item.is_blacklisted ? "Biển số nằm trong danh sách cảnh báo." : (vehicle.color || ""),
  };
}

