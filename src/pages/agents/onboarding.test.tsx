// Regression test for a real bug found 2026-07-21: hasProfile was computed
// as `myProfile !== undefined && myProfile !== null`, which is false both
// while the query is still loading AND when the agent genuinely has no
// profile — so a verified agent refreshing this page saw "No profile yet"
// flash before it corrected itself to "Verified & live". This proves the
// loading state now renders a skeleton instead of the wrong status text.
import { describe, expect, test, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithRouter } from "@/test/render.tsx";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const useQueryMock = vi.fn();
vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => useQueryMock(...args),
}));

import AgentOnboardingPage from "./onboarding.tsx";

describe("AgentOnboardingPage — verification status vs. loading state", () => {
  test("while the profile query is still loading, shows a skeleton — not 'no profile yet'", () => {
    useQueryMock.mockReturnValue(undefined);
    renderWithRouter(<AgentOnboardingPage />);

    expect(screen.queryByText("onboarding.no_profile")).not.toBeInTheDocument();
    expect(screen.queryByText("onboarding.verified_live")).not.toBeInTheDocument();
    expect(screen.queryByText("onboarding.pending_review")).not.toBeInTheDocument();
  });

  test("a genuinely profile-less agent sees the real 'no profile' message", () => {
    useQueryMock.mockReturnValue(null);
    renderWithRouter(<AgentOnboardingPage />);

    expect(screen.getByText("onboarding.no_profile")).toBeInTheDocument();
  });

  test("a verified agent sees 'verified & live', not 'no profile yet'", () => {
    useQueryMock.mockReturnValue({ verified: true });
    renderWithRouter(<AgentOnboardingPage />);

    expect(screen.getByText("onboarding.verified_live")).toBeInTheDocument();
    expect(screen.queryByText("onboarding.no_profile")).not.toBeInTheDocument();
  });

  test("an unverified-but-real profile sees 'pending review'", () => {
    useQueryMock.mockReturnValue({ verified: false });
    renderWithRouter(<AgentOnboardingPage />);

    expect(screen.getByText("onboarding.pending_review")).toBeInTheDocument();
  });
});
