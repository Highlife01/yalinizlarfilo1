import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
    tr: {
        translation: {
            "nav": {
                "home": "Ana Sayfa",
                "fleet": "Filomuz",
                "services": "Hizmetlerimiz",
                "about": "Hakkımızda",
                "contact": "İletişim",
                "admin": "Yönetim"
            },
            "hero": {
                "title": "Filo Yönetiminde",
                "subtitle": "Yeni Dönem",
                "description": "Kurumsal araç kiralama ve filo yönetimi hizmetleri ile işletmenizin ihtiyaçlarına özel çözümler sunuyoruz.",
                "cta": "Hemen Rezervasyon Yapın",
                "call": "Bizi Arayın",
                "feature1": "50+ aktif araç filosu",
                "feature2": "Esnek kiralama seçenekleri",
                "feature3": "7/24 teknik destek ve yol yardım",
                "feature4": "Tüm bakım ve onarımlar dahil",
                "stat_vehicles": "Araç",
                "stat_customers": "Müşteri",
                "stat_experience": "Yıl Tecrübe"
            },
            "fleet": {
                "title": "Araç Filomuz",
                "description": "Her bütçeye ve ihtiyaca uygun geniş araç seçeneklerimiz ile işletmenizin beklentilerini karşılıyoruz.",
                "daily": "Gün",
                "monthly": "Ay"
            }
        }
    },
    en: {
        translation: {
            "nav": {
                "home": "Home",
                "fleet": "Fleet",
                "services": "Services",
                "about": "About",
                "contact": "Contact",
                "admin": "Admin"
            },
            "hero": {
                "title": "A New Era in",
                "subtitle": "Fleet Management",
                "description": "We offer solutions tailored to your business needs with corporate car rental and fleet management services.",
                "cta": "Book Now",
                "call": "Call Us",
                "feature1": "50+ active vehicle fleet",
                "feature2": "Flexible rental options",
                "feature3": "24/7 technical support & roadside assistance",
                "feature4": "All maintenance and repairs included",
                "stat_vehicles": "Vehicles",
                "stat_customers": "Customers",
                "stat_experience": "Years Experience"
            },
            "fleet": {
                "title": "Our Fleet",
                "description": "We meet your business expectations with a wide range of vehicle options suitable for every budget and need.",
                "daily": "Day",
                "monthly": "Month"
            }
        }
    },
    ru: {
        translation: {
            "nav": {
                "home": "Главная",
                "fleet": "Автопарк",
                "services": "Услуги",
                "about": "О нас",
                "contact": "Контакт",
                "admin": "Админ"
            },
            "hero": {
                "title": "Новая эра в",
                "subtitle": "Управлении флотом",
                "description": "Мы предлагаем решения, адаптированные к вашим бизнес-потребностям, в сфере корпоративного проката автомобилей и управления автопарком.",
                "cta": "Забронировать сейчас",
                "call": "Позвоните нам",
                "feature1": "50+ активных транспортных средств",
                "feature2": "Гибкие варианты аренды",
                "feature3": "Техподдержка и помощь на дороге 24/7",
                "feature4": "Все техобслуживание и ремонт включены",
                "stat_vehicles": "Автомобилей",
                "stat_customers": "Клиентов",
                "stat_experience": "Лет опыта"
            },
            "fleet": {
                "title": "Наш автопарк",
                "description": "Мы оправдываем ваши деловые ожидания благодаря широкому выбору транспортных средств, подходящих для любого бюджета и потребностей.",
                "daily": "День",
                "monthly": "Месяц"
            }
        }
    }
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'tr',
        interpolation: {
            escapeValue: false
        }
    });

export default i18n;
