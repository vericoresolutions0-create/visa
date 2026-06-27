import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { GraduationCap, Building2, Sparkles, ChevronRight } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import { getStoredPartnerSlug } from "@/hooks/use-partner-referral.ts";

const COPY_BY_TYPE = {
  university: {
    icon: GraduationCap,
    audience: "students",
    blurb: "preparing your visa documents the right way, before you ever apply",
  },
  agency: {
    icon: Building2,
    audience: "clients",
    blurb: "preparing your visa documents the right way, before you ever apply",
  },
  other: {
    icon: Sparkles,
    audience: "team",
    blurb: "preparing your visa documents the right way, before you ever apply",
  },
} as const;

// Renders nothing for the vast majority of visitors (no stored partner
// slug, or the slug doesn't match a real, currently-active partner) — this
// is a pure, additive enhancement that never alters the default homepage.
export function PartnerWelcomeBanner() {
  const navigate = useNavigate();
  const slug = getStoredPartnerSlug();
  const partner = useQuery(api.partners.getActivePartner, slug ? { slug } : "skip");

  if (!slug || !partner) return null;

  const copy = COPY_BY_TYPE[partner.partnerType];
  const Icon = copy.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-3xl mx-auto mb-10 rounded-2xl border border-accent/25 bg-gradient-to-br from-accent/8 via-card to-card px-6 py-5 sm:px-8 sm:py-6 shadow-sm"
    >
      <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-5 text-left">
        <div className="w-12 h-12 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
          <Icon className="w-6 h-6 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent mb-1">
            Made for {partner.name} {copy.audience}
          </p>
          <p className="text-base sm:text-lg font-semibold text-primary leading-snug">
            Welcome — let's get your visa documents right the first time.
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            A free resource for {partner.name} {copy.audience}: {copy.blurb}.
          </p>
        </div>
        <button
          onClick={() => navigate("/checklist")}
          className="shrink-0 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer whitespace-nowrap"
        >
          Start my checklist
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}
