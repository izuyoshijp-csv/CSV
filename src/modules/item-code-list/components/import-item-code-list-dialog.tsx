"use client"

import { useCallback, useRef, useState } from "react"
import { Download, FileSpreadsheet, Upload, X } from "lucide-react"
import * as XLSX from "xlsx"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { checkDuplicateMAVAndMHB } from "@/modules/item-code-list/services/item-code-list-services"
import type { ItemCodeList } from "@/modules/item-code-list/services/types/item-code-list-types"

interface ImportItemCodeListDialogProps {
  onImportItems?: (items: ItemCodeList[]) => void | Promise<void>
  trigger?: React.ReactNode
}

interface ParsedItem {
  MAVCode: string
  MHBCode: string
  IzuyoshiJPCode: string
  IzuyoshiVNCode: string
  Description: string
  id: string
  documentId: string
  baseDocumentId: string
  _rowIndex: number
  _valid: boolean
  _isDuplicate: boolean
  _errors: string[]
}

function parseFile(file: File): Promise<ParsedItem[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: "array" })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const json = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
          defval: "",
        })

        const parsed: ParsedItem[] = json.map((row, index) => {
          const errors: string[] = []
          const MAVCode = (row.MAVCode || row.mavcode || row["MAV Code"] || "").trim()
          const MHBCode = (row.MHBCode || row.mhbcode || row["MHB Code"] || "").trim()
          const IzuyoshiJPCode = (
            row.IzuyoshiJPCode ||
            row.izuyoshijpcode ||
            row["Izuyoshi JP Code"] ||
            row["IzuyoshiJPCode"] ||
            ""
          ).trim()
          const IzuyoshiVNCode = (
            row.IzuyoshiVNCode ||
            row.izuyoshivncode ||
            row["Izuyoshi VN Code"] ||
            ""
          ).trim()
          const Description = (row.Description || row.description || "").trim()

          if (!IzuyoshiJPCode) {
            errors.push("IzuyoshiJPCode is required")
          } else {
            const hasMAV = Boolean(MAVCode)
            const hasMHB = Boolean(MHBCode)
            if (!hasMAV && !hasMHB) {
              errors.push("Must have at least one pair: (MAVCode + IzuyoshiJPCode) or (MHBCode + IzuyoshiJPCode)")
            }
          }

          return {
            MAVCode,
            MHBCode,
            IzuyoshiJPCode,
            IzuyoshiVNCode,
            Description,
            id: IzuyoshiJPCode || `row-${index}`,
            documentId: IzuyoshiJPCode || `row-${index}`,
            baseDocumentId: IzuyoshiJPCode || `row-${index}`,
            _rowIndex: index + 2,
            _valid: errors.length === 0,
            _isDuplicate: false,
            _errors: errors,
          }
        })

        resolve(parsed)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error("Failed to read file"))
    reader.readAsArrayBuffer(file)
  })
}

export function ImportItemCodeListDialog({
  onImportItems,
  trigger,
}: ImportItemCodeListDialogProps) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<ParsedItem[] | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = useCallback(async (selectedFile: File) => {
    setFile(selectedFile)
    setParseError(null)
    setParsedData(null)

    const ext = selectedFile.name.split(".").pop()?.toLowerCase()
    if (!ext || !["csv", "xlsx", "xls"].includes(ext)) {
      setParseError("Please select a CSV or Excel file (.csv, .xlsx, .xls)")
      return
    }

    try {
      const parsed = await parseFile(selectedFile)
      if (parsed.length === 0) {
        setParseError("The file is empty or has no valid data rows")
        return
      }

      setIsCheckingDuplicates(true)
      const { duplicateMAVCodes, duplicateMHBCodes } = await checkDuplicateMAVAndMHB(parsed)

      const marked = parsed.map((item) => {
        const errors = [...item._errors]
        const isDuplicate =
          (item.MAVCode && duplicateMAVCodes.has(item.MAVCode.trim().toLowerCase())) ||
          (item.MHBCode && duplicateMHBCodes.has(item.MHBCode.trim().toLowerCase()))
        if (isDuplicate) {
          const dupFields: string[] = []
          if (item.MAVCode && duplicateMAVCodes.has(item.MAVCode.trim().toLowerCase()))
            dupFields.push("MAVCode")
          if (item.MHBCode && duplicateMHBCodes.has(item.MHBCode.trim().toLowerCase()))
            dupFields.push("MHBCode")
          errors.push(`Duplicate ${dupFields.join(" & ")} already exists in database`)
        }
        return {
          MAVCode: item.MAVCode,
          MHBCode: item.MHBCode,
          IzuyoshiJPCode: item.IzuyoshiJPCode,
          IzuyoshiVNCode: item.IzuyoshiVNCode,
          Description: item.Description,
          id: item.id,
          documentId: item.documentId,
          baseDocumentId: item.baseDocumentId,
          _rowIndex: item._rowIndex,
          _isDuplicate: Boolean(isDuplicate),
          _valid: errors.length === 0,
          _errors: errors,
        }
      })

      setParsedData(marked)
      setIsCheckingDuplicates(false)
    } catch (err) {
      setParseError(
        `Failed to parse file: ${err instanceof Error ? err.message : "Unknown error"}`
      )
      setIsCheckingDuplicates(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile) handleFileChange(droppedFile)
    },
    [handleFileChange]
  )

  const handleImport = useCallback(async () => {
    if (!parsedData || !onImportItems) return

    const validItems = parsedData
      .filter((item) => item._valid && !item._isDuplicate)
      .map((item) => ({
        id: item.id,
        documentId: item.documentId,
        baseDocumentId: item.baseDocumentId,
        MAVCode: item.MAVCode,
        MHBCode: item.MHBCode,
        IzuyoshiJPCode: item.IzuyoshiJPCode,
        IzuyoshiVNCode: item.IzuyoshiVNCode,
        Description: item.Description,
      }))

    if (validItems.length === 0) {
      toast.error("No valid items to import")
      return
    }

    setIsImporting(true)
    try {
      await onImportItems(validItems)
      toast.success(`Imported ${validItems.length} items successfully`)
      handleClose()
    } catch (err) {
      toast.error(
        `Import failed: ${err instanceof Error ? err.message : "Unknown error"}`
      )
    } finally {
      setIsImporting(false)
    }
  }, [parsedData, onImportItems])

  const handleClose = useCallback(() => {
    setOpen(false)
    setFile(null)
    setParsedData(null)
    setParseError(null)
    setIsCheckingDuplicates(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }, [])

  const validCount = parsedData?.filter((r) => r._valid && !r._isDuplicate).length ?? 0
  const errorCount = parsedData?.filter((r) => !r._valid).length ?? 0
  const duplicateCount = parsedData?.filter((r) => r._isDuplicate && r._valid).length ?? 0

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="cursor-pointer">
            <Upload className="w-4 h-4" />
            <span className="hidden lg:block">Import</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Import ItemCodeList
          </DialogTitle>
          <DialogDescription>
            Upload a CSV or Excel file to bulk import ItemCodeList entries.
            Rows with duplicate MAVCode or MHBCode will be skipped.
            <br />
            <Button
              variant="link"
              className="px-0 h-auto text-primary underline cursor-pointer"
              onClick={() => {
                const wb = XLSX.utils.book_new()
                const headers = [
                  "MAVCode",
                  "MHBCode",
                  "IzuyoshiJPCode",
                  "IzuyoshiVNCode",
                  "Description",
                ]
                const sampleRows = [
                  [
                    "MAVcode001",
                    "",
                    "Jcode0018",
                    "VNcode0018",
                    "白地に黒プリント　(特記事項参照)",
                  ],
                  [
                    "MAVcode002",
                    "",
                    "Jcode0019",
                    "VNcode0019",
                    "白地に黒プリント　(特記事項参照)",
                  ],
                  [
                    "MAVcode003",
                    "",
                    "Jcode0020",
                    "VNcode0020",
                    "Aluminum Plate 100mm x 200mm x 5mm",
                  ],
                ]
                const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows])
                XLSX.utils.book_append_sheet(wb, ws, "ItemCodeList Template")
                XLSX.writeFile(wb, "ItemCodeList_Import_Template.csv")
                toast.success("Template downloaded successfully")
              }}
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              Download Import Template
            </Button>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden space-y-4">
          <div
            className="border-2 border-dashed border-border rounded-lg p-6 text-center transition-colors hover:border-primary/50"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              id="import-file-input"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleFileChange(f)
              }}
            />
            <Label
              htmlFor="import-file-input"
              className="flex flex-col items-center gap-3 cursor-pointer"
            >
              <div className="rounded-full bg-muted p-3">
                <Upload className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  {isCheckingDuplicates
                    ? "Checking duplicates..."
                    : file
                      ? file.name
                      : "Drop your file here or click to browse"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Supports .csv, .xlsx, .xls
                </p>
              </div>
            </Label>
          </div>

          {parseError && (
            <div className="rounded-md bg-destructive/10 text-destructive text-sm p-3">
              {parseError}
            </div>
          )}

          {parsedData && parsedData.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Label className="text-sm font-medium">
                    Preview ({parsedData.length} rows)
                  </Label>
                  {validCount > 0 && (
                    <span className="text-xs text-green-600 font-medium">
                      {validCount} ready to import
                    </span>
                  )}
                  {errorCount > 0 && (
                    <span className="text-xs text-red-500 font-medium">
                      {errorCount} with errors
                    </span>
                  )}
                  {duplicateCount > 0 && (
                    <span className="text-xs text-amber-500 font-medium">
                      {duplicateCount} duplicate
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="cursor-pointer text-muted-foreground hover:text-foreground"
                  onClick={handleClose}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="rounded-md border overflow-hidden">
                <div className="max-h-[280px] overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="px-2 py-2 text-left font-medium text-muted-foreground w-10">
                          #
                        </th>
                        <th className="px-2 py-2 text-left font-medium text-muted-foreground">
                          MAVCode
                        </th>
                        <th className="px-2 py-2 text-left font-medium text-muted-foreground">
                          MHBCode
                        </th>
                        <th className="px-2 py-2 text-left font-medium text-muted-foreground">
                          IzuyoshiJPCode
                        </th>
                        <th className="px-2 py-2 text-left font-medium text-muted-foreground">
                          IzuyoshiVNCode
                        </th>
                        <th className="px-2 py-2 text-left font-medium text-muted-foreground">
                          Description
                        </th>
                        <th className="px-2 py-2 text-left font-medium text-muted-foreground w-20">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData.map((row, i) => {
                        const statusClass = row._isDuplicate
                          ? "bg-amber-50 dark:bg-amber-950/20"
                          : row._valid
                            ? "border-b border-border/50"
                            : "bg-red-50 dark:bg-red-950/20"

                        return (
                          <tr key={i} className={`border-b border-border/50 ${statusClass}`}>
                            <td className="px-2 py-1.5 text-muted-foreground">
                              {row._rowIndex}
                            </td>
                            <td className="px-2 py-1.5 truncate max-w-[120px]">
                              {row.MAVCode || "-"}
                            </td>
                            <td className="px-2 py-1.5 truncate max-w-[80px]">
                              {row.MHBCode || "-"}
                            </td>
                            <td className="px-2 py-1.5 truncate max-w-[120px]">
                              {row.IzuyoshiJPCode || (
                                <span className="text-red-400">required</span>
                              )}
                            </td>
                            <td className="px-2 py-1.5 truncate max-w-[120px]">
                              {row.IzuyoshiVNCode || "-"}
                            </td>
                            <td className="px-2 py-1.5 truncate max-w-[180px]">
                              {row.Description || "-"}
                            </td>
                            <td className="px-2 py-1.5">
                              {row._isDuplicate ? (
                                <div className="group relative">
                                  <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 text-[10px] font-medium cursor-help">
                                    Duplicate
                                  </span>
                                  <div className="hidden group-hover:block absolute z-10 bottom-full right-0 mb-1 w-48 rounded-md bg-popover border shadow-md p-2 text-[10px] text-popover-foreground">
                                    {row._errors.map((err, ei) => (
                                      <div key={ei}>{err}</div>
                                    ))}
                                  </div>
                                </div>
                              ) : row._valid ? (
                                <span className="inline-flex items-center rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 text-[10px] font-medium">
                                  OK
                                </span>
                              ) : (
                                <div className="group relative">
                                  <span className="inline-flex items-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-1.5 py-0.5 text-[10px] font-medium cursor-help">
                                    Error
                                  </span>
                                  <div className="hidden group-hover:block absolute z-10 bottom-full right-0 mb-1 w-48 rounded-md bg-popover border shadow-md p-2 text-[10px] text-popover-foreground">
                                    {row._errors.map((err, ei) => (
                                      <div key={ei}>{err}</div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isImporting}
            className="cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={
              !parsedData ||
              validCount === 0 ||
              isImporting ||
              isCheckingDuplicates
            }
            className="cursor-pointer"
          >
            <Upload className="w-4 h-4 mr-2" />
            {isImporting
              ? "Importing..."
              : isCheckingDuplicates
                ? "Checking..."
                : `Import ${validCount > 0 ? validCount : ""} Items`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
