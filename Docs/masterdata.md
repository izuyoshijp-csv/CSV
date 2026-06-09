# Master Data - User Story Va Use Case

Tai lieu nay mo ta chi tiet cho Phase 2 trong `Docs/schedule.md`:

- Buoc 2.1: Man hinh danh sach master data.
- Buoc 2.2: Import master data tu CSV/Excel.

Pham vi master data gom 5 collection:

- `CusCodeList`
- `ItemCodeList`
- `UnitPriceList`
- `PIC.WH.CodeList`
- `UnitCodeList`

## 1. Muc Tieu

Nguoi dung co the quan ly master data thay cho cac sheet danh muc trong Excel cu. He thong can cho phep:

- Xem danh sach du lieu.
- Tim kiem va loc du lieu.
- Them moi tung dong.
- Sua du lieu da co.
- Xoa du lieu neu can.
- Import nhieu dong tu file CSV/Excel.
- Preview du lieu import truoc khi luu.
- Kiem tra trung lap va field bat buoc truoc khi tao/sua/import.

## 2. Rule Kiem Tra Du Lieu

### 2.1. Rule Chung Cho `CusCodeList`, `UnitPriceList`, `PIC.WH.CodeList`, `UnitCodeList`

Voi 4 collection nay, field dau tien la khoa chinh nghiep vu.

| Collection | Field dau tien | Rule bat buoc | Rule trung lap |
| --- | --- | --- | --- |
| `CusCodeList` | `CusCode` | Khong duoc de trong | Khong duoc trung voi `CusCode` da co |
| `UnitPriceList` | `IzuyoshiJPCode` | Khong duoc de trong | Khong duoc trung voi `IzuyoshiJPCode` da co |
| `PIC.WH.CodeList` | `PICCode` | Khong duoc de trong | Khong duoc trung voi `PICCode` da co |
| `UnitCodeList` | `OrderUnit` | Khong duoc de trong | Khong duoc trung voi `OrderUnit` da co |

Quy tac bo sung:

- Cac field khac duoc phep de trong.
- Cac field khac duoc phep trung lap.
- Khi sua du lieu, field dau tien van khong duoc trung voi ban ghi khac.
- Khi import, phai kiem tra trung voi du lieu da co trong Firestore va trung trong chinh file import.
- Nen trim khoang trang dau/cuoi truoc khi validate.
- Nen coi gia tri sau trim la gia tri that de so sanh trung lap.

### 2.2. Rule Rieng Cho `ItemCodeList`

`ItemCodeList` co rule rieng vi mot dong co the dung cho MAV hoac MHB.

Field lien quan:

- `MAVCode`
- `MHBCode`
- `IzuyoshiJPCode`
- `IzuyoshiVNCode`
- `Description`

Dieu kien duoc phep tao/sua/import mot dong:

1. Hop le neu cap `MAVCode` va `IzuyoshiJPCode` cung co du lieu.
2. Neu khong thoa dieu kien tren, hop le neu cap `MHBCode` va `IzuyoshiJPCode` cung co du lieu.
3. Neu ca 2 cap tren deu khong thoa, dong khong hop le.

Rule trung lap:

- `MAVCode` khong duoc trung voi `MAVCode` da co trong Firestore.
- `MAVCode` khong duoc trung voi `MAVCode` khac trong chinh file import.
- `MHBCode` khong duoc trung voi `MHBCode` da co trong Firestore.
- `MHBCode` khong duoc trung voi `MHBCode` khac trong chinh file import.
- `IzuyoshiJPCode` duoc phep trung.
- `IzuyoshiVNCode` duoc phep trong va duoc phep trung.
- `Description` duoc phep trong va duoc phep trung.

Ghi chu:

- Neu `MAVCode` trong thi khong can kiem tra trung `MAVCode`.
- Neu `MHBCode` trong thi khong can kiem tra trung `MHBCode`.
- `IzuyoshiJPCode` bat buoc phai co trong moi dong hop le vi ca 2 cap dieu kien deu can field nay.
- Mot dong co du ca `MAVCode`, `MHBCode`, `IzuyoshiJPCode` van hop le, mien la `MAVCode` va `MHBCode` khong trung.

### 2.3. Logic Validate va Normalize Field Cho Tung Collection

Định nghĩa chung:
- Trim tất cả field text trước khi validate và so sánh.
- Nếu giá trị sau trim là chuỗi rỗng, coi như thiếu dữ liệu.
- So sánh duplicate nên dùng giá trị đã normalize.
- Với code/key, dùng so sánh case-insensitive nếu cần tính nhất quán, nhưng vẫn lưu nguyên giá trị gốc nếu không cần chuẩn hóa case.
- Khi import file, normalize toàn bộ hàng trước khi kiểm tra.

`CusCodeList`:
- Normalize: `CusCode`, `CusNameEng`, `CusNameJP`, `CusAddress` đều trim.
- Validate create/edit/import:
  - `CusCode` bắt buộc.
  - `CusCode` không được phép trùng với `CusCode` khác trong Firestore.
  - `CusCode` không được phép trùng với `CusCode` khác trong cùng file import.
  - Các field còn lại được phép null/empty.
- Import preview:
  - Hàng thiếu `CusCode` => lỗi `CusCode là bắt buộc`.
  - Hàng có `CusCode` duplicate => lỗi `CusCode "X" đã tồn tại` hoặc `CusCode "X" bị trùng trong file import`.

`UnitPriceList`:
- Normalize: `IzuyoshiJPCode` trim; `UnitPrice` trim và nếu có dạng số, convert sang định dạng chuẩn (loại bỏ dấu phẩy, dấu cách).
- Validate create/edit/import:
  - `IzuyoshiJPCode` bắt buộc.
  - `IzuyoshiJPCode` không được trùng với bản ghi khác trong Firestore.
  - `IzuyoshiJPCode` không được trùng trong cùng file import.
  - `UnitPrice` optional, có thể là number hoặc text; nếu nhập số thì nên parse được.
- Import preview:
  - Hàng thiếu `IzuyoshiJPCode` => lỗi `IzuyoshiJPCode là bắt buộc`.
  - Hàng duplicate `IzuyoshiJPCode` => lỗi duplicate.

`PIC.WH.CodeList`:
- Normalize: `PICCode`, `WarehouseCode`, `DetailWarehouseCode` trim.
- Validate create/edit/import:
  - `PICCode` bắt buộc.
  - `PICCode` không được phép trùng với bản ghi khác trong Firestore.
  - `PICCode` không được phép trùng trong cùng file import.
  - `WarehouseCode`, `DetailWarehouseCode` optional.
- Import preview:
  - Hàng thiếu `PICCode` => lỗi `PICCode là bắt buộc`.
  - Hàng duplicate `PICCode` => lỗi duplicate.

`UnitCodeList`:
- Normalize: `OrderUnit`, `CsvCode` trim.
- Validate create/edit/import:
  - `OrderUnit` bắt buộc.
  - `OrderUnit` không được phép trùng với bản ghi khác trong Firestore.
  - `OrderUnit` không được phép trùng trong cùng file import.
  - `CsvCode` optional.
- Import preview:
  - Hàng thiếu `OrderUnit` => lỗi `OrderUnit là bắt buộc`.
  - Hàng duplicate `OrderUnit` => lỗi duplicate.

`ItemCodeList`:
- Normalize: `MAVCode`, `MHBCode`, `IzuyoshiJPCode`, `IzuyoshiVNCode`, `Description` đều trim.
- Nếu sau trim các field optional trở thành rỗng, coi như missing.
- Validate create/edit/import:
  - `IzuyoshiJPCode` bắt buộc cho mọi hàng hợp lệ.
  - Ít nhất một trong hai giá trị `MAVCode` hoặc `MHBCode` phải có dữ liệu.
  - Nếu chỉ `MAVCode` có dữ liệu, thì hàng hợp lệ nếu `IzuyoshiJPCode` cũng có.
  - Nếu chỉ `MHBCode` có dữ liệu, thì hàng hợp lệ nếu `IzuyoshiJPCode` cũng có.
  - Nếu cả `MAVCode` và `MHBCode` đều có dữ liệu thì vẫn hợp lệ nếu không trùng duplicate rule.
  - `MAVCode` không được phép trùng với bản ghi khác trong Firestore nếu được cung cấp.
  - `MAVCode` không được phép trùng với `MAVCode` khác trong file import.
  - `MHBCode` không được phép trùng với bản ghi khác trong Firestore nếu được cung cấp.
  - `MHBCode` không được phép trùng với `MHBCode` khác trong file import.
  - `IzuyoshiJPCode` được phép trùng.
  - `IzuyoshiVNCode` được phép trùng.
  - `Description` được phép trùng.
- Import preview:
  - Hàng thiếu `IzuyoshiJPCode` => lỗi `IzuyoshiJPCode là bắt buộc`.
  - Hàng thiếu cả `MAVCode` và `MHBCode` => lỗi `Cần nhập MAVCode + IzuyoshiJPCode hoặc MHBCode + IzuyoshiJPCode`.
  - Hàng có `MAVCode` trùng Firestore => lỗi `MAVCode "X" đã tồn tại trong hệ thống`.
  - Hàng có `MAVCode` trùng trong file import => lỗi `MAVCode "X" bị trùng trong file import`.
  - Hàng có `MHBCode` trùng Firestore => lỗi `MHBCode "X" đã tồn tại trong hệ thống`.
  - Hàng có `MHBCode` trùng trong file import => lỗi `MHBCode "X" bị trùng trong file import`.
- Ghi chú:
  - `IzuyoshiJPCode` có thể trùng, nên không được dùng làm key import chính.
  - Document ID nên tạo bằng generated ID hoặc `IzuyoshiJPCode` + suffix an toàn.

Chuẩn hoá chung:
- Dùng hàm `normalizeField(value)` để trim và chuyển chuỗi rỗng thành null trước khi validate.
- Dùng hàm `normalizeNumber(value)` cho `UnitPrice` nếu cần parse số.
- Khi kiểm tra duplicate, so sánh trên giá trị đã normalize để tránh sai do khoảng trắng thừa.
- Với file import, thực hiện normalize trước, sau đó kiểm tra rule và duplicate theo thứ tự: required fields -> logic MAV/MHB -> Firestore duplicate -> file duplicate.

## 3. Buoc 2.1 - Man Hinh Danh Sach Master Data

### User Story 2.1.1 - Xem Danh Sach Master Data

La nhan vien van hanh, toi muon xem du lieu cua tung master data trong cac tab rieng, de co the kiem tra danh muc dang co truoc khi import hoac xu ly don hang.

Acceptance criteria:

- Man hinh co 5 tab: `CusCodeList`, `ItemCodeList`, `UnitPriceList`, `PIC.WH.CodeList`, `UnitCodeList`.
khi hien thi can hien thi bang tieng nhat cho nguoi nhat co the hieu, tuong ung nhu sau:
CusCodeList:得意先・納入先リスト
ItemCodeList:資材コード照合表
UnitPriceList:単価リスト
PIC.WH.CodeList：担当者・倉庫コード　リス
UnitCodeList：単位リスト

- Moi tab hien dung danh sach du lieu tu Firestore.
- Neu collection chua co du lieu, hien trang thai empty de hieu.
- Neu load loi, hien thong bao loi de nguoi dung biet.
- Reload trang khong lam mat du lieu.
- Giao dien va tat ca label, button, thong bao se hien thi bang tieng Nhat.
- Giao dien man hinh the hien day du, dep mat danh sach du lieu, neu du lieu qua dai thi co thanh cuon ngang cuon doc de nguoi dung co the xem duoc het du lieu

Use case:

| Muc | Noi dung |
| --- | --- |
| Actor | Nhan vien van hanh |
| Trigger | Nguoi dung mo man hinh Master Data |
| Precondition | Nguoi dung da dang nhap neu app co authentication |
| Main flow | Mo Master Data -> chon tab -> he thong load data -> hien bang danh sach |
| Alternative flow | Neu Firestore loi, hien thong bao loi va nut thu lai |
| Postcondition | Nguoi dung xem duoc du lieu cua collection da chon |

### User Story 2.1.2 - Tim Kiem Master Data

La nhan vien van hanh, toi muon tim kiem nhanh trong tung danh muc, de kiem tra mot ma da ton tai hay chua.

Acceptance criteria:

- Moi tab co o search.
- Search theo cac field hien thi trong tab.
- Search khong phan biet hoa/thuong.
- Search nen trim khoang trang dau/cuoi.
- Khi khong co ket qua, hien thong bao "Khong tim thay du lieu phu hop".

Use case:

| Muc | Noi dung |
| --- | --- |
| Actor | Nhan vien van hanh |
| Trigger | Nguoi dung nhap tu khoa vao o search |
| Precondition | Danh sach master data da load |
| Main flow | Nhap keyword -> he thong loc danh sach -> hien ket qua |
| Alternative flow | Khong co ket qua -> hien empty state |
| Postcondition | Nguoi dung xac dinh duoc ma can tim co ton tai hay chua |

### User Story 2.1.3 - Them Moi `CusCodeList`

La nhan vien van hanh, toi muon them moi customer code, de he thong co the lookup thong tin customer khi apply rule.

Field:

- `CusCode`: bat buoc, khong duoc trung.
- `CusNameEng`: optional.
- `CusNameJP`: optional.
- `CusAddress`: optional.

Acceptance criteria:

- Khong cho luu neu `CusCode` trong.
- Khong cho luu neu `CusCode` da ton tai.
- Cac field con lai duoc phep trong.
- Sau khi luu thanh cong, dong moi hien trong danh sach.

Use case:

| Muc | Noi dung |
| --- | --- |
| Actor | Nhan vien van hanh |
| Trigger | Bam nut Them moi trong tab `CusCodeList` |
| Precondition | Nguoi dung co quyen tao master data |
| Main flow | Bam Them moi -> nhap `CusCode` -> bam Luu -> validate -> ghi Firestore -> refresh danh sach |
| Alternative flow | `CusCode` trong -> bao loi tai field |
| Alternative flow | `CusCode` trung -> bao loi trung lap |
| Postcondition | Ban ghi customer moi duoc tao |

### User Story 2.1.4 - Them Moi `UnitPriceList`

La nhan vien van hanh, toi muon them moi don gia theo `IzuyoshiJPCode`, de he thong co the lookup gia khi xu ly CSV.

Field:

- `IzuyoshiJPCode`: bat buoc, khong duoc trung.
- `UnitPrice`: optional.

Acceptance criteria:

- Khong cho luu neu `IzuyoshiJPCode` trong.
- Khong cho luu neu `IzuyoshiJPCode` da ton tai.
- `UnitPrice` duoc phep trong.
- Neu `UnitPrice` co gia tri, nen chap nhan number hoac text theo data hien co.

Use case:

| Muc | Noi dung |
| --- | --- |
| Actor | Nhan vien van hanh |
| Trigger | Bam Them moi trong tab `UnitPriceList` |
| Precondition | Nguoi dung co quyen tao master data |
| Main flow | Nhap `IzuyoshiJPCode` va `UnitPrice` neu co -> bam Luu -> validate -> ghi Firestore |
| Alternative flow | `IzuyoshiJPCode` trong/trung -> bao loi |
| Postcondition | Ban ghi unit price moi duoc tao |

### User Story 2.1.5 - Them Moi `PIC.WH.CodeList`

La nhan vien van hanh, toi muon them moi PIC/warehouse code, de he thong co the lookup warehouse khi nguoi dung nhap ma PIC cho batch.

Field:

- `PICCode`: bat buoc, khong duoc trung.
- `WarehouseCode`: optional.
- `DetailWarehouseCode`: optional.

Acceptance criteria:

- Khong cho luu neu `PICCode` trong.
- Khong cho luu neu `PICCode` da ton tai.
- `WarehouseCode` va `DetailWarehouseCode` duoc phep trong.

Use case:

| Muc | Noi dung |
| --- | --- |
| Actor | Nhan vien van hanh |
| Trigger | Bam Them moi trong tab `PIC.WH.CodeList` |
| Precondition | Nguoi dung co quyen tao master data |
| Main flow | Nhap `PICCode` -> bam Luu -> validate -> ghi Firestore |
| Alternative flow | `PICCode` trong/trung -> bao loi |
| Postcondition | Ban ghi PIC/warehouse moi duoc tao |

### User Story 2.1.6 - Them Moi `UnitCodeList`

La nhan vien van hanh, toi muon them moi mapping unit code, de he thong co the doi unit trong file don hang sang CSV code.

Field:

- `OrderUnit`: bat buoc, khong duoc trung.
- `CsvCode`: optional.

Acceptance criteria:

- Khong cho luu neu `OrderUnit` trong.
- Khong cho luu neu `OrderUnit` da ton tai.
- `CsvCode` duoc phep trong.

Use case:

| Muc | Noi dung |
| --- | --- |
| Actor | Nhan vien van hanh |
| Trigger | Bam Them moi trong tab `UnitCodeList` |
| Precondition | Nguoi dung co quyen tao master data |
| Main flow | Nhap `OrderUnit` -> bam Luu -> validate -> ghi Firestore |
| Alternative flow | `OrderUnit` trong/trung -> bao loi |
| Postcondition | Ban ghi unit code moi duoc tao |

### User Story 2.1.7 - Them Moi `ItemCodeList`

La nhan vien van hanh, toi muon them moi item code cho MAV hoac MHB, de he thong co the lookup item khi apply rule.

Field:

- `Description`: optional.
- `MAVCode`: optional nhung neu dung MAV thi can co.
- `MHBCode`: optional nhung neu dung MHB thi can co.
- `IzuyoshiJPCode`: bat buoc trong moi dong hop le.
- `IzuyoshiVNCode`: optional.

Acceptance criteria:

- Cho luu neu `MAVCode` va `IzuyoshiJPCode` cung co du lieu.
- Cho luu neu `MHBCode` va `IzuyoshiJPCode` cung co du lieu.
- Khong cho luu neu `IzuyoshiJPCode` trong.
- Khong cho luu neu chi co `MAVCode` ma khong co `IzuyoshiJPCode`.
- Khong cho luu neu chi co `MHBCode` ma khong co `IzuyoshiJPCode`.
- Khong cho luu neu co `IzuyoshiJPCode` nhung ca `MAVCode` va `MHBCode` deu trong.
- Khong cho luu neu `MAVCode` da trung voi ban ghi khac.
- Khong cho luu neu `MHBCode` da trung voi ban ghi khac.
- Cho phep `IzuyoshiJPCode` trung.
- Cho phep `Description` va `IzuyoshiVNCode` trong hoac trung.

Use case:

| Muc | Noi dung |
| --- | --- |
| Actor | Nhan vien van hanh |
| Trigger | Bam Them moi trong tab `ItemCodeList` |
| Precondition | Nguoi dung co quyen tao master data |
| Main flow | Nhap MAV/MHB code va `IzuyoshiJPCode` -> bam Luu -> validate cap field -> validate duplicate -> ghi Firestore |
| Alternative flow | Thieu cap hop le -> bao loi dieu kien nhap lieu |
| Alternative flow | `MAVCode` trung -> bao loi tai field `MAVCode` |
| Alternative flow | `MHBCode` trung -> bao loi tai field `MHBCode` |
| Postcondition | Ban ghi item code moi duoc tao |

### User Story 2.1.8 - Sua Master Data

La nhan vien van hanh, toi muon sua master data da co, de cap nhat thong tin khi danh muc thay doi.

Acceptance criteria:

- Sua duoc cac field cua ban ghi.
- Khi sua collection co rule field dau tien, field dau tien van khong duoc trong/trung voi ban ghi khac.
- Khi sua `ItemCodeList`, van ap dung rule cap MAV/MHB va duplicate MAV/MHB.
- Khi kiem tra duplicate trong chuc nang sua, phai bo qua chinh ban ghi dang sua.
- Sau khi luu, danh sach cap nhat du lieu moi.

Use case:

| Muc | Noi dung |
| --- | --- |
| Actor | Nhan vien van hanh |
| Trigger | Bam Sua tren mot dong master data |
| Precondition | Ban ghi da ton tai va nguoi dung co quyen sua |
| Main flow | Mo form sua -> thay doi data -> bam Luu -> validate -> update Firestore |
| Alternative flow | Du lieu moi vi pham rule -> hien loi va khong update |
| Postcondition | Ban ghi duoc cap nhat |

### User Story 2.1.9 - Xoa Master Data

## Yêu cầu bổ sung (2026-06-02)

Yêu cầu UI/UX mới do người dùng chỉ định:

- Đưa các button `編集` / `削除` (sửa / xóa) lên cột đầu tiên của bảng (action-first column).
- Cố định header của bảng (sticky header) để khi cuộn xuống vẫn thấy tiêu đề.
- Thêm tùy chọn sắp xếp cho mỗi tiêu đề cột (per-column sort).
- Thêm tùy chọn ẩn/hiện cột (column visibility) để người dùng chọn cột cần xem.
- Thêm phân trang với chọn kích thước trang: 10 / 20 / 30 / 40 / 50 / All và hiển thị tổng số trang / tổng dòng.
- Export (CSV/XLSX) phải tôn trọng filter/visible-columns; disable "export filtered" khi không có kết quả lọc.

## Cách triển khai (tóm tắt thực hiện)

Những thay đổi đã triển khai trong repository để đáp ứng yêu cầu trên:

- Thay thế helper `renderTable(...)` bằng component React `RenderTable` có:
  - Cột "操作" (action) hiển thị ở cột đầu nếu có action.
  - Header cố định (`sticky top-0`) để giữ tiêu đề khi cuộn.
  - Sort client-side theo cột (click đổi `asc`/`desc`).
  - Column visibility: checkbox toggles cho từng cột (và cho cột 操作).
  - Pagination với lựa chọn page-size (10/20/30/40/50/All) và Prev/Next cùng hiển thị Page X/Y.

- File đã chỉnh sửa:
  - [src/app/(private)/masterdata/page.tsx](src/app/(private)/masterdata/page.tsx#L1) — thay `renderTable` bằng `RenderTable` và cập nhật tất cả các chỗ gọi tương ứng.
  - (Đã có thay đổi trước đó cho điều hướng) [src/components/app-sidebar.tsx](src/components/app-sidebar.tsx#L1) và [src/components/command-search.tsx](src/components/command-search.tsx#L1) để thêm entry `/masterdata`.

Ghi chú kỹ thuật ngắn:

- Cách triển khai hiện tại dùng xử lý client-side (useState/useMemo) cho sort, column visibility và pagination để giữ thay đổi nhẹ nhàng và dễ áp dụng cho nhiều tab.
- Export hiện chưa được tái cấu hình tự động để áp dụng `visibleColumns` và `filteredRows` — tôi có thể nối thêm để export chỉ các cột/dòng đang hiển thị khi bạn muốn.
- Nếu muốn tính năng sắp xếp/ẩn-cột/phan-trang mạnh mẽ hơn (ví dụ: multi-sort, server-side paging, persist column state), đề xuất refactor sang TanStack Table (`@tanstack/react-table`) dựa trên ví dụ trong `src/modules/item-code-list/components`.

Nếu bạn muốn, tôi sẽ bổ sung phần hướng dẫn kiểm thử cho những thay đổi UI này vào `Docs/masterdata.md` hoặc tạo `Docs/masterdata-test-plan.md` riêng.

La admin hoac nhan vien duoc phan quyen, toi muon xoa master data khong con dung, de danh muc khong bi rac.

Acceptance criteria:

- Co nut xoa tren tung dong neu nguoi dung co quyen.
- Truoc khi xoa phai hien dialog xac nhan.
- Xoa xong ban ghi bien mat khoi danh sach.
- Neu Firestore loi, hien thong bao loi.

Use case:

| Muc | Noi dung |
| --- | --- |
| Actor | Admin hoac Operator duoc phan quyen |
| Trigger | Bam Xoa tren mot dong |
| Precondition | Ban ghi ton tai |
| Main flow | Bam Xoa -> xac nhan -> delete Firestore -> refresh danh sach |
| Alternative flow | Bam Huy -> khong xoa |
| Alternative flow | Delete loi -> hien loi |
| Postcondition | Ban ghi bi xoa neu nguoi dung xac nhan thanh cong |

## 4. Buoc 2.2 - Import Master Data Tu CSV/Excel

### User Story 2.2.0 - Download Template Import

La nhan vien van hanh, toi muon tai xuong template CSV/Excel cho tung collection, de nhap du lieu dung cau truc truoc khi import.

Acceptance criteria:

- Moi tab master data co nut `Download Template`.
- Template la file CSV hoac Excel co header dung ten field va chu thich bang tieng Nhat.
- Moi cot header phai giong cau truc collection tu Firestore.
- Template co cac thong diep ngan ve cach nhap du lieu, vi du: `必須`, `重複不可`, `例: ...`.
- Template giup user tranh sai header va thieu cot khi import.
- Moi collection se co chi tiet header va mo ta field bang tieng Nhat trong dong thong tin hoac row chu thich.

Template chi tiet cho tung collection:

- `CusCodeList`:
  - `CusCode` - 得意先コード (必須、重複不可)
  - `CusNameEng` - 英語名称
  - `CusNameJP` - 日本語名称
  - `CusAddress` - 住所
  - Ghi chú: `CusCode` は必須です。空白は無効です。

- `ItemCodeList`:
  - `MAVCode` - MAVコード (MAVを使用する場合は必須、重複不可)
  - `MHBCode` - MHBコード (MHBを使用する場合は必須、重複不可)
  - `IzuyoshiJPCode` - 伊豆良しJPコード (必須、重複可)
  - `IzuyoshiVNCode` - 伊豆良しVNコード
  - `Description` - 説明
  - Ghi chú: `MAVCode` または `MHBCode` のいずれかと `IzuyoshiJPCode` が必要です。

- `UnitPriceList`:
  - `IzuyoshiJPCode` - 伊豆良しJPコード (必須、重複不可)
  - `UnitPrice` - 単価
  - Ghi chú: `UnitPrice` は数値またはテキストとして入力できます。

- `PIC.WH.CodeList`:
  - `PICCode` - PICコード (必須、重複不可)
  - `WarehouseCode` - 倉庫コード
  - `DetailWarehouseCode` - 詳細倉庫コード
  - Ghi chú: `PICCode` は必須です。

- `UnitCodeList`:
  - `OrderUnit` - オーダー単位 (必須、重複不可)
  - `CsvCode` - CSVコード
  - Ghi chú: `OrderUnit` は必須です。

Use case:

| Muc | Noi dung |
| --- | --- |
| Actor | Nhan vien van hanh |
| Trigger | Bam nut Download Template |
| Precondition | Nguoi dung o trong tab master data |
| Main flow | Bam Download Template -> mo file -> dien thong tin theo header |
| Alternative flow | Tai file sai -> tai lai |
| Postcondition | User co file template de nhap du lieu dung cau truc |

### User Story 2.2.1 - Export Master Data CSV/Excel

La nhan vien van hanh, toi muon xuat du lieu master data ra CSV hoac Excel, de luu hoac chia se du lieu nhanh chong.

Acceptance criteria:

- Moi tab master data co nut `Export`.
- Cho phep xuat toan bo du lieu cua collection ra CSV hoac Excel.
- Cho phep xuat chi phan ket qua da search/loc ra CSV hoac Excel.
- Hien thi option `Export all` va `Export filtered results` bang tieng Nhat.
- File xuat phai gom header dung voi cau truc collection va ten field bang tieng Nhat neu can.
- Neu khong co ket qua, nut `Export filtered results` phai bi vo hieu.

Use case:

| Muc | Noi dung |
| --- | --- |
| Actor | Nhan vien van hanh |
| Trigger | Bam nut Export |
| Precondition | Du lieu da duoc load va/hoac da search |
| Main flow | Chon `Export all` hoac `Export filtered results` -> he thong tai file -> thong bao thanh cong |
| Alternative flow | Khong co ket qua tim thay -> disable `Export filtered results` |
| Postcondition | User co file CSV/Excel chua du lieu mong muon |

### User Story 2.2.2 - Upload File Import

La nhan vien van hanh, toi muon upload file CSV/Excel cho tung master data, de import nhieu dong nhanh hon nhap tay.

Acceptance criteria:

- Moi tab master data co nut Import.
- Cho phep chon file CSV hoac Excel.
- He thong doc sheet dau tien neu la Excel.
- He thong hien preview truoc khi luu.
- Neu file sai format hoac thieu header can thiet, bao loi ro rang.
- Cho phep tai xuong template CSV/Excel cho tung collection de nguoi dung diền thong tin dung cau truc.
- Template phai hien thong tin header va mo ta cach nhap thong tin trong tieng Nhat.

Use case:

| Muc | Noi dung |
| --- | --- |
| Actor | Nhan vien van hanh |
| Trigger | Bam Import trong mot tab master data |
| Precondition | Nguoi dung co quyen import |
| Main flow | Chon file -> he thong parse file -> hien preview |
| Alternative flow | File khong doc duoc -> hien loi |
| Alternative flow | Header khong dung -> hien loi thieu cot |
| Postcondition | Du lieu nam o trang thai preview, chua ghi vao Firestore |

### User Story 2.2.2 - Preview Va Validate Import Cho 4 Collection Co Field Dau Tien La Khoa

La nhan vien van hanh, toi muon he thong kiem tra file import truoc khi luu, de tranh tao du lieu trung lap hoac thieu khoa chinh.

Ap dung cho:

- `CusCodeList`
- `UnitPriceList`
- `PIC.WH.CodeList`
- `UnitCodeList`

Acceptance criteria:

- Preview hien tung dong se import.
- Dong nao co field dau tien trong thi bi danh dau loi.
- Dong nao co field dau tien trung voi Firestore thi bi danh dau loi.
- Dong nao co field dau tien trung voi dong khac trong file import thi bi danh dau loi.
- Cac field khac de trong van khong bi loi.
- Nguoi dung chi duoc bam Confirm Import khi khong con dong loi.
- He thong khong ghi bat ky dong nao vao Firestore neu file con loi validation.

Use case:

| Muc | Noi dung |
| --- | --- |
| Actor | Nhan vien van hanh |
| Trigger | File import da parse xong |
| Precondition | He thong biet collection dang import |
| Main flow | Kiem tra field dau tien -> kiem tra duplicate trong Firestore -> kiem tra duplicate trong file -> hien preview kem status tung dong |
| Alternative flow | Co loi -> disable Confirm Import va hien ly do |
| Alternative flow | Khong co loi -> cho phep Confirm Import |
| Postcondition | Nguoi dung biet file co import duoc hay can sua |

### User Story 2.2.2.a - Import Preview va Row-level Validation

La nhan vien van hanh, toi muon xem truoc tung dong import va biet chinh xac dong nao loi, de sua file truoc khi confirm.

Acceptance criteria:

- Preview hien table tung dong import, bao gom cac cot du lieu va cot `Status`/`Error`.
- Moi dong duoc parse va normalize truoc khi check.
- Dong co loi duoc danh dau mau do va hien thong bao loi tieng Nhat trong cot `Error`.
- Dong khong co loi hien `準備完了` hoac `OK` trong cot `Status`.
- Neu co dong loi, nut `インポートを確定` phai bi vo hieu.
- Neu het loi, nguoi dung co the chinh sua file va upload lai.
- Neu file sai header hoac thieu cot, hien thong bao `ファイルの形式が正しくありません。項目ヘッダーを確認してください。`.
- Neu file rong, hien thong bao `インポートするデータがありません。`.
- Row-level validation duoc ap dung theo tung collection nhu sau:
  - `CusCodeList`, `UnitPriceList`, `PIC.WH.CodeList`, `UnitCodeList`: required key field, Firestore duplicate, file duplicate.
  - `ItemCodeList`: required `IzuyoshiJPCode`, required cap `MAVCode` hoac `MHBCode`, Firestore duplicate cho MAV/MHB, file duplicate cho MAV/MHB.

Validation va thong bao loi:

- `Field [ten field] la bat buoc, vui long nhap gia tri.` -> `必須項目です。`.
- `Field [ten field] trung voi Firestore` -> `[field]「{value}」は既に存在します。`.
- `Field [ten field] trung trong file import` -> `[field]「{value}」はファイル内で重複しています。`.
- `ItemCodeList thieu IzuyoshiJPCode` -> `IzuyoshiJPCode は必須です。`.
- `ItemCodeList thieu ca MAV va MHB` -> `MAVCode または MHBCode と IzuyoshiJPCode の組み合わせが必要です。`.
- `File sai format` -> `ファイルの形式が正しくありません。ヘッダーを確認してください。`.

Row validation logic:

- Normalization: trim tat ca field va doi chuoi rong thanh null.
- Required field check truoc.
- Duplicate check Firestore: so sanh gia tri field khoa chinh da normalize.
- Duplicate check file: so sanh gia tri field khoa chinh da normalize giua cac dong trong file.
- ItemCodeList logic: check `IzuyoshiJPCode` truoc, sau do check cap MAV/MHB, sau do check duplicate MAV/MHB.
- Cac row duoc gom nhom 3 trang thai: `Valid`, `Warning` (khong su dung neu co warning), `Error`.
- Chi nhan row valid khi tat ca rule duoc thoa.

### User Story 2.2.3 - Preview Va Validate Import Cho `ItemCodeList`

La nhan vien van hanh, toi muon he thong kiem tra logic MAV/MHB khi import item code, de tranh sai mapping item khi apply rule.

Acceptance criteria:

- Moi dong hop le neu co `MAVCode` + `IzuyoshiJPCode`.
- Moi dong hop le neu co `MHBCode` + `IzuyoshiJPCode`.
- Dong khong co `IzuyoshiJPCode` bi loi.
- Dong co `IzuyoshiJPCode` nhung khong co ca `MAVCode` va `MHBCode` bi loi.
- Dong co `MAVCode` trung voi Firestore bi loi.
- Dong co `MAVCode` trung voi dong khac trong file import bi loi.
- Dong co `MHBCode` trung voi Firestore bi loi.
- Dong co `MHBCode` trung voi dong khac trong file import bi loi.
- `IzuyoshiJPCode` trung khong bi loi.
- `Description` va `IzuyoshiVNCode` trong/trung khong bi loi.
- Nguoi dung chi duoc Confirm Import khi khong con dong loi.

Use case:

| Muc | Noi dung |
| --- | --- |
| Actor | Nhan vien van hanh |
| Trigger | Upload file import `ItemCodeList` |
| Precondition | File co header `MAVCode`, `MHBCode`, `IzuyoshiJPCode` |
| Main flow | Parse file -> validate cap MAV/MHB -> check duplicate MAV/MHB voi Firestore -> check duplicate MAV/MHB trong file -> hien preview |
| Alternative flow | Thieu header bat buoc -> bao loi file format |
| Alternative flow | Co dong loi -> disable Confirm Import |
| Alternative flow | Khong co loi -> cho phep Confirm Import |
| Postcondition | File import duoc xac nhan hop le hoac hien loi can sua |

### User Story 2.2.4 - Confirm Import

La nhan vien van hanh, toi muon xac nhan import sau khi preview hop le, de du lieu duoc ghi vao Firestore.

Acceptance criteria:

- Nut Confirm Import chi enable khi khong co loi validation.
- Khi confirm, he thong ghi tat ca dong hop le vao dung collection.
- Document ID duoc tao theo khoa nghiep vu:
  - `CusCodeList`: `CusCode`
  - `UnitPriceList`: `IzuyoshiJPCode`
  - `PIC.WH.CodeList`: `PICCode`
  - `UnitCodeList`: `OrderUnit`
  - `ItemCodeList`: nen dung generated ID hoac `IzuyoshiJPCode` kem suffix an toan neu can, vi `IzuyoshiJPCode` duoc phep trung.
- Sau import thanh cong, hien summary so dong da import.
- Danh sach master data refresh va hien du lieu moi.

Use case:

| Muc | Noi dung |
| --- | --- |
| Actor | Nhan vien van hanh |
| Trigger | Bam Confirm Import |
| Precondition | Preview khong co loi |
| Main flow | Bam Confirm -> batch write vao Firestore -> hien ket qua -> refresh danh sach |
| Alternative flow | Firestore write loi -> hien loi va khong dong dialog |
| Postcondition | Du lieu import duoc luu vao Firestore |

### User Story 2.2.5 - Huy Import

La nhan vien van hanh, toi muon huy import sau khi preview, de khong ghi du lieu neu thay file sai.

Acceptance criteria:

- Co nut Cancel/Huy trong man hinh preview.
- Bam Huy thi dong dialog va khong ghi Firestore.
- Du lieu hien co trong collection khong bi thay doi.

Use case:

| Muc | Noi dung |
| --- | --- |
| Actor | Nhan vien van hanh |
| Trigger | Bam Huy trong preview import |
| Precondition | File da parse nhung chua confirm |
| Main flow | Bam Huy -> dong dialog -> clear preview |
| Postcondition | Khong co data nao duoc import |

## 5. Bang Thong Bao Loi De Xuat

| Tinh huong | Thong bao de xuat |
| --- | --- |
| Field dau tien trong | `Field [ten field] la bat buoc, vui long nhap gia tri.` |
| Field dau tien trung Firestore | `[ten field] "[gia tri]" da ton tai trong he thong.` |
| Field dau tien trung trong file import | `[ten field] "[gia tri]" bi trung trong file import.` |
| `ItemCodeList` thieu `IzuyoshiJPCode` | `IzuyoshiJPCode la bat buoc cho ItemCodeList.` |
| `ItemCodeList` thieu ca MAV/MHB | `Can nhap MAVCode + IzuyoshiJPCode hoac MHBCode + IzuyoshiJPCode.` |
| `MAVCode` trung Firestore | `MAVCode "[gia tri]" da ton tai trong he thong.` |
| `MAVCode` trung trong file import | `MAVCode "[gia tri]" bi trung trong file import.` |
| `MHBCode` trung Firestore | `MHBCode "[gia tri]" da ton tai trong he thong.` |
| `MHBCode` trung trong file import | `MHBCode "[gia tri]" bi trung trong file import.` |
| File sai format | `File import khong dung format. Vui long kiem tra header cot.` |
| Firestore loi | `Khong the luu du lieu len Firebase. Vui long thu lai.` |

## 6. Tieu Chi Hoan Thanh Phase 2

Phase 2 duoc xem la xong khi:

- Co man hinh Master Data voi 5 tab.
- Moi tab co list/search/create/update/delete.
- Moi form create/update validate dung rule cua collection.
- Import CSV/Excel co preview.
- Import validate duplicate voi Firestore va duplicate trong file.
- `ItemCodeList` validate dung rule MAV/MHB rieng.
- Khong ghi du lieu vao Firestore khi file import con loi.
- Sau khi them/sua/xoa/import, danh sach refresh dung.
- Loi hien thi ro de nguoi non-tech biet can sua field nao.

## 7. Danh Sach Tinh Nang Can Lam Theo Block

De thuc hien toan bo `masterdata.md`, can lam cac block tinh nang sau:

1. Tab danh sach master data
- 5 tab collection: `CusCodeList`, `ItemCodeList`, `UnitPriceList`, `PIC.WH.CodeList`, `UnitCodeList`.
- Moi tab co label tieng Nhat: `得意先・納入先リスト`, `資材コード照合表`, `単価リスト`, `担当者・倉庫コードリスト`, `単位リスト`.
- Load data tu Firestore cho tung tab.
- Hien empty state neu khong co du lieu.
- Hien error state neu Firestore load loi.
- Man hinh co cuon ngang/vertical de xem du lieu du day.

2. Search
- Input search tren tung tab.
- Search tren cac field hien thi cua collection.
- Search khong phan biet hoa/thuong va trim khoang trang dau/cuoi.
- Hien `No results` bang tieng Nhat neu khong tim thay.

3. Create / Edit / Delete
- Form create/edit cho tung collection.
- Validation rule tuong ung:
  - `CusCodeList`: `CusCode` bat buoc va duy nhat.
  - `UnitPriceList`: `IzuyoshiJPCode` bat buoc va duy nhat.
  - `PIC.WH.CodeList`: `PICCode` bat buoc va duy nhat.
  - `UnitCodeList`: `OrderUnit` bat buoc va duy nhat.
  - `ItemCodeList`: `IzuyoshiJPCode` bat buoc; `MAVCode` hoac `MHBCode` cung phai co; cho phep `IzuyoshiJPCode` trung; `MAVCode`/`MHBCode` khong duoc trung voi Firestore hoac file import.
- Duplicate check khi create/edit.
- Edit bo qua ban ghi dang sua khi check duplicate.
- Delete co xac nhan truoc khi xoa.

4. Import Template
- Nut `Download Template` tren tung tab.
- Template CSV/Excel cho tung collection phai co header dung theo schema.
- Template chi thich tieng Nhat: `必須`, `重複不可`, `例:` va mo ta field.
- Template giup user nhap dung cau truc truoc khi import.

5. Import Preview va Validate
- Upload file CSV hoac Excel.
- Doc sheet dau tien neu la Excel.
- Preview tung dong truoc khi ghi Firestore.
- Row-level validation theo rule tung collection.
- `CusCodeList` / `UnitPriceList` / `PIC.WH.CodeList` / `UnitCodeList`: field khoa chinh bat buoc, duplicate check Firestore va file import.
- `ItemCodeList`: validation logic MAV/MHB va `IzuyoshiJPCode`; duplicate `MAVCode`/`MHBCode` Firestore va file import; `IzuyoshiJPCode` duoc phep trung.
- Dong co loi phai duoc danh dau va hien thong bao loi tieng Nhat.
- Khong cho Confirm Import neu con loi.
- Khong ghi bat ky dong nao vao Firestore neu file con loi.

6. Export CSV/Excel
- Nut `Export` tren tung tab.
- `Export all`: xuat tat ca du lieu trong collection.
- `Export filtered results`: xuat chi ket qua da search/loc.
- Disable `Export filtered results` neu khong co ket qua.
- File export co header dung va ten file ro rang.

6.1. Thiet ke chi tiet chuc nang export
- `Export` se la drop-down hoac menu nho voi 2 lua chon: `すべてエクスポート` va `検索結果をエクスポート`.
- Neu chon `すべてエクスポート`, he thong se xuat tat ca cac ban ghi da load cua collection toi file CSV/Excel.
- Neu chon `検索結果をエクスポート`, he thong se xuat chi cac ban ghi dang hien thi sau khi search/loc.
- Neu khong co ket qua filter, lua chon `検索結果をエクスポート` phai bi disable va hien thong bao nho `検索結果がありません。`.
- Nguoi dung co the chon dinh dang file: `CSV` hoac `Excel`.
- Ten file export nen theo mau: `<CollectionName>_<YYYYMMDD>_<all|filtered>.csv` hoac `.xlsx`.
- Header file export phai dung gia tri field collection, co the them dong header tieng Nhat hoac mo ta tren o chu thich.
- Neu xuat du lieu `filter`, can thong bao so ban ghi duoc xuat va thong bao tieng Nhat: `検索結果 {count} 件をエクスポートしました。`.
- Neu xuat `all`, thong bao: `すべてのデータ {count} 件をエクスポートしました。`.
- Kieu du lieu export:
  - `CusCodeList`: `CusCode`, `CusNameEng`, `CusNameJP`, `CusAddress`.
  - `ItemCodeList`: `MAVCode`, `MHBCode`, `IzuyoshiJPCode`, `IzuyoshiVNCode`, `Description`.
  - `UnitPriceList`: `IzuyoshiJPCode`, `UnitPrice`.
  - `PIC.WH.CodeList`: `PICCode`, `WarehouseCode`, `DetailWarehouseCode`.
  - `UnitCodeList`: `OrderUnit`, `CsvCode`.
- Neu co dang data nhap khac (nhu numeric, text), duy tri theo dang goc khi xuat.

6.2. Hien thi UI export
- Button `エクスポート` nam gan ben `インポート` va `テンプレートダウンロード`.
- Khi click `エクスポート`, hien dropdown hoac modal:
  - `すべてエクスポート` (Export all)
  - `検索結果をエクスポート` (Export filtered results)
  - `形式` : `CSV` / `Excel`
- Neu khong co ket qua search, disable `検索結果をエクスポート` va hien tooltip `検索結果がありません。`.
- Sau khi xuat, hien toast `エクスポートが完了しました。` hoac `エクスポートに失敗しました。` neu co loi.
- Thong bao loi co the la: `エクスポート中にエラーが発生しました。再試行してください。`.

7. UI/UX tieng Nhat
- Tat ca button, label, thong bao, trang thai empty, loi, confirm phai bang tieng Nhat.
- Hien thong tin chi tiet de nguoi non-tech hieu duoc.
- Su dung nhàn button tiéng Nhat cho cac hanh dong chinh: `ダウンロードテンプレート`, `インポート`, `エクスポート`, `検索`, `新規作成`, `編集`, `削除`, `確認`, `キャンセル`.
- Thong bao empty: `データがありません。`, `検索条件に一致するデータが見つかりません。`.
- Thong bao loi: `読み込み中にエラーが発生しました。`, `必須項目が不足しています。`, `重複するデータが存在します。`, `ファイルの形式が正しくありません。`.
- Xac nhan truoc khi xoa: `このデータを削除してもよろしいですか？`.
- Dialog import: `インポートプレビュー`, `行ごとのエラーを確認してください。`, `インポートを確定`, `キャンセル`.

7.1. Ke hoach chi tiet UI/UX cho tung tab
- Header chung: `マスタデータ管理`.
- Tab bar voi 5 tab tieng Nhat:
  - `得意先・納入先リスト` (CusCodeList)
  - `資材コード照合表` (ItemCodeList)
  - `単価リスト` (UnitPriceList)
  - `担当者・倉庫コードリスト` (PIC.WH.CodeList)
  - `単位リスト` (UnitCodeList)
- Moi tab co:
  - Search bar o cuoi tren: placeholder `検索キーワードを入力`.
  - Buttons: `テンプレートダウンロード`, `インポート`, `エクスポート`.
  - Table column headers tieng Nhat theo schema.
  - `新規作成` button o tren ben phai.
- Table row actions: `編集`, `削除`.
- Hien thi so dong va pagination neu can.

7.2. Chi tiet nut va state
- `テンプレートダウンロード` (Download Template): tai xuong template cho collection.
- `インポート` (Import): mo modal hoac drawer chon file CSV/Excel.
- `エクスポート` (Export): drop-down hoac modal chon `すべてエクスポート` va `検索結果をエクスポート`.
- `新規作成` (Create): mo form nhap du lieu.
- Trong form: label field tieng Nhat, loi validate doi thong tin phan biet ro.
- Empty state: hien `データがありません。` va gợi ý `テンプレートをダウンロードしてデータを追加してください。`.
- Error state: hien `読み込み中にエラーが発生しました。再試行してください。` va button `再読み込み`.

7.3. Chi tiet preview import
- Modal `インポートプレビュー` bao gom:
  - Table preview voi cac dong file.
  - Cot trang thai `ステータス` va thong bao loi tieng Nhat nhu `必須項目が欠落しています。`, `重複データがあります。`.
  - Nut `インポートを確定` va `キャンセル`.
  - Neu co loi: hien `エラーがあるため、インポートを実行できません。`.

7.4. Chi tiet export
- Export panel/tooltip: `エクスポート形式を選択` va chon CSV/Excel.
- `すべてエクスポート` -> xuat tat ca du lieu.
- `検索結果をエクスポート` -> xuat chi ket qua tim kiem.
- Neu khong co ket qua: hien `エクスポートする検索結果がありません。` va disable lua chon.

8. Test case
8.1. Load data va navigation
- Mở màn hình Master Data và xác nhận 5 tab hiển thị đúng.
- Chuyển qua từng tab: `得意先・納入先リスト`, `資材コード照合表`, `単価リスト`, `担当者・倉庫コードリスト`, `単位リスト`.
- Kiểm tra dữ liệu load thành công và hiển thị trong bảng.
- Kiểm tra empty state khi collection không có dữ liệu.
- Kiểm tra error state khi Firestore load sai.

8.2. Search va filter
- Nhập keyword vào search của mỗi tab.
- Xác nhận kết quả search lọc đúng theo các field hiển thị.
- Kiểm tra search trim khoảng trắng đầu/cuối.
- Kiểm tra search không phân biệt hoa/thường.
- Kiểm tra hiển thị `検索条件に一致するデータが見つかりません。` khi không tìm thấy.

8.3. CRUD
- Create:
  - Tạo mới record hợp lệ trên mỗi tab.
  - Kiểm tra validation báo lỗi khi field bắt buộc thiếu.
  - Kiểm tra không tạo được khi duplicate key tồn tại.
- Edit:
  - Sửa record hiện có và lưu.
  - Kiểm tra validation tương tự create.
  - Kiểm tra duplicate check bỏ qua record đang sửa.
- Delete:
  - Xóa record và xác nhận dialog `このデータを削除してもよろしいですか？`.
  - Xác nhận record biến mất khỏi bảng.

8.4. Download template
- Nhấn `テンプレートダウンロード` trên mỗi tab.
- Mở file template và kiểm tra header đúng theo collection.
- Kiểm tra các chú thích tiếng Nhật xuất hiện và hướng dẫn rõ ràng.
- Kiểm tra template chứa dòng chú ý `必須`, `重複不可`, `例:`.

8.5. Import CSV/Excel va preview validation
- Upload file Excel/CSV đúng format cho mỗi collection.
- Kiểm tra sheet đầu tiên được đọc khi import Excel.
- Kiểm tra preview hiện table và status `準備完了` cho các dòng hợp lệ.
- Kiểm tra row-level error hiển thị chính xác thông báo tiếng Nhật:
  - `必須項目です。`
  - `PICCode「X」は既に存在します。`
  - `OrderUnit「X」はファイル内で重複しています。`
  - `IzuyoshiJPCode は必須です。`
  - `MAVCode または MHBCode と IzuyoshiJPCode の組み合わせが必要です。`
- Kiểm tra `インポートを確定` disable nếu còn lỗi.
- Upload file thiếu header và kiểm tra lỗi `ファイルの形式が正しくありません。ヘッダーを確認してください。`.
- Upload file rỗng và kiểm tra lỗi `インポートするデータがありません。`.

8.6. Confirm import va rollback
- Với file hợp lệ, nhấn `インポートを確定` và xác nhận dữ liệu được ghi lên Firestore.
- Với file còn lỗi, nhấn `キャンセル` và xác nhận không có dữ liệu nào được ghi.

8.7. Export all va export filtered results
- Nhấn `エクスポート` và chọn `すべてエクスポート`.
- Xác nhận file tải về với tên `CollectionName_YYYYMMDD_all.csv` hoặc `.xlsx`.
- Kiểm tra nội dung file có đủ các bản ghi và header đúng.
- Search/filter trước khi export và chọn `検索結果をエクスポート`.
- Xác nhận file chỉ chứa các bản ghi đang hiển thị.
- Kiểm tra khi không có kết quả lọc thì `検索結果をエクスポート` bị disable.

8.8. UI tieng Nhat
- Kiểm tra tất cả button hiển thị tiếng Nhật: `ダウンロードテンプレート`, `インポート`, `エクスポート`, `検索`, `新規作成`, `編集`, `削除`, `確認`, `キャンセル`.
- Kiểm tra thông báo success/failure bằng tiếng Nhật.
- Kiểm tra empty state và error state tiếng Nhật.
- Kiểm tra dialog import và export có tiêu đề/mô tả tiếng Nhật.

## 9. Huong Dan Prompt Cho Tung Phan

Danh sach prompt cu the de su dung cho AI hoac nguoi phat trien non-tech:

- Prompt 1: "Phan tich `masterdata.md` va tao danh sach tinh nang can lam theo block: tab danh sach, search, create/edit/delete, import template, import preview va validate, export CSV/Excel. Goi ro tung collection va rule validation rieng."
- Prompt 2: "Hien thi ke hoach UI/UX chi tiet cho man hinh Master Data voi 5 tab va tat ca label thong bao bang tieng Nhat."
- Prompt 3: "Viet logic validate/norm field cho tung collection: CusCodeList, ItemCodeList, UnitPriceList, PIC.WH.CodeList, UnitCodeList."
- Prompt 4: "Thiet ke chuc nang Download Template CSV/Excel cho tung collection, voi header va mo ta field bang tieng Nhat."
- Prompt 5: "Thiet ke import preview CSV/Excel voi row-level validation va thong bao loi."
- Prompt 6: "Thiet ke export CSV/Excel voi option Export all va Export filtered results."
- Prompt 7: "Tao danh sach test case hoan chinh cho Master Data: load, search, CRUD, import, export, validation va UI tieng Nhat."

Noi dung tren da phan tich va tong hop `masterdata.md` thanh cac buoc va block cu the. Khong tao file moi va khong xoa file nao. Vui long kiem tra `Docs/masterdata.md` de xem thong tin da duoc bo sung.