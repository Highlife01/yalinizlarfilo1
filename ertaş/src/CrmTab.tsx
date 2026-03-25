import { useState } from 'react';
import { Plus, Trash2, Edit2, Search } from 'lucide-react';
import { type Customer } from './hooks';

const CRM_STATUSES: Customer['status'][] = ['Yeni', 'Görüşme', 'Teklif', 'Satış', 'Kaybedildi'];
const crmStatusStyle: Record<Customer['status'], string> = {
  Yeni: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Görüşme: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Teklif: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  Satış: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Kaybedildi: 'bg-red-500/10 text-red-400 border-red-500/20',
};

const EMPTY_CUSTOMER = { name: '', phone: '', email: '', plate: '', source: 'Sahibinden', status: 'Yeni' as Customer['status'], notes: '' };

type Props = {
  customers: Customer[];
  addCustomer: (c: Omit<Customer, 'id'>) => Promise<void>;
  updateCustomer: (id: string, c: Partial<Customer>) => Promise<void>;
  removeCustomer: (id: string) => Promise<void>;
};

export default function CrmTab({ customers, addCustomer, updateCustomer, removeCustomer }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_CUSTOMER });
  const [search, setSearch] = useState('');

  const openAdd = () => { setEditId(null); setForm({ ...EMPTY_CUSTOMER }); setShowModal(true); };
  const openEdit = (c: Customer) => {
    setEditId(c.id!);
    setForm({ name: c.name, phone: c.phone, email: c.email, plate: c.plate, source: c.source, status: c.status, notes: c.notes });
    setShowModal(true);
  };
  const handleSave = async () => {
    if (!form.name) return alert('Ad zorunludur.');
    if (editId) await updateCustomer(editId, form);
    else await addCustomer(form);
    setShowModal(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold">Müşteri Yönetimi</h2>
          <p className="text-slate-400 mt-1 text-sm">Potansiyel müşterileri takip edin, satış sürecini yönetin.</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 transition-all">
          <Plus size={18} /> Yeni Müşteri
        </button>
      </div>

      {/* Pipeline sayacı */}
      <div className="grid grid-cols-5 gap-3">
        {CRM_STATUSES.map(s => {
          const count = customers.filter(c => c.status === s).length;
          return (
            <div key={s} className={`rounded-2xl border p-3 text-center ${crmStatusStyle[s]}`}>
              <p className="text-xl font-bold">{count}</p>
              <p className="text-[10px] font-bold uppercase mt-0.5 opacity-80">{s}</p>
            </div>
          );
        })}
      </div>

      {/* Arama */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Müşteri, plaka veya telefon ara..."
          className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/50" />
      </div>

      {/* Müşteri tablosu */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-800 text-slate-400 text-[11px] uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3">Müşteri</th>
              <th className="px-4 py-3">Telefon</th>
              <th className="px-4 py-3">Plaka / Araç</th>
              <th className="px-4 py-3">Kaynak</th>
              <th className="px-4 py-3">Durum</th>
              <th className="px-4 py-3">Not</th>
              <th className="px-4 py-3 w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {customers
              .filter(c => !search || `${c.name} ${c.phone} ${c.plate} ${c.email}`.toLowerCase().includes(search.toLowerCase()))
              .map(c => (
              <tr key={c.id} className="hover:bg-slate-800/30 transition-colors group">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-blue-400 text-sm">{c.name.charAt(0)}</div>
                    <div>
                      <p className="font-bold text-sm">{c.name}</p>
                      <p className="text-[10px] text-slate-500">{c.email || '—'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <a href={`tel:${c.phone}`} className="font-mono text-xs text-blue-400 hover:underline">{c.phone || '—'}</a>
                </td>
                <td className="px-4 py-3">
                  {c.plate ? <span className="font-mono text-xs bg-slate-800 border border-slate-700 px-2 py-0.5 rounded">{c.plate}</span> : <span className="text-slate-600">—</span>}
                </td>
                <td className="px-4 py-3 text-xs text-slate-400">{c.source || '—'}</td>
                <td className="px-4 py-3">
                  <select value={c.status} onChange={async e => await updateCustomer(c.id!, { status: e.target.value as Customer['status'] })}
                    className={`text-[10px] font-bold px-2 py-1 rounded-lg border bg-transparent cursor-pointer ${crmStatusStyle[c.status]}`}>
                    {CRM_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3 text-xs text-slate-400 max-w-[160px] truncate">{c.notes || '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(c)} className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white"><Edit2 size={13} /></button>
                    <button onClick={() => removeCustomer(c.id!)} className="p-1.5 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-400"><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr><td colSpan={7} className="text-center py-12 text-slate-500">Henüz müşteri eklenmedi.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* CRM Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-xl font-bold">{editId ? 'Müşteri Düzenle' : 'Yeni Müşteri'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              {([
                { label: 'Ad Soyad *', key: 'name', placeholder: 'Ahmet Yılmaz' },
                { label: 'Telefon', key: 'phone', placeholder: '0532 123 45 67' },
                { label: 'E-posta', key: 'email', placeholder: 'ahmet@mail.com' },
                { label: 'Plaka / İlgili Araç', key: 'plate', placeholder: '01-AGR-986' },
                { label: 'Kaynak', key: 'source', placeholder: 'Sahibinden, Instagram...' },
              ] as {label:string;key:string;placeholder:string}[]).map(f => (
                <div key={f.key} className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">{f.label}</label>
                  <input type="text" placeholder={f.placeholder}
                    value={(form as any)[f.key]}
                    onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/50" />
                </div>
              ))}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Durum</label>
                <select value={form.status} onChange={e => setForm(prev => ({ ...prev, status: e.target.value as Customer['status'] }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/50">
                  {CRM_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Notlar</label>
                <input type="text" placeholder="Görüşme notu, ilgilendiği model..." value={form.notes}
                  onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/50" />
              </div>
            </div>
            <div className="p-6 border-t border-slate-800 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-800">İptal</button>
              <button onClick={handleSave} className="px-8 py-2.5 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-500 flex items-center gap-2">
                {editId ? 'Güncelle' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
