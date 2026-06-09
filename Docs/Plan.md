# Plan Chuyển Quy Trình VBA Excel Sang Web App Next.js

## Mục Tiêu

Chuyển quy trình hiện tại từ VBA Excel sang một web app dùng Next.js, Firebase và Vercel.

Quy trình mới cần giữ đúng logic đang làm trong Excel:

1. Quản lý master data.
2. Quản lý cấu hình dữ liệu đầu vào, gồm giá trị cố định và mapping dữ liệu lấy từ file Excel đơn hàng.
3. Import file Excel đơn hàng.
4. Tạo dữ liệu CSV theo đúng Mapping đã chọn và hiển thị ngay trên màn hình.
5. Validation dữ liệu thiếu hoặc dữ liệu không format được theo Mapping.
6. Hiển thị cảnh báo trên màn hình và gợi ý cần update vào master data, sửa Mapping, sửa file nguồn hoặc sửa trực tiếp trên bảng.
7. Người dùng có thể chuyển giữa xem giản lược và xem đầy đủ cột CSV; cột bị ẩn ở xem giản lược được cấu hình trong từng dòng Mapping.
8. Người dùng có thể xem bảng ở chế độ lớn gần full màn hình, sửa trực tiếp như Excel, lưu sửa đổi hoặc bỏ sửa đổi.
9. Export CSV đúng format đã quy định trong Mapping.
9. Đây là webapp cho người Nhật dùng nên tất cả thanh tiêu đề, button, alert, confirm, tooltip, label, validation message và các text UI/UX khác đều phải bằng tiếng Nhật (trừ dữ liệu master data do người dùng quản lý).
## Workflow Đề Xuất

### 1. Master Data

Hệ thống cần có các màn hình quản lý danh mục thay cho các sheet danh mục trong Excel:

- `CusCodeList`
- `ItemCodeList`
- `UnitPriceList`
- `PIC.WH.CodeList`
- `UnitCodeList`

Người dùng có thể thêm, sửa, xóa, import và tìm kiếm dữ liệu trong các danh mục này.

### 2. Quản Lý Cấu Hình Dữ Liệu Đầu Vào

Hiện tại dữ liệu đầu vào của quy trình đến từ 2 nguồn chính:

1. Các giá trị cố định đang được lấy từ dòng mẫu trong sheet `CSVExport`, ví dụ `C5`, `D5`, `O5`, `P5`, `Q5`, `R5`, `S5`, `U5`, `V5`, `AE5`.
2. Các giá trị được lấy trực tiếp từ file Excel đơn hàng import, ví dụ `K4`, `D4`, `K8`, `Q5`, `Q7` và các cột chi tiết từ dòng 17 trở xuống.

Khi chuyển sang web app, cả 2 nhóm này không nên hard-code trong source code. Nên có màn hình cấu hình riêng để người dùng có thể thay đổi khi form đơn hàng hoặc rule xử lý thay đổi.

#### 2.0. Cấu Trúc Màn Hình Cấu Hình Theo Quyết Định Mới

Phần cấu hình Mapping không đặt thành một nhóm menu riêng gồm nhiều mục con nữa. Sidebar chỉ tạo một mục chính:

- `設定`

Bên trong `設定`, cấu trúc tạm thời như sau:

- `Hiển thị`: tạm thời để trống. Phần này sẽ thiết lập sau trong phiên làm việc khác.
- `マッピング一覧`: tab quan trọng của phần cấu hình Mapping.

Không đặt các mục sau trong sidebar hoặc tab của phần cấu hình Mapping:

- `インポート`
- `バッチ処理`
- `固定値設定`
- `マスタデータ`
- `照明`
- `エクスポート履歴`

Lý do:

- `インポート`, `バッチ処理`, `エクスポート履歴` thuộc luồng xử lý nghiệp vụ import/export, không phải tab cấu hình Mapping.
- `マスタデータ` đã có phân hệ riêng, không đặt lặp lại trong phần này.
- `照明` không thuộc phạm vi cần làm ở giai đoạn này.
- `固定値設定` không tách thành tab riêng trong cấu trúc mới; các giá trị cố định được quản lý như một kiểu `Cách lấy dữ liệu` trong từng dòng Mapping.

Tab `マッピング一覧` là tab quan trọng của phần `設定`. Tab này cho phép người dùng quản lý Mapping theo từng cột CSV: thêm mới, sửa, xóa và lưu Mapping.

Mỗi Mapping cần có:

- Tên Mapping.
- Danh sách thiết lập quy tắc nhập liệu cho từng cột trong file CSV.

#### 2.1. Quản Lý Giá Trị Cố Định

Các giá trị cố định cần quản lý:

| Ô Excel hiện tại | Cột CSV tương ứng | Tên chỉ tiêu | Giá trị mặc định | Ghi chú |
| --- | --- | --- | --- | --- |
| `C5` | `C` | 分納区分 | `0` | Giá trị cố định |
| `D5` | `D` | 取引区分 | `1` | Giá trị cố định |
| `O5` | `O` | 売上担当者コード | `51` | Giá trị cố định |
| `P5` | `P` | 売上計上部門コード | `TK11` | Giá trị cố định |
| `Q5` | `Q` | 売上取引形態区分 | `1` | Giá trị cố định |
| `R5` | `R` | 売上計上基準区分 | `1` | Giá trị cố định |
| `S5` | `S` | 請求帳端区分 | `1` | Giá trị cố định |
| `U5` | `U` | 取引通貨コード | `JPY` | Giá trị cố định |
| `V5` | `V` | 明細取引通貨コード | `JPY` | Giá trị cố định |
| `AE5` | `AE` | 手配区分 | `1` | Giá trị cố định |

Yêu cầu cho màn hình quản lý giá trị cố định:

- Cho phép xem danh sách tất cả giá trị cố định.
- Cho phép sửa giá trị mặc định.
- Cho phép cấu hình theo Mapping nếu mỗi kiểu import/export có giá trị cố định khác nhau.
- Lưu lịch sử thay đổi: ai sửa, sửa lúc nào, giá trị cũ, giá trị mới.
- Khi import/export theo Mapping, hệ thống lấy giá trị từ cấu hình Mapping thay vì hard-code.

#### 2.2. Quản Lý Mapping Dữ Liệu Từ File Excel Đơn Hàng

Hiện tại macro `ImportOrderData` đang lấy dữ liệu từ file Excel đơn hàng theo mapping sau:

| Nguồn trong file Excel đơn hàng | Đích trong CSVExport | Tên chỉ tiêu | Ghi chú |
| --- | --- | --- | --- |
| `K4` | `A` | 会社コード | Giá trị cấp sheet |
| `D4` | `E` / `I` / `J` | 得意先コード | Cùng một giá trị nguồn dùng cho nhiều cột đích |
| `K8` | `K` | 納入先コード | Giá trị cấp sheet |
| `Q5` | `W` | 受注日 | Ngày, format export `yyyymmdd` |
| `Q7 - 1` | `X` / `AO` | 出荷予定日 | Ngày, format export `yyyymmdd` |
| `Q7` | `Y` | 出荷予定日 | Ngày, format export `yyyymmdd` |
| Hệ thống tự sinh | `AD` | 売上伝票行番号 | Đánh số thứ tự từ `1`, tăng dần theo từng dòng chi tiết hợp lệ |
| Cột `C` dòng chi tiết | `Z` | 拡張コード項目２ | Dữ liệu theo từng dòng chi tiết |
| Cột `I` dòng chi tiết | `AA` | 拡張コード項目３ | Dữ liệu theo từng dòng chi tiết |
| Cột `E` dòng chi tiết | `AB` | 拡張テキスト項目１ | Dữ liệu theo từng dòng chi tiết |
| Cột `M` dòng chi tiết | `AG` | 商品名 | Dữ liệu theo từng dòng chi tiết |
| Cột `R` dòng chi tiết | `AI` | 受注数 | Dữ liệu theo từng dòng chi tiết, hiện cũng là điều kiện xác định dòng hợp lệ |
| Cột `U` dòng chi tiết | `AM` | 取引通貨受注単価 | Dữ liệu theo từng dòng chi tiết |
| Cột `V` dòng chi tiết | `AN` | 取引通貨明細受注金額 | Dữ liệu theo từng dòng chi tiết |
| Cột `L` dòng chi tiết | `AP` | ベトナム工場の資材コード | Dữ liệu theo từng dòng chi tiết |
| Cột `S` dòng chi tiết | `AQ` | 単位コード(工場) | Dữ liệu theo từng dòng chi tiết |

Yêu cầu cho màn hình quản lý mapping dữ liệu import:

- Cho phép xem danh sách mapping nguồn - đích hiện tại.
- `Admin` và `Operator` có quyền xử lý tất cả tác vụ trong màn hình Mapping như nhau, bao gồm xem, tạo, sửa, xóa, lưu, preview và apply mapping. Không phân biệt quyền giữa 2 role này trong phạm vi Mapping.
- Cho phép sửa ô nguồn, cột nguồn hoặc cột đích nếu form Excel đơn hàng thay đổi.
- Cho phép cấu hình một nguồn map sang nhiều cột đích, ví dụ `D4` map sang `E`, `I`, `J`.
- Cho phép cấu hình biểu thức đơn giản, ví dụ `Q7 - 1` cho các cột `X` và `AO`.
- Cho phép phân biệt dữ liệu cấp sheet và dữ liệu theo dòng chi tiết.
- Cho phép quản lý `startDetailRow` (明細開始行) trong Mapping để người dùng nhập/sửa dòng bắt đầu đọc chi tiết, hiện tại gợi ý là dòng `17`.
- Cho phép quản lý `validRowColumn` (有効行判定列) trong Mapping để người dùng nhập/sửa cột dùng xác định dòng chi tiết hợp lệ, hiện tại gợi ý là cột `R`.
- `startDetailRow` và `validRowColumn` là 2 chỉ tiêu bắt buộc. Nếu người dùng không nhập, nhập sai kiểu hoặc nhập giá trị không hợp lệ, hệ thống phải báo lỗi bằng tiếng Nhật và không cho lưu mapping, preview, import hoặc apply mapping tiếp.
- Cho phép cấu hình theo khách hàng, loại form đơn hàng hoặc kiểu CSV bằng cách tạo Mapping khác nhau.
- Lưu lịch sử thay đổi mapping: ai sửa, sửa lúc nào, giá trị cũ, giá trị mới.

- Cho phép cấu hình định dạng cho từng cột đích (ví dụ: `string`, `number`, `date` với `yyyymmdd`, hoặc `date` với offset như `Q7 - 1`).
- Cho phép tick `簡易表示で非表示` cho từng dòng Mapping. Nếu tick, cột đó sẽ bị ẩn khi người dùng chọn chế độ `簡易表示` ở phần `CSV作成`; nếu không tick, cột vẫn hiển thị.
- Khi hiển thị danh sách mapping, sắp xếp theo thứ tự cột CSV (A → B → C → ...) để người dùng dễ theo dõi.
- Toàn bộ UI/UX của màn hình Mapping phải dùng tiếng Nhật, ví dụ: `設定`, `マッピング一覧`, `新規マッピング`, `編集`, `削除`, `保存`, `プレビュー`, `適用`, `明細開始行`, `有効行判定列`. Các lỗi bắt buộc nhập nên hiển thị dạng `明細開始行を入力してください。` và `有効行判定列を入力してください。`

Trong tab `マッピング一覧`, cấu trúc cấu hình nhanh cho từng dòng Mapping:

| Cột trong File CSV | Tên Cột | Cách lấy dữ liệu |
| --- | --- | --- |
| `C` | `分納区分` | Người dùng chọn một cách lấy dữ liệu |

Các lựa chọn `Cách lấy dữ liệu`:

- Lấy từ file đơn hàng.
- Giá trị cố định.
- Đối chiếu / lấy dữ liệu từ master data.
- Công thức tính toán.

Chi tiết từng cách lấy dữ liệu:

- `Lấy từ file đơn hàng`: người dùng chọn kiểu lấy dữ liệu:
  - Lấy từ 1 ô cố định.
  - Lấy từ 1 mảng dữ liệu.
  - Lấy bằng công thức tính toán dựa trên dữ liệu lấy vào từ file đơn hàng.
- Nếu lấy từ 1 ô cố định: người dùng nhập vị trí ô nguồn, ví dụ `K4`, `Q5`, `Q7`.
- Nếu lấy từ 1 mảng dữ liệu: người dùng nhập cột nguồn cần lấy dữ liệu, dòng bắt đầu, và điều kiện xác định dòng kết thúc. Điều kiện kết thúc có thể là dòng cuối có giá trị ở một cột được chọn.
- Nếu lấy bằng công thức dựa trên dữ liệu file đơn hàng: người dùng nhập dữ liệu nguồn là số hay mảng, vị trí ô/cột nguồn, và công thức. Giai đoạn đầu áp dụng chủ yếu cho trường hợp lấy ngày tháng rồi cộng/trừ một số ngày, ví dụ lấy `Q7` rồi trừ `1` ngày.
- Format dữ liệu lấy vào gồm các loại:
  - Giữ nguyên format của file gốc.
  - Dạng number `00,000.00`.
  - Dạng number bỏ phần thập phân, không làm tròn. Ví dụ `123.67` thành `123`.
  - Dạng ngày tháng `yyyymmdd`.
- `Giá trị cố định`: cho phép nhập trực tiếp giá trị cố định cho cột CSV tương ứng.
- `Công thức tính toán`: cho phép nhập công thức tính toán theo cách hiển thị như trong Excel. Ví dụ `=A*C` nghĩa là cột CSV hiện tại có giá trị bằng kết quả phép nhân giữa giá trị ở cột `A` và giá trị ở cột `C` của cùng dòng CSV đang xét.
- `Đối chiếu / lấy dữ liệu từ master data`: mô phỏng logic giống hàm `VLOOKUP` trong Excel. Người dùng cần nhập/chọn:
  - Cột có dữ liệu cần tham chiếu trong file CSV.
  - Collection master data cần tham chiếu. UI hiển thị danh sách collection master data để người dùng chọn.
  - Field dùng để tham chiếu trong collection đã chọn. UI hiển thị danh sách field của collection đã chọn.
  - Field cần lấy ra trong document đã tìm thấy. UI hiển thị danh sách field của collection đã chọn.
  - Cột CSV nhận kết quả trả về.

Màn hình phải cho phép thêm mới, xóa, sửa và lưu Mapping.

Khi import Excel, hệ thống sẽ đọc mapping từ cấu hình này. Nếu sau này form đơn hàng thay đổi vị trí ô hoặc cột, người dùng chỉ cần cập nhật mapping trên giao diện, không cần sửa source code.

### 3. Giá Trị Nhập Tay Trên Màn Hình Xử Lý CSV

Giá trị tương ứng `T5` hiện tại là giá trị người dùng nhập tay cho cột `T` - 倉庫コード. Đây là mã liên quan đến `PICCodeList` / `PIC.WH.CodeList`, nên không nên đặt chung với nhóm giá trị cố định cấu hình một lần rồi dùng mãi.

Trong web app, giá trị này cần được đặt ngay tại màn hình xử lý file CSV hiện tại.

Yêu cầu:

- Trên màn hình xử lý CSV, có field nhập/sửa mã PIC/kho tương ứng cột `T` - 倉庫コード nếu Mapping cần dữ liệu nhập tay này.
- Người dùng có thể nhập hoặc thay đổi mã này bất cứ lúc nào trước khi export.
- Khi người dùng thay đổi mã PIC, hệ thống xử lý lại dữ liệu liên quan cho bảng CSV hiện tại nếu cần.
- Nếu mã PIC nhập vào không tồn tại trong `PIC.WH.CodeList` hoặc danh mục liên quan, validation phải cảnh báo.
- Nếu người dùng vẫn muốn export khi mã PIC chưa hợp lệ hoặc chưa có trong master data, hệ thống cho phép export nhưng cột liên quan sẽ để trống theo rule export thiếu dữ liệu.

Giá trị này chỉ cần giữ trong phiên xử lý hiện tại trước khi export, không lưu như một giá trị cố định toàn hệ thống.

### 4. Import Excel Theo Mapping

Người dùng upload một hoặc nhiều file Excel đơn hàng.

Trước khi upload/import, người dùng phải chọn một Mapping đã tạo ở phần `マッピング`. Có bao nhiêu Mapping hợp lệ thì hệ thống có bấy nhiêu kiểu import/export tương ứng.

Hệ thống sẽ:

- Đọc từng workbook.
- Đọc từng sheet hợp lệ.
- Bỏ qua sheet ẩn nếu thư viện đọc Excel hỗ trợ.
- Trước khi parse, kiểm tra mapping đã chọn có `startDetailRow` và `validRowColumn` hợp lệ. Nếu thiếu hoặc không hợp lệ thì báo lỗi bằng tiếng Nhật và dừng import.
- Đọc dữ liệu chi tiết từ `startDetailRow` được cấu hình trong Mapping.
- Chỉ lấy những dòng có dữ liệu ở `validRowColumn` được cấu hình trong Mapping.
- Với từng cột CSV trong Mapping, lấy dữ liệu theo đúng `Cách lấy dữ liệu` đã cấu hình: từ file Excel, từ Master Data, từ giá trị cố định, từ công thức hoặc để trống.
- Áp dụng đúng định dạng dữ liệu đã cấu hình trong Mapping: giữ nguyên format gốc, format text/number/date, lấy số ký tự, cắt khoảng trắng nếu Mapping yêu cầu, hoặc các format khác đã có trong danh sách format.
- Tạo dữ liệu trung gian tương đương file CSV sẽ export, không hard-code theo từng khách hàng hoặc từng kiểu file trong màn hình xử lý.

Thứ tự xử lý bắt buộc:

1. Đọc trước tất cả dữ liệu lấy trực tiếp từ file Excel đơn hàng.
2. Điền giá trị cố định, giá trị nhập tay hoặc để trống theo Mapping.
3. Sau khi bảng CSV tạm đã có dữ liệu nguồn từ Excel, mới lookup Master Data.
4. Sau khi lookup Master Data xong, mới tính các cột công thức cộng/trừ/nhân/chia.
5. Sau cùng mới áp dụng format dữ liệu và chuẩn hóa ký tự đặc biệt để hiển thị/export.

Không được tính công thức trước khi lookup Master Data, và không được lookup Master Data trước khi các cột khóa lấy từ Excel đã có dữ liệu.

Sau khi import, không tạo `Import Batch` và không cần lưu lịch sử batch. Dữ liệu được giữ trong phiên xử lý hiện tại trên màn hình để người dùng xem, sửa và export.

Thông tin cần hiển thị trên màn hình:

- Mapping đang dùng.
- Tên file nguồn vừa import.
- Số dòng đã đọc.
- Số dòng hợp lệ.
- Số dòng/ô đang thiếu thông tin.
- Cảnh báo lỗi/thiếu dữ liệu.

### 5. Tạo Dữ Liệu CSV Theo Mapping

Sau khi import, hệ thống không yêu cầu người dùng chọn thêm rule xử lý riêng nếu Mapping đã mô tả đủ cách lấy dữ liệu.

Hệ thống tạo dữ liệu CSV dựa trên từng dòng Mapping:

- Cột lấy từ file đơn hàng: đọc đúng ô/cột/dòng đã cấu hình.
- Cột lấy từ Master Data: lookup đúng collection, field đối chiếu và field cần lấy ra.
- Cột giá trị cố định: dùng đúng giá trị đã khai báo trong Mapping.
- Cột công thức: tính theo công thức đã cấu hình.
- Cột để trống: giữ trống đúng như Mapping.
- Cột có format: áp dụng đúng format đã chọn trong Mapping.
- Dữ liệu có ký tự xuống dòng: thay ký tự xuống dòng bằng khoảng trắng trước khi hiển thị và export.

Khi xử lý các dòng Mapping, hệ thống không xử lý công thức ngay theo thứ tự cột hiển thị nếu dữ liệu phụ thuộc chưa có. Logic đúng là tạo bảng tạm từ Excel trước, sau đó bổ sung dữ liệu lookup Master Data, rồi cuối cùng mới tính các công thức dựa trên các cột đã hoàn thiện.

Nếu sau này có form đơn hàng mới, khách hàng mới hoặc kiểu CSV mới, người dùng tạo thêm Mapping mới. Mapping mới đó sẽ trở thành một kiểu import/export mới, không cần thêm một nhánh xử lý hard-code trong phần Import/Export.

### 5.1. Hiển Thị Và Sửa Bảng CSV

Sau khi tạo dữ liệu CSV theo Mapping, màn hình phải hiển thị ngay bảng CSV theo đúng thứ tự cột của file CSV thật.

Yêu cầu:

- Bảng CSV là khung preview chính, kích thước lớn, có cuộn ngang/cuộn dọc.
- Header và thứ tự cột theo Mapping.
- Ô thiếu dữ liệu hoặc lỗi format được highlight.
- Cảnh báo tổng quan hiển thị ngay trên màn hình.
- Có button mở chế độ xem bảng lớn gần full màn hình, vẫn nhìn được toolbar/window.
- Có button xem giản lược `簡易表示`.
- Có button xem đầy đủ `全項目表示`.
- Khi chọn `簡易表示`, hệ thống ẩn các cột đã tick `簡易表示で非表示` trong Mapping.
- Khi chọn `全項目表示`, hệ thống hiển thị toàn bộ cột CSV theo Mapping.
- Trạng thái đang xem giản lược hoặc đầy đủ phải áp dụng cho tất cả bảng/preview trong cùng phiên xử lý hiện tại.
- Trong chế độ xem lớn vẫn có các nút thao tác chính: lưu sửa đổi, bỏ sửa đổi, đóng chế độ xem lớn, export.
- Cho phép sửa trực tiếp bất kỳ ô nào trong bảng giống Excel.
- Có button lưu sửa đổi.
- Có button bỏ sửa đổi.
- Nếu đóng chế độ xem lớn, dữ liệu đang sửa không bị mất.
- Nếu export khi còn thay đổi chưa lưu, hệ thống phải cảnh báo hoặc yêu cầu lưu trước.

### 6. Validation

Sau khi tạo dữ liệu CSV theo Mapping, hệ thống validation toàn bộ dữ liệu.

Các lỗi/cảnh báo cần bắt gồm:

- Không tìm thấy customer code trong `CusCodeList`.
- Không tìm thấy item code trong `ItemCodeList`.
- Không tìm thấy unit price trong `UnitPriceList`.
- Không tìm thấy PIC/warehouse code trong `PIC.WH.CodeList`.
- Không tìm thấy unit code trong `UnitCodeList`.
- Mã PIC nhập tay trên màn hình đang trống hoặc không tồn tại trong danh mục liên quan nếu Mapping yêu cầu.
- Thiếu giá trị ở cột được Mapping đánh dấu là bắt buộc.
- Cột lấy từ file Excel nhưng ô/cột nguồn bị trống.
- Cột lấy từ Master Data nhưng không tìm thấy bản ghi phù hợp.
- Cột công thức nhưng không tính được.
- Cột có format nhưng giá trị nguồn không format được.
- Ngày tháng, số lượng, giá tiền không hợp lệ nếu Mapping hoặc rule dữ liệu yêu cầu.
- Dữ liệu trùng lặp nếu Mapping hoặc rule validation xác định trùng lặp.

Kết quả validation phải hiển thị rõ trên giao diện:

- Dòng nào lỗi.
- Cột nào lỗi.
- Lý do lỗi.
- Gợi ý cần bổ sung vào danh mục nào.
- Giá trị nguồn nào đang thiếu mapping trong master data.
- Danh sách bản ghi để người dùng có thể thêm nhanh vào master data.
- Gợi ý nên sửa Mapping hoặc sửa file Excel nguồn nếu lỗi không đến từ Master Data.

Validation trong hệ thống này không mặc định chặn export. Validation có nhiệm vụ chỉ ra dữ liệu nào đang thiếu, ảnh hưởng đến cột nào trong file CSV và nên bổ sung vào master data nào.

### 7. Hiển Thị Dữ Liệu Thiếu Và Gợi Ý Cập Nhật Master Data

Nếu validation phát hiện dữ liệu còn thiếu, hệ thống sẽ hiển thị một màn hình tổng hợp các thông tin cần bổ sung. Người dùng có thể xem rõ:

- Dữ liệu nào đang thiếu.
- Dòng nào bị ảnh hưởng.
- Cột CSV nào sẽ bị trống nếu không bổ sung.
- Cần bổ sung vào master data nào.
- Giá trị đề xuất tạo mới trong master data nếu có thể suy ra từ file import.

Ví dụ:

- Nếu item code chưa có trong `ItemCodeList`, người dùng thêm item code mới.
- Nếu customer code chưa có trong `CusCodeList`, người dùng thêm thông tin customer.
- Nếu chưa có giá trong `UnitPriceList`, người dùng thêm giá.
- Nếu chưa có mã PIC/kho, người dùng thêm vào `PIC.WH.CodeList`.
- Nếu chưa có unit code, người dùng thêm vào `UnitCodeList`.

Sau khi xem danh sách dữ liệu thiếu, người dùng có 2 lựa chọn:

1. Bổ sung master data, sửa Mapping, sửa file nguồn hoặc nhập thêm dữ liệu rồi chạy lại xử lý theo Mapping/validation.
2. Export CSV luôn, chấp nhận các cột chưa có đủ thông tin sẽ để trống.

Nếu người dùng chọn bổ sung master data, vòng lặp xử lý là:

1. Validation phát hiện lỗi hoặc thiếu thông tin.
2. Người dùng bổ sung master data/thông tin còn thiếu.
3. Hệ thống chạy lại xử lý theo Mapping cho dữ liệu hiện tại.
4. Hệ thống validation lại.
5. Lặp lại cho đến khi người dùng thấy dữ liệu đã đủ hoặc quyết định export.

Nếu người dùng chọn export ngay, hệ thống vẫn tạo file CSV nhưng các field không lookup được hoặc chưa có thông tin sẽ để trống. Trước khi export, hệ thống nên hiển thị cảnh báo xác nhận:

- Tổng số dòng còn thiếu thông tin.
- Tổng số ô/cột sẽ bị để trống.
- Danh sách nhóm lỗi chính.
- Xác nhận rằng người dùng chấp nhận export file chưa đầy đủ.

Không cần lưu trạng thái batch. Trạng thái chỉ cần hiển thị trên màn hình hiện tại, ví dụ: còn lỗi, còn thiếu Master Data, đã đủ dữ liệu, có sửa đổi chưa lưu.

### 8. Preview Và Export CSV Theo Mapping

Cho phép export trong 2 trường hợp:

- Dữ liệu hiện tại đã đầy đủ thông tin.
- Dữ liệu hiện tại còn thiếu thông tin nhưng người dùng xác nhận export với các ô thiếu để trống.

Chức năng export cần:

- Export đúng các cột đã khai báo trong Mapping.
- Giữ đúng thứ tự cột trong Mapping.
- Áp dụng đúng format của từng cột theo Mapping, ví dụ giữ nguyên format gốc, text, number, number bỏ phần thập phân không làm tròn, date, `yyyymmdd`, lấy số ký tự hoặc để trống.
- Tạo file CSV UTF-8 có BOM nếu hệ thống nhận file yêu cầu.
- Thay ký tự xuống dòng trong dữ liệu bằng khoảng trắng trước khi export.
- Escape dấu phẩy, chấm phẩy và dấu nháy kép đúng chuẩn CSV để không bị nhảy dòng/nhảy cột khi mở hoặc import CSV.
- Không tự ý xóa dấu cách đầu/cuối nếu Mapping yêu cầu giữ nguyên; chỉ trim/cắt khi Mapping cấu hình như vậy.
- Để trống các field không lookup được nếu người dùng export khi dữ liệu chưa đầy đủ.
- Không lưu lịch sử export.

## MoSCoW Plan

### Must Have

- Web app Next.js deploy trên Vercel.
- Firebase Authentication nếu cần phân quyền người dùng.
- Firestore lưu master data và cấu hình Mapping/giá trị cố định. Phần Import/Export không cần lưu lịch sử batch hoặc lịch sử export.
- Màn hình quản lý các master data chính.
- Màn hình quản lý các giá trị cố định như `C5`, `D5`, `O5`, `P5`, `Q5`, `R5`, `S5`, `U5`, `V5`, `AE5`.
- Màn hình quản lý mapping dữ liệu lấy từ file Excel đơn hàng import sang các cột CSVExport.
- Trong Mapping, `Admin` và `Operator` có full quyền như nhau cho tất cả tác vụ, không phân biệt.
- Cho phép người dùng nhập/sửa `startDetailRow` và `validRowColumn` trực tiếp trong Mapping.
- Bắt buộc validate `startDetailRow` và `validRowColumn`; nếu thiếu hoặc không hợp lệ thì báo lỗi bằng tiếng Nhật và không cho lưu/import/apply mapping tiếp.
- Toàn bộ UI/UX, label, button, alert, confirm và validation message của web app phải bằng tiếng Nhật, trừ dữ liệu master data.
- Nếu Mapping cần dữ liệu nhập tay, màn hình xử lý CSV phải có field nhập/sửa tương ứng.
- Upload và parse file Excel đơn hàng.
- Map dữ liệu Excel vào cấu trúc trung gian tương đương `CSVExport`.
- Tạo dữ liệu CSV theo Mapping đã chọn, bao gồm lấy từ Excel, Master Data, giá trị cố định, công thức hoặc để trống.
- Áp dụng format dữ liệu theo Mapping cho preview và export.
- Hiển thị ngay bảng CSV lớn theo đúng thứ tự cột của file CSV thật sau khi import.
- Hiển thị cảnh báo lỗi/thiếu dữ liệu ngay trên màn hình.
- Cho phép xem table ở chế độ lớn gần full màn hình nhưng vẫn thấy toolbar/window.
- Cho phép chuyển giữa `簡易表示` và `全項目表示` trên màn hình chính và preview.
- `簡易表示` phải ẩn đúng các cột được tick `簡易表示で非表示` trong Mapping.
- Chế độ hiển thị đã chọn phải được giữ trong toàn bộ phiên xử lý hiện tại.
- Cho phép sửa trực tiếp bất kỳ ô nào trong table giống Excel.
- Có nút lưu sửa đổi và bỏ sửa đổi.
- Có nút đóng chế độ xem lớn.
- Thay ký tự xuống dòng trong dữ liệu bằng khoảng trắng trước khi hiển thị/export.
- Validation dữ liệu sau khi xử lý theo Mapping.
- Hiển thị danh sách lỗi validation theo dòng/cột.
- Hiển thị danh sách thông tin cần update vào master data để hoàn thiện CSV.
- Cho phép người dùng bổ sung master data sau validation.
- Cho phép chạy lại xử lý theo Mapping và validation trên dữ liệu hiện tại sau khi bổ sung danh mục, sửa Mapping, sửa file nguồn hoặc thay đổi dữ liệu nhập tay.
- Cho phép người dùng export CSV ngay cả khi còn thiếu thông tin, với các field thiếu để trống.
- Export CSV đúng format đã quy định trong Mapping và escape chuẩn để không nhảy dòng/nhảy cột.

### Should Have

- Import master data từ file Excel/CSV.
-Export master data ra file Excel/CSV.
- Preview dữ liệu trong khung lớn trước khi export.
- Giao diện sửa nhanh các dòng dữ liệu lỗi.
- Giao diện nhập liệu nhanh bổ sung dữ liệu thiếu sau đó cho phép tự động nhập liệu bổ sung vào master data tương ứng
- Bộ lọc theo trạng thái lỗi.
- Nút thêm nhanh master data từ màn hình validation.
- Màn hình preview CSV dạng bảng lớn trước khi export, bao gồm các ô đang để trống.
- Lịch sử thay đổi master data.
- Lịch sử thay đổi giá trị cố định.
- Phân quyền Viewer chỉ xem nếu cần. Riêng Mapping thì `Admin` và `Operator` luôn có quyền xử lý đầy đủ như nhau.


### Could Have

- Cấu hình mapping cột/field trên giao diện.
- Cấu hình nhiều template import khác nhau cho nhiều form đơn hàng khác nhau.
- Cấu hình giá trị cố định theo từng khách hàng, từng loại đơn hàng
- Cho phép tạo thêm Mapping mới cho form đơn hàng mới, khách hàng mới hoặc kiểu CSV mới.
- Khi có Mapping mới thì tự động có thêm một kiểu import/export mới trên màn hình `CSV作成`.
- So sánh dữ liệu trước và sau khi bổ sung master data.
- Export báo cáo riêng về các thông tin còn thiếu tại thời điểm export.

### Won't Have Trong Giai Đoạn Đầu

- Workflow phê duyệt nhiều cấp.
- Realtime collaboration nhiều người cùng sửa một bảng CSV.
- AI tự động sửa dữ liệu.
- Thay thế toàn bộ Excel ngay lập tức.
- Cấu hình logic xử lý quá phức tạp ngoài phạm vi Mapping hiện có.

## Luồng Xử Lý Chính

```text
Master Data + Mapping import/export
    |
    v
Kiem tra startDetailRow + validRowColumn trong Mapping
    |
    v
Chon Mapping
    |
    v
Import Excel theo Mapping
    |
    v
Tao du lieu CSV tam thoi + ap dung format theo Mapping
    |
    v
Hien thi table CSV lon + canh bao + cho sua truc tiep
    |
    v
Validation
    |
    v
Co loi/thieu thong tin?
    |-- Co: Hien thi danh sach can update vao master data
    |       |-- Bo sung master data / sua Mapping / sua file nguon / sua truc tiep tren table -> Xu ly/Validation lai
    |       |-- Export luon -> Cac field thieu de trong
    |-- Khong: Export CSV day du
```

## Ghi Chú Thiết Kế

- Master data là nền tảng của toàn bộ quy trình, nên cần ưu tiên làm ổn định trước.
- Các giá trị cố định cần được quản lý bằng cấu hình, không hard-code trong source code.
- Mapping dữ liệu từ file Excel đơn hàng cũng cần được quản lý bằng cấu hình để khi form import thay đổi thì không cần sửa code.
- `startDetailRow` và `validRowColumn` thuộc cấu hình Mapping, là bắt buộc nhập và phải được validate trước khi lưu mapping hoặc import Excel.
- Trong phạm vi Mapping, không tách quyền thao tác giữa `Admin` và `Operator`; cả hai role có full quyền xử lý như nhau.
- UI/UX phải thống nhất tiếng Nhật cho toàn bộ text hệ thống để phù hợp người dùng Nhật.
- Nếu Mapping có loại dữ liệu nhập tay, giá trị đó nên đặt ngay trên màn hình xử lý CSV để người dùng sửa bất cứ lúc nào trước khi export.
- Validation không chỉ báo lỗi, mà phải chỉ ra người dùng cần bổ sung thông tin vào danh mục nào.
- Export CSV là bước cuối cùng, nhưng không bị khóa tuyệt đối nếu dữ liệu chưa đầy đủ.
- Khi export với dữ liệu thiếu, hệ thống phải cảnh báo rõ trên màn hình trước khi người dùng xác nhận export.
- Logic xử lý Mapping, lookup Master Data, áp dụng format và export CSV nên nằm ở service/helper riêng, không viết trực tiếp trong component UI.
- Nên có test cho logic parse Excel theo Mapping, lookup Master Data, áp dụng format, validation dữ liệu thiếu và export CSV escape chuẩn.
