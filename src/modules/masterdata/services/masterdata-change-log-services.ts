import {
  collection,
  doc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  addDoc,
  serverTimestamp,
  writeBatch,
  type QueryDocumentSnapshot,
  type DocumentData,
} from "firebase/firestore"
import { getFirestoreSafe } from "@/lib/firebase/client"
import {
  getLookupKeyField,
  type DynamicMasterDataRecord,
} from "@/modules/masterdata/services/masterdata-services"
import type { MasterCollectionConfig } from "@/types/firestore-models"
import type {
  MasterDataChangeLogEntry,
  MasterDataChangeLogOperation,
} from "./masterdata-json-index-services"

const MASTERDATA_CHANGE_LOGS_COLLECTION = "masterdataChangeLogs"

export interface CreateChangeLogOptions {
  collectionName: string
  documentId: string
  baseDocumentId: string
  lookupKey: string
  operation: MasterDataChangeLogOperation
  record?: DynamicMasterDataRecord
  actorId?: string
}

export async function createMasterDataChangeLog(
  options: CreateChangeLogOptions
): Promise<string> {
  const db = getFirestoreSafe()
  if (!db) {
    console.warn("[changeLog] Firestore not available, skipping change log write")
    return ""
  }

  const col = collection(db, MASTERDATA_CHANGE_LOGS_COLLECTION)
  const docRef = await addDoc(col, {
    collectionName: options.collectionName,
    documentId: options.documentId,
    baseDocumentId: options.baseDocumentId,
    lookupKey: options.lookupKey,
    operation: options.operation,
    record: options.record ?? null,
    actorId: options.actorId ?? null,
    changedAt: serverTimestamp(),
    version: Date.now(),
  })

  return docRef.id
}

export async function createMasterDataChangeLogs(
  entries: CreateChangeLogOptions[]
): Promise<number> {
  const db = getFirestoreSafe()
  if (!db || !entries.length) {
    if (!db) console.warn("[changeLog] Firestore not available, skipping change log write")
    return 0
  }

  let written = 0
  for (let index = 0; index < entries.length; index += 450) {
    const batch = writeBatch(db)
    const chunk = entries.slice(index, index + 450)
    chunk.forEach((entry) => {
      const ref = doc(collection(db, MASTERDATA_CHANGE_LOGS_COLLECTION))
      batch.set(ref, {
        collectionName: entry.collectionName,
        documentId: entry.documentId,
        baseDocumentId: entry.baseDocumentId,
        lookupKey: entry.lookupKey,
        operation: entry.operation,
        record: entry.record ?? null,
        actorId: entry.actorId ?? null,
        changedAt: serverTimestamp(),
        version: Date.now(),
      })
    })
    await batch.commit()
    written += chunk.length
  }

  return written
}

export async function listMasterDataChangeLogs(
  collectionName: string,
  since?: Date
): Promise<MasterDataChangeLogEntry[]> {
  const db = getFirestoreSafe()
  if (!db) return []

  const col = collection(db, MASTERDATA_CHANGE_LOGS_COLLECTION)
  const constraints: Parameters<typeof query>[1][] = [where("collectionName", "==", collectionName)]

  if (since) {
    constraints.push(where("changedAt", ">", since))
  }

  constraints.push(orderBy("changedAt"), limit(1000))

  const q = query(col, ...constraints)
  const snapshot = await getDocs(q)

  return snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => {
    const data = doc.data()
    return {
      id: doc.id,
      collectionName: data.collectionName,
      documentId: data.documentId,
      baseDocumentId: data.baseDocumentId,
      lookupKey: data.lookupKey,
      operation: data.operation as MasterDataChangeLogOperation,
      record: data.record ?? undefined,
      changedAt: data.changedAt?.toDate?.() ?? new Date(data.changedAt ?? 0),
      version: data.version,
      actorId: data.actorId ?? undefined,
    } as MasterDataChangeLogEntry
  })
}

export async function syncMasterDataIndexDeltas(
  collectionName: string,
  since?: Date
): Promise<MasterDataChangeLogEntry[]> {
  const changes = await listMasterDataChangeLogs(collectionName, since)
  return changes
}

export async function createMasterDataChangeLogForRecord(
  config: MasterCollectionConfig,
  record: DynamicMasterDataRecord,
  operation: MasterDataChangeLogOperation
) {
  const lookupKeyField = getLookupKeyField(config)
  const lookupKey = String(record[lookupKeyField] ?? record.baseDocumentId ?? record.documentId ?? record.id ?? "")
  const documentId = String(record.documentId ?? record.id ?? "")

  return createMasterDataChangeLog({
    collectionName: config.collectionName,
    documentId,
    baseDocumentId: String(record.baseDocumentId ?? documentId),
    lookupKey,
    operation,
    record: operation === "delete" ? undefined : record,
  })
}
