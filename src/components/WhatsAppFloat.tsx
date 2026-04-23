import { useState, useEffect } from "react";

export function WhatsAppFloat() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Biraz gecikmeli gelsin
        const timer = setTimeout(() => {
            setIsVisible(true);
        }, 2000);
        return () => clearTimeout(timer);
    }, []);

    if (!isVisible) return null;

    return (
        <a
            id="wa-btn"
            href="https://wa.me/905339465002?text=Merhaba%2C%20ara%C3%A7%20kiralama%20hakk%C4%B1nda%20bilgi%20almak%20istiyorum."
            target="_blank"
            rel="noopener noreferrer"
            aria-label="WhatsApp ile iletişim"
            onClick={() => {
                const w = window as Window & { gtag?: (a: string, b: string, c: Record<string, string>) => void };
                if (typeof window !== "undefined" && w.gtag) {
                    w.gtag("event", "whatsapp_click", {
                        event_category: "engagement",
                        event_label: "float_button"
                    });
                }
            }}
            className="fixed bottom-7 right-7 w-[60px] h-[60px] bg-[#25D366] rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(37,211,102,0.4)] cursor-pointer z-[50] no-underline transition-all duration-200 hover:scale-110 hover:shadow-[0_6px_28px_rgba(37,211,102,0.6)] group"
            style={{
                animation: "wa-pulse 2s infinite"
            }}
        >
            {/* Tooltip */}
            <span className="absolute right-[72px] bg-[#111] text-white px-3 py-2 rounded-lg text-[13px] whitespace-nowrap opacity-0 pointer-events-none transition-opacity duration-200 group-hover:opacity-100 font-sans">
                Hızlı Teklif Al
            </span>

            {/* WhatsApp SVG Icon */}
            <svg viewBox="0 0 24 24" fill="#fff" className="w-[30px] h-[30px]">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.127 1.532 5.862L.057 23.929l6.235-1.635A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.797 9.797 0 01-4.99-1.366l-.356-.213-3.702.97 1.003-3.593-.235-.372A9.818 9.818 0 012.182 12C2.182 6.578 6.578 2.182 12 2.182c5.423 0 9.818 4.396 9.818 9.818 0 5.423-4.395 9.818-9.818 9.818z" />
            </svg>

            <style>
                {`
        @keyframes wa-pulse {
          0%, 100% { box-shadow: 0 4px 20px rgba(37,211,102,0.4); }
          50%  { box-shadow: 0 4px 32px rgba(37,211,102,0.7); }
        }
        `}
            </style>
        </a>
    );
}
