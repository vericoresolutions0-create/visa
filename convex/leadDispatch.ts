"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

// ─── Immediate new-lead alert ──────────────────────────────────────────────────
// Scheduled right at lead creation (marketplace.ts submitLead and
// submitLeadFromRejectionAnalysis). Previously the only alert was
// leadSentinel.ts's cron, which only fires after a lead has sat open 48h —
// nothing told a matching agent the moment a lead they could actually take
// was created. Reuses the same matching logic as that 48h nudge
// (marketplace.ts findMatchingVerifiedAgents) — same "who should hear about
// this lead" answer, just triggered immediately instead of on a schedule.
export const dispatchImmediateLeadAlert = internalAction({
  args: { leadId: v.id("marketplace_leads") },
  handler: async (ctx, args): Promise<void> => {
    const lead = await ctx.runQuery(internal.marketplace.getLeadForAlert, {
      leadId: args.leadId,
    });
    if (!lead) return;

    const candidates = await ctx.runQuery(internal.marketplace.findMatchingVerifiedAgents, {
      leadId: args.leadId,
    });

    await Promise.allSettled(
      candidates.map(async (profile) => {
        try {
          await ctx.runMutation(internal.notifications.createAgentNotification, {
            userId: profile.userId,
            type: "marketplace_lead_alert",
            title: `New lead: ${lead.visaType} → ${lead.destinationCountry}`,
            body: `A new ${lead.urgencyLevel} lead just came in matching your specialisation. Be the first to reach out.`,
            linkTo: "/agents/marketplace-leads",
          });
        } catch (err) {
          console.error(`Failed to send immediate lead alert to agent ${profile.userId}`, err);
        }
      }),
    );
  },
});
