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
  DropdownMenuContent,
  DropdownMenuItem,
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
  getDynamicMasterDataPage,
  getNextDynamicMasterDocumentIds,
  type DynamicMasterDataPageCursor,
  type DynamicMasterDataRecord,
  type DynamicMasterDataSearchCondition,
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
const MAX_CHANGED_LOOKUP_KEYS_IN_EVENT = 200

type RecordDialogMode = "create" | "edit"
type FieldDraft = MasterCollectionFieldConfig
type SearchCondition = DynamicMasterDataSearchCondition & {
  id: string
}
type SearchConfig = {
  conditions: SearchCondition[]
}
type PageMeta = {
  totalCount: number | null
  firstCursor: DynamicMasterDataPageCursor
  lastCursor: DynamicMasterDataPageCursor
  hasPreviousPage: boolean
  hasNextPage: boolean
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
type MasterDataChangedPayload = {
  changedAt: string
  collectionName?: string
  lookupKeys?: string[]
}

function notifyMasterDataChanged(change: Omit<MasterDataChangedPayload, "changedAt"> = {}) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(
    MASTER_DATA_CHANGED_STORAGE_KEY,
    JSON.stringify({
      changedAt: new Date().toISOString(),
      ...change,
    } satisfies MasterDataChangedPayload)
  )
}

function normalizeText(value: unknown) {
  return String(value ?? "").trim()
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

function createSearchCondition(config?: MasterCollectionConfig | null): SearchCondition {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    field: config ? getLookupKeyField(config) : "",
    operator: "contains",
    value: "",
  }
}

function getDefaultSearchConfig(config?: MasterCollectionConfig | null): SearchConfig {
  return {
    conditions: [createSearchCondition(config)],
  }
}

function getSearchConfig(
  searchByCollection: Record<string, SearchConfig>,
  config: MasterCollectionConfig
) {
  const current = searchByCollection[config.collectionName] ?? getDefaultSearchConfig(config)
  const conditions = current.conditions.length ? current.conditions : [createSearchCondition(config)]

  return {
    conditions: conditions.map((condition) => ({
      ...condition,
      field: config.fields.includes(condition.field) ? condition.field : getLookupKeyField(config),
      operator: "contains" as const,
    })),
  }
}

function getAppliedSearchConditions(config: MasterCollectionConfig, searchConfig: SearchConfig) {
  return searchConfig.conditions
    .map((condition) => ({
      field: config.fields.includes(condition.field) ? condition.field : getLookupKeyField(config),
      operator: "contains" as const,
      value: normalizeText(condition.value),
    }))
    .filter((condition) => {
      return Boolean(condition.value)
    })
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
  const [pageMetaByCollection, setPageMetaByCollection] = useState<Record<string, PageMeta>>({})
  const [searchByCollection, setSearchByCollection] = useState<Record<string, SearchConfig>>({})
  const [searchDraftByCollection, setSearchDraftByCollection] = useState<
    Record<string, SearchConfig>
  >({})
  const [pageSizeByCollection, setPageSizeByCollection] = useState<Record<string, number>>({})
  const [pageByCollection, setPageByCollection] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [tableLoading, setTableLoading] = useState(false)
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
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const nextConfigs = await masterCollectionConfigRepository.list()
      setConfigs(nextConfigs)
      setActiveCollection((current) => current || nextConfigs[0]?.collectionName || "")
    } catch (error) {
      console.error(error)
      toast.error("マスタデータを読み込めませんでした。")
    } finally {
      setLoading(false)
    }
  }, [])

  const loadActivePage = useCallback(
    async (
      direction: "first" | "next" | "previous" | "last" = "first",
      cursor?: DynamicMasterDataPageCursor
    ) => {
      if (!activeConfig) return

      setTableLoading(true)
      try {
        const searchConfig = getSearchConfig(searchByCollection, activeConfig)
        const appliedConditions = getAppliedSearchConditions(activeConfig, searchConfig)
        const pageSize = pageSizeByCollection[activeConfig.collectionName] ?? DEFAULT_PAGE_SIZE
        const page = await getDynamicMasterDataPage(activeConfig, {
          pageSize,
          direction,
          cursor,
          search: appliedConditions.length ? { conditions: appliedConditions } : undefined,
        })
        const totalPages =
          page.totalCount === null ? null : Math.max(1, Math.ceil(page.totalCount / pageSize))

        setRecordsByCollection((current) => ({
          ...current,
          [activeConfig.collectionName]: page.rows,
        }))
        setPageMetaByCollection((current) => ({
          ...current,
          [activeConfig.collectionName]: {
            totalCount: page.totalCount,
            firstCursor: page.firstCursor,
            lastCursor: page.lastCursor,
            hasPreviousPage: page.hasPreviousPage,
            hasNextPage: page.hasNextPage,
          },
        }))
        setPageByCollection((current) => {
          const currentPage = current[activeConfig.collectionName] ?? 1
          const nextPage =
            direction === "next"
              ? totalPages === null
                ? currentPage + 1
                : Math.min(currentPage + 1, totalPages)
              : direction === "previous"
                ? Math.max(currentPage - 1, 1)
                : direction === "last"
                  ? totalPages ?? currentPage
                  : 1

          return {
            ...current,
            [activeConfig.collectionName]: nextPage,
          }
        })
      } catch (error) {
        console.error(error)
        toast.error("マスタデータを読み込めませんでした。")
      } finally {
        setTableLoading(false)
      }
    },
    [activeConfig, pageSizeByCollection, searchByCollection]
  )

  useEffect(() => {
    void loadData()
  }, [loadData])

  useEffect(() => {
    void loadActivePage("first")
  }, [loadActivePage])

  function updateSearchDraft(
    config: MasterCollectionConfig,
    updater: (current: SearchConfig) => SearchConfig
  ) {
    setSearchDraftByCollection((current) => ({
      ...current,
      [config.collectionName]: updater(getSearchConfig(current, config)),
    }))
  }

  function applySearchDraft(config: MasterCollectionConfig) {
    const draft = getSearchConfig(searchDraftByCollection, config)
    setSearchByCollection((current) => ({
      ...current,
      [config.collectionName]: draft,
    }))
    setPageByCollection((current) => ({
      ...current,
      [config.collectionName]: 1,
    }))
  }

  function clearSearchDraft(config: MasterCollectionConfig) {
    const emptySearch = getDefaultSearchConfig(config)
    setSearchDraftByCollection((current) => ({
      ...current,
      [config.collectionName]: emptySearch,
    }))
    setSearchByCollection((current) => ({
      ...current,
      [config.collectionName]: emptySearch,
    }))
    setPageByCollection((current) => ({
      ...current,
      [config.collectionName]: 1,
    }))
  }

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
      if (recordDialogMode === "create") {
        await createDynamicMasterDataRecord(activeConfig, normalizedRecord)
      } else {
        await updateDynamicMasterDataRecord(activeConfig, editingRecordId, normalizedRecord)
      }

      notifyMasterDataChanged({
        collectionName: activeConfig.collectionName,
        lookupKeys: [lookupKey],
      })
      setRecordDialogOpen(false)
      await loadActivePage("first")
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
      const lookupKeyField = getLookupKeyField(activeConfig)
      const lookupKey = normalizeText(deleteTarget[lookupKeyField])
      await deleteDynamicMasterDataRecord(activeConfig, getRecordId(activeConfig, deleteTarget))
      notifyMasterDataChanged({
        collectionName: activeConfig.collectionName,
        lookupKeys: lookupKey ? [lookupKey] : undefined,
      })
      setDeleteTarget(null)
      await loadActivePage("first")
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
      notifyMasterDataChanged({
        collectionName: deleteAllTarget.collectionName,
      })
      setDeleteAllTarget(null)
      await loadActivePage("first")
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
      notifyMasterDataChanged({
        collectionName: activeConfig.collectionName,
        lookupKeys:
          validRows.length <= MAX_CHANGED_LOOKUP_KEYS_IN_EVENT
            ? validRows.map((row) => normalizeText(row[lookupKeyField])).filter(Boolean)
            : undefined,
      })
      await loadActivePage("first")
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

  async function exportAllCollectionRows(
    config: MasterCollectionConfig,
    extension: "csv" | "xlsx"
  ) {
    setSaving(true)
    try {
      const rows = await getDynamicMasterData(config)
      exportRows(config, rows, extension)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "エクスポートに失敗しました。")
    } finally {
      setSaving(false)
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
              const pageMeta = pageMetaByCollection[config.collectionName] ?? {
                totalCount: 0,
                firstCursor: null,
                lastCursor: null,
                hasPreviousPage: false,
                hasNextPage: false,
              }
              const searchConfig = getSearchConfig(searchByCollection, config)
              const searchDraft = getSearchConfig(searchDraftByCollection, config)
              const appliedConditionCount = getAppliedSearchConditions(config, searchConfig).length
              const pageSize = pageSizeByCollection[config.collectionName] ?? DEFAULT_PAGE_SIZE
              const totalPages =
                pageMeta.totalCount === null
                  ? null
                  : Math.max(1, Math.ceil(pageMeta.totalCount / pageSize))
              const requestedPage = pageByCollection[config.collectionName] ?? 1
              const currentPage =
                totalPages === null
                  ? Math.max(requestedPage, 1)
                  : Math.min(Math.max(requestedPage, 1), totalPages)
              const pageStartIndex = (currentPage - 1) * pageSize
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
                            表示中ページ CSV
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => exportRows(config, rows, "xlsx")}>
                            表示中ページ Excel
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            disabled={saving}
                            onClick={() => void exportAllCollectionRows(config, "csv")}
                          >
                            すべて CSV
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={saving}
                            onClick={() => void exportAllCollectionRows(config, "xlsx")}
                          >
                            すべて Excel
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <div className="grid gap-3 border-b p-4">
                    <div className="grid gap-2">
                      {searchDraft.conditions.map((condition, conditionIndex) => (
                        <div
                          key={condition.id}
                          className="grid gap-2 lg:grid-cols-[minmax(180px,260px)_minmax(220px,1fr)_auto]"
                        >
                          <Select
                            value={condition.field}
                            onValueChange={(field) => {
                              updateSearchDraft(config, (current) => ({
                                ...current,
                                conditions: current.conditions.map((item) =>
                                  item.id === condition.id ? { ...item, field } : item
                                ),
                              }))
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {config.fields.map((field) => (
                                <SelectItem key={field} value={field}>
                                  {field}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              value={condition.value}
                              onChange={(event) => {
                                const value = event.target.value
                                updateSearchDraft(config, (current) => ({
                                  ...current,
                                  conditions: current.conditions.map((item) =>
                                    item.id === condition.id ? { ...item, value } : item
                                  ),
                                }))
                              }}
                              className="pl-9"
                              placeholder="含む文字で検索..."
                              onKeyDown={(event) => {
                                if (event.key === "Enter") applySearchDraft(config)
                              }}
                            />
                          </div>
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            onClick={() => {
                              updateSearchDraft(config, (current) => {
                                const nextConditions = current.conditions.filter(
                                  (item) => item.id !== condition.id
                                )
                                return {
                                  ...current,
                                  conditions: nextConditions.length
                                    ? nextConditions
                                    : [createSearchCondition(config)],
                                }
                              })
                            }}
                            disabled={searchDraft.conditions.length <= 1 && conditionIndex === 0}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            updateSearchDraft(config, (current) => ({
                              ...current,
                              conditions: [...current.conditions, createSearchCondition(config)],
                            }))
                          }}
                        >
                          <Plus className="size-4" />
                          条件追加
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => applySearchDraft(config)}
                          disabled={tableLoading}
                        >
                          <Search className="size-4" />
                          検索
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => clearSearchDraft(config)}
                          disabled={tableLoading}
                        >
                          クリア
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        適用中: {appliedConditionCount} 条件
                      </div>
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
                        {tableLoading ? (
                          <TableRow>
                            <TableCell
                              colSpan={config.fields.length + 1}
                              className="h-24 text-center text-muted-foreground"
                            >
                              読み込み中...
                            </TableCell>
                          </TableRow>
                        ) : rows.length ? (
                          rows.map((record) => (
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
                        {pageMeta.totalCount === null
                          ? rows.length
                            ? `${rows.length} 件表示`
                            : "0 / 0 件"
                          : pageMeta.totalCount
                          ? `${pageStartIndex + 1}-${Math.min(
                              pageStartIndex + rows.length,
                              pageMeta.totalCount
                            )} / ${pageMeta.totalCount} 件`
                          : "0 / 0 件"}
                      </div>
                      <div>
                        {totalPages === null
                          ? `ページ ${currentPage}`
                          : `ページ ${currentPage} / ${totalPages}`}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={() => void loadActivePage("first")}
                        disabled={tableLoading || currentPage <= 1}
                      >
                        <ChevronsLeft className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={() => void loadActivePage("previous", pageMeta.firstCursor)}
                        disabled={tableLoading || currentPage <= 1}
                      >
                        <ChevronLeft className="size-4" />
                      </Button>
                      <Button type="button" size="sm" disabled className="min-w-24">
                        {totalPages === null ? currentPage : `${currentPage} / ${totalPages}`}
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={() => void loadActivePage("next", pageMeta.lastCursor)}
                        disabled={
                          tableLoading ||
                          (totalPages === null
                            ? !pageMeta.hasNextPage
                            : currentPage >= totalPages)
                        }
                      >
                        <ChevronRight className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={() => void loadActivePage("last")}
                        disabled={
                          tableLoading ||
                          totalPages === null ||
                          currentPage >= totalPages
                        }
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
