/**
 * Role Constants & Utilities
 * Tập trung hóa định nghĩa vai trò và kiểm tra phân quyền (RBAC) trên toàn Frontend.
 *
 * KHÓA CHẶN KIẾN TRÚC:
 * Backend Database (apps.accounts.models.Account.ROLE_CHOICES) và DRF Permission Guard
 * (apps.core.permissions.IsManager) quy định DUY NHẤT:
 *   - Mã vai trò lưu trong DB & gửi qua API là UPPERCASE: 'MANAGER', 'EMPLOYEE', 'CUSTOMER'.
 *   - 'Quản lý' là verbose_name (nhãn hiển thị tiếng Việt trên UI / Django Admin).
 */

export const USER_ROLES = Object.freeze({
  MANAGER: "MANAGER",
  EMPLOYEE: "EMPLOYEE",
  CUSTOMER: "CUSTOMER",
  ADMIN: "ADMIN",
});

/**
 * Các mã vai trò chuẩn có đặc quyền quản trị cấp cao
 */
const CANONICAL_MANAGER_ROLES = Object.freeze([
  USER_ROLES.MANAGER,
  USER_ROLES.ADMIN,
]);

/**
 * Nhãn hiển thị tiếng Việt tương ứng cho giao diện
 */
export const ROLE_DISPLAY_NAMES = Object.freeze({
  [USER_ROLES.MANAGER]: "Quản lý",
  [USER_ROLES.EMPLOYEE]: "Nhân viên",
  [USER_ROLES.CUSTOMER]: "Khách hàng",
  [USER_ROLES.ADMIN]: "Quản trị viên",
});

/**
 * Danh sách vị trí / chức danh nhân viên trong hệ thống
 * Chuẩn hóa để tránh magic strings trong phân hệ Quản lý nhân viên
 */
export const EMPLOYEE_POSITIONS = Object.freeze([
  { code: "QL", title: "Quản lý", accountRole: USER_ROLES.MANAGER },
  { code: "NVVH", title: "Nhân viên vận hành", accountRole: USER_ROLES.EMPLOYEE },
  { code: "NVTN", title: "Nhân viên thu ngân", accountRole: USER_ROLES.EMPLOYEE },
  { code: "KTV", title: "Kỹ thuật viên", accountRole: USER_ROLES.EMPLOYEE },
]);

export const EMPLOYEE_ROLE_TITLES = Object.freeze(
  EMPLOYEE_POSITIONS.map((pos) => pos.title)
);

/**
 * Pure function kiểm tra xem một role hoặc user có quyền Quản lý hay không.
 * Bám sát chặt chẽ Backend Contract (user.role == 'MANAGER').
 *
 * @param {string|object|null|undefined} roleOrUser - Mã vai trò hoặc đối tượng user
 * @returns {boolean} true nếu có quyền Quản lý
 */
export function checkIsManager(roleOrUser) {
  if (!roleOrUser) return false;

  const rawRole =
    typeof roleOrUser === "object"
      ? roleOrUser.role ||
        roleOrUser.role_name ||
        roleOrUser.roleName ||
        roleOrUser.role_code ||
        ""
      : roleOrUser;

  if (typeof rawRole !== "string") return false;

  const trimmedRole = rawRole.trim();
  const upperRole = trimmedRole.toUpperCase();

  // 1. Kiểm tra mã định danh chuẩn từ Backend API (Ưu tiên số 1)
  if (CANONICAL_MANAGER_ROLES.includes(upperRole)) {
    return true;
  }

  // 2. Dự phòng an toàn nếu dữ liệu đầu vào là nhãn hiển thị tiếng Việt ('Quản lý')
  if (trimmedRole === ROLE_DISPLAY_NAMES[USER_ROLES.MANAGER] || trimmedRole.toLowerCase() === "quản lý") {
    return true;
  }

  return false;
}
