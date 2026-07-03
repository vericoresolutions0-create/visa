"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

const PAID_PLANS = ["pro", "expert"];

// ─── Document expiry alerts ───────────────────────────────────────────────────
// Runs daily. Finds vault documents expiring in exactly 30 or 7 days and
// sends an email + creates an in-app notification for the document owner,
// provided they are on a paid plan. Uses two separate day-offsets so each
// user gets at most one email per threshold per document.
export const dispatchDocumentExpiryAlerts = internalAction({
  args: {},
  handler: async (ctx): Promise<void> => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thresholds = [
      { days: 30, label: "30 days" },
      { days: 7, label: "7 days" },
    ];

    for (const { days, label } of thresholds) {
      const target = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);
      const targetDateStr = target.toISOString().split("T")[0];

      // Fetch all vault documents expiring on that exact date
      const docs = await ctx.runQuery(
        internal.notificationProcessor.getDocumentsExpiringOn,
        { expiryDate: targetDateStr },
      );

      await Promise.allSettled(
        docs.map(async (doc) => {
          try {
            const user = await ctx.runQuery(
              internal.notificationProcessor.getUserById,
              { userId: doc.userId },
            );
            if (!user || !PAID_PLANS.includes(user.plan ?? "")) return;

            const title = `Document expiring in ${label}: ${doc.label}`;
            const body = `Your "${doc.label}" expires on ${targetDateStr}. Renew it before your visa application deadline.`;

            // In-app notification
            await ctx.runMutation(internal.notifications.createNotification, {
              userId: doc.userId,
              type: "document_expiry",
              title,
              body,
              linkTo: "/dashboard/vault",
            });

            // Email
            await ctx.runAction(
              internal.emails.documentExpiry.sendDocumentExpiryEmail,
              {
                to: user.email ?? "",
                name: user.name ?? "there",
                documentLabel: doc.label,
                expiryDate: targetDateStr,
                daysRemaining: days,
              },
            );
          } catch (err) {
            console.error(
              `Failed to send expiry alert for doc ${doc._id}`,
              err,
            );
          }
        }),
      );
    }
  },
});

// ─── Trip deadline alerts ─────────────────────────────────────────────────────
// Runs daily. Finds saved checklists with a travelDate in exactly 7, 3, or 1
// day(s) and emails the owner + creates an in-app notification. Only fires for
// paid users; trips with no travelDate are silently skipped.
export const dispatchTripDeadlineAlerts = internalAction({
  args: {},
  handler: async (ctx): Promise<void> => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thresholds = [
      { days: 7, label: "7 days" },
      { days: 3, label: "3 days" },
      { days: 1, label: "tomorrow" },
    ];

    for (const { days, label } of thresholds) {
      const target = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);
      const targetDateStr = target.toISOString().split("T")[0];

      const trips = await ctx.runQuery(
        internal.notificationProcessor.getTripsWithTravelDate,
        { travelDate: targetDateStr },
      );

      await Promise.allSettled(
        trips.map(async (trip) => {
          try {
            const user = await ctx.runQuery(
              internal.notificationProcessor.getUserById,
              { userId: trip.userId },
            );
            if (!user || !PAID_PLANS.includes(user.plan ?? "")) return;

            const tripName =
              trip.tripName ??
              `${trip.origin} → ${trip.destination} (${trip.visaType})`;
            const title = `Travel date in ${label}: ${tripName}`;
            const body = `Your trip "${tripName}" is scheduled for ${targetDateStr}. Make sure your checklist is complete.`;

            await ctx.runMutation(internal.notifications.createNotification, {
              userId: trip.userId,
              type: "trip_deadline",
              title,
              body,
              linkTo: `/dashboard/trips/${trip._id}`,
            });

            await ctx.runAction(
              internal.emails.documentExpiry.sendTripDeadlineEmail,
              {
                to: user.email ?? "",
                name: user.name ?? "there",
                tripName,
                travelDate: targetDateStr,
                daysRemaining: days,
                progress: trip.progress,
              },
            );
          } catch (err) {
            console.error(
              `Failed to send trip deadline alert for trip ${trip._id}`,
              err,
            );
          }
        }),
      );
    }
  },
});
