import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
    collection,
    doc,
    getDocs,
    orderBy,
    query,
    runTransaction,
    updateDoc,
    writeBatch,
    where
} from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import {
    Search,
    Calendar,
    User,
    FileText,
    Download,
    CheckCircle,
    AlertTriangle,
    Trash2,
    RefreshCw,
    BadgeCheck,
    Banknote,
    Save
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { generateInvoicePdf } from "@/utils/exportUtils";

type InvoiceStatus = "pending" | "completed" | "failed";
type InvoiceApprovalStatus = "pending" | "approved";

type Invoice = {
    id: string;
    date: string;
    customerId?: string;
    customerName: string;
    vehiclePlate: string;
    vehicleId?: string;
    invoiceType: "individual" | "corporate";
    customerCompanyName?: string;
    customerTaxNumber?: string;
    kdvRate: number;
    amount: number;
    collectedAmount: number;
    status: InvoiceStatus;
    approvalStatus: InvoiceApprovalStatus;
    approvedAt?: string;
    invoiceUrl?: string;
};

export const Invoices = () => {
    const { toast } = useToast();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [editingTahsilat, setEditingTahsilat] = useState<Record<string, string>>({});
    const [savingTahsilat, setSavingTahsilat] = useState<string | null>(null);

    const parseAmount = (data: Record<string, unknown>) => {
        const rawAmount = Number(data.invoiceAmount ?? data.bookingTotalPrice ?? data.totalPrice ?? 0);
        if (!Number.isFinite(rawAmount) || rawAmount <= 0) return 0;
        return Number(rawAmount.toFixed(2));
    };

    const parseApprovalStatus = (data: Record<string, unknown>): InvoiceApprovalStatus => {
        if (data.invoiceApprovalStatus === "approved" || Boolean(data.invoiceApprovedAt)) return "approved";
        return "pending";
    };

    const fetchInvoices = useCallback(async () => {
        setLoading(true);
        try {
            const q = query(collection(db, "vehicle_operations"), orderBy("date", "desc"));
            const snapshot = await getDocs(q);

            const ops = snapshot.docs.map((docSnap) => {
                const data = docSnap.data();
                const approvalStatus = parseApprovalStatus(data as Record<string, unknown>);
                const amount = parseAmount(data as Record<string, unknown>);

                return {
                    id: docSnap.id,
                    date: String(data.date || new Date().toISOString()),
                    customerId: String(data.customerId || ""),
                    customerName: String(data.customerName || "Bilinmiyor"),
                    vehiclePlate: String(data.vehiclePlate || "Bilinmiyor"),
                    vehicleId: String(data.vehicleId || ""),
                    invoiceType: data.customerInvoiceType === "corporate" ? "corporate" : "individual",
                    customerCompanyName: String(data.customerCompanyName || ""),
                    customerTaxNumber: String(data.customerTaxNumber || ""),
                    kdvRate: Number(data.kdvRate || 20),
                    amount,
                    collectedAmount: Number(data.collectedAmount || 0),
                    status: (data.invoiceStatus as InvoiceStatus) || (data.invoiceUrl ? "completed" : "pending"),
                    approvalStatus,
                    approvedAt: String(data.invoiceApprovedAt || ""),
                    invoiceUrl: data.invoiceUrl ? String(data.invoiceUrl) : undefined,
                } as Invoice;
            });

            setInvoices(ops);
        } catch (error) {
            console.error("Fetch invoices error:", error);
            toast({
                title: "Hata",
                description: "Fatura listesi yuklenemedi.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        void fetchInvoices();
    }, [fetchInvoices]);

    const filteredInvoices = invoices.filter((inv) => {
        const term = searchTerm.toLowerCase();
        return (
            inv.customerName.toLowerCase().includes(term) ||
            (inv.customerCompanyName || "").toLowerCase().includes(term) ||
            inv.vehiclePlate.toLowerCase().includes(term)
        );
    });

    const handleApproveInvoice = async (inv: Invoice) => {
        const confirmed = window.confirm("Onaylandiginda bu fatura icin gelir kaydi olusturulacak. Devam edilsin mi?");
        if (!confirmed) return;

        const now = new Date().toISOString();
        setProcessingId(inv.id);
        try {
            let resolvedCustomerId = (inv.customerId || "").trim();
            if (!resolvedCustomerId) {
                const custQ = query(collection(db, "customers"), where("name", "==", inv.customerName));
                const custSnap = await getDocs(custQ);
                resolvedCustomerId = custSnap.docs[0]?.id || "";
            }

            const operationRef = doc(db, "vehicle_operations", inv.id);
            const incomeRef = doc(db, "income_records", inv.id);
            const debtRef = resolvedCustomerId
                ? doc(db, "customer_debts", `invoice_${inv.id}`)
                : null;

            await runTransaction(db, async (tx) => {
                const operationSnap = await tx.get(operationRef);
                if (!operationSnap.exists()) {
                    throw new Error("Operation record not found.");
                }

                tx.update(operationRef, {
                    invoiceApprovalStatus: "approved",
                    invoiceApprovedAt: now,
                    invoiceAmount: inv.amount,
                    incomeCreatedAt: now,
                });

                tx.set(incomeRef, {
                    operationId: inv.id,
                    vehicleId: inv.vehicleId || "",
                    vehiclePlate: inv.vehiclePlate,
                    customerId: resolvedCustomerId || "",
                    customerName: inv.customerName,
                    amount: inv.collectedAmount > 0 ? inv.collectedAmount : inv.amount,
                    invoiceAmount: inv.amount,
                    invoiceType: inv.invoiceType,
                    source: "invoice_approval",
                    operationDate: inv.date,
                    approvedAt: now,
                    createdAt: now,
                }, { merge: true });

                if (debtRef) {
                    tx.set(debtRef, {
                        customerId: resolvedCustomerId,
                        customerName: inv.customerName,
                        type: "borc",
                        category: "kiralama",
                        amount: inv.amount,
                        description: `${inv.vehiclePlate} - Kiralama bedeli (fatura onayi)`,
                        date: now,
                        operationId: inv.id,
                        source: "invoice_approval",
                        sourceId: inv.id,
                        vehiclePlate: inv.vehiclePlate,
                        status: "unpaid",
                        createdAt: now,
                    }, { merge: true });
                }
            });

            setInvoices((prev) =>
                prev.map((item) =>
                    item.id === inv.id
                        ? { ...item, approvalStatus: "approved", approvedAt: now }
                        : item
                )
            );

            toast({
                title: "Onaylandi",
                description: "Fatura muhasebe kayitlari olusturuldu.",
            });
        } catch (error) {
            console.error("Approve invoice error:", error);
            toast({
                title: "Hata",
                description: "Fatura onaylanamadi.",
                variant: "destructive",
            });
        } finally {
            setProcessingId(null);
        }
    };

    const handleDeleteInvoice = async (inv: Invoice) => {
        const confirmed = window.confirm("Bu fatura kaydina bagli operasyon tamamen silinecek. Devam etmek istiyor musunuz?");
        if (!confirmed) return;

        setProcessingId(inv.id);
        try {
            const linkedDebtsQuery = query(collection(db, "customer_debts"), where("operationId", "==", inv.id));
            const linkedDebtsSnap = await getDocs(linkedDebtsQuery);

            const batch = writeBatch(db);
            batch.delete(doc(db, "vehicle_operations", inv.id));
            batch.delete(doc(db, "income_records", inv.id));
            batch.delete(doc(db, "customer_debts", `invoice_${inv.id}`));
            linkedDebtsSnap.forEach((debtDoc) => batch.delete(debtDoc.ref));
            await batch.commit();

            setInvoices((prev) => prev.filter((i) => i.id !== inv.id));
            toast({
                title: "Silindi",
                description: "Fatura ve bagli muhasebe kayitlari silindi.",
            });
        } catch (error) {
            console.error("Delete invoice error:", error);
            toast({
                title: "Hata",
                description: "Fatura silinemedi.",
                variant: "destructive",
            });
        } finally {
            setProcessingId(null);
        }
    };

    const handleSaveTahsilat = async (inv: Invoice) => {
        const rawValue = editingTahsilat[inv.id];
        if (rawValue === undefined) return;

        const parsed = Number(rawValue.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", "."));
        if (!Number.isFinite(parsed) || parsed < 0) {
            toast({
                title: "Hata",
                description: "Gecerli bir tahsilat tutari girin.",
                variant: "destructive",
            });
            return;
        }

        setSavingTahsilat(inv.id);
        try {
            const operationRef = doc(db, "vehicle_operations", inv.id);
            await updateDoc(operationRef, { collectedAmount: parsed });

            if (inv.approvalStatus === "approved") {
                const incomeRef = doc(db, "income_records", inv.id);
                await updateDoc(incomeRef, { amount: parsed });
            }

            setInvoices((prev) =>
                prev.map((item) =>
                    item.id === inv.id ? { ...item, collectedAmount: parsed } : item
                )
            );

            setEditingTahsilat((prev) => {
                const next = { ...prev };
                delete next[inv.id];
                return next;
            });

            toast({
                title: "Kaydedildi",
                description: `Tahsilat: ${parsed.toLocaleString("tr-TR")} TL olarak guncellendi.${inv.approvalStatus === "approved" ? " Ciro kaydi da guncellendi." : ""}`,
            });
        } catch (error) {
            console.error("Save tahsilat error:", error);
            toast({
                title: "Hata",
                description: "Tahsilat kaydedilemedi.",
                variant: "destructive",
            });
        } finally {
            setSavingTahsilat(null);
        }
    };

    const handleFaturaKes = async (inv: Invoice) => {
        const tahsilEdilen = inv.collectedAmount > 0 ? inv.collectedAmount : inv.amount;
        const isCollectedAmount = inv.collectedAmount > 0;
        if (!isCollectedAmount && inv.amount > 0) {
            const ok = window.confirm("Bu kayit icin tahsilat girilmemis. Toplam tutar (" + inv.amount.toLocaleString("tr-TR") + " TL) icin fatura kesilsin mi?");
            if (!ok) return;
        }
        try {
            await generateInvoicePdf({
                customerName: inv.customerName,
                customerCompanyName: inv.customerCompanyName,
                customerTaxNumber: inv.customerTaxNumber,
                vehiclePlate: inv.vehiclePlate,
                date: inv.date,
                amount: tahsilEdilen,
                kdvRate: inv.kdvRate,
                invoiceType: inv.invoiceType,
                isCollectedAmount,
            });
            toast({
                title: "Fatura olusturuldu",
                description: (isCollectedAmount ? "Tahsil edilen " : "") + tahsilEdilen.toLocaleString("tr-TR") + " TL icin PDF indirildi.",
            });
        } catch (e) {
            console.error("Fatura PDF error:", e);
            toast({
                title: "Hata",
                description: "Fatura PDF olusturulamadi.",
                variant: "destructive",
            });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">E-Faturalar</h2>
                    <p className="text-slate-500">Onaylanan faturalar icin gelir kaydi otomatik olusur. Tahsilat alani ile gercek ciroyu takip edin.</p>
                </div>
                <div className="flex w-full md:w-auto items-center gap-2">
                    <div className="relative w-full md:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Musteri veya plaka ara..."
                            className="pl-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button variant="outline" onClick={() => void fetchInvoices()} disabled={loading}>
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    </Button>
                </div>
            </div>

            {/* Özet kartları */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-blue-100 p-2">
                                <FileText className="h-5 w-5 text-blue-700" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Toplam Fatura Tutari</p>
                                <p className="text-xl font-bold text-slate-900">
                                    {invoices.reduce((s, i) => s + i.amount, 0).toLocaleString("tr-TR")} TL
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-emerald-100 p-2">
                                <Banknote className="h-5 w-5 text-emerald-700" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Tahsil Edilen (Ciro)</p>
                                <p className="text-xl font-bold text-emerald-700">
                                    {invoices.reduce((s, i) => s + i.collectedAmount, 0).toLocaleString("tr-TR")} TL
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-amber-100 p-2">
                                <AlertTriangle className="h-5 w-5 text-amber-700" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Tahsil Edilmeyen</p>
                                <p className="text-xl font-bold text-amber-700">
                                    {(invoices.reduce((s, i) => s + i.amount, 0) - invoices.reduce((s, i) => s + i.collectedAmount, 0)).toLocaleString("tr-TR")} TL
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle>Fatura Listesi</CardTitle>
                    <CardDescription>Onay butonuna basildiginda gelir kaydi olusur ve raporlara yansir.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="py-10 text-center text-slate-500 font-medium">Faturalar yukleniyor...</div>
                    ) : (
                        <div className="rounded-md border overflow-hidden bg-white">
                            <Table>
                                <TableHeader className="bg-slate-50">
                                    <TableRow>
                                        <TableHead className="font-semibold">Musteri</TableHead>
                                        <TableHead className="font-semibold">Plaka</TableHead>
                                        <TableHead className="font-semibold">Tarih</TableHead>
                                        <TableHead className="font-semibold">Fatura Tipi</TableHead>
                                        <TableHead className="font-semibold">Tutar</TableHead>
                                        <TableHead className="font-semibold">Tahsilat</TableHead>
                                        <TableHead className="font-semibold text-center">Fatura</TableHead>
                                        <TableHead className="font-semibold text-center">Onay</TableHead>
                                        <TableHead className="font-semibold text-right">Islem</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredInvoices.map((inv) => (
                                        <TableRow key={inv.id} className="hover:bg-slate-50 transition-colors">
                                            <TableCell>
                                                <div className="flex items-start gap-2">
                                                    <User className="h-4 w-4 text-slate-400 mt-0.5" />
                                                    <div className="flex flex-col">
                                                        {inv.invoiceType === "corporate" && inv.customerCompanyName ? (
                                                            <>
                                                                <span className="font-medium text-slate-800">
                                                                    {inv.customerCompanyName}
                                                                </span>
                                                                <span className="text-xs text-slate-500">
                                                                    Yetkili: {inv.customerName}
                                                                </span>
                                                            </>
                                                        ) : (
                                                            <span className="font-medium text-slate-700">
                                                                {inv.customerName}
                                                            </span>
                                                        )}
                                                        {inv.customerTaxNumber && (
                                                            <span className="text-[11px] text-slate-400 font-mono">
                                                                {inv.invoiceType === "corporate" ? "Vergi No" : "TC"}: {inv.customerTaxNumber}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="font-mono text-sm">{inv.vehiclePlate}</span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                                    <Calendar className="h-4 w-4" />
                                                    {new Date(inv.date).toLocaleDateString("tr-TR")}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className={inv.invoiceType === "corporate" ? "bg-blue-50 text-blue-700" : "bg-slate-50 text-slate-700"}
                                                >
                                                    {inv.invoiceType === "corporate" ? "Kurumsal" : "Bireysel"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{inv.amount.toLocaleString("tr-TR")} TL</span>
                                                    <span className="text-xs text-slate-500">KDV: %{inv.kdvRate}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1.5">
                                                    <div className="relative w-28">
                                                        <Banknote className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-emerald-500" />
                                                        <Input
                                                            className="pl-7 pr-2 h-8 text-sm font-medium"
                                                            placeholder={inv.collectedAmount > 0 ? inv.collectedAmount.toLocaleString("tr-TR") : "0"}
                                                            value={editingTahsilat[inv.id] ?? (inv.collectedAmount > 0 ? inv.collectedAmount.toLocaleString("tr-TR") : "")}
                                                            onChange={(e) =>
                                                                setEditingTahsilat((prev) => ({ ...prev, [inv.id]: e.target.value }))
                                                            }
                                                        />
                                                    </div>
                                                    {editingTahsilat[inv.id] !== undefined && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                                            onClick={() => void handleSaveTahsilat(inv)}
                                                            disabled={savingTahsilat === inv.id}
                                                        >
                                                            <Save className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                                {inv.collectedAmount > 0 && (
                                                    <span className="text-[11px] text-emerald-600 font-medium mt-0.5">
                                                        {((inv.collectedAmount / inv.amount) * 100).toFixed(0)}% tahsil edildi
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {inv.status === "completed" ? (
                                                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                                                        <CheckCircle className="w-3 h-3 mr-1" /> Kesildi
                                                    </Badge>
                                                ) : inv.status === "failed" ? (
                                                    <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
                                                        <AlertTriangle className="w-3 h-3 mr-1" /> Hata
                                                    </Badge>
                                                ) : (
                                                    <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Bekliyor</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {inv.approvalStatus === "approved" ? (
                                                    <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                                                        <BadgeCheck className="w-3 h-3 mr-1" /> Onayli
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="bg-slate-50 text-slate-600">Onay bekliyor</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {inv.approvalStatus === "approved" ? (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="gap-2 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                                                            asChild
                                                        >
                                                            <Link
                                                                to={`/admin/tahsilat?add=1&customer=${encodeURIComponent(inv.invoiceType === "corporate" && inv.customerCompanyName ? inv.customerCompanyName : inv.customerName)}&plate=${encodeURIComponent(inv.vehiclePlate)}`}
                                                            >
                                                                <Banknote className="h-4 w-4" /> Tahsilat Ekle
                                                            </Link>
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            variant="default"
                                                            size="sm"
                                                            className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                                                            onClick={() => void handleApproveInvoice(inv)}
                                                            disabled={processingId === inv.id}
                                                        >
                                                            <BadgeCheck className="h-4 w-4" /> Onayla
                                                        </Button>
                                                    )}

                                                    {inv.status === "completed" && inv.invoiceUrl ? (
                                                        <Button variant="outline" size="sm" className="gap-2 text-green-700" asChild>
                                                            <a href={inv.invoiceUrl} target="_blank" rel="noopener noreferrer">
                                                                <Download className="h-4 w-4" /> Indir
                                                            </a>
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            variant="default"
                                                            size="sm"
                                                            className="gap-2"
                                                            onClick={() => void handleFaturaKes(inv)}
                                                        >
                                                            <FileText className="h-4 w-4" /> Fatura Kes
                                                        </Button>
                                                    )}

                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="gap-1 text-red-600 border-red-200 hover:bg-red-50"
                                                        onClick={() => void handleDeleteInvoice(inv)}
                                                        disabled={processingId === inv.id}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                        Sil
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {filteredInvoices.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={9} className="py-10 text-center text-slate-500">
                                                Fatura kaydi bulunamadi.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
