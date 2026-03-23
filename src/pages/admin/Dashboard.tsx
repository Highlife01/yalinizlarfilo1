import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import { fetchSeyirMobilGPS, type SeyirMobilVehicle } from "@/utils/seyirmobil";

import {
  Bell,
  Download,
  RefreshCw,
  Sparkles,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendTeklif, getWhatsAppErrorDescription } from "@/utils/whatsapp";
import { useToast } from "@/hooks/use-toast";

// New specialized components
import { DashboardStats } from "@/components/admin/dashboard/DashboardStats";
import { DashboardCharts } from "@/components/admin/dashboard/DashboardCharts";
import { DashboardAlerts } from "@/components/admin/dashboard/DashboardAlerts";
import { DashboardTracking } from "@/components/admin/dashboard/DashboardTracking";
import { RecentActivity } from "@/components/admin/dashboard/RecentActivity";
import { QuickActions } from "@/components/admin/dashboard/QuickActions";
import { type ChartConfig } from "@/components/ui/chart";
import { AdvancedInsights } from "@/components/admin/dashboard/AdvancedInsights";


const ALERT_WINDOW_DAYS = 15;
const LONG_RENTAL_DAYS = 30;
const DAY_IN_MS = 1000 * 60 * 60 * 24;

type VehicleStatus = "active" | "maintenance" | "rented" | "inactive";
type BookingStatus = "pending" | "active" | "completed" | "cancelled";

type VehicleRow = {
  id: string;
  plate: string;
  name?: string;
  status: VehicleStatus;
  km: number;
  insurance_end_date?: string;
  casco_end_date?: string;
  tuvturk_end_date?: string;
  category?: string;
  purchase_price?: number;
  // GPS verileri (Seyir Mobil API gelince dolacak)
  gpsLat?: number;
  gpsLng?: number;
  gpsSpeed?: number;
  gpsLastUpdate?: string;
};

type BookingRow = {
  id: string;
  status: BookingStatus;
  startDate?: string;
  totalPrice: number;
  vehiclePlate: string;
  customerName: string;
};

type OperationRow = {
  id: string;
  type: string;
  date?: string;
  vehicleId?: string;
  vehiclePlate?: string;
  km?: number;
};

type ContactMessageRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  createdAt?: string;
  isRead: boolean;
};

type IncomeRow = {
  id: string;
  amount: number;
  createdAt?: string;
};

type PaymentRow = {
  id: string;
  amount: number;
  date?: string;
  vehiclePlate?: string;
};

type MaintenanceRow = {
  id: string;
  cost: number;
  vehiclePlate: string;
  vehicleId: string;
};

type VehicleCostRow = {
  id: string;
  amount: number;
  vehiclePlate: string;
  vehicleId: string;
};

type AlertSeverity = "info" | "warning" | "critical";
type AlertType = "maintenance" | "document" | "rental";

type AlertItem = {
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  vehicleId?: string;
  bookingId?: string;
};

type DocumentReminder = {
  vehicleId: string;
  plate: string;
  documentType: "Sigorta" | "Kasko" | "TÜVTÜRK";
  daysUntil: number;
};

const toStringSafe = (value: unknown, fallback = ""): string => {
  return typeof value === "string" ? value : fallback;
};

const toNumberSafe = (value: unknown, fallback = 0): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.replace(/[^\d,.-]/g, "").replace(",", ".");
    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const toDateSafe = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === "object" && value !== null && "toDate" in value) {
    const date = (value as { toDate: () => Date }).toDate();
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
};

const getDaysUntil = (dateValue?: string): number | null => {
  const target = toDateSafe(dateValue);
  if (!target) return null;
  const normalizedTarget = new Date(target);
  normalizedTarget.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((normalizedTarget.getTime() - today.getTime()) / DAY_IN_MS);
};

const getDocumentReminders = (vehicles: VehicleRow[]): DocumentReminder[] => {
  const reminders = vehicles.flatMap((vehicle) => {
    const checks = [
      { field: vehicle.insurance_end_date, label: "Sigorta" as const },
      { field: vehicle.casco_end_date, label: "Kasko" as const },
      { field: vehicle.tuvturk_end_date, label: "TÜVTÜRK" as const },
    ];

    return checks.flatMap((check) => {
      const daysUntil = getDaysUntil(check.field);
      if (daysUntil === null || daysUntil > ALERT_WINDOW_DAYS) return [];
      return [
        {
          vehicleId: vehicle.id,
          plate: vehicle.plate || "Plaka yok",
          documentType: check.label,
          daysUntil,
        },
      ];
    });
  });

  return reminders.sort((a, b) => {
    if (a.daysUntil < 0 && b.daysUntil >= 0) return -1;
    if (a.daysUntil >= 0 && b.daysUntil < 0) return 1;
    return a.daysUntil - b.daysUntil;
  });
};

const getLocalDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const vehicleStatusChartConfig = {
  active: { label: "Müsait", color: "#16a34a" },
  rented: { label: "Kirada", color: "#2563eb" },
  maintenance: { label: "Bakım", color: "#f59e0b" },
  inactive: { label: "Pasif", color: "#64748b" },
} satisfies ChartConfig;

const bookingStatusChartConfig = {
  pending: { label: "Beklemede", color: "#0ea5e9" },
  active: { label: "Aktif", color: "#22c55e" },
  completed: { label: "Tamamlandı", color: "#6366f1" },
  cancelled: { label: "İptal", color: "#ef4444" },
} satisfies ChartConfig;

const operationTrendChartConfig = {
  count: { label: "İşlem", color: "#6366f1" },
} satisfies ChartConfig;

const monthlyRevenueChartConfig = {
  revenue: { label: "Tahsilat (TL)", color: "#10b981" },
} satisfies ChartConfig;

const popularVehicleChartConfig = {
  count: { label: "Kiralama (Adet)", color: "#f59e0b" },
} satisfies ChartConfig;

export const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [operations, setOperations] = useState<OperationRow[]>([]);
  const [contactMessages, setContactMessages] = useState<ContactMessageRow[]>([]);
  const [incomes, setIncomes] = useState<IncomeRow[]>([]);
  const [paymentsData, setPaymentsData] = useState<PaymentRow[]>([]);
  const [maintenanceData, setMaintenanceData] = useState<MaintenanceRow[]>([]);
  const [vehicleCostsData, setVehicleCostsData] = useState<VehicleCostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasDataWarning, setHasDataWarning] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [teklifOpen, setTeklifOpen] = useState(false);
  const [teklifMessage, _setTeklifMessage] = useState<ContactMessageRow | null>(null);
  const [teklifForm, setTeklifForm] = useState({ aracTipi: "", sure: 7, baslangicTarihi: "", fiyat: 0 });
  const [teklifSending, setTeklifSending] = useState(false);
  const hasFetchedOnceRef = useRef(false);

  // GPS state
  const [gpsData, setGpsData] = useState<SeyirMobilVehicle[]>([]);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsLastFetch, setGpsLastFetch] = useState<Date | null>(null);

  const fetchGPS = useCallback(async () => {
    setGpsLoading(true);
    setGpsError(null);
    try {
      const result = await fetchSeyirMobilGPS();
      setGpsData(result.vehicles);
      setGpsLastFetch(new Date());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "GPS verisi alınamadı";
      setGpsError(msg);
      console.error("Seyir Mobil GPS hatası:", msg);
    } finally {
      setGpsLoading(false);
    }
  }, []);

  // Otomatik GPS Yenileme (60 saniyede bir, sadece sekme görünürken)
  useEffect(() => {
    fetchGPS(); // İlk yüklemede çek

    let interval: ReturnType<typeof setInterval> | null = null;

    const startPolling = () => {
      if (interval) return;
      interval = setInterval(() => {
        fetchGPS();
      }, 60000); // 60 saniye
    };

    const stopPolling = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchGPS(); // Sekme tekrar aktif olunca hemen bir kez çek
        startPolling();
      } else {
        stopPolling();
      }
    };

    // Sekme görünürse polling başlat
    if (document.visibilityState === "visible") {
      startPolling();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchGPS]);

  const fetchData = useCallback(async () => {
    if (hasFetchedOnceRef.current) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setHasDataWarning(false);
    let hadWarning = false;

    try {
      const opsQuery = query(collection(db, "vehicle_operations"), orderBy("date", "desc"), limit(50));
      const messagesQuery = query(collection(db, "contact_messages"), orderBy("createdAt", "desc"), limit(20));
      const [vehiclesResult, bookingsResult, operationsResult, messagesResult, incomesResult, paymentsResult, maintenanceResult, costsResult] = await Promise.allSettled([
        getDocs(collection(db, "vehicles")),
        getDocs(collection(db, "bookings")),
        getDocs(opsQuery),
        getDocs(messagesQuery),
        getDocs(collection(db, "income_records")),
        getDocs(collection(db, "payments")),
        getDocs(collection(db, "maintenance")),
        getDocs(collection(db, "vehicle_costs")),
      ]);

      if (vehiclesResult.status === "fulfilled") {
        const vehicleRows = vehiclesResult.value.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            plate: toStringSafe(data.plate, "Plaka yok"),
            name: toStringSafe(data.name, ""),
            status: (toStringSafe(data.status, "inactive") as VehicleStatus) || "inactive",
            km: toNumberSafe(data.km, 0),
            insurance_end_date: toStringSafe(data.insurance_end_date, ""),
            casco_end_date: toStringSafe(data.casco_end_date, ""),
            tuvturk_end_date: toStringSafe(data.tuvturk_end_date, ""),
            category: toStringSafe(data.category, "Diğer"),
            purchase_price: toNumberSafe(data.purchase_price, 0),
          } satisfies VehicleRow;
        });
        setVehicles(vehicleRows);
      }

      if (bookingsResult.status === "fulfilled") {
        const bookingRows = bookingsResult.value.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            status: (toStringSafe(data.status, "pending") as BookingStatus) || "pending",
            startDate: toStringSafe(data.startDate, ""),
            totalPrice: toNumberSafe(data.totalPrice, 0),
            vehiclePlate: toStringSafe(data.vehiclePlate, "Plaka yok"),
            customerName: toStringSafe(data.customerName, "Müşteri yok"),
          } satisfies BookingRow;
        });
        setBookings(bookingRows);
      }

      if (operationsResult.status === "fulfilled") {
        const operationRows = operationsResult.value.docs.map((docSnap) => {
          const data = docSnap.data();
          const opDate = toDateSafe(data.date);
          return {
            id: docSnap.id,
            type: toStringSafe(data.type, "operation"),
            date: opDate ? opDate.toISOString() : toStringSafe(data.date, ""),
            vehicleId: toStringSafe(data.vehicleId, ""),
            vehiclePlate: toStringSafe(data.vehiclePlate, ""),
            km: toNumberSafe(data.km, 0),
          } satisfies OperationRow;
        });
        setOperations(operationRows);
      }

      if (messagesResult.status === "fulfilled") {
        const messageRows = messagesResult.value.docs.map((docSnap) => {
          const data = docSnap.data();
          const messageDate = toDateSafe(data.createdAt);
          return {
            id: docSnap.id,
            name: toStringSafe(data.name, "Web Ziyaretçisi"),
            email: toStringSafe(data.email, ""),
            phone: toStringSafe(data.phone, ""),
            message: toStringSafe(data.message, ""),
            createdAt: messageDate ? messageDate.toISOString() : toStringSafe(data.createdAt, ""),
            isRead: Boolean(data.isRead),
          } satisfies ContactMessageRow;
        });
        setContactMessages(messageRows);
      }

      if (incomesResult.status === "fulfilled") {
        const incomeRows = incomesResult.value.docs.map((docSnap) => {
          const data = docSnap.data();
          const incomeDate = toDateSafe(data.createdAt || data.approvedAt || data.date);
          return {
            id: docSnap.id,
            amount: toNumberSafe(data.amount, 0),
            createdAt: incomeDate ? incomeDate.toISOString() : toStringSafe(data.createdAt, ""),
          } satisfies IncomeRow;
        });
        setIncomes(incomeRows);
      }

      if (paymentsResult.status === "fulfilled") {
        const paymentRows = paymentsResult.value.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            amount: toNumberSafe(data.amount, 0),
            date: toStringSafe(data.date, ""),
            vehiclePlate: toStringSafe(data.vehiclePlate, ""),
          } satisfies PaymentRow;
        });
        setPaymentsData(paymentRows);
      }

      if (maintenanceResult.status === "fulfilled") {
        const rows = maintenanceResult.value.docs.map(d => ({
          id: d.id,
          cost: toNumberSafe(d.data().cost, 0),
          vehiclePlate: toStringSafe(d.data().vehiclePlate, ""),
          vehicleId: toStringSafe(d.data().vehicleId, ""),
        })) as MaintenanceRow[];
        setMaintenanceData(rows);
      }

      if (costsResult.status === "fulfilled") {
        const rows = costsResult.value.docs.map(d => ({
          id: d.id,
          amount: toNumberSafe(d.data().amount, 0),
          vehiclePlate: toStringSafe(d.data().vehiclePlate, ""),
          vehicleId: toStringSafe(d.data().vehicleId, ""),
        })) as VehicleCostRow[];
        setVehicleCostsData(rows);
      }

      const collections = [
        { name: "Araçlar", result: vehiclesResult },
        { name: "Rezervasyonlar", result: bookingsResult },
        { name: "Operasyonlar", result: operationsResult },
        { name: "Mesajlar", result: messagesResult },
        { name: "Gelirler", result: incomesResult },
        { name: "Tahsilatlar", result: paymentsResult },
      ];

      const failed = collections.filter(c => c.result.status === "rejected");
      if (failed.length > 0) {
        hadWarning = true;
        console.error("Dashboard fetch failures:", failed.map(f => `${f.name}: ${(f.result as PromiseRejectedResult).reason}`));
      }

      setHasDataWarning(hadWarning);
      setLastUpdatedAt(new Date());
      if (hadWarning) {
        const failedNames = failed.map(f => f.name).join(", ");
        toast({
          title: "Kısmi Veri Sistemi",
          description: `${failedNames} yüklenemedi. Diğer verilerle devam ediliyor.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Dashboard yüklenemedi",
        description: "Veriler alınamadı. Bağlantı ve Firebase ayarlarını kontrol edin.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
      hasFetchedOnceRef.current = true;
    }
  }, [toast]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const operationKmByVehicle = useMemo(() => {
    const map = new Map<string, number>();
    for (const operation of operations) {
      const key = operation.vehicleId || operation.vehiclePlate || "";
      if (!key) continue;
      const prev = map.get(key) ?? 0;
      map.set(key, Math.max(prev, operation.km || 0));
    }
    return map;
  }, [operations]);

  const vehiclesWithKm = useMemo(() => {
    return vehicles.map((vehicle) => {
      const kmFromOps = operationKmByVehicle.get(vehicle.id) ?? operationKmByVehicle.get(vehicle.plate) ?? 0;
      return { ...vehicle, km: Math.max(vehicle.km, kmFromOps) };
    });
  }, [vehicles, operationKmByVehicle]);

  const documentReminders = useMemo(() => getDocumentReminders(vehiclesWithKm), [vehiclesWithKm]);

  const alerts = useMemo(() => {
    const maintenanceAlerts: AlertItem[] = vehiclesWithKm
      .filter((vehicle) => vehicle.km >= 50000 && vehicle.status !== "inactive")
      .map((vehicle) => ({
        type: "maintenance",
        severity: "warning",
        message: `${vehicle.plate} - Bakım zamanı yaklaşıyor (${vehicle.km} km)`,
        vehicleId: vehicle.id,
      }));

    const documentAlerts: AlertItem[] = documentReminders.map((reminder) => ({
      type: "document",
      severity: reminder.daysUntil < 0 ? "critical" : "warning",
      message:
        reminder.daysUntil < 0
          ? `${reminder.plate} - ${reminder.documentType} süresi doldu`
          : `${reminder.plate} - ${reminder.documentType} ${reminder.daysUntil} gün sonra bitiyor`,
      vehicleId: reminder.vehicleId,
    }));

    const longRentalAlerts: AlertItem[] = bookings
      .filter((booking) => booking.status === "active")
      .flatMap((booking) => {
        const startDate = toDateSafe(booking.startDate);
        if (!startDate) return [];
        const days = (Date.now() - startDate.getTime()) / DAY_IN_MS;
        if (days <= LONG_RENTAL_DAYS) return [];
        return [
          {
            type: "rental" as const,
            severity: "info" as const,
            message: `${booking.vehiclePlate} - Uzun süreli kiralama (${booking.customerName})`,
            bookingId: booking.id,
          },
        ];
      });

    return [...documentAlerts, ...maintenanceAlerts, ...longRentalAlerts].slice(0, 8);
  }, [vehiclesWithKm, documentReminders, bookings]);

  const totalRevenue = useMemo(() => {
    return paymentsData.reduce((sum, p) => sum + p.amount, 0);
  }, [paymentsData]);

  const totalInvoiced = useMemo(() => {
    return incomes.reduce((sum, income) => sum + income.amount, 0);
  }, [incomes]);

  const activeRentals = useMemo(() => bookings.filter((b) => b.status === "active").length, [bookings]);
  const pendingRentals = useMemo(() => bookings.filter((b) => b.status === "pending").length, [bookings]);
  const completedRentals = useMemo(() => bookings.filter((b) => b.status === "completed").length, [bookings]);
  const cancelledRentals = useMemo(() => bookings.filter((b) => b.status === "cancelled").length, [bookings]);
  const availableVehicles = useMemo(() => vehiclesWithKm.filter((v) => v.status === "active").length, [vehiclesWithKm]);
  const rentedVehicles = useMemo(() => vehiclesWithKm.filter((v) => v.status === "rented").length, [vehiclesWithKm]);
  const maintenanceCount = useMemo(() => vehiclesWithKm.filter((v) => v.status === "maintenance").length, [vehiclesWithKm]);
  const inactiveVehicles = useMemo(() => vehiclesWithKm.filter((v) => v.status === "inactive").length, [vehiclesWithKm]);

  const vehicleStatusChartData = useMemo(
    () => [
      { key: "active", label: "Müsait", value: availableVehicles, fill: "var(--color-active)" },
      { key: "rented", label: "Kirada", value: rentedVehicles, fill: "var(--color-rented)" },
      { key: "maintenance", label: "Bakım", value: maintenanceCount, fill: "var(--color-maintenance)" },
      { key: "inactive", label: "Pasif", value: inactiveVehicles, fill: "var(--color-inactive)" },
    ],
    [availableVehicles, rentedVehicles, maintenanceCount, inactiveVehicles],
  );

  const bookingStatusChartData = useMemo(
    () => [
      { key: "pending", label: "Beklemede", count: pendingRentals, fill: "var(--color-pending)" },
      { key: "active", label: "Aktif", count: activeRentals, fill: "var(--color-active)" },
      { key: "completed", label: "Tamamlandı", count: completedRentals, fill: "var(--color-completed)" },
      { key: "cancelled", label: "İptal", count: cancelledRentals, fill: "var(--color-cancelled)" },
    ],
    [pendingRentals, activeRentals, completedRentals, cancelledRentals],
  );

  const operationsTrendData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const baseDays = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - index));
      return {
        key: getLocalDateKey(date),
        day: date.toLocaleDateString("tr-TR", { weekday: "short" }).replace(".", ""),
        fullDate: date.toLocaleDateString("tr-TR", { day: "2-digit", month: "short" }),
        count: 0,
      };
    });

    const indexByKey = new Map(baseDays.map((day, index) => [day.key, index]));
    for (const operation of operations) {
      const date = toDateSafe(operation.date);
      if (!date) continue;
      const key = getLocalDateKey(date);
      const slotIndex = indexByKey.get(key);
      if (slotIndex === undefined) continue;
      baseDays[slotIndex].count += 1;
    }

    return baseDays.map(({ day, fullDate, count }) => ({ day, fullDate, count }));
  }, [operations]);

  const totalOperationsLast7Days = useMemo(
    () => operationsTrendData.reduce((sum, item) => sum + item.count, 0),
    [operationsTrendData],
  );

  const monthlyRevenueData = useMemo(() => {
    const months = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
    const today = new Date();
    const dataMap = new Map<string, { monthKey: string; name: string; revenue: number }>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const mKey = `${d.getFullYear()}-${d.getMonth()}`;
      dataMap.set(mKey, { monthKey: mKey, name: `${months[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`, revenue: 0 });
    }

    paymentsData.forEach(p => {
      const date = toDateSafe(p.date);
      if (!date) return;
      const mKey = `${date.getFullYear()}-${date.getMonth()}`;
      const entry = dataMap.get(mKey);
      if (entry) {
        entry.revenue += p.amount;
      }
    });

    return Array.from(dataMap.values());
  }, [paymentsData]);

  const popularVehiclesData = useMemo(() => {
    const categoryCounts = new Map<string, number>();
    bookings.forEach(b => {
      if (b.status === "cancelled") return; // exclude cancelled
      const vehicle = vehiclesWithKm.find(v => v.plate === b.vehiclePlate);
      const catName = vehicle?.category || "Diğer";
      categoryCounts.set(catName, (categoryCounts.get(catName) || 0) + 1);
    });

    const colors = ["#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899"];
    return Array.from(categoryCounts.entries())
      .map(([name, count], index) => ({ name, count, fill: colors[index % colors.length] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // top 5
  }, [bookings, vehiclesWithKm]);

  const recentActivities = useMemo(() => {
    return [...operations]
      .sort((a, b) => (toDateSafe(b.date)?.getTime() ?? 0) - (toDateSafe(a.date)?.getTime() ?? 0))
      .slice(0, 10);
  }, [operations]);

  const unreadMessagesCount = useMemo(
    () => contactMessages.filter((message) => !message.isRead).length,
    [contactMessages],
  );

  const recentContactMessages = useMemo(
    () => contactMessages.slice(0, 8),
    [contactMessages],
  );

  const expiringInsuranceCount = documentReminders.filter((item) => item.documentType === "Sigorta" && item.daysUntil >= 0).length;
  const expiringCascoCount = documentReminders.filter((item) => item.documentType === "Kasko" && item.daysUntil >= 0).length;
  const expiringTuvturkCount = documentReminders.filter((item) => item.documentType === "TÜVTÜRK" && item.daysUntil >= 0).length;
  const expiredDocumentCount = documentReminders.filter((item) => item.daysUntil < 0).length;

  const handleSendTeklif = async () => {
    if (!teklifMessage || !teklifForm.aracTipi || !teklifForm.sure || !teklifForm.fiyat) {
      toast({
        title: "Eksik bilgi",
        description: "Lütfen tüm teklif alanlarını doldurun.",
        variant: "destructive",
      });
      return;
    }

    setTeklifSending(true);
    try {
      const result = await sendTeklif({
        telefon: teklifMessage.phone,
        ad: teklifMessage.name,
        aracTipi: teklifForm.aracTipi,
        sure: teklifForm.sure,
        baslangicTarihi: teklifForm.baslangicTarihi || new Date().toLocaleDateString("tr-TR"),
        fiyat: teklifForm.fiyat,
      });

      if (result.ok) {
        toast({
          title: "Başarılı",
          description: "Teklif WhatsApp üzerinden gönderildi.",
        });
        setTeklifOpen(false);
      } else {
        toast({
          title: "Hata",
          description: "Mesaj gönderilemedi.",
          variant: "destructive",
        });
      }
    } catch (error: unknown) {
      console.error("Teklif gönderme hatası:", error);
      toast({
        title: "Hata",
        description: getWhatsAppErrorDescription(error instanceof Error ? error.message : String(error)),
        variant: "destructive",
      });
    } finally {
      setTeklifSending(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 pb-20">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>

        {/* Stats Skeletons */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>

        {/* Charts & Map Skeleton */}
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-8 space-y-6">
            <Skeleton className="h-[400px] w-full rounded-xl" />
            <div className="grid gap-6 sm:grid-cols-2">
              <Skeleton className="h-[300px] w-full rounded-xl" />
              <Skeleton className="h-[300px] w-full rounded-xl" />
            </div>
          </div>
          <div className="lg:col-span-4 space-y-6">
            <Skeleton className="h-[500px] w-full rounded-xl" />
            <Skeleton className="h-[200px] w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Yönetim Paneli</h1>
          <p className="text-slate-500 font-medium">Hoş geldiniz, işte bugünkü filo özetiniz.</p>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdatedAt && (
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mr-2">
              SON GÜNCELLEME: {lastUpdatedAt.toLocaleTimeString("tr-TR")}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchData()}
            disabled={refreshing}
            className="h-9 font-bold bg-white"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Güncelleniyor..." : "Yenile"}
          </Button>
          <Button variant="default" size="sm" className="h-9 font-bold bg-blue-600 hover:bg-blue-700 shadow-blue-200 shadow-lg" onClick={() => navigate("/admin/reports")}>
            <Download className="w-4 h-4 mr-2" /> Rapor Al
          </Button>
        </div>
      </div>

      {(hasDataWarning || alerts.length > 0) && (
        <div className="space-y-4">
          {hasDataWarning && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="flex items-center gap-3 py-3 text-sm text-amber-800">
                <Bell className="h-4 w-4" />
                Bazı veriler tam yüklenemedi. Lütfen internet bağlantınızı kontrol edin.
              </CardContent>
            </Card>
          )}
          {alerts.length > 0 && (
            <Card className="border-l-4 border-l-red-500 bg-red-50 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-red-800 flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Kritik Uyarılar ({alerts.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {alerts.slice(0, 3).map((alert, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-red-100 last:border-0 text-red-700 font-medium">
                    <span>{alert.message}</span>
                    <Badge variant="outline" className="text-[10px] uppercase font-bold">{alert.type}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* DASHBOARD MODÜLLERİ */}
      <DashboardStats
        rentedCount={rentedVehicles}
        availableCount={availableVehicles}
        activeRentals={activeRentals}
        totalRevenue={totalRevenue}
        totalInvoiced={totalInvoiced}
        maintenanceCount={maintenanceCount}
      />

      <DashboardCharts
        vehicleStatusData={vehicleStatusChartData}
        vehicleStatusConfig={vehicleStatusChartConfig}
        bookingStatusData={bookingStatusChartData}
        bookingStatusConfig={bookingStatusChartConfig}
        operationsTrendData={operationsTrendData}
        operationTrendConfig={operationTrendChartConfig}
        monthlyRevenueData={monthlyRevenueData}
        monthlyRevenueConfig={monthlyRevenueChartConfig}
        popularVehiclesData={popularVehiclesData}
        popularVehicleConfig={popularVehicleChartConfig}
        totalOperations7Days={totalOperationsLast7Days}
        totalBookings={pendingRentals + activeRentals + completedRentals + cancelledRentals}
      />

      <DashboardAlerts
        documentReminders={documentReminders}
        insuranceCount={expiringInsuranceCount}
        cascoCount={expiringCascoCount}
        tuvCount={expiringTuvturkCount}
        expiredCount={expiredDocumentCount}
      />

      {/* Advanced AI & Analytics Section */}
      <h2 className="text-xl font-black text-slate-900 mt-10 mb-4 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-primary" /> İleri Seviye Analizler
      </h2>
      <AdvancedInsights
        operations={operations}
        bookings={bookings}
        maintenance={maintenanceData}
        costs={vehicleCostsData}
        payments={paymentsData}
        vehicles={vehicles}
      />

      <RecentActivity
        recentActivities={recentActivities}
        recentMessages={recentContactMessages}
        unreadCount={unreadMessagesCount}
        toDateSafe={toDateSafe}
      />

      <QuickActions />

      <DashboardTracking
        gpsData={gpsData}
        vehiclesWithKm={vehiclesWithKm}
        documentReminders={documentReminders}
        gpsLoading={gpsLoading}
        gpsError={gpsError}
        gpsLastFetch={gpsLastFetch}
        fetchGPS={fetchGPS}
      />

      {/* Mesaj Detay Dialog */}
      <Dialog open={teklifOpen} onOpenChange={setTeklifOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Hızlı Teklif Gönder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="customer">Müşteri</Label>
              <Input id="customer" value={teklifMessage?.name || ""} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="aracTipi">Araç Tipi / Sınıfı</Label>
              <Input
                id="aracTipi"
                placeholder="Örn: Egea veya Orta Segment"
                value={teklifForm.aracTipi}
                onChange={(e) => setTeklifForm({ ...teklifForm, aracTipi: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sure">Gün Sayısı</Label>
                <Input
                  id="sure"
                  type="number"
                  value={teklifForm.sure}
                  onChange={(e) => setTeklifForm({ ...teklifForm, sure: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fiyat">Günlük Fiyat (TL)</Label>
                <Input
                  id="fiyat"
                  type="number"
                  value={teklifForm.fiyat}
                  onChange={(e) => setTeklifForm({ ...teklifForm, fiyat: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTeklifOpen(false)} disabled={teklifSending}>İptal</Button>
            <Button onClick={handleSendTeklif} disabled={teklifSending}>
              {teklifSending ? "Gönderiliyor..." : "WhatsApp ile Gönder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};



