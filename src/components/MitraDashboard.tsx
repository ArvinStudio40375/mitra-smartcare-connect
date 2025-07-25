import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Home, 
  ClipboardList, 
  Briefcase, 
  CreditCard, 
  MessageCircle, 
  User, 
  LogOut,
  Clock,
  CheckCircle,
  AlertCircle,
  Wallet,
  Timer,
  Phone,
  MapPin,
  Calendar
} from "lucide-react";
import LiveChat from "./LiveChat";
import InvoiceModal from "./InvoiceModal";

interface Partner {
  id: string;
  owner_name: string;
  business_name: string;
  business_type: string;
  phone_number: string;
  email: string;
  address: string;
  city: string;
  province: string;
  balance: number;
  verification_status: string;
  status: string;
}

interface Order {
  id: string;
  order_number: string;
  service_name: string;
  service_price: number;
  commission_amount: number;
  total_amount: number;
  status: string;
  payment_status: string;
  created_at: string;
  schedule_date?: string;
  schedule_time?: string;
  address?: string;
  customer_notes?: string;
  partner_notes?: string;
}

const MitraDashboard = () => {
  const [currentPartner, setCurrentPartner] = useState<Partner | null>(null);
  const [activeTab, setActiveTab] = useState("beranda");
  const [orders, setOrders] = useState<Order[]>([]);
  const [myJobs, setMyJobs] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [topupData, setTopupData] = useState({
    amount: "",
    name: "",
    whatsapp: ""
  });
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [workingOrders, setWorkingOrders] = useState<{[key: string]: { startTime: Date, timer: number }}>({});
  
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const partnerData = localStorage.getItem("currentPartner");
    if (!partnerData) {
      navigate("/login");
      return;
    }
    
    const partner = JSON.parse(partnerData);
    setCurrentPartner(partner);
    setTopupData(prev => ({
      ...prev,
      name: partner.owner_name,
      whatsapp: partner.phone_number
    }));
    
    loadOrders();
    loadMyJobs();
  }, [navigate]);

  const loadOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Gagal memuat data pesanan",
        variant: "destructive",
      });
    }
  };

  const loadMyJobs = async () => {
    if (!currentPartner) return;
    
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("partner_id", currentPartner.id)
        .in("status", ["confirmed", "in_progress", "completed"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMyJobs(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Gagal memuat pekerjaan saya",
        variant: "destructive",
      });
    }
  };

  const acceptOrder = async (order: Order) => {
    if (!currentPartner) return;

    const requiredBalance = order.service_price * 0.15;
    if (currentPartner.balance < requiredBalance) {
      toast({
        title: "Saldo Tidak Mencukupi",
        description: `Maaf, saldo anda kurang dari 15% dari pesanan (Rp ${requiredBalance.toLocaleString()}). Silakan top up terlebih dahulu.`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("orders")
        .update({
          partner_id: currentPartner.id,
          status: "confirmed"
        })
        .eq("id", order.id);

      if (error) throw error;

      toast({
        title: "Pesanan Diterima!",
        description: "Anda telah menerima pesanan ini",
      });

      loadOrders();
      loadMyJobs();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Gagal menerima pesanan",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const startWork = (orderId: string) => {
    setWorkingOrders(prev => ({
      ...prev,
      [orderId]: {
        startTime: new Date(),
        timer: 0
      }
    }));

    // Update status ke in_progress
    supabase
      .from("orders")
      .update({ status: "in_progress" })
      .eq("id", orderId)
      .then(() => {
        toast({
          title: "Pekerjaan Dimulai",
          description: "Timer telah dimulai",
        });
        loadMyJobs();
      });

    // Start timer
    const interval = setInterval(() => {
      setWorkingOrders(prev => {
        if (!prev[orderId]) {
          clearInterval(interval);
          return prev;
        }
        return {
          ...prev,
          [orderId]: {
            ...prev[orderId],
            timer: prev[orderId].timer + 1
          }
        };
      });
    }, 1000);
  };

  const finishWork = async (order: Order) => {
    if (!currentPartner) return;

    setLoading(true);
    try {
      // Update status pesanan
      const { error: orderError } = await supabase
        .from("orders")
        .update({ status: "completed" })
        .eq("id", order.id);

      if (orderError) throw orderError;

      // Potong saldo mitra
      const commissionAmount = order.service_price * 0.15;
      const newBalance = currentPartner.balance - commissionAmount;

      const { error: partnerError } = await supabase
        .from("partners")
        .update({ balance: newBalance })
        .eq("id", currentPartner.id);

      if (partnerError) throw partnerError;

      // Update current partner balance
      setCurrentPartner(prev => prev ? { ...prev, balance: newBalance } : null);
      localStorage.setItem("currentPartner", JSON.stringify({ ...currentPartner, balance: newBalance }));

      // Remove from working orders
      setWorkingOrders(prev => {
        const newState = { ...prev };
        delete newState[order.id];
        return newState;
      });

      toast({
        title: "Pekerjaan Selesai!",
        description: `Komisi Rp ${commissionAmount.toLocaleString()} telah dipotong dari saldo Anda`,
      });

      loadMyJobs();
      
      // Show invoice
      showInvoice(order);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Gagal menyelesaikan pekerjaan",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const showInvoice = (order: Order) => {
    // This will be handled by InvoiceModal component
    console.log("Showing invoice for order:", order.order_number);
  };

  const submitTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPartner) return;

    const amount = parseFloat(topupData.amount);
    if (amount < 50000) {
      toast({
        title: "Nominal Tidak Valid",
        description: "Minimal top up Rp 50.000",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("topup_requests")
        .insert([{
          user_id: currentPartner.id,
          user_type: "partner",
          amount: amount,
          payment_method: "transfer",
          nama_mitra: topupData.name,
          no_wa: topupData.whatsapp,
          status: "pending"
        }]);

      if (error) throw error;

      toast({
        title: "Permintaan Top Up Terkirim",
        description: "Silakan hubungi admin di 081299660660",
      });

      setShowTopupModal(false);
      setTopupData(prev => ({ ...prev, amount: "" }));
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Gagal mengirim permintaan top up",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const logout = () => {
    localStorage.removeItem("currentPartner");
    navigate("/login");
  };

  if (!currentPartner) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Memuat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary via-primary-glow to-secondary shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30">
                <span className="text-xl font-bold text-white">SC</span>
              </div>
              <div>
                <h1 className="font-bold text-2xl text-white">SmartCare Mitra</h1>
                <p className="text-white/80">{currentPartner.business_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
                <CardContent className="p-3">
                  <div className="text-center">
                    <p className="text-xs text-white/70">Saldo Tersedia</p>
                    <p className="font-bold text-lg text-white">
                      Rp {currentPartner.balance.toLocaleString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Button onClick={logout} variant="outline" size="sm" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
                <LogOut className="w-4 h-4 mr-2" />
                Keluar
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Grid */}
      <div className="max-w-6xl mx-auto px-4 -mt-8 relative z-10">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4 mb-8">
          <button 
            onClick={() => setActiveTab("beranda")}
            className={`p-4 rounded-xl text-center transition-all ${
              activeTab === "beranda" 
                ? "bg-white shadow-lg border-2 border-primary/20 scale-105" 
                : "bg-white shadow-md hover:shadow-lg hover:scale-105"
            }`}
          >
            <div className={`w-12 h-12 mx-auto mb-2 rounded-xl flex items-center justify-center ${
              activeTab === "beranda" ? "bg-gradient-to-br from-primary to-primary-glow" : "bg-muted"
            }`}>
              <Home className={`w-6 h-6 ${activeTab === "beranda" ? "text-white" : "text-muted-foreground"}`} />
            </div>
            <span className={`text-sm font-medium ${activeTab === "beranda" ? "text-primary" : "text-muted-foreground"}`}>
              Beranda
            </span>
          </button>

          <button 
            onClick={() => setActiveTab("pesanan")}
            className={`p-4 rounded-xl text-center transition-all ${
              activeTab === "pesanan" 
                ? "bg-white shadow-lg border-2 border-primary/20 scale-105" 
                : "bg-white shadow-md hover:shadow-lg hover:scale-105"
            }`}
          >
            <div className={`w-12 h-12 mx-auto mb-2 rounded-xl flex items-center justify-center ${
              activeTab === "pesanan" ? "bg-gradient-to-br from-primary to-primary-glow" : "bg-muted"
            }`}>
              <ClipboardList className={`w-6 h-6 ${activeTab === "pesanan" ? "text-white" : "text-muted-foreground"}`} />
            </div>
            <span className={`text-sm font-medium ${activeTab === "pesanan" ? "text-primary" : "text-muted-foreground"}`}>
              Pesanan
            </span>
          </button>

          <button 
            onClick={() => setActiveTab("pekerjaan")}
            className={`p-4 rounded-xl text-center transition-all ${
              activeTab === "pekerjaan" 
                ? "bg-white shadow-lg border-2 border-primary/20 scale-105" 
                : "bg-white shadow-md hover:shadow-lg hover:scale-105"
            }`}
          >
            <div className={`w-12 h-12 mx-auto mb-2 rounded-xl flex items-center justify-center ${
              activeTab === "pekerjaan" ? "bg-gradient-to-br from-primary to-primary-glow" : "bg-muted"
            }`}>
              <Briefcase className={`w-6 h-6 ${activeTab === "pekerjaan" ? "text-white" : "text-muted-foreground"}`} />
            </div>
            <span className={`text-sm font-medium ${activeTab === "pekerjaan" ? "text-primary" : "text-muted-foreground"}`}>
              Pekerjaan
            </span>
          </button>

          <button 
            onClick={() => setActiveTab("topup")}
            className={`p-4 rounded-xl text-center transition-all ${
              activeTab === "topup" 
                ? "bg-white shadow-lg border-2 border-primary/20 scale-105" 
                : "bg-white shadow-md hover:shadow-lg hover:scale-105"
            }`}
          >
            <div className={`w-12 h-12 mx-auto mb-2 rounded-xl flex items-center justify-center ${
              activeTab === "topup" ? "bg-gradient-to-br from-primary to-primary-glow" : "bg-muted"
            }`}>
              <CreditCard className={`w-6 h-6 ${activeTab === "topup" ? "text-white" : "text-muted-foreground"}`} />
            </div>
            <span className={`text-sm font-medium ${activeTab === "topup" ? "text-primary" : "text-muted-foreground"}`}>
              Top Up
            </span>
          </button>

          <button 
            onClick={() => setActiveTab("chat")}
            className={`p-4 rounded-xl text-center transition-all ${
              activeTab === "chat" 
                ? "bg-white shadow-lg border-2 border-primary/20 scale-105" 
                : "bg-white shadow-md hover:shadow-lg hover:scale-105"
            }`}
          >
            <div className={`w-12 h-12 mx-auto mb-2 rounded-xl flex items-center justify-center ${
              activeTab === "chat" ? "bg-gradient-to-br from-primary to-primary-glow" : "bg-muted"
            }`}>
              <MessageCircle className={`w-6 h-6 ${activeTab === "chat" ? "text-white" : "text-muted-foreground"}`} />
            </div>
            <span className={`text-sm font-medium ${activeTab === "chat" ? "text-primary" : "text-muted-foreground"}`}>
              Live Chat
            </span>
          </button>

          <button 
            onClick={() => setActiveTab("profil")}
            className={`p-4 rounded-xl text-center transition-all ${
              activeTab === "profil" 
                ? "bg-white shadow-lg border-2 border-primary/20 scale-105" 
                : "bg-white shadow-md hover:shadow-lg hover:scale-105"
            }`}
          >
            <div className={`w-12 h-12 mx-auto mb-2 rounded-xl flex items-center justify-center ${
              activeTab === "profil" ? "bg-gradient-to-br from-primary to-primary-glow" : "bg-muted"
            }`}>
              <User className={`w-6 h-6 ${activeTab === "profil" ? "text-white" : "text-muted-foreground"}`} />
            </div>
            <span className={`text-sm font-medium ${activeTab === "profil" ? "text-primary" : "text-muted-foreground"}`}>
              Profil
            </span>
          </button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">

          {/* Beranda Tab */}
          <TabsContent value="beranda" className="space-y-6">
            {/* Promotional Banner */}
            <Card className="border-0 bg-gradient-to-r from-primary via-primary-glow to-secondary text-white overflow-hidden relative">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold mb-2">Selamat Datang, {currentPartner.owner_name}!</h2>
                    <p className="text-white/90 mb-4">Tingkatkan penghasilan dengan melayani lebih banyak pelanggan</p>
                    <Button variant="secondary" className="bg-white text-primary hover:bg-white/90">
                      Lihat Pesanan Baru
                    </Button>
                  </div>
                  <div className="hidden md:block">
                    <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center">
                      <Briefcase className="w-12 h-12 text-white" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-white shadow-lg border-0 hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary-glow rounded-xl flex items-center justify-center">
                      <Wallet className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground font-medium">Total Saldo</p>
                      <p className="text-2xl font-bold text-primary">Rp {currentPartner.balance.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white shadow-lg border-0 hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-secondary to-accent rounded-xl flex items-center justify-center">
                      <ClipboardList className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground font-medium">Pesanan Menunggu</p>
                      <p className="text-2xl font-bold text-secondary">{orders.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white shadow-lg border-0 hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-success to-accent rounded-xl flex items-center justify-center">
                      <Briefcase className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground font-medium">Pekerjaan Aktif</p>
                      <p className="text-2xl font-bold text-success">{myJobs.filter(job => job.status !== "completed").length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card className="bg-white shadow-lg border-0">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold">Aksi Cepat</CardTitle>
                <CardDescription>Kelola aktivitas mitra dengan mudah</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <button 
                    onClick={() => setActiveTab("pesanan")}
                    className="p-4 rounded-xl bg-primary/5 hover:bg-primary/10 border border-primary/20 transition-all hover:scale-105"
                  >
                    <ClipboardList className="w-8 h-8 text-primary mx-auto mb-2" />
                    <p className="text-sm font-medium text-primary">Lihat Pesanan</p>
                  </button>
                  
                  <button 
                    onClick={() => setActiveTab("topup")}
                    className="p-4 rounded-xl bg-secondary/5 hover:bg-secondary/10 border border-secondary/20 transition-all hover:scale-105"
                  >
                    <CreditCard className="w-8 h-8 text-secondary mx-auto mb-2" />
                    <p className="text-sm font-medium text-secondary">Top Up Saldo</p>
                  </button>
                  
                  <button 
                    onClick={() => setActiveTab("chat")}
                    className="p-4 rounded-xl bg-accent/5 hover:bg-accent/10 border border-accent/20 transition-all hover:scale-105"
                  >
                    <MessageCircle className="w-8 h-8 text-accent mx-auto mb-2" />
                    <p className="text-sm font-medium text-accent">Live Chat</p>
                  </button>
                  
                  <button 
                    onClick={() => setActiveTab("profil")}
                    className="p-4 rounded-xl bg-success/5 hover:bg-success/10 border border-success/20 transition-all hover:scale-105"
                  >
                    <User className="w-8 h-8 text-success mx-auto mb-2" />
                    <p className="text-sm font-medium text-success">Edit Profil</p>
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Status Information */}
            <Card className="bg-white shadow-lg border-0">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold">Status Akun</CardTitle>
                <CardDescription>Informasi terkini tentang akun mitra Anda</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-4 bg-success/10 rounded-xl border border-success/20">
                    <CheckCircle className="w-5 h-5 text-success" />
                    <span className="text-sm font-medium">Akun Anda telah terverifikasi dan aktif</span>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-primary/10 rounded-xl border border-primary/20">
                    <Wallet className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium">Saldo tersedia: Rp {currentPartner.balance.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pesanan Masuk Tab */}
          <TabsContent value="pesanan" className="space-y-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Pesanan Masuk</CardTitle>
                <CardDescription>Daftar pesanan yang menunggu untuk diterima</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {orders.length === 0 ? (
                    <div className="text-center py-8">
                      <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">Tidak ada pesanan baru</p>
                    </div>
                  ) : (
                    orders.map((order) => {
                      const requiredBalance = order.service_price * 0.15;
                      const canAccept = currentPartner.balance >= requiredBalance;
                      
                      return (
                        <Card key={order.id} className="border border-muted">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h3 className="font-semibold">{order.service_name}</h3>
                                  <Badge variant="outline">{order.order_number}</Badge>
                                </div>
                                <div className="space-y-1 text-sm text-muted-foreground">
                                  <p>💰 Tarif: Rp {order.service_price.toLocaleString()}</p>
                                  <p>📊 Komisi (15%): Rp {order.commission_amount.toLocaleString()}</p>
                                  <p>📋 Saldo dibutuhkan: Rp {requiredBalance.toLocaleString()}</p>
                                  <p>📅 {new Date(order.created_at).toLocaleDateString('id-ID')}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                {canAccept ? (
                                  <Button 
                                    onClick={() => acceptOrder(order)}
                                    disabled={loading}
                                    variant="medical"
                                    size="sm"
                                  >
                                    Terima Pesanan
                                  </Button>
                                ) : (
                                  <div className="space-y-2">
                                    <Button 
                                      disabled
                                      variant="destructive"
                                      size="sm"
                                    >
                                      Saldo Kurang
                                    </Button>
                                    <p className="text-xs text-destructive">
                                      Kurang Rp {(requiredBalance - currentPartner.balance).toLocaleString()}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pekerjaan Saya Tab */}
          <TabsContent value="pekerjaan" className="space-y-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Pekerjaan Saya</CardTitle>
                <CardDescription>Pesanan yang telah Anda terima dan sedang dikerjakan</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {myJobs.length === 0 ? (
                    <div className="text-center py-8">
                      <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">Belum ada pekerjaan</p>
                    </div>
                  ) : (
                    myJobs.map((job) => {
                      const workingOrder = workingOrders[job.id];
                      
                      return (
                        <Card key={job.id} className="border border-muted">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h3 className="font-semibold">{job.service_name}</h3>
                                  <Badge 
                                    variant={
                                      job.status === "completed" ? "default" :
                                      job.status === "in_progress" ? "secondary" :
                                      "outline"
                                    }
                                  >
                                    {job.status === "completed" ? "Selesai" :
                                     job.status === "in_progress" ? "Sedang Dikerjakan" :
                                     "Diterima"}
                                  </Badge>
                                </div>
                                <div className="space-y-1 text-sm text-muted-foreground">
                                  <p>📋 {job.order_number}</p>
                                  <p>💰 Tarif: Rp {job.service_price.toLocaleString()}</p>
                                  <p>📊 Komisi: Rp {job.commission_amount.toLocaleString()}</p>
                                  {workingOrder && (
                                    <div className="flex items-center gap-2">
                                      <Timer className="w-4 h-4" />
                                      <span className="font-mono text-primary">
                                        {formatTime(workingOrder.timer)}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="text-right space-y-2">
                                {job.status === "confirmed" && !workingOrder && (
                                  <Button 
                                    onClick={() => startWork(job.id)}
                                    variant="medical"
                                    size="sm"
                                  >
                                    <Timer className="w-4 h-4 mr-2" />
                                    Mulai Bekerja
                                  </Button>
                                )}
                                {job.status === "in_progress" && workingOrder && (
                                  <Button 
                                    onClick={() => finishWork(job)}
                                    disabled={loading}
                                    variant="success"
                                    size="sm"
                                  >
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Selesai
                                  </Button>
                                )}
                                {job.status === "completed" && (
                                  <InvoiceModal
                                    order={job}
                                    partner={currentPartner}
                                    trigger={
                                      <Button 
                                        variant="outline"
                                        size="sm"
                                      >
                                        Lihat Invoice
                                      </Button>
                                    }
                                  />
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Top Up Tab */}
          <TabsContent value="topup" className="space-y-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Top Up Saldo</CardTitle>
                <CardDescription>Isi saldo untuk dapat menerima pesanan</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={submitTopup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Nominal Top Up (Minimal Rp 50.000)</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={topupData.amount}
                      onChange={(e) => setTopupData({...topupData, amount: e.target.value})}
                      placeholder="50000"
                      min="50000"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="name">Nama Mitra</Label>
                    <Input
                      id="name"
                      value={topupData.name}
                      onChange={(e) => setTopupData({...topupData, name: e.target.value})}
                      required
                      readOnly
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp">Nomor WhatsApp</Label>
                    <Input
                      id="whatsapp"
                      value={topupData.whatsapp}
                      onChange={(e) => setTopupData({...topupData, whatsapp: e.target.value})}
                      required
                      readOnly
                    />
                  </div>

                  <Card className="bg-muted/50">
                    <CardContent className="p-4">
                      <h4 className="font-semibold mb-2">Panduan Top Up:</h4>
                      <ol className="text-sm space-y-1 list-decimal list-inside text-muted-foreground">
                        <li>Silakan isi data di atas</li>
                        <li>Hubungi Admin di <strong>081299660660</strong></li>
                        <li>Jika admin tidak merespon dalam 3 jam, hubungi ulang</li>
                        <li>Klik tombol 'Kirim Permintaan Top Up'</li>
                      </ol>
                    </CardContent>
                  </Card>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loading}
                    variant="medical"
                    size="lg"
                  >
                    {loading ? "Mengirim..." : "Kirim Permintaan Top Up"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Live Chat Tab */}
          <TabsContent value="chat" className="space-y-6">
            <LiveChat 
              currentPartnerId={currentPartner.id}
              partnerName={currentPartner.owner_name}
            />
          </TabsContent>

          {/* Profil Tab */}
          <TabsContent value="profil" className="space-y-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Profil Mitra</CardTitle>
                <CardDescription>Informasi detail mitra SmartCare</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nama Pemilik</Label>
                    <Input value={currentPartner.owner_name} readOnly />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Nama Usaha</Label>
                    <Input value={currentPartner.business_name} readOnly />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Jenis Usaha</Label>
                    <Input value={currentPartner.business_type} readOnly />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={currentPartner.email} readOnly />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>No. WhatsApp</Label>
                    <Input value={currentPartner.phone_number} readOnly />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Status Verifikasi</Label>
                    <Badge 
                      variant={currentPartner.verification_status === "verified" ? "default" : "secondary"}
                      className="w-fit"
                    >
                      {currentPartner.verification_status === "verified" ? "Terverifikasi" : "Menunggu"}
                    </Badge>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Alamat</Label>
                  <Textarea value={`${currentPartner.address}, ${currentPartner.city}, ${currentPartner.province}`} readOnly />
                </div>

                <div className="pt-4">
                  <Button onClick={logout} variant="destructive" className="w-full">
                    <LogOut className="w-4 h-4 mr-2" />
                    Keluar dari Akun
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MitraDashboard;