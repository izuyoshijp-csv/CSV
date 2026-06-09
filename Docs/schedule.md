# Quy Trinh Vibecoding Web App Next.js Bang Codex

Tai lieu nay dung de follow tung buoc khi lam web app thay the quy trinh VBA Excel hien tai. Doi tuong doc la nguoi non-tech, nen moi buoc se noi ro:

- Can lam gi.
- Noi voi Codex nhu the nao.
- Can kiem tra ket qua nao.
- Khi nao duoc xem la xong buoc do.

Web app muc tieu:

- Frontend/backend: Next.js.
- Database: Firebase Firestore.
- Luu file neu can: Firebase Storage.
- Hosting: Vercel.
- Logic can giu lai tu VBA: import Excel don hang, tao du lieu CSV theo Mapping, validation du lieu thieu, preview CSV, export CSV dung format.

## Nguyen Tac Lam Viec Voi Codex

### 1. Moi lan chi yeu cau mot viec ro rang

Khong nen noi chung chung nhu:

```text
Hay lam het app cho toi.
```

Nen noi cu the:

```text
Hay tao man hinh quan ly CusCodeList gom danh sach, them, sua, xoa, tim kiem. Du lieu luu vao Firestore collection cusCodeList.
```

### 2. Sau moi buoc phai chay thu

Sau khi Codex code xong, luon yeu cau:

```text
Hay chay test/build/lint neu co, va bao toi ket qua.
```

Neu app co giao dien, can mo trinh duyet va tu kiem tra:

- Nut co bam duoc khong.
- Form co nhap duoc khong.
- Luu data co vao Firebase khong.
- Loi co hien thi de hieu khong.

### 3. Khong sua qua nhieu module trong mot lan

Thu tu uu tien:

1. Lam nen tang du lieu.
2. Lam master data.
3. Lam cau hinh import.
4. Lam import Excel.
5. Tao du lieu CSV theo Mapping va ap dung format.
6. Lam validation.
7. Lam preview/export CSV.
8. Lam deploy.

### 4. Khi Codex lam sai, dua loi cu the

Nen copy loi va noi:

```text
Khi toi bam Upload Excel thi bi loi sau: [dan loi vao day]. Hay doc code lien quan va sua loi nay.
```

Khong nen noi:

```text
App loi roi sua di.
```

## Tong Quan Quy Trinh Tu VBA Sang Web App

Quy trinh Excel hien tai co 3 buoc lon:

1. `ImportOrderData`: chon file Excel don hang, doc cac sheet hien thi, lay du lieu tu dong 17 tro xuong neu cot `R` co gia tri, map vao sheet `CSVExport`.
2. Xu ly theo Mapping: moi cot CSV lay du lieu tu file don hang, Master Data, gia tri co dinh, cong thuc hoac de trong; dong thoi ap dung format da cau hinh trong Mapping.
3. `Export`: xuat dung cac cot trong Mapping, dung thu tu va format Mapping, CSV UTF-8 co BOM neu can, escape dung chuan de khong bi nhay cot/nhay dong.

Trong web app, 3 buoc nay se thanh cac man hinh/chuc nang:

1. Quan ly master data.
2. Quan ly cau hinh gia tri co dinh.
3. Quan ly mapping file Excel don hang.
4. Upload/import Excel va hien bang CSV ngay tren man hinh.
5. Sua truc tiep bang CSV neu can.
6. Tao du lieu CSV tam thoi theo Mapping va ap dung format.
7. Validation va goi y bo sung master data/sua Mapping/sua file nguon/nhap them du lieu.
8. Preview va export CSV theo Mapping.

## Phase 0: Chuan Bi Moi Truong

### Buoc 0.1: Kiem tra project hien tai

Muc tieu: biet project dang co gi, dung framework/package nao.

Prompt cho Codex:

```text
Hay kiem tra cau truc project hien tai, doc package.json va cho toi biet app dang dung Next.js version nao, co TypeScript khong, co Tailwind/shadcn khong, va len danh sach cac thu muc quan trong.
```

Can kiem tra:

- Co file `package.json`.
- Co chay duoc `npm install` hoac package manager tuong ung.
- Co chay duoc dev server.

Tieu chi xong:

- Biet lenh chay app, vi du `npm run dev`.
- Biet project dung App Router hay Pages Router.
- Biet UI dang dung thu vien nao.

### Buoc 0.2: Tao file env cho Firebase

Muc tieu: chuan bi bien moi truong de ket noi Firebase.

Viec ban can lam tren Firebase Console:

1. Tao Firebase project.
2. Tao Web App trong Firebase.
3. Bat Firestore Database.
4. Neu can login, bat Authentication.
5. Neu can luu file Excel/CSV, bat Storage.
6. Copy config Firebase.

Prompt cho Codex:

```text
Hay tao cau truc ket noi Firebase cho Next.js. Tao file vi du .env.example voi cac bien NEXT_PUBLIC_FIREBASE_..., tao module lib/firebase.ts de khoi tao app, auth, firestore, storage. Khong dua secret that vao code.
```

Can kiem tra:

- `.env.example` co du bien.
- `.env.local` cua ban co gia tri that.
- App chay khong bao loi Firebase config.

Tieu chi xong:

- Next.js import duoc Firebase.
- Firestore san sang de doc/ghi data.

## Phase 1: Thiet Ke Data Model

### Buoc 1.1: Tao schema Firestore

Muc tieu: thong nhat du lieu se luu nhu the nao truoc khi lam giao dien.

Collections can co toi thieu:

- `cusCodeList`
- `itemCodeList`
- `unitPriceList`
- `picWhCodeList`
- `unitCodeList`
- `fixedValueConfigs`
- `importMappingConfigs`
- `validationIssues`

Prompt cho Codex:

```text
Du vao Docs/Plan.md va Docs/VBACode.docx, hay tao data model TypeScript cho Firestore. Can co types/interfaces cho master data, fixed value config, import mapping config, CSV working row/cell hien tai tren UI neu can, validation issue. Khong can import batch va export history trong giai doan nay. Dat trong thu muc phu hop cua project.
```

Can kiem tra:

- Ten field de hieu, khong qua viet tat.
- Cac cot Excel quan trong duoc map ro: `A`, `C`, `D`, `E`, `F`, `G`, `H`, `I`, `J`, `K`, `L`, `M`, `N`, `O`, `P`, `Q`, `R`, `S`, `T`, `U`, `V`, `W`, `X`, `Y`, `Z`, `AA`, `AB`, `AD`, `AE`, `AF`, `AG`, `AH`, `AI`, `AJ`, `AK`, `AL`, `AM`, `AN`, `AO`, `AP`, `AQ`.
- Co field audit nhu `createdAt`, `updatedAt`, `createdBy`, `updatedBy` neu can.

Tieu chi xong:

- Co type ro rang cho toan bo app.
- Cac buoc sau chi dung lai type nay, khong tao lung tung.

### Buoc 1.2: Tao service doc/ghi Firestore

Muc tieu: UI khong goi Firestore truc tiep lung tung, ma qua service.

Prompt cho Codex:

```text
Hay tao cac service Firestore cho master data va config. Moi service can co list, get, create, update, delete. Viet gon, dung type da tao, va dung converter/helper neu phu hop voi pattern project.
```

Can kiem tra:

- Co service rieng cho master data.
- Co service cho fixed value config.
- Co service cho import mapping config.
- Loi Firebase duoc handle de hien thong bao de hieu.

Tieu chi xong:

- Code UI sau nay co the goi service de doc/ghi.

## Phase 2: Lam Master Data

Master data thay the cac sheet danh muc trong Excel.

### Buoc 2.1: Man hinh danh sach master data

Muc tieu: co khu vuc quan ly cac danh muc:

- `CusCodeList`
- `ItemCodeList`
- `UnitPriceList`
- `PIC.WH.CodeList`
- `UnitCodeList`

Prompt cho Codex:

```text
Hay tao man hinh Master Data gom cac tab: CusCodeList, ItemCodeList, UnitPriceList, PIC.WH.CodeList, UnitCodeList. Moi tab hien danh sach data tu Firestore, co search, nut them moi, sua, xoa. Giao dien don gian, de dung cho nhan vien van hanh.
```

Can kiem tra:

- Chuyen tab khong loi.
- Them moi duoc.
- Sua duoc.
- Xoa duoc.
- Search duoc.
- Reload trang data van con.

Tieu chi xong:

- 5 danh muc quan trong co the quan ly tren web.

### Buoc 2.2: Import master data tu CSV/Excel

Muc tieu: khong phai nhap tay tung dong master data.

Prompt cho Codex:

```text
Hay them chuc nang import master data tu file CSV hoac Excel cho tung tab master data. Can preview truoc khi luu, bao loi dong nao thieu field bat buoc, va chi luu khi nguoi dung xac nhan.
```

Can kiem tra:

- Upload file dung format thi preview duoc.
- File sai format thi bao loi de hieu.
- Khong tao duplicate neu co khoa chinh trung.

Tieu chi xong:

- Co the dua du lieu tu Excel cu vao Firestore nhanh.

## Phase 3: Lam Cau Hinh Gia Tri Co Dinh

### Buoc 3.1: Man hinh fixed values

Muc tieu: thay the cac o mau trong `CSVExport` nhu `C5`, `D5`, `O5`, `P5`, `Q5`, `R5`, `S5`, `U5`, `V5`, `AE5`.

Gia tri ban dau:

| O Excel | Cot CSV | Gia tri |
| --- | --- | --- |
| `C5` | `C` | `0` |
| `D5` | `D` | `1` |
| `O5` | `O` | `51` |
| `P5` | `P` | `TK11` |
| `Q5` | `Q` | `1` |
| `R5` | `R` | `1` |
| `S5` | `S` | `1` |
| `U5` | `U` | `JPY` |
| `V5` | `V` | `JPY` |
| `AE5` | `AE` | `1` |

Prompt cho Codex:

```text
Hay tao man hinh cau hinh Fixed Values cho cac gia tri co dinh tu CSVExport. Hien thi cot Excel goc, cot CSV dich, ten chi tieu, gia tri mac dinh, ghi chu. Cho phep sua gia tri va luu vao Firestore collection fixedValueConfigs.
```

Can kiem tra:

- Data mac dinh duoc seed neu Firestore chua co.
- Sua gia tri va luu duoc.
- Refresh van thay gia tri moi.

Tieu chi xong:

- Logic import/export co the lay gia tri tu Mapping, khong hard-code.

### Buoc 3.2: Luu lich su thay doi fixed values

Muc tieu: biet ai sua, sua luc nao, gia tri cu/moi.

Prompt cho Codex:

```text
Hay them lich su thay doi cho fixedValueConfigs. Moi lan sua can ghi oldValue, newValue, userId/userEmail neu co, changedAt. Tao man hinh xem history theo tung config.
```

Can kiem tra:

- Sua mot gia tri tao ra mot record history.
- Xem history duoc.

Tieu chi xong:

- Co audit trail cho gia tri co dinh.

## Phase 4: Lam Cau Hinh Mapping Import Excel

### Buoc 4.1: Tao mapping mac dinh tu VBA

Muc tieu: chuyen logic `ImportOrderData` thanh cau hinh.

Mapping mac dinh:

| Nguon Excel don hang | Dich CSV | Ghi chu |
| --- | --- | --- |
| `K4` | `A` | gia tri cap sheet |
| `D4` | `E`, `I`, `J` | mot nguon ra nhieu cot |
| `K8` | `K` | gia tri cap sheet |
| `Q5` | `W` | ngay dat hang |
| `Q7 - 1` | `X`, `AO` | ngay tru 1 |
| `Q7` | `Y` | ngay |
| auto number | `AD` | so thu tu |
| cot `C` dong chi tiet | `Z` | theo dong |
| cot `I` dong chi tiet | `AA` | theo dong |
| cot `E` dong chi tiet | `AB` | theo dong |
| cot `M` dong chi tiet | `AG` | ten hang |
| cot `R` dong chi tiet | `AI` | so luong, dong hop le |
| cot `U` dong chi tiet | `AM` | don gia |
| cot `V` dong chi tiet | `AN` | thanh tien |
| cot `L` dong chi tiet | `AP` | ma vat tu nha may VN |
| cot `S` dong chi tiet | `AQ` | unit code nha may |

Prompt cho Codex:

```text
Hay tao importMappingConfigs mac dinh dua tren macro ImportOrderData. Can ho tro sourceType la sheetCell, detailColumn, expression, generated. Can co startDetailRow mac dinh 17 va validRowColumn mac dinh R. Tao seed/helper de tao config neu Firestore chua co.
```

Can kiem tra:

- Mapping hien dung nhu bang tren.
- Co `startDetailRow = 17`.
- Co `validRowColumn = R`.
- Co ho tro `Q7 - 1`.

Tieu chi xong:

- Import Excel sau nay khong phu thuoc hard-code vi tri o/cot.

### Buoc 4.2: Man hinh sua mapping

Muc tieu: nguoi dung sua mapping khi form don hang thay doi.

Prompt cho Codex:

```text
Hay tao man hinh Import Mapping Config. Cho phep xem/sua mapping nguon-dich, chon sourceType, sourceCell/sourceColumn, targetColumns, expression, startDetailRow, validRowColumn, format, va checkbox 簡易表示で非表示 cho tung dong Mapping. Can validate input de tranh mapping sai.
```

Can kiem tra:

- Sua `startDetailRow`.
- Sua `validRowColumn`.
- Sua mapping mot nguon ra nhieu cot.
- Luu va refresh khong mat.
 - Cho phep khai bao `format` cho tung mapping (string, number, date `yyyymmdd`, date + offset).
 - Cho phep tick `簡易表示で非表示` cho tung entry; field nay luu thanh `hideInCompactView`.
 - Co the sua `entries` dang JSON (cho phan dau nhanh) hoac UI form, va danh sach entries duoc hien thi/sap xep theo thu tu cot CSV (A->B->C...).

Tieu chi xong:

- Nguoi dung co the doi mapping tren giao dien.

## Phase 5: Lam Import Excel Theo Mapping Va Hien Bang CSV

### Buoc 5.1: Tao man hinh chon Mapping va Upload Excel

Muc tieu: nguoi dung chon dung Mapping truoc khi import. Moi Mapping la mot kieu import/export.

Prompt cho Codex:

```text
Hay tao man hinh CSV作成 cho phep nguoi dung chon mot Mapping hop le va upload mot hoac nhieu file Excel .xls/.xlsx/.xlsm. Danh sach Mapping lay tu importMappingConfigs. Chi cho import bang Mapping co startDetailRow va validRowColumn hop le. Neu Mapping loi, hien message tieng Nhat va khong cho upload/import.
```

Can kiem tra:

- Thay duoc danh sach Mapping.
- Mapping loi bi disable hoac bi chan import.
- Upload duoc nhieu file.
- Nguoi dung biet dang import theo Mapping nao.

Tieu chi xong:

- Chon Mapping va upload file duoc.
- Chua xu ly file neu Mapping chua hop le.

### Buoc 5.2: Doc Excel theo Mapping va tao du lieu CSV hien tai

Muc tieu: he thong doc file Excel theo cau hinh Mapping, khong hard-code vi tri cot/o trong UI.

Prompt cho Codex:

```text
Hay tao service importExcelByMapping. Service nhan file Excel va mappingId, doc workbook, bo qua sheet an neu thu vien ho tro, doc cac sheet hien thi, lay dong chi tiet tu startDetailRow, chi lay dong co gia tri o validRowColumn, sau do tao du lieu CSV hien tai theo tung entry trong Mapping. Thu tu xu ly bat buoc la: doc truoc tat ca du lieu lay truc tiep tu file Excel, dien fixed value/manual input/de trong, sau do moi lookup Master Data, sau khi lookup xong moi tinh expression/cong thuc cong tru nhan chia, cuoi cung moi ap dung format va chuan hoa ky tu dac biet. Mapping entry co the lay tu file Excel, Master Data, fixed value, expression/cong thuc, manual input neu co, hoac de trong. Khong tao Import Batch, khong luu lich su batch. Ket qua tra ve csvRows, validationIssues, ten file nguon, Mapping da dung va thong tin can hien thi tren man hinh.
```

Can kiem tra:

- Sheet an bi bo qua neu lam duoc.
- Dong chi tiet dung theo startDetailRow cua Mapping.
- Dong hop le dung theo validRowColumn cua Mapping.
- Cot CSV lay du lieu dung theo Mapping.
- He thong lay du lieu tu Excel truoc, lookup Master Data sau, roi moi tinh cong thuc.
- Mapping khac nhau tao ket qua CSV khac nhau neu cau hinh khac.
- Man hinh nhan duoc mappingId da dung.

Tieu chi xong:

- Sau upload, thay ngay bang CSV, so dong import va Mapping da dung.

### Buoc 5.3: Hien bang CSV ngay sau import

Muc tieu: import xong thay ngay bang CSV theo thu tu file CSV that, khong can man hinh chi tiet batch.

Prompt cho Codex:

```text
Hay hien thi ngay tren man hinh CSV作成 bang du lieu CSV sau khi import. Bang phai theo dung thu tu cot trong Mapping, co header, co scroll ngang/doc, khung preview lon, highlight o thieu du lieu va loi format, hien canh bao tong quan tren man hinh. Them nut 簡易表示 va 全項目表示. Khi bam 簡易表示, an cac cot co hideInCompactView=true trong Mapping. Khi bam 全項目表示, hien tat ca cot. Neu Mapping co field manual input thi hien field nhap/sua tuong ung tren man hinh hien tai.
```

Can kiem tra:

- Thay Mapping da dung.
- Thay du lieu CSV ngay sau import.
- Neu co manual input, nhap va luu duoc.
- Bang co scroll ngang de xem nhieu cot.
- Canh bao loi/thieu du lieu hien ngay tren man hinh.
- Nut 簡易表示 an dung cot da tick trong Mapping.
- Nut 全項目表示 hien lai tat ca cot.

Tieu chi xong:

- Man hinh hien tai co du thong tin de validation, preview lon va export.

## Phase 6: Tao CSV Theo Mapping Va Ap Dung Format

### Buoc 6.1: Tao service xu ly Mapping thanh CSV

Muc tieu: moi dong/cot CSV duoc tao dung theo Mapping.

Logic can co:

- Lay du lieu tu file Excel theo o/cot cau hinh.
- Lookup Master Data theo collection/field da cau hinh trong Mapping.
- Dien fixed value theo Mapping.
- Tinh expression/cong thuc neu Mapping co.
- De trong cot neu Mapping cau hinh de trong.
- Xu ly manual input tren man hinh hien tai neu Mapping co.
- Thay ky tu xuong dong trong du lieu bang khoang trang.
- Ap dung format cho tung cot theo danh sach format da cau hinh, bao gom number bo phan thap phan khong lam tron, vi du `123.67` thanh `123`.
- Ghi nhan loi neu khong lay duoc du lieu, lookup khong thay, expression loi, hoac format loi.

Prompt cho Codex:

```text
Hay tao service buildCsvRowsFromMapping cho du lieu import hien tai. Service nhan rows doc tu Excel va Mapping config, tao csvRows theo dung thu tu cot trong Mapping. Moi cot phai lay du lieu theo sourceType: excel cell/column, master data lookup, fixed value, expression, manual input, empty. Sau do ap dung format theo Mapping va thay ky tu xuong dong bang khoang trang. Format number bo phan thap phan phai xoa phan sau dau thap phan va khong lam tron, vi du `123.67` thanh `123`. Khong hard-code cot CSV trong UI. Loi thieu data hoac format loi phai tra ve de validation hien thi.
```

Can kiem tra:

- Cot lay tu Excel dung.
- Cot lookup Master Data dung.
- Cot fixed value dung.
- Cot empty de trong.
- Format date/number/number bo thap phan/text/cat ky tu dung theo Mapping.
- Loi format duoc ghi nhan.

Tieu chi xong:

- Man hinh co du lieu CSV tam thoi dung theo Mapping.
- Mapping khac nhau tao format/cot khac nhau.

### Buoc 6.2: Nut xu ly lai theo Mapping tren UI

Muc tieu: nguoi dung co the chay lai sau khi sua Master Data, sua Mapping, sua file nguon, manual input hoac sua truc tiep tren bang.

Prompt cho Codex:

```text
Hay them tren man hinh CSV作成 nut xu ly lai theo Mapping. Khi bam, goi service buildCsvRowsFromMapping, hien loading, cap nhat csvRows va validationIssues tren man hinh hien tai. Khong tao Import Batch, khong tao duplicate rows. UI text dung tieng Nhat.
```

Can kiem tra:

- Bam xu ly lai khong duplicate rows.
- Sua manual input roi xu ly lai duoc.
- Sua Master Data roi xu ly lai lookup duoc.
- Canh bao tren man hinh cap nhat dung.

Tieu chi xong:

- Nguoi dung non-tech co the import xong va bam xu ly lai khi can.

### Buoc 6.3: Sua truc tiep tren bang va che do xem lon

Muc tieu: nguoi dung sua du lieu CSV truc tiep nhu Excel va xem bang nhieu cot trong khung lon.

Prompt cho Codex:

```text
Hay them tinh nang sua truc tiep tren bang CSV sau import. Nguoi dung co the click vao bat ky o nao de sua, o da sua can duoc danh dau. Them nut 保存 de luu sua doi tam thoi thanh du lieu dung de export, nut 変更を破棄 de bo sua doi, va nut 全画面表示 de mo bang o che do lon gan full man hinh. Che do lon van phai thay toolbar/window, co nut dong che do lon, va khi dong khong lam mat du lieu dang sua. Neu export khi co thay doi chua luu, phai canh bao.
```

Can kiem tra:

- Sua duoc bat ky o nao.
- O da sua duoc danh dau.
- Luu sua doi duoc.
- Bo sua doi duoc.
- Mo bang lon gan full man hinh duoc.
- Dong che do bang lon khong mat du lieu dang sua.
- Toolbar van dung duoc trong che do bang lon.

Tieu chi xong:

- Nguoi dung co the xem/sua CSV nhu Excel truoc khi export.

### Buoc 6.4: Dong bo che do hien thi gian luoc/full

Muc tieu: khi nguoi dung da chon 簡易表示 hoac 全項目表示, che do do ap dung cho tat ca bang/preview trong cung phien xu ly hien tai.

Prompt cho Codex:

```text
Hay them state quan ly che do hien thi cot CSV gom compact va full. Nut 簡易表示 chuyen sang compact va an cac cot Mapping co hideInCompactView=true. Nut 全項目表示 chuyen sang full va hien tat ca cot. Che do da chon phai ap dung cho bang chinh, preview khung lon va che do xem gan full man hinh trong cung phien xu ly. Export CSV van phai xuat day du tat ca cot theo Mapping, ke ca cot dang bi an khi xem gian luoc.
```

Can kiem tra:

- Chon 簡易表示 o bang chinh thi preview cung hien gian luoc.
- Chon 全項目表示 o preview thi bang chinh cung hien day du.
- Che do xem gan full man hinh dung lai che do dang chon.
- Export van co day du cot Mapping khi dang xem 簡易表示.

Tieu chi xong:

- Nguoi dung chon mot che do hien thi va thay no thong nhat trong toan bo phien xu ly.

## Phase 7: Validation Theo Mapping Va Goi Y Bo Sung Du Lieu

### Buoc 7.1: Tao validation service

Muc tieu: chi ro du lieu nao thieu theo Mapping, khong bao loi cho cot da cau hinh de trong.

Can bat toi thieu:

- Khong tim thay customer code trong `CusCodeList`.
- Khong tim thay item code trong `ItemCodeList`.
- Khong tim thay unit price trong `UnitPriceList`.
- Khong tim thay PIC/warehouse code trong `PIC.WH.CodeList`.
- Khong tim thay unit code trong `UnitCodeList`.
- Ma PIC/kho tren man hinh trong hoac khong hop le neu Mapping yeu cau.
- Cot bat buoc theo Mapping bi trong.
- Gia tri nguon trong file Excel bi trong.
- Master Data lookup khong tim thay.
- Expression/cong thuc khong tinh duoc.
- Format khong ap dung duoc.
- Ngay/so/gia tien khong hop le neu Mapping yeu cau.

Prompt cho Codex:

```text
Hay tao validation service cho du lieu CSV hien tai sau khi xu ly theo Mapping hoac sau khi nguoi dung sua truc tiep tren bang. Service tra ve danh sach validationIssues gom rowId, rowNumber, csvColumn, mappingEntryId, severity, message, issueType, missingMasterDataType, sourceValue, suggestedAction. Validation khong mac dinh chan export, chi ghi ro du lieu nao thieu, cot nao loi format, va nen bo sung Master Data/sua Mapping/sua file nguon/sua truc tiep tren bang.
```

Can kiem tra:

- Xoa mot master data roi validation phai bao loi.
- Loi co chi ra dong nao, cot nao.
- Loi co goi y can them vao danh muc nao, sua Mapping nao, hoac sua file nguon nao.

Tieu chi xong:

- App biet ro du lieu nao thieu truoc khi export.

### Buoc 7.2: Man hinh validation issues

Muc tieu: nguoi dung xem danh sach loi de bo sung.

Prompt cho Codex:

```text
Hay tao khu vuc Validation tren man hinh CSV作成. Hien tong so loi, loc theo master data can bo sung, loc theo cot CSV, hien dong/cot/ly do/source value/suggested action. Them nut Run Validation. Canh bao phai hien ngay phia tren hoac gan bang CSV.
```

Can kiem tra:

- Xem duoc tong so loi.
- Loc loi duoc.
- Bam vao loi xem duoc dong lien quan.

Tieu chi xong:

- Nguoi dung hieu can sua hoac them master data nao.

### Buoc 7.3: Them nhanh master data tu validation

Muc tieu: giam thao tac cho nguoi dung.

Prompt cho Codex:

```text
Hay them chuc nang Add to Master Data tu moi validation issue neu issue co missingMasterDataType. Khi bam, mo form them nhanh voi sourceValue da dien san. Sau khi luu, cho phep xu ly lai theo Mapping va validation lai du lieu hien tai.
```

Can kiem tra:

- Tu loi item code them nhanh vao `ItemCodeList`.
- Tu loi customer them nhanh vao `CusCodeList`.
- Them xong xu ly lai theo Mapping va chay lai validation, loi giam.

Tieu chi xong:

- Tao duoc vong lap: validation -> bo sung master data/sua Mapping/sua file nguon/nhap them -> xu ly lai theo Mapping -> validation lai.

## Phase 8: Preview Va Export CSV Theo Mapping

### Buoc 8.1: Preview CSV bang khung lon

Muc tieu: preview chinh la bang CSV khung lon, de nhin duoc nhieu cot.

Prompt cho Codex:

```text
Hay tao preview CSV dang bang lon ngay tren man hinh CSV作成. Hien cac cot theo dung thu tu trong Mapping, gia tri da ap dung format theo Mapping va gia tri nguoi dung da luu sua doi. Preview phai dung che do hien thi hien tai: compact neu dang chon 簡易表示, full neu dang chon 全項目表示. Cot cau hinh de trong thi de trong. Cac o thieu du lieu hoac loi format can highlight. Preview mac dinh phai la khung lon, co che do gan full man hinh de de nhin file nhieu cot.
```

Can kiem tra:

- Cac cot hien dung thu tu Mapping.
- Format hien dung theo Mapping.
- O thieu duoc danh dau.
- O loi format duoc danh dau.
- Khung preview du lon, co scroll ngang/doc.
- Che do gan full man hinh hoat dong.
- Preview dung chung che do 簡易表示/全項目表示 voi bang chinh.

Tieu chi xong:

- Nguoi dung xem duoc CSV truoc khi tai file.

### Buoc 8.2: Export CSV UTF-8 co BOM

Muc tieu: export file CSV dung Mapping va khong bi loi nhay cot/nhay dong.

Yeu cau:

- Export dung cac cot trong Mapping.
- Giu dung thu tu cot trong Mapping.
- Ap dung format tung cot theo Mapping.
- CSV UTF-8 co BOM.
- Thay ky tu xuong dong bang khoang trang truoc khi export.
- Escape dung dau phay, cham phay, dau nhay kep.
- Xu ly dau cach dau/cuoi theo Mapping, khong tu y xoa neu Mapping yeu cau giu nguyen.
- Cho export ca khi con thieu data, nhung phai canh bao.

Prompt cho Codex:

```text
Hay tao chuc nang Export CSV tu du lieu dang hien thi tren bang. File phai UTF-8 co BOM neu he thong yeu cau, export dung cot va thu tu trong Mapping, ap dung format theo Mapping, thay ky tu xuong dong bang khoang trang, escape CSV dung chuan cho dau phay, cham phay va dau nhay kep. Neu validation con issue, hien dialog xac nhan export with missing data. Khong ghi lich su export.
```

Can kiem tra:

- Mo CSV bang Excel khong loi tieng Viet/tieng Nhat.
- Format khong bi bien dang ngoai Mapping.
- Dong co dau phay/cham phay/dau nhay van dung cot.
- Du lieu co xuong dong da duoc thay bang khoang trang.
- Export khi con loi co canh bao.
- Export xong khong can ghi lich su export.

Tieu chi xong:

- Tao duoc file CSV dung format Mapping va khong loi nhay cot/nhay dong.

## Phase 9: Authentication Va Phan Quyen

### Buoc 9.1: Firebase Authentication

Muc tieu: biet ai dang thao tac trong app neu can phan quyen.

Prompt cho Codex:

```text
Hay them Firebase Authentication bang email/password hoac Google login. Tao trang login, logout, guard cac trang noi bo. Luu user email vao cac thao tac create/update neu co. Phan Import/Export hien tai khong can luu export history.
```

Can kiem tra:

- Chua login khong vao duoc app.
- Login xong vao duoc.
- Nguoi dung dang nhap duoc nhan dien trong app.

Tieu chi xong:

- App co danh tinh nguoi dung.

### Buoc 9.2: Role Admin/Operator/Viewer

Muc tieu: tranh nguoi xem sua nham du lieu.

Prompt cho Codex:

```text
Hay them role Admin, Operator, Viewer. Admin sua config va master data. Operator import/validation/preview/export. Viewer chi xem. An hoac disable nut theo role, dong thoi kiem tra quyen trong service/API route.
```

Can kiem tra:

- Viewer khong sua/xoa/export duoc.
- Operator khong sua mapping/fixed values neu quy dinh khong cho.
- Admin lam duoc tat ca.

Tieu chi xong:

- Quyen han co ban hoat dong.

## Phase 10: Testing

### Buoc 10.1: Test logic quan trong

Muc tieu: tranh sua UI lam hong logic CSV.

Prompt cho Codex:

```text
Hay viet test cho cac logic quan trong: parse Excel theo Mapping, tao CSV theo Mapping, lookup Master Data, ap dung format theo Mapping, validation missing data, thay xuong dong bang khoang trang, va export CSV escaping cho dau phay/cham phay/dau nhay.
```

Can kiem tra:

- Test pass.
- Co test cho format date/expression neu Mapping co, vi du `Q7 - 1`.
- Co test cho CSV co dau phay, cham phay, dau nhay kep va du lieu nguon co xuong dong.
- Co test cho export khi thieu master data.

Tieu chi xong:

- Cac logic loi nhat co test bao ve.

### Buoc 10.2: Test bang file that

Muc tieu: so sanh output web app voi output Excel VBA.

Cach lam:

1. Lay file don hang that va Mapping tuong ung.
2. Chay quy trinh cu bang Excel VBA neu co file doi chieu, export CSV.
3. Upload cung file do len web app, chon dung Mapping, export CSV.
4. So sanh 2 file CSV.
5. Lam tuong tu voi cac Mapping khac da tao.

Prompt cho Codex:

```text
Hay tao huong dan hoac script so sanh 2 file CSV: file export tu Excel VBA va file export tu web app. Can bao dong/cot nao khac nhau.
```

Can kiem tra:

- Dong/cot khac nhau duoc bao ro.
- Neu khac do format ngay/gia, sua logic.

Tieu chi xong:

- Output web app khop VBA voi file mau chap nhan duoc.

## Phase 11: Deploy Len Vercel

### Buoc 11.1: Chuan bi build

Muc tieu: app build thanh cong truoc khi deploy.

Prompt cho Codex:

```text
Hay chay lint/typecheck/build cho project. Neu co loi, hay doc loi va sua den khi build thanh cong.
```

Can kiem tra:

- `npm run build` thanh cong.
- Khong co loi TypeScript.
- Khong co secret Firebase trong code.

Tieu chi xong:

- San sang deploy.

### Buoc 11.2: Deploy Vercel

Muc tieu: dua app len internet cho nguoi dung dung.

Viec ban can lam:

1. Tao account Vercel.
2. Ket noi GitHub repository.
3. Import project vao Vercel.
4. Them environment variables Firebase vao Vercel.
5. Deploy.

Prompt cho Codex:

```text
Hay kiem tra project can cau hinh gi de deploy len Vercel. Neu can sua next.config hoac bien moi truong, hay thuc hien va giai thich ngan gon.
```

Can kiem tra:

- Link Vercel mo duoc.
- Login duoc.
- Doc/ghi Firestore duoc tren production.
- Upload/import/export duoc tren production.

Tieu chi xong:

- Web app co link production dung duoc.

## Phase 12: UAT Cho Nguoi Dung

### Buoc 12.1: Checklist nghiem thu

Dung checklist nay de test truoc khi xem la hoan thanh.

Master data:

- Them/sua/xoa/search 5 danh muc duoc.
- Import master data tu file duoc.
- Data reload khong mat.

Config:

- Sua fixed values duoc.
- Sua import mapping duoc.
- Sua `startDetailRow` va `validRowColumn` duoc.

Import/Mapping:

- Upload nhieu file Excel duoc.
- Bo qua sheet an neu co.
- Chi lay dong hop le theo `validRowColumn` cua Mapping.
- Import xong hien ngay bang CSV dung.
- Man hinh ghi ro Mapping da dung.
- Cot CSV lay du lieu dung theo Mapping.
- Cot fixed value dung theo Mapping.
- Cot lookup Master Data dung theo Mapping.
- Cot empty de trong dung theo Mapping.
- Format date/number/text/cat ky tu dung theo Mapping.
- Checkbox 簡易表示で非表示 trong Mapping luu duoc.
- Sua truc tiep duoc bat ky o nao trong table.
- Luu sua doi duoc.
- Bo sua doi duoc.
- Mo table o che do gan full man hinh duoc.
- Dong che do gan full man hinh khong mat du lieu dang sua.

Validation:

- Bao loi thieu customer/item/unit price/PIC/unit code neu Mapping co lookup cac danh muc nay.
- Loi co dong, cot, ly do.
- Them nhanh master data duoc.
- Xu ly lai theo Mapping va validation lai duoc.

Export:

- Preview dung cot va thu tu trong Mapping.
- 簡易表示 an dung cac cot da tick trong Mapping.
- 全項目表示 hien day du cac cot.
- Che do hien thi da chon ap dung cho ca bang chinh, preview va che do gan full man hinh.
- Preview la khung lon, co scroll ngang/doc de xem nhieu cot.
- Export CSV UTF-8 co BOM.
- Format dung theo Mapping.
- Dau phay/cham phay/dau nhay khong lam nhay cot.
- Du lieu xuong dong duoc thay bang khoang trang.
- Export khi con thieu data co canh bao.
- Khong can export history.

Deploy:

- Production Vercel chay duoc.
- Firestore production doc/ghi duoc.

### Buoc 12.2: Sua theo feedback

Prompt cho Codex:

```text
Day la feedback UAT: [dan danh sach feedback]. Hay phan loai thanh bug, improvement, va question. Sau do sua cac bug truoc, moi lan sua xong hay chay build/test.
```

Tieu chi xong:

- Bug nghiem trong da sua.
- Nguoi dung co the chay quy trinh tu import den export.

## Lich Lam Viec De Xuat

Neu lam theo vibecoding tung buoc, nen chia nhu sau:

### Ngay 1: Nen tang

- Kiem tra project.
- Cai Firebase.
- Tao data model.
- Tao Firestore services.

Ket qua can co: app chay duoc va ket noi Firebase.

### Ngay 2: Master Data

- Lam 5 man hinh/tab master data.
- Them/sua/xoa/search.
- Import master data tu file.

Ket qua can co: danh muc Excel cu dua duoc len web.

### Ngay 3: Config

- Fixed values.
- Import mapping.
- Seed config mac dinh tu VBA.

Ket qua can co: khong hard-code cac o/cot Excel quan trong.

### Ngay 4: Import Excel Theo Mapping

- Upload nhieu file.
- Parse workbook/sheet.
- Chon Mapping.
- Map theo Mapping.
- Hien ngay bang CSV sau import.

Ket qua can co: file Excel don hang vao duoc web app.

### Ngay 5: Tao CSV Theo Mapping

- Tao CSV tam thoi theo Mapping.
- Lay du lieu tu file Excel/Master Data/fixed value/cong thuc/empty.
- Ap dung format theo Mapping.
- Xu ly manual input tren man hinh hien tai neu Mapping co.
- Lookup Master Data.
- Thay xuong dong bang khoang trang.
- Them che do 簡易表示/全項目表示 dua tren hideInCompactView cua Mapping.

Ket qua can co: man hinh co du lieu CSV tam thoi dung Mapping.

### Ngay 6: Validation

- Validation service.
- Man hinh loi.
- Goi y bo sung master data.
- Them nhanh master data.
- Sua truc tiep tren bang, luu sua doi, bo sua doi.
- Che do xem bang gan full man hinh.

Ket qua can co: biet ro du lieu nao thieu va sua duoc.

### Ngay 7: Export

- Preview CSV.
- Export UTF-8 BOM.
- Format ngay.
- Escape CSV.
- Thay xuong dong bang khoang trang.
- Canh bao khi con thieu data.

Ket qua can co: co file CSV dung nhu quy trinh cu.

### Ngay 8: Auth, Role, Test

- Login.
- Role Admin/Operator/Viewer.
- Test logic import/Mapping/validation/export.

Ket qua can co: app an toan hon va co test bao ve logic.

### Ngay 9: So Sanh Voi VBA

- Chay file mau theo tung Mapping tren VBA neu co file doi chieu va tren web app.
- So sanh output CSV giua cac Mapping/file mau.
- So sanh CSV.
- Sua cac khac biet.

Ket qua can co: output web app khop output Excel VBA.

### Ngay 10: Deploy Va UAT

- Build.
- Deploy Vercel.
- Test production.
- UAT voi nguoi dung.

Ket qua can co: link web app dung duoc that.

## Prompt Mau Tong Hop Cho Tung Buoc

### Prompt khi bat dau mot buoc moi

```text
Hay doc Docs/Plan.md, Docs/VBACode.docx va Docs/schedule.md. Bay gio toi muon lam Phase [so phase] - [ten phase]. Hay kiem tra code hien tai truoc, sau do implement theo dung pattern project. Sau khi xong hay chay test/build neu co va tom tat file da sua.
```

### Prompt khi can sua loi

```text
Toi gap loi khi [hanh dong]. Loi hien thi la:
[dan loi]

Hay tim nguyen nhan trong code, sua loi, va chay lai lenh kiem tra phu hop.
```

### Prompt khi can them giao dien

```text
Hay them giao dien cho [ten chuc nang]. Doi tuong dung la nhan vien van hanh non-tech, nen UI can ro rang, it chu giai thich thua, nut bam de hieu, co loading/error/empty state.
```

### Prompt khi can bao ve logic

```text
Hay viet test cho logic [ten logic]. Test can co case thanh cong, case data thieu, va case format dac biet. Sau do chay test va bao ket qua.
```

## Cac Diem Khong Duoc Quen

- `T5` trong Excel khong nen la fixed value toan he thong. Tren web, no la gia tri nhap tren man hinh xu ly CSV hien tai neu Mapping can.
- Validation khong duoc mac dinh chan export. Nguoi dung co the export voi field thieu de trong sau khi xac nhan.
- Fixed values va import mapping phai quan ly bang Firestore config, khong hard-code trong code.
- Logic Mapping, lookup Master Data, format va export CSV phai o service/core logic, khong nam truc tiep trong component UI.
- Export CSV phai co UTF-8 BOM de tranh loi tieng Viet/tieng Nhat khi mo bang Excel.
- Cot ngay/so/text phai format theo Mapping; neu Mapping yeu cau `yyyymmdd` thi phai xuat dung `yyyymmdd`.
- Import chi lay dong chi tiet tu dong `17` va cot dieu kien mac dinh la `R`, nhung 2 gia tri nay phai cho phep cau hinh.
- Can so sanh output web app voi output VBA bang file mau truoc khi dung that.
