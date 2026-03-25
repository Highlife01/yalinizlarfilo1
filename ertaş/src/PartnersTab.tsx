import { useState } from 'react';
import { TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import type { Partner } from './hooks';

const fmt = (v: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(v);

type Props = {
  partners: Partner[];
  updateBalance: (id: string, amount: number) => Promise<void>;
  netProfit: number;
};

export default function PartnersTab({ partners, updateBalance, netProfit }: Props) {
  const [txAmount, setTxAmount] = useState<Record<string, string>>({});

  const handleTx = async (partnerId: string, type: 'deposit' | 'withdraw') => {
    const amt = parseFloat(txAmount[partnerId] || '0');
    if (!amt) return alert('Tutar giriniz.');
    await updateBalance(partnerId, type === 'deposit' ? amt : -amt);
    setTxAmount(prev => ({ ...prev, [partnerId]: '' }));
  };

  const distributeProfit = async () => {
    if (netProfit <= 0) return alert('Dağıtılacak net kâr yok.');
    for (const p of partners) {
      await updateBalance(p.id!, netProfit * (p.share / 100));
    }
    alert(`${fmt(netProfit)} net kâr ortaklara dağıtıldı.`);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div><h2 className="text-3xl font-bold">Ortaklar & Kâr Dağıtımı</h2><p className="text-slate-400 mt-1 text-sm">Para giriş/çıkışı yapın ve kârı paylaştırın.</p></div>
        <button onClick={distributeProfit} className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:opacity-90 px-5 py-2 rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/20 transition-all">
          <TrendingUp size={18} /> Net Kârı Dağıt ({fmt(netProfit)})
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {partners.map(p => (
          <div key={p.id} className="bg-slate-900/50 p-6 rounded-3xl border border-slate-800 hover:border-blue-500/30 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center font-bold text-xl text-blue-400">{p.name.charAt(0)}</div>
              <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1 rounded-lg text-sm font-bold">%{p.share}</span>
            </div>
            <h3 className="text-xl font-bold">{p.name}</h3>
            <p className="text-slate-400 text-sm mt-1">Mevcut Bakiye</p>
            <p className="text-3xl font-bold mt-2">{fmt(p.balance)}</p>
            <div className="mt-5 space-y-2">
              <input type="number" placeholder="Tutar girin..." value={txAmount[p.id!] || ''}
                onChange={e => setTxAmount(prev => ({ ...prev, [p.id!]: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/50" />
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => handleTx(p.id!, 'deposit')} className="flex items-center justify-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 py-2.5 rounded-xl text-xs font-bold transition-colors">
                  <ArrowDownRight size={14} /> Yatır
                </button>
                <button onClick={() => handleTx(p.id!, 'withdraw')} className="flex items-center justify-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 py-2.5 rounded-xl text-xs font-bold transition-colors">
                  <ArrowUpRight size={14} /> Çek
                </button>
              </div>
            </div>
          </div>
        ))}
        {partners.length === 0 && <p className="text-slate-500 col-span-3">Firestore'da ortak verisi bulunamadı. Lütfen 'ertas_partners' koleksiyonunu oluşturun.</p>}
      </div>
    </div>
  );
}
