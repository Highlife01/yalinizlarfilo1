import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Save, Lock, Globe, Mail, Key, Bot, Loader2, Send } from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { auth, db } from "@/integrations/firebase/client";
import { EmployeeManagement } from "@/components/admin/EmployeeManagement";
import { sendWhatsAppTestMessage, getWhatsAppErrorDescription } from "@/utils/whatsapp";
import { sendInfobipTestSms } from "@/utils/infobip";
import { MessageSquare } from "lucide-react";

type GeneralSettings = {
  siteName: string;
  description: string;
  contactEmail: string;
  contactPhone: string;
};

const DEFAULT_GENERAL_SETTINGS: GeneralSettings = {
  siteName: "Yalınızlar Filo",
  description: "Adana'nın güvenilir araç kiralama filosu.",
  contactEmail: "info@yalinizlarfilo.com.tr",
  contactPhone: "0531 392 47 69",
};

const TAB_VALUES = ["general", "api", "security", "employees"] as const;

export const Settings = () => {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<string>((TAB_VALUES as readonly string[]).includes(tabFromUrl || "") ? tabFromUrl! : "general");
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>(DEFAULT_GENERAL_SETTINGS);

  const [passwordData, setPasswordData] = useState({
    current: "",
    new: "",
    confirm: "",
  });

  const [apiKeys, setApiKeys] = useState({
    gemini: "",
    minimax: "",
    openai: "",
    whatsappToken: "",
    whatsappPhoneId: "",
    whatsappApiVersion: "",
    infobipApiKey: "",
    infobipBaseUrl: "",
    infobipSender: "",
  });

  const [loadingGeneral, setLoadingGeneral] = useState(true);
  const [isGeneralSaving, setIsGeneralSaving] = useState(false);
  const [isApiSaving, setIsApiSaving] = useState(false);
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);
  const [whatsappTestPhone, setWhatsappTestPhone] = useState("905320550945");
  const [whatsappTestSending, setWhatsappTestSending] = useState(false);
  const [savedWhatsAppToken, setSavedWhatsAppToken] = useState(false);
  const [savedWhatsAppPhoneIdHint, setSavedWhatsAppPhoneIdHint] = useState("");
  const [savedInfobipApiKey, setSavedInfobipApiKey] = useState(false);
  const [savedInfobipBaseUrlHint, setSavedInfobipBaseUrlHint] = useState("");
  const [savedInfobipSenderHint, setSavedInfobipSenderHint] = useState("");
  const [infobipTestPhone, setInfobipTestPhone] = useState("905320550945");
  const [infobipTestSending, setInfobipTestSending] = useState(false);

  useEffect(() => {
    if (tabFromUrl && (TAB_VALUES as readonly string[]).includes(tabFromUrl)) setActiveTab(tabFromUrl);
  }, [tabFromUrl]);

  useEffect(() => {
    const loadGeneralSettings = async () => {
      setLoadingGeneral(true);
      try {
        const snap = await getDoc(doc(db, "settings", "general"));
        if (!snap.exists()) return;

        const data = snap.data();
        setGeneralSettings({
          siteName: String(data.siteName || DEFAULT_GENERAL_SETTINGS.siteName),
          description: String(data.description || DEFAULT_GENERAL_SETTINGS.description),
          contactEmail: String(data.contactEmail || DEFAULT_GENERAL_SETTINGS.contactEmail),
          contactPhone: String(data.contactPhone || DEFAULT_GENERAL_SETTINGS.contactPhone),
        });
      } catch (error) {
        console.error("General settings load error:", error);
        toast({
          title: "Hata",
          description: "Genel ayarlar yüklenemedi.",
          variant: "destructive",
        });
      } finally {
        setLoadingGeneral(false);
      }
    };

    void loadGeneralSettings();
  }, [toast]);

  useEffect(() => {
    const loadApiKeysHints = async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "api-keys"));
        if (!snap.exists()) return;
        const data = snap.data() || {};
        setSavedWhatsAppToken(!!(data.whatsappToken && String(data.whatsappToken).length > 0));
        const pid = data.whatsappPhoneId && String(data.whatsappPhoneId).trim();
        if (pid) {
          const len = pid.length;
          setSavedWhatsAppPhoneIdHint(len > 4 ? `••••${pid.slice(-4)}` : "••••");
        } else {
          setSavedWhatsAppPhoneIdHint("");
        }
        // Infobip hints
        setSavedInfobipApiKey(!!(data.infobipApiKey && String(data.infobipApiKey).length > 0));
        const ibu = data.infobipBaseUrl && String(data.infobipBaseUrl).trim();
        setSavedInfobipBaseUrlHint(ibu || "");
        const isnd = data.infobipSender && String(data.infobipSender).trim();
        setSavedInfobipSenderHint(isnd || "");
      } catch {
        // ignore
      }
    };
    void loadApiKeysHints();
  }, []);

  const handleGeneralSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGeneralSaving(true);
    try {
      const payload = {
        siteName: generalSettings.siteName.trim(),
        description: generalSettings.description.trim(),
        contactEmail: generalSettings.contactEmail.trim(),
        contactPhone: generalSettings.contactPhone.trim(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, "settings", "general"), payload, { merge: true });
      toast({ title: "Başarılı", description: "Genel ayarlar kaydedildi." });
    } catch (error) {
      console.error("General settings save error:", error);
      toast({
        title: "Hata",
        description: "Genel ayarlar kaydedilemedi.",
        variant: "destructive",
      });
    } finally {
      setIsGeneralSaving(false);
    }
  };

  const mapPasswordError = (code: string) => {
    switch (code) {
      case "auth/wrong-password":
      case "auth/invalid-credential":
        return "Mevcut şifre hatalı.";
      case "auth/weak-password":
        return "Yeni şifre çok zayıf.";
      case "auth/too-many-requests":
        return "Çok fazla deneme yapıldı. Lütfen sonra tekrar deneyin.";
      case "auth/requires-recent-login":
        return "Lütfen yeniden giriş yapıp tekrar deneyin.";
      default:
        return code ? `Şifre güncellenemedi. (${code})` : "Şifre güncellenemedi.";
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordData.current || !passwordData.new || !passwordData.confirm) {
      toast({
        title: "Eksik bilgi",
        description: "Tüm şifre alanlarını doldurun.",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.new !== passwordData.confirm) {
      toast({
        title: "Hata",
        description: "Şifreler eşleşmiyor.",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.new.length < 6) {
      toast({
        title: "Hata",
        description: "Yeni şifre en az 6 karakter olmalıdır.",
        variant: "destructive",
      });
      return;
    }

    const user = auth.currentUser;
    if (!user || !user.email) {
      toast({
        title: "Hata",
        description: "Aktif kullanıcı bulunamadı. Lütfen tekrar giriş yapın.",
        variant: "destructive",
      });
      return;
    }

    setIsPasswordSaving(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, passwordData.current);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, passwordData.new);

      setPasswordData({ current: "", new: "", confirm: "" });
      toast({ title: "Başarılı", description: "Şifre başarıyla güncellendi." });
    } catch (error: unknown) {
      const code =
        error && typeof error === "object" && "code" in error
          ? String((error as { code?: string }).code)
          : "";

      console.error("Password update error:", error);
      toast({
        title: "Hata",
        description: mapPasswordError(code),
        variant: "destructive",
      });
    } finally {
      setIsPasswordSaving(false);
    }
  };

  const handleApiKeysSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsApiSaving(true);
    try {
      const payload: Record<string, string> = {};
      const gemini = apiKeys.gemini.trim();
      const minimax = apiKeys.minimax.trim();
      const openai = apiKeys.openai.trim();
      const whatsappToken = apiKeys.whatsappToken.trim();
      const whatsappPhoneId = apiKeys.whatsappPhoneId.trim();
      const whatsappApiVersion = apiKeys.whatsappApiVersion.trim();
      const infobipApiKey = apiKeys.infobipApiKey.trim();
      const infobipBaseUrl = apiKeys.infobipBaseUrl.trim();
      const infobipSender = apiKeys.infobipSender.trim();

      if (gemini) payload.gemini = gemini;
      if (minimax) payload.minimax = minimax;
      if (openai) payload.openai = openai;
      if (whatsappToken) payload.whatsappToken = whatsappToken;
      if (whatsappPhoneId) payload.whatsappPhoneId = whatsappPhoneId;
      if (whatsappApiVersion) payload.whatsappApiVersion = whatsappApiVersion;
      if (infobipApiKey) payload.infobipApiKey = infobipApiKey;
      if (infobipBaseUrl) payload.infobipBaseUrl = infobipBaseUrl;
      if (infobipSender) payload.infobipSender = infobipSender;

      if (Object.keys(payload).length === 0) {
        toast({
          title: "Bilgi",
          description: "Kaydedilecek yeni bir API anahtarı bulunamadı.",
        });
        return;
      }

      await setDoc(doc(db, "settings", "api-keys"), payload, { merge: true });
      setApiKeys((prev) => ({
        ...prev,
        gemini: "",
        minimax: "",
        openai: "",
        whatsappToken: "",
        whatsappPhoneId: "",
        whatsappApiVersion: "",
        infobipApiKey: "",
        infobipBaseUrl: "",
        infobipSender: "",
      }));
      if (payload.whatsappToken) setSavedWhatsAppToken(true);
      if (payload.whatsappPhoneId) {
        const pid = String(payload.whatsappPhoneId);
        setSavedWhatsAppPhoneIdHint(pid.length > 4 ? `••••${pid.slice(-4)}` : "••••");
      }
      if (payload.infobipApiKey) setSavedInfobipApiKey(true);
      if (payload.infobipBaseUrl) setSavedInfobipBaseUrlHint(payload.infobipBaseUrl);
      if (payload.infobipSender) setSavedInfobipSenderHint(payload.infobipSender);
      toast({
        title: "Başarılı",
        description: "API anahtarları başarıyla güncellendi.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Hata",
        description: "API anahtarları güncellenirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsApiSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Ayarlar</h2>
        <p className="text-slate-500">Sistem yapılandırması ve hesap ayarları.</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSearchParams(v === "general" ? {} : { tab: v }); }} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-8">
          <TabsTrigger value="general">Genel Ayarlar</TabsTrigger>
          <TabsTrigger value="api">API Entegrasyonu</TabsTrigger>
          <TabsTrigger value="security">Güvenlik</TabsTrigger>
          <TabsTrigger value="employees">Personel Yönetimi</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Genel Bilgiler</CardTitle>
              <CardDescription>
                Web sitesi başlığı, açıklama ve iletişim bilgileri.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleGeneralSave}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Site Başlığı</Label>
                  <div className="relative">
                    <Globe className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      className="pl-9"
                      value={generalSettings.siteName}
                      onChange={(e) =>
                        setGeneralSettings({ ...generalSettings, siteName: e.target.value })
                      }
                      disabled={loadingGeneral || isGeneralSaving}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Site Açıklaması</Label>
                  <Input
                    value={generalSettings.description}
                    onChange={(e) =>
                      setGeneralSettings({ ...generalSettings, description: e.target.value })
                    }
                    disabled={loadingGeneral || isGeneralSaving}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>İletişim E-posta</Label>
                    <div className="relative">
                      <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                      <Input
                        className="pl-9"
                        value={generalSettings.contactEmail}
                        onChange={(e) =>
                          setGeneralSettings({
                            ...generalSettings,
                            contactEmail: e.target.value,
                          })
                        }
                        disabled={loadingGeneral || isGeneralSaving}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>İletişim Telefon</Label>
                    <Input
                      value={generalSettings.contactPhone}
                      onChange={(e) =>
                        setGeneralSettings({
                          ...generalSettings,
                          contactPhone: e.target.value,
                        })
                      }
                      disabled={loadingGeneral || isGeneralSaving}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t px-6 py-4 bg-slate-50/50">
                <Button type="submit" disabled={loadingGeneral || isGeneralSaving}>
                  {isGeneralSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Değişiklikleri Kaydet
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="api">
          <Card>
            <CardHeader>
              <CardTitle>API Ayarları</CardTitle>
              <CardDescription>
                Güvenlik nedeniyle mevcut API anahtarları ekranda gösterilmez.
                Yalnızca değiştirmek istediğiniz değeri tekrar girin.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleApiKeysSave}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Google Gemini API Anahtarı</Label>
                  <div className="relative">
                    <Key className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      type="password"
                      placeholder="Yeni Gemini API key"
                      className="pl-9"
                      value={apiKeys.gemini}
                      onChange={(e) => setApiKeys({ ...apiKeys, gemini: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>MiniMax API Anahtarı</Label>
                  <div className="relative">
                    <Bot className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      type="password"
                      placeholder="Yeni MiniMax API key"
                      className="pl-9"
                      value={apiKeys.minimax}
                      onChange={(e) => setApiKeys({ ...apiKeys, minimax: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>OpenAI API Anahtarı (Opsiyonel)</Label>
                  <div className="relative">
                    <Key className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      type="password"
                      placeholder="Yeni OpenAI key"
                      className="pl-9"
                      value={apiKeys.openai}
                      onChange={(e) => setApiKeys({ ...apiKeys, openai: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t">
                  <h4 className="font-medium text-slate-900 flex items-center gap-2">
                    WhatsApp Business API Ayarları
                  </h4>
                  <p className="text-xs text-slate-500">
                    132001 alıyorsanız: Meta Business Suite → WhatsApp → Mesaj şablonları bölümünde Türkçe (tr) şablonlar oluşturun. Aşağıdaki ad ve gövde metinlerini birebir kullanın.
                  </p>
                  <details className="text-xs text-slate-600 bg-slate-50 rounded p-3 border border-slate-200">
                    <summary className="cursor-pointer font-medium text-slate-800">Meta’da oluşturacağınız 4 şablon (dil: Türkçe)</summary>
                    <ul className="mt-2 space-y-3 list-none pl-0">
                      <li>
                        <strong>1. yalinizlar_teklif</strong> (Teklif) — Body: <span className="text-slate-600">Merhaba {"{{1}}"}, {"{{2}}"} için {"{{3}}"} süreyle {"{{4}}"} tarihinden itibaren teklifiniz: {"{{5}}"}.</span>
                      </li>
                      <li>
                        <strong>2. yalinizlar_rezervasyon_onay</strong> (Rezervasyon onayı) — Body: <span className="text-slate-600">Sayın {"{{1}}"}, Rezervasyon no: {"{{2}}"}. Araç: {"{{3}}"}, Plaka: {"{{4}}"}. Teslim: {"{{5}}"} {"{{6}}"}, {"{{7}}"}. Yalınızlar Filo.</span>
                      </li>
                      <li>
                        <strong>3. yalinizlar_teslim_hatirlat</strong> (Teslim hatırlatma) — Body: <span className="text-slate-600">Sayın {"{{1}}"}, {"{{2}}"} tarihinde {"{{3}}"}’te teslim alacaksınız. Adres: {"{{4}}"}. Harita: {"{{5}}"}. Araç: {"{{6}}"}. Yalınızlar Filo.</span>
                      </li>
                      <li>
                        <strong>4. yalinizlar_iade_uyari</strong> (İade uyarısı) — Body: <span className="text-slate-600">Sayın {"{{1}}"}, {"{{2}}"} {"{{3}}"} ({"{{4}}"}) aracını {"{{5}}"}’te {"{{6}}"} adresinde iade ediniz. Yalınızlar Filo.</span>
                      </li>
                    </ul>
                    <p className="mt-2 text-slate-500">Şablon adları küçük harf ve alt çizgi ile birebir aynı olmalı. Onaylandıktan sonra müşterilere mesaj gitmeye başlar.</p>
                  </details>
                </div>

                <div className="space-y-2">
                  <Label>WhatsApp Access Token</Label>
                  {savedWhatsAppToken && (
                    <p className="text-xs text-green-600 font-medium">Mevcut: Access Token kayıtlı (güvenlik nedeniyle değer gösterilmez)</p>
                  )}
                  <div className="relative">
                    <Key className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      type="password"
                      placeholder={savedWhatsAppToken ? "Değiştirmek için yeni token girin" : "Yeni WhatsApp Access Token"}
                      className="pl-9"
                      value={apiKeys.whatsappToken}
                      onChange={(e) =>
                        setApiKeys({ ...apiKeys, whatsappToken: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>WhatsApp Phone Number ID</Label>
                  {savedWhatsAppPhoneIdHint && (
                    <p className="text-xs text-green-600 font-medium">Mevcut: Phone Number ID {savedWhatsAppPhoneIdHint}</p>
                  )}
                  <p className="text-xs text-slate-500">
                    ⚠️ Buraya <strong>telefon numarası yazılmaz</strong>. Meta for Developers → WhatsApp → API Setup sayfasındaki <strong>Phone number ID</strong> (örn. 1005283639338640) kopyalanmalı. Endpoint: graph.facebook.com/v19.0/<strong>PHONE_NUMBER_ID</strong>/messages
                  </p>
                  <div className="relative">
                    <Bot className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      type="text"
                      placeholder={savedWhatsAppPhoneIdHint ? "Değiştirmek için yeni Phone Number ID girin" : "Meta Phone Number ID (örn. 1005283639338640)"}
                      className="pl-9"
                      value={apiKeys.whatsappPhoneId}
                      onChange={(e) =>
                        setApiKeys({ ...apiKeys, whatsappPhoneId: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>WhatsApp API Sürümü (opsiyonel)</Label>
                  <p className="text-xs text-slate-500">Boş bırakılırsa v19.0 kullanılır. 404 devam ederse v18.0 veya v17.0 deneyin.</p>
                  <Input
                    type="text"
                    placeholder="v19.0"
                    value={apiKeys.whatsappApiVersion}
                    onChange={(e) =>
                      setApiKeys({ ...apiKeys, whatsappApiVersion: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2 pt-4 border-t">
                  <Label>Basit metin ile test (şablon yok)</Label>
                  <p className="text-xs text-slate-500">
                    Test mesajı <strong>yazdığınız numaraya</strong> gider (alıcı). Endpoint, token ve Phone Number ID doğruluğunu kontrol eder.
                  </p>
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                    <strong>Mesaj gelmiyorsa:</strong> WhatsApp kuralları gereği serbest metin sadece <strong>alıcı son 24 saat içinde sizin iş numaranıza (0531 392 47 69) WhatsApp’tan mesaj attıysa</strong> iletilir. Önce 0532… numarasından 0531 392 47 69’a bir mesaj atın, ardından buradan test gönderin; mesaj 24 saat penceresinde gider.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Alıcı numara: 905320550945"
                      value={whatsappTestPhone}
                      onChange={(e) => setWhatsappTestPhone(e.target.value)}
                      disabled={whatsappTestSending}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={whatsappTestSending || !whatsappTestPhone.trim()}
                      onClick={async () => {
                        setWhatsappTestSending(true);
                        try {
                          await sendWhatsAppTestMessage(whatsappTestPhone.trim(), "API test mesajı");
                          toast({
                            title: "İstek kabul edildi",
                            description: "Meta isteği kabul etti. Mesajın iletilmesi için alıcının son 24 saatte sizin WhatsApp iş numaranıza (0531 392 47 69) yazmış olması gerekir.",
                          });
                        } catch (err: unknown) {
                          const msg = err && typeof err === "object" && "message" in err ? String((err as { message?: string }).message) : "Gönderilemedi.";
                          toast({ title: "WhatsApp Hatası", description: getWhatsAppErrorDescription(msg), variant: "destructive" });
                        } finally {
                          setWhatsappTestSending(false);
                        }
                      }}
                    >
                      {whatsappTestSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Test mesajı gönder
                    </Button>
                  </div>
                </div>

                {/* ─── Infobip SMS API ─── */}
                <div className="space-y-2 pt-4 border-t">
                  <h4 className="font-medium text-slate-900 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Infobip SMS API Ayarları
                  </h4>
                  <p className="text-xs text-slate-500">
                    <a href="https://portal.infobip.com/onboarding-guide/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Infobip Portal</a> üzerinden API Key ve Base URL bilgilerinizi alabilirsiniz.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Infobip API Key</Label>
                  {savedInfobipApiKey && (
                    <p className="text-xs text-green-600 font-medium">Mevcut: API Key kayıtlı (güvenlik nedeniyle değer gösterilmez)</p>
                  )}
                  <div className="relative">
                    <Key className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      type="password"
                      placeholder={savedInfobipApiKey ? "Değiştirmek için yeni API Key girin" : "Infobip API Key"}
                      className="pl-9"
                      value={apiKeys.infobipApiKey}
                      onChange={(e) => setApiKeys({ ...apiKeys, infobipApiKey: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Infobip Base URL</Label>
                  {savedInfobipBaseUrlHint && (
                    <p className="text-xs text-green-600 font-medium">Mevcut: {savedInfobipBaseUrlHint}</p>
                  )}
                  <p className="text-xs text-slate-500">
                    Infobip portalınızdaki Base URL (örn. <code>xxxxx.api.infobip.com</code>)
                  </p>
                  <div className="relative">
                    <Globe className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      type="text"
                      placeholder={savedInfobipBaseUrlHint || "örn. 8vgp6e.api.infobip.com"}
                      className="pl-9"
                      value={apiKeys.infobipBaseUrl}
                      onChange={(e) => setApiKeys({ ...apiKeys, infobipBaseUrl: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Gönderici Numarası / Sender ID (opsiyonel)</Label>
                  {savedInfobipSenderHint && (
                    <p className="text-xs text-green-600 font-medium">Mevcut: {savedInfobipSenderHint}</p>
                  )}
                  <p className="text-xs text-slate-500">
                    SMS gönderici adı veya numara. Boş bırakılırsa Infobip varsayılan gönderici kullanır.
                  </p>
                  <Input
                    type="text"
                    placeholder="YalinizlarFilo"
                    value={apiKeys.infobipSender}
                    onChange={(e) => setApiKeys({ ...apiKeys, infobipSender: e.target.value })}
                  />
                </div>

                <div className="space-y-2 pt-4 border-t">
                  <Label>Infobip SMS Test</Label>
                  <p className="text-xs text-slate-500">
                    Kayıtlı Infobip API bilgilerinizle test SMS'i gönderin.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Alıcı numara: 905320550945"
                      value={infobipTestPhone}
                      onChange={(e) => setInfobipTestPhone(e.target.value)}
                      disabled={infobipTestSending}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={infobipTestSending || !infobipTestPhone.trim()}
                      onClick={async () => {
                        setInfobipTestSending(true);
                        try {
                          await sendInfobipTestSms(infobipTestPhone.trim(), "Yalınızlar Filo SMS test mesajı.");
                          toast({
                            title: "SMS Gönderildi",
                            description: "Infobip üzerinden test SMS'i başarıyla gönderildi.",
                          });
                        } catch (err: unknown) {
                          const msg = err && typeof err === "object" && "message" in err ? String((err as { message?: string }).message) : "SMS gönderilemedi.";
                          toast({ title: "Infobip Hatası", description: msg, variant: "destructive" });
                        } finally {
                          setInfobipTestSending(false);
                        }
                      }}
                    >
                      {infobipTestSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Test SMS Gönder
                    </Button>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t px-6 py-4 bg-slate-50/50">
                <Button type="submit" disabled={isApiSaving}>
                  {isApiSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Değişiklikleri Kaydet
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Şifre ve Güvenlik</CardTitle>
              <CardDescription>Yönetici şifrenizi buradan güncelleyebilirsiniz.</CardDescription>
            </CardHeader>
            <form onSubmit={handlePasswordUpdate}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Mevcut Şifre</Label>
                  <div className="relative">
                    <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      type="password"
                      className="pl-9"
                      value={passwordData.current}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, current: e.target.value })
                      }
                      disabled={isPasswordSaving}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Yeni Şifre</Label>
                    <Input
                      type="password"
                      value={passwordData.new}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, new: e.target.value })
                      }
                      disabled={isPasswordSaving}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Yeni Şifre (Tekrar)</Label>
                    <Input
                      type="password"
                      value={passwordData.confirm}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, confirm: e.target.value })
                      }
                      disabled={isPasswordSaving}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t px-6 py-4 bg-slate-50/50">
                <Button type="submit" variant="destructive" disabled={isPasswordSaving}>
                  {isPasswordSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Lock className="mr-2 h-4 w-4" />
                  )}
                  Şifreyi Güncelle
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
        <TabsContent value="employees">
          <EmployeeManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
};


