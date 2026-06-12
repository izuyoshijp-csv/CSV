/**
 * compact-masterdata-change-logs.js
 *
 * Archives (deletes) change log documents older than the specified cutoff date.
 * Run this after a successful nightly rebuild or manually to keep delta logs lean.
 *
 * Usage:
 *   node scripts/compact-masterdata-change-logs.js [--dry-run] [--days <N>]
 *
 * Options:
 *   --dry-run  Show what would be deleted without deleting
 *   --days N   Delete logs older than N days (default: 7)
 *
 * Environment:
 *   FIREBASE_ADMIN_PROJECT_ID + FIREBASE_ADMIN_CLIENT_EMAIL + FIREBASE_ADMIN_PRIVATE_KEY
 *   (or GOOGLE_APPLICATION_CREDENTIALS)
 */

const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

const COLLECTIONS_TO_CHECK = [
  "CusCodeList", "ItemCodeListMAV", "ItemCodeListMHB",
  "UnitPriceList", "PIC.WH.CodeList", "UnitCodeList",
];

function parseArgs() {
  const args = process.argv.slice(2);
  let dryRun = false;
  let days = 7;
  let outputDir = "public/masterdata-index";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--dry-run") dryRun = true;
    else if (args[i] === "--days" && i + 1 < args.length) days = parseInt(args[++i], 10);
    else if (args[i] === "--output" && i + 1 < args.length) outputDir = args[++i];
  }

  return { dryRun, days, outputDir };
}

function initFirebase() {
  if (admin.apps.length) return;

  let projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  let clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    if (!privateKey.includes("\\n")) privateKey = privateKey.replace(/\\n/g, "\n");
    admin.initializeApp({ credential: admin.credential.cert({ projectId, clientEmail, privateKey }) });
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    admin.initializeApp({ credential: admin.credential.applicationDefault() });
  } else {
    try {
      admin.initializeApp({ credential: admin.credential.cert(require("../serviceAccountKey.json")) });
    } catch (err) {
      console.error("Firebase Admin not initialized. Set FIREBASE_ADMIN_* env vars.");
      process.exit(1);
    }
  }
}

function getCutoffFromManifest(outputDir) {
  const manifestPath = path.join(outputDir, "manifest.json");
  if (!fs.existsSync(manifestPath)) return null;
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    return new Date(manifest.updatedAt);
  } catch {
    return null;
  }
}

async function compactCollection(db, collectionName, cutoff, dryRun) {
  const { FieldValue } = require("firebase-admin/firestore");
  let total = 0;
  let batchNum = 0;

  while (true) {
    const snapshot = await db
      .collection("masterdataChangeLogs")
      .where("collectionName", "==", collectionName)
      .where("changedAt", "<", admin.firestore.Timestamp.fromDate(cutoff))
      .limit(500)
      .get();

    if (snapshot.empty) break;

    const ids = snapshot.docs.map((d) => d.id);
    batchNum++;
    console.log(`  [${collectionName}] Batch ${batchNum}: ${ids.length} docs`);

    if (!dryRun) {
      const batch = db.batch();
      ids.forEach((id) => batch.delete(db.collection("masterdataChangeLogs").doc(id)));
      await batch.commit();
    }

    total += ids.length;
    if (ids.length < 500) break;
  }

  return total;
}

async function main() {
  const { dryRun, days, outputDir } = parseArgs();
  initFirebase();

  const db = admin.firestore();
  const cutoff = getCutoffFromManifest(outputDir) ?? new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const cutoffStr = cutoff.toISOString();

  console.log(`Cutoff: ${cutoffStr}`);
  if (dryRun) console.log("[DRY RUN] No changes will be made.\n");

  let grandTotal = 0;

  for (const collectionName of COLLECTIONS_TO_CHECK) {
    try {
      const deleted = await compactCollection(db, collectionName, cutoff, dryRun);
      if (deleted > 0) grandTotal += deleted;
    } catch (err) {
      console.warn(`  Skipped ${collectionName}:`, err.message);
    }
  }

  if (grandTotal) {
    console.log(`\n${dryRun ? "[DRY RUN] Would delete" : "Deleted"} ${grandTotal} change log documents.`);
  } else {
    console.log("\nNo old change logs to compact.");
  }
}

main().catch((err) => {
  console.error("Compact failed:", err);
  process.exit(1);
});
