/**
 * Role Constants & Utilities
 * Tập trung hóa định nghĩa vai trò và kiểm tra phân quyền (RBAC) trên toàn Frontend
 * Đồng bộ tuyệt đối với Backend: apps.core.permissions.IsManager & Account.ROLE_CHOICES
 */

export const USER_ROLES = Object.freeze({
  MANAGER: "MANAGER",
  EMPLOYEE: "EMPLOYEE",
  CUSTOMER: "CUSTOMER",
  ADMIN: "ADMIN",
});

/**
 * Danh sách chuỗi nhận diện vai trò Quản lý (chuẩn hóa chữ thường, không dấu)
 */
const MANAGER_ROLE_IDENTIFIERS = Object.freeze([
  "manager",
  "quan ly",
  "quản lý",
  "admin",
  "administrator",
]);

/**
 * Pure function kiểm tra xem một role hoặc user có quyền Quản lý (Manager/Admin) hay không.
 *
 * @param {string|object|null|undefined} roleOrUser - Tên vai trò (chuỗi) hoặc đối tượng user có thuộc tính role
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

  const cleanRole = rawRole
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();

  // Kiểm tra vai trò chính xác hoặc chứa từ khóa quản trị
  return (
    MANAGER_ROLE_IDENTIFIERS.some((ident) => {
      const cleanIdent = ident
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
      return cleanRole === cleanIdent || cleanRole.includes(cleanIdent);
    }) || rawRole.toUpperCase() === USER_ROLES.MANAGER
  );
}
