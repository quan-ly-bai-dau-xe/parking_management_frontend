# Component Inventory

> Nguồn: [Figma Design System — Foundations, node 7:8595](https://www.figma.com/design/9hbEEmBDYb18uFdiUF3lVn/Untitled?node-id=7-8595).  
> Phạm vi hiện xác minh được: frame Foundations — Smart Mobility. Chưa có danh sách component library đầy đủ được trả về từ nguồn truy cập hiện tại; các nhóm dưới đây là kế hoạch kiểm kê, không phải khẳng định rằng mọi component đã tồn tại trong Figma.

## Mục tiêu

Ghi nhận những component có sẵn trong Design System để AI biết component nào có thể tái sử dụng, các variant và properties mà component hỗ trợ. Tài liệu này chỉ mô tả khả năng hiện có, không hướng dẫn AI tự thiết kế lại component.

## Quy tắc quét

Không yêu cầu AI “quét tất cả component” bằng một lượt đệ quy không giới hạn. Quét theo từng nhóm dưới đây, chỉ ghi nhận component gốc/component set và các variant của nó; không tạo mục riêng cho atom lồng bên trong component cha, trừ khi atom đó cũng được công bố như một component độc lập trong thư viện.

### 1. Form Elements

| Component | Variants | Properties | Status |
|---|---|---|---|
| Field / Form Field | Chưa xác minh | Chưa xác minh | Chưa kiểm kê từ component library |
| Input / Textarea | Chưa xác minh | Chưa xác minh | Chưa kiểm kê từ component library |
| Select / Dropdown | Chưa xác minh | Chưa xác minh | Chưa kiểm kê từ component library |
| Checkbox | Chưa xác minh | Chưa xác minh | Chưa kiểm kê từ component library |
| Radio | Chưa xác minh | Chưa xác minh | Chưa kiểm kê từ component library |
| Switch / Toggle | Chưa xác minh | Chưa xác minh | Chưa kiểm kê từ component library |
| Date / Time Picker | Chưa xác minh | Chưa xác minh | Chưa kiểm kê từ component library |

### 2. Navigation

| Component | Variants | Properties | Status |
|---|---|---|---|
| Button | Chưa xác minh | Chưa xác minh | Chưa kiểm kê từ component library |
| Link | Chưa xác minh | Chưa xác minh | Chưa kiểm kê từ component library |
| Breadcrumb | Chưa xác minh | Chưa xác minh | Chưa kiểm kê từ component library |
| Tabs | Chưa xác minh | Chưa xác minh | Chưa kiểm kê từ component library |
| Pagination | Chưa xác minh | Chưa xác minh | Chưa kiểm kê từ component library |
| Sidebar / Navigation Item | Chưa xác minh | Chưa xác minh | Chưa kiểm kê từ component library |

### 3. Data Display

| Component | Variants | Properties | Status |
|---|---|---|---|
| Avatar | Chưa xác minh | Chưa xác minh | Chưa kiểm kê từ component library |
| List / List Item | Chưa xác minh | Chưa xác minh | Chưa kiểm kê từ component library |
| Tag / Badge | Chưa xác minh | Chưa xác minh | Chưa kiểm kê từ component library |
| Table | Chưa xác minh | Chưa xác minh | Chưa kiểm kê từ component library |
| Tooltip | Chưa xác minh | Chưa xác minh | Chưa kiểm kê từ component library |
| Card | Chưa xác minh | Chưa xác minh | Chưa kiểm kê từ component library |
| Empty State | Chưa xác minh | Chưa xác minh | Chưa kiểm kê từ component library |

### 4. Feedback, Overlay và các nhóm khác

| Component | Variants | Properties | Status |
|---|---|---|---|
| Alert / Inline Message | Chưa xác minh | Chưa xác minh | Chưa kiểm kê từ component library |
| Toast / Notification | Chưa xác minh | Chưa xác minh | Chưa kiểm kê từ component library |
| Modal / Dialog | Chưa xác minh | Chưa xác minh | Chưa kiểm kê từ component library |
| Drawer | Chưa xác minh | Chưa xác minh | Chưa kiểm kê từ component library |
| Tooltip / Popover | Chưa xác minh | Chưa xác minh | Chưa kiểm kê từ component library |
| Loading / Skeleton | Chưa xác minh | Chưa xác minh | Chưa kiểm kê từ component library |
| Icon / Icon Button | Chưa xác minh | Chưa xác minh | Chưa kiểm kê từ component library |
| Parking / Mobility-specific components | Chưa xác minh | Chưa xác minh | Cần kiểm tra các trang/component set chuyên biệt |

## Quy tắc ghi nhận

- **Component**: ghi đúng tên trong Figma và node/component set gốc.
- **Variants**: liệt kê các giá trị variant thực sự có trong Figma, chẳng hạn `size`, `type`, `state` hoặc `appearance`; không tự thêm biến thể suy đoán.
- **Properties**: ghi tên property và các giá trị được hỗ trợ, gồm text, boolean, instance swap và variant properties khi có.
- **Nested atoms**: không mở rộng cây con thành danh sách component độc lập nếu chúng chỉ là thành phần triển khai bên trong component cha.
- **Chưa xác minh**: giữ nhãn này cho đến khi có bằng chứng từ component library hoặc node nguồn; không thay bằng giá trị mặc định do AI suy luận.

## Hướng dẫn cho AI

1. Kiểm kê từng nhóm theo thứ tự: Form Elements → Navigation → Data Display → Feedback/Overlay và nhóm chuyên biệt.
2. Kết thúc mỗi nhóm sau khi đã liệt kê các component gốc, variants và properties có bằng chứng.
3. Không đệ quy vô hạn qua component con; chỉ theo quan hệ lồng nhau khi cần hiểu property của component cha.
4. Không tạo component mới, không đề xuất API code và không mô tả quy tắc sử dụng trong tài liệu inventory này.
5. Nếu không đọc được component library, báo rõ nhóm chưa kiểm kê thay vì suy đoán.

## Cập nhật trạng thái

- [ ] Form Elements đã kiểm tra từ component library.
- [ ] Navigation đã kiểm tra từ component library.
- [ ] Data Display đã kiểm tra từ component library.
- [ ] Feedback / Overlay / nhóm chuyên biệt đã kiểm tra từ component library.
- [ ] Tên, variants và properties đã được đối chiếu với nguồn Figma.
