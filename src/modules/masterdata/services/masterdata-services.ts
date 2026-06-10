import { getFirestoreCollection } from "@/lib/firebase/firestore-query"
import { getFirestoreSafe } from "@/lib/firebase/client"
import {
  createFirestoreCrudService,
  makeSafeDocumentId,
} from "@/lib/firebase/firestore-crud-service"
import {
  collection,
  deleteField,
  doc,
  endAt,
  endBefore,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  limitToLast,
  orderBy,
  query,
  startAfter,
  startAt,
  serverTimestamp,
  where,
  writeBatch,
  type DocumentData,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from "firebase/firestore"
import type { MasterCollectionConfig } from "@/types/firestore-models"

export type CusCodeListItem = {
  id?: string
  CusCode: string
  CusNameEng?: string
  CusNameJP?: string
  CusAddress?: string
}

export type ItemCodeListItem = {
  id?: string
  MAVCode?: string
  MHBCode?: string
  IzuyoshiJPCode: string
  IzuyoshiVNCode?: string
  Description?: string
}

export type UnitPriceListItem = {
  id?: string
  IzuyoshiJPCode: string
  UnitPrice?: string
}

export type PICWHCodeListItem = {
  id?: string
  PICCode: string
  WarehouseCode?: string
  DetailWarehouseCode?: string
}

export type UnitCodeListItem = {
  id?: string
  OrderUnit: string
  CsvCode?: string
}

export type DynamicMasterDataRecord = {
  id?: string
  documentId?: string
  baseDocumentId?: string
  [key: string]: unknown
}

export type DynamicMasterDataSearchOptions = {
  field?: string
  query?: string
}

export type DynamicMasterDataPageCursor = QueryDocumentSnapshot<DocumentData> | null

export type DynamicMasterDataPageOptions = {
  pageSize: number
  direction?: "first" | "next" | "previous" | "last"
  cursor?: DynamicMasterDataPageCursor
  search?: DynamicMasterDataSearchOptions
}

export type DynamicMasterDataPage = {
  rows: DynamicMasterDataRecord[]
  totalCount: number
  firstCursor: DynamicMasterDataPageCursor
  lastCursor: DynamicMasterDataPageCursor
  hasPreviousPage: boolean
  hasNextPage: boolean
}

const emptyCusCodeData: CusCodeListItem[] = []
const emptyItemCodeData: ItemCodeListItem[] = []
const emptyUnitPriceData: UnitPriceListItem[] = []
const emptyPicWhData: PICWHCodeListItem[] = []
const emptyUnitCodeData: UnitCodeListItem[] = []
const DUPLICATE_DOCUMENT_ID_SEPARATOR = "__"
const DEFAULT_BULK_IMPORT_BATCH_SIZE = 400
const DEFAULT_BULK_IMPORT_BATCH_DELAY_MS = 250
const DEFAULT_DOCUMENT_ID_LOOKUP_BATCH_SIZE = 20
const DEFAULT_DOCUMENT_ID_LOOKUP_DELAY_MS = 150

export async function getCusCodeList(): Promise<CusCodeListItem[]> {
  return getFirestoreCollection<CusCodeListItem>("CusCodeList", emptyCusCodeData)
}

export async function getItemCodeList(): Promise<ItemCodeListItem[]> {
  return getFirestoreCollection<ItemCodeListItem>("ItemCodeList", emptyItemCodeData)
}

export async function getUnitPriceList(): Promise<UnitPriceListItem[]> {
  return getFirestoreCollection<UnitPriceListItem>("UnitPriceList", emptyUnitPriceData)
}

export async function getPICWHCodeList(): Promise<PICWHCodeListItem[]> {
  return getFirestoreCollection<PICWHCodeListItem>("PIC.WH.CodeList", emptyPicWhData)
}

export async function getUnitCodeList(): Promise<UnitCodeListItem[]> {
  return getFirestoreCollection<UnitCodeListItem>("UnitCodeList", emptyUnitCodeData)
}

export async function getDynamicMasterData(
  config: MasterCollectionConfig
): Promise<DynamicMasterDataRecord[]> {
  return getFirestoreCollection<DynamicMasterDataRecord>(config.collectionName, [])
}

function mapDynamicMasterDataSnapshot(
  snapshot: QueryDocumentSnapshot<DocumentData>
): DynamicMasterDataRecord {
  return {
    id: snapshot.id,
    ...snapshot.data(),
  } as DynamicMasterDataRecord
}

function getDynamicMasterDataQueryConstraints(
  config: MasterCollectionConfig,
  search: DynamicMasterDataSearchOptions = {}
) {
  const queryText = String(search.query ?? "").trim()
  const orderField = queryText ? search.field || getLookupKeyField(config) : getLookupKeyField(config)
  const constraints: QueryConstraint[] = [orderBy(orderField || "__name__")]

  if (queryText) {
    constraints.push(startAt(queryText), endAt(`${queryText}\uf8ff`))
  }

  return constraints
}

export async function getDynamicMasterDataPage(
  config: MasterCollectionConfig,
  options: DynamicMasterDataPageOptions
): Promise<DynamicMasterDataPage> {
  const db = getFirestoreSafe()
  if (!db) {
    throw new Error(
      "Firebase is not configured. Please set NEXT_PUBLIC_FIREBASE_* environment variables."
    )
  }

  const pageSize = Math.max(1, options.pageSize)
  const collectionRef = collection(db, config.collectionName)
  const baseConstraints = getDynamicMasterDataQueryConstraints(config, options.search)
  const countQuery = query(collectionRef, ...baseConstraints)
  const pageConstraints = [...baseConstraints]

  if (options.direction === "next" && options.cursor) {
    pageConstraints.push(startAfter(options.cursor), limit(pageSize))
  } else if (options.direction === "previous" && options.cursor) {
    pageConstraints.push(endBefore(options.cursor), limitToLast(pageSize))
  } else if (options.direction === "last") {
    pageConstraints.push(limitToLast(pageSize))
  } else {
    pageConstraints.push(limit(pageSize))
  }

  const [countSnapshot, pageSnapshot] = await Promise.all([
    getCountFromServer(countQuery),
    getDocs(query(collectionRef, ...pageConstraints)),
  ])
  const documents = pageSnapshot.docs

  return {
    rows: documents.map(mapDynamicMasterDataSnapshot),
    totalCount: countSnapshot.data().count,
    firstCursor: documents[0] ?? null,
    lastCursor: documents[documents.length - 1] ?? null,
    hasPreviousPage:
      options.direction === "last" ||
      options.direction === "previous" ||
      (options.direction === "next" && Boolean(options.cursor)),
    hasNextPage:
      options.direction !== "last" && documents.length === pageSize,
  }
}

export async function getDynamicMasterDataByKeys(
  config: Pick<MasterCollectionConfig, "collectionName">,
  keys: string[]
): Promise<DynamicMasterDataRecord[]> {
  const db = getFirestoreSafe()
  if (!db) {
    throw new Error(
      "Firebase is not configured. Please set NEXT_PUBLIC_FIREBASE_* environment variables."
    )
  }

  const uniqueKeys = [...new Set(keys.map((key) => key.trim()).filter(Boolean))]
  const records = await Promise.all(
    uniqueKeys.map(async (key) => {
      const documentId = makeSafeDocumentId(key)
      if (!documentId) return null

      const snapshot = await getDoc(doc(db, config.collectionName, documentId))
      return snapshot.exists()
        ? ({
            id: snapshot.id,
            ...snapshot.data(),
          } as DynamicMasterDataRecord)
        : null
    })
  )

  return records.filter((record): record is DynamicMasterDataRecord => Boolean(record))
}

export function getLookupKeyField(config: MasterCollectionConfig) {
  return config.fields[0] ?? ""
}

function makeSuffixedDocumentId(baseDocumentId: string, suffix: number) {
  if (suffix <= 1) return baseDocumentId
  const suffixText = `${DUPLICATE_DOCUMENT_ID_SEPARATOR}${suffix}`
  return `${baseDocumentId.slice(0, 1400 - suffixText.length)}${suffixText}`
}

function getDocumentIdSuffix(id: string, baseDocumentId: string) {
  if (id === baseDocumentId) return 1
  const prefix = `${baseDocumentId}${DUPLICATE_DOCUMENT_ID_SEPARATOR}`
  if (!id.startsWith(prefix)) return Number.MAX_SAFE_INTEGER
  const suffix = Number(id.slice(prefix.length))
  return Number.isFinite(suffix) && suffix > 1 ? suffix : Number.MAX_SAFE_INTEGER
}

function sortByDocumentIdSuffix(records: DynamicMasterDataRecord[], baseDocumentId: string) {
  return [...records].sort((left, right) => {
    const leftId = String(left.id ?? "")
    const rightId = String(right.id ?? "")
    return getDocumentIdSuffix(leftId, baseDocumentId) - getDocumentIdSuffix(rightId, baseDocumentId)
  })
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function getDynamicMasterDataByBaseDocumentId(
  config: Pick<MasterCollectionConfig, "collectionName">,
  baseDocumentId: string
): Promise<DynamicMasterDataRecord[]> {
  const db = getFirestoreSafe()
  if (!db) {
    throw new Error(
      "Firebase is not configured. Please set NEXT_PUBLIC_FIREBASE_* environment variables."
    )
  }

  const normalizedBaseDocumentId = makeSafeDocumentId(baseDocumentId)
  if (!normalizedBaseDocumentId) return []

  const collectionRef = collection(db, config.collectionName)
  const [exactSnapshot, baseSnapshot] = await Promise.all([
    getDoc(doc(db, config.collectionName, normalizedBaseDocumentId)),
    getDocs(query(collectionRef, where("baseDocumentId", "==", normalizedBaseDocumentId))),
  ])
  const recordsById = new Map<string, DynamicMasterDataRecord>()

  if (exactSnapshot.exists()) {
    recordsById.set(exactSnapshot.id, {
      id: exactSnapshot.id,
      ...exactSnapshot.data(),
    } as DynamicMasterDataRecord)
  }

  baseSnapshot.docs.forEach((document) => {
    recordsById.set(document.id, {
      id: document.id,
      ...document.data(),
    } as DynamicMasterDataRecord)
  })

  return sortByDocumentIdSuffix([...recordsById.values()], normalizedBaseDocumentId)
}

async function getNextDynamicMasterDocumentId(
  config: Pick<MasterCollectionConfig, "collectionName">,
  baseDocumentId: string
) {
  const existingRecords = await getDynamicMasterDataByBaseDocumentId(config, baseDocumentId)
  const usedIds = new Set(existingRecords.map((record) => String(record.id ?? "")))

  if (!usedIds.has(baseDocumentId)) return baseDocumentId

  for (let suffix = 2; suffix < 100000; suffix += 1) {
    const candidateId = makeSuffixedDocumentId(baseDocumentId, suffix)
    if (!usedIds.has(candidateId)) return candidateId
  }

  throw new Error("Could not create a unique document ID.")
}

export async function getNextDynamicMasterDocumentIds(
  config: Pick<MasterCollectionConfig, "collectionName">,
  lookupKeys: string[],
  options: {
    batchSize?: number
    delayMs?: number
    onProgress?: (progress: { checked: number; total: number }) => void
  } = {}
) {
  const baseDocumentIds = lookupKeys.map((lookupKey) => makeSafeDocumentId(lookupKey))
  const uniqueBaseDocumentIds = [...new Set(baseDocumentIds.filter(Boolean))]
  const usedIdsByBase = new Map<string, Set<string>>()
  const batchSize = Math.max(
    1,
    Math.min(options.batchSize ?? DEFAULT_DOCUMENT_ID_LOOKUP_BATCH_SIZE, 100)
  )
  const delayMs = Math.max(0, options.delayMs ?? DEFAULT_DOCUMENT_ID_LOOKUP_DELAY_MS)
  let checked = 0

  for (let index = 0; index < uniqueBaseDocumentIds.length; index += batchSize) {
    const chunk = uniqueBaseDocumentIds.slice(index, index + batchSize)

    await Promise.all(
      chunk.map(async (baseDocumentId) => {
        const existingRecords = await getDynamicMasterDataByBaseDocumentId(config, baseDocumentId)
        usedIdsByBase.set(
          baseDocumentId,
          new Set(existingRecords.map((record) => String(record.id ?? "")))
        )
      })
    )

    checked += chunk.length
    options.onProgress?.({ checked, total: uniqueBaseDocumentIds.length })

    if (delayMs > 0 && checked < uniqueBaseDocumentIds.length) {
      await sleep(delayMs)
    }
  }

  return baseDocumentIds.map((baseDocumentId) => {
    if (!baseDocumentId) return ""

    const usedIds = usedIdsByBase.get(baseDocumentId) ?? new Set<string>()
    usedIdsByBase.set(baseDocumentId, usedIds)

    if (!usedIds.has(baseDocumentId)) {
      usedIds.add(baseDocumentId)
      return baseDocumentId
    }

    for (let suffix = 2; suffix < 100000; suffix += 1) {
      const candidateId = makeSuffixedDocumentId(baseDocumentId, suffix)
      if (!usedIds.has(candidateId)) {
        usedIds.add(candidateId)
        return candidateId
      }
    }

    throw new Error("Could not create a unique document ID.")
  })
}

export async function createDynamicMasterDataRecord(
  config: MasterCollectionConfig,
  record: DynamicMasterDataRecord,
  options: { documentId?: string } = {}
) {
  const lookupKeyField = getLookupKeyField(config)
  const lookupKey = String(record[lookupKeyField] ?? "").trim()
  if (!lookupKeyField || !lookupKey) {
    throw new Error("Lookup key is required.")
  }

  const service = createFirestoreCrudService<DynamicMasterDataRecord>(config.collectionName)
  const baseDocumentId = makeSafeDocumentId(lookupKey)
  const documentId = options.documentId
    ? makeSafeDocumentId(options.documentId)
    : await getNextDynamicMasterDocumentId(config, baseDocumentId)
  return service.create(
    {
      ...record,
      [lookupKeyField]: lookupKey,
      id: documentId,
      documentId,
      baseDocumentId,
    },
    documentId
  )
}

export async function createDynamicMasterDataRecords(
  config: MasterCollectionConfig,
  records: DynamicMasterDataRecord[],
  options: {
    documentIds?: string[]
    batchSize?: number
    delayMs?: number
    onProgress?: (progress: { imported: number; total: number }) => void
  } = {}
) {
  const db = getFirestoreSafe()
  if (!db) {
    throw new Error(
      "Firebase is not configured. Please set NEXT_PUBLIC_FIREBASE_* environment variables."
    )
  }

  const lookupKeyField = getLookupKeyField(config)
  if (!lookupKeyField) {
    throw new Error("Lookup key is required.")
  }

  const batchSize = Math.max(
    1,
    Math.min(options.batchSize ?? DEFAULT_BULK_IMPORT_BATCH_SIZE, 450)
  )
  const delayMs = Math.max(0, options.delayMs ?? DEFAULT_BULK_IMPORT_BATCH_DELAY_MS)
  let imported = 0

  for (let index = 0; index < records.length; index += batchSize) {
    const batch = writeBatch(db)
    const chunk = records.slice(index, index + batchSize)

    chunk.forEach((record, chunkIndex) => {
      const recordIndex = index + chunkIndex
      const lookupKey = String(record[lookupKeyField] ?? "").trim()
      if (!lookupKey) {
        throw new Error("Lookup key is required.")
      }

      const baseDocumentId = makeSafeDocumentId(lookupKey)
      const documentId = makeSafeDocumentId(options.documentIds?.[recordIndex] ?? baseDocumentId)
      const documentRef = doc(db, config.collectionName, documentId)
      const { id: _id, ...recordData } = record

      batch.set(
        documentRef,
        {
          ...recordData,
          [lookupKeyField]: lookupKey,
          documentId,
          baseDocumentId,
          createdAt: record.createdAt ?? serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      )
    })

    await batch.commit()
    imported += chunk.length
    options.onProgress?.({ imported, total: records.length })

    if (delayMs > 0 && imported < records.length) {
      await sleep(delayMs)
    }
  }

  return imported
}

export async function updateDynamicMasterDataRecord(
  config: MasterCollectionConfig,
  id: string,
  record: DynamicMasterDataRecord
) {
  const lookupKeyField = getLookupKeyField(config)
  const currentKey = String(record[lookupKeyField] ?? "").trim()
  if (!lookupKeyField || !currentKey) {
    throw new Error("Lookup key is required.")
  }
  const service = createFirestoreCrudService<DynamicMasterDataRecord>(config.collectionName)
  const existingRecord = await service.get(id)
  const baseDocumentId = makeSafeDocumentId(currentKey)
  const previousBaseDocumentId =
    String(existingRecord?.baseDocumentId ?? "").trim() ||
    makeSafeDocumentId(existingRecord?.[lookupKeyField] ?? id)

  if (baseDocumentId !== previousBaseDocumentId) {
    throw new Error("Lookup key cannot be changed. Create a new record instead.")
  }

  return service.update(id, {
    ...record,
    [lookupKeyField]: currentKey,
    documentId: id,
    baseDocumentId,
  })
}

export async function deleteDynamicMasterDataRecord(
  config: MasterCollectionConfig,
  id: string
) {
  const service = createFirestoreCrudService<DynamicMasterDataRecord>(config.collectionName)
  return service.delete(id)
}

export async function deleteAllDynamicMasterDataRecords(config: MasterCollectionConfig) {
  const db = getFirestoreSafe()
  if (!db) {
    throw new Error(
      "Firebase is not configured. Please set NEXT_PUBLIC_FIREBASE_* environment variables."
    )
  }

  const snapshot = await getDocs(collection(db, config.collectionName))
  const documents = snapshot.docs
  for (let index = 0; index < documents.length; index += 450) {
    const batch = writeBatch(db)
    documents.slice(index, index + 450).forEach((document) => {
      batch.delete(document.ref)
    })
    await batch.commit()
  }

  return documents.length
}

export async function applyDynamicMasterFieldChanges(
  config: MasterCollectionConfig,
  previousFields: string[],
  nextFields: string[]
) {
  const db = getFirestoreSafe()
  if (!db) {
    throw new Error(
      "Firebase is not configured. Please set NEXT_PUBLIC_FIREBASE_* environment variables."
    )
  }

  const deletedFields = previousFields.filter((field) => !nextFields.includes(field))
  const renamedFields = previousFields
    .map((field, index) => ({ from: field, to: nextFields[index] }))
    .filter(({ from, to }) => {
      return Boolean(to) && from !== to && !nextFields.includes(from) && !previousFields.includes(to)
    })

  if (!deletedFields.length && !renamedFields.length) return

  const snapshot = await getDocs(collection(db, config.collectionName))
  const documents = snapshot.docs

  for (let index = 0; index < documents.length; index += 450) {
    const batch = writeBatch(db)
    documents.slice(index, index + 450).forEach((document) => {
      const data = document.data() as Record<string, unknown>
      const patch: DocumentData = {}

      renamedFields.forEach(({ from, to }) => {
        if (!to) return
        if (Object.prototype.hasOwnProperty.call(data, from)) {
          patch[to] = data[from]
        }
        patch[from] = deleteField()
      })

      deletedFields.forEach((field) => {
        patch[field] = deleteField()
      })

      batch.update(document.ref, patch)
    })
    await batch.commit()
  }
}

const cusCodeCrud = createFirestoreCrudService<CusCodeListItem>("CusCodeList")
const itemCodeCrud = createFirestoreCrudService<ItemCodeListItem>("ItemCodeList")
const unitPriceCrud = createFirestoreCrudService<UnitPriceListItem>("UnitPriceList")
const picWhCrud = createFirestoreCrudService<PICWHCodeListItem>("PIC.WH.CodeList")
const unitCodeCrud = createFirestoreCrudService<UnitCodeListItem>("UnitCodeList")

export async function createCusCodeList(item: CusCodeListItem): Promise<CusCodeListItem> {
  const normalizedId = makeSafeDocumentId(item.CusCode)
  return cusCodeCrud.create({ ...item, CusCode: item.CusCode.trim() }, normalizedId)
}

export async function updateCusCodeList(item: CusCodeListItem): Promise<CusCodeListItem> {
  if (!item.id) throw new Error("CusCodeList item ID is missing.")
  await cusCodeCrud.update(item.id, {
    CusCode: item.CusCode.trim(),
    CusNameEng: item.CusNameEng?.trim(),
    CusNameJP: item.CusNameJP?.trim(),
    CusAddress: item.CusAddress?.trim(),
  })
  return item
}

export async function deleteCusCodeList(itemId: string): Promise<void> {
  await cusCodeCrud.delete(itemId)
}

export async function createItemCodeList(item: ItemCodeListItem): Promise<ItemCodeListItem> {
  const generatedId = makeSafeDocumentId(`${item.IzuyoshiJPCode}-${Date.now()}`)
  return itemCodeCrud.create({ ...item, IzuyoshiJPCode: item.IzuyoshiJPCode.trim() }, generatedId)
}

export async function updateItemCodeList(item: ItemCodeListItem): Promise<ItemCodeListItem> {
  if (!item.id) throw new Error("ItemCodeList item ID is missing.")
  await itemCodeCrud.update(item.id, {
    MAVCode: item.MAVCode?.trim(),
    MHBCode: item.MHBCode?.trim(),
    IzuyoshiJPCode: item.IzuyoshiJPCode.trim(),
    IzuyoshiVNCode: item.IzuyoshiVNCode?.trim(),
    Description: item.Description?.trim(),
  })
  return item
}

export async function deleteItemCodeList(itemId: string): Promise<void> {
  await itemCodeCrud.delete(itemId)
}

export async function createUnitPriceList(item: UnitPriceListItem): Promise<UnitPriceListItem> {
  const normalizedId = makeSafeDocumentId(item.IzuyoshiJPCode)
  return unitPriceCrud.create({ ...item, IzuyoshiJPCode: item.IzuyoshiJPCode.trim() }, normalizedId)
}

export async function updateUnitPriceList(item: UnitPriceListItem): Promise<UnitPriceListItem> {
  if (!item.id) throw new Error("UnitPriceList item ID is missing.")
  await unitPriceCrud.update(item.id, {
    IzuyoshiJPCode: item.IzuyoshiJPCode.trim(),
    UnitPrice: item.UnitPrice?.trim(),
  })
  return item
}

export async function deleteUnitPriceList(itemId: string): Promise<void> {
  await unitPriceCrud.delete(itemId)
}

export async function createPICWHCodeList(item: PICWHCodeListItem): Promise<PICWHCodeListItem> {
  const normalizedId = makeSafeDocumentId(item.PICCode)
  return picWhCrud.create({ ...item, PICCode: item.PICCode.trim() }, normalizedId)
}

export async function updatePICWHCodeList(item: PICWHCodeListItem): Promise<PICWHCodeListItem> {
  if (!item.id) throw new Error("PIC.WH.CodeList item ID is missing.")
  await picWhCrud.update(item.id, {
    PICCode: item.PICCode.trim(),
    WarehouseCode: item.WarehouseCode?.trim(),
    DetailWarehouseCode: item.DetailWarehouseCode?.trim(),
  })
  return item
}

export async function deletePICWHCodeList(itemId: string): Promise<void> {
  await picWhCrud.delete(itemId)
}

export async function createUnitCodeList(item: UnitCodeListItem): Promise<UnitCodeListItem> {
  const normalizedId = makeSafeDocumentId(item.OrderUnit)
  return unitCodeCrud.create({ ...item, OrderUnit: item.OrderUnit.trim() }, normalizedId)
}

export async function updateUnitCodeList(item: UnitCodeListItem): Promise<UnitCodeListItem> {
  if (!item.id) throw new Error("UnitCodeList item ID is missing.")
  await unitCodeCrud.update(item.id, {
    OrderUnit: item.OrderUnit.trim(),
    CsvCode: item.CsvCode?.trim(),
  })
  return item
}

export async function deleteUnitCodeList(itemId: string): Promise<void> {
  await unitCodeCrud.delete(itemId)
}
