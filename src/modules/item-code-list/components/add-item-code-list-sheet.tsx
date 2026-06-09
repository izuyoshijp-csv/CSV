"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { z } from "zod"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import type { ItemCodeList } from "@/modules/item-code-list/services/types/item-code-list-types"
import { checkDuplicateMAVCode } from "@/modules/item-code-list/services/item-code-list-services"

const itemCodeListFormSchema = z.object({
  MAVCode: z.string(),
  MHBCode: z.string(),
  IzuyoshiJPCode: z.string().min(1, "Izuyoshi JP Code is required"),
  IzuyoshiVNCode: z.string(),
  Description: z.string(),
}).refine(
  (data) => Boolean(data.MAVCode?.trim()) || Boolean(data.MHBCode?.trim()),
  { message: "At least one of MAVCode or MHBCode is required", path: ["MAVCode"] }
)

type ItemCodeListFormData = z.infer<typeof itemCodeListFormSchema>

interface AddItemCodeListSheetProps {
  onAddItem?: (item: ItemCodeList) => void | Promise<void>
  trigger?: React.ReactNode
}

export function AddItemCodeListSheet({
  onAddItem,
  trigger,
}: AddItemCodeListSheetProps) {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState<ItemCodeListFormData>({
    MAVCode: "",
    MHBCode: "",
    IzuyoshiJPCode: "",
    IzuyoshiVNCode: "",
    Description: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const validatedData = itemCodeListFormSchema.parse(formData)
      const docId = validatedData.IzuyoshiJPCode

      if (validatedData.MAVCode?.trim()) {
        const isDup = await checkDuplicateMAVCode(validatedData.MAVCode)
        if (isDup) {
          setErrors({ MAVCode: "MAVCode already exists in database" })
          setIsSubmitting(false)
          return
        }
      }

      const newItem: ItemCodeList = {
        id: docId,
        documentId: docId,
        baseDocumentId: docId,
        MAVCode: validatedData.MAVCode ?? "",
        MHBCode: validatedData.MHBCode ?? "",
        IzuyoshiJPCode: docId,
        IzuyoshiVNCode: validatedData.IzuyoshiVNCode,
        Description: validatedData.Description,
      }

      await onAddItem?.(newItem)

      setFormData({
        MAVCode: "",
        MHBCode: "",
        IzuyoshiJPCode: "",
        IzuyoshiVNCode: "",
        Description: "",
      })
      setErrors({})
      setOpen(false)
      toast.success("ItemCodeList created successfully")
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {}
        error.issues.forEach((issue) => {
          if (issue.path[0]) {
            newErrors[issue.path[0] as string] = issue.message
          }
        })
        setErrors(newErrors)
      } else {
        toast.error(error instanceof Error ? error.message : "Failed to create item")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleCancel() {
    setFormData({
      MAVCode: "",
      MHBCode: "",
      IzuyoshiJPCode: "",
      IzuyoshiVNCode: "",
      Description: "",
    })
    setErrors({})
    setOpen(false)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger || (
          <Button
            type="button"
            variant="default"
            size="sm"
            className="cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add ItemCodeList
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="right" className="sm:max-w-[480px]">
        <SheetHeader>
          <SheetTitle>Add ItemCodeList</SheetTitle>
          <SheetDescription>
            Create a new ItemCodeList entry. Document ID will be set to Izuyoshi JP Code.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-6">
          {errors.root ? (
            <p className="text-sm text-destructive">{errors.root}</p>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="add-mavcode">MAV Code</Label>
            <Input
              id="add-mavcode"
              placeholder="MAVcode001"
              value={formData.MAVCode}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  MAVCode: e.target.value,
                }))
              }
              className={errors.MAVCode ? "border-red-500" : ""}
            />
            {errors.MAVCode && (
              <p className="text-sm text-red-500">{errors.MAVCode}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="add-izujp">Izuyoshi JP Code *</Label>
              <Input
                id="add-izujp"
                placeholder="Jcode0018"
                value={formData.IzuyoshiJPCode}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    IzuyoshiJPCode: e.target.value,
                  }))
                }
                className={errors.IzuyoshiJPCode ? "border-red-500" : ""}
              />
              {errors.IzuyoshiJPCode && (
                <p className="text-sm text-red-500">{errors.IzuyoshiJPCode}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-mhbcode">MHB Code</Label>
              <Input
                id="add-mhbcode"
                placeholder="MHB-XXX-X"
                value={formData.MHBCode}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, MHBCode: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-izuvn">Izuyoshi VN Code</Label>
            <Input
              id="add-izuvn"
              placeholder="VNcode0018"
              value={formData.IzuyoshiVNCode}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  IzuyoshiVNCode: e.target.value,
                }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-description">Description</Label>
            <Input
              id="add-description"
              placeholder="Item description..."
              value={formData.Description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  Description: e.target.value,
                }))
              }
            />
          </div>

          <SheetFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-2" />
              {isSubmitting ? "Creating..." : "Create Item"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
