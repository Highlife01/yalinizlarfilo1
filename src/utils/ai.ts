import { db } from "@/integrations/firebase/client";
import { doc, getDoc } from "firebase/firestore";

/**
 * Fetches the Gemini API key from Firestore settings.
 */
async function getGeminiApiKey(): Promise<string> {
    try {
        const snap = await getDoc(doc(db, "settings", "api-keys"));
        if (snap.exists()) {
            return snap.data().gemini || "";
        }
    } catch (e) {
        console.error("Error fetching Gemini API key:", e);
    }
    return "";
}

/**
 * Converts a File object to a base64 string and mime type for Gemini.
 */
async function fileToGenerativePart(file: File): Promise<{ inlineData: { data: string; mimeType: string } }> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = (reader.result as string).split(",")[1];
            resolve({
                inlineData: {
                    data: base64,
                    mimeType: file.type,
                },
            });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

export type OcrResult = {
    name?: string;
    tckn?: string;
    driverLicenseNo?: string;
    driverLicenseClass?: string;
    idIssueDate?: string;
    address?: string;
    birthDate?: string;
    idSerialNo?: string;
};

/**
 * Analyzes a document image (ID or Driver License) using Gemini Vision.
 */
export async function analyzeDocumentOcr(file: File): Promise<OcrResult | null> {
    const apiKey = await getGeminiApiKey();
    if (!apiKey) {
        throw new Error("Gemini API key is not configured in settings.");
    }

    const model = "gemini-2.0-flash"; // Fast and capable vision model
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const mediaPart = await fileToGenerativePart(file);
    const prompt = `
        Sen bir profesyonel OCR asistanısın. Ekli fotoğraftaki Kimlik Kartı veya Sürücü Belgesi bilgilerini oku.
        Lütfen aşağıdaki bilgileri JSON formatında döndür. Eğer bir bilgiyi okuyamıyorsan boş bırak veya null yaz.
        
        İstenen Alanlar (JSON keys):
        - name (Ad Soyad)
        - tckn (TC Kimlik No - 11 haneli)
        - driverLicenseNo (Belge/Ehliyet No)
        - driverLicenseClass (Ehliyet Sınıfı örn: B)
        - idIssueDate (Veriliş Tarihi örn: GG/AA/YYYY)
        - idSerialNo (Seri No)
        - address (Adres - eğer varsa)
        - birthDate (Doğum Tarihi)

        Sadece geçerli bir JSON objesi döndür, başka açıklama yazma.
    `;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            { text: prompt },
                            mediaPart,
                        ],
                    },
                ],
                generationConfig: {
                    responseMimeType: "application/json",
                },
            }),
        });

        const result = await response.json();
        const content = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (content) {
            return JSON.parse(content) as OcrResult;
        }
    } catch (error) {
        console.error("Gemini OCR Error:", error);
    }
    return null;
}

/**
 * Compares current damage photos with previous ones.
 */
export async function analyzeDamageComparison(currentFile: File, previousPhotoUrls: string[]): Promise<string> {
    const apiKey = await getGeminiApiKey();
    if (!apiKey) return "AI anahtarı eksik.";

    const model = "gemini-2.0-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const currentPart = await fileToGenerativePart(currentFile);
    
    // For now, we mainly analyze the current photo for damage detection
    const prompt = `
        Sen bir araç hasar uzmanısın. Ekli araç fotoğrafını incele. 
        Fotoğrafta yeni bir hasar (çizik, göçük, çatlak) görüyor musun?
        Lütfen çok kısa (en fazla 2 cümle) ve profesyonel bir Türkçe ile analizini yaz. 
        Eğer hasar yoksa "Yeni bir hasar tespit edilmedi" de.
    `;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            { text: prompt },
                            currentPart,
                        ],
                    },
                ],
            }),
        });

        const result = await response.json();
        return result.candidates?.[0]?.content?.parts?.[0]?.text || "Analiz yapılamadı.";
    } catch (error) {
        console.error("Gemini Damage Analysis Error:", error);
        return "AI analizi sırasında hata oluştu.";
    }
}
