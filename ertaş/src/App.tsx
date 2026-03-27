import { useState, useMemo } from 'react';
import {
  LayoutDashboard, Car, Users, Wallet, Settings, Plus, Search,
  Bell, Trash2, Edit2, Save, ChevronRight, Briefcase,
  Lock, FileText, X, Archive, RefreshCw,
  Clock, Download, SlidersHorizontal, Tag, AlertTriangle,
  BarChart3, Receipt, UserCheck, Calculator, Printer, Bot
} from 'lucide-react';
import { useVehicles, usePartners, useExpenses, useIncomes, useCustomers, useKasa, useAlacakBorc, useOrtakHareketler, uploadImage, type Vehicle } from './hooks';
import HgsTab from './HgsTab';
import CarDiagram from './CarDiagram';
import KasaTab from './KasaTab';
import AlacakBorcTab from './AlacakBorcTab';
import OrtakCariTab from './OrtakCariTab';
import BilancoTab from './BilancoTab';
import DashboardTab from './DashboardTab';
import ArchiveTab from './ArchiveTab';
import VehicleCariModal from './VehicleCariModal';
import CrmTab from './CrmTab';
import RentalTab from './RentalTab';
import PartnersTab from './PartnersTab';
import FinanceTab from './FinanceTab';
import BotTab from './BotTab';
import AracTaramaTab from './AracTaramaTab';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (v: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(v);
const STATUSES: Vehicle['status'][] = ['Stokta', 'Satıldı', 'Rezerve', 'Serviste', 'Kiralık', 'Kirada'];
const statusStyle: Record<string, string> = {
  Stokta: 'bg-green-500/10 text-green-400 border-green-500/20',
  Satıldı: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Rezerve: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Serviste: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  Kiralık: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  Kirada: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
};

const EMPTY_VEHICLE = {
  brand: '', series: '', year: '', km: '', fuel: '', gear: '', color: '', plate: '', inspection: '',
  purchasePrice: '', expenses: '', expenseNotes: '', salePrice: '', notes: '', expertiseNotes: '', tramerAmount: '',
  status: 'Stokta' as Vehicle['status'],
  purchaseDate: '', soldDate: '',
  sellerName: '', sellerPhone: '', sellerIdNo: '', sellerAddress: '',
  buyerName: '', buyerPhone: '', buyerIdNo: '', buyerAddress: '',
  damageMap: {} as Record<string, string>,
  insuranceCompany: '', insurancePolicyNo: '', insuranceStart: '', insuranceEnd: '',
  renterName: '', renterPhone: '', rentalStart: '', rentalEnd: '', rentalPeriod: '', dailyPrice: '',
  rentalDebt: '', rentalPaymentStatus: '', rentalInvoiceStatus: '', rentalCollected: '',
  purchaseDoc: '', saleDoc: '', rentalDoc: '', saleContractDoc: '',
};

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('Tümü');
  const [showModal, setShowModal] = useState(false);
  const [cariModalVehicle, setCariModalVehicle] = useState<Vehicle | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_VEHICLE });
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [imgPreview, setImgPreview] = useState('');
  const [expFile, setExpFile] = useState<File | null>(null);
  const [expPreview, setExpPreview] = useState('');
  const [purchaseDocFile, setPurchaseDocFile] = useState<File | null>(null);
  const [purchaseDocPreview, setPurchaseDocPreview] = useState('');
  const [saleDocFile, setSaleDocFile] = useState<File | null>(null);
  const [saleDocPreview, setSaleDocPreview] = useState('');
  const [rentalDocFile, setRentalDocFile] = useState<File | null>(null);
  const [rentalDocPreview, setRentalDocPreview] = useState('');
  const [saleContractDocFile, setSaleContractDocFile] = useState<File | null>(null);
  const [saleContractDocPreview, setSaleContractDocPreview] = useState('');
  const [saving, setSaving] = useState(false);

  const [mobileMenu, setMobileMenu] = useState(false);

  const { vehicles, loading, add: addVehicle, update: updateVehicle, remove: removeVehicle } = useVehicles();
  const { partners, updateBalance } = usePartners();
  const { expenses, add: addExpense, remove: removeExpense } = useExpenses();
  const { incomes, add: addIncome, remove: removeIncome } = useIncomes();
  const { customers, add: addCustomer, update: updateCustomer, remove: removeCustomer } = useCustomers();

  // ── Muhasebe Hook'ları (hesap-algoritma) ──
  const { hareketler: kasaHareketler } = useKasa();
  const { kayitlar: alacakKayitlar } = useAlacakBorc();
  const { hareketler: ortakHareketler } = useOrtakHareketler();

  // ── Araç Masraf Kalemleri ──
  // These are now handled within VehicleCariModal, no longer needed directly in App.tsx
  // const { items: vExpItems, add: addVExp, remove: removeVExp, total: vExpTotal } = useVehicleExpenses(editId);
  // const [vExpLabel, setVExpLabel] = useState('');
  // const [vExpAmount, setVExpAmount] = useState('');
  // const addVehicleExpense = async () => {
  //   if (!vExpLabel || !vExpAmount) return;
  //   const amt = parseFloat(vExpAmount);
  //   await addVExp({ label: vExpLabel, amount: amt });
  //   const newTotal = vExpTotal + amt;
  //   setForm(prev => ({ ...prev, expenses: String(newTotal) }));
  //   if (editId) await updateVehicle(editId, { expenses: newTotal });
  //   setVExpLabel(''); setVExpAmount('');
  // };



  // ── Stats ──────────────────────────────────────────────────────────────────
  const combinedIncomes = useMemo(() => {
    const generated = vehicles
      .filter(v => ['Kirada', 'Kiralık'].includes(v.status) && v.rentalPaymentStatus === 'Alındı' && v.dailyPrice && v.dailyPrice > 0)
      .map(v => ({
        id: `rental-${v.id}`,
        label: `Kira Geliri (${v.plate || v.brand}) - ${v.renterName || 'Bilinmiyor'}`,
        amount: v.dailyPrice || 0,
        category: 'Kira Geliri',
        month: v.rentalStart ? v.rentalStart.substring(0, 7) : new Date().toISOString().slice(0, 7),
      }));
    return [...incomes, ...generated];
  }, [vehicles, incomes]);

  const customRemoveIncome = async (id: string) => {
    if (id.startsWith('rental-')) {
      alert('Bu gelir kira modülünden (Tahsilat: Alındı) otomatik eklendiği için buradan silinemez. Kira tablosundan aracı düzenleyerek durumu değiştirebilirsiniz.');
      return;
    }
    await removeIncome(id);
  };

  const stats = useMemo(() => {
    const sold = vehicles.filter(v => v.status === 'Satıldı');
    const inStock = vehicles.filter(v => v.status !== 'Satıldı');
    const stockValue = inStock.reduce((a, v) => a + (v.purchasePrice || 0), 0);
    const grossProfit = sold.reduce((a, v) => a + ((v.salePrice || 0) - (v.purchasePrice || 0) - (v.expenses || 0)), 0);
    const totalExpenses = expenses.reduce((a, e) => a + (e.amount || 0), 0);
    const totalIncomes = combinedIncomes.reduce((a, e) => a + (e.amount || 0), 0);
    const netProfit = grossProfit + totalIncomes - totalExpenses;
    return { sold: sold.length, inStock: inStock.length, stockValue, grossProfit, netProfit, totalExpenses, totalIncomes };
  }, [vehicles, expenses, combinedIncomes]);

  const filtered = useMemo(() => {
    return vehicles
      .filter(v => filterStatus === 'Tümü' ? v.status !== 'Satıldı' : v.status === filterStatus)
      .filter(v => !searchTerm || `${v.brand} ${v.series}`.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => {
        // Öncelik 1: Excel'deki özel (order) sıralamasına göre. 
        if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
        if (a.order !== undefined) return -1;
        if (b.order !== undefined) return 1;
        
        // Düzenlenmemiş veya sonradan eklenmiş yeni araçlar olursa fiyata göre veya createdAt tarihine göre insin
        const pA = a.salePrice || a.purchasePrice || 0;
        const pB = b.salePrice || b.purchasePrice || 0;
        return pB - pA;
      });
  }, [vehicles, filterStatus, searchTerm]);

  // ── Auth ───────────────────────────────────────────────────────────────────
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === 'ertas2026') setIsAuthenticated(true);
    else alert('Şifre hatalı.');
  };

  // ── Vehicle CRUD ───────────────────────────────────────────────────────────
  const openAdd = () => { setEditId(null); setForm({ ...EMPTY_VEHICLE }); setImgFile(null); setImgPreview(''); setExpFile(null); setExpPreview(''); setPurchaseDocFile(null); setPurchaseDocPreview(''); setSaleDocFile(null); setSaleDocPreview(''); setRentalDocFile(null); setRentalDocPreview(''); setSaleContractDocFile(null); setSaleContractDocPreview(''); setShowModal(true); };
  const openEdit = (v: Vehicle) => {
    setEditId(v.id!);
    setForm({
      brand: v.brand, series: v.series, year: `${v.year}`, km: `${v.km}`,
      fuel: v.fuel || '', gear: v.gear || '',
      color: v.color || '', plate: v.plate || '', inspection: v.inspection || '',
      purchasePrice: `${v.purchasePrice}`, expenses: `${v.expenses}`,
      expenseNotes: v.expenseNotes || '',
      salePrice: `${v.salePrice}`, notes: v.notes || '',
      expertiseNotes: v.expertiseNotes || '', tramerAmount: v.tramerAmount ? String(v.tramerAmount) : '0', status: v.status,
      purchaseDate: v.purchaseDate || '', soldDate: v.soldDate || '',
      sellerName: v.sellerName || '', sellerPhone: v.sellerPhone || '',
      sellerIdNo: v.sellerIdNo || '', sellerAddress: v.sellerAddress || '',
      buyerName: v.buyerName || '', buyerPhone: v.buyerPhone || '',
      buyerIdNo: v.buyerIdNo || '', buyerAddress: v.buyerAddress || '',
      damageMap: v.damageMap || {},
      insuranceCompany: v.insuranceCompany || '',
      insurancePolicyNo: v.insurancePolicyNo || '',
      insuranceStart: v.insuranceStart || '',
      insuranceEnd: v.insuranceEnd || '',
      renterName: v.renterName || '',
      renterPhone: v.renterPhone || '',
      rentalStart: v.rentalStart || '',
      rentalEnd: v.rentalEnd || '',
      rentalPeriod: v.rentalPeriod || '',
      dailyPrice: v.dailyPrice ? String(v.dailyPrice) : '',
      rentalDebt: v.rentalDebt ? String(v.rentalDebt) : '',
      rentalCollected: v.rentalCollected ? String(v.rentalCollected) : '',
      rentalPaymentStatus: v.rentalPaymentStatus || '',
      rentalInvoiceStatus: v.rentalInvoiceStatus || '',
      purchaseDoc: v.purchaseDoc || '',
      saleDoc: v.saleDoc || '',
      rentalDoc: v.rentalDoc || '',
      saleContractDoc: v.saleContractDoc || '',
    });
    setImgPreview(v.image || ''); setExpPreview(v.expertiseImage || '');
    setPurchaseDocPreview(v.purchaseDoc || ''); setSaleDocPreview(v.saleDoc || ''); setRentalDocPreview(v.rentalDoc || ''); setSaleContractDocPreview(v.saleContractDoc || '');
    setImgFile(null); setExpFile(null); setPurchaseDocFile(null); setSaleDocFile(null); setRentalDocFile(null); setSaleContractDocFile(null); setShowModal(true);
  };

  const openCari = (v: Vehicle) => {
    setCariModalVehicle(v);
  };

  const handleSave = async () => {
    if (!form.brand) return alert('Marka zorunludur.');
    setSaving(true);
    try {
      let imageUrl = imgPreview;
      let expertiseUrl = expPreview;
      let purchaseDocUrl = purchaseDocPreview;
      let saleDocUrl = saleDocPreview;
      let rentalDocUrl = rentalDocPreview;
      let saleContractDocUrl = saleContractDocPreview;
      if (imgFile) imageUrl = await uploadImage(imgFile, `ertas/vehicles/${Date.now()}_${imgFile.name}`);
      if (expFile) expertiseUrl = await uploadImage(expFile, `ertas/expertise/${Date.now()}_${expFile.name}`);
      if (purchaseDocFile) purchaseDocUrl = await uploadImage(purchaseDocFile, `ertas/docs/purchase_${Date.now()}_${purchaseDocFile.name}`);
      if (saleDocFile) saleDocUrl = await uploadImage(saleDocFile, `ertas/docs/sale_${Date.now()}_${saleDocFile.name}`);
      if (rentalDocFile) rentalDocUrl = await uploadImage(rentalDocFile, `ertas/docs/rental_${Date.now()}_${rentalDocFile.name}`);
      if (rentalDocFile) rentalDocUrl = await uploadImage(rentalDocFile, `ertas/docs/rental_${Date.now()}_${rentalDocFile.name}`);
      if (saleContractDocFile) saleContractDocUrl = await uploadImage(saleContractDocFile, `ertas/docs/sale_contract_${Date.now()}_${saleContractDocFile.name}`);

      const parseTR = (val: any) => {
        if (!val) return 0;
        if (typeof val === 'number') return val;
        return parseFloat(String(val).replace(/\./g, '').replace(/,/g, '.')) || 0;
      };

      const data: Omit<Vehicle, 'id'> = {
        brand: form.brand, series: form.series, model: form.series,
        year: parseInt(form.year) || 0, km: parseTR(form.km),
        fuel: (form as any).fuel || '', gear: (form as any).gear || '',
        color: (form as any).color || '',
        plate: (form as any).plate || '',
        inspection: (form as any).inspection || '',
        purchasePrice: parseTR(form.purchasePrice),
        expenses: parseTR(form.expenses),
        expenseNotes: (form as any).expenseNotes || '',
        salePrice: parseTR(form.salePrice) || parseTR(form.purchasePrice) * 1.15 || 0,
        status: form.status, notes: form.notes,
        expertiseNotes: (form as any).expertiseNotes || '',
        tramerAmount: parseTR((form as any).tramerAmount),
        image: imageUrl, expertiseImage: expertiseUrl,
        purchaseDate: (form as any).purchaseDate || '',
        soldDate: (form as any).soldDate || '',
        sellerName: (form as any).sellerName || '',
        sellerPhone: (form as any).sellerPhone || '',
        sellerIdNo: (form as any).sellerIdNo || '',
        sellerAddress: (form as any).sellerAddress || '',
        buyerName: (form as any).buyerName || '',
        buyerPhone: (form as any).buyerPhone || '',
        buyerIdNo: (form as any).buyerIdNo || '',
        buyerAddress: (form as any).buyerAddress || '',
        damageMap: (form as any).damageMap || {},
        insuranceCompany: (form as any).insuranceCompany || '',
        insurancePolicyNo: (form as any).insurancePolicyNo || '',
        insuranceStart: (form as any).insuranceStart || '',
        insuranceEnd: (form as any).insuranceEnd || '',
        renterName: (form as any).renterName || '',
        renterPhone: (form as any).renterPhone || '',
        rentalStart: (form as any).rentalStart || '',
        rentalEnd: (form as any).rentalEnd || '',
        rentalPeriod: (form as any).rentalPeriod || '',
        dailyPrice: parseTR((form as any).dailyPrice),
        rentalDebt: parseTR((form as any).rentalDebt),
        rentalCollected: parseTR((form as any).rentalCollected),
        rentalPaymentStatus: (form as any).rentalPaymentStatus || '',
        rentalInvoiceStatus: (form as any).rentalInvoiceStatus || '',
        purchaseDoc: purchaseDocUrl,
        saleDoc: saleDocUrl,
        rentalDoc: rentalDocUrl,
        saleContractDoc: saleContractDocUrl,
      };

      if (editId) await updateVehicle(editId, data);
      else await addVehicle(data);
      setShowModal(false);
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Bu aracı silmek istediğinize emin misiniz?')) await removeVehicle(id);
  };



  const exportCSV = () => {
    const rows = [['NO', 'Marka', 'Model', 'Yıl', 'Plaka', 'KM', 'Alış', 'Masraf', 'Maliyet', 'Satış', 'Durum', 'Kâr', 'Kira Durumu']];
    const exportData = vehicles.filter(v => v.status !== 'Satıldı').sort((a,b) => (b.salePrice || b.purchasePrice || 0) - (a.salePrice || a.purchasePrice || 0));
    exportData.forEach((v, i) => {
      const maliyet = (v.purchasePrice || 0) + (v.expenses || 0);
      rows.push([
        `${i + 1}`,
        v.brand || '', v.series || '', `${v.year || ''}`, v.plate || '', `${v.km || ''}`, 
        `${v.purchasePrice || 0}`, `${v.expenses || 0}`, `${maliyet}`, `${v.salePrice || 0}`, 
        v.status || '', `${(v.salePrice || 0) - maliyet}`, v.rentalPaymentStatus || ''
      ]);
    });
    const csv = rows.map(r => r.join(';')).join('\n');
    const a = document.createElement('a'); a.href = `data:text/csv;charset=utf-8,\uFEFF${encodeURIComponent(csv)}`;
    a.download = `ertas-stok-dosyasi-${new Date().toISOString().slice(0,10)}.csv`; a.click();
  };

  // ── Stoktaki araçlar (PDF ve Yazdır için orkestrasyon) ──
  const stokAraclar = useMemo(() => {
    return vehicles
      .filter(v => ['Stokta', 'Rezerve', 'Kirada', 'Kiralık', 'Serviste'].includes(v.status) || v.status !== 'Satıldı')
      .sort((a, b) => {
        if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
        if (a.order !== undefined) return -1;
        if (b.order !== undefined) return 1;

        const pA = a.salePrice || a.purchasePrice || 0;
        const pB = b.salePrice || b.purchasePrice || 0;
        return pB - pA;
      });
  }, [vehicles]);

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    const tr = (s: string) => s
      .replace(/İ/g,'I').replace(/Ş/g,'S').replace(/Ç/g,'C')
      .replace(/Ö/g,'O').replace(/Ü/g,'U').replace(/Ğ/g,'G')
      .replace(/ı/g,'i').replace(/ş/g,'s').replace(/ç/g,'c')
      .replace(/ö/g,'o').replace(/ü/g,'u').replace(/ğ/g,'g');

    const trunc = (s: string, n: number) => {
      const t = tr(s);
      return t.length > n ? t.slice(0, n - 1) + '.' : t;
    };

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(tr('ERTAS OTOMOTIV - ARAC FIYAT LISTESI'), 148.5, 11, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}  |  Stokta: ${stokAraclar.length} arac`, 148.5, 17, { align: 'center' });

    const rows = stokAraclar.map((v, i) => [
      i + 1,
      trunc(`${v.brand} ${v.series}`, 45),
      v.color || '-',
      v.year || '-',
      v.plate || '-',
      v.salePrice ? new Intl.NumberFormat('tr-TR').format(v.salePrice) + ' TL' : '-',
      v.km ? new Intl.NumberFormat('tr-TR').format(v.km) : '-',
      v.inspection || '-',
      trunc(v.expertiseNotes || 'BOYA YOK', 120),
    ]);

    autoTable(doc, {
      head: [['NO', 'MARKA / MODEL', 'R', 'YIL', 'PLAKA', 'FIYAT', 'KM', 'MUAYENE', 'EKSPERTIZ']],
      body: rows,
      startY: 20,
      margin: { left: 6, right: 6 },
      tableWidth: 285,
      styles: {
        fontSize: 6.5,
        cellPadding: { top: 1.2, bottom: 1.2, left: 1.5, right: 1.5 },
        valign: 'middle',
        overflow: 'linebreak',
        lineWidth: 0.15,
        lineColor: [200, 200, 200],
      },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 7,
        cellPadding: { top: 2.5, bottom: 2.5, left: 1.5, right: 1.5 },
      },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: {
        0: { cellWidth: 8,  halign: 'center' },
        1: { cellWidth: 50 },
        2: { cellWidth: 7,  halign: 'center' },
        3: { cellWidth: 10, halign: 'center' },
        4: { cellWidth: 22, halign: 'center' },
        5: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
        6: { cellWidth: 16, halign: 'right' },
        7: { cellWidth: 20, halign: 'center' },
        8: { cellWidth: 126 },
      },
    });

    // Toplam satırı
    const totalSalePrice = stokAraclar.reduce((s, v) => s + (v.salePrice || 0), 0);
    const finalY = (doc as any).lastAutoTable?.finalY || 200;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text(tr(`Toplam Stok Degeri: ${new Intl.NumberFormat('tr-TR').format(totalSalePrice)} TL  |  ${stokAraclar.length} Arac`), 291, finalY + 5, { align: 'right' });

    doc.save(`ertas-arac-fiyatlari-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // ── Tarayıcıdan Yazdır (Reklam Çıktısı) ──
  const printPriceList = () => {
    const w = window.open('', '_blank', 'width=1200,height=800');
    if (!w) return;
    const fmtN = (n: number) => new Intl.NumberFormat('tr-TR').format(n);
    const rowsHtml = stokAraclar.map((v, i) => `
      <tr style="${i % 2 === 0 ? '' : 'background:#f8fafc;'}">
        <td style="text-align:center;font-weight:bold;color:#666">${i + 1}</td>
        <td><strong>${v.brand}</strong> ${v.series}</td>
        <td style="text-align:center">${v.color || '-'}</td>
        <td style="text-align:center">${v.year || '-'}</td>
        <td style="text-align:center;font-family:monospace">${v.plate || '-'}</td>
        <td style="text-align:right;font-weight:bold;color:#1e40af">${v.salePrice ? fmtN(v.salePrice) + ' TL' : '-'}</td>
        <td style="text-align:right">${v.km ? fmtN(v.km) : '-'}</td>
        <td style="text-align:center;font-size:10px">${v.inspection || '-'}</td>
        <td style="font-size:10px;color:#333">${v.expertiseNotes || 'BOYA YOK'}</td>
      </tr>
    `).join('');

    w.document.write(`<!DOCTYPE html><html><head><title>ERTAŞ OTOMOTİV - ARAÇ FİYAT LİSTESİ</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Segoe UI', Arial, sans-serif; padding: 12mm 8mm; color: #1e293b; }
      @media print { body { padding: 4mm; } .no-print { display: none !important; } @page { size: A4 landscape; margin: 6mm; } }
      h1 { font-size: 16px; text-align: center; margin-bottom: 2px; letter-spacing: 1px; }
      .subtitle { text-align: center; font-size: 11px; color: #64748b; margin-bottom: 10px; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; }
      th { background: #1e293b; color: white; padding: 6px 5px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
      td { padding: 4px 5px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
      tr:hover { background: #f1f5f9 !important; }
      .footer { text-align: right; margin-top: 8px; font-size: 10px; color: #64748b; font-weight: bold; }
      .print-btn { position: fixed; top: 10px; right: 10px; background: #1e40af; color: white; border: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 12px rgba(30,64,175,0.3); }
      .print-btn:hover { background: #1d4ed8; }
    </style></head><body>
    <button class="print-btn no-print" onclick="window.print()">🖨️ YAZDIR</button>
    <h1>ERTAŞ OTOMOTİV — ARAÇ FİYAT LİSTESİ</h1>
    <div class="subtitle">Tarih: ${new Date().toLocaleDateString('tr-TR')} &nbsp;|&nbsp; Stokta: ${stokAraclar.length} Araç</div>
    <table>
      <thead><tr>
        <th style="width:25px;text-align:center">NO</th>
        <th>MARKA / MODEL</th>
        <th style="width:25px;text-align:center">R</th>
        <th style="width:35px;text-align:center">YIL</th>
        <th style="width:80px;text-align:center">PLAKA</th>
        <th style="width:90px;text-align:right">FİYAT</th>
        <th style="width:60px;text-align:right">KM</th>
        <th style="width:70px;text-align:center">MUAYENE</th>
        <th>EKSPERTİZ</th>
      </tr></thead>
      <tbody>${rowsHtml}</tbody>
    </table>
    <div class="footer">Toplam Stok Değeri: ${fmtN(stokAraclar.reduce((s, v) => s + (v.salePrice || 0), 0))} TL &nbsp;|&nbsp; ${stokAraclar.length} Araç</div>
    </body></html>`);
    w.document.close();
  };

  // ── Göğüs Ekspertiz Tanıtım Çıktısı (A4 Araç İçi Kart) ──
  const printAdCards = () => {
    const w = window.open('', '_blank', 'width=1000,height=1100');
    if (!w) return;
    const fmtN = (n: number) => new Intl.NumberFormat('tr-TR').format(n);
    const stokAraclar = vehicles.filter(v => v.status === 'Stokta');
    const cardsHtml = stokAraclar.map(v => `
      <div class="card">
        <div class="card-inner">
          
          <!-- Üst Başlık (Firma Logosu ve Adı) -->
          <div class="header">
            <div class="logo-box">
              <span class="brand-name">ERTAŞ</span>
              <span class="sub-name">OTOMOTİV</span>
            </div>
            <div class="filo-name">YALINIZLAR FİLO</div>
          </div>

          <!-- Araç Ana Başlığı -->
          <div class="title-section">
            <h1 class="vehicle-brand">${v.brand || 'MARKA GİRİLMEDİ'}</h1>
            <h2 class="vehicle-series">${v.series || ''}</h2>
          </div>

          <!-- Araç Temel Özellikleri -->
          <div class="specs-grid">
            <div class="spec-item">
              <span class="spec-label">MODEL YILI</span>
              <span class="spec-value">${v.year || '-'}</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">KİLOMETRE</span>
              <span class="spec-value">${v.km ? fmtN(v.km) + ' KM' : '-'}</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">YAKIT</span>
              <span class="spec-value">${v.fuel || '-'}</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">VİTES</span>
              <span class="spec-value">${v.gear || '-'}</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">PLAKA</span>
              <span class="spec-value tag-style">${v.plate || '-'}</span>
            </div>
          </div>

          <!-- Ekspertiz Durumu -->
          <div class="expertise-section">
            <div class="section-title">EKSPERTİZ DURUMU</div>
            <div class="expertise-content">
              <div class="expertise-image-area">
                ${v.expertiseImage 
                  ? `<img src="${v.expertiseImage}" alt="Ekspertiz Görseli" />` 
                  : `<div class="no-image">Ekspertiz Şeması Belirtilmemiş</div>`
                }
              </div>
              <div class="expertise-details">
                <div class="detail-box">
                  <div class="detail-label">TRAMER (HASAR) KAYDI</div>
                  <div class="detail-value tramer-value">
                    ${v.tramerAmount ? fmtN(Number(v.tramerAmount)) + ' TL' : (v.expertiseNotes?.toLowerCase().includes('yok') ? 'YOKTUR' : 'YOKTUR')}
                  </div>
                </div>
                <div class="detail-box">
                  <div class="detail-label">MUAYENE GEÇERLİLİK</div>
                  <div class="detail-value">${v.inspection || '-'}</div>
                </div>
                <div class="detail-box full-width">
                  <div class="detail-label">EKSPERTİZ ÖZETİ & NOTLAR</div>
                  <div class="detail-value notes-value">
                    ${v.expertiseNotes || 'Boya, değişen bulunmamaktadır. Araç orijinalliğini korumaktadır.'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Garanti Banner -->
          <div class="warranty-banner">
            <div class="warranty-item">🛡️ EKSPERTİZ GARANTİSİ</div>
            <div class="divider"></div>
            <div class="warranty-item">💯 ORİJİNAL KM</div>
            <div class="divider"></div>
            <div class="warranty-item">🤝 GERİ ALIM GARANTİSİ</div>
            <div class="divider"></div>
            <div class="warranty-item">💳 ANINDA KREDİ</div>
          </div>

        </div>
      </div>
    `).join('');

    w.document.write(`<!DOCTYPE html><html><head><title>ERTAŞ - Göğüs Tanıtım Kartları</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;900&display=swap');
      
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Montserrat', sans-serif; background: #cbd5e1; }
      
      @media print {
        body { background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .no-print { display: none !important; }
        .card { page-break-after: always; box-shadow: none !important; margin: 0 !important; width: 100% !important; height: 100vh !important; }
        .card:last-child { page-break-after: auto; }
        @page { size: A4 portrait; margin: 0; }
      }
      
      @media screen {
        body { padding: 40px; }
        .card { width: 210mm; min-height: 297mm; margin: 0 auto 40px; background: white; box-shadow: 0 20px 60px rgba(0,0,0,0.15); border-radius: 8px; overflow: hidden; }
      }

      .card-inner { padding: 40px; display: flex; flex-direction: column; height: 100%; border: 15px solid #0a192f; m-border: 10px; }
      
      .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 4px solid #cc0000; padding-bottom: 20px; margin-bottom: 30px; }
      .logo-box { display: flex; align-items: stretch; height: 60px; }
      .brand-name { background: #cc0000; color: white; font-weight: 900; font-size: 38px; padding: 0 20px; display: flex; align-items: center; }
      .sub-name { background: #0a192f; color: white; font-weight: 900; font-size: 38px; padding: 0 20px; display: flex; align-items: center; }
      .filo-name { font-weight: 900; font-size: 32px; color: #0a192f; padding: 10px 20px; border: 3px solid #0a192f; border-radius: 12px; }

      .title-section { text-align: center; margin-bottom: 30px; background: #f8fafc; padding: 30px; border-radius: 16px; border: 1px solid #e2e8f0; }
      .vehicle-brand { font-size: 56px; font-weight: 900; color: #0a192f; text-transform: uppercase; letter-spacing: -1px; line-height: 1; margin-bottom: 10px; }
      .vehicle-series { font-size: 28px; font-weight: 700; color: #64748b; }

      .specs-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 30px; }
      .spec-item { background: white; border: 2px solid #e2e8f0; border-radius: 12px; padding: 15px 20px; display: flex; align-items: center; justify-content: space-between; }
      .spec-item:last-child { grid-column: span 2; }
      .spec-label { font-size: 14px; font-weight: 700; color: #94a3b8; letter-spacing: 1px; }
      .spec-value { font-size: 24px; font-weight: 900; color: #0a192f; }
      .tag-style { background: #0a192f; color: white; padding: 5px 15px; border-radius: 8px; font-size: 28px; letter-spacing: 2px; }

      .expertise-section { flex-grow: 1; border: 3px solid #0a192f; border-radius: 16px; overflow: hidden; display: flex; flex-direction: column; }
      .section-title { background: #0a192f; color: white; text-align: center; font-weight: 900; font-size: 24px; padding: 15px; letter-spacing: 2px; }
      .expertise-content { display: flex; flex-direction: column; padding: 20px; flex-grow: 1; gap: 20px; }
      
      .expertise-image-area { flex-grow: 1; min-height: 250px; flex-shrink: 0; border: 2px dashed #cbd5e1; border-radius: 12px; display: flex; align-items: center; justify-content: center; overflow: hidden; padding: 10px; background: #f8fafc; }
      .expertise-image-area img { width: 100%; height: 100%; object-fit: contain; }
      .no-image { color: #94a3b8; font-weight: 700; font-size: 18px; }

      .expertise-details { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
      .detail-box { background: white; border: 2px solid #e2e8f0; border-radius: 12px; padding: 15px; text-align: center; }
      .detail-box.full-width { grid-column: span 2; background: #fff1f2; border-color: #fecdd3; }
      .detail-label { font-size: 11px; font-weight: 700; color: #64748b; margin-bottom: 5px; letter-spacing: 1px; }
      .detail-value { font-size: 18px; font-weight: 900; color: #0a192f; }
      .tramer-value { color: #e11d48; font-size: 24px; }
      .notes-value { color: #881337; font-size: 16px; font-weight: 700; }

      .warranty-banner { margin-top: 30px; background: #0a192f; border-radius: 12px; padding: 20px; display: flex; justify-content: space-around; align-items: center; color: white; }
      .warranty-item { font-weight: 700; font-size: 14px; letter-spacing: 1px; }
      .divider { width: 2px; height: 20px; background: rgba(255,255,255,0.2); }

      .print-btn {
        position: fixed; top: 20px; right: 20px; z-index: 100;
        background: linear-gradient(135deg, #059669, #047857); color: white; border: none;
        padding: 16px 36px; border-radius: 12px; font-size: 16px; font-weight: 800;
        cursor: pointer; box-shadow: 0 6px 20px rgba(5,150,105,0.4);
      }
      .print-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(5,150,105,0.5); }
      .card { font-family: Arial, sans-serif; }
    </style></head><body>
    <button class="print-btn no-print" onclick="window.print()">🖨️ REKLAM KARTLARINI YAZDIR (A4)</button>
    ${cardsHtml}
    </body></html>`);
    w.document.close();
  };

  // ── Sidebar ────────────────────────────────────────────────────────────────
  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Panel' },
    { id: 'inventory', icon: Car, label: 'Araç Stoğu' },
    { id: 'archive', icon: Archive, label: 'Arşiv (Satılanlar)' },
    { id: 'prices', icon: Tag, label: 'Araç Fiyatları' },
    { id: 'rental', icon: Car, label: 'Kiralık Stoğu' },
    { id: 'finance', icon: Wallet, label: 'Finans & Gider' },
    { id: 'kasa', icon: Calculator, label: 'Kasa' },
    { id: 'alacak', icon: Receipt, label: 'Alacak-Borç' },
    { id: 'ortakcari', icon: UserCheck, label: 'Ortak Cari' },
    { id: 'bilanco', icon: BarChart3, label: 'Bilanço' },
    { id: 'hgs', icon: AlertTriangle, label: 'HGS Sorgulama' },
    { id: 'partners', icon: Briefcase, label: 'Ortaklar' },
    { id: 'crm', icon: Users, label: 'Müşteri (CRM)' },
    { id: 'tarama', icon: Search, label: 'Araç Tarama' },
    { id: 'bot', icon: Bot, label: 'Araç Bot' },
    { id: 'settings', icon: Settings, label: 'Ayarlar' },
  ];

  const SidebarItem = ({ id, icon: Icon, label }: any) => (
    <button onClick={() => { setActiveTab(id); setMobileMenu(false); }}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${activeTab === id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
      <Icon size={20} /><span className="font-medium">{label}</span>
    </button>
  );

  // ── Login Screen ───────────────────────────────────────────────────────────
  if (!isAuthenticated) return (
    <div className="flex h-screen bg-slate-950 text-slate-100 items-center justify-center font-sans p-4">
      <div className="w-full max-w-sm p-8 bg-slate-900/80 backdrop-blur-md rounded-3xl border border-slate-800 shadow-2xl">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center font-bold text-3xl italic shadow-blue-500/30 shadow-xl mb-4">E</div>
          <h1 className="text-2xl font-bold tracking-tight">ERTAŞ Otomotiv</h1>
          <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mt-2">Yönetici Paneli</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-5">
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)}
              placeholder="Yönetici Şifresi"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all" />
          </div>
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 font-bold py-3.5 rounded-xl transition-all flex justify-center items-center gap-2">
            Sisteme Giriş Yap <ChevronRight size={18} />
          </button>
        </form>
      </div>
    </div>
  );

  // ── Main App ───────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Mobile menu overlay */}
      {mobileMenu && <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setMobileMenu(false)} />}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 border-r border-slate-800 bg-slate-900/80 backdrop-blur-md p-6 flex flex-col gap-6 transition-transform duration-300 ${mobileMenu ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-xl italic shadow-blue-500/20 shadow-xl">E</div>
          <div><h1 className="text-lg font-bold tracking-tight">ERTAŞ</h1><p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Otomotiv</p></div>
        </div>
        <nav className="flex flex-col gap-1.5">{navItems.map(n => <SidebarItem key={n.id} {...n} />)}</nav>
        <div className="mt-auto bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
          <div className="flex items-center gap-2 mb-1"><div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /><span className="text-xs font-medium text-slate-400">Firebase Bağlı</span></div>
          <p className="text-[10px] text-slate-500">Tüm veriler buluta kaydediliyor</p>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-4 md:px-8 bg-slate-900/30 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileMenu(true)} className="lg:hidden p-2 hover:bg-slate-800 rounded-lg"><SlidersHorizontal size={20} /></button>
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Araç ara..."
                className="bg-slate-800/80 border border-slate-700 rounded-xl py-2 pl-10 pr-4 text-sm w-48 md:w-72 focus:outline-none focus:ring-2 focus:ring-blue-600/50" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button title="Sistemi Yenile" onClick={() => window.location.reload()} className="p-2 hover:bg-blue-600/20 text-blue-400 hover:text-blue-300 rounded-xl flex items-center gap-2 font-bold text-sm bg-blue-500/10 border border-blue-500/20 transition-all">
              <RefreshCw size={16} className="active:animate-spin" /> Yenile
            </button>
            <button className="p-2 hover:bg-slate-800 rounded-xl relative"><Bell size={20} /><span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full" /></button>
            <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-sm">E</div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">

          {/* ── DASHBOARD ── */}
          {activeTab === 'dashboard' && <DashboardTab vehicles={vehicles} partners={partners} expenses={expenses} incomes={combinedIncomes} loading={loading} onEditVehicle={openEdit} />}

          {/* ── INVENTORY ── */}
          {activeTab === 'inventory' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div><h2 className="text-2xl md:text-3xl font-bold">Araç Envanteri</h2><p className="text-slate-400 text-sm mt-1">Stoktaki araçları yönetin.</p></div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={printAdCards} className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-amber-500/20 transition-all"><Printer size={16} /> Reklam Çıktısı</button>
                  <button onClick={printPriceList} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 px-3 py-2 rounded-xl text-xs font-bold transition-colors"><FileText size={16} /> Genel Liste</button>
                  <button onClick={exportPDF} className="flex items-center gap-2 bg-red-600 hover:bg-red-500 px-3 py-2 rounded-xl text-xs font-bold transition-colors"><Download size={16} /> PDF</button>
                  <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 transition-all"><Plus size={18} /> Yeni Araç</button>
                </div>
              </div>
              {/* filter tabs */}
              <div className="flex gap-2 flex-wrap">
                {['Tümü', ...STATUSES].map(s => (
                  <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${filterStatus === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-800/50 text-slate-400 border-slate-700 hover:border-slate-600'}`}>{s}</button>
                ))}
              </div>
              {loading ? <div className="flex items-center justify-center h-48 text-slate-500">Yükleniyor...</div> : (
                <div className="overflow-x-auto rounded-2xl border border-slate-800">
                  <table className="w-full text-left min-w-[700px]">
                    <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wider">
                      <tr>{['NO', 'Araç', 'Plaka', 'Yıl', 'Giriş Tarihi', 'Sigorta Bitiş', 'Alış', 'Masraf', 'Maliyet', ...(filterStatus === 'Satıldı' ? ['Satış', 'Kâr'] : []), 'Durum', ''].map(h => <th key={h} className="px-3 py-3 font-semibold">{h}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {filtered.map((v, idx) => {
                        const profit = (v.salePrice || 0) - (v.purchasePrice || 0) - (v.expenses || 0);
                        return (
                          <tr key={v.id} className="hover:bg-slate-800/30 transition-colors group">
                            <td className="px-3 py-3 text-center">
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 font-black text-xs">{idx + 1}</span>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-3">
                                <img src={v.image || 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&q=80&w=100'} className="w-12 h-10 rounded-xl object-cover bg-slate-800 shrink-0" alt={v.brand} />
                                <div><p className="font-bold text-sm">{v.brand}</p><p className="text-xs text-slate-400">{v.series}</p></div>
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <span className="font-mono text-xs bg-slate-800 border border-slate-700 px-2 py-1 rounded whitespace-nowrap">{v.plate || '—'}</span>
                            </td>
                            <td className="px-3 py-3 text-xs text-slate-300 font-mono">{v.year || '—'}</td>
                            <td className="px-3 py-3 text-xs text-slate-400 whitespace-nowrap">
                              {v.purchaseDate || '—'}
                            </td>
                            <td className="px-3 py-3 text-xs font-mono text-orange-400 whitespace-nowrap">
                              {v.insuranceEnd ? new Date(v.insuranceEnd).toLocaleDateString('tr-TR') : '—'}
                            </td>
                            <td className="px-3 py-3 text-sm">{fmt(v.purchasePrice || 0)}</td>
                            <td className="px-3 py-3 text-sm text-red-400">{fmt(v.expenses || 0)}</td>
                            <td className="px-3 py-3 text-sm font-bold text-amber-400">{fmt((v.purchasePrice || 0) + (v.expenses || 0))}</td>
                            {filterStatus === 'Satıldı' && (
                              <>
                                <td className="px-3 py-3 text-sm font-bold text-blue-400">{fmt(v.salePrice || 0)}</td>
                                <td className={`px-3 py-3 text-sm font-bold ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmt(profit)}</td>
                              </>
                            )}
                            <td className="px-3 py-3">
                              <select value={v.status} onChange={e => {
                                const yeniDurum = e.target.value as Vehicle['status'];
                                if (yeniDurum === 'Satıldı') {
                                  const satisFiyati = prompt(`${v.brand} ${v.series} satış fiyatını girin (₺):`);
                                  if (satisFiyati === null) return;
                                  const fiyat = parseFloat(satisFiyati);
                                  if (isNaN(fiyat) || fiyat <= 0) { alert('Geçerli bir fiyat girin!'); return; }
                                  updateVehicle(v.id!, { status: yeniDurum, salePrice: fiyat, soldDate: new Date().toISOString().slice(0, 10) });
                                } else {
                                  updateVehicle(v.id!, { status: yeniDurum });
                                }
                              }}
                                className={`text-[10px] font-bold px-2 py-1 rounded-lg border bg-transparent cursor-pointer ${statusStyle[v.status]}`}>
                                {STATUSES.map(s => <option key={s} value={s} className="bg-slate-900 text-white">{s}</option>)}
                              </select>
                            </td>
                            <td className="px-3 py-3 text-right">
                              <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={(e) => { e.stopPropagation(); openCari(v); }} className="p-1 px-2 hover:bg-amber-500/20 rounded-lg text-amber-500/80 hover:text-amber-400 font-bold text-xs flex items-center gap-1 transition-colors">
                                  <Receipt size={14} /> Cari
                                </button>
                                <button onClick={() => openEdit(v)} className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white"><Edit2 size={14} /></button>
                                <button onClick={() => handleDelete(v.id!)} className="p-1.5 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-400"><Trash2 size={14} /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {filtered.length === 0 && <div className="text-center py-12 text-slate-500">Araç bulunamadı.</div>}
                </div>
              )}
            </div>
          )}

          {/* ── ARCHIVE ── */}
          {activeTab === 'archive' && <ArchiveTab vehicles={vehicles} openEdit={openEdit} openCari={openCari} />}

          {/* ── PRICES TABLE (ORKESTRASYONlu) ── */}
          {activeTab === 'prices' && (
            <div className="space-y-4 animate-in fade-in duration-500">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold">Araç Fiyat Listesi</h2>
                  <p className="text-slate-400 mt-1 text-sm">🔄 Araç Stoğu ile orkestrasyon — fiyatları buradan düzenleyin, her iki sekmede anında yansır</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={printAdCards} className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 px-4 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-amber-500/20 transition-all">
                    <Printer size={18} /> Reklam Çıktısı
                  </button>
                  <button onClick={printPriceList} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 px-3 py-2 rounded-xl text-xs font-bold transition-colors shadow-md shadow-emerald-500/20">
                    <FileText size={16} /> Genel Liste
                  </button>
                  <button onClick={exportPDF} className="flex items-center gap-2 bg-red-600 hover:bg-red-500 px-3 py-2 rounded-xl text-xs font-bold transition-colors">
                    <Download size={16} /> PDF
                  </button>
                  <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 transition-all">
                    <Plus size={18} /> Yeni Araç
                  </button>
                </div>
              </div>

              {/* Özet Kartlar */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-4">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Stok Değeri</p>
                  <p className="text-xl font-bold text-blue-400 mt-1">{fmt(vehicles.filter(v => v.status !== 'Satıldı').reduce((s, v) => s + (v.purchasePrice || 0) + (v.expenses || 0), 0))}</p>
                  <p className="text-[10px] text-slate-600">{vehicles.filter(v => v.status !== 'Satıldı').length} araç stokta</p>
                </div>
                <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-4">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Satış Toplam</p>
                  <p className="text-xl font-bold text-emerald-400 mt-1">{fmt(vehicles.filter(v => v.status === 'Satıldı').reduce((s, v) => s + (v.salePrice || 0), 0))}</p>
                  <p className="text-[10px] text-slate-600">{vehicles.filter(v => v.status === 'Satıldı').length} araç satıldı</p>
                </div>
                <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-4">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Toplam Kâr</p>
                  <p className="text-xl font-bold text-amber-400 mt-1">{fmt(vehicles.filter(v => v.status === 'Satıldı').reduce((s, v) => s + ((v.salePrice || 0) - (v.purchasePrice || 0) - (v.expenses || 0)), 0))}</p>
                  <p className="text-[10px] text-slate-600">Satılan araçlardan</p>
                </div>
                <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-4">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Toplam Araç</p>
                  <p className="text-xl font-bold text-white mt-1">{vehicles.length}</p>
                  <p className="text-[10px] text-slate-600">Tüm kayıtlar</p>
                </div>
              </div>

              {/* Durum Filtre */}
              <div className="flex gap-2 flex-wrap">
                {['Tümü', ...STATUSES].map(s => (
                  <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${filterStatus === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-800/50 text-slate-400 border-slate-700 hover:border-slate-600'}`}>{s}</button>
                ))}
              </div>

              {loading ? (
                <div className="flex items-center justify-center h-48 text-slate-500">Yükleniyor...</div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-800">
                  <table className="w-full text-left text-sm" style={{ minWidth: 1100 }}>
                    <thead className="bg-slate-800 text-slate-400 text-[11px] uppercase tracking-wider sticky top-0">
                      <tr>
                        <th className="px-3 py-3 font-bold w-8">NO</th>
                        <th className="px-3 py-3 font-bold">MARKA / MODEL</th>
                        <th className="px-3 py-3 font-bold w-10">R</th>
                        <th className="px-3 py-3 font-bold w-14">YIL</th>
                        <th className="px-3 py-3 font-bold">PLAKA</th>
                        <th className="px-3 py-3 font-bold">SATIŞ FİYATI ₺</th>
                        <th className="px-3 py-3 font-bold">KM</th>
                        <th className="px-3 py-3 font-bold">DURUM</th>
                        <th className="px-3 py-3 font-bold">EKSPERTİZ</th>
                        <th className="px-3 py-3 w-16"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {filtered.map((v, idx) => {
                        return (
                        <tr key={v.id} className={`hover:bg-slate-800/40 transition-colors group ${idx % 2 === 0 ? 'bg-slate-900/30' : ''}`}>
                          <td className="px-3 py-2.5 text-center">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-slate-800 border border-slate-700 text-slate-300 font-black text-[10px]">{idx + 1}</span>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="font-bold text-xs leading-tight">{v.brand}</div>
                            <div className="text-slate-400 text-[10px]">{v.series}</div>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-md text-[10px] font-black bg-slate-700 border border-slate-600">
                              {v.color || '-'}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-slate-300 text-xs font-mono">{v.year || '-'}</td>
                          <td className="px-3 py-2.5">
                            <span className="font-mono text-xs bg-slate-800 border border-slate-700 px-2 py-0.5 rounded">
                              {v.plate || '-'}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            {(v.status === 'Kiralık' || v.status === 'Kirada') ? (
                              <div className="text-right flex flex-col gap-0.5">
                                {v.dailyPrice ? <div className="text-xs font-bold text-teal-400">{fmt(v.dailyPrice)} <span className="text-[9px] text-teal-500/70 font-normal">/ Kira</span></div> : <div className="text-[10px] text-slate-500">Ücret Girilmedi</div>}
                                {v.rentalCollected ? <div className="text-[10px] font-bold text-emerald-400">+{fmt(v.rentalCollected)} <span className="text-[9px] text-emerald-500/70 font-normal">/ Tahsil</span></div> : null}
                              </div>
                            ) : (
                              <input
                                type="text"
                                defaultValue={v.salePrice ? new Intl.NumberFormat('tr-TR').format(v.salePrice) + ' TL' : ''}
                                placeholder="Fiyat gir..."
                                onFocus={e => {
                                  e.target.value = v.salePrice ? String(v.salePrice) : '';
                                  e.target.type = 'number';
                                }}
                                onBlur={e => {
                                  const val = parseFloat(e.target.value);
                                  e.target.type = 'text';
                                  if (val && val !== v.salePrice) {
                                    updateVehicle(v.id!, { salePrice: val });
                                    e.target.value = new Intl.NumberFormat('tr-TR').format(val) + ' TL';
                                  } else {
                                    e.target.value = v.salePrice ? new Intl.NumberFormat('tr-TR').format(v.salePrice) + ' TL' : '';
                                  }
                                }}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                                }}
                                className="w-32 bg-blue-500/10 border border-blue-500/30 rounded-lg px-2 py-1 text-xs font-bold text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-right"
                              />
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-slate-300 text-xs whitespace-nowrap">
                            {v.km ? `${v.km.toLocaleString('tr-TR')}` : '-'}
                          </td>
                          <td className="px-3 py-2.5">
                            <select value={v.status} onChange={e => {
                              const yeniDurum = e.target.value as Vehicle['status'];
                              if (yeniDurum === 'Satıldı') {
                                const satisFiyati = prompt(`${v.brand} ${v.series} satış fiyatını girin (₺):`);
                                if (satisFiyati === null) return;
                                const fiyat = parseFloat(satisFiyati);
                                if (isNaN(fiyat) || fiyat <= 0) { alert('Geçerli bir fiyat girin!'); return; }
                                updateVehicle(v.id!, { status: yeniDurum, salePrice: fiyat, soldDate: new Date().toISOString().slice(0, 10) });
                              } else {
                                updateVehicle(v.id!, { status: yeniDurum });
                              }
                            }}
                              className={`text-[10px] font-bold px-2 py-1 rounded-lg border bg-transparent cursor-pointer ${statusStyle[v.status]}`}>
                              {STATUSES.map(s => <option key={s} value={s} className="bg-slate-900 text-white">{s}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="text-[10px] text-slate-400 leading-tight line-clamp-2">
                              {v.expertiseNotes || 'BOYA YOK'}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => openEdit(v)} className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white"><Edit2 size={13} /></button>
                              <button onClick={() => handleDelete(v.id!)} className="p-1.5 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-400"><Trash2 size={13} /></button>
                            </div>
                          </td>
                        </tr>
                        );
                      })}
                      {filtered.length === 0 && (
                        <tr><td colSpan={13} className="text-center py-12 text-slate-500">Araç bulunamadı.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── FINANCE & EXPENSES ── */}
          {activeTab === 'finance' && <FinanceTab expenses={expenses} addExpense={addExpense} removeExpense={removeExpense} incomes={combinedIncomes} addIncome={addIncome} removeIncome={customRemoveIncome} grossProfit={stats.grossProfit} totalExpenses={stats.totalExpenses} totalIncomes={stats.totalIncomes} netProfit={stats.netProfit} />}

          {/* ── PARTNERS ── */}
          {activeTab === 'partners' && <PartnersTab partners={partners} updateBalance={updateBalance} netProfit={stats.netProfit} />}

          {/* ── RENTAL ── */}
          {activeTab === 'rental' && <RentalTab vehicles={vehicles} updateVehicle={updateVehicle} openEdit={openEdit} openCari={openCari}
            onTahsilat={async (vehicle, tutar) => {
              await addIncome({
                label: `Kira Geliri (${vehicle.plate || vehicle.brand})`,
                amount: tutar,
                category: 'Kira Geliri',
                month: new Date().toISOString().slice(0, 7),
              });
            }}
          />}

          {/* ── CRM ── */}
          {activeTab === 'crm' && <CrmTab customers={customers} addCustomer={addCustomer} updateCustomer={updateCustomer} removeCustomer={removeCustomer} />}


          {/* ── KASA ── */}
          {activeTab === 'kasa' && <KasaTab />}

          {/* ── ALACAK-BORÇ ── */}
          {activeTab === 'alacak' && <AlacakBorcTab />}

          {/* ── ORTAK CARİ ── */}
          {activeTab === 'ortakcari' && <OrtakCariTab />}

          {/* ── BİLANÇO ── */}
          {activeTab === 'bilanco' && <BilancoTab vehicles={vehicles} kasaHareketler={kasaHareketler} alacakKayitlar={alacakKayitlar} ortakHareketler={ortakHareketler} />}

          {/* ── HGS ── */}
          {activeTab === 'hgs' && <HgsTab vehicles={vehicles} />}

          {/* ── ARAÇ TARAMA ── */}
          {activeTab === 'tarama' && <AracTaramaTab />}

          {/* ── ARAÇ BOT ── */}
          {activeTab === 'bot' && <BotTab />}

          {/* ── SETTINGS ── */}
          {activeTab === 'settings' && ((
            <div className="space-y-8 animate-in fade-in duration-500">
              <h2 className="text-3xl font-bold">Sistem Ayarları</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-800">
                  <h3 className="font-bold text-lg mb-4">Şirket Profili</h3>
                  <div className="space-y-4">
                    <div><label className="text-xs text-slate-500">Şirket Adı</label><input type="text" className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 mt-1 text-sm" defaultValue="Ertaş Otomotiv" /></div>
                    <div><label className="text-xs text-slate-500">Vergi No</label><input type="text" className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 mt-1 text-sm" defaultValue="1234567890" /></div>
                    <div><label className="text-xs text-slate-500">Şifre Değiştir</label><input type="password" placeholder="Yeni şifre" className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 mt-1 text-sm" /></div>
                  </div>
                  <button className="mt-4 px-4 py-2.5 bg-blue-600 rounded-xl text-sm font-bold w-full">Kaydet</button>
                </div>
                <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-800">
                  <h3 className="font-bold text-lg mb-4">Entegrasyonlar</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-700"><span className="text-sm font-bold">Firebase Firestore</span><span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded font-bold">Bağlı ✓</span></div>
                    <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-700"><span className="text-sm font-bold">TÜRMOB (VKN)</span><span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded font-bold">Aktif</span></div>
                    <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-700"><span className="text-sm font-bold">Sahibinden.com</span><span className="text-xs bg-slate-700 text-slate-400 px-2 py-1 rounded font-bold cursor-pointer hover:bg-slate-600">Bağla</span></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </main>
      </div>

      {/* ── VEHICLE MODAL ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center sticky top-0 bg-slate-900 z-10">
              <h2 className="text-xl font-bold">{editId ? 'Aracı Düzenle' : 'Yeni Araç Ekle'}</h2>
              <button onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            {/* ── ARAÇ MALİYET ÖZETİ ── */}
            <div className="p-6 bg-slate-800/30 border-b border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">💳 Araç Maliyet Analizi</h3>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-700/50">
                  <p className="text-[10px] uppercase text-slate-500 font-bold mb-1">Araç Alış Fiyatı</p>
                  <p className="text-xl font-bold text-slate-200">{fmt(Number((form as any).purchasePrice) || 0)}</p>
                </div>
                <div className="bg-red-500/5 p-4 rounded-2xl border border-red-500/20">
                  <p className="text-[10px] uppercase text-red-500/70 font-bold mb-1">Toplam Masraf</p>
                  <p className="text-xl font-bold text-red-400">+{fmt((Number((form as any).expenses) || 0))}</p>
                </div>
                <div className="bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/20">
                  {(() => {
                    const maliyet = (Number((form as any).purchasePrice) || 0) + (Number((form as any).expenses) || 0);
                    return (
                      <>
                        <p className="text-[10px] uppercase font-bold mb-1 text-emerald-500/70">Toplam Maliyet</p>
                        <p className="text-2xl font-bold text-emerald-400">{fmt(maliyet)}</p>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>

            <div className="p-6 grid grid-cols-2 gap-4">
              {[
                { label: 'Marka *', key: 'brand', type: 'text', placeholder: 'Toyota' },
                { label: 'Seri / Model', key: 'series', type: 'text', placeholder: 'Hilux 4X2 Adventure' },
                { label: 'Yıl', key: 'year', type: 'number', placeholder: '2022' },
                { label: 'KM', key: 'km', type: 'number', placeholder: '172000' },
              ].map(f => (
                <div key={f.key} className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">{f.label}</label>
                  <input type={f.type} placeholder={f.placeholder} value={(form as any)[f.key]}
                    onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/50" />
                </div>
              ))}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Yakıt Tipi</label>
                <select value={(form as any).fuel || ''} onChange={e => setForm(prev => ({ ...prev, fuel: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/50">
                  <option value="">Seçiniz...</option>
                  {['Dizel', 'Benzin', 'Benzin & LPG', 'Hybrid', 'Elektrik'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Vites Tipi</label>
                <select value={(form as any).gear || ''} onChange={e => setForm(prev => ({ ...prev, gear: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/50">
                  <option value="">Seçiniz...</option>
                  {['Otomatik', 'Manuel', 'Yarı Otomatik'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              {[
                { label: 'Renk Kodu', key: 'color', type: 'text', placeholder: 'B / G / S / M' },
                { label: 'Plaka', key: 'plate', type: 'text', placeholder: '09-AGR-986' },
                { label: 'Muayene Tarihi', key: 'inspection', type: 'text', placeholder: '17.02.2027' },
                { label: 'Alış Fiyatı (₺) *', key: 'purchasePrice', type: 'number', placeholder: '1200000' },
                { label: 'Manuel Masraf (₺)', key: 'expenses', type: 'number', placeholder: '15000' },
              ].map(f => (
                <div key={f.key} className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">{f.label}</label>
                  <input type={f.type} placeholder={f.placeholder} value={(form as any)[f.key]}
                    onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/50" />
                </div>
              ))}
              {/* Masraf Açıklaması */}
              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Masraf Açıklaması</label>
                <textarea
                  value={(form as any).expenseNotes}
                  onChange={e => setForm(prev => ({ ...prev, expenseNotes: e.target.value }))}
                  placeholder="Boya, lastik, ekspertiz, yağ değişimi, tampon, cam filmi..."
                  rows={2}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/50 resize-none"
                />
              </div>
              {[
                { label: 'Alış Tarihi', key: 'purchaseDate', type: 'date', placeholder: '' },
                { label: 'Satış Tarihi', key: 'soldDate', type: 'date', placeholder: '' },
              ].map(f => (
                <div key={f.key} className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">{f.label}</label>
                  <input type={f.type} placeholder={f.placeholder} value={(form as any)[f.key]}
                    onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/50" />
                </div>
              ))}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Durum</label>
                <select value={form.status} onChange={e => setForm(prev => ({ ...prev, status: e.target.value as Vehicle['status'] }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/50">
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Sigorta Bilgileri */}
              <div className="col-span-2">
                <div className="bg-emerald-500/5 rounded-2xl p-4 border border-emerald-500/20">
                  <h3 className="text-xs font-bold text-emerald-400 uppercase mb-3">Sigorta Bilgileri</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      { label: 'Sigorta Firması', key: 'insuranceCompany', placeholder: 'Allianz, Axa...' },
                      { label: 'Poliçe No', key: 'insurancePolicyNo', placeholder: '1234567890' },
                      { label: 'Başlangıç Tarihi', key: 'insuranceStart', type: 'date', placeholder: '' },
                      { label: 'Bitiş Tarihi', key: 'insuranceEnd', type: 'date', placeholder: '' },
                    ] as {label:string;key:string;type?:string;placeholder:string}[]).map(f => (
                      <div key={f.key} className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">{f.label}</label>
                        <input type={f.type || 'text'} placeholder={f.placeholder} value={(form as any)[f.key] || ''}
                          onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/50" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Satıcı Bilgileri */}
              <div className="col-span-2">
                <div className="bg-amber-500/5 rounded-2xl p-4 border border-amber-500/20">
                  <h3 className="text-xs font-bold text-amber-400 uppercase mb-3">Aldığımız Kişi (Satıcı)</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      { label: 'Ad Soyad', key: 'sellerName', placeholder: 'Ahmet Yılmaz' },
                      { label: 'Telefon', key: 'sellerPhone', placeholder: '0532 000 00 00' },
                      { label: 'TC Kimlik No', key: 'sellerIdNo', placeholder: '12345678901' },
                      { label: 'Adres', key: 'sellerAddress', placeholder: 'Şehir / İlçe' },
                    ] as {label:string;key:string;placeholder:string}[]).map(f => (
                      <div key={f.key} className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">{f.label}</label>
                        <input type="text" placeholder={f.placeholder} value={(form as any)[f.key] || ''}
                          onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500/50" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Alıcı Bilgileri */}
              <div className="col-span-2">
                <div className="bg-blue-500/5 rounded-2xl p-4 border border-blue-500/20">
                  <h3 className="text-xs font-bold text-blue-400 uppercase mb-3">Sattığımız Kişi (Alıcı)</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      { label: 'Ad Soyad', key: 'buyerName', placeholder: 'Mehmet Demir' },
                      { label: 'Telefon', key: 'buyerPhone', placeholder: '0533 000 00 00' },
                      { label: 'TC Kimlik No', key: 'buyerIdNo', placeholder: '12345678901' },
                      { label: 'Adres', key: 'buyerAddress', placeholder: 'Şehir / İlçe' },
                    ] as {label:string;key:string;placeholder:string}[]).map(f => (
                      <div key={f.key} className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">{f.label}</label>
                        <input type="text" placeholder={f.placeholder} value={(form as any)[f.key] || ''}
                          onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/50" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* KİRALAMA BİLGİLERİ */}
                <div className="bg-teal-500/5 rounded-2xl border border-teal-500/20 p-4">
                  <h3 className="text-sm font-bold text-teal-400 mb-3 border-b border-teal-500/20 pb-2">Kiralama Detayları (Cari Kart)</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      { label: 'Kiralayan Kişi / Kurum', key: 'renterName', placeholder: 'Kiralayan Adı' },
                      { label: 'Telefon', key: 'renterPhone', placeholder: '05xx xxx xx xx' },
                      { label: 'Kira Başlangıç', key: 'rentalStart', placeholder: 'Tarih', type: 'date' },
                      { label: 'Süre (Ay)', key: 'rentalPeriod', placeholder: 'Örn: 1 Ay' },
                      { label: 'Kira Bitiş', key: 'rentalEnd', placeholder: 'Tarih', type: 'date' },
                      { label: 'Kira Ücreti (₺)', key: 'dailyPrice', placeholder: 'Örn: 30000 Veya 30.000', type: 'text' },
                      { label: 'Tahsil Edilen (₺)', key: 'rentalCollected', placeholder: 'Örn: 5000', type: 'text' },
                      { label: 'Kalan Bakiye / Borç (₺)', key: 'rentalDebt', placeholder: 'Örn: 25000', type: 'text' },
                    ] as {label:string;key:string;placeholder:string;type?:string}[]).map(f => (
                      <div key={f.key} className="space-y-1">
                        <label className="text-[10px] font-bold text-teal-500 uppercase">{f.label}</label>
                        <input type={f.type || 'text'} placeholder={f.placeholder} value={(form as any)[f.key] || ''}
                          onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500/50" />
                      </div>
                    ))}
                    
                    <div className="space-y-1">
                       <label className="text-[10px] font-bold text-teal-500 uppercase">Tahsilat Durumu</label>
                       <select value={(form as any).rentalPaymentStatus || ''} onChange={e => setForm(prev => ({ ...prev, rentalPaymentStatus: e.target.value }))}
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500/50">
                          <option value="">Seçiniz...</option>
                          <option value="Alındı">Alındı</option>
                          <option value="Alınmadı">Alınmadı</option>
                          <option value="Kısmi">Kısmi</option>
                       </select>
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-bold text-teal-500 uppercase">Fatura Durumu</label>
                       <select value={(form as any).rentalInvoiceStatus || ''} onChange={e => setForm(prev => ({ ...prev, rentalInvoiceStatus: e.target.value }))}
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500/50">
                          <option value="">Seçiniz...</option>
                          <option value="Kesildi">Kesildi</option>
                          <option value="Kesilmedi">Kesilmedi</option>
                       </select>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Notlar</label>
                <input type="text" placeholder="Boya, değişen parça, özel durum..." value={form.notes}
                  onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/50" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-emerald-500 uppercase">Ekspertiz Notu</label>
                <input type="text" placeholder="BOYA YOK 20.178 TL, Sol Ön Çam Değişen..." value={(form as any).expertiseNotes || ''}
                  onChange={e => setForm(prev => ({ ...prev, expertiseNotes: e.target.value }))}
                  className="w-full bg-emerald-500/5 border border-emerald-500/30 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/50 text-emerald-300" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-orange-500 uppercase">Tramer Kayıt Tutarı (₺)</label>
                <input type="number" placeholder="0" value={(form as any).tramerAmount || ''}
                  onChange={e => setForm(prev => ({ ...prev, tramerAmount: e.target.value }))}
                  className="w-full bg-orange-500/5 border border-orange-500/30 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-600/50 text-orange-300" />
                <p className="text-[10px] text-slate-500">Veri girilmezse 0 TL olarak görünür</p>
              </div>

              {/* Araç Hasar Haritası */}
              <div className="col-span-2">
                <CarDiagram
                  value={(form as any).damageMap || {}}
                  onChange={dm => setForm(prev => ({ ...prev, damageMap: dm }))}
                />
              </div>

              <div className="col-span-1" onClick={() => document.getElementById('img-upload')?.click()}>
                <div className="border-2 border-dashed border-slate-700 rounded-2xl p-4 flex flex-col items-center justify-center text-slate-500 hover:border-blue-500 hover:text-blue-500 transition-all cursor-pointer h-32 relative overflow-hidden group">
                  {imgPreview ? <img src={imgPreview} className="h-full w-full object-cover rounded-xl" alt="" /> : <><Plus size={28} /><p className="text-xs mt-1 text-center">Araç<br/>Fotoğrafı</p></>}
                </div>
                <input id="img-upload" type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { setImgFile(f); setImgPreview(URL.createObjectURL(f)); } }} />
              </div>
              <div className="col-span-1" onClick={() => document.getElementById('exp-upload')?.click()}>
                <div className="border-2 border-dashed border-slate-700 rounded-2xl p-4 flex flex-col items-center justify-center text-slate-500 hover:border-emerald-500 hover:text-emerald-500 transition-all cursor-pointer h-32 relative overflow-hidden group">
                  {expPreview ? <img src={expPreview} className="h-full w-full object-contain rounded-xl bg-slate-800" alt="" /> : <><FileText size={28} /><p className="text-xs mt-1 text-center">Ekspertiz<br/>Raporu</p></>}
                </div>
                <input id="exp-upload" type="file" accept="image/*,application/pdf" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { setExpFile(f); setExpPreview(URL.createObjectURL(f)); } }} />
              </div>
              <div className="col-span-1" onClick={() => document.getElementById('purchase-doc-upload')?.click()}>
                <div className="border-2 border-dashed border-slate-700 rounded-2xl p-4 flex flex-col items-center justify-center text-slate-500 hover:border-amber-500 hover:text-amber-500 transition-all cursor-pointer h-32 relative overflow-hidden group">
                  {purchaseDocPreview ? <img src={purchaseDocPreview} className="h-full w-full object-contain rounded-xl bg-slate-800" alt="" /> : <><Receipt size={28} /><p className="text-xs mt-1 text-center">Alış Evrağı<br/>(Noter vb.)</p></>}
                </div>
                <input id="purchase-doc-upload" type="file" accept="image/*,application/pdf" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { setPurchaseDocFile(f); setPurchaseDocPreview(URL.createObjectURL(f)); } }} />
              </div>
              <div className="col-span-1" onClick={() => document.getElementById('sale-doc-upload')?.click()}>
                <div className="border-2 border-dashed border-slate-700 rounded-2xl p-4 flex flex-col items-center justify-center text-slate-500 hover:border-purple-500 hover:text-purple-500 transition-all cursor-pointer h-32 relative overflow-hidden group">
                  {saleDocPreview ? <img src={saleDocPreview} className="h-full w-full object-contain rounded-xl bg-slate-800" alt="" /> : <><Receipt size={28} /><p className="text-xs mt-1 text-center">Satış Evrağı<br/>(Fatura vb.)</p></>}
                </div>
                <input id="sale-doc-upload" type="file" accept="image/*,application/pdf" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { setSaleDocFile(f); setSaleDocPreview(URL.createObjectURL(f)); } }} />
              </div>
              <div className="col-span-1" onClick={() => document.getElementById('rental-doc-upload')?.click()}>
                <div className="border-2 border-dashed border-slate-700 rounded-2xl p-4 flex flex-col items-center justify-center text-slate-500 hover:border-teal-500 hover:text-teal-500 transition-all cursor-pointer h-32 relative overflow-hidden group">
                  {rentalDocPreview ? <img src={rentalDocPreview} className="h-full w-full object-contain rounded-xl bg-slate-800" alt="" /> : <><Receipt size={28} /><p className="text-xs mt-1 text-center">Kira Sözleşmesi</p></>}
                </div>
                <input id="rental-doc-upload" type="file" accept="image/*,application/pdf" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { setRentalDocFile(f); setRentalDocPreview(URL.createObjectURL(f)); } }} />
              </div>
              <div className="col-span-1" onClick={() => document.getElementById('sale-contract-doc-upload')?.click()}>
                <div className="border-2 border-dashed border-slate-700 rounded-2xl p-4 flex flex-col items-center justify-center text-slate-500 hover:border-pink-500 hover:text-pink-500 transition-all cursor-pointer h-32 relative overflow-hidden group">
                  {saleContractDocPreview ? <img src={saleContractDocPreview} className="h-full w-full object-contain rounded-xl bg-slate-800" alt="" /> : <><Receipt size={28} /><p className="text-xs mt-1 text-center">Araç Satış<br/>Sözleşmesi</p></>}
                </div>
                <input id="sale-contract-doc-upload" type="file" accept="image/*,application/pdf" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { setSaleContractDocFile(f); setSaleContractDocPreview(URL.createObjectURL(f)); } }} />
              </div>
            </div>

            <div className="p-6 border-t border-slate-800 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-800">İptal</button>
              <button onClick={handleSave} disabled={saving} className="px-8 py-2.5 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-500 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                {saving ? <Clock size={16} className="animate-spin" /> : <Save size={16} />} {editId ? 'Güncelle' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bireysel Araç Cari Modalı ── */}
      {cariModalVehicle && (
        <VehicleCariModal 
          vehicle={cariModalVehicle} 
          onClose={() => setCariModalVehicle(null)} 
          updateVehicle={updateVehicle} 
        />
      )}

      <style dangerouslySetInnerHTML={{ __html: `.custom-scrollbar::-webkit-scrollbar{width:6px}.custom-scrollbar::-webkit-scrollbar-track{background:transparent}.custom-scrollbar::-webkit-scrollbar-thumb{background:#1e293b;border-radius:10px}` }} />
    </div>
  );
}

