import { z } from "zod";

/**
 * Pure Zod Validation Schemas cho Employee Domain.
 * Đảm bảo tính toàn vẹn dữ liệu, transform payload gửi tới Backend API (/api/v1/employees/)
 * và phân tách concerns giữa Schema, Service và UI Modal.
 */

export const DEFAULT_INITIAL_PASSWORD = "P@ssword12345";
export const DEFAULT_POSITION_ID = 2; // NVVH - Nhân viên vận hành

export const EMPLOYEE_STATUS = Object.freeze({
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
});

export const POSITION_ROLE_MAP = Object.freeze({
  ql: 1,
  "quản lý": 1,
  nvvh: 2,
  "nhân viên vận hành": 2,
  nvtn: 3,
  "nhân viên thu ngân": 3,
  ktv: 4,
  "kỹ thuật viên": 4,
});

export const PHONE_REGEX = /^(0|\+84)[0-9\s.-]{8,15}$/;

/**
 * Phân giải position_id từ id trực tiếp hoặc tên/mã chức vụ
 */
export function resolvePositionId(positionId, role, fallback = DEFAULT_POSITION_ID) {
  if (positionId !== undefined && positionId !== null && positionId !== "") {
    const num = Number(positionId);
    if (!isNaN(num) && num > 0) return num;
  }
  if (typeof role === "string" && role.trim()) {
    const key = role.trim().toLowerCase();
    if (POSITION_ROLE_MAP[key]) return POSITION_ROLE_MAP[key];
  }
  return fallback;
}

/**
 * Chuẩn hóa trạng thái nhân viên sang dạng UPPERCASE theo contract API
 */
export function normalizeEmployeeStatus(status, fallback = EMPLOYEE_STATUS.ACTIVE) {
  if (!status || typeof status !== "string") return fallback;
  const upper = status.trim().toUpperCase();
  if (upper === "INACTIVE" || upper === "KHÓA" || upper === "KHONG HOAT DONG") {
    return EMPLOYEE_STATUS.INACTIVE;
  }
  return EMPLOYEE_STATUS.ACTIVE;
}

/**
 * Kết hợp địa chỉ từ trường address hoặc area / city
 */
export function resolveAddress({ address, area, city } = {}) {
  if (typeof address === "string" && address.trim()) {
    return address.trim();
  }
  const parts = [
    typeof area === "string" ? area.trim() : "",
    typeof city === "string" ? city.trim() : "",
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : undefined;
}

/**
 * Schema đầu vào khi tạo mới nhân viên
 */
export const createEmployeeInputSchema = z
  .object({
    name: z.string().trim().optional(),
    full_name: z.string().trim().optional(),
    email: z
      .string()
      .trim()
      .min(1, "Email không được để trống")
      .email("Email không đúng định dạng"),
    phone: z
      .string()
      .trim()
      .min(1, "Số điện thoại không được để trống")
      .regex(PHONE_REGEX, "Số điện thoại không đúng định dạng"),
    position_id: z.union([z.number(), z.string()]).optional(),
    positionId: z.union([z.number(), z.string()]).optional(),
    role: z.string().trim().optional(),
    password: z.string().optional(),
    status: z.string().trim().optional(),
    code: z.string().trim().optional(),
    date_of_birth: z.string().trim().nullable().optional(),
    gender: z.string().trim().optional(),
    identity_card_number: z.string().trim().optional(),
    address: z.string().trim().optional(),
    area: z.string().trim().optional(),
    city: z.string().trim().optional(),
    province_id: z.union([z.number(), z.string()]).nullable().optional(),
    district_id: z.union([z.number(), z.string()]).nullable().optional(),
    ward_id: z.union([z.number(), z.string()]).nullable().optional(),
  })
  .refine(
    (data) => Boolean((data.full_name && data.full_name.trim()) || (data.name && data.name.trim())),
    {
      message: "Họ và tên không được để trống",
      path: ["full_name"],
    }
  );

/**
 * Schema transform dữ liệu tạo mới nhân viên thành backend payload chuẩn (/api/v1/employees/)
 */
export const createEmployeePayloadSchema = createEmployeeInputSchema.transform((data) => {
  const full_name = (data.full_name || data.name || "").trim();
  const position_id = resolvePositionId(
    data.position_id ?? data.positionId,
    data.role,
    DEFAULT_POSITION_ID
  );
  const password =
    data.password && data.password.trim()
      ? data.password.trim()
      : DEFAULT_INITIAL_PASSWORD;
  const status = normalizeEmployeeStatus(data.status, EMPLOYEE_STATUS.ACTIVE);
  const address = resolveAddress(data);

  const payload = {
    full_name,
    email: data.email.trim(),
    phone: data.phone.trim(),
    position_id,
    password,
    status,
  };

  if (data.code && data.code.trim()) {
    payload.code = data.code.trim();
  }
  if (data.date_of_birth && data.date_of_birth.trim()) {
    payload.date_of_birth = data.date_of_birth.trim();
  }
  if (data.gender && data.gender.trim()) {
    payload.gender = data.gender.trim();
  }
  if (data.identity_card_number && data.identity_card_number.trim()) {
    payload.identity_card_number = data.identity_card_number.trim();
  }
  if (address) {
    payload.address = address;
  }
  if (data.province_id !== undefined && data.province_id !== null && data.province_id !== "") {
    payload.province_id = Number(data.province_id);
  }
  if (data.district_id !== undefined && data.district_id !== null && data.district_id !== "") {
    payload.district_id = Number(data.district_id);
  }
  if (data.ward_id !== undefined && data.ward_id !== null && data.ward_id !== "") {
    payload.ward_id = Number(data.ward_id);
  }

  return payload;
});

/**
 * Schema đầu vào khi cập nhật nhân viên (PATCH)
 */
export const updateEmployeeInputSchema = z.object({
  id: z.union([z.number(), z.string()]).optional(),
  row_version: z.union([z.number(), z.string()]).optional(),
  rowVersion: z.union([z.number(), z.string()]).optional(),
  name: z.string().trim().optional(),
  full_name: z.string().trim().optional(),
  email: z
    .string()
    .trim()
    .email("Email không đúng định dạng")
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .trim()
    .regex(PHONE_REGEX, "Số điện thoại không đúng định dạng")
    .optional()
    .or(z.literal("")),
  position_id: z.union([z.number(), z.string()]).optional(),
  positionId: z.union([z.number(), z.string()]).optional(),
  role: z.string().trim().optional(),
  password: z.string().optional(),
  status: z.string().trim().optional(),
  date_of_birth: z.string().trim().nullable().optional(),
  gender: z.string().trim().optional(),
  identity_card_number: z.string().trim().optional(),
  address: z.string().trim().optional(),
  area: z.string().trim().optional(),
  city: z.string().trim().optional(),
  province_id: z.union([z.number(), z.string()]).nullable().optional(),
  district_id: z.union([z.number(), z.string()]).nullable().optional(),
  ward_id: z.union([z.number(), z.string()]).nullable().optional(),
});

/**
 * Schema transform dữ liệu cập nhật nhân viên thành backend PATCH payload (/api/v1/employees/{id}/)
 */
export const updateEmployeePayloadSchema = updateEmployeeInputSchema.transform((data) => {
  const rowVersion = data.row_version ?? data.rowVersion ?? 1;
  const payload = {
    row_version: Number(rowVersion),
  };

  const fullName = (data.full_name || data.name || "").trim();
  if (fullName) {
    payload.full_name = fullName;
  }

  if (data.email && data.email.trim()) {
    payload.email = data.email.trim();
  }

  if (data.phone && data.phone.trim()) {
    payload.phone = data.phone.trim();
  }

  const rawPos = data.position_id ?? data.positionId;
  if (rawPos !== undefined && rawPos !== null && rawPos !== "") {
    payload.position_id = Number(rawPos);
  } else if (data.role && data.role.trim()) {
    const roleKey = data.role.toLowerCase().trim();
    if (POSITION_ROLE_MAP[roleKey]) {
      payload.position_id = POSITION_ROLE_MAP[roleKey];
    }
  }

  if (data.password && data.password.trim()) {
    payload.password = data.password.trim();
  }

  if (data.status && data.status.trim()) {
    payload.status = normalizeEmployeeStatus(data.status);
  }

  const address = resolveAddress(data);
  if (address) {
    payload.address = address;
  }

  if (data.date_of_birth && data.date_of_birth.trim()) {
    payload.date_of_birth = data.date_of_birth.trim();
  }
  if (data.gender && data.gender.trim()) {
    payload.gender = data.gender.trim();
  }
  if (data.identity_card_number && data.identity_card_number.trim()) {
    payload.identity_card_number = data.identity_card_number.trim();
  }
  if (data.province_id !== undefined && data.province_id !== null && data.province_id !== "") {
    payload.province_id = Number(data.province_id);
  }
  if (data.district_id !== undefined && data.district_id !== null && data.district_id !== "") {
    payload.district_id = Number(data.district_id);
  }
  if (data.ward_id !== undefined && data.ward_id !== null && data.ward_id !== "") {
    payload.ward_id = Number(data.ward_id);
  }

  return payload;
});

/**
 * Schema kiểm tra tính hợp lệ của response Employee từ API Backend / Mock
 */
export const EmployeeItemSchema = z.object({
  id: z.union([z.number(), z.string()]),
  code: z.string().optional(),
  full_name: z.string().optional(),
  name: z.string().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  position: z
    .union([
      z.object({
        id: z.number().optional(),
        code: z.string().optional(),
        name: z.string().optional(),
      }),
      z.string(),
    ])
    .optional(),
  role: z.string().optional(),
  position_id: z.number().optional(),
  area: z
    .union([
      z.object({
        district_name: z.string().optional(),
        province_name: z.string().optional(),
      }),
      z.string(),
    ])
    .optional(),
  city: z.string().optional(),
  status: z.string().optional(),
  status_display: z.string().optional(),
  row_version: z.number().optional(),
  rowVersion: z.number().optional(),
  tone: z.string().optional(),
});
