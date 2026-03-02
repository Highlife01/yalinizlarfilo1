import { useState } from "react";
import { addDoc, collection } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/integrations/firebase/client";
import { Mail, Phone, Building2, Send } from "lucide-react";

export const QuoteForm = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const vehicleCountRaw = String(formData.get("vehicle-count") || "").trim();
    const payload = {
      name: String(formData.get("name") || "").trim(),
      company: String(formData.get("company") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      vehicle_count: vehicleCountRaw ? Number(vehicleCountRaw) : null,
      message: String(formData.get("message") || "").trim(),
      createdAt: new Date().toISOString(),
      source: "website_contact_form",
      isRead: false,
    };

    try {
      await addDoc(collection(db, "contact_messages"), payload);
      toast({
        title: "Başarılı!",
        description: "Mesajınız alındı. En kısa sürede sizinle iletişime geçeceğiz.",
      });
      (e.target as HTMLFormElement).reset();
    } catch (error) {
      console.error("Error submitting contact message:", error);
      toast({
        title: "Hata!",
        description: "Mesaj gönderilirken bir hata oluştu. Lütfen tekrar deneyin.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contact" className="py-20 bg-gradient-to-b from-primary/5 via-background to-background">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-8 items-start">
          <div className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-4xl md:text-5xl font-bold text-foreground">İletişim Formu</h2>
              <p className="text-lg text-muted-foreground">
                Sorularınız, iş birliği talepleriniz veya filo kiralama ihtiyacınız için bize yazın.
                Mesajınız yönetim panelindeki mesaj kutusuna düşer.
              </p>
            </div>

            <div className="space-y-4">
              <Card className="p-5 hover:shadow-lg transition-shadow border-border bg-card">
                <div className="flex items-center space-x-4">
                  <div className="bg-primary/10 rounded-lg p-3">
                    <Phone className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">Telefon</div>
                    <div className="text-muted-foreground">0531 392 47 69</div>
                  </div>
                </div>
              </Card>

              <Card className="p-5 hover:shadow-lg transition-shadow border-border bg-card">
                <div className="flex items-center space-x-4">
                  <div className="bg-primary/10 rounded-lg p-3">
                    <Mail className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">E-posta</div>
                    <div className="text-muted-foreground">info@yalinizlarfilo.com.tr</div>
                  </div>
                </div>
              </Card>

              <Card className="p-5 hover:shadow-lg transition-shadow border-border bg-card">
                <div className="flex items-center space-x-4">
                  <div className="bg-primary/10 rounded-lg p-3">
                    <Building2 className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">Adres</div>
                    <div className="text-muted-foreground">Adana</div>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          <Card className="p-6 md:p-7 border-border bg-card shadow-lg">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-semibold text-foreground">Ad Soyad *</label>
                  <Input id="name" name="name" placeholder="Adınız Soyadınız" required className="h-11" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="company" className="text-sm font-semibold text-foreground">Firma Adı</label>
                  <Input id="company" name="company" placeholder="Firma Adınız" className="h-11" />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-semibold text-foreground">E-posta *</label>
                  <Input id="email" name="email" type="email" placeholder="ornek@email.com" required className="h-11" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="phone" className="text-sm font-semibold text-foreground">Telefon *</label>
                  <Input id="phone" name="phone" type="tel" placeholder="05XX XXX XX XX" required className="h-11" />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="vehicle-count" className="text-sm font-semibold text-foreground">İhtiyaç duyduğunuz araç sayısı</label>
                <Input id="vehicle-count" name="vehicle-count" type="number" placeholder="Örn: 10" className="h-11" />
              </div>

              <div className="space-y-2">
                <label htmlFor="message" className="text-sm font-semibold text-foreground">Mesajınız *</label>
                <Textarea id="message" name="message" placeholder="İhtiyacınızı veya sorularınızı yazın..." required className="min-h-32" />
              </div>

              <Button type="submit" disabled={isSubmitting} className="w-full bg-primary hover:bg-primary/90 text-white" size="lg">
                {isSubmitting ? "Gönderiliyor..." : <><span>Mesaj Gönder</span><Send className="ml-2 w-5 h-5" /></>}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </section>
  );
};
