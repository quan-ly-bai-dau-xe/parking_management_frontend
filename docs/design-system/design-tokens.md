# Design Tokens

> Nguồn: [Figma Design System — node 7:8595](https://www.figma.com/design/9hbEEmBDYb18uFdiUF3lVn/Untitled?node-id=7-8595) & Mẫu chuẩn UI thực tế tại [CustomerManagement.jsx](file:///e:/code/parking_management/parking_management_frontend/src/pages/CustomerManagement.jsx).

---

## 1. Color Tokens & Tailwind Classes

### A. Surface & Backgrounds

| Token | Giá trị Hex | Tailwind Class | Ứng dụng thực tế |
|---|---|---|---|
| `color.background` | `#FAF8FF` | `bg-[#FAF8FF]` | Nền tổng thể toàn bộ trang quản trị (App Shell) |
| `color.surface.card` | `#FFFFFF` | `bg-white` | Nền thẻ chứa bảng dữ liệu, toolbar bộ lọc, modal |
| `color.surface.hover` | Nền trong suốt 75% trên nền trắng | `hover:bg-slate-50/75` | Hiệu ứng rê chuột trên các hàng của DataTable (kết quả hiển thị phụ thuộc nền) |
| `color.surface.subtle` | `#F8FAFC` | `bg-slate-50` | Nền header của bảng (`<thead>`), container phụ |
| `color.surface.muted` | `#F1F5F9` | `bg-slate-100` | Nền badge phụ, thẻ tag thứ cấp |
| `color.border.default` | `#E2E8F0` | `border-slate-200` | Đường viền phân cách card, table cell, popover |
| `color.border.input` | `#CBD5E1` | `border-slate-300` | Viền ô nhập liệu tìm kiếm, dropdown select |

### B. Typography Colors

| Token | Giá trị Hex | Tailwind Class | Ứng dụng thực tế |
|---|---|---|---|
| `color.text.primary` | `#0F172A` | `text-slate-900` / `text-[#0F172A]` | Tiêu đề trang (H1), tên khách hàng, mã code, chữ đậm |
| `color.text.secondary` | `#64748B` | `text-slate-500` / `text-[#64748B]` | Mô tả phụ trang, nhãn cột bảng, văn bản phụ |
| `color.text.muted` | `#94A3B8` | `text-slate-400` / `placeholder:text-slate-400` | Placeholder ô tìm kiếm, icon mờ |
| `color.text.inverse` | `#FFFFFF` | `text-white` | Chữ trên nút bấm chính (Primary Button), badge đậm |

### C. Brand & Accent

| Token | Giá trị Hex | Tailwind Class | Ứng dụng thực tế |
|---|---|---|---|
| `color.brand.blue` | `#2563EB` | `bg-blue-600 hover:bg-blue-700` | Nút hành động chính (Primary CTA), nút Áp dụng |
| `color.brand.blue-50`| `#EFF6FF` | `bg-blue-50 text-blue-600` | Nền icon nhấn, badge đã chọn |
| `color.brand.blue-100`| `#DBEAFE` | `bg-blue-100` | Vùng nền nhấn sáng |
| `color.brand.blue-200`| `#BFDBFE` | `border-blue-200` | Viền nhấn của container, vùng active |

### D. Semantic Status Colors (Huy hiệu & Trạng thái)

| Trạng thái | Nền (Surface) | Chữ (Text) | Viền (Border) | Chấm chỉ thị (Dot) | Ứng dụng thực tế |
|---|---|---|---|---|---|
| **Active / Hoạt động** | `bg-emerald-50` | `text-emerald-700` | `border-emerald-200` | `bg-emerald-500` | Khách hàng đang hoạt động, xe đang gửi |
| **Warning / Sắp hết hạn** | `bg-amber-50` | `text-amber-700` | `border-amber-200` | `bg-amber-500` | Vé sắp hết hạn, cảnh báo vị trí |
| **Danger / Hết hạn / Khóa**| `bg-rose-50` | `text-rose-700` | `border-rose-200` | `bg-rose-500` | Vé đã hết hạn, tài khoản tạm khóa, lỗi |
| **Inactive / Ngưng** | `bg-slate-100` | `text-slate-600` | `border-slate-200` | `bg-slate-400` | Tài khoản ngừng hoạt động, thông tin lưu trữ |

---

## 2. Spacing & Elevation Tokens

- **Border Radius**:
  - `rounded-lg` (8px): Nút bấm, ô input, dropdown select, badge trạng thái.
  - `rounded-xl` (12px): Thẻ Card toolbar, card DataTable, popover bộ lọc chi tiết.
  - `rounded-2xl` (16px): Khung hộp thoại Modal (`ConfirmModal`).
- **Box Shadow**:
  - `shadow-2xs` (`0 1px 2px 0 rgb(0 0 0 / 0.05)`): Dùng cho card toolbar, dropdown, nút bấm.
  - `shadow-xl`: Dùng cho popover bộ lọc nâng cao và popup modal.
- **Page Spacing**:
  - `px-4 sm:px-6 lg:px-10 py-6` kết hợp `space-y-6`.
