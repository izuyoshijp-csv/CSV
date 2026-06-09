"use client"

import type {
  ImportMappingConfig,
  ImportMappingConfigHistory,
} from "@/types/firestore-models"
import {
  importMappingConfigHistoryService,
  importMappingConfigService,
} from "@/services/config-services"

import { createDefaultImportMappingConfig } from "./default-import-mapping"
import { sortMappingEntries } from "./import-mapping-types"

function normalizeFormatConditions(
  entry: ImportMappingConfig["entries"][number]
) {
  const conditions = entry.formatConditions?.filter(Boolean)
  return conditions?.length ? conditions : [entry.format ?? "original"]
}

const STORAGE_KEY = "importMappingConfigs:v1"
const HISTORY_STORAGE_KEY = "importMappingConfigHistory:v1"

function nowText() {
  return new Date().toISOString()
}

function getLocalMappings() {
  if (typeof window === "undefined") {
    return [createDefaultImportMappingConfig()]
  }

  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    const defaults = [createDefaultImportMappingConfig()]
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults))
    return defaults
  }

  try {
    const mappings = JSON.parse(raw) as ImportMappingConfig[]
    return mappings.length ? mappings : [createDefaultImportMappingConfig()]
  } catch {
    return [createDefaultImportMappingConfig()]
  }
}

function setLocalMappings(mappings: ImportMappingConfig[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(mappings))
}

function getLocalHistory() {
  if (typeof window === "undefined") return []

  const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY)
  if (!raw) return []

  try {
    return JSON.parse(raw) as ImportMappingConfigHistory[]
  } catch {
    return []
  }
}

function setLocalHistory(history: ImportMappingConfigHistory[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history))
}

function normalizeMapping(mapping: ImportMappingConfig): ImportMappingConfig {
  return {
    ...mapping,
    validRowColumn: String(mapping.validRowColumn ?? "").trim().toUpperCase(),
    entries: sortMappingEntries(mapping.entries).map((entry) => ({
      ...entry,
      targetColumns: [...entry.targetColumns],
      format: entry.format ?? "original",
      formatConditions: normalizeFormatConditions(entry),
      sourceCell: entry.sourceCell?.trim().toUpperCase(),
      sourceColumn: entry.sourceColumn?.trim().toUpperCase(),
      endDetectionColumn: entry.endDetectionColumn?.trim().toUpperCase(),
      sourcePosition: entry.sourcePosition?.trim().toUpperCase(),
    })),
  }
}

async function recordHistory(history: ImportMappingConfigHistory) {
  const nextHistory: ImportMappingConfigHistory = {
    ...history,
    id: history.id ?? `${history.mappingId}_${history.action}_${Date.now()}`,
    changedAt: history.changedAt ?? nowText(),
    changedBy: history.changedBy ?? "system",
  }

  const localHistory = getLocalHistory()
  setLocalHistory([nextHistory, ...localHistory].slice(0, 200))

  try {
    await importMappingConfigHistoryService.create(nextHistory, nextHistory.id)
  } catch {
    // Firestore is optional for local development; local history is still available.
  }
}

export const mappingConfigRepository = {
  async list() {
    try {
      const remote = await importMappingConfigService.list()
      const activeMappings = remote
        .filter((mapping) => !mapping.deleted)
        .map(normalizeMapping)

      if (activeMappings.length) {
        setLocalMappings(activeMappings)
        return activeMappings
      }
    } catch {
      // Fall through to local storage.
    }

    return getLocalMappings()
      .filter((mapping) => !mapping.deleted)
      .map(normalizeMapping)
  },

  async get(id: string) {
    try {
      const remote = await importMappingConfigService.get(id)
      if (remote && !remote.deleted) return normalizeMapping(remote)
    } catch {
      // Fall through to local storage.
    }

    return getLocalMappings().find((mapping) => mapping.id === id && !mapping.deleted) ?? null
  },

  async save(mapping: ImportMappingConfig, changedBy?: string) {
    const nextMapping = normalizeMapping({
      ...mapping,
      updatedAt: nowText(),
      updatedBy: changedBy ?? mapping.updatedBy ?? "system",
    })

    const currentMappings = getLocalMappings()
    const oldValue = currentMappings.find((item) => item.id === nextMapping.id) ?? null
    const exists = Boolean(oldValue)

    const localNext = exists
      ? currentMappings.map((item) => (item.id === nextMapping.id ? nextMapping : item))
      : [
          ...currentMappings,
          {
            ...nextMapping,
            createdAt: nextMapping.createdAt ?? nowText(),
            createdBy: nextMapping.createdBy ?? changedBy ?? "system",
          },
        ]

    setLocalMappings(localNext)

    try {
      if (exists) {
        await importMappingConfigService.update(nextMapping.id, nextMapping)
      } else {
        await importMappingConfigService.create(nextMapping, nextMapping.id)
      }
    } catch {
      // Local save has already completed.
    }

    await recordHistory({
      mappingId: nextMapping.id,
      action: exists ? "update" : "create",
      changedAt: nowText(),
      changedBy,
      oldValue,
      newValue: nextMapping,
    })

    return nextMapping
  },

  async softDelete(id: string, changedBy?: string) {
    const currentMappings = getLocalMappings()
    const oldValue = currentMappings.find((mapping) => mapping.id === id) ?? null
    const nextMappings = currentMappings.map((mapping) =>
      mapping.id === id
        ? {
            ...mapping,
            deleted: true,
            active: false,
            updatedAt: nowText(),
            updatedBy: changedBy ?? "system",
          }
        : mapping
    )

    setLocalMappings(nextMappings)

    try {
      await importMappingConfigService.update(id, {
        deleted: true,
        active: false,
        updatedBy: changedBy ?? "system",
      })
    } catch {
      // Local delete has already completed.
    }

    await recordHistory({
      mappingId: id,
      action: "delete",
      changedAt: nowText(),
      changedBy,
      oldValue,
      newValue: null,
    })
  },

  async history(mappingId?: string) {
    try {
      const remote = await importMappingConfigHistoryService.list()
      const filteredRemote = mappingId
        ? remote.filter((item) => item.mappingId === mappingId)
        : remote
      if (filteredRemote.length) return filteredRemote
    } catch {
      // Fall through to local storage.
    }

    const history = getLocalHistory()
    return mappingId ? history.filter((item) => item.mappingId === mappingId) : history
  },
}
