import test from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import {
  createEmployeePayloadSchema,
  updateEmployeePayloadSchema,
  DEFAULT_INITIAL_PASSWORD,
  DEFAULT_POSITION_ID,
  EMPLOYEE_STATUS,
  POSITION_ROLE_MAP,
  resolvePositionId,
  normalizeEmployeeStatus,
  resolveAddress,
} from "#src/schemas/employeeSchema.js";

test("EMP-SCHEMA-01: resolvePositionId maps roles and ids deterministically", () => {
  assert.equal(resolvePositionId(1), 1);
  assert.equal(resolvePositionId("3"), 3);
  assert.equal(resolvePositionId(undefined, "Quản lý"), 1);
  assert.equal(resolvePositionId(undefined, "ql"), 1);
  assert.equal(resolvePositionId(undefined, "Nhân viên vận hành"), 2);
  assert.equal(resolvePositionId(undefined, "nvvh"), 2);
  assert.equal(resolvePositionId(undefined, "Nhân viên thu ngân"), 3);
  assert.equal(resolvePositionId(undefined, "nvtn"), 3);
  assert.equal(resolvePositionId(undefined, "Kỹ thuật viên"), 4);
  assert.equal(resolvePositionId(undefined, "ktv"), 4);
  assert.equal(resolvePositionId(undefined, undefined), DEFAULT_POSITION_ID);
  assert.equal(resolvePositionId(undefined, "UnknownRole"), DEFAULT_POSITION_ID);
});

test("EMP-SCHEMA-02: normalizeEmployeeStatus normalizes various status inputs", () => {
  assert.equal(normalizeEmployeeStatus("active"), EMPLOYEE_STATUS.ACTIVE);
  assert.equal(normalizeEmployeeStatus("ACTIVE"), EMPLOYEE_STATUS.ACTIVE);
  assert.equal(normalizeEmployeeStatus("inactive"), EMPLOYEE_STATUS.INACTIVE);
  assert.equal(normalizeEmployeeStatus("INACTIVE"), EMPLOYEE_STATUS.INACTIVE);
  assert.equal(normalizeEmployeeStatus("Khóa"), EMPLOYEE_STATUS.INACTIVE);
  assert.equal(normalizeEmployeeStatus(null), EMPLOYEE_STATUS.ACTIVE);
  assert.equal(normalizeEmployeeStatus(undefined), EMPLOYEE_STATUS.ACTIVE);
});

test("EMP-SCHEMA-03: resolveAddress formats address from explicit address or area/city", () => {
  assert.equal(
    resolveAddress({ address: "123 Lê Duẩn", area: "Hải Châu", city: "Đà Nẵng" }),
    "123 Lê Duẩn"
  );
  assert.equal(
    resolveAddress({ area: "Hải Châu", city: "Đà Nẵng" }),
    "Hải Châu, Đà Nẵng"
  );
  assert.equal(resolveAddress({ area: "Hải Châu" }), "Hải Châu");
  assert.equal(resolveAddress({ city: "Đà Nẵng" }), "Đà Nẵng");
  assert.equal(resolveAddress({}), undefined);
  assert.equal(resolveAddress(undefined), undefined);
});

test("EMP-SCHEMA-04: createEmployeePayloadSchema transforms valid minimal employee payload", () => {
  const input = {
    name: "  Nguyễn Văn An  ",
    email: "  an.nguyen@smartparking.vn  ",
    phone: "  0901234567  ",
  };

  const payload = createEmployeePayloadSchema.parse(input);

  assert.equal(payload.full_name, "Nguyễn Văn An");
  assert.equal(payload.email, "an.nguyen@smartparking.vn");
  assert.equal(payload.phone, "0901234567");
  assert.equal(payload.position_id, DEFAULT_POSITION_ID);
  assert.equal(payload.password, DEFAULT_INITIAL_PASSWORD);
  assert.equal(payload.status, EMPLOYEE_STATUS.ACTIVE);
  assert.equal(payload.address, undefined);
  assert.equal(payload.code, undefined);
});

test("EMP-SCHEMA-05: createEmployeePayloadSchema transforms full employee input with role mapping and address", () => {
  const input = {
    full_name: "Lê Thị Thu Hà",
    email: "thuha@smartpark.vn",
    phone: "0935 111 222",
    role: "Nhân viên thu ngân",
    area: "Quận 1",
    city: "Hồ Chí Minh",
    code: "NV003",
    date_of_birth: "1995-10-20",
    gender: "FEMALE",
    identity_card_number: "048195000123",
    status: "active",
    password: "CustomPassword123@",
    province_id: 79,
    district_id: 1,
    ward_id: 5,
  };

  const payload = createEmployeePayloadSchema.parse(input);

  assert.equal(payload.full_name, "Lê Thị Thu Hà");
  assert.equal(payload.email, "thuha@smartpark.vn");
  assert.equal(payload.phone, "0935 111 222");
  assert.equal(payload.position_id, 3);
  assert.equal(payload.address, "Quận 1, Hồ Chí Minh");
  assert.equal(payload.code, "NV003");
  assert.equal(payload.date_of_birth, "1995-10-20");
  assert.equal(payload.gender, "FEMALE");
  assert.equal(payload.identity_card_number, "048195000123");
  assert.equal(payload.status, "ACTIVE");
  assert.equal(payload.password, "CustomPassword123@");
  assert.equal(payload.province_id, 79);
  assert.equal(payload.district_id, 1);
  assert.equal(payload.ward_id, 5);
});

test("EMP-SCHEMA-06: createEmployeePayloadSchema throws error on missing or invalid required fields", () => {
  // 1. Missing name & full_name
  assert.throws(
    () => {
      createEmployeePayloadSchema.parse({
        name: "   ",
        email: "test@smartpark.vn",
        phone: "0901234567",
      });
    },
    (err) => {
      assert.ok(err instanceof z.ZodError);
      const issue = err.issues.find((i) => i.path.includes("full_name"));
      assert.ok(issue, "Should report error for full_name");
      assert.equal(issue.message, "Họ và tên không được để trống");
      return true;
    }
  );

  // 2. Invalid email
  assert.throws(
    () => {
      createEmployeePayloadSchema.parse({
        name: "Nguyễn Văn A",
        email: "not-an-email",
        phone: "0901234567",
      });
    },
    (err) => {
      assert.ok(err instanceof z.ZodError);
      const issue = err.issues.find((i) => i.path.includes("email"));
      assert.ok(issue, "Should report error for email");
      assert.equal(issue.message, "Email không đúng định dạng");
      return true;
    }
  );

  // 3. Missing email
  assert.throws(
    () => {
      createEmployeePayloadSchema.parse({
        name: "Nguyễn Văn A",
        email: "  ",
        phone: "0901234567",
      });
    },
    (err) => {
      assert.ok(err instanceof z.ZodError);
      const issue = err.issues.find((i) => i.path.includes("email"));
      assert.ok(issue, "Should report missing email");
      assert.equal(issue.message, "Email không được để trống");
      return true;
    }
  );

  // 4. Missing phone
  assert.throws(
    () => {
      createEmployeePayloadSchema.parse({
        name: "Nguyễn Văn A",
        email: "vana@smartpark.vn",
        phone: "  ",
      });
    },
    (err) => {
      assert.ok(err instanceof z.ZodError);
      const issue = err.issues.find((i) => i.path.includes("phone"));
      assert.ok(issue, "Should report missing phone");
      assert.equal(issue.message, "Số điện thoại không được để trống");
      return true;
    }
  );

  // 5. Invalid phone format
  assert.throws(
    () => {
      createEmployeePayloadSchema.parse({
        name: "Nguyễn Văn A",
        email: "vana@smartpark.vn",
        phone: "abc-xyz",
      });
    },
    (err) => {
      assert.ok(err instanceof z.ZodError);
      const issue = err.issues.find((i) => i.path.includes("phone"));
      assert.ok(issue, "Should report invalid phone format");
      assert.equal(issue.message, "Số điện thoại không đúng định dạng");
      return true;
    }
  );
});

test("EMP-SCHEMA-07: updateEmployeePayloadSchema parses partial updates correctly", () => {
  // Update name only
  const update1 = updateEmployeePayloadSchema.parse({
    name: "Trần Quốc Bảo (Cập nhật)",
  });
  assert.equal(update1.full_name, "Trần Quốc Bảo (Cập nhật)");
  assert.equal(update1.row_version, 1);
  assert.equal(update1.email, undefined);
  assert.equal(update1.phone, undefined);

  // Update status and rowVersion
  const update2 = updateEmployeePayloadSchema.parse({
    status: "inactive",
    rowVersion: 5,
  });
  assert.equal(update2.status, "INACTIVE");
  assert.equal(update2.row_version, 5);

  // Update role with mapping
  const update3 = updateEmployeePayloadSchema.parse({
    role: "Quản lý",
  });
  assert.equal(update3.position_id, 1);

  // Update address from area/city
  const update4 = updateEmployeePayloadSchema.parse({
    area: "Cẩm Lệ",
    city: "Đà Nẵng",
  });
  assert.equal(update4.address, "Cẩm Lệ, Đà Nẵng");
});

test("EMP-SCHEMA-08: updateEmployeePayloadSchema rejects invalid email or phone when provided", () => {
  assert.throws(
    () => {
      updateEmployeePayloadSchema.parse({
        email: "invalid-email-address",
      });
    },
    (err) => {
      assert.ok(err instanceof z.ZodError);
      const issue = err.issues.find((i) => i.path.includes("email"));
      assert.ok(issue);
      assert.equal(issue.message, "Email không đúng định dạng");
      return true;
    }
  );

  assert.throws(
    () => {
      updateEmployeePayloadSchema.parse({
        phone: "123",
      });
    },
    (err) => {
      assert.ok(err instanceof z.ZodError);
      const issue = err.issues.find((i) => i.path.includes("phone"));
      assert.ok(issue);
      assert.equal(issue.message, "Số điện thoại không đúng định dạng");
      return true;
    }
  );
});
