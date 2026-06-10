"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type {
  ClipboardEvent as ReactClipboardEvent,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
} from "react"
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Columns3,
  Download,
  Eye,
  EyeOff,
  FilePlus2,
  FileSpreadsheet,
  GripVertical,
  Maximize2,
  RefreshCw,
  Save,
  Upload,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { useConfirmDialog } from "@/components/confirm-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { mappingConfigRepository } from "@/modules/import-mapping/services/import-mapping-services"
import {
  getCsvColumnIndex,
  sortMappingEntries,
} from "@/modules/import-mapping/services/import-mapping-types"
import {
  createDynamicMasterDataRecord,
  type DynamicMasterDataRecord,
} from "@/modules/masterdata/services/masterdata-services"
import { masterCollectionConfigRepository } from "@/modules/masterdata/services/master-collection-config-services"
import type {
  CsvColumnLetter,
  ImportMappingConfig,
  ImportMappingEntry,
  MasterCollectionConfig,
} from "@/types/firestore-models"

import {
  buildCsvRowsFromMapping,
  clearCsvMasterDataLookupCache,
  downloadCsv,
  exportRowsToCsv,
  loadMasterDataStoreForMapping,
  loadMasterDataStoreForLookupKeys,
  loadMasterDataStoreForRows,
  mergeMasterDataStore,
  readExcelByMapping,
  refreshDerivedCsvRows,
  validateCsvRows,
} from "../services/csv-create-services"
import type {
  CsvDisplayMode,
  CsvManualInput,
  CsvValidationIssue,
  CsvWorkingRow,
  ExcelImportResult,
  MasterDataLookupStore,
} from "../services/csv-create-types"
import { getCellKey, getEntryColumns } from "../services/csv-create-types"

function isMappingUsable(mapping: ImportMappingConfig) {
  return (
    mapping.active &&
    !mapping.deleted &&
    Number.isInteger(mapping.startDetailRow) &&
    mapping.startDetailRow > 0 &&
    /^[A-Z]{1,3}$/i.test(mapping.validRowColumn ?? "") &&
    mapping.entries.length > 0
  )
}

function getOutputColumns(mapping: ImportMappingConfig | null) {
  if (!mapping) return []
  const columns = new Set<CsvColumnLetter>()
  sortMappingEntries(mapping.entries).forEach((entry) => {
    getEntryColumns(entry).forEach((column) => columns.add(column))
  })
  return [...columns].sort((a, b) => getCsvColumnIndex(a) - getCsvColumnIndex(b))
}

function getColumnEntry(mapping: ImportMappingConfig, column: CsvColumnLetter) {
  return sortMappingEntries(mapping.entries).find((entry) => getEntryColumns(entry).includes(column))
}

function getColumnLabel(mapping: ImportMappingConfig, column: CsvColumnLetter) {
  const entry = getColumnEntry(mapping, column)
  return entry?.targetColumnName ? `${column} ${entry.targetColumnName}` : column
}

function getVisibleColumns(mapping: ImportMappingConfig | null, displayMode: CsvDisplayMode) {
  const columns = getOutputColumns(mapping)
  if (!mapping || displayMode === "full") return columns

  return columns.filter((column) => {
    const entry = getColumnEntry(mapping, column)
    return !entry?.hideInCompactView
  })
}

function issueKey(issue: CsvValidationIssue) {
  return issue.rowId && issue.csvColumn ? getCellKey(issue.rowId, issue.csvColumn) : ""
}

function isResolvedByCellValue(issue: CsvValidationIssue, value: string | undefined) {
  if (!String(value ?? "").trim()) return false
  return ["sourceMissing", "required", "masterLookup"].includes(issue.issueType)
}

function getIssueSummary(issues: CsvValidationIssue[]) {
  return {
    total: issues.length,
    lookup: issues.filter((issue) => issue.issueType === "masterLookup").length,
    format: issues.filter((issue) => issue.issueType === "format").length,
    missing: issues.filter((issue) =>
      ["sourceMissing", "required", "manualInput"].includes(issue.issueType)
    ).length,
  }
}

function cloneRows(rows: CsvWorkingRow[]) {
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

function makeBlankCsvRows(mapping: ImportMappingConfig, count: number) {
  const outputColumns = getOutputColumns(mapping)
  const rows: CsvWorkingRow[] = []

  for (let index = 0; index < count; index += 1) {
    const rowId = `manual-row-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`
    rows.push({
      id: rowId,
      rowNumber: 0,
      sourceFileName: "",
      sourceSheetName: "",
      sourceRowNumber: 0,
      values: Object.fromEntries(
        outputColumns.map((column) => {
          const entry = mapping ? getColumnEntry(mapping, column) : null
          return [
            column,
            {
              column,
              columnName: entry?.targetColumnName || column,
              value: "",
              rawValue: "",
              source: "manualInput",
              mappingEntryId: entry?.id,
              edited: true,
            },
          ]
        })
      ) as CsvWorkingRow["values"],
    })
  }

  return rows
}

function renumberRows(rows: CsvWorkingRow[]) {
  return rows.map((row, index) => ({
    ...row,
    rowNumber: index + 1,
  }))
}

function removeResolvedCellIssues(rows: CsvWorkingRow[], issues: CsvValidationIssue[]) {
  const valueByKey = new Map<string, string>()
  rows.forEach((row) => {
    Object.values(row.values).forEach((cell) => {
      if (cell) valueByKey.set(getCellKey(row.id, cell.column), cell.value)
    })
  })

  return issues.filter((issue) => {
    const key = issueKey(issue)
    if (!key) return true
    const value = valueByKey.get(key)
    if (!String(value ?? "").trim()) return true
    return !["sourceMissing", "required", "format"].includes(issue.issueType)
  })
}

function makeExportName(sourceFileName?: string) {
  const baseName = sourceFileName?.replace(/\.[^.]+$/, "") || "csv-export"
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "")
  return `${baseName}-${stamp}.csv`
}

function mergeExcelImportResults(results: ExcelImportResult[]): ExcelImportResult {
  if (!results.length) {
    return {
      sourceFileName: "",
      sheetValues: {},
      sourceRows: [],
      totalRowsRead: 0,
      validRows: 0,
      issues: [],
    }
  }

  const sourceFileName =
    results.length === 1
      ? results[0].sourceFileName
      : `${results.length} files: ${results.map((result) => result.sourceFileName).join(", ")}`
  const sheetValues: ExcelImportResult["sheetValues"] = {}
  const sourceRows: ExcelImportResult["sourceRows"] = []
  const issues: ExcelImportResult["issues"] = []

  results.forEach((result, fileIndex) => {
    Object.entries(result.sheetValues).forEach(([sheetName, values]) => {
      sheetValues[`${result.sourceFileName}::${sheetName}`] = values
    })
    result.sourceRows.forEach((row) => {
      sourceRows.push({
        ...row,
        id: `${fileIndex + 1}-${row.id}`,
      })
    })
    issues.push(...result.issues)
  })

  return {
    sourceFileName,
    sheetValues,
    sourceRows,
    totalRowsRead: sourceRows.length,
    validRows: sourceRows.length,
    issues,
  }
}

function getRowValueByColumnName(row: CsvWorkingRow, columnName: string) {
  const normalizedColumnName = columnName.trim()
  if (!normalizedColumnName) return ""

  const matchedCell = Object.values(row.values).find((cell) => {
    return cell?.columnName?.trim() === normalizedColumnName
  })

  return matchedCell?.value ?? ""
}

function buildMasterDataDraftFromCsvRow({
  config,
  entry,
  row,
  editedValue,
}: {
  config: MasterCollectionConfig
  entry: ImportMappingEntry
  row: CsvWorkingRow
  editedValue: string
}) {
  return Object.fromEntries(
    config.fields.map((field) => {
      if (field === entry.lookupKeyField && entry.lookupCsvColumn) {
        return [field, row.values[entry.lookupCsvColumn]?.value ?? ""]
      }
      if (field === entry.lookupValueField) {
        return [field, editedValue]
      }
      if (field === "Description") {
        return [field, getRowValueByColumnName(row, "商品名")]
      }

      return [field, getRowValueByColumnName(row, field)]
    })
  ) as DynamicMasterDataRecord
}

function getMasterDataEditKey(input: {
  mappingId: string
  rowId: string
  column: CsvColumnLetter
  value: string
}) {
  return `${input.mappingId}:${input.rowId}:${input.column}:${input.value}`
}

const CSV_SESSION_STORAGE_KEY = "csv-create-working-session"
const CSV_LATEST_MANUAL_VALUES_STORAGE_KEY = "csv-create-latest-manual-values"
const MASTER_DATA_CHANGED_STORAGE_KEY = "master-data:changed-at"
const MIN_CSV_COLUMN_WIDTH = 72
const MAX_AUTO_CSV_COLUMN_WIDTH = 280
const DEFAULT_CSV_COLUMN_WIDTH = 136

type CsvSortDirection = "asc" | "desc"

interface CsvSortState {
  column: CsvColumnLetter
  direction: CsvSortDirection
}

interface CsvCellEdit {
  rowId: string
  column: CsvColumnLetter
  value: string
}
type MasterDataChangedPayload = {
  changedAt?: string
  collectionName?: string
  lookupKeys?: string[]
}

function normalizeLookupText(value: unknown) {
  return String(value ?? "").trim()
}

function parseMasterDataChangedPayload(value: string | null): MasterDataChangedPayload | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value) as MasterDataChangedPayload
    return parsed && typeof parsed === "object" ? parsed : { changedAt: value }
  } catch {
    return { changedAt: value }
  }
}

interface CsvCellSelection {
  startRowId: string
  startColumn: CsvColumnLetter
  endRowId: string
  endColumn: CsvColumnLetter
}

interface CsvRowContextAction {
  anchorRowId: string
  selectedRowIds: string[]
  visibleRowIds: string[]
}

interface PendingMasterDataSave {
  config: MasterCollectionConfig
  entry: ImportMappingEntry
  row: CsvWorkingRow
  column: CsvColumnLetter
  editKey: string
  draft: DynamicMasterDataRecord
}

interface CsvCreateSessionState {
  sessionOpen: boolean
  sessionId: string
  selectedMappingId: string
  displayMode: CsvDisplayMode
  columnWidths: Partial<Record<CsvColumnLetter, number>>
  hiddenColumns: CsvColumnLetter[]
  sortState: CsvSortState | null
  rows: CsvWorkingRow[]
  draftRows: CsvWorkingRow[]
  issues: CsvValidationIssue[]
  manualInputs: CsvManualInput[]
  manualValues: Record<string, string>
  sourceFileName: string
  lastExcel: ExcelImportResult | null
  hasUnsavedChanges: boolean
}

let inMemoryCsvSessionState: CsvCreateSessionState | null = null

function getEmptySessionState(selectedMappingId = ""): CsvCreateSessionState {
  return {
    sessionOpen: false,
    sessionId: "",
    selectedMappingId,
    displayMode: "full",
    columnWidths: {},
    hiddenColumns: [],
    sortState: null,
    rows: [],
    draftRows: [],
    issues: [],
    manualInputs: [],
    manualValues: {},
    sourceFileName: "",
    lastExcel: null,
    hasUnsavedChanges: false,
  }
}

function createSessionId() {
  return `csv-session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function loadLatestManualValues(mappingId: string) {
  if (typeof window === "undefined" || !mappingId) return {}

  try {
    const stored = window.localStorage.getItem(CSV_LATEST_MANUAL_VALUES_STORAGE_KEY)
    if (!stored) return {}
    const parsed = JSON.parse(stored) as Record<string, Record<string, string>>
    return parsed[mappingId] ?? {}
  } catch {
    return {}
  }
}

function storeLatestManualValues(mappingId: string, values: Record<string, string>) {
  if (typeof window === "undefined" || !mappingId) return

  try {
    const stored = window.localStorage.getItem(CSV_LATEST_MANUAL_VALUES_STORAGE_KEY)
    const parsed = stored ? (JSON.parse(stored) as Record<string, Record<string, string>>) : {}
    parsed[mappingId] = values
    window.localStorage.setItem(CSV_LATEST_MANUAL_VALUES_STORAGE_KEY, JSON.stringify(parsed))
  } catch {
    // The current session still keeps the values even if persistent storage is unavailable.
  }
}

function loadStoredSessionState() {
  if (inMemoryCsvSessionState?.sessionOpen) return inMemoryCsvSessionState
  if (typeof window === "undefined") return getEmptySessionState()

  try {
    const stored = window.sessionStorage.getItem(CSV_SESSION_STORAGE_KEY)
    if (!stored) return getEmptySessionState()

    const parsed = JSON.parse(stored) as Partial<CsvCreateSessionState>
    if (!parsed.sessionOpen || !parsed.sessionId) return getEmptySessionState()

    return {
      ...getEmptySessionState(),
      ...parsed,
      sessionOpen: true,
      rows: parsed.rows ?? [],
      draftRows: parsed.draftRows ?? [],
      issues: parsed.issues ?? [],
      manualInputs: parsed.manualInputs ?? [],
      manualValues: parsed.manualValues ?? {},
      columnWidths: parsed.columnWidths ?? {},
      hiddenColumns: parsed.hiddenColumns ?? [],
      sortState: parsed.sortState ?? null,
      lastExcel: parsed.lastExcel ?? null,
    }
  } catch {
    return getEmptySessionState()
  }
}

function storeSessionState(state: CsvCreateSessionState) {
  inMemoryCsvSessionState = state.sessionOpen ? state : null
  if (typeof window === "undefined") return

  if (!state.sessionOpen) {
    try {
      window.sessionStorage.removeItem(CSV_SESSION_STORAGE_KEY)
    } catch {
      // Storage can be unavailable in private or quota-limited contexts.
    }
    return
  }

  const serializedState = JSON.stringify(state)
  if (serializedState.length > 2_500_000) {
    const lightweightState: CsvCreateSessionState = {
      ...state,
      rows: [],
      draftRows: [],
      issues: [],
      lastExcel: null,
    }

    try {
      window.sessionStorage.setItem(CSV_SESSION_STORAGE_KEY, JSON.stringify(lightweightState))
    } catch {
      try {
        window.sessionStorage.removeItem(CSV_SESSION_STORAGE_KEY)
      } catch {
        // The in-memory session still protects SPA navigation.
      }
    }
    return
  }

  try {
    window.sessionStorage.setItem(CSV_SESSION_STORAGE_KEY, serializedState)
  } catch {
    const lightweightState: CsvCreateSessionState = {
      ...state,
      rows: [],
      draftRows: [],
      issues: [],
      lastExcel: null,
    }

    try {
      window.sessionStorage.setItem(CSV_SESSION_STORAGE_KEY, JSON.stringify(lightweightState))
    } catch {
      try {
        window.sessionStorage.removeItem(CSV_SESSION_STORAGE_KEY)
      } catch {
        // Nothing else to do; the in-memory session still protects SPA navigation.
      }
    }
  }
}

export function CsvCreatePageContent() {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const initialSessionRef = useRef<CsvCreateSessionState | null>(null)
  if (!initialSessionRef.current) initialSessionRef.current = loadStoredSessionState()
  const initialSession = initialSessionRef.current
  const [mappings, setMappings] = useState<ImportMappingConfig[]>([])
  const [sessionOpen, setSessionOpen] = useState(initialSession.sessionOpen)
  const [sessionId, setSessionId] = useState(initialSession.sessionId)
  const [selectedMappingId, setSelectedMappingId] = useState(initialSession.selectedMappingId)
  const [mappingLoading, setMappingLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [displayMode, setDisplayMode] = useState<CsvDisplayMode>(initialSession.displayMode)
  const [columnWidths, setColumnWidths] = useState<Partial<Record<CsvColumnLetter, number>>>(initialSession.columnWidths)
  const [hiddenColumns, setHiddenColumns] = useState<CsvColumnLetter[]>(initialSession.hiddenColumns)
  const [sortState, setSortState] = useState<CsvSortState | null>(initialSession.sortState)
  const [rows, setRows] = useState<CsvWorkingRow[]>(initialSession.rows)
  const [draftRows, setDraftRows] = useState<CsvWorkingRow[]>(initialSession.draftRows)
  const [issues, setIssues] = useState<CsvValidationIssue[]>(initialSession.issues)
  const [manualInputs, setManualInputs] = useState<CsvManualInput[]>(initialSession.manualInputs)
  const [manualValues, setManualValues] = useState<Record<string, string>>(initialSession.manualValues)
  const [sourceFileName, setSourceFileName] = useState(initialSession.sourceFileName)
  const [lastExcel, setLastExcel] = useState<ExcelImportResult | null>(initialSession.lastExcel)
  const [masterDataStore, setMasterDataStore] = useState<MasterDataLookupStore | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(initialSession.hasUnsavedChanges)
  const [pendingMasterDataSave, setPendingMasterDataSave] =
    useState<PendingMasterDataSave | null>(null)
  const [pendingMasterDataQueue, setPendingMasterDataQueue] = useState<PendingMasterDataSave[]>([])
  const [masterDataDraft, setMasterDataDraft] = useState<DynamicMasterDataRecord>({})
  const [savingMasterData, setSavingMasterData] = useState(false)
  const [savedMasterDataEditKeys, setSavedMasterDataEditKeys] = useState<Set<string>>(
    () => new Set()
  )
  const confirmDialog = useConfirmDialog()

  const selectedMapping = useMemo(
    () => mappings.find((mapping) => mapping.id === selectedMappingId) ?? null,
    [mappings, selectedMappingId]
  )
  const visibleColumns = useMemo(
    () => getVisibleColumns(selectedMapping, displayMode),
    [selectedMapping, displayMode]
  )
  const issueSummary = useMemo(() => getIssueSummary(issues), [issues])
  const issueByCell = useMemo(() => {
    const valueByKey = new Map<string, string>()
    draftRows.forEach((row) => {
      Object.values(row.values).forEach((cell) => {
        if (cell) valueByKey.set(getCellKey(row.id, cell.column), cell.value)
      })
    })

    const map = new Map<string, CsvValidationIssue[]>()
    issues.forEach((issue) => {
      const key = issueKey(issue)
      if (!key) return
      if (isResolvedByCellValue(issue, valueByKey.get(key))) return
      map.set(key, [...(map.get(key) ?? []), issue])
    })
    return map
  }, [draftRows, issues])

  useEffect(() => {
    storeSessionState({
      sessionOpen,
      sessionId,
      selectedMappingId,
      displayMode,
      columnWidths,
      hiddenColumns,
      sortState,
      rows,
      draftRows,
      issues,
      manualInputs,
      manualValues,
      sourceFileName,
      lastExcel,
      hasUnsavedChanges,
    })
  }, [
    sessionOpen,
    sessionId,
    selectedMappingId,
    displayMode,
    columnWidths,
    hiddenColumns,
    sortState,
    rows,
    draftRows,
    issues,
    manualInputs,
    manualValues,
    sourceFileName,
    lastExcel,
    hasUnsavedChanges,
  ])

  useEffect(() => {
    let mounted = true
    setMappingLoading(true)
    mappingConfigRepository
      .list()
      .then((items) => {
        if (!mounted) return
        setMappings(items)
        const firstUsable = items.find(isMappingUsable)
        if (firstUsable) setSelectedMappingId((currentId) => currentId || firstUsable.id)
      })
      .catch(() => toast.error("マッピングを読み込めませんでした。"))
      .finally(() => {
        if (mounted) setMappingLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!sessionOpen || !selectedMapping || !draftRows.length) return

    let refreshing = false
    const refreshSilently = (payload?: MasterDataChangedPayload | null) => {
      if (refreshing) return
      refreshing = true
      const refreshPromise =
        payload?.collectionName && payload.lookupKeys?.length
          ? refreshChangedMasterData(payload)
          : payload
            ? (clearCsvMasterDataLookupCache(), refreshDerivedValues({ silent: true }))
            : refreshDerivedValues({ silent: true })
      void refreshPromise.finally(() => {
        refreshing = false
      })
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === MASTER_DATA_CHANGED_STORAGE_KEY) {
        refreshSilently(parseMasterDataChangedPayload(event.newValue))
      }
    }

    window.addEventListener("storage", handleStorage)

    return () => {
      window.removeEventListener("storage", handleStorage)
    }
  }, [draftRows, hasUnsavedChanges, issues, masterDataStore, selectedMapping, sessionOpen])

  function clearWorkingData(nextSelectedMappingId = selectedMappingId) {
    setSelectedMappingId(nextSelectedMappingId)
    const latestManualValues = loadLatestManualValues(nextSelectedMappingId)
    setDisplayMode("full")
    setColumnWidths({})
    setHiddenColumns([])
    setSortState(null)
    setRows([])
    setDraftRows([])
    setIssues([])
    setManualInputs([])
    setManualValues(latestManualValues)
    setSourceFileName("")
    setLastExcel(null)
    setMasterDataStore(null)
    setIsExpanded(false)
    setHasUnsavedChanges(false)
    setPendingMasterDataSave(null)
    setPendingMasterDataQueue([])
    setMasterDataDraft({})
    setSavedMasterDataEditKeys(new Set())
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  function startNewSession() {
    const firstUsable = mappings.find(isMappingUsable)
    setSessionOpen(true)
    setSessionId(createSessionId())
    clearWorkingData(selectedMappingId || firstUsable?.id || "")
    toast.success("新しい作業セッションを開始しました。")
  }

  async function refreshDerivedValues(options: { silent?: boolean } = {}) {
    if (!sessionOpen || !selectedMapping || !draftRows.length) return
    setProcessing(true)
    try {
      const nextMasterData = await loadMasterDataStoreForRows({
        rows: draftRows,
        mapping: selectedMapping,
      })
      setMasterDataStore(nextMasterData)
      const refreshed = refreshDerivedCsvRows({
        rows: draftRows,
        mapping: selectedMapping,
        masterData: nextMasterData,
        existingIssues: issues,
      })
      setRows(refreshed.rows)
      setDraftRows(cloneRows(refreshed.rows))
      setIssues(refreshed.issues)
      setHasUnsavedChanges(false)
      if (!options.silent) toast.success("データを更新しました。")
    } catch {
      if (!options.silent) toast.error("データ更新に失敗しました。")
    } finally {
      setProcessing(false)
    }
  }

  async function refreshChangedMasterData(payload: MasterDataChangedPayload) {
    if (!selectedMapping || !payload.collectionName || !payload.lookupKeys?.length) {
      clearCsvMasterDataLookupCache()
      await refreshDerivedValues({ silent: true })
      return
    }

    const lookupKeys = new Set(
      payload.lookupKeys.map((key) => normalizeLookupText(key)).filter(Boolean)
    )
    if (!lookupKeys.size) return

    lookupKeys.forEach((key) => {
      clearCsvMasterDataLookupCache(payload.collectionName, key)
    })

    const additionalMasterData = await loadMasterDataStoreForLookupKeys({
      collection: payload.collectionName,
      keys: [...lookupKeys],
    })
    const nextMasterData = mergeMasterDataStore(masterDataStore ?? {}, additionalMasterData)
    setMasterDataStore(nextMasterData)

    const refreshed = refreshDerivedCsvRows({
      rows: draftRows,
      mapping: selectedMapping,
      masterData: nextMasterData,
      existingIssues: issues,
    })
    const nextIssues = validateCsvRows(refreshed.rows, refreshed.issues)
    if (!hasUnsavedChanges) {
      setRows(refreshed.rows)
      setHasUnsavedChanges(false)
    }
    setDraftRows(refreshed.rows)
    setIssues(nextIssues)
  }

  async function rebuildWithManualValues(nextManualValues = manualValues) {
    if (!sessionOpen || !selectedMapping || !lastExcel) return
    setProcessing(true)
    try {
      const nextMasterData = await loadMasterDataStoreForMapping({
        mapping: selectedMapping,
        excel: lastExcel,
        manualInputs: nextManualValues,
      })
      setMasterDataStore(nextMasterData)
      const result = buildCsvRowsFromMapping({
        mapping: selectedMapping,
        excel: lastExcel,
        masterData: nextMasterData,
        manualInputs: nextManualValues,
      })
      const nextIssues = validateCsvRows(result.rows, result.issues)
      setRows(result.rows)
      setDraftRows(cloneRows(result.rows))
      setIssues(nextIssues)
      setManualInputs(result.manualInputs)
      setPendingMasterDataSave(null)
      setPendingMasterDataQueue([])
      setMasterDataDraft({})
      setSavedMasterDataEditKeys(new Set())
      setHasUnsavedChanges(false)
      toast.success("再処理しました。")
    } catch {
      toast.error("再処理に失敗しました。")
    } finally {
      setProcessing(false)
    }
  }

  async function handleFiles(files: File[]) {
    if (!sessionOpen) {
      toast.error("先に新規セッションを開始してください。")
      return
    }
    if (!files.length) return
    if (!selectedMapping) {
      toast.error("マッピングを選択してください。")
      return
    }
    if (!isMappingUsable(selectedMapping)) {
      toast.error("このマッピングは使用できません。設定を確認してください。")
      return
    }

    setProcessing(true)
    try {
      const results: ExcelImportResult[] = []
      for (const file of files) {
        results.push(await readExcelByMapping(file, selectedMapping))
      }
      const excel = mergeExcelImportResults(results)
      const nextMasterData = await loadMasterDataStoreForMapping({
        mapping: selectedMapping,
        excel,
        manualInputs: manualValues,
      })
      setMasterDataStore(nextMasterData)
      const result = buildCsvRowsFromMapping({
        mapping: selectedMapping,
        excel,
        masterData: nextMasterData,
        manualInputs: manualValues,
      })
      const nextIssues = validateCsvRows(result.rows, result.issues)
      setLastExcel(excel)
      setSourceFileName(excel.sourceFileName)
      setRows(result.rows)
      setDraftRows(cloneRows(result.rows))
      setIssues(nextIssues)
      setManualInputs(result.manualInputs)
      setPendingMasterDataSave(null)
      setPendingMasterDataQueue([])
      setMasterDataDraft({})
      setSavedMasterDataEditKeys(new Set())
      setHasUnsavedChanges(false)
      toast.success(`${files.length} ファイルをインポートしました。`)
    } catch {
      toast.error("ファイルを読み込めませんでした。")
    } finally {
      setProcessing(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  function applyEditsToRows(sourceRows: CsvWorkingRow[], edits: CsvCellEdit[]) {
    return sourceRows.map((row) => {
      const rowEdits = edits.filter((edit) => edit.rowId === row.id)
      if (!rowEdits.length) return row
      const nextValues = { ...row.values }
      rowEdits.forEach((edit) => {
        const currentCell = row.values[edit.column]
        nextValues[edit.column] = {
          column: edit.column,
          columnName: currentCell?.columnName ?? edit.column,
          value: edit.value,
          rawValue: edit.value,
          source: currentCell?.source ?? "manualInput",
          mappingEntryId: currentCell?.mappingEntryId,
          edited: true,
          issueTypes: currentCell?.issueTypes,
        }
      })
      return {
        ...row,
        values: nextValues,
      }
    })
  }

  function applyCellEdits(edits: CsvCellEdit[]) {
    if (!sessionOpen) return
    if (!edits.length) return
    const nextRows = applyEditsToRows(draftRows, edits)

    if (selectedMapping) {
      const refreshed = refreshDerivedCsvRows({
        rows: nextRows,
        mapping: selectedMapping,
        masterData: masterDataStore ?? {},
        existingIssues: issues,
      })
      setDraftRows(refreshed.rows)
      setIssues(refreshed.issues)
    } else {
      setDraftRows(nextRows)
    }
    setHasUnsavedChanges(true)
  }

  async function refreshLookupForEditedRows(
    nextRows: CsvWorkingRow[],
    rowIds: string[],
    options: { commitRows?: boolean } = {}
  ) {
    if (!selectedMapping || !sessionOpen) return
    const rowIdSet = new Set(rowIds)
    const changedRows = nextRows.filter((row) => rowIdSet.has(row.id))
    if (!changedRows.length) return

    try {
      const additionalMasterData = await loadMasterDataStoreForRows({
        rows: changedRows,
        mapping: selectedMapping,
      })
      const nextMasterData = mergeMasterDataStore(masterDataStore ?? {}, additionalMasterData)
      setMasterDataStore(nextMasterData)

      const refreshed = refreshDerivedCsvRows({
        rows: nextRows,
        mapping: selectedMapping,
        masterData: nextMasterData,
        existingIssues: issues,
      })
      const nextIssues = validateCsvRows(refreshed.rows, refreshed.issues)
      if (options.commitRows) {
        setRows(refreshed.rows)
        setHasUnsavedChanges(false)
      }
      setDraftRows(refreshed.rows)
      setIssues(nextIssues)
    } catch {
      toast.error("lookupデータの更新に失敗しました。")
    }
  }

  function applyRowUpdate(nextRows: CsvWorkingRow[], deletedRowIds: string[] = []) {
    const deletedRowIdSet = new Set(deletedRowIds)
    const renumberedRows = renumberRows(nextRows)
    const nextExistingIssues = deletedRowIdSet.size
      ? issues.filter((issue) => !issue.rowId || !deletedRowIdSet.has(issue.rowId))
      : issues

    if (selectedMapping) {
      const refreshed = refreshDerivedCsvRows({
        rows: renumberedRows,
        mapping: selectedMapping,
        masterData: masterDataStore ?? {},
        existingIssues: nextExistingIssues,
      })
      const nextIssues = validateCsvRows(refreshed.rows, refreshed.issues)
      setDraftRows(refreshed.rows)
      setIssues(nextIssues)
    } else {
      setDraftRows(renumberedRows)
      setIssues(validateCsvRows(renumberedRows, nextExistingIssues))
    }

    setSortState(null)
    setHasUnsavedChanges(true)
  }

  function getVisibleOrderedDraftRows(visibleRowIds: string[]) {
    const rowsById = new Map(draftRows.map((row) => [row.id, row]))
    const visibleRows = visibleRowIds
      .map((rowId) => rowsById.get(rowId))
      .filter((row): row is CsvWorkingRow => Boolean(row))
    const remainingRows = draftRows.filter((row) => !visibleRowIds.includes(row.id))

    return [...visibleRows, ...remainingRows]
  }

  function insertRowsBelowSelection(action: CsvRowContextAction) {
    if (!sessionOpen || !selectedMapping) return
    const selectedRowIdSet = new Set(action.selectedRowIds)
    const orderedRows = getVisibleOrderedDraftRows(action.visibleRowIds)
    const insertIndex = orderedRows.reduce((lastIndex, row, index) => {
      return selectedRowIdSet.has(row.id) ? index : lastIndex
    }, -1)
    if (insertIndex < 0) return

    const blankRows = makeBlankCsvRows(selectedMapping, Math.max(1, action.selectedRowIds.length))
    const nextRows = [
      ...orderedRows.slice(0, insertIndex + 1),
      ...blankRows,
      ...orderedRows.slice(insertIndex + 1),
    ]
    applyRowUpdate(nextRows)
    toast.success(`${blankRows.length} 行を追加しました。`)
  }

  function deleteSelectedRows(action: CsvRowContextAction) {
    if (!sessionOpen) return
    const selectedRowIdSet = new Set(action.selectedRowIds)
    if (!selectedRowIdSet.size) return
    const orderedRows = getVisibleOrderedDraftRows(action.visibleRowIds)
    const nextRows = orderedRows.filter((row) => !selectedRowIdSet.has(row.id))

    applyRowUpdate(nextRows, action.selectedRowIds)
    toast.success(`${action.selectedRowIds.length} 行を削除しました。`)
  }

  async function maybeFillStaticColumn(rowId: string, column: CsvColumnLetter, value: string) {
    if (!selectedMapping || !sessionOpen) return
    const editedCell = draftRows.find((row) => row.id === rowId)?.values[column]
    if (!editedCell?.edited) return
    const entry = getColumnEntry(selectedMapping, column)
    if (!entry || !getEntryColumns(entry).includes(column)) return
    const isStaticColumn =
      entry.dataSource === "fixedValue" ||
      (entry.dataSource === "orderFile" && entry.orderFileMode === "fixedCell")
    if (!isStaticColumn) return

    const shouldFill = await confirmDialog.confirm({
      description: "同じ値をこの列の残りすべての行に入力しますか。",
    })
    if (!shouldFill) return

    const nextRows = draftRows.map((row) => {
      if (row.id === rowId) return row
      const currentCell = row.values[column]
      return {
        ...row,
        values: {
          ...row.values,
          [column]: {
            column,
            columnName: currentCell?.columnName ?? column,
            value,
            rawValue: value,
            source: currentCell?.source ?? "manualInput",
            mappingEntryId: currentCell?.mappingEntryId,
            edited: true,
            issueTypes: currentCell?.issueTypes,
          },
        },
      }
    })

    if (selectedMapping) {
      const refreshed = refreshDerivedCsvRows({
        rows: nextRows,
        mapping: selectedMapping,
        masterData: masterDataStore ?? {},
        existingIssues: issues,
      })
      setDraftRows(refreshed.rows)
      setIssues(refreshed.issues)
    } else {
      setDraftRows(nextRows)
    }
    setHasUnsavedChanges(true)
  }

  async function maybeOpenMasterDataSaveDialog(
    rowId: string,
    column: CsvColumnLetter,
    value: string
  ) {
    if (!selectedMapping || !sessionOpen) return
    const row = draftRows.find((draftRow) => draftRow.id === rowId)
    const cell = row?.values[column]
    if (!row || !cell || cell.source !== "masterLookup" || !cell.mappingEntryId) return
    if (!value.trim()) return

    const originalValue = rows.find((savedRow) => savedRow.id === rowId)?.values[column]?.value ?? ""
    if (value === originalValue) return

    const entry = selectedMapping.entries.find((mappingEntry) => mappingEntry.id === cell.mappingEntryId)
    if (!entry || entry.dataSource !== "masterLookup" || !entry.lookupCollection) return
    if (!shouldQueueMasterDataSave({ rowId, column, cell, entry })) return

    const shouldSave = await confirmDialog.confirm({
      description: "マスタデータに保存しますか？",
    })
    if (!shouldSave) return

    try {
      const configs = await masterCollectionConfigRepository.list()
      const config = configs.find(
        (masterConfig) => masterConfig.collectionName === entry.lookupCollection
      )
      if (!config) {
        toast.error("マスタデータ設定が見つかりません。")
        return
      }

      const draft = buildMasterDataDraftFromCsvRow({
        config,
        entry,
        row,
        editedValue: value,
      })
      const editKey = getMasterDataEditKey({
        mappingId: selectedMapping.id,
        rowId,
        column,
        value,
      })
      setPendingMasterDataSave({
        config,
        entry,
        row,
        column,
        editKey,
        draft,
      })
      setMasterDataDraft(draft)
    } catch {
      toast.error("マスタデータ設定を読み込めませんでした。")
    }
  }

  function shouldQueueMasterDataSave(input: {
    rowId: string
    column: CsvColumnLetter
    cell: NonNullable<CsvWorkingRow["values"][CsvColumnLetter]>
    entry: ImportMappingEntry
  }) {
    if (input.entry.dataSource !== "masterLookup" || !input.entry.lookupCollection) return false

    const originalRow = rows.find((savedRow) => savedRow.id === input.rowId)
    const originalCell = originalRow?.values[input.column]
    if (!originalCell || originalCell.source !== "masterLookup") return false
    if (String(originalCell.value ?? "").trim()) return false

    const lookupColumn = input.entry.lookupCsvColumn
    const lookupValue = lookupColumn
      ? String(originalRow?.values[lookupColumn]?.value ?? "").trim()
      : ""

    return Boolean(lookupValue && String(input.cell.value ?? "").trim())
  }

  function commitCell(rowId: string, column: CsvColumnLetter, value: string) {
    if (sessionOpen && selectedMapping) {
      const nextRows = applyEditsToRows(draftRows, [{ rowId, column, value }])
      void refreshLookupForEditedRows(nextRows, [rowId])
    }
    void maybeFillStaticColumn(rowId, column, value)
  }

  function openPendingMasterDataDialog(queue: PendingMasterDataSave[]) {
    const [nextSave, ...remainingQueue] = queue
    if (!nextSave) {
      setPendingMasterDataSave(null)
      setPendingMasterDataQueue([])
      setMasterDataDraft({})
      return
    }

    setPendingMasterDataSave(nextSave)
    setPendingMasterDataQueue(remainingQueue)
    setMasterDataDraft(nextSave.draft)
  }

  async function collectPendingMasterDataSaves() {
    if (!selectedMapping || !sessionOpen) return []

    const configs = await masterCollectionConfigRepository.list()
    const configsByCollection = new Map(
      configs.map((config) => [config.collectionName, config])
    )
    const pendingByKey = new Map<string, PendingMasterDataSave>()

    draftRows.forEach((row) => {
      Object.entries(row.values).forEach(([column, cell]) => {
        if (!cell || !cell.edited || cell.source !== "masterLookup" || !cell.mappingEntryId) return
        if (!cell.value.trim()) return

        const entry = selectedMapping.entries.find(
          (mappingEntry) => mappingEntry.id === cell.mappingEntryId
        )
        if (!entry || entry.dataSource !== "masterLookup" || !entry.lookupCollection) return
        if (
          !shouldQueueMasterDataSave({
            rowId: row.id,
            column: column as CsvColumnLetter,
            cell,
            entry,
          })
        ) {
          return
        }

        const editKey = getMasterDataEditKey({
          mappingId: selectedMapping.id,
          rowId: row.id,
          column: column as CsvColumnLetter,
          value: cell.value,
        })
        if (savedMasterDataEditKeys.has(editKey) || pendingByKey.has(editKey)) return

        const config = configsByCollection.get(entry.lookupCollection)
        if (!config) return

        const draft = buildMasterDataDraftFromCsvRow({
          config,
          entry,
          row,
          editedValue: cell.value,
        })
        pendingByKey.set(editKey, {
          config,
          entry,
          row,
          column: column as CsvColumnLetter,
          editKey,
          draft,
        })
      })
    })

    return [...pendingByKey.values()]
  }

  async function openMasterDataInputQueue() {
    try {
      const queue = await collectPendingMasterDataSaves()
      if (!queue.length) {
        toast.info("マスタデータに入力する未保存のlookup編集はありません。")
        return
      }
      openPendingMasterDataDialog(queue)
    } catch {
      toast.error("マスタデータ設定を読み込めませんでした。")
    }
  }

  function skipPendingMasterData() {
    openPendingMasterDataDialog(pendingMasterDataQueue)
  }

  async function savePendingMasterData() {
    if (!pendingMasterDataSave) return
    const keyField = pendingMasterDataSave.config.fields[0] ?? ""
    if (!String(masterDataDraft[keyField] ?? "").trim()) {
      toast.error(`${keyField} を入力してください。`)
      return
    }

    setSavingMasterData(true)
    try {
      const saved = await createDynamicMasterDataRecord(
        pendingMasterDataSave.config,
        masterDataDraft
      )
      clearCsvMasterDataLookupCache()
      const collectionName = pendingMasterDataSave.config.collectionName
      setMasterDataStore((currentStore) => ({
        ...(currentStore ?? {}),
        [collectionName]: [
          ...((currentStore?.[collectionName] as Array<Record<string, unknown>> | undefined) ?? []),
          saved as Record<string, unknown>,
        ],
      }))
      setSavedMasterDataEditKeys((currentKeys) => {
        const nextKeys = new Set(currentKeys)
        nextKeys.add(pendingMasterDataSave.editKey)
        return nextKeys
      })
      openPendingMasterDataDialog(pendingMasterDataQueue)
      toast.success("マスタデータに保存しました。")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "マスタデータを保存できませんでした。")
    } finally {
      setSavingMasterData(false)
    }
  }

  function updateCell(rowId: string, column: CsvColumnLetter, value: string) {
    applyCellEdits([{ rowId, column, value }])
  }

  function updateManualValue(entryId: string, value: string) {
    setManualValues((currentValues) => {
      const nextValues = {
        ...currentValues,
        [entryId]: value,
      }
      storeLatestManualValues(selectedMappingId, nextValues)
      return nextValues
    })
  }

  function saveEdits() {
    if (!sessionOpen) return
    const nextRows = cloneRows(draftRows)
    const cleanedIssues = removeResolvedCellIssues(nextRows, issues)
    const nextIssues = validateCsvRows(nextRows, cleanedIssues)
    setRows(nextRows)
    setDraftRows(cloneRows(nextRows))
    setIssues(nextIssues)
    setHasUnsavedChanges(false)
    toast.success("変更を保存しました。")
  }

  function discardEdits() {
    if (!sessionOpen) return
    setDraftRows(cloneRows(rows))
    setHasUnsavedChanges(false)
    toast.info("変更を破棄しました。")
  }

  async function exportCsv() {
    if (!sessionOpen) {
      toast.error("先に新規セッションを開始してください。")
      return
    }
    if (!selectedMapping || !rows.length) {
      toast.error("エクスポートするデータがありません。")
      return
    }
    if (hasUnsavedChanges) {
      const shouldContinue = await confirmDialog.confirm({
        description: "未保存の変更があります。保存せずにエクスポートしますか。",
      })
      if (!shouldContinue) return
    }
    if (issues.length) {
      const shouldContinue = await confirmDialog.confirm({
        description: `未解決の警告が${issues.length}件あります。空欄を含むCSVを出力しますか。`,
      })
      if (!shouldContinue) return
    }

    const csv = exportRowsToCsv(rows, selectedMapping, { bom: true })
    downloadCsv(csv, makeExportName(sourceFileName))
    toast.success("CSVをエクスポートしました。")
  }

  const table = selectedMapping ? (
    <CsvWorkingTable
      mapping={selectedMapping}
      rows={draftRows}
      columns={visibleColumns}
      columnWidths={columnWidths}
      hiddenColumns={hiddenColumns}
      sortState={sortState}
      issueByCell={issueByCell}
      onChangeCell={updateCell}
      onPasteCells={applyCellEdits}
      onCommitCell={commitCell}
      onChangeColumnWidth={(column, width) => {
        setColumnWidths((currentWidths) => ({ ...currentWidths, [column]: width }))
      }}
      onToggleColumn={(column) => {
        setHiddenColumns((currentColumns) =>
          currentColumns.includes(column)
            ? currentColumns.filter((currentColumn) => currentColumn !== column)
            : [...currentColumns, column]
        )
      }}
      onChangeSort={setSortState}
      onInsertRowsBelow={insertRowsBelowSelection}
      onDeleteRows={deleteSelectedRows}
      expanded={isExpanded}
    />
  ) : null
  const manualInputPanel = manualInputs.length ? (
    <ManualInputPanel
      manualInputs={manualInputs}
      manualValues={manualValues}
      disabled={!sessionOpen || processing}
      onChange={updateManualValue}
      onCommit={() => void rebuildWithManualValues()}
    />
  ) : null

  return (
    <div className="flex flex-col gap-4 px-4 md:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">CSV作成</h1>
          <p className="text-sm text-muted-foreground">
            マッピングを選択して注文ファイルからCSVを作成します。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={startNewSession} disabled={mappingLoading || processing}>
            <FilePlus2 className="size-4" />
            新規セッション
          </Button>
          <Button
            type="button"
            variant={displayMode === "compact" ? "default" : "outline"}
            onClick={() => setDisplayMode("compact")}
            disabled={!sessionOpen || !rows.length}
          >
            <EyeOff className="size-4" />
            簡易表示
          </Button>
          <Button
            type="button"
            variant={displayMode === "full" ? "default" : "outline"}
            onClick={() => setDisplayMode("full")}
            disabled={!sessionOpen || !rows.length}
          >
            <Eye className="size-4" />
            全項目表示
          </Button>
          <Button type="button" variant="outline" onClick={() => setIsExpanded(true)} disabled={!sessionOpen || !rows.length}>
            <Maximize2 className="size-4" />
            大きく表示
          </Button>
          <Button type="button" variant="outline" onClick={discardEdits} disabled={!sessionOpen || !hasUnsavedChanges}>
            <X className="size-4" />
            変更を破棄
          </Button>
          <Button type="button" variant="outline" onClick={() => void openMasterDataInputQueue()} disabled={!sessionOpen || !rows.length}>
            <FilePlus2 className="size-4" />
            マスタデータ入力
          </Button>
          <Button type="button" onClick={saveEdits} disabled={!sessionOpen || !hasUnsavedChanges}>
            <Save className="size-4" />
            保存
          </Button>
          <Button type="button" onClick={() => void exportCsv()} disabled={!sessionOpen || !rows.length}>
            <Download className="size-4" />
            CSV出力
          </Button>
        </div>
      </div>

      <div className="grid gap-3 rounded-md border bg-background p-4 lg:grid-cols-[minmax(260px,360px)_minmax(0,1fr)]">
        <div className="grid gap-2">
          <Label>マッピング</Label>
          <Select
            value={selectedMappingId}
            onValueChange={async (value) => {
              if (!sessionOpen) return
              if (hasUnsavedChanges) {
                const shouldChange = await confirmDialog.confirm({
                  description: "未保存の変更を破棄してマッピングを変更しますか。",
                })
                if (!shouldChange) return
              }
              setSelectedMappingId(value)
              setRows([])
              setDraftRows([])
              setIssues([])
              setColumnWidths({})
              setHiddenColumns([])
              setSortState(null)
              setLastExcel(null)
              setSourceFileName("")
              setManualInputs([])
              setManualValues(loadLatestManualValues(value))
              setHasUnsavedChanges(false)
            }}
            disabled={!sessionOpen || mappingLoading || processing}
          >
            <SelectTrigger>
              <SelectValue placeholder="マッピングを選択" />
            </SelectTrigger>
            <SelectContent>
              {mappings.map((mapping) => (
                <SelectItem key={mapping.id} value={mapping.id} disabled={!isMappingUsable(mapping)}>
                  {mapping.name}
                  {!isMappingUsable(mapping) ? "（使用不可）" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label>注文ファイル</Label>
          <div className="flex flex-wrap gap-2">
            <Input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".xls,.xlsx,.xlsm,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(event) => {
                const files = Array.from(event.target.files ?? [])
                if (files.length) void handleFiles(files)
              }}
              disabled={!sessionOpen || !selectedMapping || processing}
              className="max-w-xl"
            />
            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={!sessionOpen || processing}>
              <Upload className="size-4" />
              アップロード
            </Button>
            <Button type="button" variant="outline" onClick={() => void rebuildWithManualValues()} disabled={!sessionOpen || !lastExcel || processing}>
              <RefreshCw className="size-4" />
              再処理
            </Button>
          </div>
        </div>
      </div>

      <StatusPanel
        sessionOpen={sessionOpen}
        sourceFileName={sourceFileName}
        rowCount={rows.length}
        summary={issueSummary}
        processing={processing}
      />

      <div className="min-h-96 rounded-md border bg-background">
        {rows.length ? (
          <div className="flex min-h-96 flex-col">
            {manualInputPanel ? <div className="border-b p-3">{manualInputPanel}</div> : null}
            <div className="min-h-0 flex-1">{table}</div>
          </div>
        ) : (
          <div className="flex min-h-96 flex-col items-center justify-center gap-3 p-8 text-center text-sm text-muted-foreground">
            <FileSpreadsheet className="size-10" />
            <div>マッピングを選択して注文ファイルをアップロードしてください。</div>
          </div>
        )}
      </div>

      <Dialog
        open={Boolean(pendingMasterDataSave)}
        onOpenChange={(open) => {
          if (open) return
          setPendingMasterDataSave(null)
          setPendingMasterDataQueue([])
          setMasterDataDraft({})
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>マスタデータ保存</DialogTitle>
            <DialogDescription>
              CSVの入力内容をマスタデータに保存します。
            </DialogDescription>
          </DialogHeader>
          {pendingMasterDataSave ? (
            <div className="grid max-h-[60vh] gap-3 overflow-auto py-1">
              <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
                <div className="font-medium">{pendingMasterDataSave.config.displayName}</div>
                <div className="text-xs text-muted-foreground">
                  データリストID: {pendingMasterDataSave.config.collectionName}
                </div>
              </div>
              {pendingMasterDataSave.config.fields.map((field) => (
                <div key={field} className="grid gap-2">
                  <Label>{field}</Label>
                  <Input
                    value={String(masterDataDraft[field] ?? "")}
                    onChange={(event) =>
                      setMasterDataDraft((currentDraft) => ({
                        ...currentDraft,
                        [field]: event.target.value,
                      }))
                    }
                  />
                </div>
              ))}
            </div>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setPendingMasterDataSave(null)
                setPendingMasterDataQueue([])
                setMasterDataDraft({})
              }}
              disabled={savingMasterData}
            >
              キャンセル
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={skipPendingMasterData}
              disabled={savingMasterData}
            >
              保存しない
            </Button>
            <Button type="button" onClick={() => void savePendingMasterData()} disabled={savingMasterData}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isExpanded && selectedMapping ? (
        <div className="fixed inset-4 z-50 flex flex-col rounded-md border bg-background shadow-2xl">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b p-3">
            <div className="grid min-w-[280px] max-w-xl flex-1 gap-2">
              <div className="font-medium">CSVプレビュー</div>
              {manualInputPanel}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant={displayMode === "compact" ? "default" : "outline"} onClick={() => setDisplayMode("compact")}>
                <EyeOff className="size-4" />
                簡易表示
              </Button>
              <Button size="sm" variant={displayMode === "full" ? "default" : "outline"} onClick={() => setDisplayMode("full")}>
                <Eye className="size-4" />
                全項目表示
              </Button>
              <Button size="sm" variant="outline" onClick={discardEdits} disabled={!hasUnsavedChanges}>
                <X className="size-4" />
                変更を破棄
              </Button>
              <Button size="sm" variant="outline" onClick={() => void openMasterDataInputQueue()}>
                <FilePlus2 className="size-4" />
                マスタデータ入力
              </Button>
              <Button size="sm" onClick={saveEdits} disabled={!hasUnsavedChanges}>
                <Save className="size-4" />
                保存
              </Button>
              <Button size="sm" onClick={() => void exportCsv()}>
                <Download className="size-4" />
                CSV出力
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIsExpanded(false)}>
                <X className="size-4" />
                閉じる
              </Button>
            </div>
          </div>
          <div className="min-h-0 flex-1">{table}</div>
        </div>
      ) : null}
      {confirmDialog.dialog}
    </div>
  )
}

function StatusPanel({
  sessionOpen,
  sourceFileName,
  rowCount,
  summary,
  processing,
}: {
  sessionOpen: boolean
  sourceFileName: string
  rowCount: number
  summary: ReturnType<typeof getIssueSummary>
  processing: boolean
}) {
  return (
    <div className="grid gap-2 rounded-md border bg-background p-4 text-sm md:grid-cols-6">
      <StatusItem label="セッション" value={sessionOpen ? "作業中" : "未開始"} />
      <StatusItem label="ファイル" value={sourceFileName || "-"} />
      <StatusItem label="行数" value={rowCount ? `${rowCount}行` : "-"} />
      <StatusItem label="警告" value={`${summary.total}件`} />
      <StatusItem label="マスタ未登録" value={`${summary.lookup}件`} />
      <StatusItem label="状態" value={processing ? "処理中" : rowCount ? "確認中" : "未処理"} />
    </div>
  )
}

function StatusItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="truncate font-medium">{value}</div>
    </div>
  )
}

function ManualInputPanel({
  manualInputs,
  manualValues,
  disabled,
  onChange,
  onCommit,
}: {
  manualInputs: CsvManualInput[]
  manualValues: Record<string, string>
  disabled: boolean
  onChange: (entryId: string, value: string) => void
  onCommit: () => void
}) {
  return (
    <div className="grid max-w-2xl gap-3 md:grid-cols-3">
      {manualInputs.map((manualInput) => (
        <div key={manualInput.entryId} className="grid min-w-[220px] gap-2">
          <Label>{manualInput.label}</Label>
          <Input
            value={manualValues[manualInput.entryId] ?? manualInput.value}
            onChange={(event) => onChange(manualInput.entryId, event.target.value)}
            onBlur={onCommit}
            disabled={disabled}
            placeholder="値を入力"
          />
        </div>
      ))}
    </div>
  )
}

function estimateTextWidth(value: string) {
  return Array.from(value).reduce((width, char) => {
    return width + (/[\u3000-\u9fff\uac00-\ud7af\uff00-\uffef]/.test(char) ? 14 : 7)
  }, 0)
}

function getAutoColumnWidth(mapping: ImportMappingConfig, rows: CsvWorkingRow[], column: CsvColumnLetter) {
  const headerWidth = estimateTextWidth(getColumnLabel(mapping, column))
  const contentWidth = rows.slice(0, 120).reduce((width, row) => {
    return Math.max(width, estimateTextWidth(row.values[column]?.value ?? ""))
  }, 0)

  return Math.max(
    MIN_CSV_COLUMN_WIDTH,
    Math.min(MAX_AUTO_CSV_COLUMN_WIDTH, Math.max(headerWidth, contentWidth) + 34)
  )
}

function shouldShowCellTooltip(value: string, columnWidth: number) {
  return Boolean(value.trim()) && estimateTextWidth(value) > columnWidth - 24
}

function CsvWorkingTable({
  mapping,
  rows,
  columns,
  columnWidths,
  hiddenColumns,
  sortState,
  issueByCell,
  onChangeCell,
  onPasteCells,
  onCommitCell,
  onChangeColumnWidth,
  onToggleColumn,
  onChangeSort,
  onInsertRowsBelow,
  onDeleteRows,
  expanded,
}: {
  mapping: ImportMappingConfig
  rows: CsvWorkingRow[]
  columns: CsvColumnLetter[]
  columnWidths: Partial<Record<CsvColumnLetter, number>>
  hiddenColumns: CsvColumnLetter[]
  sortState: CsvSortState | null
  issueByCell: Map<string, CsvValidationIssue[]>
  onChangeCell: (rowId: string, column: CsvColumnLetter, value: string) => void
  onPasteCells: (edits: CsvCellEdit[]) => void
  onCommitCell: (rowId: string, column: CsvColumnLetter, value: string) => void
  onChangeColumnWidth: (column: CsvColumnLetter, width: number) => void
  onToggleColumn: (column: CsvColumnLetter) => void
  onChangeSort: (sortState: CsvSortState | null) => void
  onInsertRowsBelow: (action: CsvRowContextAction) => void
  onDeleteRows: (action: CsvRowContextAction) => void
  expanded: boolean
}) {
  const [selection, setSelection] = useState<CsvCellSelection | null>(null)
  const [rowContextMenu, setRowContextMenu] = useState<{
    x: number
    y: number
    action: CsvRowContextAction
  } | null>(null)
  const selectingRef = useRef(false)
  const cellInputRefs = useRef(new Map<string, HTMLInputElement>())
  const visibleTableColumns = useMemo(
    () => columns.filter((column) => !hiddenColumns.includes(column)),
    [columns, hiddenColumns]
  )
  const effectiveColumns = visibleTableColumns.length ? visibleTableColumns : columns.slice(0, 1)
  const sortedRows = useMemo(() => {
    if (!sortState) return rows

    return [...rows].sort((a, b) => {
      const aValue = a.values[sortState.column]?.value ?? ""
      const bValue = b.values[sortState.column]?.value ?? ""
      const aNumber = Number(aValue)
      const bNumber = Number(bValue)
      const bothNumeric = aValue !== "" && bValue !== "" && Number.isFinite(aNumber) && Number.isFinite(bNumber)
      const result = bothNumeric
        ? aNumber - bNumber
        : String(aValue).localeCompare(String(bValue), "ja", { numeric: true, sensitivity: "base" })

      return sortState.direction === "asc" ? result : -result
    })
  }, [rows, sortState])
  const autoColumnWidths = useMemo(() => {
    return Object.fromEntries(
      columns.map((column) => [column, getAutoColumnWidth(mapping, rows, column)])
    ) as Partial<Record<CsvColumnLetter, number>>
  }, [columns, mapping, rows])

  useEffect(() => {
    function stopSelecting() {
      selectingRef.current = false
    }

    window.addEventListener("mouseup", stopSelecting)
    return () => window.removeEventListener("mouseup", stopSelecting)
  }, [])

  useEffect(() => {
    if (!rowContextMenu) return

    function closeMenu() {
      setRowContextMenu(null)
    }

    window.addEventListener("click", closeMenu)
    window.addEventListener("resize", closeMenu)
    window.addEventListener("scroll", closeMenu, true)
    return () => {
      window.removeEventListener("click", closeMenu)
      window.removeEventListener("resize", closeMenu)
      window.removeEventListener("scroll", closeMenu, true)
    }
  }, [rowContextMenu])

  function getColumnWidth(column: CsvColumnLetter) {
    return columnWidths[column] ?? autoColumnWidths[column] ?? DEFAULT_CSV_COLUMN_WIDTH
  }

  function toggleSort(column: CsvColumnLetter) {
    if (!sortState || sortState.column !== column) {
      onChangeSort({ column, direction: "asc" })
      return
    }
    if (sortState.direction === "asc") {
      onChangeSort({ column, direction: "desc" })
      return
    }
    onChangeSort(null)
  }

  function startResize(event: ReactMouseEvent<HTMLButtonElement>, column: CsvColumnLetter) {
    event.preventDefault()
    event.stopPropagation()

    const startX = event.clientX
    const startWidth = getColumnWidth(column)

    function handleMouseMove(moveEvent: MouseEvent) {
      const nextWidth = Math.max(MIN_CSV_COLUMN_WIDTH, startWidth + moveEvent.clientX - startX)
      onChangeColumnWidth(column, Math.round(nextWidth))
    }

    function handleMouseUp() {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)
  }

  function parseClipboardMatrix(text: string) {
    return text
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .split("\n")
      .filter((line, index, lines) => index < lines.length - 1 || line.length > 0)
      .map((line) => line.split("\t"))
  }

  function handlePaste(
    event: ReactClipboardEvent<HTMLInputElement>,
    startRowId: string,
    startColumn: CsvColumnLetter
  ) {
    const text = event.clipboardData.getData("text")
    if (!text.includes("\t") && !text.includes("\n")) return

    const startRowIndex = sortedRows.findIndex((row) => row.id === startRowId)
    const startColumnIndex = effectiveColumns.indexOf(startColumn)
    if (startRowIndex < 0 || startColumnIndex < 0) return

    const matrix = parseClipboardMatrix(text)
    const edits: CsvCellEdit[] = []
    matrix.forEach((values, rowOffset) => {
      const row = sortedRows[startRowIndex + rowOffset]
      if (!row) return
      values.forEach((value, columnOffset) => {
        const column = effectiveColumns[startColumnIndex + columnOffset]
        if (!column) return
        edits.push({ rowId: row.id, column, value })
      })
    })

    if (!edits.length) return
    event.preventDefault()
    onPasteCells(edits)
  }

  function getSelectionBounds(currentSelection = selection) {
    if (!currentSelection) return null
    const startRowIndex = sortedRows.findIndex((row) => row.id === currentSelection.startRowId)
    const endRowIndex = sortedRows.findIndex((row) => row.id === currentSelection.endRowId)
    const startColumnIndex = effectiveColumns.indexOf(currentSelection.startColumn)
    const endColumnIndex = effectiveColumns.indexOf(currentSelection.endColumn)
    if (startRowIndex < 0 || endRowIndex < 0 || startColumnIndex < 0 || endColumnIndex < 0) return null

    return {
      rowStart: Math.min(startRowIndex, endRowIndex),
      rowEnd: Math.max(startRowIndex, endRowIndex),
      columnStart: Math.min(startColumnIndex, endColumnIndex),
      columnEnd: Math.max(startColumnIndex, endColumnIndex),
    }
  }

  function isCellSelected(rowId: string, column: CsvColumnLetter) {
    const bounds = getSelectionBounds()
    if (!bounds) return false
    const rowIndex = sortedRows.findIndex((row) => row.id === rowId)
    const columnIndex = effectiveColumns.indexOf(column)
    return (
      rowIndex >= bounds.rowStart &&
      rowIndex <= bounds.rowEnd &&
      columnIndex >= bounds.columnStart &&
      columnIndex <= bounds.columnEnd
    )
  }

  function getSelectedRowIdsFromBounds(bounds: NonNullable<ReturnType<typeof getSelectionBounds>>) {
    const rowIds: string[] = []
    for (let rowIndex = bounds.rowStart; rowIndex <= bounds.rowEnd; rowIndex += 1) {
      const row = sortedRows[rowIndex]
      if (row) rowIds.push(row.id)
    }
    return rowIds
  }

  function hasMultiCellSelection() {
    const bounds = getSelectionBounds()
    if (!bounds) return false
    return bounds.rowEnd > bounds.rowStart || bounds.columnEnd > bounds.columnStart
  }

  function getSelectedText() {
    const bounds = getSelectionBounds()
    if (!bounds) return ""

    const lines: string[] = []
    for (let rowIndex = bounds.rowStart; rowIndex <= bounds.rowEnd; rowIndex += 1) {
      const row = sortedRows[rowIndex]
      const values: string[] = []
      for (let columnIndex = bounds.columnStart; columnIndex <= bounds.columnEnd; columnIndex += 1) {
        const column = effectiveColumns[columnIndex]
        values.push(row.values[column]?.value ?? "")
      }
      lines.push(values.join("\t"))
    }
    return lines.join("\n")
  }

  function getSelectedClearEdits() {
    const bounds = getSelectionBounds()
    if (!bounds) return []

    const edits: CsvCellEdit[] = []
    for (let rowIndex = bounds.rowStart; rowIndex <= bounds.rowEnd; rowIndex += 1) {
      const row = sortedRows[rowIndex]
      for (let columnIndex = bounds.columnStart; columnIndex <= bounds.columnEnd; columnIndex += 1) {
        const column = effectiveColumns[columnIndex]
        edits.push({ rowId: row.id, column, value: "" })
      }
    }
    return edits
  }

  function startCellSelection(rowId: string, column: CsvColumnLetter) {
    selectingRef.current = true
    setSelection({ startRowId: rowId, startColumn: column, endRowId: rowId, endColumn: column })
  }

  function extendCellSelection(rowId: string, column: CsvColumnLetter) {
    if (!selectingRef.current) return
    setSelection((currentSelection) =>
      currentSelection
        ? { ...currentSelection, endRowId: rowId, endColumn: column }
        : { startRowId: rowId, startColumn: column, endRowId: rowId, endColumn: column }
    )
  }

  function openRowContextMenu(
    event: ReactMouseEvent<HTMLElement>,
    rowId: string,
    column: CsvColumnLetter
  ) {
    event.preventDefault()
    event.stopPropagation()
    selectingRef.current = false

    const currentBounds = getSelectionBounds()
    const clickedRowIndex = sortedRows.findIndex((row) => row.id === rowId)
    const clickedColumnIndex = effectiveColumns.indexOf(column)
    const clickedInsideSelection =
      currentBounds &&
      clickedRowIndex >= currentBounds.rowStart &&
      clickedRowIndex <= currentBounds.rowEnd &&
      clickedColumnIndex >= currentBounds.columnStart &&
      clickedColumnIndex <= currentBounds.columnEnd
    const nextSelection = clickedInsideSelection
      ? selection
      : { startRowId: rowId, startColumn: column, endRowId: rowId, endColumn: column }

    if (!clickedInsideSelection) setSelection(nextSelection)

    const nextBounds = getSelectionBounds(nextSelection)
    const selectedRowIds = nextBounds ? getSelectedRowIdsFromBounds(nextBounds) : [rowId]

    setRowContextMenu({
      x: event.clientX,
      y: event.clientY,
      action: {
        anchorRowId: rowId,
        selectedRowIds,
        visibleRowIds: sortedRows.map((row) => row.id),
      },
    })
  }

  function handleCopy(event: ReactClipboardEvent<HTMLInputElement>) {
    if (!selection || !hasMultiCellSelection()) return
    event.preventDefault()
    event.clipboardData.setData("text/plain", getSelectedText())
  }

  function handleCut(event: ReactClipboardEvent<HTMLInputElement>) {
    if (!selection || !hasMultiCellSelection()) return
    event.preventDefault()
    event.clipboardData.setData("text/plain", getSelectedText())
    onPasteCells(getSelectedClearEdits())
  }

  function focusCell(rowIndex: number, columnIndex: number) {
    const nextRow = sortedRows[rowIndex]
    const nextColumn = effectiveColumns[columnIndex]
    if (!nextRow || !nextColumn) return

    setSelection({
      startRowId: nextRow.id,
      startColumn: nextColumn,
      endRowId: nextRow.id,
      endColumn: nextColumn,
    })
    window.requestAnimationFrame(() => {
      const input = cellInputRefs.current.get(getCellKey(nextRow.id, nextColumn))
      input?.focus()
      input?.select()
    })
  }

  function handleKeyDown(
    event: ReactKeyboardEvent<HTMLInputElement>,
    rowId: string,
    column: CsvColumnLetter
  ) {
    if (event.key === "Delete" || event.key === "Backspace") {
      if (!hasMultiCellSelection()) return
      event.preventDefault()
      onPasteCells(getSelectedClearEdits())
      return
    }
    if (!["Enter", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) return

    const rowIndex = sortedRows.findIndex((row) => row.id === rowId)
    const columnIndex = effectiveColumns.indexOf(column)
    if (rowIndex < 0 || columnIndex < 0) return

    let nextRowIndex = rowIndex
    let nextColumnIndex = columnIndex
    if (event.key === "Enter") nextRowIndex += event.shiftKey ? -1 : 1
    if (event.key === "ArrowUp") nextRowIndex -= 1
    if (event.key === "ArrowDown") nextRowIndex += 1
    if (event.key === "ArrowLeft") nextColumnIndex -= 1
    if (event.key === "ArrowRight") nextColumnIndex += 1

    if (
      nextRowIndex < 0 ||
      nextRowIndex >= sortedRows.length ||
      nextColumnIndex < 0 ||
      nextColumnIndex >= effectiveColumns.length
    ) {
      return
    }

    event.preventDefault()
    focusCell(nextRowIndex, nextColumnIndex)
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2 border-b bg-background px-3 py-2">
        <div className="text-xs text-muted-foreground">
          {effectiveColumns.length}/{columns.length} 列表示
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" size="sm" variant="outline">
              <Columns3 className="size-4" />
              列
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-80 min-w-56">
            <DropdownMenuLabel>表示する列</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {columns.map((column) => {
              const checked = !hiddenColumns.includes(column)
              return (
                <DropdownMenuCheckboxItem
                  key={column}
                  checked={checked}
                  disabled={checked && effectiveColumns.length <= 1}
                  onCheckedChange={() => onToggleColumn(column)}
                >
                  <span className="max-w-44 truncate">{getColumnLabel(mapping, column)}</span>
                </DropdownMenuCheckboxItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className={expanded ? "min-h-0 flex-1 overflow-auto" : "max-h-[68vh] overflow-auto"}>
      {rowContextMenu ? (
        <div
          role="menu"
          className="fixed z-[70] min-w-52 rounded-md border bg-popover p-1 text-sm text-popover-foreground shadow-lg"
          style={{ left: rowContextMenu.x, top: rowContextMenu.y }}
          onClick={(event) => event.stopPropagation()}
          onContextMenu={(event) => event.preventDefault()}
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center rounded-sm px-3 py-2 text-left outline-none hover:bg-accent focus:bg-accent"
            onClick={() => {
              onInsertRowsBelow(rowContextMenu.action)
              setRowContextMenu(null)
            }}
          >
            下に {rowContextMenu.action.selectedRowIds.length} 行を追加
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center rounded-sm px-3 py-2 text-left text-destructive outline-none hover:bg-accent focus:bg-accent"
            onClick={() => {
              onDeleteRows(rowContextMenu.action)
              setRowContextMenu(null)
            }}
          >
            選択した {rowContextMenu.action.selectedRowIds.length} 行を削除
          </button>
        </div>
      ) : null}
      <table className="w-max min-w-full table-fixed border-separate border-spacing-0 text-sm">
        <colgroup>
          <col style={{ width: 64 }} />
          {effectiveColumns.map((column) => (
            <col key={column} style={{ width: getColumnWidth(column) }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th className="sticky left-0 top-0 z-30 border-b border-r bg-muted px-3 py-2 text-left font-medium">
              行
            </th>
            {effectiveColumns.map((column) => {
              const label = getColumnLabel(mapping, column)
              const activeSort = sortState?.column === column ? sortState.direction : null
              const columnWidth = getColumnWidth(column)
              return (
                <th
                  key={column}
                  className="sticky top-0 z-20 border-b border-r bg-muted p-0 text-left font-medium"
                  style={{ width: columnWidth, minWidth: MIN_CSV_COLUMN_WIDTH }}
                >
                  <div className="relative flex h-10 items-center">
                    <button
                      type="button"
                      onClick={() => toggleSort(column)}
                      className="flex h-full min-w-0 flex-1 items-center gap-1 px-3 pr-6 text-left outline-none hover:bg-accent focus:bg-accent"
                      aria-label={`${label} sort`}
                    >
                      <span className="truncate">{label}</span>
                      {activeSort === "asc" ? (
                        <ArrowUp className="size-3.5 shrink-0 text-muted-foreground" />
                      ) : activeSort === "desc" ? (
                        <ArrowDown className="size-3.5 shrink-0 text-muted-foreground" />
                      ) : (
                        <ArrowUpDown className="size-3.5 shrink-0 text-muted-foreground" />
                      )}
                    </button>
                    <button
                      type="button"
                      onMouseDown={(event) => startResize(event, column)}
                      className="absolute right-0 top-0 flex h-full w-4 cursor-col-resize items-center justify-center text-muted-foreground hover:bg-border"
                      aria-label={`${label} resize`}
                    >
                      <GripVertical className="size-3" />
                    </button>
                  </div>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row) => (
            <tr key={row.id}>
              <td
                className="sticky left-0 z-10 border-b border-r bg-background px-3 py-2 text-muted-foreground"
                onContextMenu={(event) =>
                  openRowContextMenu(event, row.id, effectiveColumns[0])
                }
              >
                {row.rowNumber}
              </td>
              {effectiveColumns.map((column) => {
                const cell = row.values[column]
                const cellValue = cell?.value ?? ""
                const cellIssues = issueByCell.get(getCellKey(row.id, column)) ?? []
                const hasIssue = cellIssues.length > 0
                const selected = isCellSelected(row.id, column)
                const columnWidth = getColumnWidth(column)
                const showFullValue = shouldShowCellTooltip(cellValue, columnWidth)
                const cellKey = getCellKey(row.id, column)
                const input = (
                  <input
                    ref={(element) => {
                      if (element) {
                        cellInputRefs.current.set(cellKey, element)
                      } else {
                        cellInputRefs.current.delete(cellKey)
                      }
                    }}
                    value={cellValue}
                    onChange={(event) => onChangeCell(row.id, column, event.target.value)}
                    onBlur={(event) => onCommitCell(row.id, column, event.target.value)}
                    onFocus={() =>
                      setSelection({
                        startRowId: row.id,
                        startColumn: column,
                        endRowId: row.id,
                        endColumn: column,
                      })
                    }
                    onCopy={handleCopy}
                    onCut={handleCut}
                    onKeyDown={(event) => handleKeyDown(event, row.id, column)}
                    onPaste={(event) => handlePaste(event, row.id, column)}
                    className="h-9 w-full truncate bg-transparent px-3 text-sm outline-none focus:bg-background"
                    aria-label={`${getColumnLabel(mapping, column)} ${row.rowNumber}行`}
                  />
                )
                return (
                  <td
                    key={`${row.id}-${column}`}
                    className={[
                      "border-b border-r p-0",
                      hasIssue ? "bg-amber-100/70 dark:bg-amber-950/40" : "",
                      cell?.edited ? "bg-sky-50 dark:bg-sky-950/30" : "",
                      selected ? "relative bg-sky-100 outline outline-2 -outline-offset-2 outline-sky-500 dark:bg-sky-950/50" : "",
                    ].join(" ")}
                    style={{ width: columnWidth, minWidth: MIN_CSV_COLUMN_WIDTH }}
                    title={cellIssues.map((issue) => issue.message).join("\n")}
                    onMouseDown={(event) => {
                      if (event.button === 0) startCellSelection(row.id, column)
                    }}
                    onMouseEnter={() => extendCellSelection(row.id, column)}
                    onContextMenu={(event) => openRowContextMenu(event, row.id, column)}
                  >
                    {showFullValue ? (
                      <Tooltip>
                        <TooltipTrigger asChild>{input}</TooltipTrigger>
                        <TooltipContent
                          side="top"
                          align="start"
                          className="max-w-xl whitespace-pre-wrap break-words border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-lg"
                        >
                          {cellValue}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      input
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  )
}
