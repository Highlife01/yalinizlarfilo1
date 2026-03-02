const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

// Admin emails are read from environment variables (.env file in functions/ directory).
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim())
  .filter(Boolean);

const DEFAULT_WA_API_VERSION = "v19.0";
const ISTANBUL_TIMEZONE = "Europe/Istanbul";
const AUTOMATION_LOG_COLLECTION = "automation_whatsapp_logs";

const ALLOWED_WHATSAPP_TEMPLATES = new Set([
  "yalinizlar_teklif",
  "yalinizlar_rezervasyon_onay",
  "yalinizlar_teslim_hatirlat",
  "yalinizlar_iade_uyari",
]);

function normalizePhoneNumber(rawPhone) {
  const onlyDigits = String(rawPhone || "").replace(/\D/g, "");
  if (!onlyDigits) return "";

  let normalized = onlyDigits;
  if (normalized.startsWith("0")) {
    normalized = normalized.slice(1);
  }
  if (!normalized.startsWith("90")) {
    normalized = `90${normalized}`;
  }
  return normalized;
}

function formatDateInTimezone(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;

  if (!year || !month || !day) return "";
  return `${year}-${month}-${day}`;
}

function normalizeDateValue(value) {
  if (!value) return "";
  const raw = String(value).trim();
  if (!raw) return "";
  if (raw.includes("T")) return raw.split("T")[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  return formatDateInTimezone(parsed, ISTANBUL_TIMEZONE);
}

function toTrDateLabel(isoDate) {
  if (!isoDate || !isoDate.includes("-")) return isoDate || "-";
  const [year, month, day] = isoDate.split("-");
  return `${day}.${month}.${year}`;
}

function splitVehicleName(vehicleName) {
  const cleanName = String(vehicleName || "").trim();
  if (!cleanName) return { brand: "Arac", model: "Arac" };

  const tokens = cleanName.split(/\s+/).filter(Boolean);
  if (tokens.length === 1) return { brand: tokens[0], model: tokens[0] };

  return {
    brand: tokens[0],
    model: tokens.slice(1).join(" "),
  };
}

async function getWhatsAppConfigFromSettings() {
  const db = admin.firestore();
  const settingsSnap = await db.collection("settings").doc("api-keys").get();
  if (settingsSnap.exists) {
    const data = settingsSnap.data() || {};
    if (data.whatsappToken && data.whatsappPhoneId) {
      return {
        accessToken: String(data.whatsappToken),
        phoneNumberId: String(data.whatsappPhoneId),
        apiVersion: String(data.whatsappApiVersion || DEFAULT_WA_API_VERSION),
      };
    }
  }

  const envToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const envPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (envToken && envPhoneId) {
    return {
      accessToken: String(envToken),
      phoneNumberId: String(envPhoneId),
      apiVersion: String(process.env.WHATSAPP_API_VERSION || DEFAULT_WA_API_VERSION),
    };
  }

  return null;
}

async function sendTemplateViaWhatsApp({ to, templateName, components }) {
  if (!ALLOWED_WHATSAPP_TEMPLATES.has(templateName)) {
    throw new Error("Unsupported WhatsApp template.");
  }

  const normalizedPhone = normalizePhoneNumber(to);
  if (!normalizedPhone) {
    throw new Error("Invalid phone number.");
  }

  const config = await getWhatsAppConfigFromSettings();
  if (!config) {
    throw new Error("WhatsApp settings are not configured.");
  }

  const requestBody = {
    messaging_product: "whatsapp",
    to: normalizedPhone,
    type: "template",
    template: {
      name: templateName,
      language: { code: "tr" },
      components: Array.isArray(components) ? components : [],
    },
  };

  // Doğru format: .../v19.0/PHONE_NUMBER_ID/messages — URL'de Meta'nın Phone Number ID'si kullanılır, telefon numarası (0505...) değil.
  const endpoint = `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.accessToken}`,
    },
    body: JSON.stringify(requestBody),
  });

  const responseJson = await response.json().catch(() => null);
  if (!response.ok) {
    const err = responseJson?.error || {};
    const metaMessage = (err.message || err.error_user_msg || "").toLowerCase();
    const code = err.code != null ? err.code : "";
    const subcode = err.error_subcode != null ? err.error_subcode : "";
    const detail = [(responseJson?.error?.message || ""), code ? `Kod: ${code}` : "", subcode ? `Alt kod: ${subcode}` : ""].filter(Boolean).join(" — ");
    const fullUrl = `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`;
    console.error("WhatsApp API error", {
      status: response.status,
      url: fullUrl,
      templateName,
      phoneNumberId: config.phoneNumberId,
      apiVersion: config.apiVersion,
      response: responseJson,
    });
    const isTemplateError = code === 132001 || code === 132000 || metaMessage.includes("template") && (metaMessage.includes("does not exist") || metaMessage.includes("translation"));
    if (isTemplateError) {
      throw new Error(
        "WhatsApp şablon hatası (132001): Bu şablon adı Meta tarafında yok veya onaylı değil. " +
        "Meta Business Suite > WhatsApp > Mesaj şablonları bölümünde aşağıdaki adlarla Türkçe (tr) şablon oluşturup onaylatın: " +
        "yalinizlar_teklif, yalinizlar_rezervasyon_onay, yalinizlar_teslim_hatirlat, yalinizlar_iade_uyari"
      );
    }
    if (response.status === 404) {
      throw new Error(
        "WhatsApp 404: Phone Number ID geçersiz veya bu uygulamaya ait değil. Meta for Developers > WhatsApp > API Setup sayfasındaki 'Phone number ID' değerini (numara yanında) kopyalayın. " +
        (detail ? ` Detay: ${detail}` : "")
      );
    }
    throw new Error(detail ? `WhatsApp API (${response.status}): ${detail}` : `WhatsApp API hatası (${response.status}).`);
  }

  return {
    ok: true,
    to: normalizedPhone,
    templateName,
    messageId: responseJson?.messages?.[0]?.id || null,
  };
}

// Basit metin mesajı ile test (şablon yok). Endpoint + token + Phone Number ID doğruluğunu kontrol etmek için.
async function sendTextViaWhatsApp(to, textBody) {
  const normalizedPhone = normalizePhoneNumber(to);
  if (!normalizedPhone) throw new Error("Geçersiz telefon numarası.");
  const config = await getWhatsAppConfigFromSettings();
  if (!config) throw new Error("WhatsApp ayarları yapılmamış.");
  const endpoint = `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`;
  const requestBody = {
    messaging_product: "whatsapp",
    to: normalizedPhone,
    type: "text",
    text: { body: String(textBody || "API test mesajı").slice(0, 4096) },
  };
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.accessToken}`,
    },
    body: JSON.stringify(requestBody),
  });
  const responseJson = await response.json().catch(() => null);
  if (!response.ok) {
    const err = responseJson?.error || {};
    const detail = [err.message, err.code, err.error_subcode].filter(Boolean).join(" — ");
    console.error("WhatsApp text test error", { status: response.status, endpoint, response: responseJson });
    throw new Error(detail ? `WhatsApp API (${response.status}): ${detail}` : `WhatsApp hatası (${response.status}).`);
  }
  return { ok: true, to: normalizedPhone, messageId: responseJson?.messages?.[0]?.id || null };
}

async function markAutomationSent(logId, payload) {
  await admin
    .firestore()
    .collection(AUTOMATION_LOG_COLLECTION)
    .doc(logId)
    .set({
      ...payload,
      createdAt: new Date().toISOString(),
    });
}

async function automationAlreadySent(logId) {
  const snap = await admin
    .firestore()
    .collection(AUTOMATION_LOG_COLLECTION)
    .doc(logId)
    .get();
  return snap.exists;
}

exports.setAdminRole = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST gerekli" });
    return;
  }

  const secret = process.env.ADMIN_SECRET || "yalinizlarfilo-setup";
  const body = req.body || {};
  const sentSecret = body.secret || (req.query && req.query.secret);
  if (sentSecret !== secret) {
    res.status(403).json({ error: "Gecersiz secret" });
    return;
  }

  const emails = Array.isArray(body.emails) ? body.emails : ADMIN_EMAILS;
  const auth = admin.auth();
  const db = admin.firestore();
  const results = [];

  for (const email of emails) {
    try {
      const user = await auth.getUserByEmail(email);
      await db.collection("users").doc(user.uid).set(
        { role: "admin", email: user.email },
        { merge: true }
      );
      results.push({ email, ok: true, uid: user.uid });
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        results.push({ email, ok: false, error: "Kullanici bulunamadi" });
      } else {
        results.push({ email, ok: false, error: err.message });
      }
    }
  }

  res.status(200).json({ message: "Islem tamamlandi", results });
});

exports.sendWhatsAppTemplate = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Authentication required."
    );
  }

  const db = admin.firestore();
  const userSnap = await db.collection("users").doc(context.auth.uid).get();
  if (!userSnap.exists || userSnap.data()?.role !== "admin") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Admin role required."
    );
  }

  const to = typeof data?.to === "string" ? data.to : "";
  const templateName =
    typeof data?.templateName === "string" ? data.templateName : "";
  const components = Array.isArray(data?.components) ? data.components : [];

  if (!to || !templateName) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "`to` and `templateName` are required."
    );
  }

  try {
    return await sendTemplateViaWhatsApp({ to, templateName, components });
  } catch (error) {
    throw new functions.https.HttpsError("internal", error.message);
  }
});

exports.sendWhatsAppTestMessage = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Authentication required.");
  }
  const db = admin.firestore();
  const userSnap = await db.collection("users").doc(context.auth.uid).get();
  if (!userSnap.exists || userSnap.data()?.role !== "admin") {
    throw new functions.https.HttpsError("permission-denied", "Admin role required.");
  }
  const to = typeof data?.to === "string" ? data.to.trim() : "";
  const text = typeof data?.text === "string" ? data.text.trim() : "API test mesajı";
  if (!to) {
    throw new functions.https.HttpsError("invalid-argument", "to (telefon numarası) gerekli.");
  }
  try {
    return await sendTextViaWhatsApp(to, text);
  } catch (error) {
    throw new functions.https.HttpsError("internal", error.message);
  }
});

exports.createOperationUser = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Authentication required."
    );
  }

  const db = admin.firestore();
  const callerSnap = await db.collection("users").doc(context.auth.uid).get();
  if (!callerSnap.exists || callerSnap.data()?.role !== "admin") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Admin role required."
    );
  }

  const email = String(data?.email || "").trim().toLowerCase();
  const password = String(data?.password || "").trim();
  const role = "operation";

  if (!email || !email.includes("@")) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Valid email is required."
    );
  }

  const auth = admin.auth();
  let userRecord = null;
  let mode = "existing";

  try {
    userRecord = await auth.getUserByEmail(email);
  } catch (error) {
    if (error.code !== "auth/user-not-found") {
      throw new functions.https.HttpsError(
        "internal",
        `Auth lookup failed: ${error.message}`
      );
    }
  }

  if (!userRecord) {
    if (!password || password.length < 6) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Password is required and must be at least 6 characters for new users."
      );
    }

    try {
      userRecord = await auth.createUser({
        email,
        password,
      });
      mode = "created";
    } catch (error) {
      throw new functions.https.HttpsError(
        "internal",
        `Auth create failed: ${error.message}`
      );
    }
  }

  await db.collection("users").doc(userRecord.uid).set(
    {
      email,
      role,
      updatedAt: new Date().toISOString(),
      updatedBy: context.auth.uid,
      ...(mode === "created"
        ? {
          createdAt: new Date().toISOString(),
          createdBy: context.auth.uid,
        }
        : {}),
    },
    { merge: true }
  );

  return {
    ok: true,
    mode,
    uid: userRecord.uid,
    email,
    role,
  };
});

exports.sendDailyWhatsAppReminders = functions.pubsub
  .schedule("0 9 * * *")
  .timeZone(ISTANBUL_TIMEZONE)
  .onRun(async () => {
    const db = admin.firestore();
    const todayIso = formatDateInTimezone(new Date(), ISTANBUL_TIMEZONE);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowIso = formatDateInTimezone(tomorrow, ISTANBUL_TIMEZONE);

    const bookingsSnap = await db.collection("bookings").get();
    let sentCount = 0;
    let skippedNoPhone = 0;
    let skippedNoMatch = 0;
    let errorCount = 0;

    for (const bookingDoc of bookingsSnap.docs) {
      const booking = { id: bookingDoc.id, ...bookingDoc.data() };
      const customerPhone = String(
        booking.customerPhone || booking.phone || ""
      ).trim();
      const customerName = String(booking.customerName || "Musterimiz");
      const vehiclePlate = String(booking.vehiclePlate || "-");
      const bookingStatus = String(booking.status || "").toLowerCase();
      const startDate = normalizeDateValue(booking.startDate);
      const endDate = normalizeDateValue(booking.endDate);
      const pickupTime = String(booking.pickupTime || "14:00");
      const pickupBranch = String(booking.pickupBranch || "Adana Merkez");
      const dropoffTime = String(booking.dropoffTime || "18:00");
      const dropoffBranch = String(booking.dropoffBranch || "Adana Merkez");
      const pickupMapLink = String(booking.pickupMapLink || "-");
      const { brand, model } = splitVehicleName(booking.vehicleName);

      if (!customerPhone) {
        skippedNoPhone += 1;
        continue;
      }

      let hasMatch = false;

      if (endDate === todayIso && bookingStatus === "active") {
        hasMatch = true;
        const logId = `iade_${booking.id}_${todayIso}`;
        const alreadySent = await automationAlreadySent(logId);
        if (!alreadySent) {
          try {
            await sendTemplateViaWhatsApp({
              to: customerPhone,
              templateName: "yalinizlar_iade_uyari",
              components: [
                {
                  type: "body",
                  parameters: [
                    { type: "text", text: customerName },
                    { type: "text", text: brand },
                    { type: "text", text: model },
                    { type: "text", text: vehiclePlate },
                    { type: "text", text: dropoffTime },
                    { type: "text", text: dropoffBranch },
                  ],
                },
              ],
            });

            await markAutomationSent(logId, {
              bookingId: booking.id,
              reminderType: "same_day_return",
              targetDate: todayIso,
              customerPhone,
            });
            sentCount += 1;
          } catch (error) {
            errorCount += 1;
            console.error("Daily return reminder failed", {
              bookingId: booking.id,
              error: error.message,
            });
          }
        }
      }

      if (
        startDate === tomorrowIso &&
        (bookingStatus === "pending" || bookingStatus === "active")
      ) {
        hasMatch = true;
        const logId = `teslim_${booking.id}_${todayIso}`;
        const alreadySent = await automationAlreadySent(logId);
        if (!alreadySent) {
          try {
            await sendTemplateViaWhatsApp({
              to: customerPhone,
              templateName: "yalinizlar_teslim_hatirlat",
              components: [
                {
                  type: "body",
                  parameters: [
                    { type: "text", text: customerName },
                    { type: "text", text: toTrDateLabel(startDate) },
                    { type: "text", text: pickupTime },
                    { type: "text", text: pickupBranch },
                    { type: "text", text: pickupMapLink || "-" },
                    { type: "text", text: `${brand} ${model}` },
                  ],
                },
              ],
            });

            await markAutomationSent(logId, {
              bookingId: booking.id,
              reminderType: "next_day_delivery",
              targetDate: tomorrowIso,
              customerPhone,
            });
            sentCount += 1;
          } catch (error) {
            errorCount += 1;
            console.error("Daily delivery reminder failed", {
              bookingId: booking.id,
              error: error.message,
            });
          }
        }
      }

      if (!hasMatch) {
        skippedNoMatch += 1;
      }
    }

    console.log("Daily WhatsApp reminders completed", {
      date: todayIso,
      sentCount,
      skippedNoPhone,
      skippedNoMatch,
      errorCount,
    });

    return null;
  });

// One-off helper: seed/update vehicles in Firestore based on static list (plates + insurance/kasko info)
const VEHICLE_SEED = [
  {
    plate: "01BFK267",
    name: "Opel Corsa 1.2 Hybrid 110 E-DCT6 Edition",
    category: "Ekonomik",
    passengers: 5,
  },
  {
    plate: "01BFK268",
    name: "Opel Corsa 1.2 Hybrid 110 E-DCT6 Edition",
    category: "Ekonomik",
    passengers: 5,
  },
  {
    plate: "01BFK269",
    name: "Opel Corsa 1.2 Hybrid 110 E-DCT6 Edition",
    category: "Ekonomik",
    passengers: 5,
  },
  {
    plate: "01BFK270",
    name: "Opel Corsa 1.2 Hybrid 110 E-DCT6 Edition",
    category: "Ekonomik",
    passengers: 5,
  },
  {
    plate: "01BFK271",
    name: "Opel Corsa 1.2 Hybrid 110 E-DCT6 Edition",
    category: "Ekonomik",
    passengers: 5,
  },
  {
    plate: "01BFK272",
    name: "Opel Corsa 1.2 Hybrid 110 E-DCT6 Edition",
    category: "Ekonomik",
    passengers: 5,
  },
  {
    plate: "01BFK273",
    name: "Opel Corsa 1.2 Hybrid 110 E-DCT6 Edition",
    category: "Ekonomik",
    passengers: 5,
  },
  {
    plate: "01BFK274",
    name: "Citroen C3 Aircross Max 1.2 Hybrid 145 eDCS6",
    category: "SUV",
    passengers: 5,
  },
  {
    plate: "01BFK275",
    name: "Opel Corsa 1.2 Hybrid 110 E-DCT6 Edition",
    category: "Ekonomik",
    passengers: 5,
  },
  {
    plate: "01BFK393",
    name: "Opel Corsa 1.2 Hybrid 110 E-DCT6 Edition",
    category: "Ekonomik",
    passengers: 5,
  },
  {
    plate: "01BFK394",
    name: "Opel Corsa 1.2 Hybrid 110 E-DCT6 Edition",
    category: "Ekonomik",
    passengers: 5,
  },
  {
    plate: "01BFK395",
    name: "Opel Corsa 1.2 Hybrid 110 E-DCT6 Edition",
    category: "Ekonomik",
    passengers: 5,
  },
  {
    plate: "01BFK409",
    name: "Opel Corsa 1.2 Hybrid 110 E-DCT6 Edition",
    category: "Ekonomik",
    passengers: 5,
  },
];

exports.seedVehiclesFromPolicyData = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST gerekli" });
    return;
  }

  const secret = process.env.ADMIN_SECRET || "yalinizlarfilo-setup";
  const body = req.body || {};
  const sentSecret = body.secret || (req.query && req.query.secret);
  if (sentSecret !== secret) {
    res.status(403).json({ error: "Gecersiz secret" });
    return;
  }

  const db = admin.firestore();
  const batch = db.batch();

  for (const vehicle of VEHICLE_SEED) {
    const docId = String(vehicle.plate).replace(/\s+/g, "");
    const ref = db.collection("vehicles").doc(docId);

    batch.set(
      ref,
      {
        name: vehicle.name,
        category: vehicle.category,
        plate: vehicle.plate,
        status: "active",
        fuel: "Hibrit",
        transmission: "Otomatik",
        price: "0",
        passengers: vehicle.passengers,
        insurance_company: "SOMPO SİGORTA A.Ş.",
        insurance_start_date: "2026-02-23",
        insurance_end_date: "2027-02-18",
        casco_company: "UNICO SİGORTA A.Ş.",
        casco_start_date: "2026-02-25",
        casco_end_date: "2027-02-18",
      },
      { merge: true }
    );
  }

  await batch.commit();

  res.status(200).json({
    ok: true,
    message: "Vehicles seeded/updated from policy data.",
    count: VEHICLE_SEED.length,
  });
});

// Tek plakalı aracın kasko başlangıç/bitiş tarihlerini güncelle (query: plate, casco_start_date, casco_end_date)
exports.updateVehicleCascoDates = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST gerekli" });
    return;
  }

  const secret = process.env.ADMIN_SECRET || "yalinizlarfilo-setup";
  const body = req.body || {};
  const q = req.query || {};
  const sentSecret = body.secret || q.secret;
  if (sentSecret !== secret) {
    res.status(403).json({ error: "Gecersiz secret" });
    return;
  }

  const plate = String(body.plate || q.plate || "").replace(/\s+/g, "").toUpperCase();
  const casco_start_date = String(body.casco_start_date || q.casco_start_date || "2026-02-25").trim();
  const casco_end_date = String(body.casco_end_date || q.casco_end_date || "2027-02-18").trim();

  if (!plate) {
    res.status(400).json({ error: "plate gerekli (ornek: 01BFK274)" });
    return;
  }

  const db = admin.firestore();
  const docId = plate;
  const ref = db.collection("vehicles").doc(docId);

  const snap = await ref.get();
  if (!snap.exists) {
    res.status(404).json({ error: "Arac bulunamadi: " + plate });
    return;
  }

  const updatePayload = {
    casco_start_date,
    casco_end_date,
    casco_company: snap.data()?.casco_company || "UNICO SİGORTA A.Ş.",
  };

  // 01BFK274 için marka/model ve segmenti de poliçe bilgilerine göre güncelle
  if (plate === "01BFK274") {
    updatePayload.name = "Citroen C3 Aircross Max 1.2 Hybrid 145 eDCS6";
    updatePayload.category = "SUV";
    updatePayload.fuel = "Hibrit";
    updatePayload.transmission = "Otomatik";
    updatePayload.passengers = 5;
  }

  await ref.update(updatePayload);

  res.status(200).json({
    ok: true,
    message: "Kasko tarihleri guncellendi.",
    plate: docId,
    casco_start_date,
    casco_end_date,
  });
});

// ======================================================
// SEYİR MOBİL GPS PROXY
// Tarayıcıdan SOAP çağrısı CORS'a çarptığı için
// Cloud Function üzerinden proxy ediyoruz.
// ======================================================
exports.getSeyirMobilGPS = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Authentication required.");
  }

  const db = admin.firestore();
  const userSnap = await db.collection("users").doc(context.auth.uid).get();
  if (!userSnap.exists || userSnap.data()?.role !== "admin") {
    throw new functions.https.HttpsError("permission-denied", "Admin role required.");
  }

  const SEYIR_USER = "highlife01";
  const SEYIR_PASS = "gQovch3E";
  const ENDPOINT = "https://ws.seyirmobil.com/LocationService.asmx";

  const soapBody = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:tem="http://tempuri.org/">
  <soap:Header/>
  <soap:Body>
    <tem:GetActualLocations>
      <tem:user_name>${SEYIR_USER}</tem:user_name>
      <tem:password>${SEYIR_PASS}</tem:password>
    </tem:GetActualLocations>
  </soap:Body>
</soap:Envelope>`;

  let response;
  try {
    response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/soap+xml; charset=utf-8",
        "SOAPAction": "http://tempuri.org/GetActualLocations",
      },
      body: soapBody,
    });
  } catch (err) {
    throw new functions.https.HttpsError("unavailable", `Seyir Mobil bağlantı hatası: ${err.message}`);
  }

  const xmlText = await response.text();

  if (!response.ok) {
    throw new functions.https.HttpsError("internal", `Seyir Mobil HTTP ${response.status}: ${xmlText.slice(0, 300)}`);
  }

  // XML'den araç verilerini parse et
  function extractTagValue(str, tag) {
    const match = str.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
    return match ? match[1].trim() : "";
  }

  // Her <Table ...> bloğunu ayrıştır
  const tableMatches = xmlText.match(/<Table\s[^>]*>([\s\S]*?)<\/Table>/g) || [];

  const vehicles = tableMatches.map((block) => ({
    device_id: extractTagValue(block, "device_id"),
    vehicle: extractTagValue(block, "vehicle"),         // plaka
    data_time: extractTagValue(block, "data_time"),
    is_gps_active: extractTagValue(block, "is_gps_active"),
    is_vehicle_running: extractTagValue(block, "is_vehicle_running"),
    latitude: extractTagValue(block, "latitude"),
    longitude: extractTagValue(block, "longitude"),
    speed: extractTagValue(block, "speed"),
    address: extractTagValue(block, "address"),
    total_km: extractTagValue(block, "total_km"),
    fuel_level: extractTagValue(block, "fuel_level"),
    driver: extractTagValue(block, "driver"),
    daily_km: extractTagValue(block, "daily_km"),
    daily_fuel: extractTagValue(block, "daily_fuel"),
    province: extractTagValue(block, "province"),
    district: extractTagValue(block, "district"),
  })).filter((v) => v.vehicle); // boş plakaları filtrele

  return { ok: true, count: vehicles.length, vehicles };
});

