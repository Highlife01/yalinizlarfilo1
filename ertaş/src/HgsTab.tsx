import { useState } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw, Search, ExternalLink } from 'lucide-react';
import type { Vehicle } from './hooks';

const HGS_TOKEN = '299DZb2amAFp4mWBvLLjLtWOGFKF8FAC1DkGIPU01e652481';
const BASE = 'https://api.hgsborcsorgulama.com';

type HgsResult = {
  plate: string;
  vehicleId?: string;
  status: 'idle' | 'loading' | 'ok' | 'debt' | 'error';
  totalDue?: number;
  violations?: any[];
  error?: string;
};

const headers = {
  'Authorization': `Bearer ${HGS_TOKEN}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

async function queryPlate(plate: string): Promise<HgsResult> {
  try {
    // 1. Aracı kaydet veya bul
    const addRes = await fetch(`${BASE}/api/v1/vehicles`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ plate_number: plate }),
    });
    if (!addRes.ok) {
      const err = await addRes.json().catch(() => ({}));
      throw new Error(err?.message || `Araç eklenemedi (${addRes.status})`);
    }
    const addData = await addRes.json();
    const vehicleId = addData?.data?.id || addData?.id;
    if (!vehicleId) throw new Error('Araç ID alınamadı.');

    // 2. Sorgu tetikle
    const qRes = await fetch(`${BASE}/api/v1/vehicles/${vehicleId}/query`, {
      method: 'POST',
      headers,
    });
    if (!qRes.ok) {
      const err = await qRes.json().catch(() => ({}));
      throw new Error(err?.message || `Sorgu hatası (${qRes.status})`);
    }

    // 3. Biraz bekle, sonucu çek
    await new Promise(r => setTimeout(r, 6000));
    const detRes = await fetch(`${BASE}/api/v1/vehicles/${vehicleId}`, { headers });
    if (!detRes.ok) throw new Error(`Veri alınamadı (${detRes.status})`);
    const detData = await detRes.json();
    const vData = detData?.data || detData;
    const totalDue = vData?.total_due_amount ?? vData?.totalDueAmount ?? 0;
    const violations = vData?.violations ?? [];

    return { plate, vehicleId, status: totalDue > 0 ? 'debt' : 'ok', totalDue, violations };
  } catch (e: any) {
    return { plate, status: 'error', error: e.message };
  }
}

export default function HgsTab({ vehicles }: { vehicles: Vehicle[] }) {
  const [results, setResults] = useState<Record<string, HgsResult>>({});
  const [scanning, setScanning] = useState(false);
  const [singlePlate, setSinglePlate] = useState('');

  const fmt = (v: number) =>
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 }).format(v);

  const queryOne = async (plate: string) => {
    const cleaned = plate.replace(/\s/g, '').toUpperCase();
    setResults(prev => ({ ...prev, [cleaned]: { plate: cleaned, status: 'loading' } }));
    const result = await queryPlate(cleaned);
    setResults(prev => ({ ...prev, [cleaned]: result }));
  };

  const scanAll = async () => {
    setScanning(true);
    const plates = vehicles.filter(v => v.plate).map(v => v.plate.replace(/\s/g, '').toUpperCase());
    for (const plate of plates) {
      setResults(prev => ({ ...prev, [plate]: { plate, status: 'loading' } }));
      const result = await queryPlate(plate);
      setResults(prev => ({ ...prev, [plate]: result }));
      await new Promise(r => setTimeout(r, 1000)); // rate limit
    }
    setScanning(false);
  };

  const debtCount = Object.values(results).filter(r => r.status === 'debt').length;
  const okCount = Object.values(results).filter(r => r.status === 'ok').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold">HGS Borç Sorgulama</h2>
          <p className="text-slate-400 mt-1 text-sm">
            Araçların geçiş ihlallerini ve HGS borçlarını sorgulayın.
          </p>
        </div>
        <button
          onClick={scanAll}
          disabled={scanning}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
        >
          <RefreshCw size={16} className={scanning ? 'animate-spin' : ''} />
          {scanning ? 'Sorgulanıyor...' : `Tüm Araçları Sorgula (${vehicles.filter(v => v.plate).length})`}
        </button>
      </div>

      {/* Summary */}
      {Object.keys(results).length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800 text-center">
            <p className="text-2xl font-bold">{Object.keys(results).length}</p>
            <p className="text-xs text-slate-500 mt-1">Sorgulanan</p>
          </div>
          <div className="bg-red-500/10 p-4 rounded-2xl border border-red-500/20 text-center">
            <p className="text-2xl font-bold text-red-400">{debtCount}</p>
            <p className="text-xs text-red-400 mt-1">Borçlu Araç</p>
          </div>
          <div className="bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/20 text-center">
            <p className="text-2xl font-bold text-emerald-400">{okCount}</p>
            <p className="text-xs text-emerald-400 mt-1">Borçsuz</p>
          </div>
        </div>
      )}

      {/* Manual query */}
      <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-800">
        <h3 className="font-bold mb-4">Tek Plaka Sorgula</h3>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              value={singlePlate}
              onChange={e => setSinglePlate(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && singlePlate && queryOne(singlePlate)}
              placeholder="01-AAK-975"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>
          <button
            onClick={() => singlePlate && queryOne(singlePlate)}
            disabled={!singlePlate || results[singlePlate]?.status === 'loading'}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-sm font-bold disabled:opacity-50"
          >
            Sorgula
          </button>
        </div>
      </div>

      {/* Vehicle list with results */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3">Araç</th>
              <th className="px-4 py-3">Plaka</th>
              <th className="px-4 py-3">HGS Borç</th>
              <th className="px-4 py-3">Durum</th>
              <th className="px-4 py-3 w-24"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {vehicles.filter(v => v.plate).map(v => {
              const plate = v.plate.replace(/\s/g, '').toUpperCase();
              const res = results[plate];
              return (
                <tr key={v.id} className={`transition-colors ${res?.status === 'debt' ? 'bg-red-500/5' : 'hover:bg-slate-800/20'}`}>
                  <td className="px-4 py-3">
                    <p className="font-bold text-sm">{v.brand}</p>
                    <p className="text-xs text-slate-400">{v.series}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs bg-slate-800 border border-slate-700 px-2 py-0.5 rounded">{v.plate}</span>
                  </td>
                  <td className="px-4 py-3 font-bold">
                    {res?.status === 'debt' && <span className="text-red-400">{fmt(res.totalDue!)}</span>}
                    {res?.status === 'ok' && <span className="text-emerald-400">Borç Yok</span>}
                    {res?.status === 'error' && <span className="text-slate-500 text-xs">{res.error}</span>}
                    {(!res || res.status === 'idle') && <span className="text-slate-600">-</span>}
                  </td>
                  <td className="px-4 py-3">
                    {res?.status === 'loading' && (
                      <span className="flex items-center gap-1.5 text-amber-400 text-xs"><RefreshCw size={12} className="animate-spin" /> Sorgulanıyor</span>
                    )}
                    {res?.status === 'debt' && (
                      <span className="flex items-center gap-1.5 text-red-400 text-xs font-bold"><AlertTriangle size={12} /> {res.violations?.length || 0} İhlal</span>
                    )}
                    {res?.status === 'ok' && (
                      <span className="flex items-center gap-1.5 text-emerald-400 text-xs"><CheckCircle2 size={12} /> Temiz</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => queryOne(plate)}
                      disabled={res?.status === 'loading'}
                      className="text-xs text-slate-400 hover:text-amber-400 border border-slate-700 hover:border-amber-500/40 px-2.5 py-1 rounded-lg transition-all disabled:opacity-40"
                    >
                      Sorgula
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-600 flex items-center gap-1.5">
        <ExternalLink size={10} />
        API: hgsborcsorgulama.com · Kredi bazlı sorgulama (her yeni ihlal = 1 kredi)
      </p>
    </div>
  );
}
