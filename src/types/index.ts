// ─── Shared types for Yalınızlar Filo ───────────────────────────

/** Vehicle status enum – single source of truth */
export type VehicleStatus = "active" | "maintenance" | "rented" | "inactive";

/** Booking status */
export type BookingStatus = "pending" | "active" | "completed" | "cancelled";

/** Alert severity levels */
export type AlertSeverity = "info" | "warning" | "critical";

/** Alert types */
export type AlertType = "maintenance" | "document" | "rental";

/** Core Vehicle document shape (Firestore `vehicles` collection) */
export interface Vehicle {
  id: string;
  name: string;
  category: string;
  plate: string;
  status: VehicleStatus;
  fuel: string;
  transmission: string;
  price: string;
  daily_price?: string;
  purchase_price?: number;
  km?: number;
  image_url: string | null;
  image_urls?: string[];
  passengers: number;
  monthly_fixed_cost?: number;
  cost_per_rental?: number;
  insurance_company?: string;
  insurance_start_date?: string;
  insurance_end_date?: string;
  casco_company?: string;
  casco_start_date?: string;
  casco_end_date?: string;
  tuvturk_end_date?: string;
  registration_photo_url?: string | null;
  // GPS fields (populated from Seyir Mobil)
  gpsLat?: number;
  gpsLng?: number;
  gpsSpeed?: number;
  gpsLastUpdate?: string;
}

/** Booking document shape */
export interface Booking {
  id: string;
  status: BookingStatus;
  startDate?: string;
  endDate?: string;
  totalPrice: number;
  vehiclePlate: string;
  customerName: string;
  customerPhone?: string;
}

/** Vehicle operation (delivery / return) */
export interface VehicleOperation {
  id: string;
  type: string;
  date?: string;
  vehicleId?: string;
  vehiclePlate?: string;
  km?: number;
}

/** Contact message from public form */
export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  createdAt?: string;
  isRead: boolean;
}

/** Income record */
export interface IncomeRecord {
  id: string;
  amount: number;
  createdAt?: string;
}

/** Payment record */
export interface PaymentRecord {
  id: string;
  amount: number;
  date?: string;
}

/** Alert item generated on dashboard */
export interface AlertItem {
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  vehicleId?: string;
  bookingId?: string;
}

/** Document expiry reminder */
export interface DocumentReminder {
  vehicleId: string;
  plate: string;
  documentType: "Sigorta" | "Kasko" | "TÜVTÜRK";
  daysUntil: number;
}

/** Vehicle cost entry */
export interface VehicleCost {
  vehicleId: string;
  vehiclePlate: string;
  amount: number;
}

// ─── Vehicle status options (for UI dropdowns) ─────────────────
export const VEHICLE_STATUS_OPTIONS: Array<{ value: VehicleStatus; label: string }> = [
  { value: "active", label: "Müsait" },
  { value: "rented", label: "Kirada" },
  { value: "maintenance", label: "Bakımda" },
  { value: "inactive", label: "Pasif" },
];

// ─── Constants ─────────────────────────────────────────────────
export const ALERT_WINDOW_DAYS = 15;
export const LONG_RENTAL_DAYS = 30;
export const DAY_IN_MS = 1000 * 60 * 60 * 24;
