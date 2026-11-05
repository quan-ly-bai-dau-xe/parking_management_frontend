import { apiClient } from "./apiClient";
import { mockCustomers } from "../mocks/customerData";
import { CustomerListItemSchema, CustomerDetailSchema } from "../schemas/customerSchema";
import { STATUS_MAP_CODE_TO_DISPLAY } from "../constants/customerConstants";
import { formatIsoDateToDisplay } from "../utils/formatDateTime";
import { mapCustomerFormToBackendPayload } from "../utils/customer/customerFormMapper";

/**
 * Mapper functions: Chuyển đổi dữ liệu vehicle
 */
function mapCustomerVehicle(item) {
  const rawType = item.vehicleType || item.vehicle_type;
  const typeName =
    typeof rawType === "object"
      ? (rawType?.name || rawType?.code)
      : (item.vehicle_type_name || (typeof rawType === "string" ? rawType : null));

  return {
    id: String(item.id),
    licensePlate: item.licensePlate || item.license_plate || "",
    status: item.status || "",
    vehicleType: typeName || "Ô tô",
  };
}

/**
 * Mapper functions: Chuyển đổi dữ liệu contract sang model chuẩn của giao diện.
 */
function mapCustomerListItem(item) {
  const code = item.customerCode || item.code || String(item.id);
  const name = item.name || item.full_name || "";
  const idNumber = item.idNumber || item.identity_card_number || "";
  const birthday = formatIsoDateToDisplay(item.birthday || item.date_of_birth || "");
  const statusDisplay =
    item.status_display || STATUS_MAP_CODE_TO_DISPLAY[item.status] || item.status || "Đang hoạt động";
  const vehicles = (item.vehicles || []).map(mapCustomerVehicle);
  const vehiclesCount = item.vehicles_count ?? vehicles.length;
  const hasActiveTicket = Boolean(item.has_active_ticket ?? item.hasActiveTicket);

  return {
    id: String(item.id),
    customerCode: code,
    name,
    phone: item.phone ?? "",
    idNumber,
    birthday,
    email: item.email ?? "",
    gender: item.gender ?? "",
    status: statusDisplay,
    statusCode: item.status || "ACTIVE",
    packageType: item.packageType || "Vé tháng",
    vehiclesCount,
    vehicles,
    hasActiveTicket,
    // Điều kiện xóa an toàn theo quy tắc DEL-02:
    // Không có xe đang hoạt động và không có vé xe hiệu lực
    canDelete: vehiclesCount === 0 && !hasActiveTicket,
    rowVersion: item.row_version ?? item.rowVersion ?? 1,
    isAnonymized: Boolean(item.is_anonymized ?? item.isAnonymized),
    isTestSample: Boolean(item.is_test_sample ?? item.isTestSample ?? (code && String(code).startsWith("TEST-"))),
  };
}

function validateAndMapCustomers(rawData) {
  const list = Array.isArray(rawData)
    ? rawData
    : Array.isArray(rawData?.results)
      ? rawData.results
      : null;

  if (!list) {
    throw new Error("Phản hồi từ máy chủ không đúng định dạng danh sách khách hàng");
  }

  return list.map((item) => {
    const validItem = CustomerListItemSchema.parse(item);
    return mapCustomerListItem(validItem);
  });
}

// Biến điều khiển mock data:
// - Mặc định là DÙNG BACKEND THẬT.
// - Chỉ dùng mock khi khai báo rõ ràng VITE_USE_MOCK="true".
// - Khi VITE_USE_MOCK="false" hoặc không đặt, hệ thống hoàn toàn gọi backend và KHÔNG fallback về mockdata.
const USE_MOCK =
  import.meta.env.VITE_USE_MOCK?.trim().toLowerCase() === "true";

export const customerService = {
  /**
   * Lấy danh sách khách hàng từ backend và tự động đồng bộ đầy đủ
   * thông tin Ngày sinh (date_of_birth), Email, Giới tính (gender) từ API chi tiết.
   */
  async getCustomers(params = {}) {
    if (USE_MOCK) {
      return validateAndMapCustomers([...mockCustomers]);
    }

    const query = new URLSearchParams(params).toString();
    const url = `/api/v1/customers/${query ? `?${query}` : ""}`;
    const response = await apiClient(url);
    const mappedList = validateAndMapCustomers(response);

    // Backend CustomerListSerializer chỉ trả summary tối ưu (id, code, full_name, phone, identity_card_number, ...).
    // Thực hiện fetch chi tiết song song (Promise.allSettled) cho các trường còn thiếu (Ngày sinh, Email, Giới tính, Vehicles).
    const detailPromises = mappedList.map(async (cust) => {
      if (cust.birthday && cust.email && cust.gender && cust.vehicles.length > 0) {
        return cust;
      }
      try {
        const detail = await customerService.getCustomerById(cust.id);
        const detailVehicles = Array.isArray(detail.vehicles) && detail.vehicles.length > 0
          ? detail.vehicles.map(mapCustomerVehicle)
          : cust.vehicles;
        const totalVehiclesCount = detailVehicles.length || cust.vehiclesCount;

        return {
          ...cust,
          birthday: formatIsoDateToDisplay(detail.date_of_birth || detail.birthday) || cust.birthday,
          email: detail.email || cust.email,
          gender: detail.gender || cust.gender,
          vehicles: detailVehicles,
          vehiclesCount: totalVehiclesCount,
          rowVersion: detail.row_version || cust.rowVersion,
          canDelete: totalVehiclesCount === 0 && !cust.hasActiveTicket,
        };
      } catch (err) {
        console.warn(`Không thể lấy chi tiết khách hàng ${cust.id}:`, err);
        return cust;
      }
    });

    return await Promise.all(detailPromises);
  },

  /**
   * Lấy chi tiết thông tin 1 khách hàng từ GET /api/v1/customers/{id}/
   */
  async getCustomerById(id) {
    if (USE_MOCK) {
      const found = mockCustomers.find((c) => String(c.id) === String(id));
      if (!found) throw new Error("Không tìm thấy khách hàng");
      return mapCustomerListItem(found);
    }

    const response = await apiClient(`/api/v1/customers/${id}/`);
    const valid = CustomerDetailSchema.parse(response);
    return valid;
  },

  /**
   * Thêm mới khách hàng với payload được chuẩn hóa cho backend Django
   */
  async createCustomer(customerData) {
    if (USE_MOCK) {
      const newMockItem = {
        ...customerData,
        id: customerData.customerCode || `KH${Date.now()}`,
        vehicles: customerData.vehicles || [],
        vehiclesCount: 0,
        hasActiveTicket: false,
        canDelete: true,
      };
      mockCustomers.unshift(newMockItem);
      return mapCustomerListItem(newMockItem);
    }

    const backendPayload = mapCustomerFormToBackendPayload(customerData);
    const createdResponse = await apiClient("/api/v1/customers/", {
      method: "POST",
      body: JSON.stringify(backendPayload),
    });

    return mapCustomerListItem({
      ...createdResponse,
      packageType: customerData.packageType || "Vé tháng",
    });
  },

  /**
   * Cập nhật thông tin khách hàng
   */
  async updateCustomer(id, customerData) {
    if (USE_MOCK) {
      const index = mockCustomers.findIndex((c) => String(c.id) === String(id));
      if (index !== -1) {
        mockCustomers[index] = { ...mockCustomers[index], ...customerData };
      }
      return {
        ...customerData,
        id,
      };
    }

    const backendPayload = mapCustomerFormToBackendPayload(customerData);
    if (customerData.rowVersion) {
      backendPayload.row_version = customerData.rowVersion;
    }

    return await apiClient(`/api/v1/customers/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(backendPayload),
    });
  },

  /**
   * Xóa khách hàng với bảo vệ kiểm tra DEL-02
   */
  async deleteCustomer(id) {
    if (USE_MOCK) {
      const index = mockCustomers.findIndex((c) => String(c.id) === String(id));
      if (index !== -1) {
        mockCustomers.splice(index, 1);
      }
      return true;
    }

    return await apiClient(`/api/v1/customers/${id}/`, {
      method: "DELETE",
    });
  },
};
