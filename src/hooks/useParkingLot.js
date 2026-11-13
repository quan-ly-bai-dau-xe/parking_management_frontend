import { useState, useEffect, useCallback } from "react";
import {
  getSlots,
  updateSlotStatus as updateSlotStatusApi,
  getStatusText,
} from "../services/parkingLotService.js";
import { getMockParkingSlots } from "../mocks/parkingSlotFallback";

const isMockEnabled =
  import.meta.env?.VITE_USE_MOCK?.trim().toLowerCase() === "true";

/**
 * Custom hook quản lý dữ liệu ô đỗ xe từ Backend API thực tế.
 * Tạm fallback về mock data khi API lỗi hoặc trả về 404 để giữ UI hoạt động.
 *
 * @param {Object} [options={}]
 * @param {string} [options.floor] - Mã tầng (ví dụ: 'B1', 'B2', 'F1')
 * @param {string} [options.zone] - Mã khu vực (ví dụ: 'A', 'B', 'C')
 * @returns {{
 *   slots: Array<Object>,
 *   isLoading: boolean,
 *   error: string|null,
 *   refetch: () => Promise<void>,
 *   updateSlotStatus: (slotId: string|number, newStatus: string|Object) => Promise<{ success: boolean, data?: Object, error?: string }>
 * }}
 */
export function useParkingLot({ floor, zone } = {}) {
  const [slots, setSlots] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSlotsData = useCallback(
    async (params = { floor, zone }) => {
      const queryParams = {};
      if (params.floor) queryParams.floor = params.floor;
      if (params.zone) queryParams.zone = params.zone;

      try {
        const data = await getSlots(queryParams);
        setSlots(Array.isArray(data) ? data : []);
        setError(null);
      } catch (err) {
        console.warn("Lỗi khi tải dữ liệu ô đỗ từ backend API:", err);

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

        if (isMockEnabled) {
          if (isMockEnabled) {
            console.warn("Fallback sang dữ liệu mock ô đỗ:", errorMessage);
            setSlots(getMockParkingSlots(queryParams));
            setError(null);
          } else {
            setError(errorMessage);
          }
        } else {
          setError(errorMessage);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [floor, zone]
  );

  // Gọi API khi khởi tạo hook hoặc khi floor/zone thay đổi
  useEffect(() => {
    let isCancelled = false;

    const runFetch = async () => {
      const queryParams = {};
      if (floor) queryParams.floor = floor;
      if (zone) queryParams.zone = zone;

      try {
        const data = await getSlots(queryParams);
        if (!isCancelled) {
          setSlots(Array.isArray(data) ? data : []);
          setError(null);
        }
      } catch (err) {
        if (!isCancelled) {
          console.warn("Lỗi khi tải dữ liệu ô đỗ từ backend API:", err);

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

          if (isMockEnabled) {
            console.warn("Fallback sang dữ liệu mock ô đỗ:", errorMessage);
            setSlots(getMockParkingSlots(queryParams));
            setError(null);
          } else {
            setError(errorMessage);
          }
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
  }, [floor, zone]);

  // Hành động refetch thủ công cho người dùng
  const refetch = useCallback(async () => {
    setIsLoading(true);
    await fetchSlotsData({ floor, zone });
  }, [fetchSlotsData, floor, zone]);

  /**
   * Cập nhật trạng thái ô đỗ qua Backend API
   * @param {string|number} slotId - ID hoặc mã ô đỗ
   * @param {string|Object} newStatus - Trạng thái mới
   */
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
          if (currentId === slotId) {
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
        err.status === 404
          ? `API cập nhật trạng thái ô đỗ (/api/v1/parking/slots/${slotId}/) chưa được hỗ trợ trên backend (HTTP 404).`
          : err.message || `Lỗi cập nhật trạng thái ô đỗ ${slotId}`;
      setError(errMsg);
      return { success: false, error: errMsg };
    }
  }, []);

  return {
    slots,
    isLoading,
    error,
    refetch,
    updateSlotStatus,
  };
}

export default useParkingLot;
