export const TICKET_TYPES = [
  { value: "DAILY", label: "Vé ngày" },
  { value: "MONTHLY", label: "Vé tháng" },
  { value: "QUARTERLY", label: "Vé quý" },
  { value: "YEARLY", label: "Vé năm" },
];

export const TICKET_STATUSES = [
  { value: "active", label: "Đang hoạt động" },
  { value: "expiring", label: "Sắp hết hạn" },
  { value: "expired", label: "Đã hết hạn" },
  { value: "renewing", label: "Đang gia hạn" },
  { value: "cancelled", label: "Đã hủy" },
];

export const PARKING_FLOORS = [
  { value: "B1", label: "Tầng B1" },
  { value: "B2", label: "Tầng B2" },
  { value: "B3", label: "Tầng B3" },
];

export const INITIAL_TICKET_FILTERS = {
  ticketCode: "",
  customerCode: "",
  licensePlate: "",
  startDate: "",
  endDate: "",
  ticketType: "",
  status: "",
  slotLocation: "",
};

export const TICKET_DELETE_MESSAGES = {
  TITLE_CONFIRM: "Xác nhận xóa vé",
  TITLE_BLOCKED: "Không được phép xóa vé",
  DESC_CONFIRM: "Hành động này sẽ thực hiện xóa mềm (soft-delete) vé khỏi hệ thống.",
  SUCCESS: "Xóa vé thành công",
  
  // Guards DEL-04
  ACTIVE_UNEXPIRED: "Vé chưa hết hạn, không được phép xóa. (Mã: PROP-4.6.4-P01)",
  RENEWED_TICKET: "Vé đã được gia hạn, không được phép xóa. (Mã: PROP-4.6.4-P02)",
  PARKED_VEHICLE: "Phương tiện liên kết với vé đang đỗ trong bãi xe, không được phép xóa vé. (Mã: PROP-DEL-04-OPEN-SES)",
  
  CONFIRM_QUESTION: "Bạn có chắc chắn muốn xóa vé đỗ xe này không?",
  ACCOUNTING_NOTE: "* Theo Luật Kế toán 88/2015/QH13 và OQ-11, thông tin vé và chứng từ thanh toán được lưu trữ bảo toàn lịch sử và chỉ được loại trừ khỏi thống kê hoạt động thường nhật.",
};

