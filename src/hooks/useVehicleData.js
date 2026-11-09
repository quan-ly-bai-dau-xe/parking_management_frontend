import { useState, useEffect, useMemo, useCallback } from "react";
import {
  fetchVehicles,
  fetchVehicleSummary,
  mapVehicleSearchItem,
} from "../services/vehicleService";
import { customerService } from "../services/customerService";
import { getActiveSessions } from "../services/parkingLotService";
import { DEFAULT_UNASSIGNED_SLOT_LABEL } from "../constants/vehicleConstants";

export default function useVehicleData() {
  const [vehicles, setVehicles] = useState([]);
  const [vehicleStats, setVehicleStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [backendError, setBackendError] = useState(null);
  const [isUsingBackendData, setIsUsingBackendData] = useState(false);

  // Load KPI stats
  const refreshStats = useCallback(() => {
    fetchVehicleSummary()
      .then((data) => data && setVehicleStats(data))
      .catch((err) => console.warn("Could not load vehicle summary KPI:", err));
  }, []);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  // Load and hydrate vehicles with customer phones and active parking slot
  const loadVehicles = useCallback(() => {
    setIsLoading(true);
    Promise.allSettled([
      fetchVehicles({ page_size: 100 }),
      customerService.getCustomers(),
      getActiveSessions(),
    ])
      .then(([vehiclesRes, customersRes, sessionsRes]) => {
        const customerPhoneMap = new Map();
        if (customersRes.status === "fulfilled" && Array.isArray(customersRes.value)) {
          customersRes.value.forEach((cust) => {
            const phone = cust.phone;
            if (phone && phone !== "—" && phone !== "***") {
              if (cust.id) customerPhoneMap.set(String(cust.id), phone);
              if (cust.customerCode) customerPhoneMap.set(cust.customerCode, phone);
              if (cust.name) customerPhoneMap.set(cust.name.trim().toLowerCase(), phone);
            }
          });
        }

        const openSessionMap = new Map();
        if (sessionsRes.status === "fulfilled" && Array.isArray(sessionsRes.value)) {
          sessionsRes.value.forEach((sess) => {
            if (sess) {
              const plateNorm = String(sess.license_plate || sess.licensePlate || "")
                .replace(/[^A-Za-z0-9]/g, "")
                .toUpperCase();
              if (plateNorm) {
                openSessionMap.set(plateNorm, sess);
              }
              if (sess.vehicle_id) {
                openSessionMap.set(String(sess.vehicle_id), sess);
              }
            }
          });
        }

        if (vehiclesRes.status === "fulfilled") {
          const payload = vehiclesRes.value;
          const results = Array.isArray(payload) ? payload : payload?.results || [];
          const mapped = results.filter(Boolean).map((item) => {
            const mappedItem = mapVehicleSearchItem(item);
            const custId = String(mappedItem.customer.id || "");
            const custCode = String(mappedItem.customer.code || "");
            const custName = (mappedItem.customer.name || "").trim().toLowerCase();
            const hydratedPhone =
              mappedItem.customer.phone && mappedItem.customer.phone !== "—"
                ? mappedItem.customer.phone
                : customerPhoneMap.get(custId) ||
                  customerPhoneMap.get(custCode) ||
                  customerPhoneMap.get(custName) ||
                  "—";

            mappedItem.customer.phone = hydratedPhone;

            // Đồng bộ phiên đỗ đang mở và ô đỗ thực tế
            const plateNorm = String(mappedItem.licensePlate || "")
              .replace(/[^A-Za-z0-9]/g, "")
              .toUpperCase();
            const matchedSession =
              openSessionMap.get(plateNorm) ||
              openSessionMap.get(String(mappedItem.id)) ||
              openSessionMap.get(String(mappedItem.backendId));

            if (matchedSession) {
              mappedItem.status = "parked";
              mappedItem.statusDisplay = "Đang đỗ";
              const sessionSlot =
                matchedSession.slot_display ||
                matchedSession.display_text ||
                matchedSession.slot_code ||
                matchedSession.slotCode;

              if (
                sessionSlot &&
                (!mappedItem.parkingSlot?.display ||
                  mappedItem.parkingSlot.display === DEFAULT_UNASSIGNED_SLOT_LABEL ||
                  mappedItem.parkingSlot.display === "Chưa có vị trí")
              ) {
                mappedItem.parkingSlot = {
                  slotId: matchedSession.slot_id || matchedSession.slotId || null,
                  slot: matchedSession.slot_code || matchedSession.slotCode || sessionSlot,
                  display: sessionSlot,
                  floor: matchedSession.floor_name || "",
                  zone: matchedSession.zone_code || "",
                };
              }
            }

            return mappedItem;
          });

          setVehicles(mapped);
          setIsUsingBackendData(true);
          setBackendError(null);
        } else {
          console.warn("Could not load vehicles from backend:", vehiclesRes.reason);
          setBackendError("Không thể tải danh sách phương tiện từ máy chủ.");
          setIsUsingBackendData(false);
        }
      })
      .catch((err) => {
        console.warn("Unexpected error loading vehicles:", err);
        setBackendError("Lỗi hệ thống khi tải dữ liệu phương tiện.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  return {
    vehicles,
    setVehicles,
    vehicleStats,
    setVehicleStats,
    isLoading,
    backendError,
    isUsingBackendData,
    refreshStats,
    reload: loadVehicles,
  };
}
