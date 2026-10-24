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
- Tuân thủ quy chuẩn coding convention và tiêu chuẩn giao diện người dùng.

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

- Phần backend / API server (frontend hiện tại kết nối với mock service, sẵn sàng tích hợp REST API).
- Thiết bị cứng tại bãi đỗ (camera, Máy quét biển số, cổng chắn) — frontend chỉ hiển thị dữ liệu từ thiết bị qua API.

---

## 3. Cách sử dụng ứng dụng

### Yêu cầu hệ thống

- Node.js (khuyên dùng LTS)
- npm

### Cài đặt và chạy cục bộ

```bash
# 1. Cài đặt các dependencies
npm install

# 2. Chạy ứng dụng ở chế độ phát triển (http://localhost:5173)
npm run dev

# 3. Lint code
npm run lint

# 4. Build cho sản xuất
npm run build

# 5. Xem trước bản build
npm run preview
```

### Luồng sử dụng chính

1. **Đăng nhập**: Mở ứng dụng, truy cập trang `/login`, đăng nhập bằng tài khoản Admin hoặc Nhân viên.
2. **Quản lý phương tiện**: Từ menu chính, vào trang quản lý xe để xem danh sách, thêm mới, chỉnh sửa phương tiện và tìm kiếm theo biển số.
3. **Quản lý vị trí đỗ**: Xem bản đồ trạng thái các vị trí đỗ (trống/đã có xe), thêm hoặc chỉnh sửa thông tin vị trí đỗ.
4. **Xe vào / ra bãi**: Ghi nhận xe vào bãi và gán vị trí đỗ; khi xe ra bãi, kiểm tra và tính phí.
5. **Quản lý vé**: Xem danh sách vé lượt / vé tháng, cấp vé mới hoặc gia hạn vé tháng.
6. **Tìm kiếm & phân trang**: Sử dụng ô tìm kiếm trên các trang danh sách và điều hướng phân trang để xem dữ liệu.

### Cấu trúc thư mục chính

```text
src/
├── App.jsx          # Vỏ ứng dụng và cấu hình route/điều hướng
├── main.jsx         # Điểm khởi động React và mount root
├── index.css        # CSS nền/tokens và kiểu dùng chung
├── assets/          # Ảnh, SVG và tài nguyên_static
├── components/      # Component UI dùng lại (giao tiếp qua props)
│   └── layout/      # Layout route dùng Outlet (AppLayout)
├── config/          # Cấu hình ứng dụng (ví dụ: navigation.js)
├── features/        # Nghiệp vụ theo domain (ví dụ: login/authService.js)
├── mocks/           # Dữ liệu mẫu phục vụ phát triển giao diện
└── pages/           # Thành phần cấp trang (Login, ParkingHistory, VehicleManagement...)
```

### Routing và layout

`App.jsx` quản lý route bằng React Router. Các màn hình cần dùng layout chung được đặt dưới một route layout và render qua `Outlet`; page chỉ tập trung vào nội dung màn hình. `/login` nằm ngoài layout.

---

## 4. Đóng góp

Vui lòng tạo issue hoặc pull request để thảo luận trước khi thực hiện các thay đổi lớn. Tuân thủ quy chuẩn commit (Conventional Commits) và coding convention của dự án.

---
