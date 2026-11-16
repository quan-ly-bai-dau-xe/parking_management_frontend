import React, { useState, useEffect } from "react";

export default function VehicleFormModal({
  isOpen,
  onClose,
  onSubmitVehicle,
  initialVehicle = null,
}) {
  const isEditMode = Boolean(initialVehicle);

  const [formData, setFormData] = useState({
    license_plate: "",
    brand: "",
    model_name: "",
    color: "",
    image_url: "",
  });

  const [imagePreview, setImagePreview] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (initialVehicle) {
      setFormData({
        license_plate: initialVehicle.license_plate || "",
        brand: initialVehicle.brand || "",
        model_name: initialVehicle.model_name || "",
        color: initialVehicle.color || "",
        image_url: initialVehicle.image_url || "",
      });
      setImagePreview(initialVehicle.image_url || "");
    } else {
      setFormData({
        license_plate: "",
        brand: "",
        model_name: "",
        color: "",
        image_url: "",
      });
      setImagePreview("");
    }
    setError("");
    setLoading(false);
  }, [isOpen, initialVehicle]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "license_plate" ? value.toUpperCase() : value,
    }));
    if (error) setError("");
  };

  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("Dung lượng ảnh tối đa là 5 MB.");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
    setFormData((prev) => ({ ...prev, image_url: previewUrl }));
  };

  const handleRemoveImage = () => {
    setImagePreview("");
    setFormData((prev) => ({ ...prev, image_url: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const cleanPlate = formData.license_plate.trim();
    if (!cleanPlate) {
      setError("Vui lòng nhập biển số xe ô tô.");
      return;
    }

    if (!formData.brand.trim()) {
      setError("Vui lòng nhập hãng xe (ví dụ: Toyota, Mazda, VinFast...).");
      return;
    }

    if (!formData.model_name.trim()) {
      setError("Vui lòng nhập mẫu xe (ví dụ: Camry, CX-5, VF 8...).");
      return;
    }

    setLoading(true);
    try {
      await onSubmitVehicle({
        ...initialVehicle,
        license_plate: cleanPlate,
        license_plate_norm: cleanPlate.replace(/[\s.-]/g, "").toUpperCase(),
        brand: formData.brand.trim(),
        model_name: formData.model_name.trim(),
        vehicle_type: "CAR",
        vehicle_type_name: "Ô tô",
        color: formData.color.trim() || "Chưa rõ",
        image_url: imagePreview || null,
      });
      onClose();
    } catch (err) {
      setError(err.message || "Không thể lưu thông tin xe ô tô.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
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
              <h3 className="text-base font-bold text-slate-900">
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
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Form nội dung */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {/* Biển số xe */}
          <div>
            <label htmlFor="license_plate" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Biển số xe <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              id="license_plate"
              name="license_plate"
              value={formData.license_plate}
              onChange={handleChange}
              placeholder="Ví dụ: 51K-992.14 hoặc 30A-123.45"
              autoFocus
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 font-mono font-semibold uppercase placeholder:font-sans placeholder:font-normal placeholder:normal-case placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Hãng xe & Mẫu xe */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="brand" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Hãng xe <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                id="brand"
                name="brand"
                value={formData.brand}
                onChange={handleChange}
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
                name="model_name"
                value={formData.model_name}
                onChange={handleChange}
                placeholder="Camry, CX-5, VF 8..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          {/* Màu sơn */}
          <div>
            <label htmlFor="color" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Màu sơn <span className="text-slate-400 font-normal">(Không bắt buộc)</span>
            </label>
            <input
              type="text"
              id="color"
              name="color"
              value={formData.color}
              onChange={handleChange}
              placeholder="Ví dụ: Trắng, Đen, Xám bạc..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Hình ảnh phương tiện */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Hình ảnh xe <span className="text-slate-400 font-normal">(Không bắt buộc)</span>
            </label>

            {imagePreview ? (
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 h-40 group">
                <img
                  src={imagePreview}
                  alt="Xem trước xe ô tô"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <label className="px-3 py-1.5 rounded-lg bg-white text-slate-800 text-xs font-semibold cursor-pointer hover:bg-slate-100">
                    Đổi ảnh
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleImageFileChange}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold cursor-pointer hover:bg-rose-700"
                  >
                    Xóa ảnh
                  </button>
                </div>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 rounded-2xl cursor-pointer transition-all">
                <svg className="w-6 h-6 text-slate-400 mb-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-xs font-semibold text-slate-600">
                  Bấm để tải ảnh xe lên
                </span>
                <span className="text-[11px] text-slate-400 mt-0.5">
                  Hỗ trợ JPG, PNG, WEBP (tối đa 5 MB)
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleImageFileChange}
                  className="hidden"
                />
              </label>
            )}
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
      </div>
    </div>
  );
}