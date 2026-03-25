import { collection, addDoc } from 'firebase/firestore';
import { db } from './firebase';

const excelVehicles = [
  { purchaseDate: "2025-07-31", plate: "34YL4249", year: 2017, brand: "MITSUBISHI", model: "L200", series: "", sellerName: "AYDOĞAN", purchasePrice: 583000, expenses: 13330, notes: "8330 YOL MASRAF+ NOTER+ 5000 KOMİSYON", status: 'Stokta' },
  { purchaseDate: "2025-08-01", plate: "01BCV697", year: 2008, brand: "TOYOTA", model: "HILUX", series: "", sellerName: "ALADAĞ MUHT", purchasePrice: 400000, expenses: 17580, notes: "680 PLAKA+ 15000 KAPORTACI+ 1900 FOLYO", status: 'Stokta' },
  { purchaseDate: "2025-08-01", plate: "07MNN53", year: 2017, brand: "FIAT", model: "EGEA", series: "", sellerName: "AYDOĞAN", purchasePrice: 810000, expenses: 13630, notes: "8330 YOL MASRAF+ NOTER+ 6000 SERDAR CULHA", status: 'Stokta' },
  { purchaseDate: "2025-08-04", plate: "80AR709", year: 1988, brand: "TOFAŞ", model: "ŞAHİN", series: "", sellerName: "SAMİ NAMLI", purchasePrice: 70000, expenses: 0, notes: "", status: 'Stokta' },
  { purchaseDate: "2025-10-20", plate: "34RN4982", year: 2017, brand: "RENAULT", model: "CLIO", series: "TOUCH", sellerName: "AUTOLAN", purchasePrice: 741800, expenses: 14500, notes: "13.000 KOMİSYON VE NOTER+ 1500 SİGORTA", status: 'Stokta' },
  { purchaseDate: "2025-12-06", plate: "40AZ098", year: 2009, brand: "FORD", model: "CONNECT", series: "", sellerName: "TAMER ABİ", purchasePrice: 325000, expenses: 5600, notes: "1500 SİGORTA+ 4100 MUAYENE", status: 'Stokta' },
  { purchaseDate: "2025-12-12", plate: "34CPA581", year: 2020, brand: "FIAT", model: "EGEA", series: "", sellerName: "OTO ARENA", purchasePrice: 736136, expenses: 1500, notes: "SİGORTA", status: 'Stokta' },
  { purchaseDate: "2025-12-25", plate: "01NE729", year: 2013, brand: "NISSAN", model: "NAVARA", series: "", sellerName: "REGAİP İŞBİLİR", purchasePrice: 482500, expenses: 14200, notes: "1500 SİGORTA 3000 ANAHTAR+ 2500+ 7200 ÖN CAM", status: 'Stokta' },
  { purchaseDate: "2026-01-25", plate: "01AHZ092", year: 2021, brand: "DACIA", model: "DUSTER", series: "", sellerName: "İSKİT", purchasePrice: 1070000, expenses: 5600, notes: "4100 YOL MASRAF+ 1500 SİGORTA", status: 'Stokta' },
  { purchaseDate: "2026-01-25", plate: "34EHE463", year: 2021, brand: "DACIA", model: "DUSTER", series: "", sellerName: "MUZAYEDE", purchasePrice: 1077500, expenses: 28500, notes: "1500 SİGORTA+ 10.000 GÖÇÜK+ 17.000 ANAHTARCI", status: 'Stokta' },
  { purchaseDate: "2026-01-26", plate: "01AAK975", year: 2011, brand: "MITSUBISHI", model: "L200", series: "", sellerName: "FATMA ÇELİK", purchasePrice: 468000, expenses: 1500, notes: "1500 SİGORTA", status: 'Stokta' },
  { purchaseDate: "2026-01-30", plate: "06CFC105", year: 2018, brand: "MITSUBISHI", model: "L200", series: "", sellerName: "URFA EDESSA", purchasePrice: 830500, expenses: 1500, notes: "", status: 'Stokta' },
  { purchaseDate: "2026-02-02", plate: "80AAZ495", year: 2017, brand: "MITSUBISHI", model: "L200", series: "", sellerName: "YETKİN FERİTCA", purchasePrice: 500000, expenses: 153500, notes: "5000 YOL MASRAF+ 1500 SİGORTA+ 147000 HAKKI USTA", status: 'Stokta' },
  { purchaseDate: "2026-02-09", plate: "06DER596", year: 2018, brand: "MITSUBISHI", model: "L200", series: "", sellerName: "DİYARBAKIR", purchasePrice: 805000, expenses: 21000, notes: "4000 KAPORTA+ 3000 GÖÇÜK+ 7500 FERHAT", status: 'Stokta' },
  { purchaseDate: "2026-02-09", plate: "01ALM489", year: 2021, brand: "HONDA", model: "CIVIC", series: "", sellerName: "MEHMET MERC", purchasePrice: 1640000, expenses: 1500, notes: "1500 SİGORTA+ 4000 KAPORTA", status: 'Stokta' },
  { purchaseDate: "2026-02-13", plate: "50ADU619", year: 2020, brand: "DACIA", model: "DUSTER", series: "", sellerName: "GÜZELLER", purchasePrice: 935000, expenses: 6500, notes: "1500 SİGORTA+ 5000 GÖÇÜK", status: 'Stokta' },
  { purchaseDate: "2026-02-17", plate: "01AKD485", year: 2004, brand: "FORD", model: "FOCUS", series: "", sellerName: "SONER UÇAN", purchasePrice: 280000, expenses: 1500, notes: "", status: 'Stokta' },
  { purchaseDate: "2026-02-28", plate: "42ADB200", year: 2018, brand: "TOYOTA", model: "HILUX", series: "", sellerName: "AHMET HASNO", purchasePrice: 1190000, expenses: 2100, notes: "1500 SİGORTA+ 600 KAPI YANI", status: 'Stokta' },
  { purchaseDate: "2026-03-06", plate: "35BNY437", year: 2023, brand: "FORD", model: "COURIER", series: "", sellerName: "İZMİR DOĞUKA", purchasePrice: 850000, expenses: 1500, notes: "", status: 'Stokta' },
  { purchaseDate: "2026-03-06", plate: "35BRJ806", year: 2023, brand: "FORD", model: "COURIER", series: "", sellerName: "İZMİR DOĞUKA", purchasePrice: 850000, expenses: 1500, notes: "", status: 'Stokta' },
  { purchaseDate: "2026-03-12", plate: "34BND634", year: 2018, brand: "RENAULT", model: "CLIO", series: "TOUCH", sellerName: "VEYSEL", purchasePrice: 870000, expenses: 3000, notes: "1500 SİGORTA+ 1500 HELEZON YAY", status: 'Stokta' },
  { purchaseDate: "2026-03-13", plate: "31FM266", year: 2025, brand: "TOYOTA", model: "HILUX", series: "", sellerName: "OSMANİYE", purchasePrice: 2000000, expenses: 1500, notes: "", status: 'Stokta' },
  { purchaseDate: "2026-03-18", plate: "06BFF422", year: 2018, brand: "RENAULT", model: "MEGANE", series: "", sellerName: "OTO ARENA", purchasePrice: 1285976, expenses: 3000, notes: "1500 SİGORTA+ 1500 YOL MASRAF", status: 'Stokta' },
  { purchaseDate: "2026-03-18", plate: "06CGS308", year: 2020, brand: "RENAULT", model: "MEGANE", series: "", sellerName: "OTO ARENA", purchasePrice: 1347416, expenses: 3000, notes: "1500 SİGORTA+ 1500 YOL MASRAF", status: 'Stokta' }
];

const excelAlacak = [
  { tur: 'acik', verilisTarihi: '2024-07-31', borclu: 'İHALE İKİNCİ YENİ', tutar: 30000, tahsil: 0, aciklama: '' },
  { tur: 'acik', verilisTarihi: '2025-01-20', borclu: 'AHMET SÖYLEMEZ', tutar: 18005, tahsil: 18005, aciklama: 'ŞUBAT 8000+MART 10.000' },
  { tur: 'acik', verilisTarihi: '2025-02-10', borclu: 'EMRAH BULMUŞ', tutar: 10000, tahsil: 0, aciklama: '' },
  { tur: 'acik', verilisTarihi: '2025-04-30', vade: '2025-05-15', borclu: 'Partikül Ferhat Egea Kira', tutar: 35000, tahsil: 28000, aciklama: '28.05.2025(MUSTAFA15.000)+2500DUSTER+Egea 194 plaka 3.000 +7500' },
  { tur: 'acik', verilisTarihi: '2025-07-30', borclu: 'İSMAİL CLİO KİRA', tutar: 188250, tahsil: 140000, aciklama: '(140.000GELENF.ZİRAAT20.08.2025) 3.250 CEZA+21.250+27.000' },
  { tur: 'acik', verilisTarihi: '2025-12-25', borclu: 'GÖRKEM ÇELİK-ŞAMBAYAT', tutar: 79000, tahsil: 50000, aciklama: '' },
  { tur: 'acik', verilisTarihi: '', borclu: 'AYNUR ABLA', tutar: 40000, tahsil: 10000, aciklama: 'MART 10.000' },
  { tur: 'acik', verilisTarihi: '', borclu: 'FEVZİ DEMİRCAN', tutar: 480000, tahsil: 480000, aciklama: '' },
  { tur: 'acik', verilisTarihi: '', borclu: 'OKAN LEBLEBİCİ', tutar: 45000, tahsil: 0, aciklama: '' },
  { tur: 'cek', verilisTarihi: '', vade: '2026-04-10', borclu: 'SONER UÇAN', tutar: 135000, tahsil: 0, aciklama: '' },
  { tur: 'cek', verilisTarihi: '', vade: '2026-05-10', borclu: 'SONER UÇAN', tutar: 155000, tahsil: 0, aciklama: '' },
  { tur: 'senet', verilisTarihi: '2024-11-06', vade: '2025-01-01', borclu: 'TOLGAHAN AVCI', tutar: 270000, tahsil: 70000, aciklama: '(26.02.2025 70.000 GELDİ)' },
  { tur: 'senet', verilisTarihi: '', vade: '', borclu: 'YUNUS KÖRKÜN', tutar: 325000, tahsil: 260000, aciklama: '65000+65000+65000+65000' },
  { tur: 'senet', verilisTarihi: '', vade: '2025-01-25', borclu: 'GÖRKEM ÇELİK', tutar: 165000, tahsil: 0, aciklama: '' },
  { tur: 'senet', verilisTarihi: '', vade: '2026-02-15', borclu: 'İBRAHİM ÖZDAMAR', tutar: 160000, tahsil: 0, aciklama: '' },
  { tur: 'senet', verilisTarihi: '', vade: '2025-02-25', borclu: 'GÖRKEM ÇELİK', tutar: 165000, tahsil: 0, aciklama: '' },
  { tur: 'senet', verilisTarihi: '', vade: '2025-03-25', borclu: 'GÖRKEM ÇELİK', tutar: 165000, tahsil: 0, aciklama: '' },
  { tur: 'senet', verilisTarihi: '', vade: '2025-04-25', borclu: 'GÖRKEM ÇELİK', tutar: 165000, tahsil: 0, aciklama: '' },
  { tur: 'senet', verilisTarihi: '', vade: '2026-07-15', borclu: 'MEHMET EROL', tutar: 340000, tahsil: 0, aciklama: '' },
  { tur: 'senet', verilisTarihi: '', vade: '2026-03-17', borclu: 'SONER UÇAN', tutar: 300000, tahsil: 0, aciklama: '' },
  { tur: 'senet', verilisTarihi: '', vade: '2026-02-15', borclu: 'ALPER ŞEHİR HASTANESİ', tutar: 1000000, tahsil: 1000000, aciklama: '' },
];

export default function ImportData({ existingPlates }: { existingPlates: string[] }) {
  const handleImport = async () => {
    try {
      let addedV = 0;
      for (const v of excelVehicles) {
        if (!existingPlates.includes(v.plate)) {
          await addDoc(collection(db, 'ertas_vehicles'), { ...v, createdAt: Date.now() });
          addedV++;
        }
      }
      
      let addedA = 0;
      for (const a of excelAlacak) {
        await addDoc(collection(db, 'ertas_alacak'), { ...a, createdAt: Date.now() });
        addedA++;
      }
      alert(`Aktarım Başarılı: ${addedV} yeni araç ve ${addedA} alacak kaydı eklendi!`);
    } catch(err) {
      console.error(err);
      alert('Aktarım hatası: ' + String(err));
    }
  };

  return (
    <button id="dev-import-btn" onClick={handleImport} className="fixed bottom-4 right-4 z-50 bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-2xl animate-pulse">
      EXCEL'DEN VERİ AKTAR
    </button>
  );
}
