"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

// ─── Invite-your-next-hire nudge ──────────────────────────────────────────────
// Runs weekly. Inviting more people has always been open-ended (up to the
// 500-member cap) but nothing ever encouraged a return visit to actually do
// it — an org that invited 3 people in its first week and never came back
// had no signal telling them the door was still open. Warns admins whose org
// has gone 30+ days without a new invite, via email + in-app notification.
export const dispatchOrgInviteNudges = internalAction({
  args: {},
  handler: async (ctx): Promise<void> => {
    const targets = await ctx.runQuery(internal.organizations.internalListOrgsNeedingInviteNudge, {});

    await Promise.allSettled(
      targets.map(async (target) => {
        try {
          await ctx.runMutation(internal.notifications.createOrgAdminNotification, {
            organizationId: target.organizationId,
            type: "org_invite_reminder",
            title: "Invite your next hire",
            body: `It's been a while since ${target.orgName} last invited someone to VisaClear. Whenever you're ready, sending a new invite takes under a minute.`,
            linkTo: "/business/dashboard",
          });

          await ctx.runAction(internal.emails.orgInviteNudge.sendOrgInviteNudgeEmail, {
            to: target.adminEmail,
            name: target.adminName,
            orgName: target.orgName,
            orgType: target.orgType,
          });

          await ctx.runMutation(internal.organizations.internalMarkInviteNudgeSent, {
            organizationId: target.organizationId,
          });
        } catch (err) {
          console.error(`Failed to send invite nudge for org ${target.organizationId}`, err);
        }
      }),
    );
  },
});
