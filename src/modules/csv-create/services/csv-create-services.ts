"use client"

import * as XLSX from "xlsx"

import {
  createCusCodeList,
  createItemCodeList,
  createPICWHCodeList,
  createUnitCodeList,
  createUnitPriceList,
  getDynamicMasterDataByKeys,
  getLookupKeyField,
  type CusCodeListItem,
  type ItemCodeListItem,
  type PICWHCodeListItem,
  type UnitCodeListItem,
  type UnitPriceListItem,
} from "@/modules/masterdata/services/masterdata-services"
import {
  masterCollectionConfigRepository,
} from "@/modules/masterdata/services/master-collection-config-services"
import {
  ensureMasterDataCollectionIndex,
  getMasterDataRecordsFromIndex,
  applyMasterDataChangeLogToIndex,
  clearMasterDataJsonIndexCache,
  type MasterDataCollectionIndex,
} from "@/modules/masterdata/services/masterdata-json-index-services"
import { listMasterDataChangeLogs } from "@/modules/masterdata/services/masterdata-change-log-services"
import type {
  CsvColumnLetter,
  ImportMappingConfig,
  ImportMappingEntry,
  ImportMappingFormatCondition,
  MasterCollectionConfig,
  MissingMasterDataType,
} from "@/types/firestore-models"
import {
  getCsvColumnIndex,
  isCsvColumn,
  normalizeExcelColumn,
  sortMappingEntries,
} from "@/modules/import-mapping/services/import-mapping-types"

import type {
  BuildCsvRowsOptions,
  BuildCsvRowsResult,
  CsvCellSource,
  CsvIssueType,
  CsvManualInput,
  CsvValidationIssue,
  CsvWorkingCell,
  CsvWorkingRow,
  ExcelImportResult,
  ExcelSourceRow,
  MasterDataLookupStore,
} from "./csv-create-types"
import { getEntryColumns, getIssueId } from "./csv-create-types"

type SheetCellMap = Record<string, unknown>
type RowDraft = Partial<Record<CsvColumnLetter, CsvWorkingCell>>
type MasterLookupCacheEntry = {
  record: Record<string, unknown> | null
  cachedAt: number
}

const MASTER_LOOKUP_CACHE_TTL_MS = 10 * 60 * 1000
const MASTER_CONFIG_CACHE_TTL_MS = 10 * 60 * 1000
const masterLookupRecordCache = new Map<string, MasterLookupCacheEntry>()
let masterConfigsByCollectionCache: {
  cachedAt: number
  configs: Map<string, MasterCollectionConfig>
} | null = null

export function clearCsvMasterDataLookupCache(collection?: string, sourceValue?: string) {
  if (collection && sourceValue) {
    masterLookupRecordCache.delete(getLookupRequestKey(collection, sourceValue))
    return
  }
  masterLookupRecordCache.clear()
  masterConfigsByCollectionCache = null
}

const MASTER_DATA_LABELS: Record<MissingMasterDataType, string> = {
  CusCodeList: "得意先マスタ",
  ItemCodeList: "品目マスタ",
  ItemCodeListMAV: "品目マスタMAV",
  ItemCodeListMHB: "品目マスタMHB",
  UnitPriceList: "単価マスタ",
  "PIC.WH.CodeList": "担当者・倉庫マスタ",
  UnitCodeList: "単位マスタ",
}

export const MASTER_DATA_FIELDS: Record<MissingMasterDataType, string[]> = {
  CusCodeList: ["CusCode", "CusNameEng", "CusNameJP", "CusAddress"],
  ItemCodeList: ["MAVCode", "MHBCode", "IzuyoshiJPCode", "IzuyoshiVNCode", "Description"],
  UnitPriceList: ["IzuyoshiJPCode", "UnitPrice"],
  "PIC.WH.CodeList": ["PICCode", "WarehouseCode", "DetailWarehouseCode"],
  UnitCodeList: ["OrderUnit", "CsvCode"],
}

function normalizeText(value: unknown) {
  return String(value ?? "").trim()
}

function replaceNewlines(value: unknown) {
  return String(value ?? "").replace(/\r\n|\r|\n/g, " ")
}

function makeIssue(input: Omit<CsvValidationIssue, "id" | "severity"> & {
  severity?: CsvValidationIssue["severity"]
}): CsvValidationIssue {
  return {
    id: getIssueId(input.issueType),
    severity: input.severity ?? "warning",
    ...input,
  }
}

function getMasterDataLabel(collection: MissingMasterDataType | undefined) {
  if (!collection) return "マスタデータ"
  return MASTER_DATA_LABELS[collection] ?? collection
}

function columnNameToIndex(column: string) {
  let index = 0
  for (const char of normalizeExcelColumn(column)) {
    index = index * 26 + char.charCodeAt(0) - 64
  }
  return index - 1
}

function getSheetCell(sheet: XLSX.WorkSheet, address: string) {
  return sheet[normalizeExcelColumn(address)]?.v
}

function getVisibleSheetNames(workbook: XLSX.WorkBook) {
  const sheetMeta = workbook.Workbook?.Sheets ?? []
  return workbook.SheetNames.filter((sheetName, index) => !sheetMeta[index]?.Hidden)
}

function getSheetValues(sheet: XLSX.WorkSheet) {
  const values: SheetCellMap = {}
  const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1:A1")

  for (let row = range.s.r; row <= range.e.r; row += 1) {
    for (let column = range.s.c; column <= range.e.c; column += 1) {
      const address = XLSX.utils.encode_cell({ r: row, c: column })
      const value = sheet[address]?.v
      if (value !== undefined && value !== null) values[address] = value
    }
  }

  return values
}

function getDetailValue(row: ExcelSourceRow | undefined, column?: string) {
  if (!row || !column) return undefined
  return row.valuesByColumn[normalizeExcelColumn(column)]
}

function getFixedCellValue(excel: ExcelImportResult, address?: string) {
  if (!address) return undefined
  const normalized = normalizeExcelColumn(address)
  for (const sheetValues of Object.values(excel.sheetValues)) {
    const value = sheetValues[normalized]
    if (value !== undefined && value !== null) return value
  }
  return undefined
}

function createCell(
  entry: ImportMappingEntry,
  column: CsvColumnLetter,
  value: unknown,
  source: CsvCellSource,
  issueTypes: CsvIssueType[] = []
): CsvWorkingCell {
  return {
    column,
    columnName: entry.targetColumnName || column,
    value: replaceNewlines(value),
    rawValue: value,
    source,
    mappingEntryId: entry.id,
    issueTypes,
  }
}

function getFormatConditions(entry: ImportMappingEntry): ImportMappingFormatCondition[] {
  return entry.formatConditions?.length ? entry.formatConditions : [entry.format ?? "original"]
}

function excelSerialToDate(value: number) {
  const epoch = new Date(Date.UTC(1899, 11, 30))
  epoch.setUTCDate(epoch.getUTCDate() + value)
  return epoch
}

function parseDateValue(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value
  if (typeof value === "number" && Number.isFinite(value)) return excelSerialToDate(value)

  const text = String(value ?? "").trim()
  if (!text) return null
  if (/^\d{8}$/.test(text)) {
    const year = Number(text.slice(0, 4))
    const month = Number(text.slice(4, 6)) - 1
    const day = Number(text.slice(6, 8))
    const date = new Date(year, month, day)
    return Number.isNaN(date.getTime()) ? null : date
  }

  const date = new Date(text)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatDateYyyyMmDd(value: unknown) {
  const date = parseDateValue(value)
  if (!date) return null
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}${month}${day}`
}

function parseNumberValue(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  const normalized = String(value ?? "").replace(/,/g, "").trim()
  if (!normalized) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function isCharacterLimitCondition(condition: ImportMappingFormatCondition) {
  return condition === "left32" || condition === "left25"
}

function applyOneFormat(value: unknown, condition: ImportMappingFormatCondition) {
  const text = replaceNewlines(value)

  if (condition === "original") return { value: text }
  if (condition === "left32") return { value: text.slice(0, 32) }
  if (condition === "left25") return { value: text.slice(0, 25) }
  if (condition === "alphanumericOnly") return { value: text.replace(/[^A-Za-z0-9]/g, "") }

  if (condition === "number" || condition === "numberIntegerTruncate") {
    const numberValue = parseNumberValue(value)
    if (numberValue === null) return { value: text, error: "数値形式の値を入力してください。" }

    if (condition === "numberIntegerTruncate") {
      return { value: String(Math.trunc(numberValue)) }
    }

    return {
      value: new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(numberValue),
    }
  }

  if (condition === "date") {
    const formatted = formatDateYyyyMmDd(value)
    if (!formatted) return { value: text, error: "日付形式の値を入力してください。" }
    return { value: formatted }
  }

  return { value: text }
}

export function formatCsvValue(
  value: unknown,
  entry: ImportMappingEntry,
  options: { applyCharacterLimits?: boolean } = {}
) {
  let nextValue = value
  const errors: string[] = []
  const applyCharacterLimits = options.applyCharacterLimits ?? true

  for (const condition of getFormatConditions(entry)) {
    if (!applyCharacterLimits && isCharacterLimitCondition(condition)) continue
    const result = applyOneFormat(nextValue, condition)
    nextValue = result.value
    if (result.error) errors.push(result.error)
  }

  return {
    value: replaceNewlines(nextValue),
    errors,
  }
}

function formatRowCell(
  row: CsvWorkingRow,
  column: CsvColumnLetter,
  entry: ImportMappingEntry,
  issues: CsvValidationIssue[]
) {
  const cell = row.values[column]
  if (!cell) return

  const result = formatCsvValue(cell.rawValue ?? cell.value, entry, {
    applyCharacterLimits: false,
  })
  cell.value = result.value
  if (result.errors.length) {
    cell.issueTypes = [...(cell.issueTypes ?? []), "format"]
    issues.push(
      makeIssue({
        rowId: row.id,
        rowNumber: row.rowNumber,
        csvColumn: column,
        mappingEntryId: entry.id,
        issueType: "format",
        message: result.errors[0],
        sourceValue: String(cell.rawValue ?? cell.value ?? ""),
        suggestedAction: "元データまたはマッピングのフォーマット設定を確認してください。",
      })
    )
  }
}

export async function readExcelByMapping(
  file: File,
  mapping: ImportMappingConfig
): Promise<ExcelImportResult> {
  const issues: CsvValidationIssue[] = []

  if (!Number.isInteger(mapping.startDetailRow) || mapping.startDetailRow < 1) {
    issues.push(
      makeIssue({
        issueType: "mapping",
        message: "明細開始行を正しく入力してください。",
        suggestedAction: "マッピング設定を確認してください。",
      })
    )
  }

  if (!mapping.validRowColumn || !/^[A-Z]{1,3}$/i.test(mapping.validRowColumn)) {
    issues.push(
      makeIssue({
        issueType: "mapping",
        message: "有効行判定列を正しく入力してください。",
        suggestedAction: "マッピング設定を確認してください。",
      })
    )
  }

  if (issues.length) {
    return {
      sourceFileName: file.name,
      sheetValues: {},
      sourceRows: [],
      totalRowsRead: 0,
      validRows: 0,
      issues,
    }
  }

  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true })
  const visibleSheetNames = getVisibleSheetNames(workbook)
  const sheetValues: Record<string, SheetCellMap> = {}
  const sourceRows: ExcelSourceRow[] = []
  const validColumn = normalizeExcelColumn(mapping.validRowColumn)
  const startRowIndex = mapping.startDetailRow - 1

  for (const sheetName of visibleSheetNames) {
    const sheet = workbook.Sheets[sheetName]
    sheetValues[sheetName] = getSheetValues(sheet)
    const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1:A1")
    const lastDetailRowIndex = getLastDetailRowIndex(
      sheet,
      range,
      startRowIndex,
      [validColumn]
    )

    if (lastDetailRowIndex < startRowIndex) continue

    for (let rowIndex = startRowIndex; rowIndex <= lastDetailRowIndex; rowIndex += 1) {
      const valuesByColumn: Record<string, unknown> = {}
      for (let columnIndex = range.s.c; columnIndex <= range.e.c; columnIndex += 1) {
        const column = XLSX.utils.encode_col(columnIndex)
        const address = XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex })
        valuesByColumn[column] = getSheetCell(sheet, address)
      }

      sourceRows.push({
        id: `${sheetName}-${rowIndex + 1}`,
        rowIndex,
        rowNumber: rowIndex + 1,
        sheetName,
        fileName: file.name,
        valuesByColumn,
      })
    }
  }

  return {
    sourceFileName: file.name,
    sheetValues,
    sourceRows,
    totalRowsRead: sourceRows.length,
    validRows: sourceRows.length,
    issues,
  }
}

function getSortedOutputColumns(mapping: ImportMappingConfig) {
  const columns = new Set<CsvColumnLetter>()
  mapping.entries.forEach((entry) => getEntryColumns(entry).forEach((column) => columns.add(column)))
  return [...columns].sort((a, b) => getCsvColumnIndex(a) - getCsvColumnIndex(b))
}

function getColumnName(mapping: ImportMappingConfig, column: CsvColumnLetter) {
  const entry = sortMappingEntries(mapping.entries).find((item) =>
    getEntryColumns(item).includes(column)
  )
  return entry?.targetColumnName || column
}

function getColumnEntry(mapping: ImportMappingConfig, column: CsvColumnLetter) {
  return sortMappingEntries(mapping.entries).find((item) => getEntryColumns(item).includes(column))
}

function setCell(draft: RowDraft, entry: ImportMappingEntry, value: unknown, source: CsvCellSource) {
  getEntryColumns(entry).forEach((column) => {
    draft[column] = createCell(entry, column, value, source)
  })
}

function evaluateSourceFormula(
  entry: ImportMappingEntry,
  excel: ExcelImportResult,
  sourceRow: ExcelSourceRow | undefined
) {
  const formula = String(entry.sourceFormula ?? "").trim()
  const sourcePosition = String(entry.sourcePosition ?? "").trim().toUpperCase()
  const baseValue = /^[A-Z]{1,3}[1-9][0-9]*$/.test(sourcePosition)
    ? getFixedCellValue(excel, sourcePosition)
    : getDetailValue(sourceRow, sourcePosition)

  const offsetMatch = formula.match(/([A-Z]{1,3}[1-9][0-9]*|[A-Z]{1,3})\s*([+-])\s*(\d+)/i)
  if (offsetMatch) {
    const date = parseDateValue(baseValue)
    const amount = Number(offsetMatch[3])
    if (date) {
      const nextDate = new Date(date)
      nextDate.setDate(date.getDate() + (offsetMatch[2] === "-" ? -amount : amount))
      return nextDate
    }
    const numberValue = parseNumberValue(baseValue)
    if (numberValue !== null) return numberValue + (offsetMatch[2] === "-" ? -amount : amount)
  }

  return baseValue
}

function getLastDetailRowIndex(
  sheet: XLSX.WorkSheet,
  range: XLSX.Range,
  startRowIndex: number,
  columns: string[]
) {
  let lastDetailRowIndex = -1
  columns.forEach((column) => {
    const columnIndex = columnNameToIndex(column)
    for (let rowIndex = startRowIndex; rowIndex <= range.e.r; rowIndex += 1) {
      const address = XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex })
      if (normalizeText(getSheetCell(sheet, address))) {
        lastDetailRowIndex = Math.max(lastDetailRowIndex, rowIndex)
      }
    }
  })
  return lastDetailRowIndex
}

function evaluateFormula(formula: string | undefined, rowNumber: number, draft: RowDraft) {
  const expression = String(formula ?? "").trim().replace(/^=/, "")
  if (!expression) return ""
  if (expression.toUpperCase() === "ROW_NUMBER") return rowNumber

  const replaced = expression.replace(/\b[A-Z]{1,2}\b/g, (column) => {
    if (!isCsvColumn(column)) return column
    const value = parseNumberValue(draft[column]?.value)
    return value === null ? "0" : String(value)
  })

  if (!/^[0-9+\-*/().\s]+$/.test(replaced)) return ""

  try {
    const result = Function(`"use strict"; return (${replaced})`)()
    return Number.isFinite(result) ? result : ""
  } catch {
    return ""
  }
}

function lookupMasterData(
  entry: ImportMappingEntry,
  draft: RowDraft,
  masterData: MasterDataLookupStore
) {
  const collection = entry.lookupCollection
  const keyField = entry.lookupKeyField
  const valueField = entry.lookupValueField
  const lookupColumn = entry.lookupCsvColumn
  if (!collection || !keyField || !valueField || !lookupColumn) return { value: "", found: false }

  const sourceValue = normalizeText(draft[lookupColumn]?.value)
  if (!sourceValue) return { value: "", found: false, sourceValue }

  const records = masterData[collection] ?? []
  const record = records.find((item) => normalizeText(item[keyField]) === sourceValue)
  return {
    value: record?.[valueField] ?? "",
    found: Boolean(record),
    sourceValue,
  }
}

function addMissingSourceIssue(
  issues: CsvValidationIssue[],
  row: CsvWorkingRow,
  entry: ImportMappingEntry,
  column: CsvColumnLetter,
  message = "元データが空です。"
) {
  issues.push(
    makeIssue({
      rowId: row.id,
      rowNumber: row.rowNumber,
      csvColumn: column,
      mappingEntryId: entry.id,
      issueType: "sourceMissing",
      message,
      suggestedAction: "注文ファイルまたはマッピング設定を確認してください。",
    })
  )
}

export function buildCsvRowsFromMapping(options: BuildCsvRowsOptions): BuildCsvRowsResult {
  const { mapping, excel, masterData } = options
  const manualValues = options.manualInputs ?? {}
  const sortedEntries = sortMappingEntries(mapping.entries)
  const outputColumns = getSortedOutputColumns(mapping)
  const rows: CsvWorkingRow[] = []
  const issues: CsvValidationIssue[] = [...excel.issues]
  const manualInputs: CsvManualInput[] = sortedEntries
    .filter((entry) => entry.dataSource === "manualInput")
    .map((entry) => ({
      entryId: entry.id,
      targetColumns: entry.targetColumns,
      label: entry.targetColumnName || entry.targetColumns.join(", "),
      value: manualValues[entry.id] ?? "",
    }))

  excel.sourceRows.forEach((sourceRow, index) => {
    const row: CsvWorkingRow = {
      id: `${sourceRow.id}-${index + 1}`,
      rowNumber: index + 1,
      sourceFileName: sourceRow.fileName,
      sourceSheetName: sourceRow.sheetName,
      sourceRowNumber: sourceRow.rowNumber,
      values: {},
    }

    const draft = row.values

    for (const entry of sortedEntries) {
      if (entry.dataSource !== "orderFile") continue

      let value: unknown = ""
      if (entry.orderFileMode === "fixedCell") value = getFixedCellValue(excel, entry.sourceCell)
      if (entry.orderFileMode === "detailColumn") value = getDetailValue(sourceRow, entry.sourceColumn)
      if (entry.orderFileMode === "sourceFormula") {
        value = evaluateSourceFormula(entry, excel, sourceRow)
      }
      setCell(draft, entry, value, "excel")
    }

    for (const entry of sortedEntries) {
      if (entry.dataSource === "fixedValue") setCell(draft, entry, entry.fixedValue ?? "", "fixedValue")
      if (entry.dataSource === "blank") setCell(draft, entry, "", "blank")
      if (entry.dataSource === "manualInput") {
        setCell(draft, entry, manualValues[entry.id] ?? "", "manualInput")
      }
    }

    for (const entry of sortedEntries) {
      if (entry.dataSource !== "masterLookup") continue
      const result = lookupMasterData(entry, draft, masterData)
      const target = entry.lookupTargetColumn ?? entry.targetColumns[0]
      let shouldReportMissingLookup = true
      if (target) {
        const currentValue = normalizeText(draft[target]?.value)
        if (result.found || !currentValue) {
          draft[target] = createCell(entry, target, result.value, "masterLookup")
        } else {
          shouldReportMissingLookup = false
        }
      }
      if (!result.found && shouldReportMissingLookup) {
        issues.push(
          makeIssue({
            rowId: row.id,
            rowNumber: row.rowNumber,
            csvColumn: target,
            mappingEntryId: entry.id,
            issueType: "masterLookup",
            missingMasterDataType: entry.lookupCollection,
            sourceValue: result.sourceValue,
            message: `${getMasterDataLabel(entry.lookupCollection)}に該当データがありません。`,
            suggestedAction: "マスタデータを追加するか、元データを確認してください。",
          })
        )
      }
    }

    for (const entry of sortedEntries) {
      if (entry.dataSource !== "formula") continue
      const value = evaluateFormula(entry.formula, row.rowNumber, draft)
      setCell(draft, entry, value, "formula")
      if (value === "") {
        issues.push(
          makeIssue({
            rowId: row.id,
            rowNumber: row.rowNumber,
            csvColumn: entry.targetColumns[0],
            mappingEntryId: entry.id,
            issueType: "formula",
            message: "計算式を処理できません。",
            suggestedAction: "マッピングの計算式を確認してください。",
          })
        )
      }
    }

    for (const column of outputColumns) {
      if (!draft[column]) {
        draft[column] = {
          column,
          columnName: getColumnName(mapping, column),
          value: "",
          source: "blank",
        }
      }
    }

    for (const entry of sortedEntries) {
      getEntryColumns(entry).forEach((column) => {
        if (draft[column]?.mappingEntryId !== entry.id) return
        formatRowCell(row, column, entry, issues)
        if (draft[column] && !normalizeText(draft[column]?.value) && entry.dataSource !== "blank") {
          draft[column]!.issueTypes = [...(draft[column]!.issueTypes ?? []), "sourceMissing"]
          addMissingSourceIssue(issues, row, entry, column)
        }
      })
    }

    rows.push(row)
  })

  return {
    rows,
    issues,
    manualInputs,
    summary: summarizeIssues(rows, issues),
  }
}

function getMasterLookupTarget(entry: ImportMappingEntry) {
  return entry.lookupTargetColumn ?? entry.targetColumns[0]
}

function getDerivedIssueColumns(mapping: ImportMappingConfig) {
  const columns = new Set<CsvColumnLetter>()
  mapping.entries.forEach((entry) => {
    if (entry.dataSource === "formula") {
      entry.targetColumns.forEach((column) => columns.add(column))
    }
    if (entry.dataSource === "masterLookup") {
      const target = getMasterLookupTarget(entry)
      if (target) columns.add(target)
    }
  })
  return columns
}

function cloneWorkingRows(rows: CsvWorkingRow[]) {
  return rows.map((row) => ({
    ...row,
    values: Object.fromEntries(
      Object.entries(row.values).map(([column, cell]) => [
        column,
        cell ? { ...cell, issueTypes: cell.issueTypes ? [...cell.issueTypes] : undefined } : cell,
      ])
    ) as CsvWorkingRow["values"],
  }))
}

export function refreshDerivedCsvRows({
  rows,
  mapping,
  masterData,
  existingIssues = [],
}: {
  rows: CsvWorkingRow[]
  mapping: ImportMappingConfig
  masterData: MasterDataLookupStore
  existingIssues?: CsvValidationIssue[]
}) {
  const sortedEntries = sortMappingEntries(mapping.entries)
  const nextRows = cloneWorkingRows(rows)
  const derivedColumns = getDerivedIssueColumns(mapping)
  const issues = existingIssues.filter((issue) => {
    if (["formula", "masterLookup", "required"].includes(issue.issueType)) return false
    if (issue.csvColumn && derivedColumns.has(issue.csvColumn) && issue.issueType === "sourceMissing") {
      return false
    }
    return true
  })

  nextRows.forEach((row) => {
    const draft = row.values

    for (const entry of sortedEntries) {
      if (entry.dataSource !== "masterLookup") continue
      const result = lookupMasterData(entry, draft, masterData)
      const target = getMasterLookupTarget(entry)
      let shouldReportMissingLookup = true
      if (target) {
        const targetCell = draft[target]
        const currentValue = normalizeText(targetCell?.value)
        if (targetCell?.edited) {
          shouldReportMissingLookup = false
        } else if (result.found || !currentValue || targetCell?.source === "masterLookup") {
          draft[target] = createCell(entry, target, result.value, "masterLookup")
          formatRowCell(row, target, entry, issues)
        } else {
          shouldReportMissingLookup = false
        }
      }
      if (!result.found && shouldReportMissingLookup) {
        issues.push(
          makeIssue({
            rowId: row.id,
            rowNumber: row.rowNumber,
            csvColumn: target,
            mappingEntryId: entry.id,
            issueType: "masterLookup",
            missingMasterDataType: entry.lookupCollection,
            sourceValue: result.sourceValue,
            message: `${getMasterDataLabel(entry.lookupCollection)}に該当データがありません。`,
            suggestedAction: "マスタデータを追加するか、元データを確認してください。",
          })
        )
      }
    }

    for (const entry of sortedEntries) {
      if (entry.dataSource !== "formula") continue
      const value = evaluateFormula(entry.formula, row.rowNumber, draft)
      const targetColumns = getEntryColumns(entry)
      targetColumns.forEach((column) => {
        if (draft[column]?.edited) return
        draft[column] = createCell(entry, column, value, "formula")
      })
      if (value === "") {
        issues.push(
          makeIssue({
            rowId: row.id,
            rowNumber: row.rowNumber,
            csvColumn: entry.targetColumns[0],
            mappingEntryId: entry.id,
            issueType: "formula",
            message: "計算式を処理できません。",
            suggestedAction: "マッピングの計算式を確認してください。",
          })
        )
      }
      targetColumns.forEach((column) => {
        if (draft[column]?.mappingEntryId !== entry.id || draft[column]?.edited) return
        formatRowCell(row, column, entry, issues)
      })
    }
  })

  return {
    rows: nextRows,
    issues: validateCsvRows(nextRows, issues),
  }
}

export function validateCsvRows(rows: CsvWorkingRow[], existingIssues: CsvValidationIssue[] = []) {
  const issues = existingIssues.filter((issue) => issue.issueType !== "required")

  rows.forEach((row) => {
    Object.values(row.values).forEach((cell) => {
      if (!cell) return
      if (cell.source !== "blank" && !normalizeText(cell.value)) {
        issues.push(
          makeIssue({
            rowId: row.id,
            rowNumber: row.rowNumber,
            csvColumn: cell.column,
            mappingEntryId: cell.mappingEntryId,
            issueType: "required",
            message: "値が空です。",
            suggestedAction: "表で直接修正するか、元データまたはマッピングを確認してください。",
          })
        )
      }
    })
  })

  return issues
}

export function summarizeIssues(rows: CsvWorkingRow[], issues: CsvValidationIssue[]) {
  return {
    totalSourceRows: rows.length,
    validRows: rows.length,
    totalIssues: issues.length,
    missingIssues: issues.filter((issue) =>
      ["sourceMissing", "required", "manualInput"].includes(issue.issueType)
    ).length,
    lookupIssues: issues.filter((issue) => issue.issueType === "masterLookup").length,
    formatIssues: issues.filter((issue) => issue.issueType === "format").length,
  }
}

type LookupKeyRequests = Map<string, Set<string>>

function getLookupRequestKey(collection: string, sourceValue: string) {
  return `${collection}:${sourceValue}`
}

function cloneMasterDataStore(store: MasterDataLookupStore = {}) {
  return Object.fromEntries(
    Object.entries(store).map(([collection, records]) => [collection, [...(records ?? [])]])
  ) as MasterDataLookupStore
}

export function mergeMasterDataStore(
  baseStore: MasterDataLookupStore,
  nextStore: MasterDataLookupStore
) {
  const merged = cloneMasterDataStore(baseStore)

  Object.entries(nextStore).forEach(([collection, records]) => {
    const existing = merged[collection] ?? []
    const existingIds = new Set(existing.map((record) => normalizeText(record.id)))
    const nextRecords = (records ?? []).filter((record) => {
      const id = normalizeText(record.id)
      return !id || !existingIds.has(id)
    })
    merged[collection] = [...existing, ...nextRecords]
  })

  return merged
}

function collectLookupRequestsFromIssues(
  issues: CsvValidationIssue[],
  attemptedKeys: Set<string>
) {
  const requests: LookupKeyRequests = new Map()

  issues.forEach((issue) => {
    if (issue.issueType !== "masterLookup") return
    if (!issue.missingMasterDataType || !issue.sourceValue) return
    const sourceValue = normalizeText(issue.sourceValue)
    if (!sourceValue) return

    const requestKey = getLookupRequestKey(issue.missingMasterDataType, sourceValue)
    if (attemptedKeys.has(requestKey)) return

    const values = requests.get(issue.missingMasterDataType) ?? new Set<string>()
    values.add(sourceValue)
    requests.set(issue.missingMasterDataType, values)
  })

  return requests
}

function collectLookupRequestsFromRows(
  rows: CsvWorkingRow[],
  mapping: ImportMappingConfig,
  attemptedKeys: Set<string>
) {
  const requests: LookupKeyRequests = new Map()

  sortMappingEntries(mapping.entries).forEach((entry) => {
    if (entry.dataSource !== "masterLookup") return
    if (!entry.lookupCollection || !entry.lookupCsvColumn) return

    rows.forEach((row) => {
      const sourceValue = normalizeText(row.values[entry.lookupCsvColumn!]?.value)
      if (!sourceValue) return

      const requestKey = getLookupRequestKey(entry.lookupCollection!, sourceValue)
      if (attemptedKeys.has(requestKey)) return

      const values = requests.get(entry.lookupCollection!) ?? new Set<string>()
      values.add(sourceValue)
      requests.set(entry.lookupCollection!, values)
    })
  })

  return requests
}

async function loadRequestedMasterData(
  requests: LookupKeyRequests,
  configsByCollection: Map<string, MasterCollectionConfig>,
  attemptedKeys: Set<string>
) {
  const entries = await Promise.all(
    [...requests.entries()].map(async ([collection, values]) => {
      const keys = [...values]
      keys.forEach((key) => attemptedKeys.add(getLookupRequestKey(collection, key)))

      const config = configsByCollection.get(collection) ?? {
        id: collection,
        collectionName: collection,
        displayName: collection,
        fields: [],
      }

      // Step 1: Check JSON index first
      const fromIndex = new Map<string, Record<string, unknown>>()
      const missingFromIndex: string[] = []

      const indexResult = await ensureMasterDataCollectionIndex(collection)
      if (indexResult) {
        const indexed = getMasterDataRecordsFromIndex(collection, keys)
        indexed.forEach((record, key) => fromIndex.set(key, record))
        keys.forEach((key) => {
          if (!fromIndex.has(key)) missingFromIndex.push(key)
        })
      } else {
        missingFromIndex.push(...keys)
      }

      // Step 2: Check TTL cache for missing keys
      const cachedRecords: Array<Record<string, unknown>> = [...fromIndex.values()]
      const missingKeys = missingFromIndex.filter((key) => {
        const cacheKey = getLookupRequestKey(collection, key)
        const cached = masterLookupRecordCache.get(cacheKey)
        const cacheValid = cached && Date.now() - cached.cachedAt < MASTER_LOOKUP_CACHE_TTL_MS
        if (!cacheValid) {
          masterLookupRecordCache.delete(cacheKey)
          return true
        }
        if (cached.record) cachedRecords.push(cached.record)
        return false
      })

      // Step 3: Fallback Firestore for keys not in JSON index or cache
      if (!missingKeys.length) {
        return [collection, cachedRecords] as const
      }

      const lookupKeyField = getLookupKeyField(config)
      const records = await getDynamicMasterDataByKeys(config, missingKeys)
      const recordsByLookupKey = new Map<string, Record<string, unknown>>()
      records.forEach((record) => {
        const lookupKey = normalizeText(
          lookupKeyField ? record[lookupKeyField] : record.baseDocumentId ?? record.documentId ?? record.id
        )
        if (lookupKey) {
          recordsByLookupKey.set(lookupKey, record)
          masterLookupRecordCache.set(getLookupRequestKey(collection, lookupKey), {
            record,
            cachedAt: Date.now(),
          })
        }
      })
      missingKeys.forEach((key) => {
        if (recordsByLookupKey.has(key)) return
        masterLookupRecordCache.set(getLookupRequestKey(collection, key), {
          record: null,
          cachedAt: Date.now(),
        })
      })
      return [collection, [...cachedRecords, ...(records as Array<Record<string, unknown>>)]] as const
    })
  )

  return Object.fromEntries(entries) as MasterDataLookupStore
}

async function getMasterConfigsByCollection() {
  if (
    masterConfigsByCollectionCache &&
    Date.now() - masterConfigsByCollectionCache.cachedAt < MASTER_CONFIG_CACHE_TTL_MS
  ) {
    return masterConfigsByCollectionCache.configs
  }

  const configs = await masterCollectionConfigRepository.list()
  const configsByCollection = new Map(configs.map((config) => [config.collectionName, config]))
  masterConfigsByCollectionCache = {
    cachedAt: Date.now(),
    configs: configsByCollection,
  }
  return configsByCollection
}

const MASTER_DATA_DELTA_SYNC_STORAGE_KEY = "masterdata:delta-sync-at"

export function getLastDeltaSyncTime(collectionName: string): Date | null {
  try {
    const stored = window.localStorage.getItem(`${MASTER_DATA_DELTA_SYNC_STORAGE_KEY}:${collectionName}`)
    if (!stored) return null
    const ts = parseInt(stored, 10)
    return Number.isFinite(ts) && ts > 0 ? new Date(ts) : null
  } catch {
    return null
  }
}

function setLastDeltaSyncTime(collectionName: string, syncedAt: Date = new Date()) {
  try {
    window.localStorage.setItem(
      `${MASTER_DATA_DELTA_SYNC_STORAGE_KEY}:${collectionName}`,
      String(syncedAt.getTime())
    )
  } catch {
    // localStorage unavailable
  }
}

async function syncDeltasForCollections(collections: string[]) {
  for (const collectionName of collections) {
    const result = await ensureMasterDataCollectionIndex(collectionName)
    if (!result) continue

    const snapshotUpdatedAt = new Date(result.index.updatedAt)
    const since = getLastDeltaSyncTime(collectionName) ?? (
      Number.isFinite(snapshotUpdatedAt.getTime()) ? snapshotUpdatedAt : undefined
    )
    const syncStartedAt = new Date()
    const changes = await listMasterDataChangeLogs(collectionName, since)

    const lookupKeyField = result.index.lookupKeyField

    for (const change of changes) {
      applyMasterDataChangeLogToIndex(collectionName, change, lookupKeyField)
    }
    const latestChangeAt = changes.reduce<Date | null>((latest, change) => {
      if (!change.changedAt) return latest
      return !latest || change.changedAt > latest ? change.changedAt : latest
    }, null)
    setLastDeltaSyncTime(collectionName, latestChangeAt ?? syncStartedAt)
  }
}

function collectCollectionNamesFromMapping(mapping: ImportMappingConfig): string[] {
  const collections = new Set<string>()
  for (const entry of mapping.entries) {
    if (entry.dataSource === "masterLookup" && entry.lookupCollection) {
      collections.add(entry.lookupCollection)
    }
  }
  return [...collections]
}

export async function loadMasterDataStoreForMapping({
  mapping,
  excel,
  manualInputs,
}: {
  mapping: ImportMappingConfig
  excel: ExcelImportResult
  manualInputs?: Record<string, string>
}) {
  const configsByCollection = await getMasterConfigsByCollection()
  const mappingCollections = collectCollectionNamesFromMapping(mapping)
  await syncDeltasForCollections(mappingCollections)
  const attemptedKeys = new Set<string>()
  let masterData: MasterDataLookupStore = {}
  const maxIterations =
    mapping.entries.filter((entry) => entry.dataSource === "masterLookup").length + 1

  for (let index = 0; index < maxIterations; index += 1) {
    const result = buildCsvRowsFromMapping({
      mapping,
      excel,
      masterData,
      manualInputs,
    })
    const requests = collectLookupRequestsFromIssues(result.issues, attemptedKeys)
    if (!requests.size) break
    const nextMasterData = await loadRequestedMasterData(
      requests,
      configsByCollection,
      attemptedKeys
    )
    masterData = mergeMasterDataStore(masterData, nextMasterData)
  }

  return masterData
}

export async function loadMasterDataStoreForRows({
  rows,
  mapping,
}: {
  rows: CsvWorkingRow[]
  mapping: ImportMappingConfig
}) {
  const configsByCollection = await getMasterConfigsByCollection()
  const mappingCollections = collectCollectionNamesFromMapping(mapping)
  await syncDeltasForCollections(mappingCollections)
  const attemptedKeys = new Set<string>()
  let masterData: MasterDataLookupStore = {}
  const maxIterations =
    mapping.entries.filter((entry) => entry.dataSource === "masterLookup").length + 1

  for (let index = 0; index < maxIterations; index += 1) {
    const requests =
      index === 0
        ? collectLookupRequestsFromRows(rows, mapping, attemptedKeys)
        : collectLookupRequestsFromIssues(
            refreshDerivedCsvRows({
              rows,
              mapping,
              masterData,
              existingIssues: [],
            }).issues,
            attemptedKeys
          )
    if (!requests.size) break
    const nextMasterData = await loadRequestedMasterData(
      requests,
      configsByCollection,
      attemptedKeys
    )
    masterData = mergeMasterDataStore(masterData, nextMasterData)
  }

  return masterData
}

export async function loadMasterDataStoreForLookupKeys({
  collection,
  keys,
}: {
  collection: string
  keys: string[]
}) {
  const configsByCollection = await getMasterConfigsByCollection()
  await syncDeltasForCollections([collection])
  const requestedKeys = [...new Set(keys.map((key) => normalizeText(key)).filter(Boolean))]
  if (!requestedKeys.length) return {}

  const requests: LookupKeyRequests = new Map([[collection, new Set(requestedKeys)]])
  return loadRequestedMasterData(requests, configsByCollection, new Set<string>())
}

export function exportRowsToCsv(
  rows: CsvWorkingRow[],
  mapping: ImportMappingConfig,
  options: { bom?: boolean } = { bom: true }
) {
  const columns = getSortedOutputColumns(mapping).filter((column) => {
    const entry = getColumnEntry(mapping, column)
    return entry?.includeInCsvDownload !== false
  })
  const header = columns.map((column) => getColumnName(mapping, column))
  const body = rows.map((row) =>
    columns.map((column) => {
      const value = row.values[column]?.value ?? ""
      const entry = getColumnEntry(mapping, column)
      return entry ? formatCsvValue(value, entry, { applyCharacterLimits: true }).value : value
    })
  )
  const csv = [header, ...body].map((line) => line.map(escapeCsvValue).join(",")).join("\r\n")
  return options.bom === false ? csv : `\uFEFF${csv}`
}

function escapeCsvValue(value: unknown) {
  const text = replaceNewlines(value)
  if (/[",;\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

export function downloadCsv(csv: string, fileName: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export async function createMissingMasterDataRecord(
  collection: MissingMasterDataType,
  sourceValue: string
) {
  const trimmed = sourceValue.trim()
  if (!trimmed) throw new Error("追加する値がありません。")

  if (collection === "CusCodeList") {
    return createCusCodeList({ CusCode: trimmed } satisfies CusCodeListItem)
  }
  if (collection === "ItemCodeList") {
    return createItemCodeList({ IzuyoshiJPCode: trimmed } satisfies ItemCodeListItem)
  }
  if (collection === "UnitPriceList") {
    return createUnitPriceList({ IzuyoshiJPCode: trimmed, UnitPrice: "" } satisfies UnitPriceListItem)
  }
  if (collection === "PIC.WH.CodeList") {
    return createPICWHCodeList({ PICCode: trimmed } satisfies PICWHCodeListItem)
  }
  return createUnitCodeList({ OrderUnit: trimmed } satisfies UnitCodeListItem)
}
