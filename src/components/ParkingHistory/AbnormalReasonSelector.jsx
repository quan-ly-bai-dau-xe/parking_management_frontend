import { useState, useMemo } from "react";
import {
  ABNORMAL_REASONS,
  ABNORMAL_ACTION_GROUPS,
} from "../../constants/abnormalSessionConstants";

/**
 * AbnormalReasonSelector
 * Component chọn lý do xử lý bất thường thích ứng (Hybrid Adaptive UI):
 * - Hỗ trợ cả 2 chế độ hiển thị: Chips trực quan (màn hình chuẩn) hoặc Combobox tìm kiếm (màn hình hẹp/danh sách dài)
 * - Tự động hiển thị và bắt buộc nhập ô "Chi tiết bổ sung" khi chọn lý do OTHER_CUSTOM hoặc khi nhóm yêu cầu
 * - Hỗ trợ gán người duyệt (Approver) đối với tài khoản không phải Quản lý
 */
export default function AbnormalReasonSelector({
  groupCode, // "ghost_exit" | "cancel_glitch" | "release_slot" | "manual_checkout"
  selectedCode,
  onSelectCode,
  detail = "",
  onChangeDetail,
  isManager = false,
  approverName = "",
  onChangeApproverName,
  maxDetailLength = 500,
}) {
  const [viewMode, setViewMode] = useState("chips"); // "chips" | "combobox"
  const [searchQuery, setSearchQuery] = useState("");

  // Lọc danh sách lý do theo nhóm đang chọn + lý do dùng chung OTHER_CUSTOM
  const availableReasons = useMemo(() => {
    return ABNORMAL_REASONS.filter(
      (r) => r.groupCode === groupCode || r.groupCode === "all"
    );
  }, [groupCode]);

  // Lọc theo từ khóa tìm kiếm khi dùng combobox
  const filteredReasons = useMemo(() => {
    if (!searchQuery.trim()) return availableReasons;
    const q = searchQuery.toLowerCase().trim();
    return availableReasons.filter(
      (r) =>
        r.label.toLowerCase().includes(q) ||
        r.fullDescription.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q)
    );
  }, [availableReasons, searchQuery]);

  const currentSelectedReason = useMemo(() => {
    return availableReasons.find((r) => r.code === selectedCode) || null;
  }, [availableReasons, selectedCode]);

  const isCustomReason = selectedCode === "OTHER_CUSTOM";
  const groupConfig = ABNORMAL_ACTION_GROUPS[groupCode?.toUpperCase()] || null;
  const requiresManagerAuth = groupConfig?.requiresManager || currentSelectedReason?.requiresManager;

  return (
    <div className="space-y-3 bg-white/70 p-3 rounded-xl border border-slate-200">
      {/* Header bar: Tiêu đề + nút toggle View Mode (Chips vs Tìm kiếm) */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
          <span>Lý do chuẩn hóa</span>
          <span className="text-rose-500 font-bold">*</span>
        </label>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setViewMode("chips")}
            className={`px-2 py-0.5 text-[10px] font-medium rounded-md transition-colors ${
              viewMode === "chips"
                ? "bg-blue-100 text-blue-700 font-semibold"
                : "text-slate-500 hover:bg-slate-100"
            }`}
          >
            Dạng thẻ (Chips)
          </button>
          <span className="text-slate-300">|</span>
          <button
            type="button"
            onClick={() => setViewMode("combobox")}
            className={`px-2 py-0.5 text-[10px] font-medium rounded-md transition-colors ${
              viewMode === "combobox"
                ? "bg-blue-100 text-blue-700 font-semibold"
                : "text-slate-500 hover:bg-slate-100"
            }`}
          >
            Tìm kiếm (Gõ)
          </button>
        </div>
      </div>

      {/* CHẾ ĐỘ 1: CHIPS TRỰC QUAN */}
      {viewMode === "chips" && (
        <div className="flex flex-wrap gap-1.5">
          {availableReasons.map((item) => {
            const isSelected = selectedCode === item.code;
            return (
              <button
                key={item.code}
                type="button"
                onClick={() => onSelectCode(item.code)}
                title={item.fullDescription}
                className={`px-2.5 py-1 text-xs rounded-lg border font-medium transition-all text-left flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-blue-600 text-white border-blue-600 shadow-2xs scale-[1.01]"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                }`}
              >
                <span>{item.label}</span>
                {isSelected && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* CHẾ ĐỘ 2: COMBOBOX / TÌM KIẾM NHANH (Màn hình hẹp / danh sách nhiều) */}
      {viewMode === "combobox" && (
        <div className="space-y-2">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Gõ từ khóa tìm lý do (vd: camera, thẻ, mất điện...)"
              className="w-full text-xs rounded-lg border border-slate-200 pl-8 pr-3 py-1.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
            <svg
              className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div className="max-h-36 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg">
            {filteredReasons.map((item) => {
              const isSelected = selectedCode === item.code;
              return (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => onSelectCode(item.code)}
                  className={`w-full text-left px-3 py-2 text-xs transition-colors flex flex-col ${
                    isSelected ? "bg-blue-50 text-blue-900 font-semibold" : "hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{item.label}</span>
                    {isSelected && <span className="text-blue-600 font-bold">✓</span>}
                  </div>
                  <span className="text-[10px] text-slate-500 font-normal">{item.fullDescription}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Hiển thị tóm tắt lý do đã chọn */}
      {currentSelectedReason && (
        <div className="text-[11px] bg-slate-50 text-slate-600 px-2.5 py-1.5 rounded-lg border border-slate-200/80 flex items-start gap-1.5">
          <span className="text-blue-600 font-bold">Mô tả:</span>
          <span>{currentSelectedReason.fullDescription}</span>
        </div>
      )}

      {/* Ô NHẬP CHI TIẾT BỔ SUNG (Bắt buộc nếu chọn OTHER_CUSTOM, hoặc tùy chọn nếu muốn ghi nhận thêm) */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[11px] font-semibold text-slate-700">
            Chi tiết bổ sung {isCustomReason ? <span className="text-rose-500">* (Bắt buộc giải trình)</span> : "(Tùy chọn ghi chú thêm)"}:
          </label>
          <span className="text-[10px] text-slate-400 font-mono">
            {detail.length}/{maxDetailLength}
          </span>
        </div>
        <textarea
          rows={2}
          value={detail}
          maxLength={maxDetailLength}
          onChange={(e) => onChangeDetail(e.target.value)}
          placeholder={
            isCustomReason
              ? "Vui lòng ghi rõ tình tiết sự cố, biển số thực tế hoặc căn cứ giải quyết (tối thiểu 10 ký tự)..."
              : "VD: Biển số thực tế là 51A-123.45, khách đã xuất trình giấy tờ xe..."
          }
          className={`w-full px-2.5 py-1.5 text-xs bg-white border rounded-lg focus:outline-none focus:ring-1 ${
            isCustomReason && detail.trim().length < 10
              ? "border-amber-300 focus:border-amber-500 focus:ring-amber-500"
              : "border-slate-200 focus:border-blue-500 focus:ring-blue-500"
          }`}
        />
        {isCustomReason && detail.trim().length < 10 && (
          <p className="text-[10px] text-amber-600 mt-0.5">
            * Với lý do đặc thù, vui lòng nhập giải trình chi tiết tối thiểu 10 ký tự.
          </p>
        )}
      </div>

      {/* VÙNG PHÂN QUYỀN PHÊ DUYỆT (GOVERNANCE LOCK) */}
      {requiresManagerAuth && (
        <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-lg text-xs space-y-2">
          <div className="flex items-center gap-1.5 text-amber-800 font-semibold text-[11px]">
            <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Yêu cầu phê duyệt Quản lý (Audit Governance)</span>
          </div>

          {isManager ? (
            <p className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200 font-medium">
              ✓ Bạn đang đăng nhập bằng tài khoản Quản lý. Hành động này sẽ được ghi nhận vào nhật ký kiểm toán.
            </p>
          ) : (
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Người phê duyệt đặc cách (Quản lý trực ca) <span className="text-rose-500">*</span>:
              </label>
              <input
                type="text"
                required
                value={approverName}
                onChange={(e) => onChangeApproverName?.(e.target.value)}
                placeholder="Nhập họ tên hoặc mã Quản lý duyệt (vd: QL01 - Nguyễn Thị Lan)"
                className="w-full px-2.5 py-1 text-xs bg-white border border-amber-300 rounded-lg focus:outline-none focus:border-amber-500"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
