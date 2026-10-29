import { apiClient } from "./apiClient";
import { mockCustomers } from "../mocks/customerData";

// Biến điều khiển mock data:
// - Mặc định là DÙNG BACKEND THẬT.
// - Chỉ dùng mock khi khai báo rõ ràng VITE_USE_MOCK="true".
// - Khi VITE_USE_MOCK="false" hoặc không đặt, hệ thống hoàn toàn gọi backend và KHÔNG fallback về mockdata.
console.log(import.meta.env.VITE_USE_MOCK);
const USE_MOCK =
  import.meta.env.VITE_USE_MOCK?.trim().toLowerCase() === "true";
  

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
   * Lấy danh sách khách hàng từ backend
   */
  async getCustomers() {
    if (USE_MOCK) {
      return [...mockCustomers];
    }

    try {
      const response = await apiClient("/api/v1/customers/");
      return Array.isArray(response) ? response : response?.results || [];
    } catch (error) {
      throw formatCustomerApiError(error);
    }
  },

  /**
   * Thêm mới khách hàng
   */
  async createCustomer(customerData) {
    if (USE_MOCK) {
      return {
        ...customerData,
        id: customerData.customerCode || `KH${Date.now()}`,
        vehicles: customerData.vehicles || [],
      };
    }

    try {
      return await apiClient("/api/v1/customers/", {
        method: "POST",
        body: JSON.stringify(customerData),
      });
    } catch (error) {
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
      return await apiClient(`/api/v1/customers/${id}/`, {
        method: "PUT",
        body: JSON.stringify(customerData),
      });
    } catch (error) {
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
      throw formatCustomerApiError(error);
    }
  },
};
