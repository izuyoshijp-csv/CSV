# Import/Export - Kế Hoạch Thực Thi Phần 3 Cho Người Non-Tech

Tài liệu này mô tả mục tiêu mới của **phần 3: `CSV作成`**.

Phần 2 đã tạo xong `マッピング`. Trong Mapping, người dùng đã khai báo rõ từng cột CSV sẽ lấy dữ liệu từ đâu:

- Lấy từ ô/cột trong file Excel đơn hàng import.
- Lấy bằng cách đối chiếu Master Data.
- Lấy giá trị cố định.
- Lấy bằng công thức hoặc xử lý đơn giản.
- Để trống nếu cột đó chưa cần xuất dữ liệu.
- Áp dụng định dạng dữ liệu: giữ nguyên định dạng gốc, lấy số ký tự, định dạng ngày/số/text, hoặc các định dạng khác đã được cấu hình trong danh sách format.

Vì vậy, mục tiêu của phần 3 là:

> Người dùng chọn một Mapping đã tạo, import file Excel theo Mapping đó, hệ thống hiển thị ngay dữ liệu theo đúng thứ tự file CSV thật, cảnh báo dữ liệu thiếu/lỗi, cho sửa trực tiếp trên bảng giống Excel, xem bảng ở chế độ gần full màn hình, sau đó export file CSV đúng format.

Nếu có bao nhiêu Mapping đã tạo, thì hệ thống có bấy nhiêu kiểu import/export tương ứng.

Không cần tạo `Import Batch`, không cần màn hình chi tiết batch, không cần lưu lịch sử batch và không cần lưu lịch sử export.

## 1. Mục Tiêu Của Phần 3

Phần 3 cần làm được các việc sau:

1. Người dùng mở màn hình `CSV作成`.
2. Người dùng chọn Mapping muốn dùng.
3. Người dùng upload file Excel đơn hàng.
4. Hệ thống đọc file Excel theo đúng Mapping đã chọn.
5. Hệ thống tạo dữ liệu CSV theo từng cột đã cấu hình trong Mapping.
6. Hệ thống áp dụng đúng định dạng dữ liệu đã khai báo trong Mapping.
7. Màn hình hiển thị ngay bảng dữ liệu theo đúng thứ tự cột của file CSV thật.
8. Hệ thống hiển thị cảnh báo dữ liệu thiếu/lỗi ngay trên màn hình.
9. Người dùng có thể sửa trực tiếp bất kỳ ô nào trong bảng, giống thao tác trên Excel.
10. Người dùng có thể mở bảng ở chế độ lớn gần full màn hình để dễ xem nhiều cột.
11. Người dùng có thể lưu sửa đổi hoặc bỏ sửa đổi.
12. Người dùng export file CSV đúng format, không bị lỗi nhảy cột/nhảy dòng do dấu cách, xuống dòng, dấu phẩy, chấm phẩy hoặc dấu nháy.

Người dùng cuối là người Nhật, nên toàn bộ text trên giao diện phải dùng tiếng Nhật: tiêu đề, button, label, alert, confirm, tooltip, validation message.

## 2. Nguyên Tắc Chính

Phần 3 phải đi theo các nguyên tắc này:

- Mapping là trung tâm của toàn bộ import/export.
- Không hard-code logic cột CSV trong màn hình Import/Export.
- Không hard-code format CSV trong màn hình Import/Export.
- Không tạo Import Batch.
- Không tạo màn hình chi tiết Batch.
- Không lưu lịch sử Batch.
- Không lưu lịch sử Export.
- Mỗi Mapping tương ứng với một kiểu import/export.
- Import xong phải hiển thị ngay bảng CSV thật trên màn hình hiện tại.
- Preview/bảng dữ liệu phải đủ lớn để xem nhiều cột.
- Người dùng được sửa trực tiếp trên bảng trước khi export.
- Người dùng có thể chuyển giữa chế độ xem giản lược và xem đầy đủ cột CSV.
- Chế độ xem giản lược sẽ ẩn các cột đã được tick `簡易表示で非表示` trong từng dòng Mapping.
- Khi người dùng đã chọn chế độ xem giản lược hoặc xem đầy đủ, chế độ đó phải áp dụng cho tất cả bảng/preview trong cùng phiên xử lý hiện tại.
- Nếu một cột trong Mapping được cấu hình là để trống, export phải để trống đúng cột đó.
- Nếu một cột trong Mapping lấy từ Master Data nhưng không tìm thấy, màn hình phải cảnh báo rõ.
- Nếu một cột trong Mapping có format riêng, bảng preview và export phải áp dụng đúng format đó.
- Dữ liệu có ký tự xuống dòng phải được thay bằng khoảng trắng trước khi hiển thị/export CSV.

## 3. Điều Kiện Cần Có Trước Khi Làm Phần 3

Trước khi làm phần 3, cần kiểm tra:

- Đã có màn hình `マッピング`.
- Đã có ít nhất một Mapping hợp lệ.
- Mapping có `明細開始行` tương ứng `startDetailRow`.
- Mapping có `有効行判定列` tương ứng `validRowColumn`.
- Mapping có danh sách cột CSV cần xuất.
- Mỗi cột CSV trong Mapping có cấu hình cách lấy dữ liệu.
- Mỗi cột CSV có thể có cấu hình format dữ liệu.
- Mỗi dòng Mapping có thể có cấu hình `簡易表示で非表示` để quyết định cột đó có bị ẩn khi người dùng chọn chế độ xem giản lược hay không.
- Nếu cột cần lookup Master Data, Mapping phải chỉ rõ lookup từ collection nào, field nào và lấy field nào.
- Sidebar hoặc navigation đã có mục `CSV作成`.

Nếu Mapping thiếu thông tin bắt buộc, hệ thống không được import/export bằng Mapping đó.

## 4. Các Phần Việc Cần Làm Trong Phần 3

### 4.1. Màn Hình Chọn Mapping Và Upload Excel

Mục tiêu: người dùng chọn kiểu import/export trước khi upload file.

Cần làm:

- Tạo màn hình chính trong mục `CSV作成`.
- Hiển thị danh sách Mapping đang có.
- Chỉ cho chọn Mapping hợp lệ.
- Nếu Mapping đang lỗi hoặc thiếu thông tin, hiển thị trạng thái lỗi và không cho dùng.
- Cho upload một hoặc nhiều file Excel đơn hàng.
- Tối thiểu hỗ trợ `.xlsx`; nếu được thì hỗ trợ thêm `.xls` và `.xlsm`.
- Trước khi import, hệ thống kiểm tra lại Mapping đã chọn.

Kết quả mong muốn:

- Người dùng hiểu rõ đang dùng Mapping nào để import/export.
- Nếu có 5 Mapping, người dùng có thể chọn 1 trong 5 kiểu import/export.

### 4.2. Đọc Excel Theo Mapping

Mục tiêu: hệ thống đọc file Excel dựa trên cấu hình, không dựa trên code hard-code.

Cần làm:

- Đọc workbook Excel được upload.
- Đọc các sheet hợp lệ.
- Bỏ qua sheet ẩn nếu thư viện đọc Excel hỗ trợ.
- Đọc dòng chi tiết bắt đầu từ `明細開始行`.
- Chỉ lấy dòng hợp lệ theo `有効行判定列`.
- Với từng cột CSV trong Mapping, hệ thống lấy dữ liệu theo cấu hình:
  - từ ô cố định trong Excel,
  - từ cột chi tiết trong Excel,
  - từ giá trị cố định,
  - từ Master Data lookup,
  - từ công thức,
  - từ dữ liệu nhập tay nếu Mapping có,
  - hoặc để trống.
- Nếu một giá trị không lấy được, hệ thống ghi nhận là dữ liệu thiếu để cảnh báo trên màn hình.

Thứ tự xử lý bắt buộc khi tạo dữ liệu CSV:

1. Đọc trước tất cả dữ liệu lấy trực tiếp từ file Excel nguồn.
2. Điền các giá trị cố định, giá trị nhập tay hoặc giá trị để trống theo Mapping.
3. Sau khi đã có dữ liệu nguồn từ Excel trong bảng CSV tạm, mới lookup Master Data.
4. Sau khi lookup Master Data xong, mới tính các cột công thức cộng/trừ/nhân/chia.
5. Cuối cùng mới áp dụng format dữ liệu và xử lý ký tự đặc biệt để hiển thị/export.

Lý do: nhiều cột lookup cần dùng giá trị đã lấy từ file Excel làm khóa đối chiếu, và nhiều cột công thức cần dùng kết quả của cột Excel hoặc cột lookup. Nếu lookup hoặc công thức chạy quá sớm, dữ liệu CSV có thể bị sai hoặc bị trống không đúng.

Kết quả mong muốn:

- Một file Excel có thể được import theo nhiều kiểu khác nhau nếu chọn Mapping khác nhau.
- Khi form Excel thay đổi, người dùng chỉ sửa Mapping, không cần sửa code.

### 4.3. Áp Dụng Format Theo Mapping

Mục tiêu: dữ liệu CSV xuất ra phải đúng định dạng đã cấu hình.

Cần làm:

- Đọc cấu hình format của từng cột CSV trong Mapping.
- Áp dụng format trước khi hiển thị bảng và trước khi export.
- Hỗ trợ các kiểu format đã có trong phần Mapping, ví dụ:
  - giữ nguyên giá trị gốc,
  - text,
  - number,
  - number bỏ phần thập phân và không làm tròn, ví dụ `123.67` thành `123`,
  - date,
  - `yyyymmdd`,
  - lấy số ký tự bên trái/phải,
  - cắt khoảng trắng đầu/cuối nếu Mapping yêu cầu,
  - để trống,
  - các format khác đã được cấu hình trong danh sách format.
- Nếu format thất bại, màn hình phải chỉ rõ cột nào, dòng nào, giá trị gốc là gì.
- Dữ liệu có xuống dòng phải được thay bằng khoảng trắng để không làm hỏng CSV.

Kết quả mong muốn:

- Người dùng nhìn bảng thấy đúng dữ liệu sẽ được export.
- Export không tự ý đổi định dạng ngoài Mapping.
- Không còn lỗi dữ liệu xuống dòng làm nhảy dòng trong CSV.

### 4.4. Hiển Thị Bảng CSV Ngay Sau Khi Import

Mục tiêu: import xong người dùng thấy ngay dữ liệu giống file CSV thật.

Cần làm:

- Sau khi import file Excel nguồn, màn hình hiển thị ngay bảng dữ liệu CSV.
- Bảng phải hiển thị theo đúng thứ tự cột như file CSV thật.
- Header cột lấy theo Mapping.
- Giá trị trong bảng là giá trị đã xử lý theo Mapping và đã áp dụng format.
- Có button chuyển sang chế độ xem giản lược, ví dụ `簡易表示`.
- Có button chuyển sang chế độ xem đầy đủ, ví dụ `全項目表示`.
- Chế độ `全項目表示` hiển thị toàn bộ cột CSV theo Mapping.
- Chế độ `簡易表示` ẩn các cột đã được tick `簡易表示で非表示` trong Mapping.
- Chế độ hiển thị đang chọn phải được giữ nguyên khi người dùng chuyển giữa màn hình chính, preview khung lớn và chế độ xem lớn gần full màn hình trong cùng phiên xử lý.
- Cột cấu hình để trống thì hiển thị trống.
- Ô thiếu dữ liệu phải được highlight.
- Ô lỗi format phải được highlight.
- Cảnh báo tổng quan phải hiện ngay trên màn hình, ví dụ:
  - tổng số dòng có lỗi,
  - tổng số ô thiếu,
  - tổng số lỗi lookup Master Data,
  - tổng số lỗi format.
- Bảng phải có cuộn ngang và cuộn dọc rõ ràng vì CSV có nhiều cột.
- Kích thước preview mặc định phải là khung lớn, ưu tiên diện tích cho bảng.

Kết quả mong muốn:

- Người dùng không phải mở màn hình chi tiết batch.
- Import xong là thấy ngay dữ liệu CSV sẽ export.

### 4.5. Chế Độ Xem Bảng Lớn Gần Full Màn Hình

Mục tiêu: người dùng xem và sửa bảng CSV nhiều cột dễ hơn.

Cần làm:

- Có button mở chế độ xem bảng lớn, ví dụ tiếng Nhật có thể là `全画面表示`.
- Khi click, bảng mở ở chế độ gần full màn hình.
- Chế độ này vẫn phải nhìn được các thanh công cụ trên window/trình duyệt, không bắt buộc dùng browser fullscreen thật.
- Toolbar của màn hình vẫn có các nút chính:
  - xem giản lược,
  - xem đầy đủ,
  - lưu sửa đổi,
  - bỏ sửa đổi,
  - đóng chế độ xem lớn,
  - export nếu đủ điều kiện.
- Có button đóng chế độ xem lớn, ví dụ `閉じる`.
- Khi đóng chế độ xem lớn, dữ liệu sửa tạm thời không được mất.
- Khi đóng/mở chế độ xem lớn, trạng thái xem giản lược hoặc xem đầy đủ không được mất.
- Nếu có sửa đổi chưa lưu, khi đóng hoặc export phải cảnh báo người dùng.

Kết quả mong muốn:

- Người dùng xem được nhiều cột CSV mà không bị bí không gian.
- Vẫn thao tác được các nút quan trọng khi đang xem bảng lớn.

### 4.6. Sửa Trực Tiếp Trên Bảng Giống Excel

Mục tiêu: người dùng có thể chỉnh dữ liệu trước khi export mà không phải quay lại file Excel nguồn.

Cần làm:

- Cho phép sửa trực tiếp bất kỳ ô nào trong bảng.
- Giao diện sửa giống Excel: click vào ô, nhập giá trị, rời ô thì giữ giá trị tạm.
- Hỗ trợ copy/paste nếu làm được.
- Hỗ trợ di chuyển bằng bàn phím nếu làm được.
- Ô đã sửa nên có trạng thái khác để người dùng biết đã thay đổi.
- Khi sửa một ô, hệ thống nên validation lại ô đó hoặc đánh dấu cần validation lại.
- Có button lưu sửa đổi, ví dụ `保存`.
- Có button bỏ sửa đổi, ví dụ `変更を破棄`.
- Nếu bấm lưu, dữ liệu đang sửa trở thành dữ liệu dùng để export.
- Nếu bấm bỏ, dữ liệu quay về kết quả import/xử lý gần nhất.
- Nếu người dùng export khi còn sửa đổi chưa lưu, hệ thống phải hỏi xác nhận hoặc yêu cầu lưu trước.

Kết quả mong muốn:

- Người dùng có thể sửa dữ liệu CSV trực tiếp như đang làm trên Excel.
- Người dùng kiểm soát rõ lúc nào lưu và lúc nào bỏ thay đổi.

### 4.7. Kiểm Tra Dữ Liệu Thiếu Theo Mapping

Mục tiêu: hệ thống chỉ rõ cột nào không có dữ liệu và vì sao.

Cần làm:

- Kiểm tra các cột bắt buộc theo Mapping.
- Kiểm tra lookup Master Data không tìm thấy.
- Kiểm tra format không áp dụng được.
- Kiểm tra dữ liệu nguồn từ Excel bị trống.
- Kiểm tra công thức không tính được.
- Kiểm tra giá trị sau format bị rỗng nếu cột đó bắt buộc.
- Không báo lỗi cho cột đã được Mapping cấu hình là để trống.
- Sau khi người dùng sửa trực tiếp trên bảng, cảnh báo phải được cập nhật lại.

Mỗi lỗi cần có:

- Dòng dữ liệu.
- Cột CSV.
- Tên cột CSV nếu có.
- Mapping entry liên quan.
- Giá trị nguồn hoặc giá trị đang nhập.
- Lý do lỗi.
- Gợi ý xử lý.
- Nếu liên quan Master Data, nêu rõ cần bổ sung collection nào.

Kết quả mong muốn:

- Người dùng không phải đoán dữ liệu thiếu ở đâu.
- Người dùng biết cần sửa file nguồn, sửa Mapping, bổ sung Master Data hoặc sửa trực tiếp trên bảng.

### 4.8. Gợi Ý Người Dùng Nhập Thêm Hoặc Bổ Sung Master Data

Mục tiêu: giúp người dùng xử lý dữ liệu thiếu ngay trên màn hình.

Cần làm:

- Hiển thị danh sách dữ liệu thiếu theo nhóm.
- Nhóm theo Master Data cần bổ sung nếu lỗi do lookup.
- Nhóm theo cột CSV nếu lỗi do dữ liệu nguồn/format.
- Gợi ý thao tác:
  - bổ sung Master Data,
  - sửa trực tiếp trên bảng,
  - sửa Mapping,
  - sửa file Excel nguồn rồi import lại,
  - nhập thêm giá trị nếu Mapping cho phép nhập tay,
  - hoặc chấp nhận export với ô trống.
- Nếu lỗi có thể tạo Master Data mới, cho mở form thêm nhanh.
- Sau khi bổ sung hoặc sửa trực tiếp, cho người dùng chạy lại kiểm tra dữ liệu.

Kết quả mong muốn:

- Người dùng non-tech có thể đi theo gợi ý thay vì tự đọc code hoặc tự dò Excel.

### 4.9. Preview CSV Dạng Khung Lớn

Mục tiêu: tất cả phần preview CSV phải đủ lớn để dễ nhìn.

Cần làm:

- Preview chính là bảng CSV đang hiển thị trên màn hình.
- Khung preview mặc định phải rộng và cao, ưu tiên diện tích cho table.
- Có chế độ xem lớn gần full màn hình như mục 4.5.
- Preview cũng phải có nút `簡易表示` và `全項目表示`.
- Nếu người dùng đã chọn `簡易表示` ở màn hình chính, preview cũng phải mở ở `簡易表示`.
- Nếu người dùng đã chọn `全項目表示` ở màn hình chính, preview cũng phải mở ở `全項目表示`.
- Khi đổi chế độ hiển thị trong preview, màn hình chính cũng phải dùng lại chế độ đó khi quay về.
- Preview phải hiển thị đúng các cột CSV theo Mapping.
- Thứ tự cột theo cấu hình Mapping.
- Giá trị hiển thị là giá trị sau khi đã áp dụng format và sau khi người dùng sửa/lưu nếu có.
- Cột được Mapping cấu hình để trống thì hiển thị trống.
- Ô thiếu dữ liệu hoặc lỗi format phải được highlight.
- Có bộ lọc để xem dòng có lỗi/dòng thiếu dữ liệu nếu làm được.
- Có cảnh báo nếu CSV còn thiếu dữ liệu.

Kết quả mong muốn:

- Người dùng nhìn preview là biết file tải xuống sẽ như thế nào.
- Không có preview nhỏ khó nhìn cho file nhiều cột.

### 4.10. Export CSV Đúng Chuẩn

Mục tiêu: tạo file CSV đúng format và không bị lỗi khi mở bằng Excel hoặc hệ thống nhận CSV.

Cần làm:

- Export từ dữ liệu đang hiển thị/lưu trên bảng.
- Export đúng các cột trong Mapping.
- Export luôn xuất đầy đủ các cột theo Mapping, kể cả các cột đang bị ẩn trong chế độ xem giản lược.
- Giữ đúng thứ tự cột trong Mapping.
- Áp dụng đúng format đã cấu hình trong Mapping.
- Nếu hệ thống cần UTF-8 có BOM thì xuất UTF-8 BOM.
- Trước khi export, thay mọi ký tự xuống dòng trong dữ liệu bằng khoảng trắng.
- Escape CSV đúng chuẩn:
  - dữ liệu có dấu phẩy phải không làm nhảy cột,
  - dữ liệu có chấm phẩy phải không làm sai cột,
  - dữ liệu có dấu nháy kép phải được xử lý đúng,
  - dữ liệu có khoảng trắng đầu/cuối phải xử lý theo Mapping, không tự ý làm mất nếu Mapping yêu cầu giữ nguyên.
- Không nối chuỗi CSV thủ công kiểu đơn giản nếu có thể dùng helper/parser chuẩn.
- Nếu còn dữ liệu thiếu, hiển thị confirm tiếng Nhật trước khi export.
- Nếu người dùng xác nhận, vẫn cho export và để trống đúng các ô thiếu.
- Không lưu lịch sử export.

Kết quả mong muốn:

- CSV không bị lỗi dấu cách, xuống dòng, dấu phẩy, chấm phẩy, dấu nháy làm nhảy dòng hoặc nhảy cột.
- Dữ liệu có xuống dòng trong Excel nguồn sẽ được thay bằng khoảng trắng trong CSV.

## 5. Quyền Người Dùng Trong Phần 3

Gợi ý quyền thao tác:

- `Admin`: được import, kiểm tra dữ liệu, bổ sung Master Data, sửa trực tiếp trên bảng, lưu/bỏ sửa, preview, export.
- `Operator`: được import, kiểm tra dữ liệu, bổ sung Master Data nếu hệ thống cho phép, sửa trực tiếp trên bảng, lưu/bỏ sửa, preview, export.
- `Viewer`: chỉ xem dữ liệu và cảnh báo; không được import/export/sửa nếu có phân quyền Viewer.

Riêng phần Mapping đã thống nhất: `Admin` và `Operator` có quyền như nhau trong phạm vi Mapping.

## 6. Những Điểm Không Làm Lẫn Với Phần Mapping

Mapping là nơi cấu hình. Phần 3 là nơi dùng cấu hình đó để xử lý file thật.

Không đưa vào màn hình Mapping:

- Upload file Excel đơn hàng thật.
- Hiển thị bảng CSV thật sau import.
- Sửa trực tiếp dữ liệu CSV thật.
- Preview CSV thật.
- Export CSV thật.

Không đưa vào phần Import/Export:

- Editor chỉnh Mapping phức tạp.
- Logic hard-code riêng cho từng cột CSV.
- Logic format nằm rải rác trong UI.
- Lịch sử batch.
- Lịch sử export.

## 7. User Stories Phần 3

### User Story 3.1 - Chọn Mapping Để Import Excel

Là nhân viên vận hành, tôi muốn chọn một Mapping trước khi upload file Excel, để hệ thống biết phải đọc file đơn hàng và tạo CSV theo kiểu nào.

Acceptance criteria:

- Người dùng mở màn hình `CSV作成`.
- Người dùng thấy danh sách Mapping hợp lệ.
- Người dùng chọn được một Mapping.
- Mapping lỗi hoặc thiếu thông tin bắt buộc không được dùng để import.
- Nếu chưa chọn Mapping, hệ thống không cho import và báo lỗi bằng tiếng Nhật.

### User Story 3.2 - Upload File Excel Và Tạo Bảng CSV Ngay

Là nhân viên vận hành, tôi muốn upload file Excel đơn hàng và thấy ngay bảng CSV trên màn hình, để kiểm tra dữ liệu trước khi export.

Acceptance criteria:

- Upload được file Excel theo định dạng hệ thống hỗ trợ.
- Hệ thống đọc file theo Mapping đã chọn.
- Bảng CSV hiện ngay sau khi import.
- Cột hiển thị đúng thứ tự như file CSV thật.
- Dữ liệu đã được áp dụng format theo Mapping.
- Không tạo Import Batch và không mở màn hình chi tiết batch.

### User Story 3.3 - Xem Cảnh Báo Dữ Liệu Thiếu/Lỗi

Là nhân viên vận hành, tôi muốn thấy cảnh báo dữ liệu thiếu hoặc lỗi ngay trên màn hình, để biết cần sửa gì trước khi export.

Acceptance criteria:

- Màn hình hiển thị tổng số lỗi/tổng số ô thiếu nếu có.
- Ô thiếu dữ liệu được highlight.
- Ô lỗi format được highlight.
- Lỗi cho biết dòng nào, cột nào, lý do lỗi.
- Nếu lỗi do thiếu Master Data, hệ thống gợi ý danh mục cần bổ sung.
- Nếu lỗi do Mapping hoặc file nguồn, hệ thống gợi ý sửa Mapping hoặc file nguồn.

### User Story 3.4 - Chuyển Giữa Xem Giản Lược Và Xem Đầy Đủ

Là nhân viên vận hành, tôi muốn chuyển giữa chế độ xem giản lược và xem đầy đủ, để dễ nhìn file CSV có nhiều cột nhưng vẫn có thể kiểm tra toàn bộ khi cần.

Acceptance criteria:

- Có nút `簡易表示`.
- Có nút `全項目表示`.
- Khi bấm `簡易表示`, hệ thống ẩn các cột đã tick `簡易表示で非表示` trong Mapping.
- Khi bấm `全項目表示`, hệ thống hiển thị lại toàn bộ cột CSV.
- Chế độ đã chọn áp dụng cho màn hình chính, preview khung lớn và chế độ xem lớn gần full màn hình trong cùng phiên xử lý.
- Export CSV vẫn xuất đầy đủ tất cả cột theo Mapping, kể cả cột đang bị ẩn khi xem giản lược.

### User Story 3.5 - Xem Bảng CSV Ở Khung Lớn

Là nhân viên vận hành, tôi muốn mở bảng CSV ở chế độ lớn gần full màn hình, để xem và sửa file nhiều cột dễ hơn.

Acceptance criteria:

- Có nút mở chế độ xem lớn, ví dụ `全画面表示`.
- Bảng mở ở khung lớn gần full màn hình.
- Vẫn nhìn được toolbar/window, không bắt buộc dùng browser fullscreen thật.
- Trong chế độ xem lớn vẫn có nút lưu sửa đổi, bỏ sửa đổi, đóng chế độ xem lớn, xem giản lược/xem đầy đủ và export.
- Đóng chế độ xem lớn không làm mất dữ liệu đang sửa.

### User Story 3.6 - Sửa Trực Tiếp Trên Bảng CSV

Là nhân viên vận hành, tôi muốn sửa trực tiếp bất kỳ ô nào trong bảng CSV giống Excel, để chỉnh dữ liệu nhanh trước khi export.

Acceptance criteria:

- Người dùng click vào ô và sửa được giá trị.
- Ô đã sửa được đánh dấu để dễ nhận biết.
- Có nút `保存` để lưu sửa đổi.
- Có nút `変更を破棄` để bỏ sửa đổi.
- Nếu lưu, dữ liệu đã sửa được dùng để export.
- Nếu bỏ sửa đổi, dữ liệu quay về kết quả xử lý gần nhất.
- Nếu export khi còn sửa đổi chưa lưu, hệ thống phải cảnh báo hoặc yêu cầu lưu trước.

### User Story 3.7 - Thay Xuống Dòng Bằng Khoảng Trắng

Là nhân viên vận hành, tôi muốn dữ liệu có xuống dòng được tự động thay bằng khoảng trắng, để file CSV không bị nhảy dòng khi export.

Acceptance criteria:

- Dữ liệu nguồn có xuống dòng được thay bằng khoảng trắng khi hiển thị/export.
- CSV export không bị tách sai dòng vì dữ liệu có xuống dòng.
- Việc thay xuống dòng không làm mất các dữ liệu khác trong ô.

### User Story 3.8 - Bổ Sung Master Data Từ Cảnh Báo

Là nhân viên vận hành, tôi muốn từ lỗi thiếu Master Data có thể biết cần bổ sung danh mục nào, để hoàn thiện dữ liệu CSV.

Acceptance criteria:

- Lỗi lookup cho biết thiếu dữ liệu ở danh mục nào.
- Màn hình hiển thị giá trị nguồn gây lỗi.
- Nếu có chức năng thêm nhanh Master Data, form thêm nhanh được điền sẵn giá trị nguồn.
- Sau khi bổ sung, người dùng có thể chạy lại kiểm tra dữ liệu hiện tại.

### User Story 3.9 - Export CSV Đúng Format

Là nhân viên vận hành, tôi muốn export CSV đúng format theo Mapping, để file có thể dùng cho hệ thống nhận CSV.

Acceptance criteria:

- Export đúng cột và đúng thứ tự cột theo Mapping.
- Export đầy đủ cột dù đang xem giản lược.
- Format từng cột đúng theo Mapping.
- Dữ liệu có dấu phẩy, chấm phẩy, dấu nháy kép không làm nhảy cột.
- Dữ liệu có xuống dòng đã được thay bằng khoảng trắng.
- Nếu còn dữ liệu thiếu, hệ thống hiển thị confirm trước khi export.
- Không lưu lịch sử export.

## 8. Use Cases Phần 3

### Use Case 3.1 - Import Excel Theo Mapping

| Mục | Nội dung |
| --- | --- |
| Actor | Nhân viên vận hành |
| Trigger | Người dùng mở `CSV作成` và muốn tạo CSV từ file Excel đơn hàng |
| Precondition | Có ít nhất một Mapping hợp lệ |
| Main flow | Chọn Mapping -> upload file Excel -> hệ thống kiểm tra Mapping -> đọc dữ liệu trực tiếp từ Excel -> lookup Master Data -> tính công thức -> áp dụng format -> hiển thị bảng CSV |
| Alternative flow | Mapping lỗi hoặc thiếu `明細開始行`/`有効行判定列` thì báo lỗi tiếng Nhật và dừng import |
| Postcondition | Bảng CSV hiện trên màn hình, chưa cần lưu batch |

### Use Case 3.2 - Hiển Thị Cảnh Báo Sau Import

| Mục | Nội dung |
| --- | --- |
| Actor | Nhân viên vận hành |
| Trigger | Hệ thống tạo xong bảng CSV sau import |
| Precondition | Đã có dữ liệu CSV hiện tại |
| Main flow | Hệ thống kiểm tra dữ liệu -> highlight ô lỗi/thiếu -> hiển thị tổng số lỗi -> hiển thị danh sách gợi ý xử lý |
| Alternative flow | Nếu không có lỗi, hiển thị trạng thái dữ liệu đã đủ |
| Postcondition | Người dùng biết cần sửa bảng, bổ sung Master Data, sửa Mapping, sửa file nguồn hoặc export luôn |

### Use Case 3.3 - Chuyển Chế Độ Xem Giản Lược/Đầy Đủ

| Mục | Nội dung |
| --- | --- |
| Actor | Nhân viên vận hành |
| Trigger | Người dùng bấm `簡易表示` hoặc `全項目表示` |
| Precondition | Bảng CSV đã được hiển thị |
| Main flow | Bấm `簡易表示` -> hệ thống đọc `hideInCompactView` từ Mapping -> ẩn cột đã tick -> giữ chế độ này cho preview và chế độ xem lớn |
| Alternative flow | Bấm `全項目表示` -> hệ thống hiển thị toàn bộ cột CSV |
| Postcondition | Chế độ hiển thị hiện tại được áp dụng đồng nhất trong phiên xử lý |

### Use Case 3.4 - Sửa Trực Tiếp Dữ Liệu CSV

| Mục | Nội dung |
| --- | --- |
| Actor | Nhân viên vận hành |
| Trigger | Người dùng click vào một ô trong bảng CSV |
| Precondition | Bảng CSV đã được hiển thị |
| Main flow | Click ô -> nhập giá trị mới -> ô được đánh dấu đã sửa -> bấm `保存` -> dữ liệu sửa được dùng để export |
| Alternative flow | Bấm `変更を破棄` -> dữ liệu quay về kết quả xử lý gần nhất |
| Postcondition | Dữ liệu hiện tại phản ánh lựa chọn lưu/bỏ sửa của người dùng |

### Use Case 3.5 - Mở Và Đóng Chế Độ Xem Lớn

| Mục | Nội dung |
| --- | --- |
| Actor | Nhân viên vận hành |
| Trigger | Người dùng bấm `全画面表示` |
| Precondition | Bảng CSV đã được hiển thị |
| Main flow | Bấm `全画面表示` -> bảng mở khung lớn gần full màn hình -> người dùng xem/sửa dữ liệu -> bấm đóng |
| Alternative flow | Nếu có sửa đổi chưa lưu khi đóng, hệ thống cảnh báo |
| Postcondition | Quay lại màn hình chính, dữ liệu đang sửa không bị mất |

### Use Case 3.6 - Bổ Sung Master Data Từ Lỗi

| Mục | Nội dung |
| --- | --- |
| Actor | Nhân viên vận hành |
| Trigger | Người dùng thấy lỗi thiếu Master Data |
| Precondition | Validation issue có `missingMasterDataType` |
| Main flow | Mở lỗi -> xem danh mục cần bổ sung -> mở form thêm nhanh nếu có -> lưu Master Data -> chạy lại kiểm tra |
| Alternative flow | Nếu người dùng chưa bổ sung, vẫn có thể export với ô thiếu để trống sau khi xác nhận |
| Postcondition | Lỗi giảm hoặc được cập nhật lại theo dữ liệu mới |

### Use Case 3.7 - Export CSV

| Mục | Nội dung |
| --- | --- |
| Actor | Nhân viên vận hành |
| Trigger | Người dùng bấm Export |
| Precondition | Có dữ liệu CSV hiện tại |
| Main flow | Hệ thống kiểm tra sửa đổi chưa lưu -> kiểm tra lỗi còn lại -> thay xuống dòng bằng khoảng trắng -> export đủ cột theo Mapping -> tải file CSV |
| Alternative flow | Nếu còn lỗi/thiếu dữ liệu, hệ thống hiển thị confirm; người dùng có thể hủy hoặc xác nhận export |
| Postcondition | File CSV được tải xuống; không ghi lịch sử export |

### Use Case 3.8 - Export Khi Đang Xem Giản Lược

| Mục | Nội dung |
| --- | --- |
| Actor | Nhân viên vận hành |
| Trigger | Người dùng đang ở `簡易表示` và bấm Export |
| Precondition | Một số cột đang bị ẩn theo `hideInCompactView` |
| Main flow | Người dùng bấm Export -> hệ thống export từ dữ liệu đầy đủ theo Mapping, không chỉ các cột đang hiển thị |
| Alternative flow | Nếu còn dữ liệu thiếu ở cột đang bị ẩn, hệ thống vẫn phải cảnh báo |
| Postcondition | CSV export có đầy đủ cột theo Mapping |

## 9. Thứ Tự Nên Làm

Thứ tự khuyến nghị:

1. Tạo route/màn hình chính `CSV作成`.
2. Tạo màn hình chọn Mapping và upload Excel.
3. Đọc Excel theo Mapping.
4. Tạo dữ liệu CSV tạm thời bằng dữ liệu lấy trực tiếp từ Excel trước.
5. Lookup Master Data sau khi dữ liệu nguồn từ Excel đã có đủ trong bảng tạm.
6. Tính các cột công thức sau khi lookup Master Data xong.
7. Áp dụng format theo Mapping.
8. Chuẩn hóa dữ liệu xuống dòng thành khoảng trắng.
9. Hiển thị bảng CSV lớn ngay sau import.
10. Hiển thị cảnh báo dữ liệu thiếu/lỗi trên màn hình.
11. Tạo nút `簡易表示` và `全項目表示`.
12. Liên kết chế độ `簡易表示` với cấu hình `簡易表示で非表示` trong Mapping.
13. Cho sửa trực tiếp trên bảng.
14. Tạo nút lưu sửa đổi và bỏ sửa đổi.
15. Tạo chế độ xem bảng lớn gần full màn hình.
16. Tạo validation dữ liệu thiếu theo Mapping.
17. Tạo gợi ý bổ sung Master Data/nhập thêm dữ liệu.
18. Tạo export CSV đúng chuẩn escape và encoding.
19. Viết checklist/test cho toàn bộ luồng.

## 10. Tiêu Chí Xem Là Hoàn Thành Phần 3

Phần 3 được xem là hoàn thành khi người dùng có thể:

- Mở `CSV作成`.
- Xem danh sách Mapping có thể dùng.
- Chọn một Mapping hợp lệ.
- Upload file Excel đơn hàng.
- Import dữ liệu theo Mapping đã chọn.
- Thấy ngay bảng CSV theo đúng thứ tự cột của file CSV thật.
- Thấy cảnh báo dữ liệu thiếu/lỗi ngay trên màn hình.
- Chuyển được giữa `簡易表示` và `全項目表示`.
- `簡易表示` ẩn đúng các cột đã tick trong Mapping.
- Chế độ hiển thị đã chọn được giữ khi chuyển giữa màn hình chính, preview và chế độ xem lớn.
- Mở bảng ở chế độ lớn gần full màn hình.
- Sửa trực tiếp bất kỳ ô nào trong bảng.
- Lưu sửa đổi.
- Bỏ sửa đổi.
- Đóng chế độ xem lớn mà không mất dữ liệu đang sửa.
- Biết cần bổ sung Master Data, sửa Mapping, sửa file nguồn hay sửa trực tiếp trên bảng.
- Export CSV đúng cấu hình Mapping.
- Export được cả khi còn thiếu dữ liệu, nhưng phải có cảnh báo.
- CSV export không bị nhảy cột/nhảy dòng do ký tự đặc biệt.
- Dữ liệu xuống dòng được thay bằng khoảng trắng.

## 11. Checklist Kiểm Tra Nhanh Cho Người Non-Tech

- Có chọn được Mapping trước khi import không?
- Mapping lỗi có bị chặn import/export không?
- Upload file Excel xong có hiện ngay bảng CSV không?
- Bảng CSV có đúng thứ tự cột như Mapping/file CSV thật không?
- Có nút xem giản lược và xem đầy đủ không?
- Khi bấm xem giản lược, các cột đã tick `簡易表示で非表示` trong Mapping có bị ẩn không?
- Khi bấm xem đầy đủ, toàn bộ cột CSV có hiện lại không?
- Chế độ xem đang chọn có áp dụng cho cả màn hình chính và preview không?
- Nếu chọn Mapping khác, kết quả CSV có khác theo Mapping không?
- Dữ liệu có bắt đầu từ đúng `明細開始行` không?
- Hệ thống có dùng đúng `有効行判定列` để xác định dòng hợp lệ không?
- Cột lấy từ file Excel có lấy đúng ô/cột không?
- Hệ thống có lấy dữ liệu từ Excel trước, rồi mới lookup Master Data, rồi mới tính công thức không?
- Cột lấy từ Master Data có lookup đúng không?
- Cột giá trị cố định có ra đúng giá trị không?
- Cột cấu hình để trống có để trống không?
- Format ngày/số/text/cắt ký tự có đúng theo Mapping không?
- Cảnh báo có chỉ rõ dòng/cột bị thiếu không?
- Có biết cần bổ sung Master Data nào không?
- Có mở được table ở chế độ lớn gần full màn hình không?
- Khi ở chế độ lớn vẫn thấy/ dùng được toolbar không?
- Có sửa trực tiếp được bất kỳ ô nào không?
- Có lưu sửa đổi được không?
- Có bỏ sửa đổi được không?
- Đóng chế độ xem lớn có giữ dữ liệu đang sửa không?
- Export CSV mở bằng Excel có lỗi tiếng Nhật không?
- Export có đủ tất cả cột theo Mapping kể cả cột đang bị ẩn khi xem giản lược không?
- Dữ liệu có dấu phẩy có bị nhảy cột không?
- Dữ liệu có chấm phẩy có bị sai cột không?
- Dữ liệu có dấu nháy kép có xuất đúng không?
- Dữ liệu có xuống dòng đã được thay bằng khoảng trắng chưa?
- Export khi còn thiếu dữ liệu có hiện cảnh báo không?
