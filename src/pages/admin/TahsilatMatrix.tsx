import { useState, useEffect, useMemo } from "react";
import { collection, getDocs, query, orderBy, where, limit, doc, updateDoc } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Payment } from "./Tahsilat";
import { Vehicle } from "./FleetManagement";

const formatMoney = (value: number) =>
    new Intl.NumberFormat("tr-TR", {
        style: "currency",
        currency: "TRY",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);

const MONTHS = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
const MONTH_NAMES = [
    "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
    "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
];

const normalizeStr = (s: string) => s.replace(/\s+/g, "").toUpperCase();

type TahsilatMatrixProps = {
    payments: Payment[];
    onEdit?: (p: Payment) => void;
    onDelete?: (id: string) => void;
    onAdd?: (plate: string, customer?: string) => void;
};

export const TahsilatMatrix = ({ payments, onEdit, onDelete, onAdd }: TahsilatMatrixProps) => {
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));
    const [detailPlate, setDetailPlate] = useState<string | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [detailData, setDetailData] = useState<any>(null); // Operasyon / Kiralama detayı
    const [selectedVehicleRow, setSelectedVehicleRow] = useState<Vehicle | null>(null);
    const [editingKeeperId, setEditingKeeperId] = useState<string | null>(null);
    const [activeContracts, setActiveContracts] = useState<Record<string, { name: string; url?: string }>>({});

    const handleKeeperSave = async (vehicleId: string, newValue: string) => {
        try {
            await updateDoc(doc(db, "vehicles", vehicleId), { currentKeeper: newValue });
            setVehicles(prev => prev.map(v => v.id === vehicleId ? { ...v, currentKeeper: newValue } : v));
        } catch (error) {
            console.error("Keeper update error:", error);
        } finally {
            setEditingKeeperId(null);
        }
    };
    
    // Filtrelenmiş araç tahsilatları
    const vehiclePaymentsResult = useMemo(() => {
        if (!detailPlate) return [];
        return payments.filter(p => normalizeStr(p.vehiclePlate) === normalizeStr(detailPlate)).sort((a,b) => b.date.localeCompare(a.date));
    }, [payments, detailPlate]);

    // Fetch vehicles and active contracts
    useEffect(() => {
        const fetchVehiclesAndContracts = async () => {
            try {
                // 1. Fetch vehicles
                const snap = await getDocs(query(collection(db, "vehicles")));
                const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle));
                setVehicles(list);

                // 2. Fetch active contracts to synchronize "Kimde"
                // Sadece araç durumu 'rented' ise sözleşme sahibini göster
                const opsSnap = await getDocs(query(collection(db, "vehicle_operations"), orderBy("date", "desc")));
                const contractsMap: Record<string, { name: string; url?: string }> = {};
                const seenPlates = new Set<string>();
                // Kirada olan araçların plaka setini oluştur
                const rentedPlates = new Set<string>(
                    list.filter(v => v.status === 'rented').map(v => normalizeStr(v.plate))
                );

                opsSnap.docs.forEach(docSnap => {
                    const data = docSnap.data();
                    const plate = normalizeStr(data.vehiclePlate || "");
                    // Sadece kirada olan araçlar için sözleşme bilgisi al
                    if (plate && !seenPlates.has(plate) && rentedPlates.has(plate)) {
                        seenPlates.add(plate);
                        if (data.type === "delivery" && data.customerName) {
                            contractsMap[plate] = {
                                name: data.customerName,
                                url: data.contractPdfUrl
                            };
                        }
                    }
                });
                setActiveContracts(contractsMap);
            } catch (error) {
                console.error("Vehicles fetch error:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchVehiclesAndContracts();
    }, []);

    // Yılları filtre için çıkart
    const availableYears = useMemo(() => {
        const years = new Set<string>();
        years.add(String(new Date().getFullYear())); // en azından bu yıl olsun
        payments.forEach(p => {
            if (p.date) {
                years.add(p.date.substring(0, 4));
            }
        });
        return Array.from(years).sort((a, b) => Number(b) - Number(a));
    }, [payments]);

    // Araç bazlı matrisi oluştur
    const matrixData = useMemo(() => {
        const rows = vehicles.map((v, idx) => {
            const normalizedPlate = normalizeStr(v.plate);
            // Sadece seçili yıla ait tahsilatları alıyoruz
            const vehiclePayments = payments.filter(p =>
                normalizeStr(p.vehiclePlate) === normalizedPlate &&
                p.date.startsWith(selectedYear)
            );

            const monthTotals = MONTHS.map(month => {
                const monthPrefix = `${selectedYear}-${month}`;
                const total = vehiclePayments
                    .filter(p => p.date.startsWith(monthPrefix))
                    .reduce((sum, p) => sum + p.amount, 0);
                return total;
            });

            return {
                index: idx + 1,
                vehicle: v,
                monthTotals,
                totalAll: monthTotals.reduce((a, b) => a + b, 0),
            };
        });

        // İsteğe bağlı: Hiç ödemesi olmayanları gizleyebiliriz veya listenin en altına atabiliriz
        // Burada plakaya göre sıraladık
        return rows.sort((a, b) => a.vehicle.plate.localeCompare(b.vehicle.plate));
    }, [vehicles, payments, selectedYear]);

    // Kimde (Kullanan) sütunu için: Araç kiradaysa sözleşmeden, değilse manuel currentKeeper'dan al
    const getKeeperInfo = (vehicle: Vehicle): { name: string; url?: string; source: 'contract' | 'manual' } | null => {
        const plate = normalizeStr(vehicle.plate);
        const contract = activeContracts[plate];
        
        // Araç kiradaysa VE sözleşme varsa → otomatik
        if (vehicle.status === 'rented' && contract) {
            return { name: contract.name, url: contract.url, source: 'contract' };
        }
        
        // Manuel girilen currentKeeper varsa → manuel
        const keeper = (vehicle as Record<string, unknown>).currentKeeper as string;
        if (keeper && keeper.trim()) {
            return { name: keeper, source: 'manual' };
        }
        
        return null;
    };

    // Detay fonksiyonu: İlgili plakanın en son güncel kiralama durumunu bul
    const openDetail = async (row: { vehicle: Vehicle, index?: number }) => {
        setDetailPlate(row.vehicle.plate);
        setSelectedVehicleRow(row.vehicle);
        setDetailLoading(true);
        setDetailData(null);

        try {
            // Aktif veya en son operasyon bilgisini getir
            // vehicle_operations koleksiyonunda "vehicleId" veya "plate" olabilir.
            const q = query(
                collection(db, "vehicle_operations"),
                where("vehiclePlate", "==", normalizeStr(row.vehicle.plate)),
                orderBy("date", "desc"),
                limit(1)
            );
            const snap = await getDocs(q);

            if (!snap.empty) {
                // Not: type == 'delivery' vb kontrolü yapılabilir
                setDetailData(snap.docs[0].data());
            } else {
                // Eğer vehiclePlate ile bulamazsa ID üzerinden deneyelim
                const q2 = query(
                    collection(db, "vehicle_operations"),
                    where("vehicleId", "==", row.vehicle.id),
                    orderBy("date", "desc"),
                    limit(1)
                );
                const snap2 = await getDocs(q2);
                if (!snap2.empty) setDetailData(snap2.docs[0].data());
            }
        } catch (error) {
            console.error("Detail fetch error:", error);
        } finally {
            setDetailLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium">Satır Bazlı Araç & Ay Matrisi</h3>
                    <p className="text-sm text-slate-500">Araçların hangi ayda toplam ne kadar tahsilatı olduğunu gösterir.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger className="w-[120px] bg-white">
                            <SelectValue placeholder="Yıl Seç" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableYears.map(y => (
                                <SelectItem key={y} value={y}>{y}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="rounded-md border bg-white overflow-x-auto shadow-sm">
                {loading ? (
                    <div className="py-12 text-center text-slate-500">Araç verileri yükleniyor...</div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50">
                                <TableHead className="w-16 font-semibold border-r">Sıra</TableHead>
                                <TableHead className="min-w-[120px] font-semibold border-r">Plaka</TableHead>
                                <TableHead className="min-w-[160px] font-semibold border-r">Kimde (Kullanan)</TableHead>
                                <TableHead className="min-w-[150px] font-semibold border-r">Araç</TableHead>
                                {MONTH_NAMES.map((m, i) => (
                                    <TableHead key={i} className="font-semibold text-center border-r px-1">{m.substring(0, 3)}</TableHead>
                                ))}
                                <TableHead className="font-semibold text-right border-l bg-emerald-50">Toplam</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {matrixData.map(row => {
                                const keeperInfo = getKeeperInfo(row.vehicle);
                                return (
                                <TableRow key={row.vehicle.id} className="hover:bg-slate-50 cursor-pointer group" onClick={() => openDetail(row)}>
                                    <TableCell className="border-r text-slate-500">{row.index}</TableCell>
                                    <TableCell className="border-r font-mono font-medium text-emerald-800">{row.vehicle.plate}</TableCell>
                                    <TableCell className="border-r text-sm text-slate-700" onClick={(e) => { e.stopPropagation(); }}>
                                        <div className="flex items-center justify-between gap-1 group/keeper">
                                            {editingKeeperId === row.vehicle.id ? (
                                                <input 
                                                    autoFocus
                                                    className="w-full text-xs p-1 border rounded border-emerald-500 focus:outline-none"
                                                    defaultValue={keeperInfo?.name || ""}
                                                    onBlur={(e) => handleKeeperSave(row.vehicle.id, e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleKeeperSave(row.vehicle.id, e.currentTarget.value);
                                                        if (e.key === 'Escape') setEditingKeeperId(null);
                                                    }}
                                                />
                                            ) : keeperInfo ? (
                                                <>
                                                    {keeperInfo.source === 'contract' && keeperInfo.url ? (
                                                        <a 
                                                            href={keeperInfo.url} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="truncate max-w-[110px] text-blue-700 font-medium underline underline-offset-2 hover:text-blue-900 transition-colors" 
                                                            title={keeperInfo.name + " — Sözleşmeyi Görüntüle"}
                                                        >
                                                            {keeperInfo.name}
                                                        </a>
                                                    ) : keeperInfo.source === 'contract' ? (
                                                        <span className="truncate max-w-[110px] text-blue-700 font-medium" title={keeperInfo.name + " (Sözleşmeden)"}>
                                                            {keeperInfo.name}
                                                        </span>
                                                    ) : (
                                                        <span className="truncate max-w-[110px] text-slate-700" title={keeperInfo.name + " (Manuel)"}>
                                                            {keeperInfo.name}
                                                        </span>
                                                    )}
                                                    <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0 opacity-0 group-hover/keeper:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); setEditingKeeperId(row.vehicle.id); }} title="Düzenle">
                                                        <Pencil className="h-3 w-3 text-slate-400" />
                                                    </Button>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="text-slate-400">—</span>
                                                    <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0 opacity-0 group-hover/keeper:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); setEditingKeeperId(row.vehicle.id); }} title="Kullanan Ekle">
                                                        <Pencil className="h-3 w-3 text-slate-400" />
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="border-r truncate max-w-[180px]" title={row.vehicle.name}>
                                        <div className="flex flex-col">
                                            <span>{row.vehicle.name}</span>
                                            <span className="text-[10px] text-slate-400">{row.vehicle.category} • {row.vehicle.status === 'rented' ? 'Kirada' : 'Müsait'}</span>
                                        </div>
                                    </TableCell>
                                    {row.monthTotals.map((t, idx) => (
                                        <TableCell key={idx} className="border-r text-center px-2 py-3 text-sm">
                                            {t > 0 ? (
                                                <span className="font-medium text-slate-700 bg-slate-100 px-1 py-0.5 rounded">
                                                    {formatMoney(t)}
                                                </span>
                                            ) : (
                                                <span className="text-slate-300">-</span>
                                            )}
                                        </TableCell>
                                    ))}
                                    <TableCell className="text-right border-l font-bold text-emerald-700 bg-emerald-50/20 group-hover:bg-emerald-50/50">
                                        {formatMoney(row.totalAll)}
                                    </TableCell>
                                </TableRow>
                                );
                            })}
                            {matrixData.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={16} className="text-center py-10 text-slate-500">
                                        Sistemde henüz araç bulunmuyor.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                )}
            </div>

            <Dialog open={!!detailPlate} onOpenChange={(open) => !open && setDetailPlate(null)}>
                <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Araç ve Kiralama Detayı ({detailPlate})</DialogTitle>
                        <DialogDescription>
                            Görsel 2 referans alınarak hazırlanan aktif kiralama ve araç bilgi sayfası.
                        </DialogDescription>
                    </DialogHeader>

                    {detailLoading ? (
                        <div className="py-12 text-center text-slate-500">Detaylar getiriliyor...</div>
                    ) : selectedVehicleRow ? (
                        <div className="space-y-6">
                            <div className="rounded-md border bg-slate-50 p-0 overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-100">
                                            <TableHead className="whitespace-nowrap font-medium border-x">MARKA</TableHead>
                                            <TableHead className="whitespace-nowrap font-medium border-x">TİPİ</TableHead>
                                            <TableHead className="whitespace-nowrap font-medium border-x">YAKIT</TableHead>
                                            <TableHead className="whitespace-nowrap font-medium border-x">RENK</TableHead>
                                            <TableHead className="whitespace-nowrap font-medium border-x">PLAKA</TableHead>
                                            <TableHead className="whitespace-nowrap font-medium border-x text-center">DURUM</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow className="bg-white">
                                            <TableCell className="border-x">{selectedVehicleRow.name?.split(' ')[0] || 'Bilinmiyor'}</TableCell>
                                            <TableCell className="border-x">{selectedVehicleRow.name?.split(' ').slice(1).join(' ') || selectedVehicleRow.category}</TableCell>
                                            <TableCell className="border-x">{selectedVehicleRow.fuel}</TableCell>
                                            <TableCell className="border-x">{selectedVehicleRow.color || 'Bilinmiyor'}</TableCell>
                                            <TableCell className="border-x font-mono font-bold">{selectedVehicleRow.plate}</TableCell>
                                            <TableCell className="border-x text-center">
                                                <Badge variant="outline" className={selectedVehicleRow.status === 'rented' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-green-50 text-green-700 border-green-200'}>
                                                    {selectedVehicleRow.status === 'rented' ? 'Kirada' : selectedVehicleRow.status === 'active' ? 'Müsait' : 'Pasif/Bakım'}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="rounded-md border bg-slate-50 p-0 overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-blue-50/50">
                                            <TableHead className="whitespace-nowrap font-medium border-x text-blue-900">KİRA BAŞLANGIÇ</TableHead>
                                            <TableHead className="whitespace-nowrap font-medium border-x text-blue-900">KİRA BİTİŞ</TableHead>
                                            <TableHead className="whitespace-nowrap font-medium border-x text-blue-900 text-center">SÜRE</TableHead>
                                            <TableHead className="whitespace-nowrap font-medium border-x text-blue-900 text-right">FİYAT</TableHead>
                                            <TableHead className="whitespace-nowrap font-medium border-x text-blue-900">KİRALAYAN</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {detailData && detailData.type === 'delivery' ? (
                                            <TableRow className="bg-white">
                                                <TableCell className="border-x">{detailData.rentalInfo?.startDate || 'Belirtilmedi'}</TableCell>
                                                <TableCell className="border-x">{detailData.rentalInfo?.endDate || 'Belirtilmedi'}</TableCell>
                                                <TableCell className="border-x text-center font-medium">
                                                    {(() => {
                                                        const sd = new Date(detailData.rentalInfo?.startDate);
                                                        const ed = new Date(detailData.rentalInfo?.endDate);
                                                        if (!isNaN(sd.getTime()) && !isNaN(ed.getTime())) {
                                                            const diff = Math.ceil((ed.getTime() - sd.getTime()) / (1000 * 3600 * 24));
                                                            return `${diff} Gün`;
                                                        }
                                                        return '-';
                                                    })()}
                                                </TableCell>
                                                <TableCell className="border-x text-right font-bold text-emerald-700">
                                                    {/* Kiralama ekranında fiyat girilmiş olabilir, yoksa aracın fiyatını yansıt */}
                                                    {formatMoney(detailData.rentalInfo?.price || parsePrice(selectedVehicleRow.price))}
                                                </TableCell>
                                                <TableCell className="border-x space-y-1">
                                                    <div className="font-semibold">{detailData.customer?.name}</div>
                                                    {detailData.customer?.phone && <div className="text-xs text-slate-500">{detailData.customer.phone}</div>}
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            <TableRow className="bg-white">
                                                {selectedVehicleRow.status === 'rented' ? (
                                                    <TableCell colSpan={5} className="text-center py-6 border-x text-amber-600 font-medium">
                                                        Araç kirada görünüyor ancak aktif operasyon sisteminde bulunamadı. Lütfen kiralama işlemini kontrol edin.
                                                    </TableCell>
                                                ) : (
                                                    <TableCell colSpan={5} className="text-center py-6 border-x text-slate-500">
                                                        Araç şu an kirada değil (Müsait).
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Mini Tahsilat Listesi (Bu araç için) */}
                            <div className="mt-6">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-semibold text-slate-800">Bu Araca Ait Tahsilat Geçmişi</h4>
                                    {onAdd && (
                                        <Button variant="outline" size="sm" onClick={() => onAdd(selectedVehicleRow.plate, detailData?.customer?.name)}>
                                            Tahsilat Ekle
                                        </Button>
                                    )}
                                </div>
                                <div className="max-h-48 overflow-y-auto border rounded-md bg-white">
                                    <Table>
                                        <TableHeader className="bg-slate-50 sticky top-0">
                                            <TableRow>
                                                <TableHead>Tarih</TableHead>
                                                <TableHead>Müşteri</TableHead>
                                                <TableHead className="text-right">Tutar</TableHead>
                                                <TableHead className="text-right">İşlem</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {vehiclePaymentsResult.length > 0 ? (
                                                vehiclePaymentsResult.map((p) => (
                                                    <TableRow key={p.id}>
                                                        <TableCell>{new Date(p.date).toLocaleDateString('tr-TR')}</TableCell>
                                                        <TableCell>{p.customerName}</TableCell>
                                                        <TableCell className="text-right font-medium text-emerald-700">{formatMoney(p.amount)}</TableCell>
                                                        <TableCell className="text-right">
                                                            {onEdit && (
                                                                <Button variant="ghost" size="sm" className="h-6 px-2 text-slate-500 hover:text-emerald-600" onClick={() => onEdit(p)}>
                                                                    Düzenle
                                                                </Button>
                                                            )}
                                                            {onDelete && (
                                                                <Button variant="ghost" size="sm" className="h-6 px-2 text-slate-500 hover:text-red-600" onClick={() => {
                                                                    if(window.confirm("Bu tahsilatı silmek istediğinize emin misiniz?")) {
                                                                        onDelete(p.id);
                                                                    }
                                                                }}>
                                                                    Sil
                                                                </Button>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={4} className="text-center text-slate-500 py-4">Kayıtlı tahsilat yok.</TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                            
                            <div className="text-right pt-4 border-t">
                                <Button variant="outline" onClick={() => setDetailPlate(null)}>Kapat</Button>
                            </div>
                        </div>
                    ) : null}
                </DialogContent>
            </Dialog>
        </div>
    );
};

// Helper for price
function parsePrice(p: string | number | undefined): number {
    if (!p) return 0;
    if (typeof p === 'number') return p;
    const cleaned = String(p).replace(/\./g, "").replace(",", ".").trim();
    const num = Number(cleaned);
    return isNaN(num) ? 0 : num;
}
