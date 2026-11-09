import { apiClient } from "./apiClient"; // Điều chỉnh đường dẫn tới file apiClient của bạn

export const registerService = {
  /**
   * Tạo khách hàng mới (CustomerCreate - SRS 4.4.3)
   * Tự động xử lý CSRF token, session cookie và ErrorEnvelope
   * @param {Object} payload
   * @param {string} payload.full_name - Họ và tên khách hàng
   * @param {string} payload.phone - Số điện thoại
   * @param {string} payload.identity_card_number - Số CCCD/CMND
   * @param {string} [payload.email] - Email
   * @param {string} [payload.password] - Mật khẩu khởi tạo
   * @param {string} [payload.status="ACTIVE"] - Trạng thái
   */
  async createCustomer(payload) {
    return await apiClient("/api/v1/customers/", {
      method: "POST",
      data: payload,
    });
  },
};