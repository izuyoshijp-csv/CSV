# Mapping Use Cases & User Stories

Mục tiêu: mô tả các user story và use case cho chức năng "Quản lý mapping dữ liệu import" (phần 2 trong Plan.md). Tài liệu này làm cơ sở cho UI/UX, service và kiểm thử.

## Tổng quan
- Cho phép người dùng cấu hình cách map dữ liệu từ file Excel đơn hàng vào cột xuất CSV (`A:AO`).
- Hỗ trợ: source types (`sheetCell`, `detailColumn`, `expression`, `generated`), nhiều cột đích cho cùng một nguồn, định dạng cột (string/number/date `yyyymmdd`), offset ngày (ví dụ `Q7 - 1`), cấu hình ẩn cột khi xem giản lược, `startDetailRow` và `validRowColumn`.
- `startDetailRow` và `validRowColumn` là 2 chỉ tiêu bắt buộc được quản lý trong Mapping để người dùng nhập/sửa trên giao diện. Nếu một trong hai giá trị trống hoặc không hợp lệ, hệ thống phải báo lỗi và không cho lưu mapping, import, preview hoặc apply mapping tiếp.
- Cấu hình có thể là template chung hoặc theo khách hàng / loại form.
- Toàn bộ UI/UX của chức năng Mapping phải dùng tiếng Nhật: tiêu đề màn hình, label field, tên nút, tooltip, alert, confirm modal, empty state, validation message và thông báo hệ thống.
- Trong phạm vi Mapping, `Admin` và `Operator` có quyền xử lý tất cả tác vụ như nhau, không phân biệt quyền.

## Cấu trúc màn hình theo quyết định mới

Sidebar của nhóm chức năng này chỉ có một mục:

- `設定`

Bên trong `設定`:

- `Hiển thị`: tạm thời để trống. Phiên làm việc sau sẽ thiết lập.
- `マッピング一覧`: tab chính và quan trọng để quản lý Mapping.

Không tạo các mục/tab sau trong phần này:

- `インポート`
- `バッチ処理`
- `固定値設定`
- `マスタデータ`
- `照明`
- `エクスポート履歴`

Ghi chú phạm vi:

- `マスタデータ` đã là một phân hệ riêng, không đặt lặp lại trong `設定`.
- `インポート`, `バッチ処理`, `エクスポート履歴` là luồng xử lý nghiệp vụ, không phải tab cấu hình Mapping.
- `照明` không cần trong giai đoạn này.
- `固定値設定` không tách thành tab riêng; giá trị cố định là một lựa chọn trong field `Cách lấy dữ liệu` của từng dòng Mapping.

Tab `マッピング一覧` quản lý danh sách Mapping và từng dòng cấu hình cột CSV. Người dùng có thể thêm mới, sửa, xóa và lưu Mapping.

Mỗi Mapping cần có:

- Tên Mapping.
- Danh sách quy tắc nhập liệu cho từng cột trong file CSV.

Mỗi dòng cấu hình trong Mapping nên có cấu trúc dễ hiểu:

| Cột trong File CSV | Tên Cột | Cách lấy dữ liệu | Ẩn khi xem giản lược |
| --- | --- | --- | --- |
| `C` | `分納区分` | Chọn một cách lấy dữ liệu | Checkbox |

Các lựa chọn `Cách lấy dữ liệu`:

- `Lấy từ file đơn hàng`.
- `Giá trị cố định`.
- `Đối chiếu / lấy dữ liệu từ master data`.
- `Công thức tính toán`.

Chi tiết nghiệp vụ cho `Cách lấy dữ liệu`:

- `Lấy từ file đơn hàng`: cho phép chọn một trong ba kiểu lấy dữ liệu: lấy từ một ô cố định, lấy từ một mảng dữ liệu, hoặc dùng công thức tính toán dựa trên dữ liệu lấy vào từ file đơn hàng.
  - Nếu lấy từ ô cố định: người dùng nhập vị trí ô, ví dụ `K4`, `Q5`, `Q7`.
  - Nếu lấy từ mảng dữ liệu: người dùng nhập cột nguồn, dòng bắt đầu, và điều kiện dòng kết thúc. Điều kiện kết thúc có thể là dòng cuối có giá trị ở một cột do người dùng chọn.
  - Nếu lấy bằng công thức dựa trên dữ liệu file đơn hàng: người dùng chọn dữ liệu nguồn là số hay mảng, nhập ô/cột nguồn, và nhập công thức. Giai đoạn đầu áp dụng chủ yếu cho việc lấy ngày tháng rồi cộng/trừ một số ngày.
  - Format dữ liệu lấy vào gồm các lựa chọn: giữ nguyên format file gốc, dạng number `00,000.00`, dạng number bỏ phần thập phân không làm tròn, hoặc dạng ngày tháng `yyyymmdd`.
- `Giá trị cố định`: nhập trực tiếp giá trị cố định cho cột CSV.
- `Công thức tính toán`: nhập công thức theo kiểu Excel, ví dụ `=A*C`, nghĩa là giá trị cột hiện tại được tính từ giá trị cột A và cột C ở cùng dòng CSV.
- `Đối chiếu / lấy dữ liệu từ master data`: mô phỏng logic giống `VLOOKUP` trong Excel. Người dùng chọn cột có dữ liệu cần tham chiếu trong file CSV, chọn collection master data, chọn field dùng để tham chiếu trong collection đã chọn, chọn field cần lấy ra trong document đã tìm thấy, và chọn cột CSV nhận kết quả.

## User Stories

1. Là người dùng (Operator), tôi muốn xem danh sách mapping hiện có để biết cách hệ thống đang map file Excel sang CSV, để tôi kiểm tra tính chính xác.
   - Acceptance: hiển thị tên mapping, `startDetailRow`, `validRowColumn`, số entry, preview các target columns.

2. Là Admin/Operator, tôi muốn tạo mapping mới (name, startDetailRow, validRowColumn, entries) để hỗ trợ form đơn hàng mới.
   - Acceptance: có form/JSON editor để nhập `entries`; lưu thành bản mới trong `importMappingConfigs`.

3. Là Admin/Operator, tôi muốn sửa mapping hiện có (thêm/sửa/xóa entry, thay đổi startDetailRow/validRowColumn) để ứng phó khi file Excel thay đổi.
   - Acceptance: thay đổi lưu được, có kiểm tra cú pháp của `entries` JSON hoặc form validation.

4. Là Admin/Operator, tôi muốn xóa mapping không dùng nữa để giảm rối loạn cấu hình.
   - Acceptance: xóa mapping sau xác nhận, có thể rollback qua lịch sử thay đổi (nếu có audit).

5. Là Operator, tôi muốn chọn mapping khi import file Excel để màn hình tạo CSV dùng đúng template mapping đó.
   - Acceptance: dropdown selection mapping khi upload file; nếu không chọn thì dùng `default` nếu hệ thống có Mapping mặc định.

6. Là Admin/Operator, tôi muốn cấu hình một source map sang nhiều target columns (ví dụ `D4` → `E`, `I`, `J`) để hỗ trợ trường hợp cùng giá trị cần copy vào nhiều cột.
   - Acceptance: entries cho phép `targetColumns` là mảng, apply mapping map đúng các cột.

7. Là Admin/Operator, tôi muốn định nghĩa expression đơn giản (ví dụ `Q7 - 1`) để hệ thống có thể tính ngày xuất phát từ ô khác với offset.
   - Acceptance: expression hỗ trợ `±N` ngày, lưu format là `date` với `offsetDays`.

8. Là Admin/Operator, tôi muốn mapping phân biệt `scope` là `sheet` (giá trị cấp sheet) và `detail` (giá trị theo dòng chi tiết) để hệ thống biết cách áp dụng khi parse.
   - Acceptance: mỗi entry có `scope` và parser áp dụng đúng khi tạo bảng CSV hiện tại.

9. Là Admin/Operator, tôi muốn lưu Mapping sau khi thêm/sửa/xóa dòng cấu hình để hệ thống dùng cấu hình mới cho lần xử lý sau.
   - Acceptance: nút `保存` lưu toàn bộ thay đổi trong Mapping; nếu dữ liệu thiếu hoặc sai thì báo lỗi tiếng Nhật và không lưu.

10. Là Admin/Operator, tôi muốn audit history (ai/when/old/new) cho mapping để truy vết ai đã thay đổi cấu hình.
    - Acceptance: mỗi thay đổi tạo record history (createdBy, changedAt, oldValue, newValue).

11. Là Admin/Operator, tôi muốn nhập và bắt buộc validate `startDetailRow` và `validRowColumn` ngay trong màn hình Mapping để hệ thống biết dòng bắt đầu đọc chi tiết và cột xác định dòng hợp lệ.
    - Acceptance: nếu `startDetailRow` hoặc `validRowColumn` trống/không hợp lệ, hiển thị lỗi bằng tiếng Nhật và khóa thao tác `Save`, `Preview`, `Import`, `Apply Mapping`.

12. Là Admin/Operator, tôi muốn đặt tên cho từng Mapping để phân biệt các bộ quy tắc nhập liệu khác nhau.
    - Acceptance: Mapping có field `マッピング名`; không cho lưu nếu tên Mapping trống.

13. Là Admin/Operator, tôi muốn chọn `Cách lấy dữ liệu` cho từng cột CSV để mỗi cột có rule nhập liệu riêng.
    - Acceptance: mỗi dòng Mapping có `Cột trong File CSV`, `Tên Cột`, và `Cách lấy dữ liệu`.

14. Là Admin/Operator, tôi muốn cấu hình lấy dữ liệu từ file đơn hàng theo ô cố định, mảng dữ liệu hoặc công thức dựa trên dữ liệu file đơn hàng.
    - Acceptance: nếu chọn lấy từ ô cố định thì nhập ô nguồn; nếu chọn mảng thì nhập cột nguồn, dòng bắt đầu và điều kiện dòng kết thúc; nếu chọn công thức thì nhập nguồn dữ liệu và công thức.

15. Là Admin/Operator, tôi muốn chọn format dữ liệu lấy vào để dữ liệu CSV xuất ra đúng yêu cầu.
    - Acceptance: mỗi rule lấy từ file đơn hàng có thể chọn giữ nguyên format file gốc, number `00,000.00`, number bỏ phần thập phân không làm tròn, hoặc date `yyyymmdd`.

16. Là Admin/Operator, tôi muốn cấu hình đối chiếu master data giống VLOOKUP để lấy giá trị từ document master data tương ứng.
    - Acceptance: người dùng chọn cột CSV làm khóa tham chiếu, collection master data, field tham chiếu, field cần lấy ra và cột CSV nhận kết quả.

17. Là Admin/Operator, tôi muốn tick vào từng dòng Mapping để quyết định cột CSV đó có bị ẩn khi người dùng chọn chế độ xem giản lược ở phần `CSV作成` hay không.
    - Acceptance: mỗi entry có checkbox `簡易表示で非表示`; nếu được tick thì cột đó bị ẩn khi người dùng bấm `簡易表示`; nếu không tick thì cột vẫn hiển thị trong cả `簡易表示` và `全項目表示`.

## Use Cases (chi tiết)

Use Case UC-1: Xem danh sách mapping
- Preconditions: người dùng đã đăng nhập với quyền `Admin` hoặc `Operator`.
- Steps:
  1. Mở sidebar `設定`, sau đó mở tab `マッピング一覧`.
  2. Hệ thống đọc collection `importMappingConfigs` từ Firestore.
  3. Hiển thị bảng: `Name`, `StartRow`, `ValidCol`, `#Entries`, `Actions` (View/Edit/Delete/Save/Preview/Apply).
- Postconditions: danh sách mapping hiển thị; có thể click `View` để xem chi tiết entries.

Acceptance criteria:
- Danh sách load nhanh (<2s với bộ nhỏ), có pagination nếu > 50 items.

Use Case UC-2: Tạo mapping mới
- Preconditions: quyền `Admin` hoặc `Operator`.
- Steps:
  1. Click `新規マッピング`.
  2. Nhập `name`, `description` (tuỳ chọn), `startDetailRow`, `validRowColumn`.
  3. Thêm entries bằng form hoặc dán JSON vào `Entries JSON`.
  4. Validate header mapping: `startDetailRow` bắt buộc là số nguyên dương; `validRowColumn` bắt buộc là ký hiệu cột Excel hợp lệ.
  5. Validate entries: mỗi entry cần `sourceType`, `source`, `targetColumns` (non-empty), `targetColumnName`, `scope`.
  6. Click `保存` → hệ thống lưu document mới vào `importMappingConfigs` với audit metadata.
- Postconditions: mapping mới xuất hiện trong danh sách.

Acceptance criteria:
- Không lưu nếu validation fail; hiển thị lỗi rõ ràng bằng tiếng Nhật.
- Nếu thiếu `startDetailRow`, hiển thị lỗi ví dụ: `明細開始行を入力してください。`
- Nếu thiếu `validRowColumn`, hiển thị lỗi ví dụ: `有効行判定列を入力してください。`

Use Case UC-3: Chỉnh sửa mapping
- Preconditions: quyền `Admin` hoặc `Operator`, mapping tồn tại.
- Steps:
  1. Click `編集` trên mapping.
  2. Thay đổi các trường (name, startDetailRow, validRowColumn, entries).
  3. Validate và Save.
  4. Hệ thống lưu thay đổi và tạo audit record (oldValue/newValue).
- Postconditions: mapping cập nhật.

Use Case UC-4: Xóa mapping
- Preconditions: quyền `Admin` hoặc `Operator`.
- Steps:
  1. Click `削除` → show confirm modal bằng tiếng Nhật.
  2. Confirm → hệ thống xóa document (hoặc đánh dấu `deleted=true`).
  3. Ghi audit.
- Postconditions: mapping không xuất hiện trong danh sách.

Use Case UC-5: Chọn mapping khi import Excel để tạo bảng CSV
- Preconditions: đã có >=1 mapping.
- Steps:
  1. Upload file(s) trên màn hình `CSV作成`.
  2. Trước khi parse, chọn mapping template (dropdown) hoặc `default`.
  3. Hệ thống kiểm tra mapping đã chọn có `startDetailRow` và `validRowColumn` hợp lệ.
  4. Hệ thống sử dụng mapping đã chọn để parse sheet-level values and detail rows starting từ `startDetailRow`, chỉ lấy rows có giá trị ở `validRowColumn`.
  5. Tạo bảng CSV hiện tại theo đúng Mapping và hiển thị ngay trên màn hình.
- Postconditions: bảng CSV hiện tại được tạo với mapping áp dụng; không cần tạo Import Batch.

Acceptance criteria:
- Nếu mapping không hợp lệ (ví dụ `source` không tồn tại), hệ thống báo warning và cho phép chỉnh mapping trước khi apply.
- Nếu thiếu `startDetailRow` hoặc `validRowColumn`, hệ thống báo lỗi bằng tiếng Nhật và không cho parse/import tiếp.

## Data Model (suggested)
- Collection: `importMappingConfigs`
  - id
  - name
  - description
  - startDetailRow (number)
  - validRowColumn (string)
 - entries: Array of {
    - sourceType: enum("sheetCell","detailColumn","expression","generated")
    - source: string
    - targetColumns: string[]
    - targetColumnName: string
    - scope: enum("sheet","detail")
    - format?: { type: "string" | "number" | "date", format?: "yyyymmdd", offsetDays?: number }
    - hideInCompactView?: boolean
    - note?: string
  }
  - createdAt, createdBy, updatedAt, updatedBy

## UI Notes
- List view: search, filter by name, sort by name/startRow; show #entries and small preview of targets.
- Edit view: mix of form and JSON editor. For now accept JSON paste for fast edits; later provide field-level form.
- Entries list in UI should be sorted by target column order (A→B→C...).
- Entries list phải có checkbox `簡易表示で非表示` cho từng dòng Mapping. Checkbox này không ảnh hưởng export CSV; nó chỉ ảnh hưởng chế độ hiển thị giản lược trong `CSV作成`.
- Không tạo tab/menu `インポート`, `バッチ処理`, `固定値設定`, `マスタデータ`, `照明`, `エクスポート履歴` trong khu vực `設定` của Mapping.
- Tất cả text trên UI Mapping phải là tiếng Nhật. Ví dụ: `設定`, `マッピング一覧`, `新規マッピング`, `編集`, `削除`, `保存`, `プレビュー`, `適用`, `明細開始行`, `有効行判定列`, `入力してください`, `保存しました`.
- Không hiển thị text tiếng Việt/Anh cho tiêu đề, nút, alert, confirm, validation message hoặc empty state trong sản phẩm.
- UI không được ẩn quyền theo vai trò giữa `Admin` và `Operator`; cả hai role đều thấy và dùng đầy đủ action View/Create/Edit/Delete/Save/Preview/Apply Mapping.

## Validation Rules (basic)
- Each entry must have `sourceType`, `source`, `targetColumns` (non-empty), `targetColumnName` (non-empty), `scope`.
- `hideInCompactView` là optional boolean; nếu không có giá trị thì mặc định là `false`.
- `startDetailRow` is required and must be positive integer.
- `validRowColumn` is required and must be a valid Excel column name.
- For `expression` with date offset, `offsetDays` must be integer.
- Các lỗi validation của Mapping phải hiển thị bằng tiếng Nhật và phải chặn thao tác tiếp theo khi thiếu `startDetailRow` hoặc `validRowColumn`.

## Examples (from Plan.md)
- `K4` → `A` (sheetCell, sheet)
- `D4` → `E,I,J` (sheetCell, sheet, multiple targets)
- `Q7 - 1` → `X,AO` (expression with offsetDays = -1)
- detail `C` → `Z`, detail `R` → `AI` (detailColumn mappings)

---
Tôi đã dựa trên `Docs/Plan.md` và `Docs/schedule.md` để viết các user stories và use cases này. Muốn tôi bổ sung sơ đồ luồng (sequence/mermaid), mock UI form cho entries, hay chuyển sang tiếng Nhật không? 

---

## Bộ Prompt Viết Sẵn Để Chi Tiết Hóa Kế Hoạch Mapping

Mục tiêu của phần này: liệt kê sẵn các prompt có thể dùng ngay để tiếp tục chi tiết hóa yêu cầu Mapping. Người dùng chỉ cần copy một prompt, gửi cho AI/dev team, sau đó review lại kết quả. Tất cả prompt dưới đây đều dùng cho giai đoạn plan, chưa yêu cầu code.

### Prompt 01: Rà soát tổng thể tài liệu Mapping

```text
Hãy đọc file Docs/maplingusecase.md và rà soát toàn bộ kế hoạch Mapping hiện tại.

Mục tiêu:
- Làm rõ yêu cầu cho người non-tech cũng hiểu được.
- Chỉ ra phần nào đang thiếu hoặc còn mơ hồ.
- Đề xuất bổ sung vào tài liệu plan, chưa code.

Bắt buộc giữ các rule sau:
- UI/UX của Mapping phải bằng tiếng Nhật.
- Admin và Operator có full quyền như nhau trong Mapping.
- startDetailRow và validRowColumn là bắt buộc.
- Nếu thiếu startDetailRow hoặc validRowColumn thì báo lỗi tiếng Nhật và không cho lưu/import/preview/apply tiếp.

Hãy trả kết quả theo format:
1. Phần đã rõ
2. Phần còn thiếu
3. Phần cần sửa
4. Nội dung đề xuất thêm vào Docs/maplingusecase.md
```

### Prompt 02: Chi tiết hóa màn hình danh sách Mapping

```text
Hãy chi tiết hóa kế hoạch cho màn hình danh sách Mapping trong Docs/maplingusecase.md.

Người dùng mục tiêu: Admin và Operator.
Lưu ý: Admin và Operator có full quyền như nhau trong Mapping, không phân biệt.

Hãy mô tả đơn giản cho người non-tech:
- Mục tiêu màn hình
- Người dùng thấy những thông tin gì
- Các cột trong bảng Mapping
- Các nút thao tác cần có
- Bộ lọc/tìm kiếm nếu cần
- Empty state khi chưa có Mapping
- Loading state khi đang tải dữ liệu
- Lỗi khi không tải được dữ liệu
- Toàn bộ text UI bằng tiếng Nhật

Kết quả chỉ là plan, chưa code.
```

### Prompt 03: Chi tiết hóa màn hình tạo Mapping mới

```text
Hãy chi tiết hóa kế hoạch cho màn hình tạo Mapping mới.

Bối cảnh:
- Người dùng là Admin hoặc Operator.
- Admin và Operator có quyền tạo Mapping như nhau.
- Mapping phải có startDetailRow và validRowColumn.
- Nếu thiếu một trong hai field này thì không cho lưu.

Hãy viết rõ:
- Người dùng mở màn hình từ đâu
- Form cần có những field nào
- Field nào bắt buộc
- Người dùng thêm entries như thế nào
- Khi bấm lưu thì hệ thống kiểm tra gì
- Nếu hợp lệ thì hệ thống làm gì
- Nếu lỗi thì hệ thống báo gì
- Tất cả label, button, alert, validation message phải bằng tiếng Nhật

Kết quả viết đơn giản cho người non-tech và chỉ dùng cho plan, chưa code.
```

### Prompt 04: Chi tiết hóa màn hình sửa Mapping

```text
Hãy chi tiết hóa kế hoạch cho màn hình sửa Mapping.

Bối cảnh:
- Mapping đã tồn tại.
- Admin và Operator có quyền sửa như nhau.
- Người dùng có thể sửa name, description, startDetailRow, validRowColumn và entries.
- startDetailRow và validRowColumn vẫn bắt buộc khi sửa.

Hãy mô tả:
- Luồng người dùng bấm 編集 để mở form sửa
- Dữ liệu cũ được hiển thị như thế nào
- Người dùng sửa từng phần như thế nào
- Khi bấm 保存 thì validate gì
- Nếu có lỗi thì báo lỗi tiếng Nhật như thế nào
- Nếu lưu thành công thì thông báo gì
- Có cần ghi audit history gì không

Kết quả chỉ là tài liệu plan, chưa code.
```

### Prompt 05: Chi tiết hóa chức năng xóa Mapping

```text
Hãy chi tiết hóa kế hoạch cho chức năng xóa Mapping.

Bối cảnh:
- Admin và Operator đều có quyền xóa Mapping như nhau.
- Khi xóa cần có confirm modal bằng tiếng Nhật.
- Cần ghi audit history.

Hãy mô tả:
- Người dùng bấm nút nào
- Confirm modal hiển thị nội dung gì bằng tiếng Nhật
- Khi người dùng hủy thì hệ thống làm gì
- Khi người dùng xác nhận thì hệ thống làm gì
- Nên xóa thật hay đánh dấu deleted=true trong giai đoạn đầu
- Nếu xóa thất bại thì báo lỗi gì
- Nếu xóa thành công thì báo gì

Kết quả viết đơn giản cho người non-tech, chưa code.
```

### Prompt 06: Chi tiết hóa startDetailRow

```text
Hãy chi tiết hóa yêu cầu cho startDetailRow trong Mapping.

Giải thích nghiệp vụ:
startDetailRow là dòng bắt đầu đọc dữ liệu chi tiết trong file Excel đơn hàng. Ví dụ hiện tại là dòng 17.

Yêu cầu:
- Field này phải nằm trong cấu hình Mapping.
- Người dùng phải nhập được trên UI.
- Field này bắt buộc.
- Chỉ nhận số nguyên dương.
- Nếu trống hoặc không hợp lệ thì báo lỗi tiếng Nhật.
- Khi lỗi thì không cho lưu Mapping, preview, import hoặc apply mapping.

Hãy viết rõ:
- Label tiếng Nhật
- Placeholder tiếng Nhật
- Giá trị gợi ý/mặc định nếu có
- Các rule validation
- Thông báo lỗi tiếng Nhật cho từng trường hợp
- Acceptance criteria

Kết quả chỉ là plan, chưa code.
```

### Prompt 07: Chi tiết hóa validRowColumn

```text
Hãy chi tiết hóa yêu cầu cho validRowColumn trong Mapping.

Giải thích nghiệp vụ:
validRowColumn là cột Excel dùng để xác định một dòng chi tiết có hợp lệ hay không. Ví dụ hiện tại là cột R.

Yêu cầu:
- Field này phải nằm trong cấu hình Mapping.
- Người dùng phải nhập được trên UI.
- Field này bắt buộc.
- Chỉ nhận tên cột Excel hợp lệ, ví dụ A, R, AA.
- Nếu trống hoặc không hợp lệ thì báo lỗi tiếng Nhật.
- Khi lỗi thì không cho lưu Mapping, preview, import hoặc apply mapping.

Hãy viết rõ:
- Label tiếng Nhật
- Placeholder tiếng Nhật
- Giá trị gợi ý/mặc định nếu có
- Các rule validation
- Thông báo lỗi tiếng Nhật cho từng trường hợp
- Acceptance criteria

Kết quả chỉ là plan, chưa code.
```

### Prompt 08: Chi tiết hóa validation Mapping

```text
Hãy chi tiết hóa toàn bộ validation cho Mapping.

Cần bao gồm:
- Validation cho name
- Validation cho startDetailRow
- Validation cho validRowColumn
- Validation cho entries
- Validation cho sourceType
- Validation cho source
- Validation cho targetColumns
- Validation cho targetColumnName / CSV項目名
- Validation cho scope
- Validation cho format date/number/string
- Validation cho expression như Q7 - 1

Rule bắt buộc:
- startDetailRow và validRowColumn là bắt buộc.
- Nếu thiếu hoặc sai thì báo lỗi tiếng Nhật.
- Khi có lỗi critical thì không cho lưu, preview, import hoặc apply mapping.

Hãy viết kết quả theo bảng:
- Field
- Rule
- Khi nào lỗi
- Message tiếng Nhật
- Có chặn thao tác tiếp không

Chỉ làm plan, chưa code.
```

---

## Chi Tiết Kế Hoạch: Màn Hình Tạo Mapping Mới

Phần này mô tả màn hình tạo Mapping mới ở mức dễ hiểu cho người non-tech. Đây chỉ là kế hoạch, chưa phải yêu cầu triển khai code.

### 1. Mục tiêu màn hình

Màn hình tạo Mapping mới giúp `Admin` hoặc `Operator` tạo một cấu hình Mapping để hệ thống biết cách đọc file Excel đơn hàng và đưa dữ liệu sang CSV.

Mapping mới phải có đủ:

- Tên Mapping.
- Dòng bắt đầu đọc chi tiết: `startDetailRow`.
- Cột xác định dòng chi tiết hợp lệ: `validRowColumn`.
- Danh sách entries, tức danh sách quy định dữ liệu lấy từ đâu và đưa vào cột CSV nào.

Tên màn hình hiển thị bằng tiếng Nhật:

- `新規マッピング`

### 2. Người dùng mở màn hình từ đâu

Luồng mở màn hình:

1. Người dùng mở màn hình danh sách Mapping: `マッピング一覧`.
2. Người dùng bấm nút `新規マッピング`.
3. Hệ thống mở màn hình hoặc modal tạo Mapping mới: `新規マッピング`.

Rule quyền:

- `Admin` được bấm `新規マッピング`.
- `Operator` cũng được bấm `新規マッピング`.
- Không phân biệt quyền giữa `Admin` và `Operator`.
- Nếu `Admin` tạo được Mapping thì `Operator` cũng phải tạo được Mapping.

### 3. Form cần có những field nào

Form tạo Mapping mới nên có các field sau:

| Field nghiệp vụ | Text tiếng Nhật trên UI | Bắt buộc | Ý nghĩa |
| --- | --- | --- | --- |
| Tên Mapping | `マッピング名` | Có | Tên để người dùng nhận biết Mapping |
| Mô tả | `説明` | Không | Ghi chú Mapping dùng cho form/khách hàng nào |
| Dòng bắt đầu chi tiết | `明細開始行` | Có | Dòng Excel bắt đầu đọc dữ liệu chi tiết, ví dụ `17` |
| Cột xác định dòng hợp lệ | `有効行判定列` | Có | Cột Excel dùng để biết dòng nào là dòng hợp lệ, ví dụ `R` |
| Danh sách entries | `マッピング設定` | Có | Danh sách nguồn Excel và cột CSV đích |
| Ghi chú nội bộ nếu cần | `備考` | Không | Ghi chú thêm cho người quản lý |

Placeholder tiếng Nhật đề xuất:

| Field | Placeholder |
| --- | --- |
| `マッピング名` | `例：標準注文書マッピング` |
| `説明` | `例：MHB標準注文書用` |
| `明細開始行` | `例：17` |
| `有効行判定列` | `例：R` |
| `備考` | `必要に応じて入力してください。` |

### 4. Field bắt buộc

Các field bắt buộc:

- `マッピング名`
- `明細開始行`
- `有効行判定列`
- `マッピング設定`

Rule quan trọng:

- `明細開始行` tương ứng `startDetailRow`, bắt buộc nhập.
- `有効行判定列` tương ứng `validRowColumn`, bắt buộc nhập.
- Nếu thiếu một trong hai field này, không cho lưu Mapping.

### 5. Người dùng thêm entries như thế nào

Entry là một dòng cấu hình nói rằng hệ thống lấy dữ liệu từ đâu trong Excel và đưa vào cột nào trong CSV.

Người dùng có thể thêm entry theo 2 cách trong plan:

1. Thêm bằng form từng dòng.
2. Dán JSON nếu cần thao tác nhanh cho người hiểu cấu hình.

Trong giai đoạn ưu tiên cho người non-tech, nên ưu tiên form từng dòng.

Mỗi entry nên có các field:

| Field entry | Text tiếng Nhật trên UI | Bắt buộc | Ví dụ |
| --- | --- | --- | --- |
| Loại nguồn | `取得方法` | Có | `固定セル`, `明細列`, `計算式`, `自動生成` |
| Nguồn | `取得元` | Có | `K4`, `D4`, `Q7 - 1`, `R` |
| Cột CSV đích | `出力先列` | Có | `A`, `E,I,J`, `AI` |
| Tên cột trong file CSV | `CSV項目名` | Có | `会社コード`, `得意先コード`, `受注数` |
| Phạm vi | `適用範囲` | Có | `シート`, `明細` |
| Định dạng | `形式` | Không | `文字列`, `数値`, `日付` |
| Ẩn khi xem giản lược | `簡易表示で非表示` | Không | Checkbox |
| Ghi chú | `メモ` | Không | Ghi chú cho entry |

`CSV項目名` là tên tiêu đề của cột trong file CSV, không phải ký hiệu cột. Ví dụ `出力先列` là `AI`, còn `CSV項目名` là `受注数`.

Nút thao tác entries:

| Nút | Text tiếng Nhật | Mục đích |
| --- | --- | --- |
| Thêm entry | `行を追加` | Thêm một dòng Mapping |
| Xóa entry | `削除` | Xóa dòng Mapping |
| Sao chép entry | `コピー` | Sao chép một dòng Mapping nếu cần |
| Sắp xếp theo cột CSV | `出力先列順に並べ替え` | Sắp xếp entries theo thứ tự cột CSV |

`簡易表示で非表示` là checkbox dùng để liên kết với phần 3 `CSV作成`. Nếu người dùng tick checkbox này, cột CSV của entry đó sẽ bị ẩn khi người dùng bấm `簡易表示`. Nếu không tick, cột vẫn hiển thị trong cả `簡易表示` và `全項目表示`.

Ví dụ entry dễ hiểu:

| 取得方法 | 取得元 | 出力先列 | CSV項目名 | 適用範囲 | 形式 | 簡易表示で非表示 |
| --- | --- | --- | --- | --- | --- | --- |
| `固定セル` | `K4` | `A` | `会社コード` | `シート` | `文字列` | Không tick |
| `固定セル` | `D4` | `E,I,J` | `得意先コード` | `シート` | `文字列` | Tick nếu muốn ẩn khi xem giản lược |
| `計算式` | `Q7 - 1` | `X,AO` | `出荷予定日` | `シート` | `日付` | Không tick |
| `明細列` | `R` | `AI` | `受注数` | `明細` | `数値` | Không tick |

### 6. Nút trên màn hình

Các nút cần có:

| Nút | Text tiếng Nhật | Mục đích |
| --- | --- | --- |
| Lưu | `保存` | Lưu Mapping mới |
| Hủy | `キャンセル` | Hủy tạo Mapping và quay lại danh sách |
| Preview | `プレビュー` | Xem thử Mapping trước khi lưu/apply nếu có file mẫu |
| Thêm entry | `行を追加` | Thêm dòng cấu hình Mapping |

Trong giai đoạn đầu, nếu chưa làm preview trên màn hình tạo mới, có thể để `プレビュー` là chức năng sau. Tuy nhiên nếu có preview thì vẫn phải validate `明細開始行` và `有効行判定列` trước.

### 7. Khi bấm lưu thì hệ thống kiểm tra gì

Khi người dùng bấm `保存`, hệ thống cần kiểm tra:

1. `マッピング名` có được nhập chưa.
2. `明細開始行` có được nhập chưa.
3. `明細開始行` có phải số nguyên dương không.
4. `有効行判定列` có được nhập chưa.
5. `有効行判定列` có phải tên cột Excel hợp lệ không, ví dụ `A`, `R`, `AA`.
6. `マッピング設定` có ít nhất 1 entry không.
7. Mỗi entry có đủ `取得方法`, `取得元`, `出力先列`, `CSV項目名`, `適用範囲` không.
8. `出力先列` có phải cột CSV hợp lệ không.
9. `CSV項目名` có được nhập không.
10. Nếu một entry map sang nhiều `出力先列`, `CSV項目名` phải đủ rõ để người dùng biết các cột đích đó là tiêu đề gì trong file CSV.
11. `簡易表示で非表示` nếu không có giá trị thì mặc định là không tick.
12. Nếu entry là `計算式`, expression có đúng định dạng hỗ trợ không.
13. Nếu format là ngày, có khai báo format ngày rõ không.
14. Tên Mapping có bị trùng với Mapping khác không, nếu hệ thống không cho trùng tên.

### 8. Nếu hợp lệ thì hệ thống làm gì

Nếu tất cả dữ liệu hợp lệ:

1. Hệ thống lưu Mapping mới vào danh sách cấu hình.
2. Hệ thống ghi người tạo và thời gian tạo.
3. Hệ thống ghi audit history loại thao tác là tạo mới.
4. Hệ thống hiển thị thông báo thành công.
5. Hệ thống quay lại màn hình `マッピング一覧` hoặc mở màn hình chi tiết Mapping vừa tạo.

Thông báo tiếng Nhật đề xuất:

- `保存しました。`

Nếu muốn rõ hơn:

- `マッピングを作成しました。`

### 9. Nếu lỗi thì hệ thống báo gì

Nếu có lỗi, hệ thống không lưu Mapping và hiển thị lỗi bằng tiếng Nhật tại field liên quan.

Bảng lỗi đề xuất:

| Lỗi | Message tiếng Nhật | Chặn lưu |
| --- | --- | --- |
| Thiếu tên Mapping | `マッピング名を入力してください。` | Có |
| Thiếu startDetailRow | `明細開始行を入力してください。` | Có |
| startDetailRow không phải số | `明細開始行は数字で入力してください。` | Có |
| startDetailRow nhỏ hơn 1 | `明細開始行は1以上の数字で入力してください。` | Có |
| Thiếu validRowColumn | `有効行判定列を入力してください。` | Có |
| validRowColumn sai định dạng | `有効行判定列はExcelの列名で入力してください。` | Có |
| Chưa có entry nào | `マッピング設定を1件以上追加してください。` | Có |
| Entry thiếu loại nguồn | `取得方法を選択してください。` | Có |
| Entry thiếu nguồn | `取得元を入力してください。` | Có |
| Entry thiếu cột đích | `出力先列を入力してください。` | Có |
| Entry thiếu tên cột CSV | `CSV項目名を入力してください。` | Có |
| Entry thiếu phạm vi | `適用範囲を選択してください。` | Có |
| Expression sai | `計算式の形式が正しくありません。` | Có |
| Tên Mapping bị trùng | `同じマッピング名が既に存在します。` | Có nếu không cho trùng |

Lỗi tổng quát nếu lưu thất bại:

- `保存できませんでした。時間をおいて再度お試しください。`

### 10. Luồng thao tác tạo Mapping mới

Luồng cơ bản:

1. Người dùng mở `マッピング一覧`.
2. Người dùng bấm `新規マッピング`.
3. Hệ thống mở form `新規マッピング`.
4. Người dùng nhập `マッピング名`.
5. Người dùng nhập `明細開始行`, ví dụ `17`.
6. Người dùng nhập `有効行判定列`, ví dụ `R`.
7. Người dùng thêm ít nhất 1 dòng trong `マッピング設定`.
8. Người dùng bấm `保存`.
9. Hệ thống kiểm tra dữ liệu.
10. Nếu hợp lệ, hệ thống lưu và báo `マッピングを作成しました。`
11. Nếu lỗi, hệ thống báo lỗi tiếng Nhật tại field liên quan và không lưu.

### 11. Rule chặn thao tác

Các trường hợp bắt buộc chặn `保存`:

- Thiếu `マッピング名`.
- Thiếu `明細開始行`.
- `明細開始行` không hợp lệ.
- Thiếu `有効行判定列`.
- `有効行判定列` không hợp lệ.
- Không có entry nào.
- Entry thiếu thông tin bắt buộc.

Các trường hợp chặn `プレビュー` nếu preview có trên màn hình tạo:

- Thiếu `明細開始行`.
- `明細開始行` không hợp lệ.
- Thiếu `有効行判定列`.
- `有効行判定列` không hợp lệ.
- Không có entry nào.

### 12. Acceptance criteria cho màn hình tạo Mapping mới

- [ ] `Admin` mở được màn hình `新規マッピング`.
- [ ] `Operator` mở được màn hình `新規マッピング` giống `Admin`.
- [ ] Form có field `マッピング名`.
- [ ] Form có field `説明`.
- [ ] Form có field `明細開始行`.
- [ ] Form có field `有効行判定列`.
- [ ] Form có khu vực `マッピング設定`.
- [ ] Người dùng thêm được entry bằng nút `行を追加`.
- [ ] Có nút `保存`.
- [ ] Có nút `キャンセル`.
- [ ] Thiếu `マッピング名` thì báo `マッピング名を入力してください。`
- [ ] Thiếu `明細開始行` thì báo `明細開始行を入力してください。`
- [ ] `明細開始行` không hợp lệ thì không cho lưu.
- [ ] Thiếu `有効行判定列` thì báo `有効行判定列を入力してください。`
- [ ] `有効行判定列` không hợp lệ thì không cho lưu.
- [ ] Không có entry thì báo `マッピング設定を1件以上追加してください。`
- [ ] Entry thiếu `CSV項目名` thì báo `CSV項目名を入力してください。`
- [ ] Mỗi entry có checkbox `簡易表示で非表示`.
- [ ] Nếu tick `簡易表示で非表示`, Mapping lưu entry với `hideInCompactView=true`.
- [ ] Nếu không tick `簡易表示で非表示`, Mapping lưu entry với `hideInCompactView=false` hoặc hiểu mặc định là `false`.
- [ ] Dữ liệu hợp lệ thì lưu Mapping mới.
- [ ] Lưu thành công thì báo `マッピングを作成しました。`
- [ ] Tạo Mapping phải ghi audit history.
- [ ] Toàn bộ label, button, alert, validation message hiển thị bằng tiếng Nhật.

---

## Chi Tiết Kế Hoạch: Màn Hình Sửa Mapping

Phần này mô tả màn hình sửa Mapping ở mức dễ hiểu cho người non-tech. Đây chỉ là kế hoạch, chưa phải yêu cầu triển khai code.

### 1. Mục tiêu màn hình

Màn hình sửa Mapping giúp `Admin` hoặc `Operator` cập nhật một Mapping đã tồn tại khi file Excel đơn hàng, rule đọc dữ liệu, hoặc cột CSV đích có thay đổi.

Người dùng có thể sửa:

- Tên Mapping.
- Mô tả Mapping.
- `startDetailRow`, hiển thị trên UI là `明細開始行`.
- `validRowColumn`, hiển thị trên UI là `有効行判定列`.
- Danh sách entries, hiển thị trên UI là `マッピング設定`.

Tên màn hình hiển thị bằng tiếng Nhật:

- `マッピング編集`

### 2. Người dùng bấm 編集 để mở form sửa

Luồng mở màn hình sửa:

1. Người dùng mở màn hình danh sách Mapping: `マッピング一覧`.
2. Người dùng tìm Mapping cần sửa.
3. Người dùng bấm nút `編集` trên dòng Mapping đó.
4. Hệ thống mở màn hình hoặc modal `マッピング編集`.
5. Hệ thống tải dữ liệu hiện tại của Mapping và hiển thị lên form.

Rule quyền:

- `Admin` được bấm `編集`.
- `Operator` cũng được bấm `編集`.
- Không phân biệt quyền sửa giữa `Admin` và `Operator`.
- Nếu `Admin` sửa được Mapping thì `Operator` cũng phải sửa được Mapping.

### 3. Dữ liệu cũ được hiển thị như thế nào

Khi mở màn hình `マッピング編集`, hệ thống phải hiển thị dữ liệu hiện tại của Mapping để người dùng biết mình đang sửa gì.

Các dữ liệu cũ cần hiển thị:

| Dữ liệu hiện tại | Text tiếng Nhật trên UI | Cách hiển thị |
| --- | --- | --- |
| Tên Mapping | `マッピング名` | Điền sẵn vào input |
| Mô tả | `説明` | Điền sẵn vào textarea/input |
| Dòng bắt đầu chi tiết | `明細開始行` | Điền sẵn giá trị hiện tại, ví dụ `17` |
| Cột xác định dòng hợp lệ | `有効行判定列` | Điền sẵn giá trị hiện tại, ví dụ `R` |
| Entries | `マッピング設定` | Hiển thị danh sách dòng cấu hình hiện tại |
| Người cập nhật cuối | `最終更新者` | Chỉ hiển thị để tham khảo |
| Thời gian cập nhật cuối | `最終更新日時` | Chỉ hiển thị để tham khảo |

Nếu Mapping đang thiếu `明細開始行` hoặc `有効行判定列`, form vẫn mở được để người dùng sửa. Field bị thiếu phải hiển thị lỗi ngay hoặc đánh dấu cần nhập.

Thông báo gợi ý:

- Thiếu `明細開始行`: `明細開始行を入力してください。`
- Thiếu `有効行判定列`: `有効行判定列を入力してください。`

### 4. Người dùng sửa từng phần như thế nào

Người dùng có thể sửa các phần sau.

#### 4.1. Sửa thông tin cơ bản

Các field có thể sửa:

- `マッピング名`
- `説明`
- `明細開始行`
- `有効行判定列`
- `備考` nếu có

Lưu ý:

- `明細開始行` vẫn bắt buộc khi sửa.
- `有効行判定列` vẫn bắt buộc khi sửa.
- Không được cho lưu nếu một trong hai field này trống hoặc không hợp lệ.

#### 4.2. Sửa entries

Người dùng có thể sửa `マッピング設定`.

Các thao tác trên entries:

| Thao tác | Text tiếng Nhật | Ý nghĩa |
| --- | --- | --- |
| Thêm entry | `行を追加` | Thêm dòng Mapping mới |
| Sửa entry | `編集` | Sửa dòng Mapping hiện tại |
| Xóa entry | `削除` | Xóa dòng Mapping không cần nữa |
| Sao chép entry | `コピー` | Sao chép dòng Mapping để sửa nhanh |
| Sắp xếp | `出力先列順に並べ替え` | Sắp xếp theo cột CSV đích |

Mỗi entry có thể sửa:

- `取得方法`
- `取得元`
- `出力先列`
- `CSV項目名`
- `適用範囲`
- `形式`
- `メモ`

#### 4.3. Hủy thay đổi

Nếu người dùng bấm `キャンセル`, hệ thống không lưu thay đổi và quay lại màn hình trước.

Nếu người dùng đã sửa dữ liệu nhưng chưa lưu, nên có confirm bằng tiếng Nhật:

- `変更内容が保存されていません。破棄してもよろしいですか？`

Nút confirm:

- Đồng ý hủy: `破棄する`
- Tiếp tục sửa: `編集を続ける`

### 5. Khi bấm 保存 thì validate gì

Khi người dùng bấm `保存`, hệ thống cần kiểm tra lại toàn bộ Mapping sau khi sửa.

Các validation cần có:

1. `マッピング名` có được nhập chưa.
2. `明細開始行` có được nhập chưa.
3. `明細開始行` có phải số nguyên dương không.
4. `有効行判定列` có được nhập chưa.
5. `有効行判定列` có phải tên cột Excel hợp lệ không, ví dụ `A`, `R`, `AA`.
6. `マッピング設定` có ít nhất 1 entry không.
7. Mỗi entry có đủ `取得方法`, `取得元`, `出力先列`, `CSV項目名`, `適用範囲` không.
8. `出力先列` có phải cột CSV hợp lệ không.
9. `CSV項目名` có được nhập không.
10. Nếu entry là `計算式`, expression có đúng định dạng hỗ trợ không.
11. Nếu tên Mapping bị đổi, tên mới có bị trùng Mapping khác không.

Rule bắt buộc:

- Nếu thiếu `明細開始行`, không cho lưu.
- Nếu thiếu `有効行判定列`, không cho lưu.
- Nếu hai field này không hợp lệ, không cho lưu.

### 6. Nếu có lỗi thì báo lỗi tiếng Nhật như thế nào

Nếu có lỗi, hệ thống không lưu Mapping và hiển thị lỗi bằng tiếng Nhật tại field liên quan.

| Lỗi | Message tiếng Nhật | Chặn lưu |
| --- | --- | --- |
| Thiếu tên Mapping | `マッピング名を入力してください。` | Có |
| Thiếu startDetailRow | `明細開始行を入力してください。` | Có |
| startDetailRow không phải số | `明細開始行は数字で入力してください。` | Có |
| startDetailRow nhỏ hơn 1 | `明細開始行は1以上の数字で入力してください。` | Có |
| Thiếu validRowColumn | `有効行判定列を入力してください。` | Có |
| validRowColumn sai định dạng | `有効行判定列はExcelの列名で入力してください。` | Có |
| Không có entry nào | `マッピング設定を1件以上追加してください。` | Có |
| Entry thiếu loại nguồn | `取得方法を選択してください。` | Có |
| Entry thiếu nguồn | `取得元を入力してください。` | Có |
| Entry thiếu cột đích | `出力先列を入力してください。` | Có |
| Entry thiếu tên cột CSV | `CSV項目名を入力してください。` | Có |
| Entry thiếu phạm vi | `適用範囲を選択してください。` | Có |
| Expression sai | `計算式の形式が正しくありません。` | Có |
| Tên Mapping bị trùng | `同じマッピング名が既に存在します。` | Có nếu không cho trùng |

Lỗi tổng quát nếu lưu thất bại:

- `保存できませんでした。時間をおいて再度お試しください。`

### 7. Nếu lưu thành công thì hệ thống làm gì

Nếu dữ liệu hợp lệ và lưu thành công:

1. Hệ thống cập nhật Mapping.
2. Hệ thống cập nhật `updatedAt` và `updatedBy`.
3. Hệ thống ghi audit history.
4. Hệ thống hiển thị thông báo thành công.
5. Hệ thống quay lại `マッピング一覧` hoặc ở lại màn hình chi tiết/sửa tùy thiết kế.

Thông báo tiếng Nhật đề xuất:

- `保存しました。`

Nếu muốn rõ hơn:

- `マッピングを更新しました。`

### 8. Audit history khi sửa Mapping

Cần ghi audit history khi người dùng sửa Mapping.

Lý do:

- Biết ai đã sửa Mapping.
- Biết sửa lúc nào.
- Biết sửa field nào.
- Có thể truy vết nếu import Excel bị sai sau khi Mapping thay đổi.

Thông tin audit nên lưu:

| Thông tin | Ý nghĩa |
| --- | --- |
| Người thao tác | Ai sửa Mapping |
| Thời gian thao tác | Sửa lúc nào |
| Loại thao tác | `更新` |
| Giá trị trước khi sửa | Dữ liệu cũ |
| Giá trị sau khi sửa | Dữ liệu mới |
| Mapping ID | Mapping nào bị sửa |
| Mapping name | Tên Mapping tại thời điểm sửa |

Các thay đổi quan trọng cần ghi rõ:

- Đổi `マッピング名`.
- Đổi `説明`.
- Đổi `明細開始行`.
- Đổi `有効行判定列`.
- Thêm/sửa/xóa entry trong `マッピング設定`.
- Đổi `CSV項目名` trong entry.

### 9. Luồng thao tác sửa Mapping

Luồng cơ bản:

1. Người dùng mở `マッピング一覧`.
2. Người dùng bấm `編集` trên Mapping cần sửa.
3. Hệ thống mở `マッピング編集`.
4. Hệ thống hiển thị dữ liệu hiện tại.
5. Người dùng sửa thông tin cần thay đổi.
6. Người dùng bấm `保存`.
7. Hệ thống validate toàn bộ dữ liệu.
8. Nếu có lỗi, hệ thống hiển thị lỗi tiếng Nhật và không lưu.
9. Nếu hợp lệ, hệ thống lưu thay đổi.
10. Hệ thống ghi audit history.
11. Hệ thống báo `マッピングを更新しました。`

### 10. Rule chặn thao tác

Các trường hợp bắt buộc chặn `保存`:

- Thiếu `マッピング名`.
- Thiếu `明細開始行`.
- `明細開始行` không hợp lệ.
- Thiếu `有効行判定列`.
- `有効行判定列` không hợp lệ.
- Không có entry nào.
- Entry thiếu thông tin bắt buộc.

Các trường hợp chặn `プレビュー` nếu preview có trên màn hình sửa:

- Thiếu `明細開始行`.
- `明細開始行` không hợp lệ.
- Thiếu `有効行判定列`.
- `有効行判定列` không hợp lệ.
- Không có entry nào.

### 11. Acceptance criteria cho màn hình sửa Mapping

- [ ] `Admin` mở được màn hình `マッピング編集`.
- [ ] `Operator` mở được màn hình `マッピング編集` giống `Admin`.
- [ ] Người dùng mở màn hình sửa bằng nút `編集`.
- [ ] Form hiển thị dữ liệu cũ của Mapping.
- [ ] Form có field `マッピング名`.
- [ ] Form có field `説明`.
- [ ] Form có field `明細開始行`.
- [ ] Form có field `有効行判定列`.
- [ ] Form có khu vực `マッピング設定`.
- [ ] Người dùng sửa được entries.
- [ ] Có nút `保存`.
- [ ] Có nút `キャンセル`.
- [ ] Thiếu `マッピング名` thì báo `マッピング名を入力してください。`
- [ ] Thiếu `明細開始行` thì báo `明細開始行を入力してください。`
- [ ] `明細開始行` không hợp lệ thì không cho lưu.
- [ ] Thiếu `有効行判定列` thì báo `有効行判定列を入力してください。`
- [ ] `有効行判定列` không hợp lệ thì không cho lưu.
- [ ] Không có entry thì báo `マッピング設定を1件以上追加してください。`
- [ ] Entry thiếu `CSV項目名` thì báo `CSV項目名を入力してください。`
- [ ] Dữ liệu hợp lệ thì cập nhật Mapping.
- [ ] Lưu thành công thì báo `マッピングを更新しました。`
- [ ] Sửa Mapping phải ghi audit history.
- [ ] Toàn bộ label, button, alert, validation message hiển thị bằng tiếng Nhật.

---

## Chi Tiết Kế Hoạch: Chức Năng Xóa Mapping

Phần này mô tả chức năng xóa Mapping ở mức dễ hiểu cho người non-tech. Đây chỉ là kế hoạch, chưa phải yêu cầu triển khai code.

### 1. Mục tiêu chức năng

Chức năng xóa Mapping giúp người dùng loại bỏ những Mapping không còn sử dụng, bị tạo nhầm, hoặc đã được thay thế bằng Mapping mới.

Người dùng mục tiêu:

- `Admin`
- `Operator`

Rule quyền:

- `Admin` và `Operator` đều có quyền xóa Mapping như nhau.
- Không phân biệt quyền xóa giữa `Admin` và `Operator`.
- Nếu `Admin` thấy nút `削除`, `Operator` cũng phải thấy nút `削除`.
- Nếu `Admin` xóa được Mapping, `Operator` cũng phải xóa được Mapping.

### 2. Người dùng bấm nút nào

Luồng bắt đầu xóa:

1. Người dùng mở màn hình danh sách Mapping: `マッピング一覧`.
2. Người dùng tìm Mapping muốn xóa.
3. Người dùng bấm nút `削除` trên dòng Mapping đó.
4. Hệ thống không xóa ngay, mà phải mở confirm modal để người dùng xác nhận.

Text nút:

- `削除`

Không được xóa ngay khi vừa bấm `削除`, vì thao tác xóa có rủi ro làm mất cấu hình đang dùng.

### 3. Confirm modal hiển thị nội dung gì bằng tiếng Nhật

Confirm modal cần hiển thị rõ Mapping nào sắp bị xóa và hậu quả sau khi xóa.

Tiêu đề modal:

- `マッピングを削除しますか？`

Nội dung modal đề xuất:

- `このマッピングを削除すると、一覧に表示されなくなります。`
- `削除後、このマッピングはインポートや適用に使用できません。`
- `本当に削除してもよろしいですか？`

Nếu muốn hiển thị tên Mapping:

- `対象マッピング：{マッピング名}`

Nút trong modal:

| Nút | Text tiếng Nhật | Ý nghĩa |
| --- | --- | --- |
| Hủy | `キャンセル` | Không xóa, đóng modal |
| Xác nhận xóa | `削除する` | Thực hiện xóa Mapping |

Nút `削除する` nên được thiết kế là thao tác nguy hiểm để người dùng dễ nhận biết.

### 4. Khi người dùng hủy thì hệ thống làm gì

Nếu người dùng bấm `キャンセル`:

1. Hệ thống đóng confirm modal.
2. Hệ thống không thay đổi dữ liệu Mapping.
3. Mapping vẫn hiển thị trong danh sách.
4. Không ghi audit history vì không có thay đổi thật.

Không cần hiển thị thông báo thành công khi hủy. Người dùng chỉ cần quay lại danh sách bình thường.

### 5. Khi người dùng xác nhận thì hệ thống làm gì

Nếu người dùng bấm `削除する`:

1. Hệ thống kiểm tra lại Mapping còn tồn tại không.
2. Hệ thống kiểm tra người dùng là `Admin` hoặc `Operator`.
3. Hệ thống thực hiện xóa theo cách đã chọn trong plan.
4. Hệ thống ghi audit history.
5. Hệ thống đóng modal.
6. Hệ thống cập nhật lại danh sách Mapping.
7. Hệ thống hiển thị thông báo xóa thành công.

Thông báo thành công tiếng Nhật:

- `マッピングを削除しました。`

### 6. Nên xóa thật hay đánh dấu deleted=true trong giai đoạn đầu

Trong giai đoạn đầu, nên dùng soft delete, tức đánh dấu:

- `deleted = true`

Không nên xóa thật khỏi database ngay.

Lý do chọn soft delete:

- Có thể truy vết lịch sử nếu sau này cần kiểm tra.
- Giảm rủi ro xóa nhầm Mapping.
- Audit history vẫn có thể tham chiếu Mapping đã bị xóa.
- Có thể khôi phục thủ công nếu cần.

Khi dùng soft delete:

- Mapping có `deleted=true` không hiển thị trong danh sách mặc định.
- Mapping có `deleted=true` không được dùng để import.
- Mapping có `deleted=true` không được preview.
- Mapping có `deleted=true` không được apply.
- Audit history vẫn giữ lại thao tác xóa.

Nếu sau này cần chức năng khôi phục, có thể bổ sung nút `復元`.

### 7. Có cần kiểm tra Mapping đang được dùng không

Trước khi xóa, hệ thống nên kiểm tra Mapping có đang được dùng trong phiên xử lý import/export hiện tại không nếu app có trạng thái xử lý đang mở.

Giai đoạn đầu có thể xử lý đơn giản:

- Vẫn cho xóa mềm.
- Nhưng confirm modal nên cảnh báo nếu Mapping đang được chọn ở màn hình `CSV作成`.

Thông báo cảnh báo đề xuất:

- `このマッピングはCSV作成画面で使用中です。削除してもよろしいですか。`

Nếu Mapping đang được dùng trong phiên xử lý đang mở và việc xóa có thể làm mất dữ liệu đang xem/sửa, hệ thống nên chặn xóa hoặc yêu cầu người dùng đóng phiên xử lý trước.

Message chặn xóa đề xuất:

- `CSV作成画面で使用中のため、削除できません。`

### 8. Nếu xóa thất bại thì báo lỗi gì

Nếu hệ thống xóa thất bại, cần báo lỗi bằng tiếng Nhật và giữ Mapping trong danh sách.

Các lỗi đề xuất:

| Trường hợp lỗi | Message tiếng Nhật | Hệ thống làm gì |
| --- | --- | --- |
| Lỗi hệ thống | `削除できませんでした。時間をおいて再度お試しください。` | Không xóa |
| Mapping không tồn tại | `対象のマッピングが見つかりません。` | Tải lại danh sách |
| Không có quyền | `マッピングを削除する権限がありません。` | Không xóa |
| Đang được màn hình CSV作成 sử dụng | `CSV作成画面で使用中のため、削除できません。` | Không xóa |

Lưu ý:

- Với `Admin` và `Operator`, hệ thống không được báo thiếu quyền nếu họ đã đăng nhập hợp lệ.
- Message thiếu quyền chỉ dùng cho role khác như `Viewer` nếu có.

### 9. Nếu xóa thành công thì báo gì

Nếu xóa thành công, hiển thị:

- `マッピングを削除しました。`

Sau đó:

- Mapping biến mất khỏi danh sách mặc định.
- Danh sách được cập nhật lại.
- Audit history có thêm record xóa.

Nếu dùng filter xem dữ liệu đã xóa ở giai đoạn sau, Mapping có thể xuất hiện với trạng thái:

- `削除済み`

### 10. Audit history khi xóa Mapping

Cần ghi audit history khi xóa Mapping.

Thông tin audit nên lưu:

| Thông tin | Ý nghĩa |
| --- | --- |
| Người thao tác | Ai xóa Mapping |
| Thời gian thao tác | Xóa lúc nào |
| Loại thao tác | `削除` |
| Mapping ID | Mapping nào bị xóa |
| Mapping name | Tên Mapping tại thời điểm xóa |
| Giá trị trước khi xóa | Toàn bộ cấu hình Mapping trước khi xóa |
| Giá trị sau khi xóa | `deleted=true` |

Audit history giúp truy vết nếu người dùng hỏi:

- Ai đã xóa Mapping?
- Xóa lúc nào?
- Mapping trước khi xóa có cấu hình gì?

### 11. Luồng thao tác xóa Mapping

Luồng cơ bản:

1. Người dùng mở `マッピング一覧`.
2. Người dùng bấm `削除` trên Mapping cần xóa.
3. Hệ thống mở confirm modal `マッピングを削除しますか？`
4. Nếu người dùng bấm `キャンセル`, hệ thống đóng modal và không xóa.
5. Nếu người dùng bấm `削除する`, hệ thống thực hiện soft delete.
6. Hệ thống ghi audit history.
7. Hệ thống cập nhật danh sách.
8. Hệ thống báo `マッピングを削除しました。`

### 12. Acceptance criteria cho chức năng xóa Mapping

- [ ] `Admin` thấy nút `削除`.
- [ ] `Operator` thấy nút `削除` giống `Admin`.
- [ ] `Admin` xóa được Mapping.
- [ ] `Operator` xóa được Mapping giống `Admin`.
- [ ] Bấm `削除` không xóa ngay.
- [ ] Bấm `削除` phải mở confirm modal.
- [ ] Confirm modal có tiêu đề `マッピングを削除しますか？`
- [ ] Confirm modal có nút `キャンセル`.
- [ ] Confirm modal có nút `削除する`.
- [ ] Bấm `キャンセル` thì không thay đổi dữ liệu.
- [ ] Bấm `削除する` thì Mapping được đánh dấu `deleted=true`.
- [ ] Mapping đã xóa không hiển thị trong danh sách mặc định.
- [ ] Mapping đã xóa không được import/preview/apply.
- [ ] Xóa thành công thì báo `マッピングを削除しました。`
- [ ] Xóa thất bại thì báo `削除できませんでした。時間をおいて再度お試しください。`
- [ ] Xóa Mapping phải ghi audit history.
- [ ] Toàn bộ confirm, button, alert, validation/error message hiển thị bằng tiếng Nhật.

---

## Chi Tiết Yêu Cầu: startDetailRow Trong Mapping

Phần này mô tả chi tiết yêu cầu cho `startDetailRow` ở mức dễ hiểu cho người non-tech. Đây chỉ là kế hoạch, chưa phải yêu cầu triển khai code.

### 1. Ý nghĩa nghiệp vụ

`startDetailRow` là dòng bắt đầu đọc dữ liệu chi tiết trong file Excel đơn hàng.

Ví dụ hiện tại:

- File Excel đơn hàng có phần thông tin chung ở phía trên.
- Dữ liệu chi tiết sản phẩm/đơn hàng bắt đầu từ dòng `17`.
- Khi đó `startDetailRow = 17`.

Nói đơn giản: field này cho hệ thống biết “bắt đầu đọc các dòng chi tiết từ dòng số mấy trong Excel”.

Nếu field này bị thiếu hoặc sai, hệ thống sẽ không biết nên đọc dữ liệu chi tiết từ đâu. Vì vậy field này bắt buộc phải có trong Mapping.

### 2. Field này nằm ở đâu

`startDetailRow` phải nằm trong cấu hình Mapping.

Field này cần hiển thị ở các màn hình:

- Màn hình tạo Mapping mới: `新規マッピング`.
- Màn hình sửa Mapping: `マッピング編集`.
- Màn hình xem chi tiết Mapping: `マッピング詳細`.
- Màn hình danh sách Mapping: `マッピング一覧`, hiển thị như một cột thông tin.
- Màn hình preview Mapping nếu có.
- Màn hình chọn Mapping khi import Excel nếu cần hiển thị thông tin Mapping đã chọn.

### 3. Label tiếng Nhật

Label chính trên UI:

- `明細開始行`

Ý nghĩa tiếng Việt:

- Dòng bắt đầu đọc chi tiết.

Không nên hiển thị `startDetailRow` làm label chính cho người dùng cuối, vì đây là tên kỹ thuật.

### 4. Placeholder tiếng Nhật

Placeholder đề xuất:

- `例：17`

Nếu cần mô tả rõ hơn dưới field:

- `Excelの明細データを読み取り開始する行番号を入力してください。`

Ý nghĩa:

- Hãy nhập số dòng bắt đầu đọc dữ liệu chi tiết trong Excel.

### 5. Giá trị gợi ý hoặc mặc định

Giá trị hiện tại đang dùng:

- `17`

Trong plan, có 2 cách xử lý:

1. Gợi ý giá trị `17` nhưng vẫn bắt người dùng xác nhận/nhập.
2. Tự điền mặc định `17`, nhưng field vẫn là bắt buộc và người dùng có thể sửa.

Đề xuất cho giai đoạn đầu:

- Tự điền mặc định `17` khi tạo Mapping mới.
- Vẫn cho người dùng sửa.
- Khi lưu, vẫn validate như field bắt buộc.

Lý do:

- Giảm thao tác nhập cho người dùng nếu đa số form hiện tại dùng dòng `17`.
- Vẫn hỗ trợ form Excel khác nếu dòng bắt đầu thay đổi.

### 6. Kiểu dữ liệu

`startDetailRow` chỉ nhận số nguyên dương.

Hợp lệ:

- `1`
- `17`
- `25`

Không hợp lệ:

- Trống.
- `0`.
- `-1`.
- `17.5`.
- `R`.
- `abc`.
- Ký tự đặc biệt.

### 7. Rule validation

Các rule validation bắt buộc:

| Rule | Ý nghĩa |
| --- | --- |
| Bắt buộc nhập | Không được để trống |
| Phải là số | Không được nhập chữ hoặc ký tự khác |
| Phải là số nguyên | Không được nhập số thập phân |
| Phải lớn hơn hoặc bằng 1 | Dòng Excel không thể là 0 hoặc số âm |

Khi có lỗi với `startDetailRow`, hệ thống phải chặn:

- Lưu Mapping: `保存`.
- Preview Mapping: `プレビュー`.
- Import bằng Mapping đó: `インポート`.
- Apply Mapping: `適用`.

### 8. Thông báo lỗi tiếng Nhật cho từng trường hợp

| Trường hợp lỗi | Message tiếng Nhật | Chặn thao tác |
| --- | --- | --- |
| Chưa nhập | `明細開始行を入力してください。` | Có |
| Không phải số | `明細開始行は数字で入力してください。` | Có |
| Là số thập phân | `明細開始行は整数で入力してください。` | Có |
| Nhỏ hơn 1 | `明細開始行は1以上の数字で入力してください。` | Có |
| Có ký tự không hợp lệ | `明細開始行は数字のみ入力してください。` | Có |

Nếu muốn dùng ít message hơn trong giai đoạn đầu, có thể dùng 2 message chính:

- Trống: `明細開始行を入力してください。`
- Sai định dạng: `明細開始行は1以上の数字で入力してください。`

### 9. Hành vi trên màn hình tạo Mapping mới

Trên màn hình `新規マッピング`:

1. Field `明細開始行` hiển thị trong form.
2. Giá trị gợi ý/mặc định là `17`.
3. Người dùng có thể sửa thành dòng khác.
4. Khi bấm `保存`, hệ thống validate field này.
5. Nếu field trống hoặc sai, hệ thống báo lỗi tiếng Nhật và không lưu.
6. Nếu field hợp lệ, hệ thống cho tiếp tục validate các field khác.

### 10. Hành vi trên màn hình sửa Mapping

Trên màn hình `マッピング編集`:

1. Field `明細開始行` hiển thị giá trị hiện tại của Mapping.
2. Người dùng có thể sửa.
3. Nếu Mapping cũ đang thiếu giá trị này, form vẫn mở để người dùng sửa.
4. Nếu người dùng lưu khi field trống hoặc sai, hệ thống báo lỗi tiếng Nhật và không lưu.
5. Khi lưu thành công, thay đổi phải ghi audit history.

### 11. Hành vi trên preview/import/apply

Trước khi preview/import/apply Mapping, hệ thống phải kiểm tra `startDetailRow`.

Nếu hợp lệ:

- Cho phép preview/import/apply tiếp.

Nếu trống hoặc không hợp lệ:

- Không cho preview.
- Không cho import.
- Không cho apply.
- Hiển thị lỗi: `明細開始行を入力してください。` hoặc message tương ứng.
- Gợi ý người dùng bấm `編集` để sửa Mapping.

### 12. Hiển thị trên màn hình danh sách Mapping

Trên màn hình `マッピング一覧`, nên có cột:

- `明細開始行`

Nếu giá trị hợp lệ:

- Hiển thị số dòng, ví dụ `17`.

Nếu giá trị bị thiếu:

- Hiển thị `未設定`.
- Trạng thái Mapping nên là `未設定` hoặc `エラー`.
- Mapping đó không được preview/import/apply cho đến khi sửa.

### 13. Audit history liên quan đến startDetailRow

Nếu người dùng thay đổi `明細開始行`, cần ghi audit history.

Ví dụ:

- Giá trị cũ: `17`.
- Giá trị mới: `20`.
- Người sửa: user hiện tại.
- Thời gian sửa: thời điểm lưu.
- Loại thao tác: `更新`.

Lý do cần ghi:

- Nếu sau này import sai dòng, có thể kiểm tra ai đã đổi dòng bắt đầu đọc chi tiết.

### 14. Acceptance criteria cho startDetailRow

- [ ] `startDetailRow` nằm trong cấu hình Mapping.
- [ ] UI hiển thị label `明細開始行`.
- [ ] Placeholder hiển thị `例：17`.
- [ ] Khi tạo Mapping mới, field `明細開始行` hiển thị trên form.
- [ ] Khi sửa Mapping, field `明細開始行` hiển thị giá trị hiện tại.
- [ ] Field này bắt buộc nhập.
- [ ] Field này chỉ nhận số nguyên dương.
- [ ] Giá trị `17` là hợp lệ.
- [ ] Giá trị trống là không hợp lệ.
- [ ] Giá trị `0` là không hợp lệ.
- [ ] Giá trị âm là không hợp lệ.
- [ ] Giá trị thập phân là không hợp lệ.
- [ ] Giá trị chữ là không hợp lệ.
- [ ] Nếu trống thì báo `明細開始行を入力してください。`
- [ ] Nếu không phải số thì báo `明細開始行は数字で入力してください。`
- [ ] Nếu nhỏ hơn 1 thì báo `明細開始行は1以上の数字で入力してください。`
- [ ] Nếu không hợp lệ thì không cho `保存`.
- [ ] Nếu không hợp lệ thì không cho `プレビュー`.
- [ ] Nếu không hợp lệ thì không cho `インポート`.
- [ ] Nếu không hợp lệ thì không cho `適用`.
- [ ] Nếu thay đổi `明細開始行`, hệ thống ghi audit history.

---

## Chi Tiết Yêu Cầu: validRowColumn Trong Mapping

Phần này mô tả chi tiết yêu cầu cho `validRowColumn` ở mức dễ hiểu cho người non-tech. Đây chỉ là kế hoạch, chưa phải yêu cầu triển khai code.

### 1. Ý nghĩa nghiệp vụ

`validRowColumn` là cột Excel dùng để xác định một dòng chi tiết có hợp lệ hay không.

Ví dụ hiện tại:

- Dữ liệu chi tiết bắt đầu từ dòng `17`.
- Trong mỗi dòng chi tiết, cột `R` có số lượng đặt hàng.
- Nếu cột `R` có giá trị, dòng đó được xem là dòng hợp lệ.
- Nếu cột `R` trống, dòng đó không được lấy vào dữ liệu import.
- Khi đó `validRowColumn = R`.

Nói đơn giản: field này cho hệ thống biết “nhìn vào cột nào để quyết định dòng chi tiết này có cần đọc hay không”.

Nếu field này bị thiếu hoặc sai, hệ thống có thể đọc nhầm dòng trống, bỏ sót dòng cần đọc, hoặc tạo dữ liệu CSV sai. Vì vậy field này bắt buộc phải có trong Mapping.

### 2. Field này nằm ở đâu

`validRowColumn` phải nằm trong cấu hình Mapping.

Field này cần hiển thị ở các màn hình:

- Màn hình tạo Mapping mới: `新規マッピング`.
- Màn hình sửa Mapping: `マッピング編集`.
- Màn hình xem chi tiết Mapping: `マッピング詳細`.
- Màn hình danh sách Mapping: `マッピング一覧`, hiển thị như một cột thông tin.
- Màn hình preview Mapping nếu có.
- Màn hình chọn Mapping khi import Excel nếu cần hiển thị thông tin Mapping đã chọn.

### 3. Label tiếng Nhật

Label chính trên UI:

- `有効行判定列`

Ý nghĩa tiếng Việt:

- Cột xác định dòng hợp lệ.

Không nên hiển thị `validRowColumn` làm label chính cho người dùng cuối, vì đây là tên kỹ thuật.

### 4. Placeholder tiếng Nhật

Placeholder đề xuất:

- `例：R`

Nếu cần mô tả rõ hơn dưới field:

- `明細行が有効かどうかを判定するExcel列名を入力してください。`

Ý nghĩa:

- Hãy nhập tên cột Excel dùng để xác định dòng chi tiết có hợp lệ hay không.

### 5. Giá trị gợi ý hoặc mặc định

Giá trị hiện tại đang dùng:

- `R`

Trong plan, có 2 cách xử lý:

1. Gợi ý giá trị `R` nhưng vẫn bắt người dùng xác nhận/nhập.
2. Tự điền mặc định `R`, nhưng field vẫn là bắt buộc và người dùng có thể sửa.

Đề xuất cho giai đoạn đầu:

- Tự điền mặc định `R` khi tạo Mapping mới.
- Vẫn cho người dùng sửa.
- Khi lưu, vẫn validate như field bắt buộc.

Lý do:

- Giảm thao tác nhập cho người dùng nếu đa số form hiện tại dùng cột `R`.
- Vẫn hỗ trợ form Excel khác nếu cột xác định dòng hợp lệ thay đổi.

### 6. Kiểu dữ liệu

`validRowColumn` chỉ nhận tên cột Excel hợp lệ.

Hợp lệ:

- `A`
- `R`
- `Z`
- `AA`
- `AO`

Không hợp lệ:

- Trống.
- `0`.
- `17`.
- `A1`.
- `R17`.
- `A:R`.
- `AA1`.
- `abc1`.
- Ký tự đặc biệt.

Về chữ thường/chữ hoa:

- Người dùng có thể nhập `r` hoặc `aa`.
- Hệ thống nên tự chuyển thành chữ hoa: `R`, `AA`.
- Trên UI sau khi lưu nên hiển thị chữ hoa để dễ đọc.

### 7. Rule validation

Các rule validation bắt buộc:

| Rule | Ý nghĩa |
| --- | --- |
| Bắt buộc nhập | Không được để trống |
| Phải là tên cột Excel | Chỉ nhận chữ cái A-Z |
| Không được kèm số dòng | Không nhận `R17`, `A1` |
| Không được nhập khoảng cột | Không nhận `A:R` |
| Nên chuẩn hóa chữ hoa | `r` chuyển thành `R` |

Khi có lỗi với `validRowColumn`, hệ thống phải chặn:

- Lưu Mapping: `保存`.
- Preview Mapping: `プレビュー`.
- Import bằng Mapping đó: `インポート`.
- Apply Mapping: `適用`.

### 8. Thông báo lỗi tiếng Nhật cho từng trường hợp

| Trường hợp lỗi | Message tiếng Nhật | Chặn thao tác |
| --- | --- | --- |
| Chưa nhập | `有効行判定列を入力してください。` | Có |
| Sai định dạng chung | `有効行判定列はExcelの列名で入力してください。` | Có |
| Có số dòng | `有効行判定列には列名のみ入力してください。` | Có |
| Nhập khoảng cột | `有効行判定列には1つの列名のみ入力してください。` | Có |
| Có ký tự không hợp lệ | `有効行判定列はAからZの文字で入力してください。` | Có |

Nếu muốn dùng ít message hơn trong giai đoạn đầu, có thể dùng 2 message chính:

- Trống: `有効行判定列を入力してください。`
- Sai định dạng: `有効行判定列はExcelの列名で入力してください。`

### 9. Hành vi trên màn hình tạo Mapping mới

Trên màn hình `新規マッピング`:

1. Field `有効行判定列` hiển thị trong form.
2. Giá trị gợi ý/mặc định là `R`.
3. Người dùng có thể sửa thành cột khác.
4. Nếu người dùng nhập chữ thường như `r`, hệ thống nên chuẩn hóa thành `R`.
5. Khi bấm `保存`, hệ thống validate field này.
6. Nếu field trống hoặc sai, hệ thống báo lỗi tiếng Nhật và không lưu.
7. Nếu field hợp lệ, hệ thống cho tiếp tục validate các field khác.

### 10. Hành vi trên màn hình sửa Mapping

Trên màn hình `マッピング編集`:

1. Field `有効行判定列` hiển thị giá trị hiện tại của Mapping.
2. Người dùng có thể sửa.
3. Nếu Mapping cũ đang thiếu giá trị này, form vẫn mở để người dùng sửa.
4. Nếu người dùng lưu khi field trống hoặc sai, hệ thống báo lỗi tiếng Nhật và không lưu.
5. Khi lưu thành công, thay đổi phải ghi audit history.

### 11. Hành vi trên preview/import/apply

Trước khi preview/import/apply Mapping, hệ thống phải kiểm tra `validRowColumn`.

Nếu hợp lệ:

- Cho phép preview/import/apply tiếp.

Nếu trống hoặc không hợp lệ:

- Không cho preview.
- Không cho import.
- Không cho apply.
- Hiển thị lỗi: `有効行判定列を入力してください。` hoặc message tương ứng.
- Gợi ý người dùng bấm `編集` để sửa Mapping.

### 12. Cách hệ thống dùng validRowColumn khi đọc Excel

Khi import Excel:

1. Hệ thống bắt đầu đọc từ `startDetailRow`.
2. Với mỗi dòng chi tiết, hệ thống nhìn vào cột `validRowColumn`.
3. Nếu ô ở cột đó có giá trị, dòng được xem là hợp lệ.
4. Nếu ô ở cột đó trống, dòng không được lấy vào import.

Ví dụ:

- `startDetailRow = 17`
- `validRowColumn = R`
- Hệ thống đọc từ dòng 17 trở xuống.
- Dòng nào có giá trị ở cột R thì lấy.
- Dòng nào trống ở cột R thì bỏ qua.

### 13. Hiển thị trên màn hình danh sách Mapping

Trên màn hình `マッピング一覧`, nên có cột:

- `有効行判定列`

Nếu giá trị hợp lệ:

- Hiển thị tên cột, ví dụ `R`.

Nếu giá trị bị thiếu:

- Hiển thị `未設定`.
- Trạng thái Mapping nên là `未設定` hoặc `エラー`.
- Mapping đó không được preview/import/apply cho đến khi sửa.

### 14. Audit history liên quan đến validRowColumn

Nếu người dùng thay đổi `有効行判定列`, cần ghi audit history.

Ví dụ:

- Giá trị cũ: `R`.
- Giá trị mới: `S`.
- Người sửa: user hiện tại.
- Thời gian sửa: thời điểm lưu.
- Loại thao tác: `更新`.

Lý do cần ghi:

- Nếu sau này hệ thống đọc thiếu dòng hoặc đọc sai dòng, có thể kiểm tra ai đã đổi cột xác định dòng hợp lệ.

### 15. Acceptance criteria cho validRowColumn

- [ ] `validRowColumn` nằm trong cấu hình Mapping.
- [ ] UI hiển thị label `有効行判定列`.
- [ ] Placeholder hiển thị `例：R`.
- [ ] Khi tạo Mapping mới, field `有効行判定列` hiển thị trên form.
- [ ] Khi sửa Mapping, field `有効行判定列` hiển thị giá trị hiện tại.
- [ ] Field này bắt buộc nhập.
- [ ] Field này chỉ nhận tên cột Excel hợp lệ.
- [ ] Giá trị `R` là hợp lệ.
- [ ] Giá trị `A` là hợp lệ.
- [ ] Giá trị `AA` là hợp lệ.
- [ ] Giá trị trống là không hợp lệ.
- [ ] Giá trị `17` là không hợp lệ.
- [ ] Giá trị `R17` là không hợp lệ.
- [ ] Giá trị `A:R` là không hợp lệ.
- [ ] Nếu nhập chữ thường như `r`, hệ thống chuẩn hóa thành `R`.
- [ ] Nếu trống thì báo `有効行判定列を入力してください。`
- [ ] Nếu sai định dạng thì báo `有効行判定列はExcelの列名で入力してください。`
- [ ] Nếu không hợp lệ thì không cho `保存`.
- [ ] Nếu không hợp lệ thì không cho `プレビュー`.
- [ ] Nếu không hợp lệ thì không cho `インポート`.
- [ ] Nếu không hợp lệ thì không cho `適用`.
- [ ] Nếu thay đổi `有効行判定列`, hệ thống ghi audit history.

---

## Chi Tiết Validation Tổng Thể Cho Mapping

Phần này mô tả toàn bộ validation cho Mapping ở mức dễ hiểu cho người non-tech. Đây chỉ là kế hoạch, chưa phải yêu cầu triển khai code.

### 1. Mục tiêu validation

Validation giúp hệ thống kiểm tra Mapping có đủ và đúng thông tin trước khi dùng để đọc Excel.

Nếu Mapping sai, hệ thống có thể:

- Đọc sai dòng trong Excel.
- Bỏ sót dữ liệu chi tiết.
- Ghi dữ liệu vào sai cột CSV.
- Tạo file CSV sai.

Vì vậy, các lỗi quan trọng phải chặn thao tác tiếp theo.

Các thao tác cần bị chặn khi có lỗi critical:

- Lưu Mapping: `保存`.
- Preview Mapping: `プレビュー`.
- Import bằng Mapping đó: `インポート`.
- Apply Mapping: `適用`.

### 2. Định nghĩa lỗi critical

Lỗi critical là lỗi khiến Mapping không thể dùng an toàn.

Ví dụ lỗi critical:

- Thiếu `startDetailRow`.
- Thiếu `validRowColumn`.
- `startDetailRow` không hợp lệ.
- `validRowColumn` không hợp lệ.
- Không có entry nào.
- Entry thiếu nguồn hoặc cột đích.
- Expression sai định dạng.

Khi có lỗi critical:

- Không cho `保存`.
- Không cho `プレビュー`.
- Không cho `インポート`.
- Không cho `適用`.
- Phải hiển thị message tiếng Nhật.

### 3. Bảng validation tổng thể

| Field | Rule | Khi nào lỗi | Message tiếng Nhật | Có chặn thao tác tiếp không |
| --- | --- | --- | --- | --- |
| `name` / `マッピング名` | Bắt buộc nhập | Người dùng để trống tên Mapping | `マッピング名を入力してください。` | Có, chặn `保存` |
| `name` / `マッピング名` | Không được trùng nếu hệ thống không cho trùng tên | Tên Mapping đã tồn tại | `同じマッピング名が既に存在します。` | Có, chặn `保存` |
| `name` / `マッピング名` | Không nên quá dài | Tên vượt quá độ dài cho phép | `マッピング名は長すぎます。` | Có, chặn `保存` |
| `description` / `説明` | Không bắt buộc | Không lỗi nếu trống | Không cần message | Không |
| `startDetailRow` / `明細開始行` | Bắt buộc nhập | Field bị trống | `明細開始行を入力してください。` | Có, chặn `保存`, `プレビュー`, `インポート`, `適用` |
| `startDetailRow` / `明細開始行` | Phải là số | Người dùng nhập chữ hoặc ký tự khác | `明細開始行は数字で入力してください。` | Có, chặn `保存`, `プレビュー`, `インポート`, `適用` |
| `startDetailRow` / `明細開始行` | Phải là số nguyên | Người dùng nhập số thập phân, ví dụ `17.5` | `明細開始行は整数で入力してください。` | Có, chặn `保存`, `プレビュー`, `インポート`, `適用` |
| `startDetailRow` / `明細開始行` | Phải lớn hơn hoặc bằng 1 | Người dùng nhập `0` hoặc số âm | `明細開始行は1以上の数字で入力してください。` | Có, chặn `保存`, `プレビュー`, `インポート`, `適用` |
| `validRowColumn` / `有効行判定列` | Bắt buộc nhập | Field bị trống | `有効行判定列を入力してください。` | Có, chặn `保存`, `プレビュー`, `インポート`, `適用` |
| `validRowColumn` / `有効行判定列` | Phải là tên cột Excel | Người dùng nhập số, ví dụ `17` | `有効行判定列はExcelの列名で入力してください。` | Có, chặn `保存`, `プレビュー`, `インポート`, `適用` |
| `validRowColumn` / `有効行判定列` | Không được kèm số dòng | Người dùng nhập `R17` hoặc `A1` | `有効行判定列には列名のみ入力してください。` | Có, chặn `保存`, `プレビュー`, `インポート`, `適用` |
| `validRowColumn` / `有効行判定列` | Không được nhập khoảng cột | Người dùng nhập `A:R` | `有効行判定列には1つの列名のみ入力してください。` | Có, chặn `保存`, `プレビュー`, `インポート`, `適用` |
| `entries` / `マッピング設定` | Phải có ít nhất 1 entry | Danh sách entries trống | `マッピング設定を1件以上追加してください。` | Có, chặn `保存`, `プレビュー`, `インポート`, `適用` |
| `entries` / `マッピング設定` | Mỗi entry phải hợp lệ | Có ít nhất 1 entry thiếu field bắt buộc | `マッピング設定に未入力の項目があります。` | Có, chặn `保存`, `プレビュー`, `インポート`, `適用` |
| `sourceType` / `取得方法` | Bắt buộc chọn | Entry chưa chọn loại nguồn | `取得方法を選択してください。` | Có, chặn `保存`, `プレビュー`, `インポート`, `適用` |
| `sourceType` / `取得方法` | Chỉ nhận loại được hỗ trợ | Giá trị không thuộc `sheetCell`, `detailColumn`, `expression`, `generated` | `取得方法が正しくありません。` | Có, chặn `保存`, `プレビュー`, `インポート`, `適用` |
| `source` / `取得元` | Bắt buộc với `sheetCell`, `detailColumn`, `expression` | Entry thiếu nguồn | `取得元を入力してください。` | Có, chặn `保存`, `プレビュー`, `インポート`, `適用` |
| `source` / `取得元` | Với `sheetCell`, phải là ô Excel hợp lệ | Người dùng nhập sai như `K`, `44`, `K-4` | `取得元はExcelのセル形式で入力してください。` | Có, chặn `保存`, `プレビュー`, `インポート`, `適用` |
| `source` / `取得元` | Với `detailColumn`, phải là tên cột Excel hợp lệ | Người dùng nhập `R17`, `17`, `A:R` | `取得元はExcelの列名で入力してください。` | Có, chặn `保存`, `プレビュー`, `インポート`, `適用` |
| `source` / `取得元` | Với `generated`, có thể không cần nguồn | Người dùng để trống source cho generated | Không cần message nếu generated không cần source | Không |
| `targetColumns` / `出力先列` | Bắt buộc nhập | Entry thiếu cột CSV đích | `出力先列を入力してください。` | Có, chặn `保存`, `プレビュー`, `インポート`, `適用` |
| `targetColumns` / `出力先列` | Phải là cột CSV hợp lệ | Người dùng nhập sai như `1`, `A1`, `A:R` | `出力先列はCSVの列名で入力してください。` | Có, chặn `保存`, `プレビュー`, `インポート`, `適用` |
| `targetColumns` / `出力先列` | Cho phép nhiều cột đích | Người dùng nhập `E,I,J` đúng định dạng | Không cần message | Không |
| `targetColumns` / `出力先列` | Không được để phần tử rỗng | Người dùng nhập `E,,J` | `出力先列の形式が正しくありません。` | Có, chặn `保存`, `プレビュー`, `インポート`, `適用` |
| `targetColumnName` / `CSV項目名` | Bắt buộc nhập | Entry thiếu tên tiêu đề cột trong file CSV | `CSV項目名を入力してください。` | Có, chặn `保存`, `プレビュー`, `インポート`, `適用` |
| `targetColumnName` / `CSV項目名` | Phải là tên tiêu đề CSV dễ hiểu | Người dùng nhập toàn khoảng trắng hoặc ký tự không có ý nghĩa | `CSV項目名を正しく入力してください。` | Có, chặn `保存`, `プレビュー`, `インポート`, `適用` |
| `scope` / `適用範囲` | Bắt buộc chọn | Entry thiếu scope | `適用範囲を選択してください。` | Có, chặn `保存`, `プレビュー`, `インポート`, `適用` |
| `scope` / `適用範囲` | Chỉ nhận `sheet` hoặc `detail` | Scope ngoài danh sách hỗ trợ | `適用範囲が正しくありません。` | Có, chặn `保存`, `プレビュー`, `インポート`, `適用` |
| `format.type` / `形式` | Nếu có thì chỉ nhận `string`, `number`, `date` | Format không thuộc danh sách hỗ trợ | `形式が正しくありません。` | Có, chặn `保存`, `プレビュー`, `インポート`, `適用` |
| `format.type = string` / `文字列` | Không cần format bổ sung | Không lỗi nếu không nhập format chi tiết | Không cần message | Không |
| `format.type = number` / `数値` | Dữ liệu preview/import nên đọc được là số nếu cột bắt buộc là số | Preview thấy giá trị không phải số | `数値形式の値を入力してください。` | Có, chặn `プレビュー`, `インポート`, `適用`; chặn `保存` nếu rule cấu hình yêu cầu |
| `format.type = date` / `日付` | Nếu là ngày, cần format xuất rõ ràng | Thiếu format ngày khi cần export `yyyymmdd` | `日付形式を指定してください。` | Có, chặn `保存`, `プレビュー`, `インポート`, `適用` |
| `format.format` / `日付形式` | Hỗ trợ `yyyymmdd` trong giai đoạn đầu | Người dùng nhập format chưa hỗ trợ | `対応していない日付形式です。` | Có, chặn `保存`, `プレビュー`, `インポート`, `適用` |
| `expression` / `計算式` | Với expression, phải đúng dạng hỗ trợ | Người dùng nhập expression sai | `計算式の形式が正しくありません。` | Có, chặn `保存`, `プレビュー`, `インポート`, `適用` |
| `expression` / `計算式` | Giai đoạn đầu chỉ hỗ trợ dạng đơn giản như `Q7 - 1` hoặc `Q7 + 1` | Người dùng nhập công thức phức tạp | `対応していない計算式です。` | Có, chặn `保存`, `プレビュー`, `インポート`, `適用` |
| `expression offsetDays` | Offset ngày phải là số nguyên | Người dùng nhập `Q7 - abc` hoặc `Q7 - 1.5` | `日付の加減算は整数で入力してください。` | Có, chặn `保存`, `プレビュー`, `インポート`, `適用` |
| `note` / `メモ` | Không bắt buộc | Không lỗi nếu trống | Không cần message | Không |

### 4. Validation riêng cho sourceType

Các giá trị sourceType được hỗ trợ:

| sourceType kỹ thuật | Text tiếng Nhật trên UI | Ý nghĩa |
| --- | --- | --- |
| `sheetCell` | `固定セル` | Lấy dữ liệu từ một ô cố định, ví dụ `K4` |
| `detailColumn` | `明細列` | Lấy dữ liệu từ một cột ở từng dòng chi tiết, ví dụ `R` |
| `expression` | `計算式` | Tính toán đơn giản, ví dụ `Q7 - 1` |
| `generated` | `自動生成` | Hệ thống tự sinh giá trị |

Nếu người dùng chọn sai hoặc dữ liệu cấu hình có sourceType không hỗ trợ:

- Message: `取得方法が正しくありません。`
- Chặn: `保存`, `プレビュー`, `インポート`, `適用`.

### 5. Validation riêng cho source

Rule source phụ thuộc vào `sourceType`.

| sourceType | source hợp lệ | source không hợp lệ | Message tiếng Nhật |
| --- | --- | --- | --- |
| `sheetCell` | `K4`, `D4`, `Q7` | `K`, `4`, `K-4` | `取得元はExcelのセル形式で入力してください。` |
| `detailColumn` | `C`, `R`, `AA` | `R17`, `17`, `A:R` | `取得元はExcelの列名で入力してください。` |
| `expression` | `Q7 - 1`, `Q7 + 1` | `Q7 - abc`, `Q7 * 2` | `計算式の形式が正しくありません。` |
| `generated` | Có thể trống nếu hệ thống tự sinh | Không áp dụng | Không cần message nếu generated không cần source |

### 6. Validation riêng cho targetColumns

`targetColumns` là cột CSV đích.

Hợp lệ:

- `A`
- `AI`
- `E,I,J`
- `X,AO`

Không hợp lệ:

- Trống.
- `1`.
- `A1`.
- `A:R`.
- `E,,J`.

Message lỗi:

- Trống: `出力先列を入力してください。`
- Sai định dạng: `出力先列はCSVの列名で入力してください。`
- Có phần tử rỗng: `出力先列の形式が正しくありません。`

Khi lỗi:

- Chặn `保存`, `プレビュー`, `インポート`, `適用`.

### 6.1. Validation riêng cho targetColumnName

`targetColumnName` là tên tiêu đề của cột trong file CSV. Trên UI hiển thị là `CSV項目名`.

Mục này khác với `出力先列`:

- `出力先列` là vị trí cột, ví dụ `A`, `E`, `AI`.
- `CSV項目名` là tên tiêu đề/ý nghĩa nghiệp vụ của cột đó, ví dụ `会社コード`, `得意先コード`, `受注数`.

Rule:

- Bắt buộc nhập.
- Không được để trống.
- Không được chỉ nhập khoảng trắng.
- Nếu `出力先列` có nhiều cột như `E,I,J` và các cột đó cùng một ý nghĩa, có thể dùng chung một `CSV項目名`, ví dụ `得意先コード`.
- Nếu nhiều cột đích có tên tiêu đề khác nhau, cần ghi rõ đủ tên để người dùng hiểu từng cột.

Message lỗi:

- Trống: `CSV項目名を入力してください。`
- Sai/không có ý nghĩa: `CSV項目名を正しく入力してください。`

Khi lỗi:

- Chặn `保存`, `プレビュー`, `インポート`, `適用`.

### 7. Validation riêng cho format

Các format hỗ trợ trong giai đoạn đầu:

| Format kỹ thuật | Text tiếng Nhật | Ý nghĩa |
| --- | --- | --- |
| `string` | `文字列` | Dữ liệu dạng chữ |
| `number` | `数値` | Dữ liệu dạng số |
| `numberIntegerTruncate` | `Number 整数（小数切り捨て）` | Xóa phần thập phân, không làm tròn. Ví dụ `123.67` thành `123` |
| `date` | `日付` | Dữ liệu dạng ngày |

Rule:

- Nếu không chọn format, mặc định có thể hiểu là `string`.
- Nếu chọn `date`, cần format xuất là `yyyymmdd`.
- Nếu chọn `number`, preview/import nên cảnh báo nếu giá trị đọc được không phải số.
- Nếu chọn `numberIntegerTruncate`, hệ thống phải xóa toàn bộ phần sau dấu thập phân và không được làm tròn.

Message lỗi:

- Format không hợp lệ: `形式が正しくありません。`
- Thiếu format ngày: `日付形式を指定してください。`
- Format ngày chưa hỗ trợ: `対応していない日付形式です。`
- Giá trị không phải số: `数値形式の値を入力してください。`

### 8. Validation riêng cho expression như Q7 - 1

Giai đoạn đầu chỉ nên hỗ trợ expression đơn giản.

Hợp lệ:

- `Q7 - 1`
- `Q7 + 1`
- `Q7`

Không hợp lệ:

- `Q7 * 2`
- `Q7 / 2`
- `Q7 - abc`
- `Q7 - 1.5`
- `SUM(Q7:Q9)`

Rule:

- Ô nguồn phải là cell Excel hợp lệ, ví dụ `Q7`.
- Phép tính chỉ hỗ trợ cộng/trừ số ngày.
- Offset phải là số nguyên.
- Nếu expression dùng cho ngày, format nên là `date` và export `yyyymmdd`.

Message lỗi:

- Sai format: `計算式の形式が正しくありません。`
- Expression chưa hỗ trợ: `対応していない計算式です。`
- Offset không phải số nguyên: `日付の加減算は整数で入力してください。`

Khi lỗi:

- Chặn `保存`, `プレビュー`, `インポート`, `適用`.

### 9. Rule chặn thao tác theo loại lỗi

| Loại lỗi | Chặn 保存 | Chặn プレビュー | Chặn インポート | Chặn 適用 |
| --- | --- | --- | --- | --- |
| Thiếu `startDetailRow` | Có | Có | Có | Có |
| `startDetailRow` sai | Có | Có | Có | Có |
| Thiếu `validRowColumn` | Có | Có | Có | Có |
| `validRowColumn` sai | Có | Có | Có | Có |
| Không có entries | Có | Có | Có | Có |
| Entry thiếu field bắt buộc | Có | Có | Có | Có |
| `sourceType` sai | Có | Có | Có | Có |
| `source` sai | Có | Có | Có | Có |
| `targetColumns` sai | Có | Có | Có | Có |
| `targetColumnName` trống/sai | Có | Có | Có | Có |
| `scope` sai | Có | Có | Có | Có |
| `format` sai | Có | Có | Có | Có |
| `expression` sai | Có | Có | Có | Có |
| `description` trống | Không | Không | Không | Không |
| `note` trống | Không | Không | Không | Không |

### 10. Acceptance criteria cho validation Mapping

- [ ] Validation có message tiếng Nhật cho tất cả lỗi hiển thị cho người dùng.
- [ ] Thiếu `マッピング名` thì báo `マッピング名を入力してください。`
- [ ] Thiếu `明細開始行` thì báo `明細開始行を入力してください。`
- [ ] `明細開始行` sai thì không cho `保存`, `プレビュー`, `インポート`, `適用`.
- [ ] Thiếu `有効行判定列` thì báo `有効行判定列を入力してください。`
- [ ] `有効行判定列` sai thì không cho `保存`, `プレビュー`, `インポート`, `適用`.
- [ ] Không có entries thì báo `マッピング設定を1件以上追加してください。`
- [ ] Entry thiếu `取得方法` thì báo `取得方法を選択してください。`
- [ ] Entry thiếu `取得元` thì báo `取得元を入力してください。`
- [ ] Entry thiếu `出力先列` thì báo `出力先列を入力してください。`
- [ ] Entry thiếu `CSV項目名` thì báo `CSV項目名を入力してください。`
- [ ] Entry thiếu `適用範囲` thì báo `適用範囲を選択してください。`
- [ ] `sourceType` không hỗ trợ thì báo `取得方法が正しくありません。`
- [ ] `sheetCell` source sai thì báo `取得元はExcelのセル形式で入力してください。`
- [ ] `detailColumn` source sai thì báo `取得元はExcelの列名で入力してください。`
- [ ] `targetColumns` sai thì báo `出力先列はCSVの列名で入力してください。`
- [ ] `format` sai thì báo `形式が正しくありません。`
- [ ] `date` thiếu format thì báo `日付形式を指定してください。`
- [ ] `expression` sai thì báo `計算式の形式が正しくありません。`
- [ ] Các lỗi critical đều chặn `保存`, `プレビュー`, `インポート`, `適用`.
- [ ] `Admin` và `Operator` nhận cùng rule validation, không phân biệt.

---

## Chi Tiết Kế Hoạch: Màn Hình Danh Sách Mapping

Phần này mô tả màn hình danh sách Mapping ở mức dễ hiểu cho người non-tech. Đây chỉ là kế hoạch, chưa phải yêu cầu triển khai code.

### 1. Mục tiêu màn hình

Màn hình danh sách Mapping giúp người dùng xem toàn bộ cấu hình Mapping đang có trong hệ thống.

Người dùng cần biết:

- Hiện có những Mapping nào.
- Mapping nào đang dùng cho file Excel đơn hàng.
- Mapping đó bắt đầu đọc chi tiết từ dòng nào.
- Mapping đó dùng cột nào để xác định dòng chi tiết hợp lệ.
- Mapping có bao nhiêu dòng cấu hình nguồn - đích.
- Mapping có đang hợp lệ hay thiếu thông tin bắt buộc không.
- Người dùng có thể thao tác gì với từng Mapping.

Tên màn hình hiển thị bằng tiếng Nhật:

- `マッピング一覧`

### 2. Người dùng mục tiêu và quyền thao tác

Người dùng mục tiêu:

- `Admin`
- `Operator`

Rule quyền:

- `Admin` và `Operator` có full quyền như nhau trong màn hình Mapping.
- Không phân biệt quyền giữa `Admin` và `Operator`.
- Nếu `Admin` thấy nút nào thì `Operator` cũng phải thấy nút đó.
- Nếu `Admin` làm được thao tác nào thì `Operator` cũng phải làm được thao tác đó.

Các thao tác cả `Admin` và `Operator` đều được làm:

- Xem danh sách Mapping.
- Xem chi tiết Mapping.
- Tạo Mapping mới.
- Sửa Mapping.
- Xóa Mapping.
- Preview Mapping.
- Import Mapping JSON.
- Export Mapping JSON.
- Apply Mapping.
- Xem lịch sử thay đổi nếu có audit history.

Nếu hệ thống có `Viewer`, `Viewer` chỉ được xem, không được tạo/sửa/xóa/import/apply.

### 3. Người dùng thấy những thông tin gì

Khi mở màn hình `マッピング一覧`, người dùng thấy:

- Tiêu đề màn hình.
- Nút tạo Mapping mới.
- Ô tìm kiếm Mapping.
- Bộ lọc trạng thái nếu cần.
- Bảng danh sách Mapping.
- Các nút thao tác cho từng Mapping.
- Thông báo loading khi dữ liệu đang tải.
- Thông báo empty state nếu chưa có Mapping.
- Thông báo lỗi nếu không tải được dữ liệu.

### 4. Các cột trong bảng Mapping

Bảng danh sách Mapping nên có các cột sau:

| Cột | Text tiếng Nhật trên UI | Ý nghĩa cho người dùng |
| --- | --- | --- |
| Tên Mapping | `マッピング名` | Tên cấu hình Mapping |
| Mô tả | `説明` | Ghi chú ngắn Mapping dùng cho form nào |
| Dòng bắt đầu chi tiết | `明細開始行` | Giá trị `startDetailRow`, ví dụ `17` |
| Cột xác định dòng hợp lệ | `有効行判定列` | Giá trị `validRowColumn`, ví dụ `R` |
| Số entry | `設定数` | Số dòng cấu hình nguồn - đích trong Mapping |
| Trạng thái | `ステータス` | Mapping hợp lệ hay thiếu thông tin |
| Cập nhật cuối | `最終更新日時` | Thời điểm sửa gần nhất |
| Người cập nhật | `最終更新者` | Người sửa gần nhất |
| Thao tác | `操作` | Các nút xem/sửa/xóa/preview/export/apply |

### 5. Trạng thái Mapping trên danh sách

Mỗi Mapping nên có trạng thái để người dùng biết Mapping có dùng được không.

Các trạng thái đề xuất:

| Trạng thái | Text tiếng Nhật | Ý nghĩa |
| --- | --- | --- |
| Hợp lệ | `有効` | Có đủ thông tin bắt buộc và có thể dùng |
| Thiếu thông tin | `未設定` | Thiếu `startDetailRow`, `validRowColumn` hoặc entries |
| Có lỗi | `エラー` | Có cấu hình sai, ví dụ cột Excel không hợp lệ |
| Đã xóa mềm | `削除済み` | Nếu hệ thống dùng soft delete |

Nếu Mapping thiếu `startDetailRow` hoặc `validRowColumn`, trạng thái phải hiển thị là `未設定` hoặc `エラー`, và không cho preview/import/apply Mapping đó.

### 6. Các nút thao tác cần có

Nút trên đầu màn hình:

| Nút | Text tiếng Nhật | Mục đích |
| --- | --- | --- |
| Tạo mới | `新規マッピング` | Tạo Mapping mới |
| Lưu | `保存` | Lưu thay đổi Mapping |

Nút trên từng dòng Mapping:

| Nút | Text tiếng Nhật | Mục đích |
| --- | --- | --- |
| Xem chi tiết | `詳細` | Xem thông tin Mapping |
| Sửa | `編集` | Chỉnh sửa Mapping |
| Xóa | `削除` | Xóa hoặc đánh dấu xóa Mapping |
| Preview | `プレビュー` | Xem thử Mapping đọc Excel như thế nào |
| Apply Mapping | `適用` | Dùng Mapping này cho xử lý import/apply |
| Lịch sử | `履歴` | Xem audit history nếu có |

Lưu ý quyền:

- Tất cả nút trên phải hiển thị giống nhau cho `Admin` và `Operator`.
- Không ẩn nút `削除`, `編集`, `保存`, `プレビュー`, `適用` với `Operator`.

### 7. Bộ lọc và tìm kiếm

Màn hình danh sách Mapping nên có ô tìm kiếm để người dùng tìm nhanh.

Text tiếng Nhật:

- Label/placeholder tìm kiếm: `マッピング名で検索`

Người dùng có thể tìm theo:

- Tên Mapping.
- Mô tả.
- Người cập nhật.

Bộ lọc đề xuất:

| Bộ lọc | Text tiếng Nhật | Giá trị |
| --- | --- | --- |
| Trạng thái | `ステータス` | `すべて`, `有効`, `未設定`, `エラー` |
| Người cập nhật | `更新者` | Danh sách người dùng nếu cần |
| Ngày cập nhật | `更新日` | Khoảng ngày nếu cần |

Sắp xếp đề xuất:

- Mới cập nhật lên đầu.
- Có lỗi hoặc thiếu thông tin nên dễ nhìn thấy.
- Có thể sort theo `マッピング名`, `明細開始行`, `有効行判定列`, `最終更新日時`.

### 8. Empty state khi chưa có Mapping

Khi chưa có Mapping nào, màn hình không nên để trống hoàn toàn.

Text tiếng Nhật đề xuất:

- Tiêu đề: `マッピングがまだ登録されていません。`
- Mô tả: `新規マッピングを作成してください。`
- Nút chính: `新規マッピング`

Ý nghĩa:

- Người dùng biết hệ thống chưa có Mapping.
- Người dùng biết bước tiếp theo là tạo mới hoặc import.

### 9. Loading state khi đang tải dữ liệu

Khi hệ thống đang đọc danh sách Mapping, cần hiển thị trạng thái loading.

Text tiếng Nhật đề xuất:

- `マッピング一覧を読み込んでいます。`

Trong lúc loading:

- Không hiển thị bảng rỗng gây hiểu nhầm.
- Có thể disable các thao tác phụ nếu dữ liệu chưa tải xong.
- Không cho người dùng apply Mapping khi danh sách chưa tải xong.

### 10. Lỗi khi không tải được dữ liệu

Nếu hệ thống không tải được danh sách Mapping, cần báo lỗi rõ ràng.

Text tiếng Nhật đề xuất:

- Tiêu đề lỗi: `マッピング一覧を読み込めませんでした。`
- Mô tả lỗi: `時間をおいて再度お試しください。`
- Nút thử lại: `再読み込み`

Nếu lỗi do quyền truy cập:

- `マッピング一覧を表示する権限がありません。`

Tuy nhiên, với `Admin` và `Operator`, hệ thống không được báo thiếu quyền trong phạm vi Mapping nếu hai role này đã đăng nhập hợp lệ.

### 11. Cảnh báo Mapping thiếu startDetailRow hoặc validRowColumn

Nếu một Mapping bị thiếu `startDetailRow`, hiển thị cảnh báo:

- `明細開始行を入力してください。`

Nếu một Mapping bị thiếu `validRowColumn`, hiển thị cảnh báo:

- `有効行判定列を入力してください。`

Nếu thiếu một trong hai field này:

- Không cho `プレビュー`.
- Không cho `適用`.
- Không cho dùng Mapping này khi `インポート`.
- Cho phép bấm `編集` để sửa lỗi.
- Trạng thái nên là `未設定` hoặc `エラー`.

### 12. Luồng thao tác cơ bản

Luồng xem danh sách:

1. Người dùng mở màn hình `マッピング一覧`.
2. Hệ thống hiển thị loading: `マッピング一覧を読み込んでいます。`
3. Hệ thống tải danh sách Mapping.
4. Nếu có dữ liệu, hệ thống hiển thị bảng Mapping.
5. Nếu không có dữ liệu, hệ thống hiển thị empty state.
6. Nếu tải lỗi, hệ thống hiển thị lỗi và nút `再読み込み`.

Luồng thao tác với một Mapping:

1. Người dùng nhìn trạng thái Mapping.
2. Nếu Mapping là `有効`, người dùng có thể `詳細`, `編集`, `削除`, `プレビュー`, `エクスポート`, `適用`.
3. Nếu Mapping là `未設定` hoặc `エラー`, người dùng vẫn có thể `詳細`, `編集`, `削除`, `エクスポート`.
4. Nếu Mapping thiếu `startDetailRow` hoặc `validRowColumn`, hệ thống không cho `プレビュー` hoặc `適用`.
5. Người dùng bấm `編集` để sửa lỗi.

### 13. Acceptance criteria cho màn hình danh sách Mapping

- [ ] Màn hình có tiêu đề `マッピング一覧`.
- [ ] `Admin` xem được danh sách Mapping.
- [ ] `Operator` xem được danh sách Mapping giống `Admin`.
- [ ] `Admin` và `Operator` thấy cùng các nút thao tác.
- [ ] Bảng hiển thị `マッピング名`, `説明`, `明細開始行`, `有効行判定列`, `設定数`, `ステータス`, `最終更新日時`, `最終更新者`, `操作`.
- [ ] Có nút `新規マッピング`.
- [ ] Có nút `保存`.
- [ ] Có nút `詳細`, `編集`, `削除`, `プレビュー`, `適用` trên từng dòng.
- [ ] Có ô tìm kiếm `マッピング名で検索`.
- [ ] Khi chưa có Mapping, hiển thị `マッピングがまだ登録されていません。`
- [ ] Khi đang tải, hiển thị `マッピング一覧を読み込んでいます。`
- [ ] Khi tải lỗi, hiển thị `マッピング一覧を読み込めませんでした。`
- [ ] Mapping thiếu `startDetailRow` phải cảnh báo `明細開始行を入力してください。`
- [ ] Mapping thiếu `validRowColumn` phải cảnh báo `有効行判定列を入力してください。`
- [ ] Mapping thiếu `startDetailRow` hoặc `validRowColumn` không được preview/apply/import tiếp.
- [ ] Toàn bộ text UI hiển thị cho người dùng là tiếng Nhật.

### Prompt 09: Chi tiết hóa UI/UX tiếng Nhật cho Mapping

```text
Hãy chi tiết hóa UI/UX tiếng Nhật cho toàn bộ chức năng Mapping.

Yêu cầu:
- Tất cả tiêu đề, label, button, tooltip, alert, confirm modal, empty state, loading state, validation message đều bằng tiếng Nhật.
- Không dùng tiếng Việt hoặc tiếng Anh trên UI sản phẩm, trừ dữ liệu master data do người dùng nhập.

Hãy liệt kê sẵn text tiếng Nhật cho:
- Màn hình danh sách Mapping
- Màn hình tạo Mapping
- Màn hình sửa Mapping
- Màn hình xem chi tiết Mapping
- Nút tạo/sửa/xóa/lưu/hủy/preview/apply
- Thông báo thành công
- Thông báo lỗi
- Confirm xóa
- Empty state
- Loading state

Kết quả chỉ là plan, chưa code.
```

### Prompt 10: Chi tiết hóa quyền Admin và Operator trong Mapping

```text
Hãy chi tiết hóa rule phân quyền cho chức năng Mapping.

Yêu cầu quan trọng:
- Admin và Operator có full quyền như nhau trong Mapping.
- Không phân biệt quyền giữa Admin và Operator.
- Nếu Admin thấy nút nào thì Operator cũng thấy nút đó.
- Nếu Admin làm được thao tác nào thì Operator cũng làm được thao tác đó.
- Viewer nếu có thì chỉ xem.

Hãy viết rõ quyền cho các tác vụ:
- Xem danh sách Mapping
- Xem chi tiết Mapping
- Tạo Mapping
- Sửa Mapping
- Xóa Mapping
- Import Mapping JSON
- Export Mapping JSON
- Preview Mapping
- Apply Mapping
- Xem audit history

Kết quả viết đơn giản cho người non-tech, chưa code.
```

### Prompt 11: Chi tiết hóa entries trong Mapping

```text
Hãy chi tiết hóa yêu cầu cho entries trong Mapping.

Bối cảnh:
Một entry là một dòng cấu hình nói rằng dữ liệu lấy từ đâu trong Excel và đưa vào cột nào trong CSV.

Hãy giải thích đơn giản:
- Entry là gì
- sourceType là gì
- source là gì
- targetColumns là gì
- targetColumnName / CSV項目名 là gì
- scope là gì
- format là gì
- note là gì
- Khi nào dùng sheetCell
- Khi nào dùng detailColumn
- Khi nào dùng expression
- Khi nào dùng generated

Hãy dùng ví dụ từ Plan.md:
- K4 -> A
- D4 -> E/I/J
- Q7 - 1 -> X/AO
- detail C -> Z
- detail R -> AI

Kết quả chỉ là plan, chưa code.
```

### Prompt 12: Chi tiết hóa sourceType

```text
Hãy chi tiết hóa các loại sourceType trong Mapping.

Cần giải thích đơn giản cho người non-tech:
- sheetCell: lấy dữ liệu từ một ô cố định trong sheet
- detailColumn: lấy dữ liệu từ một cột ở từng dòng chi tiết
- expression: tính toán đơn giản từ ô/cột khác
- generated: hệ thống tự sinh giá trị

Với mỗi loại, hãy viết:
- Dùng khi nào
- Ví dụ nguồn
- Ví dụ cột đích
- Validation cần có
- Trường hợp lỗi thường gặp
- Message tiếng Nhật nếu lỗi

Kết quả chỉ là plan, chưa code.
```

### Prompt 13: Chi tiết hóa expression như Q7 - 1

```text
Hãy chi tiết hóa yêu cầu cho expression trong Mapping, đặc biệt ví dụ Q7 - 1.

Bối cảnh:
Q7 - 1 nghĩa là lấy ngày ở ô Q7 rồi trừ 1 ngày, sau đó export theo format yyyymmdd.

Hãy viết rõ:
- Người dùng nhập expression như thế nào
- Hệ thống hiểu expression như thế nào
- Chỉ hỗ trợ loại expression đơn giản nào trong giai đoạn đầu
- Cách validate expression
- Nếu expression sai thì báo lỗi tiếng Nhật gì
- Cách hiển thị preview kết quả expression
- Acceptance criteria

Chỉ làm plan, chưa code.
```

### Prompt 14: Chi tiết hóa preview Mapping

```text
Hãy chi tiết hóa chức năng preview Mapping trước khi import/apply.

Mục tiêu:
Người dùng kiểm tra Mapping có đọc đúng file Excel không trước khi xử lý thật.

Yêu cầu:
- Preview phải kiểm tra startDetailRow và validRowColumn trước.
- Nếu thiếu hoặc sai thì báo lỗi tiếng Nhật và không preview.
- Preview nên hiển thị một số dòng mẫu.
- Preview nên cảnh báo nếu source không tìm thấy.

Hãy viết rõ:
- Người dùng thao tác như thế nào
- Hệ thống cần file Excel mẫu không
- Hệ thống hiển thị thông tin gì
- Các lỗi có thể xảy ra
- Message tiếng Nhật cho từng lỗi
- Acceptance criteria

Kết quả chỉ là plan, chưa code.
```

### Prompt 15: Chi tiết hóa chọn Mapping khi import Excel

```text
Hãy chi tiết hóa luồng chọn Mapping khi import Excel đơn hàng.

Bối cảnh:
Người dùng upload file Excel và chọn Mapping template để hệ thống biết cách đọc dữ liệu.

Yêu cầu:
- Trước khi parse phải chọn Mapping hoặc dùng default nếu có rule default.
- Mapping được chọn phải có startDetailRow và validRowColumn hợp lệ.
- Nếu thiếu hoặc sai thì báo lỗi tiếng Nhật và dừng import.
- Admin và Operator có quyền import như nhau.

Hãy viết rõ:
- Người dùng thao tác từng bước
- Hệ thống kiểm tra gì trước khi import
- Hệ thống làm gì nếu Mapping hợp lệ
- Hệ thống làm gì nếu Mapping lỗi
- Thông báo tiếng Nhật cần hiển thị
- Acceptance criteria

Chỉ làm plan, chưa code.
```

### Prompt 16: Tạm không chi tiết hóa import/export Mapping JSON

```text
Không chi tiết hóa import/export Mapping JSON trong giai đoạn này.

Lý do:
- Cấu trúc mới chỉ yêu cầu sidebar `設定`.
- Trong `設定`, tab chính là `マッピング一覧`; phần `Hiển thị` tạm để trống.
- Không tạo tab/mục/nút chính `インポート` hoặc `エクスポート` cho Mapping.
- Người dùng chỉ cần thêm mới, sửa, xóa và lưu Mapping.

Nếu sau này cần backup/restore Mapping bằng JSON, tạo yêu cầu riêng và không đặt thành tab chính trong `設定`.
```

### Prompt 17: Chi tiết hóa audit history cho Mapping

```text
Hãy chi tiết hóa audit history cho Mapping.

Yêu cầu:
Mỗi lần người dùng tạo, sửa, xóa, import Mapping thì hệ thống cần ghi lại lịch sử.

Hãy viết rõ:
- Cần lưu ai thao tác
- Thao tác lúc nào
- Loại thao tác là gì
- Giá trị trước khi sửa
- Giá trị sau khi sửa
- Cách người dùng xem lịch sử
- UI text tiếng Nhật cho màn hình lịch sử
- Admin và Operator có quyền xem lịch sử như nhau không
- Acceptance criteria

Chỉ làm plan, chưa code.
```

### Prompt 18: Chi tiết hóa Data Model Mapping cho người non-tech

```text
Hãy giải thích Data Model của Mapping bằng ngôn ngữ đơn giản cho người non-tech.

Dựa trên Docs/maplingusecase.md, hãy giải thích các thông tin cần lưu:
- id
- name
- description
- startDetailRow
- validRowColumn
- entries
- sourceType
- source
- targetColumns
- targetColumnName
- scope
- format
- note
- createdAt/createdBy
- updatedAt/updatedBy

Không cần viết code database.
Hãy giải thích mỗi field dùng để làm gì, ví dụ dễ hiểu, và field nào bắt buộc.
Chỉ làm plan.
```

### Prompt 19: Chi tiết hóa test case cho Mapping

```text
Hãy viết test case nghiệp vụ cho chức năng Mapping, dành cho người non-tech review.

Cần bao gồm test case cho:
- Xem danh sách Mapping
- Tạo Mapping hợp lệ
- Tạo Mapping thiếu startDetailRow
- Tạo Mapping thiếu validRowColumn
- Tạo Mapping với validRowColumn sai
- Sửa Mapping
- Xóa Mapping
- Preview Mapping
- Import Excel với Mapping hợp lệ
- Import Excel với Mapping thiếu field bắt buộc
- Admin và Operator có quyền giống nhau
- UI message bằng tiếng Nhật

Mỗi test case ghi:
- Tên test
- Điều kiện ban đầu
- Các bước thực hiện
- Kết quả mong đợi

Chỉ làm plan, chưa code.
```

### Prompt 20: Chi tiết hóa acceptance criteria toàn bộ Mapping

```text
Hãy viết acceptance criteria tổng thể cho chức năng Mapping.

Yêu cầu phải bao gồm:
- Admin và Operator full quyền như nhau
- UI/UX tiếng Nhật
- startDetailRow bắt buộc và hợp lệ
- validRowColumn bắt buộc và hợp lệ
- Không cho lưu/import/preview/apply nếu thiếu field bắt buộc
- Mapping entries hợp lệ
- Preview trước khi apply
- Audit history

Hãy viết bằng ngôn ngữ đơn giản, dạng checklist để người non-tech có thể tick từng dòng.
Chỉ làm plan, chưa code.
```

### Prompt 21: Yêu cầu cập nhật trực tiếp vào cuối file

```text
Hãy đọc Docs/maplingusecase.md và cập nhật nội dung chi tiết vừa viết vào cuối file.

Yêu cầu:
- Giữ nguyên nội dung cũ.
- Chỉ thêm phần mới ở cuối file.
- Viết đơn giản cho người non-tech.
- Không code.
- Không sửa file khác.
- Sau khi sửa, tóm tắt ngắn gọn đã thêm những gì.
```

### Prompt 22: Yêu cầu thay thế một phần trong file

```text
Hãy đọc Docs/maplingusecase.md và thay thế phần [ghi tên phần cần thay] bằng nội dung mới.

Yêu cầu:
- Chỉ thay đúng phần được yêu cầu.
- Các phần khác giữ nguyên.
- Viết đơn giản cho người non-tech.
- Không code.
- Không sửa file khác.
- Sau khi sửa, tóm tắt ngắn gọn đã thay đổi những gì.
```

### Prompt 23: Yêu cầu chuyển một phần plan sang tiếng Nhật UI text

```text
Hãy đọc phần Mapping trong Docs/maplingusecase.md và liệt kê toàn bộ UI text cần chuyển sang tiếng Nhật.

Cần bao gồm:
- Tên màn hình
- Label field
- Button
- Tooltip
- Alert
- Confirm modal
- Validation message
- Success message
- Error message
- Empty state
- Loading state

Kết quả viết theo bảng:
- Vị trí UI
- Text tiếng Nhật
- Ghi chú sử dụng

Chỉ làm plan, chưa code.
```

### Prompt 24: Yêu cầu làm rõ lỗi và chặn thao tác

```text
Hãy chi tiết hóa các trường hợp lỗi trong Mapping và khi nào phải chặn thao tác tiếp.

Bắt buộc bao gồm:
- Thiếu startDetailRow
- startDetailRow không phải số
- startDetailRow nhỏ hơn 1
- Thiếu validRowColumn
- validRowColumn sai định dạng
- entries trống
- sourceType sai
- source trống
- targetColumns trống
- targetColumnName / CSV項目名 trống
- scope trống
- expression sai định dạng

Hãy viết theo bảng:
- Lỗi
- Khi nào xảy ra
- Message tiếng Nhật
- Chặn Save không
- Chặn Preview không
- Chặn Import không
- Chặn Apply Mapping không

Chỉ làm plan, chưa code.
```

### Prompt 25: Prompt tổng hợp để tạo bản kế hoạch Mapping chi tiết cuối cùng

```text
Hãy đọc Docs/maplingusecase.md và tạo một bản kế hoạch chi tiết cuối cùng cho chức năng Mapping.

Bản kế hoạch phải dễ hiểu cho người non-tech và bao gồm:
- Mục tiêu chức năng
- Người dùng và quyền
- Danh sách màn hình
- Luồng thao tác từng màn hình
- Field cần có
- Validation
- Message tiếng Nhật
- Preview
- Audit history
- Data model giải thích đơn giản
- Test case nghiệp vụ
- Acceptance criteria

Rule bắt buộc:
- Admin và Operator full quyền như nhau trong Mapping.
- UI/UX tiếng Nhật.
- startDetailRow và validRowColumn là bắt buộc.
- Nếu thiếu hoặc không hợp lệ thì không cho lưu/import/preview/apply mapping.

Kết quả lưu vào cuối file Docs/maplingusecase.md.
Chỉ làm plan, chưa code.
```

