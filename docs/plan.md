# Kế hoạch phát triển: Parking Management Frontend

## 1. Mục tiêu
Xây dựng giao diện ứng dụng quản lý bãi đậu xe ô tô (Parking Management Frontend) theo tài liệu SRS v4.1, áp dụng React 19, Vite và Tailwind CSS.

## 2. Các phân hệ chức năng
1. **Quản lý Vị trí Bãi đỗ (Parking Slots)**:
   - Danh sách vị trí đỗ (số tầng, số vị trí, kích thước, loại xe cho phép).
   - Thêm mới, chỉnh sửa thông tin vị trí đỗ.
   - Bản đồ trạng thái đỗ (trống / có xe).
2. **Quản lý Xe Vào / Ra (Vehicle Entry & Exit)**:
   - Ghi nhận xe vào bãi, gán vị trí đỗ.
   - Kiểm tra xe ra bãi và tính phí.
3. **Quản lý Vé (Ticket Management)**:
   - Danh sách vé lượt, vé tháng.
   - Cấp vé, gia hạn vé tháng.
4. **Quản lý Khách hàng & Phương tiện (Customer & Vehicles)**:
   - Thông tin chủ phương tiện, biển số, loại xe.
5. **Tìm kiếm & Phân trang**:
   - Tìm kiếm nhanh theo biển số xe, mã vị trí hoặc tên khách hàng.
   - Phân trang hiển thị dữ liệu bảng.

## 3. Công nghệ sử dụng
- **Frontend Core**: React 19, Vite
- **UI Framework**: Tailwind CSS
- **Data & Service Layer**: Async Mock Service chuẩn bị tích hợp REST API

## 4. Tiêu chí nghiệm thu (Acceptance Criteria)
- [ ] Giao diện trực quan, đồng bộ bố cục Sidebar + Main Content theo UI Rules.
- [ ] Các thao tác CRUD vị trí đỗ, tìm kiếm và phân trang hoạt động ổn định.
- [ ] Build thành công không có lỗi cú pháp hoặc cảnh báo nghiêm trọng (`npm run build`).
