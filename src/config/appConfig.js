/**
 * appConfig.js
 * Cấu hình toàn cục cho ứng dụng Frontend.
 * 
 * Single Source of Truth cho cờ MOCK:
 * - Khi VITE_USE_MOCK="false" (hoặc không khai báo): Tắt toàn bộ mock, 100% gọi Backend Django REST API.
 * - Chỉ bật mock khi VITE_USE_MOCK="true".
 */

export const IS_MOCK_ENABLED =
  import.meta.env?.VITE_USE_MOCK?.trim().toLowerCase() === "true";

export const BACKEND_BASE_URL =
  import.meta.env?.VITE_BACKEND_URL || "http://127.0.0.1:8000";
