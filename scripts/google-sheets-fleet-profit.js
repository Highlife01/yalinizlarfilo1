/**
 * FİLO KAR / ARAÇ KÂR SİSTEMİ – Google Sheets (Tam Takım)
 *
 * KURULUM: Google Sheets aç → Extensions → Apps Script → Bu dosyanın içeriğini yapıştır → Kaydet
 * KULLANIM: Menü "Filo Kar" → "Tüm Sayfaları Oluştur"
 *
 * 5 sayfa: ARAÇLAR, KİRALAMALAR, GİDERLER, SABİT GİDER DAĞITIMI, ARAÇ KAR RAPORU
 * + RAPORLAR sayfası (En kârlı araçlar, Boş gün, Bakım masrafı, Gün başı net kâr)
 */

var GIDER_SABIT = [
  "Kasko", "Trafik Sigortası", "MTV", "Muayene", "Ruhsat işlemleri",
  "GPS takip", "Otopark", "Ofis gider payı", "Muhasebe payı",
  "Kredi faizi", "Leasing", "Personel payı"
];

var GIDER_DEGISKEN = [
  "Periyodik bakım", "Yağ değişimi", "Lastik", "Fren balatası",
  "Hasar onarım", "Kaporta boya", "Cam değişimi", "Yıkama temizlik",
  "Yakıt (karşılanıyorsa)", "HGS (yansıtılmadıysa)", "Çekici",
  "Teslimat maliyeti", "POS komisyonu", "Broker komisyonu"
];

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Filo Kar")
    .addItem("Tüm Sayfaları Oluştur", "createFleetProfitSheets")
    .addToUi();
}

function getOrCreateSheet(ss, name) {
  var sheet = ss.getSheetByName(name);
  return sheet || ss.insertSheet(name);
}

function createFleetProfitSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // —— 1️⃣ ARAÇLAR ——
  var s1 = getOrCreateSheet(ss, "ARAÇLAR");
  s1.clear();
  var h1 = [
    "Plaka", "Marka", "Model", "Segment", "Model Yılı",
    "Alış Tarihi", "Alış Bedeli", "Hedef Satış Değeri",
    "Planlanan Kullanım Süresi (Ay)", "Aylık Amortisman",
    "Finansman Tipi (Nakit/Kredi/Leasing)",
    "Aylık Kredi/Leasing Taksidi",
    "Sigorta Başlangıç", "Sigorta Bitiş",
    "Yıllık Kasko+Sigorta", "Yıllık MTV",
    "Son Muayene", "KM (Güncel)", "Durum (Kirada/Boş/Bakım)"
  ];
  s1.getRange(1, 1, 1, h1.length).setValues([h1]).setFontWeight("bold");
  s1.setFrozenRows(1);
  s1.getRange("J2:J1000").setFormulaR1C1("=(R[0]C[7]-R[0]C[8])/R[0]C[9]");

  // —— 2️⃣ KİRALAMALAR ——
  var s2 = getOrCreateSheet(ss, "KİRALAMALAR");
  s2.clear();
  var h2 = [
    "Kiralama ID", "Plaka", "Müşteri",
    "Başlangıç Tarih", "Bitiş Tarih", "Gün Sayısı",
    "Günlük Fiyat", "Kira Geliri", "Ek Gelir",
    "Toplam Gelir", "Komisyon", "HGS/Diğer",
    "Hasar Tutarı", "Tahsil Edilen"
  ];
  s2.getRange(1, 1, 1, h2.length).setValues([h2]).setFontWeight("bold");
  s2.setFrozenRows(1);
  s2.getRange("F2:F1000").setFormulaR1C1("=R[0]C[5]-R[0]C[4]");
  s2.getRange("H2:H1000").setFormulaR1C1("=R[0]C[6]*R[0]C[7]");
  s2.getRange("J2:J1000").setFormulaR1C1("=R[0]C[8]+R[0]C[9]");

  // —— 3️⃣ GİDERLER ——
  var s3 = getOrCreateSheet(ss, "GİDERLER");
  s3.clear();
  var h3 = ["Tarih", "Plaka", "Gider Türü", "Açıklama", "Tutar", "Sabit/Değişken"];
  s3.getRange(1, 1, 1, h3.length).setValues([h3]).setFontWeight("bold");
  s3.setFrozenRows(1);
  var giderList = GIDER_SABIT.concat(GIDER_DEGISKEN);
  var ruleGider = SpreadsheetApp.newDataValidation().requireValueInList(giderList, true).build();
  s3.getRange("C2:C1000").setDataValidation(ruleGider);
  var ruleSD = SpreadsheetApp.newDataValidation().requireValueInList(["Sabit", "Değişken"], true).build();
  s3.getRange("F2:F1000").setDataValidation(ruleSD);

  // —— 4️⃣ SABİT GİDER DAĞITIMI ——
  var s4 = getOrCreateSheet(ss, "SABİT GİDER DAĞITIMI");
  s4.clear();
  var h4 = ["Plaka", "Yıllık Sigorta", "Yıllık MTV", "Aylık Sabit Gider"];
  s4.getRange(1, 1, 1, h4.length).setValues([h4]).setFontWeight("bold");
  s4.setFrozenRows(1);
  s4.getRange("D2:D1000").setFormulaR1C1("=(R[0]C[2]+R[0]C[3])/12");

  // —— 5️⃣ ARAÇ KAR RAPORU ——
  var s5 = getOrCreateSheet(ss, "ARAÇ KAR RAPORU");
  s5.clear();
  var h5 = [
    "Plaka", "Ay",
    "Toplam Kiralama Geliri", "Ek Gelir", "Toplam Gelir",
    "Değişken Gider", "Sabit Gider", "Amortisman", "Finansman", "Net Kâr",
    "Kiralanan Gün", "Doluluk Oranı", "Gün Başı Net Kâr"
  ];
  s5.getRange(1, 1, 1, h5.length).setValues([h5]).setFontWeight("bold");
  s5.setFrozenRows(1);
  s5.getRange("C2").setFormula("=SUMIFS(KİRALAMALAR!$J:$J,KİRALAMALAR!$B:$B,$A2)");
  s5.getRange("D2").setFormula("=SUMIFS(KİRALAMALAR!$I:$I,KİRALAMALAR!$B:$B,$A2)");
  s5.getRange("E2").setFormula("=C2+D2");
  s5.getRange("F2").setFormula("=SUMIFS(GİDERLER!$E:$E,GİDERLER!$B:$B,$A2,GİDERLER!$F:$F,\"Değişken\")");
  s5.getRange("G2").setFormula("=SUMIFS(GİDERLER!$E:$E,GİDERLER!$B:$B,$A2,GİDERLER!$F:$F,\"Sabit\")");
  s5.getRange("H2").setFormula("=IFERROR(VLOOKUP($A2,ARAÇLAR!$A:$J,10,FALSE),0)");
  s5.getRange("I2").setFormula("=IFERROR(VLOOKUP($A2,ARAÇLAR!$A:$L,12,FALSE),0)");
  s5.getRange("J2").setFormula("=E2-F2-G2-H2-I2");
  s5.getRange("K2").setFormula("=SUMIFS(KİRALAMALAR!$F:$F,KİRALAMALAR!$B:$B,$A2)");
  s5.getRange("L2").setFormula("=IF(K2=0,0,K2/30)");
  s5.getRange("M2").setFormula("=IF(K2=0,0,J2/K2)");
  s5.getRange("C2:M2").copyTo(s5.getRange("C2:M1000"), SpreadsheetApp.CopyPasteType.PASTE_FORMULA, false);

  // —— 6️⃣ RAPORLAR (4 kritik rapor) ——
  var s6 = getOrCreateSheet(ss, "RAPORLAR");
  s6.clear();
  s6.getRange("A1").setValue("1️⃣ EN KÂRLI ARAÇLAR (Plaka + Toplam Net Kâr)").setFontWeight("bold");
  s6.getRange("A2:B2").setValues([["Plaka", "Toplam Net Kâr"]]).setFontWeight("bold");
  s6.getRange("A3").setFormula("=UNIQUE(ARAÇ KAR RAPORU!A2:A)");
  s6.getRange("B3").setFormula("=IF(A3=\"\",\"\",SUMIF(ARAÇ KAR RAPORU!$A:$A,A3,ARAÇ KAR RAPORU!$J:$J))");
  s6.getRange("B3:B500").setFormulaR1C1("=IF(R[0]C[1]=\"\",\"\",SUMIF(ARAÇ KAR RAPORU!$A:$A,R[0]C[1],ARAÇ KAR RAPORU!$J:$J))");

  s6.getRange("D1").setValue("2️⃣ EN FAZLA BOŞ GÜN (Plaka + Kiralanan Gün + Boş Gün)").setFontWeight("bold");
  s6.getRange("D2:F2").setValues([["Plaka", "Kiralanan Gün", "Boş Gün (12 ay=360)"]]).setFontWeight("bold");
  s6.getRange("D3").setFormula("=UNIQUE(ARAÇ KAR RAPORU!A2:A)");
  s6.getRange("E3").setFormulaR1C1("=IF(D3=\"\",\"\",SUMIF(ARAÇ KAR RAPORU!$A:$A,D3,ARAÇ KAR RAPORU!$K:$K))");
  s6.getRange("F3").setFormulaR1C1("=IF(E3=\"\",\"\",360-E3)");
  s6.getRange("E3:E500").setFormulaR1C1("=IF(R[0]C[1]=\"\",\"\",SUMIF(ARAÇ KAR RAPORU!$A:$A,R[0]C[1],ARAÇ KAR RAPORU!$K:$K))");
  s6.getRange("F3:F500").setFormulaR1C1("=IF(R[0]C[1]=\"\",\"\",360-R[0]C[1])");

  s6.getRange("H1").setValue("3️⃣ EN FAZLA BAKIM MASRAFI (Plaka + Bakım Gideri)").setFontWeight("bold");
  s6.getRange("H2:I2").setValues([["Plaka", "Bakım/Onarım Gideri"]]).setFontWeight("bold");
  s6.getRange("H3").setFormula("=UNIQUE(GİDERLER!B2:B)");
  s6.getRange("I3").setFormula("=IF(H3=\"\",\"\",SUMIFS(GİDERLER!E:E,GİDERLER!B:B,H3,GİDERLER!C:C,\"Periyodik bakım\")+SUMIFS(GİDERLER!E:E,GİDERLER!B:B,H3,GİDERLER!C:C,\"Hasar onarım\"))");
  s6.getRange("I3:I500").setFormulaR1C1("=IF(R[0]C[1]=\"\",\"\",SUMIFS(GİDERLER!E:E,GİDERLER!B:B,R[0]C[1],GİDERLER!C:C,\"Periyodik bakım\")+SUMIFS(GİDERLER!E:E,GİDERLER!B:B,R[0]C[1],GİDERLER!C:C,\"Hasar onarım\"))");

  s6.getRange("K1").setValue("4️⃣ GÜN BAŞI NET KÂR (Plaka + Toplam Net Kâr / Kiralanan Gün)").setFontWeight("bold");
  s6.getRange("K2:L2").setValues([["Plaka", "Gün Başı Net Kâr"]]).setFontWeight("bold");
  s6.getRange("K3").setFormula("=UNIQUE(ARAÇ KAR RAPORU!A2:A)");
  s6.getRange("L3").setFormulaR1C1("=IF(OR(K3=\"\",SUMIF(ARAÇ KAR RAPORU!$A:$A,K3,ARAÇ KAR RAPORU!$K:$K)=0),\"\",SUMIF(ARAÇ KAR RAPORU!$A:$A,K3,ARAÇ KAR RAPORU!$J:$J)/SUMIF(ARAÇ KAR RAPORU!$A:$A,K3,ARAÇ KAR RAPORU!$K:$K))");
  s6.getRange("L3:L500").setFormulaR1C1("=IF(OR(R[0]C[1]=\"\",SUMIF(ARAÇ KAR RAPORU!$A:$A,R[0]C[1],ARAÇ KAR RAPORU!$K:$K)=0),\"\",SUMIF(ARAÇ KAR RAPORU!$A:$A,R[0]C[1],ARAÇ KAR RAPORU!$J:$J)/SUMIF(ARAÇ KAR RAPORU!$A:$A,R[0]C[1],ARAÇ KAR RAPORU!$K:$K))");

  s6.setFrozenRows(2);

  // Sütun genişlikleri
  [s1, s2, s3, s4, s5, s6].forEach(function(sh) {
    var cols = sh.getLastColumn() || 20;
    if (cols > 0) sh.autoResizeColumns(1, cols);
  });

  SpreadsheetApp.getUi().alert("Filo Kar yapısı oluşturuldu: ARAÇLAR, KİRALAMALAR, GİDERLER, SABİT GİDER DAĞITIMI, ARAÇ KAR RAPORU, RAPORLAR.");
}
