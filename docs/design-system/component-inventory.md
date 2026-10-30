# Component Inventory

> Nguồn tham chiếu: [Figma Design System — Foundations, node 7:8595](https://www.figma.com/design/9hbEEmBDYb18uFdiUF3lVn/Untitled?node-id=7-8595) & Mẫu giao diện tham khảo [CustomerManagement.jsx](file:///e:/code/parking_management/parking_management_frontend/src/pages/CustomerManagement.jsx).

Tài liệu này phân loại các **Component dùng chung** (đã có file riêng, sẵn sàng import) và các **Pattern tham khảo** (đang dựng trực tiếp bằng JSX trong các trang mẫu) nhằm giúp lập trình viên và AI chọn đúng giải pháp tái sử dụng, tránh nhầm lẫn pattern cục bộ thành component có sẵn.

---

## 1. Form & Filter Elements

| Tên | Loại | Vị trí triển khai | Mô tả / API chính |
|---|---|---|---|
| **FilterSelect** | Component dùng chung | `src/components/common/FilterSelect.jsx` | Dropdown chọn bộ lọc: `label`, `value`, `onChange`, `options` |
| **PageToolbar** | Component dùng chung | `src/components/common/PageToolbar.jsx` | Khung container bộ lọc responsive bọc ngoài: `children` |
| **Search Input Bar** | Pattern tham khảo | JSX trong `CustomerManagement.jsx` | Ô tìm kiếm kèm icon kính lúp, nút xóa nhanh (X) và shortcut `<kbd>Ctrl+K</kbd>` |
| **Advanced Filter Popover** | Pattern tham khảo | JSX trong `CustomerManagement.jsx` | Nút bấm kèm badge đếm số bộ lọc, mở panel flyout chứa các tiêu chí lọc nâng cao |
| **Filter Reset Button** | Pattern tham khảo | JSX trong `CustomerManagement.jsx` | Nút tròn xoay icon reset (`↻`) để đặt lại toàn bộ điều kiện lọc |

---

## 2. Navigation & Layout

| Tên | Loại | Vị trí triển khai | Mô tả / API chính |
|---|---|---|---|
| **AppLayout** | Component dùng chung | `src/components/layout/AppLayout.jsx` | Layout chuẩn bọc ngoài: chứa header và vùng nội dung chính (`Outlet` hoặc `children`) |
| **AppTopHeader** | Component dùng chung | `src/components/layout/AppTopHeader.jsx` | Header điều hướng: danh sách menu, dropdown tài khoản và popover thông báo |
| **Pagination** | Component dùng chung | `src/components/common/Pagination.jsx` | Thanh phân trang tích hợp cùng hook `usePagination` (hỗ trợ chọn page size, dấu rút gọn `…`) |
| **Button** | Component dùng chung | `src/components/common/button/Button.jsx` (kèm Story) | Nút bấm chuẩn với variants: `primary`, `secondary`, `danger`, `outline`, hỗ trợ `isLoading` |
| **Icon** | Component dùng chung | `src/components/common/icon/Icon.jsx` (kèm Story) | Biểu tượng Lucide tập trung: `name`, `size` (`xs`->`lg`, số px), gallery showcase |
| **Primary Action Button** | Pattern tham khảo | Class Tailwind toàn dự án | Nút hành động chính (`bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2.5 font-semibold`) |

---

## 3. Data Display & Table

| Tên | Loại | Vị trí triển khai | Mô tả / API chính |
|---|---|---|---|
| **DataTable** | Component dùng chung | `src/components/common/DataTable.jsx` | Bảng dữ liệu chuẩn: nhận danh sách cột `columns`, dữ liệu `data`, rỗng tự gọi `EmptyState` |
| **TableActions** | Component dùng chung | `src/components/common/TableActions.jsx` | Nhóm nút thao tác trên dòng: xem (`onView`), sửa (`onEdit`), khóa/mở (`onToggle`), xóa (`onDelete`) |
| **StatusBadge** | Component dùng chung | `src/components/common/badge/StatusBadge.jsx` (kèm Story) | Huy hiệu trạng thái: hỗ trợ các biến thể `active`, `warning`, `error`, `inactive` |
| **StatCard** | Component dùng chung | `src/components/StatCard.jsx` | Thẻ hiển thị số liệu thống kê: tiêu đề, giá trị chính, icon và nhãn phụ |

---

## 4. Feedback & Overlay

| Tên | Loại | Vị trí triển khai | Mô tả / API chính |
|---|---|---|---|
| **ConfirmModal** | Component dùng chung | `src/components/common/ConfirmModal.jsx` | Hộp thoại xác nhận thao tác nguy hiểm hoặc quan trọng: `isOpen`, `onConfirm`, `onCancel` |
| **LoadingSpinner** | Component dùng chung | `src/components/common/LoadingSpinner.jsx` | Biểu tượng xoay loading: các kích thước `xs` đến `xl`, hỗ trợ kèm nhãn chữ |
| **EmptyState** | Component dùng chung | `src/components/common/EmptyState.jsx` | Khung trạng thái trống: icon minh họa, tiêu đề, mô tả gợi ý và nút hành động |

---

## Hướng dẫn áp dụng

1. **Ưu tiên dùng component có sẵn**: Khi xây dựng màn hình mới, ưu tiên sử dụng các component có trong `src/components/common/` và `src/components/layout/` nếu phù hợp với yêu cầu thực tế.
2. **Tham khảo pattern từ `CustomerManagement.jsx`**: Với các tính năng chưa được đóng gói thành component dùng chung (như thanh tìm kiếm kèm Ctrl+K, popover bộ lọc nâng cao), tham khảo cấu trúc JSX và logic tại `CustomerManagement.jsx` để giữ tính đồng nhất giao diện.
3. **Linh hoạt theo nghiệp vụ**: Các component như `DataTable`, `TableActions`, hay `Pagination` được khuyến khích sử dụng cho các trang quản trị dạng danh sách chuẩn, nhưng có thể điều chỉnh hoặc dùng giải pháp thay thế khi trang có bố cục đặc thù hoặc yêu cầu tương tác khác biệt.
