import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  validateVehicleEntry,
  checkInVehicle,
  checkOutVehicle,
  forceCloseSessionAndReleaseSlot,
  getAvailableSlotsForCheckIn,
  previewParkingFee,
} from "../../services/parkingSessionService";
import { usePlateAutoDetect } from "../../hooks/usePlateAutoDetect";
import { useToast } from "../../context/ToastContext";
import { usePlateMatching } from "./scanPlate/hooks/usePlateMatching";
import { parseEntryTimeToDate, normalizePlate } from "../../utils/parking/plateScanMapper";

import ScanPlateCameraFeed from "./scanPlate/ScanPlateCameraFeed";
import ScanPlateImageUpload from "./scanPlate/ScanPlateImageUpload";
import EntryLanePanel from "./scanPlate/EntryLanePanel";
import ExitLanePanel from "./scanPlate/ExitLanePanel";
import CloseSessionSafetyModal from "./scanPlate/CloseSessionSafetyModal";
import { formatLicensePlateForDisplay } from "../../utils/plateFormatter";
import { formatTimeWithSecondsVN } from "../../utils/formatDateTime";
import { getEntryErrorMessage, getExitErrorMessage } from "../../utils/parking/gateErrorMapper";
import {
  REASON_UNREGISTERED_VEHICLE,
  REASON_VALID_WALLET_PAID,
  REASON_WALLET_INSUFFICIENT,
  evaluateAutoApplyPolicy,
} from "../../utils/gateAutoApplyPolicy";
import {
  normalizeConfidencePercent,
  evaluateBrowserEntryDecision,
  evaluatePendingEntryLiveness,
  evaluatePendingExitLiveness,
  evaluatePostRegistrationAction,
  executePendingEntryLookupTick,
  syncPendingEntryFromWorkerEvent,
  buildQuickRegisterUrl,
  PENDING_ENTRY_MAX_MS,
} from "../../utils/walkinPendingEntry";
import { lookupVehicleByPlate } from "../../services/plateScanService";
import { getGateWorkerStatus } from "../../services/gateService";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import useModalA11y from "../../hooks/useModalA11y";

const DEFAULT_ENTRY_GATE_ID = 1;
const DEFAULT_EXIT_GATE_ID = 3;
const BARRIER_OPEN_DELAY_MS = 600;
const BARRIER_AUTO_CLOSE_DELAY_MS = 3000;
const AUTO_APPLY_STORAGE_KEY = "gate_auto_apply_enabled";
const WORKER_POLL_INTERVAL_MS = 3000;
const EMPTY_WORKER_EVENT_MARKER = "__EMPTY__";

const DEFAULT_EMPTY_VEHICLES = [];

/**
 * GateCameraControlModal
 * Màn hình Kiểm Soát Cổng: 1 Bên Camera live stream - 1 Bên Làn Vào / Làn Ra
 */
export default function GateCameraControlModal({
  isOpen,
  onClose,
  vehicles = DEFAULT_EMPTY_VEHICLES,
  onVehicleMatched,
  initialPlate = "",
  initialScanResult = null,
  initialLane = "entry",
  gateId = null,
  onDetected = null,
  onSessionChange = null,
}) {
  const videoRef = useRef(null);
  const toast = useToast();
  const actionPendingRef = useRef(false);
  const barrierTimerRef = useRef(null);
  const barrierAutoCloseTimerRef = useRef(null);

  // State phân tách rõ ràng giữa Camera và Tra cứu thủ công (Finding 5)
  const [cameraDetectedPlate, setCameraDetectedPlate] = useState("");
  const [manualInputPlate, setManualInputPlate] = useState("");
  const [detectionSource, setDetectionSource] = useState(null); // 'camera' | 'manual' | null
  const [imageWarningMessage, setImageWarningMessage] = useState("");

  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  // 2 làn tách bạch: 'entry' | 'exit'
  const normalizedInitialLane =
    initialLane === "exit" || initialLane === "out" ? "exit" : "entry";
  const [laneMode, setLaneMode] = useState(normalizedInitialLane);
  const [userSwitchedLane, setUserSwitchedLane] = useState(false);
  const lastInitialLaneRef = useRef("");

  // Đồng bộ làn ban đầu từ modal trigger hoặc BroadcastChannel
  useEffect(() => {
    if (isOpen && initialLane && lastInitialLaneRef.current !== initialLane) {
      lastInitialLaneRef.current = initialLane;
      const mode = (initialLane === "exit" || initialLane === "out") ? "exit" : "entry";
      queueMicrotask(() => {
        setLaneMode((prev) => (prev !== mode ? mode : prev));
        setUserSwitchedLane(false);
      });
    } else if (!isOpen) {
      lastInitialLaneRef.current = "";
      queueMicrotask(() => {
        setUserSwitchedLane(false);
      });
    }
  }, [isOpen, initialLane]);

  const [barrierState, setBarrierState] = useState("closed");
  const [scanSourceMode, setScanSourceMode] = useState("camera"); // 'camera' | 'image'

  const [isActionPending, setIsActionPending] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState("");

  const [paymentMethod, setPaymentMethod] = useState("VNPAY");
  const [isFeeExempt, setIsFeeExempt] = useState(false);
  const [waiverReason, setWaiverReason] = useState("");

  const [backendFeePreview, setBackendFeePreview] = useState(null);
  const [isLoadingFeePreview, setIsLoadingFeePreview] = useState(false);
  const [isSafetyModalOpen, setIsSafetyModalOpen] = useState(false);

  // Dual Mode: Browser Mode (client auto-apply) vs Viewer Mode (server worker telemetry)
  const [autoApplyEnabled, setAutoApplyEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem(AUTO_APPLY_STORAGE_KEY);
      return saved !== null ? saved === "true" : true;
    } catch {
      return true;
    }
  });
  // Dual Mode: null (unknown/first poll) | false (Browser Mode) | true (Viewer Mode)
  const [workerOnline, setWorkerOnline] = useState(null);
  const [isWorkerStatusUnavailable, setIsWorkerStatusUnavailable] = useState(false);
  const [lastAutoEvent, setLastAutoEvent] = useState(null);
  const [informationalMessage, setInformationalMessage] = useState("");
  const [autoApplyBannerMessage, setAutoApplyBannerMessage] = useState("");
  const [pendingEntryInfo, setPendingEntryInfo] = useState(null); // D7: { plate, startedAt, expiresAt }
  const [pendingEntryNowMs, setPendingEntryNowMs] = useState(() => Date.now());
  const [pendingExitInfo, setPendingExitInfo] = useState(null); // D8: { plate, sessionCode, startedAt, lastSeenAt, expiresAt }
  const { role: currentUserRole } = useCurrentUser();
  const autoAppliedPlateRef = useRef("");
  const detectedPlateRef = useRef("");
  const pendingEntryInfoRef = useRef(null);
  const pendingExitInfoRef = useRef(null);
  const detectedDataRef = useRef(null);
  const scanDetailsRef = useRef(null);
  const cameraErrorRef = useRef("");
  const isScanningRef = useRef(false);
  const handleMatchPlateRef = useRef(null);
  const resetDetectionRef = useRef(null);
  const resetMatchingRef = useRef(null);
  const setErrorMessageRef = useRef(null);
  const isMountedRef = useRef(true);
  const isOpenRef = useRef(isOpen);
  const laneModeRef = useRef(laneMode);
  const prevWorkerOnlineRef = useRef(null);
  const consecutivePollFailuresRef = useRef(0);
  const lastServerEventAtRef = useRef("");
  const lastSyncedWorkerEventRef = useRef("");
  const workerInfoBannerActiveRef = useRef(false);
  const wasOpenRef = useRef(false);
  const feePreviewEpochRef = useRef(0);
  const openingEpochRef = useRef(0);
  const awaitingInitialWorkerPollRef = useRef(false);
  const initialPlateRef = useRef(initialPlate);

  const handleToggleAutoApply = useCallback((enabled) => {
    setAutoApplyEnabled(enabled);
    try {
      localStorage.setItem(AUTO_APPLY_STORAGE_KEY, String(enabled));
    } catch {
      // Ignore storage write issues
    }
  }, []);

  const activeGateId =
    gateId && (!userSwitchedLane || laneMode === normalizedInitialLane)
      ? gateId
      : laneMode === "entry"
      ? DEFAULT_ENTRY_GATE_ID
      : DEFAULT_EXIT_GATE_ID;

  const handleKeepAliveSighting = useCallback((seenAtMs) => {
    setPendingEntryInfo((prev) => {
      if (!prev || prev.mode === "worker") return prev;
      return {
        ...prev,
        lastSeenAt: Math.max(prev.lastSeenAt || 0, seenAtMs),
      };
    });
    setPendingExitInfo((prev) => {
      if (!prev || prev.mode === "worker") return prev;
      return {
        ...prev,
        lastSeenAt: Math.max(prev.lastSeenAt || 0, seenAtMs),
      };
    });
  }, []);

  // Stream Camera trực tiếp
  const {
    cameraError,
    videoDevices,
    selectedDeviceId,
    changeCamera,
    statusMessage,
    detectedData,
    rawBoundingBox,
    sourceDimensions,
    resetDetection,
    applyAuthoritativeScan,
  } = usePlateAutoDetect({
    isOpen,
    videoRef,
    gateId: activeGateId,
    keepAlivePlate:
      workerOnline === false
        ? laneMode === "entry" && pendingEntryInfo?.mode !== "worker"
          ? pendingEntryInfo?.plate || ""
          : laneMode === "exit" && pendingExitInfo?.mode !== "worker"
          ? pendingExitInfo?.plate || ""
          : ""
        : "",
    onKeepAliveSighting: handleKeepAliveSighting,
  });

  const clearBackendFeePreview = useCallback(() => {
    feePreviewEpochRef.current += 1;
    setBackendFeePreview(null);
    setIsLoadingFeePreview(false);
  }, []);

  useEffect(() => {
    initialPlateRef.current = initialPlate;
  }, [initialPlate]);

  // Poll worker online status & telemetry
  useEffect(() => {
    if (!isOpen) {
      isOpenRef.current = false;
      openingEpochRef.current += 1;
      awaitingInitialWorkerPollRef.current = false;
      prevWorkerOnlineRef.current = null;
      consecutivePollFailuresRef.current = 0;
      lastServerEventAtRef.current = "";
      lastSyncedWorkerEventRef.current = "";
      workerInfoBannerActiveRef.current = false;
      pendingEntryInfoRef.current = null;
      pendingExitInfoRef.current = null;
      autoAppliedPlateRef.current = "";
      scanDetailsRef.current = null;
      detectedDataRef.current = null;
      feePreviewEpochRef.current += 1;
      if (barrierTimerRef.current) clearTimeout(barrierTimerRef.current);
      if (barrierAutoCloseTimerRef.current) clearTimeout(barrierAutoCloseTimerRef.current);
      if (wasOpenRef.current) {
        wasOpenRef.current = false;
        const closeEpoch = openingEpochRef.current;
        queueMicrotask(() => {
          if (isOpenRef.current || closeEpoch !== openingEpochRef.current) return;
          setLastAutoEvent(null);
          setWorkerOnline(null);
          setIsWorkerStatusUnavailable(false);
          setInformationalMessage("");
          setAutoApplyBannerMessage("");
          setActionSuccessMessage("");
          setErrorMessageRef.current?.("");
          setImageWarningMessage("");
          setBarrierState("closed");
          setPendingEntryInfo(null);
          setPendingExitInfo(null);
          setBackendFeePreview(null);
          setIsLoadingFeePreview(false);
          setCameraDetectedPlate("");
          setManualInputPlate("");
          setDetectionSource(null);
          resetMatchingRef.current?.();
        });
      }
      return undefined;
    }

    isOpenRef.current = true;
    let isMounted = true;

    const fetchStatus = async (isInitial = false) => {
      try {
        if (isMounted && isInitial) {
          const isOpeningModal = !wasOpenRef.current;
          wasOpenRef.current = true;
          openingEpochRef.current += 1;
          // Block Worker Sync effect until the fresh status poll arrives so a same-tick reopen cannot replay stale state
          awaitingInitialWorkerPollRef.current = true;
          prevWorkerOnlineRef.current = null;
          consecutivePollFailuresRef.current = 0;
          setIsWorkerStatusUnavailable(false);
          setWorkerOnline(null);
          setLastAutoEvent(null);
          if (isOpeningModal) {
            workerInfoBannerActiveRef.current = false;
            setInformationalMessage("");
            setAutoApplyBannerMessage("");
            setActionSuccessMessage("");
            setErrorMessageRef.current?.("");
            setImageWarningMessage("");
            setBarrierState("closed");
            setPendingEntryInfo(null);
            setPendingExitInfo(null);
            if (!initialPlateRef.current) {
              clearBackendFeePreview();
              setCameraDetectedPlate("");
              setManualInputPlate("");
              setDetectionSource(null);
              resetMatchingRef.current?.();
            }
          }
        }
        const status = await getGateWorkerStatus(activeGateId);
        if (isMounted) {
          if (!status || status.success === false) {
            consecutivePollFailuresRef.current += 1;
            if (consecutivePollFailuresRef.current >= 3) {
              setIsWorkerStatusUnavailable(true);
            }
            return;
          }

          consecutivePollFailuresRef.current = 0;
          setIsWorkerStatusUnavailable(false);
          awaitingInitialWorkerPollRef.current = false;

          const nextOnline = Boolean(status.worker_online);
          const wasOnline = prevWorkerOnlineRef.current;
          prevWorkerOnlineRef.current = nextOnline;

          if (wasOnline === true && nextOnline === false) {
            // Prevent retroactive client submission of a plate seen during Viewer Mode
            // and re-arm camera detection so the next arriving vehicle auto-applies cleanly
            if (detectedPlateRef.current) {
              autoAppliedPlateRef.current = detectedPlateRef.current;
            }
            resetDetection();
          }

          if (nextOnline === false) {
            if (workerInfoBannerActiveRef.current) {
              workerInfoBannerActiveRef.current = false;
              setInformationalMessage("");
            }
            setPendingEntryInfo((prev) => (prev?.mode === "worker" ? null : prev));
            setPendingExitInfo((prev) => (prev?.mode === "worker" ? null : prev));
          }

          setWorkerOnline(nextOnline);
          if (status.last_auto_event) {
            setLastAutoEvent(status.last_auto_event);
            const eventAt = status.last_auto_event.occurred_at || "";
            if (nextOnline && eventAt && eventAt !== lastServerEventAtRef.current) {
              lastServerEventAtRef.current = eventAt;
              resetDetection();
            }
          } else {
            setLastAutoEvent(null);
          }
        }
      } catch {
        if (isMounted) {
          consecutivePollFailuresRef.current += 1;
          if (consecutivePollFailuresRef.current >= 3) {
            setIsWorkerStatusUnavailable(true);
          }
        }
      }
    };

    fetchStatus(true);
    const intervalId = setInterval(() => {
      fetchStatus(false);
    }, WORKER_POLL_INTERVAL_MS);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [isOpen, activeGateId, resetDetection, clearBackendFeePreview]);

  const triggerBarrierOpen = useCallback(() => {
    setBarrierState("opening");
    if (barrierTimerRef.current) clearTimeout(barrierTimerRef.current);
    if (barrierAutoCloseTimerRef.current) clearTimeout(barrierAutoCloseTimerRef.current);

    barrierTimerRef.current = setTimeout(() => {
      setBarrierState("opened");
      barrierAutoCloseTimerRef.current = setTimeout(() => {
        setBarrierState("closed");
      }, BARRIER_AUTO_CLOSE_DELAY_MS);
    }, BARRIER_OPEN_DELAY_MS);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      if (barrierTimerRef.current) {
        clearTimeout(barrierTimerRef.current);
        barrierTimerRef.current = null;
      }
      if (barrierAutoCloseTimerRef.current) {
        clearTimeout(barrierAutoCloseTimerRef.current);
        barrierAutoCloseTimerRef.current = null;
      }
    }
    return () => {
      if (barrierTimerRef.current) {
        clearTimeout(barrierTimerRef.current);
        barrierTimerRef.current = null;
      }
      if (barrierAutoCloseTimerRef.current) {
        clearTimeout(barrierAutoCloseTimerRef.current);
        barrierAutoCloseTimerRef.current = null;
      }
    };
  }, [isOpen, laneMode]);

  // Sync Worker Mode waiting banners & barrier/history transitions from lastAutoEvent (D2, D3, D8)
  useEffect(() => {
    if (!isOpen || workerOnline !== true || awaitingInitialWorkerPollRef.current) {
      lastSyncedWorkerEventRef.current = "";
      return undefined;
    }

    let isCancelled = false;
    const effectEpoch = openingEpochRef.current;
    const isStaleSync = () =>
      isCancelled ||
      !isOpenRef.current ||
      awaitingInitialWorkerPollRef.current ||
      effectEpoch !== openingEpochRef.current;
    const cleanup = () => {
      isCancelled = true;
    };

    if (laneMode === "exit") {
      queueMicrotask(() => {
        if (isStaleSync()) return;
        setPendingEntryInfo((prev) => (prev?.mode === "worker" ? null : prev));
      });
      if (!lastAutoEvent) {
        // Mark initial idle poll as synced so the first GATE_AUTO_CHECK_OUT triggers banner/barrier
        lastSyncedWorkerEventRef.current = EMPTY_WORKER_EVENT_MARKER;
        const shouldClearWorkerInfo = workerInfoBannerActiveRef.current;
        workerInfoBannerActiveRef.current = false;
        queueMicrotask(() => {
          if (isStaleSync()) return;
          setPendingExitInfo((prev) => (prev?.mode === "worker" ? null : prev));
          if (shouldClearWorkerInfo) {
            setInformationalMessage("");
          }
        });
        return cleanup;
      }

      const eventKey = `${lastAutoEvent.action || ""}|${lastAutoEvent.reason || ""}|${lastAutoEvent.occurred_at || ""}`;
      const isNewEvent = eventKey !== lastSyncedWorkerEventRef.current;
      const hadSyncedBefore = lastSyncedWorkerEventRef.current !== "";
      lastSyncedWorkerEventRef.current = eventKey;

      const nowMs = Date.now();
      const parsedStart = Date.parse(lastAutoEvent.occurred_at || "");
      const startedAt = Number.isFinite(parsedStart) ? parsedStart : nowMs;
      const expiresAt = startedAt + PENDING_ENTRY_MAX_MS;

      queueMicrotask(() => {
        if (isStaleSync()) return;
        if (lastAutoEvent.action === "GATE_AUTO_CHECK_OUT") {
          workerInfoBannerActiveRef.current = false;
          setPendingExitInfo((prev) => (prev?.mode === "worker" ? null : prev));
          if (isNewEvent && hadSyncedBefore) {
            triggerBarrierOpen();
            const plateLabel = lastAutoEvent.license_plate_masked || "";
            const checkoutTag =
              lastAutoEvent.reason === "VALID_FEE_ZERO"
                ? "(Cước: 0đ)"
                : lastAutoEvent.reason === "VALID_WALLET_PAID"
                ? "(Đã trừ ví)"
                : "";
            setAutoApplyBannerMessage(
              `Đã tự động ghi nhận Check-out cho xe ${plateLabel}${checkoutTag ? ` ${checkoutTag}` : ""}. Mở barrier.`
            );
            setInformationalMessage("");
            if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
              window.dispatchEvent(
                new CustomEvent("parking-session-changed", {
                  detail: {
                    action: "check-out",
                    licensePlate: plateLabel,
                    reason: lastAutoEvent.reason || "",
                  },
                })
              );
            }
          }
        } else if (lastAutoEvent.action === "GATE_AUTO_PAYMENT_REQUIRED") {
          const isWalletInsufficient = lastAutoEvent.reason === "WALLET_INSUFFICIENT";
          workerInfoBannerActiveRef.current = true;
          if (isWalletInsufficient && nowMs < expiresAt) {
            setPendingExitInfo({
              mode: "worker",
              plate: "",
              plateMasked: lastAutoEvent.license_plate_masked || "",
              reason: lastAutoEvent.reason || "",
              startedAt,
              lastSeenAt: nowMs,
              expiresAt,
            });
            setInformationalMessage(
              "Số dư ví không đủ. Hệ thống đang chờ khách nạp bù ví hoặc thanh toán tại quầy (tự động kiểm tra mỗi 5 giây)."
            );
          } else {
            setPendingExitInfo((prev) => (prev?.mode === "worker" ? null : prev));
            setInformationalMessage(
              "Phương tiện có cước phí đỗ xe phát sinh, vui lòng thanh toán tại quầy thu ngân."
            );
          }
        } else {
          setPendingExitInfo((prev) => (prev?.mode === "worker" ? null : prev));
        }
      });
      return cleanup;
    }

    if (laneMode !== "entry") {
      queueMicrotask(() => {
        if (isStaleSync()) return;
        setPendingEntryInfo((prev) => (prev?.mode === "worker" ? null : prev));
      });
      return cleanup;
    }

    if (!lastAutoEvent) {
      // Mark initial idle poll as synced so the first GATE_AUTO_CHECK_IN triggers banner/barrier
      lastSyncedWorkerEventRef.current = EMPTY_WORKER_EVENT_MARKER;
      const shouldClearWorkerInfo = workerInfoBannerActiveRef.current;
      workerInfoBannerActiveRef.current = false;
      queueMicrotask(() => {
        if (isStaleSync()) return;
        setPendingEntryInfo((prev) => (prev?.mode === "worker" ? null : prev));
        if (shouldClearWorkerInfo) {
          setInformationalMessage("");
        }
      });
      return cleanup;
    }

    const eventKey = `${lastAutoEvent.action || ""}|${lastAutoEvent.reason || ""}|${lastAutoEvent.occurred_at || ""}`;
    const isNewEvent = eventKey !== lastSyncedWorkerEventRef.current;
    const hadSyncedBefore = lastSyncedWorkerEventRef.current !== "";
    lastSyncedWorkerEventRef.current = eventKey;

    const nowMs = Date.now();
    const nextPending = syncPendingEntryFromWorkerEvent(null, lastAutoEvent, nowMs);
    queueMicrotask(() => {
      if (isStaleSync()) return;
      setPendingEntryInfo(nextPending);
      if (nextPending) {
        setPendingEntryNowMs(nowMs);
      }
      if (isNewEvent && hadSyncedBefore) {
        if (lastAutoEvent.action === "GATE_AUTO_CHECK_IN") {
          workerInfoBannerActiveRef.current = false;
          triggerBarrierOpen();
          setAutoApplyBannerMessage(
            `Đã tự động ghi nhận Check-in cho xe ${lastAutoEvent.license_plate_masked || ""}. Mở barrier.`
          );
          setInformationalMessage("");
        } else if (lastAutoEvent.reason === "PENDING_ENTRY_EXPIRED") {
          workerInfoBannerActiveRef.current = true;
          setInformationalMessage(
            "Xe chờ đăng ký đã rời làn hoặc hết thời gian chờ. Đã dừng trạng thái chờ."
          );
        }
      }
    });
    return cleanup;
  }, [isOpen, workerOnline, laneMode, lastAutoEvent, triggerBarrierOpen]);

  const fetchFeePreview = useCallback(async (plate, sessionCode) => {
    const cleanPlate = (plate || "").trim();
    const cleanCode = (sessionCode || "").trim();
    const requestEpoch = ++feePreviewEpochRef.current;
    if (!cleanPlate && !cleanCode) {
      setBackendFeePreview(null);
      return;
    }
    setIsLoadingFeePreview(true);
    try {
      const preview = await previewParkingFee({
        licensePlate: cleanPlate || undefined,
        sessionCode: cleanCode || undefined,
      });
      if (
        requestEpoch !== feePreviewEpochRef.current ||
        !isMountedRef.current ||
        !isOpenRef.current
      ) {
        return;
      }
      setBackendFeePreview(preview || null);
    } catch (err) {
      if (
        requestEpoch !== feePreviewEpochRef.current ||
        !isMountedRef.current ||
        !isOpenRef.current
      ) {
        return;
      }
      const status = err?.status || err?.response?.status;
      if (status === 404 || err?.data?.code === "PROP-4.5.1-P06") {
        setBackendFeePreview(null);
      }
      console.warn("Could not preview parking fee from backend:", err?.message || err);
    } finally {
      if (requestEpoch === feePreviewEpochRef.current && isMountedRef.current) {
        setIsLoadingFeePreview(false);
      }
    }
  }, []);

  const handleMatchSuccess = useCallback((result, rawInput) => {
    if (!isOpenRef.current) return;
    if (!result?.openSession && !result?.rawLookup?.open_session) {
      clearBackendFeePreview();
      return;
    }
    fetchFeePreview(
      rawInput,
      result.openSession?.session_code || result.rawLookup?.open_session?.session_code
    );
  }, [clearBackendFeePreview, fetchFeePreview]);

  // Memoize callback so GateCameraControlModal re-renders (1s countdown) do not recreate handleMatchPlate
  const handleResetBarrier = useCallback(() => {
    setActionSuccessMessage("");
    setBarrierState("closed");
    setImageWarningMessage("");
  }, []);

  // Hook tra cứu & đối soát biển số xe (Single Source of Truth)
  const {
    detectedPlate,
    setDetectedPlate,
    matchedVehicle,
    scanDetails,
    setScanDetails,
    isScanning,
    errorMessage,
    setErrorMessage,
    rawLookup,
    setRawLookup,
    handleMatchPlate,
    handleImageScanned,
    resetMatching,
  } = usePlateMatching({
    vehicles,
    onResetBarrier: handleResetBarrier,
    onMatchSuccess: handleMatchSuccess,
  });

  useEffect(() => {
    detectedPlateRef.current = detectedPlate;
    pendingEntryInfoRef.current = pendingEntryInfo;
    pendingExitInfoRef.current = pendingExitInfo;
    detectedDataRef.current = detectedData;
    scanDetailsRef.current = scanDetails;
    cameraErrorRef.current = cameraError;
    isScanningRef.current = isScanning;
    handleMatchPlateRef.current = handleMatchPlate;
    resetDetectionRef.current = resetDetection;
    resetMatchingRef.current = resetMatching;
    setErrorMessageRef.current = setErrorMessage;
    isOpenRef.current = isOpen;
    laneModeRef.current = laneMode;
  }, [
    detectedPlate,
    pendingEntryInfo,
    pendingExitInfo,
    detectedData,
    scanDetails,
    cameraError,
    isScanning,
    handleMatchPlate,
    resetDetection,
    resetMatching,
    setErrorMessage,
    isOpen,
    laneMode,
  ]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Nạp danh sách ô đỗ khả dụng khi ở Làn Vào
  useEffect(() => {
    if (!isOpen || laneMode !== "entry") return;
    let isCancelled = false;

    async function loadSlots() {
      setIsLoadingSlots(true);
      try {
        const vehicleType = matchedVehicle?.vehicleType || "CAR";
        const vehiclePlate = detectedPlate || matchedVehicle?.licensePlate || "";
        const slots = await getAvailableSlotsForCheckIn({
          vehicleType,
          licensePlate: vehiclePlate,
          filterReserved: true,
        });
        if (!isCancelled && Array.isArray(slots) && slots.length > 0) {
          setAvailableSlots(slots);
          const assignedId = matchedVehicle?.parkingSlot?.slotId;
          const assignedExists = slots.some((s) => s.id === assignedId);
          setSelectedSlotId(assignedExists ? assignedId : slots[0].id);
        } else if (!isCancelled) {
          setAvailableSlots([]);
          setSelectedSlotId(null);
        }
      } catch (err) {
        console.warn("Không thể tải ô đỗ khả dụng:", err?.message);
        if (!isCancelled) {
          setAvailableSlots([]);
          setSelectedSlotId(null);
          setErrorMessage(
            err?.data?.message || err?.message || "Không thể tải danh sách ô đỗ khả dụng từ máy chủ."
          );
        }
      } finally {
        if (!isCancelled) setIsLoadingSlots(false);
      }
    }

    loadSlots();
    return () => {
      isCancelled = true;
    };
  }, [isOpen, laneMode, matchedVehicle, detectedPlate, setErrorMessage]);

  const [currentTimestamp, setCurrentTimestamp] = useState(() => Date.now());

  const handleGateImageScanned = useCallback(
    (scanResult, previewUrl) => {
      const extractedPlate = scanResult?.plate_final || scanResult?.plate_raw || "";
      if (extractedPlate) {
        const formatted = formatLicensePlateForDisplay(extractedPlate);
        setManualInputPlate(formatted);
        setCameraDetectedPlate(extractedPlate);
        setDetectionSource("image");
      }
      handleImageScanned(scanResult, previewUrl);
    },
    [handleImageScanned]
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimestamp(Date.now());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const lastInitialPlateRef = useRef("");
  const lastDetectedPlateRef = useRef("");

  // Khởi tạo biển số ban đầu nếu được truyền từ Header Scanner modal
  useEffect(() => {
    if (isOpen && initialPlate && lastInitialPlateRef.current !== initialPlate) {
      lastInitialPlateRef.current = initialPlate;
      const clean = initialPlate.trim().toUpperCase();
      lastDetectedPlateRef.current = clean;
      const formatted = formatLicensePlateForDisplay(clean);
      setCameraDetectedPlate(clean);
      setManualInputPlate(formatted);
      setDetectionSource("camera");
      setDetectedPlate(clean);
      handleMatchPlate(clean);
      if (initialScanResult && typeof initialScanResult === "object") {
        const conf =
          initialScanResult.confidence ??
          initialScanResult.best_candidate?.confidence ??
          null;
        setScanDetails({
          confidence: conf,
          reviewStatus: initialScanResult.review_status || null,
          plate: formatted,
          source: "camera",
          imageUrl:
            initialScanResult.image_url ||
            initialScanResult.plate_image_url ||
            initialScanResult.cropped_plate_image ||
            null,
        });
      } else {
        setScanDetails(null);
      }
    } else if (!isOpen) {
      lastInitialPlateRef.current = "";
    }
  }, [isOpen, initialPlate, initialScanResult, handleMatchPlate, setDetectedPlate, setScanDetails]);

  // Lắng nghe camera tự động nhận diện biển số
  useEffect(() => {
    const plate = detectedData?.plate_final;
    const normPlate = String(plate || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    const normLast = String(lastDetectedPlateRef.current || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    if (normPlate && normPlate !== normLast) {
      lastDetectedPlateRef.current = plate;
      autoAppliedPlateRef.current = "";
      workerInfoBannerActiveRef.current = false;
      setInformationalMessage("");
      setAutoApplyBannerMessage("");
      setBackendFeePreview(null);
      setIsFeeExempt(false);
      setWaiverReason("");
      setPendingEntryInfo((prev) => (prev?.mode === "worker" ? prev : null));
      setPendingExitInfo(null);
      const formatted = formatLicensePlateForDisplay(plate);
      setCameraDetectedPlate(plate);
      setManualInputPlate(formatted);
      setDetectionSource("camera");
      setDetectedPlate(plate);
      handleMatchPlate(plate);
      const conf =
        detectedData?.confidence ??
        detectedData?.best_candidate?.confidence ??
        null;
      setScanDetails({
        confidence: conf,
        reviewStatus: detectedData?.review_status || null,
        plate: formatted,
        source: "camera",
        imageUrl: detectedData?.image_url || detectedData?.plate_image_url || null,
      });
    } else if (!isOpen) {
      lastDetectedPlateRef.current = "";
      autoAppliedPlateRef.current = "";
    }
  }, [detectedData, isOpen, handleMatchPlate, setDetectedPlate, setScanDetails]);

  const handleManualSearch = (e) => {
    e.preventDefault();
    const target = (manualInputPlate || detectedPlate || "").trim();
    if (!target) return;
    const formatted = formatLicensePlateForDisplay(target);
    autoAppliedPlateRef.current = "";
    workerInfoBannerActiveRef.current = false;
    setInformationalMessage("");
    setAutoApplyBannerMessage("");
    setBackendFeePreview(null);
    setIsFeeExempt(false);
    setWaiverReason("");
    setPendingEntryInfo(null);
    setPendingExitInfo(null);
    setDetectionSource("manual");
    setScanDetails(null); // XÓA scanDetails per Finding 5 -> badge AI 98.5% biến mất hoàn toàn
    setManualInputPlate(formatted);
    setDetectedPlate(target);
    handleMatchPlate(target);
    resetDetection(); // Finding 3: Sẵn sàng cho camera state machine phát hiện biển số mới
  };

  const handleReset = () => {
    resetMatching();
    lastDetectedPlateRef.current = "";
    autoAppliedPlateRef.current = "";
    workerInfoBannerActiveRef.current = false;
    setInformationalMessage("");
    setAutoApplyBannerMessage("");
    setCameraDetectedPlate("");
    setManualInputPlate("");
    setDetectionSource(null);
    setImageWarningMessage("");
    setActionSuccessMessage("");
    setBarrierState("closed");
    if (barrierTimerRef.current) clearTimeout(barrierTimerRef.current);
    if (barrierAutoCloseTimerRef.current) clearTimeout(barrierAutoCloseTimerRef.current);
    setBackendFeePreview(null);
    setPendingEntryInfo(null);
    setPendingExitInfo(null);
    setIsFeeExempt(false);
    setWaiverReason("");
    resetDetection();
  };

  const handleApplySelection = () => {
    if (matchedVehicle && onVehicleMatched) {
      onVehicleMatched(matchedVehicle);
    }
    if (onDetected && detectedPlate) {
      onDetected(detectedPlate, matchedVehicle);
    }
    onClose();
  };

  const isManualLookup = detectionSource === "manual";
  const hasOpenSession = Boolean(rawLookup?.open_session);
  const entryValidation = useMemo(
    () =>
      validateVehicleEntry({
        vehicle: matchedVehicle,
        lookupResult: rawLookup,
      }),
    [matchedVehicle, rawLookup]
  );
  const isBlacklisted = Boolean(
    rawLookup?.is_blacklisted ||
      rawLookup?.status === "BLACKLISTED" ||
      detectedData?.is_blacklisted ||
      matchedVehicle?.isBlacklisted ||
      matchedVehicle?.status === "BLACKLISTED" ||
      entryValidation.reasonCode === "BLACKLISTED" ||
      (!entryValidation.eligible && entryValidation.reasonCode === "BLACKLISTED")
  );
  const hasValidTicket = Boolean(
    matchedVehicle?.ticketState === "active" ||
      matchedVehicle?.ticket?.is_valid ||
      rawLookup?.active_ticket
  );

  const calculatedDurationMinutes = useMemo(() => {
    const rawEntryTime = rawLookup?.open_session?.entry_time;
    if (!rawEntryTime) return 0;
    const entryDate = parseEntryTimeToDate(rawEntryTime);
    if (!entryDate) return 0;
    const diffMs = currentTimestamp - entryDate.getTime();
    return Math.max(1, Math.floor(diffMs / 60000));
  }, [rawLookup?.open_session?.entry_time, currentTimestamp]);

  const handleOpenSafetyModal = () => {
    setIsSafetyModalOpen(true);
  };

  const handleConfirmCloseSafety = async (options = {}) => {
    const licensePlate = options.licensePlate || detectedPlate || matchedVehicle?.licensePlate;
    if (!licensePlate || actionPendingRef.current) return;

    actionPendingRef.current = true;
    setIsActionPending(true);
    setErrorMessage("");

    try {
      const isGlitch = options.actionType === "cancel_glitch";
      const chosenMethod = options.paymentMethod || "CASH";
      const waiveFee = isGlitch || chosenMethod === "EXEMPT";
      const notes = isGlitch
        ? `Hủy phiên do quét sai/nhầm: ${options.reason || "Ngoại lệ"}`
        : !isGlitch && chosenMethod === "WALLET" && options.feeAmount > 0
        ? `${options.reason ? options.reason + " - " : ""}Thanh toán qua Ví App (${options.feeAmount.toLocaleString("vi-VN")}đ)`
        : options.reason || "Đóng phiên cũ có thu tiền tại làn kiểm soát";

      await forceCloseSessionAndReleaseSlot({
        licensePlate,
        sessionCode: options.sessionCode,
        paymentMethod: waiveFee ? "CASH" : chosenMethod,
        waiveFee,
        waiverReason: waiveFee ? options.reason || notes : "",
        notes,
      });
      setRawLookup((prev) => (prev ? { ...prev, open_session: null } : null));
      setIsSafetyModalOpen(false);
      setActionSuccessMessage(
        isGlitch
          ? "✓ Đã hủy phiên cũ do quét nhầm thành công (0đ)."
          : chosenMethod === "WALLET"
          ? `✓ Đã trừ ${(options.feeAmount || 0).toLocaleString("vi-VN")}đ vào Ví App và đóng phiên thành công!`
          : "✓ Đã thu tiền & đóng phiên cũ thành công. Sẵn sàng đón lượt mới!"
      );
    } catch (err) {
      setErrorMessage(err?.data?.message || err?.message || "Không thể cưỡng chế đóng phiên.");
    } finally {
      actionPendingRef.current = false;
      setIsActionPending(false);
    }
  };

  const handleConfirmEntry = useCallback(async () => {
    if (actionPendingRef.current) return;
    if (hasOpenSession) {
      setErrorMessage("⛔ Xe đang có phiên gửi cũ chưa đóng. Vui lòng đối soát và đóng phiên cũ trước.");
      return;
    }

    actionPendingRef.current = true;
    setIsActionPending(true);
    setErrorMessage("");
    setImageWarningMessage("");
    setActionSuccessMessage("");
    workerInfoBannerActiveRef.current = false;
    setInformationalMessage("");

    try {
      // Preserve upstream explicit slot selection + Anti-Passback guard (no silent force-close)
      // while allowing fixed-ticket assignedSlotId fallback when selectedSlotId is unset.
      const assignedSlotId = matchedVehicle?.parkingSlot?.slotId;
      const chosenSlot =
        availableSlots.find((s) => s.id === selectedSlotId) ||
        (assignedSlotId ? availableSlots.find((s) => s.id === assignedSlotId) : null) ||
        availableSlots[0] ||
        null;
      if (!chosenSlot) {
        setErrorMessage("⚠️ Vui lòng chọn một vị trí đỗ khả dụng trước khi xác nhận vào bãi.");
        return;
      }
      const targetSlotId = chosenSlot.id;

      // Sửa lỗi nghiêm trọng G-FE-01: TUYỆT ĐỐI KHÔNG gửi chuỗi Base64 Data URL từ canvas
      let entryImageUrl = null;
      if (scanDetails?.imageUrl && scanDetails.imageUrl.startsWith("http")) {
        entryImageUrl = scanDetails.imageUrl;
      } else if (detectedData?.image_url && detectedData.image_url.startsWith("http")) {
        entryImageUrl = detectedData.image_url;
      } else if (applyAuthoritativeScan) {
        try {
          const authResult = await applyAuthoritativeScan();
          if (authResult?.success && authResult?.data?.image_url) {
            entryImageUrl = authResult.data.image_url;
          } else if (authResult?.error) {
            console.warn("Authoritative scan upload failed (502/Cloudinary):", authResult.error);
            setImageWarningMessage(
              "⚠️ Không thể tải ảnh lên máy chủ (Cloudinary). Phiên gửi vẫn được tạo thành công không kèm ảnh."
            );
          }
        } catch (authErr) {
          console.warn("Authoritative scan exception:", authErr);
          setImageWarningMessage(
            "⚠️ Không thể tải ảnh lên máy chủ (Cloudinary). Phiên gửi vẫn được tạo thành công không kèm ảnh."
          );
        }
      }

      // Đảm bảo không còn tồn dư data URL
      if (typeof entryImageUrl === "string" && entryImageUrl.startsWith("data:")) {
        entryImageUrl = null;
      }

      const recognitionSource = detectionSource === "manual" ? "MANUAL" : "AI";
      const rawConfidence =
        scanDetails?.confidence ??
        detectedData?.confidence ??
        detectedData?.best_candidate?.confidence ??
        null;
      const numericConfidence =
        typeof rawConfidence === "number"
          ? rawConfidence
          : typeof rawConfidence === "string" && !isNaN(Number(rawConfidence))
          ? Number(rawConfidence)
          : null;

      const checkInResult = await checkInVehicle({
        licensePlate: detectedPlate || matchedVehicle?.licensePlate,
        slotId: targetSlotId,
        entryGateId: activeGateId,
        recognitionSource,
        aiConfidence: numericConfidence,
        imageUrl: entryImageUrl,
      });

      const checkedInSession = checkInResult?.session || checkInResult;
      const checkedInLookup = checkInResult?.vehicle_lookup || null;

      if (checkedInSession || checkedInLookup) {
        setRawLookup((prev) => ({
          ...(prev || {}),
          ...(checkedInLookup || {}),
          open_session: {
            ...(checkedInLookup?.open_session || {}),
            id: checkedInSession?.id ?? checkedInLookup?.open_session?.id,
            session_code:
              checkedInSession?.sessionCode ||
              checkedInSession?.session_code ||
              checkedInLookup?.open_session?.session_code,
            entry_time:
              checkedInSession?.entryTimeRaw ||
              checkedInSession?.entry_time ||
              checkedInLookup?.open_session?.entry_time ||
              new Date().toISOString(),
            entry_image_url:
              checkedInSession?.plateImageUrl ||
              checkedInSession?.entry_image_url ||
              checkedInLookup?.open_session?.entry_image_url ||
              entryImageUrl,
            slot_code:
              chosenSlot?.code ||
              checkedInSession?.slotCode ||
              checkedInSession?.slot_code ||
              checkedInLookup?.parking_position?.slot_code,
          },
        }));
      }

      // Barrier tự động mở 600ms và tự động đóng sau 3000ms (G-FE-02)
      setPendingEntryInfo(null);
      setPendingExitInfo(null);
      triggerBarrierOpen();
      resetDetection();

      const plate = detectedPlate || matchedVehicle?.licensePlate;
      const plateDisplay = formatLicensePlateForDisplay(plate);
      if (autoAppliedPlateRef.current && autoAppliedPlateRef.current === plate) {
        setAutoApplyBannerMessage(
          `Đã tự động ghi nhận Check-in cho xe ${plateDisplay}. Mở barrier.`
        );
      }

      setActionSuccessMessage(
        `✓ Đã Check-in thành công! Mở barrier mời xe vào ô ${chosenSlot ? chosenSlot.code : "A-01"}.`
      );

      if (onSessionChange) {
        onSessionChange("check-in", checkInResult);
      }

      // Phát sự kiện đồng bộ tức thì với trang Lịch sử ra/vào (G-FE-04)
      const sessionCode =
        checkedInSession?.sessionCode ||
        checkedInSession?.session_code ||
        checkedInLookup?.open_session?.session_code;
      if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
        window.dispatchEvent(
          new CustomEvent("parking-session-changed", {
            detail: {
              action: "check-in",
              licensePlate: plate,
              sessionCode,
            },
          })
        );
      }
    } catch (err) {
      const status = err?.status || err?.response?.status;
      const errorCode = err?.data?.code || err?.code;
      const errMsg = err?.data?.message || err?.message || "";
      const is409 =
        status === 409 ||
        errorCode === "PROP-4.5.1-P07" ||
        errorCode === "CONFLICT" ||
        errMsg.includes("đang có phiên") ||
        errMsg.includes("409");

      if (is409) {
        setErrorMessage("");
        workerInfoBannerActiveRef.current = false;
        setInformationalMessage(
          "Phương tiện đã được ghi nhận vào bãi trước đó trên hệ thống (409 Conflict)."
        );
      } else {
        setErrorMessage(getEntryErrorMessage(err));
      }
    } finally {
      actionPendingRef.current = false;
      setIsActionPending(false);
    }
  }, [
    activeGateId,
    applyAuthoritativeScan,
    availableSlots,
    detectedData,
    detectedPlate,
    detectionSource,
    hasOpenSession,
    matchedVehicle,
    onSessionChange,
    resetDetection,
    scanDetails,
    selectedSlotId,
    setErrorMessage,
    setRawLookup,
    triggerBarrierOpen,
  ]);

  const handleConfirmExit = useCallback(async (overridePaymentMethod = null) => {
    if (actionPendingRef.current) return;
    actionPendingRef.current = true;
    setIsActionPending(true);
    setErrorMessage("");
    setImageWarningMessage("");
    setActionSuccessMessage("");
    workerInfoBannerActiveRef.current = false;
    setInformationalMessage("");

    try {
      const validOverride =
        typeof overridePaymentMethod === "string" ? overridePaymentMethod : null;
      const plate = detectedPlate || matchedVehicle?.licensePlate;
      const hasBackendPreview =
        backendFeePreview !== null &&
        backendFeePreview !== undefined &&
        backendFeePreview.fee_amount !== undefined &&
        backendFeePreview.fee_amount !== null;
      const isTicketActive = hasBackendPreview
        ? Number(backendFeePreview.fee_amount) === 0 &&
          Boolean(
            backendFeePreview.has_active_ticket ||
            backendFeePreview.is_exempt ||
            Number(backendFeePreview.fee_amount) === 0
          )
        : Boolean(hasValidTicket && !validOverride);
      const isExemptActive = isFeeExempt || isTicketActive;
      const chosenMethod = validOverride || (isExemptActive ? "CASH" : paymentMethod);

      let exitImageUrl = null;
      if (scanDetails?.imageUrl && scanDetails.imageUrl.startsWith("http")) {
        exitImageUrl = scanDetails.imageUrl;
      } else if (detectedData?.image_url && detectedData.image_url.startsWith("http")) {
        exitImageUrl = detectedData.image_url;
      }

      const checkOutResult = await checkOutVehicle({
        licensePlate: detectedPlate || matchedVehicle?.licensePlate,
        sessionCode: rawLookup?.open_session?.session_code,
        exitGateId: activeGateId,
        exitGate: activeGateId,
        paymentMethod: chosenMethod,
        waiveFee: isFeeExempt,
        waiverReason: waiverReason,
        exitImageUrl,
      });

      if (checkOutResult?.alreadyClosed) {
        // checkOutVehicle() normalizes 409 PROP-4.5.1-P10 into { alreadyClosed: true }; do not open barrier
        setRawLookup((prev) => (prev ? { ...prev, open_session: null } : null));
        setPendingEntryInfo(null);
        pendingExitInfoRef.current = null;
        setPendingExitInfo(null);
        setBackendFeePreview(null);
        setErrorMessage("");
        setActionSuccessMessage("");
        workerInfoBannerActiveRef.current = false;
        setInformationalMessage(
          "Phiên gửi của phương tiện này đã được kết thúc trước đó trên hệ thống (409 Conflict)."
        );
        if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
          window.dispatchEvent(
            new CustomEvent("parking-session-changed", {
              detail: {
                action: "check-out",
                licensePlate: plate,
                sessionCode: rawLookup?.open_session?.session_code,
                alreadyClosed: true,
              },
            })
          );
        }
        return;
      }

      // Barrier tự động mở 600ms và tự động đóng sau 3000ms (G-FE-02)
      const checkedOutLookup = checkOutResult?.vehicle_lookup || null;
      setRawLookup((prev) =>
        checkedOutLookup
          ? { ...(prev || {}), ...checkedOutLookup, open_session: checkedOutLookup.open_session ?? null }
          : prev
          ? { ...prev, open_session: null }
          : null
      );
      setPendingEntryInfo(null);
      setPendingExitInfo(null);
      triggerBarrierOpen();
      resetDetection();

      const plateDisplay = formatLicensePlateForDisplay(plate);
      if (autoAppliedPlateRef.current && autoAppliedPlateRef.current === plate) {
        setAutoApplyBannerMessage(
          `Đã tự động ghi nhận Check-out cho xe ${plateDisplay}. Mở barrier.`
        );
      }

      const checkedOutSession = checkOutResult?.session || checkOutResult;
      const resolvedFeeAmount =
        backendFeePreview?.fee_amount !== undefined &&
        backendFeePreview?.fee_amount !== null
          ? backendFeePreview.fee_amount
          : checkedOutSession?.fee_amount !== undefined &&
            checkedOutSession?.fee_amount !== null
          ? checkedOutSession.fee_amount
          : checkOutResult?.fee_amount;

      const feeFormatted = isFeeExempt
        ? "0đ (Miễn cước đặc cách)"
        : isTicketActive
        ? "0đ (Vé tháng có hiệu lực)"
        : resolvedFeeAmount !== undefined &&
          resolvedFeeAmount !== null &&
          Number.isFinite(Number(resolvedFeeAmount))
        ? `${new Intl.NumberFormat("vi-VN").format(Number(resolvedFeeAmount))}đ`
        : "0đ";

      const successMsg = `✓ Check-out hoàn tất (${feeFormatted})! Mở barrier mời xe ra bãi.`;
      setActionSuccessMessage(successMsg);
      toast.success(successMsg);

      if (onSessionChange) {
        onSessionChange("check-out", checkOutResult);
      }

      // Phát sự kiện đồng bộ tức thì với trang Lịch sử ra/vào (G-FE-04)
      const sessionCode =
        rawLookup?.open_session?.session_code ||
        checkedOutSession?.sessionCode ||
        checkedOutSession?.session_code ||
        checkOutResult?.sessionCode ||
        checkOutResult?.session_code;
      if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
        window.dispatchEvent(
          new CustomEvent("parking-session-changed", {
            detail: {
              action: "check-out",
              licensePlate: plate,
              sessionCode,
            },
          })
        );
      }
    } catch (err) {
      const status = err?.status || err?.response?.status;
      const errorCode = err?.data?.code || err?.code;
      const errMsg = err?.data?.message || err?.message || "";
      const isWalletConflict =
        errorCode === "PROP-WALLET-INSUFFICIENT" ||
        errorCode === "PROP-WALLET-LOCKED" ||
        errorCode === "PROP-WALLET-NOT-FOUND";
      const isSessionAlreadyClosed409 =
        !isWalletConflict &&
        (errorCode === "PROP-4.5.1-P10" ||
          errorCode === "CONFLICT" ||
          errMsg.includes("đã được kết thúc") ||
          (status === 409 && !errorCode));

      if (isSessionAlreadyClosed409) {
        setErrorMessage("");
        workerInfoBannerActiveRef.current = false;
        setInformationalMessage(
          "Phiên gửi của phương tiện này đã được kết thúc trước đó trên hệ thống (409 Conflict)."
        );
      } else {
        workerInfoBannerActiveRef.current = false;
        setInformationalMessage("");
        setErrorMessage(getExitErrorMessage(err));
      }
    } finally {
      actionPendingRef.current = false;
      setIsActionPending(false);
    }
  }, [
    activeGateId,
    backendFeePreview,
    detectedData,
    detectedPlate,
    hasValidTicket,
    isFeeExempt,
    matchedVehicle,
    onSessionChange,
    paymentMethod,
    rawLookup,
    resetDetection,
    scanDetails,
    setErrorMessage,
    setRawLookup,
    toast,
    triggerBarrierOpen,
    waiverReason,
  ]);

  // Tự động áp dụng (Auto-Apply) trong Browser Mode
  useEffect(() => {
    if (
      !isOpen ||
      workerOnline !== false ||
      !autoApplyEnabled ||
      isActionPending ||
      actionPendingRef.current
    ) {
      return;
    }
    // Chỉ tự động kích hoạt cho biển số đến từ camera AI, không áp dụng cho tra cứu thủ công
    if (detectionSource !== "camera" || !detectedPlate) {
      return;
    }
    if (isScanning) {
      return;
    }
    if (autoAppliedPlateRef.current === detectedPlate) {
      return;
    }

    if (laneMode === "entry") {
      if (isLoadingSlots) return;
      if (!entryValidation.eligible || isBlacklisted) {
        return;
      }
      const assignedSlotId = matchedVehicle?.parkingSlot?.slotId;
      const chosenSlot =
        (assignedSlotId && availableSlots.find((s) => s.id === assignedSlotId)) ||
        availableSlots.find((s) => s.id === selectedSlotId) ||
        availableSlots[0] ||
        null;
      const rawConf =
        scanDetails?.confidence ??
        detectedData?.confidence ??
        detectedData?.best_candidate?.confidence;
      const conf = normalizeConfidencePercent(rawConf);
      // Never default to AUTO when live detectedData is null and scanDetails has no explicit reviewStatus
      const effectiveReviewStatus =
        detectedData?.review_status ||
        scanDetails?.reviewStatus ||
        (!detectedData ? "NEEDS_REVIEW" : "AUTO");

      const policy = evaluateAutoApplyPolicy({
        direction: "IN",
        gateActive: true,
        isAutoScan: true,
        reviewStatus: effectiveReviewStatus,
        confidence: conf,
        confidenceThreshold: 90.0,
        isPlateStable: true,
        vehicleMatch: matchedVehicle ? { ...matchedVehicle, is_blacklisted: isBlacklisted } : null,
        openSession: rawLookup?.open_session || null,
        availableSlot: chosenSlot,
      });

      const browserDecision = evaluateBrowserEntryDecision({
        gateActive: true,
        isAutoScan: true,
        reviewStatus: effectiveReviewStatus,
        rawConfidence: rawConf,
        confidenceThreshold: 90.0,
        isPlateStable: true,
        matchedVehicle,
        openSession: rawLookup?.open_session || null,
        hasOpenSession,
        isBlacklisted,
        availableSlot: chosenSlot,
      });

      if (policy.canAutoApply && browserDecision.shouldAutoCheckIn) {
        autoAppliedPlateRef.current = detectedPlate;
        queueMicrotask(() => {
          setPendingEntryInfo(null);
          handleConfirmEntry();
        });
      } else if (
        policy.reasonCode === REASON_UNREGISTERED_VEHICLE ||
        browserDecision.shouldStartPendingEntry
      ) {
        const currentPending = pendingEntryInfoRef.current;
        const isSamePendingPlate = Boolean(
          currentPending &&
            currentPending.mode !== "worker" &&
            normalizePlate(currentPending.plate) === normalizePlate(detectedPlate)
        );
        if (!isSamePendingPlate) {
          const plateDisplay = formatLicensePlateForDisplay(detectedPlate);
          const nowMs = Date.now();
          const nextPending = {
            mode: "browser",
            plate: detectedPlate,
            plateMasked: "",
            startedAt: nowMs,
            lastSeenAt: nowMs,
            expiresAt: nowMs + 15 * 60 * 1000,
          };
          pendingEntryInfoRef.current = nextPending;
          queueMicrotask(() => {
            setPendingEntryInfo((prev) => {
              if (
                prev &&
                prev.mode !== "worker" &&
                normalizePlate(prev.plate) === normalizePlate(detectedPlate)
              ) {
                return prev;
              }
              return nextPending;
            });
            setPendingEntryNowMs(nowMs);
            workerInfoBannerActiveRef.current = false;
            setInformationalMessage(
              `Xe ${plateDisplay} chưa đăng ký. Đang chờ khách đăng ký trong 15 phút (tự động kiểm tra mỗi 5 giây).`
            );
          });
        }
      }
    } else if (laneMode === "exit") {
      if (isLoadingFeePreview) return;
      if (!rawLookup?.open_session) {
        if (pendingExitInfo && rawLookup) {
          const pendingNorm = normalizePlate(pendingExitInfo.plate);
          const lookupNorm = normalizePlate(
            rawLookup.license_plate || matchedVehicle?.licensePlate || detectedPlate
          );
          if (!pendingNorm || !lookupNorm || pendingNorm === lookupNorm) {
            queueMicrotask(() => {
              setPendingExitInfo(null);
              setBackendFeePreview(null);
              workerInfoBannerActiveRef.current = false;
              setInformationalMessage("Phiên đỗ xe đã được đóng/thanh toán trước đó.");
            });
          }
        }
        return;
      }
      const rawConf =
        scanDetails?.confidence ??
        detectedData?.confidence ??
        detectedData?.best_candidate?.confidence;
      const conf =
        typeof rawConf === "number" && Number.isFinite(rawConf)
          ? normalizeConfidencePercent(rawConf)
          : 0.0;
      const effectiveExitReviewStatus =
        detectedData?.review_status ||
        scanDetails?.reviewStatus ||
        (!detectedData ? "NEEDS_REVIEW" : "AUTO");
      const feeAmount =
        backendFeePreview?.fee_amount !== undefined &&
        backendFeePreview?.fee_amount !== null
          ? backendFeePreview.fee_amount
          : null;

      const policy = evaluateAutoApplyPolicy({
        direction: "OUT",
        gateActive: true,
        isAutoScan: true,
        reviewStatus: effectiveExitReviewStatus,
        confidence: conf,
        confidenceThreshold: 90.0,
        isPlateStable: true,
        vehicleMatch: matchedVehicle,
        openSession: rawLookup?.open_session || null,
        feePreview: feeAmount,
        customerHasWallet: Boolean(matchedVehicle?.customer?.hasWallet),
        walletBalance: matchedVehicle?.customer?.walletBalance ?? null,
        walletStatus:
          matchedVehicle?.customer?.walletStatus !== undefined
            ? matchedVehicle.customer.walletStatus
            : "ACTIVE",
      });

      if (policy.canAutoApply) {
        autoAppliedPlateRef.current = detectedPlate;
        const autoPaymentMethod =
          policy.reasonCode === REASON_VALID_WALLET_PAID ? "WALLET" : null;
        queueMicrotask(() => {
          setPendingExitInfo(null);
          handleConfirmExit(autoPaymentMethod);
        });
      } else if (policy.reasonCode === REASON_WALLET_INSUFFICIENT) {
        const sessionCode = rawLookup?.open_session?.session_code || "";
        queueMicrotask(() => {
          const nowMs = Date.now();
          setPendingExitInfo((prev) => {
            if (prev && prev.plate === detectedPlate && prev.sessionCode === sessionCode) {
              return prev;
            }
            return {
              mode: "browser",
              plate: detectedPlate,
              sessionCode,
              startedAt: nowMs,
              lastSeenAt: nowMs,
              expiresAt: nowMs + PENDING_ENTRY_MAX_MS,
            };
          });
          workerInfoBannerActiveRef.current = false;
          setInformationalMessage(
            "Số dư ví không đủ. Hệ thống đang chờ khách nạp bù ví hoặc thanh toán tại quầy (tự động kiểm tra mỗi 5 giây)."
          );
        });
      }
    }
  }, [
    isOpen,
    workerOnline,
    autoApplyEnabled,
    isActionPending,
    detectionSource,
    detectedPlate,
    isScanning,
    laneMode,
    isLoadingSlots,
    availableSlots,
    selectedSlotId,
    matchedVehicle,
    rawLookup,
    hasOpenSession,
    entryValidation.eligible,
    isBlacklisted,
    scanDetails,
    detectedData,
    isLoadingFeePreview,
    backendFeePreview,
    pendingExitInfo,
    handleConfirmEntry,
    handleConfirmExit,
  ]);

  const hasPendingEntry = Boolean(pendingEntryInfo);
  const pendingEntryMode = pendingEntryInfo?.mode || "";
  const pendingEntryPlate = pendingEntryInfo?.plate || "";
  const pendingEntryStartedAt = pendingEntryInfo?.startedAt || 0;
  const pendingEntryExpiresAt = pendingEntryInfo?.expiresAt || 0;

  // D7 Pending Entry countdown ticker (1s) + liveness drop (>60s unseen or >15m expired)
  useEffect(() => {
    if (!isOpen || !hasPendingEntry) return undefined;
    const tickId = setInterval(() => {
      const currentPending = pendingEntryInfoRef.current;
      if (!currentPending) return;
      const nowMs = Date.now();
      setPendingEntryNowMs(nowMs);
      const liveness = evaluatePendingEntryLiveness(currentPending, nowMs);
      if (!liveness.alive) {
        pendingEntryInfoRef.current = null;
        setPendingEntryInfo(null);
        lastDetectedPlateRef.current = "";
        autoAppliedPlateRef.current = "";
        scanDetailsRef.current = null;
        detectedDataRef.current = null;
        setDetectionSource(null);
        setCameraDetectedPlate("");
        setManualInputPlate("");
        setDetectedPlate("");
        resetMatchingRef.current?.();
        if (currentPending.mode !== "worker") {
          resetDetectionRef.current?.();
        }
        workerInfoBannerActiveRef.current = false;
        setInformationalMessage(
          liveness.reason === "UNSEEN_TIMEOUT"
            ? "Xe chờ đăng ký đã rời khỏi làn (>60 giây). Đã hủy trạng thái chờ tự động."
            : "Hết thời gian chờ khách đăng ký (15 phút). Vui lòng xử lý thủ công tại cổng."
        );
      }
    }, 1000);
    return () => clearInterval(tickId);
  }, [
    isOpen,
    hasPendingEntry,
    pendingEntryMode,
    pendingEntryPlate,
    pendingEntryStartedAt,
    pendingEntryExpiresAt,
    setDetectedPlate,
  ]);

  // D7 Pending Entry Re-evaluation (Browser Mode): poll lookup every 5s up to 15m while still seen
  useEffect(() => {
    if (
      !isOpen ||
      workerOnline !== false ||
      !autoApplyEnabled ||
      laneMode !== "entry" ||
      !hasPendingEntry ||
      !pendingEntryPlate
    ) {
      return undefined;
    }

    let isCancelled = false;
    const intervalId = setInterval(async () => {
      const currentPending = pendingEntryInfoRef.current;
      if (!currentPending || !currentPending.plate) return;

      try {
        await executePendingEntryLookupTick({
          pendingEntry: currentPending,
          nowFn: Date.now,
          isBusy: () => isScanningRef.current || actionPendingRef.current,
          lookupVehicleByPlate,
          onExpired: (liveness) => {
            if (isCancelled) return;
            pendingEntryInfoRef.current = null;
            setPendingEntryInfo(null);
            lastDetectedPlateRef.current = "";
            autoAppliedPlateRef.current = "";
            scanDetailsRef.current = null;
            detectedDataRef.current = null;
            setDetectionSource(null);
            setCameraDetectedPlate("");
            setManualInputPlate("");
            setDetectedPlate("");
            resetMatchingRef.current?.();
            resetDetectionRef.current?.();
            workerInfoBannerActiveRef.current = false;
            setInformationalMessage(
              liveness.reason === "UNSEEN_TIMEOUT"
                ? "Xe chờ đăng ký đã rời khỏi làn (>60 giây). Đã hủy trạng thái chờ tự động."
                : "Hết thời gian chờ khách đăng ký (15 phút). Vui lòng xử lý thủ công tại cổng."
            );
          },
          onRegistered: async (registeredPlate) => {
            if (isCancelled) return;
            const postAction = evaluatePostRegistrationAction({
              detectedData: detectedDataRef.current,
              scanDetails: scanDetailsRef.current,
            });
            pendingEntryInfoRef.current = null;
            setPendingEntryInfo(null);
            autoAppliedPlateRef.current = "";
            if (postAction.requiresFreshScan) {
              lastDetectedPlateRef.current = "";
              // Clear stale scan details/data before resetDetection() so prior NEEDS_REVIEW
              // confidence cannot trigger a fake AUTO check-in before fresh live OCR arrives.
              scanDetailsRef.current = null;
              detectedDataRef.current = null;
              setScanDetails(null);
            }
            await handleMatchPlateRef.current?.(registeredPlate);
            if (
              isMountedRef.current &&
              isOpenRef.current &&
              laneModeRef.current === "entry" &&
              postAction.requiresFreshScan &&
              !cameraErrorRef.current &&
              Boolean(videoRef.current?.srcObject) &&
              typeof resetDetectionRef.current === "function"
            ) {
              resetDetectionRef.current();
            }
          },
        });
      } catch {
        // 404 while customer has not completed registration yet: stay silent without resetting slots or barrier
      }
    }, 5000);

    return () => {
      isCancelled = true;
      clearInterval(intervalId);
    };
  }, [
    isOpen,
    workerOnline,
    autoApplyEnabled,
    laneMode,
    hasPendingEntry,
    pendingEntryMode,
    pendingEntryPlate,
    pendingEntryStartedAt,
    pendingEntryExpiresAt,
    setDetectedPlate,
    setScanDetails,
  ]);

  const hasPendingExit = Boolean(pendingExitInfo);
  const pendingExitMode = pendingExitInfo?.mode || "";
  const pendingExitPlate = pendingExitInfo?.plate || "";
  const pendingExitStartedAt = pendingExitInfo?.startedAt || 0;
  const pendingExitExpiresAt = pendingExitInfo?.expiresAt || 0;

  // D8 Pending Exit Re-evaluation (Browser Mode): poll every 5s while still seen (D1 liveness)
  useEffect(() => {
    if (
      !isOpen ||
      workerOnline !== false ||
      !autoApplyEnabled ||
      laneMode !== "exit" ||
      !hasPendingExit ||
      pendingExitMode === "worker" ||
      !pendingExitPlate
    ) {
      return undefined;
    }

    let isCancelled = false;
    const dropPendingExit = (livenessReason) => {
      pendingExitInfoRef.current = null;
      setPendingExitInfo(null);
      lastDetectedPlateRef.current = "";
      autoAppliedPlateRef.current = "";
      // Clear stale OCR/lookup state so Auto-Apply cannot resurrect pendingExitInfo on the next render
      scanDetailsRef.current = null;
      detectedDataRef.current = null;
      setDetectionSource(null);
      setCameraDetectedPlate("");
      setManualInputPlate("");
      setDetectedPlate("");
      clearBackendFeePreview();
      resetMatchingRef.current?.();
      resetDetectionRef.current?.();
      workerInfoBannerActiveRef.current = false;
      setInformationalMessage(
        livenessReason === "UNSEEN_TIMEOUT"
          ? "Xe chờ thanh toán ví đã rời khỏi làn (>60 giây). Đã hủy trạng thái chờ tự động."
          : "Hết thời gian chờ nạp bù ví (15 phút). Vui lòng thu tiền tại quầy."
      );
    };

    const livenessTimerId = setInterval(() => {
      const currentPending = pendingExitInfoRef.current;
      if (!currentPending || currentPending.mode === "worker") return;
      const liveness = evaluatePendingExitLiveness(currentPending, Date.now());
      if (!liveness.alive && !isCancelled) {
        dropPendingExit(liveness.reason);
      }
    }, 1000);

    const intervalId = setInterval(async () => {
      const currentPending = pendingExitInfoRef.current;
      if (!currentPending || currentPending.mode === "worker" || !currentPending.plate) {
        return;
      }
      const liveness = evaluatePendingExitLiveness(currentPending, Date.now());
      if (!liveness.alive) {
        if (!isCancelled) {
          dropPendingExit(liveness.reason);
        }
        return;
      }
      if (!isScanningRef.current && !actionPendingRef.current) {
        const result = await handleMatchPlateRef.current?.(currentPending.plate, {
          shouldCommit: () =>
            !isCancelled &&
            isOpenRef.current &&
            laneModeRef.current === "exit" &&
            Boolean(pendingExitInfoRef.current) &&
            pendingExitInfoRef.current.mode !== "worker" &&
            evaluatePendingExitLiveness(pendingExitInfoRef.current, Date.now()).alive,
        });
        if (isCancelled || !isOpenRef.current || !pendingExitInfoRef.current) {
          return;
        }
        const postLiveness = evaluatePendingExitLiveness(pendingExitInfoRef.current, Date.now());
        if (!postLiveness.alive) {
          dropPendingExit(postLiveness.reason);
          return;
        }
        if (
          result?.success &&
          result.rawLookup &&
          !result.rawLookup.open_session
        ) {
          const pendingNorm = normalizePlate(currentPending.plate);
          const lookupNorm = normalizePlate(
            result.rawLookup.license_plate ||
              result.vehicle?.licensePlate ||
              currentPending.plate
          );
          if (!pendingNorm || !lookupNorm || pendingNorm === lookupNorm) {
            pendingExitInfoRef.current = null;
            setPendingExitInfo(null);
            clearBackendFeePreview();
            workerInfoBannerActiveRef.current = false;
            setInformationalMessage("Phiên đỗ xe đã được đóng/thanh toán trước đó.");
          }
        }
      }
    }, 5000);

    return () => {
      isCancelled = true;
      clearInterval(livenessTimerId);
      clearInterval(intervalId);
    };
  }, [
    isOpen,
    workerOnline,
    autoApplyEnabled,
    laneMode,
    hasPendingExit,
    pendingExitMode,
    pendingExitPlate,
    pendingExitStartedAt,
    pendingExitExpiresAt,
    clearBackendFeePreview,
    setDetectedPlate,
  ]);

  const pendingEntryRemainingSeconds = pendingEntryInfo
    ? Math.max(0, Math.ceil((pendingEntryInfo.expiresAt - pendingEntryNowMs) / 1000))
    : 0;
  const quickRegisterUrl = buildQuickRegisterUrl(
    typeof window !== "undefined" ? window.location.origin : "",
    pendingEntryInfo
  );

  const { titleId, dialogProps } = useModalA11y({
    isOpen,
    onClose,
    isBusy: isActionPending,
  });

  if (!isOpen) return null;

  return (
    <div
      {...dialogProps}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              📷
            </div>
            <div>
              <h3 id={titleId} className="text-sm sm:text-base font-bold text-slate-900">
                Kiểm Soát Cổng Vào / Ra (Camera Live)
              </h3>
              <p className="text-3xs text-slate-500">
                1 Camera quét trực tiếp • 1 bên Làn Vào (Check-in) & 1 bên Làn Ra (Check-out)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Viewer Mode indicator / Unknown state / Browser Mode Auto-Apply Toggle */}
            {workerOnline === true ? (
              <div
                data-testid="viewer-mode-badge"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-50 text-purple-800 text-2xs font-bold border border-purple-200"
              >
                <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
                <span>Viewer Mode</span>
              </div>
            ) : workerOnline === false ? (
              <label
                data-testid="auto-apply-toggle-label"
                className="flex items-center gap-1.5 min-h-[44px] text-2xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200 cursor-pointer select-none hover:bg-slate-200 transition"
              >
                <input
                  type="checkbox"
                  data-testid="auto-apply-toggle"
                  checked={autoApplyEnabled}
                  onChange={(e) => handleToggleAutoApply(e.target.checked)}
                  className="w-3.5 h-3.5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                />
                <span>Tự động áp dụng</span>
              </label>
            ) : (
              <div
                data-testid="worker-status-loading"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 text-slate-500 text-2xs font-medium border border-slate-200"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-ping" />
                <span>Đang kiểm tra cổng...</span>
              </div>
            )}

            {isWorkerStatusUnavailable && (
              <span
                data-testid="worker-status-unavailable-note"
                className="text-3xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md font-medium"
              >
                Trạng thái worker tạm thời không khả dụng
              </span>
            )}

            {/* Bộ chọn làn: Làn Vào & Làn Ra */}
            <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setLaneMode("entry");
                  setUserSwitchedLane(true);
                  setPendingExitInfo(null);
                  setErrorMessage("");
                  setImageWarningMessage("");
                  setActionSuccessMessage("");
                  workerInfoBannerActiveRef.current = false;
                  setInformationalMessage("");
                  setBarrierState("closed");
                  if (barrierTimerRef.current) clearTimeout(barrierTimerRef.current);
                  if (barrierAutoCloseTimerRef.current) clearTimeout(barrierAutoCloseTimerRef.current);
                }}
                className={`px-3 py-1 rounded-lg text-2xs font-semibold transition-all ${
                  laneMode === "entry"
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                🚗 Làn Vào
              </button>
              <button
                type="button"
                onClick={() => {
                  setLaneMode("exit");
                  setUserSwitchedLane(true);
                  setPendingEntryInfo(null);
                  setErrorMessage("");
                  setImageWarningMessage("");
                  setActionSuccessMessage("");
                  workerInfoBannerActiveRef.current = false;
                  setInformationalMessage("");
                  setBarrierState("closed");
                  if (barrierTimerRef.current) clearTimeout(barrierTimerRef.current);
                  if (barrierAutoCloseTimerRef.current) clearTimeout(barrierAutoCloseTimerRef.current);
                  const targetPlate = detectedPlate || matchedVehicle?.licensePlate;
                  const targetCode = rawLookup?.open_session?.session_code;
                  if (rawLookup?.open_session && (targetPlate || targetCode)) {
                    fetchFeePreview(targetPlate, targetCode);
                  } else {
                    setBackendFeePreview(null);
                  }
                }}
                className={`px-3 py-1 rounded-lg text-2xs font-semibold transition-all ${
                  laneMode === "exit"
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                🚙 Làn Ra
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                if (!isActionPending) onClose?.();
              }}
              aria-label="Đóng"
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Body: 2 cột - 1 bên Camera, 1 bên Làn Vào / Ra */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* Server Telemetry Event Banner (Viewer Mode) */}
          {workerOnline && lastAutoEvent && (
            <div
              data-testid="server-event-banner"
              className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-purple-900 text-xs flex items-center justify-between gap-2 shadow-2xs animate-in fade-in"
            >
              <div className="flex items-center gap-2">
                <span className="text-base">📡</span>
                <div>
                  <span className="font-bold">Sự kiện máy chủ:</span>{" "}
                  <span className="font-mono font-bold text-purple-800 bg-purple-50 px-1.5 py-0.5 rounded">
                    {lastAutoEvent.license_plate_masked || "N/A"}
                  </span>{" "}
                  <span>• Quyết định: <strong>{lastAutoEvent.action}</strong></span>{" "}
                  <span>• Lý do: {lastAutoEvent.reason}</span>
                  {lastAutoEvent.snapshot_error && (
                    <span> • Ảnh: {lastAutoEvent.snapshot_error}</span>
                  )}
                </div>
              </div>
              {lastAutoEvent.occurred_at && (
                <span className="text-3xs text-purple-600 shrink-0">
                  {formatTimeWithSecondsVN(lastAutoEvent.occurred_at, "—")}
                </span>
              )}
            </div>
          )}

          {/* Non-blocking Auto-Apply Notification Banner */}
          {autoApplyBannerMessage && (
            <div
              data-testid="auto-apply-banner"
              className="p-3 bg-emerald-50 rounded-xl border border-emerald-300 text-emerald-800 flex items-center justify-between gap-2 text-xs shadow-2xs animate-in fade-in"
            >
              <div className="flex items-center gap-2">
                <span className="text-base">⚡</span>
                <span className="font-semibold">{autoApplyBannerMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setAutoApplyBannerMessage("")}
                className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-lg text-emerald-700 hover:text-emerald-900 font-bold text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Informational Message Banner (HTTP 409 Conflict) */}
          {informationalMessage && (
            <div
              data-testid="informational-banner"
              className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-blue-900 flex items-center justify-between gap-2 text-xs shadow-2xs animate-in fade-in"
            >
              <div className="flex items-center gap-2">
                <span className="text-base">ℹ️</span>
                <span className="font-semibold">{informationalMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  workerInfoBannerActiveRef.current = false;
                  setInformationalMessage("");
                }}
                className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-lg text-blue-700 hover:text-blue-900 font-bold text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Thanh nhập biển số thủ công / tra cứu nhanh */}
          <form onSubmit={handleManualSearch} className="flex gap-2" data-detection-source={detectionSource || undefined}>
            {detectionSource && (
              <span className="sr-only">Nguồn nhận diện: {detectionSource}</span>
            )}
            <input
              type="text"
              value={manualInputPlate}
              onChange={(e) => setManualInputPlate(e.target.value.toUpperCase())}
              placeholder="Nhập hoặc quét biển số (VD: 43A-123.45)..."
              className="flex-1 font-mono uppercase font-bold text-slate-800 tracking-wider px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
            />
            <button
              type="submit"
              disabled={isScanning || !manualInputPlate}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs rounded-xl font-semibold transition-colors"
            >
              {isScanning ? "Đang tra..." : "Tra cứu"}
            </button>
          </form>

          {/* Success / Error / Warning Alerts */}
          {actionSuccessMessage && (
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 flex items-center gap-2 text-xs">
              <span>🎉</span>
              <span className="font-semibold">{actionSuccessMessage}</span>
            </div>
          )}

          {imageWarningMessage && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-300 text-amber-800 flex items-center gap-2 text-xs">
              <span>⚠️</span>
              <span className="font-semibold">{imageWarningMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-rose-50 rounded-xl border border-rose-300 text-rose-800 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span>⚠️</span>
                <span>{errorMessage}</span>
              </div>
              {errorMessage.includes("Làn Ra") && laneMode === "entry" && (
                <button
                  type="button"
                  onClick={() => {
                    setLaneMode("exit");
                    setUserSwitchedLane(true);
                    setPendingEntryInfo(null);
                    setErrorMessage("");
                    setImageWarningMessage("");
                    const targetPlate = detectedPlate || matchedVehicle?.licensePlate;
                    const targetCode = rawLookup?.open_session?.session_code;
                    if (rawLookup?.open_session && (targetPlate || targetCode)) {
                      fetchFeePreview(targetPlate, targetCode);
                    } else {
                      setBackendFeePreview(null);
                    }
                  }}
                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-3xs font-semibold"
                >
                  👉 Chuyển sang Làn Ra
                </button>
              )}
            </div>
          )}

          {/* Layout chính: Bên trái Camera (50%) - Bên phải Làn Vào/Ra (50%) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
            {/* Cột trái: Quét Camera hoặc Tải ảnh từ file */}
            <div className="h-full flex flex-col space-y-2">
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setScanSourceMode("camera")}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-2xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    scanSourceMode === "camera"
                      ? "bg-white text-slate-800 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span>📷</span>
                  <span>Quét Camera trực tiếp</span>
                </button>
                <button
                  type="button"
                  onClick={() => setScanSourceMode("image")}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-2xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    scanSourceMode === "image"
                      ? "bg-white text-slate-800 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span>🖼️</span>
                  <span>Tải ảnh từ file</span>
                </button>
              </div>

              {scanSourceMode === "camera" ? (
                <ScanPlateCameraFeed
                  videoRef={videoRef}
                  videoDevices={videoDevices}
                  selectedDeviceId={selectedDeviceId}
                  onChangeCamera={changeCamera}
                  cameraError={cameraError}
                  rawBoundingBox={isManualLookup ? null : rawBoundingBox}
                  sourceDimensions={sourceDimensions}
                  statusMessage={isManualLookup ? "Đang tra cứu thủ công" : statusMessage}
                  isScanning={isScanning}
                  detectedPlate={cameraDetectedPlate}
                  cameraPlate={isManualLookup ? "" : cameraDetectedPlate}
                  barrierState={barrierState}
                  onReset={handleReset}
                  isManualLookup={isManualLookup}
                />
              ) : (
                <ScanPlateImageUpload
                  gateId={activeGateId}
                  onImageScanned={handleGateImageScanned}
                  disabled={isActionPending}
                />
              )}
            </div>

            {/* Cột phải: Panel Làn Vào hoặc Làn Ra */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between h-full shadow-2xs">
              {laneMode === "entry" ? (
                <EntryLanePanel
                  detectedPlate={detectedPlate}
                  matchedVehicle={matchedVehicle}
                  scanDetails={scanDetails}
                  availableSlots={availableSlots}
                  selectedSlotId={selectedSlotId}
                  setSelectedSlotId={setSelectedSlotId}
                  isLoadingSlots={isLoadingSlots}
                  isBlacklisted={isBlacklisted}
                  hasValidTicket={hasValidTicket}
                  hasOpenSession={hasOpenSession}
                  isActionPending={isActionPending}
                  onConfirmEntry={handleConfirmEntry}
                  onForceCloseSession={handleOpenSafetyModal}
                  pendingEntryInfo={pendingEntryInfo}
                  pendingRemainingSeconds={pendingEntryRemainingSeconds}
                  quickRegisterUrl={quickRegisterUrl}
                />
              ) : (
                <ExitLanePanel
                  detectedPlate={detectedPlate}
                  matchedVehicle={matchedVehicle}
                  rawLookup={rawLookup}
                  scanDetails={scanDetails}
                  hasValidTicket={hasValidTicket}
                  calculatedDurationMinutes={calculatedDurationMinutes}
                  backendFeePreview={backendFeePreview}
                  isLoadingFeePreview={isLoadingFeePreview}
                  isScanning={isScanning}
                  isFeeExempt={isFeeExempt}
                  setIsFeeExempt={setIsFeeExempt}
                  waiverReason={waiverReason}
                  setWaiverReason={setWaiverReason}
                  currentUserRole={currentUserRole}
                  paymentMethod={paymentMethod}
                  setPaymentMethod={setPaymentMethod}
                  isActionPending={isActionPending}
                  onConfirmExit={handleConfirmExit}
                />
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/60 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition"
          >
            Đóng
          </button>
          {matchedVehicle && (
            <button
              type="button"
              onClick={handleApplySelection}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl shadow-2xs transition"
            >
              Xem hồ sơ chi tiết phương tiện →
            </button>
          )}
        </div>
      </div>

      {/* Modal bảo vệ đối soát an toàn phiên gửi cũ */}
      <CloseSessionSafetyModal
        isOpen={isSafetyModalOpen}
        onClose={() => setIsSafetyModalOpen(false)}
        licensePlate={detectedPlate || matchedVehicle?.licensePlate}
        openSession={rawLookup?.open_session}
        matchedVehicle={matchedVehicle}
        onConfirmClose={handleConfirmCloseSafety}
        isLoading={isActionPending}
      />
    </div>
  );
}
