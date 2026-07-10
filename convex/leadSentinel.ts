import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

const STALE_LEAD_HOURS = 48;
const MAX_LEADS_PER_RUN = 10;
const MAX_NOTIFICATIONS_PER_LEAD = 5;

// Called by the daily cron at 10:00 AM UTC.
// Finds open leads older than 48h with zero unlocks and no prior sentinel notice,
// then notifies up to 5 matching verified agents via in-app notifications.
export const checkStaleLeads = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = new Date(Date.now() - STALE_LEAD_HOURS * 60 * 60 * 1000).toISOString();

    // Pull a bounded set of open leads — ordered by creation time ascending
    // so the oldest get notified first.
    const openLeads = await ctx.db
      .query("marketplace_leads")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .order("asc")
      .take(100);

    // Filter: older than 48h and not yet sentinel-notified
    const stale = openLeads
      .filter((l) => l.createdAt < cutoff && !l.sentinelNotifiedAt)
      .slice(0, MAX_LEADS_PER_RUN);

    if (stale.length === 0) return;

    // Load all verified agent profiles once — avoid N+1 per lead
    const verifiedProfiles = await ctx.db
      .query("agent_profiles")
      .withIndex("by_verified", (q) => q.eq("verified", true))
      .take(200);

    const now = new Date().toISOString();

    for (const lead of stale) {
      // Check if this lead already has any unlocks — if so, skip it
      const firstUnlock = await ctx.db
        .query("marketplace_lead_unlocks")
        .withIndex("by_lead", (q) => q.eq("leadId", lead._id))
        .first();
      if (firstUnlock !== null) {
        // Has unlocks — mark it notified so we don't check it again
        await ctx.db.patch(lead._id, { sentinelNotifiedAt: now });
        continue;
      }

      // Find agents who specialise in this lead's visa type
      const matching = verifiedProfiles
        .filter(
          (p) =>
            p.userId !== lead.userId &&
            p.specialisations.some(
              (s) =>
                s.toLowerCase().includes(lead.visaType.toLowerCase()) ||
                lead.visaType.toLowerCase().includes(s.toLowerCase()),
            ),
        )
        .slice(0, MAX_NOTIFICATIONS_PER_LEAD);

      // If no specialisation match, notify agents who serve this destination
      const candidates =
        matching.length > 0
          ? matching
          : verifiedProfiles
              .filter(
                (p) =>
                  p.userId !== lead.userId &&
                  (!p.destinations ||
                    p.destinations.length === 0 ||
                    p.destinations.some(
                      (d) =>
                        d.toLowerCase() === lead.destinationCountry.toLowerCase(),
                    )),
              )
              .slice(0, MAX_NOTIFICATIONS_PER_LEAD);

      for (const profile of candidates) {
        const user = await ctx.db.get(profile.userId);
        // Only notify users who still exist and have an active agent plan
        if (!user?.agentPlan) continue;

        await ctx.db.insert("in_app_notifications", {
          userId: profile.userId,
          type: "marketplace_lead_alert",
          title: `New lead: ${lead.visaType} → ${lead.destinationCountry}`,
          body: `A ${lead.urgencyLevel} lead has been open for 48+ hours with no agent contact. Be the first to reach out.`,
          linkTo: "/agents/marketplace-leads",
          read: false,
          createdAt: now,
        });
      }

      // Mark this lead as sentinel-notified so it won't trigger again tomorrow
      await ctx.db.patch(lead._id, { sentinelNotifiedAt: now });
    }
  },
});
