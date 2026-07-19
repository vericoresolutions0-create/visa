/// <reference types="vite/client" />
// Regression test for a real accuracy bug: getAbsenceSummary only ever
// computed a rolling-12-month total, which is the correct measure for
// "rolling_year" jurisdictions (UK ILR: no more than 180 days in any
// rolling 12-month period) but not for "eu_ltr" ones (Germany, France,
// Poland, etc.: no more than 6 consecutive months absent, OR 10 months
// total across the whole 5-year qualifying period — neither of which a
// rolling-12-month sum measures). The frontend was silently applying the
// wrong number against the EU threshold. This proves the two new fields
// (longestSingleTripDays, totalDaysSinceGrant) are computed correctly,
// and that the original rolling-window field is untouched.
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function seedUser(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => ctx.db.insert("users", { email: `user-${Math.random()}@example.com` }));
}

async function seedVisa(t: ReturnType<typeof convexTest>, userId: Awaited<ReturnType<typeof seedUser>>, grantDate: string) {
  await t.run(async (ctx) =>
    ctx.db.insert("visa_status", {
      userId,
      jurisdiction: "de_nbe",
      visaType: "Skilled Worker",
      hostCountry: "Germany",
      grantDate,
      expiryDate: "2099-01-01",
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
  );
}

async function seedTrip(
  t: ReturnType<typeof convexTest>,
  userId: Awaited<ReturnType<typeof seedUser>>,
  departureDate: string,
  returnDate: string,
) {
  const departure = new Date(departureDate + "T00:00:00Z");
  const back = new Date(returnDate + "T00:00:00Z");
  const daysAbsent = Math.round((back.getTime() - departure.getTime()) / (1000 * 60 * 60 * 24));
  await t.run(async (ctx) =>
    ctx.db.insert("travel_trips", {
      userId,
      destination: "Nigeria",
      departureDate,
      returnDate,
      daysAbsent,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
  );
}

describe("travelLog.getAbsenceSummary — EU total-since-grant and longest-single-trip", () => {
  test("totalDaysSinceGrant sums only trips on/after the grant date, clamping a straddling trip", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t);
    await seedVisa(t, userId, "2023-01-01");

    // Entirely before the grant date — must not count at all.
    await seedTrip(t, userId, "2022-06-01", "2022-06-20"); // 19 days, pre-grant
    // Straddles the grant date — only the post-grant portion counts.
    await seedTrip(t, userId, "2022-12-20", "2023-01-11"); // clamped: 2023-01-01 -> 2023-01-11 = 10 days
    // Entirely after — counts in full.
    await seedTrip(t, userId, "2023-06-01", "2023-06-31"); // 30 days

    const summary = await t.withIdentity({ subject: userId }).query(api.travelLog.getAbsenceSummary, {});
    expect(summary.totalDaysSinceGrant).toBe(10 + 30);
  });

  test("longestSingleTripDays picks the longest trip regardless of when it happened", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t);
    await seedVisa(t, userId, "2020-01-01");

    await seedTrip(t, userId, "2021-01-01", "2021-01-15"); // 14 days
    await seedTrip(t, userId, "2022-03-01", "2022-09-01"); // ~184 days — the long one
    await seedTrip(t, userId, "2023-05-01", "2023-05-10"); // 9 days

    const summary = await t.withIdentity({ subject: userId }).query(api.travelLog.getAbsenceSummary, {});
    expect(summary.longestSingleTripDays).toBeGreaterThanOrEqual(180);
    expect(summary.longestSingleTripDays).toBe(184);
  });

  test("totalDaysSinceGrant is null when there's no active visa record", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t);
    await seedTrip(t, userId, "2023-01-01", "2023-01-10");

    const summary = await t.withIdentity({ subject: userId }).query(api.travelLog.getAbsenceSummary, {});
    expect(summary.totalDaysSinceGrant).toBeNull();
  });

  test("the original rolling-12-month field is untouched by this change", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t);
    const today = new Date();
    const recentDeparture = new Date(today);
    recentDeparture.setDate(recentDeparture.getDate() - 30);
    const recentReturn = new Date(today);
    recentReturn.setDate(recentReturn.getDate() - 20);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);

    await seedTrip(t, userId, fmt(recentDeparture), fmt(recentReturn)); // 10 days, well within the last 12 months

    const summary = await t.withIdentity({ subject: userId }).query(api.travelLog.getAbsenceSummary, {});
    expect(summary.daysUsedThisWindow).toBe(10);
  });
});
