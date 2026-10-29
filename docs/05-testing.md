# Tài liệu Kiểm thử (Test Specification) - Quản lý Bãi đậu xe Ô tô

**Phiên bản:** 1.2  
**Ngày cập nhật:** 2026-10-28  
**Phạm vi:** Danh mục đầy đủ các chức năng Sống còn Cốt lõi (Mission-Critical / Core Features)

---

## 1. Định nghĩa Chức năng Sống còn (Mission-Critical)

Một hệ thống bãi đỗ xe thông minh chỉ có thể tồn tại và vận hành khi đảm bảo **4 tiêu chí bất biến**:
1. **Lưu thông cổng liên tục** (Không để tắc nghẽn barie, không đơ lag khi xe tới).
2. **An ninh & Chống mất cắp xe** (Đối chiếu dữ liệu phương tiện, bảo vệ tài sản khách hàng).
3. **Toàn vẹn tài chính & Chống thất thoát** (Tính đúng giá, chốt sổ ca trực minh bạch, không gian lận vé).
4. **Tính chính xác của tài nguyên bãi xe** (Trạng thái slot, phân quyền nhân sự, phòng chống quá tải).

> [!IMPORTANT]
> **Quy tắc Mission-Critical:** Nếu bất kỳ chức năng nào trong danh sách này gặp sự cố, hệ thống sẽ rơi vào trạng thái **vô dụng** (không thể vận hành được) hoặc **gây hậu quả nghiêm trọng** (mất xe, thất thoát tiền bạc, tê liệt cổng ra vào, sai lệch ca trực).

---

## 2. Bảng tổng hợp Kịch bản Smoke Test Mission-Critical Toàn diện

| Nhóm nghiệp vụ | Mã kịch bản | Tên kịch bản kiểm thử | Hậu quả nếu chức năng này hỏng (Impact) |
| :--- | :--- | :--- | :--- |
| **I. Kiểm soát Cổng vào (Check-in)** | **ST-CORE-01** | Check-in xe hợp lệ (Vé tháng / Vé lượt) | Cổng tê liệt, xe dồn ứ ngoài đường |
| | **ST-CORE-02** | Chặn tiếp nhận xe khi bãi đầy (Capacity Control) | Bãi quá tải, xe vào không có chỗ đỗ gây hỗn loạn |
| | **ST-CORE-03** | Chặn gian lận vòng lặp thẻ (Anti-passback Cổng vào) | 1 vé cho nhiều xe, nguy cơ tráo xe/mất xe |
| | **ST-CORE-04** | Kiểm tra tương thích kích thước xe & Vị trí đỗ | Xe lớn vào slot nhỏ gây va quẹt, tai nạn trong bãi |
| **II. Kiểm soát Cổng ra & Thu phí (Check-out)** | **ST-CORE-05** | Check-out & Tự động tính toán biểu phí (Biểu phí bậc thang/giờ) | Sai lệch tài chính, thất thoát doanh thu bãi đỗ |
| | **ST-CORE-06** | Check-out xe vé tháng & Kiểm tra thời hạn hiệu lực | Khách hàng vé tháng bị tính oan hoặc trốn phí khi hết hạn |
| | **ST-CORE-07** | Chặn xuất bãi khi không có lịch sử vào bãi (Ghost Exit) | Nguy cơ mất trộm ô tô, mở barie bất hợp pháp |
| | **ST-CORE-08** | Cảnh báo sai lệch biển số giữa lúc Vào và lúc Ra | Tráo biển số, mất xe của khách gửi |
| | **ST-CORE-09** | Xử lý sự cố Mất vé lượt (Lost Ticket Protocol) | Bế tắc cổng ra, không có cơ chế phạt mất thẻ minh bạch |
| **III. Trạng thái & Tài nguyên Bãi (Slot Management)** | **ST-CORE-10** | Đồng bộ trạng thái Slot tức thì (Trống $\leftrightarrow$ Có xe) | Báo sai số chỗ trống, dẫn xe vào ngõ cụt |
| | **ST-CORE-11** | Khóa slot khi bảo trì hoặc đặt trước (Reserve/Out of Service) | Xe gửi vào vị trí đang sửa chữa, hư hỏng phương tiện |
| **IV. Vòng đời Vé & Quyền lợi (Ticket Lifecycle)** | **ST-CORE-12** | Kích hoạt & Gia hạn vé tháng thành công | Khách bị chặn oan tại cổng dù đã nộp tiền |
| | **ST-CORE-13** | Khóa/Thu hồi thẻ bị báo mất lập tức (Blacklist Stolen Ticket) | Kẻ gian nhặt được thẻ lấy cắp xe ra khỏi bãi |
| **V. Quản lý Ca trực & Tài chính (Shift & Revenue)** | **ST-CORE-14** | Bàn giao ca trực & Đối soát tiền mặt/chuyển khoản | Thất thoát quỹ tiền mặt, đùn đẩy trách nhiệm giữa các ca |
| **VI. Phân quyền & Bảo mật (Auth & Access)** | **ST-CORE-15** | Bảo vệ phân quyền: Nhân viên không thể can thiệp lịch sử/doanh thu | Nhân viên sửa dữ liệu ăn chặn tiền gửi xe |

---

## 3. Chi tiết Kịch bản Kiểm thử cho Từng Nhóm Nghiệp vụ

---

### PHẦN I: KIỂM SOÁT CỔNG VÀO (CHECK-IN)

#### `ST-CORE-01`: Check-in phương tiện hợp lệ & Cấp quyền vào bãi
- **Ý nghĩa sống còn:** Luồng xử lý check-in cơ bản; phải phản hồi < 2 giây để tránh kẹt cổng.
- **Tiền điều kiện:** Bãi xe còn vị trí trống; phương tiện hợp lệ.
- **Các bước:**
  1. Nhập/quét biển số xe (Ví dụ: `30A-123.45`).
  2. Hệ thống phân loại tự động: Vé tháng (hợp đồng có sẵn) hoặc Cấp vé lượt mới.
  3. Chỉ định/gợi ý vị trí đỗ còn trống.
  4. Nhấn **Xác nhận cho vào**.
- **Kỳ vọng:** Ghi nhận thời gian vào chính xác; slot chuyển sang `Occupied`; in vé/mở barie.

#### `ST-CORE-02`: Chặn tiếp nhận xe khi bãi đã đầy (Capacity Limit)
- **Ý nghĩa sống còn:** Ngăn bãi xe vỡ trận vì đón khách vượt quá số chỗ thực tế.
- **Tiền điều kiện:** Tất cả slot đỗ của loại xe tương ứng đều ở trạng thái `Occupied` (Available = 0).
- **Các bước:** Thực hiện thao tác tiếp nhận thêm 1 xe.
- **Kỳ vọng:** Hệ thống vô hiệu hóa nút Tiếp nhận, hiển thị cảnh báo đỏ *"Bãi đã đầy, không thể nhận thêm"*. Không phát sinh bản ghi ảo.

#### `ST-CORE-03`: Ngăn chặn gian lận vòng lặp thẻ (Anti-passback Cổng vào)
- **Ý nghĩa sống còn:** Ngăn chặn chiêu trò đưa thẻ vé tháng ra ngoài cho một xe khác quẹt vào tiếp.
- **Tiền điều kiện:** Xe `30A-123.45` đã check-in và chưa check-out.
- **Các bước:** Nhập lại biển số `30A-123.45` tại cổng vào lần thứ 2.
- **Kỳ vọng:** Từ chối tiếp nhận kèm cảnh báo: *"Phương tiện hiện đang ở trong bãi (Slot [X]). Vi phạm Anti-passback"*.

#### `ST-CORE-04`: Kiểm tra tương thích kích cỡ phương tiện và ô đỗ (Vehicle-Slot Dimension Fit)
- **Ý nghĩa sống còn:** Tránh xe 7 chỗ hoặc xe bán tải vào các slot nhỏ dành cho sedan/hatchback gây va quẹt hoặc chắn lối đi.
- **Tiền điều kiện:** Xe có loại kích cỡ lớn (SUV / Bán tải / 7 chỗ); chỉ còn vị trí đỗ loại nhỏ (Compact).
- **Các bước:** Chọn xe loại lớn và thử gán vào vị trí đỗ cỡ nhỏ.
- **Kỳ vọng:** Hệ thống cảnh báo: *"Kích thước xe vượt quá kích thước vị trí đỗ được chọn"* và ngăn xác nhận.

---

### PHẦN II: KIỂM SOÁT CỔNG RA, TÍNH PHÍ & AN NINH XUẤT BÃI (CHECK-OUT)

#### `ST-CORE-05`: Check-out, Tự động tính toán biểu phí lưu bãi
- **Ý nghĩa sống còn:** Hạch toán tài chính chính xác; tính cước bậc thang/theo giờ/qua đêm không sai một đồng.
- **Tiền điều kiện:** Xe vãng lai đã gửi 3 giờ 15 phút. Biểu phí quy định: Giờ đầu 20k, mỗi giờ tiếp theo 15k, làm tròn theo block 30 phút.
- **Các bước:**
  1. Quét mã vé/biển số tại cổng ra.
  2. Kiểm tra mục thành tiền tính toán tự động.
  3. Chọn phương thức thanh toán và xác nhận cho xe ra.
- **Kỳ vọng:** Số tiền hiển thị đúng chuẩn công thức cấu hình (Ví dụ: 20k + 15k*2 = 50k); giải phóng slot về `Available`; ghi nhận doanh thu.

#### `ST-CORE-06`: Check-out xe vé tháng & Xác minh thời hạn vé
- **Ý nghĩa sống còn:** Bảo đảm quyền lợi người đóng tiền theo tháng và phát hiện người dùng vé quá hạn.
- **Tiền điều kiện:** Xe đăng ký vé tháng.
- **Các bước:** Quét xe vé tháng xuất bãi.
  - *Nếu còn hạn:* Hiển thị phí `0 VNĐ`, cho phép xuất bãi nhanh.
  - *Nếu đã hết hạn:* Hệ thống cảnh báo đỏ *"Vé tháng hết hạn ngày [DD/MM/YYYY]"*, chuyển sang áp dụng bảng giá vé lượt phụ thu.
- **Kỳ vọng:** Phân định chính xác trạng thái vé; không giải phóng xe miễn phí nếu vé đã hết hạn.

#### `ST-CORE-07`: Chặn xuất bãi khi không có lịch sử vào (Ghost Exit Defense)
- **Ý nghĩa sống còn:** Ngăn ngừa kẻ trộm dùng vé giả hoặc nhân viên mở barie bừa bãi.
- **Tiền điều kiện:** Biển số lạ hoặc biển số xe đã check-out trước đó.
- **Các bước:** Nhập biển số tại cổng ra và cố gắng xác nhận cho ra.
- **Kỳ vọng:** Hệ thống khóa luồng: *"Không tìm thấy thông tin lượt vào hợp lệ"*. Bắt buộc phải có xác nhận đặc biệt của Quản lý nếu muốn giải quyết sự cố.

#### `ST-CORE-08`: Cảnh báo sai lệch biển số giữa Cổng vào và Cổng ra
- **Ý nghĩa sống còn:** Ngăn chặn tráo vé, tráo biển số giữa các xe trong bãi.
- **Tiền điều kiện:** Khách dùng vé A (lúc vào gắn với xe biển số `29A-111.11`), nhưng tại cổng ra xe xuất trình là `30E-222.22`.
- **Các bước:** Quét vé A nhưng nhập/nhận diện biển số là `30E-222.22`.
- **Kỳ vọng:** Hệ thống bật còi/cảnh báo màn hình: *"Biển số xe ra không khớp với thông tin xe lúc vào"*. Khóa không cho mở barie tự động.

#### `ST-CORE-09`: Xử lý sự cố Mất vé lượt (Lost Ticket Workflow)
- **Ý nghĩa sống còn:** Tình huống xảy ra hàng ngày trong thực tế; nếu không có tính năng này, xe bị kẹt vĩnh viễn ở bãi hoặc nhân viên tự thu tiền bỏ túi riêng.
- **Tiền điều kiện:** Khách làm mất thẻ vé giấy/thẻ từ.
- **Các bước:**
  1. Nhân viên chọn chức năng **Báo mất vé / Tìm kiếm xe theo biển số**.
  2. Nhập biển số xe của khách để tra lại ảnh và thời điểm vào thực tế.
  3. Áp dụng mức phí: Phí gửi xe thực tế + Tiền phạt làm mất thẻ (theo quy định).
  4. Xác nhận thanh toán và hủy mã thẻ cũ.
- **Kỳ vọng:** Xe được xuất bãi hợp lệ, thẻ bị mất được đưa vào danh sách vô hiệu hóa, doanh thu phạt và cước gửi được ghi nhận riêng biệt.

---

### PHẦN III: QUẢN LÝ VÀ ĐỒNG BỘ TRẠNG THÁI BÃI ĐỖ (SLOT MANAGEMENT)

#### `ST-CORE-10`: Đồng bộ tức thì trạng thái Slot (Real-time Slot State Sync)
- **Ý nghĩa sống còn:** Tránh tình trạng 2 cổng cùng điều 2 xe vào 1 vị trí trống duy nhất (Race Condition).
- **Tiền điều kiện:** Màn hình sơ đồ vị trí đỗ đang mở ở nhiều máy trạm.
- **Các bước:** Máy Cổng 1 hoàn tất Check-in gán vào Slot A-05.
- **Kỳ vọng:** Màn hình các máy trạm khác và bảng điện tử tự động chuyển Slot A-05 sang màu đỏ (`Occupied`) ngay lập tức; bộ đếm chỗ trống giảm đi 1.

#### `ST-CORE-11`: Khóa vị trí bảo trì / Đặt trước (Slot Maintenance Locking)
- **Ý nghĩa sống còn:** Tránh để xe đi vào vị trí đang bị ngập nước, sụt lún, hỏng camera hoặc chỗ dành riêng cho VIP.
- **Tiền điều kiện:** Slot B-01 đang trống.
- **Các bước:** Quản trị viên đổi trạng thái Slot B-01 thành `Bảo trì (Maintenance)`.
- **Kỳ vọng:** Slot B-01 bị loại trừ khỏi danh sách vị trí trống có thể gợi ý khi check-in; không nhân viên nào có thể xếp xe vào slot này.

---

### PHẦN IV: VÒNG ĐỜI VÉ & QUYỀN LỢI (TICKET LIFECYCLE)

#### `ST-CORE-12`: Kích hoạt & Gia hạn vé tháng
- **Ý nghĩa sống còn:** Doanh thu định kỳ của bãi xe; khách nộp tiền xong phải lập tức dùng được thẻ.
- **Tiền điều kiện:** Hợp đồng vé tháng sắp hết hạn hoặc mới đăng ký.
- **Các bước:** Nhân viên thực hiện thu tiền và bấm **Gia hạn thêm 1 tháng**.
- **Kỳ vọng:** Ngày hết hạn của vé tự động cộng thêm đúng 30 ngày / 1 tháng; xe lập tức quẹt vào/ra trơn tru không bị cảnh báo hết hạn.

#### `ST-CORE-13`: Đưa thẻ vào danh sách đen khi bị mất (Blacklist Lost Card)
- **Ý nghĩa sống còn:** Tránh kẻ nhặt được thẻ quay lại bãi lấy trộm xe của cư dân.
- **Tiền điều kiện:** Cư dân báo mất thẻ vé tháng số `CARD-999`.
- **Các bước:** Quản lý thực hiện **Khóa thẻ / Đưa vào Blacklist**.
- **Kỳ vọng:** Ngay khi thẻ `CARD-999` được quẹt tại bất kỳ cổng nào, hệ thống phát tín hiệu báo động: *"Thẻ đã bị khóa do báo mất"*, không mở barie.

---

### PHẦN V: QUẢN LÝ CA TRỰC & AN TOÀN TÀI CHÍNH (SHIFT & REVENUE AUDIT)

#### `ST-CORE-14`: Bàn giao ca trực & Đối soát dòng tiền (Shift Settlement)
- **Ý nghĩa sống còn:** Chống thất thoát tiền mặt, xác định rõ trách nhiệm tài chính của từng nhân viên trực bãi.
- **Tiền điều kiện:** Hết ca trực của Nhân viên A (8 tiếng).
- **Các bước:**
  1. Nhân viên A bấm **Kết ca / Bàn giao ca**.
  2. Hệ thống xuất bảng tóm tắt: Tổng số xe vào, tổng số xe ra, tiền mặt đã thu, chuyển khoản đã nhận.
  3. Nhân viên A đối chiếu với số tiền mặt trong ngăn kéo và ký xác nhận bàn giao cho Nhân viên B.
- **Kỳ vọng:** Số liệu doanh thu ca trực được khóa cứng, không thể sửa đổi sau khi kết ca; hiển thị rõ số tiền chênh lệch (nếu có).

---

### PHẦN VI: PHÂN QUYỀN & BẢO VỆ DỮ LIỆU (AUTH & ACCESS CONTROL)

#### `ST-CORE-15`: Phân quyền nghiêm ngặt - Chống can thiệp dữ liệu tài chính
- **Ý nghĩa sống còn:** Ngăn chặn nhân viên bãi xe tự ý xóa lịch sử xe ra vào hoặc sửa biểu phí để bỏ túi tiền vé.
- **Tiền điều kiện:** Đăng nhập bằng tài khoản Nhân viên (Staff).
- **Các bước:**
  1. Cố tình truy cập vào các chức năng cấu hình biểu phí, xóa lịch sử xe vào ra, hoặc chỉnh sửa số tiền đã thanh toán.
- **Kỳ vọng:** Các nút xóa/sửa bị ẩn hoặc hệ thống chặn với thông báo: *"Bạn không có quyền thực hiện thao tác này. Cần quyền Quản lý (Admin)"*.
