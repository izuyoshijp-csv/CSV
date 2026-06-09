# PromtImMaster

File này chứa prompt thực thi để AI/Codex làm trực tiếp chức năng Master Data trên webapp, theo yêu cầu chi tiết trong `Docs/masterdata.md`.

## Mục tiêu

- Triển khai trực tiếp tính năng Master Data vào dự án.
- Thực hiện các chức năng: 5 tab, search, CRUD, download template CSV/Excel, import preview/validate, export all/filtered, UI tiếng Nhật.
- Dành cho người non-tech khi yêu cầu AI/Codex thực hiện ngay.

## Tài liệu cần đọc trước khi bắt đầu

1. `Docs/masterdata.md` — yêu cầu chi tiết.
2. `CLAUDE.md` — cấu trúc dự án, convention, module pattern, Firebase/Next.js.
3. Mở các feature mẫu để tham khảo pattern hiện có:
   - `src/modules/tasks`
   - `src/modules/users`
   - `src/app/(private)/tasks`
   - `src/app/(private)/users`

---

## Prompt thực thi 1: Khởi tạo màn hình Master Data

"Đọc `Docs/masterdata.md` và `CLAUDE.md`. Tạo màn hình Master Data mới trong app với 5 tab: `CusCodeList`, `ItemCodeList`, `UnitPriceList`, `PIC.WH.CodeList`, `UnitCodeList`. Mỗi tab phải có label tiếng Nhật tương ứng và load dữ liệu từ Firestore. Sử dụng cấu trúc module hiện có, tạo route hoặc page trong `src/app/(private)/masterdata` và/hoặc module `src/modules/masterdata`."

### Hướng dẫn cho Codex
- Tạo page server/client cần thiết.
- Dùng các component/tables tương tự `src/modules/tasks` và `src/modules/users`.
- Mỗi tab tải dữ liệu từ Firestore sử dụng service helper existing nếu có.

---

## Prompt thực thi 2: Thêm chức năng search và danh sách

"Trong màn hình Master Data, thêm search bar cho mỗi tab. Search phải lọc dữ liệu dựa trên các field hiển thị, trim khoảng trắng và không phân biệt hoa/thường. Hiển thị empty state bằng tiếng Nhật khi không có kết quả."

### Hướng dẫn cho Codex
- Search phải hoạt động client-side trong mỗi tab.
- Nếu không tìm thấy, hiển thị `検索条件に一致するデータが見つかりません。`.
- Giữ layout bảng đẹp, có thanh cuộn nếu cần.

---

## Prompt thực thi 3: Thêm CRUD cho từng collection

"Implement CRUD cho từng collection: `CusCodeList`, `ItemCodeList`, `UnitPriceList`, `PIC.WH.CodeList`, `UnitCodeList`. Tạo form create/edit, validate theo rule trong `Docs/masterdata.md`, và xóa record với xác nhận."

### Hướng dẫn cho Codex
- Use zod + react-hook-form nếu dự án có sẵn pattern.
- Validation:
  - `CusCodeList`: `CusCode` bắt buộc, unique.
  - `UnitPriceList`: `IzuyoshiJPCode` bắt buộc, unique.
  - `PIC.WH.CodeList`: `PICCode` bắt buộc, unique.
  - `UnitCodeList`: `OrderUnit` bắt buộc, unique.
  - `ItemCodeList`: `IzuyoshiJPCode` bắt buộc; `MAVCode` hoặc `MHBCode` phải có; duplicate rule riêng như tài liệu.
- Update/delete operations phải refresh dữ liệu.
- Thông báo lỗi/confirm bằng tiếng Nhật.

---

## Prompt thực thi 4: Thêm Download Template CSV/Excel

"Implement tính năng `Download Template` cho mỗi tab. Template phải là file CSV/Excel chứa header đúng schema của collection và mô tả field bằng tiếng Nhật (`必須`, `重複不可`, `例:`)."

### Hướng dẫn cho Codex
- Tạo nút `テンプレートダウンロード` trong mỗi tab.
- Export mẫu file có header và dòng chú thích.
- Header và mô tả cụ thể theo từng collection trong `Docs/masterdata.md`.

---

## Prompt thực thi 5: Thêm import preview CSV/Excel và validation

"Implement tính năng Import CSV/Excel với preview. Khi upload file, đọc sheet đầu tiên nếu Excel, normalize dữ liệu, kiểm tra row-level validation và hiển thị kết quả trong preview table. Không cho phép Confirm nếu còn lỗi."

### Hướng dẫn cho Codex
- Tạo modal `インポートプレビュー` để hiển thị preview.
- Thực hiện validation:
  - `CusCodeList`, `UnitPriceList`, `PIC.WH.CodeList`, `UnitCodeList`: key field bắt buộc, duplicate Firestore, duplicate file.
  - `ItemCodeList`: `IzuyoshiJPCode` bắt buộc, `MAVCode` hoặc `MHBCode` phải có, duplicate MAV/MHB rules.
- Hiển thị thông báo lỗi tiếng Nhật như tài liệu.
- If file header wrong, show `ファイルの形式が正しくありません。ヘッダーを確認してください。`.
- If file empty, show `インポートするデータがありません。`.
- Only allow confirm import when all rows valid.

---

## Prompt thực thi 6: Thêm export all và export filtered results

"Implement tính năng Export CSV/Excel cho mỗi tab với 2 tùy chọn: `すべてエクスポート` và `検索結果をエクスポート`. `検索結果をエクスポート` phải disabled nếu không có kết quả filter."

### Hướng dẫn cho Codex
- Tạo dropdown hoặc modal export.
- Cho phép chọn CSV hoặc Excel.
- File name nên theo định dạng `<CollectionName>_<YYYYMMDD>_<all|filtered>.csv` hoặc `.xlsx`.
- Hiển thị toast success/lỗi bằng tiếng Nhật.
- Ensure exported data uses current filtered rows for filtered export.

---

## Prompt thực thi 7: Đảm bảo UI tiếng Nhật hoàn chỉnh

"Kiểm tra và sửa toàn bộ UI cho màn hình Master Data để hiển thị tiếng Nhật: button, label, tooltip, empty state, lỗi, dialog, confirm, thông báo toast."

### Hướng dẫn cho Codex
- Buttons: `ダウンロードテンプレート`, `インポート`, `エクスポート`, `検索`, `新規作成`, `編集`, `削除`, `確認`, `キャンセル`.
- Empty state: `データがありません。`, `検索条件に一致するデータが見つかりません。`.
- Error state: `読み込み中にエラーが発生しました。`, `必須項目が不足しています。`, `重複するデータが存在します。`, `ファイルの形式が正しくありません。`.

---

## Prompt thực thi 8: Kiểm thử và xác nhận

"Sau khi hoàn thành, viết danh sách kiểm thử cho Master Data. Thực hiện kiểm tra load data, search, CRUD, download template, import preview, export, validation, và UI tiếng Nhật. Nếu có lỗi, sửa lại ngay."

### Hướng dẫn cho Codex
- Test với từng collection.
- Test import file hợp lệ và sai.
- Test export all và filtered.
- Test UI tiếng Nhật.

---

## Lưu ý khi thực hiện

- Trước khi chỉnh code, hãy mở `Docs/masterdata.md` và `CLAUDE.md`.
- Áp dụng pattern từ `src/modules/tasks`, `src/modules/users`, `src/app/(private)/tasks`, `src/app/(private)/users`.
- Chỉ sửa hoặc thêm file trong các thư mục `src/app/(private)/...`, `src/modules/...`, `src/components/...`, `src/lib/...`.
- Nếu cần đọc thêm, sử dụng `Docs/masterdata.md` và `CLAUDE.md` làm nguồn chính.

---

## Kết luận

File này giờ là hướng dẫn prompt để yêu cầu AI/Codex làm trực tiếp tính năng Master Data trên webapp, không chỉ lập kế hoạch.

## Yêu cầu bổ sung & Ghi chú triển khai (2026-06-02)

Yêu cầu UI/UX mới cần thêm vào prompt hoặc ghi chú triển khai:

- Di chuyển các button `編集` / `削除` lên cột đầu tiên của bảng (action-first column).
- Cố định header của bảng (sticky header) để tiêu đề luôn hiển thị khi cuộn dữ liệu dài.
- Thêm nút sắp xếp ở đầu mỗi tiêu đề cột (per-column sort) với trạng thái `asc/desc`.
- Cho phép ẩn/hiện cột (column visibility) bằng checklist trong toolbar.
- Thêm phân trang với lựa chọn page-size: `10,20,30,40,50,All` và hiển thị tổng trang/tổng dòng.
- Export (CSV/XLSX) cần tuân theo filter và column visibility; disable export filtered khi không có kết quả.

Tóm tắt cách tôi đã triển khai ban đầu trong codebase:

- Thay `renderTable(...)` thành component `RenderTable` trong [src/app/(private)/masterdata/page.tsx](src/app/(private)/masterdata/page.tsx#L1): action-first column, sticky header, client-side sort, column visibility toggles, và pagination.
- Các cuộc gọi cũ `renderTable(...)` đã được thay bằng JSX `<RenderTable ... />` cho tất cả 5 tab.
- Việc export/filtering hiện cần bổ sung để tôn trọng `visibleColumns` và `current filtered rows` — có thể mở rộng hàm export hiện tại.

Hướng dẫn cho prompt tiếp theo (nếu bạn muốn AI tự động hoàn thiện):

1. Cập nhật prompt để yêu cầu "Export chỉ các cột đang hiển thị" kèm theo danh sách `visibleColumns` được truyền vào hàm export.
2. Nếu cần performance cho dataset lớn, yêu cầu refactor sang TanStack Table và áp dụng server-side paging/sorting.
3. Thêm test cases: kiểm tra action-first column, sticky header, sort toggle, column visibility lưu trạng thái, pagination edge-cases, và export-respect-visibility.

Bạn muốn tôi tiếp tục và tự động nối export để tôn trọng `visibleColumns` và `filtered rows` không? Nếu có, tôi sẽ áp dụng thay đổi trong `src/app/(private)/masterdata/page.tsx` và trong hàm export hiện tại.
