import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSeo } from "@/hooks/use-seo.ts";
import { useSmartBack } from "@/hooks/use-smart-back.ts";
import { useDemoAuth } from "@/hooks/use-demo-auth.ts";
import { useAction, useMutation, useQuery } from "convex/react";
import { Authenticated } from "convex/react";
import { Button } from "@/components/ui/button.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import {
  Globe, ArrowLeft, CheckCircle2, Circle,
  ChevronDown, ChevronUp, AlertCircle, Info,
  MapPin, Clock, DollarSign, Lightbulb, Lock,
  Search, Shield, Award, ChevronRight,
  Download, FileText, MessageSquare, Send, Bot,
  TrendingUp, X, Share2, Copy, Check,
  ThumbsUp, ThumbsDown, LayoutDashboard, Settings, LogOut,
} from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import { downloadChecklistPDF, downloadBankLetterPDF } from "@/lib/pdf-export.ts";
import {
  AVAILABLE_DESTINATIONS, VISA_TYPES, getChecklist, type VisaType, type ChecklistItem,
  CHECKLISTS_WITH_DATA,
} from "@/lib/visa-data.ts";
import { ALL_COUNTRIES } from "@/lib/countries.ts";
import { cn } from "@/lib/utils.ts";
import { toast } from "sonner";
import { LiveDataDisclaimer } from "@/components/live-data-disclaimer.tsx";
import { UpgradeModal } from "@/components/upgrade-modal.tsx";
import {
  canDownloadPDF, canUseAI, canSetReminders,
  canAccessDestination, FREE_DESTINATION_LIMIT,
} from "@/lib/plan-gates.ts";
import { ConvexError } from "convex/values";
import { trackEvent } from "@/hooks/use-analytics.ts";

const DEST_FLAGS: Record<string, string> = {
  "United Kingdom": "🇬🇧",
  "United States": "🇺🇸",
  "Canada": "🇨🇦",
  "Germany": "🇩🇪",
  "Poland": "🇵🇱",
  "France": "🇫🇷",
  "Australia": "🇦🇺",
  "Netherlands": "🇳🇱",
  "Ireland": "🇮🇪",
  "Italy": "🇮🇹",
  "Spain": "🇪🇸",
  "Sweden": "🇸🇪",
  "Norway": "🇳🇴",
  "Finland": "🇫🇮",
  "Denmark": "🇩🇰",
  "Portugal": "🇵🇹",
  "Austria": "🇦🇹",
  "Belgium": "🇧🇪",
  "Switzerland": "🇨🇭",
  "Japan": "🇯🇵",
  "South Korea": "🇰🇷",
  "UAE": "🇦🇪",
  "New Zealand": "🇳🇿",
  "Singapore": "🇸🇬",
};

// ─── Searchable Country Input ────────────────────────────────────────────────
function CountrySearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = query.trim().length === 0
    ? ALL_COUNTRIES
    : ALL_COUNTRIES.filter((c) =>
        c.toLowerCase().includes(query.toLowerCase())
      );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const select = (country: string) => {
    onChange(country);
    setQuery(country);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={query}
          placeholder="Search or type your country…"
          className="w-full pl-10 pr-4 py-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (e.target.value === "") onChange("");
          }}
          onFocus={() => setOpen(true)}
        />
      </div>
      <AnimatePresence>
        {open && filtered.length > 0 && (
          <motion.ul
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-1.5 w-full max-h-56 overflow-y-auto rounded-lg border border-border bg-card shadow-lg"
          >
            {filtered.map((country) => (
              <li
                key={country}
                onMouseDown={() => select(country)}
                className={cn(
                  "px-4 py-2.5 text-sm cursor-pointer hover:bg-accent/8 transition-colors",
                  value === country && "bg-primary/8 font-medium text-primary"
                )}
              >
                {country}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Checklist Item Card ──────────────────────────────────────────────────────
function ChecklistItemCard({
  item,
  index,
  checked,
  onToggle,
}: {
  item: ChecklistItem;
  index: number;
  checked: boolean;
  onToggle: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={cn(
        "border rounded-xl overflow-hidden transition-colors duration-200",
        checked
          ? "border-accent/40 bg-accent/5"
          : "border-border bg-card hover:border-border/80"
      )}
    >
      <div className="flex items-start gap-3 p-4 cursor-pointer" onClick={onToggle}>
        <div className="mt-0.5 shrink-0 transition-transform duration-200">
          {checked
            ? <CheckCircle2 className="w-5 h-5 text-accent" />
            : <Circle className="w-5 h-5 text-muted-foreground/50" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn(
              "font-medium text-sm leading-snug",
              checked ? "line-through text-muted-foreground" : "text-foreground"
            )}>
              {item.title}
            </span>
            {!item.required && (
              <span className="text-[10px] tracking-wide uppercase font-medium border border-border text-muted-foreground rounded-full px-2 py-0.5">
                Optional
              </span>
            )}
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors cursor-pointer p-0.5"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-5 space-y-3 border-t border-border/50 pt-4 ml-8">
              <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              <div className="flex items-start gap-2.5 text-sm">
                <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-foreground">Where to get it: </span>
                  <span className="text-muted-foreground">{item.where}</span>
                </div>
              </div>
              {item.tip && (
                <div className="flex items-start gap-2.5 bg-accent/8 border border-accent/20 rounded-lg p-3">
                  <Lightbulb className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "oklch(0.72 0.13 80)" }} />
                  <span className="text-sm" style={{ color: "oklch(0.45 0.1 70)" }}>{item.tip}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Readiness Score Ring ─────────────────────────────────────────────────────
function ReadinessScore({ score }: { score: number }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const color = score >= 80 ? "#16a34a" : score >= 50 ? "#d97706" : "#dc2626";
  const label = score >= 80 ? "Strong" : score >= 50 ? "Moderate" : "Needs Work";

  return (
    <div className="flex items-center gap-5">
      <div className="relative w-24 h-24 shrink-0">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
          <circle cx="48" cy="48" r={radius} fill="none" stroke="currentColor" strokeWidth="7" className="text-border" />
          <motion.circle
            cx="48" cy="48" r={radius}
            fill="none"
            stroke={color}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: "easeOut" as const }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-bold text-xl text-foreground">{score}%</span>
        </div>
      </div>
      <div>
        <div className="font-semibold text-sm text-foreground mb-1">Application Readiness</div>
        <div className="font-bold text-lg" style={{ color }}>{label}</div>
        <div className="text-xs text-muted-foreground mt-1 leading-relaxed max-w-[180px]">
          {score >= 80
            ? "Excellent! You have most documents ready. Final review recommended."
            : score >= 50
            ? "Good progress. Check remaining required items before applying."
            : "Complete more required documents to strengthen your application."}
        </div>
      </div>
    </div>
  );
}

// ─── AI Assistant Panel ───────────────────────────────────────────────────────
type Message = {
  role: "user" | "assistant";
  text: string;
  feedback?: "up" | "down" | null;
};

function AIAssistant({
  origin,
  destination,
  visaType,
  plan,
  onClose,
}: {
  origin: string;
  destination: string;
  visaType: string;
  plan: string;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: `I'm your VisaClear AI assistant. I'm here to answer questions about your ${visaType} visa application to ${destination}. What would you like to know?`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const askQuestion = useAction(api.ai.assistant.askVisaQuestion);
  const usage = useQuery(api.aiUsage.getMyUsage, {});

  const remaining = usage && usage.limit !== null ? Math.max(0, usage.limit - usage.used) : null;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setLoading(true);
    try {
      const answer = await askQuestion({
        question: q,
        context: { origin, destination, visaType },
      });
      setMessages((prev) => [...prev, { role: "assistant", text: answer, feedback: null }]);
    } catch (err) {
      const message = err instanceof ConvexError
        ? (err.data as { message: string }).message
        : "Sorry, I could not process that request. Please try again.";
      toast.error(message);
      setMessages((prev) => [...prev, { role: "assistant", text: message, feedback: null }]);
    } finally {
      setLoading(false);
    }
  };

  const setFeedback = (index: number, feedback: "up" | "down") => {
    setMessages((prev) =>
      prev.map((m, i) => i === index ? { ...m, feedback } : m)
    );
    if (feedback === "up") {
      toast.success("Thanks for the feedback!");
    } else {
      toast.info("Thanks for letting us know. We review all feedback to improve accuracy.");
    }
  };

  const quickQuestions = [
    "What bank balance do I need?",
    "How far in advance should I apply?",
    "What is the most common rejection reason?",
    "Do I need travel insurance?",
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col h-[85vh] sm:h-[650px] z-10">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-primary rounded-t-2xl">
          <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
            <Bot className="w-4.5 h-4.5 text-white" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-white text-sm">VisaClear AI Assistant</div>
            <div className="text-[11px] text-white/60">{destination} · {visaType} visa · by Vericore</div>
          </div>
          {plan === "free" ? (
            <div className="text-[11px] text-white/70 font-medium px-2.5 py-1 rounded-lg bg-white/10">
              Pro feature
            </div>
          ) : remaining !== null ? (
            <div className="text-[11px] text-white/70 font-medium px-2.5 py-1 rounded-lg bg-white/10">
              {remaining}/{usage?.limit} left this month
            </div>
          ) : null}
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors cursor-pointer p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Legal Disclaimer Banner */}
        <div className="mx-4 mt-3 px-3.5 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex items-start gap-2.5">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
            <strong>Not legal advice.</strong> AI responses are for guidance only. Always verify requirements with the official embassy or consulate before submitting your application.
          </p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={cn("flex gap-2.5", m.role === "user" ? "flex-row-reverse" : "flex-row")}>
              {m.role === "assistant" && (
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-primary" />
                </div>
              )}
              <div className="flex flex-col gap-1.5 max-w-[80%]">
                <div className={cn(
                  "rounded-xl px-3.5 py-2.5 text-sm leading-relaxed",
                  m.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : "bg-muted/50 text-foreground rounded-tl-sm border border-border"
                )}>
                  {m.role === "assistant"
                    ? m.text.split(/\n\n+/).map((para, pi) => (
                        <p key={pi} className={pi > 0 ? "mt-2.5" : ""}>{para.trim()}</p>
                      ))
                    : m.text
                  }
                </div>
                {/* Feedback buttons for assistant messages (not the first welcome msg) */}
                {m.role === "assistant" && i > 0 && (
                  <div className="flex items-center gap-1.5 pl-1">
                    {m.feedback === null || m.feedback === undefined ? (
                      <>
                        <span className="text-[10px] text-muted-foreground mr-0.5">Was this helpful?</span>
                        <button
                          onClick={() => setFeedback(i, "up")}
                          className="p-1 rounded text-muted-foreground hover:text-accent transition-colors cursor-pointer"
                          title="Helpful"
                        >
                          <ThumbsUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => setFeedback(i, "down")}
                          className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                          title="Not helpful"
                        >
                          <ThumbsDown className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <span className="text-[10px] text-muted-foreground italic">
                        {m.feedback === "up" ? "Marked helpful" : "Feedback noted"}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-2.5">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Bot className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="bg-muted/50 border border-border rounded-xl rounded-tl-sm px-3.5 py-3 flex items-center gap-2">
                <Spinner />
                <span className="text-xs text-muted-foreground">Thinking…</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Quick questions */}
        {messages.length <= 1 && (
          <div className="px-4 pb-2">
            <p className="text-[11px] text-muted-foreground mb-2 font-medium">Quick questions:</p>
            <div className="flex flex-wrap gap-1.5">
              {quickQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => { setInput(q); }}
                  className="text-[11px] px-2.5 py-1 rounded-full border border-primary/30 text-primary hover:bg-primary/5 transition-colors cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Rate limit warning */}
        {plan === "pro" && remaining === 1 && (
          <div className="mx-4 px-3 py-2 rounded-lg bg-muted/50 border border-border text-center">
            <p className="text-[11px] text-muted-foreground">
              Last question this month.{" "}
              <button
                onClick={() => { onClose(); }}
                className="text-accent font-semibold underline cursor-pointer"
              >
                Upgrade for unlimited
              </button>
            </p>
          </div>
        )}

        {/* Input */}
        <div className="px-4 pb-4 pt-2 border-t border-border">
          {plan === "free" || (remaining !== null && remaining <= 0) ? (
            <div className="text-center py-3">
              <p className="text-sm font-semibold text-foreground mb-1">
                {plan === "free" ? "AI Visa Assistant is a Pro feature" : "Monthly limit reached"}
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                {plan === "free"
                  ? "Upgrade to Pro for 10 AI questions a month, or Expert for unlimited."
                  : "Upgrade to Expert for unlimited AI Visa Assistant questions."}
              </p>
              <button
                onClick={() => onClose()}
                className="text-xs font-semibold text-accent border border-accent/30 rounded-lg px-4 py-1.5 hover:bg-accent/5 transition-colors cursor-pointer"
              >
                See Pro Plans
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { void send(); } }}
                placeholder="Ask about your visa application…"
                className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                disabled={loading}
              />
              <button
                onClick={() => { void send(); }}
                disabled={!input.trim() || loading}
                className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
type Step = "selector" | "checklist";

const INITIAL_SHOWN = 9;

export default function ChecklistPage() {
  useSeo({ title: "Visa Checklist", description: "Get your precise, personalised visa document checklist in 60 seconds. Built for African, Asian, and LatAm applicants. No vague advice , exact documents, insider tips." });
  const navigate = useNavigate();
  const goBackToDashboard = useSmartBack("/dashboard");
  const { isDemoAuthenticated, signOut } = useDemoAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Derive step from URL: if all 3 params present, show checklist
  const urlFrom = searchParams.get("from") ?? "";
  const urlTo = searchParams.get("to") ?? "";
  const urlType = (searchParams.get("type") as VisaType) ?? "";
  const step: Step = urlFrom && urlTo && urlType ? "checklist" : "selector";

  // True only if the page loaded directly into the checklist step (e.g. opened
  // from a saved checklist link), as opposed to reaching it via the selector
  // wizard in this session.
  const openedDirectlyAtChecklist = useRef(step === "checklist").current;

  const [origin, setOrigin] = useState(urlFrom);
  const [destination, setDestination] = useState(urlTo);
  const [visaType, setVisaType] = useState<VisaType | "">(urlType);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [showAllDest, setShowAllDest] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [bankLoading, setBankLoading] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const saveChecklist = useMutation(api.checklists.saveChecklist);
  const currentUser = useQuery(api.users.getCurrentUser, {});
  const plan = currentUser?.plan ?? "free";

  // Keep local state in sync if URL changes (e.g. browser back)
  useEffect(() => {
    setOrigin(urlFrom);
    setDestination(urlTo);
    setVisaType(urlType);
    setCheckedItems({});
  }, [urlFrom, urlTo, urlType]);

  const checklist = destination && visaType
    ? getChecklist(destination, visaType as VisaType)
    : null;

  const canProceed = origin !== "" && destination !== "" && visaType !== "";

  const handleGenerate = () => {
    if (canProceed) {
      setCheckedItems({});
      trackEvent("checklist_started", { destination, visaType: visaType as string });
      setSearchParams({ from: origin, to: destination, type: visaType as string });
    }
  };

  const handleBack = () => {
    if (step === "checklist") {
      // A signed-in user opening one of their saved checklists lands directly
      // on this step; send them back to the dashboard instead of the selector.
      if (openedDirectlyAtChecklist && isDemoAuthenticated) {
        goBackToDashboard();
        return;
      }
      // Otherwise (guest building one from scratch), go back to the selector,
      // removing checklist params but keeping origin/dest selection.
      setSearchParams({});
    } else {
      navigate(-1);
    }
  };

  const toggleItem = (id: string) =>
    setCheckedItems((prev) => ({ ...prev, [id]: !prev[id] }));

  const checkedCount = checklist
    ? checklist.items.filter((i) => checkedItems[i.id]).length : 0;
  const totalRequired = checklist
    ? checklist.items.filter((i) => i.required).length : 0;
  const checkedRequired = checklist
    ? checklist.items.filter((i) => i.required && checkedItems[i.id]).length : 0;
  const progress = checklist && checklist.items.length > 0
    ? Math.round((checkedCount / checklist.items.length) * 100) : 0;

  // Readiness score: weighted (required items worth 70%, optional 30%)
  const readinessScore = checklist ? (() => {
    const reqTotal = checklist.items.filter(i => i.required).length;
    const optTotal = checklist.items.filter(i => !i.required).length;
    const reqDone = checklist.items.filter(i => i.required && checkedItems[i.id]).length;
    const optDone = checklist.items.filter(i => !i.required && checkedItems[i.id]).length;
    const reqScore = reqTotal > 0 ? (reqDone / reqTotal) * 70 : 70;
    const optScore = optTotal > 0 ? (optDone / optTotal) * 30 : 30;
    return Math.round(reqScore + optScore);
  })() : 0;

  const handleDownloadPDF = async () => {
    if (!checklist) return;
    setPdfLoading(true);
    try {
      await downloadChecklistPDF(checklist, origin, checkedItems);
      toast.success("Checklist PDF downloaded successfully");
    } catch {
      toast.error("Failed to generate PDF. Please try again.");
    } finally {
      setPdfLoading(false);
    }
  };

  const handleDownloadBankLetter = async () => {
    if (!checklist) return;
    setBankLoading(true);
    try {
      await downloadBankLetterPDF(origin, destination, visaType as string, checklist.fee, checklist.processingTime);
      toast.success("Bank letter template downloaded");
    } catch {
      toast.error("Failed to generate bank letter. Please try again.");
    } finally {
      setBankLoading(false);
    }
  };

  const handleCopyShareLink = () => {
    const url = new URL(window.location.href);
    url.pathname = "/checklist";
    url.search = "";
    url.searchParams.set("from", origin);
    url.searchParams.set("to", destination);
    url.searchParams.set("type", visaType as string);
    navigator.clipboard.writeText(url.toString()).then(() => {
      setLinkCopied(true);
      trackEvent("share_link_copied", { destination });
      toast.success("Shareable link copied! Send it to your client.");
      setTimeout(() => setLinkCopied(false), 3000);
    }).catch(() => toast.error("Failed to copy link."));
  };

  return (
    <div className="min-h-screen bg-background">

      {/* ── Nav ── */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="text-muted-foreground hover:text-primary transition-colors cursor-pointer p-1 -ml-1"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity"
            >
              <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
                <Globe className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <div>
                <span className="font-serif text-lg font-semibold text-primary">VisaClear</span>
                <span className="text-[10px] text-muted-foreground ml-1.5 tracking-widest uppercase">by Vericore</span>
              </div>
            </button>
          </div>
          <div className="flex items-center gap-2">
            {step === "checklist" && checklist && (
              <div className="flex items-center gap-3">
                <div className="text-xs text-muted-foreground font-medium hidden sm:block">
                  {checkedCount} / {checklist.items.length} complete
                </div>
                <button
                  onClick={() => {
                    if (!canUseAI(plan)) {
                      toast.error("AI Assistant is a Pro feature. Upgrade to unlock.");
                      return;
                    }
                    setShowAI(true);
                  }}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary/8 text-primary hover:bg-primary/15 transition-colors cursor-pointer border border-primary/20"
                >
                  <Bot className="w-3.5 h-3.5" />
                  Ask AI
                </button>
              </div>
            )}
            {isDemoAuthenticated && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => navigate("/dashboard")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors cursor-pointer border border-transparent hover:border-primary/20"
                  title="My Dashboard"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">My Dashboard</span>
                </button>
                <button
                  onClick={() => navigate("/settings/profile")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors cursor-pointer border border-transparent hover:border-primary/20"
                  title="Profile settings"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Settings</span>
                </button>
                <button
                  onClick={() => {
                    signOut();
                    navigate("/");
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors cursor-pointer border border-transparent hover:border-destructive/20"
                  title="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-10">
        <AnimatePresence mode="wait">

          {/* ── SELECTOR ── */}
          {step === "selector" && (
            <motion.div
              key="selector"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-center mb-10">
                <h1 className="font-serif text-4xl font-semibold text-primary mb-3">
                  Your Visa Checklist

                </h1>
                <p className="text-muted-foreground text-base">
                  Answer three questions. Receive your complete document guide instantly.
                </p>
              </div>

              <div className="space-y-4">
                <LiveDataDisclaimer />

                {/* Step 1 , Origin */}
                <div className="bg-card border border-border rounded-xl p-6">
                  <label className="block text-sm font-semibold text-primary mb-1.5">
                    1. Where are you from?
                  </label>
                  <p className="text-xs text-muted-foreground mb-3">Search and select your country of origin</p>
                  <CountrySearch value={origin} onChange={setOrigin} />
                  {origin && (
                    <p className="text-xs text-accent mt-2 font-medium">
                      ✓ {origin} selected
                    </p>
                  )}
                </div>

                {/* Step 2 , Destination */}
                <div className="bg-card border border-border rounded-xl p-6">
                  <label className="block text-sm font-semibold text-primary mb-1.5">
                    2. Where do you want to go?
                  </label>
                  <p className="text-xs text-muted-foreground mb-4">Select your destination country</p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {(showAllDest ? AVAILABLE_DESTINATIONS : AVAILABLE_DESTINATIONS.slice(0, INITIAL_SHOWN)).map((d, idx) => {
                      const locked = !canAccessDestination(plan, idx);
                      return (
                      <button
                        key={d}
                        onClick={() => {
                          if (locked) {
                            toast.error("Upgrade to Pro to access all 24+ destinations.");
                            return;
                          }
                          setDestination(d); setVisaType("");
                        }}
                        className={cn(
                          "flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all cursor-pointer relative",
                          locked
                            ? "border-border/40 bg-muted/30 opacity-60"
                            : destination === d
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border bg-background hover:border-primary/30 hover:bg-primary/3"
                        )}
                      >
                        {locked && (
                          <div className="absolute top-1.5 right-1.5">
                            <Lock className="w-2.5 h-2.5 text-muted-foreground/60" />
                          </div>
                        )}
                        <span className="text-2xl">{DEST_FLAGS[d] ?? "🌍"}</span>
                        <span className={cn(
                          "text-[11px] font-medium leading-tight",
                          destination === d ? "text-primary" : "text-foreground/75"
                        )}>{d}</span>
                        {!CHECKLISTS_WITH_DATA.has(d) && (
                          <span className="text-[9px] text-accent/80 tracking-wide font-medium">Coming soon</span>
                        )}
                      </button>
                    );})}
                  </div>
                  {AVAILABLE_DESTINATIONS.length > INITIAL_SHOWN && (
                    <button
                      onClick={() => setShowAllDest(!showAllDest)}
                      className="mt-3 w-full flex items-center justify-center gap-2 text-xs text-primary font-medium py-2.5 rounded-lg border border-primary/20 hover:bg-primary/4 transition-colors cursor-pointer"
                    >
                      {showAllDest ? (
                        <><ChevronUp className="w-3.5 h-3.5" /> Show fewer countries</>
                      ) : (
                        <><ChevronDown className="w-3.5 h-3.5" /> Show all {AVAILABLE_DESTINATIONS.length} countries</>
                      )}
                    </button>
                  )}
                  {plan === "free" && (
                    <div className="flex items-center gap-2 mt-2 p-2.5 rounded-lg bg-accent/8 border border-accent/20">
                      <Lock className="w-3 h-3 text-accent shrink-0" />
                      <p className="text-[11px] text-accent/80 leading-snug">
                        Free plan includes {FREE_DESTINATION_LIMIT} destinations.{" "}
                        <button onClick={() => navigate("/pricing")} className="underline font-semibold cursor-pointer">Upgrade to Pro</button>
                        {" "}for all 24+ countries.
                      </p>
                    </div>
                  )}
                </div>

                {/* Step 3 , Visa Type */}
                <div className="bg-card border border-border rounded-xl p-6">
                  <label className="block text-sm font-semibold text-primary mb-1.5">
                    3. Purpose of visit
                  </label>
                  <p className="text-xs text-muted-foreground mb-4">What is the reason for your travel?</p>
                  <div className="space-y-2">
                    {VISA_TYPES.map((vt) => (
                      <button
                        key={vt.value}
                        onClick={() => setVisaType(vt.value)}
                        className={cn(
                          "w-full flex items-center gap-3 p-3.5 rounded-lg border text-left transition-all cursor-pointer",
                          visaType === vt.value
                            ? "border-primary bg-primary/5"
                            : "border-border bg-background hover:border-primary/30"
                        )}
                      >
                        <div className={cn(
                          "w-4 h-4 rounded-full border-2 shrink-0 transition-all",
                          visaType === vt.value
                            ? "border-primary bg-primary"
                            : "border-muted-foreground/40"
                        )} />
                        <div>
                          <div className={cn(
                            "font-medium text-sm",
                            visaType === vt.value ? "text-primary" : "text-foreground"
                          )}>{vt.label}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{vt.description}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <motion.div
                  animate={canProceed ? { scale: [1, 1.02, 1] } : {}}
                  transition={{ duration: 0.6, repeat: canProceed ? Infinity : 0, repeatDelay: 2 }}
                >
                <Button
                  size="lg"
                  className="w-full cursor-pointer font-semibold py-6 text-base bg-primary hover:bg-primary/90 shadow-md"
                  disabled={!canProceed}
                  onClick={handleGenerate}
                >
                  Generate My Checklist
                  <ChevronRight className="w-5 h-5 ml-1.5" />
                </Button>
                </motion.div>

                {!canProceed && (
                  <p className="text-center text-xs text-muted-foreground">
                    Complete all three fields above to continue
                  </p>
                )}
                {/* Privacy note */}
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
                  <Lock className="w-3 h-3 text-accent" />
                  <span><em>It&apos;s all about Privacy.</em> We collect no personal data at this stage.</span>
                </div>
              </div>

              {/* ── Sticky bottom CTA bar ── */}
              <AnimatePresence>
                {canProceed && (
                  <motion.div
                    key="sticky-cta"
                    initial={{ y: 80, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 80, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-5 pt-3 bg-background/95 backdrop-blur-md border-t border-border/60"
                  >
                    <div className="max-w-3xl mx-auto">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground">Ready to generate</p>
                          <p className="text-sm font-semibold text-primary truncate">
                            {DEST_FLAGS[destination] ?? "🌍"} {destination} · {VISA_TYPES.find(v => v.value === visaType)?.label}
                          </p>
                        </div>
                        <Button
                          size="lg"
                          className="cursor-pointer font-semibold shrink-0 bg-primary hover:bg-primary/90 shadow-md"
                          onClick={handleGenerate}
                        >
                          View My Checklist
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </motion.div>
          )}

          {/* ── CHECKLIST ── */}
          {step === "checklist" && (
            <motion.div
              key="checklist"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3 }}
            >
              {checklist ? (
                <div className="space-y-5">

                  {/* Header card */}
                  <div className="bg-primary rounded-xl p-6 text-primary-foreground">
                    <div className="flex items-start justify-between gap-4 mb-5">
                      <div>
                        <div className="flex items-center gap-2.5 mb-1">
                          <span className="text-2xl">{DEST_FLAGS[destination] ?? "🌍"}</span>
                          <h2 className="font-serif text-2xl font-semibold capitalize">
                            {destination} {checklist.visaType} Visa
                          </h2>
                        </div>
                        <p className="text-primary-foreground/60 text-sm">
                          Applied from {origin}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-serif text-3xl font-semibold"
                          style={{ color: "oklch(0.72 0.13 80)" }}>{progress}%</div>
                        <div className="text-xs text-primary-foreground/50 mt-0.5">complete</div>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-5">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: "oklch(0.72 0.13 80)" }}
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" as const }}
                      />
                    </div>

                    {/* Meta row */}
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { icon: <Clock className="w-3.5 h-3.5" />, label: "Processing", val: checklist.processingTime },
                        { icon: <DollarSign className="w-3.5 h-3.5" />, label: "Visa Fee", val: checklist.fee },
                        { icon: <CheckCircle2 className="w-3.5 h-3.5" />, label: "Required", val: `${checkedRequired}/${totalRequired}` },
                      ].map((m) => (
                        <div key={m.label} className="bg-white/8 rounded-lg p-3">
                          <div className="flex items-center gap-1.5 mb-1"
                            style={{ color: "oklch(0.72 0.13 80)" }}>
                            {m.icon}
                            <span className="text-[10px] tracking-wide uppercase font-medium text-primary-foreground/50">{m.label}</span>
                          </div>
                          <div className="text-xs font-semibold text-primary-foreground leading-snug">{m.val}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── Readiness Score Card ── */}
                  <div className="bg-card border border-border rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      <h3 className="font-semibold text-sm text-primary uppercase tracking-widest">Application Readiness Score</h3>
                    </div>
                    <ReadinessScore score={readinessScore} />
                    <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
                      Score is based on {checkedCount} of {checklist.items.length} documents checked. Required items carry more weight than optional ones.
                    </p>
                  </div>

                  {/* ── Share Link (for Agents) ── */}
                  <div className="bg-card border border-primary/20 rounded-xl p-5">
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center shrink-0">
                        <Share2 className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-foreground">Share Checklist Link</div>
                        <div className="text-[11px] text-muted-foreground">For visa agents · Pre-filled for your client</div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                      Copy a unique link that opens this exact checklist pre-filled for your client. Send it via WhatsApp, email, or any channel.
                    </p>
                    <div className="flex items-center gap-2 p-2.5 bg-muted/40 rounded-lg border border-border mb-3 text-xs font-mono text-muted-foreground overflow-hidden">
                      <span className="truncate">
                        {typeof window !== "undefined"
                          ? `${window.location.origin}/checklist?from=${encodeURIComponent(origin)}&to=${encodeURIComponent(destination)}&type=${visaType}`
                          : ""}
                      </span>
                    </div>
                    <button
                      onClick={handleCopyShareLink}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold border border-primary/30 text-primary hover:bg-primary/5 transition-colors rounded-lg px-3 py-2 cursor-pointer"
                    >
                      {linkCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {linkCopied ? "Copied!" : "Copy Link"}
                    </button>
                  </div>

                  {/* ── PDF & Bank Letter Downloads ── */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Checklist PDF */}
                    <div className="bg-card border border-border rounded-xl p-5">
                      <div className="flex items-center gap-2.5 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center shrink-0">
                          <Download className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <div className="font-semibold text-sm text-foreground">Download Checklist</div>
                          <div className="text-[11px] text-muted-foreground">Premium PDF · Print-ready</div>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                        Professionally formatted PDF with your progress, approval tips, and all document requirements.
                      </p>
                      <button
                        onClick={() => {
                          if (!canDownloadPDF(plan)) {
                            toast.error("PDF export is a Pro feature. Upgrade to download.");
                            return;
                          }
                          void handleDownloadPDF();
                        }}
                        disabled={pdfLoading}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors rounded-lg px-3 py-2 cursor-pointer disabled:opacity-60"
                      >
                        {pdfLoading ? <Spinner /> : canDownloadPDF(plan) ? <Download className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                        {pdfLoading ? "Generating…" : canDownloadPDF(plan) ? "Download PDF" : "Pro Feature"}
                      </button>
                    </div>

                    {/* Bank Letter Template */}
                    <div className="bg-card border border-border rounded-xl p-5">
                      <div className="flex items-center gap-2.5 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4 text-accent" />
                        </div>
                        <div>
                          <div className="font-semibold text-sm text-foreground">Bank Letter Template</div>
                          <div className="text-[11px] text-muted-foreground">Sample · Take to your bank</div>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                        Official-style template your bank or employer can use to write your financial support letter.
                      </p>
                      <button
                        onClick={() => { void handleDownloadBankLetter(); }}
                        disabled={bankLoading}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold border border-accent/40 text-accent hover:bg-accent/5 transition-colors rounded-lg px-3 py-2 cursor-pointer disabled:opacity-60"
                      >
                        {bankLoading ? <Spinner /> : <FileText className="w-3.5 h-3.5" />}
                        {bankLoading ? "Generating…" : "Download Template"}
                      </button>
                    </div>
                  </div>

                  {/* How to use bank letter */}
                  <div className="bg-card border border-border/60 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-sm text-foreground mb-1">How to use the Bank Letter Template</div>
                        <ol className="text-xs text-muted-foreground leading-relaxed space-y-1 list-decimal ml-4">
                          <li>Download and print the template</li>
                          <li>Take it to your bank or employer</li>
                          <li>Ask them to reproduce it on official letterhead</li>
                          <li>Ensure it is stamped, signed, and dated by an authorised officer</li>
                          <li>Submit the official version with your visa application</li>
                        </ol>
                      </div>
                    </div>
                  </div>

                  {/* ── AI Ask button ── */}
                  <button
                    onClick={() => {
                      if (!canUseAI(plan)) {
                        toast.error("AI Assistant is a Pro feature. Upgrade to unlock.");
                        return;
                      }
                      setShowAI(true);
                    }}
                    className="w-full flex items-center gap-3 p-4 rounded-xl border border-primary/25 bg-primary/4 hover:bg-primary/8 transition-colors cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
                      <MessageSquare className="w-4.5 h-4.5 text-primary-foreground" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-semibold text-sm text-primary">Ask VisaClear AI</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Get instant answers about your {destination} {visaType} visa application
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-primary shrink-0" />
                  </button>

                  {/* Success tip */}
                  <div className="flex items-start gap-3 border border-primary/20 bg-primary/5 rounded-xl p-4">
                    <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-sm text-primary mb-1">Top Approval Tip</div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{checklist.successTip}</p>
                    </div>
                  </div>

                  {/* Disclaimer + Last Verified + Embassy Link */}
                  <div className="flex items-start gap-3 border border-border bg-card rounded-xl p-4">
                    <AlertCircle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                        <span className="font-semibold text-foreground">Important: </span>
                        This checklist is a guidance tool only and does not constitute legal or immigration advice.
                        Requirements change regularly , always verify with the official embassy or consulate website
                        before submitting your application.
                      </p>
                      <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-border/50">
                        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <Shield className="w-3 h-3 text-accent" />
                          Last verified: <strong className="text-foreground">{new Date(checklist.lastVerified).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</strong>
                        </span>
                        <a
                          href={checklist.embassyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[11px] text-accent font-semibold hover:underline"
                        >
                          <Globe className="w-3 h-3" />
                          Official {destination} Embassy Portal
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Items */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-primary text-sm uppercase tracking-widest">
                        Document Checklist
                      </h3>
                      <span className="text-xs text-muted-foreground">
                        {checklist.items.length} items · {totalRequired} required
                      </span>
                    </div>
                    <div className="space-y-2.5">
                      {checklist.items.map((item, idx) => (
                        <ChecklistItemCard
                          key={item.id}
                          item={item}
                          index={idx}
                          checked={!!checkedItems[item.id]}
                          onToggle={() => toggleItem(item.id)}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Completion message + Post-checklist CTAs */}
                  <AnimatePresence>
                    {checkedRequired === totalRequired && totalRequired > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4"
                      >
                        {/* Success banner */}
                        <div className="bg-card border border-accent/30 rounded-xl p-8 text-center">
                          <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 className="w-7 h-7 text-accent" />
                          </div>
                          <h3 className="font-serif text-2xl font-semibold text-primary mb-2">
                            You&apos;re ready to apply!
                          </h3>
                          <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                            All required documents are gathered. Here are your next steps to submit a strong application.
                          </p>
                        </div>

                        {/* Action cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Apply now */}
                          <div className="bg-primary rounded-xl p-5 text-primary-foreground">
                            <div className="flex items-center gap-2.5 mb-3">
                              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                                <Globe className="w-4 h-4" />
                              </div>
                              <span className="font-semibold text-sm">Apply Online Now</span>
                            </div>
                            <p className="text-xs text-primary-foreground/70 leading-relaxed mb-4">
                              Go directly to the official embassy or immigration portal to start your application.
                            </p>
                            <a
                              href={checklist.embassyUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white/15 hover:bg-white/25 transition-colors rounded-lg px-3 py-2 cursor-pointer"
                            >
                              Open Official Portal
                              <ChevronRight className="w-3.5 h-3.5" />
                            </a>
                          </div>

                          {/* Find an agent */}
                          <div className="bg-card border border-border rounded-xl p-5">
                            <div className="flex items-center gap-2.5 mb-3">
                              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                                <Award className="w-4 h-4 text-accent" />
                              </div>
                              <span className="font-semibold text-sm text-foreground">Find a Visa Agent</span>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                              For complex or high-stakes applications, a verified agent dramatically reduces rejection risk.
                            </p>
                            <button
                              onClick={() => toast.info("Verified Agent Marketplace , coming in the next release!")}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold border border-accent/40 text-accent hover:bg-accent/5 transition-colors rounded-lg px-3 py-2 cursor-pointer"
                            >
                              Browse Verified Agents
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Save checklist */}
                          <div className="bg-card border border-border rounded-xl p-5">
                            <div className="flex items-center gap-2.5 mb-3">
                              <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center shrink-0">
                                <Lock className="w-4 h-4 text-primary" />
                              </div>
                              <span className="font-semibold text-sm text-foreground">Save Your Progress</span>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                              Save this checklist to your dashboard, get deadline reminders, and pick up where you left off.
                            </p>
                            <Authenticated>
                              <button
                                disabled={saveLoading}
                                onClick={async () => {
                                  if (!checklist) return;
                                  setSaveLoading(true);
                                  try {
                                    await saveChecklist({
                                      origin,
                                      destination,
                                      visaType: visaType as string,
                                      checkedItems: Object.keys(checkedItems).filter(k => checkedItems[k]),
                                      title: `${destination} ${visaType} Visa`,
                                      progress,
                                    });
                                    toast.success("Checklist saved to your dashboard!");
                                  } catch (err) {
                                    if (err instanceof ConvexError) {
                                      const { code } = err.data as { code: string; message: string };
                                      if (code === "MONTHLY_LIMIT_REACHED") {
                                        setShowUpgradeModal(true);
                                      } else {
                                        toast.error((err.data as { message: string }).message);
                                      }
                                    } else {
                                      toast.error("Failed to save. Please try again.");
                                    }
                                  } finally {
                                    setSaveLoading(false);
                                  }
                                }}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold border border-primary/30 text-primary hover:bg-primary/5 transition-colors rounded-lg px-3 py-2 cursor-pointer disabled:opacity-60"
                              >
                                {saveLoading ? <Spinner /> : <Lock className="w-3.5 h-3.5" />}
                                {saveLoading ? "Saving…" : "Save Checklist"}
                              </button>
                            </Authenticated>
                          </div>

                          {/* Upgrade */}
                          <div className="bg-gradient-to-br from-primary/8 to-accent/8 border border-primary/20 rounded-xl p-5">
                            <div className="flex items-center gap-2.5 mb-3">
                              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                <Shield className="w-4 h-4 text-primary" />
                              </div>
                              <div>
                                <span className="font-semibold text-sm text-foreground">VisaClear Pro</span>
                                <span className="ml-2 text-[10px] tracking-wide uppercase font-bold text-accent">New</span>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                              AI rejection analyser, PDF export, deadline alerts, unlimited checklists, and priority support.
                            </p>
                            <button
                      onClick={() => navigate("/pricing")}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors rounded-lg px-3 py-2 cursor-pointer"
                            >
                              See Pro Plans
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Step-by-step guide */}
                        <div className="bg-card border border-border rounded-xl p-6">
                          <h4 className="font-semibold text-sm text-primary uppercase tracking-widest mb-4">Application Roadmap</h4>
                          <div className="space-y-3">
                            {[
                              { n: "1", title: "Double-check every document", desc: "Check for expired dates, missing stamps, and name spelling errors." },
                              { n: "2", title: "Confirm requirements on official embassy site", desc: "Rules change. Always verify before submitting." },
                              { n: "3", title: "Book your biometric or interview appointment", desc: "Slots fill fast , book as early as possible." },
                              { n: "4", title: "Submit your application", desc: "Apply online or in person at the embassy / VAC." },
                              { n: "5", title: "Track your application status", desc: "Use your reference number at the embassy's tracking portal." },
                            ].map((item) => (
                              <div key={item.n} className="flex gap-3 items-start">
                                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5">
                                  <span className="text-[11px] font-bold text-primary-foreground">{item.n}</span>
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.desc}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Referral share prompt */}
                        <div className="bg-card border border-accent/30 rounded-xl p-6 text-center">
                          <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-3">
                            <Share2 className="w-5 h-5 text-accent" />
                          </div>
                          <h4 className="font-serif text-lg font-semibold text-primary mb-1">Know someone applying for the same visa?</h4>
                          <p className="text-xs text-muted-foreground leading-relaxed mb-4 max-w-xs mx-auto">
                            Share this exact checklist with them. One click , they arrive with everything pre-filled.
                          </p>
                          <button
                            onClick={handleCopyShareLink}
                            className="inline-flex items-center gap-2 text-sm font-semibold bg-accent text-white hover:bg-accent/90 transition-colors rounded-lg px-5 py-2.5 cursor-pointer"
                          >
                            {linkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            {linkCopied ? "Link Copied!" : "Copy Shareable Link"}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Trust badges */}
                  <div className="flex flex-wrap items-center justify-center gap-4 py-2">
                    {[
                      { icon: <Shield className="w-3 h-3" />, label: "GDPR Compliant" },
                      { icon: <Lock className="w-3 h-3" />, label: "NDPA Compliant" },
                      { icon: <Award className="w-3 h-3" />, label: "CISA Certified" },
                    ].map((t) => (
                      <div key={t.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="text-accent">{t.icon}</span>
                        {t.label}
                      </div>
                    ))}
                  </div>

                  <Button
                    variant="secondary"
                    className="w-full cursor-pointer font-medium"
                    onClick={() => setSearchParams({})}                  >
                    Start a New Checklist
                  </Button>

                  {/* ── What's Next for VisaClear ── */}
                  <div className="bg-primary rounded-xl p-6 text-primary-foreground">
                    <div className="mb-4">
                      <div className="text-sm tracking-widest uppercase font-bold mb-1" style={{ color: "oklch(0.72 0.13 80)" }}>
                        Unlock More
                      </div>
                      <h3 className="font-serif text-2xl font-semibold">Take Your Application Further</h3>
                      <p className="text-primary-foreground/60 text-xs mt-1">
                        Upgrade to VisaClear Pro for the complete toolkit.
                      </p>
                    </div>
                    <div className="space-y-3 mb-5">
                      {[
                        { emoji: "🤖", label: "AI Rejection Analyser", desc: "Understand exactly why applications fail and fix yours before submitting" },
                        { emoji: "📸", label: "Passport Photo Checker", desc: "AI-powered photo compliance check against embassy standards" },
                        { emoji: "📄", label: "Unlimited PDF Exports", desc: "Download branded checklists and bank letter templates anytime" },
                        { emoji: "🔔", label: "Deadline Reminders", desc: "Never miss a biometric appointment or document expiry" },
                        { emoji: "🔗", label: "Agent Share Links", desc: "Send pre-filled checklists to clients with one link" },
                      ].map((f) => (
                        <div key={f.label} className="flex items-start gap-3">
                          <span className="text-lg shrink-0 mt-0.5">{f.emoji}</span>
                          <div>
                            <div className="font-semibold text-sm text-white">{f.label}</div>
                            <div className="text-xs text-primary-foreground/55 leading-snug">{f.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => navigate("/pricing")}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-base cursor-pointer transition-colors"
                      style={{ background: "oklch(0.72 0.13 80)", color: "oklch(0.18 0.04 80)" }}
                    >
                      See All Pro Features & Pricing
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-24">
                  <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-5">
                    <AlertCircle className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <h3 className="font-serif text-2xl font-semibold text-primary mb-2">
                    Checklist not available yet
                  </h3>
                  <p className="text-muted-foreground text-sm mb-8 max-w-sm mx-auto">
                    We do not have data for this combination yet. We are expanding our database regularly.
                  </p>
                  <Button onClick={() => setSearchParams({})} className="cursor-pointer">
                    Try Another Combination
                  </Button>
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Footer */}
      <footer className="border-t border-border mt-10 py-6 px-6 text-center">
        <p className="text-xs text-muted-foreground italic mb-1">&ldquo;It&apos;s all about Privacy.&rdquo;</p>
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Vericore Ltd. · VisaClear is a guidance tool, not legal advice.
        </p>
      </footer>

      {/* AI Assistant Modal */}
      <AnimatePresence>
        {showAI && (
          <AIAssistant
            origin={origin}
            destination={destination}
            visaType={visaType as string}
            plan={plan}
            onClose={() => setShowAI(false)}
          />
        )}
      </AnimatePresence>

      <UpgradeModal open={showUpgradeModal} onOpenChange={setShowUpgradeModal} />
    </div>
  );
}
