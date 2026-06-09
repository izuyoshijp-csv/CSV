const admin = require("firebase-admin");
const XLSX = require("xlsx");
const path = require("path");

// Lay service account tu thu muc goc project
const serviceAccount = require("../../serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const collectionName = "PIC.WH.CodeList";
const excelFilePath = path.join(__dirname, "PIC.WH.CodeList.xlsx");

// Lam sach Document ID vi Firestore khong cho phep dau /
function makeSafeDocumentId(text) {
  return String(text || "")
    .trim()
    .replace(/\//g, "／")
    .replace(/\s+/g, " ")
    .substring(0, 1400);
}

function getValue(row, possibleNames) {
  for (const name of possibleNames) {
    if (row[name] !== undefined && row[name] !== null) {
      return String(row[name]).trim();
    }
  }
  return "";
}

async function importData() {
  const workbook = XLSX.readFile(excelFilePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  const rows = XLSX.utils.sheet_to_json(worksheet, {
    defval: "",
  });

  console.log("Dang import file: PIC.WH.CodeList.xlsx");
  console.log(`Sheet: ${sheetName}`);
  console.log(`So dong doc duoc: ${rows.length}`);

  const usedIds = new Set();

  let successCount = 0;
  let skipCount = 0;

  for (const row of rows) {
    const PICCode = getValue(row, [
      "P.I.CCode",
      "P.I.Ccode",
      "P.I.C.Code",
      "P.I.C.code",
      "PICCode",
      "PICcode",
    ]);

    const WarehouseCode = getValue(row, [
      "WarehouseCode",
      "Warehouse Code",
    ]);

    const DetailWarehouseCode = getValue(row, [
      "DetailWarehouseCode",
      "Detail Warehouse Code",
    ]);

    // Bo qua dong khong co P.I.CCode
    if (!PICCode) {
      skipCount++;
      continue;
    }

    const baseDocumentId = makeSafeDocumentId(PICCode);
    const documentId = baseDocumentId;

    if (usedIds.has(documentId)) {
      skipCount++;
      continue;
    }
    usedIds.add(documentId);

    const data = {
      PICCode,
      WarehouseCode,
      DetailWarehouseCode,

      // Luu lai ten cot goc de de kiem tra
      "P.I.CCode": PICCode,

      documentId,
      baseDocumentId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection(collectionName).doc(documentId).set(data, { merge: true });

    successCount++;
    console.log(`Imported: ${documentId}`);
  }

  console.log("------------------------------------");
  console.log("Hoan thanh import PIC.WH.CodeList!");
  console.log(`Thanh cong: ${successCount}`);
  console.log(`Bo qua vi khong co P.I.CCode hoac trung trong file: ${skipCount}`);
}

importData().catch((error) => {
  console.error("Loi import:", error);
  process.exit(1);
});
