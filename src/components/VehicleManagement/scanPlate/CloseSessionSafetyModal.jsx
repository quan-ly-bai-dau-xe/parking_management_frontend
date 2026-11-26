import { useState, useEffect } from "react";
import ConfirmModal from "../../common/modal/ConfirmModal";
import LoadingSpinner from "../../common/LoadingSpinner";
import {
  previewParkingFee,
  calculateParkingFee,
} from "../../../services/parkingSessionService";
import { formatLicensePlateForDisplay } from "../../../utils/plateFormatter";
import { formatCurrencyVND, PAYMENT_METHODS } from "../../../constants/paymentConstants";
import { formatDateTimeVN } from "../../../utils/formatDateTime";
import { calculateParkingDuration } from "../../../utils/parking/parkingFeeCalculator";

const ACTION_TYPES = {
  MANUAL_CHECKOUT: "manual_checkout",
  CANCEL_GLITCH: "cancel_glitch",
};

/**
 * CloseSessionSafetyModal
 * Modal xử lý an toàn khi xe vào làn nhưng phát hiện phiên gửi cũ chưa đóng.
 * Ngăn chặn tuyệt đối việc đóng tự động gây thất thoát doanh thu hoặc nhầm xe.
 */
export default function CloseSessionSafetyModal({
  isOpen,
  onClose,
  licensePlate,
  openSession,
  matchedVehicle = null,
  onConfirmClose,
  isLoading = false,
}) {
  const [actionType, setActionType] = useState(ACTION_TYPES.MANUAL_CHECKOUT);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [reason, setReason] = useState("");
  const [feePreview, setFeePreview] = useState(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || (!licensePlate && !openSession)) return undefined;
    let isCancelled = false;

    queueMicrotask(() => {
      if (isCancelled) return;
      setActionType(ACTION_TYPES.MANUAL_CHECKOUT);
      setPaymentMethod("CASH");
      setReason("");
      setFeePreview(null);
      setIsPreviewLoading(true);
    });

    const fetchFee = async () => {
      try {
        const res = await previewParkingFee({
          licensePlate: licensePlate || openSession?.license_plate || openSession?.licensePlate,
          sessionCode: openSession?.session_code || openSession?.sessionCode,
        });
        if (!isCancelled) setFeePreview(res);
      } catch (err) {
        console.warn("Could not preview fee:", err);
      } finally {
        if (!isCancelled) setIsPreviewLoading(false);
      }
    };
    fetchFee();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, licensePlate, openSession]);

  if (!isOpen) return null;

  const targetPlate = licensePlate || openSession?.license_plate || openSession?.licensePlate || "";
  const displayPlate = formatLicensePlateForDisplay(targetPlate);
  const rawSessionCode =
    openSession?.session_code || openSession?.sessionCode || feePreview?.session_code || "";
  const displaySessionCode = rawSessionCode || "N/A";
  const entryTime = openSession?.entry_time || openSession?.entryTime || feePreview?.entry_time;
  const entryImageUrl = openSession?.entry_image_url || openSession?.plateImageUrl || openSession?.imageUrl;

  // Sử dụng hàm tính toán thời lượng dùng chung, tránh trùng lặp logic
  const localDurationData = calculateParkingDuration(entryTime);

  const walletBalance = Number(
    matchedVehicle?.customer?.walletBalance ??
      openSession?.wallet_balance ??
      feePreview?.wallet_balance ??
      0
  );

  // Tái sử dụng calculateParkingFee chính thống thay vì tự nhân thủ công
  const calculatedFeeAmount = (() => {
    const rawFee = feePreview?.fee_amount;
    if (typeof rawFee === "number" && !Number.isNaN(rawFee)) {
      return rawFee;
    }
    if (localDurationData) {
      const calcResult = calculateParkingFee({
        durationMinutes: localDurationData.durationMinutes,
      });
      return calcResult.feeAmount;
    }
    return 0;
  })();

  const durationDisplay = feePreview?.duration_text || localDurationData?.durationText || "—";
  const isZeroFeeAnomaly = calculatedFeeAmount === 0 && (!entryTime || !localDurationData);
  const isWalletSufficient = walletBalance >= calculatedFeeAmount;

  const isFormValid =
    actionType === ACTION_TYPES.MANUAL_CHECKOUT ||
    (actionType === ACTION_TYPES.CANCEL_GLITCH && reason.trim().length >= 5);

  const handleConfirm = () => {
    if (!isFormValid) return;
    onConfirmClose({
      actionType,
      paymentMethod: actionType === ACTION_TYPES.CANCEL_GLITCH ? "EXEMPT" : paymentMethod,
      reason: reason.trim(),
      feeAmount: actionType === ACTION_TYPES.CANCEL_GLITCH ? 0 : calculatedFeeAmount,
      sessionCode: rawSessionCode || undefined,
      licensePlate: targetPlate,
    });
  };

  return (
    <ConfirmModal
      isOpen={isOpen}
      onClose={onClose}
      title="Xác nhận xử lý phiên gửi cũ còn tồn tại"
      description={`Biển số: ${displayPlate} · Mã phiên: ${displaySessionCode}`}
      variant={actionType === ACTION_TYPES.CANCEL_GLITCH ? "error" : "warning"}
      confirmText={
        actionType === ACTION_TYPES.CANCEL_GLITCH
          ? "Xác nhận hủy phiên do quét sai (0đ)"
          : paymentMethod === PAYMENT_METHODS.WALLET
          ? `⚡ Trừ Ví App (${formatCurrencyVND(calculatedFeeAmount)}) & Xuất bãi`
          : `Xác nhận thu tiền (${formatCurrencyVND(calculatedFeeAmount)}) & Xuất bãi`
      }
      cancelText="Hủy bỏ & Không đóng"
      loading={isLoading}
      onConfirm={handleConfirm}
      showCloseButton={true}
      size="lg"
    >
      <div className="space-y-4 text-xs text-slate-700 py-1">
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5">
          <span className="text-amber-600 text-base">⚠️</span>
          <div className="text-2xs text-amber-900 leading-relaxed">
            <span className="font-bold">Cảnh báo bảo toàn doanh thu: </span>
            Xe đang có một lượt gửi trước đó chưa được ghi nhận xuất bãi. Để tránh thất thoát tiền hoặc ghi đè sai dữ liệu, vui lòng xác định phương án xử lý bên dưới.
          </div>
        </div>

        {/* Thông tin đối soát phiên cũ */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between text-2xs">
            <span className="text-slate-500">Giờ vào phiên cũ:</span>
            <span className="font-medium text-slate-800">
              {entryTime ? formatDateTimeVN(entryTime, "Chưa xác định") : "Chưa xác định"}
            </span>
          </div>
          <div className="flex items-center justify-between text-2xs">
            <span className="text-slate-500">Thời gian đỗ:</span>
            <span className="font-medium text-slate-800">
              {isPreviewLoading && !localDurationData ? (
                <span className="text-slate-400">Đang tính...</span>
              ) : (
                durationDisplay
              )}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200">
            <span className="font-semibold text-slate-700">Cước phí cần thu phiên cũ:</span>
            {isPreviewLoading ? (
              <LoadingSpinner size="sm" />
            ) : isZeroFeeAnomaly ? (
              <span className="font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded text-2xs">
                ⚠️ Chưa rõ giờ vào để tính phí
              </span>
            ) : (
              <span className="font-bold font-mono text-rose-600 text-sm">
                {formatCurrencyVND(calculatedFeeAmount)}
              </span>
            )}
          </div>
          {entryImageUrl && (
            <div className="pt-2 border-t border-slate-200">
              <span className="text-3xs text-slate-500 block mb-1">Ảnh đối soát lúc vào phiên cũ:</span>
              <img
                src={entryImageUrl}
                alt="Ảnh phiên cũ"
                className="w-32 h-20 object-cover rounded border border-slate-300"
              />
            </div>
          )}
        </div>

        {/* Chọn hành động */}
        <div className="space-y-2">
          <label className="block text-2xs font-semibold text-slate-700">
            Chọn hình thức xử lý:
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setActionType(ACTION_TYPES.MANUAL_CHECKOUT)}
              className={`p-2.5 rounded-xl border text-left transition ${
                actionType === ACTION_TYPES.MANUAL_CHECKOUT
                  ? "border-emerald-500 bg-emerald-50/60 text-emerald-900 ring-1 ring-emerald-500"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <div className="font-bold text-2xs flex items-center gap-1.5">
                <span>💰</span> Thu tiền & Đóng phiên
              </div>
              <p className="text-3xs text-slate-500 mt-1">
                Xe thực tế đã ra trước đó nhưng chưa quét mã xuất bãi.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setActionType(ACTION_TYPES.CANCEL_GLITCH)}
              className={`p-2.5 rounded-xl border text-left transition ${
                actionType === ACTION_TYPES.CANCEL_GLITCH
                  ? "border-rose-500 bg-rose-50/60 text-rose-900 ring-1 ring-rose-500"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <div className="font-bold text-2xs flex items-center gap-1.5">
                <span>⚠️</span> Hủy phiên sai sót (0đ)
              </div>
              <p className="text-3xs text-slate-500 mt-1">
                Camera quét nhầm biển số xe khác đang đỗ trong bãi.
              </p>
            </button>
          </div>
        </div>

        {actionType === ACTION_TYPES.MANUAL_CHECKOUT && (
          <div className="space-y-2">
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-2xs">
              <div className="flex items-center gap-2">
                <span className="text-base">📱</span>
                <div>
                  <span className="font-bold text-slate-800 block">Ví Smart Parking của khách</span>
                  <span className="text-3xs text-slate-500">
                    Số dư: <strong className="font-mono text-emerald-700">{formatCurrencyVND(walletBalance)}</strong>
                  </span>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded text-3xs font-bold ${
                isWalletSufficient ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
              }`}>
                {isWalletSufficient ? "Đủ số dư trừ ví" : "Ví thiếu tiền"}
              </span>
            </div>

            <label className="block text-2xs font-semibold text-slate-700 mb-1">
              Hình thức thu cước phiên cũ:
            </label>
            <div className="flex gap-2">
              <label className="flex items-center gap-1.5 text-2xs cursor-pointer border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white hover:bg-slate-50">
                <input
                  type="radio"
                  name="modal_payment_method"
                  value={PAYMENT_METHODS.WALLET}
                  checked={paymentMethod === PAYMENT_METHODS.WALLET}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <span className="font-medium text-emerald-900">⚡ Trừ Ví App</span>
              </label>
              <label className="flex items-center gap-1.5 text-2xs cursor-pointer border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white hover:bg-slate-50">
                <input
                  type="radio"
                  name="modal_payment_method"
                  value={PAYMENT_METHODS.CASH}
                  checked={paymentMethod === PAYMENT_METHODS.CASH}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="text-slate-600 focus:ring-slate-500"
                />
                <span>Tiền mặt</span>
              </label>
              <label className="flex items-center gap-1.5 text-2xs cursor-pointer border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white hover:bg-slate-50">
                <input
                  type="radio"
                  name="modal_payment_method"
                  value={PAYMENT_METHODS.VIETQR}
                  checked={paymentMethod === PAYMENT_METHODS.VIETQR}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="text-slate-600 focus:ring-slate-500"
                />
                <span>Chuyển khoản / QR</span>
              </label>
            </div>
          </div>
        )}

        {actionType === ACTION_TYPES.CANCEL_GLITCH && (
          <div>
            <label className="block text-2xs font-semibold text-rose-800 mb-1">
              Lý do hủy phiên (bắt buộc, tối thiểu 5 ký tự):
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ví dụ: Camera OCR nhầm biển 51A thành 51B, xe thật vẫn đang đỗ..."
              className="w-full text-2xs border border-rose-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-rose-500 text-slate-800 bg-white"
            />
          </div>
        )}
      </div>
    </ConfirmModal>
  );
}
