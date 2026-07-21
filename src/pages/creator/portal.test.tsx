// Regression test for a real bug found 2026-07-21: the payout minimum was
// hardcoded to £50 in this file even though the backend already returns
// the real value (stats.minimumPayoutCents) — the influencer portal read
// it correctly, this one didn't. Uses a minimum that is deliberately NOT
// £50, so the old hardcoded behavior would fail this test.
import { describe, expect, test, vi } from "vitest";
import { screen } from "@testing-library/react";
import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { matchesQuery } from "@/test/mock-convex.ts";
import { api } from "@/convex/_generated/api.js";

const useQueryMock = vi.fn();
vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => useQueryMock(...args),
}));

import CreatorPortalPage from "./portal.tsx";

const BASE_STATS = {
  name: "Test Creator",
  slug: "testcreator",
  totalClicks: 100,
  signupCount: 10,
  paidSubscriberCount: 3,
  earningsThisMonthCents: 500,
  totalCommissionCents: 2000,
  paidCents: 0,
  commissionMonths: 6,
  commissionRatePercent: 20,
  recentCommissions: [] as unknown[],
};

function renderPortal(stats: unknown) {
  useQueryMock.mockImplementation((queryRef: unknown) => {
    if (matchesQuery(queryRef, api.creators.getPortalStats)) return stats;
    return undefined;
  });
  return render(
    <MemoryRouter initialEntries={["/creator/portal/test-token"]}>
      <Routes>
        <Route path="/creator/portal/:token" element={<CreatorPortalPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("CreatorPortalPage — real payout minimum, not a hardcoded £50", () => {
  test("shows the real minimum (£30) when below it, not the old hardcoded £50", () => {
    renderPortal({ ...BASE_STATS, pendingCents: 2000, minimumPayoutCents: 3000 });

    expect(screen.getByText(/more to reach the £30 minimum/)).toBeInTheDocument();
    expect(screen.queryByText(/£50 minimum/)).not.toBeInTheDocument();
  });

  test("respects a different real minimum too — not a single hardcoded constant", () => {
    renderPortal({ ...BASE_STATS, pendingCents: 4000, minimumPayoutCents: 7500 });

    expect(screen.getByText(/more to reach the £75 minimum/)).toBeInTheDocument();
  });

  test("once pending balance clears the real minimum, the 'more needed' text disappears", () => {
    renderPortal({ ...BASE_STATS, pendingCents: 3500, minimumPayoutCents: 3000 });

    // A positive assertion, not just an absence check — proves the real
    // page rendered (not still stuck on the loading spinner), so the
    // absence of "more to reach" below actually means something.
    expect(screen.getByText("£35.00")).toBeInTheDocument();
    expect(screen.queryByText(/more to reach/)).not.toBeInTheDocument();
  });
});
