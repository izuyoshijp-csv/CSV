"use client"

import * as React from "react"
import type { Row } from "@tanstack/react-table"
import { MoreHorizontal, Pencil, Trash2, Eye } from "lucide-react"
import { toast } from "sonner"

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
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { checkDuplicateMHBForUpdate } from "@/modules/item-code-list/services/item-code-list-services"
import {
  itemCodeListSchema,
  type ItemCodeList,
} from "@/modules/item-code-list/services/types/item-code-list-types"

interface DataTableRowActionsProps<TData> {
  row: Row<TData>
  onUpdateItem?: (item: ItemCodeList) => void | Promise<void>
  onDeleteItem?: (itemId: string) => void | Promise<void>
}

export function DataTableRowActions<TData>({
  row,
  onUpdateItem,
  onDeleteItem,
}: DataTableRowActionsProps<TData>) {
  const parsed = itemCodeListSchema.safeParse(row.original)
  const [viewOpen, setViewOpen] = React.useState(false)
  const [editOpen, setEditOpen] = React.useState(false)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [draft, setDraft] = React.useState<ItemCodeList | null>(null)
  const [isSaving, setIsSaving] = React.useState(false)
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  if (!parsed.success) {
    return null
  }

  const item = parsed.data

  function openEditSheet() {
    setDraft(item)
    setErrors({})
    setEditOpen(true)
  }

  function openViewSheet() {
    setViewOpen(true)
  }

  async function handleSaveEdit() {
    if (!draft) return

    try {
      setIsSaving(true)
      setErrors({})

      // Check for duplicate MHBCode (excluding current item)
      if (draft.MHBCode?.trim()) {
        const isDuplicate = await checkDuplicateMHBForUpdate(draft.MHBCode, draft.id)
        if (isDuplicate) {
          setErrors({ MHBCode: "MHBCode already exists in another item" })
          setIsSaving(false)
          return
        }
      }

      await onUpdateItem?.(draft)
      setEditOpen(false)
      toast.success("ItemCodeList updated successfully")
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Failed to update item")
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    try {
      await onDeleteItem?.(item.id)
      setDeleteOpen(false)
      toast.success("ItemCodeList deleted successfully")
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : "Failed to delete item")
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex h-8 w-8 p-0 data-[state=open]:bg-muted cursor-pointer"
          >
            <MoreHorizontal />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[160px]">
          <DropdownMenuItem className="cursor-pointer" onClick={openViewSheet}>
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer" onClick={openEditSheet}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer"
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
            <DropdownMenuShortcut className="text-destructive">
              ⌘⌫
            </DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* View Sheet */}
      <Sheet open={viewOpen} onOpenChange={setViewOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>ItemCodeList Details</SheetTitle>
            <SheetDescription>
              Full details for {item.MAVCode}
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground text-xs uppercase">MAV Code</Label>
                <p className="mt-1 font-medium">{item.MAVCode}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs uppercase">MHB Code</Label>
                <p className="mt-1 font-medium">{item.MHBCode}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground text-xs uppercase">Izuyoshi JP Code</Label>
                <p className="mt-1 font-medium">{item.IzuyoshiJPCode}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs uppercase">Izuyoshi VN Code</Label>
                <p className="mt-1 font-medium">{item.IzuyoshiVNCode}</p>
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs uppercase">Description</Label>
              <p className="mt-1">{item.Description}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs uppercase">ID</Label>
              <p className="mt-1 text-sm text-muted-foreground">{item.id}</p>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit Sheet */}
      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent side="right" className="sm:max-w-[480px]">
          <SheetHeader>
            <SheetTitle>Edit ItemCodeList</SheetTitle>
            <SheetDescription>
              Update the item details and save changes to Firestore.
            </SheetDescription>
          </SheetHeader>

          {draft ? (
            <div className="space-y-5 mt-6">
              {errors.root ? (
                <p className="text-sm text-destructive">{errors.root}</p>
              ) : null}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs uppercase">MAV Code</Label>
                  <p className="mt-1 font-medium text-sm">{draft.MAVCode || "-"}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`edit-mhbcode-${item.id}`}>MHB Code</Label>
                  <Input
                    id={`edit-mhbcode-${item.id}`}
                    value={draft.MHBCode}
                    onChange={(e) =>
                      setDraft((current) =>
                        current ? { ...current, MHBCode: e.target.value } : current
                      )
                    }
                    className={errors.MHBCode ? "border-red-500" : ""}
                  />
                  {errors.MHBCode && (
                    <p className="text-sm text-red-500">{errors.MHBCode}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs uppercase">Izuyoshi JP Code</Label>
                  <p className="mt-1 font-medium text-sm">{draft.IzuyoshiJPCode}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`edit-izuvn-${item.id}`}>Izuyoshi VN Code</Label>
                  <Input
                    id={`edit-izuvn-${item.id}`}
                    value={draft.IzuyoshiVNCode}
                    onChange={(e) =>
                      setDraft((current) =>
                        current ? { ...current, IzuyoshiVNCode: e.target.value } : current
                      )
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`edit-desc-${item.id}`}>Description</Label>
                <Input
                  id={`edit-desc-${item.id}`}
                  value={draft.Description}
                  onChange={(e) =>
                    setDraft((current) =>
                      current ? { ...current, Description: e.target.value } : current
                    )
                  }
                />
              </div>
            </div>
          ) : null}

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
            <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this ItemCodeList? This action cannot be undone.
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
