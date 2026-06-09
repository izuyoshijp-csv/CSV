const admin = require("firebase-admin");
const XLSX = require("xlsx");
const path = require("path");

// Lay service account tu thu muc goc project
const serviceAccount = require("../../serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const collectionName = "UnitPriceList";
const excelFilePath = path.join(__dirname, "UnitPriceList.xlsx");

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

function getNumberValue(row, possibleNames) {
  for (const name of possibleNames) {
    if (row[name] !== undefined && row[name] !== null && row[name] !== "") {
      const value = Number(row[name]);
      return isNaN(value) ? String(row[name]).trim() : value;
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

  console.log("Dang import file: UnitPriceList.xlsx");
  console.log(`Sheet: ${sheetName}`);
  console.log(`So dong doc duoc: ${rows.length}`);

  const usedIds = new Set();

  let successCount = 0;
  let skipCount = 0;

  for (const row of rows) {
    const IzuyoshiJPCode = getValue(row, [
      "IzuyoshiJPCode",
      "Izuyoshi JP Code",
      "izuyoshiJPCode",
      "IzuyoshiJpCode",
    ]);

    const UnitPrice = getNumberValue(row, [
      "UnitPrice",
      "Unit Price",
      "unitprice",
      "Unitprice",
    ]);

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
      IzuyoshiJPCode,
      UnitPrice,

      documentId,
      baseDocumentId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection(collectionName).doc(documentId).set(data, { merge: true });

    successCount++;
    console.log(`Imported: ${documentId}`);
  }

  console.log("------------------------------------");
  console.log("Hoan thanh import UnitPriceList!");
  console.log(`Thanh cong: ${successCount}`);
  console.log(`Bo qua vi khong co IzuyoshiJPCode hoac trung trong file: ${skipCount}`);
}

importData().catch((error) => {
  console.error("Loi import:", error);
  process.exit(1);
});
