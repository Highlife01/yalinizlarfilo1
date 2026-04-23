// Firebase REST API ile admin kullanıcı rolü atama (POST / create)
const EMAIL = 'cebrailkara@gmail.com';
const PASSWORD = 'Ak010101';
const API_KEY = 'AIzaSyD-5-dBYt0ZgAHGXKrq2MpYmnSltd17WrM';
const PROJECT_ID = 'yalinizlarfilo';

async function main() {
  // 1. Sign in
  console.log('🔐 Giriş yapılıyor...');
  const loginRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD, returnSecureToken: true })
  });
  const loginData = await loginRes.json();
  if (!loginRes.ok) { console.error('❌ Giriş hatası:', loginData.error?.message); process.exit(1); }
  const { idToken, localId: uid } = loginData;
  console.log(`✅ UID: ${uid}`);

  // 2. Check if doc exists
  const docUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${uid}`;
  const getRes = await fetch(docUrl, { headers: { 'Authorization': `Bearer ${idToken}` } });

  const fields = {
    email: { stringValue: EMAIL },
    role: { stringValue: 'admin' },
    displayName: { stringValue: 'Cebrail Kara' },
    createdAt: { stringValue: new Date().toISOString() }
  };

  if (getRes.status === 404) {
    // Document doesn't exist — use POST (create)
    console.log('📝 Yeni doküman oluşturuluyor (create)...');
    const createUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/users?documentId=${uid}`;
    const createRes = await fetch(createUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
      body: JSON.stringify({ fields })
    });
    const createData = await createRes.json();
    if (!createRes.ok) {
      console.error('❌ Create hatası:', JSON.stringify(createData.error, null, 2));
      process.exit(1);
    }
    console.log('🎉 Admin dokümanı oluşturuldu!');
  } else if (getRes.ok) {
    // Document exists — use PATCH (update)
    console.log('📝 Mevcut doküman güncelleniyor (update)...');
    const patchRes = await fetch(docUrl + '?updateMask.fieldPaths=role&updateMask.fieldPaths=displayName', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
      body: JSON.stringify({ fields: { role: { stringValue: 'admin' }, displayName: { stringValue: 'Cebrail Kara' } } })
    });
    const patchData = await patchRes.json();
    if (!patchRes.ok) {
      console.error('❌ Update hatası:', JSON.stringify(patchData.error, null, 2));
      process.exit(1);
    }
    console.log('🎉 Admin rolü güncellendi!');
  } else {
    const errData = await getRes.json();
    console.error('❌ Doküman kontrol hatası:', JSON.stringify(errData.error, null, 2));
    process.exit(1);
  }
}

main().catch(err => { console.error('❌', err); process.exit(1); });
