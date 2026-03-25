// Seed script #2: Fotoğraftaki 20-38 arası araçları Firestore'a ekler
// Çalıştırma: node src/seed2.mjs
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
  // 20
  { brand: 'HONDA', series: 'CİVİC 1.6 Eco Elegance Benzin+LPG', model: 'CİVİC 1.6 Eco Elegance', year: 2021, km: 46000, color: 'B', plate: '01-ALM-489', inspection: '11.09.2026', purchasePrice: 0, expenses: 0, salePrice: 1795000, status: 'Stokta', expertiseNotes: 'BOYA YOK - 6.924 TL', notes: '', fuel: 'LPG', gear: 'Otomatik', image: '', expertiseImage: '', damageMap: {}, insuranceCompany: '', insurancePolicyNo: '', insuranceStart: '', insuranceEnd: '', sellerName: '', sellerPhone: '', sellerIdNo: '', sellerAddress: '', purchaseDate: '', buyerName: '', buyerPhone: '', buyerIdNo: '', buyerAddress: '', soldDate: '' },
  // 21
  { brand: 'RENAULT', series: 'MEGANE 1.5 110HP TOUCH Otomatik', model: 'MEGANE 1.5 110HP TOUCH', year: 2018, km: 137000, color: 'B', plate: '34-HAY-131', inspection: '05.04.2027', purchasePrice: 0, expenses: 0, salePrice: 1180000, status: 'Stokta', expertiseNotes: 'SAĞ ÖN-ARKA KAPI, SAĞ ARKA ÇAMURLUK BOYA - 0 TL/2 (Sol Arka Kapı, Sol Çamurluk Lokal)', notes: '', fuel: 'Dizel', gear: 'Otomatik', image: '', expertiseImage: '', damageMap: {}, insuranceCompany: '', insurancePolicyNo: '', insuranceStart: '', insuranceEnd: '', sellerName: '', sellerPhone: '', sellerIdNo: '', sellerAddress: '', purchaseDate: '', buyerName: '', buyerPhone: '', buyerIdNo: '', buyerAddress: '', soldDate: '' },
  // 22
  { brand: 'RENAULT', series: 'MEGANE 1.5 110HP TOUCH Otomatik', model: 'MEGANE 1.5 110HP TOUCH', year: 2018, km: 157000, color: 'G', plate: '34-BNY-429', inspection: '10.05.2027', purchasePrice: 0, expenses: 0, salePrice: 1140000, status: 'Stokta', expertiseNotes: 'Sol Arka Kapı, Sağ Arka Çam. Değişen, Sağ Arka Çam. BOYA - 15.123 TL', notes: '', fuel: 'Dizel', gear: 'Otomatik', image: '', expertiseImage: '', damageMap: {}, insuranceCompany: '', insurancePolicyNo: '', insuranceStart: '', insuranceEnd: '', sellerName: '', sellerPhone: '', sellerIdNo: '', sellerAddress: '', purchaseDate: '', buyerName: '', buyerPhone: '', buyerIdNo: '', buyerAddress: '', soldDate: '' },
  // 23
  { brand: 'RENAULT', series: 'MEGANE 1.5 110HP TOUCH Otomatik', model: 'MEGANE 1.5 110HP TOUCH', year: 2018, km: 158000, color: 'B', plate: '34-BHD-584', inspection: '27.03.2027', purchasePrice: 0, expenses: 0, salePrice: 1140000, status: 'Stokta', expertiseNotes: 'Sağ Ön-Arka Kapı, Bagaj ve Arka Çamurluklar Çizik Boyası - 640 TL', notes: '', fuel: 'Dizel', gear: 'Otomatik', image: '', expertiseImage: '', damageMap: {}, insuranceCompany: '', insurancePolicyNo: '', insuranceStart: '', insuranceEnd: '', sellerName: '', sellerPhone: '', sellerIdNo: '', sellerAddress: '', purchaseDate: '', buyerName: '', buyerPhone: '', buyerIdNo: '', buyerAddress: '', soldDate: '' },
  // 24
  { brand: 'RENAULT', series: 'CLİO 1.5 Dizel Otomatik TOUCH', model: 'CLİO 1.5 Dizel TOUCH', year: 2017, km: 189000, color: 'B', plate: '34-RN-982', inspection: '21.01.2027', purchasePrice: 0, expenses: 0, salePrice: 890000, status: 'Stokta', expertiseNotes: 'Kaput Değişen, Tavan-Bagaj Harici Belirtir BOYA - 0 TL/1 (Sol Poliçe İşlem)', notes: '', fuel: 'Dizel', gear: 'Otomatik', image: '', expertiseImage: '', damageMap: {}, insuranceCompany: '', insurancePolicyNo: '', insuranceStart: '', insuranceEnd: '', sellerName: '', sellerPhone: '', sellerIdNo: '', sellerAddress: '', purchaseDate: '', buyerName: '', buyerPhone: '', buyerIdNo: '', buyerAddress: '', soldDate: '' },
  // 25
  { brand: 'FİAT', series: 'EGEA 1.3 E6 EASY', model: 'EGEA 1.3 E6 EASY', year: 2020, km: 136000, color: 'G', plate: '34-CPA-581', inspection: '14.01.2027', purchasePrice: 0, expenses: 0, salePrice: 835000, status: 'Stokta', expertiseNotes: 'Sağ Ön Cam, Sağ Ön Kapı BOYA - 0 TL/2', notes: '', fuel: 'Dizel', gear: 'Manuel', image: '', expertiseImage: '', damageMap: {}, insuranceCompany: '', insurancePolicyNo: '', insuranceStart: '', insuranceEnd: '', sellerName: '', sellerPhone: '', sellerIdNo: '', sellerAddress: '', purchaseDate: '', buyerName: '', buyerPhone: '', buyerIdNo: '', buyerAddress: '', soldDate: '' },
  // 26
  { brand: 'FİAT', series: 'EGEA 1.3 E6 EASY', model: 'EGEA 1.3 E6 EASY', year: 2019, km: 144000, color: 'B', plate: '34-CTC-889', inspection: '02.12.2026', purchasePrice: 0, expenses: 0, salePrice: 740000, status: 'Stokta', expertiseNotes: 'DEĞİŞEN YOK. Sağ Ön Kapı, Arka Kapı ve Arka Çamurluklar BOYA, Bagaj 2 Karış Lokal - 21.937 TL', notes: '', fuel: 'Dizel', gear: 'Manuel', image: '', expertiseImage: '', damageMap: {}, insuranceCompany: '', insurancePolicyNo: '', insuranceStart: '', insuranceEnd: '', sellerName: '', sellerPhone: '', sellerIdNo: '', sellerAddress: '', purchaseDate: '', buyerName: '', buyerPhone: '', buyerIdNo: '', buyerAddress: '', soldDate: '' },
  // 27
  { brand: 'FİAT', series: 'EGEA 1.3 E6 EASY', model: 'EGEA 1.3 E6 EASY', year: 2019, km: 186000, color: 'B', plate: '34-CPH-194', inspection: '29.01.2027', purchasePrice: 0, expenses: 0, salePrice: 665000, status: 'Stokta', expertiseNotes: 'Ön Çamurluklar Değişen, Sağ Yan, Sol Arka Lastik Üstü Lokal BOYA - 0 TL/1 (Sol Ön Kapı 2 Karış Lokal)', notes: '', fuel: 'Dizel', gear: 'Manuel', image: '', expertiseImage: '', damageMap: {}, insuranceCompany: '', insurancePolicyNo: '', insuranceStart: '', insuranceEnd: '', sellerName: '', sellerPhone: '', sellerIdNo: '', sellerAddress: '', purchaseDate: '', buyerName: '', buyerPhone: '', buyerIdNo: '', buyerAddress: '', soldDate: '' },
  // 28
  { brand: 'FİAT', series: 'EGEA 1.6 Dizel Otomatik URBAN', model: 'EGEA 1.6 Dizel URBAN', year: 2018, km: 333000, color: 'B', plate: '34-BNZ-254', inspection: '19.07.2027', purchasePrice: 0, expenses: 0, salePrice: 670000, status: 'Stokta', expertiseNotes: 'Bagaj Plaka Altı ve Sol Arka Lastik Üstü Lokal BOYA - 6.280 TL/1', notes: '', fuel: 'Dizel', gear: 'Otomatik', image: '', expertiseImage: '', damageMap: {}, insuranceCompany: '', insurancePolicyNo: '', insuranceStart: '', insuranceEnd: '', sellerName: '', sellerPhone: '', sellerIdNo: '', sellerAddress: '', purchaseDate: '', buyerName: '', buyerPhone: '', buyerIdNo: '', buyerAddress: '', soldDate: '' },
  // 29
  { brand: 'FİAT', series: 'EGEA 1.6 Dizel Otomatik URBAN', model: 'EGEA 1.6 Dizel URBAN', year: 2017, km: 138000, color: 'B', plate: '07-MNN-53', inspection: '20.07.2026', purchasePrice: 0, expenses: 0, salePrice: 890000, status: 'Stokta', expertiseNotes: 'Sol Ön Kapı Değişen, Sol Ön Çam, Sağ Ön Çam, Sağ Ön Kapı BOYA - 0 TL/1', notes: '', fuel: 'Dizel', gear: 'Otomatik', image: '', expertiseImage: '', damageMap: {}, insuranceCompany: '', insurancePolicyNo: '', insuranceStart: '', insuranceEnd: '', sellerName: '', sellerPhone: '', sellerIdNo: '', sellerAddress: '', purchaseDate: '', buyerName: '', buyerPhone: '', buyerIdNo: '', buyerAddress: '', soldDate: '' },
  // 30
  { brand: 'CİTROEN', series: "C'ELYSEE 1.6 Dizel Live", model: "C'ELYSEE 1.6 Dizel", year: 2017, km: 95000, color: 'B', plate: '06-BBU-179', inspection: '05.07.2027', purchasePrice: 0, expenses: 0, salePrice: 760000, status: 'Stokta', expertiseNotes: 'BOYA YOK - 0 TL', notes: '', fuel: 'Dizel', gear: 'Manuel', image: '', expertiseImage: '', damageMap: {}, insuranceCompany: '', insurancePolicyNo: '', insuranceStart: '', insuranceEnd: '', sellerName: '', sellerPhone: '', sellerIdNo: '', sellerAddress: '', purchaseDate: '', buyerName: '', buyerPhone: '', buyerIdNo: '', buyerAddress: '', soldDate: '' },
  // 31
  { brand: 'DACİA', series: 'DUSTER 1.5 BlueDCi 115 HP 4x4 COMFORT', model: 'DUSTER 1.5 BlueDCi 115', year: 2021, km: 133000, color: 'B', plate: '01-AIB-597', inspection: '10.07.2026', purchasePrice: 0, expenses: 0, salePrice: 1190000, status: 'Stokta', expertiseNotes: 'Sağ Ön Kapı Lokal, Sol Arka Çam, Sağ Ön Çam, Lastik Üstü 1 Karış Lokal, Bagaj Yarım BOYA - 0 TL', notes: '', fuel: 'Dizel', gear: 'Manuel', image: '', expertiseImage: '', damageMap: {}, insuranceCompany: '', insurancePolicyNo: '', insuranceStart: '', insuranceEnd: '', sellerName: '', sellerPhone: '', sellerIdNo: '', sellerAddress: '', purchaseDate: '', buyerName: '', buyerPhone: '', buyerIdNo: '', buyerAddress: '', soldDate: '' },
  // 32
  { brand: 'DACİA', series: 'DUSTER 1.5 BlueDCi 115 HP 4x4 COMFORT', model: 'DUSTER 1.5 BlueDCi 115', year: 2021, km: 178000, color: 'B', plate: '01-AHZ-092', inspection: '01.07.2026', purchasePrice: 0, expenses: 0, salePrice: 1970000, status: 'Stokta', expertiseNotes: 'Sol Arka Kapı 1 Karış Lokal, Sol Arka Çam, Lastik Üstü 2 Karış Lokal BOYA - 0 TL', notes: '', fuel: 'Dizel', gear: 'Manuel', image: '', expertiseImage: '', damageMap: {}, insuranceCompany: '', insurancePolicyNo: '', insuranceStart: '', insuranceEnd: '', sellerName: '', sellerPhone: '', sellerIdNo: '', sellerAddress: '', purchaseDate: '', buyerName: '', buyerPhone: '', buyerIdNo: '', buyerAddress: '', soldDate: '' },
  // 33
  { brand: 'DACİA', series: 'DUSTER 1.5 BlueDCi 115 HP 4x4 COMFORT', model: 'DUSTER 1.5 BlueDCi 115', year: 2021, km: 178000, color: 'B', plate: '34-EHE-463', inspection: '25.05.2026', purchasePrice: 0, expenses: 0, salePrice: 1170000, status: 'Stokta', expertiseNotes: 'BOYA YOK - 0 TL', notes: '', fuel: 'Dizel', gear: 'Manuel', image: '', expertiseImage: '', damageMap: {}, insuranceCompany: '', insurancePolicyNo: '', insuranceStart: '', insuranceEnd: '', sellerName: '', sellerPhone: '', sellerIdNo: '', sellerAddress: '', purchaseDate: '', buyerName: '', buyerPhone: '', buyerIdNo: '', buyerAddress: '', soldDate: '' },
  // 34
  { brand: 'DACİA', series: 'DUSTER 1.5 BlueDCi 115 HP 4x4 COMFORT', model: 'DUSTER 1.5 BlueDCi 115', year: 2020, km: 175000, color: 'B', plate: '50-ADL-619', inspection: '02.10.2027', purchasePrice: 0, expenses: 0, salePrice: 1120000, status: 'Stokta', expertiseNotes: 'BOYA YOK - 0 TL (Sağ Arka Çamurluk Lastik Üstü 2 Karış Lokal)', notes: '', fuel: 'Dizel', gear: 'Manuel', image: '', expertiseImage: '', damageMap: {}, insuranceCompany: '', insurancePolicyNo: '', insuranceStart: '', insuranceEnd: '', sellerName: '', sellerPhone: '', sellerIdNo: '', sellerAddress: '', purchaseDate: '', buyerName: '', buyerPhone: '', buyerIdNo: '', buyerAddress: '', soldDate: '' },
  // 35
  { brand: 'FORD', series: 'CONNECT 1.8 TDCi 75 HP', model: 'CONNECT 1.8 TDCi', year: 2009, km: 214000, color: 'G', plate: '01-AZ-498', inspection: '28.02.2026', purchasePrice: 0, expenses: 0, salePrice: 390000, status: 'Stokta', expertiseNotes: 'BOYA YOK - 0 TL/2', notes: '', fuel: 'Dizel', gear: 'Manuel', image: '', expertiseImage: '', damageMap: {}, insuranceCompany: '', insurancePolicyNo: '', insuranceStart: '', insuranceEnd: '', sellerName: '', sellerPhone: '', sellerIdNo: '', sellerAddress: '', purchaseDate: '', buyerName: '', buyerPhone: '', buyerIdNo: '', buyerAddress: '', soldDate: '' },
  // 36
  { brand: 'FORD', series: 'FOCUS 1.6 Benzin+LPG', model: 'FOCUS 1.6', year: 2004, km: 332000, color: 'G', plate: '01-AKD-485', inspection: '11.08.2027', purchasePrice: 0, expenses: 0, salePrice: 395000, status: 'Stokta', expertiseNotes: 'Sağ Ön Cam, Arka Çamurluklar ve Bagaj Boya - 0 TL/1', notes: '', fuel: 'LPG', gear: 'Manuel', image: '', expertiseImage: '', damageMap: {}, insuranceCompany: '', insurancePolicyNo: '', insuranceStart: '', insuranceEnd: '', sellerName: '', sellerPhone: '', sellerIdNo: '', sellerAddress: '', purchaseDate: '', buyerName: '', buyerPhone: '', buyerIdNo: '', buyerAddress: '', soldDate: '' },
  // 37
  { brand: 'TOFAŞ', series: 'ŞAHİN 1.6 Benzin+LPG', model: 'ŞAHİN 1.6', year: 1988, km: 0, color: 'B', plate: '80-AR-709', inspection: '04.02.2027', purchasePrice: 0, expenses: 0, salePrice: 95000, status: 'Stokta', expertiseNotes: '', notes: '', fuel: 'LPG', gear: 'Manuel', image: '', expertiseImage: '', damageMap: {}, insuranceCompany: '', insurancePolicyNo: '', insuranceStart: '', insuranceEnd: '', sellerName: '', sellerPhone: '', sellerIdNo: '', sellerAddress: '', purchaseDate: '', buyerName: '', buyerPhone: '', buyerIdNo: '', buyerAddress: '', soldDate: '' },
  // 38
  { brand: 'RENAULT', series: 'R12 1.4 Benzin', model: 'R12', year: 1987, km: 0, color: 'K', plate: '01-AYC-850', inspection: '08.12.2025', purchasePrice: 0, expenses: 0, salePrice: 900000, status: 'Stokta', expertiseNotes: '', notes: '', fuel: 'Benzin', gear: 'Manuel', image: '', expertiseImage: '', damageMap: {}, insuranceCompany: '', insurancePolicyNo: '', insuranceStart: '', insuranceEnd: '', sellerName: '', sellerPhone: '', sellerIdNo: '', sellerAddress: '', purchaseDate: '', buyerName: '', buyerPhone: '', buyerIdNo: '', buyerAddress: '', soldDate: '' },
];

async function seed() {
  console.log(`🚗 ${vehicles.length} araç Firestore'a yükleniyor...`);
  for (let i = 0; i < vehicles.length; i++) {
    const v = vehicles[i];
    await addDoc(collection(db, 'ertas_vehicles'), { ...v, createdAt: Date.now() + i });
    console.log(`  ✓ [${20 + i}] ${v.brand} ${v.series} (${v.plate}) eklendi`);
  }
  console.log('✅ Tüm araçlar başarıyla yüklendi!');
  process.exit(0);
}

seed().catch(e => { console.error('❌ Hata:', e); process.exit(1); });
