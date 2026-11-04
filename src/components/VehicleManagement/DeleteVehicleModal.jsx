import React, { useState } from "react";
import ConfirmModal from "../common/modal/ConfirmModal";
import { VEHICLE_DELETE_MESSAGES } from "../../constants/vehicleConstants";

/**
 * DeleteVehicleModal
 * Modal Safe Delete chuyên dụng cho Quản lý xe:
 * 1. Phân quyền Manager / Non-manager
 * 2. Cảnh báo an toàn khi xe đang đỗ (có phiên đỗ mở) kèm tùy chọn cưỡng chế khẩn cấp
 * 3. Cảnh báo an toàn khi xe có vé đỗ hiệu lực (DEL-03 Database Guard)
 * 4. Xóa mềm thông thường khi xe hợp lệ
 */
export default function DeleteVehicleModal({
  isOpen,
  onClose,
  vehicle,
  isManager,
  isParked,
  hasActiveTicket,
  onConfirmDelete,
  onForceCloseAndConfirmDelete,
  onNavigateHistory,
  onNavigateTickets,
  loading = false,
}) {
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);
  const [emergencyReason, setEmergencyReason] = useState("");

  if (!vehicle) return null;

  // Trường hợp 1: Không phải Manager cố gắng xóa
  if (!isManager) {
    return (
      <ConfirmModal
        isOpen={isOpen}
        onClose={onClose}
        title="Quyền hạn không đủ"
        description="Chức năng giới hạn cho Quản lý"
        variant="warning"
        confirmText="Đã hiểu"
        showCloseButton={true}
        onConfirm={onClose}
      >
        <div className="text-sm text-slate-600">
          <p>{VEHICLE_DELETE_MESSAGES.NON_MANAGER_FORBIDDEN}</p>
          <div className="mt-3 p-3 bg-slate-50 rounded-lg text-xs text-slate-500">
            Biển số: <strong className="text-slate-800">{vehicle.licensePlate}</strong>
          </div>
        </div>
      </ConfirmModal>
    );
  }

  // Trường hợp 2: Xe đang có vé đỗ còn hiệu lực (Rào chắn DEL-03 Active Ticket Guard)
  if (hasActiveTicket) {
    return (
      <ConfirmModal
        isOpen={isOpen}
        onClose={onClose}
        title={VEHICLE_DELETE_MESSAGES.ACTIVE_TICKET_TITLE}
        description="Rào chắn toàn vẹn dữ liệu hợp đồng vé (DEL-03)"
        variant="warning"
        confirmText={VEHICLE_DELETE_MESSAGES.NAVIGATE_TO_TICKETS}
        cancelText="Đóng"
        onConfirm={onNavigateTickets}
        showCloseButton={true}
      >
        <div className="space-y-3 text-sm text-slate-600">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs leading-relaxed">
            {VEHICLE_DELETE_MESSAGES.ACTIVE_TICKET_BLOCKED}
          </div>

          <div className="bg-slate-50 p-3 rounded-lg text-xs space-y-1">
            <p>Biển số: <span className="font-semibold text-slate-800">{vehicle.licensePlate}</span></p>
            <p>Chủ xe: <span className="font-semibold text-slate-800">{vehicle.customer?.name || "Khách hàng"}</span></p>
            <p>Loại vé: <span className="font-semibold text-blue-600">{vehicle.ticket?.type || vehicle.ticketType || "Vé định kỳ"}</span></p>
            <p>Thời hạn đến: <span className="font-semibold text-slate-800">{vehicle.ticket?.expiresAt || vehicle.ticketExpiration || "Còn hiệu lực"}</span></p>
          </div>

          <p className="text-xs text-slate-500 italic">
            * Để xóa phương tiện này, bạn cần hủy hoặc đợi vé đỗ xe hết hạn tại phân hệ Quản lý vé để bảo đảm tính pháp lý và kế toán.
          </p>
        </div>
      </ConfirmModal>
    );
  }

  // Trường hợp 3: Xe đang đỗ trong bãi (có phiên đỗ mở)
  if (isParked) {
    return (
      <ConfirmModal
        isOpen={isOpen}
        onClose={() => {
          setIsEmergencyMode(false);
          setEmergencyReason("");
          onClose();
        }}
        title={isEmergencyMode ? VEHICLE_DELETE_MESSAGES.EMERGENCY_FORCE_CLOSE_CONFIRM : VEHICLE_DELETE_MESSAGES.PARKED_VEHICLE_TITLE}
        description={isEmergencyMode ? VEHICLE_DELETE_MESSAGES.EMERGENCY_FORCE_CLOSE_DESC : VEHICLE_DELETE_MESSAGES.PARKED_VEHICLE_DESC}
        variant="error"
        confirmText={isEmergencyMode ? "Xác nhận cưỡng chế xóa" : VEHICLE_DELETE_MESSAGES.NAVIGATE_TO_HISTORY}
        cancelText="Đóng"
        loading={loading}
        onConfirm={
          isEmergencyMode
            ? () => onForceCloseAndConfirmDelete(emergencyReason)
            : onNavigateHistory
        }
        showCloseButton={true}
      >
        <div className="space-y-3 text-sm text-slate-600">
          <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-xs leading-relaxed">
            {VEHICLE_DELETE_MESSAGES.PARKED_VEHICLE_BLOCKED}
          </div>

          <div className="bg-slate-50 p-3 rounded-lg text-xs space-y-1">
            <p>Biển số: <span className="font-semibold text-slate-800">{vehicle.licensePlate}</span></p>
            <p>Vị trí hiện tại: <span className="font-semibold text-slate-800">{vehicle.parkingSlot?.display || "Chưa xác định"}</span></p>
            <p>Thời điểm vào: <span className="font-semibold text-slate-800">{vehicle.entryTime || "—"}</span></p>
          </div>

          {/* Hộp tùy chọn cưỡng chế dành riêng cho Manager giải quyết tình huống thực tế */}
          <div className="pt-2 border-t border-slate-200">
            <label className="flex items-start gap-2 cursor-pointer text-xs font-medium text-slate-700">
              <input
                type="checkbox"
                checked={isEmergencyMode}
                onChange={(e) => setIsEmergencyMode(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
              />
              <span>
                <strong>Trường hợp khẩn cấp / Xử lý sự cố:</strong> Xe đã ra ngoài thực tế (xe cứu hộ cẩu ra, quét nhầm biển số, sự cố barrier) cần đóng phiên đỗ và xóa ngay.
              </span>
            </label>

            {isEmergencyMode && (
              <div className="mt-3 pl-6 space-y-2">
                <input
                  type="text"
                  value={emergencyReason}
                  onChange={(e) => setEmergencyReason(e.target.value)}
                  placeholder="Nhập lý do xử lý khẩn cấp (vd: Xe cứu hộ kéo ra bãi)..."
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-rose-500"
                />
                <p className="text-[11px] text-rose-600">
                  Hệ thống sẽ tự động đóng phiên đỗ, giải phóng slot và thực hiện xóa phương tiện an toàn.
                </p>
              </div>
            )}
          </div>
        </div>
      </ConfirmModal>
    );
  }

  // Trường hợp 4: Safe Delete thông thường cho Manager khi xe đã rời bãi và không có vé active
  return (
    <ConfirmModal
      isOpen={isOpen}
      onClose={onClose}
      title={VEHICLE_DELETE_MESSAGES.CONFIRM_DELETE_TITLE}
      description={VEHICLE_DELETE_MESSAGES.CONFIRM_DELETE_DESC}
      variant="error"
      confirmText="Xác nhận xóa"
      cancelText="Hủy"
      loading={loading}
      onConfirm={onConfirmDelete}
      showCloseButton={true}
    >
      <div className="text-sm text-slate-600 space-y-2">
        <p>
          Bạn có chắc chắn muốn xóa phương tiện có biển số{" "}
          <strong className="text-rose-600 font-bold">{vehicle.licensePlate}</strong>?
        </p>
        <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-500 space-y-1">
          <p>Chủ xe: <span className="font-medium text-slate-700">{vehicle.customer?.name || "Khách vãng lai"}</span></p>
          <p>Loại xe: <span className="font-medium text-slate-700">{vehicle.vehicleType || "Ô tô"}</span></p>
        </div>
      </div>
    </ConfirmModal>
  );
}
