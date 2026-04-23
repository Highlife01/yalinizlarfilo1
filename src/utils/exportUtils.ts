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

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    // Modern Renk Paleti (Slate & Crimson/Red accent)
    const BRAND = [220, 38, 38] as const;         // Kırmızı vurgu
    const BRAND_DARK = [153, 27, 27] as const;
    const SLATE_900 = [15, 23, 42] as const;      // Başlıklar
    const SLATE_700 = [51, 65, 85] as const;      // Alt başlıklar
    const SLATE_500 = [100, 116, 139] as const;   // İkincil metinler
    const SLATE_200 = [226, 232, 240] as const;   // Çizgiler / tablolar
    const SLATE_50 = [248, 250, 252] as const;    // Hafif arka plan

    // --- EN ÜST ACCENT ÇİZGİSİ ---
    doc.setFillColor(...BRAND);
    doc.rect(0, 0, pageW, 4, "F");

    let y = 24; // baslangic yuksekligi

    // --- HEADER BÖLÜMÜ ---
    // Sol üst - Firma Adi
    doc.setTextColor(...SLATE_900);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(26);
    doc.text("YALINIZLAR FILO", 15, y + 8);

    doc.setTextColor(...BRAND);
    doc.setFontSize(26);
    doc.text(".", 92, y + 8); // Kucuk kirmizi nokta efekti

    doc.setTextColor(...SLATE_500);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Arac Kiralama & Filo Yonetimi", 15, y + 15);

    // Sag ust - Fatura Basligi & Detaylar
    doc.setTextColor(...SLATE_900);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("PROFORMA FATURA", pageW - 15, y + 6, { align: "right" });

    const invoiceNo = "INV-" + Date.now().toString(36).toUpperCase().slice(-6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...SLATE_500);

    const dtX = pageW - 15;
    let dtY = y + 14;
    doc.text("Fatura No:", dtX - 25, dtY, { align: "left" });
    doc.setTextColor(...SLATE_900);
    doc.setFont("helvetica", "bold");
    doc.text(invoiceNo, dtX, dtY, { align: "right" });

    dtY += 6;
    doc.setTextColor(...SLATE_500);
    doc.setFont("helvetica", "normal");
    doc.text("Tarih:", dtX - 25, dtY, { align: "left" });
    doc.setTextColor(...SLATE_900);
    doc.setFont("helvetica", "bold");
    doc.text(dateStr, dtX, dtY, { align: "right" });

    y += 28;

    // --- AYIRICI ÇİZGİ ---
    doc.setDrawColor(...SLATE_200);
    doc.setLineWidth(0.5);
    doc.line(15, y, pageW - 15, y);

    y += 12;

    // --- FİRMA / MÜŞTERİ BİLGİLERİ ---
    // GONDEREN BILGILERI (SOL)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...SLATE_500);
    doc.text("GONDEREN", 15, y);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...SLATE_900);
    doc.text("YALINIZLAR FILO LTD. STI.", 15, y + 6);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...SLATE_700);
    doc.text("Yesiloba Mah. 46120 Cad. Oto Galericiler", 15, y + 11);
    doc.text("Sitesi D Blok No:15/8F Seyhan / ADANA", 15, y + 16);
    doc.text("Tel: 0533 946 50 02", 15, y + 21);
    doc.text("Vergi Dairesi: Seyhan", 15, y + 26);
    doc.text("VKN: 933 114 5509", 15, y + 31);

    // FATURA EDILEN (SAG)
    const rightColX = pageW / 2 + 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...SLATE_500);
    doc.text("FATURA EDILEN", rightColX, y);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...SLATE_900);

    let buyerY = y + 6;
    if (invoiceType === "corporate" && customerCompanyName) {
        doc.text(customerCompanyName.substring(0, 45), rightColX, buyerY);
        buyerY += 5;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(...SLATE_700);
        doc.text("Yetkili: " + customerName, rightColX, buyerY);
        if (customerTaxNumber) {
            buyerY += 5;
            doc.text("Vergi No: " + customerTaxNumber, rightColX, buyerY);
        }
    } else {
        doc.text(customerName, rightColX, buyerY);
        buyerY += 5;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(...SLATE_700);
        if (customerTaxNumber) {
            doc.text("TC Kimlik No: " + customerTaxNumber, rightColX, buyerY);
        }
    }

    buyerY += 5;
    doc.text("Arac Plakasi: " + vehiclePlate, rightColX, buyerY);

    y = Math.max(y + 38, buyerY + 8);

    // Tahsilat bildirimi
    if (isCollectedAmount) {
        doc.setFillColor(254, 242, 242);
        doc.roundedRect(15, y, pageW - 30, 10, 1, 1, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(...BRAND_DARK);
        doc.text("BU BELGE SADECE TAHSIL EDILEN TUTAR ICIN BILGI AMACLI DUZENLENMISTIR", pageW / 2, y + 6.5, { align: "center" });

        doc.setDrawColor(252, 165, 165);
        doc.setLineWidth(0.3);
        doc.roundedRect(15, y, pageW - 30, 10, 1, 1, "S");

        y += 18;
    } else {
        y += 4;
    }

    // --- TABLO OLUŞTURMA ---
    const tableData = [
        [
            "Arac Kiralama Bedeli" + (isCollectedAmount ? " (Tahsil Edilen Kisim)" : ""),
            vehiclePlate,
            "1",
            amount.toLocaleString("tr-TR", { minimumFractionDigits: 2 }) + " TL",
            kdvRate + "%",
            totalWithKdv.toLocaleString("tr-TR", { minimumFractionDigits: 2 }) + " TL"
        ]
    ];

    autoTable(doc, {
        startY: y,
        head: [["Aciklama", "Plaka", "Adet", "Birim Fiyat", "KDV", "Toplam"]],
        body: tableData,
        theme: "plain",
        styles: {
            font: "helvetica",
            fontSize: 9,
            cellPadding: 6,
            textColor: [...SLATE_700],
        },
        headStyles: {
            fillColor: [...SLATE_50],
            textColor: [...SLATE_900],
            fontStyle: "bold",
            fontSize: 8.5,
        },
        bodyStyles: {
            valign: "middle",
        },
        columnStyles: {
            0: { cellWidth: 65, halign: "left" },
            1: { cellWidth: 25, halign: "center" },
            2: { cellWidth: 15, halign: "center" },
            3: { cellWidth: 28, halign: "right" },
            4: { cellWidth: 15, halign: "right" },
            5: { cellWidth: 32, halign: "right" },
        },
        didDrawPage: function (data) {
            if (data.cursor) {
                doc.setDrawColor(...SLATE_200);
                doc.setLineWidth(0.5);
                doc.line(15, data.cursor.y, pageW - 15, data.cursor.y);
            }
        },
        margin: { left: 15, right: 15 },
    });

    const lastTable = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable;
    const tableEndY = (lastTable?.finalY ?? y) + 12;

    // --- ÖZET KUTUSU (Alt Sağ) ---
    const summaryW = 75;
    const summaryX = pageW - 15 - summaryW;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...SLATE_700);

    let sumY = tableEndY;
    doc.text("Ara Toplam", summaryX, sumY);
    doc.text(amount.toLocaleString("tr-TR", { minimumFractionDigits: 2 }) + " TL", pageW - 15, sumY, { align: "right" });

    sumY += 8;
    doc.text(`KDV (%${kdvRate})`, summaryX, sumY);
    doc.text(kdvAmount.toLocaleString("tr-TR", { minimumFractionDigits: 2 }) + " TL", pageW - 15, sumY, { align: "right" });

    // Kalin Cizgi
    sumY += 6;
    doc.setDrawColor(...SLATE_200);
    doc.setLineWidth(1);
    doc.line(summaryX, sumY, pageW - 15, sumY);

    // Toplam
    sumY += 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...SLATE_900);
    doc.text("GENEL TOPLAM", summaryX, sumY);
    doc.text(totalWithKdv.toLocaleString("tr-TR", { minimumFractionDigits: 2 }) + " TL", pageW - 15, sumY, { align: "right" });

    // --- NOTLAR VE ŞARTLAR (Alt Sol) ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...SLATE_900);
    doc.text("NOTLAR & SARTLAR", 15, tableEndY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...SLATE_500);
    let noteY = tableEndY + 5;
    doc.text("• Odeme, fatura tarihinden itibaren 7 gun icerisinde yapilmalidir.", 15, noteY);
    noteY += 4.5;
    doc.text("• Bu belge proforma ve bilgilendirme amaclidir. Resmi e-fatura sistemden iletilecektir.", 15, noteY);
    noteY += 4.5;
    doc.text("• Sorulariniz icin: info@yalinizlarfilo.com.tr", 15, noteY);

    // --- FOOTER ---
    const footerY = pageH - 22;

    doc.setDrawColor(...SLATE_200);
    doc.setLineWidth(0.5);
    doc.line(15, footerY, pageW - 15, footerY);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...SLATE_900);
    doc.text("YALINIZLAR FILO LTD. STI.", pageW / 2, footerY + 6, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...SLATE_500);
    doc.text("Mersis No: 0933 1145 5090 0001  |  Ticaret Sicil No: 99106", pageW / 2, footerY + 11, { align: "center" });
    doc.text("www.yalinizlarfilo.com.tr", pageW / 2, footerY + 15, { align: "center" });

    // --- KAYDET ---
    const safePlate = vehiclePlate.replace(/\s/g, "_");
    const safeDate = dateStr.replace(/\./g, "-");
    doc.save(`Fatura_${safePlate}_${safeDate}.pdf`);
};
