import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { FloatingContactButtons } from "@/components/FloatingContactButtons";

const contractTerms: string[] = [
  "Aracin kira bedeline ve ek hizmet bedellerine iliskin tahsilatlar kiralama baslangicinda yapilir. Teminat tutari arac segmenti ve kiralama suresine gore Yalinizlar tarafindan belirlenir.",
  "Kiraci, araci teslim aninda kontrol ederek teslim alir ve teslim formundaki kayitlari kabul eder.",
  "Kiralama suresince olusan trafik cezalari, HGS/otoyol, otopark, cekici ve ilgili hizmet bedelleri kiraciya aittir.",
  "Arac eksik yakitla iade edilirse eksik yakit bedeli ve hizmet bedeli tahsil edilir.",
  "Sozlesmede belirtilen kilometre limiti asildiginda asim bedeli uygulanir.",
  "Arac; yaris, hiz denemesi, yasa disi tasima, kiralama disi ticari kullanim ve benzeri amaclarla kullanilamaz.",
  "Sigorta kapsami disinda kalan tum hasar, deger kaybi ve is kaybi bedelleri kiraci tarafindan karsilanir.",
  "Aracta olusan aksesuar, lastik, jant, anahtar, ruhsat ve belge kayiplari kiraci sorumlulugundadir.",
  "Kaza halinde gerekli evraklar (kaza tutanagi, alkol raporu vb.) en gec 24 saat icinde Yalinizlar'a teslim edilir.",
  "Alkollu/uyusturucu etkisinde kullanimda tum sigorta teminatlari gecersiz olur, dogan tum zararlar kiraciya aittir.",
  "Aracin sozlesme disi kisiye kullandirilmasi halinde kiraci ve kullanici muteselsilen sorumludur.",
  "Gecikmeli iadede, tarifedeki gecikme bedelleri uygulanir ve dogan zararlar ayrica tahsil edilir.",
  "Arac iade sirasinda olagan kullanim disi kirlenme, hasar ve eksiklik tespitlerinde ek ucret uygulanir.",
  "Yalinizlar, operasyonel guvenlik kapsaminda arac takip sistemlerini kullanabilir.",
  "Kiraci, iletisim ve kimlik bilgilerinin dogrulugundan sorumludur; yanlis beyan halinde sozlesme tek tarafli feshedilebilir.",
  "Yalinizlar gerekli durumlarda esdeger arac tahsisi yapabilir.",
  "Kiralama uzatmalari arac uygunlugu ve fiyat onayi ile yapilir.",
  "Kiralama sonunda kisisel esyalarin teslim alinmasi kiracinin sorumlulugundadir.",
  "Uyusmazliklarda Yalinizlar kayitlari HMK m.193 kapsaminda delil niteligindedir.",
  "Sozlesmeden dogan ihtilaflarda Adana Mahkemeleri ve Icra Daireleri yetkilidir.",
];

const dottedField = (label: string) => (
  <div className="rounded-md border border-red-200 bg-white px-2.5 py-1.5 text-[12px] leading-5 text-slate-700">
    <span className="font-medium text-slate-900">{label}: </span>
    ........................................
  </div>
);

const RentalAgreement = () => {
  const kmRows = Array.from({ length: 31 }, (_, index) => {
    const day = index + 1;
    const totalLimit = Math.min(day * 300, 3000);

    return {
      day,
      dailyLimit: day <= 10 ? "300 KM" : "Aylik limite dahil",
      totalLimit: `${totalLimit} KM`,
    };
  });

  return (
    <div className="min-h-screen bg-red-50/40">
      <Navbar />
      <main className="container mx-auto px-2 py-20 md:px-3 md:py-24">
        <section className="mx-auto max-w-6xl overflow-hidden rounded-xl border border-red-200 bg-white shadow-[0_18px_40px_-24px_rgba(185,28,28,0.5)]">
          <div className="grid gap-2 border-b border-red-200 bg-red-50 p-3 md:grid-cols-[1fr_2fr_2fr] md:p-3">
            <div className="flex items-center justify-center rounded-lg border border-red-200 bg-white p-2 text-2xl font-bold lowercase tracking-tight text-slate-900">
              yalinizlar
            </div>
            <div className="rounded-lg border border-red-200 bg-white p-2.5 text-center">
              <p className="text-sm font-semibold tracking-wide text-slate-900 md:text-base">ARAC KIRALAMA SOZLESMESI</p>
              <p className="text-xs text-slate-600">Rental Agreement</p>
            </div>
            <div className="rounded-lg border border-red-200 bg-white p-2.5 text-xs leading-5 text-slate-700">
              <p className="font-semibold text-slate-900">Yalinizlar Filo Hizmetleri</p>
              <p>Yesiloba Mah. Oto Galericiler Sitesi, Seyhan / ADANA</p>
              <p>www.yalinizlarfilo.com.tr</p>
              <p>info@yalinizlarfilo.com.tr</p>
              <p className="font-semibold">Cagri Merkezi: 0850 333 28 86</p>
            </div>
          </div>

          <div className="grid gap-3 border-b border-red-200 p-3 md:grid-cols-[2fr_1fr]">
            <div className="grid gap-2 md:grid-cols-2">
              {dottedField("Adi Soyadi")}
              {dottedField("TC Kimlik / YKN")}
              {dottedField("Telefon")}
              {dottedField("E-Posta")}
              {dottedField("Ehliyet No")}
              {dottedField("Ehliyet Verilis Tarihi")}
              <div className="md:col-span-2">{dottedField("Adres")}</div>
            </div>

            <div className="space-y-2">
              <p className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-700">
                Ek Surucu Bilgileri
              </p>
              {dottedField("Adi Soyadi")}
              {dottedField("TC Kimlik / YKN")}
              {dottedField("Ehliyet No")}
              {dottedField("Ehliyet Tarihi")}
            </div>
          </div>

          <div className="grid gap-3 border-b border-red-200 p-3 md:grid-cols-[2fr_1fr]">
            <div className="grid gap-2 md:grid-cols-2">
              {dottedField("Rezervasyon No")}
              {dottedField("Odeme Tipi")}
              {dottedField("Plaka")}
              {dottedField("Arac Grubu")}
              {dottedField("Alis Lokasyonu")}
              {dottedField("Donus Lokasyonu")}
              {dottedField("Alis Tarih/Saat")}
              {dottedField("Donus Tarih/Saat")}
            </div>

            <div className="rounded-md border border-red-200 bg-red-50/60 p-2.5 text-xs leading-5 text-slate-700">
              <p className="mb-1.5 font-semibold text-slate-900">Onemli Uyarilar</p>
              <ul className="list-disc space-y-1 pl-4">
                <li>Kusurlu hasarlarda hasar tutari ve hizmet bedeli uygulanir.</li>
                <li>Eksik yakit iadesinde yakit farki + hizmet bedeli alinir.</li>
                <li>Sigorta kapsami disindaki tum bedeller kiraciya aittir.</li>
                <li>HGS/otoyol gecislerinde hizmet bedeli uygulanabilir.</li>
                <li>Bu formda olmayan hususlarda sozlesme kosullari gecerlidir.</li>
              </ul>
            </div>
          </div>

          <div className="border-b border-red-200 p-3">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-900">I - Kiralama Sozlesmesi Kosullari</h2>
            <ol className="list-decimal space-y-1 pl-5 text-sm leading-5 text-slate-700">
              {contractTerms.map((term) => (
                <li key={term}>{term}</li>
              ))}
            </ol>
          </div>

          <div className="border-b border-red-200 p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-900">II - Kilometre Limitleri</h2>
              <div className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                Gunluk limit: 300 KM | Aylik toplam limit: 3000 KM
              </div>
            </div>

            <div className="overflow-x-auto rounded-md border border-red-200">
              <table className="min-w-full border-collapse text-xs text-slate-700">
                <thead className="bg-red-50">
                  <tr>
                    <th className="border border-red-200 px-2.5 py-1.5 text-left font-semibold text-slate-900">Gun</th>
                    <th className="border border-red-200 px-2.5 py-1.5 text-left font-semibold text-slate-900">Gunluk Limit</th>
                    <th className="border border-red-200 px-2.5 py-1.5 text-left font-semibold text-slate-900">Toplam Limit</th>
                  </tr>
                </thead>
                <tbody>
                  {kmRows.map((row) => (
                    <tr key={row.day} className="odd:bg-white even:bg-slate-50">
                      <td className="border border-red-200 px-2.5 py-1.5">{row.day}</td>
                      <td className="border border-red-200 px-2.5 py-1.5">{row.dailyLimit}</td>
                      <td className="border border-red-200 px-2.5 py-1.5">{row.totalLimit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-3 p-3 md:grid-cols-[2fr_1fr_1fr]">
            <div className="rounded-md border border-red-200 bg-red-50 p-2.5 text-xs leading-5 text-slate-700">
              <p className="mb-1.5 font-semibold text-slate-900">KVKK Aydinlatma</p>
              <p>
                Kisisel verileriniz, ilgili mevzuata uygun sekilde sozlesme ve operasyon sureclerinin yurutulmesi amaciyla islenebilir.
              </p>
            </div>
            <div className="rounded-md border border-red-200 p-2.5 text-center text-xs text-slate-700">
              <p className="font-semibold text-slate-900">Kiraci Imza</p>
              <div className="mt-8 border-b border-slate-400" />
            </div>
            <div className="rounded-md border border-red-200 p-2.5 text-center text-xs text-slate-700">
              <p className="font-semibold text-slate-900">Ikinci Sofor Imza</p>
              <div className="mt-8 border-b border-slate-400" />
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <FloatingContactButtons />
    </div>
  );
};

export default RentalAgreement;
