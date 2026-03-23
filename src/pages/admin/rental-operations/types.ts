import type SignatureCanvas from "react-signature-canvas";
import type { RefObject } from "react";

export type OperationStep = 'select' | 'customer' | 'checklist' | 'photos' | 'damage' | 'sign' | 'complete';
export type OperationType = 'delivery' | 'return';
export type RentalPricingMode = "daily" | "monthly";

export type BookingPayload = {
    id?: string;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
    customerTckn?: string;
    customerDriverLicenseNo?: string;
    customerAddress?: string;
    customerIdFrontUrl?: string;
    customerIdBackUrl?: string;
    customerLicenseFrontUrl?: string;
    customerLicenseBackUrl?: string;
    vehiclePlate?: string;
    startDate?: string;
    endDate?: string;
};

export type OperationLocationState = {
    booking?: BookingPayload;
    type?: OperationType;
};

export type OperationVehicle = {
    id: string;
    plate: string;
    name?: string;
    brand?: string;
    model?: string;
    km?: number;
    fuel?: string;
    status?: string;
    insurance_end_date?: string;
    insurance_company?: string;
    casco_end_date?: string;
    casco_company?: string;
    vin?: string;
    chassisNo?: string;
    [key: string]: unknown;
};

export type OperationCustomer = {
    id?: string;
    name: string;
    phone: string;
    email: string;
    tckn: string;
    driverLicenseClass: string;
    driverLicenseNo?: string;
    address?: string;
    idFrontUrl?: string;
    idBackUrl?: string;
    licenseFrontUrl?: string;
    licenseBackUrl?: string;
    idSerialNo?: string;
    idIssuePlace?: string;
    idIssueDate?: string;
    invoiceType?: 'individual' | 'corporate';
    companyName?: string;
    taxOffice?: string;
    taxNumber?: string;
    mersisNo?: string;
    /** 2. şoför adı */
    secondDriverName?: string;
    /** 2. şoför ehliyet no */
    secondDriverLicenseNo?: string;
    /** 2. şoför ehliyet sınıfı */
    secondDriverLicenseClass?: string;
    /** 2. şoför ehliyet düzenlenme tarihi */
    secondDriverLicenseDate?: string;
};

export type OperationPhoto = {
    url: string;
    angle: string;
};

export type SignatureRefs = {
    kiralayanSignPad: RefObject<SignatureCanvas | null>;
    kiraciSignPad: RefObject<SignatureCanvas | null>;
    secondDriverSignPad: RefObject<SignatureCanvas | null>;
};

export const INITIAL_CUSTOMER_FORM: Partial<OperationCustomer> = {
    name: "", phone: "", email: "", tckn: "", driverLicenseClass: "B", driverLicenseNo: "", address: "",
    idSerialNo: "", idIssuePlace: "", idIssueDate: "",
    invoiceType: "individual", companyName: "", taxOffice: "", taxNumber: "", mersisNo: "",
    secondDriverName: "", secondDriverLicenseNo: "", secondDriverLicenseClass: "B", secondDriverLicenseDate: ""
};
