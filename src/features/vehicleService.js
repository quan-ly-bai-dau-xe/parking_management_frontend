import { apiClient } from "../services/apiClient.js";
import { mockVehicles } from "../mocks/vehicleData.js";

const USE_MOCK =
  import.meta.env.VITE_USE_MOCK?.trim().toLowerCase() === "true";

export async function searchVehicles(query = "") {
  try {
    const params = new URLSearchParams({ q: query });
    const response = await fetch(`/api/v1/parking/vehicle-search/?${params}`, {
      credentials: "include",
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (err) {
    console.warn("[vehicleService] searchVehicles offline:", err.message);
  }
  const q = query.trim().toLowerCase();
  return mockVehicles.filter(
    (v) =>
      !q ||
      v.licensePlate?.toLowerCase().includes(q) ||
      v.customer?.name?.toLowerCase().includes(q)
  );
}

export async function fetchVehicles(params = {}) {
  if (USE_MOCK) {
    return {
      count: mockVehicles.length,
      total_pages: 1,
      current_page: 1,
      results: mockVehicles,
    };
  }

  try {
    const searchParams = new URLSearchParams();
    if (params.search) searchParams.append("q", params.search);
    if (params.vehicleType) searchParams.append("vehicle_type", params.vehicleType);
    if (params.ticketType) searchParams.append("ticket_type", params.ticketType);
    if (params.status) searchParams.append("status", params.status);
    if (params.ticketStatus) searchParams.append("ticket_status", params.ticketStatus);
    if (params.page) searchParams.append("page", params.page.toString());
    if (params.page_size) searchParams.append("page_size", params.page_size.toString());

    const res = await apiClient(`/api/v1/vehicles/?${searchParams.toString()}`);
    return res;
  } catch (err) {
    console.warn("[vehicleService] fetchVehicles fallback mock:", err.message);
    return {
      count: mockVehicles.length,
      total_pages: 1,
      current_page: 1,
      results: mockVehicles,
    };
  }
}

export async function fetchVehicleSummary() {
  try {
    return await apiClient("/api/v1/vehicles/summary/");
  } catch (err) {
    console.warn("[vehicleService] fetchVehicleSummary fallback mock:", err.message);
    return {
      total_vehicles: mockVehicles.length,
      currently_parked: mockVehicles.filter((v) => v.status === "parked" || v.status === "Đang đỗ").length,
      active_tickets: mockVehicles.filter((v) => v.ticket?.status === "active").length,
      warning_tickets: mockVehicles.filter((v) => v.ticket?.status === "warning" || v.ticket?.status === "expiring").length,
    };
  }
}

export async function fetchVehicleDetail(id) {
  try {
    return await apiClient(`/api/v1/vehicles/${id}/`);
  } catch (err) {
    const found = mockVehicles.find((v) => v.id === id || String(v.backendId) === String(id));
    return found || null;
  }
}

export function mapVehicleResults(payload) {
  const results = Array.isArray(payload) ? payload : payload?.results || [];
  return results.map(mapVehicleSearchItem);
}

function toVehiclePayload(vehicle) {
  const isEv = (vehicle.vehicleType || "").toLowerCase().includes("điện");
  return {
    license_plate: (vehicle.licensePlate || "").trim(),
    model_name: (vehicle.model || vehicle.brand || "Sedan").trim(),
    vehicle_type_id: vehicle.vehicleTypeId || (isEv ? 2 : 1),
    customer_id: typeof vehicle.customer?.id === "number" ? vehicle.customer.id : (vehicle.customer?.backendId || 1),
    brand: (vehicle.brand || "—").trim(),
    color: (vehicle.note || "").trim() || "Trắng",
    notes: vehicle.parkingSlot?.display ? `Vị trí: ${vehicle.parkingSlot.display}` : "",
  };
}

function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("vi-VN").format(new Date(value));
}

export function mapVehicleSearchItem(item) {
  if (item && item.licensePlate && item.parkingSlot) {
    // Already in frontend format
    return item;
  }

  const vehicle = item.vehicle || item;
  const owner = item.customer || item.owner || {};
  const ticket_info = item.active_ticket || item.ticket_info || {};
  const assigned_slot = item.parking_position || item.assigned_slot || {};

  return {
    id: vehicle.code || `XE${String(vehicle.id).padStart(4, "0")}`,
    backendId: vehicle.id,
    licensePlate: vehicle.license_plate,
    vehicleType: vehicle.vehicle_type || (vehicle.vehicle_type_code === "EV" ? "Xe điện" : "Ô tô"),
    brand: vehicle.brand || "—",
    model: vehicle.model_name || "—",
    avatarIcon: vehicle.vehicle_type_code === "EV" ? "car-cyan" : "car-blue",
    customer: {
      id: owner.id || String(owner.code || "—"),
      backendId: owner.id,
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
      type: vehicle.vehicle_type_code === "CAR" ? "car" : "ev",
    },
    status: item.status_display || (item.currently_parked ? "parked" : "active"),
    note: item.is_blacklisted ? "Biển số nằm trong danh sách cảnh báo." : (vehicle.color || ""),
  };
}

export const vehicleService = {
  list: (params) => fetchVehicles(params),
  getSummary: () => fetchVehicleSummary(),
  getDetail: (id) => fetchVehicleDetail(id),
  create: async (vehicle) => {
    try {
      return await apiClient("/api/v1/vehicles/", {
        method: "POST",
        body: JSON.stringify(toVehiclePayload(vehicle)),
      });
    } catch (err) {
      if (err?.code === "API_UNAVAILABLE") {
        return {
          ...vehicle,
          id: vehicle.id || `XE${Date.now() % 10000}`,
        };
      }
      throw err;
    }
  },
  update: async (vehicle) => {
    const targetId = vehicle.backendId || vehicle.id;
    try {
      return await apiClient(`/api/v1/vehicles/${targetId}/`, {
        method: "PATCH",
        body: JSON.stringify(toVehiclePayload(vehicle)),
      });
    } catch (err) {
      if (err?.code === "API_UNAVAILABLE") {
        return vehicle;
      }
      throw err;
    }
  },
  remove: async (vehicle) => {
    const targetId = vehicle.backendId || vehicle.id;
    try {
      return await apiClient(`/api/v1/vehicles/${targetId}/`, {
        method: "DELETE",
      });
    } catch (err) {
      if (err?.code === "API_UNAVAILABLE") return true;
      throw err;
    }
  },
};
