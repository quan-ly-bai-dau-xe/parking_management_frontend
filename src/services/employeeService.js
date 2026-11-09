import { apiClient } from "./apiClient";

const DEFAULT_POSITIONS = [
  { id: 1, code: "QL", name: "Quản lý" },
  { id: 2, code: "NVVH", name: "Nhân viên vận hành" },
  { id: 3, code: "NVTN", name: "Nhân viên thu ngân" },
  { id: 4, code: "KTV", name: "Kỹ thuật viên" },
];

export const INITIAL_EMPLOYEES = [
  {
    id: "NV001",
    backendId: 1,
    name: "Nguyễn Minh Anh",
    email: "minhanh@smartpark.vn",
    phone: "0905 123 456",
    role: "Quản lý",
    roleCode: "QL",
    area: "Hải Châu",
    city: "Đà Nẵng",
    status: "active",
    tone: "indigo",
    rowVersion: 1,
  },
  {
    id: "NV002",
    backendId: 2,
    name: "Trần Quốc Bảo",
    email: "quocbao@smartpark.vn",
    phone: "0912 345 678",
    role: "Nhân viên vận hành",
    roleCode: "NVVH",
    area: "Thanh Khê",
    city: "Đà Nẵng",
    status: "active",
    tone: "blue",
    rowVersion: 1,
  },
  {
    id: "NV003",
    backendId: 3,
    name: "Lê Thị Thu Hà",
    email: "thuha@smartpark.vn",
    phone: "0935 111 222",
    role: "Nhân viên thu ngân",
    roleCode: "NVTN",
    area: "Quận 1",
    city: "Hồ Chí Minh",
    status: "active",
    tone: "pink",
    rowVersion: 1,
  },
  {
    id: "NV004",
    backendId: 4,
    name: "Phạm Hoàng Nam",
    email: "hoangnam@smartpark.vn",
    phone: "0901 222 333",
    role: "Kỹ thuật viên",
    roleCode: "KTV",
    area: "Cầu Giấy",
    city: "Hà Nội",
    status: "inactive",
    tone: "amber",
    rowVersion: 1,
  },
  {
    id: "NV005",
    backendId: 5,
    name: "Võ Ngọc Linh",
    email: "ngoclinh@smartpark.vn",
    phone: "0988 333 444",
    role: "Nhân viên vận hành",
    roleCode: "NVVH",
    area: "Sơn Trà",
    city: "Đà Nẵng",
    status: "active",
    tone: "emerald",
    rowVersion: 1,
  },
  {
    id: "NV006",
    backendId: 6,
    name: "Đặng Gia Huy",
    email: "giahuy@smartpark.vn",
    phone: "0977 444 555",
    role: "Nhân viên thu ngân",
    roleCode: "NVTN",
    area: "Liên Chiểu",
    city: "Đà Nẵng",
    status: "active",
    tone: "cyan",
    rowVersion: 1,
  },
  {
    id: "NV007",
    backendId: 7,
    name: "Bùi Thanh Tùng",
    email: "thanhtung@smartpark.vn",
    phone: "0966 555 666",
    role: "Kỹ thuật viên",
    roleCode: "KTV",
    area: "Thủ Đức",
    city: "Hồ Chí Minh",
    status: "active",
    tone: "violet",
    rowVersion: 1,
  },
  {
    id: "NV008",
    backendId: 8,
    name: "Phan Mỹ Duyên",
    email: "myduyen@smartpark.vn",
    phone: "0944 666 777",
    role: "Nhân viên vận hành",
    roleCode: "NVVH",
    area: "Ngũ Hành Sơn",
    city: "Đà Nẵng",
    status: "active",
    tone: "rose",
    rowVersion: 1,
  },
];

const TONES = ["indigo", "blue", "pink", "amber", "emerald", "cyan", "violet", "rose"];

function getToneForId(id) {
  const num = typeof id === "number" ? id : parseInt(String(id).replace(/\D/g, "") || "0", 10);
  return TONES[num % TONES.length] || "blue";
}

export function mapBackendEmployeeToFrontend(emp) {
  if (!emp) return null;
  const roleName = emp.position?.name || emp.role || "Nhân viên vận hành";
  const areaName = emp.area?.district_name || emp.area || "—";
  const cityName = emp.area?.province_name || emp.city || "Đà Nẵng";
  const isActive = (emp.status || "").toUpperCase() === "ACTIVE" || emp.status === "active";

  return {
    id: emp.code || `NV${String(emp.id).padStart(3, "0")}`,
    backendId: emp.id,
    name: emp.full_name || emp.name || "—",
    email: emp.email || "—",
    phone: emp.phone || "—",
    role: roleName,
    roleId: emp.position?.id,
    roleCode: emp.position?.code,
    area: areaName,
    city: cityName,
    status: isActive ? "active" : "inactive",
    statusDisplay: emp.status_display || (isActive ? "Đang hoạt động" : "Không hoạt động"),
    tone: emp.tone || getToneForId(emp.id),
    rowVersion: emp.row_version || 1,
    rawBackend: emp,
  };
}

export const employeeService = {
  /**
   * Lấy danh mục chức vụ (Positions)
   */
  async getPositions() {
    try {
      const response = await apiClient("/api/v1/positions/");
      return Array.isArray(response) ? response : DEFAULT_POSITIONS;
    } catch (error) {
      console.warn("[employeeService] getPositions fallback default:", error.message);
      return DEFAULT_POSITIONS;
    }
  },

  /**
   * Lấy 4 thẻ chỉ số KPI tổng quan nhân viên
   */
  async getSummary() {
    try {
      return await apiClient("/api/v1/employees/summary/");
    } catch (error) {
      console.warn("[employeeService] getSummary fallback:", error.message);
      return {
        total_employees: INITIAL_EMPLOYEES.length,
        active_employees: INITIAL_EMPLOYEES.filter((e) => e.status === "active").length,
        inactive_employees: INITIAL_EMPLOYEES.filter((e) => e.status === "inactive").length,
        total_positions: DEFAULT_POSITIONS.length,
      };
    }
  },

  /**
   * Lấy danh sách nhân viên có phân trang & tìm kiếm
   */
  async getEmployees(params = {}) {
    try {
      const searchParams = new URLSearchParams();
      if (params.search) searchParams.append("q", params.search);
      if (params.role && params.role !== "all") searchParams.append("position", params.role);
      if (params.status && params.status !== "all") {
        searchParams.append("status", params.status === "active" ? "ACTIVE" : "INACTIVE");
      }
      if (params.page) searchParams.append("page", params.page.toString());
      if (params.page_size) searchParams.append("page_size", params.page_size.toString());

      const queryStr = searchParams.toString() ? `?${searchParams.toString()}` : "";
      const response = await apiClient(`/api/v1/employees/${queryStr}`);

      const results = Array.isArray(response) ? response : response.results || [];
      return {
        total: response.count ?? results.length,
        totalPages: response.total_pages ?? 1,
        currentPage: response.current_page ?? 1,
        data: results.map(mapBackendEmployeeToFrontend),
      };
    } catch (error) {
      console.warn("[employeeService] getEmployees fallback mock:", error.message);
      return {
        total: INITIAL_EMPLOYEES.length,
        totalPages: 1,
        currentPage: 1,
        data: [...INITIAL_EMPLOYEES],
      };
    }
  },

  /**
   * Thêm mới nhân viên
   */
  async createEmployee(data, positions = DEFAULT_POSITIONS) {
    try {
      let positionId = data.position_id;
      if (!positionId && data.role) {
        const match = positions.find(
          (p) => p.name === data.role || p.code === data.role || String(p.id) === String(data.role)
        );
        positionId = match ? match.id : 2;
      }

      const payload = {
        full_name: (data.name || data.full_name).trim(),
        email: data.email.trim(),
        phone: data.phone.trim(),
        position_id: positionId || 2,
        password: data.password || "SmartPark@2026",
        address: data.area ? `${data.area}, ${data.city}` : undefined,
        status: data.status === "inactive" || data.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
      };

      const res = await apiClient("/api/v1/employees/", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      return mapBackendEmployeeToFrontend(res);
    } catch (error) {
      if (error?.code === "API_UNAVAILABLE") {
        return {
          ...data,
          id: data.id || `NV${Date.now() % 1000}`,
          status: data.status || "active",
          tone: data.tone || "blue",
        };
      }
      throw error;
    }
  },

  /**
   * Cập nhật thông tin nhân viên (có OCC row_version)
   */
  async updateEmployee(id, data, positions = DEFAULT_POSITIONS) {
    try {
      const targetId = data.backendId || id;
      const payload = {
        full_name: (data.name || data.full_name).trim(),
        email: data.email.trim(),
        phone: data.phone.trim(),
        row_version: data.rowVersion || 1,
      };

      if (data.role) {
        const match = positions.find(
          (p) => p.name === data.role || p.code === data.role || String(p.id) === String(data.role)
        );
        if (match) payload.position_id = match.id;
      }

      if (data.status) {
        payload.status = data.status === "active" ? "ACTIVE" : "INACTIVE";
      }

      const res = await apiClient(`/api/v1/employees/${targetId}/`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      return mapBackendEmployeeToFrontend(res);
    } catch (error) {
      if (error?.code === "API_UNAVAILABLE") {
        return { ...data, id };
      }
      throw error;
    }
  },

  /**
   * Xóa mềm nhân viên (DEL-01)
   */
  async deleteEmployee(id, rowVersion = 1) {
    try {
      const targetId = typeof id === "number" ? id : parseInt(String(id).replace(/\D/g, "") || "0", 10);
      return await apiClient(`/api/v1/employees/${targetId}/?row_version=${rowVersion}`, {
        method: "DELETE",
      });
    } catch (error) {
      if (error?.code === "API_UNAVAILABLE") {
        return true;
      }
      throw error;
    }
  },
};

