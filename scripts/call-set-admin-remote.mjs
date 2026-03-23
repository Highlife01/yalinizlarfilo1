#!/usr/bin/env node
/**
 * Deploy edilmiş setAdminRole Cloud Function'ı çağırır.
 * Varsayılan secret: yalinizlarfilo-setup (fonksiyondaki ile aynı)
 *
 * Kullanım: npm run admin:set-remote
 * Önce: firebase deploy --only functions
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

let projectId = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT;
if (!projectId) {
  try {
    const rc = JSON.parse(readFileSync(path.join(rootDir, ".firebaserc"), "utf8"));
    projectId = rc.projects?.default;
  } catch (_) {}
}
if (!projectId) {
  console.error("Proje ID bulunamadı. .firebaserc veya GCLOUD_PROJECT gerekli.");
  process.exit(1);
}

const secret = process.env.ADMIN_SECRET || "yalinizlarfilo-setup";
const emails = [
  "cebrailkara@gmail.com",
  "mbayduman@hotmail.com",
  "İlkeryaliniz@gmail.com",
];
const url = `https://us-central1-${projectId}.cloudfunctions.net/setAdminRole`;

(async () => {
  console.log("Yönetici atanıyor:", emails.join(", "));
  console.log("URL:", url);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, emails }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("Hata:", res.status, data.error || data);
      process.exit(1);
    }
    console.log("Sonuç:", data.message || "Tamamlandı");
    (data.results || []).forEach((r) => {
      console.log(r.ok ? `  ✓ ${r.email}` : `  ✗ ${r.email}: ${r.error}`);
    });
  } catch (e) {
    console.error("İstek hatası:", e.message);
    process.exit(1);
  }
})();
