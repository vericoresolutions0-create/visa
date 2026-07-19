/// <reference types="vite/client" />
// Regression test for a real bug found during a founder-requested Quick
// Actions audit (2026-07-19): getRiskScoreResult used to throw NOT_FOUND
// for a bad/expired/deleted result id. Convex's useQuery throws that
// synchronously on read, and the result page has no local error boundary —
// so anyone opening an invalid shared risk-score link saw the app's generic
// crash screen instead of the friendly "this result no longer exists, take
// the quiz" UI the page was actually built to show (whose `result === null`
// branch was unreachable dead code as a result). Fixed by returning null
// instead of throwing, since a bad public-link lookup is an expected
// outcome, not an exceptional failure.
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

describe("riskScore.getRiskScoreResult — bad links resolve to null, never throw", () => {
  test("a well-formed but nonexistent result id returns null, not an error", async () => {
    const t = convexTest(schema, modules);
    const { resultId } = await t.mutation(api.riskScore.submitRiskScore, {
      destination: "Canada",
      visaType: "Express Entry",
      answers: { q1: "yes" },
    });
    // Delete it out from under the link, same as a stale/expired real link.
    await t.run(async (ctx) => ctx.db.delete(resultId));

    const result = await t.query(api.riskScore.getRiskScoreResult, { resultId });
    expect(result).toBeNull();
  });

  test("a real, existing result still returns the full computed result", async () => {
    const t = convexTest(schema, modules);
    const { resultId } = await t.mutation(api.riskScore.submitRiskScore, {
      destination: "United Kingdom",
      visaType: "Skilled Worker",
      answers: { q1: "yes", q2: "no" },
    });

    const result = await t.query(api.riskScore.getRiskScoreResult, { resultId });
    expect(result).not.toBeNull();
    expect(result!.destination).toBe("United Kingdom");
    expect(typeof result!.displayScore).toBe("number");
  });
});
