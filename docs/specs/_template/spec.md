# Template: Feature Specification (`spec.md`)

> **Feature Name**: [Tên tính năng ngắn gọn, ví dụ: manual-plate-entry]  
> **Target Scope**: Frontend (`parking_management_frontend`)  
> **Related Backend API**: [Ví dụ: POST /api/v1/parking/entries/manual/]  
> **Author / Role**: Frontend Engineer / Agent  
> **Status**: Draft | Approved | In Progress | Completed  

---

## 1. Business Problem & User Story
- **Bối cảnh**: [Mô tả ngắn gọn người dùng là ai, gặp vấn đề gì hoặc cần thao tác gì]
- **User Story**: 
  - *Là một* [Nhân viên trực cổng / Quản lý bãi xe],
  - *Tôi muốn* [Thực hiện thao tác X],
  - *Để* [Đạt được mục tiêu Y mà không làm gián đoạn luồng xe].

---

## 2. API Contract & Data Flow
*(Tham chiếu trực tiếp từ `parking_management_backend/docs/api-endpoints.md` hoặc `06-frontend-srs-db-alignment.md`)*

### 2.1. Request Schema
```typescript
export interface FeatureRequestPayload {
  // Bắt buộc định nghĩa rõ ràng kiểu dữ liệu, không dùng 'any'
}
```

### 2.2. Response Schema
```typescript
export interface FeatureResponseData {
  // Trả về từ Backend API
}
```

### 2.3. Mapper Requirements (Anti-Shadowing & Single Source of Truth)
- [ ] Tuân thủ quy tắc `ai-clean-code.md`: Bóc tách sub-domain (Customer, Ticket, Slot) trước khi gán flat keys.
- [ ] Xử lý ảnh/media qua helper an toàn: lọc bỏ các chuỗi giả (`"null"`, `"undefined"`).

---

## 3. Edge Cases & Error Handling
| Mã lỗi / Tình huống | Nguyên nhân | Phản hồi giao diện (UI UX) |
| :--- | :--- | :--- |
| `400 Bad Request` | Thiếu dữ liệu hoặc sai định dạng | Highlight trường lỗi trên Form |
| `409 Conflict` | Biển số hoặc thẻ đang ở trạng thái kích hoạt | Báo lỗi Modal, cung cấp tùy chọn tra cứu |
| `502 / Network Timeout` | Mất kết nối backend / camera | Retry tự động hoặc thông báo kèm icon cảnh báo |
| `Missing Image / 404` | Không có ảnh từ camera | Render placeholder fallback sạch (không dùng `console.error`) |

---

## 4. Acceptance Criteria (AC)
- [ ] **AC-01**: [Tiêu chí hoàn thành 1]
- [ ] **AC-02**: [Tiêu chí hoàn thành 2 - bao gồm trạng thái loading & double-click prevention]
- [ ] **AC-03**: [Tiêu chí hoàn thành 3 - xử lý lỗi biên và fallback]
