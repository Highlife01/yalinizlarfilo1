import { Edit2 } from 'lucide-react';
import { type Vehicle } from './hooks';

const fmt = (v: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(v);

type Props = {
  vehicles: Vehicle[];
  updateVehicle: (id: string, v: Partial<Vehicle>) => Promise<void>;
  openEdit: (v: Vehicle) => void;
  openCari?: (v: Vehicle) => void;
};

export default function RentalTab({ vehicles, updateVehicle, openEdit, openCari }: Props) {
  // Sadece ana stoktaki statüsü "Kiralık" veya "Kirada" olanları listeliyoruz.
  const rentals = vehicles.filter(v => v.status === 'Kiralık' || v.status === 'Kirada');

  const inRentalCount = rentals.filter(r => r.status === 'Kirada').length;
  const availableCount = rentals.filter(r => r.status === 'Kiralık').length;

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
        <div className="rounded-2xl border p-5 text-center bg-teal-500/10 text-teal-400 border-teal-500/20">
          <p className="text-xs font-bold uppercase mt-1 opacity-80 mb-2">Müsait (Bekleyen)</p>
          <p className="text-4xl font-black">{availableCount}</p>
        </div>
        <div className="rounded-2xl border p-5 text-center bg-pink-500/10 text-pink-400 border-pink-500/20">
          <p className="text-xs font-bold uppercase mt-1 opacity-80 mb-2">Şu an Kirada</p>
          <p className="text-4xl font-black">{inRentalCount}</p>
        </div>
      </div>

      {/* Tablo */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-800 text-slate-400 text-[11px] uppercase tracking-wider sticky top-0">
            <tr>
              <th className="px-4 py-3">Araç</th>
              <th className="px-4 py-3">Plaka</th>
              <th className="px-4 py-3 text-right">Günlük Ücret ₺</th>
              <th className="px-4 py-3">Kiralayan Bilgisi</th>
              <th className="px-4 py-3">Kira Tarihleri</th>
              <th className="px-4 py-3">Durum</th>
              <th className="px-4 py-3 w-16"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rentals.map(r => (
              <tr key={r.id} onClick={() => openEdit(r)} className={`cursor-pointer group transition-colors ${r.status === 'Kirada' ? 'bg-pink-500/5 hover:bg-pink-500/10' : 'hover:bg-slate-800/30'}`}>
                <td className="px-4 py-3">
                  <p className="font-bold text-sm">{r.brand} {r.series}</p>
                  <p className="text-[10px] text-slate-500">{r.year} · KM: {r.km ? r.km.toLocaleString('tr-TR') : '-'}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono text-xs bg-slate-800 border border-slate-700 px-2 py-0.5 rounded">{r.plate || '-'}</span>
                </td>
                <td className="px-4 py-3 font-bold text-emerald-400 text-xs text-right whitespace-nowrap">
                  {r.dailyPrice ? fmt(r.dailyPrice) : '—'}
                </td>
                <td className="px-4 py-3">
                  {r.renterName ? (
                    <div>
                      <p className="text-xs font-bold text-white mb-0.5">{r.renterName}</p>
                      <p className="text-[10px] text-slate-400">{r.renterPhone}</p>
                    </div>
                  ) : <span className="text-slate-600">—</span>}
                </td>
                <td className="px-4 py-3">
                  {(r.rentalStart || r.rentalEnd) ? (
                    <div className="text-xs text-slate-300">
                      <span className="text-emerald-400 font-mono">{r.rentalStart || '?'}</span>
                      <span className="text-slate-500 mx-1">/</span>
                      <span className="text-red-400 font-mono">{r.rentalEnd || '?'}</span>
                    </div>
                  ) : (
                    <span className="text-slate-600">—</span>
                  )}
                </td>
                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                  <select value={r.status}
                    onChange={async e => await updateVehicle(r.id!, { status: e.target.value as Vehicle['status'] })}
                    className={`text-[10px] font-bold px-2 py-1 rounded-lg border bg-slate-900 cursor-pointer focus:outline-none ${r.status === 'Kirada' ? 'text-pink-400 border-pink-500/30' : 'text-teal-400 border-teal-500/30'}`}>
                    <option value="Kiralık">Müsait (Kiralık)</option>
                    <option value="Kirada">Kirada</option>
                    <option value="Stokta">Satılık (Stokta)</option>
                    <option value="Serviste">Serviste</option>
                  </select>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {openCari && (
                      <button onClick={(e) => { e.stopPropagation(); openCari(r); }} className="p-1 px-2 hover:bg-amber-500/20 rounded-lg text-amber-500/80 hover:text-amber-400 font-bold text-xs flex items-center gap-1 transition-colors">
                        🪙 Cari
                      </button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); openEdit(r); }} className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
                      <Edit2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rentals.length === 0 && (
              <tr><td colSpan={7} className="text-center py-12 text-slate-500">"Kiralık" durumunda hiçbir araç bulunamadı. Tüm Araçlardan ekleyebilirsiniz.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
