import { useMemo } from 'react';
import { type Vehicle, type AlacakBorc, type KasaHareket, type OrtakHareket } from './hooks';

const fmt = (v: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(v);
const fn = (v: number) => new Intl.NumberFormat('tr-TR').format(v);

const ORTAKLAR_META = [
  { ad: 'Tamer YALINIZ', ozkaynak: 9317835 },
  { ad: 'Feramiz YALINIZ', ozkaynak: 22548949 },
  { ad: 'Mehmet BAYDUMAN', ozkaynak: 4143685 },
];

type Props = {
  vehicles: Vehicle[];
  kasaHareketler: KasaHareket[];
  alacakKayitlar: AlacakBorc[];
  ortakHareketler: OrtakHareket[];
};

export default function BilancoTab({ vehicles, kasaHareketler, alacakKayitlar, ortakHareketler }: Props) {
  const stats = useMemo(() => {
    // STOK (ertas_vehicles'ten gelen gerçek veri — orkestrasyon)
    const stokta = vehicles.filter(v => v.status === 'Stokta' || v.status === 'Rezerve' || v.status === 'Serviste');
    const stokDegeri = stokta.reduce((s, v) => s + (v.purchasePrice || 0) + (v.expenses || 0), 0);

    // KAR (satılan araçlardan)
    const satilan = vehicles.filter(v => v.status === 'Satıldı');
    const toplamKar = satilan.reduce((s, v) => s + ((v.salePrice || 0) - (v.purchasePrice || 0) - (v.expenses || 0)), 0);

    // KASA (ertas_kasa'dan)
    const kasaGiris = kasaHareketler.filter(h => h.tur === 'giris').reduce((s, h) => s + h.tutar, 0);
    const kasaCikis = kasaHareketler.filter(h => h.tur === 'cikis').reduce((s, h) => s + h.tutar, 0);
    const kasaBakiye = kasaGiris - kasaCikis;

    // ALACAKLAR (ertas_alacak'tan)
    const alacaklar = alacakKayitlar.filter(k => k.tur !== 'borc');
    const borclar = alacakKayitlar.filter(k => k.tur === 'borc');

    const acikAlacak = alacaklar.filter(k => k.tur === 'acik').reduce((s, k) => s + k.tutar - (k.tahsil || 0), 0);
    const cekler = alacaklar.filter(k => k.tur === 'cek').reduce((s, k) => s + k.tutar - (k.tahsil || 0), 0);
    const senetler = alacaklar.filter(k => k.tur === 'senet').reduce((s, k) => s + k.tutar - (k.tahsil || 0), 0);
    const toplamBorc = borclar.reduce((s, k) => s + k.tutar - (k.tahsil || 0), 0);

    // VARLIKLAR
    const donenVarliklar = stokDegeri + kasaBakiye + cekler + senetler + acikAlacak;
    const netAktif = donenVarliklar - toplamBorc;

    // ORTAK BAKİYELERİ (ertas_ortak_hareketler'den)
    const ortakBakiyeleri = ORTAKLAR_META.map(o => {
      const hareketler = ortakHareketler.filter(h => h.ortak === o.ad);
      const alacak = hareketler.filter(h => h.tur === 'alacak').reduce((s, h) => s + h.tutar, 0);
      const borc = hareketler.filter(h => h.tur === 'borc').reduce((s, h) => s + h.tutar, 0);
      const cariBakiye = alacak - borc;
      // Toplam sermaye = özkaynak + cari bakiye
      const toplam = o.ozkaynak + cariBakiye;
      return { ...o, alacak, borc, cariBakiye, toplam };
    });

    const ortakToplam = ortakBakiyeleri.reduce((s, o) => s + o.toplam, 0);
    const fark = netAktif - ortakToplam;
    const karOrani = ortakToplam > 0 ? (fark / ortakToplam * 100) : 0;

    return {
      stokta: stokta.length,
      stokDegeri,
      satilan: satilan.length,
      toplamKar,
      kasaBakiye,
      acikAlacak,
      cekler,
      senetler,
      toplamBorc,
      donenVarliklar,
      netAktif,
      ortakBakiyeleri,
      ortakToplam,
      fark,
      karOrani
    };
  }, [vehicles, kasaHareketler, alacakKayitlar, ortakHareketler]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold">📊 Bilanço Özet</h2>
        <p className="text-slate-400 mt-1 text-sm">Canlı hesaplama — Tüm modüllerden otomatik orkestrasyon</p>
      </div>

      {/* Orkestrasyon Bilgi */}
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4 text-xs text-blue-400">
        <span className="font-bold">🔄 Orkestrasyon Aktif:</span> Stok verileri araç envanterinden, kasa bakiyesi kasa modülünden, alacak-borç ve ortak bakiyeleri ilgili modüllerden otomatik çekilmektedir.
      </div>

      {/* Varlık Özeti */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Stok Değeri', value: stats.stokDegeri, cls: 'text-blue-400', sub: `${stats.stokta} araç` },
          { label: 'Kasa Bakiyesi', value: stats.kasaBakiye, cls: 'text-amber-400', sub: 'Net kasa' },
          { label: 'Alınan Çekler', value: stats.cekler, cls: 'text-violet-400', sub: 'Aktif' },
          { label: 'Alacak Senetleri', value: stats.senetler, cls: 'text-emerald-400', sub: 'Aktif' },
          { label: 'Açık Alacaklar', value: stats.acikAlacak, cls: 'text-cyan-400', sub: 'Tahsil edilecek' },
          { label: 'Toplam Kar', value: stats.toplamKar, cls: 'text-green-400', sub: `${stats.satilan} satış` },
        ].map(item => (
          <div key={item.label} className="bg-slate-900/50 rounded-2xl border border-slate-800 p-4 hover:border-slate-700 transition-all">
            <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">{item.label}</p>
            <p className={`text-lg font-bold mt-1 ${item.cls}`}>{fmt(item.value)}</p>
            <p className="text-[10px] text-slate-600 mt-0.5">{item.sub}</p>
          </div>
        ))}
      </div>

      {/* Bilanço Tablosu */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Varlıklar */}
        <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6">
          <h3 className="text-lg font-bold text-emerald-400 mb-4">✦ Dönen Varlıklar</h3>
          <div className="space-y-3">
            {[
              { label: `Stok Değeri (${stats.stokta} araç)`, value: stats.stokDegeri },
              { label: 'Kasa Bakiyesi', value: stats.kasaBakiye },
              { label: 'Alınan Çekler', value: stats.cekler },
              { label: 'Alacak Senetleri', value: stats.senetler },
              { label: 'Açık Alacaklar', value: stats.acikAlacak },
            ].map(row => (
              <div key={row.label} className="flex justify-between items-center text-sm py-2 border-b border-slate-800 last:border-0">
                <span className="text-slate-400">{row.label}</span>
                <span className="font-bold text-emerald-400">{fmt(row.value)}</span>
              </div>
            ))}
            <div className="flex justify-between items-center text-sm pt-3 border-t-2 border-emerald-500/30">
              <span className="font-bold text-white">TOPLAM VARLIKLAR</span>
              <span className="font-bold text-emerald-400 text-lg">{fmt(stats.donenVarliklar)}</span>
            </div>
          </div>
        </div>

        {/* Yükümlülükler */}
        <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6">
          <h3 className="text-lg font-bold text-red-400 mb-4">✦ Borçlar & Yükümlülükler</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm py-2 border-b border-slate-800">
              <span className="text-slate-400">Toplam Borçlar</span>
              <span className="font-bold text-red-400">{fmt(stats.toplamBorc)}</span>
            </div>
            <div className="flex justify-between items-center text-sm pt-3 border-t-2 border-red-500/30">
              <span className="font-bold text-white">NET AKTİF</span>
              <span className={`font-bold text-lg ${stats.netAktif >= 0 ? 'text-amber-400' : 'text-red-400'}`}>{fmt(stats.netAktif)}</span>
            </div>
          </div>

          {/* Net durum kartı */}
          <div className="mt-6 bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 text-center">
            <p className="text-xs text-slate-500 uppercase font-bold">Net Aktif (Varlıklar - Borçlar)</p>
            <p className="text-3xl font-bold text-amber-400 mt-2">{fmt(stats.netAktif)}</p>
          </div>
        </div>
      </div>

      {/* Ortaklara Göre Sermaye Dağılımı */}
      <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6">
        <h3 className="text-lg font-bold mb-2">👥 Ortaklara Göre Sermaye Dağılımı</h3>
        <p className="text-xs text-slate-500 mb-4">Algoritma: Sermaye = Öz Kaynak + Cari Bakiye (Gelen - Giden)</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {stats.ortakBakiyeleri.map(o => (
            <div key={o.ad} className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-violet-500/20 rounded-lg flex items-center justify-center text-sm font-bold text-violet-400">
                  {o.ad.charAt(0)}
                </div>
                <p className="font-bold text-sm">{o.ad}</p>
              </div>
              <p className="text-xl font-bold text-emerald-400">{fmt(o.toplam)}</p>
              <div className="mt-2 space-y-1 text-[10px]">
                <div className="flex justify-between text-slate-400">
                  <span>Özkaynak:</span>
                  <span className="font-bold">{fn(o.ozkaynak)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Cari Bakiye:</span>
                  <span className={`font-bold ${o.cariBakiye >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {o.cariBakiye >= 0 ? '+' : ''}{fn(o.cariBakiye)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bilanço Karşılaştırma */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 text-center">
            <p className="text-[10px] text-slate-500 uppercase font-bold">Dönen Varlıklar</p>
            <p className="text-lg font-bold text-emerald-400 mt-1">{fmt(stats.netAktif)}</p>
          </div>
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3 text-center">
            <p className="text-[10px] text-slate-500 uppercase font-bold">Bilanço (Ortaklar)</p>
            <p className="text-lg font-bold text-blue-400 mt-1">{fmt(stats.ortakToplam)}</p>
          </div>
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 text-center">
            <p className="text-[10px] text-slate-500 uppercase font-bold">Fark (Fazlalık)</p>
            <p className={`text-lg font-bold mt-1 ${stats.fark >= 0 ? 'text-amber-400' : 'text-red-400'}`}>{fmt(stats.fark)}</p>
          </div>
          <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-3 text-center">
            <p className="text-[10px] text-slate-500 uppercase font-bold">Kar Oranı</p>
            <p className={`text-lg font-bold mt-1 ${stats.karOrani >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              %{stats.karOrani.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Algoritma Formülleri */}
      <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6">
        <h3 className="text-lg font-bold mb-4">🔢 Hesap Algoritmaları</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { title: 'Araç Maliyet', formula: 'TOPLAM_MALİYET = alış_fiyatı + masraflar', desc: 'Stok sayfasından otomatik' },
            { title: 'Kar-Zarar', formula: 'NET_KAR = satış_fiyatı - TOPLAM_MALİYET', desc: 'Satılan araçlardan otomatik' },
            { title: 'Kiralama Geliri', formula: 'NET_GELİR = aylık_kira × süre - masraflar', desc: 'Kiralık stoktan otomatik' },
            { title: 'Alacak Takip', formula: 'KALAN = toplam_alacak - tahsil_edilen', desc: 'Alacak-borç modülünden' },
            { title: 'Ortak Bakiye', formula: 'BAKİYE = SUM(gelen) - SUM(giden)', desc: 'Ortak cari modülünden' },
            { title: 'Bilanço', formula: 'NET_AKTİF = stok + kasa + çek + senet + açık - borç', desc: 'Tüm modüllerden orkestrasyon' },
          ].map(f => (
            <div key={f.title} className="bg-slate-800/50 rounded-xl p-3 border border-slate-700">
              <p className="text-xs font-bold text-blue-400 mb-1">{f.title}</p>
              <p className="text-[11px] font-mono text-amber-400">{f.formula}</p>
              <p className="text-[10px] text-slate-500 mt-1">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
