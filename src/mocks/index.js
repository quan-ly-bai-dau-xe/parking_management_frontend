/**
 * src/mocks/index.js
 * Centralized Mock Repository - Điểm quản lý và phân phối Mock Data tập trung.
 * 
 * Mục đích:
 * 1. Gom toàn bộ mock data phân tán thành một Single Source of Truth.
 * 2. Cấm các components UI import rải rác từ các file mock riêng lẻ.
 * 3. Hỗ trợ switch, audit và kiểm soát vòng đời mock dữ liệu an toàn.
 */

export * from "./customerData.js";
export * from "./customerSideData.js";
export * from "./employeeData.js";
export * from "./parkingHistoryData.js";
export * from "./parkingLotData.js";
export * from "./parkingSlotFallback.js";
export * from "./ticketsData.js";
export * from "./vehicleData.js";
export * from "./anomoliesData.js";
