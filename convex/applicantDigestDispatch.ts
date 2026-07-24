"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

// ─── Weekly applicant re-engagement digest ────────────────────────────────────
// Runs weekly. Admins already get an equivalent freshness digest
// (dataFreshnessDigest.ts) — applicants had nothing pulling them back
// between visits. Reuses the existing hardened email-retry infra
// (sendEmail.ts) rather than any new plumbing. Per the founder's explicit
// rule from the original mockup: skip sending entirely when there's
// nothing real to report that week — buildDigestForUser returns null in
// that case, never a filler "nothing new!" email.
export const sendApplicantDigest = internalAction({
  args: {},
  handler: async (ctx): Promise<void> => {
    const users = await ctx.runQuery(internal.applicantDigest.getPaidUserIdsForDigest, {});

    await Promise.allSettled(
      users.map(async (user) => {
        try {
          if (!user.email) return;
          const digest = await ctx.runQuery(internal.applicantDigest.buildDigestForUser, { userId: user.userId });
          if (!digest) return;

          await ctx.runAction(internal.emails.applicantDigest.sendApplicantDigestEmail, {
            to: user.email,
            name: user.name ?? "there",
            expiringDocs: digest.expiringDocs,
            staleChecklists: digest.staleChecklists,
            embassyUpdates: digest.embassyUpdates,
          });
        } catch (err) {
          console.error(`Failed to send applicant digest for user ${user.userId}`, err);
        }
      }),
    );
  },
});
