import { useCallback, useEffect, useRef, useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Bot,
  Send,
  User,
  Sparkles,
  AlertCircle,
  RotateCcw,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────────

type Mode = "agent" | "business";

interface Message {
  id: string;
  role: "user" | "ai";
  content: string;
}

interface AgentAIChatProps {
  mode: Mode;
  className?: string;
}

// Prompt chips surfaced for each mode. Kept short so they fit on one line at
// mobile widths; the full question goes into the input when clicked.
const AGENT_CHIPS = [
  "Who needs attention right now?",
  "Summarise my pipeline",
  "Which clients are missing documents?",
  "Draft a follow-up for my latest client",
];

const BUSINESS_CHIPS = [
  "Show me the cohort readiness summary",
  "Who hasn't started yet?",
  "Flag anyone stalled in the pipeline",
  "Draft an HR follow-up for the team",
];

// ── Sub-components ────────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 animate-in fade-in duration-200">
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
        <Bot className="w-4 h-4 text-primary" />
      </div>
      <div className="flex items-center gap-1.5 bg-muted/50 rounded-2xl rounded-tl-sm px-4 py-3 border border-border/50">
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  );
}

interface MessageBubbleProps {
  message: Message;
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  // Render the AI reply with light markdown-like formatting:
  // - lines starting with "Draft:" get a muted pill label
  // - blank-line-separated blocks are paragraphs
  // - numbered lists (1. 2. 3.) get rendered as list items
  const renderAIContent = (text: string) => {
    const paragraphs = text.split(/\n{2,}/);
    return paragraphs.map((para, pi) => {
      // Numbered list
      if (/^\d+\.\s/.test(para)) {
        const items = para.split(/\n/).filter(Boolean);
        return (
          <ol key={pi} className="list-decimal list-inside space-y-1 my-1">
            {items.map((item, ii) => (
              <li key={ii} className="text-sm leading-relaxed">
                {item.replace(/^\d+\.\s/, "")}
              </li>
            ))}
          </ol>
        );
      }
      // Draft block
      if (para.startsWith("Draft:")) {
        return (
          <div key={pi} className="mt-2 rounded-lg border border-border/60 bg-background/60 p-3">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1 block">
              Draft — review before sending
            </span>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {para.slice("Draft:".length).trim()}
            </p>
          </div>
        );
      }
      // Disclaimer lines
      if (
        para.includes("not legal or immigration advice") ||
        para.includes("HR productivity summary")
      ) {
        return (
          <p
            key={pi}
            className="text-[11px] text-muted-foreground/60 mt-2 italic leading-relaxed"
          >
            {para}
          </p>
        );
      }
      return (
        <p key={pi} className="text-sm leading-relaxed">
          {para}
        </p>
      );
    });
  };

  return (
    <div
      className={cn(
        "flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200",
        isUser && "flex-row-reverse",
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-primary/10 text-primary",
        )}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Bubble */}
      <div
        className={cn(
          "max-w-[82%] rounded-2xl px-4 py-3 space-y-1.5",
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-muted/50 border border-border/50 rounded-tl-sm",
        )}
      >
        {isUser ? (
          <p className="text-sm leading-relaxed">{message.content}</p>
        ) : (
          <div className="space-y-1.5">{renderAIContent(message.content)}</div>
        )}
      </div>
    </div>
  );
}

// ── Usage meter ───────────────────────────────────────────────────────────────

interface UsageMeterProps {
  used: number;
  limit: number;
}

function UsageMeter({ used, limit }: UsageMeterProps) {
  const pct = Math.min((used / limit) * 100, 100);
  const low = pct >= 80;
  const exhausted = used >= limit;

  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 h-1 rounded-full bg-border/50 overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            exhausted
              ? "bg-destructive"
              : low
                ? "bg-amber-500"
                : "bg-primary",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span
        className={cn(
          "text-[11px] font-medium tabular-nums shrink-0",
          exhausted
            ? "text-destructive"
            : low
              ? "text-amber-500"
              : "text-muted-foreground",
        )}
      >
        {used}/{limit} today
      </span>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

interface EmptyStateProps {
  mode: Mode;
  chips: string[];
  onChip: (text: string) => void;
}

function EmptyState({ mode, chips, onChip }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-10 text-center space-y-6">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
        <Sparkles className="w-7 h-7 text-primary" />
      </div>
      <div className="space-y-2">
        <h3 className="font-semibold text-base">
          {mode === "agent" ? "Your casework assistant" : "Your HR mobility assistant"}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
          {mode === "agent"
            ? "Ask me anything about your active clients. I only have access to your own cases."
            : "Ask me about your employee cohort. I only see your organisation's data."}
        </p>
      </div>
      <div className="flex flex-col gap-2 w-full max-w-xs">
        {chips.map((chip) => (
          <button
            key={chip}
            onClick={() => onChip(chip)}
            className="flex items-center justify-between gap-2 text-left text-sm px-4 py-3 rounded-xl border border-border/60 bg-background hover:bg-muted/40 hover:border-primary/30 transition-colors group"
          >
            <span className="text-muted-foreground group-hover:text-foreground transition-colors leading-snug">
              {chip}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-primary shrink-0 transition-colors" />
          </button>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground/50 leading-relaxed max-w-xs">
        This assistant is a productivity tool only — not legal or immigration advice.
      </p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function AgentAIChat({ mode, className }: AgentAIChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chips = mode === "agent" ? AGENT_CHIPS : BUSINESS_CHIPS;

  const sendChat = useAction(api.agentAI.chat);
  const usage = useQuery(api.agentAIHelpers.getUsage, { mode });

  const exhausted = usage ? usage.used >= usage.limit : false;

  // Auto-scroll to bottom when messages update or typing indicator appears
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Auto-resize the textarea as the user types
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  const buildHistoryForAPI = useCallback(
    () =>
      messages.map((m) => ({
        role: (m.role === "ai" ? "assistant" : "user") as "user" | "assistant",
        content: m.content,
      })),
    [messages],
  );

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim().slice(0, 500);
      if (!trimmed || loading || exhausted) return;

      setError(null);
      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmed,
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      if (inputRef.current) {
        inputRef.current.style.height = "auto";
      }
      setLoading(true);

      try {
        const history = buildHistoryForAPI();
        const result = await sendChat({
          message: trimmed,
          mode,
          conversationHistory: history,
        });
        const aiMsg: Message = {
          id: crypto.randomUUID(),
          role: "ai",
          content: result.reply,
        };
        setMessages((prev) => [...prev, aiMsg]);
      } catch (err: unknown) {
        const convexMsg =
          typeof err === "object" &&
          err !== null &&
          "data" in err &&
          typeof (err as { data?: unknown }).data === "object" &&
          (err as { data?: { message?: string } }).data !== null
            ? (err as { data: { message?: string } }).data.message
            : null;

        const message =
          convexMsg ??
          (err instanceof Error ? err.message : "Something went wrong. Please try again.");

        setError(message);
        // Remove the optimistically added user message on hard error so the
        // user can retry without a confusing dangling message.
        setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
        toast.error(message);
      } finally {
        setLoading(false);
        inputRef.current?.focus();
      }
    },
    [loading, exhausted, mode, buildHistoryForAPI, sendChat],
  );

  const handleSubmit = () => send(input);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleChip = (text: string) => {
    setInput(text);
    inputRef.current?.focus();
  };

  const handleClear = () => {
    setMessages([]);
    setError(null);
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";
  };

  const hasMessages = messages.length > 0;

  return (
    <div
      className={cn(
        "flex flex-col h-full rounded-xl border border-border/50 bg-background overflow-hidden",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border/50 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight truncate">
              {mode === "agent" ? "Casework Assistant" : "HR Assistant"}
            </p>
            <p className="text-[11px] text-muted-foreground leading-tight">
              Your data only · Not legal advice
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {usage && <UsageMeter used={usage.used} limit={usage.limit} />}
          {hasMessages && (
            <button
              onClick={handleClear}
              className="p-1.5 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-muted/50 transition-colors"
              title="Clear conversation"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {!hasMessages ? (
          <EmptyState mode={mode} chips={chips} onChip={handleChip} />
        ) : (
          <div className="flex flex-col gap-5 px-4 py-5">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {loading && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-4 mb-2 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span className="leading-relaxed">{error}</span>
        </div>
      )}

      {/* Exhausted banner */}
      {exhausted && (
        <div className="mx-4 mb-2 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2.5 text-sm text-amber-600 dark:text-amber-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            You've used all {usage?.limit} messages for today. Resets at midnight UTC.
          </span>
        </div>
      )}

      {/* Input area */}
      <div className="px-4 pb-4 pt-2 shrink-0 border-t border-border/50">
        {/* Chip row — only show on empty state or on focus, collapsed otherwise */}
        {!hasMessages && (
          <div className="hidden sm:flex flex-wrap gap-1.5 mb-3">
            {chips.map((chip) => (
              <button
                key={chip}
                onClick={() => handleChip(chip)}
                disabled={exhausted}
                className="text-xs px-3 py-1.5 rounded-full border border-border/60 bg-muted/30 hover:bg-muted/60 hover:border-primary/30 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={
              exhausted
                ? "Daily limit reached — resets at midnight UTC"
                : mode === "agent"
                  ? "Ask about a client, your pipeline, or request a draft…"
                  : "Ask about your cohort, readiness, or request a draft…"
            }
            disabled={exhausted || loading}
            rows={1}
            className={cn(
              "flex-1 resize-none rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-sm",
              "placeholder:text-muted-foreground/50 leading-relaxed",
              "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "transition-[border-color,box-shadow] duration-150",
              "min-h-[44px] max-h-[120px] overflow-y-auto",
            )}
            style={{ height: "44px" }}
          />
          <Button
            onClick={handleSubmit}
            disabled={!input.trim() || loading || exhausted}
            size="icon"
            className="shrink-0 w-11 h-11 rounded-xl"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>

        <p className="text-[10px] text-muted-foreground/40 text-center mt-2 leading-relaxed">
          Shift+Enter for new line · Enter to send
        </p>
      </div>
    </div>
  );
}
