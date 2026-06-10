"use client"

import type {
  CsvColumnLetter,
  ImportMappingConfig,
  ImportMappingDataFormat,
  ImportMappingFormatCondition,
  ImportMappingDataSource,
  ImportMappingEntry,
  ImportMappingOrderFileMode,
  MissingMasterDataType,
} from "@/types/firestore-models"

export type {
  CsvColumnLetter,
  ImportMappingConfig,
  ImportMappingDataFormat,
  ImportMappingFormatCondition,
  ImportMappingDataSource,
  ImportMappingEntry,
  ImportMappingOrderFileMode,
  MissingMasterDataType,
}

export const CSV_COLUMNS = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z",
  "AA",
  "AB",
  "AC",
  "AD",
  "AE",
  "AF",
  "AG",
  "AH",
  "AI",
  "AJ",
  "AK",
  "AL",
  "AM",
  "AN",
  "AO",
  "AP",
  "AQ",
  "AR",
] as const satisfies readonly string[]

export const MASTER_COLLECTION_FIELDS: Record<MissingMasterDataType, string[]> = {
  CusCodeList: ["CusCode", "CusNameEng", "CusNameJP", "CusAddress"],
  ItemCodeList: ["MAVCode", "MHBCode", "IzuyoshiJPCode", "IzuyoshiVNCode", "Description"],
  ItemCodeListMAV: ["MAVCode", "MHBCode", "IzuyoshiJPCode", "IzuyoshiVNCode", "Description"],
  ItemCodeListMHB: ["MHBCode", "MAVCode", "IzuyoshiJPCode", "IzuyoshiVNCode", "Description"],
  UnitPriceList: ["IzuyoshiJPCode", "UnitPrice"],
  "PIC.WH.CodeList": ["PICCode", "WarehouseCode", "DetailWarehouseCode"],
  UnitCodeList: ["OrderUnit", "CsvCode"],
}

export const MASTER_COLLECTIONS = Object.keys(
  MASTER_COLLECTION_FIELDS
) as MissingMasterDataType[]

export function makeMappingId(prefix = "mapping") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function normalizeExcelColumn(value: string) {
  return value.trim().toUpperCase()
}

export function isExcelColumn(value: string) {
  return /^[A-Z]+$/.test(normalizeExcelColumn(value))
}

export function isCsvColumn(value: string): value is CsvColumnLetter {
  return isExcelColumn(value)
}

export function parseCsvColumns(value: string): CsvColumnLetter[] {
  return value
    .split(/[,\s、]+/)
    .map(normalizeExcelColumn)
    .filter(Boolean)
    .filter(isCsvColumn)
}

export function getCsvColumnIndex(column: string) {
  const normalized = normalizeExcelColumn(column)
  if (!isExcelColumn(normalized)) return Number.MAX_SAFE_INTEGER

  let index = 0
  for (const char of normalized) {
    index = index * 26 + (char.charCodeAt(0) - 64)
  }

  return index - 1
}

export function sortCsvColumns(columns: CsvColumnLetter[]) {
  return [...columns].sort((a, b) => getCsvColumnIndex(a) - getCsvColumnIndex(b))
}

export function sortMappingEntries(entries: ImportMappingEntry[]) {
  return [...entries].sort((a, b) => {
    const left = a.targetColumns[0] ?? "AR"
    const right = b.targetColumns[0] ?? "AR"
    return getCsvColumnIndex(left) - getCsvColumnIndex(right)
  })
}

export function createEmptyMappingEntry(
  seed: Partial<ImportMappingEntry> = {}
): ImportMappingEntry {
  return {
    id: makeMappingId("entry"),
    targetColumns: ["A"],
    targetColumnName: "",
    dataSource: "orderFile",
    orderFileMode: "fixedCell",
    sourceCell: "",
    sourceColumn: "",
    startRow: 17,
    endDetectionColumn: "R",
    sourceDataKind: "number",
    sourcePosition: "",
    sourceFormula: "",
    fixedValue: "",
    formula: "",
    lookupCsvColumn: "A",
    lookupCollection: "CusCodeList",
    lookupKeyField: "CusCode",
    lookupValueField: "CusNameJP",
    lookupTargetColumn: "A",
    format: "original",
    formatConditions: ["original"],
    includeInCsvDownload: true,
    scope: "sheet",
    note: "",
    ...seed,
  }
}
