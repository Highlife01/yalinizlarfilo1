import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
    collection,
    getDocs,
    addDoc,
    doc,
    query,
    orderBy,
    where,
    writeBatch,
    updateDoc,
    deleteField,
} from "firebase/firestore";
import {
    ref,
    uploadBytes,
    getDownloadURL,
} from "firebase/storage";
import { db, storage } from "@/integrations/firebase/client";
import {
    Plus,
    Search,
    Banknote,
    Trash2,
    RefreshCw,
    Download,
    FileText,
    CreditCard,
    Wallet,
    TrendingUp,
    Calendar,
    Eye,
    DollarSign,
    CheckCircle,
    Pencil,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TahsilatMatrix } from "./TahsilatMatrix";
import { PhotoInput } from "@/components/ui/photo-input";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export type PaymentMethod = "nakit" | "havale" | "kredi_karti" | "diger";

export type Payment = {
    id: string;
    vehiclePlate: string;
    customerName: string;
    amount: number;
    date: string;
    paymentMethod: PaymentMethod;
    description: string;
    dekontUrl?: string;
    createdAt?: string;
};

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
    nakit: "Nakit",
    havale: "Havale / EFT",
    kredi_karti: "Kredi Kartı",
    diger: "Diğer",
};

const formatMoney = (value: number) =>
    new Intl.NumberFormat("tr-TR", {
        style: "currency",
        currency: "TRY",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);

const toInputDate = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
};

/** Türkçe binlik nokta ayıracını kaldırıp sayıya çevirir: "42.000" → 42000 */
const parseTurkishNumber = (val: string): number => {
    const cleaned = val.replace(/\./g, "").replace(",", ".").trim();
    const parsed = Number(cleaned);
    return isNaN(parsed) ? 0 : parsed;
};

const getMonthKey = (dateStr: string) => dateStr.slice(0, 7);

export const Tahsilat = () => {
    const { toast } = useToast();
    const [searchParams, setSearchParams] = useSearchParams();
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [methodFilter, setMethodFilter] = useState("all");
    const [addOpen, setAddOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [dekontFile, setDekontFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    // Müşteri arama state
    const [customers, setCustomers] = useState<Array<{ id: string; name: string; phone: string }>>([]);
    const [customerSearch, setCustomerSearch] = useState("");
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

    useEffect(() => {
        const fetchCustomers = async () => {
            try {
                const snap = await getDocs(query(collection(db, "customers"), orderBy("name")));
                setCustomers(snap.docs.map(d => ({ id: d.id, name: String(d.data().name || ""), phone: String(d.data().phone || "") })));
            } catch { /* silent */ }
        };
        void fetchCustomers();
    }, []);

    const filteredCustomers = customers.filter(c =>
        customerSearch.trim().length > 0 &&
        (c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
            c.phone.includes(customerSearch))
    ).slice(0, 8);

    const [form, setForm] = useState({
        vehiclePlate: "",
        customerName: "",
        amountRaw: "",     // kullanıcının yazdığı ham metin
        amount: 0,         // parse edilmiş numeričk değer
        date: toInputDate(new Date()),
        paymentMethod: "nakit" as PaymentMethod,
        description: "",
    });

    const fetchPayments = useCallback(async () => {
        setLoading(true);
        try {
            const q = query(collection(db, "payments"), orderBy("date", "desc"));
            const snap = await getDocs(q);
            const list: Payment[] = snap.docs.map((d) => {
                const data = d.data();
                return {
                    id: d.id,
                    vehiclePlate: String(data.vehiclePlate || ""),
                    customerName: String(data.customerName || ""),
                    amount: Number(data.amount || 0),
                    date: String(data.date || ""),
                    paymentMethod: (data.paymentMethod as PaymentMethod) || "nakit",
                    description: String(data.description || ""),
                    dekontUrl: data.dekontUrl ? String(data.dekontUrl) : undefined,
                    createdAt: data.createdAt ? String(data.createdAt) : undefined,
                };
            });
            setPayments(list);
        } catch (error) {
            console.error("Tahsilat fetch error:", error);
            toast({ title: "Hata", description: "Tahsilatlar yüklenemedi.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        void fetchPayments();
    }, [fetchPayments]);

    // Onaylanan siparişten gelindiyse: URL'de customer (ve isteğe bağlı plate) ile Yeni Tahsilat Ekle'yi aç ve sözleşme sahibini otomatik seç
    useEffect(() => {
        const add = searchParams.get("add");
        const customer = searchParams.get("customer");
        const plate = searchParams.get("plate");
        if (add === "1" && customer) {
            setForm((prev) => ({
                ...prev,
                customerName: decodeURIComponent(customer),
                ...(plate ? { vehiclePlate: decodeURIComponent(plate).toUpperCase() } : {}),
            }));
            setAddOpen(true);
            // Parametreleri temizle (tekrar açılışta form boş açılsın)
            setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                next.delete("add");
                next.delete("customer");
                next.delete("plate");
                return next;
            }, { replace: true });
        }
    }, [searchParams, setSearchParams]);

    const handleDekontChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) {
            toast({ title: "Hata", description: "Dosya boyutu 10MB'dan büyük olamaz.", variant: "destructive" });
            return;
        }
        setDekontFile(file);
        setPreviewUrl(URL.createObjectURL(file));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.customerName.trim() || !form.vehiclePlate.trim() || form.amount <= 0) {
            toast({ title: "Eksik bilgi", description: "Müşteri, plaka ve tutar zorunludur.", variant: "destructive" });
            return;
        }

        setSaving(true);
        try {
            let dekontUrl: string | undefined;

            if (dekontFile) {
                setUploading(true);
                const storageRef = ref(
                    storage,
                    `dekontlar/${Date.now()}_${dekontFile.name}`
                );
                const snapshot = await uploadBytes(storageRef, dekontFile, {
                    contentType: dekontFile.type,
                });
                dekontUrl = await getDownloadURL(snapshot.ref);
                setUploading(false);
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const payload: any = {
                vehiclePlate: form.vehiclePlate.trim().toUpperCase(),
                customerName: form.customerName.trim(),
                amount: form.amount,
                date: form.date,
                paymentMethod: form.paymentMethod,
                description: form.description.trim(),
            };

            if (dekontUrl) {
                payload.dekontUrl = dekontUrl;
            } else if (!previewUrl && editingPaymentId) {
                // Düzenleme modunda 'Kaldır' diyerek silinen mevcut dekont alanı update için temizleniyor
                payload.dekontUrl = deleteField();
            }

            let paymentDocId = editingPaymentId;

            if (editingPaymentId) {
                await updateDoc(doc(db, "payments", editingPaymentId), payload);
            } else {
                const addedDoc = await addDoc(collection(db, "payments"), {
                    ...payload,
                    createdAt: new Date().toISOString(),
                });
                paymentDocId = addedDoc.id;
            }

            // Cari hesaba alacak kaydı oluştur / güncelle
            try {
                const custQ = query(collection(db, "customers"), where("name", "==", form.customerName.trim()));
                const custSnap = await getDocs(custQ);
                const matchedCustomer = custSnap.docs[0];
                if (matchedCustomer) {
                    const debtPayload = {
                        customerId: matchedCustomer.id,
                        customerName: form.customerName.trim(),
                        type: "alacak",
                        category: form.paymentMethod === "nakit" ? "nakit" : form.paymentMethod === "havale" ? "havale" : form.paymentMethod === "kredi_karti" ? "kredi_karti" : "diger",
                        amount: form.amount,
                        description: `Tahsilat - ${form.vehiclePlate.trim().toUpperCase()}${form.description.trim() ? " - " + form.description.trim() : ""}`,
                        date: form.date,
                        vehiclePlate: form.vehiclePlate.trim().toUpperCase(),
                        status: "completed",
                        source: "tahsilat",
                    };

                    if (editingPaymentId) {
                        const linkedQ = query(collection(db, "customer_debts"), where("paymentId", "==", editingPaymentId));
                        const linkedSnap = await getDocs(linkedQ);
                        if (!linkedSnap.empty) {
                            await updateDoc(linkedSnap.docs[0].ref, debtPayload);
                        } else {
                            await addDoc(collection(db, "customer_debts"), {
                                ...debtPayload,
                                paymentId: paymentDocId,
                                createdAt: new Date().toISOString(),
                            });
                        }
                    } else {
                        await addDoc(collection(db, "customer_debts"), {
                            ...debtPayload,
                            paymentId: paymentDocId,
                            createdAt: new Date().toISOString(),
                        });
                    }
                }
            } catch (syncErr) {
                console.error("Cari sync error (non-blocking):", syncErr);
            }

            toast({ title: editingPaymentId ? "Güncellendi" : "Kaydedildi", description: `${formatMoney(form.amount)} tahsilat kaydı ${editingPaymentId ? 'güncellendi' : 'oluşturuldu'}.` });
            setAddOpen(false);
            resetForm();
            void fetchPayments();
        } catch (error) {
            console.error("Save payment error:", error);
            toast({ title: "Hata", description: "Tahsilat kaydedilemedi.", variant: "destructive" });
        } finally {
            setSaving(false);
            setUploading(false);
        }
    };

    const handleEdit = (p: Payment) => {
        setForm({
            vehiclePlate: p.vehiclePlate,
            customerName: p.customerName,
            amountRaw: p.amount.toString(),
            amount: p.amount,
            date: p.date,
            paymentMethod: p.paymentMethod,
            description: p.description,
        });
        setEditingPaymentId(p.id);
        setPreviewUrl(p.dekontUrl || null);
        setAddOpen(true);
    };

    const resetForm = () => {
        setForm({
            vehiclePlate: "",
            customerName: "",
            amountRaw: "",
            amount: 0,
            date: toInputDate(new Date()),
            paymentMethod: "nakit",
            description: "",
        });
        setDekontFile(null);
        setCustomerSearch("");
        setShowCustomerDropdown(false);
        setEditingPaymentId(null);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
    };

    const handleDelete = async (id: string) => {
        setDeletingId(id);
        try {
            const batch = writeBatch(db);
            batch.delete(doc(db, "payments", id));

            // Bağlı cari hesap alacak kaydını da sil
            try {
                const linkedQ = query(collection(db, "customer_debts"), where("paymentId", "==", id));
                const linkedSnap = await getDocs(linkedQ);
                linkedSnap.forEach((d) => batch.delete(d.ref));
            } catch { /* silent */ }

            await batch.commit();
            setPayments((prev) => prev.filter((p) => p.id !== id));
            toast({ title: "Silindi", description: "Tahsilat ve bağlı cari kayıtları silindi." });
        } catch (error) {
            console.error("Delete payment error:", error);
            toast({ title: "Hata", description: "Silinemedi.", variant: "destructive" });
        } finally {
            setDeletingId(null);
        }
    };

    const filtered = useMemo(() => {
        return payments.filter((p) => {
            const term = searchTerm.toLowerCase();
            const matchSearch =
                p.customerName.toLowerCase().includes(term) ||
                p.vehiclePlate.toLowerCase().includes(term) ||
                p.description.toLowerCase().includes(term);
            const matchMethod = methodFilter === "all" || p.paymentMethod === methodFilter;
            return matchSearch && matchMethod;
        });
    }, [payments, searchTerm, methodFilter]);

    const totalCollected = useMemo(() => payments.reduce((s, p) => s + p.amount, 0), [payments]);

    const thisMonthCollected = useMemo(() => {
        const currentMonth = getMonthKey(toInputDate(new Date()));
        return payments
            .filter((p) => getMonthKey(p.date) === currentMonth)
            .reduce((s, p) => s + p.amount, 0);
    }, [payments]);

    const uniqueCustomers = useMemo(() => new Set(payments.map((p) => p.customerName)).size, [payments]);

    const handleExportExcel = async () => {
        try {
            const { utils, writeFile } = await import("xlsx");
            const rows = filtered.map((p) => ({
                "Müşteri": p.customerName,
                "Plaka": p.vehiclePlate,
                "Tutar (TL)": p.amount,
                "Tarih": p.date,
                "Ödeme Yöntemi": PAYMENT_METHOD_LABELS[p.paymentMethod],
                "Açıklama": p.description,
                "Dekont": p.dekontUrl ? "Var" : "Yok",
            }));
            const ws = utils.json_to_sheet(rows);
            const wb = utils.book_new();
            utils.book_append_sheet(wb, ws, "Tahsilat");
            writeFile(wb, `tahsilat_${toInputDate(new Date())}.xlsx`);
            toast({ title: "İndirildi", description: "Excel dosyası oluşturuldu." });
        } catch {
            toast({ title: "Hata", description: "Excel oluşturulamadı.", variant: "destructive" });
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">Tahsilat Takibi</h2>
                    <p className="text-slate-500">
                        Gerçek tahsil edilen tutarları ve araç-ay matrisini takip edin.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={handleExportExcel} disabled={filtered.length === 0}>
                        <Download className="w-4 h-4 mr-2" /> Excel
                    </Button>
                    <Button onClick={() => { resetForm(); setAddOpen(true); }}>
                        <Plus className="w-4 h-4 mr-2" /> Tahsilat Ekle
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="matrix" className="space-y-6">
                <TabsList className="bg-white border shadow-sm">
                    <TabsTrigger value="matrix" className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">Tahsilat Tablosu (Matris)</TabsTrigger>
                    <TabsTrigger value="list" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">Tahsilat Geçmişi (Liste)</TabsTrigger>
                </TabsList>

                <TabsContent value="matrix" className="m-0 focus-visible:outline-none">
                    <TahsilatMatrix 
                        payments={payments} 
                        onEdit={handleEdit}
                        onDelete={(id) => {
                            if (window.confirm("Bu tahsilatı silmek istediğinize emin misiniz?")) {
                                void handleDelete(id);
                            }
                        }}
                        onAdd={(plate, customer) => {
                            resetForm();
                            setForm(prev => ({ 
                                ...prev, 
                                vehiclePlate: plate.toUpperCase(), 
                                customerName: customer || "" 
                            }));
                            setAddOpen(true);
                        }}
                    />
                </TabsContent>

                <TabsContent value="list" className="m-0 space-y-6 focus-visible:outline-none">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-emerald-200 bg-emerald-50/40">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Toplam Tahsilat</CardTitle>
                        <Banknote className="w-4 h-4 text-emerald-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-700">{formatMoney(totalCollected)}</div>
                        <p className="text-xs text-slate-500">Tüm zamanlar</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Bu Ay Tahsilat</CardTitle>
                        <Calendar className="w-4 h-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-700">{formatMoney(thisMonthCollected)}</div>
                        <p className="text-xs text-slate-500">{new Date().toLocaleDateString("tr-TR", { month: "long", year: "numeric" })}</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Toplam İşlem</CardTitle>
                        <TrendingUp className="w-4 h-4 text-indigo-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{payments.length}</div>
                        <p className="text-xs text-slate-500">tahsilat kaydı</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Müşteri Sayısı</CardTitle>
                        <Wallet className="w-4 h-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{uniqueCustomers}</div>
                        <p className="text-xs text-slate-500">farklı müşteri</p>
                    </CardContent>
                </Card>
            </div>

            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row gap-3 items-center bg-white p-4 rounded-lg border shadow-sm">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Müşteri, plaka veya açıklama ara..."
                        className="pl-9 w-full"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Select value={methodFilter} onValueChange={setMethodFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Ödeme Yöntemi" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tümü</SelectItem>
                        <SelectItem value="nakit">Nakit</SelectItem>
                        <SelectItem value="havale">Havale / EFT</SelectItem>
                        <SelectItem value="kredi_karti">Kredi Kartı</SelectItem>
                        <SelectItem value="diger">Diğer</SelectItem>
                    </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={() => void fetchPayments()} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                </Button>
            </div>

            {/* Payments Table */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2">
                        <Banknote className="w-5 h-5" /> Tahsilat Kayıtları
                    </CardTitle>
                    <CardDescription>
                        Gerçek tahsil edilen tutarlar. Bu veriler dashboard ciro hesabına yansır.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="py-10 text-center text-slate-500">Yükleniyor...</div>
                    ) : (
                        <div className="rounded-md border overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50">
                                        <TableHead className="font-semibold">Tarih</TableHead>
                                        <TableHead className="font-semibold">Müşteri</TableHead>
                                        <TableHead className="font-semibold">Plaka</TableHead>
                                        <TableHead className="font-semibold text-right">Tutar</TableHead>
                                        <TableHead className="font-semibold">Ödeme</TableHead>
                                        <TableHead className="font-semibold">Açıklama</TableHead>
                                        <TableHead className="font-semibold text-center">Dekont</TableHead>
                                        <TableHead className="font-semibold text-right">İşlem</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filtered.map((p) => (
                                        <TableRow key={p.id} className="hover:bg-slate-50">
                                            <TableCell className="whitespace-nowrap">
                                                <div className="flex items-center gap-1.5 text-sm text-slate-600">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    {new Date(p.date).toLocaleDateString("tr-TR")}
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-medium">{p.customerName}</TableCell>
                                            <TableCell>
                                                <span className="font-mono text-sm">{p.vehiclePlate}</span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <span className="font-bold text-emerald-700">{formatMoney(p.amount)}</span>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-xs whitespace-nowrap">
                                                    {p.paymentMethod === "nakit" && <Banknote className="w-3 h-3 mr-1" />}
                                                    {p.paymentMethod === "havale" && <DollarSign className="w-3 h-3 mr-1" />}
                                                    {p.paymentMethod === "kredi_karti" && <CreditCard className="w-3 h-3 mr-1" />}
                                                    {PAYMENT_METHOD_LABELS[p.paymentMethod]}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm text-slate-600 max-w-[200px] truncate block">
                                                    {p.description || "—"}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {p.dekontUrl ? (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="gap-1 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                                                        asChild
                                                    >
                                                        <a href={p.dekontUrl} target="_blank" rel="noopener noreferrer">
                                                            <Eye className="w-3.5 h-3.5" /> Görüntüle
                                                        </a>
                                                    </Button>
                                                ) : (
                                                    <span className="text-xs text-slate-400">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 mr-2"
                                                    onClick={() => handleEdit(p)}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-slate-500 hover:bg-red-50 hover:text-red-600"
                                                            disabled={deletingId === p.id}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Tahsilat silinsin mi?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                {p.customerName} - {formatMoney(p.amount)} tahsilat kaydı silinecek. Bu işlem geri alınamaz.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>İptal</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => void handleDelete(p.id)}
                                                                className="bg-red-600 hover:bg-red-700"
                                                            >
                                                                Evet, sil
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {filtered.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={8} className="py-10 text-center text-slate-500">
                                                Tahsilat kaydı bulunamadı.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
            </TabsContent>
            </Tabs>

            {/* Add Payment Dialog */}
            <Dialog open={addOpen} onOpenChange={(open) => { setAddOpen(open); if (!open) resetForm(); }}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {editingPaymentId ? <Pencil className="w-5 h-5 text-emerald-600" /> : <CheckCircle className="w-5 h-5 text-emerald-600" />}
                            {editingPaymentId ? "Tahsilat Düzenle" : "Yeni Tahsilat Kaydı"}
                        </DialogTitle>
                        <DialogDescription>
                            {editingPaymentId ? "Tahsilat kayıt verilerini güncelleyin." : "Gerçek tahsil edilen tutarı ve dekont bilgisini girin."}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2 col-span-2">
                                <Label>Müşteri *</Label>
                                <div className="relative">
                                    <Input
                                        required
                                        placeholder="Müşteri adı veya telefon ile ara..."
                                        value={customerSearch || form.customerName}
                                        onChange={(e) => {
                                            setCustomerSearch(e.target.value);
                                            setForm({ ...form, customerName: e.target.value });
                                            setShowCustomerDropdown(true);
                                        }}
                                        onFocus={() => setShowCustomerDropdown(true)}
                                        onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                                    />
                                    {showCustomerDropdown && filteredCustomers.length > 0 && (
                                        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                            {filteredCustomers.map(c => (
                                                <button
                                                    key={c.id}
                                                    type="button"
                                                    className="w-full text-left px-3 py-2 hover:bg-slate-100 flex flex-col"
                                                    onMouseDown={() => {
                                                        setForm({ ...form, customerName: c.name });
                                                        setCustomerSearch("");
                                                        setShowCustomerDropdown(false);
                                                    }}
                                                >
                                                    <span className="font-medium text-sm">{c.name}</span>
                                                    <span className="text-xs text-slate-500">{c.phone}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-2 col-span-2">
                                <Label>Araç Plakası *</Label>
                                <Input
                                    required
                                    placeholder="34 XX 000"
                                    className="uppercase"
                                    value={form.vehiclePlate}
                                    onChange={(e) => setForm({ ...form, vehiclePlate: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Tutar (TL) *</Label>
                                <Input
                                    type="text"
                                    inputMode="numeric"
                                    required
                                    placeholder="Örn: 42.000"
                                    value={form.amountRaw}
                                    onChange={(e) => {
                                        const raw = e.target.value;
                                        setForm({ ...form, amountRaw: raw, amount: parseTurkishNumber(raw) });
                                    }}
                                />
                                {form.amount > 0 && (
                                    <p className="text-xs text-emerald-600 font-medium">
                                        = {form.amount.toLocaleString("tr-TR")} TL
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label>Tarih *</Label>
                                <Input
                                    type="date"
                                    required
                                    value={form.date}
                                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Ödeme Yöntemi</Label>
                            <Select
                                value={form.paymentMethod}
                                onValueChange={(v) => setForm({ ...form, paymentMethod: v as PaymentMethod })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="nakit">Nakit</SelectItem>
                                    <SelectItem value="havale">Havale / EFT</SelectItem>
                                    <SelectItem value="kredi_karti">Kredi Kartı</SelectItem>
                                    <SelectItem value="diger">Diğer</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Açıklama</Label>
                            <Textarea
                                placeholder="Aylık kira ödemesi, depozito iadesi vb."
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                            />
                        </div>

                        {/* Dekont Upload */}
                        <div className="space-y-2">
                            <Label>Dekont / Makbuz</Label>
                            <div className="border-2 border-dashed rounded-lg p-4 text-center relative hover:bg-slate-50 transition-colors">
                                {previewUrl ? (
                                    <div className="space-y-2">
                                        {dekontFile ? (
                                            dekontFile.type.startsWith("image/") ? (
                                                <img
                                                    src={previewUrl}
                                                    alt="Dekont"
                                                    className="max-h-40 mx-auto rounded border"
                                                />
                                            ) : (
                                                <div className="flex items-center justify-center gap-2 text-emerald-700">
                                                    <FileText className="w-8 h-8" />
                                                    <span className="text-sm font-medium">{dekontFile.name}</span>
                                                </div>
                                            )
                                        ) : (
                                            <div className="flex flex-col items-center gap-2">
                                                <img src={previewUrl} alt="Aktif Dekont" className="max-h-40 mx-auto rounded border" />
                                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700">Kayıtlı Dekont</Badge>
                                            </div>
                                        )}
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-600"
                                            onClick={() => {
                                                setDekontFile(null);
                                                if (previewUrl) URL.revokeObjectURL(previewUrl);
                                                setPreviewUrl(null);
                                            }}
                                        >
                                            <Trash2 className="w-3 h-3 mr-1" /> Kaldır
                                        </Button>
                                    </div>
                                ) : (
                                    <>
                                        <PhotoInput
                                            variant="cards"
                                            accept="image/*,.pdf"
                                            onChange={handleDekontChange}
                                            disabled={uploading}
                                            loading={uploading}
                                            labelCamera="Fotoğraf çek"
                                            labelGallery="Galeriden seç"
                                        />
                                        <p className="text-xs text-slate-400 mt-2">Dekont fotoğrafı veya PDF. Max 10MB.</p>
                                    </>
                                )}
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                                İptal
                            </Button>
                            <Button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                                {uploading ? "Dekont yükleniyor..." : saving ? "Kaydediliyor..." : "Kaydet"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};
