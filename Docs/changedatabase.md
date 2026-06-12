# Ke hoach giam Firestore read cho Master Data va CSV lookup

## Van de hien tai

Hien tai viec lookup va search Master Data van dua nhieu vao Firestore:

- CSV lookup doc cac key can tra cuu tu Firestore. Da co cache TTL, nhung voi file lon hoac nhieu ma moi, so read van tang nhanh.
- Man hinh Master Data search goi Firestore moi lan search/doi trang. Search kieu contains con phai doc batch token index roi loc lai phia client, nen van ton read neu nguoi dung search nhieu.
- Toi uu query chi giam mot phan. Can tach du lieu doc nhieu thanh read model rieng.

Huong de xuat la dung song song:

- Firestore: source of truth.
- JSON index/cache: read model cho lookup va search.
- Session overlay: du lieu vua them/sua/xoa trong phien lam viec hien tai.
- Delta change log: cac thay doi moi hon JSON snapshot de may khac dong bo nhanh.
- Firestore fallback: chi dung khi JSON miss, JSON qua cu, hoac can xac nhan du lieu moi nhat.

## Nguyen tac kien truc

1. Firestore van la nguon du lieu chinh
   - CRUD Master Data van ghi Firestore.
   - Import/export, phan quyen, audit/log neu co sau nay van dua vao Firestore.
   - Khong coi JSON la noi ghi chinh.

2. JSON index la read model
   - Tao file JSON rieng cho tung collection lon.
   - App tai JSON de search/lookup local thay vi query Firestore lap lai.
   - JSON co version va updatedAt de biet do moi cua index.

3. Du lieu vua sua phai co tac dung ngay
   - Sau create/update/delete thanh cong, patch vao cache memory/session ngay.
   - CSV dang mo co the refresh lookup/validation ngay ma khong doi rebuild JSON.

4. May khac phai thay doi du lieu moi khi mo/tai lai app
   - Moi thay doi Master Data ghi them mot delta change log nho vao Firestore.
   - Khi app load, reload, vao man Master Data, hoac bat dau CSV lookup, client sync cac delta moi hon JSON snapshot.
   - Client patch delta len JSON cache local truoc khi search/lookup.
   - Nhu vay nguoi dung B co the thay du lieu nguoi dung A vua sua sau vai giay, ngay ca khi full rebuild JSON chua chay.

5. Firestore fallback co kiem soat
   - Neu JSON khong co key, co the doc Firestore theo document id/key mot lan.
   - Neu Firestore tim thay thi merge vao cache tam.
   - Neu Firestore khong tim thay thi cache negative result theo TTL ngan.

## Cau truc JSON de xuat

Luu JSON index tren Firebase Storage hoac static/CDN co the cap nhat runtime. Khong nen ghi vao `public` cua Next.js khi app da deploy, vi client/runtime khong tu ghi duoc vao do.

Vi du file:

- `masterdata-index/manifest.json`
- `masterdata-index/CusCodeList.json.gz`
- `masterdata-index/ItemCodeListMAV.json.gz`
- `masterdata-index/ItemCodeListMHB.json.gz`
- `masterdata-index/UnitPriceList.json.gz`
- `masterdata-index/PIC.WH.CodeList.json.gz`
- `masterdata-index/UnitCodeList.json.gz`

Vi du `manifest.json`:

```json
{
  "version": 42,
  "updatedAt": "2026-06-10T10:00:00.000Z",
  "collections": {
    "CusCodeList": {
      "url": "/masterdata-index/CusCodeList.json.gz",
      "recordCount": 120000,
      "version": 42,
      "updatedAt": "2026-06-10T10:00:00.000Z"
    }
  }
}
```

Vi du file collection sau khi giai nen:

```json
{
  "collectionName": "CusCodeList",
  "version": 42,
  "updatedAt": "2026-06-10T10:00:00.000Z",
  "lookupKeyField": "CusCode",
  "fields": ["CusCode", "CusNameEng", "CusNameJP", "CusAddress"],
  "records": [
    {
      "id": "C001",
      "documentId": "C001",
      "baseDocumentId": "C001",
      "CusCode": "C001",
      "CusNameEng": "ABC CO",
      "CusNameJP": "ABC"
    }
  ]
}
```

Trong client, sau khi load JSON, build them cac structure local:

- `Map<lookupKey, record>` cho CSV lookup.
- Lowercase/search text cache cho Master Data search.
- Optional inverted/ngram index local neu collection qua lon va search contains cham.

## Delta change log de dong bo du lieu moi nhat

JSON snapshot giup giam read lon, nhung snapshot co the tre hon du lieu Firestore. Vi vay can them delta change log de cac may khac thay du lieu moi truoc khi full rebuild chay xong.

### Collection de xuat

Tao collection Firestore:

- `masterdataChangeLogs`

Moi document dai dien cho mot thay doi tren Master Data.

Vi du document:

```json
{
  "collectionName": "CusCodeList",
  "documentId": "C001",
  "baseDocumentId": "C001",
  "lookupKey": "C001",
  "operation": "update",
  "record": {
    "id": "C001",
    "documentId": "C001",
    "baseDocumentId": "C001",
    "CusCode": "C001",
    "CusNameEng": "ABC CO UPDATED",
    "CusNameJP": "ABC"
  },
  "changedAt": "2026-06-10T10:05:20.000Z",
  "version": 43,
  "actorId": "user-id"
}
```

Voi delete:

```json
{
  "collectionName": "CusCodeList",
  "documentId": "C001",
  "baseDocumentId": "C001",
  "lookupKey": "C001",
  "operation": "delete",
  "changedAt": "2026-06-10T10:05:20.000Z",
  "version": 44,
  "actorId": "user-id"
}
```

Field can co:

- `collectionName`: collection Master Data bi doi.
- `documentId`: document id trong Firestore.
- `baseDocumentId`: base key neu co duplicate suffix.
- `lookupKey`: key lookup chinh.
- `operation`: `create`, `update`, hoac `delete`.
- `record`: ban ghi moi sau create/update. Delete khong can record.
- `changedAt`: server timestamp.
- `version`: so tang dan hoac timestamp/version de sort.
- `actorId`: optional, de audit/debug.

### Khi ghi thay doi

Moi thao tac create/update/delete Master Data phai lam 2 viec trong cung luong:

1. Ghi collection Master Data chinh.
2. Ghi them document vao `masterdataChangeLogs`.

Neu co the, dung batch write de Master Data record va change log thanh cong/that bai cung nhau.

Sau khi ghi thanh cong:

- Patch cache memory/session cua may hien tai.
- Notify tab/man hinh dang mo tren cung browser.
- Danh dau collection can background rebuild.

### Khi nguoi B mo hoac tai lai app

Moi lan app load/reload, vao man Master Data, hoac bat dau CSV lookup:

1. Load `manifest.json`.
2. Load JSON snapshot cua collection can dung.
3. Doc delta tu Firestore:
   - Query `masterdataChangeLogs`
   - `where("collectionName", "==", collectionName)`
   - `where("changedAt", ">", jsonUpdatedAt)`
   - `orderBy("changedAt")`
4. Apply delta len cache local:
   - `create/update`: upsert record vao records list, lookup map, search cache.
   - `delete`: remove record khoi records list, lookup map, search cache.
5. Search/lookup chay tren JSON snapshot + delta da patch.

Ket qua: neu nguoi A sua/xoa/them CodeList, 20 giay sau nguoi B reload/mo app va co mang, nguoi B se doc delta moi va dung duoc du lieu moi nhat, du full rebuild JSON chua hoan tat.

### Tan suat sync delta

Can sync delta o cac diem sau:

- Khi app vua load/reload.
- Khi vao man `CSV作成`.
- Truoc khi chay CSV lookup/rebuild rows.
- Khi vao man `マスタデータ`.
- Khi nguoi dung bam refresh data.
- Optional: neu man hinh dang mo lau, sync lai moi 30-60 giay khi tab dang active.

Khong can realtime listener lien tuc neu muon tiet kiem read. Query delta theo moc `lastSyncedAt` la du tot cho use case nay.

### Chi phi read cua delta

Voi Master Data 5,000 dong:

- Tai JSON snapshot: khong tinh Firestore document read neu luu tren Storage/CDN.
- Sync delta sau JSON:
  - Neu co 100 dong vua thay doi, doc khoang 100 change log docs.
  - Sau khi apply delta, search/lookup local khong doc them Firestore.
- Full rebuild mot collection 5,000 dong ton khoang 5,000 Firestore reads, nhung chay nen va khong lap lai theo moi user.

Vi vay, thay vi moi user search/lookup lam tang read lien tuc, app chi doc so delta moi phat sinh tu lan snapshot gan nhat.

## Luong CSV lookup moi

1. Nguoi dung upload Excel hoac bam xu ly lai.
2. Mapping service xac dinh cac collection can lookup.
3. App load JSON index cua cac collection do.
4. App sync delta change log moi hon JSON snapshot.
5. Build `MasterDataLookupStore` tu JSON + delta da patch.
6. Chay `buildCsvRowsFromMapping`.
7. Neu co key miss:
   - Fallback Firestore theo key neu can.
   - Merge record tim thay vao store tam.
   - Chay lai lookup/validation.
8. Neu nguoi dung them Master Data tu validation:
   - Ghi Firestore.
   - Ghi delta change log.
   - Patch session store ngay.
   - Clear cache key cu neu co.
   - Chay `refreshDerivedCsvRows`.

Ket qua: CSV lay duoc ma moi ngay lap tuc, khong phai cho generate lai JSON.

## Luong Master Data search moi

1. Khi vao man Master Data, tai manifest.
2. Tai JSON snapshot cua collection can xem.
3. Sync delta change log moi hon snapshot.
4. Neu collection lon va JSON index san sang, search tren JSON + delta local.
5. Pagination la client-side pagination tren ket qua da filter.
6. Khi mo/sua/xoa record:
   - Dung Firestore de ghi.
   - Ghi delta change log.
   - Patch local index sau khi Firestore thanh cong.
7. Neu JSON chua co, qua cu, hoac load loi:
   - Fallback ve Firestore paging/search hien tai.

Ket qua: search lap lai tren Master Data khong tao read moi moi lan go phim/doi trang.

## Xu ly create/update/delete

### Create

1. Ghi record vao Firestore.
2. Ghi delta change log voi `operation: "create"`.
3. Patch vao cache memory/session:
   - Them record vao collection cache.
   - Them vao lookup map.
   - Them vao search index local.
4. Notify cac man hinh khac bang localStorage event hoac custom event hien co.
5. CSV dang mo refresh lookup/validation neu collection/key lien quan.

### Update

1. Ghi Firestore.
2. Ghi delta change log voi `operation: "update"`.
3. Patch record trong cache local.
4. Neu lookup key bi doi thi can can than:
   - Hien tai service dang khong cho doi lookup key.
   - Neu sau nay cho doi key, phai remove key cu va add key moi trong cache.
5. Refresh CSV derived columns neu co row phu thuoc key do.

### Delete

1. Xoa Firestore.
2. Ghi delta change log voi `operation: "delete"`.
3. Remove record khoi cache local.
4. Remove key khoi lookup map.
5. Refresh CSV/validation:
   - Cac row phu thuoc key do se bao missing lookup.

## Chien luoc generate JSON

Khong chi dung mot lich co dinh. Nen co 4 lop:

1. Immediate local update
   - Sau create/update/delete, patch cache local ngay.
   - Tac dung voi phien dang mo.

2. Delta sync cho may khac
   - Sau create/update/delete, ghi `masterdataChangeLogs`.
   - Khi app load/reload hoac nguoi dung vao dung app, sync delta moi hon JSON snapshot.
   - Tac dung voi may khac truoc khi full rebuild xong.

3. Background debounce rebuild
   - Khi Master Data thay doi, danh dau collection do can rebuild.
   - Doi 5-10 phut sau lan thay doi cuoi cung moi rebuild neu collection co nhieu thay doi.
   - Tranh rebuild ca file sau tung lan sua mot dong.
   - Voi du lieu 5,000 dong, co the rebuild nhanh, nhung van nen debounce de tranh 100 lan sua tao 100 lan rebuild.

4. Scheduled full rebuild
   - Chay full rebuild moi dem.
   - Dung de chong lech index neu co loi giua chung.

Thoi gian goi y:

- Delta sync: ngay khi app load/reload, vao CSV/Master Data, truoc lookup/search, va optional moi 30-60 giay khi tab active.
- Debounce rebuild: 5-10 phut sau thay doi cuoi cua collection.
- Full rebuild: 1 lan/ngay vao gio it nguoi dung, vi du 02:00-03:00.
- Rebuild ngay khi delta qua nhieu: neu mot collection co tren 500-1,000 delta chua gom vao JSON, chay rebuild som.
- Manual rebuild: nut/admin command khi can.

Voi collection khoang 5,000 dong:

- Khong can rebuild sau moi thay doi.
- Hop ly nhat la debounce 5 phut sau dot thay doi cuoi.
- Van giu nightly full rebuild 1 lan/ngay.
- Neu trong ngay co nhieu import/sua lon, chay rebuild ngay sau khi import ket thuc hoac khi delta vuot nguong.

Sau khi rebuild thanh cong:

- Upload JSON snapshot moi.
- Update `manifest.json` voi `updatedAt/version` moi.
- Co the xoa hoac archive cac `masterdataChangeLogs` cu hon `manifest.updatedAt` de delta sync khong phinh to.
- Nen giu log cu 7-30 ngay neu can audit/debug, hoac move sang archive neu chi can sync.

## Script generate de xuat

Tao script moi:

- `scripts/rebuild-masterdata-json-index.js`

Script lam viec:

1. Doc config collection tu `masterCollectionConfigs`, fallback default configs.
2. Voi moi collection active:
   - Doc toan bo docs tu Firestore bang Admin SDK.
   - Loai bo field noi bo khong can cho client neu can.
   - Ghi file JSON collection.
   - Gzip file neu upload len Storage/CDN.
3. Ghi/update `manifest.json`.
4. Upload len Firebase Storage hoac output vao thu muc build artifact tuy moi truong deploy.
5. Danh dau cac delta cu hon manifest moi la da compact/rebuilt, hoac xoa/archive theo chinh sach giu log.

Co the giu script cu:

- `scripts/rebuild-masterdata-search-index.js` van dung cho Firestore search fallback neu can.
- JSON index script la huong chinh de giam read cho lookup/search lon.

## Thay doi code de xuat

### Service moi

Tao service:

- `src/modules/masterdata/services/masterdata-json-index-services.ts`

Trach nhiem:

- Load manifest.
- Load collection JSON theo collection name.
- Sync delta change log moi hon snapshot.
- Cache trong memory.
- Build lookup map.
- Tim record by lookup key.
- Search/filter/paginate local.
- Patch create/update/delete vao cache local.
- Ghi/apply create/update/delete delta.
- Expose fallback state neu JSON khong san sang.

### CSV create

Sua:

- `src/modules/csv-create/services/csv-create-services.ts`

Huong sua:

- Trong `loadRequestedMasterData`, uu tien doc tu JSON index.
- Truoc lookup, sync delta cho cac collection lien quan.
- Chi goi `getDynamicMasterDataByKeys` cho key JSON miss hoac index khong san sang.
- Sau fallback Firestore, merge vao cache tam.

Sua:

- `src/modules/csv-create/components/csv-create-page-content.tsx`

Huong sua:

- Sau khi save Master Data tu validation, patch JSON/session cache.
- Ghi delta change log khi tao Master Data moi.
- Goi lai `refreshDerivedCsvRows` nhu hien tai.

### Master Data page

Sua:

- `src/app/(private)/masterdata/page.tsx`

Huong sua:

- Neu collection lon va JSON index ready, search/pagination local.
- Khi vao page/tai lai page, sync delta moi hon manifest truoc khi hien ket qua.
- Neu JSON index chua co, fallback `getDynamicMasterDataPage`.
- Sau create/update/delete/import, ghi delta, patch cache local va notify changed.

## Uu tien trien khai

### Phase 1: JSON lookup cho CSV

Muc tieu:

- Giam read khi import/xu ly CSV lon.
- Khong doi UI nhieu.

Viec can lam:

- Tao JSON index service.
- Tao script rebuild JSON.
- Sua `loadRequestedMasterData` uu tien JSON.
- Fallback Firestore khi miss.

Thoi gian uoc tinh: 0.5-1 ngay.

### Phase 2: Session overlay cho create/update/delete

Muc tieu:

- Ma moi them vao Master Data duoc CSV lookup ngay.
- Sua/xoa record co tac dung ngay trong phien hien tai.

Viec can lam:

- Patch cache local sau CRUD.
- Clear/patch cache key lien quan.
- Refresh CSV derived rows/validation.

Thoi gian uoc tinh: 0.5 ngay.

### Phase 3: Delta change log cho may khac

Muc tieu:

- Nguoi dung B khi reload/mo app phai thay thay doi nguoi dung A vua ghi.
- Khong can doi full rebuild JSON moi co du lieu moi.

Viec can lam:

- Tao service ghi `masterdataChangeLogs` sau create/update/delete.
- Them sync delta vao JSON index service.
- Goi sync delta khi vao CSV, vao Master Data, va truoc lookup/search.
- Apply delta create/update/delete vao cache local.

Thoi gian uoc tinh: 0.5-1 ngay.

### Phase 4: Master Data search bang JSON

Muc tieu:

- Giam read khi nguoi dung search Master Data.
- Search va pagination chay local voi collection lon.

Viec can lam:

- Local filter/search/paginate trong JSON index service.
- Gắn vao `masterdata/page.tsx`.
- Fallback Firestore khi index khong san sang.

Thoi gian uoc tinh: 1-1.5 ngay.

### Phase 5: Rebuild automation

Muc tieu:

- JSON index duoc cap nhat nen sau thay doi.
- Co full rebuild dinh ky.

Viec can lam:

- Debounce rebuild theo collection sau thay doi.
- Full rebuild moi dem.
- Compact/archive delta sau rebuild thanh cong.
- Manual rebuild command/admin action.

Thoi gian uoc tinh: 0.5-1 ngay.

## Ket luan

Nen dung song song JSON va Firebase.

- Firestore giu vai tro ghi chinh va du lieu dung nhat.
- JSON index giam read cho lookup/search lon.
- Delta change log dam bao may khac sync duoc du lieu moi khi app load/reload hoac truoc lookup/search.
- Session overlay dam bao du lieu vua them/sua/xoa duoc CSV nhin thay ngay.
- Firestore fallback giu do tin cay khi JSON miss hoac chua kip rebuild.

Huong nay giai quyet ca hai van de lon:

- CSV lookup khong con doc Firestore lap lai cho nhieu key.
- Master Data search khong con tao Firestore read moi moi lan nguoi dung search/doi trang.

## Ke hoach thuc thi tung buoc va prompt cho Codex

Phan nay dung de chay viec theo tung buoc nho. Nen lam theo thu tu, moi buoc xong thi test/commit roi moi sang buoc tiep theo. Muc tieu la giam rui ro vi thay doi nay cham vao Master Data, CSV lookup, search va script rebuild.

### Buoc 0: Khao sat va lap baseline truoc khi sua

Muc tieu:

- Xac nhan luong lookup/search hien tai.
- Ghi lai cac file dang tham gia.
- Dam bao co baseline test/build truoc khi thay doi lon.

File can doc:

- `src/modules/csv-create/services/csv-create-services.ts`
- `src/modules/csv-create/components/csv-create-page-content.tsx`
- `src/modules/masterdata/services/masterdata-services.ts`
- `src/app/(private)/masterdata/page.tsx`
- `src/modules/masterdata/services/master-collection-config-services.ts`
- `scripts/rebuild-masterdata-search-index.js`

Ket qua mong muon:

- Biet chinh xac `loadRequestedMasterData`, `loadMasterDataStoreForMapping`, `loadMasterDataStoreForRows`, `getDynamicMasterDataPage`, create/update/delete Master Data dang duoc goi nhu the nao.
- Chay duoc `npx tsc --noEmit`.
- Khong sua code o buoc nay, chi ghi note neu can.

Prompt cho Codex:

```text
Hay doc Docs/changedatabase.md va khao sat code hien tai lien quan den Master Data, CSV lookup va Master Data search. Chi phan tich, chua sua code. Can chi ra:
1. Cac ham/file dang tao Firestore read nhieu nhat.
2. Luong lookup CSV hien tai di qua ham nao.
3. Luong search/pagination Master Data hien tai di qua ham nao.
4. Cac diem create/update/delete Master Data can chen delta change log va patch cache.
5. Rui ro khi dua JSON index vao.
Sau do chay npx tsc --noEmit neu co the va bao ket qua.
```

### Buoc 1: Tao type va service JSON index local

Muc tieu:

- Tao service trung tam cho JSON snapshot + in-memory cache.
- Buoc nay chua can upload Storage that, co the ho tro URL local/public hoac configurable URL truoc.
- Service phai co API ro rang de CSV va Master Data page dung chung.

File du kien tao/sua:

- `src/modules/masterdata/services/masterdata-json-index-services.ts`
- Co the sua type lien quan trong `src/types/firestore-models.ts` neu can.

API de xuat:

- `loadMasterDataIndexManifest()`
- `loadMasterDataCollectionIndex(collectionName)`
- `ensureMasterDataCollectionIndex(collectionName)`
- `getMasterDataRecordFromIndex(collectionName, lookupKey)`
- `getMasterDataRecordsFromIndex(collectionName, lookupKeys)`
- `searchMasterDataIndex(collectionName, options)`
- `patchMasterDataIndexRecord(collectionName, record)`
- `removeMasterDataIndexRecord(collectionName, documentIdOrLookupKey)`
- `clearMasterDataJsonIndexCache(collectionName?)`

Yeu cau:

- Cache theo collection trong memory.
- Build lookup map theo `lookupKeyField`.
- Co fallback state neu manifest/JSON khong load duoc.
- Khong lam hong luong Firestore hien tai.
- Chua can delta change log o buoc nay, nhung code nen de san hook `applyDelta`.

Kiem tra:

- `npx tsc --noEmit`
- Neu chua co JSON file that, service phai fail gracefully va tra ve unavailable/fallback.

Prompt cho Codex:

```text
Hay doc Docs/changedatabase.md, sau do implement Buoc 1: tao service JSON index local cho Master Data.
Tao file src/modules/masterdata/services/masterdata-json-index-services.ts.
Service can load manifest, load collection JSON, cache in-memory, build lookup map, lookup by key, lookup many keys, search/filter/paginate local, patch create/update, remove delete, va expose fallback state neu JSON khong san sang.
Chua chen vao CSV hay Master Data page o buoc nay. Hay giu API typed, phu hop voi MasterCollectionConfig/DynamicMasterDataRecord hien co. Sau khi sua, chay npx tsc --noEmit va bao ket qua.
```

### Buoc 2: Tao script generate JSON snapshot

Muc tieu:

- Tao script doc Firestore bang Admin SDK va xuat JSON snapshot per collection.
- Ban dau co the output vao thu muc local de dev/test.
- Sau nay moi them upload Firebase Storage/CDN neu can.

File du kien tao/sua:

- `scripts/rebuild-masterdata-json-index.js`
- `package.json` them script, vi du `rebuild:masterdata-json-index`
- Co the them folder output vao `.gitignore`, vi du `.masterdata-index/` hoac `public/masterdata-index/` tuy quyet dinh dev.

Yeu cau:

- Doc configs tu `masterCollectionConfigs`, fallback default configs giong script search index.
- Voi moi collection active, doc docs, strip field noi bo neu can.
- Ghi collection JSON va `manifest.json`.
- Manifest co `version`, `updatedAt`, `recordCount`, `lookupKeyField`, `fields`, `url/path`.
- Co tuy chon output dir qua env hoac argument.
- Khong commit serviceAccountKey.

Kiem tra:

- Chay script neu co credential local.
- Neu khong co credential, script phai bao loi ro.
- `npx tsc --noEmit`

Prompt cho Codex:

```text
Hay implement Buoc 2 trong Docs/changedatabase.md: tao script generate JSON snapshot cho Master Data.
Tao scripts/rebuild-masterdata-json-index.js dua tren pattern scripts/rebuild-masterdata-search-index.js.
Script doc masterCollectionConfigs, fallback default configs, export moi collection thanh JSON snapshot va manifest.json vao output dir configurable.
Them npm script rebuild:masterdata-json-index vao package.json.
Neu can them output folder vao .gitignore thi them. Khong dung network ngoai Firebase Admin SDK da co. Sau khi sua, chay npx tsc --noEmit va neu co the chay npm script de kiem tra loi syntax.
```

### Buoc 3: Gan JSON index vao CSV lookup voi fallback Firestore

Muc tieu:

- Giam read khi CSV lookup.
- `loadRequestedMasterData` uu tien JSON index.
- Neu JSON index khong san sang hoac key miss thi fallback Firestore nhu hien tai.

File du kien sua:

- `src/modules/csv-create/services/csv-create-services.ts`
- Co the can import service moi tu `masterdata-json-index-services.ts`.

Yeu cau:

- Trong `loadRequestedMasterData`, voi moi collection:
  - Thu lay records tu JSON index truoc.
  - Chi dua key miss vao `getDynamicMasterDataByKeys`.
  - Records fallback Firestore duoc merge vao cache/index tam.
- Cache negative result van con tac dung de tranh doc lap lai.
- Khong doi behavior validation/output CSV.
- Neu JSON service unavailable, luong hien tai van chay binh thuong.

Kiem tra:

- `npx tsc --noEmit`
- Test import/refresh CSV neu co data local.
- Xac nhan khi khong co JSON index, app van fallback Firestore.

Prompt cho Codex:

```text
Hay implement Buoc 3 trong Docs/changedatabase.md: gan JSON index vao CSV lookup.
Sua src/modules/csv-create/services/csv-create-services.ts, dac biet loadRequestedMasterData, de uu tien lay records tu masterdata-json-index-services truoc, chi fallback getDynamicMasterDataByKeys cho key miss hoac khi JSON index unavailable.
Can giu behavior hien tai cua buildCsvRowsFromMapping/refreshDerivedCsvRows/validation. Records fallback Firestore phai merge vao cache tam de khong doc lai. Neu JSON index loi thi app van chay theo Firestore nhu truoc.
Sau khi sua, chay npx tsc --noEmit va tom tat thay doi.
```

### Buoc 4: Tao delta change log service

Muc tieu:

- Moi create/update/delete Master Data ghi them delta log.
- Client co ham sync delta moi hon JSON snapshot/last synced time.

File du kien tao/sua:

- `src/modules/masterdata/services/masterdata-change-log-services.ts`
- `src/modules/masterdata/services/masterdata-json-index-services.ts`
- Co the sua `src/types/firestore-models.ts` de them type.

API de xuat:

- `createMasterDataChangeLog(change)`
- `listMasterDataChangeLogs(collectionName, since)`
- `applyMasterDataChangeLogsToIndex(collectionName, changes)`
- `syncMasterDataIndexDeltas(collectionName, options?)`

Yeu cau:

- Change log fields: `collectionName`, `documentId`, `baseDocumentId`, `lookupKey`, `operation`, `record`, `changedAt`, `version`, `actorId?`.
- Dung `serverTimestamp()` khi ghi.
- Sync delta query theo collection va `changedAt > since`.
- Apply delta:
  - create/update: upsert cache/index.
  - delete: remove cache/index.
- Neu query delta fail thi fallback Firestore path van co the dung.

Kiem tra:

- `npx tsc --noEmit`
- Chua can chen vao CRUD o buoc nay neu muon tach nho, nhung service phai compile.

Prompt cho Codex:

```text
Hay implement Buoc 4 trong Docs/changedatabase.md: tao delta change log service cho Master Data.
Tao src/modules/masterdata/services/masterdata-change-log-services.ts va cap nhat masterdata-json-index-services neu can de co ham sync/apply delta.
Change log phai ho tro create/update/delete, query theo collectionName va changedAt > since, apply vao JSON index cache local. Dung serverTimestamp khi ghi. Chua can chen vao UI CRUD neu thay doi qua lon, nhung API phai san sang va typed.
Sau khi sua, chay npx tsc --noEmit va bao ket qua.
```

### Buoc 5: Chen delta log va session overlay vao Master Data CRUD

Muc tieu:

- Sau create/update/delete/import Master Data, ghi delta log.
- Patch cache local ngay.
- Notify cac man hinh/tab khac nhu luong hien co.

File du kien sua:

- `src/modules/masterdata/services/masterdata-services.ts`
- `src/app/(private)/masterdata/page.tsx`
- `src/modules/csv-create/components/csv-create-page-content.tsx`
- Co the sua service create missing master data trong `csv-create-services.ts`.

Yeu cau:

- Create/update/delete single record ghi delta log.
- Import bulk co 2 cach:
  - Ghi delta cho tung row neu so row vua phai.
  - Hoac danh dau collection can rebuild va sync bang fallback neu import cuc lon.
- Sau save Master Data tu CSV validation:
  - Ghi Firestore.
  - Ghi delta.
  - Patch JSON/session cache.
  - Re-run `refreshDerivedCsvRows`.
- Khong tao duplicate delta neu service da ghi va UI cung ghi. Chon mot layer chinh de ghi delta, uu tien service layer.

Kiem tra:

- `npx tsc --noEmit`
- Them/sua/xoa record tren Master Data page.
- Them Master Data tu CSV validation va xem CSV lookup cap nhat ngay.

Prompt cho Codex:

```text
Hay implement Buoc 5 trong Docs/changedatabase.md: chen delta log va session overlay vao Master Data CRUD.
Can dam bao create/update/delete Master Data ghi masterdataChangeLogs, patch cache JSON/session local, va notify cac man hinh/tab hien co. Uu tien dat ghi delta trong service layer de tranh UI goi trung lap.
Sua cac luong trong src/app/(private)/masterdata/page.tsx va CSV create neu can, dac biet save Master Data tu validation. Sau khi them/sua/xoa, CSV dang mo phai refresh derived rows/validation va thay du lieu moi ngay.
Chay npx tsc --noEmit va tom tat cac diem da chen.
```

### Buoc 6: Sync delta khi app load, vao CSV, vao Master Data va truoc lookup/search

Muc tieu:

- Nguoi dung B reload/mo app sau khi nguoi A sua se thay du lieu moi nhat.
- Truoc CSV lookup/search local, cache da apply delta moi.

File du kien sua:

- `src/modules/csv-create/services/csv-create-services.ts`
- `src/modules/csv-create/components/csv-create-page-content.tsx`
- `src/app/(private)/masterdata/page.tsx`
- Co the them hook nho neu can, vi du `useMasterDataDeltaSync`.

Yeu cau:

- Khi vao `CSV作成`, sync delta cho collection trong selected mapping.
- Truoc `loadMasterDataStoreForMapping`/`loadMasterDataStoreForRows`, sync delta cho collection lien quan.
- Khi vao `マスタデータ`, sync delta cho active collection truoc khi hien local search.
- Optional: khi tab active lau, sync moi 30-60 giay, nhung can can than read. Mac dinh co the chi sync theo event quan trong.
- Luu `lastSyncedAt` per collection trong memory/localStorage neu phu hop.

Kiem tra:

- `npx tsc --noEmit`
- Mo app o hai browser/tab: A sua record, B reload/vao CSV/Master Data, B thay record moi.

Prompt cho Codex:

```text
Hay implement Buoc 6 trong Docs/changedatabase.md: sync delta khi app load/reload, vao CSV, vao Master Data va truoc lookup/search.
Nguoi dung B phai lay duoc thay doi moi hon JSON snapshot bang masterdataChangeLogs truoc khi dung data. Sua CSV create va Master Data page de goi sync delta dung thoi diem. Khong bat realtime listener lien tuc neu khong can; uu tien sync theo event quan trong va optional interval 30-60 giay khi tab active neu implement gon.
Sau khi sua, chay npx tsc --noEmit va ghi ro luong sync moi.
```

### Buoc 7: Master Data search/pagination bang JSON index

Muc tieu:

- Search Master Data collection lon khong doc Firestore moi lan go phim/doi trang.
- Firestore pagination hien tai chi la fallback.

File du kien sua:

- `src/app/(private)/masterdata/page.tsx`
- `src/modules/masterdata/services/masterdata-json-index-services.ts`

Yeu cau:

- Neu JSON index ready:
  - Search/filter local.
  - Pagination local.
  - Count local.
  - Apply delta truoc search.
- Neu JSON index unavailable:
  - Dung `getDynamicMasterDataPage` nhu hien tai.
- Can giu UI behavior hien tai: search conditions, contains/prefix/equals neu co the.
- Khong load toan bo Firestore khi search neu JSON ready.

Kiem tra:

- `npx tsc --noEmit`
- Test search equals/prefix/contains.
- Test pagination.
- Test edit/delete sau khi search local.

Prompt cho Codex:

```text
Hay implement Buoc 7 trong Docs/changedatabase.md: doi Master Data search/pagination sang JSON index khi index ready.
Sua src/app/(private)/masterdata/page.tsx va service JSON index neu can. Khi JSON ready, search/filter/pagination/count chay local tren JSON + delta da sync. Khi JSON unavailable, fallback getDynamicMasterDataPage nhu hien tai.
Can giu UI behavior hien tai va khong lam hong create/update/delete/import/export. Sau khi sua, chay npx tsc --noEmit va tom tat fallback logic.
```

### Buoc 8: Rebuild automation, compact delta va chinh sach rebuild

Muc tieu:

- Full rebuild chay nen hop ly.
- Delta khong phinh to vo han.
- Khong rebuild qua nhieu trong ngay.

File du kien sua/tao:

- `scripts/rebuild-masterdata-json-index.js`
- Co the them `scripts/compact-masterdata-change-logs.js`
- `package.json`
- Tai lieu huong dan van hanh neu can.

Chinh sach de xuat:

- Nightly full rebuild: 1 lan/ngay luc 02:00-03:00.
- Debounce rebuild: 5-10 phut sau dot thay doi cuoi, nhung voi 200 changes/ngay co the khong can rebuild ban ngay.
- Rebuild som neu delta cua collection vuot 1,000 thay doi hoac sau import lon.
- Sau rebuild thanh cong:
  - Update manifest `updatedAt/version`.
  - Archive/xoa delta cu hon manifest moi.
  - Giu audit 7-30 ngay neu can.

Kiem tra:

- Script rebuild output dung.
- Manifest updatedAt/version dung.
- Delta cu duoc compact/archive theo rule.

Prompt cho Codex:

```text
Hay implement Buoc 8 trong Docs/changedatabase.md: hoan thien rebuild automation va compact delta.
Cap nhat script rebuild-masterdata-json-index de sau rebuild thanh cong co the danh dau/archive/xoa delta cu hon manifest updatedAt theo chinh sach an toan. Them npm script can thiet. Ghi ro cach van hanh nightly rebuild 02:00-03:00, debounce 5-10 phut, va rebuild som khi delta > 1000.
Neu chua co moi truong scheduler trong repo, chi can script va huong dan van hanh trong Docs/changedatabase.md. Chay npx tsc --noEmit va test syntax script neu co the.
```

### Buoc 9: Kiem thu end-to-end va do read

Muc tieu:

- Dam bao dung du lieu moi nhat.
- Dam bao read giam that.
- Dam bao fallback an toan khi JSON/delta loi.

Test case can co:

- CSV lookup voi JSON ready: khong goi Firestore cho key da co trong JSON.
- CSV lookup voi JSON miss: fallback Firestore va merge cache.
- A them record, B reload CSV sau 20 giay: B lookup duoc record moi qua delta.
- A update record, B vao Master Data sau 20 giay: B thay gia tri moi qua delta.
- A delete record, B lookup/search: record bi remove, CSV bao missing neu can.
- JSON unavailable: app fallback Firestore.
- Delta query fail: app khong crash, fallback/bao loi hop ly.
- Full rebuild xong: manifest moi, delta cu duoc compact/archive.

Prompt cho Codex:

```text
Hay thuc hien Buoc 9 trong Docs/changedatabase.md: kiem thu end-to-end va do read cho JSON index + delta change log.
Hay doc code da implement, tao checklist test cu the, chay npx tsc --noEmit, va neu co the them test unit/service cho lookup JSON, apply delta create/update/delete, fallback Firestore, va search local. Bao ro test nao da chay, test nao can test thu cong voi Firebase.
```

## Prompt tong hop neu muon giao Codex lam theo phase

Dung prompt nay khi muon Codex tu chia viec va thuc hien nhieu buoc lien tiep, nhung van nen yeu cau dung sau moi phase de test:

```text
Hay doc Docs/changedatabase.md va thuc hien ke hoach giam Firestore read bang JSON index + delta change log theo tung phase.
Quy tac:
1. Khong lam tat ca trong mot patch lon neu co the tach phase.
2. Moi phase phai chay npx tsc --noEmit.
3. Firestore van la source of truth.
4. JSON index chi la read model.
5. Delta change log bat buoc de nguoi dung khac reload/mo app thay du lieu moi nhat truoc khi full rebuild.
6. Neu JSON/delta unavailable, app phai fallback ve Firestore path hien tai.
7. Khong lam hong CSV mapping/validation/export hien co.
Hay bat dau tu phase tiep theo chua lam, bao ro file se sua, sau do implement va verify.
```

## Trang thai hoan thanh

Cac buoc da hoan thanh (2026-06-10):
- [x] Buoc 0: Khao sat va lap baseline
- [x] Buoc 1: Tao masterdata-json-index-services.ts - JSON index service local
- [x] Buoc 2: Tao rebuild-masterdata-json-index.js - script generate JSON snapshot
- [x] Buoc 3: Chen JSON index vao CSV lookup (loadRequestedMasterData)
- [x] Buoc 4: Tao masterdata-change-log-services.ts - delta change log
- [x] Buoc 5: Chen delta log + session overlay vao Master Data CRUD
- [x] Buoc 6: Sync delta khi app load, vao CSV, vao Master Data
- [x] Buoc 7: Master Data search/pagination bang JSON index
- [x] Buoc 8: Rebuild automation + compact delta
- [ ] Buoc 9: Kiem thu end-to-end (can Firebase thuc te)
