import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
    collection,
    getDocs,
    getDoc,
    addDoc,
    writeBatch,
    deleteDoc,
    doc,
    updateDoc,
    query,
    orderBy
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage, auth } from "@/integrations/firebase/client";
import {
    Plus,
    Search,
    Filter,
    MoreHorizontal,
    Pencil,
    Trash2,
    FileText,
    CheckCircle2,
    AlertCircle,
    XCircle,
    Car,
    Download,
    FileDown,
    Upload,
    Loader2,
    X,
    Wallet
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { exportVehiclesToExcel, exportVehiclesPDF } from "@/utils/exportUtils";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { PhotoInput } from "@/components/ui/photo-input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { vehicles as staticVehicles } from "@/data/vehicles";
import { compressImageForUpload } from "@/utils/imageCompression";
import { Link } from "react-router-dom";

const formatMoney = (v: number) =>
    new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

// Extended Vehicle Type
export type Vehicle = {
    id: string;
    name: string;
    category: string;
    plate: string;
    color?: string;
    status: 'active' | 'maintenance' | 'rented' | 'inactive';
    fuel: string;
    transmission: string;
    price: string;
    daily_price?: string;
    purchase_price?: number;
    km?: number;
    image_url: string | null;
    image_urls?: string[];
    passengers: number;
    monthly_fixed_cost?: number;
    cost_per_rental?: number;
    insurance_company?: string;
    insurance_start_date?: string;
    insurance_end_date?: string;
    casco_company?: string;
    casco_start_date?: string;
    casco_end_date?: string;
    tuvturk_end_date?: string;
    registration_photo_url?: string | null;
};

const VEHICLE_STATUS_OPTIONS: Array<{ value: Vehicle["status"]; label: string }> = [
    { value: "active", label: "Müsait" },
    { value: "rented", label: "Kirada" },
    { value: "maintenance", label: "Bakımda" },
    { value: "inactive", label: "Pasif" }
];

const MAX_VEHICLE_IMAGES = 5;
const ALERT_WINDOW_DAYS = 15;
const DAY_IN_MS = 1000 * 60 * 60 * 24;

const createEmptyImageSlots = (): string[] => Array.from({ length: MAX_VEHICLE_IMAGES }, () => "");

const normalizeImageSlots = (urls?: string[] | null): string[] => {
    const safe = (urls || []).slice(0, MAX_VEHICLE_IMAGES);
    return [...safe, ...Array.from({ length: MAX_VEHICLE_IMAGES - safe.length }, () => "")];
};

const getDaysUntil = (dateValue?: string | null): number | null => {
    if (!dateValue) return null;
    const target = new Date(`${dateValue}T00:00:00`);
    if (Number.isNaN(target.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.ceil((target.getTime() - today.getTime()) / DAY_IN_MS);
};

const getDocumentStatus = (dateValue?: string | null) => {
    const daysUntil = getDaysUntil(dateValue);
    if (daysUntil === null) {
        return {
            label: "Tarih yok",
            className: "bg-slate-100 text-slate-700"
        };
    }
    if (daysUntil < 0) {
        return {
            label: `${Math.abs(daysUntil)} gün geçti`,
            className: "bg-red-100 text-red-700"
        };
    }
    if (daysUntil <= ALERT_WINDOW_DAYS) {
        return {
            label: `${daysUntil} gün kaldı`,
            className: "bg-amber-100 text-amber-800"
        };
    }
    return {
        label: `${daysUntil} gün`,
        className: "bg-emerald-100 text-emerald-700"
    };
};

const normalizeVehicleStatus = (rawValue?: string): Vehicle["status"] => {
    const value = (rawValue || "").trim().toLowerCase();
    if (["kirada", "rented"].includes(value)) return "rented";
    if (["bakimda", "bakim", "maintenance"].includes(value)) return "maintenance";
    if (["pasif", "inactive"].includes(value)) return "inactive";
    return "active";
};

export const FleetManagement = () => {
    const { toast } = useToast();
    const navigate = useNavigate();
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);
    const [costsAndPaymentsLoading, setCostsAndPaymentsLoading] = useState(true);
    const [vehicleCosts, setVehicleCosts] = useState<Array<{ vehicleId: string; vehiclePlate: string; amount: number }>>([]);
    const [payments, setPayments] = useState<Array<{ vehiclePlate: string; amount: number }>>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [importing, setImporting] = useState(false);
    const [bulkInput, setBulkInput] = useState("");
    const [bulkSaving, setBulkSaving] = useState(false);

    // Dialog & Form State
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
    const [uploadingSlots, setUploadingSlots] = useState<boolean[]>(Array.from({ length: MAX_VEHICLE_IMAGES }, () => false));
    const [uploadingRegistration, setUploadingRegistration] = useState(false);
    const [formData, setFormData] = useState<Partial<Vehicle>>({
        name: "",
        category: "",
        plate: "",
        color: "",
        status: 'active',
        fuel: "",
        transmission: "",
        price: "",
        daily_price: "",
        purchase_price: 0,
        km: 0,
        passengers: 5,
        image_url: "",
        image_urls: createEmptyImageSlots(),
        monthly_fixed_cost: 0,
        cost_per_rental: 0,
        insurance_start_date: "",
        insurance_end_date: "",
        casco_start_date: "",
        casco_end_date: "",
        tuvturk_end_date: "",
        registration_photo_url: ""
    });

    useEffect(() => {
        fetchVehicles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const fetchCostsAndPayments = async () => {
            setCostsAndPaymentsLoading(true);
            try {
                const [costsSnap, paymentsSnap] = await Promise.all([
                    getDocs(query(collection(db, "vehicle_costs"), orderBy("date", "desc"))),
                    getDocs(query(collection(db, "payments"), orderBy("date", "desc"))),
                ]);
                setVehicleCosts(
                    costsSnap.docs.map((d) => {
                        const data = d.data();
                        return {
                            vehicleId: String(data.vehicleId || ""),
                            vehiclePlate: String(data.vehiclePlate || "").toUpperCase(),
                            amount: Number(data.amount || 0),
                        };
                    })
                );
                setPayments(
                    paymentsSnap.docs.map((d) => {
                        const data = d.data();
                        return {
                            vehiclePlate: String(data.vehiclePlate || "").toUpperCase(),
                            amount: Number(data.amount || 0),
                        };
                    })
                );
            } catch {
                setVehicleCosts([]);
                setPayments([]);
            } finally {
                setCostsAndPaymentsLoading(false);
            }
        };
        void fetchCostsAndPayments();
    }, []);

    const fetchVehicles = async () => {
        setLoading(true);
        try {
            const querySnapshot = await getDocs(collection(db, "vehicles"));
            const list: Vehicle[] = [];
            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                const imageUrls = Array.isArray(data.image_urls)
                    ? data.image_urls.filter((item: unknown): item is string => typeof item === "string")
                    : [];
                list.push({
                    id: docSnap.id,
                    name: data.name || "Bilinmiyor",
                    category: data.category || "Genel",
                    plate: data.plate || "34 XX 000",
                    color: data.color || "",
                    status: data.status || 'active',
                    fuel: data.fuel || "Benzin",
                    transmission: data.transmission || "Manuel",
                    price: data.price || "0",
                    daily_price: data.daily_price || "0",
                    purchase_price: Number(data.purchase_price || 0),
                    km: Number(data.km || 0),
                    passengers: data.passengers || 5,
                    image_url: data.image_url || imageUrls[0] || null,
                    image_urls: imageUrls,
                    monthly_fixed_cost: Number(data.monthly_fixed_cost || 0),
                    cost_per_rental: Number(data.cost_per_rental || 0),
                    insurance_start_date: data.insurance_start_date || "",
                    insurance_end_date: data.insurance_end_date || "",
                    casco_start_date: data.casco_start_date || "",
                    casco_end_date: data.casco_end_date || "",
                    tuvturk_end_date: data.tuvturk_end_date || "",
                    registration_photo_url: data.registration_photo_url || ""
                } as Vehicle);
            });
            setVehicles(list);
        } catch (error: unknown) {
            console.error("Firestore araç listesi alınamadı:", error);
            const err = error as { code?: string; message?: string };
            const isPermission = err?.code === "permission-denied";
            const isUnavailable = err?.code === "unavailable" || err?.message?.includes("unavailable");
            if (isPermission) {
                toast({ title: "Erişim hatası", description: "Araç listesi için giriş yapmanız gerekiyor.", variant: "destructive" });
            } else if (isUnavailable) {
                toast({ title: "Bağlantı hatası", description: "Firebase'e ulaşılamıyor. İnternet ve .env Firebase ayarlarını kontrol edin.", variant: "destructive" });
            } else {
                toast({ title: "Araç listesi alınamadı", description: "İnternet ve Firebase ayarlarını kontrol edin. Varsayılan liste gösteriliyor.", variant: "destructive" });
            }
            setVehicles(
                staticVehicles.map((v, i) => ({
                    id: `offline-${i}`,
                    name: v.name,
                    category: v.category,
                    plate: "-",
                    color: "",
                    status: "active" as const,
                    fuel: v.fuel,
                    transmission: v.transmission,
                    price: v.price,
                    daily_price: "0",
                    purchase_price: 0,
                    km: 0,
                    passengers: v.passengers,
                    image_url: v.image_url,
                    image_urls: v.image_url ? [v.image_url] : [],
                    monthly_fixed_cost: 0,
                    cost_per_rental: 0,
                    insurance_start_date: "",
                    insurance_end_date: "",
                    casco_start_date: "",
                    casco_end_date: "",
                    tuvturk_end_date: "",
                    registration_photo_url: ""
                }))
            );
        } finally {
            setLoading(false);
        }
    };

    const loadDefaultVehicles = async () => {
        if (!confirm("Mevcut veri listesi uzerine varsayilan araclar eklenecek. Onayliyor musunuz?")) return;

        const user = auth.currentUser;
        if (!user) {
            toast({ title: "Giriş gerekli", description: "Örnek araçları yüklemek için önce giriş yapın.", variant: "destructive" });
            return;
        }
        try {
            const userSnap = await getDoc(doc(db, "users", user.uid));
            let role = userSnap.exists() ? userSnap.data()?.role : null;
            if (user.uid === "QzwyNVumNnNco2fFCTw6S01vQQj1") {
              role = "admin";
            }

            if (role !== "admin") {
                toast({
                    title: "Yönetici yetkisi gerekli",
                    description: "Araç eklemek için yönetici hesabıyla giriş yapmanız gerekiyor. Hesabınızı yönetici yapmak için projedeki scripts/set-admin-users adımlarını uygulayın.",
                    variant: "destructive"
                });
                return;
            }
        } catch (e) {
            console.error("Admin kontrol? hatas?:", e);
            toast({ title: "Kontrol hatası", description: "Yetki kontrolü yapılamadı. Giriş yapıp tekrar deneyin.", variant: "destructive" });
            return;
        }

        setImporting(true);
        try {
            let addedCount = 0;
            for (const v of staticVehicles) {
                const exists = vehicles.some(existing => existing.name === v.name && !existing.id.startsWith("offline-"));
                if (!exists) {
                    await addDoc(collection(db, "vehicles"), {
                        name: v.name,
                        category: v.category,
                        color: "",
                        passengers: v.passengers,
                        fuel: v.fuel,
                        transmission: v.transmission,
                        price: v.price,
                        daily_price: "0",
                        purchase_price: 0,
                        km: 0,
                        image_url: v.image_url,
                        image_urls: v.image_url ? [v.image_url] : [],
                        monthly_fixed_cost: 0,
                        cost_per_rental: 0,
                        insurance_start_date: "",
                        insurance_end_date: "",
                        casco_start_date: "",
                        casco_end_date: "",
                        tuvturk_end_date: "",
                        registration_photo_url: "",
                        plate: `34 TEST ${Math.floor(Math.random() * 900) + 100}`,
                        status: "active"
                    });
                    addedCount++;
                }
            }
            toast({ title: "Basarili", description: `${addedCount} arac veritabanina aktarildi.` });
            fetchVehicles();
        } catch (error: unknown) {
            console.error("Varsayilan araclar eklenirken hata:", error);
            const err = error as { code?: string; message?: string };
            const isPermission = err?.code === "permission-denied" || (err?.message?.toLowerCase?.() || "").includes("permission");
            const isUnavailable = err?.code === "unavailable" || (err?.message?.toLowerCase?.() || "").includes("unavailable");
            if (isPermission) {
                toast({ title: "Yetki hatası", description: "Araç eklemek için yönetici olarak giriş yapmanız gerekiyor. scripts/set-admin-users ile hesabınızı yönetici yapabilirsiniz.", variant: "destructive" });
            } else if (isUnavailable) {
                toast({ title: "Bağlantı hatası", description: "Firebase'e ulaşılamıyor. İnternet bağlantınızı kontrol edin.", variant: "destructive" });
            } else {
                const detail = [err?.code, err?.message].filter(Boolean).join(" - ") || "Bilinmeyen hata";
                toast({ title: "Araçlar eklenemedi", description: `İnternet ve Firebase ayarlarını kontrol edin. (${detail})`, variant: "destructive" });
            }
        } finally {
            setImporting(false);
        }
    };

    const handleBulkCreate = async () => {
        const trimmed = bulkInput.trim();
        if (!trimmed) {
            toast({
                title: "Toplu giris bos",
                description: "En az bir satir arac bilgisi girin.",
                variant: "destructive"
            });
            return;
        }

        const lines = trimmed
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter((line) => line.length > 0 && !line.startsWith("#"));

        const existingPlateSet = new Set(
            vehicles
                .map((vehicle) => (vehicle.plate || "").trim().toUpperCase())
                .filter((plate) => plate.length > 0)
        );

        const draftPayloads: Array<Omit<Vehicle, "id">> = [];
        const skippedRows: number[] = [];
        const duplicateRows: number[] = [];
        const duplicatePlates = new Set<string>();

        lines.forEach((line, lineIndex) => {
            const separator = line.includes(";")
                ? ";"
                : line.includes("\t")
                    ? "\t"
                    : line.includes("|")
                        ? "|"
                        : ",";
            const cols = line.split(separator).map((item) => item.trim());

            const name = cols[0] || "";
            const plate = (cols[1] || "").toUpperCase();
            const category = cols[2] || "Genel";
            const dailyPrice = cols[3] || "0";
            const monthlyPrice = cols[4] || "0";
            const fuel = cols[5] || "Benzin";
            const transmission = cols[6] || "Manuel";
            const passengers = Math.max(1, Number(cols[7] || 5));
            const status = normalizeVehicleStatus(cols[8]);
            const km = Math.max(0, Number(cols[9] || 0));
            const tuvturkDate = cols[10] || ""; // YYYY-MM-DD
            const insuranceDate = cols[11] || "";
            const cascoDate = cols[12] || "";

            if (!name || !plate) {
                skippedRows.push(lineIndex + 1);
                return;
            }

            if (existingPlateSet.has(plate)) {
                duplicateRows.push(lineIndex + 1);
                duplicatePlates.add(plate);
                return;
            }

            existingPlateSet.add(plate);
            draftPayloads.push({
                name,
                plate,
                color: "",
                category,
                status,
                fuel,
                transmission,
                price: monthlyPrice,
                daily_price: dailyPrice,
                purchase_price: 0,
                km,
                passengers,
                image_url: null,
                image_urls: [],
                monthly_fixed_cost: 0,
                cost_per_rental: 0,
                insurance_company: "",
                insurance_start_date: "",
                insurance_end_date: insuranceDate,
                casco_company: "",
                casco_start_date: "",
                casco_end_date: cascoDate,
                tuvturk_end_date: tuvturkDate,
                registration_photo_url: ""
            });
        });

        if (draftPayloads.length === 0) {
            toast({
                title: "Kayit eklenmedi",
                description: "Gecerli satir bulunamadi. Format: Ad;Plaka;Kategori;Gunluk;Aylik;Yakit;Vites;Yolcu;Durum",
                variant: "destructive"
            });
            return;
        }

        setBulkSaving(true);
        try {
            const chunkSize = 400;
            for (let start = 0; start < draftPayloads.length; start += chunkSize) {
                const batch = writeBatch(db);
                const chunk = draftPayloads.slice(start, start + chunkSize);
                chunk.forEach((payload) => {
                    const refDoc = doc(collection(db, "vehicles"));
                    batch.set(refDoc, payload);
                });
                await batch.commit();
            }

            setBulkInput("");
            toast({
                title: "Toplu arac ekleme tamamlandi",
                description: `${draftPayloads.length} arac eklendi${duplicateRows.length > 0 ? `, ${duplicateRows.length} satir atlandi.` : "."}`
            });

            if (skippedRows.length > 0 || duplicatePlates.size > 0) {
                toast({
                    title: "Atlanan satirlar var",
                    description: [
                        skippedRows.length > 0 ? `Bos/verisiz satir: ${skippedRows.join(", ")}` : "",
                        duplicatePlates.size > 0 ? `Mukerrer plaka: ${Array.from(duplicatePlates).join(", ")}` : ""
                    ].filter(Boolean).join(" | ")
                });
            }

            fetchVehicles();
        } catch (error) {
            console.error("Toplu arac ekleme hatasi:", error);
            toast({
                title: "Toplu ekleme basarisiz",
                description: "Lutfen satir formatini kontrol edip tekrar deneyin.",
                variant: "destructive"
            });
        } finally {
            setBulkSaving(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const selectedImageUrls = (formData.image_urls || [])
                .filter((url): url is string => typeof url === "string" && url.trim().length > 0)
                .slice(0, MAX_VEHICLE_IMAGES);

            const payload: Partial<Vehicle> = {
                ...formData,
                color: formData.color || "",
                image_urls: selectedImageUrls,
                image_url: selectedImageUrls[0] || null,
                purchase_price: Number(formData.purchase_price || 0),
                monthly_fixed_cost: Number(formData.monthly_fixed_cost || 0),
                cost_per_rental: Number(formData.cost_per_rental || 0),
                km: Number(formData.km || 0),
                insurance_start_date: formData.insurance_start_date || "",
                insurance_end_date: formData.insurance_end_date || "",
                casco_start_date: formData.casco_start_date || "",
                casco_end_date: formData.casco_end_date || "",
                tuvturk_end_date: formData.tuvturk_end_date || "",
                registration_photo_url: formData.registration_photo_url?.trim() || null
            };

            if (editingVehicle) {
                await updateDoc(doc(db, "vehicles", editingVehicle.id), payload);
                toast({ title: "Güncellendi", description: "Araç bilgileri başarıyla güncellendi." });
            } else {
                await addDoc(collection(db, "vehicles"), payload);
                toast({ title: "Eklendi", description: "Yeni araç başarıyla eklendi." });
            }
            setDialogOpen(false);
            resetForm();
            fetchVehicles();
        } catch (_error) {
            toast({ title: "Hata", description: "İşlem sırasında bir sorun oluştu.", variant: "destructive" });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Bu araci silmek istediginize emin misiniz?")) return;
        try {
            await deleteDoc(doc(db, "vehicles", id));
            toast({ title: "Silindi", description: "Araç sistemden kaldırıldı." });
            fetchVehicles();
        } catch (_error) {
            toast({ title: "Hata", description: "Silme islemi basarisiz.", variant: "destructive" });
        }
    };

    const getStatusLabel = (status: Vehicle["status"]) => {
        const selected = VEHICLE_STATUS_OPTIONS.find(option => option.value === status);
        return selected?.label || "Pasif";
    };

    const handleStatusChange = async (vehicle: Vehicle, newStatus: Vehicle["status"]) => {
        if (vehicle.id.startsWith("offline-")) return;
        if (vehicle.status === newStatus) return;

        try {
            await updateDoc(doc(db, "vehicles", vehicle.id), { status: newStatus });

            setVehicles(prev => prev.map(v =>
                v.id === vehicle.id ? { ...v, status: newStatus } : v
            ));

            toast({
                title: "Durum Guncellendi",
                description: `Arac durumu ${getStatusLabel(newStatus)} olarak guncellendi.`
            });
        } catch (_error) {
            toast({ title: "Hata", description: "Durum guncellenirken bir sorun olustu.", variant: "destructive" });
        }
    };

    const openEdit = (vehicle: Vehicle) => {
        setEditingVehicle(vehicle);
        setFormData({
            ...vehicle,
            color: vehicle.color || "",
            image_urls: normalizeImageSlots(vehicle.image_urls || (vehicle.image_url ? [vehicle.image_url] : [])),
            monthly_fixed_cost: Number(vehicle.monthly_fixed_cost || 0),
            cost_per_rental: Number(vehicle.cost_per_rental || 0),
            insurance_start_date: vehicle.insurance_start_date || "",
            insurance_end_date: vehicle.insurance_end_date || "",
            casco_start_date: vehicle.casco_start_date || "",
            casco_end_date: vehicle.casco_end_date || "",
            tuvturk_end_date: vehicle.tuvturk_end_date || "",
            registration_photo_url: vehicle.registration_photo_url || ""
        });
        setUploadingSlots(Array.from({ length: MAX_VEHICLE_IMAGES }, () => false));
        setDialogOpen(true);
    };

    const resetForm = () => {
        setEditingVehicle(null);
        setFormData({
            name: "",
            category: "",
            plate: "",
            color: "",
            status: 'active',
            fuel: "",
            transmission: "",
            price: "",
            daily_price: "",
            purchase_price: 0,
            km: 0,
            passengers: 5,
            image_url: "",
            image_urls: createEmptyImageSlots(),
            monthly_fixed_cost: 0,
            cost_per_rental: 0,
            insurance_start_date: "",
            insurance_end_date: "",
            casco_start_date: "",
            casco_end_date: "",
            tuvturk_end_date: "",
            registration_photo_url: ""
        });
        setUploadingSlots(Array.from({ length: MAX_VEHICLE_IMAGES }, () => false));
        setUploadingRegistration(false);
    };

    const updateImageSlot = (slotIndex: number, value: string) => {
        setFormData(prev => {
            const slots = normalizeImageSlots(prev.image_urls || (prev.image_url ? [prev.image_url] : []));
            slots[slotIndex] = value;
            const firstValidImage = slots.find(url => url.trim().length > 0) || null;
            return {
                ...prev,
                image_urls: slots,
                image_url: firstValidImage
            };
        });
    };

    const handleImageUpload = async (slotIndex: number, event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploadingSlots(prev => prev.map((isUploading, index) => (index === slotIndex ? true : isUploading)));
        try {
            const vehicleRef = editingVehicle?.id || "new";
            const optimizedFile = await compressImageForUpload(file);
            const safeName = optimizedFile.name.replace(/\s+/g, "_");
            const path = `vehicles/${vehicleRef}/${Date.now()}_${slotIndex + 1}_${safeName}`;
            const storageRef = ref(storage, path);
            const snapshot = await uploadBytes(storageRef, optimizedFile, { contentType: optimizedFile.type });
            const imageUrl = await getDownloadURL(snapshot.ref);

            updateImageSlot(slotIndex, imageUrl);
            toast({ title: "Yüklendi", description: `${slotIndex + 1}. fotoğraf başarıyla yüklendi.` });
        } catch (error) {
            console.error("Vehicle image upload error:", error);
            toast({ title: "Hata", description: "Fotoğraf yüklenemedi.", variant: "destructive" });
        } finally {
            event.target.value = "";
            setUploadingSlots(prev => prev.map((isUploading, index) => (index === slotIndex ? false : isUploading)));
        }
    };

    const handleRegistrationUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploadingRegistration(true);
        try {
            const vehicleRef = editingVehicle?.id || "new";
            const optimizedFile = await compressImageForUpload(file);
            const safeName = optimizedFile.name.replace(/\s+/g, "_");
            const path = `vehicles/${vehicleRef}/documents/ruhsat_${Date.now()}_${safeName}`;
            const storageRef = ref(storage, path);
            const snapshot = await uploadBytes(storageRef, optimizedFile, { contentType: optimizedFile.type });
            const photoUrl = await getDownloadURL(snapshot.ref);

            setFormData(prev => ({ ...prev, registration_photo_url: photoUrl }));
            toast({ title: "Yüklendi", description: "Ruhsat fotoğrafı başarıyla yüklendi." });
        } catch (error) {
            console.error("Registration upload error:", error);
            toast({ title: "Hata", description: "Ruhsat fotografi yuklenemedi.", variant: "destructive" });
        } finally {
            event.target.value = "";
            setUploadingRegistration(false);
        }
    };

    // Filter & Sort Logic
    const filteredVehicles = vehicles
        .filter(v => {
            const matchesSearch = v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                v.plate.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === "all" || v.status === statusFilter;
            return matchesSearch && matchesStatus;
        })
        .sort((a, b) => a.name.localeCompare(b.name, "tr"));

    // Araç başı masraf (vehicle_costs → vehicleId) ve ciro (payments → vehiclePlate)
    const { costByVehicleId, revenueByPlate } = useMemo(() => {
        const costByVehicleId: Record<string, number> = {};
        const revenueByPlate: Record<string, number> = {};
        vehicleCosts.forEach((c) => {
            const id = c.vehicleId || (c.vehiclePlate && c.vehiclePlate.toUpperCase());
            if (id) {
                costByVehicleId[id] = (costByVehicleId[id] || 0) + c.amount;
            }
        });
        payments.forEach((p) => {
            const plate = p.vehiclePlate;
            if (plate) revenueByPlate[plate] = (revenueByPlate[plate] || 0) + p.amount;
        });
        return { costByVehicleId, revenueByPlate };
    }, [vehicleCosts, payments]);

    const getVehicleFinance = (vehicle: Vehicle) => {
        const plateKey = (vehicle.plate || "").toUpperCase();
        const cost = costByVehicleId[vehicle.id] ?? costByVehicleId[plateKey] ?? 0;
        const revenue = revenueByPlate[plateKey] ?? 0;
        return { cost, revenue, net: revenue - cost };
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active': return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" /> Müsait</Badge>;
            case 'rented': return <Badge className="bg-blue-500 hover:bg-blue-600"><FileText className="w-3 h-3 mr-1" /> Kirada</Badge>;
            case 'maintenance': return <Badge className="bg-orange-500 hover:bg-orange-600"><AlertCircle className="w-3 h-3 mr-1" /> Bakimda</Badge>;
            default: return <Badge variant="secondary"><XCircle className="w-3 h-3 mr-1" /> Pasif</Badge>;
        }
    };

    const formImageSlots = normalizeImageSlots(formData.image_urls || (formData.image_url ? [formData.image_url] : []));

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">Araç Yönetimi</h2>
                    <p className="text-slate-500">Filo envanteri, araç başı masraf (Araç Carisi) ve ciro (Tahsilat) burada özetlenir. Detay için <Link to="/admin/vehicle-costs" className="text-primary hover:underline">Araç Carisi</Link> sayfasını kullanın.</p>
                </div>
                <div className="flex gap-2">
                    {vehicles.length === 0 && (
                        <Button variant="outline" onClick={loadDefaultVehicles} disabled={importing}>
                            <Download className="mr-2 h-4 w-4" />
                            {importing ? "Yükleniyor..." : "Varsayılanları Yükle"}
                        </Button>
                    )}
                    <Button variant="outline" onClick={() => exportVehiclesToExcel(vehicles)}>
                        <FileDown className="mr-2 h-4 w-4" />
                        Excel
                    </Button>
                    <Button variant="outline" onClick={() => exportVehiclesPDF(vehicles)}>
                        <FileDown className="mr-2 h-4 w-4" />
                        PDF
                    </Button>
                    <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="bg-primary hover:bg-blue-700">
                        <Plus className="mr-2 h-4 w-4" /> Yeni Araç Ekle
                    </Button>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-center bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Plaka veya model ara..."
                        className="pl-9 w-full bg-slate-50 border-slate-200"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[180px]">
                            <div className="flex items-center">
                                <Filter className="mr-2 h-4 w-4 text-slate-400" />
                                <SelectValue placeholder="Durum Filtrele" />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tümü</SelectItem>
                            <SelectItem value="active">Müsait</SelectItem>
                            <SelectItem value="rented">Kirada</SelectItem>
                            <SelectItem value="maintenance">Bakimda</SelectItem>
                            <SelectItem value="inactive">Pasif</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h3 className="text-sm font-semibold text-slate-900">Toplu Arac Girisi</h3>
                        <p className="text-xs text-slate-500">
                            Her satir bir arac olmalidir. Format: Ad;Plaka;Kategori;Gunluk;Aylik;Yakit;Vites;Yolcu;Durum;KM;Muayene;Sigorta;Kasko
                        </p>
                    </div>
                    <Button type="button" onClick={handleBulkCreate} disabled={bulkSaving}>
                        {bulkSaving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Ekleniyor...
                            </>
                        ) : (
                            <>
                                <Upload className="mr-2 h-4 w-4" />
                                Toplu Ekle
                            </>
                        )}
                    </Button>
                </div>
                <Textarea
                    value={bulkInput}
                    onChange={(event) => setBulkInput(event.target.value)}
                    className="min-h-[150px] font-mono text-xs"
                    placeholder={`Fiat Egea;34ABC001;Ekonomik;1750;38500;Dizel;Manuel;5;active;0;2026-12-31;2026-12-31;2026-12-31\nRenault Clio;34ABC002;Ekonomik;1650;36500;Benzin;Otomatik;5;active;0;2026-12-31;2026-12-31;2026-12-31`}
                />
            </div>

            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead className="font-semibold text-slate-700">Araç Bilgisi</TableHead>
                            <TableHead className="font-semibold text-slate-700">Plaka</TableHead>
                            <TableHead className="font-semibold text-slate-700">Kategori</TableHead>
                            <TableHead className="font-semibold text-slate-700">Durum</TableHead>
                            <TableHead className="font-semibold text-slate-700">Evrak Durumu</TableHead>
                            <TableHead className="font-semibold text-slate-700 text-right">Masraf / Ciro / Net</TableHead>
                            <TableHead className="font-semibold text-slate-700 text-right">Fiyat (Günlük / Aylık)</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={8} className="h-24 text-center">Yükleniyor...</TableCell>
                            </TableRow>
                        ) : filteredVehicles.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="h-24 text-center text-slate-500">
                                    <div className="flex flex-col items-center gap-2">
                                        <span>Araç bulunamadı.</span>
                                        <Button variant="link" onClick={loadDefaultVehicles} className="text-primary">
                                            Örnek araçları yüklemek için tıklayın
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredVehicles.map((vehicle) => (
                                <TableRow
                                    key={vehicle.id}
                                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                                    onClick={() => navigate(`/admin/fleet/${vehicle.id}`)}
                                >
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-16 rounded-md bg-slate-100 overflow-hidden flex-shrink-0">
                                                    {vehicle.image_url ? (
                                                        <img src={vehicle.image_url} alt={vehicle.name} className="h-full w-full object-cover" />
                                                    ) : (
                                                        <div className="h-full w-full flex items-center justify-center text-slate-400">
                                                            <Car className="h-5 w-5" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-slate-900">{vehicle.name}</span>
                                                    <span className="text-xs text-slate-500">{vehicle.transmission} - {vehicle.fuel}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-mono text-slate-600 font-medium">{vehicle.plate}</TableCell>
                                    <TableCell>{vehicle.category}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                                            {getStatusBadge(vehicle.status || "active")}
                                            <Select
                                                value={vehicle.status || "active"}
                                                onValueChange={(value: Vehicle["status"]) => void handleStatusChange(vehicle, value)}
                                                disabled={vehicle.id.startsWith("offline-")}
                                            >
                                                <SelectTrigger className="h-8 text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {VEHICLE_STATUS_OPTIONS.map((option) => (
                                                        <SelectItem key={option.value} value={option.value}>
                                                            {option.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            <Badge variant="secondary" className={getDocumentStatus(vehicle.insurance_end_date).className}>
                                                Sigorta: {getDocumentStatus(vehicle.insurance_end_date).label}
                                            </Badge>
                                            <Badge variant="secondary" className={getDocumentStatus(vehicle.casco_end_date).className}>
                                                Kasko: {getDocumentStatus(vehicle.casco_end_date).label}
                                            </Badge>
                                            <Badge variant="secondary" className={getDocumentStatus(vehicle.tuvturk_end_date).className}>
                                                TÜVTÜRK: {getDocumentStatus(vehicle.tuvturk_end_date).label}
                                            </Badge>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                        {costsAndPaymentsLoading ? (
                                            <span className="text-slate-400 text-xs">...</span>
                                        ) : (() => {
                                            const fin = getVehicleFinance(vehicle);
                                            return (
                                                <div className="flex flex-col gap-0.5 text-xs">
                                                    <div className="text-destructive font-medium" title="Araca harcanan (masraflar)">{formatMoney(fin.cost)}</div>
                                                    <div className="text-emerald-700 font-medium" title="Aracın getirdiği ciro (tahsilat)">{formatMoney(fin.revenue)}</div>
                                                    <div className={`font-semibold ${fin.net >= 0 ? "text-emerald-700" : "text-amber-700"}`} title="Net (ciro - masraf)">{formatMoney(fin.net)}</div>
                                                    <Link to="/admin/vehicle-costs" className="text-primary hover:underline mt-1 inline-flex items-center gap-0.5">
                                                        <Wallet className="w-3 h-3" /> Detay
                                                    </Link>
                                                </div>
                                            );
                                        })()}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex flex-col">
                                            <span className="font-medium text-slate-900">{vehicle.daily_price || "0"} ₺ <span className="text-xs text-slate-500 font-normal">/ gün</span></span>
                                            <span className="font-medium text-slate-900">{vehicle.price} ₺ <span className="text-xs text-slate-500 font-normal">/ ay</span></span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Islemler</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => openEdit(vehicle)}>
                                                    <Pencil className="mr-2 h-4 w-4" /> Düzenle
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(vehicle.id)}>
                                                    <Trash2 className="mr-2 h-4 w-4" /> Sil
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="w-[calc(100vw-1rem)] max-w-[960px] h-[90vh] flex flex-col p-0">
                    <DialogHeader className="border-b px-4 py-3 sm:px-5 sm:py-4 flex-shrink-0">
                        <DialogTitle>{editingVehicle ? "Araci Duzenle" : "Yeni Arac Ekle"}</DialogTitle>
                        <DialogDescription>
                            Tablet ve mobil kullanim icin buyuk alanli, kolay giris formu.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="flex-1 flex flex-col min-h-0">
                        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5 space-y-5 pb-20">
                            <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-4">
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-800">Temel Bilgiler</h4>
                                    <p className="text-xs text-slate-500">Aracin kimligi, segmenti ve kullanim durumu.</p>
                                </div>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label>Marka Model</Label>
                                        <Input className="h-11" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Orn: Fiat Egea" required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Plaka</Label>
                                        <Input className="h-11 uppercase" value={formData.plate} onChange={e => setFormData({ ...formData, plate: e.target.value })} placeholder="34 XX 000" required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Renk</Label>
                                        <Input className="h-11" value={formData.color || ""} onChange={e => setFormData({ ...formData, color: e.target.value })} placeholder="Siyah, Beyaz vb." />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Kategori</Label>
                                        <Select value={formData.category || ""} onValueChange={(val) => setFormData({ ...formData, category: val })}>
                                            <SelectTrigger className="h-11">
                                                <SelectValue placeholder="Kategori secin" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Ekonomik">Ekonomik</SelectItem>
                                                <SelectItem value="Orta Segment">Orta Segment</SelectItem>
                                                <SelectItem value="SUV">SUV</SelectItem>
                                                <SelectItem value="Lüks">Lüks</SelectItem>
                                                <SelectItem value="Genel">Genel</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Durum</Label>
                                        <Select value={formData.status} onValueChange={(val: Vehicle["status"]) => setFormData({ ...formData, status: val })}>
                                            <SelectTrigger className="h-11">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="active">Musait</SelectItem>
                                                <SelectItem value="rented">Kirada</SelectItem>
                                                <SelectItem value="maintenance">Bakimda</SelectItem>
                                                <SelectItem value="inactive">Pasif</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                    <div className="space-y-2">
                                        <Label>Yolcu</Label>
                                        <Input className="h-11" type="number" min={1} value={formData.passengers} onChange={e => setFormData({ ...formData, passengers: Number(e.target.value || 0) })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>KM</Label>
                                        <Input
                                            className="h-11"
                                            type="number"
                                            min={0}
                                            value={formData.km ?? 0}
                                            onChange={e => setFormData({ ...formData, km: Number(e.target.value || 0) })}
                                            placeholder="Orn: 125000"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Yakit</Label>
                                        <Select value={formData.fuel || ""} onValueChange={(val) => setFormData({ ...formData, fuel: val })}>
                                            <SelectTrigger className="h-11">
                                                <SelectValue placeholder="Yakit secin" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Benzin">Benzin</SelectItem>
                                                <SelectItem value="Dizel">Dizel</SelectItem>
                                                <SelectItem value="Dizel/Benzin">Dizel/Benzin</SelectItem>
                                                <SelectItem value="Hibrit">Hibrit</SelectItem>
                                                <SelectItem value="LPG">LPG</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Vites</Label>
                                        <Select value={formData.transmission || ""} onValueChange={(val) => setFormData({ ...formData, transmission: val })}>
                                            <SelectTrigger className="h-11">
                                                <SelectValue placeholder="Vites secin" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Manuel">Manuel</SelectItem>
                                                <SelectItem value="Otomatik">Otomatik</SelectItem>
                                                <SelectItem value="Manuel/Otomatik">Manuel/Otomatik</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </section>

                            <section className="rounded-xl border border-slate-200 p-4 space-y-4">
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-800">Fiyat ve Maliyet</h4>
                                    <p className="text-xs text-slate-500">Gunluk / aylik kira ve operasyon maliyetleri.</p>
                                </div>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label>Gunluk Kira Bedeli (₺)</Label>
                                        <Input className="h-11" inputMode="numeric" value={formData.daily_price} onChange={e => setFormData({ ...formData, daily_price: e.target.value })} placeholder="500" required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Aylik Kira Bedeli (₺)</Label>
                                        <Input className="h-11" inputMode="numeric" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} placeholder="15000" required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Alış / Satın Alma Fiyatı (₺)</Label>
                                        <Input
                                            className="h-11"
                                            type="number"
                                            min={0}
                                            value={formData.purchase_price || 0}
                                            onChange={e => setFormData({ ...formData, purchase_price: Number(e.target.value || 0) })}
                                            placeholder="Örn: 900000"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Aylik Sabit Gider (₺)</Label>
                                        <Input
                                            className="h-11"
                                            type="number"
                                            min={0}
                                            value={formData.monthly_fixed_cost || 0}
                                            onChange={e => setFormData({ ...formData, monthly_fixed_cost: Number(e.target.value || 0) })}
                                            placeholder="Orn: 12000"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Kiralama Basi Gider (₺)</Label>
                                        <Input
                                            className="h-11"
                                            type="number"
                                            min={0}
                                            value={formData.cost_per_rental || 0}
                                            onChange={e => setFormData({ ...formData, cost_per_rental: Number(e.target.value || 0) })}
                                            placeholder="Orn: 750"
                                        />
                                    </div>
                                </div>
                            </section>

                            <section className="rounded-xl border border-slate-200 p-4 space-y-4">
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-800">Evrak Takibi</h4>
                                    <p className="text-xs text-slate-500">Sigorta, kasko ve muayene tarihlerini buradan yonetin.</p>
                                </div>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label>Sigorta Firmasi</Label>
                                        <Input
                                            className="h-11"
                                            value={formData.insurance_company || ""}
                                            onChange={e => setFormData({ ...formData, insurance_company: e.target.value })}
                                            placeholder="Orn: Anadolu Sigorta"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Kasko Firmasi</Label>
                                        <Input
                                            className="h-11"
                                            value={formData.casco_company || ""}
                                            onChange={e => setFormData({ ...formData, casco_company: e.target.value })}
                                            placeholder="Orn: Ak Sigorta"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Sigorta Baslangic</Label>
                                        <Input
                                            className="h-11"
                                            type="date"
                                            value={formData.insurance_start_date || ""}
                                            onChange={e => setFormData({ ...formData, insurance_start_date: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Sigorta Bitis</Label>
                                        <Input
                                            className="h-11"
                                            type="date"
                                            value={formData.insurance_end_date || ""}
                                            onChange={e => setFormData({ ...formData, insurance_end_date: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Kasko Baslangic</Label>
                                        <Input
                                            className="h-11"
                                            type="date"
                                            value={formData.casco_start_date || ""}
                                            onChange={e => setFormData({ ...formData, casco_start_date: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Kasko Bitis</Label>
                                        <Input
                                            className="h-11"
                                            type="date"
                                            value={formData.casco_end_date || ""}
                                            onChange={e => setFormData({ ...formData, casco_end_date: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <Label>TUVTURK Muayene Bitis</Label>
                                        <Input
                                            className="h-11"
                                            type="date"
                                            value={formData.tuvturk_end_date || ""}
                                            onChange={e => setFormData({ ...formData, tuvturk_end_date: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </section>

                            <section className="rounded-xl border border-slate-200 p-4 space-y-3">
                                <div className="space-y-1">
                                    <Label>Arac Kapak Gorseli</Label>
                                    <p className="text-xs text-slate-500">
                                        Kapak gorseli, asagidaki fotograflardan ilk dolu slottan otomatik secilir.
                                    </p>
                                </div>
                                <Label>Arac Ruhsati Fotografi</Label>
                                <PhotoInput
                                    onChange={(e) => void handleRegistrationUpload(e)}
                                    disabled={uploadingRegistration}
                                    loading={uploadingRegistration}
                                    labelCamera="Fotograf cek"
                                    labelGallery="Galeriden sec"
                                    buttonClassName="h-10"
                                />
                                <div className="flex flex-wrap items-center gap-2">
                                    {formData.registration_photo_url ? (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setFormData({ ...formData, registration_photo_url: "" })}
                                            className="h-9 w-9 text-slate-500 hover:text-red-600"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    ) : null}
                                </div>

                                {formData.registration_photo_url ? (
                                    <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-2">
                                        <img
                                            src={formData.registration_photo_url}
                                            alt="Ruhsat fotografi"
                                            className="h-20 w-32 rounded object-cover border border-slate-200"
                                        />
                                        <p className="text-xs text-slate-500">Yuklenen ruhsat fotografi.</p>
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-500">Ruhsat fotografi henuz yuklenmedi.</p>
                                )}
                            </section>

                            <section className="rounded-xl border border-slate-200 p-4 space-y-3">
                                <Label>Arac Fotograflari (En Fazla 5)</Label>
                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                    {formImageSlots.map((imageUrl, index) => (
                                        <div key={`slot-${index}`} className="border border-slate-200 rounded-lg p-3 space-y-2 bg-white">
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="text-sm font-medium text-slate-700">
                                                    {index + 1}. Fotograf
                                                </span>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <PhotoInput
                                                        onChange={(e) => void handleImageUpload(index, e)}
                                                        disabled={uploadingSlots[index]}
                                                        loading={uploadingSlots[index]}
                                                        labelCamera="Fotograf cek"
                                                        labelGallery="Galeriden sec"
                                                    />
                                                    {imageUrl ? (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => updateImageSlot(index, "")}
                                                            className="h-9 w-9 text-slate-500 hover:text-red-600"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    ) : null}
                                                </div>
                                            </div>

                                            {imageUrl ? (
                                                <div className="flex items-center gap-3">
                                                    <img
                                                        src={imageUrl}
                                                        alt={`Arac fotograf ${index + 1}`}
                                                        className="h-20 w-32 rounded object-cover border border-slate-200"
                                                    />
                                                    <p className="text-xs text-slate-500">Bu slot dolu.</p>
                                                </div>
                                            ) : (
                                                <p className="text-xs text-slate-500">Bu slotta yuklu fotograf yok.</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>

                        <DialogFooter className="border-t bg-white px-4 py-3 sm:px-5 sm:py-4 sm:justify-end flex-shrink-0">
                            <Button type="button" className="w-full sm:w-auto" variant="outline" onClick={() => setDialogOpen(false)}>Iptal</Button>
                            <Button type="submit" className="w-full sm:w-auto">Kaydet</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

