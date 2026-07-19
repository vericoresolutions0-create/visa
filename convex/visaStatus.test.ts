/// <reference types="vite/client" />
// Tests the real ILR document readiness checklist — replaces what used to
// be hardcoded placeholder data (a passport row that always said "Ready",
// a fixed 28% progress bar, etc.) with genuine server-computed state
// derived from what the user actually confirmed. Every number here should
// be traceable to real stored data, never a constant.
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function seedUser(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => ctx.db.insert("users", { email: `user-${Math.random()}@example.com` }));
}

describe("visaStatus.getDocumentReadiness — no fake data", () => {
  test("returns null when the user has no active visa yet", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t);

    const readiness = await t.withIdentity({ subject: userId }).query(api.visaStatus.getDocumentReadiness, {});
    expect(readiness).toBeNull();
  });

  test("a fresh visa with nothing confirmed yet reports genuinely not-ready, not a fake 28%", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t);
    await t.withIdentity({ subject: userId }).mutation(api.visaStatus.setVisaStatus, {
      jurisdiction: "uk_ilr",
      visaType: "Skilled Worker",
      hostCountry: "United Kingdom",
      grantDate: new Date().toISOString().slice(0, 10),
      expiryDate: "2099-01-01",
    });

    const readiness = await t.withIdentity({ subject: userId }).query(api.visaStatus.getDocumentReadiness, {});
    expect(readiness).not.toBeNull();
    expect(readiness!.overallPercent).toBe(0); // nothing confirmed, so genuinely 0% — not a hardcoded 28%
    expect(readiness!.items.every((i) => !i.ready)).toBe(true);
  });

  test("passport readiness is a real date comparison against ILR-eligible-date + 6 months", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t);
    await t.withIdentity({ subject: userId }).mutation(api.visaStatus.setVisaStatus, {
      jurisdiction: "uk_ilr",
      visaType: "Skilled Worker",
      hostCountry: "United Kingdom",
      grantDate: "2023-01-01", // ILR eligible 2028-01-01, needs to be valid until 2028-07-01
      expiryDate: "2099-01-01",
    });

    // Expires too early — not ready.
    await t.withIdentity({ subject: userId }).mutation(api.visaStatus.updateDocumentChecklist, {
      passportExpiryDate: "2028-03-01",
    });
    let readiness = await t.withIdentity({ subject: userId }).query(api.visaStatus.getDocumentReadiness, {});
    expect(readiness!.items.find((i) => i.key === "passport")!.ready).toBe(false);

    // Expires comfortably after the required date — ready.
    await t.withIdentity({ subject: userId }).mutation(api.visaStatus.updateDocumentChecklist, {
      passportExpiryDate: "2029-01-01",
    });
    readiness = await t.withIdentity({ subject: userId }).query(api.visaStatus.getDocumentReadiness, {});
    expect(readiness!.items.find((i) => i.key === "passport")!.ready).toBe(true);
  });

  test("employment records show real partial credit, and only count years that have actually happened", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t);
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
    await t.withIdentity({ subject: userId }).mutation(api.visaStatus.setVisaStatus, {
      jurisdiction: "uk_ilr",
      visaType: "Skilled Worker",
      hostCountry: "United Kingdom",
      grantDate: threeYearsAgo.toISOString().slice(0, 10),
      expiryDate: "2099-01-01",
    });

    // Confirm years 1 and 2 — but also try to sneak in year 5, which
    // hasn't happened yet (only ~3 years have elapsed) — must not count.
    await t.withIdentity({ subject: userId }).mutation(api.visaStatus.updateDocumentChecklist, {
      employmentRecordsConfirmedYears: [1, 2, 5],
    });

    const readiness = await t.withIdentity({ subject: userId }).query(api.visaStatus.getDocumentReadiness, {});
    const employment = readiness!.items.find((i) => i.key === "employment")!;
    expect(employment.ready).toBe(false); // only 2 of ~3 confirmed
    expect(employment.percent).toBeLessThan(100);
    expect(employment.percent).toBeGreaterThan(0);
  });

  test("travel log, Life in the UK test, and English qualification all require an explicit confirmation, not an inference", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t);
    await t.withIdentity({ subject: userId }).mutation(api.visaStatus.setVisaStatus, {
      jurisdiction: "uk_ilr",
      visaType: "Skilled Worker",
      hostCountry: "United Kingdom",
      grantDate: new Date().toISOString().slice(0, 10),
      expiryDate: "2099-01-01",
    });

    let readiness = await t.withIdentity({ subject: userId }).query(api.visaStatus.getDocumentReadiness, {});
    expect(readiness!.items.find((i) => i.key === "travelLog")!.ready).toBe(false);
    expect(readiness!.items.find((i) => i.key === "lifeInUk")!.ready).toBe(false);
    expect(readiness!.items.find((i) => i.key === "english")!.ready).toBe(false);

    await t.withIdentity({ subject: userId }).mutation(api.visaStatus.updateDocumentChecklist, {
      travelLogConfirmedComplete: true,
      lifeInUkTestTaken: true,
      lifeInUkTestDate: "2024-06-01",
      englishQualificationConfirmed: true,
      englishQualificationType: "IELTS",
    });

    readiness = await t.withIdentity({ subject: userId }).query(api.visaStatus.getDocumentReadiness, {});
    expect(readiness!.items.find((i) => i.key === "travelLog")!.ready).toBe(true);
    const lifeInUk = readiness!.items.find((i) => i.key === "lifeInUk")!;
    expect(lifeInUk.ready).toBe(true);
    expect(lifeInUk.detail).toContain("2024-06-01");
    const english = readiness!.items.find((i) => i.key === "english")!;
    expect(english.ready).toBe(true);
    expect(english.detail).toBe("IELTS");
  });

  test("all 5 items confirmed genuinely produces 100%, not a coincidence", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t);
    const sixYearsAgo = new Date();
    sixYearsAgo.setFullYear(sixYearsAgo.getFullYear() - 6);
    await t.withIdentity({ subject: userId }).mutation(api.visaStatus.setVisaStatus, {
      jurisdiction: "uk_ilr",
      visaType: "Skilled Worker",
      hostCountry: "United Kingdom",
      grantDate: sixYearsAgo.toISOString().slice(0, 10),
      expiryDate: "2099-01-01",
    });

    await t.withIdentity({ subject: userId }).mutation(api.visaStatus.updateDocumentChecklist, {
      passportExpiryDate: "2099-01-01",
      employmentRecordsConfirmedYears: [1, 2, 3, 4, 5],
      travelLogConfirmedComplete: true,
      lifeInUkTestTaken: true,
      englishQualificationConfirmed: true,
    });

    const readiness = await t.withIdentity({ subject: userId }).query(api.visaStatus.getDocumentReadiness, {});
    expect(readiness!.overallPercent).toBe(100);
  });

  test("a partial update never clobbers fields it didn't touch", async () => {
    // Regression-style guard for the exact bug class fixed elsewhere this
    // session: patching with only the fields explicitly present in args,
    // never blanking siblings by omission.
    const t = convexTest(schema, modules);
    const userId = await seedUser(t);
    await t.withIdentity({ subject: userId }).mutation(api.visaStatus.setVisaStatus, {
      jurisdiction: "uk_ilr",
      visaType: "Skilled Worker",
      hostCountry: "United Kingdom",
      grantDate: new Date().toISOString().slice(0, 10),
      expiryDate: "2099-01-01",
    });

    await t.withIdentity({ subject: userId }).mutation(api.visaStatus.updateDocumentChecklist, {
      passportExpiryDate: "2099-01-01",
    });
    await t.withIdentity({ subject: userId }).mutation(api.visaStatus.updateDocumentChecklist, {
      lifeInUkTestTaken: true,
    });

    const readiness = await t.withIdentity({ subject: userId }).query(api.visaStatus.getDocumentReadiness, {});
    // Both survive — the second call didn't erase the first's field.
    expect(readiness!.items.find((i) => i.key === "passport")!.ready).toBe(true);
    expect(readiness!.items.find((i) => i.key === "lifeInUk")!.ready).toBe(true);
  });

  test("rejects an invalid qualifying year and a duplicate year", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t);
    await t.withIdentity({ subject: userId }).mutation(api.visaStatus.setVisaStatus, {
      jurisdiction: "uk_ilr",
      visaType: "Skilled Worker",
      hostCountry: "United Kingdom",
      grantDate: new Date().toISOString().slice(0, 10),
      expiryDate: "2099-01-01",
    });

    await expect(
      t.withIdentity({ subject: userId }).mutation(api.visaStatus.updateDocumentChecklist, {
        employmentRecordsConfirmedYears: [1, 6], // 6 is out of range
      }),
    ).rejects.toThrow();

    await expect(
      t.withIdentity({ subject: userId }).mutation(api.visaStatus.updateDocumentChecklist, {
        employmentRecordsConfirmedYears: [1, 1], // duplicate
      }),
    ).rejects.toThrow();
  });

  test("cannot save a checklist before a visa exists", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t);

    await expect(
      t.withIdentity({ subject: userId }).mutation(api.visaStatus.updateDocumentChecklist, {
        lifeInUkTestTaken: true,
      }),
    ).rejects.toThrow();
  });
});
