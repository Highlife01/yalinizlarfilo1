from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


OUT = Path(r"C:\Users\cebra\Downloads\BOS_SOZLESME_GUNCEL_YALINIZLAR.pdf")


def register_fonts() -> None:
    pdfmetrics.registerFont(TTFont("Arial", r"C:\Windows\Fonts\arial.ttf"))
    pdfmetrics.registerFont(TTFont("Arial-Bold", r"C:\Windows\Fonts\arialbd.ttf"))


register_fonts()
styles = getSampleStyleSheet()

S = {
    "h1": ParagraphStyle(
        "h1",
        parent=styles["Normal"],
        fontName="Arial-Bold",
        fontSize=12,
        alignment=TA_CENTER,
        leading=14,
    ),
    "h2": ParagraphStyle(
        "h2",
        parent=styles["Normal"],
        fontName="Arial-Bold",
        fontSize=11,
        alignment=TA_CENTER,
        leading=13,
    ),
    "b": ParagraphStyle(
        "b",
        parent=styles["Normal"],
        fontName="Arial-Bold",
        fontSize=9,
        alignment=TA_LEFT,
        leading=11,
    ),
    "n": ParagraphStyle(
        "n",
        parent=styles["Normal"],
        fontName="Arial",
        fontSize=8.6,
        alignment=TA_LEFT,
        leading=11,
    ),
    "small": ParagraphStyle(
        "small",
        parent=styles["Normal"],
        fontName="Arial",
        fontSize=7.3,
        alignment=TA_LEFT,
        leading=9,
    ),
    "just": ParagraphStyle(
        "just",
        parent=styles["Normal"],
        fontName="Arial",
        fontSize=9.1,
        alignment=TA_JUSTIFY,
        leading=12,
    ),
    "foot_l": ParagraphStyle(
        "foot_l",
        parent=styles["Normal"],
        fontName="Arial",
        fontSize=8,
        alignment=TA_LEFT,
    ),
    "foot_r": ParagraphStyle(
        "foot_r",
        parent=styles["Normal"],
        fontName="Arial",
        fontSize=8,
        alignment=TA_RIGHT,
    ),
}


def field_line(label: str) -> str:
    return f"{label}<br/>........................................"


def th(text: str) -> Paragraph:
    return Paragraph(f"<b>{text}</b>", S["small"])


def td(text: str) -> Paragraph:
    return Paragraph(text, S["small"])


def footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Arial", 8)
    canvas.setFillColor(colors.HexColor("#666666"))
    canvas.drawString(15 * mm, 8 * mm, "YALINIZLAR FILO - Arac Kiralama Sozlesmesi")
    canvas.drawRightString(195 * mm, 8 * mm, f"Sayfa {doc.page}")
    canvas.restoreState()


doc = SimpleDocTemplate(
    str(OUT),
    pagesize=A4,
    leftMargin=8 * mm,
    rightMargin=8 * mm,
    topMargin=8 * mm,
    bottomMargin=12 * mm,
)
page_w = A4[0] - doc.leftMargin - doc.rightMargin

story = []

# PAGE 1 - Form layout
top = Table(
    [
        [
            Paragraph("<b>yalinizlar</b>", ParagraphStyle("logo", parent=S["h1"], alignment=TA_LEFT, fontSize=20)),
            Paragraph("ARAC KIRALAMA SOZLESMESI<br/><font size='8'>Rental Agreement</font>", S["h1"]),
            Paragraph(
                "<b>YALINIZLAR SERVIS HIZMETLERI A.S.</b><br/>"
                "Yenibosna Merkez Mah. Asena Sk. Servis Onarim<br/>"
                "Hizmetleri Blok No:9 Bahcelievler / ISTANBUL<br/>"
                "www.yalinizlarfilo.com.tr - info@yalinizlarfilo.com.tr<br/>"
                "<b>Cagri Merkezi: 0850 333 28 86</b>",
                ParagraphStyle("tr", parent=S["small"], alignment=TA_RIGHT),
            ),
        ],
        [
            Paragraph("RZV: WALKING", S["small"]),
            Paragraph("Sozlesme Tarihi: ...../...../..........<br/>Sozlesme No: ......................", S["small"]),
            Paragraph("", S["small"]),
        ],
    ],
    colWidths=[page_w * 0.23, page_w * 0.37, page_w * 0.40],
)
top.setStyle(
    TableStyle(
        [
            ("GRID", (0, 0), (-1, -1), 0.7, colors.HexColor("#777777")),
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f2f2f2")),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]
    )
)
story.append(top)
story.append(Spacer(1, 3))

customer_header = Table([[Paragraph("<b>Musteri Bilgileri / Customer Data</b>", S["small"]), Paragraph("<b>Ek Surucu Bilgileri / Additional Driver</b>", S["small"])]], colWidths=[page_w * 0.66, page_w * 0.34])
customer_header.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), 0.7, colors.HexColor("#777777")), ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f7f7f7")), ("LEFTPADDING", (0, 0), (-1, -1), 5), ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]))
story.append(customer_header)

left_rows = [
    [field_line("Adi Soyadi / Name Surname"), field_line("TC Kimlik - Yabanci Kimlik / ID No")],
    [field_line("Dogum Tarihi"), field_line("Dogum Yeri")],
    [field_line("Ehliyet No"), field_line("Pasaport No")],
    [field_line("Ehliyet Verilis Tarihi"), field_line("Pasaport Verilis Tarihi")],
    [field_line("Telefon Numarasi"), field_line("E-Posta")],
    [field_line("Adres"), ""],
]
left_table = Table(
    [[Paragraph(l, S["small"]), Paragraph(r, S["small"])] for l, r in left_rows],
    colWidths=[page_w * 0.33, page_w * 0.33],
)
left_table.setStyle(
    TableStyle(
        [
            ("GRID", (0, 0), (-1, -1), 0.6, colors.HexColor("#999999")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ]
    )
)

driver_rows = [
    field_line("Adi Soyadi"),
    field_line("TC Kimlik / YKN"),
    field_line("Ehliyet No"),
    field_line("Ehliyet Verilis Tarihi"),
    field_line("Ek Surucu Adresi"),
]
driver_table = Table([[Paragraph(x, S["small"])] for x in driver_rows], colWidths=[page_w * 0.34])
driver_table.setStyle(
    TableStyle(
        [
            ("GRID", (0, 0), (-1, -1), 0.6, colors.HexColor("#999999")),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ]
    )
)

customer_main = Table([[left_table, driver_table]], colWidths=[page_w * 0.66, page_w * 0.34])
customer_main.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), 0.7, colors.HexColor("#777777")), ("VALIGN", (0, 0), (-1, -1), "TOP")]))
story.append(customer_main)
story.append(Spacer(1, 3))

res_header = Table([[Paragraph("<b>Arac ve Rezervasyon Bilgileri / Car and Reservation</b>", S["small"]), Paragraph("<b>Onemli Uyarilar / Important Notices</b>", S["small"])]], colWidths=[page_w * 0.56, page_w * 0.44])
res_header.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), 0.7, colors.HexColor("#777777")), ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f7f7f7")), ("LEFTPADDING", (0, 0), (-1, -1), 5), ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]))
story.append(res_header)

res_rows = [
    [field_line("Rezervasyon Kaynagi"), field_line("Odeme Tipi")],
    [field_line("Kurumsal Uyelik"), field_line("Plaka")],
    [field_line("Arac Grubu"), field_line("Marka / Model")],
    [field_line("Cikis Lokasyonu"), field_line("Donus Lokasyonu")],
    [field_line("Planlanan Donus"), field_line("Planlanan Cikis")],
]
res_table = Table(
    [[Paragraph(l, S["small"]), Paragraph(r, S["small"])] for l, r in res_rows],
    colWidths=[page_w * 0.28, page_w * 0.28],
)
res_table.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), 0.6, colors.HexColor("#999999")), ("LEFTPADDING", (0, 0), (-1, -1), 4), ("RIGHTPADDING", (0, 0), (-1, -1), 4), ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3)]))

warn_text = [
    "* Kusurlu kazalarda kusur oraninca hesaplanacak hasar tutari ve hasar tutarinin %5 hizmet bedeli alinmaktadir.",
    "* Arac yakitini eksik getirilmesi halinde fark yakit bedeli ve %40 hizmet bedeli alinmaktadir.",
    "* Sigorta teminati disinda kalan her turlu hasar ve zarara iliskin hasar tutari ve bu tutarin %5 hizmet bedeli alinmaktadir.",
    "* HGS gecislerinde gecis bedellerine ek olarak %25 hizmet bedeli alinmaktadir.",
    "* Bu formda yer almayan tum hususlarda kiralama kosullari hukumleri gecerlidir.",
]
warn_table = Table([[Paragraph("<br/>".join(warn_text), S["n"])]], colWidths=[page_w * 0.44])
warn_table.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), 0.6, colors.HexColor("#999999")), ("LEFTPADDING", (0, 0), (-1, -1), 5), ("RIGHTPADDING", (0, 0), (-1, -1), 5), ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5)]))

res_main = Table([[res_table, warn_table]], colWidths=[page_w * 0.56, page_w * 0.44])
res_main.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), 0.7, colors.HexColor("#777777")), ("VALIGN", (0, 0), (-1, -1), "TOP")]))
story.append(res_main)
story.append(Spacer(1, 3))

bottom_header = Table([[Paragraph("<b>Kiralama Bilgileri / Rental Information</b>", S["small"]), Paragraph("<b>Onay ve Imza / Confirmation and Signature</b>", S["small"])]], colWidths=[page_w * 0.56, page_w * 0.44])
bottom_header.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), 0.7, colors.HexColor("#777777")), ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f7f7f7")), ("LEFTPADDING", (0, 0), (-1, -1), 5), ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]))
story.append(bottom_header)

rent_rows = [
    [field_line("Kiralama Suresi"), field_line("Gunluk / Aylik Kira Bedeli")],
    [field_line("Ek Hizmetler Bedeli"), field_line("Ek Surucu / Cocuk Koltugu / Guvence Paketi")],
    [field_line("KM Limiti"), field_line("Yakiti Alma Bedeli / HGS / Otoyol")],
]
rent_table = Table([[Paragraph(l, S["small"]), Paragraph(r, S["small"])] for l, r in rent_rows], colWidths=[page_w * 0.28, page_w * 0.28])
rent_table.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), 0.6, colors.HexColor("#999999")), ("LEFTPADDING", (0, 0), (-1, -1), 4), ("RIGHTPADDING", (0, 0), (-1, -1), 4), ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3)]))

signature_block = Table(
    [
        [Paragraph("Bu bolume MUSTERI tarafindan el yazisi ile \"Sozlesmenin bir nushasi tarafima teslim edildi\" yazilmalidir.", S["n"])],
        [Paragraph("Tarih / Saat: ........................................................", S["n"])],
        [Paragraph("Ticari Elektronik ileti izni: Burada beyan edilen veriler kampanya ve bilgilendirme surecinde islenebilir.", S["small"])],
        [Paragraph("<b>KIRACI / MUSTERI IMZA</b>................................................", S["b"])],
    ],
    colWidths=[page_w * 0.44],
)
signature_block.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), 0.6, colors.HexColor("#999999")), ("LEFTPADDING", (0, 0), (-1, -1), 5), ("RIGHTPADDING", (0, 0), (-1, -1), 5), ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]))

bottom_main = Table([[rent_table, signature_block]], colWidths=[page_w * 0.56, page_w * 0.44])
bottom_main.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), 0.7, colors.HexColor("#777777")), ("VALIGN", (0, 0), (-1, -1), "TOP")]))
story.append(bottom_main)
story.append(Spacer(1, 3))
story.append(
    Paragraph(
        "Isbu sozlesmenin tum fikri mulkiyet haklari YALINIZLAR SERVIS HIZMETLERI A.S.'ye ait olup, izinsiz cogaltilmasi, kullanilmasi veya taklit edilmesi yasaktir.",
        S["small"],
    )
)

# PAGE 2-4 - Terms
story.append(PageBreak())
terms_header = Table(
    [
        [
            Paragraph("ARAC KIRALAMA SOZLESMESI<br/><font size='8'>Rental Agreement</font>", S["h2"]),
            Paragraph(
                "<b>YALINIZLAR SERVIS HIZMETLERI A.S.</b><br/>"
                "Yenibosna Merkez Mah. Asena Sk. Servis Onarim Hizmetleri Blok No:9 Bahcelievler / ISTANBUL<br/>"
                "www.yalinizlarfilo.com.tr - info@yalinizlarfilo.com.tr<br/>"
                "<b>Cagri Merkezi: 0850 333 28 86</b>",
                ParagraphStyle("tr2", parent=S["small"], alignment=TA_RIGHT),
            ),
        ]
    ],
    colWidths=[page_w * 0.5, page_w * 0.5],
)
terms_header.setStyle(
    TableStyle(
        [
            ("GRID", (0, 0), (-1, -1), 0.7, colors.HexColor("#777777")),
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f2f2f2")),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]
    )
)
story.append(terms_header)
story.append(Spacer(1, 5))
story.append(Paragraph("<b>I-KIRALAMA SOZLESMESI KOSULLARI</b>", ParagraphStyle("m", parent=S["b"], alignment=TA_CENTER, fontSize=10)))
story.append(Spacer(1, 4))

terms = [
    "Aracin kira bedeline ve tum ek odemelere iliskin tahsilatlar kiralama baslangicinda pesin yapilir. Teminat tahsilati, arac sinifi ve sureye gore YALINIZLAR tarafindan belirlenir.",
    "KIRACI, araci teslim aninda kontrol ederek teslim alir ve teslim formundaki kayitlari kabul eder.",
    "Kiralama suresince olusan HGS, otopark, trafik cezasi, cekme bedeli ve buna iliskin hizmet bedelleri KIRACI'ya aittir.",
    "Aracin eksik yakitla iadesinde eksik yakit bedeli ve hizmet bedeli tahsil edilir.",
    "Sozlesmede belirlenen kilometre limiti asildiginda asim bedeli uygulanir. Aylik toplam kullanimda da limit tablosu esas alinir.",
    "Arac; yasal olmayan islerde, korsan tasimacilikta, yaris/spor amacli veya araca zarar verecek sartlarda kullanilamaz.",
    "Sigorta kapsami disindaki hasarlar, ucuncu kisi zararlarina iliskin talepler ve limit asimlari KIRACI sorumlulugundadir.",
    "Aracin calinmasi halinde KIRACI derhal emniyet birimlerine ve YALINIZLAR'a bildirim yapar; anahtar ve ruhsat teslimini 24 saat icinde gerceklestirir.",
    "Kaza halinde gerekli belgeler (kaza tutanagi, alkol raporu, ehliyet/ruhsat vb.) en gec 24 saat icinde YALINIZLAR'a iletilir.",
    "Aracta olusan aksesuar, lastik/jant, evrak, anahtar ve benzeri kayip/zararlar KIRACI tarafindan karsilanir.",
    "Iade sirasinda olagan kullanim disi hasar, agir kirli teslim ve temizlik maliyetleri KIRACI'ya yansitilir.",
    "Kusurlu kazalarda hasar tutari kusur oraninda tahsil edilir. Ek paketlerde limit ustu kisim KIRACI'ya aittir.",
    "Acil bakim veya ariza halinde KIRACI, YALINIZLAR'i bilgilendirerek yetkili servis surecini yonetir.",
    "YALINIZLAR, araclarda takip sistemi kullanabilir. Sistemin devre disi birakilmasi sozlesmeye aykirilik sayilir.",
    "Aracin sozlesme disi kisiye devri veya amac disi kullanimi halinde YALINIZLAR sozlesmeyi tek tarafli feshedebilir.",
    "Asiri hiz, ters yon, tehlikeli surus vb. agir ihlallerde olusan hasar ve deger kaybi bedelleri KIRACI'ya ait olur.",
    "Kiralama bitiminde arac zamaninda iade edilmelidir. Gec iadede tarifeye gore gecikme bedeli uygulanir.",
    "Arac iki gunden fazla iade edilmezse YALINIZLAR hukuki yollara basvurarak rayic bedel dahil tum zararlari talep edebilir.",
    "KIRACI, iade aninda kisisel esyalarini teslim alir; arac icinde unutulan esyalardan YALINIZLAR sorumlu tutulamaz.",
    "Isbu sozlesme, online/mesafeli kiralama kosullarinin ayrilmaz parcasidir ve www.yalinizlarfilo.com.tr/kiralamakosullari adresindeki kosullarla birlikte uygulanir.",
    "Vadesinde odenmeyen borclar icin sozlesmede belirlenen gecikme faizi ve yasal takip haklari uygulanir.",
]
for i, t in enumerate(terms, start=1):
    story.append(Paragraph(f"<b>{i}-</b> {t}", S["just"]))
    story.append(Spacer(1, 1.7))

# PAGE 5 - KM limits table and signatures
story.append(PageBreak())
story.append(Paragraph("<b>III-ARAC GRUBUNA GORE KILOMETRE LIMITLERI</b>", ParagraphStyle("k", parent=S["b"], alignment=TA_CENTER, fontSize=10)))
story.append(Spacer(1, 3))

rows = [["Gun", "1. Grup Araclar (Ekonomik & Orta) Gunluk KM", "1. Grup Toplam KM", "2. Grup Araclar (Ust & Premium) Gunluk KM", "2. Grup Toplam KM"]]
for day in range(1, 32):
    g = "500" if day <= 8 else "YOK"
    tkm = str(day * 500 if day <= 8 else 4000)
    rows.append([str(day), g, tkm, g, tkm])

km_tbl = Table(rows, colWidths=[page_w * 0.08, page_w * 0.26, page_w * 0.16, page_w * 0.26, page_w * 0.16])
km_tbl.setStyle(
    TableStyle(
        [
            ("GRID", (0, 0), (-1, -1), 0.55, colors.HexColor("#888888")),
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#efefef")),
            ("FONTNAME", (0, 0), (-1, 0), "Arial-Bold"),
            ("FONTNAME", (0, 1), (-1, -1), "Arial"),
            ("FONTSIZE", (0, 0), (-1, -1), 7.4),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]
    )
)
story.append(km_tbl)
story.append(Spacer(1, 4))
story.append(
    Paragraph(
        "* Kiralama uzatmalarinda ekstra KM hakki verilmez. Segmente gore asim bedeli uygulanir. Tum siniflarda aylik maksimum toplam limit 4000 KM'dir.",
        S["small"],
    )
)
story.append(Spacer(1, 4))

last = Table(
    [
        [
            Paragraph("Kisisel Verilerin Korunmasi Hakkinda Aydinlatma Metni", S["b"]),
            Paragraph("<b>KIRACI / MUSTERI IMZA</b>", ParagraphStyle("rr", parent=S["b"], alignment=TA_CENTER)),
            Paragraph("<b>IKINCI SOFOR IMZA</b>", ParagraphStyle("rr2", parent=S["b"], alignment=TA_CENTER)),
        ],
        [
            Paragraph(
                "Bu sozlesmenin kurulmasi ile varsa onaylar kapsaminda kisisel verileriniz, ilgili mevzuata uygun sekilde YALINIZLAR tarafindan islenebilir. Ayrintili metin: www.yalinizlarfilo.com.tr/tr/kisisel-verilerin-korunmasi",
                S["small"],
            ),
            Paragraph("\n\n........................................", ParagraphStyle("c1", parent=S["n"], alignment=TA_CENTER)),
            Paragraph("\n\n........................................", ParagraphStyle("c2", parent=S["n"], alignment=TA_CENTER)),
        ],
    ],
    colWidths=[page_w * 0.50, page_w * 0.25, page_w * 0.25],
)
last.setStyle(
    TableStyle(
        [
            ("GRID", (0, 0), (-1, -1), 0.65, colors.HexColor("#777777")),
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f2f2f2")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]
    )
)
story.append(last)
story.append(Spacer(1, 2))
story.append(
    Paragraph(
        "Isbu sozlesmenin tum fikri mulkiyet haklari YALINIZLAR SERVIS HIZMETLERI A.S.'ye ait olup izinsiz cogaltilmasi, kullanilmasi veya taklit edilmesi yasaktir.",
        S["small"],
    )
)

doc.build(story, onFirstPage=footer, onLaterPages=footer)
print(f"Olusturuldu: {OUT}")
