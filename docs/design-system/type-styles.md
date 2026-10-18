# Type Styles

> Nguồn: [Figma Design System — Foundations, node 7:8595](https://www.figma.com/design/9hbEEmBDYb18uFdiUF3lVn/Untitled?node-id=7-8595).  
> Danh sách bên dưới dựa trên các typography tokens đọc được từ nguồn. Không thêm cột “Use for” hoặc mô tả ứng dụng ép buộc.

## Available Type Styles

| Token | Font | Size | Weight | Line height | Letter spacing |
|---|---|---:|---:|---:|---:|
| `Spec/Typography/headline-1` | Plus Jakarta Sans | 36px | 700 / Bold | 44px | -2 |
| `Spec/Typography/headline-1-mobile` | Plus Jakarta Sans | 28px | 700 / Bold | 36px | -1 |
| `Spec/Typography/headline-2-mobile` | Plus Jakarta Sans | 22px | 700 / Bold | 30px | 0 |
| `Spec/Typography/headline-3` | Plus Jakarta Sans | 20px | 600 / Semi Bold | 28px | 0 |
| `Spec/Typography/headline-4` | Plus Jakarta Sans | 16px | 600 / Semi Bold | 24px | 0 |
| `Spec/Typography/body-large` | Inter | 16px | 400 / Regular | 24px | 0 |
| `Spec/Typography/body-regular` | Inter | 14px | 400 / Regular | 20px | 0 |
| `Spec/Typography/body-bold` | Inter | 14px | 600 / Semi Bold | 20px | 0 |
| `Spec/Typography/body-small` | Inter | 12px | 400 / Regular | 16px | 0 |
| `Spec/Typography/caption` | Inter | 11px | 500 / Medium | 14px | 2 |
| `UI/Component/caption-uppercase` | Inter | 11px | 500 / Medium | 14px | 2 |
| `Spec/Typography/telemetry-code` | Space Mono | 12px | 400 / Regular | 16px | 4 |
| `Spec/Typography/telemetry-plate` | Space Mono | 15px | 700 / Bold | 20px | 6 |
| `UI/Component/code-multiline` | Space Mono | 12px | 400 / Regular | 24px | 4 |
| `UI/Component/spacer-text` | Inter | 12px | 400 / Regular | 100px | 0 |

## Rules

- Giữ nguyên tên token/style gốc trong Figma để có thể đối chiếu.
- Giữ nguyên font family, weight, size, line height và letter spacing như nguồn.
- Không tự tạo H5/H6 hoặc Paragraph Small/Medium/Large nếu chưa tìm thấy style tương ứng trong nguồn.
- Không suy ra style chỉ vì hệ thống thường có một cấp typography phổ biến.
- Nếu style chưa đọc được từ Figma, đánh dấu `Chưa xác minh` thay vì tự đặt thông số.
- Khi cập nhật, chỉ bổ sung các style có bằng chứng từ Text Styles hoặc typography variables trong Figma.
- Các giá trị size/line height trong bảng được ghi bằng px; letter spacing giữ nguyên giá trị số theo metadata của Figma.

## Coverage

- [x] Headline styles có trong dữ liệu đọc được.
- [x] Body styles có trong dữ liệu đọc được.
- [x] Caption và code/telemetry styles có trong dữ liệu đọc được.
- [ ] Xác minh riêng danh sách Text Styles chính thức của file, nếu có.
- [ ] Xác minh có hay không các style H5, H6 và Paragraph Small/Medium/Large chưa xuất hiện trong dữ liệu hiện tại.
