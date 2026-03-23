import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const targets = [
  "src/components/Fleet.tsx",
  "src/pages/admin/Dashboard.tsx",
  "src/components/admin/AdminLayout.tsx",
  "src/pages/admin/FleetManagement.tsx",
  "src/pages/admin/RentalOperations.tsx",
  "src/pages/admin/Customers.tsx",
  "src/pages/admin/ContractBuilder.tsx",
  "src/utils/rentalContractPdf.ts",
];

const badPatterns = [
  { label: "mojibake-C3", regex: /\u00C3./g },
  { label: "mojibake-C4", regex: /\u00C4./g },
  { label: "mojibake-C5", regex: /\u00C5./g },
  { label: "mojibake-E2", regex: /\u00E2[\u0080-\u00BF]{1,2}/g },
  { label: "replacement-char", regex: /\uFFFD/g },
  { label: "question-mark-word", regex: /[ÇĞİÖŞÜçğıöşü]\?[A-Za-zÇĞİÖŞÜçğıöşü]|[A-Za-zÇĞİÖŞÜçğıöşü]\?[ÇĞİÖŞÜçğıöşü]/g },
];

let hasError = false;

for (const rel of targets) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) continue;
  const content = fs.readFileSync(full, "utf8");

  for (const { label, regex } of badPatterns) {
    const hits = [...content.matchAll(regex)];
    if (hits.length === 0) continue;
    hasError = true;
    console.error(`Unicode check failed: ${rel} -> ${label} (${hits.length})`);
  }
}

if (hasError) {
  process.exit(1);
}

console.log("Unicode check passed.");
