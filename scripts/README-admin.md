# Yönetici atama (set-admin-users)

Bu script, belirtilen e-posta adreslerini Firestore'da **admin** rolüne alır. Böylece bu hesaplar araç ekleyebilir ve tüm admin işlemlerini yapabilir.

## Gereksinimler

1. **Firebase servis hesabı anahtarı**
   - [Firebase Console](https://console.firebase.google.com) → Projenizi seçin (yalinizlarfilo)
   - Dişli → **Project settings** → **Service accounts**
   - **Generate new private key** → İndirilen JSON dosyasını proje köküne kopyalayın
   - Dosyayı `firebase-service-account.json` olarak kaydedin (veya başka bir isim; aşağıda kullanacağız)

2. **Kullanıcıların kayıtlı olması**
   - `cebrailkara@gmail.com`, `mbayduman@hotmail.com`, `İlkeryaliniz@gmail.com` adresleri **en az bir kez** uygulamada **Kayıt ol** ile hesap oluşturmuş olmalı.  
   - Henüz kayıt olmadıysa önce siteye girip bu e-postalarla kayıt olun, sonra scripti çalıştırın.

## Çalıştırma

Proje kökünde:

```powershell
# Servis hesabı dosyasının yolunu verin (PowerShell)
$env:GOOGLE_APPLICATION_CREDENTIALS="firebase-service-account.json"
npm run admin:set
```

Tek satırda:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="firebase-service-account.json"; npm run admin:set
```

Başka bir konumdaki dosya için:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\your-key.json"; npm run admin:set
```

## Çıktı

- Her e-posta için: `✓ email → admin (uid: ...)` veya
- Kullanıcı yoksa: `✗ email → Kullanıcı Firebase Auth'da yok. Önce uygulamadan kayıt olmalı.`

Sonrasında bu hesaplarla giriş yapınca "Yetki hatası" almadan araç ekleyebilirsiniz.
