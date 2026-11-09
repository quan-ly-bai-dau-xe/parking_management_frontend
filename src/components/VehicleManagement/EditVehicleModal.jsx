import { useState, useEffect, useMemo } from "react";
import { BaseModal } from "../common/modal";
import { Button } from "../common";
import { customerService } from "../../services/customerService";
import { VehicleFormSchema } from "../../schemas/vehicleSchema";
import { INITIAL_VEHICLE_FORM_STATE, DEFAULT_UNASSIGNED_SLOT_LABEL } from "../../constants/vehicleConstants";
import { mapVehicleToFormData, mapFormDataToVehicleEntity } from "../../utils/vehicle/vehicleFormMapper";
import CustomerSelectCombobox from "./CustomerSelectCombobox";
import VehicleFormFields from "./VehicleFormFields";

/**
 * EditVehicleModal
 * Modal Thêm mới / Cập nhật thông tin phương tiện.
 * Đã module hoá chuẩn:
 * - Dữ liệu & Schema tách vào src/schemas/vehicleSchema.js và src/constants/vehicleConstants.js
 * - Customer Combobox tách vào CustomerSelectCombobox.jsx
 * - Form Fields tách vào VehicleFormFields.jsx
 * - Modal đóng vai trò orchestrator điều phối form submit & validation (< 160 dòng).
 */
export default function EditVehicleModal({
  isOpen,
  onClose,
  vehicle,
  onSave,
  isSubmitting = false,
  apiError = "",
}) {
  const [formData, setFormData] = useState(INITIAL_VEHICLE_FORM_STATE);
  const [prevVehicle, setPrevVehicle] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [formError, setFormError] = useState("");

  const isAddingNew = vehicle?.id === "NEW";

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    customerService
      .getCustomers()
      .then((data) => {
        if (!isMounted) return;
        const list = Array.isArray(data) ? data : data?.results || [];
        setCustomers(list);
      })
      .catch((err) => {
        console.warn("Could not load customers for dropdown:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (vehicle && vehicle !== prevVehicle) {
    setPrevVehicle(vehicle);
    setFormError("");
    setFormData(mapVehicleToFormData(vehicle));
  }

  const selectedCustomer = useMemo(() => {
    if (!formData.customerId) return null;
    return (
      customers.find(
        (c) =>
          String(c.id) === String(formData.customerId) ||
          String(c.customerCode) === String(formData.customerId) ||
          String(c.code) === String(formData.customerId)
      ) || null
    );
  }, [customers, formData.customerId]);

  if (!isOpen || !vehicle) return null;

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSelectCustomer = (customer) => {
    if (!customer) {
      setFormData((prev) => ({
        ...prev,
        customerId: "",
        customerName: "",
        customerPhone: "",
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      customerId: customer.id,
      customerName: customer.name || customer.full_name || "",
      customerPhone: customer.phone || "",
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError("");

    const validation = VehicleFormSchema.safeParse(formData);
    if (!validation.success) {
      const firstIssue = validation.error.issues[0]?.message || "Dữ liệu không hợp lệ.";
      setFormError(firstIssue);
      return;
    }

    if (isAddingNew && !formData.customerId) {
      setFormError("Vui lòng chọn khách hàng (chủ sở hữu) cho phương tiện.");
      return;
    }

    const updatedEntity = mapFormDataToVehicleEntity(formData, vehicle, selectedCustomer);
    onSave(updatedEntity);
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={isAddingNew ? "Thêm phương tiện mới" : "Chỉnh sửa phương tiện"}
      size="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {(formError || apiError) && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg whitespace-pre-line leading-relaxed">
            <div className="font-semibold mb-0.5">Lỗi thông tin nhập:</div>
            <div>{formError || apiError}</div>
          </div>
        )}

        <VehicleFormFields
          formData={formData}
          onChange={handleChange}
          isAddingNew={isAddingNew}
          customerCombobox={
            <CustomerSelectCombobox
              customers={customers}
              selectedCustomer={selectedCustomer}
              isAddingNew={isAddingNew}
              onSelectCustomer={handleSelectCustomer}
            />
          }
        />

        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Hủy
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            loading={isSubmitting}
          >
            {isAddingNew ? "Thêm phương tiện" : "Lưu thay đổi"}
          </Button>
        </div>
      </form>
    </BaseModal>
  );
}
