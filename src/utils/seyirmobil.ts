import { getFunctions, httpsCallable } from "firebase/functions";

export interface SeyirMobilVehicle {
    device_id: string;
    vehicle: string;       // plaka (örn: "01 BFK 267")
    data_time: string;
    is_gps_active: string; // "0" | "1"
    is_vehicle_running: string; // "0" | "1"
    latitude: string;
    longitude: string;
    speed: string;         // km/h
    address: string;
    total_km: string;
    fuel_level: string;    // %
    driver: string;
    daily_km: string;
    daily_fuel: string;
    province: string;
    district: string;
}

export interface SeyirMobilResult {
    ok: boolean;
    count: number;
    vehicles: SeyirMobilVehicle[];
}

/**
 * Seyir Mobil API'sinden tüm araçların anlık konumlarını çeker.
 * Firebase Cloud Function üzerinden SOAP proxy yapılır (CORS nedeniyle).
 */
export async function fetchSeyirMobilGPS(): Promise<SeyirMobilResult> {
    const functions = getFunctions(undefined, "us-central1");
    const getSeyirMobilGPS = httpsCallable<void, SeyirMobilResult>(functions, "getSeyirMobilGPS");
    const result = await getSeyirMobilGPS();
    return result.data;
}

/**
 * Seyir Mobil plakasını normalize ederek karşılaştırma kolaylaştırır.
 * Örn: "01 BFK 267" → "01BFK267"
 */
export function normalizePlate(plate: string): string {
    return String(plate || "").replace(/\s+/g, "").toUpperCase();
}

/**
 * Seyir Mobil araç verisini Firestore plakasıyla eşleştir.
 */
export function matchByPlate(
    seyirVehicles: SeyirMobilVehicle[],
    firestorePlate: string
): SeyirMobilVehicle | undefined {
    const norm = normalizePlate(firestorePlate);
    return seyirVehicles.find((v) => normalizePlate(v.vehicle) === norm);
}
