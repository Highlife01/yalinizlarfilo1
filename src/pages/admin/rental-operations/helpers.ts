import type { OperationCustomer } from "./types";

/** Format a date string "YYYY-MM-DD" into Turkish locale date */
export const formatTemplateDate = (datePart: string): string => {
    if (!datePart) return new Date().toLocaleDateString("tr-TR");
    const parsed = new Date(`${datePart}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return datePart;
    return parsed.toLocaleDateString("tr-TR");
};

/** Extract date and time parts from datetime-local input */
export const getTemplateDateTime = (dateTimeLocal: string, fallbackTime: string) => {
    if (dateTimeLocal && dateTimeLocal.includes("T")) {
        const [datePart, timePart = fallbackTime] = dateTimeLocal.split("T");
        return {
            date: formatTemplateDate(datePart),
            time: timePart.slice(0, 5) || fallbackTime
        };
    }

    const now = new Date();
    return {
        date: now.toLocaleDateString("tr-TR"),
        time: now.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
    };
};

/** Strip all non-digit characters from a phone number */
export const normalizePhone = (value: string) => value.replace(/\D/g, "");

/** Strip non-alphanumeric and uppercase for plate comparison */
export const normalizePlate = (value: string) => value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

/** Pick the first truthy string from a list of values */
export const pickString = (...values: Array<unknown>) => {
    for (const value of values) {
        if (typeof value === "string" && value.trim()) return value.trim();
    }
    return "";
};

/** Get a default datetime-local value (today at 10:00) */
export const getDefaultDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}T10:00`;
};

/** Parse a string or number to a safe number, handling TR formatting */
export const sanitizeNumber = (val: string | number): number => {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    const sanitized = val.replace(/\./g, "").replace(",", ".");
    const result = Number(sanitized);
    return isNaN(result) ? 0 : result;
};

/** Build a fallback customer object from partial form data */
export const buildFallbackCustomer = (customerForm: Partial<OperationCustomer>): OperationCustomer => ({
    id: "",
    name: (customerForm.name || "").trim() || "Misafir Musteri",
    phone: (customerForm.phone || "").trim() || "-",
    email: (customerForm.email || "").trim(),
    tckn: (customerForm.tckn || "").trim(),
    driverLicenseClass: customerForm.driverLicenseClass || "B",
    driverLicenseNo: (customerForm.driverLicenseNo || "").trim(),
    address: (customerForm.address || "").trim(),
    idSerialNo: (customerForm.idSerialNo || "").trim(),
    idIssuePlace: (customerForm.idIssuePlace || "").trim(),
    idIssueDate: (customerForm.idIssueDate || "").trim(),
    idFrontUrl: customerForm.idFrontUrl || "",
    idBackUrl: customerForm.idBackUrl || "",
    licenseFrontUrl: customerForm.licenseFrontUrl || "",
    licenseBackUrl: customerForm.licenseBackUrl || "",
    invoiceType: customerForm.invoiceType || "individual",
    companyName: (customerForm.companyName || "").trim(),
    taxOffice: (customerForm.taxOffice || "").trim(),
    taxNumber: (customerForm.taxNumber || "").trim(),
    mersisNo: (customerForm.mersisNo || "").trim(),
    secondDriverName: (customerForm.secondDriverName || "").trim() || undefined,
    secondDriverLicenseNo: (customerForm.secondDriverLicenseNo || "").trim() || undefined,
    secondDriverLicenseClass: (customerForm.secondDriverLicenseClass || "B").trim() || undefined,
    secondDriverLicenseDate: (customerForm.secondDriverLicenseDate || "").trim() || undefined,
});

/** Calculate an end date string from start + months for datetime-local input */
export const calculateEndDate = (startDateStr: string, months: number): string => {
    const start = new Date(startDateStr);
    if (isNaN(start.getTime())) return startDateStr;
    start.setMonth(start.getMonth() + months);
    const year = start.getFullYear();
    const month = String(start.getMonth() + 1).padStart(2, "0");
    const day = String(start.getDate()).padStart(2, "0");
    const hour = String(start.getHours()).padStart(2, "0");
    const minute = String(start.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hour}:${minute}`;
};
