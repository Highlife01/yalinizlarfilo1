# Ertaş Otomotiv & Yalınızlar Filo Yönetim Sistemi

Bu döküman, sistemde daha önce yapılan "monolitik" değişikliklerin profesyonelce genişletilip, modüler ve tek merkezden orkestrasyonlu (her şeyin birbiriyle konuştuğu) hale getirilmesini belgelemek üzere oluşturulmuştur.

## 🚀 Yapılan Ana Değişiklikler ve Yeni Modüller

### 1. 🌐 Merkezi Araç Stoğu Orkestrasyonu
Artık kiralık stok, satılık stok veya servisteki araçlar farklı veritabanlarında dağınık halde tutulmuyor. **Tüm araçlar, tek bir `ertas_vehicles` Firebase koleksiyonunda** tutularak merkezileştirildi.
- Araç durumları şu şekilde revize edildi: `Stokta` (Satılık), `Kiralık` (Boşta Kiralık), `Kirada` (Aktif Kiralanmış), `Rezerve`, `Serviste` ve `Satıldı`.
- Bu sayede herhangi bir araca sol taraftaki tüm tablolardan (Kiralık Stoğu, Araç Stoğu vb.) erişebiliyor ve tek yerden (merkezi) güncellemeler tüm panellere otomatik yansıyor.

### 2. 🗂️ Arşiv (Satılanlar) Sekmesi
Aktif Araç Stoğunun şişmemesi ve göz yormaması için "Satıldı" durumundaki araçlar ana listeden (Tümü görünümleri dahil) izole edildi.
- **`ArchiveTab.tsx`** modülü oluşturuldu. Sistemden çıkan, satışı tamamlanmış araçların geriye dönük listesi, elde edilen net kâr ve ciro geçmişiyle birlikte sadece bu sayfada listelenir.

### 3. 🪙 Araç Cari Hesabı Modalı
Eskiden araç düzenleme formu içerisine (en alta) sıkıştırılmış masraf sistemi daha profesyonel bir yapıya büründü.
- Her satırın en sağına altın renkli **"🪙 Cari"** butonu eklendi.
- Butona tıklandığında sadece o araca ait alış/satış rakamını, net kârı ve **yapılan tüm masraf (cari) kalemlerini** liste halinde tarihlere bölerek gösteren bağımsız bir pencere (`VehicleCariModal.tsx`) çalışır hale getirildi.

### 4. 🎨 İnteraktif & Vektörel Ekspertiz Haritası (Tesla Tarzı)
Araç eksper kayıtları için statik (`.png`) resimlerin üzerine tıklama metodundan vazgeçilerek **%100 Vektörel (SVG) ve 5-Eksenli (Üst, Sağ, Sol, Ön, Arka)** şık bir diyagram yazıldı (`CarDiagram.tsx`).
- Haritada 13 parça bulunur. Parça üzerine tıklandıkça renk dökümü animasyonlu şekilde (Orijinal -> Lokal -> Tam -> Değişen -> Hasarlı) değişir.
- Renklere göre (Sarı, Turuncu, Mavi, Kırmızı vb.) sağ panalde ilgili parçaların **Anlık Raporlaması** saniye saniye takip edilebilir.

### 5. 📉 Gider ve Finansmanın Birleştirilmesi
Sol sekmedeki genel kalabalığı azaltmak için "Gider Defteri" sayfası silinip, işlevselliği tamamen "Finans & Gider" (`FinanceTab.tsx`) sayfasının içine yedirildi. Genel muhasebe ve brüt/net kâr analizi tek pencereden yönetilir oldu.

### 6. 🛡️ Tablo Detaylandırmaları ve UX İyileştirmeleri
- Araç Envanteri veri tablosuna **"Sigorta Bitiş"** sütunu eklenip tarih formatında görünmesi sağlandı.
- "Pazarlama" sekmesi ihtiyaç olmadığı için projeden komple kaldırıldı. 
- Yüklenen veya listelenen kayıtlar esnasında sayfanın/tabloların anlık takılmaması için bileşen içeriklerine animasyon ve render düzeltmeleri uygulandı.

### 7. 📄 Evrak Yönetimi ve Göğüs Ekspertiz Kartları (A4 Print)
- Araç düzenleme modalına Alış, Satış ve Kira evraklarına ek olarak **"Araç Satış Sözleşmesi"** alanı eklendi (`saleContractDoc`).
- Eski tip karekodlu "Reklam Çıktısı", tamamen modern **Araç Göğüs Ekspertiz Tanıtım Kartı** yapısına çevrildi. Montserrat fontuyla A4 (Dikey) boyutlarına entegre edilerek, karekod olmadan doğrudan okunabilir, yüksek kontrastlı ve garanti rozetleriyle donatılmış bir araç içi tanıtım PDF şablonuna dönüştürüldü.

### 8. 💵 Gelişmiş Kiralama ve Tahsilat İşlemleri
- Araç Stoğu ve Kiralık Araç Stoğu (`RentalTab.tsx`) listelerindeki finansal görünürlükler birleştirildi. Artık "Kirada" statüsündeki bir aracın tabloda direkt olarak **Kira Ücreti** ve alt satırında yeşil renkle **Tahsil Edilen (₺)** miktarı beraber gösterilmektedir.
- Türkçe formatla (noktalı vb.) yazılan sayısal değerlerin veritabanında patlamasını (veya boş/sıfır olarak değerlendirilmesini) önlemek amacıyla `parseTRNumber` (global bir sayı çevirici) entegre edildi. 
- "Tahsil Edilen (₺)" kutusu araç düzenleme modalına doğrudan açıldı. Böylelikle yöneticiler modaldan çıkmadan tahsilatları tutar olarak manuel belirleyebilme özelliğine kavuştu.

---

## 🛠️ Modül ve Dosya Hiyerarşisi (Güncel)

- **`App.tsx`** : Sistemin kalbi, Orkestrasyon yöneticisi. Ortak state'i, yan menüyü (Sidebar) ve Firebase bağlantısını yönetir.
- **`DashboardTab.tsx`** : Sistemin Özet Paneli. Aktif (Satılmamış) araç listesi, ortak bakiyeleri ve ciro tablolarını barındırır.
- **`ArchiveTab.tsx`** : Geçmiş Satışlar arşivi.
- **`RentalTab.tsx`** : Kiralık statüsünde bekleyen veya aktif kirada olan araçları Kiralayan/Gelir bağlamında listeler.
- **`VehicleCariModal.tsx`** : Her bir bireysel araca düşen alım/masraf/kâr hesaplamalarını yürüten Cari penceresi.
- **`CarDiagram.tsx`** : İnteraktif Ekspertiz haritası UI bileşeni.
- **`hooks.ts`** : Firebase Authentication ve Koleksiyon veri trafiklerinin (Query, Snapshot, Update, Delete modüllerinin) real-time tetiklendiği yardımcı data işleyici.

> **Geliştirici Notu:** Bu yapı artık son derece modüler ve tam ölçeklenebilirdir. Ekstra statüler, muhasebe eklentileri veya dış servis (API) entegrasyonları, `hooks.ts` içindeki veri modeline (`Vehicle` vs.) dahil edilip doğrudan ilgili alt-Bileşene bağlanabilir.
