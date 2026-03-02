import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { ArrowLeft, CheckCircle2, MapPin, Car, CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SEOLandingPage() {
  const { slug } = useParams<{ slug: string }>();

  // Parse SEO Slug – Apps Script ile uyumlu (il-ilçe-segment-kiralama-arac-kiralama)
  // Örnek: adana-seyhan-suv-gunluk-arac-kiralama veya adana-seyhan-orta-sinif-uzun-donem-arac-kiralama
  const pageData = useMemo(() => {
    if (!slug || !slug.endsWith('-arac-kiralama')) return null;

    const parts = slug.split('-');
    // En az: city, district, segment+terms (2+), arac, kiralama → 6 parça; Orta-Sinif / Uzun-Donem için 7+
    if (parts.length < 6 || parts[parts.length - 2] !== 'arac' || parts[parts.length - 1] !== 'kiralama') {
      return null;
    }

    const city = (parts[0].charAt(0).toUpperCase() + parts[0].slice(1)).replace(/i/g, 'İ');
    const district = parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
    const middleParts = parts.slice(2, -2);
    const segmentAndTerms = middleParts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');

    const havalimani = 'Çukurova Uluslararası Havalimanı';
    const title = `${city} ${district} ${segmentAndTerms} Araç Kiralama | ${havalimani} Teslim`;
    const description = `${city} ${district} bölgesinde ${segmentAndTerms} araç kiralama. ${havalimani} teslim, 7/24 destek, uygun fiyat.`;
    const h1Heading = `${city} ${district} ${segmentAndTerms} Araç Kiralama`;

    return { city, district, segmentAndTerms, title, description, h1Heading };
  }, [slug]);

  // If path is malformed or not an SEO route URL, render fallback
  if (!pageData) {
    return (
      <HelmetProvider>
        <Helmet>
          <title>Sayfa Bulunamadı | Yalınızlar Filo</title>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
          <h1 className="text-3xl font-bold text-white mb-4">Sayfa Bulunamadı</h1>
          <Button asChild variant="secondary">
            <Link to="/">Ana Sayfaya Dön</Link>
          </Button>
        </div>
      </HelmetProvider>
    );
  }

  return (
    <HelmetProvider>
      <Helmet>
        <title>{pageData.title}</title>
        <meta name="description" content={pageData.description} />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={`https://www.yalinizlarfilo.com.tr/${slug}`} />
        {/* Open Graph / sosyal paylaşım */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content={pageData.title} />
        <meta property="og:description" content={pageData.description} />
        <meta property="og:url" content={`https://www.yalinizlarfilo.com.tr/${slug}`} />
        <meta property="og:locale" content="tr_TR" />
      </Helmet>

      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        
        {/* Simple Top Navigation */}
        <header className="bg-slate-950 text-white w-full py-4 px-6 border-b border-slate-800 sticky top-0 z-50 shadow-md">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
             <Link to="/" className="text-xl font-bold tracking-wider hover:text-blue-400 transition-colors">
                YALINIZLAR <span className="text-blue-500 font-light">FİLO</span>
             </Link>
             <Button variant="ghost" asChild className="text-slate-300 hover:text-white">
                <Link to="/"><ArrowLeft className="w-4 h-4 mr-2" /> Ana Sayfa</Link>
             </Button>
          </div>
        </header>

        {/* Hero Section dynamically adapting to SEO slugs */}
        <section className="bg-slate-900 border-b border-slate-800 text-white pt-24 pb-32 px-6 relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #3b82f6 0%, transparent 100%)', backgroundSize: '100% 100%' }}></div>
          
          <div className="max-w-4xl mx-auto relative z-10 text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium">
               <MapPin className="w-4 h-4" />
               Çukurova Uluslararası Havalimanı Merkezli
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
               {pageData.h1Heading}
            </h1>
            
            <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
              {pageData.city} ili, {pageData.district} bölgesinde profesyonel araç kiralama deneyimi. 
              {pageData.segmentAndTerms} seçenekleriyle en yeni araç filomuzla hizmetinizdeyiz.
            </p>

            <div className="pt-4 flex flex-wrap justify-center gap-4">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-8 h-14 rounded-lg shadow-lg shadow-blue-900/20 transition-all">
                Hemen Teklif Al
              </Button>
              <Button size="lg" variant="outline" className="border-slate-700 text-slate-200 hover:bg-slate-800 h-14 px-8 rounded-lg transition-all" asChild>
                <Link to="/">Filomuzu İncele</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Dynamic Feature Highlights */}
        <section className="py-20 px-6 max-w-6xl mx-auto -mt-16 relative z-20">
          <div className="grid md:grid-cols-3 gap-6">
            
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col">
              <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6">
                <MapPin className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">{pageData.district} ve Çevresinde</h3>
              <p className="text-slate-600 leading-relaxed">
                {pageData.city} / {pageData.district} noktasından veya Çukurova Uluslararası Havalimanı'ndan aracınızı teslim alabilir veya adresinize çağırabilirsiniz.
              </p>
            </div>

            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col">
              <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6">
                <Car className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">{pageData.segmentAndTerms} Filomuz</h3>
              <p className="text-slate-600 leading-relaxed">
                İhtiyacınız olan sınıfındaki son model, periyodik bakımları tam ve kaskolu araç filomuzdan dilediğinizi seçin.
              </p>
            </div>

            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col">
              <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6">
                <CalendarClock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Esnek Kiralama Seçenekleri</h3>
              <p className="text-slate-600 leading-relaxed">
                Süresi planlarınıza uyduramamaktan endişelenmeyin. Ekonomik planları ve 7/24 kesintisiz müşteri hizmetleri ile yanınızdayız.
              </p>
            </div>

          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-16 px-6 bg-slate-950 text-white mt-auto">
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12">
            <div className="flex-1 space-y-6">
              <h2 className="text-3xl font-bold">Neden Yalınızlar Filo?</h2>
              <ul className="space-y-4">
                {[
                  "Tam Donanımlı ve Full Kaskolu Araçlar", 
                  "Gizli Ücret veya Sürpriz Masraflar Yok",
                  "Çukurova Uluslararası Havalimanı Transfer & Karşılama", 
                  "Kurumsal Faturalandırma Avantajları"
                ].map((item, idx) => (
                  <li key={idx} className="flex items-center gap-3 text-slate-300">
                    <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
        
        {/* Simple Footer */}
        <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-8 text-center text-sm">
          <p>© {new Date().getFullYear()} Yalınızlar Filo Yönetimi. Tüm hakları saklıdır.</p>
          <div className="mt-2 text-slate-500 text-xs text-center">
             <Link to="/" className="hover:text-blue-400">Ana Sayfa</Link>
          </div>
        </footer>

      </div>
    </HelmetProvider>
  );
}
