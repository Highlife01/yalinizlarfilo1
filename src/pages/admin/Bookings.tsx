import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    collection,
    getDocs,
    addDoc,
    deleteDoc,
    doc,
    updateDoc,
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
    Plus,
    Search,
    Calendar,
    CheckCircle2,
    XCircle,
    Clock,
    MoreHorizontal,
    Camera,
    Loader2,
    Trash2,
    FileDown
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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { compressImageForUpload } from "@/utils/imageCompression";
import { exportBookingsToExcel } from "@/utils/exportUtils";
import { createRentalCalendarLink } from "@/utils/calendar";
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

// Types
export type Booking = {
    id: string;
    customerName: string;
    customerPhone?: string;
    customerEmail?: string;
    customerTckn?: string;
    customerDriverLicenseNo?: string;
    customerAddress?: string;
    customerIdFrontUrl?: string;
    customerIdBackUrl?: string;
    customerLicenseFrontUrl?: string;
    customerLicenseBackUrl?: string;
    vehicleName: string;
    vehiclePlate: string;
    startDate: string;
    endDate: string;
    status: 'pending' | 'active' | 'completed' | 'cancelled';
    totalPrice: number;
    deliveryPhotos?: string[];
    returnPhotos?: string[];
    deliveryNotes?: string;
    returnNotes?: string;
};

export const Bookings = () => {
    const { toast } = useToast();
    const navigate = useNavigate();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [deletingBookingId, setDeletingBookingId] = useState<string | null>(null);

    // Dialog States
    const [newBookingOpen, setNewBookingOpen] = useState(false);
    const [handoverOpen, setHandoverOpen] = useState(false);
    const [selectedBooking, _setSelectedBooking] = useState<Booking | null>(null);

    // Handover State
    const [uploading, setUploading] = useState(false);
    const [handoverData, setHandoverData] = useState<{
        notes: string;
        photos: string[];
        type: 'delivery' | 'return';
    }>({
        notes: "",
        photos: [],
        type: 'delivery'
    });

    const [formData, setFormData] = useState<Partial<Booking>>({
        customerName: "",
        vehicleName: "",
        vehiclePlate: "",
        startDate: "",
        endDate: "",
        status: 'pending',
        totalPrice: 0
    });

    useEffect(() => {
        fetchBookings();
    }, []);

    const fetchBookings = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, "bookings"), orderBy("startDate", "desc"));
            const querySnapshot = await getDocs(q);
            const list: Booking[] = [];
            querySnapshot.forEach((doc) => {
                list.push({ id: doc.id, ...doc.data() } as Booking);
            });
            setBookings(list);
        } catch (error) {
            console.error("Error fetching bookings:", error);
            toast({ title: "Hata", description: "Rezervasyonlar yüklenemedi.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await addDoc(collection(db, "bookings"), formData);
            toast({ title: "Başarılı", description: "Rezervasyon oluşturuldu." });
            setNewBookingOpen(false);
            fetchBookings();
        } catch (error) {
            toast({ title: "Hata", description: "Kaydedilemedi.", variant: "destructive" });
        }
    };

    const updateStatus = async (id: string, newStatus: Booking['status']) => {
        try {
            await updateDoc(doc(db, "bookings", id), { status: newStatus });
            toast({ title: "Güncellendi", description: "Rezervasyon durumu değiştirildi." });
            fetchBookings();
        } catch (error) {
            toast({ title: "Hata", description: "Durum güncellenemedi.", variant: "destructive" });
        }
    };

    const deleteBooking = async (id: string) => {
        setDeletingBookingId(id);
        try {
            await deleteDoc(doc(db, "bookings", id));
            setBookings((prev) => prev.filter((b) => b.id !== id));
            toast({ title: "Silindi", description: "Rezervasyon kaydı silindi." });
        } catch (error) {
            console.error("Delete booking error:", error);
            toast({ title: "Hata", description: "Rezervasyon silinemedi.", variant: "destructive" });
        } finally {
            setDeletingBookingId(null);
        }
    };
    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files.length) return;

        setUploading(true);
        const files = Array.from(e.target.files);
        const newPhotoUrls: string[] = [];

        try {
            for (const file of files) {
                const optimizedFile = await compressImageForUpload(file);
                const storageRef = ref(storage, `handover/${selectedBooking?.id}/${Date.now()}_${optimizedFile.name}`);
                const snapshot = await uploadBytes(storageRef, optimizedFile, { contentType: optimizedFile.type });
                const url = await getDownloadURL(snapshot.ref);
                newPhotoUrls.push(url);
            }

            setHandoverData(prev => ({
                ...prev,
                photos: [...prev.photos, ...newPhotoUrls]
            }));
            toast({ title: "Yüklendi", description: `${newPhotoUrls.length} fotoğraf eklendi.` });
        } catch (error) {
            console.error("Upload error:", error);
            toast({ title: "Hata", description: "Fotoğraf yüklenirken hata oluştu.", variant: "destructive" });
        } finally {
            setUploading(false);
        }
    };

    const saveHandover = async () => {
        if (!selectedBooking) return;

        try {
            const updateData: Record<string, unknown> = {};
            if (handoverData.type === 'delivery') {
                updateData.deliveryNotes = handoverData.notes;
                updateData.deliveryPhotos = handoverData.photos;
                // Optionally update status
                if (selectedBooking.status === 'pending') updateData.status = 'active';
            } else {
                updateData.returnNotes = handoverData.notes;
                updateData.returnPhotos = handoverData.photos;
                if (selectedBooking.status === 'active') updateData.status = 'completed';
            }

            await updateDoc(doc(db, "bookings", selectedBooking.id), updateData as Record<string, string | string[]>);
            toast({ title: "Kaydedildi", description: "Araç durum bilgileri güncellendi." });
            setHandoverOpen(false);
            fetchBookings();
        } catch (error) {
            toast({ title: "Hata", description: "Kaydedilemedi.", variant: "destructive" });
        }
    };

    const filteredBookings = bookings.filter(b => {
        const matchSearch = b.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            b.vehiclePlate.toLowerCase().includes(searchTerm.toLowerCase());
        const matchStatus = statusFilter === 'all' || b.status === statusFilter;
        return matchSearch && matchStatus;
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active': return <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" /> Aktif</Badge>;
            case 'pending': return <Badge className="bg-yellow-500"><Clock className="w-3 h-3 mr-1" /> Beklemede</Badge>;
            case 'completed': return <Badge variant="secondary">Tamamlandı</Badge>;
            case 'cancelled': return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> İptal</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">Rezervasyonlar</h2>
                    <p className="text-slate-500">Araç teslimat ve iade süreçlerini yönetin.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => exportBookingsToExcel(bookings)}>
                        <FileDown className="mr-2 h-4 w-4" />
                        Excel
                    </Button>
                    <Button onClick={() => setNewBookingOpen(true)} className="bg-primary hover:bg-blue-700">
                        <Plus className="mr-2 h-4 w-4" /> Yeni Rezervasyon
                    </Button>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-center bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Müşteri veya plaka ara..."
                        className="pl-9 w-full bg-slate-50 border-slate-200"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Durum Filtrele" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tümü</SelectItem>
                        <SelectItem value="active">Aktif</SelectItem>
                        <SelectItem value="pending">Beklemede</SelectItem>
                        <SelectItem value="completed">Tamamlandı</SelectItem>
                        <SelectItem value="cancelled">İptal</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16 text-slate-500">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-3" />
                        Yükleniyor...
                    </div>
                ) : (
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead className="font-semibold text-slate-700">Müşteri</TableHead>
                                <TableHead className="font-semibold text-slate-700">Araç</TableHead>
                                <TableHead className="font-semibold text-slate-700">Tarih</TableHead>
                                <TableHead className="font-semibold text-slate-700">Durum</TableHead>
                                <TableHead className="font-semibold text-slate-700 text-right">Teslimat</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                                <TableHead className="w-[56px] text-right">Sil</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredBookings.map((booking) => (
                                <TableRow key={booking.id} className="hover:bg-slate-50">
                                    <TableCell className="font-medium">{booking.customerName}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span>{booking.vehicleName}</span>
                                            <span className="text-xs text-slate-500 font-mono">{booking.vehiclePlate}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center text-sm text-slate-600">
                                            <Calendar className="w-3 h-3 mr-1" />
                                            {booking.startDate}
                                        </div>
                                    </TableCell>
                                    <TableCell>{getStatusBadge(booking.status)}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex gap-2 justify-end">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 border-green-200 text-green-700 hover:bg-green-50"
                                                onClick={() => navigate('/admin/operations', { state: { booking, type: 'delivery' } })}
                                            >
                                                <Camera className="w-3 h-3 mr-1" /> Teslim Et
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 border-blue-200 text-blue-700 hover:bg-blue-50"
                                                onClick={() => navigate('/admin/operations', { state: { booking, type: 'return' } })}
                                            >
                                                <Camera className="w-3 h-3 mr-1" /> İade Al
                                            </Button>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0" disabled={deletingBookingId === booking.id}>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>İşlemler</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => updateStatus(booking.id, 'cancelled')} className="text-red-600">
                                                    İptal Et
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => {
                                                    const link = createRentalCalendarLink({
                                                        customerName: booking.customerName,
                                                        customerPhone: booking.customerPhone || "Bilinmiyor",
                                                        vehiclePlate: booking.vehiclePlate,
                                                        startDate: booking.startDate,
                                                        pickupBranch: "Yalınızlar Filo"
                                                    });
                                                    window.open(link, '_blank');
                                                }}>
                                                    <Calendar className="w-4 h-4 mr-2" /> Google Takvim
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-slate-500 hover:bg-red-50 hover:text-red-600"
                                                    disabled={deletingBookingId === booking.id}
                                                >
                                                    {deletingBookingId === booking.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Rezervasyon silinsin mi?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Bu işlem geri alınamaz. Rezervasyon kaydı tamamen silinecektir.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>İptal</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        onClick={() => deleteBooking(booking.id)}
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
                            {filteredBookings.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Kayıt bulunamadı.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                )}
            </div>

            {/* New Booking Dialog */}
            <Dialog open={newBookingOpen} onOpenChange={setNewBookingOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Yeni Rezervasyon</DialogTitle>
                        <DialogDescription>Manuel rezervasyon kaydı oluşturun.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>Müşteri</Label>
                            <Input required value={formData.customerName} onChange={e => setFormData({ ...formData, customerName: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Araç</Label>
                                <Input placeholder="Örn: Fiat Egea" required value={formData.vehicleName} onChange={e => setFormData({ ...formData, vehicleName: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Plaka</Label>
                                <Input placeholder="34 XX 000" className="uppercase" required value={formData.vehiclePlate} onChange={e => setFormData({ ...formData, vehiclePlate: e.target.value })} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Başlangıç</Label>
                                <Input type="date" required value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Bitiş</Label>
                                <Input type="date" required value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Tutar</Label>
                            <Input type="number" required value={formData.totalPrice} onChange={e => setFormData({ ...formData, totalPrice: parseInt(e.target.value) })} />
                        </div>
                        <DialogFooter>
                            <Button type="submit">Oluştur</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Handover Dialog */}
            <Dialog open={handoverOpen} onOpenChange={setHandoverOpen}>
                <DialogContent className="sm:max-w-[700px] h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>
                            {handoverData.type === 'delivery' ? 'Araç Teslim Etme' : 'Araç İade Alma'}
                        </DialogTitle>
                        <DialogDescription>
                            Araç durumunu fotoğraflarla belgeleyin.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto py-4 space-y-6">

                        {/* Info Card */}
                        <div className="bg-slate-50 p-4 rounded-lg flex justify-between items-center text-sm">
                            <div>
                                <span className="block font-medium text-slate-700">Müşteri</span>
                                <span>{selectedBooking?.customerName}</span>
                            </div>
                            <div>
                                <span className="block font-medium text-slate-700">Araç</span>
                                <span>{selectedBooking?.vehicleName} ({selectedBooking?.vehiclePlate})</span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label className="text-base">Fotoğraflar</Label>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="col-span-2">
                                    <PhotoInput
                                        variant="cards"
                                        multiple
                                        onChange={handlePhotoUpload}
                                        disabled={uploading}
                                        loading={uploading}
                                        labelCamera="Fotoğraf çek"
                                        labelGallery="Galeriden seç"
                                    />
                                </div>

                                {/* Preview List */}
                                {handoverData.photos.map((url, i) => (
                                    <div key={i} className="relative aspect-square rounded-lg overflow-hidden border bg-black group">
                                        <img src={url} alt={`Handover ${i}`} className="w-full h-full object-cover" />
                                        <div className="absolute inset-x-0 bottom-0 bg-black/60 p-1 text-white text-[10px] truncate text-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            Fotoğraf {i + 1}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label className="text-base">Notlar & Hasar Durumu</Label>
                            <Textarea
                                placeholder="Araçta çizik, vuruk veya eksik varsa belirtin..."
                                className="h-32"
                                value={handoverData.notes}
                                onChange={e => setHandoverData({ ...handoverData, notes: e.target.value })}
                            />
                        </div>
                    </div>

                    <DialogFooter className="mt-auto pt-4 border-t">
                        <Button variant="outline" onClick={() => setHandoverOpen(false)}>İptal</Button>
                        <Button onClick={saveHandover} disabled={uploading}>
                            {uploading ? 'Yükleniyor...' : 'Onayla ve Kaydet'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
