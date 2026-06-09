const admin = require("firebase-admin");
const XLSX = require("xlsx");
const path = require("path");

// Lay service account tu thu muc goc project
const serviceAccount = require("../../serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const collectionName = "UnitCodeList";
const excelFilePath = path.join(__dirname, "UnitCodeList.xlsx");

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

  console.log("Dang import file: UnitCodeList.xlsx");
  console.log(`Sheet: ${sheetName}`);
  console.log(`So dong doc duoc: ${rows.length}`);

  const usedIds = new Set();

  let successCount = 0;
  let skipCount = 0;

  for (const row of rows) {
    const OrderUnit = getValue(row, [
      "OrderUnit",
      "Order Unit",
      "orderunit",
      "order unit",
    ]);

    const CsvCode = getValue(row, [
      "CsvCode",
      "CSVCode",
      "Csv Code",
      "CSV Code",
    ]);

    // Bo qua dong khong co OrderUnit
    if (!OrderUnit) {
      skipCount++;
      continue;
    }

    const baseDocumentId = makeSafeDocumentId(OrderUnit);
    const documentId = baseDocumentId;

    if (usedIds.has(documentId)) {
      skipCount++;
      continue;
    }
    usedIds.add(documentId);

    const data = {
      OrderUnit,
      CsvCode,

      // Luu lai ten cot goc de de kiem tra
      "OrderUnit": OrderUnit,
      "CsvCode": CsvCode,

      documentId,
      baseDocumentId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection(collectionName).doc(documentId).set(data, { merge: true });

    successCount++;
    console.log(`Imported: ${documentId}`);
  }

  console.log("------------------------------------");
  console.log("Hoan thanh import UnitCodeList!");
  console.log(`Thanh cong: ${successCount}`);
  console.log(`Bo qua vi khong co OrderUnit hoac trung trong file: ${skipCount}`);
}

importData().catch((error) => {
  console.error("Loi import:", error);
  process.exit(1);
});
