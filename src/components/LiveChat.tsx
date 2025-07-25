import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Send, MessageCircle, User, Users } from "lucide-react";

interface ChatMessage {
  id: string;
  content: string;
  sender_id: string;
  sender_type: string;
  recipient_id?: string;
  recipient_type?: string;
  room_id: string;
  created_at: string;
  is_read: boolean;
}

interface LiveChatProps {
  currentPartnerId: string;
  partnerName: string;
}

const LiveChat = ({ currentPartnerId, partnerName }: LiveChatProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const roomId = `partner_${currentPartnerId}_general`;

  useEffect(() => {
    loadMessages();
    setupRealtimeSubscription();
    setIsConnected(true);

    return () => {
      setIsConnected(false);
    };
  }, [currentPartnerId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true })
        .limit(50);

      if (error) throw error;
      setMessages(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Gagal memuat pesan chat",
        variant: "destructive",
      });
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('chat-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as ChatMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || loading) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("chat_messages")
        .insert([{
          content: newMessage.trim(),
          sender_id: currentPartnerId,
          sender_type: "partner",
          room_id: roomId,
          message_type: "text",
          is_read: false
        }]);

      if (error) throw error;

      setNewMessage("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Gagal mengirim pesan",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSenderName = (message: ChatMessage) => {
    if (message.sender_type === "admin") return "Admin SmartCare";
    if (message.sender_type === "partner" && message.sender_id === currentPartnerId) return "Anda";
    if (message.sender_type === "member") return "Pelanggan";
    return "System";
  };

  const getSenderIcon = (senderType: string) => {
    switch (senderType) {
      case "admin":
        return <Users className="w-4 h-4" />;
      case "partner":
        return <User className="w-4 h-4" />;
      case "member":
        return <MessageCircle className="w-4 h-4" />;
      default:
        return <MessageCircle className="w-4 h-4" />;
    }
  };

  return (
    <Card className="shadow-lg h-[600px] flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Live Chat
          </div>
          <Badge variant={isConnected ? "success" : "secondary"}>
            {isConnected ? "Online" : "Offline"}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Belum ada pesan</p>
              <p className="text-sm text-muted-foreground mt-2">
                Mulai percakapan dengan admin atau pelanggan
              </p>
            </div>
          ) : (
            messages.map((message) => {
              const isOwn = message.sender_type === "partner" && message.sender_id === currentPartnerId;
              
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg p-3 shadow-sm ${
                      isOwn
                        ? "bg-primary text-primary-foreground"
                        : message.sender_type === "admin"
                        ? "bg-success text-success-foreground"
                        : "bg-white border"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {getSenderIcon(message.sender_type)}
                      <span className="text-xs font-medium opacity-80">
                        {getSenderName(message)}
                      </span>
                      <span className="text-xs opacity-60">
                        {formatTime(message.created_at)}
                      </span>
                    </div>
                    <p className="text-sm">{message.content}</p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t bg-background">
          <form onSubmit={sendMessage} className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Ketik pesan..."
              disabled={loading}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={loading || !newMessage.trim()}
              variant="medical"
              size="icon"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
          
          <div className="mt-2 text-xs text-muted-foreground">
            💡 Tips: Gunakan chat ini untuk komunikasi dengan admin (081299660660) dan pelanggan
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LiveChat;