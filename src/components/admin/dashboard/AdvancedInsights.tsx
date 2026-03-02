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
    revenue: number;
    expense: number;
    profit: number;
};

interface AdvancedInsightsProps {
    operations: Record<string, unknown>[];
    bookings: Record<string, unknown>[];
    maintenance: Record<string, unknown>[];
    costs: Record<string, unknown>[];
}

export const AdvancedInsights = ({ operations, bookings, maintenance, costs }: AdvancedInsightsProps) => {

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

    // 2. Vehicle Profitability Analysis
    const vehicleProfits = useMemo(() => {
        const profits: Record<string, VehicleProfit> = {};

        // Revenue from bookings
        bookings.forEach(b => {
            if (b.status === 'cancelled') return;
            const plate = b.vehiclePlate as string;
            if (!plate) return;
            if (!profits[plate]) profits[plate] = { plate, revenue: 0, expense: 0, profit: 0 };
            profits[plate].revenue += Number(b.totalPrice || 0);
        });

        // Expenses from maintenance
        maintenance.forEach(m => {
            const plate = m.vehiclePlate as string;
            if (!plate) return;
            if (!profits[plate]) profits[plate] = { plate, revenue: 0, expense: 0, profit: 0 };
            profits[plate].expense += Number(m.cost || 0);
        });

        // Expenses from other costs
        costs.forEach(c => {
            const plate = c.vehiclePlate as string;
            if (!plate) return;
            if (!profits[plate]) profits[plate] = { plate, revenue: 0, expense: 0, profit: 0 };
            profits[plate].expense += Number(c.amount || 0);
        });

        return Object.values(profits)
            .map(p => ({ ...p, profit: p.revenue - p.expense }))
            .sort((a, b) => b.profit - a.profit);
    }, [bookings, maintenance, costs]);

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val);

    return (
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
                            vehicleProfits.slice(0, 5).map((vehicle, idx) => (
                                <div key={idx} className="p-3 rounded-lg border border-slate-100 bg-white">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm font-black text-slate-900 flex items-center gap-2">
                                            <Car className="w-4 h-4 text-slate-400" />
                                            {vehicle.plate}
                                        </span>
                                        <span className={`text-sm font-bold ${vehicle.profit >= 0 ? 'text-green-600' : 'text-red-600'} flex items-center gap-1`}>
                                            {vehicle.profit >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                            Net: {formatCurrency(vehicle.profit)}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 mt-1">
                                        <div className="bg-green-50/50 p-2 rounded flex flex-col">
                                            <span className="text-[9px] uppercase font-bold text-green-600">Gelir</span>
                                            <span className="text-xs font-bold text-green-700">{formatCurrency(vehicle.revenue)}</span>
                                        </div>
                                        <div className="bg-red-50/50 p-2 rounded flex flex-col">
                                            <span className="text-[9px] uppercase font-bold text-red-600">Gider</span>
                                            <span className="text-xs font-bold text-red-700">{formatCurrency(vehicle.expense)}</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
