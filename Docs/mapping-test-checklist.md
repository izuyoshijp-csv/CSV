# Mapping Test Checklist

Checklist này dùng để kiểm tra riêng phần 2 `設定` / `マッピング一覧`.

- [ ] Sidebar có đúng 3 mục: `マスタデータ`, `設定`, `CSV作成`.
- [ ] `マスタデータ` vẫn mở đúng màn hình Master Data đã có.
- [ ] `設定` mở màn hình có tab `マッピング一覧`.
- [ ] `CSV作成` chỉ là placeholder, chưa có import/export.
- [ ] Tạo mới Mapping hợp lệ và lưu được.
- [ ] Không lưu khi thiếu `マッピング名`.
- [ ] Không lưu khi thiếu `明細開始行`.
- [ ] Không lưu khi `明細開始行` không phải số nguyên dương.
- [ ] Không lưu khi thiếu `有効行判定列`.
- [ ] Không lưu khi `有効行判定列` sai định dạng cột Excel.
- [ ] Thêm, sửa, xóa, sao chép dòng rule được.
- [ ] `注文ファイルから取得` hiển thị đủ `固定セル`, `明細列`, `注文ファイル計算`.
- [ ] `固定値` hiển thị field nhập giá trị cố định.
- [ ] `マスタデータ参照` hiển thị field VLOOKUP.
- [ ] `計算式` hiển thị field công thức kiểu Excel.
- [ ] Format có đủ `元の形式を保持`, `Number 00,000.00`, `Number 整数（小数切り捨て）`, `Date yyyymmdd`.
- [ ] Format `Number 整数（小数切り捨て）` có mô tả rõ là xóa phần thập phân, không làm tròn, ví dụ `123.67` thành `123`.
- [ ] Một source có thể nhập nhiều CSV target columns, ví dụ `E, I, J`.
- [ ] Nút `CSV列順` sắp xếp entries theo thứ tự cột CSV.
- [ ] `プレビュー` chỉ hiển thị cấu hình mock, không upload file thật.
- [ ] `変更履歴` hiển thị lịch sử tạo/sửa/xóa nếu đã có thao tác.
- [ ] Admin và Operator thấy cùng các thao tác trong Mapping.
- [ ] Toàn bộ text UI phần Mapping hiển thị bằng tiếng Nhật.
- [ ] Trong `設定` không có tab `インポート`, `バッチ処理`, `固定値設定`, `マスタデータ`, `照明`, `エクスポート履歴`.
