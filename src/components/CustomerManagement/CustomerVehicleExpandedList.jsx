import React, { useState, useEffect } from "react";
import { customerService } from "../../services/customerService";

export default function CustomerVehicleExpandedList({ customer, onClose }) {
  const [vehicles, setVehicles] = useState(customer?.vehicles || []);
  const [loading, setLoading] = useState(
    (!customer?.vehicles || customer.vehicles.length === 0) &&
      (customer?.vehiclesCount > 0)
  );

  useEffect(() => {
    if (
      customer &&
      (!customer.vehicles || customer.vehicles.length === 0) &&
      customer.vehiclesCount > 0
    ) {
      let isMounted = true;
      setLoading(true);
      customerService
        .getCustomerById(customer.id)
        .then((detail) => {
          if (isMounted) {
            const list = Array.isArray(detail?.vehicles)
              ? detail.vehicles.map((v) => ({
                  id: String(v.id),
                  licensePlate: v.licensePlate || v.license_plate || "",
                  status: v.status || "Hoạt động",
                  vehicleType:
                    typeof v.vehicleType === "object"
                      ? v.vehicleType?.name
                      : v.vehicleType || v.vehicle_type_name || "Ô tô",
                }))
              : [];
            setVehicles(list);
          }
        })
        .catch((err) => {
          console.warn("Không thể tải danh sách xe mở rộng:", err);
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });

      return () => {
        isMounted = false;
      };
    } else {
      setVehicles(customer?.vehicles || []);
      setLoading(false);
    }
  }, [customer]);

  if (!customer) return null;

  return (
    <div className="bg-slate-50/50 border-t border-slate-200">
      <div className="rounded-lg border border-slate-200 bg-white p-3 m-3.5">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-semibold text-slate-700">
            Danh sách phương tiện của {customer.name} ({vehicles.length || customer.vehiclesCount || 0} xe)
          </h4>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xs px-1 cursor-pointer"
            title="Đóng"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="py-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <span className="inline-block animate-spin h-3.5 w-3.5 border-2 border-blue-600 border-t-transparent rounded-full" />
            <span>Đang tải thông tin phương tiện...</span>
          </div>
        ) : vehicles.length === 0 ? (
          <p className="py-3 text-center text-xs text-slate-400 italic">
            Khách hàng chưa đăng ký phương tiện nào.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/75 border-b border-slate-200 text-2xs font-semibold text-slate-700 uppercase tracking-wider">
                <tr>
                  <th className="py-2 px-3">Biển số</th>
                  <th className="py-2 px-3">Loại xe</th>
                  <th className="py-2 px-3">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal">
                {vehicles.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-3 font-bold font-mono text-slate-900">
                      {v.licensePlate}
                    </td>
                    <td className="py-2.5 px-3">{v.vehicleType || "Ô tô"}</td>
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {v.status || "Hoạt động"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
