#!/usr/bin/env python3
"""Extract insurance data from PDF files in combo sigorta kasko folder."""
import fitz, os, glob, re, json

folder = r"c:\Users\cebra\Downloads\YALINIZLAR FİLO EVRAKLAR\combo sigorta kasko"
files = glob.glob(os.path.join(folder, "*.PDF"))

for f in sorted(files):
    name = os.path.basename(f)
    doc = fitz.open(f)
    all_text = ""
    for page in doc:
        all_text += page.get_text() + "\n"
    doc.close()

    # Extract plate from filename (most reliable)
    plate_from_name = re.match(r"(\d+[A-Z]+\d+)", name)
    plate = plate_from_name.group(1) if plate_from_name else "N/A"

    # Plate from text (verify)
    plate_txt = re.search(r"Plaka\s*(?:No)?\s*[\n:]+\s*(\d+[A-Z]+\d+)", all_text)
    if not plate_txt:
        plate_txt = re.search(r"PLAKA\s*:\s*(\w+)", all_text)
    if plate_txt:
        plate = plate_txt.group(1)

    # Dates
    start_m = re.search(r"(?:Ba\u015Flama Tarihi|BA\u015ELAMA TAR\u0130H\u0130)\s*[:.\n]*\s*(\d{2}/\d{2}/\d{4})", all_text)
    end_m = re.search(r"(?:Biti\u015F Tarihi|B\u0130T\u0130\u015E TAR\u0130H\u0130)\s*[:.\n]*\s*(\d{2}/\d{2}/\d{4})", all_text)

    # Company
    company = "N/A"
    if "UNICO" in all_text.upper() or "Unico" in all_text:
        company = "Unico Sigorta A.S."
    elif "NEOVA" in all_text.upper() or "Neova" in all_text:
        company = "Neova Katilim Sigorta A.S."

    # Policy no
    pol_m = re.search(r"Poli\u00E7e\s*No\s*[\n:]*\s*(\d+)", all_text)
    if not pol_m:
        pol_m = re.search(r"(\d{9,})\s*/\s*\d", all_text)

    # Type
    doc_type = "KASKO" if "KASKO" in name.upper() else "TRAFIK"

    # Sasi
    sasi_m = re.search(r"(W0VE[\w]+)", all_text)

    pno = pol_m.group(1) if pol_m else "N/A"
    sd = start_m.group(1) if start_m else "N/A"
    ed = end_m.group(1) if end_m else "N/A"
    sn = sasi_m.group(1) if sasi_m else "N/A"

    print(f"{name}")
    print(f"  Plaka: {plate}")
    print(f"  Tur: {doc_type}")
    print(f"  Sirket: {company}")
    print(f"  Police No: {pno}")
    print(f"  Baslama: {sd}")
    print(f"  Bitis: {ed}")
    print(f"  Sasi: {sn}")
    print()
