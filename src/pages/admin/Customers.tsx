import { useState, useEffect, useMemo } from "react";
import {
    collection,
    getDocs,
    addDoc,
    deleteDoc,
    doc,
    updateDoc,
    query,
    orderBy,
    where
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/integrations/firebase/client";
import {
    Plus,
    Search,
    Phone,
    Mail,
    Trash2,
    MoreHorizontal,
    FileText,
    IdCard,
    Camera,
    Loader2,
    Wallet,
    CheckCircle,
    ArrowUpCircle,
    ArrowDownCircle,
    Receipt,
    CreditCard,
    Banknote,
    TrendingUp,
    TrendingDown,
    Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { compressImageForUpload } from "@/utils/imageCompression";

type Customer = {
    id: string;
    name: string;
    email: string;
    phone: string;
    tckn: string;
    driverLicenseClass: string;
    totalRentals: number;
    lastRentalDate: string;
    idFrontUrl?: string;
    idBackUrl?: string;
    idSerialNo?: string;
    idIssuePlace?: string;
    idIssueDate?: string;
    invoiceType?: "individual" | "corporate";
    companyName?: string;
    taxOffice?: string;
    taxNumber?: string;
    mersisNo?: string;
    driverLicenseFrontUrl?: string;
    driverLicenseBackUrl?: string;
};

type TransactionType = "borc" | "alacak";
type TransactionCategory =
    | "kiralama"
    | "hasar"
    | "km_asim"
    | "yakit"
    | "ekstra"
    | "diger"
    | "nakit"
    | "havale"
    | "kredi_karti"
    | "iade";

type CariTransaction = {
    id: string;
    customerId: string;
    customerName: string;
    type: TransactionType;
    category: TransactionCategory;
    amount: number;
    description: string;
    date: string;
    operationId?: string;
    vehiclePlate?: string;
    status: "unpaid" | "paid" | "completed";
    createdAt?: string;
};

const CATEGORY_LABELS: Record<TransactionCategory, string> = {
    kiralama: "Kiralama Bedeli",
    hasar: "Hasar Onarım",
    km_asim: "KM Aşım",
    yakit: "Yakıt Bedeli",
    ekstra: "Ek Hizmet",
    diger: "Diğer",
    nakit: "Nakit Tahsilat",
    havale: "Havale/EFT",
    kredi_karti: "Kredi Kartı",
    iade: "İade",
};

const BORC_CATEGORIES: TransactionCategory[] = ["kiralama", "hasar", "km_asim", "yakit", "ekstra", "diger"];
const ALACAK_CATEGORIES: TransactionCategory[] = ["nakit", "havale", "kredi_karti", "iade"];

const formatMoney = (v: number) =>
    new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", minimumFractionDigits: 2 }).format(v);

const formatDate = (d: string) => {
    try {
        return new Date(d).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" });
    } catch {
        return d;
    }
};

export const Customers = () => {
    const { toast } = useToast();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [_loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [customerTypeFilter, setCustomerTypeFilter] = useState<"all" | "individual" | "corporate">("all");

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [uploading, setUploading] = useState(false);

    // Cari
    const [cariOpen, setCariOpen] = useState(false);
    const [cariTransactions, setCariTransactions] = useState<CariTransaction[]>([]);
    const [cariLoading, setCariLoading] = useState(false);
    const [cariFilter, setCariFilter] = useState<"all" | "borc" | "alacak">("all");
    const [tahsilatOpen, setTahsilatOpen] = useState(false);
    const [borcOpen, setBorcOpen] = useState(false);
    const [tahsilatForm, setTahsilatForm] = useState({ amount: "", category: "nakit" as TransactionCategory, description: "" });
    const [borcForm, setBorcForm] = useState({ amount: "", category: "kiralama" as TransactionCategory, description: "", vehiclePlate: "" });

    const [idFrontFile, setIdFrontFile] = useState<File | null>(null);
    const [idBackFile, setIdBackFile] = useState<File | null>(null);
    const [driverLicenseFrontFile, setDriverLicenseFrontFile] = useState<File | null>(null);
    const [driverLicenseBackFile, setDriverLicenseBackFile] = useState<File | null>(null);

    const [idFrontPreview, setIdFrontPreview] = useState<string | null>(null);
    const [idBackPreview, setIdBackPreview] = useState<string | null>(null);
    const [driverLicenseFrontPreview, setDriverLicenseFrontPreview] = useState<string | null>(null);
    const [driverLicenseBackPreview, setDriverLicenseBackPreview] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<Customer>>({
        name: "", email: "", phone: "", tckn: "", driverLicenseClass: "B",
        totalRentals: 0, lastRentalDate: "", idSerialNo: "", idIssuePlace: "", idIssueDate: "",
        invoiceType: "individual", companyName: "", taxOffice: "", taxNumber: "", mersisNo: ""
    });

    const openCreateDialog = () => { resetForm(); setDialogOpen(true); };

    const openEditDialog = (customer: Customer) => {
        setEditingCustomerId(customer.id);
        setFormData({
            name: customer.name || "", email: customer.email || "", phone: customer.phone || "",
            tckn: customer.tckn || "", driverLicenseClass: customer.driverLicenseClass || "B",
            totalRentals: Number(customer.totalRentals || 0), lastRentalDate: customer.lastRentalDate || "",
            idSerialNo: customer.idSerialNo || "", idIssuePlace: customer.idIssuePlace || "", idIssueDate: customer.idIssueDate || "",
            invoiceType: customer.invoiceType || "individual", companyName: customer.companyName || "",
            taxOffice: customer.taxOffice || "", taxNumber: customer.taxNumber || "", mersisNo: customer.mersisNo || ""
        });
        setIdFrontFile(null); setIdBackFile(null); setDriverLicenseFrontFile(null); setDriverLicenseBackFile(null);
        setDialogOpen(true);
    };

    useEffect(() => { fetchCustomers(); }, []);

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, "customers"), orderBy("name"));
            const snap = await getDocs(q);
            setCustomers(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Customer)));
        } catch (error) {
            console.error("Error fetching customers:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCariTransactions = async (customerId: string) => {
        setCariLoading(true);
        try {
            const q = query(collection(db, "customer_debts"), where("customerId", "==", customerId), orderBy("date", "desc"));
            const snap = await getDocs(q);
            const list: CariTransaction[] = snap.docs.map((d) => {
                const data = d.data();
                return {
                    id: d.id,
                    customerId: data.customerId || customerId,
                    customerName: data.customerName || "",
                    type: data.type || "borc",
                    category: data.category || mapLegacyCategory(data.description),
                    amount: Number(data.amount) || 0,
                    description: data.description || "",
                    date: data.date || "",
                    operationId: data.operationId,
                    vehiclePlate: data.vehiclePlate,
                    status: data.status || "unpaid",
                    createdAt: data.createdAt,
                };
            });
            setCariTransactions(list);
        } catch (error) {
            console.error("Error fetching cari:", error);
            setCariTransactions([]);
        } finally {
            setCariLoading(false);
        }
    };

    const mapLegacyCategory = (desc?: string): TransactionCategory => {
        if (!desc) return "diger";
        const d = desc.toLowerCase();
        if (d.includes("onarım") || d.includes("hasar")) return "hasar";
        if (d.includes("km") || d.includes("aşım")) return "km_asim";
        if (d.includes("yakıt") || d.includes("yakit")) return "yakit";
        if (d.includes("kiralama")) return "kiralama";
        return "diger";
    };

    const cariSummary = useMemo(() => {
        let toplamBorc = 0;
        let toplamAlacak = 0;
        let bekleyenBorc = 0;

        cariTransactions.forEach((tx) => {
            if (tx.type === "alacak") {
                toplamAlacak += tx.amount;
            } else {
                toplamBorc += tx.amount;
                if (tx.status === "unpaid") bekleyenBorc += tx.amount;
            }
        });

        return { toplamBorc, toplamAlacak, bakiye: toplamBorc - toplamAlacak, bekleyenBorc };
    }, [cariTransactions]);

    const filteredTransactions = useMemo(() => {
        if (cariFilter === "all") return cariTransactions;
        return cariTransactions.filter((tx) => tx.type === cariFilter);
    }, [cariTransactions, cariFilter]);

    const handleAddTahsilat = async () => {
        if (!selectedCustomer) return;
        const amt = Number(tahsilatForm.amount);
        if (!amt || amt <= 0) {
            toast({ title: "Hata", description: "Geçerli bir tutar girin.", variant: "destructive" });
            return;
        }
        try {
            await addDoc(collection(db, "customer_debts"), {
                customerId: selectedCustomer.id,
                customerName: selectedCustomer.name,
                type: "alacak",
                category: tahsilatForm.category,
                amount: amt,
                description: tahsilatForm.description || `${CATEGORY_LABELS[tahsilatForm.category]} - ${formatMoney(amt)}`,
                date: new Date().toISOString(),
                status: "completed",
                createdAt: new Date().toISOString(),
            });
            toast({ title: "Tahsilat kaydedildi", description: `${formatMoney(amt)} alacak kaydı oluşturuldu.` });
            setTahsilatOpen(false);
            setTahsilatForm({ amount: "", category: "nakit", description: "" });
            fetchCariTransactions(selectedCustomer.id);
        } catch (e) {
            console.error(e);
            toast({ title: "Hata", description: "Tahsilat kaydedilemedi.", variant: "destructive" });
        }
    };

    const handleAddBorc = async () => {
        if (!selectedCustomer) return;
        const amt = Number(borcForm.amount);
        if (!amt || amt <= 0) {
            toast({ title: "Hata", description: "Geçerli bir tutar girin.", variant: "destructive" });
            return;
        }
        try {
            await addDoc(collection(db, "customer_debts"), {
                customerId: selectedCustomer.id,
                customerName: selectedCustomer.name,
                type: "borc",
                category: borcForm.category,
                amount: amt,
                description: borcForm.description || `${CATEGORY_LABELS[borcForm.category]}${borcForm.vehiclePlate ? ` - ${borcForm.vehiclePlate}` : ""}`,
                date: new Date().toISOString(),
                vehiclePlate: borcForm.vehiclePlate || "",
                status: "unpaid",
                createdAt: new Date().toISOString(),
            });
            toast({ title: "Borç kaydedildi", description: `${formatMoney(amt)} borç kaydı oluşturuldu.` });
            setBorcOpen(false);
            setBorcForm({ amount: "", category: "kiralama", description: "", vehiclePlate: "" });
            fetchCariTransactions(selectedCustomer.id);
        } catch (e) {
            console.error(e);
            toast({ title: "Hata", description: "Borç kaydedilemedi.", variant: "destructive" });
        }
    };

    const handleMarkPaid = async (txId: string) => {
        try {
            await updateDoc(doc(db, "customer_debts", txId), { status: "paid" });
            toast({ title: "Güncellendi", description: "Borç ödendi olarak işaretlendi." });
            if (selectedCustomer) fetchCariTransactions(selectedCustomer.id);
        } catch (_e) {
            toast({ title: "Hata", description: "Güncellenemedi.", variant: "destructive" });
        }
    };

    const handleDeleteTransaction = async (txId: string) => {
        if (!confirm("Bu cari kaydını silmek istediğinize emin misiniz?")) return;
        try {
            await deleteDoc(doc(db, "customer_debts", txId));
            toast({ title: "Silindi" });
            if (selectedCustomer) fetchCariTransactions(selectedCustomer.id);
        } catch (_e) {
            toast({ title: "Hata", description: "Silinemedi.", variant: "destructive" });
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const invoiceType = formData.invoiceType || "individual";
        const isCorporate = invoiceType === "corporate";
        if (isCorporate && (!formData.companyName?.trim() || !formData.taxOffice?.trim() || !formData.taxNumber?.trim() || !formData.mersisNo?.trim())) {
            toast({ title: "Eksik kurumsal bilgi", description: "Firma ünvanı, vergi dairesi, vergi numarası ve MERSIS zorunludur.", variant: "destructive" });
            return;
        }

        setUploading(true);
        try {
            const { idFrontUrl: _ifu, idBackUrl: _ibu, driverLicenseFrontUrl: _dlfu, driverLicenseBackUrl: _dlbu, ...rest } = formData;
            const payload = {
                ...rest,
                tckn: isCorporate ? "" : (formData.tckn || "").trim(),
                invoiceType,
                companyName: isCorporate ? (formData.companyName || "").trim() : "",
                taxOffice: isCorporate ? (formData.taxOffice || "").trim() : "",
                taxNumber: isCorporate ? (formData.taxNumber || "").trim() : "",
                mersisNo: isCorporate ? (formData.mersisNo || "").trim() : ""
            };

            let customerId = editingCustomerId;
            if (customerId) {
                await updateDoc(doc(db, "customers", customerId), payload);
            } else {
                const docRef = await addDoc(collection(db, "customers"), { ...payload, idFrontUrl: "", idBackUrl: "", driverLicenseFrontUrl: "", driverLicenseBackUrl: "" });
                customerId = docRef.id;
            }

            const updates: Partial<Customer> = {};
            const uploadFile = async (file: File, path: string) => {
                const storageRef = ref(storage, path);
                const optimized = await compressImageForUpload(file);
                await uploadBytes(storageRef, optimized, { contentType: optimized.type });
                return getDownloadURL(storageRef);
            };

            if (idFrontFile) updates.idFrontUrl = await uploadFile(idFrontFile, `customers/${customerId}/id_front`);
            if (idBackFile) updates.idBackUrl = await uploadFile(idBackFile, `customers/${customerId}/id_back`);
            if (driverLicenseFrontFile) updates.driverLicenseFrontUrl = await uploadFile(driverLicenseFrontFile, `customers/${customerId}/dl_front`);
            if (driverLicenseBackFile) updates.driverLicenseBackUrl = await uploadFile(driverLicenseBackFile, `customers/${customerId}/dl_back`);

            if (Object.keys(updates).length > 0) await updateDoc(doc(db, "customers", customerId), updates);

            toast({ title: "Başarılı", description: editingCustomerId ? "Müşteri bilgileri güncellendi." : "Müşteri kaydedildi." });
            setDialogOpen(false);
            resetForm();
            fetchCustomers();
        } catch (error) {
            console.error(error);
            const errMsg = error instanceof Error ? error.message : JSON.stringify(error);
            alert(`Müşteri kaydetme hatası: ${errMsg}`);
            toast({ title: "Hata", description: `Kayıt kaydedilemedi: ${errMsg}`, variant: "destructive" });
        } finally {
            setUploading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: "", email: "", phone: "", tckn: "", driverLicenseClass: "B",
            totalRentals: 0, lastRentalDate: "", idSerialNo: "", idIssuePlace: "", idIssueDate: "",
            invoiceType: "individual", companyName: "", taxOffice: "", taxNumber: "", mersisNo: ""
        });
        setEditingCustomerId(null);
        setIdFrontFile(null); setIdBackFile(null); setDriverLicenseFrontFile(null); setDriverLicenseBackFile(null);
        setIdFrontPreview(null); setIdBackPreview(null); setDriverLicenseFrontPreview(null); setDriverLicenseBackPreview(null);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Müşteriyi silmek istiyor musunuz?")) return;
        try {
            await deleteDoc(doc(db, "customers", id));
            toast({ title: "Silindi", description: "Müşteri kaydı silindi." });
            fetchCustomers();
        } catch (_e) {
            toast({ title: "Hata", description: "Silinemedi.", variant: "destructive" });
        }
    };

    const filteredCustomers = customers.filter((c) => {
        const type = c.invoiceType || "individual";
        const matchesType = customerTypeFilter === "all" || type === customerTypeFilter;
        const matchesSearch =
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.phone.includes(searchTerm) ||
            c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (c.companyName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (c.taxNumber || "").includes(searchTerm) ||
            (c.mersisNo || "").includes(searchTerm);
        return matchesType && matchesSearch;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">Müşteriler</h2>
                    <p className="text-slate-500">Kayıtlı müşteriler, cari hesaplar ve kiralama geçmişleri.</p>
                </div>
                <Button onClick={openCreateDialog} className="bg-primary hover:bg-blue-700">
                    <Plus className="mr-2 h-4 w-4" /> Yeni Müşteri
                </Button>
            </div>

            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="relative w-full max-w-md">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                        <Input placeholder="İsim, telefon, e-posta veya şirket ara..." className="pl-9 bg-slate-50 border-slate-200" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    <div className="flex items-center gap-2">
                        {(["all", "individual", "corporate"] as const).map((t) => (
                            <Button key={t} type="button" size="sm" variant={customerTypeFilter === t ? "default" : "outline"} onClick={() => setCustomerTypeFilter(t)}>
                                {t === "all" ? "Tümü" : t === "individual" ? "Bireysel" : "Kurumsal"}
                            </Button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead className="font-semibold text-slate-700">Müşteri</TableHead>
                            <TableHead className="font-semibold text-slate-700">İletişim</TableHead>
                            <TableHead className="font-semibold text-slate-700">Ehliyet / Kimlik</TableHead>
                            <TableHead className="font-semibold text-slate-700 text-center">Kiralama</TableHead>
                            <TableHead className="font-semibold text-slate-700">Son İşlem</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredCustomers.map((customer) => (
                            <TableRow key={customer.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => { setSelectedCustomer(customer); setDetailOpen(true); }}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-9 w-9">
                                            <AvatarFallback className="bg-slate-200 text-slate-700">{customer.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <div className="font-medium text-slate-900 flex items-center gap-2">
                                                {customer.name}
                                                <Badge variant={customer.invoiceType === "corporate" ? "default" : "secondary"}>
                                                    {customer.invoiceType === "corporate" ? "Kurumsal" : "Bireysel"}
                                                </Badge>
                                            </div>
                                            {customer.invoiceType === "corporate" && customer.companyName && (
                                                <div className="text-xs text-slate-500 mt-0.5">{customer.companyName} {customer.taxNumber ? `- VKN: ${customer.taxNumber}` : ""}</div>
                                            )}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col gap-1 text-sm text-slate-600">
                                        <div className="flex items-center"><Mail className="w-3 h-3 mr-1.5" /> {customer.email}</div>
                                        <div className="flex items-center"><Phone className="w-3 h-3 mr-1.5" /> {customer.phone}</div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col gap-1 text-sm">
                                        <span className="font-medium">Sınıf: {customer.driverLicenseClass}</span>
                                        <span className="text-slate-500 text-xs font-mono">
                                            {customer.invoiceType === "corporate" ? `VKN: ${customer.taxNumber || "-"}` : `TCKN: ${customer.tckn || "-"}`}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-center">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{customer.totalRentals}</span>
                                </TableCell>
                                <TableCell className="text-sm text-slate-500">{customer.lastRentalDate || "-"}</TableCell>
                                <TableCell onClick={(e) => e.stopPropagation()}>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>İşlemler</DropdownMenuLabel>
                                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedCustomer(customer); setDetailOpen(true); }}>
                                                <IdCard className="mr-2 h-4 w-4" /> Kimlik & Belgeler
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedCustomer(customer); fetchCariTransactions(customer.id); setCariOpen(true); }}>
                                                <Wallet className="mr-2 h-4 w-4" /> Cari Hesap
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditDialog(customer); }}>
                                                <FileText className="mr-2 h-4 w-4" /> Düzenle
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDelete(customer.id); }} className="text-red-600">
                                                <Trash2 className="mr-2 h-4 w-4" /> Sil
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                        {filteredCustomers.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-slate-500">Müşteri bulunamadı.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* MÜŞTERİ EKLEME/DÜZENLEME */}
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingCustomerId ? "Müşteri Düzenle" : "Müşteri Ekle"}</DialogTitle>
                        <DialogDescription>{editingCustomerId ? "Müşteri bilgilerini güncelleyebilirsiniz." : "Yeni müşteri bilgilerini giriniz."}</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Ad Soyad</Label>
                                <Input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Örn: Ali Veli" />
                            </div>
                            {formData.invoiceType !== "corporate" && (
                                <div className="space-y-2">
                                    <Label>TC Kimlik No</Label>
                                    <Input required value={formData.tckn} onChange={(e) => setFormData({ ...formData, tckn: e.target.value })} maxLength={11} placeholder="11 haneli TC" />
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Fatura Tipi</Label>
                                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.invoiceType || "individual"} onChange={(e) => {
                                    const nextType = e.target.value as "individual" | "corporate";
                                    setFormData((prev) => ({ ...prev, invoiceType: nextType, companyName: nextType === "corporate" ? prev.companyName : "", taxOffice: nextType === "corporate" ? prev.taxOffice : "", taxNumber: nextType === "corporate" ? prev.taxNumber : "", mersisNo: nextType === "corporate" ? prev.mersisNo : "", tckn: nextType === "corporate" ? "" : prev.tckn }));
                                }}>
                                    <option value="individual">Bireysel</option>
                                    <option value="corporate">Kurumsal</option>
                                </select>
                            </div>
                        </div>

                        {formData.invoiceType === "corporate" && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 border border-slate-200 rounded-lg bg-slate-50">
                                <div className="sm:col-span-3">
                                    <p className="text-sm font-semibold text-slate-700">Kurumsal Kayıt</p>
                                </div>
                                <div className="space-y-2"><Label>Firma Ünvanı *</Label><Input required value={formData.companyName || ""} onChange={(e) => setFormData({ ...formData, companyName: e.target.value })} placeholder="ABC A.Ş." /></div>
                                <div className="space-y-2"><Label>Vergi Dairesi *</Label><Input required value={formData.taxOffice || ""} onChange={(e) => setFormData({ ...formData, taxOffice: e.target.value })} placeholder="Seyhan V.D." /></div>
                                <div className="space-y-2"><Label>Vergi No *</Label><Input required value={formData.taxNumber || ""} onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })} maxLength={10} /></div>
                                <div className="space-y-2"><Label>MERSIS No *</Label><Input required value={formData.mersisNo || ""} onChange={(e) => setFormData({ ...formData, mersisNo: e.target.value })} maxLength={16} /></div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label>E-posta</Label><Input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></div>
                            <div className="space-y-2"><Label>Telefon</Label><Input required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="05XX..." /></div>
                        </div>

                        <div className="space-y-2"><Label>Ehliyet Sınıfı</Label><Input value={formData.driverLicenseClass} onChange={(e) => setFormData({ ...formData, driverLicenseClass: e.target.value })} placeholder="B" /></div>

                        <div className="border-t pt-4 mt-4 space-y-4">
                            <div className="flex items-center gap-2 text-sm font-medium text-slate-700"><IdCard className="h-4 w-4" /> Kimlik Bilgileri</div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="space-y-2"><Label>Seri No</Label><Input value={formData.idSerialNo ?? ""} onChange={(e) => setFormData({ ...formData, idSerialNo: e.target.value })} placeholder="A12345678" /></div>
                                <div className="space-y-2"><Label>Düzenlenen Yer</Label><Input value={formData.idIssuePlace ?? ""} onChange={(e) => setFormData({ ...formData, idIssuePlace: e.target.value })} /></div>
                                <div className="space-y-2"><Label>Düzenlenme Tarihi</Label><Input value={formData.idIssueDate ?? ""} onChange={(e) => setFormData({ ...formData, idIssueDate: e.target.value })} placeholder="GG/AA/YYYY" /></div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2"><Camera className="h-4 w-4" /> Kimlik ön yüz</Label>
                                    <PhotoInput onChange={(e) => {
                                        const file = e.target.files?.[0] ?? null;
                                        setIdFrontFile(file);
                                        if (file) setIdFrontPreview(URL.createObjectURL(file));
                                        else setIdFrontPreview(null);
                                    }} labelCamera="Fotoğraf çek" labelGallery="Galeriden seç" />
                                    {(idFrontPreview || (editingCustomerId && formData.idFrontUrl)) && (
                                        <div className="mt-2 relative inline-block">
                                            <img src={idFrontPreview || formData.idFrontUrl} alt="Kimlik ön" className="h-20 w-32 object-cover rounded border" />
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2"><Camera className="h-4 w-4" /> Kimlik arka yüz</Label>
                                    <PhotoInput onChange={(e) => {
                                        const file = e.target.files?.[0] ?? null;
                                        setIdBackFile(file);
                                        if (file) setIdBackPreview(URL.createObjectURL(file));
                                        else setIdBackPreview(null);
                                    }} labelCamera="Fotoğraf çek" labelGallery="Galeriden seç" />
                                    {(idBackPreview || (editingCustomerId && formData.idBackUrl)) && (
                                        <div className="mt-2 relative inline-block">
                                            <img src={idBackPreview || formData.idBackUrl} alt="Kimlik arka" className="h-20 w-32 object-cover rounded border" />
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mt-4"><IdCard className="h-4 w-4" /> Ehliyet Bilgileri</div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2"><Camera className="h-4 w-4" /> Ehliyet ön yüz</Label>
                                    <PhotoInput onChange={(e) => {
                                        const file = e.target.files?.[0] ?? null;
                                        setDriverLicenseFrontFile(file);
                                        if (file) setDriverLicenseFrontPreview(URL.createObjectURL(file));
                                        else setDriverLicenseFrontPreview(null);
                                    }} labelCamera="Fotoğraf çek" labelGallery="Galeriden seç" />
                                    {(driverLicenseFrontPreview || (editingCustomerId && formData.driverLicenseFrontUrl)) && (
                                        <div className="mt-2 relative inline-block">
                                            <img src={driverLicenseFrontPreview || formData.driverLicenseFrontUrl} alt="Ehliyet ön" className="h-20 w-32 object-cover rounded border" />
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2"><Camera className="h-4 w-4" /> Ehliyet arka yüz</Label>
                                    <PhotoInput onChange={(e) => {
                                        const file = e.target.files?.[0] ?? null;
                                        setDriverLicenseBackFile(file);
                                        if (file) setDriverLicenseBackPreview(URL.createObjectURL(file));
                                        else setDriverLicenseBackPreview(null);
                                    }} labelCamera="Fotoğraf çek" labelGallery="Galeriden seç" />
                                    {(driverLicenseBackPreview || (editingCustomerId && formData.driverLicenseBackUrl)) && (
                                        <div className="mt-2 relative inline-block">
                                            <img src={driverLicenseBackPreview || formData.driverLicenseBackUrl} alt="Ehliyet arka" className="h-20 w-32 object-cover rounded border" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="submit" disabled={uploading}>
                                {uploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Kaydediliyor...</> : editingCustomerId ? "Güncelle" : "Kaydet"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* MÜŞTERİ DETAY */}
            <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
                <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><IdCard className="h-5 w-5" /> Müşteri Bilgileri</DialogTitle>
                        <DialogDescription>{selectedCustomer?.name}</DialogDescription>
                    </DialogHeader>
                    {selectedCustomer && (
                        <div className="space-y-6 py-2">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div><span className="text-slate-500">Ad Soyad</span><p className="font-medium">{selectedCustomer.name}</p></div>
                                <div><span className="text-slate-500">E-posta</span><p className="font-medium">{selectedCustomer.email}</p></div>
                                <div><span className="text-slate-500">Telefon</span><p className="font-medium">{selectedCustomer.phone}</p></div>
                                {selectedCustomer.invoiceType !== "corporate" && <div><span className="text-slate-500">TC Kimlik No</span><p className="font-medium font-mono">{selectedCustomer.tckn}</p></div>}
                                <div><span className="text-slate-500">Ehliyet Sınıfı</span><p className="font-medium">{selectedCustomer.driverLicenseClass}</p></div>
                                <div><span className="text-slate-500">Müşteri Tipi</span><p className="font-medium">{selectedCustomer.invoiceType === "corporate" ? "Kurumsal" : "Bireysel"}</p></div>
                                {selectedCustomer.invoiceType === "corporate" && <div><span className="text-slate-500">Firma Ünvanı</span><p className="font-medium">{selectedCustomer.companyName || "-"}</p></div>}
                                {selectedCustomer.invoiceType === "corporate" && <div><span className="text-slate-500">Vergi Dairesi</span><p className="font-medium">{selectedCustomer.taxOffice || "-"}</p></div>}
                                {selectedCustomer.invoiceType === "corporate" && <div><span className="text-slate-500">VKN</span><p className="font-medium font-mono">{selectedCustomer.taxNumber || "-"}</p></div>}
                                {selectedCustomer.invoiceType === "corporate" && <div><span className="text-slate-500">MERSIS</span><p className="font-medium font-mono">{selectedCustomer.mersisNo || "-"}</p></div>}
                            </div>

                            {(selectedCustomer.idFrontUrl || selectedCustomer.idBackUrl) && (
                                <div className="border-t pt-4">
                                    <p className="text-sm font-medium text-slate-700 mb-3">Kimlik Fotoğrafları</p>
                                    <div className="grid grid-cols-2 gap-4">
                                        {selectedCustomer.idFrontUrl ? (
                                            <a href={selectedCustomer.idFrontUrl} target="_blank" rel="noopener noreferrer" className="block rounded-lg border overflow-hidden bg-slate-100">
                                                <img src={selectedCustomer.idFrontUrl} alt="Kimlik ön" className="w-full h-auto max-h-64 object-contain" />
                                            </a>
                                        ) : <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 h-32 flex items-center justify-center text-slate-400 text-sm">Ön yüz yok</div>}
                                        {selectedCustomer.idBackUrl ? (
                                            <a href={selectedCustomer.idBackUrl} target="_blank" rel="noopener noreferrer" className="block rounded-lg border overflow-hidden bg-slate-100">
                                                <img src={selectedCustomer.idBackUrl} alt="Kimlik arka" className="w-full h-auto max-h-64 object-contain" />
                                            </a>
                                        ) : <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 h-32 flex items-center justify-center text-slate-400 text-sm">Arka yüz yok</div>}
                                    </div>
                                </div>
                            )}

                            {(selectedCustomer.driverLicenseFrontUrl || selectedCustomer.driverLicenseBackUrl) && (
                                <div className="border-t pt-4">
                                    <p className="text-sm font-medium text-slate-700 mb-3">Ehliyet Fotoğrafları</p>
                                    <div className="grid grid-cols-2 gap-4">
                                        {selectedCustomer.driverLicenseFrontUrl ? (
                                            <a href={selectedCustomer.driverLicenseFrontUrl} target="_blank" rel="noopener noreferrer" className="block rounded-lg border overflow-hidden bg-slate-100">
                                                <img src={selectedCustomer.driverLicenseFrontUrl} alt="Ehliyet ön" className="w-full h-auto max-h-64 object-contain" />
                                            </a>
                                        ) : <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 h-32 flex items-center justify-center text-slate-400 text-sm">Ön yüz yok</div>}
                                        {selectedCustomer.driverLicenseBackUrl ? (
                                            <a href={selectedCustomer.driverLicenseBackUrl} target="_blank" rel="noopener noreferrer" className="block rounded-lg border overflow-hidden bg-slate-100">
                                                <img src={selectedCustomer.driverLicenseBackUrl} alt="Ehliyet arka" className="w-full h-auto max-h-64 object-contain" />
                                            </a>
                                        ) : <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 h-32 flex items-center justify-center text-slate-400 text-sm">Arka yüz yok</div>}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* CARİ HESAP */}
            <Dialog open={cariOpen} onOpenChange={setCariOpen}>
                <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto bg-slate-50">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Wallet className="h-5 w-5 text-blue-600" /> Cari Hesap
                        </DialogTitle>
                        <DialogDescription>{selectedCustomer?.name} — Borç, alacak ve tahsilat kayıtları</DialogDescription>
                    </DialogHeader>
                    {selectedCustomer && (
                        <div className="space-y-4 py-2">
                            {/* ÖZET KARTLAR */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <Card className="border-red-100">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-2 text-red-600 mb-1">
                                            <ArrowUpCircle className="w-4 h-4" />
                                            <span className="text-xs font-medium">Toplam Borç</span>
                                        </div>
                                        <p className="text-lg font-bold text-red-700">{formatMoney(cariSummary.toplamBorc)}</p>
                                    </CardContent>
                                </Card>
                                <Card className="border-emerald-100">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-2 text-emerald-600 mb-1">
                                            <ArrowDownCircle className="w-4 h-4" />
                                            <span className="text-xs font-medium">Toplam Tahsilat</span>
                                        </div>
                                        <p className="text-lg font-bold text-emerald-700">{formatMoney(cariSummary.toplamAlacak)}</p>
                                    </CardContent>
                                </Card>
                                <Card className={cariSummary.bakiye > 0 ? "border-orange-200 bg-orange-50/50" : "border-emerald-200 bg-emerald-50/50"}>
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            {cariSummary.bakiye > 0 ? <TrendingDown className="w-4 h-4 text-orange-600" /> : <TrendingUp className="w-4 h-4 text-emerald-600" />}
                                            <span className="text-xs font-medium text-slate-600">Bakiye</span>
                                        </div>
                                        <p className={`text-lg font-bold ${cariSummary.bakiye > 0 ? "text-orange-700" : "text-emerald-700"}`}>
                                            {cariSummary.bakiye > 0 ? formatMoney(cariSummary.bakiye) : cariSummary.bakiye === 0 ? "₺0,00" : `−${formatMoney(Math.abs(cariSummary.bakiye))}`}
                                        </p>
                                        <p className="text-[10px] text-slate-500 mt-0.5">{cariSummary.bakiye > 0 ? "Müşteri borçlu" : cariSummary.bakiye === 0 ? "Dengede" : "Müşteri alacaklı"}</p>
                                    </CardContent>
                                </Card>
                                <Card className="border-amber-100">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-2 text-amber-600 mb-1">
                                            <Receipt className="w-4 h-4" />
                                            <span className="text-xs font-medium">Bekleyen Borç</span>
                                        </div>
                                        <p className="text-lg font-bold text-amber-700">{formatMoney(cariSummary.bekleyenBorc)}</p>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* EYLEM BUTONLARI */}
                            <div className="flex gap-2">
                                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => { setTahsilatForm({ amount: "", category: "nakit", description: "" }); setTahsilatOpen(true); }}>
                                    <CreditCard className="w-4 h-4 mr-1.5" /> Tahsilat Ekle
                                </Button>
                                <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" onClick={() => { setBorcForm({ amount: "", category: "kiralama", description: "", vehiclePlate: "" }); setBorcOpen(true); }}>
                                    <Banknote className="w-4 h-4 mr-1.5" /> Borç Ekle
                                </Button>
                            </div>

                            {/* FİLTRE */}
                            <div className="flex items-center gap-2">
                                <Filter className="w-4 h-4 text-slate-400" />
                                {(["all", "borc", "alacak"] as const).map((f) => (
                                    <Button key={f} type="button" size="sm" variant={cariFilter === f ? "default" : "outline"} onClick={() => setCariFilter(f)} className="h-7 text-xs">
                                        {f === "all" ? "Tümü" : f === "borc" ? "Borçlar" : "Tahsilatlar"}
                                    </Button>
                                ))}
                                <span className="text-xs text-slate-400 ml-auto">{filteredTransactions.length} kayıt</span>
                            </div>

                            {/* İŞLEM LİSTESİ */}
                            {cariLoading ? (
                                <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
                            ) : filteredTransactions.length === 0 ? (
                                <div className="bg-white border rounded-lg p-8 text-center text-slate-500">Bu müşteriye ait cari hareket bulunamadı.</div>
                            ) : (
                                <div className="space-y-2">
                                    {filteredTransactions.map((tx) => {
                                        const isBorc = tx.type !== "alacak";
                                        return (
                                            <div key={tx.id} className={`bg-white rounded-lg border p-3 flex items-center gap-3 shadow-sm ${isBorc ? "border-l-4 border-l-red-400" : "border-l-4 border-l-emerald-400"}`}>
                                                <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${isBorc ? "bg-red-50 text-red-500" : "bg-emerald-50 text-emerald-500"}`}>
                                                    {isBorc ? <ArrowUpCircle className="w-4 h-4" /> : <ArrowDownCircle className="w-4 h-4" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">{CATEGORY_LABELS[tx.category] || tx.category}</Badge>
                                                        {isBorc && tx.status === "unpaid" && <Badge className="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0">Bekliyor</Badge>}
                                                        {isBorc && tx.status === "paid" && <Badge className="bg-emerald-100 text-emerald-700 text-[10px] px-1.5 py-0">Ödendi</Badge>}
                                                        {tx.vehiclePlate && <span className="text-[10px] text-slate-400 font-mono">{tx.vehiclePlate}</span>}
                                                    </div>
                                                    <p className="text-sm text-slate-700 truncate">{tx.description}</p>
                                                    <p className="text-[10px] text-slate-400 mt-0.5">{formatDate(tx.date)}</p>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className={`text-sm font-bold whitespace-nowrap ${isBorc ? "text-red-600" : "text-emerald-600"}`}>
                                                        {isBorc ? "+" : "−"}{formatMoney(tx.amount)}
                                                    </span>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><MoreHorizontal className="w-3.5 h-3.5" /></Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            {isBorc && tx.status === "unpaid" && (
                                                                <DropdownMenuItem onClick={() => handleMarkPaid(tx.id)}>
                                                                    <CheckCircle className="mr-2 h-3.5 w-3.5" /> Ödendi İşaretle
                                                                </DropdownMenuItem>
                                                            )}
                                                            <DropdownMenuItem onClick={() => handleDeleteTransaction(tx.id)} className="text-red-600">
                                                                <Trash2 className="mr-2 h-3.5 w-3.5" /> Sil
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* TAHSİLAT EKLE */}
            <Dialog open={tahsilatOpen} onOpenChange={setTahsilatOpen}>
                <DialogContent className="sm:max-w-[420px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-emerald-600" /> Tahsilat Ekle</DialogTitle>
                        <DialogDescription>{selectedCustomer?.name} hesabına alacak kaydı</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>Tutar (₺)</Label>
                            <Input type="number" min="0" step="0.01" placeholder="0.00" value={tahsilatForm.amount} onChange={(e) => setTahsilatForm({ ...tahsilatForm, amount: e.target.value })} className="text-lg font-semibold" />
                        </div>
                        <div className="space-y-2">
                            <Label>Ödeme Yöntemi</Label>
                            <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={tahsilatForm.category} onChange={(e) => setTahsilatForm({ ...tahsilatForm, category: e.target.value as TransactionCategory })}>
                                {ALACAK_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label>Açıklama (opsiyonel)</Label>
                            <Input value={tahsilatForm.description} onChange={(e) => setTahsilatForm({ ...tahsilatForm, description: e.target.value })} placeholder="Not ekleyin..." />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setTahsilatOpen(false)}>İptal</Button>
                        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleAddTahsilat}>Tahsilat Kaydet</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* BORÇ EKLE */}
            <Dialog open={borcOpen} onOpenChange={setBorcOpen}>
                <DialogContent className="sm:max-w-[420px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><Banknote className="h-5 w-5 text-red-600" /> Borç Ekle</DialogTitle>
                        <DialogDescription>{selectedCustomer?.name} hesabına borç kaydı</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>Tutar (₺)</Label>
                            <Input type="number" min="0" step="0.01" placeholder="0.00" value={borcForm.amount} onChange={(e) => setBorcForm({ ...borcForm, amount: e.target.value })} className="text-lg font-semibold" />
                        </div>
                        <div className="space-y-2">
                            <Label>Borç Kategorisi</Label>
                            <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={borcForm.category} onChange={(e) => setBorcForm({ ...borcForm, category: e.target.value as TransactionCategory })}>
                                {BORC_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label>Araç Plaka (opsiyonel)</Label>
                            <Input value={borcForm.vehiclePlate} onChange={(e) => setBorcForm({ ...borcForm, vehiclePlate: e.target.value })} placeholder="01 XX 001" />
                        </div>
                        <div className="space-y-2">
                            <Label>Açıklama (opsiyonel)</Label>
                            <Input value={borcForm.description} onChange={(e) => setBorcForm({ ...borcForm, description: e.target.value })} placeholder="Not ekleyin..." />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setBorcOpen(false)}>İptal</Button>
                        <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleAddBorc}>Borç Kaydet</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
