const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccountKey.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();
const serverTimestamp = admin.firestore.FieldValue.serverTimestamp;

const fixedValueConfigs = [
  {
    id: "C5_C",
    sourceCell: "C5",
    targetColumn: "C",
    itemName: "分納区分",
    defaultValue: "0",
    description: "Gia tri co dinh tu CSVExport C5",
    customerRule: "ALL",
    active: true,
  },
  {
    id: "D5_D",
    sourceCell: "D5",
    targetColumn: "D",
    itemName: "取引区分",
    defaultValue: "1",
    description: "Gia tri co dinh tu CSVExport D5",
    customerRule: "ALL",
    active: true,
  },
  {
    id: "O5_O",
    sourceCell: "O5",
    targetColumn: "O",
    itemName: "売上担当者コード",
    defaultValue: "51",
    description: "Gia tri co dinh tu CSVExport O5",
    customerRule: "ALL",
    active: true,
  },
  {
    id: "P5_P",
    sourceCell: "P5",
    targetColumn: "P",
    itemName: "売上計上部門コード",
    defaultValue: "TK11",
    description: "Gia tri co dinh tu CSVExport P5",
    customerRule: "ALL",
    active: true,
  },
  {
    id: "Q5_Q",
    sourceCell: "Q5",
    targetColumn: "Q",
    itemName: "売上取引形態区分",
    defaultValue: "1",
    description: "Gia tri co dinh tu CSVExport Q5",
    customerRule: "ALL",
    active: true,
  },
  {
    id: "R5_R",
    sourceCell: "R5",
    targetColumn: "R",
    itemName: "売上計上基準区分",
    defaultValue: "1",
    description: "Gia tri co dinh tu CSVExport R5",
    customerRule: "ALL",
    active: true,
  },
  {
    id: "S5_S",
    sourceCell: "S5",
    targetColumn: "S",
    itemName: "請求帳端区分",
    defaultValue: "1",
    description: "Gia tri co dinh tu CSVExport S5",
    customerRule: "ALL",
    active: true,
  },
  {
    id: "U5_U",
    sourceCell: "U5",
    targetColumn: "U",
    itemName: "取引通貨コード",
    defaultValue: "JPY",
    description: "Gia tri co dinh tu CSVExport U5",
    customerRule: "ALL",
    active: true,
  },
  {
    id: "V5_V",
    sourceCell: "V5",
    targetColumn: "V",
    itemName: "明細取引通貨コード",
    defaultValue: "JPY",
    description: "Gia tri co dinh tu CSVExport V5",
    customerRule: "ALL",
    active: true,
  },
  {
    id: "AE5_AE",
    sourceCell: "AE5",
    targetColumn: "AE",
    itemName: "手配区分",
    defaultValue: "1",
    description: "Gia tri co dinh tu CSVExport AE5",
    customerRule: "ALL",
    active: true,
  },
];

const importMappingConfigs = [
  {
    id: "sheet_K4_to_A",
    sourceType: "sheetCell",
    sourceCell: "K4",
    targetColumns: ["A"],
    itemName: "会社コード",
    level: "sheet",
    valueType: "string",
    description: "Lay gia tri cap sheet tu K4 vao cot A",
    startDetailRow: 17,
    validRowColumn: "R",
    customerRule: "ALL",
    active: true,
  },
  {
    id: "sheet_D4_to_E_I_J",
    sourceType: "sheetCell",
    sourceCell: "D4",
    targetColumns: ["E", "I", "J"],
    itemName: "得意先コード",
    level: "sheet",
    valueType: "string",
    description: "Mot nguon D4 map sang E/I/J",
    startDetailRow: 17,
    validRowColumn: "R",
    customerRule: "ALL",
    active: true,
  },
  {
    id: "sheet_K8_to_K",
    sourceType: "sheetCell",
    sourceCell: "K8",
    targetColumns: ["K"],
    itemName: "納入先コード",
    level: "sheet",
    valueType: "string",
    description: "Lay gia tri cap sheet tu K8 vao cot K",
    startDetailRow: 17,
    validRowColumn: "R",
    customerRule: "ALL",
    active: true,
  },
  {
    id: "sheet_Q5_to_W",
    sourceType: "sheetCell",
    sourceCell: "Q5",
    targetColumns: ["W"],
    itemName: "受注日",
    level: "sheet",
    valueType: "date",
    outputFormat: "yyyymmdd",
    description: "Ngay order tu Q5 vao cot W",
    startDetailRow: 17,
    validRowColumn: "R",
    customerRule: "ALL",
    active: true,
  },
  {
    id: "expression_Q7_minus_1_to_X_AO",
    sourceType: "expression",
    expression: "Q7 - 1",
    targetColumns: ["X", "AO"],
    itemName: "出荷予定日",
    level: "sheet",
    valueType: "date",
    outputFormat: "yyyymmdd",
    description: "Ngay Q7 tru 1 ngay vao cot X/AO",
    startDetailRow: 17,
    validRowColumn: "R",
    customerRule: "ALL",
    active: true,
  },
  {
    id: "sheet_Q7_to_Y",
    sourceType: "sheetCell",
    sourceCell: "Q7",
    targetColumns: ["Y"],
    itemName: "出荷予定日",
    level: "sheet",
    valueType: "date",
    outputFormat: "yyyymmdd",
    description: "Ngay Q7 vao cot Y",
    startDetailRow: 17,
    validRowColumn: "R",
    customerRule: "ALL",
    active: true,
  },
  {
    id: "generated_line_number_to_AD",
    sourceType: "generated",
    generatedType: "lineNumber",
    targetColumns: ["AD"],
    itemName: "売上伝票行番号",
    level: "system",
    valueType: "number",
    description: "Tu dong danh so thu tu bat dau tu 1",
    startDetailRow: 17,
    validRowColumn: "R",
    customerRule: "ALL",
    active: true,
  },
  {
    id: "detail_C_to_Z",
    sourceType: "detailColumn",
    sourceColumn: "C",
    targetColumns: ["Z"],
    itemName: "拡張コード項目２",
    level: "detail",
    valueType: "string",
    description: "Cot C dong chi tiet vao cot Z",
    startDetailRow: 17,
    validRowColumn: "R",
    customerRule: "ALL",
    active: true,
  },
  {
    id: "detail_I_to_AA",
    sourceType: "detailColumn",
    sourceColumn: "I",
    targetColumns: ["AA"],
    itemName: "拡張コード項目３",
    level: "detail",
    valueType: "string",
    description: "Cot I dong chi tiet vao cot AA",
    startDetailRow: 17,
    validRowColumn: "R",
    customerRule: "ALL",
    active: true,
  },
  {
    id: "detail_E_to_AB",
    sourceType: "detailColumn",
    sourceColumn: "E",
    targetColumns: ["AB"],
    itemName: "拡張テキスト項目１",
    level: "detail",
    valueType: "string",
    description: "Cot E dong chi tiet vao cot AB",
    startDetailRow: 17,
    validRowColumn: "R",
    customerRule: "ALL",
    active: true,
  },
  {
    id: "detail_M_to_AG",
    sourceType: "detailColumn",
    sourceColumn: "M",
    targetColumns: ["AG"],
    itemName: "商品名",
    level: "detail",
    valueType: "string",
    description: "Cot M dong chi tiet vao cot AG",
    startDetailRow: 17,
    validRowColumn: "R",
    customerRule: "ALL",
    active: true,
  },
  {
    id: "detail_R_to_AI",
    sourceType: "detailColumn",
    sourceColumn: "R",
    targetColumns: ["AI"],
    itemName: "受注数",
    level: "detail",
    valueType: "number",
    description: "Cot R dong chi tiet vao cot AI; dong hop le cung dua tren cot R",
    startDetailRow: 17,
    validRowColumn: "R",
    customerRule: "ALL",
    active: true,
  },
  {
    id: "detail_U_to_AM",
    sourceType: "detailColumn",
    sourceColumn: "U",
    targetColumns: ["AM"],
    itemName: "取引通貨受注単価",
    level: "detail",
    valueType: "number",
    description: "Cot U dong chi tiet vao cot AM",
    startDetailRow: 17,
    validRowColumn: "R",
    customerRule: "ALL",
    active: true,
  },
  {
    id: "detail_V_to_AN",
    sourceType: "detailColumn",
    sourceColumn: "V",
    targetColumns: ["AN"],
    itemName: "取引通貨明細受注金額",
    level: "detail",
    valueType: "number",
    description: "Cot V dong chi tiet vao cot AN",
    startDetailRow: 17,
    validRowColumn: "R",
    customerRule: "ALL",
    active: true,
  },
  {
    id: "detail_L_to_AP",
    sourceType: "detailColumn",
    sourceColumn: "L",
    targetColumns: ["AP"],
    itemName: "ベトナム工場の資材コード",
    level: "detail",
    valueType: "string",
    description: "Cot L dong chi tiet vao cot AP",
    startDetailRow: 17,
    validRowColumn: "R",
    customerRule: "ALL",
    active: true,
  },
  {
    id: "detail_S_to_AQ",
    sourceType: "detailColumn",
    sourceColumn: "S",
    targetColumns: ["AQ"],
    itemName: "単位コード(工場)",
    level: "detail",
    valueType: "string",
    description: "Cot S dong chi tiet vao cot AQ",
    startDetailRow: 17,
    validRowColumn: "R",
    customerRule: "ALL",
    active: true,
  },
];

const runtimeCollections = [
  "fixedValueConfigHistory",
  "importBatches",
  "importBatchRows",
  "validationIssues",
  "exportHistory",
];

async function setConfig(collectionName, item) {
  await db
    .collection(collectionName)
    .doc(item.id)
    .set(
      {
        ...item,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
}

async function seed() {
  console.log("Seeding fixedValueConfigs...");
  for (const item of fixedValueConfigs) {
    await setConfig("fixedValueConfigs", item);
    console.log(`  fixedValueConfigs/${item.id}`);
  }

  console.log("Seeding importMappingConfigs...");
  for (const item of importMappingConfigs) {
    await setConfig("importMappingConfigs", item);
    console.log(`  importMappingConfigs/${item.id}`);
  }

  console.log("Creating runtime collection metadata docs...");
  for (const collectionName of runtimeCollections) {
    await db.collection(collectionName).doc("_meta").set(
      {
        collectionName,
        description: "Runtime collection placeholder. Real records will be created by the app.",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    console.log(`  ${collectionName}/_meta`);
  }

  console.log("Done seeding Firestore configs.");
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
