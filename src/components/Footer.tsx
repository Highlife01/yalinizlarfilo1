import { useState } from "react";
import { Facebook, Instagram, Linkedin, Twitter, Mail, Phone, MapPin } from "lucide-react";

const FOOTER_LOGO_SRC = "/yalinizlar-filo-logo.png";

export const Footer = () => {
  const currentYear = new Date().getFullYear();
  const [footerLogoError, setFooterLogoError] = useState(false);

  return (
    <footer id="footer" className="bg-secondary text-secondary-foreground">
      <div className="container mx-auto px-4">
        {/* Main Footer */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 py-12 sm:py-16">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 sm:gap-3">
              {!footerLogoError && FOOTER_LOGO_SRC ? (
                <img
                  src={FOOTER_LOGO_SRC}
                  alt="Yalınızlar Filo"
                  className="h-10 w-auto sm:h-12 md:h-14 object-contain object-left"
                  onError={() => setFooterLogoError(true)}
                />
              ) : (
                <>
                  <div className="bg-primary w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-xl">Y</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-lg text-white">Yalınızlar</span>
                    <span className="text-xs text-white/70 -mt-1">Filo Yönetimi</span>
                  </div>
                </>
              )}
            </div>
            <p className="text-sm text-white/70 leading-relaxed">
              Kurumsal araç kiralama ve filo yönetimi alanında 15 yılı aşkın
              tecrübemizle işletmelere güvenilir ve ekonomik çözümler sunuyoruz.
            </p>
            {/* Social Links */}
            <div className="flex space-x-3 pt-2">
              {[
                { icon: Facebook, href: "https://facebook.com", label: "Facebook" },
                { icon: Instagram, href: "https://instagram.com/yalinizlarfilo", label: "Instagram" },
                { icon: Linkedin, href: "https://linkedin.com", label: "LinkedIn" },
                { icon: Twitter, href: "https://twitter.com", label: "Twitter" },
              ].map((social, index) => {
                const Icon = social.icon;
                return (
                  <a
                    key={index}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className="w-9 h-9 rounded-lg bg-white/10 hover:bg-primary flex items-center justify-center transition-all duration-300 hover:scale-110 hover:-translate-y-1 shadow-sm hover:shadow-md"
                  >
                    <Icon className="w-4 h-4 text-white" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-bold text-white text-lg mb-4">Hızlı Erişim</h3>
            <ul className="space-y-3">
              {[
                { label: "Ana Sayfa", href: "/" },
                { label: "Rezervasyon", href: "/#reservation" },
                { label: "Rezervasyonlarım", href: "/rezervasyonlarim" },
                { label: "Araç Filomuz", href: "/#fleet" },
                { label: "Yorumlar", href: "/#testimonials" },
                { label: "Kurumsal", href: "/#about" },
                { label: "Blog & Duyurular", href: "/blog" },
                { label: "İletişim", href: "/#contact" },
                { label: "Kiralama Sözleşmesi", href: "/kiralama-sozlesmesi" },
              ].map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-white/70 hover:text-white hover:translate-x-1 inline-block transition-all duration-300 text-sm"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="font-bold text-white text-lg mb-4">Hizmetlerimiz</h3>
            <ul className="space-y-3">
              {[
                "Uzun Dönem Kiralama",
                "Filo Yönetimi",
                "Araç Bakım Hizmetleri",
                "Sigorta Çözümleri",
                "Yol Yardım 7/24",
              ].map((service) => (
                <li key={service}>
                  <span className="text-white/70 text-sm">{service}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="font-bold text-white text-lg mb-4">İletişim</h3>
            <ul className="space-y-4">
              <li className="flex items-start space-x-3">
                <Phone className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-white font-medium">0533 946 50 02</div>
                  <div className="text-white/70 text-sm">Pazartesi - Cuma: 09:00 - 18:00</div>
                </div>
              </li>
              <li className="flex items-start space-x-3">
                <Mail className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-white font-medium">info@yalinizlarfilo.com.tr</div>
                  <div className="text-white/70 text-sm">7/24 online destek</div>
                </div>
              </li>
              <li className="flex items-start space-x-3">
                <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-white font-medium">Yeşiloba, Adana</div>
                  <div className="text-white/70 text-sm">Merkez Ofis</div>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="border-t border-white/10 py-6 mt-16">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-sm text-white/70">
              © {currentYear} Yalınızlar Filo Yönetimi. Tüm hakları saklıdır.
            </p>
            <div className="flex flex-wrap justify-center md:justify-end gap-x-6 gap-y-2 text-sm text-white/70">
              <a href="/kvkk" className="hover:text-white transition-colors">
                KVKK Aydınlatma Metni
              </a>
              <a href="/kiralama-kosullari" className="hover:text-white transition-colors">
                Rezervasyon & Kiralama Koşulları
              </a>
              <a href="/kiralama-sozlesmesi" className="hover:text-white transition-colors">
                Kiralama Sözleşmesi
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
