import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "wouter";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useAuthStore } from "@/hooks/useAuth";
import { GapNightLogoLoader } from "@/components/GapNightLogo";
import { MessageCircle, Send, ArrowLeft, ShieldCheck } from "lucide-react";

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function Messages() {
  const params = useParams<{ id?: string }>();
  const { user } = useAuthStore();
  const [convos, setConvos] = useState<any[]>([]);
  const [activeConvo, setActiveConvo] = useState<any>(null);
  const [msgs, setMsgs] = useState<any[]>([]);
  const [host, setHost] = useState<any>(null);
  const [newMsg, setNewMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (params.id) {
      fetchMessages(params.id);
    }
  }, [params.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  const fetchConversations = async () => {
    try {
      const res = await fetch("/api/messages/conversations", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setConvos(data.conversations || []);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (convoId: string) => {
    try {
      const res = await fetch(`/api/messages/conversations/${convoId}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setActiveConvo(data.conversation);
        setMsgs(data.messages || []);
        setHost(data.host);
      }
    } catch {}
  };

  const sendMessage = async () => {
    if (!newMsg.trim() || !params.id || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/messages/conversations/${params.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: newMsg.trim() }),
      });
      if (res.ok) {
        setNewMsg("");
        fetchMessages(params.id);
        fetchConversations();
      }
    } catch {} finally {
      setSending(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Sign in to view messages</h2>
          <p className="text-muted-foreground">You need to be logged in to message hosts.</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <GapNightLogoLoader size={48} />
      </div>
    );
  }

  // Conversation thread view
  if (params.id && activeConvo) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navigation />
        <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-4 flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-3 pb-4 border-b border-border/50 mb-4">
            <Link href="/messages">
              <button className="p-2 rounded-full hover:bg-muted transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-foreground text-background flex items-center justify-center font-bold text-sm">
                {host?.name?.charAt(0) || "H"}
              </div>
              <div>
                <div className="font-semibold flex items-center gap-1.5">
                  {host?.name || "Host"}
                  {host?.idVerified && <ShieldCheck className="w-4 h-4 text-primary" />}
                </div>
                {activeConvo.subject && (
                  <p className="text-xs text-muted-foreground">{activeConvo.subject}</p>
                )}
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-3 mb-4 min-h-[300px]">
            {msgs.map((msg: any) => (
              <div key={msg.id} className={`flex ${msg.senderType === "guest" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                  msg.senderType === "guest"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-muted text-foreground rounded-bl-md"
                }`}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <p className={`text-[10px] mt-1 ${msg.senderType === "guest" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                    {timeAgo(msg.createdAt)}
                  </p>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex gap-2 pt-3 border-t border-border/50">
            <Input
              value={newMsg}
              onChange={(e) => setNewMsg(e.target.value)}
              placeholder="Type a message..."
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            />
            <Button onClick={sendMessage} disabled={!newMsg.trim() || sending} size="icon">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Conversations list view
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">Messages</h1>

        {convos.length === 0 ? (
          <div className="text-center py-16">
            <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No messages yet</h3>
            <p className="text-muted-foreground text-sm">When you message a host, your conversations will appear here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {convos.map((c: any) => (
              <Link key={c.id} href={`/messages/${c.id}`}>
                <Card className="p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-foreground text-background flex items-center justify-center font-bold text-sm shrink-0">
                      {c.hostName?.charAt(0) || "H"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">{c.hostName || "Host"}</span>
                        <span className="text-xs text-muted-foreground">{timeAgo(c.lastMessageAt)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {c.propertyTitle || c.subject || "Conversation"}
                      </p>
                    </div>
                    {c.guestUnread > 0 && (
                      <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 text-[10px] font-bold flex items-center justify-center shrink-0">
                        {c.guestUnread}
                      </span>
                    )}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
