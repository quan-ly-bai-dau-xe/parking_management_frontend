/**
 * abnormalSessionConstants.js
 * Danh mục chuẩn hóa mã lý do và cấu hình xử lý phiên đỗ xe bất thường
 * Tuân thủ Smart Mobility Design System & Audit Trail Governance
 */

export const ABNORMAL_ACTION_GROUPS = {
  GHOST_EXIT: {
    code: "ghost_exit",
    label: "Miễn cước đặc cách (Ghost Exit / Sự cố)",
    color: "emerald",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    requiresManager: true,
    isZeroFee: true,
  },
  CANCEL_GLITCH: {
    code: "cancel_glitch",
    label: "Hủy phiên lỗi nhận diện",
    color: "rose",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
    requiresManager: true,
    isZeroFee: true,
  },
  RELEASE_SLOT: {
    code: "release_slot",
    label: "Giải phóng ô đỗ ảo",
    color: "blue",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    requiresManager: false,
    isZeroFee: true,
  },
  MANUAL_CHECKOUT: {
    code: "manual_checkout",
    label: "Xuất bãi thủ công có thu tiền",
    color: "amber",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    requiresManager: false,
    isZeroFee: false,
  },
};

export const ABNORMAL_REASONS = [
  // Nhóm 1: Miễn cước đặc cách (ghost_exit)
  {
    code: "CAMERA_DOWN_ENTRY",
    groupCode: "ghost_exit",
    label: "Camera lối vào lỗi",
    fullDescription: "Camera lối vào không nhận diện hoặc mất điện thời điểm xe vào bãi",
    requiresManager: true,
  },
  {
    code: "LOST_CARD_VERIFIED",
    groupCode: "ghost_exit",
    label: "Thẻ mất, đã xác minh",
    fullDescription: "Khách làm mất thẻ/vé, bảo vệ đã đối soát CCCD và đăng ký xe hợp lệ",
    requiresManager: true,
  },
  {
    code: "VIP_BMGR_WAIVER",
    groupCode: "ghost_exit",
    label: "Xe VIP, miễn cước BQL",
    fullDescription: "Xe khách VIP hoặc đối tác được Ban Quản Lý phê duyệt miễn cước theo công văn",
    requiresManager: true,
  },
  {
    code: "EMERGENCY_MISSION",
    groupCode: "ghost_exit",
    label: "Xe ưu tiên / Khẩn cấp",
    fullDescription: "Xe công vụ, cứu hỏa, cấp cứu hoặc xe phục vụ tình huống khẩn cấp",
    requiresManager: true,
  },

  // Nhóm 2: Hủy phiên lỗi nhận diện (cancel_glitch)
  {
    code: "OCR_MISREAD",
    groupCode: "cancel_glitch",
    label: "Nhận diện sai biển số",
    fullDescription: "Camera AI đọc sai ký tự biển số thực tế dẫn tới sai lệch phiên đỗ",
    requiresManager: true,
  },
  {
    code: "DUPLICATE_ENTRY_U_TURN",
    groupCode: "cancel_glitch",
    label: "Quay đầu / Quét lặp 2 lần",
    fullDescription: "Xe quay đầu ở khu vực cổng vào tạo phiên ảo hoặc camera quét lặp 2 lần",
    requiresManager: true,
  },
  {
    code: "SYSTEM_TEST",
    groupCode: "cancel_glitch",
    label: "Kiểm tra hệ thống kỹ thuật",
    fullDescription: "Phiên đỗ thử nghiệm kỹ thuật trong quá trình bảo trì hoặc cân chỉnh camera",
    requiresManager: true,
  },

  // Nhóm 3: Giải phóng ô ảo (release_slot)
  {
    code: "SENSOR_FALSE_OCCUPIED",
    groupCode: "release_slot",
    label: "Cảm biến ảo / Ô trống",
    fullDescription: "Cảm biến báo bận sai, bảo vệ đã kiểm tra thực tế ô đỗ hoàn toàn trống",
    requiresManager: false,
  },
  {
    code: "VEHICLE_MOVED_SLOT",
    groupCode: "release_slot",
    label: "Xe di chuyển ô khác",
    fullDescription: "Xe đã tự chuyển sang vị trí đỗ khác nhưng hệ thống chưa tự động cập nhật",
    requiresManager: false,
  },

  // Nhóm 4: Xuất bãi thủ công có thu tiền (manual_checkout)
  {
    code: "EXIT_GATE_POWER_OUT",
    groupCode: "manual_checkout",
    label: "Mất điện cổng ra",
    fullDescription: "Cổng ra mất điện hoặc mất kết nối mạng, nhân viên đã thu tiền mặt tại bốt",
    requiresManager: false,
  },
  {
    code: "BARRIER_STUCK_CASH",
    groupCode: "manual_checkout",
    label: "Barie kẹt cơ khí, thu tiền",
    fullDescription: "Cần barie bị kẹt cơ khí phải mở tay, nhân viên đã thu tiền và đối soát",
    requiresManager: false,
  },

  // Mã đặc biệt dùng chung: Lý do khác (Bắt buộc nhập chi tiết)
  {
    code: "OTHER_CUSTOM",
    groupCode: "all",
    label: "Khác (Nhập chi tiết)",
    fullDescription: "Trường hợp sự cố đặc thù chưa có trong danh mục (bắt buộc nhập giải trình)",
    requiresManager: true,
  },
];

/**
 * Helper kiểm tra tính hợp lệ của biểu mẫu xử lý bất thường (Validation Gate)
 * Dùng chung giữa UI components và test runners để bảo đảm tính nhất quán, không drift logic.
 *
 * @param {Object} params
 * @param {string} params.actionType - "ghost_exit" | "cancel_glitch" | "release_slot" | "manual_checkout"
 * @param {string} params.reasonCode - Mã lý do (vd: "CAMERA_DOWN_ENTRY", "OTHER_CUSTOM", ...)
 * @param {string} [params.detail=""] - Nội dung giải trình
 * @param {boolean} [params.isManager=false] - Người dùng hiện tại có phải Quản lý không
 * @param {string} [params.approverName=""] - Tên người phê duyệt (nếu không phải Quản lý)
 * @returns {{ isValid: boolean, error: string | null }}
 */
export function validateAbnormalAction({
  actionType,
  reasonCode,
  detail = "",
  isManager = false,
  approverName = "",
}) {
  if (!reasonCode || !reasonCode.trim()) {
    return { isValid: false, error: "Vui lòng chọn một lý do chuẩn hóa từ danh mục" };
  }

  const isCustom = reasonCode === "OTHER_CUSTOM";
  if (isCustom && (!detail || detail.trim().length < 10)) {
    return {
      isValid: false,
      error: "Với lý do đặc thù khác, bắt buộc nhập giải trình tối thiểu 10 ký tự",
    };
  }

  const groupConfig = ABNORMAL_ACTION_GROUPS[actionType?.toUpperCase()];
  const reasonConfig = ABNORMAL_REASONS.find((r) => r.code === reasonCode);
  const requiresManagerAuth = groupConfig?.requiresManager || reasonConfig?.requiresManager || isCustom;

  if (requiresManagerAuth && !isManager) {
    if (!approverName || approverName.trim().length < 3) {
      return {
        isValid: false,
        error: "Yêu cầu tài khoản Quản lý duyệt hoặc nhập tên Quản lý trực ca bảo lãnh (tối thiểu 3 ký tự)",
      };
    }
  }

  return { isValid: true, error: null };
}

/**
 * Helper format chuỗi vết kiểm toán ghi nhận vào `notes` của Backend
 */
export function formatAuditNotes({
  reasonCode,
  reasonLabel,
  detail = "",
  actorName = "",
  approverName = "",
  groupCode = "",
}) {
  const parts = [];
  if (groupCode) parts.push(`[GROUP:${groupCode.toUpperCase()}]`);
  if (reasonCode) parts.push(`[REASON:${reasonCode}]`);
  if (reasonLabel) parts.push(`[LABEL:${reasonLabel}]`);
  if (actorName) parts.push(`[ACTOR:${actorName}]`);
  if (approverName) parts.push(`[APPROVER:${approverName}]`);
  if (detail && detail.trim()) parts.push(`[DETAIL:${detail.trim()}]`);
  return parts.join(" ");
}

/**
 * Helper parse chuỗi audit notes từ Backend để lấy thông tin đối soát
 */
export function parseAuditNotes(notesString) {
  if (!notesString || typeof notesString !== "string") {
    return { isAudited: false };
  }

  const groupMatch = notesString.match(/\[GROUP:([^\]]+)\]/);
  const reasonMatch = notesString.match(/\[REASON:([^\]]+)\]/);
  const labelMatch = notesString.match(/\[LABEL:([^\]]+)\]/);
  const actorMatch = notesString.match(/\[ACTOR:([^\]]+)\]/);
  const approverMatch = notesString.match(/\[APPROVER:([^\]]+)\]/);
  const detailMatch = notesString.match(/\[DETAIL:([^\]]+)\]/);

  const isAudited = Boolean(groupMatch || reasonMatch || labelMatch);

  return {
    isAudited,
    groupCode: groupMatch ? groupMatch[1].toLowerCase() : null,
    reasonCode: reasonMatch ? reasonMatch[1] : null,
    reasonLabel: labelMatch ? labelMatch[1] : null,
    actorName: actorMatch ? actorMatch[1] : null,
    approverName: approverMatch ? approverMatch[1] : null,
    detail: detailMatch ? detailMatch[1] : null,
    rawNotes: notesString,
  };
}
