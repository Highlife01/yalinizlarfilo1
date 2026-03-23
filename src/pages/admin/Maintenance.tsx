import { useState, useEffect, useMemo } from "react";
import {
    collection,
    getDocs,
    addDoc,
    doc,
    query,
    orderBy,
    where,
    writeBatch
} from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import {
    Plus,
    Search,
    Wrench,
    AlertTriangle,
    CheckCircle,
    Trash2,
    Calendar,
    AlertCircle
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
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Types
type MaintenanceRecord = {
    id: string;
    vehicleId: string;
    vehicleName: string;
    vehiclePlate: string;
    serviceType: string;
    description: string;
    date: string;
    cost: number;
    status: 'scheduled' | 'in-progress' | 'completed';
    workshopName: string;
};

type Vehicle = {
    id: string;
    name: string;
    plate: string;
    insurance_end_date?: string;
    casco_end_date?: string;
    tuvturk_end_date?: string;
    km: number;
    status: string;
};

const DAY_IN_MS = 1000 * 60 * 60 * 24;
const ALERT_WINDOW_DAYS = 30; // Warn 30 days before

const getDaysUntil = (dateValue?: string): number | null => {
    if (!dateValue) return null;
    const target = new Date(dateValue);
    if (Number.isNaN(target.getTime())) return null;
    target.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.ceil((target.getTime() - today.getTime()) / DAY_IN_MS);
};

export const Maintenance = () => {
    const { toast } = useToast();
    const [records, setRecords] = useState<MaintenanceRecord[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    // Dialog State
    const [dialogOpen, setDialogOpen] = useState(false);
    const [formData, setFormData] = useState<Partial<MaintenanceRecord>>({
        vehicleId: "",
        vehicleName: "",
        vehiclePlate: "",
        serviceType: "Periyodik Bakım",
        description: "",
        date: new Date().toISOString().split("T")[0],
        cost: 0,
        status: 'completed',
        workshopName: ""
    });

    useEffect(() => {
        void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch records
            const q = query(collection(db, "maintenance"), orderBy("date", "desc"));
            const querySnapshot = await getDocs(q);
            const list: MaintenanceRecord[] = [];
            querySnapshot.forEach((d) => {
                list.push({ id: d.id, ...d.data() } as MaintenanceRecord);
            });
            setRecords(list);

            // Fetch vehicles and operations (to calc max km)
            const vSnap = await getDocs(collection(db, "vehicles"));
            const opSnap = await getDocs(collection(db, "vehicle_operations"));

            const opsKmMap = new Map<string, number>();
            opSnap.forEach(d => {
                const data = d.data();
                if (data.vehiclePlate && data.km) {
                    const prev = opsKmMap.get(data.vehiclePlate) || 0;
                    opsKmMap.set(data.vehiclePlate, Math.max(prev, Number(data.km)));
                }
            });

            const vList: Vehicle[] = [];
            vSnap.forEach((d) => {
                const data = d.data();
                const plate = data.plate || "Plaka Yok";
                const baseKm = Number(data.km || 0);
                const opsKm = opsKmMap.get(plate) || 0;

                vList.push({
                    id: d.id,
                    name: data.name || "Bilinmeyen Araç",
                    plate: plate,
                    insurance_end_date: data.insurance_end_date,
                    casco_end_date: data.casco_end_date,
                    tuvturk_end_date: data.tuvturk_end_date,
                    km: Math.max(baseKm, opsKm),
                    status: data.status || "active"
                });
            });
            setVehicles(vList);

        } catch (error) {
            console.error("Error fetching maintenance data:", error);
            toast({ title: "Hata", description: "Veriler alınırken bir sorun oluştu.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const maintenanceRef = await addDoc(collection(db, "maintenance"), formData);

            // Auto-sync: create a corresponding vehicle_costs entry
            if ((formData.cost ?? 0) > 0 && formData.vehicleId) {
                const costCategory = formData.serviceType === "repair" ? "onarim" : "bakim";
                await addDoc(collection(db, "vehicle_costs"), {
                    vehicleId: formData.vehicleId,
                    vehiclePlate: formData.vehiclePlate,
                    vehicleName: formData.vehicleName,
                    category: costCategory,
                    amount: formData.cost,
                    description: `[Bakım] ${formData.description || formData.serviceType}`,
                    date: formData.date,
                    createdAt: new Date().toISOString(),
                    linkedMaintenanceId: maintenanceRef.id,
                });
            }

            toast({ title: "Başarılı", description: "Bakım/Gider kaydı eklendi." });
            setDialogOpen(false);
            void fetchData();
        } catch (_error) {
            toast({ title: "Hata", description: "Kayıt eklenemedi.", variant: "destructive" });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Kaydı silmek istiyor musunuz?")) return;
        try {
            const batch = writeBatch(db);
            batch.delete(doc(db, "maintenance", id));

            // Also delete linked vehicle_costs entry
            const linkedCosts = await getDocs(
                query(collection(db, "vehicle_costs"), where("linkedMaintenanceId", "==", id))
            );
            linkedCosts.forEach((d) => batch.delete(d.ref));

            await batch.commit();
            toast({ title: "Silindi", description: "Kayıt silindi" });
            void fetchData();
        } catch (_e) {
            toast({ title: "Hata", description: "Silinemedi", variant: "destructive" });
        }
    };

    const handleVehicleSelect = (vid: string) => {
        const selected = vehicles.find(v => v.id === vid);
        if (selected) {
            setFormData({
                ...formData,
                vehicleId: selected.id,
                vehicleName: selected.name,
                vehiclePlate: selected.plate
            });
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed': return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Tamamlandı</Badge>;
            case 'in-progress': return <Badge className="bg-blue-500"><Wrench className="w-3 h-3 mr-1" /> İşlemde</Badge>;
            default: return <Badge className="bg-orange-500"><AlertTriangle className="w-3 h-3 mr-1" /> Planlandı</Badge>;
        }
    };

    const alerts = useMemo(() => {
        const results: { type: string, plate: string, message: string, days: number, isCritical: boolean }[] = [];

        vehicles.forEach(v => {
            if (v.status === 'inactive') return;

            const checkDoc = (dateValue: string | undefined, label: string) => {
                const days = getDaysUntil(dateValue);
                if (days !== null && days <= ALERT_WINDOW_DAYS) {
                    results.push({
                        type: label,
                        plate: v.plate,
                        message: days < 0 ? `${Math.abs(days)} gün geçti` : `${days} gün kaldı`,
                        days,
                        isCritical: days < 0
                    });
                }
            };

            checkDoc(v.insurance_end_date, "Trafik Sigortası");
            checkDoc(v.casco_end_date, "Kasko");
            checkDoc(v.tuvturk_end_date, "TÜVTÜRK");

            // Simple 15.000 km routine check
            const limit = 15000;
            const remainder = v.km % limit;
            const toNext = limit - remainder;
            // Warn if within 1000km of next interval, and vehicle actually did distance
            if (toNext <= 1000 && v.km > limit) {
                results.push({
                    type: "Periyodik Bakım",
                    plate: v.plate,
                    message: `${toNext} km kaldı (${v.km} km)`,
                    days: toNext, // sorting proxy
                    isCritical: toNext <= 0
                });
            }
        });

        // Check scheduled maintenances
        records.filter(r => r.status === 'scheduled').forEach(r => {
            const days = getDaysUntil(r.date);
            if (days !== null && days <= ALERT_WINDOW_DAYS) {
                results.push({
                    type: `Randevu: ${r.serviceType}`,
                    plate: r.vehiclePlate,
                    message: days < 0 ? `${Math.abs(days)} gün gecikti` : `${days} gün kaldı (${r.date})`,
                    days,
                    isCritical: days < 0
                });
            }
        });

        return results.sort((a, b) => a.days - b.days);
    }, [vehicles, records]);

    const filteredRecords = records.filter(r =>
        (r.vehiclePlate?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (r.vehicleName?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (r.serviceType?.toLowerCase() || "").includes(searchTerm.toLowerCase())
    );

    const totalExpense = records.reduce((acc, curr) => acc + (curr.cost || 0), 0);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">Araç Bakım & Gider Takibi</h2>
                    <p className="text-slate-500">Filo servis geçmişi, evrak yenileme uyarıları ve gider analizi.</p>
                </div>
                <Button onClick={() => {
                    setFormData({
                        vehicleId: "", vehicleName: "", vehiclePlate: "", serviceType: "Periyodik Bakım",
                        description: "", date: new Date().toISOString().split("T")[0], cost: 0, status: 'completed', workshopName: ""
                    });
                    setDialogOpen(true);
                }} className="bg-orange-600 hover:bg-orange-700">
                    <Plus className="mr-2 h-4 w-4" /> Gider / Bakım Ekle
                </Button>
            </div>

            {alerts.length > 0 && (
                <Card className="border-l-4 border-l-orange-500 bg-orange-50/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2 text-orange-900">
                            <AlertCircle className="w-5 h-5" />
                            Yaklaşan Bakım ve Evrak Yenilemeleri ({alerts.length})
                        </CardTitle>
                        <CardDescription className="text-orange-700">Süresi dolan veya 30 günden az kalan belgeler ve yaklaşan bakımlar.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {alerts.map((alert, idx) => (
                                <div key={idx} className={`flex flex-col p-3 rounded-lg border ${alert.isCritical ? 'bg-red-50 border-red-200' : 'bg-white border-orange-200'}`}>
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="font-bold font-mono text-sm">{alert.plate}</span>
                                        <Badge variant="outline" className={alert.isCritical ? 'text-red-700 border-red-300' : 'text-orange-700 border-orange-300'}>{alert.type}</Badge>
                                    </div>
                                    <span className={`text-sm ${alert.isCritical ? 'text-red-600 font-semibold' : 'text-orange-800'}`}>
                                        {alert.message}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            <Tabs defaultValue="history" className="w-full">
                <TabsList className="mb-4">
                    <TabsTrigger value="history">Geçmiş ve İşlemler</TabsTrigger>
                    <TabsTrigger value="summary">Gider Özeti</TabsTrigger>
                </TabsList>

                <TabsContent value="history" className="space-y-4">
                    <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex gap-4 items-center">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Plaka, araç veya işlem ara..."
                                className="pl-9 bg-slate-50 border-slate-200"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead className="font-semibold text-slate-700">Araç</TableHead>
                                    <TableHead className="font-semibold text-slate-700">İşlem Türü</TableHead>
                                    <TableHead className="font-semibold text-slate-700">Tedarikçi / Açıklama</TableHead>
                                    <TableHead className="font-semibold text-slate-700">Tarih</TableHead>
                                    <TableHead className="font-semibold text-slate-700 whitespace-nowrap">Tutar</TableHead>
                                    <TableHead className="font-semibold text-slate-700">Durum</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading && records.length === 0 ? (
                                    <TableRow><TableCell colSpan={7} className="text-center py-8">Yükleniyor...</TableCell></TableRow>
                                ) : filteredRecords.length === 0 && !loading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center text-slate-500">Kayıt bulunamadı.</TableCell>
                                    </TableRow>
                                ) : filteredRecords.map((record) => (
                                    <TableRow key={record.id} className="hover:bg-slate-50">
                                        <TableCell>
                                            <div className="font-medium text-slate-900">{record.vehiclePlate}</div>
                                            <div className="text-xs text-slate-500">{record.vehicleName}</div>
                                        </TableCell>
                                        <TableCell><Badge variant="outline">{record.serviceType}</Badge></TableCell>
                                        <TableCell>
                                            <div className="flex flex-col max-w-[250px]">
                                                <span className="font-medium text-slate-700">{record.workshopName || "-"}</span>
                                                <span className="text-xs text-slate-500 truncate" title={record.description}>{record.description || "-"}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-slate-600 whitespace-nowrap">
                                            <Calendar className="inline w-3 h-3 mr-1" />
                                            {new Date(record.date).toLocaleDateString('tr-TR')}
                                        </TableCell>
                                        <TableCell className="font-medium text-slate-900 whitespace-nowrap">{record.cost?.toLocaleString('tr-TR')} ₺</TableCell>
                                        <TableCell>{getStatusBadge(record.status)}</TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-600" onClick={() => handleDelete(record.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>

                <TabsContent value="summary">
                    <Card>
                        <CardHeader>
                            <CardTitle>Gider Analizi</CardTitle>
                            <CardDescription>Sisteme girilen tüm bakım, lastik ve tamir masraflarının toplamı.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-bold text-slate-800">{totalExpense.toLocaleString('tr-TR')} <span className="text-xl text-slate-500">₺</span></div>
                            <p className="text-sm text-slate-500 mt-2">Toplam {records.length} işlem kaydı bulundu.</p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Yeni Gider / Bakım İşlemi Ekle</DialogTitle>
                        <DialogDescription>Araç için yapılan bir harcamayı veya yaklaşan randevuyu kaydedin.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>İlgili Araç <span className="text-red-500">*</span></Label>
                            <Select required value={formData.vehicleId} onValueChange={handleVehicleSelect}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Araç Seçin..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {vehicles.map(v => (
                                        <SelectItem key={v.id} value={v.id}>{v.plate} - {v.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Gider/İşlem Türü</Label>
                                <Select value={formData.serviceType} onValueChange={(val) => setFormData({ ...formData, serviceType: val })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Periyodik Bakım">Periyodik Bakım</SelectItem>
                                        <SelectItem value="Ağır Bakım">Ağır Bakım</SelectItem>
                                        <SelectItem value="Lastik Değişimi">Lastik Değişimi</SelectItem>
                                        <SelectItem value="Trafik Sigortası Y.">Trafik Sigortası Y.</SelectItem>
                                        <SelectItem value="Kasko Yenileme">Kasko Yenileme</SelectItem>
                                        <SelectItem value="TÜVTÜRK Muayene">TÜVTÜRK Muayene</SelectItem>
                                        <SelectItem value="Hasar/Tamir/Onarım">Hasar/Tamir/Onarım</SelectItem>
                                        <SelectItem value="Yıkama / Detaylı">Yıkama / Detaylı</SelectItem>
                                        <SelectItem value="Diğer Masraf">Diğer Masraf</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Tedarikçi / Servis Yeri</Label>
                                <Input required value={formData.workshopName} onChange={e => setFormData({ ...formData, workshopName: e.target.value })} placeholder="Örn: Bosch Car Service" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Detaylı Açıklama</Label>
                            <Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Değişen parçalar, fatura no veya özel notlar..." />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>İşlem Tarihi</Label>
                                <Input type="date" required value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Tutar (₺)</Label>
                                <Input type="number" required min="0" value={formData.cost} onChange={e => setFormData({ ...formData, cost: parseInt(e.target.value) || 0 })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Durum</Label>
                                <Select value={formData.status} onValueChange={(val: 'scheduled' | 'in-progress' | 'completed') => setFormData({ ...formData, status: val })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="completed">Ödendi/Bitti</SelectItem>
                                        <SelectItem value="in-progress">Serviste</SelectItem>
                                        <SelectItem value="scheduled">Planlandı</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <DialogFooter className="pt-4">
                            <Button type="submit">İşlemi Kaydet</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};
