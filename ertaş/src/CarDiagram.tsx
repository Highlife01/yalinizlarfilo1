import { useState } from 'react';

export type DamageType = 'original' | 'local' | 'full' | 'changed' | 'damaged';

export const DAMAGE_LABELS: Record<DamageType, { label: string; color: string; border: string }> = {
  original: { label: 'Orijinal',    color: 'rgba(51, 65, 85, 0.4)',  border: '#475569' },
  local:    { label: 'Lokal Boya',  color: 'rgba(234, 179, 8, 0.6)', border: '#eab308' },
  full:     { label: 'Komple Boya', color: 'rgba(249, 115, 22, 0.6)',border: '#f97316' },
  changed:  { label: 'Değişen',     color: 'rgba(59, 130, 246, 0.6)',border: '#3b82f6' },
  damaged:  { label: 'Hasarlı',     color: 'rgba(239, 68, 68, 0.6)', border: '#ef4444' },
};

const ORDER: DamageType[] = ['original', 'local', 'full', 'changed', 'damaged'];

export const CAR_PARTS = [
  { key: 'on_tampon',         label: 'Ön Tampon' },
  { key: 'kaput',             label: 'Kaput' },
  { key: 'tavan',             label: 'Tavan' },
  { key: 'bagaj',             label: 'Bagaj' },
  { key: 'arka_tampon',       label: 'Arka Tampon' },
  { key: 'sol_on_camurluk',   label: 'Sol Ön Çamurluk' },
  { key: 'sol_on_kapi',       label: 'Sol Ön Kapı' },
  { key: 'sol_arka_kapi',     label: 'Sol Arka Kapı' },
  { key: 'sol_arka_camurluk', label: 'Sol Arka Çamurluk' },
  { key: 'sag_on_camurluk',   label: 'Sağ Ön Çamurluk' },
  { key: 'sag_on_kapi',       label: 'Sağ Ön Kapı' },
  { key: 'sag_arka_kapi',     label: 'Sağ Arka Kapı' },
  { key: 'sag_arka_camurluk', label: 'Sağ Arka Çamurluk' },
];

const SVG_PATHS = {
  kaput: "M 115 80 L 185 80 Q 190 80 190 85 L 190 150 L 110 150 L 110 85 Q 110 80 115 80 Z",
  on_tampon: "M 120 50 L 180 50 Q 190 50 190 60 L 190 75 L 110 75 L 110 60 Q 110 50 120 50 Z",
  arka_tampon: "M 110 375 L 190 375 L 190 390 Q 190 400 180 400 L 120 400 Q 110 400 110 390 Z",
  bagaj: "M 110 310 L 190 310 L 190 365 Q 190 370 185 370 L 115 370 Q 110 370 110 365 Z",
  tavan: "M 115 180 L 185 180 L 185 280 L 115 280 Z",
  
  // Sol Parçalar (Dışa açılan kanatlar)
  sol_on_camurluk: "M 105 80 L 85 80 Q 75 80 75 90 L 70 150 L 105 150 Z",
  sol_on_kapi: "M 105 155 L 68 155 L 65 225 L 105 225 Z",
  sol_arka_kapi: "M 105 230 L 65 230 L 68 280 L 105 280 Z",
  sol_arka_camurluk: "M 105 285 L 70 285 Q 75 370 85 370 L 105 370 Z",

  // Sağ Parçalar (Dışa açılan kanatlar)
  sag_on_camurluk: "M 195 80 L 215 80 Q 225 80 225 90 L 230 150 L 195 150 Z",
  sag_on_kapi: "M 195 155 L 232 155 L 235 225 L 195 225 Z",
  sag_arka_kapi: "M 195 230 L 235 230 L 232 280 L 195 280 Z",
  sag_arka_camurluk: "M 195 285 L 230 285 Q 225 370 215 370 L 195 370 Z",
};

// Sabit dekoratif SVG elementleri (Camlar)
const WINDOWS_SVG = [
  "M 115 153 L 185 153 L 180 177 L 120 177 Z", // Ön cam
  "M 120 283 L 180 283 L 185 307 L 115 307 Z", // Arka cam
];

interface Props {
  value: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
  readOnly?: boolean;
}

export default function CarDiagram({ value, onChange, readOnly }: Props) {
  const [hov, setHov] = useState<string | null>(null);

  const get = (k: string): DamageType => (value[k] as DamageType) || 'original';

  const cycle = (k: string) => {
    if (readOnly) return;
    const cur = get(k);
    const next = ORDER[(ORDER.indexOf(cur) + 1) % ORDER.length];
    const u = { ...value, [k]: next };
    if (next === 'original') delete u[k];
    onChange(u);
  };

  const getFill = (k: string) => {
    const t = get(k);
    if (t === 'original') return hov === k ? 'rgba(148,163,184,0.3)' : DAMAGE_LABELS.original.color;
    return hov === k ? DAMAGE_LABELS[t].border : DAMAGE_LABELS[t].color;
  };

  const PartArea = ({ id, label }: { id: string; label: string }) => (
    <path
      d={SVG_PATHS[id as keyof typeof SVG_PATHS]}
      fill={getFill(id)}
      stroke={hov === id ? '#fff' : DAMAGE_LABELS[get(id)].border}
      strokeWidth={hov === id ? 2 : 1.5}
      strokeLinejoin="round"
      className="transition-all duration-300 drop-shadow-sm"
      style={{ cursor: readOnly ? 'default' : 'pointer' }}
      onClick={() => cycle(id)}
      onMouseEnter={() => setHov(id)}
      onMouseLeave={() => setHov(null)}
    >
      <title>{label}{get(id) !== 'original' ? ` — ${DAMAGE_LABELS[get(id)].label}` : ''}</title>
    </path>
  );

  const damaged = CAR_PARTS.filter(p => value[p.key] && value[p.key] !== 'original');

  return (
    <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-6 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            Ekspertiz Durumu
          </h3>
          <p className="text-[10px] text-slate-500 font-medium mt-1">Interaktif Hasar Haritası</p>
        </div>
        {!readOnly && (
          <button onClick={() => onChange({})} className="text-[10px] px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-all font-bold">
            Sıfırla
          </button>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-8 items-center md:items-start justify-center">

        {/* ── İNTERAKTİF ARAÇ VEKTÖRÜ ── */}
        <div className="shrink-0 relative">
          <svg viewBox="0 0 300 450" className="w-[280px] h-[400px] md:w-[320px] md:h-[450px]">
            {/* Arka plan şase gölgesi */}
            <rect x="60" y="45" width="180" height="360" rx="30" fill="rgba(15, 23, 42, 0.4)" filter="blur(15px)" />
            
            {/* Tekerlekler */}
            <rect x="58" y="90" width="14" height="40" rx="4" fill="#0f172a" stroke="#1e293b" />
            <rect x="228" y="90" width="14" height="40" rx="4" fill="#0f172a" stroke="#1e293b" />
            <rect x="58" y="300" width="14" height="40" rx="4" fill="#0f172a" stroke="#1e293b" />
            <rect x="228" y="300" width="14" height="40" rx="4" fill="#0f172a" stroke="#1e293b" />

            {/* Tüm Interaktif Parçalar */}
            {CAR_PARTS.map(p => (
              <PartArea key={p.key} id={p.key} label={p.label} />
            ))}

            {/* Sabit Camlar */}
            {WINDOWS_SVG.map((d, i) => (
              <path key={i} d={d} fill="rgba(14, 165, 233, 0.15)" stroke="#0284c7" strokeWidth="1" className="pointer-events-none" />
            ))}

            {/* Hover Etiketi */}
            {hov && (() => {
              const p = CAR_PARTS.find(x => x.key === hov);
              if (!p) return null;
              const t = get(hov);
              const lbl = p.label + (t !== 'original' ? ' : ' + DAMAGE_LABELS[t].label : '');
              return (
                <g className="pointer-events-none transition-all">
                  <rect x={150 - (lbl.length * 4)} y={15} width={lbl.length * 8} height={24} rx={12} fill="#1e293b" stroke={DAMAGE_LABELS[t].border} strokeWidth="1" />
                  <text x="150" y="31" textAnchor="middle" fontSize="10" fill="#f8fafc" fontWeight="bold">
                    {lbl}
                  </text>
                </g>
              );
            })()}
          </svg>
          
          {!readOnly && (
            <div className="absolute -bottom-4 inset-x-0 text-center">
              <span className="inline-block px-4 py-1.5 bg-slate-800/80 rounded-full text-[10px] font-bold text-slate-400 border border-slate-700/50 backdrop-blur-sm">
                👆 Rengi değiştirmek için parçaya tıklayın
              </span>
            </div>
          )}
        </div>

        {/* ── SAĞ PANEL (Açıklamalar ve Hasar Listesi) ── */}
        <div className="flex-1 w-full max-w-[280px] space-y-6">
          <div className="bg-slate-900/50 rounded-2xl p-4 border border-slate-800/80">
            <h4 className="text-[10px] uppercase font-black text-slate-600 mb-3 tracking-wider">Durum Renkleri</h4>
            <div className="grid grid-cols-2 gap-3">
              {(Object.entries(DAMAGE_LABELS) as [DamageType, typeof DAMAGE_LABELS[DamageType]][]).map(([k, v]) => (
                <div key={k} className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded shadow-sm border"
                    style={{ backgroundColor: v.color, borderColor: v.border }} />
                  <span className={`text-xs ${k === 'original' ? 'text-slate-500' : 'font-bold text-slate-300'}`}>{v.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900/50 rounded-2xl p-4 border border-slate-800/80 min-h-[160px]">
            <h4 className="text-[10px] uppercase font-black text-slate-600 mb-3 tracking-wider">Detaylı Rapor</h4>
            
            {damaged.length > 0 ? (
              <div className="space-y-4">
                {(['local', 'full', 'changed', 'damaged'] as DamageType[])
                  .filter(t => damaged.some(p => value[p.key] === t))
                  .map(type => (
                    <div key={type}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-1.5 h-4 rounded-full" style={{ backgroundColor: DAMAGE_LABELS[type].border }} />
                        <span className="text-xs font-black uppercase tracking-wide" style={{ color: DAMAGE_LABELS[type].border }}>
                          {DAMAGE_LABELS[type].label}
                        </span>
                      </div>
                      <div className="pl-3.5 space-y-1">
                        {damaged.filter(p => value[p.key] === type).map(p => (
                          <div key={p.key} className="flex items-center justify-between py-1 group/item">
                            <span className="text-xs text-slate-300 font-medium">{p.label}</span>
                            {!readOnly && (
                              <button onClick={() => { const u = { ...value }; delete u[p.key]; onChange(u); }}
                                className="w-5 h-5 flex items-center justify-center rounded bg-slate-800 text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-colors">
                                ✕
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-50 py-4">
                <div className="w-12 h-12 mb-2 rounded-full border-2 border-dashed border-slate-600 flex items-center justify-center">
                  <span className="text-lg">✓</span>
                </div>
                <p className="text-xs font-bold text-slate-400">Tüm Parçalar Orijinal</p>
                {!readOnly && <p className="text-[10px] mt-1 text-slate-500">Değiştirmek için haritayı kullanın</p>}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
