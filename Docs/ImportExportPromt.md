# ImportExport Prompt - Phần 3 CSV作成

File này dùng để copy prompt cho Codex thực thi phần 3 theo đúng thứ tự.

Đối tượng đọc là người non-tech, nên mỗi prompt nói rõ mục tiêu, việc cần làm và kết quả cần kiểm tra.

Nguyên tắc chung của phần 3:

- Dùng Mapping đã tạo ở phần 2 làm trung tâm.
- Không hard-code cột CSV trong UI.
- Không tạo Import Batch.
- Không lưu lịch sử batch.
- Không lưu lịch sử export.
- Sau khi import Excel, hiển thị ngay bảng CSV thật trên màn hình.
- Bảng CSV phải xem được nhiều cột, có scroll ngang/dọc, có chế độ xem lớn gần full màn hình.
- Tất cả table xuất hiện trong quá trình làm việc, bao gồm bảng chính, preview và chế độ xem lớn, phải cố định hàng tiêu đề cột ở trên cùng khi cuộn dọc để người dùng luôn nhìn thấy tên cột.
- Cho phép sửa trực tiếp dữ liệu như Excel trước khi export.
- Export CSV luôn đủ tất cả cột theo Mapping, kể cả khi đang xem giản lược.
- Dữ liệu có xuống dòng phải thay bằng khoảng trắng trước khi hiển thị/export.
- Thứ tự xử lý bắt buộc: lấy dữ liệu từ Excel trước, sau đó lookup Master Data, sau đó mới tính công thức, cuối cùng mới format/export.

## Prompt 1 - Đọc Lại Tài Liệu Và Lập Plan Kỹ Thuật

```text
Hãy đọc kỹ các file Docs/ImportExport.md, Docs/Plan.md, Docs/schedule.md, Docs/maplingusecase.md, Docs/maplingImpromt.md và code hiện tại liên quan đến Mapping, Master Data, Firestore services, UI route CSV作成.

Mục tiêu là triển khai phần 3 CSV作成.

Trước khi sửa code, hãy tóm tắt ngắn:
1. Hiện repo đã có gì.
2. Còn thiếu gì để làm phần 3.
3. Các file/service/component dự kiến sẽ sửa hoặc tạo mới.
4. Thứ tự làm đề xuất.

Lưu ý:
- Không tạo Import Batch.
- Không lưu lịch sử batch/export.
- Mapping là trung tâm.
- UI text phải bằng tiếng Nhật.
```

## Prompt 2 - Tạo Type Và Data Model Cho CSV作成

```text
Hãy tạo hoặc bổ sung TypeScript types cho phần CSV作成.

Cần có tối thiểu:
- CsvWorkingSession hoặc kiểu tương đương để giữ dữ liệu xử lý hiện tại trên màn hình.
- CsvWorkingRow.
- CsvWorkingCell.
- CsvValidationIssue.
- CsvDisplayMode gồm compact/full.
- CsvManualInput nếu Mapping có dữ liệu nhập tay.
- Kết quả import gồm csvRows, validationIssues, sourceFileName, mappingId, mappingName, summary.

Không tạo type cho Import Batch hoặc export history.

Các type phải dùng lại ImportMappingConfig, ImportMappingEntry, CsvColumnLetter đã có nếu phù hợp.

Sau khi làm xong, chạy typecheck.
```

## Prompt 3 - Tạo Service Đọc Excel Theo Mapping

```text
Hãy tạo service đọc file Excel theo Mapping cho phần CSV作成.

Service nhận:
- file Excel .xls/.xlsx/.xlsm.
- Mapping đã chọn hoặc mappingId.
- danh sách Master Data cần thiết nếu service cần chuẩn bị lookup.

Service cần:
- Đọc workbook.
- Bỏ qua sheet ẩn nếu thư viện hỗ trợ.
- Đọc các sheet hiển thị.
- Lấy dòng chi tiết bắt đầu từ startDetailRow / 明細開始行 trong Mapping.
- Chỉ lấy dòng hợp lệ theo validRowColumn / 有効行判定列 trong Mapping.
- Trả về dữ liệu nguồn trung gian từ Excel, chưa lookup Master Data và chưa tính công thức.

Điều kiện lỗi:
- Nếu Mapping thiếu startDetailRow hoặc validRowColumn thì trả lỗi tiếng Nhật và không import.
- Nếu file không đọc được thì trả lỗi tiếng Nhật.

Không tạo Import Batch.
Không lưu database ở bước này.

Sau khi làm xong, chạy typecheck.
```

## Prompt 4 - Tạo Service Build CSV Theo Mapping

```text
Hãy tạo service buildCsvRowsFromMapping để tạo bảng CSV hiện tại từ dữ liệu Excel đã đọc và Mapping.

Thứ tự xử lý bắt buộc:
1. Điền trước tất cả cột lấy trực tiếp từ file Excel.
2. Điền fixed value, manual input hoặc empty theo Mapping.
3. Sau khi bảng tạm đã có dữ liệu Excel, mới lookup Master Data.
4. Sau khi lookup Master Data xong, mới tính công thức cộng/trừ/nhân/chia.
5. Cuối cùng mới áp dụng format dữ liệu.
6. Thay ký tự xuống dòng trong mọi cell bằng khoảng trắng.

Không được xử lý từng cột độc lập theo thứ tự hiển thị nếu cột đó phụ thuộc dữ liệu chưa có.

Service phải hỗ trợ các source type hiện có trong Mapping:
- lấy từ ô/cột Excel.
- fixed value.
- Master Data lookup.
- công thức.
- manual input nếu có.
- empty.

Service trả về:
- csvRows đúng thứ tự cột Mapping.
- validationIssues ban đầu.
- summary số dòng, số lỗi, số lỗi lookup, số lỗi format.

Sau khi làm xong, chạy typecheck.
```

## Prompt 5 - Áp Dụng Format Theo Mapping

```text
Hãy tạo hoặc bổ sung helper áp dụng format cho từng cell CSV theo Mapping.

Format cần hỗ trợ:
- 元の形式を保持.
- Number 00,000.00.
- Number 整数（小数切り捨て）: xóa phần thập phân, không làm tròn. Ví dụ 123.67 thành 123.
- Date yyyymmdd.
- 左から32文字（空白を含む）.
- 左から25文字（空白を含む）.
- 英数字のみ.
- Các format condition đã có trong Mapping.

Yêu cầu:
- Nếu format lỗi thì trả validation issue, không làm app crash.
- Không tự ý trim khoảng trắng nếu Mapping không yêu cầu.
- Dữ liệu xuống dòng phải được thay bằng khoảng trắng trước khi hiển thị/export.

Thêm test hoặc case kiểm tra cho:
- 123.67 -> 123 với Number 整数（小数切り捨て）.
- 123.67 không được thành 124.
- text có xuống dòng được thay bằng khoảng trắng.

Sau khi làm xong, chạy typecheck/test phù hợp.
```

## Prompt 6 - Tạo Validation Service Cho CSV Hiện Tại

```text
Hãy tạo validation service cho dữ liệu CSV hiện tại sau khi build theo Mapping hoặc sau khi người dùng sửa trực tiếp trên bảng.

Validation cần kiểm tra:
- Mapping thiếu thông tin bắt buộc.
- Cột bắt buộc theo Mapping bị trống nếu có cấu hình bắt buộc.
- Cột lấy từ Excel nhưng nguồn trống.
- Master Data lookup không tìm thấy.
- Công thức không tính được.
- Format không áp dụng được.
- Manual input thiếu hoặc không hợp lệ nếu Mapping yêu cầu.

Validation issue cần có:
- rowId.
- rowNumber.
- csvColumn.
- mappingEntryId nếu có.
- severity.
- message tiếng Nhật.
- issueType.
- missingMasterDataType nếu lỗi do Master Data.
- sourceValue.
- suggestedAction.

Validation không mặc định chặn export. Nếu còn lỗi, export vẫn có thể tiếp tục sau khi người dùng xác nhận.

Sau khi làm xong, chạy typecheck.
```

## Prompt 7 - Tạo Màn Hình Chọn Mapping Và Upload Excel

```text
Hãy triển khai màn hình CSV作成.

Màn hình cần:
- Hiển thị danh sách Mapping hợp lệ.
- Cho người dùng chọn một Mapping trước khi upload.
- Mapping lỗi hoặc thiếu startDetailRow/validRowColumn không được dùng để import.
- Upload được file Excel .xls/.xlsx/.xlsm.
- Sau khi upload, gọi service đọc Excel và build CSV theo Mapping.
- Hiển thị loading trong lúc xử lý.
- Hiển thị lỗi bằng tiếng Nhật nếu import thất bại.
- Không tạo Import Batch.
- Không lưu lịch sử batch.

Sau khi import thành công, màn hình phải hiển thị ngay bảng CSV.

Sau khi làm xong, chạy typecheck.
```

## Prompt 8 - Hiển Thị Bảng CSV Lớn Sau Import

```text
Hãy hiển thị bảng CSV ngay trên màn hình CSV作成 sau khi import thành công.

Bảng cần:
- Header theo Mapping.
- Thứ tự cột đúng như file CSV thật.
- Giá trị đã build và format theo Mapping.
- Scroll ngang và scroll dọc rõ ràng.
- Hàng tiêu đề cột phải sticky/fixed ở trên cùng khi người dùng cuộn dọc trong bảng.
- Khung bảng lớn để xem nhiều cột.
- Highlight ô thiếu dữ liệu hoặc lỗi format.
- Hiển thị tổng số dòng, số lỗi, số lỗi lookup, số lỗi format.
- Hiển thị Mapping đang dùng và tên file nguồn.

Không dùng card nhỏ làm preview. Preview/bảng chính phải đủ rộng để người dùng xem file nhiều cột.

Sau khi làm xong, chạy typecheck.
```

## Prompt 9 - Thêm Chế Độ Xem Giản Lược Và Xem Đầy Đủ

```text
Hãy thêm chế độ hiển thị cột CSV gồm:
- 簡易表示.
- 全項目表示.

Yêu cầu:
- Khi bấm 簡易表示, ẩn các cột có hideInCompactView=true hoặc đã tick 簡易表示で非表示 trong Mapping.
- Khi bấm 全項目表示, hiển thị tất cả cột CSV.
- Chế độ đã chọn phải áp dụng cho bảng chính, preview và chế độ xem lớn trong cùng phiên xử lý hiện tại.
- Export CSV vẫn phải xuất đầy đủ tất cả cột theo Mapping, kể cả cột đang bị ẩn ở 簡易表示.

Sau khi làm xong, chạy typecheck.
```

## Prompt 10 - Thêm Chế Độ Xem Bảng Lớn Gần Full Màn Hình

```text
Hãy thêm button mở bảng CSV ở chế độ lớn gần full màn hình.

Yêu cầu:
- Button tiếng Nhật, ví dụ 全画面表示 hoặc 大きく表示.
- Khi mở, bảng chiếm phần lớn màn hình để dễ xem nhiều cột.
- Vẫn nhìn được và dùng được toolbar/window chính.
- Có scroll ngang/dọc rõ ràng.
- Hàng tiêu đề cột vẫn phải sticky/fixed ở trên cùng khi cuộn dọc trong chế độ xem lớn.
- Có button đóng chế độ xem lớn.
- Khi đóng, không mất dữ liệu đang sửa.
- Chế độ xem lớn dùng cùng compact/full display mode với bảng chính.
- Các nút thao tác chính vẫn dùng được: lưu sửa đổi, bỏ sửa đổi, export nếu phù hợp.

Sau khi làm xong, chạy typecheck.
```

## Prompt 11 - Cho Sửa Trực Tiếp Trên Bảng Giống Excel

```text
Hãy thêm tính năng sửa trực tiếp bất kỳ ô nào trong bảng CSV.

Yêu cầu:
- Người dùng click vào cell để sửa.
- Giao diện sửa giống Excel nhất có thể trong phạm vi app hiện tại.
- Ô đã sửa cần được đánh dấu.
- Có button 保存 để lưu sửa đổi tạm thời vào dữ liệu sẽ export.
- Có button 変更を破棄 để bỏ sửa đổi và quay lại dữ liệu trước khi sửa.
- Nếu export khi còn sửa đổi chưa lưu, phải hiện cảnh báo tiếng Nhật.
- Sửa xong phải chạy lại validation cho dữ liệu hiện tại.
- Đóng chế độ xem lớn không làm mất dữ liệu đang sửa.

Sau khi làm xong, chạy typecheck.
```

## Prompt 12 - Hiển Thị Cảnh Báo Và Gợi Ý Bổ Sung Dữ Liệu

```text
Hãy tạo khu vực cảnh báo/validation trên màn hình CSV作成.

Cần hiển thị:
- Tổng số lỗi/cảnh báo.
- Lỗi theo dòng/cột.
- Lý do lỗi.
- Giá trị nguồn nếu có.
- Mapping entry liên quan nếu có.
- Gợi ý hành động: bổ sung Master Data, sửa file Excel nguồn, sửa Mapping, nhập thêm dữ liệu hoặc sửa trực tiếp trên bảng.

Nếu lỗi do Master Data:
- Cho biết thiếu ở master data nào.
- Cho biết source value nào đang không lookup được.
- Nếu có thể, hiển thị button thêm nhanh Master Data.

Validation không mặc định chặn export, nhưng phải cảnh báo rõ trước khi export.

Sau khi làm xong, chạy typecheck.
```

## Prompt 13 - Thêm Nút Bổ Sung Master Data Từ Cảnh Báo

```text
Hãy thêm tính năng bổ sung Master Data từ validation issue nếu issue có missingMasterDataType.

Yêu cầu:
- Từ dòng cảnh báo, người dùng bấm button thêm/bổ sung Master Data.
- Mở form hoặc dialog phù hợp với master data cần bổ sung.
- Tự điền sourceValue nếu có thể.
- Sau khi lưu Master Data, cho phép chạy lại xử lý theo Mapping và validation.
- Không tạo batch.
- Không lưu lịch sử export.
- UI message bằng tiếng Nhật.

Sau khi làm xong, chạy typecheck.
```

## Prompt 14 - Preview CSV Dạng Khung Lớn

```text
Hãy hoàn thiện preview CSV.

Yêu cầu:
- Preview chính là bảng CSV hiện tại.
- Preview mặc định là khung lớn, dễ nhìn file nhiều cột.
- Có thể mở gần full màn hình.
- Hàng tiêu đề cột trong preview phải sticky/fixed ở trên cùng khi cuộn dọc.
- Preview dùng cùng chế độ 簡易表示 / 全項目表示 với bảng chính.
- Preview hiển thị dữ liệu đã format theo Mapping.
- Preview hiển thị dữ liệu đã lưu sửa đổi nếu người dùng đã sửa.
- Ô thiếu dữ liệu hoặc lỗi format được highlight.
- Không tạo màn hình batch detail.

Sau khi làm xong, chạy typecheck.
```

## Prompt 15 - Export CSV Đúng Chuẩn

```text
Hãy tạo chức năng Export CSV từ dữ liệu CSV hiện tại.

Yêu cầu:
- Export đúng tất cả cột theo Mapping.
- Export đúng thứ tự cột trong Mapping.
- Export đầy đủ cột kể cả khi người dùng đang xem 簡易表示.
- Áp dụng đúng format đã cấu hình trong Mapping.
- Dữ liệu xuống dòng phải thay bằng khoảng trắng.
- Escape CSV đúng chuẩn để dấu phẩy, chấm phẩy, dấu nháy kép không làm nhảy cột/nhảy dòng.
- UTF-8 có BOM nếu hệ thống cần mở bằng Excel không lỗi tiếng Nhật.
- Nếu còn validation issue, hiển thị dialog xác nhận bằng tiếng Nhật trước khi export.
- Nếu người dùng xác nhận, vẫn export nhưng field thiếu để trống.
- Không lưu lịch sử export.

Sau khi làm xong, chạy typecheck và test export nếu có.
```

## Prompt 16 - Test Luồng Import/Preview/Edit/Export

```text
Hãy viết hoặc bổ sung test/checklist cho phần CSV作成.

Cần kiểm tra tối thiểu:
- Chọn Mapping trước khi import.
- Mapping lỗi bị chặn import/export.
- Đọc Excel theo startDetailRow.
- Xác định dòng hợp lệ theo validRowColumn.
- Lấy dữ liệu Excel trước, lookup Master Data sau, tính công thức sau lookup.
- Format Number 整数（小数切り捨て）: 123.67 thành 123, không thành 124.
- Dữ liệu xuống dòng được thay bằng khoảng trắng.
- 簡易表示 ẩn đúng cột hideInCompactView.
- 全項目表示 hiện đủ cột.
- Tất cả table, kể cả preview và chế độ xem lớn, vẫn nhìn thấy hàng tiêu đề cột khi cuộn xuống dữ liệu dài.
- Export vẫn đủ cột khi đang xem giản lược.
- Sửa trực tiếp cell, lưu sửa đổi, bỏ sửa đổi.
- Mở/đóng chế độ xem lớn không mất dữ liệu.
- Export CSV không nhảy dòng/cột khi có dấu phẩy, chấm phẩy, dấu nháy kép.
- Export khi còn thiếu dữ liệu có cảnh báo.

Sau khi làm xong, chạy typecheck và test phù hợp.
```

## Prompt 17 - Review Và Dọn Lại UI/UX Tiếng Nhật

```text
Hãy review toàn bộ phần CSV作成 vừa làm.

Kiểm tra:
- Tất cả label, button, alert, confirm, tooltip, validation message trên UI là tiếng Nhật.
- Không còn chữ tiếng Việt/tiếng Anh trên UI, trừ dữ liệu người dùng nhập.
- Không có Import Batch.
- Không có Batch Detail screen.
- Không có export history.
- Bảng đủ lớn, có scroll rõ ràng.
- Tất cả table có sticky header cho hàng tiêu đề cột khi cuộn dọc.
- Text không bị tràn/đè nhau trên desktop/mobile.
- Các button chính dễ hiểu với người non-tech.
- Không hard-code logic cột CSV trong component UI.
- Logic import/build/format/export nằm ở service/helper.

Nếu phát hiện vấn đề, hãy sửa luôn.

Sau khi làm xong, chạy typecheck.
```

## Prompt 18 - Chạy Kiểm Tra Cuối Và Báo Cáo

```text
Hãy chạy kiểm tra cuối cho phần CSV作成.

Cần chạy:
- npx tsc --noEmit.
- test liên quan nếu project có script test phù hợp.
- kiểm tra thủ công nhanh trên UI nếu có thể chạy dev server.

Sau đó báo cáo:
1. Đã làm những gì.
2. File chính đã sửa/tạo.
3. Test nào đã chạy và kết quả.
4. Còn giới hạn/rủi ro nào cần biết.
5. Cách người dùng thao tác thử từ màn hình CSV作成.
```

# Prompt Tổng - Cho Codex Tự Làm Lần Lượt Toàn Bộ Phần 3

Copy prompt bên dưới nếu muốn Codex tự động làm toàn bộ phần 3 từ đầu đến cuối trong một phiên làm việc.

```text
Bạn hãy thực thi hoàn chỉnh phần 3 CSV作成 theo tài liệu trong repo.

Trước tiên hãy đọc kỹ:
- Docs/ImportExport.md
- Docs/ImportExportPromt.md
- Docs/Plan.md
- Docs/schedule.md
- Docs/maplingusecase.md
- Docs/maplingImpromt.md

Sau đó tự làm lần lượt các bước sau, không dừng ở mức đề xuất:

1. Kiểm tra code hiện tại liên quan đến Mapping, Master Data, Firestore services và route CSV作成.
2. Tạo/bổ sung TypeScript types cho CSV working session, row, cell, validation issue, display mode.
3. Tạo service đọc Excel theo Mapping.
4. Tạo service build CSV theo Mapping.
5. Đảm bảo thứ tự xử lý bắt buộc: lấy dữ liệu Excel trước, điền fixed/manual/empty, lookup Master Data, tính công thức, áp dụng format, thay xuống dòng bằng khoảng trắng.
6. Tạo helper format, bao gồm Number 整数（小数切り捨て）: 123.67 thành 123, không làm tròn.
7. Tạo validation service cho dữ liệu CSV hiện tại.
8. Hoàn thiện màn hình CSV作成: chọn Mapping, upload Excel, import và hiển thị ngay bảng CSV.
9. Hiển thị bảng CSV lớn, có scroll ngang/dọc, header sticky khi cuộn dọc, và thứ tự cột đúng Mapping.
10. Thêm 簡易表示 / 全項目表示, dùng hideInCompactView hoặc 簡易表示で非表示 từ Mapping.
11. Thêm chế độ xem bảng lớn gần full màn hình.
12. Cho sửa trực tiếp cell như Excel, có 保存 và 変更を破棄.
13. Hiển thị validation/cảnh báo và gợi ý sửa dữ liệu.
14. Cho bổ sung Master Data từ cảnh báo nếu issue có missingMasterDataType.
15. Hoàn thiện preview CSV dạng bảng lớn, có sticky header cho hàng tiêu đề cột khi cuộn dọc.
16. Tạo export CSV đúng chuẩn: đủ cột Mapping, đúng thứ tự, đúng format, thay xuống dòng bằng khoảng trắng, escape dấu phẩy/chấm phẩy/dấu nháy kép, UTF-8 BOM nếu cần.
17. Không tạo Import Batch, không tạo màn hình Batch Detail, không lưu batch history, không lưu export history.
18. Toàn bộ UI text phải bằng tiếng Nhật.
19. Không hard-code logic cột CSV trong component UI; đưa logic vào service/helper.
20. Viết/bổ sung test hoặc checklist phù hợp.
21. Chạy npx tsc --noEmit và test liên quan nếu có.
22. Nếu có lỗi thì tự sửa đến khi pass hoặc báo rõ blocker.

Trong quá trình làm, hãy commit nhỏ theo nhóm logic nếu phù hợp. Cuối cùng báo cáo ngắn:
- Đã làm gì.
- File chính đã sửa/tạo.
- Test đã chạy.
- Cách thao tác thử trên UI.
- Phần nào còn cần dữ liệu mẫu hoặc xác nhận thêm.
```
