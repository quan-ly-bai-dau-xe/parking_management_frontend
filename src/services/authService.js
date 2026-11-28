import { apiClient, fetchCsrfToken } from "./apiClient.js";

export const AUTH_USER_CHANGED_EVENT = "sp:auth-user-changed";

function dispatchAuthUserChanged(user = null) {
  if (
    typeof window !== "undefined" &&
    typeof window.dispatchEvent === "function" &&
    typeof CustomEvent === "function"
  ) {
    window.dispatchEvent(
      new CustomEvent(AUTH_USER_CHANGED_EVENT, {
        detail: { user },
      })
    );
  }
}

export function clearStoredAuth({ notify = true } = {}) {
  const keys = ["sp_auth_token", "sp_user"];
  try {
    if (typeof localStorage !== "undefined" && typeof localStorage?.removeItem === "function") {
      for (const key of keys) {
        try {
          localStorage.removeItem(key);
        } catch {
          // Ignore storage access errors
        }
      }
    }
  } catch {
    // Ignore storage access errors
  }
  try {
    if (typeof sessionStorage !== "undefined" && typeof sessionStorage?.removeItem === "function") {
      for (const key of keys) {
        try {
          sessionStorage.removeItem(key);
        } catch {
          // Ignore storage access errors
        }
      }
    }
  } catch {
    // Ignore storage access errors
  }
  if (notify) {
    dispatchAuthUserChanged(null);
  }
}

export const authService = {
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

    // Prevent stale sp_user in the opposite storage from shadowing the newly logged-in account
    clearStoredAuth({ notify: false });
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem("sp_user", JSON.stringify(user));
    dispatchAuthUserChanged(user);
    return { status: 200, user };
  },

  forgotPassword: async (account) => {
    return new Promise((resolve, reject) => {
      if (!account) {
        return reject(new Error("Vui lòng cung cấp email hoặc số điện thoại"));
      }
      return resolve({ message: "Mã xác nhập OTP đã được gửi thành công" });
    });
  },

  // eslint-disable-next-line no-unused-vars
  verifyOtp: async ({ account, otp }) => {
    return new Promise((resolve, reject) => {
      if (otp?.trim() === "123456") {
        resolve({ success: true, message: "Xác thực OTP thành công" });
      } else {
        reject(new Error("Mã OTP không chính xác hoăc hết hạn"));
      }
    });
  },

  // eslint-disable-next-line no-unused-vars
  resetPassword: async ({ account, otp, newPassword }) => {
    return new Promise((resolve, reject) => {
      if (!newPassword || newPassword.length < 6) {
        return reject(new Error("Mật khẩu mởi phải có ít nhất 6 ký tự"));
      }
      resolve({ success: true, message: "Đổi mật khẩu thành công" });
    });
  },

  requestRegisterSmsOtp: async ({ phone, recaptchaToken } = {}) => {
    const cleanPhone = String(phone || "").trim();
    if (!cleanPhone) {
      throw new Error("Vui lòng nhập số điện thoại.");
    }
    const payload = { phone: cleanPhone };
    if (recaptchaToken) {
      payload.recaptcha_token = recaptchaToken;
    }
    return await apiClient("/api/v1/auth/register/sms/request/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  confirmRegisterSms: async ({
    phone,
    otp,
    password,
    confirmPassword,
    fullName,
    identityCardNumber,
    email,
    sessionInfo,
    firebaseToken,
  } = {}) => {
    const payload = {
      phone: String(phone || "").trim(),
      otp: String(otp || "").trim(),
      password,
      confirm_password: confirmPassword ?? password,
      full_name: String(fullName || "").trim(),
    };
    if (identityCardNumber && String(identityCardNumber).trim()) {
      payload.identity_card_number = String(identityCardNumber).trim();
    }
    if (email && String(email).trim()) {
      payload.email = String(email).trim();
    }
    if (sessionInfo) {
      payload.session_info = sessionInfo;
    }
    if (firebaseToken) {
      payload.firebase_token = firebaseToken;
    }
    return await apiClient("/api/v1/auth/register/sms/confirm/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  logout: () => {
    clearStoredAuth({ notify: true });
    return apiClient("/api/v1/auth/logout/", { method: "POST" })
      .catch(() => {})
      .then(() => true);
  },
};
