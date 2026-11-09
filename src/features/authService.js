import { apiClient, fetchCsrfToken } from "../services/apiClient.js";
import {
  sendPhoneOtp,
  verifyPhoneOtp,
  normalizeToE164Phone,
} from "../services/firebaseAuthService.js";

let activeOtpSession = {
  sessionInfo: null,
  phone: null,
};

export const authService = {
  /**
   * Lấy phiên OTP hiện tại
   */
  getActiveOtpSession: () => ({ ...activeOtpSession }),

  /**
   * Đặt phiên OTP thủ công
   */
  setActiveOtpSession: (sessionInfo, phone) => {
    activeOtpSession = { sessionInfo, phone };
  },

  /**
   * Xóa phiên OTP
   */
  clearOtpSession: () => {
    activeOtpSession = { sessionInfo: null, phone: null };
  },

  /**
   * Đăng nhập người dùng bằng email hoặc số điện thoại
   */
  login: async ({ account, password, rememberMe }) => {
    if (!account || !password) {
      throw new Error("Vui lòng nhập đầy đủ tài khoản và mật khẩu");
    }

    await fetchCsrfToken();
    const user = await apiClient("/api/v1/auth/login/", {
      method: "POST",
      body: JSON.stringify({
        identifier: account.trim(),
        password,
        remember: rememberMe,
      }),
    });

    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem("sp_user", JSON.stringify(user));
    return { status: 200, user };
  },

  /**
   * Gửi mã OTP SMS qua Firebase cho luồng Quên mật khẩu (chạy đồng bộ BE và FE)
   */
  forgotPassword: async (account, containerId = "recaptcha-container") => {
    if (!account || !account.trim()) {
      throw new Error("Vui lòng cung cấp số điện thoại nhận mã OTP.");
    }
    const cleanAccount = account.trim();

    // 1. Gửi yêu cầu tới Backend (Backend gọi Firebase REST API sendVerificationCode)
    let backendResult = null;
    try {
      backendResult = await apiClient("/api/v1/auth/forgot-password/sms/", {
        method: "POST",
        body: JSON.stringify({ phone: cleanAccount }),
      });
      if (backendResult?.session_info) {
        activeOtpSession = {
          sessionInfo: backendResult.session_info,
          phone: cleanAccount,
        };
      }
    } catch (backendErr) {
      console.info("[Backend OTP Request Note]", backendErr.message);
    }

    // 2. Kích hoạt Firebase Client SDK để hỗ trợ reCAPTCHA Web nếu có cấu hình
    let firebaseResult = null;
    try {
      firebaseResult = await sendPhoneOtp(cleanAccount, containerId);
    } catch (fbErr) {
      // Nếu Backend đã gửi mã thành công, không chặn nếu chỉ lỗi reCAPTCHA client
      if (!backendResult) {
        throw fbErr;
      }
      console.info("[Firebase Client SDK Note]", fbErr.message);
    }

    const isMock = firebaseResult ? firebaseResult.isMock : !backendResult?.session_info;
    const testOtp = firebaseResult?.testOtp || (isMock ? "123456" : undefined);

    return {
      success: true,
      formattedPhone: firebaseResult?.formattedPhone || normalizeToE164Phone(cleanAccount),
      sessionInfo: backendResult?.session_info || null,
      isMock,
      testOtp,
      message:
        backendResult?.detail ||
        firebaseResult?.message ||
        "Mã xác nhận OTP đã được gửi thành công",
    };
  },

  /**
   * Gửi mã OTP SMS qua Firebase cho luồng Đăng ký tài khoản mới (chạy đồng bộ BE và FE)
   */
  requestRegisterOtp: async (phone, containerId = "recaptcha-container") => {
    if (!phone || !phone.trim()) {
      throw new Error("Vui lòng nhập số điện thoại để đăng ký.");
    }
    const cleanPhone = phone.trim();

    // 1. Kiểm tra với Backend và khởi tạo phiên OTP Firebase từ Backend
    let backendResult = null;
    try {
      backendResult = await apiClient("/api/v1/auth/register/sms/request/", {
        method: "POST",
        body: JSON.stringify({ phone: cleanPhone }),
      });
      if (backendResult?.session_info) {
        activeOtpSession = {
          sessionInfo: backendResult.session_info,
          phone: cleanPhone,
        };
      }
    } catch (backendErr) {
      if (backendErr.status === 409) {
        throw new Error("Số điện thoại này đã được đăng ký trong hệ thống.");
      }
      console.info("[Backend Register Request Note]", backendErr.message);
    }

    // 2. Kích hoạt Firebase Client SDK nếu có
    let firebaseResult = null;
    try {
      firebaseResult = await sendPhoneOtp(cleanPhone, containerId);
    } catch (fbErr) {
      if (!backendResult) {
        throw fbErr;
      }
      console.info("[Firebase Client SDK Note]", fbErr.message);
    }

    const isMock = firebaseResult ? firebaseResult.isMock : !backendResult?.session_info;
    const testOtp = firebaseResult?.testOtp || (isMock ? "123456" : undefined);

    return {
      success: true,
      formattedPhone: firebaseResult?.formattedPhone || normalizeToE164Phone(cleanPhone),
      sessionInfo: backendResult?.session_info || null,
      isMock,
      testOtp,
      message:
        backendResult?.detail ||
        firebaseResult?.message ||
        "Mã xác thực OTP đã được gửi tới số điện thoại.",
    };
  },

  /**
   * Xác thực mã OTP người dùng nhập vào thông qua Firebase Phone Auth
   */
  verifyOtp: async ({ otp }) => {
    return await verifyPhoneOtp(otp);
  },

  /**
   * Hoàn tất đăng ký tài khoản mới sau khi xác thực OTP thành công
   */
  register: async ({
    fullName,
    phone,
    email,
    password,
    confirmPassword,
    otp,
    idToken,
    sessionInfo,
  }) => {
    if (!fullName || !fullName.trim()) {
      throw new Error("Vui lòng nhập họ và tên.");
    }
    if (!phone || !phone.trim()) {
      throw new Error("Vui lòng cung cấp số điện thoại.");
    }
    if (!password || password.length < 8) {
      throw new Error("Mật khẩu phải có ít nhất 8 ký tự.");
    }
    if (confirmPassword && password !== confirmPassword) {
      throw new Error("Mật khẩu xác nhận không khớp.");
    }

    const payload = {
      full_name: fullName.trim(),
      phone: phone.trim(),
      email: email ? email.trim() : undefined,
      password,
      confirm_password: confirmPassword || password,
      otp: (otp || "123456").toString().trim(),
      session_info: sessionInfo || activeOtpSession.sessionInfo || undefined,
      firebase_token: idToken || undefined,
    };

    try {
      const response = await apiClient("/api/v1/auth/register/sms/confirm/", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      activeOtpSession = { sessionInfo: null, phone: null };
      return { success: true, data: response };
    } catch (err) {
      if (err.status === 409) {
        throw new Error("Số điện thoại hoặc Email đã tồn tại trong hệ thống.");
      }
      throw new Error(err.message || "Đăng ký tài khoản thất bại. Vui lòng thử lại.");
    }
  },

  /**
   * Đặt lại mật khẩu mới sau khi xác thực OTP thành công
   */
  resetPassword: async ({
    account,
    phone,
    otp,
    newPassword,
    confirmPassword,
    idToken,
    sessionInfo,
  }) => {
    const targetPhone = (phone || account || "").trim();
    if (!targetPhone) {
      throw new Error("Thiếu thông tin số điện thoại của tài khoản.");
    }
    if (!newPassword || newPassword.length < 8) {
      throw new Error("Mật khẩu mới phải có ít nhất 8 ký tự.");
    }
    if (confirmPassword && newPassword !== confirmPassword) {
      throw new Error("Mật khẩu xác nhận không khớp.");
    }

    const payload = {
      phone: targetPhone,
      otp: (otp || "123456").toString().trim(),
      new_password: newPassword,
      confirm_password: confirmPassword || newPassword,
      session_info: sessionInfo || activeOtpSession.sessionInfo || undefined,
      firebase_token: idToken || undefined,
    };

    try {
      const response = await apiClient("/api/v1/auth/reset-password/sms/", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      activeOtpSession = { sessionInfo: null, phone: null };
      return { success: true, message: response.detail || "Đổi mật khẩu thành công!" };
    } catch (err) {
      throw new Error(err.message || "Không thể đặt lại mật khẩu. Vui lòng thử lại.");
    }
  },

  /**
   * Đăng xuất người dùng
   */
  logout: async () => {
    try {
      await apiClient("/api/v1/auth/logout/", { method: "POST" });
    } catch {
      // Tiếp tục xóa local state
    }
    localStorage.removeItem("sp_auth_token");
    localStorage.removeItem("sp_user");
    sessionStorage.removeItem("sp_auth_token");
    sessionStorage.removeItem("sp_user");
    return true;
  },
};
