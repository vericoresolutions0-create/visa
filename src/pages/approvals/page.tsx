import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate, Link } from "react-router-dom";
import { usePaginatedQuery, useMutation, useQuery } from "convex/react";
import { Authenticated, Unauthenticated } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import {
  ArrowLeft, CheckCircle2, Plus, Globe, ChevronDown,
  Loader2, Sparkles,
} from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { useSeo } from "@/hooks/use-seo.ts";
import { useSmartBack } from "@/hooks/use-smart-back.ts";
import { useAuth } from "@/hooks/use-auth.ts";
import { useDemoAuth } from "@/hooks/use-demo-auth.ts";
import { useCountryName } from "@/hooks/use-country-name.ts";
import { DESTINATION_FLAGS } from "@/lib/destination-flags.ts";
import { AVAILABLE_DESTINATIONS, VISA_TYPES } from "@/lib/visa-data.ts";
import { CountrySelect } from "@/components/CountrySelect.tsx";
import { cn } from "@/lib/utils.ts";

const ATTEMPTS_LABEL: Record<number, string> = {
  1: "First attempt",
  2: "Second attempt",
  3: "Third attempt or more",
};

const ATTEMPTS_COLOR: Record<number, string> = {
  1: "bg-emerald-50 text-emerald-700 border-emerald-200",
  2: "bg-blue-50 text-blue-700 border-blue-200",
  3: "bg-violet-50 text-violet-700 border-violet-200",
};

function StoryCard({
  story,
}: {
  story: {
    origin: string;
    destination: string;
    visaType: string;
    attempts: 1 | 2 | 3;
    shortNote?: string;
    submittedAt: string;
  };
}) {
  const translateCountry = useCountryName();
  const flag = DESTINATION_FLAGS[story.destination] ?? "🌍";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl leading-none">{flag}</span>
          <div>
            <p className="text-sm font-semibold text-foreground leading-tight">
              {translateCountry(story.origin)} → {translateCountry(story.destination)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 capitalize">{story.visaType} visa</p>
          </div>
        </div>
        <span className={cn(
          "shrink-0 text-[10px] font-bold border rounded-full px-2.5 py-1 uppercase tracking-wide",
          ATTEMPTS_COLOR[story.attempts],
        )}>
          {ATTEMPTS_LABEL[story.attempts]}
        </span>
      </div>

      {story.shortNote && (
        <p className="text-sm text-foreground/80 leading-relaxed border-l-2 border-accent/40 pl-3 italic">
          "{story.shortNote}"
        </p>
      )}

      <div className="flex items-center gap-1.5 mt-auto">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
        <p className="text-[11px] text-muted-foreground">
          Anonymous member · {new Date(story.submittedAt).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
        </p>
      </div>
    </motion.div>
  );
}

// ─── Submit Story Form ────────────────────────────────────────────────────────

function SubmitStoryForm({ onDone }: { onDone: () => void }) {
  const submitStory = useMutation(api.approvalStories.submitApprovalStory);
  const currentUser = useQuery(api.users.getCurrentUser, {});
  const [formOrigin, setFormOrigin] = useState("");
  const [formDestination, setFormDestination] = useState("");
  const [formVisaType, setFormVisaType] = useState("");
  const [attempts, setAttempts] = useState<1 | 2 | 3>(1);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = Boolean(formOrigin && formDestination && formVisaType);
  const isPaid = currentUser?.plan === "pro" || currentUser?.plan === "expert";

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      await submitStory({
        origin: formOrigin,
        destination: formDestination,
        visaType: formVisaType,
        attempts,
        shortNote: note.trim() || undefined,
      });
      toast.success("Story submitted for review. It'll appear here once approved.");
      onDone();
    } catch (err) {
      const msg = err instanceof ConvexError
        ? (err.data as { message?: string })?.message ?? "Something went wrong."
        : "Something went wrong.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (currentUser === undefined) {
    return <div className="h-48 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  }

  if (!isPaid) {
    return (
      <div className="text-center py-8 px-4">
        <Sparkles className="w-8 h-8 text-accent mx-auto mb-3" />
        <p className="text-sm font-semibold text-foreground mb-1">Pro or Expert plan required</p>
        <p className="text-xs text-muted-foreground mb-4">Only paid members can share approval stories. Upgrade to help others on your corridor.</p>
        <Link to="/pricing">
          <Button size="sm" className="cursor-pointer">See Plans</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-foreground mb-1.5 block">Where did you travel from?</label>
          <CountrySelect value={formOrigin} onChange={setFormOrigin} placeholder="Your country" />
        </div>
        <div>
          <label className="text-xs font-semibold text-foreground mb-1.5 block">Which country were you approved for?</label>
          <CountrySelect value={formDestination} onChange={setFormDestination} placeholder="Destination country" />
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-foreground mb-1.5 block">Visa type</label>
        <div className="flex flex-wrap gap-2">
          {VISA_TYPES.map((vt) => (
            <button
              key={vt.value}
              onClick={() => setFormVisaType(vt.value)}
              className={cn(
                "text-xs font-medium px-3 py-1.5 rounded-full border transition-colors cursor-pointer",
                formVisaType === vt.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-primary/40"
              )}
            >
              {vt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-foreground mb-1.5 block">How many attempts did it take?</label>
        <div className="flex gap-2">
          {([1, 2, 3] as const).map((n) => (
            <button
              key={n}
              onClick={() => setAttempts(n)}
              className={cn(
                "text-xs font-semibold px-4 py-2 rounded-lg border transition-colors cursor-pointer",
                attempts === n
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-primary/40"
              )}
            >
              {n === 3 ? "3+" : n}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-foreground mb-1.5 block">
          Add a short note <span className="font-normal text-muted-foreground">(optional, max 120 characters)</span>
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, 120))}
          placeholder="e.g. What made the difference this time"
          rows={2}
          className="w-full text-sm rounded-xl border border-border bg-background px-3.5 py-2.5 text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <p className="text-[10px] text-muted-foreground mt-1 text-right">{note.length}/120</p>
      </div>

      <p className="text-xs text-muted-foreground">
        Your story is anonymous — no name or account details are ever shown. It goes to admin review before going live.
      </p>

      <Button
        onClick={handleSubmit}
        disabled={!canSubmit || submitting}
        className="w-full sm:w-auto cursor-pointer"
      >
        {submitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Submitting…</> : "Share my approval"}
      </Button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ApprovalsPage() {
  useSeo({
    title: "Real Visa Approvals — VisaClear",
    description: "Real approval stories from VisaClear members. See which corridors people are getting approved on and what made the difference.",
  });

  const navigate = useNavigate();
  const smartBack = useSmartBack();
  const { isAuthenticated } = useAuth();
  const { isDemoAuthenticated } = useDemoAuth();
  const translateCountry = useCountryName();

  const [filterDestination, setFilterDestination] = useState("");
  const [showForm, setShowForm] = useState(false);

  const corridorFilter = filterDestination
    ? `--${filterDestination.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`
    : undefined;

  const { results, status, loadMore } = usePaginatedQuery(
    api.approvalStories.listApprovedStories,
    { corridor: corridorFilter },
    { initialNumItems: 12 },
  );

  const isLoggedIn = isAuthenticated && !isDemoAuthenticated;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={smartBack}
            className="w-9 h-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-foreground truncate">Real Visa Approvals</h1>
            <p className="text-[11px] text-muted-foreground hidden sm:block">Shared by verified VisaClear members</p>
          </div>
          {isLoggedIn && (
            <Button
              size="sm"
              variant={showForm ? "outline" : "default"}
              onClick={() => setShowForm(!showForm)}
              className="cursor-pointer shrink-0 text-xs gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              {showForm ? "Cancel" : "Share mine"}
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* Submit form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-card border border-border rounded-2xl p-5">
                <h2 className="text-base font-semibold text-foreground mb-4">Share your approval story</h2>
                <Authenticated>
                  <SubmitStoryForm onDone={() => setShowForm(false)} />
                </Authenticated>
                <Unauthenticated>
                  <div className="text-center py-6">
                    <p className="text-sm text-muted-foreground mb-3">Sign in to share your approval story.</p>
                    <Button size="sm" onClick={() => navigate("/login")} className="cursor-pointer">Sign in</Button>
                  </div>
                </Unauthenticated>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filter */}
        <div className="flex items-center gap-3">
          <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
          <div className="flex-1 max-w-xs">
            <CountrySelect
              value={filterDestination}
              onChange={setFilterDestination}
              placeholder="Filter by destination"
            />
          </div>
          {filterDestination && (
            <button
              onClick={() => setFilterDestination("")}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer underline"
            >
              Clear
            </button>
          )}
        </div>

        {/* Hero blurb — only when unfiltered */}
        {!filterDestination && (
          <div className="bg-[#0f2040] rounded-2xl p-6 text-white">
            <h2 className="text-lg font-serif font-semibold mb-1.5">Every stamp started here</h2>
            <p className="text-sm text-white/70 leading-relaxed max-w-lg">
              These are real approval stories from VisaClear members — the corridors they applied on, how many attempts it took, and what helped. No fabricated quotes. Just facts.
            </p>
          </div>
        )}

        {/* Stories grid */}
        {status === "LoadingFirstPage" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-2xl" />
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-20">
            <CheckCircle2 className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm font-semibold text-muted-foreground">
              {filterDestination
                ? `No approved stories for ${translateCountry(filterDestination)} yet`
                : "No approved stories yet"
              }
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {isLoggedIn
                ? "Be the first to share your approval on this corridor."
                : "Stories appear here once members share and admin approves them."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {results.map((story, i) => (
              <StoryCard key={i} story={story} />
            ))}
          </div>
        )}

        {/* Load more */}
        {status === "CanLoadMore" && (
          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={() => loadMore(12)}
              className="cursor-pointer gap-2"
            >
              <ChevronDown className="w-4 h-4" />
              Load more stories
            </Button>
          </div>
        )}

        {status === "LoadingMore" && (
          <div className="flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* CTA for guests */}
        <Unauthenticated>
          <div className="bg-card border border-border rounded-2xl p-6 text-center">
            <h3 className="text-base font-semibold text-foreground mb-1.5">Got your visa approved?</h3>
            <p className="text-sm text-muted-foreground mb-4">Sign up free and share your story to help others on the same corridor.</p>
            <Button onClick={() => navigate("/login")} className="cursor-pointer">
              Create a free account
            </Button>
          </div>
        </Unauthenticated>
      </div>
    </div>
  );
}
