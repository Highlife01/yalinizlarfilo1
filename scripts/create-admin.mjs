import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyD-5-dBYt0ZgAHGXKrq2MpYmnSltd17WrM',
  authDomain: 'yalinizlarfilo.firebaseapp.com',
  projectId: 'yalinizlarfilo',
  storageBucket: 'yalinizlarfilo.firebasestorage.app',
  messagingSenderId: '635957588486',
  appId: '1:635957588486:web:54376624896c998da20987',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const EMAIL = 'tameryaliniz@hotmail.com';
const PASSWORD = process.argv[2];

if (!PASSWORD) {
  console.error('❌ Kullanım: node scripts/create-admin.mjs <şifre>');
  console.error('   Örnek: node scripts/create-admin.mjs MySecurePass123');
  process.exit(1);
}

async function main() {
  let uid;

  try {
    // Önce yeni kullanıcı oluştur
    console.log(`📧 ${EMAIL} için kullanıcı oluşturuluyor...`);
    const cred = await createUserWithEmailAndPassword(auth, EMAIL, PASSWORD);
    uid = cred.user.uid;
    console.log(`✅ Kullanıcı oluşturuldu: ${uid}`);
  } catch (err) {
    if (err.code === 'auth/email-already-in-use') {
      // Kullanıcı zaten var, giriş yapalım
      console.log('ℹ️  Kullanıcı zaten mevcut, giriş yapılıyor...');
      try {
        const cred = await signInWithEmailAndPassword(auth, EMAIL, PASSWORD);
        uid = cred.user.uid;
        console.log(`✅ Giriş başarılı: ${uid}`);
      } catch (loginErr) {
        console.error('❌ Giriş hatası:', loginErr.message);
        console.error('   Şifre yanlış olabilir. Doğru şifreyi girin.');
        process.exit(1);
      }
    } else {
      console.error('❌ Kullanıcı oluşturma hatası:', err.message);
      process.exit(1);
    }
  }

  // Firestore'da admin rolü ata
  console.log('🔑 Admin rolü atanıyor...');
  await setDoc(doc(db, 'users', uid), {
    email: EMAIL,
    role: 'admin',
    displayName: 'Tamer Yalınız',
    createdAt: new Date().toISOString(),
  }, { merge: true });

  console.log('🎉 Tamamlandı! tameryaliniz@hotmail.com artık admin olarak giriş yapabilir.');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Hata:', err);
  process.exit(1);
});
