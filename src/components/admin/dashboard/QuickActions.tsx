import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Car, Calendar, CheckCircle, TrendingUp, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const QuickActions: React.FC = () => {
    const navigate = useNavigate();

    return (
        <Card className="shadow-sm mt-4 border-slate-100 bg-white/50 backdrop-blur-sm">
            <CardHeader className="pb-3 px-6 pt-5">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-400">Hızlı İşlemler</CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6 pt-0">
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                    <Button variant="outline" className="h-20 flex-col gap-2 border-2 hover:bg-slate-50 hover:border-blue-400 transition-all group" onClick={() => navigate("/admin/fleet")}>
                        <Car className="w-6 h-6 text-slate-400 group-hover:text-blue-500 transition-colors" />
                        <span className="text-xs font-bold text-slate-600">Filo Yönetimi</span>
                    </Button>
                    <Button variant="outline" className="h-20 flex-col gap-2 border-2 hover:bg-slate-50 hover:border-emerald-400 transition-all group" onClick={() => navigate("/admin/bookings")}>
                        <Calendar className="w-6 h-6 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                        <span className="text-xs font-bold text-slate-600">Rezervasyonlar</span>
                    </Button>
                    <Button variant="outline" className="h-20 flex-col gap-2 border-2 hover:bg-slate-50 hover:border-indigo-400 transition-all group" onClick={() => navigate("/admin/operations")}>
                        <CheckCircle className="w-6 h-6 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                        <span className="text-xs font-bold text-slate-600">Araç Teslim</span>
                    </Button>
                    <Button variant="outline" className="h-20 flex-col gap-2 border-2 hover:bg-slate-50 hover:border-amber-400 transition-all group" onClick={() => navigate("/admin/reports")}>
                        <TrendingUp className="w-6 h-6 text-slate-400 group-hover:text-amber-500 transition-colors" />
                        <span className="text-xs font-bold text-slate-600">Finansal Rapor</span>
                    </Button>
                    <Button variant="outline" className="h-20 flex-col gap-2 border-2 hover:bg-slate-50 hover:border-violet-400 transition-all group" onClick={() => navigate("/admin/contract-builder")}>
                        <FileText className="w-6 h-6 text-slate-400 group-hover:text-violet-500 transition-colors" />
                        <span className="text-xs font-bold text-slate-600">Sözleşme Bas</span>
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};
