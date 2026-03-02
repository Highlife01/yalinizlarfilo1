import { Card } from "@/components/ui/card";
import { Building2, CarFront, Headphones, ShieldCheck, Users2, Wallet } from "lucide-react";

const stats = [
  { value: "500+", label: "Toplam Müşteri", icon: Users2 },
  { value: "50+", label: "Toplam Araç", icon: CarFront },
  { value: "2", label: "Toplam Şube", icon: Building2 },
  { value: "1250+", label: "Toplam Kiralama", icon: ShieldCheck },
];

const highlights = [
  {
    title: "Uygun Fiyat Garantisi",
    desc: "Segment bazlı net fiyatlandırma ve sürpriz masraf olmadan kiralama.",
    icon: Wallet,
  },
  {
    title: "7/24 Müşteri Desteği",
    desc: "Yol yardım, operasyon ve rezervasyon ekiplerimiz kesintisiz hizmet verir.",
    icon: Headphones,
  },
  {
    title: "Güvenli ve Bakımlı Filo",
    desc: "Tüm araçlarımız düzenli bakımdan geçer, kasko ve sigorta süreçleri takip edilir.",
    icon: ShieldCheck,
  },
];

export const AboutStats = () => {
  return (
    <section id="about" className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground">
            Kurumsal Güven ve Ölçek
          </h2>
          <p className="text-lg text-muted-foreground">
            Referans projelerdeki gibi güven oluşturan metrikleri ve hizmet güvencelerini tek alanda topladık.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {stats.map((item) => (
            <Card key={item.label} className="p-6 border-border bg-card">
              <item.icon className="w-8 h-8 text-primary mb-4" />
              <div className="text-3xl font-bold text-foreground">{item.value}</div>
              <div className="text-sm text-muted-foreground mt-1">{item.label}</div>
            </Card>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {highlights.map((item) => (
            <Card key={item.title} className="p-6 border-border bg-background">
              <item.icon className="w-7 h-7 text-primary mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">{item.title}</h3>
              <p className="text-muted-foreground">{item.desc}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
