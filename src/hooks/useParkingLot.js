import { useState, useEffect, useCallback } from "react";
import {
  getSlots,
  getCustomerParkingSlots,
  getSlotDetail as getSlotDetailApi,
  createSlot as createSlotApi,
  updateSlot as updateSlotApi,
  deleteSlot as deleteSlotApi,
  updateSlotStatus as updateSlotStatusApi,
  getStatusText,
} from "../services/parkingLotService.js";
/**
 * Custom hook quản lý dữ liệu ô đỗ xe từ Backend REST API thực tế (SRS 4.8.1 - 4.8.5).
 * Tuyệt đối không sử dụng mock fallback; báo lỗi trung thực khi máy chủ gặp sự cố.
 *
 * @param {Object} [options={}]
 * @param {string} [options.floor] - Mã tầng (ví dụ: 'B1', 'B2', 'F1')
 * @param {string} [options.zone] - Mã khu vực (ví dụ: 'A', 'B', 'C')
 * @param {string} [options.status] - Bộ lọc trạng thái (ví dụ: 'AVAILABLE', 'OVERSTAY')
 * @param {string} [options.vehicleType] - Mã loại xe cho phép (ví dụ: 'CAR', 'EV')
 * @param {string} [options.slotKind] - Loại ô đỗ ('STANDARD', 'PRIORITY', 'EV_CHARGING')
 * @param {string} [options.search] - Từ khóa tìm kiếm
 * @returns {{
 *   slots: Array<Object>,
 *   setSlots: Function,
 *   isLoading: boolean,
 *   error: string|null,
 *   refetch: () => Promise<void>,
 *   updateSlotStatus: (slotId: string|number, newStatus: string|Object) => Promise<{ success: boolean, data?: Object, error?: string }>,
 *   createSlot: (payload: Object) => Promise<{ success: boolean, data?: Object, error?: any }>,
 *   updateSlot: (slotId: string|number, payload: Object) => Promise<{ success: boolean, data?: Object, error?: any }>,
 *   deleteSlot: (slotId: string|number) => Promise<{ success: boolean, error?: any }>,
 *   fetchSlotDetail: (slotId: string|number) => Promise<Object>
 * }}
 */
export function useParkingLot({
  floor,
  zone,
  status: statusFilter,
  vehicleType,
  slotKind,
  search,
  isCustomer = false,
} = {}) {
  const [slots, setSlots] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSlotsData = useCallback(
    async (params = {}) => {
      const queryParams = {
        floor: params.floor ?? floor,
        zone: params.zone ?? zone,
        status: params.status ?? statusFilter,
        vehicle_type: params.vehicleType ?? vehicleType,
        slot_kind: params.slotKind ?? slotKind,
        search: params.search ?? search,
      };

      try {
        const loader = isCustomer ? getCustomerParkingSlots : getSlots;
        const data = await loader(queryParams);
        setSlots(Array.isArray(data) ? data : []);
        setError(null);
      } catch (err) {
        console.error("Lỗi khi tải dữ liệu ô đỗ từ backend API:", err);

        let errorMessage = "Không thể tải danh sách ô đỗ từ máy chủ.";
        if (err.status === 404) {
          errorMessage =
            "Không thể kết nối API máy chủ (/api/v1/parking/slots/): Endpoint chưa được triển khai hoặc không phản hồi (HTTP 404).";
        } else if (err.code === "API_UNAVAILABLE" || !err.status) {
          errorMessage =
            "Không thể kết nối tới máy chủ backend. Vui lòng kiểm tra kết nối mạng và trạng thái máy chủ.";
        } else if (err.message) {
          errorMessage = `Lỗi máy chủ (${err.status || err.code || "Error"}): ${err.message}`;
        }

        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [floor, zone, statusFilter, vehicleType, slotKind, search, isCustomer]
  );

  useEffect(() => {
    let isCancelled = false;

    const runFetch = async () => {
      setIsLoading(true);
      const queryParams = {
        floor,
        zone,
        status: statusFilter,
        vehicle_type: vehicleType,
        slot_kind: slotKind,
        search,
      };

      try {
        const loader = isCustomer ? getCustomerParkingSlots : getSlots;
        const data = await loader(queryParams);
        if (!isCancelled) {
          setSlots(Array.isArray(data) ? data : []);
          setError(null);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error("Lỗi khi tải dữ liệu ô đỗ từ backend API:", err);

          let errorMessage = "Không thể tải danh sách ô đỗ từ máy chủ.";
          if (err.status === 404) {
            errorMessage =
              "Không thể kết nối API máy chủ (/api/v1/parking/slots/): Endpoint chưa được triển khai hoặc không phản hồi (HTTP 404).";
          } else if (err.code === "API_UNAVAILABLE" || !err.status) {
            errorMessage =
              "Không thể kết nối tới máy chủ backend. Vui lòng kiểm tra kết nối mạng và trạng thái máy chủ.";
          } else if (err.message) {
            errorMessage = `Lỗi máy chủ (${err.status || err.code || "Error"}): ${err.message}`;
          }

          setError(errorMessage);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    runFetch();

    return () => {
      isCancelled = true;
    };
  }, [floor, zone, statusFilter, vehicleType, slotKind, search, isCustomer]);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    await fetchSlotsData();
  }, [fetchSlotsData]);

  const updateSlotStatus = useCallback(async (slotId, newStatus) => {
    try {
      const updated = await updateSlotStatusApi(slotId, newStatus);
      const resolvedStatus =
        typeof newStatus === "string"
          ? newStatus
          : newStatus?.status || updated?.status;

      setSlots((prevSlots) =>
        prevSlots.map((s) => {
          const currentId = s.id || s.slotId || s.code;
          if (String(currentId) === String(slotId)) {
            return {
              ...s,
              ...(typeof updated === "object" && updated ? updated : {}),
              status: resolvedStatus,
              statusText: getStatusText(resolvedStatus),
            };
          }
          return s;
        })
      );

      return { success: true, data: updated };
    } catch (err) {
      console.error(`Lỗi cập nhật trạng thái ô đỗ ${slotId}:`, err);
      const errMsg =
        err.message || `Lỗi cập nhật trạng thái ô đỗ ${slotId}`;
      return { success: false, error: errMsg, rawError: err };
    }
  }, []);

  const createSlot = useCallback(async (payload) => {
    try {
      const newSlot = await createSlotApi(payload);
      setSlots((prev) => [newSlot, ...prev]);
      return { success: true, data: newSlot };
    } catch (err) {
      console.error("Lỗi khi thêm ô đỗ xe:", err);
      return { success: false, error: err.message || "Lỗi khi thêm ô đỗ xe", rawError: err };
    }
  }, []);

  const updateSlot = useCallback(async (slotId, payload) => {
    try {
      const updated = await updateSlotApi(slotId, payload);
      setSlots((prev) =>
        prev.map((s) =>
          String(s.id || s.code) === String(slotId) ? { ...s, ...updated } : s
        )
      );
      return { success: true, data: updated };
    } catch (err) {
      console.error(`Lỗi khi cập nhật ô đỗ ${slotId}:`, err);
      return { success: false, error: err.message || "Lỗi khi cập nhật ô đỗ xe", rawError: err };
    }
  }, []);

  const deleteSlot = useCallback(async (slotId) => {
    try {
      await deleteSlotApi(slotId);
      setSlots((prev) =>
        prev.filter((s) => String(s.id || s.code) !== String(slotId))
      );
      return { success: true };
    } catch (err) {
      console.error(`Lỗi khi xóa ô đỗ ${slotId}:`, err);
      return { success: false, error: err.message || "Lỗi khi xóa ô đỗ xe", rawError: err };
    }
  }, []);

  const fetchSlotDetail = useCallback(async (slotId) => {
    return await getSlotDetailApi(slotId);
  }, []);

  return {
    slots,
    setSlots,
    isLoading,
    error,
    refetch,
    updateSlotStatus,
    createSlot,
    updateSlot,
    deleteSlot,
    fetchSlotDetail,
  };
}

export default useParkingLot;
