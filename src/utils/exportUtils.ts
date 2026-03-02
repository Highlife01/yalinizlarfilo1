export const exportToExcel = async (data: Record<string, unknown>[], filename: string) => {
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, `${filename}.xlsx`);
};

export const exportVehiclesToExcel = async (vehicles: Record<string, unknown>[]) => {
    const data = vehicles.map((v: Record<string, unknown>) => ({
        'Plaka': v.plate,
        'Araç': v.name,
        'Kategori': v.category,
        'Durum': v.status,
        'Kilometre': v.km || 0,
        'Fiyat': v.price
    }));
    await exportToExcel(data, 'Araçlar');
};

export const exportBookingsToExcel = async (bookings: Record<string, unknown>[]) => {
    const data = bookings.map(b => ({
        'Araç': b.vehiclePlate,
        'Müşteri': b.customerName,
        'Telefon': b.customerPhone,
        'Başlangıç': b.startDate,
        'Bitiş': b.endDate,
        'Tutar': b.totalPrice,
        'Durum': b.status
    }));
    await exportToExcel(data, 'Kiralamalar');
};

export const exportVehiclesPDF = async (vehicles: Record<string, unknown>[]) => {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text('Araç Listesi', 14, 20);

    const tableData = vehicles.map(v => [
        v.plate as string,
        v.name as string,
        v.category as string,
        v.status as string,
        v.price + ' TL'
    ]);

    autoTable(doc, {
        head: [['Plaka', 'Araç', 'Kategori', 'Durum', 'Fiyat']],
        body: tableData as string[][],
        startY: 30,
        styles: { font: 'helvetica', fontSize: 10 },
        headStyles: { fillColor: [71, 85, 105] }
    });

    doc.save('araclar.pdf');
};

export const exportBookingsPDF = async (bookings: Record<string, unknown>[]) => {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text('Kiralama Listesi', 14, 20);

    const tableData = bookings.map(b => [
        String(b.vehiclePlate ?? ''),
        String(b.customerName ?? ''),
        String(b.startDate ?? ''),
        String(b.endDate ?? ''),
        b.totalPrice + ' TL',
        String(b.status ?? '')
    ]);

    autoTable(doc, {
        head: [['Araç', 'Müşteri', 'Başlangıç', 'Bitiş', 'Tutar', 'Durum']],
        body: tableData as string[][],
        startY: 30,
        styles: { font: 'helvetica', fontSize: 9 },
        headStyles: { fillColor: [71, 85, 105] }
    });

    doc.save('kiralamalar.pdf');
};

export const generateVehicleReport = async (vehicle: Record<string, unknown>, operations: Record<string, unknown>[]) => {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.text(`Araç Raporu: ${vehicle.plate}`, 14, 20);

    doc.setFontSize(12);
    doc.text(`Model: ${vehicle.name}`, 14, 35);
    doc.text(`Kategori: ${vehicle.category}`, 14, 45);
    doc.text(`Durum: ${vehicle.status}`, 14, 55);
    doc.text(`Kilometre: ${vehicle.km || 0}`, 14, 65);

    const opData = operations.map(op => [
        new Date(String(op.date)).toLocaleDateString('tr-TR'),
        op.type === 'delivery' ? 'Teslim' : 'İade',
        String(op.km ?? '-'),
        String(op.fuel ?? '-'),
        String(op.notes ?? '-')
    ]);

    autoTable(doc, {
        head: [['Tarih', 'İşlem', 'KM', 'Yakıt', 'Notlar']],
        body: opData,
        startY: 80,
        styles: { font: 'helvetica', fontSize: 9 },
        headStyles: { fillColor: [71, 85, 105] }
    });

    doc.save(`arac_raporu_${vehicle.plate}.pdf`);
};

/** Fatura PDF: tahsil edilen tutar (veya toplam tutar) için fatura belgesi oluşturur */
export type InvoicePdfParams = {
    customerName: string;
    customerCompanyName?: string;
    customerTaxNumber?: string;
    vehiclePlate: string;
    date: string;
    amount: number;
    kdvRate: number;
    invoiceType: "individual" | "corporate";
    /** Tahsil edilen tutar için kesildiyse true */
    isCollectedAmount?: boolean;
};

export const generateInvoicePdf = async (params: InvoicePdfParams): Promise<void> => {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF();
    const {
        customerName,
        customerCompanyName,
        customerTaxNumber,
        vehiclePlate,
        date,
        amount,
        kdvRate,
        invoiceType,
        isCollectedAmount,
    } = params;

    const kdvAmount = Math.round((amount * kdvRate) / 100 * 100) / 100;
    const totalWithKdv = amount + kdvAmount;
    const dateStr = new Date(date).toLocaleDateString("tr-TR");

    doc.setFontSize(16);
    doc.text("FATURA", 14, 18);
    doc.setFontSize(10);
    doc.text("YALINIZLAR FİLO LTD. ŞTİ.", 14, 26);
    doc.text("Yeşiloba Mah. 46120 Cad. Oto Galericiler Sitesi D Blok No: 15/8F Seyhan/ADANA", 14, 32);
    doc.text("Seyhan V.D.: 933 114 5509  |  MERSIS: 0933 1145 5090 0001", 14, 38);
    doc.text("Tarih: " + dateStr, 14, 44);
    if (isCollectedAmount) {
        doc.setTextColor(0, 100, 0);
        doc.text("(Tahsil edilen tutar için düzenlenmiştir)", 14, 50);
        doc.setTextColor(0, 0, 0);
    }

    let y = 58;
    doc.setFont("helvetica", "bold");
    doc.text("Müşteri / Alıcı", 14, y);
    doc.setFont("helvetica", "normal");
    y += 6;
    if (invoiceType === "corporate" && customerCompanyName) {
        doc.text(customerCompanyName, 14, y);
        y += 5;
        doc.text("Yetkili: " + customerName, 14, y);
    } else {
        doc.text(customerName, 14, y);
    }
    y += 5;
    if (customerTaxNumber) {
        doc.text((invoiceType === "corporate" ? "Vergi No: " : "TC: ") + customerTaxNumber, 14, y);
        y += 6;
    }
    doc.text("Plaka: " + vehiclePlate, 14, y);
    y += 10;

    const tableBody = [
        ["Açıklama", "Kiralama bedeli" + (isCollectedAmount ? " (tahsil edilen tutar)" : "")],
        ["Araç plakası", vehiclePlate],
        ["Tutar (KDV Hariç)", amount.toLocaleString("tr-TR", { minimumFractionDigits: 2 }) + " TL"],
        ["KDV (%" + kdvRate + ")", kdvAmount.toLocaleString("tr-TR", { minimumFractionDigits: 2 }) + " TL"],
        ["Genel Toplam (KDV Dahil)", totalWithKdv.toLocaleString("tr-TR", { minimumFractionDigits: 2 }) + " TL"],
    ];
    autoTable(doc, {
        head: [["Kalem", "Değer"]],
        body: tableBody,
        startY: y,
        styles: { font: "helvetica", fontSize: 10 },
        headStyles: { fillColor: [71, 85, 105] },
        columnStyles: { 0: { cellWidth: 55 }, 1: { cellWidth: 125 } },
    });

    const lastTable = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable;
    const finalY = (lastTable?.finalY ?? y) + 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Bu belge tahsil edilen tutarın fatura edilmesi amacıyla düzenlenmiştir. E-fatura entegrasyonu sonrası resmi fatura bu ekran üzerinden kesilecektir.", 14, finalY);

    const safePlate = vehiclePlate.replace(/\s/g, "_");
    const safeDate = dateStr.replace(/\./g, "-");
    doc.save(`Fatura_${safePlate}_${safeDate}.pdf`);
};
