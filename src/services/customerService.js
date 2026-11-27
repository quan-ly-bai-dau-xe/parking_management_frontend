import { apiClient } from "./apiClient";
import { CustomerListItemSchema, CustomerDetailSchema } from "../schemas/customerSchema";
import { STATUS_MAP_CODE_TO_DISPLAY } from "../constants/customerConstants";
import { formatDateToDisplay } from "../utils/dateUtils";
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
  const birthday = formatDateToDisplay(item.birthday || item.date_of_birth || "");
  const statusDisplay =
    item.status_display || STATUS_MAP_CODE_TO_DISPLAY[item.status] || item.status || "Đang hoạt động";
  const vehicles = (item.vehicles || []).map(mapCustomerVehicle);
  const vehiclesCount = item.vehicles_count ?? vehicles.length;
  const hasActiveTicket = Boolean(item.has_active_ticket ?? item.hasActiveTicket);
  const rawWalletBalance = item.wallet_balance ?? item.walletBalance ?? 0;
  const walletBalance = Number.isFinite(Number(rawWalletBalance)) ? Number(rawWalletBalance) : 0;
  const walletStatus = item.wallet_status ?? item.walletStatus ?? "ACTIVE";

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
    walletBalance,
    walletStatus,
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

export const customerService = {
  /**
   * Lấy danh sách khách hàng từ backend và tự động đồng bộ đầy đủ
   * thông tin Ngày sinh (date_of_birth), Email, Giới tính (gender) từ API chi tiết.
   */
  async getCustomers(params = {}) {
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
          birthday: formatDateToDisplay(detail.date_of_birth || detail.birthday) || cust.birthday,
          email: detail.email || cust.email,
          gender: detail.gender || cust.gender,
          vehicles: detailVehicles,
          vehiclesCount: totalVehiclesCount,
          walletBalance: Number.isFinite(Number(detail.wallet_balance ?? cust.walletBalance))
            ? Number(detail.wallet_balance ?? cust.walletBalance)
            : cust.walletBalance,
          walletStatus: detail.wallet_status || cust.walletStatus,
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
    const response = await apiClient(`/api/v1/customers/${id}/`);
    const valid = CustomerDetailSchema.parse(response);
    return valid;
  },

  /**
   * Thêm mới khách hàng với payload được chuẩn hóa cho backend Django
   */
  async createCustomer(customerData) {
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
    return await apiClient(`/api/v1/customers/${id}/`, {
      method: "DELETE",
    });
  },
};
