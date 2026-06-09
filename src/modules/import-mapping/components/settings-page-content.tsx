"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { Copy, FileSpreadsheet, ListPlus, Plus, Save, Settings2, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

type SettingsTab = "display" | "mapping"
type AcquisitionMethod = "orderFile" | "fixedValue" | "masterLookup" | "formula"
type OrderFileSourceMode = "cell" | "range" | "sourceFormula"
type DataFormat = "original" | "number" | "date"
type SourceDataKind = "number" | "array"

type MappingRule = {
  id: string
  csvColumn: string
  columnName: string
  method: AcquisitionMethod
  orderFileSourceMode: OrderFileSourceMode
  sourceCell: string
  sourceColumn: string
  startRow: string
  endDetectionColumn: string
  sourceDataKind: SourceDataKind
  sourcePosition: string
  sourceFormula: string
  format: DataFormat
  fixedValue: string
  formula: string
  lookupCsvColumn: string
  lookupCollection: MasterCollection
  lookupKeyField: string
  lookupValueField: string
  lookupTargetColumn: string
}

type MappingConfig = {
  id: string
  name: string
  rules: MappingRule[]
}

type MasterCollection =
  | "CusCodeList"
  | "ItemCodeList"
  | "UnitPriceList"
  | "PIC.WH.CodeList"
  | "UnitCodeList"

const masterCollectionFields: Record<MasterCollection, string[]> = {
  CusCodeList: ["CusCode", "CusNameEng", "CusNameJP", "CusAddress"],
  ItemCodeList: ["MAVCode", "MHBCode", "IzuyoshiJPCode", "IzuyoshiVNCode", "Description"],
  UnitPriceList: ["IzuyoshiJPCode", "UnitPrice"],
  "PIC.WH.CodeList": ["PICCode", "WarehouseCode", "DetailWarehouseCode"],
  UnitCodeList: ["OrderUnit", "CsvCode"],
}

const methodLabels: Record<AcquisitionMethod, string> = {
  orderFile: "注文ファイルから取得",
  fixedValue: "固定値",
  masterLookup: "マスタデータ参照",
  formula: "計算式",
}

const formatLabels: Record<DataFormat, string> = {
  original: "元の形式を保持",
  number: "Number 00,000.00",
  date: "Date yyyymmdd",
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function createRule(seed: Partial<MappingRule> = {}): MappingRule {
  return {
    id: makeId("rule"),
    csvColumn: "A",
    columnName: "",
    method: "orderFile",
    orderFileSourceMode: "cell",
    sourceCell: "",
    sourceColumn: "",
    startRow: "17",
    endDetectionColumn: "",
    sourceDataKind: "number",
    sourcePosition: "",
    sourceFormula: "",
    format: "original",
    fixedValue: "",
    formula: "",
    lookupCsvColumn: "",
    lookupCollection: "CusCodeList",
    lookupKeyField: "CusCode",
    lookupValueField: "CusNameJP",
    lookupTargetColumn: "",
    ...seed,
  }
}

const initialMappings: MappingConfig[] = [
  {
    id: "default",
    name: "標準マッピング",
    rules: [
      createRule({
        csvColumn: "A",
        columnName: "会社コード",
        method: "orderFile",
        orderFileSourceMode: "cell",
        sourceCell: "K4",
        format: "original",
      }),
      createRule({
        csvColumn: "C",
        columnName: "分納区分",
        method: "fixedValue",
        fixedValue: "0",
        format: "original",
      }),
      createRule({
        csvColumn: "X",
        columnName: "出荷予定日",
        method: "orderFile",
        orderFileSourceMode: "sourceFormula",
        sourceDataKind: "number",
        sourcePosition: "Q7",
        sourceFormula: "Q7 - 1",
        format: "date",
      }),
    ],
  },
]

export function SettingsPageContent({ initialTab }: { initialTab: SettingsTab }) {
  const router = useRouter()
  const pathname = usePathname()
  const [activeTab, setActiveTab] = React.useState<SettingsTab>(initialTab)
  const [mappings, setMappings] = React.useState<MappingConfig[]>(initialMappings)
  const [selectedMappingId, setSelectedMappingId] = React.useState(initialMappings[0]?.id ?? "")

  const selectedMapping = mappings.find((mapping) => mapping.id === selectedMappingId) ?? mappings[0]

  const handleTabChange = (value: string) => {
    const nextTab: SettingsTab = value === "display" ? "display" : "mapping"
    setActiveTab(nextTab)
    router.replace(`${pathname}?tab=${nextTab === "display" ? "display" : "mapping"}`, {
      scroll: false,
    })
  }

  const updateSelectedMapping = (patch: Partial<MappingConfig>) => {
    if (!selectedMapping) return
    setMappings((current) =>
      current.map((mapping) =>
        mapping.id === selectedMapping.id ? { ...mapping, ...patch } : mapping
      )
    )
  }

  const updateRule = (ruleId: string, patch: Partial<MappingRule>) => {
    if (!selectedMapping) return
    updateSelectedMapping({
      rules: selectedMapping.rules.map((rule) =>
        rule.id === ruleId ? { ...rule, ...patch } : rule
      ),
    })
  }

  const addMapping = () => {
    const nextMapping: MappingConfig = {
      id: makeId("mapping"),
      name: "新規マッピング",
      rules: [createRule()],
    }
    setMappings((current) => [...current, nextMapping])
    setSelectedMappingId(nextMapping.id)
    setActiveTab("mapping")
    router.replace(`${pathname}?tab=mapping`, { scroll: false })
  }

  const deleteMapping = (mappingId: string) => {
    setMappings((current) => {
      const next = current.filter((mapping) => mapping.id !== mappingId)
      const fallback = next[0]
      setSelectedMappingId(fallback?.id ?? "")
      return next
    })
    toast.success("マッピングを削除しました。")
  }

  const addRule = () => {
    if (!selectedMapping) return
    updateSelectedMapping({ rules: [...selectedMapping.rules, createRule()] })
  }

  const duplicateRule = (rule: MappingRule) => {
    if (!selectedMapping) return
    updateSelectedMapping({
      rules: [...selectedMapping.rules, { ...rule, id: makeId("rule") }],
    })
  }

  const deleteRule = (ruleId: string) => {
    if (!selectedMapping) return
    updateSelectedMapping({
      rules: selectedMapping.rules.filter((rule) => rule.id !== ruleId),
    })
  }

  const saveMapping = () => {
    toast.success("マッピングを保存しました。")
  }

  return (
    <div className="flex flex-col gap-4 px-4 md:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">設定</h1>
        <p className="text-sm text-muted-foreground">
          受注ファイルからCSVへ出力するための設定を管理します。
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="gap-4">
        <div className="overflow-x-auto pb-1">
          <TabsList className="min-w-max">
            <TabsTrigger value="display">表示</TabsTrigger>
            <TabsTrigger value="mapping">マッピング一覧</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="display" className="min-h-80 rounded-md border bg-background p-6">
          <div className="flex h-48 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
            表示設定は次回設定します。
          </div>
        </TabsContent>

        <TabsContent value="mapping">
          <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="rounded-md border bg-background p-3">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Settings2 className="size-4" />
                  マッピング
                </div>
                <Button type="button" size="sm" onClick={addMapping}>
                  <Plus className="size-4" />
                  新規
                </Button>
              </div>

              <div className="flex flex-col gap-2">
                {mappings.map((mapping) => (
                  <button
                    key={mapping.id}
                    type="button"
                    onClick={() => setSelectedMappingId(mapping.id)}
                    className={[
                      "rounded-md border px-3 py-2 text-left text-sm transition-colors",
                      selectedMapping?.id === mapping.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "bg-background hover:bg-muted",
                    ].join(" ")}
                  >
                    <span className="block truncate font-medium">{mapping.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {mapping.rules.length} 件
                    </span>
                  </button>
                ))}
              </div>
            </aside>

            <section className="min-w-0 rounded-md border bg-background">
              {selectedMapping ? (
                <div className="flex flex-col gap-4 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div className="grid flex-1 gap-2">
                      <Label htmlFor="mapping-name">マッピング名</Label>
                      <Input
                        id="mapping-name"
                        value={selectedMapping.name}
                        onChange={(event) =>
                          updateSelectedMapping({ name: event.target.value })
                        }
                        placeholder="マッピング名を入力"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" onClick={addRule}>
                        <ListPlus className="size-4" />
                        行を追加
                      </Button>
                      <Button type="button" onClick={saveMapping}>
                        <Save className="size-4" />
                        保存
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => deleteMapping(selectedMapping.id)}
                        disabled={mappings.length <= 1}
                      >
                        <Trash2 className="size-4" />
                        削除
                      </Button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <div className="min-w-[1040px] divide-y rounded-md border">
                      <div className="grid grid-cols-[120px_180px_220px_minmax(0,1fr)_112px] bg-muted/60 text-sm font-medium">
                        <div className="p-3">CSV列</div>
                        <div className="p-3">列名</div>
                        <div className="p-3">データ取得方法</div>
                        <div className="p-3">設定内容</div>
                        <div className="p-3 text-right">操作</div>
                      </div>

                      {selectedMapping.rules.map((rule) => (
                        <MappingRuleRow
                          key={rule.id}
                          rule={rule}
                          onChange={(patch) => updateRule(rule.id, patch)}
                          onDuplicate={() => duplicateRule(rule)}
                          onDelete={() => deleteRule(rule.id)}
                          canDelete={selectedMapping.rules.length > 1}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex min-h-80 items-center justify-center text-sm text-muted-foreground">
                  マッピングがありません。
                </div>
              )}
            </section>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function MappingRuleRow({
  rule,
  onChange,
  onDuplicate,
  onDelete,
  canDelete,
}: {
  rule: MappingRule
  onChange: (patch: Partial<MappingRule>) => void
  onDuplicate: () => void
  onDelete: () => void
  canDelete: boolean
}) {
  const lookupFields = masterCollectionFields[rule.lookupCollection]

  return (
    <div className="grid grid-cols-[120px_180px_220px_minmax(0,1fr)_112px] text-sm">
      <div className="p-3">
        <Input
          value={rule.csvColumn}
          onChange={(event) => onChange({ csvColumn: event.target.value.toUpperCase() })}
          placeholder="A"
        />
      </div>

      <div className="p-3">
        <Input
          value={rule.columnName}
          onChange={(event) => onChange({ columnName: event.target.value })}
          placeholder="列名"
        />
      </div>

      <div className="p-3">
        <Select
          value={rule.method}
          onValueChange={(value: AcquisitionMethod) => onChange({ method: value })}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(methodLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="p-3">
        <RuleDetailFields rule={rule} lookupFields={lookupFields} onChange={onChange} />
      </div>

      <div className="flex justify-end gap-1 p-3">
        <Button type="button" size="icon" variant="ghost" onClick={onDuplicate} aria-label="複製">
          <Copy className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={onDelete}
          disabled={!canDelete}
          aria-label="削除"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  )
}

function RuleDetailFields({
  rule,
  lookupFields,
  onChange,
}: {
  rule: MappingRule
  lookupFields: string[]
  onChange: (patch: Partial<MappingRule>) => void
}) {
  return (
    <div className="grid gap-3">
      {rule.method === "orderFile" ? (
        <>
          <div className="grid gap-2 md:grid-cols-[220px_1fr]">
            <Field label="取得タイプ">
              <Select
                value={rule.orderFileSourceMode}
                onValueChange={(value: OrderFileSourceMode) =>
                  onChange({ orderFileSourceMode: value })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cell">固定セルから取得</SelectItem>
                  <SelectItem value="range">明細範囲から取得</SelectItem>
                  <SelectItem value="sourceFormula">注文ファイルの値で計算</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <FormatSelect value={rule.format} onChange={(format) => onChange({ format })} />
          </div>

          {rule.orderFileSourceMode === "cell" ? (
            <Field label="取得元セル">
              <Input
                value={rule.sourceCell}
                onChange={(event) => onChange({ sourceCell: event.target.value.toUpperCase() })}
                placeholder="K4"
              />
            </Field>
          ) : null}

          {rule.orderFileSourceMode === "range" ? (
            <div className="grid gap-2 md:grid-cols-3">
              <Field label="取得元列">
                <Input
                  value={rule.sourceColumn}
                  onChange={(event) =>
                    onChange({ sourceColumn: event.target.value.toUpperCase() })
                  }
                  placeholder="R"
                />
              </Field>
              <Field label="開始行">
                <Input
                  value={rule.startRow}
                  onChange={(event) => onChange({ startRow: event.target.value })}
                  inputMode="numeric"
                  placeholder="17"
                />
              </Field>
              <Field label="終了判定列">
                <Input
                  value={rule.endDetectionColumn}
                  onChange={(event) =>
                    onChange({ endDetectionColumn: event.target.value.toUpperCase() })
                  }
                  placeholder="R"
                />
              </Field>
            </div>
          ) : null}

          {rule.orderFileSourceMode === "sourceFormula" ? (
            <div className="grid gap-2 md:grid-cols-2">
              <Field label="元データ種別">
                <Select
                  value={rule.sourceDataKind}
                  onValueChange={(value: SourceDataKind) => onChange({ sourceDataKind: value })}
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
              <Field label="取得元セル/列">
                <Input
                  value={rule.sourcePosition}
                  onChange={(event) =>
                    onChange({ sourcePosition: event.target.value.toUpperCase() })
                  }
                  placeholder="Q7"
                />
              </Field>
              <Field label="計算式">
                <Input
                  value={rule.sourceFormula}
                  onChange={(event) => onChange({ sourceFormula: event.target.value })}
                  placeholder="Q7 - 1"
                />
              </Field>
              <div className="flex items-end gap-2 text-xs text-muted-foreground">
                <FileSpreadsheet className="mb-2 size-4" />
                日付の加算・減算を優先して扱います。
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      {rule.method === "fixedValue" ? (
        <div className="grid gap-2 md:grid-cols-[1fr_220px]">
          <Field label="固定値">
            <Input
              value={rule.fixedValue}
              onChange={(event) => onChange({ fixedValue: event.target.value })}
              placeholder="0"
            />
          </Field>
          <FormatSelect value={rule.format} onChange={(format) => onChange({ format })} />
        </div>
      ) : null}

      {rule.method === "formula" ? (
        <div className="grid gap-2 md:grid-cols-[1fr_220px]">
          <Field label="計算式">
            <Input
              value={rule.formula}
              onChange={(event) => onChange({ formula: event.target.value })}
              placeholder="=A*C"
            />
          </Field>
          <FormatSelect value={rule.format} onChange={(format) => onChange({ format })} />
        </div>
      ) : null}

      {rule.method === "masterLookup" ? (
        <div className="grid gap-2 md:grid-cols-3">
          <Field label="参照CSV列">
            <Input
              value={rule.lookupCsvColumn}
              onChange={(event) =>
                onChange({ lookupCsvColumn: event.target.value.toUpperCase() })
              }
              placeholder="A"
            />
          </Field>
          <Field label="マスタコレクション">
            <Select
              value={rule.lookupCollection}
              onValueChange={(value: MasterCollection) =>
                onChange({
                  lookupCollection: value,
                  lookupKeyField: masterCollectionFields[value][0],
                  lookupValueField: masterCollectionFields[value][1] ?? masterCollectionFields[value][0],
                })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(masterCollectionFields).map((collection) => (
                  <SelectItem key={collection} value={collection}>
                    {collection}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="照合フィールド">
            <FieldSelect
              value={rule.lookupKeyField}
              fields={lookupFields}
              onChange={(lookupKeyField) => onChange({ lookupKeyField })}
            />
          </Field>
          <Field label="取得フィールド">
            <FieldSelect
              value={rule.lookupValueField}
              fields={lookupFields}
              onChange={(lookupValueField) => onChange({ lookupValueField })}
            />
          </Field>
          <Field label="結果CSV列">
            <Input
              value={rule.lookupTargetColumn}
              onChange={(event) =>
                onChange({ lookupTargetColumn: event.target.value.toUpperCase() })
              }
              placeholder="G"
            />
          </Field>
          <FormatSelect value={rule.format} onChange={(format) => onChange({ format })} />
        </div>
      ) : null}

      <Textarea
        value={buildRuleSummary(rule)}
        readOnly
        className="min-h-12 resize-none bg-muted/40 text-xs text-muted-foreground"
        aria-label="設定内容の概要"
      />
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

function FormatSelect({
  value,
  onChange,
}: {
  value: DataFormat
  onChange: (value: DataFormat) => void
}) {
  return (
    <Field label="入力フォーマット">
      <Select value={value} onValueChange={(nextValue: DataFormat) => onChange(nextValue)}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(formatLabels).map(([format, label]) => (
            <SelectItem key={format} value={format}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
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

function buildRuleSummary(rule: MappingRule) {
  if (rule.method === "orderFile") {
    if (rule.orderFileSourceMode === "cell") {
      return `注文ファイル: ${rule.sourceCell || "未設定"} -> ${rule.csvColumn}`
    }
    if (rule.orderFileSourceMode === "range") {
      return `明細範囲: 列${rule.sourceColumn || "未設定"} / 開始行${rule.startRow || "未設定"} / 終了判定列${rule.endDetectionColumn || "未設定"}`
    }
    return `注文ファイル計算: ${rule.sourceFormula || "未設定"}`
  }

  if (rule.method === "fixedValue") {
    return `固定値: ${rule.fixedValue || "未設定"}`
  }

  if (rule.method === "formula") {
    return `計算式: ${rule.formula || "未設定"}`
  }

  return `VLOOKUP: ${rule.lookupCsvColumn || "未設定"} -> ${rule.lookupCollection}.${rule.lookupValueField} -> ${rule.lookupTargetColumn || rule.csvColumn}`
}
