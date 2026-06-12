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

function joinIndexFileUrl(baseUrl: string, fileName: string) {
  const normalizedBase = baseUrl.replace(/\/+$/, "")
  if (!normalizedBase) return `/${fileName}`

  try {
    const url = new URL(normalizedBase)
    const objectPathMarker = "/o/"
    const markerIndex = url.pathname.indexOf(objectPathMarker)
    if (url.hostname.includes("firebasestorage.googleapis.com") && markerIndex >= 0) {
      const prefixPath = url.pathname.slice(0, markerIndex + objectPathMarker.length)
      const rawObjectPrefix = url.pathname.slice(markerIndex + objectPathMarker.length)
      const objectPrefix = decodeURIComponent(rawObjectPrefix).replace(/\/+$/, "")
      const objectName = objectPrefix ? `${objectPrefix}/${fileName}` : fileName
      url.pathname = `${prefixPath}${encodeURIComponent(objectName)}`
      url.searchParams.set("alt", "media")
      return url.toString()
    }
  } catch {
    // Relative URL; use the normal path join below.
  }

  return `${normalizedBase}/${fileName}`
}

function getCollectionIndexUrls(
  collectionName: string,
  baseUrl: string,
  manifest?: MasterDataIndexManifest
) {
  const localUrl = joinIndexFileUrl(baseUrl, `${getSafeCollectionFileName(collectionName)}.json`)
  const manifestUrl = manifest?.collections?.[collectionName]?.url
  if (!manifestUrl || manifestUrl === localUrl) return [localUrl]

  if (baseUrl === DEFAULT_JSON_BASE_URL || baseUrl.startsWith("/")) {
    return [localUrl, manifestUrl]
  }

  return [manifestUrl, localUrl]
}

function getJsonBaseUrl() {
  const envBaseUrl = process.env.NEXT_PUBLIC_MASTERDATA_INDEX_BASE_URL
  if (typeof window !== "undefined") {
    return (
      (window as Window & { __MASTERDATA_INDEX_BASE_URL__?: string }).__MASTERDATA_INDEX_BASE_URL__ ??
      envBaseUrl ??
      DEFAULT_JSON_BASE_URL
    )
  }
  return envBaseUrl ?? DEFAULT_JSON_BASE_URL
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
    const url = joinIndexFileUrl(baseUrl, DEFAULT_MANIFEST_NAME)
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

function normalizeSearchText(value: unknown) {
  return String(value ?? "").normalize("NFKC").toLowerCase().trim()
}

function normalizeFieldName(value: unknown) {
  return normalizeSearchText(value).replace(/\s+/g, "")
}

function getFieldAliasTokens(field: string): string[] {
  const normalized = normalizeFieldName(field)
  const aliases = [normalized]

  if (normalized.includes("mav") || normalized.includes("工場資材")) {
    aliases.push("mav", "工場資材")
  }
  if (normalized.includes("mhb")) {
    aliases.push("mhb")
  }
  if (
    normalized.includes("izuyoshijp") ||
    normalized.includes("日本") ||
    normalized.includes("伊豆義")
  ) {
    aliases.push("izuyoshijp", "日本", "伊豆義")
  }
  if (
    normalized.includes("izuyoshivn") ||
    normalized.includes("ベトナム") ||
    normalized.includes("vietnam")
  ) {
    aliases.push("izuyoshivn", "ベトナム", "vietnam")
  }

  return [...new Set(aliases.filter(Boolean))]
}

function fieldLooksLikeAlias(recordField: string, aliasTokens: string[]) {
  const normalizedRecordField = normalizeFieldName(recordField)
  return aliasTokens.some((token) => normalizedRecordField.includes(token))
}

function getRecordSearchValues(
  record: DynamicMasterDataRecord,
  field: string,
  lookupKeyField: string
): string[] {
  const values: string[] = []
  const direct = record[field]
  if (direct !== undefined && direct !== null) values.push(String(direct))

  const wantedField = normalizeFieldName(field)
  const lookupField = normalizeFieldName(lookupKeyField)
  const aliasTokens = getFieldAliasTokens(field)
  Object.entries(record).forEach(([recordField, value]) => {
    if (value === undefined || value === null) return
    const currentField = normalizeFieldName(recordField)
    if (
      currentField === wantedField ||
      (wantedField === lookupField && currentField === lookupField) ||
      fieldLooksLikeAlias(recordField, aliasTokens)
    ) {
      values.push(String(value))
    }
  })

  if (wantedField === lookupField || fieldLooksLikeAlias(lookupKeyField, aliasTokens)) {
    values.push(String(record.id ?? ""))
    values.push(String(record.documentId ?? ""))
    values.push(String(record.baseDocumentId ?? ""))
  }

  if (!values.length) {
    Object.values(record).forEach((value) => {
      if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
      ) {
        values.push(String(value))
      }
    })
  }

  return [...new Set(values)]
}

function matchesSearch(
  record: DynamicMasterDataRecord,
  conditions: DynamicMasterDataSearchCondition[],
  lookupKeyField: string
): boolean {
  return conditions.every((condition) => {
    const fieldValues = getRecordSearchValues(record, condition.field, lookupKeyField)
    const searchValue = normalizeSearchText(condition.value)
    if (!searchValue) return true

    if (condition.operator === "equals") {
      return fieldValues.some((value) => normalizeSearchText(value) === searchValue)
    }
    if (condition.operator === "prefix") {
      return fieldValues.some((value) => normalizeSearchText(value).startsWith(searchValue))
    }
    return fieldValues.some((value) => normalizeSearchText(value).includes(searchValue))
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
    matchesSearch(record, options.conditions, cached.collectionIndex.lookupKeyField)
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
    matchesSearch(record, conditions, cached.collectionIndex.lookupKeyField)
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
