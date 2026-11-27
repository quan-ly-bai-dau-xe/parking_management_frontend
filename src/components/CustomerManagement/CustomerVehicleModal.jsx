import { useState } from "react";
import { extractApiErrorInfo } from "../../services/walletService";
import { validateVehiclePlateInput } from "../../utils/plateFormatter";
import useModalA11y from "../../hooks/useModalA11y";

function getSafeHttpImageUrl(rawUrl) {
  const trimmed = String(rawUrl || "").trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return "";
}

function VehicleModalForm({
  onClose,
  onSubmitVehicle,
  onBusyChange,
  initialVehicle,
  vehicleTypes,
}) {
  const isEditMode = Boolean(initialVehicle);
  const initialTypeId =
    initialVehicle?.vehicle_type_id ??
    initialVehicle?.vehicle_type?.id ??
    vehicleTypes[0]?.id ??
    "";

  const [formData, setFormData] = useState(() => ({
    license_plate: initialVehicle?.license_plate ?? "",
    vehicle_type_id: initialTypeId ? String(initialTypeId) : "",
    brand: initialVehicle?.brand ?? "",
    model_name: initialVehicle?.model_name ?? "",
    color: initialVehicle?.color ?? "",
    image_url: getSafeHttpImageUrl(initialVehicle?.image_url),
    notes: initialVehicle?.notes ?? "",
  }));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedTypeId =
    formData.vehicle_type_id || (vehicleTypes[0]?.id ? String(vehicleTypes[0].id) : "");

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: field === "license_plate" ? value.toUpperCase() : value,
    }));
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const plateCheck = validateVehiclePlateInput(formData.license_plate, "CAR");
    const plate = plateCheck.formatted || plateCheck.normalized;
    const modelName = formData.model_name.trim();
    if (!plateCheck.valid && plateCheck.reason === "EMPTY") {
      setError("Vui lòng nhập biển số xe.");
      return;
    }
    if (!isEditMode && !plateCheck.valid) {
      setError("Biển số xe chỉ được chứa chữ cái không dấu, chữ số và dấu gạch/chấm (VD: 51A-897.14).");
      return;
    }
    if (!modelName) {
      setError("Vui lòng nhập tên dòng xe / model.");
      return;
    }
    if (!isEditMode && !selectedTypeId) {
      setError("Vui lòng chọn loại phương tiện.");
      return;
    }

    const safeImageUrl = getSafeHttpImageUrl(formData.image_url);
    if (formData.image_url.trim() && !safeImageUrl) {
      setError("URL ảnh xe phải bắt đầu bằng http:// hoặc https://.");
      return;
    }

    const payload = isEditMode
      ? {
          row_version: initialVehicle.row_version ?? 1,
          vehicle_type_id: selectedTypeId ? Number(selectedTypeId) : undefined,
          brand: formData.brand.trim() || null,
          model_name: modelName,
          color: formData.color.trim() || null,
          image_url: safeImageUrl || null,
          notes: formData.notes.trim() || null,
        }
      : {
          license_plate: plate,
          vehicle_type_id: Number(selectedTypeId),
          brand: formData.brand.trim() || null,
          model_name: modelName,
          color: formData.color.trim() || null,
          image_url: safeImageUrl || null,
          notes: formData.notes.trim() || null,
        };

    setLoading(true);
    onBusyChange?.(true);
    setError("");
    try {
      await onSubmitVehicle(payload, initialVehicle);
      onClose();
    } catch (err) {
      const info = extractApiErrorInfo(err, "Không thể lưu thông tin phương tiện.");
      setError(info.message);
    } finally {
      setLoading(false);
      onBusyChange?.(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
      {/* Biển số xe & Loại phương tiện */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label htmlFor="license_plate" className="block text-xs font-semibold text-slate-700 mb-1.5">
            Biển số xe <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            id="license_plate"
            required
            disabled={isEditMode}
            value={formData.license_plate}
            onChange={(e) => handleChange("license_plate", e.target.value)}
            placeholder="Ví dụ: 51K-992.14"
            autoFocus={!isEditMode}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 font-mono font-semibold uppercase placeholder:font-sans placeholder:font-normal placeholder:normal-case placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:bg-slate-100 disabled:cursor-not-allowed"
          />
        </div>

        <div>
          <label htmlFor="vehicle_type_id" className="block text-xs font-semibold text-slate-700 mb-1.5">
            Loại phương tiện <span className="text-rose-500">*</span>
          </label>
          <select
            id="vehicle_type_id"
            value={selectedTypeId}
            onChange={(e) => handleChange("vehicle_type_id", e.target.value)}
            className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          >
            {vehicleTypes.length === 0 ? (
              <option value="">Đang tải loại xe...</option>
            ) : (
              vehicleTypes.map((vt) => (
                <option key={vt.id} value={String(vt.id)}>
                  {vt.name} ({vt.code})
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* Hãng xe & Mẫu xe */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label htmlFor="brand" className="block text-xs font-semibold text-slate-700 mb-1.5">
            Hãng xe
          </label>
          <input
            type="text"
            id="brand"
            value={formData.brand}
            onChange={(e) => handleChange("brand", e.target.value)}
            placeholder="Toyota, Mazda, VinFast..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        <div>
          <label htmlFor="model_name" className="block text-xs font-semibold text-slate-700 mb-1.5">
            Mẫu xe <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            id="model_name"
            required
            value={formData.model_name}
            onChange={(e) => handleChange("model_name", e.target.value)}
            placeholder="Camry, CX-5, VF 8..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      {/* Màu sơn & URL ảnh xe */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label htmlFor="color" className="block text-xs font-semibold text-slate-700 mb-1.5">
            Màu sơn <span className="text-slate-400 font-normal">(Không bắt buộc)</span>
          </label>
          <input
            type="text"
            id="color"
            value={formData.color}
            onChange={(e) => handleChange("color", e.target.value)}
            placeholder="Ví dụ: Trắng, Đen, Xám bạc..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        <div>
          <label htmlFor="image_url" className="block text-xs font-semibold text-slate-700 mb-1.5">
            URL ảnh xe (https://) <span className="text-slate-400 font-normal">(Không bắt buộc)</span>
          </label>
          <input
            type="url"
            id="image_url"
            value={formData.image_url}
            onChange={(e) => handleChange("image_url", e.target.value)}
            placeholder="https://example.com/vehicle.jpg"
            className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      {/* Ghi chú */}
      <div>
        <label htmlFor="vehicle_notes" className="block text-xs font-semibold text-slate-700 mb-1.5">
          Ghi chú <span className="text-slate-400 font-normal">(Không bắt buộc)</span>
        </label>
        <textarea
          id="vehicle_notes"
          rows={2}
          value={formData.notes}
          onChange={(e) => handleChange("notes", e.target.value)}
          placeholder="Ghi chú thêm về phương tiện (nếu có)..."
          className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
        />
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-xs">
          {error}
        </div>
      )}

      {/* Footer Buttons */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-600 transition-colors cursor-pointer"
        >
          Hủy
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-400 text-white font-semibold text-xs shadow-xs transition-all flex items-center gap-2 cursor-pointer"
        >
          {loading && (
            <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          )}
          <span>{isEditMode ? "Lưu thay đổi" : "Thêm xe ô tô"}</span>
        </button>
      </div>
    </form>
  );
}

export default function CustomerVehicleModal({
  isOpen,
  onClose,
  onSubmitVehicle,
  initialVehicle = null,
  vehicleTypes = [],
}) {
  const isEditMode = Boolean(initialVehicle);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    if (isSubmitting) return;
    onClose?.();
  };

  const { titleId, dialogProps } = useModalA11y({
    isOpen,
    onClose: handleClose,
    isBusy: isSubmitting,
  });

  if (!isOpen) return null;

  return (
    <div
      {...dialogProps}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans antialiased"
    >
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14V8a2 2 0 00-2-2H7a2 2 0 00-2 2v6m14 0a2 2 0 01-2 2H7a2 2 0 01-2-2m14 0h2m-18 0H3m4 4h.01M17 18h.01" />
              </svg>
            </div>
            <div>
              <h3 id={titleId} className="text-base font-bold text-slate-900">
                {isEditMode ? "Chỉnh sửa thông tin xe ô tô" : "Thêm xe ô tô mới"}
              </h3>
              <p className="text-xs text-slate-500">
                {isEditMode
                  ? `Cập nhật thông tin cho xe ${initialVehicle.license_plate}`
                  : "Đăng ký biển số và thông tin xe ô tô vào hồ sơ cá nhân"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Đóng"
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        <VehicleModalForm
          key={
            initialVehicle
              ? `${initialVehicle.id ?? initialVehicle.code}-${initialVehicle.row_version ?? 1}-${initialVehicle.model_name ?? ""}-${initialVehicle.brand ?? ""}-${initialVehicle.color ?? ""}-${initialVehicle.notes ?? ""}`
              : "create-vehicle"
          }
          onClose={onClose}
          onSubmitVehicle={onSubmitVehicle}
          onBusyChange={setIsSubmitting}
          initialVehicle={initialVehicle}
          vehicleTypes={vehicleTypes}
        />
      </div>
    </div>
  );
}
