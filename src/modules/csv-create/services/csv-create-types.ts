"use client"

import type {
  CsvColumnLetter,
  ImportMappingConfig,
  ImportMappingEntry,
  MissingMasterDataType,
  ValidationSeverity,
} from "@/types/firestore-models"

export type CsvDisplayMode = "compact" | "full"

export type CsvIssueType =
  | "mapping"
  | "sourceMissing"
  | "masterLookup"
  | "formula"
  | "format"
  | "manualInput"
  | "required"

export type CsvCellSource = "excel" | "fixedValue" | "masterLookup" | "formula" | "manualInput" | "blank"

export interface CsvWorkingCell {
  column: CsvColumnLetter
  columnName: string
  value: string
  rawValue?: unknown
  source: CsvCellSource
  mappingEntryId?: string
  edited?: boolean
  issueTypes?: CsvIssueType[]
}

export interface CsvWorkingRow {
  id: string
  rowNumber: number
  sourceFileName: string
  sourceSheetName: string
  sourceRowNumber: number
  values: Partial<Record<CsvColumnLetter, CsvWorkingCell>>
}

export interface CsvValidationIssue {
  id: string
  rowId?: string
  rowNumber?: number
  csvColumn?: CsvColumnLetter
  mappingEntryId?: string
  severity: ValidationSeverity
  message: string
  issueType: CsvIssueType
  missingMasterDataType?: MissingMasterDataType
  sourceValue?: string
  suggestedAction?: string
}

export interface CsvManualInput {
  entryId: string
  targetColumns: CsvColumnLetter[]
  label: string
  value: string
}

export interface CsvImportSummary {
  totalSourceRows: number
  validRows: number
  totalIssues: number
  missingIssues: number
  lookupIssues: number
  formatIssues: number
}

export interface CsvWorkingSession {
  id: string
  mapping: ImportMappingConfig
  sourceFileName: string
  displayMode: CsvDisplayMode
  rows: CsvWorkingRow[]
  issues: CsvValidationIssue[]
  manualInputs: CsvManualInput[]
  summary: CsvImportSummary
}

export interface ExcelSourceRow {
  id: string
  rowIndex: number
  rowNumber: number
  sheetName: string
  fileName: string
  valuesByColumn: Record<string, unknown>
}

export interface ExcelImportResult {
  sourceFileName: string
  sheetValues: Record<string, Record<string, unknown>>
  sourceRows: ExcelSourceRow[]
  totalRowsRead: number
  validRows: number
  issues: CsvValidationIssue[]
}

export type MasterDataLookupStore = Partial<
  Record<MissingMasterDataType, Array<Record<string, unknown>>>
>

export interface BuildCsvRowsOptions {
  mapping: ImportMappingConfig
  excel: ExcelImportResult
  masterData: MasterDataLookupStore
  manualInputs?: Record<string, string>
}

export interface BuildCsvRowsResult {
  rows: CsvWorkingRow[]
  issues: CsvValidationIssue[]
  manualInputs: CsvManualInput[]
  summary: CsvImportSummary
}

export function getIssueId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function getCellKey(rowId: string, column: CsvColumnLetter) {
  return `${rowId}:${column}`
}

export function getEntryColumns(entry: ImportMappingEntry) {
  return entry.dataSource === "masterLookup" && entry.lookupTargetColumn
    ? [entry.lookupTargetColumn]
    : entry.targetColumns
}
