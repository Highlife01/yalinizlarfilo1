import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyD-5-dBYt0ZgAHGXKrq2MpYmnSltd17WrM",
  authDomain: "yalinizlarfilo.firebaseapp.com",
  projectId: "yalinizlarfilo",
  storageBucket: "yalinizlarfilo.firebasestorage.app",
  messagingSenderId: "635957588486",
  appId: "1:635957588486:web:54376624896c998da20987",
  measurementId: "G-9YMKH6DHLY"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);

export default app;
