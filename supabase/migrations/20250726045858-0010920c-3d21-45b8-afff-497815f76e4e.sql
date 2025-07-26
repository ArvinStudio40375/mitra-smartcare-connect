-- Tambahkan policy untuk mitra dapat melihat pesanan yang belum ada mitra yang mengambil
CREATE POLICY "Partners can view available orders" 
ON public.smartcare_orders 
FOR SELECT 
USING (status = 'menunggu_konfirmasi');

-- Tambahkan policy untuk mitra dapat update pesanan yang mereka terima
CREATE POLICY "Partners can update accepted orders" 
ON public.smartcare_orders 
FOR UPDATE 
USING (status IN ('dikonfirmasi', 'sedang_dikerjakan', 'selesai'));