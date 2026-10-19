# SOFTWARE REQUIREMENTS SPECIFICATION (SRS)
## HỆ THỐNG QUẢN LÝ BÃI ĐẬU XE Ô TÔ
**Phiên bản: 4.1**

---

## 1. GIỚI THIỆU CHUNG

### 1.1. Mục đích

Hiện nay, nhu cầu sử dụng ô tô ngày càng tăng, dẫn đến những khó khăn trong việc quản lý hoạt động của các bãi đậu xe, chẳng hạn như kiểm soát số lượng xe ra vào, theo dõi số chỗ đỗ còn trống, quản lý thời gian xe lưu lại trong bãi và quản lý vé xe của khách hàng.

Hệ thống Quản lý Bãi đậu xe Ô tô được xây dựng nhằm hỗ trợ người quản lý và nhân viên thực hiện các nghiệp vụ quản lý bãi xe thuận tiện hơn, giảm thời gian xử lý công việc và hạn chế những sai sót trong quá trình vận hành.

Hệ thống cung cấp các chức năng quản lý nhân viên, khách hàng, thông tin phương tiện, xe vào/ra, vé xe và vị trí đỗ. Ngoài ra, hệ thống hỗ trợ thống kê doanh thu và số lượng xe theo các điều kiện thời gian, giúp người quản lý theo dõi tình hình hoạt động của bãi đậu xe.

### 1.2. Phạm vi

Hệ thống hướng đến các bãi đậu xe ô tô quy mô vừa và lớn, có nhu cầu quản lý nhiều phương tiện và nhân viên, hoặc các bãi đậu xe hoạt động độc lập.

Phạm vi chức năng của hệ thống bao gồm:

- Đăng nhập và truy cập hệ thống theo vai trò người dùng.
- Quản lý thông tin nhân viên.
- Quản lý thông tin khách hàng và các phương tiện đã đăng ký.
- Quản lý hoạt động xe vào/ra, ghi nhận thời gian và tra cứu thông tin phương tiện.
- Hiển thị bản đồ vị trí đỗ, trạng thái vị trí và số chỗ trống theo tầng.
- Quản lý vé xe, bao gồm danh sách, thêm, chỉnh sửa và xóa vé theo điều kiện nghiệp vụ.
- Quản lý vị trí đỗ xe theo tầng.
- Thống kê doanh thu theo tháng, quý, năm và thống kê số lượng xe theo điều kiện thời gian.

---

## 2. MÔ TẢ TỔNG QUAN HỆ THỐNG

### 2.1. Danh sách tác nhân (Actors)

| Tác nhân | Mô tả vai trò |
|---|---|
| **Quản lý (Manager)** | Có quyền thực hiện các chức năng quản lý của hệ thống, bao gồm quản lý nhân viên, khách hàng, xe vào/ra, vé, vị trí đỗ và thống kê. |
| **Nhân viên (Staff)** | Thực hiện các nghiệp vụ được phân quyền, bao gồm quản lý khách hàng, thông tin cá nhân và hoạt động xe vào/ra. |

Quyền truy cập cụ thể của từng tác nhân được xác định theo mô tả chức năng trong tài liệu gốc. Không mặc định rằng nhân viên có quyền thực hiện tất cả chức năng dành cho quản lý.

### 2.2. Luồng hoạt động tổng quan (System Pages Flow)

Luồng hoạt động chính của hệ thống:

```text
                 Đăng nhập
                     |
                     v
                  Trang chủ
                     |
       +-------------+-------------+
       |             |             |
       v             v             v
 Quản lý nhân   Quản lý khách   Quản lý xe
     viên          hàng           vào/ra
                                   |
                                   v
                            Bản đồ vị trí đỗ

       +-------------+-------------+
       |             |             |
       v             v             v
   Quản lý vé    Quản lý bãi     Thống kê
```

Người dùng đăng nhập để truy cập trang chủ. Các chức năng được hiển thị và cho phép sử dụng theo quyền tương ứng. Người dùng có thể đăng xuất khỏi hệ thống từ giao diện trang chủ.

---

## 3. CÁC PHÂN HỆ CHỨC NĂNG CHÍNH

### 3.1. Phân hệ đăng nhập và trang chủ

- Cho phép người dùng nhập tên đăng nhập và mật khẩu.
- Hỗ trợ chức năng ghi nhớ mật khẩu và liên kết quên mật khẩu theo mô tả trong tài liệu gốc.
- Kiểm tra thông tin đăng nhập và thông báo khi dữ liệu thiếu, không hợp lệ hoặc không khớp.
- Chuyển đến trang chủ khi đăng nhập thành công.
- Hiển thị các mục chức năng và thông báo của hệ thống.
- Cho phép người dùng đăng xuất.

### 3.2. Phân hệ quản lý nhân viên

- Hiển thị danh sách nhân viên và hỗ trợ phân trang.
- Tìm kiếm nhân viên theo các điều kiện như mã nhân viên, họ tên, ngày sinh và địa chỉ.
- Thêm mới thông tin nhân viên.
- Chỉnh sửa thông tin nhân viên.
- Xóa thông tin nhân viên sau khi xác nhận.
- Kiểm tra dữ liệu đầu vào và thông báo kết quả thao tác.

Thông tin nhân viên được mô tả trong tài liệu gồm mã nhân viên, họ tên, ngày sinh, chức vụ, giới tính, địa chỉ, email, số điện thoại và mật khẩu khi tạo hoặc chỉnh sửa thông tin liên quan.

### 3.3. Phân hệ quản lý khách hàng và phương tiện

- Hiển thị danh sách khách hàng và hỗ trợ phân trang.
- Tìm kiếm khách hàng theo mã khách hàng, họ tên, ngày sinh, số điện thoại và số CMND theo các trường tìm kiếm được mô tả.
- Xem danh sách phương tiện đã đăng ký của khách hàng.
- Thêm mới thông tin khách hàng kèm danh sách phương tiện.
- Chỉnh sửa thông tin khách hàng và phương tiện đã đăng ký.
- Xóa thông tin khách hàng sau khi xác nhận.
- Thêm hoặc xóa phương tiện trong quá trình tạo và chỉnh sửa thông tin khách hàng.

Thông tin khách hàng gồm mã khách hàng, họ tên, ngày sinh, giới tính, địa chỉ, email, số điện thoại và CMND. Thông tin phương tiện gồm mã xe, loại xe, tên xe, biển số, loại vé và ngày hết hạn vé theo các trường được mô tả trong tài liệu.

### 3.4. Phân hệ quản lý xe vào/ra

- Hiển thị thông tin xe vào và xe ra khỏi bãi.
- Tiếp nhận hình ảnh biển số xe từ camera theo mô tả của hệ thống.
- Ghi nhận thời gian xe vào và thời gian xe ra.
- Tra cứu thông tin phương tiện dựa trên biển số nhận diện được.
- Hiển thị thông tin liên quan gồm biển số, tên xe, hãng xe, loại xe, khách hàng, số điện thoại, tầng và vị trí đỗ.
- Hiển thị thời gian hiệu lực của vé.
- Lưu thông tin hoạt động xe vào/ra vào cơ sở dữ liệu.
- Thông báo khi không tìm thấy thông tin phù hợp hoặc xảy ra lỗi kết nối.

### 3.5. Phân hệ bản đồ vị trí đỗ xe

- Hiển thị sơ đồ vị trí đỗ xe theo tầng.
- Hiển thị tổng số vị trí còn trống tại tầng đang xem.
- Phân biệt vị trí trống và vị trí đang có xe bằng màu sắc theo mô tả trong tài liệu.
- Hiển thị thông tin vị trí, bao gồm kích thước dài, rộng và cao khi người dùng chọn hoặc di chuyển con trỏ đến vị trí.
- Cho phép chuyển đổi giữa các tầng.
- Hỗ trợ xem thông tin xe tại vị trí và chuyển đến chức năng đăng ký đỗ xe theo quyền được quy định.
- Thông báo khi vị trí đã có xe đăng ký và đang được sử dụng.

### 3.6. Phân hệ quản lý vé

- Hiển thị danh sách vé và các thông tin liên quan: mã vé, biển số xe, khách hàng, mã khách hàng, số điện thoại, thời gian bắt đầu và kết thúc hiệu lực, loại vé, giá vé, tầng và vị trí.
- Tìm kiếm vé theo các điều kiện được cung cấp trên giao diện.
- Thêm vé mới.
- Chỉnh sửa thông tin vé theo chức năng được mô tả.
- Xác nhận trước khi xóa vé.
- Chỉ cho phép xóa vé đã hết hạn và không được gia hạn, theo quy tắc nghiệp vụ của tài liệu gốc.
- Thông báo khi dữ liệu không hợp lệ hoặc thao tác không thể thực hiện.

### 3.7. Phân hệ thống kê

**Thống kê tổng hợp:**
- Thống kê doanh thu từ hoạt động bán vé theo tháng, quý và năm.
- Cho phép chọn kỳ thống kê.
- Hiển thị kết quả thống kê trên biểu đồ theo mô tả trong tài liệu.

**Thống kê theo ngày/tháng/năm:**
- Thống kê số lượng xe theo khoảng thời gian được lựa chọn.
- Hiển thị các biểu đồ thống kê theo những tiêu chí được mô tả, bao gồm số lượng xe theo khách hàng và theo tầng.
- Thông báo khi không thể thực hiện thống kê do dữ liệu hoặc lỗi kết nối.

### 3.8. Phân hệ quản lý bãi đỗ xe

- Hiển thị danh sách vị trí đỗ xe theo tầng.
- Cho phép lựa chọn tầng để xem các vị trí tương ứng.
- Thêm mới vị trí đỗ xe.
- Chỉnh sửa thông tin vị trí đỗ xe.
- Xem thông tin chi tiết vị trí đỗ.
- Xóa vị trí đỗ xe.
- Thông báo kết quả thao tác và lỗi dữ liệu khi phát sinh.

Thông tin vị trí đỗ được quản lý theo các trường và biểu mẫu được mô tả trong tài liệu gốc. Các thuộc tính chi tiết cần căn cứ vào từng màn hình của mục 4.8 để triển khai chính xác.

---

## 4. YÊU CẦU PHI CHỨC NĂNG

### 4.1. Khả năng sử dụng

Giao diện cần thể hiện rõ các chức năng quản lý, danh sách dữ liệu, biểu mẫu nhập liệu, thông báo và thao tác xác nhận. Các chức năng tìm kiếm, phân trang và xem chi tiết cần hoạt động theo mô tả của từng màn hình.

### 4.2. Kiểm tra tính hợp lệ của dữ liệu

- Hệ thống cần kiểm tra dữ liệu đầu vào theo yêu cầu của từng trường.
- Khi dữ liệu không hợp lệ, hệ thống phải thông báo để người dùng biết trường dữ liệu cần điều chỉnh.
- Các thao tác thêm, sửa và xóa cần thông báo kết quả thực hiện.

### 4.3. Tính toàn vẹn dữ liệu

- Dữ liệu nhân viên, khách hàng, phương tiện, vé và vị trí đỗ cần được cập nhật nhất quán với kết quả thao tác.
- Hệ thống cần xử lý các trường hợp dữ liệu không còn tồn tại hoặc đã được người dùng khác cập nhật, xóa theo các tình huống được mô tả trong tài liệu.
- Việc ghi nhận xe vào/ra và trạng thái vị trí đỗ cần phản ánh đúng dữ liệu đã được hệ thống lưu.

### 4.4. Xử lý lỗi

- Hệ thống cần thông báo khi xảy ra lỗi kết nối máy chủ hoặc cơ sở dữ liệu.
- Khi tìm kiếm không có kết quả, hệ thống cần hiển thị thông báo phù hợp.
- Khi thao tác thất bại, hệ thống cần thông báo kết quả và không hiển thị thao tác đó như đã thành công.

### 4.5. Phân quyền truy cập

- Chức năng quản lý nhân viên được quy định dành cho tác nhân Quản lý.
- Nhân viên chỉ được thực hiện các chức năng được mô tả cho vai trò của mình.
- Các chức năng có giới hạn quyền, chẳng hạn xem thông tin xe tại vị trí đỗ, cần tuân theo mô tả phân quyền của tài liệu gốc.

**Lưu ý:** Tài liệu gốc có mục “Đặc tả phi chức năng” riêng, nhưng các tiêu chí định lượng như thời gian phản hồi, số lượng người dùng đồng thời, thời gian khôi phục và yêu cầu bảo mật cụ thể chưa được xác lập trong bản tổng quan này. Các tiêu chí đó cần được bổ sung khi có yêu cầu được thống nhất, không nên tự đặt thành cam kết của phiên bản 4.1.

---

## 5. TÀI LIỆU THAM KHẢO

- *Hệ thống Quản lý Bãi đậu xe Ô tô – Đặc tả yêu cầu phần mềm (SRS), Version 4.1*, Đà Nẵng, tháng 05/2022.

