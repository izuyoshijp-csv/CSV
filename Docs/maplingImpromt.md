# Bo Prompt Trien Khai Phan 2: Mapping / Quan Ly Thiet Lap

File nay dung de thuc thi rieng **phan 2: Mapping / quan ly cac thiet lap dau vao** cua web app.

Muc tieu tong the cua app theo `Docs/Plan.md` va `Docs/schedule.md`:

1. `マスタデータ`: quan ly master data. Phan nay da tam xong.
2. `マッピング`: quan ly cau hinh mapping/thiet lap du lieu dau vao. Phan nay dang lam va can lam tot truoc.
3. `CSV作成`: import file don hang, xu ly theo mapping, apply rule, validation va export CSV. Phan nay se lam sau.

Vi vay file prompt nay **chi danh cho phan 2**. Khong dua prompt cua phan 3 vao day.

## Pham Vi Duoc Lam Trong File Nay

Duoc lam:

- Sidebar/navigation co 3 muc chinh:
  - `マスタデータ`
  - `マッピング`
  - `CSV作成`
- `マスタデータ` tro toi phan Master Data da co.
- `マッピング` tro toi man hinh quan ly thiet lap Mapping.
- `CSV作成` chi tao route/menu placeholder neu can, noi ro se thuc hien sau.
- Man hinh Mapping:
  - Xem danh sach mapping.
  - Tao mapping.
  - Sua mapping.
  - Xoa mapping.
  - Luu mapping.
  - Quan ly `マッピング名`.
  - Quan ly `明細開始行` (`startDetailRow`).
  - Quan ly `有効行判定列` (`validRowColumn`).
  - Quan ly cac dong rule cho tung cot CSV.
  - Quan ly cach lay du lieu: lay tu file don hang, gia tri co dinh, master lookup, cong thuc.
  - Luu/xem audit history neu hop ly trong pham vi Mapping.

Khong lam trong file nay:

- Khong import file don hang that.
- Khong tao Import Batch.
- Khong apply rule MHB/MAV.
- Khong validation batch sau apply rule.
- Khong tao file CSV.
- Khong export history.
- Khong xu ly PIC/kho theo batch.

## Rule Bat Buoc Xuyen Suot

- UI cho nguoi dung Nhat phai bang tieng Nhat.
- Khong dung tieng Viet/Anh tren UI, tru du lieu nguoi dung nhap hoac ten ky thuat nhu `MHB`, `MAV`, `CSV`, `Firestore`.
- `Admin` va `Operator` co full quyen nhu nhau trong pham vi Mapping.
- `明細開始行` va `有効行判定列` la bat buoc.
- Neu thieu hoac sai `明細開始行` / `有効行判定列`, khong cho luu Mapping.
- Khong hard-code mapping trong UI component. Logic nen nam trong type/service/helper rieng.
- `固定値設定` khong tach thanh tab rieng; gia tri co dinh la mot lua chon trong tung dong Mapping.
- `マスタデータ` la phan rieng, khong dat lap lai ben trong man hinh Mapping.
- `CSV作成` la phan 3, chi tao placeholder/navigation neu can.

---

## Prompt 01: Khao Sat Codebase Truoc Khi Sua

```text
Hay doc codebase hien tai de hieu cau truc du an Next.js truoc khi sua code.

Muc tieu:
- Xac dinh app dang dung App Router hay Pages Router.
- Xac dinh layout/sidebar/navbar hien co.
- Xac dinh route hien co cua Master Data.
- Xac dinh route/thanh phan hien co cua Mapping neu da co.
- Xac dinh Firebase/Firestore service pattern dang dung.
- Xac dinh package dang dung cho form, table, icon, toast, validation.
- Xac dinh co auth/role Admin/Operator chua.

Yeu cau:
- Chua sua code o buoc nay.
- Sau khi doc xong, tra loi ngan gon:
  1. Cau truc hien tai.
  2. Phan nao co the tai su dung cho Mapping.
  3. Phan nao can tao moi.
  4. Thu tu file du kien se sua/tao.
```

---

## Prompt 02: Sua Sidebar Thanh 3 Phan Chinh

```text
Hay trien khai sidebar/navigation theo muc tieu moi cua app.

Sidebar can co 3 muc chinh bang tieng Nhat:
- `マスタデータ`
- `マッピング`
- `CSV作成`

Yeu cau:
- Tan dung sidebar/layout hien co.
- `マスタデータ` dan toi route Master Data da co, vi du `/masterdata`.
- `マッピング` dan toi route quan ly Mapping, vi du `/mapping` hoac route phu hop voi pattern project.
- `CSV作成` la phan se lam sau. Neu tao route, chi tao placeholder ro rang bang tieng Nhat, khong viet logic import/export.
- Active state phai ro khi nguoi dung dang o bat ky route con nao cua tung muc.
- Tren mobile, sidebar van hoat dong theo responsive pattern hien co.
- Dung icon tu icon library hien co neu project da co.
- Khong dung text tieng Viet/Anh tren UI.

Pham vi can tranh:
- Khong them cac tab `インポート`, `バッチ処理`, `固定値設定`, `照明`, `エクスポート履歴` vao Mapping.
- Khong dat `マスタデータ` ben trong Mapping vi no da la phan rieng.
- Khong trien khai logic `CSV作成` o buoc nay.

Sau khi lam xong:
- Bao ro file da sua/tao.
- Chay typecheck/lint neu co.
```

---

## Prompt 03: Tao Route Container Cho Mapping

```text
Hay tao route container cho phan `マッピング`.

Yeu cau UI:
- Tieu de man hinh: `マッピング`
- Ben trong co tab hoac segmented navigation.
- Giai doan nay chi can tab chinh:
  - `マッピング一覧`
- Neu can de san cho phan hien thi/setting khac, chi tao placeholder rat gon bang tieng Nhat.
- Default khi vao `マッピング` la `マッピング一覧`.
- Tab active state phai ro.
- Tren mobile, tab bar khong vo layout, co the scroll ngang.

Khong lam:
- Khong tao tab `インポート`.
- Khong tao tab `バッチ処理`.
- Khong tao tab `固定値設定`.
- Khong tao tab `マスタデータ`.
- Khong tao tab `エクスポート履歴`.

Sau khi lam:
- Bao ro route Mapping dang dung.
- Bao ro file da sua/tao.
- Chay typecheck/lint neu co.
```

---

## Prompt 04: Tao Type/Model Cho Mapping Config

```text
Hay tao type/model cho Mapping Config theo `Docs/Plan.md` va `Docs/maplingusecase.md`.

Mapping Config can co:
- `id`
- `name`
- `description`
- `startDetailRow`
- `validRowColumn`
- `entries`
- `createdAt`
- `createdBy`
- `updatedAt`
- `updatedBy`
- `deleted` neu dung soft delete

Moi entry can ho tro:
- Cot CSV dich, vi du `A`, `B`, `AA`, `AO`, `AQ`.
- Ten cot hien thi.
- Cach lay du lieu:
  - Lay tu file don hang.
  - Gia tri co dinh.
  - Doi chieu master data.
  - Cong thuc tinh toan.
- Neu lay tu file don hang:
  - Lay tu mot o co dinh.
  - Lay tu mot cot/mang chi tiet.
  - Lay bang cong thuc dua tren du lieu don hang.
- Format du lieu:
  - Giu nguyen format file goc.
  - Number `00,000.00`.
  - Number bo phan thap phan, khong lam tron. Vi du `123.67` thanh `123`.
  - Date `yyyymmdd`.
- Target columns co the la mot cot hoac nhieu cot.
- Scope: sheet-level hoac detail-level.
- Note/description neu can.

Yeu cau ky thuat:
- Dat type o vi tri phu hop voi pattern codebase.
- Tao constant danh sach cot CSV can quan ly.
- Tao helper sort cot CSV theo thu tu A -> B -> ... -> AO -> AP -> AQ neu pham vi hien tai can AQ.
- Khong lam UI o buoc nay.
- Khong hard-code default data vao component.
- Chay typecheck.
```

---

## Prompt 05: Tao Validation Cho Mapping

```text
Hay trien khai validation cho Mapping Config.

Rule bat buoc:
- `マッピング名` bat buoc.
- `明細開始行` bat buoc, phai la so nguyen duong.
- `有効行判定列` bat buoc, phai la ten cot Excel hop le, vi du `A`, `R`, `AA`.
- Mapping dang active phai co it nhat mot entry.
- Moi entry phai co cot CSV dich, ten cot, cach lay du lieu.
- Cot CSV dich phai hop le.
- Neu cach lay la lay tu o co dinh thi phai co vi tri o, vi du `K4`.
- Neu cach lay la lay tu cot/mang chi tiet thi phai co cot nguon, dong bat dau, cot ket thuc/判定列 neu thiet ke yeu cau.
- Neu cach lay la cong thuc thi phai co cong thuc.
- Neu format date co offset thi offset phai la so nguyen.

Message loi bang tieng Nhat:
- Thieu ten Mapping: `マッピング名を入力してください。`
- Thieu startDetailRow: `明細開始行を入力してください。`
- startDetailRow sai: `明細開始行は1以上の整数で入力してください。`
- Thieu validRowColumn: `有効行判定列を入力してください。`
- validRowColumn sai: `有効行判定列はExcelの列名で入力してください。`
- Thieu entries: `マッピング設定を入力してください。`

Yeu cau ky thuat:
- Dat validation trong service/helper rieng.
- Function validation tra ve danh sach loi co field, message, severity/blocking.
- UI co the dung validation nay de chan Save.
- Khong viet validation lon truc tiep trong component.
- Viet test neu project co test framework.
- Chay typecheck/test.
```

---

## Prompt 06: Tao Service/Repository CRUD Cho Mapping

```text
Hay tao service/repository de CRUD Mapping Config.

Collection de xuat:
- `importMappingConfigs`

Chuc nang:
- List mapping chua bi xoa.
- Get mapping theo id.
- Create mapping.
- Update mapping.
- Delete mapping. Uu tien soft delete neu phu hop.
- Luu metadata createdAt/createdBy/updatedAt/updatedBy.

Yeu cau:
- Neu project da co Firestore CRUD helper, dung dung pattern do.
- Khong query Firestore truc tiep trong component.
- Loi service nen co message de UI hien thi bang tieng Nhat.
- Admin va Operator co quyen thao tac nhu nhau trong Mapping.
- Khong anh huong module Master Data.
- Chay typecheck/test.
```

---

## Prompt 07: Tao Default Mapping Theo Plan.md

```text
Hay tao default Mapping config dua tren `Docs/Plan.md` va `Docs/maplingusecase.md`.

Default Mapping:
- Ten: `標準マッピング`
- `明細開始行`: 17
- `有効行判定列`: R

Entries toi thieu:
- `K4` -> `A`
- `D4` -> `E`, `I`, `J`
- `K8` -> `K`
- `Q5` -> `W`, format date `yyyymmdd`
- `Q7 - 1` -> `X`, `AO`, format date `yyyymmdd`
- `Q7` -> `Y`, format date `yyyymmdd`
- generated line number -> `AD`
- detail column `C` -> `Z`
- detail column `I` -> `AA`
- detail column `E` -> `AB`
- detail column `M` -> `AG`
- detail column `R` -> `AI`
- detail column `U` -> `AM`
- detail column `V` -> `AN`
- detail column `L` -> `AP`
- detail column `S` -> `AQ`

Yeu cau:
- Khong hard-code default trong component UI.
- Dat trong seed/config/helper phu hop.
- Validate default mapping bang validation da tao.
- Neu co Firestore, tao script seed hoac function seed co the goi rieng.
- Neu chua seed Firestore, UI co the dung mock/default data tam thoi nhung phai tach khoi component.
- Chay typecheck.
```

---

## Prompt 08: Trien Khai Man Hinh Danh Sach Mapping

```text
Hay trien khai man hinh `マッピング一覧`.

UI can co:
- Tieu de: `マッピング一覧`
- Nut tao moi: `新規マッピング`
- Search theo ten: `マッピング名で検索`
- Loading: `マッピング一覧を読み込んでいます。`
- Empty state: `マッピングがまだ登録されていません。`
- Error: `マッピング一覧を読み込めませんでした。`

Bang danh sach can hien:
- `マッピング名`
- `明細開始行`
- `有効行判定列`
- So dong thiet lap.
- Ngay cap nhat neu co.
- Thao tac:
  - `編集`
  - `削除`
  - `複製` neu de lam.

Yeu cau:
- Load data qua service Mapping.
- Search client-side la du trong giai doan dau.
- Delete phai co confirm bang tieng Nhat.
- Khong dat logic Firestore truc tiep trong component.
- Chay typecheck/lint neu co.
```

---

## Prompt 09: Trien Khai Form Tao/Sua Mapping

```text
Hay trien khai form tao/sua Mapping.

Field header:
- `マッピング名`
- `説明`
- `明細開始行`
- `有効行判定列`
- `有効` neu can active/inactive

Yeu cau:
- Dung form component/pattern hien co.
- Validate bang validation helper da tao.
- Hien loi bang tieng Nhat.
- Nut:
  - `保存`
  - `キャンセル`
- Save thanh cong: `マッピングを保存しました。`
- Save that bai: `マッピングを保存できませんでした。`

Rule:
- Neu thieu/sai `明細開始行` hoac `有効行判定列`, khong cho luu.
- Admin va Operator thao tac nhu nhau.
- Khong lam import/apply/export trong form nay.

Sau khi lam:
- Chay typecheck/lint neu co.
- Bao ro file da sua/tao.
```

---

## Prompt 10: Trien Khai Editor Cho Dong Mapping

```text
Hay trien khai editor cho danh sach dong rule trong Mapping.

Moi dong can co cac cot chinh:
- `CSV列`
- `項目名`
- `データ取得方法`
- `設定内容`
- `操作`

`データ取得方法` gom:
- `注文ファイルから取得`
- `固定値`
- `マスタデータ参照`
- `計算式`

Neu `注文ファイルから取得`, cho chon:
- `固定セル`
- `明細列`
- `注文ファイル計算`

Neu `固定セル`:
- Field `取得元セル`, vi du `K4`.

Neu `明細列`:
- Field `取得元列`.
- Field `開始行`.
- Field `終了判定列` hoac field tuong duong theo thiet ke.

Neu `注文ファイル計算`:
- Field `元データ種別`: so hoac mang.
- Field `取得元セル/列`.
- Field `計算式`, vi du `Q7 - 1`.

Format:
- `元の形式を保持`
- `Number 00,000.00`
- `Number 整数（小数切り捨て）`: xoa phan thap phan, khong lam tron. Vi du `123.67` thanh `123`.
- `Date yyyymmdd`

Neu `固定値`:
- Field `固定値`.

Neu `計算式`:
- Field `計算式`, vi du `=A*C`.

Neu `マスタデータ参照`:
- Field `参照CSV列`.
- Field `マスタコレクション`.
- Field `照合フィールド`.
- Field `取得フィールド`.
- Field `結果CSV列`.

Yeu cau:
- Co nut them dong: `行を追加`.
- Co nut xoa dong: `削除`.
- Co nut duplicate neu de lam: `複製`.
- Entries nen sort theo thu tu CSV khi hien thi hoac co nut sort.
- UI mobile/tablet khong vo layout, co the horizontal scroll.
- Khong xu ly import file that o buoc nay.
- Chay typecheck/lint neu co.
```

---

### Bo Sung Cho Prompt 10: Checkbox An Cot Khi Xem Gian Luoc

```text
Khi trien khai editor cho tung dong Mapping, hay them checkbox `簡易表示で非表示`.

Yeu cau:
- Moi dong Mapping co checkbox `簡易表示で非表示`.
- Checkbox nay luu thanh field `hideInCompactView`.
- Mac dinh la false/khong tick.
- Neu tick, cot CSV cua dong Mapping do se bi an khi nguoi dung chon `簡易表示` trong phan `CSV作成`.
- Neu khong tick, cot CSV cua dong Mapping do van hien trong ca `簡易表示` va `全項目表示`.
- Cau hinh nay chi anh huong hien thi tren man hinh, khong anh huong export CSV. Export CSV van phai xuat day du cac cot theo Mapping.
```

---

## Prompt 11: Trien Khai Audit History Cho Mapping

```text
Hay trien khai audit history cho thay doi Mapping neu phu hop voi codebase.

Can luu:
- mappingId
- action: create/update/delete
- changedAt
- changedBy
- oldValue
- newValue

UI:
- Nut hoac panel `変更履歴`.
- Loading: `変更履歴を読み込んでいます。`
- Empty: `変更履歴がありません。`
- Error: `変更履歴を読み込めませんでした。`

Yeu cau:
- Khong can lam qua phuc tap giai doan dau.
- Neu project chua co auth user id ro rang, co the luu email/name neu session co.
- Khong anh huong Master Data.
- Chay typecheck/lint neu co.
```

---

## Prompt 12: Preview Cau Hinh Mapping Bang Du Lieu Mau

```text
Hay trien khai preview cau hinh Mapping bang du lieu mau hoac mock input, khong import file don hang that.

Muc tieu:
- Giup nguoi dung xem rule Mapping dang cau hinh ra sao.
- Day la preview cau hinh, khong phai phan 3 import/order batch.

UI:
- Nut `プレビュー`.
- Neu mapping hop le, hien tom tat cac dong:
  - CSV列
  - 項目名
  - データ取得方法
  - 設定内容
- Neu mapping thieu `明細開始行` hoac `有効行判定列`, hien loi bang tieng Nhat va khong preview.

Khong lam:
- Khong upload Excel.
- Khong parse workbook.
- Khong tao Import Batch.
- Khong apply MHB/MAV.
- Khong export CSV.

Yeu cau:
- Dung validation helper de chan preview.
- Chay typecheck/lint neu co.
```

---

## Prompt 13: Kiem Tra Quyen Admin/Operator Trong Mapping

```text
Hay kiem tra va chinh lai quyen trong pham vi Mapping.

Rule:
- Admin va Operator co full quyen nhu nhau trong Mapping.
- Neu Admin thay action nao thi Operator cung thay action do.
- Neu Admin lam duoc thao tac nao thi Operator cung lam duoc thao tac do.

Pham vi action:
- Xem danh sach Mapping.
- Xem chi tiet Mapping.
- Tao.
- Sua.
- Xoa.
- Luu.
- Preview cau hinh.
- Xem audit history.

Khong lam:
- Khong xu ly quyen cho Import Batch.
- Khong xu ly quyen cho Export CSV.

Yeu cau:
- Kiem tra UI va service/API neu co.
- Viewer neu ton tai thi chi xem, nhung khong bat buoc neu app chua co Viewer.
- Khong anh huong module khac.
- Viet checklist test neu chua co test auth.
- Chay typecheck/lint neu co.
```

---

## Prompt 14: Ra Soat UI Text Tieng Nhat Cho Mapping

```text
Hay ra soat toan bo UI text cua phan Mapping.

Yeu cau:
- Tat ca title, label, button, tooltip, alert, confirm modal, empty state, loading state, validation message, toast deu bang tieng Nhat.
- Khong con text tieng Viet/Anh tren UI san pham, tru du lieu nguoi dung nhap hoac ma ky thuat.
- Cac message bat buoc:
  - `マッピング名を入力してください。`
  - `明細開始行を入力してください。`
  - `有効行判定列を入力してください。`
  - `明細開始行は1以上の整数で入力してください。`
  - `有効行判定列はExcelの列名で入力してください。`
  - `マッピング設定を入力してください。`

Pham vi:
- Chi ra soat file lien quan Mapping/navigation Mapping.
- Khong sua UI Master Data neu khong lien quan.
- Khong sua UI CSV作成 vi phan do se lam sau.

Sau khi lam:
- Chay typecheck/lint neu co.
- Bao ro file da sua.
```

---

## Prompt 15: Viet Test/Checklist Cho Mapping

```text
Hay viet test hoac checklist kiem tra phan Mapping theo kha nang hien co cua project.

Test/checklist toi thieu:
- Sidebar co 3 muc: `マスタデータ`, `マッピング`, `CSV作成`.
- `マスタデータ` van vao dung man hinh Master Data.
- `マッピング` vao dung man hinh Mapping.
- `CSV作成` chi la placeholder hoac route chua co logic xu ly.
- Tao Mapping hop le.
- Tao Mapping thieu `マッピング名`.
- Tao Mapping thieu `明細開始行`.
- Tao Mapping thieu `有効行判定列`.
- Tao Mapping voi `明細開始行` khong phai so nguyen duong.
- Tao Mapping voi `有効行判定列` sai dinh dang.
- Them/sua/xoa dong rule.
- Lua chon `注文ファイルから取得` hien dung field con.
- Lua chon `固定値` hien field fixed value.
- Lua chon `マスタデータ参照` hien field VLOOKUP.
- Lua chon `計算式` hien field formula.
- Sort CSV column dung thu tu.
- Admin va Operator co quyen nhu nhau neu app co role.

Yeu cau:
- Neu project co test framework, viet test cho helper/service truoc.
- Neu chua co test framework, viet checklist vao docs hoac bao ro chua co test framework.
- Chay typecheck/lint neu co.
```

---

## Prompt 16: Kiem Tra Cuoi Cung Cho Phan 2 Mapping

```text
Hay chay kiem tra cuoi cung cho toan bo phan 2 Mapping.

Can kiem tra:
- Typecheck.
- Lint neu project co.
- Test neu project co.
- Dev server neu can.
- Sidebar/navigation:
  - `マスタデータ`
  - `マッピング`
  - `CSV作成`
- Route Mapping.
- Danh sach Mapping.
- Tao/sua/xoa/luu Mapping.
- Validation bat buoc.
- Preview cau hinh Mapping bang du lieu mau/mock.
- Khong co UI/tab phan 3 trong Mapping:
  - `インポート`
  - `バッチ処理`
  - `エクスポート履歴`

Khong kiem tra trong prompt nay:
- Import file don hang that.
- Hien thi bang CSV that sau import.
- Apply rule MHB/MAV.
- Validation du lieu CSV that.
- Export CSV.

Sau khi xong, tom tat:
1. Da hoan thanh nhung gi.
2. File chinh da sua/tao.
3. Lenh kiem tra da chay.
4. Loi con lai neu co.
5. Phan nao se chuyen sang giai doan 3 `CSV作成`.
```

---

## Prompt Tong Hop Neu Muon Giao AI Lam Phan 2 Tu Dau Den Cuoi

```text
Hay doc ky `Docs/Plan.md`, `Docs/schedule.md`, `Docs/maplingusecase.md` va `Docs/maplingImpromt.md`, sau do trien khai rieng phan 2: `マッピング`.

Muc tieu sidebar cua app:
- `マスタデータ`: phan 1 da tam xong.
- `マッピング`: phan 2 can trien khai tot trong lan nay.
- `CSV作成`: phan 3 se lam sau, chi tao placeholder neu can.

Yeu cau bat buoc:
- Chi lam phan Mapping/quan ly thiet lap.
- Khong trien khai import file don hang.
- Khong tao Import Batch.
- Khong apply rule MHB/MAV.
- Khong validation du lieu CSV that.
- Khong export CSV.
- UI cho nguoi dung Nhat phai bang tieng Nhat.
- Admin va Operator co full quyen nhu nhau trong Mapping.
- `明細開始行` va `有効行判定列` la bat buoc.
- Khong cho luu Mapping neu thieu/sai hai field nay.
- Mapping phai ho tro:
  - Lay tu file don hang: fixed cell, detail column/range, source formula.
  - Gia tri co dinh.
  - Master data lookup kieu VLOOKUP.
  - Formula kieu Excel.
  - Format original/number/date yyyymmdd.
  - Mot source map sang nhieu target columns.
  - Sort cot CSV theo thu tu.

Ket qua can co:
- Sidebar/navigation dung 3 phan.
- Route/man hinh `マッピング`.
- Tab/man hinh `マッピング一覧`.
- Type/model Mapping.
- Validation Mapping.
- Service CRUD Mapping.
- Default Mapping.
- UI tao/sua/xoa/luu Mapping.
- Editor dong rule.
- Preview cau hinh bang mock/sample, khong import file that.
- Audit history neu kha thi.
- Test/checklist phan Mapping.

Sau khi hoan tat:
- Bao ro file da sua/tao.
- Bao ro lenh typecheck/lint/test da chay.
- Bao ro phan nao con de danh cho giai doan 3 `CSV作成`.
```
