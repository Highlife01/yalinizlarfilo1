import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Navigation, RefreshCw, Car, MapPin, Gauge, AlertTriangle } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { matchByPlate, type SeyirMobilVehicle } from "@/utils/seyirmobil";
import { useNavigate } from "react-router-dom";

// Fix for default marker icons in Leaflet with Vite/Webpack
// @ts-expect-error Leaflet internal API workaround for bundler compatibility
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface VehicleWithKm {
    id: string;
    plate: string;
    name?: string;
    status: "active" | "maintenance" | "rented" | "inactive";
    km: number;
}

interface DocumentReminder {
    vehicleId: string;
    plate: string;
    documentType: string;
    daysUntil: number;
}

interface DashboardTrackingProps {
    gpsData: SeyirMobilVehicle[];
    vehiclesWithKm: VehicleWithKm[];
    documentReminders: DocumentReminder[];
    gpsLoading: boolean;
    gpsError: string | null;
    gpsLastFetch: Date | null;
    fetchGPS: () => void;
}

const parseSeyirMobilDate = (dateStr: string) => {
    if (!dateStr) return new Date();
    // Seyir Mobil format: "DD.MM.YYYY HH:mm:ss"
    const parts = dateStr.split(/[\s.:]+/);
    if (parts.length < 6) return new Date(dateStr);
    const [day, month, year, hour, min, sec] = parts.map(Number);
    return new Date(year, month - 1, day, hour, min, sec);
};

const MapResizer = () => {
    const map = useMap();
    React.useEffect(() => {
        setTimeout(() => {
            map.invalidateSize();
        }, 100);
    }, [map]);
    return null;
};

export const DashboardTracking: React.FC<DashboardTrackingProps> = ({
    gpsData,
    vehiclesWithKm,
    documentReminders,
    gpsLoading,
    gpsError,
    gpsLastFetch,
    fetchGPS,
}) => {
    const navigate = useNavigate();

    return (
        <Card className="shadow-md border-slate-200 overflow-hidden mt-6">
            <CardHeader className="bg-slate-50 border-b pb-4 pt-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600 p-2 rounded-lg">
                            <Navigation className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-bold">Canlı Filo Takibi</CardTitle>
                            <div className="flex items-center gap-2 mt-0.5">
                                {gpsData.length > 0 ? (
                                    <span className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 uppercase tracking-tighter">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        SİSTEM AKTİF · {gpsData.length} ARAÇ
                                    </span>
                                ) : (
                                    <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter">GPS BEKLENİYOR</span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex items-center gap-2 mr-2">
                            <span className="text-[10px] text-slate-400 font-bold">
                                <span className="text-blue-600">{vehiclesWithKm.filter(v => v.status === "rented").length}</span> KİRADA
                                {" · "}
                                <span className="text-emerald-600">{vehiclesWithKm.filter(v => v.status === "active").length}</span> MÜSAİT
                            </span>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="flex flex-col gap-4 p-5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex flex-col gap-1">
                            <h3 className="text-sm font-semibold flex items-center gap-2">
                                <Navigation className="w-4 h-4 text-blue-600" />
                                Filo Takip Haritası
                            </h3>
                            <div className="text-xs text-slate-500">
                                {gpsError ? (
                                    <span className="text-red-500">⚠ GPS hatası: {gpsError.slice(0, 80)}</span>
                                ) : gpsLastFetch ? (
                                    <span>Son Güncelleme: {gpsLastFetch.toLocaleTimeString("tr-TR")} (60s otomatik yenilenir)</span>
                                ) : (
                                    <span>GPS verisi yükleniyor...</span>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={fetchGPS}
                                disabled={gpsLoading}
                                className="h-9"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 mr-1 ${gpsLoading ? "animate-spin" : ""}`} />
                                {gpsLoading ? "Yenileniyor..." : "Konumları Güncelle"}
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => navigate("/admin/fleet")} className="h-9">
                                <Car className="w-4 h-4 mr-1" /> Tüm Araçlar
                            </Button>
                        </div>
                    </div>

                    <div className="relative h-[400px] w-full rounded-xl overflow-hidden border shadow-inner bg-slate-100 z-10">
                        {gpsData.length > 0 ? (
                            <MapContainer
                                center={[37.0, 35.32]}
                                zoom={6}
                                style={{ height: "100%", width: "100%" }}
                                scrollWheelZoom={false}
                            >
                                <MapResizer />
                                <TileLayer
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />
                                {vehiclesWithKm.filter(v => v.status !== "inactive").map(vehicle => {
                                    const gps = matchByPlate(gpsData, vehicle.plate);
                                    if (!gps || !gps.latitude || !gps.longitude) return null;

                                    const lat = parseFloat(String(gps.latitude).replace(',', '.'));
                                    const lng = parseFloat(String(gps.longitude).replace(',', '.'));

                                    if (isNaN(lat) || isNaN(lng)) return null;
                                    const isRunning = gps.is_vehicle_running === "1";
                                    const speed = parseFloat(gps.speed) || 0;

                                    return (
                                        <Marker key={vehicle.id} position={[lat, lng]}>
                                            <Popup>
                                                <div className="p-1">
                                                    <div className="font-bold border-b pb-1 mb-1">{vehicle.plate}</div>
                                                    <div className="text-xs space-y-1">
                                                        <div className="flex items-center gap-1">
                                                            <div className={`w-2 h-2 rounded-full ${isRunning ? "bg-green-500" : "bg-slate-400"}`} />
                                                            <span className="font-medium">{isRunning ? "Motor Çalışıyor" : "Park Halinde"}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1 text-blue-600">
                                                            <Gauge className="w-3 h-3" />
                                                            <span>{speed} km/h</span>
                                                        </div>
                                                        <div className="flex items-start gap-1">
                                                            <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                                            <span className="text-[10px] leading-tight text-slate-500">{gps.address || "Adres alınıyor..."}</span>
                                                        </div>
                                                        <div className="pt-1 mt-1 border-t flex justify-between items-center">
                                                            <span className="text-[9px] text-slate-400">{parseSeyirMobilDate(gps.data_time).toLocaleTimeString("tr-TR")}</span>
                                                            <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => navigate(`/admin/fleet/${vehicle.id}`)}>Detay</Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </Popup>
                                        </Marker>
                                    );
                                })}
                            </MapContainer>
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-50">
                                {gpsLoading ? (
                                    <>
                                        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
                                        <p className="text-sm text-slate-500 animate-pulse">GPS verileri yükleniyor...</p>
                                    </>
                                ) : (
                                    <>
                                        <Navigation className="w-10 h-10 text-slate-300" />
                                        <p className="text-sm text-slate-500">Konum verisi yok.</p>
                                        <Button onClick={fetchGPS} variant="outline" size="sm">Yenile</Button>
                                    </>
                                )}
                            </div>
                        )}
                        <div className="absolute bottom-4 right-4 z-[400] bg-white/90 backdrop-blur-sm p-2 rounded-lg border shadow-sm text-[10px] flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500" />
                                <span>Aktif Hareket</span>
                            </div>
                            <div className="flex items-center gap-2 border-t pt-1">
                                <div className="w-2 h-2 rounded-full bg-blue-500" />
                                <span>Kirada</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                <span>Müsait</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-amber-500" />
                                <span>Bakımda</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {vehiclesWithKm.filter(v => v.status !== "inactive").map((vehicle) => {
                            const gps = matchByPlate(gpsData, vehicle.plate);
                            const statusColor = vehicle.status === "rented" ? "border-blue-300 bg-blue-50" : vehicle.status === "maintenance" ? "border-amber-300 bg-amber-50" : "border-emerald-300 bg-emerald-50";
                            const statusLabel = vehicle.status === "rented" ? "Kirada" : vehicle.status === "maintenance" ? "Bakımda" : "Müsait";
                            const statusDot = vehicle.status === "rented" ? "bg-blue-500" : vehicle.status === "maintenance" ? "bg-amber-500" : "bg-emerald-500";
                            const hasDocAlert = documentReminders.some(r => r.vehicleId === vehicle.id);
                            const isIgnitionOn = gps?.is_vehicle_running === "1";
                            const gpsSpeed = gps ? parseFloat(gps.speed) : null;
                            const hasGps = !!gps && !!gps.latitude && !!gps.longitude;

                            return (
                                <div key={vehicle.id} className={`relative rounded-xl border-2 p-3 cursor-pointer hover:shadow-md transition-all ${statusColor}`} onClick={() => navigate(`/admin/fleet/${vehicle.id}`)}>
                                    {hasDocAlert && <span className="absolute top-2 right-2"><AlertTriangle className="w-4 h-4 text-red-500" /></span>}
                                    <div className="flex items-start gap-2">
                                        <div className={`mt-1 h-2.5 w-2.5 rounded-full flex-shrink-0 ${statusDot}`} />
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-sm font-mono tracking-wide">{vehicle.plate}</div>
                                            {vehicle.name && <div className="text-xs text-slate-500 truncate">{vehicle.name}</div>}
                                            <div className="mt-2 space-y-1">
                                                <div className="flex items-center gap-1 text-xs text-slate-600"><Gauge className="w-3 h-3" /><span>{vehicle.km > 0 ? `${vehicle.km.toLocaleString("tr-TR")} km` : "KM yok"}</span></div>
                                                {gps && (
                                                    <>
                                                        <div className="flex items-center gap-1 text-xs">
                                                            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isIgnitionOn ? "bg-green-500" : "bg-slate-300"}`} />
                                                            <span className={isIgnitionOn ? "text-green-700 font-medium" : "text-slate-400"}>{isIgnitionOn ? `Çalsy - ${gpsSpeed}km/h` : "Kontak Kapalı"}</span>
                                                        </div>
                                                        {(gps.district || gps.province) && <div className="flex items-start gap-1 text-xs text-slate-500"><MapPin className="w-3 h-3 mt-0.5" /><span>{gps.district}</span></div>}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-2 flex items-center justify-between">
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/50 border border-black/5 uppercase tracking-tighter">{statusLabel}</span>
                                        {hasGps && (
                                            <a href={`https://maps.google.com/?q=${gps.latitude},${gps.longitude}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="flex items-center gap-1 text-[10px] text-blue-600 font-bold hover:underline">
                                                <MapPin className="w-2.5 h-2.5" /> HARİTADA
                                            </a>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
