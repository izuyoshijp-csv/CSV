# Danh sách kiểm thử Master Data

Ngôn ngữ: Tiếng Việt

Mục tiêu: Kiểm thử toàn diện tính năng Master Data theo yêu cầu: load data, search, CRUD, download template, import preview (row-level validation), export (all & filtered), disable filtered export khi không có kết quả, và kiểm tra UI tiếng Nhật.

Chuẩn bị môi trường:
- Cài dependencies: `npm install` (nếu cần)
- Chạy TypeScript check: `npx tsc --noEmit`
- Khởi chạy dev server: `npm run dev`
- File tham khảo: [Docs/masterdata.md](Docs/masterdata.md), [CLAUDE.md](CLAUDE.md), component chính: [src/app/(private)/masterdata/page.tsx](src/app/(private)/masterdata/page.tsx)

Các collection cần test:
- `CusCodeList` (得意先・納入先リスト)
- `ItemCodeList` (資材コード照合表)
- `UnitPriceList` (単価リスト)
- `PIC.WH.CodeList` (担当者・倉庫コードリスト)
- `UnitCodeList` (単位リスト)

Checklist kiểm thử (dành cho mỗi collection):

1) Kiểm tra load data
- Mở màn hình Master Data và chọn từng tab.
- Xác nhận dữ liệu từ Firestore hiển thị.
- Nếu collection rỗng, hiển thị trạng thái empty (tiếng Nhật).
- Nếu lỗi load, hiển thị thông báo lỗi.

2) Kiểm tra search
- Gõ từ khoá có trong field hiển thị, kết quả lọc phải hiển thị.
- Search không phân biệt hoa/thường.
- Search trim khoảng trắng đầu/cuối.
- Khi không có kết quả, hiển thị thông báo tiếng Nhật tương ứng.

3) Kiểm tra CRUD (Create / Edit / Delete)
- Create:
  - Mở dialog "新規作成".
  - Nhập các field hợp lệ theo rule ở `Docs/masterdata.md`.
  - Kiểm tra validation bắt buộc (ví dụ `CusCode`, `IzuyoshiJPCode`, `PICCode`, `OrderUnit`).
  - Kiểm tra lỗi duplicate (không tạo nếu đã tồn tại).
  - Sau lưu, bản ghi mới phải hiện trong danh sách.
- Edit:
  - Mở dialog sửa, thay đổi field (không đổi key thành trùng), lưu.
  - Kiểm tra duplicate logic bỏ qua bản ghi đang sửa.
  - Sau lưu, list cập nhật.
- Delete:
  - Thử xóa một bản ghi; xác nhận dialog xác nhận (tiếng Nhật) và thao tác xóa thành công.

4) Kiểm tra Download template
- Bấm "テンプレートダウンロード" cho từng tab.
- Mở file CSV tải về, xác nhận header đúng theo `templateDefinitions` (ví dụ `CusCode, CusNameEng, ...`).
- Hints (dòng 2) phải tồn tại và dễ hiểu.

5) Kiểm tra Import preview và validation hàng (row-level)
- Chuẩn bị 3 file test cho mỗi collection:
  - `valid.xlsx/csv`: một vài dòng hợp lệ.
  - `invalid-missing-required.xlsx/csv`: có dòng thiếu field bắt buộc.
  - `invalid-duplicate.xlsx/csv`: có duplicate trong file và/hoặc duplicate với Firestore.
- Trong dialog import (テンプレートインポート):
  - Chọn file, kiểm tra hiển thị `ファイル名`.
  - Nếu parse lỗi, hiển thị lỗi (tiếng Nhật).
  - Nếu parse thành công, hiển thị preview: mỗi dòng có trạng thái 有効/無効 và danh sách lỗi của dòng.
  - Xác nhận số lỗi ở badge (ví dụ "2 件のエラーが検出されました。").
  - Không cho phép import khi có dòng invalid; nếu toàn bộ dòng valid thì cho phép bấm "確認してインポート".
- Các rule row-level tham khảo `Docs/masterdata.md`:
  - `CusCode` required và duplicate checks.
  - `ItemCodeList` phải có `IzuyoshiJPCode` và (`MAVCode` hoặc `MHBCode`).
  - `UnitPriceList` `IzuyoshiJPCode` required; `UnitPrice` parseable nếu là số.
  - `PIC.WH.CodeList` `PICCode` required.
  - `UnitCodeList` `OrderUnit` required.
- Test confirm import: sau import, xác nhận bản ghi được thêm vào Firestore (hoặc mock fallback).

6) Kiểm tra Export (CSV + Excel)
- Xuất toàn bộ: chọn `すべてエクスポート` (Export all).
  - Kiểm tra file xuất chứa tất cả bản ghi hiện có trong collection.
  - Tên file phải bao gồm `template.fileName` hoặc tab name và ngày giờ.
- Xuất kết quả tìm kiếm: chọn `検索結果をエクスポート` (Export filtered).
  - Khi đã lọc, file xuất chỉ chứa các bản ghi lọc.
  - Nếu không có kết quả lọc, nút `検索結果をエクスポート` phải disabled.
- Đảm bảo cả CSV và XLSX đều hoạt động (mở được bằng Excel).

7) Kiểm tra validation logic và normalize
- Tạo các bản ghi thử có khoảng trắng dư, chữ hoa/thường khác nhau; kiểm tra normalize (trim) khi validate.
- Với `UnitPrice`, thử nhập định dạng `1,234.56` vs `1234,56` và kiểm tra parsing (ghi chú: ứng dụng hiện chấp nhận text nhưng nên parse số nếu có).

8) Kiểm tra giao diện tiếng Nhật
- Tất cả button (例: `テンプレートダウンロード`, `インポート`, `すべてエクスポート`, `検索結果をエクスポート`, `新規作成`, `保存`, `削除`, `キャンセル`) hiển thị bằng tiếng Nhật.
- Placeholder trong ô tìm kiếm là `検索...`.
- Dialog title, description, empty-state, toast messages bằng tiếng Nhật.
- Kiểm tra các nhãn cột bảng đã chuyển sang tiếng Nhật.

9) Kịch bản kiểm thử tự động/thuật toán (manual steps to automate later)
- Viết các unit/integration tests nhỏ để validate `validateImportRows` logic (đặt trong `src/modules/masterdata/services/*` hoặc test helper).
- Thực hiện test normalize và duplicate logic bằng unit tests.

10) Hướng dẫn sửa lỗi khi phát hiện
- Nếu phát hiện lỗi UI text hoặc validation, ưu tiên sửa trong `src/app/(private)/masterdata/page.tsx` hoặc `src/modules/masterdata/services/masterdata-services.ts`.
- Sau sửa, chạy `npx tsc --noEmit` và lặp lại kiểm thử thủ công.

Lệnh tham khảo để kiểm tra:

```bash
# Kiểm tra TypeScript
npx tsc --noEmit

# Chạy dev server
npm run dev
```

Ghi chép kết quả:
- Khi chạy kiểm thử, ghi lại file log ngắn gồm: collection, test-case, input-file (nếu có), kết quả (PASS/FAIL), ghi chú lỗi và file/line đã sửa.
- Lưu log vào `Docs/test-results/masterdata-YYYYMMDD.md`.

Kết luận: Thực hiện các bước trên cho từng tab/collection. Nếu cần tôi có thể: (1) tạo các file CSV/XLSX mẫu hợp lệ/không hợp lệ trong `scripts/test-files/`, (2) viết unit tests cho `validateImportRows` và (3) sửa lỗi phát hiện được. Hãy cho biết bạn muốn tôi tự động tạo file test mẫu và unit-test không (tôi có thể thực hiện tiếp).