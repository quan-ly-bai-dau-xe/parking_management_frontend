import { z } from "zod";
import { SLOT_STATUS, SLOT_TYPES } from "../constants/parkingLotConstants.js";

/**
 * Chuẩn hóa mã ô đỗ xe:
 * - Trim khoảng trắng đầu/cuối
 * - Chuyển toàn bộ thành chữ in hoa (UPPERCASE)
 * - Rút gọn khoảng trắng thừa ở giữa
 *
 * @param {string} code
 * @returns {string}
 */
export function normalizeSlotCode(code) {
  if (typeof code !== "string") return "";
  return code.trim().replace(/\s+/g, " ").toUpperCase();
}

/**
 * Kiểm tra xem mã ô đỗ xe có bị trùng lặp trong danh sách ô đỗ hiện có hay không.
 * Cơ chế so sánh:
 * - Case-insensitive & Whitespace-trimmed
 * - Kiểm tra trên các trường định danh phổ biến: code, slotId, label, id
 * - Bỏ qua chính ô đỗ đang sửa (nếu có currentSlotId)
 *
 * @param {string} candidateCode - Mã ô đỗ muốn kiểm tra
 * @param {Array<Object>} existingSlots - Danh sách ô đỗ hiện có
 * @param {string|number} [currentSlotId] - ID của ô đỗ hiện tại (khi edit)
 * @returns {boolean} true nếu bị trùng lặp, ngược lại false
 */
export function isDuplicateSlotCode(candidateCode, existingSlots = [], currentSlotId = null) {
  const normalizedCandidate = normalizeSlotCode(candidateCode);
  if (!normalizedCandidate || !Array.isArray(existingSlots) || existingSlots.length === 0) {
    return false;
  }

  const normalizedCurrentId =
    currentSlotId !== null && currentSlotId !== undefined
      ? String(currentSlotId).trim().toUpperCase()
      : null;

  return existingSlots.some((slot) => {
    if (!slot || typeof slot !== "object") return false;

    // Nếu đang trong chế độ edit, bỏ qua chính bản ghi đang chỉnh sửa
    const slotIdStr = String(slot.id ?? slot.slotId ?? "").trim().toUpperCase();
    if (normalizedCurrentId && slotIdStr && slotIdStr === normalizedCurrentId) {
      return false;
    }

    const identifiers = [slot.code, slot.slotId, slot.label, slot.id]
      .filter((val) => typeof val === "string" && val.trim().length > 0)
      .map((val) => normalizeSlotCode(val));

    return identifiers.includes(normalizedCandidate);
  });
}

/**
 * Regex định dạng mã ô đỗ tiêu chuẩn:
 * Hỗ trợ các mã như: A-01, B-12, B1-A-09, VIP-01, 12, P-99
 */
export const SLOT_CODE_REGEX = /^[A-Z0-9]+(-[A-Z0-9]+)*$/i;

export const DUPLICATE_SLOT_CODE_MESSAGE =
  "Mã ô đỗ đã tồn tại trong bãi xe. Vui lòng nhập mã khác.";

/**
 * Tạo Zod Schema validate form thêm ô đỗ mới có kèm danh sách existingSlots để chặn trùng mã.
 *
 * @param {Array<Object>} existingSlots - Danh sách ô đỗ hiện có trong bãi xe
 * @returns {import("zod").ZodObject}
 */
export function createSlotSchema(existingSlots = []) {
  return z
    .object({
      floor: z.string().trim().min(1, "Vui lòng chọn tầng."),
      zone: z.string().trim().min(1, "Vui lòng chọn khu vực."),
      code: z
        .string()
        .trim()
        .min(1, "Vui lòng nhập mã ô đỗ xe (ví dụ: A-09).")
        .max(30, "Mã ô đỗ không được vượt quá 30 ký tự.")
        .regex(
          SLOT_CODE_REGEX,
          "Mã ô đỗ chỉ gồm chữ cái, số và dấu gạch nối '-' (ví dụ: A-09, B1-A-01)."
        )
        .refine((code) => !isDuplicateSlotCode(code, existingSlots), {
          message: DUPLICATE_SLOT_CODE_MESSAGE,
        }),
      type: z
        .nativeEnum(SLOT_TYPES)
        .or(z.string().min(1))
        .default(SLOT_TYPES.STANDARD),
      isUnderMaintenance: z.boolean().default(false),
      maintenanceReason: z.string().optional().default(""),
      note: z.string().optional().default(""),
    })
    .refine(
      (data) => {
        if (data.isUnderMaintenance) {
          return Boolean(
            data.maintenanceReason && data.maintenanceReason.trim().length > 0
          );
        }
        return true;
      },
      {
        message: "Vui lòng nhập lý do bảo trì ô đỗ.",
        path: ["maintenanceReason"],
      }
    );
}

/**
 * Tạo Zod Schema validate form cập nhật ô đỗ, loại trừ chính ô hiện tại.
 *
 * @param {Array<Object>} existingSlots
 * @param {string|number} currentSlotId
 * @returns {import("zod").ZodObject}
 */
export function updateSlotSchema(existingSlots = [], currentSlotId = null) {
  return z.object({
    code: z
      .string()
      .trim()
      .min(1, "Vui lòng nhập mã ô đỗ xe.")
      .max(30, "Mã ô đỗ không được vượt quá 30 ký tự.")
      .regex(SLOT_CODE_REGEX, "Mã ô đỗ không hợp lệ.")
      .refine(
        (code) => !isDuplicateSlotCode(code, existingSlots, currentSlotId),
        {
          message: DUPLICATE_SLOT_CODE_MESSAGE,
        }
      ),
    status: z.nativeEnum(SLOT_STATUS).or(z.string()),
    type: z.nativeEnum(SLOT_TYPES).or(z.string()).optional(),
    plate: z.string().nullable().optional(),
    reservedBy: z.string().nullable().optional(),
    note: z.string().nullable().optional(),
  });
}
