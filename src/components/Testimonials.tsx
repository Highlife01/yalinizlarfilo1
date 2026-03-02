import { Card } from "@/components/ui/card";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Ahmet Genç",
    company: "Lojistik Operasyon Müdürü",
    text: "Filomuza uygun araçları hızlı teslim aldık. Operasyon takibi ve destek ekibi çok hızlı geri dönüyor.",
  },
  {
    name: "Melis Küçükyalı",
    company: "Satın Alma Uzmanı",
    text: "Aylık maliyet planlaması net olduğu için bütçe sürecimiz rahat ilerliyor. Fiyat/performans dengesi iyi.",
  },
  {
    name: "Furkan Küçük",
    company: "Saha Ekip Yöneticisi",
    text: "Bakım ve yol yardım süreçlerinde hiç zaman kaybı yaşamadık. Ekip kullanımı için güvenli bir tercih.",
  },
];

export const Testimonials = () => {
  return (
    <section id="testimonials" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground">Müşteri Görüşleri</h2>
          <p className="text-lg text-muted-foreground">
            Bizi tercih eden yüzlerce kurumsal ve bireysel müşterimizin kiralama deneyimleri ve yorumları.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((item) => (
            <Card key={item.name} className="p-6 border-border bg-card">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, index) => (
                  <Star key={`${item.name}-${index}`} className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                ))}
              </div>
              <p className="text-muted-foreground leading-relaxed mb-6">"{item.text}"</p>
              <div>
                <div className="font-semibold text-foreground">{item.name}</div>
                <div className="text-sm text-muted-foreground">{item.company}</div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
