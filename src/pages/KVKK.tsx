import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { FloatingContactButtons } from "@/components/FloatingContactButtons";

const KVKK = () => {
    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <main className="container mx-auto px-4 py-24 md:py-32">
                <div className="max-w-4xl mx-auto prose prose-slate">
                    <h1 className="text-3xl font-bold mb-6 text-slate-900">KVKK Aydınlatma Metni</h1>

                    <h3 className="text-xl font-semibold mt-6 mb-3">1. Veri Sorumlusu</h3>
                    <p className="mb-4">
                        6698 sayılı Kişisel Verilerin Korunması Kanunu uyarınca, kişisel verileriniz Veri Sorumlusu olan Yalnızlar Filo Araç Kiralama tarafından ilgili mevzuat doğrultusunda işlenmektedir.
                    </p>

                    <h3 className="text-xl font-semibold mt-6 mb-3">2. Kişisel Verilerin İşlenme Amacı</h3>
                    <p className="mb-4">
                        Toplanan kişisel verileriniz, şirketimiz tarafından sunulan hizmetlerden faydalandırılması, araç kiralama operasyonlarının yürütülmesi, hukuki ve finansal yükümlülüklerin yerine getirilmesi amacıyla işlenmektedir.
                    </p>

                    <h3 className="text-xl font-semibold mt-6 mb-3">3. Kişisel Verilerin Aktarıldığı Taraflar ve Amacı</h3>
                    <p className="mb-4">
                        KVKK'nın 8. ve 9. maddeleri gereğince, yasal yükümlülüklerimiz dahilinde adli ve resmi makamlarla ya da iş etiği gerektirdiği hallerde iş ortaklarımız veya hizmet temin edilen üçüncü kanallar ile paylaşılabilmektedir.
                    </p>

                    <h3 className="text-xl font-semibold mt-6 mb-3">4. Kişisel Veri Toplama Yöntemi</h3>
                    <p className="mb-4">
                        Kişisel verileriniz, internet sitemiz, mobil uygulamalarımız, çağrı merkezimiz veya fiziki ofislerimiz kanalıyla sözlü, fiziki veya elektronik ortamlar aracılığıyla toplanmaktadır.
                    </p>

                    <h3 className="text-xl font-semibold mt-6 mb-3">5. Haklarınız</h3>
                    <p className="mb-4">
                        Kanun'un 11. Maddesi uyarınca; verilerinizin işlenip işlenmediğini öğrenme, yanlış ise düzeltilmesini isteme, kanuna aykırı işlemlerde zarar giderimi talep etme ve benzeri bilgi talep haklarınız bulunmaktadır.
                    </p>

                </div>
            </main>
            <Footer />
            <FloatingContactButtons />
        </div>
    );
};

export default KVKK;
