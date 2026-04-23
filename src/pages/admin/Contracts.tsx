import { useEffect, useMemo, useState } from "react";
import { collection, doc, getDocs, orderBy, query, updateDoc } from "firebase/firestore";
import { deleteObject, ref } from "firebase/storage";
import { db, storage } from "@/integrations/firebase/client";
import { Calendar, Car, Download, Loader2, Pencil, Save, Search, Trash2, User, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
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
    vehicleId?: string;
    customerName: string;
    date: string;
    contractPdfUrl?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rentalInfo?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    customer?: any;
};

type VehicleOption = {
    id: string;
    plate: string;
    name: string;
    status: string;
};

export const Contracts = () => {
    const [operations, setOperations] = useState<Operation[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [deletingIds, setDeletingIds] = useState<string[]>([]);
    const [bulkDeleting, setBulkDeleting] = useState(false);
    const { toast } = useToast();

    // Edit state
    const [editOpen, setEditOpen] = useState(false);
    const [editOp, setEditOp] = useState<Operation | null>(null);
    const [editForm, setEditForm] = useState({
        customerName: "",
        vehiclePlate: "",
        date: "",
        type: "delivery" as "delivery" | "return",
    });
    const [saving, setSaving] = useState(false);

    // Vehicles for assignment
    const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
    const [vehicleSearch, setVehicleSearch] = useState("");
    const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);

    // Fetch vehicles for assignment dropdown
    useEffect(() => {
        const fetchVehicles = async () => {
            try {
                const snap = await getDocs(collection(db, "vehicles"));
                const list = snap.docs.map(d => ({
                    id: d.id,
                    plate: String(d.data().plate || ""),
                    name: String(d.data().name || ""),
                    status: String(d.data().status || "active"),
                }));
                setVehicles(list.sort((a, b) => a.plate.localeCompare(b.plate)));
            } catch { /* silent */ }
        };
        void fetchVehicles();
    }, []);

    const filteredVehicles = useMemo(() => {
        if (!vehicleSearch.trim()) return vehicles.slice(0, 10);
        const term = vehicleSearch.toLowerCase();
        return vehicles.filter(v =>
            v.plate.toLowerCase().includes(term) ||
            v.name.toLowerCase().includes(term)
        ).slice(0, 10);
    }, [vehicles, vehicleSearch]);

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

    // Edit handlers
    const openEditDialog = (op: Operation) => {
        setEditOp(op);
        setEditForm({
            customerName: op.customerName,
            vehiclePlate: op.vehiclePlate,
            date: op.date,
            type: op.type,
        });
        setVehicleSearch("");
        setEditOpen(true);
    };

    const handleEditSave = async () => {
        if (!editOp) return;
        if (!editForm.customerName.trim() || !editForm.vehiclePlate.trim()) {
            toast({ title: "Eksik bilgi", description: "Müşteri adı ve plaka zorunludur.", variant: "destructive" });
            return;
        }

        setSaving(true);
        try {
            const plateNormalized = editForm.vehiclePlate.replace(/\s+/g, "").toUpperCase();

            // Find matching vehicle for vehicleId sync
            const matchedVehicle = vehicles.find(v =>
                v.plate.replace(/\s+/g, "").toUpperCase() === plateNormalized
            );

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const updatePayload: Record<string, any> = {
                customerName: editForm.customerName.trim(),
                vehiclePlate: plateNormalized,
                date: editForm.date,
                type: editForm.type,
            };

            // Sync vehicleId if we found a matching vehicle
            if (matchedVehicle) {
                updatePayload.vehicleId = matchedVehicle.id;
            }

            // Also update customer name in nested customer object if it exists
            if (editOp.customer) {
                updatePayload["customer.name"] = editForm.customerName.trim();
            }

            await updateDoc(doc(db, "vehicle_operations", editOp.id), updatePayload);

            // If vehicle changed, update old vehicle status to active, new to rented (only for delivery type)
            if (editForm.type === "delivery" && matchedVehicle) {
                // Set new vehicle to rented + currentKeeper
                try {
                    await updateDoc(doc(db, "vehicles", matchedVehicle.id), {
                        status: "rented",
                        currentKeeper: editForm.customerName.trim(),
                    });
                } catch { /* silent */ }

                // If plate changed, set the OLD vehicle back to active
                const oldPlateNormalized = editOp.vehiclePlate.replace(/\s+/g, "").toUpperCase();
                if (plateNormalized !== oldPlateNormalized) {
                    const oldVehicle = vehicles.find(v =>
                        v.plate.replace(/\s+/g, "").toUpperCase() === oldPlateNormalized
                    );
                    if (oldVehicle) {
                        try {
                            await updateDoc(doc(db, "vehicles", oldVehicle.id), {
                                status: "active",
                                currentKeeper: "",
                            });
                        } catch { /* silent */ }
                    }
                }
            }

            // Update local state
            setOperations(prev => prev.map(op =>
                op.id === editOp.id
                    ? { ...op, customerName: editForm.customerName.trim(), vehiclePlate: plateNormalized, date: editForm.date, type: editForm.type }
                    : op
            ));

            toast({ title: "Güncellendi", description: "Sözleşme bilgileri ve araç ataması güncellendi." });
            setEditOpen(false);
            setEditOp(null);
        } catch (error) {
            console.error("Edit contract error:", error);
            toast({ title: "Hata", description: "Güncelleme başarısız.", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">Sözleşmeler Arşivi</h2>
                    <p className="text-slate-500">Oluşturulan tüm kira sözleşmelerini buradan görüntüleyebilir, düzenleyebilir ve araç ataması yapabilirsiniz.</p>
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
                                        <TableHead className="font-semibold text-center">İşlemler</TableHead>
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
                                            <TableCell>
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button variant="outline" size="sm" className="gap-1.5 text-xs" asChild>
                                                        <a href={op.contractPdfUrl} target="_blank" rel="noopener noreferrer">
                                                            <Download className="h-3.5 w-3.5" /> İndir
                                                        </a>
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="gap-1.5 text-xs text-blue-700 border-blue-200 hover:bg-blue-50"
                                                        onClick={() => openEditDialog(op)}
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" /> Düzenle
                                                    </Button>
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
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {filteredOperations.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="py-10 text-center text-slate-500">
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

            {/* Edit Dialog */}
            <Dialog open={editOpen} onOpenChange={(open) => { if (!open) { setEditOpen(false); setEditOp(null); } }}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Pencil className="w-5 h-5 text-blue-600" />
                            Sözleşme Düzenle
                        </DialogTitle>
                        <DialogDescription>
                            Sözleşme bilgilerini güncelleyin ve araç ataması yapın. Araç değişikliği yapıldığında eski araç otomatik olarak müsait durumuna alınır.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        {/* Müşteri Adı */}
                        <div className="space-y-2">
                            <Label>Müşteri Adı</Label>
                            <Input
                                value={editForm.customerName}
                                onChange={(e) => setEditForm(prev => ({ ...prev, customerName: e.target.value }))}
                                placeholder="Müşteri adı"
                            />
                        </div>

                        {/* Araç Plakası (Atama) */}
                        <div className="space-y-2">
                            <Label>Araç Plakası (Atama)</Label>
                            <div className="relative">
                                <Input
                                    className="uppercase"
                                    value={vehicleSearch || editForm.vehiclePlate}
                                    onChange={(e) => {
                                        setVehicleSearch(e.target.value);
                                        setEditForm(prev => ({ ...prev, vehiclePlate: e.target.value }));
                                        setShowVehicleDropdown(true);
                                    }}
                                    onFocus={() => setShowVehicleDropdown(true)}
                                    onBlur={() => setTimeout(() => setShowVehicleDropdown(false), 200)}
                                    placeholder="Plaka veya araç adı ile ara..."
                                />
                                {showVehicleDropdown && filteredVehicles.length > 0 && (
                                    <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                        {filteredVehicles.map(v => (
                                            <button
                                                key={v.id}
                                                type="button"
                                                className="w-full text-left px-3 py-2 hover:bg-slate-100 flex items-center justify-between"
                                                onMouseDown={() => {
                                                    setEditForm(prev => ({ ...prev, vehiclePlate: v.plate }));
                                                    setVehicleSearch("");
                                                    setShowVehicleDropdown(false);
                                                }}
                                            >
                                                <div className="flex flex-col">
                                                    <span className="font-mono font-bold text-sm">{v.plate}</span>
                                                    <span className="text-xs text-slate-500">{v.name}</span>
                                                </div>
                                                <Badge variant="outline" className={
                                                    v.status === 'rented' ? 'text-blue-600 border-blue-200 bg-blue-50 text-xs' :
                                                    v.status === 'active' ? 'text-green-600 border-green-200 bg-green-50 text-xs' :
                                                    'text-slate-500 border-slate-200 text-xs'
                                                }>
                                                    {v.status === 'rented' ? 'Kirada' : v.status === 'active' ? 'Müsait' : 'Bakım'}
                                                </Badge>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {editOp && editForm.vehiclePlate.replace(/\s+/g, "").toUpperCase() !== editOp.vehiclePlate.replace(/\s+/g, "").toUpperCase() && (
                                <p className="text-xs text-amber-600 font-medium">
                                    ⚠ Araç değişikliği: {editOp.vehiclePlate} → {editForm.vehiclePlate.toUpperCase()}
                                    <br />Eski araç müsait, yeni araç kirada durumuna alınacak.
                                </p>
                            )}
                        </div>

                        {/* Tarih ve İşlem Tipi */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Tarih</Label>
                                <Input
                                    type="date"
                                    value={editForm.date}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, date: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>İşlem Tipi</Label>
                                <Select value={editForm.type} onValueChange={(val) => setEditForm(prev => ({ ...prev, type: val as "delivery" | "return" }))}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="delivery">Teslim</SelectItem>
                                        <SelectItem value="return">İade</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Sözleşme PDF Link */}
                        {editOp?.contractPdfUrl && (
                            <div className="p-3 bg-slate-50 rounded-lg border">
                                <Label className="text-xs text-slate-500 mb-1 block">Mevcut Sözleşme PDF</Label>
                                <a
                                    href={editOp.contractPdfUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-600 hover:text-blue-800 underline underline-offset-2"
                                >
                                    📄 Sözleşmeyi Görüntüle / İndir
                                </a>
                            </div>
                        )}
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => { setEditOpen(false); setEditOp(null); }} disabled={saving}>
                            <X className="h-4 w-4 mr-1" /> İptal
                        </Button>
                        <Button onClick={handleEditSave} disabled={saving}>
                            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                            Kaydet
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
