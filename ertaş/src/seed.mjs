// Seed script: listelenen 19 aracı Firestore'a ekler
// Çalıştırma: node --experimental-vm-modules src/seed.js  (veya ts-node src/seed.ts)
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD-5-dBYt0ZgAHGXKrq2MpYmnSltd17WrM",
  authDomain: "yalinizlarfilo.firebaseapp.com",
  projectId: "yalinizlarfilo",
  storageBucket: "yalinizlarfilo.firebasestorage.app",
  messagingSenderId: "635957588486",
  appId: "1:635957588486:web:54376624896c998da20987"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const vehicles = [
  { brand: 'TOYOTA', series: 'HİLUX 4X2 Adventure Otomatik', model: 'HİLUX 4X2 Adventure Otomatik', year: 2022, km: 172000, color: 'B', plate: '09-AGR-986', inspection: '17.02.2027', purchasePrice: 0, expenses: 0, salePrice: 1575000, status: 'Stokta', expertiseNotes: 'BOYA YOK -20.178 TL', notes: '', fuel: 'Dizel', gear: 'Otomatik', image: '', expertiseImage: '' },
  { brand: 'TOYOTA', series: 'HİLUX 4X2 Adventure Otomatik', model: 'HİLUX 4X2 Adventure Otomatik', year: 2018, km: 208000, color: 'B', plate: '42-ADB-200', inspection: '15.08.2026', purchasePrice: 0, expenses: 0, salePrice: 1375000, status: 'Stokta', expertiseNotes: 'Arka Stop Altları BOYA - 0 TL', notes: '', fuel: 'Dizel', gear: 'Otomatik', image: '', expertiseImage: '' },
  { brand: 'MİTSUBİSHİ', series: 'L200 4X2 Tornado', model: 'L200 4X2 Tornado', year: 2018, km: 204000, color: 'B', plate: '06-CFC-105', inspection: '21.01.2027', purchasePrice: 0, expenses: 0, salePrice: 1070000, status: 'Stokta', expertiseNotes: 'Arka Stop Altları BOYA, Bagaj Üst Kısmı Şerit Halinde Lokal - 0 TL', notes: '', fuel: 'Dizel', gear: 'Manuel', image: '', expertiseImage: '' },
  { brand: 'MİTSUBİSHİ', series: 'L200 4X2 Tornado - Çeki Demirli', model: 'L200 4X2 Tornado', year: 2018, km: 292000, color: 'G', plate: '06-BER-596', inspection: '10.06.2026', purchasePrice: 0, expenses: 22000, salePrice: 970000, status: 'Stokta', expertiseNotes: 'Bagaj Kapağı Değişen, Arka Stop Altları BOYA - 22.000 TL/2', notes: 'Çeki Demirli', fuel: 'Dizel', gear: 'Manuel', image: '', expertiseImage: '' },
  { brand: 'MİTSUBİSHİ', series: 'L200 4X4 Storm', model: 'L200 4X4 Storm', year: 2017, km: 0, color: 'B', plate: '', inspection: '29.07.2026', purchasePrice: 0, expenses: 0, salePrice: 0, status: 'Stokta', expertiseNotes: '', notes: '*K', fuel: 'Dizel', gear: 'Otomatik', image: '', expertiseImage: '' },
  { brand: 'MİTSUBİSHİ', series: 'L200 4X2 Tornado', model: 'L200 4X2 Tornado', year: 2017, km: 187000, color: 'B', plate: '01-BAV-794', inspection: '19.12.2026', purchasePrice: 0, expenses: 19182, salePrice: 1070000, status: 'Stokta', expertiseNotes: 'Bagaj Kapağı Değişen, Arka Stop Altları BOYA - 19.182 TL/3', notes: '', fuel: 'Dizel', gear: 'Manuel', image: '', expertiseImage: '' },
  { brand: 'MİTSUBİSHİ', series: 'L200 4X2 Tornado', model: 'L200 4X2 Tornado', year: 2017, km: 347000, color: 'G', plate: '80-AAZ-495', inspection: '15.12.2026', purchasePrice: 0, expenses: 3100, salePrice: 770000, status: 'Stokta', expertiseNotes: 'Sol Ön Çam, Sağ Ön Kapı Değişen, Sağ Arka Kapı BOYA - 3.100 TL/3', notes: '', fuel: 'Dizel', gear: 'Manuel', image: '', expertiseImage: '' },
  { brand: 'MİTSUBİSHİ', series: 'L200 4X2 Invite', model: 'L200 4X2 Invite', year: 2011, km: 375000, color: 'G', plate: '01-AAK-975', inspection: '12.12.2026', purchasePrice: 0, expenses: 7021, salePrice: 590000, status: 'Stokta', expertiseNotes: 'Sol Ön Çam. Değişen, Kaput Sol tarafı yarım Boya, Sol Ön Kapı ve Arka Kasa BOYA - 7.021 TL/3', notes: '', fuel: 'Dizel', gear: 'Manuel', image: '', expertiseImage: '' },
  { brand: 'NISSAN', series: 'NAVARA 4x2 SE FULL 163 HP 6 İLERİ', model: 'NAVARA 4x2', year: 2013, km: 376000, color: 'B', plate: '01-NE-729', inspection: '24.12.2024', purchasePrice: 0, expenses: 3893, salePrice: 695000, status: 'Stokta', expertiseNotes: 'BOYA YOK - 3.893 TL (Arka Sol Stop Altı 2 Karış Lokal)', notes: '', fuel: 'Dizel', gear: 'Manuel', image: '', expertiseImage: '' },
  { brand: 'TOYOTA', series: 'HİLUX 4X2 Comfort', model: 'HİLUX 4X2 Comfort', year: 2008, km: 266000, color: 'S', plate: '01-BCV-697', inspection: '26.01.2026', purchasePrice: 0, expenses: 0, salePrice: 585000, status: 'Stokta', expertiseNotes: 'Arka Kasa ve Sağ Kapılar Çizikten Kaynaklandı BOYA - 0 TL', notes: '', fuel: 'Dizel', gear: 'Manuel', image: '', expertiseImage: '' },
  { brand: 'TOYOTA', series: 'HİLUX 4X2 Comfort', model: 'HİLUX 4X2 Comfort', year: 2008, km: 369000, color: 'G', plate: '01-FDL-78', inspection: '23.11.2026', purchasePrice: 0, expenses: 42590, salePrice: 550000, status: 'Stokta', expertiseNotes: 'Arka Hariç Boya, Ön 3 Parça Değişen - 42.590 TL/2', notes: '', fuel: 'Dizel', gear: 'Manuel', image: '', expertiseImage: '' },
  { brand: 'FORD', series: 'RANGER 4X4 Çeki', model: 'RANGER 4X4', year: 2004, km: 376000, color: 'M', plate: '01-AIT-235', inspection: '2.01.2027', purchasePrice: 0, expenses: 0, salePrice: 520000, status: 'Stokta', expertiseNotes: 'Temizlik Amaçlı Komple BOYALI - Ağır Hasarlı', notes: 'Çeki', fuel: 'Dizel', gear: 'Manuel', image: '', expertiseImage: '' },
  { brand: 'HYUNDAİ', series: 'H100', model: 'H100', year: 2024, km: 31000, color: 'B', plate: '09-ANM-622', inspection: '12.11.2026', purchasePrice: 0, expenses: 0, salePrice: 1215000, status: 'Stokta', expertiseNotes: 'Sağ Ön Dikiz Aynası Altı BOYA - 0 TL', notes: '', fuel: 'Dizel', gear: 'Manuel', image: '', expertiseImage: '' },
  { brand: 'FORD', series: 'COURIER 1.5 95 Hp DELUX-6 İLERİ', model: 'COURIER', year: 2018, km: 136000, color: 'B', plate: '34-BGK-654', inspection: '9.12.2026', purchasePrice: 0, expenses: 27732, salePrice: 715000, status: 'Stokta', expertiseNotes: 'Sağ Ön Çam Değişen, Ön-Arka Kapı ve Arka Camufluklar Çizik Boyası - 27.732 TL/3', notes: '', fuel: 'Benzin', gear: 'Manuel', image: '', expertiseImage: '' },
  { brand: 'VOLVO', series: 'XC90 T8 Recharge Plug-in Hybrid Inscription AWD 7 Koltuk', model: 'XC90', year: 2020, km: 195000, color: 'S', plate: '01-BBA-842', inspection: '6.09.2027', purchasePrice: 0, expenses: 25000, salePrice: 4200000, status: 'Stokta', expertiseNotes: 'Kaput Değişen, Sol Ön Cam, Sol Ön Kapı, Sağ Ön-Arka Kapı, Sağ Arka Cam. BOYA - 25.000 TL', notes: '', fuel: 'Hibrit', gear: 'Otomatik', image: '', expertiseImage: '' },
  { brand: 'MERCEDES', series: 'E200d Exclusive', model: 'E200d', year: 2019, km: 167000, color: 'S', plate: '01-FY-300', inspection: '2.05.2027', purchasePrice: 0, expenses: 36071, salePrice: 3475000, status: 'Stokta', expertiseNotes: 'SAĞ ÖN ÇAM. UCU 2 KARIŞ LOKAL - 36.071 TL/2', notes: '', fuel: 'Dizel', gear: 'Otomatik', image: '', expertiseImage: '' },
  { brand: 'BMW', series: '320i Edition M Sport Shadow/Yeni Direksiyon', model: '320i', year: 2024, km: 26000, color: 'S', plate: '34-PED-073', inspection: '11.11.2027', purchasePrice: 0, expenses: 0, salePrice: 4290000, status: 'Stokta', expertiseNotes: 'BOYA YOK - 0 TL (Sol Ön Kapı Açma Yeri 2 Karış Lokal Çizik Boyası) Komple PPF Kaplı', notes: '', fuel: 'Benzin', gear: 'Otomatik', image: '', expertiseImage: '' },
  { brand: 'BMW', series: '1.16d Joy Plus', model: '116d', year: 2016, km: 199000, color: 'B', plate: '01-ARK-072', inspection: '23.02.2026', purchasePrice: 0, expenses: 1572, salePrice: 1175000, status: 'Stokta', expertiseNotes: 'Kaput, Sağ Ön Çam. Değişen, Temizlik Amaçlı Komple Boyalı - 1.572 TL (Şası, Podye, Airbaglar Orijinal)', notes: '', fuel: 'Dizel', gear: 'Otomatik', image: '', expertiseImage: '' },
  { brand: 'VOLKSWAGEN', series: 'TİGUAN 1.5 TSİ ACT 150 DSG Elegance', model: 'TİGUAN', year: 2023, km: 96000, color: 'M', plate: '01-ATD-718', inspection: '19.10.2026', purchasePrice: 0, expenses: 0, salePrice: 2340000, status: 'Stokta', expertiseNotes: 'BOYA YOK - 0 TL', notes: '', fuel: 'Benzin', gear: 'Otomatik', image: '', expertiseImage: '' },
];

async function seed() {
  console.log('Firestore yükleme başlıyor...');
  for (const v of vehicles) {
    await addDoc(collection(db, 'ertas_vehicles'), { ...v, createdAt: Date.now() });
    console.log(`✓ ${v.brand} ${v.series} eklendi`);
  }
  console.log('✅ Tüm araçlar yüklendi!');
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
