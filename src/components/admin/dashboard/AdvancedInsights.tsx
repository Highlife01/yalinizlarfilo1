import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Car, UserCheck, TrendingUp, TrendingDown, DollarSign } from "lucide-react";

type StaffStats = {
    email: string;
    deliveryCount: number;
    returnCount: number;
    total: number;
};

type VehicleProfit = {
    plate: string;
    name: string;
    purchasePrice: number;
    revenue: number;
    expense: number;
    profit: number;
    roi: number;
};

interface AdvancedInsightsProps {
    operations: Record<string, unknown>[];
    bookings: Record<string, unknown>[];
    maintenance: Record<string, unknown>[];
    costs: Record<string, unknown>[];
    payments?: Record<string, unknown>[];
    vehicles?: Record<string, unknown>[];
}

export const AdvancedInsights = ({ operations, maintenance, costs, payments = [], vehicles = [] }: AdvancedInsightsProps) => {

    // 1. Staff Performance Analysis
    const staffPerformance = useMemo(() => {
        const stats: Record<string, StaffStats> = {};

        operations.forEach(op => {
            const email = (op.staffEmail as string) || "Bilinmiyor";
            if (!stats[email]) {
                stats[email] = { email, deliveryCount: 0, returnCount: 0, total: 0 };
            }
            if (op.type === 'delivery') stats[email].deliveryCount++;
            if (op.type === 'return') stats[email].returnCount++;
            stats[email].total++;
        });

        return Object.values(stats).sort((a, b) => b.total - a.total);
    }, [operations]);

    // Build vehicle lookup: plate → { name, purchasePrice }
    const vehicleLookup = useMemo(() => {
        const map: Record<string, { name: string; purchasePrice: number }> = {};
        vehicles.forEach(v => {
            const plate = String(v.plate || "").toUpperCase();
            if (plate) {
                map[plate] = {
                    name: String(v.name || ""),
                    purchasePrice: Number(v.purchase_price || 0),
                };
            }
        });
        return map;
    }, [vehicles]);

    // 2. Vehicle Profitability Analysis (uses payments for actual revenue)
    const vehicleProfits = useMemo(() => {
        const profits: Record<string, VehicleProfit> = {};

        const ensureEntry = (plate: string) => {
            if (!profits[plate]) {
                const info = vehicleLookup[plate.toUpperCase()] || { name: "", purchasePrice: 0 };
                profits[plate] = { plate, name: info.name, purchasePrice: info.purchasePrice, revenue: 0, expense: 0, profit: 0, roi: 0 };
            }
        };

        // Revenue from payments (tahsilat = actual collected money)
        payments.forEach(p => {
            const plate = String(p.vehiclePlate || "");
            if (!plate) return;
            ensureEntry(plate);
            profits[plate].revenue += Number(p.amount || 0);
        });

        // Expenses from maintenance
        maintenance.forEach(m => {
            const plate = m.vehiclePlate as string;
            if (!plate) return;
            ensureEntry(plate);
            profits[plate].expense += Number(m.cost || 0);
        });

        // Expenses from vehicle_costs
        costs.forEach(c => {
            const plate = c.vehiclePlate as string;
            if (!plate) return;
            ensureEntry(plate);
            profits[plate].expense += Number(c.amount || 0);
        });

        return Object.values(profits)
            .map(p => {
                const profit = p.revenue - p.expense;
                const totalInvested = p.purchasePrice + p.expense;
                const roi = totalInvested > 0 ? (profit / totalInvested) * 100 : 0;
                return { ...p, profit, roi };
            })
            .sort((a, b) => b.profit - a.profit);
    }, [payments, maintenance, costs, vehicleLookup]);

    // Fleet-wide summary
    const fleetSummary = useMemo(() => {
        const totalPurchase = vehicleProfits.reduce((s, v) => s + v.purchasePrice, 0);
        const totalRevenue = vehicleProfits.reduce((s, v) => s + v.revenue, 0);
        const totalExpense = vehicleProfits.reduce((s, v) => s + v.expense, 0);
        const totalProfit = totalRevenue - totalExpense;
        const totalInvested = totalPurchase + totalExpense;
        const fleetROI = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;
        return { totalPurchase, totalRevenue, totalExpense, totalProfit, fleetROI };
    }, [vehicleProfits]);

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val);

    return (
        <div className="space-y-6">
            {/* Fleet-wide Financial Summary */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <Card className="border-none shadow-sm bg-slate-50">
                    <CardContent className="p-3">
                        <p className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Toplam Alış</p>
                        <p className="text-sm font-black text-slate-900">{formatCurrency(fleetSummary.totalPurchase)}</p>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm bg-green-50">
                    <CardContent className="p-3">
                        <p className="text-[9px] uppercase font-bold text-green-600 tracking-wider">Toplam Gelir</p>
                        <p className="text-sm font-black text-green-700">{formatCurrency(fleetSummary.totalRevenue)}</p>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm bg-red-50">
                    <CardContent className="p-3">
                        <p className="text-[9px] uppercase font-bold text-red-600 tracking-wider">Toplam Gider</p>
                        <p className="text-sm font-black text-red-700">{formatCurrency(fleetSummary.totalExpense)}</p>
                    </CardContent>
                </Card>
                <Card className={`border-none shadow-sm ${fleetSummary.totalProfit >= 0 ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                    <CardContent className="p-3">
                        <p className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Net Kâr</p>
                        <p className={`text-sm font-black ${fleetSummary.totalProfit >= 0 ? 'text-emerald-700' : 'text-amber-700'}`}>{formatCurrency(fleetSummary.totalProfit)}</p>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm bg-blue-50">
                    <CardContent className="p-3">
                        <p className="text-[9px] uppercase font-bold text-blue-600 tracking-wider">Filo ROI</p>
                        <p className="text-sm font-black text-blue-700">%{fleetSummary.fleetROI.toFixed(1)}</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Personnel Performance */}
                <Card className="border-none shadow-md bg-white">
                    <CardHeader className="pb-3 border-b border-slate-50">
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <UserCheck className="w-5 h-5 text-blue-600" />
                            Personel Performans Takibi
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="space-y-4">
                            {staffPerformance.length === 0 ? (
                                <p className="text-sm text-slate-500 text-center py-4">Henüz veri bulunamadı.</p>
                            ) : (
                                staffPerformance.map((staff, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-900">{staff.email}</span>
                                            <span className="text-[10px] text-slate-500 font-medium">Toplam {staff.total} İşlem</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-none">
                                                {staff.deliveryCount} Teslim
                                            </Badge>
                                            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-none">
                                                {staff.returnCount} İade
                                            </Badge>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Vehicle Profitability */}
                <Card className="border-none shadow-md bg-white">
                    <CardHeader className="pb-3 border-b border-slate-50">
                        <CardTitle className="text-lg font-bold flex items-center gap-2 text-green-700">
                            <DollarSign className="w-5 h-5" />
                            Araç Bazlı Kâr/Zarar Analizi
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="space-y-4">
                            {vehicleProfits.length === 0 ? (
                                <p className="text-sm text-slate-500 text-center py-4">Henüz veri bulunamadı.</p>
                            ) : (
                                vehicleProfits.slice(0, 8).map((vehicle, idx) => (
                                    <div key={idx} className="p-3 rounded-lg border border-slate-100 bg-white">
                                        <div className="flex justify-between items-center mb-2">
                                            <div className="flex items-center gap-2">
                                                <Car className="w-4 h-4 text-slate-400" />
                                                <div>
                                                    <span className="text-sm font-black text-slate-900">{vehicle.plate}</span>
                                                    {vehicle.name && <span className="text-xs text-slate-500 ml-1.5">{vehicle.name}</span>}
                                                </div>
                                            </div>
                                            <span className={`text-sm font-bold ${vehicle.profit >= 0 ? 'text-green-600' : 'text-red-600'} flex items-center gap-1`}>
                                                {vehicle.profit >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                                {formatCurrency(vehicle.profit)}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-4 gap-2 mt-1">
                                            {vehicle.purchasePrice > 0 && (
                                                <div className="bg-slate-50 p-1.5 rounded flex flex-col">
                                                    <span className="text-[9px] uppercase font-bold text-slate-500">Alış</span>
                                                    <span className="text-xs font-bold text-slate-700">{formatCurrency(vehicle.purchasePrice)}</span>
                                                </div>
                                            )}
                                            <div className="bg-green-50/50 p-1.5 rounded flex flex-col">
                                                <span className="text-[9px] uppercase font-bold text-green-600">Gelir</span>
                                                <span className="text-xs font-bold text-green-700">{formatCurrency(vehicle.revenue)}</span>
                                            </div>
                                            <div className="bg-red-50/50 p-1.5 rounded flex flex-col">
                                                <span className="text-[9px] uppercase font-bold text-red-600">Gider</span>
                                                <span className="text-xs font-bold text-red-700">{formatCurrency(vehicle.expense)}</span>
                                            </div>
                                            <div className={`p-1.5 rounded flex flex-col ${vehicle.roi >= 0 ? 'bg-blue-50' : 'bg-amber-50'}`}>
                                                <span className="text-[9px] uppercase font-bold text-blue-600">ROI</span>
                                                <span className={`text-xs font-bold ${vehicle.roi >= 0 ? 'text-blue-700' : 'text-amber-700'}`}>%{vehicle.roi.toFixed(1)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
