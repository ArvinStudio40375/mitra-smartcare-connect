import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle } from "lucide-react";

const Login = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Cek data mitra berdasarkan email
      const { data: partner, error: partnerError } = await supabase
        .from("partners")
        .select("*")
        .eq("email", formData.email)
        .single();

      if (partnerError || !partner) {
        throw new Error("Email tidak terdaftar sebagai mitra");
      }

      // Cek status verifikasi
      if (partner.verification_status === "pending") {
        toast({
          title: "Akun Belum Diverifikasi",
          description: "Akun Anda belum diverifikasi oleh admin. Silakan tunggu konfirmasi.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Simulasi password check (dalam production harus pakai auth yang proper)
      if (formData.password.length < 6) {
        throw new Error("Password minimal 6 karakter");
      }

      // Simpan data mitra ke localStorage
      localStorage.setItem("currentPartner", JSON.stringify(partner));

      toast({
        title: "Login Berhasil!",
        description: "Selamat datang di dashboard mitra SmartCare",
        variant: "default",
      });

      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Login Gagal",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-0 bg-white/95 backdrop-blur">
        <CardHeader className="text-center space-y-2">
          <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary-glow rounded-full flex items-center justify-center mx-auto shadow-lg">
            <span className="text-3xl font-bold text-white">SC</span>
          </div>
          <CardTitle className="text-3xl font-bold text-foreground">Masuk Mitra</CardTitle>
          <CardDescription>
            Akses dashboard mitra SmartCare Anda
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="email@example.com"
                required
                className="border-muted focus:border-primary h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Kata Sandi</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Masukkan kata sandi"
                required
                className="border-muted focus:border-primary h-12"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
              variant="medical"
              size="lg"
            >
              {loading ? "Masuk..." : "Masuk"}
            </Button>

            <div className="text-center">
              <span className="text-sm text-muted-foreground">
                Belum punya akun mitra?{" "}
                <Link to="/register" className="text-primary hover:underline font-medium">
                  Daftar di sini
                </Link>
              </span>
            </div>

            {/* Info untuk testing */}
            <div className="mt-6 p-4 bg-muted/50 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-success" />
                <span className="text-muted-foreground">
                  Status Verified: Dapat masuk dashboard
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <AlertCircle className="w-4 h-4 text-warning" />
                <span className="text-muted-foreground">
                  Status Pending: Menunggu verifikasi admin
                </span>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;