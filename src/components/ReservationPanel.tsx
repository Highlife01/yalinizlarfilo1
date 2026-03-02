import { useEffect, useMemo, useState, type ComponentType, type FormEvent } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Baby,
  CalendarDays,
  CarFront,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Fuel,
  Gauge,
  Loader2,
  MapPin,
  Navigation,
  Plus,
  ShieldAlert,
  ShieldCheck,
  ShieldPlus,
  UserPlus,
  Users,
  Zap,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";

const branches = ["Çukurova Bölgesel Havalimanı", "Adana Merkez Teslim"];
const dayMs = 1000 * 60 * 60 * 24;
const KDV_PERCENT = 20;
const KDV_RATE = KDV_PERCENT / 100;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
  }).format(value);

const toKurus = (value: number) => Math.round(value * 100);
const fromKurus = (value: number) => value / 100;

type RentalMode = "daily" | "monthly";

type OptionalExtra = {
  id: string;
  title: string;
  detail: string;
  chargeType: "Gunluk" | "Kiralama Basina";
  price: number;
  icon: ComponentType<{ className?: string }>;
};

type FirestoreVehicle = {
  id: string;
  name?: string;
  plate?: string;
  category?: string;
  fuel?: string;
  transmission?: string;
  passengers?: number;
  price?: number | string;
  daily_price?: number | string;
  monthly_price?: number | string;
  image_url?: string;
  photos?: string[];
  status?: string;
};

const optionalExtras: OptionalExtra[] = [
  { id: "extra-driver", title: "Ek Sürücü", detail: "Yetkili ikinci sürücü tanımlaması", chargeType: "Gunluk", price: 100, icon: UserPlus },
  { id: "baby-seat", title: "Bebek Koltuğu", detail: "Güvenli çocuk taşıma ekipmanı", chargeType: "Gunluk", price: 200, icon: Baby },
  { id: "drop-fee", title: "Drop (Bırakış Ücreti)", detail: "Farklı noktada bırakma kolaylığı", chargeType: "Kiralama Basina", price: 3000, icon: Navigation },
  { id: "young-driver", title: "Genç Sürücü Paketi", detail: "25 yaş altı sürücüler için ek güvence", chargeType: "Gunluk", price: 500, icon: Zap },
  { id: "km-package", title: "1000 KM Paketi", detail: "Standart limite ek kilometre hakkı", chargeType: "Kiralama Basina", price: 2550, icon: Gauge },
  { id: "km-package-premium", title: "Üst Sınıf 1000 Km Paketi", detail: "Üst ve premium segment araçlar için", chargeType: "Kiralama Basina", price: 3750, icon: Gauge },
  { id: "glass-headlight", title: "Far ve Cam Sigortası", detail: "Ön cam ve far hasarlarına ek koruma", chargeType: "Gunluk", price: 375, icon: ShieldCheck },
  { id: "mini-coverage", title: "Mini Güvence Paketi", detail: "Temel hasar risklerine karşı koruma", chargeType: "Gunluk", price: 429, icon: ShieldAlert },
  { id: "mid-coverage", title: "Orta Güvence Paketi", detail: "Genişletilmiş hasar ve hırsızlık güvencesi", chargeType: "Gunluk", price: 550, icon: ShieldPlus },
  { id: "full-coverage", title: "Full Güvence Paketi", detail: "Hasar risklerine karşı en geniş kapsam", chargeType: "Gunluk", price: 650, icon: ShieldCheck },
  { id: "hgs-service", title: "HGS Hizmet Bedeli", detail: "Geçiş operasyonu ve takip hizmeti", chargeType: "Kiralama Basina", price: 50, icon: Plus },
  { id: "hgs-highway", title: "HGS (Otoyol)", detail: "Otoyol geçişleri için önceden yüklenmiş bakiye", chargeType: "Kiralama Basina", price: 200, icon: Navigation },
  { id: "fuel-service", title: "Yakıt Alım Hizmet Bedeli", detail: "İade öncesi yakıt operasyon kolaylığı", chargeType: "Kiralama Basina", price: 175, icon: Fuel },
];

const hours = Array.from({ length: 48 }, (_, index) => {
  const hour = Math.floor(index / 2);
  const minute = index % 2 === 0 ? "00" : "30";
  return `${String(hour).padStart(2, "0")}:${minute}`;
});

const toIsoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getVehicleImage = (v: FirestoreVehicle): string => {
  if (v.photos && v.photos.length > 0) return v.photos[0];
  if (v.image_url) return v.image_url;
  return "/placeholder.svg";
};

const SPECIAL_VEHICLE_PRICING: Array<{
  match: (name: string) => boolean;
  daily: number;
  monthly: number;
}> = [
    { match: (name) => name.includes("opel") && name.includes("corsa"), daily: 1500, monthly: 40000 },
    { match: (name) => name.includes("citroen"), daily: 2000, monthly: 45000 },
  ];

const parseVehiclePrice = (raw?: number | string) => {
  if (raw === undefined || raw === null) return 0;
  const normalized = String(raw).replace(/[^\d]/g, "");
  return normalized ? Number(normalized) : 0;
};

const getVehiclePricing = (vehicle?: FirestoreVehicle | null) => {
  const normalizedName = (vehicle?.name || "").toLowerCase();
  const special = SPECIAL_VEHICLE_PRICING.find((rule) => rule.match(normalizedName));
  if (special) {
    return { daily: special.daily, monthly: special.monthly };
  }

  const dailyRaw = parseVehiclePrice(vehicle?.daily_price);
  const basePrice = parseVehiclePrice(vehicle?.price);
  const monthlyRaw = parseVehiclePrice(vehicle?.monthly_price);

  const daily = dailyRaw > 0 ? dailyRaw : basePrice;
  const monthly = monthlyRaw > 0 ? monthlyRaw : (daily > 0 ? daily * 25 : 0);
  return { daily, monthly };
};

export const ReservationPanel = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [pickupBranch, setPickupBranch] = useState(branches[0]);
  const [dropoffBranch, setDropoffBranch] = useState(branches[1]);
  const [pickupDate, setPickupDate] = useState(toIsoDate(today));
  const [dropoffDate, setDropoffDate] = useState(toIsoDate(tomorrow));
  const [pickupTime, setPickupTime] = useState("09:00");
  const [dropoffTime, setDropoffTime] = useState("10:00");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [rentalMode, setRentalMode] = useState<RentalMode>("daily");
  const [selectedExtraIds, setSelectedExtraIds] = useState<string[]>([]);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [vehicles, setVehicles] = useState<FirestoreVehicle[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<FirestoreVehicle | null>(null);

  useEffect(() => {
    const fetchVehicles = async () => {
      setVehiclesLoading(true);
      try {
        const q = query(collection(db, "vehicles"), where("status", "!=", "inactive"));
        const snap = await getDocs(q);
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestoreVehicle));
        setVehicles(list.filter((v) => v.status === "active" || v.status === "available"));
      } catch (err) {
        console.error("Vehicle fetch error:", err);
      } finally {
        setVehiclesLoading(false);
      }
    };
    fetchVehicles();
  }, []);

  const selectedExtras = useMemo(
    () => optionalExtras.filter((extra) => selectedExtraIds.includes(extra.id)),
    [selectedExtraIds]
  );

  const rentalDays = useMemo(() => {
    const pickup = new Date(`${pickupDate}T${pickupTime}`);
    const dropoff = new Date(`${dropoffDate}T${dropoffTime}`);
    const diff = dropoff.getTime() - pickup.getTime();
    if (!Number.isFinite(diff) || diff <= 0) return 1;
    return Math.max(1, Math.ceil(diff / dayMs));
  }, [pickupDate, pickupTime, dropoffDate, dropoffTime]);

  const rentalMonths = Math.max(1, Math.ceil(rentalDays / 30));

  const selectedVehiclePricing = useMemo(() => getVehiclePricing(selectedVehicle), [selectedVehicle]);
  const vehicleDailyPrice = selectedVehiclePricing.daily || 1100;
  const vehicleMonthlyPrice = selectedVehiclePricing.monthly || vehicleDailyPrice * 25;

  const pricing = useMemo(() => {
    const rentalAmountRaw =
      rentalMode === "daily" ? rentalDays * vehicleDailyPrice : rentalMonths * vehicleMonthlyPrice;
    const extrasAmountRaw = selectedExtras.reduce((total, extra) => {
      return total + (extra.chargeType === "Gunluk" ? extra.price * rentalDays : extra.price);
    }, 0);

    const rentalAmountKurus = toKurus(rentalAmountRaw);
    const extrasAmountKurus = toKurus(extrasAmountRaw);
    const subtotalAmountKurus = rentalAmountKurus + extrasAmountKurus;
    const kdvAmountKurus = Math.round(subtotalAmountKurus * KDV_RATE);
    const totalAmountKurus = subtotalAmountKurus + kdvAmountKurus;

    return {
      rentalAmount: fromKurus(rentalAmountKurus),
      extrasAmount: fromKurus(extrasAmountKurus),
      subtotalAmount: fromKurus(subtotalAmountKurus),
      kdvAmount: fromKurus(kdvAmountKurus),
      totalAmount: fromKurus(totalAmountKurus),
    };
  }, [vehicleDailyPrice, vehicleMonthlyPrice, rentalDays, rentalMode, rentalMonths, selectedExtras]);

  const { rentalAmount, extrasAmount, subtotalAmount, kdvAmount, totalAmount } = pricing;
  const toggleExtra = (extraId: string) => {
    setSelectedExtraIds((prev) =>
      prev.includes(extraId) ? prev.filter((id) => id !== extraId) : [...prev, extraId]
    );
  };

  const goToStep2 = () => {
    if (!customerName.trim() || !customerPhone.trim()) {
      toast({ title: "Eksik bilgi", description: "Ad soyad ve telefon alanlarını doldurun.", variant: "destructive" });
      return;
    }
    const pickupDT = new Date(`${pickupDate}T${pickupTime}`);
    const dropoffDT = new Date(`${dropoffDate}T${dropoffTime}`);
    if (dropoffDT <= pickupDT) {
      toast({ title: "Tarih hatası", description: "Dönüş tarihi alış tarihinden sonra olmalıdır.", variant: "destructive" });
      return;
    }
    setStep(2);
  };

  const goToStep3 = () => {
    if (!selectedVehicle) {
      toast({ title: "Araç seçin", description: "Devam etmek için bir araç seçmelisiniz.", variant: "destructive" });
      return;
    }
    setStep(3);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!acceptedTerms) {
      toast({ title: "Uyarı", description: "KVKK ve sözleşme onayı gereklidir.", variant: "destructive" });
      return;
    }

    try {
      const { collection: col, addDoc } = await import("firebase/firestore");
      const { db: fireDb } = await import("@/integrations/firebase/client");

      await addDoc(col(fireDb, "bookings"), {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        vehicleName: selectedVehicle?.name || "-",
        vehiclePlate: selectedVehicle?.plate || "ATANMADI",
        vehicleId: selectedVehicle?.id || "",
        startDate: pickupDate,
        endDate: dropoffDate,
        pickupBranch,
        dropoffBranch,
        pickupTime,
        dropoffTime,
        rentalMode,
        kmLimit: rentalMode === "daily" ? "300 km/gun" : "3000 km/ay",
        optionalExtras: selectedExtras.map((e) => ({ id: e.id, title: e.title, chargeType: e.chargeType, price: e.price })),
        pricing: { rentalDays, rentalMonths, rentalAmount, extrasAmount, subtotalAmount, kdvRate: KDV_PERCENT, kdvAmount, totalAmount },
        status: "pending",
        totalPrice: totalAmount,
        createdAt: new Date().toISOString(),
      });

      toast({ title: "Rezervasyon talebi alındı", description: `Toplam (KDV dahil): ${formatCurrency(totalAmount)}` });

      const bookingInfo = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        vehicleName: selectedVehicle?.name || "-",
        startDate: pickupDate,
        endDate: dropoffDate,
        totalAmount: totalAmount
      };

      setStep(1);
      setCustomerName("");
      setCustomerPhone("");
      setRentalMode("daily");
      setSelectedExtraIds([]);
      setAcceptedTerms(false);
      setSelectedVehicle(null);

      // Redirect to success page with state
      navigate("/rezervasyon-basarili", { state: { bookingData: bookingInfo } });
    } catch (error) {
      console.error("Booking submission error:", error);
      toast({ title: "Hata", description: "Rezervasyon talebi alınırken bir hata oluştu.", variant: "destructive" });
    }
  };

  const stepLabels = [
    { num: 1, label: "Bilgiler" },
    { num: 2, label: "Araç Seçimi" },
    { num: 3, label: "Plan & Ekstralar" },
  ];
  const labelClass = "text-sm font-semibold text-slate-900";
  const fieldClass =
    "h-11 rounded-lg border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus-visible:border-red-500 focus-visible:ring-red-500";
  const selectClass =
    "w-full h-11 rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/20";

  return (
    <section id="reservation" className="-mt-16 relative z-20 pb-8">
      <div className="container mx-auto px-3 md:px-4">
        <Card className="overflow-hidden border-red-200 bg-gradient-to-b from-red-50 via-white to-white p-4 md:p-6 shadow-[0_18px_50px_-22px_rgba(190,24,24,0.5)]">
          <div className="mb-5">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900">Hızlı Rezervasyon</h2>
            <p className="mt-1 text-slate-700">Bilgilerinizi girin, araç seçin, plan ve opsiyonları belirleyin.</p>
          </div>

          {/* STEP INDICATOR */}
          <div className="mb-5 grid grid-cols-3 gap-2 rounded-xl border border-red-100 bg-white/70 p-1.5">
            {stepLabels.map((s) => (
              <div
                key={s.num}
                className={`rounded-md border px-2 py-2 text-xs font-semibold text-center transition-colors md:px-3 md:text-sm ${step === s.num
                    ? "border-red-500 bg-red-50 text-red-700"
                    : step > s.num
                      ? "border-red-300 bg-red-100/60 text-red-700"
                      : "border-slate-200 bg-white text-slate-600"
                  }`}
              >
                {step > s.num && <CheckCircle2 className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />}
                {s.num}. {s.label}
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* STEP 1 - BİLGİLER */}
            {step === 1 && (
              <>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2">
                    <Label htmlFor="pickup-branch" className={labelClass}>Alış Şubesi</Label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-red-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <select id="pickup-branch" value={pickupBranch} onChange={(e) => setPickupBranch(e.target.value)} className={selectClass}>
                        {branches.map((b) => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pickup-date" className={labelClass}>Alış Tarihi</Label>
                    <div className="relative">
                      <CalendarDays className="w-4 h-4 text-red-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <Input id="pickup-date" type="date" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} min={toIsoDate(today)} className={`pl-9 ${fieldClass}`} required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pickup-time" className={labelClass}>Alış Saati</Label>
                    <div className="relative">
                      <Clock3 className="w-4 h-4 text-red-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <select id="pickup-time" value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} className={selectClass}>
                        {hours.map((h) => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dropoff-date" className={labelClass}>Dönüş Tarihi</Label>
                    <div className="relative">
                      <CalendarDays className="w-4 h-4 text-red-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <Input id="dropoff-date" type="date" value={dropoffDate} onChange={(e) => setDropoffDate(e.target.value)} min={pickupDate} className={`pl-9 ${fieldClass}`} required />
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 items-end">
                  <div className="space-y-2">
                    <Label htmlFor="dropoff-branch" className={labelClass}>Dönüş Şubesi</Label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-red-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <select id="dropoff-branch" value={dropoffBranch} onChange={(e) => setDropoffBranch(e.target.value)} className={selectClass}>
                        {branches.map((b) => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dropoff-time" className={labelClass}>Dönüş Saati</Label>
                    <div className="relative">
                      <Clock3 className="w-4 h-4 text-red-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <select id="dropoff-time" value={dropoffTime} onChange={(e) => setDropoffTime(e.target.value)} className={selectClass}>
                        {hours.map((h) => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2 items-end">
                  <div className="space-y-2">
                    <Label htmlFor="customer-name" className={labelClass}>Ad Soyad</Label>
                    <Input id="customer-name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Adınız Soyadınız" required className={fieldClass} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customer-phone" className={labelClass}>Telefon</Label>
                    <Input id="customer-phone" type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="05XX XXX XX XX" required className={fieldClass} />
                  </div>
                </div>

                <Button type="button" className="h-11 w-full bg-red-600 hover:bg-red-700 text-white" onClick={goToStep2}>
                  Araç Seçimine Geç <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </>
            )}

            {/* STEP 2 - ARAÇ SEÇİMİ */}
            {step === 2 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <CarFront className="w-5 h-5" /> Araç Seçin
                </h3>
                <p className="text-sm text-slate-700">
                  {rentalDays} günlük kiralama için uygun araçlardan birini seçin.
                </p>

                {vehiclesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : vehicles.length === 0 ? (
                  <div className="text-center py-12 text-slate-600">
                    Şu an müsait araç bulunamadı.
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {vehicles.map((v) => {
                      const isSelected = selectedVehicle?.id === v.id;
                      const imgSrc = getVehicleImage(v);
                      const dailyPrice = getVehiclePricing(v).daily;

                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setSelectedVehicle(v)}
                          className={`group relative rounded-xl border-2 overflow-hidden text-left transition-all bg-white ${isSelected
                              ? "border-red-500 ring-2 ring-red-500/20 shadow-md"
                              : "border-slate-200 hover:border-red-400 hover:shadow-sm"
                            }`}
                        >
                          <div className="aspect-[16/10] bg-slate-100 overflow-hidden">
                            <img
                              src={imgSrc}
                              alt={v.name || v.plate || "Araç"}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                          </div>
                          <div className="p-3">
                            <p className="font-semibold text-slate-900 text-sm truncate">{v.name || v.plate}</p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-slate-600">
                              {v.fuel && <span className="flex items-center gap-1"><Fuel className="w-3 h-3" />{v.fuel}</span>}
                              {v.transmission && <span>{v.transmission}</span>}
                              {v.passengers && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{v.passengers}</span>}
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                              <span className="text-red-600 font-bold text-sm">{formatCurrency(dailyPrice)}<span className="text-xs font-normal text-slate-600"> /gün</span></span>
                              {v.category && (
                                <span className="text-[10px] font-medium bg-red-50 text-red-700 px-2 py-0.5 rounded-full border border-red-100">{v.category}</span>
                              )}
                            </div>
                          </div>
                          {isSelected && (
                            <div className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1">
                              <CheckCircle2 className="w-4 h-4" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" className="flex-1 border-slate-300 text-slate-800 hover:bg-slate-100" onClick={() => setStep(1)}>
                    ← Geri
                  </Button>
                  <Button type="button" className="flex-[2] bg-red-600 hover:bg-red-700 text-white" onClick={goToStep3}>
                    Plan ve Ekstralar <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 3 - PLAN & EKSTRALAR */}
            {step === 3 && (
              <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="space-y-5">
                  {/* SEÇİLEN ARAÇ ÖZETİ */}
                  {selectedVehicle && (
                    <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50/60 p-3">
                      <img src={getVehicleImage(selectedVehicle)} alt="" className="w-16 h-12 rounded-lg object-cover" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 text-sm truncate">{selectedVehicle.name || selectedVehicle.plate}</p>
                        <p className="text-xs text-slate-700">{selectedVehicle.category} • {selectedVehicle.fuel} • {selectedVehicle.transmission}</p>
                      </div>
                      <Button type="button" variant="ghost" size="sm" className="text-xs shrink-0 text-red-700 hover:bg-red-100 hover:text-red-800" onClick={() => setStep(2)}>Değiştir</Button>
                    </div>
                  )}

                  {/* KİRALAMA TİPİ */}
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-slate-900">Kiralama Tipi</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <button type="button" onClick={() => setRentalMode("daily")} className={`text-left rounded-xl border-2 p-4 transition-all ${rentalMode === "daily" ? "border-red-500 bg-red-50 shadow-sm" : "border-slate-200 bg-white hover:border-red-400"}`}>
                        <p className="font-semibold text-slate-900 text-sm">Günlük Kiralama</p>
                        <p className="text-xs text-slate-700 mt-0.5">Kısa süreli esnek plan</p>
                        <p className="text-xs mt-1.5 font-semibold text-red-700">300 km/gün limiti</p>
                      </button>
                      <button type="button" onClick={() => setRentalMode("monthly")} className={`text-left rounded-xl border-2 p-4 transition-all ${rentalMode === "monthly" ? "border-red-500 bg-red-50 shadow-sm" : "border-slate-200 bg-white hover:border-red-400"}`}>
                        <p className="font-semibold text-slate-900 text-sm">Aylık Kiralama</p>
                        <p className="text-xs text-slate-700 mt-0.5">Uzun süreli avantajlı plan</p>
                        <p className="text-xs mt-1.5 font-semibold text-red-700">3000 km/ay limiti</p>
                      </button>
                    </div>
                  </div>

                  {/* EKSTRALAR */}
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-slate-900">Ekstralar (Opsiyonel)</h3>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {optionalExtras.map((extra) => {
                        const isSelected = selectedExtraIds.includes(extra.id);
                        const Icon = extra.icon;
                        const chargeLabel = extra.chargeType === "Gunluk" ? "günlük" : "kiralama başına";

                        return (
                          <button
                            key={extra.id}
                            type="button"
                            onClick={() => toggleExtra(extra.id)}
                            className={`relative w-full rounded-xl border-2 px-3 py-3 text-left transition-all ${isSelected ? "border-red-500 bg-red-50 shadow-sm" : "border-slate-200 bg-white hover:border-red-300 hover:bg-red-50/50"
                              }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${isSelected ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-700"}`}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-slate-900 text-sm leading-tight truncate">{extra.title}</p>
                                <p className="text-red-700 text-sm font-semibold mt-0.5">{chargeLabel} {formatCurrency(extra.price)}</p>
                              </div>
                              <div className="shrink-0">
                                {isSelected ? <CheckCircle2 className="w-5 h-5 text-red-600" /> : <div className="w-5 h-5 rounded-full border-2 border-slate-300" />}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* KVKK */}
                  <div className="flex items-start space-x-3 pt-1">
                    <Checkbox
                      id="terms-checkbox"
                      checked={acceptedTerms}
                      onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                      className="mt-1 border-slate-300 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                    />
                    <label htmlFor="terms-checkbox" className="text-sm leading-relaxed text-slate-800">
                      KVKK gereği kişisel verilerimin işlenmesini kabul ediyorum.{" "}
                      <Link to="/kiralama-kosullari" className="text-red-700 hover:underline">Kiralama Koşulları</Link>,{" "}
                      <Link to="/kiralama-sozlesmesi" className="text-red-700 hover:underline">Kiralama Sözleşmesi</Link>{" "}
                      ve <Link to="/kvkk" className="text-red-700 hover:underline">KVKK Aydınlatma Metni</Link>
                    </label>
                  </div>
                </div>

                {/* FİYAT PANELİ */}
                <div className="space-y-3 lg:sticky lg:top-24">
                  <div className="rounded-xl border border-red-200 bg-white p-5 space-y-3 shadow-sm">
                    <p className="text-base font-bold text-slate-900">Fiyat Bilgileri</p>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-700">Kiralama Tutarı</span>
                      <span className="font-semibold text-slate-900 whitespace-nowrap">
                        {rentalMode === "daily"
                          ? `${rentalDays} gün x ${formatCurrency(vehicleDailyPrice)}`
                          : `${rentalMonths} ay x ${formatCurrency(vehicleMonthlyPrice)}`}
                      </span>
                    </div>

                    {extrasAmount > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-700">
                          Ek Ürün Ve Sigortalar
                          <CheckCircle2 className="w-3.5 h-3.5 text-red-600 inline ml-1 -mt-0.5" />
                        </span>
                        <span className="font-semibold text-slate-900">{formatCurrency(extrasAmount)}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-700">Ara Toplam</span>
                      <span className="font-semibold text-slate-900">{formatCurrency(subtotalAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-700">{`KDV (%${KDV_PERCENT})`}</span>
                      <span className="font-semibold text-slate-900">{formatCurrency(kdvAmount)}</span>
                    </div>

                    <div className="h-px bg-red-100" />

                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold text-slate-900">Toplam Tutar</span>
                      <span className="text-xl font-bold text-red-600">{formatCurrency(totalAmount)}</span>
                    </div>
                    <p className="text-[11px] text-slate-600">{`KDV (%${KDV_PERCENT}) dahildir.`}</p>
                  </div>

                  <Button type="submit" size="lg" className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold">
                    Rezervasyon Oluştur <ChevronRight className="w-5 h-5 ml-1" />
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="w-full text-slate-700 hover:bg-red-50 hover:text-slate-900" onClick={() => setStep(2)}>
                    ← Araç Seçimine Dön
                  </Button>
                </div>
              </div>
            )}
          </form>
        </Card>
      </div>
    </section>
  );
};

