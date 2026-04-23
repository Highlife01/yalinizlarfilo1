// Firebase Admin SDK ile admin kullanıcı rolü atama
const admin = require('firebase-admin');

// Default credentials (Firebase CLI login ile çalışır)
admin.initializeApp({
  projectId: 'yalinizlarfilo'
});

const db = admin.firestore();

async function main() {
  const uid = 'sDZgKt4hxbVJzwuDKcdGEIjTIKU2';
  
  console.log('🔑 Admin rolü atanıyor (Firebase Admin SDK)...');
  await db.doc(`users/${uid}`).set({
    email: 'cebrailkara@gmail.com',
    role: 'admin',
    displayName: 'Cebrail Kara',
    createdAt: new Date().toISOString(),
  }, { merge: true });
  
  console.log('✅ cebrailkara@gmail.com artık admin!');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Hata:', err.message);
  process.exit(1);
});
