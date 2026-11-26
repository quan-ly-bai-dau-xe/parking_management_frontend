import { authService } from "./authService.js";

export const registerService = {
  requestRegisterSmsOtp(payload) {
    return authService.requestRegisterSmsOtp(payload);
  },

  confirmRegisterSms(payload) {
    return authService.confirmRegisterSms(payload);
  },
};
