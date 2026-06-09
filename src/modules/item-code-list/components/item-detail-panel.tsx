"use client"

import { useState } from "react"
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  itemCodeListSchema,
  type ItemCodeList,
} from "@/modules/item-code-list/services/types/item-code-list-types"

interface ItemDetailPanelProps {
  item: ItemCodeList
  onUpdateItem?: (item: ItemCodeList) => void | Promise<void>
  onDeleteItem?: (itemId: string) => void | Promise<void>
}

function FieldRow({ label, value }: { label: string; value: string | number | undefined }) {
  return (
    <div className="grid grid-cols-[160px_1fr] gap-4 px-4 py-2.5 border-b hover:bg-accent/30 transition-colors">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {label}
        </span>
      </div>
      <div className="flex items-center">
        <span className="text-sm font-mono break-all">
          {value !== undefined && value !== null && value !== "" ? String(value) : ""}
        </span>
      </div>
    </div>
  )
}

function formatUpdatedAt(value: string | number | undefined): string {
  if (!value) return ""
  try {
    const date = typeof value === "number" ? new Date(value) : new Date(value)
    return format(date, "MMM d, yyyy 'at' h:mm:ss a")
  } catch {
    return String(value)
  }
}

export function ItemDetailPanel({ item, onUpdateItem, onDeleteItem }: ItemDetailPanelProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [draft, setDraft] = useState<ItemCodeList>(item)
  const [isSaving, setIsSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  function openEditSheet() {
    setDraft(item)
    setErrors({})
    setEditOpen(true)
  }

  async function handleSaveEdit() {
    try {
      const parsed = itemCodeListSchema.partial().safeParse(draft)
      if (!parsed.success) {
        const newErrors: Record<string, string> = {}
        parsed.error.issues.forEach((issue) => {
          if (issue.path[0]) {
            newErrors[issue.path[0] as string] = issue.message
          }
        })
        setErrors(newErrors)
        return
      }
      setIsSaving(true)
      await onUpdateItem?.(draft)
      setEditOpen(false)
      toast.success("Document updated successfully")
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Failed to update document")
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    try {
      await onDeleteItem?.(item.id)
      setDeleteOpen(false)
      toast.success("Document deleted successfully")
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : "Failed to delete document")
    }
  }

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-base font-semibold truncate">{item.documentId || item.id}</h2>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 cursor-pointer"
              onClick={openEditSheet}
            >
              <Pencil className="h-3.5 w-3.5 mr-1" />
              Edit
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 cursor-pointer">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="cursor-pointer text-destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete document
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Fields */}
        <ScrollArea className="flex-1">
          <FieldRow label="documentId" value={item.documentId} />
          <FieldRow label="baseDocumentId" value={item.baseDocumentId} />
          <FieldRow label="MAVCode" value={item.MAVCode} />
          <FieldRow label="MHBCode" value={item.MHBCode} />
          <FieldRow label="IzuyoshiJPCode" value={item.IzuyoshiJPCode} />
          <FieldRow label="IzuyoshiVNCode" value={item.IzuyoshiVNCode} />
          <FieldRow label="Description" value={item.Description} />
          {item.updatedAt && (
            <FieldRow label="updatedAt" value={formatUpdatedAt(item.updatedAt)} />
          )}
        </ScrollArea>
      </div>

      {/* Edit Sheet */}
      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent side="right" className="sm:max-w-[480px]">
          <SheetHeader>
            <SheetTitle>Edit Document</SheetTitle>
            <SheetDescription>
              Update the document fields and save changes to Firestore.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-5 mt-6">
            {errors.root ? (
              <p className="text-sm text-destructive">{errors.root}</p>
            ) : null}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-doc-id" className="text-xs uppercase text-muted-foreground">
                  Document ID
                </Label>
                <p className="text-sm font-medium font-mono">{item.id}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-mhbcode">MHB Code</Label>
                <Input
                  id="edit-mhbcode"
                  value={draft.MHBCode}
                  onChange={(e) =>
                    setDraft((current) => current ? { ...current, MHBCode: e.target.value } : current)
                  }
                  className={errors.MHBCode ? "border-red-500" : ""}
                />
                {errors.MHBCode && <p className="text-xs text-red-500">{errors.MHBCode}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase text-muted-foreground">
                  Izuyoshi JP Code
                </Label>
                <p className="text-sm font-medium font-mono">{item.IzuyoshiJPCode}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-izuvn">Izuyoshi VN Code</Label>
                <Input
                  id="edit-izuvn"
                  value={draft.IzuyoshiVNCode}
                  onChange={(e) =>
                    setDraft((current) => current ? { ...current, IzuyoshiVNCode: e.target.value } : current)
                  }
                  className={errors.IzuyoshiVNCode ? "border-red-500" : ""}
                />
                {errors.IzuyoshiVNCode && <p className="text-xs text-red-500">{errors.IzuyoshiVNCode}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-mavcode">MAV Code</Label>
                <Input
                  id="edit-mavcode"
                  value={draft.MAVCode}
                  onChange={(e) =>
                    setDraft((current) => current ? { ...current, MAVCode: e.target.value } : current)
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-desc">Description</Label>
              <Input
                id="edit-desc"
                value={draft.Description}
                onChange={(e) =>
                  setDraft((current) => current ? { ...current, Description: e.target.value } : current)
                }
                className={errors.Description ? "border-red-500" : ""}
              />
              {errors.Description && <p className="text-xs text-red-500">{errors.Description}</p>}
            </div>
          </div>

          <SheetFooter className="mt-8">
            <Button
              variant="outline"
              onClick={() => setEditOpen(false)}
              disabled={isSaving}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={isSaving}
              className="cursor-pointer"
            >
              {isSaving ? "Saving..." : "Save changes"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{item.id}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
