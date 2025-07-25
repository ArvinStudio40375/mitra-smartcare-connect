import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Register = () => {
  const [formData, setFormData] = useState({
    owner_name: "",
    business_name: "",
    business_type: "",
    phone_number: "",
    email: "",
    address: "",
    city: "",
    province: "",
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from("partners")
        .insert([{
          ...formData,
          status: "pending",
          verification_status: "pending",
          balance: 0,
          commission_rate: 15.0
        }]);

      if (error) throw error;

      toast({
        title: "Pendaftaran Berhasil!",
        description: "Akun mitra Anda telah terdaftar. Silakan tunggu verifikasi dari admin.",
      });

      navigate("/login");
    } catch (error: any) {
      toast({
        title: "Pendaftaran Gagal",
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
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary-glow rounded-full flex items-center justify-center mx-auto shadow-lg">
            <span className="text-2xl font-bold text-white">SC</span>
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">Daftar Mitra</CardTitle>
          <CardDescription>
            Bergabunglah dengan SmartCare sebagai mitra terpercaya
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="owner_name">Nama Pemilik</Label>
              <Input
                id="owner_name"
                name="owner_name"
                value={formData.owner_name}
                onChange={handleChange}
                required
                className="border-muted focus:border-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="business_name">Nama Usaha</Label>
              <Input
                id="business_name"
                name="business_name"
                value={formData.business_name}
                onChange={handleChange}
                required
                className="border-muted focus:border-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="business_type">Jenis Usaha</Label>
              <Input
                id="business_type"
                name="business_type"
                value={formData.business_type}
                onChange={handleChange}
                placeholder="Klinik, Apotek, Rumah Sakit, dll"
                required
                className="border-muted focus:border-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone_number">Nomor WhatsApp</Label>
              <Input
                id="phone_number"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleChange}
                placeholder="08xxxxxxxxxx"
                required
                className="border-muted focus:border-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="border-muted focus:border-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Alamat</Label>
              <Input
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                required
                className="border-muted focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">Kota</Label>
                <Input
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  required
                  className="border-muted focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="province">Provinsi</Label>
                <Input
                  id="province"
                  name="province"
                  value={formData.province}
                  onChange={handleChange}
                  required
                  className="border-muted focus:border-primary"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
              variant="medical"
              size="lg"
            >
              {loading ? "Mendaftar..." : "Daftar Sebagai Mitra"}
            </Button>

            <div className="text-center">
              <span className="text-sm text-muted-foreground">
                Sudah punya akun?{" "}
                <Link to="/login" className="text-primary hover:underline font-medium">
                  Masuk di sini
                </Link>
              </span>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;