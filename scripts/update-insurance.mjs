#!/usr/bin/env node
/**
 * Araç sigorta (trafik + kasko) bilgilerini Firestore'a yazar.
 *
 * Kullanım:
 *   $env:GOOGLE_APPLICATION_CREDENTIALS="firebase-service-account.json"; node scripts/update-insurance.mjs
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

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

// ── Firebase init ────────────────────────────────────────────────
async function main() {
  const keyPath =
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    path.join(rootDir, "firebase-service-account.json");

  let app;
  try {
    const serviceAccount = JSON.parse(readFileSync(keyPath, "utf8"));
    app = initializeApp({ credential: cert(serviceAccount) });
  } catch {
    // Fallback: try Application Default Credentials (gcloud auth)
    try {
      const { applicationDefault } = await import("firebase-admin/app");
      app = initializeApp({ credential: applicationDefault(), projectId: "yalinizlarfilo" });
    } catch {
      console.error("Firebase kimlik doğrulama başarısız.");
      console.error("Lütfen firebase-service-account.json dosyasını proje köküne koyun.");
      console.error("Firebase Console → Project Settings → Service accounts → Generate new private key");
      process.exit(1);
    }
  }
  const db = getFirestore();

  // Her plaka için Firestore'da vehicles koleksiyonunda arama yap
  for (const data of INSURANCE_DATA) {
    const snap = await db
      .collection("vehicles")
      .where("plate", "==", data.plate)
      .get();

    if (snap.empty) {
      console.log(`⚠️  ${data.plate} plaka Firestore'da bulunamadı, atlanıyor.`);
      continue;
    }

    for (const doc of snap.docs) {
      await doc.ref.update({
        insurance_company: data.insurance_company,
        insurance_policy_no: data.insurance_policy_no,
        insurance_start_date: data.insurance_start_date,
        insurance_end_date: data.insurance_end_date,
        casco_company: data.casco_company,
        casco_policy_no: data.casco_policy_no,
        casco_start_date: data.casco_start_date,
        casco_end_date: data.casco_end_date,
        chassis_number: data.chassis,
      });
      console.log(`✅ ${data.plate} (doc: ${doc.id}) güncellendi.`);
    }
  }

  console.log("\nTüm sigorta bilgileri güncellendi.");
}

main().catch((err) => {
  console.error("Hata:", err);
  process.exit(1);
});
