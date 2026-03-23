#!/usr/bin/env node
/**
 * Filo Kar Excel dosyasını otomatik oluşturur.
 * Kullanım: npm run fleet-profit:generate
 * Çıktı: data/filo-kar.xlsx (5 sayfa + RAPORLAR)
 */

import XLSX from "xlsx";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const outDir = path.join(rootDir, "data");
const outFile = path.join(outDir, "filo-kar.xlsx");

const GIDER_SABIT = [
  "Kasko", "Trafik Sigortası", "MTV", "Muayene", "Ruhsat işlemleri",
  "GPS takip", "Otopark", "Ofis gider payı", "Muhasebe payı",
  "Kredi faizi", "Leasing", "Personel payı",
];
const GIDER_DEGISKEN = [
  "Periyodik bakım", "Yağ değişimi", "Lastik", "Fren balatası",
  "Hasar onarım", "Kaporta boya", "Cam değişimi", "Yıkama temizlik",
  "Yakıt (karşılanıyorsa)", "HGS (yansıtılmadıysa)", "Çekici",
  "Teslimat maliyeti", "POS komisyonu", "Broker komisyonu",
];

function addSheet(wb, name, rows, formulas = {}) {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  Object.entries(formulas).forEach(([cell, formula]) => {
    if (!ws[cell]) ws[cell] = { t: "n" };
    ws[cell].f = formula;
  });
  XLSX.utils.book_append_sheet(wb, ws, name);
}

function main() {
  const wb = XLSX.utils.book_new();

  // 1. ARAÇLAR
  const aracHeaders = [
    "Plaka", "Marka", "Model", "Segment", "Model Yılı",
    "Alış Tarihi", "Alış Bedeli", "Hedef Satış Değeri",
    "Planlanan Kullanım Süresi (Ay)", "Aylık Amortisman",
    "Finansman Tipi (Nakit/Kredi/Leasing)",
    "Aylık Kredi/Leasing Taksidi",
    "Sigorta Başlangıç", "Sigorta Bitiş",
    "Yıllık Kasko+Sigorta", "Yıllık MTV",
    "Son Muayene", "KM (Güncel)", "Durum (Kirada/Boş/Bakım)",
  ];
  addSheet(wb, "ARAÇLAR", [aracHeaders], { J2: "=(G2-H2)/I2" });

  // 2. KİRALAMALAR
  const kiraHeaders = [
    "Kiralama ID", "Plaka", "Müşteri",
    "Başlangıç Tarih", "Bitiş Tarih", "Gün Sayısı",
    "Günlük Fiyat", "Kira Geliri", "Ek Gelir",
    "Toplam Gelir", "Komisyon", "HGS/Diğer",
    "Hasar Tutarı", "Tahsil Edilen",
  ];
  addSheet(wb, "KIRALAMALAR", [kiraHeaders], {
    F2: "=E2-D2",
    H2: "=F2*G2",
    J2: "=H2+I2",
  });

  // 3. GİDERLER
  const giderHeaders = ["Tarih", "Plaka", "Gider Türü", "Açıklama", "Tutar", "Sabit/Değişken"];
  const giderList = [...GIDER_SABIT, ...GIDER_DEGISKEN];
  addSheet(wb, "GIDERLER", [giderHeaders]);

  // 4. SABİT GİDER DAĞITIMI
  const sabitHeaders = ["Plaka", "Yıllık Sigorta", "Yıllık MTV", "Aylık Sabit Gider"];
  addSheet(wb, "SABIT GIDER", [sabitHeaders], { D2: "=(B2+C2)/12" });

  // 5. ARAÇ KAR RAPORU (sayfa adı Excel'de 31 karakter; formüllerde aynı isim)
  const raporHeaders = [
    "Plaka", "Ay",
    "Toplam Kiralama Geliri", "Ek Gelir", "Toplam Gelir",
    "Değişken Gider", "Sabit Gider", "Amortisman", "Finansman", "Net Kâr",
    "Kiralanan Gün", "Doluluk Oranı", "Gün Başı Net Kâr",
  ];
  const aracKarSheetName = "Arac Kar Raporu";
  addSheet(wb, aracKarSheetName, [raporHeaders], {
    C2: "=SUMIFS(KIRALAMALAR!$J:$J,KIRALAMALAR!$B:$B,$A2)",
    D2: "=SUMIFS(KIRALAMALAR!$I:$I,KIRALAMALAR!$B:$B,$A2)",
    E2: "=C2+D2",
    F2: '=SUMIFS(GIDERLER!$E:$E,GIDERLER!$B:$B,$A2,GIDERLER!$F:$F,"Değişken")',
    G2: '=SUMIFS(GIDERLER!$E:$E,GIDERLER!$B:$B,$A2,GIDERLER!$F:$F,"Sabit")',
    H2: "=IFERROR(VLOOKUP($A2,ARAÇLAR!$A:$J,10,FALSE),0)",
    I2: "=IFERROR(VLOOKUP($A2,ARAÇLAR!$A:$L,12,FALSE),0)",
    J2: "=E2-F2-G2-H2-I2",
    K2: "=SUMIFS(KIRALAMALAR!$F:$F,KIRALAMALAR!$B:$B,$A2)",
    L2: "=IF(K2=0,0,K2/30)",
    M2: "=IF(K2=0,0,J2/K2)",
  });

  // 6. RAPORLAR
  const raporlarRows = [
    ["1. EN KÂRLI ARAÇLAR (Plaka + Toplam Net Kâr)"],
    ["Plaka", "Toplam Net Kâr"],
    [],
    ["2. EN FAZLA BOŞ GÜN (Plaka + Kiralanan Gün + Boş Gün)"],
    ["Plaka", "Kiralanan Gün", "Boş Gün (360-)"],
    [],
    ["3. EN FAZLA BAKIM MASRAFI (Plaka + Bakım Gideri)"],
    ["Plaka", "Bakım/Onarım Gideri"],
    [],
    ["4. GÜN BAŞI NET KÂR (Plaka + Net Kâr / Kiralanan Gün)"],
    ["Plaka", "Gün Başı Net Kâr"],
  ];
  addSheet(wb, "RAPORLAR", raporlarRows);

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  XLSX.writeFile(wb, outFile, { bookType: "xlsx" });
  console.log("Filo Kar Excel oluşturuldu:", outFile);
  console.log("Gider listesi (açılır liste için): GIDERLER sayfasında C sütununa yazılabilir veya Google Sheets'te veri doğrulama ekleyin.");
}

main();
