import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import { useAction, useMutation, useQuery } from "convex/react";
import { useSeo } from "@/hooks/use-seo.ts";
import { useSmartBack } from "@/hooks/use-smart-back.ts";
import { useDemoAuth } from "@/hooks/use-demo-auth.ts";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.js";
import { SignInButton } from "@/components/ui/signin.tsx";
import { DESTINATION_FLAGS } from "@/lib/destination-flags.ts";
import { useCountryName } from "@/hooks/use-country-name.ts";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Globe, ArrowLeft, AlertCircle, CheckCircle2, ChevronRight, ChevronDown,
  FileText, Shield, Lock, TrendingUp, Lightbulb, LogIn, Copy, Check,
  RotateCcw, Upload, X, LayoutDashboard, Settings, LogOut, Award,
  Clock, Calendar, BookOpen, Zap, AlertTriangle, Target, Scale,
} from "lucide-react";
import { VISA_TYPES, type VisaType } from "@/lib/visa-data.ts";
import { cn } from "@/lib/utils.ts";
import { toast } from "sonner";

const REJECTION_DESTINATIONS = [
  "United Kingdom", "United States", "Canada", "Germany", "France", "Netherlands",
  "Australia", "Ireland", "Italy", "Spain", "Poland", "Portugal", "Belgium", "Sweden",
  "Norway", "Switzerland", "Austria", "Denmark", "Finland", "Czech Republic", "New Zealand",
].map((name) => ({ name, flag: DESTINATION_FLAGS[name] }));

const LOADING_STEPS = [
  "Reading your refusal letter...",
  "Identifying refusal codes...",
  "Building your recovery plan...",
  "Drafting your appeal letter...",
];

type RootCause = {
  cause: string;
  severity: "critical" | "major" | "minor";
  officialCodeRef: string;
};

type DocumentFix = {
  document: string;
  problem: string;
  fix: string;
};

type TimelineStep = {
  week: string;
  action: string;
};

type AnalysisResult = {
  rootCauses: RootCause[];
  documentFixGuide: DocumentFix[];
  timelinedSteps: TimelineStep[];
  appealRecommended: boolean;
  appealDraft: string;
  waitPeriodAdvice: string;
  strengthsToKeep: string[];
  missedDocuments: string[];
  urgentActions: string[];
  successProbability: number;
  summary: string;
};

type ResultTab = "overview" | "causes" | "docs" | "timeline" | "appeal";

const RESULT_TABS: { id: ResultTab; label: string; Icon: typeof Target }[] = [
  { id: "overview",  label: "Overview",       Icon: Target },
  { id: "causes",   label: "Root Causes",     Icon: AlertTriangle },
  { id: "docs",     label: "Fix Your Docs",   Icon: FileText },
  { id: "timeline", label: "Timeline",        Icon: Calendar },
  { id: "appeal",   label: "Appeal Letter",   Icon: Scale },
];

function severityStyle(s: "critical" | "major" | "minor") {
  if (s === "critical") return "bg-red-100 text-red-700 border-red-200";
  if (s === "major")    return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-gray-100 text-gray-600 border-gray-200";
}

function probabilityColor(p: number) {
  if (p >= 70) return "#16a34a";
  if (p >= 40) return "#d97706";
  return "#dc2626";
}

function probabilityLabel(p: number) {
  if (p >= 70) return "Strong chance on reapplication";
  if (p >= 40) return "Recovery possible with work";
  return "Needs significant preparation";
}

// ─── Inner component (requires real Convex auth) ──────────────────────────────

function RejectionAnalyserInner() {
  const navigate = useNavigate();
  const translateCountry = useCountryName();
  const { i18n } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form
  const [destination, setDestination] = useState("");
  const [visaType, setVisaType] = useState<VisaType | "">("");
  const [origin, setOrigin] = useState("");
  const [refusalText, setRefusalText] = useState("");
  const [inputMode, setInputMode] = useState<"text" | "pdf">("text");
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const [pdfStorageId, setPdfStorageId] = useState<Id<"_storage"> | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showAllCountries, setShowAllCountries] = useState(false);

  // Loading
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  // Result
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState<ResultTab>("overview");
  const [copied, setCopied] = useState(false);

  // Marketplace lead consent
  const [consentToLead, setConsentToLead] = useState(false);
  const [leadSubmittedAfterAnalysis, setLeadSubmittedAfterAnalysis] = useState(false);

  const generateUploadUrl = useMutation(api.rejections.generateRejectionUploadUrl);
  const confirmUpload = useMutation(api.rejections.confirmRejectionUpload);
  const analyseRejection = useAction(api.ai.rejectionAnalyser.analyseRejection);
  const currentUser = useQuery(api.users.getCurrentUser);

  const visibleDestinations = showAllCountries ? REJECTION_DESTINATIONS : REJECTION_DESTINATIONS.slice(0, 12);
  const canAnalyse = !!destination && !!visaType && !!origin && (refusalText.trim().length > 50 || !!pdfStorageId);

  // Cycle loading steps
  useEffect(() => {
    if (!loading) { setLoadingStep(0); return; }
    const id = setInterval(() => setLoadingStep(s => Math.min(s + 1, LOADING_STEPS.length - 1)), 3000);
    return () => clearInterval(id);
  }, [loading]);

  // Scroll to top when result arrives
  useEffect(() => {
    if (result) {
      requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "instant" }));
    }
  }, [result]);

  const handlePdfUpload = async (file: File) => {
    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF file.");
      return;
    }
    setUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const response = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/pdf" },
        body: file,
      });
      const { storageId } = await response.json() as { storageId: Id<"_storage"> };
      await confirmUpload({ storageId });
      setPdfStorageId(storageId);
      setPdfFileName(file.name);
      toast.success("PDF uploaded. Ready to analyse.");
    } catch {
      toast.error("PDF upload failed. Try pasting the text instead.");
    } finally {
      setUploading(false);
    }
  };

  const removePdf = () => {
    setPdfFileName(null);
    setPdfStorageId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAnalyse = async () => {
    if (!canAnalyse) return;
    setLoading(true);
    try {
      const res = await analyseRejection({
        refusalText: refusalText || "(see uploaded PDF)",
        destination,
        visaType: visaType as string,
        origin,
        language: i18n.language,
        pdfStorageId: pdfStorageId ?? undefined,
        consentToMarketplaceLead: consentToLead,
      });
      setResult(res as AnalysisResult);
      setActiveTab("overview");
      setLeadSubmittedAfterAnalysis(consentToLead);
    } catch (err: unknown) {
      let msg = "Analysis failed. Please try again.";
      // ConvexError instanceof check can fail across module version boundaries.
      // Read err.data directly — all Convex errors carry structured data this way.
      const convexData = (err as { data?: { message?: string } }).data;
      if (convexData?.message) {
        msg = convexData.message;
      } else if (err instanceof Error && err.message && !err.message.startsWith("[CONVEX") && !err.message.includes("Server Error")) {
        msg = err.message;
      }
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const copyAppeal = async () => {
    if (!result?.appealDraft) return;
    try {
      await navigator.clipboard.writeText(result.appealDraft);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Copy failed. Select the text manually.");
    }
  };

  const reset = () => {
    setResult(null);
    setRefusalText("");
    removePdf();
    setDestination("");
    setVisaType("");
    setOrigin("");
    setActiveTab("overview");
    setConsentToLead(false);
    setLeadSubmittedAfterAnalysis(false);
  };

  // ── Plan gate — show upgrade prompt for non-Expert users ─────────────────
  if (currentUser === undefined) {
    return (
      <div className="space-y-4 py-4">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
    );
  }
  if ((currentUser?.plan ?? "free") !== "expert") {
    const plan = currentUser?.plan ?? "free";
    return (
      <div className="space-y-5">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 sm:p-8 flex flex-col items-center text-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-white border border-amber-200 shadow-sm flex items-center justify-center">
            <Lock className="w-7 h-7 text-amber-600" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-amber-200 text-xs font-semibold text-amber-700 mb-3 uppercase tracking-wide">
              Your plan: {plan === "pro" ? "Pro" : "Free"}
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-primary mb-2">Expert Plan Required</h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
              The AI Rejection Analyser is an Expert-only tool. It reads your refusal letter and builds a full recovery plan in under 30 seconds.
            </p>
          </div>
          <ul className="text-sm text-left space-y-2.5 w-full max-w-xs">
            {[
              "AI reads and analyses your refusal letter",
              "Identifies the exact refusal codes used",
              "Personalised document fix guide",
              "Appeal letter drafted for your case",
              "Success probability score",
              "Week-by-week recovery timeline",
            ].map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <div className="w-full max-w-xs flex flex-col gap-2.5">
            <Button
              size="lg"
              className="w-full cursor-pointer font-semibold shadow-md"
              onClick={() => navigate("/pricing")}
            >
              Upgrade to Expert <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
            {plan === "free" && (
              <p className="text-xs text-muted-foreground text-center">
                Already subscribed?{" "}
                <button className="underline hover:text-primary cursor-pointer transition-colors" onClick={() => navigate("/settings/profile")}>
                  Check your account settings
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Loading view ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[420px] space-y-8 py-16">
        <div className="relative">
          <div className="w-20 h-20 rounded-full border-4 border-primary/20" />
          <div className="absolute inset-0 w-20 h-20 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <FileText className="w-7 h-7 text-primary" />
          </div>
        </div>
        <div className="text-center space-y-2">
          <AnimatePresence mode="wait">
            <motion.p
              key={loadingStep}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="text-base font-semibold text-primary"
            >
              {LOADING_STEPS[loadingStep]}
            </motion.p>
          </AnimatePresence>
          <p className="text-sm text-muted-foreground">This usually takes 15–20 seconds.</p>
        </div>
        <div className="flex gap-2">
          {LOADING_STEPS.map((_, i) => (
            <div
              key={i}
              className={cn("w-2 h-2 rounded-full transition-all duration-500", i <= loadingStep ? "bg-primary" : "bg-border")}
            />
          ))}
        </div>
      </div>
    );
  }

  // ── Result view ───────────────────────────────────────────────────────────
  if (result) {
    const prob = result.successProbability;
    const color = probabilityColor(prob);
    const circumference = 2 * Math.PI * 36;

    return (
      <AnimatePresence>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

          {/* Probability banner */}
          <div className="bg-primary rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              {/* Ring */}
              <div className="relative w-24 h-24 shrink-0">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                  <circle cx="48" cy="48" r="36" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="7" />
                  <motion.circle
                    cx="48" cy="48" r="36" fill="none"
                    stroke={color} strokeWidth="7" strokeLinecap="round"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: circumference * (1 - prob / 100) }}
                    transition={{ duration: 1.4, ease: "easeOut" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <svg viewBox="0 0 20 20" className="w-6 h-6">
                    <circle cx="10" cy="10" r="8" fill={color} opacity="0.9" />
                  </svg>
                </div>
              </div>
              {/* Text */}
              <div className="flex-1 text-center sm:text-left">
                <p className="text-xs font-semibold tracking-widest uppercase text-primary-foreground/50 mb-1">
                  Re-application outlook
                </p>
                <h2 className="font-serif text-xl font-semibold text-primary-foreground mb-1">
                  {probabilityLabel(prob)}
                </h2>
                <p className="text-xs text-primary-foreground/50 mb-2">AI estimate — not a guarantee. Verify with a qualified adviser.</p>
                <p className="text-sm text-primary-foreground/70 leading-relaxed">{result.summary}</p>
              </div>
              {/* Stats */}
              <div className="flex sm:flex-col gap-3 shrink-0">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary-foreground">{result.rootCauses.length}</p>
                  <p className="text-xs text-primary-foreground/50">root {result.rootCauses.length === 1 ? "cause" : "causes"}</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary-foreground">{result.documentFixGuide.length}</p>
                  <p className="text-xs text-primary-foreground/50">docs to fix</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary-foreground">{result.timelinedSteps.length}</p>
                  <p className="text-xs text-primary-foreground/50">steps ahead</p>
                </div>
              </div>
            </div>
          </div>

          {/* Agent match confirmation */}
          {leadSubmittedAfterAnalysis && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800 rounded-xl p-4 flex items-start gap-3"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Your details have been shared with verified agents</p>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 leading-relaxed mt-0.5">
                  Verified immigration specialists on VisaClear may reach out to offer assistance. Your contact details remain masked until you approve.
                </p>
              </div>
            </motion.div>
          )}

          {/* Tab nav */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
            {RESULT_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0",
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                )}
              >
                <tab.Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <AnimatePresence mode="wait">

            {/* Overview */}
            {activeTab === "overview" && (
              <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                {result.urgentActions.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Zap className="w-4 h-4 text-red-500" />
                      <span className="font-semibold text-sm text-red-700 uppercase tracking-widest">Do This First — Next 7 Days</span>
                    </div>
                    <div className="space-y-2.5">
                      {result.urgentActions.map((a, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-[10px] font-bold text-white">{i + 1}</span>
                          </div>
                          <p className="text-sm text-red-800 leading-relaxed">{a}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.strengthsToKeep.length > 0 && (
                  <div className="bg-card border border-border rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span className="font-semibold text-sm text-primary uppercase tracking-widest">What Worked — Keep These</span>
                    </div>
                    <div className="space-y-2">
                      {result.strengthsToKeep.map((s, i) => (
                        <div key={i} className="flex items-start gap-2.5">
                          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                          <p className="text-sm text-foreground leading-relaxed">{s}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.waitPeriodAdvice && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 flex items-start gap-3">
                    <Clock className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm text-blue-800 mb-1">When to Reapply</p>
                      <p className="text-sm text-blue-700 leading-relaxed">{result.waitPeriodAdvice}</p>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => navigate("/wall-of-fame")}
                  className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-accent hover:text-accent/80 transition-colors cursor-pointer py-2"
                >
                  <Award className="w-4 h-4" />
                  Read real stories from people who were refused then approved
                  <ChevronRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}

            {/* Root Causes */}
            {activeTab === "causes" && (
              <motion.div key="causes" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
                <p className="text-sm text-muted-foreground">These are the specific reasons cited in your refusal, ranked by severity.</p>
                {result.rootCauses.map((c, i) => (
                  <div key={i} className="bg-card border border-border rounded-xl p-5">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className={cn("text-[11px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-widest", severityStyle(c.severity))}>
                        {c.severity}
                      </span>
                      {c.officialCodeRef && (
                        <span className="text-[11px] font-mono bg-muted text-muted-foreground px-2.5 py-1 rounded-full border border-border">
                          {c.officialCodeRef}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">{c.cause}</p>
                  </div>
                ))}
              </motion.div>
            )}

            {/* Fix Your Docs */}
            {activeTab === "docs" && (
              <motion.div key="docs" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                {result.missedDocuments.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <p className="text-xs font-semibold text-amber-700 uppercase tracking-widest mb-2.5">Missing or Not Submitted</p>
                    <div className="flex flex-wrap gap-2">
                      {result.missedDocuments.map((d, i) => (
                        <span key={i} className="text-xs bg-amber-100 text-amber-800 border border-amber-200 px-3 py-1 rounded-full">
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="space-y-3">
                  {result.documentFixGuide.map((fix, i) => (
                    <div key={i} className="bg-card border border-border rounded-xl overflow-hidden">
                      <div className="px-5 py-3 bg-muted/40 border-b border-border">
                        <p className="font-semibold text-sm text-primary">{fix.document}</p>
                      </div>
                      <div className="p-5 space-y-3">
                        <div className="flex items-start gap-2.5">
                          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                          <p className="text-sm text-red-700 leading-relaxed">{fix.problem}</p>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                          <p className="text-sm text-green-700 leading-relaxed font-medium">{fix.fix}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Timeline */}
            {activeTab === "timeline" && (
              <motion.div key="timeline" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="relative space-y-0">
                  {result.timelinedSteps.map((step, i) => (
                    <div key={i} className="flex gap-4">
                      {/* Spine */}
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0 z-10">
                          <span className="text-[11px] font-bold text-primary-foreground">{i + 1}</span>
                        </div>
                        {i < result.timelinedSteps.length - 1 && (
                          <div className="w-px flex-1 bg-border mt-1 mb-1" />
                        )}
                      </div>
                      {/* Content */}
                      <div className={cn("flex-1 pb-6", i === result.timelinedSteps.length - 1 && "pb-0")}>
                        <p className="text-xs font-bold text-accent uppercase tracking-widest mb-1">{step.week}</p>
                        <p className="text-sm text-foreground leading-relaxed">{step.action}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Appeal Letter */}
            {activeTab === "appeal" && (
              <motion.div key="appeal" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className={cn(
                  "flex items-center gap-3 p-4 rounded-xl border",
                  result.appealRecommended
                    ? "bg-green-50 border-green-200"
                    : "bg-amber-50 border-amber-200"
                )}>
                  {result.appealRecommended ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                  )}
                  <p className={cn("text-sm font-semibold", result.appealRecommended ? "text-green-800" : "text-amber-800")}>
                    {result.appealRecommended
                      ? "An appeal or administrative review is recommended in your case."
                      : "An appeal is unlikely to succeed — focus on a stronger reapplication instead."}
                  </p>
                </div>

                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Draft Letter</p>
                    <button
                      onClick={() => { void copyAppeal(); }}
                      className={cn(
                        "flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all cursor-pointer",
                        copied
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-muted text-muted-foreground border-border hover:border-primary/30 hover:text-primary"
                      )}
                    >
                      {copied ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy letter</>}
                    </button>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto shadow-sm">
                    <pre className="text-[13px] leading-relaxed text-gray-800 whitespace-pre-wrap break-words font-serif p-6 min-w-0">
                      {result.appealDraft}
                    </pre>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-muted/40 border border-border rounded-xl p-4">
                  <Lightbulb className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    This draft is a starting point based on the grounds cited in your refusal. Have it reviewed by a qualified immigration solicitor before submitting — they can add supporting evidence references and tailor it to your exact circumstances.
                  </p>
                </div>
              </motion.div>
            )}

          </AnimatePresence>

          {/* Bottom actions */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button variant="secondary" className="cursor-pointer" onClick={reset}>
              <RotateCcw className="w-4 h-4 mr-1.5" /> Analyse Another
            </Button>
            <Button className="cursor-pointer" onClick={() => navigate("/checklist")}>
              Get Visa Checklist <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          <div className="flex items-start gap-3 border border-border bg-card rounded-xl p-4">
            <Shield className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              This analysis is AI-generated and for guidance only. For complex rejections, consult a verified immigration solicitor.
            </p>
          </div>

        </motion.div>
      </AnimatePresence>
    );
  }

  // ── Form view ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="text-center py-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-xs font-semibold text-red-600 mb-4">
          <AlertCircle className="w-3 h-3" />
          Expert AI — Rejection Analyser
        </div>
        <h1 className="font-serif text-3xl md:text-4xl font-semibold text-primary mb-3 text-balance">
          Turn Your Rejection Into a Reapplication Plan
        </h1>
        <p className="text-muted-foreground text-sm md:text-base max-w-lg mx-auto leading-relaxed">
          Upload your refusal letter. We'll identify the exact codes they used, build a document fix guide, and draft your appeal.
        </p>
      </div>

      {/* Step 1: Destination */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">1</div>
          <label className="text-sm font-semibold text-primary">Which country rejected you?</label>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {visibleDestinations.map((d) => (
            <button
              key={d.name}
              onClick={() => setDestination(d.name)}
              title={translateCountry(d.name)}
              className={cn(
                "flex flex-col items-center gap-1 p-2.5 rounded-xl border text-center transition-all cursor-pointer",
                destination === d.name
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-border bg-background hover:border-primary/30"
              )}
            >
              <span className="text-xl">{d.flag}</span>
              <span className={cn("text-[10px] font-medium leading-tight truncate w-full text-center", destination === d.name ? "text-primary" : "text-foreground/70")}>
                {translateCountry(d.name)}
              </span>
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowAllCountries(v => !v)}
          className="mt-3 text-xs text-primary font-semibold hover:underline cursor-pointer flex items-center gap-1"
        >
          {showAllCountries ? "Show fewer" : `Show all ${REJECTION_DESTINATIONS.length} countries`}
          <ChevronDown className={cn("w-3 h-3 transition-transform", showAllCountries && "rotate-180")} />
        </button>
      </div>

      {/* Step 2: Visa type */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">2</div>
          <label className="text-sm font-semibold text-primary">What type of visa were you applying for?</label>
        </div>
        <div className="space-y-2">
          {VISA_TYPES.map((vt) => (
            <button
              key={vt.value}
              onClick={() => setVisaType(vt.value)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer",
                visaType === vt.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
              )}
            >
              <div className={cn("w-4 h-4 rounded-full border-2 shrink-0", visaType === vt.value ? "border-primary bg-primary" : "border-muted-foreground/40")} />
              <div>
                <div className={cn("font-medium text-sm", visaType === vt.value ? "text-primary" : "text-foreground")}>{vt.label}</div>
                <div className="text-xs text-muted-foreground">{vt.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Step 3: Origin */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">3</div>
          <label className="text-sm font-semibold text-primary">Your country of origin (nationality)</label>
        </div>
        <input
          type="text"
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
          placeholder="e.g. Nigeria, Ghana, Pakistan, India..."
          className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Step 4: Refusal letter */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">4</div>
          <label className="text-sm font-semibold text-primary">Your refusal letter</label>
        </div>

        {/* Toggle */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setInputMode("text")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer",
              inputMode === "text" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/30"
            )}
          >
            <FileText className="w-3.5 h-3.5" /> Paste text
          </button>
          <button
            onClick={() => setInputMode("pdf")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer",
              inputMode === "pdf" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/30"
            )}
          >
            <Upload className="w-3.5 h-3.5" /> Upload PDF
          </button>
        </div>

        {inputMode === "pdf" ? (
          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handlePdfUpload(file);
              }}
            />
            {pdfFileName ? (
              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-green-800 truncate">{pdfFileName}</p>
                  <p className="text-xs text-green-600">Uploaded and ready for analysis</p>
                </div>
                <button
                  onClick={removePdf}
                  className="text-green-600 hover:text-red-500 transition-colors cursor-pointer p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    <p className="text-sm text-muted-foreground">Uploading...</p>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                    <p className="text-sm font-medium text-foreground mb-1">Click to upload your PDF refusal letter</p>
                    <p className="text-xs text-muted-foreground">We extract the text automatically — no copy-paste needed</p>
                  </>
                )}
              </button>
            )}
            <p className="text-xs text-muted-foreground text-center">Or add additional context below (optional)</p>
            <textarea
              value={refusalText}
              onChange={(e) => setRefusalText(e.target.value)}
              rows={4}
              placeholder="Any extra details, previous applications, or context the embassy may not have recorded..."
              className="w-full px-3.5 py-3 text-sm rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none leading-relaxed"
            />
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground mb-3">
              Paste the full text of your refusal letter. You can omit your name, address, and reference number if you prefer.
            </p>
            <textarea
              value={refusalText}
              onChange={(e) => setRefusalText(e.target.value)}
              rows={9}
              placeholder="Paste your refusal letter here..."
              className="w-full px-3.5 py-3 text-sm rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none leading-relaxed"
            />
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted-foreground">{refusalText.length} characters</p>
              {refusalText.length > 0 && refusalText.length < 50 && (
                <p className="text-xs text-amber-600">Paste more of the letter for a better analysis</p>
              )}
              {refusalText.length >= 50 && (
                <p className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Ready</p>
              )}
            </div>
          </>
        )}
      </div>

      {/* GDPR consent — must be ticked before analysis runs */}
      <label className="flex items-start gap-3 cursor-pointer group select-none border border-border rounded-xl p-4 bg-card transition-colors hover:border-primary/40">
        <div className="relative mt-0.5 shrink-0">
          <input
            type="checkbox"
            className="sr-only"
            checked={consentToLead}
            onChange={(e) => setConsentToLead(e.target.checked)}
          />
          <div
            className={cn(
              "w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-150",
              consentToLead
                ? "bg-primary border-primary"
                : "border-input bg-background group-hover:border-primary/60",
            )}
          >
            {consentToLead && <Check className="w-3 h-3 text-primary-foreground" strokeWidth={3} />}
          </div>
        </div>
        <div className="space-y-1 min-w-0">
          <p className="text-sm font-semibold text-foreground leading-snug">Connect me with a specialist <span className="text-xs font-normal text-muted-foreground">(optional)</span></p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            I agree that VisaClear may show anonymised details of my refusal (visa type, destination, nationality, and reason codes) to verified agents on the platform who can offer assistance.
          </p>
        </div>
      </label>

      <Button
        size="lg"
        className="w-full cursor-pointer font-semibold py-6 text-base shadow-md"
        disabled={!canAnalyse || uploading}
        onClick={() => { void handleAnalyse(); }}
      >
        Analyse My Rejection <ChevronRight className="w-5 h-5 ml-1.5" />
      </Button>

      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><Lock className="w-3 h-3 text-accent" /> Processed securely</span>
        <span className="flex items-center gap-1.5"><Shield className="w-3 h-3 text-accent" /> {consentToLead ? "Shared with verified agents only" : "Not shared with third parties"}</span>
        <span className="flex items-center gap-1.5"><BookOpen className="w-3 h-3 text-accent" /> Expert plan only</span>
      </div>
    </div>
  );
}

// ─── Page shell ────────────────────────────────────────────────────────────────

export default function RejectionAnalyserPage() {
  useSeo({
    title: "Rejection Analyser",
    description: "Find out exactly why your visa was refused and what to do next. Expert AI analysis with a full recovery plan and appeal letter draft.",
  });
  const navigate = useNavigate();
  const goBack = useSmartBack("/dashboard");
  const { isDemoAuthenticated, signOut } = useDemoAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={goBack} className="text-muted-foreground hover:text-primary transition-colors cursor-pointer p-1 -ml-1 shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button onClick={() => navigate("/")} className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity min-w-0">
              <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center shrink-0">
                <Globe className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <span className="font-serif font-semibold text-primary truncate">VisaClear</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-red-600">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Rejection Analyser</span>
            </span>
            {isDemoAuthenticated && (
              <>
                <button
                  onClick={() => navigate("/dashboard")}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors cursor-pointer"
                  title="Dashboard"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Dashboard</span>
                </button>
                <button
                  onClick={() => navigate("/settings/profile")}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors cursor-pointer"
                  title="Settings"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Settings</span>
                </button>
                <button
                  onClick={() => { signOut(); navigate("/"); }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors cursor-pointer"
                  title="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Sign Out</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <AuthLoading>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
          </div>
        </AuthLoading>

        <Unauthenticated>
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-5">
              <LogIn className="w-7 h-7 text-red-500" />
            </div>
            <h2 className="font-serif text-3xl font-semibold text-primary mb-3">Sign In Required</h2>
            <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
              Sign in to use the AI Rejection Analyser and save your recovery plan.
            </p>
            <SignInButton size="lg" className="cursor-pointer font-semibold" signInText="Sign In to Analyse" />
          </div>
        </Unauthenticated>

        <Authenticated>
          <RejectionAnalyserInner />
        </Authenticated>
      </div>

    </div>
  );
}
