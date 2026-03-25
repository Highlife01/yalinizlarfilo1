import { useMemo } from 'react';
import type { Vehicle } from './hooks';
import { Edit2 } from 'lucide-react';

const fmt = (v: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(v);

type Props = {
  vehicles: Vehicle[];
  openEdit: (v: Vehicle) => void;
  openCari?: (v: Vehicle) => void;
};

export default function ArchiveTab({ vehicles, openEdit, openCari }: Props) {
  // Sadece Satıldı statüsüne sahip araçları arşive at.
  const archive = useMemo(() => vehicles.filter(v => v.status === 'Satıldı'), [vehicles]);

  const totalSales = archive.reduce((s, v) => s + (v.salePrice || 0), 0);
  const totalCost = archive.reduce((s, v) => s + (v.purchasePrice || 0) + (v.expenses || 0), 0);
  const totalProfit = totalSales - totalCost;

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <span className="p-2 bg-slate-800 rounded-xl">📦</span> Arşiv (Geçmiş Satışlar)
          </h2>
          <p className="text-slate-400 text-sm mt-1">Sistemden çıkan, satışı tamamlanmış araçların geriye dönük listesi.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-800">
          <p className="text-sm text-slate-400 font-bold uppercase tracking-wider mb-2">Satılan Araç Sayısı</p>
          <p className="text-3xl font-black text-white">{archive.length} <span className="text-sm font-medium text-slate-500">adet</span></p>
        </div>
        <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-800">
          <p className="text-sm text-slate-400 font-bold uppercase tracking-wider mb-2">Elde Edilen Toplam Ciro</p>
          <p className="text-3xl font-black text-blue-400">{fmt(totalSales)}</p>
        </div>
        <div className="bg-emerald-500/5 p-6 rounded-3xl border border-emerald-500/20">
          <p className="text-sm text-emerald-500 font-bold uppercase tracking-wider mb-2">Reelde Kalan Bıraktığı Kâr</p>
          <p className="text-3xl font-black text-emerald-400">{fmt(totalProfit)}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-slate-800 shadow-2xl">
        <table className="w-full text-left min-w-[700px]">
          <thead className="bg-slate-900 text-slate-400 text-xs uppercase tracking-wider sticky top-0">
            <tr>
              {['Araç Bilgisi', 'Alış Tarihi', 'Alış Fiyatı', 'Masraf / Cari', 'Satış Tarihi', 'Satış Fiyatı', 'Net Kâr', ''].map(h => (
                <th key={h} className="px-5 py-4 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 bg-slate-900/30">
            {archive.map(v => {
              const profit = (v.salePrice || 0) - (v.purchasePrice || 0) - (v.expenses || 0);
              return (
                <tr key={v.id} onClick={() => openEdit(v)} className="hover:bg-slate-800/50 transition-colors cursor-pointer group">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-slate-500">
                        {v.brand.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-200">{v.brand} {v.series}</p>
                        <p className="text-[10px] text-slate-500">{v.plate || v.year}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-xs font-mono text-slate-400">{v.purchaseDate || '—'}</td>
                  <td className="px-5 py-4 text-sm font-medium text-slate-300">{fmt(v.purchasePrice || 0)}</td>
                  <td className="px-5 py-4 text-xs font-bold text-red-400">-{fmt(v.expenses || 0)}</td>
                  <td className="px-5 py-4 text-xs font-mono text-slate-400">{v.soldDate || '—'}</td>
                  <td className="px-5 py-4 text-sm font-black text-blue-400">{fmt(v.salePrice || 0)}</td>
                  <td className={`px-5 py-4 text-sm font-black ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {fmt(profit)}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {openCari && (
                        <button onClick={(e) => { e.stopPropagation(); openCari(v); }} className="p-1.5 px-3 hover:bg-amber-500/20 rounded-lg text-amber-500/80 hover:text-amber-400 font-bold text-xs flex items-center gap-2 transition-colors">
                          🪙 Cari
                        </button>
                      )}
                      <button className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-all">
                        <Edit2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {archive.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-12 text-slate-500">
                  <p className="text-lg mb-2">📂</p>
                  Sistemde henüz "Satıldı" olarak işaretlenmiş bir araç bulunmuyor.
                </td>
              </tr>
            )}
          </tbody>
          {archive.length > 0 && (
            <tfoot className="bg-slate-900 border-t border-slate-800">
              <tr>
                <td colSpan={2} className="px-5 py-4 text-xs font-black text-slate-500 text-right">GENEL TOPLAM</td>
                <td className="px-5 py-4 text-sm font-bold text-slate-400">{fmt(archive.reduce((a, v) => a + (v.purchasePrice || 0), 0))}</td>
                <td className="px-5 py-4 text-sm font-bold text-red-400/80">-{fmt(archive.reduce((a, v) => a + (v.expenses || 0), 0))}</td>
                <td className="px-5 py-4"></td>
                <td className="px-5 py-4 text-lg font-black text-blue-400">{fmt(totalSales)}</td>
                <td className="px-5 py-4 text-lg font-black text-emerald-400">{fmt(totalProfit)}</td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
