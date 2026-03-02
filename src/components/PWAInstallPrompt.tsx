import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "pwa-install-dismissed-at";
const DISMISS_DAYS = 7;
const INSTALL_PROMPT_DELAY_MS = 30000;
const IOS_PROMPT_DELAY_MS = 10000;

const isPromptDismissedRecently = () => {
    const value = localStorage.getItem(DISMISS_KEY);
    if (!value) return false;
    const timestamp = Number(value);
    if (Number.isNaN(timestamp)) return false;
    return Date.now() - timestamp < DISMISS_DAYS * 24 * 60 * 60 * 1000;
};

const isStandaloneMode = () => {
    const mediaStandalone = window.matchMedia("(display-mode: standalone)").matches;
    const nav = window.navigator as Navigator & { standalone?: boolean };
    const iosStandalone = nav.standalone === true;
    return mediaStandalone || iosStandalone;
};

export const PWAInstallPrompt = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [isIOSFallback, setIsIOSFallback] = useState(false);

    const isIOS = useMemo(() => /iPad|iPhone|iPod/.test(window.navigator.userAgent), []);

    useEffect(() => {
        if (isStandaloneMode() || isPromptDismissedRecently()) return;

        if (isIOS) {
            const timer = window.setTimeout(() => {
                setIsIOSFallback(true);
                setShowPrompt(true);
            }, IOS_PROMPT_DELAY_MS);
            return () => window.clearTimeout(timer);
        }

        const onBeforeInstallPrompt = (event: Event) => {
            event.preventDefault();
            setDeferredPrompt(event as BeforeInstallPromptEvent);

            window.setTimeout(() => {
                if (!isPromptDismissedRecently() && !isStandaloneMode()) {
                    setShowPrompt(true);
                }
            }, INSTALL_PROMPT_DELAY_MS);
        };

        const onAppInstalled = () => {
            setShowPrompt(false);
            setDeferredPrompt(null);
            setIsIOSFallback(false);
        };

        window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
        window.addEventListener("appinstalled", onAppInstalled);

        return () => {
            window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
            window.removeEventListener("appinstalled", onAppInstalled);
        };
    }, [isIOS]);

    const handleInstall = async () => {
        if (!deferredPrompt) return;

        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === "accepted") {
            setShowPrompt(false);
            setIsIOSFallback(false);
            localStorage.removeItem(DISMISS_KEY);
        }

        setDeferredPrompt(null);
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        setDeferredPrompt(null);
        setIsIOSFallback(false);
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
    };

    if (!showPrompt) {
        return null;
    }

    const promptText = isIOSFallback
        ? "iPhone/iPad için: Paylaş > Ana Ekrana Ekle adımlarını kullanın."
        : "Ana ekrana ekleyerek daha hızlı erişin ve uygulamayı daha stabil kullanın.";

    return (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-5">
            <Card className="p-4 shadow-lg border-primary">
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Download className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-sm mb-1">Uygulamayı Yükle</h3>
                        <p className="text-xs text-muted-foreground mb-3">{promptText}</p>
                        <div className="flex gap-2">
                            {!isIOSFallback && deferredPrompt && (
                                <Button size="sm" onClick={() => void handleInstall()}>
                                    Yükle
                                </Button>
                            )}
                            <Button size="sm" variant="ghost" onClick={handleDismiss}>
                                Şimdi Değil
                            </Button>
                        </div>
                    </div>
                    <button
                        onClick={handleDismiss}
                        className="flex-shrink-0 text-muted-foreground hover:text-foreground"
                        aria-label="Kapat"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </Card>
        </div>
    );
};
