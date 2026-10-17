# Software Requirements Specification (SRS)
## Hệ thống Quản lý Bãi đậu xe Ô tô (Version 4.1)

---

## 1. GIỚI THIỆU CHUNG

### 1.1 Mục đích

Hiện nay, với nhu cầu đi lại ngày càng tăng, các phương tiện giao thông ngày càng phổ biến, đặc biệt là xe ô tô. Việc tăng số lượng xe cũng dẫn đến nhiều vấn đề trong việc trông giữ, quản lý các bãi đỗ, đậu xe ô tô như: số lượng xe ra vào, số chỗ còn lại trong bãi, số xe còn lại hay thời gian xe đã ở trong bãi đậu xe. Việc đó có thể làm mất nhiều thời gian cho khách hàng đậu xe cũng như của người trông coi bãi đậu xe khi kiểm tra xe ra, vào bãi. Chính vì thế, tạo ra phần mềm để quản lý bãi đậu xe là một phần giúp ích cho mọi người tiết kiệm được thời gian của mình, cũng như gia tăng khả năng quản lý của chủ bãi đậu xe.

Hệ thống quản lý bãi đậu xe có thể được xây dựng dựa trên những nhu cầu mà người quản lý cần để giảm thời gian khi quản lý xe, những khó khăn và bất cập gặp phải hàng ngày và giảm thiểu mọi rủi ro có thể xảy ra. Hệ thống có các chức năng chính như: quản lý xe vào ra, quản lý thời gian xe ở trong bãi, quản lý vé xe của khách hàng theo tháng, thông tin khách hàng và thông tin của người làm việc ở bãi đậu xe. Các chức năng này giúp quản lý dễ dàng theo dõi, điều khiển quá trình hoạt động của bãi đậu xe và có thể điều chỉnh, giúp đỡ hay khắc phục các sự cố có thể xảy ra.

### 1.2 Phạm vi

Sử dụng cho các bãi đậu xe ô tô vừa và lớn, cần nhiều nhân viên quản lý hoặc các bãi đậu xe thông minh, hoạt động độc lập. Với các chức năng chính:

- Quản lý ra vào bãi đậu xe.
- Quản lý thời gian xe đậu trong bãi.
- Quản lý vé tháng của khách hàng.
- Quản lý thời gian làm việc của nhân viên, hệ thống admin…

---

## 2. MÔ TẢ TỔNG QUAN HỆ THỐNG

### 2.1 Danh sách tác nhân (Actors)

| Tác nhân | Mô tả vai trò |
|---|---|
| **Quản lý (Admin)** | Quản lý toàn bộ hệ thống, có thể thực hiện, thao tác toàn bộ chức năng: quản lý nhân viên, cấu hình bãi xe, quản lý giá vé và thống kê. |
| **Nhân viên (Staff)** | Thao tác thực hiện các chức năng nghiệp vụ hàng ngày: Quản lý khách hàng, quản lý xe vào/ra, kiểm tra vé, thông tin cá nhân. |

---

## 3. CÁC PHÂN HỆ CHỨC NĂNG CHÍNH (Functional Overview)

1. **Phân hệ Đăng nhập & Xác thực**: Xác thực tài khoản Admin và Nhân viên, phân quyền truy cập.
2. **Phân hệ Quản lý Xe Vào / Ra**: Ghi nhận thời gian xe vào, chỉ định vị trí đỗ, đối soát biển số và tính phí khi xe ra khỏi bãi.
3. **Phân hệ Quản lý Bãi xe & Vị trí đỗ**:
   - Quản lý thông tin số tầng, sơ đồ bãi đỗ.
   - Quản lý chi tiết vị trí đỗ xe: tầng, số vị trí, kích thước (dài x rộng x cao), loại xe cho phép (4 chỗ, 7 chỗ, 12 chỗ...).
   - Trạng thái vị trí đỗ (trống, đang đỗ, đã được đặt).
4. **Phân hệ Quản lý Vé xe**:
   - Quản lý danh sách vé xe (vé lượt, vé tháng).
   - Đăng ký vé mới, gia hạn vé tháng cho khách hàng.
5. **Phân hệ Quản lý Khách hàng & Phương tiện**:
   - Quản lý hồ sơ khách hàng: họ tên, số điện thoại, email, thông tin xe (biển số, loại xe, hãng xe).
6. **Phân hệ Quản lý Nhân viên**:
   - Danh sách nhân viên, thêm, sửa, phân ca và theo dõi thời gian làm việc.
7. **Phân hệ Báo cáo & Thống kê**:
   - Thống kê doanh thu theo ngày, tháng, năm.
   - Thống kê mật độ xe ra vào và hiệu suất sử dụng bãi đỗ.

---

## 4. YÊU CẦU PHI CHỨC NĂNG (Non-Functional Requirements)

- **Hiệu năng (Performance)**: Cho phép nhiều người dùng (nhân viên, quản lý) truy cập và thao tác đồng thời với thời gian phản hồi dưới 1 giây.
- **Tính khả dụng (Usability)**: Giao diện trực quan, rõ ràng, thao tác nhập xuất biển số và tìm kiếm vị trí đỗ nhanh chóng, hỗ trợ responsive trên cả máy tính bảng và desktop.
- **Tính tin cậy & Toàn vẹn dữ liệu (Reliability)**: Đảm bảo không xảy ra xung đột khi xếp cùng một vị trí đỗ cho 2 xe khác nhau tại cùng một thời điểm.
