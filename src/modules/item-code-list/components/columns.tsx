"use client"

import type { ColumnDef } from "@tanstack/react-table"

import { Checkbox } from "@/components/ui/checkbox"
import type { ItemCodeList } from "@/modules/item-code-list/services/types/item-code-list-types"
import { DataTableColumnHeader } from "./data-table-column-header"
import { DataTableRowActions } from "./data-table-row-actions"

interface ItemCodeListColumnActions {
  onUpdateItem?: (item: ItemCodeList) => void | Promise<void>
  onDeleteItem?: (itemId: string) => void | Promise<void>
}

export function getItemCodeListColumns({
  onUpdateItem,
  onDeleteItem,
}: ItemCodeListColumnActions = {}): ColumnDef<ItemCodeList>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="translate-y-[2px] cursor-pointer"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className="translate-y-[2px] cursor-pointer"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "MAVCode",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="MAV Code" />
      ),
      cell: ({ row }) => (
        <div className="break-all">
          {row.getValue("MAVCode") || <span className="text-muted-foreground">—</span>}
        </div>
      ),
      size: 130,
    },
    {
      accessorKey: "MHBCode",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="MHB Code" />
      ),
      cell: ({ row }) => (
        <div className="break-all">
          {row.getValue("MHBCode") || <span className="text-muted-foreground">—</span>}
        </div>
      ),
      size: 130,
    },
    {
      accessorKey: "IzuyoshiJPCode",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Izuyoshi JP Code" />
      ),
      cell: ({ row }) => (
        <div className="break-all">
          {row.getValue("IzuyoshiJPCode")}
        </div>
      ),
      size: 150,
    },
    {
      accessorKey: "IzuyoshiVNCode",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Izuyoshi VN Code" />
      ),
      cell: ({ row }) => (
        <div className="break-all">
          {row.getValue("IzuyoshiVNCode") || <span className="text-muted-foreground">—</span>}
        </div>
      ),
      size: 150,
    },
    {
      accessorKey: "Description",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Description" />
      ),
      cell: ({ row }) => (
        <div className="break-words whitespace-pre-wrap">
          {row.getValue("Description") || <span className="text-muted-foreground">—</span>}
        </div>
      ),
      size: 400,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DataTableRowActions
          row={row}
          onUpdateItem={onUpdateItem}
          onDeleteItem={onDeleteItem}
        />
      ),
    },
  ]
}

export const columns = getItemCodeListColumns()
