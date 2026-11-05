// src/constants/vehicleConstants.js

export const TICKET_TYPE_STYLES = {
  DAILY: {
    keyword: "ngày",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    dotClass: "bg-amber-500",
  },
  MONTHLY: {
    keyword: "tháng",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    dotClass: "bg-blue-500",
  },
  QUARTERLY: {
    keyword: "quý",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
    dotClass: "bg-purple-500",
  },
  YEARLY: {
    keyword: "năm",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dotClass: "bg-emerald-500",
  },
  DEFAULT: {
    badgeClass: "bg-slate-100 text-slate-600 border-slate-200",
    dotClass: "bg-slate-400",
    defaultLabel: "Vé lượt",
  },
};

export const TICKET_STATUS_CONFIG = {
  active: {
    label: "Còn hạn",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dotClass: "bg-emerald-500",
  },
  warning: {
    label: "Sắp hết hạn",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    dotClass: "bg-amber-500",
  },
  expired: {
    label: "Đã hết hạn",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
    dotClass: "bg-rose-500",
  },
};

export const VEHICLE_STATUS_CONFIG = {
  parked: {
    label: "Đang đỗ",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dotClass: "bg-emerald-500",
  },
  active: {
    label: "Đang hoạt động",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    dotClass: "bg-blue-500",
  },
  left: {
    label: "Đã rời bãi",
    badgeClass: "bg-slate-100 text-slate-600 border-slate-200",
    dotClass: "bg-slate-400",
  },
  inactive: {
    label: "Đã rời bãi",
    badgeClass: "bg-slate-100 text-slate-600 border-slate-200",
    dotClass: "bg-slate-400",
  },
  parking: {
    label: "Đang đỗ",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dotClass: "bg-emerald-500",
  },
};

export const VEHICLE_TYPE_OPTIONS = [
  { value: "", label: "Tất cả loại xe" },
  { value: "CAR", label: "Ô tô" },
  { value: "EV", label: "Ô tô điện" },
];

export const TICKET_FILTER_OPTIONS = [
  { value: "", label: "Tất cả gói vé" },
  { value: "Vé tháng", label: "Vé tháng" },
  { value: "Vé ngày", label: "Vé ngày" },
  { value: "Vé quý", label: "Vé quý" },
  { value: "Vé năm", label: "Vé năm" },
  { value: "Vé lượt", label: "Vé lượt" },
];

export const STATUS_FILTER_OPTIONS = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "parked", label: "Đang đỗ" },
  { value: "active", label: "Đang hoạt động" },
  { value: "left", label: "Đã rời bãi" },
];

export const DEFAULT_UNASSIGNED_SLOT_LABEL = "Chưa có vị trí";
export const AUTO_ASSIGN_SLOT_NOTE = "Chưa vào bãi (Ghi nhận tự động khi check-in)";

export const VEHICLE_DELETE_MESSAGES = {
  NON_MANAGER_FORBIDDEN: "Chỉ Quản lý (Manager) mới có quyền xóa phương tiện khỏi hệ thống.",
  NON_MANAGER_PARKED_TOOLTIP: "Xe đang đỗ trong bãi. Chỉ Quản lý mới có quyền thao tác xóa.",
  PARKED_VEHICLE_TITLE: "Phương tiện đang đỗ trong bãi xe",
  PARKED_VEHICLE_DESC: "Hệ thống phát hiện phương tiện hiện có phiên đỗ chưa kết thúc (check-in nhưng chưa check-out).",
  PARKED_VEHICLE_BLOCKED: "Phương tiện đang đỗ trong bãi xe (có phiên đỗ đang mở), không được phép xóa trực tiếp. Vui lòng hoàn tất phiên đỗ (Check-out) tại màn hình Lịch sử ra/vào hoặc sử dụng chức năng Đóng phiên đỗ khẩn cấp bên dưới.",
  ACTIVE_TICKET_TITLE: "Phương tiện đang có vé đỗ xe hiệu lực",
  ACTIVE_TICKET_BLOCKED: "Phương tiện này đang liên kết với vé đỗ xe còn hiệu lực. Theo quy định toàn vẹn tài chính & hợp đồng (DEL-03 / DEL-04), bạn không thể xóa phương tiện khi hợp đồng vé chưa kết thúc.",
  NAVIGATE_TO_TICKETS: "Xem thông tin vé đỗ",
  EMERGENCY_FORCE_CLOSE_CONFIRM: "Cưỡng chế đóng phiên đỗ & xóa xe khẩn cấp",
  EMERGENCY_FORCE_CLOSE_DESC: "Xử lý các tình huống thực tế: Xe cứu hộ kéo ra ngoài, quét nhầm biển số, sự cố barrier hoặc xe đã ra bãi thực tế mà chưa check-out.",
  EMERGENCY_SUCCESS: "Đã đóng phiên đỗ khẩn cấp, giải phóng vị trí và xóa phương tiện thành công.",
  CONFIRM_DELETE_TITLE: "Xác nhận xóa phương tiện",
  CONFIRM_DELETE_DESC: "Hành động này sẽ thực hiện xóa mềm (soft delete) phương tiện khỏi hệ thống.",
  DELETE_SUCCESS: "Đã xóa phương tiện thành công.",
  DELETE_ERROR_DEFAULT: "Không thể xóa phương tiện. Vui lòng kiểm tra ràng buộc phiên đỗ hoặc vé.",
};

export const INITIAL_VEHICLE_FORM_STATE = {
  licensePlate: "",
  model: "",
  brand: "",
  color: "",
  customerId: "",
  customerName: "",
  customerPhone: "",
  vehicleTypeId: 1,
  vehicleType: "CAR",
  notes: "",
  parkingSlotCode: "",
  status: "active",
};


