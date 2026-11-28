import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeSlotCode,
  isDuplicateSlotCode,
  createSlotSchema,
  updateSlotSchema,
  DUPLICATE_SLOT_CODE_MESSAGE,
} from "#src/schemas/parkingSlotSchema.js";

test("SLOT-GUARD-01: normalizeSlotCode trims and converts to UPPERCASE", () => {
  assert.equal(normalizeSlotCode("  a-01  "), "A-01");
  assert.equal(normalizeSlotCode("b2-zone-a "), "B2-ZONE-A");
  assert.equal(normalizeSlotCode("   c-99\t"), "C-99");
  assert.equal(normalizeSlotCode(""), "");
  assert.equal(normalizeSlotCode(null), "");
  assert.equal(normalizeSlotCode(undefined), "");
});

test("SLOT-GUARD-02: isDuplicateSlotCode detects exact match case-insensitively", () => {
  const existingSlots = [
    { id: "A-01", code: "A-01", label: "A-01", slotId: "A-01" },
    { id: "A-02", code: "A-02", label: "A-02", slotId: "A-02" },
    { id: 3, code: "B-03", label: "B-03", slotId: "B-03" },
  ];

  // Trùng mã hoa thường
  assert.equal(isDuplicateSlotCode("a-01", existingSlots), true);
  assert.equal(isDuplicateSlotCode("A-01", existingSlots), true);
  assert.equal(isDuplicateSlotCode("  A-02  ", existingSlots), true);
  assert.equal(isDuplicateSlotCode("b-03", existingSlots), true);

  // Mã mới không trùng
  assert.equal(isDuplicateSlotCode("A-03", existingSlots), false);
  assert.equal(isDuplicateSlotCode("B-04", existingSlots), false);
});

test("SLOT-GUARD-03: isDuplicateSlotCode ignores current record during update mode", () => {
  const existingSlots = [
    { id: "A-01", code: "A-01", label: "A-01", slotId: "A-01" },
    { id: "A-02", code: "A-02", label: "A-02", slotId: "A-02" },
  ];

  // Chỉnh sửa chính A-01 giữ nguyên mã A-01 -> hợp lệ (không tính là trùng)
  assert.equal(isDuplicateSlotCode("A-01", existingSlots, "A-01"), false);
  assert.equal(isDuplicateSlotCode("a-01", existingSlots, "A-01"), false);

  // Chỉnh sửa A-01 nhưng đổi thành A-02 -> bị phát hiện trùng với record khác
  assert.equal(isDuplicateSlotCode("A-02", existingSlots, "A-01"), true);
});

test("SLOT-GUARD-04: createSlotSchema rejects duplicate slot code with standard error message", () => {
  const existingSlots = [
    { id: "A-01", code: "A-01", label: "A-01" },
    { id: "A-02", code: "A-02", label: "A-02" },
  ];

  const schema = createSlotSchema(existingSlots);

  // Thử tạo trùng mã "a-01"
  const duplicateResult = schema.safeParse({
    floor: "B1",
    zone: "A",
    code: "a-01",
    type: "STANDARD",
    isUnderMaintenance: false,
  });

  assert.equal(duplicateResult.success, false);
  const codeIssue = duplicateResult.error.issues.find((i) => i.path.includes("code"));
  assert.ok(codeIssue, "Phải có lỗi ở trường code");
  assert.equal(codeIssue.message, DUPLICATE_SLOT_CODE_MESSAGE);

  // Thử tạo mã mới "A-03" -> Thành công
  const validResult = schema.safeParse({
    floor: "B1",
    zone: "A",
    code: "A-03",
    type: "STANDARD",
    isUnderMaintenance: false,
  });
  assert.equal(validResult.success, true);
});

test("SLOT-GUARD-05: createSlotSchema enforces maintenanceReason when isUnderMaintenance is true", () => {
  const schema = createSlotSchema([]);

  // isUnderMaintenance = true nhưng lý do trống -> phải báo lỗi
  const invalidMaint = schema.safeParse({
    floor: "B1",
    zone: "A",
    code: "A-99",
    type: "STANDARD",
    isUnderMaintenance: true,
    maintenanceReason: "   ",
  });
  assert.equal(invalidMaint.success, false);
  const maintIssue = invalidMaint.error.issues.find((i) => i.path.includes("maintenanceReason"));
  assert.ok(maintIssue);
  assert.equal(maintIssue.message, "Vui lòng nhập lý do bảo trì ô đỗ.");

  // isUnderMaintenance = true kèm lý do hợp lệ -> thành công
  const validMaint = schema.safeParse({
    floor: "B1",
    zone: "A",
    code: "A-99",
    type: "STANDARD",
    isUnderMaintenance: true,
    maintenanceReason: "Chưa lắp cảm biến áp suất",
  });
  assert.equal(validMaint.success, true);
});
