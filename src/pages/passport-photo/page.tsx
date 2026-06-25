import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import { useAction } from "convex/react";
import { useSeo } from "@/hooks/use-seo.ts";
import { useSmartBack } from "@/hooks/use-smart-back.ts";
import { useDemoAuth } from "@/hooks/use-demo-auth.ts";
import { Button } from "@/components/ui/button.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import {
  Globe, ArrowLeft, Upload, CheckCircle2, XCircle,
  AlertCircle, Shield, Lock, Award, Camera,
  RotateCcw, ChevronRight, Info, LayoutDashboard, Settings, LogOut,
} from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import { AVAILABLE_DESTINATIONS } from "@/lib/visa-data.ts";
import { cn } from "@/lib/utils.ts";
import { toast } from "sonner";

const DEST_FLAGS: Record<string, string> = {
  "United Kingdom": "🇬🇧", "United States": "🇺🇸", "Canada": "🇨🇦",
  "Germany": "🇩🇪", "Poland": "🇵🇱", "France": "🇫🇷", "Australia": "🇦🇺",
  "Netherlands": "🇳🇱", "Ireland": "🇮🇪",
};

// This action is unauthenticated and free for anyone to call, so cap usage
// per browser to avoid runaway AI-gateway costs from automated abuse.
const PHOTO_CHECK_DAILY_LIMIT = 5;

function getDailyPhotoCheckUsage(): number {
  const today = new Date().toDateString();
  const stored = localStorage.getItem("vc_photo_check_usage");
  if (!stored) return 0;
  try {
    const parsed = JSON.parse(stored) as { date: string; count: number };
    if (parsed.date !== today) return 0;
    return parsed.count;
  } catch {
    return 0;
  }
}

function incrementDailyPhotoCheckUsage(): void {
  const today = new Date().toDateString();
  const count = getDailyPhotoCheckUsage() + 1;
  localStorage.setItem("vc_photo_check_usage", JSON.stringify({ date: today, count }));
}

type PhotoIssue = { pass: boolean; label: string; detail: string };
type PhotoCheckResult = {
  score: number;
  verdict: "Approved" | "Review Required" | "Rejected";
  issues: PhotoIssue[];
  summary: string;
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function PassportPhotoPage() {
  useSeo({ title: "Passport Photo Checker", description: "Instantly check if your passport photo meets embassy requirements. AI-powered analysis for UK, US, Canada, Schengen, and more destinations." });
  const navigate = useNavigate();
  const goBack = useSmartBack("/dashboard");
  const { isDemoAuthenticated, signOut } = useDemoAuth();
  const [destination, setDestination] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [result, setResult] = useState<PhotoCheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [usageCount, setUsageCount] = useState(getDailyPhotoCheckUsage);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const checkPhoto = useAction(api.ai.photoChecker.checkPassportPhoto);

  const handleFileChange = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (JPG, PNG, WEBP)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setResult(null);
    fileToBase64(file).then((b64) => setImageBase64(b64)).catch(() => toast.error("Failed to read image"));
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileChange(file);
  }, [handleFileChange]);

  const handleAnalyse = async () => {
    if (!imageBase64 || !destination) return;
    if (usageCount >= PHOTO_CHECK_DAILY_LIMIT) {
      toast.error(`You've reached today's limit of ${PHOTO_CHECK_DAILY_LIMIT} photo checks. Please try again tomorrow.`);
      return;
    }
    setLoading(true);
    try {
      const res = await checkPhoto({ imageBase64, destination });
      setResult(res);
      incrementDailyPhotoCheckUsage();
      setUsageCount(getDailyPhotoCheckUsage());
    } catch {
      toast.error("Photo analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setImageUrl(null);
    setImageBase64(null);
    setResult(null);
  };

  const verdictColor = result
    ? result.verdict === "Approved" ? "text-green-600" : result.verdict === "Review Required" ? "text-amber-600" : "text-red-600"
    : "";

  const verdictBg = result
    ? result.verdict === "Approved" ? "bg-green-50 border-green-200" : result.verdict === "Review Required" ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200"
    : "";

  const scoreColor = result
    ? result.score >= 80 ? "#16a34a" : result.score >= 50 ? "#d97706" : "#dc2626"
    : "#64748b";

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={goBack}
              className="text-muted-foreground hover:text-primary transition-colors cursor-pointer p-1 -ml-1"
            >
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
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Camera className="w-3.5 h-3.5 text-accent" />
              Photo Checker
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

      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        {/* Hero */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-xs font-semibold text-accent mb-4">
            <Camera className="w-3 h-3" />
            AI Passport Photo Checker
          </div>
          <h1 className="font-serif text-4xl font-semibold text-primary mb-3">
            Is Your Photo Visa-Ready?
          </h1>
          <p className="text-muted-foreground text-base max-w-lg mx-auto leading-relaxed">
            Upload your passport photo and get an instant AI compliance check against embassy standards for your destination country.
          </p>
        </div>

        {/* Step 1: Destination */}
        <div className="bg-card border border-border rounded-xl p-6">
          <label className="block text-sm font-semibold text-primary mb-3">
            1. Select your destination country
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {AVAILABLE_DESTINATIONS.slice(0, 10).map((d) => (
              <button
                key={d}
                onClick={() => setDestination(d)}
                className={cn(
                  "flex flex-col items-center gap-1 p-2.5 rounded-xl border text-center transition-all cursor-pointer",
                  destination === d
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border bg-background hover:border-primary/30"
                )}
              >
                <span className="text-xl">{DEST_FLAGS[d] ?? "🌍"}</span>
                <span className={cn(
                  "text-[10px] font-medium leading-tight",
                  destination === d ? "text-primary" : "text-foreground/70"
                )}>{d}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Upload */}
        <div className="bg-card border border-border rounded-xl p-6">
          <label className="block text-sm font-semibold text-primary mb-3">
            2. Upload your passport photo
          </label>

          {!imageUrl ? (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border hover:border-primary/40 rounded-xl p-10 text-center cursor-pointer transition-colors group"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/8 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/15 transition-colors">
                <Upload className="w-5 h-5 text-primary" />
              </div>
              <p className="font-semibold text-sm text-foreground mb-1">Click to upload or drag & drop</p>
              <p className="text-xs text-muted-foreground">JPG, PNG, WEBP · Max 5MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileChange(f); }}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-24 h-28 rounded-xl overflow-hidden border-2 border-border shrink-0">
                  <img src={imageUrl} alt="Uploaded photo" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground mb-1">Photo uploaded</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    {destination ? `Checking against ${destination} embassy standards.` : "Select a destination to analyse."}
                  </p>
                  <button
                    onClick={reset}
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer border border-border rounded-lg px-3 py-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Replace photo
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Analyse button */}
        <Button
          size="lg"
          className="w-full cursor-pointer font-semibold py-6 text-base bg-primary hover:bg-primary/90 shadow-md"
          disabled={!imageBase64 || !destination || loading}
          onClick={() => { void handleAnalyse(); }}
        >
          {loading ? (
            <><Spinner /> Analysing Photo…</>
          ) : (
            <>Analyse My Photo <ChevronRight className="w-5 h-5 ml-1" /></>
          )}
        </Button>

        {/* Results */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Score + Verdict */}
              <div className={cn("rounded-xl border p-6", verdictBg)}>
                <div className="flex items-center gap-5">
                  {/* Score ring */}
                  <div className="relative w-20 h-20 shrink-0">
                    <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="32" fill="none" stroke="currentColor" strokeWidth="6" className="text-border" />
                      <motion.circle
                        cx="40" cy="40" r="32"
                        fill="none"
                        stroke={scoreColor}
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 32}
                        initial={{ strokeDashoffset: 2 * Math.PI * 32 }}
                        animate={{ strokeDashoffset: 2 * Math.PI * 32 * (1 - result.score / 100) }}
                        transition={{ duration: 1.2, ease: "easeOut" as const }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="font-bold text-lg" style={{ color: scoreColor }}>{result.score}</span>
                    </div>
                  </div>
                  <div>
                    <div className={cn("font-bold text-xl mb-1", verdictColor)}>{result.verdict}</div>
                    <p className="text-sm text-foreground/80 leading-relaxed max-w-xs">{result.summary}</p>
                  </div>
                </div>
              </div>

              {/* Checks grid */}
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="font-semibold text-sm text-primary uppercase tracking-widest mb-4">
                  Compliance Checks
                </h3>
                <div className="space-y-3">
                  {result.issues.map((issue, i) => (
                    <div key={i} className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border",
                      issue.pass ? "bg-green-50/50 border-green-200/60" : "bg-red-50/50 border-red-200/60"
                    )}>
                      <div className="shrink-0 mt-0.5">
                        {issue.pass
                          ? <CheckCircle2 className="w-4.5 h-4.5 text-green-600" />
                          : <XCircle className="w-4.5 h-4.5 text-red-500" />}
                      </div>
                      <div>
                        <div className={cn("font-semibold text-sm", issue.pass ? "text-green-800" : "text-red-800")}>
                          {issue.label}
                        </div>
                        <div className="text-xs text-foreground/70 mt-0.5 leading-relaxed">{issue.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tips */}
              <div className="flex items-start gap-3 border border-primary/20 bg-primary/5 rounded-xl p-4">
                <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-sm text-primary mb-1">Photo Requirements Reminder</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    This AI check is a guidance tool. Always verify your photo against the official photo requirements on the embassy or immigration website for {destination}.
                    When in doubt, use a professional passport photo service.
                  </p>
                </div>
              </div>

              {/* CTA */}
              <button
                onClick={() => navigate("/checklist")}
                className="w-full flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-accent/3 transition-colors cursor-pointer"
              >
                <div>
                  <div className="font-semibold text-sm text-foreground">Ready to prepare your documents?</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Get your full visa checklist for {destination}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-primary shrink-0" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Standards info */}
        {!result && (
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-sm text-primary uppercase tracking-widest mb-4">
              What We Check
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                "Plain white or light background",
                "Face centered and clearly visible",
                "Neutral expression, mouth closed",
                "Eyes open and visible",
                "No glasses",
                "No hats or headwear",
                "Even lighting, no shadows",
                "Photo quality and clarity",
              ].map((c) => (
                <div key={c} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                  {c}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trust row */}
        <div className="flex flex-wrap items-center justify-center gap-4 py-2">
          {[
            { icon: <Shield className="w-3 h-3" />, label: "GDPR Compliant" },
            { icon: <Lock className="w-3 h-3" />, label: "Photo not stored" },
            { icon: <Award className="w-3 h-3" />, label: "CISA Certified" },
          ].map((t) => (
            <div key={t.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="text-accent">{t.icon}</span>
              {t.label}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border mt-10 py-6 px-6 text-center">
        <p className="text-xs text-muted-foreground italic mb-1">&ldquo;It&apos;s all about Privacy.&rdquo;</p>
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Vericore Ltd. · VisaClear is a guidance tool, not legal advice.
        </p>
      </footer>
    </div>
  );
}
