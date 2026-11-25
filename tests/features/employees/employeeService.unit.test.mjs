import test from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import {
  employeeService,
  mapEmployeeItem,
  getToneForEmployee,
  resetMockEmployees,
} from "#src/services/employeeService.js";
import { INITIAL_EMPLOYEES, MOCK_POSITIONS } from "#src/mocks/employeeData.js";

test("EMP-01: getToneForEmployee returns deterministic valid tone colors", () => {
  const tone1 = getToneForEmployee("NV001");
  const tone2 = getToneForEmployee("NV001");
  assert.equal(tone1, tone2, "Same ID should produce same tone");

  const defaultTone = getToneForEmployee(null);
  assert.equal(defaultTone, "blue");

  const validTones = [
    "indigo",
    "blue",
    "pink",
    "amber",
    "emerald",
    "cyan",
    "violet",
    "rose",
  ];
  assert.ok(validTones.includes(tone1), "Tone should be in allowed list");
});

test("EMP-02: mapEmployeeItem transforms backend employee response correctly", () => {
  const backendEmployee = {
    id: 101,
    code: "NV101",
    full_name: "Nguyễn Văn An",
    position: { id: 2, code: "NVVH", name: "Nhân viên vận hành" },
    phone: "0901234567",
    email: "vanan@smartpark.vn",
    area: {
      district_name: "Hải Châu",
      province_name: "Đà Nẵng",
    },
    status: "ACTIVE",
    status_display: "Đang hoạt động",
    row_version: 3,
  };

  const mapped = mapEmployeeItem(backendEmployee, 0);

  assert.equal(mapped.id, 101);
  assert.equal(mapped.numericId, 101);
  assert.equal(mapped.code, "NV101");
  assert.equal(mapped.name, "Nguyễn Văn An");
  assert.equal(mapped.role, "Nhân viên vận hành");
  assert.equal(mapped.positionId, 2);
  assert.equal(mapped.positionCode, "NVVH");
  assert.equal(mapped.phone, "0901234567");
  assert.equal(mapped.email, "vanan@smartpark.vn");
  assert.equal(mapped.area, "Hải Châu");
  assert.equal(mapped.city, "Đà Nẵng");
  assert.equal(mapped.status, "active");
  assert.equal(mapped.statusDisplay, "Đang hoạt động");
  assert.equal(mapped.rowVersion, 3);
  assert.ok(mapped.tone, "Tone should be populated");
});

test("EMP-03: mapEmployeeItem transforms mock employee item correctly", () => {
  const mockEmp = INITIAL_EMPLOYEES[0];
  const mapped = mapEmployeeItem(mockEmp, 0);

  assert.equal(mapped.id, "NV001");
  assert.equal(mapped.code, "NV001");
  assert.equal(mapped.name, "Nguyễn Minh Anh");
  assert.equal(mapped.role, "Quản lý");
  assert.equal(mapped.status, "active");
  assert.equal(mapped.area, "Hải Châu");
  assert.equal(mapped.city, "Đà Nẵng");
  assert.equal(mapped.tone, "indigo");
});

test("EMP-04: employeeService throws error without silent fallback when mock is disabled and backend is unreachable", async () => {
  // Khi mockConfig có employees: false, không được nuốt lỗi mà phải ném lỗi ra ngoài
  await assert.rejects(
    async () => {
      await employeeService.getPositions();
    },
    (err) => {
      assert.ok(err, "Must throw connection / api error");
      return true;
    },
    "getPositions must reject when backend is unreachable without silent fallback"
  );

  await assert.rejects(
    async () => {
      await employeeService.getEmployeeSummary();
    },
    (err) => {
      assert.ok(err, "Must throw connection / api error");
      return true;
    },
    "getEmployeeSummary must reject when backend is unreachable without silent fallback"
  );

  await assert.rejects(
    async () => {
      await employeeService.getEmployees();
    },
    (err) => {
      assert.ok(err, "Must throw connection / api error");
      return true;
    },
    "getEmployees must reject when backend is unreachable without silent fallback to mock"
  );

  await assert.rejects(
    async () => {
      await employeeService.getEmployeeById(1);
    },
    (err) => {
      assert.ok(err, "Must throw connection / api error");
      return true;
    },
    "getEmployeeById must reject when backend is unreachable without silent fallback"
  );

  await assert.rejects(
    async () => {
      await employeeService.createEmployee({
        name: "Test Employee",
        email: "test@smartpark.vn",
        phone: "0900000000",
      });
    },
    (err) => {
      assert.ok(err, "Must throw connection / api error");
      return true;
    },
    "createEmployee must reject when backend is unreachable without silent fallback"
  );

  await assert.rejects(
    async () => {
      await employeeService.updateEmployee(1, {
        name: "Updated Employee",
      });
    },
    (err) => {
      assert.ok(err, "Must throw connection / api error");
      return true;
    },
    "updateEmployee must reject when backend is unreachable without silent fallback"
  );

  await assert.rejects(
    async () => {
      await employeeService.deleteEmployee(1);
    },
    (err) => {
      assert.ok(err, "Must throw connection / api error");
      return true;
    },
    "deleteEmployee must reject when backend is unreachable without silent fallback"
  );
});

test("EMP-05: employeeService executes mock CRUD flow when mock is explicitly enabled", async () => {
  // Bật mock tường minh qua localStorage override (isMockEnabled("employees") === true)
  globalThis.window = {
    localStorage: {
      getItem: (key) => (key === "MOCK_EMPLOYEES" ? "true" : null),
    },
  };

  try {
    resetMockEmployees();

    // 1. Get Positions
    const positions = await employeeService.getPositions();
    assert.equal(positions.length, MOCK_POSITIONS.length);
    assert.equal(positions[0].name, "Quản lý");

    // 2. Get Employee Summary
    const summary = await employeeService.getEmployeeSummary();
    assert.equal(summary.total_employees, 8);
    assert.equal(summary.active_employees, 7);
    assert.equal(summary.inactive_employees, 1);
    assert.equal(summary.total_positions, 4);

    // 3. Get all Employees
    const allEmployees = await employeeService.getEmployees();
    assert.equal(allEmployees.length, 8);

    // 4. Search by query
    const searchResult = await employeeService.getEmployees({ q: "Minh Anh" });
    assert.equal(searchResult.length, 1);
    assert.equal(searchResult[0].code, "NV001");

    // 5. Filter by position
    const managers = await employeeService.getEmployees({ position: "Quản lý" });
    assert.equal(managers.length, 1);
    assert.equal(managers[0].role, "Quản lý");

    // 6. Filter by status
    const inactives = await employeeService.getEmployees({ status: "inactive" });
    assert.equal(inactives.length, 1);
    assert.equal(inactives[0].code, "NV004");

    // 7. Get by ID
    const emp001 = await employeeService.getEmployeeById("NV001");
    assert.equal(emp001.name, "Nguyễn Minh Anh");

    // 8. Create new employee
    const newEmp = await employeeService.createEmployee({
      name: "Trịnh Bá Hưng",
      email: "bahung@smartpark.vn",
      phone: "0933 999 888",
      role: "Kỹ thuật viên",
      area: "Ngũ Hành Sơn",
      city: "Đà Nẵng",
    });
    assert.ok(newEmp.code.startsWith("NV"), "New code should start with NV");
    assert.equal(newEmp.name, "Trịnh Bá Hưng");

    const afterCreate = await employeeService.getEmployees();
    assert.equal(afterCreate.length, 9, "Total employees should now be 9");

    // 9. Update employee
    const updated = await employeeService.updateEmployee(newEmp.id, {
      name: "Trịnh Bá Hưng (Updated)",
      role: "Nhân viên vận hành",
    });
    assert.equal(updated.name, "Trịnh Bá Hưng (Updated)");
    assert.equal(updated.role, "Nhân viên vận hành");

    // 10. Toggle status
    const toggled = await employeeService.toggleEmployeeStatus(
      newEmp.id,
      "active",
      updated.rowVersion
    );
    assert.equal(toggled.status, "inactive");

    // 11. Delete employee
    const deleteRes = await employeeService.deleteEmployee(newEmp.id);
    assert.equal(deleteRes.detail, "Xóa thành công");

    const afterDelete = await employeeService.getEmployees();
    assert.equal(afterDelete.length, 8, "Total employees should return to 8");
  } finally {
    delete globalThis.window;
    resetMockEmployees();
  }
});

test("EMP-06: createEmployee enforces Zod schema validation and rejects invalid payloads", async () => {
  // 1. Missing name
  await assert.rejects(
    async () => {
      await employeeService.createEmployee({
        name: "",
        email: "test@smartpark.vn",
        phone: "0901234567",
      });
    },
    (err) => {
      assert.ok(err instanceof z.ZodError);
      const hasNameError = err.issues.some((i) => i.path.includes("full_name"));
      assert.ok(hasNameError, "Must contain full_name validation issue");
      return true;
    },
    "createEmployee must reject empty name with ZodError"
  );

  // 2. Invalid email format
  await assert.rejects(
    async () => {
      await employeeService.createEmployee({
        name: "Nguyễn Văn Test",
        email: "invalid-email-address",
        phone: "0901234567",
      });
    },
    (err) => {
      assert.ok(err instanceof z.ZodError);
      const hasEmailError = err.issues.some((i) => i.path.includes("email"));
      assert.ok(hasEmailError, "Must contain email validation issue");
      return true;
    },
    "createEmployee must reject invalid email with ZodError"
  );

  // 3. Invalid phone format
  await assert.rejects(
    async () => {
      await employeeService.createEmployee({
        name: "Nguyễn Văn Test",
        email: "test@smartpark.vn",
        phone: "invalid-phone",
      });
    },
    (err) => {
      assert.ok(err instanceof z.ZodError);
      const hasPhoneError = err.issues.some((i) => i.path.includes("phone"));
      assert.ok(hasPhoneError, "Must contain phone validation issue");
      return true;
    },
    "createEmployee must reject invalid phone with ZodError"
  );
});

test("EMP-07: updateEmployee enforces Zod schema validation and rejects invalid payloads", async () => {
  // Invalid email format during update
  await assert.rejects(
    async () => {
      await employeeService.updateEmployee("NV001", {
        email: "not-an-email",
      });
    },
    (err) => {
      assert.ok(err instanceof z.ZodError);
      const hasEmailError = err.issues.some((i) => i.path.includes("email"));
      assert.ok(hasEmailError, "Must contain email validation issue");
      return true;
    },
    "updateEmployee must reject invalid email with ZodError"
  );

  // Invalid phone format during update
  await assert.rejects(
    async () => {
      await employeeService.updateEmployee("NV001", {
        phone: "abc12345",
      });
    },
    (err) => {
      assert.ok(err instanceof z.ZodError);
      const hasPhoneError = err.issues.some((i) => i.path.includes("phone"));
      assert.ok(hasPhoneError, "Must contain phone validation issue");
      return true;
    },
    "updateEmployee must reject invalid phone with ZodError"
  );
});

