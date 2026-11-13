/**
 * gateErrorMapper.js
 * Hàm ánh xạ lỗi nghiệp vụ cho Check-in (Entry) và Check-out (Exit) cổng kiểm soát.
 */

import { GATE_ERROR_CODES, GATE_ERROR_MESSAGES } from "../../constants/gateErrorConstants";

/**
 * Trả về thông điệp lỗi thân thiện cho luồng Check-in làn vào.
 * @param {object} err - Đối tượng lỗi từ API hoặc Catch block
 * @returns {string} Thông điệp lỗi tiếng Việt
 */
export const getEntryErrorMessage = (err) => {
  const backendMsg = err?.data?.message || err?.message;
  const errorCode = err?.data?.code || err?.code;

  if (errorCode && GATE_ERROR_MESSAGES[errorCode]) {
    return GATE_ERROR_MESSAGES[errorCode];
  }

  // Khớp theo nội dung text nếu backend không có code cụ thể
  if (backendMsg?.includes("đang có phiên") || backendMsg?.includes("chưa kết thúc")) {
    return GATE_ERROR_MESSAGES[GATE_ERROR_CODES.ACTIVE_SESSION];
  }
  if (backendMsg?.includes("danh sách đen") || backendMsg?.includes("Blacklist")) {
    return GATE_ERROR_MESSAGES[GATE_ERROR_CODES.BLACKLISTED];
  }
  if (backendMsg?.includes("đã có xe đk vé")) {
    return GATE_ERROR_MESSAGES[GATE_ERROR_CODES.SLOT_IN_USE];
  }
  if (backendMsg?.includes("đang bảo trì")) {
    return GATE_ERROR_MESSAGES[GATE_ERROR_CODES.SLOT_MAINTENANCE];
  }
  if (backendMsg?.includes("hết hạn")) {
    return GATE_ERROR_MESSAGES[GATE_ERROR_CODES.TICKET_EXPIRED];
  }
  if (backendMsg?.includes("hết chỗ")) {
    return GATE_ERROR_MESSAGES[GATE_ERROR_CODES.LOT_FULL];
  }

  return backendMsg || GATE_ERROR_MESSAGES.DEFAULT_ENTRY_FAIL;
};

/**
 * Trả về thông điệp lỗi thân thiện cho luồng Check-out làn ra.
 * @param {object} err - Đối tượng lỗi từ API hoặc Catch block
 * @returns {string} Thông điệp lỗi tiếng Việt
 */
export const getExitErrorMessage = (err) => {
  const backendMsg = err?.data?.message || err?.message;
  const errorCode = err?.data?.code || err?.code;

  if (errorCode && GATE_ERROR_MESSAGES[errorCode]) {
    return GATE_ERROR_MESSAGES[errorCode];
  }

  // Khớp theo nội dung text nếu backend không có code cụ thể
  if (backendMsg?.includes("Không tìm thấy") || backendMsg?.includes("chưa có phiên")) {
    return GATE_ERROR_MESSAGES[GATE_ERROR_CODES.NO_OPEN_SESSION];
  }
  if (backendMsg?.includes("đang có phiên") || backendMsg?.includes("chưa kết thúc")) {
    return GATE_ERROR_MESSAGES[GATE_ERROR_CODES.ACTIVE_SESSION];
  }
  if (backendMsg?.includes("danh sách đen") || backendMsg?.includes("Blacklist")) {
    return GATE_ERROR_MESSAGES[GATE_ERROR_CODES.BLACKLISTED];
  }

  return backendMsg || GATE_ERROR_MESSAGES.DEFAULT_EXIT_FAIL;
};
