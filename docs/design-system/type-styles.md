# Type Styles

> Nguồn: [Figma Design System — Foundations, node 7:8595](https://www.figma.com/design/9hbEEmBDYb18uFdiUF3lVn/Untitled?node-id=7-8595) & Mẫu chuẩn UI thực tế tại [CustomerManagement.jsx](file:///e:/code/parking_management/parking_management_frontend/src/pages/CustomerManagement.jsx).

> [!NOTE]
> Các cấp chữ và định dạng dưới đây đóng vai trò là thang đo phân cấp tham chiếu. Không nên giới hạn cứng mỗi cấp chữ chỉ được dùng cho một mục đích duy nhất; lập trình viên có thể linh hoạt áp dụng tùy theo mật độ thông tin, cấu trúc khối và ngữ cảnh thực tế của từng màn hình.

---

## 1. Hierarchy & Ánh xạ Tailwind CSS thực tế

| Phân cấp Typography | Font Family | Size / Line-height | Weight | Tailwind Class | Ngữ cảnh thường dùng |
|---|---|---|---|---|---|
| **Page Title (H1)** | Plus Jakarta Sans / Inter | 24px (1.5rem) / 32px | Bold (700) | `text-xl sm:text-2xl font-bold tracking-tight text-slate-900` | Tiêu đề chính đầu trang |
| **Section / Card Header (H2)**| Plus Jakarta Sans / Inter | 14px - 16px / 20px - 24px | Bold (700) | `text-sm font-bold text-slate-900` | Tiêu đề thẻ bảng, khối thống kê hoặc tiêu đề modal |
| **Subtitle / Description** | Inter | 12px - 14px / 16px - 20px | Regular (400) | `text-xs text-slate-500 mt-0.5` | Dòng mô tả dưới tiêu đề, văn bản hỗ trợ |
| **Table Header** | Inter | 11px - 12px / 16px | SemiBold (600) | `text-2xs sm:text-xs font-semibold text-slate-500 uppercase tracking-wider` | Tiêu đề các cột trong `DataTable` |
| **Table Body Cell** | Inter | 12px (0.75rem) / 16px | Regular / Medium | `text-xs text-slate-700 align-middle` | Dữ liệu nội dung bảng hoặc danh sách thông tin |
| **Code / Identifier** | Space Mono / Font-Mono | 12px / 16px | SemiBold (600) | `font-mono text-xs font-semibold text-slate-900` | Mã khách hàng (`KH001`), biển số xe, mã vé |
| **Badge / Caption** | Inter | 11px (0.6875rem) / 14px | Medium (500) | `text-2xs font-medium` | Chữ trong StatusBadge, nhãn nhỏ, tooltip |
| **Button Text** | Inter | 12px (0.75rem) / 16px | SemiBold (600) | `text-xs font-semibold` | Chữ trong nút bấm hành động (Thêm mới, Áp dụng, Hủy) |

---

## 2. Quy tắc Typography

1. **Nhất quán Font Family**: Sử dụng `font-sans` làm font chính thống của giao diện (Inter / hệ thống), và `font-mono` cho các mã số định danh như mã xe, mã khách hàng, biển số xe.
2. **Kích cỡ văn bản**:
   - Tránh dùng font quá lớn trong bảng quản trị; bảng dữ liệu dày đặc sử dụng `text-xs` (12px) để hiển thị tối ưu thông tin.
   - Tiêu đề cột nên viết hoa (`uppercase tracking-wider`) và giảm kích cỡ (`text-2xs` hoặc `text-xs`) để tăng độ rõ ràng cho hàng dữ liệu bên dưới.
3. **Màu chữ theo phân cấp**:
   - Chữ tiêu đề / định danh chính: `text-slate-900` (đậm, nổi bật nhất).
   - Chữ nội dung thường: `text-slate-700`.
   - Chữ ghi chú / nhãn phụ: `text-slate-500`.
   - Placeholder / icon vô hiệu: `text-slate-400`.
