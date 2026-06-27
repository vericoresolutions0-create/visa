"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { getDataFreshness } from "../src/lib/visa-data.ts";
import { sendEmail } from "./emails/sendEmail.ts";
import { STALE_THRESHOLD_DAYS } from "./dataFreshness.ts";

function daysSince(dateStr: string): number {
  const then = new Date(dateStr).getTime();
  return Math.floor((Date.now() - then) / (24 * 60 * 60 * 1000));
}

// Weekly cron — emails every admin a digest only when something is
// actually overdue, rather than a noisy email every week regardless.
export const sendStaleDataDigest = internalAction({
  args: {},
  handler: async (ctx) => {
    const stale = getDataFreshness()
      .map((row) => ({ ...row, daysSinceVerified: daysSince(row.lastVerified) }))
      .filter((row) => row.daysSinceVerified >= STALE_THRESHOLD_DAYS)
      .sort((a, b) => b.daysSinceVerified - a.daysSinceVerified);

    if (stale.length === 0) return;

    const adminEmails: string[] = await ctx.runQuery(internal.dataFreshness.getAdminEmails, {});
    const rows = stale
      .map(
        (row) =>
          `<tr><td style="padding:4px 12px">${row.destination}</td><td style="padding:4px 12px">${row.lastVerified}</td><td style="padding:4px 12px">${row.daysSinceVerified} days ago</td></tr>`,
      )
      .join("");
    const html = `<p>${stale.length} destination${stale.length === 1 ? "" : "s"} ${stale.length === 1 ? "has" : "have"} not been re-verified in ${STALE_THRESHOLD_DAYS}+ days:</p><table>${rows}</table>`;

    for (const email of adminEmails) {
      await sendEmail({
        to: email,
        subject: `VisaClear: ${stale.length} checklist${stale.length === 1 ? "" : "s"} need${stale.length === 1 ? "s" : ""} re-verification`,
        html,
      });
    }
  },
});
