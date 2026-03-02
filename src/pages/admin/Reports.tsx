import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import { CalendarDays, Car, Download, DollarSign, TrendingDown, TrendingUp, Wrench, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type Vehicle = {
    id: string;
    name: string;
    plate: string;
    status?: "active" | "maintenance" | "rented" | "inactive";
    monthly_fixed_cost?: number;
    cost_per_rental?: number;
};

type Booking = {
    id: string;
    vehiclePlate?: string;
    vehicleName?: string;
    vehicleId?: string;
    startDate?: string;
    endDate?: string;
    totalPrice?: number | string;
    status?: "pending" | "active" | "completed" | "cancelled";
};

type IncomeRecord = {
    id: string;
    operationId?: string;
    vehicleId?: string;
    vehiclePlate?: string;
    amount?: number | string;
    createdAt?: string;
    approvedAt?: string;
    operationDate?: string;
};

type PaymentRecord = {
    id: string;
    vehiclePlate?: string;
    amount: number;
    date?: string;
};

type MaintenanceRecord = {
    id: string;
    vehicleId?: string;
    vehiclePlate?: string;
    cost: number;
    date?: string;
    serviceType?: string;
    status?: string;
};

type ProfitRow = {
    vehicleId: string;
    vehicleName: string;
    plate: string;
    bookingCount: number;
    rentedDays: number;
    revenue: number;
    fixedCost: number;
    variableCost: number;
    maintenanceCost: number;
    netProfit: number;
    margin: number;
    utilization: number;
};

const REVENUE_BOOKING_STATUSES = new Set<NonNullable<Booking["status"]>>(["active", "completed"]);
const DAY_MS = 1000 * 60 * 60 * 24;

const toInputDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const parseAmount = (value: number | string | undefined): number => {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    if (typeof value !== "string") return 0;
    const trimmed = value.trim();
    if (!trimmed) return 0;
    const normalized = trimmed.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
};

const parseDate = (value?: string): Date | null => {
    if (!value) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [year, month, day] = value.split("-").map(Number);
        return new Date(year, month - 1, day);
    }
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(value)) {
        const [day, month, year] = value.split(".").map(Number);
        return new Date(year, month - 1, day);
    }
    if (/^\d{2}-\d{2}-\d{4}$/.test(value)) {
        const [day, month, year] = value.split("-").map(Number);
        return new Date(year, month - 1, day);
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const overlapDays = (bookingStart: Date, bookingEnd: Date, rangeStart: Date, rangeEnd: Date): number => {
    const start = bookingStart <= bookingEnd ? bookingStart : bookingEnd;
    const end = bookingStart <= bookingEnd ? bookingEnd : bookingStart;
    const intersectionStart = new Date(Math.max(start.getTime(), rangeStart.getTime()));
    const intersectionEnd = new Date(Math.min(end.getTime(), rangeEnd.getTime()));
    if (intersectionStart.getTime() > intersectionEnd.getTime()) return 0;
    return Math.floor((intersectionEnd.getTime() - intersectionStart.getTime()) / DAY_MS) + 1;
};

const formatMoney = (value: number) =>
    new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

export const Reports = () => {
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [incomes, setIncomes] = useState<IncomeRecord[]>([]);
    const [payments, setPayments] = useState<PaymentRecord[]>([]);
    const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
    const [loading, setLoading] = useState(true);

    const today = useMemo(() => new Date(), []);
    const firstDayOfMonth = useMemo(() => new Date(today.getFullYear(), today.getMonth(), 1), [today]);
    const [startDate, setStartDate] = useState(toInputDate(firstDayOfMonth));
    const [endDate, setEndDate] = useState(toInputDate(today));

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [vehiclesSnap, bookingsSnap, incomesSnap, maintenanceSnap, paymentsSnap] = await Promise.all([
                    getDocs(collection(db, "vehicles")),
                    getDocs(collection(db, "bookings")),
                    getDocs(collection(db, "income_records")),
                    getDocs(collection(db, "maintenance")),
                    getDocs(collection(db, "payments")),
                ]);

                setVehicles(vehiclesSnap.docs.map((d) => {
                    const data = d.data();
                    return {
                        id: d.id, name: String(data.name || "Araç"), plate: String(data.plate || "-"),
                        status: data.status, monthly_fixed_cost: Number(data.monthly_fixed_cost || 0),
                        cost_per_rental: Number(data.cost_per_rental || 0),
                    };
                }));

                setBookings(bookingsSnap.docs.map((d) => {
                    const data = d.data();
                    return {
                        id: d.id, vehiclePlate: data.vehiclePlate, vehicleName: data.vehicleName,
                        vehicleId: data.vehicleId, startDate: data.startDate, endDate: data.endDate,
                        totalPrice: data.totalPrice, status: data.status,
                    };
                }));

                setIncomes(incomesSnap.docs.map((d) => {
                    const data = d.data();
                    return {
                        id: d.id, operationId: data.operationId, vehicleId: data.vehicleId,
                        vehiclePlate: data.vehiclePlate, amount: data.amount,
                        createdAt: data.createdAt, approvedAt: data.approvedAt, operationDate: data.operationDate,
                    };
                }));

                setMaintenanceRecords(maintenanceSnap.docs.map((d) => {
                    const data = d.data();
                    return {
                        id: d.id, vehicleId: data.vehicleId || "", vehiclePlate: data.vehiclePlate || "",
                        cost: Number(data.cost || 0), date: data.date, serviceType: data.serviceType,
                        status: data.status,
                    };
                }));

                setPayments(paymentsSnap.docs.map((d) => {
                    const data = d.data();
                    return {
                        id: d.id,
                        vehiclePlate: String(data.vehiclePlate || ""),
                        amount: Number(data.amount || 0),
                        date: String(data.date || ""),
                    };
                }));
            } catch (error) {
                console.error("Reports fetch error:", error);
            } finally {
                setLoading(false);
            }
        };
        void fetchData();
    }, []);

    const profitability = useMemo(() => {
        const rangeStart = parseDate(startDate) || firstDayOfMonth;
        const rangeEndRaw = parseDate(endDate) || today;
        const rangeEnd = new Date(rangeEndRaw.getFullYear(), rangeEndRaw.getMonth(), rangeEndRaw.getDate(), 23, 59, 59, 999);
        const normalizedRangeStart = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate(), 0, 0, 0, 0);
        const periodDays = Math.max(1, Math.floor((rangeEnd.getTime() - normalizedRangeStart.getTime()) / DAY_MS) + 1);
        const periodMonths = periodDays / 30;

        const relevantBookings = bookings.filter((b) => {
            if (!b.status || !REVENUE_BOOKING_STATUSES.has(b.status)) return false;
            const s = parseDate(b.startDate);
            const e = parseDate(b.endDate || b.startDate);
            if (!s || !e) return false;
            return overlapDays(s, e, normalizedRangeStart, rangeEnd) > 0;
        });

        const relevantIncomes = incomes.filter((i) => {
            const d = parseDate(i.createdAt) || parseDate(i.approvedAt) || parseDate(i.operationDate);
            return d ? d >= normalizedRangeStart && d <= rangeEnd : false;
        });

        const relevantPayments = payments.filter((p) => {
            const d = parseDate(p.date);
            return d ? d >= normalizedRangeStart && d <= rangeEnd : false;
        });

        const relevantMaintenance = maintenanceRecords.filter((m) => {
            const d = parseDate(m.date);
            return d ? d >= normalizedRangeStart && d <= rangeEnd : false;
        });

        const rows: ProfitRow[] = vehicles.map((vehicle) => {
            const vehicleBookings = relevantBookings.filter((b) =>
                (b.vehicleId && b.vehicleId === vehicle.id) ||
                (b.vehiclePlate && b.vehiclePlate === vehicle.plate) ||
                (b.vehicleName && b.vehicleName === vehicle.name)
            );

            const vehicleIncomes = relevantIncomes.filter((i) =>
                (i.vehicleId && i.vehicleId === vehicle.id) ||
                (i.vehiclePlate && i.vehiclePlate === vehicle.plate)
            );

            const vehiclePayments = relevantPayments.filter((p) =>
                p.vehiclePlate && p.vehiclePlate === vehicle.plate
            );

            const vehicleMaintenance = relevantMaintenance.filter((m) =>
                (m.vehicleId && m.vehicleId === vehicle.id) ||
                (m.vehiclePlate && m.vehiclePlate === vehicle.plate)
            );

            const bookingCount = vehicleBookings.length;
            // Use actual payments (tahsilat) for revenue; fall back to income_records if no payments exist
            const paymentRevenue = vehiclePayments.reduce((sum, p) => sum + p.amount, 0);
            const incomeRevenue = vehicleIncomes.reduce((sum, i) => sum + parseAmount(i.amount), 0);
            const revenue = relevantPayments.length > 0 ? paymentRevenue : incomeRevenue;
            const maintenanceCost = vehicleMaintenance.reduce((sum, m) => sum + m.cost, 0);

            const rentedDays = vehicleBookings.reduce((sum, b) => {
                const s = parseDate(b.startDate);
                const e = parseDate(b.endDate || b.startDate);
                if (!s || !e) return sum;
                return sum + overlapDays(s, e, normalizedRangeStart, rangeEnd);
            }, 0);

            const fixedCost = Number(vehicle.monthly_fixed_cost || 0) * periodMonths;
            const variableCost = Number(vehicle.cost_per_rental || 0) * bookingCount;
            const totalCost = fixedCost + variableCost + maintenanceCost;
            const netProfit = revenue - totalCost;
            const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
            const utilization = Math.min(100, (rentedDays / periodDays) * 100);

            return {
                vehicleId: vehicle.id, vehicleName: vehicle.name, plate: vehicle.plate,
                bookingCount, rentedDays, revenue, fixedCost, variableCost, maintenanceCost,
                netProfit, margin, utilization,
            };
        });

        rows.sort((a, b) => b.netProfit - a.netProfit);

        const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
        const totalFixedCost = rows.reduce((s, r) => s + r.fixedCost, 0);
        const totalVariableCost = rows.reduce((s, r) => s + r.variableCost, 0);
        const totalMaintenanceCost = rows.reduce((s, r) => s + r.maintenanceCost, 0);
        const totalNetProfit = rows.reduce((s, r) => s + r.netProfit, 0);
        const profitableCount = rows.filter((r) => r.netProfit > 0).length;
        const lossCount = rows.filter((r) => r.netProfit < 0).length;
        const avgMargin = totalRevenue > 0 ? (totalNetProfit / totalRevenue) * 100 : 0;

        return {
            rows, periodDays, totalRevenue, totalFixedCost, totalVariableCost,
            totalMaintenanceCost, totalNetProfit, profitableCount, lossCount, avgMargin,
        };
    }, [bookings, incomes, payments, maintenanceRecords, vehicles, startDate, endDate, firstDayOfMonth, today]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">Araç Karlılık Raporu</h2>
                    <p className="text-slate-500">
                        Gelir − (sabit gider + değişken gider + bakım masrafı) = net kâr
                    </p>
                </div>
                <Button variant="outline" disabled>
                    <Download className="w-4 h-4 mr-2" /> Excel Çıktı
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><CalendarDays className="w-5 h-5" /> Dönem Seçimi</CardTitle>
                    <CardDescription>Karlılık hesabı seçilen tarih aralığına göre üretilir.</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Başlangıç</label>
                        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Bitiş</label>
                        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    </div>
                    <div className="flex items-end">
                        <Button variant="outline" className="w-full" onClick={() => { setStartDate(toInputDate(firstDayOfMonth)); setEndDate(toInputDate(today)); }}>
                            Bu Aya Dön
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* ÖZET KARTLAR */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Tahsil Edilen Gelir</CardTitle>
                        <DollarSign className="w-4 h-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold text-emerald-700">{formatMoney(profitability.totalRevenue)}</div>
                        <p className="text-xs text-slate-500">{profitability.periodDays} günlük dönem</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Sabit Gider</CardTitle>
                        <TrendingDown className="w-4 h-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold">{formatMoney(profitability.totalFixedCost)}</div>
                        <p className="text-xs text-slate-500">Aylık giderlerin döneme dağılımı</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Değişken Gider</CardTitle>
                        <TrendingDown className="w-4 h-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold">{formatMoney(profitability.totalVariableCost)}</div>
                        <p className="text-xs text-slate-500">Kiralama başına giderler</p>
                    </CardContent>
                </Card>

                <Card className="border-amber-200">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Bakım Masrafı</CardTitle>
                        <Wrench className="w-4 h-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold text-amber-700">{formatMoney(profitability.totalMaintenanceCost)}</div>
                        <p className="text-xs text-slate-500">Servis, sigorta, onarım</p>
                    </CardContent>
                </Card>

                <Card className={profitability.totalNetProfit >= 0 ? "border-emerald-200" : "border-red-200"}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Net Kâr</CardTitle>
                        <TrendingUp className="w-4 h-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-xl font-bold ${profitability.totalNetProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                            {formatMoney(profitability.totalNetProfit)}
                        </div>
                        <p className="text-xs text-slate-500">Marj: %{profitability.avgMargin.toFixed(1)}</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Araç Durumu</CardTitle>
                        <Car className="w-4 h-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold">{profitability.profitableCount}<span className="text-sm font-normal text-slate-400">/{vehicles.length}</span></div>
                        <p className="text-xs text-slate-500">
                            Kârlı: {profitability.profitableCount} • Zararda: {profitability.lossCount}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* ARAÇ BAZLI TABLO */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Wallet className="w-5 h-5" /> Araç Bazlı Karlılık</CardTitle>
                    <CardDescription>
                        Net Kâr = Gelir − Sabit Gider − Değişken Gider − Bakım Masrafı
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="py-10 text-center text-slate-500">Veriler yükleniyor...</div>
                    ) : (
                        <div className="rounded-md border overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50">
                                        <TableHead className="font-semibold">Araç</TableHead>
                                        <TableHead className="text-right font-semibold">Kiralama</TableHead>
                                        <TableHead className="text-right font-semibold">Gün</TableHead>
                                        <TableHead className="text-right font-semibold">Gelir</TableHead>
                                        <TableHead className="text-right font-semibold">Sabit G.</TableHead>
                                        <TableHead className="text-right font-semibold">Değişken G.</TableHead>
                                        <TableHead className="text-right font-semibold">Bakım</TableHead>
                                        <TableHead className="text-right font-semibold">Net Kâr</TableHead>
                                        <TableHead className="text-right font-semibold">Marj</TableHead>
                                        <TableHead className="text-right font-semibold">Kullanım</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {profitability.rows.map((row) => (
                                        <TableRow key={row.vehicleId} className="hover:bg-slate-50">
                                            <TableCell>
                                                <div className="font-medium text-sm">{row.vehicleName}</div>
                                                <div className="text-xs text-slate-500 font-mono">{row.plate}</div>
                                            </TableCell>
                                            <TableCell className="text-right">{row.bookingCount}</TableCell>
                                            <TableCell className="text-right">{row.rentedDays}</TableCell>
                                            <TableCell className="text-right text-emerald-700 font-medium">{formatMoney(row.revenue)}</TableCell>
                                            <TableCell className="text-right text-sm">{formatMoney(row.fixedCost)}</TableCell>
                                            <TableCell className="text-right text-sm">{formatMoney(row.variableCost)}</TableCell>
                                            <TableCell className="text-right text-sm">
                                                {row.maintenanceCost > 0 ? (
                                                    <span className="text-amber-700">{formatMoney(row.maintenanceCost)}</span>
                                                ) : (
                                                    <span className="text-slate-300">₺0</span>
                                                )}
                                            </TableCell>
                                            <TableCell className={`text-right font-bold ${row.netProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                                                {formatMoney(row.netProfit)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Badge variant="outline" className={row.margin >= 20 ? "text-emerald-700 border-emerald-200" : row.margin >= 0 ? "text-amber-700 border-amber-200" : "text-red-700 border-red-200"}>
                                                    %{row.margin.toFixed(1)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div className={`h-full rounded-full ${row.utilization >= 70 ? "bg-emerald-500" : row.utilization >= 40 ? "bg-amber-500" : "bg-red-400"}`} style={{ width: `${row.utilization}%` }} />
                                                    </div>
                                                    <span className="text-xs text-slate-500">%{row.utilization.toFixed(0)}</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {profitability.rows.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={10} className="text-center py-10 text-slate-500">Araç bulunamadı.</TableCell>
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
