import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSeo } from "@/hooks/use-seo.ts";
import { useSmartBack } from "@/hooks/use-smart-back.ts";
import { useDemoAuth } from "@/hooks/use-demo-auth.ts";
import { useCountryName } from "@/hooks/use-country-name.ts";
import { useTranslation } from "react-i18next";
import { DESTINATION_FLAGS } from "@/lib/destination-flags.ts";
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
  Users, UserPlus,
} from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import { downloadChecklistPDF, downloadBankLetterPDF } from "@/lib/pdf-export.ts";
import {
  AVAILABLE_DESTINATIONS, VISA_TYPES, type VisaType, type ChecklistItem,
  CHECKLISTS_WITH_DATA,
} from "@/lib/visa-data.ts";
import { getLocalizedChecklist, ensureChecklistLanguageLoaded } from "@/lib/visa-data-i18n.ts";
import { CountrySelect } from "@/components/CountrySelect.tsx";
import { cn } from "@/lib/utils.ts";
import { toast } from "sonner";
import { LiveDataDisclaimer } from "@/components/live-data-disclaimer.tsx";
import { UpgradeModal } from "@/components/upgrade-modal.tsx";
import { PreSubmissionAuditCard } from "@/components/checklist/pre-submission-audit.tsx";
import {
  canDownloadPDF, canUseAI, canSetReminders,
  canAccessDestination, FREE_DESTINATION_LIMIT,
} from "@/lib/plan-gates.ts";
import { ConvexError } from "convex/values";
import { trackEvent } from "@/hooks/use-analytics.ts";

const DEST_FLAGS = DESTINATION_FLAGS;

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
  const { t } = useTranslation("checklist");
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
                {t("item.optional")}
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
                  <span className="font-semibold text-foreground">{t("item.where_label")}</span>
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
  const { t } = useTranslation("checklist");
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const color = score >= 80 ? "#16a34a" : score >= 50 ? "#d97706" : "#dc2626";
  const label = score >= 80 ? t("readiness.strong") : score >= 50 ? t("readiness.moderate") : t("readiness.needs_work");

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
        <div className="font-semibold text-sm text-foreground mb-1">{t("readiness.title")}</div>
        <div className="font-bold text-lg" style={{ color }}>{label}</div>
        <div className="text-xs text-muted-foreground mt-1 leading-relaxed max-w-[180px]">
          {score >= 80
            ? t("readiness.desc_strong")
            : score >= 50
            ? t("readiness.desc_moderate")
            : t("readiness.desc_weak")}
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
  isDemoAuthenticated,
  onClose,
}: {
  origin: string;
  destination: string;
  visaType: string;
  plan: string;
  isDemoAuthenticated: boolean;
  onClose: () => void;
}) {
  const translateCountry = useCountryName();
  const { t, i18n } = useTranslation("checklist");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: t("ai.welcome", { visaType, destination: translateCountry(destination) }),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const askQuestion = useAction(api.ai.assistant.askVisaQuestion);
  const usage = useQuery(api.aiUsage.getMyUsage, isDemoAuthenticated ? "skip" : {});

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
      if (isDemoAuthenticated) {
        await new Promise((resolve) => setTimeout(resolve, 600));
        const answer = t("ai.demo_answer", { destination: translateCountry(destination), visaType });
        setMessages((prev) => [...prev, { role: "assistant", text: answer, feedback: null }]);
        return;
      }
      const answer = await askQuestion({
        question: q,
        context: { origin, destination, visaType },
        language: i18n.language,
      });
      setMessages((prev) => [...prev, { role: "assistant", text: answer, feedback: null }]);
    } catch (err) {
      const message = err instanceof ConvexError
        ? (err.data as { message: string }).message
        : t("ai.error_generic");
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
      toast.success(t("ai.feedback_thanks_up"));
    } else {
      toast.info(t("ai.feedback_thanks_down"));
    }
  };

  const quickQuestions = [
    t("ai.quick_q1"),
    t("ai.quick_q2"),
    t("ai.quick_q3"),
    t("ai.quick_q4"),
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
            <div className="font-semibold text-white text-sm">{t("ai.header_title")}</div>
            <div className="text-[11px] text-white/60">{t("ai.header_meta", { destination: translateCountry(destination), visaType })}</div>
          </div>
          {plan === "free" ? (
            <div className="text-[11px] text-white/70 font-medium px-2.5 py-1 rounded-lg bg-white/10">
              {t("ai.pro_feature")}
            </div>
          ) : remaining !== null ? (
            <div className="text-[11px] text-white/70 font-medium px-2.5 py-1 rounded-lg bg-white/10">
              {t("ai.remaining_left", { remaining, limit: usage?.limit })}
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
            <strong>{t("ai.disclaimer_strong")}</strong> {t("ai.disclaimer_rest")}
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
                        <span className="text-[10px] text-muted-foreground mr-0.5">{t("ai.was_helpful")}</span>
                        <button
                          onClick={() => setFeedback(i, "up")}
                          className="p-1 rounded text-muted-foreground hover:text-accent transition-colors cursor-pointer"
                          title={t("ai.helpful_title")}
                        >
                          <ThumbsUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => setFeedback(i, "down")}
                          className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                          title={t("ai.not_helpful_title")}
                        >
                          <ThumbsDown className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <span className="text-[10px] text-muted-foreground italic">
                        {m.feedback === "up" ? t("ai.marked_helpful") : t("ai.feedback_noted")}
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
                <span className="text-xs text-muted-foreground">{t("ai.thinking")}</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Quick questions */}
        {messages.length <= 1 && (
          <div className="px-4 pb-2">
            <p className="text-[11px] text-muted-foreground mb-2 font-medium">{t("ai.quick_questions_label")}</p>
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
              {t("ai.last_question")}{" "}
              <button
                onClick={() => { onClose(); }}
                className="text-accent font-semibold underline cursor-pointer"
              >
                {t("ai.upgrade_unlimited")}
              </button>
            </p>
          </div>
        )}

        {/* Input */}
        <div className="px-4 pb-4 pt-2 border-t border-border">
          {plan === "free" || (remaining !== null && remaining <= 0) ? (
            <div className="text-center py-3">
              <p className="text-sm font-semibold text-foreground mb-1">
                {plan === "free" ? t("ai.free_title") : t("ai.limit_reached_title")}
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                {plan === "free" ? t("ai.free_desc") : t("ai.limit_reached_desc")}
              </p>
              <button
                onClick={() => onClose()}
                className="text-xs font-semibold text-accent border border-accent/30 rounded-lg px-4 py-1.5 hover:bg-accent/5 transition-colors cursor-pointer"
              >
                {t("ai.see_pro_plans")}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { void send(); } }}
                placeholder={t("ai.input_placeholder")}
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
  const { t, i18n } = useTranslation("checklist");
  useSeo({ title: "Visa Checklist", description: "Get your precise, personalised visa document checklist in 60 seconds. No vague advice — exact documents and what embassies actually want to see." });
  const navigate = useNavigate();
  const goBackToDashboard = useSmartBack("/dashboard");
  const goBackToHome = useSmartBack("/");
  const { isDemoAuthenticated, user: demoUser, signOut } = useDemoAuth();
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

  const translateCountry = useCountryName();
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
  const currentUser = useQuery(api.users.getCurrentUser, isDemoAuthenticated ? "skip" : {});
  const plan = isDemoAuthenticated ? (demoUser?.plan ?? "expert") : (currentUser?.plan ?? "free");
  // True only once the auth query has fully resolved with no user — avoids a
  // flash during the loading window where currentUser is still undefined.
  const isAnonymous = !isDemoAuthenticated && currentUser === null;

  // Keep local state in sync if URL changes (e.g. browser back)
  useEffect(() => {
    setOrigin(urlFrom);
    setDestination(urlTo);
    setVisaType(urlType);
    setCheckedItems({});
  }, [urlFrom, urlTo, urlType]);

  // Scroll to top when the checklist results appear (setSearchParams doesn't
  // change the pathname so useScrollToTop never fires on this transition).
  useEffect(() => {
    if (step === "checklist") {
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: "instant" });
      });
    }
  }, [step]);

  const [, setI18nTick] = useState(0);
  useEffect(() => {
    ensureChecklistLanguageLoaded(i18n.language).then(() => setI18nTick((n) => n + 1));
  }, [i18n.language]);

  const checklist = destination && visaType
    ? getLocalizedChecklist(destination, visaType as VisaType, i18n.language)
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
      goBackToHome();
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
      toast.success(t("pdf.toast_success"));
    } catch {
      toast.error(t("pdf.toast_failed"));
    } finally {
      setPdfLoading(false);
    }
  };

  const handleDownloadBankLetter = async () => {
    if (!checklist) return;
    setBankLoading(true);
    try {
      await downloadBankLetterPDF(origin, destination, visaType as string, checklist.fee, checklist.processingTime);
      toast.success(t("bank.toast_success"));
    } catch {
      toast.error(t("bank.toast_failed"));
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
      toast.success(t("share.toast_success"));
      setTimeout(() => setLinkCopied(false), 3000);
    }).catch(() => toast.error(t("share.toast_failed")));
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
                  {t("nav.complete_count", { checked: checkedCount, total: checklist.items.length })}
                </div>
                <button
                  onClick={() => {
                    if (!canUseAI(plan)) {
                      toast.error(t("nav.ai_pro_feature_toast"));
                      return;
                    }
                    setShowAI(true);
                  }}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary/8 text-primary hover:bg-primary/15 transition-colors cursor-pointer border border-primary/20"
                >
                  <Bot className="w-3.5 h-3.5" />
                  {t("nav.ask_ai")}
                </button>
              </div>
            )}
            {isDemoAuthenticated && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => navigate("/dashboard")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors cursor-pointer border border-transparent hover:border-primary/20"
                  title={t("nav.my_dashboard")}
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">{t("nav.my_dashboard")}</span>
                </button>
                <button
                  onClick={() => navigate("/settings/profile")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors cursor-pointer border border-transparent hover:border-primary/20"
                  title={t("nav.settings")}
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">{t("nav.settings")}</span>
                </button>
                <button
                  onClick={() => {
                    signOut();
                    navigate("/");
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors cursor-pointer border border-transparent hover:border-destructive/20"
                  title={t("nav.sign_out")}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">{t("nav.sign_out")}</span>
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
                <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-primary mb-3">
                  {t("selector.title")}

                </h1>
                <p className="text-muted-foreground text-base">
                  {t("selector.subtitle")}
                </p>
              </div>

              <div className="space-y-4">
                <LiveDataDisclaimer />

                {/* Step 1 — Origin */}
                <div className="bg-card border border-border rounded-xl p-6">
                  <label className="block text-sm font-semibold text-primary mb-1.5">
                    {t("selector.step1_label")}
                  </label>
                  <p className="text-xs text-muted-foreground mb-3">{t("selector.step1_desc")}</p>
                  <CountrySelect value={origin} onChange={setOrigin} placeholder={t("search.placeholder")} />
                  {origin && (
                    <p className="text-xs text-accent mt-2 font-medium">
                      ✓ {t("selector.origin_selected", { country: translateCountry(origin) })}
                    </p>
                  )}
                </div>

                {/* Step 2 — Destination */}
                <div className="bg-card border border-border rounded-xl p-6">
                  <label className="block text-sm font-semibold text-primary mb-1.5">
                    {t("selector.step2_label")}
                  </label>
                  <p className="text-xs text-muted-foreground mb-4">{t("selector.step2_desc")}</p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {(showAllDest ? AVAILABLE_DESTINATIONS : AVAILABLE_DESTINATIONS.slice(0, INITIAL_SHOWN)).map((d, idx) => {
                      const locked = !canAccessDestination(plan, idx);
                      return (
                      <button
                        key={d}
                        onClick={() => {
                          if (locked) {
                            toast.error(t("selector.upgrade_toast"));
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
                        )}>{translateCountry(d)}</span>
                        {!CHECKLISTS_WITH_DATA.has(d) && (
                          <span className="text-[9px] text-accent/80 tracking-wide font-medium">{t("selector.coming_soon")}</span>
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
                        <><ChevronUp className="w-3.5 h-3.5" /> {t("selector.show_fewer")}</>
                      ) : (
                        <><ChevronDown className="w-3.5 h-3.5" /> {t("selector.show_all", { count: AVAILABLE_DESTINATIONS.length })}</>
                      )}
                    </button>
                  )}
                  {plan === "free" && (
                    <div className="flex items-center gap-2 mt-2 p-2.5 rounded-lg bg-accent/8 border border-accent/20">
                      <Lock className="w-3 h-3 text-accent shrink-0" />
                      <p className="text-[11px] text-accent/80 leading-snug">
                        {t("selector.free_plan_limit", { count: FREE_DESTINATION_LIMIT })}{" "}
                        <button onClick={() => navigate("/pricing")} className="underline font-semibold cursor-pointer">{t("selector.upgrade_to_pro")}</button>
                        {" "}{t("selector.for_all_countries")}
                      </p>
                    </div>
                  )}
                </div>

                {/* Step 3 — Visa Type */}
                <div className="bg-card border border-border rounded-xl p-6">
                  <label className="block text-sm font-semibold text-primary mb-1.5">
                    {t("selector.step3_label")}
                  </label>
                  <p className="text-xs text-muted-foreground mb-4">{t("selector.step3_desc")}</p>
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
                  {t("selector.generate_button")}
                  <ChevronRight className="w-5 h-5 ml-1.5" />
                </Button>
                </motion.div>

                {!canProceed && (
                  <p className="text-center text-xs text-muted-foreground">
                    {t("selector.complete_fields")}
                  </p>
                )}
                {/* Privacy note */}
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
                  <Lock className="w-3 h-3 text-accent" />
                  <span><em>{t("selector.privacy_em")}</em> {t("selector.privacy_rest")}</span>
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
                          <p className="text-xs text-muted-foreground">{t("selector.ready_to_generate")}</p>
                          <p className="text-sm font-semibold text-primary truncate">
                            {DEST_FLAGS[destination] ?? "🌍"} {translateCountry(destination)} · {VISA_TYPES.find(v => v.value === visaType)?.label}
                          </p>
                        </div>
                        <Button
                          size="lg"
                          className="cursor-pointer font-semibold shrink-0 bg-primary hover:bg-primary/90 shadow-md"
                          onClick={handleGenerate}
                        >
                          {t("selector.view_checklist")}
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
                            {t("header.visa_title", { country: translateCountry(destination), visaType: checklist.visaType })}
                          </h2>
                        </div>
                        <p className="text-primary-foreground/60 text-sm">
                          {t("header.applied_from", { country: translateCountry(origin) })}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-serif text-3xl font-semibold"
                          style={{ color: "oklch(0.72 0.13 80)" }}>{progress}%</div>
                        <div className="text-xs text-primary-foreground/50 mt-0.5">{t("header.complete_label")}</div>
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
                        { icon: <Clock className="w-3.5 h-3.5" />, label: t("meta.processing"), val: checklist.processingTime, onClick: () => navigate(`/wait-times?to=${encodeURIComponent(destination)}&type=${encodeURIComponent(visaType)}`) },
                        { icon: <DollarSign className="w-3.5 h-3.5" />, label: t("meta.visa_fee"), val: checklist.fee },
                        { icon: <CheckCircle2 className="w-3.5 h-3.5" />, label: t("meta.required"), val: `${checkedRequired}/${totalRequired}` },
                      ].map((m) => (
                        <div
                          key={m.label}
                          className={cn("bg-white/8 rounded-lg p-3", m.onClick && "cursor-pointer hover:bg-white/12 transition-colors")}
                          onClick={m.onClick}
                          role={m.onClick ? "button" : undefined}
                        >
                          <div className="flex items-center gap-1.5 mb-1"
                            style={{ color: "oklch(0.72 0.13 80)" }}>
                            {m.icon}
                            <span className="text-[10px] tracking-wide uppercase font-medium text-primary-foreground/50">{m.label}</span>
                          </div>
                          <div className="text-xs font-semibold text-primary-foreground leading-snug">{m.val}</div>
                          {m.onClick && <div className="text-[9px] text-primary-foreground/40 mt-0.5">{t("meta.see_wait_times")}</div>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── Save prompt — anonymous visitors only ── */}
                  {isAnonymous && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 }}
                      className="bg-card border-2 border-primary/20 rounded-xl p-5 flex gap-4 items-start"
                    >
                      <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center shrink-0 mt-0.5">
                        <UserPlus className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-foreground mb-1">Save this checklist — free account, 30 seconds</p>
                        <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                          Create a free account to save your progress, set deadline reminders, and come back where you left off. Your checklist stays exactly as you built it.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => navigate(`/login?returnTo=${encodeURIComponent(`/checklist?from=${origin}&to=${destination}&type=${visaType as string}`)}`)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors rounded-lg px-3 py-2 cursor-pointer"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            Create free account
                          </button>
                          <button
                            onClick={() => navigate(`/login?returnTo=${encodeURIComponent(`/checklist?from=${origin}&to=${destination}&type=${visaType as string}`)}`)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold border border-border text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors rounded-lg px-3 py-2 cursor-pointer"
                          >
                            Already have an account? Sign in
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* ── Agent connection — route-specific, always visible ── */}
                  <div className="bg-gradient-to-br from-accent/5 to-card border border-accent/25 rounded-xl p-5 flex gap-4 items-start">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Users className="w-5 h-5 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent mb-1">Verified agents available</p>
                      <p className="font-semibold text-sm text-foreground mb-1">
                        Expert help for {visaType} → {translateCountry(destination)}
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                        Verified consultants who specialise in this exact route. They know what officers look for and can review your documents before you apply.
                      </p>
                      <button
                        onClick={() => {
                          trackEvent("agent_link_clicked", { destination, visaType: visaType as string });
                          navigate(`/agents?type=${encodeURIComponent(visaType as string)}&to=${encodeURIComponent(destination)}`);
                        }}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold border border-accent/40 text-accent hover:bg-accent/5 transition-colors rounded-lg px-3 py-2 cursor-pointer"
                      >
                        <Users className="w-3.5 h-3.5" />
                        Find agents for this route
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* ── Readiness Score Card ── */}
                  <div className="bg-card border border-border rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      <h3 className="font-semibold text-sm text-primary uppercase tracking-widest">{t("readiness_card.title")}</h3>
                    </div>
                    <ReadinessScore score={readinessScore} />
                    <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
                      {t("readiness_card.desc", { checked: checkedCount, total: checklist.items.length })}
                    </p>
                  </div>

                  {/* ── Pre-Submission Audit ── */}
                  <PreSubmissionAuditCard destination={destination} visaType={visaType} />

                  {/* ── Share Link (for Agents) ── */}
                  <div className="bg-card border border-primary/20 rounded-xl p-5">
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center shrink-0">
                        <Share2 className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-foreground">{t("share.title")}</div>
                        <div className="text-[11px] text-muted-foreground">{t("share.subtitle")}</div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                      {t("share.desc")}
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
                      {linkCopied ? t("share.copied") : t("share.copy_link")}
                    </button>
                  </div>

                  {/* ── PDF & Bank Letter Downloads ── */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Checklist PDF */}
                    <div className="bg-card border border-border rounded-xl overflow-hidden">
                      {/* Preview mockup for free users — shows real item names, dimmed */}
                      {!canDownloadPDF(plan) && checklist && (
                        <div className="relative px-5 pt-5 pb-3 select-none" aria-hidden="true">
                          <div className="space-y-2 opacity-30 pointer-events-none">
                            <div className="flex items-center gap-1.5 mb-2">
                              <div className="w-3 h-3 rounded-sm bg-primary/60" />
                              <span className="text-[9px] font-bold uppercase tracking-widest text-primary/70">VisaClear</span>
                            </div>
                            <div className="h-2.5 bg-primary/70 rounded w-4/5" />
                            <div className="text-[9px] text-muted-foreground">
                              {translateCountry(destination)} · {visaType} Visa · Applied from {translateCountry(origin)}
                            </div>
                            <div className="pt-1 space-y-2">
                              {checklist.items.slice(0, 5).map((item) => (
                                <div key={item.id} className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded border-2 border-muted-foreground/50 shrink-0" />
                                  <span className="text-[10px] text-foreground/80 truncate">{item.title}</span>
                                </div>
                              ))}
                            </div>
                            {checklist.items.length > 5 && (
                              <div className="text-[9px] text-muted-foreground/60 italic">
                                + {checklist.items.length - 5} more items · embassy address · fee schedule
                              </div>
                            )}
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-card to-transparent" />
                        </div>
                      )}
                      <div className={cn("p-5", !canDownloadPDF(plan) && "pt-3 border-t border-border/40")}>
                        <div className="flex items-center gap-2.5 mb-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center shrink-0">
                            <Download className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <div className="font-semibold text-sm text-foreground">{t("pdf.title")}</div>
                            <div className="text-[11px] text-muted-foreground">{t("pdf.subtitle")}</div>
                          </div>
                        </div>
                        {canDownloadPDF(plan) ? (
                          <>
                            <p className="text-xs text-muted-foreground leading-relaxed mb-4">{t("pdf.desc")}</p>
                            <button
                              onClick={() => { void handleDownloadPDF(); }}
                              disabled={pdfLoading}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors rounded-lg px-3 py-2 cursor-pointer disabled:opacity-60"
                            >
                              {pdfLoading ? <Spinner /> : <Download className="w-3.5 h-3.5" />}
                              {pdfLoading ? t("pdf.generating") : t("pdf.download")}
                            </button>
                          </>
                        ) : (
                          <>
                            <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                              All {checklist?.items.length} requirements, embassy address, processing time, and fee schedule — formatted for your application file.
                            </p>
                            <button
                              onClick={() => setShowUpgradeModal(true)}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors rounded-lg px-3 py-2 cursor-pointer"
                            >
                              <Lock className="w-3.5 h-3.5" />
                              Unlock PDF — Pro plan
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Bank Letter Template */}
                    <div className="bg-card border border-border rounded-xl p-5">
                      <div className="flex items-center gap-2.5 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4 text-accent" />
                        </div>
                        <div>
                          <div className="font-semibold text-sm text-foreground">{t("bank.title")}</div>
                          <div className="text-[11px] text-muted-foreground">{t("bank.subtitle")}</div>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                        {t("bank.desc")}
                      </p>
                      <button
                        onClick={() => { void handleDownloadBankLetter(); }}
                        disabled={bankLoading}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold border border-accent/40 text-accent hover:bg-accent/5 transition-colors rounded-lg px-3 py-2 cursor-pointer disabled:opacity-60"
                      >
                        {bankLoading ? <Spinner /> : <FileText className="w-3.5 h-3.5" />}
                        {bankLoading ? t("pdf.generating") : t("bank.download")}
                      </button>
                    </div>
                  </div>

                  {/* How to use bank letter */}
                  <div className="bg-card border border-border/60 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-sm text-foreground mb-1">{t("bank.how_to_title")}</div>
                        <ol className="text-xs text-muted-foreground leading-relaxed space-y-1 list-decimal ml-4">
                          <li>{t("bank.how_to_1")}</li>
                          <li>{t("bank.how_to_2")}</li>
                          <li>{t("bank.how_to_3")}</li>
                          <li>{t("bank.how_to_4")}</li>
                          <li>{t("bank.how_to_5")}</li>
                        </ol>
                      </div>
                    </div>
                  </div>

                  {/* ── AI Ask button ── */}
                  <button
                    onClick={() => {
                      if (!canUseAI(plan)) {
                        toast.error(t("nav.ai_pro_feature_toast"));
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
                      <div className="font-semibold text-sm text-primary">{t("ask_ai_button.title")}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {t("ask_ai_button.desc", { destination: translateCountry(destination), visaType })}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-primary shrink-0" />
                  </button>

                  {/* Success tip */}
                  <div className="flex items-start gap-3 border border-primary/20 bg-primary/5 rounded-xl p-4">
                    <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-sm text-primary mb-1">{t("success_tip.title")}</div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{checklist.successTip}</p>
                    </div>
                  </div>

                  {/* Disclaimer + Last Verified + Embassy Link */}
                  <div className="flex items-start gap-3 border border-border bg-card rounded-xl p-4">
                    <AlertCircle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                        <span className="font-semibold text-foreground">{t("disclaimer.important_label")}</span>
                        {t("disclaimer.text")}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-border/50">
                        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <Shield className="w-3 h-3 text-accent" />
                          {t("disclaimer.last_verified")} <strong className="text-foreground">{new Date(checklist.lastVerified).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</strong>
                        </span>
                        {checklist.embassyUrl && (
                          <a
                            href={checklist.embassyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[11px] text-accent font-semibold hover:underline"
                          >
                            <Globe className="w-3 h-3" />
                            {t("disclaimer.embassy_portal", { country: translateCountry(destination) })}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Items */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-primary text-sm uppercase tracking-widest">
                        {t("items_section.title")}
                      </h3>
                      <span className="text-xs text-muted-foreground">
                        {t("items_section.count", { count: checklist.items.length, required: totalRequired })}
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
                            {t("completion.title")}
                          </h3>
                          <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                            {t("completion.desc")}
                          </p>
                        </div>

                        {/* Action cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Apply now */}
                          {checklist.embassyUrl && (
                            <div className="bg-primary rounded-xl p-5 text-primary-foreground">
                              <div className="flex items-center gap-2.5 mb-3">
                                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                                  <Globe className="w-4 h-4" />
                                </div>
                                <span className="font-semibold text-sm">{t("action_cards.apply_now")}</span>
                              </div>
                              <p className="text-xs text-primary-foreground/70 leading-relaxed mb-4">
                                {t("action_cards.apply_desc")}
                              </p>
                              <a
                                href={checklist.embassyUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white/15 hover:bg-white/25 transition-colors rounded-lg px-3 py-2 cursor-pointer"
                              >
                                {t("action_cards.open_portal")}
                                <ChevronRight className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          )}

                          {/* Find an agent */}
                          <div className="bg-card border border-border rounded-xl p-5">
                            <div className="flex items-center gap-2.5 mb-3">
                              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                                <Award className="w-4 h-4 text-accent" />
                              </div>
                              <span className="font-semibold text-sm text-foreground">{t("action_cards.find_agent")}</span>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                              {t("action_cards.find_agent_desc")}
                            </p>
                            <button
                              onClick={() => navigate("/agents")}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold border border-accent/40 text-accent hover:bg-accent/5 transition-colors rounded-lg px-3 py-2 cursor-pointer"
                            >
                              {t("action_cards.browse_agents")}
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Save checklist */}
                          <div className="bg-card border border-border rounded-xl p-5">
                            <div className="flex items-center gap-2.5 mb-3">
                              <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center shrink-0">
                                <Lock className="w-4 h-4 text-primary" />
                              </div>
                              <span className="font-semibold text-sm text-foreground">{t("action_cards.save_progress")}</span>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                              {t("action_cards.save_desc")}
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
                                    toast.success(t("action_cards.toast_saved"));
                                  } catch (err) {
                                    if (err instanceof ConvexError) {
                                      const { code } = err.data as { code: string; message: string };
                                      if (code === "MONTHLY_LIMIT_REACHED") {
                                        setShowUpgradeModal(true);
                                      } else {
                                        toast.error((err.data as { message: string }).message);
                                      }
                                    } else {
                                      toast.error(t("action_cards.toast_save_failed"));
                                    }
                                  } finally {
                                    setSaveLoading(false);
                                  }
                                }}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold border border-primary/30 text-primary hover:bg-primary/5 transition-colors rounded-lg px-3 py-2 cursor-pointer disabled:opacity-60"
                              >
                                {saveLoading ? <Spinner /> : <Lock className="w-3.5 h-3.5" />}
                                {saveLoading ? t("action_cards.saving") : t("action_cards.save_checklist")}
                              </button>
                            </Authenticated>
                            {isDemoAuthenticated && (
                              <button
                                onClick={() => toast.success(t("action_cards.demo_toast_saved"))}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold border border-primary/30 text-primary hover:bg-primary/5 transition-colors rounded-lg px-3 py-2 cursor-pointer"
                              >
                                <Lock className="w-3.5 h-3.5" />
                                {t("action_cards.save_checklist")}
                              </button>
                            )}
                          </div>

                          {/* Upgrade */}
                          <div className="bg-gradient-to-br from-primary/8 to-accent/8 border border-primary/20 rounded-xl p-5">
                            <div className="flex items-center gap-2.5 mb-3">
                              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                <Shield className="w-4 h-4 text-primary" />
                              </div>
                              <div>
                                <span className="font-semibold text-sm text-foreground">{t("action_cards.pro_title")}</span>
                                <span className="ml-2 text-[10px] tracking-wide uppercase font-bold text-accent">{t("action_cards.pro_new_badge")}</span>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                              {t("action_cards.pro_desc")}
                            </p>
                            <button
                      onClick={() => navigate("/pricing")}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors rounded-lg px-3 py-2 cursor-pointer"
                            >
                              {t("action_cards.see_pro_plans")}
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Step-by-step guide */}
                        <div className="bg-card border border-border rounded-xl p-6">
                          <h4 className="font-semibold text-sm text-primary uppercase tracking-widest mb-4">{t("roadmap.title")}</h4>
                          <div className="space-y-3">
                            {[
                              { n: "1", title: t("roadmap.step1_title"), desc: t("roadmap.step1_desc") },
                              { n: "2", title: t("roadmap.step2_title"), desc: t("roadmap.step2_desc") },
                              { n: "3", title: t("roadmap.step3_title"), desc: t("roadmap.step3_desc") },
                              { n: "4", title: t("roadmap.step4_title"), desc: t("roadmap.step4_desc") },
                              { n: "5", title: t("roadmap.step5_title"), desc: t("roadmap.step5_desc") },
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
                          <h4 className="font-serif text-lg font-semibold text-primary mb-1">{t("referral.title")}</h4>
                          <p className="text-xs text-muted-foreground leading-relaxed mb-4 max-w-xs mx-auto">
                            {t("referral.desc")}
                          </p>
                          <button
                            onClick={handleCopyShareLink}
                            className="inline-flex items-center gap-2 text-sm font-semibold bg-accent text-white hover:bg-accent/90 transition-colors rounded-lg px-5 py-2.5 cursor-pointer"
                          >
                            {linkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            {linkCopied ? t("referral.link_copied") : t("referral.copy_link")}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Trust badges */}
                  <div className="flex flex-wrap items-center justify-center gap-4 py-2">
                    {[
                      { icon: <Shield className="w-3 h-3" />, label: t("trust.gdpr") },
                      { icon: <Lock className="w-3 h-3" />, label: t("trust.ndpa") },
                      { icon: <Award className="w-3 h-3" />, label: t("trust.cisa") },
                    ].map((badge) => (
                      <div key={badge.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="text-accent">{badge.icon}</span>
                        {badge.label}
                      </div>
                    ))}
                  </div>

                  <Button
                    variant="secondary"
                    className="w-full cursor-pointer font-medium"
                    onClick={() => setSearchParams({})}                  >
                    {t("start_new")}
                  </Button>

                  {/* ── What's Next for VisaClear ── */}
                  <div className="bg-primary rounded-xl p-6 text-primary-foreground">
                    <div className="mb-4">
                      <div className="text-sm tracking-widest uppercase font-bold mb-1" style={{ color: "oklch(0.72 0.13 80)" }}>
                        {t("unlock.eyebrow")}
                      </div>
                      <h3 className="font-serif text-2xl font-semibold">{t("unlock.title")}</h3>
                      <p className="text-primary-foreground/60 text-xs mt-1">
                        {t("unlock.subtitle")}
                      </p>
                    </div>
                    <div className="space-y-3 mb-5">
                      {[
                        { emoji: "🤖", label: t("unlock.f1_label"), desc: t("unlock.f1_desc") },
                        { emoji: "📸", label: t("unlock.f2_label"), desc: t("unlock.f2_desc") },
                        { emoji: "📄", label: t("unlock.f3_label"), desc: t("unlock.f3_desc") },
                        { emoji: "🔔", label: t("unlock.f4_label"), desc: t("unlock.f4_desc") },
                        { emoji: "🔗", label: t("unlock.f5_label"), desc: t("unlock.f5_desc") },
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
                      {t("unlock.cta")}
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
                    {t("not_available.title")}
                  </h3>
                  <p className="text-muted-foreground text-sm mb-8 max-w-sm mx-auto">
                    {t("not_available.desc")}
                  </p>
                  <Button onClick={() => setSearchParams({})} className="cursor-pointer">
                    {t("not_available.try_another")}
                  </Button>
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Footer */}
      <footer className="border-t border-border mt-10 py-6 px-6 text-center">
        <p className="text-xs text-muted-foreground italic mb-1">&ldquo;{t("footer.privacy_quote")}&rdquo;</p>
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Vericore Ltd. · {t("footer.copyright")}
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
            isDemoAuthenticated={isDemoAuthenticated}
            onClose={() => setShowAI(false)}
          />
        )}
      </AnimatePresence>

      <UpgradeModal open={showUpgradeModal} onOpenChange={setShowUpgradeModal} />
    </div>
  );
}
