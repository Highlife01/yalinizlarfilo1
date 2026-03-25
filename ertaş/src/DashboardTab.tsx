import { useMemo } from 'react';
import type { Vehicle, Partner, Expense } from './hooks';

const fmt = (v: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 }).format(v);
const statusStyle: Record<string, string> = {
  Stokta: 'bg-green-500/10 text-green-400 border-green-500/20',
  Satıldı: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Rezerve: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Serviste: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
};

type Props = {
  vehicles: Vehicle[];
  partners: Partner[];
  expenses: Expense[];
  loading: boolean;
  onEditVehicle: (v: Vehicle) => void;
};

export default function DashboardTab({ vehicles, partners, expenses, loading, onEditVehicle }: Props) {
  const stats = useMemo(() => {
    const sold = vehicles.filter(v => v.status === 'Satıldı');
    const inStock = vehicles.filter(v => v.status === 'Stokta');
    const stockValue = inStock.reduce((a, v) => a + (v.purchasePrice || 0), 0);
    const totalCost = inStock.reduce((a, v) => a + (v.purchasePrice || 0) + (v.expenses || 0), 0);
    const grossProfit = sold.reduce((a, v) => a + ((v.salePrice || 0) - (v.purchasePrice || 0) - (v.expenses || 0)), 0);
    const totalExpenses = expenses.reduce((a, e) => a + (e.amount || 0), 0);
    const totalIncomes = incomes.reduce((a, e) => a + (e.amount || 0), 0);
    const netProfit = grossProfit + totalIncomes - totalExpenses;
    return { sold: sold.length, inStock: inStock.length, stockValue, totalCost, grossProfit, netProfit, totalExpenses, totalIncomes };
  }, [vehicles, expenses, incomes]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div><h2 className="text-3xl font-bold">Hoş Geldiniz 👋</h2><p className="text-slate-400 mt-1">Ertaş Otomotiv yönetim paneli</p></div>

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {[
          { label: 'Stok Değeri', val: fmt(stats.stockValue), sub: `${stats.inStock} araç stokta`, color: 'blue' },
          { label: 'Satış Adedi', val: `${stats.sold} Araç`, sub: 'Toplam satılan', color: 'emerald' },
          { label: 'Brüt Kâr', val: fmt(stats.grossProfit), sub: 'Satışlardan', color: 'violet' },
          { label: 'Net Kâr', val: fmt(stats.netProfit), sub: 'Giderler düşüldükten sonra', color: 'amber' },
        ].map(s => (
          <div key={s.label} className="bg-slate-900/50 p-5 md:p-6 rounded-2xl md:rounded-3xl border border-slate-800 hover:border-slate-700 transition-all">
            <p className="text-slate-400 text-sm">{s.label}</p>
            <p className="text-xl md:text-2xl font-bold mt-2 truncate">{s.val}</p>
            <p className="text-[10px] md:text-xs text-slate-500 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Tüm Araçlar Tablosu */}
        <div className="lg:col-span-3 bg-slate-900/50 rounded-3xl border border-slate-800 overflow-hidden">
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-lg">Tüm Araçlar & Değerleri</h3>
            <span className="text-xs text-slate-500 bg-slate-800 px-3 py-1 rounded-lg">{vehicles.length} araç</span>
          </div>
          <div className="overflow-x-auto max-h-[520px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/60 text-slate-400 text-[10px] uppercase tracking-wider sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-2.5">#</th>
                  <th className="px-4 py-2.5">Araç</th>
                  <th className="px-4 py-2.5">Plaka</th>
                  <th className="px-4 py-2.5 text-right">Alış</th>
                  <th className="px-4 py-2.5 text-right">Masraf</th>
                  <th className="px-4 py-2.5 text-right">Maliyet</th>
                  <th className="px-4 py-2.5 text-right">Satış</th>
                  <th className="px-4 py-2.5 text-right">Kâr</th>
                  <th className="px-4 py-2.5">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {loading ? (
                  <tr><td colSpan={9} className="text-center py-8 text-slate-500">Yükleniyor...</td></tr>
                ) : vehicles.filter(v => v.status !== 'Satıldı' && v.status !== 'Kiralık' && v.status !== 'Kirada').map((v, i) => {
                  const maliyet = (v.purchasePrice || 0) + (v.expenses || 0);
                  const kar = (v.salePrice || 0) - maliyet;
                  return (
                    <tr key={v.id} onClick={() => onEditVehicle(v)} className="cursor-pointer hover:bg-slate-800/40 transition-colors group">
                      <td className="px-4 py-2 text-[10px] text-slate-600 group-hover:text-slate-400">{i + 1}</td>
                      <td className="px-4 py-2">
                        <p className="font-bold text-xs truncate max-w-[180px]">{v.brand} {v.series}</p>
                        <p className="text-[10px] text-slate-500">{v.year}</p>
                      </td>
                      <td className="px-4 py-2">
                        {v.plate ? <span className="font-mono text-[10px] bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded">{v.plate}</span> : <span className="text-slate-600 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-2 text-right text-xs font-medium text-slate-300">{v.purchasePrice ? fmt(v.purchasePrice) : '—'}</td>
                      <td className="px-4 py-2 text-right text-xs text-red-400">{v.expenses ? `-${fmt(v.expenses)}` : '—'}</td>
                      <td className="px-4 py-2 text-right text-xs font-bold text-slate-200">{maliyet ? fmt(maliyet) : '—'}</td>
                      <td className="px-4 py-2 text-right text-xs text-blue-400">{v.salePrice ? fmt(v.salePrice) : '—'}</td>
                      <td className={`px-4 py-2 text-right text-xs font-bold ${v.salePrice ? (kar > 0 ? 'text-emerald-400' : kar < 0 ? 'text-red-400' : 'text-slate-500') : 'text-slate-600'}`}>
                        {v.salePrice ? fmt(kar) : '—'}
                      </td>
                      <td className="px-4 py-2">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-lg border ${statusStyle[v.status]}`}>{v.status}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {!loading && vehicles.length > 0 && (
                <tfoot className="bg-slate-800/40 sticky bottom-0">
                  <tr className="font-bold text-xs">
                    <td colSpan={3} className="px-4 py-2.5 text-slate-400">AKTİF ARAÇ TOPLAMI (Satılan/Kiralanan Hariç)</td>
                    <td className="px-4 py-2.5 text-right text-slate-200">{fmt(vehicles.filter(v => v.status !== 'Satıldı' && v.status !== 'Kiralık' && v.status !== 'Kirada').reduce((a, v) => a + (v.purchasePrice || 0), 0))}</td>
                    <td className="px-4 py-2.5 text-right text-red-400">{fmt(vehicles.filter(v => v.status !== 'Satıldı' && v.status !== 'Kiralık' && v.status !== 'Kirada').reduce((a, v) => a + (v.expenses || 0), 0))}</td>
                    <td className="px-4 py-2.5 text-right text-slate-100">{fmt(vehicles.filter(v => v.status !== 'Satıldı' && v.status !== 'Kiralık' && v.status !== 'Kirada').reduce((a, v) => a + (v.purchasePrice || 0) + (v.expenses || 0), 0))}</td>
                    <td className="px-4 py-2.5 text-right text-blue-400">{fmt(vehicles.filter(v => v.status !== 'Satıldı' && v.status !== 'Kiralık' && v.status !== 'Kirada' && v.salePrice).reduce((a, v) => a + (v.salePrice || 0), 0))}</td>
                    <td className="px-4 py-2.5 text-right text-emerald-400">{fmt(vehicles.filter(v => v.status !== 'Satıldı' && v.status !== 'Kiralık' && v.status !== 'Kirada' && v.salePrice).reduce((a, v) => a + ((v.salePrice || 0) - (v.purchasePrice || 0) - (v.expenses || 0)), 0))}</td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Sağ Panel: Ortaklar */}
        <div className="space-y-6">
          <div className="bg-slate-900/50 p-5 rounded-3xl border border-slate-800">
            <h3 className="font-bold text-lg mb-4">Ortak Bakiyeleri</h3>
            <div className="space-y-3">
              {partners.map(p => (
                <div key={p.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-blue-500/20 rounded-xl flex items-center justify-center font-bold text-blue-400">{p.name.charAt(0)}</div>
                    <div><p className="font-bold text-sm">{p.name}</p><p className="text-[10px] text-slate-500">%{p.share} hisse</p></div>
                  </div>
                  <p className="font-bold text-sm">{fmt(p.balance)}</p>
                </div>
              ))}
              {partners.length === 0 && <p className="text-slate-500 text-xs">Ortak verisi yok.</p>}
            </div>
          </div>

          {/* Durum Dağılımı */}
          <div className="bg-slate-900/50 p-5 rounded-3xl border border-slate-800">
            <h3 className="font-bold text-sm mb-3">Durum Dağılımı</h3>
            <div className="space-y-2">
              {Object.entries(statusStyle).map(([status, cls]) => {
                const count = vehicles.filter(v => v.status === status).length;
                if (count === 0) return null;
                return (
                  <div key={status} className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${cls}`}>{status}</span>
                    <span className="text-sm font-bold">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
