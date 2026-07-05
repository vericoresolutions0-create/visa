import { useMemo, useState, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAction, useMutation, useQuery } from "convex/react";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { ConvexError } from "convex/values";
import {
  ArrowLeft,
  BadgePercent,
  CheckCircle2,
  CreditCard,
  Gift,
  Globe,
  Lock,
  Shield,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { api } from "@/convex/_generated/api.js";
import { AuthAccessPanel } from "@/components/auth/access-panel.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { useDemoAuth } from "@/hooks/use-demo-auth.ts";
import type { AgentPlanId } from "@/lib/agent-plans.ts";
import { useSeo } from "@/hooks/use-seo.ts";
import { useSmartBack } from "@/hooks/use-smart-back.ts";
import { cn } from "@/lib/utils.ts";

type ApplicantPlanId = "pro" | "expert";
type BillingCycle = "monthly" | "yearly";
type CheckoutProduct = "applicant" | "agent";
type CheckoutPlan = {
  product: CheckoutProduct;
  id: ApplicantPlanId | AgentPlanId;
  name: string;
  monthly: number;
  yearly: number;
  title: string;
  description: string;
  summaryLabel: string;
  successPath: string;
};
type ReferralResult = {
  valid: boolean;
  discountPercent: number;
  code?: string;
  message: string;
};

const APPLICANT_PLAN_DETAILS: Record<ApplicantPlanId, CheckoutPlan> = {
  pro: {
    product: "applicant",
    id: "pro",
    name: "Pro",
    monthly: 900,
    yearly: 7900,
    title: "Complete your Pro subscription",
    description:
      "Unlock unlimited checklists, PDF export, reminders, and saved progress.",
    summaryLabel: "VisaClear applicant plan",
    successPath: "/dashboard",
  },
  expert: {
    product: "applicant",
    id: "expert",
    name: "Expert",
    monthly: 1900,
    yearly: 14900,
    title: "Complete your Expert subscription",
    description:
      "Get the full applicant toolkit, including rejection analysis and priority support.",
    summaryLabel: "VisaClear applicant plan",
    successPath: "/dashboard",
  },
};

const AGENT_PLAN_DETAILS: Record<AgentPlanId, CheckoutPlan> = {
  agent_listing: {
    product: "agent",
    id: "agent_listing",
    name: "Verified Listing",
    monthly: 2900,
    yearly: 29000,
    title: "Activate your Verified Listing",
    description:
      "Publish a verified partner profile and start receiving direct applicant enquiries.",
    summaryLabel: "VisaClear partner plan",
    successPath: "/agents/onboarding",
  },
  agent_featured: {
    product: "agent",
    id: "agent_featured",
    name: "Featured Placement",
    monthly: 7900,
    yearly: 79000,
    title: "Activate Featured Placement",
    description:
      "Add priority route visibility and stronger conversion signals for your agency.",
    summaryLabel: "VisaClear partner plan",
    successPath: "/agents/onboarding",
  },
  agency_white_label: {
    product: "agent",
    id: "agency_white_label",
    name: "Agency White-Label",
    monthly: 14900,
    yearly: 149000,
    title: "Activate Agency White-Label",
    description:
      "Start the paid white-label path for a branded agency workspace and priority onboarding.",
    summaryLabel: "VisaClear agency plan",
    successPath: "/agents/onboarding",
  },
};

const BUILT_IN_REFERRALS: Record<string, number> = {
  VERICORE20: 20,
  VISACLEAR20: 20,
};

function formatMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function normalizeReferralCode(code: string) {
  return code
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function getDemoReferralResult(code: string, ownCode?: string): ReferralResult {
  const normalizedCode = normalizeReferralCode(code);
  if (!normalizedCode) {
    return {
      valid: false,
      discountPercent: 0,
      message: "Enter a referral code.",
    };
  }

  if (normalizedCode === normalizeReferralCode(ownCode ?? "")) {
    return {
      valid: false,
      discountPercent: 0,
      message: "You cannot use your own referral code.",
    };
  }

  const discountPercent = BUILT_IN_REFERRALS[normalizedCode];
  if (!discountPercent) {
    return {
      valid: false,
      discountPercent: 0,
      message: "Referral code not found.",
    };
  }

  return {
    valid: true,
    discountPercent,
    code: normalizedCode,
    message: `${discountPercent}% discount applied.`,
  };
}

function normalizeApplicantPlan(value: string | null): ApplicantPlanId {
  return value === "expert" ? "expert" : "pro";
}

function normalizeAgentPlan(value: string | null): AgentPlanId {
  if (value === "agent_featured" || value === "agency_white_label") {
    return value;
  }
  return "agent_listing";
}

function normalizeProduct(
  product: string | null,
  plan: string | null,
): CheckoutProduct {
  if (
    product === "agent" ||
    plan === "agent_listing" ||
    plan === "agent_featured" ||
    plan === "agency_white_label"
  ) {
    return "agent";
  }
  return "applicant";
}

function normalizeBilling(value: string | null): BillingCycle {
  return value === "monthly" ? "monthly" : "yearly";
}

function CheckoutAccess({
  demo,
  children,
}: {
  demo: boolean;
  children: ReactNode;
}) {
  if (demo) return <>{children}</>;
  return <Authenticated>{children}</Authenticated>;
}

export default function PaymentPage() {
  const { t } = useTranslation("payment");
  const [params] = useSearchParams();
  const product = normalizeProduct(params.get("product"), params.get("plan"));
  const plan =
    product === "agent"
      ? normalizeAgentPlan(params.get("plan"))
      : normalizeApplicantPlan(params.get("plan"));
  const billing = normalizeBilling(params.get("billing"));
  const selectedPlan =
    product === "agent"
      ? AGENT_PLAN_DETAILS[plan as AgentPlanId]
      : APPLICANT_PLAN_DETAILS[plan as ApplicantPlanId];

  useSeo({
    title: product === "agent" ? "Partner Checkout" : "Checkout",
    description: selectedPlan.description,
  });
  const navigate = useNavigate();
  const goBack = useSmartBack(
    product === "agent" ? "/agents/register" : "/pricing",
  );
  const { isDemoAuthenticated, user: demoUser, updateUser } = useDemoAuth();
  const completeCheckout = useMutation(api.users.completeCheckout);
  const completeAgentCheckout = useMutation(api.users.completeAgentCheckout);
  const createCheckoutSession = useAction(api.stripe.createCheckoutSession);
  const createLocalMethodCheckoutSession = useAction(api.stripe.createLocalMethodCheckoutSession);
  const initializePaystackTransaction = useAction(api.paystack.initializeTransaction);
  const isStripeConfigured = useQuery(api.billing.isStripeConfigured);
  const isPaystackConfigured = useQuery(api.paystack.isPaystackConfigured);
  const useRealStripe = !isDemoAuthenticated && Boolean(isStripeConfigured);
  const [localMethodLoading, setLocalMethodLoading] = useState<string | null>(null);

  const startLocalMethodCheckout = async (method: "pix" | "boleto" | "oxxo" | "paystack") => {
    setLocalMethodLoading(method);
    try {
      const { url } =
        method === "paystack"
          ? await initializePaystackTransaction({
              plan: selectedPlan.id as ApplicantPlanId,
              billingCycle: billing,
            })
          : await createLocalMethodCheckoutSession({
              plan: selectedPlan.id as ApplicantPlanId,
              billingCycle: billing,
              method,
            });
      window.location.href = url;
    } catch (error) {
      const message =
        error instanceof ConvexError
          ? (error.data as { message: string }).message
          : t("toast.checkout_error");
      toast.error(message);
      setLocalMethodLoading(null);
    }
  };
  const currentUser = useQuery(
    api.users.getCurrentUser,
    isDemoAuthenticated ? "skip" : {},
  );
  const accountUser = demoUser ?? currentUser;

  const [referralInput, setReferralInput] = useState("");
  const [appliedReferral, setAppliedReferral] = useState("");
  const serverReferralResult = useQuery(
    api.users.validateReferralCode,
    !isDemoAuthenticated && appliedReferral
      ? { code: appliedReferral }
      : "skip",
  );
  const referralResult =
    isDemoAuthenticated && appliedReferral
      ? getDemoReferralResult(appliedReferral, demoUser?.referralCode)
      : serverReferralResult;
  const [nameOnCard, setNameOnCard] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiryMonth, setExpiryMonth] = useState("");
  const [expiryYear, setExpiryYear] = useState("");
  const [cvv, setCvv] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [saving, setSaving] = useState(false);

  const baseAmount = selectedPlan[billing];
  const discountPercent = referralResult?.valid
    ? referralResult.discountPercent
    : 0;
  const discountAmount = Math.round(baseAmount * (discountPercent / 100));
  const totalAmount = baseAmount - discountAmount;
  const monthlyEquivalent =
    billing === "yearly" ? Math.round(totalAmount / 12) : totalAmount;

  const cardDigits = cardNumber.replace(/\D/g, "");
  const canSubmit = useMemo(() => {
    // Real Stripe Checkout collects card details on Stripe's own hosted
    // page — nothing to validate locally beyond being ready to redirect.
    if (useRealStripe) return true;
    return (
      nameOnCard.trim().length > 1 &&
      cardDigits.length >= 12 &&
      expiryMonth.trim().length >= 1 &&
      expiryYear.trim().length >= 2 &&
      cvv.replace(/\D/g, "").length >= 3 &&
      (billingEmail || accountUser?.email || "").includes("@")
    );
  }, [
    accountUser?.email,
    billingEmail,
    cardDigits.length,
    cvv,
    expiryMonth,
    expiryYear,
    nameOnCard,
    useRealStripe,
  ]);

  const handleCheckout = async () => {
    if (!canSubmit) {
      toast.error(t("toast.incomplete"));
      return;
    }

    setSaving(true);
    try {
      if (isDemoAuthenticated) {
        const paymentMethod = {
          type: "card" as const,
          brand: cardDigits.startsWith("4")
            ? "Visa"
            : cardDigits.startsWith("5")
              ? "Mastercard"
              : "Card",
          last4: cardDigits.slice(-4),
          nameOnMethod: nameOnCard.trim(),
          expiresAt: `${expiryMonth.padStart(2, "0")}/${expiryYear}`,
          billingEmail: billingEmail || accountUser?.email || "",
          updatedAt: new Date().toISOString(),
        };

        updateUser({
          ...(selectedPlan.product === "applicant"
            ? {
                plan: selectedPlan.id as ApplicantPlanId,
                billingCycle: billing,
                subscriptionAmountCents: totalAmount,
              }
            : {
                agentPlan: selectedPlan.id as AgentPlanId,
                agentBillingCycle: billing,
                agentSubscriptionAmountCents: totalAmount,
                agentSubscriptionStartedAt: new Date().toISOString(),
                lastAgentPaymentAt: new Date().toISOString(),
              }),
          paymentMethod: {
            ...paymentMethod,
          },
        });
        toast.success(`Demo ${selectedPlan.name} checkout completed.`);
        navigate(selectedPlan.successPath, { replace: true });
        return;
      }

      if (useRealStripe) {
        const { url } = await createCheckoutSession({
          product: selectedPlan.product,
          plan: selectedPlan.id,
          billingCycle: billing,
          referralCode: appliedReferral || undefined,
        });
        window.location.href = url;
        return;
      }

      const paymentMethod = {
        cardNumber,
        nameOnCard,
        expiryMonth,
        expiryYear,
        billingEmail: billingEmail || accountUser?.email || "",
      };

      if (selectedPlan.product === "agent") {
        await completeAgentCheckout({
          plan: selectedPlan.id as AgentPlanId,
          billingCycle: billing,
          referralCode: appliedReferral || undefined,
          expectedAmountCents: totalAmount,
          paymentMethod,
        });
      } else {
        await completeCheckout({
          plan: selectedPlan.id as ApplicantPlanId,
          billingCycle: billing,
          referralCode: appliedReferral || undefined,
          expectedAmountCents: totalAmount,
          paymentMethod,
        });
      }
      toast.success(`${selectedPlan.name} is active.`);
      navigate(selectedPlan.successPath, { replace: true });
    } catch (error) {
      const message =
        error instanceof ConvexError
          ? (error.data as { message: string }).message
          : error instanceof Error
            ? error.message
            : t("toast.payment_failed");
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={goBack}
              className="text-muted-foreground hover:text-primary transition-colors cursor-pointer p-1 -ml-1"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2.5 cursor-pointer"
            >
              <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
                <Globe className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <div>
                <span className="font-serif text-lg font-semibold text-primary">
                  VisaClear
                </span>
                <span className="text-[10px] text-muted-foreground ml-1.5 tracking-widest uppercase">
                  by Vericore
                </span>
              </div>
            </button>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
            <Lock className="w-3.5 h-3.5 text-accent" />
            {selectedPlan.product === "agent" ? t("header.partner_checkout") : t("header.checkout")}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">
        {!isDemoAuthenticated && (
          <AuthLoading>
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
              <Skeleton className="h-96 rounded-xl" />
              <Skeleton className="h-80 rounded-xl" />
            </div>
          </AuthLoading>
        )}

        {!isDemoAuthenticated && (
          <Unauthenticated>
            <div className="max-w-md mx-auto py-12">
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-2xl bg-primary/8 flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <h1 className="font-serif text-3xl font-semibold text-primary mb-2">
                  {t("signin.title")}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {t("signin.subtitle")}
                </p>
              </div>
              <AuthAccessPanel
                returnPath={`/payment?product=${selectedPlan.product}&plan=${selectedPlan.id}&billing=${billing}`}
              />
            </div>
          </Unauthenticated>
        )}

        <CheckoutAccess demo={isDemoAuthenticated}>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
            <section className="space-y-6">
              <div>
                <p className="text-xs tracking-widest uppercase text-accent font-semibold mb-2">
                  {t("method.eyebrow")}
                </p>
                <h1 className="font-serif text-4xl font-semibold text-primary">
                  {selectedPlan.title}
                </h1>
                <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
                  {selectedPlan.description}
                </p>
              </div>

              {useRealStripe ? (
                <div className="bg-card border border-border rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Lock className="w-5 h-5 text-primary" />
                    <h2 className="font-semibold text-primary">{t("method.stripe_title")}</h2>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {t("method.stripe_desc")}
                  </p>
                </div>
              ) : !isDemoAuthenticated && isStripeConfigured === false ? (
                <div className="bg-card border border-border rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Lock className="w-5 h-5 text-muted-foreground" />
                    <h2 className="font-semibold text-primary">Payment temporarily unavailable</h2>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Our payment system is being configured. Please try again shortly or contact us at support@visaclear.app.
                  </p>
                </div>
              ) : (
                <div className="bg-card border border-border rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-5">
                    <CreditCard className="w-5 h-5 text-primary" />
                    <h2 className="font-semibold text-primary">{t("method.card_title")}</h2>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-foreground mb-1.5">
                        {t("method.name_on_card")}
                      </label>
                      <input
                        value={nameOnCard}
                        onChange={(event) => setNameOnCard(event.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-foreground mb-1.5">
                        {t("method.card_number")}
                      </label>
                      <input
                        inputMode="numeric"
                        value={cardNumber}
                        onChange={(event) => setCardNumber(event.target.value)}
                        placeholder="4242 4242 4242 4242"
                        className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1.5">
                        {t("method.expiry_month")}
                      </label>
                      <input
                        inputMode="numeric"
                        value={expiryMonth}
                        onChange={(event) => setExpiryMonth(event.target.value)}
                        placeholder="MM"
                        className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1.5">
                        {t("method.expiry_year")}
                      </label>
                      <input
                        inputMode="numeric"
                        value={expiryYear}
                        onChange={(event) => setExpiryYear(event.target.value)}
                        placeholder="YY"
                        className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1.5">
                        {t("method.security_code")}
                      </label>
                      <input
                        inputMode="numeric"
                        value={cvv}
                        onChange={(event) => setCvv(event.target.value)}
                        placeholder="123"
                        className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1.5">
                        {t("method.billing_email")}
                      </label>
                      <input
                        type="email"
                        value={billingEmail}
                        onChange={(event) => setBillingEmail(event.target.value)}
                        placeholder={accountUser?.email ?? "billing@example.com"}
                        className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>
                </div>
              )}

              {!isDemoAuthenticated &&
                selectedPlan.product === "applicant" &&
                (isStripeConfigured || isPaystackConfigured) && (
                  <div className="bg-card border border-border rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Smartphone className="w-5 h-5 text-primary" />
                      <h2 className="font-semibold text-primary">{t("method.local_title")}</h2>
                    </div>
                    <p className="text-xs text-muted-foreground mb-4">
                      {t("method.local_desc")}
                    </p>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {isPaystackConfigured && (
                        <Button
                          type="button"
                          variant="outline"
                          className="cursor-pointer justify-start"
                          disabled={localMethodLoading !== null}
                          onClick={() => {
                            void startLocalMethodCheckout("paystack");
                          }}
                        >
                          {localMethodLoading === "paystack" ? t("method.redirecting") : t("method.paystack")}
                        </Button>
                      )}
                      {isStripeConfigured && (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            className="cursor-pointer justify-start"
                            disabled={localMethodLoading !== null}
                            onClick={() => {
                              void startLocalMethodCheckout("pix");
                            }}
                          >
                            {localMethodLoading === "pix" ? t("method.redirecting") : t("method.pix")}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="cursor-pointer justify-start"
                            disabled={localMethodLoading !== null}
                            onClick={() => {
                              void startLocalMethodCheckout("boleto");
                            }}
                          >
                            {localMethodLoading === "boleto" ? t("method.redirecting") : t("method.boleto")}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="cursor-pointer justify-start"
                            disabled={localMethodLoading !== null}
                            onClick={() => {
                              void startLocalMethodCheckout("oxxo");
                            }}
                          >
                            {localMethodLoading === "oxxo" ? t("method.redirecting") : t("method.oxxo")}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )}

              <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center gap-2 mb-5">
                  <Gift className="w-5 h-5 text-primary" />
                  <h2 className="font-semibold text-primary">{t("referral.title")}</h2>
                </div>
                <div className="flex gap-2">
                  <input
                    value={referralInput}
                    onChange={(event) =>
                      setReferralInput(event.target.value.toUpperCase())
                    }
                    placeholder="VERICORE20"
                    className="flex-1 px-3.5 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => setAppliedReferral(referralInput.trim())}
                  >
                    {t("referral.apply")}
                  </Button>
                </div>
                {appliedReferral && referralResult && (
                  <div
                    className={cn(
                      "mt-3 flex items-center gap-2 text-xs font-semibold",
                      referralResult.valid ? "text-accent" : "text-destructive",
                    )}
                  >
                    {referralResult.valid ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <BadgePercent className="w-3.5 h-3.5" />
                    )}
                    {referralResult.message}
                  </div>
                )}
              </div>
            </section>

            <aside className="bg-card border border-border rounded-xl p-6 lg:sticky lg:top-24">
              <p className="text-xs tracking-widest uppercase text-muted-foreground font-semibold mb-3">
                {t("summary.title")}
              </p>
              <div className="flex items-start justify-between gap-3 mb-6">
                <div>
                  <h2 className="font-serif text-2xl font-semibold text-primary">
                    {selectedPlan.name}
                  </h2>
                  <p className="text-sm text-muted-foreground capitalize">
                    {selectedPlan.summaryLabel} · {billing} billing
                  </p>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-primary">
                    {formatMoney(
                      billing === "yearly" ? Math.round(baseAmount / 12) : baseAmount,
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t("summary.per_month")}{billing === "yearly" ? t("summary.billed_annually") : ""}
                  </div>
                </div>
              </div>

              <div className="space-y-3 border-y border-border py-4 mb-5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {billing === "yearly" ? t("summary.subtotal_annual") : t("summary.subtotal")}
                  </span>
                  <span className="font-medium">{formatMoney(baseAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t("summary.discount")}
                  </span>
                  <span className="font-medium text-accent">
                    -{formatMoney(discountAmount)}
                  </span>
                </div>
              </div>

              <div className="flex items-end justify-between gap-3 mb-2">
                <span className="text-sm font-semibold text-foreground">
                  {t("summary.total")}
                </span>
                <span className="font-serif text-3xl font-semibold text-primary">
                  {formatMoney(totalAmount)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-6">
                {billing === "yearly"
                  ? t("summary.yearly_breakdown", { amount: formatMoney(monthlyEquivalent) })
                  : t("summary.monthly_breakdown")}
              </p>

              <Button
                size="lg"
                className="w-full cursor-pointer font-semibold"
                disabled={
                  !canSubmit ||
                  saving ||
                  (referralResult === undefined && !!appliedReferral)
                }
                onClick={() => {
                  void handleCheckout();
                }}
              >
                {saving
                  ? t("cta.processing")
                  : useRealStripe
                    ? t("cta.stripe", { amount: formatMoney(totalAmount) })
                    : t("cta.pay", { amount: formatMoney(totalAmount) })}
              </Button>
            </aside>
          </div>
        </CheckoutAccess>
      </main>
    </div>
  );
}
