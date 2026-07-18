import type { ReactNode } from "react";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { CheckCircle2, Send } from "lucide-react";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel.js";

export function ContactMessagesPanel() {
  const messages = useQuery(api.contact.list, {});
  const markRead = useMutation(api.contact.markRead);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleMarkRead = async (id: Id<"contact_messages">) => {
    setProcessingId(id);
    try {
      await markRead({ id });
    } catch {
      toast.error("Failed to mark as read.");
    } finally {
      setProcessingId(null);
    }
  };

  const unread = messages?.filter((m) => !m.read) ?? [];
  const read = messages?.filter((m) => m.read) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-sm text-primary uppercase tracking-widest mb-0.5">
          Contact Messages — Unread ({unread.length})
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Messages submitted via the Contact Us form. Reply directly to the sender's email address.
        </p>
        {messages === undefined ? (
          <Skeleton className="h-40 w-full rounded-xl" />
        ) : unread.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
            No unread messages.
          </div>
        ) : (
          <div className="space-y-3">
            {unread.map((msg) => (
              <div key={msg._id} className="bg-card border border-accent/30 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-primary">{msg.name}</span>
                      <a
                        href={`mailto:${msg.email}`}
                        className="text-xs text-accent hover:underline truncate max-w-[200px]"
                      >
                        {msg.email}
                      </a>
                    </div>
                    {msg.subject && (
                      <p className="text-xs font-medium text-foreground mt-0.5">{msg.subject}</p>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {new Date(msg.createdAt).toLocaleString("en-GB")}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap mb-3">
                  {msg.message}
                </p>
                <div className="flex items-center gap-3">
                  <a
                    href={`mailto:${msg.email}?subject=Re: ${encodeURIComponent(msg.subject ?? "Your message to VisaClear")}`}
                    className="flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/8 hover:bg-primary/15 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Send className="w-3 h-3" /> Reply
                  </a>
                  <button
                    disabled={processingId === msg._id}
                    onClick={() => { void handleMarkRead(msg._id); }}
                    className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="w-3 h-3" /> Mark read
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {read.length > 0 && (
        <div>
          <h3 className="font-semibold text-sm text-primary uppercase tracking-widest mb-3">
            Read ({read.length})
          </h3>
          <div className="space-y-2">
            {read.map((msg) => (
              <div key={msg._id} className="bg-muted/40 border border-border rounded-xl p-4 opacity-70">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-primary">{msg.name}</span>
                    <a href={`mailto:${msg.email}`} className="text-xs text-accent hover:underline">
                      {msg.email}
                    </a>
                    {msg.subject && (
                      <span className="text-xs text-muted-foreground">— {msg.subject}</span>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {new Date(msg.createdAt).toLocaleString("en-GB")}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {msg.message}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
