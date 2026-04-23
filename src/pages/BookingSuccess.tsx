import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Home, Calendar, Phone } from "lucide-react";
import confetti from "canvas-confetti";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const BookingSuccess = () => {
    const location = useLocation();
    const bookingData = location.state?.bookingData;

    useEffect(() => {
        // Launch confetti on mount
        const duration = 3 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

        const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

        const interval: ReturnType<typeof setInterval> = setInterval(function () {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
        }, 250);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <Navbar />
            <main className="flex-grow flex items-center justify-center py-24 px-4">
                <Card className="max-w-2xl w-full border-2 border-green-100 shadow-[0_20px_60px_-15px_rgba(22,163,74,0.15)] overflow-hidden">
                    <div className="bg-green-600 h-2 w-full" />
                    <CardContent className="p-8 md:p-12 text-center space-y-8">
                        <div className="flex justify-center">
                            <div className="bg-green-100 p-4 rounded-full">
                                <CheckCircle2 className="w-16 h-16 text-green-600 animate-bounce" />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Rezervasyonunuz Alındı!</h1>
                            <p className="text-slate-600 text-lg">
                                Seçmiş olduğunuz araç için talebiniz başarıyla oluşturuldu. Ekibimiz en kısa sürede sizinle iletişime geçecektir.
                            </p>
                        </div>

                        {bookingData && (
                            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 text-left space-y-4">
                                <h3 className="font-bold text-slate-900 border-b pb-2">Rezervasyon Detayları</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                    <div className="flex items-center gap-2 text-slate-700">
                                        <Calendar className="w-4 h-4 text-green-600" />
                                        <span className="font-medium">Tarih:</span> {bookingData.startDate} - {bookingData.endDate}
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-700">
                                        <Phone className="w-4 h-4 text-green-600" />
                                        <span className="font-medium">Telefon:</span> {bookingData.customerPhone}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row gap-4 pt-4">
                            <Button asChild size="lg" className="flex-1 bg-slate-900 hover:bg-slate-800 text-white shadow-xl">
                                <Link to="/">
                                    <Home className="mr-2 h-5 w-5" /> Ana Sayfaya Dön
                                </Link>
                            </Button>
                            <Button asChild variant="outline" size="lg" className="flex-1 border-slate-300 hover:bg-slate-100">
                                <Link to="/rezervasyonlarim">
                                    Rezervasyonlarımı Gör
                                </Link>
                            </Button>
                        </div>

                        <p className="text-xs text-slate-400">
                            Herhangi bir sorunuz için 0533 946 50 02 numaralı hattan bize ulaşabilirsiniz.
                        </p>
                    </CardContent>
                </Card>
            </main>
            <Footer />
        </div>
    );
};

export default BookingSuccess;
