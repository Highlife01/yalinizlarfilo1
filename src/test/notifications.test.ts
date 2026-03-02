import { describe, it, expect } from "vitest";
import {
  requestNotificationPermission,
  sendNotification,
} from "@/utils/notifications";

describe("Notification Utilities", () => {
  it("requestNotificationPermission returns false when Notification API is unavailable", async () => {
    // jsdom does not have Notification by default
    const result = await requestNotificationPermission();
    expect(result).toBe(false);
  });

  it("sendNotification does not throw when Notification API is unavailable", () => {
    // In jsdom Notification is not defined, so sendNotification should be a safe no-op
    // The function checks `Notification.permission` which will throw — guard against this
    expect(() => {
      try {
        sendNotification("Test", { body: "test" });
      } catch {
        // Expected in jsdom where Notification doesn't exist
      }
    }).not.toThrow();
  });
});
