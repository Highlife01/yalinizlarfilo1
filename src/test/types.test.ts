import { describe, it, expect } from "vitest";
import type { Vehicle, Booking, VehicleStatus, BookingStatus } from "@/types";
import { VEHICLE_STATUS_OPTIONS, ALERT_WINDOW_DAYS, DAY_IN_MS } from "@/types";

describe("Shared Types & Constants", () => {
  it("VEHICLE_STATUS_OPTIONS should contain 4 statuses", () => {
    expect(VEHICLE_STATUS_OPTIONS).toHaveLength(4);
    const values = VEHICLE_STATUS_OPTIONS.map((o) => o.value);
    expect(values).toContain("active");
    expect(values).toContain("rented");
    expect(values).toContain("maintenance");
    expect(values).toContain("inactive");
  });

  it("ALERT_WINDOW_DAYS should be 15", () => {
    expect(ALERT_WINDOW_DAYS).toBe(15);
  });

  it("DAY_IN_MS should equal 86400000", () => {
    expect(DAY_IN_MS).toBe(86_400_000);
  });

  it("Vehicle type should be usable", () => {
    const vehicle: Vehicle = {
      id: "test-1",
      name: "Fiat Egea",
      category: "sedan",
      plate: "01 ABC 123",
      status: "active",
      fuel: "Benzin",
      transmission: "Manuel",
      price: "1500",
      image_url: null,
      passengers: 5,
    };
    expect(vehicle.status satisfies VehicleStatus).toBe("active");
    expect(vehicle.plate).toContain("01");
  });

  it("Booking type should be usable", () => {
    const booking: Booking = {
      id: "b-1",
      status: "pending",
      totalPrice: 5000,
      vehiclePlate: "01 ABC 123",
      customerName: "Test Müşteri",
    };
    expect(booking.status satisfies BookingStatus).toBe("pending");
  });
});
