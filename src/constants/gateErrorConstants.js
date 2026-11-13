/**
 * gateErrorConstants.js
 * Các mã lỗi nghiệp vụ cổng kiểm soát (Gate Entry/Exit) theo đặc tả SRS TL-01 đến TL-49.
 */

export const GATE_ERROR_CODES = {
  // Session & Blacklist
  ACTIVE_SESSION: "PROP-4.5.1-P07",
  BLACKLISTED: "PROP-4.5.1-P08",
  SESSION_ENDED: "PROP-4.5.1-P10",
  IMAGE_INVALID: "PROP-4.5.1-P13",
  MANAGER_OVERRIDE_BLACKLIST: "PROP-4.5.1-P14",
  MANAGER_OVERRIDE_FEE: "PROP-4.5.1-P18",
  REASON_REQUIRED: "PROP-4.5.1-P19",
  LOT_FULL: "PROP-4.5.1-P05",
  NO_OPEN_SESSION: "PROP-4.5.1-P06",
  INVALID_PAYMENT: "PROP-4.5.1-P09",

  // Slot states
  SLOT_IN_USE: "MSG-4.5.2-M02",
  SLOT_MAINTENANCE: "PROP-4.5.2-P01",
  SLOT_OCCUPIED: "PROP-4.5.2-P02",
  SLOT_RESERVED: "PROP-4.5.2-P05",
  SLOT_TYPE_MISMATCH: "PROP-SLOT-VEHICLE-TYPE-MISMATCH",

  // Ticket states
  TICKET_EXPIRED: "MSG-4.5.1-M01",
};

export const GATE_ERROR_MESSAGES = {
  [GATE_ERROR_CODES.ACTIVE_SESSION]: "Xe đang có phiên gửi chưa kết thúc tại bãi.",
  [GATE_ERROR_CODES.BLACKLISTED]: "Biển số nằm trong danh sách đen (Blacklist). Cần Quản lý phê duyệt để cho xe vào.",
  [GATE_ERROR_CODES.MANAGER_OVERRIDE_BLACKLIST]: "Chỉ Quản lý mới có quyền phê duyệt xe trong danh sách đen.",
  [GATE_ERROR_CODES.MANAGER_OVERRIDE_FEE]: "Chỉ Quản lý mới có quyền miễn cước phí đỗ xe.",
  [GATE_ERROR_CODES.REASON_REQUIRED]: "Vui lòng cung cấp lý do miễn cước đặc cách.",
  [GATE_ERROR_CODES.SESSION_ENDED]: "Phiên đỗ xe này đã được kết thúc trước đó.",
  [GATE_ERROR_CODES.SLOT_IN_USE]:
    "⚠️ Vị trí đỗ này đã có xe đăng ký vé và đang sử dụng. Hệ thống đã tự động chọn ô trống khả dụng khác, vui lòng kiểm tra và xác nhận lại.",
  [GATE_ERROR_CODES.SLOT_MAINTENANCE]: "⚠️ Vị trí đỗ này đang bảo trì, vui lòng chọn vị trí khác.",
  [GATE_ERROR_CODES.SLOT_OCCUPIED]: "⚠️ Vị trí đỗ này đã có xe khác đỗ, vui lòng chọn vị trí khác.",
  [GATE_ERROR_CODES.SLOT_RESERVED]: "⚠️ Vị trí đỗ này đã có người đặt trước, vui lòng chọn vị trí khác.",
  [GATE_ERROR_CODES.SLOT_TYPE_MISMATCH]: "⚠️ Loại phương tiện không tương thích với cấu hình vị trí đỗ này.",
  [GATE_ERROR_CODES.IMAGE_INVALID]: "⚠️ Đường dẫn hình ảnh không hợp lệ.",
  [GATE_ERROR_CODES.TICKET_EXPIRED]: "⚠️ Vé đăng ký của xe đã hết hạn, hệ thống sẽ tự động chuyển sang chế độ tính vé lượt vãng lai.",
  [GATE_ERROR_CODES.LOT_FULL]: "⚠️ Bãi đỗ xe đã đầy chỗ cho loại phương tiện này. Vui lòng hướng dẫn xe quay đầu.",
  [GATE_ERROR_CODES.INVALID_PAYMENT]: "Vui lòng chọn phương thức thanh toán hợp lệ (tiền mặt hoặc VietQR).",
  [GATE_ERROR_CODES.NO_OPEN_SESSION]: "Không tìm thấy phiên đỗ đang mở cho phương tiện này.",

  // Fallbacks mặc định
  DEFAULT_ENTRY_FAIL: "Không thể thực hiện Check-in vào bãi. Vui lòng thử lại.",
  DEFAULT_EXIT_FAIL: "Không thể thực hiện Check-out xe. Vui lòng thử lại.",
};
