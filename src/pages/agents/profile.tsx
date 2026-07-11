import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.js";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { useSeo } from "@/hooks/use-seo.ts";
import { useSmartBack } from "@/hooks/use-smart-back.ts";
import { cn } from "@/lib/utils.ts";
import {
  ArrowLeft, MapPin, Briefcase, Languages, Check, MessageCircle,
  Phone, BadgeCheck, Star, Globe, ChevronRight, Gem,
} from "lucide-react";

function toWhatsAppNumber(phone: string): string {
  return phone.replace(/[^\d]/g, "");
}

export default function AgentProfilePage() {
  const { profileId } = useParams<{ profileId: string }>();
  const navigate = useNavigate();
  const goBack = useSmartBack("/agents");
  const { isAuthenticated } = useConvexAuth();

  const profile = useQuery(
    api.agents.getAgentPublicProfile,
    profileId ? { profileId } : "skip",
  );
  const contactAgent = useMutation(api.agents.contactAgent);
  const [contacted, setContacted] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [showMessageBox, setShowMessageBox] = useState(false);

  useSeo({
    title: profile ? `${profile.fullName} — VisaClear Agent` : "Agent Profile — VisaClear",
    description: profile ? profile.bio.slice(0, 160) : "Find a verified visa consultant on VisaClear.",
  });

  const handleContact = async () => {
    if (!isAuthenticated) {
      toast.info("Sign in to contact this agent");
      navigate("/login");
      return;
    }
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
      if (err instanceof ConvexError) {
        toast.error((err.data as { message: string }).message);
      } else {
        toast.error("Could not send enquiry. Try again.");
      }
    } finally {
      setSending(false);
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
              </div>
            </div>
          </div>

          <p className="text-sm text-foreground leading-relaxed mb-5">{profile.bio}</p>

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
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-accent/10 border border-accent/20">
              <Check className="w-4 h-4 text-accent" />
              <span className="text-sm font-semibold text-accent">Enquiry sent — the agent will be in touch.</span>
            </div>
          ) : (
            <div className="space-y-3">
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
                  {sending
                    ? "Sending…"
                    : showMessageBox
                    ? "Send Enquiry"
                    : isAuthenticated
                    ? "Contact Agent"
                    : "Sign in to Contact"}
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
          )}
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

      </main>
    </div>
  );
}
