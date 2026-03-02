import { Suspense, lazy } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { WhatsAppFloat } from "@/components/WhatsAppFloat";
import { RefreshFloat } from "@/components/RefreshFloat";

function WhatsAppFloatOrNull() {
  const { pathname } = useLocation();
  if (pathname.startsWith("/admin")) return null;
  return <WhatsAppFloat />;
}

const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Admin = lazy(() => import("./pages/Admin"));
const NotFound = lazy(() => import("./pages/NotFound"));
const SEOLandingPage = lazy(() => import("./pages/SEOLandingPage"));
const ReservationsPage = lazy(() => import("./pages/Reservations"));
const BlogPage = lazy(() => import("./pages/Blog"));
const BlogDetailPage = lazy(() => import("./pages/BlogDetail"));
const BookingSuccess = lazy(() => import("./pages/BookingSuccess"));

const Terms = lazy(() => import("./pages/Terms"));
const RentalAgreement = lazy(() => import("./pages/RentalAgreement"));
const KVKK = lazy(() => import("./pages/KVKK"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5 min — avoid refetching on every mount
      gcTime: 10 * 60 * 1000,         // 10 min garbage collection
      refetchOnWindowFocus: false,    // don't spam Firestore on tab switch
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <Sonner />
        <PWAInstallPrompt />
        <RefreshFloat />
        <Suspense fallback={<div role="status" aria-live="polite" className="flex h-screen w-screen flex-col items-center justify-center space-y-4 bg-background"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div><div className="text-xl font-bold tracking-tight animate-pulse text-foreground">Yalınızlar <span className="text-primary">Filo</span></div><span className="sr-only">Sayfa yükleniyor</span></div>}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/admin/*" element={<Admin />} />
            <Route path="/rezervasyonlarim" element={<ReservationsPage />} />
            <Route path="/blog" element={<BlogPage />} />
            <Route path="/blog/:slug" element={<BlogDetailPage />} />
            <Route path="/kiralama-kosullari" element={<Terms />} />
            <Route path="/kiralama-sozlesmesi" element={<RentalAgreement />} />
            <Route path="/rezervasyon-basarili" element={<BookingSuccess />} />
            <Route path="/kvkk" element={<KVKK />} />
            {/* Dynamic SEO slug — must be AFTER all static routes */}
            <Route path="/:slug" element={<SEOLandingPage />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        <WhatsAppFloatOrNull />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
