import { apiClient } from "./apiClient";
import { mockCustomers } from "../mocks/customerData";

// Biến điều khiển mock data:
// - Mặc định gọi backend thật.
// - Tự động fallback về mock data nếu backend chưa khởi động (API_UNAVAILABLE) hoặc khi bật VITE_USE_MOCK=true.
const USE_MOCK =
  import.meta.env.VITE_USE_MOCK?.trim().toLowerCase() === "true";

function formatDate(isoDate) {
  if (!isoDate) return "—";
  try {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return isoDate;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return isoDate;
  }
}

export function mapBackendCustomerToFrontend(item) {
  if (!item) return null;
  return {
    id: item.id || item.code || item.customerCode,
    backendId: item.id,
    customerCode: item.code || item.customerCode || `KH${item.id || ""}`,
    name: item.full_name || item.name || "—",
    phone: item.phone || "—",
    idNumber: item.identity_card_number || item.idNumber || "—",
    birthday: item.date_of_birth ? formatDate(item.date_of_birth) : (item.birthday || "—"),
    email: item.email || "—",
    gender: item.gender || "Nam",
    status: item.status_display || (item.status === "ACTIVE" ? "Đang hoạt động" : (item.status || "Đang hoạt động")),
    packageType: item.has_active_ticket ? "Gói tháng" : (item.packageType || "Gói tháng"),
    vehicles: item.vehicles || [],
    vehiclesCount: item.vehicles_count ?? (item.vehicles?.length || 0),
    rowVersion: item.row_version || 1,
    rawBackend: item,
  };
}

export function mapFrontendCustomerToBackend(data) {
  let dob = data.birthday;
  if (dob && dob.includes("/")) {
    const parts = dob.split("/");
    if (parts.length === 3) {
      dob = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
    }
  }

  const payload = {
    full_name: (data.name || data.full_name || "").trim(),
    phone: (data.phone || "").trim(),
  };

  const idNum = (data.idNumber || data.identity_card_number || "").trim();
  if (idNum && idNum !== "—") payload.identity_card_number = idNum;

  if (dob && dob !== "—") payload.date_of_birth = dob;

  const mail = (data.email || "").trim();
  if (mail && mail !== "—") payload.email = mail;

  if (data.gender) payload.gender = data.gender;
  payload.status =
    data.status === "Ngưng hoạt động" || data.status === "INACTIVE"
      ? "INACTIVE"
      : "ACTIVE";

  return payload;
}

function formatCustomerApiError(error) {
  if (error?.status === 404) {
    const customError = new Error(
      "Dịch vụ khách hàng chưa sẵn sàng hoặc không tìm thấy địa chỉ dữ liệu (404)."
    );
    customError.status = 404;
    return customError;
  }
  if (error?.code === "API_UNAVAILABLE") {
    return error;
  }
  const customError = new Error(
    error?.message || "Đã xảy ra lỗi khi kết nối với máy chủ."
  );
  customError.status = error?.status;
  return customError;
}

export const customerService = {
  /**
   * Lấy danh sách khách hàng từ backend (có fallback mock data)
   */
  async getCustomers(params = {}) {
    if (USE_MOCK) {
      return [...mockCustomers];
    }

    try {
      const searchParams = new URLSearchParams();
      if (params.search) searchParams.append("q", params.search);
      if (params.status) searchParams.append("status", params.status);
      if (params.page) searchParams.append("page", params.page.toString());
      if (params.page_size) searchParams.append("page_size", params.page_size.toString());

      const queryStr = searchParams.toString() ? `?${searchParams.toString()}` : "";
      const response = await apiClient(`/api/v1/customers/${queryStr}`);
      const rawList = Array.isArray(response) ? response : response?.results || [];
      return rawList.map(mapBackendCustomerToFrontend);
    } catch (error) {
      if (error?.code === "API_UNAVAILABLE") {
        console.warn("[customerService] Backend offline, sử dụng mock data khách hàng.");
        return [...mockCustomers];
      }
      throw formatCustomerApiError(error);
    }
  },

  /**
   * Lấy số liệu thống kê KPI khách hàng
   */
  async getCustomerSummary() {
    if (USE_MOCK) {
      return {
        total_customers: mockCustomers.length,
        active_customers: mockCustomers.filter((c) => c.status === "Đang hoạt động").length,
        customers_with_tickets: mockCustomers.filter((c) => c.packageType).length,
      };
    }

    try {
      return await apiClient("/api/v1/customers/summary/");
    } catch (error) {
      if (error?.code === "API_UNAVAILABLE") {
        return {
          total_customers: mockCustomers.length,
          active_customers: mockCustomers.filter((c) => c.status === "Đang hoạt động").length,
          customers_with_tickets: mockCustomers.filter((c) => c.packageType).length,
        };
      }
      throw formatCustomerApiError(error);
    }
  },

  /**
   * Lấy chi tiết khách hàng theo ID
   */
  async getCustomerDetail(id) {
    if (USE_MOCK) {
      const found = mockCustomers.find((c) => c.id === id || c.customerCode === id);
      return found || null;
    }

    try {
      const raw = await apiClient(`/api/v1/customers/${id}/`);
      return mapBackendCustomerToFrontend(raw);
    } catch (error) {
      if (error?.code === "API_UNAVAILABLE") {
        return mockCustomers.find((c) => c.id === id || c.customerCode === id) || null;
      }
      throw formatCustomerApiError(error);
    }
  },

  /**
   * Thêm mới khách hàng
   */
  async createCustomer(customerData) {
    if (USE_MOCK) {
      const newObj = {
        ...customerData,
        id: customerData.customerCode || `KH${Date.now()}`,
        vehicles: customerData.vehicles || [],
      };
      return newObj;
    }

    try {
      const payload = mapFrontendCustomerToBackend(customerData);
      const res = await apiClient("/api/v1/customers/", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      return mapBackendCustomerToFrontend(res);
    } catch (error) {
      if (error?.code === "API_UNAVAILABLE") {
        return {
          ...customerData,
          id: customerData.customerCode || `KH${Date.now()}`,
          vehicles: customerData.vehicles || [],
        };
      }
      throw formatCustomerApiError(error);
    }
  },

  /**
   * Cập nhật thông tin khách hàng
   */
  async updateCustomer(id, customerData) {
    if (USE_MOCK) {
      return {
        ...customerData,
        id,
      };
    }

    try {
      const payload = mapFrontendCustomerToBackend(customerData);
      const res = await apiClient(`/api/v1/customers/${id}/`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      return mapBackendCustomerToFrontend(res);
    } catch (error) {
      if (error?.code === "API_UNAVAILABLE") {
        return {
          ...customerData,
          id,
        };
      }
      throw formatCustomerApiError(error);
    }
  },

  /**
   * Xóa khách hàng
   */
  async deleteCustomer(id) {
    if (USE_MOCK) {
      return true;
    }

    try {
      return await apiClient(`/api/v1/customers/${id}/`, {
        method: "DELETE",
      });
    } catch (error) {
      if (error?.code === "API_UNAVAILABLE") {
        return true;
      }
      throw formatCustomerApiError(error);
    }
  },
};
