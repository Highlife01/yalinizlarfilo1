import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { collection, getDocs } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app, db } from "@/integrations/firebase/client";
import { Loader2, Shield, UserCog, UserPlus } from "lucide-react";

type EmployeeRow = {
  id: string;
  email: string;
  role: string;
};

type CreateOperationUserResult = {
  ok: boolean;
  mode: "created" | "existing";
  uid: string;
  email: string;
  role: "operation";
};

const firebaseFunctions = getFunctions(app);
const createOperationUserCallable = httpsCallable(
  firebaseFunctions,
  "createOperationUser"
);

export const EmployeeManagement = () => {
  const { toast } = useToast();
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "users"));
      const rows = snapshot.docs.map((d) => ({
        id: d.id,
        email: String(d.data().email || "Bilinmiyor"),
        role: String(d.data().role || "user"),
      })) as EmployeeRow[];

      setEmployees(rows.filter((r) => r.role === "operation" || r.role === "admin"));
    } catch (error) {
      console.error("Personel yukleme hatasi:", error);
      toast({
        title: "Hata",
        description: "Personel listesi yuklenemedi.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchEmployees();
  }, []);

  const sortedEmployees = useMemo(() => {
    return [...employees].sort((a, b) => {
      if (a.role !== b.role) {
        if (a.role === "admin") return -1;
        if (b.role === "admin") return 1;
      }
      return a.email.localeCompare(b.email, "tr");
    });
  }, [employees]);

  const handleCreateOperationUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const email = formData.email.trim().toLowerCase();
    const password = formData.password.trim();

    if (!email) {
      toast({
        title: "Eksik bilgi",
        description: "E-posta zorunludur.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const response = await createOperationUserCallable({
        email,
        password,
      });
      const payload = response.data as CreateOperationUserResult;

      if (!payload?.ok) {
        throw new Error("Personel olusturma islemi basarisiz.");
      }

      toast({
        title: "Basarili",
        description:
          payload.mode === "created"
            ? "Yeni operasyon personeli olusturuldu."
            : "Mevcut kullanicinin rolu operation olarak guncellendi.",
      });

      setFormData({ email: "", password: "" });
      await fetchEmployees();
    } catch (error: unknown) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: string }).message)
          : "Personel olusturulamadi.";

      console.error("Personel ekleme hatasi:", error);
      toast({
        title: "Hata",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Personel Ekle
          </CardTitle>
          <CardDescription>
            Yeni personel olusturur. E-posta daha once kayitliysa, kullanici olusturmaz ve
            rolunu otomatik olarak operation yapar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateOperationUser} className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="employee-email">Personel E-posta</Label>
              <Input
                id="employee-email"
                type="email"
                placeholder="personel@yalinizlarfilo.com.tr"
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employee-password">Sifre (yeni hesap icin)</Label>
              <Input
                id="employee-password"
                type="password"
                placeholder="En az 6 karakter"
                value={formData.password}
                onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
              />
            </div>
            <div className="md:col-span-3 flex justify-end">
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Kaydediliyor...
                  </>
                ) : (
                  "Operation Personeli Ekle"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Personel Listesi</CardTitle>
          <CardDescription>
            Admin ve operasyon rolundeki kullanicilar listelenir.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : (
            <div className="border rounded-md divide-y">
              {sortedEmployees.length === 0 && (
                <p className="p-4 text-center text-sm text-muted-foreground">Personel bulunamadi.</p>
              )}
              {sortedEmployees.map((employee) => (
                <div key={employee.id} className="flex items-center justify-between p-4 bg-white">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 rounded-full">
                      {employee.role === "admin" ? (
                        <Shield className="w-4 h-4 text-primary" />
                      ) : (
                        <UserCog className="w-4 h-4 text-blue-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm text-slate-900">{employee.email}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {employee.role === "admin" ? "Yonetici" : "Operasyon Sorumlusu"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
