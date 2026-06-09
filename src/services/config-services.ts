"use client"

import { createFirestoreCrudService } from "@/lib/firebase/firestore-crud-service"
import {
  FIRESTORE_COLLECTIONS,
  type FixedValueConfig,
  type FixedValueConfigHistory,
  type ImportMappingConfig,
  type ImportMappingConfigHistory,
} from "@/types/firestore-models"

export const fixedValueConfigService = createFirestoreCrudService<FixedValueConfig>(
  FIRESTORE_COLLECTIONS.fixedValueConfigs,
  {
    getDocumentId: (record) => record.id,
    orderByField: "targetColumn",
  }
)

export const fixedValueConfigHistoryService =
  createFirestoreCrudService<FixedValueConfigHistory>(
    FIRESTORE_COLLECTIONS.fixedValueConfigHistory,
    {
      getDocumentId: (record) =>
        record.id ||
        `${record.configId}_${Date.now()}`,
      orderByField: "changedAt",
    }
  )

export const importMappingConfigService = createFirestoreCrudService<ImportMappingConfig>(
  FIRESTORE_COLLECTIONS.importMappingConfigs,
  {
    getDocumentId: (record) => record.id,
    orderByField: "name",
  }
)

export const importMappingConfigHistoryService =
  createFirestoreCrudService<ImportMappingConfigHistory>(
    FIRESTORE_COLLECTIONS.importMappingConfigHistory,
    {
      getDocumentId: (record) =>
        record.id ||
        `${record.mappingId}_${record.action}_${Date.now()}`,
      orderByField: "changedAt",
    }
  )

export const configServices = {
  fixedValueConfigs: fixedValueConfigService,
  fixedValueConfigHistory: fixedValueConfigHistoryService,
  importMappingConfigs: importMappingConfigService,
  importMappingConfigHistory: importMappingConfigHistoryService,
}
