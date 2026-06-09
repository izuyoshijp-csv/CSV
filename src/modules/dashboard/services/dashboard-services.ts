"use client"

import { collection, getDocs, query } from "firebase/firestore"
import { getFirestoreSafe } from "@/lib/firebase/client"
import { mappingConfigRepository } from "@/modules/import-mapping/services/import-mapping-services"
import { masterCollectionConfigRepository } from "@/modules/masterdata/services/master-collection-config-services"

export interface CollectionCount {
  collectionName: string
  displayName: string
  count: number
  category: "masterdata" | "mapping" | "batch"
}

export interface DashboardStats {
  totalMasterDataRecords: number
  totalMappings: number
  totalImportBatches: number
  totalExportHistory: number
  collectionCounts: CollectionCount[]
}

export interface ActivityItem {
  id: string
  type: "import" | "export" | "mapping_update" | "masterdata_update"
  description: string
  timestamp: string
  count?: number
  status?: string
}

export interface DashboardData {
  stats: DashboardStats
  recentActivity: ActivityItem[]
}

async function getCollectionCount(collectionName: string): Promise<number> {
  try {
    const db = getFirestoreSafe()
    if (!db) return 0
    const snap = await getDocs(query(collection(db, collectionName)))
    return snap.size
  } catch {
    return 0
  }
}

async function getMappingCount(): Promise<number> {
  try {
    const mappings = await mappingConfigRepository.list()
    return mappings.length
  } catch {
    return 0
  }
}

async function getFixedValueCount(): Promise<number> {
  try {
    const db = getFirestoreSafe()
    if (!db) return 0
    const snap = await getDocs(query(collection(db, "fixedValueConfigs")))
    return snap.size
  } catch {
    return 0
  }
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const [
    cusCodeCount,
    itemCodeListMAVCount,
    itemCodeListMHBCount,
    unitPriceCount,
    picWhCount,
    unitCodeCount,
    mappingCount,
    fixedValueCount,
    batchCount,
    exportCount,
  ] = await Promise.all([
    getCollectionCount("CusCodeList"),
    getCollectionCount("ItemCodeListMAV"),
    getCollectionCount("ItemCodeListMHB"),
    getCollectionCount("UnitPriceList"),
    getCollectionCount("PIC.WH.CodeList"),
    getCollectionCount("UnitCodeList"),
    getMappingCount(),
    getFixedValueCount(),
    getCollectionCount("importBatches"),
    getCollectionCount("exportHistory"),
  ])

  const collectionCounts: CollectionCount[] = [
    { collectionName: "CusCodeList", displayName: "得意先・納入先リスト", count: cusCodeCount, category: "masterdata" },
    { collectionName: "ItemCodeListMAV", displayName: "資材コード照合表 MAV", count: itemCodeListMAVCount, category: "masterdata" },
    { collectionName: "ItemCodeListMHB", displayName: "資材コード照合表 MHB", count: itemCodeListMHBCount, category: "masterdata" },
    { collectionName: "UnitPriceList", displayName: "単価リスト", count: unitPriceCount, category: "masterdata" },
    { collectionName: "PIC.WH.CodeList", displayName: "担当者・倉庫コードリスト", count: picWhCount, category: "masterdata" },
    { collectionName: "UnitCodeList", displayName: "単位リスト", count: unitCodeCount, category: "masterdata" },
    { collectionName: "importMappingConfigs", displayName: "インポートマッピング", count: mappingCount, category: "mapping" },
    { collectionName: "fixedValueConfigs", displayName: "固定値設定", count: fixedValueCount, category: "mapping" },
    { collectionName: "importBatches", displayName: "インポートバッチ", count: batchCount, category: "batch" },
    { collectionName: "exportHistory", displayName: "エクスポート履歴", count: exportCount, category: "batch" },
  ]

  return {
    totalMasterDataRecords: collectionCounts
      .filter((c) => c.category === "masterdata")
      .reduce((sum, c) => sum + c.count, 0),
    totalMappings: mappingCount + fixedValueCount,
    totalImportBatches: batchCount,
    totalExportHistory: exportCount,
    collectionCounts,
  }
}

export async function getDashboardData(): Promise<DashboardData> {
  const [stats] = await Promise.all([getDashboardStats()])

  let recentActivity: ActivityItem[] = []

  try {
    const db = getFirestoreSafe()
    if (db) {
      const batchesSnap = await getDocs(
        query(collection(db, "importBatches"))
      )
      const batches = batchesSnap.docs.slice(-10).reverse()
      recentActivity = batches.map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          type: "import" as const,
          description: `${data.batchName ?? doc.id} - ${data.status ?? "unknown"}`,
          timestamp: data.importedAt
            ? new Date(data.importedAt as number).toLocaleString("ja-JP")
            : "-",
          count: data.totalRowsRead ?? 0,
          status: data.status ?? "-",
        }
      })
    }
  } catch {
    recentActivity = []
  }

  return { stats, recentActivity }
}
