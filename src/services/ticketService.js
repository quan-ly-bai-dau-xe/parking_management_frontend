import { apiClient } from "./apiClient.js";
import { formatDateVN } from "../utils/formatDateTime.js";

/**
 * Normalizes raw ticket payload from backend to camelCase object for frontend UI.
 */
export function normalizeTicket(raw) {
  if (!raw) return null;

  const rawStatus = (raw.status || "ACTIVE").toUpperCase();
  let statusKey = rawStatus.toLowerCase();
  if (statusKey === "active") statusKey = "active";
  else if (statusKey === "expired") statusKey = "expired";
  else if (statusKey === "renewing") statusKey = "renewing";
  else if (statusKey === "terminated" || statusKey === "cancelled") statusKey = "cancelled";

  return {
    id: raw.id,
    ticketCode: raw.code || `VT${raw.id}`,
    code: raw.code || `VT${raw.id}`,
    customerName: raw.customer_name || "—",
    customerCode: raw.customer_code || "—",
    customerPhone: raw.customer_phone || "—",
    customerId: raw.customer_id,
    licensePlate: raw.license_plate || "—",
    vehicleId: raw.vehicle_id,
    vehicleType: raw.vehicle_type || "—",
    ticketType: raw.ticket_type?.name || raw.ticket_type || "—",
    ticketTypeCode: raw.ticket_type?.code || raw.ticket_type_code || "",
    ticketTypeId: raw.ticket_type?.id || raw.ticket_type_id,
    startDate: formatDateVN(raw.effective_from, "—"),
    endDate: formatDateVN(raw.effective_to, "—"),
    effectiveFrom: raw.effective_from,
    effectiveTo: raw.effective_to,
    rawPrice: raw.price,
    price: raw.price
      ? `${Number(raw.price).toLocaleString("vi-VN")}đ`
      : "0đ",
    slotLocation: raw.slot_location || "Chưa có vị trí",
    slotId: raw.slot_id,
    status: statusKey,
    rawStatus: rawStatus,
    statusText: raw.status_display || rawStatus,
    notes: raw.notes || "",
    row_version: raw.row_version ?? 1,
    renewals: raw.renewals || [],
  };
}

/**
 * Lấy danh sách vé đỗ xe phân trang từ backend (SRS 4.6.1).
 */
export async function getTickets(params = {}) {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.append("page", params.page.toString());
  if (params.pageSize || params.page_size) {
    searchParams.append("page_size", (params.pageSize || params.page_size).toString());
  }
  if (params.q || params.search) {
    searchParams.append("q", (params.q || params.search).trim());
  }
  if (params.status && params.status !== "all" && params.status !== "ALL") {
    searchParams.append("status", params.status.toUpperCase());
  }
  if (params.ticketType && params.ticketType !== "all" && params.ticketType !== "ALL") {
    searchParams.append("ticket_type", params.ticketType);
  }

  const queryStr = searchParams.toString();
  const endpoint = `/api/v1/tickets/${queryStr ? `?${queryStr}` : ""}`;
  const response = await apiClient(endpoint);

  const rawResults = Array.isArray(response) ? response : (response?.results || []);
  const count = typeof response?.count === "number" ? response.count : rawResults.length;

  return {
    count,
    next: response?.next || null,
    previous: response?.previous || null,
    results: rawResults.map(normalizeTicket),
  };
}

/**
 * Lấy chi tiết vé theo ID hoặc Code.
 */
export async function getTicketDetail(lookup) {
  const response = await apiClient(`/api/v1/tickets/${lookup}/`);
  return normalizeTicket(response);
}

/**
 * Cập nhật thông tin vé / gia hạn với OCC row_version (SRS 4.6.3).
 */
export async function updateTicket(lookup, payload) {
  const response = await apiClient(`/api/v1/tickets/${lookup}/`, {
    method: "PATCH",
    data: payload,
  });
  return normalizeTicket(response);
}

/**
 * Xóa mềm vé đỗ xe (DEL-04 / SRS 4.6.4).
 */
export async function deleteTicket(lookup) {
  return apiClient(`/api/v1/tickets/${lookup}/`, {
    method: "DELETE",
  });
}

/**
 * Nghiệp vụ gia hạn vé đỗ xe (SRS 4.6.3).
 */
export async function renewTicket(lookup, payload) {
  const response = await apiClient(`/api/v1/tickets/${lookup}/renew/`, {
    method: "POST",
    data: payload,
  });
  return normalizeTicket(response);
}

/**
 * Tạo mới vé đỗ xe (SRS 4.6.2).
 */
export async function createTicket(payload) {
  const response = await apiClient("/api/v1/tickets/", {
    method: "POST",
    data: payload,
  });
  return normalizeTicket(response);
}

/**
 * Lấy danh mục loại vé (TicketType).
 */
export async function getTicketTypes() {
  const response = await apiClient("/api/v1/ticket-types/");
  return Array.isArray(response) ? response : (response?.results || []);
}

const ticketService = {
  normalizeTicket,
  getTickets,
  getTicketDetail,
  updateTicket,
  deleteTicket,
  renewTicket,
  createTicket,
  getTicketTypes,
};

export const FALLBACK_TICKET_TYPES = [
  { id: 1, code: "DAILY", name: "Vé ngày", duration_days: 1, default_price: 50000, description: "Vé gửi xe theo ngày" },
  { id: 2, code: "MONTHLY", name: "Vé tháng", duration_days: 30, default_price: 500000, description: "Vé gửi xe định kỳ hàng tháng" },
  { id: 3, code: "QUARTERLY", name: "Vé quý", duration_days: 90, default_price: 1200000, description: "Vé gửi xe định kỳ theo quý" },
  { id: 4, code: "YEARLY", name: "Vé năm", duration_days: 365, default_price: 4800000, description: "Vé gửi xe định kỳ hàng năm" },
];

export { ticketService };
export default ticketService;
