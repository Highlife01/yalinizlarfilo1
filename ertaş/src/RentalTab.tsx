import { useState } from 'react';
import { Edit2, Banknote, X, Check } from 'lucide-react';
import { type Vehicle } from './hooks';

const fmt = (v: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(v);

type Props = {
  vehicles: Vehicle[];
  updateVehicle: (id: string, v: Partial<Vehicle>) => Promise<void>;
  openEdit: (v: Vehicle) => void;
  openCari?: (v: Vehicle) => void;
  onTahsilat?: (vehicle: Vehicle, tutar: number) => Promise<void>;
};

export default function RentalTab({ vehicles, updateVehicle, openEdit, openCari, onTahsilat }: Props) {
  const [tahsilatId, setTahsilatId] = useState<string | null>(null);
  const [tahsilatTutar, setTahsilatTutar] = useState('');
  const [tahsilatLoading, setTahsilatLoading] = useState(false);

  // Sadece ana stoktaki statüsü "Kirada" olanları listeliyoruz.
  const rentals = vehicles
    .filter(v => v.status === 'Kirada')
    .sort((a, b) => {
      if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
      if (a.order !== undefined) return -1;
      if (b.order !== undefined) return 1;

      const pA = a.dailyPrice || a.salePrice || a.purchasePrice || 0;
      const pB = b.dailyPrice || b.salePrice || b.purchasePrice || 0;
      return pB - pA;
    });

  const inRentalCount = rentals.filter(r => r.status === 'Kirada').length;
  const toplamKiraGelir = rentals.reduce((a, r) => a + (r.dailyPrice || 0), 0);

  const handleTahsilat = async (vehicle: Vehicle) => {
    const tutar = parseFloat(tahsilatTutar);
    if (!tutar || tutar <= 0) {
      alert('Geçerli bir tutar girin!');
      return;
    }
    setTahsilatLoading(true);
    try {
      if (onTahsilat) {
        await onTahsilat(vehicle, tutar);
      }
      // Tahsilat tutarını araca kaydet + borç güncelle
      const mevcutTahsilat = vehicle.rentalCollected || 0;
      const kalanBorc = Math.max(0, (vehicle.rentalDebt || 0) - tutar);
      await updateVehicle(vehicle.id!, {
        rentalPaymentStatus: 'Alındı',
        rentalCollected: mevcutTahsilat + tutar,
        rentalDebt: kalanBorc,
      });
      setTahsilatId(null);
      setTahsilatTutar('');
    } catch (e) {
      alert('Tahsilat kaydedilirken hata oluştu!');
    }
    setTahsilatLoading(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold">Kiralık Araç Stoğu</h2>
          <p className="text-slate-400 mt-1 text-sm">🔄 Araç Stok tablosu ile orkestrasyonlu — Kiralık Filonuz.</p>
        </div>
      </div>

      {/* Durum kartları */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border p-5 text-center bg-pink-500/10 text-pink-400 border-pink-500/20">
          <p className="text-xs font-bold uppercase mt-1 opacity-80 mb-2">Şu an Kirada</p>
          <p className="text-4xl font-black">{inRentalCount}</p>
        </div>
        <div className="rounded-2xl border p-5 text-center bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
          <p className="text-xs font-bold uppercase mt-1 opacity-80 mb-2">Toplam Kira Geliri</p>
          <p className="text-2xl font-black">{fmt(toplamKiraGelir)}</p>
        </div>
      </div>

      {/* Tablo */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/50">
        <table className="w-full text-left text-xs whitespace-nowrap">
          <thead className="bg-slate-800 text-slate-400 text-[10px] uppercase tracking-wider sticky top-0">
            <tr>
              <th className="px-3 py-3 font-bold border-b border-slate-700 w-8">NO</th>
              <th className="px-3 py-3 font-bold border-b border-slate-700">Marka</th>
              <th className="px-3 py-3 font-bold border-b border-slate-700">Plaka</th>
              <th className="px-3 py-3 font-bold border-b border-slate-700">Durum</th>
              <th className="px-3 py-3 font-bold border-b border-slate-700">Kira Başlangıç</th>
              <th className="px-3 py-3 font-bold border-b border-slate-700 text-center">Süre</th>
              <th className="px-3 py-3 font-bold border-b border-slate-700">Kira Bitiş</th>
              <th className="px-3 py-3 font-bold border-b border-slate-700 text-right">Kira & Tahsilat</th>
              <th className="px-3 py-3 font-bold border-b border-slate-700">Kiralayan</th>
              <th className="px-3 py-3 font-bold border-b border-slate-700 text-right">Borç</th>
              <th className="px-3 py-3 font-bold border-b border-slate-700 text-center">Tahsilat İşlemi</th>
              <th className="px-3 py-3 font-bold border-b border-slate-700 text-center">Fatura</th>
              <th className="px-3 py-3 font-bold border-b border-slate-700 w-20">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rentals.map((r, idx) => (
              <tr key={r.id} onClick={() => openEdit(r)} className={`cursor-pointer group transition-colors ${r.status === 'Kirada' ? 'bg-pink-500/5 hover:bg-pink-500/10' : 'hover:bg-slate-800/30'}`}>
                <td className="px-3 py-2 text-center">
                   <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-black text-[10px]">{idx + 1}</span>
                </td>
                <td className="px-3 py-2 font-bold text-slate-200">{r.brand || '-'}</td>
                <td className="px-3 py-2">
                  <span className="font-mono text-[11px] bg-slate-800 border border-slate-700 px-2 py-1 rounded">{r.plate || '-'}</span>
                </td>
                <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                  <select value={r.status}
                    onChange={async e => await updateVehicle(r.id!, { status: e.target.value as Vehicle['status'] })}
                    className={`text-[10px] font-bold px-1.5 py-1 rounded-md border bg-slate-900 cursor-pointer focus:outline-none ${r.status === 'Kirada' ? 'text-pink-400 border-pink-500/30' : 'text-teal-400 border-teal-500/30'}`}>
                    <option value="Kiralık">Kiralık</option>
                    <option value="Kirada">Kirada</option>
                    <option value="Stokta">Stokta</option>
                    <option value="Serviste">Serviste</option>
                  </select>
                </td>
                <td className="px-3 py-2 font-mono text-slate-300">{r.rentalStart ? new Date(r.rentalStart).toLocaleDateString('tr-TR') : '-'}</td>
                <td className="px-3 py-2 text-center text-slate-300 font-bold">{r.rentalPeriod || '-'}</td>
                <td className="px-3 py-2 font-mono text-slate-300">{r.rentalEnd ? new Date(r.rentalEnd).toLocaleDateString('tr-TR') : '-'}</td>
                <td className="px-3 py-2">
                  <div className="text-right flex flex-col gap-0.5">
                    {r.dailyPrice ? <div className="text-xs font-bold text-teal-400">{fmt(r.dailyPrice)} <span className="text-[9px] text-teal-500/70 font-normal">/ Kira</span></div> : <div className="text-[10px] text-slate-500">Ücret Girilmedi</div>}
                    {r.rentalCollected ? <div className="text-[10px] font-bold text-emerald-400">+{fmt(r.rentalCollected)} <span className="text-[9px] text-emerald-500/70 font-normal">/ Tahsil</span></div> : null}
                  </div>
                </td>
                <td className="px-3 py-2 text-slate-200 font-medium">
                  {r.renterName ? r.renterName : '-'}
                  {r.renterPhone ? <span className="block text-[10px] text-slate-400">{r.renterPhone}</span> : null}
                </td>
                <td className="px-3 py-2 text-right font-bold text-rose-400">
                  {r.rentalDebt ? fmt(r.rentalDebt) : '-'}
                </td>
                <td className="px-3 py-2 text-center" onClick={e => e.stopPropagation()}>
                  {tahsilatId === r.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={tahsilatTutar}
                        onChange={e => setTahsilatTutar(e.target.value)}
                        placeholder="Tutar"
                        className="w-20 bg-slate-800 border border-emerald-500/50 rounded px-2 py-1 text-[11px] text-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        autoFocus
                        onKeyDown={e => { if (e.key === 'Enter') handleTahsilat(r); if (e.key === 'Escape') { setTahsilatId(null); setTahsilatTutar(''); } }}
                      />
                      <button onClick={() => handleTahsilat(r)} disabled={tahsilatLoading}
                        className="p-1 bg-emerald-600 hover:bg-emerald-500 rounded text-white disabled:opacity-50" title="Onayla">
                        <Check size={12} />
                      </button>
                      <button onClick={() => { setTahsilatId(null); setTahsilatTutar(''); }}
                        className="p-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-400" title="İptal">
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-1">
                      {r.rentalPaymentStatus && (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${r.rentalPaymentStatus === 'Alındı' ? 'bg-emerald-500/20 text-emerald-400' : r.rentalPaymentStatus === 'Alınmadı' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                          {r.rentalPaymentStatus}
                        </span>
                      )}
                      <button
                        onClick={() => { setTahsilatId(r.id!); setTahsilatTutar(r.dailyPrice ? String(r.dailyPrice) : ''); }}
                        className="p-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-lg transition-all" title="Tahsilat Al">
                        <Banknote size={14} />
                      </button>
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 text-center">
                  {r.rentalInvoiceStatus ? (
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${r.rentalInvoiceStatus === 'Kesildi' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                      {r.rentalInvoiceStatus}
                    </span>
                  ) : '-'}
                </td>
                <td className="px-3 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    {openCari && (
                      <button onClick={(e) => { e.stopPropagation(); openCari(r); }} className="p-1.5 hover:bg-amber-500/20 rounded-lg text-amber-500/80 hover:text-amber-400" title="Cari İşlemler">
                        🪙
                      </button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); openEdit(r); }} className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white" title="Düzenle">
                      <Edit2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rentals.length === 0 && (
              <tr><td colSpan={13} className="text-center py-12 text-slate-500">Kiralık stoğunuzda araç bulunamadı.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
