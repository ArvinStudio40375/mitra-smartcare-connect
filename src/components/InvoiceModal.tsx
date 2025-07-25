import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Download, Send, FileText, CheckCircle } from "lucide-react";

interface Order {
  id: string;
  order_number: string;
  service_name: string;
  service_price: number;
  commission_amount: number;
  total_amount: number;
  status: string;
  created_at: string;
}

interface Partner {
  owner_name: string;
  business_name: string;
  phone_number: string;
  email: string;
}

interface InvoiceModalProps {
  order: Order;
  partner: Partner;
  trigger: React.ReactNode;
}

const InvoiceModal = ({ order, partner, trigger }: InvoiceModalProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const generateInvoiceText = () => {
    return `
╔══════════════════════════════════════╗
║           INVOICE SMARTCARE          ║
║        Indonesia Healthcare          ║
╚══════════════════════════════════════╝

📋 DETAIL PEKERJAAN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
No. Pesanan     : ${order.order_number}
Layanan         : ${order.service_name}
Mitra           : ${partner.business_name}
PIC             : ${partner.owner_name}
Status          : Selesai ✅

💰 RINCIAN BIAYA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tarif Layanan   : ${formatCurrency(order.service_price)}
Komisi Mitra    : ${formatCurrency(order.commission_amount)} (15%)
Total Dibayar   : ${formatCurrency(order.total_amount)}

📅 INFORMASI WAKTU
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tanggal Selesai : ${formatDate(new Date().toISOString())}
Durasi Kerja    : Sesuai kebutuhan

🏥 SMARTCARE INDONESIA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Layanan Kesehatan Terpercaya
Website: smartcare.id
Hotline: 081299660660

Terima kasih telah bergabung dengan
SmartCare Indonesia! 🙏

════════════════════════════════════════
    `;
  };

  const downloadInvoice = () => {
    const invoiceText = generateInvoiceText();
    const element = document.createElement("a");
    const file = new Blob([invoiceText], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `Invoice_${order.order_number}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

    toast({
      title: "Invoice Diunduh!",
      description: "File invoice telah berhasil diunduh",
    });
  };

  const sendInvoice = async () => {
    setLoading(true);
    try {
      // Simulasi mengirim invoice ke chat
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Invoice Terkirim!",
        description: "Invoice telah dikirim ke live chat admin & pelanggan",
      });
    } catch (error) {
      toast({
        title: "Gagal Mengirim",
        description: "Terjadi kesalahan saat mengirim invoice",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Invoice - {order.order_number}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Invoice Header */}
          <Card className="bg-gradient-to-r from-primary to-primary-glow text-white">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold">SC</span>
              </div>
              <h2 className="text-2xl font-bold mb-2">SmartCare Indonesia</h2>
              <p className="text-white/90">Layanan Kesehatan Terpercaya</p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <CheckCircle className="w-5 h-5" />
                <span className="font-semibold">PEKERJAAN SELESAI</span>
              </div>
            </CardContent>
          </Card>

          {/* Invoice Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="font-semibold text-lg mb-3">Detail Pekerjaan</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">No. Pesanan:</span>
                    <Badge variant="outline">{order.order_number}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Layanan:</span>
                    <span className="font-medium">{order.service_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant="success">Selesai</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="font-semibold text-lg mb-3">Informasi Mitra</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Nama Usaha:</span>
                    <span className="font-medium">{partner.business_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">PIC:</span>
                    <span className="font-medium">{partner.owner_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Kontak:</span>
                    <span className="font-medium">{partner.phone_number}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Financial Summary */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-lg mb-4">Ringkasan Finansial</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-lg">
                  <span>Tarif Layanan:</span>
                  <span className="font-semibold">{formatCurrency(order.service_price)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Komisi Mitra (15%):</span>
                  <span>- {formatCurrency(order.commission_amount)}</span>
                </div>
                <hr />
                <div className="flex justify-between text-xl font-bold text-primary">
                  <span>Total Dibayar:</span>
                  <span>{formatCurrency(order.total_amount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timestamp */}
          <Card className="bg-muted/50">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">
                Invoice dibuat pada: {formatDate(new Date().toISOString())}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                💎 SmartCare Indonesia - Watermark
              </p>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={downloadInvoice}
              variant="outline"
              className="flex-1"
            >
              <Download className="w-4 h-4 mr-2" />
              Simpan Invoice
            </Button>
            <Button
              onClick={sendInvoice}
              disabled={loading}
              variant="medical"
              className="flex-1"
            >
              <Send className="w-4 h-4 mr-2" />
              {loading ? "Mengirim..." : "Kirim ke Chat"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceModal;