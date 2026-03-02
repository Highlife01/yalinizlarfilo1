import { useEffect, useMemo, useState } from "react";
import { collection, doc, getDocs, orderBy, query, updateDoc } from "firebase/firestore";
import { deleteObject, ref } from "firebase/storage";
import { db, storage } from "@/integrations/firebase/client";
import { Calendar, Car, Download, Loader2, Search, Trash2, User } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
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
import { useToast } from "@/hooks/use-toast";

type Operation = {
    id: string;
    type: "delivery" | "return";
    vehiclePlate: string;
    customerName: string;
    date: string;
    contractPdfUrl?: string;
};

export const Contracts = () => {
    const [operations, setOperations] = useState<Operation[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [deletingIds, setDeletingIds] = useState<string[]>([]);
    const [bulkDeleting, setBulkDeleting] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        const fetchOperations = async () => {
            setLoading(true);
            try {
                const q = query(collection(db, "vehicle_operations"), orderBy("date", "desc"));
                const snapshot = await getDocs(q);
                const ops = snapshot.docs
                    .map((docItem) => ({ id: docItem.id, ...docItem.data() } as Operation))
                    .filter((op) => op.contractPdfUrl);
                setOperations(ops);
            } catch (error) {
                console.error("Fetch operations error:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchOperations();
    }, []);

    const filteredOperations = useMemo(
        () =>
            operations.filter(
                (op) =>
                    op.vehiclePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    op.customerName.toLowerCase().includes(searchTerm.toLowerCase()),
            ),
        [operations, searchTerm],
    );

    const filteredIds = filteredOperations.map((op) => op.id);
    const selectedFilteredCount = filteredIds.filter((id) => selectedIds.includes(id)).length;
    const allFilteredSelected = filteredIds.length > 0 && selectedFilteredCount === filteredIds.length;
    const selectAllState: boolean | "indeterminate" =
        allFilteredSelected ? true : selectedFilteredCount > 0 ? "indeterminate" : false;

    const removeContract = async (op: Operation) => {
        await updateDoc(doc(db, "vehicle_operations", op.id), { contractPdfUrl: "" });
        try {
            await deleteObject(ref(storage, `operations/${op.id}/sozlesme.pdf`));
        } catch (error) {
            const code = (error as { code?: string }).code;
            if (code && code !== "storage/object-not-found") {
                throw error;
            }
        }
    };

    const handleToggleSelection = (id: string, checked: boolean) => {
        setSelectedIds((prev) => {
            if (checked) {
                return prev.includes(id) ? prev : [...prev, id];
            }
            return prev.filter((item) => item !== id);
        });
    };

    const handleToggleSelectAll = (checked: boolean) => {
        setSelectedIds((prev) => {
            if (!checked) {
                return prev.filter((id) => !filteredIds.includes(id));
            }
            const next = new Set(prev);
            filteredIds.forEach((id) => next.add(id));
            return Array.from(next);
        });
    };

    const handleDeleteSingle = async (op: Operation) => {
        setDeletingIds((prev) => [...prev, op.id]);
        try {
            await removeContract(op);
            setOperations((prev) => prev.filter((item) => item.id !== op.id));
            setSelectedIds((prev) => prev.filter((item) => item !== op.id));
            toast({ title: "Başarılı", description: "Sözleşme kaydı silindi." });
        } catch (error) {
            console.error("Delete contract error:", error);
            toast({ title: "Hata", description: "Sözleşme silinemedi.", variant: "destructive" });
        } finally {
            setDeletingIds((prev) => prev.filter((item) => item !== op.id));
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedIds.length === 0) return;

        setBulkDeleting(true);
        const selectedSet = new Set(selectedIds);
        const selectedOps = operations.filter((op) => selectedSet.has(op.id));
        let successCount = 0;

        for (const op of selectedOps) {
            try {
                await removeContract(op);
                successCount += 1;
            } catch (error) {
                console.error(`Bulk delete failed for ${op.id}:`, error);
            }
        }

        if (successCount > 0) {
            setOperations((prev) => prev.filter((op) => !selectedSet.has(op.id)));
        }

        setSelectedIds([]);
        setBulkDeleting(false);

        if (successCount === selectedOps.length) {
            toast({ title: "Başarılı", description: `${successCount} sözleşme silindi.` });
        } else if (successCount > 0) {
            toast({ title: "Kısmen tamamlandı", description: `${successCount}/${selectedOps.length} sözleşme silindi.` });
        } else {
            toast({ title: "Hata", description: "Seçili sözleşmeler silinemedi.", variant: "destructive" });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">Sözleşmeler Arşivi</h2>
                    <p className="text-slate-500">Oluşturulan tüm kira sözleşmelerini buradan görüntüleyebilir ve indirebilirsiniz.</p>
                </div>
                <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
                    {selectedIds.length > 0 && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm" disabled={bulkDeleting}>
                                    {bulkDeleting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Siliniyor...
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Seciliyi Sil ({selectedIds.length})
                                        </>
                                    )}
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Seçili sözleşmeler silinsin mi?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Bu işlem seçili sözleşmeleri arşiv listesinden kaldırır. İşlem geri alınamaz.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>İptal</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={handleDeleteSelected}
                                        className="bg-red-600 hover:bg-red-700"
                                    >
                                        Evet, sil
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                    <div className="relative w-full md:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Plaka veya müşteri ara..."
                            className="pl-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle>Sözleşme Listesi</CardTitle>
                    <CardDescription>Toplam {filteredOperations.length} kayıt bulundu.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="py-10 text-center text-slate-500 font-medium">Sozlesmeler yukleniyor...</div>
                    ) : (
                        <div className="rounded-md border overflow-hidden">
                            <Table>
                                <TableHeader className="bg-slate-50">
                                    <TableRow>
                                        <TableHead className="w-10">
                                            <Checkbox
                                                checked={selectAllState}
                                                onCheckedChange={(checked) => handleToggleSelectAll(checked === true)}
                                                aria-label="Tüm kayıtları seç"
                                            />
                                        </TableHead>
                                        <TableHead className="font-semibold">Plaka</TableHead>
                                        <TableHead className="font-semibold">Müşteri</TableHead>
                                        <TableHead className="font-semibold">İşlem</TableHead>
                                        <TableHead className="font-semibold">Tarih</TableHead>
                                        <TableHead className="font-semibold text-right">Sözleşme</TableHead>
                                        <TableHead className="font-semibold text-right">Sil</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredOperations.map((op) => (
                                        <TableRow key={op.id} className="hover:bg-slate-50/50 transition-colors">
                                            <TableCell>
                                                <Checkbox
                                                    checked={selectedIds.includes(op.id)}
                                                    onCheckedChange={(checked) => handleToggleSelection(op.id, checked === true)}
                                                    disabled={deletingIds.includes(op.id) || bulkDeleting}
                                                    aria-label={`${op.vehiclePlate} kaydını seç`}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Car className="h-4 w-4 text-slate-400" />
                                                    <span className="font-mono font-bold text-slate-700">{op.vehiclePlate}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <User className="h-4 w-4 text-slate-400" />
                                                    <span className="font-medium text-slate-600">{op.customerName}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={op.type === "delivery" ? "default" : "secondary"} className="capitalize">
                                                    {op.type === "delivery" ? "Teslim" : "İade"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                                    <Calendar className="h-4 w-4" />
                                                    {new Date(op.date).toLocaleDateString("tr-TR")}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="outline" size="sm" className="gap-2" asChild>
                                                    <a href={op.contractPdfUrl} target="_blank" rel="noopener noreferrer">
                                                        <Download className="h-4 w-4" /> İndir / Yazdır
                                                    </a>
                                                </Button>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-slate-500 hover:bg-red-50 hover:text-red-600"
                                                            disabled={deletingIds.includes(op.id) || bulkDeleting}
                                                        >
                                                            {deletingIds.includes(op.id) ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <Trash2 className="h-4 w-4" />
                                                            )}
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Sözleşme silinsin mi?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Bu kayıt arşiv listesinden kaldırılacak. İşlem geri alınamaz.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>İptal</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => handleDeleteSingle(op)}
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
                                    {filteredOperations.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={7} className="py-10 text-center text-slate-500">
                                                Sözleşme kaydı bulunamadı.
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
