const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccountKey.json");

const SEARCH_INDEX_FIELD = "_searchTokensByField";
const SEARCH_NGRAM_SIZE = 3;

const defaultMasterCollectionConfigs = [
  {
    collectionName: "CusCodeList",
    fields: ["CusCode", "CusNameEng", "CusNameJP", "CusAddress"],
  },
  {
    collectionName: "ItemCodeListMAV",
    fields: ["MAVCode", "MHBCode", "IzuyoshiJPCode", "IzuyoshiVNCode", "Description"],
  },
  {
    collectionName: "ItemCodeListMHB",
    fields: ["MHBCode", "MAVCode", "IzuyoshiJPCode", "IzuyoshiVNCode", "Description"],
  },
  {
    collectionName: "UnitPriceList",
    fields: ["IzuyoshiJPCode", "UnitPrice"],
  },
  {
    collectionName: "PIC.WH.CodeList",
    fields: ["PICCode", "WarehouseCode", "DetailWarehouseCode"],
  },
  {
    collectionName: "UnitCodeList",
    fields: ["OrderUnit", "CsvCode"],
  },
];

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

function normalizeSearchText(value) {
  return String(value ?? "").trim().toLowerCase();
}

function buildSearchTokens(value) {
  const text = normalizeSearchText(value);
  if (!text) return [];
  if (text.length <= SEARCH_NGRAM_SIZE) return [text];

  const tokens = new Set();
  for (let index = 0; index <= text.length - SEARCH_NGRAM_SIZE; index += 1) {
    tokens.add(text.slice(index, index + SEARCH_NGRAM_SIZE));
  }

  return [...tokens];
}

function buildSearchTokensByField(fields, data) {
  return Object.fromEntries(fields.map((field) => [field, buildSearchTokens(data[field])]));
}

function normalizeConfig(config) {
  const collectionName = String(config.collectionName ?? config.id ?? "").trim();
  const fields = Array.isArray(config.fieldConfigs) && config.fieldConfigs.length
    ? config.fieldConfigs.map((fieldConfig) => fieldConfig.name)
    : config.fields;

  return {
    collectionName,
    fields: [...new Set((fields ?? []).map((field) => String(field).trim()).filter(Boolean))],
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

  const snapshot = await db.collection("masterCollectionConfigs").get();
  snapshot.docs.forEach((document) => {
    const config = normalizeConfig({ id: document.id, ...document.data() });
    if (config.collectionName && config.fields.length) {
      byCollection.set(config.collectionName, config);
    }
  });

  return [...byCollection.values()].filter((config) => config.active);
}

async function rebuildCollectionIndex(config) {
  const snapshot = await db.collection(config.collectionName).get();
  const documents = snapshot.docs;
  let updated = 0;

  for (let index = 0; index < documents.length; index += 450) {
    const batch = db.batch();
    const chunk = documents.slice(index, index + 450);

    chunk.forEach((document) => {
      const data = document.data();
      batch.set(
        document.ref,
        {
          [SEARCH_INDEX_FIELD]: buildSearchTokensByField(config.fields, data),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    });

    await batch.commit();
    updated += chunk.length;
    console.log(`  ${config.collectionName}: ${updated}/${documents.length}`);
  }

  return updated;
}

async function main() {
  const configs = await getMasterCollectionConfigs();
  let total = 0;

  for (const config of configs) {
    console.log(`\nRebuilding ${config.collectionName}...`);
    total += await rebuildCollectionIndex(config);
  }

  console.log(`\nDone. Rebuilt search index for ${total} documents.`);
}

main().catch((error) => {
  console.error("Rebuild failed:", error);
  process.exit(1);
});
