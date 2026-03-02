import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Shield, Wrench, DollarSign, Settings, Leaf, TrendingDown, Headphones } from "lucide-react";

export const Services = () => {
  const services = [
    {
      icon: Clock,
      title: "Esnek Kiralama Çözümleri",
      description: "İster kısa ister uzun vadeli, ihtiyacınıza uygun esnek kiralama seçenekleri. Aylık, yıllık veya özel süreli paketler.",
      color: "bg-blue-500/10 text-blue-500",
    },
    {
      icon: DollarSign,
      title: "Maliyet Tasarrufu",
      description: "Rekabetçi fiyatlarla bütçenizi koruyun. Toplam sahip olma maliyetinizi %40'a kadar azaltın.",
      color: "bg-green-500/10 text-green-500",
    },
    {
      icon: Headphones,
      title: "7/24 Destek Hizmeti",
      description: "Yol yardım, teknik destek ve acil durum hizmetleri ile her an yanınızdayız. Telefon ile anında ulaşın.",
      color: "bg-purple-500/10 text-purple-500",
    },
    {
      icon: Wrench,
      title: "Bakım ve Onarım",
      description: "Tüm bakım, onarım ve sigorta işlemleri bizden. Düzenli periyodik bakımlar ve lastik değişimleri dahil.",
      color: "bg-orange-500/10 text-orange-500",
    },
    {
      icon: Shield,
      title: "Güvenlik ve Güvenilirlik",
      description: "Tüm araçlarımız düzenli kontrol edilir ve en yüksek güvenlik standartlarına uygundur. Kasko ve trafik sigortası dahil.",
      color: "bg-red-500/10 text-red-500",
    },
    {
      icon: Settings,
      title: "Özelleştirilebilir Filo Yönetimi",
      description: "Şirket ihtiyaçlarınıza göre özelleştirilmiş filo yönetimi çözümleri. Tam kontrol sizde, esneklik bizde.",
      color: "bg-indigo-500/10 text-indigo-500",
    },
    {
      icon: TrendingDown,
      title: "Operasyonel Verimlilik",
      description: "Online yönetim paneli ile filo takibi, raporlama ve maliyet analizi. Tüm süreçlerinizi dijitalleştirin.",
      color: "bg-pink-500/10 text-pink-500",
    },
    {
      icon: Leaf,
      title: "Sürdürülebilir Seçenekler",
      description: "Hibrit ve elektrikli araç seçenekleri ile çevre dostu filo. Karbon ayak izinizi azaltın, geleceği şekillendirin.",
      color: "bg-emerald-500/10 text-emerald-500",
    },
  ];

  return (
    <section id="services" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
            Neden Yalınızlar Filo?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            İşletmenizin ihtiyaçlarına özel, kapsamlı filo yönetimi çözümlerimizle
            maliyetlerinizi düşürün, verimliliğinizi artırın.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service, index) => (
            <Card
              key={index}
              className="border-border bg-card hover:shadow-xl transition-all duration-300 hover:-translate-y-2 group"
            >
              <CardHeader>
                <div className={`w-14 h-14 rounded-lg ${service.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <service.icon className="w-7 h-7" />
                </div>
                <CardTitle className="text-foreground text-xl">{service.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-muted-foreground leading-relaxed">
                  {service.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-20 grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="text-5xl font-bold text-primary mb-2">50+</div>
            <p className="text-muted-foreground">Aktif Araç Filosu</p>
          </div>
          <div className="text-center">
            <div className="text-5xl font-bold text-primary mb-2">500+</div>
            <p className="text-muted-foreground">Mutlu Kurumsal Müşteri</p>
          </div>
          <div className="text-center">
            <div className="text-5xl font-bold text-primary mb-2">24/7</div>
            <p className="text-muted-foreground">Kesintisiz Destek</p>
          </div>
        </div>
      </div>
    </section>
  );
};