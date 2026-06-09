# CSV作成 Test Checklist

Checklist này dùng để kiểm tra phần 3 `CSV作成` sau khi triển khai.

## Import Theo Mapping

- [ ] Mở được màn hình `CSV作成`.
- [ ] Chọn được Mapping hợp lệ.
- [ ] Mapping thiếu `明細開始行` hoặc `有効行判定列` bị chặn import.
- [ ] Upload được file `.xlsx`.
- [ ] File `.xls` / `.xlsm` được chấp nhận nếu trình đọc hỗ trợ.
- [ ] Sheet ẩn bị bỏ qua nếu file có sheet ẩn.
- [ ] Dữ liệu chi tiết bắt đầu đúng từ `明細開始行`.
- [ ] Dòng hợp lệ được xác định bằng `有効行判定列`.

## Thứ Tự Xử Lý

- [ ] Hệ thống lấy dữ liệu trực tiếp từ Excel trước.
- [ ] Fixed value/manual input/empty được điền sau dữ liệu Excel.
- [ ] Master Data lookup chạy sau khi dữ liệu Excel đã có trong bảng tạm.
- [ ] Công thức chạy sau lookup Master Data.
- [ ] Format chạy cuối cùng.

## Format

- [ ] `Number 00,000.00` hiển thị số với 2 chữ số thập phân.
- [ ] `Number 整数（小数切り捨て）` đổi `123.67` thành `123`.
- [ ] `Number 整数（小数切り捨て）` không làm tròn `123.67` thành `124`.
- [ ] `Date yyyymmdd` xuất đúng `yyyymmdd`.
- [ ] `左から32文字（空白を含む）` cắt đúng 32 ký tự.
- [ ] `左から25文字（空白を含む）` cắt đúng 25 ký tự.
- [ ] `英数字のみ` chỉ giữ A-Z, a-z, 0-9.
- [ ] Dữ liệu có xuống dòng được thay bằng khoảng trắng.

## Bảng Và Preview

- [ ] Import xong hiển thị ngay bảng CSV.
- [ ] Cột hiển thị đúng thứ tự Mapping.
- [ ] Header cột sticky/fixed khi cuộn dọc.
- [ ] Bảng có scroll ngang và scroll dọc.
- [ ] `簡易表示` ẩn cột có `hideInCompactView=true`.
- [ ] `全項目表示` hiển thị lại toàn bộ cột.
- [ ] Chế độ đang chọn áp dụng cho bảng chính và chế độ xem lớn.
- [ ] Chế độ xem lớn gần full màn hình mở/đóng được.
- [ ] Trong chế độ xem lớn, header cột vẫn sticky khi cuộn dọc.

## Sửa Dữ Liệu

- [ ] Click vào bất kỳ cell nào để sửa được.
- [ ] Cell đã sửa được đánh dấu.
- [ ] `保存` lưu thay đổi vào dữ liệu export.
- [ ] `変更を破棄` bỏ thay đổi.
- [ ] Export khi còn sửa đổi chưa lưu có cảnh báo.
- [ ] Đóng chế độ xem lớn không làm mất dữ liệu đang sửa.

## Validation Và Master Data

- [ ] Ô thiếu dữ liệu được highlight.
- [ ] Lỗi format được highlight.
- [ ] Lỗi lookup Master Data hiển thị rõ dòng/cột/source value.
- [ ] Cảnh báo gợi ý cần bổ sung Master Data, sửa Mapping, sửa file nguồn hoặc sửa trực tiếp.
- [ ] Từ lỗi Master Data có thể bấm thêm nhanh master data.
- [ ] Sau khi thêm Master Data, chạy lại xử lý và cảnh báo giảm nếu dữ liệu đã đủ.

## Export CSV

- [ ] Export đủ tất cả cột theo Mapping.
- [ ] Export vẫn đủ cột khi đang xem `簡易表示`.
- [ ] Export đúng thứ tự cột.
- [ ] Export áp dụng đúng format.
- [ ] Export thay xuống dòng bằng khoảng trắng.
- [ ] Dấu phẩy, chấm phẩy, dấu nháy kép không làm nhảy cột/nhảy dòng.
- [ ] CSV có BOM để mở bằng Excel không lỗi tiếng Nhật.
- [ ] Export khi còn cảnh báo có confirm trước.
- [ ] Không tạo Import Batch.
- [ ] Không lưu lịch sử export.
