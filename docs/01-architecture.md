# Architecture - Parking Management Frontend

## Tổng quan

**Parking Management Frontend** là ứng dụng React 19 chạy trên Vite, sử dụng Tailwind CSS cho giao diện quản lý vận hành bãi đỗ xe. Mã nguồn được tổ chức theo kiến trúc phân lớp nhẹ: page điều phối luồng màn hình, component chịu trách nhiệm hiển thị và tương tác UI, còn feature/service đóng gói nghiệp vụ và điểm tích hợp dữ liệu.

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
│   └── VehicleManagement/     # Component UI gắn với nghiệp vụ quản lý xe
├── config/                    # Cấu hình ứng dụng, hiện có navigation.js
├── features/                  # Nghiệp vụ theo domain và lớp tích hợp dữ liệu
│   └── login/                 # Nghiệp vụ xác thực, hiện có authService.js
├── mocks/                     # Dữ liệu mẫu phục vụ phát triển giao diện
└── pages/                     # Thành phần cấp trang và điểm đến điều hướng
```

### `src/pages/` — Page layer

Page là nơi lắp ghép một màn hình hoàn chỉnh và điều phối trạng thái cấp trang. Page có thể quản lý tìm kiếm, phân trang, modal, loading/error state và kết nối dữ liệu với component qua props.

Các page hiện có gồm `Login.jsx`, `ParkingHistory.jsx` và `VehicleManagement.jsx`. Khi thêm page mới, chỉ đặt logic điều phối ở đây; quy tắc nghiệp vụ có thể dùng lại nên được đưa xuống feature/service thay vì sao chép giữa các page.

### `src/components/` — UI component layer

Đây là các component presentational hoặc component tương tác dùng lại, giao tiếp thông qua props và callback:

1. **`src/components/common/` — Shared UI Primitives**:
   Lớp thành phần giao diện dùng chung cơ bản, hoàn toàn độc lập với domain cụ thể và bám sát theo [Design Tokens](design-system/design-tokens.md):
   - `LoadingSpinner`: Spinner trạng thái đang nạp/tải dữ liệu, hỗ trợ nhiều kích cỡ (`xs` đến `xl`), màu sắc và chế độ `fullScreen`.
   - `EmptyState`: Khung hiển thị trực quan khi danh sách hoặc bảng dữ liệu không có bản ghi nào.
   - `StatusBadge`: Huy hiệu trạng thái tập trung (chuẩn hóa 4 trạng thái: `parked` - Đang đỗ, `active` - Đang hoạt động, `in_transit` - Đang di chuyển, `maintenance` - Bảo trì).
   - `ConfirmModal`: Khung modal overlay đồng nhất (`fixed inset-0 z-50 backdrop-blur`) hỗ trợ các biến thể ngữ nghĩa (`info`, `success`, `warning`, `error`), có sẵn nút xác nhận/hủy và cho phép nhúng form/nội dung tùy ý qua `children`.
   - `FilterSelect`: Dropdown chọn giá trị lọc chuẩn hóa giao diện cho các bộ lọc tìm kiếm.
   - `PageToolbar`: Thẻ card chứa bộ lọc responsive dạng lưới kết hợp sẵn các nút hành động *Tìm kiếm* và *Làm mới*.
   - `Pagination`: Thanh điều hướng trang dùng chung (`currentPage`, `totalPages`, `onPageChange`), hiển thị dãy số trang và tự thu gọn các trang bị bỏ qua bằng dấu `…` (giữ luôn trang đầu/cuối), kèm dòng tóm tắt dạng *Hiển thị 1–10 / 78 bản ghi* khi truyền `totalItems` + `itemsPerPage`, hỗ trợ kích thước `sm`/`md`.
   - `index.js`: Điểm re-export tập trung giúp import thuận tiện (ví dụ `import { StatusBadge, PageToolbar } from "@/components/common"`).

2. **Domain-specific UI Components (`src/components/VehicleManagement/`, ...)**:
   Các component giao diện gắn liền với nghiệp vụ hoặc luồng tương tác của một chức năng cụ thể (ví dụ: `ScanPlateModal`, `EditVehicleModal`, `PageSectionHeader`).

3. **Layout & High-level Widgets**:
   Các khối giao diện cấp cao như `AppTopHeader`, `SearchBar`, `StatCard`.

> **Nguyên tắc phân định**: Component không được phụ thuộc trực tiếp vào API, storage, transport hoặc dữ liệu mock. Nếu một component cần hành động nghiệp vụ, nó chỉ phát callback; page/feature sở hữu callback đó và quyết định cách xử lý.

### `src/features/` — Feature/domain layer

Mỗi thư mục con đại diện cho một domain có ranh giới riêng. Feature có thể chứa service, API client, validation, mapper và state logic liên quan đến domain. Hiện tại `features/login/authService.js` là điểm đóng gói nghiệp vụ xác thực.

Feature không nên chứa JSX trình bày chung. Ngoại lệ là khi một domain thực sự sở hữu một composed UI module; khi đó UI vẫn phải giữ phạm vi trong feature và không làm rò rỉ chi tiết transport ra component dùng chung.

Khi bổ sung domain như vehicles, tickets hoặc parking slots, tạo thư mục feature tương ứng và đặt service/API client ở đó thay vì tạo các lời gọi API rải rác trong page.

### `src/mocks/` — Dữ liệu phát triển

`mocks/` chứa dữ liệu in-memory hiện dùng cho các luồng giao diện, gồm dữ liệu lịch sử đỗ xe, phương tiện và dữ liệu mẫu chung. Mock chỉ là nguồn dữ liệu thay thế trong giai đoạn phát triển; không đặt quy tắc nghiệp vụ quan trọng chỉ có thể chạy với mock.

### `src/config/`, `src/assets/` và `public/`

- `config/` chứa cấu hình tĩnh của ứng dụng, chẳng hạn định nghĩa navigation; không chứa state nghiệp vụ cấp trang.
- `assets/` chứa tài nguyên được import từ mã nguồn và được Vite xử lý khi build.
- `public/` chứa tệp cần giữ nguyên URL và được phục vụ trực tiếp, như favicon hoặc sprite icon; chỉ dùng cho tài nguyên không cần bundling.

## Luồng phụ thuộc

```text
main.jsx → App.jsx → pages/
                       ├── components/   (props + callbacks)
                       └── features/     (nghiệp vụ + dữ liệu)
                                           └── mocks/ hoặc API client
```

Page có thể phối hợp component và feature service, nhưng component dùng chung không được đi ngược xuống API hoặc storage. Feature service là lớp phù hợp để chuyển từ mock sang REST API; hợp đồng dữ liệu và mapping nên được giữ ổn định ở phía page/component.

## Nguyên tắc mở rộng

1. Đặt code theo nơi sở hữu trách nhiệm: UI dùng lại vào `components`, màn hình vào `pages`, nghiệp vụ theo domain vào `features`.
2. Không đưa logic nghiệp vụ vào component chỉ để tiện sử dụng tại một page; hãy đặt ở feature hoặc helper của domain.
3. Mọi backend integration mới phải đi qua feature service hoặc API client của feature đó.
4. Giữ API của component ở mức dữ liệu và callback; không truyền chi tiết request, response transport hoặc storage xuống UI.
5. Khi thay mock bằng backend thật, ưu tiên thay implementation của data/API layer và mapper, giữ nguyên page/component nếu hợp đồng dữ liệu không đổi.
