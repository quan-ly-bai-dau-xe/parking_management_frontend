export async function searchVehicles(query = "") {
  const params = new URLSearchParams({ q: query });
  const response = await fetch(`/api/v1/parking/vehicle-search/?${params}`, {
    credentials: "include",
  });
  if (!response.ok) throw new Error(`Vehicle API failed: ${response.status}`);
  return response.json();
}

function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("vi-VN").format(new Date(value));
}

export function mapVehicleSearchItem(item) {
  const vehicle = item.vehicle;
  const customer = item.customer || {};
  const ticket = item.active_ticket;
  const position = item.parking_position;

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
      expiresAt: formatDate(ticket?.effective_to),
      registeredAt: formatDate(ticket?.effective_from),
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
    status: item.currently_parked ? "parked" : "active",
    note: item.is_blacklisted ? "Biển số nằm trong danh sách cảnh báo." : vehicle.color || "",
  };
}
