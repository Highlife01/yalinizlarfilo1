#!/usr/bin/env node
/**
 * Firestore araç sigorta güncelleme - Firebase CLI token kullanarak REST API ile.
 * firebase login zaten yapılmış olmalı.
 */
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const PROJECT_ID = "yalinizlarfilo";

// ── Sigorta verileri (PDF'lerden çıkarıldı) ─────────────────────
const INSURANCE_DATA = [
  {
    plate: "01BFL464",
    chassis: "W0VEDYHZ0SJ982529",
    casco_company: "Unico Sigorta A.Ş.",
    casco_policy_no: "189000331",
    casco_start_date: "2026-02-18",
    casco_end_date: "2027-02-18",
    insurance_company: "Neova Katılım Sigorta A.Ş.",
    insurance_policy_no: "484091606",
    insurance_start_date: "2026-02-18",
    insurance_end_date: "2027-02-18",
  },
  {
    plate: "01BFL465",
    chassis: "W0VEDYHZ9SJ982531",
    casco_company: "Unico Sigorta A.Ş.",
    casco_policy_no: "189000425",
    casco_start_date: "2026-02-18",
    casco_end_date: "2027-02-18",
    insurance_company: "Neova Katılım Sigorta A.Ş.",
    insurance_policy_no: "484087790",
    insurance_start_date: "2026-02-18",
    insurance_end_date: "2027-02-18",
  },
  {
    plate: "01BFL466",
    chassis: "W0VEDYHZ1SJ982524",
    casco_company: "Unico Sigorta A.Ş.",
    casco_policy_no: "189000412",
    casco_start_date: "2026-02-18",
    casco_end_date: "2027-02-18",
    insurance_company: "Neova Katılım Sigorta A.Ş.",
    insurance_policy_no: "484084295",
    insurance_start_date: "2026-02-18",
    insurance_end_date: "2027-02-18",
  },
  {
    plate: "01BFL467",
    chassis: "W0VEDYHZ7SJ982530",
    casco_company: "Unico Sigorta A.Ş.",
    casco_policy_no: "189000305",
    casco_start_date: "2026-02-18",
    casco_end_date: "2027-02-18",
    insurance_company: "Neova Katılım Sigorta A.Ş.",
    insurance_policy_no: "484089775",
    insurance_start_date: "2026-02-18",
    insurance_end_date: "2027-02-18",
  },
  {
    plate: "01BFL468",
    chassis: "W0VEDYHZ3SJ982525",
    casco_company: "Unico Sigorta A.Ş.",
    casco_policy_no: "189000458",
    casco_start_date: "2026-02-18",
    casco_end_date: "2027-02-18",
    insurance_company: "Neova Katılım Sigorta A.Ş.",
    insurance_policy_no: "484077843",
    insurance_start_date: "2026-02-18",
    insurance_end_date: "2027-02-18",
  },
];

// ── Token ────────────────────────────────────────────────────────
async function getAccessToken() {
  const configPath = path.join(
    process.env.USERPROFILE || process.env.HOME || "",
    ".config",
    "configstore",
    "firebase-tools.json"
  );
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  const refreshToken = config?.tokens?.refresh_token;
  if (!refreshToken) throw new Error("Firebase CLI refresh token bulunamadı");

  // Exchange refresh token for access token
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com",
      client_secret: "j9iVZfS8kkCEFUPaAeJV0sAi",
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error("Token alınamadı: " + JSON.stringify(data));
  return data.access_token;
}

// ── Firestore REST API helpers ───────────────────────────────────
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

async function queryByPlate(plate, token) {
  const res = await fetch(`${BASE}:runQuery`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "vehicles" }],
        where: {
          fieldFilter: {
            field: { fieldPath: "plate" },
            op: "EQUAL",
            value: { stringValue: plate },
          },
        },
      },
    }),
  });
  const results = await res.json();
  return results
    .filter((r) => r.document)
    .map((r) => ({
      name: r.document.name,
      fields: r.document.fields,
    }));
}

async function patchDocument(docName, fields, token) {
  const params = Object.keys(fields)
    .map((k) => `updateMask.fieldPaths=${k}`)
    .join("&");

  const firestoreFields = {};
  for (const [k, v] of Object.entries(fields)) {
    firestoreFields[k] = { stringValue: v };
  }

  const res = await fetch(`https://firestore.googleapis.com/v1/${docName}?${params}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields: firestoreFields }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PATCH failed for ${docName}: ${res.status} ${err}`);
  }
  return res.json();
}

// ── Main ─────────────────────────────────────────────────────────
async function main() {
  console.log("Firebase CLI token alınıyor...");
  const token = await getAccessToken();
  console.log("Token alındı.\n");

  for (const data of INSURANCE_DATA) {
    console.log(`${data.plate} aranıyor...`);
    const docs = await queryByPlate(data.plate, token);

    if (docs.length === 0) {
      console.log(`  ⚠️  ${data.plate} Firestore'da bulunamadı, atlanıyor.`);
      continue;
    }

    for (const doc of docs) {
      const docPath = doc.name;
      const docId = docPath.split("/").pop();

      await patchDocument(docPath, {
        insurance_company: data.insurance_company,
        insurance_policy_no: data.insurance_policy_no,
        insurance_start_date: data.insurance_start_date,
        insurance_end_date: data.insurance_end_date,
        casco_company: data.casco_company,
        casco_policy_no: data.casco_policy_no,
        casco_start_date: data.casco_start_date,
        casco_end_date: data.casco_end_date,
        chassis_number: data.chassis,
      }, token);

      console.log(`  ✅ ${data.plate} (doc: ${docId}) güncellendi.`);
    }
  }

  console.log("\nTüm sigorta bilgileri güncellendi.");
}

main().catch((err) => {
  console.error("Hata:", err.message);
  process.exit(1);
});
