# Kế hoạch Thiết kế Module & Tối ưu UI Luồng Xe Ra Vào (Frontend Architecture & Plan)

> **Mã tài liệu**: `FE-PLAN-VEHICLE-ENTRY-EXIT`  
> **Tài liệu tham chiếu**: `spec.md`  
> **Nguyên tắc thiết kế**: Tuân thủ triệt để `frontend-modular-clean-code`, component < 200 dòng, custom hooks < 120 dòng, tái sử dụng `components/common/`.

---

## 1. Phân Rã Cấu Trúc Component (< 200 dòng)

Cấu trúc thư mục tại `src/components/VehicleManagement/scanPlate/`:

```
src/components/VehicleManagement/scanPlate/
├── index.jsx                        # Entry container kết nối làn vào & làn ra
├── EntryLanePanel.jsx               # Bảng điều khiển Làn Vào (< 180 lines)
├── ExitLanePanel.jsx                # Bảng điều khiển Làn Ra (< 190 lines)
├── ScanPlateCameraFeed.jsx          # Live stream & capture từ camera WebRTC (< 150 lines)
├── ScanPlateImageUpload.jsx         # Upload ảnh thủ công & Drag-drop (< 120 lines)
├── VehicleMatchedInfoCard.jsx       # Thẻ thông tin phương tiện, chủ xe & ô đỗ (< 160 lines)
├── CloseSessionSafetyModal.jsx      # Modal xử lý cưỡng chế/đóng phiên an toàn (< 140 lines)
├── components/                      # Sub-components phân tách nhỏ
│   ├── PlateRecognitionBadge.jsx    # Badge hiển thị biển số, OCR confidence & review reasons (< 100 lines)
│   ├── PlateSuggestionList.jsx      # Danh sách gợi ý biển số khi AI cần review (< 80 lines)
│   ├── BlacklistAlertBanner.jsx     # Banner cảnh báo danh sách đen & checkbox ghi đè (< 90 lines)
│   ├── ExitPaymentSummaryCard.jsx   # Card tóm tắt thời gian đỗ, cước phí & VietQR (< 150 lines)
│   └── SlotSelectorDropdown.jsx     # Dropdown chọn ô đỗ lọc theo tầng/khu & loại xe (< 120 lines)
└── hooks/                           # Custom Hooks nghiệp vụ
    ├── usePlateScan.js              # Hook gọi API scan & quản lý trạng thái OCR (< 110 lines)
    ├── useLaneCheckIn.js            # Hook xử lý tạo phiên đỗ xe vào (< 90 lines)
    └── useLaneCheckOut.js           # Hook xử lý đóng phiên đỗ & thanh toán (< 100 lines)
```

---

## 2. Thiết Kế State & Biện Pháp Chống Race Condition

### 2.1 Quản lý trạng thái bằng `useRef` + `useState`
- Dùng `useRef(false)` (`isSubmittingRef`) kết hợp `useState(false)` (`isLoading`) cho tất cả các thao tác xác nhận Check-In / Check-Out.
- Ngăn chặn triệt để hiện tượng double-click gửi 2 request song song gây mã lỗi `PROP-4.5.1-P07` (Duplicate Open Session) hoặc `PROP-4.5.1-P10` (Session Already Closed).

### 2.2 Cleanup Timer & Luồng Camera
- `ScanPlateCameraFeed.jsx` đảm bảo tắt tất cả `MediaStreamTrack` trong `useEffect` cleanup return function khi unmount hoặc chuyển tab.
- Tránh rò rỉ bộ nhớ (memory leaks) và giữ camera không bị chiếm dụng vô thời hạn.

---

## 3. Quản Lý Lỗi & Mẫu Phản Hồi Trực Quan (Error Mapping)

Mọi mã lỗi từ backend (`PROP-4.5.1-P01` đến `PROP-4.5.1-P17`) đều được map thông qua `mapScanPlateError(err)` để hiển thị Toast / Alert thân thiện với người dùng tiếng Việt có dấu chuẩn UTF-8.
