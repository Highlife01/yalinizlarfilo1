import { useState } from 'react';
import { Plus, Trash2, Save, X } from 'lucide-react';
import type { Expense, Income } from './hooks';

const fmt = (v: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(v);

type Props = {
  expenses: Expense[];
  addExpense: (e: Omit<Expense, 'id'>) => Promise<any>;
  removeExpense: (id: string) => Promise<void>;
  incomes: Income[];
  addIncome: (e: Omit<Income, 'id'>) => Promise<any>;
  removeIncome: (id: string) => Promise<void>;
  grossProfit: number;
  totalExpenses: number;
  totalIncomes: number;
  netProfit: number;
};

export default function FinanceTab({
  expenses, addExpense, removeExpense,
  incomes, addIncome, removeIncome,
  grossProfit, totalExpenses, totalIncomes, netProfit
}: Props) {
  const [showModal, setShowModal] = useState<'expense' | 'income' | null>(null);
  const [form, setForm] = useState({ label: '', amount: '', category: 'Sabit', month: new Date().toISOString().slice(0, 7) });

  const handleSaveExpense = async () => {
    if (!form.label || !form.amount) return alert('Tüm alanları doldurun.');
    await addExpense({ label: form.label, amount: parseFloat(form.amount), category: form.category, month: form.month });
    setForm({ label: '', amount: '', category: 'Sabit', month: new Date().toISOString().slice(0, 7) });
    setShowModal(null);
  };

  const handleSaveIncome = async () => {
    if (!form.label || !form.amount) return alert('Tüm alanları doldurun.');
    await addIncome({ label: form.label, amount: parseFloat(form.amount), category: form.category, month: form.month });
    setForm({ label: '', amount: '', category: 'Diğer', month: new Date().toISOString().slice(0, 7) });
    setShowModal(null);
  };

  return (
    <>
      <div className="space-y-8 animate-in fade-in duration-500">
        <h2 className="text-3xl font-bold">Finansal Analiz</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-800"><p className="text-slate-400 text-sm">Brüt Kâr (Satışlar)</p><p className="text-2xl font-bold mt-2 text-emerald-400">{fmt(grossProfit)}</p></div>
          <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-800"><p className="text-slate-400 text-sm">Ek Gelirler</p><p className="text-2xl font-bold mt-2 text-blue-400">{fmt(totalIncomes)}</p></div>
          <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-800"><p className="text-slate-400 text-sm">Toplam Giderler</p><p className="text-2xl font-bold mt-2 text-red-400">{fmt(totalExpenses)}</p></div>
          <div className="bg-emerald-500/10 p-6 rounded-3xl border border-emerald-500/20"><p className="text-emerald-400 text-sm">Net Dönem Kârı</p><p className="text-2xl font-bold mt-2 text-emerald-400">{fmt(netProfit)}</p></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Ek Gelirler */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div><h3 className="text-2xl font-bold">Ek Gelirler</h3></div>
              <button onClick={() => setShowModal('income')} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-xl text-sm font-bold"><Plus size={16} /> Gelir Ekle</button>
            </div>
            <div className="bg-slate-900/50 rounded-3xl border border-slate-800 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wider">
                  <tr>{['Kalem', 'Ay', 'Tutar', ''].map(h => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {incomes.map(e => (
                    <tr key={e.id} className="hover:bg-slate-800/20 group">
                      <td className="px-4 py-4 font-bold max-w-[120px] truncate">{e.label}</td>
                      <td className="px-4 py-4 text-sm">{e.month}</td>
                      <td className="px-4 py-4 text-sm font-bold text-blue-400">+{fmt(e.amount)}</td>
                      <td className="px-4 py-4 text-right"><button onClick={() => removeIncome(e.id!)} className="p-1.5 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-400 opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button></td>
                    </tr>
                  ))}
                  {incomes.length === 0 && <tr><td colSpan={4} className="text-center py-8 text-slate-500">Kayıt yok.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {/* Gider Defteri */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div><h3 className="text-2xl font-bold">Giderler</h3></div>
              <button onClick={() => setShowModal('expense')} className="flex items-center gap-2 bg-red-600 hover:bg-red-500 px-4 py-2 rounded-xl text-sm font-bold"><Plus size={16} /> Gider Ekle</button>
            </div>
            <div className="bg-slate-900/50 rounded-3xl border border-slate-800 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wider">
                  <tr>{['Kalem', 'Ay', 'Tutar', ''].map(h => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {expenses.map(e => (
                    <tr key={e.id} className="hover:bg-slate-800/20 group">
                      <td className="px-4 py-4 font-bold max-w-[120px] truncate">{e.label}</td>
                      <td className="px-4 py-4 text-sm">{e.month}</td>
                      <td className="px-4 py-4 text-sm font-bold text-red-400">-{fmt(e.amount)}</td>
                      <td className="px-4 py-4 text-right"><button onClick={() => removeExpense(e.id!)} className="p-1.5 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-400 opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button></td>
                    </tr>
                  ))}
                  {expenses.length === 0 && <tr><td colSpan={4} className="text-center py-8 text-slate-500">Kayıt yok.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-xl font-bold">{showModal === 'expense' ? 'Yeni Gider Ekle' : 'Yeni Gelir Ekle'}</h2>
              <button onClick={() => setShowModal(null)}><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className="text-xs font-bold text-slate-500 uppercase">{showModal === 'expense' ? 'Gider Kalemi' : 'Gelir Kalemi'}</label><input type="text" placeholder={showModal === 'expense' ? "Dükkan kirası" : "Komisyon..."} value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 mt-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/50" /></div>
              <div><label className="text-xs font-bold text-slate-500 uppercase">Tutar (₺)</label><input type="number" placeholder="5000" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 mt-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/50" /></div>
              {showModal === 'expense' && (
                <div><label className="text-xs font-bold text-slate-500 uppercase">Kategori</label>
                  <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 mt-1.5 text-sm">
                    {['Sabit', 'Değişken', 'Personel', 'Kira', 'Fatura', 'Diğer'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              )}
              {showModal === 'income' && (
                <div><label className="text-xs font-bold text-slate-500 uppercase">Kategori</label>
                  <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 mt-1.5 text-sm">
                    {['Komisyon', 'Kira Geliri', 'Hizmet', 'Diğer'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              )}
              <div><label className="text-xs font-bold text-slate-500 uppercase">Ay</label><input type="month" value={form.month} onChange={e => setForm(p => ({ ...p, month: e.target.value }))} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 mt-1.5 text-sm" /></div>
            </div>
            <div className="p-6 border-t border-slate-800 flex justify-end gap-3">
              <button onClick={() => setShowModal(null)} className="px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-800">İptal</button>
              <button onClick={showModal === 'expense' ? handleSaveExpense : handleSaveIncome} className={`px-8 py-2.5 rounded-xl text-sm font-bold ${showModal === 'expense' ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500'} flex items-center gap-2`}><Save size={16} /> Kaydet</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
