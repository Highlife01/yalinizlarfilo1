# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/9ed11de6-c89c-4adb-9fea-934f07076781

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/9ed11de6-c89c-4adb-9fea-934f07076781) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- Tailwind CSS

## Geliştirme Notları (Development Log)

### Yapılan Geliştirmeler (Tamamlandı)
- **E-Fatura Entegrasyon Altyapısı**: Müşteri formuna "Bireysel/Kurumsal" fatura tipi eklendi. Kurumsal müşteriler için Vergi Dairesi, VKN ve Firma Ünvanı alanları eklendi. Kira sözleşmesi hazırlarken KDV oranı ve hariç tutar seçimi eklendi. "Faturalar" arşivi sayfası oluşturuldu.
- **Kiralama Sözleşmesi PDF Optimizasyonu**: Sözleşmede Türkçe karakter sorunu çözüldü. Sözleşmeye "Trafik Sigortası" ve "Kasko" firması isimleri ile bitiş tarihleri eklendi. Oluşturulan pdf artık hem Firestore'a kaydediliyor hem de indirilebiliyor.
- **Hasar Raporları Yönetimi**: Hasar raporları arşivine "Sil" butonu eklendi, yönetici kayıtları temizleyebiliyor.
- **Admin Panel Revizyonu (Refactor)**: Yönetim panelindeki kart tabanlı (Card) tasarımlar, daha derli toplu ve verimli bir tablo (Table) yapısına geçirildi. İlanlar, şirketler, kullanıcılar, mesajlar ve teklifler için listeleme görünümleri modernize edildi.
- **Web Sitesi Domain Güncellemesi**: Sistem genelindeki domain adresleri ve yapılandırmalar `www.yalinizlarfilo.com.tr` olarak güncellendi.
- **SEO ve Performans İyileştirmeleri**: Şehir ve ilçe slug'ları (SEO dostu URL'ler) arama motoru uyumluluğu için normalize edildi. Türkçe karakter ve ön ek (örn. "i-") sorunları kalıcı olarak giderildi. Sayfa içi bağlantılar için "smooth scrolling" eklendi.
- **Tasarım ve Tema Optimizasyonları (Dark Luxury Theme)**: Site genelinde karanlık, premium ve lüks kurumsal otomobil kiralama estetiği sağlandı. Etkileşimli öğeler (hover geçişleri vb.) zenginleştirildi.
- **Gelişmiş Tarih Seçici (Date Picker)**: Yönetici panelinde blog ve duyuru ekleme formlarına manuel metin girişi yerine interaktif ve Türkçe uyumlu takvim bileşeni entegre edildi.
- **Yazar ve Sosyal Medya Entegrasyonu**: Blog sistemi yazar profillerine Twitter, Instagram ve LinkedIn bağlantıları eklendi. Yazar seçimi formlarda opsiyonel ("Editör" varsayılanı) hale getirildi.

### Yapılacaklar Listesi (Gelecek Oturum - Todo)
1. **SMS Bildirim Sistemi**: Müşteri rezervasyon yaptığında "Rezervasyonunuz alındı" şeklinde otomatik SMS gidecek bir altyapı (Netgsm, İletişim Makinesi vb. bir servis ile) entegre edilecek.
2. **Araç Bakım Modülü Geliştirmesi**: Araçlar bakıma gönderilirken araç plakasının/bilgisinin "kayıtlı araçlar" veritabanından seçilmesi (dropdown) sağlanacak.
3. **Süresi Dolan Araç Uyarısı**: Araçların kira, sigorta, kasko veya muayene süresinin dolmasına az kaldığında admin paneline veya e-posta/SMS olarak bilgilendirme geçilecek.
4. **Yapay Zeka Destekli Hasar Değerlendirme Sistemi (AI Vision)**:
   - *Görüntü Toplama*: Araç fotoğraflarının sisteme yüklenmesi.
   - *AI Görüntü Analizi*: MiniMax Agent (veya benzeri computer vision) algoritmalarıyla hasar tespiti (çizik, göçük, parça kırığı vb.).
   - *Hasar Sınıflandırma*: Hasarların kozmetik, parça değişimi veya ağır yapısal hasar olarak kategorize edilmesi.
   - *Maliyet Tahmini*: Algoritmalar ile onarım maliyetinin hesaplanarak sigorta şirketlerine ve tamircilere anında sunulması.
   - *Raporlama*: Doğrudan sigorta poliçesiyle ortaklaşa çalışabilen otomatik pdf ve sigorta raporlaması.
   - *API Entegrasyonu*: Yönetici panelinden yapay zeka sağlayıcısı (Gemini, MiniMax vb.) API anahtarlarının eklenebileceği ve ayarlardan yönetilebileceği yapılandırma ekranının oluşturulması.
5. **Rezervasyon Sisteminin Elden Geçirilmesi**: Mevcut rezervasyon akışı daha kullanıcı dostu ve verimli olacak şekilde iyileştirilecek.

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/9ed11de6-c89c-4adb-9fea-934f07076781) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
