#!/usr/bin/env node
/**
 * Belirtilen e-posta adreslerini Firestore'da yönetici (admin) yapar.
 * Sadece Firebase Admin SDK ile çalışır; bu yüzden yerel ortamda bir kez çalıştırılmalıdır.
 *
 * Kullanım:
 * 1. Firebase Console → Project Settings → Service accounts → "Generate new private key"
 * 2. İndirilen JSON dosyasını proje köküne veya güvenli bir yere koyun (örn. firebase-service-account.json)
 * 3. Çalıştırın:
 *    Windows (PowerShell): $env:GOOGLE_APPLICATION_CREDENTIALS="firebase-service-account.json"; node scripts/set-admin-users.mjs
 *    Windows (CMD): set GOOGLE_APPLICATION_CREDENTIALS=firebase-service-account.json && node scripts/set-admin-users.mjs
 *    macOS/Linux: GOOGLE_APPLICATION_CREDENTIALS=firebase-service-account.json node scripts/set-admin-users.mjs
 *
 * Not: Kullanıcılar önce uygulamada kayıt olmuş (veya Firebase Auth'da oluşturulmuş) olmalıdır.
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

const ADMIN_EMAILS = [
  "cebrailkara@gmail.com",
  "mbayduman@hotmail.com",
  "İlkeryaliniz@gmail.com",
];

async function main() {
  let serviceAccount;
  const keyPath =
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    path.join(rootDir, "firebase-service-account.json");

  try {
    serviceAccount = JSON.parse(readFileSync(keyPath, "utf8"));
  } catch (e) {
    console.error(
      "Hata: Servis hesabı dosyası bulunamadı veya okunamadı:",
      keyPath
    );
    console.error(
      "Firebase Console → Project Settings → Service accounts → Generate new private key"
    );
    process.exit(1);
  }

  const app = initializeApp({ credential: cert(serviceAccount) });
  const auth = getAuth(app);
  const db = getFirestore(app);

  const projectId = serviceAccount.project_id;
  console.log("Proje:", projectId);
  console.log("Yönetici yapılacak e-postalar:", ADMIN_EMAILS.join(", "));
  console.log("");

  for (const email of ADMIN_EMAILS) {
    try {
      const user = await auth.getUserByEmail(email);
      await db.collection("users").doc(user.uid).set(
        { role: "admin", email: user.email },
        { merge: true }
      );
      console.log("✓", email, "→ admin (uid:", user.uid + ")");
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        console.log(
          "✗",
          email,
          "→ Kullanıcı Firebase Auth'da yok. Önce uygulamadan kayıt olmalı."
        );
      } else {
        console.error("✗", email, "→", err.message);
      }
    }
  }

  console.log("\nİşlem tamamlandı.");
  process.exit(0);
}

main();
