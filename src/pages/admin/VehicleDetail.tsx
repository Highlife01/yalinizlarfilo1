import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { collection, doc, getDoc, getDocs, orderBy, query, updateDoc, where } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "@/integrations/firebase/client";
import { ArrowLeft, Car, Fuel, Gauge, Pencil, Save, X, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhotoInput } from "@/components/ui/photo-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { compressImageForUpload } from "@/utils/imageCompression";

const formatMoney = (v: number) =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v);

type VehicleStatus = "active" | "rented" | "maintenance" | "inactive";

type Vehicle = {
  id: string;
  name: string;
  category: string;
  plate: string;
  status: VehicleStatus;
  fuel: string;
  transmission: string;
  daily_price: string;
  price: string;
  purchase_price?: number;
  sale_price?: number;
  km: number;
  passengers: number;
  image_url: string | null;
  image_urls: string[];
  monthly_fixed_cost: number;
  cost_per_rental: number;
  insurance_company: string;
  insurance_start_date: string;
  insurance_end_date: string;
  casco_company: string;
  casco_start_date: string;
  casco_end_date: string;
  registration_photo_url: string;
};

type VehicleOperation = {
  id: string;
  type?: string;
  date?: string;
  km?: number | string;
  fuel?: string;
  damagePoints?: unknown[];
  notes?: string;
};

const MAX_IMAGES = 5;
const emptyImages = () => Array.from({ length: MAX_IMAGES }, () => "");
const normalizeImages = (urls?: string[] | null) => {
  const safe = (urls || []).slice(0, MAX_IMAGES);
  return [...safe, ...Array.from({ length: MAX_IMAGES - safe.length }, () => "")];
};

const mapVehicle = (id: string, data: Record<string, unknown>): Vehicle => {
  const images = Array.isArray(data.image_urls)
    ? data.image_urls.filter((v): v is string => typeof v === "string")
    : [];

  return {
    id,
    name: String(data.name || ""),
    category: String(data.category || ""),
    plate: String(data.plate || ""),
    status: (data.status as VehicleStatus) || "active",
    fuel: String(data.fuel || ""),
    transmission: String(data.transmission || ""),
    daily_price: String(data.daily_price || "0"),
    price: String(data.price || "0"),
    purchase_price: Number(data.purchase_price || 0),
    sale_price: Number(data.sale_price || 0),
    km: Number(data.km || 0),
    passengers: Number(data.passengers || 5),
    image_url: (data.image_url as string) || images[0] || null,
    image_urls: images,
    monthly_fixed_cost: Number(data.monthly_fixed_cost || 0),
    cost_per_rental: Number(data.cost_per_rental || 0),
    insurance_company: String(data.insurance_company || ""),
    insurance_start_date: String(data.insurance_start_date || ""),
    insurance_end_date: String(data.insurance_end_date || ""),
    casco_company: String(data.casco_company || ""),
    casco_start_date: String(data.casco_start_date || ""),
    casco_end_date: String(data.casco_end_date || ""),
    registration_photo_url: String(data.registration_photo_url || "")
  };
};

const statusLabel = (value: VehicleStatus) => {
  if (value === "active") return "Musait";
  if (value === "rented") return "Kirada";
  if (value === "maintenance") return "Bakimda";
  return "Pasif";
};

const statusClass = (value: VehicleStatus) => {
  if (value === "active") return "bg-green-100 text-green-800";
  if (value === "rented") return "bg-red-100 text-red-800";
  if (value === "maintenance") return "bg-orange-100 text-orange-800";
  return "bg-slate-100 text-slate-800";
};

export const VehicleDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [formData, setFormData] = useState<Partial<Vehicle>>({ image_urls: emptyImages() });
  const [operations, setOperations] = useState<VehicleOperation[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [totalCost, setTotalCost] = useState<number>(0);
  const [totalIncome, setTotalIncome] = useState<number>(0);
  const [uploadingSlots, setUploadingSlots] = useState<boolean[]>(Array.from({ length: MAX_IMAGES }, () => false));
  const [uploadingRegistration, setUploadingRegistration] = useState(false);
  useEffect(() => {
    void fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const vehicleSnap = await getDoc(doc(db, "vehicles", id));
      if (vehicleSnap.exists()) {
        const mapped = mapVehicle(vehicleSnap.id, vehicleSnap.data());
        setVehicle(mapped);
        setFormData({ ...mapped, image_urls: normalizeImages(mapped.image_urls) });

        // Calculate costs and incomes
        const costQ = query(collection(db, "vehicle_costs"), where("vehicleId", "==", id));
        const costSnap = await getDocs(costQ);
        setTotalCost(costSnap.docs.reduce((acc, d) => acc + Number(d.data().amount || 0), 0));

        const plateUpper = mapped.plate.toUpperCase();
        const incomeQ = query(collection(db, "payments"), where("vehiclePlate", "==", plateUpper));
        const incomeSnap = await getDocs(incomeQ);
        setTotalIncome(incomeSnap.docs.reduce((acc, d) => acc + Number(d.data().amount || 0), 0));
      }

      const q = query(collection(db, "vehicle_operations"), where("vehicleId", "==", id), orderBy("date", "desc"));
      const opSnap = await getDocs(q);
      setOperations(opSnap.docs.map((d) => ({ id: d.id, ...d.data() } as VehicleOperation)));
    } catch (error) {
      console.error(error);
      toast({ title: "Hata", description: "Arac verileri alinamadi.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const imageSlots = useMemo(
    () => normalizeImages(formData.image_urls || (formData.image_url ? [formData.image_url] : [])),
    [formData.image_urls, formData.image_url]
  );

  const updateImageSlot = (index: number, value: string) => {
    const slots = normalizeImages(formData.image_urls || (formData.image_url ? [formData.image_url] : []));
    slots[index] = value;
    const firstImage = slots.find((v) => v.trim()) || null;
    setFormData((prev) => ({ ...prev, image_urls: slots, image_url: firstImage }));
  };

  const handleImageUpload = async (index: number, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !id) return;

    setUploadingSlots((prev) => prev.map((isUploading, slot) => (slot === index ? true : isUploading)));
    try {
      const optimizedFile = await compressImageForUpload(file);
      const safeName = optimizedFile.name.replace(/\s+/g, "_");
      const path = `vehicles/${id}/${Date.now()}_${index + 1}_${safeName}`;
      const storageRef = ref(storage, path);
      const snapshot = await uploadBytes(storageRef, optimizedFile, { contentType: optimizedFile.type });
      const uploadedUrl = await getDownloadURL(snapshot.ref);
      updateImageSlot(index, uploadedUrl);
      toast({ title: "Yuklendi", description: `${index + 1}. fotograf yuklendi.` });
    } catch (error) {
      console.error(error);
      const errMsg = error instanceof Error ? error.message : JSON.stringify(error);
      toast({ title: "Hata", description: `Fotograf yuklenemedi: ${errMsg}`, variant: "destructive" });
    } finally {
      event.target.value = "";
      setUploadingSlots((prev) => prev.map((isUploading, slot) => (slot === index ? false : isUploading)));
    }
  };

  const handleRegistrationUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !id) return;

    setUploadingRegistration(true);
    try {
      const optimizedFile = await compressImageForUpload(file);
      const safeName = optimizedFile.name.replace(/\s+/g, "_");
      const path = `vehicles/${id}/documents/ruhsat_${Date.now()}_${safeName}`;
      const storageRef = ref(storage, path);
      const snapshot = await uploadBytes(storageRef, optimizedFile, { contentType: optimizedFile.type });
      const uploadedUrl = await getDownloadURL(snapshot.ref);
      setFormData((prev) => ({ ...prev, registration_photo_url: uploadedUrl }));
      toast({ title: "Yuklendi", description: "Ruhsat fotografi yuklendi." });
    } catch (error) {
      console.error(error);
      const errMsg = error instanceof Error ? error.message : JSON.stringify(error);
      alert(`Ruhsat yukleme hatasi: ${errMsg}`);
      toast({ title: "Hata", description: `Ruhsat fotografi yuklenemedi: ${errMsg}`, variant: "destructive" });
    } finally {
      event.target.value = "";
      setUploadingRegistration(false);
    }
  };

  const startEdit = () => {
    if (!vehicle) return;
    setFormData({ ...vehicle, image_urls: normalizeImages(vehicle.image_urls) });
    setUploadingSlots(Array.from({ length: MAX_IMAGES }, () => false));
    setUploadingRegistration(false);
    setEditing(true);
  };

  const cancelEdit = () => {
    if (!vehicle) return;
    setFormData({ ...vehicle, image_urls: normalizeImages(vehicle.image_urls) });
    setUploadingSlots(Array.from({ length: MAX_IMAGES }, () => false));
    setUploadingRegistration(false);
    setEditing(false);
  };

  const save = async () => {
    if (!id || !vehicle) return;
    setSaving(true);
    try {
      const selected = (formData.image_urls || [])
        .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
        .slice(0, MAX_IMAGES);

      const payload: Partial<Vehicle> = {
        name: (formData.name || "").trim(),
        category: (formData.category || "").trim(),
        plate: (formData.plate || "").toUpperCase().trim(),
        status: (formData.status as VehicleStatus) || "active",
        fuel: (formData.fuel || "").trim(),
        transmission: (formData.transmission || "").trim(),
        daily_price: String(formData.daily_price || "0").trim(),
        price: String(formData.price || "0").trim(),
        purchase_price: Number(formData.purchase_price || 0),
        sale_price: Number(formData.sale_price || 0),
        km: Number(formData.km || 0),
        passengers: Number(formData.passengers || 0),
        monthly_fixed_cost: Number(formData.monthly_fixed_cost || 0),
        cost_per_rental: Number(formData.cost_per_rental || 0),
        insurance_company: (formData.insurance_company || "").trim(),
        insurance_start_date: formData.insurance_start_date || "",
        insurance_end_date: formData.insurance_end_date || "",
        casco_company: (formData.casco_company || "").trim(),
        casco_start_date: formData.casco_start_date || "",
        casco_end_date: formData.casco_end_date || "",
        registration_photo_url: (formData.registration_photo_url || "").trim(),
        image_urls: selected,
        image_url: selected[0] || null
      };

      await updateDoc(doc(db, "vehicles", id), payload);
      const updated: Vehicle = {
        ...vehicle,
        ...payload,
        image_urls: selected,
        image_url: selected[0] || null,
        status: (payload.status as VehicleStatus) || "active"
      };
      setVehicle(updated);
      setFormData({ ...updated, image_urls: normalizeImages(updated.image_urls) });
      setEditing(false);
      toast({ title: "Kaydedildi", description: "Arac bilgileri guncellendi." });
    } catch (error) {
      console.error(error);
      toast({ title: "Hata", description: "Kayit sirasinda sorun olustu.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Yukleniyor...</div>;
  if (!vehicle) return <div className="p-8 text-center">Arac bulunamadi.</div>;

  const lastReturn = operations.find((x) => x.type === "return");
  const lastDelivery = operations.find((x) => x.type === "delivery");
  const formKm = Number(editing ? formData.km : vehicle.km);
  const latestOperationKm = Number(lastReturn?.km || lastDelivery?.km || 0);
  const displayedKm = Math.max(formKm || 0, latestOperationKm || 0);
  const currentStatus = ((editing ? formData.status : vehicle.status) as VehicleStatus) || "inactive";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/fleet")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold">{editing ? formData.plate || vehicle.plate : vehicle.plate}</h2>
            <p className="text-slate-500">{editing ? formData.name || vehicle.name : vehicle.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button variant="outline" onClick={cancelEdit} disabled={saving}><X className="w-4 h-4 mr-2" />Iptal</Button>
              <Button onClick={() => void save()} disabled={saving}><Save className="w-4 h-4 mr-2" />{saving ? "Kaydediliyor..." : "Kaydet"}</Button>
            </>
          ) : (
            <Button onClick={startEdit}><Pencil className="w-4 h-4 mr-2" />Duzenle</Button>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm">Durum</CardTitle><Car className="w-4 h-4 text-slate-400" /></CardHeader><CardContent><Badge className={statusClass(currentStatus)}>{statusLabel(currentStatus)}</Badge></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm">Kilometre</CardTitle><Gauge className="w-4 h-4 text-slate-400" /></CardHeader><CardContent><div className="text-2xl font-bold">{displayedKm > 0 ? displayedKm : "N/A"}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm">Yakit</CardTitle><Fuel className="w-4 h-4 text-slate-400" /></CardHeader><CardContent><div className="text-2xl font-bold">{lastReturn?.fuel || lastDelivery?.fuel || "N/A"}</div></CardContent></Card>
      </div>

      {!editing && (
        <Card className="border-emerald-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-bl-full -z-10"></div>
          <CardHeader className="pb-2">
            <CardTitle className="text-emerald-800 flex items-center gap-2">
              <span className="bg-emerald-100 p-2 rounded-lg"><TrendingUp className="w-5 h-5 text-emerald-600" /></span> 
              Araç Karlılık Tablosu
            </CardTitle>
            <p className="text-sm text-slate-500">Alış maliyeti, geçmiş tüm masraflar, satış rakamı ve elde edilen toplam tahsilat (kiralama gelirleri) üzerinden hesaplanan gerçek net kar verisidir.</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 items-center">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-500 uppercase">Araç Maliyeti (Alış)</span>
                <div className="text-lg font-bold text-slate-700">{formatMoney(vehicle.purchase_price || 0)}</div>
              </div>
              <div className="text-2xl text-slate-300 font-light hidden md:block text-center">+</div>
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-500 uppercase">Toplam Masraf</span>
                <div className="text-lg font-bold text-red-600">{formatMoney(totalCost)}</div>
              </div>
              <div className="text-2xl text-slate-300 font-light hidden md:block text-center">=</div>
              <div className="space-y-1 col-span-2 md:col-span-1 border-l-2 pl-4 border-slate-100">
                <span className="text-xs font-semibold text-slate-500 uppercase">Toplam Yatırım</span>
                <div className="text-xl font-bold text-slate-800">{formatMoney((vehicle.purchase_price || 0) + totalCost)}</div>
              </div>
            </div>
            <div className="my-4 border-t border-dashed border-slate-200"></div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 items-center">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-500 uppercase">Satış Rakamı</span>
                <div className="text-lg font-bold text-emerald-700">{formatMoney(vehicle.sale_price || 0)}</div>
              </div>
              <div className="text-2xl text-slate-300 font-light hidden md:block text-center">+</div>
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-500 uppercase">Tahsilatlar (Gelir)</span>
                <div className="text-lg font-bold text-emerald-600">{formatMoney(totalIncome)}</div>
              </div>
              <div className="text-2xl text-slate-300 font-light hidden md:block text-center">=</div>
              <div className="space-y-1 col-span-2 md:col-span-1 border-l-2 pl-4 border-emerald-100 bg-emerald-50/50 p-2 rounded">
                <span className="text-xs font-bold text-emerald-900 uppercase">Gerçek Net Kar</span>
                <div className={`text-2xl font-black ${((vehicle.sale_price || 0) + totalIncome) - ((vehicle.purchase_price || 0) + totalCost) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {formatMoney(((vehicle.sale_price || 0) + totalIncome) - ((vehicle.purchase_price || 0) + totalCost))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>{editing ? "Tum Alanlari Duzenle" : "Arac Bilgileri"}</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-slate-800">Temel Arac Bilgileri</h4>
              <p className="text-xs text-slate-500">Tablet kullaniminda hizli veri girisi icin buyuk alanlar.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Marka Model</Label><Input className="h-11" value={formData.name || ""} disabled={!editing} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
              <div className="space-y-2"><Label>Plaka</Label><Input className="h-11 uppercase" value={formData.plate || ""} disabled={!editing} onChange={(e) => setFormData({ ...formData, plate: e.target.value.toUpperCase() })} /></div>
              <div className="space-y-2"><Label>Kategori</Label><Input className="h-11" value={formData.category || ""} disabled={!editing} onChange={(e) => setFormData({ ...formData, category: e.target.value })} /></div>
              <div className="space-y-2">
                <Label>Durum</Label>
                {editing ? (
                  <Select value={(formData.status as string) || "active"} onValueChange={(value: VehicleStatus) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Musait</SelectItem>
                      <SelectItem value="rented">Kirada</SelectItem>
                      <SelectItem value="maintenance">Bakimda</SelectItem>
                      <SelectItem value="inactive">Pasif</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input className="h-11" value={statusLabel(currentStatus)} disabled />
                )}
              </div>
              <div className="space-y-2"><Label>Yolcu</Label><Input className="h-11" type="number" min={1} value={formData.passengers ?? 5} disabled={!editing} onChange={(e) => setFormData({ ...formData, passengers: Number(e.target.value || 0) })} /></div>
              <div className="space-y-2"><Label>KM</Label><Input className="h-11" type="number" min={0} value={formData.km ?? 0} disabled={!editing} onChange={(e) => setFormData({ ...formData, km: Number(e.target.value || 0) })} /></div>
              <div className="space-y-2"><Label>Yakit</Label><Input className="h-11" value={formData.fuel || ""} disabled={!editing} onChange={(e) => setFormData({ ...formData, fuel: e.target.value })} /></div>
              <div className="space-y-2"><Label>Vites</Label><Input className="h-11" value={formData.transmission || ""} disabled={!editing} onChange={(e) => setFormData({ ...formData, transmission: e.target.value })} /></div>
              <div className="space-y-2"><Label>Gunluk Fiyat</Label><Input className="h-11" inputMode="numeric" value={formData.daily_price || ""} disabled={!editing} onChange={(e) => setFormData({ ...formData, daily_price: e.target.value })} /></div>
              <div className="space-y-2"><Label>Aylik Fiyat</Label><Input className="h-11" inputMode="numeric" value={formData.price || ""} disabled={!editing} onChange={(e) => setFormData({ ...formData, price: e.target.value })} /></div>
              <div className="space-y-2"><Label>Alış Fiyatı (₺)</Label><Input className="h-11" type="number" min={0} value={formData.purchase_price || 0} disabled={!editing} onChange={(e) => setFormData({ ...formData, purchase_price: Number(e.target.value || 0) })} /></div>
              <div className="space-y-2"><Label>Satış Rakamı (₺)</Label><Input className="h-11" type="number" min={0} value={formData.sale_price || 0} disabled={!editing} onChange={(e) => setFormData({ ...formData, sale_price: Number(e.target.value || 0) })} /></div>
              <div className="space-y-2"><Label>Aylik Sabit Gider</Label><Input className="h-11" type="number" min={0} value={formData.monthly_fixed_cost ?? 0} disabled={!editing} onChange={(e) => setFormData({ ...formData, monthly_fixed_cost: Number(e.target.value || 0) })} /></div>
              <div className="space-y-2"><Label>Kiralama Basi Gider</Label><Input className="h-11" type="number" min={0} value={formData.cost_per_rental ?? 0} disabled={!editing} onChange={(e) => setFormData({ ...formData, cost_per_rental: Number(e.target.value || 0) })} /></div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4 space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-slate-800">Evrak Bilgileri</h4>
              <p className="text-xs text-slate-500">Sigorta ve kasko tarihlerini tek alandan yonetin.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Sigorta Sirketi</Label><Input className="h-11" value={formData.insurance_company || ""} disabled={!editing} onChange={(e) => setFormData({ ...formData, insurance_company: e.target.value })} /></div>
              <div className="space-y-2"><Label>Kasko Sirketi</Label><Input className="h-11" value={formData.casco_company || ""} disabled={!editing} onChange={(e) => setFormData({ ...formData, casco_company: e.target.value })} /></div>
              <div className="space-y-2"><Label>Sigorta Baslangic</Label><Input className="h-11" type="date" value={formData.insurance_start_date || ""} disabled={!editing} onChange={(e) => setFormData({ ...formData, insurance_start_date: e.target.value })} /></div>
              <div className="space-y-2"><Label>Sigorta Bitis</Label><Input className="h-11" type="date" value={formData.insurance_end_date || ""} disabled={!editing} onChange={(e) => setFormData({ ...formData, insurance_end_date: e.target.value })} /></div>
              <div className="space-y-2"><Label>Kasko Baslangic</Label><Input className="h-11" type="date" value={formData.casco_start_date || ""} disabled={!editing} onChange={(e) => setFormData({ ...formData, casco_start_date: e.target.value })} /></div>
              <div className="space-y-2"><Label>Kasko Bitis</Label><Input className="h-11" type="date" value={formData.casco_end_date || ""} disabled={!editing} onChange={(e) => setFormData({ ...formData, casco_end_date: e.target.value })} /></div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4 space-y-3">
            <Label>Ruhsat Fotografi</Label>
            {editing && (
              <div className="flex flex-wrap items-center gap-2">
                <PhotoInput
                  onChange={(e) => void handleRegistrationUpload(e)}
                  disabled={uploadingRegistration}
                  loading={uploadingRegistration}
                  labelCamera="Fotograf cek"
                  labelGallery="Galeriden sec"
                  buttonClassName="h-10"
                />
                {formData.registration_photo_url && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setFormData((prev) => ({ ...prev, registration_photo_url: "" }))}
                    className="h-9 w-9 text-slate-500 hover:text-red-600"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
            {formData.registration_photo_url ? (
              <div className="relative inline-block">
                <img
                  src={formData.registration_photo_url}
                  alt="Ruhsat fotografi"
                  className="h-28 w-44 rounded object-cover border border-slate-200"
                />
                {editing && (
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, registration_photo_url: "" }))}
                    className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-md transition-colors"
                    title="Ruhsat fotoğrafını sil"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Ruhsat fotografi yok.</p>
            )}
          </div>

          <div className="space-y-3 border rounded-xl p-4">
            <Label>Arac Fotograflari</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {imageSlots.map((url, index) => (
                <div key={index} className="rounded-md border border-slate-200 p-3 space-y-2 bg-white">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-slate-600">{index + 1}. Fotograf</span>
                    {editing && (
                      <div className="flex flex-wrap items-center gap-2">
                        <PhotoInput
                          onChange={(e) => void handleImageUpload(index, e)}
                          disabled={uploadingSlots[index]}
                          loading={uploadingSlots[index]}
                          labelCamera="Fotograf cek"
                          labelGallery="Galeriden sec"
                          buttonClassName="h-9"
                        />
                        {url && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => updateImageSlot(index, "")}
                            className="h-9 w-9 text-slate-500 hover:text-red-600"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                  {url ? (
                    <div className="relative inline-block">
                      <img
                        src={url}
                        alt={`Arac fotograf ${index + 1}`}
                        className="h-28 w-44 rounded object-cover border border-slate-200"
                      />
                      {editing && (
                        <button
                          type="button"
                          onClick={() => updateImageSlot(index, "")}
                          className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-md transition-colors"
                          title="Fotoğrafı sil"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">Bu slotta fotograf yok.</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Son Islemler</CardTitle></CardHeader>
        <CardContent>
          {operations.length === 0 ? (
            <p className="text-slate-500">Kayit yok.</p>
          ) : (
            <div className="space-y-2">
              {operations.slice(0, 8).map((op) => (
                <div key={op.id} className="border-l-2 border-slate-200 pl-3 py-1">
                  <p className="text-sm font-medium">{op.type || "islem"} - {op.date ? new Date(op.date).toLocaleDateString("tr-TR") : "-"}</p>
                  <p className="text-xs text-slate-500">{op.notes || "Not yok"}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
