import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useMutation,
  useQuery,
} from "convex/react";
import { ConvexError } from "convex/values";
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  CreditCard,
  Globe,
  Landmark,
  LayoutDashboard,
  LogIn,
  LogOut,
  Shield,
  Trash2,
  UserRound,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api.js";
import { DemoSignInButton, SignInButton } from "@/components/ui/signin.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { useDemoAuth } from "@/hooks/use-demo-auth.ts";
import { useAuth } from "@/hooks/use-auth.ts";
import { useTranslation } from "react-i18next";
import { useSeo } from "@/hooks/use-seo.ts";
import { useSmartBack } from "@/hooks/use-smart-back.ts";
import { cn } from "@/lib/utils.ts";
import { CountrySelect } from "@/components/CountrySelect.tsx";

type PayoutMethod = "bank" | "mobile_money" | "paypal";

function ProfileSettingsInner() {
  const { t } = useTranslation("profile");
  const navigate = useNavigate();
  const {
    isDemoAuthenticated,
    user: demoUser,
    updateUser,
    signOut,
  } = useDemoAuth();
  const userQuery = useQuery(
    api.users.getCurrentUser,
    isDemoAuthenticated ? "skip" : {},
  );
  const referralStats = useQuery(
    api.referralRewards.getMyReferralRewardStatus,
    isDemoAuthenticated ? "skip" : {},
  );
  const redeemReferralReward = useMutation(api.referralRewards.redeemReferralReward);
  const [redeemingReward, setRedeemingReward] = useState(false);
  const [demoReferralStats, setDemoReferralStats] = useState({
    signupCount: 7,
    monthsEarned: 2,
    monthsGranted: 1,
    monthsRedeemable: 1,
    nextRewardAtSignups: 9,
    capReached: false,
  });
  const updateProfile = useMutation(api.users.updateProfile);
  const updatePayoutSetup = useMutation(api.users.updatePayoutSetup);
  const deleteCurrentAccount = useMutation(api.users.deleteCurrentAccount);
  const { signOut: signOutReal } = useAuth();

  const pendingEmailChange = useQuery(
    api.emailChange.getMyPendingEmailChange,
    isDemoAuthenticated ? "skip" : {},
  );
  const requestEmailChange = useMutation(api.emailChange.requestEmailChange);
  const cancelEmailChange = useMutation(api.emailChange.cancelEmailChange);
  const [showEmailChangeForm, setShowEmailChangeForm] = useState(false);
  const [newEmailInput, setNewEmailInput] = useState("");
  const [requestingEmailChange, setRequestingEmailChange] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [method, setMethod] = useState<PayoutMethod>("bank");
  const [accountName, setAccountName] = useState("");
  const [payoutCountry, setPayoutCountry] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [mobileMoneyProvider, setMobileMoneyProvider] = useState("");
  const [mobileMoneyNumber, setMobileMoneyNumber] = useState("");
  const [paypalEmail, setPaypalEmail] = useState("");
  const [savingPayout, setSavingPayout] = useState(false);

  const [deleteEmail, setDeleteEmail] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [referralCopied, setReferralCopied] = useState(false);
  const [exportRequested, setExportRequested] = useState(false);
  const [exporting, setExporting] = useState(false);
  const exportData = useQuery(
    api.users.exportMyData,
    isDemoAuthenticated || !exportRequested ? "skip" : {},
  );

  useEffect(() => {
    if (!exportData || !exportRequested) return;
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `visaclear-data-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setExportRequested(false);
    setExporting(false);
    toast.success("Your data export has downloaded.");
  }, [exportData, exportRequested]);

  useEffect(() => {
    const user = demoUser ?? userQuery;
    if (!user) return;
    setName(user.name ?? "");
    setEmail(user.email ?? "");
    setPhone(user.phone ?? "");
    setCountry(user.country ?? "");
    setMethod(user.payoutSetup?.method ?? "bank");
    setAccountName(user.payoutSetup?.accountName ?? user.name ?? "");
    setPayoutCountry(user.payoutSetup?.country ?? user.country ?? "");
    setBankName(user.payoutSetup?.bankName ?? "");
    setMobileMoneyProvider(user.payoutSetup?.mobileMoneyProvider ?? "");
    setPaypalEmail(user.payoutSetup?.paypalEmail ?? user.email ?? "");
  }, [demoUser, userQuery]);

  if (!isDemoAuthenticated && userQuery === undefined) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  const user = demoUser ?? userQuery;

  if (!user) {
    return null;
  }

  const handleRedeemReward = async () => {
    if (isDemoAuthenticated) {
      setDemoReferralStats((prev) => ({
        ...prev,
        monthsGranted: prev.monthsGranted + prev.monthsRedeemable,
        monthsRedeemable: 0,
      }));
      toast.success(t("toast.demo_redeemed"));
      return;
    }
    setRedeemingReward(true);
    try {
      const result = await redeemReferralReward({});
      toast.success(t(result.monthsGranted === 1 ? "toast.redeemed_one" : "toast.redeemed_other", { count: result.monthsGranted }));
    } catch (err) {
      if (err instanceof ConvexError) toast.error((err.data as { message: string }).message);
      else toast.error(t("toast.redeem_error"));
    } finally {
      setRedeemingReward(false);
    }
  };

  const saveProfile = async () => {
    if (!name.trim()) {
      toast.error(t("toast.name_required"));
      return;
    }
    if (phone.trim() && !/^[+\d][\d\s\-().]{5,19}$/.test(phone.trim())) {
      toast.error("Enter a valid phone number (e.g. +44 7700 900123).");
      return;
    }

    setSavingProfile(true);
    try {
      if (isDemoAuthenticated) {
        updateUser({
          name: name.trim(),
          email: email.trim(),
          phone: phone || undefined,
          country: country || undefined,
        });
        toast.success(t("toast.demo_profile_updated"));
        return;
      }

      await updateProfile({
        name,
        phone: phone || undefined,
        country: country || undefined,
      });
      toast.success(t("toast.profile_updated"));
    } catch {
      toast.error(t("toast.profile_error"));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleRequestEmailChange = async () => {
    setRequestingEmailChange(true);
    try {
      await requestEmailChange({ newEmail: newEmailInput.trim() });
      toast.success(t("toast.email_link_sent"));
      setNewEmailInput("");
      setShowEmailChangeForm(false);
    } catch (err) {
      if (err instanceof ConvexError) toast.error((err.data as { message: string }).message);
      else toast.error(t("toast.email_change_error"));
    } finally {
      setRequestingEmailChange(false);
    }
  };

  const handleCancelEmailChange = async () => {
    try {
      await cancelEmailChange({});
      toast.success(t("toast.email_cancelled"));
    } catch {
      toast.error(t("toast.email_cancel_error"));
    }
  };

  const savePayout = async () => {
    setSavingPayout(true);
    try {
      if (isDemoAuthenticated) {
        const accountNumberDigits = accountNumber.replace(/\D/g, "");
        const mobileDigits = mobileMoneyNumber.replace(/\D/g, "");
        updateUser({
          payoutSetup: {
            method,
            accountName,
            country: payoutCountry,
            bankName: bankName || undefined,
            accountNumberLast4:
              accountNumberDigits.slice(-4) ||
              user.payoutSetup?.accountNumberLast4,
            mobileMoneyProvider: mobileMoneyProvider || undefined,
            mobileMoneyLast4:
              mobileDigits.slice(-4) || user.payoutSetup?.mobileMoneyLast4,
            paypalEmail: paypalEmail || undefined,
            updatedAt: new Date().toISOString(),
          },
        });
        setAccountNumber("");
        setMobileMoneyNumber("");
        toast.success(t("toast.demo_payout_saved"));
        return;
      }

      await updatePayoutSetup({
        method,
        accountName,
        country: payoutCountry,
        bankName: bankName || undefined,
        accountNumber: accountNumber || undefined,
        mobileMoneyProvider: mobileMoneyProvider || undefined,
        mobileMoneyNumber: mobileMoneyNumber || undefined,
        paypalEmail: paypalEmail || undefined,
      });
      setAccountNumber("");
      setMobileMoneyNumber("");
      toast.success(t("toast.payout_saved"));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("toast.payout_error");
      toast.error(message);
    } finally {
      setSavingPayout(false);
    }
  };

  const deleteAccount = async () => {
    setDeleting(true);
    try {
      if (isDemoAuthenticated) {
        signOut();
        localStorage.removeItem("vc_onboarded");
        toast.success(t("toast.demo_account_cleared"));
        navigate("/", { replace: true });
        return;
      }

      await deleteCurrentAccount({ confirmEmail: deleteEmail });
      if (!isDemoAuthenticated) await signOutReal();
      localStorage.removeItem("vc_onboarded");
      toast.success(t("toast.account_deleted"));
      navigate("/", { replace: true });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t("toast.delete_error");
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <UserRound className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-primary">{t("personal.title")}</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              {t("personal.name")}
            </label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              {t("personal.email")}
            </label>
            {isDemoAuthenticated ? (
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            ) : (
              <>
                <input
                  type="email"
                  value={email}
                  readOnly
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-input bg-muted/40 text-muted-foreground cursor-not-allowed"
                />
                {pendingEmailChange ? (
                  <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-accent/30 bg-accent/5 px-3 py-2">
                    <p className="text-[11px] text-foreground">
                      {t("email.pending")} <span className="font-semibold">{pendingEmailChange.newEmail}</span>.
                    </p>
                    <button
                      type="button"
                      onClick={() => void handleCancelEmailChange()}
                      className="text-[11px] font-semibold text-muted-foreground hover:text-destructive cursor-pointer shrink-0"
                    >
                      {t("email.cancel")}
                    </button>
                  </div>
                ) : showEmailChangeForm ? (
                  <div className="mt-2 flex gap-2">
                    <input
                      type="email"
                      placeholder={t("email.placeholder")}
                      value={newEmailInput}
                      onChange={(event) => setNewEmailInput(event.target.value)}
                      className="flex-1 px-3.5 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <Button
                      type="button"
                      disabled={requestingEmailChange || !newEmailInput.includes("@")}
                      onClick={() => void handleRequestEmailChange()}
                      className="cursor-pointer shrink-0 disabled:opacity-60"
                    >
                      {requestingEmailChange ? t("email.sending") : t("email.send_link")}
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowEmailChangeForm(true)}
                    className="mt-1.5 text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                  >
                    {t("email.change")}
                  </button>
                )}
              </>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              {t("personal.phone")}
            </label>
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              {t("personal.country")}
            </label>
            <CountrySelect
              value={country}
              onChange={setCountry}
              placeholder={t("personal.select_country")}
            />
          </div>
        </div>
        <div className="flex justify-end mt-5">
          <Button
            className="cursor-pointer"
            disabled={savingProfile}
            onClick={() => {
              void saveProfile();
            }}
          >
            {savingProfile ? t("personal.saving") : t("personal.save")}
          </Button>
        </div>
      </section>

      <section className="grid md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <GiftCodeIcon />
            <h2 className="font-semibold text-primary">{t("referral.title")}</h2>
          </div>
          <button
            type="button"
            disabled={!user.referralCode}
            onClick={() => {
              if (!user.referralCode) return;
              navigator.clipboard.writeText(user.referralCode).then(() => {
                setReferralCopied(true);
                toast.success(t("referral.copied"));
                setTimeout(() => setReferralCopied(false), 2000);
              }).catch(() => toast.error(t("referral.copy_failed")));
            }}
            className="flex items-center gap-2 font-mono text-lg font-semibold text-foreground tracking-wide cursor-pointer disabled:opacity-50"
          >
            {user.referralCode ?? t("referral.generating")}
            {user.referralCode && (referralCopied ? <CheckCircle2 className="w-4 h-4 text-accent" /> : <Copy className="w-4 h-4 text-muted-foreground" />)}
          </button>
          <p className="text-xs text-muted-foreground mt-2">
            {t("referral.share_hint")}
          </p>
          {(isDemoAuthenticated ? demoReferralStats : referralStats) && (() => {
            const stats = isDemoAuthenticated ? demoReferralStats : referralStats!;
            return (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-semibold text-primary">
                  {t(stats.signupCount === 1 ? "referral.signups_one" : "referral.signups_other", { count: stats.signupCount })}
                </p>
                {stats.monthsRedeemable > 0 ? (
                  <div className="rounded-lg border border-accent/30 bg-accent/5 p-3">
                    <p className="text-xs font-semibold text-foreground mb-2">
                      {t(stats.monthsRedeemable === 1 ? "referral.earned_one" : "referral.earned_other", { count: stats.monthsRedeemable })}
                    </p>
                    <button
                      disabled={redeemingReward}
                      onClick={() => void handleRedeemReward()}
                      className="text-xs font-semibold text-accent hover:underline cursor-pointer disabled:opacity-60"
                    >
                      {redeemingReward ? t("referral.redeeming") : t("referral.redeem")}
                    </button>
                  </div>
                ) : stats.capReached ? (
                  <p className="text-[11px] text-muted-foreground">
                    {t("referral.cap")}
                  </p>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    {t("referral.refer_more", { remaining: (stats.nextRewardAtSignups ?? 3) - stats.signupCount, progress: stats.signupCount % 3 })}
                  </p>
                )}
              </div>
            );
          })()}
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-primary">{t("payment.title")}</h2>
          </div>
          {user.paymentMethod ? (
            <div>
              <div className="text-sm font-semibold text-foreground">
                {user.paymentMethod.brand ?? "Card"} {t("payment.ending")}{" "}
                {user.paymentMethod.last4}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {user.paymentMethod.nameOnMethod} ·{" "}
                {user.paymentMethod.expiresAt}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("payment.none")}
            </p>
          )}
          <Button
            size="sm"
            variant="secondary"
            className="mt-4 cursor-pointer"
            onClick={() => {
              const plan = user.plan === "expert" ? "expert" : "pro";
              const billing = user.billingCycle ?? "yearly";
              navigate(`/payment?plan=${plan}&billing=${billing}`);
            }}
          >
            {t("payment.update")}
          </Button>
        </div>
      </section>

      <section className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Wallet className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-primary">{t("payout.title")}</h2>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-5">
          {[
            { id: "bank", label: t("payout.bank") },
            { id: "mobile_money", label: t("payout.mobile") },
            { id: "paypal", label: t("payout.paypal") },
          ].map((option) => (
            <button
              key={option.id}
              onClick={() => setMethod(option.id as PayoutMethod)}
              className={cn(
                "py-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer",
                method === option.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:text-primary",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              {t("payout.account_name")}
            </label>
            <input
              value={accountName}
              onChange={(event) => setAccountName(event.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              {t("payout.country")}
            </label>
            <CountrySelect
              value={payoutCountry}
              onChange={setPayoutCountry}
              placeholder={t("personal.select_country")}
            />
          </div>

          {method === "bank" && (
            <>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  {t("payout.bank_name")}
                </label>
                <input
                  value={bankName}
                  onChange={(event) => setBankName(event.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  {t("payout.account_number")}
                </label>
                <input
                  inputMode="numeric"
                  value={accountNumber}
                  onChange={(event) => setAccountNumber(event.target.value)}
                  placeholder={
                    user.payoutSetup?.accountNumberLast4
                      ? `•••• ${user.payoutSetup.accountNumberLast4}`
                      : ""
                  }
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </>
          )}

          {method === "mobile_money" && (
            <>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  {t("payout.provider")}
                </label>
                <input
                  value={mobileMoneyProvider}
                  onChange={(event) =>
                    setMobileMoneyProvider(event.target.value)
                  }
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  {t("payout.mobile_number")}
                </label>
                <input
                  inputMode="tel"
                  value={mobileMoneyNumber}
                  onChange={(event) => setMobileMoneyNumber(event.target.value)}
                  placeholder={
                    user.payoutSetup?.mobileMoneyLast4
                      ? `•••• ${user.payoutSetup.mobileMoneyLast4}`
                      : ""
                  }
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </>
          )}

          {method === "paypal" && (
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                {t("payout.paypal_email")}
              </label>
              <input
                type="email"
                value={paypalEmail}
                onChange={(event) => setPaypalEmail(event.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end mt-5">
          <Button
            className="cursor-pointer"
            disabled={savingPayout}
            onClick={() => {
              void savePayout();
            }}
          >
            {savingPayout ? t("payout.saving") : t("payout.save")}
          </Button>
        </div>
      </section>

      {!isDemoAuthenticated && (
        <section className="bg-muted/40 border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">Your data</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Under GDPR Article 20, you have the right to receive a copy of all the data we hold about you. This downloads a JSON file containing your profile, checklists, documents, travel log, and more.
          </p>
          <Button
            variant="outline"
            className="cursor-pointer"
            disabled={exporting}
            onClick={() => {
              setExporting(true);
              setExportRequested(true);
            }}
          >
            {exporting ? "Preparing export..." : "Download my data"}
          </Button>
        </section>
      )}

      <section className="bg-destructive/5 border border-destructive/20 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Trash2 className="w-5 h-5 text-destructive" />
          <h2 className="font-semibold text-destructive">{t("delete.title")}</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          {t("delete.body")}
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            value={deleteEmail}
            onChange={(event) => setDeleteEmail(event.target.value)}
            placeholder={user.email ?? t("delete.placeholder")}
            className="flex-1 px-3.5 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button
            variant="destructive"
            className="cursor-pointer"
            disabled={deleting}
            onClick={() => {
              void deleteAccount();
            }}
          >
            {deleting ? t("delete.deleting") : t("delete.cta")}
          </Button>
        </div>
      </section>
    </div>
  );
}

function GiftCodeIcon() {
  return <Landmark className="w-5 h-5 text-primary" />;
}

export default function ProfileSettingsPage() {
  const { t } = useTranslation("profile");
  useSeo({
    title: "Profile Settings",
    description:
      "Manage your VisaClear profile, payment method, payout setup, and account deletion.",
  });
  const navigate = useNavigate();
  const goBack = useSmartBack("/dashboard");
  const { isDemoAuthenticated, signOut } = useDemoAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
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
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
              <Shield className="w-3.5 h-3.5 text-accent" />
              {t("header.badge")}
            </div>
            {isDemoAuthenticated && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => navigate("/dashboard")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors cursor-pointer border border-transparent hover:border-primary/20"
                  title={t("nav.dashboard")}
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">{t("nav.dashboard")}</span>
                </button>
                <button
                  onClick={() => {
                    signOut();
                    navigate("/");
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors cursor-pointer border border-transparent hover:border-destructive/20"
                  title={t("nav.sign_out")}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">{t("nav.sign_out")}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {!isDemoAuthenticated && (
          <AuthLoading>
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-24 rounded-xl" />
              ))}
            </div>
          </AuthLoading>
        )}
        {!isDemoAuthenticated && (
          <Unauthenticated>
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-primary/8 flex items-center justify-center mx-auto mb-5">
                <LogIn className="w-7 h-7 text-primary" />
              </div>
              <h2 className="font-serif text-3xl font-semibold text-primary mb-3">
                {t("signin.title")}
              </h2>
              <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto leading-relaxed">
                {t("signin.body")}
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <SignInButton
                  size="lg"
                  className="cursor-pointer font-semibold px-8"
                />
                <DemoSignInButton
                  size="lg"
                  className="cursor-pointer font-semibold px-8"
                  redirectTo="/settings/profile"
                />
              </div>
            </div>
          </Unauthenticated>
        )}
        {isDemoAuthenticated ? (
          <ProfileSettingsInner />
        ) : (
          <Authenticated>
            <ProfileSettingsInner />
          </Authenticated>
        )}
      </main>
    </div>
  );
}
