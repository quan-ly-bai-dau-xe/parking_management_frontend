import test from "node:test";
import assert from "node:assert/strict";
import {
  USER_ROLES,
  ROLE_DISPLAY_NAMES,
  checkIsManager,
} from "#src/constants/roleConstants.js";

/**
 * Suite kiểm thử đơn vị cho chức năng phân quyền checkIsManager (RBAC).
 * Mục tiêu: Bám sát chuẩn Backend Account.ROLE_CHOICES & apps.core.permissions.IsManager,
 * loại bỏ hoàn toàn các chuỗi đoán mò (fuzzy/ảo giác).
 */

test("RBAC-01: Backend canonical role 'MANAGER' and 'ADMIN' return true", () => {
  assert.equal(checkIsManager("MANAGER"), true, "Chuỗi 'MANAGER' chuẩn Backend phải là Manager");
  assert.equal(checkIsManager("manager"), true, "lowercase 'manager' chuẩn hóa thành công");
  assert.equal(checkIsManager("ADMIN"), true, "Chuỗi 'ADMIN' chuẩn Backend");
  assert.equal(checkIsManager(USER_ROLES.MANAGER), true, "Hằng số USER_ROLES.MANAGER");
});

test("RBAC-02: User object payload từ API /api/v1/auth/me/ được parse chính xác", () => {
  // Payload thực tế từ Backend Django /api/v1/auth/me/
  const backendManagerUser = {
    id: 1,
    email: "manager@parking.com",
    phone: "0912345678",
    role: "MANAGER",
    full_name: "Nguyễn Văn Quản Lý",
  };
  assert.equal(checkIsManager(backendManagerUser), true, "User object từ backend phải nhận diện đúng");

  // Fallback an toàn nếu serializer bọc key khác
  assert.equal(checkIsManager({ role_name: "MANAGER" }), true);
  assert.equal(checkIsManager({ roleName: "MANAGER" }), true);
  assert.equal(checkIsManager({ role_code: "MANAGER" }), true);
});

test("RBAC-03: Nhận diện nhãn hiển thị tiếng Việt chính thức ('Quản lý')", () => {
  assert.equal(checkIsManager(ROLE_DISPLAY_NAMES[USER_ROLES.MANAGER]), true, "Nhãn 'Quản lý' chính thức");
  assert.equal(checkIsManager("Quản lý"), true, "Chuỗi 'Quản lý'");
  assert.equal(checkIsManager("quản lý"), true, "Chuỗi 'quản lý' thường");
  assert.equal(checkIsManager("  Quản lý  "), true, "Chuỗi 'Quản lý' có khoảng trắng thừa");
});

test("RBAC-04: Non-manager roles (EMPLOYEE, CUSTOMER, etc.) BẮT BUỘC trả về false", () => {
  assert.equal(checkIsManager("EMPLOYEE"), false, "EMPLOYEE không được là Manager");
  assert.equal(checkIsManager("CUSTOMER"), false, "CUSTOMER không được là Manager");
  assert.equal(checkIsManager("Nhân viên"), false, "Nhân viên phải là false");
  assert.equal(checkIsManager("Nhân viên vận hành"), false, "Nhân viên vận hành phải là false");
  assert.equal(checkIsManager("Nhân viên thu ngân"), false, "Nhân viên thu ngân phải là false");
  assert.equal(checkIsManager("Kỹ thuật viên"), false, "Kỹ thuật viên phải là false");
  assert.equal(checkIsManager("Bảo vệ trực cổng"), false, "Bảo vệ trực cổng phải là false");

  const backendEmployeeUser = {
    id: 2,
    email: "employee@parking.com",
    role: "EMPLOYEE",
  };
  assert.equal(checkIsManager(backendEmployeeUser), false, "User object EMPLOYEE phải trả về false");
});

test("RBAC-05: Adversarial, Fuzzy & Falsy Inputs không bao giờ gây false-positive", () => {
  // Không cho phép đoán mò fuzzy (vd: 'quan ly' không dấu hoặc chức vụ chứa từ quản lý vu vơ)
  assert.equal(checkIsManager("quan ly"), false, "Không cho phép chuỗi không dấu đoán mò");
  assert.equal(checkIsManager("Trưởng phòng Quản lý"), false, "Không substring bừa bãi");

  assert.equal(checkIsManager(null), false, "null phải trả về false");
  assert.equal(checkIsManager(undefined), false, "undefined phải trả về false");
  assert.equal(checkIsManager(""), false, "Chuỗi rỗng phải trả về false");
  assert.equal(checkIsManager(0), false, "Số 0 phải trả về false");
  assert.equal(checkIsManager({}), false, "Object rỗng không có role phải trả về false");
  assert.equal(checkIsManager([]), false, "Mảng rỗng phải trả về false");
  assert.equal(checkIsManager({ role: null }), false, "Role là null phải trả về false");
  assert.equal(checkIsManager("Chưa xác định"), false, "'Chưa xác định' phải trả về false");
});
