# Hướng Dẫn Sử Dụng — 受注CSV / 設定管理

> Hệ thống quản lý đơn hàng B2B xuất khẩu sang Nhật Bản: tạo file CSV từ Excel đơn hàng, quản lý dữ liệu tham chiếu, và cấu hình ánh xạ.

---

## Mục lục

1. [Tổng quan luồng công việc](#1-tổng-quan-luồng-công-việc)
2. [Quản lý Master Data](#2-quản-lý-master-data)
3. [Cấu hình Mapping (Settings)](#3-cấu-hình-mapping-settings)
4. [Tạo CSV từ Excel](#4-tạo-csv-từ-excel)
5. [Câu hỏi thường gặp](#5-câu-hỏi-thường-gặp)

---

## 1. Tổng quan luồng công việc

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Master Data    │ ──▶ │  Settings       │ ──▶ │  CSV Create     │
│  (Dữ liệu gốc)  │     │  (Cấu hình ánh xạ) │     │  (Tạo CSV)      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
     Lưu trữ              Khai báo cách            Xử lý Excel
     danh sách            đọc file Excel           → CSV đầu ra
     tham chiếu           và tra cứu
```

**Luồng 3 bước:**

1. **Master Data** → Thêm danh sách mã khách hàng, mã sản phẩm, đơn giá (làm "bảng tra" cho hệ thống)
2. **Settings** → Khai báo cấu trúc file Excel và cách ánh xạ sang CSV
3. **CSV Create** → Upload file Excel, hệ thống tự động xử lý theo config → tải CSV về

---

## 2. Quản lý Master Data

Truy cập: `/masterdata`

Master Data là "bảng tra" — nơi lưu các danh sách tham chiếu dùng chung cho toàn hệ thống. Khi tạo CSV, hệ thống sẽ tự động tra cứu các mã từ đây.

### 2.1 Các danh sách có sẵn

| Tên | Dùng để |
|---|---|
| **CusCodeList** | Tra tên, địa chỉ khách hàng theo mã |
| **ItemCodeListMAV** | Tra mã sản phẩm MAV |
| **ItemCodeListMHB** | Tra mã sản phẩm MHB |
| **UnitPriceList** | Tra đơn giá theo mã sản phẩm |
| **PIC.WH.CodeList** | Tra mã PIC/Warehouse |
| **UnitCodeList** | Tra mã đơn vị tính |

### 2.2 Thêm bản ghi

1. Chọn danh sách từ menu dropdown (VD: **CusCodeList**)
2. Nhấn **Add**
3. Điền thông tin → **Save**

### 2.3 Import nhiều bản ghi cùng lúc

1. Chọn danh sách cần nhập
2. Nhấn **Import**
3. Upload file `.csv` hoặc `.xlsx` — hệ thống import theo đúng cấu trúc cột của danh sách đang chọn
4. Thanh tiến trình hiển thị trong quá trình import

### 2.4 Export dữ liệu

- **Export CSV** — tải toàn bộ dưới dạng CSV
- **Export Excel** — tải dưới dạng Excel
- Sau khi tìm kiếm/lọc, chỉ các dòng đang hiển thị mới được export

### 2.5 Tìm kiếm

Ô tìm kiếm trên bảng lọc theo thời gian thực qua tất cả các cột.

### 2.6 Sửa / Xóa

- Biểu tượng **Edit** (bút) trên dòng → chỉnh sửa → Save
- Biểu tượng **Delete** (thùng rác) trên dòng → xác nhận xóa

---

## 3. Cấu hình Mapping (Settings)

Truy cập: `/settings`

### 3.1 Mapping Config là gì?

Khi nhận file Excel đơn hàng từ đối tác, mỗi công ty có **cấu trúc file khác nhau**:
- Dòng nào bắt đầu có dữ liệu đơn hàng?
- Cột nào chứa mã sản phẩm?
- Mã khách hàng nằm ở ô nào trong header?

**Mapping Config** là bộ quy tắc khai báo cách hệ thống trả lời các câu hỏi trên — và cách ghép các giá trị đó thành file CSV đầu ra.

### 3.2 Tạo Mapping Config mới

1. Tại `/settings`, nhấn **New Mapping**
2. Điền thông tin cơ bản:
   - **Name** — Tên config (VD: "Đơn công ty Yamato")
   - **Description** — Mô tả ngắn
   - **Start Detail Row** — Dòng bắt đầu đọc dữ liệu chi tiết (mặc định: 17)
   - **Valid Row Column** — Cột dùng xác nhận dòng hợp lệ (mặc định: "R")
3. Nhấn **Create** → sang bước tiếp theo: thêm các **Entry**

### 3.3 Thêm Entry (Quy tắc cho từng cột CSV)

Mỗi Entry = một cột trong file CSV đầu ra.

**Trường cơ bản:**

| Trường | Ý nghĩa |
|---|---|
| **CSV Column** | Tên cột đích trong CSV (VD: "E, I, J") |
| **Item Name** | Tên mô tả (VD: "Mã sản phẩm", "Số lượng") |

**Data Source — Nguồn dữ liệu (quan trọng):**

| Loại | Khi nào dùng | Ví dụ |
|---|---|---|
| `fixedCell` | Đọc một ô cố định trong header Excel | Ô `K4` = mã công ty |
| `detailColumn` | Đọc cả một cột từ dòng dữ liệu | Cột `A` từ dòng 17 → mã sản phẩm |
| `sourceFormula` | Tính toán từ công thức Excel có sẵn | `Q7 - 1` |
| `fixedValue` | Giá trị cố định, luôn như nhau | Luôn điền "VN" |
| `masterLookup` | Tra từ Master Data | Mã trong Excel → mã hệ thống MHB |
| `formula` | Tính toán từ các cột đã đọc | `=A*C` (số lượng × đơn giá) |
| `blank` | Để trống cột này | — |
| `manualInput` | Để trống, nhập tay khi tạo CSV | Ghi chú đặc biệt |

**Format Condition — Định dạng đầu ra:**

| Loại | Ý nghĩa |
|---|---|
| `original` | Giữ nguyên giá trị |
| `number` | Định dạng số |
| `numberIntegerTruncate` | Số nguyên, cắt phần thập phân |
| `date` | Định dạng `yyyymmdd` |
| `left32` / `left25` | Cắt tối đa 32 / 25 ký tự bên trái |
| `alphanumericOnly` | Chỉ giữ chữ cái và số |

### 3.4 Cách chọn Data Source phù hợp

```
File Excel có sẵn dữ liệu cần lấy?
        │
        ├── Có, 1 ô cố định  ───────────► fixedCell
        ├── Có, nhiều dòng cùng cột ───► detailColumn
        ├── Có, cần tính toán thêm ────► sourceFormula
        └── Không, cần tra bảng ───────► masterLookup
                │
                └── Cần chuẩn hóa mã? ──► Thêm vào Master Data trước
```

### 3.5 Mẹo thiết lập

1. **Xem file Excel mẫu trước** — mở file đơn hàng thực tế, xác định dòng bắt đầu và các cột quan trọng
2. **Dùng Preview** sau mỗi thay đổi để xác nhận kết quả trước khi dùng thực tế
3. **Dùng masterLookup** cho các mã cần chuẩn hóa từ nhiều nguồn
4. **Dùng manualInput** cho trường cần xác nhận thủ công

### 3.6 Quản lý Config

- **Copy** — Nhân bản config hiện có để tạo biến thể (VD: copy từ công ty A → tạo cho công ty B)
- **History** — Xem ai sửa, lúc nào, thay đổi gì
- **Delete** — Xóa config không còn dùng

---

## 4. Tạo CSV từ Excel

Truy cập: `/csv-create`

### 4.1 Luồng 6 bước

```
New Session
     ↓
Upload Excel (file .xls / .xlsx / .xlsm)
     ↓
Chọn Mapping Config phù hợp
     ↓
Hệ thống tự động đọc & xử lý
     ↓
Kiểm tra & chỉnh sửa trên bảng tính
     ↓
Export CSV
```

### 4.2 Bước 1 — New Session

Nhấn **New Session** để bắt đầu phiên làm việc mới.

### 4.3 Bước 2 — Upload Excel

Nhấn **Upload Excel**, chọn một hoặc nhiều file đơn hàng. Hệ thống chấp nhận `.xls`, `.xlsx`, `.xlsm`.

### 4.4 Bước 3 — Chọn Mapping Config

Chọn config đã tạo tại `/settings`. Mỗi config tương ứng với một cấu trúc file Excel cụ thể.

> **Chưa có config?** Xem phần [3. Cấu hình Mapping](#3-cấu-hình-mapping-settings) trước.

### 4.5 Bước 4 — Xem & Chỉnh sửa

Dữ liệu hiển thị trên giao diện bảng tính với các thao tác:

| Thao tác | Cách thực hiện |
|---|---|
| Sửa ô | Click trực tiếp vào ô |
| Chọn nhiều ô | Kéo chuột, copy/paste |
| Sắp xếp cột | Nhấn tiêu đề cột |
| Ẩn cột | Tùy chọn ẩn/hiện cột |
| Thêm dòng | Click chuột phải → Insert |
| Xóa dòng | Click chuột phải → Delete |
| Chế độ Compact | Thu gọn bảng |
| Toàn màn hình | Mở rộng bảng tính |

### 4.6 Bước 5 — Kiểm tra Validation

Panel **Issues** hiển thị các cảnh báo:
- Dữ liệu không tìm thấy trong Master Data
- Lỗi định dạng cột
- Trường bắt buộc bị trống

Chỉnh sửa trực tiếp trên bảng để khắc phục, hoặc quay lại `/masterdata` để bổ sung dữ liệu.

### 4.7 Bước 6 — Export CSV

Nhấn **Export CSV** — file tải về với BOM để đảm bảo Excel hiển thị tiếng Nhật/Unicode đúng.

---

## 5. Câu hỏi thường gặp

**Q1: File Excel của mỗi công ty có cấu trúc khác nhau, phải làm sao?**
A: Tạo **Mapping Config riêng** cho từng cấu trúc tại `/settings`. Khi tạo CSV, chọn đúng config tương ứng với file đang xử lý.

**Q2: Mã sản phẩm trong file Excel khác với mã hệ thống?**
A: Thêm bảng tương ứng vào **Master Data** (`/masterdata`), sau đó dùng Data Source `masterLookup` trong Mapping Entry — hệ thống sẽ tự động tra và chuyển đổi.

**Q3: Có thể nhập nhiều khách hàng cùng lúc không?**
A: Có. Tại `/masterdata`, chọn **CusCodeList** → nhấn **Import** → upload file CSV/Excel.

**Q4: Dữ liệu có bị mất khi tắt trình duyệt không?**
A: Dữ liệu chỉ được lưu tạm trong phiên làm việc hiện tại. Tắt trình duyệt = mất dữ liệu đang xử lý. Nếu chỉ làm mới trang, dữ liệu vẫn giữ nguyên (tối đa 2.5MB).

**Q5: Cột nào đánh dấu dòng hợp lệ trong Excel?**
A: Cấu hình `Valid Row Column` trong Mapping Config — thường là cột **"R"**. Dòng nào có giá trị ở cột này sẽ được coi là dòng dữ liệu hợp lệ.

**Q6: Tôi cần xuất CSV chỉ với một số cột nhất định?**
A: Dùng chức năng **Ẩn cột** trên bảng tính tại `/csv-create`. Khi nhấn Export, chỉ các cột hiển thị mới được xuất.

**Q7: Config mapping có thể chia sẻ cho người khác không?**
A: Dùng **Copy** tại `/settings` để nhân bản config. Hiện tại mỗi người quản lý config riêng trong Firestore.

---

*Phiên bản: 1.0 — 2026-06-09*
