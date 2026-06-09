"use client"

import {
  createFirestoreCrudService,
  makeSafeDocumentId,
} from "@/lib/firebase/firestore-crud-service"
import {
  FIRESTORE_COLLECTIONS,
  type CusCodeListRecord,
  type ItemCodeListRecord,
  type PicWhCodeListRecord,
  type UnitCodeListRecord,
  type UnitPriceListRecord,
} from "@/types/firestore-models"

export const cusCodeListService = createFirestoreCrudService<CusCodeListRecord>(
  FIRESTORE_COLLECTIONS.cusCodeList,
  {
    getDocumentId: (record) => makeSafeDocumentId(record.CusCode),
    orderByField: "CusCode",
  }
)

export const itemCodeListService = createFirestoreCrudService<ItemCodeListRecord>(
  FIRESTORE_COLLECTIONS.itemCodeList,
  {
    getDocumentId: (record) => makeSafeDocumentId(record.IzuyoshiJPCode),
    orderByField: "IzuyoshiJPCode",
  }
)

export const unitPriceListService = createFirestoreCrudService<UnitPriceListRecord>(
  FIRESTORE_COLLECTIONS.unitPriceList,
  {
    getDocumentId: (record) => makeSafeDocumentId(record.IzuyoshiJPCode),
    orderByField: "IzuyoshiJPCode",
  }
)

export const picWhCodeListService = createFirestoreCrudService<PicWhCodeListRecord>(
  FIRESTORE_COLLECTIONS.picWhCodeList,
  {
    getDocumentId: (record) => makeSafeDocumentId(record.PICCode),
    orderByField: "PICCode",
  }
)

export const unitCodeListService = createFirestoreCrudService<UnitCodeListRecord>(
  FIRESTORE_COLLECTIONS.unitCodeList,
  {
    getDocumentId: (record) => makeSafeDocumentId(record.OrderUnit),
    orderByField: "OrderUnit",
  }
)

export const masterDataServices = {
  cusCodeList: cusCodeListService,
  itemCodeList: itemCodeListService,
  unitPriceList: unitPriceListService,
  picWhCodeList: picWhCodeListService,
  unitCodeList: unitCodeListService,
}
