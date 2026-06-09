const admin = require("firebase-admin");
const XLSX = require("xlsx");
const path = require("path");

// Lay service account tu thu muc goc project
const serviceAccount = require("../../serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Ten file Excel cua ban
const excelFilePath = path.join(__dirname, "CodeList.xlsx");

// Doc sheet dau tien
const workbook = XLSX.readFile(excelFilePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// Chuyen Excel thanh JSON
const rows = XLSX.utils.sheet_to_json(worksheet, {
  defval: "",
});

// Lam sach Document ID vi Firestore khong cho phep dau /
function makeSafeDocumentId(text) {
  return String(text || "")
    .trim()
    .replace(/\//g, "／")
    .replace(/\s+/g, " ")
    .substring(0, 1400);
}

async function importData() {
  console.log(`Dang import ${rows.length} dong tu sheet: ${sheetName}`);

  const collectionName = "ItemCodeList";
  const usedIds = new Set();

  let successCount = 0;
  let skipCount = 0;

  for (const row of rows) {
    const Description = String(row.Description || "").trim();
    const MAVCode = String(row.MAVCode || "").trim();
    const MHBCode = String(row.MHBCode || "").trim();
    const IzuyoshiJPCode = String(row.IzuyoshiJPCode || "").trim();
    const IzuyoshiVNCode = String(row.IzuyoshiVNCode || "").trim();

    // Bo qua dong khong co IzuyoshiJPCode
    if (!IzuyoshiJPCode) {
      skipCount++;
      continue;
    }

    const baseDocumentId = makeSafeDocumentId(IzuyoshiJPCode);
    const documentId = baseDocumentId;

    if (usedIds.has(documentId)) {
      skipCount++;
      continue;
    }
    usedIds.add(documentId);

    const data = {
      Description,
      MAVCode,
      MHBCode,
      IzuyoshiJPCode,
      IzuyoshiVNCode,

      // Luu them de sau nay de kiem tra
      documentId,
      baseDocumentId,

      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection(collectionName).doc(documentId).set(data, { merge: true });

    successCount++;
    console.log(`Imported: ${documentId}`);
  }

  console.log("Hoan thanh import!");
  console.log(`Thanh cong: ${successCount}`);
  console.log(`Bo qua vi khong co IzuyoshiJPCode: ${skipCount}`);
}

importData().catch((error) => {
  console.error("Loi import:", error);
  process.exit(1);
});
