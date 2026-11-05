import { STATUS_MAP_DISPLAY_TO_CODE } from "../../constants/customerConstants";
import { formatDisplayDateToIso } from "../formatDateTime";

/**
 * mapCustomerFormToBackendPayload
 * Domain-specific mapper: Chuyển đổi dữ liệu Customer Form State sang Request Body chuẩn Backend.
 *
 * @param {Object} formData - Dữ liệu từ form khách hàng
 * @returns {Object} Payload chuẩn gửi tới Backend REST API
 */
export function mapCustomerFormToBackendPayload(formData) {
  const payload = {
    full_name: (formData.name || formData.full_name || "").trim(),
    identity_card_number: (
      formData.idNumber ||
      formData.identity_card_number ||
      ""
    ).trim(),
    phone: (formData.phone || "").trim(),
  };

  const rawCode = (formData.customerCode || formData.code || "").trim();
  if (rawCode) {
    payload.code = rawCode;
  }

  const email = (formData.email || "").trim();
  if (email) {
    payload.email = email;
  }

  const rawDob = formData.birthday || formData.date_of_birth;
  const isoDob = formatDisplayDateToIso(rawDob);
  if (isoDob) {
    payload.date_of_birth = isoDob;
  }

  const gender = (formData.gender || "").trim();
  if (gender === "Nam" || gender === "Nữ") {
    payload.gender = gender;
  }

  const rawStatus = formData.status || "ACTIVE";
  payload.status = STATUS_MAP_DISPLAY_TO_CODE[rawStatus] || rawStatus;

  return payload;
}
