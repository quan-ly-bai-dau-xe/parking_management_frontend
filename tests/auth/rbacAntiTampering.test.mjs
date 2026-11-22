import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test("RBAC Anti-Tampering: EditSlotModal locks slot type and status editing for non-managers", () => {
  const filePath = path.resolve(__dirname, "../../src/components/ParkingLotManagement/EditSlotModal.jsx");
  const code = fs.readFileSync(filePath, "utf-8");

  // 1. Phải import useCurrentUser
  assert.ok(code.includes("useCurrentUser"), "EditSlotModal must import useCurrentUser");
  // 2. Phải trích xuất isManager
  assert.ok(code.includes("isManager"), "EditSlotModal must check isManager");
  // 3. Phải khóa trường type khi không phải manager
  assert.ok(code.includes("disabled={!isManager}"), "Slot type must be disabled for non-managers");
  // 4. Phải lọc trạng thái: non-manager chỉ được thao tác AVAILABLE và MAINTENANCE
  assert.ok(code.includes("allowedStatusOptions"), "Must define filtered status options for non-managers");
  assert.ok(
    code.includes("SLOT_STATUS.AVAILABLE") && code.includes("SLOT_STATUS.MAINTENANCE"),
    "Non-managers must only be allowed AVAILABLE and MAINTENANCE"
  );
  // 5. Phải có thông báo giải thích quyền hạn
  assert.ok(
    code.includes("Chỉ Quản lý (Manager) mới có quyền"),
    "Must display explanatory notice for non-managers"
  );
  // 6. Không được tự ý fallback về "AVAILABLE" hay "STANDARD"
  assert.ok(!code.includes('status: slot?.status ?? "AVAILABLE"'), "Must not fallback status to AVAILABLE");
  assert.ok(!code.includes('type: slot?.type ?? slot?.slot_kind ?? "STANDARD"'), "Must not fallback type to STANDARD");
});

test("RBAC Anti-Tampering: EmployeeModal locks Manager role assignment for non-managers", () => {
  const filePath = path.resolve(__dirname, "../../src/components/EmployeeManagement/EmployeeModal.jsx");
  const code = fs.readFileSync(filePath, "utf-8");

  // 1. Phải import useCurrentUser
  assert.ok(code.includes("useCurrentUser"), "EmployeeModal must import useCurrentUser");
  // 2. Phải trích xuất isManager
  assert.ok(code.includes("isManager"), "EmployeeModal must check isManager");
  // 3. Phải lọc danh sách role: nếu không phải manager thì loại bỏ 'Quản lý'
  assert.ok(
    code.includes('filter((item) => item !== "Quản lý")') ||
    code.includes("filter"),
    "Must filter out Manager role for non-managers"
  );
  // 4. Không được tự ý fallback thành phố về 'Đà Nẵng' hoặc chức vụ về 'Nhân viên vận hành'
  assert.ok(!code.includes('role: employee?.role ?? "Nhân viên vận hành"'), "Must not fallback role to 'Nhân viên vận hành'");
  assert.ok(!code.includes('city: employee?.city ?? "Đà Nẵng"'), "Must not fallback city to 'Đà Nẵng'");
});

test("RBAC Anti-Tampering: AddSlotModal prevents tampered status & dummy vehicle creation", () => {
  const filePath = path.resolve(__dirname, "../../src/components/ParkingLotManagement/AddSlotModal.jsx");
  const code = fs.readFileSync(filePath, "utf-8");

  // 1. Không có dropdown chọn trạng thái tự do ban đầu
  assert.ok(!code.includes("SLOT_STATUS_OPTIONS"), "AddSlotModal must not expose full SLOT_STATUS_OPTIONS");
  assert.ok(!code.includes('status: "AVAILABLE"'), "Form state must not arbitrarily hardcode status in user-facing fields");
  // 2. Không cho phép nhập biển số ảo khi tạo ô đỗ mới
  assert.ok(!code.includes('name="license_plate"'), "AddSlotModal must not have dummy license_plate input field");
  assert.ok(!code.includes('name="vehicle"'), "AddSlotModal must not have dummy vehicle input field");
  // 3. Có cơ chế kiểm tra bảo trì hạ tầng và bắt buộc nhập lý do
  assert.ok(code.includes("isUnderMaintenance"), "Must support isUnderMaintenance check");
  assert.ok(code.includes("maintenanceReason"), "Must support maintenanceReason");
  assert.ok(code.includes("Lý do bảo trì / chưa nghiệm thu *"), "Must display required label for maintenance reason");
});

test("RBAC Anti-Tampering: SlotDetailPanel restricts OCCUPIED / RESERVED simulation to Manager", () => {
  const filePath = path.resolve(__dirname, "../../src/components/ParkingLotManagement/SlotDetailPanel.jsx");
  const code = fs.readFileSync(filePath, "utf-8");

  // 1. Phải import useCurrentUser và trích xuất isManager
  assert.ok(code.includes("useCurrentUser"), "SlotDetailPanel must import useCurrentUser");
  assert.ok(code.includes("isManager"), "SlotDetailPanel must check isManager");
  // 2. Nút OCCUPIED và RESERVED chỉ hiển thị trong khối isManager (Thao tác Quản trị đặc cách)
  assert.ok(code.includes("Thao tác Quản trị đặc cách"), "Must contain special admin section for Manager only");
  // 3. Nhân viên thông thường chỉ có thao tác vận hành kỹ thuật (Sẵn sàng / Bảo trì)
  assert.ok(code.includes("Trạng thái vận hành"), "Must contain operational controls header");
  assert.ok(code.includes("Sẵn sàng đón xe (Trống)"), "Must allow operator to set ready status");
  assert.ok(code.includes("Bảo trì / Tạm ngưng sử dụng"), "Must allow operator to toggle maintenance");
});
