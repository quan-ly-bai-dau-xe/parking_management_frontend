# parking_management_frontend

> Giao diện frontend của **Hệ thống Quản lý Bãi đậu xe Ô tô** — Xây dựng với React 19, Tailwind CSS và Vite.

---

## 1. Overview (Tổng quan)

Dự án này là phần mềm frontend cho hệ thống quản lý bãi đậu xe ô tô. Mục tiêu là hỗ trợ người dùng và nhân viên bãi đỗ quản lý hiệu quả các hoạt động ra/vào bãi, tình trạng vị trí đỗ, thông tin khách hàng và phương tiện, đồng thời giảm thiểu thời gian xử lý và sai sót trong vận hành hàng ngày.

**Thông tin dự án**

| Mục | Giá trị |
|-----|---------|
| Tên dự án | Hệ thống Quản lý Bãi đậu xe Ô tô (Parking Management Frontend) |
| Loại | Ứng dụng Web Frontend |
| Phiên bản | v4.1 |
| Trạng thái | Phát triển |
| Công nghệ | React 19 + Tailwind CSS + Vite |

**Mục tiêu kinh doanh**

- Giảm thiểu thời gian xử lý khi xe ra/vào bãi đỗ.
- Quản lý hiệu quả tình trạng vị trí đỗ, thời gian đỗ, thông tin khách hàng và vé xe (vé lượt, vé tháng).
- Quản lý nhân viên trực, phân quyền rõ ràng giữa Quản lý (Admin) và Nhân viên.
- Giảm thiểu sai sót, thất thoát và rủi ro vận hành trong bãi đỗ xe ô tô.

**Mục tiêu kỹ thuật**

- Xây dựng ứng dụng frontend hiện đại, tối ưu, dễ bảo trì bằng React và Vite.
- Thiết kế kiến trúc phân lớp rõ ràng (UI Components, Feature Services, Mock/REST API).
- Tuân thủ quy chuẩn coding convention và tiêu chuẩn giao diện người dùng thống nhất.

---

## 2. Scope (Phạm vi)

### Trong phạm vi (In Scope)

Ứng dụng hướng tới các bãi đậu xe ô tô vừa và lớn, hoặc các bãi đỗ xe thông minh hoạt động độc lập, bao gồm:

- **Quản lý vị trí đỗ**: danh sách vị trí (số tầng, số vị trí, kích thước, loại xe cho phép), thêm/chỉnh sửa vị trí, bản đồ trạng thái đỗ (trống / có xe).
- **Quản lý xe vào / ra**: ghi nhận xe vào bãi, gán vị trí đỗ, kiểm tra xe ra bãi và tính phí.
- **Quản lý vé**: danh sách vé lượt và vé tháng, cấp vé, gia hạn vé tháng.
- **Quản lý khách hàng & phương tiện**: thông tin chủ phương tiện, biển số, loại xe.
- **Tìm kiếm & phân trang**: tìm kiếm nhanh theo biển số xe, mã vị trí hoặc tên khách hàng; phân trang hiển thị dữ liệu bảng.
- **Xác thực**: trang đăng nhập, phân quyền Admin và Nhân viên.

### Ngoài phạm vi (Out of Scope)

- Phần backend / API server (frontend hiện tại kết nối với mock/apiClient service, sẵn sàng tích hợp REST API).
- Thiết bị cứng tại bãi đỗ (camera, máy quét biển số vật lý, barrier tự động) — frontend hiển thị dữ liệu qua service mô phỏng/API.

---

## 3. Cách sử dụng ứng dụng

### Yêu cầu hệ thống

- Node.js (khuyên dùng LTS v18 trở lên)
- npm

### Cài đặt và chạy cục bộ

```bash
# 1. Cài đặt các dependencies
npm install

# 2. Chạy ứng dụng ở chế độ phát triển (http://localhost:5173)
npm run dev

# 3. Lint kiểm tra lỗi code
npm run lint

# 4. Build cho môi trường production
npm run build

# 5. Xem trước bản build
npm run preview
```

---

## 4. Đồng bộ AI Rules & Skills (`rulesync`)

Dự án sử dụng thư mục `.rulesync/` làm **Single Source of Truth** để đồng bộ tự động các tiêu chuẩn coding, quy chuẩn trang và kỹ năng (skills) sang các công cụ AI (Antigravity IDE, Cursor, Claude Code, Cline, OpenCode...):

### Cách chạy nhanh `rulesync`

```bash
# Chạy sinh và đồng bộ rules/skills sang target AI agents
npx rulesync generate

# Hoặc cài đặt rulesync toàn cục (nếu muốn chạy thường xuyên)
npm install -g rulesync
rulesync generate
```

> **Nguyên tắc cho lập trình viên & AI:**
> - Mọi thay đổi về luật lệ kỹ thuật hoặc skills phải được sửa tại `.rulesync/` trước tiên, sau đó mới chạy lệnh sync.
> - Cấu hình target công cụ AI được quản lý tại file `rulesync.jsonc`.

---

## 5. Cấu trúc thư mục mã nguồn

```text
src/
├── App.jsx             # Vỏ ứng dụng và cấu hình route/điều hướng
├── main.jsx            # Điểm khởi động React và mount root
├── index.css           # Cấu hình Tailwind CSS, design tokens dùng chung
├── assets/             # Hình ảnh, SVG và tài nguyên tĩnh
├── components/         # Các UI component tái sử dụng (giao tiếp qua props/callbacks)
│   ├── common/         # Primitives dùng chung (DataTable, TableActions, ConfirmModal, StatusBadge...)
│   ├── layout/         # Layout chung (AppLayout chứa AppTopHeader và Outlet)
│   └── VehicleManagement/ # Component gắn với nghiệp vụ xe
├── config/             # Cấu hình ứng dụng (navigation.js...)
├── features/           # Nghiệp vụ domain (authService, vehicleService, plateScanService...)
├── hooks/              # Custom React hooks (usePagination, usePlateScan, useCurrentUser)
├── mocks/              # Dữ liệu giả lập phục vụ phát triển
├── pages/              # Thành phần cấp trang (tuân thủ .rulesync/rules/page-layout-standards.md)
└── services/           # Lớp kết nối API backend (apiClient, customerService...)
```

---

## 6. Đóng góp & Tiêu chuẩn phát triển

- Tuân thủ quy chuẩn commit theo **Conventional Commits** (`feat:`, `fix:`, `refactor:`, `docs:`...).
- Tuân thủ chuẩn bố cục trang thống nhất được định nghĩa tại `.rulesync/rules/page-layout-standards.md`.
- Chạy `npm run lint` và `npm run build` trước khi tạo Pull Request để đảm bảo không có lỗi cú pháp hoặc gãy route.
