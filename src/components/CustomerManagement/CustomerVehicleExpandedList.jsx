import React from "react";

export default function CustomerVehicleExpandedList({ customer, onClose }) {
  if (!customer || !customer.vehicles || customer.vehicles.length === 0) {
    return null;
  }

  return (
    <div className="bg-slate-50/50 border-t border-slate-200">
      <div className="rounded-lg border border-slate-200 bg-white p-3 m-3.5">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-semibold text-slate-700">
            Danh sách xe của {customer.name} ({customer.vehicles.length} xe)
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
              {customer.vehicles.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50/80">
                  <td className="py-2.5 px-3 font-bold font-mono text-slate-900">
                    {v.licensePlate}
                  </td>
                  <td className="py-2.5 px-3">{v.vehicleType || "Ô tô"}</td>
                  <td className="py-2.5 px-3">{v.status || "Đang đỗ"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
