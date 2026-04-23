import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, Phone, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LOGO_SRC = "/yalinizlar-filo-logo.png";

export const Navbar = () => {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const menuItems = [
    { label: t("nav.home"), href: "#hero" },
    { label: t("nav.fleet"), href: "#fleet" },
    { label: t("nav.services"), href: "#services" },
    { label: t("nav.about"), href: "#about" },
    { label: t("nav.contact"), href: "#contact" },
  ];

  const languages = [
    { code: "tr", label: "Türkçe", flag: "🇹🇷" },
    { code: "en", label: "English", flag: "🇺🇸" },
    { code: "ru", label: "Pусский", flag: "🇷🇺" },
  ];

  const currentLanguage = languages.find(l => l.code === i18n.language) || languages[0];

  const changeLanguage = (code: string) => {
    i18n.changeLanguage(code);
  };

  const scrollTo = (targetId: string) => {
    document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14 sm:h-16 md:h-20">
          <a href="/" className="flex items-center gap-2 sm:gap-3 group flex-shrink-0 min-w-0">
            {!logoError && LOGO_SRC ? (
              <img
                src={LOGO_SRC}
                alt="Yalınızlar Filo"
                className="h-10 w-auto max-w-[160px] sm:h-11 sm:max-w-[200px] md:h-12 md:max-w-[240px] object-contain object-left transition-transform group-hover:scale-[1.02]"
                onError={() => setLogoError(true)}
              />
            ) : (
              <>
                <div className="bg-gradient-to-r from-primary to-accent w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105 flex-shrink-0">
                  <span className="text-white font-bold text-lg sm:text-xl">Y</span>
                </div>
                <div className="flex flex-col hidden sm:flex">
                  <span className="font-bold text-base sm:text-xl text-foreground leading-tight">Yalınızlar</span>
                  <span className="text-[10px] sm:text-xs text-muted-foreground -mt-0.5">Filo Yönetimi</span>
                </div>
              </>
            )}
          </a>

          <div className="hidden md:flex items-center space-x-8">
            {menuItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-foreground hover:text-primary transition-colors font-medium text-sm lg:text-base"
              >
                {item.label}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center space-x-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 gap-2 px-2">
                  <span className="text-lg">{currentLanguage.flag}</span>
                  <span className="hidden lg:inline">{currentLanguage.label}</span>
                  <ChevronDown className="w-3 h-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {languages.map((lang) => (
                  <DropdownMenuItem
                    key={lang.code}
                    className="gap-2 cursor-pointer"
                    onClick={() => changeLanguage(lang.code)}
                  >
                    <span className="text-lg">{lang.flag}</span>
                    <span>{lang.label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <a
              href="tel:+905339465002"
              className="flex items-center space-x-2 text-foreground hover:text-primary transition-colors text-sm lg:text-base"
            >
              <Phone className="w-4 h-4" />
              <span className="font-semibold whitespace-nowrap">0533 946 50 02</span>
            </a>
            <Button
              variant="outline"
              size="sm"
              onClick={() => (window.location.href = "/auth")}
              className="border-primary text-primary hover:bg-primary hover:text-white hidden lg:flex"
            >
              {t("nav.admin")}
            </Button>
            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md shadow-primary/20"
              onClick={() => scrollTo("reservation")}
            >
              {t("hero.cta")}
            </Button>
          </div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 text-foreground hover:text-primary transition-colors"
            aria-label={isOpen ? "Menüyü kapat" : "Menüyü aç"}
            aria-expanded={isOpen}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        <div
          className={cn(
            "md:hidden overflow-hidden transition-all duration-300",
            isOpen ? "max-h-[36rem] pb-6" : "max-h-0"
          )}
        >
          <div className="flex flex-col space-y-4 pt-4">
            <div className="flex items-center justify-between pb-2 border-b">
              <span className="text-sm font-medium text-muted-foreground">{t("nav.contact")}:</span>
              <div className="flex gap-4">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => changeLanguage(lang.code)}
                    className={cn(
                      "text-2xl transition-transform",
                      i18n.language === lang.code ? "scale-125 border-b-2 border-primary" : "opacity-50 grayscale"
                    )}
                  >
                    {lang.flag}
                  </button>
                ))}
              </div>
            </div>

            {menuItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className="text-foreground hover:text-primary transition-colors font-medium"
              >
                {item.label}
              </a>
            ))}
            <a
              href="tel:+905339465002"
              className="flex items-center space-x-2 text-foreground hover:text-primary transition-colors"
            >
              <Phone className="w-4 h-4" />
              <span className="font-semibold">0533 946 50 02</span>
            </a>
            <Button
              variant="outline"
              onClick={() => (window.location.href = "/auth")}
              className="border-primary text-primary hover:bg-primary hover:text-white w-full"
            >
              {t("nav.admin")}
            </Button>
            <Button
              className="bg-primary hover:bg-primary/90 text-primary-foreground w-full"
              onClick={() => {
                setIsOpen(false);
                scrollTo("reservation");
              }}
            >
              {t("hero.cta")}
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};
