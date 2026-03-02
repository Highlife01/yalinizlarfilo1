import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import { Loader2, FileText, Building2, User, Search, UserCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { downloadRentalContractPDF } from "@/utils/rentalContractPdf";

type CustomerOption = {
  id: string;
  name: string;
  phone: string;
  email: string;
  tckn: string;
  address: string;
  driverLicenseClass: string;
  idSerialNo: string;
  idIssueDate: string;
  invoiceType: string;
  companyName: string;
  taxNumber: string;
};

type VehicleOption = {
  plate: string;
  name: string;
  km: string;
  chassisNo: string;
  insurance_company: string;
  insurance_end_date: string;
  casco_company: string;
  casco_end_date: string;
};

type ContractFormState = {
  customerType: "bireysel" | "kurumsal";
  customerName: string;
  tcNo: string;
  vergiNo: string;
  licenseNo: string;
  licenseDate: string;
  address: string;
  phone: string;
  email: string;
  plate: string;
  model: string;
  chassisNo: string;
  km: string;
  insuranceCompany: string;
  insuranceEndDate: string;
  cascoCompany: string;
  cascoEndDate: string;
  rentalType: "gunluk" | "aylik";
  startDate: string;
  endDate: string;
  dailyPrice: string;
  totalPrice: string;
  deposit: string;
};

const toLocalDateTimeLabel = (value: string): string => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toLocaleDateString("tr-TR")} ${date.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};

const toDateLabel = (value: string): string => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("tr-TR");
};

const parseCurrency = (value: string): number => {
  const normalized = value.replace(/[^\d,.-]/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const Field = ({
  label,
  children,
  span2,
}: {
  label: string;
  children: React.ReactNode;
  span2?: boolean;
}) => (
  <div className={`space-y-1.5${span2 ? " md:col-span-2" : ""}`}>
    <Label className="text-xs font-medium text-slate-600">{label}</Label>
    {children}
  </div>
);

export const ContractBuilder = () => {
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [selectedVehiclePlate, setSelectedVehiclePlate] = useState<string>("");

  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [customerPopoverOpen, setCustomerPopoverOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");

  const [form, setForm] = useState<ContractFormState>({
    customerType: "bireysel",
    customerName: "",
    tcNo: "",
    vergiNo: "",
    licenseNo: "",
    licenseDate: "",
    address: "",
    phone: "",
    email: "",
    plate: "",
    model: "",
    chassisNo: "",
    km: "",
    insuranceCompany: "",
    insuranceEndDate: "",
    cascoCompany: "",
    cascoEndDate: "",
    rentalType: "gunluk",
    startDate: "",
    endDate: "",
    dailyPrice: "",
    totalPrice: "",
    deposit: "",
  });

  const isKurumsal = form.customerType === "kurumsal";

  useEffect(() => {
    let cancelled = false;
    getDocs(collection(db, "vehicles"))
      .then((snap) => {
        if (cancelled) return;
        const list: VehicleOption[] = [];
        snap.docs.forEach((docSnap) => {
          const d = docSnap.data();
          const plate = String(d.plate ?? docSnap.id ?? "").trim().toUpperCase();
          if (!plate) return;
          list.push({
            plate,
            name: String(d.name ?? "").trim(),
            km: String(d.km ?? ""),
            chassisNo: String(d.sasi_no ?? d.chassisNo ?? d.sasiNo ?? "").trim(),
            insurance_company: String(d.insurance_company ?? "").trim(),
            insurance_end_date: String(d.insurance_end_date ?? "").trim(),
            casco_company: String(d.casco_company ?? "").trim(),
            casco_end_date: String(d.casco_end_date ?? "").trim(),
          });
        });
        list.sort((a, b) => a.plate.localeCompare(b.plate));
        setVehicles(list);
      })
      .finally(() => {
        if (!cancelled) setVehiclesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch customers from Firestore
  useEffect(() => {
    let cancelled = false;
    getDocs(collection(db, "customers"))
      .then((snap) => {
        if (cancelled) return;
        const list: CustomerOption[] = [];
        snap.docs.forEach((docSnap) => {
          const d = docSnap.data();
          const name = String(d.name ?? "").trim();
          if (!name) return;
          list.push({
            id: docSnap.id,
            name,
            phone: String(d.phone ?? "").trim(),
            email: String(d.email ?? "").trim(),
            tckn: String(d.tckn ?? "").trim(),
            address: String(d.address ?? d.adres ?? "").trim(),
            driverLicenseClass: String(d.driverLicenseClass ?? "").trim(),
            idSerialNo: String(d.idSerialNo ?? "").trim(),
            idIssueDate: String(d.idIssueDate ?? "").trim(),
            invoiceType: String(d.invoiceType ?? "individual").trim(),
            companyName: String(d.companyName ?? "").trim(),
            taxNumber: String(d.taxNumber ?? "").trim(),
          });
        });
        list.sort((a, b) => a.name.localeCompare(b.name, "tr"));
        setCustomers(list);
      })
      .finally(() => {
        if (!cancelled) setCustomersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const onSelectCustomer = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setCustomerPopoverOpen(false);
    if (!customerId) return;
    const c = customers.find((x) => x.id === customerId);
    if (c) {
      const isCorporate = c.invoiceType === "corporate";
      setForm((prev) => ({
        ...prev,
        customerType: isCorporate ? "kurumsal" : "bireysel",
        customerName: isCorporate ? (c.companyName ? `${c.companyName} / ${c.name}` : c.name) : c.name,
        tcNo: c.tckn,
        vergiNo: isCorporate ? c.taxNumber : "",
        licenseNo: c.idSerialNo,
        licenseDate: c.idIssueDate,
        address: c.address,
        phone: c.phone,
        email: c.email,
      }));
    }
  };

  const onSelectVehicle = (plate: string) => {
    setSelectedVehiclePlate(plate);
    if (!plate) return;
    const v = vehicles.find((x) => x.plate === plate);
    if (v) {
      setForm((prev) => ({
        ...prev,
        plate: v.plate,
        model: v.name,
        km: v.km,
        chassisNo: v.chassisNo,
        insuranceCompany: v.insurance_company,
        insuranceEndDate: v.insurance_end_date,
        cascoCompany: v.casco_company,
        cascoEndDate: v.casco_end_date,
      }));
    }
  };

  const autoTotalPrice = useMemo(() => {
    const rate = parseCurrency(form.dailyPrice);
    if (!form.startDate || !form.endDate || rate <= 0) return "0";
    const start = new Date(form.startDate);
    const end = new Date(form.endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "0";
    const diffMs = end.getTime() - start.getTime();
    const days = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    if (form.rentalType === "aylik") {
      const months = Math.max(1, Math.ceil(days / 30));
      return String(months * rate);
    }
    return String(days * rate);
  }, [form.dailyPrice, form.startDate, form.endDate, form.rentalType]);

  const finalTotalPrice = form.totalPrice.trim() || autoTotalPrice;

  const set = (key: keyof ContractFormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleCreateContract = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreating(true);
    try {
      const signatureDate = form.startDate
        ? toLocalDateTimeLabel(form.startDate)
        : `${new Date().toLocaleDateString("tr-TR")} ${new Date().toLocaleTimeString("tr-TR", {
            hour: "2-digit",
            minute: "2-digit",
          })}`;

      await downloadRentalContractPDF({
        kiraci: {
          adSoyad: form.customerName || "-",
          tcNo: isKurumsal ? "" : (form.tcNo || "-"),
          vergiNo: isKurumsal ? (form.vergiNo || "-") : "",
          kurumsal: isKurumsal,
          ehliyetNo: form.licenseNo || "-",
          ehliyetTarihi: toDateLabel(form.licenseDate),
          adres: form.address || "-",
          telefon: form.phone || "-",
          email: form.email || "-",
        },
        arac: {
          plaka: form.plate || "-",
          markaModel: form.model || "-",
          sasiNo: form.chassisNo || "-",
          kilometre: form.km || "0",
          sigortaBitis: toDateLabel(form.insuranceEndDate),
          sigortaFirma: form.insuranceCompany || "-",
          kaskoBitis: toDateLabel(form.cascoEndDate),
          kaskoFirma: form.cascoCompany || "-",
        },
        kiralama: {
          baslangicTarih: toLocalDateTimeLabel(form.startDate),
          bitisTarih: toLocalDateTimeLabel(form.endDate),
          gunlukKira: form.dailyPrice || "0",
          toplamKira: finalTotalPrice || "0",
          teminat: form.deposit || "0",
          kiraTuru: form.rentalType,
          kdvDurumu: "dahil",
        },
        imzaTarih: signatureDate,
      });

      toast({
        title: "Sözleşme oluşturuldu",
        description: "PDF indirildi.",
      });
    } catch (error) {
      console.error("Contract creation error:", error);
      toast({
        title: "Sözleşme oluşturulamadı",
        description: "Bilgileri kontrol edip tekrar deneyin.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Sözleşme Oluştur</h2>
        <p className="text-sm text-slate-500 mt-1">Kiralama sözleşmesi PDF'i oluşturmak için aşağıdaki formu doldurun.</p>
      </div>

      <form onSubmit={handleCreateContract} className="space-y-5">
        {/* MÜŞTERİ TİPİ */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant={!isKurumsal ? "default" : "outline"}
            size="lg"
            className="w-full"
            onClick={() => set("customerType", "bireysel")}
          >
            <User className="mr-2 h-4 w-4" />
            Bireysel Müşteri
          </Button>
          <Button
            type="button"
            variant={isKurumsal ? "default" : "outline"}
            size="lg"
            className="w-full"
            onClick={() => set("customerType", "kurumsal")}
          >
            <Building2 className="mr-2 h-4 w-4" />
            Kurumsal Müşteri
          </Button>
        </div>

        {/* ÖNCEKİ MÜŞTERİ SEÇ */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Önceki Müşterilerden Seç
            </CardTitle>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4">
            <Popover open={customerPopoverOpen} onOpenChange={setCustomerPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={customerPopoverOpen}
                  className="w-full justify-between font-normal"
                  disabled={customersLoading}
                >
                  {customersLoading ? (
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Müşteriler yükleniyor...
                    </span>
                  ) : selectedCustomerId ? (
                    <span className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-green-600" />
                      {customers.find((c) => c.id === selectedCustomerId)?.name ?? "Seçili müşteri"}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Müşteri arayın veya seçin...</span>
                  )}
                  <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Ad, telefon veya TC ile ara..." />
                  <CommandList>
                    <CommandEmpty>Müşteri bulunamadı.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="__clear__"
                        onSelect={() => {
                          setSelectedCustomerId("");
                          setCustomerPopoverOpen(false);
                        }}
                      >
                        <span className="text-muted-foreground">Seçimi temizle (manuel gir)</span>
                      </CommandItem>
                      {customers.map((c) => (
                        <CommandItem
                          key={c.id}
                          value={`${c.name} ${c.phone} ${c.tckn}`}
                          onSelect={() => onSelectCustomer(c.id)}
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">{c.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {c.phone}{c.tckn ? ` • TC: ${c.tckn}` : ""}
                              {c.invoiceType === "corporate" && c.companyName ? ` • ${c.companyName}` : ""}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </CardContent>
        </Card>

        {/* MÜŞTERİ BİLGİLERİ */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{isKurumsal ? "Firma / Müşteri Bilgileri" : "Müşteri Bilgileri"}</CardTitle>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4 grid gap-3 md:grid-cols-2">
            <Field label={isKurumsal ? "Firma Adı / Yetkili" : "Ad Soyad"}>
              <Input
                value={form.customerName}
                onChange={(e) => set("customerName", e.target.value)}
                placeholder={isKurumsal ? "ABC Ltd. Şti. / Ali Veli" : "Adı Soyadı"}
                required
              />
            </Field>
            <Field label="Telefon">
              <Input
                type="tel"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="05XX XXX XX XX"
                required
              />
            </Field>

            {isKurumsal ? (
              <Field label="Vergi No">
                <Input
                  value={form.vergiNo}
                  onChange={(e) => set("vergiNo", e.target.value)}
                  placeholder="Vergi numarası"
                  required
                />
              </Field>
            ) : (
              <Field label="TC Kimlik No">
                <Input
                  value={form.tcNo}
                  onChange={(e) => set("tcNo", e.target.value)}
                  placeholder="XXXXXXXXXXX"
                  maxLength={11}
                />
              </Field>
            )}

            <Field label="E-posta">
              <Input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="ornek@email.com"
              />
            </Field>
            <Field label="Ehliyet No">
              <Input
                value={form.licenseNo}
                onChange={(e) => set("licenseNo", e.target.value)}
                placeholder="Ehliyet seri no"
              />
            </Field>
            <Field label="Ehliyet Tarihi">
              <Input type="date" value={form.licenseDate} onChange={(e) => set("licenseDate", e.target.value)} />
            </Field>
            <Field label="Adres" span2>
              <Input
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                placeholder="Açık adres"
              />
            </Field>
          </CardContent>
        </Card>

        {/* ARAÇ BİLGİLERİ */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Araç Bilgileri</CardTitle>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4 grid gap-3 md:grid-cols-2">
            <Field label="Araç seç (plaka)" span2>
              <Select
                value={selectedVehiclePlate || "__none__"}
                onValueChange={(val) => {
                  if (val === "__none__") {
                    setSelectedVehiclePlate("");
                    return;
                  }
                  onSelectVehicle(val);
                }}
                disabled={vehiclesLoading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={vehiclesLoading ? "Araçlar yükleniyor..." : "Plakaya göre araç seçin"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">
                    <span className="text-muted-foreground">Araç seçmeyin (manuel girin)</span>
                  </SelectItem>
                  {vehicles.map((v) => (
                    <SelectItem key={v.plate} value={v.plate}>
                      {v.plate} — {v.name || "İsimsiz"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Plaka">
              <Input
                value={form.plate}
                onChange={(e) => {
                  set("plate", e.target.value.toUpperCase());
                  if (selectedVehiclePlate) setSelectedVehiclePlate("");
                }}
                placeholder="01 ABC 123"
                required
              />
            </Field>
            <Field label="Marka / Model">
              <Input
                value={form.model}
                onChange={(e) => set("model", e.target.value)}
                placeholder="Citroen C3 Aircross"
                required
              />
            </Field>
            <Field label="Şasi No">
              <Input
                value={form.chassisNo}
                onChange={(e) => set("chassisNo", e.target.value)}
                placeholder="VF7..."
              />
            </Field>
            <Field label="Teslim km (araç kaç km'de teslim edildi)">
              <Input
                value={form.km}
                onChange={(e) => set("km", e.target.value)}
                placeholder="Örn: 45000"
              />
            </Field>

            <Separator className="md:col-span-2 my-1" />

            <Field label="Sigorta Firması">
              <Input
                value={form.insuranceCompany}
                onChange={(e) => set("insuranceCompany", e.target.value)}
                placeholder="Sigorta şirketi"
              />
            </Field>
            <Field label="Sigorta Bitiş">
              <Input type="date" value={form.insuranceEndDate} onChange={(e) => set("insuranceEndDate", e.target.value)} />
            </Field>
            <Field label="Kasko Firması">
              <Input
                value={form.cascoCompany}
                onChange={(e) => set("cascoCompany", e.target.value)}
                placeholder="Kasko şirketi"
              />
            </Field>
            <Field label="Kasko Bitiş">
              <Input type="date" value={form.cascoEndDate} onChange={(e) => set("cascoEndDate", e.target.value)} />
            </Field>
          </CardContent>
        </Card>

        {/* KİRALAMA BİLGİLERİ */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Kiralama Bilgileri</CardTitle>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4 grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2 space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">Kiralama türü</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={form.rentalType === "gunluk" ? "default" : "outline"}
                  size="sm"
                  onClick={() => set("rentalType", "gunluk")}
                >
                  Günlük
                </Button>
                <Button
                  type="button"
                  variant={form.rentalType === "aylik" ? "default" : "outline"}
                  size="sm"
                  onClick={() => set("rentalType", "aylik")}
                >
                  Aylık
                </Button>
              </div>
            </div>
            <Field label="Başlangıç Tarih / Saat">
              <Input type="datetime-local" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} required />
            </Field>
            <Field label="Bitiş Tarih / Saat">
              <Input type="datetime-local" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} required />
            </Field>
            <Field label={form.rentalType === "aylik" ? "Aylık kira (TL)" : "Günlük kira (TL)"}>
              <Input
                value={form.dailyPrice}
                onChange={(e) => set("dailyPrice", e.target.value)}
                placeholder={form.rentalType === "aylik" ? "Ör: 25000" : "Ör: 1500"}
                required
              />
            </Field>
            <Field label="Toplam Kira (TL)">
              <Input
                value={form.totalPrice}
                onChange={(e) => set("totalPrice", e.target.value)}
                placeholder={autoTotalPrice !== "0" ? `Otomatik: ${autoTotalPrice} TL` : "Otomatik hesaplanır"}
              />
            </Field>
            <Field label="Teminat (TL)">
              <Input
                value={form.deposit}
                onChange={(e) => set("deposit", e.target.value)}
                placeholder="Ör: 5000"
              />
            </Field>
          </CardContent>
        </Card>

        {/* OLUŞTUR BUTONU */}
        <Button type="submit" disabled={creating} size="lg" className="w-full">
          {creating ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Sözleşme Oluşturuluyor...
            </>
          ) : (
            <>
              <FileText className="mr-2 h-5 w-5" />
              Sözleşme Oluştur (PDF İndir)
            </>
          )}
        </Button>
      </form>
    </div>
  );
};
