const { spawnSync } = require("child_process");
const path = require("path");

const commands = [
  ["CusCodeList", path.join("scripts", "CusCodeList", "CusCodeimport.js")],
  ["ItemCodeList", path.join("scripts", "ItemCodeList", "import-code-list.js")],
  ["PIC.WH.CodeList", path.join("scripts", "PIC.WH.CodeList", "PIC.WH.CodelistImport.js")],
  ["UnitCodeList", path.join("scripts", "UnitCodeList", "UnitCodeListImport.js")],
  ["UnitPriceList", path.join("scripts", "UnitPriceList", "UnitPriceListImport.js")],
];

for (const [name, scriptPath] of commands) {
  console.log(`\n=== Importing ${name} ===`);
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: path.resolve(__dirname, ".."),
    stdio: "inherit",
  });

  if (result.status !== 0) {
    console.error(`Import failed for ${name}`);
    process.exit(result.status || 1);
  }
}

console.log("\nAll master data imports completed.");
