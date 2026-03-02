import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { ReservationPanel } from "@/components/ReservationPanel";
import { Services } from "@/components/Services";
import { AboutStats } from "@/components/AboutStats";
import { Fleet } from "@/components/Fleet";
import { Testimonials } from "@/components/Testimonials";
import { BlogHighlights } from "@/components/BlogHighlights";
import { FAQ } from "@/components/FAQ";
import { QuoteForm } from "@/components/QuoteForm";
import { Footer } from "@/components/Footer";
import { FloatingContactButtons } from "@/components/FloatingContactButtons";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <ReservationPanel />
      <Services />
      <AboutStats />
      <Fleet />
      <Testimonials />
      <BlogHighlights />
      <FAQ />
      <QuoteForm />
      <Footer />
      <FloatingContactButtons />
    </div>
  );
};

export default Index;
