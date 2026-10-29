# Architecture - Parking Management Frontend

## Tổng quan

**Parking Management Frontend** là ứng dụng React 19 chạy trên Vite, sử dụng Tailwind CSS cho giao diện quản lý vận hành bãi đỗ xe. Mã nguồn được tổ chức theo kiến trúc phân lớp nhẹ: page điều phối luồng màn hình, component chịu trách nhiệm hiển thị và tương tác UI, hook quản lý logic dùng chung, còn feature/service đóng gói nghiệp vụ và điểm tích hợp dữ liệu.

Mục tiêu của cách tổ chức này là giữ cho UI có thể tái sử dụng, nghiệp vụ không bị lặp giữa các trang, và việc thay dữ liệu mock bằng REST API không buộc phải viết lại giao diện.

## Cấu trúc thư mục

```text
public/                         # Tệp tĩnh được web server phục vụ trực tiếp
src/
├── App.jsx                    # Vỏ ứng dụng và cấu hình route/điều hướng
├── main.jsx                   # Điểm khởi động React và mount root
├── index.css                  # CSS nền/tokens và cấu hình kiểu dùng chung
├── assets/                    # Ảnh, SVG và tài nguyên được Vite import/bundle
├── components/                # Component UI dùng lại, giao tiếp qua props
│   ├── common/                # Shared UI primitives dùng chung toàn dự án
│   ├── layout/                # Route layouts, hiện có AppLayout dùng Outlet
│   └── VehicleManagement/     # Component UI gắn với nghiệp vụ quản lý xe
├── config/                    # Cấu hình ứng dụng, hiện có navigation.js
├── features/                  # Nghiệp vụ theo domain (auth, vehicle, dashboard, plateScan)
├── hooks/                     # Custom React hooks (usePagination, usePlateScan, useCurrentUser)
├── mocks/                     # Dữ liệu mẫu phục vụ phát triển giao diện
├── pages/                     # Thành phần cấp trang và điểm đến điều hướng
└── services/                  # Client API chung và dịch vụ kết nối backend (apiClient, customerService)
```

### `src/pages/` — Page layer

Page là nơi lắp ghép một màn hình hoàn chỉnh và điều phối trạng thái cấp trang. Page có thể quản lý tìm kiếm, phân trang, modal, loading/error state và kết nối dữ liệu với component qua props.

Các page chính trong hệ thống:
- `LoginPage.jsx`: Đăng nhập hệ thống.
- `homepage.jsx`: Trang bảng điều khiển trung tâm (Dashboard).
- `VehicleManagement.jsx`: Quản lý xe ra vào, quét biển số.
- `CustomerManagement.jsx`: Quản lý danh sách khách hàng.
- `EmployeeManagement.jsx`: Quản lý danh sách nhân viên và ca trực.
- `ParkingLotManagement.jsx`: Quản lý sơ đồ và tình trạng vị trí đỗ xe.
- `ParkingHistory.jsx`: Lịch sử lưu xe ra/vào.
- `TicketManagement.jsx`: Quản lý các loại vé xe (vé lượt, vé tháng).
- `NotificationsPage.jsx`: Trung tâm thông báo hệ thống.

Khi thêm page mới, chỉ đặt logic điều phối ở đây; tuân thủ chuẩn layout tại `docs/page-layout-standards.md`. Quy tắc nghiệp vụ có thể dùng lại nên được đưa xuống feature/service thay vì sao chép giữa các page.

### `src/components/` — UI component layer

Đây là các component presentational hoặc component tương tác dùng lại, giao tiếp thông qua props và callback:

1. **`src/components/common/` — Shared UI Primitives**:
   Lớp thành phần giao diện dùng chung cơ bản, hoàn toàn độc lập với domain cụ thể và bám sát theo [Design Tokens](design-system/design-tokens.md):
   - `LoadingSpinner`: Spinner trạng thái đang nạp/tải dữ liệu, hỗ trợ nhiều kích cỡ (`xs` đến `xl`), màu sắc và chế độ `fullScreen`.
   - `EmptyState`: Khung hiển thị trực quan khi danh sách hoặc bảng dữ liệu không có bản ghi nào.
   - `StatusBadge`: Huy hiệu trạng thái tập trung (chuẩn hóa các trạng thái vận hành: `parked`, `active`, `in_transit`, `maintenance`,...).
   - `ConfirmModal`: Khung modal overlay đồng nhất (`fixed inset-0 z-50 backdrop-blur`) hỗ trợ các biến thể ngữ nghĩa (`info`, `success`, `warning`, `error`), có sẵn nút xác nhận/hủy và cho phép nhúng form/nội dung tùy ý qua `children`.
   - `FilterSelect`: Dropdown chọn giá trị lọc chuẩn hóa giao diện cho các bộ lọc tìm kiếm.
   - `PageToolbar`: Thẻ card chứa bộ lọc responsive dạng lưới kết hợp sẵn các nút hành động *Tìm kiếm* và *Làm mới*.
   - `DataTable`: Component hiển thị bảng dữ liệu dùng chung, chuẩn hóa giao diện header, hàng và ô dữ liệu.
   - `TableActions`: Cụm nút thao tác (Xem, Sửa, Xóa) trên từng dòng dữ liệu trong bảng.
   - `Pagination`: Thanh điều hướng trang dùng chung (`currentPage`, `totalPages`, `onPageChange`), hiển thị dãy số trang và tự thu gọn các trang bị bỏ qua bằng dấu `…` (giữ luôn trang đầu/cuối), kèm dòng tóm tắt dạng *Hiển thị 1–10 / 78 bản ghi* khi truyền `totalItems` + `itemsPerPage`, hỗ trợ kích thước `sm`/`md`.
   - `index.js`: Điểm re-export tập trung giúp import thuận tiện (ví dụ `import { StatusBadge, PageToolbar, DataTable, TableActions } from "@/components/common"`).

2. **Domain-specific UI Components (`src/components/VehicleManagement/`, ...)**:
   Các component giao diện gắn liền với nghiệp vụ hoặc luồng tương tác của một chức năng cụ thể (ví dụ: `ScanPlateModal`, `EditVehicleModal`, `PageSectionHeader`, `EmployeeModal`).

3. **Layout & High-level Widgets**:
   `layout/AppLayout.jsx` là route layout dùng `Outlet` để render page con và chứa `AppTopHeader`. Các page không nên tự render lại `AppTopHeader` khi đã nằm dưới layout. Những widget cấp cao khác gồm `SearchBar`, `StatCard`.

> **Nguyên tắc phân định**: Component không được phụ thuộc trực tiếp vào API, storage, transport hoặc dữ liệu mock. Nếu một component cần hành động nghiệp vụ, nó chỉ phát callback; page/feature sở hữu callback đó và quyết định cách xử lý.

### `src/hooks/` — Custom Hooks layer

Đóng gói các logic vòng đời hoặc trạng thái có thể tái sử dụng giữa các trang và component:
- `usePagination.js`: Hook xử lý phân trang chuẩn hóa (`currentPage`, `totalPages`, `sliceData`, `goToPage`,...).
- `usePlateScan.js`: Hook hỗ trợ quét và nhận dạng biển số xe tự động.
- `useCurrentUser.js`: Hook lấy thông tin người dùng hiện tại và phân quyền.

### `src/features/` & `src/services/` — Feature/domain & API layer

- **`features/`**: Mỗi module đóng gói nghiệp vụ domain riêng: `authService.js`, `vehicleService.js`, `dashboardService.js`, `plateScanService.js`.
- **`services/`**: Chứa client giao tiếp mạng nền tảng: `apiClient.js` (cấu hình Axios/Fetch, interceptor, gắn JWT token, chuẩn hóa error envelope) và các service giao tiếp API phía backend (như `customerService.js`).

Feature/Service không nên chứa JSX trình bày chung.

### `src/mocks/` — Dữ liệu phát triển

`mocks/` chứa dữ liệu in-memory hiện dùng cho các luồng giao diện, gồm dữ liệu lịch sử đỗ xe, phương tiện và dữ liệu mẫu chung. Mock chỉ là nguồn dữ liệu thay thế trong giai đoạn phát triển; không đặt quy tắc nghiệp vụ quan trọng chỉ có thể chạy với mock.

### `src/config/`, `src/assets/` và `public/`

- `config/` chứa cấu hình tĩnh của ứng dụng, chẳng hạn định nghĩa navigation; không chứa state nghiệp vụ cấp trang.
- `assets/` chứa tài nguyên được import từ mã nguồn và được Vite xử lý khi build.
- `public/` chứa tệp cần giữ nguyên URL và được phục vụ trực tiếp, như favicon hoặc sprite icon; chỉ dùng cho tài nguyên không cần bundling.

## Luồng phụ thuộc

```text
main.jsx → App.jsx → route layout (AppLayout) → Outlet → pages/
                               ├── hooks/        (usePagination, usePlateScan,...)
                               ├── components/   (props + callbacks)
                               └── features/ & services/ (nghiệp vụ + apiClient)
                                                   └── mocks/ hoặc Backend REST API
```

Page có thể phối hợp component, hook và feature service, nhưng component dùng chung không được đi ngược xuống API hoặc storage. Feature/Service là lớp phù hợp để chuyển từ mock sang REST API; hợp đồng dữ liệu và mapping nên được giữ ổn định ở phía page/component.

## Nguyên tắc mở rộng

1. Đặt code theo nơi sở hữu trách nhiệm: UI dùng lại vào `components`, màn hình vào `pages`, logic dùng chung vào `hooks`, nghiệp vụ theo domain vào `features`, gọi API mạng vào `services`.
2. Không đưa logic nghiệp vụ vào component chỉ để tiện sử dụng tại một page; hãy đặt ở feature hoặc helper của domain.
3. Mọi backend integration mới phải đi qua `services/apiClient.js` hoặc feature service tương ứng.
4. Giữ API của component ở mức dữ liệu và callback; không truyền chi tiết request, response transport hoặc storage xuống UI.
5. Khi thay mock bằng backend thật, ưu tiên thay implementation của data/API layer và mapper, giữ nguyên page/component nếu hợp đồng dữ liệu không đổi.
