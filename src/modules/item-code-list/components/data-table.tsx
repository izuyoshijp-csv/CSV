"use client"

import * as React from "react"
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  type ColumnDef,
  type ColumnFiltersState,
  type ColumnOrderState,
  type Header,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type FilterFn,
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { DataTablePagination } from "./data-table-pagination"
import { DataTableToolbar } from "./data-table-toolbar"
import type { ItemCodeList } from "@/modules/item-code-list/services/types/item-code-list-types"

interface SortableHeaderProps<TData> {
  header: Header<TData, unknown>
}

function SortableHeader<TData>({ header }: SortableHeaderProps<TData>) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: header.id })

  const style: React.CSSProperties = {
    position: "relative",
    width: header.getSize(),
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : undefined,
  }

  return (
    <TableHead
      ref={setNodeRef}
      style={style}
      className="select-none"
      colSpan={header.colSpan}
    >
      {header.isPlaceholder
        ? null
        : flexRender(header.column.columnDef.header, header.getContext())}
      {header.column.getCanSort() && (
        <span
          {...attributes}
          {...listeners}
          className="ml-1 inline-block cursor-grab select-none text-muted-foreground hover:text-foreground active:cursor-grabbing shrink-0"
          title="Drag to reorder"
        >
          ⠿
        </span>
      )}
      {header.column.getCanResize() && (
        <div
          onMouseDown={(e) => {
            e.stopPropagation()
            header.getResizeHandler()(e)
          }}
          onTouchStart={(e) => {
            e.stopPropagation()
            header.getResizeHandler()(e)
          }}
          className="absolute right-0 top-0 h-full w-2 cursor-col-resize touch-none group/resize hover:bg-primary/40 active:bg-primary/60"
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 h-6 w-0.5 bg-border group-hover/resize:bg-primary group-active/resize:bg-primary transition-colors rounded-full" />
        </div>
      )}
    </TableHead>
  )
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  onAddItem?: (item: ItemCodeList) => void | Promise<void>
  onImportItems?: (items: ItemCodeList[]) => void | Promise<void>
  onSeedItems?: () => void | Promise<void>
  isSeedingItems?: boolean
}

export function DataTable<TData, TValue>({
  columns,
  data,
  onAddItem,
  onImportItems,
  onSeedItems,
  isSeedingItems,
}: DataTableProps<TData, TValue>) {
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 0 })
  const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>([])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  )

  React.useEffect(() => {
    setPagination((prev) => ({ ...prev, pageSize: data.length || 10 }))
  }, [data.length])

  const globalFilterFn: FilterFn<TData> = (row, columnId, filterValue) => {
    const search = String(filterValue).toLowerCase()
    const rowValues = Object.values(row.original as Record<string, unknown>)
      .map((v) => String(v ?? "").toLowerCase())
      .join(" ")
    return rowValues.includes(search)
  }

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
    },
    onPaginationChange: setPagination,
    enableRowSelection: true,
    enableColumnResizing: true,
    columnResizeMode: "onChange",
    globalFilterFn,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  const orderedColumnIds = columnOrder.length
    ? columnOrder
    : table.getAllColumns().map((c) => c.id)

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = orderedColumnIds.indexOf(String(active.id))
      const newIndex = orderedColumnIds.indexOf(String(over.id))
      setColumnOrder(arrayMove(orderedColumnIds, oldIndex, newIndex))
    }
  }

  const headerGroups = table.getHeaderGroups()
  const rows = table.getRowModel().rows

  return (
    <div className="space-y-4">
      <DataTableToolbar
        table={table}
        onAddItem={onAddItem}
        onImportItems={onImportItems}
        onSeedItems={onSeedItems}
        isSeedingItems={isSeedingItems}
      />
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div
          className="rounded-md border overflow-auto"
          style={{ maxHeight: "calc(100vh - 18rem)" }}
        >
          <Table style={{ tableLayout: "fixed", minWidth: "100%" }}>
            <TableHeader className="sticky top-0 z-10 bg-background shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
              {headerGroups.map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  <SortableContext
                    items={orderedColumnIds}
                    strategy={horizontalListSortingStrategy}
                  >
                    {orderedColumnIds
                      .map((id) =>
                        headerGroup.headers.find((h) => h.id === id)
                      )
                      .filter(Boolean)
                      .map((header) =>
                        header ? (
                          <SortableHeader
                            key={header.id}
                            header={header}
                          />
                        ) : null
                      )}
                  </SortableContext>
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {rows?.length ? (
                rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {orderedColumnIds
                      .map((id) =>
                        row.getVisibleCells().find((c) => c.column.id === id)
                      )
                      .filter(Boolean)
                      .map((cell) =>
                        cell ? (
                          <TableCell
                            key={cell.id}
                            style={{ width: cell.column.getSize() }}
                            className={
                              cell.column.id === "Description"
                                ? "overflow-hidden"
                                : "overflow-hidden text-ellipsis whitespace-nowrap"
                            }
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        ) : null
                      )}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={orderedColumnIds.length}
                    className="h-24 text-center"
                  >
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DndContext>
      <DataTablePagination table={table} />
    </div>
  )
}
