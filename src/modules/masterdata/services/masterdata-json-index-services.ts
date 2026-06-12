import type { MasterCollectionConfig } from "@/types/firestore-models"
import type { DynamicMasterDataRecord, DynamicMasterDataSearchCondition } from "./masterdata-services"

export type MasterDataChangeLogOperation = "create" | "update" | "delete"

export interface MasterDataChangeLogEntry {
  id?: string
  collectionName: string
  documentId: string
  baseDocumentId: string
  lookupKey: string
  operation: MasterDataChangeLogOperation
  record?: DynamicMasterDataRecord
  changedAt?: Date
  version?: number
  actorId?: string
}

export interface MasterDataIndexManifest {
  version: number
  updatedAt: string
  collections: Record<
    string,
    {
      url: string
      recordCount: number
      version: number
      updatedAt: string
    }
  >
}

export interface MasterDataCollectionIndex {
  collectionName: string
  version: number
  updatedAt: string
  lookupKeyField: string
  fields: string[]
  records: DynamicMasterDataRecord[]
}

export type MasterDataIndexStatus =
  | { available: true; manifest: MasterDataIndexManifest }
  | { available: false; reason: "manifest_load_failed" | "manifest_not_found" }

interface CollectionCache {
  manifest: MasterDataIndexManifest
  collectionIndex: MasterDataCollectionIndex
  lookupMap: Map<string, DynamicMasterDataRecord>
  loadedAt: number
}

const DEFAULT_JSON_BASE_URL = "/masterdata-index"
const DEFAULT_MANIFEST_NAME = "manifest.json"
const DEFAULT_CACHE_TTL_MS = 30 * 60 * 1000
const MANIFEST_MAX_AGE_MS = 5 * 60 * 1000

const collectionCaches = new Map<string, CollectionCache>()
let manifestCache: {
  status: MasterDataIndexStatus
  loadedAt: number
} | null = null

function getSafeCollectionFileName(collectionName: string) {
  return collectionName.replace(/[/\\.]/g, "_")
}

function getCollectionIndexUrls(
  collectionName: string,
  baseUrl: string,
  manifest?: MasterDataIndexManifest
) {
  const localUrl = `${baseUrl}/${getSafeCollectionFileName(collectionName)}.json`
  const manifestUrl = manifest?.collections?.[collectionName]?.url
  if (!manifestUrl || manifestUrl === localUrl) return [localUrl]

  if (baseUrl === DEFAULT_JSON_BASE_URL || baseUrl.startsWith("/")) {
    return [localUrl, manifestUrl]
  }

  return [manifestUrl, localUrl]
}

function getJsonBaseUrl() {
  if (typeof window !== "undefined") {
    return (window as Window & { __MASTERDATA_INDEX_BASE_URL__?: string }).__MASTERDATA_INDEX_BASE_URL__ ?? DEFAULT_JSON_BASE_URL
  }
  return process.env.NEXT_PUBLIC_MASTERDATA_INDEX_BASE_URL ?? DEFAULT_JSON_BASE_URL
}

function getCollectionCacheTtl(collectionName: string) {
  if (typeof window !== "undefined") {
    return (window as Window & { __MASTERDATA_INDEX_TTL_MS__?: number }).__MASTERDATA_INDEX_TTL_MS__ ?? DEFAULT_CACHE_TTL_MS
  }
  return DEFAULT_CACHE_TTL_MS
}

export async function loadMasterDataIndexManifest(): Promise<MasterDataIndexStatus> {
  const now = Date.now()
  if (
    manifestCache &&
    now - manifestCache.loadedAt < MANIFEST_MAX_AGE_MS
  ) {
    return manifestCache.status
  }

  try {
    const baseUrl = getJsonBaseUrl()
    const url = `${baseUrl}/${DEFAULT_MANIFEST_NAME}`
    const response = await fetch(url)
    if (!response.ok) {
      const status: MasterDataIndexStatus = { available: false, reason: "manifest_not_found" }
      manifestCache = { status, loadedAt: now }
      return status
    }

    const manifest = (await response.json()) as MasterDataIndexManifest
    const status: MasterDataIndexStatus = { available: true, manifest }
    manifestCache = { status, loadedAt: now }
    return status
  } catch {
    const status: MasterDataIndexStatus = { available: false, reason: "manifest_load_failed" }
    manifestCache = { status, loadedAt: now }
    return status
  }
}

export async function loadMasterDataCollectionIndex(
  collectionName: string,
  manifest?: MasterDataIndexManifest
): Promise<MasterDataCollectionIndex | null> {
  const baseUrl = getJsonBaseUrl()
  const urls = getCollectionIndexUrls(collectionName, baseUrl, manifest)

  for (const url of urls) {
    try {
      const response = await fetch(url)
      if (!response.ok) continue
      const index = (await response.json()) as MasterDataCollectionIndex
      return index
    } catch {
      continue
    }
  }

  return null
}

function buildLookupMap(index: MasterDataCollectionIndex): Map<string, DynamicMasterDataRecord> {
  const map = new Map<string, DynamicMasterDataRecord>()
  const keyField = index.lookupKeyField
  for (const record of index.records) {
    const key = String(record[keyField] ?? record.baseDocumentId ?? record.documentId ?? record.id ?? "")
    if (key) map.set(key, record)
  }
  return map
}

export async function ensureMasterDataCollectionIndex(
  collectionName: string
): Promise<{ index: MasterDataCollectionIndex; lookupMap: Map<string, DynamicMasterDataRecord> } | null> {
  const manifestStatus = await loadMasterDataIndexManifest()
  if (!manifestStatus.available) return null

  const cached = collectionCaches.get(collectionName)
  const ttl = getCollectionCacheTtl(collectionName)
  if (cached && Date.now() - cached.loadedAt < ttl) {
    return { index: cached.collectionIndex, lookupMap: cached.lookupMap }
  }

  const index = await loadMasterDataCollectionIndex(collectionName, manifestStatus.manifest)
  if (!index) return null

  const lookupMap = buildLookupMap(index)
  collectionCaches.set(collectionName, {
    manifest: manifestStatus.manifest,
    collectionIndex: index,
    lookupMap,
    loadedAt: Date.now(),
  })

  return { index, lookupMap }
}

export function getMasterDataRecordFromIndex(
  collectionName: string,
  lookupKey: string
): DynamicMasterDataRecord | null {
  const cached = collectionCaches.get(collectionName)
  if (!cached) return null
  return cached.lookupMap.get(lookupKey) ?? null
}

export function getMasterDataRecordsFromIndex(
  collectionName: string,
  lookupKeys: string[]
): Map<string, DynamicMasterDataRecord> {
  const cached = collectionCaches.get(collectionName)
  if (!cached) return new Map()

  const result = new Map<string, DynamicMasterDataRecord>()
  for (const key of lookupKeys) {
    const record = cached.lookupMap.get(key)
    if (record) result.set(key, record)
  }
  return result
}

export function getMasterDataIndexStatus(collectionName: string): boolean {
  const cached = collectionCaches.get(collectionName)
  if (!cached) return false
  const ttl = getCollectionCacheTtl(collectionName)
  return Date.now() - cached.loadedAt < ttl
}

function matchesSearch(
  record: DynamicMasterDataRecord,
  conditions: DynamicMasterDataSearchCondition[]
): boolean {
  return conditions.every((condition) => {
    const fieldValue = String(record[condition.field] ?? "").toLowerCase()
    const searchValue = String(condition.value).toLowerCase().trim()
    if (!searchValue) return true

    if (condition.operator === "equals") {
      return fieldValue === searchValue
    }
    if (condition.operator === "prefix") {
      return fieldValue.startsWith(searchValue)
    }
    return fieldValue.includes(searchValue)
  })
}

export type SearchResult = {
  rows: DynamicMasterDataRecord[]
  totalCount: number
}

export type SearchOptions = {
  conditions: DynamicMasterDataSearchCondition[]
  pageSize: number
  pageIndex: number
}

export type SearchPageResult = {
  rows: DynamicMasterDataRecord[]
  totalCount: number
  pageIndex: number
  pageSize: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}

export function searchMasterDataIndexPaged(
  collectionName: string,
  options: SearchOptions
): SearchPageResult {
  const cached = collectionCaches.get(collectionName)
  if (!cached) {
    return { rows: [], totalCount: 0, pageIndex: 0, pageSize: options.pageSize, hasPreviousPage: false, hasNextPage: false }
  }

  const allRows = cached.collectionIndex.records.filter((record) =>
    matchesSearch(record, options.conditions)
  )

  const start = options.pageIndex * options.pageSize
  const pageRows = allRows.slice(start, start + options.pageSize)

  return {
    rows: pageRows,
    totalCount: allRows.length,
    pageIndex: options.pageIndex,
    pageSize: options.pageSize,
    hasPreviousPage: options.pageIndex > 0,
    hasNextPage: start + options.pageSize < allRows.length,
  }
}

export function searchMasterDataIndex(
  collectionName: string,
  conditions: DynamicMasterDataSearchCondition[]
): SearchResult {
  const cached = collectionCaches.get(collectionName)
  if (!cached) {
    return { rows: [], totalCount: 0 }
  }

  const rows = cached.collectionIndex.records.filter((record) =>
    matchesSearch(record, conditions)
  )

  return {
    rows,
    totalCount: rows.length,
  }
}

export function patchMasterDataIndexRecord(
  collectionName: string,
  record: DynamicMasterDataRecord,
  lookupKeyField: string
): boolean {
  const cached = collectionCaches.get(collectionName)
  if (!cached) return false

  const lookupKey = String(record[lookupKeyField] ?? record.baseDocumentId ?? record.documentId ?? record.id ?? "")
  if (!lookupKey) return false

  const existing = cached.lookupMap.get(lookupKey)
  if (existing) {
    Object.assign(existing, record)
  } else {
    cached.lookupMap.set(lookupKey, record)
    cached.collectionIndex.records.push(record)
  }

  return true
}

export function removeMasterDataIndexRecord(
  collectionName: string,
  documentIdOrLookupKey: string
): boolean {
  const cached = collectionCaches.get(collectionName)
  if (!cached) return false

  const keyField = cached.collectionIndex.lookupKeyField
  const record = cached.lookupMap.get(documentIdOrLookupKey)
  if (record) {
    const idx = cached.collectionIndex.records.indexOf(record)
    if (idx >= 0) cached.collectionIndex.records.splice(idx, 1)
    cached.lookupMap.delete(documentIdOrLookupKey)
    return true
  }

  const byId = cached.collectionIndex.records.findIndex(
    (r) => r.id === documentIdOrLookupKey || r.documentId === documentIdOrLookupKey
  )
  if (byId >= 0) {
    const removed = cached.collectionIndex.records.splice(byId, 1)[0]
    const lookupKey = String(removed[keyField] ?? removed.baseDocumentId ?? removed.documentId ?? removed.id ?? "")
    if (lookupKey) cached.lookupMap.delete(lookupKey)
    return true
  }

  return false
}

export function applyMasterDataChangeLogToIndex(
  collectionName: string,
  change: MasterDataChangeLogEntry,
  lookupKeyField: string
): void {
  if (change.operation === "delete") {
    removeMasterDataIndexRecord(collectionName, change.documentId)
    removeMasterDataIndexRecord(collectionName, change.lookupKey)
  } else if (change.record) {
    patchMasterDataIndexRecord(collectionName, change.record, lookupKeyField)
  }
}

export function clearMasterDataJsonIndexCache(collectionName?: string): void {
  if (collectionName) {
    collectionCaches.delete(collectionName)
  } else {
    collectionCaches.clear()
    manifestCache = null
  }
}

export function clearMasterDataManifestCache(): void {
  manifestCache = null
}

export function getMasterDataCollectionCacheInfo(collectionName: string) {
  const cached = collectionCaches.get(collectionName)
  if (!cached) return null
  return {
    recordCount: cached.collectionIndex.records.length,
    loadedAt: cached.loadedAt,
    version: cached.collectionIndex.version,
    updatedAt: cached.collectionIndex.updatedAt,
  }
}
