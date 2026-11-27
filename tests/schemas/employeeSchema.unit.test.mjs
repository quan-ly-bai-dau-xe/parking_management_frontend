import test, { after } from "node:test";
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
import { createVisualAuditor } from "../helpers/testVisualReporter.mjs";

const auditor = createVisualAuditor("EmployeeSchema & Payload Transformation Matrix", { after });

test("EMP-SCHEMA-01: resolvePositionId maps roles and ids deterministically", () => {
  auditor.verify("resolvePositionId: id số 1", 1, resolvePositionId(1), 1);
  auditor.verify("resolvePositionId: id chuỗi '3'", "3", resolvePositionId("3"), 3);
  auditor.verify("resolvePositionId: 'Quản lý' -> 1", { role: "Quản lý" }, resolvePositionId(undefined, "Quản lý"), 1);
  auditor.verify("resolvePositionId: 'ql' -> 1", { role: "ql" }, resolvePositionId(undefined, "ql"), 1);
  auditor.verify("resolvePositionId: 'Nhân viên vận hành' -> 2", { role: "Nhân viên vận hành" }, resolvePositionId(undefined, "Nhân viên vận hành"), 2);
  auditor.verify("resolvePositionId: 'nvvh' -> 2", { role: "nvvh" }, resolvePositionId(undefined, "nvvh"), 2);
  auditor.verify("resolvePositionId: 'Nhân viên thu ngân' -> 3", { role: "Nhân viên thu ngân" }, resolvePositionId(undefined, "Nhân viên thu ngân"), 3);
  auditor.verify("resolvePositionId: 'nvtn' -> 3", { role: "nvtn" }, resolvePositionId(undefined, "nvtn"), 3);
  auditor.verify("resolvePositionId: 'Kỹ thuật viên' -> 4", { role: "Kỹ thuật viên" }, resolvePositionId(undefined, "Kỹ thuật viên"), 4);
  auditor.verify("resolvePositionId: 'ktv' -> 4", { role: "ktv" }, resolvePositionId(undefined, "ktv"), 4);
  auditor.verify("resolvePositionId: undefined -> default 2", undefined, resolvePositionId(undefined, undefined), DEFAULT_POSITION_ID);
  auditor.verify("resolvePositionId: 'UnknownRole' -> default 2", "UnknownRole", resolvePositionId(undefined, "UnknownRole"), DEFAULT_POSITION_ID);
});

test("EMP-SCHEMA-02: normalizeEmployeeStatus normalizes various status inputs", () => {
  auditor.verify("normalizeStatus: 'active' -> ACTIVE", "active", normalizeEmployeeStatus("active"), EMPLOYEE_STATUS.ACTIVE);
  auditor.verify("normalizeStatus: 'ACTIVE' -> ACTIVE", "ACTIVE", normalizeEmployeeStatus("ACTIVE"), EMPLOYEE_STATUS.ACTIVE);
  auditor.verify("normalizeStatus: 'inactive' -> INACTIVE", "inactive", normalizeEmployeeStatus("inactive"), EMPLOYEE_STATUS.INACTIVE);
  auditor.verify("normalizeStatus: 'INACTIVE' -> INACTIVE", "INACTIVE", normalizeEmployeeStatus("INACTIVE"), EMPLOYEE_STATUS.INACTIVE);
  auditor.verify("normalizeStatus: 'Khóa' -> INACTIVE", "Khóa", normalizeEmployeeStatus("Khóa"), EMPLOYEE_STATUS.INACTIVE);
  auditor.verify("normalizeStatus: null -> ACTIVE", null, normalizeEmployeeStatus(null), EMPLOYEE_STATUS.ACTIVE);
  auditor.verify("normalizeStatus: undefined -> ACTIVE", undefined, normalizeEmployeeStatus(undefined), EMPLOYEE_STATUS.ACTIVE);
});

test("EMP-SCHEMA-03: resolveAddress formats address from explicit address or area/city", () => {
  const addrFull = { address: "123 Lê Duẩn", area: "Hải Châu", city: "Đà Nẵng" };
  auditor.verify("resolveAddress: address tường minh ưu tiên", addrFull, resolveAddress(addrFull), "123 Lê Duẩn");

  const addrAreaCity = { area: "Hải Châu", city: "Đà Nẵng" };
  auditor.verify("resolveAddress: ghép area + city", addrAreaCity, resolveAddress(addrAreaCity), "Hải Châu, Đà Nẵng");

  const addrArea = { area: "Hải Châu" };
  auditor.verify("resolveAddress: chỉ có area", addrArea, resolveAddress(addrArea), "Hải Châu");

  const addrCity = { city: "Đà Nẵng" };
  auditor.verify("resolveAddress: chỉ có city", addrCity, resolveAddress(addrCity), "Đà Nẵng");

  auditor.verify("resolveAddress: object rỗng -> undefined", {}, resolveAddress({}), undefined);
  auditor.verify("resolveAddress: undefined -> undefined", undefined, resolveAddress(undefined), undefined);
});

test("EMP-SCHEMA-04: createEmployeePayloadSchema transforms valid minimal employee payload", () => {
  const input = {
    name: "  Nguyễn Văn An  ",
    email: "  an.nguyen@smartparking.vn  ",
    phone: "  0901234567  ",
  };

  const payload = createEmployeePayloadSchema.parse(input);

  auditor.verify("createPayload: trim full_name", input.name, payload.full_name, "Nguyễn Văn An");
  auditor.verify("createPayload: trim email", input.email, payload.email, "an.nguyen@smartparking.vn");
  auditor.verify("createPayload: trim phone", input.phone, payload.phone, "0901234567");
  auditor.verify("createPayload: position_id mặc định", undefined, payload.position_id, DEFAULT_POSITION_ID);
  auditor.verify("createPayload: password ban đầu mặc định", undefined, payload.password, DEFAULT_INITIAL_PASSWORD);
  auditor.verify("createPayload: status mặc định", undefined, payload.status, EMPLOYEE_STATUS.ACTIVE);
  auditor.verify("createPayload: address rỗng -> undefined", undefined, payload.address, undefined);
  auditor.verify("createPayload: code rỗng -> undefined", undefined, payload.code, undefined);
});

test("EMP-SCHEMA-05: createEmployeePayloadSchema transforms full employee input with DD/MM/YYYY birthday, role and address", () => {
  const input = {
    full_name: "Lê Thị Thu Hà",
    email: "thuha@smartpark.vn",
    phone: "0935 111 222",
    role: "Nhân viên thu ngân",
    birthday: "20/10/1995",
    area: "Quận 1",
    city: "Hồ Chí Minh",
    code: "NV003",
    gender: "FEMALE",
    identity_card_number: "048195000123",
    status: "active",
    password: "CustomPassword123@",
    province_id: 79,
    district_id: 1,
    ward_id: 5,
  };

  const payload = createEmployeePayloadSchema.parse(input);

  auditor.verify("createPayload full: full_name", input.full_name, payload.full_name, "Lê Thị Thu Hà");
  auditor.verify("createPayload full: email", input.email, payload.email, "thuha@smartpark.vn");
  auditor.verify("createPayload full: phone", input.phone, payload.phone, "0935 111 222");
  auditor.verify("createPayload full: role 'Nhân viên thu ngân' -> position 3", input.role, payload.position_id, 3);
  auditor.verify("createPayload full: birthday DD/MM/YYYY -> ISO YYYY-MM-DD", input.birthday, payload.date_of_birth, "1995-10-20");
  auditor.verify("createPayload full: ghép address area + city", { area: input.area, city: input.city }, payload.address, "Quận 1, Hồ Chí Minh");
  auditor.verify("createPayload full: code", input.code, payload.code, "NV003");
  auditor.verify("createPayload full: gender", input.gender, payload.gender, "FEMALE");
  auditor.verify("createPayload full: identity_card_number (CCCD)", input.identity_card_number, payload.identity_card_number, "048195000123");
  auditor.verify("createPayload full: status 'active' -> 'ACTIVE'", input.status, payload.status, "ACTIVE");
  auditor.verify("createPayload full: password", input.password, payload.password, "CustomPassword123@");
  auditor.verify("createPayload full: province_id number", input.province_id, payload.province_id, 79);
  auditor.verify("createPayload full: district_id number", input.district_id, payload.district_id, 1);
  auditor.verify("createPayload full: ward_id number", input.ward_id, payload.ward_id, 5);

  // Thử nghiệm thêm với date_of_birth dạng ISO đã chuẩn sẵn
  const inputIso = {
    name: "Phan Văn C",
    email: "pvc@smartpark.vn",
    phone: "0909998877",
    date_of_birth: "1990-05-15",
  };
  const payloadIso = createEmployeePayloadSchema.parse(inputIso);
  auditor.verify("createPayload: date_of_birth ISO chuẩn giữ nguyên", inputIso.date_of_birth, payloadIso.date_of_birth, "1990-05-15");
});

test("EMP-SCHEMA-06: createEmployeePayloadSchema throws error on missing or invalid required fields", () => {
  // 1. Missing name & full_name
  auditor.verifyThrows(
    "createPayload error: Thiếu họ tên",
    { name: "   ", email: "test@smartpark.vn", phone: "0901234567" },
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
  auditor.verifyThrows(
    "createPayload error: Email không đúng định dạng",
    { name: "Nguyễn Văn A", email: "not-an-email", phone: "0901234567" },
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
  auditor.verifyThrows(
    "createPayload error: Email rỗng",
    { name: "Nguyễn Văn A", email: "  ", phone: "0901234567" },
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
  auditor.verifyThrows(
    "createPayload error: Phone rỗng",
    { name: "Nguyễn Văn A", email: "vana@smartpark.vn", phone: "  " },
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
  auditor.verifyThrows(
    "createPayload error: Phone sai định dạng chữ",
    { name: "Nguyễn Văn A", email: "vana@smartpark.vn", phone: "abc-xyz" },
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
  auditor.verify("updatePayload: cập nhật tên", "Trần Quốc Bảo (Cập nhật)", update1.full_name, "Trần Quốc Bảo (Cập nhật)");
  auditor.verify("updatePayload: row_version mặc định 1", undefined, update1.row_version, 1);
  auditor.verify("updatePayload: email không truyền -> undefined", undefined, update1.email, undefined);
  auditor.verify("updatePayload: phone không truyền -> undefined", undefined, update1.phone, undefined);

  // Update status and rowVersion
  const update2 = updateEmployeePayloadSchema.parse({
    status: "inactive",
    rowVersion: 5,
  });
  auditor.verify("updatePayload: status 'inactive' -> 'INACTIVE'", "inactive", update2.status, "INACTIVE");
  auditor.verify("updatePayload: row_version từ rowVersion", 5, update2.row_version, 5);

  // Update role with mapping
  const update3 = updateEmployeePayloadSchema.parse({
    role: "Quản lý",
  });
  auditor.verify("updatePayload: role 'Quản lý' -> position_id 1", "Quản lý", update3.position_id, 1);

  // Update address from area/city
  const update4 = updateEmployeePayloadSchema.parse({
    area: "Cẩm Lệ",
    city: "Đà Nẵng",
  });
  auditor.verify("updatePayload: địa chỉ từ area/city", { area: "Cẩm Lệ", city: "Đà Nẵng" }, update4.address, "Cẩm Lệ, Đà Nẵng");

  // Update birthday DD/MM/YYYY
  const update5 = updateEmployeePayloadSchema.parse({
    birthday: "12/04/1992",
  });
  auditor.verify("updatePayload: birthday DD/MM/YYYY -> ISO", "12/04/1992", update5.date_of_birth, "1992-04-12");
});

test("EMP-SCHEMA-08: updateEmployeePayloadSchema rejects invalid email or phone when provided", () => {
  auditor.verifyThrows(
    "updatePayload error: Email sai định dạng",
    { email: "invalid-email-address" },
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

  auditor.verifyThrows(
    "updatePayload error: Phone quá ngắn",
    { phone: "123" },
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
