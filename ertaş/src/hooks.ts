// Firestore hooks for vehicles and partners
import { useState, useEffect } from 'react';
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';

export type Vehicle = {
  id?: string;
  brand: string;
  series: string;
  model: string;
  year: number;
  km: number;
  fuel: string;
  gear: string;
  color: string;
  plate: string;
  inspection: string;
  purchasePrice: number;
  expenses: number;
  expenseNotes?: string;  // Masraf açıklaması
  salePrice: number;
  status: 'Stokta' | 'Satıldı' | 'Rezerve' | 'Serviste' | 'Kiralık' | 'Kirada';
  image: string;
  expertiseImage: string;
  expertiseNotes: string;
  tramerAmount?: number;   // Tramer kayıt tutarı (TL)
  notes: string;
  damageMap: Record<string, string>;
  // ── Sigorta ──
  insuranceCompany: string;
  insurancePolicyNo: string;
  insuranceStart: string;
  insuranceEnd: string;
  // ── Alınan kişi bilgileri ──
  sellerName: string;
  sellerPhone: string;
  sellerIdNo: string;      // TC Kimlik No
  sellerAddress: string;
  purchaseDate: string;    // "2026-01-15"
  // ── Satılan kişi bilgileri ──
  buyerName: string;
  buyerPhone: string;
  buyerIdNo: string;
  buyerAddress: string;
  soldDate: string;        // "2026-03-10"
  // ── Kiralama bilgileri ──
  renterName?: string;
  renterPhone?: string;
  rentalStart?: string;
  rentalEnd?: string;
  rentalPeriod?: string;
  dailyPrice?: number; // Representing Kira Ucreti
  rentalDebt?: number; // E.g., 144.000
  rentalCollected?: number; // Tahsil edilen toplam tutar
  rentalPaymentStatus?: string; // Alındı, Alınmadı
  rentalInvoiceStatus?: string; // Kesildi, Kesilmedi
  // ── Evrak / Belge ──
  purchaseDoc?: string;
  saleDoc?: string;
  rentalDoc?: string; // Kira sözleşmesi
  saleContractDoc?: string; // Araç Satış Sözleşmesi
  // ────────────────────────
  // ────────────────────────
  createdAt?: number;
  order?: number; // Excel'deki gibi spesifik bir sırası numarası 1, 2, 3...
};

export type Partner = {
  id?: string;
  name: string;
  share: number;
  balance: number;
};

export type Expense = {
  id?: string;
  label: string;
  amount: number;
  month: string;
  category: string;
};

export type Customer = {
  id?: string;
  name: string;
  phone: string;
  email: string;
  plate: string;         // ilgilendiği plaka
  source: string;        // nasıl bulduk: Sahibinden, Instagram, Tavsiye...
  status: 'Yeni' | 'Görüşme' | 'Teklif' | 'Satış' | 'Kaybedildi';
  notes: string;
  createdAt?: number;
};

export function useVehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'ertas_vehicles'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setVehicles(snap.docs.map(d => ({ id: d.id, ...d.data() } as Vehicle)));
      setLoading(false);
    });
    return unsub;
  }, []);

  const add = async (v: Omit<Vehicle, 'id'>) => {
    await addDoc(collection(db, 'ertas_vehicles'), { ...v, createdAt: Date.now() });
  };

  const update = async (id: string, v: Partial<Vehicle>) => {
    await updateDoc(doc(db, 'ertas_vehicles', id), v as any);
  };

  const remove = async (id: string) => {
    await deleteDoc(doc(db, 'ertas_vehicles', id));
  };

  return { vehicles, loading, add, update, remove };
}

export function usePartners() {
  const [partners, setPartners] = useState<Partner[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'ertas_partners'), snap => {
      setPartners(snap.docs.map(d => ({ id: d.id, ...d.data() } as Partner)));
    });
    return unsub;
  }, []);

  const updateBalance = async (id: string, delta: number) => {
    const p = partners.find(x => x.id === id);
    if (!p) return;
    await updateDoc(doc(db, 'ertas_partners', id), { balance: p.balance + delta });
  };

  return { partners, updateBalance };
}

export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'ertas_expenses'), orderBy('month', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Expense)));
    });
    return unsub;
  }, []);

  const add = async (e: Omit<Expense, 'id'>) => {
    await addDoc(collection(db, 'ertas_expenses'), e);
  };

  const remove = async (id: string) => {
    await deleteDoc(doc(db, 'ertas_expenses', id));
  };

  return { expenses, add, remove };
}

export type Income = {
  id?: string;
  label: string;
  amount: number;
  month: string;
  category: string;
};

export function useIncomes() {
  const [incomes, setIncomes] = useState<Income[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'ertas_incomes'), orderBy('month', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setIncomes(snap.docs.map(d => ({ id: d.id, ...d.data() } as Income)));
    });
    return unsub;
  }, []);

  const add = async (e: Omit<Income, 'id'>) => {
    await addDoc(collection(db, 'ertas_incomes'), e);
  };

  const remove = async (id: string) => {
    await deleteDoc(doc(db, 'ertas_incomes', id));
  };

  return { incomes, add, remove };
}

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'ertas_customers'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Customer)));
      setLoading(false);
    });
    return unsub;
  }, []);

  const add = async (c: Omit<Customer, 'id'>) => {
    await addDoc(collection(db, 'ertas_customers'), { ...c, createdAt: Date.now() });
  };

  const update = async (id: string, c: Partial<Customer>) => {
    await updateDoc(doc(db, 'ertas_customers', id), c as any);
  };

  const remove = async (id: string) => {
    await deleteDoc(doc(db, 'ertas_customers', id));
  };

  return { customers, loading, add, update, remove };
}

export type VehicleExpense = {
  id?: string;
  label: string;   // örn: "Boya", "Lastik", "Ekspertiz"
  amount: number;
  createdAt?: number;
};

export function useVehicleExpenses(vehicleId: string | null) {
  const [items, setItems] = useState<VehicleExpense[]>([]);

  useEffect(() => {
    if (!vehicleId) { setItems([]); return; }
    const q = query(
      collection(db, 'ertas_vehicles', vehicleId, 'expenses'),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(q, snap => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as VehicleExpense)));
    });
    return unsub;
  }, [vehicleId]);

  const add = async (item: Omit<VehicleExpense, 'id'>) => {
    if (!vehicleId) return;
    await addDoc(
      collection(db, 'ertas_vehicles', vehicleId, 'expenses'),
      { ...item, createdAt: Date.now() }
    );
  };

  const remove = async (expId: string) => {
    if (!vehicleId) return;
    await deleteDoc(doc(db, 'ertas_vehicles', vehicleId, 'expenses', expId));
  };

  const total = items.reduce((s, e) => s + (e.amount || 0), 0);

  return { items, add, remove, total };
}

export type RentalVehicle = {
  id?: string;
  brand: string;
  model: string;
  year: number;
  plate: string;
  color: string;
  km: number;
  dailyPrice: number;
  status: 'Müsait' | 'Kiralandı' | 'Serviste' | 'Bakımda';
  renterName: string;
  renterPhone: string;
  rentalStart: string;  // "2026-03-24"
  rentalEnd: string;
  notes: string;
  image: string;
  createdAt?: number;
};

export function useRentalVehicles() {
  const [rentals, setRentals] = useState<RentalVehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'ertas_rentals'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setRentals(snap.docs.map(d => ({ id: d.id, ...d.data() } as RentalVehicle)));
      setLoading(false);
    });
    return unsub;
  }, []);

  const add = async (v: Omit<RentalVehicle, 'id'>) =>
    addDoc(collection(db, 'ertas_rentals'), { ...v, createdAt: Date.now() });

  const update = async (id: string, v: Partial<RentalVehicle>) =>
    updateDoc(doc(db, 'ertas_rentals', id), v as any);

  const remove = async (id: string) =>
    deleteDoc(doc(db, 'ertas_rentals', id));

  return { rentals, loading, add, update, remove };
}

// ─── KASA (Nakit Giriş/Çıkış) ─────────────────────────────────────────────
export type KasaHareket = {
  id?: string;
  tarih: string;
  hesap: string;       // NAKİT, ZİRAAT-1, İŞ-1, HALK-1, VAKIF-1, ...
  tur: 'giris' | 'cikis';
  tutar: number;
  aciklama: string;
  createdAt?: number;
};

export function useKasa() {
  const [hareketler, setHareketler] = useState<KasaHareket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'ertas_kasa'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setHareketler(snap.docs.map(d => ({ id: d.id, ...d.data() } as KasaHareket)));
      setLoading(false);
    });
    return unsub;
  }, []);

  const add = async (h: Omit<KasaHareket, 'id'>) =>
    addDoc(collection(db, 'ertas_kasa'), { ...h, createdAt: Date.now() });

  const update = async (id: string, h: Partial<KasaHareket>) =>
    updateDoc(doc(db, 'ertas_kasa', id), h as any);

  const remove = async (id: string) =>
    deleteDoc(doc(db, 'ertas_kasa', id));

  return { hareketler, loading, add, update, remove };
}

// ─── ALACAK-BORÇ ────────────────────────────────────────────────────────────
export type AlacakBorc = {
  id?: string;
  borclu: string;
  tur: 'acik' | 'cek' | 'senet' | 'borc';
  tutar: number;
  tahsil: number;
  vade: string;
  verilisTarihi: string;
  aciklama: string;
  createdAt?: number;
};

export function useAlacakBorc() {
  const [kayitlar, setKayitlar] = useState<AlacakBorc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'ertas_alacak'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setKayitlar(snap.docs.map(d => ({ id: d.id, ...d.data() } as AlacakBorc)));
      setLoading(false);
    });
    return unsub;
  }, []);

  const add = async (a: Omit<AlacakBorc, 'id'>) =>
    addDoc(collection(db, 'ertas_alacak'), { ...a, createdAt: Date.now() });

  const update = async (id: string, a: Partial<AlacakBorc>) =>
    updateDoc(doc(db, 'ertas_alacak', id), a as any);

  const remove = async (id: string) =>
    deleteDoc(doc(db, 'ertas_alacak', id));

  return { kayitlar, loading, add, update, remove };
}

// ─── ORTAK HAREKETLERİ (Cari Hesap) ────────────────────────────────────────
export type OrtakHareket = {
  id?: string;
  ortak: string;
  tur: 'alacak' | 'borc';
  tutar: number;
  tarih: string;
  aciklama: string;
  createdAt?: number;
};

export function useOrtakHareketler() {
  const [hareketler, setHareketler] = useState<OrtakHareket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'ertas_ortak_hareketler'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setHareketler(snap.docs.map(d => ({ id: d.id, ...d.data() } as OrtakHareket)));
      setLoading(false);
    });
    return unsub;
  }, []);

  const add = async (h: Omit<OrtakHareket, 'id'>) =>
    addDoc(collection(db, 'ertas_ortak_hareketler'), { ...h, createdAt: Date.now() });

  const remove = async (id: string) =>
    deleteDoc(doc(db, 'ertas_ortak_hareketler', id));

  return { hareketler, loading, add, remove };
}

export async function uploadImage(file: File, path: string): Promise<string> {
  const r = ref(storage, path);
  await uploadBytes(r, file);
  return getDownloadURL(r);
}
