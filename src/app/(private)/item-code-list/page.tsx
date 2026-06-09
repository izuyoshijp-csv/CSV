"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

import { DataTable } from "@/modules/item-code-list/components/data-table"
import { getItemCodeListColumns } from "@/modules/item-code-list/components/columns"
import {
  bulkCreateItemCodeList,
  createItemCodeList,
  deleteItemCodeList,
  getItemCodeList,
  seedItemCodeListWithClient,
  updateItemCodeList,
} from "@/modules/item-code-list/services/item-code-list-services"
import type { ItemCodeList } from "@/modules/item-code-list/services/types/item-code-list-types"

export default function ItemCodeListPage() {
  const [items, setItems] = useState<ItemCodeList[]>([])
  const [loading, setLoading] = useState(true)
  const [isSeedingItems, setIsSeedingItems] = useState(false)

  const refreshItems = useCallback(async () => {
    const list = await getItemCodeList()
    setItems(list)
  }, [])

  useEffect(() => {
    const loadItems = async () => {
      try {
        await refreshItems()
      } catch (error) {
        console.error("Failed to load ItemCodeList:", error)
      } finally {
        setLoading(false)
      }
    }

    loadItems()
  }, [refreshItems])

  const handleSeedItems = useCallback(async () => {
    try {
      setIsSeedingItems(true)
      const seededItems = await seedItemCodeListWithClient()
      setItems(seededItems)
      toast.success(`Seeded ${seededItems.length} items`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to seed data")
    } finally {
      setIsSeedingItems(false)
    }
  }, [])

  const handleAddItem = useCallback(
    async (newItem: ItemCodeList) => {
      await createItemCodeList(newItem)
      await refreshItems()
    },
    [refreshItems]
  )

  const handleUpdateItem = useCallback(
    async (item: ItemCodeList) => {
      await updateItemCodeList(item)
      setItems((prev) => prev.map((i) => (i.id === item.id ? item : i)))
    },
    []
  )

  const handleDeleteItem = useCallback(
    async (itemId: string) => {
      await deleteItemCodeList(itemId)
      setItems((prev) => prev.filter((i) => i.id !== itemId))
    },
    []
  )

  const handleImportItems = useCallback(
    async (newItems: ItemCodeList[]) => {
      console.log("[ItemCodeList] handleImportItems called with", newItems.length, "items")
      const result = await bulkCreateItemCodeList(newItems)
      console.log("[ItemCodeList] handleImportItems result:", result)
      if (result.failed > 0) {
        toast.warning(`Imported ${result.success} items, ${result.failed} failed`)
      } else {
        toast.success(`Imported ${result.success} items successfully`)
      }
      await refreshItems()
    },
    [refreshItems]
  )

  const columns = getItemCodeListColumns({
    onUpdateItem: handleUpdateItem,
    onDeleteItem: handleDeleteItem,
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading ItemCodeList...</div>
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-2 px-4 md:px-6">
        <h1 className="text-2xl font-bold tracking-tight">ItemCodeList</h1>
        <p className="text-muted-foreground">
          Manage your ItemCodeList entries. Data synced from Firebase Firestore.
        </p>
      </div>

      <div className="flex-1 px-4 md:px-6 pb-4">
        <DataTable
          columns={columns}
          data={items}
          onAddItem={handleAddItem}
          onImportItems={handleImportItems}
          onSeedItems={handleSeedItems}
          isSeedingItems={isSeedingItems}
        />
      </div>
    </>
  )
}
