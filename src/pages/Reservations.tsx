import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ReservationsLookup } from "@/components/ReservationsLookup";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

const ReservationsPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24">
        <div className="container mx-auto px-4 mb-6">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h1 className="text-3xl font-bold">Rezervasyonlarim</h1>
            <Button type="button" variant="outline" size="sm" onClick={() => window.location.reload()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Yenile
            </Button>
          </div>
          <p className="text-muted-foreground text-sm max-w-2xl">
            Telefon numaraniz ile web uzerinden olusturdugunuz rezervasyon taleplerinizi goruntuleyin.
          </p>
        </div>
        <ReservationsLookup />
      </main>
      <Footer />
    </div>
  );
};

export default ReservationsPage;
