import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/integrations/firebase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Car, Lock, Mail, Loader2 } from "lucide-react";

export default function Auth() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setCheckingAuth(false);
        return;
      }

      try {
        const userSnap = await getDoc(doc(db, "users", user.uid));
        const role = userSnap.exists() ? userSnap.data()?.role : null;
        if (role === "admin" || role === "operation") {
          navigate("/admin");
          return;
        }

        await signOut(auth);
      } catch (error) {
        console.error("Auth role check failed:", error);
        await signOut(auth).catch(() => undefined);
      } finally {
        setCheckingAuth(false);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const userSnap = await getDoc(doc(db, "users", credential.user.uid));
      const role = userSnap.exists() ? userSnap.data()?.role : null;

      if (role !== "admin" && role !== "operation") {
        await signOut(auth);
        toast({
          title: "Yetkisiz giris",
          description: "Yonetim paneline sadece yetkili kullanicilar erisebilir.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Giris basarili",
        description: "Yonetim paneline yonlendiriliyorsunuz...",
      });
      // Auth state listener redirects.
    } catch (error: unknown) {
      const code =
        error && typeof error === "object" && "code" in error
          ? String((error as { code?: string }).code)
          : "";

      toast({
        title: "Giris hatasi",
        description: mapAuthError(code),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const mapAuthError = (code: string) => {
    switch (code) {
      case "auth/invalid-email":
        return "Gecersiz e-posta adresi.";
      case "auth/user-disabled":
        return "Bu kullanici hesabi devre disi birakilmis.";
      case "auth/user-not-found":
        return "Kullanici bulunamadi.";
      case "auth/wrong-password":
      case "auth/invalid-credential":
        return "E-posta veya sifre hatali.";
      case "auth/too-many-requests":
        return "Cok fazla deneme yapildi. Lutfen daha sonra tekrar deneyin.";
      default:
        return code ? `Bir hata olustu. (${code})` : "Bir hata olustu.";
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <Card className="w-full max-w-md shadow-2xl border-slate-700 bg-slate-900/50 backdrop-blur-xl text-slate-100">
        <CardHeader className="space-y-4 pb-8">
          <div className="mx-auto w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-2">
            <Car className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-3xl text-center font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-primary">
            Filo Yonetimi
          </CardTitle>
          <CardDescription className="text-center text-slate-400 text-lg">
            Yonetim paneline hos geldiniz
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignIn} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="signin-email" className="text-slate-300">E-posta</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <Input
                  id="signin-email"
                  type="email"
                  placeholder="ornek@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-primary focus:ring-primary/20"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="signin-password">Sifre</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <Input
                  id="signin-password"
                  type="password"
                  placeholder="********"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-primary focus:ring-primary/20"
                />
              </div>
            </div>
            <p className="text-xs text-slate-400">
              Yeni kullanici kaydi kapalidir. Erisim icin yonetici ile iletisime gecin.
            </p>
            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-white h-11 text-base shadow-lg shadow-primary/20"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Giris yapiliyor...
                </>
              ) : (
                "Giris Yap"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
