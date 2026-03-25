import { useState, useMemo } from 'react';
import { Plus, Trash2, X, Save } from 'lucide-react';
import { useOrtakHareketler } from './hooks';

const fmt = (v: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(v);

const ORTAKLAR = ['Tamer YALINIZ', 'Feramiz YALINIZ', 'Mehmet BAYDUMAN'];

export default function OrtakCariTab() {
  const { hareketler, add, remove } = useOrtakHareketler();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    ortak: ORTAKLAR[0],
    tur: 'alacak' as 'alacak' | 'borc',
    tutar: '',
    tarih: new Date().toISOString().slice(0, 10),
    aciklama: ''
  });

  const handleSave = async () => {
    const tutar = parseFloat(form.tutar);
    if (!tutar) return alert('Tutar giriniz.');
    await add({
      ortak: form.ortak,
      tur: form.tur,
      tutar,
      tarih: form.tarih,
      aciklama: form.aciklama
    });
    setForm({ ortak: ORTAKLAR[0], tur: 'alacak', tutar: '', tarih: new Date().toISOString().slice(0, 10), aciklama: '' });
    setShowModal(false);
  };

  // Ortak bazlı bakiyeler
  const bakiyeler = useMemo(() => {
    return ORTAKLAR.map(ad => {
      const ortakHareketleri = hareketler.filter(h => h.ortak === ad);
      const alacak = ortakHareketleri.filter(h => h.tur === 'alacak').reduce((s, h) => s + h.tutar, 0);
      const borc = ortakHareketleri.filter(h => h.tur === 'borc').reduce((s, h) => s + h.tutar, 0);
      return { ad, alacak, borc, bakiye: alacak - borc, hareketSayisi: ortakHareketleri.length };
    });
  }, [hareketler]);

  const toplamAlacak = bakiyeler.reduce((s, b) => s + b.alacak, 0);
  const toplamBorc = bakiyeler.reduce((s, b) => s + b.borc, 0);

  const [filtreOrtak, setFiltreOrtak] = useState('Tümü');

  const filteredHareketler = hareketler.filter(h =>
    filtreOrtak === 'Tümü' || h.ortak === filtreOrtak
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold">👥 Ortak Cari Hesap</h2>
          <p className="text-slate-400 mt-1 text-sm">Alacak / Borç bakiye takibi ve hareket geçmişi</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-violet-500/20 transition-all">
          <Plus size={18} /> Hareket Ekle
        </button>
      </div>

      {/* Ortak Bakiye Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-4">
        {bakiyeler.map(b => (
          <div key={b.ad}
            onClick={() => setFiltreOrtak(filtreOrtak === b.ad ? 'Tümü' : b.ad)}
            className={`bg-slate-900/50 rounded-2xl border p-5 hover:border-slate-600 transition-all cursor-pointer ${filtreOrtak === b.ad ? 'border-violet-500/50 bg-violet-500/5' : 'border-slate-800'}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-violet-500/20 rounded-xl flex items-center justify-center font-bold text-violet-400 text-lg">
                {b.ad.charAt(0)}
              </div>
              <div>
                <p className="font-bold text-sm">{b.ad}</p>
                <p className="text-[10px] text-slate-500">{b.hareketSayisi} hareket</p>
              </div>
            </div>
            <p className={`text-2xl font-bold ${b.bakiye >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {fmt(Math.abs(b.bakiye))}
            </p>
            <p className="text-[10px] font-bold mt-1">
              {b.bakiye >= 0 ? (
                <span className="text-emerald-400">▲ Şirketten Alacaklı</span>
              ) : (
                <span className="text-red-400">▼ Şirkete Borçlu</span>
              )}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
              <div className="bg-slate-800/50 rounded-lg px-2 py-1">
                <span className="text-slate-500">Gelen:</span>
                <span className="text-emerald-400 font-bold ml-1">{new Intl.NumberFormat('tr-TR').format(b.alacak)}</span>
              </div>
              <div className="bg-slate-800/50 rounded-lg px-2 py-1">
                <span className="text-slate-500">Giden:</span>
                <span className="text-red-400 font-bold ml-1">{new Intl.NumberFormat('tr-TR').format(b.borc)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Toplam Özet */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 text-center">
          <p className="text-[10px] font-bold text-slate-500 uppercase">Toplam Gelen (Alacak)</p>
          <p className="text-xl font-bold text-emerald-400 mt-1">{fmt(toplamAlacak)}</p>
        </div>
        <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4 text-center">
          <p className="text-[10px] font-bold text-slate-500 uppercase">Toplam Giden (Borç)</p>
          <p className="text-xl font-bold text-red-400 mt-1">{fmt(toplamBorc)}</p>
        </div>
      </div>

      {/* Filtre */}
      {filtreOrtak !== 'Tümü' && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Filtre:</span>
          <span className="text-xs font-bold text-violet-400 bg-violet-500/10 px-2 py-1 rounded-lg border border-violet-500/20">
            {filtreOrtak}
          </span>
          <button onClick={() => setFiltreOrtak('Tümü')} className="text-xs text-slate-500 hover:text-white ml-1">✕ Kaldır</button>
        </div>
      )}

      {/* Hareket Tablosu */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-800 text-slate-400 text-[11px] uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3">Ortak</th>
              <th className="px-4 py-3">Açıklama</th>
              <th className="px-4 py-3 text-right">Tutar ₺</th>
              <th className="px-4 py-3">Tür</th>
              <th className="px-4 py-3">Tarih</th>
              <th className="px-4 py-3 w-16"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filteredHareketler.map(h => (
              <tr key={h.id} className="hover:bg-slate-800/30 transition-colors group">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-violet-500/20 rounded-lg flex items-center justify-center text-xs font-bold text-violet-400">
                      {h.ortak.charAt(0)}
                    </div>
                    <span className="font-bold text-sm">{h.ortak}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-slate-300">{h.aciklama || '—'}</td>
                <td className="px-4 py-3 text-right font-bold text-sm">
                  {new Intl.NumberFormat('tr-TR').format(h.tutar)}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${h.tur === 'alacak' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                    {h.tur === 'alacak' ? 'GELEN' : 'GİDEN'}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-400">{h.tarih || '—'}</td>
                <td className="px-4 py-3">
                  <button onClick={() => remove(h.id!)}
                    className="p-1.5 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
            {filteredHareketler.length === 0 && (
              <tr><td colSpan={6} className="text-center py-12 text-slate-500">
                {filtreOrtak !== 'Tümü' ? `${filtreOrtak} için hareket bulunamadı.` : 'Henüz hareket yok.'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-xl font-bold">👥 Ortak Hareketi Ekle</h2>
              <button onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Ortak</label>
                  <select value={form.ortak} onChange={e => setForm(p => ({ ...p, ortak: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 mt-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-600/50">
                    {ORTAKLAR.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">İşlem Türü</label>
                  <select value={form.tur} onChange={e => setForm(p => ({ ...p, tur: e.target.value as 'alacak' | 'borc' }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 mt-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-600/50">
                    <option value="alacak">Alacak (Gelen)</option>
                    <option value="borc">Borç (Giden)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Tarih</label>
                  <input type="date" value={form.tarih} onChange={e => setForm(p => ({ ...p, tarih: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 mt-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-600/50" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Tutar (₺) *</label>
                  <input type="number" placeholder="0" value={form.tutar}
                    onChange={e => setForm(p => ({ ...p, tutar: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 mt-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-600/50" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Açıklama</label>
                <input type="text" placeholder="Zekat, Nakit, Havale..." value={form.aciklama}
                  onChange={e => setForm(p => ({ ...p, aciklama: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 mt-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-600/50" />
              </div>
            </div>
            <div className="p-6 border-t border-slate-800 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-800">İptal</button>
              <button onClick={handleSave} className="px-8 py-2.5 rounded-xl text-sm font-bold bg-violet-600 hover:bg-violet-500 flex items-center gap-2">
                <Save size={16} /> Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
