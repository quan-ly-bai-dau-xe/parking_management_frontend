import { useState } from "react";
import { BaseModal } from "../common/modal";
import { FormInput } from "../common/form";
import Button from "../common/button/Button";

function extractCodeFromName(name, itemType) {
  if (!name) return "";
  const cleaned = name.trim();
  if (itemType === "Tầng") {
    return cleaned.replace(/^Tầng\s*/i, "").trim().toUpperCase();
  }
  if (itemType === "Khu") {
    return cleaned.replace(/^Khu\s*/i, "").trim().toUpperCase();
  }
  return cleaned.replace(/^(Tầng|Khu)\s*/i, "").trim().toUpperCase();
}

function StructureForm({ mode, initialData, onClose, onSave }) {
  const isFloor = mode === "add_floor";
  const isZone = mode === "add_zone";
  const isEdit = mode === "edit_item";
  const itemType = isFloor ? "Tầng" : isZone ? "Khu" : initialData?.type || "Tầng";

  const [name, setName] = useState(() => {
    if (initialData?.name) return initialData.name;
    if (isFloor) return "Tầng B3";
    if (isZone) return "Khu D";
    return "";
  });

  const [code, setCode] = useState(() => {
    if (initialData?.code) return initialData.code;
    if (initialData?.name) return extractCodeFromName(initialData.name, itemType);
    if (isFloor) return "B3";
    if (isZone) return "D";
    return "";
  });

  const [isCodeManuallyEdited, setIsCodeManuallyEdited] = useState(false);
  const [error, setError] = useState("");

  const handleNameChange = (e) => {
    const val = e.target.value;
    setName(val);
    if (error) setError("");
    if (!isCodeManuallyEdited) {
      setCode(extractCodeFromName(val, itemType));
    }
  };

  const handleCodeChange = (e) => {
    setIsCodeManuallyEdited(true);
    setCode(e.target.value.toUpperCase());
    if (error) setError("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Vui lòng nhập tên hạng mục cấu trúc.");
      return;
    }

    const finalCode = (code.trim() || extractCodeFromName(name, itemType) || name.trim()).toUpperCase();
    if (!finalCode) {
      setError("Vui lòng nhập mã định danh cho hạng mục (ví dụ: B3, D).");
      return;
    }

    onSave?.({
      id: initialData?.id || `${itemType}-${finalCode}`,
      type: itemType,
      name: name.trim(),
      code: finalCode,
    });

    onClose?.();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      <FormInput
        label={isFloor ? "Tên tầng" : isZone ? "Tên phân khu" : "Tên hiển thị"}
        required
        placeholder={isFloor ? "Ví dụ: Tầng B3" : "Ví dụ: Khu D"}
        value={name}
        error={error}
        onChange={handleNameChange}
      />

      <FormInput
        label="Mã viết tắt / Mã bộ lọc"
        required
        placeholder={isFloor ? "Ví dụ: B3" : "Ví dụ: D"}
        value={code}
        onChange={handleCodeChange}
        helperText="Mã dùng để lọc và gắn vào mã ô đỗ xe (ví dụ: B3, D, VIP)"
      />

      <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onClose}
          className="cursor-pointer"
        >
          Hủy
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="sm"
          className="cursor-pointer"
        >
          {isEdit ? "Cập nhật" : "Thêm mới"}
        </Button>
      </div>
    </form>
  );
}

export default function StructureModal({
  isOpen,
  onClose,
  mode = "add_floor",
  initialData = null,
  onSave,
}) {
  const isFloor = mode === "add_floor";
  const isZone = mode === "add_zone";
  const isEdit = mode === "edit_item";

  const getTitle = () => {
    if (isFloor) return "Thêm tầng mới";
    if (isZone) return "Thêm khu vực mới";
    if (isEdit) return `Chỉnh sửa ${initialData?.type || "hạng mục"}`;
    return "Cấu hình cấu trúc bãi xe";
  };

  const formKey = `${mode}-${initialData?.name || "new"}`;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={getTitle()}
      description="Quản lý thông tin phân tầng và khu vực trong hệ thống"
      size="sm"
    >
      <StructureForm
        key={formKey}
        mode={mode}
        initialData={initialData}
        onClose={onClose}
        onSave={onSave}
      />
    </BaseModal>
  );
}
