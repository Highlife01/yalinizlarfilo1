import { useState, useRef, useEffect, Suspense } from "react";
import { useLocation, Link } from "react-router-dom";
import SignatureCanvas from "react-signature-canvas";
import {
    collection,
    getDocs,
    addDoc,
    updateDoc,
    doc,
    query,
    orderBy
} from "firebase/firestore";
import {
    ref,
    uploadBytes,
    getDownloadURL
} from "firebase/storage";
import { db, storage } from "@/integrations/firebase/client";
import {
    Camera,
    ImagePlus,
    Save,
    Car,
    RotateCcw,
    CheckCircle,
    AlertTriangle,
    Loader2,
    ChevronRight,
    User,
    Users,
    Gauge,
    Calendar,
    X,
    FileText,
    Printer
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhotoInput } from "@/components/ui/photo-input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { DamageControl3D, type DamagePoint3D } from "@/components/DamageControl3D";
import { generateRentalContractPDF } from "@/utils/rentalContractPdf";
import { compressImageForUpload } from "@/utils/imageCompression";
import { analyzeDocumentOcr } from "@/utils/ai";
import { auth } from "@/integrations/firebase/client";
import { Sparkles } from "lucide-react";

type OperationStep = 'select' | 'customer' | 'checklist' | 'photos' | 'damage' | 'sign' | 'complete';
type OperationType = 'delivery' | 'return';
type RentalPricingMode = "daily" | "monthly";

type BookingPayload = {
    id?: string;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
    customerTckn?: string;
    customerDriverLicenseNo?: string;
    customerAddress?: string;
    customerIdFrontUrl?: string;
    customerIdBackUrl?: string;
    customerLicenseFrontUrl?: string;
    customerLicenseBackUrl?: string;
    vehiclePlate?: string;
    startDate?: string;
    endDate?: string;
};

type OperationLocationState = {
    booking?: BookingPayload;
    type?: OperationType;
};

export type OperationVehicle = {
    id: string;
    plate: string;
    name?: string;
    brand?: string;
    model?: string;
    km?: number;
    fuel?: string;
    status?: string;
    insurance_end_date?: string;
    insurance_company?: string;
    casco_end_date?: string;
    casco_company?: string;
    vin?: string;
    chassisNo?: string;
    [key: string]: unknown;
};

export type OperationCustomer = {
    id?: string;
    name: string;
    phone: string;
    email: string;
    tckn: string;
    driverLicenseClass: string;
    driverLicenseNo?: string;
    address?: string;
    idFrontUrl?: string;
    idBackUrl?: string;
    licenseFrontUrl?: string;
    licenseBackUrl?: string;
    idSerialNo?: string;
    idIssuePlace?: string;
    idIssueDate?: string;
    invoiceType?: 'individual' | 'corporate';
    companyName?: string;
    taxOffice?: string;
    taxNumber?: string;
    mersisNo?: string;
    /** 2. şoför adı (müşteri 2. şoför istiyorsa) */
    secondDriverName?: string;
    /** 2. şoför ehliyet no */
    secondDriverLicenseNo?: string;
    /** 2. şoför ehliyet sınıfı */
    secondDriverLicenseClass?: string;
    /** 2. şoför ehliyet düzenlenme tarihi */
    secondDriverLicenseDate?: string;
};

const formatTemplateDate = (datePart: string): string => {
    if (!datePart) return new Date().toLocaleDateString("tr-TR");
    const parsed = new Date(`${datePart}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return datePart;
    return parsed.toLocaleDateString("tr-TR");
};

const getTemplateDateTime = (dateTimeLocal: string, fallbackTime: string) => {
    if (dateTimeLocal && dateTimeLocal.includes("T")) {
        const [datePart, timePart = fallbackTime] = dateTimeLocal.split("T");
        return {
            date: formatTemplateDate(datePart),
            time: timePart.slice(0, 5) || fallbackTime
        };
    }

    const now = new Date();
    return {
        date: now.toLocaleDateString("tr-TR"),
        time: now.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
    };
};

const normalizePhone = (value: string) => value.replace(/\D/g, "");

const normalizePlate = (value: string) => value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

const pickString = (...values: Array<unknown>) => {
    for (const value of values) {
        if (typeof value === "string" && value.trim()) return value.trim();
    }
    return "";
};

const getDefaultDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}T10:00`;
};

export const RentalOperations = () => {
    const { toast } = useToast();
    const location = useLocation();
    const kiralayanSignPad = useRef<SignatureCanvas | null>(null);
    const kiraciSignPad = useRef<SignatureCanvas | null>(null);
    const secondDriverSignPad = useRef<SignatureCanvas | null>(null);

    // State
    const [step, setStep] = useState<OperationStep>('select');
    const [operationType, setOperationType] = useState<OperationType>('delivery');
    const [selectedVehicle, setSelectedVehicle] = useState<OperationVehicle | null>(null);
    const [vehicles, setVehicles] = useState<OperationVehicle[]>([]);
    const [loading, setLoading] = useState(false);

    // Form Data
    const [km, setKm] = useState("");
    const [fuelLevel, setFuelLevel] = useState("empty");
    const [notes, setNotes] = useState("");
    const [estimatedDamageCost, setEstimatedDamageCost] = useState("");
    const [fuelRefillCost, setFuelRefillCost] = useState("");
    const [customTotalRate, setCustomTotalRate] = useState(""); // Allows manual override of total rent
    const [photos, setPhotos] = useState<{ url: string, angle: string }[]>([]);
    const [uploading, setUploading] = useState(false);
    const [damagePoints, setDamagePoints] = useState<DamagePoint3D[]>([]);

    // Müşteri (operasyon)
    const [customers, setCustomers] = useState<OperationCustomer[]>([]);
    const [customersLoaded, setCustomersLoaded] = useState(false);
    const [selectedOperationCustomer, setSelectedOperationCustomer] = useState<OperationCustomer | null>(null);
    const [isNewCustomer, setIsNewCustomer] = useState(false);
    const [customerForm, setCustomerForm] = useState<Partial<OperationCustomer>>({
        name: "", phone: "", email: "", tckn: "", driverLicenseClass: "B", driverLicenseNo: "", address: "",
        idSerialNo: "", idIssuePlace: "", idIssueDate: "",
        invoiceType: "individual", companyName: "", taxOffice: "", taxNumber: "", mersisNo: "",
        secondDriverName: "", secondDriverLicenseNo: "", secondDriverLicenseClass: "B", secondDriverLicenseDate: ""
    });
    const [idFrontFile, setIdFrontFile] = useState<File | null>(null);
    const [idBackFile, setIdBackFile] = useState<File | null>(null);
    const [licenseFrontFile, setLicenseFrontFile] = useState<File | null>(null);
    const [licenseBackFile, setLicenseBackFile] = useState<File | null>(null);
    const operationPhotoCameraInputRef = useRef<HTMLInputElement | null>(null);
    const operationPhotoGalleryInputRef = useRef<HTMLInputElement | null>(null);

    // Kiralama süresi (sözleşme)
    const [rentalStartDate, setRentalStartDate] = useState(getDefaultDateTime());
    const [rentalEndDate, setRentalEndDate] = useState(getDefaultDateTime());
    const [rentalPricingMode, setRentalPricingMode] = useState<RentalPricingMode>("daily");
    const [dailyRate, setDailyRate] = useState("");
    const [monthlyRate, setMonthlyRate] = useState("");
    const [rentalMonthCountSelected, setRentalMonthCountSelected] = useState("1");
    const [deposit, setDeposit] = useState("");
    const [kdvRate, setKdvRate] = useState("20");
    const [kdvStatus, setKdvStatus] = useState<"dahil" | "haric">("haric");
    const [contractPdfUrl, setContractPdfUrl] = useState<string | null>(null);
    const [customerSearchTerm, setCustomerSearchTerm] = useState("");
    const [sendingWa, setSendingWa] = useState(false);
    const [sourceBookingId, setSourceBookingId] = useState<string | null>(null);
    const reservationPrefillAppliedRef = useRef(false);

    useEffect(() => {
        fetchVehicles();
        fetchCustomers();
    }, []);

    useEffect(() => {
        if (reservationPrefillAppliedRef.current || step !== "select" || vehicles.length === 0 || !customersLoaded) return;

        const state = (location.state as OperationLocationState | null) || null;
        const booking = state?.booking;
        if (!booking) return;

        reservationPrefillAppliedRef.current = true;
        setSourceBookingId(booking.id || null);
        setOperationType(state?.type === "return" ? "return" : "delivery");

        const incomingPlate = normalizePlate(pickString(booking.vehiclePlate));
        const matchedVehicle = vehicles.find((vehicle) => normalizePlate(String(vehicle.plate || "")) === incomingPlate);
        if (matchedVehicle) {
            setSelectedVehicle(matchedVehicle);
            setStep("customer");
        } else {
            toast({
                title: "Araç seçimi gerekli",
                description: "Rezervasyondaki araç bulunamadı. Lütfen aracı listeden seçin.",
                variant: "destructive",
            });
        }

        const prefilledCustomer: Partial<OperationCustomer> = {
            name: pickString(booking.customerName),
            phone: pickString(booking.customerPhone),
            email: pickString(booking.customerEmail),
            tckn: pickString(booking.customerTckn),
            driverLicenseClass: "B",
            driverLicenseNo: pickString(booking.customerDriverLicenseNo),
            address: pickString(booking.customerAddress),
            idFrontUrl: pickString(booking.customerIdFrontUrl),
            idBackUrl: pickString(booking.customerIdBackUrl),
            licenseFrontUrl: pickString(booking.customerLicenseFrontUrl),
            licenseBackUrl: pickString(booking.customerLicenseBackUrl),
            invoiceType: "individual",
        };

        const prefilledPhone = normalizePhone(prefilledCustomer.phone || "");
        const existingCustomer = customers.find((customer) => {
            const customerPhone = normalizePhone(customer.phone || "");
            return (
                (prefilledPhone && customerPhone === prefilledPhone) ||
                (prefilledCustomer.email && customer.email?.toLowerCase() === prefilledCustomer.email.toLowerCase()) ||
                (prefilledCustomer.tckn && customer.tckn === prefilledCustomer.tckn) ||
                (prefilledCustomer.name && customer.name.toLowerCase() === prefilledCustomer.name.toLowerCase())
            );
        });

        if (existingCustomer) {
            const mergedCustomer: OperationCustomer = {
                ...existingCustomer,
                ...prefilledCustomer,
                name: prefilledCustomer.name || existingCustomer.name,
                phone: prefilledCustomer.phone || existingCustomer.phone,
                email: prefilledCustomer.email || existingCustomer.email,
                tckn: prefilledCustomer.tckn || existingCustomer.tckn,
                driverLicenseNo: prefilledCustomer.driverLicenseNo || existingCustomer.driverLicenseNo,
                address: prefilledCustomer.address || existingCustomer.address,
                idFrontUrl: prefilledCustomer.idFrontUrl || existingCustomer.idFrontUrl,
                idBackUrl: prefilledCustomer.idBackUrl || existingCustomer.idBackUrl,
                licenseFrontUrl: prefilledCustomer.licenseFrontUrl || existingCustomer.licenseFrontUrl,
                licenseBackUrl: prefilledCustomer.licenseBackUrl || existingCustomer.licenseBackUrl,
            };

            setIsNewCustomer(false);
            setSelectedOperationCustomer(mergedCustomer);
            return;
        }

        setIsNewCustomer(true);
        setSelectedOperationCustomer(null);
        setCustomerForm((prev) => ({
            ...prev,
            ...prefilledCustomer,
        }));
    }, [location.state, vehicles, customers, customersLoaded, step, toast]);

    const fetchCustomers = async () => {
        try {
            const q = query(collection(db, "customers"), orderBy("name"));
            const snapshot = await getDocs(q);
            setCustomers(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as OperationCustomer)));
        } catch (e) {
            console.error(e);
            setCustomers([]);
        } finally {
            setCustomersLoaded(true);
        }
    };

    const fetchVehicles = async () => {
        setLoading(true);
        try {
            // Sadece aktif, kirada veya bakımda olan araçları getir. (Pasifleri gizle)
            const q = query(
                collection(db, "vehicles")
            );
            const snapshot = await getDocs(q);
            // Firestore simple query limitation -> filter in memory for 'inactive'
            const activeVehicles = snapshot.docs
                .map(d => ({ id: d.id, ...d.data() } as OperationVehicle))
                .filter(v => v.status !== 'inactive');
            setVehicles(activeVehicles);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, angle: string) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        setUploading(true);
        try {
            const uploadedUrls: Array<{ url: string; angle: string }> = [];
            for (const file of files) {
                const optimizedFile = await compressImageForUpload(file);
                const path = `operations/${operationType}/${Date.now()}_${optimizedFile.name}`;
                const r = ref(storage, path);
                const snap = await uploadBytes(r, optimizedFile, { contentType: optimizedFile.type });
                const url = await getDownloadURL(snap.ref);
                uploadedUrls.push({ url, angle });
            }
            setPhotos((prev) => [...prev, ...uploadedUrls]);
        } catch {
            toast({ title: "Hata", description: "Fotoğraf yüklenemedi.", variant: "destructive" });
        } finally {
            e.target.value = "";
            setUploading(false);
        }
    };


    const handleOcrAnalysis = async (file: File) => {
        if (!file) return;
        setLoading(true);
        toast({ title: "Yapay Zeka", description: "Belge çözümleniyor...", icon: <Sparkles className="animate-pulse" /> });
        try {
            const result = await analyzeDocumentOcr(file);
            if (result) {
                setCustomerForm(f => ({
                    ...f,
                    name: result.name || f.name,
                    tckn: result.tckn || f.tckn,
                    driverLicenseNo: result.driverLicenseNo || f.driverLicenseNo,
                    driverLicenseClass: result.driverLicenseClass || f.driverLicenseClass,
                    idIssueDate: result.idIssueDate || f.idIssueDate,
                    idSerialNo: result.idSerialNo || f.idSerialNo,
                    address: result.address || f.address,
                }));
                toast({ title: "Başarılı", description: "Kimlik bilgileri otomatik dolduruldu." });
            }
        } catch (e) {
            const error = e as Error;
            toast({ title: "AI Hatası", description: error.message || "Belge okunamadı.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const triggerFileInput = (input: HTMLInputElement | null) => {
        if (!input) return;
        input.value = "";
        input.click();
    };

    const handleSaveNewCustomer = async () => {
        const normalizedName = (customerForm.name || "").trim() || "Misafir Musteri";
        const normalizedPhone = (customerForm.phone || "").trim() || "-";

        if (!(customerForm.name || "").trim() || !(customerForm.phone || "").trim()) {
            toast({
                title: "Bilgi",
                description: "Musteri formu eksik oldugu icin varsayilan ad/telefon ile kaydedildi.",
            });
        }

        setLoading(true);
        try {
            if ((customerForm.invoiceType || "individual") === "corporate") {
                if (!(customerForm.taxNumber || "").trim() || !(customerForm.mersisNo || "").trim()) {
                    toast({
                        title: "Eksik bilgi",
                        description: "Kurumsal musteri icin Vergi No ve MERSIS zorunludur.",
                        variant: "destructive"
                    });
                    setLoading(false);
                    return;
                }
            }

            const payload: Record<string, unknown> = {
                name: normalizedName,
                phone: normalizedPhone,
                email: (customerForm.email || "").trim(),
                tckn: (customerForm.tckn || "").trim(),
                driverLicenseClass: customerForm.driverLicenseClass || "B",
                driverLicenseNo: (customerForm.driverLicenseNo || "").trim(),
                address: (customerForm.address || "").trim(),
                idSerialNo: (customerForm.idSerialNo || "").trim(),
                idIssuePlace: (customerForm.idIssuePlace || "").trim(),
                idIssueDate: (customerForm.idIssueDate || "").trim(),
                invoiceType: customerForm.invoiceType || "individual",
                companyName: (customerForm.companyName || "").trim(),
                taxOffice: (customerForm.taxOffice || "").trim(),
                taxNumber: (customerForm.taxNumber || "").trim(),
                mersisNo: (customerForm.mersisNo || "").trim(),
                secondDriverName: (customerForm.secondDriverName || "").trim() || undefined,
                secondDriverLicenseNo: (customerForm.secondDriverLicenseNo || "").trim() || undefined,
                secondDriverLicenseClass: (customerForm.secondDriverLicenseClass || "B").trim() || undefined,
                secondDriverLicenseDate: (customerForm.secondDriverLicenseDate || "").trim() || undefined,
            };

            let cid = customerForm.id;
            if (cid) {
                await updateDoc(doc(db, "customers", cid), payload as Record<string, string | number | undefined>);
            } else {
                payload.totalRentals = 0;
                payload.lastRentalDate = "";
                payload.idFrontUrl = "";
                payload.idBackUrl = "";
                payload.licenseFrontUrl = "";
                payload.licenseBackUrl = "";
                const docRef = await addDoc(collection(db, "customers"), payload);
                cid = docRef.id;
            }

            const updates: Record<string, string> = {};
            if (idFrontFile) {
                const r = ref(storage, `customers/${cid}/id_front`);
                const optimized = await compressImageForUpload(idFrontFile);
                await uploadBytes(r, optimized, { contentType: optimized.type });
                updates.idFrontUrl = await getDownloadURL(r);
            }
            if (idBackFile) {
                const r = ref(storage, `customers/${cid}/id_back`);
                const optimized = await compressImageForUpload(idBackFile);
                await uploadBytes(r, optimized, { contentType: optimized.type });
                updates.idBackUrl = await getDownloadURL(r);
            }
            if (licenseFrontFile) {
                const r = ref(storage, `customers/${cid}/license_front`);
                const optimized = await compressImageForUpload(licenseFrontFile);
                await uploadBytes(r, optimized, { contentType: optimized.type });
                updates.licenseFrontUrl = await getDownloadURL(r);
            }
            if (licenseBackFile) {
                const r = ref(storage, `customers/${cid}/license_back`);
                const optimized = await compressImageForUpload(licenseBackFile);
                await uploadBytes(r, optimized, { contentType: optimized.type });
                updates.licenseBackUrl = await getDownloadURL(r);
            }
            if (Object.keys(updates).length > 0) await updateDoc(doc(db, "customers", cid), updates);

            const mergedCustomerUrls = {
                idFrontUrl: updates.idFrontUrl || customerForm.idFrontUrl || "",
                idBackUrl: updates.idBackUrl || customerForm.idBackUrl || "",
                licenseFrontUrl: updates.licenseFrontUrl || customerForm.licenseFrontUrl || "",
                licenseBackUrl: updates.licenseBackUrl || customerForm.licenseBackUrl || "",
            };

            const newCustomer: OperationCustomer = {
                id: cid,
                name: payload.name as string,
                phone: payload.phone as string,
                email: (payload.email as string) || "",
                tckn: (payload.tckn as string) || "",
                driverLicenseClass: (payload.driverLicenseClass as string) || "B",
                driverLicenseNo: (payload.driverLicenseNo as string) || "",
                address: (payload.address as string) || "",
                idSerialNo: (payload.idSerialNo as string) || "",
                idIssuePlace: (payload.idIssuePlace as string) || "",
                idIssueDate: (payload.idIssueDate as string) || "",
                invoiceType: (payload.invoiceType as "individual" | "corporate") || "individual",
                companyName: (payload.companyName as string) || "",
                taxOffice: (payload.taxOffice as string) || "",
                taxNumber: (payload.taxNumber as string) || "",
                mersisNo: (payload.mersisNo as string) || "",
                secondDriverName: (payload.secondDriverName as string)?.trim() || undefined,
                secondDriverLicenseNo: (payload.secondDriverLicenseNo as string)?.trim() || undefined,
                secondDriverLicenseClass: (payload.secondDriverLicenseClass as string) || "B",
                secondDriverLicenseDate: (payload.secondDriverLicenseDate as string)?.trim() || undefined,
                ...mergedCustomerUrls,
            };
            setSelectedOperationCustomer(newCustomer);
            setIsNewCustomer(false);
            setCustomerForm({ name: "", phone: "", email: "", tckn: "", driverLicenseClass: "B", driverLicenseNo: "", address: "", idSerialNo: "", idIssuePlace: "", idIssueDate: "", invoiceType: "individual", companyName: "", taxOffice: "", taxNumber: "", mersisNo: "", secondDriverName: "", secondDriverLicenseNo: "", secondDriverLicenseClass: "B", secondDriverLicenseDate: "" });
            setIdFrontFile(null); setIdBackFile(null); setLicenseFrontFile(null); setLicenseBackFile(null);
            fetchCustomers();
            toast({ title: "Başarılı", description: "Müşteri eklendi. Devam edin." });
        } catch (e) {
            console.error(e);
            toast({ title: "Hata", description: "Müşteri kaydedilemedi.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const sanitizeNumber = (val: string | number): number => {
        if (typeof val === 'number') return isNaN(val) ? 0 : val;
        // Remove dots (used as thousands separator in TR) and replace comma with dot
        const sanitized = val.replace(/\./g, "").replace(",", ".");
        const result = Number(sanitized);
        return isNaN(result) ? 0 : result;
    };

    const getRentalDayCount = () => {
        if (!rentalStartDate || !rentalEndDate) return 1;
        const start = new Date(rentalStartDate).getTime();
        const end = new Date(rentalEndDate).getTime();
        if (Number.isNaN(start) || Number.isNaN(end)) return 1;
        // Use round instead of ceil to give some grace for unaligned hours
        const diff = Math.round((end - start) / 86400000);
        return Math.max(1, diff);
    };

    const getEstimatedRentalTotal = () => {
        if (rentalPricingMode === "monthly") {
            const months = parseInt(rentalMonthCountSelected || "1", 10);
            return sanitizeNumber(monthlyRate) * months;
        }
        const exactDays = getRentalDayCount();
        return sanitizeNumber(dailyRate) * exactDays;
    };

    const getFinalRentalTotal = () => {
        if (customTotalRate.trim() !== "") {
            return sanitizeNumber(customTotalRate);
        }
        return getEstimatedRentalTotal();
    };

    const buildFallbackCustomer = (): OperationCustomer => ({
        id: "",
        name: (customerForm.name || "").trim() || "Misafir Musteri",
        phone: (customerForm.phone || "").trim() || "-",
        email: (customerForm.email || "").trim(),
        tckn: (customerForm.tckn || "").trim(),
        driverLicenseClass: customerForm.driverLicenseClass || "B",
        driverLicenseNo: (customerForm.driverLicenseNo || "").trim(),
        address: (customerForm.address || "").trim(),
        idSerialNo: (customerForm.idSerialNo || "").trim(),
        idIssuePlace: (customerForm.idIssuePlace || "").trim(),
        idIssueDate: (customerForm.idIssueDate || "").trim(),
        idFrontUrl: customerForm.idFrontUrl || "",
        idBackUrl: customerForm.idBackUrl || "",
        licenseFrontUrl: customerForm.licenseFrontUrl || "",
        licenseBackUrl: customerForm.licenseBackUrl || "",
        invoiceType: customerForm.invoiceType || "individual",
        companyName: (customerForm.companyName || "").trim(),
        taxOffice: (customerForm.taxOffice || "").trim(),
        taxNumber: (customerForm.taxNumber || "").trim(),
        mersisNo: (customerForm.mersisNo || "").trim(),
        secondDriverName: (customerForm.secondDriverName || "").trim() || undefined,
        secondDriverLicenseNo: (customerForm.secondDriverLicenseNo || "").trim() || undefined,
        secondDriverLicenseClass: (customerForm.secondDriverLicenseClass || "B").trim() || undefined,
        secondDriverLicenseDate: (customerForm.secondDriverLicenseDate || "").trim() || undefined,
    });

    const handleContinueFromCustomer = () => {
        if (!selectedOperationCustomer) {
            setSelectedOperationCustomer(buildFallbackCustomer());
            toast({
                title: "Bilgi",
                description: "Musteri bilgileri eksik oldugu icin misafir musteri ile devam edildi.",
            });
        }
        setStep("checklist");
    };

    const handleComplete = async () => {
        if (!selectedVehicle) {
            toast({ title: "Eksik", description: "Araç seçilmiş olmalıdır.", variant: "destructive" });
            return;
        }

        const effectiveCustomer = selectedOperationCustomer || buildFallbackCustomer();

        const kmValue = sanitizeNumber(km);
        const damageCostValue = sanitizeNumber(estimatedDamageCost);
        const rentalDayCount = getRentalDayCount();
        const rentalMonthCount = Math.max(1, Math.round(rentalDayCount / 30));
        const rentalBaseAmount = getFinalRentalTotal();

        setLoading(true);
        // Give React a chance to flush the loading spinner before heavy work
        await new Promise((r) => setTimeout(r, 50));
        try {
            console.log("Starting operation save...");
            const getPadSignature = (pad: SignatureCanvas | null) => {
                try {
                    if (!pad || pad.isEmpty()) return "";
                    return pad.getTrimmedCanvas().toDataURL("image/png");
                } catch (sigErr) {
                    console.warn("Signature extraction failed:", sigErr);
                    return "";
                }
            };
            const signatures = {
                kiralayan: getPadSignature(kiralayanSignPad.current),
                kiraci: getPadSignature(kiraciSignPad.current),
                ikinciSofor: getPadSignature(secondDriverSignPad.current),
            };

            const isCorporateCustomer = (effectiveCustomer.invoiceType || "individual") === "corporate";

            const customerSnapshot = {
                customerId: effectiveCustomer.id,
                customerName: effectiveCustomer.name,
                customerPhone: effectiveCustomer.phone,
                customerEmail: effectiveCustomer.email || "",
                customerTckn: isCorporateCustomer ? "" : (effectiveCustomer.tckn || ""),
                customerDriverLicenseClass: effectiveCustomer.driverLicenseClass || "B",
                customerDriverLicenseNo: effectiveCustomer.driverLicenseNo || "",
                customerAddress: effectiveCustomer.address || "",
                customerIdFrontUrl: effectiveCustomer.idFrontUrl || "",
                customerIdBackUrl: effectiveCustomer.idBackUrl || "",
                customerLicenseFrontUrl: effectiveCustomer.licenseFrontUrl || "",
                customerLicenseBackUrl: effectiveCustomer.licenseBackUrl || "",
                customerInvoiceType: effectiveCustomer.invoiceType || "individual",
                customerCompanyName: effectiveCustomer.companyName || "",
                customerTaxOffice: effectiveCustomer.taxOffice || "",
                customerTaxNumber: effectiveCustomer.taxNumber || "",
                customerMersisNo: effectiveCustomer.mersisNo || "",
                customerSecondDriverName: (effectiveCustomer.secondDriverName || "").trim() || "",
                customerSecondDriverLicenseNo: (effectiveCustomer.secondDriverLicenseNo || "").trim() || "",
                customerSecondDriverLicenseClass: (effectiveCustomer.secondDriverLicenseClass || "B").trim() || "",
                customerSecondDriverLicenseDate: (effectiveCustomer.secondDriverLicenseDate || "").trim() || "",
            };

            // Upload signatures to Storage to avoid bloating the Firestore document
            const uploadSignatureToStorage = async (base64: string, label: string): Promise<string> => {
                if (!base64) return "";
                try {
                    const parts = base64.split(",");
                    const raw = parts[1] || "";
                    if (!raw) return "";
                    const byteString = atob(raw);
                    const mimeString = parts[0]?.split(":")[1]?.split(";")[0] || "image/png";
                    const ab = new ArrayBuffer(byteString.length);
                    const ia = new Uint8Array(ab);
                    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
                    const blob = new Blob([ab], { type: mimeString });
                    const ts = Date.now();
                    const sigRef = ref(storage, `operations/signatures/${ts}_${label}.png`);
                    await uploadBytes(sigRef, blob, { contentType: "image/png" });
                    return getDownloadURL(sigRef);
                } catch (uploadErr) {
                    console.warn(`Signature upload failed for ${label}:`, uploadErr);
                    return "";
                }
            };

            console.log("Uploading signatures...");
            const [sigUrlKiralayan, sigUrlKiraci, sigUrlIkinciSofor] = await Promise.all([
                uploadSignatureToStorage(signatures.kiralayan, "kiralayan"),
                uploadSignatureToStorage(signatures.kiraci, "kiraci"),
                uploadSignatureToStorage(signatures.ikinciSofor, "ikinciSofor"),
            ]);
            console.log("Signatures uploaded.");

            const operationData = {
                type: operationType,
                vehicleId: selectedVehicle.id,
                vehiclePlate: selectedVehicle.plate,
                date: new Date().toISOString(),
                km: kmValue,
                fuel: fuelLevel,
                notes: notes || "",
                estimatedDamageCost: damageCostValue,
                fuelRefillCost: sanitizeNumber(fuelRefillCost),
                photos: photos || [],
                damagePoints: damagePoints || [],
                signatureUrls: {
                    kiralayan: sigUrlKiralayan,
                    kiraci: sigUrlKiraci,
                    ikinciSofor: sigUrlIkinciSofor,
                },
                kdvRate: Number(kdvRate),
                kdvStatus,
                rentalPricingMode,
                dailyRate: sanitizeNumber(dailyRate),
                monthlyRate: sanitizeNumber(monthlyRate),
                rentalDayCount,
                rentalMonthCount,
                bookingTotalPrice: rentalBaseAmount,
                invoiceAmount: rentalBaseAmount,
                invoiceApprovalStatus: "pending",
                ...customerSnapshot,
                contractPdfUrl: "",
                staffId: auth.currentUser?.uid || "system",
                staffEmail: auth.currentUser?.email || "unknown",
            };

            console.log("Saving operation to Firestore...");
            const docRef = await addDoc(collection(db, "vehicle_operations"), operationData);
            const opId = docRef.id;
            console.log("Operation saved with ID:", opId);

            console.log("Generating contract PDF...");
            const startDateTime = getTemplateDateTime(rentalStartDate, "10:00");
            const endDateTime = getTemplateDateTime(rentalEndDate, "10:00");
            const startStr = `${startDateTime.date} ${startDateTime.time}`;
            const endStr = `${endDateTime.date} ${endDateTime.time}`;
            const imzaTarih = startStr;
            const docPdf = await generateRentalContractPDF({
                kiraci: {
                    adSoyad: isCorporateCustomer
                        ? (effectiveCustomer.companyName || effectiveCustomer.name)
                        : effectiveCustomer.name,
                    tcNo: isCorporateCustomer ? "" : (effectiveCustomer.tckn || "-"),
                    vergiNo: isCorporateCustomer ? (effectiveCustomer.taxNumber || "-") : "",
                    kurumsal: isCorporateCustomer,
                    ehliyetNo: effectiveCustomer.driverLicenseNo || "-",
                    ehliyetTarihi: effectiveCustomer.idIssueDate || "-",
                    adres: effectiveCustomer.address || "-",
                    telefon: effectiveCustomer.phone,
                    email: effectiveCustomer.email || "-"
                },
                arac: {
                    plaka: selectedVehicle.plate,
                    markaModel: selectedVehicle.name || "-",
                    sasiNo: String(selectedVehicle.vin || selectedVehicle.chassisNo || "-"),
                    kilometre: String(kmValue ? kmValue : selectedVehicle.km || "0"),
                    sigortaBitis: String(selectedVehicle.insurance_end_date || "-"),
                    sigortaFirma: String(selectedVehicle.insurance_company || "-"),
                    kaskoBitis: String(selectedVehicle.casco_end_date || "-"),
                    kaskoFirma: String(selectedVehicle.casco_company || "-")
                },
                kiralama: {
                    baslangicTarih: startStr,
                    bitisTarih: endStr,
                    kiraTuru: rentalPricingMode === "monthly" ? "aylik" : "gunluk",
                    kdvDurumu: kdvStatus,
                    gunlukKira: rentalPricingMode === "monthly"
                        ? String(sanitizeNumber(monthlyRate))
                        : dailyRate || "0",
                    toplamKira: String(rentalBaseAmount),
                    teminat: deposit || "0"
                },
                imzalar: {
                    ...signatures,
                    ikinciSoforAdi: (effectiveCustomer.secondDriverName || "").trim() || undefined,
                    ikinciSoforEhliyetNo: (effectiveCustomer.secondDriverLicenseNo || "").trim() || undefined,
                    ikinciSoforEhliyetSinif: (effectiveCustomer.secondDriverLicenseClass || "").trim() || undefined,
                    ikinciSoforEhliyetTarih: (effectiveCustomer.secondDriverLicenseDate || "").trim() || undefined,
                },
                imzaTarih
            });
            console.log("Contract PDF generated.");
            const pdfBlob = docPdf.output("blob");
            const pdfRef = ref(storage, `operations/${opId}/sozlesme.pdf`);
            console.log("Uploading PDF to Storage...");
            await uploadBytes(pdfRef, pdfBlob, { contentType: "application/pdf" });
            const contractUrl = await getDownloadURL(pdfRef);
            console.log("PDF uploaded. Updating operation doc with contractUrl...");
            await updateDoc(doc(db, "vehicle_operations", opId), { contractPdfUrl: contractUrl });
            console.log("Operation doc updated with contractUrl.");

            let finalStatus = 'active';
            if (operationType === 'delivery') {
                finalStatus = 'rented';
            } else if (operationType === 'return' && Number(damageCostValue) > 0) {
                finalStatus = 'maintenance';
                try {
                    await addDoc(collection(db, "customer_debts"), {
                        customerId: effectiveCustomer.id,
                        customerName: effectiveCustomer.name,
                        type: "borc",
                        category: "hasar",
                        amount: Number(damageCostValue),
                        description: `${selectedVehicle.plate} plakalı araç iadesindeki onarım bedeli.`,
                        date: new Date().toISOString(),
                        operationId: opId,
                        vehiclePlate: selectedVehicle.plate,
                        status: "unpaid",
                        createdAt: new Date().toISOString(),
                    });
                } catch (e) {
                    console.error("Cari kayıt hatası:", e);
                }
            }

            // Extra KM billing logic format for rentals over 3000 KM difference
            if (operationType === 'return' && kmValue > 0 && selectedVehicle.km) {
                const diff = kmValue - Number(selectedVehicle.km);
                if (diff > 3000) {
                    const extraKm = diff - 3000;
                    const targetCharge = extraKm * 2; // e.g. 2 TL per km
                    try {
                        await addDoc(collection(db, "customer_debts"), {
                            customerId: effectiveCustomer.id,
                            customerName: effectiveCustomer.name,
                            type: "borc",
                            category: "km_asim",
                            amount: targetCharge,
                            description: `${selectedVehicle.plate} plakalı araç iadesindeki KM aşım bedeli (${extraKm} km fazla).`,
                            date: new Date().toISOString(),
                            operationId: opId,
                            vehiclePlate: selectedVehicle.plate,
                            status: "unpaid",
                            createdAt: new Date().toISOString(),
                        });
                        toast({ title: "KM Aşım Faturası", description: `3000 KM sınırı aşıldığı için ${targetCharge} TL borç kaydı açıldı.` });
                    } catch (e) {
                        console.error("Cari kayıt hatası:", e);
                    }
                }
            }

            console.log("Updating vehicle status to:", finalStatus);
            await updateDoc(doc(db, "vehicles", selectedVehicle.id), {
                status: finalStatus,
                km: kmValue > 0 ? kmValue : Number(selectedVehicle.km || 0),
                fuel: fuelLevel
            });
            console.log("Vehicle updated.");

            if (sourceBookingId) {
                console.log("Updating booking:", sourceBookingId);
                const bookingUpdate: Record<string, unknown> = {
                    updatedAt: new Date().toISOString(),
                    customerId: effectiveCustomer.id || "",
                };
                if (operationType === "delivery") {
                    bookingUpdate.status = "active";
                    bookingUpdate.deliveryOperationId = opId;
                } else {
                    bookingUpdate.status = "completed";
                    bookingUpdate.returnOperationId = opId;
                }
                await updateDoc(doc(db, "bookings", sourceBookingId), bookingUpdate as Record<string, string>);
                console.log("Booking updated.");
            }

            setContractPdfUrl(contractUrl);

            // Mevcut müşteri kaydını güncelle (eksik alanları tamamla)
            if (effectiveCustomer.id) {
                try {
                    const customerUpdatePayload: Record<string, unknown> = {
                        name: effectiveCustomer.name,
                        phone: effectiveCustomer.phone,
                        email: effectiveCustomer.email || "",
                        tckn: isCorporateCustomer ? "" : (effectiveCustomer.tckn || ""),
                        driverLicenseClass: effectiveCustomer.driverLicenseClass || "B",
                        driverLicenseNo: effectiveCustomer.driverLicenseNo || "",
                        address: effectiveCustomer.address || "",
                        idSerialNo: effectiveCustomer.idSerialNo || "",
                        idIssuePlace: effectiveCustomer.idIssuePlace || "",
                        idIssueDate: effectiveCustomer.idIssueDate || "",
                        invoiceType: effectiveCustomer.invoiceType || "individual",
                        companyName: effectiveCustomer.companyName || "",
                        taxOffice: effectiveCustomer.taxOffice || "",
                        taxNumber: effectiveCustomer.taxNumber || "",
                        mersisNo: effectiveCustomer.mersisNo || "",
                        lastRentalDate: new Date().toISOString(),
                    };
                    // Fotoğraf URL'leri varsa güncelle
                    if (effectiveCustomer.idFrontUrl) customerUpdatePayload.idFrontUrl = effectiveCustomer.idFrontUrl;
                    if (effectiveCustomer.idBackUrl) customerUpdatePayload.idBackUrl = effectiveCustomer.idBackUrl;
                    if (effectiveCustomer.licenseFrontUrl) customerUpdatePayload.licenseFrontUrl = effectiveCustomer.licenseFrontUrl;
                    if (effectiveCustomer.licenseBackUrl) customerUpdatePayload.licenseBackUrl = effectiveCustomer.licenseBackUrl;
                    // 2. sürücü
                    if ((effectiveCustomer.secondDriverName || "").trim()) {
                        customerUpdatePayload.secondDriverName = effectiveCustomer.secondDriverName;
                        customerUpdatePayload.secondDriverLicenseNo = effectiveCustomer.secondDriverLicenseNo || "";
                        customerUpdatePayload.secondDriverLicenseClass = effectiveCustomer.secondDriverLicenseClass || "B";
                        customerUpdatePayload.secondDriverLicenseDate = effectiveCustomer.secondDriverLicenseDate || "";
                    }
                    await updateDoc(doc(db, "customers", effectiveCustomer.id), customerUpdatePayload as Record<string, string>);
                } catch (custErr) {
                    console.warn("Müşteri kaydı güncellenemedi (kritik değil):", custErr);
                }
            }

            setStep('complete');
            toast({ title: "Başarılı", description: "İşlem kaydedildi. Sözleşme oluşturuldu." });
        } catch (error: unknown) {
            console.error("Operation Error Details:", error);
            const errorMsg = (error && typeof error === "object" && "message" in error ? String((error as { message?: unknown }).message) : null) || "Bilinmeyen hata";
            alert(`İşlem hatası: ${errorMsg}`);
            toast({
                title: "Hata",
                description: `Kayıt oluşturulamadı: ${errorMsg}`,
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    if (step === 'complete') {
        const handleSendWA = async () => {
            if (!selectedOperationCustomer || !selectedVehicle) return;
            setSendingWa(true);
            try {
                if (operationType === 'delivery') {
                    const startDateTime = getTemplateDateTime(rentalStartDate, "10:00");
                    await sendRezervasyonOnay({
                        telefon: selectedOperationCustomer.phone,
                        musteriAd: selectedOperationCustomer.name,
                        no: Math.floor(Math.random() * 10000).toString(),
                        marka: selectedVehicle.brand || "",
                        model: selectedVehicle.model || selectedVehicle.name || "",
                        plaka: selectedVehicle.plate,
                        teslimTarihi: startDateTime.date,
                        teslimSaati: startDateTime.time,
                        teslimYeri: "Adana Merkez"
                    });
                    toast({ title: "WhatsApp İletildi", description: "Rezervasyon WhatsApp üzerinden müşteriye gönderildi." });
                } else {
                    const endDateTime = getTemplateDateTime(rentalEndDate, "18:00");
                    await sendIadeUyari({
                        telefon: selectedOperationCustomer.phone,
                        musteriAd: selectedOperationCustomer.name,
                        marka: selectedVehicle.brand || "",
                        model: selectedVehicle.model || selectedVehicle.name || "",
                        plaka: selectedVehicle.plate,
                        iadeSaati: endDateTime.time,
                        iadeAdresi: "Adana Merkez"
                    });
                    toast({ title: "WhatsApp İletildi", description: "İade uyarısı WhatsApp üzerinden müşteriye gönderildi." });
                }
            } catch (error: unknown) {
                const msg =
                    error && typeof error === "object" && "message" in error
                        ? String((error as { message?: string }).message)
                        : "Mesaj gönderilirken hata oluştu.";
                const desc = getWhatsAppErrorDescription(msg);
                toast({
                    title: "WhatsApp Hatası",
                    description: desc,
                    variant: "destructive",
                    action: (
                        <ToastAction asChild altText="Ayarlara git">
                            <Link to="/admin/settings?tab=api">Ayarlara git</Link>
                        </ToastAction>
                    ),
                });
            } finally {
                setSendingWa(false);
            }
        };

        const handlePrintContract = () => {
            if (!contractPdfUrl) return;
            const w = window.open(contractPdfUrl, "_blank", "noopener,noreferrer");
            if (w) {
                w.onload = () => {
                    try {
                        w.print();
                    } catch {
                        w.focus();
                    }
                };
                setTimeout(() => {
                    try {
                        w.print();
                    } catch {
                        w.focus();
                    }
                }, 800);
            }
        };

        return (
            <div className="flex flex-col w-full max-w-4xl mx-auto gap-6 px-4 pb-8">
                <div className="flex flex-col items-center text-center space-y-4">
                    <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-12 h-12 text-green-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">İşlem Tamamlandı!</h2>
                        <p className="text-slate-500">Araç durum raporu ve {operationType === 'delivery' ? 'sözleşme sisteme kaydedildi.' : 'iade teslim tutanağı kaydedildi.'}</p>
                    </div>
                </div>

                {contractPdfUrl && (
                    <Card className="overflow-hidden">
                        <div className="p-3 border-b bg-slate-50 flex flex-wrap items-center justify-between gap-2">
                            <span className="font-medium text-slate-800">Sözleşme</span>
                            <div className="flex flex-wrap gap-2">
                                <Button variant="outline" size="sm" className="gap-2" asChild>
                                    <a href={contractPdfUrl} target="_blank" rel="noopener noreferrer">
                                        <FileText className="w-4 h-4" /> Tam ekranda aç
                                    </a>
                                </Button>
                                <Button variant="outline" size="sm" className="gap-2" onClick={handlePrintContract}>
                                    <Printer className="w-4 h-4" /> Yazdır
                                </Button>
                                <Button variant="outline" size="sm" className="gap-2" asChild>
                                    <a href={contractPdfUrl} target="_blank" rel="noopener noreferrer" download>
                                        <FileText className="w-4 h-4" /> İndir
                                    </a>
                                </Button>
                            </div>
                        </div>
                        <div className="bg-slate-100 relative" style={{ minHeight: "70vh" }}>
                            <iframe
                                title="Sözleşme PDF"
                                src={`https://docs.google.com/viewer?url=${encodeURIComponent(contractPdfUrl)}&embedded=true`}
                                className="w-full border-0"
                                style={{ height: "75vh", minHeight: "500px" }}
                            />
                        </div>
                    </Card>
                )}

                <div className="flex flex-wrap gap-4 justify-center">
                    <Button
                        variant="default"
                        className="bg-[#25D366] hover:bg-[#1DA851] text-white gap-2"
                        onClick={handleSendWA}
                        disabled={sendingWa}
                    >
                        {sendingWa ? <Loader2 className="w-4 h-4 animate-spin" /> :
                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" /><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.127 1.532 5.862L.057 23.929l6.235-1.635A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.797 9.797 0 01-4.99-1.366l-.356-.213-3.702.97 1.003-3.593-.235-.372A9.818 9.818 0 012.182 12C2.182 6.578 6.578 2.182 12 2.182c5.423 0 9.818 4.396 9.818 9.818 0 5.423-4.395 9.818-9.818 9.818z" />
                            </svg>
                        }
                        {operationType === 'delivery' ? 'Rezervasyon Onayı Gönder (WA)' : 'İade Uyarısı Gönder (WA)'}
                    </Button>
                </div>
                <Button variant="outline" className="w-full" onClick={() => {
                    setStep('select');
                    setSourceBookingId(null);
                    setPhotos([]);
                    setDamagePoints([]);
                    setKm("");
                    setFuelLevel("empty");
                    setNotes("");
                    setEstimatedDamageCost("");
                    setFuelRefillCost("");
                    setSelectedOperationCustomer(null);
                    setContractPdfUrl(null);
                    setRentalStartDate(getDefaultDateTime());
                    setRentalEndDate(getDefaultDateTime());
                    setRentalPricingMode("daily");
                    setDailyRate("");
                    setMonthlyRate("");
                    setRentalMonthCountSelected("1");
                    setCustomTotalRate("");
                    setKdvRate("20");
                    setKdvStatus("haric");
                    setDeposit("");
                    kiralayanSignPad.current?.clear();
                    kiraciSignPad.current?.clear();
                    secondDriverSignPad.current?.clear();
                    reservationPrefillAppliedRef.current = false;
                }}>Yeni İşlem Başlat</Button>
            </div>
        );
    }

    return (
        <div className="container max-w-2xl mx-auto py-6 space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold font-sans">Operasyon</h2>
                <Badge variant="outline" className="text-lg py-1 px-3">
                    {operationType === 'delivery' ? 'Teslim Et' : 'Teslim Al'}
                </Badge>
            </div>

            {/* Step Progress */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {['select', 'customer', 'checklist', 'photos', 'damage', 'sign'].map((s, i) => (
                    <div
                        key={s}
                        className={`h-2 flex-1 rounded-full ${['select', 'customer', 'checklist', 'photos', 'damage', 'sign'].indexOf(step) >= i ? 'bg-primary' : 'bg-slate-200'}`}
                    />
                ))}
            </div>

            {step === 'select' && (
                <div className="grid gap-6">
                    <div className="grid grid-cols-2 gap-4">
                        <Button
                            variant={operationType === 'delivery' ? 'default' : 'outline'}
                            className="h-24 text-lg flex flex-col gap-2"
                            onClick={() => setOperationType('delivery')}
                        >
                            <Car className="w-8 h-8" />
                            Teslim Et
                        </Button>
                        <Button
                            variant={operationType === 'return' ? 'default' : 'outline'}
                            className="h-24 text-lg flex flex-col gap-2"
                            onClick={() => setOperationType('return')}
                        >
                            <RotateCcw className="w-8 h-8" />
                            Geri Al
                        </Button>
                    </div>

                    <div className="space-y-4">
                        <Label>Araç Seçin</Label>
                        <Input placeholder="Plaka ara..." onChange={(_e) => {
                            // Simple local filter for demo
                        }} />
                        <div className="grid gap-3">
                            {vehicles.map(v => (
                                <Card
                                    key={v.id}
                                    className={`p-4 cursor-pointer hover:border-primary transition-colors ${selectedVehicle?.id === v.id ? 'border-primary ring-1 ring-primary' : ''}`}
                                    onClick={() => setSelectedVehicle(v)}
                                >
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h3 className="font-bold">{v.plate}</h3>
                                            <p className="text-sm text-slate-500">{v.name} - {v.status}</p>
                                        </div>
                                        <ChevronRight className="text-slate-300" />
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <Button
                            className="w-full h-12 text-lg"
                            disabled={!selectedVehicle}
                            onClick={() => setStep('customer')}
                        >
                            Devam Et
                        </Button>
                    </div>
                </div>
            )}

            {step === 'customer' && (
                <div className="space-y-6">
                    <Card className="p-4 space-y-4">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                            <Users className="w-5 h-5" /> Müşteri
                        </h3>
                        <div className="flex gap-2">
                            <Button variant={!isNewCustomer ? "default" : "outline"} size="sm" onClick={() => { setIsNewCustomer(false); setSelectedOperationCustomer(null); }}>Mevcut müşteri seç</Button>
                            <Button variant={isNewCustomer ? "default" : "outline"} size="sm" onClick={() => { setIsNewCustomer(true); setSelectedOperationCustomer(null); }}>Yeni müşteri ekle</Button>
                        </div>

                        {!isNewCustomer && (
                            <>
                                <Input placeholder="Müşteri ara (ad, telefon)..." className="mb-2" value={customerSearchTerm} onChange={(e) => setCustomerSearchTerm(e.target.value)} />
                                <div className="grid gap-2 max-h-48 overflow-y-auto">
                                    {customers
                                        .filter(c => !customerSearchTerm.trim() || c.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) || (c.phone || "").includes(customerSearchTerm))
                                        .map((c) => (
                                            <Card key={c.id} className={`p-3 cursor-pointer ${selectedOperationCustomer?.id === c.id ? 'border-primary ring-1 ring-primary' : ''}`} onClick={() => setSelectedOperationCustomer(c)}>
                                                <div className="font-medium">{c.name}</div>
                                                <div className="text-sm text-slate-500">{c.phone} {c.email ? " • " + c.email : ""}</div>
                                            </Card>
                                        ))}
                                    {customers.length === 0 && <p className="text-sm text-slate-500">Müşteri bulunamadı. Yeni müşteri ekleyin.</p>}
                                </div>
                            </>
                        )}

                        {isNewCustomer && (
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1"><Label>Ad Soyad *</Label><Input value={customerForm.name} onChange={e => setCustomerForm(f => ({ ...f, name: e.target.value }))} placeholder="Ad Soyad" /></div>
                                    <div className="space-y-1"><Label>Telefon *</Label><Input value={customerForm.phone} onChange={e => setCustomerForm(f => ({ ...f, phone: e.target.value }))} placeholder="0532 123 45 67" /></div>
                                </div>
                                <div className="space-y-1"><Label>E-posta</Label><Input type="email" value={customerForm.email} onChange={e => setCustomerForm(f => ({ ...f, email: e.target.value }))} placeholder="ornek@email.com" /></div>
                                <div className="grid grid-cols-2 gap-3">
                                    {customerForm.invoiceType === "corporate" ? (
                                        <>
                                            <div className="space-y-1"><Label>Vergi No (VKN) *</Label><Input required value={customerForm.taxNumber} onChange={e => setCustomerForm(f => ({ ...f, taxNumber: e.target.value }))} placeholder="10 haneli VKN" maxLength={10} /></div>
                                            <div className="space-y-1"><Label>MERSIS No *</Label><Input required value={customerForm.mersisNo} onChange={e => setCustomerForm(f => ({ ...f, mersisNo: e.target.value }))} placeholder="16 haneli MERSIS" maxLength={16} /></div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="space-y-1"><Label>TC Kimlik No</Label><Input value={customerForm.tckn} onChange={e => setCustomerForm(f => ({ ...f, tckn: e.target.value }))} placeholder="11 haneli" maxLength={11} /></div>
                                            <div className="space-y-1"><Label>Ehliyet No</Label><Input value={customerForm.driverLicenseNo} onChange={e => setCustomerForm(f => ({ ...f, driverLicenseNo: e.target.value }))} placeholder="Ehliyet no" /></div>
                                        </>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1"><Label>Ehliyet sınıfı</Label>
                                        <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={customerForm.driverLicenseClass} onChange={e => setCustomerForm(f => ({ ...f, driverLicenseClass: e.target.value }))}>
                                            <option value="B">B</option><option value="C">C</option><option value="D">D</option><option value="E">E</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1"><Label>Ehliyet / Kimlik tarihi</Label><Input value={customerForm.idIssueDate} onChange={e => setCustomerForm(f => ({ ...f, idIssueDate: e.target.value }))} placeholder="GG/AA/YYYY" /></div>
                                </div>
                                <div className="space-y-1"><Label>Adres</Label><Input value={customerForm.address} onChange={e => setCustomerForm(f => ({ ...f, address: e.target.value }))} placeholder="Adres" /></div>

                                <div className="space-y-1">
                                    <Label>Fatura Tipi</Label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={customerForm.invoiceType}
                                        onChange={e =>
                                            setCustomerForm(f => {
                                                const nextType = e.target.value as 'individual' | 'corporate';
                                                return {
                                                    ...f,
                                                    invoiceType: nextType,
                                                    tckn: nextType === "corporate" ? "" : f.tckn,
                                                    taxNumber: nextType === "corporate" ? f.taxNumber : "",
                                                    mersisNo: nextType === "corporate" ? f.mersisNo : "",
                                                };
                                            })
                                        }
                                    >
                                        <option value="individual">Bireysel</option>
                                        <option value="corporate">Kurumsal</option>
                                    </select>
                                </div>

                                {customerForm.invoiceType === 'corporate' && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 border border-slate-200 rounded-lg bg-slate-50">
                                        <div className="space-y-1"><Label>Firma Ünvanı *</Label><Input required value={customerForm.companyName} onChange={e => setCustomerForm(f => ({ ...f, companyName: e.target.value }))} placeholder="Örn: ABC A.Ş." /></div>
                                        <div className="space-y-1"><Label>Vergi Dairesi *</Label><Input required value={customerForm.taxOffice} onChange={e => setCustomerForm(f => ({ ...f, taxOffice: e.target.value }))} placeholder="Örn: Seyhan V.D." /></div>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1"><Label>Kimlik seri no</Label><Input value={customerForm.idSerialNo} onChange={e => setCustomerForm(f => ({ ...f, idSerialNo: e.target.value }))} placeholder="Seri no" /></div>
                                    <div className="space-y-1"><Label>Düzenlenen yer</Label><Input value={customerForm.idIssuePlace} onChange={e => setCustomerForm(f => ({ ...f, idIssuePlace: e.target.value }))} placeholder="Nüfus müdürlüğü" /></div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="flex justify-between items-center">
                                            Kimlik ön yüz
                                            {idFrontFile && (
                                                <Button type="button" variant="ghost" size="sm" className="h-7 text-[10px] gap-1 text-primary" onClick={() => handleOcrAnalysis(idFrontFile)}>
                                                    <Sparkles className="w-3 h-3" /> AI ile oku
                                                </Button>
                                            )}
                                        </Label>
                                        <PhotoInput
                                            onChange={e => { const f = e.target.files?.[0]; if (f) setIdFrontFile(f); }}
                                            labelCamera="Fotoğraf çek"
                                            labelGallery="Galeriden seç"
                                            buttonClassName="w-full justify-start"
                                        />
                                        {idFrontFile && <p className="text-[11px] text-slate-600">{idFrontFile.name}</p>}
                                        {customerForm.idFrontUrl && !idFrontFile && <p className="text-[11px] text-green-600">Yüklü belge mevcut</p>}
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Kimlik arka yüz</Label>
                                        <PhotoInput
                                            onChange={e => { const f = e.target.files?.[0]; if (f) setIdBackFile(f); }}
                                            labelCamera="Fotoğraf çek"
                                            labelGallery="Galeriden seç"
                                            buttonClassName="w-full justify-start"
                                        />
                                        {idBackFile && <p className="text-[11px] text-slate-600">{idBackFile.name}</p>}
                                        {customerForm.idBackUrl && !idBackFile && <p className="text-[11px] text-green-600">Yüklü belge mevcut</p>}
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="flex justify-between items-center">
                                            Ehliyet ön yüz
                                            {licenseFrontFile && (
                                                <Button type="button" variant="ghost" size="sm" className="h-7 text-[10px] gap-1 text-primary" onClick={() => handleOcrAnalysis(licenseFrontFile)}>
                                                    <Sparkles className="w-3 h-3" /> AI ile oku
                                                </Button>
                                            )}
                                        </Label>
                                        <PhotoInput
                                            onChange={e => { const f = e.target.files?.[0]; if (f) setLicenseFrontFile(f); }}
                                            labelCamera="Fotoğraf çek"
                                            labelGallery="Galeriden seç"
                                            buttonClassName="w-full justify-start"
                                        />
                                        {licenseFrontFile && <p className="text-[11px] text-slate-600">{licenseFrontFile.name}</p>}
                                        {customerForm.licenseFrontUrl && !licenseFrontFile && <p className="text-[11px] text-green-600">Yüklü belge mevcut</p>}
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Ehliyet arka yüz</Label>
                                        <PhotoInput
                                            onChange={e => { const f = e.target.files?.[0]; if (f) setLicenseBackFile(f); }}
                                            labelCamera="Fotoğraf çek"
                                            labelGallery="Galeriden seç"
                                            buttonClassName="w-full justify-start"
                                        />
                                        {licenseBackFile && <p className="text-[11px] text-slate-600">{licenseBackFile.name}</p>}
                                        {customerForm.licenseBackUrl && !licenseBackFile && <p className="text-[11px] text-green-600">Yüklü belge mevcut</p>}
                                    </div>
                                </div>
                                <div className="border-t pt-3 mt-3 space-y-3">
                                    <Label className="text-slate-600">2. Şoför (isteğe bağlı)</Label>
                                    <div className="space-y-2">
                                        <Input
                                            value={customerForm.secondDriverName ?? ""}
                                            onChange={e => setCustomerForm(f => ({ ...f, secondDriverName: e.target.value }))}
                                            placeholder="Adı soyadı"
                                        />
                                        <div className="grid grid-cols-2 gap-2">
                                            <Input
                                                value={customerForm.secondDriverLicenseNo ?? ""}
                                                onChange={e => setCustomerForm(f => ({ ...f, secondDriverLicenseNo: e.target.value }))}
                                                placeholder="Ehliyet no"
                                            />
                                            <select
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                value={customerForm.secondDriverLicenseClass ?? "B"}
                                                onChange={e => setCustomerForm(f => ({ ...f, secondDriverLicenseClass: e.target.value }))}
                                            >
                                                <option value="B">B</option><option value="C">C</option><option value="D">D</option><option value="E">E</option>
                                            </select>
                                        </div>
                                        <Input
                                            value={customerForm.secondDriverLicenseDate ?? ""}
                                            onChange={e => setCustomerForm(f => ({ ...f, secondDriverLicenseDate: e.target.value }))}
                                            placeholder="Ehliyet düzenlenme tarihi (GG/AA/YYYY)"
                                        />
                                    </div>
                                </div>
                                <Button type="button" onClick={handleSaveNewCustomer} disabled={loading}>Kaydet ve devam için seç</Button>
                            </div>
                        )}

                        {selectedOperationCustomer && !isNewCustomer && (
                            <div className="space-y-3">
                                <div className="flex flex-wrap items-center gap-4">
                                    <p className="text-sm text-green-600">Seçili: {selectedOperationCustomer.name}</p>
                                    <Button variant="outline" size="sm" onClick={() => {
                                        setCustomerForm({
                                            ...selectedOperationCustomer,
                                            invoiceType: selectedOperationCustomer.invoiceType || "individual"
                                        });
                                        setSelectedOperationCustomer(null);
                                        setIsNewCustomer(true);
                                    }}>Bilgileri Düzenle</Button>
                                </div>
                                <div className="space-y-2">
                                    <Label>2. Şoför (isteğe bağlı)</Label>
                                    <Input
                                        value={selectedOperationCustomer.secondDriverName ?? ""}
                                        onChange={e => setSelectedOperationCustomer(prev => prev ? { ...prev, secondDriverName: e.target.value } : null)}
                                        placeholder="Adı soyadı"
                                    />
                                    <div className="grid grid-cols-2 gap-2">
                                        <Input
                                            value={selectedOperationCustomer.secondDriverLicenseNo ?? ""}
                                            onChange={e => setSelectedOperationCustomer(prev => prev ? { ...prev, secondDriverLicenseNo: e.target.value } : null)}
                                            placeholder="Ehliyet no"
                                        />
                                        <select
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                            value={selectedOperationCustomer.secondDriverLicenseClass ?? "B"}
                                            onChange={e => setSelectedOperationCustomer(prev => prev ? { ...prev, secondDriverLicenseClass: e.target.value } : null)}
                                        >
                                            <option value="B">B</option><option value="C">C</option><option value="D">D</option><option value="E">E</option>
                                        </select>
                                    </div>
                                    <Input
                                        value={selectedOperationCustomer.secondDriverLicenseDate ?? ""}
                                        onChange={e => setSelectedOperationCustomer(prev => prev ? { ...prev, secondDriverLicenseDate: e.target.value } : null)}
                                        placeholder="Ehliyet tarihi (GG/AA/YYYY)"
                                    />
                                </div>
                            </div>
                        )}
                    </Card>
                    <div className="flex gap-3">
                        <Button variant="outline" className="h-12 px-6" onClick={() => setStep('select')}>
                            ← Geri
                        </Button>
                        <Button className="flex-1 h-12" disabled={loading} onClick={handleContinueFromCustomer}>Devam Et</Button>
                    </div>
                </div>
            )}

            {step === 'checklist' && (
                <div className="space-y-6">
                    <Card className="p-4 space-y-4">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                            <Gauge className="w-5 h-5" /> Km ve Yakıt
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Güncel KM <span className="text-xs text-slate-400 font-normal">(Son:{selectedVehicle?.km || "N/A"})</span></Label>
                                <Input type="number" value={km} onChange={e => setKm(e.target.value)} placeholder="0" />
                            </div>
                            <div className="space-y-2">
                                <Label>Yakıt Seviyesi</Label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                                    value={fuelLevel}
                                    onChange={e => setFuelLevel(e.target.value)}
                                >
                                    <option value="1/1">1/1 (Dolu)</option>
                                    <option value="3/4">3/4</option>
                                    <option value="1/2">1/2 (Yarım)</option>
                                    <option value="1/4">1/4 (Çeyrek)</option>
                                    <option value="empty">Boş</option>
                                </select>
                            </div>
                        </div>
                        {operationType === 'return' && fuelLevel !== "1/1" && (
                            <div className="pt-2 border-t mt-2">
                                <Label className="text-amber-600 mb-1 block">Eksik Yakıt Tahsilatı (TL)</Label>
                                <Input
                                    type="number"
                                    value={fuelRefillCost}
                                    onChange={e => setFuelRefillCost(e.target.value)}
                                    placeholder="Doldurulan yakıt fişi tutarı"
                                    className="border-amber-200 focus-visible:ring-amber-500"
                                />
                                <p className="text-xs text-slate-500 mt-1">Eğer aracı siz fullerseniz alınan yakıt fişi tutarını buraya girin. Tutar müşterinin carisine borç olarak yazılacaktır.</p>
                            </div>
                        )}
                    </Card>
                    <Card className="p-4 space-y-4">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                            <Calendar className="w-5 h-5" /> Kiralama süresi (sözleşme)
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Başlangıç</Label>
                                <Input type="datetime-local" value={rentalStartDate} onChange={e => {
                                    setRentalStartDate(e.target.value);
                                    if (rentalPricingMode === "monthly") {
                                        const start = new Date(e.target.value);
                                        if (!isNaN(start.getTime())) {
                                            start.setMonth(start.getMonth() + parseInt(rentalMonthCountSelected));
                                            const year = start.getFullYear();
                                            const month = String(start.getMonth() + 1).padStart(2, "0");
                                            const day = String(start.getDate()).padStart(2, "0");
                                            const hour = String(start.getHours()).padStart(2, "0");
                                            const minute = String(start.getMinutes()).padStart(2, "0");
                                            setRentalEndDate(`${year}-${month}-${day}T${hour}:${minute}`);
                                        }
                                    }
                                }} />
                            </div>
                            <div className="space-y-2">
                                <Label>Bitiş</Label>
                                <Input type="datetime-local" value={rentalEndDate} onChange={e => setRentalEndDate(e.target.value)} />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label>Kiralama Tipi</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    <Button
                                        type="button"
                                        variant={rentalPricingMode === "daily" ? "default" : "outline"}
                                        onClick={() => setRentalPricingMode("daily")}
                                        className="w-full"
                                    >
                                        Günlük
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={rentalPricingMode === "monthly" ? "default" : "outline"}
                                        onClick={() => {
                                            setRentalPricingMode("monthly");
                                            if (rentalStartDate) {
                                                const start = new Date(rentalStartDate);
                                                if (!isNaN(start.getTime())) {
                                                    start.setMonth(start.getMonth() + parseInt(rentalMonthCountSelected));
                                                    const year = start.getFullYear();
                                                    const month = String(start.getMonth() + 1).padStart(2, "0");
                                                    const day = String(start.getDate()).padStart(2, "0");
                                                    const hour = String(start.getHours()).padStart(2, "0");
                                                    const minute = String(start.getMinutes()).padStart(2, "0");
                                                    setRentalEndDate(`${year}-${month}-${day}T${hour}:${minute}`);
                                                }
                                            }
                                        }}
                                        className="w-full"
                                    >
                                        Aylık
                                    </Button>
                                </div>
                                <p className="text-xs text-slate-500">Aylık seçimde hesaplama 30 gün = 1 ay kabulü ile yapılır.</p>
                            </div>
                            {rentalPricingMode === "monthly" && (
                                <div className="space-y-2 md:col-span-2">
                                    <Label>Toplam Ay Sayısı</Label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                                        value={rentalMonthCountSelected}
                                        onChange={(e) => {
                                            const months = parseInt(e.target.value);
                                            setRentalMonthCountSelected(e.target.value);
                                            if (rentalStartDate) {
                                                const start = new Date(rentalStartDate);
                                                if (!isNaN(start.getTime())) {
                                                    start.setMonth(start.getMonth() + months);
                                                    const year = start.getFullYear();
                                                    const month = String(start.getMonth() + 1).padStart(2, "0");
                                                    const day = String(start.getDate()).padStart(2, "0");
                                                    const hour = String(start.getHours()).padStart(2, "0");
                                                    const minute = String(start.getMinutes()).padStart(2, "0");
                                                    setRentalEndDate(`${year}-${month}-${day}T${hour}:${minute}`);
                                                }
                                            }
                                        }}
                                    >
                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                                            <option key={m} value={m}>{m} Ay</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label>{rentalPricingMode === "monthly" ? "Aylık kira (TL) - Vergi Hariç Tutar" : "Günlük kira (TL) - Vergi Hariç Tutar"}</Label>
                                {rentalPricingMode === "monthly" ? (
                                    <Input type="number" min={0} value={monthlyRate} onChange={e => setMonthlyRate(e.target.value)} placeholder="0" />
                                ) : (
                                    <Input type="number" min={0} value={dailyRate} onChange={e => setDailyRate(e.target.value)} placeholder="0" />
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4 md:col-span-2">
                                <div className="space-y-2">
                                    <Label>KDV Durumu</Label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                                        value={kdvStatus}
                                        onChange={e => setKdvStatus(e.target.value as "dahil" | "haric")}
                                    >
                                        <option value="haric">+ KDV</option>
                                        <option value="dahil">KDV Dahil</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label>KDV Oranı (%)</Label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                                        value={kdvRate}
                                        onChange={e => setKdvRate(e.target.value)}
                                    >
                                        <option value="20">%20</option>
                                        <option value="10">%10</option>
                                        <option value="1">%1</option>
                                        <option value="0">%0 (Muaf)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <Label>Toplam Kira (Sözleşmede gözükecek)</Label>
                                <Input
                                    value={customTotalRate}
                                    onChange={e => setCustomTotalRate(e.target.value)}
                                    placeholder={`Otomatik hesaplandı: ${getEstimatedRentalTotal()} TL`}
                                    className="border-slate-300 font-semibold"
                                />
                                <p className="text-xs text-slate-500">
                                    {rentalPricingMode === "monthly"
                                        ? `${rentalMonthCountSelected} ay × ${sanitizeNumber(monthlyRate).toLocaleString("tr-TR")} TL = ${getEstimatedRentalTotal().toLocaleString("tr-TR")} TL`
                                        : `${getRentalDayCount()} gün × ${sanitizeNumber(dailyRate).toLocaleString("tr-TR")} TL = ${getEstimatedRentalTotal().toLocaleString("tr-TR")} TL`}
                                    {" — "}KDV durumu: {kdvStatus === "dahil" ? "KDV Dahil" : "+ KDV"}
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label>Teminat / Depozito (TL)</Label>
                                <Input type="number" min={0} value={deposit} onChange={e => setDeposit(e.target.value)} placeholder="0" />
                            </div>
                        </div>
                    </Card>

                    <div className="flex gap-3">
                        <Button variant="outline" className="h-12 px-6" onClick={() => setStep('customer')}>
                            ← Geri
                        </Button>
                        <Button className="flex-1 h-12" onClick={() => setStep('photos')}>Devam Et</Button>
                    </div>
                </div>
            )}

            {step === 'photos' && (
                <div className="space-y-6">
                    <Card className="p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                <Camera className="w-5 h-5" /> Fotoğraflar
                            </h3>
                            <span className="text-sm text-slate-500">{photos.length} yüklendi</span>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                type="button"
                                className="flex flex-col items-center justify-center aspect-square bg-slate-100 rounded-lg border-2 border-dashed border-slate-300 cursor-pointer hover:bg-slate-50 disabled:opacity-60"
                                onClick={() => triggerFileInput(operationPhotoCameraInputRef.current)}
                                disabled={uploading}
                            >
                                {uploading ? <Loader2 className="w-8 h-8 animate-spin" /> : <Camera className="w-8 h-8 text-slate-400" />}
                                <span className="text-xs mt-2 font-medium text-slate-600">Kamera ile çek</span>
                            </button>
                            <button
                                type="button"
                                className="flex flex-col items-center justify-center aspect-square bg-slate-100 rounded-lg border-2 border-dashed border-slate-300 cursor-pointer hover:bg-slate-50 disabled:opacity-60"
                                onClick={() => triggerFileInput(operationPhotoGalleryInputRef.current)}
                                disabled={uploading}
                            >
                                <ImagePlus className="w-8 h-8 text-slate-400" />
                                <span className="text-xs mt-2 font-medium text-slate-600">Galeriden seç</span>
                            </button>
                            <input
                                ref={operationPhotoCameraInputRef}
                                type="file"
                                accept="image/*"
                                capture="environment"
                                className="hidden"
                                onChange={(e) => handlePhotoUpload(e, "general")}
                                disabled={uploading}
                            />
                            <input
                                ref={operationPhotoGalleryInputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={(e) => handlePhotoUpload(e, "general")}
                                disabled={uploading}
                            />
                            {photos.map((photo, i) => (
                                <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-black">
                                    <img src={photo.url} className="w-full h-full object-cover" />
                                    <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] py-1 px-2 text-center">
                                        {photo.angle}
                                    </div>
                                    <button
                                        className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1"
                                        onClick={() => setPhotos(photos.filter((_, idx) => idx !== i))}
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </Card>
                    <div className="flex gap-3">
                        <Button variant="outline" className="h-12 px-6" onClick={() => setStep('checklist')}>
                            ← Geri
                        </Button>
                        <Button className="flex-1 h-12" onClick={() => setStep('damage')}>Devam Et</Button>
                    </div>
                </div>
            )}
            {step === 'damage' && (
                <div className="space-y-6">
                    <Card className="p-4 space-y-4">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5" /> Hasar Kontrolü
                        </h3>
                        <Suspense fallback={<div className="h-[340px] flex items-center justify-center bg-slate-100 rounded-xl border-2 border-slate-300 text-slate-500">Yükleniyor...</div>}>
                            <DamageControl3D
                                damagePoints={damagePoints}
                                setDamagePoints={setDamagePoints}
                                vehicleName={selectedVehicle?.name}
                            />
                        </Suspense>

                        <div className="space-y-2">
                            <Label>Hasar Notları</Label>
                            <Textarea
                                placeholder="Hasar detaylarını yazın..."
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Tahmini Hasar Bedeli (TL)</Label>
                            <Input
                                type="number"
                                min={0}
                                placeholder="Orn: 2500"
                                value={estimatedDamageCost}
                                onChange={e => setEstimatedDamageCost(e.target.value)}
                            />
                        </div>
                    </Card>
                    <div className="flex gap-3">
                        <Button variant="outline" className="h-12 px-6" onClick={() => setStep('photos')}>
                            ← Geri
                        </Button>
                        <Button className="flex-1 h-12" onClick={() => setStep('sign')}>Devam Et</Button>
                    </div>
                </div>
            )}

            {step === 'sign' && (
                <div className="space-y-6">
                    <Card className="p-4 space-y-4">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                            <User className="w-5 h-5" /> Onay ve İmzalar
                        </h3>
                        <p className="text-sm text-slate-500">
                            Kiralayan, kiraci ve ikinci sofor icin ayri imza alin. Bu imzalar sozlesmede imza bolumunde gorunur.
                        </p>
                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="space-y-2">
                                <Label>Kiralayan Imza</Label>
                                <div className="border border-slate-300 rounded-lg overflow-hidden bg-white h-40">
                                    <SignatureCanvas
                                        ref={kiralayanSignPad}
                                        canvasProps={{ className: 'sigCanvas w-full h-full' }}
                                        backgroundColor="rgba(255,255,255,1)"
                                    />
                                </div>
                                <Button type="button" variant="outline" size="sm" onClick={() => kiralayanSignPad.current?.clear()}>
                                    Temizle
                                </Button>
                            </div>
                            <div className="space-y-2">
                                <Label>Kiraci Imza</Label>
                                <div className="border border-slate-300 rounded-lg overflow-hidden bg-white h-40">
                                    <SignatureCanvas
                                        ref={kiraciSignPad}
                                        canvasProps={{ className: 'sigCanvas w-full h-full' }}
                                        backgroundColor="rgba(255,255,255,1)"
                                    />
                                </div>
                                <Button type="button" variant="outline" size="sm" onClick={() => kiraciSignPad.current?.clear()}>
                                    Temizle
                                </Button>
                            </div>
                            <div className="space-y-2">
                                <Label>2. Sofor Imza</Label>
                                <div className="border border-slate-300 rounded-lg overflow-hidden bg-white h-40">
                                    <SignatureCanvas
                                        ref={secondDriverSignPad}
                                        canvasProps={{ className: 'sigCanvas w-full h-full' }}
                                        backgroundColor="rgba(255,255,255,1)"
                                    />
                                </div>
                                <Button type="button" variant="outline" size="sm" onClick={() => secondDriverSignPad.current?.clear()}>
                                    Temizle
                                </Button>
                            </div>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                kiralayanSignPad.current?.clear();
                                kiraciSignPad.current?.clear();
                                secondDriverSignPad.current?.clear();
                            }}
                        >
                            Tum Imzalari Temizle
                        </Button>
                    </Card>
                    <Button className="w-full h-12 bg-green-600 hover:bg-green-700" onClick={handleComplete} disabled={loading}>
                        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        İşlemi Tamamla
                    </Button>
                </div>
            )}

            {step !== 'select' && (
                <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => {
                        setStep('select');
                        setEstimatedDamageCost("");
                        setSourceBookingId(null);
                        kiralayanSignPad.current?.clear();
                        kiraciSignPad.current?.clear();
                        secondDriverSignPad.current?.clear();
                        reservationPrefillAppliedRef.current = false;
                        if (step === 'customer') {
                            setSelectedOperationCustomer(null);
                            setCustomerSearchTerm("");
                        }
                    }}
                >
                    Vazgeç
                </Button>
            )}
        </div>
    );
};




