# 🚗 Yalınızlar Filo Yönetimi - Ana Dokümantasyon Merkezi

Bütün proje notları, güncellemeler, kullanım rehberleri ve gelecek planları bu dosyada (README.md) birleştirilmiştir.

---

## 📌 GELECEK GELİŞTİRMELER VE YAPILACAKLAR (ROADMAP)

### 1. Kod Mimarisi ve Performans (Teknik Borçların Ödenmesi)
*   **Devasa Dosyaların Bölünmesi:** `RentalOperations.tsx` (108 KB) ve `FleetManagement.tsx` (70 KB) çok büyümüş durumda. Operasyon sayfasındaki adımlar (Müşteri Seçimi, Hasar Formu, İmza, Araç Çekimi vb.) ayrı ayrı bileşenlere bölünecek (örn: `StepCustomer.tsx`, `StepSignature.tsx`).
*   **Merkezi State Yönetimi:** Operasyon sürecinde form geçişleri çok fazla `useState` ile yönetiliyor. `Zustand` gibi hafif bir state kütüphanesine geçilecek.
*   **React Query / Caching:** Araç ve müşteri listeleri veritabanından sıfırdan çekilmek yerine önbellek (cache) ile yüklenecek, zayıf internette tepki süresi artırılacak.

### 2. Kullanıcı Deneyimi ve Operasyon Hızlandırma (UX)
*   **Çevrimdışı Taslaklar (Offline Drafts):** İnternet kopmalarına karşı form verileri (bodrum/otopark çekimi gibi durumlar için) `localStorage` ile anlık yedeklenecek.
*   **Uyarıcı Soft Validation:** Boş bırakılan zorunlu olmayan alanlar, işlem kaydedilirken sarı renkle işaretlenerek "Daha Sonra Tamamla" uyarısı çıkartacak.
*   **Takvim & Çakışma Yönetimi:** `RentalOperations` anında aracın yaklaşan bakım ve rezervasyon takvimleri pop-up olarak çıkacak.

### 3. Yapay Zeka ve Otomasyon
*   **Akıllı Hasar Analizi:** Araç alınırken çekilen fotoğraf ile önceki teslim resimleri AI (Google Vision vb.) tarafından taranıp çizik uyarısı yapacak.
*   **HGS / OGS Ceza Takip Modülü:** Kiralanan tarihlerdeki geçiş ve cezalar, sistem iade alındığında otomatik "Tahsilat" fişi olarak önerilecek.
*   **Etkileşimli WhatsApp İletişimi:** İmzalanan sözleşmeler PDF dosyasından ziyade, interaktif bir bulut linki olarak müşteriye WhatsApp üzerinden fırlatılacak.

---

## 🚀 SİSTEM DURUMU VE GEÇMİŞ GÜNCELLEMELER (CHANGELOG)

### Versiyon: 2.0.0 → 2.5.0 (Ocak 2026 Geliştirmeleri)
- **Gelişmiş Dashboard:** Canlı istatistikler, filo kullanım oranı, recent activities, hızlı işlemler.
- **Export Sistemi:** Excel ve PDF çıktı alma (`xlsx`, `jspdf`).
- **QR Kod Sistemi:** Araç etiketleri ve tarama (`qrcode.react`).
- **PWA (Progressive Web App):** Offline destekli mobil uygulama benzeri altyapı, manifest.json.
- **Firebase CLI:** Gelişmiş Storage/Firestore güvenlik kuralları (`firestore.rules`), Composite indexler.
- **Bildirim Sistemi:** Bakım, kiralama bitişi vb. konularında web bildirimleri.
- **Yeni Sayfalar:** `VehicleDetail.tsx`, `DamageReports.tsx`, `Reports.tsx`.

---

## 📖 ARAÇ FİLOSU - HIZLI BAŞLANGIÇ REHBERİ

**Admin panelinde araç filosu boş görünüyorsa**, bu Firebase'de henüz veri olmamasından kaynaklanır.

**Yöntem 1 (Önerilen) - Örnek Yükleme:**
1. "Araç Filosu" bölümüne girin.
2. "Varsayılanları Yükle" butonuna tıklayıp onaylayın. Örnek araçlar yüklenecektir.

**Yöntem 2 - Manuel Ekleme:**
1. "+ Yeni Araç Ekle" butonu (veya Operasyon sayfasındaki Yeni Araç ekle) ile manuel olarak plakayla girin.

---

## 🛠 SCRIPTS (YARDIMCI ARAÇLAR) VE YÖNETİCİ ATAMA

**Filo Kar/Analytics Raporu:**
*   `npm run fleet-profit:generate` → `data/filo-kar.xlsx` Excel'ini oluşturur.
*   Google Sheets tabanındaki scriptleri projede `/scripts` klasöründe JS dökümü olarak bulunur. 

**Admin Yetkisi Verme:**
`set-admin-users.mjs` scripti ile Firebase üzerinde admin rolü atanır (Firestore Security Rules için gereklidir).
1. Firebase Konsol'dan Service Account JSON indirin, root'a ekleyin.
2. Sistemde kullanıcıların standart üyelikleri açık olmalı (Kayıt ol ekranından).
3. `npm run admin:set` komutu ile listedeki mevcut e-postalara Admin rolü fırlatılır.

---

## 📊 RAKİP ANALİZİ VE YEREL (ADANA) STRATEJİSİ (ASYA CAR REFERANS)

*   **Lokasyon ve Vurgu**: Çukurova Uluslararası Havalimanı (Mersin/Adana), Adana Havalimanı İç Hatlar.
*   **Site Mesajları:** "Güvenli Odeme", "Komisyonsuz", "Online Özel Fiyatlar".
*   **İletişim:** Çağrı merkezi (0322...) ve WhatsApp'ı mutlaka Hero ya da Sticky Header'a koyun.
*   **Hedef Operasyon:** Farklı lokasyona araç bırakma opsiyonu ve saatlik esnekliği sisteme yedirilmelidir.

---

## 💻 TEMEL PROJE (LOVABLE / VITE) BİLGİSİ

*   **Teknolojiler:** Vite, TypeScript, React, Tailwind CSS, Firebase
*   **Çalıştırma:** `npm i` ardından `npm run dev`
*   **Domain:** www.yalinizlarfilo.com.tr
*   **Hosting:** Firebase Hosting (Vercel alternatifi)

(Not: Gereksiz markdown dosyaları temizlenmiş olup tüm kritik belge ve yol haritası yalnızca okumakta olduğunuz bu dosya altında toplanmıştır.)
