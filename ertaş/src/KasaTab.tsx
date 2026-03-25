import { useState, useMemo, useEffect } from 'react';
import { Plus, Trash2, X, Save, Wallet, ArrowDownRight, ArrowUpRight, TrendingUp, DollarSign } from 'lucide-react';
import { useKasa, type KasaHareket } from './hooks';
import { useKurlar } from './hooks/useKurlar';

const fmt = (v: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 }).format(v);
// fmtCnv is kept for future foreign‑currency formatting but not used yet
const fmtCnv = (v: number, cur: string) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: cur, maximumFractionDigits: 2 }).format(v);

const HESAPLAR = [
  'ZİRAAT FİLO',
  'ZİRAAT FERAMİZ Y',
  'İŞ BANKASI FİLO',
  'İŞ BANKASI FERAMİZ Y',
  'VAKIF FİLO',
  'VAKIF FERAMİZ Y',
  'TEB FİLO',
  'KASA NAKİT',
  'KASA EURO',
  'KASA DOLAR',
  'KASA ALTIN',
  'DİĞER'
];

export default function KasaTab() {
  const { hareketler, add, remove } = useKasa();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    tarih: new Date().toISOString().slice(0, 10),
    hesap: 'ZİRAAT FİLO',
    tur: 'giris' as 'giris' | 'cikis',
    tutar: '',
    aciklama: ''
  });

  // Centralized exchange rates from Firestore via useKurlar hook
  const kurlar = useKurlar();

  const handleSave = async () => {
  const tutar = parseFloat(form.tutar);
  if (isNaN(tutar) || tutar <= 0) {
    alert('Pozitif bir tutar giriniz.');
    return;
  }
  try {
    await add({
      tarih: form.tarih,
      hesap: form.hesap,
      tur: form.tur,
      tutar,
      aciklama: form.aciklama
    });
    setForm({ tarih: new Date().toISOString().slice(0, 10), hesap: 'ZİRAAT FİLO', tur: 'giris', tutar: '', aciklama: '' });
    setShowModal(false);
  } catch (e) {
    console.error(e);
    alert('Kasa hareketi kaydedilirken bir hata oluştu.');
  }
};

  // Hesap bazlı bakiyeler
  const hesapBakiye = useMemo(() => {
    const map: Record<string, { giris: number; cikis: number }> = {};
    hareketler.forEach(h => {
      if (!map[h.hesap]) map[h.hesap] = { giris: 0, cikis: 0 };
      if (h.tur === 'giris') map[h.hesap].giris += h.tutar;
      else map[h.hesap].cikis += h.tutar;
    });
    return map;
  }, [hareketler]);

  let toplamGirisTL = 0;
  let toplamCikisTL = 0;

  hareketler.forEach(h => {
    if (!['KASA EURO', 'KASA DOLAR', 'KASA ALTIN'].includes(h.hesap)) {
      if (h.tur === 'giris') toplamGirisTL += h.tutar;
      else toplamCikisTL += h.tutar;
    }
  });

  const netKasaTL = toplamGirisTL - toplamCikisTL;
  
  const kalanEuro = (hesapBakiye['KASA EURO']?.giris || 0) - (hesapBakiye['KASA EURO']?.cikis || 0);
  const kalanDolar = (hesapBakiye['KASA DOLAR']?.giris || 0) - (hesapBakiye['KASA DOLAR']?.cikis || 0);
  const kalanAltin = (hesapBakiye['KASA ALTIN']?.giris || 0) - (hesapBakiye['KASA ALTIN']?.cikis || 0);

  // Memoize net genel kasa TL to recalculate when any dependent changes
  const netGenelKasaTL = useMemo(() => {
    return netKasaTL + (kalanEuro * kurlar.euro) + (kalanDolar * kurlar.dolar) + (kalanAltin * kurlar.altin);
  }, [netKasaTL, kalanEuro, kalanDolar, kalanAltin, kurlar]);

  // Tarih sıralı + kümülatif (TL hareketleri)
  const sorted = useMemo(() => {
    const arr = [...hareketler].sort((a, b) => (a.tarih || '').localeCompare(b.tarih || ''));
    let cum = 0;
    return arr.map(h => {
      if (!['KASA EURO', 'KASA DOLAR', 'KASA ALTIN'].includes(h.hesap)) {
        cum += h.tur === 'giris' ? h.tutar : -h.tutar;
      }
      return { ...h, kumulatif: cum };
    });
  }, [hareketler]);

  const aktifHesaplarTL = HESAPLAR.filter(h => hesapBakiye[h] && !['KASA EURO', 'KASA DOLAR', 'KASA ALTIN'].includes(h));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold">💰 Kasa Yönetimi</h2>
          <p className="text-slate-400 mt-1 text-sm">Günlük nakit giriş / çıkış takibi · Hesap bazlı bakiyeler</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-amber-500/20 transition-all">
          <Plus size={18} /> Kasa Hareketi
        </button>
      </div>

      {/* Döviz ve Altın Kartları (Her Zaman Açık) */}
      <h3 className="font-bold text-lg text-amber-400 mt-6 pt-4 border-t border-slate-800 flex items-center gap-2"><TrendingUp size={18} /> Döviz & Altın Kasası</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* EURO */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rounded-bl-[40px] flex items-center justify-center font-bold text-blue-500 text-2xl">€</div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kasa Euro</p>
          <p className={`text-3xl font-bold ${kalanEuro >= 0 ? 'text-white' : 'text-red-400'}`}>{new Intl.NumberFormat('tr-TR').format(Math.abs(kalanEuro))} € {kalanEuro < 0 && '(Ekside)'}</p>
          <div className="mt-2 flex items-center justify-between bg-slate-950/50 rounded-xl p-2 border border-slate-800">
             <span className="text-xs text-slate-400 pl-2">Güncel Kur:</span>
              <input type="number" step="0.01" min="0" value={kurlar.euro || ''} readOnly className="w-20 bg-transparent text-right font-bold focus:outline-none" placeholder="0.00" aria-label="Euro kuru" />
            </div>
            <div className="text-sm font-bold text-emerald-400 pt-2 border-t border-slate-800 text-right">
               Karşılık: {fmt(kalanEuro * kurlar.euro)}
            </div>
          </div>

        {/* DOLAR */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-bl-[40px] flex items-center justify-center font-bold text-emerald-500 text-2xl">$</div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kasa Dolar</p>
          <p className={`text-3xl font-bold ${kalanDolar >= 0 ? 'text-white' : 'text-red-400'}`}>{new Intl.NumberFormat('en-US').format(Math.abs(kalanDolar))} $ {kalanDolar < 0 && '(Ekside)'}</p>
          <div className="mt-2 flex items-center justify-between bg-slate-950/50 rounded-xl p-2 border border-slate-800">
             <span className="text-xs text-slate-400 pl-2">Güncel Kur:</span>
              <input type="number" step="0.01" min="0" value={kurlar.dolar || ''} readOnly className="w-20 bg-transparent text-right font-bold focus:outline-none" placeholder="0.00" aria-label="Dolar kuru" />
            </div>
            <div className="text-sm font-bold text-emerald-400 pt-2 border-t border-slate-800 text-right">
               Karşılık: {fmt(kalanDolar * kurlar.dolar)}
            </div>
          </div>

        {/* ALTIN */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/10 rounded-bl-[40px] flex items-center justify-center font-bold text-amber-500 text-xl">GR</div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kasa Altın (Gram)</p>
          <p className={`text-3xl font-bold ${kalanAltin >= 0 ? 'text-white' : 'text-red-400'}`}>{new Intl.NumberFormat('tr-TR').format(Math.abs(kalanAltin))} gr {kalanAltin < 0 && '(Ekside)'}</p>
          <div className="mt-2 flex items-center justify-between bg-slate-950/50 rounded-xl p-2 border border-slate-800">
             <span className="text-xs text-slate-400 pl-2">Güncel Gram ₺:</span>
              <input type="number" step="0.1" min="0" value={kurlar.altin || ''} readOnly className="w-20 bg-transparent text-right font-bold focus:outline-none" placeholder="0.0" aria-label="Altın gram fiyatı" />
            </div>
            <div className="text-sm font-bold text-emerald-400 pt-2 border-t border-slate-800 text-right">
               Karşılık: {fmt(kalanAltin * kurlar.altin)}
            </div>
          </div>

      </div>

      <h3 className="font-bold text-lg text-emerald-400 mt-6 pt-4 border-t border-slate-800">TL Hesapları & Bankalar</h3>

      {/* Hesap Bakiye Kartları (Sadece TL) */}
      {aktifHesaplarTL.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {aktifHesaplarTL.map(h => {
            const b = hesapBakiye[h];
            const kalan = b.giris - b.cikis;
            return (
              <div key={h} className="bg-slate-900/50 rounded-2xl border border-slate-800 p-4 hover:border-slate-700 transition-all">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">{h}</p>
                <p className={`text-lg font-bold mt-1 ${kalan >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {fmt(kalan)}
                </p>
                <p className="text-[10px] text-slate-600 mt-0.5">
                  G: {new Intl.NumberFormat('tr-TR').format(b.giris)} / Ç: {new Intl.NumberFormat('tr-TR').format(b.cikis)}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
         <div className="text-sm text-slate-500 italic">Henüz TL işlem hareketi yok.</div>
      )}

      {/* Özet Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <ArrowDownRight size={18} />
            <span className="text-xs font-bold uppercase">TL Giriş Toplamı</span>
          </div>
          <p className="text-2xl font-bold text-slate-300">{fmt(toplamGirisTL)}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <ArrowUpRight size={18} />
            <span className="text-xs font-bold uppercase">TL Çıkış Toplamı</span>
          </div>
          <p className="text-2xl font-bold text-slate-300">{fmt(toplamCikisTL)}</p>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5">
          <div className="flex items-center gap-2 text-amber-400 mb-2 font-bold uppercase tracking-widest text-[10px]">
            <Wallet size={16} /> GENEL KASA NET DURUMU (DÖVİZ/ALTIN DAHİL)
          </div>
          <p className={`text-3xl font-black ${netGenelKasaTL >= 0 ? 'text-amber-400' : 'text-red-400'}`}>{fmt(netGenelKasaTL)}</p>
          <p className="text-xs text-slate-500 mt-1">Belirttiğiniz kurlar üzerinden kümülatif çevrim yapılmıştır.</p>
        </div>
      </div>

      {/* Hareket Tablosu */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-800 text-slate-400 text-[11px] uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3">Tarih</th>
              <th className="px-4 py-3">Hesap/Kasa Tipi</th>
              <th className="px-4 py-3">Açıklama</th>
              <th className="px-4 py-3 text-right">Giriş</th>

              <th className="px-4 py-3 text-right">Çıkış ₺</th>
              <th className="px-4 py-3 text-right">Kümülatif ₺</th>
              <th className="px-4 py-3 w-16"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {sorted.map(h => (
              <tr key={h.id} className="hover:bg-slate-800/30 transition-colors group">
                <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{h.tarih || '—'}</td>
                <td className="px-4 py-3">
                  <span className="text-[10px] font-bold px-2 py-1 rounded-lg border bg-blue-500/10 text-blue-400 border-blue-500/20">
                    {h.hesap}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-300">{h.aciklama || '—'}</td>
                <td className="px-4 py-3 text-right text-xs font-bold text-emerald-400">
                  {h.tur === 'giris' ? new Intl.NumberFormat('tr-TR').format(h.tutar) : '—'}
                </td>
                <td className="px-4 py-3 text-right text-xs font-bold text-red-400">
                  {h.tur === 'cikis' ? new Intl.NumberFormat('tr-TR').format(h.tutar) : '—'}
                </td>
                <td className={`px-4 py-3 text-right text-xs font-bold ${h.kumulatif >= 0 ? 'text-amber-400' : 'text-red-400'}`}>
                  {new Intl.NumberFormat('tr-TR').format(h.kumulatif)}
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => remove(h.id!)}
  className="p-1.5 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
  aria-label="Kasa hareketini sil"
  tabIndex={0}
  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') remove(h.id!); }}>
  <Trash2 size={13} />
</button>
                </td>
              </tr>
            ))}
            {hareketler.length === 0 && (
              <tr><td colSpan={7} className="text-center py-12 text-slate-500">Henüz kasa hareketi yok.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onKeyDown={(e) => { if (e.key === 'Escape') setShowModal(false); }} tabIndex={-1}>
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md animate-in zoom-in-95 duration-200" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h2 id="modal-title" className="text-xl font-bold">💰 Kasa Hareketi Ekle</h2>
              <button onClick={() => setShowModal(false)} aria-label="Kasa hareketi modalını kapat"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Tarih</label>
                  <input type="date" value={form.tarih} onChange={e => setForm(p => ({ ...p, tarih: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 mt-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-600/50" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">İşlem Türü</label>
                  <select value={form.tur} onChange={e => setForm(p => ({ ...p, tur: e.target.value as 'giris' | 'cikis' }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 mt-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-600/50">
                    <option value="giris">GİRİŞ ↓</option>
                    <option value="cikis">ÇIKIŞ ↑</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Hesap / Kaynak</label>
                <select value={form.hesap} onChange={e => setForm(p => ({ ...p, hesap: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 mt-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-600/50">
                  {HESAPLAR.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Tutar (₺)</label>
                <input type="number" min="0" step="0.01" placeholder="0" value={form.tutar} onChange={e => setForm(p => ({ ...p, tutar: e.target.value }))}
  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 mt-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-600/50" aria-label="Kasa tutarı (TL)" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Açıklama</label>
                <input type="text" placeholder="İşlem detayı..." value={form.aciklama} onChange={e => setForm(p => ({ ...p, aciklama: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 mt-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-600/50" />
              </div>
            </div>
            <div className="p-6 border-t border-slate-800 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-800">İptal</button>
              <button onClick={handleSave} className="px-8 py-2.5 rounded-xl text-sm font-bold bg-amber-600 hover:bg-amber-500 flex items-center gap-2">
                <Save size={16} /> Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
