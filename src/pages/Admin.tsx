import { useState, useEffect, lazy, Suspense } from "react";
import { Navigate, Routes, Route, useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "@/integrations/firebase/client";
import { doc, getDoc } from "firebase/firestore";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Loader2 } from "lucide-react";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Lazy load all admin sub-pages for code splitting
const Dashboard = lazy(() => import("@/pages/admin/Dashboard").then(m => ({ default: m.Dashboard })));
const FleetManagement = lazy(() => import("@/pages/admin/FleetManagement").then(m => ({ default: m.FleetManagement })));
const Bookings = lazy(() => import("@/pages/admin/Bookings").then(m => ({ default: m.Bookings })));
const Maintenance = lazy(() => import("@/pages/admin/Maintenance").then(m => ({ default: m.Maintenance })));
const Customers = lazy(() => import("@/pages/admin/Customers").then(m => ({ default: m.Customers })));
const Settings = lazy(() => import("@/pages/admin/Settings").then(m => ({ default: m.Settings })));
const RentalOperations = lazy(() => import("@/pages/admin/RentalOperations").then(m => ({ default: m.RentalOperations })));
const VehicleDetail = lazy(() => import("@/pages/admin/VehicleDetail").then(m => ({ default: m.VehicleDetail })));
const DamageReports = lazy(() => import("@/pages/admin/DamageReports").then(m => ({ default: m.DamageReports })));
const Reports = lazy(() => import("@/pages/admin/Reports").then(m => ({ default: m.Reports })));
const Contracts = lazy(() => import("@/pages/admin/Contracts").then(m => ({ default: m.Contracts })));
const Invoices = lazy(() => import("@/pages/admin/Invoices").then(m => ({ default: m.Invoices })));
const ContractBuilder = lazy(() => import("@/pages/admin/ContractBuilder").then(m => ({ default: m.ContractBuilder })));
const VehicleCosts = lazy(() => import("@/pages/admin/VehicleCosts").then(m => ({ default: m.VehicleCosts })));
const Tahsilat = lazy(() => import("@/pages/admin/Tahsilat").then(m => ({ default: m.Tahsilat })));
const HgsSorgulama = lazy(() => import("@/pages/admin/HgsSorgulama").then(m => ({ default: m.HgsSorgulama })));

const AdminSpinner = () => (
  <div className="flex items-center justify-center py-20">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

export default function Admin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate("/auth");
        return;
      }

      try {
        const userSnap = await getDoc(doc(db, "users", user.uid));
        let role = userSnap.exists() ? userSnap.data()?.role : null;
        if (user.uid === "QzwyNVumNnNco2fFCTw6S01vQQj1") {
          role = "admin";
        }

        if (role !== "admin" && role !== "operation") {
          await signOut(auth);
          navigate("/");
          return;
        }

        setUserRole(role);
        setLoading(false);
      } catch (error) {
        console.error("Admin role kontrolü hatası:", error);
        await signOut(auth).catch(() => undefined);
        navigate("/");
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-slate-500 font-medium">Yönetim paneli yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <AdminLayout handleSignOut={handleSignOut} userRole={userRole}>
        <Suspense fallback={<AdminSpinner />}>
        <Routes>
          <Route index element={userRole === "admin" ? <Dashboard /> : <RentalOperations />} />
          <Route path="fleet" element={<FleetManagement />} />
          <Route path="fleet/:id" element={<VehicleDetail />} />
          <Route
            path="bookings"
            element={userRole === "admin" ? <Bookings /> : <Navigate to="/admin/operations" replace />}
          />
          <Route
            path="maintenance"
            element={userRole === "admin" ? <Maintenance /> : <Navigate to="/admin/operations" replace />}
          />
          <Route path="customers" element={<Customers />} />
          <Route
            path="settings"
            element={userRole === "admin" ? <Settings /> : <Navigate to="/admin/operations" replace />}
          />
          <Route path="operations" element={<RentalOperations />} />
          <Route path="damage-reports" element={<DamageReports />} />
          <Route
            path="reports"
            element={userRole === "admin" ? <Reports /> : <Navigate to="/admin/operations" replace />}
          />
          <Route
            path="contracts"
            element={userRole === "admin" ? <Contracts /> : <Navigate to="/admin/operations" replace />}
          />
          <Route
            path="contract-builder"
            element={userRole === "admin" ? <ContractBuilder /> : <Navigate to="/admin/operations" replace />}
          />
          <Route
            path="invoices"
            element={userRole === "admin" ? <Invoices /> : <Navigate to="/admin/operations" replace />}
          />
          <Route
            path="vehicle-costs"
            element={userRole === "admin" ? <VehicleCosts /> : <Navigate to="/admin/operations" replace />}
          />
          <Route
            path="tahsilat"
            element={userRole === "admin" ? <Tahsilat /> : <Navigate to="/admin/operations" replace />}
          />
          <Route path="hgs" element={<HgsSorgulama />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
        </Suspense>
      </AdminLayout>
    </ErrorBoundary>
  );
}
