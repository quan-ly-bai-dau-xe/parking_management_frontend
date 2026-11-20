import React from "react";
import BaseModal from "../common/modal/BaseModal";
import Button from "../common/button/Button";
import StatusBadge from "../common/badge/StatusBadge";
import VehicleTicketTypeBadge from "./VehicleTicketTypeBadge";
import { DEFAULT_UNASSIGNED_SLOT_LABEL } from "../../constants/vehicleConstants";

/**
 * VehicleDetailModal
 * Modal hiển thị toàn bộ thông tin chi tiết của phương tiện:
 * - Biển số xe & Trạng thái hoạt động
 * - Thông số xe (Loại xe, Hãng xe, Model, Màu sắc)
 * - Thông tin chủ sở hữu (Khách hàng)
 * - Thông tin vé xe & Thời hạn
 * - Vị trí đỗ & Lịch sử phiên gần nhất
 */
export default function VehicleDetailModal({
  isOpen,
  onClose,
  vehicle,
  onEdit,
  onAssignSlot,
}) {
  if (!isOpen || !vehicle) return null;

  const isParked = vehicle.status === "parked";
  const slotDisplay = vehicle.parkingSlot?.display || vehicle.parkingSlot?.slot;
  const hasSlot =
    slotDisplay &&
    slotDisplay !== DEFAULT_UNASSIGNED_SLOT_LABEL &&
    slotDisplay !== "Chưa có vị trí" &&
    slotDisplay !== "—";

  const customer = vehicle.customer || {};
  const ticket = vehicle.ticket || {};
  const isBlacklisted = Boolean(
    vehicle.isBlacklisted ||
    vehicle.is_blacklisted ||
    vehicle.status === "BLACKLISTED"
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Thông tin chi tiết phương tiện"
      description="Xem hồ sơ phương tiện, chủ sở hữu và thông tin vé liên kết"
      size="2xl"
    >
      <div className="space-y-5">
        {/* Header: Biển số xe & Trạng thái chính */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-2xs">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.85 7h10.29l1.08 3.11H5.77L6.85 7zM19 17H5v-4.66l.12-.34h13.77l.11.34V17z" />
                <circle cx="7.5" cy="14.5" r="1.5" />
                <circle cx="16.5" cy="14.5" r="1.5" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xs font-bold font-mono px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                  {vehicle.code || vehicle.id}
                </span>
                <span className="text-2xs font-semibold text-slate-400">
                  Loại: {vehicle.vehicleType || (vehicle.vehicleTypeCode === "EV" ? "Xe điện" : "Ô tô")}
                </span>
              </div>
              <h2 className="text-xl font-black font-mono tracking-wider text-slate-900 mt-0.5">
                {vehicle.licensePlate}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isBlacklisted ? (
              <StatusBadge status="blacklisted" label="Danh sách đen" />
            ) : (
              <StatusBadge status={vehicle.status} label={vehicle.statusDisplay} />
            )}
            <VehicleTicketTypeBadge ticketType={ticket.type || vehicle.ticketType} />
          </div>
        </div>

        {/* 2 Cột thông tin: Thông số xe & Chủ sở hữu */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card Thông số xe */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                Thông số phương tiện
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div>
                <span className="text-2xs text-slate-400 block">Hãng sản xuất</span>
                <span className="font-semibold text-slate-800">{vehicle.brand || "—"}</span>
              </div>
              <div>
                <span className="text-2xs text-slate-400 block">Dòng xe (Model)</span>
                <span className="font-semibold text-slate-800">{vehicle.model || vehicle.modelName || "—"}</span>
              </div>
              <div>
                <span className="text-2xs text-slate-400 block">Màu sơn xe</span>
                <span className="font-semibold text-slate-800">{vehicle.color || "—"}</span>
              </div>
              <div>
                <span className="text-2xs text-slate-400 block">Ngày đăng ký</span>
                <span className="font-semibold text-slate-800">{ticket.registeredAt || "—"}</span>
              </div>
            </div>

            {/* Vị trí đỗ hiện tại */}
            <div className="pt-2 border-t border-slate-100">
              <span className="text-2xs text-slate-400 block mb-1">Vị trí đỗ xe trong bãi:</span>
              {isParked ? (
                <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 border border-emerald-200">
                  <span className="font-semibold text-emerald-800 text-xs inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    {hasSlot ? slotDisplay : "Chờ xếp ô (Đang đỗ)"}
                  </span>
                  {onAssignSlot && (
                    <button
                      type="button"
                      onClick={() => onAssignSlot(vehicle)}
                      className="px-2 py-1 text-2xs font-semibold text-emerald-700 bg-white rounded border border-emerald-300 hover:bg-emerald-100 transition-colors"
                    >
                      {hasSlot ? "Đổi vị trí" : "Chỉ định ô"}
                    </button>
                  )}
                </div>
              ) : (
                <span className="text-xs font-medium text-slate-500">
                  {hasSlot ? slotDisplay : "Phương tiện hiện đang ở ngoài bãi"}
                </span>
              )}
            </div>

            {/* Ghi chú */}
            {vehicle.note && (
              <div className="p-2.5 rounded-lg bg-slate-50 text-2xs text-slate-600 border border-slate-100">
                <span className="font-semibold block mb-0.5 text-slate-700">Ghi chú:</span>
                {vehicle.note}
              </div>
            )}
          </div>

          {/* Card Thông tin chủ xe */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                Thông tin chủ sở hữu
              </h3>
            </div>

            <div className="flex items-center gap-3 py-1">
              <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                {(customer.name || "KH").slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">{customer.name || "—"}</h4>
                <span className="text-2xs text-slate-400 font-mono block">
                  Mã KH: {customer.code || customer.customerCode || (customer.id ? `KH${String(customer.id).padStart(4, "0")}` : "—")}
                </span>
              </div>
            </div>

            <div className="space-y-2 text-xs pt-1 border-t border-slate-100">
              <div className="flex justify-between items-center">
                <span className="text-2xs text-slate-400">Số điện thoại:</span>
                {customer.phone && customer.phone !== "—" ? (
                  <a
                    href={`tel:${customer.phone}`}
                    className="font-semibold text-blue-600 hover:underline font-mono"
                  >
                    {customer.phone}
                  </a>
                ) : (
                  <span className="text-slate-400">Chưa cập nhật</span>
                )}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-2xs text-slate-400">Email:</span>
                <span className="font-medium text-slate-700">{customer.email || "—"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-2xs text-slate-400">Số xe sở hữu:</span>
                <span className="font-bold text-slate-900">{customer.totalVehicles ?? customer.vehiclesCount ?? "1"} xe</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card Trạng thái vé & Lịch sử phiên */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              Thông tin vé & Phiên đỗ
            </h3>
            <span className="text-2xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
              {ticket.type || vehicle.ticketType || "Vé lượt"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-2xs text-slate-400 block">Thời gian hiệu lực</span>
              <span className="font-bold text-slate-800 text-xs mt-0.5 block">
                {ticket.expiresAt || vehicle.ticketExpiration || "—"}
              </span>
              <span className="text-3xs text-slate-500 mt-1 block">
                {ticket.status === "warning"
                  ? "⚠️ Vé sắp hết hạn"
                  : ticket.status === "expired"
                  ? "❌ Đã hết hạn"
                  : "✅ Vé còn hiệu lực"}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-2xs text-slate-400 block">Số ngày còn lại</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg font-black text-slate-900">{ticket.remainingDays ?? 0}</span>
                <span className="text-3xs text-slate-500 font-semibold">ngày</span>
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full mt-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    ticket.status === "warning"
                      ? "bg-amber-500"
                      : ticket.status === "expired"
                      ? "bg-rose-500"
                      : "bg-blue-600"
                  }`}
                  style={{
                    width: `${Math.min(100, Math.max(10, ((ticket.remainingDays || 0) / 60) * 100))}%`,
                  }}
                />
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-2xs text-slate-400 block">Thời gian ra/vào gần nhất</span>
              <span className="font-semibold text-slate-800 text-2xs mt-0.5 block font-mono">
                Vào: {vehicle.entryTime || "—"}
              </span>
              <span className="font-semibold text-slate-600 text-2xs mt-0.5 block font-mono">
                Ra: {vehicle.exitTime || (isParked ? "Chưa xuất bãi" : "—")}
              </span>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Đóng
          </Button>
          {onEdit && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onEdit(vehicle)}
              icon={
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              }
            >
              Chỉnh sửa thông tin xe
            </Button>
          )}
        </div>
      </div>
    </BaseModal>
  );
}

