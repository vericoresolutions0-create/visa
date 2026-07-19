/// <reference types="vite/client" />
// Regression test: the invite email was hardcoded to say "employees"
// regardless of org type, so a university inviting a student (e.g. for
// Poland's temporary residence/karta pobytu process) sent an email saying
// "Vistula University uses VisaClear to support employees relocating
// abroad" — wrong noun for the actual recipient. memberNoun mirrors
// dashboard.tsx's getOrgCtx so the invite email matches what the org
// admin's own dashboard already calls that person.
import { describe, expect, test } from "vitest";
import { memberNoun } from "./employerInvite.ts";

describe("employerInvite — memberNoun", () => {
  test("a university org's invitees are called students", () => {
    expect(memberNoun("university")).toBe("students");
  });

  test("a law firm's invitees are called clients", () => {
    expect(memberNoun("law_firm")).toBe("clients");
  });

  test("an employer org's invitees are called employees", () => {
    expect(memberNoun("employer")).toBe("employees");
  });

  test("an unset org type falls back to employees, matching dashboard.tsx's own default", () => {
    expect(memberNoun(undefined)).toBe("employees");
    expect(memberNoun(null)).toBe("employees");
  });
});
