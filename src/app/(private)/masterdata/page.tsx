"use client"

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react"
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Copy,
  Loader2,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import * as XLSX from "xlsx"

import { useConfirmDialog } from "@/components/confirm-dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
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
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  applyDynamicMasterFieldChanges,
  createDynamicMasterDataRecord,
  createDynamicMasterDataRecords,
  deleteAllDynamicMasterDataRecords,
  deleteDynamicMasterDataRecord,
  getDynamicMasterData,
  getNextDynamicMasterDocumentIds,
  type DynamicMasterDataRecord,
  updateDynamicMasterDataRecord,
} from "@/modules/masterdata/services/masterdata-services"
import {
  masterCollectionConfigRepository,
  normalizeMasterCollectionConfig,
} from "@/modules/masterdata/services/master-collection-config-services"
import type { MasterCollectionConfig, MasterCollectionFieldConfig } from "@/types/firestore-models"

const MASTER_DATA_CHANGED_STORAGE_KEY = "master-data:changed-at"
const DEFAULT_PAGE_SIZE = 30
const PAGE_SIZE_OPTIONS = [20, 30, 50] as const

type RecordDialogMode = "create" | "edit"
type FieldDraft = MasterCollectionFieldConfig
type SearchMode = "all" | "columns"
type SearchConfig = {
  query: string
  mode: SearchMode
  fields: string[]
}
type ImportProgressState = {
  open: boolean
  status:
    | "idle"
    | "parsing"
    | "validating"
    | "checkingExisting"
    | "importing"
    | "refreshing"
    | "done"
  imported: number
  total: number
}

function notifyMasterDataChanged() {
  if (typeof window === "undefined") return
  window.localStorage.setItem(MASTER_DATA_CHANGED_STORAGE_KEY, new Date().toISOString())
}

function normalizeText(value: unknown) {
  return String(value ?? "").trim()
}

function normalizeSearchText(value: unknown) {
  return normalizeText(value).toLowerCase()
}

function normalizeFieldDrafts(fields: FieldDraft[]) {
  const seen = new Set<string>()
  return fields
    .map((field) => ({
      name: field.name.trim(),
      required: false,
      unique: false,
    }))
    .filter((field) => {
      if (!field.name || seen.has(field.name)) return false
      seen.add(field.name)
      return true
    })
}

function getFieldConfigs(config: MasterCollectionConfig) {
  return config.fields.map((field) => ({
    name: field,
    required: false,
    unique: false,
  }))
}

function getCopyCollectionName(config: MasterCollectionConfig, configs: MasterCollectionConfig[]) {
  const existingNames = new Set(configs.map((item) => item.collectionName))
  const baseName = `${config.collectionName}Copy`
  if (!existingNames.has(baseName)) return baseName

  for (let index = 2; index < 1000; index += 1) {
    const candidate = `${baseName}${index}`
    if (!existingNames.has(candidate)) return candidate
  }

  return `${baseName}${Date.now()}`
}

function makeEmptyRecord(config: MasterCollectionConfig): DynamicMasterDataRecord {
  return Object.fromEntries(config.fields.map((field) => [field, ""]))
}

function getLookupKeyField(config: MasterCollectionConfig) {
  return config.fields[0] ?? ""
}

function getLookupKeyValue(config: MasterCollectionConfig, record: DynamicMasterDataRecord) {
  return normalizeText(record[getLookupKeyField(config)])
}

function getRecordId(config: MasterCollectionConfig, record: DynamicMasterDataRecord) {
  return normalizeText(record.id) || getLookupKeyValue(config, record)
}

function matchesRecordSearch(
  config: MasterCollectionConfig,
  record: DynamicMasterDataRecord,
  searchConfig: SearchConfig
) {
  const normalizedQuery = normalizeSearchText(searchConfig.query)
  if (!normalizedQuery) return true
  const searchFields =
    searchConfig.mode === "columns" && searchConfig.fields.length
      ? searchConfig.fields.filter((field) => config.fields.includes(field))
      : config.fields

  return searchFields.some((field) =>
    normalizeSearchText(record[field]).includes(normalizedQuery)
  )
}

function getDefaultSearchConfig(): SearchConfig {
  return {
    query: "",
    mode: "all",
    fields: [],
  }
}

function getSearchConfig(
  searchByCollection: Record<string, SearchConfig>,
  collectionName: string
) {
  return searchByCollection[collectionName] ?? getDefaultSearchConfig()
}

function getPageNumbers(currentPage: number, totalPages: number) {
  const maxVisiblePages = 7
  if (totalPages <= maxVisiblePages) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const halfWindow = Math.floor(maxVisiblePages / 2)
  const startPage = Math.max(1, Math.min(currentPage - halfWindow, totalPages - maxVisiblePages + 1))
  return Array.from({ length: maxVisiblePages }, (_, index) => startPage + index)
}

function validateRecord(
  config: MasterCollectionConfig,
  record: DynamicMasterDataRecord
) {
  const errors: string[] = []
  const lookupKeyField = getLookupKeyField(config)
  const lookupKeyValue = normalizeText(record[lookupKeyField])

  if (!lookupKeyValue) {
    errors.push(`${lookupKeyField} は必須です。`)
  }

  return errors
}

type DuplicateFieldWarning = {
  field: string
  value: string
}

function collectDuplicateFieldWarnings(
  config: MasterCollectionConfig,
  recordsToSave: DynamicMasterDataRecord[],
  existingRows: DynamicMasterDataRecord[],
  excludeId = ""
) {
  const warningsByKey = new Map<string, DuplicateFieldWarning>()
  const valuesByField = new Map<string, Set<string>>()

  config.fields.forEach((field) => {
    const values = new Set<string>()
    existingRows.forEach((row) => {
      if (excludeId && getRecordId(config, row) === excludeId) return
      const value = normalizeText(row[field])
      if (value) values.add(value)
    })
    valuesByField.set(field, values)
  })

  recordsToSave.forEach((record) => {
    config.fields.forEach((field) => {
      const value = normalizeText(record[field])
      if (!value) return

      const existingValues = valuesByField.get(field) ?? new Set<string>()
      if (existingValues.has(value)) {
        warningsByKey.set(`${field}\u0000${value}`, { field, value })
      }
      existingValues.add(value)
      valuesByField.set(field, existingValues)
    })
  })

  return [...warningsByKey.values()]
}

function getDuplicateFieldWarningMessage(warnings: DuplicateFieldWarning[]) {
  if (!warnings.length) return ""

  const preview = warnings
    .slice(0, 8)
    .map((warning) => `${warning.field}: ${warning.value}`)
    .join("\n")
  const extraCount = warnings.length > 8 ? `\n...他 ${warnings.length - 8} 件` : ""
  return `既に存在する内容があります。\n${preview}${extraCount}\n保存しますか？`
}

function exportRows(
  config: MasterCollectionConfig,
  rows: DynamicMasterDataRecord[],
  extension: "csv" | "xlsx"
) {
  const data = rows.map((row) =>
    Object.fromEntries(config.fields.map((field) => [field, row[field] ?? ""]))
  )
  const worksheet = XLSX.utils.json_to_sheet(data, { header: config.fields })
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, config.collectionName.slice(0, 31))
  XLSX.writeFile(workbook, `${config.collectionName}.${extension}`)
}

function restoreScrollPosition(scrollY: number) {
  if (typeof window === "undefined") return
  window.requestAnimationFrame(() => {
    window.scrollTo({ top: scrollY, left: window.scrollX, behavior: "auto" })
  })
}

async function parseImportFile(file: File, config: MasterCollectionConfig) {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: "array" })
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!firstSheet) {
    throw new Error("Import file has no sheet.")
  }

  const rows = XLSX.utils.sheet_to_json<unknown[]>(firstSheet, {
    header: 1,
    defval: "",
    blankrows: false,
  })

  if (rows.length < 2) {
    throw new Error("Import file has no data rows.")
  }

  const headers = rows[0].map((value) => normalizeText(value))
  const headerIndexes = new Map(headers.map((header, index) => [header, index]))
  const canUseHeaderMap = config.fields.every((field) => headerIndexes.has(field))

  return rows
    .slice(1)
    .map((row) => {
      const entries = config.fields.map((field, index) => {
        const sourceIndex = canUseHeaderMap ? headerIndexes.get(field) ?? index : index
        return [field, normalizeText(row[sourceIndex])]
      })
      return Object.fromEntries(entries)
    })
    .filter((row) => config.fields.some((field) => normalizeText(row[field])))
    .map((row) => row as DynamicMasterDataRecord)
}

export default function MasterDataPage() {
  const [configs, setConfigs] = useState<MasterCollectionConfig[]>([])
  const [activeCollection, setActiveCollection] = useState("")
  const [recordsByCollection, setRecordsByCollection] = useState<
    Record<string, DynamicMasterDataRecord[]>
  >({})
  const [searchByCollection, setSearchByCollection] = useState<Record<string, SearchConfig>>({})
  const [pageSizeByCollection, setPageSizeByCollection] = useState<Record<string, number>>({})
  const [pageByCollection, setPageByCollection] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [configDialogOpen, setConfigDialogOpen] = useState(false)
  const [editingConfig, setEditingConfig] = useState<MasterCollectionConfig | null>(null)
  const [deleteConfigTarget, setDeleteConfigTarget] = useState<MasterCollectionConfig | null>(null)
  const [configDraft, setConfigDraft] = useState({
    collectionName: "",
    displayName: "",
    fields: [{ name: "", required: false, unique: false }] as FieldDraft[],
  })
  const [recordDialogOpen, setRecordDialogOpen] = useState(false)
  const [recordDialogMode, setRecordDialogMode] = useState<RecordDialogMode>("create")
  const [recordDraft, setRecordDraft] = useState<DynamicMasterDataRecord>({})
  const [editingRecordId, setEditingRecordId] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<DynamicMasterDataRecord | null>(null)
  const [deleteAllTarget, setDeleteAllTarget] = useState<MasterCollectionConfig | null>(null)
  const [importProgress, setImportProgress] = useState<ImportProgressState>({
    open: false,
    status: "idle",
    imported: 0,
    total: 0,
  })
  const importInputId = useId()
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const confirmDialog = useConfirmDialog()

  const activeConfig = useMemo(
    () => configs.find((config) => config.collectionName === activeCollection) ?? null,
    [activeCollection, configs]
  )
  const activeRows = activeConfig
    ? recordsByCollection[activeConfig.collectionName] ?? []
    : []
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const nextConfigs = await masterCollectionConfigRepository.list()
      setConfigs(nextConfigs)
      setActiveCollection((current) => current || nextConfigs[0]?.collectionName || "")

      const nextRecords = Object.fromEntries(
        await Promise.all(
          nextConfigs.map(async (config) => [
            config.collectionName,
            await getDynamicMasterData(config),
          ])
        )
      ) as Record<string, DynamicMasterDataRecord[]>
      setRecordsByCollection(nextRecords)
    } catch (error) {
      console.error(error)
      toast.error("マスタデータを読み込めませんでした。")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  function openNewConfigDialog() {
    setEditingConfig(null)
    setConfigDraft({
      collectionName: "",
      displayName: "",
      fields: [{ name: "", required: false, unique: false }],
    })
    setConfigDialogOpen(true)
  }

  function openEditConfigDialog(config: MasterCollectionConfig) {
    setEditingConfig(config)
    setConfigDraft({
      collectionName: config.collectionName,
      displayName: config.displayName,
      fields: getFieldConfigs(config),
    })
    setConfigDialogOpen(true)
  }

  async function copyActiveConfig() {
    if (!activeConfig) return
    const shouldCopy = await confirmDialog.confirm({
      title: "データリストをコピー",
      description: `「${activeConfig.displayName}」の構造をコピーしますか？\nフィールド構成のみコピーし、collection内のデータはコピーしません。`,
      confirmText: "コピー",
      cancelText: "キャンセル",
    })
    if (!shouldCopy) return

    const collectionName = getCopyCollectionName(activeConfig, configs)
    setEditingConfig(null)
    setConfigDraft({
      collectionName,
      displayName: `${activeConfig.displayName} コピー`,
      fields: getFieldConfigs(activeConfig),
    })
    setConfigDialogOpen(true)
  }

  async function deleteActiveConfig() {
    if (!activeConfig) return
    const shouldDelete = await confirmDialog.confirm({
      title: "データリストを削除",
      description: `「${activeConfig.displayName}」を削除しますか？\n画面の一覧からこのデータリストを削除します。collection内のdocumentは削除されません。`,
      confirmText: "削除",
      cancelText: "キャンセル",
    })
    if (!shouldDelete) return

    setSaving(true)
    try {
      await masterCollectionConfigRepository.delete(activeConfig.collectionName)
      setConfigDialogOpen(false)
      setActiveCollection(
        configs.find((config) => config.collectionName !== activeConfig.collectionName)
          ?.collectionName ?? ""
      )
      await loadData()
      toast.success("データリストを削除しました。")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "データリストを削除できませんでした。")
    } finally {
      setSaving(false)
    }
  }

  async function saveConfig() {
    const fieldConfigs = normalizeFieldDrafts(configDraft.fields)
    const fields = fieldConfigs.map((field) => field.name)
    const collectionName = configDraft.collectionName.trim()
    if (!collectionName || !fields.length) {
      toast.error("データリストIDとフィールドを入力してください。")
      return
    }

    setSaving(true)
    try {
      const saved = await masterCollectionConfigRepository.save(
        normalizeMasterCollectionConfig({
          id: collectionName,
          collectionName,
          displayName: configDraft.displayName || collectionName,
          fields,
          fieldConfigs,
          active: true,
          systemDefault: editingConfig?.systemDefault,
        })
      )
      if (editingConfig) {
        try {
          await applyDynamicMasterFieldChanges(saved, editingConfig.fields, fields)
        } catch (error) {
          console.warn("Could not migrate existing master data fields:", error)
          toast.warning(
            "データリスト設定は保存しましたが、既存データのフィールド移行に失敗しました。Firestore rules を確認してください。"
          )
        }
      }
      setConfigDialogOpen(false)
      setActiveCollection(saved.collectionName)
      await loadData()
      toast.success("データリストを保存しました。")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存に失敗しました。")
    } finally {
      setSaving(false)
    }
  }

  async function deleteConfig() {
    if (!deleteConfigTarget) return
    setSaving(true)
    try {
      await masterCollectionConfigRepository.delete(deleteConfigTarget.collectionName)
      setDeleteConfigTarget(null)
      setConfigDialogOpen(false)
      setActiveCollection((current) => {
        if (current !== deleteConfigTarget.collectionName) return current
        return configs.find((config) => config.collectionName !== deleteConfigTarget.collectionName)
          ?.collectionName ?? ""
      })
      await loadData()
      toast.success("データリストを削除しました。")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "削除に失敗しました。")
    } finally {
      setSaving(false)
    }
  }

  function updateConfigField(index: number, value: string) {
    setConfigDraft((current) => ({
      ...current,
      fields: current.fields.map((field, fieldIndex) =>
        fieldIndex === index ? { ...field, name: value } : field
      ),
    }))
  }

  function addConfigField() {
    setConfigDraft((current) => ({
      ...current,
      fields: [...current.fields, { name: "", required: false, unique: false }],
    }))
  }

  function removeConfigField(index: number) {
    setConfigDraft((current) => ({
      ...current,
      fields: current.fields.filter((_, fieldIndex) => fieldIndex !== index),
    }))
  }

  function moveConfigField(index: number, direction: -1 | 1) {
    setConfigDraft((current) => {
      const nextIndex = index + direction
      if (nextIndex < 0 || nextIndex >= current.fields.length) return current
      const fields = [...current.fields]
      const [field] = fields.splice(index, 1)
      fields.splice(nextIndex, 0, field)
      return {
        ...current,
        fields,
      }
    })
  }

  function openCreateRecordDialog(config: MasterCollectionConfig) {
    setRecordDialogMode("create")
    setEditingRecordId("")
    setRecordDraft(makeEmptyRecord(config))
    setRecordDialogOpen(true)
  }

  function openEditRecordDialog(config: MasterCollectionConfig, record: DynamicMasterDataRecord) {
    setRecordDialogMode("edit")
    setEditingRecordId(getRecordId(config, record))
    setRecordDraft(
      Object.fromEntries(config.fields.map((field) => [field, normalizeText(record[field])]))
    )
    setRecordDialogOpen(true)
  }

  async function saveRecord() {
    if (!activeConfig) return
    const lookupKeyField = getLookupKeyField(activeConfig)
    const lookupKey = normalizeText(recordDraft[lookupKeyField])
    if (!lookupKey) {
      toast.error(`${lookupKeyField} を入力してください。`)
      return
    }

    setSaving(true)
    try {
      const normalizedRecord = Object.fromEntries(
        activeConfig.fields.map((field) => [field, normalizeText(recordDraft[field])])
      )
      const errors = validateRecord(
        activeConfig,
        normalizedRecord
      )
      if (errors.length) {
        toast.error(errors[0])
        return
      }
      const duplicateWarnings = collectDuplicateFieldWarnings(
        activeConfig,
        [normalizedRecord],
        activeRows,
        recordDialogMode === "edit" ? editingRecordId : ""
      )
      const duplicateWarningMessage = getDuplicateFieldWarningMessage(duplicateWarnings)
      if (
        duplicateWarningMessage &&
        !(await confirmDialog.confirm({ description: duplicateWarningMessage }))
      ) {
        return
      }

      if (recordDialogMode === "create") {
        await createDynamicMasterDataRecord(activeConfig, normalizedRecord)
      } else {
        await updateDynamicMasterDataRecord(activeConfig, editingRecordId, normalizedRecord)
      }

      notifyMasterDataChanged()
      setRecordDialogOpen(false)
      await loadData()
      toast.success("マスタデータを保存しました。")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存に失敗しました。")
    } finally {
      setSaving(false)
    }
  }

  async function deleteRecord() {
    if (!activeConfig || !deleteTarget) return
    setSaving(true)
    try {
      await deleteDynamicMasterDataRecord(activeConfig, getRecordId(activeConfig, deleteTarget))
      notifyMasterDataChanged()
      setDeleteTarget(null)
      await loadData()
      toast.success("マスタデータを削除しました。")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "削除に失敗しました。")
    } finally {
      setSaving(false)
    }
  }

  async function deleteAllRecords() {
    if (!deleteAllTarget) return
    setSaving(true)
    try {
      const deletedCount = await deleteAllDynamicMasterDataRecords(deleteAllTarget)
      notifyMasterDataChanged()
      setDeleteAllTarget(null)
      await loadData()
      toast.success(`${deletedCount} 件のデータを削除しました。`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "削除に失敗しました。")
    } finally {
      setSaving(false)
    }
  }

  async function importFile(file: File) {
    if (!activeConfig) return
    const scrollY = typeof window === "undefined" ? 0 : window.scrollY
    setSaving(true)
    setImportProgress({
      open: true,
      status: "parsing",
      imported: 0,
      total: 0,
    })
    try {
      const rows = await parseImportFile(file, activeConfig)
      setImportProgress({
        open: true,
        status: "validating",
        imported: 0,
        total: rows.length,
      })
      const validRows: DynamicMasterDataRecord[] = []
      for (const [index, row] of rows.entries()) {
        const errors = validateRecord(activeConfig, row)
        if (errors.length) {
          setImportProgress((current) => ({ ...current, open: false, status: "idle" }))
          toast.error(`${index + 2} 行目: ${errors[0]}`)
          return
        }
        validRows.push(row)
      }
      const duplicateWarnings = collectDuplicateFieldWarnings(
        activeConfig,
        validRows,
        activeRows
      )
      const duplicateWarningMessage = getDuplicateFieldWarningMessage(duplicateWarnings)
      if (
        duplicateWarningMessage &&
        !(await confirmDialog.confirm({ description: duplicateWarningMessage }))
      ) {
        setImportProgress((current) => ({ ...current, open: false, status: "idle" }))
        return
      }

      const lookupKeyField = getLookupKeyField(activeConfig)
      setImportProgress({
        open: true,
        status: "checkingExisting",
        imported: 0,
        total: validRows.length,
      })
      const documentIds = await getNextDynamicMasterDocumentIds(
        activeConfig,
        validRows.map((row) => normalizeText(row[lookupKeyField])),
        {
          onProgress: ({ checked, total }) => {
            setImportProgress({
              open: true,
              status: "checkingExisting",
              imported: checked,
              total,
            })
          },
        }
      )

      setImportProgress({
        open: true,
        status: "importing",
        imported: 0,
        total: validRows.length,
      })
      const importedCount = await createDynamicMasterDataRecords(activeConfig, validRows, {
        documentIds,
        onProgress: ({ imported, total }) => {
          setImportProgress({
            open: true,
            status: "importing",
            imported,
            total,
          })
        },
      })

      setImportProgress({
        open: true,
        status: "refreshing",
        imported: importedCount,
        total: validRows.length,
      })
      notifyMasterDataChanged()
      const nextRows = await getDynamicMasterData(activeConfig)
      setRecordsByCollection((current) => ({
        ...current,
        [activeConfig.collectionName]: nextRows,
      }))
      restoreScrollPosition(scrollY)
      setImportProgress({
        open: true,
        status: "done",
        imported: importedCount,
        total: validRows.length,
      })
      toast.success(`${importedCount} 件をインポートしました。`)
      window.setTimeout(() => {
        setImportProgress((current) => {
          if (current.status !== "done") return current
          return { ...current, open: false }
        })
      }, 1200)
    } catch (error) {
      setImportProgress((current) => ({ ...current, open: false, status: "idle" }))
      toast.error(error instanceof Error ? error.message : "インポートに失敗しました。")
    } finally {
      setSaving(false)
      if (importInputRef.current) importInputRef.current.value = ""
    }
  }

  return (
    <div className="flex flex-col gap-4 px-4 md:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">マスタデータ</h1>
          <p className="text-sm text-muted-foreground">
            データリスト設定に基づいてマスタデータを管理します。
          </p>
        </div>
        <Button type="button" onClick={openNewConfigDialog}>
          <Plus className="size-4" />
          データリスト追加
        </Button>
      </div>

      {loading ? (
        <div className="rounded-md border bg-background p-8 text-sm text-muted-foreground">
          読み込み中...
        </div>
      ) : configs.length ? (
        <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
          <div className="rounded-md border bg-background p-2">
            <div className="px-2 py-2 text-xs font-medium text-muted-foreground">
              データリスト
            </div>
            <div className="grid gap-1">
              {configs.map((config) => (
                <button
                  key={config.collectionName}
                  type="button"
                  onClick={() => setActiveCollection(config.collectionName)}
                  className={`rounded-md px-3 py-2 text-left text-sm transition-colors ${
                    activeCollection === config.collectionName
                      ? "bg-accent font-medium text-accent-foreground"
                      : "hover:bg-accent/60"
                  }`}
                >
                  <span className="block truncate">{config.displayName}</span>
                </button>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 border-t pt-3">
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={() => void deleteActiveConfig()}
                disabled={!activeConfig || saving}
              >
                <Trash2 className="size-4" />
                削除
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void copyActiveConfig()}
                disabled={!activeConfig || saving}
              >
                <Copy className="size-4" />
                コピー
              </Button>
            </div>
          </div>

          <div>
            {configs.map((config) => {
              const rows = recordsByCollection[config.collectionName] ?? []
              const searchConfig = getSearchConfig(searchByCollection, config.collectionName)
              const pageSize = pageSizeByCollection[config.collectionName] ?? DEFAULT_PAGE_SIZE
              const visibleRows = rows.filter((row) =>
                matchesRecordSearch(config, row, searchConfig)
              )
              const totalPages = Math.max(1, Math.ceil(visibleRows.length / pageSize))
              const requestedPage = pageByCollection[config.collectionName] ?? 1
              const currentPage = Math.min(Math.max(requestedPage, 1), totalPages)
              const pageStartIndex = (currentPage - 1) * pageSize
              const paginatedRows = visibleRows.slice(pageStartIndex, pageStartIndex + pageSize)
              const pageNumbers = getPageNumbers(currentPage, totalPages)
              const selectedSearchFields = searchConfig.fields.filter((field) =>
                config.fields.includes(field)
              )
              const selectedSearchLabel =
                searchConfig.mode === "all"
                  ? "すべての列"
                  : selectedSearchFields.length === 1
                    ? selectedSearchFields[0]
                    : `${selectedSearchFields.length || config.fields.length} 列`
              const goToPage = (page: number) => {
                const nextPage = Math.min(Math.max(page, 1), totalPages)
                setPageByCollection((current) => ({
                  ...current,
                  [config.collectionName]: nextPage,
                }))
              }
              if (config.collectionName !== activeCollection) return null

              return (
                <div key={config.collectionName} className="rounded-md border bg-background">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
                    <div>
                      <div className="font-medium">{config.displayName}</div>
                      <div className="text-xs text-muted-foreground">
                        データリストID: {config.collectionName} / キー項目: {getLookupKeyField(config)}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => openEditConfigDialog(config)}
                      >
                        <Pencil className="size-4" />
                        設定
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => setDeleteAllTarget(config)}
                        disabled={!rows.length || saving}
                      >
                        <Trash2 className="size-4" />
                        全データ削除
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => openCreateRecordDialog(config)}
                      >
                        <Plus className="size-4" />
                        追加
                      </Button>
                      <input
                        id={importInputId}
                        ref={config.collectionName === activeCollection ? importInputRef : undefined}
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        className="hidden"
                        disabled={saving}
                        onChange={(event) => {
                          const file = event.target.files?.[0]
                          if (file) void importFile(file)
                        }}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const input =
                            importInputRef.current ??
                            (document.getElementById(importInputId) as HTMLInputElement | null)
                          input?.click()
                        }}
                        className={saving ? "pointer-events-none opacity-50" : undefined}
                        aria-disabled={saving}
                      >
                        インポート
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button type="button" size="sm" variant="outline">
                            エクスポート
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => exportRows(config, rows, "csv")}>
                            すべて CSV
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => exportRows(config, rows, "xlsx")}>
                            すべて Excel
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            disabled={!visibleRows.length}
                            onClick={() => exportRows(config, visibleRows, "csv")}
                          >
                            検索結果 CSV
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={!visibleRows.length}
                            onClick={() => exportRows(config, visibleRows, "xlsx")}
                          >
                            検索結果 Excel
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <div className="border-b p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative min-w-[240px] max-w-md flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={searchConfig.query}
                          onChange={(event) => {
                            const query = event.target.value
                            setSearchByCollection((current) => ({
                              ...current,
                              [config.collectionName]: {
                                ...getSearchConfig(current, config.collectionName),
                                query,
                              },
                            }))
                            setPageByCollection((current) => ({
                              ...current,
                              [config.collectionName]: 1,
                            }))
                          }}
                          className="pl-9"
                          placeholder="検索..."
                        />
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button type="button" variant="outline" className="min-w-[150px] justify-start">
                            <SlidersHorizontal className="size-4" />
                            {selectedSearchLabel}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-64">
                          <DropdownMenuLabel>検索対象</DropdownMenuLabel>
                          <DropdownMenuCheckboxItem
                            checked={searchConfig.mode === "all"}
                            onCheckedChange={() => {
                              setSearchByCollection((current) => ({
                                ...current,
                                [config.collectionName]: {
                                  ...getSearchConfig(current, config.collectionName),
                                  mode: "all",
                                },
                              }))
                              setPageByCollection((current) => ({
                                ...current,
                                [config.collectionName]: 1,
                              }))
                            }}
                          >
                            すべての列
                          </DropdownMenuCheckboxItem>
                          <DropdownMenuSeparator />
                          {config.fields.map((field) => (
                            <DropdownMenuCheckboxItem
                              key={field}
                              checked={
                                searchConfig.mode === "columns" &&
                                selectedSearchFields.includes(field)
                              }
                              onSelect={(event) => event.preventDefault()}
                              onCheckedChange={(checked) => {
                                const nextFields = checked
                                  ? [...new Set([...selectedSearchFields, field])]
                                  : selectedSearchFields.filter((item) => item !== field)
                                setSearchByCollection((current) => ({
                                  ...current,
                                  [config.collectionName]: {
                                    ...getSearchConfig(current, config.collectionName),
                                    mode: nextFields.length ? "columns" : "all",
                                    fields: nextFields,
                                  },
                                }))
                                setPageByCollection((current) => ({
                                  ...current,
                                  [config.collectionName]: 1,
                                }))
                              }}
                            >
                              {field}
                            </DropdownMenuCheckboxItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <div className="overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {config.fields.map((field) => (
                            <TableHead key={field}>{field}</TableHead>
                          ))}
                          <TableHead className="w-28 text-right">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedRows.length ? (
                          paginatedRows.map((record) => (
                            <TableRow key={getRecordId(config, record)}>
                              {config.fields.map((field) => (
                                <TableCell key={field} className="max-w-[260px] truncate">
                                  {normalizeText(record[field])}
                                </TableCell>
                              ))}
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => openEditRecordDialog(config, record)}
                                  >
                                    <Pencil className="size-4" />
                                  </Button>
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => setDeleteTarget(record)}
                                  >
                                    <Trash2 className="size-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={config.fields.length + 1}
                              className="h-24 text-center text-muted-foreground"
                            >
                              データがありません。
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t p-4 text-sm">
                    <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <span>表示件数</span>
                        <Select
                          value={String(pageSize)}
                          onValueChange={(value) => {
                            setPageSizeByCollection((current) => ({
                              ...current,
                              [config.collectionName]: Number(value),
                            }))
                            setPageByCollection((current) => ({
                              ...current,
                              [config.collectionName]: 1,
                            }))
                          }}
                        >
                          <SelectTrigger size="sm" className="w-[86px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PAGE_SIZE_OPTIONS.map((option) => (
                              <SelectItem key={option} value={String(option)}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        {visibleRows.length
                          ? `${pageStartIndex + 1}-${Math.min(
                              pageStartIndex + pageSize,
                              visibleRows.length
                            )} / ${visibleRows.length} 件`
                          : "0 / 0 件"}
                      </div>
                      <div>
                        ページ {currentPage} / {totalPages}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={() => goToPage(1)}
                        disabled={currentPage <= 1}
                      >
                        <ChevronsLeft className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage <= 1}
                      >
                        <ChevronLeft className="size-4" />
                      </Button>
                      {pageNumbers.map((pageNumber) => (
                        <Button
                          key={pageNumber}
                          type="button"
                          size="sm"
                          variant={pageNumber === currentPage ? "default" : "outline"}
                          className="min-w-9"
                          onClick={() => goToPage(pageNumber)}
                        >
                          {pageNumber}
                        </Button>
                      ))}
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage >= totalPages}
                      >
                        <ChevronRight className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={() => goToPage(totalPages)}
                        disabled={currentPage >= totalPages}
                      >
                        <ChevronsRight className="size-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-md border bg-background p-8 text-sm text-muted-foreground">
          データリスト設定がありません。
        </div>
      )}

      <Dialog
        open={importProgress.open}
        onOpenChange={(open) => {
          if (!open && saving) return
          setImportProgress((current) => ({ ...current, open }))
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {importProgress.status === "done" ? "インポート完了" : "インポート中"}
            </DialogTitle>
            <DialogDescription>
              {importProgress.status === "parsing"
                ? "ファイルを読み込んでいます。"
                : importProgress.status === "validating"
                  ? "データを確認しています。"
                  : importProgress.status === "checkingExisting"
                    ? "登録済みデータを確認しています。"
                  : importProgress.status === "refreshing"
                    ? "新しいデータを表示するため更新しています。"
                    : importProgress.status === "done"
                      ? `${importProgress.imported} 件をインポートしました。`
                      : `${importProgress.imported} / ${importProgress.total} 件をインポートしています。`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              {importProgress.status === "done" ? null : (
                <Loader2 className="size-4 animate-spin" />
              )}
              <span>
                {importProgress.total > 0
                  ? `${Math.round((importProgress.imported / importProgress.total) * 100)}%`
                  : "準備中"}
              </span>
            </div>
            <Progress
              value={
                importProgress.total > 0
                  ? Math.round((importProgress.imported / importProgress.total) * 100)
                  : 10
              }
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>データリスト設定</DialogTitle>
            <DialogDescription>
              先頭のフィールドがキー項目として使われます。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>データリストID</Label>
              <Input
                value={configDraft.collectionName}
                onChange={(event) =>
                  setConfigDraft((current) => ({
                    ...current,
                    collectionName: event.target.value.trim(),
                  }))
                }
                disabled={Boolean(editingConfig)}
                placeholder="ItemCodeListMAV"
              />
            </div>
            <div className="grid gap-2">
              <Label>データリスト名</Label>
              <Input
                value={configDraft.displayName}
                onChange={(event) =>
                  setConfigDraft((current) => ({ ...current, displayName: event.target.value }))
                }
                placeholder="資材コード照合表 MAV"
              />
            </div>
            <div className="grid gap-2">
              <Label>フィールド</Label>
              <div className="grid gap-2">
                <div className="hidden grid-cols-[1fr_132px] gap-2 text-xs font-medium text-muted-foreground sm:grid">
                  <div>フィールド名</div>
                  <div />
                </div>
                {configDraft.fields.map((field, index) => (
                  <div key={index} className="grid gap-2 sm:grid-cols-[1fr_auto]">
                    <Input
                      value={field.name}
                      onChange={(event) => updateConfigField(index, event.target.value)}
                      placeholder={index === 0 ? "キー項目" : "フィールド名"}
                    />
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={() => moveConfigField(index, -1)}
                        disabled={index === 0}
                      >
                        <ArrowUp className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={() => moveConfigField(index, 1)}
                        disabled={index === configDraft.fields.length - 1}
                      >
                        <ArrowDown className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={() => removeConfigField(index)}
                        disabled={configDraft.fields.length <= 1}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" onClick={addConfigField}>
                <Plus className="size-4" />
                フィールド追加
              </Button>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            <div>
              {editingConfig ? (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setDeleteConfigTarget(editingConfig)}
                  disabled={saving}
                >
                  データリスト削除
                </Button>
              ) : null}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setConfigDialogOpen(false)}>
                キャンセル
              </Button>
              <Button type="button" onClick={saveConfig} disabled={saving}>
                保存
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={recordDialogOpen} onOpenChange={setRecordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {recordDialogMode === "create" ? "マスタデータ追加" : "マスタデータ編集"}
            </DialogTitle>
            <DialogDescription>
              {activeConfig
                ? `${getLookupKeyField(activeConfig)} はキー項目です。`
                : ""}
            </DialogDescription>
          </DialogHeader>
          {activeConfig ? (
            <div className="grid max-h-[60vh] gap-4 overflow-auto pr-1">
              {activeConfig.fields.map((field) => (
                <div key={field} className="grid gap-2">
                  <Label>
                    {field}
                    {field === getLookupKeyField(activeConfig) ? " (キー項目)" : ""}
                  </Label>
                  <Input
                    value={normalizeText(recordDraft[field])}
                    onChange={(event) =>
                      setRecordDraft((current) => ({
                        ...current,
                        [field]: event.target.value,
                      }))
                    }
                    disabled={recordDialogMode === "edit" && field === getLookupKeyField(activeConfig)}
                  />
                </div>
              ))}
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRecordDialogOpen(false)}>
              キャンセル
            </Button>
            <Button type="button" onClick={saveRecord} disabled={saving}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteConfigTarget)}
        onOpenChange={(open) => !open && setDeleteConfigTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>データリストを削除しますか。</AlertDialogTitle>
            <AlertDialogDescription>
              画面の一覧からこのデータリストを削除します。登録済みのデータは削除されません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={deleteConfig}>削除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(deleteAllTarget)}
        onOpenChange={(open) => !open && setDeleteAllTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>全データを削除しますか。</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteAllTarget?.displayName ?? "選択中のデータリスト"} に登録されている全データを削除します。この操作は元に戻せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={deleteAllRecords}>全データ削除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>マスタデータを削除しますか。</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は元に戻せません。選択したデータを削除します。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={deleteRecord}>削除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {confirmDialog.dialog}
    </div>
  )
}
