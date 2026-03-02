# 🚗 ARAÇ FILOSU HIZLI BAŞLANGIÇ REHBERİ

## ⚠️ Önemli Not:
Admin panelindearaç filosu boş görünüyorsa, bu normal bir durumdur. Firebase'de henüz araç kaydı bulunmuyor.

## ✅ Hızlı Çözüm (2 Yöntem):

### Yöntem 1: Örnek Araçları Yükle (ÖNERİLEN)
1. Admin Panel → **Araç Filosu** bölümüne gidin
2. "**Araç bulunamadı**" mesajı altındaki linke tıklayın
3. VEYA üstteki "**Varsayılanları Yükle**" butonuna tıklayın
4. Onaylayın
5. ✅ 20+ örnek araç otomatik yüklenecek!

### Yöntem 2: Manuel Araç Ekle
1. "**+ Yeni Araç Ekle**" butonuna tıklayın
2. Formu doldurun:
   - Plaka (örn: 34 ABC 123)
   - Araç Adı (örn: Fiat Egea)
   - Kategori (SUV, Sedan, vb.)
   - Yakıt tipi
   - Vites
   - Fiyat
3. **Kaydet** butonuna tıklayın
4. ✅ Araç listeye eklenecek!

## 🔍 Kontrol Listesi:

- [ ] Firebase bağlantısı aktif mi? (console'da hata var mı?)
- [ ] Admin girişi yapıldı mı?
- [ ] "Araç Filosu" menüsü tıklandı mı?
- [ ] Sayfa yükleniyor mu? (loading spinner gördünüz mü?)

## 💡 Test Senaryosu:

1. ✅ Admin panele giriş yap
2. ✅ Sol menüden "Araç Filosu" tıkla
3. ✅ "Varsayılanları Yükle" butonuna tık
4. ✅ Onaylay
5. ✅ 5-10 saniye bekle
6. ✅ Liste dolmalı!

## 🐛 Hata Ayıklama:

Eğer hala boş görünüyorsa:

1. **Console kontrolü**: F12 → Console → Hata var mı?
2. **Network kontrolü**: F12 → Network → Firebase istekleri gidiyor mu?
3. **Firebase Console**: Firebase'de "vehicles" collection'ı oluştu mu?

## 📞 Destek:

Sorun devam ederse hemen bildirin, anında düzeltelim!
