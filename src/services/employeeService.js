/**
 * employeeService.js
 * Service quản lý nhân viên (Employee Management).
 *
 * Tích hợp API Backend Django REST (/api/v1/employees/, /api/v1/positions/, /api/v1/employees/summary/)
 * Tuân thủ quy tắc mockConfig.js:
 * - Khi mock tắt (isMockEnabled("employees") === false): Gọi 100% API Backend thật,
 *   TUYỆT ĐỐI KHÔNG fallback ngầm khi gặp lỗi mạng / 4xx / 5xx.
 * - Khi mock bật (isMockEnabled("employees") === true): Sử dụng dữ liệu mock từ employeeData.js.
 */

import { apiClient } from "./apiClient.js";
import {
  createEmployeePayloadSchema,
  updateEmployeePayloadSchema,
} from "../schemas/employeeSchema.js";

const AVATAR_TONES = [
  "indigo",
  "blue",
  "pink",
  "amber",
  "emerald",
  "cyan",
  "violet",
  "rose",
];

const DEFAULT_AVATAR_TONE = "blue";

/**
 * Tạo tone màu avatar đồng nhất dựa trên id hoặc tên
 */
export function getToneForEmployee(idOrName) {
  if (!idOrName) return DEFAULT_AVATAR_TONE;
  let hash = 0;
  const str = String(idOrName);
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return AVATAR_TONES[Math.abs(hash) % AVATAR_TONES.length];
}

/**
 * Map dữ liệu nhân viên từ Backend / Mock sang model chuẩn của Frontend
 */
export function mapEmployeeItem(item, index = 0) {
  if (!item) return null;

  const rawId = item.id;
  const code =
    item.code ||
    (typeof rawId === "string" ? rawId : `NV${String(index + 1).padStart(3, "0")}`);
  const name = item.full_name || item.name || "";

  // Chức vụ / Position
  let role = "Nhân viên";
  let positionId = undefined;
  let positionCode = undefined;

  if (item.position && typeof item.position === "object") {
    role = item.position.name || item.position.code || role;
    positionId = item.position.id;
    positionCode = item.position.code;
  } else if (typeof item.position === "string") {
    role = item.position;
  } else if (item.role) {
    role = item.role;
  }

  if (item.position_id) {
    positionId = item.position_id;
  }

  // Trạng thái chuẩn hóa
  const rawStatus = String(item.status || "active").toLowerCase();
  const status = rawStatus === "inactive" ? "inactive" : "active";

  // Khu vực hành chính
  const area =
    item.area && typeof item.area === "object"
      ? item.area.district_name || ""
      : item.area || "";
  const city =
    item.area && typeof item.area === "object"
      ? item.area.province_name || ""
      : item.city || "";

  // Màu đại diện Avatar
  const tone = item.tone || getToneForEmployee(rawId || name || index);

  return {
    id: rawId !== undefined ? rawId : code,
    numericId: typeof rawId === "number" ? rawId : undefined,
    code,
    name,
    email: item.email || "",
    phone: item.phone || "",
    role,
    positionId,
    positionCode,
    area,
    city,
    status,
    rawStatus: item.status || (status === "active" ? "ACTIVE" : "INACTIVE"),
    statusDisplay:
      item.status_display ||
      (status === "active" ? "Đang hoạt động" : "Không hoạt động"),
    rowVersion: item.row_version ?? item.rowVersion ?? 1,
    tone,
  };
}

export const employeeService = {
  /**
   * Lấy danh sách nhân viên
   * @param {Object} [params] - Tham số lọc (q, position, status, ordering, page, page_size)
   */
  async getEmployees(params = {}) {
    // GỌI API THẬT - TUYỆT ĐỐI KHÔNG FALLBACK NGẦM
    const queryParams = new URLSearchParams();
    if (params.q) queryParams.set("q", params.q);
    if (params.search) queryParams.set("q", params.search);
    if (params.name) queryParams.set("name", params.name);
    if (params.code) queryParams.set("code", params.code);
    if (params.position && params.position !== "all") {
      queryParams.set("position", params.position);
    }
    if (params.status && params.status !== "all") {
      queryParams.set("status", params.status.toUpperCase());
    }
    if (params.ordering) queryParams.set("ordering", params.ordering);
    if (params.page) queryParams.set("page", String(params.page));
    if (params.page_size) queryParams.set("page_size", String(params.page_size));

    const queryString = queryParams.toString();
    const endpoint = `/api/v1/employees/${queryString ? `?${queryString}` : ""}`;
    const response = await apiClient(endpoint);

    const list = Array.isArray(response)
      ? response
      : Array.isArray(response?.results)
      ? response.results
      : [];

    return list.map((item, idx) => mapEmployeeItem(item, idx));
  },

  /**
   * Lấy 4 chỉ số thống kê KPI nhân viên (Single Source of Truth)
   */
  async getEmployeeSummary() {
    // GỌI API THẬT - TUYỆT ĐỐI KHÔNG FALLBACK NGẦM
    return await apiClient("/api/v1/employees/summary/");
  },

  /**
   * Lấy danh mục chức vụ công việc
   */
  async getPositions() {
    // GỌI API THẬT - TUYỆT ĐỐI KHÔNG FALLBACK NGẦM
    return await apiClient("/api/v1/positions/");
  },

  /**
   * Lấy chi tiết hồ sơ một nhân viên theo ID
   */
  async getEmployeeById(id) {
    // GỌI API THẬT - TUYỆT ĐỐI KHÔNG FALLBACK NGẦM
    const response = await apiClient(`/api/v1/employees/${id}/`);
    return mapEmployeeItem(response);
  },

  /**
   * Thêm mới nhân viên và tài khoản nguyên tử
   */
  async createEmployee(employeeData) {
    const payload = createEmployeePayloadSchema.parse(employeeData);

    // GỌI API THẬT - TUYỆT ĐỐI KHÔNG FALLBACK NGẦM
    const response = await apiClient("/api/v1/employees/", {
      method: "POST",
      data: payload,
    });

    return mapEmployeeItem(response);
  },

  /**
   * Cập nhật thông tin nhân viên (PATCH với OCC row_version)
   */
  async updateEmployee(id, employeeData) {
    const payload = updateEmployeePayloadSchema.parse(employeeData);

    // GỌI API THẬT - TUYỆT ĐỐI KHÔNG FALLBACK NGẦM
    const response = await apiClient(`/api/v1/employees/${id}/`, {
      method: "PATCH",
      data: payload,
    });

    return mapEmployeeItem(response);
  },

  /**
   * Xóa mềm nhân viên và tài khoản liên kết (DEL-01)
   */
  async deleteEmployee(id) {
    // GỌI API THẬT - TUYỆT ĐỐI KHÔNG FALLBACK NGẦM
    return await apiClient(`/api/v1/employees/${id}/`, {
      method: "DELETE",
    });
  },

  /**
   * Kích hoạt hoặc Khóa trạng thái nhân viên
   */
  async toggleEmployeeStatus(id, currentStatus, rowVersion = 1) {
    const nextStatus = currentStatus === "active" ? "inactive" : "active";
    return await this.updateEmployee(id, {
      status: nextStatus,
      row_version: rowVersion,
    });
  },
};
