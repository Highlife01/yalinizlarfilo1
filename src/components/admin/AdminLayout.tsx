import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { auth } from "@/integrations/firebase/client";
import {
    LayoutDashboard,
    Car,
    Settings,
    LogOut,
    Menu,
    Wrench,
    CalendarRange,
    Users,
    AlertTriangle,
    BarChart3,
    FileText,
    Wallet,
    Banknote
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface AdminLayoutProps {
    children: React.ReactNode;
    handleSignOut: () => void;
    userRole?: string | null;
}

export const AdminLayout = ({ children, handleSignOut, userRole }: AdminLayoutProps) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();

    const menuItems = [
        { icon: LayoutDashboard, label: "Genel Bakış", path: "/admin" },
        { icon: Car, label: "Araç Filosu", path: "/admin/fleet" },
        { icon: CalendarRange, label: "Rezervasyonlar", path: "/admin/bookings" },
        { icon: Wrench, label: "Bakım & Servis", path: "/admin/maintenance" },
        { icon: Car, label: "Operasyon (Tablet)", path: "/admin/operations" },
        { icon: AlertTriangle, label: "Hasar Raporları", path: "/admin/damage-reports" },
        { icon: FileText, label: "Sözleşmeler", path: "/admin/contracts" },
        { icon: FileText, label: "Sözleşme Oluştur", path: "/admin/contract-builder" },
        { icon: FileText, label: "Faturalar", path: "/admin/invoices" },
        { icon: Wallet, label: "Araç Carisi", path: "/admin/vehicle-costs" },
        { icon: Banknote, label: "Tahsilat", path: "/admin/tahsilat" },
        { icon: BarChart3, label: "Raporlar", path: "/admin/reports" },
        { icon: Users, label: "Müşteriler", path: "/admin/customers" },
        { icon: Settings, label: "Ayarlar", path: "/admin/settings" },
    ].filter(item => {
        if (userRole === "operation") {
            return ["/admin/operations", "/admin/fleet", "/admin/customers", "/admin/damage-reports"].includes(item.path);
        }
        return true;
    });

    const SidebarContent = () => (
        <>
            <div className="flex h-16 items-center border-b px-6 bg-slate-900 text-white">
                <Car className="mr-2 h-6 w-6 text-primary" />
                <span className="font-bold text-lg tracking-tight">Yalınızlar Filo</span>
            </div>
            <div className="flex-1 py-6 bg-slate-900">
                <nav className="grid items-start px-4 text-sm font-medium gap-2">
                    {menuItems.map((item) => {
                        const isActive = location.pathname === item.path || (item.path !== "/admin" && location.pathname.startsWith(item.path));
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => setSidebarOpen(false)}
                            >
                                <Button
                                    variant="ghost"
                                    className={`w-full justify-start transition-all duration-200 ${isActive
                                        ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
                                        : "text-slate-400 hover:text-white hover:bg-slate-800"
                                        }`}
                                >
                                    <item.icon className="mr-3 h-5 w-5" />
                                    {item.label}
                                </Button>
                            </Link>
                        );
                    })}
                </nav>
            </div>
            <div className="border-t border-slate-800 p-4 bg-slate-900">
                <Button
                    variant="ghost"
                    className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-950/30"
                    onClick={handleSignOut}
                >
                    <LogOut className="mr-3 h-5 w-5" />
                    Çıkış Yap
                </Button>
            </div>
        </>
    );

    return (
        <div className="flex min-h-screen bg-slate-50 font-sans">
            <aside className="hidden w-64 flex-col border-r bg-slate-900 md:flex shadow-xl z-20">
                <SidebarContent />
            </aside>

            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetContent side="left" className="w-64 p-0 bg-slate-900 border-r-slate-800 text-white">
                    <SidebarContent />
                </SheetContent>
            </Sheet>

            <div className="flex flex-col flex-1 min-w-0 bg-slate-50/50">
                <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-white/80 backdrop-blur-md px-6 shadow-sm">
                    <Button variant="ghost" size="icon" className="md:hidden text-slate-700 hover:bg-slate-100" onClick={() => setSidebarOpen(true)}>
                        <Menu className="h-6 w-6" />
                        <span className="sr-only">Menüyü aç/kapa</span>
                    </Button>

                    <div className="flex-1">
                        <h1 className="text-xl font-bold text-slate-800 capitalize">
                            {menuItems.find(i => i.path === location.pathname)?.label || "Yönetim Paneli"}
                        </h1>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex flex-col items-end mr-2">
                            <span className="text-sm font-semibold text-slate-700">{auth.currentUser?.email || "Kullanıcı"}</span>
                            <span className="text-xs text-slate-500 capitalize">{userRole === "admin" ? "Yönetici" : "Operasyon Sorumlusu"}</span>
                        </div>
                        <Avatar className="h-10 w-10 border-2 border-white shadow-sm cursor-pointer hover:scale-105 transition-transform">
                            <AvatarImage src={auth.currentUser?.photoURL || "/placeholder-user.jpg"} alt={userRole || "Admin"} />
                            <AvatarFallback className="bg-primary text-white font-bold">
                                {auth.currentUser?.email ? auth.currentUser.email.substring(0, 2).toUpperCase() : "AD"}
                            </AvatarFallback>
                        </Avatar>
                    </div>
                </header>

                <main className="flex-1 overflow-auto p-3 sm:p-4 md:p-6 lg:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {children}
                </main>
            </div>
        </div>
    );
};
