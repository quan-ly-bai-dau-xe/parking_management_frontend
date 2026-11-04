import React from "react";
import Button from "../common/button/Button";
import { DEFAULT_UNASSIGNED_SLOT_LABEL } from "../../constants/vehicleConstants";

export default function VehicleDetailCards({
  selectedVehicle,
  handleOpenEditModal,
  handleViewTicket,
  renderStatusBadge,
}) {
  if (!selectedVehicle) return null;

  return (
    <div id="vehicle-detail-section" className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* 1. Chi tiết xe */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Chi tiết xe</h3>
              <p className="text-2xs text-slate-400">Thông tin phương tiện được chọn</p>
            </div>
            <Button
              variant="subtle"
              size="xs"
              onClick={() => handleOpenEditModal(selectedVehicle.id)}
              icon={
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              }
            >
              Chỉnh sửa
            </Button>
          </div>

          {/* Vehicle Badge & Big Plate */}
          <div className="flex items-center gap-3.5 my-4">
            <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-500">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.85 7h10.29l1.08 3.11H5.77L6.85 7zM19 17H5v-4.66l.12-.34h13.77l.11.34V17z" />
                <circle cx="7.5" cy="14.5" r="1.5" />
                <circle cx="16.5" cy="14.5" r="1.5" />
              </svg>
            </div>
            <div>
              <span className="text-2xs font-semibold text-blue-600 block">{selectedVehicle.id}</span>
              <span className="text-base font-bold font-mono tracking-wider text-slate-900 block">
                {selectedVehicle.licensePlate}
              </span>
              <div className="mt-0.5">
                {renderStatusBadge(selectedVehicle.status, selectedVehicle.statusDisplay)}
              </div>
            </div>
          </div>

          {/* Grid Properties */}
          <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-100">
            <div>
              <span className="text-2xs text-slate-400 block">Khách hàng / Chủ xe</span>
              <span className="font-semibold text-slate-800">
                {(selectedVehicle.customer?.code && selectedVehicle.customer.code !== "—"
                  ? selectedVehicle.customer.code
                  : selectedVehicle.customer?.id && !isNaN(Number(selectedVehicle.customer.id))
                  ? `KH${String(selectedVehicle.customer.id).padStart(4, "0")}`
                  : selectedVehicle.customer?.id || "—")}{" "}
                — {selectedVehicle.customer?.name || "—"}
              </span>
            </div>
            <div>
              <span className="text-2xs text-slate-400 block">Hãng xe</span>
              <span className="font-semibold text-slate-800">{selectedVehicle.brand || "—"}</span>
            </div>
            <div>
              <span className="text-2xs text-slate-400 block">Model</span>
              <span className="font-semibold text-slate-800">{selectedVehicle.model || "—"}</span>
            </div>
            <div>
              <span className="text-2xs text-slate-400 block">Loại vé đang sử dụng</span>
              <span className="font-semibold text-slate-800">
                {selectedVehicle.ticket?.type || selectedVehicle.ticketType || "—"}
              </span>
            </div>
            <div>
              <span className="text-2xs text-slate-400 block">Ngày hết hạn vé</span>
              <span className="font-semibold text-slate-800">
                {selectedVehicle.ticket?.expiresAt || selectedVehicle.ticketExpiration || "—"}
              </span>
            </div>
            <div>
              <span className="text-2xs text-slate-400 block">Vị trí đỗ xe</span>
              <span className="font-semibold text-emerald-700">
                {selectedVehicle.parkingSlot?.display || selectedVehicle.parkingSlot?.slot || DEFAULT_UNASSIGNED_SLOT_LABEL}
              </span>
            </div>
            <div>
              <span className="text-2xs text-slate-400 block">Ngày đăng ký</span>
              <span className="font-semibold text-slate-800">
                {selectedVehicle.ticket?.registeredAt || "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Note box */}
        <div className="mt-4 p-2.5 bg-slate-50 rounded-lg text-2xs text-slate-500 border border-slate-100">
          {selectedVehicle.note || "Không có ghi chú thêm."}
        </div>
      </div>

      {/* 2. Thông tin chủ xe */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 flex flex-col justify-between">
        <div>
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">Thông tin chủ xe</h3>
            <p className="text-2xs text-slate-400">Khách hàng liên kết với phương tiện</p>
          </div>

          <div className="flex items-center gap-3.5 my-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
              {(selectedVehicle.customer?.name || "KH").slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">{selectedVehicle.customer?.name || "—"}</h4>
              <span className="text-2xs text-slate-400 font-mono block">
                {selectedVehicle.customer?.code && selectedVehicle.customer.code !== "—"
                  ? selectedVehicle.customer.code
                  : selectedVehicle.customer?.id && !isNaN(Number(selectedVehicle.customer.id))
                  ? `KH${String(selectedVehicle.customer.id).padStart(4, "0")}`
                  : selectedVehicle.customer?.id || "—"}
              </span>
            </div>
          </div>

          <div className="space-y-3.5 text-xs pt-2 border-t border-slate-100">
            <div>
              <span className="text-2xs text-slate-400 block">Số điện thoại</span>
              <span className="font-semibold text-slate-800 text-sm">
                {selectedVehicle.customer?.phone || "—"}
              </span>
            </div>
            <div>
              <span className="text-2xs text-slate-400 block">Email</span>
              <span className="font-medium text-slate-700">
                {selectedVehicle.customer?.email || "—"}
              </span>
            </div>
            <div>
              <span className="text-2xs text-slate-400 block">Số xe đã đăng ký</span>
              <span className="font-semibold text-slate-900 text-sm">
                {selectedVehicle.customer?.totalVehicles ?? "—"} xe
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-2xs text-slate-400">Tình trạng tài khoản</span>
          <span className="text-emerald-600 font-semibold text-xs flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Đã xác minh danh tính
          </span>
        </div>
      </div>

      {/* 3. Trạng thái vé */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Trạng thái vé</h3>
              <p className="text-2xs text-slate-400">Thông tin chi tiết vé xe</p>
            </div>
            <span className="text-2xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
              {selectedVehicle.ticket?.type || selectedVehicle.ticketType || "Chưa đăng ký vé"}
            </span>
          </div>

          <div className="my-5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-slate-900">
                {selectedVehicle.ticket?.remainingDays ?? 0}
              </span>
              <span className="text-sm font-semibold text-slate-600">ngày</span>
            </div>
            <span className="text-2xs text-slate-400 block mt-0.5">Thời gian còn lại</span>

            <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  selectedVehicle.ticket?.status === "warning"
                    ? "bg-amber-500"
                    : selectedVehicle.ticket?.status === "expired"
                      ? "bg-rose-500"
                      : "bg-blue-600"
                }`}
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(
                      10,
                      ((selectedVehicle.ticket?.remainingDays || 0) / 60) * 100,
                    ),
                  )}%`,
                }}
              ></div>
            </div>
          </div>

          <div className="flex items-center justify-between py-2 border-y border-slate-100 text-xs">
            <span className="text-slate-500">Ngày hết hạn</span>
            <span className="font-semibold text-slate-900">
              {selectedVehicle.ticket?.expiresAt || selectedVehicle.ticketExpiration || "—"}
            </span>
          </div>

          <div className="mt-3 flex items-center gap-1.5 text-xs">
            {selectedVehicle.ticket?.status === "warning" ? (
              <span className="text-amber-600 font-medium flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                Vé sắp hết hạn, vui lòng nhắc khách gia hạn.
              </span>
            ) : selectedVehicle.ticket?.status === "expired" ? (
              <span className="text-rose-600 font-medium flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                Vé đã hết hạn! Cần gia hạn ngay.
              </span>
            ) : (
              <span className="text-emerald-600 font-medium flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Vé còn hiệu lực.
              </span>
            )}
          </div>
        </div>

        <div className="mt-5">
          <Button
            variant="secondary"
            size="sm"
            fullWidth
            onClick={() => handleViewTicket(selectedVehicle)}
          >
            Xem thông tin vé
          </Button>
        </div>
      </div>
    </div>
  );
}
