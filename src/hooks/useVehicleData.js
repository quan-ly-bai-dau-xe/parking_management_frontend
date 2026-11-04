import { useState, useEffect, useMemo, useCallback } from "react";
import {
  fetchVehicles,
  fetchVehicleSummary,
  mapVehicleSearchItem,
} from "../services/vehicleService";
import { customerService } from "../services/customerService";

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

  // Load and hydrate vehicles with customer phones
  const loadVehicles = useCallback(() => {
    setIsLoading(true);
    Promise.allSettled([
      fetchVehicles({ page_size: 100 }),
      customerService.getCustomers(),
    ])
      .then(([vehiclesRes, customersRes]) => {
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
