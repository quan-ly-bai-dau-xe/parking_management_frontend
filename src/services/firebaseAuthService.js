import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { auth, isFirebaseConfigured } from "../config/firebase.js";

// Lưu trữ confirmationResult của phiên gửi OTP hiện tại
let activeConfirmationResult = null;
let activeRecaptchaVerifier = null;

/**
 * Chuẩn hóa số điện thoại Việt Nam sang định dạng quốc tế E.164 (+84...)
 * Ví dụ: 0901234567 -> +84901234567
 */
export const normalizeToE164Phone = (phone) => {
  if (!phone) return "";
  const raw = phone.toString().trim();
  if (raw.includes("@") || /[a-zA-Z]/.test(raw)) {
    throw new Error("Vui lòng nhập số điện thoại hợp lệ (không phải email), ví dụ: 0766709535.");
  }

  let clean = raw.replace(/[\s.\-()]+/g, "");

  if (clean.startsWith("+84")) {
    return clean;
  }
  if (clean.startsWith("84")) {
    return "+" + clean;
  }
  if (clean.startsWith("0")) {
    return "+84" + clean.slice(1);
  }
  if (!clean.startsWith("+")) {
    return "+84" + clean;
  }
  return clean;
};

/**
 * Dọn dẹp recaptchaVerifier cũ để tránh lỗi 'reCAPTCHA has already been rendered'
 */
export const clearRecaptcha = (containerId = "recaptcha-container") => {
  if (activeRecaptchaVerifier) {
    try {
      activeRecaptchaVerifier.clear();
    } catch {
      // Bỏ qua lỗi dọn dẹp
    }
    activeRecaptchaVerifier = null;
  }
  const el = document.getElementById(containerId);
  if (el && el.parentNode) {
    try {
      const fresh = document.createElement("div");
      fresh.id = containerId;
      el.parentNode.replaceChild(fresh, el);
    } catch {
      el.innerHTML = "";
    }
  }
};

/**
 * Khởi tạo reCAPTCHA ẩn (Invisible reCAPTCHA) cho Firebase Phone Auth
 */
export const setupRecaptcha = (containerId = "recaptcha-container") => {
  if (!isFirebaseConfigured() || !auth) {
    return null;
  }

  // 1. Nếu đã có activeRecaptchaVerifier, tái sử dụng để tránh lỗi already rendered
  if (activeRecaptchaVerifier) {
    try {
      return activeRecaptchaVerifier;
    } catch {
      activeRecaptchaVerifier = null;
    }
  }

  // 2. Đảm bảo phần tử DOM tồn tại và tươi mới
  let container = document.getElementById(containerId);
  if (!container) {
    container = document.createElement("div");
    container.id = containerId;
    document.body.appendChild(container);
  } else if (container.parentNode) {
    // Thay thế container cũ bằng một element mới hoàn toàn để grecaptcha không nhớ node cũ
    const freshContainer = document.createElement("div");
    freshContainer.id = containerId;
    container.parentNode.replaceChild(freshContainer, container);
    container = freshContainer;
  }

  try {
    activeRecaptchaVerifier = new RecaptchaVerifier(auth, container, {
      size: "invisible",
      callback: () => {
        // reCAPTCHA giải quyết thành công
      },
      "expired-callback": () => {
        clearRecaptcha(containerId);
      },
    });
  } catch (err) {
    console.warn("[RecaptchaVerifier fallback]", err);
    // Nếu vẫn vướng widget cũ, tạo container ID duy nhất theo timestamp
    const dynamicId = `recaptcha-${Date.now()}`;
    const dynamicContainer = document.createElement("div");
    dynamicContainer.id = dynamicId;
    document.body.appendChild(dynamicContainer);

    activeRecaptchaVerifier = new RecaptchaVerifier(auth, dynamicContainer, {
      size: "invisible",
      callback: () => {},
      "expired-callback": () => {
        clearRecaptcha(dynamicId);
      },
    });
  }

  return activeRecaptchaVerifier;
};

/**
 * Gửi mã OTP qua tin nhắn SMS tới số điện thoại người dùng
 */
export const sendPhoneOtp = async (phone, containerId = "recaptcha-container") => {
  const e164Phone = normalizeToE164Phone(phone);
  if (!e164Phone || e164Phone.length < 10) {
    throw new Error("Số điện thoại không đúng định dạng. Vui lòng kiểm tra lại.");
  }

  // Chế độ 1: Firebase đã được cấu hình -> Gửi SMS thực tế qua Firebase
  if (isFirebaseConfigured() && auth) {
    try {
      const appVerifier = setupRecaptcha(containerId);
      const confirmationResult = await signInWithPhoneNumber(
        auth,
        e164Phone,
        appVerifier
      );
      activeConfirmationResult = confirmationResult;
      return {
        success: true,
        formattedPhone: e164Phone,
        isMock: false,
        message: `Mã OTP đã được gửi qua SMS tới ${e164Phone}`,
      };
    } catch (error) {
      console.error("[Firebase SMS Error]", error);

      // Nếu lỗi do reCAPTCHA đã render hoặc check failed, reset hoàn toàn và thử lại 1 lần với container mới
      if (
        error.message &&
        (error.message.includes("already been rendered") ||
          error.code === "auth/captcha-check-failed")
      ) {
        clearRecaptcha(containerId);
        try {
          const freshVerifier = setupRecaptcha(`recaptcha-retry-${Date.now()}`);
          const retryResult = await signInWithPhoneNumber(
            auth,
            e164Phone,
            freshVerifier
          );
          activeConfirmationResult = retryResult;
          return {
            success: true,
            formattedPhone: e164Phone,
            isMock: false,
            message: `Mã OTP đã được gửi qua SMS tới ${e164Phone}`,
          };
        } catch (retryErr) {
          clearRecaptcha(containerId);
          console.error("[Firebase SMS Retry Error]", retryErr);
        }
      }

      clearRecaptcha(containerId);

      // Dịch các mã lỗi phổ biến từ Firebase sang Tiếng Việt
      let friendlyMessage = "Gửi mã OTP thất bại. Vui lòng thử lại.";
      if (error.code === "auth/invalid-phone-number") {
        friendlyMessage = "Số điện thoại không hợp lệ theo chuẩn quốc tế.";
      } else if (error.code === "auth/too-many-requests") {
        friendlyMessage = "Bạn đã gửi yêu cầu quá nhiều lần. Vui lòng thử lại sau ít phút.";
      } else if (error.code === "auth/quota-exceeded") {
        friendlyMessage = "Hạn mức gửi SMS của dự án Firebase đã tạm thời hết.";
      } else if (error.code === "auth/captcha-check-failed") {
        friendlyMessage = "Xác thực reCAPTCHA không thành công. Vui lòng thử lại.";
      } else if (error.message && error.message.includes("already been rendered")) {
        friendlyMessage = "Xác thực reCAPTCHA đang được làm mới. Vui lòng bấm gửi lại!";
      } else if (error.message) {
        friendlyMessage = error.message;
      }
      throw new Error(friendlyMessage);
    }
  }

  // Chế độ 2: Firebase chưa cấu hình -> Chế độ Thử nghiệm / Mock (Test OTP: 123456)
  console.info(
    `[Firebase Phone Auth - Chế độ Thử nghiệm]\nChưa có cấu hình Firebase trong .env.\nSố điện thoại: ${e164Phone}\nMã OTP thử nghiệm: 123456`
  );
  await new Promise((resolve) => setTimeout(resolve, 600));
  activeConfirmationResult = {
    isMock: true,
    phone: e164Phone,
  };
  return {
    success: true,
    formattedPhone: e164Phone,
    isMock: true,
    testOtp: "123456",
    message: `[Chế độ thử nghiệm] Mã OTP 123456 đã được tạo cho ${e164Phone}`,
  };
};

/**
 * Xác thực mã OTP người dùng nhập vào
 */
export const verifyPhoneOtp = async (otpCode) => {
  const cleanCode = (otpCode || "").toString().trim();
  if (cleanCode.length !== 6) {
    throw new Error("Mã OTP phải gồm 6 chữ số.");
  }

  // Trường hợp Firebase thực tế
  if (activeConfirmationResult && !activeConfirmationResult.isMock) {
    try {
      const userCredential = await activeConfirmationResult.confirm(cleanCode);
      const idToken = await userCredential.user.getIdToken();
      return {
        success: true,
        user: userCredential.user,
        idToken,
        phoneNumber: userCredential.user.phoneNumber,
      };
    } catch (error) {
      console.error("[Firebase Verify OTP Error]", error);
      let friendlyMessage = "Mã OTP không chính xác hoặc đã hết hạn.";
      if (error.code === "auth/invalid-verification-code") {
        friendlyMessage = "Mã OTP bạn nhập không chính xác.";
      } else if (error.code === "auth/code-expired") {
        friendlyMessage = "Mã OTP đã hết hiệu lực. Vui lòng bấm gửi lại mã mới.";
      }
      throw new Error(friendlyMessage);
    }
  }

  // Trường hợp Mock / Thử nghiệm
  if (cleanCode === "123456") {
    return {
      success: true,
      isMock: true,
      phoneNumber: activeConfirmationResult?.phone || "",
      idToken: "mock-firebase-id-token-123456",
    };
  }

  throw new Error("Mã OTP không chính xác. (Mã thử nghiệm là: 123456)");
};
