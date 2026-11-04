/**
 * Định nghĩa các hằng số, danh mục và mappers cho Customer Management.
 */

export const TICKET_PACKAGE_OPTIONS = [
  { value: "Vé ngày", label: "Vé ngày" },
  { value: "Vé tháng", label: "Vé tháng" },
  { value: "Vé quý", label: "Vé quý" },
  { value: "Vé năm", label: "Vé năm" },
];

export const CUSTOMER_STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Đang hoạt động" },
  { value: "SUSPENDED", label: "Tạm ngưng" },
  { value: "BLACKLISTED", label: "Danh sách đen" },
];

export const GENDER_OPTIONS = [
  { value: "Nam", label: "Nam" },
  { value: "Nữ", label: "Nữ" },
  { value: "Khác", label: "Khác" },
];

export const STATUS_MAP_CODE_TO_DISPLAY = {
  ACTIVE: "Đang hoạt động",
  SUSPENDED: "Tạm ngưng",
  BLACKLISTED: "Danh sách đen",
};

export const STATUS_MAP_DISPLAY_TO_CODE = {
  "Đang hoạt động": "ACTIVE",
  "Tạm ngưng": "SUSPENDED",
  "Tạm khóa": "SUSPENDED",
  "Danh sách đen": "BLACKLISTED",
  "Sắp hết hạn": "ACTIVE",
  "Hết hạn": "SUSPENDED",
};


