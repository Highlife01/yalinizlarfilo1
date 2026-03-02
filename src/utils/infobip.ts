import { doc, getDoc } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";

/**
 * Infobip ayarlarını Firestore'dan yükler.
 */
async function loadInfobipConfig() {
  const snap = await getDoc(doc(db, "settings", "api-keys"));
  if (!snap.exists()) throw new Error("Infobip API ayarları henüz kaydedilmedi. Ayarlar → API Entegrasyonu'ndan kaydedin.");
  const data = snap.data();

  const apiKey = data.infobipApiKey && String(data.infobipApiKey).trim();
  const baseUrl = data.infobipBaseUrl && String(data.infobipBaseUrl).trim();

  if (!apiKey) throw new Error("Infobip API Key bulunamadı. Ayarlar → API Entegrasyonu'ndan kaydedin.");
  if (!baseUrl) throw new Error("Infobip Base URL bulunamadı. Ayarlar → API Entegrasyonu'ndan kaydedin.");

  const sender = (data.infobipSender && String(data.infobipSender).trim()) || "YalinizlarFilo";

  return { apiKey, baseUrl, sender };
}

/**
 * Telefon numarasını uluslararası formata dönüştürür.
 * 05xx → 905xx, +90xxx → 90xxx
 */
function normalizePhone(phone: string): string {
  let p = phone.replace(/[\s\-()]/g, "");
  if (p.startsWith("+")) p = p.slice(1);
  if (p.startsWith("0")) p = "90" + p.slice(1);
  if (!p.startsWith("90") && p.length === 10) p = "90" + p;
  return p;
}

/**
 * Infobip üzerinden test SMS gönderir (client-side — doğrudan Infobip REST API).
 * NOT: Production'da CORS nedeniyle Firebase Function üzerinden gönderilmeli.
 * Test amaçlı doğrudan kullanılabilir — birçok Infobip plan CORS'a izin verir.
 */
export async function sendInfobipTestSms(to: string, text: string): Promise<{ messageId: string }> {
  const { apiKey, baseUrl, sender } = await loadInfobipConfig();
  const destination = normalizePhone(to);

  const url = `https://${baseUrl}/sms/2/text/advanced`;

  const body = {
    messages: [
      {
        destinations: [{ to: destination }],
        from: sender,
        text,
      },
    ],
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `App ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "Bilinmeyen hata");
    throw new Error(`Infobip SMS hatası (${response.status}): ${errText}`);
  }

  const result = await response.json();
  const msg = result?.messages?.[0];
  const status = msg?.status;

  if (status && status.groupId !== undefined && status.groupId > 3) {
    throw new Error(`Infobip SMS reddedildi: ${status.description || status.name || "Bilinmeyen hata"}`);
  }

  return { messageId: msg?.messageId || "unknown" };
}

/**
 * Infobip üzerinden SMS gönderir (genel kullanım).
 */
export async function sendInfobipSms(to: string, text: string, sender?: string): Promise<{ messageId: string }> {
  const config = await loadInfobipConfig();
  const destination = normalizePhone(to);
  const from = sender || config.sender;

  const url = `https://${config.baseUrl}/sms/2/text/advanced`;

  const body = {
    messages: [
      {
        destinations: [{ to: destination }],
        from,
        text,
      },
    ],
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `App ${config.apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "Bilinmeyen hata");
    throw new Error(`Infobip SMS hatası (${response.status}): ${errText}`);
  }

  const result = await response.json();
  const msg = result?.messages?.[0];

  return { messageId: msg?.messageId || "unknown" };
}
