#!/usr/bin/env node
/**
 * Programmatic SEO URL üretici – CLI
 *
 * Kullanım: npm run seo:generate
 * Çıktı: data/seo-uretim.csv (UTF-8)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const outDir = path.join(rootDir, "data");
const outFile = path.join(outDir, "seo-uretim.csv");

const HAVALIMANI = "Çukurova Uluslararası Havalimanı";
const BASE_URL = "https://www.yalinizlarfilo.com.tr/";

const SEHIRLER = ["Adana", "Mersin", "Osmaniye", "Hatay"];
const ILCELER = {
  Adana: ["Seyhan", "Çukurova", "Yüreğir", "Sarıçam", "Ceyhan"],
  Mersin: ["Yenişehir", "Mezitli", "Toroslar", "Erdemli", "Tarsus"],
  Osmaniye: ["Merkez", "Kadirli", "Düziçi"],
  Hatay: ["Antakya", "İskenderun", "Arsuz", "Dörtyol", "Samandağ"],
};
const SEGMENTLER = ["Ekonomik", "SUV", "Premium", "Lüks", "Ticari", "Minivan", "VIP", "Orta-Sınıf"];
const KIRALAMA_TURLERI = ["Gunluk", "Haftalik", "Aylik", "Uzun-Donem", "Filo"];
const TESLIM_TURLERI = ["Havalimani-Teslim", "Otel-Teslim", "Adrese-Teslim", "Ofisten-Teslim"];

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/ç/g, "c")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ı/g, "i")
    .replace(/\s+/g, "-");
}

function csvEscape(val) {
  const s = String(val ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function generate() {
  const headers = [
    "sehir", "ilce", "havalimani", "segment", "kiralama_turu", "teslim_turu",
    "slug", "url", "meta_title", "meta_description", "h1", "canonical",
  ];
  const rows = [headers];

  for (const sehir of SEHIRLER) {
    for (const ilce of ILCELER[sehir]) {
      for (const segment of SEGMENTLER) {
        for (const kiralama of KIRALAMA_TURLERI) {
          for (const teslim of TESLIM_TURLERI) {
            const slug = slugify(
              `${sehir}-${ilce}-${segment}-${kiralama}-arac-kiralama`
            );
            const url = BASE_URL + slug;
            const metaTitle = `${sehir} ${ilce} ${segment} ${kiralama} Araç Kiralama | ${HAVALIMANI} Teslim`;
            const metaDescription = `${sehir} ${ilce} bölgesinde ${segment} ${kiralama} araç kiralama. ${HAVALIMANI} teslim, 7/24 destek, uygun fiyat.`;
            const h1 = `${sehir} ${ilce} ${segment} ${kiralama} Araç Kiralama`;

            rows.push([
              sehir, ilce, HAVALIMANI, segment, kiralama, teslim,
              slug, url, metaTitle, metaDescription, h1, url,
            ]);
          }
        }
      }
    }
  }

  const csv = rows
    .map((row) => row.map(csvEscape).join(","))
    .join("\n");

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  fs.writeFileSync(outFile, "\uFEFF" + csv, "utf8"); // BOM for Excel UTF-8
  return rows.length - 1;
}

const count = generate();
console.log("SEO üretimi tamamlandı: %d satır → %s", count, outFile);
