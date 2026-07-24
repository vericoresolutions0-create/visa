import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useConvexAuth } from "convex/react";

import { toast } from "sonner";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.js";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { useSeo } from "@/hooks/use-seo.ts";
import { useSmartBack } from "@/hooks/use-smart-back.ts";
import { cn, convexErrMsg } from "@/lib/utils.ts";
import { EmailVerificationBanner } from "@/components/EmailVerificationBanner.tsx";
import {
  ArrowLeft, MapPin, Briefcase, Languages, Check, MessageCircle,
  Phone, BadgeCheck, Star, Globe, ChevronRight, Gem, ExternalLink,
  Flag, ShieldAlert, ShieldCheck, X,
} from "lucide-react";

function toWhatsAppNumber(phone: string): string {
  return phone.replace(/[^\d]/g, "");
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          className="cursor-pointer p-0.5"
          aria-label={`${n} star${n !== 1 ? "s" : ""}`}
        >
          <Star
            className={cn(
              "w-5 h-5 transition-colors",
              (hover || value) >= n ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40",
            )}
          />
        </button>
      ))}
    </div>
  );
}

const REPORT_REASONS: { value: string; label: string }[] = [
  { value: "fake_credentials", label: "Fake or misleading credentials" },
  { value: "inappropriate_behavior", label: "Inappropriate behaviour" },
  { value: "scam", label: "Scam or fraudulent activity" },
  { value: "misleading_information", label: "Misleading information" },
  { value: "other", label: "Other" },
];

export default function AgentProfilePage() {
  const { profileId } = useParams<{ profileId: string }>();
  const navigate = useNavigate();
  const goBack = useSmartBack("/agents");
  const { isAuthenticated } = useConvexAuth();

  const profile = useQuery(
    api.agents.getAgentPublicProfile,
    profileId ? { profileId } : "skip",
  );

  const approvedReviews = useQuery(
    api.agentReviews.listApproved,
    profile?._id ? { agentProfileId: profile._id } : "skip",
  );

  const myReview = useQuery(
    api.agentReviews.getMyReview,
    profile?._id && isAuthenticated ? { agentProfileId: profile._id } : "skip",
  );

  const contactAgent = useMutation(api.agents.contactAgent);
  const contactAgentAsGuest = useMutation(api.agents.contactAgentAsGuest);
  const recordProfileView = useMutation(api.agents.recordProfileView);
  const submitReview = useMutation(api.agentReviews.submitReview);
  const reportAgent = useMutation(api.agents.reportAgent);

  const [contacted, setContacted] = useState(false);
  const [guestSent, setGuestSent] = useState(false);
  const [guestSending, setGuestSending] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");

  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [showMessageBox, setShowMessageBox] = useState(false);

  // Review form
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewStars, setReviewStars] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // Report form
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportReason, setReportReason] = useState<string>("");
  const [reportDetails, setReportDetails] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSent, setReportSent] = useState(false);

  useEffect(() => {
    if (profile?._id) {
      void recordProfileView({ agentProfileId: profile._id }).catch(() => {});
    }
  // Only fire once when the profile first loads — not on every re-render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?._id]);

  useSeo({
    title: profile ? `${profile.fullName} — VisaClear Agent` : "Agent Profile — VisaClear",
    description: profile ? profile.bio.slice(0, 160) : "Find a verified visa consultant on VisaClear.",
  });

  const handleContact = async () => {
    if (!profile) return;
    setSending(true);
    try {
      await contactAgent({
        agentProfileId: profile._id as Id<"agent_profiles">,
        message: message.trim() || undefined,
      });
      setContacted(true);
      setShowMessageBox(false);
      toast.success(`Enquiry sent to ${profile.fullName}.`);
    } catch (err) {
      toast.error(convexErrMsg(err) ?? "Could not send enquiry. Try again.");
    } finally {
      setSending(false);
    }
  };

  const handleGuestContact = async () => {
    if (!profile) return;
    const name = guestName.trim();
    const email = guestEmail.trim();
    if (!name) { toast.error("Please enter your name."); return; }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setGuestSending(true);
    try {
      await contactAgentAsGuest({
        agentProfileId: profile._id as Id<"agent_profiles">,
        guestName: name,
        guestEmail: email,
        message: message.trim() || undefined,
      });
      setGuestSent(true);
      toast.success(`Enquiry sent to ${profile.fullName}.`);
    } catch (err) {
      toast.error(convexErrMsg(err) ?? "Could not send enquiry. Try again.");
    } finally {
      setGuestSending(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!profile) return;
    if (reviewStars < 1) { toast.error("Please choose a star rating."); return; }
    setReviewSubmitting(true);
    try {
      await submitReview({
        agentProfileId: profile._id as Id<"agent_profiles">,
        starRating: reviewStars,
        comment: reviewComment.trim() || undefined,
      });
      toast.success("Review submitted. It will appear after admin approval.");
      setShowReviewForm(false);
      setReviewStars(0);
      setReviewComment("");
    } catch (err) {
      toast.error(convexErrMsg(err) ?? "Could not submit review. Try again.");
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleReport = async () => {
    if (!profile) return;
    if (!reportReason) { toast.error("Please select a reason."); return; }
    setReportSubmitting(true);
    try {
      await reportAgent({
        agentProfileId: profile._id as Id<"agent_profiles">,
        reason: reportReason as "fake_credentials" | "inappropriate_behavior" | "scam" | "misleading_information" | "other",
        details: reportDetails.trim() || undefined,
      });
      setReportSent(true);
      setShowReportForm(false);
      toast.success("Report submitted. Our team will review it.");
    } catch (err) {
      toast.error(convexErrMsg(err) ?? "Could not submit report. Try again.");
    } finally {
      setReportSubmitting(false);
    }
  };

  if (profile === undefined) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 py-10 space-y-4">
          <Skeleton className="h-8 w-48 rounded-xl" />
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (profile === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center px-6">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <Globe className="w-8 h-8 text-muted-foreground" />
          </div>
          <h1 className="font-serif text-2xl font-semibold text-primary mb-2">Profile not found</h1>
          <p className="text-muted-foreground text-sm mb-6">
            This profile doesn't exist or hasn't been verified yet.
          </p>
          <Button onClick={() => navigate("/agents")} className="cursor-pointer">
            <ArrowLeft className="w-4 h-4 mr-2" /> Browse agents
          </Button>
        </div>
      </div>
    );
  }

  const whatsappHref = profile.phone
    ? `https://wa.me/${toWhatsAppNumber(profile.phone)}?text=${encodeURIComponent(
        `Hi ${profile.fullName}, I found your profile on VisaClear and I'd like to ask about your visa services.`,
      )}`
    : null;

  const hasCredentials = profile.credentialType || profile.credentialNumber;
  const avgRating = profile.rating ?? 0;
  const reviewCount = profile.reviewCount ?? 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={goBack}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="h-4 w-px bg-border" />
          <button
            onClick={() => navigate("/agents")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5" /> All agents
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Profile card */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-start gap-5 mb-5">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 font-bold text-primary text-2xl font-serif">
              {profile.fullName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="font-serif text-2xl font-semibold text-primary leading-tight">
                  {profile.fullName}
                </h1>
                {profile.tier === "agency_white_label" && (
                  <span className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full font-bold bg-linear-to-r from-amber-50 to-yellow-50 text-amber-700 border border-amber-200">
                    <Gem className="w-3 h-3" /> Elite Agency
                  </span>
                )}
                {profile.tier === "agent_featured" && (
                  <span className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full font-bold bg-purple-50 text-purple-700 border border-purple-200">
                    <Star className="w-3 h-3 fill-purple-500" /> Featured Agent
                  </span>
                )}
                {profile.tier === "agent_listing" && (
                  <span className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    <BadgeCheck className="w-3 h-3" /> Verified Agent
                  </span>
                )}
                {profile.verified && !profile.tier && (
                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-semibold border border-accent/20">
                    <BadgeCheck className="w-3 h-3" /> Verified
                  </span>
                )}
                {!profile.verified && (
                  <span
                    className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full bg-muted text-muted-foreground font-semibold border border-border"
                    title="This agent hasn't submitted a credential for admin review yet"
                  >
                    Unverified — no credential on file
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {profile.country}
                </span>
                <span className="flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5" />
                  {profile.yearsExperience} yr{profile.yearsExperience !== 1 ? "s" : ""} experience
                </span>
                <span className="flex items-center gap-1">
                  <Languages className="w-3.5 h-3.5" />
                  {profile.languages.slice(0, 3).join(", ")}
                </span>
                {reviewCount > 0 && (
                  <span className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    {avgRating.toFixed(1)} ({reviewCount} review{reviewCount !== 1 ? "s" : ""})
                  </span>
                )}
              </div>
            </div>
          </div>

          <p className="text-sm text-foreground leading-relaxed mb-5">{profile.bio}</p>

          {/* Credentials */}
          {hasCredentials && (
            <div className="mb-5 rounded-xl border border-border bg-muted/40 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                Professional credentials
              </p>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  {profile.credentialType && (
                    <p className="text-xs font-semibold text-foreground">{profile.credentialType}</p>
                  )}
                  {profile.credentialNumber && (
                    <p className="text-xs text-muted-foreground mt-0.5">Ref: {profile.credentialNumber}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {profile.credentialVerifyUrl ? (
                    <>
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 font-semibold dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                        <ShieldCheck className="w-3 h-3" /> Verifiable
                      </span>
                      <a
                        href={profile.credentialVerifyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline cursor-pointer"
                      >
                        Verify <ExternalLink className="w-3 h-3" />
                      </a>
                    </>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-semibold dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
                      <ShieldAlert className="w-3 h-3" /> Not independently verified
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Specialisations */}
          <div className="mb-5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Specialisations</p>
            <div className="flex flex-wrap gap-1.5">
              {profile.specialisations.map((s) => (
                <span key={s} className="text-xs px-2.5 py-1 rounded-full bg-primary/8 text-primary font-medium border border-primary/15">
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Destinations */}
          {profile.destinations && profile.destinations.length > 0 && (
            <div className="mb-5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Destinations covered</p>
              <div className="flex flex-wrap gap-1.5">
                {profile.destinations.map((d) => (
                  <span key={d} className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground font-medium border border-border">
                    {d}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Languages full list */}
          {profile.languages.length > 0 && (
            <div className="mb-5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Languages</p>
              <div className="flex flex-wrap gap-1.5">
                {profile.languages.map((l) => (
                  <span key={l} className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground font-medium border border-border">
                    {l}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          {contacted ? (
            // Authenticated: enquiry confirmed
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-accent/10 border border-accent/20">
              <Check className="w-4 h-4 text-accent" />
              <span className="text-sm font-semibold text-accent">Enquiry sent — the agent will be in touch.</span>
            </div>
          ) : isAuthenticated ? (
            // Authenticated: existing contact form (unchanged)
            <div className="space-y-3">
              <EmailVerificationBanner />
              {showMessageBox && (
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Optional: briefly describe your visa situation…"
                  maxLength={2000}
                  className="w-full px-4 py-3 text-sm rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring min-h-[100px] resize-none"
                />
              )}
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    if (!showMessageBox) { setShowMessageBox(true); return; }
                    void handleContact();
                  }}
                  disabled={sending}
                  className="flex-1 cursor-pointer"
                >
                  {sending ? "Sending…" : showMessageBox ? "Send Enquiry" : "Contact Agent"}
                </Button>
                {showMessageBox && (
                  <Button
                    variant="outline"
                    onClick={() => { setShowMessageBox(false); setMessage(""); }}
                    className="cursor-pointer"
                  >
                    Cancel
                  </Button>
                )}
                {whatsappHref && (
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#25D366]/30 bg-[#25D366]/10 text-xs font-semibold text-[#1f9e54] hover:bg-[#25D366]/20 transition-colors cursor-pointer"
                    title="Message on WhatsApp"
                  >
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp
                  </a>
                )}
                {profile.phone && (
                  <a
                    href={`tel:${profile.phone}`}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors cursor-pointer"
                    title="Call"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          ) : guestSent ? (
            // Guest: post-submission — contact revealed + account prompt
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-accent/10 border border-accent/20">
                <Check className="w-4 h-4 text-accent" />
                <span className="text-sm font-semibold text-accent">
                  Enquiry sent — {profile.fullName} will be in touch.
                </span>
              </div>
              {(whatsappHref || profile.phone) && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                    Contact directly
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {whatsappHref && (
                      <a
                        href={whatsappHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#25D366]/30 bg-[#25D366]/10 text-xs font-semibold text-[#1f9e54] hover:bg-[#25D366]/20 transition-colors cursor-pointer"
                        title="Message on WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                        WhatsApp
                      </a>
                    )}
                    {profile.phone && (
                      <a
                        href={`tel:${profile.phone}`}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors cursor-pointer"
                        title="Call"
                      >
                        <Phone className="w-4 h-4 mr-1" />
                        {profile.phone}
                      </a>
                    )}
                  </div>
                </div>
              )}
              <div className="rounded-xl bg-primary/5 border border-primary/15 p-4">
                <p className="text-xs font-medium text-muted-foreground leading-relaxed mb-3">
                  Create a free account to track this enquiry, get notified when {profile.fullName} responds,
                  and manage all your visa documents in one place.
                </p>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    onClick={() => navigate(`/login?returnTo=/agents/profile/${profileId}`)}
                    className="cursor-pointer text-xs"
                  >
                    Create free account
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/login?returnTo=/agents/profile/${profileId}`)}
                    className="cursor-pointer text-xs"
                  >
                    Sign in
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            // Guest: enquiry form (name + email + optional message)
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground block mb-1">
                    Your name
                  </label>
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Your name"
                    maxLength={200}
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground block mb-1">
                    Email address
                  </label>
                  <input
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="you@email.com"
                    maxLength={254}
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Optional: briefly describe your visa situation…"
                maxLength={2000}
                className="w-full px-4 py-3 text-sm rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring min-h-[90px] resize-none"
              />
              <Button
                onClick={() => void handleGuestContact()}
                disabled={guestSending}
                className="w-full cursor-pointer"
              >
                {guestSending ? "Sending…" : "Send Enquiry"}
              </Button>
              <p className="text-center text-[11px] text-muted-foreground">
                Already have an account?{" "}
                <button
                  onClick={() => navigate(`/login?returnTo=/agents/profile/${profileId}`)}
                  className="font-semibold text-accent hover:underline cursor-pointer"
                >
                  Sign in
                </button>
              </p>
            </div>
          )}
        </div>

        {/* Reviews section */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-serif text-base font-semibold text-primary">Client Reviews</h2>
              {reviewCount > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {avgRating.toFixed(1)} out of 5 · {reviewCount} review{reviewCount !== 1 ? "s" : ""}
                </p>
              )}
            </div>
            {isAuthenticated && !myReview && !showReviewForm && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowReviewForm(true)}
                className="cursor-pointer text-xs"
              >
                Write a review
              </Button>
            )}
          </div>

          {/* Write a review form */}
          {showReviewForm && (
            <div className="rounded-xl border border-border bg-muted/30 p-4 mb-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">Your review</p>
                <button
                  onClick={() => { setShowReviewForm(false); setReviewStars(0); setReviewComment(""); }}
                  className="text-muted-foreground hover:text-primary cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <StarPicker value={reviewStars} onChange={setReviewStars} />
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Optional: describe your experience with this agent…"
                maxLength={500}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px] resize-none"
              />
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] text-muted-foreground">Reviews are published after admin approval.</p>
                <Button
                  size="sm"
                  disabled={reviewSubmitting || reviewStars < 1}
                  onClick={() => void handleSubmitReview()}
                  className="cursor-pointer"
                >
                  {reviewSubmitting ? "Submitting…" : "Submit review"}
                </Button>
              </div>
            </div>
          )}

          {/* Already reviewed */}
          {myReview && (
            <div className="rounded-xl border border-border bg-muted/30 p-4 mb-4">
              <p className="text-xs font-semibold text-muted-foreground mb-1">Your review</p>
              <div className="flex gap-0.5 mb-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star key={n} className={cn("w-3.5 h-3.5", n <= myReview.starRating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
                ))}
              </div>
              {myReview.comment && <p className="text-sm text-foreground">{myReview.comment}</p>}
              <p className="text-[11px] text-muted-foreground mt-1">
                {myReview.status === "pending" ? "Pending approval" : myReview.status === "approved" ? "Published" : "Not published"}
              </p>
            </div>
          )}

          {/* Approved reviews list */}
          {approvedReviews && approvedReviews.length > 0 ? (
            <div className="space-y-3">
              {approvedReviews.map((review) => (
                <div key={review._id} className="border-b border-border/50 pb-3 last:border-b-0 last:pb-0">
                  <div className="flex gap-0.5 mb-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} className={cn("w-3.5 h-3.5", n <= review.starRating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
                    ))}
                  </div>
                  {review.comment && <p className="text-sm text-foreground leading-relaxed">{review.comment}</p>}
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {new Date(review.createdAt).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
                  </p>
                </div>
              ))}
            </div>
          ) : approvedReviews !== undefined ? (
            <p className="text-sm text-muted-foreground">
              {reviewCount === 0
                ? "No reviews yet."
                : "No approved reviews yet."}
              {isAuthenticated && !myReview && !showReviewForm && (
                <button
                  onClick={() => setShowReviewForm(true)}
                  className="ml-1 font-semibold text-accent hover:underline cursor-pointer"
                >
                  Be the first.
                </button>
              )}
              {!isAuthenticated && (
                <button
                  onClick={() => navigate(`/login?returnTo=/agents/profile/${profileId}`)}
                  className="ml-1 font-semibold text-accent hover:underline cursor-pointer"
                >
                  Sign in to leave a review.
                </button>
              )}
            </p>
          ) : null}
        </div>

        {/* Checklist CTA */}
        <div className="bg-primary/5 border border-primary/15 rounded-2xl p-5">
          <p className="text-sm font-semibold text-primary mb-1">Not sure which visa you need?</p>
          <p className="text-xs text-muted-foreground mb-3">
            Generate a personalised visa checklist for your route — then share it with this agent to start your case.
          </p>
          <button
            onClick={() => navigate("/checklist")}
            className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline cursor-pointer"
          >
            Build my visa checklist <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Report section */}
        <div className="pb-2">
          {reportSent ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border">
              <Check className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Report submitted. Our team will review it.</p>
            </div>
          ) : showReportForm ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">Report this profile</p>
                <button
                  onClick={() => { setShowReportForm(false); setReportReason(""); setReportDetails(""); }}
                  className="text-muted-foreground hover:text-primary cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-1.5">
                {REPORT_REASONS.map((r) => (
                  <label key={r.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="reportReason"
                      value={r.value}
                      checked={reportReason === r.value}
                      onChange={() => setReportReason(r.value)}
                      className="accent-destructive"
                    />
                    <span className="text-sm text-foreground">{r.label}</span>
                  </label>
                ))}
              </div>
              <textarea
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="Additional details (optional)…"
                maxLength={1000}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring min-h-[70px] resize-none"
              />
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] text-muted-foreground">Reports are reviewed by our team privately.</p>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={reportSubmitting || !reportReason}
                  onClick={() => void handleReport()}
                  className="cursor-pointer"
                >
                  {reportSubmitting ? "Submitting…" : "Submit report"}
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowReportForm(true)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors cursor-pointer"
            >
              <Flag className="w-3 h-3" /> Report this profile
            </button>
          )}
        </div>

      </main>
    </div>
  );
}
