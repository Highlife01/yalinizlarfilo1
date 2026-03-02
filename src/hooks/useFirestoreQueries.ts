/**
 * React Query hooks wrapping Firestore service calls.
 * Use these in components instead of raw useEffect + useState fetching.
 */
import { useQuery } from "@tanstack/react-query";
import {
  getVehicles,
  getBookings,
  getActiveBookings,
  getVehicleOperations,
  getRecentOperations,
  getContactMessages,
  getIncomeRecords,
  getPayments,
  getVehicleCosts,
  getVehicleById,
} from "@/services/firestoreService";

/** Fetch all vehicles */
export function useVehicles() {
  return useQuery({
    queryKey: ["vehicles"],
    queryFn: getVehicles,
  });
}

/** Fetch single vehicle by ID */
export function useVehicle(id: string | undefined) {
  return useQuery({
    queryKey: ["vehicles", id],
    queryFn: () => getVehicleById(id!),
    enabled: !!id,
  });
}

/** Fetch all bookings */
export function useBookings() {
  return useQuery({
    queryKey: ["bookings"],
    queryFn: getBookings,
  });
}

/** Fetch only active bookings */
export function useActiveBookings() {
  return useQuery({
    queryKey: ["bookings", "active"],
    queryFn: getActiveBookings,
  });
}

/** Fetch vehicle operations, optionally filtered by vehicleId */
export function useVehicleOperations(vehicleId?: string) {
  return useQuery({
    queryKey: ["vehicle_operations", vehicleId ?? "all"],
    queryFn: () => getVehicleOperations(vehicleId),
  });
}

/** Fetch recent operations for dashboard */
export function useRecentOperations(count = 10) {
  return useQuery({
    queryKey: ["vehicle_operations", "recent", count],
    queryFn: () => getRecentOperations(count),
  });
}

/** Fetch contact messages */
export function useContactMessages() {
  return useQuery({
    queryKey: ["contact_messages"],
    queryFn: getContactMessages,
  });
}

/** Fetch income records */
export function useIncomeRecords() {
  return useQuery({
    queryKey: ["income_records"],
    queryFn: getIncomeRecords,
  });
}

/** Fetch payments */
export function usePayments() {
  return useQuery({
    queryKey: ["payments"],
    queryFn: getPayments,
  });
}

/** Fetch vehicle costs */
export function useVehicleCosts() {
  return useQuery({
    queryKey: ["vehicle_costs"],
    queryFn: getVehicleCosts,
  });
}
