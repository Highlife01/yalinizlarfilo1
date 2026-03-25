import { useState, useMemo } from 'react';
import { Plus, Trash2, X, Save, Search, Edit2 } from 'lucide-react';
import { useAlacakBorc, type AlacakBorc } from './hooks';

const fmt = (v: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(v);
const fn = (v: number) => new Intl.NumberFormat('tr-TR').format(v);

type TabKey = 'acik' | 'cek' | 'senet' | 'borc';

const TAB_CONFIG: { key: TabKey; label: string; emoji: string; color: string; border: string; bg: string }[] = [
  { key: 'acik', label: 'Açık Alacak', emoji: '📋', color: 'text-green-400', border: 'border-green-500/20', bg: 'bg-green-500/5' },
  { key: 'cek', label: 'Çek Alacakları', emoji: '🏦', color: 'text-blue-400', border: 'border-blue-500/20', bg: 'bg-blue-500/5' },
  { key: 'senet', label: 'Senet', emoji: '📜', color: 'text-amber-400', border: 'border-amber-500/20', bg: 'bg-amber-500/5' },
  { key: 'borc', label: 'Verecek (Borç)', emoji: '💸', color: 'text-red-400', border: 'border-red-500/20', bg: 'bg-red-500/5' },
];

export default function AlacakBorcTab() {
  const { kayitlar, add, update, remove } = useAlacakBorc();
  const [activeTab, setActiveTab] = useState<TabKey>('acik');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState('');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    borclu: '', tur: 'acik' as AlacakBorc['tur'], tutar: '', tahsil: '', vade: '', verilisTarihi: '', aciklama: ''
  });

  const handleSave = async () => {
    const tutar = parseFloat(form.tutar);
    if (!tutar || !form.borclu) return alert('Kişi/Firma adı ve tutar giriniz.');
    
    if (editId) {
      await update(editId, {
        borclu: form.borclu, tur: form.tur, tutar, tahsil: parseFloat(form.tahsil) || 0,
        vade: form.vade, verilisTarihi: form.verilisTarihi, aciklama: form.aciklama
      });
    } else {
      await add({
        borclu: form.borclu, tur: form.tur, tutar, tahsil: parseFloat(form.tahsil) || 0,
        vade: form.vade, verilisTarihi: form.verilisTarihi, aciklama: form.aciklama
      });
    }
    setForm({ borclu: '', tur: activeTab, tutar: '', tahsil: '', vade: '', verilisTarihi: '', aciklama: '' });
    setEditId('');
    setShowModal(false);
  };

  const handleEdit = (k: AlacakBorc) => {
    setEditId(k.id!);
    setForm({
      borclu: k.borclu,
      tur: k.tur,
      tutar: String(k.tutar),
      tahsil: String(k.tahsil || 0),
      vade: k.vade || '',
      verilisTarihi: k.verilisTarihi || '',
      aciklama: k.aciklama || ''
    });
    setShowModal(true);
  };

  const handleTahsilat = async (kayit: AlacakBorc) => {
    const isBorc = kayit.tur === 'borc';
    const amount = prompt(`${kayit.borclu} için ${isBorc ? 'ödeme' : 'tahsilat'} tutarı girin (₺):`, '');
    if (!amount) return;
    const tahsil = parseFloat(amount);
    if (!tahsil || tahsil <= 0) return;
    await update(kayit.id!, { tahsil: (kayit.tahsil || 0) + tahsil });
  };

  const today = new Date().toISOString().slice(0, 10);

  // Her kategori için istatistikler
  const statsByType = useMemo(() => {
    const result: Record<string, { toplam: number; tahsil: number; kalan: number; count: number }> = {};
    for (const tab of TAB_CONFIG) {
      const items = kayitlar.filter(k => k.tur === tab.key);
      const toplam = items.reduce((s, k) => s + k.tutar, 0);
      const tahsil = items.reduce((s, k) => s + (k.tahsil || 0), 0);
      result[tab.key] = { toplam, tahsil, kalan: toplam - tahsil, count: items.length };
    }
    return result;
  }, [kayitlar]);

  const genelToplam = Object.values(statsByType).reduce((a, s) => a + s.kalan, 0);

  // Aktif tab'ın verileri
  const filtered = kayitlar
    .filter(k => k.tur === activeTab)
    .filter(k => !search || `${k.borclu} ${k.aciklama}`.toLowerCase().includes(search.toLowerCase()));

  const openAdd = () => {
    setEditId('');
    setForm({ borclu: '', tur: activeTab, tutar: '', tahsil: '', vade: '', verilisTarihi: '', aciklama: '' });
    setShowModal(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold">📋 Alacak & Borç Takibi</h2>
          <p className="text-slate-400 mt-1 text-sm">Alacak, borç, çek ve senet kayıtları · Kalan Genel Bakiye: <span className="font-bold text-amber-400">{fmt(genelToplam)}</span></p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/20 transition-all">
          <Plus size={18} /> Kayıt Ekle
        </button>
      </div>

      {/* Kategori Kartları + Tab Seçimi */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {TAB_CONFIG.map(tab => {
          const s = statsByType[tab.key] || { toplam: 0, tahsil: 0, kalan: 0, count: 0 };
          const isActive = activeTab === tab.key;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`text-left p-5 rounded-2xl border transition-all ${isActive ? `${tab.bg} ${tab.border} ring-2 ring-offset-0 ring-offset-slate-950 ring-${tab.key === 'acik' ? 'green' : tab.key === 'cek' ? 'blue' : 'amber'}-500/30 scale-[1.02]` : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'}`}>
              <div className="flex items-center justify-between">
                <span className="text-lg">{tab.emoji}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${isActive ? tab.bg + ' ' + tab.color : 'bg-slate-800 text-slate-400'}`}>{s.count} kayıt</span>
              </div>
              <p className={`text-xs font-bold mt-2 ${isActive ? tab.color : 'text-slate-400'}`}>{tab.label}</p>
              <p className="text-xl font-bold mt-1">{fmt(s.kalan)}</p>
              {s.tahsil > 0 && (
                <div className="mt-2">
                  <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full ${tab.key === 'borc' ? 'bg-red-500' : tab.key === 'acik' ? 'bg-green-500' : tab.key === 'cek' ? 'bg-blue-500' : 'bg-amber-500'} transition-all`}
                      style={{ width: `${Math.min(100, (s.tahsil / s.toplam) * 100)}%` }} />
                  </div>
                  <p className="text-[9px] text-slate-500 mt-0.5">%{((s.tahsil / s.toplam) * 100).toFixed(0)} tahsil</p>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Arama */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Kişi adı veya açıklama ara..."
          className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/50" />
      </div>

      {/* Tablo */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-800 text-slate-400 text-[11px] uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3">Veriliş</th>
              <th className="px-4 py-3">{activeTab === 'borc' ? 'Alacaklı' : 'Borçlu'}</th>
              <th className="px-4 py-3">Vade</th>
              <th className="px-4 py-3 text-right">{activeTab === 'borc' ? 'Borç ₺' : 'Alacak ₺'}</th>
              <th className="px-4 py-3 text-right">{activeTab === 'borc' ? 'Ödenen ₺' : 'Gelen ₺'}</th>
              <th className="px-4 py-3 text-right">Kalan ₺</th>
              <th className="px-4 py-3">Açıklama</th>
              <th className="px-4 py-3 w-24"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filtered.map(k => {
              const kalan = k.tutar - (k.tahsil || 0);
              const gecikmi = k.vade && k.vade < today && kalan > 0;
              return (
                <tr key={k.id} className={`hover:bg-slate-800/30 transition-colors group ${gecikmi ? 'bg-red-500/5' : ''}`}>
                  <td className="px-4 py-3 text-xs text-slate-400">{k.verilisTarihi || '—'}</td>
                  <td className="px-4 py-3 font-bold text-sm">{k.borclu}</td>
                  <td className={`px-4 py-3 text-xs ${gecikmi ? 'text-red-400 font-bold' : 'text-slate-400'}`}>
                    {k.vade || '—'}{gecikmi && <span className="ml-1">⚠</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-bold text-emerald-400">{fn(k.tutar)}</td>
                  <td className="px-4 py-3 text-right text-xs font-bold text-blue-400">{fn(k.tahsil || 0)}</td>
                  <td className={`px-4 py-3 text-right text-xs font-bold ${kalan > 0 ? (gecikmi ? 'text-red-400' : 'text-amber-400') : 'text-emerald-400'}`}>
                    {fn(kalan)}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 max-w-[200px] truncate">{k.aciklama || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {kalan > 0 && (
                        <button onClick={() => handleTahsilat(k)}
                          className={`px-2 py-1 text-[10px] font-bold border rounded-lg transition-colors ${activeTab === 'borc' ? 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20'}`}>
                          {activeTab === 'borc' ? 'ÖDE' : 'TAHSİL'}
                        </button>
                      )}
                      <button onClick={() => handleEdit(k)}
                        className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-blue-400">
                        <Edit2 size={13} />
                      </button>
                      <button onClick={() => remove(k.id!)}
                        className="p-1.5 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-400">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="text-center py-12 text-slate-500">Bu kategoride kayıt yok.</td></tr>
            )}
          </tbody>
          {filtered.length > 0 && (
            <tfoot className="bg-slate-800/40">
              <tr className="font-bold text-xs">
                <td colSpan={3} className="px-4 py-2.5 text-slate-400">TOPLAM</td>
                <td className="px-4 py-2.5 text-right text-emerald-400">{fn(filtered.reduce((s, k) => s + k.tutar, 0))}</td>
                <td className="px-4 py-2.5 text-right text-blue-400">{fn(filtered.reduce((s, k) => s + (k.tahsil || 0), 0))}</td>
                <td className="px-4 py-2.5 text-right text-amber-400">{fn(filtered.reduce((s, k) => s + (k.tutar - (k.tahsil || 0)), 0))}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-xl font-bold">{editId ? '📋 Kaydı Düzenle' : '📋 Yeni Kayıt Ekle'}</h2>
              <button onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">{activeTab === 'borc' ? 'Alacaklı Kişi/Firma *' : 'Borçlu Kişi/Firma *'}</label>
                  <input type="text" placeholder="Kişi / Firma" value={form.borclu}
                    onChange={e => setForm(p => ({ ...p, borclu: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 mt-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/50" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Kayıt Türü</label>
                  <select value={form.tur} onChange={e => setForm(p => ({ ...p, tur: e.target.value as AlacakBorc['tur'] }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 mt-1.5 text-sm">
                    <option value="acik">Açık Alacak</option>
                    <option value="cek">Alınan Çek</option>
                    <option value="senet">Senet</option>
                    <option value="borc">Borç (Bizim Vereceğimiz)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">{form.tur === 'borc' ? 'Borç Tutarı (₺) *' : 'Alacak Tutarı (₺) *'}</label>
                  <input type="number" placeholder="0" value={form.tutar}
                    onChange={e => setForm(p => ({ ...p, tutar: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 mt-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/50" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">{form.tur === 'borc' ? 'Ödenen (₺)' : 'Gelen / Tahsil (₺)'}</label>
                  <input type="number" placeholder="0" value={form.tahsil}
                    onChange={e => setForm(p => ({ ...p, tahsil: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 mt-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/50" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Veriliş Tarihi</label>
                  <input type="date" value={form.verilisTarihi}
                    onChange={e => setForm(p => ({ ...p, verilisTarihi: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 mt-1.5 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Vade Tarihi</label>
                  <input type="date" value={form.vade}
                    onChange={e => setForm(p => ({ ...p, vade: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 mt-1.5 text-sm" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Açıklama</label>
                <input type="text" placeholder="Araç plaka, detay..." value={form.aciklama}
                  onChange={e => setForm(p => ({ ...p, aciklama: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 mt-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/50" />
              </div>
            </div>
            <div className="p-6 border-t border-slate-800 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-800">İptal</button>
              <button onClick={handleSave} className="px-8 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-500 flex items-center gap-2">
                <Save size={16} /> Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
