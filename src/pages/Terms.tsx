import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { FloatingContactButtons } from "@/components/FloatingContactButtons";

const Terms = () => {
    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <main className="container mx-auto px-4 py-24 md:py-32">
                <div className="max-w-4xl mx-auto prose prose-slate">
                    <h1 className="text-3xl font-bold mb-6 text-slate-900">Rezervasyon & Kiralama Koşulları</h1>

                    <h3 className="text-xl font-semibold mt-6 mb-3">1. Sürücü Belgesi ve Yaş Sınırları</h3>
                    <p className="mb-4">
                        Ekonomik grup araçlar için en az 21 yaş ve 2 yıllık geçerli sürücü belgesi, orta grup araçlar için en az 25 yaş ve 3 yıllık geçerli sürücü belgesi, üst grup araçlar için en az 28 yaş ve 5 yıllık geçerli sürücü belgesi gereklidir.
                    </p>

                    <h3 className="text-xl font-semibold mt-6 mb-3">2. Kiralama Süresi</h3>
                    <p className="mb-4">
                        En kısa kiralama süresi 24 saattir. Gecikme durumunda ek ücretler uygulanabilir.
                    </p>

                    <h3 className="text-xl font-semibold mt-6 mb-3">3. Yakıt Politikası</h3>
                    <p className="mb-4">
                        Araçlar teslim edildiği yakıt seviyesinde iade edilmelidir. Eksik yakıt durumunda güncel akaryakıt fiyatları üzerinden fark ve hizmet bedeli tahsil edilir.
                    </p>

                    <h3 className="text-xl font-semibold mt-6 mb-3">4. Kilometre Sınırı</h3>
                    <p className="mb-4">
                        Aksi belirtilmedikçe günlük olarak ya da toplam kiralamada belirli bir kilometre sınırı vardır. (Örn. toplam kiralama 3000 km sınırındadır.) Aşılan her kilometre için ek ücret tahsil edilir.
                    </p>

                    <h3 className="text-xl font-semibold mt-6 mb-3">5. Sigorta ve Güvenceler</h3>
                    <p className="mb-4">
                        Araçlarımız Kasko ve Zorunlu Trafik Sigortası kapsamındadır. Hasar durumunda müşterinin kusur oranına göre veya polis zabıt durumlarına göre sorumluluğu belirlenir.
                    </p>

                </div>
            </main>
            <Footer />
            <FloatingContactButtons />
        </div>
    );
};

export default Terms;
