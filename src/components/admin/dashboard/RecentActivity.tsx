import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Inbox } from "lucide-react";

interface OperationRow {
    id: string;
    type: string;
    date?: string;
    vehicleId?: string;
    vehiclePlate?: string;
    km?: number;
}

interface ContactMessageRow {
    id: string;
    name: string;
    email: string;
    phone: string;
    message: string;
    createdAt?: string;
    isRead: boolean;
}

interface RecentActivityProps {
    recentActivities: OperationRow[];
    recentMessages: ContactMessageRow[];
    unreadCount: number;
    toDateSafe: (val: unknown) => Date | null;
}

export const RecentActivity: React.FC<RecentActivityProps> = ({
    recentActivities,
    recentMessages,
    unreadCount,
    toDateSafe,
}) => {
    return (
        <div className="grid gap-4 lg:grid-cols-2">
            <Card className="shadow-sm">
                <CardHeader className="pb-3 border-b bg-slate-50/50">
                    <CardTitle className="text-base font-bold">Son Aktiviteler</CardTitle>
                    <CardDescription className="text-xs tracking-tight uppercase font-medium text-slate-400">En son filo operasyonları</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="space-y-0 max-h-[320px] overflow-y-auto divide-y">
                        {recentActivities.length > 0 ? (
                            recentActivities.map((op) => (
                                <div key={op.id} className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors">
                                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${op.type === "delivery" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"}`} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-700 truncate">
                                            {(op.vehiclePlate || "Plaka yok")} - {op.type === "delivery" ? "Araba Teslim" : "Geri İade"}
                                        </p>
                                        <p className="text-xs text-slate-400 font-medium">
                                            {toDateSafe(op.date)?.toLocaleString("tr-TR", {
                                                day: "numeric",
                                                month: "short",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            }) || "Tarih yok"}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-10">Henüz aktivite yok</p>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card className="shadow-sm">
                <CardHeader className="pb-3 border-b bg-slate-50/50 flex flex-row items-center justify-between space-y-0">
                    <div>
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                            <Inbox className="w-4 h-4 text-indigo-600" />
                            Mesaj Kutusu
                        </CardTitle>
                        <CardDescription className="text-xs tracking-tight uppercase font-medium text-slate-400">Web iletişim formu</CardDescription>
                    </div>
                    {unreadCount > 0 && (
                        <Badge variant="destructive" className="h-5 px-1.5 text-[10px] font-black animate-pulse">{unreadCount} YENİ</Badge>
                    )}
                </CardHeader>
                <CardContent className="p-0">
                    <div className="space-y-0 max-h-[320px] overflow-y-auto divide-y">
                        {recentMessages.length > 0 ? (
                            recentMessages.map((message) => (
                                <div key={message.id} className={`p-4 hover:bg-slate-50 transition-colors ${!message.isRead ? "bg-indigo-50/30" : ""}`}>
                                    <div className="mb-1 flex items-start justify-between gap-2">
                                        <p className="text-sm font-bold text-slate-800 truncate">{message.name}</p>
                                        {!message.isRead && <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5" />}
                                    </div>
                                    <p className="text-[11px] font-bold text-indigo-500 uppercase tracking-tighter truncate">
                                        {message.phone || message.email || "İletişim yok"}
                                    </p>
                                    <p className="mt-1.5 text-xs text-slate-600 line-clamp-2 leading-relaxed italic">
                                        "{message.message || "Mesaj boş"}"
                                    </p>
                                    <p className="mt-2 text-[10px] text-slate-400 font-bold">
                                        {toDateSafe(message.createdAt)?.toLocaleString("tr-TR", {
                                            day: "numeric",
                                            month: "short",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        }) || "Tarih yok"}
                                    </p>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-10">Henüz mesaj yok</p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
