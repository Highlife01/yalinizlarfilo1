import { useState } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { X, Save, Clock, Trash2, Receipt } from 'lucide-react';
import type { Vehicle } from './hooks';
import { useVehicleExpenses } from './hooks';

const fmt = (v: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(v);

type Props = {
  vehicle: Vehicle;
  onClose: () => void;
  updateVehicle: (id: string, data: Partial<Vehicle>) => Promise<void>;
};

export default function VehicleCariModal({ vehicle, onClose, updateVehicle }: Props) {
  const [loading, setLoading] = useState(false);
  const { items, add, remove, total } = useVehicleExpenses(vehicle.id!);
  
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');

  const currentTotalCost = (vehicle.purchasePrice || 0) + total;
  const currentProfit = (vehicle.salePrice || 0) - currentTotalCost;

  const handleAddExpense = async () => {
    if (!label.trim() || !amount) return alert('Lütfen masraf adını ve tutarı girin.');
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return alert('Geçerli bir tutar girin.');
    
    setLoading(true);
    await add({ label: label.trim(), amount: val });
    // Araç modeline toplam masrafı sync et
    await updateVehicle(vehicle.id!, { expenses: total + val });
    setLabel('');
    setAmount('');
    setLoading(false);
  };

  // Export expenses to PDF using jsPDF
  const exportPdf = () => {
    const doc = new jsPDF();
    doc.text(`Masraf Listesi - ${vehicle.brand} ${vehicle.series}`, 14, 20);
    const rows = items.map((e, i) => [i + 1, e.label, fmt(e.amount)]);
    autoTable(doc, {
      head: [['#', 'Açıklama', 'Tutar'] ],
      body: rows,
      startY: 30,
    });
    doc.save(`masraf_${vehicle.id}.pdf`);
  };

  const handleRemoveExpense = async (id: string, amt: number) => {
    setLoading(true);
    await remove(id);
    await updateVehicle(vehicle.id!, { expenses: total - amt });
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/50 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shrink-0 overflow-hidden shadow-2xl shadow-black">
        
        {/* Üst Kısım / Başlık */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex flex-col items-center justify-center font-bold">
              <Receipt size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">Araç Cari Hesabı</h2>
              <p className="text-slate-400 text-sm">{vehicle.brand} {vehicle.series} <span className="text-slate-500 px-2">|</span> {vehicle.plate || vehicle.year}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all"><X size={20} /></button>
        </div>

        {/* Modal İçeriği */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          
          {/* Özet Kartları */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-800">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Alış Fiyatı</p>
              <p className="text-lg font-black">{fmt(vehicle.purchasePrice || 0)}</p>
            </div>
            <div className="bg-slate-800/40 p-4 rounded-2xl border border-amber-500/20">
              <p className="text-[10px] text-amber-500 font-bold uppercase tracking-wider mb-1">T. Masraflar</p>
              <p className="text-lg font-black text-amber-400">{fmt(total)}</p>
            </div>
            <div className="bg-slate-800/40 p-4 rounded-2xl border border-blue-500/20">
              <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider mb-1">Satış (veya Güncel)</p>
              <p className="text-lg font-black text-blue-400">{vehicle.salePrice ? fmt(vehicle.salePrice) : 'Satılmadı'}</p>
            </div>
            <div className={`p-4 rounded-2xl border ${currentProfit >= 0 ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-red-500/5 border-red-500/30'}`}>
              <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${currentProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>Net Kâr / Zarar</p>
              <p className={`text-lg font-black ${currentProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmt(currentProfit)}</p>
            </div>
          </div>

          <div className="flex gap-2">
              <input type="text" placeholder="Masraf Açıklaması (Boya, Lastik, Bakım...)" value={label}
                onChange={e => setLabel(e.target.value)}
                aria-label="Masraf Açıklaması"
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
              <input type="number" placeholder="₺ Tutar" value={amount}
                onChange={e => setAmount(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddExpense()}
                aria-label="Masraf Tutarı"
                className="w-32 bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
              <button onClick={handleAddExpense} disabled={loading}
                className="px-6 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 rounded-xl font-bold whitespace-nowrap transition-colors flex items-center gap-2"
                aria-label="Masraf Ekle">
                <Save size={16} /> İşle
              </button>
              {/* Export PDF */}
              <button onClick={exportPdf} disabled={loading || items.length===0}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-100 rounded-xl font-medium whitespace-nowrap transition-colors flex items-center gap-2"
                aria-label="Masrafları PDF olarak dışa aktar">
                PDF
              </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
             <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/40">
                <h3 className="font-bold text-slate-300">Geçmiş Masraf Kalemleri</h3>
                <span className="text-xs font-bold px-2 py-1 bg-slate-800 rounded-lg text-slate-400">{items.length} kayıt bulundu</span>
             </div>
             {items.length > 0 ? (
               <div className="divide-y divide-slate-800/60 max-h-60 overflow-y-auto">
                 {items.map(e => (
                   <div key={e.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-slate-800/30 group">
                     <div>
                       <p className="font-bold text-sm text-slate-200">{e.label}</p>
                       <p className="text-[10px] text-slate-500">{e.createdAt ? new Date(e.createdAt).toLocaleString('tr-TR') : '-'}</p>
                     </div>
                     <div className="flex items-center gap-4 mt-2 sm:mt-0">
                       <span className="font-black text-amber-500">-{fmt(e.amount)}</span>
                       <button onClick={() => handleRemoveExpense(e.id!, e.amount)} disabled={loading}
                        className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50">
                          <Trash2 size={16} />
                       </button>
                     </div>
                   </div>
                 ))}
               </div>
             ) : (
               <div className="p-8 text-center text-slate-500">
                 <p className="text-sm">Bu araç için henüz masraf kaydı (Cari giriş) bulunmuyor.</p>
               </div>
             )}
          </div>

        </div>
      </div>
    </div>
  );
}
