// Shared, runtime-agnostic org helpers — safe to import from both the
// default Convex runtime (mutations/queries) and "use node" actions, unlike
// pulling this from emails/employerInvite.ts directly.

// Mirrors src/pages/business/dashboard.tsx's getOrgCtx — same three real
// org types, same default. Keeps the recipient noun (a Vistula University
// student is not an "employee") consistent everywhere it's used: the org
// admin's dashboard, the invitee's inbox, and now in-app notifications.
export function memberNoun(orgType?: string | null): string {
  if (orgType === "university") return "students";
  if (orgType === "law_firm") return "clients";
  return "employees";
}

// Shared with employerCohort.ts's bucketReadiness, which buckets
// progress >= this as "Ready" on the employer's cohort view — the
// org-admin "member is ready" notification fires on the same threshold
// crossing so the in-app notification always matches what the dashboard
// itself would already show.
export const ORG_READY_THRESHOLD = 90;
