"use client"

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  type DocumentData,
  type FirestoreDataConverter,
  type QueryDocumentSnapshot,
  type SnapshotOptions,
} from "firebase/firestore"

import { getFirestoreSafe } from "@/lib/firebase/client"

type RecordWithOptionalId = {
  id?: string
  documentId?: string
  baseDocumentId?: string
  createdAt?: unknown
  updatedAt?: unknown
}

export interface FirestoreCrudService<T extends RecordWithOptionalId> {
  list: () => Promise<T[]>
  get: (id: string) => Promise<T | null>
  create: (record: T, id?: string) => Promise<T>
  update: (id: string, patch: Partial<T>) => Promise<T>
  delete: (id: string) => Promise<void>
}

export function makeSafeDocumentId(value: unknown): string {
  return String(value ?? "")
    .trim()
    .replace(/\//g, "／")
    .replace(/\s+/g, " ")
    .substring(0, 1400)
}

export function makeFirestoreConverter<T extends RecordWithOptionalId>(): FirestoreDataConverter<T> {
  return {
    toFirestore(record: T): DocumentData {
      const { id: _id, ...data } = record
      return data
    },
    fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): T {
      const data = snapshot.data(options) as Omit<T, "id">
      return {
        id: snapshot.id,
        ...data,
      } as T
    },
  }
}

export function createFirestoreCrudService<T extends RecordWithOptionalId>(
  collectionName: string,
  options: {
    getDocumentId?: (record: T) => string
    orderByField?: string
  } = {}
): FirestoreCrudService<T> {
  const converter = makeFirestoreConverter<T>()

  function getCollectionRef() {
    const db = getFirestoreSafe()
    if (!db) {
      throw new Error(
        "Firebase is not configured. Please set NEXT_PUBLIC_FIREBASE_* environment variables."
      )
    }

    return collection(db, collectionName).withConverter(converter)
  }

  function getDocRef(id: string) {
    const db = getFirestoreSafe()
    if (!db) {
      throw new Error(
        "Firebase is not configured. Please set NEXT_PUBLIC_FIREBASE_* environment variables."
      )
    }

    return doc(db, collectionName, id).withConverter(converter)
  }

  return {
    async list(): Promise<T[]> {
      const collectionRef = getCollectionRef()
      const snapshot = options.orderByField
        ? await getDocs(query(collectionRef, orderBy(options.orderByField)))
        : await getDocs(collectionRef)

      return snapshot.docs.map((document) => document.data())
    },

    async get(id: string): Promise<T | null> {
      const snapshot = await getDoc(getDocRef(id))
      return snapshot.exists() ? snapshot.data() : null
    },

    async create(record: T, id?: string): Promise<T> {
      const documentId =
        id ||
        options.getDocumentId?.(record) ||
        record.id ||
        record.documentId ||
        record.baseDocumentId

      if (!documentId) {
        throw new Error(`Missing document id for collection "${collectionName}".`)
      }

      const normalizedId = makeSafeDocumentId(documentId)
      const nextRecord = {
        ...record,
        id: normalizedId,
        documentId: record.documentId || normalizedId,
        baseDocumentId: record.baseDocumentId || normalizedId,
        createdAt: record.createdAt ?? serverTimestamp(),
        updatedAt: serverTimestamp(),
      } as T

      await setDoc(getDocRef(normalizedId), nextRecord, { merge: true })
      return nextRecord
    },

    async update(id: string, patch: Partial<T>): Promise<T> {
      const documentRef = getDocRef(id)
      await updateDoc(documentRef, {
        ...patch,
        updatedAt: serverTimestamp(),
      } as DocumentData)

      const snapshot = await getDoc(documentRef)
      if (!snapshot.exists()) {
        throw new Error(`Document "${collectionName}/${id}" was not found after update.`)
      }

      return snapshot.data()
    },

    async delete(id: string): Promise<void> {
      await deleteDoc(getDocRef(id))
    },
  }
}
