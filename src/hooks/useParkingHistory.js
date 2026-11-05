import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useToast } from "../context/ToastContext";
import { getParkingSessions } from "../services/plateScanService";
import { forceCloseSessionAndReleaseSlot } from "../services/parkingSessionService";
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

  const [sessionCode, setSessionCode] = useState("");
  const [licensePlate, setLicensePlate] = useState(queryPlate);
  const [entryTimeFrom, setEntryTimeFrom] = useState("");
  const [entryTimeTo, setEntryTimeTo] = useState("");
  const [exitTimeFrom, setExitTimeFrom] = useState("");
  const [exitTimeTo, setExitTimeTo] = useState("");
  const [feeMin, setFeeMin] = useState("");
  const [feeMax, setFeeMax] = useState("");
  const [statusFilter, setStatusFilter] = useState(PARKING_HISTORY_DEFAULTS.DEFAULT_STATUS_FILTER);
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
    setSessionCode("");
    setLicensePlate("");
    setStatusFilter(PARKING_HISTORY_DEFAULTS.DEFAULT_STATUS_FILTER);
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
    sessionCode ||
      licensePlate ||
      statusFilter !== PARKING_HISTORY_DEFAULTS.DEFAULT_STATUS_FILTER ||
      entryTimeFrom ||
      entryTimeTo ||
      exitTimeFrom ||
      exitTimeTo ||
      feeMin ||
      feeMax ||
      activeQuickFilter !== QUICK_FILTER_KEYS.LAST_30_DAYS
  );

  // Đồng bộ licensePlate khi URL search param thay đổi
  useEffect(() => {
    if (queryPlate) {
      setLicensePlate(queryPlate);
      setCurrentPage(1);
    }
  }, [queryPlate]);

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

        const res = await getParkingSessions({
          session_code: sessionCode.trim(),
          license_plate: licensePlate.trim(),
          status: apiStatus,
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
    sessionCode,
    licensePlate,
    statusFilter,
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

  const handleConfirmCloseSession = async () => {
    if (!sessionActionModal || isActionSubmitting) return;
    setIsActionSubmitting(true);
    try {
      const res = await forceCloseSessionAndReleaseSlot({
        licensePlate: sessionActionModal.licensePlate,
        sessionCode: sessionActionModal.sessionCode,
        notes: "Đóng phiên đỗ từ màn hình Lịch sử ra/vào",
      });

      const message = res?.alreadyClosed
        ? PARKING_HISTORY_MESSAGES.CLOSE_SESSION_ALREADY(sessionActionModal.licensePlate)
        : PARKING_HISTORY_MESSAGES.CLOSE_SESSION_SUCCESS(sessionActionModal.licensePlate);

      toast.success(message);
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
      sessionCode,
      setSessionCode: (val) => { setSessionCode(val); setCurrentPage(1); },
      licensePlate,
      setLicensePlate: (val) => { setLicensePlate(val); setCurrentPage(1); },
      statusFilter,
      setStatusFilter: (val) => { setStatusFilter(val); setCurrentPage(1); },
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
