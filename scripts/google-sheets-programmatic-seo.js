/**
 * Programmatic SEO URL üretici – Google Sheets Apps Script
 *
 * KURULUM (bir kez):
 * 1. Google Sheets aç → Extensions → Apps Script
 * 2. Tüm kodu sil, bu dosyanın içeriğini yapıştır → Save
 * 3. Sayfayı kapat
 *
 * KULLANIM (otomatik):
 * 4. Tabloyu her açtığında "SEO" menüsü görünür
 * 5. SEO → "Programmatic SEO Üret" tıkla → "uretim" sayfası otomatik dolar
 *
 * Çıktı: uretim sayfasında slug, url, meta_title, meta_description, h1, canonical
 * Hedef: Çukurova Uluslararası Havalimanı – Adana, Mersin, Osmaniye, Hatay
 */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("SEO")
    .addItem("Programmatic SEO Üret", "generateProgrammaticSEO")
    .addToUi();
}

function generateProgrammaticSEO() {
  const sheetName = "uretim";
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  } else {
    sheet.clear();
  }

  const havalimani = "Çukurova Uluslararası Havalimanı";
  const baseUrl = "https://www.yalinizlarfilo.com.tr/";

  const sehirler = ["Adana", "Mersin", "Osmaniye", "Hatay"];

  const ilceler = {
    "Adana": ["Seyhan", "Çukurova", "Yüreğir", "Sarıçam", "Ceyhan"],
    "Mersin": ["Yenişehir", "Mezitli", "Toroslar", "Erdemli", "Tarsus"],
    "Osmaniye": ["Merkez", "Kadirli", "Düziçi"],
    "Hatay": ["Antakya", "İskenderun", "Arsuz", "Dörtyol", "Samandağ"]
  };

  const segmentler = ["Ekonomik", "SUV", "Premium", "Lüks", "Ticari", "Minivan", "VIP", "Orta-Sınıf"];
  const kiralamaTurleri = ["Gunluk", "Haftalik", "Aylik", "Uzun-Donem", "Filo"];
  const teslimTurleri = ["Havalimani-Teslim", "Otel-Teslim", "Adrese-Teslim", "Ofisten-Teslim"];

  const headers = [
    "sehir", "ilce", "havalimani", "segment", "kiralama_turu", "teslim_turu",
    "slug", "url", "meta_title", "meta_description", "h1", "canonical"
  ];

  const data = [];
  data.push(headers);

  sehirler.forEach(sehir => {
    ilceler[sehir].forEach(ilce => {
      segmentler.forEach(segment => {
        kiralamaTurleri.forEach(kiralama => {
          teslimTurleri.forEach(teslim => {

            const slug = (sehir + "-" + ilce + "-" + segment + "-" + kiralama + "-arac-kiralama")
              .toLowerCase()
              .replace(/ç/g, "c")
              .replace(/ş/g, "s")
              .replace(/ğ/g, "g")
              .replace(/ü/g, "u")
              .replace(/ö/g, "o")
              .replace(/ı/g, "i")
              .replace(/\s+/g, "-");

            const url = baseUrl + slug;

            const metaTitle = sehir + " " + ilce + " " + segment + " " + kiralama +
              " Araç Kiralama | " + havalimani + " Teslim";

            const metaDescription = sehir + " " + ilce + " bölgesinde " +
              segment + " " + kiralama +
              " araç kiralama. " + havalimani + " teslim, 7/24 destek, uygun fiyat.";

            const h1 = sehir + " " + ilce + " " + segment + " " + kiralama + " Araç Kiralama";

            data.push([
              sehir, ilce, havalimani, segment, kiralama, teslim,
              slug, url, metaTitle, metaDescription, h1, url
            ]);

          });
        });
      });
    });
  });

  sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
  SpreadsheetApp.getActiveSpreadsheet().toast(
    data.length - 1 + " satır üretildi. Sayfa: " + sheetName,
    "SEO üretimi tamamlandı",
    5
  );
}
