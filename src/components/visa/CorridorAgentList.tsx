import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Star, Award, Users, ArrowRight, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

interface Props {
  destination: string;
  specialisation?: string;
}

const TIER_LABELS: Record<string, string> = {
  agent_featured: "Featured",
  agent_listing: "Listed",
  agency_white_label: "Agency",
};

const TIER_COLORS: Record<string, string> = {
  agent_featured: "text-amber-600 dark:text-amber-400",
  agent_listing: "text-blue-600 dark:text-blue-400",
  agency_white_label: "text-purple-600 dark:text-purple-400",
};

export function CorridorAgentList({ destination, specialisation }: Props) {
  const agents = useQuery(api.visaCorridors.getPublicAgentsForCorridor, {
    destination,
    specialisation,
  });

  if (agents === undefined) {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="rounded-xl border border-border/50 bg-muted/30 p-6 text-center">
        <Users className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">No verified agents for this corridor yet.</p>
        <Link
          to="/agents"
          className="mt-3 inline-block text-sm text-primary font-medium hover:underline"
        >
          Browse all agents →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {agents.map((agent) => (
        <Link
          key={agent.id}
          to={`/agents/${agent.id}`}
          className="group flex items-center gap-4 rounded-xl border border-border/60 bg-card p-4 transition-all hover:border-primary/40 hover:shadow-sm"
        >
          {/* Avatar */}
          <div className="h-11 w-11 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 text-primary font-semibold text-sm">
            {agent.fullName.charAt(0).toUpperCase()}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-foreground truncate">{agent.fullName}</span>
              {agent.tier && agent.tier !== "agent_listing" && (
                <span className={`text-xs font-medium ${TIER_COLORS[agent.tier] ?? "text-muted-foreground"}`}>
                  {TIER_LABELS[agent.tier] ?? agent.tier}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              <span className="text-xs text-muted-foreground">{agent.country}</span>
              {agent.yearsExperience && (
                <span className="text-xs text-muted-foreground">{agent.yearsExperience}yr exp</span>
              )}
              {agent.specialisations && agent.specialisations.length > 0 && (
                <span className="text-xs text-muted-foreground hidden sm:block truncate max-w-[200px]">
                  {agent.specialisations.slice(0, 2).join(" · ")}
                </span>
              )}
            </div>
          </div>

          {/* Rating */}
          <div className="shrink-0 flex flex-col items-end gap-1">
            {agent.rating != null ? (
              <div className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span className="text-sm font-semibold text-foreground">{agent.rating.toFixed(1)}</span>
                {agent.reviewCount != null && (
                  <span className="text-xs text-muted-foreground">({agent.reviewCount})</span>
                )}
              </div>
            ) : null}
            {agent.tier === "agent_featured" && (
              <Award className="h-3.5 w-3.5 text-amber-500" />
            )}
          </div>

          <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
        </Link>
      ))}

      <Link
        to="/agents"
        className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-3 text-sm text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors"
      >
        View all verified agents <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
