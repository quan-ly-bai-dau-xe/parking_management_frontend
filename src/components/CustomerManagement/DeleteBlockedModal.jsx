import React from "react";
import { useNavigate } from "react-router-dom";
import { BaseModal } from "../common/modal";
import { Button } from "../common";
import { ROUTES } from "../../config/navigation";

/**
 * DeleteBlockedModal (DEL-02 Guard Rule Modal)
 * Hiển thị giải thích chi tiết lý do khách hàng không thể xóa theo quy tắc toàn vẹn dữ liệu DEL-02:
 * 1. Khách hàng còn xe đang đăng ký trong hệ thống (PROP-DEL-02-ACTIVE-VEH).
 * 2. Phương tiện đang còn đỗ trong bãi (PROP-4.4.5-P02).
 * 3. Vé hoặc hợp đồng gửi xe còn hiệu lực (PROP-4.4.5-P03).
 */
export default function DeleteBlockedModal({ isOpen, onClose, customer }) {
  const navigate = useNavigate();

  if (!customer) return null;

  const vehicles = customer.vehicles || [];
  const vehiclesCount = customer.vehiclesCount ?? vehicles.length;
  const hasActiveTicket = Boolean(customer.hasActiveTicket);

  const handleGoToVehicles = () => {
    onClose();
    navigate(ROUTES.VEHICLES);
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Không thể xóa khách hàng"
      size="md"
      footer={
        <div className="flex flex-col-reverse sm:flex-row items-center justify-between w-full gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={onClose} className="w-full sm:w-auto cursor-pointer">
            Đóng
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleGoToVehicles}
            className="w-full sm:w-auto cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>Đi đến Quản lý xe</span>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-xs text-slate-700">
        {/* Banner cảnh báo */}
        <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="shrink-0 w-5 h-5 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mt-0.5">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="space-y-1">
            <h4 className="font-semibold text-amber-900">
              Ràng buộc an toàn toàn vẹn dữ liệu (DEL-02)
            </h4>
            <p className="text-amber-800 text-2xs leading-relaxed">
              Hệ thống Smart Mobility không thể xóa khách hàng{" "}
              <strong className="text-slate-900">{customer.name}</strong> ({customer.customerCode}) do
              còn dữ liệu liên kết đang hoạt động.
            </p>
          </div>
        </div>

        {/* Danh sách điều kiện bị vướng */}
        <div className="space-y-2.5">
          <p className="font-semibold text-slate-800">Các ràng buộc đang kích hoạt:</p>
          <div className="space-y-2">
            {/* Ràng buộc xe */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-medium text-slate-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  Phương tiện liên kết ({vehiclesCount} xe)
                </span>
                <span className="text-2xs font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  Chưa gỡ bỏ
                </span>
              </div>
              {vehicles.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {vehicles.map((v) => (
                    <span
                      key={v.id || v.licensePlate}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white border border-slate-300 font-mono text-xs font-bold text-slate-800 shadow-2xs"
                    >
                      🚗 {v.licensePlate}
                      {v.vehicleType && (
                        <span className="text-2xs font-normal text-slate-500 font-sans">
                          ({v.vehicleType})
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-2xs text-slate-500">Đang ghi nhận {vehiclesCount} xe trong hệ thống.</p>
              )}
            </div>

            {/* Ràng buộc vé xe */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-800 flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      hasActiveTicket ? "bg-rose-500" : "bg-emerald-500"
                    }`}
                  ></span>
                  Gói vé / Phiên gửi xe
                </span>
                <span
                  className={`text-2xs font-semibold px-2 py-0.5 rounded border ${
                    hasActiveTicket
                      ? "text-rose-600 bg-rose-50 border-rose-200"
                      : "text-emerald-700 bg-emerald-50 border-emerald-200"
                  }`}
                >
                  {hasActiveTicket ? "Đang có vé hiệu lực" : "Không có vé tồn đọng"}
                </span>
              </div>
              <p className="text-2xs text-slate-500 mt-1">
                Gói hiện tại: <strong className="text-slate-700">{customer.packageType || "Vé tháng"}</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Hướng dẫn thao tác */}
        <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-lg text-2xs text-blue-900 space-y-1">
          <p className="font-semibold flex items-center gap-1">
            <span>💡</span> Hướng dẫn để xóa khách hàng:
          </p>
          <ol className="list-decimal pl-4 space-y-0.5 text-blue-800">
            <li>Truy cập trang <strong>Quản lý xe</strong> và tìm các biển số xe trên.</li>
            <li>Gỡ bỏ hoặc chuyển nhượng các phương tiện thuộc sở hữu của khách hàng.</li>
            <li>Đảm bảo vé gửi xe đã hết hạn hoặc được thanh lý.</li>
            <li>Quay lại trang này và thực hiện xóa khách hàng.</li>
          </ol>
        </div>
      </div>
    </BaseModal>
  );
}
