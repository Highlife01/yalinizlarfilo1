// Eski eksik/duplikat kayıtları sil (salePrice undefined veya 0 olan ve series boş olan kayıtlar)
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

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

async function cleanup() {
  const snap = await getDocs(collection(db, 'ertas_vehicles'));
  const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log(`📋 Toplam kayıt: ${all.length}`);

  // series boş ve salePrice undefined/null olan eski kayıtları bul
  const toDelete = all.filter(v => !v.series || v.series === '' || v.salePrice === undefined || v.salePrice === null);
  
  console.log(`\n🔍 Silinecek eksik/eski kayıtlar (${toDelete.length} adet):`);
  toDelete.forEach(v => {
    console.log(`  🔴 ${v.brand} "${v.series || '(boş)'}" | ${v.plate} | salePrice: ${v.salePrice} [${v.id}]`);
  });

  if (toDelete.length === 0) {
    console.log('✅ Silinecek kayıt yok!');
    process.exit(0);
    return;
  }

  console.log(`\n🗑️  ${toDelete.length} eski/eksik kayıt siliniyor...`);
  for (const v of toDelete) {
    await deleteDoc(doc(db, 'ertas_vehicles', v.id));
    console.log(`  ✓ Silindi: ${v.brand} (${v.plate}) [${v.id}]`);
  }

  const afterSnap = await getDocs(collection(db, 'ertas_vehicles'));
  console.log(`\n✅ Temizlik tamamlandı! Kalan kayıt: ${afterSnap.size}`);
  process.exit(0);
}

cleanup().catch(e => { console.error('❌ Hata:', e); process.exit(1); });
