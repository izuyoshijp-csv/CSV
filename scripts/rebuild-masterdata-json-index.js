/**
 * rebuild-masterdata-json-index.js
 *
 * Reads all Master Data collections from Firestore (via Admin SDK), exports each
 * collection as a JSON snapshot, uploads to Firebase Storage with public access,
 * and updates the manifest with public download URLs.
 *
 * Usage:
 *   node scripts/rebuild-masterdata-json-index.js [--local]
 *
 * Options:
 *   --local    Only write to public/masterdata-index/ (skip Storage upload)
 *
 * Environment:
 *   FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY
 *   (or GOOGLE_APPLICATION_CREDENTIALS / serviceAccountKey.json)
 *   FIREBASE_STORAGE_BUCKET  (e.g. "my-project.firebasestorage.app")
 *
 * For Vercel deployment:
 *   1. Run this script locally (or in CI) before/after deploy
 *   2. Script uploads JSON to Firebase Storage with public access
 *   3. Set NEXT_PUBLIC_MASTERDATA_INDEX_BASE_URL to the Storage public URL prefix
 *      (e.g. https://firebasestorage.googleapis.com/v0/b/PROJECT.appspot.com/o/masterdata-index)
 */

const path = require("path");
const fs = require("fs");

// Load .env.local manually (no dotenv dependency needed)
const envPath = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  let inMultiline = false;
  let multilineKey = "";
  let multilineValue = "";

  for (const rawLine of envContent.split("\n")) {
    if (inMultiline) {
      // Look for the closing " on this line
      const closingQuoteIdx = rawLine.lastIndexOf('"');
      if (closingQuoteIdx >= 0) {
        // End of multiline value
        multilineValue += "\n" + rawLine.slice(0, closingQuoteIdx);
        const decoded = multilineValue.replace(/\\n/g, "\n");
        process.env[multilineKey] = decoded;
        inMultiline = false;
        multilineKey = "";
        multilineValue = "";
      } else {
        // Still inside multiline
        multilineValue += "\n" + rawLine;
      }
      continue;
    }

    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIdx = line.indexOf("=");
    if (eqIdx < 0) continue;
    const key = line.slice(0, eqIdx).trim();
    let value = line.slice(eqIdx + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      // Single-line quoted value
      value = value.slice(1, -1);
    } else if (value.startsWith('"')) {
      // Multiline value starts — find closing quote
      const closingQuoteIdx = rawLine.lastIndexOf('"');
      if (closingQuoteIdx > eqIdx + 1) {
        // Closes on same line
        value = rawLine.slice(eqIdx + 2, closingQuoteIdx);
      } else {
        // Spans multiple lines
        inMultiline = true;
        multilineKey = key;
        multilineValue = value.slice(1);
        continue;
      }
    }

    // Decode \n escapes (e.g. in private keys)
    if (value.includes("\\n")) {
      value = value.replace(/\\n/g, "\n");
    }
    if (key) {
      process.env[key] = value;
    }
  }
}

const admin = require("firebase-admin");
const { doc } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");

const DEFAULT_OUTPUT_DIR = "public/masterdata-index";
const MANIFEST_FILE = "manifest.json";
const STORAGE_PREFIX = "masterdata-index";
const SEARCH_INDEX_FIELD = "_searchTokensByField";
const SEARCH_NGRAM_SIZE = 3;

const defaultMasterCollectionConfigs = [
  { collectionName: "CusCodeList", fields: ["CusCode", "CusNameEng", "CusNameJP", "CusAddress"] },
  { collectionName: "ItemCodeListMAV", fields: ["MAVCode", "MHBCode", "IzuyoshiJPCode", "IzuyoshiVNCode", "Description"] },
  { collectionName: "ItemCodeListMHB", fields: ["MHBCode", "MAVCode", "IzuyoshiJPCode", "IzuyoshiVNCode", "Description"] },
  { collectionName: "UnitPriceList", fields: ["IzuyoshiJPCode", "UnitPrice"] },
  { collectionName: "PIC.WH.CodeList", fields: ["PICCode", "WarehouseCode", "DetailWarehouseCode"] },
  { collectionName: "UnitCodeList", fields: ["OrderUnit", "CsvCode"] },
];

function parseArgs() {
  const args = process.argv.slice(2);
  return { local: args.includes("--local") };
}

function initFirebase() {
  if (admin.apps.length) return;

  let projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  let clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    if (!privateKey.includes("\\n")) privateKey = privateKey.replace(/\\n/g, "\n");
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    admin.initializeApp({ credential: admin.credential.applicationDefault() });
  } else {
    try {
      admin.initializeApp({
        credential: admin.credential.cert(require("../serviceAccountKey.json")),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      });
    } catch (err) {
      console.error("Firebase Admin SDK not initialized. Set FIREBASE_ADMIN_* env vars.");
      process.exit(1);
    }
  }
}

function getStorageBucket() {
  return process.env.FIREBASE_STORAGE_BUCKET || null;
}

function getStorageBaseUrl() {
  const bucket = getStorageBucket();
  if (!bucket) return null;
  // my-project.firebasestorage.app → https://firebasestorage.googleapis.com/v0/b/my-project.firebasestorage.app/o
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o`;
}

async function uploadToStorageAndMakePublic(localPath, storagePath) {
  const bucket = admin.storage().bucket();
  const file = bucket.file(storagePath);

  // Upload file
  await bucket.upload(localPath, {
    destination: file,
    metadata: {
      contentType: "application/json",
      cacheControl: "public, max-age=3600",
    },
  });

  // Make publicly readable (allUsers = public internet)
  await file.makePublic();

  // Get the public URL
  const [metadata] = await file.getMetadata();
  const publicUrl = metadata.mediaLink;

  return publicUrl;
}

function normalizeConfig(config) {
  const collectionName = String(config.collectionName ?? config.id ?? "").trim();
  const fields = Array.isArray(config.fieldConfigs) && config.fieldConfigs.length
    ? config.fieldConfigs.map((fc) => fc.name)
    : config.fields;
  return {
    collectionName,
    fields: [...new Set((fields ?? []).map((f) => String(f).trim()).filter(Boolean))],
    active: config.active !== false,
  };
}

async function getMasterCollectionConfigs() {
  const byCollection = new Map(
    defaultMasterCollectionConfigs.map((config) => [
      config.collectionName,
      normalizeConfig({ ...config, active: true }),
    ])
  );
  try {
    const snapshot = await admin.firestore().collection("masterCollectionConfigs").get();
    snapshot.docs.forEach((d) => {
      const config = normalizeConfig({ id: d.id, ...d.data() });
      if (config.collectionName && config.fields.length) {
        byCollection.set(config.collectionName, config);
      }
    });
  } catch (err) {
    console.warn("Could not read masterCollectionConfigs, using defaults:", err.message);
  }
  return [...byCollection.values()].filter((c) => c.active);
}

async function buildCollectionIndex(config, outputDir) {
  const db = admin.firestore();
  const snapshot = await db.collection(config.collectionName).get();
  const records = [];

  snapshot.docs.forEach((d) => {
    const data = d.data();
    const { [SEARCH_INDEX_FIELD]: _st, ...cleanData } = data;
    records.push({
      id: d.id,
      documentId: d.id,
      baseDocumentId: cleanData.baseDocumentId ?? d.id,
      ...cleanData,
    });
  });

  const lookupKeyField = config.fields[0] ?? "id";
  records.sort((a, b) => {
    const keyA = String(a[lookupKeyField] ?? a.id ?? "").toLowerCase();
    const keyB = String(b[lookupKeyField] ?? b.id ?? "").toLowerCase();
    return keyA.localeCompare(keyB);
  });

  const updatedAt = new Date().toISOString();
  const collectionIndex = {
    collectionName: config.collectionName,
    version: Date.now(),
    updatedAt,
    lookupKeyField,
    fields: config.fields,
    records,
  };

  const safeName = config.collectionName.replace(/[/\\.]/g, "_");
  const jsonFile = path.join(outputDir, `${safeName}.json`);
  fs.writeFileSync(jsonFile, JSON.stringify(collectionIndex, null, 0), "utf8");

  console.log(`  ${config.collectionName}: ${records.length} records -> ${jsonFile}`);

  return {
    collectionName: config.collectionName,
    recordCount: records.length,
    version: collectionIndex.version,
    updatedAt,
    localUrl: `/${STORAGE_PREFIX}/${safeName}.json`,
    localFile: jsonFile,
    storagePath: `${STORAGE_PREFIX}/${safeName}.json`,
  };
}

async function compactOldChangeLogs(collections, manifestUpdatedAt) {
  const db = admin.firestore();
  const cutoff = new Date(manifestUpdatedAt);
  let totalDeleted = 0;

  for (const collectionName of Object.keys(collections)) {
    try {
      const snapshot = await db
        .collection("masterdataChangeLogs")
        .where("collectionName", "==", collectionName)
        .where("changedAt", "<", admin.firestore.Timestamp.fromDate(cutoff))
        .limit(500)
        .get();

      if (snapshot.empty) continue;

      const ids = snapshot.docs.map((d) => d.id);
      const batch = db.batch();
      ids.forEach((id) => batch.delete(doc(db, "masterdataChangeLogs", id)));
      await batch.commit();
      totalDeleted += ids.length;
      console.log(`  Compacted ${ids.length} old change logs for ${collectionName}`);
    } catch (err) {
      console.warn(`  Could not compact change logs for ${collectionName}:`, err.message);
    }
  }

  if (totalDeleted) {
    console.log(`\nCompacted ${totalDeleted} old change log documents.`);
  }
}

async function main() {
  const opts = parseArgs();
  const outputDir = DEFAULT_OUTPUT_DIR;

  initFirebase();
  const bucket = getStorageBucket() || null;

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`Created output directory: ${outputDir}`);
  }

  const configs = await getMasterCollectionConfigs();
  console.log(`\nFound ${configs.length} active collection(s).\n`);

  const manifestVersion = Date.now();
  const collectionInfos = {};
  const publicUrls = {};

  // Build and optionally upload
  for (const config of configs) {
    try {
      const info = await buildCollectionIndex(config, outputDir);

      if (!opts.local && bucket) {
        process.stdout.write(`  Uploading ${info.storagePath}... `);
        const publicUrl = await uploadToStorageAndMakePublic(info.localFile, info.storagePath);
        publicUrls[info.collectionName] = publicUrl;
        console.log(`OK -> ${publicUrl}`);
      }

      collectionInfos[info.collectionName] = {
        url: publicUrls[info.collectionName] ?? info.localUrl,
        recordCount: info.recordCount,
        version: info.version,
        updatedAt: info.updatedAt,
      };
    } catch (err) {
      console.error(`  ERROR building ${config.collectionName}:`, err.message);
    }
  }

  // Build manifest
  const manifest = {
    version: manifestVersion,
    updatedAt: new Date().toISOString(),
    collections: collectionInfos,
  };

  const manifestPath = path.join(outputDir, MANIFEST_FILE);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 0), "utf8");

  // Upload manifest
  if (!opts.local && bucket) {
    process.stdout.write(`  Uploading manifest... `);
    const manifestUrl = await uploadToStorageAndMakePublic(manifestPath, `${STORAGE_PREFIX}/${MANIFEST_FILE}`);
    console.log(`OK -> ${manifestUrl}`);
  }

  console.log(`\nManifest: ${manifestPath}`);

  if (Object.keys(collectionInfos).length > 0) {
    await compactOldChangeLogs(collectionInfos, manifest.updatedAt);
  }

  console.log("\n---");
  if (opts.local) {
    console.log("Done (--local mode). Files in public/masterdata-index/ only.");
    console.log("To upload to Firebase Storage:");
    console.log(`  export FIREBASE_STORAGE_BUCKET="${bucket || "YOUR_BUCKET_NAME.firebasestorage.app"}"`);
    console.log("  npm run rebuild:masterdata-json-index");
  } else if (bucket) {
    console.log(`Done. Uploaded to Firebase Storage bucket: ${bucket}`);
    console.log("\nAdd to your .env.local:");
    const base = getStorageBaseUrl();
    console.log(`  NEXT_PUBLIC_MASTERDATA_INDEX_BASE_URL="${base}/${encodeURIComponent(STORAGE_PREFIX)}"`);
    console.log("\nClient will read manifest from:");
    console.log(`  ${getStorageBaseUrl()}/${encodeURIComponent(STORAGE_PREFIX)}/${MANIFEST_FILE}?alt=media`);
  } else {
    console.log("Done. Set FIREBASE_STORAGE_BUCKET to upload to Firebase Storage.");
  }
}

main().catch((err) => {
  console.error("Rebuild failed:", err);
  process.exit(1);
});
