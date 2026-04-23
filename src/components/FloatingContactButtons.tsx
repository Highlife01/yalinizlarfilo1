import { Phone } from "lucide-react";

export const FloatingContactButtons = () => {
  return (
    <a
      href="tel:+905339465002"
      className="fixed bottom-20 right-5 z-[50] h-12 w-12 rounded-full bg-primary text-white shadow-lg flex items-center justify-center hover:bg-primary/90 hover:scale-110 transition-all duration-300 print:hidden"
      aria-label="Bizi arayın"
    >
      <Phone className="w-5 h-5" />
    </a>
  );
};
