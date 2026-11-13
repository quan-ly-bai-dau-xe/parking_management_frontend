import { useState, useRef, useEffect } from "react";
import {
  checkInVehicle,
  checkOutVehicle,
  forceCloseSessionAndReleaseSlot,
} from "../../../../services/parkingSessionService";

export const DEFAULT_ENTRY_GATE_ID = 1;
export const DEFAULT_EXIT_GATE_ID = 3;
export const BARRIER_OPEN_DELAY_MS = 600;

export const getEntryErrorMessage = (err) => {
  const backendMsg = err?.data?.message || err?.message;
  const errorCode = err?.data?.code;

  if (errorCode === "MSG-4.5.2-M02" || backendMsg?.includes("đã có xe đk vé")) {
    return (
      "⚠️ Vị trí đỗ này đã có xe đăng ký vé và đang sử dụng. " +
      "Hệ thống đã tự động chọn ô trống khả dụng khác, vui lòng kiểm tra và xác nhận lại."
    );
  }
  if (errorCode === "PROP-4.5.2-P01" || backendMsg?.includes("đang bảo trì")) {
    return "⚠️ Vị trí đỗ này đang bảo trì, vui lòng chọn vị trí khác.";
  }
  if (errorCode === "PROP-4.5.1-P08") {
    return "⛔ Biển số xe nằm trong danh sách đen (Blacklist), không được phép vào bãi.";
  }
  if (errorCode === "MSG-4.5.1-M01" || backendMsg?.includes("hết hạn")) {
    return "⚠️ Vé đăng ký của xe đã hết hạn, hệ thống sẽ tự động chuyển sang chế độ tính vé lượt vãng lai.";
  }
  if (errorCode === "PROP-4.5.1-P05" || backendMsg?.includes("hết chỗ")) {
    return "⚠️ Bãi đỗ xe đã đầy chỗ cho loại phương tiện này. Vui lòng hướng dẫn xe quay đầu.";
  }
  if (errorCode === "PROP-4.5.1-P09" || backendMsg?.includes("đang có phiên")) {
    return "⚠️ Xe đang có phiên gửi chưa kết thúc. Vui lòng bấm nút 'Đóng phiên cũ' hoặc sang Làn Ra.";
  }
  return backendMsg || "Không thể thực hiện Check-in vào bãi. Vui lòng thử lại.";
};

export const captureVideoSnapshot = (videoEl) => {
  if (!videoEl || !videoEl.videoWidth || !videoEl.videoHeight) return null;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = videoEl.videoWidth;
    canvas.height = videoEl.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.85);
  } catch {
    return null;
  }
};

/**
 * useLaneActions
 * Hook chuyên biệt quản lý các thao tác Check-in, Check-out, Cưỡng chế đóng phiên & điều khiển Barrier
 */
export function useLaneActions({
  videoRef,
  detectedPlate,
  matchedVehicle,
  scanDetails,
  detectedData,
  availableSlots,
  selectedSlotId,
  hasOpenSession,
  hasValidTicket,
  exitFeeCalc,
  paymentMethod,
  isFeeExempt,
  onCheckInSuccess,
  setRawLookup,
  setErrorMessage,
}) {
  const actionPendingRef = useRef(false);
  const barrierTimerRef = useRef(null);

  const [isActionPending, setIsActionPending] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState("");
  const [barrierState, setBarrierState] = useState("closed");

  useEffect(() => {
    return () => {
      if (barrierTimerRef.current) {
        clearTimeout(barrierTimerRef.current);
      }
    };
  }, []);

  const triggerBarrierOpen = () => {
    setBarrierState("opening");
    if (barrierTimerRef.current) clearTimeout(barrierTimerRef.current);
    barrierTimerRef.current = setTimeout(() => {
      setBarrierState("opened");
    }, BARRIER_OPEN_DELAY_MS);
  };

  const resetBarrier = () => {
    setBarrierState("closed");
    setActionSuccessMessage("");
  };

  const handleForceCloseSession = async () => {
    const licensePlate = detectedPlate || matchedVehicle?.licensePlate;
    if (!licensePlate || actionPendingRef.current) return;

    actionPendingRef.current = true;
    setIsActionPending(true);
    setErrorMessage("");

    try {
      await forceCloseSessionAndReleaseSlot({
        licensePlate,
        notes: "Cưỡng chế đóng phiên cũ bị treo tại cổng",
      });
      setRawLookup((prev) => (prev ? { ...prev, open_session: null } : null));
      setActionSuccessMessage("✓ Đã đóng phiên cũ thành công. Sẵn sàng đón lượt mới!");
    } catch (err) {
      setErrorMessage(err?.data?.message || err?.message || "Không thể cưỡng chế đóng phiên.");
    } finally {
      actionPendingRef.current = false;
      setIsActionPending(false);
    }
  };

  const handleConfirmEntry = async () => {
    if (actionPendingRef.current) return;
    actionPendingRef.current = true;
    setIsActionPending(true);
    setErrorMessage("");
    setActionSuccessMessage("");

    try {
      const chosenSlot = availableSlots.find((s) => s.id === selectedSlotId);
      const targetSlotId = chosenSlot?.id ?? 1;

      if (hasOpenSession) {
        await forceCloseSessionAndReleaseSlot({
          licensePlate: detectedPlate || matchedVehicle?.licensePlate,
          notes: "Tự động đóng phiên cũ bị treo để tạo phiên check-in mới",
        });
      }

      const entryImageUrl =
        scanDetails?.imageUrl ||
        matchedVehicle?.imageUrl ||
        detectedData?.image_url ||
        detectedData?.plate_image_url ||
        (videoRef?.current ? captureVideoSnapshot(videoRef.current) : null);

      const checkInResult = await checkInVehicle({
        licensePlate: detectedPlate || matchedVehicle?.licensePlate,
        slotId: targetSlotId,
        entryGateId: DEFAULT_ENTRY_GATE_ID,
        imageUrl: entryImageUrl,
      });

      if (checkInResult) {
        setRawLookup((prev) => ({
          ...(prev || {}),
          open_session: {
            id: checkInResult.id,
            session_code: checkInResult.sessionCode || checkInResult.session_code,
            entry_time: checkInResult.entryTimeRaw || checkInResult.entry_time || new Date().toISOString(),
            entry_image_url: checkInResult.plateImageUrl || checkInResult.entry_image_url || entryImageUrl,
            slot_code: chosenSlot?.code || checkInResult.slotCode,
          },
        }));
      }

      if (onCheckInSuccess) {
        onCheckInSuccess(checkInResult);
      }

      triggerBarrierOpen();
      setActionSuccessMessage(
        `✓ Đã Check-in thành công! Mở barrier mời xe vào ô ${chosenSlot ? chosenSlot.code : "A-01"}.`
      );
    } catch (err) {
      setErrorMessage(getEntryErrorMessage(err));
    } finally {
      actionPendingRef.current = false;
      setIsActionPending(false);
    }
  };

  const handleConfirmExit = async () => {
    if (actionPendingRef.current) return;
    actionPendingRef.current = true;
    setIsActionPending(true);
    setErrorMessage("");
    setActionSuccessMessage("");

    try {
      const isExemptActive = hasValidTicket || isFeeExempt;
      const chosenMethod = isExemptActive ? "TICKET_EXEMPT" : paymentMethod;

      await checkOutVehicle({
        licensePlate: detectedPlate || matchedVehicle?.licensePlate,
        exitGateId: DEFAULT_EXIT_GATE_ID,
        paymentMethod: chosenMethod,
        feePaid: isExemptActive ? 0 : exitFeeCalc.feeAmount,
      });

      triggerBarrierOpen();
      setActionSuccessMessage(
        `✓ Check-out hoàn tất (${exitFeeCalc.feeFormatted})! Mở barrier mời xe ra bãi.`
      );
    } catch (err) {
      setErrorMessage(err?.data?.message || err?.message || "Không thể thực hiện Check-out xe.");
    } finally {
      actionPendingRef.current = false;
      setIsActionPending(false);
    }
  };

  return {
    isActionPending,
    actionSuccessMessage,
    setActionSuccessMessage,
    barrierState,
    setBarrierState,
    resetBarrier,
    handleConfirmEntry,
    handleConfirmExit,
    handleForceCloseSession,
  };
}
