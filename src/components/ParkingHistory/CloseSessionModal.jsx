import React, { useState, useEffect } from "react";
import ConfirmModal from "../common/Modal/ConfirmModal";
import LoadingSpinner from "../common/LoadingSpinner";
import { previewParkingFee } from "../../services/parkingSessionService";
import { formatLicensePlateForDisplay } from "../../utils/plateFormatter";

/**
 * CloseSessionModal
 * Modal xử lý an toàn kết thúc phiên đỗ từ Lịch sử ra/vào bãi.
 * Phân biệt 3 kịch bản nghiệp vụ:
 * 1. cancel_glitch: Hủy phiên do nhận diện sai / trùng camera (0đ, giải phóng ô đỗ, không tính phí).
 * 2. release_slot: Giải phóng ô đỗ ảo bị treo (giữ nguyên xe trong bãi, 0đ).
 * 3. manual_checkout: Xe ra bãi thật nhưng sự cố thiết bị/cúp điện (tính đúng cước và xác nhận thu tiền thực tế).
 */
export default function CloseSessionModal({
  isOpen,
  onClose,
  session,
  onSubmitAction,
  isLoading = false,
}) {
  const [actionType, setActionType] = useState("manual_checkout");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [reason, setReason] = useState("");
  const [feePreview, setFeePreview] = useState(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  useEffect(() => {
    if (isOpen && session) {
      setActionType("manual_checkout");
      setPaymentMethod("CASH");
      setReason("");
      setFeePreview(null);

      // Tải dự tính cước phí nếu là xe ra bãi
      const fetchFee = async () => {
        setIsPreviewLoading(true);
        try {
          const res = await previewParkingFee({
            licensePlate: session.licensePlate || session.license_plate,
            sessionCode: session.sessionCode || session.session_code,
          });
          setFeePreview(res);
        } catch (err) {
          console.warn("Could not preview fee:", err);
        } finally {
          setIsPreviewLoading(false);
        }
      };
      fetchFee();
    }
  }, [isOpen, session]);

  if (!session) return null;

  const licensePlateDisplay = formatLicensePlateForDisplay(
    session.licensePlate || session.license_plate
  );
  const sessionCode = session.sessionCode || session.session_code;
  const currentSlot = session.slotCode || session.slot_display || session.slot_code || "Chưa có vị trí";

  const handleConfirm = () => {
    onSubmitAction({
      actionType,
      session,
      paymentMethod,
      reason: reason.trim(),
      feePreview,
    });
  };

  const isFormValid =
    actionType === "manual_checkout" ||
    (actionType === "cancel_glitch" && reason.trim().length > 0) ||
    (actionType === "release_slot" && reason.trim().length > 0);

  return (
    <ConfirmModal
      isOpen={isOpen}
      onClose={onClose}
      title="Xử lý phiên đỗ xe bất thường"
      description={`Mã phiên: ${sessionCode} · Biển số: ${licensePlateDisplay}`}
      variant={actionType === "cancel_glitch" ? "error" : actionType === "release_slot" ? "info" : "warning"}
      confirmText={
        actionType === "cancel_glitch"
          ? "Xác nhận hủy phiên (0đ)"
          : actionType === "release_slot"
          ? "Giải phóng ô đỗ này"
          : "Xác nhận đã thu tiền & Xuất bãi"
      }
      cancelText="Hủy bỏ"
      loading={isLoading}
      onConfirm={handleConfirm}
      showCloseButton={true}
      size="lg"
    >
      <div className="space-y-4 text-xs text-slate-700 py-1">
        {/* Lựa chọn loại tác vụ */}
        <div>
          <label className="block text-xs font-semibold text-slate-800 mb-2">
            Chọn hình thức xử lý nghiệp vụ:
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {/* Lựa chọn 1: Xuất bãi thủ công có thu tiền */}
            <button
              type="button"
              onClick={() => setActionType("manual_checkout")}
              className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                actionType === "manual_checkout"
                  ? "border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/20 shadow-xs"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div>
                <div className="font-semibold text-slate-900 flex items-center gap-1.5 mb-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Xuất bãi có thu tiền
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Xe ra cổng thực tế khi gặp sự cố barrier hoặc cúp điện.
                </p>
              </div>
              <span className="mt-2 text-[10px] font-medium text-amber-700 uppercase tracking-wider">
                Tính cước thực tế
              </span>
            </button>

            {/* Lựa chọn 2: Hủy phiên lỗi */}
            <button
              type="button"
              onClick={() => setActionType("cancel_glitch")}
              className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                actionType === "cancel_glitch"
                  ? "border-rose-500 bg-rose-50/60 ring-2 ring-rose-500/20 shadow-xs"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div>
                <div className="font-semibold text-slate-900 flex items-center gap-1.5 mb-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  Hủy do lỗi nhận diện
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Camera đọc sai biển số hoặc quét lặp tạo phiên ảo.
                </p>
              </div>
              <span className="mt-2 text-[10px] font-medium text-rose-700 uppercase tracking-wider">
                0đ · Giải phóng ô
              </span>
            </button>

            {/* Lựa chọn 3: Giải phóng ô ảo */}
            <button
              type="button"
              onClick={() => setActionType("release_slot")}
              className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                actionType === "release_slot"
                  ? "border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20 shadow-xs"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div>
                <div className="font-semibold text-slate-900 flex items-center gap-1.5 mb-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Chỉ giải phóng ô đỗ
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Ô đỗ thực tế trống nhưng hệ thống bị khóa sai vị trí.
                </p>
              </div>
              <span className="mt-2 text-[10px] font-medium text-blue-700 uppercase tracking-wider">
                Giữ phiên xe an toàn
              </span>
            </button>
          </div>
        </div>

        {/* Nội dung chi tiết từng kịch bản */}
        {actionType === "manual_checkout" && (
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-700">Dự tính cước phí xuất bãi:</span>
              {isPreviewLoading ? (
                <div className="flex items-center gap-1.5 text-slate-400">
                  <LoadingSpinner size="sm" />
                  <span>Đang tính cước...</span>
                </div>
              ) : (
                <span className="font-bold text-base text-emerald-600 font-mono">
                  {feePreview?.fee_amount !== undefined
                    ? `${Number(feePreview.fee_amount).toLocaleString("vi-VN")}đ`
                    : "Đang tính..."}
                </span>
              )}
            </div>

            <div className="text-[11px] text-slate-500 grid grid-cols-2 gap-2">
              <div>Thời gian đỗ: <strong className="text-slate-800">{feePreview?.duration_text || "—"}</strong></div>
              <div>Loại vé: <strong className="text-slate-800">{feePreview?.has_active_ticket ? "Vé tháng (Miễn phí)" : "Vé lượt"}</strong></div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
                Phương thức thu tiền thực tế tại quầy:
              </label>
              <div className="flex gap-4">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="CASH"
                    checked={paymentMethod === "CASH"}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                  <span className="text-xs font-medium text-slate-800">Tiền mặt (Đã cầm tiền)</span>
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="VIETQR"
                    checked={paymentMethod === "VIETQR"}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                  <span className="text-xs font-medium text-slate-800">Khách chuyển khoản VietQR</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Ghi chú xuất bãi (tùy chọn):
              </label>
              <input
                type="text"
                placeholder="VD: Cổng 2 mất điện, đã thu tiền mặt tại bốt..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        )}

        {actionType === "cancel_glitch" && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-3 text-rose-900">
            <div className="flex gap-2.5">
              <span className="text-rose-600 text-base">⚠️</span>
              <div className="text-[11px] leading-relaxed">
                Hệ thống sẽ <strong>hủy bỏ hoàn toàn</strong> phiên này với cước phí <strong>0đ</strong>, không tạo bất kỳ giao dịch trừ tiền nào và lập tức <strong>giải phóng ô đỗ {currentSlot}</strong>.
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-rose-950 mb-1">
                Lý do hủy phiên <span className="text-rose-600">*</span>:
              </label>
              <input
                type="text"
                required
                placeholder="VD: Camera nhận diện nhầm biển số, xe không có trong bãi..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-rose-300 rounded-lg focus:outline-none focus:border-rose-500 text-slate-800"
              />
            </div>
          </div>
        )}

        {actionType === "release_slot" && (
          <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl space-y-3 text-blue-900">
            <div className="flex gap-2.5">
              <span className="text-blue-600 text-base">ℹ️</span>
              <div className="text-[11px] leading-relaxed">
                Hành động này chỉ trả ô đỗ <strong>{currentSlot}</strong> về trạng thái Trống để xe khác vào đỗ. <strong>Phiên gửi xe vẫn được giữ nguyên</strong> trong hệ thống và <strong>không thu bất kỳ đồng nào</strong> của khách.
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-blue-950 mb-1">
                Lý do giải phóng ô đỗ <span className="text-blue-600">*</span>:
              </label>
              <input
                type="text"
                required
                placeholder="VD: Bảo vệ kiểm tra ô thực tế trống, xe đã chuyển sang vị trí khác..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-blue-300 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800"
              />
            </div>
          </div>
        )}
      </div>
    </ConfirmModal>
  );
}
