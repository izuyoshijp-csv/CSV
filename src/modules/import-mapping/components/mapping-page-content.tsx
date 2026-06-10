"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import * as XLSX from "xlsx"
import {
  ArrowDown,
  ArrowUp,
  ChevronUp,
  Copy,
  Download,
  Eye,
  History,
  ListPlus,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import type {
  CsvColumnLetter,
  ImportMappingConfig,
  ImportMappingConfigHistory,
  ImportMappingDataFormat,
  ImportMappingDataSource,
  ImportMappingEntry,
  ImportMappingFormatCondition,
  ImportMappingOrderFileMode,
  MasterCollectionConfig,
} from "@/types/firestore-models"

import { createDefaultImportMappingConfig } from "../services/default-import-mapping"
import { mappingConfigRepository } from "../services/import-mapping-services"
import {
  createEmptyMappingEntry,
  makeMappingId,
  parseCsvColumns,
  sortCsvColumns,
  sortMappingEntries,
} from "../services/import-mapping-types"
import {
  type MappingValidationIssue,
  validateImportMappingConfig,
} from "../services/import-mapping-validation"
import {
  masterCollectionConfigRepository,
} from "@/modules/masterdata/services/master-collection-config-services"

const dataSourceLabels: Record<ImportMappingDataSource, string> = {
  orderFile: "注文ファイルから取得",
  fixedValue: "固定値",
  masterLookup: "マスタデータ参照",
  formula: "計算式",
  blank: "空欄",
  manualInput: "後で入力",
}

const orderFileModeLabels: Record<ImportMappingOrderFileMode, string> = {
  fixedCell: "固定セル",
  detailColumn: "明細列",
  sourceFormula: "注文ファイル計算",
}

const formatConditionLabels: Record<ImportMappingFormatCondition, string> = {
  original: "元の形式を保持",
  number: "Number 00,000.00",
  numberIntegerTruncate: "Number 整数（小数切り捨て）",
  date: "Date yyyymmdd",
  left32: "左から32文字（空白を含む）",
  left25: "左から25文字（空白を含む）",
  alphanumericOnly: "英数字のみ",
}

const formatConditionDescriptions: Record<ImportMappingFormatCondition, string> = {
  original: "入力値の形式をそのまま保持します。",
  number: "数値を00,000.00形式で扱います。",
  numberIntegerTruncate: "小数点以下を削除し、四捨五入しません。例：123.67 → 123。",
  date: "日付をyyyymmdd形式で扱います。",
  left32: "左から32文字だけ取得します。空白文字も1文字として数えます。",
  left25: "左から25文字だけ取得します。空白文字も1文字として数えます。",
  alphanumericOnly: "A-Z、a-z、0-9だけを残し、記号やひらがな、カタカナ、漢字などは除外します。",
}

const formatConditionOptions = Object.keys(
  formatConditionLabels
) as ImportMappingFormatCondition[]

function createNewMapping(): ImportMappingConfig {
  return {
    id: makeMappingId(),
    name: "新規マッピング",
    description: "",
    startDetailRow: 17,
    validRowColumn: "R",
    active: true,
    deleted: false,
    version: 1,
    customerRule: "ALL",
    entries: [createEmptyMappingEntry()],
  }
}

function getIssueMessages(issues: MappingValidationIssue[], field: string, entryId?: string) {
  return issues
    .filter((issue) => issue.field === field && (!entryId || issue.entryId === entryId))
    .map((issue) => issue.message)
}

function getChangedAtText(value: unknown) {
  if (!value) return "-"
  if (typeof value === "string") return value.slice(0, 16).replace("T", " ")
  if (typeof value === "object" && value && "toDate" in value) {
    const date = (value as { toDate: () => Date }).toDate()
    return date.toLocaleString("ja-JP")
  }
  return String(value)
}

export function MappingPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialSelectedMappingId = React.useRef(searchParams.get("id"))
  const { data: session } = useSession()
  const userEmail = session?.user?.email ?? "system"

  const [mappings, setMappings] = React.useState<ImportMappingConfig[]>([])
  const [selectedMappingId, setSelectedMappingId] = React.useState("")
  const [draft, setDraft] = React.useState<ImportMappingConfig | null>(null)
  const [issues, setIssues] = React.useState<MappingValidationIssue[]>([])
  const [histories, setHistories] = React.useState<ImportMappingConfigHistory[]>([])
  const [masterCollectionConfigs, setMasterCollectionConfigs] = React.useState<
    MasterCollectionConfig[]
  >([])
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [previewOpen, setPreviewOpen] = React.useState(false)
  const [historyOpen, setHistoryOpen] = React.useState(false)
  const [detailsOpen, setDetailsOpen] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState("list")
  const skipNextDraftSync = React.useRef(false)

  const selectedMapping = mappings.find((mapping) => mapping.id === selectedMappingId)
  const filteredMappings = mappings.filter((mapping) =>
    [mapping.name, mapping.description, mapping.updatedBy]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  )

  const loadMappings = React.useCallback(async () => {
    setLoading(true)
    try {
      const list = await mappingConfigRepository.list()
      const nextList = list.length ? list : [createDefaultImportMappingConfig()]
      setMappings(nextList)
      const requestedId = initialSelectedMappingId.current
      const nextSelected = nextList.find((mapping) => mapping.id === requestedId)
      setSelectedMappingId(nextSelected?.id ?? "")
      setDraft(nextSelected ? structuredClone(nextSelected) : null)
      setDetailsOpen(Boolean(nextSelected))
      setIssues([])
    } catch {
      toast.error("マッピング一覧を読み込めませんでした。")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void loadMappings()
  }, [loadMappings])

  React.useEffect(() => {
    masterCollectionConfigRepository
      .list()
      .then(setMasterCollectionConfigs)
      .catch(() => toast.error("マスタコレクション設定を読み込めませんでした。"))
  }, [])

  React.useEffect(() => {
    if (!selectedMapping) return
    if (skipNextDraftSync.current) {
      skipNextDraftSync.current = false
      return
    }
    setDraft(structuredClone(selectedMapping))
    setDetailsOpen(true)
    setIssues([])
    router.replace(`/settings?id=${selectedMapping.id}`, { scroll: false })
  }, [router, selectedMapping])

  const updateDraft = (patch: Partial<ImportMappingConfig>) => {
    setDraft((current) => (current ? { ...current, ...patch } : current))
  }

  const updateEntry = (entryId: string, patch: Partial<ImportMappingEntry>) => {
    setDraft((current) => {
      if (!current) return current
      return {
        ...current,
        entries: current.entries.map((entry) =>
          entry.id === entryId ? { ...entry, ...patch } : entry
        ),
      }
    })
  }

  const addMapping = () => {
    const nextMapping = createNewMapping()
    setMappings((current) => [nextMapping, ...current])
    setSelectedMappingId(nextMapping.id)
    setDraft(nextMapping)
    setDetailsOpen(true)
    setIssues([])
  }

  const createUniqueMappingName = (baseName: string) => {
    const existingNames = new Set(
      mappings.map((mapping) => mapping.name.trim().toLowerCase())
    )
    const normalizedBaseName = `${baseName} コピー`.trim()
    if (!existingNames.has(normalizedBaseName.toLowerCase())) {
      return normalizedBaseName
    }

    let index = 2
    while (existingNames.has(`${normalizedBaseName} ${index}`.toLowerCase())) {
      index += 1
    }
    return `${normalizedBaseName} ${index}`
  }

  const copyCurrentMapping = () => {
    if (!draft) return

    const nextMapping: ImportMappingConfig = {
      ...structuredClone(draft),
      id: makeMappingId(),
      name: createUniqueMappingName(draft.name),
      createdAt: undefined,
      createdBy: undefined,
      updatedAt: undefined,
      updatedBy: undefined,
      entries: draft.entries.map((entry) => ({
        ...structuredClone(entry),
        id: makeMappingId("entry"),
      })),
    }

    setMappings((current) => [nextMapping, ...current])
    setSelectedMappingId(nextMapping.id)
    setDraft(nextMapping)
    setDetailsOpen(true)
    setIssues([])
    toast.success("マッピングをコピーしました。保存してください。")
  }

  const addEntry = () => {
    if (!draft) return
    updateDraft({ entries: [...draft.entries, createEmptyMappingEntry()] })
  }

  const insertEntryAfter = (entryId: string) => {
    if (!draft) return
    const nextEntry = createEmptyMappingEntry()
    const nextEntries = draft.entries.flatMap((entry) =>
      entry.id === entryId ? [entry, nextEntry] : [entry]
    )
    updateDraft({ entries: nextEntries })
  }

  const deleteEntry = (entryId: string) => {
    if (!draft) return
    updateDraft({ entries: draft.entries.filter((entry) => entry.id !== entryId) })
  }

  const moveEntry = (entryId: string, direction: "up" | "down") => {
    if (!draft) return
    const currentIndex = draft.entries.findIndex((entry) => entry.id === entryId)
    if (currentIndex < 0) return

    const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1
    if (nextIndex < 0 || nextIndex >= draft.entries.length) return

    const nextEntries = [...draft.entries]
    const currentEntry = nextEntries[currentIndex]
    nextEntries[currentIndex] = nextEntries[nextIndex]
    nextEntries[nextIndex] = currentEntry
    updateDraft({ entries: nextEntries })
  }

  const sortEntries = () => {
    if (!draft) return
    updateDraft({ entries: sortMappingEntries(draft.entries) })
  }

  const normalizeMappingForSave = (mapping: ImportMappingConfig) => ({
    ...mapping,
    validRowColumn: mapping.validRowColumn.trim().toUpperCase(),
    entries: sortMappingEntries(mapping.entries).map((entry) => ({
      ...entry,
      targetColumns: sortCsvColumns(entry.targetColumns),
    })),
  })

  const persistMapping = async (
    mapping: ImportMappingConfig,
    options: { preserveDraft?: boolean; successMessage: string }
  ) => {
    const saved = await mappingConfigRepository.save(mapping, userEmail)
    if (options.preserveDraft) {
      skipNextDraftSync.current = true
    }
    setMappings((current) => {
      const exists = current.some((item) => item.id === saved.id)
      return exists
        ? current.map((item) => (item.id === saved.id ? saved : item))
        : [saved, ...current]
    })
    setSelectedMappingId(saved.id)
    if (!options.preserveDraft) {
      setDraft(saved)
    }
    toast.success(options.successMessage)
    return saved
  }

  const saveEntry = async (entryId: string) => {
    if (!draft) return

    const draftEntry = draft.entries.find((entry) => entry.id === entryId)
    if (!draftEntry) return

    const baseMapping = selectedMapping ?? draft
    const baseEntryExists = baseMapping.entries.some((entry) => entry.id === entryId)
    const nextMapping = normalizeMappingForSave({
      ...baseMapping,
      entries: baseEntryExists
        ? baseMapping.entries.map((entry) =>
            entry.id === entryId ? structuredClone(draftEntry) : entry
          )
        : [...baseMapping.entries, structuredClone(draftEntry)],
    })
    const result = validateImportMappingConfig(nextMapping, {
      existingMappings: mappings,
    })
    setIssues(result.issues)

    if (!result.valid) {
      toast.error("入力内容を確認してください。")
      return
    }

    setSaving(true)
    try {
      await persistMapping(nextMapping, {
        preserveDraft: true,
        successMessage: "行を保存しました。",
      })
    } catch {
      toast.error("行を保存できませんでした。")
    } finally {
      setSaving(false)
    }
  }

  const saveMapping = async () => {
    if (!draft) return

    const normalizedDraft = normalizeMappingForSave(draft)
    const result = validateImportMappingConfig(normalizedDraft, {
      existingMappings: mappings,
    })
    setIssues(result.issues)

    if (!result.valid) {
      toast.error("入力内容を確認してください。")
      return
    }

    setSaving(true)
    try {
      const saved = await mappingConfigRepository.save(normalizedDraft, userEmail)
      setMappings((current) => {
        const exists = current.some((item) => item.id === saved.id)
        return exists
          ? current.map((item) => (item.id === saved.id ? saved : item))
          : [saved, ...current]
      })
      setSelectedMappingId(saved.id)
      setDraft(saved)
      toast.success("マッピングを保存しました。")
    } catch {
      toast.error("マッピングを保存できませんでした。")
    } finally {
      setSaving(false)
    }
  }

  const deleteMapping = async () => {
    if (!draft) return
    await mappingConfigRepository.softDelete(draft.id, userEmail)
    const nextMappings = mappings.filter((mapping) => mapping.id !== draft.id)
    setMappings(nextMappings)
    setSelectedMappingId("")
    setDraft(null)
    setDetailsOpen(false)
    toast.success("マッピングを削除しました。")
  }

  const openPreview = () => {
    if (!draft) return
    const result = validateImportMappingConfig(draft, {
      existingMappings: mappings,
    })
    setIssues(result.issues)
    if (!result.valid) {
      toast.error("プレビューできません。入力内容を確認してください。")
      return
    }
    setPreviewOpen(true)
  }

  const openHistory = async () => {
    if (!draft) return
    setHistoryOpen(true)
    const nextHistories = await mappingConfigRepository.history(draft.id)
    setHistories(nextHistories)
  }

  return (
    <div className="flex flex-col gap-4 px-4 md:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">設定</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="gap-4">
        <div className="overflow-x-auto pb-1">
          <TabsList className="min-w-max">
            <TabsTrigger value="list">マッピング表</TabsTrigger>
            <TabsTrigger value="format">フォーマット</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="list" className="mt-0">
          <div className="grid gap-4 2xl:grid-cols-[320px_minmax(0,1fr)]">
            <aside className="rounded-md border bg-background p-3">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="text-sm font-medium">マッピング表</div>
                <Button type="button" size="sm" onClick={addMapping}>
                  <Plus className="size-4" />
                  新規
                </Button>
              </div>
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="マッピング名で検索"
                className="mb-3"
              />
              <div className="grid gap-2">
                {loading ? (
                  <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                    マッピング一覧を読み込んでいます。
                  </div>
                ) : filteredMappings.length ? (
                  filteredMappings.map((mapping) => {
                    const validation = validateImportMappingConfig(mapping)
                    return (
                      <button
                        key={mapping.id}
                        type="button"
                        onClick={() => {
                          setSelectedMappingId(mapping.id)
                          setDetailsOpen(true)
                        }}
                        className={[
                          "rounded-md border px-3 py-2 text-left text-sm transition-colors",
                          selectedMappingId === mapping.id
                            ? "border-primary bg-primary/10 text-primary"
                            : "bg-background hover:bg-muted",
                        ].join(" ")}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate font-medium">{mapping.name}</span>
                          <Badge variant={validation.valid ? "default" : "destructive"}>
                            {validation.valid ? "有効" : "エラー"}
                          </Badge>
                        </div>
                        <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                          <span>開始 {mapping.startDetailRow}</span>
                          <span>判定 {mapping.validRowColumn}</span>
                          <span>{mapping.entries.length} 件</span>
                        </div>
                      </button>
                    )
                  })
                ) : (
                  <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                    マッピングがまだ登録されていません。
                  </div>
                )}
              </div>
            </aside>

            <section className="min-w-0 rounded-md border bg-background">
              {draft ? (
                <div className={detailsOpen ? "flex flex-col gap-4 p-4" : "hidden"}>
                  <div className="flex items-center justify-between gap-2 border-b pb-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{draft.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {detailsOpen
                          ? "詳細を表示しています。"
                          : "詳細は閉じています。"}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setDetailsOpen((open) => !open)}
                    >
                      <ChevronUp
                        className={[
                          "size-4 transition-transform",
                          detailsOpen ? "" : "rotate-180",
                        ].join(" ")}
                      />
                      {detailsOpen ? "詳細を閉じる" : "詳細を表示"}
                    </Button>
                  </div>
                  {detailsOpen ? (
                    <>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="grid min-w-0 flex-1 gap-3 md:grid-cols-2">
                      <Field label="マッピング名" messages={getIssueMessages(issues, "name")}>
                        <Input
                          value={draft.name}
                          onChange={(event) => updateDraft({ name: event.target.value })}
                          placeholder="標準マッピング"
                        />
                      </Field>
                      <Field label="明細開始行" messages={getIssueMessages(issues, "startDetailRow")}>
                        <Input
                          value={String(draft.startDetailRow ?? "")}
                          onChange={(event) =>
                            updateDraft({
                              startDetailRow: Number(event.target.value),
                            })
                          }
                          inputMode="numeric"
                          placeholder="17"
                        />
                      </Field>
                      <Field label="有効行判定列" messages={getIssueMessages(issues, "validRowColumn")}>
                        <Input
                          value={draft.validRowColumn}
                          onChange={(event) =>
                            updateDraft({ validRowColumn: event.target.value.toUpperCase() })
                          }
                          placeholder="R"
                        />
                      </Field>
                      <div className="flex items-end gap-3 pb-2">
                        <Switch
                          checked={draft.active}
                          onCheckedChange={(active) => updateDraft({ active })}
                        />
                        <Label className="text-sm">有効</Label>
                      </div>
                      <div className="md:col-span-2">
                        <Field label="説明">
                          <Textarea
                            value={draft.description ?? ""}
                            onChange={(event) =>
                              updateDraft({ description: event.target.value })
                            }
                            className="min-h-20"
                          />
                        </Field>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      <Button type="button" variant="outline" onClick={addEntry}>
                        <ListPlus className="size-4" />
                        行を追加
                      </Button>
                      <Button type="button" variant="outline" onClick={sortEntries}>
                        <RotateCcw className="size-4" />
                        CSV列順
                      </Button>
                      <Button type="button" variant="outline" onClick={openPreview}>
                        <Eye className="size-4" />
                        プレビュー
                      </Button>
                      <Button type="button" variant="outline" onClick={copyCurrentMapping}>
                        <Copy className="size-4" />
                        コピー
                      </Button>
                      <Button type="button" variant="outline" onClick={openHistory}>
                        <History className="size-4" />
                        変更履歴
                      </Button>
                      <Button type="button" onClick={saveMapping} disabled={saving}>
                        <Save className="size-4" />
                        保存
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button type="button" variant="destructive">
                            <Trash2 className="size-4" />
                            削除
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>マッピングを削除しますか？</AlertDialogTitle>
                            <AlertDialogDescription>
                              削除したマッピングは一覧に表示されません。
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>キャンセル</AlertDialogCancel>
                            <AlertDialogAction onClick={deleteMapping}>削除</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  {issues.length ? (
                    <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                      {issues.slice(0, 5).map((issue) => (
                        <div key={`${issue.field}-${issue.entryId ?? "header"}`}>
                          {issue.message}
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div className="w-full overflow-x-auto">
                    <div className="min-w-[980px] divide-y rounded-md border">
                      <div className="grid grid-cols-[140px_190px_220px_minmax(0,1fr)] bg-muted/60 text-sm font-medium">
                        <div className="p-3">CSV列</div>
                        <div className="p-3">項目名</div>
                        <div className="p-3">データ取得方法</div>
                        <div className="p-3">設定内容</div>
                      </div>
                      {draft.entries.map((entry, index) => (
                        <MappingEntryRow
                          key={entry.id}
                          entry={entry}
                          issues={issues}
                          masterCollectionConfigs={masterCollectionConfigs}
                          onChange={(patch) => updateEntry(entry.id, patch)}
                          onAddBelow={() => insertEntryAfter(entry.id)}
                          onMoveUp={() => moveEntry(entry.id, "up")}
                          onMoveDown={() => moveEntry(entry.id, "down")}
                          onDelete={() => deleteEntry(entry.id)}
                          onSaveEntry={() => saveEntry(entry.id)}
                          onSaveAll={saveMapping}
                          canMoveUp={index > 0}
                          canMoveDown={index < draft.entries.length - 1}
                          canDelete={draft.entries.length > 1}
                          saving={saving}
                        />
                      ))}
                    </div>
                  </div>
                    </>
                  ) : null}
                </div>
              ) : (
                <div className="flex min-h-80 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
                  <div className="text-base font-medium text-foreground">
                    マッピングを選択してください。
                  </div>
                  <div>
                    マッピング表から編集するマッピングをクリックしてください。
                  </div>
                </div>
              )}
            </section>
          </div>
        </TabsContent>

        <TabsContent value="format" className="mt-0">
          <FormatConditionsTab />
        </TabsContent>
      </Tabs>

      <PreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        mapping={draft}
      />
      <HistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        histories={histories}
      />
    </div>
  )
}

function MappingEntryRow({
  entry,
  issues,
  masterCollectionConfigs,
  onChange,
  onAddBelow,
  onMoveUp,
  onMoveDown,
  onDelete,
  onSaveEntry,
  onSaveAll,
  canMoveUp,
  canMoveDown,
  canDelete,
  saving,
}: {
  entry: ImportMappingEntry
  issues: MappingValidationIssue[]
  masterCollectionConfigs: MasterCollectionConfig[]
  onChange: (patch: Partial<ImportMappingEntry>) => void
  onAddBelow: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onDelete: () => void
  onSaveEntry: () => void
  onSaveAll: () => void
  canMoveUp: boolean
  canMoveDown: boolean
  canDelete: boolean
  saving: boolean
}) {
  const targetColumnsText = entry.targetColumns.join(", ")

  return (
    <div className="grid grid-cols-[140px_190px_220px_minmax(0,1fr)] text-sm">
      <div className="p-3">
        <Field messages={getIssueMessages(issues, "targetColumns", entry.id)}>
          <Input
            value={targetColumnsText}
            onChange={(event) =>
              onChange({ targetColumns: parseCsvColumns(event.target.value) })
            }
            placeholder="E, I, J"
          />
        </Field>
      </div>
      <div className="p-3">
        <Field messages={getIssueMessages(issues, "targetColumnName", entry.id)}>
          <Input
            value={entry.targetColumnName}
            onChange={(event) => onChange({ targetColumnName: event.target.value })}
            placeholder="項目名"
          />
        </Field>
      </div>
      <div className="p-3">
        <Select
          value={entry.dataSource}
          onValueChange={(value) => {
            const dataSource = value as ImportMappingDataSource
            const patch: Partial<ImportMappingEntry> = { dataSource }
            if (dataSource === "orderFile" && !entry.orderFileMode) {
              patch.orderFileMode = "fixedCell"
            }
            onChange(patch)
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(dataSourceLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="p-3">
        <EntryDetailFields
          entry={entry}
          issues={issues}
          masterCollectionConfigs={masterCollectionConfigs}
          onChange={onChange}
        />
      </div>
      <div className="col-span-3 flex flex-wrap items-center gap-2 px-3 pb-3">
        <label className="flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm">
          <Checkbox
            checked={Boolean(entry.hideInCompactView)}
            onCheckedChange={(checked) => onChange({ hideInCompactView: checked === true })}
          />
          <span>簡易表示で非表示</span>
        </label>
        <label className="flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm">
          <Checkbox
            checked={entry.includeInCsvDownload !== false}
            onCheckedChange={(checked) => onChange({ includeInCsvDownload: checked === true })}
          />
          <span>CSVダウンロード時に表示</span>
        </label>
      </div>
      <div className="col-span-3 flex flex-wrap items-center gap-2 p-3 pt-0">
        <Button type="button" size="sm" variant="outline" onClick={onAddBelow}>
          <Plus className="size-4" />
          下に追加
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onMoveUp} disabled={!canMoveUp}>
          <ArrowUp className="size-4" />
          上へ
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onMoveDown} disabled={!canMoveDown}>
          <ArrowDown className="size-4" />
          下へ
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onSaveEntry}
          disabled={saving}
        >
          <Save className="size-4" />
          保存
        </Button>
        <Button type="button" size="sm" onClick={onSaveAll} disabled={saving}>
          <Save className="size-4" />
          すべて保存
        </Button>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          onClick={onDelete}
          disabled={!canDelete}
        >
          <Trash2 className="size-4" />
          削除
        </Button>
      </div>
    </div>
  )
}

function EntryDetailFields({
  entry,
  issues,
  masterCollectionConfigs,
  onChange,
}: {
  entry: ImportMappingEntry
  issues: MappingValidationIssue[]
  masterCollectionConfigs: MasterCollectionConfig[]
  onChange: (patch: Partial<ImportMappingEntry>) => void
}) {
  const lookupCollection =
    masterCollectionConfigs.find(
      (config) => config.collectionName === (entry.lookupCollection ?? "CusCodeList")
    ) ??
    masterCollectionConfigs[0] ?? {
      collectionName: "CusCodeList",
      displayName: "CusCodeList",
      fields: ["CusCode", "CusNameJP"],
    }
  const lookupFields = lookupCollection.fields.length ? lookupCollection.fields : ["id"]

  return (
    <div className="grid gap-3">
      {entry.dataSource === "orderFile" ? (
        <>
          <div className="grid gap-2 md:grid-cols-[220px_1fr]">
            <Field label="取得タイプ">
              <Select
                value={entry.orderFileMode ?? "fixedCell"}
                onValueChange={(value) =>
                  onChange({ orderFileMode: value as ImportMappingOrderFileMode })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(orderFileModeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <FormatConditionsEditor entry={entry} onChange={onChange} />
          </div>

          {entry.orderFileMode === "fixedCell" ? (
            <Field label="取得元セル" messages={getIssueMessages(issues, "sourceCell", entry.id)}>
              <Input
                value={entry.sourceCell ?? ""}
                onChange={(event) => onChange({ sourceCell: event.target.value.toUpperCase() })}
                placeholder="K4"
              />
            </Field>
          ) : null}

          {entry.orderFileMode === "detailColumn" ? (
            <div className="grid gap-2 md:grid-cols-3">
              <Field label="取得元列" messages={getIssueMessages(issues, "sourceColumn", entry.id)}>
                <Input
                  value={entry.sourceColumn ?? ""}
                  onChange={(event) =>
                    onChange({ sourceColumn: event.target.value.toUpperCase() })
                  }
                  placeholder="R"
                />
              </Field>
            </div>
          ) : null}

          {entry.orderFileMode === "sourceFormula" ? (
            <div className="grid gap-2 md:grid-cols-3">
              <Field label="元データ種別">
                <Select
                  value={entry.sourceDataKind ?? "number"}
                  onValueChange={(value) =>
                    onChange({ sourceDataKind: value as "number" | "array" })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="number">数値</SelectItem>
                    <SelectItem value="array">配列</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="取得元セル/列" messages={getIssueMessages(issues, "sourcePosition", entry.id)}>
                <Input
                  value={entry.sourcePosition ?? ""}
                  onChange={(event) =>
                    onChange({ sourcePosition: event.target.value.toUpperCase() })
                  }
                  placeholder="Q7"
                />
              </Field>
              <Field label="計算式" messages={getIssueMessages(issues, "sourceFormula", entry.id)}>
                <Input
                  value={entry.sourceFormula ?? ""}
                  onChange={(event) => onChange({ sourceFormula: event.target.value })}
                  placeholder="Q7 - 1"
                />
              </Field>
            </div>
          ) : null}
        </>
      ) : null}

      {entry.dataSource === "fixedValue" ? (
        <div className="grid gap-2 md:grid-cols-[1fr_220px]">
          <Field label="固定値" messages={getIssueMessages(issues, "fixedValue", entry.id)}>
            <Input
              value={entry.fixedValue ?? ""}
              onChange={(event) => onChange({ fixedValue: event.target.value })}
              placeholder="0"
            />
          </Field>
          <FormatConditionsEditor entry={entry} onChange={onChange} />
        </div>
      ) : null}

      {entry.dataSource === "formula" ? (
        <div className="grid gap-2 md:grid-cols-[1fr_220px]">
          <Field label="計算式" messages={getIssueMessages(issues, "formula", entry.id)}>
            <Input
              value={entry.formula ?? ""}
              onChange={(event) => onChange({ formula: event.target.value })}
              placeholder="=A*C"
            />
          </Field>
          <FormatConditionsEditor entry={entry} onChange={onChange} />
        </div>
      ) : null}

      {entry.dataSource === "masterLookup" ? (
        <div className="grid gap-2 md:grid-cols-3">
          <Field label="参照CSV列" messages={getIssueMessages(issues, "lookupCsvColumn", entry.id)}>
            <ColumnSelect
              value={entry.lookupCsvColumn ?? "A"}
              onChange={(lookupCsvColumn) => onChange({ lookupCsvColumn })}
            />
          </Field>
          <Field label="マスタコレクション">
            <Select
              value={entry.lookupCollection ?? lookupCollection.collectionName}
              onValueChange={(value) => {
                const nextCollection =
                  masterCollectionConfigs.find((config) => config.collectionName === value) ??
                  lookupCollection
                const fields = nextCollection.fields.length ? nextCollection.fields : ["id"]
                onChange({
                  lookupCollection: nextCollection.collectionName,
                  lookupKeyField: fields[0],
                  lookupValueField: fields[1] ?? fields[0],
                })
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {masterCollectionConfigs.map((collection) => (
                  <SelectItem key={collection.collectionName} value={collection.collectionName}>
                    {collection.displayName || collection.collectionName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="照合フィールド">
            <FieldSelect
              value={entry.lookupKeyField ?? lookupFields[0]}
              fields={lookupFields}
              onChange={(lookupKeyField) => onChange({ lookupKeyField })}
            />
          </Field>
          <Field label="取得フィールド">
            <FieldSelect
              value={entry.lookupValueField ?? lookupFields[0]}
              fields={lookupFields}
              onChange={(lookupValueField) => onChange({ lookupValueField })}
            />
          </Field>
          <Field label="結果CSV列" messages={getIssueMessages(issues, "lookupTargetColumn", entry.id)}>
            <ColumnSelect
              value={entry.lookupTargetColumn ?? entry.targetColumns[0] ?? "A"}
              onChange={(lookupTargetColumn) => onChange({ lookupTargetColumn })}
            />
          </Field>
          <FormatConditionsEditor entry={entry} onChange={onChange} />
        </div>
      ) : null}

      <Textarea
        value={buildEntrySummary(entry)}
        readOnly
        className="min-h-12 resize-none bg-muted/40 text-xs text-muted-foreground"
        aria-label="設定内容の概要"
      />
    </div>
  )
}

function FormatConditionsTab() {
  return (
    <div className="rounded-md border bg-background">
      <div className="border-b p-4">
        <div className="text-sm font-medium">フォーマット条件</div>
      </div>
      <div className="divide-y">
        {formatConditionOptions.map((condition) => (
          <div
            key={condition}
            className="grid gap-2 p-4 text-sm md:grid-cols-[240px_minmax(0,1fr)]"
          >
            <div className="font-medium">{formatConditionLabels[condition]}</div>
            <div className="text-muted-foreground">
              {formatConditionDescriptions[condition]}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Field({
  label,
  messages = [],
  children,
}: {
  label?: string
  messages?: string[]
  children: React.ReactNode
}) {
  return (
    <div className="grid min-w-0 gap-1.5">
      {label ? (
        <Label className="whitespace-nowrap text-xs text-muted-foreground">{label}</Label>
      ) : null}
      {children}
      {messages.map((message) => (
        <p key={message} className="text-xs text-destructive">
          {message}
        </p>
      ))}
    </div>
  )
}

function getFormatConditions(entry: ImportMappingEntry) {
  return entry.formatConditions?.length ? entry.formatConditions : [entry.format]
}

function getPrimaryFormat(
  conditions: ImportMappingFormatCondition[]
): ImportMappingDataFormat {
  const primary = conditions.find(
    (condition): condition is ImportMappingDataFormat =>
      condition === "original" || condition === "number" || condition === "date"
  )
  return primary ?? "original"
}

function FormatConditionsEditor({
  entry,
  onChange,
}: {
  entry: ImportMappingEntry
  onChange: (patch: Partial<ImportMappingEntry>) => void
}) {
  const conditions = getFormatConditions(entry)

  const updateConditions = (nextConditions: ImportMappingFormatCondition[]) => {
    const normalized: ImportMappingFormatCondition[] = nextConditions.length
      ? nextConditions
      : ["original"]
    onChange({
      format: getPrimaryFormat(normalized),
      formatConditions: normalized,
    })
  }

  return (
    <Field label="入力フォーマット">
      <div className="grid gap-2">
        {conditions.map((condition, index) => (
          <div key={`${condition}-${index}`} className="flex min-w-0 gap-2">
            <Select
              value={condition}
              onValueChange={(nextValue) => {
                const nextConditions = [...conditions]
                nextConditions[index] = nextValue as ImportMappingFormatCondition
                updateConditions(nextConditions)
              }}
            >
              <SelectTrigger className="w-full min-w-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {formatConditionOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {formatConditionLabels[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() =>
                updateConditions(conditions.filter((_, conditionIndex) => conditionIndex !== index))
              }
              disabled={conditions.length <= 1}
              aria-label="フォーマット条件を削除"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="w-fit"
          onClick={() => updateConditions([...conditions, "left32"])}
        >
          <Plus className="size-4" />
          条件を追加
        </Button>
      </div>
    </Field>
  )
}

function FieldSelect({
  value,
  fields,
  onChange,
}: {
  value: string
  fields: string[]
  onChange: (value: string) => void
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {fields.map((field) => (
          <SelectItem key={field} value={field}>
            {field}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function ColumnSelect({
  value,
  onChange,
}: {
  value: CsvColumnLetter
  onChange: (value: CsvColumnLetter) => void
}) {
  return (
    <Input
      value={value}
      onChange={(event) => {
        const parsed = parseCsvColumns(event.target.value)[0]
        if (parsed) onChange(parsed)
      }}
      placeholder="A"
    />
  )
}

function PreviewDialog({
  open,
  onOpenChange,
  mapping,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mapping: ImportMappingConfig | null
}) {
  const previewColumns = React.useMemo(() => {
    if (!mapping) return []

    return sortMappingEntries(mapping.entries).flatMap((entry) =>
      entry.targetColumns.map((column) => ({
        column,
        name: entry.targetColumnName,
        method: dataSourceLabels[entry.dataSource],
        summary: buildEntrySummaryForColumn(entry, column),
        hideInCompactView: Boolean(entry.hideInCompactView),
        includeInCsvDownload: entry.includeInCsvDownload !== false,
      }))
    )
  }, [mapping])

  const downloadPreviewExcel = () => {
    if (!mapping || !previewColumns.length) return

    const worksheet = XLSX.utils.aoa_to_sheet([
      previewColumns.map((item) => item.column),
      previewColumns.map((item) => item.name || ""),
      previewColumns.map((item) => item.summary),
      previewColumns.map((item) => item.method),
      previewColumns.map((item) => (item.hideInCompactView ? "はい" : "いいえ")),
      previewColumns.map((item) => (item.includeInCsvDownload ? "はい" : "いいえ")),
    ])

    const range = XLSX.utils.decode_range(worksheet["!ref"] ?? "A1:A1")
    for (let columnIndex = range.s.c; columnIndex <= range.e.c; columnIndex += 1) {
      const headerCell = XLSX.utils.encode_cell({ r: 1, c: columnIndex })
      if (worksheet[headerCell]) {
        worksheet[headerCell].s = {
          fill: { fgColor: { rgb: "FFFF00" } },
          font: { bold: true },
          alignment: { wrapText: true, vertical: "center" },
        }
      }
    }

    worksheet["!cols"] = previewColumns.map(() => ({ wch: 18 }))
    worksheet["!rows"] = [
      { hpt: 18 },
      { hpt: 44 },
      { hpt: 88 },
      { hpt: 32 },
      { hpt: 28 },
      { hpt: 28 },
    ]

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "プレビュー")
    const safeName = mapping.name.replace(/[\\/:*?"<>|]/g, "_")
    XLSX.writeFile(workbook, `${safeName || "mapping"}-preview.xlsx`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <DialogTitle>プレビュー</DialogTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={downloadPreviewExcel}
              disabled={!mapping || !previewColumns.length}
            >
              <Download className="size-4" />
              Excelダウンロード
            </Button>
          </div>
        </DialogHeader>
        <div className="grid gap-3 text-sm">
          <div className="grid gap-2 rounded-md border p-3 md:grid-cols-3">
            <div>マッピング名: {mapping?.name ?? "-"}</div>
            <div>明細開始行: {mapping?.startDetailRow ?? "-"}</div>
            <div>有効行判定列: {mapping?.validRowColumn ?? "-"}</div>
          </div>
          <div className="max-h-[62vh] overflow-auto rounded-md border bg-white">
            <div
              className="grid min-w-max"
              style={{
                gridTemplateColumns: `repeat(${Math.max(previewColumns.length, 1)}, minmax(112px, 140px))`,
              }}
            >
              {previewColumns.map((item) => (
                <div
                  key={`column-${item.column}`}
                  className="border-b border-r bg-white px-2 py-1 text-xs font-medium"
                >
                  {item.column}
                </div>
              ))}
              {previewColumns.map((item) => (
                <div
                  key={`name-${item.column}`}
                  className="min-h-16 whitespace-pre-wrap break-words border-b border-r bg-yellow-300 px-2 py-2 text-sm font-medium leading-relaxed text-black"
                >
                  {item.name || "-"}
                </div>
              ))}
              {previewColumns.map((item) => (
                <div
                  key={`summary-${item.column}`}
                  className="min-h-32 whitespace-pre-wrap break-words border-b border-r bg-white px-2 py-3 text-sm leading-relaxed"
                >
                  {item.summary}
                </div>
              ))}
              {previewColumns.map((item) => (
                <div
                  key={`method-${item.column}`}
                  className="min-h-10 whitespace-pre-wrap break-words border-b border-r bg-muted/30 px-2 py-2 text-xs text-muted-foreground"
                >
                  {item.method}
                </div>
              ))}
              {previewColumns.map((item) => (
                <div
                  key={`compact-${item.column}`}
                  className="min-h-10 whitespace-pre-wrap break-words border-b border-r bg-white px-2 py-2 text-xs leading-relaxed"
                >
                  <span className="text-muted-foreground">簡易表示で非表示: </span>
                  {item.hideInCompactView ? "はい" : "いいえ"}
                </div>
              ))}
              {previewColumns.map((item) => (
                <div
                  key={`download-${item.column}`}
                  className="min-h-10 whitespace-pre-wrap break-words border-r bg-white px-2 py-2 text-xs leading-relaxed"
                >
                  <span className="text-muted-foreground">CSVダウンロード時に表示: </span>
                  {item.includeInCsvDownload ? "はい" : "いいえ"}
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function HistoryDialog({
  open,
  onOpenChange,
  histories,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  histories: ImportMappingConfigHistory[]
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>変更履歴</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-auto rounded-md border">
          {histories.length ? (
            histories.map((history) => (
              <div key={history.id ?? `${history.mappingId}-${history.changedAt}`} className="border-b p-3 text-sm last:border-b-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{history.action}</Badge>
                  <span>{getChangedAtText(history.changedAt)}</span>
                  <span className="text-muted-foreground">{history.changedBy ?? "-"}</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {history.oldValue?.name ?? "-"} → {history.newValue?.name ?? "-"}
                </div>
              </div>
            ))
          ) : (
            <div className="p-6 text-sm text-muted-foreground">
              変更履歴がありません。
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function buildFormatConditionSummary(entry: ImportMappingEntry) {
  return getFormatConditions(entry)
    .map((condition) => formatConditionLabels[condition])
    .join(" / ")
}

function withFormatSummary(summary: string, entry: ImportMappingEntry) {
  return `${summary}\nフォーマット: ${buildFormatConditionSummary(entry)}`
}

function buildEntrySummary(entry: ImportMappingEntry) {
  const targets = entry.targetColumns.join(", ")

  if (entry.dataSource === "orderFile") {
    if (entry.orderFileMode === "fixedCell") {
      return withFormatSummary(`固定セル ${entry.sourceCell || "未設定"} → ${targets}`, entry)
    }
    if (entry.orderFileMode === "detailColumn") {
      return withFormatSummary(
        `明細列 ${entry.sourceColumn || "未設定"} → ${targets}`,
        entry
      )
    }
    return withFormatSummary(`注文ファイル計算 ${entry.sourceFormula || "未設定"} → ${targets}`, entry)
  }

  if (entry.dataSource === "fixedValue") {
    return withFormatSummary(`固定値 ${entry.fixedValue || "未設定"} → ${targets}`, entry)
  }

  if (entry.dataSource === "formula") {
    return withFormatSummary(`計算式 ${entry.formula || "未設定"} → ${targets}`, entry)
  }

  if (entry.dataSource === "blank") {
    return withFormatSummary(`空欄 → ${targets}`, entry)
  }

  if (entry.dataSource === "manualInput") {
    return withFormatSummary(`後で入力 → ${targets}`, entry)
  }

  return withFormatSummary(
    `VLOOKUP ${entry.lookupCsvColumn || "未設定"} → ${entry.lookupCollection || "未設定"}.${entry.lookupValueField || "未設定"} → ${entry.lookupTargetColumn || targets}`,
    entry
  )
}

function buildEntrySummaryForColumn(entry: ImportMappingEntry, targetColumn: CsvColumnLetter) {
  if (entry.dataSource === "orderFile") {
    if (entry.orderFileMode === "fixedCell") {
      return withFormatSummary(`固定セル ${entry.sourceCell || "未設定"} → ${targetColumn}`, entry)
    }
    if (entry.orderFileMode === "detailColumn") {
      return withFormatSummary(
        `明細列 ${entry.sourceColumn || "未設定"} → ${targetColumn}`,
        entry
      )
    }
    return withFormatSummary(`注文ファイル計算 ${entry.sourceFormula || "未設定"} → ${targetColumn}`, entry)
  }

  if (entry.dataSource === "fixedValue") {
    return withFormatSummary(`固定値 ${entry.fixedValue || "未設定"} → ${targetColumn}`, entry)
  }

  if (entry.dataSource === "formula") {
    return withFormatSummary(`計算式 ${entry.formula || "未設定"} → ${targetColumn}`, entry)
  }

  if (entry.dataSource === "blank") {
    return withFormatSummary(`空欄 → ${targetColumn}`, entry)
  }

  if (entry.dataSource === "manualInput") {
    return withFormatSummary(`後で入力 → ${targetColumn}`, entry)
  }

  return withFormatSummary(
    `VLOOKUP ${entry.lookupCsvColumn || "未設定"}\n${entry.lookupCollection || "未設定"}.${entry.lookupValueField || "未設定"} → ${targetColumn}`,
    entry
  )
}
