import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Car, DollarSign, Calendar, Wrench } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface DashboardStatsProps {
    rentedCount: number;
    availableCount: number;
    activeRentals: number;
    totalRevenue: number;
    totalInvoiced: number;
    maintenanceCount: number;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({
    rentedCount,
    availableCount,
    activeRentals,
    totalRevenue,
    totalInvoiced,
    maintenanceCount,
}) => {
    const navigate = useNavigate();

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate("/admin/fleet")}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Filo Özeti</CardTitle>
                    <Car className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{rentedCount + availableCount}</div>
                    <p className="text-xs text-muted-foreground">toplam araç</p>
                    <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-blue-600 font-semibold">{rentedCount} kirada</span>
                        <span className="text-xs text-emerald-600 font-semibold">{availableCount} müsait</span>
                    </div>
                </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate("/admin/bookings")}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Aktif Kiralamalar</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{activeRentals}</div>
                    <p className="text-xs text-muted-foreground">aktif kiralama durumu</p>
                </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate("/admin/operations")}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Tahsilat</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{totalRevenue.toLocaleString("tr-TR")} TL</div>
                    <div className="flex items-center text-xs text-green-600">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        gerçek tahsilat
                    </div>
                    {totalInvoiced > 0 && (
                        <p className="text-[11px] text-slate-400 mt-1">
                            Faturalanan: {totalInvoiced.toLocaleString("tr-TR")} TL
                        </p>
                    )}
                </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate("/admin/maintenance")}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Bakım</CardTitle>
                    <Wrench className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{maintenanceCount}</div>
                    <p className="text-xs text-muted-foreground">bakımda olan araç</p>
                </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800 text-white shadow-xl hover:shadow-2xl transition-all hover:scale-[1.02]">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400">Genel Durum</CardTitle>
                    <TrendingUp className="h-4 w-4 text-blue-400" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-black text-blue-400">#{rentedCount + activeRentals} İşlem</div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">SİSTEM AKTİF İZLENİYOR</p>
                </CardContent>
            </Card>
        </div>
    );
};
