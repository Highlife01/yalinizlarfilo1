// Firebase Admin SDK ile admin kullanıcı rolü atama
const admin = require('firebase-admin');

// Default credentials (Firebase CLI login ile çalışır)
admin.initializeApp({
  projectId: 'yalinizlarfilo'
});

const db = admin.firestore();

async function main() {
  const uid = 'QzwyNVumNnNco2fFCTw6S01vQQj1';
  
  console.log('🔑 Admin rolü atanıyor (Firebase Admin SDK)...');
  await db.doc(`users/${uid}`).set({
    email: 'tameryaliniz@hotmail.com',
    role: 'admin',
    displayName: 'Tamer Yalınız',
    createdAt: new Date().toISOString(),
  }, { merge: true });
  
  console.log('✅ tameryaliniz@hotmail.com artık admin!');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Hata:', err.message);
  process.exit(1);
});
