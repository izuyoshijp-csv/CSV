"use client"

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  writeBatch,
  type Timestamp,
} from "firebase/firestore"

import { getFirestoreSafe } from "@/lib/firebase/client"
import { itemCodeListMockData } from "./item-code-list-mock-data"
import type { ItemCodeList } from "./types/item-code-list-types"

const ITEM_CODE_LIST_COLLECTION = "ItemCodeList"

function normalizeItem(docId: string, data: Record<string, unknown>): ItemCodeList {
  const id = (data.documentId as string) || (data.IzuyoshiJPCode as string) || docId
  let updatedAt: string | number | undefined

  if (data.updatedAt) {
    const ts = data.updatedAt as Timestamp
    if (typeof ts.toDate === "function") {
      updatedAt = ts.toDate().toISOString()
    } else {
      updatedAt = data.updatedAt as string | number
    }
  }

  return {
    id,
    documentId: (data.documentId as string) || id,
    baseDocumentId: (data.baseDocumentId as string) || id,
    MAVCode: (data.MAVCode as string) || "",
    MHBCode: (data.MHBCode as string) || "",
    IzuyoshiJPCode: (data.IzuyoshiJPCode as string) || id,
    IzuyoshiVNCode: (data.IzuyoshiVNCode as string) || "",
    Description: (data.Description as string) || "",
    updatedAt,
  }
}

export async function getItemCodeList(): Promise<ItemCodeList[]> {
  const db = getFirestoreSafe()
  if (!db) {
    console.warn("Firebase not configured. Using mock data.")
    return itemCodeListMockData
  }

  try {
    const snapshot = await getDocs(collection(db, ITEM_CODE_LIST_COLLECTION))

    if (snapshot.empty) {
      console.warn("ItemCodeList collection is empty. Using mock data.")
      return itemCodeListMockData
    }

    return snapshot.docs.map((document) =>
      normalizeItem(document.id, document.data() as Record<string, unknown>)
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    const isPermissionError =
      message.includes("permission") ||
      message.includes("PERMISSION_DENIED") ||
      message.includes("insufficient")

    if (isPermissionError) {
      console.error(
        `[ItemCodeList] Permission denied when reading "${ITEM_CODE_LIST_COLLECTION}". ` +
        `Firestore security rules is blocking read access. ` +
        `Please update your Firestore rules to allow read on collection "${ITEM_CODE_LIST_COLLECTION}".`
      )
    } else {
      console.warn("Failed to load ItemCodeList from Firestore, using mock data.", error)
    }
    return itemCodeListMockData
  }
}

export async function seedItemCodeListWithClient(): Promise<ItemCodeList[]> {
  const db = getFirestoreSafe()
  if (!db) return itemCodeListMockData

  const batch = writeBatch(db)

  itemCodeListMockData.forEach((item) => {
    batch.set(doc(db, ITEM_CODE_LIST_COLLECTION, item.id), item, { merge: true })
  })

  await batch.commit()
  return getItemCodeList()
}

export async function createItemCodeList(item: ItemCodeList): Promise<ItemCodeList> {
  const db = getFirestoreSafe()
  if (!db) return item

  await setDoc(doc(db, ITEM_CODE_LIST_COLLECTION, item.id), {
    documentId: item.documentId || item.id,
    baseDocumentId: item.baseDocumentId || item.id,
    MAVCode: item.MAVCode ?? "",
    MHBCode: item.MHBCode ?? "",
    IzuyoshiJPCode: item.IzuyoshiJPCode,
    IzuyoshiVNCode: item.IzuyoshiVNCode ?? "",
    Description: item.Description ?? "",
  })
  return item
}

export async function checkDuplicateMAVAndMHB(
  items: ItemCodeList[]
): Promise<{ duplicateMAVCodes: Set<string>; duplicateMHBCodes: Set<string> }> {
  const db = getFirestoreSafe()
  const duplicateMAVCodes = new Set<string>()
  const duplicateMHBCodes = new Set<string>()

  if (!db) return { duplicateMAVCodes, duplicateMHBCodes }

  try {
    const snapshot = await getDocs(collection(db, ITEM_CODE_LIST_COLLECTION))
    const existingMAVCodes = new Set<string>()
    const existingMHBCodes = new Set<string>()

    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data() as Record<string, string>
      if (data.MAVCode) existingMAVCodes.add(data.MAVCode.trim().toLowerCase())
      if (data.MHBCode) existingMHBCodes.add(data.MHBCode.trim().toLowerCase())
    })

    // Check duplicates within the import batch itself
    const batchMAVCodes = new Set<string>()
    const batchMHBCodes = new Set<string>()

    items.forEach((item) => {
      const mavLower = item.MAVCode?.trim().toLowerCase()
      const mhbLower = item.MHBCode?.trim().toLowerCase()

      // Existing in DB
      if (item.MAVCode && existingMAVCodes.has(mavLower!)) {
        duplicateMAVCodes.add(item.MAVCode)
      }
      if (item.MHBCode && existingMHBCodes.has(mhbLower!)) {
        duplicateMHBCodes.add(item.MHBCode)
      }

      // Duplicate within batch
      if (item.MAVCode && batchMAVCodes.has(mavLower!)) {
        duplicateMAVCodes.add(item.MAVCode)
      }
      if (item.MHBCode && batchMHBCodes.has(mhbLower!)) {
        duplicateMHBCodes.add(item.MHBCode)
      }

      if (item.MAVCode) batchMAVCodes.add(mavLower!)
      if (item.MHBCode) batchMHBCodes.add(mhbLower!)
    })
  } catch (error) {
    console.warn("Failed to check duplicates:", error)
  }

  return { duplicateMAVCodes, duplicateMHBCodes }
}

export async function checkDuplicateMHBForUpdate(
  mhbCode: string,
  excludeItemId: string
): Promise<boolean> {
  const db = getFirestoreSafe()
  if (!db || !mhbCode?.trim()) return false

  try {
    const snapshot = await getDocs(collection(db, ITEM_CODE_LIST_COLLECTION))
    const mhbLower = mhbCode.trim().toLowerCase()

    for (const docSnap of snapshot.docs) {
      if (docSnap.id === excludeItemId) continue
      const data = docSnap.data() as Record<string, string>
      if (data.MHBCode?.trim().toLowerCase() === mhbLower) return true
    }
  } catch (error) {
    console.warn("Failed to check MHB duplicate on update:", error)
  }

  return false
}

export async function checkDuplicateMAVCode(maVCode: string): Promise<boolean> {
  const db = getFirestoreSafe()
  if (!db || !maVCode?.trim()) return false

  try {
    const snapshot = await getDocs(collection(db, ITEM_CODE_LIST_COLLECTION))
    const mavLower = maVCode.trim().toLowerCase()

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data() as Record<string, string>
      if (data.MAVCode?.trim().toLowerCase() === mavLower) return true
    }
  } catch (error) {
    console.warn("Failed to check MAV duplicate:", error)
  }

  return false
}

export async function bulkCreateItemCodeList(
  items: ItemCodeList[]
): Promise<{ success: number; failed: number }> {
  console.log("[ItemCodeList] bulkCreateItemCodeList called with", items.length, "items")
  const db = getFirestoreSafe()
  console.log("[ItemCodeList] getFirestoreSafe() returned:", db)
  if (!db) {
    throw new Error(
      "Firebase is not configured. Please set NEXT_PUBLIC_FIREBASE_* environment variables."
    )
  }

  const batch = writeBatch(db)
  items.forEach((item) => {
    batch.set(
      doc(db, ITEM_CODE_LIST_COLLECTION, item.id),
      {
        documentId: item.documentId || item.id,
        baseDocumentId: item.baseDocumentId || item.id,
        MAVCode: item.MAVCode ?? "",
        MHBCode: item.MHBCode ?? "",
        IzuyoshiJPCode: item.IzuyoshiJPCode,
        IzuyoshiVNCode: item.IzuyoshiVNCode ?? "",
        Description: item.Description ?? "",
      },
      { merge: true }
    )
  })

  try {
    console.log("[ItemCodeList] Committing batch of", items.length, "items to collection:", ITEM_CODE_LIST_COLLECTION)
    await batch.commit()
    console.log("[ItemCodeList] Batch commit SUCCESS")
    return { success: items.length, failed: 0 }
  } catch (error) {
    console.error("[ItemCodeList] Batch commit FAILED:", error)
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Firebase write failed: ${message}`)
  }
}

export async function updateItemCodeList(item: ItemCodeList): Promise<ItemCodeList> {
  const db = getFirestoreSafe()
  if (!db) return item

  await updateDoc(doc(db, ITEM_CODE_LIST_COLLECTION, item.id), {
    MHBCode: item.MHBCode ?? "",
    IzuyoshiVNCode: item.IzuyoshiVNCode ?? "",
    Description: item.Description ?? "",
  })
  return item
}

export async function deleteItemCodeList(itemId: string): Promise<void> {
  const db = getFirestoreSafe()
  if (!db) return

  await deleteDoc(doc(db, ITEM_CODE_LIST_COLLECTION, itemId))
}
