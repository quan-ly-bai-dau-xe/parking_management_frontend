# Template: Execution Checklist (`tasks.md`)

> **Feature**: [Tên tính năng]  
> **Status**: Ready for Execution  

---

### Phase 1: Foundation & Types (Zero Side-Effects)
- [ ] **Task 1.1**: Tạo Types & DTO contracts trong `types/[feature].types.ts`.
- [ ] **Task 1.2**: Khai báo hằng số, labels, error messages trong `constants/[feature].constants.ts` (Không dùng Magic Numbers / Magic Strings).
- [ ] **Task 1.3**: Viết mapper DTO sang UI Model trong `mappers/[feature].mapper.ts` (Idempotent, Single Source of Truth).

### Phase 2: Logic & State Encapsulation (Test-First / Hook Isolation)
- [ ] **Task 2.1**: Dựng Custom Hook `hooks/use[Feature]Logic.ts`.
  - [ ] Implement dual-layer guard chống double-click (`useRef` + `useState`).
  - [ ] Implement state reset trước khi mutate dữ liệu.
  - [ ] Setup timer cleanup nếu có setTimeout / polling.
- [ ] **Task 2.2**: Viết Unit Test cho Custom Hook / Logic trong `tests/features/[feature]/hook.test.ts`.

### Phase 3: Modular UI Components (< 200 dòng mỗi file)
- [ ] **Task 3.1**: Dựng Component hiển thị dữ liệu / preview (Pure UI).
- [ ] **Task 3.2**: Dựng Form nhập liệu & validation.
- [ ] **Task 3.3**: Dựng Container / Modal kết nối Hook với các sub-components.
- [ ] **Task 3.4**: Thêm Guard kiểm tra object trước khi render JSX (chống React child object error).

### Phase 4: Integration & Verification
- [ ] **Task 4.1**: Viết Component Test / Integration Test với MSW hoặc Accessible Roles.
- [ ] **Task 4.2**: Chạy linter & typecheck (`pnpm run lint` / `pnpm run typecheck`).
- [ ] **Task 4.3**: Chạy test suite xác nhận toàn bộ xanh (`pnpm run test`).
- [ ] **Task 4.4**: Cập nhật Knowledge Graph: `graphify update .`.
