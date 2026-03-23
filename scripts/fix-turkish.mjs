import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const srcDir = path.join(rootDir, "src");

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
    });
}

// Order matters: match longest phrases first
const exactReplacements = [
    ['Aylik Sabit Gider (TL)', 'Aylık Sabit Gider (₺)'],
    ['Kiralama Basi Gider (TL)', 'Kiralama Başı Gider (₺)'],
    ['Fiyat (Aylik)', 'Fiyat (Aylık)'],
    ['Aylik Kira Bedeli (TL)', 'Aylık Kira Bedeli (₺)'],
    ['TL{vehicle.price}', '{vehicle.price} ₺'],
    ['TL{totalRevenue.toLocaleString()}', '{totalRevenue.toLocaleString()} ₺'],
    ['TL{booking.total_price}', '{booking.total_price} ₺']
];

// Regex replacements (only matching \b word boundaries so we don't break code variables like 'active', 'arac' variable names if any)
const regexReplacements = [
    [/\bArac\b/g, "Araç"],
    [/\bAraci\b/g, "Aracı"],
    [/\bAraca\b/g, "Araca"],
    [/\bAracin\b/g, "Aracın"],
    [/\bAraclari\b/g, "Araçları"],
    [/\bAraclar\b/g, "Araçlar"],
    [/\bYonetimi\b/g, "Yönetimi"],
    [/\bYonetim\b/g, "Yönetim"],
    [/\byonetici\b/g, "yönetici"],
    [/\bGuncelle\b/g, "Güncelle"],
    [/\bguncel\b/g, "güncel"],
    [/\bGuncellendi\b/g, "Güncellendi"],
    [/\bbasariyla\b/g, "başarıyla"],
    [/\bBasariyla\b/g, "Başarıyla"],
    [/\bfotograf\b/g, "fotoğraf"],
    [/\bFotograflari\b/g, "Fotoğrafları"],
    [/\bFotograflar\b/g, "Fotoğraflar"],
    [/\bFotograf\b/g, "Fotoğraf"],
    [/\bbulunamadi\b/g, "bulunamadı"],
    [/\beklenemedi\b/g, "eklenemedi"],
    [/\balinamadi\b/g, "alınamadı"],
    [/\byapmaniz\b/g, "yapmanız"],
    [/\bKaldir\b/g, "Kaldır"],
    [/\bKaldirildi\b/g, "Kaldırıldı"],
    [/\bkaldirildi\b/g, "kaldırıldı"],
    [/\bDuzenle\b/g, "Düzenle"],
    [/\bRuhsati\b/g, "Ruhsatı"],
    [/\bruhsati\b/g, "ruhsatı"],
    [/\bKarlilik\b/g, "Karlılık"],
    [/\bBazli\b/g, "Bazlı"],
    [/\bErisim\b/g, "Erişim"],
    [/\bHatasi\b/g, "Hatası"],
    [/\bhatasi\b/g, "hatası"],
    [/\bCek\b/g, "Çek"],
    [/\bgiriniz\b/g, "giriniz"],
    [/\byuklemeleri\b/g, "yüklemeleri"],
    [/\bYukle\b/g, "Yükle"],
    [/\bYuklendi\b/g, "Yüklendi"],
    [/\byuklendi\b/g, "yüklendi"],
    [/\bTumu\b/g, "Tümü"],
    [/\bKullanici\b/g, "Kullanıcı"],
    [/\bkullanici\b/g, "kullanıcı"],
    [/\bIslem\b/g, "İşlem"],
    [/\bislem\b/g, "işlem"],
    [/\bKisi\b/g, "Kişi"],
    [/\bHaftalik\b/g, "Haftalık"],
    [/\bGunluk\b/g, "Günlük"],
    [/\bAylik\b/g, "Aylık"],
    [/\bGiris\b/g, "Giriş"],
    [/\bCikis\b/g, "Çıkış"],
    [/\bgiris\b/g, "giriş"],
    [/\bcikis\b/g, "çıkış"],
    [/\bsirasinda\b/g, "sırasında"],
    [/\bolustu\b/g, "oluştu"],
    [/\bgerekiyor\b/g, "gerekiyor"],
    [/\bicin\b/g, "için"],
    [/\bIcin\b/g, "İçin"],
    [/\bsecin\b/g, "seçin"],
    [/\bSecin\b/g, "Seçin"],
    [/\bMusait\b/g, "Müsait"],
    [/\bgore\b/g, "göre"],
    [/\bdagilimi\b/g, "dağılımı"],
    [/\bdoneme\b/g, "döneme"],
    [/\bdagitimi\b/g, "dağıtımı"],
    [/\bGosteriliyor\b/g, "Gösteriliyor"],
    [/\bgosteriliyor\b/g, "gösteriliyor"],
    [/\bolusturulurken\b/g, "oluşturulurken"]
];

let changedFiles = 0;

walkDir(srcDir, (filePath) => {
    if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
        let content = fs.readFileSync(filePath, 'utf8');
        let original = content;

        // Apply exact replacements
        exactReplacements.forEach(([search, repl]) => {
            content = content.split(search).join(repl);
        });

        // Apply regex replacements
        regexReplacements.forEach(([regex, repl]) => {
            content = content.replace(regex, repl);
        });

        if (content !== original) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`Updated: ${path.relative(rootDir, filePath)}`);
            changedFiles++;
        }
    }
});

console.log(`Script finished. Corrected Turkish characters in ${changedFiles} files.`);
