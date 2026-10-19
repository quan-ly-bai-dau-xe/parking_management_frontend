# Overview - Hệ thống Quản lý Bãi đậu xe Ô tô

## 1. Project Information

| Item | Value |
|--------|--------|
| Project Name | Hệ thống Quản lý Bãi đậu xe Ô tô (Parking Management Frontend) |
| Project Type | Frontend Web Application |
| Version | v4.1 |
| Status | Development |
| Author | Project Team |
| Technology | React 19 + Tailwind CSS + Vite |

## 2. Project Description

Hiện nay, với nhu cầu đi lại ngày càng tăng, các phương tiện giao thông ngày càng phổ biến, đặc biệt là xe ô tô. Việc gia tăng số lượng xe dẫn đến nhiều khó khăn trong việc trông giữ, quản lý các bãi đỗ xe ô tô như: số lượng xe ra vào, số chỗ còn lại trong bãi, thời gian đỗ xe hay kiểm soát vé.

Phần mềm **Hệ thống Quản lý Bãi đậu xe Ô tô (Parking Management Frontend)** được xây dựng nhằm giải quyết bài toán trên: giúp tiết kiệm thời gian cho khách hàng và nhân viên bãi đỗ, nâng cao hiệu quả và tính tự động hóa trong quản lý vận hành bãi xe.

---

## 3. Goal

### Business Goal

- Giảm thiểu thời gian xử lý khi xe ra/vào bãi đậu xe.
- Quản lý hiệu quả tình trạng vị trí đỗ, thời gian đỗ, thông tin khách hàng và vé xe (vé tháng, vé lượt).
- Quản lý nhân viên trực, phân quyền rõ ràng giữa Quản lý (Admin) và Nhân viên.
- Giảm thiểu tối đa sai sót, sự cố thất thoát và rủi ro vận hành trong bãi đỗ xe ô tô.

### Technical Goal

- Xây dựng ứng dụng Frontend hiện đại, tối ưu, dễ bảo trì bằng React và Vite.
- Thiết kế kiến trúc phân lớp rõ ràng (UI Components, Feature Services, Mock/REST API).
- Tuân thủ chặt chẽ các quy chuẩn coding convention và tiêu chuẩn giao diện người dùng.

---

## 4. Scope

### In Scope

Ứng dụng hướng tới các bãi đậu xe ô tô vừa và lớn, hoặc các bãi đỗ xe thông minh hoạt động độc lập, bao gồm các phạm vi chức năng chính:

1. **Quản lý ra/vào bãi đậu xe**: Kiểm soát xe vào, kiểm tra xe ra, tính toán thời gian và phí đỗ xe.
2. **Quản lý bãi đỗ & Vị trí đỗ**: Quản lý bản đồ bãi xe, số tầng, danh sách vị trí đỗ, trạng thái trống/đã đỗ, kích thước và loại xe phù hợp.
3. **Quản lý vé**: Quản lý danh sách vé, phát hành vé, gia hạn vé tháng của khách hàng, chỉnh sửa và thu hồi vé.
4. **Quản lý khách hàng & Phương tiện**: Thông tin khách hàng, biển số xe, loại xe, hãng xe đăng ký.
5. **Quản lý nhân viên**: Phân công ca trực, thời gian làm việc, quản lý tài khoản nhân viên.
6. **Thống kê & Báo cáo**: Thống kê doanh thu, lưu lượng xe vào/ra theo ngày/tháng/năm.

### Out of Scope (trong phạm vi Frontend ban đầu)

- Hệ thống phần cứng nhận diện biển số tự động (ANPR hardware - giao tiếp qua API tích hợp sau).
- Phần cứng đóng/mở barrier tự động.
- Cổng thanh toán ngân hàng trực tuyến (tích hợp ở các giai đoạn sau).

---

## 5. Key Roles (Tác nhân chính)

| Tác nhân | Quyền hạn & Trách nhiệm |
|---|---|
| **Quản lý (Admin)** | Toàn quyền quản trị hệ thống: quản lý nhân viên, quản lý cấu hình bãi xe, bảng giá vé, thống kê báo cáo doanh thu và giám sát vận hành. |
| **Nhân viên (Staff)** | Thao tác vận hành hàng ngày: kiểm soát xe ra vào bãi, kiểm tra vé, quản lý khách hàng, tra cứu vị trí đỗ xe. |

---

## 6. Technology Stack

- **Frontend**: React 19, JavaScript ES6+
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **Package Manager**: npm
- **Version Control**: Git

