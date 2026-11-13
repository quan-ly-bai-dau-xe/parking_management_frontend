// Re-export authService from services/authService to ensure a single shared instance and active OTP session state
export { authService } from "../services/authService.js";
export { authService as default } from "../services/authService.js";
