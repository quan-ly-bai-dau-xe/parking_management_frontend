# Hướng dẫn áp dụng Spec-Driven Development (Spec-Kit Workflow)

Hệ thống quản lý bãi xe Smart Mobility áp dụng mô hình **Spec-Driven Development (SDD)** lấy cảm hứng từ GitHub Spec-Kit, được tinh gọn để tích hợp trực tiếp với kiến trúc monorepo và quy tắc Clean Code của dự án.

---

## 1. Mục tiêu & Lợi ích
- **Ngăn chặn Vibe-Coding**: Không bao giờ viết code trực tiếp mà chưa rõ Contract và Edge Cases.
- **Bảo toàn ranh giới Backend - Frontend**: Đảm bảo Frontend tuân thủ chính xác SRS và Database Alignment (TL-01 đến TL-49) mà không cần can thiệp Backend.
- **Code Clean ngay từ đầu**: Giữ mọi component dưới 200 dòng, cô lập hooks nghiệp vụ, chống race condition và triệt tiêu lỗi render object React.

---

## 2. Cấu trúc thư mục Feature Spec

Mỗi tính năng hoặc màn hình mới trên Frontend sẽ được lưu tại:
`parking_management_frontend/docs/specs/<feature-name>/`

Gồm 3 file hạt nhân:
1. `spec.md`: Đặc tả nghiệp vụ, API contract, mã lỗi biên, Acceptance Criteria.
2. `plan.md`: Thiết kế module, chia tách component (< 200 dòng), kế hoạch chống double-click/race condition.
3. `tasks.md`: Danh sách công việc phân rã tuần tự theo 4 giai đoạn rõ ràng.

*(Các mẫu chuẩn đã có sẵn tại `parking_management_frontend/docs/specs/_template/`)*.

---

## 3. Quy trình 4 bước khi làm việc với AI Agent

1. **Khởi tạo Spec**: Copy template từ `_template/` sang thư mục feature mới và điền thông tin nghiệp vụ/contract từ backend docs.
2. **Review & Chốt Plan**: Yêu cầu Agent rà soát `plan.md` cùng subagent `cross-stack-contract-verifier` để xác nhận schema mapping.
3. **Thực thi tuần tự Tasks**: Agent đánh dấu hoàn thành từng task trong `tasks.md` theo phương châm thay đổi tối thiểu, chính xác (surgical edits).
4. **Kiểm thử & Khóa Graph**: Chạy kiểm thử tự động, build frontend và chạy `graphify update .` để đồng bộ đồ thị tri thức dự án.
