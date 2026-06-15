import { NextRequest, NextResponse } from "next/server"
import * as admin from "firebase-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

const STORAGE_PREFIX = "masterdata-index"
const MANIFEST_FILE = "manifest.json"
const SEARCH_INDEX_FIELD = "_searchTokensByField"

const defaultMasterCollectionConfigs = [
  { collectionName: "CusCodeList", fields: ["CusCode", "CusNameEng", "CusNameJP", "CusAddress"] },
  { collectionName: "ItemCodeListMAV", fields: ["MAVCode", "MHBCode", "IzuyoshiJPCode", "IzuyoshiVNCode", "Description"] },
  { collectionName: "ItemCodeListMHB", fields: ["MHBCode", "MAVCode", "IzuyoshiJPCode", "IzuyoshiVNCode", "Description"] },
  { collectionName: "UnitPriceList", fields: ["IzuyoshiJPCode", "UnitPrice"] },
  { collectionName: "PIC.WH.CodeList", fields: ["PICCode", "WarehouseCode", "DetailWarehouseCode"] },
  { collectionName: "UnitCodeList", fields: ["OrderUnit", "CsvCode"] },
]

type MasterCollectionConfigForRebuild = {
  collectionName: string
  fields: string[]
  active: boolean
}

type RebuildCollectionInfo = {
  url: string
  recordCount: number
  version: number
  updatedAt: string
}

type MasterDataJsonRecord = Record<string, unknown> & {
  id: string
  documentId: string
  baseDocumentId: unknown
}

function getStorageBucketName() {
  return process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || ""
}

function getStorageBaseUrl() {
  const bucket = getStorageBucketName()
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o`
}

function getStorageMediaUrl(storagePath: string) {
  return `${getStorageBaseUrl()}/${encodeURIComponent(storagePath)}?alt=media`
}

function getSafeCollectionFileName(collectionName: string) {
  return collectionName.replace(/[/\\.]/g, "_")
}

function initFirebaseAdmin() {
  if (admin.apps.length) return

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n")
  const storageBucket = getStorageBucketName()

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Missing Firebase Admin environment variables.")
  }

  if (!storageBucket) {
    throw new Error("Missing FIREBASE_STORAGE_BUCKET or NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET.")
  }

  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    storageBucket,
  })
}

function normalizeConfig(config: Record<string, unknown>): MasterCollectionConfigForRebuild {
  const collectionName = String(config.collectionName ?? config.id ?? "").trim()
  const fieldConfigs = Array.isArray(config.fieldConfigs) ? config.fieldConfigs : []
  const fieldsFromFieldConfigs = fieldConfigs
    .map((fieldConfig) => {
      if (!fieldConfig || typeof fieldConfig !== "object") return ""
      return String((fieldConfig as { name?: unknown }).name ?? "").trim()
    })
    .filter(Boolean)
  const rawFields = fieldsFromFieldConfigs.length ? fieldsFromFieldConfigs : config.fields
  const fields = Array.isArray(rawFields)
    ? rawFields.map((field) => String(field).trim()).filter(Boolean)
    : []

  return {
    collectionName,
    fields: [...new Set(fields)],
    active: config.active !== false,
  }
}

async function getMasterCollectionConfigs() {
  const db = admin.firestore()
  const byCollection = new Map(
    defaultMasterCollectionConfigs.map((config) => [
      config.collectionName,
      normalizeConfig({ ...config, active: true }),
    ])
  )

  const snapshot = await db.collection("masterCollectionConfigs").get()
  snapshot.docs.forEach((document) => {
    const config = normalizeConfig({ id: document.id, ...document.data() })
    if (config.collectionName && config.fields.length) {
      byCollection.set(config.collectionName, config)
    }
  })

  return [...byCollection.values()].filter((config) => config.active)
}

async function uploadJsonToStorage(storagePath: string, data: unknown) {
  const bucket = admin.storage().bucket(getStorageBucketName())
  const file = bucket.file(storagePath)
  const body = Buffer.from(JSON.stringify(data, null, 0), "utf8")

  await file.save(body, {
    resumable: false,
    metadata: {
      contentType: "application/json; charset=utf-8",
      cacheControl: "public, max-age=3600",
    },
  })

  return getStorageMediaUrl(storagePath)
}

async function buildAndUploadCollectionIndex(
  config: MasterCollectionConfigForRebuild
): Promise<RebuildCollectionInfo> {
  const db = admin.firestore()
  const snapshot = await db.collection(config.collectionName).get()
  const records: MasterDataJsonRecord[] = snapshot.docs.map((document) => {
    const data = document.data()
    const { [SEARCH_INDEX_FIELD]: _searchIndex, ...cleanData } = data

    return {
      id: document.id,
      documentId: document.id,
      baseDocumentId: cleanData.baseDocumentId ?? document.id,
      ...cleanData,
    }
  })

  const lookupKeyField = config.fields[0] ?? "id"
  records.sort((left, right) => {
    const leftKey = String(left[lookupKeyField] ?? left.id ?? "").toLowerCase()
    const rightKey = String(right[lookupKeyField] ?? right.id ?? "").toLowerCase()
    return leftKey.localeCompare(rightKey)
  })

  const updatedAt = new Date().toISOString()
  const version = Date.now()
  const collectionIndex = {
    collectionName: config.collectionName,
    version,
    updatedAt,
    lookupKeyField,
    fields: config.fields,
    records,
  }
  const storagePath = `${STORAGE_PREFIX}/${getSafeCollectionFileName(config.collectionName)}.json`
  const url = await uploadJsonToStorage(storagePath, collectionIndex)

  return {
    url,
    recordCount: records.length,
    version,
    updatedAt,
  }
}

async function compactOldChangeLogs(collectionNames: string[], cutoff: Date) {
  const db = admin.firestore()
  let deleted = 0

  for (const collectionName of collectionNames) {
    while (true) {
      const snapshot = await db
        .collection("masterdataChangeLogs")
        .where("collectionName", "==", collectionName)
        .where("changedAt", "<", admin.firestore.Timestamp.fromDate(cutoff))
        .limit(500)
        .get()

      if (snapshot.empty) break

      const batch = db.batch()
      snapshot.docs.forEach((document) => batch.delete(document.ref))
      await batch.commit()
      deleted += snapshot.size

      if (snapshot.size < 500) break
    }
  }

  return deleted
}

function isAuthorized(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const authorization = request.headers.get("authorization")
  const querySecret = request.nextUrl.searchParams.get("secret")
  const isVercelCron = request.headers.get("x-vercel-cron") === "1"

  if (cronSecret) {
    return authorization === `Bearer ${cronSecret}` || querySecret === cronSecret || isVercelCron
  }

  return isVercelCron
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized cron request." }, { status: 401 })
  }

  try {
    initFirebaseAdmin()

    const configs = await getMasterCollectionConfigs()
    const collections: Record<string, RebuildCollectionInfo> = {}

    for (const config of configs) {
      collections[config.collectionName] = await buildAndUploadCollectionIndex(config)
    }

    const manifest = {
      version: Date.now(),
      updatedAt: new Date().toISOString(),
      collections,
    }
    const manifestUrl = await uploadJsonToStorage(`${STORAGE_PREFIX}/${MANIFEST_FILE}`, manifest)
    const compactedChangeLogs = await compactOldChangeLogs(Object.keys(collections), new Date(manifest.updatedAt))

    return NextResponse.json({
      ok: true,
      rebuiltAt: manifest.updatedAt,
      manifestUrl,
      collectionCount: Object.keys(collections).length,
      collections: Object.fromEntries(
        Object.entries(collections).map(([collectionName, info]) => [
          collectionName,
          { recordCount: info.recordCount, updatedAt: info.updatedAt },
        ])
      ),
      compactedChangeLogs,
    })
  } catch (error) {
    console.error("[cron] Failed to rebuild masterdata JSON index:", error)
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown rebuild error.",
      },
      { status: 500 }
    )
  }
}
