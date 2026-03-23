# Scripts – Yalınızlar Filo

| Dosya | Ne işe yarar |
|-------|----------------|
| **generate-fleet-profit-xlsx.mjs** | **Filo Kar (otomatik):** `npm run fleet-profit:generate` → **data/filo-kar.xlsx** oluşturur. 5 sayfa + RAPORLAR, tüm formüller. Dosyayı açıp kullanın. |
| **google-sheets-fleet-profit.js** | **Filo Kar (Google’da):** Aynı yapıyı Google Sheets’te menü ile kurmak için. Menü: Filo Kar → Tüm Sayfaları Oluştur. |
| **google-sheets-programmatic-seo.js** | **SEO URL üretimi:** Aynı tabloda menü: SEO → Programmatic SEO Üret. “uretim” sayfasına slug/url/meta doldurur. |
| **generate-programmatic-seo.mjs** | **CLI SEO:** `npm run seo:generate` → `data/seo-uretim.csv` üretir. |
| **set-admin-users.mjs** | **Yerel admin atama:** Servis hesabı JSON ile `npm run admin:set`. |
| **call-set-admin-remote.mjs** | **Uzak admin atama:** Deploy edilmiş Cloud Function’ı çağırır. `npm run admin:set-remote`. |
| **README-admin.md** | Admin atama (set-admin-users) kurulum ve kullanım. |

## Filo Kar (otomatik – önerilen)

Proje kökünde:

```bash
npm run fleet-profit:generate
```

**data/filo-kar.xlsx** oluşur. Dosyayı Excel veya Google Sheets ile açıp kullanın. Sayfalar: ARAÇLAR, KIRALAMALAR, GIDERLER, SABIT GIDER, Arac Kar Raporu, RAPORLAR. Formüller satır 2’de; aşağı çoğaltın.

---

## Filo Kar (Google Sheets’te menü ile)

1. Yeni bir Google Sheets açın.
2. **Extensions** → **Apps Script** → Tüm kodu silin.
3. **scripts/google-sheets-fleet-profit.js** dosyasının içeriğini yapıştırın → **Kaydet**.
4. Sayfayı kapatın.
5. Tabloyu açın → üstte **Filo Kar** menüsü çıkar → **Tüm Sayfaları Oluştur** tıklayın.

Oluşan sayfalar: ARAÇLAR, KİRALAMALAR, GİDERLER, SABİT GİDER DAĞITIMI, ARAÇ KAR RAPORU, RAPORLAR. Formüller ve gider listesi (Sabit/Değişken) dahildir.
