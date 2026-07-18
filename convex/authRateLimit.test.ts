/// <reference types="vite/client" />
// Tests the brute-force guard on convex/auth.ts's signIn wrapper —
// convex/authRateLimit.ts checkAndRecordAuthAttempt. This is the only thing
// standing between a scripted password-guessing/signup-spam attack and the
// app; a silent regression here (e.g. the window/limit math drifting, or a
// flow key collision letting one flow's attempts count against another)
// reopens that hole with no visible symptom until it's exploited.
import { convexTest } from "convex-test";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

function newTest() {
  return convexTest(schema, modules);
}

describe("authRateLimit — checkAndRecordAuthAttempt", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  test("allows attempts under the per-flow limit", async () => {
    const t = newTest();
    // signIn's limit is 8 — the first 8 attempts must all succeed.
    for (let i = 0; i < 8; i++) {
      await t.mutation(internal.authRateLimit.checkAndRecordAuthAttempt, {
        email: "attacker@example.com",
        flow: "signIn",
      });
    }
  });

  test("blocks the attempt once the per-flow limit is reached", async () => {
    const t = newTest();
    for (let i = 0; i < 8; i++) {
      await t.mutation(internal.authRateLimit.checkAndRecordAuthAttempt, {
        email: "attacker@example.com",
        flow: "signIn",
      });
    }
    await expect(
      t.mutation(internal.authRateLimit.checkAndRecordAuthAttempt, {
        email: "attacker@example.com",
        flow: "signIn",
      }),
    ).rejects.toThrow();
  });

  test("signUp's tighter limit (5) is enforced independently of signIn's (8)", async () => {
    const t = newTest();
    for (let i = 0; i < 5; i++) {
      await t.mutation(internal.authRateLimit.checkAndRecordAuthAttempt, {
        email: "spammer@example.com",
        flow: "signUp",
      });
    }
    await expect(
      t.mutation(internal.authRateLimit.checkAndRecordAuthAttempt, {
        email: "spammer@example.com",
        flow: "signUp",
      }),
    ).rejects.toThrow();
  });

  test("a different email never shares another email's counter", async () => {
    const t = newTest();
    for (let i = 0; i < 8; i++) {
      await t.mutation(internal.authRateLimit.checkAndRecordAuthAttempt, {
        email: "victim-a@example.com",
        flow: "signIn",
      });
    }
    // A completely different email must not be blocked by victim-a's lockout.
    await t.mutation(internal.authRateLimit.checkAndRecordAuthAttempt, {
      email: "victim-b@example.com",
      flow: "signIn",
    });
  });

  test("a different flow on the same email does not share the counter", async () => {
    const t = newTest();
    for (let i = 0; i < 8; i++) {
      await t.mutation(internal.authRateLimit.checkAndRecordAuthAttempt, {
        email: "same-user@example.com",
        flow: "signIn",
      });
    }
    // signIn is now locked out for this email — reset (limit 5) must still
    // have its own independent budget, not inherit signIn's exhausted one.
    for (let i = 0; i < 5; i++) {
      await t.mutation(internal.authRateLimit.checkAndRecordAuthAttempt, {
        email: "same-user@example.com",
        flow: "reset",
      });
    }
    await expect(
      t.mutation(internal.authRateLimit.checkAndRecordAuthAttempt, {
        email: "same-user@example.com",
        flow: "reset",
      }),
    ).rejects.toThrow();
  });

  test("email is normalized (case + whitespace) so an attacker can't bypass the limit by varying case", async () => {
    const t = newTest();
    for (let i = 0; i < 8; i++) {
      await t.mutation(internal.authRateLimit.checkAndRecordAuthAttempt, {
        email: "Target@Example.com",
        flow: "signIn",
      });
    }
    await expect(
      t.mutation(internal.authRateLimit.checkAndRecordAuthAttempt, {
        email: "  target@example.com  ",
        flow: "signIn",
      }),
    ).rejects.toThrow();
  });

  test("an unrecognized flow falls back to the default limit (8) rather than being unlimited", async () => {
    const t = newTest();
    for (let i = 0; i < 8; i++) {
      await t.mutation(internal.authRateLimit.checkAndRecordAuthAttempt, {
        email: "weird-flow@example.com",
        flow: "some-future-flow-not-in-the-table",
      });
    }
    await expect(
      t.mutation(internal.authRateLimit.checkAndRecordAuthAttempt, {
        email: "weird-flow@example.com",
        flow: "some-future-flow-not-in-the-table",
      }),
    ).rejects.toThrow();
  });
});
