# Architecture - Parking Management Frontend

## Overview

Dự án **Parking Management Frontend** được xây dựng dựa trên React 19 + Vite và Tailwind CSS, phục vụ quản lý và vận hành bãi đậu xe ô tô. Kiến trúc hệ thống áp dụng mô hình phân lớp rõ ràng (Layered Architecture) nhằm đảm bảo tính độc lập, dễ bảo trì, mở rộng và dễ dàng tích hợp với Backend REST API sau này.

---

## Kiến trúc phân lớp (Layered Architecture)

```text
Page Layer (src/pages/)
  ↓
Component Layer (src/components/)
  ↓
Feature Service Layer (src/features/)
  ↓
Mock Data / REST API Layer (src/features/**/api.js)
```

### 1. Page Layer (`src/pages/`)
Đóng vai trò điều phối trang (Page Orchestrator):
- Quản lý trạng thái cấp trang (danh sách bản ghi, bộ lọc, từ khóa tìm kiếm, trạng thái phân trang, mở modal).
- Gọi các Feature Service để xử lý dữ liệu và truyền xuống các presentational component qua props.
- Các trang chính:
  - `ParkingSlotsPage`: Quản lý danh sách và trạng thái vị trí đỗ xe trong bãi.
  - `VehicleEntryExitPage`: Quản lý giám sát luồng xe vào / xe ra.
  - `TicketManagementPage`: Quản lý vé lượt và vé tháng của khách hàng.
  - `CustomerManagementPage`: Quản lý thông tin khách hàng và thông tin phương tiện.
  - `StaffManagementPage`: Quản lý thông tin và ca làm việc của nhân viên.

### 2. Component Layer (`src/components/`)
Tập hợp các UI Component thuần túy (Presentational & Reusable):
- `SearchBar.jsx`: Thanh tìm kiếm theo từ khóa (biển số, tên khách hàng, mã vị trí).
- `Pagination.jsx`: Phân trang dữ liệu.
- `ParkingSlotList.jsx` / `ParkingSlotCard.jsx`: Hiển thị danh sách hoặc lưới bản đồ vị trí đỗ.
- `ParkingSlotForm.jsx`: Modal thêm/sửa thông tin vị trí đỗ xe.
- Giữ component thuần túy: Không gọi trực tiếp API hay mock services bên trong component UI.

### 3. Feature Service Layer (`src/features/`)
Đóng gói toàn bộ logic nghiệp vụ, xử lý dữ liệu và giao tiếp API:
- `features/parkingSlots/parkingSlotsService.js`: Nghiệp vụ quản lý vị trí đỗ xe (thêm, cập nhật, xóa, lọc theo tầng/loại xe).
- `features/vehicles/vehiclesService.js`: Nghiệp vụ xe vào/ra bãi.
- `features/tickets/ticketsService.js`: Nghiệp vụ phát hành, gia hạn, kiểm tra vé.
- `features/customers/customersService.js`: Nghiệp vụ khách hàng và xe đăng ký.

### 4. Data / API Layer
- Cung cấp dữ liệu mẫu (In-memory mock data) mô phỏng chính xác hợp đồng dữ liệu bất đồng bộ (`Promise`, `async/await`).
- Sẵn sàng chuyển đổi sang REST API thật bằng `fetch` hoặc `axios` mà không cần thay đổi tầng giao diện người dùng.