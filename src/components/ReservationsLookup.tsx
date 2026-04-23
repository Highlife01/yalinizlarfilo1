import { useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CalendarDays, MapPin, Phone, Search, Clock } from "lucide-react";

type PublicBooking = {
  id: string;
  customerName?: string;
  customerPhone?: string;
  vehicleName?: string;
  vehiclePlate?: string;
  startDate?: string;
  endDate?: string;
  pickupBranch?: string;
  dropoffBranch?: string;
  pickupTime?: string;
  dropoffTime?: string;
  status?: "pending" | "active" | "completed" | "cancelled";
  totalPrice?: number;
  createdAt?: string;
};

const normalizePhone = (value: string) => value.replace(/[^\d]/g, "");

const formatDate = (value?: string) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("tr-TR");
};

const formatStatus = (status?: string) => {
  switch (status) {
    case "pending":
      return "Beklemede";
    case "active":
      return "Aktif";
    case "completed":
      return "Tamamlandı";
    case "cancelled":
      return "İptal";
    default:
      return "Bilinmiyor";
  }
};

const statusVariant = (status?: string): "outline" | "secondary" | "destructive" | "default" => {
  switch (status) {
    case "pending":
      return "outline";
    case "active":
      return "default";
    case "completed":
      return "secondary";
    case "cancelled":
      return "destructive";
    default:
      return "outline";
  }
};

export const ReservationsLookup = () => {
  const { toast } = useToast();
  const [phoneInput, setPhoneInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<PublicBooking[]>([]);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = normalizePhone(phoneInput);
    if (!normalized || normalized.length < 7) {
      toast({
        title: "Telefon numarası eksik",
        description: "Lütfen en az 7 haneli bir telefon numarası girin.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setSearched(true);
    try {
      const snap = await getDocs(collection(db, "bookings"));
      const all: PublicBooking[] = snap.docs.map((d) => ({ id: d.id, ...d.data() } as PublicBooking));
      const filtered = all.filter((b) => {
        const n = normalizePhone(b.customerPhone || "");
        return n.endsWith(normalized) || n === normalized;
      });
      setResults(filtered);

      if (filtered.length === 0) {
        toast({
          title: "Kayıt bulunamadı",
          description: "Bu telefon numarası ile eşleşen bir rezervasyon bulunamadı.",
        });
      }
    } catch (error) {
      console.error("Reservations lookup error:", error);
      toast({
        title: "Hata",
        description: "Rezervasyonlar getirilirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-16 bg-muted/40">
      <div className="container mx-auto px-4 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Rezervasyonlarım</CardTitle>
            <CardDescription>
              Web üzerinden bıraktığınız rezervasyon taleplerini telefon numaranız ile görüntüleyin.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2" htmlFor="phone">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  Kayıtlı Telefon Numarası
                </label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Örn: 0533 946 50 02"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Güvenlik için sadece isim, tarih ve lokasyon bilgilerini gösteriyoruz.
                </p>
              </div>
              <Button type="submit" className="w-full md:w-auto" disabled={loading}>
                {loading ? (
                  "Yükleniyor..."
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Rezervasyonları Göster
                  </>
                )}
              </Button>
            </form>

            {searched && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {results.length === 0
                    ? "Kayıt bulunamadı."
                    : `${results.length} adet rezervasyon bulundu.`}
                </p>
                <div className="space-y-3">
                  {results.map((booking) => (
                    <Card key={booking.id} className="border border-slate-200">
                      <CardContent className="pt-4 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <div className="text-sm text-muted-foreground">Rezervasyon Kodu</div>
                            <div className="font-mono text-sm">{booking.id}</div>
                          </div>
                          <Badge variant={statusVariant(booking.status)}>
                            {formatStatus(booking.status)}
                          </Badge>
                        </div>
                        <div className="grid md:grid-cols-2 gap-3 text-sm mt-2">
                          <div className="space-y-1">
                            <div className="text-muted-foreground">Müşteri</div>
                            <div className="font-medium">{booking.customerName || "Web Müşterisi"}</div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-muted-foreground">Araç</div>
                            <div className="font-medium">
                              {booking.vehicleName || "Araç henüz atanmadı"}
                              {booking.vehiclePlate ? ` • ${booking.vehiclePlate}` : ""}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <CalendarDays className="w-3 h-3" /> Tarihler
                            </div>
                            <div>
                              {formatDate(booking.startDate)}{" "}
                              {booking.startDate && booking.endDate ? "→" : ""}
                              {" "}
                              {booking.endDate ? formatDate(booking.endDate) : ""}
                            </div>
                            {(booking.pickupTime || booking.dropoffTime) && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                {booking.pickupTime} → {booking.dropoffTime}
                              </div>
                            )}
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <MapPin className="w-3 h-3" /> Lokasyonlar
                            </div>
                            <div>
                              {(booking.pickupBranch || "Teslim noktası yok")}{" "}
                              {booking.dropoffBranch && `→ ${booking.dropoffBranch}`}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

