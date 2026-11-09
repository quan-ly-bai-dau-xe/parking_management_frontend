import { apiClient } from "./apiClient";
import { initialTickets } from "../mocks/ticketsData";

const USE_MOCK =
  import.meta.env.VITE_USE_MOCK?.trim().toLowerCase() === "true";

function formatMoney(amount) {
  if (amount == null) return "—";
  const num = Number(amount);
  return `${num.toLocaleString("vi-VN")}đ`;
}

function formatDate(isoStr) {
  if (!isoStr) return "—";
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  } catch {
    return isoStr;
  }
}

export function mapBackendTicketToFrontend(item, index = 0) {
  if (!item) return null;
  const statusLower = (item.status || "ACTIVE").toLowerCase();

  return {
    stt: index + 1,
    id: item.id || item.code,
    backendId: item.id,
    ticketCode: item.code || item.ticketCode || `VT${item.id || ""}`,
    customerCode: item.customer_code || item.customerCode || "—",
    customerName: item.customer_name || "—",
    customerPhone: item.customer_phone || "—",
    licensePlate: item.license_plate || item.licensePlate || "—",
    ticketType: item.ticket_type || item.ticketType || "Vé tháng",
    startDate: item.effective_from ? formatDate(item.effective_from) : (item.startDate || "—"),
    endDate: item.effective_to ? formatDate(item.effective_to) : (item.endDate || "—"),
    price: item.price != null ? (typeof item.price === "string" && item.price.includes("đ") ? item.price : formatMoney(item.price)) : "—",
    priceNumber: Number(item.price || 0),
    slotLocation: item.slot_location || item.slotLocation || "Chưa có vị trí",
    status: statusLower,
    statusText: item.status_display || item.statusText || (statusLower === "active" ? "Đang hoạt động" : "Hết hạn"),
    rowVersion: item.row_version || 1,
    rawBackend: item,
  };
}

export const ticketService = {
  /**
   * Lấy danh mục loại vé (Vé ngày, Vé tháng, Vé quý, Vé năm)
   */
  async getTicketTypes() {
    try {
      const res = await apiClient("/api/v1/ticket-types/");
      return Array.isArray(res) ? res : [];
    } catch (err) {
      console.warn("[ticketService] getTicketTypes fallback:", err.message);
      return [
        { id: 1, code: "DAY", name: "Vé ngày", duration_days: 1, default_price: 50000 },
        { id: 2, code: "MONTH", name: "Vé tháng", duration_days: 30, default_price: 500000 },
        { id: 3, code: "QUARTER", name: "Vé quý", duration_days: 90, default_price: 1200000 },
        { id: 4, code: "YEAR", name: "Vé năm", duration_days: 365, default_price: 4500000 },
      ];
    }
  },

  /**
   * Lấy danh sách vé đỗ xe
   */
  async getTickets(params = {}) {
    if (USE_MOCK) {
      return {
        total: initialTickets.length,
        data: [...initialTickets],
      };
    }

    try {
      const searchParams = new URLSearchParams();
      if (params.search) searchParams.append("q", params.search);
      if (params.status && params.status !== "ALL") searchParams.append("status", params.status);
      if (params.ticketType && params.ticketType !== "ALL") searchParams.append("ticket_type", params.ticketType);
      if (params.page) searchParams.append("page", params.page.toString());
      if (params.page_size) searchParams.append("page_size", params.page_size.toString());

      const queryStr = searchParams.toString() ? `?${searchParams.toString()}` : "";
      const res = await apiClient(`/api/v1/tickets/${queryStr}`);

      const results = Array.isArray(res) ? res : res.results || [];
      return {
        total: res.count ?? results.length,
        totalPages: res.total_pages ?? 1,
        currentPage: res.current_page ?? 1,
        data: results.map((item, idx) => mapBackendTicketToFrontend(item, idx)),
      };
    } catch (error) {
      console.warn("[ticketService] getTickets fallback mock:", error.message);
      return {
        total: initialTickets.length,
        totalPages: 1,
        currentPage: 1,
        data: [...initialTickets],
      };
    }
  },

  /**
   * Đăng ký vé mới
   */
  async createTicket(ticketData) {
    try {
      const res = await apiClient("/api/v1/tickets/", {
        method: "POST",
        body: JSON.stringify(ticketData),
      });
      return mapBackendTicketToFrontend(res);
    } catch (error) {
      if (error?.code === "API_UNAVAILABLE") {
        return {
          stt: initialTickets.length + 1,
          ticketCode: `VT${String(Date.now() % 10000).padStart(4, "0")}`,
          ...ticketData,
          status: "active",
          statusText: "Đang hoạt động",
        };
      }
      throw error;
    }
  },

  /**
   * Gia hạn vé
   */
  async renewTicket(ticketId, renewData) {
    try {
      const res = await apiClient(`/api/v1/tickets/${ticketId}/renew/`, {
        method: "POST",
        body: JSON.stringify(renewData),
      });
      return mapBackendTicketToFrontend(res);
    } catch (error) {
      if (error?.code === "API_UNAVAILABLE") {
        return {
          id: ticketId,
          ...renewData,
          status: "active",
          statusText: "Đang hoạt động",
        };
      }
      throw error;
    }
  },

  /**
   * Chi tiết vé
   */
  async getTicketDetail(ticketId) {
    try {
      const res = await apiClient(`/api/v1/tickets/${ticketId}/`);
      return mapBackendTicketToFrontend(res);
    } catch (error) {
      const found = initialTickets.find(
        (t) => t.ticketCode === ticketId || String(t.stt) === String(ticketId)
      );
      return found || null;
    }
  },

  /**
   * Hủy vé
   */
  async deleteTicket(ticketId) {
    try {
      return await apiClient(`/api/v1/tickets/${ticketId}/`, {
        method: "DELETE",
      });
    } catch (error) {
      if (error?.code === "API_UNAVAILABLE") return true;
      throw error;
    }
  },
};

