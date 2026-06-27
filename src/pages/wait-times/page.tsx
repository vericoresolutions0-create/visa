import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import { Globe, ArrowLeft, Clock, Plus, CheckCircle2, XCircle } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { AuthAccessPanel } from "@/components/auth/access-panel.tsx";
import { useSeo } from "@/hooks/use-seo.ts";
import { useSmartBack } from "@/hooks/use-smart-back.ts";
import { useAuth } from "@/hooks/use-auth.ts";
import { VISA_TYPES, getChecklist } from "@/lib/visa-data.ts";
import { WORLD_DESTINATIONS } from "@/lib/countries.ts";
import { daysToReadable } from "@/lib/wait-time.ts";

function SubmitReportForm({ destination, visaType, onClose }: { destination: string; visaType: string; onClose: () => void }) {
  const submitReport = useMutation(api.waitTimeTracker.submitWaitTimeReport);
  const [applicationDate, setApplicationDate] = useState("");
  const [decisionDate, setDecisionDate] = useState("");
  const [outcome, setOutcome] = useState<"approved" | "refused" | "">("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = applicationDate && decisionDate;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await submitReport({
        destination,
        visaType,
        applicationDate,
        decisionDate,
        outcome: outcome || undefined,
      });
      toast.success("Thanks! Your report helps everyone applying for this route.");
      onClose();
    } catch (err) {
      const message = err instanceof ConvexError ? (err.data as { message: string }).message : "Could not submit your report. Please try again.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      <h3 className="font-semibold text-sm text-primary">Report your wait time</h3>
      <p className="text-xs text-muted-foreground">For {destination} · {visaType} visa.</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1.5">Application date</label>
          <input type="date" value={applicationDate} onChange={(e) => setApplicationDate(e.target.value)} className="w-full px-3 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1.5">Decision date</label>
          <input type="date" value={decisionDate} onChange={(e) => setDecisionDate(e.target.value)} className="w-full px-3 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-foreground mb-1.5">Outcome (optional)</label>
        <select value={outcome} onChange={(e) => setOutcome(e.target.value as typeof outcome)} className="w-full px-3 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">Prefer not to say</option>
          <option value="approved">Approved</option>
          <option value="refused">Refused</option>
        </select>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" className="cursor-pointer" onClick={onClose}>Cancel</Button>
        <Button className="flex-1 cursor-pointer font-semibold" disabled={!canSubmit || submitting} onClick={() => { void handleSubmit(); }}>
          {submitting ? "Submitting…" : "Submit report"}
        </Button>
      </div>
    </div>
  );
}

export default function WaitTimesPage() {
  useSeo({
    title: "Embassy Wait Time Tracker",
    description: "Real, crowdsourced visa processing times from applicants — see how long it's actually taking right now, not just the official estimate.",
  });
  const navigate = useNavigate();
  const goBack = useSmartBack("/");
  const { isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();
  const [destination, setDestination] = useState(searchParams.get("to") ?? "United Kingdom");
  const [visaType, setVisaType] = useState(searchParams.get("type") ?? "tourist");
  const [showForm, setShowForm] = useState(false);

  const stats = useQuery(api.waitTimeTracker.getWaitTimeStats, { destination, visaType });
  const checklist = useMemo(() => getChecklist(destination, visaType as never), [destination, visaType]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40 px-6 py-4 flex items-center justify-between sticky top-0 z-40 bg-background/95 backdrop-blur">
        <div className="flex items-center gap-3">
          <button onClick={goBack} className="p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button onClick={() => navigate("/")} className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
            <Globe className="w-5 h-5 text-accent" />
            <span className="font-serif text-lg font-semibold text-primary">VisaClear</span>
          </button>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6 py-12">
        <h1 className="font-serif text-3xl font-semibold text-primary mb-2">Embassy Wait Time Tracker</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Real reports from applicants — how long it's actually taking right now, not just the official estimate.
        </p>

        <div className="grid sm:grid-cols-2 gap-3 mb-6">
          <select value={destination} onChange={(e) => setDestination(e.target.value)} className="px-3 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring">
            {[...WORLD_DESTINATIONS].sort((a, b) => a.localeCompare(b)).map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={visaType} onChange={(e) => setVisaType(e.target.value)} className="px-3 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring">
            {VISA_TYPES.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
          </select>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-2xl p-6 mb-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-accent" />
            <span className="text-sm font-semibold text-primary">{destination} · {visaType} visa</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Official estimate</p>
              <p className="text-lg font-semibold text-foreground">{checklist?.processingTime ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Community median</p>
              {stats === undefined ? (
                <Skeleton className="h-6 w-20" />
              ) : stats.hasEnoughData ? (
                <p className="text-lg font-semibold text-accent">{daysToReadable(stats.medianWaitDays)}</p>
              ) : (
                <p className="text-sm text-muted-foreground">Not enough reports yet ({stats.sampleSize}/5)</p>
              )}
            </div>
          </div>
          {stats?.hasEnoughData && (
            <p className="text-[11px] text-muted-foreground mt-3">
              Based on {stats.sampleSize} real applicant reports · range {daysToReadable(stats.minWaitDays)}–{daysToReadable(stats.maxWaitDays)}
            </p>
          )}
        </motion.div>

        <AuthLoading><Skeleton className="h-10 w-full mb-6" /></AuthLoading>
        <Unauthenticated>
          {!showForm ? (
            <Button variant="outline" className="w-full cursor-pointer mb-6" onClick={() => setShowForm(true)}>
              <Plus className="w-3.5 h-3.5" /> Report your wait time
            </Button>
          ) : (
            <div className="mb-6 bg-card border border-border rounded-xl p-5">
              <p className="text-sm text-muted-foreground mb-4">Sign in to submit a report (this keeps the data trustworthy).</p>
              <AuthAccessPanel returnPath="/wait-times" />
            </div>
          )}
        </Unauthenticated>
        <Authenticated>
          {!showForm ? (
            <Button variant="outline" className="w-full cursor-pointer mb-6" onClick={() => setShowForm(true)}>
              <Plus className="w-3.5 h-3.5" /> Report your wait time
            </Button>
          ) : (
            <div className="mb-6">
              <SubmitReportForm destination={destination} visaType={visaType} onClose={() => setShowForm(false)} />
            </div>
          )}
        </Authenticated>

        {isAuthenticated && <MyReports />}
      </main>
    </div>
  );
}

function MyReports() {
  const reports = useQuery(api.waitTimeTracker.getMyReports, {});
  if (!reports || reports.length === 0) return null;

  return (
    <div className="mt-2 bg-muted/30 border border-border rounded-xl p-4">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Your reports</p>
      <div className="space-y-1.5">
        {reports.map((r) => (
          <div key={r._id} className="flex items-center gap-2 text-xs">
            {r.outcome === "approved" ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
            ) : r.outcome === "refused" ? (
              <XCircle className="w-3.5 h-3.5 text-red-600" />
            ) : (
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            )}
            <span className="text-foreground">{r.destination} · {r.visaType}</span>
            <span className="text-muted-foreground">— {daysToReadable(r.waitDays)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
