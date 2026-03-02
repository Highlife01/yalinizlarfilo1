import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

export const FAQ = () => {
    const faqs = [
        {
            question: "Araç kiralamak için yaş ve ehliyet şartları nelerdir?",
            answer: "Ekonomik sınıf araçlar için en az 21 yaş ve 2 yıllık B sınıfı ehliyet, orta ve üst sınıf araçlar için ise 24 yaş ve 3 yıllık ehliyet şartı aranmaktadır."
        },
        {
            question: "Kiralama esnasında depozito (teminat) alınıyor mu?",
            answer: "Evet, kiralanan araç grubuna göre değişen tutarlarda, adınıza kayıtlı geçerli bir kredi kartından provizyon (depozito) alınmaktadır. Hasarsız ve eksiksiz iade durumunda blokaj teknik sürelere bağlı olarak kaldırılır."
        },
        {
            question: "Günlük kilometre kullanım sınırı var mı?",
            answer: "Günlük araç kiralamalarında araç grubuna göre belirlenen günlük kilometre kullanım sınırı (standart olarak günlük 300km) bulunmaktadır. Uzun dönem aylık kiralamalarda ise sözleşmeye özel kilometre limitleri uygulanmaktadır."
        },
        {
            question: "Aracı havalimanından veya farklı bir adresten teslim alabilir miyim?",
            answer: "Evet, Adana Havalimanı (Şakirpaşa) teslimatı yapıyoruz. Önceden bilgi ve onay verilmesi kaydıyla adresinize araç tahsisi de ekstra teslimat ücretine tabidir."
        },
        {
            question: "Kaza veya arıza meydana gelirse ne yapmalıyım?",
            answer: "Acil durumlarda öncelikle 7/24 hizmet veren müşteri destek hattımızla (+90 531 392 47 69) saniye kaybetmeden iletişime geçmelisiniz. Olası kaza durumunda, aracın yerini değiştirmeden kaza tespit tutanağı tutulması mecburidir."
        }
    ];

    return (
        <section id="faq" className="py-24 bg-muted/20">
            <div className="container mx-auto px-4">
                <div className="text-center max-w-3xl mx-auto mb-14 space-y-4">
                    <h2 className="text-3xl md:text-4xl font-bold text-foreground flex items-center justify-center gap-3">
                        <HelpCircle className="w-8 h-8 md:w-10 md:h-10 text-primary" />
                        Sıkça Sorulan Sorular
                    </h2>
                    <p className="text-lg text-muted-foreground">
                        Araç kiralama süreçlerimiz hakkında aklınıza takılabilecek genel sorular ve cevapları.
                    </p>
                </div>

                <div className="max-w-4xl mx-auto">
                    <Accordion type="single" collapsible className="w-full space-y-4">
                        {faqs.map((faq, index) => (
                            <AccordionItem key={index} value={`item-${index}`} className="bg-card border border-border px-6 rounded-lg data-[state=open]:shadow-md transition-all">
                                <AccordionTrigger className="text-left text-base md:text-lg font-medium text-foreground hover:no-underline hover:text-primary py-5">
                                    {faq.question}
                                </AccordionTrigger>
                                <AccordionContent className="text-muted-foreground text-sm md:text-base leading-relaxed pb-5 pt-0">
                                    {faq.answer}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </div>
            </div>
        </section>
    );
};
