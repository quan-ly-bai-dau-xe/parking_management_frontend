import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  validateAbnormalAction,
  formatAuditNotes,
  parseAuditNotes,
  ABNORMAL_REASONS,
  ABNORMAL_ACTION_GROUPS,
} from "#src/constants/abnormalSessionConstants.js";

// Chỉ in log chi tiết khi có cờ --verbose hoặc VERBOSE=1 hoặc khi chạy spec reporter
const isVerbose =
  process.env.VERBOSE === "1" ||
  process.argv.includes("--verbose") ||
  process.execArgv.some((arg) => arg.includes("spec"));
function logDetail(...args) {
  if (isVerbose) console.log(...args);
}

/**
 * High-Risk Anti-Fraud & Audit Trail Validation Tests
 * Kiểm tra chuyên sâu các rủi ro gian lận cao, tính toàn vẹn dữ liệu và cơ chế phê duyệt 2 lớp.
 * In rõ Expected & Result để dễ dàng quan sát và đối soát.
 */
describe("HIGH-RISK DEFENSE: Xử lý phiên đỗ bất thường & Chống gian lận", () => {
  // -------------------------------------------------------------------------
  // RỦI RO 1: GIAN LẬN TIỀN MẶT - MIỄN CƯỚC HOẶC HỦY PHIÊN KHÔNG CÓ QUẢN LÝ DUYỆT
  // -------------------------------------------------------------------------
  test("RỦI RO 1.1: Bảo vệ (Staff) cố tình Miễn cước đặc cách (ghost_exit) mà KHÔNG có Quản lý duyệt", () => {
    const input = {
      actionType: "ghost_exit",
      reasonCode: "CAMERA_DOWN_ENTRY",
      detail: "Khách vào buổi sáng camera mờ",
      isManager: false,
      approverName: "", // Bỏ trống người duyệt
    };

    const expected = {
      isValid: false,
      error: "Yêu cầu tài khoản Quản lý duyệt hoặc nhập tên Quản lý trực ca bảo lãnh (tối thiểu 3 ký tự)",
    };

    const result = validateAbnormalAction(input);

    logDetail("\n[TEST RESULT] Rủi ro 1.1 - Miễn cước không có Quản lý:");
    logDetail("  Input       :", JSON.stringify(input));
    logDetail("  Expected    :", JSON.stringify(expected));
    logDetail("  Result (Got):", JSON.stringify(result));

    assert.equal(
      result.isValid,
      expected.isValid,
      `Expected isValid to be ${expected.isValid}, but got ${result.isValid}`
    );
    assert.strictEqual(
      result.error,
      expected.error,
      `Expected error to strictly equal exact string`
    );
  });

  test("RỦI RO 1.2: Bảo vệ (Staff) cố tình Hủy phiên (cancel_glitch) nhưng nhập tên người duyệt đối phó (< 3 ký tự)", () => {
    const input = {
      actionType: "cancel_glitch",
      reasonCode: "OCR_MISREAD",
      detail: "Nhận diện sai",
      isManager: false,
      approverName: "QL", // Quá ngắn (< 3 ký tự)
    };

    const expected = {
      isValid: false,
      error: "Yêu cầu tài khoản Quản lý duyệt hoặc nhập tên Quản lý trực ca bảo lãnh (tối thiểu 3 ký tự)",
    };

    const result = validateAbnormalAction(input);

    logDetail("\n[TEST RESULT] Rủi ro 1.2 - Người duyệt đối phó (< 3 ký tự):");
    logDetail("  Expected    :", JSON.stringify(expected));
    logDetail("  Result (Got):", JSON.stringify(result));

    assert.equal(result.isValid, expected.isValid);
    assert.strictEqual(result.error, expected.error);
  });

  test("HỢP LỆ 1.3: Quản lý (Manager) trực tiếp thực hiện hoặc Bảo vệ có Quản lý trực ca xác nhận hợp lệ", () => {
    // Trường hợp A: Quản lý trực tiếp login
    const managerInput = {
      actionType: "ghost_exit",
      reasonCode: "VIP_BMGR_WAIVER",
      isManager: true,
      approverName: "",
    };
    const expected = {
      isValid: true,
      error: null,
    };
    const managerRes = validateAbnormalAction(managerInput);

    // Trường hợp B: Bảo vệ nhập tên Quản lý ca hợp lệ
    const staffWithApproverInput = {
      actionType: "ghost_exit",
      reasonCode: "CAMERA_DOWN_ENTRY",
      isManager: false,
      approverName: "QL01 - Nguyễn Thị Lan",
    };
    const staffRes = validateAbnormalAction(staffWithApproverInput);

    logDetail("\n[TEST RESULT] Hợp lệ 1.3 - Quản lý duyệt hợp lệ:");
    logDetail("  Expected          :", JSON.stringify(expected));
    logDetail("  Result Manager    :", JSON.stringify(managerRes));
    logDetail("  Result Staff+Appr :", JSON.stringify(staffRes));

    assert.equal(managerRes.isValid, expected.isValid);
    assert.equal(managerRes.error, expected.error);
    assert.equal(staffRes.isValid, expected.isValid);
    assert.equal(staffRes.error, expected.error);
  });

  // -------------------------------------------------------------------------
  // RỦI RO 2: CHỌN 'LÝ DO KHÁC' NHƯNG NHẬP ĐỐI PHÓ QUA LOA (< 10 KÝ TỰ)
  // -------------------------------------------------------------------------
  test("RỦI RO 2.1: Chọn OTHER_CUSTOM nhưng giải trình qua loa (< 10 ký tự)", () => {
    const input = {
      actionType: "manual_checkout",
      reasonCode: "OTHER_CUSTOM",
      detail: "xe quen", // Chỉ có 7 ký tự -> Không đủ điều kiện giải trình
      isManager: true,
      approverName: "",
    };

    const expected = {
      isValid: false,
      error: "Với lý do đặc thù khác, bắt buộc nhập giải trình tối thiểu 10 ký tự",
    };

    const result = validateAbnormalAction(input);

    logDetail("\n[TEST RESULT] RỦI RO 2.1 - Lý do khác nhập qua loa:");
    logDetail("  Detail Length:", input.detail.length, "chars ('" + input.detail + "')");
    logDetail("  Expected     :", JSON.stringify(expected));
    logDetail("  Result (Got) :", JSON.stringify(result));

    assert.equal(result.isValid, expected.isValid);
    assert.strictEqual(result.error, expected.error);
  });

  test("HỢP LỆ 2.2: Chọn OTHER_CUSTOM và giải trình chi tiết thỏa mãn điều kiện (>= 10 ký tự)", () => {
    const input = {
      actionType: "manual_checkout",
      reasonCode: "OTHER_CUSTOM",
      detail: "Xe cấp cứu vận chuyển bệnh nhân khẩn cấp, mở làn tay",
      isManager: true,
    };

    const expected = {
      isValid: true,
      error: null,
    };

    const result = validateAbnormalAction(input);

    logDetail("\n[TEST RESULT] Hợp lệ 2.2 - Lý do khác đủ giải trình:");
    logDetail("  Input Detail :", `"${input.detail}" (${input.detail.length} chars)`);
    logDetail("  Expected     :", JSON.stringify(expected));
    logDetail("  Result (Got) :", JSON.stringify(result));

    assert.equal(result.isValid, expected.isValid);
    assert.equal(result.error, expected.error);
  });

  // -------------------------------------------------------------------------
  // RỦI RO 3: TOÀN VẸN DỮ LIỆU AUDIT TRAIL VÀ GIẢI BÃI VẾT KIỂM TOÁN (ROUNDTRIP)
  // -------------------------------------------------------------------------
  test("RỦI RO 3.1: Định dạng và giải mã Roundtrip Audit Notes - Không mất mát dữ liệu tiếng Việt", () => {
    const auditPayload = {
      groupCode: "ghost_exit",
      reasonCode: "LOST_CARD_VERIFIED",
      reasonLabel: "Thẻ mất, đã xác minh",
      actorName: "Bảo vệ Nguyễn Văn A",
      approverName: "QL02 - Trần Văn Quản Lý",
      detail: "Khách làm rơi thẻ, đã đối chiếu CCCD số 079... và cà vẹt xe trùng khớp 51A-123.45",
    };

    // 1. Format chuỗi ghi vào DB (Backend notes)
    const formattedNotes = formatAuditNotes(auditPayload);

    // 2. Parse ngược lại để kiểm toán tra cứu
    const parsed = parseAuditNotes(formattedNotes);

    logDetail("\n[TEST RESULT] Rủi ro 3.1 - Vết kiểm toán Audit Trail Roundtrip:");
    logDetail("  Formatted Notes String:\n  -->", formattedNotes);
    logDetail("  Parsed Result Object  :\n ", JSON.stringify(parsed, null, 2));

    // Assertions chi tiết từng trường
    assert.equal(parsed.isAudited, true, "isAudited must be true");
    assert.equal(parsed.groupCode, auditPayload.groupCode);
    assert.equal(parsed.reasonCode, auditPayload.reasonCode);
    assert.equal(parsed.reasonLabel, auditPayload.reasonLabel);
    assert.equal(parsed.actorName, auditPayload.actorName);
    assert.equal(parsed.approverName, auditPayload.approverName);
    assert.equal(parsed.detail, auditPayload.detail);
  });

  test("RỦI RO 3.2: Parse chuỗi notes bình thường của hệ thống cũ (không có cấu trúc) không gây crash", () => {
    const legacyNotes = "Khách gửi xe qua đêm, đã thanh toán tiền mặt lúc 8h";
    const parsed = parseAuditNotes(legacyNotes);

    logDetail("\n[TEST RESULT] Rủi ro 3.2 - Fallback với ghi chú cũ:");
    logDetail("  Input Legacy :", legacyNotes);
    logDetail("  Parsed Output:", JSON.stringify(parsed));

    assert.equal(parsed.isAudited, false, "Chuỗi cũ không có thẻ tag phải có isAudited=false");
    assert.equal(parsed.rawNotes, legacyNotes);
    assert.equal(parsed.reasonCode, null);
  });

  // -------------------------------------------------------------------------
  // RỦI RO 4: GIẢI PHÓNG Ô ẢO (RELEASE_SLOT) - KHÔNG ĐƯỢC PHÉP THU TIỀN
  // -------------------------------------------------------------------------
  test("RỦI RO 4.1: Nhóm Giải phóng ô ảo (release_slot) bắt buộc isZeroFee=true", () => {
    const releaseConfig = ABNORMAL_ACTION_GROUPS.RELEASE_SLOT;
    assert.equal(
      releaseConfig.isZeroFee,
      true,
      "Giải phóng ô đỗ ảo không được phép phát sinh thu cước!"
    );
  });
});
