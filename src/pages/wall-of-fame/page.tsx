import { useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import {
  Globe, ArrowLeft, Award, CheckCircle2, XCircle, Plus, Clock,
} from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { AuthAccessPanel } from "@/components/auth/access-panel.tsx";
import { useSeo } from "@/hooks/use-seo.ts";
import { useSmartBack } from "@/hooks/use-smart-back.ts";
import { useAuth } from "@/hooks/use-auth.ts";
import { VISA_TYPES } from "@/lib/visa-data.ts";
import { WORLD_DESTINATIONS } from "@/lib/countries.ts";

function StoryCard({ story }: { story: { destination: string; visaType: string; refusalCount: number; whatWentWrong: string; whatFixedIt: string; createdAt: string } }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl p-5"
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-accent" />
          <span className="text-sm font-semibold text-primary">
            {story.destination} · {story.visaType.charAt(0).toUpperCase() + story.visaType.slice(1)} visa
          </span>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
          Refused {story.refusalCount}×, then approved
        </span>
      </div>
      <div className="space-y-2.5">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">What went wrong</p>
          <p className="text-sm text-foreground leading-relaxed">{story.whatWentWrong}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">What fixed it</p>
          <p className="text-sm text-foreground leading-relaxed">{story.whatFixedIt}</p>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground mt-3">
        Submitted anonymously · {new Date(story.createdAt).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
      </p>
    </motion.div>
  );
}

function SubmitStoryForm({ onClose }: { onClose: () => void }) {
  const submitStory = useMutation(api.wallOfFame.submitStory);
  const [destination, setDestination] = useState("");
  const [visaType, setVisaType] = useState("");
  const [refusalCount, setRefusalCount] = useState("1");
  const [whatWentWrong, setWhatWentWrong] = useState("");
  const [whatFixedIt, setWhatFixedIt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = destination && visaType && whatWentWrong.trim().length >= 20 && whatFixedIt.trim().length >= 20;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await submitStory({
        destination,
        visaType,
        refusalCount: Number(refusalCount),
        whatWentWrong,
        whatFixedIt,
      });
      toast.success("Thank you! Your story will appear once reviewed by our team.");
      onClose();
    } catch (err) {
      const message = err instanceof ConvexError ? (err.data as { message: string }).message : "Could not submit your story. Please try again.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      <h3 className="font-semibold text-sm text-primary">Share your story</h3>
      <p className="text-xs text-muted-foreground">
        Anonymous to readers. Reviewed by our team before it goes public — please don't include passport numbers,
        account numbers, or other personal identifiers.
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        <select value={destination} onChange={(e) => setDestination(e.target.value)} className="px-3 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">Destination…</option>
          {[...WORLD_DESTINATIONS].sort((a, b) => a.localeCompare(b)).map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={visaType} onChange={(e) => setVisaType(e.target.value)} className="px-3 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">Visa type…</option>
          {VISA_TYPES.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-semibold text-foreground mb-1.5">How many times were you refused before approval?</label>
        <select value={refusalCount} onChange={(e) => setRefusalCount(e.target.value)} className="w-full px-3 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring">
          {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-semibold text-foreground mb-1.5">What went wrong (the refusal reason)</label>
        <Textarea value={whatWentWrong} onChange={(e) => setWhatWentWrong(e.target.value)} rows={3} placeholder="e.g. Bank statement only covered 6 weeks, and the officer cited insufficient ties to home country." />
      </div>
      <div>
        <label className="block text-xs font-semibold text-foreground mb-1.5">What you fixed before reapplying</label>
        <Textarea value={whatFixedIt} onChange={(e) => setWhatFixedIt(e.target.value)} rows={3} placeholder="e.g. Waited 4 months to build a clean statement history and added a cover letter addressing ties directly." />
      </div>
      <div className="flex gap-2">
        <Button variant="outline" className="cursor-pointer" onClick={onClose}>Cancel</Button>
        <Button className="flex-1 cursor-pointer font-semibold" disabled={!canSubmit || submitting} onClick={() => { void handleSubmit(); }}>
          {submitting ? "Submitting…" : "Submit for review"}
        </Button>
      </div>
    </div>
  );
}

export default function WallOfFamePage() {
  useSeo({
    title: "Rejection Wall of Fame",
    description: "Real, anonymous stories of visa applicants who were refused and later approved — what went wrong, and what they fixed before reapplying.",
  });
  const navigate = useNavigate();
  const goBack = useSmartBack("/");
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [destinationFilter, setDestinationFilter] = useState("");

  const { results: stories, status, loadMore } = usePaginatedQuery(
    api.wallOfFame.listApprovedStories,
    { destination: destinationFilter || undefined },
    { initialNumItems: 12 },
  );
  const { isAuthenticated } = useAuth();
  const mySubmissions = useQuery(api.wallOfFame.getMySubmissions, isAuthenticated ? {} : "skip");

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

      <main className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="font-serif text-3xl font-semibold text-primary mb-2">Rejection Wall of Fame</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Real, anonymous stories from applicants who were refused — and later approved. What went wrong, and exactly what they fixed.
        </p>

        <div className="flex items-center justify-between gap-3 mb-6">
          <select
            value={destinationFilter}
            onChange={(e) => setDestinationFilter(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All destinations</option>
            {[...WORLD_DESTINATIONS].sort((a, b) => a.localeCompare(b)).map((d) => <option key={d} value={d}>{d}</option>)}
          </select>

          <AuthLoading><Skeleton className="h-9 w-32" /></AuthLoading>
          <Unauthenticated>
            <Button size="sm" variant="outline" className="cursor-pointer" onClick={() => setShowSubmitForm(true)}>
              <Plus className="w-3.5 h-3.5" /> Share your story
            </Button>
          </Unauthenticated>
          <Authenticated>
            <Button size="sm" variant="outline" className="cursor-pointer" onClick={() => setShowSubmitForm(true)}>
              <Plus className="w-3.5 h-3.5" /> Share your story
            </Button>
          </Authenticated>
        </div>

        {showSubmitForm && (
          <div className="mb-6">
            <AuthLoading><Skeleton className="h-64 w-full rounded-xl" /></AuthLoading>
            <Unauthenticated>
              <div className="bg-card border border-border rounded-xl p-5">
                <p className="text-sm text-muted-foreground mb-4">Sign in to share your story (this keeps the Wall of Fame spam-free).</p>
                <AuthAccessPanel returnPath="/wall-of-fame" />
              </div>
            </Unauthenticated>
            <Authenticated>
              <SubmitStoryForm onClose={() => setShowSubmitForm(false)} />
            </Authenticated>
          </div>
        )}

        <Authenticated>
          {mySubmissions && mySubmissions.length > 0 && (
            <div className="mb-6 bg-muted/30 border border-border rounded-xl p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Your submissions</p>
              <div className="space-y-1.5">
                {mySubmissions.map((s) => (
                  <div key={s._id} className="flex items-center gap-2 text-xs">
                    {s.status === "approved" ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                    ) : s.status === "rejected" ? (
                      <XCircle className="w-3.5 h-3.5 text-red-600" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                    )}
                    <span className="text-foreground">{s.destination} · {s.visaType}</span>
                    <span className="text-muted-foreground capitalize">— {s.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Authenticated>

        <div className="space-y-4">
          {status === "LoadingFirstPage" ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-xl" />)
          ) : stories.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border rounded-xl">
              <Award className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No stories yet for this filter. Be the first to share yours.</p>
            </div>
          ) : (
            stories.map((story) => <StoryCard key={story._id} story={story} />)
          )}
        </div>

        {status === "CanLoadMore" && (
          <Button variant="outline" className="w-full mt-5 cursor-pointer" onClick={() => loadMore(12)}>
            Load more stories
          </Button>
        )}
      </main>
    </div>
  );
}
