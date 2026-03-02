/**
 * Firestore service layer — abstracts all database calls.
 * Components should use these functions (or React Query hooks wrapping them)
 * instead of calling Firestore SDK directly.
 */
import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  limit,
  where,
  type DocumentData,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "@/integrations/firebase/client";

import type {
  Vehicle,
  Booking,
  VehicleOperation,
  ContactMessage,
  IncomeRecord,
  PaymentRecord,
  VehicleCost,
} from "@/types";

// ─── Generic helpers ────────────────────────────────────────────

function mapDoc<T>(docSnap: DocumentData): T {
  return { id: docSnap.id, ...docSnap.data() } as T;
}

async function fetchCollection<T>(
  collectionName: string,
  constraints: QueryConstraint[] = [],
): Promise<T[]> {
  const q = query(collection(db, collectionName), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => mapDoc<T>(d));
}

// ─── Vehicles ───────────────────────────────────────────────────

export async function getVehicles(): Promise<Vehicle[]> {
  return fetchCollection<Vehicle>("vehicles", [orderBy("plate")]);
}

export async function getVehicleById(id: string): Promise<Vehicle | null> {
  const snap = await getDoc(doc(db, "vehicles", id));
  return snap.exists() ? mapDoc<Vehicle>(snap) : null;
}

export async function addVehicle(data: Omit<Vehicle, "id">): Promise<string> {
  const docRef = await addDoc(collection(db, "vehicles"), data);
  return docRef.id;
}

export async function updateVehicle(id: string, data: Partial<Vehicle>): Promise<void> {
  await updateDoc(doc(db, "vehicles", id), data as DocumentData);
}

export async function deleteVehicle(id: string): Promise<void> {
  await deleteDoc(doc(db, "vehicles", id));
}

// ─── Bookings ───────────────────────────────────────────────────

export async function getBookings(): Promise<Booking[]> {
  return fetchCollection<Booking>("bookings");
}

export async function getActiveBookings(): Promise<Booking[]> {
  return fetchCollection<Booking>("bookings", [where("status", "==", "active")]);
}

export async function addBooking(data: Omit<Booking, "id">): Promise<string> {
  const docRef = await addDoc(collection(db, "bookings"), data);
  return docRef.id;
}

export async function updateBooking(id: string, data: Partial<Booking>): Promise<void> {
  await updateDoc(doc(db, "bookings", id), data as DocumentData);
}

export async function deleteBooking(id: string): Promise<void> {
  await deleteDoc(doc(db, "bookings", id));
}

// ─── Vehicle Operations ────────────────────────────────────────

export async function getVehicleOperations(vehicleId?: string): Promise<VehicleOperation[]> {
  const constraints: QueryConstraint[] = [];
  if (vehicleId) constraints.push(where("vehicleId", "==", vehicleId));
  constraints.push(orderBy("date", "desc"));
  return fetchCollection<VehicleOperation>("vehicle_operations", constraints);
}

export async function getRecentOperations(count = 10): Promise<VehicleOperation[]> {
  return fetchCollection<VehicleOperation>("vehicle_operations", [
    orderBy("date", "desc"),
    limit(count),
  ]);
}

// ─── Contact Messages ──────────────────────────────────────────

export async function getContactMessages(): Promise<ContactMessage[]> {
  return fetchCollection<ContactMessage>("contact_messages");
}

// ─── Income Records ────────────────────────────────────────────

export async function getIncomeRecords(): Promise<IncomeRecord[]> {
  return fetchCollection<IncomeRecord>("income_records");
}

// ─── Payments ──────────────────────────────────────────────────

export async function getPayments(): Promise<PaymentRecord[]> {
  return fetchCollection<PaymentRecord>("payments");
}

// ─── Vehicle Costs ─────────────────────────────────────────────

export async function getVehicleCosts(): Promise<VehicleCost[]> {
  return fetchCollection<VehicleCost>("vehicle_costs");
}

// ─── Maintenance ───────────────────────────────────────────────

export async function getMaintenanceRecords() {
  return fetchCollection("maintenance");
}
