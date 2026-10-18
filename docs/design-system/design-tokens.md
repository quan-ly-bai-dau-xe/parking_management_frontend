# Design Tokens

> Nguồn: [Figma Design System — node 7:8595](https://www.figma.com/design/9hbEEmBDYb18uFdiUF3lVn/Untitled?node-id=7-8595).  
> Giá trị được trích xuất từ các token/variable hiển thị tại node này. Figma có một số token Dark riêng nhưng chưa có bộ semantic Dark đầy đủ; ô `—` nghĩa là chưa tìm thấy giá trị Dark tương ứng, không phải giá trị bằng rỗng.

## Color

| Token | Light | Dark | Usage |
|---|---|---|---|
| `color.text.primary` | `#0F172A` | `#EEF0FF`* | Văn bản chính có độ tương phản cao. |
| `color.text.secondary` | `#64748B` | `#C3C6D7`* | Văn bản phụ và thông tin ít nổi bật hơn. |
| `color.text.inverse` | `#FFFFFF` | `#131B2E`* | Văn bản đặt trên bề mặt có màu đối nghịch. |
| `color.background` | `#FAF8FF` | `#090D16`* | Nền tổng thể của trang ứng dụng. |
| `color.surface` | `#FAF8FF` | `#131C2E`* | Bề mặt mặc định của khu vực nội dung. |
| `color.surface.card` | `#FFFFFF` | — | Nền của thẻ nội dung. |
| `color.surface.subtle` | `#F1F5F9` | — | Nền nhẹ để phân tách khu vực phụ. |
| `color.surface.hover` | `#F8FAFC` | — | Nền khi phần tử tương tác được rê chuột. |
| `color.surface.container-lowest` | `#FFFFFF` | — | Bề mặt container sáng nhất. |
| `color.surface.container-low` | `#F2F3FF` | — | Bề mặt container có độ nhấn thấp. |
| `color.surface.container` | `#EAEDFF` | — | Bề mặt container tiêu chuẩn. |
| `color.surface.container-high` | `#E2E7FF` | — | Bề mặt container có độ nhấn cao. |
| `color.surface.container-highest` | `#DAE2FD` | — | Bề mặt container nổi bật nhất trong nhóm. |
| `color.surface.dim` | `#D2D9F4` | — | Bề mặt giảm độ sáng để tạo phân cấp. |
| `color.surface.bright` | `#FAF8FF` | — | Bề mặt sáng dùng trong hệ surface. |
| `color.brand.blue` | `#2563EB` | — | Màu thương hiệu xanh dương chủ đạo. |
| `color.brand.indigo` | `#4F46E5` | — | Màu thương hiệu chàm cho điểm nhấn phụ. |
| `color.brand.blue-50` | `#EFF6FF` | — | Nền xanh rất nhạt cho vùng nhấn nhẹ. |
| `color.brand.blue-100` | `#DBEAFE` | — | Nền xanh nhạt cho trạng thái hoặc vùng chọn. |
| `color.primary` | `#004AC6` | — | Màu hành động chính theo hệ màu semantic. |
| `color.on-primary` | `#FFFFFF` | — | Nội dung hiển thị trên màu primary. |
| `color.primary-container` | `#2563EB` | — | Nền container dùng màu primary. |
| `color.on-primary-container` | `#EEefff` | — | Nội dung hiển thị trên primary container. |
| `color.secondary` | `#006591` | — | Màu hành động hoặc nhấn thứ cấp. |
| `color.on-secondary` | `#FFFFFF` | — | Nội dung hiển thị trên màu secondary. |
| `color.secondary-container` | `#39B8FD` | — | Nền container dùng màu secondary. |
| `color.on-secondary-container` | `#004666` | — | Nội dung hiển thị trên secondary container. |
| `color.tertiary` | `#632ECD` | — | Màu nhấn thứ ba cho phân biệt nội dung. |
| `color.on-tertiary` | `#FFFFFF` | — | Nội dung hiển thị trên màu tertiary. |
| `color.tertiary-container` | `#7D4CE7` | — | Nền container dùng màu tertiary. |
| `color.on-tertiary-container` | `#F6EDFF` | — | Nội dung hiển thị trên tertiary container. |
| `color.accent.sky` | `#0EA5E9` | — | Điểm nhấn xanh da trời cho thành phần phụ. |
| `color.accent.violet` | `#8B5CF6` | — | Điểm nhấn tím cho thành phần phụ. |
| `color.border.default` | `#E2E8F0` | — | Đường viền mặc định của thành phần. |
| `color.border.subtle` | `#F1F5F9` | — | Đường viền nhẹ để phân tách nội dung. |
| `color.outline` | `#737686` | — | Viền có độ rõ vừa phải cho thành phần. |
| `color.outline-variant` | `#C3C6D7` | — | Viền phụ có độ tương phản thấp hơn. |
| `color.status.available.primary` | `#10B981` | — | Màu trạng thái chỗ đỗ còn trống. |
| `color.status.available.surface` | `#ECFDF5` | — | Nền cho trạng thái còn trống. |
| `color.status.available.border` | `#A7F3D0` | — | Viền cho trạng thái còn trống. |
| `color.status.occupied.primary` | `#EF4444` | — | Màu trạng thái chỗ đỗ đang có xe. |
| `color.status.occupied.surface` | `#FEF2F2` | — | Nền cho trạng thái đang có xe. |
| `color.status.occupied.border` | `#FECACA` | — | Viền cho trạng thái đang có xe. |
| `color.status.reserved.primary` | `#F59E0B` | — | Màu trạng thái chỗ đỗ đã đặt trước. |
| `color.status.reserved.surface` | `#FFFBEB` | — | Nền cho trạng thái đã đặt trước. |
| `color.status.reserved.border` | `#FDE68A` | — | Viền cho trạng thái đã đặt trước. |
| `color.status.ev-charging.primary` | `#06B6D4` | — | Màu trạng thái chỗ đỗ đang sạc xe điện. |
| `color.status.ev-charging.surface` | `#ECFEFF` | — | Nền cho trạng thái đang sạc xe điện. |
| `color.status.ev-charging.border` | `#A5F3FC` | — | Viền cho trạng thái đang sạc xe điện. |
| `color.status.maintenance.primary` | `#64748B` | — | Màu trạng thái chỗ đỗ đang bảo trì. |
| `color.status.maintenance.border` | `#CBD5E1` | — | Viền cho trạng thái đang bảo trì. |
| `color.shell.sidebar` | `#0F172A` | — | Nền thanh điều hướng bên. |
| `color.neutral.white` | `#FFFFFF` | — | Màu trung tính trắng dùng cho bề mặt hoặc nội dung. |
| `color.neutral.black` | `#000000` | — | Màu trung tính đen dùng khi cần màu tuyệt đối. |
| `color.neutral.slate-200` | `#E2E8F0` | — | Màu slate nhạt cho viền và phân tách. |
| `color.neutral.slate-400` | `#94A3B8` | — | Màu slate trung tính cho nội dung phụ. |
| `color.neutral.slate-800` | `#1E293B` | — | Màu slate đậm cho vùng nội dung tối. |
| `color.neutral.slate-900` | `#0F172A` | — | Màu slate đậm nhất trong thang được khai báo. |
| `color.error` | `#BA1A1A` | — | Màu báo lỗi theo hệ màu semantic. |
| `color.on-error` | `#FFFFFF` | — | Nội dung hiển thị trên nền báo lỗi. |
| `color.error-container` | `#FFDAD6` | — | Nền container dành cho lỗi. |
| `color.on-error-container` | `#93000A` | — | Nội dung hiển thị trên error container. |

\* Các giá trị Dark có dấu `*` là ánh xạ tham khảo từ token Dark/surface/inverse hiện có, không phải bộ mode Dark semantic đã được xác nhận hoàn chỉnh. Cần kiểm tra lại trong Figma trước khi dùng làm quy chuẩn triển khai.

## Typography

| Token | Font | Size | Weight | Line height |
|---|---|---:|---:|---:|
| `typography.headline-1` | Plus Jakarta Sans | 36px | 700 (Bold) | 44px |
| `typography.headline-1-mobile` | Plus Jakarta Sans | 28px | 700 (Bold) | 36px |
| `typography.headline-2-mobile` | Plus Jakarta Sans | 22px | 700 (Bold) | 30px |
| `typography.headline-3` | Plus Jakarta Sans | 20px | 600 (Semi Bold) | 28px |
| `typography.headline-4` | Plus Jakarta Sans | 16px | 600 (Semi Bold) | 24px |
| `typography.body-large` | Inter | 16px | 400 (Regular) | 24px |
| `typography.body-regular` | Inter | 14px | 400 (Regular) | 20px |
| `typography.body-bold` | Inter | 14px | 600 (Semi Bold) | 20px |
| `typography.body-small` | Inter | 12px | 400 (Regular) | 16px |
| `typography.caption` | Inter | 11px | 500 (Medium) | 14px |
| `typography.caption-uppercase` | Inter | 11px | 500 (Medium) | 14px |
| `typography.telemetry-code` | Space Mono | 12px | 400 (Regular) | 16px |
| `typography.telemetry-plate` | Space Mono | 15px | 700 (Bold) | 20px |
| `typography.code-multiline` | Space Mono | 12px | 400 (Regular) | 24px |
| `typography.spacer-text` | Inter | 12px | 400 (Regular) | 100px |

## Spacing

| Token | Value | Usage |
|---|---:|---|
| `spacing.zero` | 0px | Loại bỏ khoảng cách giữa các phần tử. |
| `spacing.xs` | 4px | Khoảng cách rất nhỏ giữa các thành phần gần nhau. |
| `spacing.sm` | 8px | Khoảng cách nhỏ cho nhóm thành phần liên quan. |
| `spacing.md` | 16px | Khoảng cách tiêu chuẩn trong bố cục. |
| `spacing.lg` | 24px | Khoảng cách lớn giữa các nhóm nội dung. |
| `spacing.xl` | 32px | Khoảng cách rộng giữa các khu vực. |
| `spacing.gutter` | 24px | Lề ngang tiêu chuẩn của nội dung. |
| `spacing.gutter-mobile` | 16px | Lề ngang nội dung trên màn hình nhỏ. |
| `spacing.margin` | 32px | Lề bố cục tiêu chuẩn. |
| `spacing.margin-mobile` | 16px | Lề bố cục trên màn hình nhỏ. |
| `spacing.extended-6` | 6px | Khoảng cách mở rộng theo nhịp 6px. |
| `spacing.extended-12` | 12px | Khoảng cách mở rộng theo nhịp 12px. |
| `spacing.extended-48` | 48px | Khoảng cách lớn cho các khu vực tách biệt. |
| `spacing.space-xs` | 4px | Khoảng cách phụ rất nhỏ trong thang spacing. |
| `spacing.space-sm` | 8px | Khoảng cách phụ nhỏ trong thang spacing. |
| `spacing.space-md` | 16px | Khoảng cách phụ tiêu chuẩn trong thang spacing. |
| `spacing.space-lg` | 24px | Khoảng cách phụ lớn trong thang spacing. |
| `spacing.space-xl` | 32px | Khoảng cách phụ rất lớn trong thang spacing. |

## Radius

| Token | Value | Usage |
|---|---:|---|
| `radius.none` | 0px | Góc vuông không bo tròn. |
| `radius.detail-2` | 2px | Bo góc rất nhẹ cho chi tiết nhỏ. |
| `radius.baseline-4` | 4px | Bo góc nhỏ cho thành phần gọn. |
| `radius.sm` | 6px | Bo góc nhỏ cho điều khiển và nhãn. |
| `radius.DEFAULT` | 8px | Bo góc mặc định của thành phần. |
| `radius.md` | 10px | Bo góc trung bình cho thành phần giao diện. |
| `radius.lg` | 14px | Bo góc lớn cho thẻ và vùng nội dung. |
| `radius.xl` | 24px | Bo góc rất lớn cho bề mặt nổi bật. |
| `radius.full` | 9999px | Tạo hình viên thuốc hoặc hình tròn. |

## Elevation

| Token | Value | Usage |
|---|---|---|
| `elevation.low` | `0 1px 3px #0F172A0D, 0 1px 2px -1px #0F172A0D` | Tạo độ nổi nhẹ cho thành phần nền. |
| `elevation.medium` | `0 4px 6px -1px #0F172A12, 0 2px 4px -2px #0F172A0D` | Tách thẻ khỏi nền ở mức trung bình. |
| `elevation.high` | `0 10px 15px -3px #2563EB14, 0 4px 6px -4px #0F172A0A` | Nhấn mạnh thành phần nổi bật hơn nền. |
| `elevation.floating-modal` | `0 20px 25px -5px #0F172A1F, 0 8px 10px -6px #0F172A0F` | Đưa modal nổi lên trên các lớp nội dung. |

## Notes

- Các giá trị được giữ theo tên và giá trị token lấy từ Figma; tên trong tài liệu được chuẩn hóa về dạng dấu chấm để tiện tham chiếu trong code.
- Không tự suy diễn giá trị Dark cho các token chưa có biến thể tương ứng.
- `letterSpacing` của các token typography trong Figma được giữ ở metadata nguồn nhưng không có cột riêng theo cấu trúc yêu cầu; các token có letter spacing đặc biệt gồm `headline-1` (-2), `headline-1-mobile` (-1), `caption`/`caption-uppercase` (2), `telemetry-code` (4), `telemetry-plate` (6) và `code-multiline` (4).
