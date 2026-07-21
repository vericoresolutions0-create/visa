// Regression tests for two real bugs found 2026-07-21:
// 1. isAnonymous treated "still loading" (currentUser === undefined) the
//    same as "signed out" (currentUser === null), popping the anonymous
//    visitor-save-prompt card into the page for a beat on every load.
// 2. ctaTarget sent a pending/rejected org's admin to /business/dashboard,
//    which immediately bounced them back to /business/onboarding — an
//    avoidable extra hop this now skips by checking approvalStatus.
import { describe, expect, test, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter } from "@/test/render.tsx";
import { matchesQuery } from "@/test/mock-convex.ts";
import { api } from "@/convex/_generated/api.js";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const navigateMock = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});

const useQueryMock = vi.fn();
vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => useQueryMock(...args),
  useMutation: () => vi.fn(),
}));

import BusinessLandingPage from "./page.tsx";

function mockQueries(org: unknown, currentUser: unknown) {
  useQueryMock.mockImplementation((queryRef: unknown) => {
    if (matchesQuery(queryRef, api.organizations.getMyOrganization)) return org;
    if (matchesQuery(queryRef, api.users.getCurrentUser)) return currentUser;
    return undefined;
  });
}

describe("BusinessLandingPage — loading vs. signed-out, and where the CTA sends a pending org", () => {
  test("while currentUser is still loading, the anonymous-visitor prompt does not appear", () => {
    mockQueries(null, undefined);
    renderWithRouter(<BusinessLandingPage />);

    expect(screen.queryByText("anonymous.title")).not.toBeInTheDocument();
  });

  test("once genuinely signed out, the anonymous-visitor prompt appears", () => {
    mockQueries(null, null);
    renderWithRouter(<BusinessLandingPage />);

    expect(screen.getByText("anonymous.title")).toBeInTheDocument();
  });

  test("a pending org's admin clicking the header CTA goes straight to onboarding, not dashboard", async () => {
    const user = userEvent.setup();
    mockQueries({ _id: "org1", name: "Acme", type: "employer", orgRole: "org_admin", approvalStatus: "pending" }, { _id: "u1", email: "a@b.com" });
    renderWithRouter(<BusinessLandingPage />);

    await user.click(screen.getByText("header.cta_go"));
    expect(navigateMock).toHaveBeenCalledWith("/business/onboarding");
  });

  test("an approved org's admin clicking the header CTA goes to the real dashboard", async () => {
    const user = userEvent.setup();
    mockQueries({ _id: "org1", name: "Acme", type: "employer", orgRole: "org_admin", approvalStatus: "approved" }, { _id: "u1", email: "a@b.com" });
    renderWithRouter(<BusinessLandingPage />);

    await user.click(screen.getByText("header.cta_go"));
    expect(navigateMock).toHaveBeenCalledWith("/business/dashboard");
  });
});
