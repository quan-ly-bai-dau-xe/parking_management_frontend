# Kế hoạch Công việc & Kiểm thử Luồng Xe Ra Vào (Tasks & Test Verification)

> **Mã tài liệu**: `FE-TASKS-VEHICLE-ENTRY-EXIT`  
> **Tài liệu tham chiếu**: `spec.md`, `plan.md`  

---

## Giai đoạn 1: Chuẩn bị & Xác thực Hợp đồng API (Setup & Contracts)
- [x] **T1.1**: Rà soát tài liệu API Backend `05-parking-endpoints.md` và mã lỗi `05-proposed-messages.md`.
- [x] **T1.2**: Xây dựng tài liệu Spec chính `docs/specs/vehicle-entry-exit/spec.md`.
- [x] **T1.3**: Xây dựng tài liệu Kế hoạch phân rã module `docs/specs/vehicle-entry-exit/plan.md`.

## Giai đoạn 2: Hoàn thiện Component & Checklist Xử lý Trường hợp Đặc biệt (Implementation)
- [ ] **T2.1**: Kiểm tra rà soát `EntryLanePanel.jsx` và `ExitLanePanel.jsx` đảm bảo giới hạn < 200 dòng.
- [ ] **T2.2**: Bổ sung bộ lọc ô đỗ xe tương thích loại xe `CAR`/`EV` (`TL-38`).
- [ ] **T2.3**: Xử lý 9 mã lý do review AI OCR (`review_reasons`) trên giao diện khi `NEEDS_REVIEW`.
- [ ] **T2.4**: Tích hợp banner cảnh báo Blacklist và cơ chế ghi đè cho quyền `MANAGER` (`TL-08`).
- [ ] **T2.5**: Tích hợp Modal an toàn đóng phiên bất thường (`CloseSessionSafetyModal.jsx`).

## Giai đoạn 3: Kiểm thử & Đảm bảo Chất lượng (Quality Assurance & Verification)
- [ ] **T3.1**: Viết Unit Test cho mapper lỗi biển số xe và tính cước phí `calculateParkingFee`.
- [ ] **T3.2**: Chạy kiểm thử Component Test cho luồng Làn vào và Làn ra.
- [ ] **T3.3**: Kiểm tra tuân thủ phím tắt điều khiển (`Enter`, `Space`, `Esc`).
- [ ] **T3.4**: Chạy `npm run build` hoặc `npm run test` trên Frontend để đảm bảo không có lỗi cú pháp / import.

## Giai đoạn 4: Cập nhật Đồ thị Kiến trúc
- [ ] **T4.1**: Chạy `graphify update .` để đồng bộ tri thức đồ thị monorepo.
