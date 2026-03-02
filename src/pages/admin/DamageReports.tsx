import { useState, useEffect } from "react";
import {
    collection,
    getDocs,
    query,
    orderBy,
    deleteDoc,
    doc
} from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import {
    AlertTriangle,
    Calendar,
    DollarSign,
    CheckCircle,
    Clock,
    Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
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

type DamageReport = {
    id: string;
    vehiclePlate: string;
    vehicleId: string;
    date: string;
    damageType: string;
    description: string;
    estimatedCost: number;
    status: 'pending' | 'in-repair' | 'completed';
    photos?: string[];
};

export const DamageReports = () => {
    const [reports, setReports] = useState<DamageReport[]>([]);
    const [_loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        fetchDamageReports();
    }, []);

    const fetchDamageReports = async () => {
        setLoading(true);
        try {
            // Get all vehicle operations with damage
            const q = query(collection(db, "vehicle_operations"), orderBy("date", "desc"));
            const snapshot = await getDocs(q);

            const damageOps: DamageReport[] = [];
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                if (data.damagePoints && data.damagePoints.length > 0) {
                    damageOps.push({
                        id: doc.id,
                        vehiclePlate: data.vehiclePlate || 'N/A',
                        vehicleId: data.vehicleId,
                        date: data.date,
                        damageType: 'Çizik/Kaza',
                        description: data.notes || 'Detay belirtilmemiş',
                        estimatedCost: Number(data.estimatedDamageCost || data.estimatedCost || 0),
                        status: (data.damageStatus || 'pending') as DamageReport['status'],
                        photos: data.photos
                    });
                }
            });
            setReports(damageOps);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteDoc(doc(db, "vehicle_operations", id));
            toast({
                title: "Başarılı",
                description: "Hasar kaydı silindi.",
            });
            fetchDamageReports();
        } catch (error) {
            console.error("Delete Error:", error);
            toast({
                title: "Hata",
                description: "Hasar kaydı silinemedi.",
                variant: "destructive",
            });
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" /> Onarıldı</Badge>;
            case 'in-repair':
                return <Badge className="bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1" /> Onarımda</Badge>;
            case 'pending':
                return <Badge className="bg-yellow-100 text-yellow-800"><AlertTriangle className="w-3 h-3 mr-1" /> Bekliyor</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">Hasar Raporları</h2>
                    <p className="text-slate-500">Araç hasarlarını takip edin ve onarım süreçlerini yönetin.</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid md:grid-cols-3 gap-4">
                <Card className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-500">Toplam Hasar</p>
                            <p className="text-3xl font-bold mt-1">{reports.length}</p>
                        </div>
                        <AlertTriangle className="w-10 h-10 text-orange-500" />
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-500">Bekleyen</p>
                            <p className="text-3xl font-bold mt-1">{reports.filter(r => r.status === 'pending').length}</p>
                        </div>
                        <Clock className="w-10 h-10 text-yellow-500" />
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-500">Tahmini Maliyet</p>
                            <p className="text-3xl font-bold mt-1">₺{reports.reduce((sum, r) => sum + r.estimatedCost, 0).toLocaleString()}</p>
                        </div>
                        <DollarSign className="w-10 h-10 text-blue-500" />
                    </div>
                </Card>
            </div>

            {/* Reports Table */}
            <Card>
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead className="font-semibold">Plaka</TableHead>
                            <TableHead className="font-semibold">Tarih</TableHead>
                            <TableHead className="font-semibold">Açıklama</TableHead>
                            <TableHead className="font-semibold">Durum</TableHead>
                            <TableHead className="font-semibold text-right">Tutar</TableHead>
                            <TableHead className="font-semibold text-right">İşlemler</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {reports.map(report => (
                            <TableRow key={report.id} className="hover:bg-slate-50">
                                <TableCell className="font-medium font-mono">{report.vehiclePlate}</TableCell>
                                <TableCell>
                                    <div className="flex items-center text-sm">
                                        <Calendar className="w-3 h-3 mr-1.5 text-slate-400" />
                                        {new Date(report.date).toLocaleDateString('tr-TR')}
                                    </div>
                                </TableCell>
                                <TableCell className="max-w-xs truncate">{report.description}</TableCell>
                                <TableCell>{getStatusBadge(report.status)}</TableCell>
                                <TableCell className="text-right font-medium">₺{report.estimatedCost.toLocaleString()}</TableCell>
                                <TableCell className="text-right">
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Kaydı Sil</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Bu hasar kaydını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>İptal</AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={() => handleDelete(report.id)}
                                                    className="bg-red-600 hover:bg-red-700"
                                                >
                                                    Sil
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </TableCell>
                            </TableRow>
                        ))}
                        {reports.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                                    Hasar kaydı bulunamadı.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
};
