import { useState } from "react";
import { BaseModal } from "../common/modal";
import { FormInput } from "../common/form";
import Button from "../common/button/Button";

function StructureForm({ mode, initialData, onClose, onSave }) {
  const isFloor = mode === "add_floor";
  const isZone = mode === "add_zone";
  const isEdit = mode === "edit_item";

  const [name, setName] = useState(() => {
    if (initialData?.name) return initialData.name;
    if (isFloor) return "Tầng B3";
    if (isZone) return "Khu D";
    return "";
  });
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Vui lòng nhập tên hạng mục cấu trúc.");
      return;
    }

    onSave?.({
      type: isFloor ? "Tầng" : isZone ? "Khu" : initialData?.type || "Tầng",
      name: name.trim(),
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
        onChange={(e) => {
          setName(e.target.value);
          if (error) setError("");
        }}
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
