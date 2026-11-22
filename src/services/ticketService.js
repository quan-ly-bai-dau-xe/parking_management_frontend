import { apiClient } from "./apiClient.js";
import { initialTickets } from "../mocks/ticketsData.js";
import { isMockEnabled } from "../config/appConfig.js";
import { formatIsoDateToDisplay, formatDisplayDateToIso } from "../utils/formatDateTime.js";

/**
 * Fallback memory store when running with mock or fallback degradation
 */
let memoryTickets = [...initialTickets];

export const FALLBACK_TICKET_TYPES = [
  { id: 1, code: "DAILY", name: "Vé ngày", duration_days: 1, default_price: 50000, description: "Vé gửi xe theo ngày" },
  { id: 2, code: "MONTHLY", name: "Vé tháng", duration_days: 30, default_price: 500000, description: "Vé gửi xe định kỳ hàng tháng" },
  { id: 3, code: "QUARTERLY", name: "Vé quý", duration_days: 90, default_price: 1200000, description: "Vé gửi xe định kỳ theo quý" },
  { id: 4, code: "YEARLY", name: "Vé năm", duration_days: 365, default_price: 4800000, description: "Vé gửi xe định kỳ hàng năm" },
];

/**
 * Format currency VND
 */
export function formatCurrencyVND(amount) {
  if (amount === undefined || amount === null || amount === "") return "—";
  if (typeof amount === "string" && (amount.endsWith("đ") || amount.endsWith("VND"))) return amount;
  const num = Number(amount);
  if (Number.isNaN(num)) return String(amount);
  return `${num.toLocaleString("vi-VN")}đ`;
}

/**
 * Normalize status code
 */
export function normalizeTicketStatus(status) {
  if (!status) return "active";
  const lower = String(status).toLowerCase();
  if (lower === "active") return "active";
  if (lower === "expired") return "expired";
  if (lower === "renewing" || lower === "expiring") return lower;
  if (lower === "terminated" || lower === "cancelled") return "cancelled";
  return lower;
}

/**
 * Map raw ticket item from backend or mock to frontend model
 */
export function mapTicketItem(raw, index = 0) {
  if (!raw) return null;

  const ticketCode = raw.code || raw.ticketCode || `VT${String(raw.id || index + 1).padStart(4, "0")}`;
  const customerCode = raw.customer_code || raw.customerCode || raw.customer?.code || "—";
  const customerName = raw.customer_name || raw.customerName || raw.customer?.full_name || raw.customer?.name || "—";
  const customerPhone = raw.customer_phone || raw.customerPhone || raw.customer?.phone || "";
  const licensePlate = raw.license_plate || raw.licensePlate || raw.vehicle?.license_plate || raw.vehicle || "—";
  
  const rawType = raw.ticket_type || raw.ticketType;
  const ticketTypeName = typeof rawType === "object" ? (rawType?.name || rawType?.code) : (rawType || "Vé tháng");
  const ticketTypeCode = raw.ticket_type_code || raw.ticketTypeCode || (typeof rawType === "object" ? rawType?.code : "");

  const startDate = raw.startDate || formatIsoDateToDisplay(raw.effective_from || raw.start_date);
  const endDate = raw.endDate || formatIsoDateToDisplay(raw.effective_to || raw.end_date);
  const priceDisplay = formatCurrencyVND(raw.price);

  const slotLocation = raw.slot_location || raw.slotLocation || (raw.slot?.code ? `Tầng B1 - ${raw.slot.code}` : "—");
  const normalizedStatus = normalizeTicketStatus(raw.status);
  const statusText = raw.status_display || raw.statusText || (
    normalizedStatus === "active" ? "Đang hoạt động" :
    normalizedStatus === "renewing" ? "Đang gia hạn" :
    normalizedStatus === "expired" ? "Đã hết hạn" :
    normalizedStatus === "cancelled" ? "Đã chấm dứt" : "Đang hoạt động"
  );

  return {
    id: raw.id || ticketCode,
    stt: raw.stt || index + 1,
    ticketCode,
    customerCode,
    customerName,
    customerPhone,
    licensePlate,
    ticketType: ticketTypeName,
    ticketTypeCode,
    startDate,
    endDate,
    price: priceDisplay,
    slotLocation,
    status: normalizedStatus,
    statusText,
    notes: raw.notes || "",
    rowVersion: raw.row_version ?? raw.rowVersion ?? 1,
    raw,
  };
}

/**
 * Kiểm tra xem lỗi có nên kích hoạt fallback hay không.
 * Tắt cơ chế tự động fallback ngầm khi Backend trả về lỗi 404 hoặc mất kết nối:
 * - Khi VITE_USE_MOCK=false / mockConfig.js tickets: undefined hoặc false,
 *   tuyệt đối KHÔNG fallback ngầm về memoryTickets mà ném lỗi ra ngoài
 *   để giao diện Quản lý vé hiển thị thông báo lỗi hoặc để bảng rỗng.
 * - Không nuốt lỗi 404 hay lỗi kết nối của Backend.
 */
function shouldFallback(error) {
  // Tuyệt đối không tự động fallback khi mock đang tắt hoặc chưa cấu hình bật rõ ràng
  if (!isMockEnabled("tickets")) {
    return false;
  }
  // Kể cả khi có cấu hình, không tự ý nuốt lỗi 404 của Backend
  const status = error?.status || error?.response?.status;
  if (status === 404) {
    return false;
  }
  return false;
}

export const ticketService = {
  /**
   * GET /api/v1/tickets/types/
   */
  async getTicketTypes() {
    if (isMockEnabled("tickets")) {
      return FALLBACK_TICKET_TYPES;
    }
    try {
      const response = await apiClient("/api/v1/tickets/types/");
      return Array.isArray(response) ? response : (response?.results || []);
    } catch (err) {
      if (shouldFallback(err)) {
        console.warn("[ticketService] Fallback to static ticket types:", err.message);
        return FALLBACK_TICKET_TYPES;
      }
      throw err;
    }
  },

  /**
   * GET /api/v1/tickets/
   * params: { q, status, ticket_type, page, page_size }
   */
  async getTickets(params = {}) {
    if (isMockEnabled("tickets")) {
      return memoryTickets.map((t, idx) => mapTicketItem(t, idx));
    }

    try {
      const searchParams = new URLSearchParams();
      if (params.q) searchParams.append("q", params.q);
      if (params.status && params.status !== "ALL") searchParams.append("status", params.status);
      if (params.ticket_type && params.ticket_type !== "ALL") searchParams.append("ticket_type", params.ticket_type);
      if (params.page) searchParams.append("page", String(params.page));
      if (params.page_size) searchParams.append("page_size", String(params.page_size));

      const queryStr = searchParams.toString();
      const url = `/api/v1/tickets/${queryStr ? `?${queryStr}` : ""}`;
      const response = await apiClient(url);

      const list = Array.isArray(response)
        ? response
        : Array.isArray(response?.results)
        ? response.results
        : null;

      if (!list) {
        throw new Error("Phản hồi danh sách vé không hợp lệ");
      }

      return list.map((item, idx) => mapTicketItem(item, idx));
    } catch (err) {
      if (shouldFallback(err)) {
        console.warn("[ticketService] Fallback to mock tickets data:", err.message);
        return memoryTickets.map((t, idx) => mapTicketItem(t, idx));
      }
      throw err;
    }
  },

  /**
   * GET /api/v1/tickets/:id/
   */
  async getTicketById(id) {
    if (isMockEnabled("tickets")) {
      const found = memoryTickets.find((t) => String(t.id) === String(id) || t.ticketCode === String(id));
      if (!found) throw new Error("Không tìm thấy thông tin vé đỗ xe");
      return mapTicketItem(found);
    }

    try {
      const response = await apiClient(`/api/v1/tickets/${id}/`);
      return mapTicketItem(response);
    } catch (err) {
      if (shouldFallback(err)) {
        console.warn("[ticketService] Fallback getTicketById:", err.message);
        const found = memoryTickets.find((t) => String(t.id) === String(id) || t.ticketCode === String(id));
        if (found) return mapTicketItem(found);
      }
      throw err;
    }
  },

  /**
   * POST /api/v1/tickets/
   */
  async createTicket(payload) {
    if (isMockEnabled("tickets")) {
      return this._createMockTicket(payload);
    }

    try {
      // Map frontend payload to backend schema if needed
      const backendPayload = {
        ticket_type_id: payload.ticket_type_id || 2, // Default monthly
        customer_id: payload.customer_id || null,
        customer_code: payload.customer_code || payload.customer || "",
        vehicle_id: payload.vehicle_id || null,
        license_plate: payload.license_plate || payload.vehicle || "",
        slot_id: payload.slot_id || null,
        effective_from: payload.effective_from || (payload.startDate ? formatDisplayDateToIso(payload.startDate) : null),
        effective_to: payload.effective_to || (payload.endDate ? formatDisplayDateToIso(payload.endDate) : null),
        price: payload.price ? Number(String(payload.price).replace(/[^\d]/g, "")) : undefined,
        notes: payload.notes || payload.note || "",
      };

      const response = await apiClient("/api/v1/tickets/", {
        method: "POST",
        body: JSON.stringify(backendPayload),
      });

      return mapTicketItem(response);
    } catch (err) {
      if (shouldFallback(err)) {
        console.warn("[ticketService] Fallback createTicket:", err.message);
        return this._createMockTicket(payload);
      }
      throw err;
    }
  },

  /**
   * POST /api/v1/tickets/:id/renew/
   */
  async renewTicket(id, renewData) {
    if (isMockEnabled("tickets")) {
      return this._renewMockTicket(id, renewData);
    }

    try {
      const backendPayload = {
        ticket_type_id: renewData.ticket_type_id || null,
        new_slot_id: renewData.new_slot_id || null,
        additional_price: renewData.renewPrice
          ? Number(String(renewData.renewPrice).replace(/[^\d]/g, ""))
          : 0,
        extend_days: renewData.extend_days || 30,
        notes: renewData.note || renewData.notes || "",
      };

      const response = await apiClient(`/api/v1/tickets/${id}/renew/`, {
        method: "POST",
        body: JSON.stringify(backendPayload),
      });

      return mapTicketItem(response);
    } catch (err) {
      if (shouldFallback(err)) {
        console.warn("[ticketService] Fallback renewTicket:", err.message);
        return this._renewMockTicket(id, renewData);
      }
      throw err;
    }
  },

  /**
   * DELETE /api/v1/tickets/:id/
   */
  async deleteTicket(id) {
    if (isMockEnabled("tickets")) {
      memoryTickets = memoryTickets.filter((t) => String(t.id) !== String(id) && t.ticketCode !== String(id));
      return { success: true };
    }

    try {
      const response = await apiClient(`/api/v1/tickets/${id}/`, {
        method: "DELETE",
      });
      return response;
    } catch (err) {
      if (shouldFallback(err)) {
        console.warn("[ticketService] Fallback deleteTicket:", err.message);
        memoryTickets = memoryTickets.filter((t) => String(t.id) !== String(id) && t.ticketCode !== String(id));
        return { success: true };
      }
      throw err;
    }
  },

  /**
   * Helpers for mock operations
   */
  _createMockTicket(payload) {
    const nextStt = memoryTickets.length + 1;
    const ticketCode = `VT${String(nextStt).padStart(4, "0")}`;
    const priceNum = payload.price ? Number(String(payload.price).replace(/[^\d]/g, "")) : 500000;
    const newTicket = {
      stt: nextStt,
      ticketCode,
      customerCode: payload.customer || payload.customer_code || "KH0001",
      customerName: payload.customerName || "Khách hàng mới",
      licensePlate: payload.vehicle || payload.license_plate || "51K-000.00",
      ticketType: payload.ticketType || "Vé tháng",
      startDate: payload.startDate || formatIsoDateToDisplay(new Date().toISOString()),
      endDate: payload.endDate || formatIsoDateToDisplay(new Date(Date.now() + 30 * 86400000).toISOString()),
      price: formatCurrencyVND(priceNum),
      slotLocation: payload.parkingSlot || "Tầng B1 - Auto",
      status: "active",
      statusText: "Đang hoạt động",
      notes: payload.note || payload.notes || "",
    };
    memoryTickets.unshift(newTicket);
    return mapTicketItem(newTicket, 0);
  },

  _renewMockTicket(id, renewData) {
    const foundIdx = memoryTickets.findIndex((t) => String(t.id) === String(id) || t.ticketCode === String(id));
    if (foundIdx === -1) {
      throw new Error("Không tìm thấy vé đỗ xe để gia hạn");
    }
    const current = memoryTickets[foundIdx];
    const updated = {
      ...current,
      ticketType: renewData.newTicketType || current.ticketType,
      endDate: renewData.newEndDate || current.endDate,
      price: renewData.renewPrice ? formatCurrencyVND(renewData.renewPrice) : current.price,
      slotLocation: renewData.newSlot || current.slotLocation,
      status: "active",
      statusText: "Đang hoạt động",
    };
    memoryTickets[foundIdx] = updated;
    return mapTicketItem(updated, foundIdx);
  },
};
