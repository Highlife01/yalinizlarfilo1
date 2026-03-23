from pathlib import Path
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


OUTPUT_PATH = Path(r"C:\Users\cebra\Downloads\2026044.pdf")
BACKUP_PATH = Path(r"C:\Users\cebra\Downloads\2026044_orjinal_yedek.pdf")


def register_fonts() -> None:
    pdfmetrics.registerFont(TTFont("Arial", r"C:\Windows\Fonts\arial.ttf"))
    pdfmetrics.registerFont(TTFont("Arial-Bold", r"C:\Windows\Fonts\arialbd.ttf"))


def section_title(text: str, width: float) -> Table:
    tbl = Table([[Paragraph(f"<b>{text}</b>", STYLES["section_title"])]] , colWidths=[width])
    tbl.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#e4572e")),
                ("BOX", (0, 0), (-1, -1), 0.8, colors.HexColor("#d64f27")),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return tbl


def info_table(width: float) -> Table:
    colw = [width * 0.25, width * 0.25, width * 0.25, width * 0.25]
    rows = [
        ["Musteri Ad Soyad", "TC / Pasaport No", "Telefon", "E-posta"],
        ["................................", "................................", "................................", "................................"],
        ["Adres", "Sofor Belge No", "Dogum Tarihi", "Uyelik / Musteri No"],
        ["................................", "................................", "................................", "................................"],
    ]
    tbl = Table(rows, colWidths=colw)
    tbl.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, 0), "Arial-Bold"),
                ("FONTNAME", (0, 2), (-1, 2), "Arial-Bold"),
                ("FONTNAME", (0, 1), (-1, 1), "Arial"),
                ("FONTNAME", (0, 3), (-1, 3), "Arial"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cfcfcf")),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f5f7fa")),
                ("BACKGROUND", (0, 2), (-1, 2), colors.HexColor("#f5f7fa")),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return tbl


def vehicle_table(width: float) -> Table:
    colw = [width * 0.2, width * 0.2, width * 0.2, width * 0.2, width * 0.2]
    rows = [
        ["Arac Marka/Model", "Plaka", "Vites / Yakit", "Teslim Tarih-Saat", "Iade Tarih-Saat"],
        ["................................", "................................", "................................", "................................", "................................"],
        ["Teslim Lokasyonu", "Iade Lokasyonu", "Gunluk Ucret", "Toplam Gun", "Toplam Tutar"],
        ["................................", "................................", "................................", "................................", "................................"],
    ]
    tbl = Table(rows, colWidths=colw)
    tbl.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, 0), "Arial-Bold"),
                ("FONTNAME", (0, 2), (-1, 2), "Arial-Bold"),
                ("FONTNAME", (0, 1), (-1, 1), "Arial"),
                ("FONTNAME", (0, 3), (-1, 3), "Arial"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cfcfcf")),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f5f7fa")),
                ("BACKGROUND", (0, 2), (-1, 2), colors.HexColor("#f5f7fa")),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return tbl


def payment_table(width: float) -> Table:
    colw = [width * 0.25, width * 0.25, width * 0.25, width * 0.25]
    rows = [
        ["Ekstra Hizmetler", "Depozito", "Odeme Yontemi", "Fatura Bilgisi"],
        ["................................", "................................", "................................", "................................"],
        ["KM Limiti", "Asim Bedeli", "Yakit Politikasi", "Notlar"],
        ["................................", "................................", "................................", "................................"],
    ]
    tbl = Table(rows, colWidths=colw)
    tbl.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, 0), "Arial-Bold"),
                ("FONTNAME", (0, 2), (-1, 2), "Arial-Bold"),
                ("FONTNAME", (0, 1), (-1, 1), "Arial"),
                ("FONTNAME", (0, 3), (-1, 3), "Arial"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cfcfcf")),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f5f7fa")),
                ("BACKGROUND", (0, 2), (-1, 2), colors.HexColor("#f5f7fa")),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return tbl


def signature_table(width: float) -> Table:
    tbl = Table(
        [
            ["KIRALAYAN (YALINIZLAR FILO)", "KIRACI / MUSTERI", "EK SOFOR"],
            ["\n\n\nImza:\nAd Soyad:\nTarih:", "\n\n\nImza:\nAd Soyad:\nTarih:", "\n\n\nImza:\nAd Soyad:\nTarih:"],
        ],
        colWidths=[width / 3] * 3,
    )
    tbl.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, 0), "Arial-Bold"),
                ("FONTNAME", (0, 1), (-1, -1), "Arial"),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("GRID", (0, 0), (-1, -1), 0.6, colors.HexColor("#cfcfcf")),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f5f7fa")),
                ("TOPPADDING", (0, 1), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 1), (-1, -1), 8),
                ("VALIGN", (0, 1), (-1, -1), "TOP"),
            ]
        )
    )
    return tbl


def footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Arial", 8)
    canvas.setFillColor(colors.HexColor("#666666"))
    canvas.drawString(18 * mm, 10 * mm, "Yalinizlar Filo - Arac Kiralama Sozlesmesi")
    canvas.drawRightString(192 * mm, 10 * mm, f"Sayfa {doc.page}")
    canvas.restoreState()


register_fonts()
styles = getSampleStyleSheet()

STYLES = {
    "normal": ParagraphStyle(
        "normal",
        parent=styles["Normal"],
        fontName="Arial",
        fontSize=10,
        leading=14,
        alignment=TA_LEFT,
        spaceAfter=4,
    ),
    "small": ParagraphStyle(
        "small",
        parent=styles["Normal"],
        fontName="Arial",
        fontSize=8.5,
        leading=12,
        alignment=TA_LEFT,
    ),
    "section_title": ParagraphStyle(
        "section_title",
        parent=styles["Normal"],
        fontName="Arial-Bold",
        fontSize=11,
        textColor=colors.white,
        alignment=TA_LEFT,
    ),
    "header_left": ParagraphStyle(
        "header_left",
        parent=styles["Normal"],
        fontName="Arial-Bold",
        fontSize=16,
        textColor=colors.white,
        leading=20,
    ),
    "header_right": ParagraphStyle(
        "header_right",
        parent=styles["Normal"],
        fontName="Arial",
        fontSize=9,
        textColor=colors.white,
        alignment=TA_RIGHT,
        leading=13,
    ),
}


if OUTPUT_PATH.exists() and not BACKUP_PATH.exists():
    BACKUP_PATH.write_bytes(OUTPUT_PATH.read_bytes())

doc = SimpleDocTemplate(
    str(OUTPUT_PATH),
    pagesize=A4,
    leftMargin=18 * mm,
    rightMargin=18 * mm,
    topMargin=14 * mm,
    bottomMargin=16 * mm,
    title="Yalinizlar Filo Arac Kiralama Sozlesmesi",
)

page_width = A4[0] - doc.leftMargin - doc.rightMargin
today = datetime.now().strftime("%d.%m.%Y")

header = Table(
    [
        [
            Paragraph(
                "YALINIZLAR FILO<br/><font size='11'>ARAC KIRALAMA SOZLESMESI</font>",
                STYLES["header_left"],
            ),
            Paragraph(
                f"Sozlesme No: 2026044<br/>Duzenleme Tarihi: {today}<br/>Musteri Nushasi",
                STYLES["header_right"],
            ),
        ]
    ],
    colWidths=[page_width * 0.62, page_width * 0.38],
)
header.setStyle(
    TableStyle(
        [
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#1f2a37")),
            ("BOX", (0, 0), (-1, -1), 0.8, colors.HexColor("#1f2a37")),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 12),
            ("RIGHTPADDING", (0, 0), (-1, -1), 12),
            ("TOPPADDING", (0, 0), (-1, -1), 10),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ]
    )
)

terms = [
    "Bu sozlesme, Yalinizlar Filo ile kiraci arasinda arac kiralama kosullarini belirler.",
    "Kiralanan arac yalnizca sozlesmede belirtilen surucu/suruculer tarafindan kullanilabilir.",
    "Arac teslimati sirasinda mevcut hasarlar teslim formuna islenir; iade sirasinda ayni form esas alinir.",
    "Kiraci, trafik kurallarina ve ilgili mevzuata uymakla yukumludur. Yasal cezalar kiraciya aittir.",
    "Arac alkollu/uyusturucu etkisi altinda kullanilamaz; aksi durumda tum sorumluluk kiraciya aittir.",
    "Arac yurt disina cikarilamaz ve yazili onay olmaksizin ucuncu kisilere devredilemez.",
    "Kiralama surecine dahil kilometre limiti rezervasyon planina gore uygulanir; asim bedeli faturalanir.",
    "Yakit politikasi teslim seviyesinde iade esasina dayanir. Eksik yakit ve hizmet bedeli tahsil edilir.",
    "Trafik cezasi, otoyol/otopark gecisleri ve benzeri kamu borclari kiraci tarafindan odenir.",
    "Kazalarda kiraci derhal kolluk kuvvetlerine haber vermeli ve Yalinizlar Filo'yu bilgilendirmelidir.",
    "Kasko ve sigorta kapsam disi durumlarda olusan zararlar, ekspertiz raporu dogrultusunda kiraciya yansitilir.",
    "Aracin gec iadesinde, rezervasyon planina gore gecikme bedeli tahsil edilebilir.",
    "Kiraci, araci ticari tasima, yaris, cekme, tehlikeli yuk tasima gibi amaclarla kullanamaz.",
    "Yalinizlar Filo gerekli gordugunde uygun sinifta esdeger arac degisikligi yapabilir.",
    "Kisisel veriler KVKK kapsaminda islenir; aydinlatma metni ve acik riza kosullari musterinin bilgisine sunulur.",
    "Uyusmazliklarda Adana Mahkemeleri ve Icra Daireleri yetkilidir.",
]

story = [
    header,
    Spacer(1, 8),
    Paragraph(
        "Bu dokuman, 2026044 numarali arac kiralama islemi icin sifirdan hazirlanmis guncel sozlesme taslagidir.",
        STYLES["normal"],
    ),
    Spacer(1, 4),
    section_title("1) Taraf ve Iletisim Bilgileri", page_width),
    Spacer(1, 4),
    info_table(page_width),
    Spacer(1, 8),
    section_title("2) Arac ve Rezervasyon Bilgileri", page_width),
    Spacer(1, 4),
    vehicle_table(page_width),
    Spacer(1, 8),
    section_title("3) Ucretlendirme ve Kosullar", page_width),
    Spacer(1, 4),
    payment_table(page_width),
    Spacer(1, 10),
    section_title("4) Genel Hukumler", page_width),
    Spacer(1, 5),
]

for i, item in enumerate(terms, start=1):
    story.append(Paragraph(f"<b>{i}.</b> {item}", STYLES["normal"]))

story.extend(
    [
        Spacer(1, 10),
        Paragraph(
            "Kiraci, bu sozlesmeyi okuyup anladigini; teslim, iade, odeme ve hasar kosullarini kabul ettigini beyan eder.",
            STYLES["normal"],
        ),
        Spacer(1, 10),
        section_title("5) Imzalar", page_width),
        Spacer(1, 5),
        signature_table(page_width),
        Spacer(1, 8),
        Paragraph(
            "Adres: Adana, Turkiye  |  E-posta: info@yalinizlarfilo.com.tr  |  Web: www.yalinizlarfilo.com.tr",
            STYLES["small"],
        ),
    ]
)

doc.build(story, onFirstPage=footer, onLaterPages=footer)
print(f"Olusturuldu: {OUTPUT_PATH}")
if BACKUP_PATH.exists():
    print(f"Yedek: {BACKUP_PATH}")
