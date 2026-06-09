"use client"

import { createFirestoreCrudService } from "@/lib/firebase/firestore-crud-service"
import {
  FIRESTORE_COLLECTIONS,
  type MasterCollectionFieldConfig,
  type MasterCollectionConfig,
} from "@/types/firestore-models"

const STORAGE_KEY = "masterCollectionConfigs:v1"

function makeFieldConfigs(fields: string[]): MasterCollectionFieldConfig[] {
  return fields.map((name) => ({
    name,
    required: false,
    unique: false,
  }))
}

export const defaultMasterCollectionConfigs: MasterCollectionConfig[] = [
  {
    id: "CusCodeList",
    collectionName: "CusCodeList",
    displayName: "得意先・納入先リスト",
    fields: ["CusCode", "CusNameEng", "CusNameJP", "CusAddress"],
    fieldConfigs: makeFieldConfigs(["CusCode", "CusNameEng", "CusNameJP", "CusAddress"]),
    active: true,
    systemDefault: true,
  },
  {
    id: "ItemCodeListMAV",
    collectionName: "ItemCodeListMAV",
    displayName: "資材コード照合表 MAV",
    fields: ["MAVCode", "MHBCode", "IzuyoshiJPCode", "IzuyoshiVNCode", "Description"],
    fieldConfigs: makeFieldConfigs(["MAVCode", "MHBCode", "IzuyoshiJPCode", "IzuyoshiVNCode", "Description"]),
    active: true,
    systemDefault: true,
  },
  {
    id: "ItemCodeListMHB",
    collectionName: "ItemCodeListMHB",
    displayName: "資材コード照合表 MHB",
    fields: ["MHBCode", "MAVCode", "IzuyoshiJPCode", "IzuyoshiVNCode", "Description"],
    fieldConfigs: makeFieldConfigs(["MHBCode", "MAVCode", "IzuyoshiJPCode", "IzuyoshiVNCode", "Description"]),
    active: true,
    systemDefault: true,
  },
  {
    id: "UnitPriceList",
    collectionName: "UnitPriceList",
    displayName: "単価リスト",
    fields: ["IzuyoshiJPCode", "UnitPrice"],
    fieldConfigs: makeFieldConfigs(["IzuyoshiJPCode", "UnitPrice"]),
    active: true,
    systemDefault: true,
  },
  {
    id: "PIC.WH.CodeList",
    collectionName: "PIC.WH.CodeList",
    displayName: "担当者・倉庫コードリスト",
    fields: ["PICCode", "WarehouseCode", "DetailWarehouseCode"],
    fieldConfigs: makeFieldConfigs(["PICCode", "WarehouseCode", "DetailWarehouseCode"]),
    active: true,
    systemDefault: true,
  },
  {
    id: "UnitCodeList",
    collectionName: "UnitCodeList",
    displayName: "単位リスト",
    fields: ["OrderUnit", "CsvCode"],
    fieldConfigs: makeFieldConfigs(["OrderUnit", "CsvCode"]),
    active: true,
    systemDefault: true,
  },
]

const masterCollectionConfigService = createFirestoreCrudService<MasterCollectionConfig>(
  FIRESTORE_COLLECTIONS.masterCollectionConfigs,
  {
    getDocumentId: (record) => record.collectionName,
    orderByField: "collectionName",
  }
)

function normalizeFieldList(fields: string[]) {
  return [...new Set(fields.map((field) => field.trim()).filter(Boolean))]
}

function normalizeFieldConfigs(
  fields: string[],
  _fieldConfigs: MasterCollectionFieldConfig[] | undefined
) {
  const normalized = fields.map((name) => {
    return {
      name,
      required: false,
      unique: false,
    }
  })

  return normalized
}

export function normalizeMasterCollectionConfig(
  config: MasterCollectionConfig
): MasterCollectionConfig {
  const collectionName = config.collectionName.trim()
  const sourceFields = config.fieldConfigs?.length
    ? config.fieldConfigs.map((fieldConfig) => fieldConfig.name)
    : config.fields
  const fields = normalizeFieldList(sourceFields)
  const fieldConfigs = normalizeFieldConfigs(fields, config.fieldConfigs)

  return {
    ...config,
    id: collectionName,
    collectionName,
    displayName: config.displayName.trim() || collectionName,
    fields,
    fieldConfigs,
    active: config.active ?? true,
  }
}

function mergeDefaultConfigs(configs: MasterCollectionConfig[]) {
  const byCollection = new Map<string, MasterCollectionConfig>()
  defaultMasterCollectionConfigs.forEach((config) => {
    byCollection.set(config.collectionName, normalizeMasterCollectionConfig(config))
  })
  configs.forEach((config) => {
    const normalized = normalizeMasterCollectionConfig(config)
    if (normalized.fields.length) byCollection.set(normalized.collectionName, normalized)
  })

  return [...byCollection.values()].filter((config) => config.active !== false)
}

function getLocalConfigs() {
  if (typeof window === "undefined") return defaultMasterCollectionConfigs

  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return defaultMasterCollectionConfigs

  try {
    return JSON.parse(raw) as MasterCollectionConfig[]
  } catch {
    return defaultMasterCollectionConfigs
  }
}

function setLocalConfigs(configs: MasterCollectionConfig[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(configs))
}

export const masterCollectionConfigRepository = {
  async list() {
    try {
      const remote = await masterCollectionConfigService.list()
      const merged = mergeDefaultConfigs(remote)
      setLocalConfigs(merged)
      return merged
    } catch {
      return mergeDefaultConfigs(getLocalConfigs())
    }
  },

  async save(config: MasterCollectionConfig) {
    const normalized = normalizeMasterCollectionConfig(config)
    const current = mergeDefaultConfigs(getLocalConfigs())
    const next = current.some((item) => item.collectionName === normalized.collectionName)
      ? current.map((item) =>
          item.collectionName === normalized.collectionName ? normalized : item
        )
      : [...current, normalized]

    setLocalConfigs(next)

    try {
      await masterCollectionConfigService.create(normalized, normalized.collectionName)
    } catch {
      // Local config remains available when Firestore is not configured.
    }

    return normalized
  },

  async delete(collectionName: string) {
    const tombstone: MasterCollectionConfig = {
      id: collectionName,
      collectionName,
      displayName: collectionName,
      fields: ["id"],
      fieldConfigs: makeFieldConfigs(["id"]),
      active: false,
    }
    const current = getLocalConfigs()
    const next = current.some((config) => config.collectionName === collectionName)
      ? current.map((config) => (config.collectionName === collectionName ? tombstone : config))
      : [...current, tombstone]
    setLocalConfigs(next)

    try {
      await masterCollectionConfigService.create(tombstone, collectionName)
    } catch {
      // The local delete is enough for offline/local development.
    }
  },
}
