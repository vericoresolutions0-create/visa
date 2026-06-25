import { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import { useAction } from "convex/react";
import { useSeo } from "@/hooks/use-seo.ts";
import { useSmartBack } from "@/hooks/use-smart-back.ts";
import { useDemoAuth } from "@/hooks/use-demo-auth.ts";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Globe, ArrowLeft, AlertCircle, CheckCircle2, ChevronRight,
  FileText, Shield, Lock, TrendingUp, Lightbulb, LogIn,
  RotateCcw, Upload, X, LayoutDashboard, Settings, LogOut,
} from "lucide-react";
import { VISA_TYPES, type VisaType } from "@/lib/visa-data.ts";
import { cn } from "@/lib/utils.ts";
import { toast } from "sonner";

const REJECTION_DESTINATIONS = [
  { name: "United Kingdom", flag: "🇬🇧" },
  { name: "United States", flag: "🇺🇸" },
  { name: "Canada", flag: "🇨🇦" },
  { name: "Germany", flag: "🇩🇪" },
  { name: "France", flag: "🇫🇷" },
  { name: "Netherlands", flag: "🇳🇱" },
  { name: "Australia", flag: "🇦🇺" },
  { name: "Ireland", flag: "🇮🇪" },
  { name: "Italy", flag: "🇮🇹" },
  { name: "Spain", flag: "🇪🇸" },
  { name: "Poland", flag: "🇵🇱" },
  { name: "Portugal", flag: "🇵🇹" },
  { name: "Belgium", flag: "🇧🇪" },
  { name: "Sweden", flag: "🇸🇪" },
  { name: "Norway", flag: "🇳🇴" },
  { name: "Switzerland", flag: "🇨🇭" },
  { name: "Austria", flag: "🇦🇹" },
  { name: "Denmark", flag: "🇩🇰" },
  { name: "Finland", flag: "🇫🇮" },
  { name: "Czech Republic", flag: "🇨🇿" },
  { name: "New Zealand", flag: "🇳🇿" },
];

type AnalysisResult = {
  rootCauses: string[];
  missedDocuments: string[];
  recoveryPlan: string[];
  successProbability: number;
  urgentActions: string[];
  summary: string;
};

function RejectionAnalyserInner() {
  const [destination, setDestination] = useState("");
  const [visaType, setVisaType] = useState<VisaType | "">("");
  const [origin, setOrigin] = useState("");
  const [refusalText, setRefusalText] = useState("");
  const [inputMode, setInputMode] = useState<"text" | "pdf">("text");
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const [showAllCountries, setShowAllCountries] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const analyseRejection = useAction(api.ai.rejectionAnalyser.analyseRejection);

  const visibleDestinations = showAllCountries ? REJECTION_DESTINATIONS : REJECTION_DESTINATIONS.slice(0, 10);
  const canAnalyse = destination && visaType && origin && refusalText.length > 50;

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      // Extract raw text from PDF data URI for basic parsing
      // We show the file name and ask them to also paste key excerpts
      setPdfFileName(file.name);
      toast.success(`PDF "${file.name}" loaded. Please paste the key rejection reasons from the letter below for accurate analysis.`);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyse = async () => {
    if (!canAnalyse) return;
    setLoading(true);
    try {
      const res = await analyseRejection({
        refusalText,
        destination,
        visaType: visaType as string,
        origin,
      });
      setResult(res);
    } catch {
      toast.error("Analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const probColor = result
    ? result.successProbability >= 70 ? "#16a34a" : result.successProbability >= 40 ? "#d97706" : "#dc2626"
    : "#64748b";

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-xs font-semibold text-red-600 mb-4">
          <AlertCircle className="w-3 h-3" />
          AI Rejection Analyser
        </div>
        <h1 className="font-serif text-4xl font-semibold text-primary mb-3">
          Turn Rejection Into Approval
        </h1>
        <p className="text-muted-foreground text-base max-w-lg mx-auto leading-relaxed">
          Paste your refusal letter. Our AI will identify exactly why you were rejected and build a step-by-step recovery plan.
        </p>
      </div>

      {!result ? (
        <div className="space-y-4">
          {/* Destination */}
          <div className="bg-card border border-border rounded-xl p-5">
            <label className="block text-sm font-semibold text-primary mb-3">1. Which country rejected you?</label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {visibleDestinations.map((d) => (
                <button
                  key={d.name}
                  onClick={() => setDestination(d.name)}
                  className={cn(
                    "flex flex-col items-center gap-1 p-2.5 rounded-xl border text-center transition-all cursor-pointer",
                    destination === d.name ? "border-primary bg-primary/5" : "border-border bg-background hover:border-primary/30"
                  )}
                >
                  <span className="text-xl">{d.flag}</span>
                  <span className={cn("text-[10px] font-medium leading-tight", destination === d.name ? "text-primary" : "text-foreground/70")}>{d.name}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowAllCountries((v) => !v)}
              className="mt-3 text-xs text-primary font-semibold hover:underline cursor-pointer flex items-center gap-1"
            >
              {showAllCountries ? "Show fewer countries" : `Show all ${REJECTION_DESTINATIONS.length} countries`}
              <ChevronRight className={cn("w-3 h-3 transition-transform", showAllCountries && "rotate-90")} />
            </button>
          </div>

          {/* Visa type */}
          <div className="bg-card border border-border rounded-xl p-5">
            <label className="block text-sm font-semibold text-primary mb-3">2. What type of visa were you applying for?</label>
            <div className="space-y-2">
              {VISA_TYPES.map((vt) => (
                <button
                  key={vt.value}
                  onClick={() => setVisaType(vt.value)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all cursor-pointer",
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

          {/* Origin */}
          <div className="bg-card border border-border rounded-xl p-5">
            <label className="block text-sm font-semibold text-primary mb-1.5">3. Your country of origin</label>
            <input
              type="text"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              placeholder="e.g. Nigeria, Ghana, Pakistan..."
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Refusal letter input */}
          <div className="bg-card border border-border rounded-xl p-5">
            <label className="block text-sm font-semibold text-primary mb-3">4. Your refusal letter</label>

            {/* Input mode toggle */}
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
                {/* PDF drop zone */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/2 transition-all"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={handlePdfUpload}
                  />
                  {pdfFileName ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileText className="w-5 h-5 text-primary" />
                      <span className="text-sm font-medium text-primary">{pdfFileName}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); setPdfFileName(null); }}
                        className="text-muted-foreground hover:text-destructive cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                      <p className="text-sm font-medium text-foreground mb-1">Click to upload your PDF refusal letter</p>
                      <p className="text-xs text-muted-foreground">PDF files only</p>
                    </>
                  )}
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 leading-relaxed">
                    After uploading your PDF, please also paste the key rejection reason sentences in the text box below. This ensures our AI can read the exact wording used by the embassy.
                  </p>
                </div>
                <label className="block text-xs font-semibold text-foreground mb-1">Paste key rejection sentences from the PDF</label>
                <textarea
                  value={refusalText}
                  onChange={(e) => setRefusalText(e.target.value)}
                  rows={6}
                  placeholder="Copy and paste the rejection reason paragraph(s) from your PDF here..."
                  className="w-full px-3.5 py-3 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none leading-relaxed"
                />
              </div>
            ) : (
              <>
                <p className="text-xs text-muted-foreground mb-3">Copy and paste the text from your refusal letter. You can omit personal details if you wish.</p>
                <textarea
                  value={refusalText}
                  onChange={(e) => setRefusalText(e.target.value)}
                  rows={8}
                  placeholder="Paste your refusal letter here..."
                  className="w-full px-3.5 py-3 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none leading-relaxed"
                />
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-muted-foreground">{refusalText.length} characters</p>
                  {refusalText.length > 0 && refusalText.length < 50 && (
                    <p className="text-xs text-amber-600">Please paste more of the letter for accurate analysis</p>
                  )}
                </div>
              </>
            )}
          </div>

          <Button
            size="lg"
            className="w-full cursor-pointer font-semibold py-6 text-base bg-primary hover:bg-primary/90 shadow-md"
            disabled={!canAnalyse || loading}
            onClick={() => { void handleAnalyse(); }}
          >
            {loading ? <><Spinner /> Analysing your refusal...</> : <>Analyse My Rejection <ChevronRight className="w-5 h-5 ml-1" /></>}
          </Button>

          {/* Privacy note */}
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Lock className="w-3 h-3 text-accent" />
            <span>Your letter is processed securely and not shared with third parties.</span>
          </div>
        </div>
      ) : (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Success probability */}
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center gap-5">
                <div className="relative w-24 h-24 shrink-0">
                  <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                    <circle cx="48" cy="48" r="36" fill="none" stroke="currentColor" strokeWidth="7" className="text-border" />
                    <motion.circle
                      cx="48" cy="48" r="36"
                      fill="none"
                      stroke={probColor}
                      strokeWidth="7"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 36}
                      initial={{ strokeDashoffset: 2 * Math.PI * 36 }}
                      animate={{ strokeDashoffset: 2 * Math.PI * 36 * (1 - result.successProbability / 100) }}
                      transition={{ duration: 1.2, ease: "easeOut" as const }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-bold text-xl" style={{ color: probColor }}>{result.successProbability}%</span>
                  </div>
                </div>
                <div>
                  <div className="font-semibold text-sm text-muted-foreground uppercase tracking-widest mb-1">Re-application Success Probability</div>
                  <div className="font-serif text-xl font-semibold text-primary mb-2">
                    {result.successProbability >= 70 ? "Strong recovery possible" : result.successProbability >= 40 ? "Recovery possible with work" : "Needs significant preparation"}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{result.summary}</p>
                </div>
              </div>
            </div>

            {/* Urgent actions */}
            {result.urgentActions.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <span className="font-semibold text-sm text-red-700 uppercase tracking-widest">Urgent Actions</span>
                </div>
                <div className="space-y-2">
                  {result.urgentActions.map((a, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-[10px] font-bold text-white">{i + 1}</span>
                      </div>
                      <p className="text-sm text-red-800 leading-relaxed">{a}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Root causes */}
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm text-primary uppercase tracking-widest">Why You Were Rejected</span>
              </div>
              <div className="space-y-2">
                {result.rootCauses.map((c, i) => (
                  <div key={i} className="flex items-start gap-2.5 p-3 bg-muted/40 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-foreground leading-relaxed">{c}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Missed documents */}
            {result.missedDocuments.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-sm text-primary uppercase tracking-widest">Missing or Weak Documents</span>
                </div>
                <div className="space-y-2">
                  {result.missedDocuments.map((d, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-accent shrink-0 mt-2" />
                      <p className="text-sm text-foreground leading-relaxed">{d}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recovery plan */}
            <div className="bg-primary rounded-xl p-5 text-primary-foreground">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4" style={{ color: "oklch(0.72 0.13 80)" }} />
                <span className="font-semibold text-sm uppercase tracking-widest">Your Recovery Plan</span>
              </div>
              <div className="space-y-3">
                {result.recoveryPlan.map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "oklch(0.72 0.13 80)" }}>
                      <span className="text-[11px] font-bold" style={{ color: "oklch(0.18 0.04 80)" }}>{i + 1}</span>
                    </div>
                    <p className="text-sm text-primary-foreground/90 leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="secondary"
                className="cursor-pointer"
                onClick={() => { setResult(null); setRefusalText(""); }}
              >
                <RotateCcw className="w-4 h-4 mr-1.5" /> Analyse Another
              </Button>
              <Button
                className="cursor-pointer"
                onClick={() => window.location.href = "/checklist"}
              >
                Get New Checklist <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>

            <div className="flex items-start gap-3 border border-border bg-card rounded-xl p-4">
              <Lightbulb className="w-4 h-4 text-accent shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                This analysis is AI-generated and for guidance only. For complex rejection cases, consult a verified immigration solicitor.
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

export default function RejectionAnalyserPage() {
  useSeo({ title: "Rejection Analyser", description: "Find out exactly why your visa was rejected and what to do next. AI-powered analysis of your refusal letter with a clear action plan." });
  const navigate = useNavigate();
  const goBack = useSmartBack("/dashboard");
  const { isDemoAuthenticated, signOut } = useDemoAuth();
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={goBack} className="text-muted-foreground hover:text-primary transition-colors cursor-pointer p-1 -ml-1">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button onClick={() => navigate("/")} className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity">
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
            <div className="flex items-center gap-1.5 text-xs font-semibold text-red-600">
              <AlertCircle className="w-3.5 h-3.5" /> Rejection Analyser
            </div>
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

      <div className="max-w-2xl mx-auto px-4 py-8">
        <AuthLoading>
          <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
        </AuthLoading>
        <Unauthenticated>
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-5">
              <LogIn className="w-7 h-7 text-red-500" />
            </div>
            <h2 className="font-serif text-3xl font-semibold text-primary mb-3">Sign In Required</h2>
            <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">Sign in to use the AI Rejection Analyser and save your recovery plan.</p>
            <SignInButton size="lg" className="cursor-pointer font-semibold" signInText="Sign In to Analyse" />
          </div>
        </Unauthenticated>
        <Authenticated>
          <RejectionAnalyserInner />
        </Authenticated>
      </div>

      <footer className="border-t border-border mt-10 py-6 px-6 text-center">
        <p className="text-xs text-muted-foreground italic mb-1">&ldquo;It&apos;s all about Privacy.&rdquo;</p>
        <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} Vericore Ltd.</p>
      </footer>
    </div>
  );
}
