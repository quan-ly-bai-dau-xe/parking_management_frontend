# Template: Technical Architecture Plan (`plan.md`)

> **Feature**: [Tên tính năng]  
> **Reference Spec**: [`spec.md`](./spec.md)  
> **Guiding Principle**: `frontend-modular-clean-code` & `ai-clean-code.md`  

---

## 1. Component Architecture & Responsibility Separation
*(Quy tắc cứng: Component không vượt quá 200 dòng)*

```
src/features/[feature-name]/
├── components/
│   ├── [Feature]Modal.tsx        # Container/Dialog mỏng, chỉ quản lý layout mở/đóng (< 150 dòng)
│   ├── [Feature]Form.tsx         # Form nhập liệu, bind react-hook-form / UI controls (< 180 dòng)
│   └── [Feature]Preview.tsx      # Hiển thị kết quả / camera snapshot / bill preview (< 120 dòng)
├── hooks/
│   └── use[Feature]Logic.ts      # Custom hook cô lập toàn bộ State, API calls, error handling
├── types/
│   └── [feature].types.ts        # Type definitions & API response models
├── constants/
│   └── [feature].constants.ts    # Hằng số UPPER_SNAKE_CASE, options, error labels
└── mappers/
    └── [feature].mapper.ts       # Chuyển đổi dữ liệu sạch sẽ từ DTO sang UI Model
```

---

## 2. State & Race-Condition Defense Plan
Bắt buộc tuân thủ Rule 4 trong `ai-clean-code.md`:
- **Dual-layer Guard (Double-click)**:
  - `actionPendingRef = useRef(false)`: Chặn đồng bộ tức thì các đợt click liên tiếp trước render cycle.
  - `isActionPending = useState(false)`: Thể hiện visual feedback (spinner, disable button).
- **Cleanup on Unmount**:
  - Mọi timer/polling/stream subscription lưu vào `useRef` và dọn dẹp trong `return () => ...` của `useEffect`.
- **State Reset**:
  - Xóa sạch lỗi cũ (`setErrorMessage("")`) trước khi gọi API mới.

---

## 3. UI Component Reusability
- Tận dụng tối đa `src/components/common/` (`DataTable`, `StatusBadge`, `Modal`, `Button`, `Input`).
- Không render Object thô vào JSX (Guard bằng optional chaining hoặc label extraction).

---

## 4. Testing Strategy (Anti-Fragile)
- Tuân thủ skill `resilient-testing-workflow`.
- Mock deterministic thông qua MSW hoặc Contract Factory.
- Kiểm thử black-box qua accessible roles (`getByRole`, `findByRole`), không phụ thuộc class Tailwind nội bộ.
