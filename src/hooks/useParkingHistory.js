import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useToast } from "../context/ToastContext";
import { getParkingSessions } from "../services/plateScanService";
import {
  forceCloseSessionAndReleaseSlot,
  checkOutVehicle,
} from "../services/parkingSessionService";
import { updateSlotStatus } from "../services/parkingLotService";
import {
  PARKING_HISTORY_DEFAULTS,
  QUICK_FILTER_KEYS,
  PARKING_HISTORY_MESSAGES,
} from "../constants/parkingHistoryConstants";

const toISODate = (d) => d.toISOString().slice(0, 10);

export function useParkingHistory() {
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const queryPlate = useMemo(() => {
    return (searchParams.get("license_plate") || searchParams.get("plate") || "").trim();
  }, [searchParams]);

  const today = useMemo(() => new Date(), []);
  const todayISO = useMemo(() => toISODate(today), [today]);
  const minDateISO = useMemo(() => {
    const d = new Date(today);
    d.setDate(today.getDate() - 29);
    return toISODate(d);
  }, [today]);

  const [searchTerm, setSearchTerm] = useState(queryPlate);
  const [sessionCode, setSessionCode] = useState("");
  const [licensePlate, setLicensePlate] = useState(queryPlate);
  const [entryTimeFrom, setEntryTimeFrom] = useState("");
  const [entryTimeTo, setEntryTimeTo] = useState("");
  const [exitTimeFrom, setExitTimeFrom] = useState("");
  const [exitTimeTo, setExitTimeTo] = useState("");
  const [feeMin, setFeeMin] = useState("");
  const [feeMax, setFeeMax] = useState("");
  const [statusFilter, setStatusFilter] = useState(PARKING_HISTORY_DEFAULTS.DEFAULT_STATUS_FILTER);
  const [ticketTypeFilter, setTicketTypeFilter] = useState(
    PARKING_HISTORY_DEFAULTS.DEFAULT_TICKET_TYPE_FILTER || "all"
  );
  const [filterByTime, setFilterByTime] = useState(false);
  const [dateFrom, setDateFrom] = useState(minDateISO);
  const [dateTo, setDateTo] = useState(todayISO);
  const [activeQuickFilter, setActiveQuickFilter] = useState(PARKING_HISTORY_DEFAULTS.DEFAULT_QUICK_FILTER);

  const [historyList, setHistoryList] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(PARKING_HISTORY_DEFAULTS.PAGE_SIZE_DEFAULT);
  const [refreshKey, setRefreshKey] = useState(0);

  const [previewSession, setPreviewSession] = useState(null);
  const [sessionActionModal, setSessionActionModal] = useState(null);
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);

  const handleQuickFilter = useCallback(
    (key) => {
      const now = new Date();
      setActiveQuickFilter(key);
      setCurrentPage(1);

      if (key === QUICK_FILTER_KEYS.TODAY) {
        setDateFrom(toISODate(now));
        setDateTo(toISODate(now));
      } else if (key === QUICK_FILTER_KEYS.YESTERDAY) {
        const y = new Date(now);
        y.setDate(now.getDate() - 1);
        setDateFrom(toISODate(y));
        setDateTo(toISODate(y));
      } else if (key === QUICK_FILTER_KEYS.LAST_7_DAYS) {
        const d7 = new Date(now);
        d7.setDate(now.getDate() - 6);
        setDateFrom(toISODate(d7));
        setDateTo(toISODate(now));
      } else if (key === QUICK_FILTER_KEYS.LAST_30_DAYS) {
        const d30 = new Date(now);
        d30.setDate(now.getDate() - 29);
        setDateFrom(toISODate(d30));
        setDateTo(toISODate(now));
      }
    },
    []
  );

  const handleResetFilters = useCallback(() => {
    setSearchTerm("");
    setSessionCode("");
    setLicensePlate("");
    setStatusFilter(PARKING_HISTORY_DEFAULTS.DEFAULT_STATUS_FILTER);
    setTicketTypeFilter(PARKING_HISTORY_DEFAULTS.DEFAULT_TICKET_TYPE_FILTER || "all");
    setEntryTimeFrom("");
    setEntryTimeTo("");
    setExitTimeFrom("");
    setExitTimeTo("");
    setFeeMin("");
    setFeeMax("");
    setFilterByTime(false);
    setDateFrom(minDateISO);
    setDateTo(todayISO);
    setActiveQuickFilter(PARKING_HISTORY_DEFAULTS.DEFAULT_QUICK_FILTER);
    setCurrentPage(1);
  }, [minDateISO, todayISO]);

  const hasActiveFilters = Boolean(
    searchTerm ||
      sessionCode ||
      licensePlate ||
      statusFilter !== PARKING_HISTORY_DEFAULTS.DEFAULT_STATUS_FILTER ||
      ticketTypeFilter !== (PARKING_HISTORY_DEFAULTS.DEFAULT_TICKET_TYPE_FILTER || "all") ||
      entryTimeFrom ||
      entryTimeTo ||
      exitTimeFrom ||
      exitTimeTo ||
      feeMin ||
      feeMax ||
      activeQuickFilter !== QUICK_FILTER_KEYS.LAST_30_DAYS
  );

  // Đồng bộ searchTerm và licensePlate khi URL search param thay đổi
  const [prevQueryPlate, setPrevQueryPlate] = useState(queryPlate);
  if (queryPlate !== prevQueryPlate) {
    setPrevQueryPlate(queryPlate);
    if (queryPlate) {
      setSearchTerm(queryPlate);
      setLicensePlate(queryPlate);
      setCurrentPage(1);
    }
  }

  // Fetch session data from backend with server-side filters & pagination
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setLoadError("");
      try {
        let apiStatus = "";
        if (statusFilter === "in_progress") {
          apiStatus = "open";
        } else if (statusFilter === "completed") {
          apiStatus = "closed";
        }

        const trimmedSearch = searchTerm.trim();
        const res = await getParkingSessions({
          search: trimmedSearch || undefined,
          session_code: sessionCode.trim() || undefined,
          license_plate: licensePlate.trim() || undefined,
          status: apiStatus,
          ticket_type: ticketTypeFilter !== "all" ? ticketTypeFilter : undefined,
          entry_time_from: dateFrom ? `${dateFrom}T00:00:00` : "",
          entry_time_to: dateTo ? `${dateTo}T23:59:59` : "",
          exit_time_from: filterByTime ? exitTimeFrom : "",
          exit_time_to: filterByTime ? exitTimeTo : "",
          min_fee: feeMin,
          max_fee: feeMax,
          page: currentPage,
          page_size: itemsPerPage,
        });

        if (!cancelled) {
          const list = Array.isArray(res) ? res : res.items || res.results || [];
          setHistoryList(list);
          setTotalItems(res.total ?? list.length);
        }
      } catch (err) {
        if (!cancelled) {
          setHistoryList([]);
          setTotalItems(0);
          setLoadError(err?.message || PARKING_HISTORY_MESSAGES.LOAD_ERROR_DEFAULT);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [
    searchTerm,
    sessionCode,
    licensePlate,
    statusFilter,
    ticketTypeFilter,
    dateFrom,
    dateTo,
    filterByTime,
    exitTimeFrom,
    exitTimeTo,
    feeMin,
    feeMax,
    currentPage,
    itemsPerPage,
    refreshKey,
  ]);

  const handleConfirmCloseSession = async (payload) => {
    const targetSession = payload?.session || sessionActionModal;
    if (!targetSession || isActionSubmitting) return;

    const actionType = payload?.actionType || "manual_checkout";
    const paymentMethod = payload?.paymentMethod || "CASH";
    const reason = payload?.reason || "";
    const targetPlate = targetSession.licensePlate || targetSession.license_plate;
    const targetSessionCode = targetSession.sessionCode || targetSession.session_code;

    setIsActionSubmitting(true);
    try {
      if (actionType === "release_slot") {
        // Nghiệp vụ 3: Chỉ giải phóng ô đỗ ảo bị treo, giữ phiên xe an toàn
        const slotId = targetSession.slotId || targetSession.slot_id;
        if (!slotId) {
          throw new Error("Phiên đỗ không liên kết với ID ô đỗ cụ thể để giải phóng.");
        }
        await updateSlotStatus(slotId, {
          status: "AVAILABLE",
          notes: reason ? `Giải phóng ô: ${reason}` : "Giải phóng ô từ Lịch sử ra/vào",
        });
        toast.success(`✓ Đã giải phóng ô đỗ thành công. Phiên xe ${targetPlate} được bảo lưu an toàn.`);
      } else if (actionType === "cancel_glitch") {
        // Nghiệp vụ 2: Hủy phiên ảo do camera quét lỗi (0đ, giải phóng vị trí)
        const glitchNotes = reason ? `[HỦY PHIÊN ẢO]: ${reason}` : "Hủy phiên do quét sai";
        const res = await forceCloseSessionAndReleaseSlot({
          licensePlate: targetPlate,
          sessionCode: targetSessionCode,
          waiveFee: true,
          waiverReason: glitchNotes,
          notes: glitchNotes,
        });
        const message = res?.alreadyClosed
          ? PARKING_HISTORY_MESSAGES.CLOSE_SESSION_ALREADY(targetPlate)
          : `✓ Đã hủy phiên ảo và giải phóng ô đỗ cho xe ${targetPlate} thành công!`;
        toast.success(message);
      } else {
        // Nghiệp vụ 1: Xe ra bãi thủ công có thu tiền thực tế
        const res = await checkOutVehicle({
          sessionId: targetSession.id,
          sessionCode: targetSessionCode,
          licensePlate: targetPlate,
          entryTimeRaw: targetSession.entryTime || targetSession.entry_time,
          vehicleType: targetSession.vehicleType || targetSession.vehicle_type || "CAR",
          paymentMethod,
          notes: reason ? `Xuất bãi thủ công: ${reason}` : "Xuất bãi thủ công từ Lịch sử ra/vào",
        });

        const message = res?.alreadyClosed
          ? PARKING_HISTORY_MESSAGES.CLOSE_SESSION_ALREADY(targetPlate)
          : PARKING_HISTORY_MESSAGES.CLOSE_SESSION_SUCCESS(targetPlate);
        toast.success(message);
      }

      // Phát sự kiện đồng bộ toàn hệ thống (Sơ đồ bãi, Bốt trực, Thống kê)
      if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
        window.dispatchEvent(
          new CustomEvent("parking-session-changed", {
            detail: {
              action: actionType === "release_slot" ? "slot-released" : "check-out",
              licensePlate: targetPlate,
              sessionCode: targetSessionCode,
            },
          })
        );
      }

      setSessionActionModal(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(err?.message || PARKING_HISTORY_MESSAGES.CLOSE_SESSION_ERROR);
    } finally {
      setIsActionSubmitting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  return {
    filters: {
      searchTerm,
      setSearchTerm: (val) => { setSearchTerm(val); setCurrentPage(1); },
      sessionCode,
      setSessionCode: (val) => { setSessionCode(val); setCurrentPage(1); },
      licensePlate,
      setLicensePlate: (val) => { setLicensePlate(val); setCurrentPage(1); },
      statusFilter,
      setStatusFilter: (val) => { setStatusFilter(val); setCurrentPage(1); },
      ticketTypeFilter,
      setTicketTypeFilter: (val) => { setTicketTypeFilter(val); setCurrentPage(1); },
      feeMin,
      setFeeMin: (val) => { setFeeMin(val); setCurrentPage(1); },
      feeMax,
      setFeeMax: (val) => { setFeeMax(val); setCurrentPage(1); },
      dateFrom,
      setDateFrom: (val) => { setDateFrom(val); setCurrentPage(1); },
      dateTo,
      setDateTo: (val) => { setDateTo(val); setCurrentPage(1); },
      activeQuickFilter,
      handleQuickFilter,
      filterByTime,
      setFilterByTime,
      entryTimeFrom,
      setEntryTimeFrom,
      entryTimeTo,
      setEntryTimeTo,
      exitTimeFrom,
      setExitTimeFrom,
      exitTimeTo,
      setExitTimeTo,
      minDateISO,
      todayISO,
      hasActiveFilters,
      onResetFilters: handleResetFilters,
    },
    table: {
      items: historyList,
      isLoading,
      loadError,
      currentPage,
      setCurrentPage,
      itemsPerPage,
      setItemsPerPage: (val) => { setItemsPerPage(val); setCurrentPage(1); },
      totalPages,
      totalItems,
      onRefresh: () => setRefreshKey((k) => k + 1),
      onClearDisplay: () => setHistoryList([]),
    },
    modals: {
      previewSession,
      setPreviewSession,
      sessionActionModal,
      setSessionActionModal,
      isActionSubmitting,
      onConfirmCloseSession: handleConfirmCloseSession,
    },
  };
}
