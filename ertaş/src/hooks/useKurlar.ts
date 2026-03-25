import { useEffect, useState } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';
import { firebaseConfig } from '../firebaseConfig'; // adjust path if needed

// Initialize Firebase app (if not already initialized elsewhere)
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

type Kurlar = {
  euro: number;
  dolar: number;
  altin: number;
};

/**
 * Hook that listens to the Firestore document `exchangeRates/latest` and returns
 * the most recent currency rates. It updates in real‑time, so any component using
 * this hook always works with up‑to‑date values without any localStorage.
 */
export const useKurlar = (): Kurlar => {
  const [kurlar, setKurlar] = useState<Kurlar>({ euro: 0, dolar: 0, altin: 0 });

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'exchangeRates', 'latest'), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Kurlar;
        setKurlar({ euro: data.euro, dolar: data.dolar, altin: data.altin });
      }
    });
    return () => unsub();
  }, []);

  return kurlar;
};
