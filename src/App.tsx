import { lazy, Suspense, useEffect } from "react";
import { useConvexAuth } from "convex/react";
import {
  BrowserRouter,
  Route,
  Routes,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { DefaultProviders } from "./components/providers/default.tsx";
import AuthCallback from "./pages/auth/Callback.tsx";
import Index from "./pages/Index.tsx";
import { ErrorBoundary } from "@/components/error-boundary.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { useServiceWorker } from "@/hooks/use-service-worker.ts";
import { useAnalytics } from "@/hooks/use-analytics.ts";
import { usePartnerReferralCapture } from "@/hooks/use-partner-referral.ts";
import { useInfluencerReferralCapture } from "@/hooks/use-influencer-referral.ts";
import { useCreatorReferralCapture } from "@/hooks/use-creator-referral.ts";
import { useScrollToTop } from "@/hooks/use-scroll-to-top.ts";
import { NavigationDepthProvider } from "@/hooks/use-navigation-depth.tsx";
import CookieBanner from "@/components/cookie-banner.tsx";
import { InstallAppPrompt } from "@/components/pwa/install-prompt.tsx";
import "./i18n.ts";

const ChecklistPage = lazy(() => import("./pages/checklist/page.tsx"));
const RiskScorePage = lazy(() => import("./pages/risk-score/page.tsx"));
const RiskScoreResultPage = lazy(() => import("./pages/risk-score/result.tsx"));
const WallOfFamePage = lazy(() => import("./pages/wall-of-fame/page.tsx"));
const WaitTimesPage = lazy(() => import("./pages/wait-times/page.tsx"));
const PricingPage = lazy(() => import("./pages/pricing/page.tsx"));
const LoginPage = lazy(() => import("./pages/login/page.tsx"));
const PaymentPage = lazy(() => import("./pages/payment/page.tsx"));
const PassportPhotoPage = lazy(() => import("./pages/passport-photo/page.tsx"));
const DashboardPage = lazy(() => import("./pages/dashboard/page.tsx"));
const DashboardChecklistsPage = lazy(
  () => import("./pages/dashboard/checklists/page.tsx"),
);
const DashboardTimelinePage = lazy(
  () => import("./pages/dashboard/timeline/page.tsx"),
);
const DashboardRemindersPage = lazy(
  () => import("./pages/dashboard/reminders/page.tsx"),
);
const DashboardTripWorkspacePage = lazy(
  () => import("./pages/dashboard/trips/page.tsx"),
);
const DocumentVaultPage = lazy(() => import("./pages/dashboard/vault/page.tsx"));
const HouseholdPage = lazy(() => import("./pages/dashboard/household/page.tsx"));
const CountryWatchPage = lazy(() => import("./pages/dashboard/country-watch/page.tsx"));
const ProfileSettingsPage = lazy(
  () => import("./pages/settings/profile/page.tsx"),
);
const ConfirmEmailPage = lazy(() => import("./pages/settings/confirm-email.tsx"));
const RejectionAnalyserPage = lazy(
  () => import("./pages/rejection-analyser/page.tsx"),
);
const AgentsPage = lazy(() => import("./pages/agents/page.tsx"));
const AgentLoginPage = lazy(() => import("./pages/agents/login.tsx"));
const AgentRegisterPage = lazy(() => import("./pages/agents/register.tsx"));
const AgentOnboardingPage = lazy(() => import("./pages/agents/onboarding.tsx"));
const AgentDashboardPreviewPage = lazy(() => import("./pages/agents/dashboard.tsx"));
const AgentProfilePage = lazy(() => import("./pages/agents/profile.tsx"));
const ClientPortalPage = lazy(() => import("./pages/agents/client-portal.tsx"));
const OnboardingPage = lazy(() => import("./pages/onboarding/page.tsx"));
const TermsPage = lazy(() => import("./pages/terms/page.tsx"));
const PrivacyPage = lazy(() => import("./pages/privacy/page.tsx"));
const AdminPage = lazy(() => import("./pages/admin/page.tsx"));
const WhiteLabelPage = lazy(() => import("./pages/white-label/page.tsx"));
const BusinessLandingPage = lazy(() => import("./pages/business/page.tsx"));
const BusinessOnboardingPage = lazy(() => import("./pages/business/onboarding.tsx"));
const BusinessDashboardPage = lazy(() => import("./pages/business/dashboard.tsx"));
const BusinessInvitePage = lazy(() => import("./pages/business/invite.tsx"));
const ContactPage = lazy(() => import("./pages/contact/page.tsx"));
const AboutPage = lazy(() => import("./pages/about/page.tsx"));
const BlogPage = lazy(() => import("./pages/blog/page.tsx"));
const BlogArticlePage = lazy(() => import("./pages/blog/article.tsx"));
const GoogleLoginPage = lazy(() => import("./pages/google-login/page.tsx"));
const MenuPage = lazy(() => import("./pages/menu/page.tsx"));
const CommunityPage = lazy(() => import("./pages/community/page.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const InfluencerPortalPage = lazy(() => import("./pages/influencer/portal.tsx"));
const ImmigrationStatusPage = lazy(() => import("./pages/dashboard/immigration-status/page.tsx"));
const RefPage = lazy(() => import("./pages/ref/page.tsx"));
const CreatorPortalPage = lazy(() => import("./pages/creator/portal.tsx"));

function PageLoader() {
  return (
    <div className="min-h-screen flex flex-col gap-4 p-8">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-20 w-full rounded-xl" />
      ))}
    </div>
  );
}

// Redirect first-time visitors to onboarding
function OnboardingGate({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading } = useConvexAuth();

  useEffect(() => {
    // Authenticated users never need onboarding — also stamp localStorage so
    // after sign-out the homepage works instead of bouncing to /onboarding.
    if (isAuthenticated) {
      localStorage.setItem("vc_onboarded", "true");
      return;
    }
    // Wait for auth to resolve before deciding — avoids a flash redirect.
    if (isLoading) return;

    const onboarded = localStorage.getItem("vc_onboarded");
    const skipPaths = [
      "/onboarding",
      "/auth/callback",
      "/terms",
      "/privacy",
      "/pricing",
      "/login",
      "/signup",
      "/google-login",
      "/payment",
      "/settings",
      "/agents",
      "/agents/register",
      "/agents/login",
      "/agents/onboarding",
      "/agents/dashboard",
      "/agents/",
      "/client-portal",
      "/about",
      "/contact",
      "/blog",
      "/white-label",
      "/business",
      "/checklist",
      "/dashboard",
      "/rejection-analyser",
      "/passport-photo",
      "/admin",
      "/risk-score",
      "/wall-of-fame",
      "/wait-times",
      "/menu",
      "/community",
      "/influencer",
      "/ref",
      "/creator",
    ];
    if (!onboarded && !skipPaths.some((p) => location.pathname.startsWith(p))) {
      navigate("/onboarding", { replace: true });
    }
  }, [navigate, location.pathname, isAuthenticated, isLoading]);

  return <>{children}</>;
}

function AppRoutes() {
  useServiceWorker();
  useAnalytics();
  useScrollToTop();
  usePartnerReferralCapture();
  useInfluencerReferralCapture();
  useCreatorReferralCapture();

  return (
    <NavigationDepthProvider>
    <OnboardingGate>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/checklist" element={<ChecklistPage />} />
          <Route path="/risk-score" element={<RiskScorePage />} />
          <Route path="/risk-score/:resultId" element={<RiskScoreResultPage />} />
          <Route path="/wall-of-fame" element={<WallOfFamePage />} />
          <Route path="/wait-times" element={<WaitTimesPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<LoginPage />} />
          <Route path="/google-login" element={<GoogleLoginPage />} />
          <Route path="/payment" element={<PaymentPage />} />
          <Route path="/passport-photo" element={<PassportPhotoPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route
            path="/dashboard/checklists"
            element={<DashboardChecklistsPage />}
          />
          <Route
            path="/dashboard/timeline"
            element={<DashboardTimelinePage />}
          />
          <Route
            path="/dashboard/reminders"
            element={<DashboardRemindersPage />}
          />
          <Route
            path="/dashboard/trips/:id"
            element={<DashboardTripWorkspacePage />}
          />
          <Route path="/dashboard/vault" element={<DocumentVaultPage />} />
          <Route path="/dashboard/household" element={<HouseholdPage />} />
          <Route path="/dashboard/country-watch" element={<CountryWatchPage />} />
          <Route path="/settings/profile" element={<ProfileSettingsPage />} />
          <Route path="/settings/confirm-email/:token" element={<ConfirmEmailPage />} />
          <Route
            path="/rejection-analyser"
            element={<RejectionAnalyserPage />}
          />
          <Route path="/agents" element={<AgentsPage />} />
          <Route path="/agents/login" element={<AgentLoginPage />} />
          <Route path="/agents/register" element={<AgentRegisterPage />} />
          <Route path="/agents/onboarding" element={<AgentOnboardingPage />} />
          <Route path="/agents/dashboard" element={<AgentDashboardPreviewPage />} />
          <Route path="/agents/:profileId" element={<AgentProfilePage />} />
          <Route path="/client-portal/:token" element={<ClientPortalPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/white-label" element={<WhiteLabelPage />} />
          <Route path="/business" element={<BusinessLandingPage />} />
          <Route path="/business/onboarding" element={<BusinessOnboardingPage />} />
          <Route path="/business/dashboard" element={<BusinessDashboardPage />} />
          <Route path="/business/invite/:token" element={<BusinessInvitePage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/blog/:id" element={<BlogArticlePage />} />
          <Route path="/community" element={<CommunityPage />} />
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/influencer/:token" element={<InfluencerPortalPage />} />
          <Route path="/dashboard/immigration-status" element={<ImmigrationStatusPage />} />
          <Route path="/ref/:slug" element={<RefPage />} />
          <Route path="/creator/portal/:token" element={<CreatorPortalPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </OnboardingGate>
    </NavigationDepthProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <DefaultProviders>
        <BrowserRouter>
          <AppRoutes />
          <InstallAppPrompt />
          <CookieBanner />
        </BrowserRouter>
      </DefaultProviders>
    </ErrorBoundary>
  );
}
