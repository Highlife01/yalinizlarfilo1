import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/integrations/firebase/client";

const firebaseFunctions = getFunctions(app);
const sendWhatsAppTemplateCallable = httpsCallable(
  firebaseFunctions,
  "sendWhatsAppTemplate"
);
const sendWhatsAppTestMessageCallable = httpsCallable(
  firebaseFunctions,
  "sendWhatsAppTestMessage"
);

type WhatsAppParameter = {
  type: "text";
  text: string;
};

type WhatsAppComponent = {
  type: "body";
  parameters: WhatsAppParameter[];
};

type SendWhatsAppResult = {
  ok: boolean;
  to: string;
  templateName: string;
  messageId: string | null;
};

export async function sendWhatsApp(
  to: string,
  templateName: string,
  components: WhatsAppComponent[]
) {
  try {
    const response = await sendWhatsAppTemplateCallable({
      to,
      templateName,
      components,
    });
    const payload = response.data as SendWhatsAppResult;

    if (!payload?.ok) {
      throw new Error("WhatsApp gönderimi başarısız.");
    }

    return payload;
  } catch (error) {
    console.error(`WhatsApp gönderim hatası (${templateName})`, error);
    throw error;
  }
}

export function getWhatsAppErrorDescription(rawMessage?: string) {
  const msg = String(rawMessage || "").trim();
  const lower = msg.toLowerCase();

  if (
    lower.includes("error validating access token") ||
    lower.includes("invalid access token") ||
    lower.includes("kod: 190") ||
    lower.includes("alt kod: 467")
  ) {
    return "WhatsApp Access Token gecersiz veya suresi dolmus. Ayarlar > API Entegrasyonu'ndan yeni kalici Access Token girip tekrar deneyin.";
  }

  if (lower.includes("not configured") || lower.includes("configured")) {
    return "WhatsApp ayarlari eksik. Ayarlar > API Entegrasyonu bolumunden Access Token ve Phone Number ID girin.";
  }

  if (lower.includes("404") || lower.includes("phone number id")) {
    return `${msg} Ayarlar > API Entegrasyonu icinde Phone Number ID degerini Meta for Developers > WhatsApp > API Setup ekranindan kopyalayin.`;
  }

  return msg || "Mesaj gonderilirken hata olustu.";
}

/** Şablon kullanmadan basit metin mesajı gönderir. Endpoint + token + Phone Number ID testi için. */
export async function sendWhatsAppTestMessage(to: string, text?: string) {
  const response = await sendWhatsAppTestMessageCallable({ to, text: text || "API test mesajı" });
  const payload = response.data as { ok: boolean; to: string; messageId: string | null };
  if (!payload?.ok) throw new Error("Test mesajı gönderilemedi.");
  return payload;
}

// AKIS 1: Teklif
export async function sendTeklif(musteri: {
  telefon: string;
  ad: string;
  aracTipi: string;
  sure: number;
  baslangicTarihi: string;
  fiyat: number;
}) {
  return sendWhatsApp(musteri.telefon, "yalinizlar_teklif", [
    {
      type: "body",
      parameters: [
        { type: "text", text: musteri.ad },
        { type: "text", text: musteri.aracTipi },
        { type: "text", text: `${musteri.sure} gün` },
        { type: "text", text: musteri.baslangicTarihi },
        { type: "text", text: `${musteri.fiyat} TL` },
      ],
    },
  ]);
}

// AKIS 2: Rezervasyon Onayi
export async function sendRezervasyonOnay(rezervasyon: {
  telefon: string;
  musteriAd: string;
  no: string;
  marka: string;
  model: string;
  plaka: string;
  teslimTarihi: string;
  teslimSaati: string;
  teslimYeri: string;
}) {
  return sendWhatsApp(rezervasyon.telefon, "yalinizlar_rezervasyon_onay", [
    {
      type: "body",
      parameters: [
        { type: "text", text: rezervasyon.musteriAd },
        { type: "text", text: rezervasyon.no },
        { type: "text", text: `${rezervasyon.marka} ${rezervasyon.model}` },
        { type: "text", text: rezervasyon.plaka },
        { type: "text", text: rezervasyon.teslimTarihi },
        { type: "text", text: rezervasyon.teslimSaati },
        { type: "text", text: rezervasyon.teslimYeri },
      ],
    },
  ]);
}

// AKIS 3: Teslim Hatirlatma
export async function sendTeslimHatirlatma(rezervasyon: {
  telefon: string;
  musteriAd: string;
  teslimTarihi: string;
  teslimSaati: string;
  teslimAdresi: string;
  haritaLinki: string;
  marka: string;
  model: string;
}) {
  return sendWhatsApp(rezervasyon.telefon, "yalinizlar_teslim_hatirlat", [
    {
      type: "body",
      parameters: [
        { type: "text", text: rezervasyon.musteriAd },
        { type: "text", text: rezervasyon.teslimTarihi },
        { type: "text", text: rezervasyon.teslimSaati },
        { type: "text", text: rezervasyon.teslimAdresi },
        { type: "text", text: rezervasyon.haritaLinki || "-" },
        { type: "text", text: `${rezervasyon.marka} ${rezervasyon.model}` },
      ],
    },
  ]);
}

// AKIS 4: Iade Uyarisi
export async function sendIadeUyari(rezervasyon: {
  telefon: string;
  musteriAd: string;
  marka: string;
  model: string;
  plaka: string;
  iadeSaati: string;
  iadeAdresi: string;
}) {
  return sendWhatsApp(rezervasyon.telefon, "yalinizlar_iade_uyari", [
    {
      type: "body",
      parameters: [
        { type: "text", text: rezervasyon.musteriAd },
        { type: "text", text: rezervasyon.marka },
        { type: "text", text: rezervasyon.model },
        { type: "text", text: rezervasyon.plaka },
        { type: "text", text: rezervasyon.iadeSaati },
        { type: "text", text: rezervasyon.iadeAdresi },
      ],
    },
  ]);
}
