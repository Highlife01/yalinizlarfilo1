import { useState, useEffect, useMemo } from "react";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
} from "firebase/firestore";
import { Link } from "react-router-dom";
import { db } from "@/integrations/firebase/client";
import {
  Plus,
  Search,
  Car,
  Trash2,
  Loader2,
  TrendingUp,
  TrendingDown,
  Wallet,
  Fuel,
  Wrench,
  ShieldCheck,
  CreditCard,
  Receipt,
  Download,
  Banknote,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

// ─── Types ───────────────────────────────────────────────

type CostCategory =
  | "kasko"
  | "sigorta"
  | "mtv"
  | "yakit"
  | "bakim"
  | "lastik"
  | "onarim"
  | "yikama"
  | "otoyol"
  | "amortisman"
  | "finansman"
  | "ceza"
  | "diger";

type VehicleCostRecord = {
  id: string;
  vehicleId: string;
  vehiclePlate: string;
  vehicleName: string;
  category: CostCategory;
  amount: number;
  description: string;
  date: string;
  createdAt?: string;
};

type Vehicle = {
  id: string;
  name: string;
  plate: string;
  status?: string;
  purchase_price?: number;
};

type PaymentRecord = {
  id: string;
  vehiclePlate: string;
  customerName: string;
  amount: number;
  date: string;
  paymentMethod: string;
  description: string;
};

// ─── Constants ───────────────────────────────────────────

const CATEGORY_LABELS: Record<CostCategory, string> = {
  kasko: "Kasko",
  sigorta: "Trafik Sigortası",
  mtv: "MTV",
  yakit: "Yakıt",
  bakim: "Periyodik Bakım",
  lastik: "Lastik",
  onarim: "Onarım",
  yikama: "Yıkama",
  otoyol: "Otoyol / Köprü",
  amortisman: "Amortisman",
  finansman: "Finansman / Kredi Faizi",
  ceza: "Trafik Cezası",
  diger: "Diğer",
};

const FIXED_CATEGORIES: CostCategory[] = ["kasko", "sigorta", "mtv", "amortisman", "finansman"];
const VARIABLE_CATEGORIES: CostCategory[] = ["yakit", "bakim", "lastik", "onarim", "yikama", "otoyol", "ceza", "diger"];

const CATEGORY_ICONS: Partial<Record<CostCategory, typeof Fuel>> = {
  kasko: ShieldCheck,
  sigorta: ShieldCheck,
  yakit: Fuel,
  bakim: Wrench,
  onarim: Wrench,
  finansman: CreditCard,
  ceza: Receipt,
};

const formatMoney = (v: number) =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v);

const formatDate = (d: string) => {
  try {
    return new Date(d).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return d;
  }
};

const toInputDate = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

// ─── Component ───────────────────────────────────────────

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  nakit: "Nakit",
  havale: "Havale / EFT",
  kredi_karti: "Kredi Kartı",
  diger: "Diğer",
};

export const VehicleCosts = () => {
  const { toast } = useToast();
  const [records, setRecords] = useState<VehicleCostRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [vehicleFilter, setVehicleFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "fixed" | "variable">("all");

  // Date range
  const today = useMemo(() => new Date(), []);
  const firstOfYear = useMemo(() => new Date(today.getFullYear(), 0, 1), [today]);
  const [startDate, setStartDate] = useState(toInputDate(firstOfYear));
  const [endDate, setEndDate] = useState(toInputDate(today));

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    vehicleId: "",
    category: "yakit" as CostCategory,
    amount: "",
    description: "",
    date: toInputDate(today),
  });

  // ─── Data Fetch ─────────────────────────────────────

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [vehiclesSnap, costsSnap, paymentsSnap] = await Promise.all([
          getDocs(collection(db, "vehicles")),
          getDocs(query(collection(db, "vehicle_costs"), orderBy("date", "desc"))),
          getDocs(query(collection(db, "payments"), orderBy("date", "desc"))),
        ]);

        setVehicles(
          vehiclesSnap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              name: String(data.name || "Araç"),
              plate: String(data.plate || "-"),
              status: data.status,
              purchase_price: Number(data.purchase_price || 0),
            };
          })
        );

        setRecords(
          costsSnap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              vehicleId: data.vehicleId || "",
              vehiclePlate: data.vehiclePlate || "",
              vehicleName: data.vehicleName || "",
              category: data.category || "diger",
              amount: Number(data.amount || 0),
              description: data.description || "",
              date: data.date || "",
              createdAt: data.createdAt || "",
            };
          })
        );

        setPayments(
          paymentsSnap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              vehiclePlate: String(data.vehiclePlate || "").toUpperCase(),
              customerName: String(data.customerName || ""),
              amount: Number(data.amount || 0),
              date: String(data.date || ""),
              paymentMethod: String(data.paymentMethod || "nakit"),
              description: String(data.description || ""),
            };
          })
        );
      } catch (error) {
        console.error("Vehicle costs fetch error:", error);
        const msg = error instanceof Error ? error.message : "Araç masrafları yüklenirken hata oluştu.";
        toast({
          title: "Araç masrafları yüklenemedi",
          description: msg,
          variant: "destructive",
          duration: 8000,
        });
      } finally {
        setLoading(false);
      }
    };
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Filtering ──────────────────────────────────────

  const filteredRecords = useMemo(() => {
    const sDate = new Date(startDate + "T00:00:00");
    const eDate = new Date(endDate + "T23:59:59");

    return records.filter((r) => {
      // Date filter
      const d = new Date(r.date);
      if (d < sDate || d > eDate) return false;

      // Vehicle filter
      if (vehicleFilter !== "all" && r.vehicleId !== vehicleFilter) return false;

      // Category type filter
      if (categoryFilter === "fixed" && !FIXED_CATEGORIES.includes(r.category)) return false;
      if (categoryFilter === "variable" && !VARIABLE_CATEGORIES.includes(r.category)) return false;

      // Search
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const searchable = `${r.vehicleName} ${r.vehiclePlate} ${r.description} ${CATEGORY_LABELS[r.category]}`.toLowerCase();
        if (!searchable.includes(term)) return false;
      }

      return true;
    });
  }, [records, startDate, endDate, vehicleFilter, categoryFilter, searchTerm]);

  // ─── Summary Cards ─────────────────────────────────

  const summary = useMemo(() => {
    let totalCost = 0;
    let fixedCost = 0;
    let variableCost = 0;
    const byVehicle: Record<string, { plate: string; name: string; total: number }> = {};

    filteredRecords.forEach((r) => {
      totalCost += r.amount;
      if (FIXED_CATEGORIES.includes(r.category)) fixedCost += r.amount;
      else variableCost += r.amount;

      if (!byVehicle[r.vehicleId]) {
        byVehicle[r.vehicleId] = { plate: r.vehiclePlate, name: r.vehicleName, total: 0 };
      }
      byVehicle[r.vehicleId].total += r.amount;
    });

    const vehicleBreakdown = Object.entries(byVehicle)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.total - a.total);

    const topCostVehicle = vehicleBreakdown[0];

    return { totalCost, fixedCost, variableCost, vehicleBreakdown, topCostVehicle };
  }, [filteredRecords]);

  // ─── Filtered payments (tahsilat / araç geliri) ───────

  const filteredPayments = useMemo(() => {
    const sDate = new Date(startDate + "T00:00:00");
    const eDate = new Date(endDate + "T23:59:59");
    const selectedPlate =
      vehicleFilter !== "all" ? vehicles.find((v) => v.id === vehicleFilter)?.plate?.toUpperCase() ?? "" : "";

    return payments.filter((p) => {
      const d = new Date(p.date);
      if (d < sDate || d > eDate) return false;
      if (vehicleFilter !== "all" && p.vehiclePlate !== selectedPlate) return false;
      return true;
    });
  }, [payments, startDate, endDate, vehicleFilter, vehicles]);

  const totalTahsilat = useMemo(
    () => filteredPayments.reduce((sum, p) => sum + p.amount, 0),
    [filteredPayments]
  );

  // ─── Araç başı karlılık (gelir - gider) ───────────────

  const netKar = useMemo(() => totalTahsilat - summary.totalCost, [totalTahsilat, summary.totalCost]);

  const vehicleProfitability = useMemo(() => {
    return vehicles.map((v) => {
      const cost = filteredRecords
        .filter((r) => r.vehicleId === v.id)
        .reduce((s, r) => s + r.amount, 0);
      const income = filteredPayments
        .filter((p) => p.vehiclePlate === (v.plate || "").toUpperCase())
        .reduce((s, p) => s + p.amount, 0);
      const profit = income - cost;
      const purchasePrice = v.purchase_price || 0;
      const totalInvested = purchasePrice + cost;
      const roi = totalInvested > 0 ? (profit / totalInvested) * 100 : 0;
      return {
        vehicleId: v.id,
        plate: v.plate,
        name: v.name,
        purchasePrice,
        cost,
        income,
        profit,
        roi,
      };
    })
      .filter((row) => row.cost > 0 || row.income > 0)
      .sort((a, b) => b.profit - a.profit);
  }, [vehicles, filteredRecords, filteredPayments]);

  // ─── Add Record ─────────────────────────────────────

  const handleAdd = async () => {
    const amount = Number(formData.amount);
    if (!formData.vehicleId || !amount || amount <= 0) {
      toast({ title: "Eksik bilgi", description: "Araç ve tutar zorunludur.", variant: "destructive" });
      return;
    }

    const vehicle = vehicles.find((v) => v.id === formData.vehicleId);
    if (!vehicle) return;

    setSaving(true);
    try {
      const payload = {
        vehicleId: vehicle.id,
        vehiclePlate: vehicle.plate,
        vehicleName: vehicle.name,
        category: formData.category,
        amount,
        description: formData.description,
        date: formData.date,
        createdAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, "vehicle_costs"), payload);
      setRecords((prev) => [{ id: docRef.id, ...payload }, ...prev]);
      setDialogOpen(false);
      setFormData({ vehicleId: "", category: "yakit", amount: "", description: "", date: toInputDate(today) });
      setAddError(null);
      toast({ title: "Masraf eklendi", description: `${vehicle.plate} için ${CATEGORY_LABELS[formData.category]} kaydı oluşturuldu.` });
    } catch (error) {
      console.error("Add cost error:", error);
      const message = error instanceof Error ? error.message : "Kayıt eklenirken hata oluştu.";
      setAddError(message);
      toast({
        title: "Araç masrafı eklenemedi",
        description: message,
        variant: "destructive",
        duration: 8000,
      });
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete Record ──────────────────────────────────

  const handleDelete = async (record: VehicleCostRecord) => {
    if (!confirm(`${record.vehiclePlate} - ${CATEGORY_LABELS[record.category]} kaydını silmek istiyor musunuz?`)) return;
    try {
      await deleteDoc(doc(db, "vehicle_costs", record.id));
      setRecords((prev) => prev.filter((r) => r.id !== record.id));
      toast({ title: "Kayıt silindi" });
    } catch (error) {
      console.error("Delete cost error:", error);
      toast({ title: "Silinemedi", variant: "destructive" });
    }
  };

  // ─── Export ─────────────────────────────────────────

  const handleExport = async () => {
    try {
      const { utils, writeFile } = await import("xlsx");
      const ws = utils.json_to_sheet(
        filteredRecords.map((r) => ({
          Plaka: r.vehiclePlate,
          Araç: r.vehicleName,
          Kategori: CATEGORY_LABELS[r.category],
          Tutar: r.amount,
          Açıklama: r.description,
          Tarih: r.date,
        }))
      );
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, "Araç Masrafları");
      writeFile(wb, `arac_masraflari_${startDate}_${endDate}.xlsx`);
      toast({ title: "Excel indirildi" });
    } catch {
      toast({ title: "Excel indirilemedi", variant: "destructive" });
    }
  };

  // ─── Render ─────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Araç Carisi (Gider & Gelir)</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Her araca ait giderleri ve tahsilat (araç geliri) kayıtlarını takip edin.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/tahsilat">
              <Banknote className="w-4 h-4 mr-2" />
              Tahsilat
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Excel
          </Button>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Masraf Ekle
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              Toplam Gider
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatMoney(summary.totalCost)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingDown className="w-4 h-4" />
              Sabit Giderler
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(summary.fixedCost)}</div>
            <p className="text-xs text-muted-foreground mt-1">Kasko, Sigorta, MTV, Amortisman</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Değişken Giderler
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(summary.variableCost)}</div>
            <p className="text-xs text-muted-foreground mt-1">Yakıt, Bakım, Onarım, vb.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Banknote className="w-4 h-4 text-emerald-600" />
              Araç Geliri (Tahsilat)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700">{formatMoney(totalTahsilat)}</div>
            <p className="text-xs text-muted-foreground mt-1">Seçili tarih ve araç filtresine göre</p>
          </CardContent>
        </Card>
        <Card className={netKar >= 0 ? "border-emerald-200 bg-emerald-50/30" : "border-amber-200 bg-amber-50/30"}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Net Kar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netKar >= 0 ? "text-emerald-700" : "text-amber-700"}`}>
              {formatMoney(netKar)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Gelir − Gider (seçili dönem)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Car className="w-4 h-4" />
              En Masraflı Araç
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summary.topCostVehicle ? (
              <>
                <div className="text-lg font-bold">{summary.topCostVehicle.plate}</div>
                <p className="text-sm text-muted-foreground">{formatMoney(summary.topCostVehicle.total)}</p>
              </>
            ) : (
              <div className="text-muted-foreground text-sm">Kayıt yok</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label className="text-xs">Başlangıç</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-36" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Bitiş</Label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-36" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Araç</Label>
          <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Araçlar</SelectItem>
              {vehicles.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.plate} — {v.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Gider Tipi</Label>
          <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as typeof categoryFilter)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tümü</SelectItem>
              <SelectItem value="fixed">Sabit Giderler</SelectItem>
              <SelectItem value="variable">Değişken Giderler</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-w-[180px] space-y-1">
          <Label className="text-xs">Ara</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Plaka, araç veya açıklama..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {/* Per-Vehicle Breakdown (collapsed summary) */}
      {summary.vehicleBreakdown.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {summary.vehicleBreakdown.map((v) => (
            <Badge
              key={v.id}
              variant={vehicleFilter === v.id ? "default" : "outline"}
              className="cursor-pointer text-xs py-1"
              onClick={() => setVehicleFilter(vehicleFilter === v.id ? "all" : v.id)}
            >
              {v.plate}: {formatMoney(v.total)}
            </Badge>
          ))}
        </div>
      )}

      {/* Araç Başı Karlılık */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            Araç Başı Karlılık
          </CardTitle>
          <CardDescription>
            Seçili tarih aralığında her aracın alış fiyatı, gideri, geliri, net karı ve yatırım getirisi (ROI).
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plaka</TableHead>
                <TableHead>Araç</TableHead>
                <TableHead className="text-right">Alış Fiyatı</TableHead>
                <TableHead className="text-right">Gider</TableHead>
                <TableHead className="text-right">Gelir</TableHead>
                <TableHead className="text-right">Net Kar</TableHead>
                <TableHead className="text-right">Marj %</TableHead>
                <TableHead className="text-right">ROI %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehicleProfitability.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Seçili dönemde gider veya gelir kaydı olan araç yok. Tarih aralığını genişletebilirsiniz.
                  </TableCell>
                </TableRow>
              ) : (
                vehicleProfitability.map((row) => {
                  const marginPct = row.income > 0 ? Math.round((row.profit / row.income) * 100) : 0;
                  return (
                    <TableRow key={row.vehicleId}>
                      <TableCell className="font-mono font-medium">{row.plate}</TableCell>
                      <TableCell className="text-sm">{row.name}</TableCell>
                      <TableCell className="text-right text-sm">
                        {row.purchasePrice > 0 ? formatMoney(row.purchasePrice) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-right text-destructive">{formatMoney(row.cost)}</TableCell>
                      <TableCell className="text-right text-emerald-700">{formatMoney(row.income)}</TableCell>
                      <TableCell className={`text-right font-semibold ${row.profit >= 0 ? "text-emerald-700" : "text-amber-700"}`}>
                        {formatMoney(row.profit)}
                      </TableCell>
                      <TableCell className={`text-right text-sm ${row.profit >= 0 ? "text-emerald-600" : "text-amber-600"}`}>
                        %{marginPct}
                      </TableCell>
                      <TableCell className={`text-right text-sm font-medium ${row.roi >= 0 ? "text-blue-600" : "text-red-600"}`}>
                        %{row.roi.toFixed(1)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Records Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarih</TableHead>
                <TableHead>Plaka</TableHead>
                <TableHead>Araç</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Açıklama</TableHead>
                <TableHead className="text-right">Tutar</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    {records.length === 0 ? "Henüz masraf kaydı yok." : "Filtre kriterlerine uygun kayıt bulunamadı."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecords.map((r) => {
                  const Icon = CATEGORY_ICONS[r.category] || Receipt;
                  const isFixed = FIXED_CATEGORIES.includes(r.category);
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm">{formatDate(r.date)}</TableCell>
                      <TableCell className="font-mono text-sm font-medium">{r.vehiclePlate}</TableCell>
                      <TableCell className="text-sm">{r.vehicleName}</TableCell>
                      <TableCell>
                        <Badge variant={isFixed ? "secondary" : "outline"} className="gap-1 text-xs">
                          <Icon className="w-3 h-3" />
                          {CATEGORY_LABELS[r.category]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {r.description || "-"}
                      </TableCell>
                      <TableCell className="text-right font-medium text-destructive">
                        {formatMoney(r.amount)}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/70 hover:text-destructive" onClick={() => handleDelete(r)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Tahsilat (Araç Geliri) */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Banknote className="w-5 h-5 text-emerald-600" />
                Tahsilat (Araç Geliri)
              </CardTitle>
              <CardDescription className="mt-1">
                Seçili tarih aralığında ve araç filtresine göre tahsilat kayıtları. Yeni tahsilat eklemek için Tahsilat sayfasına gidin.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin/tahsilat" className="gap-2">
                <ExternalLink className="w-4 h-4" />
                Tahsilat sayfası
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarih</TableHead>
                <TableHead>Plaka</TableHead>
                <TableHead>Müşteri</TableHead>
                <TableHead>Ödeme</TableHead>
                <TableHead className="text-right">Tutar</TableHead>
                <TableHead>Açıklama</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {payments.length === 0
                      ? "Henüz tahsilat kaydı yok. Tahsilat sayfasından ekleyebilirsiniz."
                      : "Seçili tarih ve araç filtresine uygun tahsilat yok."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredPayments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm">{formatDate(p.date)}</TableCell>
                    <TableCell className="font-mono text-sm font-medium">{p.vehiclePlate}</TableCell>
                    <TableCell className="text-sm">{p.customerName}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {PAYMENT_METHOD_LABELS[p.paymentMethod] ?? p.paymentMethod}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium text-emerald-700">
                      {formatMoney(p.amount)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">
                      {p.description || "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Cost Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setAddError(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Yeni Masraf Kaydı</DialogTitle>
            <DialogDescription>Araca ait gider kaydı ekleyin.</DialogDescription>
          </DialogHeader>
          {addError && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Araç masrafı eklenemedi</p>
                <p className="mt-1 opacity-90">{addError}</p>
              </div>
            </div>
          )}
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Araç *</Label>
              <Select value={formData.vehicleId} onValueChange={(v) => setFormData((p) => ({ ...p, vehicleId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Araç seçin..." />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.plate} — {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Kategori</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData((p) => ({ ...p, category: v as CostCategory }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem disabled value="__h1__"><span className="font-semibold text-xs">── Sabit Giderler ──</span></SelectItem>
                    {FIXED_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
                    ))}
                    <SelectItem disabled value="__h2__"><span className="font-semibold text-xs">── Değişken Giderler ──</span></SelectItem>
                    {VARIABLE_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Tarih</Label>
                <Input type="date" value={formData.date} onChange={(e) => setFormData((p) => ({ ...p, date: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Tutar (TL) *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData((p) => ({ ...p, amount: e.target.value }))}
                placeholder="Ör: 5000"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Açıklama</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                placeholder="İsteğe bağlı not..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>İptal</Button>
            <Button onClick={handleAdd} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
