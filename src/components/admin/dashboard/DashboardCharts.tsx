import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis } from "recharts";
import { BarChart3, Calendar, Activity, DollarSign, Car } from "lucide-react";

interface VehicleStatusDatum {
    key: string;
    label: string;
    value: number;
    fill: string;
}

interface BookingStatusDatum {
    key: string;
    label: string;
    count: number;
    fill: string;
}

interface OperationTrendDatum {
    day: string;
    fullDate: string;
    count: number;
}

interface MonthlyRevenueDatum {
    monthKey: string;
    name: string;
    revenue: number;
}

interface PopularVehicleDatum {
    name: string;
    count: number;
    fill: string;
}

interface DashboardChartsProps {
    vehicleStatusData: VehicleStatusDatum[];
    vehicleStatusConfig: ChartConfig;
    bookingStatusData: BookingStatusDatum[];
    bookingStatusConfig: ChartConfig;
    operationsTrendData: OperationTrendDatum[];
    operationTrendConfig: ChartConfig;
    monthlyRevenueData: MonthlyRevenueDatum[];
    monthlyRevenueConfig: ChartConfig;
    popularVehiclesData: PopularVehicleDatum[];
    popularVehicleConfig: ChartConfig;
    totalOperations7Days: number;
    totalBookings: number;
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({
    vehicleStatusData,
    vehicleStatusConfig,
    bookingStatusData,
    bookingStatusConfig,
    operationsTrendData,
    operationTrendConfig,
    monthlyRevenueData,
    monthlyRevenueConfig,
    popularVehiclesData,
    popularVehicleConfig,
    totalOperations7Days,
    totalBookings,
}) => {
    return (
        <div className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-3">
                <Card className="border-0 bg-gradient-to-br from-emerald-50 via-white to-emerald-100 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <BarChart3 className="h-4 w-4 text-emerald-700" />
                            Araç Durum Dağılımı
                        </CardTitle>
                        <CardDescription>Filodaki anlık durum dağılımı</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {vehicleStatusData.length > 0 ? (
                            <>
                                <ChartContainer config={vehicleStatusConfig} className="h-[220px] w-full">
                                    <PieChart>
                                        <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="key" />} />
                                        <Pie
                                            data={vehicleStatusData}
                                            dataKey="value"
                                            nameKey="key"
                                            innerRadius={52}
                                            outerRadius={88}
                                            paddingAngle={3}
                                            strokeWidth={2}
                                        >
                                            {vehicleStatusData.map((entry) => (
                                                <Cell key={entry.key} fill={entry.fill} />
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </ChartContainer>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    {vehicleStatusData.map((item) => (
                                        <div key={item.key} className="flex items-center justify-between rounded-md border bg-white/70 px-2 py-1.5">
                                            <span className="flex items-center gap-2">
                                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.fill }} />
                                                {item.label}
                                            </span>
                                            <span className="font-semibold">{item.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <p className="py-10 text-center text-sm text-muted-foreground">Grafik için araç verisi bulunamadı</p>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-0 bg-gradient-to-br from-sky-50 via-white to-indigo-100 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Calendar className="h-4 w-4 text-sky-700" />
                            Rezervasyon Durumları
                        </CardTitle>
                        <CardDescription>Aktif, bekleyen ve tamamlanan dağılımı</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <ChartContainer config={bookingStatusConfig} className="h-[220px] w-full">
                            <BarChart data={bookingStatusData} barCategoryGap={22}>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                <XAxis dataKey="label" tickLine={false} axisLine={false} interval={0} tickMargin={8} />
                                <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="key" />} />
                                <Bar dataKey="count" radius={[10, 10, 0, 0]}>
                                    {bookingStatusData.map((entry) => (
                                        <Cell key={entry.key} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ChartContainer>
                        <div className="text-xs text-muted-foreground">
                            Toplam rezervasyon:{" "}
                            <span className="font-semibold text-slate-800">{totalBookings}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-0 bg-gradient-to-br from-indigo-50 via-white to-violet-100 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Activity className="h-4 w-4 text-indigo-700" />
                            Son 7 Gün Operasyon
                        </CardTitle>
                        <CardDescription>Gün bazlı operasyon hareketi</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <ChartContainer config={operationTrendConfig} className="h-[220px] w-full">
                            <AreaChart data={operationsTrendData} margin={{ left: 4, right: 8, top: 8 }}>
                                <defs>
                                    <linearGradient id="operationsGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--color-count)" stopOpacity={0.35} />
                                        <stop offset="95%" stopColor="var(--color-count)" stopOpacity={0.03} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
                                <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                                <Area
                                    type="monotone"
                                    dataKey="count"
                                    stroke="var(--color-count)"
                                    strokeWidth={2.5}
                                    fill="url(#operationsGradient)"
                                />
                            </AreaChart>
                        </ChartContainer>
                        <div className="flex items-center justify-between rounded-md border bg-white/70 px-3 py-2 text-xs">
                            <span className="text-muted-foreground">Son 7 gün toplam operasyon</span>
                            <span className="font-semibold text-slate-800">{totalOperations7Days}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <Card className="border-0 bg-gradient-to-br from-emerald-50 via-white to-teal-50 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <DollarSign className="h-4 w-4 text-emerald-700" />
                            Aylara Göre Tahsilat (Son 6 Ay)
                        </CardTitle>
                        <CardDescription>Aylık gerçekleşen toplam ciro</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <ChartContainer config={monthlyRevenueConfig} className="h-[250px] w-full">
                            <BarChart data={monthlyRevenueData} barCategoryGap={30}>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                                <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="name" />} />
                                <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>

                <Card className="border-0 bg-gradient-to-br from-amber-50 via-white to-orange-50 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Car className="h-4 w-4 text-amber-700" />
                            En Çok Kiralanan Araç Sınıfları
                        </CardTitle>
                        <CardDescription>İptal edilmeyen taleplere göre popüler sınıflar</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {popularVehiclesData.length > 0 ? (
                            <ChartContainer config={popularVehicleConfig} className="h-[250px] w-full">
                                <PieChart>
                                    <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                                    <Pie
                                        data={popularVehiclesData}
                                        dataKey="count"
                                        nameKey="name"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={3}
                                        strokeWidth={2}
                                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                        labelLine={false}
                                    >
                                        {popularVehiclesData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ChartContainer>
                        ) : (
                            <p className="py-10 text-center text-sm text-muted-foreground">Yeterli rezervasyon verisi bulunamadı</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
