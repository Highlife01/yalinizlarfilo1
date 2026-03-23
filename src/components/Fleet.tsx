import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Fuel, Settings, Check, Briefcase, Gauge, Filter, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Import vehicle images
import fiatEgeaImg from "@/assets/cars/fiat-egea.png";
import renaultClioImg from "@/assets/cars/renault-clio.png";
import renaultMeganeImg from "@/assets/cars/renault-megane.png";
import fordFocusImg from "@/assets/cars/ford-focus.png";
import toyotaCorollaImg from "@/assets/cars/toyota-corolla.png";
import volkswagenPassatImg from "@/assets/cars/volkswagen-passat.png";
import hyundaiI20Img from "@/assets/cars/hyundai-i20.png";
import peugeot3008Img from "@/assets/cars/peugeot-3008.png";
import hondaCivicImg from "@/assets/cars/honda-civic.png";
import skodaOctaviaImg from "@/assets/cars/skoda-octavia.png";
import daciaDusterImg from "@/assets/cars/dacia-duster.png";
import opelCorsaImg from "@/assets/cars/opel-corsa.png";
import volkswagenPoloImg from "@/assets/cars/volkswagen-polo.png";
import mercedesEClassImg from "@/assets/cars/mercedes-e-class.png";

import { vehicles as staticVehicles, Vehicle } from "@/data/vehicles";

const SPECIAL_VEHICLE_PRICING: Array<{
  match: (name: string) => boolean;
  daily: number;
  monthly: number;
}> = [
    { match: (name) => name.includes("opel") && name.includes("corsa"), daily: 1500, monthly: 40000 },
    { match: (name) => name.includes("citroen"), daily: 2000, monthly: 45000 },
  ];

export const Fleet = () => {
  const { t } = useTranslation();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  // Filter states
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [fuelFilter, setFuelFilter] = useState("all");
  const [transmissionFilter, setTransmissionFilter] = useState("all");

  useEffect(() => {
    const fetchRealVehicles = async () => {
      try {
        const q = query(
          collection(db, "vehicles"),
          where("status", "!=", "inactive")
        );
        const snapshot = await getDocs(q);

        let loadedVehicles = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Vehicle[];

        // If there is no item from db, fallback to static but assume all active
        if (loadedVehicles.length === 0) {
          loadedVehicles = staticVehicles;
        }
        setVehicles(loadedVehicles);
      } catch (err) {
        console.error("Firestore error while loading vehicles: ", err);
        setVehicles(staticVehicles); // fallback
      } finally {
        setLoading(false);
      }
    };

    fetchRealVehicles();
  }, []);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      if (categoryFilter !== "all" && v.category !== categoryFilter) return false;
      if (fuelFilter !== "all" && !(v.fuel || "").toLowerCase().includes(fuelFilter.toLowerCase())) return false;
      if (transmissionFilter !== "all" && !(v.transmission || "").toLowerCase().includes(transmissionFilter.toLowerCase())) return false;
      return true;
    });
  }, [vehicles, categoryFilter, fuelFilter, transmissionFilter]);

  const categories = useMemo(() => {
    const set = new Set(vehicles.map((v) => v.category).filter((c) => c && c !== "empty"));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "tr"));
  }, [vehicles]);

  const fuelTypes = useMemo(() => {
    const set = new Set<string>();
    vehicles.forEach((v) => {
      if (!v.fuel || v.fuel === "empty") return;
      const parts = v.fuel.split("/").map((f) => f.trim());
      parts.forEach((p) => { if (p && p !== "empty") set.add(p); });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "tr"));
  }, [vehicles]);

  const hasActiveFilter = categoryFilter !== "all" || fuelFilter !== "all" || transmissionFilter !== "all";

  const clearFilters = () => {
    setCategoryFilter("all");
    setFuelFilter("all");
    setTransmissionFilter("all");
  };

  const getVehicleImage = (vehicleName: string) => {
    if (!vehicleName) return null;

    const name = vehicleName.toLowerCase();

    if (name.includes('egea')) return fiatEgeaImg;
    if (name.includes('clio')) return renaultClioImg;
    if (name.includes('megane')) return renaultMeganeImg;
    if (name.includes('focus')) return fordFocusImg;
    if (name.includes('corolla')) return toyotaCorollaImg;
    if (name.includes('passat')) return volkswagenPassatImg;
    if (name.includes('i20')) return hyundaiI20Img;
    if (name.includes('3008')) return peugeot3008Img;
    if (name.includes('civic')) return hondaCivicImg;
    if (name.includes('octavia')) return skodaOctaviaImg;
    if (name.includes('duster')) return daciaDusterImg;
    if (name.includes('corsa')) return opelCorsaImg;
    if (name.includes('polo')) return volkswagenPoloImg;
    if (name.includes('mercedes') || name.includes('e-serisi')) return mercedesEClassImg;

    return null;
  };

  const parsePrice = (raw?: string | number) => {
    if (raw === undefined || raw === null) return 0;
    const normalized = String(raw).replace(/[^\d]/g, "");
    return normalized ? Number(normalized) : 0;
  };

  const getSpecialVehiclePricing = (vehicleName?: string) => {
    const normalizedName = (vehicleName || "").toLowerCase();
    if (!normalizedName) return null;
    const matched = SPECIAL_VEHICLE_PRICING.find((rule) => rule.match(normalizedName));
    return matched ? { daily: matched.daily, monthly: matched.monthly } : null;
  };

  const formatPrice = (amount: number) => amount.toLocaleString("tr-TR");

  const getDailyPrice = (vehicle: Vehicle) => {
    const special = getSpecialVehiclePricing(vehicle.name);
    if (special) return special.daily;

    const explicitDaily = parsePrice(vehicle.daily_price);
    if (explicitDaily > 0) return explicitDaily;

    const monthly = getMonthlyPrice(vehicle);
    return monthly > 0 ? Math.round(monthly / 30) : 0;
  };

  const getMonthlyPrice = (vehicle: Vehicle) => {
    const special = getSpecialVehiclePricing(vehicle.name);
    if (special) return special.monthly;
    return parsePrice(vehicle.price);
  };

  const handleOpenDetails = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
  };

  const closeVehicleDialog = () => {
    setSelectedVehicle(null);
  };

  const scrollToReservation = () => {
    const section = document.getElementById('reservation');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
    closeVehicleDialog();
  };

  if (loading) {
    return (
      <section id="fleet" className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <p className="text-muted-foreground">Araçlar yükleniyor...</p>
          </div>
        </div>
      </section>
    );
  }

  const renderVehicleGrid = (vehicleList: Vehicle[]) => (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
      {vehicleList.length > 0 ? (
        vehicleList.map((vehicle) => (
          <Card
            key={vehicle.id}
            className="group overflow-hidden hover:shadow-[0_12px_40px_-8px_hsl(var(--primary)/0.2)] transition-all duration-300 border-border cursor-pointer"
            onClick={() => handleOpenDetails(vehicle)}
          >
            {/* Image */}
            <div className="relative h-56 overflow-hidden bg-muted">
              <img
                src={getVehicleImage(vehicle.name) || vehicle.image_url || "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=800&q=80"}
                alt={vehicle.name}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              {vehicle.category && (
                <Badge className="absolute top-4 right-4 bg-primary text-white">
                  {vehicle.category}
                </Badge>
              )}
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div>
                <h3 className="text-xl font-bold text-foreground mb-2">
                  {vehicle.name}
                </h3>

                {/* Specs */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {vehicle.passengers && (
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{vehicle.passengers}</span>
                    </div>
                  )}
                  {vehicle.fuel && vehicle.fuel !== "empty" && (
                    <div className="flex items-center gap-1">
                      <Fuel className="w-4 h-4" />
                      <span>{vehicle.fuel}</span>
                    </div>
                  )}
                  {vehicle.transmission && vehicle.transmission !== "empty" && (
                    <div className="flex items-center gap-1">
                      <Settings className="w-4 h-4" />
                      <span>{vehicle.transmission}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Price & CTA */}
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div className="space-y-1">
                  <div className="text-lg font-bold text-primary">
                    {formatPrice(getDailyPrice(vehicle))} TL <span className="text-xs font-normal text-muted-foreground">/ {t("fleet.daily")}</span>
                  </div>
                  <div className="text-sm font-semibold text-foreground">
                    {formatPrice(getMonthlyPrice(vehicle))} TL <span className="text-xs font-normal text-muted-foreground">/ {t("fleet.monthly")}</span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="border-primary text-primary hover:bg-primary hover:text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenDetails(vehicle);
                  }}
                >
                  Detaylar
                </Button>
              </div>
            </div>
          </Card>
        ))
      ) : (
        <div className="col-span-full text-center py-12">
          <p className="text-muted-foreground">Bu kategoride araç bulunamadı.</p>
        </div>
      )}
    </div>
  );

  return (
    <section id="fleet" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground">
            {t("fleet.title")}
          </h2>
          <p className="text-lg text-muted-foreground">
            {t("fleet.description")}
          </p>
        </div>

        {/* Filters */}
        <div className="mb-10">
          <div className="flex flex-wrap items-center gap-3 justify-center">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Filter className="w-4 h-4" />
              Filtrele:
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Araç Sınıfı" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Sınıflar</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={fuelFilter} onValueChange={setFuelFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Yakıt Türü" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Yakıtlar</SelectItem>
                {fuelTypes.map((f) => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={transmissionFilter} onValueChange={setTransmissionFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Vites Tipi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Vitesler</SelectItem>
                <SelectItem value="Otomatik">Otomatik</SelectItem>
                <SelectItem value="Manuel">Manuel</SelectItem>
              </SelectContent>
            </Select>
            {hasActiveFilter && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4 mr-1" />
                Temizle
              </Button>
            )}
          </div>
          {hasActiveFilter && (
            <p className="text-center text-sm text-muted-foreground mt-3">
              {filteredVehicles.length} araç bulundu
            </p>
          )}
        </div>

        {/* Vehicle Grid */}
        {renderVehicleGrid(filteredVehicles)}

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <Button
            size="lg"
            className="bg-primary hover:bg-primary/90 text-white"
            onClick={scrollToReservation}
          >
            Hızlı Rezervasyon Yapın
          </Button>
        </div>

        {/* Vehicle Details Dialog */}
        <Dialog open={!!selectedVehicle} onOpenChange={(open) => !open && closeVehicleDialog()}>
          <DialogContent className="max-w-2xl overflow-hidden p-0 gap-0">
            {selectedVehicle && (
              <>
                <div className="relative h-64 bg-muted">
                  <img
                    src={getVehicleImage(selectedVehicle.name) || selectedVehicle.image_url || "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=800&q=80"}
                    alt={selectedVehicle.name}
                    className="w-full h-full object-cover"
                  />
                  {selectedVehicle.category && (
                    <Badge className="absolute top-4 right-4 bg-primary text-white text-lg px-3 py-1">
                      {selectedVehicle.category}
                    </Badge>
                  )}
                </div>

                <div className="p-6 space-y-6">
                  <DialogHeader>
                    <div className="flex items-center justify-between">
                      <DialogTitle className="text-3xl font-bold">{selectedVehicle.name}</DialogTitle>
                      <div className="text-right space-y-1">
                        <div className="text-2xl font-bold text-primary">
                          {formatPrice(getDailyPrice(selectedVehicle))} TL <span className="text-xs font-normal text-muted-foreground">/ {t("fleet.daily")}</span>
                        </div>
                        <div className="text-base font-semibold text-foreground">
                          {formatPrice(getMonthlyPrice(selectedVehicle))} TL <span className="text-xs font-normal text-muted-foreground">/ {t("fleet.monthly")}</span>
                        </div>
                      </div>
                    </div>
                    <DialogDescription className="text-lg pt-2">
                      Konfor ve performansı bir arada sunan {selectedVehicle.name} ile sürüş keyfini yaşayın.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-y border-border">
                    {selectedVehicle.passengers && (
                      <div className="flex flex-col items-center gap-2 p-3 bg-muted/30 rounded-lg text-center">
                        <Users className="w-6 h-6 text-primary" />
                        <span className="text-sm font-medium">{selectedVehicle.passengers} Yolcu</span>
                      </div>
                    )}
                    {selectedVehicle.fuel && selectedVehicle.fuel !== "empty" && (
                      <div className="flex flex-col items-center gap-2 p-3 bg-muted/30 rounded-lg text-center">
                        <Fuel className="w-6 h-6 text-primary" />
                        <span className="text-sm font-medium">{selectedVehicle.fuel}</span>
                      </div>
                    )}
                    {selectedVehicle.transmission && selectedVehicle.transmission !== "empty" && (
                      <div className="flex flex-col items-center gap-2 p-3 bg-muted/30 rounded-lg text-center">
                        <Settings className="w-6 h-6 text-primary" />
                        <span className="text-sm font-medium">{selectedVehicle.transmission}</span>
                      </div>
                    )}
                    <div className="flex flex-col items-center gap-2 p-3 bg-muted/30 rounded-lg text-center">
                      <Check className="w-6 h-6 text-primary" />
                      <span className="text-sm font-medium">Kasko Dahil</span>
                    </div>
                    {selectedVehicle.luggage_capacity && (
                      <div className="flex flex-col items-center gap-2 p-3 bg-muted/30 rounded-lg text-center">
                        <Briefcase className="w-6 h-6 text-primary" />
                        <span className="text-sm font-medium">{selectedVehicle.luggage_capacity}</span>
                      </div>
                    )}
                    {selectedVehicle.fuel_consumption && (
                      <div className="flex flex-col items-center gap-2 p-3 bg-muted/30 rounded-lg text-center">
                        <Gauge className="w-6 h-6 text-primary" />
                        <span className="text-sm font-medium">{selectedVehicle.fuel_consumption}</span>
                      </div>
                    )}
                  </div>

                  <DialogFooter className="flex-col sm:flex-row gap-3 sm:gap-0">
                    <Button variant="outline" size="lg" className="w-full sm:w-auto" onClick={closeVehicleDialog}>
                      Kapat
                    </Button>
                    <Button size="lg" className="w-full sm:w-auto bg-primary text-white" onClick={scrollToReservation}>
                      Bu Araç İçin Rezervasyon Yap
                    </Button>
                  </DialogFooter>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
};



