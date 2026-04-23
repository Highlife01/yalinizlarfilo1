import { useState } from "react";
import {
  AlertTriangle, CheckCircle2, RefreshCw, Search, ExternalLink,
  Car, Activity
} from "lucide-react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";

const HGS_TOKEN = "01kncya2fjg9b4t0zvr29szds7|P4n9JesGouwNe6zean2IwAfihjL0hlVpcG5M1SjZ89f6ae48";
const BASE = "https://api.hgsborcsorgulama.com/v1";

const hgsHeaders = {
  Authorization: `Bearer ${HGS_TOKEN}`,
  "Content-Type": "application/json",
  Accept: "application/json",
};

type HgsResult = {
  plate: string;
  vehicleId?: string;
  status: "idle" | "loading" | "ok" | "debt" | "error";
  totalDue?: number;
  violations?: { amount?: number; description?: string }[];
  error?: string;
};

async function queryPlate(plate: string): Promise<HgsResult> {
  try {
    const addRes = await fetch(`${BASE}/vehicles`, {
      method: "POST",
      headers: hgsHeaders,
      body: JSON.stringify({ plate_number: plate }),
    });
    const addData = await addRes.json();
    const vehicleId = addData?.data?.id || addData?.id;
    if (!vehicleId) throw new Error(addData?.message || "Araç ID alınamadı");

    const qRes = await fetch(`${BASE}/vehicles/${vehicleId}/query`, {
      method: "POST",
      headers: hgsHeaders,
    });
    if (!qRes.ok) {
      const err = await qRes.json().catch(() => ({}));
      throw new Error(err?.message || `Sorgu hatası (${qRes.status})`);
    }

    // Poll until query_in_progress becomes false (max 30s)
    const maxPoll = 30_000;
    const pollInterval = 3_000;
    const start = Date.now();
    let det: { data?: Record<string, unknown> };
    while (true) {
      const detRes = await fetch(`${BASE}/vehicles/${vehicleId}`, {
        headers: hgsHeaders,
      });
      if (!detRes.ok) throw new Error(`Veri alınamadı (${detRes.status})`);
      det = await detRes.json();
      const inProgress = det?.data?.query_in_progress ?? false;
      if (!inProgress || Date.now() - start > maxPoll) break;
      await new Promise((r) => setTimeout(r, pollInterval));
    }
    const vData = det?.data || det;
    const totalDue = vData?.total_due_amount ?? vData?.totalDueAmount ?? 0;
    const violations = vData?.violations ?? [];

    return {
      plate,
      vehicleId,
      status: totalDue > 0 ? "debt" : "ok",
      totalDue,
      violations,
    };
  } catch (e: unknown) {
    return { plate, status: "error", error: (e as Error).message };
  }
}

// Fetch plates from Firestore vehicles collection
async function fetchVehiclePlates(): Promise<{ plate: string; name: string }[]> {
  const snap = await getDocs(collection(db, "vehicles"));
  return snap.docs
    .map((d) => ({
      plate: (d.data().plate || d.data().licensePlate || d.data().plaka || "").toString().trim(),
      name: `${d.data().brand || d.data().make || ""} ${d.data().model || ""}`.trim(),
    }))
    .filter((v) => v.plate);
}

const fmt = (v: number) =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(v);

export function HgsSorgulama() {
  const [results, setResults] = useState<Record<string, HgsResult>>({});
  const [scanning, setScanning] = useState(false);
  const [singlePlate, setSinglePlate] = useState("");

  const { data: vehicles = [], isLoading: vehiclesLoading } = useQuery({
    queryKey: ["hgs-vehicles"],
    queryFn: fetchVehiclePlates,
  });

  const debtCount = Object.values(results).filter((r) => r.status === "debt").length;
  const okCount = Object.values(results).filter((r) => r.status === "ok").length;
  const loadingCount = Object.values(results).filter((r) => r.status === "loading").length;

  const queryOne = async (plate: string) => {
    const p = plate.replace(/\s/g, "").toUpperCase();
    setResults((prev) => ({ ...prev, [p]: { plate: p, status: "loading" } }));
    const res = await queryPlate(p);
    setResults((prev) => ({ ...prev, [p]: res }));
  };

  const scanAll = async () => {
    setScanning(true);
    for (const v of vehicles) {
      const p = v.plate.replace(/\s/g, "").toUpperCase();
      setResults((prev) => ({ ...prev, [p]: { plate: p, status: "loading" } }));
      const res = await queryPlate(p);
      setResults((prev) => ({ ...prev, [p]: res }));
      await new Promise((r) => setTimeout(r, 1200));
    }
    setScanning(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
            HGS Borç Sorgulama
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Araçların HGS geçiş ihlallerini ve borçlarını otomatik sorgulayın.
          </p>
        </div>
        <Button
          onClick={scanAll}
          disabled={scanning || vehiclesLoading || vehicles.length === 0}
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-md"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${scanning ? "animate-spin" : ""}`} />
          {scanning
            ? `Sorgulanıyor (${loadingCount} bekliyor)...`
            : `Tüm Araçları Sorgula (${vehicles.length})`}
        </Button>
      </div>

      {/* Summary cards */}
      {Object.keys(results).length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-5 text-center">
              <p className="text-3xl font-bold text-slate-800">{Object.keys(results).length}</p>
              <p className="text-xs text-slate-500 mt-1">Sorgulanan</p>
            </CardContent>
          </Card>
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-5 text-center">
              <p className="text-3xl font-bold text-red-600">{debtCount}</p>
              <p className="text-xs text-red-500 mt-1 font-medium">Borçlu Araç</p>
            </CardContent>
          </Card>
          <Card className="border-emerald-200 bg-emerald-50">
            <CardContent className="pt-5 text-center">
              <p className="text-3xl font-bold text-emerald-600">{okCount}</p>
              <p className="text-xs text-emerald-500 mt-1 font-medium">Borçsuz</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Single plate */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tek Plaka Sorgula</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                value={singlePlate}
                onChange={(e) => setSinglePlate(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && singlePlate && queryOne(singlePlate)}
                placeholder="01-AAK-975"
                className="pl-9 font-mono"
              />
            </div>
            <Button
              onClick={() => singlePlate && queryOne(singlePlate)}
              disabled={!singlePlate || results[singlePlate]?.status === "loading"}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
            >
              Sorgula
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Vehicle table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Car className="h-4 w-4" /> Araç HGS Durumları
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b text-xs text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Araç</th>
                  <th className="px-4 py-3 text-left font-semibold">Plaka</th>
                  <th className="px-4 py-3 text-left font-semibold">HGS Borç</th>
                  <th className="px-4 py-3 text-left font-semibold">Durum</th>
                  <th className="px-4 py-3 text-right font-semibold w-24"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {vehiclesLoading && (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-slate-400">
                      <Activity className="h-5 w-5 animate-spin mx-auto mb-2" />
                      Araçlar yükleniyor...
                    </td>
                  </tr>
                )}
                {!vehiclesLoading && vehicles.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-slate-400">
                      Firestore'da plakalı araç bulunamadı.
                    </td>
                  </tr>
                )}
                {vehicles.map((v) => {
                  const p = v.plate.replace(/\s/g, "").toUpperCase();
                  const res = results[p];
                  return (
                    <tr
                      key={p}
                      className={`transition-colors ${
                        res?.status === "debt"
                          ? "bg-red-50 border-l-4 border-l-red-400"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800">{v.name || "—"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <code className="text-xs bg-slate-100 border px-2 py-0.5 rounded font-mono">
                          {v.plate}
                        </code>
                      </td>
                      <td className="px-4 py-3 font-bold">
                        {res?.status === "debt" && (
                          <span className="text-red-600">{fmt(res.totalDue!)}</span>
                        )}
                        {res?.status === "ok" && (
                          <span className="text-emerald-600">Borç Yok</span>
                        )}
                        {res?.status === "error" && (
                          <span className="text-slate-400 text-xs">{res.error}</span>
                        )}
                        {(!res || res.status === "idle") && (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {res?.status === "loading" && (
                          <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300">
                            <RefreshCw className="h-3 w-3 animate-spin" /> Sorgulanıyor
                          </Badge>
                        )}
                        {res?.status === "debt" && (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {res.violations?.length || 0} İhlal
                          </Badge>
                        )}
                        {res?.status === "ok" && (
                          <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-300 bg-emerald-50">
                            <CheckCircle2 className="h-3 w-3" /> Temiz
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => queryOne(p)}
                          disabled={res?.status === "loading"}
                          className="text-xs h-7"
                        >
                          Sorgula
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-slate-400 flex items-center gap-1.5">
        <ExternalLink className="h-3 w-3" />
        API: hgsborcsorgulama.com · Her yeni ihlal sorgusu 1 kredi tüketir ·{" "}
        <a
          href="https://panel.hgsborcsorgulama.com"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-slate-600"
        >
          Panel
        </a>
      </p>
    </div>
  );
}
