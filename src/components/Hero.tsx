import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Phone, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import heroImage1 from "@/assets/hero-fleet-1.jpg";
import heroImage2 from "@/assets/hero-fleet-2.jpg";
import heroImage3 from "@/assets/hero-fleet-3.jpg";
import heroImage4 from "@/assets/hero-fleet-4.jpg";

const heroImages = [heroImage1, heroImage2, heroImage3, heroImage4];
const heroImageAlts = [
  "Yalınızlar Filo - kurumsal araç filosu",
  "Yalınızlar Filo - lüks araç kiralama",
  "Yalınızlar Filo - çeşitli araç seçenekleri",
  "Yalınızlar Filo - güvenilir kiralama hizmeti",
];

export const Hero = () => {
  const { t } = useTranslation();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const advanceImage = useCallback(() => {
    setCurrentImageIndex((prev) => (prev + 1) % heroImages.length);
  }, []);

  useEffect(() => {
    const interval = setInterval(advanceImage, 5000);
    return () => clearInterval(interval);
  }, [advanceImage]);

  return (
    <section id="hero" className="relative min-h-screen flex items-center pt-20 overflow-hidden">
      {/* Background Images with Carousel */}
      <div className="absolute inset-0">
        {heroImages.map((image, index) => (
          <img
            key={index}
            src={image}
            alt={heroImageAlts[index]}
            loading={index === 0 ? "eager" : "lazy"}
            fetchPriority={index === 0 ? "high" : "auto"}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${index === currentImageIndex ? "opacity-100" : "opacity-0"
              }`}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-r from-navy/95 via-navy/85 to-navy/70" />
      </div>

      {/* Decorative Elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 right-10 w-72 h-72 bg-primary rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-accent rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl">
          {/* Content */}
          <div className="text-white space-y-6 sm:space-y-8 animate-fade-in">
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
                {t("hero.title")}
                <span className="block text-primary mt-2">{t("hero.subtitle")}</span>
              </h1>
              <p className="text-lg md:text-xl text-white/80 max-w-xl">
                {t("hero.description")}
              </p>
            </div>

            {/* Features List */}
            <div className="space-y-3">
              {[
                t("hero.feature1"),
                t("hero.feature2"),
                t("hero.feature3"),
                t("hero.feature4"),
              ].map((feature) => (
                <div key={feature} className="flex items-center space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-white/90">{feature}</span>
                </div>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                size="lg"
                onClick={() => document.getElementById('reservation')?.scrollIntoView({ behavior: 'smooth' })}
                className="bg-primary hover:bg-primary/90 text-white shadow-[0_8px_32px_-4px_hsl(var(--primary)/0.5)] hover:shadow-[0_12px_40px_-4px_hsl(var(--primary)/0.6)] transition-all"
              >
                {t("hero.cta")}
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button
                size="lg"
                onClick={() => window.location.href = 'tel:+905339465002'}
                className="bg-white text-navy hover:bg-white/90 shadow-lg"
              >
                <Phone className="mr-2 w-5 h-5" />
                {t("hero.call")}
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 pt-8 border-t border-white/10">
              {[
                { value: "50+", label: t("hero.stat_vehicles") },
                { value: "500+", label: t("hero.stat_customers") },
                { value: "15+", label: t("hero.stat_experience") },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-primary">
                    {stat.value}
                  </div>
                  <div className="text-sm text-white/70 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

    </section>
  );
};

