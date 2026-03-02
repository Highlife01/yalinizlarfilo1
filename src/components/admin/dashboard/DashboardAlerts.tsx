import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

interface DocumentReminder {
    vehicleId: string;
    plate: string;
    documentType: "Sigorta" | "Kasko" | "TÜVTÜRK";
    daysUntil: number;
}

interface DashboardAlertsProps {
    documentReminders: DocumentReminder[];
    insuranceCount: number;
    cascoCount: number;
    tuvCount: number;
    expiredCount: number;
}

export const DashboardAlerts: React.FC<DashboardAlertsProps> = ({
    documentReminders,
    insuranceCount,
    cascoCount,
    tuvCount,
    expiredCount,
}) => {
    return (
        <Card className={documentReminders.length > 0 ? "border-l-4 border-l-red-500 shadow-sm" : "shadow-sm"}>
            <CardHeader className="pb-3 px-6 pt-5">
                <CardTitle className="flex items-center gap-2 text-base font-bold">
                    <AlertTriangle className={documentReminders.length > 0 ? "w-5 h-5 text-red-600" : "w-5 h-5 text-emerald-600"} />
                    Döküman ve Belge Takibi
                </CardTitle>
                <CardDescription className="text-xs">Bitişe 15 gün ve altı kalan belgeler</CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-6 pt-2">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm group hover:border-amber-300 transition-colors">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Yaklaşan Sigorta</p>
                        <div className="flex items-center justify-between">
                            <p className="text-2xl font-black text-slate-800 tracking-tight">{insuranceCount}</p>
                            <div className="h-2 w-2 rounded-full bg-amber-400 group-hover:animate-ping" />
                        </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm group hover:border-blue-300 transition-colors">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Yaklaşan Kasko</p>
                        <div className="flex items-center justify-between">
                            <p className="text-2xl font-black text-slate-800 tracking-tight">{cascoCount}</p>
                            <div className="h-2 w-2 rounded-full bg-blue-400 group-hover:animate-ping" />
                        </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm group hover:border-indigo-300 transition-colors">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Yaklaşan TÜVTÜRK</p>
                        <div className="flex items-center justify-between">
                            <p className="text-2xl font-black text-slate-800 tracking-tight">{tuvCount}</p>
                            <div className="h-2 w-2 rounded-full bg-indigo-400 group-hover:animate-ping" />
                        </div>
                    </div>
                    <div className={`rounded-xl border p-4 shadow-sm group transition-colors ${expiredCount > 0 ? "bg-red-50 border-red-200" : "bg-white border-slate-200"}`}>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Süresi Dolanlar</p>
                        <div className="flex items-center justify-between">
                            <p className={`text-2xl font-black tracking-tight ${expiredCount > 0 ? "text-red-600" : "text-slate-800"}`}>{expiredCount}</p>
                            {expiredCount > 0 && <AlertTriangle className="w-4 h-4 text-red-600 animate-bounce" />}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
